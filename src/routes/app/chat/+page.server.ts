import { error } from "@sveltejs/kit";
import type { PageServerLoad } from "./$types";
import { hasPermission } from "$lib/server/auth/permissions";
import { listInternalChats } from "$lib/server/support/internalChatRepository";

export const load: PageServerLoad = async ({ parent }) => {
  const layout = await parent();
  const permissions = new Map(
    layout.permissions.map((permission) => [permission.code, permission.scope]),
  );

  if (!hasPermission(permissions, "chat.view")) {
    throw error(403, "Acesso não autorizado.");
  }

  return {
    chats: await listInternalChats(layout.user.id, permissions),
  };
};
