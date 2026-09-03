import { error, fail, redirect, type Actions, type Cookies } from "@sveltejs/kit";
import type { PageServerLoad } from "./$types";
import {
  getPublicHelpTrainingLanding,
  getPublicHelpTrainingSession,
  markPublicHelpTrainingStepViewed,
  startPublicHelpTrainingSession,
  toPublicHelpTrainingClientState,
} from "$lib/server/help/helpTrainingPublicRepository";
import {
  completePublicTrainingStepGuided,
  goBackPublicTrainingStep,
} from "$lib/server/help/helpTrainingGuidedExperienceRepository";
import {
  clearHelpTrainingPublicSessionCookie,
  getHelpTrainingPublicSessionCookie,
  setHelpTrainingPublicSessionCookie,
} from "$lib/server/help/helpTrainingSession";
import { consumeSupportPublicRateLimit } from "$lib/server/support/supportPublicRateLimit";

const PUBLIC_TRAINING_START_RATE_LIMIT = {
  maxRequests: 20,
  windowMs: 15 * 60 * 1000,
  blockMs: 15 * 60 * 1000,
} as const;

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
    canGoBack: Boolean(state && state.session.currentStepIndex > 0),
    successMessage: (url.searchParams.get("feito") ?? "").slice(0, 500),
  };
};

export const actions: Actions = {
  start: async ({ params, cookies, getClientAddress }) => {
    const slug = params.slug?.trim() ?? "";
    try {
      const allowed = await consumeSupportPublicRateLimit(
        "help-training-public-start",
        getClientAddress(),
        PUBLIC_TRAINING_START_RATE_LIMIT,
      );
      if (!allowed) {
        return fail(429, { success: false, message: "Muitas tentativas foram feitas. Aguarde alguns minutos e tente novamente." });
      }
      const session = await startPublicHelpTrainingSession(slug);
      setHelpTrainingPublicSessionCookie(cookies, session.sessionToken, session.expiresAt);
    } catch (cause) {
      console.error("[help.training.public.start]", {
        code: cause instanceof Error ? cause.message : "PUBLIC_TRAINING_START_FAILED",
      });
      return fail(503, { success: false, message: "Esta trilha não pode ser iniciada agora. Tente novamente em instantes." });
    }
    throw redirect(303, publicPath(slug));
  },

  success: async ({ params, cookies }) => {
    const slug = params.slug?.trim() ?? "";
    const { token } = await requirePublicSession(cookies, slug);
    try {
      const result = await completePublicTrainingStepGuided(token);
      const message = encodeURIComponent(result.successMessage || "Certo. Vamos continuar.");
      throw redirect(303, `${publicPath(slug)}?feito=${message}`);
    } catch (cause) {
      if (cause && typeof cause === "object" && "status" in cause && cause.status === 303) throw cause;
      return fail(409, { success: false, message: "Não foi possível avançar. Tente novamente." });
    }
  },

  back: async ({ params, cookies }) => {
    const slug = params.slug?.trim() ?? "";
    const { token } = await requirePublicSession(cookies, slug);
    try {
      await goBackPublicTrainingStep(token);
      throw redirect(303, publicPath(slug));
    } catch (cause) {
      if (cause && typeof cause === "object" && "status" in cause && cause.status === 303) throw cause;
      return fail(409, { success: false, message: "Não foi possível voltar para a orientação anterior." });
    }
  },

  restart: async ({ params, cookies }) => {
    clearHelpTrainingPublicSessionCookie(cookies);
    throw redirect(303, publicPath(params.slug?.trim() ?? ""));
  },
};
