import { and, eq, inArray } from "drizzle-orm";
import { getDatabase } from "$lib/server/db";
import {
  helpTrainingEvents,
  helpTrainingPaths,
  helpTrainingPublicEvents,
  helpTrainingPublicSessions,
  helpTrainingPublicStepProgress,
  helpTrainingStepProgress,
  helpTrainingVersions,
  type HelpTrainingSnapshot,
} from "$lib/server/db/helpTrainingSchema";
import { listHelpTrainingParticipants } from "$lib/server/help/helpTrainingRepository";

type ProgressRow = {
  stepKey: string;
  status: string;
  attemptCount: number;
  failureReasonKey: string | null;
};

type TrainingDifficultyReport = {
  source: "invite" | "public";
  name: string;
  email: string;
  organizationName: string;
  version: number;
  stepId: string;
  stepTitle: string;
  detail: string;
  reportedAt: Date;
};

function failureCount(row: ProgressRow): number {
  const successful = row.status === "succeeded" || row.status === "continued" || row.status === "acknowledged";
  return Math.max(0, row.attemptCount - (successful ? 1 : 0));
}

function metadataText(metadata: Record<string, unknown>, key: string, maxLength: number): string {
  const value = metadata[key];
  return typeof value === "string" ? value.trim().slice(0, maxLength) : "";
}

function registerStepTitles(target: Map<string, string>, snapshot: HelpTrainingSnapshot | null | undefined): void {
  for (const step of snapshot?.steps ?? []) target.set(step.id, step.title);
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
          sessionId: helpTrainingStepProgress.sessionId,
          stepKey: helpTrainingStepProgress.stepKey,
          status: helpTrainingStepProgress.status,
          attemptCount: helpTrainingStepProgress.attemptCount,
          failureReasonKey: helpTrainingStepProgress.failureReasonKey,
          failureDetail: helpTrainingStepProgress.failureDetail,
          updatedAt: helpTrainingStepProgress.updatedAt,
        })
        .from(helpTrainingStepProgress)
        .where(inArray(helpTrainingStepProgress.sessionId, inviteSessionIds))
    : [];
  const inviteBlockedEvents = inviteSessionIds.length > 0
    ? await db
        .select({
          sessionId: helpTrainingEvents.sessionId,
          stepKey: helpTrainingEvents.stepKey,
          createdAt: helpTrainingEvents.createdAt,
        })
        .from(helpTrainingEvents)
        .where(and(
          inArray(helpTrainingEvents.sessionId, inviteSessionIds),
          eq(helpTrainingEvents.eventType, "step_blocked"),
        ))
    : [];

  const publicSessions = await db
    .select({
      id: helpTrainingPublicSessions.id,
      completedAt: helpTrainingPublicSessions.completedAt,
      version: helpTrainingVersions.version,
      snapshot: helpTrainingVersions.snapshot,
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
  const publicBlockedEvents = publicSessionIds.length > 0
    ? await db
        .select({
          sessionId: helpTrainingPublicEvents.sessionId,
          stepKey: helpTrainingPublicEvents.stepKey,
          metadata: helpTrainingPublicEvents.metadata,
          createdAt: helpTrainingPublicEvents.createdAt,
        })
        .from(helpTrainingPublicEvents)
        .where(and(
          inArray(helpTrainingPublicEvents.sessionId, publicSessionIds),
          eq(helpTrainingPublicEvents.eventType, "step_blocked"),
        ))
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

  const stepTitles = new Map<string, string>();
  registerStepTitles(stepTitles, snapshot);
  for (const participant of participants) registerStepTitles(stepTitles, participant.snapshot);
  for (const session of publicSessions) registerStepTitles(stepTitles, session.snapshot);

  const participantBySession = new Map(
    participants.flatMap((participant) => participant.sessionId ? [[participant.sessionId, participant] as const] : []),
  );
  const inviteReportedAt = new Map<string, Date>();
  for (const event of inviteBlockedEvents) {
    if (!event.stepKey) continue;
    const key = `${event.sessionId}:${event.stepKey}`;
    const current = inviteReportedAt.get(key);
    if (!current || event.createdAt > current) inviteReportedAt.set(key, event.createdAt);
  }

  const difficultyReports: TrainingDifficultyReport[] = [];
  for (const progress of inviteProgress) {
    const detail = progress.failureDetail.trim();
    if (!detail) continue;
    const participant = participantBySession.get(progress.sessionId);
    if (!participant) continue;
    difficultyReports.push({
      source: "invite",
      name: participant.name,
      email: participant.email,
      organizationName: participant.organizationName,
      version: participant.version,
      stepId: progress.stepKey,
      stepTitle: stepTitles.get(progress.stepKey) ?? "Orientação da trilha",
      detail,
      reportedAt: inviteReportedAt.get(`${progress.sessionId}:${progress.stepKey}`) ?? progress.updatedAt,
    });
  }

  const publicSessionById = new Map(publicSessions.map((session) => [session.id, session] as const));
  for (const event of publicBlockedEvents) {
    if (!event.stepKey) continue;
    const metadata = event.metadata ?? {};
    const detail = metadataText(metadata, "detail", 4000);
    if (!detail) continue;
    const session = publicSessionById.get(event.sessionId);
    if (!session) continue;
    difficultyReports.push({
      source: "public",
      name: metadataText(metadata, "reporterName", 160) || "Acesso público",
      email: metadataText(metadata, "reporterEmail", 320),
      organizationName: "",
      version: session.version,
      stepId: event.stepKey,
      stepTitle: stepTitles.get(event.stepKey) ?? "Orientação da trilha",
      detail,
      reportedAt: event.createdAt,
    });
  }
  difficultyReports.sort((a, b) => b.reportedAt.getTime() - a.reportedAt.getTime());

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
    difficultyReports: difficultyReports.slice(0, 50),
  };
}
