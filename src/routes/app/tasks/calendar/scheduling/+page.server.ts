import { error, fail, type Actions } from "@sveltejs/kit";
import type { PageServerLoad } from "./$types";
import { requireAppPermission } from "$lib/server/auth/authorization";
import { getPermissionScope, hasPermission } from "$lib/server/auth/permissions";
import {
  DEFAULT_SCHEDULING_AVAILABILITY,
  listSchedulingCustomers,
  listSchedulingHosts,
  listSchedulingInvitations,
  listSchedulingTeamUserIds,
} from "$lib/server/calendar/schedulingRepository";
import {
  configureSchedulingAvailability,
  generateSchedulingInvitation,
  revokeSchedulingLink,
} from "$lib/server/calendar/schedulingService";
import type { SchedulingWeekday } from "$lib/server/db/schedulingSchema";

function permissionMap(permissions: Array<{ code: string; scope: "own" | "team" | "all" }>) {
  return new Map(permissions.map((permission) => [permission.code, permission.scope]));
}

function readValue(formData: FormData, name: string): string {
  const value = formData.get(name);
  return typeof value === "string" ? value.trim() : "";
}

function readInteger(formData: FormData, name: string): number {
  return Number.parseInt(readValue(formData, name), 10);
}

function readWeekdays(formData: FormData): SchedulingWeekday[] {
  const values = formData
    .getAll("weekday")
    .map((value) => Number(value))
    .filter((value): value is SchedulingWeekday => Number.isInteger(value) && value >= 0 && value <= 6);
  return Array.from(new Set(values)).sort((left, right) => left - right);
}

function schedulingMessage(errorValue: unknown): string {
  const code = errorValue instanceof Error ? errorValue.message : "";
  const messages: Record<string, string> = {
    SCHEDULING_HOST_NOT_ALLOWED: "Você não pode criar ou configurar agendamentos para este responsável.",
    SCHEDULING_HOST_NOT_FOUND: "Responsável inválido ou inativo.",
    SCHEDULING_HOST_GOOGLE_REQUIRED: "O responsável precisa conectar o Google Calendar antes de receber agendamentos.",
    SCHEDULING_CUSTOMER_EMAIL_REQUIRED: "Selecione um cliente ativo com e-mail cadastrado.",
    SCHEDULING_INVALID_TITLE: "Informe um título entre 3 e 180 caracteres.",
    SCHEDULING_INVALID_DURATION: "A duração deve ficar entre 15 e 240 minutos.",
    SCHEDULING_INVALID_DATE_RANGE: "Revise a janela de datas do agendamento.",
    SCHEDULING_DATE_RANGE_IN_PAST: "A janela de agendamento não pode começar no passado.",
    SCHEDULING_DATE_RANGE_TOO_LONG: "A janela escolhida ultrapassa o horizonte configurado para o responsável.",
    SCHEDULING_INVALID_TIME_ZONE: "Fuso horário inválido.",
    SCHEDULING_INVALID_WEEKDAYS: "Selecione ao menos um dia de atendimento.",
    SCHEDULING_INVALID_WORKING_HOURS: "Informe um horário de atendimento válido.",
    SCHEDULING_INVALID_SLOT_STEP: "Intervalo entre horários inválido.",
    SCHEDULING_INVALID_MINIMUM_NOTICE: "Antecedência mínima inválida.",
    SCHEDULING_INVALID_BUFFER: "Buffer de agenda inválido.",
    SCHEDULING_INVALID_HORIZON: "Horizonte de datas inválido.",
    SCHEDULING_INVITATION_NOT_REVOCABLE: "Este convite não pode mais ser revogado.",
  };
  return messages[code] ?? "Não foi possível concluir a operação de agendamento.";
}

