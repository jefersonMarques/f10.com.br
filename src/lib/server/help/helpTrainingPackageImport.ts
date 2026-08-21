import { randomBytes } from "node:crypto";
import { eq } from "drizzle-orm";
import { recordAuditEvent } from "$lib/server/auth/audit";
import { getDatabase } from "$lib/server/db";
import {
  helpTrainingFailureReasons,
  helpTrainingPaths,
  helpTrainingStepMedia,
  helpTrainingSteps,
  type HelpTrainingAccessMode,
  type HelpTrainingInteractionMode,
} from "$lib/server/db/helpTrainingSchema";
import { createManagedHelpAsset, deleteManagedHelpAsset } from "$lib/server/help/helpAssetRepository";
import { createTrainingCaptionAsset, validateTrainingCaptions } from "$lib/server/help/helpTrainingCaption";
import { normalizeTrainingSlug } from "$lib/server/help/helpTrainingRepository";
import { validateTrainingVideo } from "$lib/server/help/helpTrainingVideo";
import { readZipArchive } from "$lib/server/help/zipArchive";

const MANIFEST_NAMES = ["training.json", "manifest.json"];
const MAX_MANIFEST_BYTES = 1024 * 1024;
const MAX_STEPS = 100;
const MAX_IMAGES_PER_STEP = 10;

const DEFAULT_FAILURE_REASONS = [
  { key: "option_not_found", label: "Não encontrei a opção", recoveryMessage: "Confira novamente a orientação e a demonstração desta etapa." },
  { key: "system_error", label: "Deu erro no sistema", recoveryMessage: "Anote a mensagem exibida e, se possível, faça uma captura da tela antes de tentar novamente." },
  { key: "permission_missing", label: "Não tenho permissão", recoveryMessage: "Essa ação pode depender do perfil liberado pela sua empresa. Peça ajuda para verificarmos a permissão correta." },
  { key: "instruction_unclear", label: "Não entendi o que preciso fazer", recoveryMessage: "Releia somente esta orientação e use a demonstração, se houver. Depois tente novamente." },
];

type ManifestImage = { file: string; altText: string };
type ManifestVideo = { file: string | null; url: string | null; captions: string | null };
type ManifestReason = { key: string; label: string; recoveryMessage: string };
type ManifestStep = {
  title: string;
  question: string;
  instruction: string;
  expectedResult: string;
  successMessage: string;
  primaryActionLabel: string;
  estimatedSeconds: number;
  interactionMode: HelpTrainingInteractionMode;
  images: ManifestImage[];
  video: ManifestVideo | null;
  failureReasons: ManifestReason[];
};
type TrainingManifest = {
  title: string;
  slug: string;
  audience: string;
  description: string;
  welcomeMessage: string;
  accessMode: HelpTrainingAccessMode;
  steps: ManifestStep[];
};
type PreparedAsset = { id: string; reused: boolean };
type PackageAssetType = "image" | "video" | "caption";
type TrainingMediaRow = {
  stepId: string;
  mediaType: string;
  assetId: string | null;
  sourceUrl: string | null;
  altText: string;
  sortOrder: number;
};

function text(value: unknown, maxLength: number): string {
  return typeof value === "string" ? value.trim().slice(0, maxLength) : "";
}

function requiredText(value: unknown, maxLength: number, code: string): string {
  const normalized = text(value, maxLength);
  if (!normalized) throw new Error(code);
  return normalized;
}

function integer(value: unknown, fallback: number, min: number, max: number): number {
  const parsed = typeof value === "number" ? value : Number.parseInt(String(value ?? ""), 10);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(Math.max(Math.round(parsed), min), max);
}

function normalizeFilePath(value: unknown): string {
  const normalized = text(value, 500).replace(/\\/g, "/").replace(/^\.\//, "");
  if (!normalized || normalized.startsWith("/") || normalized.split("/").some((segment) => segment === "..")) {
    throw new Error("TRAINING_PACKAGE_FILE_INVALID");
  }
  return normalized;
}

function normalizeReasonKey(value: unknown, stepIndex: number, reasonIndex: number): string {
  const normalized = text(value, 100)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9_]+/g, "_")
    .replace(/^_+|_+$/g, "");
  return normalized || `reason_${stepIndex + 1}_${reasonIndex + 1}`;
}

function defaultPrimaryActionLabel(interactionMode: HelpTrainingInteractionMode): string {
  return interactionMode === "presentation" ? "Entendi, continuar" : "Sim, consegui";
}

