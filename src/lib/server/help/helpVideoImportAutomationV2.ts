import { createHash } from "node:crypto";
import { spawn } from "node:child_process";
import { mkdtemp, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { env } from "$env/dynamic/private";
import { UNCATEGORIZED_HELP_CATEGORY_SLUG } from "$lib/help/helpCategoryConstants";
import { getOpenAiModel, isOpenAiConfigured } from "$lib/server/ai/openAiResponses";
import type { HelpImportPackageAsset } from "$lib/server/help/helpImportPackage";
import type { HelpImportFile } from "$lib/server/help/structuredHelpImport";

const OPENAI_TRANSCRIPTIONS_URL = "https://api.openai.com/v1/audio/transcriptions";
const OPENAI_RESPONSES_URL = "https://api.openai.com/v1/responses";
const TRANSCRIPTION_MODEL = "whisper-1";
const MAX_UPLOAD_VIDEO_BYTES = 90 * 1024 * 1024;
const MAX_AUTOMATIC_SCREENSHOTS = 24;
const CANDIDATES_PER_SCREENSHOT = 3;
const VISUAL_VALIDATION_CONCURRENCY = 3;
const COMMAND_TIMEOUT_MS = 8 * 60 * 1_000;
const OPENAI_TRANSCRIPTION_TIMEOUT_MS = 3 * 60 * 1_000;
const OPENAI_ARTICLE_TIMEOUT_MS = 3 * 60 * 1_000;
const OPENAI_SCREENSHOT_TIMEOUT_MS = 90 * 1_000;

export type HelpVideoAutomationSource =
  | { type: "youtube"; url: string }
  | {
      type: "upload";
      fileName: string;
      mimeType: string;
      bytes: Uint8Array;
      publishedVideoUrl?: string;
    };

export type HelpVideoAutomationCategory = {
  slug: string;
  name: string;
  description: string;
};

export type HelpVideoAutomationRuntimeStatus = {
  openAi: boolean;
  ffmpeg: boolean;
  youtube: boolean;
  ffmpegPath: string;
  ytDlpPath: string;
};

export type HelpVideoAutomationProgressStage =
  | "runtime"
  | "source"
  | "extract"
  | "transcribe"
  | "analyze"
  | "package";

export type HelpVideoAutomationProgress = {
  stage: HelpVideoAutomationProgressStage;
  status: "active" | "done";
  label: string;
  detail?: string;
};

export type HelpVideoAutomationProgressHandler = (
  progress: HelpVideoAutomationProgress,
) => void | Promise<void>;

type TranscriptSegment = {
  start: number;
  end: number;
  text: string;
};

type TimestampedTranscript = {
  text: string;
  segments: TranscriptSegment[];
  durationSeconds: number;
};

type PlannedScreenshot = {
  startSeconds: number;
  endSeconds: number;
  target: string;
  altText: string;
  assistantDescription: string;
};

type GeneratedStep = {
  title: string;
  description: string;
  instruction: string;
  screenshots: PlannedScreenshot[];
};

type GeneratedArticle = {
  title: string;
  slug: string;
  summary: string;
  quickGuide: string;
  categories: string[];
  searchAliases: string[];
  assistantKnowledge: string;
  steps: GeneratedStep[];
};

type ScreenshotCandidate = {
  path: string;
  timeSeconds: number;
};

type ScreenshotSelection = {
  selectedIndex: number;
  needsHighDetail: boolean;
  altText: string;
  assistantDescription: string;
};

type ResolvedScreenshot = {
  path: string;
  altText: string;
  assistantDescription: string;
};

type ScreenshotResolution = {
  screenshots: Map<number, ResolvedScreenshot>;
  analyzedFrameCount: number;
};

export type HelpVideoAutomationResult = {
  file: HelpImportFile;
  assets: Map<string, HelpImportPackageAsset>;
  transcript: string;
  transcriptChars: number;
  analyzedFrameCount: number;
  selectedScreenshotCount: number;
  sourceType: HelpVideoAutomationSource["type"];
};

async function reportProgress(
  handler: HelpVideoAutomationProgressHandler | undefined,
  progress: HelpVideoAutomationProgress,
): Promise<void> {
  if (handler) await handler(progress);
}

function ffmpegPath(): string {
  return env.HELP_VIDEO_FFMPEG_PATH?.trim() || "ffmpeg";
}

function ytDlpPath(): string {
  return env.HELP_VIDEO_YTDLP_PATH?.trim() || "yt-dlp";
}

function normalizeSlug(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 120);
}

function normalizeExternalId(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9._:-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 200);
}

function isHttpUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:";
  } catch {
    return false;
  }
}

