import { fail } from "@sveltejs/kit";
import type { Actions, PageServerLoad } from "./$types";
import { requireAppPermission } from "$lib/server/auth/authorization";
import { hasPermission } from "$lib/server/auth/permissions";
import {
  getServiceRequestEmailSettings,
  updateServiceRequestEmailRecipients,
} from "$lib/server/serviceRequests/serviceRequestEmailSettings";
import {
  getTicketOnboardingSettings,
  updateTicketOnboardingSettings,
} from "$lib/server/settings/operationsSettingsRepository";
import { ensureTicketOnboardingEntryPoint, listTicketOnboardingAreas } from "$lib/server/support/ticketWorkflowRepository";
import { listEligibleTicketResponders } from "$lib/server/support/supportRoutingRepository";
import {
  getTicketOperatorEmailSettings,
  isSuperAdminUser,
  saveTicketOperatorEmailSettings,
} from "$lib/server/settings/ticketOperatorEmailSettings";

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
  const { session, permissions } = await requireAppPermission(cookies, "system.settings.manage", "/app/settings/tickets");
  const [settings, onboarding, onboardingAreas, operatorSettings, operatorUsers, canConfigureOperatorEmails] = await Promise.all([
    getServiceRequestEmailSettings(),
    getTicketOnboardingSettings(),
    listTicketOnboardingAreas(),
    getTicketOperatorEmailSettings(),
    listEligibleTicketResponders(),
    isSuperAdminUser(session.user.id),
  ]);
  return {
    nfse: settings.find((setting) => setting.requestType === "nfse")!,
    cellCoin: settings.find((setting) => setting.requestType === "cell_coin")!,
    onboarding,
    onboardingAreas,
    selectedOnboardingAreaId:
      onboardingAreas.find((area) => area.stageId === onboarding.startStageId)?.areaId ?? "",
    canManageWorkflows: hasPermission(permissions, "tickets.manage", "all"),
    operatorSettings,
    operatorUsers,
    canConfigureOperatorEmails,
  };
};

export const actions: Actions = {
  saveOnboarding: async ({ cookies, request }) => {
    const { session, permissions } = await requireAppPermission(
      cookies,
      "system.settings.manage",
      "/app/settings/tickets",
    );

    const value = (await request.formData()).get("areaId");
    const areaId = typeof value === "string" ? value.trim() : "";
    if (areaId && !hasPermission(permissions, "tickets.manage", "all")) {
      return fail(403, {
        success: false,
        action: "saveOnboarding",
        message: "Para configurar a entrada, é necessário administrar todos os fluxos de tickets.",
      });
    }

    try {
      const startStageId = areaId
        ? await ensureTicketOnboardingEntryPoint(areaId)
        : null;
      await updateTicketOnboardingSettings(session.user.id, { startStageId });
      return {
        success: true,
        action: "saveOnboarding",
        message: areaId
          ? "Processo de onboarding configurado para os próximos tickets."
          : "Entrada de onboarding desativada.",
      };
    } catch (cause) {
      console.error("[operations.ticket_onboarding.save_failed]", {
        causeType: cause instanceof Error ? cause.name : typeof cause,
        errorCode: cause instanceof Error ? cause.message : "unknown",
      });
      return fail(400, {
        success: false,
        action: "saveOnboarding",
        message: "Não foi possível configurar o processo. Confira se o fluxo global e a área estão ativos.",
      });
    }
  },

  saveOperatorEmails: async ({ cookies, request }) => {
    const { session } = await requireAppPermission(
      cookies,
      "system.settings.manage",
      "/app/settings/tickets",
    );

    try {
      const formData = await request.formData();
      await saveTicketOperatorEmailSettings(session.user.id, {
        enabled: formData.get("operatorEmailEnabled") === "on",
        customerAttachments: formData.get("customerAttachmentEmails") === "on",
        recipientUserIds: readRecipients(formData, "operatorRecipientUserId"),
      });
      return {
        success: true,
        action: "saveOperatorEmails",
        message: "Avisos por e-mail aos operadores atualizados.",
      };
    } catch {
      return fail(403, {
        success: false,
        action: "saveOperatorEmails",
        message: "Não foi possível salvar. Verifique suas permissões e os operadores selecionados.",
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
