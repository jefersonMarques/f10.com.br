import { and, count, eq, gte } from "drizzle-orm";
import { getDatabase } from "$lib/server/db";
import { supportAiRuns } from "$lib/server/db/supportAiSchema";

const WINDOW_MS = 5 * 60 * 1000;
const MAX_RUNS_PER_WINDOW = 12;

export async function enforceSupportAiRateLimit(
  actorUserId: string,
): Promise<void> {
  const db = getDatabase();
  const windowStart = new Date(Date.now() - WINDOW_MS);
  const [result] = await db
    .select({ value: count() })
    .from(supportAiRuns)
    .where(
      and(
        eq(supportAiRuns.actorUserId, actorUserId),
        gte(supportAiRuns.createdAt, windowStart),
      ),
    );

  if (Number(result?.value ?? 0) >= MAX_RUNS_PER_WINDOW) {
    throw new Error("SUPPORT_AI_RATE_LIMIT");
  }
}
