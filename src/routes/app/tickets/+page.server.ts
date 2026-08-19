import { eq } from "drizzle-orm";
import {
  error,
  fail,
  redirect,
  type Actions,
} from "@sveltejs/kit";
import type { PageServerLoad } from "./$types";
import { requireAppPermission } from "$lib/server/auth/authorization";
import {
  getPermissionScope,
  hasPermission,
  type PermissionScope,
} from "$lib/server/auth/permissions";
import { getDatabase } from "$lib/server/db";
import { ticketWorkflowStates } from "$lib/server/db/ticketWorkflowSchema";
import { tickets as ticketTable } from "$lib/server/db/supportSchema";
import {
  getUserSupportQueueIds,
  type SupportPermissionMap,
} from "$lib/server/support/supportAccess";
import {
  createManualTicket,
  listSupportQueues,
  listSupportTickets,
  type TicketPriority,
} from "$lib/server/support/supportRepository";
import { listTicketCustomerContexts } from "$lib/server/support/ticketCustomerContextRepository";
import {
  getTicketWorkflowBoard,
  moveTicketAreaStage,
  moveTicketGlobalStage,
} from "$lib/server/support/ticketWorkflowRepository";

function readFormValue(formData: FormData, name: string): string {
  const value = formData.get(name);
  return typeof value === "string" ? value.trim() : "";
}

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

function isTicketPriority(value: string): value is TicketPriority {
  return value === "low" || value === "normal" || value === "high" || value === "urgent";
}

function createPermissionMap(
  permissions: Array<{ code: string; scope: PermissionScope }>,
): SupportPermissionMap {
  return new Map(
    permissions.map((permission) => [permission.code, permission.scope]),
  );
}

function workflowMoveMessage(cause: unknown): string {
  if (!(cause instanceof Error)) return "Não foi possível mover o ticket.";
  if (cause.message === "TICKET_WORKFLOW_AREA_ACCESS_DENIED") {
    return "Somente integrantes da área atual ou gestores podem movimentar o processo interno deste ticket.";
  }
  if (cause.message === "TICKET_WORKFLOW_AREA_NOT_COMPLETE") {
    return "A área ainda não concluiu o processo. Mova o ticket para uma etapa terminal antes do handoff.";
  }
  if (cause.message === "TICKET_WORKFLOW_AREA_NOT_CONFIGURED") {
    return "Esta área ainda não possui um workflow configurado.";
  }
  if (cause.message === "TICKET_WORKFLOW_AREA_EMPTY") {
    return "O workflow desta área ainda não possui colunas ativas.";
  }
  return "Não foi possível mover o ticket para esta etapa.";
}

async function requireCurrentAreaOperationAccess(
  actorUserId: string,
  permissions: SupportPermissionMap,
  ticketId: string,
): Promise<void> {
  if (hasPermission(permissions, "tickets.manage", "all")) return;

  const db = getDatabase();
  const [current] = await db
    .select({
      queueId: ticketTable.queueId,
      areaWorkflowId: ticketWorkflowStates.areaWorkflowId,
    })
    .from(ticketTable)
    .leftJoin(
      ticketWorkflowStates,
      eq(ticketWorkflowStates.ticketId, ticketTable.id),
    )
    .where(eq(ticketTable.id, ticketId))
    .limit(1);

  if (!current) throw new Error("TICKET_WORKFLOW_STATE_NOT_FOUND");
  if (!current.areaWorkflowId) return;

  const queueIds = await getUserSupportQueueIds(actorUserId);
  if (!queueIds.includes(current.queueId)) {
    throw new Error("TICKET_WORKFLOW_AREA_ACCESS_DENIED");
  }
}

export const load: PageServerLoad = async ({ parent }) => {
  const layout = await parent();
  const permissionMap = createPermissionMap(layout.permissions);
  const viewScope = getPermissionScope(permissionMap, "tickets.view");

  if (!viewScope) {
    throw error(403, "Acesso não autorizado.");
  }

  const canCreate = hasPermission(permissionMap, "tickets.create");
  const canReply = hasPermission(permissionMap, "tickets.reply");
  const canManageWorkflow = hasPermission(permissionMap, "tickets.manage", "all");
  const [tickets, queues] = await Promise.all([
    listSupportTickets(layout.user.id, permissionMap),
    canCreate ? listSupportQueues() : Promise.resolve([]),
  ]);
  const [contexts, workflowBoard, teamQueueIds] = await Promise.all([
    listTicketCustomerContexts(tickets.map((ticket) => ticket.id)),
    getTicketWorkflowBoard(
      layout.user.id,
      permissionMap,
      tickets.map((ticket) => ticket.id),
    ),
    viewScope === "all"
      ? Promise.resolve<string[]>([])
      : getUserSupportQueueIds(layout.user.id),
  ]);

  const visibleAreaWorkflows = viewScope === "all"
    ? workflowBoard.areaWorkflows
    : workflowBoard.areaWorkflows.filter(
        (workflow) => Boolean(workflow.queueId && teamQueueIds.includes(workflow.queueId)),
      );
  const visibleAreaWorkflowIds = new Set(
    visibleAreaWorkflows.map((workflow) => workflow.id),
  );
  const contextByTicket = new Map(contexts.map((context) => [context.ticketId, context]));
  const stateByTicket = new Map(
    workflowBoard.states.map((state) => {
      if (
        state.areaWorkflowId &&
        !visibleAreaWorkflowIds.has(state.areaWorkflowId)
      ) {
        return [
          state.ticketId,
          {
            ...state,
            areaWorkflowId: null,
            areaStageId: null,
            areaEnteredAt: null,
          },
        ] as const;
      }
      return [state.ticketId, state] as const;
    }),
  );

  return {
    tickets: tickets.map((ticket) => ({
      ...ticket,
      customerContext: contextByTicket.get(ticket.id) ?? null,
      workflowState: stateByTicket.get(ticket.id) ?? null,
    })),
    queues,
    workflowBoard: {
      globalWorkflow: workflowBoard.globalWorkflow,
      areaWorkflows: visibleAreaWorkflows,
    },
    currentUserId: layout.user.id,
    canCreate,
    canReply,
    canManageWorkflow,
  };
};

