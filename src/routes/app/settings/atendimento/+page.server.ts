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
  createSupportChatEntryOption,
  createSupportQueue,
  deleteSupportChatEntryOption,
  getSupportChatEntrySettings,
  updateSupportChatEntryOption,
  updateSupportQueueDueDays,
} from "$lib/server/support/supportChatEntryRepository";
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

function isValidDefaultDueDays(value: number): boolean {
  return Number.isInteger(value) && value >= 1 && value <= 365;
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

  return { configured: formData.has("configured"), days };
}

function readEntryOption(formData: FormData) {
  const label = readString(formData, "label");
  const description = readString(formData, "description");
  const queueId = readString(formData, "queueId");
  const initialHandling = readString(formData, "initialHandling") === "human" ? "human" as const : "ai" as const;
  const sortOrder = Math.min(Math.max(readInteger(formData, "sortOrder", 10), 0), 10_000);

  if (label.length < 2 || label.length > 80 || description.length > 180 || !isUuid(queueId)) return null;
  return {
    label,
    description,
    queueId,
    initialHandling,
    active: formData.has("active"),
    sortOrder,
  };
}

export const load: PageServerLoad = async ({ cookies }) => {
  await requireAppPermission(cookies, "system.settings.manage", "/app/settings/atendimento");
  const [settings, queue, routing, chatEntry] = await Promise.all([
    getSupportHoursSettings(),
    getSupportQueueTeamSettings(),
    getSupportRoutingSettings(),
    getSupportChatEntrySettings(),
  ]);
  return { settings, queue, routing, chatEntry };
};

