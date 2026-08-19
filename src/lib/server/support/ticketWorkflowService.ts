import { and, eq, isNull, max, sql } from "drizzle-orm";
import { getDatabase } from "$lib/server/db";
import { teams } from "$lib/server/db/schema";
import {
  ticketAreas,
  ticketWorkflowStages,
  ticketWorkflowStates,
  ticketWorkflows,
} from "$lib/server/db/ticketWorkflowSchema";
import { tickets } from "$lib/server/db/supportSchema";
import type { SupportPermissionMap } from "$lib/server/support/supportAccess";
import {
  addTicketWorkflowStage,
  archiveTicketWorkflowStage,
  getTicketWorkflowBoard,
  listTicketWorkflowConfiguration,
  moveTicketGlobalStage,
  moveTicketToWorkflowLocation,
  updateTicketWorkflowStage,
  type TicketAreaInput,
  type TicketWorkflowStageInput,
} from "$lib/server/support/ticketWorkflowRepository";

export const TICKET_WORKFLOW_STAGE_COLORS = [
  "gray",
  "blue",
  "green",
  "yellow",
  "orange",
  "red",
  "purple",
  "sky",
  "lime",
  "pink",
] as const;

export type TicketWorkflowStageColor = (typeof TICKET_WORKFLOW_STAGE_COLORS)[number];

export type RequiredConclusionResult<T> = {
  value: T;
  conclusionCreated: boolean;
};

type MovementContext = {
  assignedUserId: string | null;
  areaId: string | null;
  areaWorkflowId: string | null;
  areaStageId: string | null;
  areaStageType: "normal" | "area_gateway" | "terminal" | null;
};

export function isTicketWorkflowStageColor(value: string): value is TicketWorkflowStageColor {
  return (TICKET_WORKFLOW_STAGE_COLORS as readonly string[]).includes(value);
}

async function listStageColors(): Promise<Map<string, TicketWorkflowStageColor>> {
  const db = getDatabase();
  const rows = await db
    .select({ id: ticketWorkflowStages.id, color: ticketWorkflowStages.color })
    .from(ticketWorkflowStages)
    .where(eq(ticketWorkflowStages.active, true));

  return new Map(
    rows.map((row) => [
      row.id,
      isTicketWorkflowStageColor(row.color) ? row.color : "gray",
    ]),
  );
}

function addColorsToWorkflow<T extends { stages: Array<{ id: string }> }>(
  workflow: T | null,
  colors: Map<string, TicketWorkflowStageColor>,
): (T & { stages: Array<T["stages"][number] & { color?: TicketWorkflowStageColor }> }) | null {
  if (!workflow) return null;
  return {
    ...workflow,
    stages: workflow.stages.map((stage) => ({
      ...stage,
      color: colors.get(stage.id) ?? "gray",
    })),
  };
}

export async function listTicketWorkflowConfigurationWithAppearance() {
  const [configuration, colors] = await Promise.all([
    listTicketWorkflowConfiguration(),
    listStageColors(),
  ]);

  return configuration.map((workflow) => addColorsToWorkflow(workflow, colors)!);
}

export async function getTicketWorkflowBoardWithAppearance(
  actorUserId: string,
  permissions: SupportPermissionMap,
  visibleTicketIds: string[],
) {
  const [board, colors] = await Promise.all([
    getTicketWorkflowBoard(actorUserId, permissions, visibleTicketIds),
    listStageColors(),
  ]);

  return {
    ...board,
    globalWorkflow: addColorsToWorkflow(board.globalWorkflow, colors),
    areaWorkflows: board.areaWorkflows.map(
      (workflow) => addColorsToWorkflow(workflow, colors)!,
    ),
  };
}

export async function updateTicketWorkflowStageColor(
  stageId: string,
  color: TicketWorkflowStageColor,
): Promise<void> {
  const db = getDatabase();
  const [stage] = await db
    .select({ id: ticketWorkflowStages.id })
    .from(ticketWorkflowStages)
    .innerJoin(ticketWorkflows, eq(ticketWorkflowStages.workflowId, ticketWorkflows.id))
    .where(
      and(
        eq(ticketWorkflowStages.id, stageId),
        eq(ticketWorkflowStages.active, true),
        eq(ticketWorkflows.active, true),
        eq(ticketWorkflows.kind, "area"),
      ),
    )
    .limit(1);

  if (!stage) throw new Error("TICKET_WORKFLOW_STAGE_COLOR_AREA_ONLY");

  await db
    .update(ticketWorkflowStages)
    .set({ color, updatedAt: new Date() })
    .where(eq(ticketWorkflowStages.id, stageId));
}

