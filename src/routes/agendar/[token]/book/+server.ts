import { json } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";
import { requireCustomerF10PortalSession } from "$lib/server/customerPortal/customerPortalSession";
import {
  bookPersonalSchedulingSlot,
  getPublicPersonalSchedule,
} from "$lib/server/calendar/personalSchedulingService";
import { enforceSchedulingRateLimit } from "$lib/server/calendar/schedulingRepository";

const BOOK_WINDOW_MS = 10 * 60 * 1000;

function messageFor(errorValue: unknown): { status: number; message: string } {
  const code = errorValue instanceof Error ? errorValue.message : "";
  if (code === "SCHEDULING_RATE_LIMIT") {
    return { status: 429, message: "Muitas tentativas. Tente novamente em alguns minutos." };
  }
  if (code === "SCHEDULING_SLOT_UNAVAILABLE") {
    return { status: 409, message: "Este horário não está mais disponível." };
  }
  if (code === "SCHEDULING_NOTES_TOO_LONG") {
    return { status: 400, message: "A observação é muito longa." };
  }
  if (code === "SCHEDULING_GOOGLE_CREATE_FAILED") {
    return { status: 503, message: "Não foi possível confirmar o evento agora." };
  }
  return { status: 404, message: "Esta agenda não está disponível." };
}

export const POST: RequestHandler = async ({ params, request, cookies, url, setHeaders }) => {
  setHeaders({
    "Cache-Control": "private, no-store, max-age=0",
    Pragma: "no-cache",
  });

  const schedule = await getPublicPersonalSchedule(params.token);
  if (!schedule) return json({ success: false, message: "Esta agenda não está disponível." }, { status: 404 });

  const session = await requireCustomerF10PortalSession(cookies, url.pathname.replace(/\/book$/, ""), false);
  await enforceSchedulingRateLimit(
    `personal-book:${params.token}:${session.contactId}`,
    12,
    BOOK_WINDOW_MS,
  );

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return json({ success: false, message: "Dados inválidos." }, { status: 400 });
  }

  const selectedStartAt =
    typeof body === "object" &&
    body !== null &&
    "startAt" in body &&
    typeof body.startAt === "string"
      ? body.startAt
      : "";
  const notes =
    typeof body === "object" &&
    body !== null &&
    "notes" in body &&
    typeof body.notes === "string"
      ? body.notes
      : "";

  if (!selectedStartAt || selectedStartAt.length > 64) {
    return json({ success: false, message: "Horário inválido." }, { status: 400 });
  }

  try {
    const booking = await bookPersonalSchedulingSlot(
      params.token,
      {
        contactId: session.contactId,
        name: session.name,
        email: session.email,
        selectedGroupId: session.selectedGroupId,
        selectedGroupName: session.selectedGroupName,
        selectedUnitId: session.selectedUnitId,
        selectedUnitName: session.selectedUnitName,
      },
      selectedStartAt,
      notes,
    );
    return json({ success: true, booking });
  } catch (errorValue) {
    const result = messageFor(errorValue);
    return json({ success: false, message: result.message }, { status: result.status });
  }
};