function assertHttpUrl(value: string): void {
  try {
    const url = new URL(value);
    if (url.protocol !== "http:" && url.protocol !== "https:") throw new Error();
  } catch {
    throw new Error("TRAINING_PACKAGE_VIDEO_URL_INVALID");
  }
}

function parseManifest(bytes: Uint8Array): TrainingManifest {
  if (bytes.byteLength < 2 || bytes.byteLength > MAX_MANIFEST_BYTES) throw new Error("TRAINING_PACKAGE_MANIFEST_SIZE");
  let raw: unknown;
  try {
    const sourceText = new TextDecoder("utf-8", { fatal: true }).decode(bytes).replace(/^\uFEFF/, "");
    raw = JSON.parse(sourceText);
  } catch {
    throw new Error("TRAINING_PACKAGE_MANIFEST_JSON");
  }
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) throw new Error("TRAINING_PACKAGE_MANIFEST_INVALID");
  const source = raw as Record<string, unknown>;
  if (source.formatVersion !== 1) throw new Error("TRAINING_PACKAGE_VERSION_UNSUPPORTED");
  const title = requiredText(source.title, 160, "TRAINING_PACKAGE_TITLE_REQUIRED");
  if (title.length < 4) throw new Error("TRAINING_PACKAGE_TITLE_REQUIRED");
  const slug = normalizeTrainingSlug(text(source.slug, 100) || title);
  if (!slug) throw new Error("TRAINING_PACKAGE_SLUG_INVALID");
  const accessMode: HelpTrainingAccessMode = source.accessMode === "public" ? "public" : "invite_only";
  if (!Array.isArray(source.steps) || source.steps.length < 1 || source.steps.length > MAX_STEPS) {
    throw new Error("TRAINING_PACKAGE_STEPS_INVALID");
  }

  const steps = source.steps.map((rawStep, stepIndex): ManifestStep => {
    if (!rawStep || typeof rawStep !== "object" || Array.isArray(rawStep)) throw new Error("TRAINING_PACKAGE_STEP_INVALID");
    const step = rawStep as Record<string, unknown>;
    const interactionMode: HelpTrainingInteractionMode = step.interactionMode === "presentation" ? "presentation" : "action";
    const title = requiredText(step.title, 180, "TRAINING_PACKAGE_STEP_TITLE_REQUIRED");
    const imagesSource = Array.isArray(step.images) ? step.images : [];
    if (imagesSource.length > MAX_IMAGES_PER_STEP) throw new Error("TRAINING_PACKAGE_IMAGES_LIMIT");
    const images = imagesSource.map((rawImage): ManifestImage => {
      if (typeof rawImage === "string") return { file: normalizeFilePath(rawImage), altText: "" };
      if (!rawImage || typeof rawImage !== "object" || Array.isArray(rawImage)) throw new Error("TRAINING_PACKAGE_IMAGE_INVALID");
      const image = rawImage as Record<string, unknown>;
      return { file: normalizeFilePath(image.file), altText: text(image.altText, 500) };
    });

    let video: ManifestVideo | null = null;
    if (step.video) {
      if (typeof step.video === "string") {
        const value = text(step.video, 1000);
        if (!value) throw new Error("TRAINING_PACKAGE_VIDEO_REFERENCE_INVALID");
        video = /^https?:\/\//i.test(value)
          ? { file: null, url: value, captions: null }
          : { file: normalizeFilePath(value), url: null, captions: null };
      } else if (typeof step.video === "object" && !Array.isArray(step.video)) {
        const rawVideo = step.video as Record<string, unknown>;
        const file = rawVideo.file ? normalizeFilePath(rawVideo.file) : null;
        const url = text(rawVideo.url, 1000) || null;
        const captions = rawVideo.captions ? normalizeFilePath(rawVideo.captions) : null;
        if (file && url) throw new Error("TRAINING_PACKAGE_VIDEO_REFERENCE_INVALID");
        if (captions && !file) throw new Error("TRAINING_PACKAGE_CAPTION_WITHOUT_VIDEO");
        video = file || url ? { file, url, captions } : null;
      } else {
        throw new Error("TRAINING_PACKAGE_VIDEO_REFERENCE_INVALID");
      }
      if (video?.url) assertHttpUrl(video.url);
    }

    const reasonsSource = Array.isArray(step.failureReasons) ? step.failureReasons : DEFAULT_FAILURE_REASONS;
    const failureReasons = interactionMode === "presentation"
      ? []
      : reasonsSource.map((rawReason, reasonIndex): ManifestReason => {
          if (!rawReason || typeof rawReason !== "object" || Array.isArray(rawReason)) throw new Error("TRAINING_PACKAGE_REASON_INVALID");
          const reason = rawReason as Record<string, unknown>;
          return {
            key: normalizeReasonKey(reason.key, stepIndex, reasonIndex),
            label: requiredText(reason.label, 180, "TRAINING_PACKAGE_REASON_INVALID"),
            recoveryMessage: text(reason.recoveryMessage, 4000),
          };
        });
    if (new Set(failureReasons.map((reason) => reason.key)).size !== failureReasons.length) {
      throw new Error("TRAINING_PACKAGE_REASON_DUPLICATE");
    }

    const expectedResult = text(step.expectedResult, 3000);
    if (interactionMode === "action" && !expectedResult) throw new Error("TRAINING_PACKAGE_RESULT_REQUIRED");
    return {
      title,
      question: text(step.question, 300) || title,
      instruction: requiredText(step.instruction, 6000, "TRAINING_PACKAGE_STEP_INSTRUCTION_REQUIRED"),
      expectedResult: interactionMode === "presentation" ? "" : expectedResult,
      successMessage: text(step.successMessage, 500),
      primaryActionLabel: text(step.primaryActionLabel, 80) || defaultPrimaryActionLabel(interactionMode),
      estimatedSeconds: integer(step.estimatedSeconds, 45, 5, 900),
      interactionMode,
      images,
      video,
      failureReasons,
    };
  });

  return {
    title,
    slug,
    audience: text(source.audience, 160),
    description: text(source.description, 1200),
    welcomeMessage: text(source.welcomeMessage, 1200) || "Vamos aprender fazendo. Você verá uma orientação curta por vez.",
    accessMode,
    steps,
  };
}

