import { fail } from "@sveltejs/kit";
import type { Actions, PageServerLoad } from "./$types";
import { requireAppPermission } from "$lib/server/auth/authorization";
import {
  getSupportHoursSettings,
  isValidSupportHours,
  SUPPORT_DAY_KEYS,
  updateSupportHoursSettings,
  type SupportDayKey,
  type SupportHoursSettings,
} from "$lib/server/settings/supportHoursRepository";

function readString(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function readSettings(formData: FormData): SupportHoursSettings {
  const days = {} as SupportHoursSettings["days"];
  for (const key of SUPPORT_DAY_KEYS) {
    days[key as SupportDayKey] = {
      enabled: formData.has(`${key}Enabled`),
      start: readString(formData, `${key}Start`),
      end: readString(formData, `${key}End`),
    };
  }

  return {
    configured: formData.has("configured"),
    days,
  };
}

export const load: PageServerLoad = async ({ cookies }) => {
  await requireAppPermission(cookies, "system.settings.manage", "/app/settings/atendimento");
  return { settings: await getSupportHoursSettings() };
};

export const actions: Actions = {
  save: async ({ cookies, request }) => {
    const { session } = await requireAppPermission(
      cookies,
      "system.settings.manage",
      "/app/settings/atendimento",
    );
    const settings = readSettings(await request.formData());
    if (!isValidSupportHours(settings)) {
      return fail(400, {
        success: false,
        message: "Revise os horários. Cada dia ativo precisa terminar depois do horário de início.",
      });
    }

    await updateSupportHoursSettings(session.user.id, settings);
    return {
      success: true,
      message: "Horário de atendimento atualizado.",
    };
  },
};