export const actions: Actions = {
  save: async ({ cookies, request }) => {
    const { session } = await requireAppPermission(cookies, "system.settings.manage", "/app/settings/atendimento");
    const settings = readSettings(await request.formData());
    if (!isValidSupportHours(settings)) {
      return fail(400, { success: false, action: "save", message: "Revise os horários. Cada dia ativo precisa terminar depois do horário de início." });
    }
    await updateSupportHoursSettings(session.user.id, settings);
    return { success: true, action: "save", message: "Horário de atendimento atualizado." };
  },

  saveTeam: async ({ cookies, request }) => {
    const { session } = await requireAppPermission(cookies, "system.settings.manage", "/app/settings/atendimento");
    const teamId = readString(await request.formData(), "teamId");
    if (!isUuid(teamId)) return fail(400, { success: false, action: "saveTeam", message: "Selecione a equipe responsável pelo suporte." });
    try {
      await updateSupportQueueTeam(session.user.id, teamId);
      return { success: true, action: "saveTeam", message: "Equipe responsável pelo suporte atualizada." };
    } catch {
      return fail(400, { success: false, action: "saveTeam", message: "Não foi possível vincular esta equipe à fila de suporte." });
    }
  },

  saveRouting: async ({ cookies, request }) => {
    const { session } = await requireAppPermission(cookies, "system.settings.manage", "/app/settings/atendimento");
    const formData = await request.formData();
    const assignmentMode: SupportAssignmentMode = readString(formData, "assignmentMode") === "round_robin" ? "round_robin" : "manual";
    const chatRoutingUserIds = formData.getAll("chatRoutingUserId").filter((value): value is string => typeof value === "string" && isUuid(value));
    const ticketRoutingUserIds = formData.getAll("ticketRoutingUserId").filter((value): value is string => typeof value === "string" && isUuid(value));

    await updateSupportRoutingSettings(
      session.user.id,
      {
        assignmentMode,
        aiMaxRunsPerConversation: readInteger(formData, "aiMaxRunsPerConversation", 6),
        aiDailyTokenBudget: readInteger(formData, "aiDailyTokenBudget", 100_000),
        aiMaxOutputTokens: readInteger(formData, "aiMaxOutputTokens", 500),
      },
      chatRoutingUserIds,
      ticketRoutingUserIds,
    );

    return { success: true, action: "saveRouting", message: "Distribuição de chats, tickets e limites da IA atualizados." };
  },

  createQueue: async ({ cookies, request }) => {
    const { session } = await requireAppPermission(cookies, "system.settings.manage", "/app/settings/atendimento");
    const formData = await request.formData();
    const name = readString(formData, "name");
    const teamId = readString(formData, "teamId");
    const defaultDueDays = readInteger(formData, "defaultDueDays", 3);
    if (name.length < 2 || name.length > 80 || !isUuid(teamId) || !isValidDefaultDueDays(defaultDueDays)) {
      return fail(400, { success: false, action: "createQueue", message: "Informe nome, equipe e um prazo padrão entre 1 e 365 dias." });
    }
    try {
      await createSupportQueue(session.user.id, name, teamId, defaultDueDays);
      return { success: true, action: "createQueue", message: "Fila de atendimento criada." };
    } catch {
      return fail(400, { success: false, action: "createQueue", message: "Não foi possível criar a fila de atendimento." });
    }
  },

  saveQueueDueDays: async ({ cookies, request }) => {
    const { session } = await requireAppPermission(cookies, "system.settings.manage", "/app/settings/atendimento");
    const formData = await request.formData();
    const queueId = readString(formData, "queueId");
    const defaultDueDays = readInteger(formData, "defaultDueDays", 0);
    if (!isUuid(queueId) || !isValidDefaultDueDays(defaultDueDays)) return fail(400, { success: false, action: "saveQueueDueDays", message: "Informe um prazo padrão entre 1 e 365 dias." });
    try {
      await updateSupportQueueDueDays(session.user.id, queueId, defaultDueDays);
      return { success: true, action: "saveQueueDueDays", message: "Prazo padrão da fila atualizado." };
    } catch {
      return fail(400, { success: false, action: "saveQueueDueDays", message: "Não foi possível atualizar o prazo padrão da fila." });
    }
  },

  createEntryOption: async ({ cookies, request }) => {
    const { session } = await requireAppPermission(cookies, "system.settings.manage", "/app/settings/atendimento");
    const input = readEntryOption(await request.formData());
    if (!input) return fail(400, { success: false, action: "createEntryOption", message: "Revise nome, descrição e fila da opção." });
    try {
      await createSupportChatEntryOption(session.user.id, input);
      return { success: true, action: "createEntryOption", message: "Opção de entrada criada." };
    } catch {
      return fail(400, { success: false, action: "createEntryOption", message: "Não foi possível criar esta opção de entrada." });
    }
  },

  updateEntryOption: async ({ cookies, request }) => {
    const { session } = await requireAppPermission(cookies, "system.settings.manage", "/app/settings/atendimento");
    const formData = await request.formData();
    const optionId = readString(formData, "optionId");
    const input = readEntryOption(formData);
    if (!isUuid(optionId) || !input) return fail(400, { success: false, action: "updateEntryOption", message: "Revise os dados da opção de entrada." });
    try {
      await updateSupportChatEntryOption(session.user.id, optionId, input);
      return { success: true, action: "updateEntryOption", message: "Opção de entrada atualizada." };
    } catch {
      return fail(400, { success: false, action: "updateEntryOption", message: "Não foi possível atualizar esta opção." });
    }
  },

  deleteEntryOption: async ({ cookies, request }) => {
    const { session } = await requireAppPermission(cookies, "system.settings.manage", "/app/settings/atendimento");
    const optionId = readString(await request.formData(), "optionId");
    if (!isUuid(optionId)) return fail(400, { success: false, action: "deleteEntryOption", message: "Opção inválida." });
    try {
      await deleteSupportChatEntryOption(session.user.id, optionId);
      return { success: true, action: "deleteEntryOption", message: "Opção removida." };
    } catch {
      return fail(400, { success: false, action: "deleteEntryOption", message: "Não foi possível remover esta opção." });
    }
  },
};
