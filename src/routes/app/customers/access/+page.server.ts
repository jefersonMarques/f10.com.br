import { error, fail, redirect, type Actions } from "@sveltejs/kit";
import type { PageServerLoad } from "./$types";
import { hasPermission } from "$lib/server/auth/permissions";
import { requireAppPermission } from "$lib/server/auth/authorization";
import { getConfiguredF10UnitId } from "$lib/server/integrations/f10/f10CustomerApi";
import {
  changeF10CustomerAccessAssignment,
  getF10CustomerAccessUser,
  listF10CustomerAccessPeople,
} from "$lib/server/support/f10CustomerAccessRepository";

const ROUTE = "/app/customers/access";
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const USER_ID = /^[a-zA-Z0-9_-]{1,128}$/;

function readPage(value: string | null): number {
  const page = Number(value ?? "1");
  return Number.isInteger(page) ? Math.min(10000, Math.max(1, page)) : 1;
}
async function authorize(cookies: Parameters<typeof requireAppPermission>[0]) {
  const actor = await requireAppPermission(cookies, "customers.manage", ROUTE);
  if (!hasPermission(actor.permissions, "customers.manage", "all")) {
    throw error(403, "Apenas a administração global pode atribuir unidades.");
  }
  return actor.session.user.id;
}
export const load: PageServerLoad = async ({ parent, url, setHeaders }) => {
  const layout = await parent();
  const permissions = new Map(layout.permissions.map((entry) => [entry.code, entry.scope]));
  if (!hasPermission(permissions, "customers.manage", "all")) throw error(403, "Acesso não autorizado.");
  setHeaders({ "Cache-Control": "private, no-store" });
  const unitId = getConfiguredF10UnitId();
  const user = (url.searchParams.get("user") ?? "").trim();
  const query = (url.searchParams.get("q") ?? "").trim().slice(0, 120);
  const groupId = (url.searchParams.get("group") ?? "").trim().slice(0, 16);
  const page = readPage(url.searchParams.get("page"));
  if (user) {
    if (!USER_ID.test(user)) throw error(400, "Usuário inválido.");
    const details = await getF10CustomerAccessUser(unitId, user, { query, groupId, page });
    if (!details) throw error(404, "Identidade não encontrada.");
    return { unitId, people: null, details, query, groupId, pendingOnly: false };
  }
  const pendingOnly = url.searchParams.get("pending") !== "0";
  return {
    unitId, details: null,
    people: await listF10CustomerAccessPeople(unitId, query, page, pendingOnly),
    query, groupId: "", pendingOnly,
  };
};

export const actions: Actions = {
  changeAssignment: async ({ cookies, request }) => {
    const actorId = await authorize(cookies);
    const data = await request.formData();
    const userId = String(data.get("userId") ?? "");
    const customerUnitId = String(data.get("customerUnitId") ?? "");
    const action = data.get("action") === "remove" ? "remove" : "assign";
    const role = String(data.get("role") ?? "");
    if (!USER_ID.test(userId) || !UUID.test(customerUnitId)) {
      return fail(400, { message: "Identificador inválido." });
    }
    try {
      const result = await changeF10CustomerAccessAssignment({
        unitId: getConfiguredF10UnitId(), actorId, userId, customerUnitId, action, role,
      });
      if (result === "not_allowed") {
        return fail(409, { message: "Vínculo não autorizado. Confirme os grupos do último login e a unidade selecionada." });
      }
      throw redirect(303, ROUTE + "?user=" + encodeURIComponent(userId));
    } catch (cause) {
      if (cause && typeof cause === "object" && "status" in cause && cause.status === 303) throw cause;
      console.error("[f10.customer.access.assign]", { action, status: "failed" });
      return fail(500, { message: "Não foi possível salvar a atribuição. Nenhuma permissão do portal foi alterada." });
    }
  },
};
