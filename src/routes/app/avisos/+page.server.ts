import { error, fail, type Actions } from "@sveltejs/kit";
import type { PageServerLoad } from "./$types";
import { requireAppPermission } from "$lib/server/auth/authorization";
import { hasPermission } from "$lib/server/auth/permissions";
import {
  createIframeF10Notice,
  deleteIframeF10Notice,
  listIframeF10Notices,
  setIframeF10NoticeActive,
  type IframeF10NoticeSeverity,
} from "$lib/server/iframeF10/noticeRepository";

function read(formData: FormData, name: string): string {
  const value = formData.get(name);
  return typeof value === "string" ? value.trim() : "";
}

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

function parseDate(value: string): Date | null {
  if (!value) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function severity(value: string): IframeF10NoticeSeverity {
  return value === "critical" || value === "warning" ? value : "info";
}

export const load: PageServerLoad = async ({ parent }) => {
  const layout = await parent();
  const permissions = new Map(layout.permissions.map((item) => [item.code, item.scope]));
  if (!hasPermission(permissions, "help.view")) throw error(403, "Acesso não autorizado.");
  return {
    notices: await listIframeF10Notices(),
    canEdit: hasPermission(permissions, "help.edit"),
  };
};

export const actions: Actions = {
  create: async ({ cookies, request }) => {
    const { session } = await requireAppPermission(cookies, "help.edit", "/app/avisos");
    const formData = await request.formData();
    const title = read(formData, "title");
    const message = read(formData, "message");
    const startsRaw = read(formData, "startsAt");
    const parsedStartsAt = startsRaw ? parseDate(startsRaw) : null;
    const expiresRaw = read(formData, "expiresAt");
    const expiresAt = parseDate(expiresRaw);

    if (
      title.length < 4 ||
      title.length > 120 ||
      message.length < 4 ||
      message.length > 2000 ||
      (startsRaw && !parsedStartsAt) ||
      !expiresAt
    ) {
      return fail(400, { success: false, message: "Informe os dados do aviso e uma data/hora de término." });
    }

    const startsAt = parsedStartsAt ?? new Date();
    if (expiresAt.getTime() <= startsAt.getTime()) {
      return fail(400, { success: false, message: "O término precisa ser posterior ao início." });
    }

    await createIframeF10Notice(session.user.id, {
      title,
      message,
      severity: severity(read(formData, "severity")),
      startsAt,
      expiresAt,
      active: true,
      requiresAcknowledgement: formData.get("requiresAcknowledgement") === "on",
    });
    return { success: true, message: "Aviso criado." };
  },

  toggle: async ({ cookies, request }) => {
    const { session } = await requireAppPermission(cookies, "help.edit", "/app/avisos");
    const formData = await request.formData();
    const noticeId = read(formData, "noticeId");
    if (!isUuid(noticeId)) return fail(400, { success: false, message: "Aviso inválido." });
    await setIframeF10NoticeActive(session.user.id, noticeId, read(formData, "active") === "true");
    return { success: true };
  },

  delete: async ({ cookies, request }) => {
    await requireAppPermission(cookies, "help.edit", "/app/avisos");
    const noticeId = read(await request.formData(), "noticeId");
    if (!isUuid(noticeId)) return fail(400, { success: false, message: "Aviso inválido." });
    await deleteIframeF10Notice(noticeId);
    return { success: true };
  },
};
