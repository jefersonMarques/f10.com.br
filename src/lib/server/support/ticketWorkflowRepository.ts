import {
  and,
  asc,
  count,
  desc,
  eq,
  inArray,
  max,
  sql,
} from "drizzle-orm";
import {
  getPermissionScope,
  type PermissionScope,
} from "$lib/server/auth/permissions";
import { getDatabase } from "$lib/server/db";
import { teams } from "$lib/server/db/schema";
import {
  ticketAreas,
  ticketWorkflowHistory,
  ticketWorkflowStages,
  ticketWorkflowStates,
  ticketWorkflows,
} from "$lib/server/db/ticketWorkflowSchema";
import { ticketEvents, tickets } from "$lib/server/db/supportSchema";
import {
  getUserSupportTeamIds,
  requireTicketAccess,
  type SupportPermissionMap,
} from "$lib/server/support/supportAccess";

export type TicketWorkflowKind = "global" | "area";
export type TicketWorkflowStageType = "normal" | "area_gateway" | "terminal";
export type TicketLifecycleStatus =
  | "new"
  | "open"
  | "in_progress"
  | "waiting_customer"
  | "resolved"
  | "closed";

export type TicketWorkflowStageInput = {
  name: string;
  stageType: TicketWorkflowStageType;
  linkedAreaId: string | null;
  lifecycleStatus: TicketLifecycleStatus;
};

export type TicketAreaInput = {
  name: string;
  teamId: string | null;
};

function requireTicketScope(
  permissions: SupportPermissionMap,
  permissionCode: string,
): PermissionScope {
  const scope = getPermissionScope(permissions, permissionCode);
  if (!scope) throw new Error("TICKET_WORKFLOW_PERMISSION_NOT_ALLOWED");
  return scope;
}

function lifecycleDates(status: TicketLifecycleStatus, now: Date) {
  return {
    resolvedAt: status === "resolved" || status === "closed" ? now : null,
    closedAt: status === "closed" ? now : null,
  };
}

function validateStageInput(
  workflowKind: TicketWorkflowKind,
  input: TicketWorkflowStageInput,
): void {
  const cleanName = input.name.trim();
  if (cleanName.length < 2 || cleanName.length > 80) {
    throw new Error("TICKET_WORKFLOW_STAGE_NAME_INVALID");
  }

  if (workflowKind === "area" && input.stageType === "area_gateway") {
    throw new Error("TICKET_WORKFLOW_AREA_GATEWAY_INVALID");
  }
  if (workflowKind === "area" && input.linkedAreaId) {
    throw new Error("TICKET_WORKFLOW_AREA_LINK_INVALID");
  }
  if (
    workflowKind === "area" &&
    (input.lifecycleStatus === "new" ||
      input.lifecycleStatus === "resolved" ||
      input.lifecycleStatus === "closed")
  ) {
    throw new Error("TICKET_WORKFLOW_AREA_LIFECYCLE_INVALID");
  }
  if (
    workflowKind === "global" &&
    input.stageType !== "terminal" &&
    (input.lifecycleStatus === "resolved" || input.lifecycleStatus === "closed")
  ) {
    throw new Error("TICKET_WORKFLOW_ACTIVE_STAGE_LIFECYCLE_INVALID");
  }
  if (
    workflowKind === "global" &&
    input.stageType === "terminal" &&
    input.lifecycleStatus !== "resolved" &&
    input.lifecycleStatus !== "closed"
  ) {
    throw new Error("TICKET_WORKFLOW_TERMINAL_LIFECYCLE_INVALID");
  }
  if (input.stageType === "area_gateway" && !input.linkedAreaId) {
    throw new Error("TICKET_WORKFLOW_GATEWAY_AREA_REQUIRED");
  }
  if (input.stageType !== "area_gateway" && input.linkedAreaId) {
    throw new Error("TICKET_WORKFLOW_AREA_LINK_INVALID");
  }
}

async function requireActiveArea(areaId: string): Promise<void> {
  const db = getDatabase();
  const [area] = await db
    .select({ id: ticketAreas.id })
    .from(ticketAreas)
    .where(and(eq(ticketAreas.id, areaId), eq(ticketAreas.active, true)))
    .limit(1);
  if (!area) throw new Error("TICKET_AREA_NOT_FOUND");
}

async function canAccessAreaInternal(
  actorUserId: string,
  scope: PermissionScope,
  areaId: string,
): Promise<boolean> {
  if (scope === "all") return true;

  const db = getDatabase();
  const [area] = await db
    .select({ teamId: ticketAreas.teamId })
    .from(ticketAreas)
    .where(and(eq(ticketAreas.id, areaId), eq(ticketAreas.active, true)))
    .limit(1);
  if (!area) return false;
  if (!area.teamId) return true;

  const teamIds = await getUserSupportTeamIds(actorUserId);
  return teamIds.includes(area.teamId);
}

export async function requireTicketAreaAccess(
  actorUserId: string,
  permissions: SupportPermissionMap,
  areaId: string,
  permissionCode = "tickets.view",
): Promise<void> {
  const scope = requireTicketScope(permissions, permissionCode);
  if (!(await canAccessAreaInternal(actorUserId, scope, areaId))) {
    throw new Error("TICKET_WORKFLOW_AREA_ACCESS_DENIED");
  }
}

