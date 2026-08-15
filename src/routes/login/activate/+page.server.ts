import { fail, redirect, type Actions } from "@sveltejs/kit";
import type { PageServerLoad } from "./$types";
import { activateInvitedUser } from "$lib/server/users/userManagementRepository";

function isValidToken(token: string): boolean {
  return /^[A-Za-z0-9_-]{40,120}$/.test(token);
}

export const load: PageServerLoad = async ({ url }) => {
  const token = url.searchParams.get("token") ?? "";

  return {
    token: isValidToken(token) ? token : "",
  };
};

export const actions: Actions = {
  default: async ({ request }) => {
    const formData = await request.formData();
    const token = String(formData.get("token") ?? "").trim();
    const password = String(formData.get("password") ?? "");
    const confirmation = String(formData.get("confirmation") ?? "");

    if (!isValidToken(token)) {
      return fail(400, {
        token: "",
        message: "Este convite é inválido ou está incompleto.",
      });
    }

    if (password.length < 14 || password.length > 1024) {
      return fail(400, {
        token,
        message: "A senha deve ter pelo menos 14 caracteres.",
      });
    }

    if (password !== confirmation) {
      return fail(400, {
        token,
        message: "A confirmação da senha não corresponde.",
      });
    }

    try {
      await activateInvitedUser(token, password);
    } catch {
      return fail(400, {
        token: "",
        message:
          "Este convite já foi utilizado ou expirou. Solicite um novo convite ao administrador.",
      });
    }

    throw redirect(303, "/login?activated=1");
  },
};
