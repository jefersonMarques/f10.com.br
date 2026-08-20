import { and, eq, isNotNull } from "drizzle-orm";
import {
  createGoogleCalendarEvent,
  deleteGoogleCalendarEvent,
  updateGoogleCalendarEvent,
  type GoogleCalendarEvent,
} from "$lib/server/calendar/googleCalendarRepository";
import { getDatabase } from "$lib/server/db";
import { ticketGoogleCalendarLinks } from "$lib/server/db/googleCalendarSchema";
import { ticketEvents, tickets } from "$lib/server/db/supportSchema";

function isCompleted(status: string): boolean {
  return status === "resolved" || status === "closed";
}

function ticketEventTitle(ticket: { ticketNumber: number; subject: string; status: string }): string {
  const prefix = isCompleted(ticket.status) ? "✓ " : "";
  return `${prefix}#${ticket.ticketNumber} · ${ticket.subject}`.slice(0, 180);
}

async function getTicketSnapshot(ticketId: string) {
  const db = getDatabase();
  const [ticket] = await db
    .select({
      id: tickets.id,
      ticketNumber: tickets.ticketNumber,
      subject: tickets.subject,
      status: tickets.status,
      dueOn: tickets.dueOn,
      assignedUserId: tickets.assignedUserId,
      updatedAt: tickets.updatedAt,
    })
    .from(tickets)
    .where(eq(tickets.id, ticketId))
    .limit(1);
  return ticket ?? null;
}

export async function listUserTicketGoogleCalendarLinks(userId: string) {
  const db = getDatabase();
  return db
    .select({
      ticketId: ticketGoogleCalendarLinks.ticketId,
      userId: ticketGoogleCalendarLinks.userId,
      googleCalendarId: ticketGoogleCalendarLinks.googleCalendarId,
      googleEventId: ticketGoogleCalendarLinks.googleEventId,
      googleIcalUid: ticketGoogleCalendarLinks.googleIcalUid,
      googleHtmlLink: ticketGoogleCalendarLinks.googleHtmlLink,
      autoManaged: ticketGoogleCalendarLinks.autoManaged,
      googleUpdatedAt: ticketGoogleCalendarLinks.googleUpdatedAt,
      lastSyncedAt: ticketGoogleCalendarLinks.lastSyncedAt,
      lastSyncError: ticketGoogleCalendarLinks.lastSyncError,
      lastSyncSource: ticketGoogleCalendarLinks.lastSyncSource,
    })
    .from(ticketGoogleCalendarLinks)
    .where(eq(ticketGoogleCalendarLinks.userId, userId));
}

export async function findTicketGoogleCalendarLinkByEvent(
  userId: string,
  calendarId: string,
  eventId: string,
) {
  const db = getDatabase();
  const [link] = await db
    .select({
      ticketId: ticketGoogleCalendarLinks.ticketId,
      googleCalendarId: ticketGoogleCalendarLinks.googleCalendarId,
      googleEventId: ticketGoogleCalendarLinks.googleEventId,
      googleUpdatedAt: ticketGoogleCalendarLinks.googleUpdatedAt,
      lastSyncedAt: ticketGoogleCalendarLinks.lastSyncedAt,
      lastSyncError: ticketGoogleCalendarLinks.lastSyncError,
      lastSyncSource: ticketGoogleCalendarLinks.lastSyncSource,
    })
    .from(ticketGoogleCalendarLinks)
    .where(
      and(
        eq(ticketGoogleCalendarLinks.userId, userId),
        eq(ticketGoogleCalendarLinks.googleCalendarId, calendarId),
        eq(ticketGoogleCalendarLinks.googleEventId, eventId),
      ),
    )
    .limit(1);
  return link ?? null;
}

async function markTicketSyncError(userId: string, ticketId: string, cause: unknown): Promise<void> {
  const message = cause instanceof Error ? cause.message.slice(0, 1000) : "GOOGLE_SYNC_FAILED";
  const db = getDatabase();
  await db
    .update(ticketGoogleCalendarLinks)
    .set({ lastSyncError: message, updatedAt: new Date() })
    .where(and(eq(ticketGoogleCalendarLinks.userId, userId), eq(ticketGoogleCalendarLinks.ticketId, ticketId)));
}

