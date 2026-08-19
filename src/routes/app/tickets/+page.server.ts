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
import type { SupportPermissionMap } from "$lib/server/support/supportAccess";
import {
  addTicketLabel,
  createTicketLabel,
  deleteTicketAttachment,
  listTicketLabelsForTickets,
  removeTicketLabel,
  uploadTicketAttachment,
} from "$lib/server/support/ticketCardRepository";
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
  moveTicketToWorkflowLocation,
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
  return new Map(permissions.map((permission) => [permission.code, permission.scope]));
}

function actionErrorMessage(cause: unknown): string {
  if (!(cause instanceof Error)) return "Não foi possível concluir a operação.";
  const messages: Record<string, string> = {
    TICKET_WORKFLOW_AREA_ACCESS_DENIED: "Você não possui acesso ao processo interno desta área.",
    TICKET_WORKFLOW_AREA_NOT_CONFIGURED: "Esta área não possui workflow ativo.",
    TICKET_WORKFLOW_AREA_EMPTY: "Esta área não possui colunas ativas.",
    TICKET_WORKFLOW_AREA_NOT_IN_GLOBAL: "Adicione esta área como uma coluna do fluxo global antes de mover tickets para ela.",
    TICKET_LABEL_NAME_INVALID: "Informe uma etiqueta entre 2 e 40 caracteres.",
    TICKET_LABEL_COLOR_INVALID: "Cor de etiqueta inválida.",
    TICKET_ATTACHMENT_EMPTY: "Selecione um arquivo válido.",
    TICKET_ATTACHMENT_TOO_LARGE: "O anexo deve ter no máximo 20 MB.",
    TICKET_ATTACHMENT_TYPE_NOT_ALLOWED: "Este tipo de arquivo não é permitido.",
    ASSET_STORAGE_NOT_CONFIGURED: "O storage de anexos ainda não está configurado.",
  };
  return messages[cause.message] ?? "Não foi possível concluir a operação.";
}