function youtubeVideoId(value: string): string | null {
  try {
    const url = new URL(value);
    const hostname = url.hostname.toLowerCase();
    if (hostname === "youtu.be") {
      const id = url.pathname.split("/").filter(Boolean)[0] ?? "";
      return /^[A-Za-z0-9_-]{6,20}$/.test(id) ? id : null;
    }
    if (!["youtube.com", "www.youtube.com", "m.youtube.com"].includes(hostname)) return null;
    let id = url.searchParams.get("v") ?? "";
    if (!id && (url.pathname.startsWith("/shorts/") || url.pathname.startsWith("/embed/"))) {
      id = url.pathname.split("/")[2] ?? "";
    }
    return /^[A-Za-z0-9_-]{6,20}$/.test(id) ? id : null;
  } catch {
    return null;
  }
}

function commandAvailable(command: string, args: string[]): Promise<boolean> {
  return new Promise((resolve) => {
    let settled = false;
    const finish = (value: boolean) => {
      if (settled) return;
      settled = true;
      resolve(value);
    };
    const child = spawn(command, args, { stdio: "ignore", windowsHide: true });
    const timer = setTimeout(() => {
      child.kill("SIGKILL");
      finish(false);
    }, 4_000);
    child.once("error", () => {
      clearTimeout(timer);
      finish(false);
    });
    child.once("exit", (code) => {
      clearTimeout(timer);
      finish(code === 0);
    });
  });
}

export async function getHelpVideoAutomationRuntimeStatus(): Promise<HelpVideoAutomationRuntimeStatus> {
  const [ffmpeg, youtube] = await Promise.all([
    commandAvailable(ffmpegPath(), ["-version"]),
    commandAvailable(ytDlpPath(), ["--version"]),
  ]);
  return {
    openAi: isOpenAiConfigured(),
    ffmpeg,
    youtube,
    ffmpegPath: ffmpegPath(),
    ytDlpPath: ytDlpPath(),
  };
}

async function runCommand(command: string, args: string[], timeoutMs = COMMAND_TIMEOUT_MS): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    let settled = false;
    const finish = (cause?: Error) => {
      if (settled) return;
      settled = true;
      if (cause) reject(cause);
      else resolve();
    };
    const child = spawn(command, args, {
      windowsHide: true,
      stdio: ["ignore", "pipe", "pipe"],
    });
    let stderr = "";
    const timer = setTimeout(() => {
      child.kill("SIGKILL");
      finish(new Error("HELP_VIDEO_COMMAND_TIMEOUT"));
    }, timeoutMs);
    child.stderr.on("data", (chunk) => {
      if (stderr.length < 32_000) stderr += String(chunk);
    });
    child.once("error", (cause) => {
      clearTimeout(timer);
      finish(cause instanceof Error ? cause : new Error("HELP_VIDEO_COMMAND_FAILED"));
    });
    child.once("exit", (code) => {
      clearTimeout(timer);
      if (code === 0) finish();
      else finish(new Error(`HELP_VIDEO_COMMAND_FAILED:${command}:${code ?? "unknown"}:${stderr.slice(-2_000)}`));
    });
  });
}

async function downloadYoutubeVideo(url: string, directory: string): Promise<string> {
  if (!youtubeVideoId(url)) throw new Error("HELP_VIDEO_YOUTUBE_URL_INVALID");
  await runCommand(ytDlpPath(), [
    "--no-playlist",
    "--no-progress",
    "--restrict-filenames",
    "--match-filter",
    "duration <= 1800",
    "--max-filesize",
    "500M",
    "--merge-output-format",
    "mp4",
    "-f",
    "bv*+ba/b",
    "-o",
    join(directory, "source.%(ext)s"),
    url,
  ]);
  const files = await readdir(directory);
  const downloaded = files.find((file) => /^source\.(mp4|webm|mkv|mov)$/i.test(file));
  if (!downloaded) throw new Error("HELP_VIDEO_YOUTUBE_DOWNLOAD_NOT_FOUND");
  return join(directory, downloaded);
}

async function extractAudio(videoPath: string, directory: string): Promise<string> {
  const audioPath = join(directory, "audio.mp3");
  await runCommand(ffmpegPath(), [
    "-hide_banner",
    "-loglevel",
    "error",
    "-y",
    "-i",
    videoPath,
    "-vn",
    "-ac",
    "1",
    "-ar",
    "16000",
    "-b:a",
    "64k",
    audioPath,
  ]);
  return audioPath;
}

function toFiniteNumber(value: unknown): number | null {
  const numberValue = Number(value);
  return Number.isFinite(numberValue) ? numberValue : null;
}