export async function listTicketWorkflowTeams() {
  const db = getDatabase();
  return db
    .select({ id: teams.id, name: teams.name })
    .from(teams)
    .where(eq(teams.active, true))
    .orderBy(asc(teams.name));
}

export async function listTicketAreas() {
  const db = getDatabase();
  const [areas, teamRows] = await Promise.all([
    db
      .select({
        id: ticketAreas.id,
        name: ticketAreas.name,
        teamId: ticketAreas.teamId,
        active: ticketAreas.active,
        updatedAt: ticketAreas.updatedAt,
      })
      .from(ticketAreas)
      .where(eq(ticketAreas.active, true))
      .orderBy(asc(ticketAreas.name)),
    listTicketWorkflowTeams(),
  ]);
  const teamNames = new Map(teamRows.map((team) => [team.id, team.name]));
  return areas.map((area) => ({
    ...area,
    teamName: area.teamId ? teamNames.get(area.teamId) ?? "Equipe indisponível" : null,
  }));
}

export async function listTicketWorkflowConfiguration() {
  const db = getDatabase();
  const [workflows, stages, areas] = await Promise.all([
    db
      .select({
        id: ticketWorkflows.id,
        name: ticketWorkflows.name,
        kind: ticketWorkflows.kind,
        areaId: ticketWorkflows.areaId,
        active: ticketWorkflows.active,
        updatedAt: ticketWorkflows.updatedAt,
      })
      .from(ticketWorkflows)
      .where(eq(ticketWorkflows.active, true))
      .orderBy(asc(ticketWorkflows.kind), asc(ticketWorkflows.name)),
    db
      .select({
        id: ticketWorkflowStages.id,
        workflowId: ticketWorkflowStages.workflowId,
        code: ticketWorkflowStages.code,
        name: ticketWorkflowStages.name,
        stageType: ticketWorkflowStages.stageType,
        linkedAreaId: ticketWorkflowStages.linkedAreaId,
        lifecycleStatus: ticketWorkflowStages.lifecycleStatus,
        isInitial: ticketWorkflowStages.isInitial,
        sortOrder: ticketWorkflowStages.sortOrder,
        active: ticketWorkflowStages.active,
      })
      .from(ticketWorkflowStages)
      .where(eq(ticketWorkflowStages.active, true))
      .orderBy(asc(ticketWorkflowStages.sortOrder), asc(ticketWorkflowStages.createdAt)),
    listTicketAreas(),
  ]);

  const areaById = new Map<
    string,
    { id: string; name: string; teamId: string | null; teamName: string | null }
  >(
    (
      areas as Array<{
        id: string;
        name: string;
        teamId: string | null;
        teamName: string | null;
      }>
    ).map((area) => [area.id, area]),
  );
  return workflows.map((workflow) => ({
    ...workflow,
    areaName: workflow.areaId
      ? areaById.get(workflow.areaId)?.name ?? "Área indisponível"
      : null,
    areaTeamId: workflow.areaId
      ? areaById.get(workflow.areaId)?.teamId ?? null
      : null,
    areaTeamName: workflow.areaId
      ? areaById.get(workflow.areaId)?.teamName ?? null
      : null,
    stages: stages
      .filter((stage) => stage.workflowId === workflow.id)
      .map((stage) => ({
        ...stage,
        linkedAreaName: stage.linkedAreaId
          ? areaById.get(stage.linkedAreaId)?.name ?? "Área indisponível"
          : null,
      })),
  }));
}

export async function getTicketWorkflowBoard(
  actorUserId: string,
  permissions: SupportPermissionMap,
  visibleTicketIds: string[],
) {
  const scope = requireTicketScope(permissions, "tickets.view");
  const [configuration, areas] = await Promise.all([
    listTicketWorkflowConfiguration(),
    listTicketAreas(),
  ]);
  const globalWorkflow =
    configuration.find((workflow) => workflow.kind === "global") ?? null;
  const teamIds = scope === "all" ? [] : await getUserSupportTeamIds(actorUserId);
  const visibleAreaIds = new Set(
    areas
      .filter(
        (area) => scope === "all" || !area.teamId || teamIds.includes(area.teamId),
      )
      .map((area) => area.id),
  );
  const areaWorkflows = configuration.filter(
    (workflow) =>
      workflow.kind === "area" &&
      Boolean(workflow.areaId && visibleAreaIds.has(workflow.areaId)),
  );

  const db = getDatabase();
  const rawStates =
    visibleTicketIds.length > 0
      ? await db
          .select({
            ticketId: ticketWorkflowStates.ticketId,
            globalWorkflowId: ticketWorkflowStates.globalWorkflowId,
            globalStageId: ticketWorkflowStates.globalStageId,
            areaId: ticketWorkflowStates.areaId,
            areaWorkflowId: ticketWorkflowStates.areaWorkflowId,
            areaStageId: ticketWorkflowStates.areaStageId,
            enteredAt: ticketWorkflowStates.enteredAt,
            areaEnteredAt: ticketWorkflowStates.areaEnteredAt,
          })
          .from(ticketWorkflowStates)
          .where(inArray(ticketWorkflowStates.ticketId, visibleTicketIds))
      : [];

  const states = rawStates.map((state) => {
    if (state.areaId && !visibleAreaIds.has(state.areaId)) {
      return {
        ...state,
        areaWorkflowId: null,
        areaStageId: null,
        areaEnteredAt: null,
      };
    }
    return state;
  });

  return { globalWorkflow, areaWorkflows, areas, states };
}

