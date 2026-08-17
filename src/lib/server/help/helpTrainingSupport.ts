import { and, eq } from "drizzle-orm";
import { getDatabase } from "$lib/server/db";
import {
  helpTrainingEvents,
  helpTrainingStepProgress,
} from "$lib/server/db/helpTrainingSchema";
import { ticketEvents, ticketMessages, tickets } from "$lib/server/db/supportSchema";
import {
  getHelpTrainingSession,
  requestHelpForTrainingStep,
} from "$lib/server/help/helpTrainingRepository";

function buildTrainingHelpBody(
  state: NonNullable<Awaited<ReturnType<typeof getHelpTrainingSession>>>,
  detail: string,
): string {
  const currentStep = state.currentStep;
  if (!currentStep) throw new Error("TRAINING_SESSION_INVALID");
  const failureLabel = state.progress?.failureReasonKey
    ? currentStep.failureReasons.find((reason) => reason.key === state.progress?.failureReasonKey)?.label
    : null;
  return [
    "Nova solicitação de ajuda durante a Trilha F10.",
    `Participante: ${state.invite.participantName} <${state.invite.participantEmail}>`,
    state.invite.organizationName ? `Empresa: ${state.invite.organizationName}` : "",
    `Trilha: ${state.snapshot.title} · versão ${state.snapshot.version}`,
    `Microação atual: ${currentStep.title}`,
    failureLabel ? `Motivo informado: ${failureLabel}` : "",
    state.progress ? `Tentativas registradas: ${state.progress.attemptCount}` : "",
    detail.trim() ? `Detalhes: ${detail.trim().slice(0, 4000)}` : "",
  ]
    .filter(Boolean)
    .join("\n");
}

export async function requestTrainingHumanHelp(rawSessionToken: string, detail: string) {
  const state = await getHelpTrainingSession(rawSessionToken);
  if (!state || !state.currentStep) throw new Error("TRAINING_SESSION_INVALID");
  if (!state.session.supportTicketId) {
    return requestHelpForTrainingStep(rawSessionToken, detail);
  }

  const db = getDatabase();
  const [ticket] = await db
    .select({
      id: tickets.id,
      ticketNumber: tickets.ticketNumber,
      customerContactId: tickets.customerContactId,
    })
    .from(tickets)
    .where(eq(tickets.id, state.session.supportTicketId))
    .limit(1);
  if (!ticket) throw new Error("TRAINING_SUPPORT_TICKET_NOT_FOUND");

  const body = buildTrainingHelpBody(state, detail);
  const now = new Date();
  await db.transaction(async (tx) => {
    await tx.insert(ticketMessages).values({
      ticketId: ticket.id,
      authorType: "customer",
      customerContactId: ticket.customerContactId,
      visibility: "public",
      channel: "portal",
      body,
    });
    await tx.insert(ticketEvents).values({
      ticketId: ticket.id,
      eventType: "training.help_requested",
      metadata: {
        trainingPathId: state.snapshot.pathId,
        trainingVersion: state.snapshot.version,
        trainingSessionId: state.session.id,
        trainingStepId: state.currentStep!.id,
        repeatedRequest: true,
      },
    });
    await tx
      .insert(helpTrainingStepProgress)
      .values({
        sessionId: state.session.id,
        stepKey: state.currentStep!.id,
        status: "help_requested",
        attemptCount: Math.max(1, state.progress?.attemptCount ?? 1),
        failureReasonKey: state.progress?.failureReasonKey ?? null,
        failureDetail: detail.trim().slice(0, 4000),
        helpTicketId: ticket.id,
        updatedAt: now,
      })
      .onConflictDoUpdate({
        target: [helpTrainingStepProgress.sessionId, helpTrainingStepProgress.stepKey],
        set: {
          status: "help_requested",
          failureReasonKey: state.progress?.failureReasonKey ?? null,
          failureDetail: detail.trim().slice(0, 4000),
          helpTicketId: ticket.id,
          updatedAt: now,
        },
      });
    await tx.insert(helpTrainingEvents).values({
      sessionId: state.session.id,
      stepKey: state.currentStep!.id,
      eventType: "human_help_requested",
      metadata: { ticketId: ticket.id, ticketNumber: ticket.ticketNumber, repeatedRequest: true },
    });
  });

  return { ticketId: ticket.id, ticketNumber: ticket.ticketNumber, reused: true };
}
