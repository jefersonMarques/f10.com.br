import { error, fail } from "@sveltejs/kit";
import type { Actions, PageServerLoad } from "./$types";
import { requireAppPermission } from "$lib/server/auth/authorization";
import { hasPermission } from "$lib/server/auth/permissions";
import { listHelpCategories } from "$lib/server/help/helpCategoryRepository";
import {
  importStructuredHelpFile,
  validateHelpImportJson,
  type HelpImportFile,
} from "$lib/server/help/structuredHelpImport";

const MAX_JSON_BYTES = 5 * 1024 * 1024;
const TEMPLATE_PLACEHOLDER_PATTERN = /\bREPLACE_[A-Z0-9_]+\b/;

function permissionMap(
  permissions: Array<{ code: string; scope: "own" | "team" | "all" }>,
) {
  return new Map(permissions.map((permission) => [permission.code, permission.scope]));
}

function conflictMessage(message: string): string {
  if (message.startsWith("IMPORT_SLUG_CONFLICT:")) {
    return `Já existem conteúdos com estes endereços: ${message.slice("IMPORT_SLUG_CONFLICT:".length)}.`;
  }
  if (message.startsWith("IMPORT_EXTERNAL_ID_CONFLICT:")) {
    return `Este arquivo contém itens já importados desta mesma origem: ${message.slice("IMPORT_EXTERNAL_ID_CONFLICT:".length)}.`;
  }
  if (message.startsWith("IMPORT_CATEGORY_INVALID:")) {
    return `Estas categorias não existem ou estão inativas: ${message.slice("IMPORT_CATEGORY_INVALID:".length)}. Atualize o prompt e gere o JSON novamente.`;
  }
  return "Não foi possível importar o arquivo. Nenhum conteúdo foi alterado.";
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
    maxImportBytes: MAX_JSON_BYTES,
    categories: await listHelpCategories(true),
  };
};

export const actions: Actions = {
  import: async ({ cookies, request }) => {
    const { session } = await requireAppPermission(
      cookies,
      "help.edit",
      "/app/help/content/import",
    );
    const fileValue = (await request.formData()).get("file");
    if (!(fileValue instanceof File) || fileValue.size === 0) {
      return fail(400, {
        success: false,
        message: "Selecione o JSON gerado pela IA.",
        issues: [],
      });
    }
    if (!fileValue.name.toLowerCase().endsWith(".json")) {
      return fail(400, {
        success: false,
        message: "Use um arquivo .json no formato F10 Help Import.",
        issues: [],
      });
    }
    if (fileValue.size > MAX_JSON_BYTES) {
      return fail(413, {
        success: false,
        message: `O arquivo excede o limite de ${Math.round(MAX_JSON_BYTES / 1024 / 1024)} MB.`,
        issues: [],
      });
    }

    const rawJson = await fileValue.text();
    if (TEMPLATE_PLACEHOLDER_PATTERN.test(rawJson)) {
      return fail(400, {
        success: false,
        message: "O JSON ainda contém placeholders do template. Gere o conteúdo final antes de importar.",
        issues: ["Substitua ou remova todos os valores REPLACE_* do template."],
      });
    }

    const validation = validateHelpImportJson(rawJson);
    if (!validation.valid || !validation.parsed) {
      return fail(400, {
        success: false,
        message: "O arquivo não segue o contrato atual de importação do F10.",
        issues: validation.issues,
        summary: {
          source: validation.source,
          contentCount: validation.contentCount,
          stepCount: validation.stepCount,
          blockCount: validation.blockCount,
          assetCount: 0,
        },
      });
    }

    const assetCount = countJsonAssets(validation.parsed);
    try {
      const result = await importStructuredHelpFile(session.user.id, validation.parsed);
      return {
        success: true,
        message: `${result.contentCount} conteúdo(s) importado(s) como rascunho. Revise antes de publicar.`,
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
