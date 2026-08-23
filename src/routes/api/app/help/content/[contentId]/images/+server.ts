import { json } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";
import { requireAppPermission } from "$lib/server/auth/authorization";
import {
  createManagedHelpAsset,
  deleteManagedHelpAsset,
} from "$lib/server/help/helpAssetRepository";
import { attachHelpAssetToStep } from "$lib/server/help/helpAssetAttachment";
import { getStructuredHelpContent } from "$lib/server/help/structuredHelpRepository";

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
  if (code === "ASSET_ATTACHMENT_NOT_FOUND") return "O passo selecionado não está mais disponível.";
  return "Não foi possível enviar a imagem.";
}

export const POST: RequestHandler = async ({ cookies, params, request }) => {
  if (!isUuid(params.contentId)) {
    return json({ success: false, message: "Conteúdo inválido." }, { status: 400 });
  }

  const { session } = await requireAppPermission(
    cookies,
    "help.edit",
    `/app/help/content/${params.contentId}`,
  );

  const formData = await request.formData();
  const stepId = readString(formData, "stepId");
  const altText = readString(formData, "altText");
  const assistantDescription = readString(formData, "assistantDescription");
  const file = formData.get("file");

  if (!isUuid(stepId) || !(file instanceof File) || file.size === 0) {
    return json({ success: false, message: "Selecione uma imagem válida." }, { status: 400 });
  }
  if (!ALLOWED_IMAGE_MIME_TYPES.has(file.type.toLowerCase())) {
    return json({ success: false, message: "Use uma imagem PNG, JPG, WEBP ou GIF." }, { status: 400 });
  }
  if (altText.length > 500 || assistantDescription.length > 20_000) {
    return json({ success: false, message: "Revise a descrição da imagem." }, { status: 400 });
  }

  const content = await getStructuredHelpContent(params.contentId);
  if (!content || !content.steps.some((step) => step.id === stepId)) {
    return json({ success: false, message: "O passo selecionado não pertence a este conteúdo." }, { status: 400 });
  }

  let createdAssetId: string | null = null;
  let reused = false;

  try {
    const result = await createManagedHelpAsset(session.user.id, {
      fileName: file.name || "imagem-colada",
      mimeType: file.type,
      bytes: new Uint8Array(await file.arrayBuffer()),
      altText: altText.slice(0, 500),
      assistantDescription: assistantDescription.slice(0, 20_000),
      contentId: params.contentId,
    });

    createdAssetId = result.asset.id;
    reused = result.reused;
    await attachHelpAssetToStep(session.user.id, result.asset.id, stepId, "");

    return json({
      success: true,
      assetId: result.asset.id,
      reused,
      message: reused
        ? "Imagem existente reutilizada e adicionada ao passo."
        : "Imagem enviada e adicionada ao passo.",
    });
  } catch (cause) {
    if (createdAssetId && !reused) {
      await deleteManagedHelpAsset(session.user.id, createdAssetId).catch(() => undefined);
    }
    return json({ success: false, message: uploadErrorMessage(cause) }, { status: 400 });
  }
};
