import { and, desc, eq, gt, gte, isNull, or, sql } from "drizzle-orm";
import { getDatabase } from "$lib/server/db";
import type { PermissionScope } from "$lib/server/auth/permissions";
import { webChatSessions } from "$lib/server/db/chatSchema";
import { teams, users } from "$lib/server/db/schema";
import { supportQueues } from "$lib/server/db/supportSchema";
import { isFinancialChatOption } from "$lib/support/chatEntryRouting";
import {
  calculateChatPerformance,
  parseChatTimestamp,
  percentileMinutes,
} from "$lib/support/chatPerformanceMetrics";
import type {
  ChatPerformanceFilters,
  ChatPerformanceItem,
  ChatAgentPerformance,
  SupportChatReport,
} from "$lib/support/chatPerformanceReport";

const REPORT_LIMIT = 10_000;
const LIST_LIMIT = 80;
const DEFAULT_ATTENTION_MINUTES = 10;

type ChatReportVisibility = {
  scope: PermissionScope;
  actorUserId: string;
  queueIds: string[];
};

type MessageSummary = {
  sessionId: string;
  lastHumanAt: Date | string | null;
  firstHumanAt: Date | string | null;
  firstHumanUserId: string | null;
  pendingCustomerAt: Date | string | null;
};

function isFinanceQueue(name: string, code: string, teamName: string | null): boolean {
  return isFinancialChatOption({ label: name, teamName })
    || /financeir/i.test(code)
    || /financeir/i.test(name.normalize("NFD").replace(/[\u0300-\u036f]/g, ""));
}

function needsAttention(item: ChatPerformanceItem): boolean {
  return item.state === "waiting_first" || item.state === "waiting_reply";
}

function matchesView(item: ChatPerformanceItem, view: ChatPerformanceFilters["view"]): boolean {
  if (view === "waiting") return needsAttention(item);
  if (view === "late") return needsAttention(item) && item.overdue;
  if (view === "unanswered") {
    return item.state === "abandoned"
      || item.state === "closed_unanswered"
      || item.state === "expired_unanswered";
  }
  if (view === "abandoned") return item.state === "abandoned";
  return true;
}

function itemPriority(item: ChatPerformanceItem): number {
  if (needsAttention(item) && item.overdue) return 0;
  if (needsAttention(item)) return 1;
  if (item.state === "abandoned") return 2;
  if (item.state === "closed_unanswered" || item.state === "expired_unanswered") return 3;
  return 4;
}

function buildAgentRows(
  items: readonly ChatPerformanceItem[],
  userNames: Map<string, string>,
): ChatAgentPerformance[] {
  const agents = new Map<string, {
    assigned: number;
    responded: number;
    waiting: number;
    late: number;
    responseMinutes: number[];
  }>();

  function register(userId: string) {
    const existing = agents.get(userId);
    if (existing) return existing;
    const result = { assigned: 0, responded: 0, waiting: 0, late: 0, responseMinutes: [] as number[] };
    agents.set(userId, result);
    return result;
  }

  for (const item of items) {
    if (item.agentId) {
      const assigned = register(item.agentId);
      assigned.assigned += 1;
      if (needsAttention(item)) {
        assigned.waiting += 1;
        if (item.overdue) assigned.late += 1;
      }
    }

    if (item.firstResponderId) {
      const responder = register(item.firstResponderId);
      responder.responded += 1;
      if (item.firstResponseMinutes !== null) {
        responder.responseMinutes.push(item.firstResponseMinutes);
      }
    }
  }

  return [...agents.entries()].map(([id, item]) => ({
    id,
    name: userNames.get(id) ?? "Operador não identificado",
    assigned: item.assigned,
    responded: item.responded,
    waiting: item.waiting,
    late: item.late,
    medianFirstMinutes: percentileMinutes(item.responseMinutes, 0.5),
    p90FirstMinutes: percentileMinutes(item.responseMinutes, 0.9),
  })).sort((first, second) => second.late - first.late
    || second.waiting - first.waiting
    || first.name.localeCompare(second.name, "pt-BR"));
}

