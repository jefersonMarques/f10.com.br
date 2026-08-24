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
const TRANSCRIPTION_MODEL = "gpt-4o-mini-transcribe";
const MAX_UPLOAD_VIDEO_BYTES = 90 * 1024 * 1024;
const MAX_FRAMES = 72;
const MAX_EXTRACTED_FRAMES = 900;
const COMMAND_TIMEOUT_MS = 8 * 60 * 1_000;
const OPENAI_AUTOMATION_TIMEOUT_MS = 3 * 60 * 1_000;

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

type GeneratedScreenshot = {
  frameIndex: number;
  altText: string;
  assistantDescription: string;
};

type GeneratedStep = {
  title: string;
  description: string;
  instruction: string;
  screenshots: GeneratedScreenshot[];
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

function selectEvenly<T>(values: T[], limit: number): T[] {
  if (values.length <= limit) return values;
  if (limit <= 1) return values.slice(0, 1);
  const result: T[] = [];
  for (let index = 0; index < limit; index += 1) {
    const sourceIndex = Math.round((index * (values.length - 1)) / (limit - 1));
    const value = values[sourceIndex];
    if (value !== undefined) result.push(value);
  }
  return result;
}

async function extractFrames(videoPath: string, directory: string): Promise<string[]> {
  const outputPattern = join(directory, "frame-%04d.jpg");
  await runCommand(ffmpegPath(), [
    "-hide_banner",
    "-loglevel",
    "error",
    "-y",
    "-i",
    videoPath,
    "-vf",
    "fps=1/2,scale=min(1280\\,iw):-2,mpdecimate",
    "-frames:v",
    String(MAX_EXTRACTED_FRAMES),
    "-q:v",
    "3",
    outputPattern,
  ]);
  const files = (await readdir(directory))
    .filter((file) => /^frame-\d{4}\.jpg$/i.test(file))
    .sort()
    .map((file) => join(directory, file));
  if (files.length === 0) throw new Error("HELP_VIDEO_FRAMES_NOT_FOUND");
  return selectEvenly(files, MAX_FRAMES);
}

async function transcribeAudio(audioPath: string): Promise<string> {
  const apiKey = env.OPENAI_API_KEY?.trim();
  if (!apiKey) throw new Error("OPENAI_NOT_CONFIGURED");
  const bytes = await readFile(audioPath);
  const form = new FormData();
  form.set("model", TRANSCRIPTION_MODEL);
  form.set("language", "pt");
  form.set("response_format", "json");
  form.set("file", new Blob([new Uint8Array(bytes)], { type: "audio/mpeg" }), "audio.mp3");
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), OPENAI_AUTOMATION_TIMEOUT_MS);
  try {
    const response = await fetch(OPENAI_TRANSCRIPTIONS_URL, {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}` },
      body: form,
      signal: controller.signal,
    });
    const payload = await response.json().catch(() => ({})) as {
      text?: string;
      error?: { message?: string };
    };
    if (!response.ok) {
      throw new Error(`HELP_VIDEO_TRANSCRIPTION_FAILED:${payload.error?.message ?? response.status}`);
    }
    const text = payload.text?.trim() ?? "";
    if (!text) throw new Error("HELP_VIDEO_TRANSCRIPTION_EMPTY");
    return text.slice(0, 180_000);
  } finally {
    clearTimeout(timer);
  }
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
                required: ["frameIndex", "altText", "assistantDescription"],
                properties: {
                  frameIndex: { type: "integer", minimum: 1, maximum: MAX_FRAMES },
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

function articlePrompt(categories: HelpVideoAutomationCategory[], transcript: string): string {
  return [
    "Crie um único artigo operacional da Base de Conhecimento F10 a partir da transcrição e dos frames cronológicos.",
    "Não invente telas, ações, regras ou URLs.",
    "Preserve como fatos prioritários todas as obrigatoriedades, condições, exceções e dependências explicitamente ditas na transcrição, especialmente expressões como 'é obrigatório', 'precisa', 'deve', 'somente', 'se', 'caso', 'exceto' e 'não pode'.",
    "Nunca generalize uma regra condicional. Exemplo: se a fonte disser que `E-mail` é obrigatório quando o funcionário também é `Usuário`, não transforme isso em obrigação para todo funcionário.",
    "Quando uma condição ou obrigatoriedade ajuda o cliente a executar corretamente o procedimento, declare-a no texto público do step correspondente.",
    "Use assistantKnowledge para preservar regras seguras para o cliente, condições e exceções importantes que estejam explícitas na transcrição mas não precisem aparecer integralmente no artigo. Não descarte esses fatos.",
    "Use Markdown seguro nos textos: **negrito**, *itálico*, `código`, listas e emojis.",
    "Para nomes literais da interface, caminhos, menus, botões, campos, status, códigos e valores, prefira inline code: `Cadastros > Funcionários`, `Salvar`, `E-mail`, `Ativo`, `F10-123`.",
    "Reserve negrito para ênfase semântica e para a numeração; não use negrito como padrão para nomes de controles da interface.",
    "Em cada step.instruction, toda ação executável deve ficar em sua própria linha numerada usando **1.**, **2.**, **3.** e assim por diante.",
    "Não junte duas ou mais ações executáveis em um parágrafo corrido. Mantenha uma ação principal por número.",
    "Informações complementares, contexto e observações devem ficar depois da lista numerada, em parágrafo separado e sem número.",
    "quickGuide também deve ser curto, sequencial, numerado e útil sem abrir o passo a passo completo.",
    "Cada step pode possuir no máximo um screenshot. Se uma segunda tela for indispensável, crie outro step específico.",
    "O screenshot precisa representar exatamente o estado visual descrito naquele step; não escolha um frame apenas por proximidade cronológica com a fala.",
    "Antes de escolher frameIndex, confirme que tela, modal, menu, campo, botão ou estado citado na instrução realmente está visível naquele frame.",
    "Prefira um frame estável após a ação terminar. Não escolha carregamento, animação, transição, tela parcialmente atualizada ou tela pertencente ao passo anterior/seguinte.",
    "Quando a instrução ensina a localizar algo antes do clique, escolha um frame em que esse elemento esteja claramente visível.",
    "Se nenhum frame representar corretamente o step, retorne screenshots: [] para esse step. É melhor não ter imagem do que usar um screenshot incorreto.",
    "Não reutilize o mesmo frame em steps diferentes.",
    "Os frames representam a tela inteira do F10; nunca peça ou proponha recortes. frameIndex começa em 1.",
    `Categorias permitidas: ${categories.map((category) => `${category.slug} (${category.name})`).join(", ") || UNCATEGORIZED_HELP_CATEGORY_SLUG}.`,
    `Se nenhuma categoria real for segura, use somente ${UNCATEGORIZED_HELP_CATEGORY_SLUG}.`,
    "altText e assistantDescription devem descrever somente o que está realmente visível no screenshot escolhido e servir como verificação adicional de coerência.",
    "Exemplo de regra condicional correta: Se o funcionário também for `Usuário` e fizer login no F10, o campo `E-mail` é obrigatório e deve ser válido para receber o link de definição de senha.",
    "Exemplo de instruction correta: **1.** Abra `Cadastros > Funcionários`.\n**2.** Clique no botão de inclusão para criar um novo cadastro.\n\nNessa mesma área também ficam as ações de edição, exclusão e filtro.",
    "TRANSCRIÇÃO:",
    transcript,
  ].join("\n\n");
}

async function generateArticle(
  transcript: string,
  framePaths: string[],
  categories: HelpVideoAutomationCategory[],
): Promise<GeneratedArticle> {
  const apiKey = env.OPENAI_API_KEY?.trim();
  if (!apiKey) throw new Error("OPENAI_NOT_CONFIGURED");

  const content: Array<Record<string, unknown>> = [
    { type: "input_text", text: articlePrompt(categories, transcript) },
  ];

  for (const [index, framePath] of framePaths.entries()) {
    const bytes = await readFile(framePath);
    content.push({ type: "input_text", text: `FRAME ${index + 1} — ordem cronológica.` });
    content.push({
      type: "input_image",
      detail: "high",
      image_url: `data:image/jpeg;base64,${bytes.toString("base64")}`,
    });
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), OPENAI_AUTOMATION_TIMEOUT_MS);
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
        max_output_tokens: 8_000,
        text: {
          format: {
            type: "json_schema",
            name: "f10_help_video_article",
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
  framePaths: string[];
  categories: HelpVideoAutomationCategory[];
  externalId: string;
  featuredVideoUrl?: string;
  sourceType: HelpVideoAutomationSource["type"];
}): Promise<HelpVideoAutomationResult> {
  const slug = normalizeSlug(input.article.slug || input.article.title) || `conteudo-${Date.now()}`;
  const assets = new Map<string, HelpImportPackageAsset>();
  const usedFrames = new Set<number>();
  let selectedScreenshotCount = 0;

  const steps: HelpImportFile["contents"][number]["steps"] = [];
  for (const [stepIndex, step] of input.article.steps.entries()) {
    const blocks: HelpImportFile["contents"][number]["steps"][number]["blocks"] = [
      { type: "text", text: step.instruction.trim() },
    ];
    const screenshot = step.screenshots?.[0];
    if (screenshot) {
      const frameIndex = Math.round(Number(screenshot.frameIndex));
      if (frameIndex >= 1 && frameIndex <= input.framePaths.length && !usedFrames.has(frameIndex)) {
        const framePath = input.framePaths[frameIndex - 1];
        if (framePath) {
          usedFrames.add(frameIndex);
          const frameBytes = await readFile(framePath);
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
            altText: screenshot.altText.trim().slice(0, 500),
            assistantDescription: screenshot.assistantDescription.trim().slice(0, 20_000),
          });
        }
      }
    }

    steps.push({
      title: step.title.trim().slice(0, 180),
      description: step.description.trim().slice(0, 2_000),
      assistantKnowledge: "",
      blocks,
    });
  }

  if (selectedScreenshotCount === 0) throw new Error("HELP_VIDEO_NO_SCREENSHOTS_SELECTED");

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
    analyzedFrameCount: input.framePaths.length,
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
      label: "Extraindo áudio e telas do vídeo",
    });
    const [audioPath, framePaths] = await Promise.all([
      extractAudio(videoPath, directory),
      extractFrames(videoPath, directory),
    ]);
    await reportProgress(input.onProgress, {
      stage: "extract",
      status: "done",
      label: "Áudio e telas extraídos",
      detail: `${framePaths.length} frames selecionados para análise`,
    });

    await reportProgress(input.onProgress, {
      stage: "transcribe",
      status: "active",
      label: "Transcrevendo o áudio com OpenAI",
    });
    const transcript = await transcribeAudio(audioPath);
    await reportProgress(input.onProgress, {
      stage: "transcribe",
      status: "done",
      label: "Transcrição concluída",
      detail: `${transcript.length} caracteres`,
    });

    await reportProgress(input.onProgress, {
      stage: "analyze",
      status: "active",
      label: "Analisando telas e estruturando o procedimento",
    });
    const article = await generateArticle(transcript, framePaths, input.categories);
    await reportProgress(input.onProgress, {
      stage: "analyze",
      status: "done",
      label: "Artigo estruturado pela IA",
      detail: `${article.steps.length} etapa(s) identificada(s)`,
    });

    await reportProgress(input.onProgress, {
      stage: "package",
      status: "active",
      label: "Organizando screenshots e conteúdo do rascunho",
    });
    const result = await buildImportResult({
      article,
      transcript,
      framePaths,
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