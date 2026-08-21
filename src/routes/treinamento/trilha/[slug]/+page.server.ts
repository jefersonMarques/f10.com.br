import { error, fail, redirect, type Actions, type Cookies } from "@sveltejs/kit";
import type { PageServerLoad } from "./$types";
import { getOptionalCustomerF10PortalSession } from "$lib/server/customerPortal/customerPortalSession";
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
  reportPublicTrainingDifficulty,
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

const PUBLIC_TRAINING_FAILURE_RATE_LIMIT = {
  maxRequests: 12,
  windowMs: 15 * 60 * 1000,
  blockMs: 30 * 60 * 1000,
} as const;

function read(formData: FormData, name: string): string {
  const value = formData.get(name);
  return typeof value === "string" ? value.trim() : "";
}

function publicPath(slug: string): string {
  return `/treinamento/trilha/${encodeURIComponent(slug)}`;
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
  let [state, customer] = await Promise.all([
    token ? getPublicHelpTrainingSession(token) : Promise.resolve(null),
    getOptionalCustomerF10PortalSession(cookies),
  ]);
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
    failureReported: false,
    difficultyAuth: publicDifficultyAuth(customer),
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

  failure: async ({ params, cookies, request, getClientAddress }) => {
    const slug = params.slug?.trim() ?? "";
    const { token } = await requirePublicSession(cookies, slug);
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
      const allowed = await consumeSupportPublicRateLimit(
        "help-training-public-failure",
        getClientAddress(),
        PUBLIC_TRAINING_FAILURE_RATE_LIMIT,
      );
      if (!allowed) {
        return fail(429, { success: false, message: "Muitos relatos foram enviados. Aguarde alguns minutos antes de tentar novamente." });
      }
      await reportPublicTrainingDifficulty(token, detail, {
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

  restart: async ({ params, cookies }) => {
    clearHelpTrainingPublicSessionCookie(cookies);
    throw redirect(303, publicPath(params.slug?.trim() ?? ""));
  },
};
