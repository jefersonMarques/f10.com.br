import {
  getPermissionScope,
  hasPermission,
  type PermissionScope,
} from "$lib/server/auth/permissions";
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
import { clearAutoManagedTicketGoogleCalendarLinks } from "$lib/server/calendar/ticketGoogleCalendarLifecycle";
import {
  applyGoogleEventToTicketDueDate,
  hasTicketGoogleCalendarFieldsChangedSince,
  listUserTicketGoogleCalendarLinks,
  markTicketGoogleSyncConflict,
  syncAssignedTicketsToGoogle,
  syncTicketGoogleCalendarLink,
} from "$lib/server/calendar/ticketGoogleCalendarRepository";
import { requireTicketAccess } from "$lib/server/support/supportAccess";
import {
  ensureTaskAccess,
} from "$lib/server/tasks/taskAccess";
import {
  applyGoogleEventToTask,
  configureTaskGoogleCalendar,
  hasTaskGoogleCalendarFieldsChangedSince,
  linkImportedGoogleEventToTask,
  listUserTaskGoogleCalendarLinks,
  markTaskGoogleSyncConflict,
  removeTaskGoogleCalendarLink,
  setTaskGoogleCalendarSyncDirection,
} from "$lib/server/tasks/taskGoogleCalendarRepository";
import { createTask, listMyTasks } from "$lib/server/tasks/taskRepository";

export type GoogleAgendaEvent = GoogleCalendarEvent & {
  calendarId: string;
  calendarName: string;
};

type PermissionMap = Map<string, PermissionScope>;
type TaskGoogleLink = Awaited<ReturnType<typeof listUserTaskGoogleCalendarLinks>>[number];
type TicketGoogleLink = Awaited<ReturnType<typeof listUserTicketGoogleCalendarLinks>>[number];
type GoogleCalendarSource = Awaited<ReturnType<typeof listGoogleCalendarSources>>[number];

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

type CalendarFetch = {
  source: GoogleCalendarSource;
  events: GoogleCalendarEvent[];
};

type LinkedEventHydrationResult = {
  fetched: CalendarFetch[];
  missingEventKeys: Set<string>;
};

function eventDueOn(event: GoogleCalendarEvent): string | null {
  return event.startDate ?? event.startDateTime?.slice(0, 10) ?? null;
}

function googleEventChanged(
  event: GoogleCalendarEvent,
  googleUpdatedAt: Date | null,
  lastSyncedAt: Date | null,
): boolean {
  if (!event.updatedAt) return googleUpdatedAt === null && lastSyncedAt === null;
  const incoming = new Date(event.updatedAt).getTime();
  if (!Number.isFinite(incoming)) return false;
  const baseline = googleUpdatedAt ?? lastSyncedAt;
  return !baseline || incoming > baseline.getTime();
}

function canonicalCalendarId(calendarId: string, primaryCalendarId: string): string {
  return calendarId === "primary" ? primaryCalendarId : calendarId;
}

function eventKey(calendarId: string, eventId: string, primaryCalendarId: string): string {
  return `${canonicalCalendarId(calendarId, primaryCalendarId)}:${eventId}`;
}

function resolveTargetCalendarId(
  preferences: Awaited<ReturnType<typeof getGoogleCalendarSyncPreferences>>,
  sources: GoogleCalendarSource[],
): string {
  const configured = sources.find((source) => source.calendarId === preferences.targetCalendarId);
  if (configured && ["writer", "owner"].includes(configured.accessRole)) return configured.calendarId;
  return sources.find((source) => source.isPrimary)?.calendarId ?? "primary";
}

function relevantSources(
  sources: GoogleCalendarSource[],
  targetCalendarId: string,
  taskLinks: TaskGoogleLink[],
  ticketLinks: TicketGoogleLink[],
): GoogleCalendarSource[] {
  const primary = sources.find((source) => source.isPrimary) ?? null;
  const relevantIds = new Set<string>([
    targetCalendarId,
    ...taskLinks.map((link) => canonicalCalendarId(link.googleCalendarId, primary?.calendarId ?? "primary")),
    ...ticketLinks.map((link) => canonicalCalendarId(link.googleCalendarId, primary?.calendarId ?? "primary")),
  ]);

  return sources.filter(
    (source) =>
      source.visibleInF10 ||
      source.importMode === "task" ||
      relevantIds.has(source.calendarId),
  );
}