async function transcribeAudio(audioPath: string): Promise<TimestampedTranscript> {
  const apiKey = env.OPENAI_API_KEY?.trim();
  if (!apiKey) throw new Error("OPENAI_NOT_CONFIGURED");
  const bytes = await readFile(audioPath);
  const form = new FormData();
  form.set("model", TRANSCRIPTION_MODEL);
  form.set("language", "pt");
  form.set("response_format", "verbose_json");
  form.append("timestamp_granularities[]", "segment");
  form.set("file", new Blob([new Uint8Array(bytes)], { type: "audio/mpeg" }), "audio.mp3");

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), OPENAI_TRANSCRIPTION_TIMEOUT_MS);
  try {
    const response = await fetch(OPENAI_TRANSCRIPTIONS_URL, {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}` },
      body: form,
      signal: controller.signal,
    });
    const payload = await response.json().catch(() => ({})) as {
      text?: string;
      segments?: Array<{ start?: number; end?: number; text?: string }>;
      error?: { message?: string };
    };
    if (!response.ok) {
      throw new Error(`HELP_VIDEO_TRANSCRIPTION_FAILED:${payload.error?.message ?? response.status}`);
    }
    const text = payload.text?.trim() ?? "";
    if (!text) throw new Error("HELP_VIDEO_TRANSCRIPTION_EMPTY");

    const segments = (payload.segments ?? []).flatMap((segment) => {
      const start = toFiniteNumber(segment.start);
      const end = toFiniteNumber(segment.end);
      const segmentText = segment.text?.trim() ?? "";
      if (start === null || end === null || end <= start || !segmentText) return [];
      return [{ start: Math.max(0, start), end, text: segmentText }];
    });
    if (segments.length === 0) throw new Error("HELP_VIDEO_TRANSCRIPTION_TIMESTAMPS_EMPTY");

    return {
      text: text.slice(0, 180_000),
      segments,
      durationSeconds: Math.max(...segments.map((segment) => segment.end)),
    };
  } finally {
    clearTimeout(timer);
  }
}

function formatTimecode(seconds: number): string {
  const safe = Math.max(0, seconds);
  const hours = Math.floor(safe / 3600);
  const minutes = Math.floor((safe % 3600) / 60);
  const secs = safe % 60;
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${secs.toFixed(2).padStart(5, "0")}`;
}

function formatTimestampedTranscript(transcript: TimestampedTranscript): string {
  return transcript.segments
    .map((segment) => `[${formatTimecode(segment.start)} - ${formatTimecode(segment.end)}] ${segment.text}`)
    .join("\n");
}

function articleSchema(): Record<string, unknown> {
  return {
    type: "object",
    additionalProperties: false,
    required: [
      "title",
      "slug",
      "summary",
      "quickGuide",
      "categories",
      "searchAliases",
      "assistantKnowledge",
      "steps",
    ],
    properties: {
      title: { type: "string", minLength: 4, maxLength: 160 },
      slug: { type: "string", minLength: 1, maxLength: 120 },
      summary: { type: "string", maxLength: 320 },
      quickGuide: { type: "string", minLength: 1, maxLength: 12000 },
      categories: {
        type: "array",
        maxItems: 12,
        items: { type: "string", maxLength: 120 },
      },
      searchAliases: {
        type: "array",
        maxItems: 40,
        items: { type: "string", maxLength: 160 },
      },
      assistantKnowledge: { type: "string", maxLength: 20000 },
      steps: {
        type: "array",
        minItems: 1,
        maxItems: 40,
        items: {
          type: "object",
          additionalProperties: false,
          required: ["title", "description", "instruction", "screenshots"],
          properties: {
            title: { type: "string", minLength: 1, maxLength: 180 },
            description: { type: "string", maxLength: 2000 },
            instruction: { type: "string", minLength: 1, maxLength: 50000 },
            screenshots: {
              type: "array",
              maxItems: 1,
              items: {
                type: "object",
                additionalProperties: false,
                required: [
                  "startSeconds",
                  "endSeconds",
                  "target",
                  "altText",
                  "assistantDescription",
                ],
                properties: {
                  startSeconds: { type: "number", minimum: 0 },
                  endSeconds: { type: "number", minimum: 0 },
                  target: { type: "string", minLength: 1, maxLength: 1000 },
                  altText: { type: "string", maxLength: 500 },
                  assistantDescription: { type: "string", maxLength: 20000 },
                },
              },
            },
          },
        },
      },
    },
  };
}

function screenshotSelectionSchema(): Record<string, unknown> {
  return {
    type: "object",
    additionalProperties: false,
    required: ["selectedIndex", "needsHighDetail", "altText", "assistantDescription"],
    properties: {
      selectedIndex: { type: "integer", minimum: 0, maximum: CANDIDATES_PER_SCREENSHOT },
      needsHighDetail: { type: "boolean" },
      altText: { type: "string", maxLength: 500 },
      assistantDescription: { type: "string", maxLength: 2000 },
    },
  };
}

function extractOpenAiOutputText(payload: unknown): string {
  if (!payload || typeof payload !== "object") return "";
  const output = (payload as { output?: unknown }).output;
  if (!Array.isArray(output)) return "";
  const parts: string[] = [];
  for (const item of output) {
    if (!item || typeof item !== "object" || (item as { type?: unknown }).type !== "message") continue;
    const content = (item as { content?: unknown }).content;
    if (!Array.isArray(content)) continue;
    for (const part of content) {
      if (
        part &&
        typeof part === "object" &&
        (part as { type?: unknown }).type === "output_text" &&
        typeof (part as { text?: unknown }).text === "string"
      ) {
        parts.push(String((part as { text?: unknown }).text));
      }
    }
  }
  return parts.join("\n").trim();
}

function articlePrompt(
  categories: HelpVideoAutomationCategory[],
  transcript: TimestampedTranscript,
): string {
  return [
    "Crie um único artigo operacional da Base de Conhecimento F10 usando SOMENTE a transcrição temporal abaixo.",
    "Nesta etapa você não recebeu imagens. Não diga que viu telas ou elementos; use o texto somente para planejar janelas onde um screenshot provavelmente ajudará.",
    "Não invente telas, ações, regras, URLs ou fatos.",
    "Preserve como fatos prioritários todas as obrigatoriedades, condições, exceções e dependências explicitamente ditas na transcrição, especialmente expressões como 'é obrigatório', 'precisa', 'deve', 'somente', 'se', 'caso', 'exceto' e 'não pode'.",
    "Nunca generalize uma regra condicional. Se a fonte disser que `E-mail` é obrigatório quando o funcionário também é `Usuário`, não transforme isso em obrigação para todo funcionário.",
    "Quando uma condição ou obrigatoriedade ajuda o cliente a executar corretamente o procedimento, declare-a no texto público do step correspondente.",
    "Use assistantKnowledge para preservar regras seguras para o cliente, condições e exceções importantes que estejam explícitas na transcrição mas não precisem aparecer integralmente no artigo.",
    "Use Markdown seguro nos textos: **negrito**, *itálico*, `código`, listas e emojis.",
    "Para nomes literais da interface, caminhos, menus, botões, campos, status, códigos e valores, prefira inline code.",
    "Em cada step.instruction, toda ação executável deve ficar em sua própria linha numerada usando **1.**, **2.**, **3.** e assim por diante.",
    "Não junte duas ou mais ações executáveis em um parágrafo corrido. Informações complementares ficam depois da lista, em parágrafo separado e sem número.",
    "quickGuide deve ser curto, sequencial e numerado.",
    "Cada step pode planejar no máximo um screenshot. Não planeje screenshot só para preencher espaço; use screenshots: [] quando a imagem não for necessária para localizar, confirmar ou entender visualmente a ação.",
    "Quando um screenshot for útil, informe uma janela temporal curta baseada nos timecodes da transcrição: normalmente entre 3 e 8 segundos e nunca maior que 12 segundos.",
    "A janela pode terminar até cerca de 3 segundos depois da fala relevante para permitir que a interface estabilize após um clique ou mudança de tela.",
    "screenshot.target deve descrever objetivamente o estado visual que precisa estar presente para o frame ser aceito, por exemplo: 'Aba Usuário aberta com Usuário Ativo e Login visíveis'.",
    "Não escolha um frame nesta etapa; apenas planeje startSeconds/endSeconds e o target. O F10 extrairá poucos candidatos localmente e fará uma validação visual separada.",
    `Categorias permitidas: ${categories.map((category) => `${category.slug} (${category.name})`).join(", ") || UNCATEGORIZED_HELP_CATEGORY_SLUG}.`,
    `Se nenhuma categoria real for segura, use somente ${UNCATEGORIZED_HELP_CATEGORY_SLUG}.`,
    "Exemplo de regra condicional correta: Se o funcionário também for `Usuário` e fizer login no F10, o campo `E-mail` é obrigatório e deve ser válido para receber o link de definição de senha.",
    "TRANSCRIÇÃO COM TIMECODES:",
    formatTimestampedTranscript(transcript),
  ].join("\n\n");
}

async function generateArticle(
  transcript: TimestampedTranscript,
  categories: HelpVideoAutomationCategory[],
): Promise<GeneratedArticle> {
  const apiKey = env.OPENAI_API_KEY?.trim();
  if (!apiKey) throw new Error("OPENAI_NOT_CONFIGURED");
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), OPENAI_ARTICLE_TIMEOUT_MS);
  try {
    const response = await fetch(OPENAI_RESPONSES_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      signal: controller.signal,
      body: JSON.stringify({
        model: getOpenAiModel(),
        store: false,
        input: [{
          role: "user",
          content: [{ type: "input_text", text: articlePrompt(categories, transcript) }],
        }],
        max_output_tokens: 8_000,
        text: {
          format: {
            type: "json_schema",
            name: "f10_help_video_article_timeline",
            strict: true,
            schema: articleSchema(),
          },
        },
      }),
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      const message = payload && typeof payload === "object"
        ? String((payload as { error?: { message?: unknown } }).error?.message ?? response.status)
        : String(response.status);
      throw new Error(`HELP_VIDEO_ARTICLE_GENERATION_FAILED:${message}`);
    }
    const output = extractOpenAiOutputText(payload);
    if (!output) throw new Error("HELP_VIDEO_ARTICLE_GENERATION_EMPTY");
    return JSON.parse(output) as GeneratedArticle;
  } finally {
    clearTimeout(timer);
  }
}

