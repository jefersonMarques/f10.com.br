import { error, fail, type Actions } from "@sveltejs/kit";
import type { PageServerLoad } from "./$types";
import { enforceSchedulingRateLimit } from "$lib/server/calendar/schedulingRepository";
import {
  bookSchedulingSlot,
  getPublicSchedulingInvitation,
  listSchedulingSlots,
} from "$lib/server/calendar/schedulingService";

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
    return { status: 503, message: "A agenda do responsável não pôde ser consultada agora. Tente novamente em instantes." };
  }
  if (code === "SCHEDULING_GOOGLE_CREATE_FAILED") {
    return { status: 503, message: "Não foi possível confirmar o evento agora. O horário não foi reservado; tente novamente." };
  }
  return { status: 404, message: "Este link de agendamento não está mais disponível." };
}

export const prerender = false;

export const load: PageServerLoad = async ({ params, getClientAddress, setHeaders }) => {
  noStore(setHeaders);
  const address = clientAddress(getClientAddress);
  try {
    await enforceSchedulingRateLimit(`view:${params.token}:${address}`, 60, VIEW_WINDOW_MS);
  } catch (errorValue) {
    const result = publicSchedulingMessage(errorValue);
    throw error(result.status, result.message);
  }

  const resolved = await getPublicSchedulingInvitation(params.token);
  if (!resolved) throw error(404, "Este link de agendamento não está mais disponível.");

  if (resolved.invitation.status === "booked" || resolved.invitation.status === "booking") {
    return {
      invitation: resolved.invitation,
      slots: [],
      availabilityUnavailable: false,
    };
  }

  try {
    const slots = await listSchedulingSlots(resolved.row);
    return {
      invitation: resolved.invitation,
      slots,
      availabilityUnavailable: false,
    };
  } catch (errorValue) {
    if (errorValue instanceof Error && errorValue.message === "SCHEDULING_GOOGLE_AVAILABILITY_UNAVAILABLE") {
      return {
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
