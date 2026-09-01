import { and, eq } from "drizzle-orm";
import { getDatabase } from "$lib/server/db";
import {
  schedulingEventGoogleCalendarLinks,
  schedulingInvitations,
} from "$lib/server/db/schedulingSchema";

export async function cancelSchedulingInvitationForEvent(eventId: string): Promise<void> {
  const db = getDatabase();
  await db
    .update(schedulingInvitations)
    .set({ status: "cancelled", updatedAt: new Date() })
    .where(and(eq(schedulingInvitations.eventId, eventId), eq(schedulingInvitations.status, "booked")));
}

export async function getSchedulingEventGoogleLink(eventId: string, userId: string) {
  const db = getDatabase();
  const [link] = await db
    .select()
    .from(schedulingEventGoogleCalendarLinks)
    .where(
      and(
        eq(schedulingEventGoogleCalendarLinks.eventId, eventId),
        eq(schedulingEventGoogleCalendarLinks.userId, userId),
      ),
    )
    .limit(1);
  return link ?? null;
}

export async function clearSchedulingEventGoogleProjection(
  eventId: string,
  userId: string,
): Promise<void> {
  const db = getDatabase();
  const now = new Date();
  await db.transaction(async (tx) => {
    await tx
      .update(schedulingEventGoogleCalendarLinks)
      .set({
        googleEventId: null,
        googleIcalUid: null,
        googleHtmlLink: null,
        googleMeetUrl: null,
        lastSyncedAt: now,
        lastSyncError: null,
        updatedAt: now,
      })
      .where(
        and(
          eq(schedulingEventGoogleCalendarLinks.eventId, eventId),
          eq(schedulingEventGoogleCalendarLinks.userId, userId),
        ),
      );

    await tx
      .update(schedulingInvitations)
      .set({
        googleEventId: null,
        googleIcalUid: null,
        googleMeetUrl: null,
        updatedAt: now,
      })
      .where(eq(schedulingInvitations.eventId, eventId));
  });
}

export async function markSchedulingEventGoogleSyncError(
  eventId: string,
  userId: string,
  errorMessage: string,
): Promise<void> {
  const db = getDatabase();
  await db
    .update(schedulingEventGoogleCalendarLinks)
    .set({
      lastSyncError: errorMessage.slice(0, 1000),
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(schedulingEventGoogleCalendarLinks.eventId, eventId),
        eq(schedulingEventGoogleCalendarLinks.userId, userId),
      ),
    );
}
