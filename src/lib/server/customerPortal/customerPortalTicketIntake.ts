import { and, asc, desc, eq } from "drizzle-orm";
import { getDatabase } from "$lib/server/db";
import {
  ticketWorkflowStages,
  ticketWorkflows,
} from "$lib/server/db/ticketWorkflowSchema";
import { supportQueues } from "$lib/server/db/supportSchema";

export type CustomerPortalTicketLifecycleStatus =
  | "new"
  | "open"
  | "in_progress"
  | "waiting_customer"
  | "resolved"
  | "closed";

export type CustomerPortalTicketIntake = {
  queueId: string;
  defaultDueDays: number;
  workflowId: string;
  stageId: string;
  lifecycleStatus: CustomerPortalTicketLifecycleStatus;
};

export async function resolveCustomerPortalTicketIntake(): Promise<CustomerPortalTicketIntake> {
  const db = getDatabase();
  const [workflow] = await db
    .select({
      id: ticketWorkflows.id,
      queueId: ticketWorkflows.queueId,
    })
    .from(ticketWorkflows)
    .where(and(eq(ticketWorkflows.kind, "global"), eq(ticketWorkflows.active, true)))
    .orderBy(asc(ticketWorkflows.createdAt))
    .limit(1);

  if (!workflow) {
    throw new Error("CUSTOMER_PORTAL_GLOBAL_WORKFLOW_NOT_CONFIGURED");
  }

  const stages = await db
    .select({
      id: ticketWorkflowStages.id,
      code: ticketWorkflowStages.code,
      name: ticketWorkflowStages.name,
      lifecycleStatus: ticketWorkflowStages.lifecycleStatus,
      isInitial: ticketWorkflowStages.isInitial,
    })
    .from(ticketWorkflowStages)
    .where(
      and(
        eq(ticketWorkflowStages.workflowId, workflow.id),
        eq(ticketWorkflowStages.active, true),
      ),
    )
    .orderBy(
      desc(ticketWorkflowStages.isInitial),
      asc(ticketWorkflowStages.sortOrder),
      asc(ticketWorkflowStages.createdAt),
    );

  const newStages = stages.filter((item) => item.lifecycleStatus === "new");
  const stage = newStages.find((item) => item.name.trim().toLocaleLowerCase("pt-BR") === "novo")
    ?? newStages.find((item) => item.code?.trim().toLowerCase() === "new")
    ?? newStages.find((item) => item.code?.trim().toLowerCase() === "novo")
    ?? newStages.find((item) => item.isInitial)
    ?? newStages[0]
    ?? stages.find((item) => item.isInitial)
    ?? stages[0];

  if (!stage) {
    throw new Error("CUSTOMER_PORTAL_INITIAL_STAGE_NOT_CONFIGURED");
  }

  let queue: { id: string; defaultDueDays: number } | undefined;
  if (workflow.queueId) {
    [queue] = await db
      .select({ id: supportQueues.id, defaultDueDays: supportQueues.defaultDueDays })
      .from(supportQueues)
      .where(
        and(
          eq(supportQueues.id, workflow.queueId),
          eq(supportQueues.active, true),
        ),
      )
      .limit(1);
  }

  if (!queue) {
    [queue] = await db
      .select({ id: supportQueues.id, defaultDueDays: supportQueues.defaultDueDays })
      .from(supportQueues)
      .where(and(eq(supportQueues.code, "support"), eq(supportQueues.active, true)))
      .limit(1);
  }

  if (!queue) {
    [queue] = await db
      .select({ id: supportQueues.id, defaultDueDays: supportQueues.defaultDueDays })
      .from(supportQueues)
      .where(eq(supportQueues.active, true))
      .orderBy(asc(supportQueues.createdAt))
      .limit(1);
  }

  if (!queue) {
    throw new Error("CUSTOMER_PORTAL_SUPPORT_QUEUE_NOT_CONFIGURED");
  }

  return {
    queueId: queue.id,
    defaultDueDays: queue.defaultDueDays,
    workflowId: workflow.id,
    stageId: stage.id,
    lifecycleStatus: stage.lifecycleStatus,
  };
}
