import {
  error,
  fail,
  redirect,
  type Actions,
} from "@sveltejs/kit";
import { randomUUID } from "node:crypto";
import type { PageServerLoad } from "./$types";
import { requireAppPermission } from "$lib/server/auth/authorization";
import { parseTicketNumberSearch } from "$lib/support/ticketNumberSearch";
import { listUnreadTicketIds } from "$lib/server/notifications/notificationRepository";
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
  type TicketWorkspaceSort,
} from "$lib/server/support/ticketWorkspaceRepository";
import { listTicketCustomerContexts } from "$lib/server/support/ticketCustomerContextRepository";
import { listTicketWorkflowEntryPoints } from "$lib/server/support/ticketWorkflowRepository";
import {
  getTicketWorkflowBoardWithAppearance,
  moveTicketAreaStageWithNotifications,
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

function isTicketCreationChannel(value: string): value is "manual" | "email" {
  return value === "manual" || value === "email";
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

function parseSort(value: string | null): TicketWorkspaceSort {
  if (
    value === "created_desc"
    || value === "created_asc"
    || value === "updated_desc"
    || value === "updated_asc"
    || value === "number_desc"
    || value === "number_asc"
    || value === "priority_desc"
    || value === "subject_asc"
    || value === "subject_desc"
    || value === "priority_asc"
    || value === "customer_asc"
    || value === "customer_desc"
    || value === "assignee_asc"
    || value === "assignee_desc"
    || value === "sla_asc"
    || value === "sla_desc"
  ) {
    return value;
  }
  return "created_desc";
}

function parsePageSize(value: string | null): 25 | 50 | 100 {
  const parsed = Number(value);
  return parsed === 25 || parsed === 100 ? parsed : 50;
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

function ticketCreationErrorMessage(cause: unknown, reference: string): string {
  const code = cause instanceof Error ? cause.message : "";
  const messages: Record<string, string> = {
    F10_TICKET_CONTRACT_FORBIDDEN: "O contrato selecionado não está autorizado para esse solicitante.",
    SUPPORT_TICKET_CONTRACT_REQUIRED: "Selecione ao menos um contrato antes de criar o ticket.",
    SUPPORT_TICKET_CONTRACT_FORBIDDEN: "O solicitante não tem acesso a todos os contratos escolhidos.",
    SUPPORT_CONTRACT_NOT_FOUND: "Um dos contratos selecionados não está mais disponível.",
    SUPPORT_REQUESTER_NOT_FOUND: "O solicitante não está mais disponível. Selecione novamente.",
    SUPPORT_REQUESTER_ALREADY_EXISTS: "Já existe uma pessoa cadastrada com este e-mail.",
    SUPPORT_PARTICIPANT_CONTRACT_FORBIDDEN: "Um acompanhante não tem acesso aos contratos selecionados.",
    QUEUE_NOT_FOUND: "A fila selecionada não está disponível.",
    TICKET_WORKFLOW_ENTRY_POINT_INVALID: "O processo inicial não está mais disponível. Selecione novamente.",
    TICKET_WORKFLOW_AREA_ACCESS_DENIED: "Você não tem autorização para iniciar tickets nesse processo.",
    TICKET_WORKFLOW_AREA_NOT_CONFIGURED: "O processo selecionado não possui fluxo ativo.",
    TICKET_WORKFLOW_AREA_EMPTY: "O processo selecionado não possui etapa inicial ativa.",
    CUSTOMER_F10_CONTEXT_REQUIRED: "Selecione um cliente com contexto F10 válido.",
    CUSTOMER_REQUIRED: "Informe um cliente válido para o atendimento.",
  };
  if (messages[code]) return messages[code];

  const errorCode = cause && typeof cause === "object" && "code" in cause
    ? String(cause.code) : "";
  const constraint = cause && typeof cause === "object" && "constraint_name" in cause
    ? String(cause.constraint_name) : "";
  if (errorCode === "23505" && /tickets.*(number|ticket_number)/i.test(constraint)) {
    return "Não foi possível criar o ticket devido a um conflito de numeração. Referência: " + reference;
  }
  return "Não foi possível criar o ticket. Referência: " + reference;
}

function logTicketCreationError(cause: unknown, reference: string, input: {
  customerMode: string;
  contractCount: number;
  hasStartStage: boolean;
  channel: string;
}): void {
  const value = cause && typeof cause === "object"
    ? cause as Record<string, unknown> : {};
  const message = cause instanceof Error ? cause.message : "";
  const errorCode = typeof value.code === "string" && /^[0-9A-Z_]{2,20}$/.test(value.code)
    ? value.code : null;
  const constraint = typeof value.constraint_name === "string" &&
    /^[a-zA-Z][a-zA-Z0-9_]{0,100}$/.test(value.constraint_name)
    ? value.constraint_name : null;
  const domainCode = /^[A-Z][A-Z0-9_]{2,90}$/.test(message) ? message : null;
  const rawStage = value.ticketCreationStage;
  const stage = typeof rawStage === "string" && /^[a-z][a-z_]{1,40}$/.test(rawStage)
    ? rawStage : "unknown";
  const nestedCause = value.cause && typeof value.cause === "object"
    ? value.cause as Record<string, unknown> : {};
  const nestedCode = typeof nestedCause.code === "string" &&
    /^[0-9A-Z_]{2,20}$/.test(nestedCause.code)
    ? nestedCause.code : null;
  const nestedType = nestedCause instanceof Error ? nestedCause.name : null;

  console.error("[ticket.create.failed]", {
    reference,
    stage,
    errorType: cause instanceof Error ? cause.name : typeof cause,
    errorCode,
    constraint,
    domainCode,
    nestedType,
    nestedCode,
    ...input,
  });
}

export const load: PageServerLoad = async ({ parent, url, depends }) => {
  depends("app:tickets:workspace");
  const layout = await parent();
  const permissionMap = createPermissionMap(layout.permissions);
  const viewScope = getPermissionScope(permissionMap, "tickets.view");
  if (!viewScope) throw error(403, "Acesso não autorizado.");

  const canCreate = hasPermission(permissionMap, "tickets.create")
    && hasPermission(permissionMap, "customers.view");
  const canReply = hasPermission(permissionMap, "tickets.reply");
  const canManageWorkflow = hasPermission(permissionMap, "tickets.manage", "all");
  const canSearchCustomers = canCreate;
  const canSearchF10Contracts = canCreate && hasPermission(permissionMap, "customers.view", "all");
  const canManageCustomers = hasPermission(permissionMap, "customers.manage", "all");

  const view = parseView(url.searchParams.get("view"));
  const page = parsePage(url.searchParams.get("page"));
  const status = parseStatus(url.searchParams.get("status"));
  const search = (url.searchParams.get("q") ?? "").trim().slice(0, 120);
  const includeFinished =
    Boolean(parseTicketNumberSearch(search))
    || url.searchParams.get("finished") === "1"
    || status === "resolved"
    || status === "closed";
  const sort = parseSort(url.searchParams.get("sort"));
  const requestedPageSize = parsePageSize(url.searchParams.get("pageSize"));
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
    search,
    status,
    includeFinished,
    sort,
    priority: parsePriority(url.searchParams.get("priority")),
    queueId,
    assigneeId,
    areaId,
    stageId,
    channel: parseChannel(url.searchParams.get("channel")),
    sla: parseSla(url.searchParams.get("sla")),
    tagId,
    page,
    pageSize: view === "board"
      ? 300
      : view === "list"
        ? requestedPageSize
        : 50,
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
  const [contexts, workflowBoard, labelRows, unreadTicketIds] = await Promise.all([
    listTicketCustomerContexts(ticketIds),
    getTicketWorkflowBoardWithAppearance(layout.user.id, permissionMap, ticketIds),
    listTicketLabelsForTickets(ticketIds),
    listUnreadTicketIds(layout.user.id, ticketIds),
  ]);

  const unreadTicketIdSet = new Set(unreadTicketIds);
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
      unread: unreadTicketIdSet.has(ticket.id),
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
    accessSummary: {
      permissionScope: viewScope,
      restrictedByProcess: areaRestriction !== null,
      allowedProcessCount: areaRestriction?.length ?? null,
    },
    canCreate,
    canReply,
    canManageWorkflow,
    canSearchCustomers,
    canSearchF10Contracts,
    canManageCustomers,
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
    const channel = readFormValue(formData, "channel");
    const dueOn = readFormValue(formData, "dueOn");
    const queueId = readFormValue(formData, "queueId");
    const startStageId = readFormValue(formData, "startStageId") || null;
    let customer;
    try {
      customer = parseTicketCustomerLinkForm(formData);
    } catch (cause) {
      const code = cause instanceof Error ? cause.message : "";
      const message = code === "CUSTOMER_F10_CONTEXT_REQUIRED"
        ? "Selecione um cliente da API F10, um contato com contexto ou use + para cadastrar."
        : code === "F10_TICKET_CONTRACT_REQUIRED"
          ? "Selecione um contrato da API F10 antes de criar o ticket."
          : "Revise os dados do cliente antes de criar o ticket.";
      return fail(400, { success: false, action: "create", message });
    }
    if (subject.length < 3 || subject.length > 180) {
      return fail(400, { success: false, action: "create", message: "Informe um assunto entre 3 e 180 caracteres." });
    }
    if (message.length < 1 || message.length > 10000) {
      return fail(400, { success: false, action: "create", message: "A descrição deve ter entre 1 e 10.000 caracteres." });
    }
    if (!queueId || !isTicketPriority(priority) || !isTicketCreationChannel(channel)) {
      return fail(400, { success: false, action: "create", message: "Revise fila, canal e prioridade." });
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
        channel,
        dueOn,
        ...customer,
        queueId,
        startStageId,
      });
      throw redirect(303, `/app/tickets/${ticket.id}`);
    } catch (cause) {
      if (cause && typeof cause === "object" && "status" in cause && cause.status === 303) throw cause;
      if (cause instanceof Error && cause.message === "TICKET_EMAIL_CUSTOMER_EMAIL_REQUIRED") {
        return fail(400, {
          success: false,
          action: "create",
          message: "Para usar o canal E-mail, o cliente precisa ter um e-mail válido cadastrado.",
        });
      }

      const reference = randomUUID().slice(0, 8).toUpperCase();
      const userMessage = ticketCreationErrorMessage(cause, reference);
      if (userMessage.includes(reference)) {
        logTicketCreationError(cause, reference, {
          customerMode: customer.customerMode,
          contractCount: customer.contractIds?.length ?? 0,
          hasStartStage: Boolean(startStageId),
          channel,
        });
      }

      const invalidSelection = cause instanceof Error &&
        (cause.message.startsWith("F10_TICKET_CONTRACT_") ||
          cause.message.startsWith("SUPPORT_") ||
          cause.message.startsWith("CUSTOMER_"));
      return fail(invalidSelection ? 400 : 409, {
        success: false,
        action: "create",
        message: userMessage,
      });
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
        await moveTicketAreaStageWithNotifications(session.user.id, permissions, ticketId, stageId);
      }
      return { success: true, action: "moveWorkflowStage", message: "Ticket movimentado." };
    } catch (cause) {
      return fail(409, { success: false, action: "moveWorkflowStage", message: actionErrorMessage(cause) });
    }
  },

};
