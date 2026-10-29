import { error, fail, redirect, type Actions } from "@sveltejs/kit";
import type { PageServerLoad } from "./$types";
import { requireAppPermission } from "$lib/server/auth/authorization";
import { hasPermission } from "$lib/server/auth/permissions";
import { getConfiguredF10UnitId, isF10CustomerApiConfigured } from "$lib/server/integrations/f10/f10CustomerApi";
import {
  getF10CustomerSyncState,
  processF10CustomerSyncOnce,
  queueF10CustomerSync,
} from "$lib/server/support/f10CustomerSyncRepository";

import {
  applyF10CustomerSheet,
  getF10CustomerSheetPage,
  stageF10CustomerSheet,
} from "$lib/server/support/f10CustomerCommercialRepository";
import {
  CUSTOMER_IMPORT_MAX_BYTES,
  parseCustomerImportFile,
} from "$lib/server/support/customerImportFile";
import { getF10SheetPreviewDiagnostic, getF10SheetPreviewError } from "$lib/server/support/f10SheetPreviewErrors";

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
  const sheetBatchId = url.searchParams.get("sheetBatch");
  if (sheetBatchId && !UUID_PATTERN.test(sheetBatchId)) throw error(400, "Lote inválido.");
  const unitId = sourceUnitId();
  const [sync, sheet] = await Promise.all([
    getF10CustomerSyncState(unitId ?? 0),
    getF10CustomerSheetPage(unitId ?? 0, sheetBatchId),
  ]);
  return {
    ...sync, sheet,
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
      const issue = getF10SheetPreviewError(cause);
      // Não registrar query, parâmetros, dados de clientes ou credenciais.
      const diagnostic = getF10SheetPreviewDiagnostic(cause);
      console.error("[f10.sheet.preview]", { code: issue.code, unitId, ...diagnostic });
      return fail(issue.code === "F10_SHEET_DUPLICATE_IDS" ? 400 : 500, {
        message: issue.message,
        errorCode: issue.code,
        previewFailed: true,
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
    if (form.get("confirmation") !== "IMPORTAR") {
      return fail(400, { message: "Confirme a importação para continuar." });
    }
    try {
      const applied = await applyF10CustomerSheet(unitId, batchId);
      if (!applied) return fail(409, { message: "Este lote já foi aplicado ou não pertence à operação." });
      throw redirect(303, RETURN_TO + "?sheetBatch=" + batchId);
    } catch (cause) {
      if (cause && typeof cause === "object" && "status" in cause && cause.status === 303) throw cause;
      return fail(500, { message: "Não foi possível importar. Nenhum cadastro parcial foi salvo." });
    }
  },

};
