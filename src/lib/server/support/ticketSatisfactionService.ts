import { createHash, randomBytes } from "node:crypto";
import { and, eq, gt, isNull } from "drizzle-orm";
import { getDatabase } from "$lib/server/db";
import { ticketSatisfactionSurveys } from "$lib/server/db/ticketSatisfactionSchema";
import { customerContacts, ticketEvents, tickets } from "$lib/server/db/supportSchema";
import { buildEmailHtml } from "$lib/server/email/emailTemplate";
import { sendTransactionalEmail } from "$lib/server/email/transactionalEmail";
import { getCustomerPortalBaseUrl } from "$lib/server/customerPortal/customerPortalMailer";

const SURVEY_TTL_MS = 90 * 24 * 60 * 60 * 1000;

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

function createSurveyToken(): string {
  return randomBytes(32).toString("base64url");
}

export async function requestTicketSatisfaction(ticketId: string): Promise<void> {
  const db = getDatabase();
  const [ticket] = await db
    .select({
      id: tickets.id,
      ticketNumber: tickets.ticketNumber,
      subject: tickets.subject,
      status: tickets.status,
      customerContactId: tickets.customerContactId,
      customerName: customerContacts.name,
      customerEmail: customerContacts.email,
    })
    .from(tickets)
    .leftJoin(customerContacts, eq(customerContacts.id, tickets.customerContactId))
    .where(eq(tickets.id, ticketId))
    .limit(1);

  if (
    !ticket ||
    (ticket.status !== "resolved" && ticket.status !== "closed") ||
    !ticket.customerContactId ||
    !ticket.customerEmail
  ) {
    return;
  }

  const token = createSurveyToken();
  const now = new Date();
  const expiresAt = new Date(now.getTime() + SURVEY_TTL_MS);
  const [created] = await db
    .insert(ticketSatisfactionSurveys)
    .values({
      ticketId: ticket.id,
      customerContactId: ticket.customerContactId,
      tokenHash: hashToken(token),
      requestedAt: now,
      expiresAt,
    })
    .onConflictDoNothing()
    .returning({ ticketId: ticketSatisfactionSurveys.ticketId });

  if (!created) return;

  const baseUrl = getCustomerPortalBaseUrl("https://f10.com.br");
  const surveyUrl = `${baseUrl}/avaliar/${encodeURIComponent(token)}`;
  const name = ticket.customerName || "cliente";

  await sendTransactionalEmail({
    to: { email: ticket.customerEmail, name },
    subject: `Como foi o atendimento do ticket #${ticket.ticketNumber}?`,
    textContent: [
      `Olá, ${name}.`,
      "",
      `O ticket #${ticket.ticketNumber} foi resolvido.`,
      "Conte para a F10 como foi sua experiência:",
      surveyUrl,
    ].join("\n"),
    htmlContent: buildEmailHtml({
      eyebrow: "Pesquisa de satisfação",
      title: `Como foi o atendimento do ticket #${ticket.ticketNumber}?`,
      greeting: `Olá, ${name}.`,
      body: [
        `O chamado “${ticket.subject}” foi resolvido.`,
        "Sua avaliação leva menos de um minuto e ajuda a F10 a melhorar o atendimento.",
      ],
      action: { label: "Avaliar atendimento", href: surveyUrl },
      footer: "A pesquisa é vinculada somente a este atendimento.",
    }),
  });
}

export async function getTicketSatisfactionByToken(token: string) {
  const cleanToken = token.trim();
  if (!/^[A-Za-z0-9_-]{40,120}$/.test(cleanToken)) return null;

  const [survey] = await getDatabase()
    .select({
      ticketId: ticketSatisfactionSurveys.ticketId,
      ticketNumber: tickets.ticketNumber,
      subject: tickets.subject,
      score: ticketSatisfactionSurveys.score,
      comment: ticketSatisfactionSurveys.comment,
      expiresAt: ticketSatisfactionSurveys.expiresAt,
      answeredAt: ticketSatisfactionSurveys.answeredAt,
    })
    .from(ticketSatisfactionSurveys)
    .innerJoin(tickets, eq(tickets.id, ticketSatisfactionSurveys.ticketId))
    .where(eq(ticketSatisfactionSurveys.tokenHash, hashToken(cleanToken)))
    .limit(1);

  return survey ?? null;
}

export async function submitTicketSatisfaction(input: {
  token: string;
  score: number;
  comment: string;
}): Promise<boolean> {
  if (!Number.isInteger(input.score) || input.score < 1 || input.score > 5) {
    throw new Error("TICKET_SATISFACTION_SCORE_INVALID");
  }
  const comment = input.comment.trim();
  if (comment.length > 2000) throw new Error("TICKET_SATISFACTION_COMMENT_TOO_LONG");

  const db = getDatabase();
  const now = new Date();

  return db.transaction(async (tx) => {
    const [updated] = await tx
      .update(ticketSatisfactionSurveys)
      .set({
        score: input.score,
        comment: comment || null,
        answeredAt: now,
      })
      .where(
        and(
          eq(ticketSatisfactionSurveys.tokenHash, hashToken(input.token.trim())),
          isNull(ticketSatisfactionSurveys.answeredAt),
          gt(ticketSatisfactionSurveys.expiresAt, now),
        ),
      )
      .returning({ ticketId: ticketSatisfactionSurveys.ticketId });

    if (!updated) return false;

    await tx.insert(ticketEvents).values({
      ticketId: updated.ticketId,
      eventType: "ticket.satisfaction.received",
      metadata: { score: input.score },
    });
    return true;
  });
}

export async function getTicketSatisfaction(ticketId: string) {
  const [survey] = await getDatabase()
    .select({
      score: ticketSatisfactionSurveys.score,
      comment: ticketSatisfactionSurveys.comment,
      requestedAt: ticketSatisfactionSurveys.requestedAt,
      answeredAt: ticketSatisfactionSurveys.answeredAt,
      expiresAt: ticketSatisfactionSurveys.expiresAt,
    })
    .from(ticketSatisfactionSurveys)
    .where(eq(ticketSatisfactionSurveys.ticketId, ticketId))
    .limit(1);
  return survey ?? null;
}