async function getMessageSummaries(since: Date, now: Date): Promise<Map<string, MessageSummary>> {
  const db = getDatabase();

  // A união remove mensagens duplicadas quando um chat é convertido em ticket.
  const result = await db.execute(sql`
    WITH selected_chats AS (
      SELECT id, ticket_id
      FROM web_chat_sessions
      WHERE created_at >= ${since.toISOString()}::timestamptz
        OR (closed_at IS NULL AND expires_at > ${now.toISOString()}::timestamptz)
      ORDER BY created_at DESC, id DESC
      LIMIT ${REPORT_LIMIT}
    ),
    messages AS (
      SELECT msg.session_id, msg.id, msg.author_type::text AS author_type,
        msg.author_user_id, msg.created_at
      FROM web_chat_messages msg
      INNER JOIN selected_chats chat ON chat.id = msg.session_id
      WHERE msg.visibility = 'public' AND msg.author_type IN ('customer', 'user')
      UNION
      SELECT chat.id AS session_id, msg.id, msg.author_type::text AS author_type,
        msg.author_user_id, msg.created_at
      FROM ticket_messages msg
      INNER JOIN selected_chats chat ON chat.ticket_id = msg.ticket_id
      WHERE msg.visibility = 'public' AND msg.author_type IN ('customer', 'user')
    ),
    last_human AS (
      SELECT session_id, MAX(created_at) AS last_human_at
      FROM messages WHERE author_type = 'user' GROUP BY session_id
    ),
    first_human AS (
      SELECT DISTINCT ON (session_id)
        session_id, created_at AS first_human_at, author_user_id
      FROM messages
      WHERE author_type = 'user'
      ORDER BY session_id, created_at ASC, id ASC
    ),
    pending_customer AS (
      SELECT msg.session_id, MIN(msg.created_at) AS pending_customer_at
      FROM messages msg
      LEFT JOIN last_human human ON human.session_id = msg.session_id
      WHERE msg.author_type = 'customer'
        AND (human.last_human_at IS NULL OR msg.created_at > human.last_human_at)
      GROUP BY msg.session_id
    )
    SELECT chat.id::text AS "sessionId",
      last_human.last_human_at AS "lastHumanAt",
      first_human.first_human_at AS "firstHumanAt",
      first_human.author_user_id::text AS "firstHumanUserId",
      pending_customer.pending_customer_at AS "pendingCustomerAt"
    FROM selected_chats chat
    LEFT JOIN last_human ON last_human.session_id = chat.id
    LEFT JOIN first_human ON first_human.session_id = chat.id
    LEFT JOIN pending_customer ON pending_customer.session_id = chat.id
  `);

  const rows = result as unknown as MessageSummary[];
  return new Map(rows.map((row) => [row.sessionId, row]));
}

