import { error } from "@sveltejs/kit";
import type { PageServerLoad } from "./$types";
import { hasPermission } from "$lib/server/auth/permissions";
import { listCustomerDirectory } from "$lib/server/support/customerDirectoryRepository";
import { listImportedCustomerUnits } from "$lib/server/support/customerImportRepository";

function parsePage(value: string | null): number {
  const parsed = Number.parseInt(value ?? "1", 10);
  return Number.isFinite(parsed) && parsed > 0 ? Math.min(parsed, 10000) : 1;
}

const GROUP_ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

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
  const view = canViewImportedUnits && url.searchParams.get("view") !== "contacts"
    ? "units" : "contacts";
  const requestedGroup = url.searchParams.get("grupo") ?? "";
  const groupId = GROUP_ID.test(requestedGroup) ? requestedGroup : "";
  const status = (url.searchParams.get("situacao") ?? "").trim().slice(0, 60);

  // Não consultar contatos, tickets e chats quando a aba comercial está aberta.
  // Esse levantamento tem filtros e custos diferentes da lista de unidades.
  let directoryUnavailable = false;
  const directory = view === "contacts"
    ? await listCustomerDirectory(layout.user.id, permissions, {
        query, page, pageSize: 20,
      }).catch((cause: unknown) => {
        directoryUnavailable = true;
        let current: unknown = cause;
        let dbCode: string | null = null;
        for (let depth = 0; depth < 6 && current && typeof current === "object"; depth += 1) {
          const item = current as { code?: unknown; cause?: unknown };
          if (typeof item.code === "string" && /^[0-9A-Z]{5}$/.test(item.code)) {
            dbCode = item.code;
          }
          current = item.cause;
        }
        console.error("[f10.customers.contacts]", { code: dbCode ?? "UNEXPECTED" });
        return { rows: [], total: 0, page: 1, pageSize: 20, pageCount: 1 };
      })
    : { rows: [], total: 0, page: 1, pageSize: 20, pageCount: 1 };

  const importedUnits = canViewImportedUnits && view === "units"
    ? await listImportedCustomerUnits({
        query, page, groupId, status, pageSize: 20,
      })
    : null;

  return {
    ...directory,
    query,
    page: view === "contacts" ? directory.page : importedUnits?.page ?? 1,
    view, groupId, status,
    importedUnits,
    canViewImportedUnits,
    directoryUnavailable,
    canImport: hasPermission(permissions, "customers.manage", "all"),
    canManage: hasPermission(permissions, "customers.manage"),
  };
};
