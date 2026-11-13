import { error, fail, redirect, type Actions } from "@sveltejs/kit";
import type { PageServerLoad } from "./$types";
import { requireAppPermission } from "$lib/server/auth/authorization";
import { hasPermission } from "$lib/server/auth/permissions";
import {
  getConfiguredF10UnitId,
  isF10CustomerApiConfigured,
} from "$lib/server/integrations/f10/f10CustomerApi";
import { listCustomerDirectory } from "$lib/server/support/customerDirectoryRepository";
import {
  listF10CustomerContractUnits,
  refreshMissingF10Contracts,
} from "$lib/server/support/f10CustomerContractDirectoryRepository";

function parsePage(value: string | null): number {
  const parsed = Number.parseInt(value ?? "1", 10);
  return Number.isFinite(parsed) && parsed > 0 ? Math.min(parsed, 10000) : 1;
}

const GROUP_ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function configuredUnitId(): number | null {
  try {
    return getConfiguredF10UnitId();
  } catch {
    return null;
  }
}

export const load: PageServerLoad = async ({ parent, url, setHeaders }) => {
  const layout = await parent();
  const permissions = new Map(
    layout.permissions.map((permission) => [permission.code, permission.scope]),
  );
  if (!hasPermission(permissions, "customers.view")) {
    throw error(403, "Acesso não autorizado.");
  }
  setHeaders({ "Cache-Control": "private, no-store" });

  const query = (url.searchParams.get("q") ?? "").trim().slice(0, 120);
  const page = parsePage(url.searchParams.get("page"));
  const canViewImportedUnits = hasPermission(permissions, "customers.view", "all");
  const view = canViewImportedUnits && url.searchParams.get("view") !== "contacts"
    ? "units" : "contacts";
  const requestedGroup = url.searchParams.get("grupo") ?? "";
  const groupId = "";
  const status = (url.searchParams.get("situacao") ?? "__active__").trim().slice(0, 60);
  const unitId = configuredUnitId();

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

  const importedUnits = canViewImportedUnits && view === "units" && unitId !== null
    ? await listF10CustomerContractUnits({
        unitId, query, page, groupId, status, pageSize: 20,
      })
    : null;

  const refreshSucceeded = url.searchParams.get("refresh") === "done";
  const refreshedCount = Number(url.searchParams.get("imported") ?? "");
  const importedCount = refreshSucceeded && Number.isSafeInteger(refreshedCount) &&
    refreshedCount >= 0 && refreshedCount <= 50000 ? refreshedCount : null;

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
    canRefresh: hasPermission(permissions, "customers.manage", "all"),
    apiConfigured: isF10CustomerApiConfigured(),
    unitUnavailable: view === "units" && unitId === null,
    refreshedCount: importedCount,
  };
};

export const actions: Actions = {
  refresh: async ({ cookies, request }) => {
    const { permissions } = await requireAppPermission(
      cookies, "customers.manage", "/app/customers",
    );
    if (!hasPermission(permissions, "customers.manage", "all")) {
      throw error(403, "Atualização disponível apenas para administração global.");
    }
    if (!isF10CustomerApiConfigured()) {
      return fail(503, { refreshError: "A API F10 não está configurada." });
    }

    const form = await request.formData();
    const query = String(form.get("q") ?? "").trim().slice(0, 120);
    const requestedGroup = String(form.get("grupo") ?? "");
    const groupId = GROUP_ID.test(requestedGroup) ? requestedGroup : "";
    const status = String(form.get("situacao") ?? "").trim().slice(0, 60);

    let refreshed;
    try {
      refreshed = await refreshMissingF10Contracts(getConfiguredF10UnitId());
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : "";
      const code = /^F10_[A-Z_]+$/.test(message) ? message : "F10_REFRESH_FAILED";
      console.error("[f10.customers.refresh]", { code });
      return fail(502, {
        refreshError: "Não foi possível consultar a API F10. Nenhum contrato foi alterado nesta tentativa.",
      });
    }

    const params = new URLSearchParams({ view: "units", refresh: "done" });
    params.set("imported", String(refreshed.imported));
    if (query) params.set("q", query);
    if (groupId) params.set("grupo", groupId);
    if (status) params.set("situacao", status);
    throw redirect(303, "/app/customers?" + params.toString());
  },
};
