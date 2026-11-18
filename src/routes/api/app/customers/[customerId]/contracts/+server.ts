import { error, json, type RequestHandler } from "@sveltejs/kit";
import { requireAppPermission } from "$lib/server/auth/authorization";
import { hasPermission } from "$lib/server/auth/permissions";
import {
  getContactContractAccess,
  grantContactContractAccess,
} from "$lib/server/support/customerContractAccessRepository";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export const GET: RequestHandler = async ({ cookies, params, url }) => {
  const { permissions } = await requireAppPermission(
    cookies, "customers.view", url.pathname,
  );
  if (!hasPermission(permissions, "customers.view", "all") ||
      !hasPermission(permissions, "tickets.create")) {
    throw error(403, "Acesso não autorizado.");
  }
  if (!UUID.test(params.customerId ?? "")) throw error(400, "Pessoa inválida.");
  return json(
    { contracts: await getContactContractAccess(params.customerId) },
    { headers: { "Cache-Control": "private, no-store" } },
  );
};
export const POST: RequestHandler = async ({ cookies, params, request, url }) => {
  const { session, permissions } = await requireAppPermission(
    cookies, "customers.manage", url.pathname,
  );
  if (!hasPermission(permissions, "customers.manage", "all") ||
      !hasPermission(permissions, "tickets.create")) {
    throw error(403, "Gerenciamento de contratos não autorizado.");
  }
  if (!UUID.test(params.customerId ?? "")) throw error(400, "Pessoa inválida.");

  const payload: unknown = await request.json().catch(() => null);
  const contractId = payload && typeof payload === "object" &&
    "contractId" in payload ? (payload as { contractId: unknown }).contractId : null;
  if (typeof contractId !== "string" || !/^[1-9][0-9]*$/.test(contractId) ||
      !Number.isSafeInteger(Number(contractId))) {
    throw error(400, "Contrato inválido.");
  }

  try {
    const state = await grantContactContractAccess(
      session.user.id, params.customerId, Number(contractId),
    );
    return json({ state }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (cause) {
    if (cause instanceof Error && cause.message === "SUPPORT_CONTRACT_NOT_ACTIVE") {
      throw error(409, "Selecione um contrato ativo.");
    }
    if (cause instanceof Error && cause.message === "SUPPORT_CONTACT_NOT_FOUND") {
      throw error(404, "Pessoa não encontrada.");
    }
    throw cause;
  }
};
