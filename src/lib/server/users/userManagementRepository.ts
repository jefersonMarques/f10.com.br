import { createHash, randomBytes } from "node:crypto";
import { and, eq, gt, isNull } from "drizzle-orm";
import { recordAuditEvent } from "$lib/server/auth/audit";
import { hashPassword } from "$lib/server/auth/password";
import {
  getPermissionScope,
  isScopeAtLeast,
  resolveUserPermissions,
  type PermissionCode,
  type PermissionScope,
} from "$lib/server/auth/permissions";
import { getDatabase } from "$lib/server/db";
import {
  permissions,
  roles,
  sessions,
  userPermissions,
  userRoles,
  users,
} from "$lib/server/db/schema";
import { userInvites } from "$lib/server/db/userManagementSchema";

export type ManagedRoleCode = "ADMIN" | "EMPLOYEE";
export type UserPermissionEffect = "allow" | "deny";

export type CreateManagedUserInput = {
  name: string;
  email: string;
  roleCode: ManagedRoleCode;
};

function hashInviteToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

function isSuperAdmin(actorRoles: string[]): boolean {
  return actorRoles.includes("SUPER_ADMIN");
}

function canActorManageRole(
  actorRoles: string[],
  targetRoles: string[],
): boolean {
  if (isSuperAdmin(actorRoles)) return true;
  return (
    actorRoles.includes("ADMIN") &&
    targetRoles.includes("EMPLOYEE") &&
    !targetRoles.includes("ADMIN") &&
    !targetRoles.includes("SUPER_ADMIN")
  );
}

function canActorAssignRole(
  actorRoles: string[],
  roleCode: ManagedRoleCode,
): boolean {
  if (isSuperAdmin(actorRoles)) return true;
  return actorRoles.includes("ADMIN") && roleCode === "EMPLOYEE";
}

async function getUserRoles(userId: string): Promise<string[]> {
  const db = getDatabase();
  const rows = await db
    .select({ code: roles.code })
    .from(userRoles)
    .innerJoin(roles, eq(userRoles.roleId, roles.id))
    .where(eq(userRoles.userId, userId));

  return rows.map((row) => row.code);
}

async function requireManageableTarget(
  actorUserId: string,
  actorRoles: string[],
  targetUserId: string,
) {
  const db = getDatabase();
  const [target] = await db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
      status: users.status,
      createdAt: users.createdAt,
      updatedAt: users.updatedAt,
    })
    .from(users)
    .where(eq(users.id, targetUserId))
    .limit(1);

  if (!target) throw new Error("USER_NOT_FOUND");

  const targetRoles = await getUserRoles(targetUserId);

  if (!canActorManageRole(actorRoles, targetRoles)) {
    throw new Error("USER_NOT_MANAGEABLE");
  }

  return { target, targetRoles, isSelf: actorUserId === targetUserId };
}

export async function listManagedUsers(actorRoles: string[]) {
  const db = getDatabase();
  const [userRows, roleRows] = await Promise.all([
    db
      .select({
        id: users.id,
        name: users.name,
        email: users.email,
        status: users.status,
        lastLoginAt: users.lastLoginAt,
        createdAt: users.createdAt,
      })
      .from(users),
    db
      .select({ userId: userRoles.userId, code: roles.code })
      .from(userRoles)
      .innerJoin(roles, eq(userRoles.roleId, roles.id)),
  ]);

  const rolesByUser = new Map<string, string[]>();
  for (const role of roleRows) {
    const current = rolesByUser.get(role.userId) ?? [];
    current.push(role.code);
    rolesByUser.set(role.userId, current);
  }

  return userRows
    .map((user) => ({
      ...user,
      roles: rolesByUser.get(user.id) ?? [],
    }))
    .filter((user) => canActorManageRole(actorRoles, user.roles))
    .sort((first, second) => first.name.localeCompare(second.name, "pt-BR"));
}