export async function ensureAreaWorkflowConclusionStage(
  workflowId: string,
): Promise<boolean> {
  const db = getDatabase();

  return db.transaction(async (tx) => {
    await tx.execute(
      sql`SELECT pg_advisory_xact_lock(hashtext(${`ticket-area-conclusion:${workflowId}`}))`,
    );

    const [workflow] = await tx
      .select({ id: ticketWorkflows.id, kind: ticketWorkflows.kind })
      .from(ticketWorkflows)
      .where(
        and(
          eq(ticketWorkflows.id, workflowId),
          eq(ticketWorkflows.active, true),
        ),
      )
      .limit(1);

    if (!workflow || workflow.kind !== "area") return false;

    const [terminalStage] = await tx
      .select({ id: ticketWorkflowStages.id })
      .from(ticketWorkflowStages)
      .where(
        and(
          eq(ticketWorkflowStages.workflowId, workflowId),
          eq(ticketWorkflowStages.stageType, "terminal"),
          eq(ticketWorkflowStages.active, true),
        ),
      )
      .limit(1);

    if (terminalStage) return false;

    const [sortResult] = await tx
      .select({ value: max(ticketWorkflowStages.sortOrder) })
      .from(ticketWorkflowStages)
      .where(eq(ticketWorkflowStages.workflowId, workflowId));

    await tx.insert(ticketWorkflowStages).values({
      workflowId,
      name: "Concluído",
      stageType: "terminal",
      lifecycleStatus: "in_progress",
      isInitial: false,
      sortOrder: Number(sortResult?.value ?? 0) + 100,
      color: "green",
      active: true,
    });

    return true;
  });
}

export async function createTicketAreaWithRequiredConclusion(
  actorUserId: string,
  input: TicketAreaInput,
): Promise<RequiredConclusionResult<string>> {
  const cleanName = input.name.trim();
  if (cleanName.length < 2 || cleanName.length > 80) {
    throw new Error("TICKET_AREA_NAME_INVALID");
  }

  const db = getDatabase();
  return db.transaction(async (tx) => {
    if (input.teamId) {
      const [team] = await tx
        .select({ id: teams.id })
        .from(teams)
        .where(and(eq(teams.id, input.teamId), eq(teams.active, true)))
        .limit(1);
      if (!team) throw new Error("TICKET_AREA_TEAM_NOT_FOUND");
    }

    const [area] = await tx
      .insert(ticketAreas)
      .values({
        name: cleanName,
        teamId: input.teamId,
        createdBy: actorUserId,
      })
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

    await tx.insert(ticketWorkflowStages).values([
      {
        workflowId: workflow.id,
        name: "Recebido",
        stageType: "normal",
        lifecycleStatus: "open",
        isInitial: true,
        sortOrder: 100,
        color: "gray",
      },
      {
        workflowId: workflow.id,
        name: "Concluído",
        stageType: "terminal",
        lifecycleStatus: "in_progress",
        isInitial: false,
        sortOrder: 200,
        color: "green",
      },
    ]);

    return { value: area.id, conclusionCreated: true };
  });
}

export async function addTicketWorkflowStageWithRequiredConclusion(
  workflowId: string,
  input: TicketWorkflowStageInput,
): Promise<RequiredConclusionResult<string>> {
  const stageId = await addTicketWorkflowStage(workflowId, input);
  return {
    value: stageId,
    conclusionCreated: await ensureAreaWorkflowConclusionStage(workflowId),
  };
}

export async function updateTicketWorkflowStageWithRequiredConclusion(
  stageId: string,
  input: TicketWorkflowStageInput,
): Promise<RequiredConclusionResult<void>> {
  const db = getDatabase();
  const [stage] = await db
    .select({ workflowId: ticketWorkflowStages.workflowId })
    .from(ticketWorkflowStages)
    .where(eq(ticketWorkflowStages.id, stageId))
    .limit(1);
  if (!stage) throw new Error("TICKET_WORKFLOW_STAGE_NOT_FOUND");

  await updateTicketWorkflowStage(stageId, input);
  return {
    value: undefined,
    conclusionCreated: await ensureAreaWorkflowConclusionStage(stage.workflowId),
  };
}

