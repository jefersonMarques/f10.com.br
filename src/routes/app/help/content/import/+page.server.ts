import { error, fail } from "@sveltejs/kit";
import type { Actions, PageServerLoad } from "./$types";
import { requireAppPermission } from "$lib/server/auth/authorization";
import { hasPermission } from "$lib/server/auth/permissions";
import {
  importStructuredHelpFile,
  validateHelpImportJson,
} from "$lib/server/help/structuredHelpImport";
import {
  importStructuredHelpPackage,
  validateHelpImportPackage,
} from "$lib/server/help/helpImportPackage";
import { getAssetStorageStatus } from "$lib/server/storage/assetStorage";

const MAX_JSON_BYTES = 5 * 1024 * 1024;
const MAX_ZIP_BYTES = 40 * 1024 * 1024;

function permissionMap(
  permissions: Array<{ code: string; scope: "own" | "team" | "all" }>,
) {
  return new Map(permissions.map((permission) => [permission.code, permission.scope]));
}

function conflictMessage(message: string): string {
  if (message.startsWith("IMPORT_SLUG_CONFLICT:")) return `Já existem conteúdos com estes endereços: ${message.slice("IMPORT_SLUG_CONFLICT:".length)}.`;
  if (message.startsWith("IMPORT_EXTERNAL_ID_CONFLICT:")) return `Este arquivo contém itens já importados desta mesma origem: ${message.slice("IMPORT_EXTERNAL_ID_CONFLICT:".length)}.`;
  if (message === "ASSET_STORAGE_NOT_CONFIGURED") return "O pacote possui arquivos locais, mas o S3/MinIO ainda não está configurado.";
  return "Não foi possível importar o arquivo. Nenhum conteúdo foi alterado.";
}

export const load: PageServerLoad = async ({ parent }) => {
  const layout = await parent();
  const permissions = permissionMap(layout.permissions);
  if (!hasPermission(permissions, "help.view")) throw error(403, "Acesso não autorizado.");
  return {
    canImport: hasPermission(permissions, "help.edit"),
    maxImportBytes: MAX_ZIP_BYTES,
    storage: getAssetStorageStatus(),
  };
};

export const actions: Actions = {
  import: async ({ cookies, request }) => {
    const { session } = await requireAppPermission(cookies, "help.edit", "/app/help/content/import");
    const formData = await request.formData();
    const fileValue = formData.get("file");
    if (!(fileValue instanceof File) || fileValue.size === 0) {
      return fail(400, { success: false, message: "Selecione um arquivo JSON ou ZIP para importar.", issues: [] });
    }

    const lowerName = fileValue.name.toLowerCase();
    const isZip = lowerName.endsWith(".zip");
    const isJson = lowerName.endsWith(".json");
    if (!isZip && !isJson) return fail(400, { success: false, message: "Use um arquivo .json ou .zip.", issues: [] });
    const maxBytes = isZip ? MAX_ZIP_BYTES : MAX_JSON_BYTES;
    if (fileValue.size > maxBytes) return fail(413, { success: false, message: `O arquivo excede o limite de ${Math.round(maxBytes / 1024 / 1024)} MB.`, issues: [] });

    if (isZip) {
      const validation = validateHelpImportPackage(new Uint8Array(await fileValue.arrayBuffer()));
      if (!validation.valid || !validation.manifest) {
        return fail(400, {
          success: false,
          message: "O pacote ZIP não segue o formato de importação do F10.",
          issues: validation.issues,
          summary: { source: validation.source, contentCount: validation.contentCount, stepCount: validation.stepCount, blockCount: validation.blockCount, assetCount: validation.assetCount },
        });
      }
      try {
        const result = await importStructuredHelpPackage(session.user.id, validation);
        return {
          success: true,
          message: `${result.contentCount} conteúdo(s) e ${result.assetCount} referência(s) de mídia/arquivo importados como rascunho.`,
          issues: [],
          summary: { source: result.source, contentCount: result.contentCount, stepCount: result.stepCount, blockCount: result.blockCount, assetCount: result.assetCount },
          imported: result.imported,
        };
      } catch (cause) {
        return fail(409, { success: false, message: conflictMessage(cause instanceof Error ? cause.message : ""), issues: [] });
      }
    }

    const rawJson = await fileValue.text();
    const validation = validateHelpImportJson(rawJson);
    if (!validation.valid || !validation.parsed) {
      return fail(400, {
        success: false,
        message: "O arquivo não segue o formato de importação do F10.",
        issues: validation.issues,
        summary: { source: validation.source, contentCount: validation.contentCount, stepCount: validation.stepCount, blockCount: validation.blockCount, assetCount: 0 },
      });
    }

    try {
      const result = await importStructuredHelpFile(session.user.id, validation.parsed);
      return {
        success: true,
        message: `${result.contentCount} conteúdo(s) importado(s) como rascunho.`,
        issues: [],
        summary: { source: result.source, contentCount: result.contentCount, stepCount: result.stepCount, blockCount: result.blockCount, assetCount: 0 },
        imported: result.imported,
      };
    } catch (cause) {
      return fail(409, {
        success: false,
        message: conflictMessage(cause instanceof Error ? cause.message : ""),
        issues: [],
        summary: { source: validation.source, contentCount: validation.contentCount, stepCount: validation.stepCount, blockCount: validation.blockCount, assetCount: 0 },
      });
    }
  },
};
