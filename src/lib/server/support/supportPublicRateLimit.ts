import { createHmac } from "node:crypto";
import { env } from "$env/dynamic/private";
import { eq } from "drizzle-orm";
import { getDatabase } from "$lib/server/db";
import { supportPublicLimits } from "$lib/server/db/chatSchema";

export type SupportPublicRateLimitOptions = {
  maxRequests: number;
  windowMs: number;
  blockMs: number;
};

function createSupportPublicLimitKey(scope: string, clientAddress: string): string {
  const secret = env.SUPPORT_RATE_LIMIT_SECRET?.trim();
  if (!secret || secret.length < 32) {
    throw new Error("SUPPORT_RATE_LIMIT_SECRET must have at least 32 characters.");
  }

  return createHmac("sha256", secret)
    .update(`${scope}:${clientAddress}`)
    .digest("hex");
}

export async function consumeSupportPublicRateLimit(
  scope: string,
  clientAddress: string,
  options: SupportPublicRateLimitOptions,
): Promise<boolean> {
  const key = createSupportPublicLimitKey(scope, clientAddress);
  const db = getDatabase();
  const now = new Date();
  const [state] = await db
    .select({
      requestCount: supportPublicLimits.requestCount,
      windowStartedAt: supportPublicLimits.windowStartedAt,
      blockedUntil: supportPublicLimits.blockedUntil,
    })
    .from(supportPublicLimits)
    .where(eq(supportPublicLimits.key, key))
    .limit(1);

  if (!state) {
    await db.insert(supportPublicLimits).values({
      key,
      requestCount: 1,
      windowStartedAt: now,
    });
    return true;
  }

  if (state.blockedUntil && state.blockedUntil > now) return false;

  if (now.getTime() - state.windowStartedAt.getTime() >= options.windowMs) {
    await db
      .update(supportPublicLimits)
      .set({
        requestCount: 1,
        windowStartedAt: now,
        blockedUntil: null,
        updatedAt: now,
      })
      .where(eq(supportPublicLimits.key, key));
    return true;
  }

  if (state.requestCount >= options.maxRequests) {
    await db
      .update(supportPublicLimits)
      .set({
        blockedUntil: new Date(now.getTime() + options.blockMs),
        updatedAt: now,
      })
      .where(eq(supportPublicLimits.key, key));
    return false;
  }

  await db
    .update(supportPublicLimits)
    .set({
      requestCount: state.requestCount + 1,
      updatedAt: now,
    })
    .where(eq(supportPublicLimits.key, key));

  return true;
}
