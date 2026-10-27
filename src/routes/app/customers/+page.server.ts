import { error } from "@sveltejs/kit";
import type { PageServerLoad } from "./$types";
import { hasPermission } from "$lib/server/auth/permissions";
import { listCustomerDirectory } from "$lib/server/support/customerDirectoryRepository";
import { listImportedCustomerUnits } from "$lib/server/support/customerImportRepository";

function parsePage(value: string | null): number {
  const parsed = Number.parseInt(value ?? "1", 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 1;
}

export const load: PageServerLoad = async ({ parent, url }) => {
  const layout = await parent();
  const permissions = new Map(
    layout.permissions.map((permission) => [permission.code, permission.scope]),
  );
  if (!hasPermission(permissions, "customers.view")) {
    throw error(403, "Acesso não autorizado.");
  }

  const query = (url.searchParams.get("q") ?? "").trim().slice(0, 120);
  const page = parsePage(url.searchParams.get("page"));
  const canViewImportedUnits = hasPermission(permissions, "customers.view", "all");
  const [directory, importedUnits] = await Promise.all([
    listCustomerDirectory(layout.user.id, permissions, {
      query,
      page,
      pageSize: 50,
    }),
    canViewImportedUnits ? listImportedCustomerUnits(query) : Promise.resolve([]),
  ]);

  return {
    ...directory,
    query,
    importedUnits,
    canImport: hasPermission(permissions, "customers.manage", "all"),
    canManage: hasPermission(permissions, "customers.manage"),
  };
};