export async function archiveTicketWorkflowStageWithRequiredConclusion(
  stageId: string,
): Promise<RequiredConclusionResult<void>> {
  const db = getDatabase();
  const [stage] = await db
    .select({ workflowId: ticketWorkflowStages.workflowId })
    .from(ticketWorkflowStages)
    .where(eq(ticketWorkflowStages.id, stageId))
    .limit(1);
  if (!stage) throw new Error("TICKET_WORKFLOW_STAGE_NOT_FOUND");

  await archiveTicketWorkflowStage(stageId);
  return {
    value: undefined,
    conclusionCreated: await ensureAreaWorkflowConclusionStage(stage.workflowId),
  };
}

async function getMovementContext(ticketId: string): Promise<MovementContext> {
  const db = getDatabase();
  const [row] = await db
    .select({
      assignedUserId: tickets.assignedUserId,
      areaId: ticketWorkflowStates.areaId,
      areaWorkflowId: ticketWorkflowStates.areaWorkflowId,
      areaStageId: ticketWorkflowStates.areaStageId,
    })
    .from(tickets)
    .leftJoin(ticketWorkflowStates, eq(ticketWorkflowStates.ticketId, tickets.id))
    .where(eq(tickets.id, ticketId))
    .limit(1);

  if (!row) throw new Error("TICKET_WORKFLOW_STATE_NOT_FOUND");

  let areaStageType: MovementContext["areaStageType"] = null;
  if (row.areaStageId) {
    const [stage] = await db
      .select({ stageType: ticketWorkflowStages.stageType })
      .from(ticketWorkflowStages)
      .where(eq(ticketWorkflowStages.id, row.areaStageId))
      .limit(1);
    areaStageType = stage?.stageType ?? null;
  }

  return { ...row, areaStageType };
}

function requireCompletedArea(context: MovementContext): void {
  if (context.areaId && context.areaStageType !== "terminal") {
    throw new Error("TICKET_WORKFLOW_AREA_NOT_COMPLETE");
  }
}

async function restoreAssigneeIfCleared(
  ticketId: string,
  assignedUserId: string | null,
): Promise<void> {
  if (!assignedUserId) return;

  const db = getDatabase();
  await db
    .update(tickets)
    .set({ assignedUserId, updatedAt: new Date() })
    .where(and(eq(tickets.id, ticketId), isNull(tickets.assignedUserId)));
}

export async function moveTicketGlobalStageWithRules(
  actorUserId: string,
  permissions: SupportPermissionMap,
  ticketId: string,
  targetStageId: string,
): Promise<void> {
  const context = await getMovementContext(ticketId);
  requireCompletedArea(context);

  await moveTicketGlobalStage(actorUserId, permissions, ticketId, targetStageId);
  await restoreAssigneeIfCleared(ticketId, context.assignedUserId);
}

export async function moveTicketToWorkflowLocationWithRules(
  actorUserId: string,
  permissions: SupportPermissionMap,
  ticketId: string,
  workflowId: string,
  stageId: string,
): Promise<void> {
  const context = await getMovementContext(ticketId);
  const db = getDatabase();
  const [targetWorkflow] = await db
    .select({ id: ticketWorkflows.id, kind: ticketWorkflows.kind })
    .from(ticketWorkflows)
    .where(and(eq(ticketWorkflows.id, workflowId), eq(ticketWorkflows.active, true)))
    .limit(1);

  if (!targetWorkflow) throw new Error("TICKET_WORKFLOW_NOT_FOUND");

  const staysInsideCurrentArea =
    targetWorkflow.kind === "area" && workflowId === context.areaWorkflowId;
  if (!staysInsideCurrentArea) requireCompletedArea(context);

  await moveTicketToWorkflowLocation(
    actorUserId,
    permissions,
    ticketId,
    workflowId,
    stageId,
  );
  await restoreAssigneeIfCleared(ticketId, context.assignedUserId);
}