export async function getSupportChatPerformance(
  filters: ChatPerformanceFilters,
  visibility: ChatReportVisibility,
): Promise<SupportChatReport> {
  const db = getDatabase();
  const now = new Date();
  const since = new Date(now.getTime() - filters.periodDays * 86_400_000);
  const activeCondition = and(
    isNull(webChatSessions.closedAt),
    gt(webChatSessions.expiresAt, now),
  );

  const [queueRows, userRows, sessionRows, messages] = await Promise.all([
    db.select({
      id: supportQueues.id,
      code: supportQueues.code,
      name: supportQueues.name,
      teamName: teams.name,
      slaEnabled: supportQueues.slaEnabled,
      firstResponseMinutes: supportQueues.slaFirstResponseMinutes,
    }).from(supportQueues).leftJoin(teams, eq(supportQueues.teamId, teams.id)),
    db.select({ id: users.id, name: users.name }).from(users),
    db.select({
      id: webChatSessions.id,
      chatNumber: webChatSessions.chatNumber,
      queueId: webChatSessions.queueId,
      agentId: webChatSessions.assignedUserId,
      createdAt: webChatSessions.createdAt,
      humanRequestedAt: webChatSessions.humanRequestedAt,
      firstResponseAt: webChatSessions.firstResponseAt,
      closedAt: webChatSessions.closedAt,
      closeReason: webChatSessions.closeReason,
      expiresAt: webChatSessions.expiresAt,
    }).from(webChatSessions)
      .where(or(gte(webChatSessions.createdAt, since), activeCondition))
      .orderBy(desc(webChatSessions.createdAt), desc(webChatSessions.id))
      .limit(REPORT_LIMIT + 1),
    getMessageSummaries(since, now),
  ]);

  const queues = queueRows.map((queue) => ({
    id: queue.id,
    name: queue.name,
    department: isFinanceQueue(queue.name, queue.code, queue.teamName)
      ? "finance" as const
      : "support" as const,
    thresholdMinutes: queue.slaEnabled
      ? Math.max(1, queue.firstResponseMinutes)
      : DEFAULT_ATTENTION_MINUTES,
    slaEnabled: queue.slaEnabled,
  }));
  const queueMap = new Map(queues.map((queue) => [queue.id, queue]));
  const userNames = new Map(userRows.map((user) => [user.id, user.name]));

  const items: ChatPerformanceItem[] = [];
  for (const chat of sessionRows.slice(0, REPORT_LIMIT)) {
    const queue = queueMap.get(chat.queueId);
    if (!queue) continue;

    const requestedAt = parseChatTimestamp(chat.humanRequestedAt);
    if (!requestedAt) continue;

    const message = messages.get(chat.id);
    const firstResponseAt = parseChatTimestamp(chat.firstResponseAt)
      ?? parseChatTimestamp(message?.firstHumanAt);
    const lastHumanAt = parseChatTimestamp(message?.lastHumanAt);
    const rawPendingAt = parseChatTimestamp(message?.pendingCustomerAt);
    const pendingCustomerAt = firstResponseAt && lastHumanAt && rawPendingAt
      && rawPendingAt.getTime() > lastHumanAt.getTime()
      ? rawPendingAt
      : null;

    const state = calculateChatPerformance({
      requestedAt,
      firstResponseAt,
      closedAt: parseChatTimestamp(chat.closedAt),
      expiresAt: chat.expiresAt,
      pendingCustomerAt,
      closeReason: chat.closeReason,
      now,
      thresholdMinutes: queue.thresholdMinutes,
    });

    items.push({
      id: chat.id,
      number: chat.chatNumber,
      queueId: queue.id,
      queueName: queue.name,
      department: queue.department,
      agentId: chat.agentId,
      agentName: chat.agentId ? userNames.get(chat.agentId) ?? "Operador não identificado" : null,
      firstResponderId: message?.firstHumanUserId ?? null,
      createdAt: chat.createdAt.toISOString(),
      closedAt: chat.closedAt?.toISOString() ?? null,
      waitingSince: state.waitingSince,
      waitingMinutes: state.waitingMinutes,
      firstResponseMinutes: state.firstResponseMinutes,
      thresholdMinutes: queue.thresholdMinutes,
      overdue: state.overdue,
      state: state.state,
      closeReason: state.closureReason,
    });
  }

  const visibleItems = items.filter((item) => {
    if (visibility.scope === "all") return true;
    if (visibility.scope === "team") return visibility.queueIds.includes(item.queueId);
    return item.agentId === visibility.actorUserId
      || item.firstResponderId === visibility.actorUserId;
  });

  const selectableItems = visibleItems.filter((item) =>
    (filters.department === "all" || item.department === filters.department)
    && (filters.queueId === "all" || item.queueId === filters.queueId)
  );
  const filtered = selectableItems.filter((item) =>
    filters.userId === "all"
    || item.agentId === filters.userId
    || item.firstResponderId === filters.userId
  );

  const waiting = filtered.filter(needsAttention);
  const responseMinutes = filtered.flatMap((item) =>
    item.firstResponseMinutes === null ? [] : [item.firstResponseMinutes]
  );
  const unanswered = filtered.filter((item) =>
    item.state === "abandoned"
    || item.state === "closed_unanswered"
    || item.state === "expired_unanswered"
  );
  const summary: SupportChatReport["summary"] = {
    received: filtered.length,
    answered: filtered.filter((item) => item.firstResponseMinutes !== null).length,
    waiting: waiting.length,
    late: waiting.filter((item) => item.overdue).length,
    longestWaitingMinutes: waiting.length > 0
      ? Math.max(...waiting.map((item) => item.waitingMinutes ?? 0))
      : null,
    medianFirstMinutes: percentileMinutes(responseMinutes, 0.5),
    p90FirstMinutes: percentileMinutes(responseMinutes, 0.9),
    unansweredClosed: unanswered.length,
    abandonedAfterWait: unanswered.filter((item) => item.state === "abandoned").length,
    expiredUnanswered: unanswered.filter((item) => item.state === "expired_unanswered").length,
    closedByAgentWithoutReply: unanswered.filter((item) =>
      item.closeReason === "agent"
    ).length,
    firstResponseSamples: responseMinutes.length,
    lateFirstResponses: filtered.filter((item) =>
      item.firstResponseMinutes !== null
      && item.firstResponseMinutes >= item.thresholdMinutes
    ).length,
  };

  const visible = filtered.filter((item) => matchesView(item, filters.view))
    .sort((first, second) => itemPriority(first) - itemPriority(second)
      || (second.waitingMinutes ?? 0) - (first.waitingMinutes ?? 0)
      || second.createdAt.localeCompare(first.createdAt));

  return {
    generatedAt: now.toISOString(),
    periodDays: filters.periodDays,
    truncated: sessionRows.length > REPORT_LIMIT,
    filters,
    queues: queues.filter((queue) => visibility.scope === "all"
      || (visibility.scope === "team" && visibility.queueIds.includes(queue.id))
      || visibleItems.some((item) => item.queueId === queue.id)),
    users: userRows.filter((user) => selectableItems.some((item) =>
      item.agentId === user.id || item.firstResponderId === user.id
    )).sort((first, second) => first.name.localeCompare(second.name, "pt-BR")),
    summary,
    agents: buildAgentRows(filtered, userNames),
    listTotal: visible.length,
    items: visible.slice(0, LIST_LIMIT),
  };
}
