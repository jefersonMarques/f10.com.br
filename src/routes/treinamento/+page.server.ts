import { fail, redirect, type Actions, type Cookies } from "@sveltejs/kit";
import type { PageServerLoad } from "./$types";
import { getOptionalCustomerF10PortalSession } from "$lib/server/customerPortal/customerPortalSession";
import { previewHelpTrainingInvite } from "$lib/server/help/helpTrainingInvitePreview";
import {
  consumeHelpTrainingInvite,
  getHelpTrainingSession,
  startHelpTrainingSession,
} from "$lib/server/help/helpTrainingRepository";
import {
  completeInviteTrainingStepGuided,
  goBackInviteTrainingStep,
  reportInviteTrainingDifficulty,
} from "$lib/server/help/helpTrainingGuidedExperienceRepository";
import { toHelpTrainingClientState } from "$lib/server/help/helpTrainingExperience";
import {
  clearHelpTrainingInviteCookie,
  clearHelpTrainingSessionCookie,
  getHelpTrainingInviteCookie,
  getHelpTrainingSessionCookie,
  setHelpTrainingSessionCookie,
} from "$lib/server/help/helpTrainingSession";
import { markHelpTrainingStepViewed } from "$lib/server/help/helpTrainingTelemetry";

function read(formData: FormData, name: string): string {
  const value = formData.get(name);
  return typeof value === "string" ? value.trim() : "";
}

function publicDifficultyAuth(customer: Awaited<ReturnType<typeof getOptionalCustomerF10PortalSession>>) {
  if (!customer) {
    return {
      authenticated: false,
      name: "",
      email: "",
      groupName: null,
      unitName: null,
      requiresUnitSelection: false,
      groups: [],
    };
  }
  return {
    authenticated: customer.selectedUnitId !== null,
    name: customer.name,
    email: customer.email,
    groupName: customer.selectedGroupName,
    unitName: customer.selectedUnitName,
    requiresUnitSelection: customer.selectedUnitId === null,
    groups: customer.groups.map((group) => ({
      id: group.grupo_id,
      name: group.grupo,
      units: group.unidades.map((unit) => ({ id: unit.unidade_id, name: unit.unidade })),
    })),
  };
}

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
  const [state, customer] = await Promise.all([
    token ? getHelpTrainingSession(token) : Promise.resolve(null),
    getOptionalCustomerF10PortalSession(cookies),
  ]);
  if (token && !state) clearHelpTrainingSessionCookie(cookies);

  if (state?.session.startedAt && state.currentStep) {
    await markHelpTrainingStepViewed(state.session.id, state.currentStep.id);
  }

  const stagedInviteToken = state ? "" : getHelpTrainingInviteCookie(cookies);
  const invitePreview = stagedInviteToken
    ? await previewHelpTrainingInvite(stagedInviteToken)
    : null;
  if (stagedInviteToken && !invitePreview) clearHelpTrainingInviteCookie(cookies);

  return {
    state: state ? toHelpTrainingClientState(state) : null,
    canGoBack: Boolean(state && state.session.currentStepIndex > 0),
    invitePreview,
    inviteState: url.searchParams.get("convite"),
    successMessage: (url.searchParams.get("feito") ?? "").slice(0, 500),
    failureReported: false,
    difficultyAuth: publicDifficultyAuth(customer),
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

  success: async ({ cookies }) => {
    const token = await requireTrainingToken(cookies);
    try {
      const result = await completeInviteTrainingStepGuided(token);
      const message = encodeURIComponent(result.successMessage || "Certo. Vamos continuar.");
      throw redirect(303, `/treinamento?feito=${message}`);
    } catch (cause) {
      if (cause && typeof cause === "object" && "status" in cause && cause.status === 303) throw cause;
      return fail(409, { success: false, message: "Não foi possível avançar. Tente novamente." });
    }
  },

  back: async ({ cookies }) => {
    const token = await requireTrainingToken(cookies);
    try {
      await goBackInviteTrainingStep(token);
      throw redirect(303, "/treinamento");
    } catch (cause) {
      if (cause && typeof cause === "object" && "status" in cause && cause.status === 303) throw cause;
      return fail(409, { success: false, message: "Não foi possível voltar para a orientação anterior." });
    }
  },

  failure: async ({ cookies, request }) => {
    const token = await requireTrainingToken(cookies);
    const customer = await getOptionalCustomerF10PortalSession(cookies);
    if (!customer || customer.selectedUnitId === null) {
      return fail(401, {
        success: false,
        authRequired: true,
        message: "Entre com sua conta F10 antes de registrar a dificuldade.",
      });
    }

    const formData = await request.formData();
    const detail = read(formData, "detail");
    const intent = read(formData, "intent") === "ticket" ? "ticket" : "save";
    if (detail.length < 3) {
      return fail(400, { success: false, message: "Conte brevemente o que impediu você de continuar." });
    }
    try {
      await reportInviteTrainingDifficulty(token, detail, {
        name: customer.name,
        email: customer.email,
        groupName: customer.selectedGroupName,
        unitName: customer.selectedUnitName,
      });
      return {
        success: true,
        difficultySaved: true,
        intent,
        detail,
        message: intent === "ticket"
          ? "Dificuldade registrada. Abrindo o ticket..."
          : "Dificuldade registrada. Você pode continuar quando estiver pronto.",
      };
    } catch {
      return fail(409, { success: false, message: "Não foi possível registrar a dificuldade. Tente novamente." });
    }
  },

  logout: async ({ cookies }) => {
    clearHelpTrainingInviteCookie(cookies);
    clearHelpTrainingSessionCookie(cookies);
    throw redirect(303, "/treinamento");
  },
};
