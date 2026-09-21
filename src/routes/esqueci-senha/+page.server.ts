import { fail, type Actions } from "@sveltejs/kit";
import { requestPasswordReset } from "$lib/server/auth/passwordReset";

export const prerender = false;

function isValidEmail(value: string): boolean {
  return value.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

export const actions: Actions = {
  default: async ({ request, getClientAddress, url }) => {
    const formData = await request.formData();
    const email = String(formData.get("email") ?? "").trim().toLowerCase();

    if (!isValidEmail(email)) {
      return fail(400, {
        email,
        message: "Informe um e-mail válido.",
      });
    }

    let clientAddress = "unknown";
    try {
      clientAddress = getClientAddress();
    } catch {
      clientAddress = "unknown";
    }

    try {
      await requestPasswordReset(email, clientAddress, url.origin);
    } catch (cause) {
      console.error("[auth.password-reset.request]", {
        causeType: cause instanceof Error ? cause.name : typeof cause,
      });
      return fail(503, {
        email,
        message: "Não foi possível processar a solicitação agora. Tente novamente em alguns minutos.",
      });
    }

    return {
      sent: true,
      message: "Se existir uma conta ativa com este e-mail, enviaremos um link de redefinição válido por 30 minutos.",
    };
  },
};