export async function syncTicketGoogleCalendarLink(
  userId: string,
  ticketId: string,
): Promise<void> {
  const db = getDatabase();
  const [ticket, link] = await Promise.all([
    getTicketSnapshot(ticketId),
    db
      .select({
        googleCalendarId: ticketGoogleCalendarLinks.googleCalendarId,
        googleEventId: ticketGoogleCalendarLinks.googleEventId,
      })
      .from(ticketGoogleCalendarLinks)
      .where(and(eq(ticketGoogleCalendarLinks.userId, userId), eq(ticketGoogleCalendarLinks.ticketId, ticketId)))
      .limit(1)
      .then((rows) => rows[0] ?? null),
  ]);
  if (!ticket || !link || !ticket.dueOn) return;

  try {
    let event = await updateGoogleCalendarEvent(
      userId,
      link.googleCalendarId,
      link.googleEventId,
      {
        title: ticketEventTitle(ticket),
        description: `Ticket F10 #${ticket.ticketNumber}`,
        date: ticket.dueOn,
        allDay: true,
        startTime: "",
        endTime: "",
        timeZone: "UTC",
      },
    );
    if (!event) {
      event = await createGoogleCalendarEvent(
        userId,
        {
          title: ticketEventTitle(ticket),
          description: `Ticket F10 #${ticket.ticketNumber}`,
          date: ticket.dueOn,
          allDay: true,
          startTime: "",
          endTime: "",
          timeZone: "UTC",
        },
        link.googleCalendarId,
      );
    }
    const now = new Date();
    await db
      .update(ticketGoogleCalendarLinks)
      .set({
        googleEventId: event.id,
        googleIcalUid: event.iCalUID,
        googleHtmlLink: event.htmlLink,
        googleUpdatedAt: event.updatedAt ? new Date(event.updatedAt) : null,
        lastSyncedAt: now,
        lastSyncSource: "f10",
        lastSyncError: null,
        updatedAt: now,
      })
      .where(and(eq(ticketGoogleCalendarLinks.userId, userId), eq(ticketGoogleCalendarLinks.ticketId, ticketId)));
  } catch (cause) {
    await markTicketSyncError(userId, ticketId, cause);
  }
}

export async function ensureTicketGoogleCalendarLink(
  userId: string,
  ticketId: string,
  calendarId: string,
): Promise<void> {
  const ticket = await getTicketSnapshot(ticketId);
  if (!ticket || !ticket.dueOn || ticket.assignedUserId !== userId) return;
  const db = getDatabase();
  const [existing] = await db
    .select({ ticketId: ticketGoogleCalendarLinks.ticketId })
    .from(ticketGoogleCalendarLinks)
    .where(and(eq(ticketGoogleCalendarLinks.userId, userId), eq(ticketGoogleCalendarLinks.ticketId, ticketId)))
    .limit(1);
  if (existing) {
    await syncTicketGoogleCalendarLink(userId, ticketId);
    return;
  }

  try {
    const event = await createGoogleCalendarEvent(
      userId,
      {
        title: ticketEventTitle(ticket),
        description: `Ticket F10 #${ticket.ticketNumber}`,
        date: ticket.dueOn,
        allDay: true,
        startTime: "",
        endTime: "",
        timeZone: "UTC",
      },
      calendarId,
    );
    const now = new Date();
    await db.insert(ticketGoogleCalendarLinks).values({
      ticketId,
      userId,
      googleCalendarId: calendarId,
      googleEventId: event.id,
      googleIcalUid: event.iCalUID,
      googleHtmlLink: event.htmlLink,
      autoManaged: true,
      googleUpdatedAt: event.updatedAt ? new Date(event.updatedAt) : null,
      lastSyncedAt: now,
      lastSyncSource: "f10",
      lastSyncError: null,
      updatedAt: now,
    });
  } catch (cause) {
    const message = cause instanceof Error ? cause.message.slice(0, 1000) : "GOOGLE_SYNC_FAILED";
    await db.insert(ticketGoogleCalendarLinks).values({
      ticketId,
      userId,
      googleCalendarId: calendarId,
      googleEventId: `pending:${ticketId}`,
      autoManaged: true,
      lastSyncError: message,
      updatedAt: new Date(),
    }).onConflictDoNothing();
  }
}