export async function getTicketWorkflowContext(
  actorUserId: string,
  permissions: SupportPermissionMap,
  ticketId: string,
) {
  const scope = requireTicketScope(permissions, "tickets.view");
  const db = getDatabase();
  const [state] = await db
    .select({
      globalWorkflowId: ticketWorkflowStates.globalWorkflowId,
      globalStageId: ticketWorkflowStates.globalStageId,
      areaId: ticketWorkflowStates.areaId,
      areaWorkflowId: ticketWorkflowStates.areaWorkflowId,
      areaStageId: ticketWorkflowStates.areaStageId,
      enteredAt: ticketWorkflowStates.enteredAt,
      areaEnteredAt: ticketWorkflowStates.areaEnteredAt,
    })
    .from(ticketWorkflowStates)
    .where(eq(ticketWorkflowStates.ticketId, ticketId))
    .limit(1);
  if (!state) return null;

  const [configuration, areas] = await Promise.all([
    listTicketWorkflowConfiguration(),
    listTicketAreas(),
  ]);
  const globalWorkflow =
    configuration.find((workflow) => workflow.id === state.globalWorkflowId) ?? null;
  const globalStage =
    globalWorkflow?.stages.find((stage) => stage.id === state.globalStageId) ?? null;
  const area = state.areaId
    ? areas.find((item) => item.id === state.areaId) ?? null
    : null;
  const canViewArea = state.areaId
    ? await canAccessAreaInternal(actorUserId, scope, state.areaId)
    : false;
  const areaWorkflow =
    canViewArea && state.areaWorkflowId
      ? configuration.find((workflow) => workflow.id === state.areaWorkflowId) ?? null
      : null;
  const areaStage =
    areaWorkflow && state.areaStageId
      ? areaWorkflow.stages.find((stage) => stage.id === state.areaStageId) ?? null
      : null;

  return {
    ...state,
    globalWorkflowName: globalWorkflow?.name ?? "Fluxo global",
    globalStageName: globalStage?.name ?? "Etapa indisponível",
    globalStageType: globalStage?.stageType ?? "normal",
    areaName: area?.name ?? null,
    areaWorkflowName: areaWorkflow?.name ?? null,
    areaStageName: areaStage?.name ?? null,
    areaStageType: areaStage?.stageType ?? null,
    canViewAreaDetails: canViewArea,
  };
}

export async function initializeTicketWorkflowState(ticketId: string): Promise<void> {
  const db = getDatabase();
  const [[ticket], [existing]] = await Promise.all([
    db
      .select({ status: tickets.status })
      .from(tickets)
      .where(eq(tickets.id, ticketId))
      .limit(1),
    db
      .select({ ticketId: ticketWorkflowStates.ticketId })
      .from(ticketWorkflowStates)
      .where(eq(ticketWorkflowStates.ticketId, ticketId))
      .limit(1),
  ]);
  if (!ticket || existing) return;

  const [globalWorkflow] = await db
    .select({ id: ticketWorkflows.id })
    .from(ticketWorkflows)
    .where(and(eq(ticketWorkflows.kind, "global"), eq(ticketWorkflows.active, true)))
    .orderBy(asc(ticketWorkflows.createdAt))
    .limit(1);
  if (!globalWorkflow) return;

  const globalStages = await db
    .select({
      id: ticketWorkflowStages.id,
      lifecycleStatus: ticketWorkflowStages.lifecycleStatus,
      isInitial: ticketWorkflowStages.isInitial,
    })
    .from(ticketWorkflowStages)
    .where(
      and(
        eq(ticketWorkflowStages.workflowId, globalWorkflow.id),
        eq(ticketWorkflowStages.active, true),
      ),
    )
    .orderBy(desc(ticketWorkflowStages.isInitial), asc(ticketWorkflowStages.sortOrder));
  const selected =
    globalStages.find((stage) => stage.lifecycleStatus === ticket.status) ??
    globalStages.find((stage) => stage.isInitial) ??
    globalStages[0];
  if (!selected) return;

  const now = new Date();
  await db
    .insert(ticketWorkflowStates)
    .values({
      ticketId,
      globalWorkflowId: globalWorkflow.id,
      globalStageId: selected.id,
      enteredAt: now,
      updatedAt: now,
    })
    .onConflictDoNothing();
}

export async function createTicketArea(
  actorUserId: string,
  input: TicketAreaInput,
): Promise<string> {
  const cleanName = input.name.trim();
  if (cleanName.length < 2 || cleanName.length > 80) {
    throw new Error("TICKET_AREA_NAME_INVALID");
  }
  const db = getDatabase();
  if (input.teamId) {
    const [team] = await db
      .select({ id: teams.id })
      .from(teams)
      .where(and(eq(teams.id, input.teamId), eq(teams.active, true)))
      .limit(1);
    if (!team) throw new Error("TICKET_AREA_TEAM_NOT_FOUND");
  }

  return db.transaction(async (tx) => {
    const [area] = await tx
      .insert(ticketAreas)
      .values({ name: cleanName, teamId: input.teamId, createdBy: actorUserId })
      .returning({ id: ticketAreas.id });
    if (!area) throw new Error("TICKET_AREA_NOT_CREATED");

    const [workflow] = await tx
      .insert(ticketWorkflows)
      .values({
        name: `Processo · ${cleanName}`,
        kind: "area",
        areaId: area.id,
        createdBy: actorUserId,
      })
      .returning({ id: ticketWorkflows.id });
    if (!workflow) throw new Error("TICKET_WORKFLOW_NOT_CREATED");

    await tx.insert(ticketWorkflowStages).values({
      workflowId: workflow.id,
      name: "Recebido",
      stageType: "normal",
      lifecycleStatus: "open",
      isInitial: true,
      sortOrder: 100,
    });
    return area.id;
  });
}

