import { and, eq } from "drizzle-orm";
import { getDatabase } from "$lib/server/db";
import { teamMembers, teams, users } from "$lib/server/db/schema";
import {
  serviceRequestEmailRecipients,
  serviceRequestRoutes,
} from "$lib/server/db/serviceRequestSchema";
import { supportQueues } from "$lib/server/db/supportSchema";
import { sendTransactionalEmail } from "$lib/server/email/transactionalEmail";
import {
  serviceRequestLabel,
  type ServiceRequestDataValue,
  type ServiceRequestType,
} from "$lib/server/serviceRequests/serviceRequestDefinitions";

function requestDetail(data: Record<string, ServiceRequestDataValue>): string {
  const values = [
    data.unitFantasyName,
    data.fantasyName,
    data.unitLegalName,
    data.legalName,
    data.cnpj,
  ];
  const value = values.find((candidate) => typeof candidate === "string" && candidate.trim());
  return typeof value === "string" ? value.trim().slice(0, 160) : "Solicitação recebida";
}

async function getRecipient(requestType: ServiceRequestType) {
  const [recipient] = await getDatabase()
    .select({ id: users.id, name: users.name, email: users.email })
    .from(serviceRequestEmailRecipients)
    .innerJoin(users, eq(users.id, serviceRequestEmailRecipients.recipientUserId))
    .innerJoin(serviceRequestRoutes, eq(serviceRequestRoutes.requestType, serviceRequestEmailRecipients.requestType))
    .innerJoin(supportQueues, eq(supportQueues.id, serviceRequestRoutes.queueId))
    .innerJoin(teams, eq(teams.id, supportQueues.teamId))
    .innerJoin(
      teamMembers,
      and(eq(teamMembers.teamId, teams.id), eq(teamMembers.userId, users.id)),
    )
    .where(
      and(
        eq(serviceRequestEmailRecipients.requestType, requestType),
        eq(serviceRequestRoutes.active, true),
        eq(supportQueues.active, true),
        eq(teams.active, true),
        eq(users.status, "active"),
      ),
    )
    .limit(1);
  return recipient ?? null;
}

export async function notifyServiceRequestRecipient(input: {
  requestType: ServiceRequestType;
  ticketNumber: number;
  data: Record<string, ServiceRequestDataValue>;
}): Promise<void> {
  const recipient = await getRecipient(input.requestType);
  if (!recipient) return;

  const label = serviceRequestLabel(input.requestType);
  const detail = requestDetail(input.data);
  await sendTransactionalEmail({
    to: { email: recipient.email, name: recipient.name },
    subject: `Ticket #${input.ticketNumber} · Nova solicitação de ${label}`,
    textContent: [
      `Olá, ${recipient.name}.`,
      "",
      `Uma nova solicitação de ${label} foi recebida.`,
      `Ticket: #${input.ticketNumber}`,
      `Referência: ${detail}`,
      "",
      "Acesse o F10 Operations para visualizar e atender o ticket.",
    ].join("\n"),
  });
}
