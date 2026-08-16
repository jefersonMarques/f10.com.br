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
import {
  getSupportQueueTeamSettings,
  updateSupportQueueTeam,
} from "$lib/server/settings/supportQueueSettingsRepository";
import {
  getSupportRoutingSettings,
  updateSupportRoutingSettings,
  type SupportAssignmentMode,
} from "$lib/server/support/supportRoutingRepository";

function readString(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function readInteger(formData: FormData, key: string, fallback: number): number {
  const value = Number.parseInt(readString(formData, key), 10);
  return Number.isFinite(value) ? value : fallback;
}

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
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
  const [settings, queue, routing] = await Promise.all([
    getSupportHoursSettings(),
    getSupportQueueTeamSettings(),
    getSupportRoutingSettings(),
  ]);
  return { settings, queue, routing };
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
        action: "save",
        message: "Revise os horários. Cada dia ativo precisa terminar depois do horário de início.",
      });
    }

    await updateSupportHoursSettings(session.user.id, settings);
    return {
      success: true,
      action: "save",
      message: "Horário de atendimento atualizado.",
    };
  },

  saveTeam: async ({ cookies, request }) => {
    const { session } = await requireAppPermission(
      cookies,
      "system.settings.manage",
      "/app/settings/atendimento",
    );
    const teamId = readString(await request.formData(), "teamId");
    if (!isUuid(teamId)) {
      return fail(400, {
        success: false,
        action: "saveTeam",
        message: "Selecione a equipe responsável pelo suporte.",
      });
    }

    try {
      await updateSupportQueueTeam(session.user.id, teamId);
      return {
        success: true,
        action: "saveTeam",
        message: "Equipe responsável pelo suporte atualizada.",
      };
    } catch {
      return fail(400, {
        success: false,
        action: "saveTeam",
        message: "Não foi possível vincular esta equipe à fila de suporte.",
      });
    }
  },

  saveRouting: async ({ cookies, request }) => {
    const { session } = await requireAppPermission(
      cookies,
      "system.settings.manage",
      "/app/settings/atendimento",
    );
    const formData = await request.formData();
    const assignmentMode: SupportAssignmentMode =
      readString(formData, "assignmentMode") === "round_robin"
        ? "round_robin"
        : "manual";
    const routingUserIds = formData
      .getAll("routingUserId")
      .filter((value): value is string => typeof value === "string" && isUuid(value));

    await updateSupportRoutingSettings(
      session.user.id,
      {
        assignmentMode,
        aiMaxRunsPerConversation: readInteger(formData, "aiMaxRunsPerConversation", 6),
        aiDailyTokenBudget: readInteger(formData, "aiDailyTokenBudget", 100_000),
        aiMaxOutputTokens: readInteger(formData, "aiMaxOutputTokens", 500),
      },
      routingUserIds,
    );

    return {
      success: true,
      action: "saveRouting",
      message: "Distribuição do chat e limites da IA atualizados.",
    };
  },
};
