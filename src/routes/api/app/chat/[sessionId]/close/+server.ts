import { error, json, type RequestHandler } from "@sveltejs/kit";
import { requireAppPermission } from "$lib/server/auth/authorization";
import { finishInternalChat } from "$lib/server/support/chatLifecycleRepository";

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

export const POST: RequestHandler = async ({ cookies, params, url }) => {
  if (!isUuid(params.sessionId)) throw error(404, "Conversa não encontrada.");

  const { session, permissions } = await requireAppPermission(
    cookies,
    "chat.respond",
    url.pathname,
  );

  try {
    await finishInternalChat(session.user.id, permissions, params.sessionId);
    return json({ success: true });
  } catch (cause) {
    const message = cause instanceof Error ? cause.message : "";
    if (message === "CHAT_ASSIGNED_TO_OTHER_USER") {
      throw error(409, "Este atendimento está atribuído a outro usuário.");
    }
    if (message === "CHAT_NOT_FOUND") {
      throw error(404, "Conversa não encontrada ou já finalizada.");
    }
    throw error(403, "Não foi possível finalizar este atendimento.");
  }
};