async function fetchGoogleSources(
  userId: string,
  sources: GoogleCalendarSource[],
  timeMin: Date,
  timeMax: Date,
): Promise<CalendarFetch[]> {
  const results = await Promise.allSettled(
    sources.map(async (source) => ({
      source,
      events: await listGoogleCalendarEvents(userId, timeMin, timeMax, source.calendarId),
    })),
  );

  return results.flatMap((result) => result.status === "fulfilled" ? [result.value] : []);
}

async function hydrateLinkedGoogleEvents(
  userId: string,
  sources: GoogleCalendarSource[],
  fetched: CalendarFetch[],
  taskLinks: TaskGoogleLink[],
  ticketLinks: TicketGoogleLink[],
  primaryCalendarId: string,
): Promise<LinkedEventHydrationResult> {
  const fetchedByCalendar = new Map(
    fetched.map((calendar) => [
      canonicalCalendarId(calendar.source.calendarId, primaryCalendarId),
      calendar,
    ]),
  );
  const hydrated = sources.map((source) => ({
    source,
    events: [
      ...(fetchedByCalendar.get(canonicalCalendarId(source.calendarId, primaryCalendarId))?.events ?? []),
    ],
  }));
  const hydratedByCalendar = new Map(
    hydrated.map((calendar) => [
      canonicalCalendarId(calendar.source.calendarId, primaryCalendarId),
      calendar,
    ]),
  );
  const existingKeys = new Set(
    hydrated.flatMap((calendar) =>
      calendar.events.map((event) => eventKey(calendar.source.calendarId, event.id, primaryCalendarId)),
    ),
  );
  const linkedEvents = new Map<string, { calendarId: string; eventId: string }>();

  for (const link of [...taskLinks, ...ticketLinks]) {
    if (link.googleEventId.startsWith("pending:")) continue;
    const key = eventKey(link.googleCalendarId, link.googleEventId, primaryCalendarId);
    if (existingKeys.has(key)) continue;
    const calendarKey = canonicalCalendarId(link.googleCalendarId, primaryCalendarId);
    if (!hydratedByCalendar.has(calendarKey)) continue;
    linkedEvents.set(key, {
      calendarId: link.googleCalendarId,
      eventId: link.googleEventId,
    });
  }

  const results = await Promise.allSettled(
    Array.from(linkedEvents.entries()).map(async ([key, link]) => ({
      key,
      calendarKey: canonicalCalendarId(link.calendarId, primaryCalendarId),
      event: await getGoogleCalendarEvent(userId, link.calendarId, link.eventId),
    })),
  );
  const missingEventKeys = new Set<string>();

  for (const result of results) {
    if (result.status !== "fulfilled") continue;
    const calendar = hydratedByCalendar.get(result.value.calendarKey);
    if (!calendar) continue;
    if (!result.value.event) {
      missingEventKeys.add(result.value.key);
      continue;
    }
    calendar.events.push(result.value.event);
  }

  return { fetched: hydrated, missingEventKeys };
}

async function canUpdateTaskFromGoogle(
  userId: string,
  permissions: PermissionMap,
  taskId: string,
): Promise<boolean> {
  const scope = getPermissionScope(permissions, "tasks.update");
  if (!scope) return false;
  try {
    await ensureTaskAccess(userId, scope, taskId);
    return true;
  } catch {
    return false;
  }
}

async function canUpdateTicketFromGoogle(
  userId: string,
  permissions: PermissionMap,
  ticketId: string,
): Promise<boolean> {
  const scope = getPermissionScope(permissions, "tickets.reply");
  if (!scope) return false;
  try {
    await requireTicketAccess(userId, scope, ticketId);
    return true;
  } catch {
    return false;
  }
}

