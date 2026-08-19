import { error, fail, type Actions } from "@sveltejs/kit";
import type { PageServerLoad } from "./$types";
import { requireAppPermission } from "$lib/server/auth/authorization";
import { hasPermission } from "$lib/server/auth/permissions";
import { listSupportQueues } from "$lib/server/support/supportRepository";
import {
  addTicketWorkflowStage,
  archiveTicketWorkflowStage,
  createAreaTicketWorkflow,
  listTicketWorkflowConfiguration,
  renameTicketWorkflow,
  reorderTicketWorkflowStage,
  setTicketWorkflowInitialStage,
  updateTicketWorkflowStage,
  type TicketLifecycleStatus,
  type TicketWorkflowStageType,
} from "$lib/server/support/ticketWorkflowRepository";

function readFormValue(formData: FormData, name: string): string {
  const value = formData.get(name);
  return typeof value === "string" ? value.trim() : "";
}

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

function isStageType(value: string): value is TicketWorkflowStageType {
  return value === "normal" || value === "area_gateway" || value === "terminal";
}

function isLifecycleStatus(value: string): value is TicketLifecycleStatus {
  return ["new", "open", "in_progress", "waiting_customer", "resolved", "closed"].includes(value);
}

function workflowErrorMessage(cause: unknown): string {
  if (!(cause instanceof Error)) return "Não foi possível salvar o workflow.";
  const messages: Record<string, string> = {
    TICKET_WORKFLOW_NAME_INVALID: "Informe um nome entre 2 e 80 caracteres.",
    TICKET_WORKFLOW_QUEUE_NOT_FOUND: "A área selecionada não está disponível.",
    TICKET_WORKFLOW_AREA_GATEWAY_INVALID: "Workflows de área não podem conter outro gateway de área.",
    TICKET_WORKFLOW_AREA_STAGE_QUEUE_INVALID: "Colunas internas não podem encaminhar diretamente para outra área. Use o handoff ao concluir a área.",
    TICKET_WORKFLOW_AREA_LIFECYCLE_INVALID: "Dentro de uma área use lifecycle Aberto, Em andamento ou Aguardando cliente. Resolver e fechar pertencem ao fluxo global.",
    TICKET_WORKFLOW_ACTIVE_STAGE_LIFECYCLE_INVALID: "Etapas globais ativas não podem usar lifecycle Resolvido ou Fechado.",
    TICKET_WORKFLOW_TERMINAL_LIFECYCLE_INVALID: "Uma etapa terminal global deve usar lifecycle Resolvido ou Fechado.",
    TICKET_WORKFLOW_GATEWAY_QUEUE_REQUIRED: "Selecione a área que este gateway representa.",
    TICKET_WORKFLOW_STAGE_NAME_INVALID: "Informe um nome de coluna entre 2 e 80 caracteres.",
    TICKET_WORKFLOW_STAGE_STRUCTURE_IN_USE: "Esta coluna possui tickets. Mova os tickets antes de alterar o tipo ou a área vinculada.",
    TICKET_WORKFLOW_STAGE_IN_USE: "Esta coluna possui tickets e não pode ser arquivada.",
    TICKET_WORKFLOW_INITIAL_STAGE_ARCHIVE_BLOCKED: "Defina outra coluna inicial antes de arquivar esta.",
    TICKET_WORKFLOW_LAST_STAGE_ARCHIVE_BLOCKED: "Um workflow precisa manter ao menos uma coluna ativa.",
  };
  if (cause.message.includes("ticket_workflows_active_area_queue_unique")) {
    return "Esta área já possui um workflow ativo.";
  }
  return messages[cause.message] ?? "Não foi possível salvar o workflow.";
}

export const load: PageServerLoad = async ({ parent }) => {
  const layout = await parent();
  const permissions = new Map(layout.permissions.map((permission) => [permission.code, permission.scope]));
  if (!hasPermission(permissions, "tickets.manage", "all")) {
    throw error(403, "Acesso não autorizado.");
  }

  const [workflows, queues] = await Promise.all([
    listTicketWorkflowConfiguration(),
    listSupportQueues(),
  ]);

  return { workflows, queues };
};

