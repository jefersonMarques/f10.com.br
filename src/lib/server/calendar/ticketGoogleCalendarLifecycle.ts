import { and, eq } from "drizzle-orm";
import { deleteGoogleCalendarEvent } from "$lib/server/calendar/googleCalendarRepository";
import {
  listUserTicketGoogleCalendarLinks,
  syncTicketGoogleCalendarLink,
} from "$lib/server/calendar/ticketGoogleCalendarRepository";
import { getDatabase } from "$lib/server/db";
import { ticketGoogleCalendarLinks } from "$lib/server/db/googleCalendarSchema";

export async function clearAutoManagedTicketGoogleCalendarLinks(userId: string): Promise<void> {
  const db = getDatabase();
  const links = await listUserTicketGoogleCalendarLinks(userId);

  await Promise.allSettled(
    links
      .filter((link) => link.autoManaged)
      .map(async (link) => {
        if (!link.googleEventId.startsWith("pending:")) {
          await deleteGoogleCalendarEvent(
            userId,
            link.googleCalendarId,
            link.googleEventId,
          ).catch(() => undefined);
        }

        await db
          .delete(ticketGoogleCalendarLinks)
          .where(
            and(
              eq(ticketGoogleCalendarLinks.userId, userId),
              eq(ticketGoogleCalendarLinks.ticketId, link.ticketId),
            ),
          );
      }),
  );
}

export async function syncAllTicketGoogleCalendarLinks(ticketId: string): Promise<void> {
  const db = getDatabase();
  const links = await db
    .select({ userId: ticketGoogleCalendarLinks.userId })
    .from(ticketGoogleCalendarLinks)
    .where(eq(ticketGoogleCalendarLinks.ticketId, ticketId));

  await Promise.allSettled(
    links.map((link) => syncTicketGoogleCalendarLink(link.userId, ticketId)),
  );
}