export async function syncAssignedTicketsToGoogle(
  userId: string,
  calendarId: string,
): Promise<void> {
  const db = getDatabase();
  const assigned = await db
    .select({ id: tickets.id })
    .from(tickets)
    .where(and(eq(tickets.assignedUserId, userId), isNotNull(tickets.dueOn)));
  const assignedIds = new Set(assigned.map((ticket) => ticket.id));
  const links = await listUserTicketGoogleCalendarLinks(userId);

  await Promise.allSettled(assigned.map((ticket) => ensureTicketGoogleCalendarLink(userId, ticket.id, calendarId)));

  await Promise.allSettled(
    links
      .filter((link) => link.autoManaged && !assignedIds.has(link.ticketId))
      .map(async (link) => {
        if (!link.googleEventId.startsWith("pending:")) {
          await deleteGoogleCalendarEvent(userId, link.googleCalendarId, link.googleEventId).catch(() => undefined);
        }
        await db
          .delete(ticketGoogleCalendarLinks)
          .where(and(eq(ticketGoogleCalendarLinks.userId, userId), eq(ticketGoogleCalendarLinks.ticketId, link.ticketId)));
      }),
  );
}

export async function applyGoogleEventToTicketDueDate(
  userId: string,
  ticketId: string,
  event: GoogleCalendarEvent,
): Promise<void> {
  const dueOn = event.startDate ?? event.startDateTime?.slice(0, 10) ?? null;
  if (!dueOn) return;
  const db = getDatabase();
  const ticket = await getTicketSnapshot(ticketId);
  if (!ticket || ticket.dueOn === dueOn) {
    await db
      .update(ticketGoogleCalendarLinks)
      .set({
        googleUpdatedAt: event.updatedAt ? new Date(event.updatedAt) : null,
        lastSyncSource: "google",
        lastSyncedAt: new Date(),
        lastSyncError: null,
        updatedAt: new Date(),
      })
      .where(and(eq(ticketGoogleCalendarLinks.userId, userId), eq(ticketGoogleCalendarLinks.ticketId, ticketId)));
    return;
  }

  const now = new Date();
  await db.transaction(async (tx) => {
    await tx
      .update(tickets)
      .set({ dueOn, updatedAt: now })
      .where(eq(tickets.id, ticketId));
    await tx.insert(ticketEvents).values({
      ticketId,
      actorUserId: userId,
      eventType: "ticket.due_date.changed",
      metadata: {
        previousDueOn: ticket.dueOn,
        dueOn,
        source: "google_calendar",
        googleEventId: event.id,
      },
    });
    await tx
      .update(ticketGoogleCalendarLinks)
      .set({
        googleUpdatedAt: event.updatedAt ? new Date(event.updatedAt) : null,
        lastSyncSource: "google",
        lastSyncedAt: now,
        lastSyncError: null,
        updatedAt: now,
      })
      .where(and(eq(ticketGoogleCalendarLinks.userId, userId), eq(ticketGoogleCalendarLinks.ticketId, ticketId)));
  });
}

export async function markTicketGoogleSyncConflict(userId: string, ticketId: string): Promise<void> {
  const db = getDatabase();
  await db
    .update(ticketGoogleCalendarLinks)
    .set({ lastSyncError: "SYNC_CONFLICT", updatedAt: new Date() })
    .where(and(eq(ticketGoogleCalendarLinks.userId, userId), eq(ticketGoogleCalendarLinks.ticketId, ticketId)));
}
