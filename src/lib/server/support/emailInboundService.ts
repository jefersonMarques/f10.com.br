import { env } from "$env/dynamic/private";
import {
  and,
  asc,
  desc,
  eq,
  inArray,
  isNotNull,
  lte,
  or,
  sql,
} from "drizzle-orm";
import { getDatabase } from "$lib/server/db";
import { ticketCustomerContexts } from "$lib/server/db/customerPortalSchema";
import {
  supportEmailInboundEvents,
  supportEmailThreads,
  type SupportEmailInboundEvent,
} from "$lib/server/db/supportEmailSchema";
import {
  customerContacts,
  supportQueues,
  ticketEvents,
  ticketMessages,
  tickets,
} from "$lib/server/db/supportSchema";

const PROVIDER = "brevo";
const LEASE_MS = 60_000;
const MAX_MESSAGE_IDS = 100;

export type EmailInboundOutcome = {
  status: "processed" | "ignored";
  ticketId: string | null;
};

type JsonObject = Record<string, unknown>;
type EmailAddress = { email: string; name: string | null };
type InboxRoute = {
  code: "financeiro" | "sucesso";
  email: string;
  groupId: string | null;
};
type BrevoEmailMessage = {
  id: string;
  externalMessageId: string;
  type: string;
  messageType: string;
  subject: string;
  text: string;
  createdAt: Date;
  from: EmailAddress | null;
  to: EmailAddress[];
  replyTo: EmailAddress | null;
  cc: EmailAddress[];
  bcc: EmailAddress[];
  attachments: unknown[];
  isForward: boolean;
};
type CustomerMatch = {
  contactId: string;
  legacyUserId: string | null;
  groupId: number;
  groupName: string;
  subgroup: boolean;
  unitId: number;
  unitName: string;
  unitSchema: string;
};

export class EmailInboundError extends Error {
  constructor(
    public readonly code: string,
    message = code,
    public readonly retryable = true,
  ) {
    super(message);
    this.name = "EmailInboundError";
  }
}

function asObject(value: unknown): JsonObject | null {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? value as JsonObject
    : null;
}

function asString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function normalizeEmail(value: string): string {
  return value.trim().toLowerCase();
}

function emailAddress(value: unknown): EmailAddress | null {
  if (typeof value === "string") {
    const email = normalizeEmail(value);
    return email.includes("@") ? { email, name: null } : null;
  }

  const object = asObject(value);
  if (!object) return null;
  const email = normalizeEmail(asString(object.email) || asString(object.address));
  if (!email.includes("@")) return null;
  const name = asString(object.name) || asString(object.displayName) || null;
  return { email, name };
}

function emailAddresses(value: unknown): EmailAddress[] {
  return asArray(value)
    .map(emailAddress)
    .filter((item): item is EmailAddress => item !== null);
}

function messageTimestamp(value: unknown): Date {
  const timestamp = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(timestamp) || timestamp <= 0) return new Date();
  const date = new Date(timestamp);
  return Number.isNaN(date.getTime()) ? new Date() : date;
}

function parseMessage(value: unknown): BrevoEmailMessage | null {
  const message = asObject(value);
  if (!message) return null;

  const id = asString(message.id);
  const sourceMessageId = asString(message.sourceMessageId);
  const from = emailAddress(message.from);
  const to = emailAddresses(message.to);
  const cc = emailAddresses(message.cc);
  const bcc = emailAddresses(message.bcc);
  const replyTo = emailAddress(message.replyTo);

  if (!from || (to.length === 0 && cc.length === 0 && bcc.length === 0)) {
    return null;
  }

  return {
    id,
    externalMessageId: sourceMessageId || id,
    type: asString(message.type),
    messageType: asString(message.messageType),
    subject: asString(message.subject),
    text: asString(message.text),
    createdAt: messageTimestamp(message.createdAt),
    from,
    to,
    replyTo,
    cc,
    bcc,
    attachments: [
      ...asArray(message.attachments),
      ...(message.file ? [message.file] : []),
    ],
    isForward: message.isForward === true,
  };
}

function eventMessages(payload: JsonObject): BrevoEmailMessage[] {
  const eventName = asString(payload.eventName);
  const candidates = eventName === "conversationStarted"
    ? [payload.message]
    : asArray(payload.messages);

  return candidates
    .map(parseMessage)
    .filter((message): message is BrevoEmailMessage => message !== null)
    .filter((message) => message.type === "visitor" && message.messageType !== "email_bounce");
}