async function reconcileGoogleEvents(
  userId: string,
  permissions: PermissionMap,
  fetched: CalendarFetch[],
  taskLinks: TaskGoogleLink[],
  ticketLinks: TicketGoogleLink[],
  syncGoogleChangesToF10: boolean,
  syncTicketsToGoogle: boolean,
  primaryCalendarId: string,
): Promise<void> {
  const canCreateTasks = hasPermission(permissions, "tasks.create");
  const taskLinksByEvent = new Map(
    taskLinks.map((link) => [eventKey(link.googleCalendarId, link.googleEventId, primaryCalendarId), link]),
  );
  const ticketLinksByEvent = new Map(
    ticketLinks.map((link) => [eventKey(link.googleCalendarId, link.googleEventId, primaryCalendarId), link]),
  );

  for (const calendar of fetched) {
    for (const event of calendar.events) {
      const key = eventKey(calendar.source.calendarId, event.id, primaryCalendarId);
      const taskLink = taskLinksByEvent.get(key);
      if (taskLink) {
        if (taskLink.lastSyncError === "SYNC_CONFLICT") continue;

        const importedFromGoogle = taskLink.importedFromGoogle;
        if (importedFromGoogle && calendar.source.importMode !== "task") {
          await removeTaskGoogleCalendarLink(userId, taskLink.taskId, false);
          taskLinksByEvent.delete(key);
          continue;
        }

        const desiredDirection = importedFromGoogle
          ? (syncGoogleChangesToF10 ? "bidirectional" : "google_to_f10")
          : (syncGoogleChangesToF10 ? "bidirectional" : "f10_to_google");
        if (taskLink.syncDirection !== desiredDirection) {
          await setTaskGoogleCalendarSyncDirection(userId, taskLink.taskId, desiredDirection);
          taskLink.syncDirection = desiredDirection;
        }

        const remoteAllowed = importedFromGoogle ||
          (syncGoogleChangesToF10 && taskLink.syncDirection === "bidirectional");
        if (
          remoteAllowed &&
          googleEventChanged(event, taskLink.googleUpdatedAt, taskLink.lastSyncedAt) &&
          await canUpdateTaskFromGoogle(userId, permissions, taskLink.taskId)
        ) {
          const localChanged = taskLink.syncDirection === "bidirectional" &&
            await hasTaskGoogleCalendarFieldsChangedSince(taskLink.taskId, taskLink.lastSyncedAt);
          if (localChanged) {
            await markTaskGoogleSyncConflict(userId, taskLink.taskId);
            taskLink.lastSyncError = "SYNC_CONFLICT";
          } else {
            await applyGoogleEventToTask(userId, taskLink.taskId, event);
            taskLink.googleUpdatedAt = event.updatedAt ? new Date(event.updatedAt) : null;
            taskLink.lastSyncedAt = new Date();
            taskLink.lastSyncError = null;
          }
        }
        continue;
      }

      const ticketLink = ticketLinksByEvent.get(key);
      if (ticketLink) {
        if (
          ticketLink.lastSyncError !== "SYNC_CONFLICT" &&
          syncTicketsToGoogle &&
          syncGoogleChangesToF10 &&
          googleEventChanged(event, ticketLink.googleUpdatedAt, ticketLink.lastSyncedAt) &&
          await canUpdateTicketFromGoogle(userId, permissions, ticketLink.ticketId)
        ) {
          const localChanged = await hasTicketGoogleCalendarFieldsChangedSince(
            ticketLink.ticketId,
            ticketLink.lastSyncedAt,
          );
          if (localChanged) {
            await markTicketGoogleSyncConflict(userId, ticketLink.ticketId);
            ticketLink.lastSyncError = "SYNC_CONFLICT";
          } else {
            await applyGoogleEventToTicketDueDate(userId, ticketLink.ticketId, event);
            ticketLink.googleUpdatedAt = event.updatedAt ? new Date(event.updatedAt) : null;
            ticketLink.lastSyncedAt = new Date();
            ticketLink.lastSyncError = null;
          }
        }
        continue;
      }

      if (
        calendar.source.importMode !== "task" ||
        !calendar.source.importProjectId ||
        !canCreateTasks
      ) {
        continue;
      }

      const dueOn = eventDueOn(event);
      if (!dueOn) continue;

      try {
        const task = await createTask(userId, permissions, {
          projectId: calendar.source.importProjectId,
          title: event.summary.slice(0, 180),
          description: event.description.slice(0, 5000),
          priority: "normal",
          dueOn,
          assigneeId: calendar.source.importAssigneeId,
        });
        await linkImportedGoogleEventToTask(
          userId,
          task.id,
          calendar.source.calendarId,
          event,
          syncGoogleChangesToF10 ? "bidirectional" : "google_to_f10",
        );
      } catch {
        // Um evento inválido ou um projeto sem acesso não deve interromper os demais calendários.
      }
    }
  }
}

