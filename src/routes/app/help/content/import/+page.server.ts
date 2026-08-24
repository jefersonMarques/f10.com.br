import { error, fail } from "@sveltejs/kit";
import type { Actions, PageServerLoad } from "./$types";
import { UNCATEGORIZED_HELP_CATEGORY_SLUG } from "$lib/help/helpCategoryConstants";
import { requireAppPermission } from "$lib/server/auth/authorization";
import { hasPermission } from "$lib/server/auth/permissions";
import { listHelpCategories } from "$lib/server/help/helpCategoryRepository";
import {
  MAX_HELP_IMPORT_PACKAGE_BYTES,
  parseHelpImportPackage,
  prepareHelpImportPackageJson,
} from "$lib/server/help/helpImportPackage";
import {
  importStructuredHelpFile,
  validateHelpImportJson,
  type HelpImportFile,
} from "$lib/server/help/structuredHelpImport";
import {
  generateHelpImportFromVideo,
  getHelpVideoAutomationRuntimeStatus,
  HELP_VIDEO_AUTOMATION_MAX_UPLOAD_BYTES,
} from "$lib/server/help/helpVideoImportAutomation";
import { getHelpVideoAutomationSettings } from "$lib/server/settings/operationsSettingsRepository";

const TEMPLATE_PLACEHOLDER_PATTERN = /\bREPLACE_[A-Z0-9_]+\b/;

function permissionMap(
  permissions: Array<{ code: string; scope: "own" | "team" | "all" }>,
) {
  return new Map(permissions.map((permission) => [permission.code, permission.scope]));
}