export const load: PageServerLoad = async ({ parent }) => {
  const layout = await parent();
  const permissions = permissionMap(layout.permissions);
  if (!hasPermission(permissions, "scheduling.view")) throw error(403, "Acesso não autorizado.");

  const createScope = getPermissionScope(permissions, "scheduling.create");
  const viewScope = getPermissionScope(permissions, "scheduling.view") ?? "own";
  const canManage = hasPermission(permissions, "scheduling.manage");
  const canCreate = Boolean(createScope) && hasPermission(permissions, "customers.view");
  const needsTeamUsers = createScope === "team" || viewScope === "team";
  const teamUserIds = needsTeamUsers ? await listSchedulingTeamUserIds(layout.user.id) : [layout.user.id];
  const invitationVisibility = canManage || viewScope === "all" ? "all" : viewScope;
  const [rawHosts, customers, invitations] = await Promise.all([
    listSchedulingHosts(),
    canCreate ? listSchedulingCustomers() : Promise.resolve([]),
    listSchedulingInvitations(layout.user.id, invitationVisibility, teamUserIds),
  ]);

  const allowedHosts = rawHosts
    .filter((host) =>
      canManage ||
      createScope === "all" ||
      (createScope === "team" && teamUserIds.includes(host.id)) ||
      host.id === layout.user.id
    )
    .map((host) => ({
      id: host.id,
      name: host.name,
      email: host.email,
      googleConnected: Boolean(host.googleConnectedUserId),
      profile: {
        userId: host.id,
        timeZone: host.profileTimeZone ?? DEFAULT_SCHEDULING_AVAILABILITY.timeZone,
        weekdays: host.profileWeekdays ?? DEFAULT_SCHEDULING_AVAILABILITY.weekdays,
        startTime: host.profileStartTime ?? DEFAULT_SCHEDULING_AVAILABILITY.startTime,
        endTime: host.profileEndTime ?? DEFAULT_SCHEDULING_AVAILABILITY.endTime,
        slotStepMinutes: host.profileSlotStepMinutes ?? DEFAULT_SCHEDULING_AVAILABILITY.slotStepMinutes,
        minimumNoticeMinutes: host.profileMinimumNoticeMinutes ?? DEFAULT_SCHEDULING_AVAILABILITY.minimumNoticeMinutes,
        bufferBeforeMinutes: host.profileBufferBeforeMinutes ?? DEFAULT_SCHEDULING_AVAILABILITY.bufferBeforeMinutes,
        bufferAfterMinutes: host.profileBufferAfterMinutes ?? DEFAULT_SCHEDULING_AVAILABILITY.bufferAfterMinutes,
        maxHorizonDays: host.profileMaxHorizonDays ?? DEFAULT_SCHEDULING_AVAILABILITY.maxHorizonDays,
        defaultDurationMinutes: host.profileDefaultDurationMinutes ?? DEFAULT_SCHEDULING_AVAILABILITY.defaultDurationMinutes,
        source: host.profileUserId ? "user" as const : "default" as const,
      },
    }));

  return {
    canCreate,
    canManage,
    canConfigure: Boolean(createScope) || canManage,
    canChangeInvitations: Boolean(createScope) || canManage,
    currentUserId: layout.user.id,
    hosts: allowedHosts,
    customers,
    invitations,
  };
};

export const actions: Actions = {
  createInvitation: async ({ cookies, request }) => {
    const { session, permissions } = await requireAppPermission(
      cookies,
      "scheduling.create",
      "/app/tasks/calendar/scheduling",
    );
    if (!hasPermission(permissions, "customers.view")) {
      return fail(403, { success: false, action: "createInvitation", message: "Acesso a clientes não autorizado." });
    }

    const formData = await request.formData();
    try {
      const created = await generateSchedulingInvitation(session.user.id, permissions, {
        customerContactId: readValue(formData, "customerContactId"),
        title: readValue(formData, "title"),
        hostUserId: readValue(formData, "hostUserId"),
        durationMinutes: readInteger(formData, "durationMinutes"),
        dateRangeStart: readValue(formData, "dateRangeStart"),
        dateRangeEnd: readValue(formData, "dateRangeEnd"),
        addGoogleMeet: readValue(formData, "addGoogleMeet") === "true",
      });
      return {
        success: true,
        action: "createInvitation",
        message: "Link de agendamento criado.",
        bookingPath: `/agendar/${created.token}`,
      };
    } catch (errorValue) {
      return fail(400, {
        success: false,
        action: "createInvitation",
        message: schedulingMessage(errorValue),
      });
    }
  },

  saveAvailability: async ({ cookies, request }) => {
    const { session, permissions } = await requireAppPermission(
      cookies,
      "scheduling.view",
      "/app/tasks/calendar/scheduling",
    );
    if (!hasPermission(permissions, "scheduling.create") && !hasPermission(permissions, "scheduling.manage")) {
      return fail(403, { success: false, action: "saveAvailability", message: "Acesso não autorizado." });
    }
    const formData = await request.formData();

    try {
      await configureSchedulingAvailability(session.user.id, permissions, {
        userId: readValue(formData, "hostUserId"),
        timeZone: readValue(formData, "timeZone"),
        weekdays: readWeekdays(formData),
        startTime: readValue(formData, "startTime"),
        endTime: readValue(formData, "endTime"),
        slotStepMinutes: readInteger(formData, "slotStepMinutes"),
        minimumNoticeMinutes: readInteger(formData, "minimumNoticeMinutes"),
        bufferBeforeMinutes: readInteger(formData, "bufferBeforeMinutes"),
        bufferAfterMinutes: readInteger(formData, "bufferAfterMinutes"),
        maxHorizonDays: readInteger(formData, "maxHorizonDays"),
        defaultDurationMinutes: readInteger(formData, "defaultDurationMinutes"),
      });
      return { success: true, action: "saveAvailability", message: "Disponibilidade atualizada." };
    } catch (errorValue) {
      return fail(400, {
        success: false,
        action: "saveAvailability",
        message: schedulingMessage(errorValue),
      });
    }
  },

  revokeInvitation: async ({ cookies, request }) => {
    const { session, permissions } = await requireAppPermission(
      cookies,
      "scheduling.view",
      "/app/tasks/calendar/scheduling",
    );
    if (!hasPermission(permissions, "scheduling.create") && !hasPermission(permissions, "scheduling.manage")) {
      return fail(403, { success: false, action: "revokeInvitation", message: "Acesso não autorizado." });
    }
    const formData = await request.formData();
    try {
      await revokeSchedulingLink(
        session.user.id,
        permissions,
        readValue(formData, "invitationId"),
      );
      return { success: true, action: "revokeInvitation", message: "Link de agendamento revogado." };
    } catch (errorValue) {
      return fail(409, {
        success: false,
        action: "revokeInvitation",
        message: schedulingMessage(errorValue),
      });
    }
  },
};