async function unlinkDeletedImportedGoogleEvents(
  userId: string,
  taskLinks: TaskGoogleLink[],
  fetchedEvents: Map<string, Set<string>>,
  primaryCalendarId: string,
): Promise<void> {
  await Promise.allSettled(
    taskLinks
      .filter((link) => link.importedFromGoogle)
      .map(async (link) => {
        const calendarKey = canonicalCalendarId(link.googleCalendarId, primaryCalendarId);
        const fetched = fetchedEvents.get(calendarKey);
        if (!fetched || fetched.has(link.googleEventId)) return;
        const event = await getGoogleCalendarEvent(userId, link.googleCalendarId, link.googleEventId);
        if (!event) await removeTaskGoogleCalendarLink(userId, link.taskId, false);
      }),
  );
}

async function syncTaskLinkToGoogle(
  userId: string,
  permissions: PermissionMap,
  link: TaskGoogleLink,
): Promise<void> {
  if (link.syncDirection === "google_to_f10" || link.lastSyncError === "SYNC_CONFLICT") return;

  try {
    await configureTaskGoogleCalendar(userId, permissions, link.taskId, {
      enabled: true,
      allDay: link.allDay,
      startTime: link.startTime ?? "",
      endTime: link.endTime ?? "",
      timeZone: link.timeZone,
      syncDirection: link.syncDirection,
      autoManaged: link.autoManaged,
    });
  } catch (cause) {
    if (
      cause instanceof Error &&
      cause.message === "TASK_GOOGLE_REQUIRES_DUE_DATE" &&
      !link.importedFromGoogle
    ) {
      await removeTaskGoogleCalendarLink(userId, link.taskId, true);
      return;
    }
    throw cause;
  }
}

