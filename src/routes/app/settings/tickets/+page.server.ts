import { fail } from "@sveltejs/kit";
import type { Actions, PageServerLoad } from "./$types";
import { requireAppPermission } from "$lib/server/auth/authorization";
import {
  getServiceRequestEmailSettings,
  updateServiceRequestEmailRecipients,
} from "$lib/server/serviceRequests/serviceRequestEmailSettings";
import {
  getTicketOnboardingSettings,
  updateTicketOnboardingSettings,
} from "$lib/server/settings/operationsSettingsRepository";
import { listTicketWorkflowEntryPoints } from "$lib/server/support/ticketWorkflowRepository";

function readRecipients(formData: FormData, key: string): string[] {
  const values = formData
    .getAll(key)
    .filter((value): value is string => typeof value === "string")
    .map((value) => value.trim())
    .filter(Boolean);
  const unique = Array.from(new Set(values));
  if (unique.length > 100) throw new Error("SERVICE_REQUEST_EMAIL_RECIPIENT_LIMIT");
  if (unique.some((value) => !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value))) {
    throw new Error("SERVICE_REQUEST_EMAIL_RECIPIENT_INVALID");
  }
  return unique;
}

export const load: PageServerLoad = async ({ cookies }) => {
  await requireAppPermission(cookies, "system.settings.manage", "/app/settings/tickets");
  const [settings, onboarding, entryPoints] = await Promise.all([
    getServiceRequestEmailSettings(),
    getTicketOnboardingSettings(),
    listTicketWorkflowEntryPoints(),
  ]);
  return {
    nfse: settings.find((setting) => setting.requestType === "nfse")!,
    cellCoin: settings.find((setting) => setting.requestType === "cell_coin")!,
    onboarding,
    entryPoints,
  };
};

export const actions: Actions = {
  saveOnboarding: async ({ cookies, request }) => {
    const { session } = await requireAppPermission(
      cookies,
      "system.settings.manage",
      "/app/settings/tickets",
    );

    const formData = await request.formData();
    const value = formData.get("startStageId");
    const startStageId = typeof value === "string" && value.trim() ? value.trim() : null;

    try {
      const entryPoints = await listTicketWorkflowEntryPoints();
      if (startStageId && !entryPoints.some((entryPoint) => entryPoint.stageId === startStageId)) {
        throw new Error("TICKET_ONBOARDING_STAGE_INVALID");
      }
      await updateTicketOnboardingSettings(session.user.id, { startStageId });
      return {
        success: true,
        action: "saveOnboarding",
        message: "Processo de onboarding atualizado.",
      };
    } catch {
      return fail(400, {
        success: false,
        action: "saveOnboarding",
        message: "Selecione um processo disponível para receber novos clientes.",
      });
    }
  },

  saveNotifications: async ({ cookies, request }) => {
    const { session } = await requireAppPermission(
      cookies,
      "system.settings.manage",
      "/app/settings/tickets",
    );

    try {
      const formData = await request.formData();
      await updateServiceRequestEmailRecipients(session.user.id, {
        nfse: readRecipients(formData, "nfseRecipientUserId"),
        cell_coin: readRecipients(formData, "cellCoinRecipientUserId"),
      });
      return {
        success: true,
        action: "saveNotifications",
        message: "Notificações de tickets atualizadas.",
      };
    } catch {
      return fail(400, {
        success: false,
        action: "saveNotifications",
        message: "Não foi possível salvar. Revise as pessoas selecionadas.",
      });
    }
  },
};
