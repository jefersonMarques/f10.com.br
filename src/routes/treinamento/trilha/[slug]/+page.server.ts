import { error, fail, redirect, type Actions, type Cookies } from "@sveltejs/kit";
import type { PageServerLoad } from "./$types";
import {
  completePublicHelpTrainingStep,
  getPublicHelpTrainingLanding,
  getPublicHelpTrainingSession,
  markPublicHelpTrainingStepViewed,
  reportPublicHelpTrainingFailure,
  startPublicHelpTrainingSession,
  toPublicHelpTrainingClientState,
} from "$lib/server/help/helpTrainingPublicRepository";
import {
  clearHelpTrainingPublicSessionCookie,
  getHelpTrainingPublicSessionCookie,
  setHelpTrainingPublicSessionCookie,
} from "$lib/server/help/helpTrainingSession";

function read(formData: FormData, name: string): string {
  const value = formData.get(name);
  return typeof value === "string" ? value.trim() : "";
}

function publicPath(slug: string): string {
  return `/treinamento/trilha/${encodeURIComponent(slug)}`;
}

async function requirePublicSession(cookies: Cookies, slug: string) {
  const token = getHelpTrainingPublicSessionCookie(cookies);
  if (!token) throw redirect(303, publicPath(slug));
  const state = await getPublicHelpTrainingSession(token);
  if (!state || state.snapshot.slug !== slug) {
    clearHelpTrainingPublicSessionCookie(cookies);
    throw redirect(303, publicPath(slug));
  }
  return { token, state };
}

export const load: PageServerLoad = async ({ params, cookies, url }) => {
  const slug = params.slug?.trim() ?? "";
  const landing = await getPublicHelpTrainingLanding(slug);
  if (!landing) throw error(404, "Trilha não encontrada.");

  const token = getHelpTrainingPublicSessionCookie(cookies);
  let state = token ? await getPublicHelpTrainingSession(token) : null;
  if (state && state.snapshot.slug !== slug) state = null;
  if (token && !state) clearHelpTrainingPublicSessionCookie(cookies);
  if (state?.currentStep) {
    await markPublicHelpTrainingStepViewed(state.session.id, state.currentStep.id);
  }

  return {
    landing,
    state: state ? toPublicHelpTrainingClientState(state) : null,
    successMessage: (url.searchParams.get("feito") ?? "").slice(0, 500),
    failureReported: url.searchParams.get("nao-consegui") === "1",
  };
};

export const actions: Actions = {
  start: async ({ params, cookies }) => {
    const slug = params.slug?.trim() ?? "";
    try {
      const session = await startPublicHelpTrainingSession(slug);
      setHelpTrainingPublicSessionCookie(cookies, session.sessionToken, session.expiresAt);
    } catch {
      return fail(404, { success: false, message: "Esta trilha não está disponível agora." });
    }
    throw redirect(303, publicPath(slug));
  },

  success: async ({ params, cookies }) => {
    const slug = params.slug?.trim() ?? "";
    const { token } = await requirePublicSession(cookies, slug);
    try {
      const result = await completePublicHelpTrainingStep(token);
      const message = encodeURIComponent(result.successMessage || "Feito. Vamos continuar.");
      throw redirect(303, `${publicPath(slug)}?feito=${message}`);
    } catch (cause) {
      if (cause && typeof cause === "object" && "status" in cause && cause.status === 303) throw cause;
      return fail(409, { success: false, message: "Não foi possível registrar esta ação. Tente novamente." });
    }
  },

  failure: async ({ params, cookies, request }) => {
    const slug = params.slug?.trim() ?? "";
    const { token } = await requirePublicSession(cookies, slug);
    const formData = await request.formData();
    const reasonKey = read(formData, "reasonKey");
    const detail = read(formData, "detail");
    if (!reasonKey) return fail(400, { success: false, message: "Escolha o que impediu você de concluir." });
    try {
      await reportPublicHelpTrainingFailure(token, { reasonKey, detail });
      throw redirect(303, `${publicPath(slug)}?nao-consegui=1`);
    } catch (cause) {
      if (cause && typeof cause === "object" && "status" in cause && cause.status === 303) throw cause;
      return fail(409, { success: false, message: "Não foi possível registrar a dificuldade. Tente novamente." });
    }
  },

  restart: async ({ params, cookies }) => {
    clearHelpTrainingPublicSessionCookie(cookies);
    throw redirect(303, publicPath(params.slug?.trim() ?? ""));
  },
};
