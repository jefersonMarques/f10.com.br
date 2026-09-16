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
  recipientUserIds: string[];
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
  const [saved, candidateLists] = await Promise.all([
    db
      .select({
        requestType: serviceRequestEmailRecipients.requestType,
        recipientUserId: serviceRequestEmailRecipients.recipientUserId,
      })
      .from(serviceRequestEmailRecipients),
    Promise.all(SERVICE_REQUEST_TYPES.map((requestType) => listCandidates(requestType))),
  ]);
  const recipientIdsByType = new Map<ServiceRequestType, string[]>();
  for (const row of saved) {
    const current = recipientIdsByType.get(row.requestType) ?? [];
    current.push(row.recipientUserId);
    recipientIdsByType.set(row.requestType, current);
  }

  return SERVICE_REQUEST_TYPES.map((requestType, index) => ({
    requestType,
    recipientUserIds: recipientIdsByType.get(requestType) ?? [],
    users: candidateLists[index] ?? [],
  }));
}

export async function updateServiceRequestEmailRecipients(
  updatedBy: string,
  recipients: Record<ServiceRequestType, string[]>,
): Promise<void> {
  const candidateLists = await Promise.all(
    SERVICE_REQUEST_TYPES.map((requestType) => listCandidates(requestType)),
  );
  const normalized = Object.fromEntries(
    SERVICE_REQUEST_TYPES.map((requestType) => [
      requestType,
      Array.from(new Set(recipients[requestType] ?? [])),
    ]),
  ) as Record<ServiceRequestType, string[]>;

  SERVICE_REQUEST_TYPES.forEach((requestType, index) => {
    const allowedIds = new Set((candidateLists[index] ?? []).map((user) => user.id));
    if (normalized[requestType].some((recipientUserId) => !allowedIds.has(recipientUserId))) {
      throw new Error(`SERVICE_REQUEST_EMAIL_RECIPIENT_INVALID:${requestType}`);
    }
  });

  const db = getDatabase();
  const now = new Date();
  await db.transaction(async (tx) => {
    for (const requestType of SERVICE_REQUEST_TYPES) {
      await tx
        .delete(serviceRequestEmailRecipients)
        .where(eq(serviceRequestEmailRecipients.requestType, requestType));

      const recipientUserIds = normalized[requestType];
      if (recipientUserIds.length === 0) continue;

      await tx.insert(serviceRequestEmailRecipients).values(
        recipientUserIds.map((recipientUserId) => ({
          requestType,
          recipientUserId,
          updatedBy,
          createdAt: now,
          updatedAt: now,
        })),
      );
    }
  });
}