export const actions: Actions = {
  create: async ({ cookies, request }) => {
    const { session, permissions } = await requireAppPermission(
      cookies,
      "tickets.create",
      "/app/tickets",
    );
    const formData = await request.formData();
    const subject = readFormValue(formData, "subject");
    const message = readFormValue(formData, "message");
    const priority = readFormValue(formData, "priority");
    const customerName = readFormValue(formData, "customerName");
    const customerEmail = readFormValue(formData, "customerEmail").toLowerCase();
    const customerPhone = readFormValue(formData, "customerPhone");
    const organizationName = readFormValue(formData, "organizationName");
    const queueId = readFormValue(formData, "queueId");

    if (subject.length < 3 || subject.length > 180) {
      return fail(400, {
        success: false,
        action: "create",
        message: "Informe um assunto entre 3 e 180 caracteres.",
      });
    }

    if (message.length < 1 || message.length > 10000) {
      return fail(400, {
        success: false,
        action: "create",
        message: "A descrição do atendimento deve ter entre 1 e 10.000 caracteres.",
      });
    }

    if (customerName.length < 2 || customerName.length > 120) {
      return fail(400, {
        success: false,
        action: "create",
        message: "Informe o nome do cliente entre 2 e 120 caracteres.",
      });
    }

    if (organizationName.length > 160) {
      return fail(400, {
        success: false,
        action: "create",
        message: "O nome da escola ou empresa deve ter no máximo 160 caracteres.",
      });
    }

    if (customerEmail.length > 254 || customerPhone.length > 40) {
      return fail(400, {
        success: false,
        action: "create",
        message: "E-mail ou telefone do cliente excede o tamanho permitido.",
      });
    }

    if (!queueId) {
      return fail(400, {
        success: false,
        action: "create",
        message: "Selecione uma fila de atendimento.",
      });
    }

    if (!isTicketPriority(priority)) {
      return fail(400, {
        success: false,
        action: "create",
        message: "Prioridade inválida.",
      });
    }

    try {
      const ticket = await createManualTicket(session.user.id, permissions, {
        subject,
        message,
        priority,
        customerName,
        customerEmail,
        customerPhone,
        organizationName,
        queueId,
      });

      throw redirect(303, `/app/tickets/${ticket.id}`);
    } catch (cause) {
      if (
        cause &&
        typeof cause === "object" &&
        "status" in cause &&
        cause.status === 303
      ) {
        throw cause;
      }

      return fail(409, {
        success: false,
        action: "create",
        message: "Não foi possível criar o ticket. Verifique a fila e tente novamente.",
      });
    }
  },

  moveWorkflowStage: async ({ cookies, request }) => {
    const { session, permissions } = await requireAppPermission(
      cookies,
      "tickets.reply",
      "/app/tickets",
    );
    const formData = await request.formData();
    const ticketId = readFormValue(formData, "ticketId");
    const stageId = readFormValue(formData, "stageId");
    const workflowKind = readFormValue(formData, "workflowKind");

    if (!isUuid(ticketId) || !isUuid(stageId) || !["global", "area"].includes(workflowKind)) {
      return fail(400, {
        success: false,
        action: "moveWorkflowStage",
        message: "Ticket, workflow ou etapa inválida.",
      });
    }

    try {
      await requireCurrentAreaOperationAccess(
        session.user.id,
        permissions,
        ticketId,
      );
      if (workflowKind === "area") {
        await moveTicketAreaStage(session.user.id, permissions, ticketId, stageId);
      } else {
        await moveTicketGlobalStage(session.user.id, permissions, ticketId, stageId);
      }
      return {
        success: true,
        action: "moveWorkflowStage",
        message: workflowKind === "area"
          ? "Etapa interna da área atualizada."
          : "Ticket encaminhado para a nova etapa.",
      };
    } catch (cause) {
      return fail(409, {
        success: false,
        action: "moveWorkflowStage",
        message: workflowMoveMessage(cause),
      });
    }
  },
};
