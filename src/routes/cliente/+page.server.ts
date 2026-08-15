import { dev } from "$app/environment";
import { fail, redirect, type Actions } from "@sveltejs/kit";
import type { PageServerLoad } from "./$types";
import {
  getCustomerPortalBaseUrl,
  sendCustomerPortalMagicLink,
} from "$lib/server/customerPortal/customerPortalMailer";
import { createCustomerPortalLoginToken } from "$lib/server/customerPortal/customerPortalRepository";
import { getOptionalCustomerPortalSession } from "$lib/server/customerPortal/customerPortalSession";

function isValidEmail(value: string): boolean {
  return value.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function diagnosticCode(cause: unknown): string {
  if (!(cause instanceof Error)) return "PORTAL_ACCESS_FAILED";
  if (cause.message.startsWith("CUSTOMER_PORTAL_EMAIL_")) return "EMAIL_NOT_READY";
  if (cause.message.startsWith("CUSTOMER_PORTAL_BASE_URL_")) return "PORTAL_URL_NOT_READY";
  return "PORTAL_ACCESS_FAILED";
}

export const load: PageServerLoad = async ({ cookies }) => {
  const session = await getOptionalCustomerPortalSession(cookies);
  if (session) throw redirect(303, "/cliente/chamados");
  return {};
};

export const actions: Actions = {
  requestAccess: async ({ request, url }) => {
    const formData = await request.formData();
    const emailValue = formData.get("email");
    const email = typeof emailValue === "string" ? emailValue.trim().toLowerCase() : "";

    if (!isValidEmail(email)) {
      return fail(400, {
        success: false,
        action: "requestAccess",
        message: "Informe um e-mail válido.",
        email,
      });
    }

    try {
      const access = await createCustomerPortalLoginToken(email);
      if (access) {
        const baseUrl = getCustomerPortalBaseUrl(url.origin);
        const magicUrl = new URL("/cliente/acesso", baseUrl);
        magicUrl.searchParams.set("token", access.token);
        await sendCustomerPortalMagicLink({
          email: access.contact.email,
          name: access.contact.name,
          magicUrl: magicUrl.toString(),
          expiresAt: access.expiresAt,
        });
      }

      return {
        success: true,
        action: "requestAccess",
        message: "Se este e-mail estiver cadastrado na F10, enviaremos um link de acesso válido por 15 minutos.",
      };
    } catch (cause) {
      const diagnostic = diagnosticCode(cause);
      console.error("[customer.portal.access]", {
        diagnosticCode: diagnostic,
        causeType: cause instanceof Error ? cause.name : typeof cause,
      });

      return {
        success: true,
        action: "requestAccess",
        message: "Se este e-mail estiver cadastrado na F10, enviaremos um link de acesso válido por 15 minutos.",
        ...(dev ? { diagnosticCode: diagnostic } : {}),
      };
    }
  },
};
