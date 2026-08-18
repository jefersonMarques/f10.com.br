import { error } from "@sveltejs/kit";
import type { PageServerLoad } from "./$types";
import { hasPermission } from "$lib/server/auth/permissions";
import { listInternalChats } from "$lib/server/support/internalChatRepository";
import { listTicketCustomerContexts } from "$lib/server/support/ticketCustomerContextRepository";

export const load: PageServerLoad = async ({ parent }) => {
  const layout = await parent();
  const permissions = new Map(
    layout.permissions.map((permission) => [permission.code, permission.scope]),
  );

  if (!hasPermission(permissions, "chat.view")) {
    throw error(403, "Acesso não autorizado.");
  }

  const chats = await listInternalChats(layout.user.id, permissions);
  const contexts = await listTicketCustomerContexts(chats.map((chat) => chat.ticketId));
  const contextByTicket = new Map(contexts.map((context) => [context.ticketId, context]));

  return {
    currentUserId: layout.user.id,
    chats: chats.map((chat) => ({
      ...chat,
      customerContext: contextByTicket.get(chat.ticketId) ?? null,
    })),
  };
};
