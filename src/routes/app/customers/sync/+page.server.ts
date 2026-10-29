import { error, fail, redirect, type Actions } from "@sveltejs/kit";
import type { PageServerLoad } from "./$types";
import { requireAppPermission } from "$lib/server/auth/authorization";
import { hasPermission } from "$lib/server/auth/permissions";
import { getConfiguredF10UnitId, isF10CustomerApiConfigured } from "$lib/server/integrations/f10/f10CustomerApi";
import {
  getF10CustomerSyncPreview,
  processF10CustomerSyncOnce,
  queueF10CustomerSync,
} from "$lib/server/support/f10CustomerSyncRepository";

import {
  applyF10CustomerSheet,
  getF10CustomerContractDirectory,
  getF10CustomerSheetPage,
  stageF10CustomerSheet,
} from "$lib/server/support/f10CustomerCommercialRepository";
import {
  CUSTOMER_IMPORT_MAX_BYTES,
  parseCustomerImportFile,
} from "$lib/server/support/customerImportFile";

const RETURN_TO = "/app/customers/sync";
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function sourceUnitId(): number | null {
  try {
    return getConfiguredF10UnitId();
  } catch {
    return null;
  }
}

async function authorize(cookies: Parameters<typeof requireAppPermission>[0]) {
  const context = await requireAppPermission(cookies, "customers.manage", RETURN_TO);
  if (!hasPermission(context.permissions, "customers.manage", "all")) {
    throw error(403, "Sincronização disponível apenas para administração global.");
  }
  return context.session.user.id;
}

export const load: PageServerLoad = async ({ parent, url, setHeaders }) => {
  const layout = await parent();
  const permissions = new Map(layout.permissions.map((entry) => [entry.code, entry.scope]));
  if (!hasPermission(permissions, "customers.manage", "all")) {
    throw error(403, "Acesso não autorizado.");
  }
  setHeaders({ "Cache-Control": "private, no-store" });
  const batchId = url.searchParams.get("batch");
  if (batchId && !UUID_PATTERN.test(batchId)) throw error(400, "Diagnóstico inválido.");
  const value = Number(url.searchParams.get("page") ?? "1");
  const page = Number.isInteger(value) ? Math.max(1, Math.min(value, 10000)) : 1;

  const sheetBatchId = url.searchParams.get("sheetBatch");
  if (sheetBatchId && !UUID_PATTERN.test(sheetBatchId)) throw error(400, "Lote da planilha inválido.");
  const requestedView = url.searchParams.get("view");
  const view = requestedView === "contracts" || requestedView === "sheet" || requestedView === "sync"
    ? requestedView
    : sheetBatchId ? "sheet" : batchId ? "sync" : "contracts";
  const unitId = sourceUnitId();
  const contractQuery = (url.searchParams.get("q") ?? "").trim().slice(0, 120);
  const readPage = (name: string) => {
    const value = Number(url.searchParams.get(name) ?? "1");
    return Number.isInteger(value) ? Math.max(1, Math.min(value, 10000)) : 1;
  };
  const [sync, contracts, sheet] = await Promise.all([
    getF10CustomerSyncPreview(batchId, page, unitId ?? 0),
    getF10CustomerContractDirectory(unitId ?? 0, contractQuery, readPage("contractsPage")),
    getF10CustomerSheetPage(unitId ?? 0, sheetBatchId, readPage("sheetPage")),
  ]);
  return {
    ...sync, contracts, sheet, contractQuery, view,
    sourceUnitId: unitId,
    apiConfigured: isF10CustomerApiConfigured(),
  };
};

export const actions: Actions = {
  start: async ({ cookies }) => {
    const actor = await authorize(cookies);
    if (!isF10CustomerApiConfigured()) {
      return fail(503, { message: "Configure F10_UID e F10_API_BEARER_TOKEN no servidor antes de consultar a API." });
    }
    try {
      const batchId = await queueF10CustomerSync(actor, getConfiguredF10UnitId());
      throw redirect(303, RETURN_TO + "?batch=" + batchId);
    } catch (cause) {
      if (cause && typeof cause === "object" && "status" in cause && cause.status === 303) throw cause;
      return fail(500, { message: "Não foi possível iniciar o diagnóstico. Nenhum cliente foi alterado." });
    }
  },
  process: async ({ cookies }) => {
    await authorize(cookies);
    if (!isF10CustomerApiConfigured()) {
      return fail(503, { message: "A integração com a API F10 não está configurada." });
    }
    try {
      await processF10CustomerSyncOnce(getConfiguredF10UnitId());
      throw redirect(303, RETURN_TO);
    } catch (cause) {
      if (cause && typeof cause === "object" && "status" in cause && cause.status === 303) throw cause;
      return fail(502, { message: "O diagnóstico não pôde continuar. Confira o worker e a API F10." });
    }
  },
  sheetUpload: async ({ cookies, request }) => {
    const actorId = await authorize(cookies);
    const unitId = sourceUnitId();
    if (!unitId) return fail(503, { message: "Configure F10_UID antes de importar." });
    const form = await request.formData();
    const file = form.get("file");
    if (!file || typeof file === "string" || typeof file.arrayBuffer !== "function") {
      return fail(400, { message: "Escolha a planilha Clientes F10.xlsx." });
    }
    if (file.size > CUSTOMER_IMPORT_MAX_BYTES) {
      return fail(413, { message: "O arquivo deve ter até 5 MB." });
    }
    let parsed;
    try {
      parsed = parseCustomerImportFile(file.name, new Uint8Array(await file.arrayBuffer()));
    } catch (cause) {
      return fail(400, {
        message: cause instanceof Error ? cause.message : "Planilha inválida.",
      });
    }
    try {
      const batchId = await stageF10CustomerSheet(unitId, actorId, file.name, parsed);
      throw redirect(303, RETURN_TO + "?sheetBatch=" + batchId);
    } catch (cause) {
      if (cause && typeof cause === "object" && "status" in cause && cause.status === 303) throw cause;
      return fail(500, {
        message: cause instanceof Error && cause.message === "F10_CONTRACTS_NOT_IMPORTED"
          ? "Sincronize primeiro os contratos da API antes de anexar a planilha."
          : "Não foi possível preparar a conciliação. Nenhum dado foi alterado.",
      });
    }
  },
  sheetApply: async ({ cookies, request }) => {
    await authorize(cookies);
    const unitId = sourceUnitId();
    if (!unitId) return fail(503, { message: "Configure F10_UID antes de conciliar." });
    const form = await request.formData();
    const batchId = form.get("batchId");
    if (typeof batchId !== "string" || !UUID_PATTERN.test(batchId)) {
      return fail(400, { message: "Lote inválido." });
    }
    if (form.get("confirmation") !== "VINCULAR") {
      return fail(400, { message: "Digite VINCULAR para confirmar." });
    }
    try {
      const applied = await applyF10CustomerSheet(unitId, batchId);
      if (!applied) return fail(409, { message: "Este lote já foi aplicado ou não pertence à operação." });
      throw redirect(303, RETURN_TO + "?sheetBatch=" + batchId);
    } catch (cause) {
      if (cause && typeof cause === "object" && "status" in cause && cause.status === 303) throw cause;
      return fail(500, { message: "Não foi possível conciliar. Nenhum vínculo parcial foi salvo." });
    }
  },

};