export async function updateTicketArea(
  areaId: string,
  input: TicketAreaInput,
): Promise<void> {
  const cleanName = input.name.trim();
  if (cleanName.length < 2 || cleanName.length > 80) {
    throw new Error("TICKET_AREA_NAME_INVALID");
  }
  const db = getDatabase();
  if (input.teamId) {
    const [team] = await db
      .select({ id: teams.id })
      .from(teams)
      .where(and(eq(teams.id, input.teamId), eq(teams.active, true)))
      .limit(1);
    if (!team) throw new Error("TICKET_AREA_TEAM_NOT_FOUND");
  }

  await db.transaction(async (tx) => {
    const [updated] = await tx
      .update(ticketAreas)
      .set({ name: cleanName, teamId: input.teamId, updatedAt: new Date() })
      .where(and(eq(ticketAreas.id, areaId), eq(ticketAreas.active, true)))
      .returning({ id: ticketAreas.id });
    if (!updated) throw new Error("TICKET_AREA_NOT_FOUND");

    await tx
      .update(ticketWorkflows)
      .set({ name: `Processo · ${cleanName}`, updatedAt: new Date() })
      .where(
        and(
          eq(ticketWorkflows.areaId, areaId),
          eq(ticketWorkflows.kind, "area"),
          eq(ticketWorkflows.active, true),
        ),
      );
  });
}

export async function archiveTicketArea(areaId: string): Promise<void> {
  const db = getDatabase();
  const [[stateUsage], [stageUsage]] = await Promise.all([
    db
      .select({ value: count() })
      .from(ticketWorkflowStates)
      .where(eq(ticketWorkflowStates.areaId, areaId)),
    db
      .select({ value: count() })
      .from(ticketWorkflowStages)
      .where(
        and(
          eq(ticketWorkflowStages.linkedAreaId, areaId),
          eq(ticketWorkflowStages.active, true),
        ),
      ),
  ]);
  if (Number(stateUsage?.value ?? 0) > 0) throw new Error("TICKET_AREA_IN_USE");
  if (Number(stageUsage?.value ?? 0) > 0) throw new Error("TICKET_AREA_LINKED");

  await db.transaction(async (tx) => {
    await tx
      .update(ticketWorkflows)
      .set({ active: false, updatedAt: new Date() })
      .where(and(eq(ticketWorkflows.areaId, areaId), eq(ticketWorkflows.kind, "area")));
    const [updated] = await tx
      .update(ticketAreas)
      .set({ active: false, updatedAt: new Date() })
      .where(and(eq(ticketAreas.id, areaId), eq(ticketAreas.active, true)))
      .returning({ id: ticketAreas.id });
    if (!updated) throw new Error("TICKET_AREA_NOT_FOUND");
  });
}

export async function renameTicketWorkflow(
  workflowId: string,
  name: string,
): Promise<void> {
  const cleanName = name.trim();
  if (cleanName.length < 2 || cleanName.length > 80) {
    throw new Error("TICKET_WORKFLOW_NAME_INVALID");
  }
  const db = getDatabase();
  const [updated] = await db
    .update(ticketWorkflows)
    .set({ name: cleanName, updatedAt: new Date() })
    .where(and(eq(ticketWorkflows.id, workflowId), eq(ticketWorkflows.active, true)))
    .returning({ id: ticketWorkflows.id });
  if (!updated) throw new Error("TICKET_WORKFLOW_NOT_FOUND");
}

export async function addTicketWorkflowStage(
  workflowId: string,
  input: TicketWorkflowStageInput,
): Promise<string> {
  const db = getDatabase();
  const [workflow] = await db
    .select({ id: ticketWorkflows.id, kind: ticketWorkflows.kind })
    .from(ticketWorkflows)
    .where(and(eq(ticketWorkflows.id, workflowId), eq(ticketWorkflows.active, true)))
    .limit(1);
  if (!workflow) throw new Error("TICKET_WORKFLOW_NOT_FOUND");
  validateStageInput(workflow.kind, input);
  if (input.linkedAreaId) await requireActiveArea(input.linkedAreaId);

  const [[sortResult], [stageCount]] = await Promise.all([
    db
      .select({ value: max(ticketWorkflowStages.sortOrder) })
      .from(ticketWorkflowStages)
      .where(eq(ticketWorkflowStages.workflowId, workflowId)),
    db
      .select({ value: count() })
      .from(ticketWorkflowStages)
      .where(
        and(
          eq(ticketWorkflowStages.workflowId, workflowId),
          eq(ticketWorkflowStages.active, true),
        ),
      ),
  ]);

  const [stage] = await db
    .insert(ticketWorkflowStages)
    .values({
      workflowId,
      name: input.name.trim(),
      stageType: input.stageType,
      linkedAreaId: input.linkedAreaId,
      lifecycleStatus: input.lifecycleStatus,
      isInitial: Number(stageCount?.value ?? 0) === 0,
      sortOrder: Number(sortResult?.value ?? 0) + 100,
    })
    .returning({ id: ticketWorkflowStages.id });
  if (!stage) throw new Error("TICKET_WORKFLOW_STAGE_NOT_CREATED");
  return stage.id;
}