function normalizeScreenshotWindow(
  screenshot: PlannedScreenshot,
  durationSeconds: number,
): { start: number; end: number } | null {
  const rawStart = toFiniteNumber(screenshot.startSeconds);
  const rawEnd = toFiniteNumber(screenshot.endSeconds);
  if (rawStart === null || rawEnd === null || durationSeconds <= 0) return null;

  let start = Math.max(0, Math.min(rawStart, durationSeconds));
  let end = Math.max(start, Math.min(rawEnd, durationSeconds));
  if (end - start > 12) end = start + 12;
  if (end - start < 1.5) {
    start = Math.max(0, start - 0.75);
    end = Math.min(durationSeconds, Math.max(end + 0.75, start + 1.5));
  }
  return end > start ? { start, end } : null;
}

function candidateTimes(start: number, end: number): number[] {
  const span = end - start;
  const fractions = [0.35, 0.7, 0.94];
  const unique = new Set<number>();
  for (const fraction of fractions) {
    const seconds = Math.max(start, Math.min(end - 0.05, start + span * fraction));
    unique.add(Math.round(seconds * 1000) / 1000);
  }
  return Array.from(unique).slice(0, CANDIDATES_PER_SCREENSHOT);
}

async function extractScreenshotCandidates(input: {
  videoPath: string;
  directory: string;
  stepIndex: number;
  screenshot: PlannedScreenshot;
  durationSeconds: number;
}): Promise<ScreenshotCandidate[]> {
  const window = normalizeScreenshotWindow(input.screenshot, input.durationSeconds);
  if (!window) return [];

  const candidates: ScreenshotCandidate[] = [];
  for (const [candidateIndex, timeSeconds] of candidateTimes(window.start, window.end).entries()) {
    const outputPath = join(
      input.directory,
      `candidate-${String(input.stepIndex + 1).padStart(2, "0")}-${candidateIndex + 1}.jpg`,
    );
    try {
      await runCommand(ffmpegPath(), [
        "-hide_banner",
        "-loglevel",
        "error",
        "-y",
        "-ss",
        timeSeconds.toFixed(3),
        "-i",
        input.videoPath,
        "-frames:v",
        "1",
        "-vf",
        "scale=min(1280\\,iw):-2",
        "-q:v",
        "3",
        outputPath,
      ]);
      await readFile(outputPath);
      candidates.push({ path: outputPath, timeSeconds });
    } catch {
      // A candidate can fail near EOF without invalidating the article.
    }
  }
  return candidates;
}

