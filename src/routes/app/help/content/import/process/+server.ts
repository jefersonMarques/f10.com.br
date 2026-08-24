import { json } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";
import { UNCATEGORIZED_HELP_CATEGORY_SLUG } from "$lib/help/helpCategoryConstants";
import { requireAppPermission } from "$lib/server/auth/authorization";
import { recordHelpAiUsage } from "$lib/server/help/helpAiUsageRepository";
import { listHelpCategories } from "$lib/server/help/helpCategoryRepository";
import { stabilizeHelpImportIdentity } from "$lib/server/help/helpImportIdentity";
import { attachImportedMp4AsFeaturedVideo } from "$lib/server/help/helpImportedFeaturedVideo";
import { replaceHelpScreenshotReviewCandidates } from "$lib/server/help/helpScreenshotReviewRepository";
import {
  generateHelpImportFromVideo,
  HELP_VIDEO_AUTOMATION_MAX_UPLOAD_BYTES,
  type HelpVideoAutomationProgress,
  type HelpVideoAutomationSource,
} from "$lib/server/help/helpVideoImportAutomation";
import {
  importStructuredHelpFile,
  validateHelpImportJson,
  type HelpImportFile,
} from "$lib/server/help/structuredHelpImport";
import { getHelpVideoAutomationSettings } from "$lib/server/settings/operationsSettingsRepository";

