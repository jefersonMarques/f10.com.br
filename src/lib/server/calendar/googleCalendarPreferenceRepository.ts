import { and, asc, eq, isNull, lt, or } from "drizzle-orm";
import { getDatabase } from "$lib/server/db";
import {
  googleCalendarPreferences,
  googleCalendarSources,
  type GoogleCalendarImportMode,
} from "$lib/server/db/googleCalendarSchema";
import { listGoogleCalendars } from "$lib/server/calendar/googleCalendarRepository";

export type GoogleCalendarSyncPreferences = {
  targetCalendarId: string;
  syncTasksToGoogle: boolean;
  syncTicketsToGoogle: boolean;
  syncSchedulingToGoogle: boolean;
  syncGoogleChangesToF10: boolean;
};

export type GoogleCalendarSyncState = {
  lastSyncStartedAt: Date | null;
  lastSyncCompletedAt: Date | null;
  lastSyncError: string | null;
};

export type SaveGoogleCalendarSourceInput = {
  calendarId: string;
  visibleInF10: boolean;
  importMode: GoogleCalendarImportMode;
  importProjectId: string | null;
  importAssigneeId: string | null;
};

export const DEFAULT_GOOGLE_CALENDAR_PREFERENCES: GoogleCalendarSyncPreferences = {
  targetCalendarId: "primary",
  syncTasksToGoogle: false,
  syncTicketsToGoogle: false,
  syncSchedulingToGoogle: true,
  syncGoogleChangesToF10: false,
};

async function ensureGoogleCalendarPreferenceRow(userId: string): Promise<void> {
  const db = getDatabase();
  await db
    .insert(googleCalendarPreferences)
    .values({ userId })
    .onConflictDoNothing();
}

export async function getGoogleCalendarSyncPreferences(
  userId: string,
): Promise<GoogleCalendarSyncPreferences> {
  const db = getDatabase();
  const [preferences] = await db
    .select({
      targetCalendarId: googleCalendarPreferences.targetCalendarId,
      syncTasksToGoogle: googleCalendarPreferences.syncTasksToGoogle,
      syncTicketsToGoogle: googleCalendarPreferences.syncTicketsToGoogle,
      syncSchedulingToGoogle: googleCalendarPreferences.syncSchedulingToGoogle,
      syncGoogleChangesToF10: googleCalendarPreferences.syncGoogleChangesToF10,
    })
    .from(googleCalendarPreferences)
    .where(eq(googleCalendarPreferences.userId, userId))
    .limit(1);

  return preferences ?? DEFAULT_GOOGLE_CALENDAR_PREFERENCES;
}

export async function getGoogleCalendarSyncState(userId: string): Promise<GoogleCalendarSyncState> {
  const db = getDatabase();
  const [state] = await db
    .select({
      lastSyncStartedAt: googleCalendarPreferences.lastSyncStartedAt,
      lastSyncCompletedAt: googleCalendarPreferences.lastSyncCompletedAt,
      lastSyncError: googleCalendarPreferences.lastSyncError,
    })
    .from(googleCalendarPreferences)
    .where(eq(googleCalendarPreferences.userId, userId))
    .limit(1);

  return state ?? {
    lastSyncStartedAt: null,
    lastSyncCompletedAt: null,
    lastSyncError: null,
  };
}

export async function claimGoogleCalendarBackgroundSync(
  userId: string,
  minimumIntervalMs = 5 * 60_000,
  staleLeaseMs = 10 * 60_000,
): Promise<boolean> {
  await ensureGoogleCalendarPreferenceRow(userId);

  const db = getDatabase();
  const now = new Date();
  const completedBefore = new Date(now.getTime() - minimumIntervalMs);
  const startedBefore = new Date(now.getTime() - staleLeaseMs);
  const [claimed] = await db
    .update(googleCalendarPreferences)
    .set({
      lastSyncStartedAt: now,
      lastSyncError: null,
      updatedAt: now,
    })
    .where(
      and(
        eq(googleCalendarPreferences.userId, userId),
        or(
          isNull(googleCalendarPreferences.lastSyncStartedAt),
          lt(googleCalendarPreferences.lastSyncStartedAt, startedBefore),
        ),
        or(
          isNull(googleCalendarPreferences.lastSyncCompletedAt),
          lt(googleCalendarPreferences.lastSyncCompletedAt, completedBefore),
        ),
      ),
    )
    .returning({ userId: googleCalendarPreferences.userId });

  return Boolean(claimed);
}

export async function completeGoogleCalendarBackgroundSync(
  userId: string,
  syncError: string | null,
): Promise<void> {
  const now = new Date();
  const db = getDatabase();
  await db
    .update(googleCalendarPreferences)
    .set({
      lastSyncStartedAt: null,
      lastSyncCompletedAt: now,
      lastSyncError: syncError?.slice(0, 1000) ?? null,
      updatedAt: now,
    })
    .where(eq(googleCalendarPreferences.userId, userId));
}

export async function releaseGoogleCalendarBackgroundSync(
  userId: string,
  syncError: string,
): Promise<void> {
  const db = getDatabase();
  await db
    .update(googleCalendarPreferences)
    .set({
      lastSyncStartedAt: null,
      lastSyncError: syncError.slice(0, 1000),
      updatedAt: new Date(),
    })
    .where(eq(googleCalendarPreferences.userId, userId));
}