function screenshotValidationPrompt(input: {
  step: GeneratedStep;
  screenshot: PlannedScreenshot;
  candidates: ScreenshotCandidate[];
  detail: "low" | "high";
}): string {
  return [
    "Valide candidatos de screenshot para UMA etapa da Base de Conhecimento F10.",
    "Escolha selectedIndex 1..N somente quando o frame realmente mostrar o estado visual pedido. Retorne 0 se nenhum candidato corresponder com segurança.",
    "Não aceite tela anterior/seguinte, loading, transição, modal incorreto ou elemento essencial ausente.",
    "Se detail=low e você precisar ler texto pequeno para decidir com segurança, retorne needsHighDetail=true. Não force uma escolha.",
    "Se houver escolha, altText e assistantDescription devem descrever somente o que está realmente visível no frame escolhido.",
    `Detalhe atual: ${input.detail}.`,
    `Etapa: ${input.step.title}`,
    `Instrução: ${input.step.instruction}`,
    `Objetivo visual obrigatório: ${input.screenshot.target}`,
    `Candidatos: ${input.candidates.map((candidate, index) => `${index + 1}=${candidate.timeSeconds.toFixed(2)}s`).join(", ")}.`,
  ].join("\n\n");
}

async function requestScreenshotSelection(input: {
  step: GeneratedStep;
  screenshot: PlannedScreenshot;
  candidates: ScreenshotCandidate[];
  detail: "low" | "high";
}): Promise<ScreenshotSelection> {
  const apiKey = env.OPENAI_API_KEY?.trim();
  if (!apiKey) throw new Error("OPENAI_NOT_CONFIGURED");

  const content: Array<Record<string, unknown>> = [{
    type: "input_text",
    text: screenshotValidationPrompt(input),
  }];
  for (const [index, candidate] of input.candidates.entries()) {
    const bytes = await readFile(candidate.path);
    content.push({ type: "input_text", text: `CANDIDATO ${index + 1}` });
    content.push({
      type: "input_image",
      detail: input.detail,
      image_url: `data:image/jpeg;base64,${bytes.toString("base64")}`,
    });
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), OPENAI_SCREENSHOT_TIMEOUT_MS);
  try {
    const response = await fetch(OPENAI_RESPONSES_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      signal: controller.signal,
      body: JSON.stringify({
        model: getOpenAiModel(),
        store: false,
        input: [{ role: "user", content }],
        max_output_tokens: 500,
        text: {
          format: {
            type: "json_schema",
            name: "f10_help_screenshot_selection",
            strict: true,
            schema: screenshotSelectionSchema(),
          },
        },
      }),
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      const message = payload && typeof payload === "object"
        ? String((payload as { error?: { message?: unknown } }).error?.message ?? response.status)
        : String(response.status);
      throw new Error(`HELP_VIDEO_SCREENSHOT_VALIDATION_FAILED:${message}`);
    }
    const output = extractOpenAiOutputText(payload);
    if (!output) throw new Error("HELP_VIDEO_SCREENSHOT_VALIDATION_EMPTY");
    return JSON.parse(output) as ScreenshotSelection;
  } finally {
    clearTimeout(timer);
  }
}