export async function updateTicketWorkflowStage(
  stageId: string,
  input: TicketWorkflowStageInput,
): Promise<void> {
  const db = getDatabase();
  const [current] = await db
    .select({
      workflowId: ticketWorkflowStages.workflowId,
      stageType: ticketWorkflowStages.stageType,
      linkedAreaId: ticketWorkflowStages.linkedAreaId,
      workflowKind: ticketWorkflows.kind,
    })
    .from(ticketWorkflowStages)
    .innerJoin(ticketWorkflows, eq(ticketWorkflowStages.workflowId, ticketWorkflows.id))
    .where(
      and(
        eq(ticketWorkflowStages.id, stageId),
        eq(ticketWorkflowStages.active, true),
        eq(ticketWorkflows.active, true),
      ),
    )
    .limit(1);
  if (!current) throw new Error("TICKET_WORKFLOW_STAGE_NOT_FOUND");
  validateStageInput(current.workflowKind, input);
  if (input.linkedAreaId) await requireActiveArea(input.linkedAreaId);

  const structuralChange =
    current.stageType !== input.stageType || current.linkedAreaId !== input.linkedAreaId;
  if (structuralChange) {
    const [usage] = await db
      .select({ value: count() })
      .from(ticketWorkflowStates)
      .where(
        current.workflowKind === "global"
          ? eq(ticketWorkflowStates.globalStageId, stageId)
          : eq(ticketWorkflowStates.areaStageId, stageId),
      );
    if (Number(usage?.value ?? 0) > 0) {
      throw new Error("TICKET_WORKFLOW_STAGE_STRUCTURE_IN_USE");
    }
  }

  await db
    .update(ticketWorkflowStages)
    .set({
      name: input.name.trim(),
      stageType: input.stageType,
      linkedAreaId: input.linkedAreaId,
      linkedQueueId: null,
      lifecycleStatus: input.lifecycleStatus,
      updatedAt: new Date(),
    })
    .where(eq(ticketWorkflowStages.id, stageId));
}

export async function setTicketWorkflowInitialStage(stageId: string): Promise<void> {
  const db = getDatabase();
  const [stage] = await db
    .select({ workflowId: ticketWorkflowStages.workflowId })
    .from(ticketWorkflowStages)
    .where(and(eq(ticketWorkflowStages.id, stageId), eq(ticketWorkflowStages.active, true)))
    .limit(1);
  if (!stage) throw new Error("TICKET_WORKFLOW_STAGE_NOT_FOUND");

  await db.transaction(async (tx) => {
    await tx
      .update(ticketWorkflowStages)
      .set({ isInitial: false, updatedAt: new Date() })
      .where(eq(ticketWorkflowStages.workflowId, stage.workflowId));
    await tx
      .update(ticketWorkflowStages)
      .set({ isInitial: true, updatedAt: new Date() })
      .where(eq(ticketWorkflowStages.id, stageId));
  });
}

export async function reorderTicketWorkflowStage(
  stageId: string,
  direction: "up" | "down",
): Promise<void> {
  const db = getDatabase();
  const [stage] = await db
    .select({ id: ticketWorkflowStages.id, workflowId: ticketWorkflowStages.workflowId })
    .from(ticketWorkflowStages)
    .where(and(eq(ticketWorkflowStages.id, stageId), eq(ticketWorkflowStages.active, true)))
    .limit(1);
  if (!stage) throw new Error("TICKET_WORKFLOW_STAGE_NOT_FOUND");

  const stages = await db
    .select({ id: ticketWorkflowStages.id, sortOrder: ticketWorkflowStages.sortOrder })
    .from(ticketWorkflowStages)
    .where(
      and(
        eq(ticketWorkflowStages.workflowId, stage.workflowId),
        eq(ticketWorkflowStages.active, true),
      ),
    )
    .orderBy(asc(ticketWorkflowStages.sortOrder), asc(ticketWorkflowStages.createdAt));
  const currentIndex = stages.findIndex((item) => item.id === stageId);
  const targetIndex = direction === "up" ? currentIndex - 1 : currentIndex + 1;
  if (currentIndex < 0 || targetIndex < 0 || targetIndex >= stages.length) return;

  const current = stages[currentIndex];
  const target = stages[targetIndex];
  await db.transaction(async (tx) => {
    await tx
      .update(ticketWorkflowStages)
      .set({ sortOrder: target.sortOrder, updatedAt: new Date() })
      .where(eq(ticketWorkflowStages.id, current.id));
    await tx
      .update(ticketWorkflowStages)
      .set({ sortOrder: current.sortOrder, updatedAt: new Date() })
      .where(eq(ticketWorkflowStages.id, target.id));
  });
}