export async function createManagedUserInvite(
  actorUserId: string,
  actorRoles: string[],
  input: CreateManagedUserInput,
) {
  if (!canActorAssignRole(actorRoles, input.roleCode)) {
    throw new Error("ROLE_NOT_ALLOWED");
  }

  const db = getDatabase();
  const email = input.email.trim().toLowerCase();
  const name = input.name.trim();
  const rawToken = randomBytes(32).toString("base64url");
  const tokenHash = hashInviteToken(rawToken);
  const expiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000);
  const unusablePassword = await hashPassword(
    randomBytes(48).toString("base64url"),
  );

  const [existingUser] = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.email, email))
    .limit(1);

  if (existingUser) throw new Error("EMAIL_ALREADY_EXISTS");

  const result = await db.transaction(async (tx) => {
    const [createdUser] = await tx
      .insert(users)
      .values({
        name,
        email,
        passwordHash: unusablePassword,
        status: "invited",
      })
      .returning({ id: users.id, name: users.name, email: users.email });

    if (!createdUser) throw new Error("USER_NOT_CREATED");

    const [role] = await tx
      .select({ id: roles.id })
      .from(roles)
      .where(eq(roles.code, input.roleCode))
      .limit(1);

    if (!role) throw new Error("ROLE_NOT_FOUND");

    await tx.insert(userRoles).values({
      userId: createdUser.id,
      roleId: role.id,
    });

    await tx.insert(userInvites).values({
      userId: createdUser.id,
      tokenHash,
      expiresAt,
      createdBy: actorUserId,
    });

    return createdUser;
  });

  await recordAuditEvent({
    actorUserId,
    action: "user.invited",
    entityType: "user",
    entityId: result.id,
    metadata: { email: result.email, roleCode: input.roleCode },
  });

  return {
    user: result,
    token: rawToken,
    expiresAt,
  };
}

export async function getManagedUserDetails(
  actorUserId: string,
  actorRoles: string[],
  targetUserId: string,
) {
  const db = getDatabase();
  const { target, targetRoles } = await requireManageableTarget(
    actorUserId,
    actorRoles,
    targetUserId,
  );
  const [permissionRows, overrideRows, effectivePermissions] = await Promise.all([
    db
      .select({
        code: permissions.code,
        name: permissions.name,
        description: permissions.description,
      })
      .from(permissions),
    db
      .select({
        permissionCode: userPermissions.permissionCode,
        effect: userPermissions.effect,
        scope: userPermissions.scope,
      })
      .from(userPermissions)
      .where(eq(userPermissions.userId, targetUserId)),
    resolveUserPermissions(targetUserId),
  ]);
  const actorPermissions = await resolveUserPermissions(actorUserId);
  const overrideMap = new Map(
    overrideRows.map((override) => [override.permissionCode, override]),
  );

  return {
    user: target,
    roles: targetRoles,
    permissions: permissionRows
      .map((permission) => ({
        ...permission,
        effectiveScope: effectivePermissions.get(permission.code) ?? null,
        override: overrideMap.get(permission.code) ?? null,
        actorScope: actorPermissions.get(permission.code) ?? null,
        canActorChange:
          isSuperAdmin(actorRoles) || actorPermissions.has(permission.code),
      }))
      .sort((first, second) => first.name.localeCompare(second.name, "pt-BR")),
  };
}

