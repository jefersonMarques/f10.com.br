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
  hasPermission,
  type PermissionScope,
} from "$lib/server/auth/permissions";
import { getDatabase } from "$lib/server/db";
import {
  ticketWorkflowHistory,
  ticketWorkflowStages,
  ticketWorkflowStates,
  ticketWorkflows,
} from "$lib/server/db/ticketWorkflowSchema";
import { supportQueues, ticketEvents, tickets } from "$lib/server/db/supportSchema";
import {
  getUserSupportQueueIds,
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
  linkedQueueId: string | null;
  lifecycleStatus: TicketLifecycleStatus;
};

function requireTicketScope(
  permissions: SupportPermissionMap,
  permissionCode: string,
): PermissionScope {
  const scope = getPermissionScope(permissions, permissionCode);
  if (!scope) throw new Error("TICKET_WORKFLOW_PERMISSION_NOT_ALLOWED");
  return scope;
}

function validateStageInput(
  workflowKind: TicketWorkflowKind,
  input: TicketWorkflowStageInput,
): void {
  if (input.name.trim().length < 2 || input.name.trim().length > 80) {
    throw new Error("TICKET_WORKFLOW_STAGE_NAME_INVALID");
  }
  if (workflowKind === "area" && input.stageType === "area_gateway") {
    throw new Error("TICKET_WORKFLOW_AREA_GATEWAY_INVALID");
  }
  if (workflowKind === "area" && input.linkedQueueId) {
    throw new Error("TICKET_WORKFLOW_AREA_STAGE_QUEUE_INVALID");
  }
  if (
    workflowKind === "area" &&
    (input.lifecycleStatus === "new" || input.lifecycleStatus === "resolved" || input.lifecycleStatus === "closed")
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
  if (input.stageType === "area_gateway" && !input.linkedQueueId) {
    throw new Error("TICKET_WORKFLOW_GATEWAY_QUEUE_REQUIRED");
  }
}

function lifecycleDates(status: TicketLifecycleStatus, now: Date) {
  return {
    resolvedAt: status === "resolved" || status === "closed" ? now : null,
    closedAt: status === "closed" ? now : null,
  };
}

export async function listTicketWorkflowConfiguration() {
  const db = getDatabase();
  const [workflows, stages, queues] = await Promise.all([
    db
      .select({
        id: ticketWorkflows.id,
        name: ticketWorkflows.name,
        kind: ticketWorkflows.kind,
        queueId: ticketWorkflows.queueId,
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
        linkedQueueId: ticketWorkflowStages.linkedQueueId,
        lifecycleStatus: ticketWorkflowStages.lifecycleStatus,
        isInitial: ticketWorkflowStages.isInitial,
        sortOrder: ticketWorkflowStages.sortOrder,
        active: ticketWorkflowStages.active,
      })
      .from(ticketWorkflowStages)
      .where(eq(ticketWorkflowStages.active, true))
      .orderBy(asc(ticketWorkflowStages.sortOrder), asc(ticketWorkflowStages.createdAt)),
    db
      .select({ id: supportQueues.id, name: supportQueues.name })
      .from(supportQueues)
      .where(eq(supportQueues.active, true))
      .orderBy(asc(supportQueues.name)),
  ]);

  const queueNames = new Map(queues.map((queue) => [queue.id, queue.name]));
  return workflows.map((workflow) => ({
    ...workflow,
    queueName: workflow.queueId ? queueNames.get(workflow.queueId) ?? "Área indisponível" : null,
    stages: stages
      .filter((stage) => stage.workflowId === workflow.id)
      .map((stage) => ({
        ...stage,
        linkedQueueName: stage.linkedQueueId
          ? queueNames.get(stage.linkedQueueId) ?? "Área indisponível"
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
  const configuration = await listTicketWorkflowConfiguration();
  const globalWorkflow = configuration.find((workflow) => workflow.kind === "global") ?? null;
  const db = getDatabase();
  const states = visibleTicketIds.length > 0
    ? await db
        .select({
          ticketId: ticketWorkflowStates.ticketId,
          globalWorkflowId: ticketWorkflowStates.globalWorkflowId,
          globalStageId: ticketWorkflowStates.globalStageId,
          areaWorkflowId: ticketWorkflowStates.areaWorkflowId,
          areaStageId: ticketWorkflowStates.areaStageId,
          enteredAt: ticketWorkflowStates.enteredAt,
          areaEnteredAt: ticketWorkflowStates.areaEnteredAt,
        })
        .from(ticketWorkflowStates)
        .where(inArray(ticketWorkflowStates.ticketId, visibleTicketIds))
    : [];

  const visibleAreaWorkflowIds = new Set(
    states
      .map((state) => state.areaWorkflowId)
      .filter((workflowId): workflowId is string => Boolean(workflowId)),
  );
  const teamQueueIds = scope === "team"
    ? new Set(await getUserSupportQueueIds(actorUserId))
    : new Set<string>();
  const canViewEveryArea = scope === "all";
  const areaWorkflows = configuration.filter(
    (workflow) =>
      workflow.kind === "area" &&
      (canViewEveryArea ||
        visibleAreaWorkflowIds.has(workflow.id) ||
        (workflow.queueId ? teamQueueIds.has(workflow.queueId) : false)),
  );

  return {
    globalWorkflow,
    areaWorkflows,
    states,
  };
}

export async function getTicketWorkflowContext(ticketId: string) {
  const db = getDatabase();
  const [state] = await db
    .select({
      globalWorkflowId: ticketWorkflowStates.globalWorkflowId,
      globalStageId: ticketWorkflowStates.globalStageId,
      areaWorkflowId: ticketWorkflowStates.areaWorkflowId,
      areaStageId: ticketWorkflowStates.areaStageId,
      enteredAt: ticketWorkflowStates.enteredAt,
      areaEnteredAt: ticketWorkflowStates.areaEnteredAt,
    })
    .from(ticketWorkflowStates)
    .where(eq(ticketWorkflowStates.ticketId, ticketId))
    .limit(1);
  if (!state) return null;

  const configuration = await listTicketWorkflowConfiguration();
  const globalWorkflow = configuration.find((workflow) => workflow.id === state.globalWorkflowId) ?? null;
  const globalStage = globalWorkflow?.stages.find((stage) => stage.id === state.globalStageId) ?? null;
  const areaWorkflow = state.areaWorkflowId
    ? configuration.find((workflow) => workflow.id === state.areaWorkflowId) ?? null
    : null;
  const areaStage = areaWorkflow && state.areaStageId
    ? areaWorkflow.stages.find((stage) => stage.id === state.areaStageId) ?? null
    : null;

  return {
    ...state,
    globalWorkflowName: globalWorkflow?.name ?? "Fluxo global",
    globalStageName: globalStage?.name ?? "Etapa indisponível",
    globalStageType: globalStage?.stageType ?? "normal",
    areaWorkflowName: areaWorkflow?.name ?? null,
    areaName: areaWorkflow?.queueName ?? null,
    areaStageName: areaStage?.name ?? null,
    areaStageType: areaStage?.stageType ?? null,
  };
}

export async function initializeTicketWorkflowState(ticketId: string): Promise<void> {
  const db = getDatabase();
  const [[ticket], [existing]] = await Promise.all([
    db
      .select({ queueId: tickets.queueId, status: tickets.status })
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
      stageType: ticketWorkflowStages.stageType,
      linkedQueueId: ticketWorkflowStages.linkedQueueId,
      lifecycleStatus: ticketWorkflowStages.lifecycleStatus,
      isInitial: ticketWorkflowStages.isInitial,
      sortOrder: ticketWorkflowStages.sortOrder,
    })
    .from(ticketWorkflowStages)
    .where(
      and(
        eq(ticketWorkflowStages.workflowId, globalWorkflow.id),
        eq(ticketWorkflowStages.active, true),
      ),
    )
    .orderBy(desc(ticketWorkflowStages.isInitial), asc(ticketWorkflowStages.sortOrder));
  if (globalStages.length === 0) return;

  const gatewayForQueue = globalStages.find(
    (stage) => stage.stageType === "area_gateway" && stage.linkedQueueId === ticket.queueId,
  );
  const statusStage = globalStages.find((stage) => stage.lifecycleStatus === ticket.status);
  let selectedGlobalStage = gatewayForQueue ?? statusStage ?? globalStages[0];
  let areaWorkflowId: string | null = null;
  let areaStageId: string | null = null;

  if (selectedGlobalStage.stageType === "area_gateway" && selectedGlobalStage.linkedQueueId) {
    const [areaWorkflow] = await db
      .select({ id: ticketWorkflows.id })
      .from(ticketWorkflows)
      .where(
        and(
          eq(ticketWorkflows.kind, "area"),
          eq(ticketWorkflows.queueId, selectedGlobalStage.linkedQueueId),
          eq(ticketWorkflows.active, true),
        ),
      )
      .limit(1);
    if (areaWorkflow) {
      const [initialAreaStage] = await db
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
      if (initialAreaStage) {
        areaWorkflowId = areaWorkflow.id;
        areaStageId = initialAreaStage.id;
      } else {
        selectedGlobalStage = globalStages.find((stage) => stage.isInitial) ?? globalStages[0];
      }
    } else {
      selectedGlobalStage = globalStages.find((stage) => stage.isInitial) ?? globalStages[0];
    }
  }

  const now = new Date();
  await db
    .insert(ticketWorkflowStates)
    .values({
      ticketId,
      globalWorkflowId: globalWorkflow.id,
      globalStageId: selectedGlobalStage.id,
      areaWorkflowId,
      areaStageId,
      enteredAt: now,
      areaEnteredAt: areaStageId ? now : null,
      updatedAt: now,
    })
    .onConflictDoNothing();
}

export async function createAreaTicketWorkflow(
  actorUserId: string,
  name: string,
  queueId: string,
): Promise<string> {
  const cleanName = name.trim();
  if (cleanName.length < 2 || cleanName.length > 80) {
    throw new Error("TICKET_WORKFLOW_NAME_INVALID");
  }
  const db = getDatabase();
  const [queue] = await db
    .select({ id: supportQueues.id })
    .from(supportQueues)
    .where(and(eq(supportQueues.id, queueId), eq(supportQueues.active, true)))
    .limit(1);
  if (!queue) throw new Error("TICKET_WORKFLOW_QUEUE_NOT_FOUND");

  const [workflow] = await db
    .insert(ticketWorkflows)
    .values({
      name: cleanName,
      kind: "area",
      queueId,
      createdBy: actorUserId,
    })
    .returning({ id: ticketWorkflows.id });
  if (!workflow) throw new Error("TICKET_WORKFLOW_NOT_CREATED");
  return workflow.id;
}

export async function renameTicketWorkflow(workflowId: string, name: string): Promise<void> {
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

  if (input.linkedQueueId) {
    const [queue] = await db
      .select({ id: supportQueues.id })
      .from(supportQueues)
      .where(and(eq(supportQueues.id, input.linkedQueueId), eq(supportQueues.active, true)))
      .limit(1);
    if (!queue) throw new Error("TICKET_WORKFLOW_QUEUE_NOT_FOUND");
  }

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
      linkedQueueId: input.linkedQueueId,
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
      id: ticketWorkflowStages.id,
      workflowId: ticketWorkflowStages.workflowId,
      stageType: ticketWorkflowStages.stageType,
      linkedQueueId: ticketWorkflowStages.linkedQueueId,
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

  if (input.linkedQueueId) {
    const [queue] = await db
      .select({ id: supportQueues.id })
      .from(supportQueues)
      .where(and(eq(supportQueues.id, input.linkedQueueId), eq(supportQueues.active, true)))
      .limit(1);
    if (!queue) throw new Error("TICKET_WORKFLOW_QUEUE_NOT_FOUND");
  }

  const structuralChange =
    current.stageType !== input.stageType || current.linkedQueueId !== input.linkedQueueId;
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
      linkedQueueId: input.linkedQueueId,
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
  if (Number(activeCount?.value ?? 0) <= 1) throw new Error("TICKET_WORKFLOW_LAST_STAGE_ARCHIVE_BLOCKED");

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
          linkedQueueId: ticketWorkflowStages.linkedQueueId,
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
    if (!target || target.workflowKind !== "global") {
      throw new Error("TICKET_WORKFLOW_GLOBAL_STAGE_INVALID");
    }
    if (target.workflowId !== state.globalWorkflowId) {
      throw new Error("TICKET_WORKFLOW_GLOBAL_WORKFLOW_MISMATCH");
    }
    if (target.id === state.globalStageId) return;

    let currentAreaStageType: TicketWorkflowStageType | null = null;
    if (state.areaStageId) {
      const [currentAreaStage] = await tx
        .select({ stageType: ticketWorkflowStages.stageType })
        .from(ticketWorkflowStages)
        .where(eq(ticketWorkflowStages.id, state.areaStageId))
        .limit(1);
      currentAreaStageType = currentAreaStage?.stageType ?? null;
      if (
        currentAreaStageType !== "terminal" &&
        !hasPermission(permissions, "tickets.manage")
      ) {
        throw new Error("TICKET_WORKFLOW_AREA_NOT_COMPLETE");
      }
    }

    const [fromGlobalStage] = await tx
      .select({ name: ticketWorkflowStages.name })
      .from(ticketWorkflowStages)
      .where(eq(ticketWorkflowStages.id, state.globalStageId))
      .limit(1);

    let areaWorkflowId: string | null = null;
    let areaStageId: string | null = null;
    let targetQueueId = target.linkedQueueId ?? ticket.queueId;

    if (target.stageType === "area_gateway") {
      if (!target.linkedQueueId) throw new Error("TICKET_WORKFLOW_GATEWAY_QUEUE_REQUIRED");
      const [areaWorkflow] = await tx
        .select({ id: ticketWorkflows.id })
        .from(ticketWorkflows)
        .where(
          and(
            eq(ticketWorkflows.kind, "area"),
            eq(ticketWorkflows.queueId, target.linkedQueueId),
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

      areaWorkflowId = areaWorkflow.id;
      areaStageId = initialAreaStage.id;
      targetQueueId = target.linkedQueueId;
    }

    const transitionType = state.areaStageId ? "handoff" : "global_move";
    await tx
      .update(ticketWorkflowStates)
      .set({
        globalStageId: target.id,
        areaWorkflowId,
        areaStageId,
        enteredAt: now,
        areaEnteredAt: areaStageId ? now : null,
        updatedAt: now,
      })
      .where(eq(ticketWorkflowStates.ticketId, ticketId));

    const queueChanged = targetQueueId !== ticket.queueId;
    await tx
      .update(tickets)
      .set({
        queueId: targetQueueId,
        ...(queueChanged ? { assignedUserId: null } : {}),
        status: target.lifecycleStatus,
        ...lifecycleDates(target.lifecycleStatus, now),
        updatedAt: now,
      })
      .where(eq(tickets.id, ticketId));

    await tx.insert(ticketWorkflowHistory).values({
      ticketId,
      actorUserId,
      transitionType,
      fromWorkflowId: state.areaStageId ? state.areaWorkflowId : state.globalWorkflowId,
      toWorkflowId: target.workflowId,
      fromStageId: state.areaStageId ?? state.globalStageId,
      toStageId: target.id,
      fromQueueId: ticket.queueId,
      toQueueId: targetQueueId,
    });

    await tx.insert(ticketEvents).values({
      ticketId,
      actorUserId,
      eventType: transitionType === "handoff"
        ? "ticket.workflow.handoff"
        : "ticket.workflow.global.moved",
      metadata: {
        fromStageId: state.globalStageId,
        fromStageName: fromGlobalStage?.name ?? "",
        toStageId: target.id,
        toStageName: target.name,
        fromQueueId: ticket.queueId,
        toQueueId: targetQueueId,
        enteredArea: target.stageType === "area_gateway",
        assigneeCleared: queueChanged,
        bypassedAreaTerminal: Boolean(
          state.areaStageId && currentAreaStageType !== "terminal",
        ),
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

    if (!ticket || !state?.areaWorkflowId || !state.areaStageId) {
      throw new Error("TICKET_WORKFLOW_AREA_STATE_NOT_FOUND");
    }
    if (!target || target.workflowId !== state.areaWorkflowId || target.stageType === "area_gateway") {
      throw new Error("TICKET_WORKFLOW_AREA_STAGE_INVALID");
    }
    if (target.id === state.areaStageId) return;

    const [fromAreaStage] = await tx
      .select({ name: ticketWorkflowStages.name })
      .from(ticketWorkflowStages)
      .where(eq(ticketWorkflowStages.id, state.areaStageId))
      .limit(1);

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
      fromQueueId: ticket.queueId,
      toQueueId: ticket.queueId,
    });

    await tx.insert(ticketEvents).values({
      ticketId,
      actorUserId,
      eventType: "ticket.workflow.area.moved",
      metadata: {
        fromStageId: state.areaStageId,
        fromStageName: fromAreaStage?.name ?? "",
        toStageId: target.id,
        toStageName: target.name,
        queueId: ticket.queueId,
        terminal: target.stageType === "terminal",
      },
    });
  });
}
