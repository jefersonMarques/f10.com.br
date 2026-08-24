import { json } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";
import { UNCATEGORIZED_HELP_CATEGORY_SLUG } from "$lib/help/helpCategoryConstants";
import { requireAppPermission } from "$lib/server/auth/authorization";
import { listHelpCategories } from "$lib/server/help/helpCategoryRepository";
import { stabilizeHelpImportIdentity } from "$lib/server/help/helpImportIdentity";
import { attachImportedMp4AsFeaturedVideo } from "$lib/server/help/helpImportedFeaturedVideo";
import {
  generateHelpImportFromVideo,
  HELP_VIDEO_AUTOMATION_MAX_UPLOAD_BYTES,
  type HelpVideoAutomationProgress,
  type HelpVideoAutomationSource,
} from "$lib/server/help/helpVideoImportAutomation";
import {
  importStructuredHelpFile,
  validateHelpImportJson,
  type HelpImportContent,
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
  if (code === "HELP_VIDEO_NO_SCREENSHOTS_SELECTED") return "A análise não selecionou screenshots suficientes. Tente novamente ou use o fluxo por ZIP.";
  if (code.startsWith("HELP_VIDEO_TRANSCRIPTION_FAILED:")) return "A OpenAI não conseguiu transcrever o áudio do vídeo.";
  if (code.startsWith("HELP_VIDEO_ARTICLE_GENERATION_FAILED:")) return "A OpenAI não conseguiu estruturar o artigo a partir do vídeo.";
  if (code.startsWith("HELP_VIDEO_COMMAND_FAILED:")) return "O servidor não conseguiu processar o vídeo com as ferramentas locais.";
  if (code === "HELP_VIDEO_COMMAND_TIMEOUT") return "O processamento local do vídeo excedeu o tempo permitido.";
  return "Não foi possível gerar o conteúdo automaticamente a partir do vídeo.";
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

function buildFeaturedVideoText(content: HelpImportContent): string {
  return content.steps
    .flatMap((step) => step.blocks.flatMap((block) => block.type === "text" ? [block.text] : []))
    .join("\n\n")
    .trim()
    .slice(0, 200_000);
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
        write({ type: "progress", ...item });
      };

      try {
        const generated = await generateHelpImportFromVideo({
          source,
          categories,
          externalIdHint,
          onProgress: progress,
        });

        normalizeSingleScreenshotPerStep(generated.file);
        if (source.type === "upload") {
          for (const content of generated.file.contents) content.featuredVideo = undefined;
        }
        const selectedScreenshotCount = countScreenshots(generated.file);

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

        write({
          type: "progress",
          stage: "import",
          status: "active",
          label: "Salvando rascunho, vídeo e screenshots",
        });
        const result = await importStructuredHelpFile(
          session.user.id,
          stabilizedFile,
          generated.assets,
        );

        if (source.type === "upload") {
          const importedContent = result.imported[0];
          const content = stabilizedFile.contents[0];
          if (!importedContent || !content) throw new Error("IMPORT_CONTENT_NOT_CREATED");
          await attachImportedMp4AsFeaturedVideo({
            actorUserId: session.user.id,
            contentId: importedContent.id,
            bytes: source.bytes,
            fileName: source.fileName,
            subtitles: buildFeaturedVideoText(content),
            altText: content.summary || content.title,
            assistantSummary: content.quickGuide || content.summary || content.title,
          });
        }

        write({
          type: "progress",
          stage: "import",
          status: "done",
          label: "Rascunho, vídeo e screenshots salvos",
        });

        const overwriteMessage = result.overwrittenCount > 0
          ? " O conteúdo anterior foi substituído mantendo o mesmo ID."
          : "";
        write({
          type: "success",
          message: `Vídeo processado e ${result.contentCount} conteúdo(s) criado(s) como rascunho.${overwriteMessage} Revise as categorias e marcações antes de publicar.`,
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
        const code = cause instanceof Error ? cause.message : "HELP_VIDEO_AUTOMATION_FAILED";
        write({ type: "error", message: automationErrorMessage(code), issues: [] });
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