function mimeTypeForFile(path: string, expected: PackageAssetType): string {
  const extension = path.split(".").pop()?.toLowerCase() ?? "";
  const mimeType = extension === "png" ? "image/png"
    : extension === "jpg" || extension === "jpeg" ? "image/jpeg"
      : extension === "webp" ? "image/webp"
        : extension === "gif" ? "image/gif"
          : extension === "mp4" ? "video/mp4"
            : extension === "vtt" ? "text/vtt"
              : "";
  const valid = expected === "image"
    ? mimeType.startsWith("image/")
    : expected === "video"
      ? mimeType === "video/mp4"
      : mimeType === "text/vtt";
  if (!valid) {
    throw new Error(expected === "image"
      ? "TRAINING_PACKAGE_IMAGE_FORMAT"
      : expected === "video"
        ? "TRAINING_PACKAGE_VIDEO_FORMAT"
        : "TRAINING_PACKAGE_CAPTION_FORMAT");
  }
  return mimeType;
}

function registerReferencedFile(
  referencedFiles: Map<string, PackageAssetType>,
  path: string,
  assetType: PackageAssetType,
): void {
  const existingType = referencedFiles.get(path);
  if (existingType && existingType !== assetType) {
    throw new Error(`TRAINING_PACKAGE_FILE_TYPE_CONFLICT:${path}`);
  }
  referencedFiles.set(path, assetType);
}