function configuredInboxes(): InboxRoute[] {
  return [
    {
      code: "financeiro",
      email: normalizeEmail(env.BREVO_FINANCE_INBOX_EMAIL || "financeiro@f10.com.br"),
      groupId: asString(env.BREVO_FINANCE_GROUP_ID) || null,
    },
    {
      code: "sucesso",
      email: normalizeEmail(env.BREVO_SUCCESS_INBOX_EMAIL || "sucesso@f10.com.br"),
      groupId: asString(env.BREVO_SUCCESS_GROUP_ID) || null,
    },
  ];
}

function eventGroupId(payload: JsonObject): string {
  const visitor = asObject(payload.visitor);
  return asString(visitor?.groupId) || asString(payload.groupId);
}

function resolveInbox(payload: JsonObject, messages: BrevoEmailMessage[]): InboxRoute {
  const recipientEmails = new Set(
    messages.flatMap((message) => [
      ...message.to,
      ...message.cc,
      ...message.bcc,
    ]).map((recipient) => recipient.email),
  );
  const routes = configuredInboxes();
  const byRecipient = routes.filter((route) => recipientEmails.has(route.email));
  if (byRecipient.length === 1) return byRecipient[0];
  if (byRecipient.length > 1) {
    throw new EmailInboundError(
      "BREVO_EMAIL_INBOX_AMBIGUOUS",
      "Mais de uma caixa F10 foi encontrada na mesma conversa.",
      false,
    );
  }

  const groupId = eventGroupId(payload);
  const byGroup = routes.filter((route) => route.groupId && route.groupId === groupId);
  if (byGroup.length === 1) return byGroup[0];

  throw new EmailInboundError(
    "BREVO_EMAIL_INBOX_UNKNOWN",
    "Não foi possível identificar se o e-mail pertence ao Financeiro ou ao Sucesso.",
    false,
  );
}

function providerMessageIds(payload: JsonObject): string[] {
  const eventName = asString(payload.eventName);
  const candidates = eventName === "conversationStarted"
    ? [payload.message]
    : asArray(payload.messages);
  const ids = new Set<string>();

  for (const candidate of candidates) {
    const message = asObject(candidate);
    if (!message) continue;
    const id = asString(message.sourceMessageId) || asString(message.id);
    if (id) ids.add(id);
    if (ids.size >= MAX_MESSAGE_IDS) break;
  }

  return [...ids];
}

export async function enqueueBrevoConversationWebhook(input: {
  payload: JsonObject;
  payloadHash: string;
}): Promise<{ id: string; duplicate: boolean }> {
  const eventType = asString(input.payload.eventName) || "unknown";
  const conversationId = asString(input.payload.conversationId) || null;
  const db = getDatabase();
  const [created] = await db
    .insert(supportEmailInboundEvents)
    .values({
      provider: PROVIDER,
      eventType,
      conversationId,
      providerMessageIds: providerMessageIds(input.payload),
      payloadHash: input.payloadHash,
      rawPayload: input.payload,
    })
    .onConflictDoNothing()
    .returning({ id: supportEmailInboundEvents.id });

  if (created) return { id: created.id, duplicate: false };

  const [existing] = await db
    .select({ id: supportEmailInboundEvents.id })
    .from(supportEmailInboundEvents)
    .where(
      and(
        eq(supportEmailInboundEvents.provider, PROVIDER),
        eq(supportEmailInboundEvents.payloadHash, input.payloadHash),
      ),
    )
    .limit(1);
  if (!existing) throw new Error("BREVO_EMAIL_EVENT_NOT_PERSISTED");
  return { id: existing.id, duplicate: true };
}

