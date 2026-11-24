import { randomUUID } from "node:crypto";
import { and, eq, inArray } from "drizzle-orm";
import { getDatabase } from "$lib/server/db";
import { operationsSettings } from "$lib/server/db/operationsSettingsSchema";
import { auditLogs, teamMembers, teams } from "$lib/server/db/schema";
import { hasPermission } from "$lib/server/auth/permissions";
import type { SupportPermissionMap } from "$lib/server/support/supportAccess";
import { DEFAULT_QUICK_REPLIES, normalizeQuickReply, readStoredQuickReplies, type QuickReplyScope } from "$lib/support/quickReplies";

type Scope = Omit<QuickReplyScope, "replies"> & { storageKey: string };

async function getScopes(userId: string, permissions: SupportPermissionMap): Promise<Scope[]> {
  const memberships = await getDatabase().select({
    id: teams.id, name: teams.name, isManager: teamMembers.isManager,
  }).from(teamMembers).innerJoin(teams, eq(teams.id, teamMembers.teamId))
    .where(and(eq(teamMembers.userId, userId), eq(teams.active, true)));

  return [
    { id: "personal", label: "Minhas respostas", canEdit: true, storageKey: `support_quick_replies:user:${userId}` },
    ...memberships.map((team) => ({
      id: team.id,
      label: team.name,
      canEdit: hasPermission(permissions, "system.settings.manage")
        || (team.isManager && hasPermission(permissions, "chat.manage", "team")),
      storageKey: `support_quick_replies:team:${team.id}`,
    })),
  ];
}

export async function listQuickReplies(userId: string, permissions: SupportPermissionMap): Promise<QuickReplyScope[]> {
  const scopes = await getScopes(userId, permissions);
  const rows = await getDatabase().select().from(operationsSettings)
    .where(inArray(operationsSettings.key, scopes.map((scope) => scope.storageKey)));
  const byKey = new Map(rows.map((row) => [row.key, row.value]));
  return [
    { id: "builtin", label: "Padrões F10", canEdit: false, replies: DEFAULT_QUICK_REPLIES },
    ...scopes.map(({ storageKey, ...scope }) => ({
      ...scope, replies: readStoredQuickReplies(byKey.get(storageKey)?.replies),
    })),
  ];
}

export async function mutateQuickReply(userId: string, permissions: SupportPermissionMap, input: unknown): Promise<void> {
  if (!input || typeof input !== "object") throw new Error("INVALID_QUICK_REPLY");
  const data = input as Record<string, unknown>;
  const scope = (await getScopes(userId, permissions)).find((item) => item.id === data.scopeId);
  if (!scope?.canEdit) throw new Error("QUICK_REPLY_ACCESS_DENIED");
  const action = data.action;
  if (action !== "save" && action !== "delete") throw new Error("INVALID_QUICK_REPLY");
  const reply = action === "save" ? normalizeQuickReply(data) : null;
  if (action === "save" && !reply) throw new Error("INVALID_QUICK_REPLY");
  const id = typeof data.id === "string" && data.id ? data.id : null;

  await getDatabase().transaction(async (tx) => {
    await tx.insert(operationsSettings).values({ key: scope.storageKey, value: { replies: [] }, updatedBy: userId })
      .onConflictDoNothing();
    const [row] = await tx.select().from(operationsSettings).where(eq(operationsSettings.key, scope.storageKey)).limit(1).for("update");
    const entries = readStoredQuickReplies(row?.value.replies);
    const existing = id ? entries.find((entry) => entry.id === id) : null;
    if ((id || action === "delete") && !existing) throw new Error("QUICK_REPLY_NOT_FOUND");
    let next = entries;
    if (action === "delete") {
      next = entries.filter((entry) => entry.id !== id);
    } else if (reply) {
      if (entries.some((entry) => entry.command === reply.command && entry.id !== id)) throw new Error("QUICK_REPLY_DUPLICATE");
      if (!existing && entries.length >= 50) throw new Error("QUICK_REPLY_LIMIT");
      const saved = { id: id ?? randomUUID(), ...reply };
      next = existing ? entries.map((entry) => entry.id === id ? saved : entry) : [...entries, saved];
    }
    await tx.update(operationsSettings).set({ value: { replies: next }, updatedAt: new Date(), updatedBy: userId })
      .where(eq(operationsSettings.key, scope.storageKey));
    await tx.insert(auditLogs).values({
      actorUserId: userId,
      action: action === "delete" ? "support.quick_reply.deleted" : "support.quick_reply.saved",
      entityType: "operations_settings",
      entityId: scope.storageKey,
      metadata: { scopeId: scope.id },
    });
  });
}
