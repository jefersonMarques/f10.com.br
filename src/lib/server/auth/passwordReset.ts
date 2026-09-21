import { dev } from "$app/environment";
import { env } from "$env/dynamic/private";
import { createHash, randomBytes } from "node:crypto";
import { and, eq, gt, isNull } from "drizzle-orm";
import { recordAuditEvent } from "$lib/server/auth/audit";
import { normalizeEmail } from "$lib/server/auth/authentication";
import { hashPassword } from "$lib/server/auth/password";
import { getDatabase } from "$lib/server/db";
import { authLoginAttempts, sessions, users } from "$lib/server/db/schema";
import { passwordResetTokens } from "$lib/server/db/userManagementSchema";
import { getGeneralOperationsSettings } from "$lib/server/settings/operationsSettingsRepository";

const RESET_TOKEN_TTL_MS = 30 * 60 * 1000;
const RESET_WINDOW_MS = 15 * 60 * 1000;
const RESET_BLOCK_MS = 30 * 60 * 1000;
const MAX_RESET_REQUESTS = 3;

function hashValue(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

function hashResetToken(token: string): string {
  return hashValue(token);
}

function createResetAttemptKey(email: string, clientAddress: string): string {
  return hashValue(`password-reset|${email}|${clientAddress}`);
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function getOperationsBaseUrl(requestOrigin: string): string {
  const configured = env.OPERATIONS_BASE_URL?.trim();
  const value = configured || (dev ? requestOrigin : "");
  if (!value) throw new Error("OPERATIONS_BASE_URL_NOT_CONFIGURED");

  const url = new URL(value);
  const localDev = dev && ["localhost", "127.0.0.1"].includes(url.hostname);
  if (url.protocol !== "https:" && !(localDev && url.protocol === "http:")) {
    throw new Error("OPERATIONS_BASE_URL_INVALID");
  }

  url.pathname = "/";
  url.search = "";
  url.hash = "";
  return url.toString().replace(/\/$/, "");
}

async function consumePasswordResetLimit(
  email: string,
  clientAddress: string,
): Promise<boolean> {
  const db = getDatabase();
  const key = createResetAttemptKey(email, clientAddress);
  const now = new Date();

  return db.transaction(async (tx) => {
    const [existing] = await tx
      .select({
        attemptCount: authLoginAttempts.attemptCount,
        windowStartedAt: authLoginAttempts.windowStartedAt,
        blockedUntil: authLoginAttempts.blockedUntil,
      })
      .from(authLoginAttempts)
      .where(eq(authLoginAttempts.key, key))
      .limit(1);

    if (existing?.blockedUntil && existing.blockedUntil > now) return false;

    const windowExpired =
      !existing || existing.windowStartedAt.getTime() <= now.getTime() - RESET_WINDOW_MS;

    if (windowExpired) {
      await tx
        .insert(authLoginAttempts)
        .values({
          key,
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
      return true;
    }

    const attemptCount = existing.attemptCount + 1;
    const blocked = attemptCount > MAX_RESET_REQUESTS;
    await tx
      .update(authLoginAttempts)
      .set({
        attemptCount,
        blockedUntil: blocked ? new Date(now.getTime() + RESET_BLOCK_MS) : null,
        updatedAt: now,
      })
      .where(eq(authLoginAttempts.key, key));

    return !blocked;
  });
}

async function sendPasswordResetEmail(input: {
  email: string;
  name: string;
  resetUrl: string;
  expiresAt: Date;
}): Promise<void> {
  const general = await getGeneralOperationsSettings();
  const apiKey = env.BREVO_API_KEY?.trim();
  const senderEmail = general.supportSenderEmail || env.BREVO_SENDER_EMAIL?.trim() || "";
  const senderName = general.supportSenderName || env.BREVO_SENDER_NAME?.trim() || "F10 Software";

  if (!apiKey || !senderEmail) {
    throw new Error("PASSWORD_RESET_EMAIL_NOT_CONFIGURED");
  }

  const safeName = escapeHtml(input.name || "usuário");
  const safeUrl = escapeHtml(input.resetUrl);
  const expiresAt = new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
    timeZone: general.timezone || "America/Sao_Paulo",
  }).format(input.expiresAt);

  const response = await fetch("https://api.brevo.com/v3/smtp/email", {
    method: "POST",
    headers: {
      accept: "application/json",
      "api-key": apiKey,
      "content-type": "application/json",
    },
    body: JSON.stringify({
      sender: { email: senderEmail, name: senderName },
      to: [{ email: input.email, name: input.name }],
      subject: "Redefinição de senha do F10 Operations",
      htmlContent: `
        <div style="font-family:Arial,sans-serif;color:#1f2937;line-height:1.6">
          <h2 style="color:#010D28">Redefinição de senha</h2>
          <p>Olá, ${safeName}.</p>
          <p>Recebemos uma solicitação para redefinir sua senha do F10 Operations.</p>
          <p style="margin:28px 0"><a href="${safeUrl}" style="background:#000A57;color:#fff;text-decoration:none;padding:12px 18px;border-radius:10px;display:inline-block">Criar nova senha</a></p>
          <p>O link é de uso único e expira em 30 minutos, até ${escapeHtml(expiresAt)}.</p>
          <p>Se você não solicitou a alteração, ignore esta mensagem. Sua senha atual continuará válida.</p>
        </div>
      `,
      textContent: `Olá, ${input.name || "usuário"}. Redefina sua senha do F10 Operations por este link de uso único: ${input.resetUrl}. O link expira em 30 minutos. Se você não solicitou a alteração, ignore esta mensagem.`,
    }),
  });

  if (!response.ok) {
    throw new Error(`PASSWORD_RESET_EMAIL_FAILED_${response.status}`);
  }
}

export async function requestPasswordReset(
  emailValue: string,
  clientAddress: string,
  requestOrigin: string,
): Promise<void> {
  const email = normalizeEmail(emailValue);
  const allowed = await consumePasswordResetLimit(email, clientAddress);

  if (!allowed) {
    await recordAuditEvent({
      action: "auth.password_reset_throttled",
      metadata: { emailHash: hashValue(email) },
    });
    return;
  }

  const db = getDatabase();
  const [user] = await db
    .select({ id: users.id, name: users.name, email: users.email })
    .from(users)
    .where(and(eq(users.email, email), eq(users.status, "active")))
    .limit(1);

  // A resposta pública é sempre a mesma para não revelar quais e-mails possuem conta.
  if (!user) return;

  const token = randomBytes(32).toString("base64url");
  const tokenHash = hashResetToken(token);
  const expiresAt = new Date(Date.now() + RESET_TOKEN_TTL_MS);
  const [created] = await db
    .insert(passwordResetTokens)
    .values({ userId: user.id, tokenHash, expiresAt })
    .returning({ id: passwordResetTokens.id });
  if (!created) throw new Error("PASSWORD_RESET_TOKEN_NOT_CREATED");

  try {
    const baseUrl = getOperationsBaseUrl(requestOrigin);
    await sendPasswordResetEmail({
      email: user.email,
      name: user.name,
      resetUrl: `${baseUrl}/redefinir-senha/${encodeURIComponent(token)}`,
      expiresAt,
    });
  } catch (cause) {
    await db
      .update(passwordResetTokens)
      .set({ usedAt: new Date() })
      .where(eq(passwordResetTokens.id, created.id));
    await recordAuditEvent({
      actorUserId: user.id,
      action: "auth.password_reset_email_failed",
      entityType: "user",
      entityId: user.id,
      metadata: {
        cause: cause instanceof Error ? cause.message.replace(/\d+$/, "") : "unknown",
      },
    });
    return;
  }

  await recordAuditEvent({
    actorUserId: user.id,
    action: "auth.password_reset_requested",
    entityType: "user",
    entityId: user.id,
  });
}

export async function getPasswordResetState(token: string) {
  const db = getDatabase();
  const now = new Date();
  const [row] = await db
    .select({ expiresAt: passwordResetTokens.expiresAt })
    .from(passwordResetTokens)
    .innerJoin(users, eq(users.id, passwordResetTokens.userId))
    .where(
      and(
        eq(passwordResetTokens.tokenHash, hashResetToken(token)),
        gt(passwordResetTokens.expiresAt, now),
        isNull(passwordResetTokens.usedAt),
        eq(users.status, "active"),
      ),
    )
    .limit(1);

  return row ?? null;
}

export async function completePasswordReset(
  token: string,
  newPassword: string,
): Promise<boolean> {
  const tokenHash = hashResetToken(token);
  const db = getDatabase();
  const now = new Date();

  const [candidate] = await db
    .select({ userId: passwordResetTokens.userId })
    .from(passwordResetTokens)
    .innerJoin(users, eq(users.id, passwordResetTokens.userId))
    .where(
      and(
        eq(passwordResetTokens.tokenHash, tokenHash),
        gt(passwordResetTokens.expiresAt, now),
        isNull(passwordResetTokens.usedAt),
        eq(users.status, "active"),
      ),
    )
    .limit(1);
  if (!candidate) return false;

  const passwordHash = await hashPassword(newPassword);
  const userId = await db.transaction(async (tx) => {
    const [claimed] = await tx
      .update(passwordResetTokens)
      .set({ usedAt: now })
      .where(
        and(
          eq(passwordResetTokens.tokenHash, tokenHash),
          gt(passwordResetTokens.expiresAt, now),
          isNull(passwordResetTokens.usedAt),
        ),
      )
      .returning({ userId: passwordResetTokens.userId });
    if (!claimed || claimed.userId !== candidate.userId) return null;

    const [updatedUser] = await tx
      .update(users)
      .set({ passwordHash, updatedAt: now })
      .where(and(eq(users.id, claimed.userId), eq(users.status, "active")))
      .returning({ id: users.id });
    if (!updatedUser) throw new Error("PASSWORD_RESET_USER_NOT_ACTIVE");

    await tx
      .update(sessions)
      .set({ revokedAt: now })
      .where(and(eq(sessions.userId, claimed.userId), isNull(sessions.revokedAt)));

    await tx
      .update(passwordResetTokens)
      .set({ usedAt: now })
      .where(and(eq(passwordResetTokens.userId, claimed.userId), isNull(passwordResetTokens.usedAt)));

    return claimed.userId;
  });

  if (!userId) return false;

  await recordAuditEvent({
    actorUserId: userId,
    action: "auth.password_reset_completed",
    entityType: "user",
    entityId: userId,
  });
  return true;
}