export const actions: Actions = {
  createAreaWorkflow: async ({ cookies, request }) => {
    const { session, permissions } = await requireAppPermission(
      cookies,
      "tickets.manage",
      "/app/tickets/workflows",
    );
    if (!hasPermission(permissions, "tickets.manage", "all")) {
      return fail(403, { success: false, action: "createAreaWorkflow", message: "Permissão insuficiente." });
    }
    const formData = await request.formData();
    const name = readFormValue(formData, "name");
    const queueId = readFormValue(formData, "queueId");
    if (!isUuid(queueId)) {
      return fail(400, { success: false, action: "createAreaWorkflow", message: "Selecione uma área válida." });
    }
    try {
      await createAreaTicketWorkflow(session.user.id, name, queueId);
      return { success: true, action: "createAreaWorkflow", message: "Workflow da área criado." };
    } catch (cause) {
      return fail(409, { success: false, action: "createAreaWorkflow", message: workflowErrorMessage(cause) });
    }
  },

  renameWorkflow: async ({ cookies, request }) => {
    const { permissions } = await requireAppPermission(cookies, "tickets.manage", "/app/tickets/workflows");
    if (!hasPermission(permissions, "tickets.manage", "all")) {
      return fail(403, { success: false, action: "renameWorkflow", message: "Permissão insuficiente." });
    }
    const formData = await request.formData();
    const workflowId = readFormValue(formData, "workflowId");
    const name = readFormValue(formData, "name");
    if (!isUuid(workflowId)) {
      return fail(400, { success: false, action: "renameWorkflow", message: "Workflow inválido." });
    }
    try {
      await renameTicketWorkflow(workflowId, name);
      return { success: true, action: "renameWorkflow", message: "Nome do workflow atualizado." };
    } catch (cause) {
      return fail(409, { success: false, action: "renameWorkflow", message: workflowErrorMessage(cause) });
    }
  },

  addStage: async ({ cookies, request }) => {
    const { permissions } = await requireAppPermission(cookies, "tickets.manage", "/app/tickets/workflows");
    if (!hasPermission(permissions, "tickets.manage", "all")) {
      return fail(403, { success: false, action: "addStage", message: "Permissão insuficiente." });
    }
    const formData = await request.formData();
    const workflowId = readFormValue(formData, "workflowId");
    const name = readFormValue(formData, "name");
    const stageType = readFormValue(formData, "stageType");
    const lifecycleStatus = readFormValue(formData, "lifecycleStatus");
    if (!isUuid(workflowId) || !isStageType(stageType) || !isLifecycleStatus(lifecycleStatus)) {
      return fail(400, { success: false, action: "addStage", message: "Revise os dados da coluna." });
    }
    const linkedQueueId = stageType === "area_gateway"
      ? readFormValue(formData, "linkedQueueId") || null
      : null;
    if (linkedQueueId && !isUuid(linkedQueueId)) {
      return fail(400, { success: false, action: "addStage", message: "Área vinculada inválida." });
    }
    try {
      await addTicketWorkflowStage(workflowId, { name, stageType, linkedQueueId, lifecycleStatus });
      return { success: true, action: "addStage", message: "Coluna criada." };
    } catch (cause) {
      return fail(409, { success: false, action: "addStage", message: workflowErrorMessage(cause) });
    }
  },

  updateStage: async ({ cookies, request }) => {
    const { permissions } = await requireAppPermission(cookies, "tickets.manage", "/app/tickets/workflows");
    if (!hasPermission(permissions, "tickets.manage", "all")) {
      return fail(403, { success: false, action: "updateStage", message: "Permissão insuficiente." });
    }
    const formData = await request.formData();
    const stageId = readFormValue(formData, "stageId");
    const name = readFormValue(formData, "name");
    const stageType = readFormValue(formData, "stageType");
    const lifecycleStatus = readFormValue(formData, "lifecycleStatus");
    if (!isUuid(stageId) || !isStageType(stageType) || !isLifecycleStatus(lifecycleStatus)) {
      return fail(400, { success: false, action: "updateStage", message: "Revise os dados da coluna." });
    }
    const linkedQueueId = stageType === "area_gateway"
      ? readFormValue(formData, "linkedQueueId") || null
      : null;
    if (linkedQueueId && !isUuid(linkedQueueId)) {
      return fail(400, { success: false, action: "updateStage", message: "Área vinculada inválida." });
    }
    try {
      await updateTicketWorkflowStage(stageId, { name, stageType, linkedQueueId, lifecycleStatus });
      return { success: true, action: "updateStage", message: "Coluna atualizada." };
    } catch (cause) {
      return fail(409, { success: false, action: "updateStage", message: workflowErrorMessage(cause) });
    }
  },

  setInitial: async ({ cookies, request }) => {
    const { permissions } = await requireAppPermission(cookies, "tickets.manage", "/app/tickets/workflows");
    if (!hasPermission(permissions, "tickets.manage", "all")) {
      return fail(403, { success: false, action: "setInitial", message: "Permissão insuficiente." });
    }
    const stageId = readFormValue(await request.formData(), "stageId");
    if (!isUuid(stageId)) return fail(400, { success: false, action: "setInitial", message: "Coluna inválida." });
    try {
      await setTicketWorkflowInitialStage(stageId);
      return { success: true, action: "setInitial", message: "Coluna inicial atualizada." };
    } catch (cause) {
      return fail(409, { success: false, action: "setInitial", message: workflowErrorMessage(cause) });
    }
  },

  reorderStage: async ({ cookies, request }) => {
    const { permissions } = await requireAppPermission(cookies, "tickets.manage", "/app/tickets/workflows");
    if (!hasPermission(permissions, "tickets.manage", "all")) {
      return fail(403, { success: false, action: "reorderStage", message: "Permissão insuficiente." });
    }
    const formData = await request.formData();
    const stageId = readFormValue(formData, "stageId");
    const direction = readFormValue(formData, "direction");
    if (!isUuid(stageId) || (direction !== "up" && direction !== "down")) {
      return fail(400, { success: false, action: "reorderStage", message: "Movimentação inválida." });
    }
    try {
      await reorderTicketWorkflowStage(stageId, direction);
      return { success: true, action: "reorderStage", message: "Ordem das colunas atualizada." };
    } catch (cause) {
      return fail(409, { success: false, action: "reorderStage", message: workflowErrorMessage(cause) });
    }
  },

  archiveStage: async ({ cookies, request }) => {
    const { permissions } = await requireAppPermission(cookies, "tickets.manage", "/app/tickets/workflows");
    if (!hasPermission(permissions, "tickets.manage", "all")) {
      return fail(403, { success: false, action: "archiveStage", message: "Permissão insuficiente." });
    }
    const stageId = readFormValue(await request.formData(), "stageId");
    if (!isUuid(stageId)) return fail(400, { success: false, action: "archiveStage", message: "Coluna inválida." });
    try {
      await archiveTicketWorkflowStage(stageId);
      return { success: true, action: "archiveStage", message: "Coluna arquivada." };
    } catch (cause) {
      return fail(409, { success: false, action: "archiveStage", message: workflowErrorMessage(cause) });
    }
  },
};
