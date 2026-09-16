import { and, asc, eq } from "drizzle-orm";
import { getDatabase } from "$lib/server/db";
import { teamMembers, teams, users } from "$lib/server/db/schema";
import {
  serviceRequestEmailRecipients,
  serviceRequestRoutes,
} from "$lib/server/db/serviceRequestSchema";
import { supportQueues } from "$lib/server/db/supportSchema";
import {
  SERVICE_REQUEST_TYPES,
  type ServiceRequestType,
} from "$lib/server/serviceRequests/serviceRequestDefinitions";

export type ServiceRequestEmailCandidate = {
  id: string;
  name: string;
  email: string;
};

export type ServiceRequestEmailSetting = {
  requestType: ServiceRequestType;
  recipientUserId: string | null;
  users: ServiceRequestEmailCandidate[];
};

async function listCandidates(requestType: ServiceRequestType): Promise<ServiceRequestEmailCandidate[]> {
  return getDatabase()
    .select({ id: users.id, name: users.name, email: users.email })
    .from(serviceRequestRoutes)
    .innerJoin(supportQueues, eq(supportQueues.id, serviceRequestRoutes.queueId))
    .innerJoin(teams, eq(teams.id, supportQueues.teamId))
    .innerJoin(teamMembers, eq(teamMembers.teamId, teams.id))
    .innerJoin(users, eq(users.id, teamMembers.userId))
    .where(
      and(
        eq(serviceRequestRoutes.requestType, requestType),
        eq(serviceRequestRoutes.active, true),
        eq(supportQueues.active, true),
        eq(teams.active, true),
        eq(users.status, "active"),
      ),
    )
    .orderBy(asc(users.name), asc(users.email));
}

export async function getServiceRequestEmailSettings(): Promise<ServiceRequestEmailSetting[]> {
  const db = getDatabase();
  const [saved, ...candidateLists] = await Promise.all([
    db
      .select({
        requestType: serviceRequestEmailRecipients.requestType,
        recipientUserId: serviceRequestEmailRecipients.recipientUserId,
      })
      .from(serviceRequestEmailRecipients),
    ...SERVICE_REQUEST_TYPES.map((requestType) => listCandidates(requestType)),
  ]);
  const recipientByType = new Map(saved.map((row) => [row.requestType, row.recipientUserId]));

  return SERVICE_REQUEST_TYPES.map((requestType, index) => ({
    requestType,
    recipientUserId: recipientByType.get(requestType) ?? null,
    users: candidateLists[index] ?? [],
  }));
}

export async function updateServiceRequestEmailRecipients(
  updatedBy: string,
  recipients: Record<ServiceRequestType, string | null>,
): Promise<void> {
  const candidateLists = await Promise.all(
    SERVICE_REQUEST_TYPES.map((requestType) => listCandidates(requestType)),
  );

  SERVICE_REQUEST_TYPES.forEach((requestType, index) => {
    const recipientUserId = recipients[requestType];
    if (!recipientUserId) return;
    if (!(candidateLists[index] ?? []).some((user) => user.id === recipientUserId)) {
      throw new Error(`SERVICE_REQUEST_EMAIL_RECIPIENT_INVALID:${requestType}`);
    }
  });

  const db = getDatabase();
  const now = new Date();
  await db.transaction(async (tx) => {
    for (const requestType of SERVICE_REQUEST_TYPES) {
      await tx
        .insert(serviceRequestEmailRecipients)
        .values({
          requestType,
          recipientUserId: recipients[requestType],
          updatedBy,
          updatedAt: now,
        })
        .onConflictDoUpdate({
          target: serviceRequestEmailRecipients.requestType,
          set: {
            recipientUserId: recipients[requestType],
            updatedBy,
            updatedAt: now,
          },
        });
    }
  });
}