async function validateScreenshotCandidates(input: {
  step: GeneratedStep;
  screenshot: PlannedScreenshot;
  candidates: ScreenshotCandidate[];
}): Promise<{ selected: ResolvedScreenshot | null; analyzedFrameCount: number }> {
  if (input.candidates.length === 0) return { selected: null, analyzedFrameCount: 0 };

  let analyzedFrameCount = input.candidates.length;
  const low = await requestScreenshotSelection({ ...input, detail: "low" });
  let finalSelection = low;

  if (low.needsHighDetail) {
    analyzedFrameCount += input.candidates.length;
    finalSelection = await requestScreenshotSelection({ ...input, detail: "high" });
  }

  const selectedIndex = Math.round(Number(finalSelection.selectedIndex));
  if (selectedIndex < 1 || selectedIndex > input.candidates.length) {
    return { selected: null, analyzedFrameCount };
  }
  const candidate = input.candidates[selectedIndex - 1];
  if (!candidate) return { selected: null, analyzedFrameCount };

  return {
    selected: {
      path: candidate.path,
      altText: finalSelection.altText.trim().slice(0, 500) || input.screenshot.altText.trim().slice(0, 500),
      assistantDescription:
        finalSelection.assistantDescription.trim().slice(0, 20_000) ||
        input.screenshot.assistantDescription.trim().slice(0, 20_000),
    },
    analyzedFrameCount,
  };
}

async function mapWithConcurrency<T, R>(
  items: T[],
  concurrency: number,
  mapper: (item: T, index: number) => Promise<R>,
): Promise<R[]> {
  if (items.length === 0) return [];
  const results: R[] = new Array(items.length);
  let nextIndex = 0;
  const workers = Array.from(
    { length: Math.min(Math.max(concurrency, 1), items.length) },
    async () => {
      while (true) {
        const index = nextIndex;
        nextIndex += 1;
        if (index >= items.length) return;
        results[index] = await mapper(items[index]!, index);
      }
    },
  );
  await Promise.all(workers);
  return results;
}

async function resolveArticleScreenshots(input: {
  videoPath: string;
  directory: string;
  article: GeneratedArticle;
  durationSeconds: number;
}): Promise<ScreenshotResolution> {
  const planned = input.article.steps
    .map((step, stepIndex) => ({ step, stepIndex, screenshot: step.screenshots?.[0] }))
    .filter((item): item is { step: GeneratedStep; stepIndex: number; screenshot: PlannedScreenshot } =>
      Boolean(item.screenshot),
    )
    .slice(0, MAX_AUTOMATIC_SCREENSHOTS);

  const results = await mapWithConcurrency(
    planned,
    VISUAL_VALIDATION_CONCURRENCY,
    async (item) => {
      try {
        const candidates = await extractScreenshotCandidates({
          videoPath: input.videoPath,
          directory: input.directory,
          stepIndex: item.stepIndex,
          screenshot: item.screenshot,
          durationSeconds: input.durationSeconds,
        });
        const validation = await validateScreenshotCandidates({
          step: item.step,
          screenshot: item.screenshot,
          candidates,
        });
        return {
          stepIndex: item.stepIndex,
          selected: validation.selected,
          analyzedFrameCount: validation.analyzedFrameCount,
        };
      } catch (cause) {
        console.error("[help-video-import] screenshot validation skipped", {
          stepIndex: item.stepIndex,
          cause,
        });
        return { stepIndex: item.stepIndex, selected: null, analyzedFrameCount: 0 };
      }
    },
  );

  const screenshots = new Map<number, ResolvedScreenshot>();
  let analyzedFrameCount = 0;
  for (const result of results) {
    analyzedFrameCount += result.analyzedFrameCount;
    if (result.selected) screenshots.set(result.stepIndex, result.selected);
  }
  return { screenshots, analyzedFrameCount };
}

