import { and, eq, inArray } from "drizzle-orm";
import { getDatabase } from "$lib/server/db";
import {
  helpTrainingPaths,
  helpTrainingPublicSessions,
  helpTrainingPublicStepProgress,
  helpTrainingStepProgress,
  helpTrainingVersions,
} from "$lib/server/db/helpTrainingSchema";
import { listHelpTrainingParticipants } from "$lib/server/help/helpTrainingRepository";

type ProgressRow = {
  stepKey: string;
  status: string;
  attemptCount: number;
  failureReasonKey: string | null;
};

function failureCount(row: ProgressRow): number {
  const successful = row.status === "succeeded" || row.status === "continued";
  return Math.max(0, row.attemptCount - (successful ? 1 : 0));
}

export async function getCombinedHelpTrainingInsights(pathId: string) {
  const db = getDatabase();
  const participants = await listHelpTrainingParticipants(pathId);
  const [path] = await db
    .select({ currentVersion: helpTrainingPaths.currentVersion })
    .from(helpTrainingPaths)
    .where(eq(helpTrainingPaths.id, pathId))
    .limit(1);
  const [latestVersion] = path && path.currentVersion > 0
    ? await db
        .select({ id: helpTrainingVersions.id, snapshot: helpTrainingVersions.snapshot })
        .from(helpTrainingVersions)
        .where(and(eq(helpTrainingVersions.pathId, pathId), eq(helpTrainingVersions.version, path.currentVersion)))
        .limit(1)
    : [];
  const snapshot = latestVersion?.snapshot ?? null;

  const inviteSessionIds = participants.flatMap((participant) => participant.sessionId ? [participant.sessionId] : []);
  const inviteProgress = inviteSessionIds.length > 0
    ? await db
        .select({
          stepKey: helpTrainingStepProgress.stepKey,
          status: helpTrainingStepProgress.status,
          attemptCount: helpTrainingStepProgress.attemptCount,
          failureReasonKey: helpTrainingStepProgress.failureReasonKey,
        })
        .from(helpTrainingStepProgress)
        .where(inArray(helpTrainingStepProgress.sessionId, inviteSessionIds))
    : [];

  const publicSessions = await db
    .select({
      id: helpTrainingPublicSessions.id,
      completedAt: helpTrainingPublicSessions.completedAt,
    })
    .from(helpTrainingPublicSessions)
    .innerJoin(helpTrainingVersions, eq(helpTrainingVersions.id, helpTrainingPublicSessions.versionId))
    .where(eq(helpTrainingVersions.pathId, pathId));
  const publicSessionIds = publicSessions.map((session) => session.id);
  const publicProgress = publicSessionIds.length > 0
    ? await db
        .select({
          stepKey: helpTrainingPublicStepProgress.stepKey,
          status: helpTrainingPublicStepProgress.status,
          attemptCount: helpTrainingPublicStepProgress.attemptCount,
          failureReasonKey: helpTrainingPublicStepProgress.failureReasonKey,
        })
        .from(helpTrainingPublicStepProgress)
        .where(inArray(helpTrainingPublicStepProgress.sessionId, publicSessionIds))
    : [];

  const stepStats = new Map<string, { failures: number; helpRequests: number }>();
  const reasonCounts = new Map<string, number>();
  for (const row of [...inviteProgress, ...publicProgress]) {
    const current = stepStats.get(row.stepKey) ?? { failures: 0, helpRequests: 0 };
    current.failures += failureCount(row);
    if (row.status === "help_requested") current.helpRequests += 1;
    stepStats.set(row.stepKey, current);
    if (row.failureReasonKey) {
      reasonCounts.set(row.failureReasonKey, (reasonCounts.get(row.failureReasonKey) ?? 0) + 1);
    }
  }

  const stepRanking = (snapshot?.steps ?? [])
    .map((step) => ({
      stepId: step.id,
      title: step.title,
      failures: stepStats.get(step.id)?.failures ?? 0,
      helpRequests: stepStats.get(step.id)?.helpRequests ?? 0,
    }))
    .sort((a, b) => b.failures - a.failures || b.helpRequests - a.helpRequests);
  const reasonLabels = new Map(
    (snapshot?.steps ?? []).flatMap((step) => step.failureReasons.map((reason) => [reason.key, reason.label] as const)),
  );
  const reasonRanking = Array.from(reasonCounts.entries())
    .map(([key, occurrences]) => ({ key, label: reasonLabels.get(key) ?? key, occurrences }))
    .sort((a, b) => b.occurrences - a.occurrences);

  const inviteStarted = participants.filter((participant) => participant.startedAt).length;
  const inviteCompleted = participants.filter((participant) => participant.completedAt).length;
  const publicStarted = publicSessions.length;
  const publicCompleted = publicSessions.filter((session) => session.completedAt).length;

  return {
    invited: participants.length,
    started: inviteStarted + publicStarted,
    completed: inviteCompleted + publicCompleted,
    inviteStarted,
    inviteCompleted,
    publicStarted,
    publicCompleted,
    humanHelp: participants.filter((participant) => participant.supportTicketId).length,
    stepRanking,
    reasonRanking,
  };
}
