import { error, fail } from "@sveltejs/kit";
import type { Actions, PageServerLoad } from "./$types";
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

const TEMPLATE_PLACEHOLDER_PATTERN = /\bREPLACE_[A-Z0-9_]+\b/;

function permissionMap(
  permissions: Array<{ code: string; scope: "own" | "team" | "all" }>,
) {
  return new Map(permissions.map((permission) => [permission.code, permission.scope]));
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
  return {
    canImport: hasPermission(permissions, "help.edit"),
    maxImportBytes: MAX_HELP_IMPORT_PACKAGE_BYTES,
    categories: await listHelpCategories(true),
  };
};

export const actions: Actions = {
  import: async ({ cookies, request }) => {
    const { session } = await requireAppPermission(cookies, "help.edit", "/app/help/content/import");
    const fileValue = (await request.formData()).get("file");
    if (!(fileValue instanceof File) || fileValue.size === 0) {
      return fail(400, { success: false, message: "Selecione o ZIP gerado pela IA.", issues: [] });
    }
    if (!fileValue.name.toLowerCase().endsWith(".zip")) {
      return fail(400, { success: false, message: "Use um arquivo .zip no formato F10 Help Import.", issues: [] });
    }
    if (fileValue.size > MAX_HELP_IMPORT_PACKAGE_BYTES) {
      return fail(413, {
        success: false,
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
        message: "O ZIP não segue a estrutura esperada do F10 Help Import.",
        issues: [cause instanceof Error ? cause.message : "Pacote ZIP inválido."],
      });
    }

    if (packageFile.assets.size === 0) {
      return fail(400, {
        success: false,
        message: "O pacote não contém screenshots do vídeo.",
        issues: ["Capture ao menos uma tela relevante do procedimento e inclua-a em screenshots/ com assetPath correspondente no JSON."],
      });
    }

    if (TEMPLATE_PLACEHOLDER_PATTERN.test(packageFile.jsonText)) {
      return fail(400, {
        success: false,
        message: "O JSON do pacote ainda contém placeholders do template.",
        issues: ["Substitua ou remova todos os valores REPLACE_* antes de gerar o ZIP final."],
      });
    }

    const prepared = prepareHelpImportPackageJson(packageFile.jsonText, packageFile.assets);
    if (prepared.issues.length > 0) {
      return fail(400, {
        success: false,
        message: "O pacote possui inconsistências entre o JSON e os screenshots.",
        issues: prepared.issues,
      });
    }

    const validation = validateHelpImportJson(prepared.jsonText);
    if (!validation.valid || !validation.parsed) {
      return fail(400, {
        success: false,
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

    const assetCount = countJsonAssets(validation.parsed);
    try {
      const result = await importStructuredHelpFile(session.user.id, validation.parsed, packageFile.assets);
      const overwriteMessage = result.overwrittenCount > 0
        ? ` ${result.overwrittenCount} conteúdo(s) anterior(es) foram substituídos mantendo o mesmo ID.`
        : "";
      return {
        success: true,
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
