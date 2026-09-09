import { error, fail, type Actions } from "@sveltejs/kit";
import type { PageServerLoad } from "./$types";
import { requireAppPermission } from "$lib/server/auth/authorization";
import { getPermissionScope, hasPermission } from "$lib/server/auth/permissions";
import { listSchedulingHosts, listSchedulingTeamUserIds } from "$lib/server/calendar/schedulingRepository";
import {
  addSchedulingException,
  configureBlockingCalendars,
  configurePersonalScheduling,
  getPersonalSchedulingSettings,
  removeSchedulingException,
  togglePersonalScheduling,
} from "$lib/server/calendar/personalSchedulingService";
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

function readBoolean(formData: FormData, name: string): boolean {
  return readValue(formData, name) === "true";
}

function readWindows(formData: FormData) {
  const weekdays = formData.getAll("windowWeekday");
  const starts = formData.getAll("windowStart");
  const ends = formData.getAll("windowEnd");
  const windows: Array<{
    weekday: SchedulingWeekday;
    startTime: string;
    endTime: string;
  }> = [];

  for (let index = 0; index < Math.min(weekdays.length, starts.length, ends.length); index += 1) {
    const weekday = Number(weekdays[index]);
    const startTime = typeof starts[index] === "string" ? starts[index].trim() : "";
    const endTime = typeof ends[index] === "string" ? ends[index].trim() : "";
    if (!Number.isInteger(weekday) || weekday < 0 || weekday > 6 || !startTime || !endTime) continue;
    windows.push({
      weekday: weekday as SchedulingWeekday,
      startTime,
      endTime,
    });
  }
  return windows;
}

function schedulingMessage(errorValue: unknown): string {
  const code = errorValue instanceof Error ? errorValue.message : "";
  const messages: Record<string, string> = {
    SCHEDULING_HOST_NOT_ALLOWED: "Acesso não autorizado.",
    SCHEDULING_HOST_NOT_FOUND: "Usuário inválido ou inativo.",
    SCHEDULING_INVALID_TIME_ZONE: "Fuso horário inválido.",
    SCHEDULING_INVALID_WINDOWS: "Revise os horários de disponibilidade.",
    SCHEDULING_INVALID_SLOT_STEP: "Intervalo entre horários inválido.",
    SCHEDULING_INVALID_MINIMUM_NOTICE: "Antecedência mínima inválida.",
    SCHEDULING_INVALID_BUFFER: "Intervalo de proteção inválido.",
    SCHEDULING_INVALID_HORIZON: "Horizonte de agenda inválido.",
    SCHEDULING_INVALID_DURATION: "Duração padrão inválida.",
    SCHEDULING_INVALID_TITLE: "Título da agenda inválido.",
    SCHEDULING_INVALID_DESCRIPTION: "Descrição muito longa.",
    SCHEDULING_INVALID_EXCEPTION_DATE: "Data da exceção inválida.",
    SCHEDULING_INVALID_EXCEPTION_TIME: "Horário da exceção inválido.",
    SCHEDULING_EXCEPTION_NOT_FOUND: "Exceção não encontrada.",
    SCHEDULING_HOST_GOOGLE_REQUIRED: "Conecte o Google Calendar antes de ativar a agenda.",
  };
  return messages[code] ?? "Não foi possível salvar a agenda.";
}

export const load: PageServerLoad = async ({ parent, url }) => {
  const layout = await parent();
  const permissions = permissionMap(layout.permissions);
  if (!hasPermission(permissions, "scheduling.view")) throw error(403, "Acesso não autorizado.");

  const createScope = getPermissionScope(permissions, "scheduling.create");
  const canManage = hasPermission(permissions, "scheduling.manage");
  const teamUserIds = createScope === "team"
    ? await listSchedulingTeamUserIds(layout.user.id)
    : [layout.user.id];
  const rawHosts = await listSchedulingHosts();

  const hosts = rawHosts
    .filter((host) =>
      host.id === layout.user.id ||
      canManage ||
      createScope === "all" ||
      (createScope === "team" && teamUserIds.includes(host.id))
    )
    .map((host) => ({
      id: host.id,
      name: host.name,
      email: host.email,
      googleConnected: Boolean(host.googleConnectedUserId),
    }));

  const requestedUserId = url.searchParams.get("user") ?? "";
  const selectedHost = hosts.find((host) => host.id === requestedUserId)
    ?? hosts.find((host) => host.id === layout.user.id)
    ?? hosts[0];
  if (!selectedHost) throw error(404, "Nenhum usuário disponível.");

  const settings = await getPersonalSchedulingSettings(selectedHost.id);

  return {
    currentUserId: layout.user.id,
    selectedUserId: selectedHost.id,
    canChooseHost: hosts.length > 1,
    hosts,
    googleConnected: settings.googleConnected,
    publicPath: settings.profile.publicSlug ? `/agendar/${settings.profile.publicSlug}` : "",
    profile: {
      timeZone: settings.profile.timeZone,
      slotStepMinutes: settings.profile.slotStepMinutes,
      minimumNoticeMinutes: settings.profile.minimumNoticeMinutes,
      bufferBeforeMinutes: settings.profile.bufferBeforeMinutes,
      bufferAfterMinutes: settings.profile.bufferAfterMinutes,
      maxHorizonDays: settings.profile.maxHorizonDays,
      defaultDurationMinutes: settings.profile.defaultDurationMinutes,
      publicEnabled: settings.profile.publicEnabled,
      publicTitle: settings.profile.publicTitle,
      publicDescription: settings.profile.publicDescription,
      addGoogleMeet: settings.profile.addGoogleMeet,
    },
    windows: settings.windows.map((window) => ({
      id: window.id,
      weekday: window.weekday,
      startTime: window.startTime,
      endTime: window.endTime,
    })),
    exceptions: settings.exceptions.map((exception) => ({
      id: exception.id,
      exceptionDate: exception.exceptionDate,
      available: exception.available,
      startTime: exception.startTime,
      endTime: exception.endTime,
    })),
    sources: settings.sources,
    bookings: settings.bookings.map((booking) => ({
      id: booking.id,
      customerName: booking.customerName,
      notes: booking.notes,
      startAt: booking.startAt,
      endAt: booking.endAt,
      status: booking.status,
      googleMeetUrl: booking.googleMeetUrl,
    })),
  };
};