export async function importHelpTrainingPackage(
  actorUserId: string,
  archiveBytes: Uint8Array,
) {
  const archive = readZipArchive(archiveBytes);
  const manifestEntry = MANIFEST_NAMES.map((name) => archive.get(name)).find(Boolean);
  if (!manifestEntry) throw new Error("TRAINING_PACKAGE_MANIFEST_MISSING");
  const manifest = parseManifest(manifestEntry.bytes);

  const referencedFiles = new Map<string, PackageAssetType>();
  for (const step of manifest.steps) {
    for (const image of step.images) registerReferencedFile(referencedFiles, image.file, "image");
    if (step.video?.file) registerReferencedFile(referencedFiles, step.video.file, "video");
    if (step.video?.captions) registerReferencedFile(referencedFiles, step.video.captions, "caption");
  }
  for (const [path, expectedType] of referencedFiles) {
    const entry = archive.get(path);
    if (!entry) throw new Error(`TRAINING_PACKAGE_FILE_MISSING:${path}`);
    const mimeType = mimeTypeForFile(path, expectedType);
    if (expectedType === "video") validateTrainingVideo(entry.bytes, mimeType);
    if (expectedType === "caption") validateTrainingCaptions(entry.bytes);
  }

  const [existingPath] = await getDatabase()
    .select({ id: helpTrainingPaths.id })
    .from(helpTrainingPaths)
    .where(eq(helpTrainingPaths.slug, manifest.slug))
    .limit(1);
  if (existingPath) throw new Error("TRAINING_PACKAGE_SLUG_EXISTS");

  const preparedAssets = new Map<string, PreparedAsset>();
  const newAssetIds: string[] = [];
  try {
    for (const [path, expectedType] of referencedFiles) {
      const entry = archive.get(path)!;
      if (expectedType === "caption") {
        const result = await createTrainingCaptionAsset(
          actorUserId,
          path.split("/").pop() || "legendas.vtt",
          entry.bytes,
        );
        preparedAssets.set(path, { id: result.assetId, reused: result.reused });
        if (!result.reused) newAssetIds.push(result.assetId);
        continue;
      }
      const result = await createManagedHelpAsset(actorUserId, {
        fileName: path.split("/").pop() || path,
        mimeType: mimeTypeForFile(path, expectedType),
        bytes: entry.bytes,
        contentId: null,
      });
      preparedAssets.set(path, { id: result.asset.id, reused: result.reused });
      if (!result.reused) newAssetIds.push(result.asset.id);
    }

    const db = getDatabase();
    const result = await db.transaction(async (tx) => {
      const [path] = await tx
        .insert(helpTrainingPaths)
        .values({
          slug: manifest.slug,
          title: manifest.title,
          audience: manifest.audience,
          description: manifest.description,
          welcomeMessage: manifest.welcomeMessage,
          accessMode: manifest.accessMode,
          status: "draft",
          createdBy: actorUserId,
          updatedBy: actorUserId,
        })
        .returning({ id: helpTrainingPaths.id, slug: helpTrainingPaths.slug });
      if (!path) throw new Error("TRAINING_PACKAGE_PATH_NOT_CREATED");

      for (let stepIndex = 0; stepIndex < manifest.steps.length; stepIndex += 1) {
        const source = manifest.steps[stepIndex]!;
        const [step] = await tx
          .insert(helpTrainingSteps)
          .values({
            pathId: path.id,
            title: source.title,
            question: source.question,
            instruction: source.instruction,
            expectedResult: source.expectedResult,
            successMessage: source.successMessage,
            primaryActionLabel: source.primaryActionLabel,
            estimatedSeconds: source.estimatedSeconds,
            interactionMode: source.interactionMode,
            sortOrder: (stepIndex + 1) * 10,
          })
          .returning({ id: helpTrainingSteps.id });
        if (!step) throw new Error("TRAINING_PACKAGE_STEP_NOT_CREATED");

        if (source.failureReasons.length > 0) {
          await tx.insert(helpTrainingFailureReasons).values(
            source.failureReasons.map((reason, reasonIndex) => ({
              stepId: step.id,
              reasonKey: reason.key || `import_${randomBytes(6).toString("hex")}`,
              label: reason.label,
              recoveryMessage: reason.recoveryMessage,
              sortOrder: (reasonIndex + 1) * 10,
            })),
          );
        }

        const mediaRows: TrainingMediaRow[] = source.images.map((image, imageIndex) => ({
          stepId: step.id,
          mediaType: "image",
          assetId: preparedAssets.get(image.file)!.id,
          sourceUrl: null,
          altText: image.altText,
          sortOrder: (imageIndex + 1) * 10,
        }));
        if (source.video?.file) {
          const assetId = preparedAssets.get(source.video.file)!.id;
          mediaRows.push({
            stepId: step.id,
            mediaType: "video",
            assetId,
            sourceUrl: `asset:${assetId}`,
            altText: "",
            sortOrder: (mediaRows.length + 1) * 10,
          });
          if (source.video.captions) {
            mediaRows.push({
              stepId: step.id,
              mediaType: "caption",
              assetId: preparedAssets.get(source.video.captions)!.id,
              sourceUrl: null,
              altText: "Legendas em português",
              sortOrder: (mediaRows.length + 1) * 10,
            });
          }
        } else if (source.video?.url) {
          mediaRows.push({
            stepId: step.id,
            mediaType: "video",
            assetId: null,
            sourceUrl: source.video.url,
            altText: "",
            sortOrder: (mediaRows.length + 1) * 10,
          });
        }
        if (mediaRows.length > 0) await tx.insert(helpTrainingStepMedia).values(mediaRows);
      }
      return path;
    });

    await recordAuditEvent({
      actorUserId,
      action: "help.training.package_imported",
      entityType: "help_training_path",
      entityId: result.id,
      metadata: { slug: result.slug, stepCount: manifest.steps.length, assetCount: referencedFiles.size },
    });
    return result;
  } catch (cause) {
    for (const assetId of newAssetIds.reverse()) {
      await deleteManagedHelpAsset(actorUserId, assetId).catch(() => undefined);
    }
    throw cause;
  }
}
