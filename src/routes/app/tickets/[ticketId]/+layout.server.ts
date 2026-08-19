import { eq } from "drizzle-orm";
import { error } from "@sveltejs/kit";
import type { LayoutServerLoad } from "./$types";
import {
  getPermissionScope,
  hasPermission,
  type PermissionScope,
} from "$lib/server/auth/permissions";
import { getDatabase } from "$lib/server/db";
import { tickets } from "$lib/server/db/supportSchema";
import {
  getUserSupportQueueIds,
  requireTicketAccess,
} from "$lib/server/support/supportAccess";
import { getTicketWorkflowContext } from "$lib/server/support/ticketWorkflowRepository";

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

function permissionMap(
  permissions: Array<{ code: string; scope: PermissionScope }>,
): Map<string, PermissionScope> {
  return new Map(permissions.map((permission) => [permission.code, permission.scope]));
}

export const load: LayoutServerLoad = async ({ parent, params }) => {
  if (!isUuid(params.ticketId)) throw error(404, "Ticket não encontrado.");

  const layout = await parent();
  const permissions = permissionMap(layout.permissions);
  if (!hasPermission(permissions, "tickets.view")) throw error(403, "Acesso não autorizado.");

  const scope = getPermissionScope(permissions, "tickets.view");
  if (!scope) throw error(403, "Acesso não autorizado.");

  await requireTicketAccess(layout.user.id, scope, params.ticketId);
  const workflowContext = await getTicketWorkflowContext(params.ticketId);
  if (!workflowContext?.areaWorkflowId || scope === "all") {
    return { workflowContext };
  }

  const db = getDatabase();
  const [ticket] = await db
    .select({ queueId: tickets.queueId })
    .from(tickets)
    .where(eq(tickets.id, params.ticketId))
    .limit(1);
  if (!ticket) throw error(404, "Ticket não encontrado.");

  const queueIds = await getUserSupportQueueIds(layout.user.id);
  if (queueIds.includes(ticket.queueId)) {
    return { workflowContext };
  }

  return {
    workflowContext: {
      ...workflowContext,
      areaWorkflowId: null,
      areaStageId: null,
      areaEnteredAt: null,
      areaWorkflowName: null,
      areaName: null,
      areaStageName: null,
      areaStageType: null,
    },
  };
};
