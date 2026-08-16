import { randomUUID } from "node:crypto";
import { and, asc, eq } from "drizzle-orm";
import { recordAuditEvent } from "$lib/server/auth/audit";
import { getDatabase } from "$lib/server/db";
import { teams } from "$lib/server/db/schema";
import {
  supportChatEntryOptions,
  type SupportChatInitialHandling,
} from "$lib/server/db/supportChatEntrySchema";
import { supportQueues } from "$lib/server/db/supportSchema";

export type SupportChatEntryOptionInput = {
  label: string;
  description: string;
  queueId: string;
  initialHandling: SupportChatInitialHandling;
  active: boolean;
  sortOrder: number;
};

export async function listPublicSupportChatEntryOptions() {
  return getDatabase()
    .select({
      id: supportChatEntryOptions.id,
      label: supportChatEntryOptions.label,
      description: supportChatEntryOptions.description,
      initialHandling: supportChatEntryOptions.initialHandling,
    })
    .from(supportChatEntryOptions)
    .innerJoin(supportQueues, eq(supportChatEntryOptions.queueId, supportQueues.id))
    .where(
      and(
        eq(supportChatEntryOptions.active, true),
        eq(supportQueues.active, true),
      ),
    )
    .orderBy(asc(supportChatEntryOptions.sortOrder), asc(supportChatEntryOptions.createdAt));
}

export async function resolveSupportChatEntryOption(optionId: string | null) {
  const db = getDatabase();

  if (optionId) {
    const [option] = await db
      .select({
        id: supportChatEntryOptions.id,
        label: supportChatEntryOptions.label,
        queueId: supportChatEntryOptions.queueId,
        initialHandling: supportChatEntryOptions.initialHandling,
      })
      .from(supportChatEntryOptions)
      .innerJoin(supportQueues, eq(supportChatEntryOptions.queueId, supportQueues.id))
      .where(
        and(
          eq(supportChatEntryOptions.id, optionId),
          eq(supportChatEntryOptions.active, true),
          eq(supportQueues.active, true),
        ),
      )
      .limit(1);
    if (!option) throw new Error("CHAT_ENTRY_OPTION_NOT_FOUND");
    return option;
  }

  const [fallback] = await db
    .select({
      id: supportChatEntryOptions.id,
      label: supportChatEntryOptions.label,
      queueId: supportQueues.id,
      initialHandling: supportChatEntryOptions.initialHandling,
    })
    .from(supportQueues)
    .leftJoin(
      supportChatEntryOptions,
      and(
        eq(supportChatEntryOptions.queueId, supportQueues.id),
        eq(supportChatEntryOptions.active, true),
      ),
    )
    .where(and(eq(supportQueues.code, "support"), eq(supportQueues.active, true)))
    .limit(1);

  if (!fallback) throw new Error("CHAT_QUEUE_NOT_FOUND");
  return {
    ...fallback,
    label: fallback.label ?? "Suporte F10",
    initialHandling: fallback.initialHandling ?? ("ai" as const),
  };
}

export async function getSupportChatEntrySettings() {
  const db = getDatabase();
  const [options, queues, availableTeams] = await Promise.all([
    db
      .select({
        id: supportChatEntryOptions.id,
        label: supportChatEntryOptions.label,
        description: supportChatEntryOptions.description,
        queueId: supportChatEntryOptions.queueId,
        queueName: supportQueues.name,
        initialHandling: supportChatEntryOptions.initialHandling,
        active: supportChatEntryOptions.active,
        sortOrder: supportChatEntryOptions.sortOrder,
      })
      .from(supportChatEntryOptions)
      .innerJoin(supportQueues, eq(supportChatEntryOptions.queueId, supportQueues.id))
      .orderBy(asc(supportChatEntryOptions.sortOrder), asc(supportChatEntryOptions.createdAt)),
    db
      .select({
        id: supportQueues.id,
        code: supportQueues.code,
        name: supportQueues.name,
        teamId: supportQueues.teamId,
        teamName: teams.name,
        active: supportQueues.active,
      })
      .from(supportQueues)
      .leftJoin(teams, eq(supportQueues.teamId, teams.id))
      .orderBy(asc(supportQueues.name)),
    db
      .select({ id: teams.id, name: teams.name })
      .from(teams)
      .where(eq(teams.active, true))
      .orderBy(asc(teams.name)),
  ]);

  return { options, queues, teams: availableTeams };
}

