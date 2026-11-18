import { randomUUID } from "node:crypto";
import { json, type RequestHandler } from "@sveltejs/kit";
import { hasPermission, resolveUserPermissions } from "$lib/server/auth/permissions";
import { getSessionUser, SESSION_COOKIE_NAME } from "$lib/server/auth/session";
import { listCustomerDirectory } from "$lib/server/support/customerDirectoryRepository";
import { searchAuthorizedTicketAttendees } from "$lib/server/support/ticketAttendeeSearchRepository";

export const GET: RequestHandler = async ({ cookies, url }) => {
  const token = cookies.get(SESSION_COOKIE_NAME);
  if (!token) return json({ error: "UNAUTHORIZED" }, { status: 401 });

  const session = await getSessionUser(token);
  if (!session) return json({ error: "UNAUTHORIZED" }, { status: 401 });

  const permissions = await resolveUserPermissions(session.user.id);
  if (!hasPermission(permissions, "customers.view")) {
    return json({ error: "FORBIDDEN" }, { status: 403 });
  }

  const attendeeSearch = url.searchParams.get("purpose") === "attendee";
  const requestedContractIds = url.searchParams.getAll("contractId");
  if (attendeeSearch && (requestedContractIds.length === 0 ||
      requestedContractIds.length > 500 ||
      requestedContractIds.some((id) => !/^[1-9][0-9]*$/.test(id) ||
        !Number.isSafeInteger(Number(id))))) {
    return json({ customers: [] }, { status: 400 });
  }
  const contractIds = attendeeSearch
    ? [...new Set(requestedContractIds.map(Number))]
    : [];
  const query = (url.searchParams.get("q") ?? "").trim().slice(0, 120);
  if (query.length < 2) {
    return json({ customers: [] }, { headers: { "Cache-Control": "no-store" } });
  }

  if (attendeeSearch) {
    if (!hasPermission(permissions, "customers.view", "all") ||
        !hasPermission(permissions, "tickets.create")) {
      return json({ error: "FORBIDDEN" }, { status: 403 });
    }

    try {
      const customers = await searchAuthorizedTicketAttendees(query, contractIds);
      return json(
        { customers },
        { headers: { "Cache-Control": "private, no-store" } },
      );
    } catch (cause) {
      const reference = randomUUID().slice(0, 8).toUpperCase();
      const errorCode = cause && typeof cause === "object" && "code" in cause &&
        typeof cause.code === "string" && /^[A-Z0-9_]{2,20}$/.test(cause.code)
        ? cause.code : null;
      console.error("[ticket.attendees.search.failed]", {
        reference,
        errorType: cause instanceof Error ? cause.name : typeof cause,
        errorCode,
      });
      return json(
        { error: "ATTENDEE_SEARCH_FAILED", reference },
        { status: 500, headers: { "Cache-Control": "private, no-store" } },
      );
    }
  }

  const result = await listCustomerDirectory(session.user.id, permissions, {
    query,
    page: 1,
    pageSize: 20,
    requireF10Context: url.searchParams.get("purpose") !== "requester",
  });

  return json(
    {
      customers: result.rows.map((customer) => ({
          id: customer.id,
          name: customer.name,
          email: customer.email,
          phone: customer.phone,
          whatsapp: customer.whatsapp,
          organizationName: customer.organizationName,
          latestContextTicketId: customer.latestContextTicketId,
          latestGroupId: customer.latestGroupId,
          latestGroupName: customer.latestGroupName,
          latestSubgroup: customer.latestSubgroup,
          latestUnitId: customer.latestUnitId,
          latestUnitName: customer.latestUnitName,
          latestUnitSchema: customer.latestUnitSchema,
          openTicketCount: customer.openTicketCount,
        })),
    },
    { headers: { "Cache-Control": "no-store" } },
  );
};
