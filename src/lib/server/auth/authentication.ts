import { createHash } from "node:crypto";
import { eq, sql } from "drizzle-orm";
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

// Chaves não reversíveis por conta/IP permitem limpar somente o bloqueio
// do próprio usuário depois de redefinir a senha, sem tocar outras contas.
export function loginAttemptKeyPrefix(email: string): string {
  return `operations-login:v2:${hashValue(normalizeEmail(email))}:`;
}

function createAttemptKey(email: string, clientAddress: string): string {
  return loginAttemptKeyPrefix(email) + hashValue(clientAddress);
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
    // Inicializar primeiro e bloquear a linha evita perder tentativas quando
    // o navegador envia duas requisições simultaneamente.
    await tx.insert(authLoginAttempts).values({
      key: attemptKey,
      attemptCount: 0,
      windowStartedAt: now,
      blockedUntil: null,
      updatedAt: now,
    }).onConflictDoNothing();

    const [existing] = await tx.select()
      .from(authLoginAttempts)
      .where(eq(authLoginAttempts.key, attemptKey))
      .for("update")
      .limit(1);
    if (!existing) throw new Error("LOGIN_ATTEMPT_RECORD_NOT_FOUND");

    const expired = existing.windowStartedAt.getTime() <= now.getTime() - LOGIN_WINDOW_MS;
    const attemptCount = expired ? 1 : existing.attemptCount + 1;
    const blockedUntil = attemptCount >= MAX_LOGIN_ATTEMPTS
      ? new Date(now.getTime() + LOGIN_BLOCK_MS)
      : null;

    await tx.update(authLoginAttempts).set({
      attemptCount,
      windowStartedAt: expired ? now : existing.windowStartedAt,
      blockedUntil,
      updatedAt: now,
    }).where(eq(authLoginAttempts.key, attemptKey));
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
  // Contas antigas podem ter sido cadastradas com letras maiúsculas ou
  // espaços no e-mail. Nunca escolher arbitrariamente entre duplicatas.
  const matches = await db.select().from(users)
    .where(sql`lower(btrim(${users.email})) = ${normalizedEmail}`)
    .limit(2);
  const user = matches.length === 1 ? matches[0] : undefined;
  const passwordMatches = await verifyPassword(password, user?.passwordHash ?? DUMMY_PASSWORD_HASH);
  const canLogin = Boolean(user && user.status === "active" && passwordMatches);

  if (!user || !canLogin) {
    await recordFailedAttempt(attemptKey, now);
    await recordAuditEvent({
      actorUserId: user?.id ?? null,
      action: "auth.login_failed",
      metadata: {
        emailHash: hashValue(normalizedEmail),
        failureKind: matches.length > 1
          ? "duplicate_email"
          : !user ? "account_not_found"
            : user.status !== "active" ? "account_not_active"
              : "password_mismatch",
      },
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
