import { error, fail, type Actions } from "@sveltejs/kit";
import type { PageServerLoad } from "./$types";
import { requireAppPermission } from "$lib/server/auth/authorization";
import { hasPermission } from "$lib/server/auth/permissions";
import {
  createIframeF10Update,
  deleteIframeF10Update,
  listIframeF10UpdatesAdmin,
  updateIframeF10Update,
  type IframeF10CoverInput,
} from "$lib/server/iframeF10/updateRepository";

function read(formData: FormData, name: string): string {
  const value = formData.get(name);
  return typeof value === "string" ? value.trim() : "";
}

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

function parseOptionalDate(value: string): Date | null {
  if (!value) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

async function coverInput(formData: FormData): Promise<IframeF10CoverInput | null> {
  const file = formData.get("cover");
  if (!(file instanceof File) || file.size === 0) return null;
  return {
    fileName: file.name,
    mimeType: file.type || "application/octet-stream",
    bytes: new Uint8Array(await file.arrayBuffer()),
  };
}

function validate(title: string, bodyMarkdown: string, expiresRaw: string, expiresAt: Date | null) {
  if (title.length < 4 || title.length > 160) return "Informe um título entre 4 e 160 caracteres.";
  if (bodyMarkdown.length < 4 || bodyMarkdown.length > 50_000) return "O texto deve ter entre 4 e 50.000 caracteres.";
  if (expiresRaw && !expiresAt) return "Informe uma validade válida.";
  if (expiresAt && expiresAt.getTime() <= Date.now()) return "A validade precisa estar no futuro.";
  return "";
}

function coverError(cause: unknown): string {
  const code = cause instanceof Error ? cause.message : "";
  if (code === "UPDATE_COVER_TYPE_INVALID") return "A capa deve ser PNG, JPG ou WebP.";
  if (code === "UPDATE_COVER_SIZE_INVALID") return "A capa deve ter no máximo 8 MB.";
  if (code === "UPDATE_COVER_CONTENT_INVALID") return "O arquivo da capa é inválido.";
  if (code === "ASSET_STORAGE_NOT_CONFIGURED") return "Configure o armazenamento S3/MinIO antes de enviar a capa.";
  return "Não foi possível salvar a novidade.";
}

export const load: PageServerLoad = async ({ parent }) => {
  const layout = await parent();
  const permissions = new Map(layout.permissions.map((item) => [item.code, item.scope]));
  if (!hasPermission(permissions, "help.view")) throw error(403, "Acesso não autorizado.");
  return {
    updates: await listIframeF10UpdatesAdmin(),
    canEdit: hasPermission(permissions, "help.edit"),
  };
};

export const actions: Actions = {
  create: async ({ cookies, request }) => {
    const { session } = await requireAppPermission(cookies, "help.edit", "/app/novidades");
    const formData = await request.formData();
    const title = read(formData, "title");
    const bodyMarkdown = read(formData, "bodyMarkdown");
    const expiresRaw = read(formData, "expiresAt");
    const expiresAt = parseOptionalDate(expiresRaw);
    const message = validate(title, bodyMarkdown, expiresRaw, expiresAt);
    if (message) return fail(400, { success: false, message });

    try {
      await createIframeF10Update(
        session.user.id,
        {
          title,
          bodyMarkdown,
          pinned: formData.has("pinned"),
          active: formData.has("active"),
          expiresAt,
        },
        await coverInput(formData),
      );
      return { success: true, message: "Novidade criada." };
    } catch (cause) {
      return fail(400, { success: false, message: coverError(cause) });
    }
  },

  update: async ({ cookies, request }) => {
    const { session } = await requireAppPermission(cookies, "help.edit", "/app/novidades");
    const formData = await request.formData();
    const updateId = read(formData, "updateId");
    if (!isUuid(updateId)) return fail(400, { success: false, message: "Novidade inválida." });

    const title = read(formData, "title");
    const bodyMarkdown = read(formData, "bodyMarkdown");
    const expiresRaw = read(formData, "expiresAt");
    const expiresAt = parseOptionalDate(expiresRaw);
    const message = validate(title, bodyMarkdown, expiresRaw, expiresAt);
    if (message) return fail(400, { success: false, message });

    try {
      await updateIframeF10Update(
        session.user.id,
        updateId,
        {
          title,
          bodyMarkdown,
          pinned: formData.has("pinned"),
          active: formData.has("active"),
          expiresAt,
        },
        await coverInput(formData),
        formData.has("removeCover"),
      );
      return { success: true, message: "Novidade atualizada." };
    } catch (cause) {
      return fail(400, { success: false, message: coverError(cause) });
    }
  },

  delete: async ({ cookies, request }) => {
    const { session } = await requireAppPermission(cookies, "help.edit", "/app/novidades");
    const updateId = read(await request.formData(), "updateId");
    if (!isUuid(updateId)) return fail(400, { success: false, message: "Novidade inválida." });
    await deleteIframeF10Update(session.user.id, updateId);
    return { success: true, message: "Novidade excluída." };
  },
};
