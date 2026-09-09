import { createHash } from "node:crypto";
import { spawn } from "node:child_process";
import { access, mkdtemp, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { env } from "$env/dynamic/private";
import { UNCATEGORIZED_HELP_CATEGORY_SLUG } from "$lib/help/helpCategoryConstants";
import { createAiStructuredResponse, AiGatewayError } from "$lib/server/ai/aiGateway";
import { isAiProviderConfigured, readAiProviderCredential } from "$lib/server/ai/aiConfigurationRepository";
import type { HelpImportPackageAsset } from "$lib/server/help/helpImportPackage";
import type { HelpImportFile } from "$lib/server/help/structuredHelpImport";

const OPENAI_TRANSCRIPTIONS_URL = "https://api.openai.com/v1/audio/transcriptions";
const TRANSCRIPTION_MODEL = "whisper-1";
const MAX_UPLOAD_VIDEO_BYTES = 90 * 1024 * 1024;
const MAX_AUTOMATIC_SCREENSHOTS = 40;
const CANDIDATES_PER_SCREENSHOT = 6;
const SCREENSHOT_CONCURRENCY = 3;
const STABILITY_THRESHOLD = 0.975;
const COMMAND_TIMEOUT_MS = 8 * 60 * 1_000;
const OPENAI_TRANSCRIPTION_TIMEOUT_MS = 3 * 60 * 1_000;
const TRANSCRIPTION_CHUNK_SECONDS = 8 * 60;
const DEFAULT_YTDLP_COOKIES_PATH = "/opt/f10-secrets/youtube-cookies.txt";
const DEFAULT_YTDLP_POT_PROVIDER_URL = "http://127.0.0.1:4416";

export const HELP_YOUTUBE_EXTRACTION_ENABLED = false;

export type ScreenshotCaptureMode = "before" | "after";

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
  capture: ScreenshotCaptureMode;
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

type ResolvedScreenshot = {
  path: string;
  altText: string;
  assistantDescription: string;
};

type ScreenshotResolution = {
  screenshots: Map<number, ResolvedScreenshot>;
  reviewCandidates: HelpVideoScreenshotReviewCandidate[];
  analyzedFrameCount: number;
  plannedScreenshotCount: number;
};

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

export type HelpVideoAutomationAiUsage = {
  operation: "video_transcription" | "video_article";
  provider?: string;
  model: string;
  inputTokens?: number | null;
  outputTokens?: number | null;
  audioSeconds?: number | null;
  latencyMs: number;
  status: "success" | "failed";
  failureCode?: string | null;
};

export type HelpVideoAutomationAiUsageHandler = (
  usage: HelpVideoAutomationAiUsage,
) => void | Promise<void>;

export type HelpVideoScreenshotReviewCandidate = {
  stepIndex: number;
  candidateIndex: number;
  timeSeconds: number;
  recommended: boolean;
  altText: string;
  assistantDescription: string;
  bytes: Uint8Array;
};

export type HelpVideoAutomationResult = {
  file: HelpImportFile;
  assets: Map<string, HelpImportPackageAsset>;
  localVideo?: {
    bytes: Uint8Array;
    fileName: string;
  };
  localVideoFailureCode?: string;
  reviewCandidates: HelpVideoScreenshotReviewCandidate[];
  transcript: string;
  transcriptTimeline: Array<{ start: number; end: number; text: string }>;
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

async function reportAiUsage(
  handler: HelpVideoAutomationAiUsageHandler | undefined,
  usage: HelpVideoAutomationAiUsage,
): Promise<void> {
  if (!handler) return;
  await Promise.resolve(handler(usage)).catch(() => undefined);
}

function ffmpegPath(): string {
  return env.HELP_VIDEO_FFMPEG_PATH?.trim() || "ffmpeg";
}

function ytDlpPath(): string {
  return env.HELP_VIDEO_YTDLP_PATH?.trim() || "yt-dlp";
}

async function ytDlpCookiesPath(): Promise<string | null> {
  const configuredPath = env.HELP_VIDEO_YTDLP_COOKIES_PATH?.trim();
  const candidate = configuredPath || DEFAULT_YTDLP_COOKIES_PATH;
  try {
    await access(candidate);
    return candidate;
  } catch {
    if (configuredPath) throw new Error("HELP_VIDEO_YOUTUBE_COOKIES_NOT_FOUND");
    return null;
  }
}

function ytDlpPotProviderUrl(): string {
  const configured = env.HELP_VIDEO_YTDLP_POT_PROVIDER_URL?.trim();
  const candidate = configured || DEFAULT_YTDLP_POT_PROVIDER_URL;
  try {
    const url = new URL(candidate);
    if (url.protocol !== "http:" && url.protocol !== "https:") {
      throw new Error("HELP_VIDEO_YTDLP_POT_PROVIDER_URL_INVALID");
    }
    return url.toString().replace(/\/$/, "");
  } catch (cause) {
    if (
      cause instanceof Error &&
      cause.message === "HELP_VIDEO_YTDLP_POT_PROVIDER_URL_INVALID"
    ) {
      throw cause;
    }
    throw new Error("HELP_VIDEO_YTDLP_POT_PROVIDER_URL_INVALID");
  }
}

function youtubeRuntimeArgs(): string[] {
  return [
    "--js-runtimes",
    `node:${process.execPath}`,
    "--extractor-args",
    `youtubepot-bgutilhttp:base_url=${ytDlpPotProviderUrl()}`,
  ];
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
  const [ffmpeg, youtube, openAi] = await Promise.all([
    commandAvailable(ffmpegPath(), ["-version"]),
    commandAvailable(ytDlpPath(), ["--version"]),
    isAiProviderConfigured("openai"),
  ]);
  return {
    openAi,
    ffmpeg,
    youtube,
    ffmpegPath: ffmpegPath(),
    ytDlpPath: ytDlpPath(),
  };
}

async function runCommand(
  command: string,
  args: string[],
  timeoutMs = COMMAND_TIMEOUT_MS,
): Promise<string> {
  return new Promise<string>((resolve, reject) => {
    let settled = false;
    let stderr = "";
    const finish = (cause?: Error) => {
      if (settled) return;
      settled = true;
      if (cause) reject(cause);
      else resolve(stderr);
    };
    const child = spawn(command, args, {
      windowsHide: true,
      stdio: ["ignore", "pipe", "pipe"],
    });
    const timer = setTimeout(() => {
      child.kill("SIGKILL");
      finish(new Error("HELP_VIDEO_COMMAND_TIMEOUT"));
    }, timeoutMs);
    child.stderr.on("data", (chunk) => {
      if (stderr.length < 64_000) stderr += String(chunk);
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

function youtubeDownloadRequiresAuthentication(cause: unknown): boolean {
  const message = cause instanceof Error ? cause.message : "";
  return /sign in|login required|private video|members[- ]only|age[- ]restricted|confirm you(?:'|’)re not a bot|cookies/i.test(message);
}

function classifyYoutubeCookieError(cause: unknown): Error {
  const message = cause instanceof Error ? cause.message : "";
  if (
    /provided YouTube account cookies are no longer valid/i.test(message)
    || /cookies.*(?:expired|invalid)/i.test(message)
    || /sign in to confirm you(?:'|’)re not a bot/i.test(message)
  ) {
    return new Error("HELP_VIDEO_YOUTUBE_COOKIES_INVALID");
  }
  return cause instanceof Error ? cause : new Error("HELP_VIDEO_COMMAND_FAILED");
}

function youtubeDownloadArgs(
  url: string,
  directory: string,
  outputPrefix: string,
  cookiesPath: string | null,
): string[] {
  const args = [
    "--ignore-config",
    "--no-playlist",
    "--no-progress",
    "--restrict-filenames",
    ...youtubeRuntimeArgs(),
    "--match-filter",
    "duration <= 1800",
    "--max-filesize",
    "500M",
    "--merge-output-format",
    "mp4",
    "-f",
    "bv*+ba/b",
    "-o",
    join(directory, `${outputPrefix}.%(ext)s`),
  ];
  if (cookiesPath) args.unshift("--cookies", cookiesPath);
  args.push(url);
  return args;
}

async function findYoutubeDownload(
  directory: string,
  outputPrefix: string,
): Promise<string | null> {
  const files = await readdir(directory);
  const downloaded = files.find((file) => {
    if (!file.startsWith(`${outputPrefix}.`)) return false;
    return /\.(mp4|webm|mkv|mov)$/i.test(file);
  });
  return downloaded ? join(directory, downloaded) : null;
}

async function clearYoutubeDownload(
  directory: string,
  outputPrefix: string,
): Promise<void> {
  const files = await readdir(directory).catch(() => []);
  await Promise.all(
    files
      .filter((file) => file.startsWith(`${outputPrefix}.`))
      .map((file) => rm(join(directory, file), { force: true }).catch(() => undefined)),
  );
}

async function runYoutubeDownload(
  url: string,
  directory: string,
  outputPrefix: string,
  cookiesPath: string | null,
): Promise<string> {
  await clearYoutubeDownload(directory, outputPrefix);
  try {
    await runCommand(
      ytDlpPath(),
      youtubeDownloadArgs(url, directory, outputPrefix, cookiesPath),
    );
  } catch (cause) {
    if (cookiesPath) throw classifyYoutubeCookieError(cause);
    throw cause;
  }

  const downloaded = await findYoutubeDownload(directory, outputPrefix);
  if (!downloaded) throw new Error("HELP_VIDEO_YOUTUBE_DOWNLOAD_NOT_FOUND");
  return downloaded;
}

async function downloadYoutubeVideo(url: string, directory: string): Promise<string> {
  if (!youtubeVideoId(url)) throw new Error("HELP_VIDEO_YOUTUBE_URL_INVALID");

  try {
    return await runYoutubeDownload(url, directory, "source-public", null);
  } catch (publicCause) {
    if (!youtubeDownloadRequiresAuthentication(publicCause)) throw publicCause;

    const cookiesPath = await ytDlpCookiesPath();
    if (!cookiesPath) throw new Error("HELP_VIDEO_YOUTUBE_AUTH_REQUIRED");
    return runYoutubeDownload(url, directory, "source-authenticated", cookiesPath);
  }
}

function isMp4Bytes(bytes: Uint8Array): boolean {
  return bytes.byteLength >= 12
    && new TextDecoder().decode(bytes.slice(4, 8)) === "ftyp";
}

async function buildStoredYoutubeMp4(
  videoPath: string,
  directory: string,
  videoId: string,
): Promise<{ bytes: Uint8Array; fileName: string }> {
  const originalBytes = new Uint8Array(await readFile(videoPath));
  if (
    originalBytes.byteLength <= MAX_UPLOAD_VIDEO_BYTES &&
    isMp4Bytes(originalBytes)
  ) {
    return { bytes: originalBytes, fileName: `youtube-${videoId}.mp4` };
  }

  const profiles = [
    { width: 1280, crf: 28, audioBitrate: "96k" },
    { width: 854, crf: 30, audioBitrate: "80k" },
    { width: 640, crf: 32, audioBitrate: "64k" },
  ];

  for (const [index, profile] of profiles.entries()) {
    const outputPath = join(directory, `stored-${index + 1}.mp4`);
    await rm(outputPath, { force: true }).catch(() => undefined);
    try {
      await runCommand(ffmpegPath(), [
        "-hide_banner",
        "-loglevel",
        "error",
        "-y",
        "-i",
        videoPath,
        "-vf",
        `scale=min(${profile.width}\\,iw):-2`,
        "-c:v",
        "libx264",
        "-preset",
        "veryfast",
        "-crf",
        String(profile.crf),
        "-c:a",
        "aac",
        "-b:a",
        profile.audioBitrate,
        "-movflags",
        "+faststart",
        outputPath,
      ]);
    } catch {
      continue;
    }

    const bytes = new Uint8Array(await readFile(outputPath));
    if (
      bytes.byteLength <= MAX_UPLOAD_VIDEO_BYTES &&
      isMp4Bytes(bytes)
    ) {
      return { bytes, fileName: `youtube-${videoId}.mp4` };
    }
  }

  throw new Error("HELP_VIDEO_LOCAL_COPY_TOO_LARGE");
}

export async function downloadHelpYoutubeMp4ForStorage(
  url: string,
): Promise<{ bytes: Uint8Array; fileName: string }> {
  const videoId = youtubeVideoId(url);
  if (!videoId) throw new Error("HELP_VIDEO_YOUTUBE_URL_INVALID");

  const directory = await mkdtemp(join(tmpdir(), "f10-training-youtube-"));
  try {
    const videoPath = await downloadYoutubeVideo(url, directory);
    return await buildStoredYoutubeMp4(videoPath, directory, videoId);
  } finally {
    await rm(directory, { recursive: true, force: true }).catch(() => undefined);
  }
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

function failureCode(cause: unknown): string {
  if (cause instanceof Error) return cause.name === "AbortError" ? "OPENAI_TIMEOUT" : cause.message.slice(0, 180);
  return "OPENAI_REQUEST_FAILED";
}

async function splitAudioForTranscription(
  audioPath: string,
  directory: string,
): Promise<string[]> {
  const outputPattern = join(directory, "audio-transcription-%03d.mp3");
  await runCommand(ffmpegPath(), [
    "-hide_banner",
    "-loglevel",
    "error",
    "-y",
    "-i",
    audioPath,
    "-f",
    "segment",
    "-segment_time",
    String(TRANSCRIPTION_CHUNK_SECONDS),
    "-reset_timestamps",
    "1",
    "-c",
    "copy",
    outputPattern,
  ]);

  const names = (await readdir(directory))
    .filter((name) => /^audio-transcription-\d{3}\.mp3$/.test(name))
    .sort();
  if (names.length === 0) throw new Error("HELP_VIDEO_TRANSCRIPTION_CHUNKS_EMPTY");
  return names.map((name) => join(directory, name));
}

async function transcribeAudioChunk(
  audioPath: string,
  apiKey: string,
): Promise<TimestampedTranscript> {
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
      duration?: number;
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

    const durationSeconds = toFiniteNumber(payload.duration)
      ?? Math.max(...segments.map((segment) => segment.end));
    return { text, segments, durationSeconds };
  } finally {
    clearTimeout(timer);
  }
}

async function transcribeAudio(
  audioPath: string,
  directory: string,
  onAiUsage?: HelpVideoAutomationAiUsageHandler,
  onProgress?: HelpVideoAutomationProgressHandler,
): Promise<TimestampedTranscript> {
  let apiKey = "";
  try {
    apiKey = (await readAiProviderCredential("openai")).apiKey;
  } catch {
    throw new Error("OPENAI_NOT_CONFIGURED");
  }

  const startedAt = Date.now();
  let completedSeconds = 0;

  try {
    const chunks = await splitAudioForTranscription(audioPath, directory);
    const texts: string[] = [];
    const segments: TranscriptSegment[] = [];

    for (const [index, chunkPath] of chunks.entries()) {
      await reportProgress(onProgress, {
        stage: "transcribe",
        status: "active",
        label: "Transcrevendo áudio e identificando os tempos",
        detail: chunks.length > 1
          ? `Parte ${index + 1} de ${chunks.length}`
          : "Processando áudio",
      });

      const chunk = await transcribeAudioChunk(chunkPath, apiKey);
      texts.push(chunk.text);
      segments.push(
        ...chunk.segments.map((segment) => ({
          start: segment.start + completedSeconds,
          end: segment.end + completedSeconds,
          text: segment.text,
        })),
      );
      completedSeconds += chunk.durationSeconds;
    }

    const text = texts.join("\n").trim();
    if (!text || segments.length === 0) throw new Error("HELP_VIDEO_TRANSCRIPTION_EMPTY");

    await reportAiUsage(onAiUsage, {
      operation: "video_transcription",
      provider: "openai",
      model: TRANSCRIPTION_MODEL,
      audioSeconds: completedSeconds,
      latencyMs: Date.now() - startedAt,
      status: "success",
    });

    return {
      text: text.slice(0, 180_000),
      segments,
      durationSeconds: completedSeconds,
    };
  } catch (cause) {
    await reportAiUsage(onAiUsage, {
      operation: "video_transcription",
      provider: "openai",
      model: TRANSCRIPTION_MODEL,
      audioSeconds: completedSeconds || null,
      latencyMs: Date.now() - startedAt,
      status: "failed",
      failureCode: failureCode(cause),
    });
    throw cause;
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
                  "capture",
                  "target",
                  "altText",
                  "assistantDescription",
                ],
                properties: {
                  startSeconds: { type: "number", minimum: 0 },
                  endSeconds: { type: "number", minimum: 0 },
                  capture: { type: "string", enum: ["before", "after"] },
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

function articlePrompt(
  categories: HelpVideoAutomationCategory[],
  transcript: TimestampedTranscript,
): string {
  return [
    "Crie um único artigo operacional da Base de Conhecimento F10 usando SOMENTE a transcrição temporal abaixo.",
    "Você não recebeu imagens. Use os timecodes para definir os cortes dos screenshots; o F10 fará a captura localmente sem enviar frames para a OpenAI.",
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
    "REGRA DE SCREENSHOT: todo step que ensina uma ação de interface deve retornar exatamente um item em screenshots. Use screenshots: [] somente para um step puramente explicativo, sem clique, navegação, preenchimento, seleção, configuração, confirmação ou resultado visual.",
    "A janela de screenshot deve se basear nos timecodes da fala da própria ação. Use normalmente 4 a 10 segundos e nunca mais de 12 segundos. Pode começar até 2 segundos antes e terminar até 3 segundos depois da fala para abranger o estado da interface.",
    "Use capture='before' quando o valor do screenshot é mostrar onde está o botão, menu, campo ou controle ANTES do clique/ação.",
    "Use capture='after' quando o valor do screenshot é mostrar o resultado da ação: tela aberta, aba selecionada, campo preenchido, opção marcada, configuração concluída ou confirmação exibida.",
    "Para passos de preenchimento, seleção, configuração e salvamento, prefira capture='after'. Para localizar um botão/menu que será clicado, use capture='before' quando isso for mais didático.",
    "target, altText e assistantDescription devem descrever apenas o estado esperado a partir do que a transcrição afirma, sem alegar detalhes que não foram mencionados.",
    `Categorias permitidas: ${categories.map((category) => `${category.slug} (${category.name})`).join(", ") || UNCATEGORIZED_HELP_CATEGORY_SLUG}.`,
    `Se nenhuma categoria real for segura, use somente ${UNCATEGORIZED_HELP_CATEGORY_SLUG}.`,
    "TRANSCRIÇÃO COM TIMECODES:",
    formatTimestampedTranscript(transcript),
  ].join("\n\n");
}

async function generateArticle(
  transcript: TimestampedTranscript,
  categories: HelpVideoAutomationCategory[],
  onAiUsage?: HelpVideoAutomationAiUsageHandler,
): Promise<GeneratedArticle> {
  const startedAt = Date.now();
  let provider = "";
  let model = "";
  let inputTokens: number | null = null;
  let outputTokens: number | null = null;

  const requestArticle = () => createAiStructuredResponse<GeneratedArticle>({
    task: "content_edit",
    requiredCapabilities: ["content.draft"],
    instructions: [
      "Estruture um artigo operacional F10 usando exclusivamente a fonte recebida.",
      "Responda exatamente no schema solicitado, sem texto fora do JSON.",
      "Não invente telas, regras, campos, URLs, condições ou resultados.",
    ].join("\n"),
    userInput: articlePrompt(categories, transcript),
    schemaName: "f10_help_video_article_timeline_local_frames",
    schema: articleSchema(),
    maxOutputTokens: 10_000,
    timeoutMs: 180_000,
  });

  try {
    let response;
    try {
      response = await requestArticle();
    } catch (cause) {
      const retryable =
        cause instanceof AiGatewayError
        && (
          cause.code === "AI_OUTPUT_INCOMPLETE"
          || cause.code === "AI_EMPTY_RESPONSE"
          || cause.code === "AI_INVALID_JSON"
        );
      if (!retryable) throw cause;

      console.warn("[help-video-import] retrying article generation from transcript", {
        failureCode: cause.code,
        transcriptChars: transcript.text.length,
        transcriptSegments: transcript.segments.length,
      });
      response = await requestArticle();
    }

    provider = response.provider;
    model = response.model;
    inputTokens = response.inputTokens;
    outputTokens = response.outputTokens;

    await reportAiUsage(onAiUsage, {
      operation: "video_article",
      provider,
      model,
      inputTokens,
      outputTokens,
      latencyMs: Date.now() - startedAt,
      status: "success",
    });
    return response.data;
  } catch (cause) {
    const code = cause instanceof AiGatewayError ? cause.code : failureCode(cause);
    await reportAiUsage(onAiUsage, {
      operation: "video_article",
      provider: provider || undefined,
      model: model || "ai-gateway",
      inputTokens,
      outputTokens,
      latencyMs: Date.now() - startedAt,
      status: "failed",
      failureCode: code,
    });
    if (cause instanceof AiGatewayError) {
      if (cause.code === "AI_TIMEOUT") {
        throw new Error("HELP_VIDEO_ARTICLE_GENERATION_TIMEOUT");
      }
      if (cause.code === "AI_INVALID_JSON") {
        throw new Error("HELP_VIDEO_ARTICLE_GENERATION_INVALID_JSON");
      }
      if (cause.code === "AI_EMPTY_RESPONSE" || cause.code === "AI_OUTPUT_INCOMPLETE") {
        throw new Error("HELP_VIDEO_ARTICLE_GENERATION_EMPTY");
      }
      throw new Error(`HELP_VIDEO_ARTICLE_GENERATION_FAILED:${cause.code}`);
    }
    throw cause;
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
  if (end - start < 2) {
    start = Math.max(0, start - 1);
    end = Math.min(durationSeconds, Math.max(end + 1, start + 2));
  }
  return end > start ? { start, end } : null;
}

function candidateTimes(start: number, end: number): number[] {
  const span = end - start;
  return [0.06, 0.24, 0.42, 0.6, 0.78, 0.96].map((fraction) =>
    Math.round(Math.max(start, Math.min(end - 0.03, start + span * fraction)) * 1000) / 1000,
  );
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
      // Um frame perto do fim pode falhar sem invalidar a etapa inteira.
    }
  }
  return candidates;
}

export type HelpVideoGeneratedFrameCandidate = {
  candidateIndex: number;
  timeSeconds: number;
  recommended: boolean;
  bytes: Uint8Array;
};

export async function generateHelpVideoFrameCandidates(input: {
  videoBytes: Uint8Array;
  startSeconds: number;
  endSeconds: number;
  capture: ScreenshotCaptureMode;
  durationSeconds: number;
}): Promise<HelpVideoGeneratedFrameCandidate[]> {
  if (!isMp4Bytes(input.videoBytes)) throw new Error("HELP_VIDEO_UPLOAD_FORMAT_INVALID");
  const directory = await mkdtemp(join(tmpdir(), "f10-help-frames-"));
  const videoPath = join(directory, "source.mp4");
  try {
    await writeFile(videoPath, input.videoBytes);
    const screenshot: PlannedScreenshot = {
      startSeconds: input.startSeconds,
      endSeconds: input.endSeconds,
      capture: input.capture,
      target: "Screenshot adicional",
      altText: "",
      assistantDescription: "",
    };
    const candidates = await extractScreenshotCandidates({
      videoPath,
      directory,
      stepIndex: 0,
      screenshot,
      durationSeconds: input.durationSeconds,
    });
    const selected = await chooseStableCandidate(candidates, input.capture);
    return Promise.all(
      candidates.map(async (candidate, index) => ({
        candidateIndex: index + 1,
        timeSeconds: candidate.timeSeconds,
        recommended: candidate.path === selected?.path,
        bytes: new Uint8Array(await readFile(candidate.path)),
      })),
    );
  } finally {
    await rm(directory, { recursive: true, force: true }).catch(() => undefined);
  }
}

async function frameSsim(leftPath: string, rightPath: string): Promise<number | null> {
  try {
    const stderr = await runCommand(ffmpegPath(), [
      "-hide_banner",
      "-i",
      leftPath,
      "-i",
      rightPath,
      "-lavfi",
      "[0:v][1:v]ssim",
      "-f",
      "null",
      "-",
    ]);
    const matches = Array.from(stderr.matchAll(/All:([0-9.]+)/g));
    const raw = matches.at(-1)?.[1];
    const score = raw ? Number(raw) : NaN;
    return Number.isFinite(score) ? score : null;
  } catch {
    return null;
  }
}

async function chooseStableCandidate(
  candidates: ScreenshotCandidate[],
  capture: ScreenshotCaptureMode,
): Promise<ScreenshotCandidate | null> {
  if (candidates.length === 0) return null;
  if (candidates.length === 1) return candidates[0] ?? null;

  const pairs: Array<{ index: number; score: number }> = [];
  for (let index = 0; index < candidates.length - 1; index += 1) {
    const left = candidates[index];
    const right = candidates[index + 1];
    if (!left || !right) continue;
    const score = await frameSsim(left.path, right.path);
    if (score !== null) pairs.push({ index, score });
  }

  if (pairs.length === 0) {
    return capture === "after" ? candidates.at(-1) ?? null : candidates[0] ?? null;
  }

  const stablePairs = pairs.filter((pair) => pair.score >= STABILITY_THRESHOLD);
  if (capture === "after") {
    const pair = stablePairs.at(-1)
      ?? [...pairs].sort((a, b) => b.score - a.score || b.index - a.index)[0];
    return pair ? candidates[pair.index + 1] ?? candidates.at(-1) ?? null : candidates.at(-1) ?? null;
  }

  const pair = stablePairs[0]
    ?? [...pairs].sort((a, b) => b.score - a.score || a.index - b.index)[0];
  return pair ? candidates[pair.index] ?? candidates[0] ?? null : candidates[0] ?? null;
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
    .map((step, stepIndex) => ({ stepIndex, screenshot: step.screenshots?.[0] }))
    .filter((item): item is { stepIndex: number; screenshot: PlannedScreenshot } => Boolean(item.screenshot))
    .slice(0, MAX_AUTOMATIC_SCREENSHOTS);
  if (planned.length === 0) throw new Error("HELP_VIDEO_SCREENSHOTS_NOT_PLANNED");

  const results = await mapWithConcurrency(
    planned,
    SCREENSHOT_CONCURRENCY,
    async (item) => {
      const candidates = await extractScreenshotCandidates({
        videoPath: input.videoPath,
        directory: input.directory,
        stepIndex: item.stepIndex,
        screenshot: item.screenshot,
        durationSeconds: input.durationSeconds,
      });
      const selected = await chooseStableCandidate(candidates, item.screenshot.capture);
      const reviewCandidates: HelpVideoScreenshotReviewCandidate[] = [];
      for (const [candidateIndex, candidate] of candidates.entries()) {
        reviewCandidates.push({
          stepIndex: item.stepIndex,
          candidateIndex: candidateIndex + 1,
          timeSeconds: candidate.timeSeconds,
          recommended: candidate.path === selected?.path,
          altText: item.screenshot.altText.trim().slice(0, 500) || item.screenshot.target.trim().slice(0, 500),
          assistantDescription:
            item.screenshot.assistantDescription.trim().slice(0, 20_000)
            || item.screenshot.target.trim().slice(0, 20_000),
          bytes: new Uint8Array(await readFile(candidate.path)),
        });
      }
      return {
        stepIndex: item.stepIndex,
        candidateCount: candidates.length,
        reviewCandidates,
        selected: selected
          ? {
              path: selected.path,
              altText: item.screenshot.altText.trim().slice(0, 500) || item.screenshot.target.trim().slice(0, 500),
              assistantDescription:
                item.screenshot.assistantDescription.trim().slice(0, 20_000)
                || item.screenshot.target.trim().slice(0, 20_000),
            }
          : null,
      };
    },
  );

  const screenshots = new Map<number, ResolvedScreenshot>();
  const reviewCandidates: HelpVideoScreenshotReviewCandidate[] = [];
  let analyzedFrameCount = 0;
  for (const result of results) {
    analyzedFrameCount += result.candidateCount;
    reviewCandidates.push(...result.reviewCandidates);
    if (result.selected) screenshots.set(result.stepIndex, result.selected);
  }
  if (screenshots.size === 0) throw new Error("HELP_VIDEO_NO_SCREENSHOTS_SELECTED");

  return {
    screenshots,
    reviewCandidates,
    analyzedFrameCount,
    plannedScreenshotCount: planned.length,
  };
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
  transcriptTimeline: TranscriptSegment[];
  screenshotResolution: ScreenshotResolution;
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
    const screenshot = input.screenshotResolution.screenshots.get(stepIndex);
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
    reviewCandidates: input.screenshotResolution.reviewCandidates,
    transcript: input.transcript,
    transcriptTimeline: input.transcriptTimeline.map((segment) => ({
      start: segment.start,
      end: segment.end,
      text: segment.text,
    })),
    transcriptChars: input.transcript.length,
    analyzedFrameCount: input.screenshotResolution.analyzedFrameCount,
    selectedScreenshotCount,
    sourceType: input.sourceType,
  };
}

export async function generateHelpImportFromVideo(input: {
  source: HelpVideoAutomationSource;
  categories: HelpVideoAutomationCategory[];
  externalIdHint?: string;
  onProgress?: HelpVideoAutomationProgressHandler;
  onAiUsage?: HelpVideoAutomationAiUsageHandler;
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
    let youtubeId: string | null = null;

    await reportProgress(input.onProgress, {
      stage: "source",
      status: "active",
      label: input.source.type === "youtube" ? "Baixando vídeo do YouTube" : "Preparando arquivo MP4 enviado",
    });

    if (input.source.type === "youtube") {
      const id = youtubeVideoId(input.source.url);
      if (!id) throw new Error("HELP_VIDEO_YOUTUBE_URL_INVALID");
      youtubeId = id;
      videoPath = await downloadYoutubeVideo(input.source.url, directory);
      derivedExternalId = `youtube:${id.toLowerCase()}`;
      featuredVideoUrl = input.source.url;
    } else {
      if (input.source.bytes.byteLength < 1 || input.source.bytes.byteLength > MAX_UPLOAD_VIDEO_BYTES) {
        throw new Error("HELP_VIDEO_UPLOAD_SIZE_INVALID");
      }
      if (
        input.source.mimeType.toLowerCase() !== "video/mp4"
        && !input.source.fileName.toLowerCase().endsWith(".mp4")
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
    const transcript = await transcribeAudio(
      audioPath,
      directory,
      input.onAiUsage,
      input.onProgress,
    );
    await reportProgress(input.onProgress, {
      stage: "transcribe",
      status: "done",
      label: "Transcrição temporal concluída",
      detail: `${transcript.segments.length} segmento(s) · ${transcript.text.length} caracteres`,
    });

    await reportProgress(input.onProgress, {
      stage: "analyze",
      status: "active",
      label: "Estruturando o artigo e definindo os cortes",
    });
    const article = await generateArticle(transcript, input.categories, input.onAiUsage);
    const plannedScreenshotCount = article.steps.filter((step) => step.screenshots.length > 0).length;
    if (plannedScreenshotCount === 0) throw new Error("HELP_VIDEO_SCREENSHOTS_NOT_PLANNED");

    await reportProgress(input.onProgress, {
      stage: "analyze",
      status: "active",
      label: "Capturando screenshots e opções de revisão",
      detail: `${plannedScreenshotCount} captura(s) planejada(s) · sem envio de imagens à OpenAI`,
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
      label: "Cortes, sugestão e alternativas concluídos",
      detail: `${screenshotResolution.screenshots.size}/${screenshotResolution.plannedScreenshotCount} screenshot(s) · ${screenshotResolution.analyzedFrameCount} frames locais avaliados`,
    });

    await reportProgress(input.onProgress, {
      stage: "package",
      status: "active",
      label: "Organizando conteúdo e screenshots do rascunho",
    });
    const result = await buildImportResult({
      article,
      transcript: transcript.text,
      transcriptTimeline: transcript.segments,
      screenshotResolution,
      categories: input.categories,
      externalId,
      featuredVideoUrl,
      sourceType: input.source.type,
    });
    if (youtubeId) {
      try {
        result.localVideo = await buildStoredYoutubeMp4(videoPath, directory, youtubeId);
      } catch (cause) {
        result.localVideoFailureCode = cause instanceof Error
          ? cause.message.split(":", 1)[0]?.slice(0, 120) || "HELP_VIDEO_LOCAL_COPY_FAILED"
          : "HELP_VIDEO_LOCAL_COPY_FAILED";
        console.error("[help-video-import] local MP4 cache skipped", {
          technicalCode: result.localVideoFailureCode,
        });
      }
    }
    await reportProgress(input.onProgress, {
      stage: "package",
      status: "done",
      label: "Conteúdo, sugestão e alternativas organizados",
      detail: `${result.selectedScreenshotCount} screenshot(s) sugerido(s) · ${result.reviewCandidates.length} candidato(s) preservado(s)`,
    });
    return result;
  } finally {
    await rm(directory, { recursive: true, force: true }).catch(() => undefined);
  }
}

export const HELP_VIDEO_AUTOMATION_MAX_UPLOAD_BYTES = MAX_UPLOAD_VIDEO_BYTES;
export const HELP_VIDEO_AUTOMATION_TRANSCRIPTION_MODEL = TRANSCRIPTION_MODEL;
