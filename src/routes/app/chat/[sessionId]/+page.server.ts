import { error, type PageServerLoad } from "@sveltejs/kit";
import { hasPermission } from "$lib/server/auth/permissions";
import { listInternalChatMessages } from "$lib/server/support/internalChatRepository";

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value,
  );
}

export const load: PageServerLoad = async ({ params, parent }) => {
  if (!isUuid(params.sessionId)) {
    throw error(404, "Conversa não encontrada.");
  }

  const layout = await parent();
  const permissions = new Map(
    layout.permissions.map((permission) => [permission.code, permission.scope]),
  );

  if (!hasPermission(permissions, "chat.view")) {
    throw error(403, "Acesso não autorizado.");
  }

  try {
    return {
      initial: await listInternalChatMessages(
        layout.user.id,
        permissions,
        params.sessionId,
      ),
      canRespond: hasPermission(permissions, "chat.respond"),
    };
  } catch {
    throw error(404, "Conversa não encontrada ou fora do seu escopo.");
  }
};