export const load: PageServerLoad = async ({ parent }) => {
  const layout = await parent();
  const permissionMap = createPermissionMap(layout.permissions);
  const viewScope = getPermissionScope(permissionMap, "tickets.view");
  if (!viewScope) throw error(403, "Acesso não autorizado.");

  const canCreate = hasPermission(permissionMap, "tickets.create");
  const canReply = hasPermission(permissionMap, "tickets.reply");
  const canManageWorkflow = hasPermission(permissionMap, "tickets.manage", "all");
  const [ticketRows, queues] = await Promise.all([
    listSupportTickets(layout.user.id, permissionMap),
    canCreate ? listSupportQueues() : Promise.resolve([]),
  ]);
  const ticketIds = ticketRows.map((ticket) => ticket.id);
  const [contexts, workflowBoard, labelRows] = await Promise.all([
    listTicketCustomerContexts(ticketIds),
    getTicketWorkflowBoard(layout.user.id, permissionMap, ticketIds),
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
    tickets: ticketRows.map((ticket) => ({
      ...ticket,
      customerContext: contextByTicket.get(ticket.id) ?? null,
      workflowState: stateByTicket.get(ticket.id) ?? null,
      labels: labelsByTicket.get(ticket.id) ?? [],
    })),
    queues,
    workflowBoard: {
      globalWorkflow: workflowBoard.globalWorkflow,
      areaWorkflows: workflowBoard.areaWorkflows,
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
      return fail(400, { success: false, action: "create", message: "Informe um assunto entre 3 e 180 caracteres." });
    }
    if (message.length < 1 || message.length > 10000) {
      return fail(400, { success: false, action: "create", message: "A descrição deve ter entre 1 e 10.000 caracteres." });
    }
    if (customerName.length < 2 || customerName.length > 120) {
      return fail(400, { success: false, action: "create", message: "Informe o nome do cliente entre 2 e 120 caracteres." });
    }
    if (organizationName.length > 160) {
      return fail(400, { success: false, action: "create", message: "O nome da escola ou empresa deve ter no máximo 160 caracteres." });
    }
    if (customerEmail.length > 254 || customerPhone.length > 40) {
      return fail(400, { success: false, action: "create", message: "E-mail ou telefone do cliente excede o tamanho permitido." });
    }
    if (!queueId || !isTicketPriority(priority)) {
      return fail(400, { success: false, action: "create", message: "Revise fila e prioridade." });
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
        await moveTicketGlobalStage(session.user.id, permissions, ticketId, stageId);
      } else {
        await moveTicketAreaStage(session.user.id, permissions, ticketId, stageId);
      }
      return { success: true, action: "moveWorkflowStage", message: "Ticket movimentado." };
    } catch (cause) {
      return fail(409, { success: false, action: "moveWorkflowStage", message: actionErrorMessage(cause) });
    }
  },

  moveTicketLocation: async ({ cookies, request }) => {
    const { session, permissions } = await requireAppPermission(cookies, "tickets.reply", "/app/tickets");
    const formData = await request.formData();
    const ticketId = readFormValue(formData, "ticketId");
    const workflowId = readFormValue(formData, "workflowId");
    const stageId = readFormValue(formData, "stageId");
    if (!isUuid(ticketId) || !isUuid(workflowId) || !isUuid(stageId)) {
      return fail(400, { success: false, action: "moveTicketLocation", message: "Área ou coluna inválida." });
    }
    try {
      await moveTicketToWorkflowLocation(session.user.id, permissions, ticketId, workflowId, stageId);
      return { success: true, action: "moveTicketLocation", message: "Área e coluna atualizadas." };
    } catch (cause) {
      return fail(409, { success: false, action: "moveTicketLocation", message: actionErrorMessage(cause) });
    }
  },

  createLabel: async ({ cookies, request }) => {
    const { session, permissions } = await requireAppPermission(cookies, "tickets.reply", "/app/tickets");
    const formData = await request.formData();
    const ticketId = readFormValue(formData, "ticketId");
    const name = readFormValue(formData, "name");
    const color = readFormValue(formData, "color");
    if (!isUuid(ticketId)) return fail(400, { success: false, action: "createLabel", message: "Ticket inválido." });
    try {
      const tagId = await createTicketLabel(session.user.id, permissions, name, color);
      await addTicketLabel(session.user.id, permissions, ticketId, tagId);
      return { success: true, action: "createLabel", message: "Etiqueta criada e adicionada." };
    } catch (cause) {
      return fail(409, { success: false, action: "createLabel", message: actionErrorMessage(cause) });
    }
  },

  addLabel: async ({ cookies, request }) => {
    const { session, permissions } = await requireAppPermission(cookies, "tickets.reply", "/app/tickets");
    const formData = await request.formData();
    const ticketId = readFormValue(formData, "ticketId");
    const tagId = readFormValue(formData, "tagId");
    if (!isUuid(ticketId) || !isUuid(tagId)) return fail(400, { success: false, action: "addLabel", message: "Etiqueta inválida." });
    try {
      await addTicketLabel(session.user.id, permissions, ticketId, tagId);
      return { success: true, action: "addLabel", message: "Etiqueta adicionada." };
    } catch (cause) {
      return fail(409, { success: false, action: "addLabel", message: actionErrorMessage(cause) });
    }
  },

  removeLabel: async ({ cookies, request }) => {
    const { session, permissions } = await requireAppPermission(cookies, "tickets.reply", "/app/tickets");
    const formData = await request.formData();
    const ticketId = readFormValue(formData, "ticketId");
    const tagId = readFormValue(formData, "tagId");
    if (!isUuid(ticketId) || !isUuid(tagId)) return fail(400, { success: false, action: "removeLabel", message: "Etiqueta inválida." });
    try {
      await removeTicketLabel(session.user.id, permissions, ticketId, tagId);
      return { success: true, action: "removeLabel", message: "Etiqueta removida." };
    } catch (cause) {
      return fail(409, { success: false, action: "removeLabel", message: actionErrorMessage(cause) });
    }
  },

  uploadAttachment: async ({ cookies, request }) => {
    const { session, permissions } = await requireAppPermission(cookies, "tickets.reply", "/app/tickets");
    const formData = await request.formData();
    const ticketId = readFormValue(formData, "ticketId");
    const file = formData.get("file");
    if (!isUuid(ticketId) || !(file instanceof File)) {
      return fail(400, { success: false, action: "uploadAttachment", message: "Selecione um arquivo válido." });
    }
    try {
      await uploadTicketAttachment(session.user.id, permissions, ticketId, file);
      return { success: true, action: "uploadAttachment", message: "Anexo adicionado." };
    } catch (cause) {
      return fail(409, { success: false, action: "uploadAttachment", message: actionErrorMessage(cause) });
    }
  },

  deleteAttachment: async ({ cookies, request }) => {
    const { session, permissions } = await requireAppPermission(cookies, "tickets.reply", "/app/tickets");
    const formData = await request.formData();
    const ticketId = readFormValue(formData, "ticketId");
    const attachmentId = readFormValue(formData, "attachmentId");
    if (!isUuid(ticketId) || !isUuid(attachmentId)) {
      return fail(400, { success: false, action: "deleteAttachment", message: "Anexo inválido." });
    }
    try {
      await deleteTicketAttachment(session.user.id, permissions, ticketId, attachmentId);
      return { success: true, action: "deleteAttachment", message: "Anexo removido." };
    } catch (cause) {
      return fail(409, { success: false, action: "deleteAttachment", message: actionErrorMessage(cause) });
    }
  },
};