export async function archiveTicketWorkflowStage(stageId: string): Promise<void> {
  const db = getDatabase();
  const [stage] = await db
    .select({
      workflowId: ticketWorkflowStages.workflowId,
      isInitial: ticketWorkflowStages.isInitial,
      workflowKind: ticketWorkflows.kind,
    })
    .from(ticketWorkflowStages)
    .innerJoin(ticketWorkflows, eq(ticketWorkflowStages.workflowId, ticketWorkflows.id))
    .where(and(eq(ticketWorkflowStages.id, stageId), eq(ticketWorkflowStages.active, true)))
    .limit(1);
  if (!stage) throw new Error("TICKET_WORKFLOW_STAGE_NOT_FOUND");
  if (stage.isInitial) throw new Error("TICKET_WORKFLOW_INITIAL_STAGE_ARCHIVE_BLOCKED");

  const [[usage], [activeCount]] = await Promise.all([
    db
      .select({ value: count() })
      .from(ticketWorkflowStates)
      .where(
        stage.workflowKind === "global"
          ? eq(ticketWorkflowStates.globalStageId, stageId)
          : eq(ticketWorkflowStates.areaStageId, stageId),
      ),
    db
      .select({ value: count() })
      .from(ticketWorkflowStages)
      .where(
        and(
          eq(ticketWorkflowStages.workflowId, stage.workflowId),
          eq(ticketWorkflowStages.active, true),
        ),
      ),
  ]);
  if (Number(usage?.value ?? 0) > 0) throw new Error("TICKET_WORKFLOW_STAGE_IN_USE");
  if (Number(activeCount?.value ?? 0) <= 1) {
    throw new Error("TICKET_WORKFLOW_LAST_STAGE_ARCHIVE_BLOCKED");
  }

  await db
    .update(ticketWorkflowStages)
    .set({ active: false, updatedAt: new Date() })
    .where(eq(ticketWorkflowStages.id, stageId));
}

export async function moveTicketGlobalStage(
  actorUserId: string,
  permissions: SupportPermissionMap,
  ticketId: string,
  targetStageId: string,
): Promise<void> {
  const scope = requireTicketScope(permissions, "tickets.reply");
  await requireTicketAccess(actorUserId, scope, ticketId);
  await initializeTicketWorkflowState(ticketId);

  const db = getDatabase();
  const now = new Date();
  await db.transaction(async (tx) => {
    await tx.execute(sql`SELECT pg_advisory_xact_lock(hashtext(${ticketId}))`);

    const [[ticket], [state], [target]] = await Promise.all([
      tx
        .select({ queueId: tickets.queueId })
        .from(tickets)
        .where(eq(tickets.id, ticketId))
        .limit(1),
      tx
        .select({
          globalWorkflowId: ticketWorkflowStates.globalWorkflowId,
          globalStageId: ticketWorkflowStates.globalStageId,
          areaId: ticketWorkflowStates.areaId,
          areaWorkflowId: ticketWorkflowStates.areaWorkflowId,
          areaStageId: ticketWorkflowStates.areaStageId,
        })
        .from(ticketWorkflowStates)
        .where(eq(ticketWorkflowStates.ticketId, ticketId))
        .limit(1),
      tx
        .select({
          id: ticketWorkflowStages.id,
          workflowId: ticketWorkflowStages.workflowId,
          name: ticketWorkflowStages.name,
          stageType: ticketWorkflowStages.stageType,
          linkedAreaId: ticketWorkflowStages.linkedAreaId,
          lifecycleStatus: ticketWorkflowStages.lifecycleStatus,
          workflowKind: ticketWorkflows.kind,
        })
        .from(ticketWorkflowStages)
        .innerJoin(ticketWorkflows, eq(ticketWorkflowStages.workflowId, ticketWorkflows.id))
        .where(
          and(
            eq(ticketWorkflowStages.id, targetStageId),
            eq(ticketWorkflowStages.active, true),
            eq(ticketWorkflows.active, true),
          ),
        )
        .limit(1),
    ]);

    if (!ticket || !state) throw new Error("TICKET_WORKFLOW_STATE_NOT_FOUND");
    if (
      !target ||
      target.workflowKind !== "global" ||
      target.workflowId !== state.globalWorkflowId
    ) {
      throw new Error("TICKET_WORKFLOW_GLOBAL_STAGE_INVALID");
    }
    if (target.id === state.globalStageId && !state.areaId) return;

    let targetAreaId: string | null = null;
    let targetAreaWorkflowId: string | null = null;
    let targetAreaStageId: string | null = null;

    if (target.stageType === "area_gateway") {
      if (!target.linkedAreaId) {
        throw new Error("TICKET_WORKFLOW_GATEWAY_AREA_REQUIRED");
      }
      const [areaWorkflow] = await tx
        .select({ id: ticketWorkflows.id })
        .from(ticketWorkflows)
        .where(
          and(
            eq(ticketWorkflows.kind, "area"),
            eq(ticketWorkflows.areaId, target.linkedAreaId),
            eq(ticketWorkflows.active, true),
          ),
        )
        .limit(1);
      if (!areaWorkflow) throw new Error("TICKET_WORKFLOW_AREA_NOT_CONFIGURED");

      const [initialAreaStage] = await tx
        .select({ id: ticketWorkflowStages.id })
        .from(ticketWorkflowStages)
        .where(
          and(
            eq(ticketWorkflowStages.workflowId, areaWorkflow.id),
            eq(ticketWorkflowStages.active, true),
          ),
        )
        .orderBy(desc(ticketWorkflowStages.isInitial), asc(ticketWorkflowStages.sortOrder))
        .limit(1);
      if (!initialAreaStage) throw new Error("TICKET_WORKFLOW_AREA_EMPTY");

      targetAreaId = target.linkedAreaId;
      targetAreaWorkflowId = areaWorkflow.id;
      targetAreaStageId = initialAreaStage.id;
    }

    const areaChanged = state.areaId !== targetAreaId;
    const transitionType = state.areaId ? "handoff" : "global_move";
    await tx
      .update(ticketWorkflowStates)
      .set({
        globalStageId: target.id,
        areaId: targetAreaId,
        areaWorkflowId: targetAreaWorkflowId,
        areaStageId: targetAreaStageId,
        enteredAt: now,
        areaEnteredAt: targetAreaStageId ? now : null,
        updatedAt: now,
      })
      .where(eq(ticketWorkflowStates.ticketId, ticketId));

    await tx
      .update(tickets)
      .set({
        ...(areaChanged ? { assignedUserId: null } : {}),
        status: target.lifecycleStatus,
        ...lifecycleDates(target.lifecycleStatus, now),
        updatedAt: now,
      })
      .where(eq(tickets.id, ticketId));

    await tx.insert(ticketWorkflowHistory).values({
      ticketId,
      actorUserId,
      transitionType,
      fromWorkflowId: state.areaWorkflowId ?? state.globalWorkflowId,
      toWorkflowId: target.workflowId,
      fromStageId: state.areaStageId ?? state.globalStageId,
      toStageId: target.id,
      fromAreaId: state.areaId,
      toAreaId: targetAreaId,
      fromQueueId: ticket.queueId,
      toQueueId: ticket.queueId,
    });

    await tx.insert(ticketEvents).values({
      ticketId,
      actorUserId,
      eventType:
        transitionType === "handoff"
          ? "ticket.workflow.handoff"
          : "ticket.workflow.global.moved",
      metadata: {
        fromStageId: state.globalStageId,
        toStageId: target.id,
        toStageName: target.name,
        fromAreaId: state.areaId,
        toAreaId: targetAreaId,
        enteredArea: Boolean(targetAreaId),
        assigneeCleared: areaChanged,
      },
    });
  });
}

