import { and, eq } from "drizzle-orm";
import { getDatabase } from "$lib/server/db";
import { schedulingInvitations } from "$lib/server/db/schedulingSchema";

export async function completeSchedulingGoogleReservation(
  invitationId: string,
  calendarId: string,
  google: {
    eventId: string;
    iCalUid: string | null;
    meetUrl: string | null;
  },
): Promise<void> {
  const db = getDatabase();
  const now = new Date();
  const [updated] = await db
    .update(schedulingInvitations)
    .set({
      status: "booked",
      bookedAt: now,
      googleCalendarId: calendarId,
      googleEventId: google.eventId,
      googleIcalUid: google.iCalUid,
      googleMeetUrl: google.meetUrl,
      updatedAt: now,
    })
    .where(
      and(
        eq(schedulingInvitations.id, invitationId),
        eq(schedulingInvitations.status, "booking"),
      ),
    )
    .returning({ id: schedulingInvitations.id });

  if (!updated) throw new Error("SCHEDULING_BOOKING_STATE_CHANGED");
}
