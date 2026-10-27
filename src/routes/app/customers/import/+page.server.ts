import { error, fail, redirect, type Actions } from "@sveltejs/kit";
import type { PageServerLoad } from "./$types";
import { requireAppPermission } from "$lib/server/auth/authorization";
import { hasPermission } from "$lib/server/auth/permissions";
import {
  confirmCustomerImport,
  getCustomerImportPage,
  processCustomerImportBatch,
  resolveCustomerImportRow,
  stageCustomerImport,
} from "$lib/server/support/customerImportRepository";
import {
  CUSTOMER_IMPORT_MAX_BYTES,
  parseCustomerImportFile,
} from "$lib/server/support/customerImportFile";

const RETURN_TO = "/app/customers/import";
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function requireGlobalAccess(permissions: Map<string, "own" | "team" | "all">): void {
  if (!hasPermission(permissions, "customers.manage", "all")) {
    throw error(403, "Importação disponível apenas para administração global.");
  }
}

async function authorize(cookies: Parameters<typeof requireAppPermission>[0]) {
  const context = await requireAppPermission(cookies, "customers.manage", RETURN_TO);
  requireGlobalAccess(context.permissions);
  return context.session.user.id;
}

function readUuid(form: FormData, key: string): string {
  const value = form.get(key);
  if (typeof value !== "string" || !UUID_PATTERN.test(value)) {
    throw error(400, "Identificador de importação inválido.");
  }
  return value;
}

function readPage(value: string | null): number {
  const page = Number(value);
  return Number.isInteger(page) && page > 0 ? Math.min(page, 100) : 1;
}

export const load: PageServerLoad = async ({ parent, url }) => {
  const layout = await parent();
  const permissions = new Map(layout.permissions.map((entry) => [entry.code, entry.scope]));
  requireGlobalAccess(permissions);

  const batchId = url.searchParams.get("batch");
  if (batchId && !UUID_PATTERN.test(batchId)) throw error(400, "Lote inválido.");
  return getCustomerImportPage(batchId, readPage(url.searchParams.get("page")));
};

export const actions: Actions = {
  upload: async ({ cookies, request }) => {
    const actorUserId = await authorize(cookies);
    const data = await request.formData();
    const value = data.get("file");
    if (!value || typeof value === "string" || typeof value.arrayBuffer !== "function") {
      return fail(400, { message: "Selecione uma planilha XLSX ou CSV." });
    }
    if (value.size > CUSTOMER_IMPORT_MAX_BYTES) {
      return fail(413, { message: "O arquivo deve ter no máximo 5 MB." });
    }

    try {
      const parsed = parseCustomerImportFile(value.name, new Uint8Array(await value.arrayBuffer()));
      const batchId = await stageCustomerImport(actorUserId, value.name, parsed);
      throw redirect(303, RETURN_TO + "?batch=" + batchId);
    } catch (cause) {
      if (cause && typeof cause === "object" && "status" in cause && cause.status === 303) throw cause;
      return fail(400, {
        message: cause instanceof Error ? cause.message : "Não foi possível analisar a planilha.",
      });
    }
  },

  resolve: async ({ cookies, request }) => {
    const actorUserId = await authorize(cookies);
    const form = await request.formData();
    const batchId = readUuid(form, "batchId");
    const rowId = readUuid(form, "rowId");
    const decision = String(form.get("decision") ?? "");
    const targetOrganizationId = String(form.get("targetOrganizationId") ?? "") || null;
    const page = readPage(String(form.get("page") ?? "1"));

    if (!["create", "link", "skip"].includes(decision)) {
      return fail(400, { message: "Selecione uma decisão válida." });
    }
    if (targetOrganizationId && !UUID_PATTERN.test(targetOrganizationId)) {
      return fail(400, { message: "Organização inválida." });
    }
    try {
      await resolveCustomerImportRow(
        actorUserId,
        batchId,
        rowId,
        decision as "create" | "link" | "skip",
        targetOrganizationId,
      );
      throw redirect(303, RETURN_TO + "?batch=" + batchId + "&page=" + page);
    } catch (cause) {
      if (cause && typeof cause === "object" && "status" in cause && cause.status === 303) throw cause;
      return fail(409, { message: "Não foi possível salvar a decisão. Confira a organização." });
    }
  },

  confirm: async ({ cookies, request }) => {
    const actorUserId = await authorize(cookies);
    const form = await request.formData();
    const batchId = readUuid(form, "batchId");
    if (form.get("confirmation") !== "IMPORTAR") {
      return fail(400, { message: "Digite IMPORTAR para confirmar a gravação." });
    }
    if (!await confirmCustomerImport(actorUserId, batchId)) {
      return fail(409, { message: "Existem linhas pendentes de revisão ou o lote já foi confirmado." });
    }
    throw redirect(303, RETURN_TO + "?batch=" + batchId);
  },

  process: async ({ cookies, request }) => {
    const actorUserId = await authorize(cookies);
    const data = await request.formData();
    const batchId = readUuid(data, "batchId");
    try {
      await processCustomerImportBatch(batchId, actorUserId);
      throw redirect(303, RETURN_TO + "?batch=" + batchId);
    } catch (cause) {
      if (cause && typeof cause === "object" && "status" in cause && cause.status === 303) throw cause;
      return fail(500, {
        message: "O lote foi interrompido. As linhas concluídas foram preservadas; tente retomar.",
      });
    }
  },
};
