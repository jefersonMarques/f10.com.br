import { fail } from "@sveltejs/kit";
import type { Actions, PageServerLoad } from "./$types";
import { requireAppPermission } from "$lib/server/auth/authorization";
import {
  getGeneralOperationsSettings,
  updateGeneralOperationsSettings,
} from "$lib/server/settings/operationsSettingsRepository";

function readString(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function isValidOptionalEmail(value: string): boolean {
  return !value || (value.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value));
}

export const load: PageServerLoad = async ({ cookies }) => {
  await requireAppPermission(cookies, "system.settings.manage", "/app/settings");
  return {
    general: await getGeneralOperationsSettings(),
  };
};

export const actions: Actions = {
  saveGeneral: async ({ cookies, request }) => {
    const { session } = await requireAppPermission(
      cookies,
      "system.settings.manage",
      "/app/settings",
    );
    const formData = await request.formData();
    const supportDisplayName = readString(formData, "supportDisplayName");
    const supportSenderEmail = readString(formData, "supportSenderEmail").toLowerCase();
    const supportSenderName = readString(formData, "supportSenderName");
    const timezone = readString(formData, "timezone");
    const remoteConsentMinutes = Number(readString(formData, "remoteConsentMinutes"));

    if (
      supportDisplayName.length < 2 ||
      supportDisplayName.length > 120 ||
      !isValidOptionalEmail(supportSenderEmail) ||
      supportSenderName.length < 2 ||
      supportSenderName.length > 120 ||
      timezone.length < 3 ||
      timezone.length > 80 ||
      !Number.isInteger(remoteConsentMinutes) ||
      remoteConsentMinutes < 5 ||
      remoteConsentMinutes > 120
    ) {
      return fail(400, {
        success: false,
        action: "saveGeneral",
        message: "Revise os valores das configurações gerais.",
      });
    }

    await updateGeneralOperationsSettings(session.user.id, {
      supportDisplayName,
      supportSenderEmail,
      supportSenderName,
      timezone,
      remoteConsentMinutes,
    });

    return {
      success: true,
      action: "saveGeneral",
      message: "Configurações gerais atualizadas.",
    };
  },
};
