import { error } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";
import { buildPersonalSchedulingIcs } from "$lib/server/calendar/personalSchedulingConfirmation";
import { getPersonalSchedulingBookingForCustomer } from "$lib/server/calendar/personalSchedulingRepository";
import { requireCustomerF10PortalSession } from "$lib/server/customerPortal/customerPortalSession";

export const GET: RequestHandler = async ({ params, cookies, url, setHeaders }) => {
  const session = await requireCustomerF10PortalSession(
    cookies,
    url.pathname,
    false,
  );
  const booking = await getPersonalSchedulingBookingForCustomer(
    params.token,
    params.bookingId,
    session.contactId,
  );
  if (!booking) throw error(404, "Agendamento não encontrado.");

  const calendar = buildPersonalSchedulingIcs({
    id: booking.id,
    title: booking.title,
    hostName: booking.hostName,
    customerName: booking.customerName,
    customerEmail: booking.customerEmail,
    startAt: booking.startAt,
    endAt: booking.endAt,
    timeZone: booking.timeZone,
    googleIcalUid: booking.googleIcalUid,
    googleMeetUrl: booking.googleMeetUrl,
  });

  setHeaders({
    "Cache-Control": "private, no-store, max-age=0",
    "Content-Disposition": 'attachment; filename="agendamento-f10.ics"',
  });

  return new Response(calendar, {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
    },
  });
};