function categorySlugs(
  generated: string[],
  available: HelpVideoAutomationCategory[],
): string[] {
  const allowed = new Set(available.map((category) => category.slug));
  const result = Array.from(
    new Set(
      generated
        .map((value) => normalizeSlug(value))
        .filter((value) => allowed.has(value)),
    ),
  );
  return result.length > 0 ? result : [UNCATEGORIZED_HELP_CATEGORY_SLUG];
}

async function buildImportResult(input: {
  article: GeneratedArticle;
  transcript: string;
  screenshots: Map<number, ResolvedScreenshot>;
  analyzedFrameCount: number;
  categories: HelpVideoAutomationCategory[];
  externalId: string;
  featuredVideoUrl?: string;
  sourceType: HelpVideoAutomationSource["type"];
}): Promise<HelpVideoAutomationResult> {
  const slug = normalizeSlug(input.article.slug || input.article.title) || `conteudo-${Date.now()}`;
  const assets = new Map<string, HelpImportPackageAsset>();
  let selectedScreenshotCount = 0;

  const steps: HelpImportFile["contents"][number]["steps"] = [];
  for (const [stepIndex, step] of input.article.steps.entries()) {
    const blocks: HelpImportFile["contents"][number]["steps"][number]["blocks"] = [
      { type: "text", text: step.instruction.trim() },
    ];
    const screenshot = input.screenshots.get(stepIndex);
    if (screenshot) {
      const frameBytes = await readFile(screenshot.path);
      selectedScreenshotCount += 1;
      const path = `screenshots/${slug}/step-${String(stepIndex + 1).padStart(2, "0")}-01.jpg`;
      assets.set(path, {
        path,
        fileName: path.split("/").at(-1) ?? "screenshot.jpg",
        mimeType: "image/jpeg",
        bytes: new Uint8Array(frameBytes),
      });
      blocks.push({
        type: "image",
        url: `package:${path}`,
        altText: screenshot.altText,
        assistantDescription: screenshot.assistantDescription,
      });
    }

    steps.push({
      title: step.title.trim().slice(0, 180),
      description: step.description.trim().slice(0, 2_000),
      assistantKnowledge: "",
      blocks,
    });
  }

  const featuredVideo = input.featuredVideoUrl && isHttpUrl(input.featuredVideoUrl)
    ? {
        url: input.featuredVideoUrl,
        description: input.article.summary.trim().slice(0, 500),
        subtitles: input.transcript,
        assistantSummary: input.article.quickGuide.trim().slice(0, 20_000),
      }
    : undefined;

  const file: HelpImportFile = {
    format: "f10-help-import",
    version: 1,
    source: "f10-auto-video",
    contents: [{
      externalId: input.externalId,
      title: input.article.title.trim().slice(0, 160),
      slug,
      summary: input.article.summary.trim().slice(0, 320),
      quickGuide: input.article.quickGuide.trim().slice(0, 12_000),
      categories: categorySlugs(input.article.categories, input.categories).map((categorySlug) => ({
        slug: categorySlug,
      })),
      searchAliases: Array.from(
        new Set(input.article.searchAliases.map((value) => value.trim()).filter(Boolean)),
      ).slice(0, 80),
      assistantKnowledge: input.article.assistantKnowledge.trim().slice(0, 40_000),
      internalSupportNotes: "",
      featuredVideo,
      steps,
    }],
  };

  return {
    file,
    assets,
    transcript: input.transcript,
    transcriptChars: input.transcript.length,
    analyzedFrameCount: input.analyzedFrameCount,
    selectedScreenshotCount,
    sourceType: input.sourceType,
  };
}

