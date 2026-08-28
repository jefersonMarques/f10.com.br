import { and, asc, desc, eq, sql } from "drizzle-orm";
import { getDatabase } from "$lib/server/db";
import {
  ticketWorkflowStages,
  ticketWorkflows,
} from "$lib/server/db/ticketWorkflowSchema";
import { supportQueues } from "$lib/server/db/supportSchema";

export type CustomerPortalTicketIntake = {
  queueId: string;
  defaultDueDays: number;
  workflowId: string;
  stageId: string;
};

export async function resolveCustomerPortalTicketIntake(): Promise<CustomerPortalTicketIntake> {
  const db = getDatabase();
  const workflows = await db
    .select({
      id: ticketWorkflows.id,
      queueId: ticketWorkflows.queueId,
    })
    .from(ticketWorkflows)
    .where(
      and(
        eq(ticketWorkflows.kind, "global"),
        eq(ticketWorkflows.active, true),
        sql`lower(trim(${ticketWorkflows.name})) = 'main'`,
      ),
    )
    .orderBy(asc(ticketWorkflows.createdAt))
    .limit(2);

  if (workflows.length !== 1 || !workflows[0]) {
    throw new Error("CUSTOMER_PORTAL_MAIN_WORKFLOW_NOT_CONFIGURED");
  }
  const workflow = workflows[0];

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
        eq(ticketWorkflowStages.lifecycleStatus, "new"),
      ),
    )
    .orderBy(
      desc(ticketWorkflowStages.isInitial),
      asc(ticketWorkflowStages.sortOrder),
      asc(ticketWorkflowStages.createdAt),
    );

  const stage = stages.find((item) => item.name.trim().toLocaleLowerCase("pt-BR") === "novo")
    ?? stages.find((item) => item.code?.trim().toLowerCase() === "new")
    ?? stages.find((item) => item.code?.trim().toLowerCase() === "novo")
    ?? stages.find((item) => item.isInitial)
    ?? stages[0];

  if (!stage) {
    throw new Error("CUSTOMER_PORTAL_NEW_STAGE_NOT_CONFIGURED");
  }

  const [queue] = workflow.queueId
    ? await db
        .select({ id: supportQueues.id, defaultDueDays: supportQueues.defaultDueDays })
        .from(supportQueues)
        .where(
          and(
            eq(supportQueues.id, workflow.queueId),
            eq(supportQueues.active, true),
          ),
        )
        .limit(1)
    : await db
        .select({ id: supportQueues.id, defaultDueDays: supportQueues.defaultDueDays })
        .from(supportQueues)
        .where(
          and(
            eq(supportQueues.code, "support"),
            eq(supportQueues.active, true),
          ),
        )
        .limit(1);

  if (!queue) {
    throw new Error("CUSTOMER_PORTAL_SUPPORT_QUEUE_NOT_CONFIGURED");
  }

  return {
    queueId: queue.id,
    defaultDueDays: queue.defaultDueDays,
    workflowId: workflow.id,
    stageId: stage.id,
  };
}
