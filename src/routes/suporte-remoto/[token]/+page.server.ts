import { error, fail, redirect, type Actions } from "@sveltejs/kit";
import type { PageServerLoad } from "./$types";
import {
  decideRemoteConsent,
  getRemoteConsentByToken,
} from "$lib/server/remote/remoteSupportRepository";

export const prerender = false;

function validToken(value: string): boolean {
  return /^[A-Za-z0-9_-]{40,120}$/.test(value);
}

export const load: PageServerLoad = async ({ params }) => {
  if (!validToken(params.token)) throw error(404, "Solicitação não encontrada.");
  const consent = await getRemoteConsentByToken(params.token);
  if (!consent) throw error(404, "Solicitação não encontrada.");
  return { consent };
};

export const actions: Actions = {
  authorize: async ({ params }) => {
    if (!validToken(params.token)) return fail(404, { success: false, message: "Solicitação inválida." });
    try {
      await decideRemoteConsent(params.token, "authorize");
      throw redirect(303, `/suporte-remoto/${params.token}?done=authorized`);
    } catch (cause) {
      if (cause && typeof cause === "object" && "status" in cause && cause.status === 303) throw cause;
      return fail(409, { success: false, message: "Esta solicitação expirou ou já foi respondida." });
    }
  },
  deny: async ({ params }) => {
    if (!validToken(params.token)) return fail(404, { success: false, message: "Solicitação inválida." });
    try {
      await decideRemoteConsent(params.token, "deny");
      throw redirect(303, `/suporte-remoto/${params.token}?done=denied`);
    } catch (cause) {
      if (cause && typeof cause === "object" && "status" in cause && cause.status === 303) throw cause;
      return fail(409, { success: false, message: "Esta solicitação expirou ou já foi respondida." });
    }
  },
};
