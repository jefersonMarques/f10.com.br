import { error } from "@sveltejs/kit";
import type { LayoutServerLoad } from "./$types";
import { hasPermission } from "$lib/server/auth/permissions";
import { listInternalChats } from "$lib/server/support/internalChatRepository";

export const load: LayoutServerLoad = async ({ parent }) => {
  const layout = await parent();
  const permissions = new Map(
    layout.permissions.map((permission) => [permission.code, permission.scope]),
  );

  if (!hasPermission(permissions, "chat.view")) {
    throw error(403, "Acesso não autorizado.");
  }

  return {
    chatCurrentUserId: layout.user.id,
    chatInbox: await listInternalChats(layout.user.id, permissions),
  };
};
