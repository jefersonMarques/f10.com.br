import { and, eq, ne } from "drizzle-orm";
import { recordAuditEvent } from "$lib/server/auth/audit";
import { normalizeEmail } from "$lib/server/auth/authentication";
import { hashPassword, verifyPassword } from "$lib/server/auth/password";
import { revokeOtherSessions } from "$lib/server/auth/session";
import { getDatabase } from "$lib/server/db";
import { users } from "$lib/server/db/schema";
import { userProfiles } from "$lib/server/db/userProfileSchema";
import {
  deleteAssetObject,
  getAssetObject,
  putAssetObject,
} from "$lib/server/storage/assetStorage";

export async function getUserAccount(userId: string) {
  const db = getDatabase();
  const [row] = await db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
      avatarKey: userProfiles.avatarKey,
      avatarContentType: userProfiles.avatarContentType,
    })
    .from(users)
    .leftJoin(userProfiles, eq(userProfiles.userId, users.id))
    .where(eq(users.id, userId))
    .limit(1);

  if (!row) throw new Error("USER_NOT_FOUND");
  return row;
}

export async function updateUserName(userId: string, name: string): Promise<void> {
  const normalizedName = name.trim().replace(/\s+/g, " ").slice(0, 120);
  if (normalizedName.length < 2) throw new Error("INVALID_NAME");

  const db = getDatabase();
  await db.update(users).set({ name: normalizedName, updatedAt: new Date() }).where(eq(users.id, userId));
  await recordAuditEvent({
    actorUserId: userId,
    action: "account.name.updated",
    entityType: "user",
    entityId: userId,
  });
}

export async function changeUserEmail(
  userId: string,
  currentSessionId: string,
  currentPassword: string,
  email: string,
): Promise<void> {
  const normalizedEmail = normalizeEmail(email);
  const db = getDatabase();
  const [user] = await db
    .select({ email: users.email, passwordHash: users.passwordHash })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  if (!user) throw new Error("USER_NOT_FOUND");
  if (!(await verifyPassword(currentPassword, user.passwordHash))) {
    throw new Error("CURRENT_PASSWORD_INVALID");
  }

  if (user.email === normalizedEmail) return;
  const [existing] = await db
    .select({ id: users.id })
    .from(users)
    .where(and(eq(users.email, normalizedEmail), ne(users.id, userId)))
    .limit(1);
  if (existing) throw new Error("EMAIL_ALREADY_USED");

  await db.update(users).set({ email: normalizedEmail, updatedAt: new Date() }).where(eq(users.id, userId));
  await revokeOtherSessions(userId, currentSessionId);
  await recordAuditEvent({
    actorUserId: userId,
    action: "account.email.updated",
    entityType: "user",
    entityId: userId,
    metadata: { emailChanged: true },
  });
}

export async function changeUserPassword(
  userId: string,
  currentSessionId: string,
  currentPassword: string,
  newPassword: string,
): Promise<void> {
  const db = getDatabase();
  const [user] = await db
    .select({ passwordHash: users.passwordHash })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  if (!user) throw new Error("USER_NOT_FOUND");
  if (!(await verifyPassword(currentPassword, user.passwordHash))) {
    throw new Error("CURRENT_PASSWORD_INVALID");
  }
  if (await verifyPassword(newPassword, user.passwordHash)) {
    throw new Error("PASSWORD_UNCHANGED");
  }

  const passwordHash = await hashPassword(newPassword);
  await db.update(users).set({ passwordHash, updatedAt: new Date() }).where(eq(users.id, userId));
  await revokeOtherSessions(userId, currentSessionId);
  await recordAuditEvent({
    actorUserId: userId,
    action: "account.password.updated",
    entityType: "user",
    entityId: userId,
  });
}

export async function replaceUserAvatar(
  userId: string,
  bytes: Uint8Array,
  contentType: string,
  extension: string,
): Promise<void> {
  const db = getDatabase();
  const [existing] = await db
    .select({ avatarKey: userProfiles.avatarKey })
    .from(userProfiles)
    .where(eq(userProfiles.userId, userId))
    .limit(1);

  const key = `users/${userId}/avatar-${Date.now()}.${extension}`;
  await putAssetObject(key, bytes, contentType);

  try {
    await db
      .insert(userProfiles)
      .values({ userId, avatarKey: key, avatarContentType: contentType, updatedAt: new Date() })
      .onConflictDoUpdate({
        target: userProfiles.userId,
        set: { avatarKey: key, avatarContentType: contentType, updatedAt: new Date() },
      });
  } catch (cause) {
    await deleteAssetObject(key).catch(() => undefined);
    throw cause;
  }

  if (existing?.avatarKey && existing.avatarKey !== key) {
    await deleteAssetObject(existing.avatarKey).catch(() => undefined);
  }

  await recordAuditEvent({
    actorUserId: userId,
    action: "account.avatar.updated",
    entityType: "user",
    entityId: userId,
  });
}

export async function getUserAvatarResponse(userId: string): Promise<Response | null> {
  const db = getDatabase();
  const [profile] = await db
    .select({ avatarKey: userProfiles.avatarKey, avatarContentType: userProfiles.avatarContentType })
    .from(userProfiles)
    .where(eq(userProfiles.userId, userId))
    .limit(1);

  if (!profile?.avatarKey) return null;
  const response = await getAssetObject(profile.avatarKey);
  const headers = new Headers(response.headers);
  headers.set("Content-Type", profile.avatarContentType || "application/octet-stream");
  headers.set("Cache-Control", "private, max-age=300");
  return new Response(response.body, { status: response.status, headers });
}
