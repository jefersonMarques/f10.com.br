import { error, json, type RequestHandler } from "@sveltejs/kit";
import { requireAppPermission } from "$lib/server/auth/authorization";
import { hasPermission } from "$lib/server/auth/permissions";
import { getConfiguredF10UnitId } from "$lib/server/integrations/f10/f10CustomerApi";
import { refreshF10ContractHolder } from "$lib/server/support/f10CustomerHolderRepository";

export const POST: RequestHandler = async ({ cookies, params, url }) => {
  const { permissions } = await requireAppPermission(
    cookies, "customers.manage", url.pathname,
  );
  if (!hasPermission(permissions, "customers.manage", "all")) {
    throw error(403, "Atualização não autorizada.");
  }

  const rawId = params.contractId ?? "";
  if (!/^[1-9][0-9]*$/.test(rawId) ||
      !Number.isSafeInteger(Number(rawId))) {
    throw error(400, "Contrato inválido.");
  }

  let unitId: number;
  try {
    unitId = getConfiguredF10UnitId();
  } catch {
    throw error(503, "Integração F10 indisponível.");
  }

  try {
    await refreshF10ContractHolder(unitId, Number(rawId));
  } catch (cause) {
    const code = cause instanceof Error ? cause.message : "";
    if (code === "F10_CONTRACT_NOT_FOUND") throw error(404, "Contrato não encontrado.");
    if (code === "F10_CONTRACT_HOLDER_UNAVAILABLE") {
      throw error(422, "Contrato sem titular válido na API.");
    }
    console.error("[f10.holder.refresh]", {
      code: /^F10_[A-Z_]+$/.test(code) ? code : "F10_HOLDER_REFRESH_FAILED",
    });
    throw error(502, "Não foi possível consultar o titular na API F10.");
  }

  return json({ updated: true }, {
    headers: { "Cache-Control": "private, no-store" },
  });
};
