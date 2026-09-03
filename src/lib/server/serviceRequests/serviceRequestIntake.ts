import { and, asc, eq } from "drizzle-orm";
import { getDatabase } from "$lib/server/db";
import { teams } from "$lib/server/db/schema";
import { serviceRequestRoutes } from "$lib/server/db/serviceRequestSchema";
import { supportQueues } from "$lib/server/db/supportSchema";
import {
  ticketAreas,
  ticketWorkflowStages,
  ticketWorkflows,
} from "$lib/server/db/ticketWorkflowSchema";
import type { ServiceRequestType } from "$lib/server/serviceRequests/serviceRequestDefinitions";

export type ServiceRequestIntake = {
  queueId: string;
  areaId: string;
  teamId: string;
  defaultDueDays: number;
  globalWorkflowId: string;
  globalStageId: string;
  areaWorkflowId: string;
  areaStageId: string;
  lifecycleStatus: "new" | "open" | "in_progress" | "waiting_customer" | "resolved" | "closed";
};

export async function resolveServiceRequestIntake(
  requestType: ServiceRequestType,
): Promise<ServiceRequestIntake> {
  const db = getDatabase();
  const [route] = await db
    .select({
      queueId: supportQueues.id,
      areaId: ticketAreas.id,
      teamId: teams.id,
      defaultDueDays: supportQueues.defaultDueDays,
    })
    .from(serviceRequestRoutes)
    .innerJoin(supportQueues, eq(supportQueues.id, serviceRequestRoutes.queueId))
    .innerJoin(ticketAreas, eq(ticketAreas.id, serviceRequestRoutes.areaId))
    .innerJoin(teams, eq(teams.id, ticketAreas.teamId))
    .where(
      and(
        eq(serviceRequestRoutes.requestType, requestType),
        eq(serviceRequestRoutes.active, true),
        eq(supportQueues.active, true),
        eq(ticketAreas.active, true),
        eq(teams.active, true),
      ),
    )
    .limit(1);

  if (!route) throw new Error("SERVICE_REQUEST_TEAM_NOT_CONFIGURED");

  const [globalLocation] = await db
    .select({
      workflowId: ticketWorkflows.id,
      stageId: ticketWorkflowStages.id,
      lifecycleStatus: ticketWorkflowStages.lifecycleStatus,
    })
    .from(ticketWorkflows)
    .innerJoin(ticketWorkflowStages, eq(ticketWorkflowStages.workflowId, ticketWorkflows.id))
    .where(
      and(
        eq(ticketWorkflows.kind, "global"),
        eq(ticketWorkflows.active, true),
        eq(ticketWorkflowStages.active, true),
        eq(ticketWorkflowStages.stageType, "area_gateway"),
        eq(ticketWorkflowStages.linkedAreaId, route.areaId),
      ),
    )
    .orderBy(asc(ticketWorkflows.createdAt), asc(ticketWorkflowStages.sortOrder))
    .limit(1);
  if (!globalLocation) throw new Error("SERVICE_REQUEST_GLOBAL_STAGE_NOT_CONFIGURED");

  const [areaLocation] = await db
    .select({
      workflowId: ticketWorkflows.id,
      stageId: ticketWorkflowStages.id,
    })
    .from(ticketWorkflows)
    .innerJoin(ticketWorkflowStages, eq(ticketWorkflowStages.workflowId, ticketWorkflows.id))
    .where(
      and(
        eq(ticketWorkflows.kind, "area"),
        eq(ticketWorkflows.areaId, route.areaId),
        eq(ticketWorkflows.active, true),
        eq(ticketWorkflowStages.active, true),
        eq(ticketWorkflowStages.isInitial, true),
      ),
    )
    .orderBy(asc(ticketWorkflowStages.sortOrder), asc(ticketWorkflowStages.createdAt))
    .limit(1);
  if (!areaLocation) throw new Error("SERVICE_REQUEST_AREA_STAGE_NOT_CONFIGURED");

  return {
    queueId: route.queueId,
    areaId: route.areaId,
    teamId: route.teamId,
    defaultDueDays: route.defaultDueDays,
    globalWorkflowId: globalLocation.workflowId,
    globalStageId: globalLocation.stageId,
    areaWorkflowId: areaLocation.workflowId,
    areaStageId: areaLocation.stageId,
    lifecycleStatus: globalLocation.lifecycleStatus,
  };
}
