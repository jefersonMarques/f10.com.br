import { error, json, type RequestHandler } from "@sveltejs/kit";
import { requireAppPermission } from "$lib/server/auth/authorization";
import { hasPermission } from "$lib/server/auth/permissions";
import { getTicketCard } from "$lib/server/support/ticketCardRepository";
import { markTicketFirstAgentView } from "$lib/server/support/ticketCustomerProgressRepository";
import { listTicketTasks } from "$lib/server/support/ticketTaskBridge";
import { listTaskProjects } from "$lib/server/tasks/taskRepository";

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

export const GET: RequestHandler = async ({ cookies, params, url }) => {
  if (!isUuid(params.ticketId)) throw error(404, "Ticket não encontrado.");
  const { session, permissions } = await requireAppPermission(
    cookies,
    "tickets.view",
    url.pathname,
  );

  try {
    const card = await getTicketCard(session.user.id, permissions, params.ticketId);
    await markTicketFirstAgentView(session.user.id, params.ticketId).catch((cause) => {
      console.error("[ticket.customer_progress.card_view]", {
        ticketId: params.ticketId,
        causeType: cause instanceof Error ? cause.name : typeof cause,
      });
    });
    const canViewTasks = hasPermission(permissions, "tasks.view");
    const canCreateTask =
      hasPermission(permissions, "tickets.reply") &&
      hasPermission(permissions, "tasks.create");

    const [linkedTasks, taskProjects] = await Promise.all([
      canViewTasks
        ? listTicketTasks(session.user.id, permissions, params.ticketId).catch(() => [])
        : Promise.resolve([]),
      canCreateTask
        ? listTaskProjects(session.user.id, permissions).catch(() => [])
        : Promise.resolve([]),
    ]);

    return json(
      {
        ...card,
        linkedTasks,
        taskProjects,
        canCreateTask,
      },
      {
        headers: {
          "Cache-Control": "private, no-store, max-age=0",
        },
      },
    );
  } catch {
    throw error(404, "Ticket não encontrado ou fora do seu escopo de acesso.");
  }
};
