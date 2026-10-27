import { error, fail, redirect, type Actions } from "@sveltejs/kit";
import type { PageServerLoad } from "./$types";
import { requireAppPermission } from "$lib/server/auth/authorization";
import { hasPermission } from "$lib/server/auth/permissions";
import { isF10CustomerApiConfigured } from "$lib/server/integrations/f10/f10CustomerApi";
import {
  getF10CustomerSyncPreview,
  processF10CustomerSyncOnce,
  queueF10CustomerSync,
} from "$lib/server/support/f10CustomerSyncRepository";

const RETURN_TO = "/app/customers/sync";
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

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

  return {
    ...(await getF10CustomerSyncPreview(batchId, page)),
    apiConfigured: isF10CustomerApiConfigured(),
  };
};

export const actions: Actions = {
  start: async ({ cookies }) => {
    const actor = await authorize(cookies);
    if (!isF10CustomerApiConfigured()) {
      return fail(503, { message: "Configure F10_API_BEARER_TOKEN no servidor antes de consultar a API." });
    }
    try {
      const batchId = await queueF10CustomerSync(actor);
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
      await processF10CustomerSyncOnce();
      throw redirect(303, RETURN_TO);
    } catch (cause) {
      if (cause && typeof cause === "object" && "status" in cause && cause.status === 303) throw cause;
      return fail(502, { message: "O diagnóstico não pôde continuar. Confira o worker e a API F10." });
    }
  },
};