export async function moveTicketAreaStage(
  actorUserId: string,
  permissions: SupportPermissionMap,
  ticketId: string,
  targetStageId: string,
): Promise<void> {
  const scope = requireTicketScope(permissions, "tickets.reply");
  await requireTicketAccess(actorUserId, scope, ticketId);
  await initializeTicketWorkflowState(ticketId);

  const db = getDatabase();
  const [preState] = await db
    .select({ areaId: ticketWorkflowStates.areaId })
    .from(ticketWorkflowStates)
    .where(eq(ticketWorkflowStates.ticketId, ticketId))
    .limit(1);
  if (!preState?.areaId) throw new Error("TICKET_WORKFLOW_AREA_STATE_NOT_FOUND");
  await requireTicketAreaAccess(
    actorUserId,
    permissions,
    preState.areaId,
    "tickets.reply",
  );

  const now = new Date();
  await db.transaction(async (tx) => {
    await tx.execute(sql`SELECT pg_advisory_xact_lock(hashtext(${ticketId}))`);
    const [[ticket], [state], [target]] = await Promise.all([
      tx
        .select({ queueId: tickets.queueId })
        .from(tickets)
        .where(eq(tickets.id, ticketId))
        .limit(1),
      tx
        .select({
          areaId: ticketWorkflowStates.areaId,
          areaWorkflowId: ticketWorkflowStates.areaWorkflowId,
          areaStageId: ticketWorkflowStates.areaStageId,
        })
        .from(ticketWorkflowStates)
        .where(eq(ticketWorkflowStates.ticketId, ticketId))
        .limit(1),
      tx
        .select({
          id: ticketWorkflowStages.id,
          workflowId: ticketWorkflowStages.workflowId,
          name: ticketWorkflowStages.name,
          stageType: ticketWorkflowStages.stageType,
          lifecycleStatus: ticketWorkflowStages.lifecycleStatus,
        })
        .from(ticketWorkflowStages)
        .where(
          and(
            eq(ticketWorkflowStages.id, targetStageId),
            eq(ticketWorkflowStages.active, true),
          ),
        )
        .limit(1),
    ]);

    if (!ticket || !state?.areaId || !state.areaWorkflowId || !state.areaStageId) {
      throw new Error("TICKET_WORKFLOW_AREA_STATE_NOT_FOUND");
    }
    if (
      !target ||
      target.workflowId !== state.areaWorkflowId ||
      target.stageType === "area_gateway"
    ) {
      throw new Error("TICKET_WORKFLOW_AREA_STAGE_INVALID");
    }
    if (target.id === state.areaStageId) return;

    await tx
      .update(ticketWorkflowStates)
      .set({ areaStageId: target.id, areaEnteredAt: now, updatedAt: now })
      .where(eq(ticketWorkflowStates.ticketId, ticketId));
    await tx
      .update(tickets)
      .set({
        status: target.lifecycleStatus,
        ...lifecycleDates(target.lifecycleStatus, now),
        updatedAt: now,
      })
      .where(eq(tickets.id, ticketId));
    await tx.insert(ticketWorkflowHistory).values({
      ticketId,
      actorUserId,
      transitionType: "area_move",
      fromWorkflowId: state.areaWorkflowId,
      toWorkflowId: state.areaWorkflowId,
      fromStageId: state.areaStageId,
      toStageId: target.id,
      fromAreaId: state.areaId,
      toAreaId: state.areaId,
      fromQueueId: ticket.queueId,
      toQueueId: ticket.queueId,
    });
    await tx.insert(ticketEvents).values({
      ticketId,
      actorUserId,
      eventType: "ticket.workflow.area.moved",
      metadata: {
        areaId: state.areaId,
        fromStageId: state.areaStageId,
        toStageId: target.id,
        toStageName: target.name,
        terminal: target.stageType === "terminal",
      },
    });
  });
}