export async function saveGoogleCalendarSyncPreferences(
  userId: string,
  input: GoogleCalendarSyncPreferences,
): Promise<void> {
  const db = getDatabase();
  const [target] = await db
    .select({
      calendarId: googleCalendarSources.calendarId,
      accessRole: googleCalendarSources.accessRole,
    })
    .from(googleCalendarSources)
    .where(
      and(
        eq(googleCalendarSources.userId, userId),
        eq(googleCalendarSources.calendarId, input.targetCalendarId),
      ),
    )
    .limit(1);

  if (!target || !["writer", "owner"].includes(target.accessRole)) {
    throw new Error("GOOGLE_CALENDAR_TARGET_NOT_WRITABLE");
  }

  const now = new Date();
  await db
    .insert(googleCalendarPreferences)
    .values({
      userId,
      targetCalendarId: input.targetCalendarId,
      syncTasksToGoogle: input.syncTasksToGoogle,
      syncTicketsToGoogle: input.syncTicketsToGoogle,
      syncSchedulingToGoogle: input.syncSchedulingToGoogle,
      syncGoogleChangesToF10: input.syncGoogleChangesToF10,
      updatedAt: now,
    })
    .onConflictDoUpdate({
      target: googleCalendarPreferences.userId,
      set: {
        targetCalendarId: input.targetCalendarId,
        syncTasksToGoogle: input.syncTasksToGoogle,
        syncTicketsToGoogle: input.syncTicketsToGoogle,
        syncSchedulingToGoogle: input.syncSchedulingToGoogle,
        syncGoogleChangesToF10: input.syncGoogleChangesToF10,
        updatedAt: now,
      },
    });
}

export async function refreshGoogleCalendarSources(userId: string): Promise<void> {
  const calendars = await listGoogleCalendars(userId);
  const db = getDatabase();
  const now = new Date();

  await db.transaction(async (tx) => {
    for (const calendar of calendars) {
      await tx
        .insert(googleCalendarSources)
        .values({
          userId,
          calendarId: calendar.id,
          calendarName: calendar.summary,
          accessRole: calendar.accessRole,
          isPrimary: calendar.primary,
          visibleInF10: calendar.primary,
          importMode: "view_only",
          lastSeenAt: now,
          updatedAt: now,
        })
        .onConflictDoUpdate({
          target: [googleCalendarSources.userId, googleCalendarSources.calendarId],
          set: {
            calendarName: calendar.summary,
            accessRole: calendar.accessRole,
            isPrimary: calendar.primary,
            lastSeenAt: now,
            updatedAt: now,
          },
        });
    }
  });
}

export async function listGoogleCalendarSources(userId: string) {
  const db = getDatabase();
  return db
    .select({
      calendarId: googleCalendarSources.calendarId,
      calendarName: googleCalendarSources.calendarName,
      accessRole: googleCalendarSources.accessRole,
      isPrimary: googleCalendarSources.isPrimary,
      visibleInF10: googleCalendarSources.visibleInF10,
      importMode: googleCalendarSources.importMode,
      importProjectId: googleCalendarSources.importProjectId,
      importAssigneeId: googleCalendarSources.importAssigneeId,
      lastSeenAt: googleCalendarSources.lastSeenAt,
    })
    .from(googleCalendarSources)
    .where(eq(googleCalendarSources.userId, userId))
    .orderBy(asc(googleCalendarSources.calendarName));
}

export async function refreshAndListGoogleCalendarSources(userId: string) {
  await refreshGoogleCalendarSources(userId);
  return listGoogleCalendarSources(userId);
}

export async function saveGoogleCalendarSource(
  userId: string,
  input: SaveGoogleCalendarSourceInput,
): Promise<void> {
  if (input.importMode === "task" && !input.importProjectId) {
    throw new Error("GOOGLE_CALENDAR_IMPORT_PROJECT_REQUIRED");
  }

  const db = getDatabase();
  const [updated] = await db
    .update(googleCalendarSources)
    .set({
      visibleInF10: input.visibleInF10,
      importMode: input.importMode,
      importProjectId: input.importMode === "task" ? input.importProjectId : null,
      importAssigneeId: input.importMode === "task" ? input.importAssigneeId : null,
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(googleCalendarSources.userId, userId),
        eq(googleCalendarSources.calendarId, input.calendarId),
      ),
    )
    .returning({ calendarId: googleCalendarSources.calendarId });

  if (!updated) throw new Error("GOOGLE_CALENDAR_SOURCE_NOT_FOUND");
}

export async function listVisibleGoogleCalendarSources(userId: string) {
  const db = getDatabase();
  return db
    .select({
      calendarId: googleCalendarSources.calendarId,
      calendarName: googleCalendarSources.calendarName,
      accessRole: googleCalendarSources.accessRole,
      isPrimary: googleCalendarSources.isPrimary,
      importMode: googleCalendarSources.importMode,
      importProjectId: googleCalendarSources.importProjectId,
      importAssigneeId: googleCalendarSources.importAssigneeId,
    })
    .from(googleCalendarSources)
    .where(
      and(
        eq(googleCalendarSources.userId, userId),
        eq(googleCalendarSources.visibleInF10, true),
      ),
    )
    .orderBy(asc(googleCalendarSources.calendarName));
}