export async function setManagedUserPermission(
  actorUserId: string,
  actorRoles: string[],
  targetUserId: string,
  permissionCode: PermissionCode,
  effect: UserPermissionEffect | "inherit",
  scope: PermissionScope,
): Promise<void> {
  const db = getDatabase();
  await requireManageableTarget(actorUserId, actorRoles, targetUserId);

  if (actorUserId === targetUserId) {
    throw new Error("SELF_PERMISSION_CHANGE_NOT_ALLOWED");
  }

  const actorPermissions = await resolveUserPermissions(actorUserId);
  const actorScope = getPermissionScope(actorPermissions, permissionCode);

  if (!isSuperAdmin(actorRoles)) {
    if (!actorScope) throw new Error("PERMISSION_NOT_DELEGABLE");
    if (effect === "allow" && !isScopeAtLeast(actorScope, scope)) {
      throw new Error("SCOPE_NOT_DELEGABLE");
    }
  }

  if (effect === "inherit") {
    await db
      .delete(userPermissions)
      .where(
        and(
          eq(userPermissions.userId, targetUserId),
          eq(userPermissions.permissionCode, permissionCode),
        ),
      );
  } else {
    await db
      .insert(userPermissions)
      .values({
        userId: targetUserId,
        permissionCode,
        effect,
        scope,
      })
      .onConflictDoUpdate({
        target: [userPermissions.userId, userPermissions.permissionCode],
        set: { effect, scope },
      });
  }

  await recordAuditEvent({
    actorUserId,
    action: "user.permission.changed",
    entityType: "user",
    entityId: targetUserId,
    metadata: { permissionCode, effect, scope },
  });
}

export async function setManagedUserStatus(
  actorUserId: string,
  actorRoles: string[],
  targetUserId: string,
  status: "active" | "inactive",
): Promise<void> {
  const db = getDatabase();
  const { target, isSelf } = await requireManageableTarget(
    actorUserId,
    actorRoles,
    targetUserId,
  );

  if (isSelf && status === "inactive") {
    throw new Error("SELF_DEACTIVATION_NOT_ALLOWED");
  }

  if (target.status === "invited" && status === "active") {
    throw new Error("INVITED_USER_REQUIRES_ACTIVATION");
  }

  await db.transaction(async (tx) => {
    await tx
      .update(users)
      .set({ status, updatedAt: new Date() })
      .where(eq(users.id, targetUserId));

    if (status === "inactive") {
      await tx
        .update(sessions)
        .set({ revokedAt: new Date() })
        .where(
          and(eq(sessions.userId, targetUserId), isNull(sessions.revokedAt)),
        );
    }
  });

  await recordAuditEvent({
    actorUserId,
    action: "user.status.changed",
    entityType: "user",
    entityId: targetUserId,
    metadata: { previousStatus: target.status, status },
  });
}

export async function activateInvitedUser(
  rawToken: string,
  password: string,
): Promise<{ name: string; email: string }> {
  const db = getDatabase();
  const tokenHash = hashInviteToken(rawToken);
  const now = new Date();
  const passwordHash = await hashPassword(password);

  const [invite] = await db
    .select({
      id: userInvites.id,
      userId: userInvites.userId,
      name: users.name,
      email: users.email,
    })
    .from(userInvites)
    .innerJoin(users, eq(userInvites.userId, users.id))
    .where(
      and(
        eq(userInvites.tokenHash, tokenHash),
        gt(userInvites.expiresAt, now),
        isNull(userInvites.usedAt),
        eq(users.status, "invited"),
      ),
    )
    .limit(1);

  if (!invite) throw new Error("INVITE_INVALID_OR_EXPIRED");

  await db.transaction(async (tx) => {
    const [consumed] = await tx
      .update(userInvites)
      .set({ usedAt: now })
      .where(
        and(
          eq(userInvites.id, invite.id),
          isNull(userInvites.usedAt),
          gt(userInvites.expiresAt, now),
        ),
      )
      .returning({ id: userInvites.id });

    if (!consumed) throw new Error("INVITE_ALREADY_USED");

    await tx
      .update(users)
      .set({
        passwordHash,
        status: "active",
        updatedAt: now,
      })
      .where(eq(users.id, invite.userId));
  });

  await recordAuditEvent({
    actorUserId: invite.userId,
    action: "user.invite.activated",
    entityType: "user",
    entityId: invite.userId,
  });

  return { name: invite.name, email: invite.email };
}