function readString(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function automationErrorMessage(code: string): string {
  if (code === "OPENAI_NOT_CONFIGURED") return "Configure a chave da OpenAI antes de usar a automação.";
  if (code === "HELP_VIDEO_FFMPEG_NOT_AVAILABLE") return "FFmpeg não foi encontrado no servidor. Configure-o antes de processar vídeos.";
  if (code === "HELP_VIDEO_YTDLP_NOT_AVAILABLE") return "yt-dlp não foi encontrado no servidor. O modo MP4 continua disponível.";
  if (code === "HELP_VIDEO_YOUTUBE_URL_INVALID") return "Informe um link válido do YouTube.";
  if (code === "HELP_VIDEO_UPLOAD_SIZE_INVALID") {
    return `O vídeo deve ter no máximo ${Math.round(HELP_VIDEO_AUTOMATION_MAX_UPLOAD_BYTES / 1024 / 1024)} MB.`;
  }
  if (code === "HELP_VIDEO_UPLOAD_FORMAT_INVALID") return "Use um arquivo .mp4 válido.";
  if (code === "HELP_VIDEO_TRANSCRIPTION_EMPTY") return "A transcrição retornou vazia. Revise o áudio do vídeo.";
  if (code === "HELP_VIDEO_TRANSCRIPTION_TIMESTAMPS_EMPTY") return "A transcrição não retornou os tempos necessários para gerar os screenshots.";
  if (code === "HELP_VIDEO_TRANSCRIPTION_TIMEOUT") return "A transcrição demorou mais que o limite permitido. Tente novamente.";
  if (code === "HELP_VIDEO_FRAMES_NOT_FOUND") return "O F10 não encontrou telas válidas para analisar no vídeo.";
  if (code === "HELP_VIDEO_ARTICLE_GENERATION_EMPTY") {
    return "A OpenAI não retornou o artigo estruturado. Tente processar o vídeo novamente.";
  }
  if (code === "HELP_VIDEO_ARTICLE_GENERATION_INVALID_JSON") {
    return "A OpenAI retornou um artigo estruturado inválido. Tente processar o vídeo novamente.";
  }
  if (code === "HELP_VIDEO_ARTICLE_GENERATION_TIMEOUT") {
    return "A análise textual do vídeo pela OpenAI demorou mais que o limite permitido. Tente novamente.";
  }
  if (code === "HELP_VIDEO_SCREENSHOTS_NOT_PLANNED") {
    return "A IA estruturou o artigo, mas não definiu cortes para os passos visuais. O F10 não criou um artigo somente com texto.";
  }
  if (code === "HELP_VIDEO_NO_SCREENSHOTS_SELECTED") {
    return "Os cortes foram planejados, mas o F10 não conseguiu extrair nenhum screenshot válido nas janelas indicadas.";
  }
  if (code === "IMPORT_CONTENT_NOT_CREATED") return "O conteúdo foi analisado, mas o F10 não conseguiu criar o rascunho.";
  if (code === "IMPORT_VIDEO_NOT_CREATED") return "O conteúdo foi criado, mas o F10 não conseguiu salvar o vídeo principal.";
  if (code === "IMPORT_STEP_NOT_CREATED") return "O F10 não conseguiu salvar uma das etapas do conteúdo gerado.";
  if (code === "CONTENT_NOT_FOUND") return "O conteúdo importado não foi encontrado ao salvar o vídeo principal.";
  if (code === "CONTENT_ARCHIVED") return "O conteúdo está arquivado e não pode receber o vídeo principal.";
  if (code.startsWith("HELP_VIDEO_TRANSCRIPTION_FAILED:")) return "A OpenAI não conseguiu transcrever o áudio do vídeo.";
  if (code.startsWith("HELP_VIDEO_ARTICLE_GENERATION_FAILED:")) return "A OpenAI não conseguiu estruturar o artigo a partir do vídeo.";
  if (code.startsWith("HELP_VIDEO_COMMAND_FAILED:")) return "O servidor não conseguiu processar o vídeo com as ferramentas locais.";
  if (code.startsWith("IMPORT_CATEGORY_INVALID:")) return "O conteúdo gerado usou uma categoria que não está mais disponível.";
  if (code.startsWith("IMPORT_SLUG_CONFLICT:")) return "O endereço gerado para o artigo já pertence a outro conteúdo.";
  if (code.startsWith("IMPORT_PACKAGE_ASSET_MISSING:")) return "Um screenshot selecionado não foi encontrado no pacote temporário.";
  if (code === "IMPORT_INVALID_SLUG") return "O F10 não conseguiu gerar um endereço válido para o conteúdo.";
  if (code === "HELP_VIDEO_COMMAND_TIMEOUT") return "O processamento local do vídeo excedeu o tempo permitido.";
  return "Não foi possível gerar o conteúdo automaticamente a partir do vídeo.";
}

function classifyAutomationError(cause: unknown, stage: string): string {
  if (cause instanceof SyntaxError && stage === "analyze") {
    return "HELP_VIDEO_ARTICLE_GENERATION_INVALID_JSON";
  }
  if (cause instanceof Error && cause.name === "AbortError") {
    if (stage === "transcribe") return "HELP_VIDEO_TRANSCRIPTION_TIMEOUT";
    if (stage === "analyze") return "HELP_VIDEO_ARTICLE_GENERATION_TIMEOUT";
  }
  return cause instanceof Error ? cause.message : "HELP_VIDEO_AUTOMATION_FAILED";
}

function technicalErrorCode(code: string): string {
  const prefix = code.split(":", 1)[0]?.trim() ?? "";
  return /^[A-Z][A-Z0-9_]*$/.test(prefix) ? prefix : "HELP_VIDEO_AUTOMATION_FAILED";
}

function buildSource(formData: FormData): HelpVideoAutomationSource {
  const sourceType = readString(formData, "sourceType");
  if (sourceType === "youtube") {
    return { type: "youtube", url: readString(formData, "youtubeUrl") };
  }
  if (sourceType !== "upload") throw new Error("HELP_VIDEO_SOURCE_INVALID");

  const file = formData.get("videoFile");
  if (!(file instanceof File) || file.size === 0) throw new Error("HELP_VIDEO_UPLOAD_FORMAT_INVALID");
  if (file.size > HELP_VIDEO_AUTOMATION_MAX_UPLOAD_BYTES) {
    throw new Error("HELP_VIDEO_UPLOAD_SIZE_INVALID");
  }
  return {
    type: "upload",
    fileName: file.name,
    mimeType: file.type,
    bytes: new Uint8Array(),
    publishedVideoUrl: readString(formData, "publishedVideoUrl"),
  };
}

function normalizeSingleScreenshotPerStep(file: HelpImportFile): void {
  for (const content of file.contents) {
    for (const step of content.steps) {
      let imageFound = false;
      step.blocks = step.blocks.filter((block) => {
        if (block.type !== "image") return true;
        if (imageFound) return false;
        imageFound = true;
        return true;
      });
    }
  }
}

function countScreenshots(file: HelpImportFile): number {
  return file.contents.reduce(
    (contentTotal, content) => contentTotal + content.steps.reduce(
      (stepTotal, step) => stepTotal + step.blocks.filter((block) => block.type === "image").length,
      0,
    ),
    0,
  );
}

export const POST: RequestHandler = async ({ cookies, request }) => {
  const { session } = await requireAppPermission(
    cookies,
    "help.edit",
    "/app/help/content/import",
  );
  const settings = await getHelpVideoAutomationSettings();
  if (!settings.enabled) {
    return json(
      { message: "A geração automática por vídeo está desabilitada pelo administrador." },
      { status: 403 },
    );
  }

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return json({ message: "Não foi possível receber os dados do vídeo." }, { status: 400 });
  }

  let source: HelpVideoAutomationSource;
  try {
    source = buildSource(formData);
    if (source.type === "upload") {
      const file = formData.get("videoFile");
      if (!(file instanceof File)) throw new Error("HELP_VIDEO_UPLOAD_FORMAT_INVALID");
      source.bytes = new Uint8Array(await file.arrayBuffer());
    }
  } catch (cause) {
    const code = cause instanceof Error ? cause.message : "HELP_VIDEO_SOURCE_INVALID";
    return json(
      {
        message: code === "HELP_VIDEO_SOURCE_INVALID"
          ? "Selecione MP4 ou YouTube antes de iniciar o processamento."
          : automationErrorMessage(code),
      },
      { status: 400 },
    );
  }

  const externalIdHint = readString(formData, "externalId");
  const categories = (await listHelpCategories(true))
    .filter((category) => category.active && category.slug !== UNCATEGORIZED_HELP_CATEGORY_SLUG)
    .map((category) => ({
      slug: category.slug,
      name: category.name,
      description: category.description,
    }));

  const encoder = new TextEncoder();
  let streamClosed = false;

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      let lastProgressStage = "runtime";

      const write = (payload: Record<string, unknown>) => {
        if (streamClosed) return;
        try {
          controller.enqueue(encoder.encode(`${JSON.stringify(payload)}\n`));
        } catch {
          streamClosed = true;
        }
      };

      const heartbeat = setInterval(() => {
        if (streamClosed) return;
        try {
          controller.enqueue(encoder.encode("\n"));
        } catch {
          streamClosed = true;
        }
      }, 15_000);

      const progress = (item: HelpVideoAutomationProgress) => {
        lastProgressStage = item.stage;
        write({ type: "progress", ...item });
      };

      try {
        const generated = await generateHelpImportFromVideo({
          source,
          categories,
          externalIdHint,
          onProgress: progress,
          onAiUsage: (usage) => recordHelpAiUsage({
            actorUserId: session.user.id,
            ...usage,
            metadata: { sourceType: source.type },
          }),
        });

        normalizeSingleScreenshotPerStep(generated.file);
        if (source.type === "upload") {
          for (const content of generated.file.contents) content.featuredVideo = undefined;
        }
        const selectedScreenshotCount = countScreenshots(generated.file);

        lastProgressStage = "validate";
        write({
          type: "progress",
          stage: "validate",
          status: "active",
          label: "Validando o conteúdo gerado",
        });
        const validation = validateHelpImportJson(JSON.stringify(generated.file));
        if (!validation.valid || !validation.parsed) {
          write({
            type: "error",
            message: "O conteúdo gerado pela IA não passou na validação final do F10.",
            issues: validation.issues,
          });
          return;
        }
        const stabilizedFile = await stabilizeHelpImportIdentity(validation.parsed);
        write({
          type: "progress",
          stage: "validate",
          status: "done",
          label: "Conteúdo validado e identidade conferida pelo F10",
        });

        lastProgressStage = "import";
        write({
          type: "progress",
          stage: "import",
          status: "active",
          label: "Salvando rascunho, vídeo e opções de screenshots",
        });
        const result = await importStructuredHelpFile(
          session.user.id,
          stabilizedFile,
          generated.assets,
        );
        const importedContent = result.imported[0];
        const content = stabilizedFile.contents[0];
        if (!importedContent || !content) throw new Error("IMPORT_CONTENT_NOT_CREATED");

        if (source.type === "upload") {
          await attachImportedMp4AsFeaturedVideo({
            actorUserId: session.user.id,
            contentId: importedContent.id,
            bytes: source.bytes,
            fileName: source.fileName,
            subtitles: generated.transcript,
            altText: content.summary || content.title,
            assistantSummary: content.quickGuide || content.summary || content.title,
          });
        }

        await replaceHelpScreenshotReviewCandidates(
          session.user.id,
          importedContent.id,
          generated.reviewCandidates,
        );

        write({
          type: "progress",
          stage: "import",
          status: "done",
          label: "Rascunho, vídeo e opções de screenshots salvos",
        });

        const overwriteMessage = result.overwrittenCount > 0
          ? " O conteúdo anterior foi substituído mantendo o mesmo ID."
          : "";
        write({
          type: "success",
          message: `Vídeo processado e ${result.contentCount} conteúdo(s) criado(s) como rascunho.${overwriteMessage} Revise os screenshots, faça as marcações e publique quando estiver correto.`,
          summary: {
            source: result.source,
            contentCount: result.contentCount,
            stepCount: result.stepCount,
            blockCount: result.blockCount,
            assetCount: selectedScreenshotCount,
          },
          automation: {
            sourceType: generated.sourceType,
            transcriptChars: generated.transcriptChars,
            analyzedFrameCount: generated.analyzedFrameCount,
            selectedScreenshotCount,
          },
          imported: result.imported,
        });
      } catch (cause) {
        const code = classifyAutomationError(cause, lastProgressStage);
        const technicalCode = technicalErrorCode(code);
        console.error("[help-video-import] processing failed", {
          stage: lastProgressStage,
          technicalCode,
          cause,
        });
        write({
          type: "error",
          message: automationErrorMessage(code),
          issues: [
            `Etapa: ${lastProgressStage}`,
            `Código técnico: ${technicalCode}`,
          ],
        });
      } finally {
        clearInterval(heartbeat);
        if (!streamClosed) {
          streamClosed = true;
          controller.close();
        }
      }
    },
  });

  return new Response(stream, {
    headers: {
      "content-type": "application/x-ndjson; charset=utf-8",
      "cache-control": "no-store, no-transform",
      "x-accel-buffering": "no",
    },
  });
};