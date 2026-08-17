import { getDatabase } from "$lib/server/db";
import {
  helpTrainingEvents,
  helpTrainingStepProgress,
} from "$lib/server/db/helpTrainingSchema";

export async function markHelpTrainingStepViewed(
  sessionId: string,
  stepKey: string,
): Promise<void> {
  const db = getDatabase();
  const [created] = await db
    .insert(helpTrainingStepProgress)
    .values({
      sessionId,
      stepKey,
      status: "pending",
      attemptCount: 0,
    })
    .onConflictDoNothing()
    .returning({ stepKey: helpTrainingStepProgress.stepKey });

  if (!created) return;
  await db.insert(helpTrainingEvents).values({
    sessionId,
    stepKey,
    eventType: "step_viewed",
  });
}
