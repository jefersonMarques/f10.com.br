import { error, fail, type Actions, type Cookies } from "@sveltejs/kit";
import type { PageServerLoad } from "./$types";
import { requireAppPermission } from "$lib/server/auth/authorization";
import { hasPermission } from "$lib/server/auth/permissions";
import {
  addTicketWorkflowStage,
  archiveTicketArea,
  archiveTicketWorkflowStage,
  createTicketArea,
  listTicketAreas,
  listTicketWorkflowConfiguration,
  listTicketWorkflowTeams,
  renameTicketWorkflow,
  reorderTicketWorkflowStage,
  setTicketWorkflowInitialStage,
  updateTicketArea,
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
  if (!(cause instanceof Error)) return "Não foi possível salvar a configuração.";
  const messages: Record<string, string> = {
    TICKET_AREA_NAME_INVALID: "Informe um nome de área entre 2 e 80 caracteres.",
    TICKET_AREA_TEAM_NOT_FOUND: "A equipe selecionada não está disponível.",
    TICKET_AREA_IN_USE: "Esta área possui tickets em atendimento e não pode ser arquivada.",
    TICKET_AREA_LINKED: "Remova a área das colunas do fluxo global antes de arquivá-la.",
    TICKET_WORKFLOW_NAME_INVALID: "Informe um nome entre 2 e 80 caracteres.",
    TICKET_WORKFLOW_AREA_GATEWAY_INVALID: "Dentro de uma área use apenas colunas normais ou terminais.",
    TICKET_WORKFLOW_AREA_LINK_INVALID: "Somente o fluxo global pode usar uma área como coluna.",
    TICKET_WORKFLOW_AREA_LIFECYCLE_INVALID: "Dentro de uma área use Aberto, Em andamento ou Aguardando cliente.",
    TICKET_WORKFLOW_ACTIVE_STAGE_LIFECYCLE_INVALID: "Etapas globais ativas não podem usar Resolvido ou Fechado.",
    TICKET_WORKFLOW_TERMINAL_LIFECYCLE_INVALID: "Uma etapa terminal global deve usar Resolvido ou Fechado.",
    TICKET_WORKFLOW_GATEWAY_AREA_REQUIRED: "Selecione a área representada por esta coluna.",
    TICKET_WORKFLOW_STAGE_NAME_INVALID: "Informe um nome de coluna entre 2 e 80 caracteres.",
    TICKET_WORKFLOW_STAGE_STRUCTURE_IN_USE: "Esta coluna possui tickets. Mova-os antes de alterar o tipo ou a área vinculada.",
    TICKET_WORKFLOW_STAGE_IN_USE: "Esta coluna possui tickets e não pode ser arquivada.",
    TICKET_WORKFLOW_INITIAL_STAGE_ARCHIVE_BLOCKED: "Defina outra coluna inicial antes de arquivar esta.",
    TICKET_WORKFLOW_LAST_STAGE_ARCHIVE_BLOCKED: "Um workflow precisa manter ao menos uma coluna ativa.",
  };
  if (cause.message.includes("ticket_areas_active_name_unique")) return "Já existe uma área ativa com esse nome.";
  return messages[cause.message] ?? "Não foi possível salvar a configuração.";
}

async function requireManageAll(cookies: Cookies) {
  const result = await requireAppPermission(cookies, "tickets.manage", "/app/tickets/workflows");
  if (!hasPermission(result.permissions, "tickets.manage", "all")) {
    throw error(403, "Acesso não autorizado.");
  }
  return result;
}

export const load: PageServerLoad = async ({ parent }) => {
  const layout = await parent();
  const permissions = new Map(layout.permissions.map((permission) => [permission.code, permission.scope]));
  if (!hasPermission(permissions, "tickets.manage", "all")) throw error(403, "Acesso não autorizado.");

  const [workflows, areas, teams] = await Promise.all([
    listTicketWorkflowConfiguration(),
    listTicketAreas(),
    listTicketWorkflowTeams(),
  ]);
  return { workflows, areas, teams };
};

