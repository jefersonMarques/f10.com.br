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
import {
  getUserTicketAreaRestriction,
  type SupportPermissionMap,
} from "$lib/server/support/supportAccess";
import {
  listTicketLabels,
  listTicketLabelsForTickets,
} from "$lib/server/support/ticketCardRepository";
import { parseTicketCustomerLinkForm } from "$lib/server/support/ticketCustomerForm";
import { isTicketDueDate } from "$lib/server/support/ticketDueDate";
import {
  createManualTicket,
  listSupportAgents,
  listSupportQueues,
  type TicketPriority,
  type TicketStatus,
} from "$lib/server/support/supportRepository";
import {
  listTicketWorkspaceTickets,
  type TicketWorkspaceChannel,
  type TicketWorkspaceScope,
  type TicketWorkspaceSlaFilter,
} from "$lib/server/support/ticketWorkspaceRepository";
import { listTicketCustomerContexts } from "$lib/server/support/ticketCustomerContextRepository";
import { listTicketWorkflowEntryPoints, moveTicketAreaStage } from "$lib/server/support/ticketWorkflowRepository";
import {
  getTicketWorkflowBoardWithAppearance,
  moveTicketGlobalStageWithRules,
} from "$lib/server/support/ticketWorkflowService";

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

const TICKET_STATUSES: TicketStatus[] = [
  "new",
  "open",
  "in_progress",
  "waiting_customer",
  "resolved",
  "closed",
];
const TICKET_CHANNELS: TicketWorkspaceChannel[] = [
  "manual",
  "web_chat",
  "portal",
  "email",
  "whatsapp",
];

function parsePage(value: string | null): number {
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed > 0 ? Math.min(parsed, 1000) : 1;
}

function parseScope(value: string | null): TicketWorkspaceScope {
  return value === "mine" || value === "unassigned" ? value : "all";
}

function parseView(value: string | null): "board" | "list" | "split" {
  return value === "board" || value === "list" ? value : "split";
}

function parseStatus(value: string | null): TicketStatus | null {
  return TICKET_STATUSES.includes(value as TicketStatus) ? value as TicketStatus : null;
}

function parsePriority(value: string | null): TicketPriority | null {
  return isTicketPriority(value ?? "") ? value as TicketPriority : null;
}

function parseChannel(value: string | null): TicketWorkspaceChannel | null {
  return TICKET_CHANNELS.includes(value as TicketWorkspaceChannel)
    ? value as TicketWorkspaceChannel
    : null;
}

function parseSla(value: string | null): TicketWorkspaceSlaFilter {
  return value === "overdue" || value === "risk" || value === "first_response"
    ? value
    : null;
}

function parseOptionalUuid(value: string | null): string | null {
  return value && isUuid(value) ? value : null;
}

function createPermissionMap(
  permissions: Array<{ code: string; scope: PermissionScope }>,
): SupportPermissionMap {
  return new Map(permissions.map((permission) => [permission.code, permission.scope]));
}

function actionErrorMessage(cause: unknown): string {
  if (!(cause instanceof Error)) return "Não foi possível concluir a operação.";
  const messages: Record<string, string> = {
    TICKET_WORKFLOW_AREA_ACCESS_DENIED: "Você não possui acesso ao processo interno desta área.",
    TICKET_WORKFLOW_AREA_NOT_COMPLETE: "Entre na área e conclua o fluxo antes de movimentar o ticket.",
    TICKET_WORKFLOW_AREA_NOT_CONFIGURED: "Esta área não possui workflow ativo.",
    TICKET_WORKFLOW_AREA_EMPTY: "Esta área não possui colunas ativas.",
    TICKET_WORKFLOW_AREA_NOT_IN_GLOBAL: "Adicione esta área como uma coluna do fluxo global antes de mover tickets para ela.",
  };
  if (cause.message.includes("TICKET_WORKFLOW_AREA_NOT_COMPLETE")) {
    return messages.TICKET_WORKFLOW_AREA_NOT_COMPLETE;
  }
  return messages[cause.message] ?? "Não foi possível concluir a operação.";
}

