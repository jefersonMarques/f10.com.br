import { and, eq, inArray } from "drizzle-orm";
import { json, type RequestHandler } from "@sveltejs/kit";
import { getPermissionScope, hasPermission } from "$lib/server/auth/permissions";
import { requireAppPermission } from "$lib/server/auth/authorization";
import { getDatabase } from "$lib/server/db";
import { webChatMessages } from "$lib/server/db/chatSchema";
import { users } from "$lib/server/db/schema";
import { ticketMessages } from "$lib/server/db/supportSchema";
import { getInternalChat } from "$lib/server/support/internalChatRepository";
import { getSupportTicket } from "$lib/server/support/supportRepository";
import { createTask } from "$lib/server/tasks/taskRepository";
import { listProjectMembers } from "$lib/server/tasks/taskProjectRepository";
import { ensureTaskProjectAccess } from "$lib/server/tasks/taskAccess";
import type { TaskMessageOrigin } from "$lib/server/db/supportMessageTaskSchema";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const PRIORITIES = ["low", "normal", "high", "urgent"] as const;

function isUuid(value: unknown): value is string {
  return typeof value === "string" && UUID_PATTERN.test(value);
}

function readString(record: Record<string, unknown>, field: string): string {
  return typeof record[field] === "string" ? record[field].trim() : "";
}

function validDate(value: string | null): boolean {
  if (!value) return true;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

async function resolveOrigin(
  actorUserId: string,
  permissions: Map<string, "own" | "team" | "all">,
  payload: Record<string, unknown>,
): Promise<TaskMessageOrigin> {
  const sourceKind = payload.sourceKind;
  const messageId = payload.messageId;
  const requestKey = payload.requestKey;
  if ((sourceKind !== "chat" && sourceKind !== "ticket") ||
    !isUuid(messageId) || !isUuid(requestKey)) {
    throw new Error("INVALID_MESSAGE_SOURCE");
  }

  const sourceSessionId = payload.sourceSessionId;
  if (isUuid(sourceSessionId)) {
    const chat = await getInternalChat(actorUserId, permissions, sourceSessionId);
    if (sourceKind === "chat") {
      if (chat.ticketId) throw new Error("REFRESH_REQUIRED");
      const [message] = await getDatabase().select({ authorType: webChatMessages.authorType })
        .from(webChatMessages)
        .where(and(
          eq(webChatMessages.sessionId, sourceSessionId),
          eq(webChatMessages.id, messageId),
        ))
        .limit(1);
      if (!message || message.authorType === "system") throw new Error("MESSAGE_NOT_FOUND");
      return { sourceKind, messageId, ticketId: null, requestKey };
    }

    if (!chat.ticketId) throw new Error("MESSAGE_NOT_FOUND");
    const [message] = await getDatabase().select({ authorType: ticketMessages.authorType })
      .from(ticketMessages)
      .where(and(
        eq(ticketMessages.id, messageId),
        eq(ticketMessages.ticketId, chat.ticketId),
      ))
      .limit(1);
    if (!message || message.authorType === "system") throw new Error("MESSAGE_NOT_FOUND");
    return { sourceKind, messageId, ticketId: chat.ticketId, requestKey };
  }

  if (sourceKind !== "ticket" || !isUuid(payload.ticketId)) {
    throw new Error("MESSAGE_NOT_FOUND");
  }
  if (!hasPermission(permissions, "tickets.view")) throw new Error("TICKET_PERMISSION_NOT_ALLOWED");

  const ticket = await getSupportTicket(actorUserId, permissions, payload.ticketId);
  const message = ticket.messages.find((item) => item.id === messageId);
  if (!message || message.authorType === "system") throw new Error("MESSAGE_NOT_FOUND");
  return { sourceKind, messageId, ticketId: payload.ticketId, requestKey };
}

export const GET: RequestHandler = async ({ cookies, url }) => {
  const { session, permissions } = await requireAppPermission(
    cookies, "tasks.create", url.pathname,
  );
  const projectId = url.searchParams.get("projectId");
  if (!isUuid(projectId)) return json({ error: "INVALID_PROJECT" }, { status: 400 });

  const scope = getPermissionScope(permissions, "tasks.create");
  if (!scope) return json({ error: "FORBIDDEN" }, { status: 403 });

  try {
    await ensureTaskProjectAccess(session.user.id, scope, projectId);
    const members = await listProjectMembers(projectId);
    const activeUsers = members.length
      ? await getDatabase()
        .select({ id: users.id })
        .from(users)
        .where(and(
          inArray(users.id, members.map((member) => member.id)),
          eq(users.status, "active"),
        ))
      : [];
    const allowed = new Set(activeUsers.map((user) => user.id));
    return json({
      canAssign: hasPermission(permissions, "tasks.assign"),
      members: members.filter((member) => allowed.has(member.id)),
      currentUserId: session.user.id,
    }, { headers: { "Cache-Control": "private, no-store" } });
  } catch {
    return json({ error: "PROJECT_NOT_ACCESSIBLE" }, { status: 403 });
  }
};

export const POST: RequestHandler = async ({ cookies, request, url }) => {
  if (request.headers.get("origin") !== url.origin) {
    return json({ error: "INVALID_ORIGIN" }, { status: 403 });
  }
  const { session, permissions } = await requireAppPermission(
    cookies, "tasks.create", url.pathname,
  );

  let payload: Record<string, unknown>;
  try {
    payload = await request.json() as Record<string, unknown>;
  } catch {
    return json({ error: "INVALID_JSON" }, { status: 400 });
  }

  const projectId = readString(payload, "projectId");
  const title = readString(payload, "title");
  const description = readString(payload, "description");
  const priority = readString(payload, "priority");
  const dueOn = readString(payload, "dueOn") || null;
  const assigneeId = readString(payload, "assigneeId") || null;
  if (!isUuid(projectId) || title.length < 2 || title.length > 180 ||
    description.length > 5000 || !validDate(dueOn) ||
    !PRIORITIES.some((value) => value === priority) ||
    (assigneeId !== null && !isUuid(assigneeId))) {
    return json({ error: "INVALID_TASK" }, { status: 400 });
  }

  try {
    const origin = await resolveOrigin(session.user.id, permissions, payload);
    const task = await createTask(session.user.id, permissions, {
      projectId,
      title,
      description,
      priority: priority as typeof PRIORITIES[number],
      dueOn,
      assigneeId,
      messageOrigin: origin,
    });
    return json(
      { ok: true, taskId: task.id, title: task.title },
      { headers: { "Cache-Control": "private, no-store" } },
    );
  } catch (cause) {
    const code = cause instanceof Error ? cause.message : "TASK_CREATE_FAILED";
    if (code === "REFRESH_REQUIRED") {
      return json({ error: code }, { status: 409 });
    }
    if (code === "INVALID_MESSAGE_SOURCE" || code === "MESSAGE_NOT_FOUND") {
      return json({ error: code }, { status: 404 });
    }
    return json({ error: "TASK_CREATE_NOT_ALLOWED" }, { status: 403 });
  }
};