export async function moveTicketToWorkflowLocation(
  actorUserId: string,
  permissions: SupportPermissionMap,
  ticketId: string,
  workflowId: string,
  stageId: string,
): Promise<void> {
  const scope = requireTicketScope(permissions, "tickets.reply");
  await requireTicketAccess(actorUserId, scope, ticketId);
  await initializeTicketWorkflowState(ticketId);

  const db = getDatabase();
  const [workflow] = await db
    .select({ kind: ticketWorkflows.kind, areaId: ticketWorkflows.areaId })
    .from(ticketWorkflows)
    .where(and(eq(ticketWorkflows.id, workflowId), eq(ticketWorkflows.active, true)))
    .limit(1);
  if (!workflow) throw new Error("TICKET_WORKFLOW_NOT_FOUND");

  if (workflow.kind === "global") {
    await moveTicketGlobalStage(actorUserId, permissions, ticketId, stageId);
    return;
  }
  if (!workflow.areaId) throw new Error("TICKET_AREA_NOT_FOUND");
  const targetAreaId = workflow.areaId;
  await requireTicketAreaAccess(
    actorUserId,
    permissions,
    targetAreaId,
    "tickets.reply",
  );

  const now = new Date();
  await db.transaction(async (tx) => {
    await tx.execute(sql`SELECT pg_advisory_xact_lock(hashtext(${ticketId}))`);

    const [[ticket], [state], [target]] = await Promise.all([
      tx
        .select({ queueId: tickets.queueId })
        .from(tickets)
        .where(eq(tickets.id, ticketId))
        .limit(1),
      tx
        .select({
          globalWorkflowId: ticketWorkflowStates.globalWorkflowId,
          globalStageId: ticketWorkflowStates.globalStageId,
          areaId: ticketWorkflowStates.areaId,
          areaWorkflowId: ticketWorkflowStates.areaWorkflowId,
          areaStageId: ticketWorkflowStates.areaStageId,
        })
        .from(ticketWorkflowStates)
        .where(eq(ticketWorkflowStates.ticketId, ticketId))
        .limit(1),
      tx
        .select({
          id: ticketWorkflowStages.id,
          name: ticketWorkflowStages.name,
          stageType: ticketWorkflowStages.stageType,
          lifecycleStatus: ticketWorkflowStages.lifecycleStatus,
        })
        .from(ticketWorkflowStages)
        .where(
          and(
            eq(ticketWorkflowStages.id, stageId),
            eq(ticketWorkflowStages.workflowId, workflowId),
            eq(ticketWorkflowStages.active, true),
          ),
        )
        .limit(1),
    ]);

    if (!ticket || !state || !target) {
      throw new Error("TICKET_WORKFLOW_STATE_NOT_FOUND");
    }
    if (target.stageType === "area_gateway") {
      throw new Error("TICKET_WORKFLOW_AREA_STAGE_INVALID");
    }

    const [gateway] = await tx
      .select({ id: ticketWorkflowStages.id })
      .from(ticketWorkflowStages)
      .where(
        and(
          eq(ticketWorkflowStages.workflowId, state.globalWorkflowId),
          eq(ticketWorkflowStages.stageType, "area_gateway"),
          eq(ticketWorkflowStages.linkedAreaId, targetAreaId),
          eq(ticketWorkflowStages.active, true),
        ),
      )
      .limit(1);
    if (!gateway) throw new Error("TICKET_WORKFLOW_AREA_NOT_IN_GLOBAL");

    const areaChanged = state.areaId !== targetAreaId;
    await tx
      .update(ticketWorkflowStates)
      .set({
        globalStageId: gateway.id,
        areaId: targetAreaId,
        areaWorkflowId: workflowId,
        areaStageId: target.id,
        ...(areaChanged ? { enteredAt: now } : {}),
        areaEnteredAt: now,
        updatedAt: now,
      })
      .where(eq(ticketWorkflowStates.ticketId, ticketId));
    await tx
      .update(tickets)
      .set({
        ...(areaChanged ? { assignedUserId: null } : {}),
        status: target.lifecycleStatus,
        ...lifecycleDates(target.lifecycleStatus, now),
        updatedAt: now,
      })
      .where(eq(tickets.id, ticketId));
    await tx.insert(ticketWorkflowHistory).values({
      ticketId,
      actorUserId,
      transitionType: areaChanged ? "handoff" : "area_move",
      fromWorkflowId: state.areaWorkflowId ?? state.globalWorkflowId,
      toWorkflowId: workflowId,
      fromStageId: state.areaStageId ?? state.globalStageId,
      toStageId: target.id,
      fromAreaId: state.areaId,
      toAreaId: targetAreaId,
      fromQueueId: ticket.queueId,
      toQueueId: ticket.queueId,
    });
    await tx.insert(ticketEvents).values({
      ticketId,
      actorUserId,
      eventType:
        areaChanged ? "ticket.workflow.handoff" : "ticket.workflow.area.moved",
      metadata: {
        fromAreaId: state.areaId,
        toAreaId: targetAreaId,
        toStageId: target.id,
        toStageName: target.name,
        assigneeCleared: areaChanged,
      },
    });
  });
}