export async function generateHelpImportFromVideo(input: {
  source: HelpVideoAutomationSource;
  categories: HelpVideoAutomationCategory[];
  externalIdHint?: string;
  onProgress?: HelpVideoAutomationProgressHandler;
}): Promise<HelpVideoAutomationResult> {
  await reportProgress(input.onProgress, {
    stage: "runtime",
    status: "active",
    label: "Validando OpenAI e ferramentas do servidor",
  });
  const runtime = await getHelpVideoAutomationRuntimeStatus();
  if (!runtime.openAi) throw new Error("OPENAI_NOT_CONFIGURED");
  if (!runtime.ffmpeg) throw new Error("HELP_VIDEO_FFMPEG_NOT_AVAILABLE");
  if (input.source.type === "youtube" && !runtime.youtube) {
    throw new Error("HELP_VIDEO_YTDLP_NOT_AVAILABLE");
  }
  await reportProgress(input.onProgress, {
    stage: "runtime",
    status: "done",
    label: "Ambiente de processamento validado",
  });

  const directory = await mkdtemp(join(tmpdir(), "f10-help-video-"));
  try {
    let videoPath: string;
    let derivedExternalId: string;
    let featuredVideoUrl: string | undefined;

    await reportProgress(input.onProgress, {
      stage: "source",
      status: "active",
      label: input.source.type === "youtube" ? "Baixando vídeo do YouTube" : "Preparando arquivo MP4 enviado",
    });

    if (input.source.type === "youtube") {
      const id = youtubeVideoId(input.source.url);
      if (!id) throw new Error("HELP_VIDEO_YOUTUBE_URL_INVALID");
      videoPath = await downloadYoutubeVideo(input.source.url, directory);
      derivedExternalId = `youtube:${id.toLowerCase()}`;
      featuredVideoUrl = input.source.url;
    } else {
      if (input.source.bytes.byteLength < 1 || input.source.bytes.byteLength > MAX_UPLOAD_VIDEO_BYTES) {
        throw new Error("HELP_VIDEO_UPLOAD_SIZE_INVALID");
      }
      if (
        input.source.mimeType.toLowerCase() !== "video/mp4" &&
        !input.source.fileName.toLowerCase().endsWith(".mp4")
      ) {
        throw new Error("HELP_VIDEO_UPLOAD_FORMAT_INVALID");
      }
      videoPath = join(directory, "source.mp4");
      await writeFile(videoPath, input.source.bytes);
      derivedExternalId = `sha256:${createHash("sha256").update(input.source.bytes).digest("hex")}`;
      featuredVideoUrl = input.source.publishedVideoUrl && isHttpUrl(input.source.publishedVideoUrl)
        ? input.source.publishedVideoUrl
        : undefined;
    }

    await reportProgress(input.onProgress, {
      stage: "source",
      status: "done",
      label: input.source.type === "youtube" ? "Vídeo do YouTube baixado" : "Arquivo MP4 recebido e preparado",
    });

    const externalId = normalizeExternalId(input.externalIdHint ?? "") || derivedExternalId;

    await reportProgress(input.onProgress, {
      stage: "extract",
      status: "active",
      label: "Extraindo o áudio do vídeo",
    });
    const audioPath = await extractAudio(videoPath, directory);
    await reportProgress(input.onProgress, {
      stage: "extract",
      status: "done",
      label: "Áudio preparado para transcrição",
    });

    await reportProgress(input.onProgress, {
      stage: "transcribe",
      status: "active",
      label: "Transcrevendo áudio e identificando os tempos",
    });
    const transcript = await transcribeAudio(audioPath);
    await reportProgress(input.onProgress, {
      stage: "transcribe",
      status: "done",
      label: "Transcrição temporal concluída",
      detail: `${transcript.segments.length} segmento(s) · ${transcript.text.length} caracteres`,
    });

    await reportProgress(input.onProgress, {
      stage: "analyze",
      status: "active",
      label: "Estruturando o artigo e planejando as capturas",
    });
    const article = await generateArticle(transcript, input.categories);

    await reportProgress(input.onProgress, {
      stage: "analyze",
      status: "active",
      label: "Extraindo e validando somente os screenshots necessários",
      detail: `${article.steps.filter((step) => step.screenshots.length > 0).length} captura(s) planejada(s)`,
    });
    const screenshotResolution = await resolveArticleScreenshots({
      videoPath,
      directory,
      article,
      durationSeconds: transcript.durationSeconds,
    });
    await reportProgress(input.onProgress, {
      stage: "analyze",
      status: "done",
      label: "Artigo e screenshots validados",
      detail: `${screenshotResolution.screenshots.size} screenshot(s) aceito(s) · ${screenshotResolution.analyzedFrameCount} entrada(s) visuais`,
    });

    await reportProgress(input.onProgress, {
      stage: "package",
      status: "active",
      label: "Organizando conteúdo e screenshots do rascunho",
    });
    const result = await buildImportResult({
      article,
      transcript: transcript.text,
      screenshots: screenshotResolution.screenshots,
      analyzedFrameCount: screenshotResolution.analyzedFrameCount,
      categories: input.categories,
      externalId,
      featuredVideoUrl,
      sourceType: input.source.type,
    });
    await reportProgress(input.onProgress, {
      stage: "package",
      status: "done",
      label: "Conteúdo e screenshots organizados",
      detail: `${result.selectedScreenshotCount} screenshot(s) selecionado(s)`,
    });
    return result;
  } finally {
    await rm(directory, { recursive: true, force: true }).catch(() => undefined);
  }
}

export const HELP_VIDEO_AUTOMATION_MAX_UPLOAD_BYTES = MAX_UPLOAD_VIDEO_BYTES;
export const HELP_VIDEO_AUTOMATION_TRANSCRIPTION_MODEL = TRANSCRIPTION_MODEL;
