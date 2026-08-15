import { eq } from "drizzle-orm";
import { getDatabase } from "$lib/server/db";
import { rolePermissions, userPermissions, userRoles } from "$lib/server/db/schema";

export const PERMISSION_CODES = [
  "help.view",
  "help.edit",
  "help.publish",
  "tasks.view",
  "tasks.create",
  "tasks.update",
  "tasks.assign",
  "tasks.manage",
  "tickets.view",
  "tickets.create",
  "tickets.reply",
  "tickets.assign",
  "tickets.manage",
  "chat.view",
  "chat.respond",
  "chat.manage",
  "customers.view",
  "customers.manage",
  "users.view",
  "users.manage",
  "roles.manage",
  "reports.view",
  "audit.view",
  "integrations.view",
  "integrations.manage",
  "secrets.manage",
  "remote.request",
  "remote.use",
  "remote.manage",
  "system.settings.manage",
] as const;

export type PermissionCode = (typeof PERMISSION_CODES)[number];
export type PermissionScope = "own" | "team" | "all";

const SCOPE_RANK: Record<PermissionScope, number> = {
  own: 1,
  team: 2,
  all: 3,
};

function highestScope(current: PermissionScope | undefined, candidate: PermissionScope): PermissionScope {
  if (!current) return candidate;
  return SCOPE_RANK[candidate] > SCOPE_RANK[current] ? candidate : current;
}

export async function resolveUserPermissions(userId: string): Promise<Map<string, PermissionScope>> {
  const db = getDatabase();
  const grants = new Map<string, PermissionScope>();

  const roleGrants = await db
    .select({
      permissionCode: rolePermissions.permissionCode,
      scope: rolePermissions.scope,
    })
    .from(userRoles)
    .innerJoin(rolePermissions, eq(userRoles.roleId, rolePermissions.roleId))
    .where(eq(userRoles.userId, userId));

  for (const grant of roleGrants) {
    grants.set(grant.permissionCode, highestScope(grants.get(grant.permissionCode), grant.scope));
  }

  const overrides = await db
    .select({
      permissionCode: userPermissions.permissionCode,
      effect: userPermissions.effect,
      scope: userPermissions.scope,
    })
    .from(userPermissions)
    .where(eq(userPermissions.userId, userId));

  for (const override of overrides) {
    if (override.effect === "deny") {
      grants.delete(override.permissionCode);
      continue;
    }

    grants.set(override.permissionCode, override.scope);
  }

  return grants;
}

export function hasPermission(
  permissions: Map<string, PermissionScope>,
  permissionCode: string,
  requiredScope: PermissionScope = "own",
): boolean {
  const grantedScope = permissions.get(permissionCode);
  if (!grantedScope) return false;
  return SCOPE_RANK[grantedScope] >= SCOPE_RANK[requiredScope];
}
