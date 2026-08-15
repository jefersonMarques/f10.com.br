import { error, fail } from "@sveltejs/kit";
import type { Actions, PageServerLoad } from "./$types";
import { requireAppPermission } from "$lib/server/auth/authorization";
import { hasPermission } from "$lib/server/auth/permissions";
import {
  importStructuredHelpFile,
  validateHelpImportJson,
} from "$lib/server/help/structuredHelpImport";

const MAX_IMPORT_BYTES = 5 * 1024 * 1024;

function permissionMap(
  permissions: Array<{ code: string; scope: "own" | "team" | "all" }>,
) {
  return new Map(
    permissions.map((permission) => [permission.code, permission.scope]),
  );
}

function conflictMessage(message: string): string {
  if (message.startsWith("IMPORT_SLUG_CONFLICT:")) {
    return `Já existem conteúdos com estes endereços: ${message.slice("IMPORT_SLUG_CONFLICT:".length)}.`;
  }
  if (message.startsWith("IMPORT_EXTERNAL_ID_CONFLICT:")) {
    return `Este arquivo contém itens já importados desta mesma origem: ${message.slice("IMPORT_EXTERNAL_ID_CONFLICT:".length)}.`;
  }
  return "Não foi possível importar o arquivo. Nenhum conteúdo foi alterado.";
}

export const load: PageServerLoad = async ({ parent }) => {
  const layout = await parent();
  const permissions = permissionMap(layout.permissions);

  if (!hasPermission(permissions, "help.view")) {
    throw error(403, "Acesso não autorizado.");
  }

  return {
    canImport: hasPermission(permissions, "help.edit"),
    maxImportBytes: MAX_IMPORT_BYTES,
  };
};

export const actions: Actions = {
  import: async ({ cookies, request }) => {
    const { session } = await requireAppPermission(
      cookies,
      "help.edit",
      "/app/help/content/import",
    );
    const formData = await request.formData();
    const fileValue = formData.get("file");

    if (!(fileValue instanceof File) || fileValue.size === 0) {
      return fail(400, {
        success: false,
        message: "Selecione um arquivo JSON para importar.",
        issues: [],
      });
    }

    if (fileValue.size > MAX_IMPORT_BYTES) {
      return fail(413, {
        success: false,
        message: "O arquivo de importação deve ter no máximo 5 MB.",
        issues: [],
      });
    }

    const extension = fileValue.name.toLowerCase();
    if (!extension.endsWith(".json")) {
      return fail(400, {
        success: false,
        message: "O arquivo de importação precisa usar a extensão .json.",
        issues: [],
      });
    }

    let rawJson = "";
    try {
      rawJson = await fileValue.text();
    } catch {
      return fail(400, {
        success: false,
        message: "Não foi possível ler o arquivo enviado.",
        issues: [],
      });
    }

    const validation = validateHelpImportJson(rawJson);
    if (!validation.valid || !validation.parsed) {
      return fail(400, {
        success: false,
        message: "O arquivo não segue o formato de importação do F10.",
        issues: validation.issues,
        summary: {
          source: validation.source,
          contentCount: validation.contentCount,
          stepCount: validation.stepCount,
          blockCount: validation.blockCount,
        },
      });
    }

    try {
      const result = await importStructuredHelpFile(
        session.user.id,
        validation.parsed,
      );

      return {
        success: true,
        message: `${result.contentCount} conteúdo(s) importado(s) como rascunho.`,
        issues: [],
        summary: {
          source: result.source,
          contentCount: result.contentCount,
          stepCount: result.stepCount,
          blockCount: result.blockCount,
        },
        imported: result.imported,
      };
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : "";
      return fail(409, {
        success: false,
        message: conflictMessage(message),
        issues: [],
        summary: {
          source: validation.source,
          contentCount: validation.contentCount,
          stepCount: validation.stepCount,
          blockCount: validation.blockCount,
        },
      });
    }
  },
};