export const actions: Actions = {
  createArea: async ({ cookies, request }) => {
    const { session } = await requireManageAll(cookies);
    const formData = await request.formData();
    const name = readFormValue(formData, "name");
    const teamId = readFormValue(formData, "teamId") || null;
    if (teamId && !isUuid(teamId)) return fail(400, { success: false, action: "createArea", message: "Equipe inválida." });
    try {
      await createTicketArea(session.user.id, { name, teamId });
      return { success: true, action: "createArea", message: "Área criada com uma coluna inicial Recebido." };
    } catch (cause) {
      return fail(409, { success: false, action: "createArea", message: workflowErrorMessage(cause) });
    }
  },

  updateArea: async ({ cookies, request }) => {
    await requireManageAll(cookies);
    const formData = await request.formData();
    const areaId = readFormValue(formData, "areaId");
    const name = readFormValue(formData, "name");
    const teamId = readFormValue(formData, "teamId") || null;
    if (!isUuid(areaId) || (teamId && !isUuid(teamId))) return fail(400, { success: false, action: "updateArea", message: "Área ou equipe inválida." });
    try {
      await updateTicketArea(areaId, { name, teamId });
      return { success: true, action: "updateArea", message: "Área atualizada." };
    } catch (cause) {
      return fail(409, { success: false, action: "updateArea", message: workflowErrorMessage(cause) });
    }
  },

  archiveArea: async ({ cookies, request }) => {
    await requireManageAll(cookies);
    const areaId = readFormValue(await request.formData(), "areaId");
    if (!isUuid(areaId)) return fail(400, { success: false, action: "archiveArea", message: "Área inválida." });
    try {
      await archiveTicketArea(areaId);
      return { success: true, action: "archiveArea", message: "Área arquivada." };
    } catch (cause) {
      return fail(409, { success: false, action: "archiveArea", message: workflowErrorMessage(cause) });
    }
  },

  renameWorkflow: async ({ cookies, request }) => {
    await requireManageAll(cookies);
    const formData = await request.formData();
    const workflowId = readFormValue(formData, "workflowId");
    const name = readFormValue(formData, "name");
    if (!isUuid(workflowId)) return fail(400, { success: false, action: "renameWorkflow", message: "Workflow inválido." });
    try {
      await renameTicketWorkflow(workflowId, name);
      return { success: true, action: "renameWorkflow", message: "Nome do workflow atualizado." };
    } catch (cause) {
      return fail(409, { success: false, action: "renameWorkflow", message: workflowErrorMessage(cause) });
    }
  },

  addStage: async ({ cookies, request }) => {
    await requireManageAll(cookies);
    const formData = await request.formData();
    const workflowId = readFormValue(formData, "workflowId");
    const name = readFormValue(formData, "name");
    const stageType = readFormValue(formData, "stageType");
    const lifecycleStatus = readFormValue(formData, "lifecycleStatus");
    const linkedAreaId = stageType === "area_gateway" ? readFormValue(formData, "linkedAreaId") || null : null;
    if (!isUuid(workflowId) || !isStageType(stageType) || !isLifecycleStatus(lifecycleStatus) || (linkedAreaId && !isUuid(linkedAreaId))) {
      return fail(400, { success: false, action: "addStage", message: "Revise os dados da coluna." });
    }
    try {
      await addTicketWorkflowStage(workflowId, { name, stageType, linkedAreaId, lifecycleStatus });
      return { success: true, action: "addStage", message: "Coluna criada." };
    } catch (cause) {
      return fail(409, { success: false, action: "addStage", message: workflowErrorMessage(cause) });
    }
  },

  updateStage: async ({ cookies, request }) => {
    await requireManageAll(cookies);
    const formData = await request.formData();
    const stageId = readFormValue(formData, "stageId");
    const name = readFormValue(formData, "name");
    const stageType = readFormValue(formData, "stageType");
    const lifecycleStatus = readFormValue(formData, "lifecycleStatus");
    const linkedAreaId = stageType === "area_gateway" ? readFormValue(formData, "linkedAreaId") || null : null;
    if (!isUuid(stageId) || !isStageType(stageType) || !isLifecycleStatus(lifecycleStatus) || (linkedAreaId && !isUuid(linkedAreaId))) {
      return fail(400, { success: false, action: "updateStage", message: "Revise os dados da coluna." });
    }
    try {
      await updateTicketWorkflowStage(stageId, { name, stageType, linkedAreaId, lifecycleStatus });
      return { success: true, action: "updateStage", message: "Coluna atualizada." };
    } catch (cause) {
      return fail(409, { success: false, action: "updateStage", message: workflowErrorMessage(cause) });
    }
  },

  setInitial: async ({ cookies, request }) => {
    await requireManageAll(cookies);
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
    await requireManageAll(cookies);
    const formData = await request.formData();
    const stageId = readFormValue(formData, "stageId");
    const direction = readFormValue(formData, "direction");
    if (!isUuid(stageId) || (direction !== "up" && direction !== "down")) {
      return fail(400, { success: false, action: "reorderStage", message: "Movimentação inválida." });
    }
    try {
      await reorderTicketWorkflowStage(stageId, direction);
      return { success: true, action: "reorderStage", message: "Ordem atualizada." };
    } catch (cause) {
      return fail(409, { success: false, action: "reorderStage", message: workflowErrorMessage(cause) });
    }
  },

  archiveStage: async ({ cookies, request }) => {
    await requireManageAll(cookies);
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
