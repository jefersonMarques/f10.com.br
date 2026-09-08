import { dev } from "$app/environment";
import { fail, redirect, type Actions } from "@sveltejs/kit";
import type { PageServerLoad } from "./$types";
import {
  getCustomerPortalBaseUrl,
  sendCustomerPortalMagicLink,
} from "$lib/server/customerPortal/customerPortalMailer";
import { createCustomerPortalLoginToken } from "$lib/server/customerPortal/customerPortalRepository";
import { createF10CustomerPortalSession } from "$lib/server/customerPortal/customerF10AuthRepository";
import {
  getOptionalCustomerF10PortalSession,
  setCustomerPortalSessionCookie,
} from "$lib/server/customerPortal/customerPortalSession";

function isValidEmail(value: string): boolean {
  return value.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function safeReturnTo(value: string): string {
  if (!value.startsWith("/") || value.startsWith("//")) return "/cliente/chamados";
  if (value.startsWith("/ajuda-f10") || value.startsWith("/cliente")) return value;
  return "/cliente/chamados";
}

function diagnosticCode(cause: unknown): string {
  if (!(cause instanceof Error)) return "PORTAL_ACCESS_FAILED";
  if (cause.message.startsWith("CUSTOMER_PORTAL_EMAIL_")) return "EMAIL_NOT_READY";
  if (cause.message.startsWith("CUSTOMER_PORTAL_BASE_URL_")) return "PORTAL_URL_NOT_READY";
  return "PORTAL_ACCESS_FAILED";
}

function f10LoginDiagnostic(cause: unknown): string {
  if (!(cause instanceof Error)) return "F10_LOGIN_FAILED";
  if (cause.message.includes("F10_CUSTOMER_TOKEN_KEY")) return "F10_TOKEN_KEY_NOT_CONFIGURED";
  if (cause.message === "F10_CUSTOMER_BACKEND_UNAVAILABLE") return "F10_BACKEND_UNAVAILABLE";
  if (cause.message === "F10_CUSTOMER_GROUPS_INVALID") return "F10_GROUPS_INVALID";
  if (cause.message === "F10_CUSTOMER_LOGIN_RESPONSE_INVALID") return "F10_LOGIN_RESPONSE_INVALID";
  return "F10_LOGIN_FAILED";
}

export const load: PageServerLoad = async ({ cookies, url }) => {
  const returnTo = safeReturnTo(url.searchParams.get("returnTo") ?? "/cliente/chamados");
  const session = await getOptionalCustomerF10PortalSession(cookies);
  if (session) {
    if (session.groups.length > 1 && session.selectedGroupId === null) {
      const params = new URLSearchParams({ returnTo });
      throw redirect(303, `/cliente/grupo?${params.toString()}`);
    }
    throw redirect(303, returnTo);
  }
  return { returnTo };
};

export const actions: Actions = {
  f10Login: async ({ request, cookies }) => {
    const formData = await request.formData();
    const emailValue = formData.get("email");
    const passwordValue = formData.get("password");
    const returnToValue = formData.get("returnTo");
    const email = typeof emailValue === "string" ? emailValue.trim().toLowerCase() : "";
    const password = typeof passwordValue === "string" ? passwordValue : "";
    const returnTo = safeReturnTo(typeof returnToValue === "string" ? returnToValue : "/cliente/chamados");

    if (!isValidEmail(email) || password.length < 1 || password.length > 512) {
      return fail(400, {
        success: false,
        action: "f10Login",
        message: "Informe o e-mail e a senha usados para entrar na F10.",
        email,
        returnTo,
      });
    }

    try {
      const session = await createF10CustomerPortalSession(email, password);
      setCustomerPortalSessionCookie(cookies, session.token, session.expiresAt);

      if (session.needsGroupSelection) {
        const params = new URLSearchParams({ returnTo });
        throw redirect(303, `/cliente/grupo?${params.toString()}`);
      }
      throw redirect(303, returnTo);
    } catch (cause) {
      if (cause && typeof cause === "object" && "status" in cause && "location" in cause) throw cause;

      const code = cause instanceof Error ? cause.message : "";
      const invalidCredentials = code === "F10_CUSTOMER_LOGIN_INVALID" || code === "F10_CUSTOMER_TOKEN_EXPIRED";
      const diagnostic = f10LoginDiagnostic(cause);
      if (!invalidCredentials) {
        console.error("[customer.f10.login]", {
          diagnosticCode: diagnostic,
          causeType: cause instanceof Error ? cause.name : typeof cause,
        });
      }

      return fail(invalidCredentials ? 401 : 503, {
        success: false,
        action: "f10Login",
        message: invalidCredentials
          ? "E-mail ou senha inválidos. Use os mesmos dados de acesso da F10."
          : "Não foi possível validar seu acesso F10 agora. Tente novamente em instantes.",
        email,
        returnTo,
        ...(dev && !invalidCredentials ? { diagnosticCode: diagnostic } : {}),
      });
    }
  },

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