async function publishTasksToGoogle(
  userId: string,
  permissions: PermissionMap,
  targetCalendarId: string,
  primaryCalendarId: string,
  syncTasksToGoogle: boolean,
  syncGoogleChangesToF10: boolean,
  missingEventKeys: Set<string>,
): Promise<void> {
  if (!hasPermission(permissions, "tasks.view")) return;

  const [assignedTasks, links] = await Promise.all([
    listMyTasks(userId, permissions),
    listUserTaskGoogleCalendarLinks(userId),
  ]);
  const assignedIds = new Set(assignedTasks.map((task) => task.id));
  const linksByTask = new Map(links.map((link) => [link.taskId, link]));

  if (!syncTasksToGoogle) {
    await Promise.allSettled(
      links
        .filter((link) => link.autoManaged && !link.importedFromGoogle)
        .map((link) => removeTaskGoogleCalendarLink(userId, link.taskId, true)),
    );
  } else {
    await Promise.allSettled(
      assignedTasks.map(async (task) => {
        const existing = linksByTask.get(task.id);
        if (!existing) {
          if (!task.dueOn) return;
          await configureTaskGoogleCalendar(userId, permissions, task.id, {
            enabled: true,
            allDay: true,
            startTime: "",
            endTime: "",
            timeZone: "UTC",
            calendarId: targetCalendarId,
            syncDirection: syncGoogleChangesToF10 ? "bidirectional" : "f10_to_google",
            autoManaged: true,
          });
          return;
        }

        if (existing.importedFromGoogle) return;
        const desiredDirection = syncGoogleChangesToF10 ? "bidirectional" : "f10_to_google";
        if (existing.syncDirection !== desiredDirection) {
          await setTaskGoogleCalendarSyncDirection(userId, task.id, desiredDirection);
          existing.syncDirection = desiredDirection;
        }
        if (existing.lastSyncError === "SYNC_CONFLICT") return;

        const targetChanged = existing.autoManaged &&
          canonicalCalendarId(existing.googleCalendarId, primaryCalendarId) !==
            canonicalCalendarId(targetCalendarId, primaryCalendarId);
        if (targetChanged) {
          await removeTaskGoogleCalendarLink(userId, task.id, true);
          if (!task.dueOn) return;
          await configureTaskGoogleCalendar(userId, permissions, task.id, {
            enabled: true,
            allDay: true,
            startTime: "",
            endTime: "",
            timeZone: "UTC",
            calendarId: targetCalendarId,
            syncDirection: desiredDirection,
            autoManaged: true,
          });
          return;
        }

        const remoteMissing = missingEventKeys.has(
          eventKey(existing.googleCalendarId, existing.googleEventId, primaryCalendarId),
        );
        const changed = remoteMissing ||
          Boolean(existing.lastSyncError) ||
          await hasTaskGoogleCalendarFieldsChangedSince(task.id, existing.lastSyncedAt);
        if (changed) await syncTaskLinkToGoogle(userId, permissions, existing);
      }),
    );

    await Promise.allSettled(
      links
        .filter(
          (link) =>
            link.autoManaged &&
            !link.importedFromGoogle &&
            !assignedIds.has(link.taskId),
        )
        .map((link) => removeTaskGoogleCalendarLink(userId, link.taskId, true)),
    );
  }

  const importedLinks = links.filter((link) => link.importedFromGoogle);
  await Promise.allSettled(
    importedLinks.map(async (link) => {
      if (link.lastSyncError === "SYNC_CONFLICT") return;
      const desiredDirection = syncGoogleChangesToF10 ? "bidirectional" : "google_to_f10";
      if (link.syncDirection !== desiredDirection) {
        await setTaskGoogleCalendarSyncDirection(userId, link.taskId, desiredDirection);
        link.syncDirection = desiredDirection;
      }
      if (desiredDirection !== "bidirectional") return;
      if (await hasTaskGoogleCalendarFieldsChangedSince(link.taskId, link.lastSyncedAt)) {
        await syncTaskLinkToGoogle(userId, permissions, link);
      }
    }),
  );

  const manualLinks = links.filter((link) => !link.autoManaged && !link.importedFromGoogle);
  await Promise.allSettled(
    manualLinks.map(async (link) => {
      if (link.lastSyncError === "SYNC_CONFLICT") return;
      const desiredDirection = syncGoogleChangesToF10 ? "bidirectional" : "f10_to_google";
      if (link.syncDirection !== desiredDirection) {
        await setTaskGoogleCalendarSyncDirection(userId, link.taskId, desiredDirection);
        link.syncDirection = desiredDirection;
      }
      const remoteMissing = missingEventKeys.has(
        eventKey(link.googleCalendarId, link.googleEventId, primaryCalendarId),
      );
      if (
        remoteMissing ||
        await hasTaskGoogleCalendarFieldsChangedSince(link.taskId, link.lastSyncedAt)
      ) {
        await syncTaskLinkToGoogle(userId, permissions, link);
      }
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
    const [preferences, sources, initialTaskLinks, initialTicketLinks] = await Promise.all([
      getGoogleCalendarSyncPreferences(input.userId),
      listGoogleCalendarSources(input.userId),
      listUserTaskGoogleCalendarLinks(input.userId),
      listUserTicketGoogleCalendarLinks(input.userId),
    ]);

    const primaryCalendarId = sources.find((source) => source.isPrimary)?.calendarId ?? "primary";
    const targetCalendarId = resolveTargetCalendarId(preferences, sources);
    const fetchSources = relevantSources(
      sources,
      targetCalendarId,
      initialTaskLinks,
      initialTicketLinks,
    );
    const fetched = await fetchGoogleSources(
      input.userId,
      fetchSources,
      input.timeMin,
      input.timeMax,
    );
    const hydration = await hydrateLinkedGoogleEvents(
      input.userId,
      fetchSources,
      fetched,
      initialTaskLinks,
      initialTicketLinks,
      primaryCalendarId,
    );

    await reconcileGoogleEvents(
      input.userId,
      input.permissions,
      hydration.fetched,
      initialTaskLinks,
      initialTicketLinks,
      preferences.syncGoogleChangesToF10,
      preferences.syncTicketsToGoogle,
      primaryCalendarId,
    );

    const fetchedEventsByCalendar = new Map(
      hydration.fetched.map((calendar) => [
        canonicalCalendarId(calendar.source.calendarId, primaryCalendarId),
        new Set(calendar.events.map((event) => event.id)),
      ]),
    );
    await unlinkDeletedImportedGoogleEvents(
      input.userId,
      initialTaskLinks,
      fetchedEventsByCalendar,
      primaryCalendarId,
    );

    await publishTasksToGoogle(
      input.userId,
      input.permissions,
      targetCalendarId,
      primaryCalendarId,
      preferences.syncTasksToGoogle,
      preferences.syncGoogleChangesToF10,
      hydration.missingEventKeys,
    );

    if (preferences.syncTicketsToGoogle && hasPermission(input.permissions, "tickets.view")) {
      await Promise.allSettled(
        initialTicketLinks
          .filter(
            (link) =>
              !link.googleEventId.startsWith("pending:") &&
              canonicalCalendarId(link.googleCalendarId, primaryCalendarId) ===
                canonicalCalendarId(targetCalendarId, primaryCalendarId) &&
              hydration.missingEventKeys.has(
                eventKey(link.googleCalendarId, link.googleEventId, primaryCalendarId),
              ),
          )
          .map((link) => syncTicketGoogleCalendarLink(input.userId, link.ticketId)),
      );
      await syncAssignedTicketsToGoogle(input.userId, targetCalendarId);
    } else {
      await clearAutoManagedTicketGoogleCalendarLinks(input.userId);
    }

    const [taskLinks, ticketLinks] = await Promise.all([
      listUserTaskGoogleCalendarLinks(input.userId),
      listUserTicketGoogleCalendarLinks(input.userId),
    ]);
    const linkedGoogleKeys = new Set([
      ...taskLinks.map((link) => eventKey(link.googleCalendarId, link.googleEventId, primaryCalendarId)),
      ...ticketLinks.map((link) => eventKey(link.googleCalendarId, link.googleEventId, primaryCalendarId)),
    ]);
    const conflicts = [
      ...taskLinks.filter((link) => link.lastSyncError === "SYNC_CONFLICT"),
      ...ticketLinks.filter((link) => link.lastSyncError === "SYNC_CONFLICT"),
    ].length;

    const visibleEvents = fetched.flatMap((calendar) =>
      calendar.source.visibleInF10
        ? calendar.events.map((event) => ({
            ...event,
            calendarId: calendar.source.calendarId,
            calendarName: calendar.source.calendarName,
          }))
        : [],
    );

    return {
      events: visibleEvents
        .filter(
          (event) =>
            !linkedGoogleKeys.has(eventKey(event.calendarId, event.id, primaryCalendarId)),
        )
        .sort((left, right) => {
          const leftStart = left.startDateTime ?? left.startDate ?? "";
          const rightStart = right.startDateTime ?? right.startDate ?? "";
          return leftStart.localeCompare(rightStart);
        }),
      syncedAt: new Date(),
      warning: conflicts > 0
        ? `${conflicts} conflito(s) de sincronização precisam de revisão em Minha conta > Google Calendar.`
        : "",
    };
  } catch {
    return {
      events: [],
      syncedAt: null,
      warning: "Não foi possível concluir a sincronização com o Google Calendar agora.",
    };
  }
}