function readString(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function conflictMessage(message: string): string {
  if (message.startsWith("IMPORT_SLUG_CONFLICT:")) {
    return `Já existe outro conteúdo usando estes endereços: ${message.slice("IMPORT_SLUG_CONFLICT:".length)}.`;
  }
  if (message.startsWith("IMPORT_CATEGORY_INVALID:")) {
    return `Estas categorias não existem ou estão inativas: ${message.slice("IMPORT_CATEGORY_INVALID:".length)}. Atualize o prompt e gere o pacote novamente.`;
  }
  if (message.startsWith("IMPORT_PACKAGE_ASSET_MISSING:")) {
    return `Um screenshot referenciado não foi encontrado no pacote: ${message.slice("IMPORT_PACKAGE_ASSET_MISSING:".length)}.`;
  }
  if (message === "ASSET_STORAGE_NOT_CONFIGURED" || message.startsWith("ASSET_STORAGE_PUT_")) {
    return "O armazenamento de assets não está disponível. Configure S3/MinIO antes de importar screenshots.";
  }
  return "Não foi possível importar o pacote. Nenhum conteúdo foi alterado.";
}

function automationErrorMessage(code: string): string {
  if (code === "OPENAI_NOT_CONFIGURED") return "Configure a chave da OpenAI antes de usar a automação.";
  if (code === "HELP_VIDEO_FFMPEG_NOT_AVAILABLE") return "FFmpeg não foi encontrado no servidor. Configure-o antes de processar vídeos.";
  if (code === "HELP_VIDEO_YTDLP_NOT_AVAILABLE") return "yt-dlp não foi encontrado no servidor. O modo .mp4 continua disponível.";
  if (code === "HELP_VIDEO_YOUTUBE_URL_INVALID") return "Informe um link válido do YouTube.";
  if (code === "HELP_VIDEO_UPLOAD_SIZE_INVALID") return `O vídeo deve ter no máximo ${Math.round(HELP_VIDEO_AUTOMATION_MAX_UPLOAD_BYTES / 1024 / 1024)} MB.`;
  if (code === "HELP_VIDEO_UPLOAD_FORMAT_INVALID") return "Use um arquivo .mp4 válido.";
  if (code === "HELP_VIDEO_TRANSCRIPTION_EMPTY") return "A transcrição retornou vazia. Revise o áudio do vídeo.";
  if (code === "HELP_VIDEO_NO_SCREENSHOTS_SELECTED") return "A análise não selecionou screenshots suficientes. Tente novamente ou use o fluxo manual por ZIP.";
  if (code.startsWith("HELP_VIDEO_TRANSCRIPTION_FAILED:")) return "A OpenAI não conseguiu transcrever o áudio do vídeo.";
  if (code.startsWith("HELP_VIDEO_ARTICLE_GENERATION_FAILED:")) return "A OpenAI não conseguiu estruturar o artigo a partir do vídeo.";
  if (code.startsWith("HELP_VIDEO_COMMAND_FAILED:")) return "O servidor não conseguiu processar o vídeo com as ferramentas locais.";
  if (code === "HELP_VIDEO_COMMAND_TIMEOUT") return "O processamento local do vídeo excedeu o tempo permitido.";
  return "Não foi possível gerar o conteúdo automaticamente a partir do vídeo.";
}

function countJsonAssets(file: HelpImportFile): number {
  return file.contents.reduce(
    (contentTotal, content) =>
      contentTotal +
      (content.featuredVideo ? 1 : 0) +
      content.steps.reduce(
        (stepTotal, step) =>
          stepTotal + step.blocks.filter((block) => block.type === "image" || block.type === "file").length,
        0,
      ),
    0,
  );
}

export const load: PageServerLoad = async ({ parent }) => {
  const layout = await parent();
  const permissions = permissionMap(layout.permissions);
  if (!hasPermission(permissions, "help.view")) throw error(403, "Acesso não autorizado.");
  const [categories, videoAutomation, videoRuntime] = await Promise.all([
    listHelpCategories(true),
    getHelpVideoAutomationSettings(),
    getHelpVideoAutomationRuntimeStatus(),
  ]);
  return {
    canImport: hasPermission(permissions, "help.edit"),
    maxImportBytes: MAX_HELP_IMPORT_PACKAGE_BYTES,
    maxVideoBytes: HELP_VIDEO_AUTOMATION_MAX_UPLOAD_BYTES,
    categories,
    videoAutomation,
    videoRuntime,
  };
};

export const actions: Actions = {
  automatic: async ({ cookies, request }) => {
    const { session } = await requireAppPermission(cookies, "help.edit", "/app/help/content/import");
    const settings = await getHelpVideoAutomationSettings();
    if (!settings.enabled) {
      return fail(403, {
        success: false,
        action: "automatic",
        message: "A geração automática por vídeo está desabilitada pelo administrador.",
        issues: [],
      });
    }

    const formData = await request.formData();
    const sourceType = readString(formData, "sourceType");
    const externalIdHint = readString(formData, "externalId");
    const publishedVideoUrl = readString(formData, "publishedVideoUrl");
    const categories = (await listHelpCategories(true))
      .filter((category) => category.active && category.slug !== UNCATEGORIZED_HELP_CATEGORY_SLUG)
      .map((category) => ({
        slug: category.slug,
        name: category.name,
        description: category.description,
      }));

    try {
      const generated = sourceType === "youtube"
        ? await generateHelpImportFromVideo({
            source: { type: "youtube", url: readString(formData, "youtubeUrl") },
            categories,
            externalIdHint,
          })
        : await (async () => {
            const file = formData.get("videoFile");
            if (!(file instanceof File) || file.size === 0) throw new Error("HELP_VIDEO_UPLOAD_FORMAT_INVALID");
            return generateHelpImportFromVideo({
              source: {
                type: "upload",
                fileName: file.name,
                mimeType: file.type,
                bytes: new Uint8Array(await file.arrayBuffer()),
                publishedVideoUrl,
              },
              categories,
              externalIdHint,
            });
          })();

      const validation = validateHelpImportJson(JSON.stringify(generated.file));
      if (!validation.valid || !validation.parsed) {
        return fail(400, {
          success: false,
          action: "automatic",
          message: "O conteúdo gerado pela IA não passou na validação final do F10.",
          issues: validation.issues,
        });
      }

      const result = await importStructuredHelpFile(session.user.id, validation.parsed, generated.assets);
      const overwriteMessage = result.overwrittenCount > 0
        ? " O conteúdo anterior foi substituído mantendo o mesmo ID."
        : "";
      return {
        success: true,
        action: "automatic",
        message: `Vídeo processado e ${result.contentCount} conteúdo(s) criado(s) como rascunho.${overwriteMessage} Revise as categorias e marcações antes de publicar.`,
        issues: [],
        summary: {
          source: result.source,
          contentCount: result.contentCount,
          stepCount: result.stepCount,
          blockCount: result.blockCount,
          assetCount: generated.selectedScreenshotCount,
        },
        automation: {
          sourceType: generated.sourceType,
          transcriptChars: generated.transcriptChars,
          analyzedFrameCount: generated.analyzedFrameCount,
          selectedScreenshotCount: generated.selectedScreenshotCount,
        },
        imported: result.imported,
      };
    } catch (cause) {
      const code = cause instanceof Error ? cause.message : "HELP_VIDEO_AUTOMATION_FAILED";
      return fail(400, {
        success: false,
        action: "automatic",
        message: automationErrorMessage(code),
        issues: [],
      });
    }
  },

  import: async ({ cookies, request }) => {
    const { session } = await requireAppPermission(cookies, "help.edit", "/app/help/content/import");
    const fileValue = (await request.formData()).get("file");
    if (!(fileValue instanceof File) || fileValue.size === 0) {
      return fail(400, { success: false, action: "import", message: "Selecione o ZIP gerado pela IA.", issues: [] });
    }
    if (!fileValue.name.toLowerCase().endsWith(".zip")) {
      return fail(400, { success: false, action: "import", message: "Use um arquivo .zip no formato F10 Help Import.", issues: [] });
    }
    if (fileValue.size > MAX_HELP_IMPORT_PACKAGE_BYTES) {
      return fail(413, {
        success: false,
        action: "import",
        message: `O pacote excede o limite de ${Math.round(MAX_HELP_IMPORT_PACKAGE_BYTES / 1024 / 1024)} MB.`,
        issues: [],
      });
    }

    let packageFile;
    try {
      packageFile = parseHelpImportPackage(new Uint8Array(await fileValue.arrayBuffer()));
    } catch (cause) {
      return fail(400, {
        success: false,
        action: "import",
        message: "O ZIP não segue a estrutura esperada do F10 Help Import.",
        issues: [cause instanceof Error ? cause.message : "Pacote ZIP inválido."],
      });
    }

    if (packageFile.assets.size === 0) {
      return fail(400, {
        success: false,
        action: "import",
        message: "O pacote não contém screenshots do vídeo.",
        issues: ["Capture ao menos uma tela relevante do procedimento e inclua-a em screenshots/ com assetPath correspondente no JSON."],
      });
    }

    if (TEMPLATE_PLACEHOLDER_PATTERN.test(packageFile.jsonText)) {
      return fail(400, {
        success: false,
        action: "import",
        message: "O JSON do pacote ainda contém placeholders do template.",
        issues: ["Substitua ou remova todos os valores REPLACE_* antes de gerar o ZIP final."],
      });
    }

    const prepared = prepareHelpImportPackageJson(packageFile.jsonText, packageFile.assets);
    if (prepared.issues.length > 0) {
      return fail(400, {
        success: false,
        action: "import",
        message: "O pacote possui inconsistências entre o JSON e os screenshots.",
        issues: prepared.issues,
      });
    }

    const validation = validateHelpImportJson(prepared.jsonText);
    if (!validation.valid || !validation.parsed) {
      return fail(400, {
        success: false,
        action: "import",
        message: "O JSON do pacote não segue o contrato atual de importação do F10.",
        issues: validation.issues,
        summary: {
          source: validation.source,
          contentCount: validation.contentCount,
          stepCount: validation.stepCount,
          blockCount: validation.blockCount,
          assetCount: prepared.referencedAssetCount,
        },
      });
    }

    const contentsWithoutQuickGuide = validation.parsed.contents
      .filter((content) => !content.quickGuide?.trim())
      .map((content) => content.title);
    if (contentsWithoutQuickGuide.length > 0) {
      return fail(400, {
        success: false,
        action: "import",
        message: "Todo conteúdo importado a partir de vídeo precisa ter um resumo rápido.",
        issues: contentsWithoutQuickGuide.map(
          (title) => `${title}: preencha quickGuide com os passos essenciais em texto, Markdown e emojis.`,
        ),
        summary: {
          source: validation.source,
          contentCount: validation.contentCount,
          stepCount: validation.stepCount,
          blockCount: validation.blockCount,
          assetCount: prepared.referencedAssetCount,
        },
      });
    }

    const assetCount = countJsonAssets(validation.parsed);
    try {
      const result = await importStructuredHelpFile(session.user.id, validation.parsed, packageFile.assets);
      const overwriteMessage = result.overwrittenCount > 0
        ? ` ${result.overwrittenCount} conteúdo(s) anterior(es) foram substituídos mantendo o mesmo ID.`
        : "";
      return {
        success: true,
        action: "import",
        message: `${result.contentCount} conteúdo(s) importado(s) como rascunho.${overwriteMessage} Revise as categorias reais antes de publicar.`,
        issues: [],
        summary: {
          source: result.source,
          contentCount: result.contentCount,
          stepCount: result.stepCount,
          blockCount: result.blockCount,
          assetCount,
        },
        imported: result.imported,
      };
    } catch (cause) {
      return fail(409, {
        success: false,
        action: "import",
        message: conflictMessage(cause instanceof Error ? cause.message : ""),
        issues: [],
        summary: {
          source: validation.source,
          contentCount: validation.contentCount,
          stepCount: validation.stepCount,
          blockCount: validation.blockCount,
          assetCount,
        },
      });
    }
  },
};
