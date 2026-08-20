import { hasPermission, type PermissionScope } from "$lib/server/auth/permissions";
import {
  getGoogleCalendarConnection,
  getGoogleCalendarEvent,
  listGoogleCalendarEvents,
  type GoogleCalendarEvent,
} from "$lib/server/calendar/googleCalendarRepository";
import {
  getGoogleCalendarSyncPreferences,
  listGoogleCalendarSources,
  refreshGoogleCalendarSources,
} from "$lib/server/calendar/googleCalendarPreferenceRepository";
import {
  applyGoogleEventToTicketDueDate,
  findTicketGoogleCalendarLinkByEvent,
  listUserTicketGoogleCalendarLinks,
  markTicketGoogleSyncConflict,
  syncAssignedTicketsToGoogle,
} from "$lib/server/calendar/ticketGoogleCalendarRepository";
import {
  applyGoogleEventToTask,
  configureTaskGoogleCalendar,
  findTaskGoogleCalendarLinkByEvent,
  linkImportedGoogleEventToTask,
  listUserTaskGoogleCalendarLinks,
  markTaskGoogleSyncConflict,
  removeTaskGoogleCalendarLink,
  syncAllTaskGoogleCalendarLinks,
} from "$lib/server/tasks/taskGoogleCalendarRepository";
import { createTask, listMyTasks } from "$lib/server/tasks/taskRepository";

export type GoogleAgendaEvent = GoogleCalendarEvent & {
  calendarId: string;
  calendarName: string;
};

type PermissionMap = Map<string, PermissionScope>;

type SynchronizeGoogleCalendarInput = {
  userId: string;
  permissions: PermissionMap;
  timeMin: Date;
  timeMax: Date;
};

export type GoogleCalendarSyncResult = {
  events: GoogleAgendaEvent[];
  syncedAt: Date | null;
  warning: string;
};

function eventDueOn(event: GoogleCalendarEvent): string | null {
  return event.startDate ?? event.startDateTime?.slice(0, 10) ?? null;
}

function isGoogleEventNewer(event: GoogleCalendarEvent, googleUpdatedAt: Date | null): boolean {
  if (!event.updatedAt) return googleUpdatedAt === null;
  const incoming = new Date(event.updatedAt);
  return !googleUpdatedAt || incoming.getTime() > googleUpdatedAt.getTime();
}

async function syncTasksToGoogle(
  userId: string,
  permissions: PermissionMap,
  targetCalendarId: string,
  enabled: boolean,
  bidirectional: boolean,
): Promise<void> {
  if (!hasPermission(permissions, "tasks.view")) return;
  const [tasks, links] = await Promise.all([
    listMyTasks(userId, permissions),
    listUserTaskGoogleCalendarLinks(userId),
  ]);
  const assignedIds = new Set(tasks.map((task) => task.id));
  const linksByTask = new Map(links.map((link) => [link.taskId, link]));

  if (!enabled) {
    await Promise.allSettled(
      links
        .filter((link) => link.autoManaged && !link.importedFromGoogle)
        .map((link) => removeTaskGoogleCalendarLink(userId, link.taskId, true)),
    );
    return;
  }

  await Promise.allSettled(
    tasks
      .filter((task) => Boolean(task.dueOn))
      .map(async (task) => {
        const existing = linksByTask.get(task.id);
        if (existing) {
          await syncAllTaskGoogleCalendarLinks(task.id);
          return;
        }
        await configureTaskGoogleCalendar(userId, permissions, task.id, {
          enabled: true,
          allDay: true,
          startTime: "",
          endTime: "",
          timeZone: "UTC",
          calendarId: targetCalendarId,
          syncDirection: bidirectional ? "bidirectional" : "f10_to_google",
          autoManaged: true,
        });
      }),
  );

  await Promise.allSettled(
    links
      .filter((link) => link.autoManaged && !link.importedFromGoogle && !assignedIds.has(link.taskId))
      .map((link) => removeTaskGoogleCalendarLink(userId, link.taskId, true)),
  );
}

async function importOrUpdateGoogleTasks(
  userId: string,
  permissions: PermissionMap,
  source: {
    calendarId: string;
    importMode: "hidden" | "view_only" | "task";
    importProjectId: string | null;
    importAssigneeId: string | null;
  },
  events: GoogleCalendarEvent[],
  syncGoogleChangesToF10: boolean,
): Promise<void> {
  const canCreateTasks = hasPermission(permissions, "tasks.create");
  const canUpdateTasks = hasPermission(permissions, "tasks.update");
  const canUpdateTickets = hasPermission(permissions, "tickets.reply");

  for (const event of events) {
    const [taskLink, ticketLink] = await Promise.all([
      findTaskGoogleCalendarLinkByEvent(userId, source.calendarId, event.id),
      findTicketGoogleCalendarLinkByEvent(userId, source.calendarId, event.id),
    ]);

    if (taskLink) {
      if (
        syncGoogleChangesToF10 &&
        canUpdateTasks &&
        taskLink.syncDirection === "bidirectional" &&
        isGoogleEventNewer(event, taskLink.googleUpdatedAt)
      ) {
        if (taskLink.lastSyncError && taskLink.lastSyncError !== "SYNC_CONFLICT") {
          await markTaskGoogleSyncConflict(userId, taskLink.taskId);
        } else {
          await applyGoogleEventToTask(userId, taskLink.taskId, event);
        }
      }
      continue;
    }

    if (ticketLink) {
      if (
        syncGoogleChangesToF10 &&
        canUpdateTickets &&
        isGoogleEventNewer(event, ticketLink.googleUpdatedAt)
      ) {
        if (ticketLink.lastSyncError && ticketLink.lastSyncError !== "SYNC_CONFLICT") {
          await markTicketGoogleSyncConflict(userId, ticketLink.ticketId);
        } else {
          await applyGoogleEventToTicketDueDate(userId, ticketLink.ticketId, event);
        }
      }
      continue;
    }

    if (source.importMode !== "task" || !source.importProjectId || !canCreateTasks) continue;
    const dueOn = eventDueOn(event);
    if (!dueOn) continue;

    try {
      const task = await createTask(userId, permissions, {
        projectId: source.importProjectId,
        title: event.summary.slice(0, 180),
        description: event.description.slice(0, 5000),
        priority: "normal",
        dueOn,
        assigneeId: source.importAssigneeId,
      });
      await linkImportedGoogleEventToTask(userId, task.id, source.calendarId, event);
    } catch {
      // Um evento inválido ou um projeto sem acesso não deve interromper os demais calendários.
    }
  }
}

