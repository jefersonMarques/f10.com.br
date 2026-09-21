import { createHash } from "node:crypto";
import { eq } from "drizzle-orm";
import { getDatabase } from "$lib/server/db";
import { authLoginAttempts, users } from "$lib/server/db/schema";
import { recordAuditEvent } from "$lib/server/auth/audit";
import { verifyPassword } from "$lib/server/auth/password";

const LOGIN_WINDOW_MS = 15 * 60 * 1000;
const LOGIN_BLOCK_MS = 15 * 60 * 1000;
const MAX_LOGIN_ATTEMPTS = 5;
const DUMMY_PASSWORD_HASH =
  "scrypt$16384$8$1$RjEwT3BlcmF0aW9uc0R1bW15U2FsdDIwMjY$3dJmepQ0V0ZSeeTgn2I959l6UJQF2JkrG7Bm57F_OLugHi3IkL7BM80s3ar0xR77l7RhAgZJUaepHs2uhMv0Uw";

export type AuthenticationResult =
  | { ok: true; user: { id: string; name: string; email: string } }
  | { ok: false; reason: "invalid" | "throttled" };

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function hashValue(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

function createAttemptKey(email: string, clientAddress: string): string {
  return hashValue(`${email}|${clientAddress}`);
}

async function isBlocked(attemptKey: string, now: Date): Promise<boolean> {
  const db = getDatabase();
  const [attempt] = await db
    .select()
    .from(authLoginAttempts)
    .where(eq(authLoginAttempts.key, attemptKey))
    .limit(1);

  return Boolean(attempt?.blockedUntil && attempt.blockedUntil.getTime() > now.getTime());
}

async function recordFailedAttempt(attemptKey: string, now: Date): Promise<void> {
  const db = getDatabase();

  await db.transaction(async (tx) => {
    const [existing] = await tx
      .select()
      .from(authLoginAttempts)
      .where(eq(authLoginAttempts.key, attemptKey))
      .limit(1);

    const windowExpired =
      !existing || existing.windowStartedAt.getTime() <= now.getTime() - LOGIN_WINDOW_MS;

    if (windowExpired) {
      await tx
        .insert(authLoginAttempts)
        .values({
          key: attemptKey,
          attemptCount: 1,
          windowStartedAt: now,
          blockedUntil: null,
          updatedAt: now,
        })
        .onConflictDoUpdate({
          target: authLoginAttempts.key,
          set: {
            attemptCount: 1,
            windowStartedAt: now,
            blockedUntil: null,
            updatedAt: now,
          },
        });
      return;
    }

    const attemptCount = existing.attemptCount + 1;
    const blockedUntil =
      attemptCount >= MAX_LOGIN_ATTEMPTS ? new Date(now.getTime() + LOGIN_BLOCK_MS) : null;

    await tx
      .update(authLoginAttempts)
      .set({ attemptCount, blockedUntil, updatedAt: now })
      .where(eq(authLoginAttempts.key, attemptKey));
  });
}

async function clearFailedAttempts(attemptKey: string): Promise<void> {
  const db = getDatabase();
  await db.delete(authLoginAttempts).where(eq(authLoginAttempts.key, attemptKey));
}

export async function authenticateUser(
  email: string,
  password: string,
  clientAddress: string,
): Promise<AuthenticationResult> {
  const normalizedEmail = normalizeEmail(email);
  const attemptKey = createAttemptKey(normalizedEmail, clientAddress);
  const now = new Date();

  if (await isBlocked(attemptKey, now)) {
    await recordAuditEvent({
      action: "auth.login_throttled",
      metadata: { emailHash: hashValue(normalizedEmail) },
    });
    return { ok: false, reason: "throttled" };
  }

  const db = getDatabase();
  const [user] = await db.select().from(users).where(eq(users.email, normalizedEmail)).limit(1);
  const passwordMatches = await verifyPassword(password, user?.passwordHash ?? DUMMY_PASSWORD_HASH);
  const canLogin = Boolean(user && user.status === "active" && passwordMatches);

  if (!user || !canLogin) {
    await recordFailedAttempt(attemptKey, now);
    await recordAuditEvent({
      actorUserId: user?.id ?? null,
      action: "auth.login_failed",
      metadata: { emailHash: hashValue(normalizedEmail) },
    });
    return { ok: false, reason: "invalid" };
  }

  await clearFailedAttempts(attemptKey);
  await db.update(users).set({ lastLoginAt: now, updatedAt: now }).where(eq(users.id, user.id));
  await recordAuditEvent({ actorUserId: user.id, action: "auth.login_succeeded" });

  return {
    ok: true,
    user: { id: user.id, name: user.name, email: user.email },
  };
}
