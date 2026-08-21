import { json } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";
import { requireAppPermission } from "$lib/server/auth/authorization";
import {
  createManagedHelpAsset,
  deleteManagedHelpAsset,
} from "$lib/server/help/helpAssetRepository";
import { replaceHelpTrainingStepImage } from "$lib/server/help/helpTrainingImageAttachment";
import { getHelpTrainingPath } from "$lib/server/help/helpTrainingRepository";

const ALLOWED_IMAGE_MIME_TYPES = new Set([
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/gif",
]);

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

function readString(formData: FormData, name: string): string {
  const value = formData.get(name);
  return typeof value === "string" ? value.trim() : "";
}

function uploadErrorMessage(cause: unknown): string {
  const code = cause instanceof Error ? cause.message : "ASSET_UPLOAD_FAILED";
  if (code === "ASSET_STORAGE_NOT_CONFIGURED") return "O armazenamento de arquivos não está configurado.";
  if (code === "ASSET_MIME_NOT_ALLOWED") return "Use uma imagem PNG, JPG, WEBP ou GIF.";
  if (code === "ASSET_SIZE_NOT_ALLOWED") return "A imagem deve ter no máximo 10 MB.";
  if (code === "ASSET_CONTENT_MISMATCH") return "O conteúdo do arquivo não corresponde ao formato da imagem.";
  if (code === "TRAINING_STEP_NOT_FOUND") return "A microação selecionada não está mais disponível.";
  return "Não foi possível enviar a imagem.";
}

export const POST: RequestHandler = async ({ cookies, params, request }) => {
  const pathId = params.pathId ?? "";
  const stepId = params.stepId ?? "";
  if (!isUuid(pathId) || !isUuid(stepId)) {
    return json({ success: false, message: "Trilha ou microação inválida." }, { status: 400 });
  }

  const { session } = await requireAppPermission(
    cookies,
    "help.edit",
    `/app/help/trilhas/${pathId}`,
  );

  const path = await getHelpTrainingPath(pathId);
  if (!path || path.status === "archived" || !path.steps.some((step) => step.id === stepId)) {
    return json({ success: false, message: "A microação não pertence a uma trilha editável." }, { status: 400 });
  }

  const formData = await request.formData();
  const altText = readString(formData, "altText");
  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return json({ success: false, message: "Selecione uma imagem válida." }, { status: 400 });
  }
  if (!ALLOWED_IMAGE_MIME_TYPES.has(file.type.toLowerCase())) {
    return json({ success: false, message: "Use uma imagem PNG, JPG, WEBP ou GIF." }, { status: 400 });
  }

  let createdAssetId: string | null = null;
  let reused = false;
  try {
    const result = await createManagedHelpAsset(session.user.id, {
      fileName: file.name || "print-treinamento",
      mimeType: file.type,
      bytes: new Uint8Array(await file.arrayBuffer()),
      altText: altText.slice(0, 500),
      contentId: null,
    });
    createdAssetId = result.asset.id;
    reused = result.reused;
    await replaceHelpTrainingStepImage(
      session.user.id,
      pathId,
      stepId,
      result.asset.id,
      altText,
    );

    return json({
      success: true,
      assetId: result.asset.id,
      reused,
      message: reused
        ? "Imagem da Biblioteca definida como referência principal deste passo."
        : "Imagem principal deste passo atualizada.",
    });
  } catch (cause) {
    if (createdAssetId && !reused) {
      await deleteManagedHelpAsset(session.user.id, createdAssetId).catch(() => undefined);
    }
    return json({ success: false, message: uploadErrorMessage(cause) }, { status: 400 });
  }
};