export const load: PageServerLoad = async ({ parent, url }) => {
  const layout = await parent();
  const permissionMap = createPermissionMap(layout.permissions);
  const viewScope = getPermissionScope(permissionMap, "tickets.view");
  if (!viewScope) throw error(403, "Acesso não autorizado.");

  const canCreate = hasPermission(permissionMap, "tickets.create")
    && hasPermission(permissionMap, "customers.view");
  const canReply = hasPermission(permissionMap, "tickets.reply");
  const canManageWorkflow = hasPermission(permissionMap, "tickets.manage", "all");
  const canSearchCustomers = canCreate;

  const view = parseView(url.searchParams.get("view"));
  const page = parsePage(url.searchParams.get("page"));
  const queueId = parseOptionalUuid(url.searchParams.get("queueId"));
  const areaId = parseOptionalUuid(url.searchParams.get("areaId"));
  const stageId = parseOptionalUuid(url.searchParams.get("stageId"));
  const tagId = parseOptionalUuid(url.searchParams.get("tagId"));
  const assigneeValue = url.searchParams.get("assigneeId");
  const assigneeId =
    assigneeValue === "unassigned"
      ? "unassigned"
      : parseOptionalUuid(assigneeValue);

  const filters = {
    scope: parseScope(url.searchParams.get("scope")),
    search: (url.searchParams.get("q") ?? "").trim().slice(0, 120),
    status: parseStatus(url.searchParams.get("status")),
    priority: parsePriority(url.searchParams.get("priority")),
    queueId,
    assigneeId,
    areaId,
    stageId,
    channel: parseChannel(url.searchParams.get("channel")),
    sla: parseSla(url.searchParams.get("sla")),
    tagId,
    page,
    pageSize: view === "board" ? 300 : 50,
  };

  const [
    workspace,
    queues,
    agents,
    allLabels,
    allEntryPoints,
    areaRestriction,
  ] = await Promise.all([
    listTicketWorkspaceTickets(layout.user.id, permissionMap, filters),
    listSupportQueues(),
    listSupportAgents(),
    listTicketLabels(),
    canCreate ? listTicketWorkflowEntryPoints() : Promise.resolve([]),
    getUserTicketAreaRestriction(layout.user.id),
  ]);
  const entryPoints =
    areaRestriction === null
      ? allEntryPoints
      : allEntryPoints.filter((entryPoint) => areaRestriction.includes(entryPoint.areaId));

  const ticketIds = workspace.tickets.map((ticket) => ticket.id);
  const [contexts, workflowBoard, labelRows] = await Promise.all([
    listTicketCustomerContexts(ticketIds),
    getTicketWorkflowBoardWithAppearance(layout.user.id, permissionMap, ticketIds),
    listTicketLabelsForTickets(ticketIds),
  ]);

  const contextByTicket = new Map(contexts.map((context) => [context.ticketId, context]));
  const stateByTicket = new Map(workflowBoard.states.map((state) => [state.ticketId, state]));
  const labelsByTicket = new Map<string, typeof labelRows>();
  for (const label of labelRows) {
    const current = labelsByTicket.get(label.ticketId) ?? [];
    current.push(label);
    labelsByTicket.set(label.ticketId, current);
  }

  return {
    tickets: workspace.tickets.map((ticket) => ({
      ...ticket,
      customerContext: contextByTicket.get(ticket.id) ?? null,
      workflowState: stateByTicket.get(ticket.id) ?? ticket.workflowState,
      labels: labelsByTicket.get(ticket.id) ?? [],
    })),
    pagination: {
      total: workspace.total,
      page: workspace.page,
      pageSize: workspace.pageSize,
      totalPages: workspace.totalPages,
      boardLimited: view === "board" && workspace.total > workspace.pageSize,
    },
    filters: {
      ...filters,
      view,
    },
    filterOptions: {
      queues,
      agents,
      labels: allLabels,
    },
    queues: canCreate ? queues : [],
    entryPoints,
    workflowBoard: {
      globalWorkflow: workflowBoard.globalWorkflow,
      areaWorkflows: workflowBoard.areaWorkflows,
    },
    canCreate,
    canReply,
    canManageWorkflow,
    canSearchCustomers,
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
    const dueOn = readFormValue(formData, "dueOn");
    const queueId = readFormValue(formData, "queueId");
    const startStageId = readFormValue(formData, "startStageId") || null;
    let customer;
    try {
      customer = parseTicketCustomerLinkForm(formData);
    } catch (cause) {
      const code = cause instanceof Error ? cause.message : "";
      const message = code === "CUSTOMER_F10_CONTEXT_REQUIRED"
        ? "Selecione um cliente existente com grupo/unidade F10 ou use + para cadastrar todos os identificadores obrigatórios."
        : "Revise os dados do cliente antes de criar o ticket.";
      return fail(400, { success: false, action: "create", message });
    }
    if (subject.length < 3 || subject.length > 180) {
      return fail(400, { success: false, action: "create", message: "Informe um assunto entre 3 e 180 caracteres." });
    }
    if (message.length < 1 || message.length > 10000) {
      return fail(400, { success: false, action: "create", message: "A descrição deve ter entre 1 e 10.000 caracteres." });
    }
    if (!queueId || !isTicketPriority(priority)) {
      return fail(400, { success: false, action: "create", message: "Revise fila e prioridade." });
    }
    if (startStageId && !isUuid(startStageId)) {
      return fail(400, { success: false, action: "create", message: "Processo inicial inválido." });
    }
    if (!isTicketDueDate(dueOn)) {
      return fail(400, { success: false, action: "create", message: "Informe uma data planejada de conclusão válida." });
    }

    try {
      const ticket = await createManualTicket(session.user.id, permissions, {
        subject,
        message,
        priority,
        dueOn,
        ...customer,
        queueId,
        startStageId,
      });
      throw redirect(303, `/app/tickets/${ticket.id}`);
    } catch (cause) {
      if (cause && typeof cause === "object" && "status" in cause && cause.status === 303) throw cause;
      return fail(409, { success: false, action: "create", message: "Não foi possível criar o ticket." });
    }
  },

  moveWorkflowStage: async ({ cookies, request }) => {
    const { session, permissions } = await requireAppPermission(cookies, "tickets.reply", "/app/tickets");
    const formData = await request.formData();
    const ticketId = readFormValue(formData, "ticketId");
    const stageId = readFormValue(formData, "stageId");
    const workflowKind = readFormValue(formData, "workflowKind");
    if (!isUuid(ticketId) || !isUuid(stageId) || (workflowKind !== "global" && workflowKind !== "area")) {
      return fail(400, { success: false, action: "moveWorkflowStage", message: "Movimentação inválida." });
    }

    try {
      if (workflowKind === "global") {
        await moveTicketGlobalStageWithRules(session.user.id, permissions, ticketId, stageId);
      } else {
        await moveTicketAreaStage(session.user.id, permissions, ticketId, stageId);
      }
      return { success: true, action: "moveWorkflowStage", message: "Ticket movimentado." };
    } catch (cause) {
      return fail(409, { success: false, action: "moveWorkflowStage", message: actionErrorMessage(cause) });
    }
  },

};