export async function recoverStaleEmailInboundEvents(): Promise<void> {
  const db = getDatabase();
  const now = new Date();

  await db
    .update(supportEmailInboundEvents)
    .set({
      status: "retry_waiting",
      availableAt: now,
      lockedAt: null,
      leaseExpiresAt: null,
      lastErrorCode: "BREVO_EMAIL_WORKER_INTERRUPTED",
      lastErrorMessage: "O processamento anterior foi interrompido e será retomado.",
      updatedAt: now,
    })
    .where(
      and(
        eq(supportEmailInboundEvents.status, "processing"),
        isNotNull(supportEmailInboundEvents.leaseExpiresAt),
        lte(supportEmailInboundEvents.leaseExpiresAt, now),
        sql`${supportEmailInboundEvents.attemptCount} < ${supportEmailInboundEvents.maxAttempts}`,
      ),
    );

  await db
    .update(supportEmailInboundEvents)
    .set({
      status: "failed",
      lockedAt: null,
      leaseExpiresAt: null,
      lastErrorCode: "BREVO_EMAIL_MAX_ATTEMPTS_REACHED",
      lastErrorMessage: "O limite automático de tentativas foi atingido.",
      processedAt: now,
      updatedAt: now,
    })
    .where(
      and(
        eq(supportEmailInboundEvents.status, "processing"),
        isNotNull(supportEmailInboundEvents.leaseExpiresAt),
        lte(supportEmailInboundEvents.leaseExpiresAt, now),
        sql`${supportEmailInboundEvents.attemptCount} >= ${supportEmailInboundEvents.maxAttempts}`,
      ),
    );
}

export async function claimNextEmailInboundEvent(): Promise<SupportEmailInboundEvent | null> {
  const db = getDatabase();
  const now = new Date();
  const [candidate] = await db
    .select()
    .from(supportEmailInboundEvents)
    .where(
      and(
        or(
          eq(supportEmailInboundEvents.status, "pending"),
          and(
            eq(supportEmailInboundEvents.status, "retry_waiting"),
            lte(supportEmailInboundEvents.availableAt, now),
          ),
        ),
        sql`${supportEmailInboundEvents.attemptCount} < ${supportEmailInboundEvents.maxAttempts}`,
      ),
    )
    .orderBy(asc(supportEmailInboundEvents.receivedAt))
    .limit(1);
  if (!candidate) return null;

  const [claimed] = await db
    .update(supportEmailInboundEvents)
    .set({
      status: "processing",
      attemptCount: sql`${supportEmailInboundEvents.attemptCount} + 1`,
      lockedAt: now,
      leaseExpiresAt: new Date(now.getTime() + LEASE_MS),
      lastErrorCode: null,
      lastErrorMessage: null,
      updatedAt: now,
    })
    .where(
      and(
        eq(supportEmailInboundEvents.id, candidate.id),
        inArray(supportEmailInboundEvents.status, ["pending", "retry_waiting"]),
        sql`${supportEmailInboundEvents.attemptCount} < ${supportEmailInboundEvents.maxAttempts}`,
      ),
    )
    .returning();

  return claimed ?? null;
}

async function findUnambiguousCustomer(senderEmail: string): Promise<CustomerMatch | null> {
  const db = getDatabase();
  const contacts = await db
    .select({ id: customerContacts.id })
    .from(customerContacts)
    .where(
      and(
        eq(customerContacts.active, true),
        sql`lower(${customerContacts.email}) = ${normalizeEmail(senderEmail)}`,
      ),
    )
    .limit(2);
  if (contacts.length !== 1) return null;

  const contexts = await db
    .select({
      legacyUserId: ticketCustomerContexts.legacyUserId,
      groupId: ticketCustomerContexts.groupId,
      groupName: ticketCustomerContexts.groupName,
      subgroup: ticketCustomerContexts.subgroup,
      unitId: ticketCustomerContexts.unitId,
      unitName: ticketCustomerContexts.unitName,
      unitSchema: ticketCustomerContexts.unitSchema,
      updatedAt: ticketCustomerContexts.updatedAt,
    })
    .from(ticketCustomerContexts)
    .where(
      and(
        eq(ticketCustomerContexts.customerContactId, contacts[0].id),
        isNotNull(ticketCustomerContexts.groupId),
        isNotNull(ticketCustomerContexts.groupName),
        isNotNull(ticketCustomerContexts.subgroup),
        isNotNull(ticketCustomerContexts.unitId),
        isNotNull(ticketCustomerContexts.unitName),
        isNotNull(ticketCustomerContexts.unitSchema),
      ),
    )
    .orderBy(desc(ticketCustomerContexts.updatedAt))
    .limit(30);

  const unique = new Map<string, CustomerMatch>();
  for (const context of contexts) {
    if (
      context.groupId === null
      || context.groupName === null
      || context.subgroup === null
      || context.unitId === null
      || context.unitName === null
      || context.unitSchema === null
    ) continue;

    const key = `${context.groupId}:${context.unitId}:${context.unitSchema}`;
    unique.set(key, {
      contactId: contacts[0].id,
      legacyUserId: context.legacyUserId,
      groupId: context.groupId,
      groupName: context.groupName,
      subgroup: context.subgroup,
      unitId: context.unitId,
      unitName: context.unitName,
      unitSchema: context.unitSchema,
    });
  }

  return unique.size === 1 ? [...unique.values()][0] : null;
}

