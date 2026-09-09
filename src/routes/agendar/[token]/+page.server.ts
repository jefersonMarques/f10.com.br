import { error, fail, type Actions } from "@sveltejs/kit";
import type { PageServerLoad } from "./$types";
import { requireCustomerF10PortalSession } from "$lib/server/customerPortal/customerPortalSession";
import {
  bookSchedulingSlot,
  getPublicSchedulingInvitation,
  listSchedulingSlots,
} from "$lib/server/calendar/schedulingService";
import {
  getPublicPersonalSchedule,
  listPersonalSchedulingSlots,
} from "$lib/server/calendar/personalSchedulingService";
import { enforceSchedulingRateLimit } from "$lib/server/calendar/schedulingRepository";

const VIEW_WINDOW_MS = 5 * 60 * 1000;
const BOOK_WINDOW_MS = 10 * 60 * 1000;

function clientAddress(getClientAddress: () => string): string {
  try {
    return getClientAddress() || "unknown";
  } catch {
    return "unknown";
  }
}

function noStore(setHeaders: (headers: Record<string, string>) => void): void {
  setHeaders({
    "Cache-Control": "private, no-store, max-age=0",
    Pragma: "no-cache",
    "Referrer-Policy": "no-referrer",
    "X-Robots-Tag": "noindex, nofollow, noarchive",
  });
}

function publicSchedulingMessage(errorValue: unknown): { status: number; message: string } {
  const code = errorValue instanceof Error ? errorValue.message : "";
  if (code === "SCHEDULING_RATE_LIMIT") {
    return { status: 429, message: "Muitas tentativas em sequência. Tente novamente em alguns minutos." };
  }
  if (code === "SCHEDULING_SLOT_UNAVAILABLE") {
    return { status: 409, message: "Este horário acabou de ficar indisponível. Escolha outro horário." };
  }
  if (code === "SCHEDULING_GOOGLE_AVAILABILITY_UNAVAILABLE") {
    return { status: 503, message: "A agenda do responsável não pôde ser consultada agora." };
  }
  if (code === "SCHEDULING_GOOGLE_CREATE_FAILED") {
    return { status: 503, message: "Não foi possível confirmar o evento agora." };
  }
  return { status: 404, message: "Este link de agendamento não está mais disponível." };
}

export const prerender = false;

export const load: PageServerLoad = async ({
  params,
  cookies,
  url,
  getClientAddress,
  setHeaders,
}) => {
  noStore(setHeaders);
  const address = clientAddress(getClientAddress);
  try {
    await enforceSchedulingRateLimit(`view:${params.token}:${address}`, 60, VIEW_WINDOW_MS);
  } catch (errorValue) {
    const result = publicSchedulingMessage(errorValue);
    throw error(result.status, result.message);
  }

  const personalSchedule = await getPublicPersonalSchedule(params.token);
  if (personalSchedule) {
    const session = await requireCustomerF10PortalSession(
      cookies,
      `${url.pathname}${url.search}`,
      false,
    );
    try {
      const slots = await listPersonalSchedulingSlots(personalSchedule);
      return {
        mode: "personal" as const,
        schedule: {
          title: personalSchedule.publicTitle,
          description: personalSchedule.publicDescription,
          hostName: personalSchedule.hostName,
          durationMinutes: personalSchedule.durationMinutes,
          timeZone: personalSchedule.timeZone,
          addGoogleMeet: personalSchedule.addGoogleMeet,
        },
        customer: {
          name: session.name,
          email: session.email,
        },
        slots,
        availabilityUnavailable: false,
      };
    } catch (errorValue) {
      if (
        errorValue instanceof Error &&
        ["SCHEDULING_GOOGLE_AVAILABILITY_UNAVAILABLE", "SCHEDULING_HOST_GOOGLE_REQUIRED"].includes(
          errorValue.message,
        )
      ) {
        return {
          mode: "personal" as const,
          schedule: {
            title: personalSchedule.publicTitle,
            description: personalSchedule.publicDescription,
            hostName: personalSchedule.hostName,
            durationMinutes: personalSchedule.durationMinutes,
            timeZone: personalSchedule.timeZone,
            addGoogleMeet: personalSchedule.addGoogleMeet,
          },
          customer: {
            name: session.name,
            email: session.email,
          },
          slots: [],
          availabilityUnavailable: true,
        };
      }
      throw error(404, "Esta agenda não está disponível.");
    }
  }

  const resolved = await getPublicSchedulingInvitation(params.token);
  if (!resolved) throw error(404, "Este link de agendamento não está mais disponível.");

  if (resolved.invitation.status === "booked" || resolved.invitation.status === "booking") {
    return {
      mode: "legacy" as const,
      invitation: resolved.invitation,
      slots: [],
      availabilityUnavailable: false,
    };
  }

  try {
    const slots = await listSchedulingSlots(resolved.row);
    return {
      mode: "legacy" as const,
      invitation: resolved.invitation,
      slots,
      availabilityUnavailable: false,
    };
  } catch (errorValue) {
    if (
      errorValue instanceof Error &&
      errorValue.message === "SCHEDULING_GOOGLE_AVAILABILITY_UNAVAILABLE"
    ) {
      return {
        mode: "legacy" as const,
        invitation: resolved.invitation,
        slots: [],
        availabilityUnavailable: true,
      };
    }
    throw error(404, "Este link de agendamento não está mais disponível.");
  }
};

export const actions: Actions = {
  book: async ({ params, request, getClientAddress, setHeaders }) => {
    noStore(setHeaders);
    if (await getPublicPersonalSchedule(params.token)) {
      return fail(400, { success: false, message: "Use a confirmação da agenda atual." });
    }

    const address = clientAddress(getClientAddress);
    try {
      await enforceSchedulingRateLimit(`book:${params.token}:${address}`, 12, BOOK_WINDOW_MS);
    } catch (errorValue) {
      const result = publicSchedulingMessage(errorValue);
      return fail(result.status, { success: false, message: result.message });
    }

    const formData = await request.formData();
    const selectedStartAt = formData.get("startAt");
    if (typeof selectedStartAt !== "string" || selectedStartAt.length > 64) {
      return fail(400, { success: false, message: "Horário inválido." });
    }

    try {
      await bookSchedulingSlot(params.token, selectedStartAt);
      return { success: true, message: "Agendamento confirmado." };
    } catch (errorValue) {
      const result = publicSchedulingMessage(errorValue);
      return fail(result.status, { success: false, message: result.message });
    }
  },
};
