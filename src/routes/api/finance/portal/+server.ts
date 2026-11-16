import type { RequestHandler } from "@sveltejs/kit";
import { getDatabase } from "$lib/server/db";
import { customerActivityEvents } from "$lib/server/db/customerPortalSchema";
import { getOptionalCustomerF10PortalSession } from "$lib/server/customerPortal/customerPortalSession";
import { isAuthorizedF10Context } from "$lib/server/customerPortal/customerF10AuthRepository";
import {
  getConfiguredF10UnitId,
  listF10CustomerContractInstallments,
} from "$lib/server/integrations/f10/f10CustomerApi";
import { getAuthorizedCustomerFinanceContractId } from "$lib/server/finance/financePaymentService";
import { resolveF10CustomerPortalLink } from "$lib/server/finance/financePortalLink";
import { isFinanceReadOnlyEnabled } from "$lib/server/finance/financeSettings";
import { consumeSupportPublicRateLimit } from "$lib/server/support/supportPublicRateLimit";

const RESPONSE_HEADERS = {
  "Cache-Control": "no-store",
  "Referrer-Policy": "no-referrer",
  "X-Content-Type-Options": "nosniff",
};

function unavailableResponse(status: number): Response {
  const body = `<!doctype html>
<html lang="pt-BR">
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1"/>
<title>Financeiro F10</title>
<main style="font:16px system-ui,sans-serif;max-width:420px;margin:15vh auto;padding:24px;color:#18233d">
  <h1 style="font-size:22px">Painel financeiro indisponível</h1>
  <p>Não foi possível abrir seu painel. Volte ao chat e escolha Falar com financeiro.</p>
</main>
</html>`;

  return new Response(body, {
    status,
    headers: { ...RESPONSE_HEADERS, "Content-Type": "text/html; charset=utf-8" },
  });
}

export const GET: RequestHandler = async ({ cookies, getClientAddress }) => {
  try {
    if (!(await isFinanceReadOnlyEnabled())) {
      return unavailableResponse(403);
    }

    const session = await getOptionalCustomerF10PortalSession(cookies);
    if (
      !session ||
      session.selectedGroupId === null ||
      session.selectedUnitId === null ||
      !isAuthorizedF10Context(
        session,
        session.selectedGroupId,
        session.selectedUnitId,
      )
    ) {
      return unavailableResponse(403);
    }

    const permitted = await consumeSupportPublicRateLimit(
      "finance-portal",
      `${session.sessionId}:${getClientAddress()}`,
      { maxRequests: 12, windowMs: 15 * 60_000, blockMs: 15 * 60_000 },
    );
    if (!permitted) return unavailableResponse(429);

    const contractId = await getAuthorizedCustomerFinanceContractId(
      session.selectedGroupId,
      session.selectedUnitId,
    );
    const installments = await listF10CustomerContractInstallments(
      getConfiguredF10UnitId(),
      contractId,
    );
    const portalUrl = resolveF10CustomerPortalLink(installments, contractId);

    await getDatabase().insert(customerActivityEvents).values({
      portalSessionId: session.sessionId,
      eventType: "finance.portal.open",
      source: "customer_portal",
      path: "/api/finance/portal",
      metadata: { operation: "portal" },
    });

    return new Response(null, {
      status: 302,
      headers: { ...RESPONSE_HEADERS, Location: portalUrl },
    });
  } catch {
    return unavailableResponse(503);
  }
};