async function findThreadTicket(conversationId: string): Promise<string | null> {
  const [thread] = await getDatabase()
    .select({ ticketId: supportEmailThreads.ticketId })
    .from(supportEmailThreads)
    .where(
      and(
        eq(supportEmailThreads.provider, PROVIDER),
        eq(supportEmailThreads.conversationId, conversationId),
      ),
    )
    .limit(1);
  return thread?.ticketId ?? null;
}

function ticketSubject(message: BrevoEmailMessage): string {
  const subject = message.subject.replace(/\s+/g, " ").trim();
  if (subject) return subject.slice(0, 180);
  return `E-mail de ${message.from?.name || message.from?.email || "remetente externo"}`.slice(0, 180);
}

async function createThreadTicket(input: {
  conversationId: string;
  route: InboxRoute;
  message: BrevoEmailMessage;
}): Promise<string> {
  const existingTicketId = await findThreadTicket(input.conversationId);
  if (existingTicketId) return existingTicketId;

  const db = getDatabase();
  const [queue] = await db
    .select({ id: supportQueues.id })
    .from(supportQueues)
    .where(and(eq(supportQueues.code, input.route.code), eq(supportQueues.active, true)))
    .limit(1);
  if (!queue) throw new EmailInboundError("BREVO_EMAIL_QUEUE_NOT_FOUND");

  const customer = input.message.from
    ? await findUnambiguousCustomer(input.message.from.email)
    : null;

  try {
    return await db.transaction(async (tx) => {
      const [ticket] = await tx
        .insert(tickets)
        .values({
          customerContactId: customer?.contactId ?? null,
          queueId: queue.id,
          assignedUserId: null,
          subject: ticketSubject(input.message),
          status: "new",
          priority: "normal",
          channel: "email",
          createdByUserId: null,
        })
        .returning({ id: tickets.id });
      if (!ticket) throw new EmailInboundError("BREVO_EMAIL_TICKET_NOT_CREATED");

      const [thread] = await tx
        .insert(supportEmailThreads)
        .values({
          provider: PROVIDER,
          conversationId: input.conversationId,
          ticketId: ticket.id,
          inboxCode: input.route.code,
          senderName: input.message.from?.name ?? null,
          senderEmail: input.message.from?.email ?? "",
          recipientEmail: input.route.email,
        })
        .onConflictDoNothing()
        .returning({ id: supportEmailThreads.id });
      if (!thread) throw new EmailInboundError("BREVO_EMAIL_THREAD_RACE", undefined, true);

      if (customer) {
        await tx.insert(ticketCustomerContexts).values({
          ticketId: ticket.id,
          customerContactId: customer.contactId,
          legacyUserId: customer.legacyUserId,
          contextScope: "unit",
          groupId: customer.groupId,
          groupName: customer.groupName,
          subgroup: customer.subgroup,
          unitId: customer.unitId,
          unitName: customer.unitName,
          unitSchema: customer.unitSchema,
        });
      }

      await tx.insert(ticketEvents).values({
        ticketId: ticket.id,
        actorUserId: null,
        eventType: "ticket.created",
        metadata: {
          channel: "email",
          provider: PROVIDER,
          inboxCode: input.route.code,
          senderEmail: input.message.from?.email ?? null,
          customerMatched: Boolean(customer),
        },
      });

      return ticket.id;
    });
  } catch (cause) {
    if (cause instanceof EmailInboundError && cause.code === "BREVO_EMAIL_THREAD_RACE") {
      const racedTicketId = await findThreadTicket(input.conversationId);
      if (racedTicketId) return racedTicketId;
    }
    throw cause;
  }
}

function messageMetadata(message: BrevoEmailMessage): Record<string, unknown> {
  return {
    provider: PROVIDER,
    providerMessageId: message.id || null,
    from: message.from,
    to: message.to,
    replyTo: message.replyTo,
    cc: message.cc,
    bcc: message.bcc,
    attachments: message.attachments,
    isForward: message.isForward,
  };
}

