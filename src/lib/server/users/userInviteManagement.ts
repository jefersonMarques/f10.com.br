import { createHash, randomBytes } from "node:crypto";
import { and, eq, isNull } from "drizzle-orm";
import { recordAuditEvent } from "$lib/server/auth/audit";
import { getDatabase } from "$lib/server/db";
import { users } from "$lib/server/db/schema";
import { userInvites } from "$lib/server/db/userManagementSchema";
import { getManagedUserDetails } from "$lib/server/users/userManagementRepository";

function hashInviteToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export async function regenerateManagedUserInvite(
  actorUserId: string,
  actorRoles: string[],
  targetUserId: string,
) {
  const details = await getManagedUserDetails(
    actorUserId,
    actorRoles,
    targetUserId,
  );

  if (details.user.activatedAt) {
    throw new Error("USER_ALREADY_ACTIVATED");
  }

  const db = getDatabase();
  const now = new Date();
  const rawToken = randomBytes(32).toString("base64url");
  const expiresAt = new Date(now.getTime() + 48 * 60 * 60 * 1000);

  await db.transaction(async (tx) => {
    await tx
      .update(userInvites)
      .set({ usedAt: now })
      .where(
        and(
          eq(userInvites.userId, targetUserId),
          isNull(userInvites.usedAt),
        ),
      );

    await tx
      .update(users)
      .set({ status: "invited", updatedAt: now })
      .where(eq(users.id, targetUserId));

    await tx.insert(userInvites).values({
      userId: targetUserId,
      tokenHash: hashInviteToken(rawToken),
      expiresAt,
      createdBy: actorUserId,
    });
  });

  await recordAuditEvent({
    actorUserId,
    action: "user.invite.regenerated",
    entityType: "user",
    entityId: targetUserId,
  });

  return { token: rawToken, expiresAt };
}
