import { fail, redirect, type Actions } from "@sveltejs/kit";
import type { PageServerLoad } from "./$types";
import {
  completePasswordReset,
  getPasswordResetState,
} from "$lib/server/auth/passwordReset";

export const prerender = false;

function isValidToken(value: string): boolean {
  return /^[A-Za-z0-9_-]{40,120}$/.test(value);
}

function readRawString(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === "string" ? value : "";
}

function isStrongEnoughPassword(value: string): boolean {
  return value.length >= 12 && value.length <= 200 && /[A-Za-z]/.test(value) && /\d/.test(value);
}

export const load: PageServerLoad = async ({ params }) => {
  const token = params.token ?? "";
  if (!isValidToken(token)) return { valid: false, expiresAt: null };

  const state = await getPasswordResetState(token);
  return {
    valid: Boolean(state),
    expiresAt: state?.expiresAt ?? null,
  };
};

export const actions: Actions = {
  default: async ({ params, request }) => {
    const token = params.token ?? "";
    if (!isValidToken(token)) {
      return fail(410, {
        message: "Este link de redefinição é inválido ou já expirou.",
      });
    }

    const formData = await request.formData();
    const newPassword = readRawString(formData, "newPassword");
    const confirmPassword = readRawString(formData, "confirmPassword");

    if (!isStrongEnoughPassword(newPassword)) {
      return fail(400, {
        message: "A nova senha deve ter pelo menos 12 caracteres, com letras e números.",
      });
    }
    if (newPassword !== confirmPassword) {
      return fail(400, { message: "A confirmação da nova senha não confere." });
    }

    try {
      const completed = await completePasswordReset(token, newPassword);
      if (!completed) {
        return fail(410, {
          message: "Este link de redefinição é inválido, expirou ou já foi utilizado.",
        });
      }
    } catch (cause) {
      console.error("[auth.password-reset.complete]", {
        causeType: cause instanceof Error ? cause.name : typeof cause,
      });
      return fail(503, {
        message: "Não foi possível redefinir a senha agora. Tente novamente em alguns minutos.",
      });
    }

    throw redirect(303, "/login?reset=1");
  },
};
