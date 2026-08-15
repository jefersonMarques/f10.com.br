import { fail, redirect } from "@sveltejs/kit";
import type { Actions, PageServerLoad } from "./$types";
import { authenticateUser } from "$lib/server/auth/authentication";
import {
  createSession,
  getSessionCookieOptions,
  getSessionUser,
  SESSION_COOKIE_NAME,
} from "$lib/server/auth/session";

function sanitizeReturnTo(value: string | null): string {
  if (!value || value.startsWith("//")) return "/app";
  if (
    value === "/app" ||
    value.startsWith("/app/") ||
    value.startsWith("/app?")
  ) {
    return value;
  }
  return "/app";
}

export const load: PageServerLoad = async ({ cookies, url }) => {
  const token = cookies.get(SESSION_COOKIE_NAME);

  if (token && (await getSessionUser(token))) {
    throw redirect(303, sanitizeReturnTo(url.searchParams.get("returnTo")));
  }

  if (token) cookies.delete(SESSION_COOKIE_NAME, { path: "/" });

  return {
    returnTo: sanitizeReturnTo(url.searchParams.get("returnTo")),
    activated: url.searchParams.get("activated") === "1",
  };
};

export const actions: Actions = {
  default: async ({ request, cookies, getClientAddress }) => {
    const formData = await request.formData();
    const email = String(formData.get("email") ?? "").trim();
    const password = String(formData.get("password") ?? "");
    const returnTo = sanitizeReturnTo(
      String(formData.get("returnTo") ?? "/app"),
    );

    if (
      !email ||
      email.length > 254 ||
      password.length < 1 ||
      password.length > 1024
    ) {
      return fail(400, {
        email,
        returnTo,
        message: "Informe um e-mail e uma senha válidos.",
      });
    }

    let clientAddress = "unknown";

    try {
      clientAddress = getClientAddress();
    } catch {
      clientAddress = "unknown";
    }

    const authentication = await authenticateUser(
      email,
      password,
      clientAddress,
    );

    if (authentication.ok === false) {
      return fail(authentication.reason === "throttled" ? 429 : 400, {
        email,
        returnTo,
        message:
          authentication.reason === "throttled"
            ? "Muitas tentativas de acesso. Aguarde alguns minutos e tente novamente."
            : "E-mail ou senha inválidos.",
      });
    }

    const sessionToken = await createSession(
      authentication.user.id,
      request.headers.get("user-agent"),
    );

    cookies.set(
      SESSION_COOKIE_NAME,
      sessionToken,
      getSessionCookieOptions(),
    );
    throw redirect(303, returnTo);
  },
};