async function unlinkDeletedImportedGoogleEvents(
  userId: string,
  fetchedEvents: Map<string, Set<string>>,
): Promise<void> {
  const links = await listUserTaskGoogleCalendarLinks(userId);
  await Promise.allSettled(
    links
      .filter((link) => link.importedFromGoogle)
      .map(async (link) => {
        const fetched = fetchedEvents.get(link.googleCalendarId);
        if (!fetched || fetched.has(link.googleEventId)) return;
        const event = await getGoogleCalendarEvent(userId, link.googleCalendarId, link.googleEventId);
        if (!event) await removeTaskGoogleCalendarLink(userId, link.taskId, false);
      }),
  );
}

export async function synchronizeGoogleCalendar(
  input: SynchronizeGoogleCalendarInput,
): Promise<GoogleCalendarSyncResult> {
  const connection = await getGoogleCalendarConnection(input.userId);
  if (!connection.connected) return { events: [], syncedAt: null, warning: "" };
  if (!connection.scopesReady) {
    return {
      events: [],
      syncedAt: null,
      warning: "Reconecte o Google Calendar para liberar calendários compartilhados e sincronização completa.",
    };
  }

  try {
    await refreshGoogleCalendarSources(input.userId);
    const [preferences, sources] = await Promise.all([
      getGoogleCalendarSyncPreferences(input.userId),
      listGoogleCalendarSources(input.userId),
    ]);

    const target = sources.find((source) => source.calendarId === preferences.targetCalendarId);
    const targetCalendarId = target && ["writer", "owner"].includes(target.accessRole)
      ? target.calendarId
      : sources.find((source) => source.isPrimary)?.calendarId ?? "primary";

    await Promise.all([
      syncTasksToGoogle(
        input.userId,
        input.permissions,
        targetCalendarId,
        preferences.syncTasksToGoogle,
        preferences.syncGoogleChangesToF10,
      ),
      preferences.syncTicketsToGoogle && hasPermission(input.permissions, "tickets.view")
        ? syncAssignedTicketsToGoogle(input.userId, targetCalendarId)
        : Promise.resolve(),
    ]);

    const relevantSources = sources.filter(
      (source) =>
        source.visibleInF10 ||
        source.importMode === "task" ||
        source.calendarId === targetCalendarId,
    );
    const fetchedEventsByCalendar = new Map<string, Set<string>>();
    const visibleEvents: GoogleAgendaEvent[] = [];

    for (const source of relevantSources) {
      let events: GoogleCalendarEvent[] = [];
      try {
        events = await listGoogleCalendarEvents(
          input.userId,
          input.timeMin,
          input.timeMax,
          source.calendarId,
        );
      } catch {
        continue;
      }
      fetchedEventsByCalendar.set(source.calendarId, new Set(events.map((event) => event.id)));

      await importOrUpdateGoogleTasks(
        input.userId,
        input.permissions,
        source,
        events,
        preferences.syncGoogleChangesToF10,
      );

      if (source.visibleInF10) {
        visibleEvents.push(
          ...events.map((event) => ({
            ...event,
            calendarId: source.calendarId,
            calendarName: source.calendarName,
          })),
        );
      }
    }

    await unlinkDeletedImportedGoogleEvents(input.userId, fetchedEventsByCalendar);

    const [taskLinks, ticketLinks] = await Promise.all([
      listUserTaskGoogleCalendarLinks(input.userId),
      listUserTicketGoogleCalendarLinks(input.userId),
    ]);
    const linkedGoogleKeys = new Set([
      ...taskLinks.map((link) => `${link.googleCalendarId}:${link.googleEventId}`),
      ...ticketLinks.map((link) => `${link.googleCalendarId}:${link.googleEventId}`),
    ]);

    return {
      events: visibleEvents
        .filter((event) => !linkedGoogleKeys.has(`${event.calendarId}:${event.id}`))
        .sort((left, right) => {
          const leftStart = left.startDateTime ?? left.startDate ?? "";
          const rightStart = right.startDateTime ?? right.startDate ?? "";
          return leftStart.localeCompare(rightStart);
        }),
      syncedAt: new Date(),
      warning: "",
    };
  } catch {
    return {
      events: [],
      syncedAt: null,
      warning: "Não foi possível concluir a sincronização com o Google Calendar agora.",
    };
  }
}
