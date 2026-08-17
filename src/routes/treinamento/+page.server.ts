import { fail, redirect, type Actions } from "@sveltejs/kit";
import type { PageServerLoad } from "./$types";
import {
  completeHelpTrainingStep,
  getHelpTrainingSession,
  reportHelpTrainingFailure,
  requestHelpForTrainingStep,
  startHelpTrainingSession,
} from "$lib/server/help/helpTrainingRepository";
import {
  clearHelpTrainingSessionCookie,
  getHelpTrainingSessionCookie,
} from "$lib/server/help/helpTrainingSession";

function read(formData: FormData, name: string): string {
  const value = formData.get(name);
  return typeof value === "string" ? value.trim() : "";
}

async function requireTrainingToken(cookies: Parameters<PageServerLoad>[0]["cookies"]): Promise<string> {
  const token = getHelpTrainingSessionCookie(cookies);
  if (!token) throw redirect(303, "/treinamento?convite=invalido");
  const state = await getHelpTrainingSession(token);
  if (!state) {
    clearHelpTrainingSessionCookie(cookies);
    throw redirect(303, "/treinamento?convite=expirado");
  }
  return token;
}

export const load: PageServerLoad = async ({ cookies, url }) => {
  const token = getHelpTrainingSessionCookie(cookies);
  const state = token ? await getHelpTrainingSession(token) : null;
  if (token && !state) clearHelpTrainingSessionCookie(cookies);

  return {
    state,
    inviteState: url.searchParams.get("convite"),
    justCompletedStep: url.searchParams.get("feito") === "1",
    helpRequested: url.searchParams.get("ajuda") === "1",
  };
};

export const actions: Actions = {
  start: async ({ cookies }) => {
    const token = await requireTrainingToken(cookies);
    await startHelpTrainingSession(token);
    throw redirect(303, "/treinamento");
  },

  success: async ({ cookies }) => {
    const token = await requireTrainingToken(cookies);
    try {
      const result = await completeHelpTrainingStep(token);
      throw redirect(303, result.completed ? "/treinamento?feito=1" : "/treinamento?feito=1");
    } catch (cause) {
      if (cause && typeof cause === "object" && "status" in cause && cause.status === 303) throw cause;
      return fail(409, { success: false, message: "Não foi possível registrar essa ação. Tente novamente." });
    }
  },

  failure: async ({ cookies, request }) => {
    const token = await requireTrainingToken(cookies);
    const formData = await request.formData();
    const reasonKey = read(formData, "reasonKey");
    const detail = read(formData, "detail");
    if (!reasonKey) return fail(400, { success: false, message: "Escolha o que impediu você de concluir." });
    try {
      await reportHelpTrainingFailure(token, { reasonKey, detail });
      throw redirect(303, "/treinamento?nao-consegui=1");
    } catch (cause) {
      if (cause && typeof cause === "object" && "status" in cause && cause.status === 303) throw cause;
      return fail(409, { success: false, message: "Não foi possível registrar a dificuldade. Tente novamente." });
    }
  },

  help: async ({ cookies, request }) => {
    const token = await requireTrainingToken(cookies);
    const formData = await request.formData();
    try {
      await requestHelpForTrainingStep(token, read(formData, "detail"));
      throw redirect(303, "/treinamento?ajuda=1");
    } catch (cause) {
      if (cause && typeof cause === "object" && "status" in cause && cause.status === 303) throw cause;
      return fail(409, { success: false, message: "Não foi possível chamar a equipe agora. Tente novamente em instantes." });
    }
  },

  logout: async ({ cookies }) => {
    clearHelpTrainingSessionCookie(cookies);
    throw redirect(303, "/treinamento");
  },
};
