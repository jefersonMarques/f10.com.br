import { json, type RequestHandler } from "@sveltejs/kit";
import { and, eq, sql } from "drizzle-orm";
import { getDatabase } from "$lib/server/db";
import { teamMembers, teams } from "$lib/server/db/schema";
import { getSessionUser, SESSION_COOKIE_NAME } from "$lib/server/auth/session";
import { getPermissionScope, resolveUserPermissions } from "$lib/server/auth/permissions";
import { requireTicketAccess } from "$lib/server/support/supportAccess";
import { getOptionalCustomerF10PortalSession } from "$lib/server/customerPortal/customerPortalSession";
import { consumeSupportPublicRateLimit } from "$lib/server/support/supportPublicRateLimit";
import {
  consultFinanceInstallments,
  consultFinancePix,
  listCustomerFinanceContracts,
  listTicketFinanceContracts,
  type FinanceContract,
} from "$lib/server/finance/financePaymentService";
import { isFinanceReadOnlyEnabled } from "$lib/server/finance/financeSettings";

const HEADERS = { "Cache-Control": "no-store", "Referrer-Policy": "no-referrer" };
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

type FinanceAccess = {
  sessionKey: string;
  contracts: FinanceContract[];
};

function errorResponse(code: string, status: number) {
  return json({ error: code }, { status, headers: HEADERS });
}

async function authorizeFinanceAccess(
  scope: string,
  ticketId: string,
  cookies: Parameters<NonNullable<RequestHandler>>[0]["cookies"],
): Promise<FinanceAccess | null> {
  if (scope === "customer") {
    const customer = await getOptionalCustomerF10PortalSession(cookies);
    if (!customer || customer.selectedUnitId === null || customer.selectedGroupId === null) return null;
    return {
      sessionKey: customer.sessionId,
      contracts: await listCustomerFinanceContracts(customer.contactId),
    };
  }

  if (scope !== "operator" || !UUID_PATTERN.test(ticketId)) return null;
  const token = cookies.get(SESSION_COOKIE_NAME);
  const operator = token ? await getSessionUser(token) : null;
  if (!operator) return null;

  const permissions = await resolveUserPermissions(operator.user.id);
  const scopeGrant = getPermissionScope(permissions, "tickets.view");
  if (!scopeGrant) return null;
  const membership = await getDatabase()
    .select({ id: teamMembers.teamId })
    .from(teamMembers)
    .innerJoin(teams, and(eq(teams.id, teamMembers.teamId), eq(teams.active, true)))
    .where(and(
      eq(teamMembers.userId, operator.user.id),
      sql`lower(${teams.name}) LIKE 'financeir%'`,
    ))
    .limit(1);
  if (membership.length === 0) return null;

  try {
    await requireTicketAccess(operator.user.id, scopeGrant, ticketId);
  } catch {
    return null;
  }

  return {
    sessionKey: operator.user.id,
    contracts: await listTicketFinanceContracts(ticketId),
  };
}

export const GET: RequestHandler = async ({ url, cookies }) => {
  if (!(await isFinanceReadOnlyEnabled())) {
    return json({ enabled: false, contracts: [] }, { headers: HEADERS });
  }
  try {
    const access = await authorizeFinanceAccess(
      url.searchParams.get("scope") ?? "",
      url.searchParams.get("ticketId") ?? "",
      cookies,
    );
    if (!access) return errorResponse("FINANCE_NOT_AUTHORIZED", 403);

    return json({
      enabled: true,
      contracts: access.contracts.map((item) => ({ id: item.id, number: item.number })),
    }, { headers: HEADERS });
  } catch {
    return errorResponse("FINANCE_UNAVAILABLE", 503);
  }
};

export const POST: RequestHandler = async ({
  request, url, cookies, getClientAddress,
}) => {
  if (request.headers.get("origin") !== url.origin) {
    return errorResponse("INVALID_ORIGIN", 403);
  }
  if (Number(request.headers.get("content-length") ?? "0") > 2048) {
    return errorResponse("PAYLOAD_TOO_LARGE", 413);
  }
  if (!(await isFinanceReadOnlyEnabled())) return errorResponse("FINANCE_DISABLED", 403);

  try {
    const body = await request.json() as Record<string, unknown>;
    if (!body || typeof body !== "object" || Array.isArray(body)) {
      return errorResponse("INVALID_REQUEST", 400);
    }
    const scope = body.scope;
    const ticketId = body.ticketId;
    const contractId = body.contractId;
    const document = body.document;
    const birth = body.birth;
    const action = body.action;
    if (
      (scope !== "customer" && scope !== "operator") ||
      (typeof ticketId !== "string" && ticketId !== undefined) ||
      typeof contractId !== "number" || !Number.isSafeInteger(contractId) ||
      typeof document !== "string" || document.length > 30 ||
      typeof birth !== "string" || birth.length > 10 ||
      (action !== "installments" && action !== "pix")
    ) {
      return errorResponse("INVALID_REQUEST", 400);
    }

    const access = await authorizeFinanceAccess(scope, typeof ticketId === "string" ? ticketId : "", cookies);
    if (!access) return errorResponse("FINANCE_NOT_AUTHORIZED", 403);
    const selected = access.contracts.find((item) => item.id === contractId);
    if (!selected) return errorResponse("FINANCE_CONTRACT_NOT_AUTHORIZED", 403);

    const clientAddress = getClientAddress();
    const allowed = await consumeSupportPublicRateLimit(
      "finance-payment",
      `${scope}:${access.sessionKey}:${clientAddress}`,
      { maxRequests: 12, windowMs: 15 * 60_000, blockMs: 15 * 60_000 },
    );
    if (!allowed) return errorResponse("FINANCE_RATE_LIMITED", 429);

    if (action === "installments") {
      const result = await consultFinanceInstallments(selected, document, birth);
      return json(result, { headers: HEADERS });
    }

    if (typeof body.receivableId !== "number" || !Number.isSafeInteger(body.receivableId)) {
      return errorResponse("INVALID_REQUEST", 400);
    }
    const result = await consultFinancePix(selected, body.receivableId, document, birth);
    return json(result, { headers: HEADERS });
  } catch (cause) {
    const code = cause instanceof Error ? cause.message : "FINANCE_UNAVAILABLE";
    if (code === "FINANCE_DOCUMENT_INVALID" || code === "FINANCE_BIRTH_INVALID") {
      return errorResponse(code, 400);
    }
    if (code === "FINANCE_PAYER_NOT_VALIDATED") return errorResponse(code, 401);
    if (code === "FINANCE_CONTRACT_NOT_AUTHORIZED") return errorResponse(code, 403);
    if (code === "FINANCE_PIX_UNAVAILABLE") return errorResponse(code, 409);
    return errorResponse("FINANCE_UNAVAILABLE", 503);
  }
};
