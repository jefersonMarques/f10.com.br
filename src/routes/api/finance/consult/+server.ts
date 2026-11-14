import { json, type Cookies, type RequestHandler } from "@sveltejs/kit";
import { and, eq, sql } from "drizzle-orm";
import { getDatabase } from "$lib/server/db";
import { customerActivityEvents } from "$lib/server/db/customerPortalSchema";
import { recordAuditEvent } from "$lib/server/auth/audit";
import { teamMembers, teams } from "$lib/server/db/schema";
import { getSessionUser, SESSION_COOKIE_NAME } from "$lib/server/auth/session";
import { getPermissionScope, resolveUserPermissions } from "$lib/server/auth/permissions";
import { requireTicketAccess } from "$lib/server/support/supportAccess";
import { getOptionalCustomerF10PortalSession } from "$lib/server/customerPortal/customerPortalSession";
import { consumeSupportPublicRateLimit } from "$lib/server/support/supportPublicRateLimit";
import {
  authorizeFinancePayer,
  consultFinanceInstallments,
  consultFinancePix,
} from "$lib/server/finance/financePaymentService";
import { isFinanceReadOnlyEnabled } from "$lib/server/finance/financeSettings";

const HEADERS = { "Cache-Control": "no-store", "Referrer-Policy": "no-referrer" };
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const MAX_BODY_BYTES = 2048;

type FinanceAction = "contracts" | "installments" | "pix";

type FinanceAccess = {
  actorId: string;
  scope: "customer" | "operator";
};

function errorResponse(code: string, status: number) {
  return json({ error: code }, { status, headers: HEADERS });
}

function isFinanceAction(value: unknown): value is FinanceAction {
  return value === "contracts" || value === "installments" || value === "pix";
}

async function authorizeFinanceAccess(
  scope: string,
  ticketId: string,
  cookies: Cookies,
): Promise<FinanceAccess | null> {
  if (scope === "customer") {
    const customer = await getOptionalCustomerF10PortalSession(cookies);
    if (
      !customer ||
      customer.selectedUnitId === null ||
      customer.selectedGroupId === null
    ) {
      return null;
    }
    return { actorId: customer.sessionId, scope: "customer" };
  }

  if (scope !== "operator" || !UUID_PATTERN.test(ticketId)) return null;
  const token = cookies.get(SESSION_COOKIE_NAME);
  const operator = token ? await getSessionUser(token) : null;
  if (!operator) return null;

  const permissions = await resolveUserPermissions(operator.user.id);
  const ticketScope = getPermissionScope(permissions, "tickets.view");
  if (!ticketScope) return null;

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
    await requireTicketAccess(operator.user.id, ticketScope, ticketId);
  } catch {
    return null;
  }

  return { actorId: operator.user.id, scope: "operator" };
}

async function recordFinanceConsultation(
  access: FinanceAccess,
  action: FinanceAction,
  ticketId: string,
  contractId: number | null,
): Promise<void> {
  const metadata = { operation: action, ...(contractId ? { contractId } : {}) };

  if (access.scope === "operator") {
    await recordAuditEvent({
      actorUserId: access.actorId,
      action: "operations.finance.read",
      entityType: "ticket",
      entityId: ticketId,
      metadata,
    });
    return;
  }

  await getDatabase().insert(customerActivityEvents).values({
    portalSessionId: access.actorId,
    eventType: "finance.read",
    source: "customer_portal",
    path: "/api/finance/consult",
    metadata,
  });
}

export const GET: RequestHandler = async ({ url, cookies }) => {
  if (!(await isFinanceReadOnlyEnabled())) {
    return json({ enabled: false }, { headers: HEADERS });
  }

  try {
    const access = await authorizeFinanceAccess(
      url.searchParams.get("scope") ?? "",
      url.searchParams.get("ticketId") ?? "",
      cookies,
    );
    if (!access) return errorResponse("FINANCE_NOT_AUTHORIZED", 403);

    return json({ enabled: true }, { headers: HEADERS });
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
  if (!(await isFinanceReadOnlyEnabled())) {
    return errorResponse("FINANCE_DISABLED", 403);
  }

  const contentLength = Number(request.headers.get("content-length") ?? "0");
  if (!Number.isFinite(contentLength) || contentLength > MAX_BODY_BYTES) {
    return errorResponse("PAYLOAD_TOO_LARGE", 413);
  }

  let body: Record<string, unknown>;
  try {
    const rawBody = await request.text();
    if (Buffer.byteLength(rawBody, "utf8") > MAX_BODY_BYTES) {
      return errorResponse("PAYLOAD_TOO_LARGE", 413);
    }
    const parsed: unknown = JSON.parse(rawBody);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return errorResponse("INVALID_REQUEST", 400);
    }
    body = parsed as Record<string, unknown>;
  } catch {
    return errorResponse("INVALID_REQUEST", 400);
  }

  const { scope, ticketId, document, birth, action } = body;
  const contractId = body.contractId;
  const receivableId = body.receivableId;

  if (
    (scope !== "customer" && scope !== "operator") ||
    (typeof ticketId !== "string" && ticketId !== undefined) ||
    typeof document !== "string" || document.length > 30 ||
    typeof birth !== "string" || birth.length > 10 ||
    !isFinanceAction(action) ||
    (action !== "contracts" && (
      typeof contractId !== "number" ||
      !Number.isSafeInteger(contractId) ||
      contractId <= 0
    )) ||
    (action === "pix" && (
      typeof receivableId !== "number" ||
      !Number.isSafeInteger(receivableId) ||
      receivableId <= 0
    ))
  ) {
    return errorResponse("INVALID_REQUEST", 400);
  }

  try {
    const normalizedTicketId = typeof ticketId === "string" ? ticketId : "";
    const access = await authorizeFinanceAccess(scope, normalizedTicketId, cookies);
    if (!access) return errorResponse("FINANCE_NOT_AUTHORIZED", 403);

    const allowed = await consumeSupportPublicRateLimit(
      "finance-payment",
      `${scope}:${access.actorId}:${getClientAddress()}`,
      { maxRequests: 12, windowMs: 15 * 60_000, blockMs: 15 * 60_000 },
    );
    if (!allowed) return errorResponse("FINANCE_RATE_LIMITED", 429);

    const payer = await authorizeFinancePayer(document, birth);
    if (action !== "contracts" && !payer.contracts.some((item) => item.id === contractId)) {
      return errorResponse("FINANCE_CONTRACT_NOT_AUTHORIZED", 403);
    }

    await recordFinanceConsultation(
      access,
      action,
      normalizedTicketId,
      action === "contracts" ? null : contractId as number,
    );

    if (action === "contracts") {
      return json({ contracts: payer.contracts }, { headers: HEADERS });
    }
    if (action === "installments") {
      const result = await consultFinanceInstallments(payer, contractId as number);
      return json(result, { headers: HEADERS });
    }
    const result = await consultFinancePix(
      payer,
      contractId as number,
      receivableId as number,
    );
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