export const actions: Actions = {
  togglePublic: async ({ cookies, request }) => {
    const { session, permissions } = await requireAppPermission(
      cookies,
      "scheduling.view",
      "/app/tasks/calendar/scheduling",
    );
    const formData = await request.formData();
    const userId = readValue(formData, "userId");
    const publicEnabled = readBoolean(formData, "publicEnabled");

    try {
      await togglePersonalScheduling(
        session.user.id,
        permissions,
        userId,
        publicEnabled,
      );
      return {
        success: true,
        action: "togglePublic",
        message: publicEnabled ? "Agenda ativada." : "Agenda desativada.",
      };
    } catch (errorValue) {
      return fail(400, {
        success: false,
        action: "togglePublic",
        message: schedulingMessage(errorValue),
      });
    }
  },

  saveProfile: async ({ cookies, request }) => {
    const { session, permissions } = await requireAppPermission(
      cookies,
      "scheduling.view",
      "/app/tasks/calendar/scheduling",
    );
    const formData = await request.formData();
    const userId = readValue(formData, "userId");

    try {
      await configurePersonalScheduling(session.user.id, permissions, userId, {
        timeZone: readValue(formData, "timeZone"),
        slotStepMinutes: readInteger(formData, "slotStepMinutes"),
        minimumNoticeMinutes: readInteger(formData, "minimumNoticeMinutes"),
        bufferBeforeMinutes: readInteger(formData, "bufferBeforeMinutes"),
        bufferAfterMinutes: readInteger(formData, "bufferAfterMinutes"),
        maxHorizonDays: readInteger(formData, "maxHorizonDays"),
        defaultDurationMinutes: readInteger(formData, "defaultDurationMinutes"),
        publicEnabled: readBoolean(formData, "publicEnabled"),
        publicTitle: readValue(formData, "publicTitle"),
        publicDescription: readValue(formData, "publicDescription"),
        addGoogleMeet: readBoolean(formData, "addGoogleMeet"),
        windows: readWindows(formData),
      });
      return { success: true, action: "saveProfile", message: "Agenda salva." };
    } catch (errorValue) {
      return fail(400, {
        success: false,
        action: "saveProfile",
        message: schedulingMessage(errorValue),
      });
    }
  },

  addException: async ({ cookies, request }) => {
    const { session, permissions } = await requireAppPermission(
      cookies,
      "scheduling.view",
      "/app/tasks/calendar/scheduling",
    );
    const formData = await request.formData();
    const userId = readValue(formData, "userId");
    try {
      await addSchedulingException(session.user.id, permissions, userId, {
        exceptionDate: readValue(formData, "exceptionDate"),
        available: readBoolean(formData, "available"),
        startTime: readValue(formData, "startTime"),
        endTime: readValue(formData, "endTime"),
      });
      return { success: true, action: "addException", message: "Exceção adicionada." };
    } catch (errorValue) {
      return fail(400, {
        success: false,
        action: "addException",
        message: schedulingMessage(errorValue),
      });
    }
  },

  deleteException: async ({ cookies, request }) => {
    const { session, permissions } = await requireAppPermission(
      cookies,
      "scheduling.view",
      "/app/tasks/calendar/scheduling",
    );
    const formData = await request.formData();
    try {
      await removeSchedulingException(
        session.user.id,
        permissions,
        readValue(formData, "userId"),
        readValue(formData, "exceptionId"),
      );
      return { success: true, action: "deleteException", message: "Exceção removida." };
    } catch (errorValue) {
      return fail(404, {
        success: false,
        action: "deleteException",
        message: schedulingMessage(errorValue),
      });
    }
  },

  saveBlockingCalendars: async ({ cookies, request }) => {
    const { session, permissions } = await requireAppPermission(
      cookies,
      "scheduling.view",
      "/app/tasks/calendar/scheduling",
    );
    const formData = await request.formData();
    try {
      await configureBlockingCalendars(
        session.user.id,
        permissions,
        readValue(formData, "userId"),
        formData.getAll("calendarId").filter((value): value is string => typeof value === "string"),
      );
      return { success: true, action: "saveBlockingCalendars", message: "Calendários atualizados." };
    } catch (errorValue) {
      return fail(400, {
        success: false,
        action: "saveBlockingCalendars",
        message: schedulingMessage(errorValue),
      });
    }
  },
};
