import { error, fail, type Actions } from "@sveltejs/kit";
import type { PageServerLoad } from "./$types";
import { requireAppPermission } from "$lib/server/auth/authorization";
import { hasPermission } from "$lib/server/auth/permissions";
import {
  createManagedHelpAsset,
  deleteManagedHelpAsset,
  listManagedHelpAssets,
} from "$lib/server/help/helpAssetRepository";
import {
  attachHelpAssetToStep,
  listHelpAssetAttachmentTargets,
} from "$lib/server/help/helpAssetAttachment";
import { getAssetStorageStatus } from "$lib/server/storage/assetStorage";

function readString(formData: FormData, name: string): string {
  const value = formData.get(name);
  return typeof value === "string" ? value.trim() : "";
}
function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

export const load: PageServerLoad = async ({ parent }) => {
  const layout = await parent();
  const permissions = new Map(layout.permissions.map((permission) => [permission.code, permission.scope]));
  if (!hasPermission(permissions, "help.view")) throw error(403, "Acesso não autorizado.");
  const canEdit = hasPermission(permissions, "help.edit");

  return {
    assets: await listManagedHelpAssets(),
    targets: canEdit ? await listHelpAssetAttachmentTargets() : [],
    storage: getAssetStorageStatus(),
    canEdit,
  };
};

export const actions: Actions = {
  upload: async ({ cookies, request }) => {
    const { session } = await requireAppPermission(cookies, "help.edit", "/app/help/assets");
    const formData = await request.formData();
    const file = formData.get("file");
    if (!(file instanceof File) || file.size === 0) {
      return fail(400, { success: false, action: "upload", message: "Selecione um arquivo válido." });
    }

    try {
      const result = await createManagedHelpAsset(session.user.id, {
        fileName: file.name,
        mimeType: file.type || "application/octet-stream",
        bytes: new Uint8Array(await file.arrayBuffer()),
        altText: readString(formData, "altText"),
        aiSummary: readString(formData, "aiSummary"),
      });
      return {
        success: true,
        action: "upload",
        message: result.reused ? "O arquivo já existia e foi reutilizado." : "Arquivo enviado para a biblioteca.",
      };
    } catch (cause) {
      const code = cause instanceof Error ? cause.message : "ASSET_UPLOAD_FAILED";
      const message = code === "ASSET_STORAGE_NOT_CONFIGURED"
        ? "Configure o armazenamento S3/MinIO antes de enviar arquivos."
        : code === "ASSET_MIME_NOT_ALLOWED"
          ? "Formato de arquivo não permitido."
          : code === "ASSET_SIZE_NOT_ALLOWED"
            ? "O arquivo excede o limite permitido."
            : code === "ASSET_CONTENT_MISMATCH"
              ? "O conteúdo do arquivo não corresponde ao formato informado."
              : "Não foi possível enviar o arquivo.";
      return fail(400, { success: false, action: "upload", message });
    }
  },

  attach: async ({ cookies, request }) => {
    const { session } = await requireAppPermission(cookies, "help.edit", "/app/help/assets");
    const formData = await request.formData();
    const assetId = readString(formData, "assetId");
    const stepId = readString(formData, "stepId");
    const label = readString(formData, "label");
    if (!isUuid(assetId) || !isUuid(stepId)) {
      return fail(400, { success: false, action: "attach", message: "Selecione um conteúdo e passo válidos." });
    }
    try {
      await attachHelpAssetToStep(session.user.id, assetId, stepId, label);
      return { success: true, action: "attach", message: "Arquivo adicionado ao passo. O conteúdo voltou para rascunho até nova publicação." };
    } catch {
      return fail(409, { success: false, action: "attach", message: "Não foi possível vincular o arquivo ao passo." });
    }
  },

  delete: async ({ cookies, request }) => {
    const { session } = await requireAppPermission(cookies, "help.edit", "/app/help/assets");
    const formData = await request.formData();
    const assetId = readString(formData, "assetId");
    try {
      await deleteManagedHelpAsset(session.user.id, assetId);
      return { success: true, action: "delete", message: "Arquivo removido da biblioteca." };
    } catch (cause) {
      return fail(409, {
        success: false,
        action: "delete",
        message: cause instanceof Error && cause.message === "ASSET_IN_USE"
          ? "Este arquivo está sendo usado em um rascunho ou publicação e não pode ser removido."
          : "Não foi possível remover o arquivo.",
      });
    }
  },
};
