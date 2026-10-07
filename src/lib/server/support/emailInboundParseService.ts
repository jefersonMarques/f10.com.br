import { env } from "$env/dynamic/private";
import { and, eq, inArray } from "drizzle-orm";
import { getDatabase } from "$lib/server/db";
import {
  supportEmailInboundEvents,
  supportEmailThreads,
  type SupportEmailInboundEvent,
} from "$lib/server/db/supportEmailSchema";
import {
  EmailInboundError,
  saveIncomingMessage,
  type BrevoEmailMessage,
  type EmailInboundOutcome,
} from "$lib/server/support/emailInboundService";

const PROVIDER = "brevo";
const EVENT_TYPE = "inboundEmailProcessed";
const MAX_MESSAGE_IDS = 100;

type JsonObject = Record<string, unknown>;
type EmailAddress = { email: string; name: string | null };

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

function mailbox(value: unknown): EmailAddress | null {
  if (typeof value === "string") {
    const email = normalizeEmail(value);
    return email.includes("@") ? { email, name: null } : null;
  }

  const object = asObject(value);
  if (!object) return null;
  const email = normalizeEmail(
    asString(object.Address)
      || asString(object.address)
      || asString(object.Email)
      || asString(object.email),
  );
  if (!email.includes("@")) return null;

  return {
    email,
    name: asString(object.Name) || asString(object.name) || null,
  };
}

function mailboxes(value: unknown): EmailAddress[] {
  return asArray(value)
    .map(mailbox)
    .filter((item): item is EmailAddress => item !== null);
}

function inboundDomain(): string {
  return (env.BREVO_INBOUND_DOMAIN?.trim().toLowerCase() || "reply.f10.com.br")
    .replace(/^@+/, "");
}

function escapeRegExp(value: string): string {
  return value.replace(/[\\^$.*+?()[\]{}|]/g, "\\$&");
}

function replyToken(address: string): string | null {
  const pattern = new RegExp(
    `^ticket\\+([a-f0-9]{48})@${escapeRegExp(inboundDomain())}$`,
    "i",
  );
  return normalizeEmail(address).match(pattern)?.[1]?.toLowerCase() ?? null;
}

function itemRecipients(item: JsonObject): EmailAddress[] {
  const recipients = [
    ...mailboxes(item.To),
    ...mailboxes(item.Recipients),
  ];
  const unique = new Map<string, EmailAddress>();
  for (const recipient of recipients) unique.set(recipient.email, recipient);
  return [...unique.values()];
}

function itemMessageIds(payload: JsonObject): string[] {
  const ids = new Set<string>();
  for (const raw of asArray(payload.items)) {
    const item = asObject(raw);
    if (!item) continue;
    const id = asString(item.MessageId)
      || asArray(item.Uuid).map(asString).find(Boolean)
      || "";
    if (id) ids.add(id);
    if (ids.size >= MAX_MESSAGE_IDS) break;
  }
  return [...ids];
}

function parsedDate(value: unknown): Date {
  const raw = asString(value);
  if (!raw) return new Date();
  const date = new Date(raw);
  return Number.isNaN(date.getTime()) ? new Date() : date;
}

function normalizeInboundMessage(item: JsonObject): BrevoEmailMessage {
  const from = mailbox(item.From);
  const to = itemRecipients(item);
  const externalMessageId = asString(item.MessageId)
    || asArray(item.Uuid).map(asString).find(Boolean)
    || "";

  if (!from) {
    throw new EmailInboundError(
      "BREVO_INBOUND_SENDER_MISSING",
      "O e-mail inbound não possui remetente válido.",
      false,
    );
  }
  if (!externalMessageId) {
    throw new EmailInboundError(
      "BREVO_INBOUND_MESSAGE_ID_MISSING",
      "O e-mail inbound não possui Message-ID nem UUID.",
      false,
    );
  }

  return {
    id: asArray(item.Uuid).map(asString).find(Boolean) || externalMessageId,
    externalMessageId,
    type: "visitor",
    messageType: "email",
    subject: asString(item.Subject),
    text:
      asString(item.ExtractedMarkdownMessage)
      || asString(item.RawTextBody)
      || "Mensagem recebida por e-mail.",
    createdAt: parsedDate(item.SentAtDate),
    from,
    to,
    replyTo: mailbox(item.ReplyTo),
    cc: mailboxes(item.Cc),
    bcc: [],
    attachments: asArray(item.Attachments),
    isForward: /^fwd?:/i.test(asString(item.Subject)),
  };
}

async function resolveThread(tokens: string[]) {
  if (tokens.length === 0) return null;

  const rows = await getDatabase()
    .select({
      id: supportEmailThreads.id,
      ticketId: supportEmailThreads.ticketId,
      conversationId: supportEmailThreads.conversationId,
      replyToken: supportEmailThreads.replyToken,
    })
    .from(supportEmailThreads)
    .where(
      and(
        eq(supportEmailThreads.provider, PROVIDER),
        inArray(supportEmailThreads.replyToken, tokens),
      ),
    )
    .limit(3);

  const uniqueTickets = new Set(rows.map((row) => row.ticketId));
  if (uniqueTickets.size > 1) {
    throw new EmailInboundError(
      "BREVO_INBOUND_REPLY_ROUTE_AMBIGUOUS",
      "Mais de um ticket corresponde aos destinatários do e-mail inbound.",
      false,
    );
  }

  return rows[0] ?? null;
}

export async function enqueueBrevoInboundWebhook(input: {
  payload: JsonObject;
  payloadHash: string;
}): Promise<{ id: string; duplicate: boolean }> {
  const db = getDatabase();
  const [created] = await db
    .insert(supportEmailInboundEvents)
    .values({
      provider: PROVIDER,
      eventType: EVENT_TYPE,
      conversationId: null,
      providerMessageIds: itemMessageIds(input.payload),
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

  if (!existing) throw new Error("BREVO_INBOUND_EVENT_NOT_PERSISTED");
  return { id: existing.id, duplicate: true };
}

export async function processBrevoInboundParseEvent(
  event: SupportEmailInboundEvent,
): Promise<EmailInboundOutcome> {
  const ticketIds = new Set<string>();
  let processedMessages = 0;

  for (const raw of asArray(event.rawPayload.items)) {
    const item = asObject(raw);
    if (!item) continue;

    const tokens = Array.from(
      new Set(
        itemRecipients(item)
          .map((recipient) => replyToken(recipient.email))
          .filter((token): token is string => Boolean(token)),
      ),
    );

    const thread = await resolveThread(tokens);
    if (!thread) continue;

    const message = normalizeInboundMessage(item);
    await saveIncomingMessage({
      ticketId: thread.ticketId,
      conversationId: thread.conversationId,
      message,
    });
    ticketIds.add(thread.ticketId);
    processedMessages += 1;
  }

  if (processedMessages === 0) {
    return { status: "ignored", ticketId: null };
  }

  return {
    status: "processed",
    ticketId: ticketIds.size === 1 ? [...ticketIds][0] : null,
  };
}
