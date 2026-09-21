import { randomUUID } from "node:crypto";
import { and, asc, eq, ne, sql } from "drizzle-orm";
import { recordAuditEvent } from "$lib/server/auth/audit";
import {
  PERMISSION_CODES,
  isScopeAtLeast,
  resolveUserPermissions,
  type PermissionCode,
  type PermissionScope,
} from "$lib/server/auth/permissions";
import { getDatabase } from "$lib/server/db";
import {
  permissions,
  rolePermissions,
  roles,
  userRoles,
} from "$lib/server/db/schema";

export type AccessProfileGrant = {
  permissionCode: PermissionCode;
  scope: PermissionScope;
};

export type AccessProfileSummary = {
  id: string;
  code: string;
  name: string;
  isSystem: boolean;
  grants: AccessProfileGrant[];
};

function validName(value: string): string {
  const name = value.trim().replace(/\s+/g, " ");
  if (name.length < 2 || name.length > 80) throw new Error("ACCESS_PROFILE_NAME_INVALID");
  return name;
}

export async function listAccessProfiles(): Promise<AccessProfileSummary[]> {
  const db = getDatabase();
  const [profileRows, grantRows] = await Promise.all([
    db
      .select({
        id: roles.id,
        code: roles.code,
        name: roles.name,
        isSystem: roles.isSystem,
      })
      .from(roles)
      .orderBy(asc(roles.isSystem), asc(roles.name)),
    db
      .select({
        roleId: rolePermissions.roleId,
        permissionCode: rolePermissions.permissionCode,
        scope: rolePermissions.scope,
      })
      .from(rolePermissions),
  ]);

  const grantsByRole = new Map<string, AccessProfileGrant[]>();
  for (const grant of grantRows) {
    if (!(PERMISSION_CODES as readonly string[]).includes(grant.permissionCode)) continue;
    const current = grantsByRole.get(grant.roleId) ?? [];
    current.push({
      permissionCode: grant.permissionCode as PermissionCode,
      scope: grant.scope,
    });
    grantsByRole.set(grant.roleId, current);
  }

  return profileRows.map((profile) => ({
    ...profile,
    grants: grantsByRole.get(profile.id) ?? [],
  }));
}

export async function listPermissionCatalog() {
  return getDatabase()
    .select({
      code: permissions.code,
      name: permissions.name,
      description: permissions.description,
    })
    .from(permissions)
    .orderBy(asc(permissions.name));
}

export async function listAssignableAccessProfiles(
  actorUserId: string,
  actorRoles: string[],
): Promise<Array<{ id: string; code: string; name: string }>> {
  const profiles = await listAccessProfiles();
  const isSuperAdmin = actorRoles.includes("SUPER_ADMIN");

  if (isSuperAdmin) {
    return profiles
      .filter((profile) => profile.code !== "SUPER_ADMIN")
      .map(({ id, code, name }) => ({ id, code, name }));
  }

  if (!actorRoles.includes("ADMIN")) return [];

  const actorPermissions = await resolveUserPermissions(actorUserId);
  return profiles
    .filter(
      (profile) =>
        profile.code !== "SUPER_ADMIN" &&
        profile.code !== "ADMIN" &&
        profile.grants.every((grant) => {
          const actorScope = actorPermissions.get(grant.permissionCode);
          return actorScope ? isScopeAtLeast(actorScope, grant.scope) : false;
        }),
    )
    .map(({ id, code, name }) => ({ id, code, name }));
}

export async function createAccessProfile(
  actorUserId: string,
  nameValue: string,
): Promise<string> {
  const name = validName(nameValue);
  const db = getDatabase();
  const [duplicate] = await db
    .select({ id: roles.id })
    .from(roles)
    .where(sql`lower(${roles.name}) = ${name.toLowerCase()}`)
    .limit(1);
  if (duplicate) throw new Error("ACCESS_PROFILE_NAME_EXISTS");

  const [created] = await db
    .insert(roles)
    .values({
      code: `CUSTOM_${randomUUID().replaceAll("-", "").toUpperCase()}`,
      name,
      isSystem: false,
    })
    .returning({ id: roles.id });
  if (!created) throw new Error("ACCESS_PROFILE_NOT_CREATED");

  await recordAuditEvent({
    actorUserId,
    action: "access_profile.created",
    entityType: "role",
    entityId: created.id,
    metadata: { name },
  });
  return created.id;
}

export async function updateAccessProfile(
  actorUserId: string,
  profileId: string,
  input: {
    name: string;
    grants: AccessProfileGrant[];
  },
): Promise<void> {
  const name = validName(input.name);
  const uniqueGrants = new Map<PermissionCode, PermissionScope>();
  for (const grant of input.grants) {
    if (!(PERMISSION_CODES as readonly string[]).includes(grant.permissionCode)) {
      throw new Error("ACCESS_PROFILE_PERMISSION_INVALID");
    }
    if (!["own", "team", "all"].includes(grant.scope)) {
      throw new Error("ACCESS_PROFILE_SCOPE_INVALID");
    }
    uniqueGrants.set(grant.permissionCode, grant.scope);
  }

  const db = getDatabase();
  const [[profile], [duplicate]] = await Promise.all([
    db
      .select({ id: roles.id, isSystem: roles.isSystem })
      .from(roles)
      .where(eq(roles.id, profileId))
      .limit(1),
    db
      .select({ id: roles.id })
      .from(roles)
      .where(and(ne(roles.id, profileId), sql`lower(${roles.name}) = ${name.toLowerCase()}`))
      .limit(1),
  ]);

  if (!profile) throw new Error("ACCESS_PROFILE_NOT_FOUND");
  if (profile.isSystem) throw new Error("ACCESS_PROFILE_SYSTEM_READ_ONLY");
  if (duplicate) throw new Error("ACCESS_PROFILE_NAME_EXISTS");

  await db.transaction(async (tx) => {
    await tx.update(roles).set({ name }).where(eq(roles.id, profileId));
    await tx.delete(rolePermissions).where(eq(rolePermissions.roleId, profileId));

    if (uniqueGrants.size > 0) {
      await tx.insert(rolePermissions).values(
        Array.from(uniqueGrants.entries()).map(([permissionCode, scope]) => ({
          roleId: profileId,
          permissionCode,
          scope,
        })),
      );
    }
  });

  await recordAuditEvent({
    actorUserId,
    action: "access_profile.updated",
    entityType: "role",
    entityId: profileId,
    metadata: {
      name,
      permissionCount: uniqueGrants.size,
    },
  });
}

export async function profileHasUsers(profileId: string): Promise<boolean> {
  const [row] = await getDatabase()
    .select({ userId: userRoles.userId })
    .from(userRoles)
    .where(eq(userRoles.roleId, profileId))
    .limit(1);
  return Boolean(row);
}
