import { error } from "@sveltejs/kit";
import type { LayoutServerLoad } from "./$types";
import {
  getPermissionScope,
  hasPermission,
  type PermissionScope,
} from "$lib/server/auth/permissions";
import { requireTicketAccess } from "$lib/server/support/supportAccess";
import { markTicketFirstAgentView } from "$lib/server/support/ticketCustomerProgressRepository";
import {
  getTicketWorkflowBoard,
  getTicketWorkflowContext,
} from "$lib/server/support/ticketWorkflowRepository";

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
  const scope = getPermissionScope(permissions, "tickets.view");
  if (!scope) throw error(403, "Acesso não autorizado.");
  await requireTicketAccess(layout.user.id, scope, params.ticketId);

  await markTicketFirstAgentView(layout.user.id, params.ticketId).catch((cause) => {
    console.error("[ticket.customer_progress.first_view]", {
      ticketId: params.ticketId,
      causeType: cause instanceof Error ? cause.name : typeof cause,
    });
  });

  const [workflowContext, workflowBoard] = await Promise.all([
    getTicketWorkflowContext(layout.user.id, permissions, params.ticketId),
    getTicketWorkflowBoard(layout.user.id, permissions, [params.ticketId]),
  ]);

  return {
    ticketId: params.ticketId,
    workflowContext,
    workflowBoard: {
      globalWorkflow: workflowBoard.globalWorkflow,
      areaWorkflows: workflowBoard.areaWorkflows,
    },
    canReply: hasPermission(permissions, "tickets.reply"),
  };
};
