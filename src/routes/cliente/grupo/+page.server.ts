import { fail, redirect, type Actions } from "@sveltejs/kit";
import type { PageServerLoad } from "./$types";
import { selectF10CustomerGroup } from "$lib/server/customerPortal/customerF10AuthRepository";
import {
  getCustomerPortalSessionToken,
  requireCustomerF10PortalSession,
} from "$lib/server/customerPortal/customerPortalSession";

function safeReturnTo(value: string): string {
  if (!value.startsWith("/") || value.startsWith("//")) return "/cliente/chamados";
  if (value.startsWith("/ajuda-f10") || value.startsWith("/cliente")) return value;
  return "/cliente/chamados";
}

function parseId(value: FormDataEntryValue | null): number | null {
  if (typeof value !== "string" || !/^\d+$/.test(value)) return null;
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) ? parsed : null;
}

export const load: PageServerLoad = async ({ cookies, url }) => {
  const returnTo = safeReturnTo(url.searchParams.get("returnTo") ?? "/cliente/chamados");
  const session = await requireCustomerF10PortalSession(cookies, returnTo, false);

  if (session.groups.length <= 1 || session.selectedGroupId !== null) {
    throw redirect(303, returnTo);
  }

  return {
    customer: {
      email: session.email,
      groups: session.groups,
    },
    returnTo,
  };
};

export const actions: Actions = {
  selectGroup: async ({ cookies, request }) => {
    const session = await requireCustomerF10PortalSession(cookies, "/cliente/chamados", false);
    const formData = await request.formData();
    const groupId = parseId(formData.get("groupId"));
    const returnToValue = formData.get("returnTo");
    const returnTo = safeReturnTo(
      typeof returnToValue === "string" ? returnToValue : "/cliente/chamados",
    );

    if (groupId === null) {
      return fail(400, {
        success: false,
        action: "selectGroup",
        message: "Selecione um grupo válido.",
        returnTo,
      });
    }

    const sessionToken = getCustomerPortalSessionToken(cookies);
    try {
      await selectF10CustomerGroup(sessionToken, groupId);
    } catch (cause) {
      const code = cause instanceof Error ? cause.message : "";
      if (code === "F10_CUSTOMER_GROUP_NOT_AUTHORIZED") {
        return fail(403, {
          success: false,
          action: "selectGroup",
          message: "Este grupo não está disponível para sua conta F10.",
          returnTo,
        });
      }
      if (code === "F10_CUSTOMER_TOKEN_REJECTED" || code === "F10_CUSTOMER_SESSION_INVALID") {
        throw redirect(303, `/cliente?returnTo=${encodeURIComponent(returnTo)}`);
      }
      console.error("[customer.f10.group]", {
        causeType: cause instanceof Error ? cause.name : typeof cause,
      });
      return fail(503, {
        success: false,
        action: "selectGroup",
        message: "Não foi possível confirmar seus grupos agora. Tente novamente.",
        returnTo,
      });
    }

    void session;
    throw redirect(303, returnTo);
  },
};