async function saveIncomingMessage(input: {
  ticketId: string;
  conversationId: string;
  message: BrevoEmailMessage;
}): Promise<boolean> {
  if (!input.message.externalMessageId) {
    throw new EmailInboundError(
      "BREVO_EMAIL_MESSAGE_ID_MISSING",
      "A mensagem recebida não possui identificador externo.",
      false,
    );
  }

  const now = new Date();
  const [created] = await getDatabase()
    .insert(ticketMessages)
    .values({
      ticketId: input.ticketId,
      authorType: "customer",
      authorUserId: null,
      customerContactId: null,
      visibility: "public",
      channel: "email",
      body: input.message.text || "Mensagem recebida por e-mail.",
      externalMessageId: input.message.externalMessageId,
      externalThreadId: input.conversationId,
      externalMetadata: messageMetadata(input.message),
      createdAt: input.message.createdAt,
      updatedAt: input.message.createdAt,
    })
    .onConflictDoNothing()
    .returning({ id: ticketMessages.id });
  if (!created) return false;

  await getDatabase().transaction(async (tx) => {
    await tx
      .update(tickets)
      .set({ updatedAt: now })
      .where(eq(tickets.id, input.ticketId));
    await tx
      .update(supportEmailThreads)
      .set({
        senderName: input.message.from?.name ?? null,
        senderEmail: input.message.from?.email ?? "",
        updatedAt: now,
      })
      .where(
        and(
          eq(supportEmailThreads.provider, PROVIDER),
          eq(supportEmailThreads.conversationId, input.conversationId),
        ),
      );
    await tx.insert(ticketEvents).values({
      ticketId: input.ticketId,
      actorUserId: null,
      eventType: "ticket.email.received",
      metadata: {
        provider: PROVIDER,
        externalMessageId: input.message.externalMessageId,
        senderEmail: input.message.from?.email ?? null,
        attachmentCount: input.message.attachments.length,
      },
    });
  });

  return true;
}

export async function processEmailInboundEvent(
  event: SupportEmailInboundEvent,
): Promise<EmailInboundOutcome> {
  const payload = event.rawPayload;
  const eventName = asString(payload.eventName);
  if (!["conversationStarted", "conversationFragment", "conversationTranscript"].includes(eventName)) {
    return { status: "ignored", ticketId: null };
  }

  const conversationId = asString(payload.conversationId);
  if (!conversationId) {
    throw new EmailInboundError(
      "BREVO_EMAIL_CONVERSATION_ID_MISSING",
      "O webhook não possui conversationId.",
      false,
    );
  }

  const messages = eventMessages(payload);
  if (messages.length === 0) return { status: "ignored", ticketId: null };
  const route = resolveInbox(payload, messages);
  const ticketId = await createThreadTicket({
    conversationId,
    route,
    message: messages[0],
  });

  for (const message of messages) {
    await saveIncomingMessage({ ticketId, conversationId, message });
  }

  return { status: "processed", ticketId };
}

export async function completeEmailInboundEvent(
  eventId: string,
  outcome: EmailInboundOutcome,
): Promise<void> {
  const now = new Date();
  await getDatabase()
    .update(supportEmailInboundEvents)
    .set({
      status: outcome.status,
      ticketId: outcome.ticketId,
      lockedAt: null,
      leaseExpiresAt: null,
      processedAt: now,
      updatedAt: now,
    })
    .where(eq(supportEmailInboundEvents.id, eventId));
}

function retryDelayMs(attemptCount: number): number {
  return Math.min(30_000 * 2 ** Math.max(0, attemptCount - 1), 10 * 60_000);
}

export async function failEmailInboundEvent(
  event: SupportEmailInboundEvent,
  cause: unknown,
): Promise<void> {
  const now = new Date();
  const code = cause instanceof EmailInboundError
    ? cause.code
    : "BREVO_EMAIL_PROCESSING_FAILED";
  const message = cause instanceof Error
    ? cause.message.slice(0, 2_000)
    : "Falha inesperada ao processar o e-mail recebido.";
  const retryable = cause instanceof EmailInboundError ? cause.retryable : true;
  const canRetry = retryable && event.attemptCount < event.maxAttempts;

  await getDatabase()
    .update(supportEmailInboundEvents)
    .set({
      status: canRetry ? "retry_waiting" : "failed",
      availableAt: canRetry
        ? new Date(now.getTime() + retryDelayMs(event.attemptCount))
        : now,
      lockedAt: null,
      leaseExpiresAt: null,
      lastErrorCode: code,
      lastErrorMessage: message,
      processedAt: canRetry ? null : now,
      updatedAt: now,
    })
    .where(eq(supportEmailInboundEvents.id, event.id));
}
