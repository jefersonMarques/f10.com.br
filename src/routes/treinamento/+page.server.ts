import { fail, redirect, type Actions, type Cookies } from "@sveltejs/kit";
import type { PageServerLoad } from "./$types";
import { previewHelpTrainingInvite } from "$lib/server/help/helpTrainingInvitePreview";
import {
  consumeHelpTrainingInvite,
  getHelpTrainingSession,
  startHelpTrainingSession,
} from "$lib/server/help/helpTrainingRepository";
import {
  completeInviteTrainingStepGuided,
  goBackInviteTrainingStep,
} from "$lib/server/help/helpTrainingGuidedExperienceRepository";
import {
  canGoBackWithinTrainingModule,
  toHelpTrainingClientState,
} from "$lib/server/help/helpTrainingExperience";
import {
  clearHelpTrainingInviteCookie,
  clearHelpTrainingSessionCookie,
  getHelpTrainingInviteCookie,
  getHelpTrainingSessionCookie,
  setHelpTrainingSessionCookie,
} from "$lib/server/help/helpTrainingSession";
import { markHelpTrainingStepViewed } from "$lib/server/help/helpTrainingTelemetry";

async function requireTrainingToken(cookies: Cookies): Promise<string> {
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

  if (state?.session.startedAt && state.currentStep) {
    await markHelpTrainingStepViewed(state.session.id, state.currentStep.id);
  }

  const stagedInviteToken = state ? "" : getHelpTrainingInviteCookie(cookies);
  const invitePreview = stagedInviteToken
    ? await previewHelpTrainingInvite(stagedInviteToken)
    : null;
  if (stagedInviteToken && !invitePreview) clearHelpTrainingInviteCookie(cookies);

  const clientState = state ? toHelpTrainingClientState(state) : null;

  return {
    state: clientState,
    showJourney: Boolean(
      clientState?.session.startedAt &&
      clientState.journey.isMultiModule &&
      !clientState.completed &&
      url.searchParams.get("modulo") !== "abrir",
    ),
    canGoBack: Boolean(
      state && canGoBackWithinTrainingModule(state.snapshot, state.session.currentStepIndex),
    ),
    invitePreview,
    inviteState: url.searchParams.get("convite"),
    successMessage: (url.searchParams.get("feito") ?? "").slice(0, 500),
  };
};

export const actions: Actions = {
  acceptInvite: async ({ cookies }) => {
    const inviteToken = getHelpTrainingInviteCookie(cookies);
    if (!inviteToken) throw redirect(303, "/treinamento?convite=invalido");
    try {
      const created = await consumeHelpTrainingInvite(inviteToken);
      setHelpTrainingSessionCookie(cookies, created.sessionToken, created.expiresAt);
      clearHelpTrainingInviteCookie(cookies);
      await startHelpTrainingSession(created.sessionToken);
      throw redirect(303, "/treinamento");
    } catch (cause) {
      if (cause && typeof cause === "object" && "status" in cause && cause.status === 303) throw cause;
      clearHelpTrainingInviteCookie(cookies);
      throw redirect(303, "/treinamento?convite=invalido");
    }
  },

  start: async ({ cookies }) => {
    const token = await requireTrainingToken(cookies);
    await startHelpTrainingSession(token);
    throw redirect(303, "/treinamento");
  },

  openModule: async ({ cookies }) => {
    await requireTrainingToken(cookies);
    throw redirect(303, "/treinamento?modulo=abrir");
  },

  success: async ({ cookies }) => {
    const token = await requireTrainingToken(cookies);
    try {
      const result = await completeInviteTrainingStepGuided(token);
      if (result.completed || result.moduleCompleted) {
        throw redirect(303, "/treinamento");
      }
      const message = encodeURIComponent(result.successMessage || "Certo. Vamos continuar.");
      throw redirect(303, `/treinamento?modulo=abrir&feito=${message}`);
    } catch (cause) {
      if (cause && typeof cause === "object" && "status" in cause && cause.status === 303) throw cause;
      return fail(409, { success: false, message: "Não foi possível avançar. Tente novamente." });
    }
  },

  back: async ({ cookies }) => {
    const token = await requireTrainingToken(cookies);
    try {
      await goBackInviteTrainingStep(token);
      throw redirect(303, "/treinamento?modulo=abrir");
    } catch (cause) {
      if (cause && typeof cause === "object" && "status" in cause && cause.status === 303) throw cause;
      return fail(409, { success: false, message: "Não foi possível voltar para a orientação anterior." });
    }
  },

  logout: async ({ cookies }) => {
    clearHelpTrainingInviteCookie(cookies);
    clearHelpTrainingSessionCookie(cookies);
    throw redirect(303, "/treinamento");
  },
};
