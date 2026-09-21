import { and, asc, eq } from "drizzle-orm";
import { getPermissionScope, resolveUserPermissions } from "$lib/server/auth/permissions";
import { getDatabase } from "$lib/server/db";
import { internalNotifications } from "$lib/server/db/notificationSchema";
import { users } from "$lib/server/db/schema";
import { ticketFollowers, tickets } from "$lib/server/db/supportSchema";
import {
  requireTicketAccess,
  type SupportPermissionMap,
} from "$lib/server/support/supportAccess";

function followerManagementScope(permissions: SupportPermissionMap) {
  return getPermissionScope(permissions, "tickets.assign")
    ?? getPermissionScope(permissions, "tickets.reply");
}

export async function listTicketFollowers(ticketId: string) {
  return getDatabase()
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
    })
    .from(ticketFollowers)
    .innerJoin(users, eq(ticketFollowers.userId, users.id))
    .where(eq(ticketFollowers.ticketId, ticketId))
    .orderBy(asc(users.name));
}

export async function listTicketFollowerCandidates() {
  const activeUsers = await getDatabase()
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
    })
    .from(users)
    .where(eq(users.status, "active"))
    .orderBy(asc(users.name));

  const eligible = await Promise.all(
    activeUsers.map(async (user) => {
      const permissions = await resolveUserPermissions(user.id);
      return getPermissionScope(permissions, "tickets.view") ? user : null;
    }),
  );

  return eligible.filter(
    (user): user is { id: string; name: string; email: string } => Boolean(user),
  );
}

export async function addTicketFollower(
  actorUserId: string,
  permissions: SupportPermissionMap,
  ticketId: string,
  followerUserId: string,
): Promise<void> {
  const scope = followerManagementScope(permissions);
  if (!scope) throw new Error("TICKET_FOLLOWER_NOT_ALLOWED");
  await requireTicketAccess(actorUserId, scope, ticketId);

  const followerPermissions = await resolveUserPermissions(followerUserId);
  if (!getPermissionScope(followerPermissions, "tickets.view")) {
    throw new Error("TICKET_FOLLOWER_USER_NOT_ELIGIBLE");
  }

  const db = getDatabase();
  const [[user], [ticket]] = await Promise.all([
    db
      .select({ id: users.id })
      .from(users)
      .where(and(eq(users.id, followerUserId), eq(users.status, "active")))
      .limit(1),
    db
      .select({
        ticketNumber: tickets.ticketNumber,
        subject: tickets.subject,
      })
      .from(tickets)
      .where(eq(tickets.id, ticketId))
      .limit(1),
  ]);

  if (!user) throw new Error("TICKET_FOLLOWER_USER_NOT_ELIGIBLE");
  if (!ticket) throw new Error("TICKET_NOT_FOUND");

  const [created] = await db
    .insert(ticketFollowers)
    .values({
      ticketId,
      userId: followerUserId,
      createdBy: actorUserId,
    })
    .onConflictDoNothing()
    .returning({ userId: ticketFollowers.userId });

  if (created && followerUserId !== actorUserId) {
    await db.insert(internalNotifications).values({
      userId: followerUserId,
      actorUserId,
      kind: "ticket.following",
      title: `Você está acompanhando o ticket #${ticket.ticketNumber}`,
      body: ticket.subject.slice(0, 500),
      href: `/app/tickets/${ticketId}`,
      entityType: "ticket",
      entityId: ticketId,
    });
  }
}

export async function removeTicketFollower(
  actorUserId: string,
  permissions: SupportPermissionMap,
  ticketId: string,
  followerUserId: string,
): Promise<void> {
  const scope = followerManagementScope(permissions);
  if (!scope) throw new Error("TICKET_FOLLOWER_NOT_ALLOWED");
  await requireTicketAccess(actorUserId, scope, ticketId);

  await getDatabase()
    .delete(ticketFollowers)
    .where(
      and(
        eq(ticketFollowers.ticketId, ticketId),
        eq(ticketFollowers.userId, followerUserId),
      ),
    );
}
