import { createHash } from "node:crypto";
import { and, eq, sql } from "drizzle-orm";
import { getDatabase } from "$lib/server/db";
import { ticketWorkflowStates } from "$lib/server/db/ticketWorkflowSchema";
import {
  ticketEvents,
  ticketMessages,
  tickets,
} from "$lib/server/db/supportSchema";
import { resolveServiceRequestIntake } from "$lib/server/serviceRequests/serviceRequestIntake";
import { notifySupportTicketNeedsAttention } from "$lib/server/support/supportTeamNotifications";
import { calculateTicketSlaDeadlines } from "$lib/server/support/ticketSlaService";

const EVENT_TYPE = "lead.nfse_interest.created";

export type NfseInterestLeadInput = {
  submittedAt: string;
  name: string;
  email: string;
  whatsapp: string;
  schoolName: string;
  city: string;
  state: string;
  ibgeCode: string;
  cityCheckStatus: "available" | "unavailable" | "error";
  cityCheckMessage: string;
};

export type NfseInterestTicketResult = {
  ticketId: string;
  ticketNumber: number;
  deduplicated: boolean;
};

function submissionKey(input: NfseInterestLeadInput): string {
  return createHash("sha256")
    .update(JSON.stringify({
      submittedAt: input.submittedAt,
      email: input.email.toLowerCase(),
      schoolName: input.schoolName,
      city: input.city,
      state: input.state.toUpperCase(),
    }))
    .digest("hex");
}

function ticketSubject(input: NfseInterestLeadInput): string {
  return `Lead Nota Fiscal • ${input.schoolName} • ${input.city}/${input.state.toUpperCase()}`
    .slice(0, 180);
}

function ticketBody(input: NfseInterestLeadInput): string {
  return [
    "Lead interessado em Nota Fiscal recebido pelo site.",
    "",
    `Nome: ${input.name}`,
    `E-mail: ${input.email}`,
    `WhatsApp: ${input.whatsapp}`,
    `Escola: ${input.schoolName}`,
    `Cidade: ${input.city}/${input.state.toUpperCase()}`,
    ...(input.ibgeCode ? [`Código IBGE: ${input.ibgeCode}`] : []),
    `Status da cidade: ${input.cityCheckStatus}`,
    ...(input.cityCheckMessage ? [`Verificação: ${input.cityCheckMessage}`] : []),
    `Enviado em: ${input.submittedAt}`,
  ].join("\n");
}

async function findExistingTicket(
  key: string,
): Promise<NfseInterestTicketResult | null> {
  const [row] = await getDatabase()
    .select({
      ticketId: tickets.id,
      ticketNumber: tickets.ticketNumber,
    })
    .from(ticketEvents)
    .innerJoin(tickets, eq(tickets.id, ticketEvents.ticketId))
    .where(
      and(
        eq(ticketEvents.eventType, EVENT_TYPE),
        sql`${ticketEvents.metadata}->>'submissionKey' = ${key}`,
      ),
    )
    .limit(1);

  return row ? { ...row, deduplicated: true } : null;
}

export async function createNfseInterestTicket(
  input: NfseInterestLeadInput,
): Promise<NfseInterestTicketResult> {
  const key = submissionKey(input);
  const existing = await findExistingTicket(key);
  if (existing) return existing;

  const intake = await resolveServiceRequestIntake("nfse");
  const db = getDatabase();
  const now = new Date();
  const sla = await calculateTicketSlaDeadlines(intake.queueId, now);

  const result = await db.transaction(async (tx): Promise<NfseInterestTicketResult> => {
    await tx.execute(sql`select pg_advisory_xact_lock(hashtext(${`nfse-interest:${key}`}))`);

    const [duplicate] = await tx
      .select({
        ticketId: tickets.id,
        ticketNumber: tickets.ticketNumber,
      })
      .from(ticketEvents)
      .innerJoin(tickets, eq(tickets.id, ticketEvents.ticketId))
      .where(
        and(
          eq(ticketEvents.eventType, EVENT_TYPE),
          sql`${ticketEvents.metadata}->>'submissionKey' = ${key}`,
        ),
      )
      .limit(1);

    if (duplicate) return { ...duplicate, deduplicated: true };

    const [ticket] = await tx
      .insert(tickets)
      .values({
        customerContactId: null,
        queueId: intake.queueId,
        assignedUserId: null,
        subject: ticketSubject(input),
        status: intake.lifecycleStatus,
        priority: "normal",
        channel: "manual",
        dueOn: sql`CURRENT_DATE + ${intake.defaultDueDays}::integer`,
        firstResponseDueAt: sla.firstResponseDueAt,
        resolutionDueAt: sla.resolutionDueAt,
        createdByUserId: null,
      })
      .returning({
        id: tickets.id,
        ticketNumber: tickets.ticketNumber,
      });

    if (!ticket) throw new Error("NFSE_INTEREST_TICKET_NOT_CREATED");

    await tx.insert(ticketMessages).values({
      ticketId: ticket.id,
      authorType: "customer",
      authorUserId: null,
      customerContactId: null,
      visibility: "public",
      channel: "manual",
      body: ticketBody(input),
    });

    await tx.insert(ticketWorkflowStates).values({
      ticketId: ticket.id,
      globalWorkflowId: intake.globalWorkflowId,
      globalStageId: intake.globalStageId,
      areaId: intake.areaId,
      areaWorkflowId: intake.areaWorkflowId,
      areaStageId: intake.areaStageId,
      enteredAt: now,
      areaEnteredAt: now,
      updatedAt: now,
    });

    await tx.insert(ticketEvents).values({
      ticketId: ticket.id,
      actorUserId: null,
      eventType: EVENT_TYPE,
      metadata: {
        source: "site_nfse_interest",
        submissionKey: key,
        submittedAt: input.submittedAt,
        cityCheckStatus: input.cityCheckStatus,
        ibgeCode: input.ibgeCode || null,
      },
    });

    return {
      ticketId: ticket.id,
      ticketNumber: ticket.ticketNumber,
      deduplicated: false,
    };
  });

  if (!result.deduplicated) {
    await notifySupportTicketNeedsAttention(
      result.ticketId,
      "Novo lead de Nota Fiscal enviado pelo site.",
    ).catch((cause) => {
      console.error("[nfse-interest.notification]", {
        ticketId: result.ticketId,
        causeType: cause instanceof Error ? cause.name : typeof cause,
      });
    });
  }

  return result;
}