async function requireActiveQueue(queueId: string): Promise<void> {
  const [queue] = await getDatabase()
    .select({ id: supportQueues.id })
    .from(supportQueues)
    .where(and(eq(supportQueues.id, queueId), eq(supportQueues.active, true)))
    .limit(1);
  if (!queue) throw new Error("SUPPORT_QUEUE_NOT_FOUND");
}

export async function createSupportChatEntryOption(
  actorUserId: string,
  input: SupportChatEntryOptionInput,
): Promise<void> {
  await requireActiveQueue(input.queueId);
  const [created] = await getDatabase()
    .insert(supportChatEntryOptions)
    .values({
      label: input.label,
      description: input.description,
      queueId: input.queueId,
      initialHandling: input.initialHandling,
      active: input.active,
      sortOrder: input.sortOrder,
    })
    .returning({ id: supportChatEntryOptions.id });
  if (!created) throw new Error("CHAT_ENTRY_OPTION_NOT_CREATED");

  await recordAuditEvent({
    actorUserId,
    action: "operations.support_chat.entry_option.created",
    entityType: "support_chat_entry_option",
    entityId: created.id,
    metadata: { queueId: input.queueId, initialHandling: input.initialHandling },
  });
}

export async function updateSupportChatEntryOption(
  actorUserId: string,
  optionId: string,
  input: SupportChatEntryOptionInput,
): Promise<void> {
  await requireActiveQueue(input.queueId);
  const [updated] = await getDatabase()
    .update(supportChatEntryOptions)
    .set({
      label: input.label,
      description: input.description,
      queueId: input.queueId,
      initialHandling: input.initialHandling,
      active: input.active,
      sortOrder: input.sortOrder,
      updatedAt: new Date(),
    })
    .where(eq(supportChatEntryOptions.id, optionId))
    .returning({ id: supportChatEntryOptions.id });
  if (!updated) throw new Error("CHAT_ENTRY_OPTION_NOT_FOUND");

  await recordAuditEvent({
    actorUserId,
    action: "operations.support_chat.entry_option.updated",
    entityType: "support_chat_entry_option",
    entityId: updated.id,
    metadata: { queueId: input.queueId, initialHandling: input.initialHandling, active: input.active },
  });
}

export async function deleteSupportChatEntryOption(
  actorUserId: string,
  optionId: string,
): Promise<void> {
  const [removed] = await getDatabase()
    .delete(supportChatEntryOptions)
    .where(eq(supportChatEntryOptions.id, optionId))
    .returning({ id: supportChatEntryOptions.id });
  if (!removed) throw new Error("CHAT_ENTRY_OPTION_NOT_FOUND");

  await recordAuditEvent({
    actorUserId,
    action: "operations.support_chat.entry_option.deleted",
    entityType: "support_chat_entry_option",
    entityId: removed.id,
    metadata: {},
  });
}

export async function createSupportQueue(
  actorUserId: string,
  name: string,
  teamId: string,
): Promise<void> {
  const db = getDatabase();
  const [team] = await db
    .select({ id: teams.id })
    .from(teams)
    .where(and(eq(teams.id, teamId), eq(teams.active, true)))
    .limit(1);
  if (!team) throw new Error("SUPPORT_TEAM_NOT_FOUND");

  const codeBase = name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 40) || "fila";
  const [queue] = await db
    .insert(supportQueues)
    .values({
      code: `chat-${codeBase}-${randomUUID().slice(0, 8)}`,
      name,
      teamId,
      active: true,
    })
    .returning({ id: supportQueues.id });
  if (!queue) throw new Error("SUPPORT_QUEUE_NOT_CREATED");

  await recordAuditEvent({
    actorUserId,
    action: "operations.support_queue.created",
    entityType: "support_queue",
    entityId: queue.id,
    metadata: { teamId, source: "chat_entry_settings" },
  });
}
