import { createHash, randomBytes } from "node:crypto";
import { dev } from "$app/environment";
import { and, eq, gt, isNull } from "drizzle-orm";
import { getDatabase } from "$lib/server/db";
import { roles, sessions, userRoles, users } from "$lib/server/db/schema";

export const SESSION_COOKIE_NAME = "f10_operations_session";
const SESSION_TTL_SECONDS = 12 * 60 * 60;
const SESSION_TOUCH_INTERVAL_MS = 60_000;

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export function getSessionCookieOptions() {
  return {
    path: "/",
    httpOnly: true,
    sameSite: "lax" as const,
    secure: !dev,
    maxAge: SESSION_TTL_SECONDS,
  };
}

export async function createSession(userId: string, userAgent?: string | null): Promise<string> {
  const db = getDatabase();
  const token = randomBytes(32).toString("base64url");
  const now = new Date();

  await db.insert(sessions).values({
    userId,
    tokenHash: hashToken(token),
    userAgent: userAgent?.slice(0, 1000) ?? null,
    expiresAt: new Date(now.getTime() + SESSION_TTL_SECONDS * 1000),
    lastSeenAt: now,
  });

  return token;
}

export async function revokeSession(token: string): Promise<void> {
  const db = getDatabase();
  await db
    .update(sessions)
    .set({ revokedAt: new Date() })
    .where(eq(sessions.tokenHash, hashToken(token)));
}

export async function getSessionUser(token: string): Promise<{
  sessionId: string;
  user: { id: string; name: string; email: string };
  roles: string[];
} | null> {
  const db = getDatabase();
  const now = new Date();

  const [session] = await db
    .select({
      sessionId: sessions.id,
      userId: users.id,
      name: users.name,
      email: users.email,
      lastSeenAt: sessions.lastSeenAt,
    })
    .from(sessions)
    .innerJoin(users, eq(sessions.userId, users.id))
    .where(
      and(
        eq(sessions.tokenHash, hashToken(token)),
        gt(sessions.expiresAt, now),
        isNull(sessions.revokedAt),
        eq(users.status, "active"),
      ),
    )
    .limit(1);

  if (!session) return null;

  if (session.lastSeenAt.getTime() <= now.getTime() - SESSION_TOUCH_INTERVAL_MS) {
    await db
      .update(sessions)
      .set({ lastSeenAt: now })
      .where(eq(sessions.id, session.sessionId));
  }

  const roleRows = await db
    .select({ code: roles.code })
    .from(userRoles)
    .innerJoin(roles, eq(userRoles.roleId, roles.id))
    .where(eq(userRoles.userId, session.userId));

  return {
    sessionId: session.sessionId,
    user: { id: session.userId, name: session.name, email: session.email },
    roles: roleRows.map((role) => role.code),
  };
}
