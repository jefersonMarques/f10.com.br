import { json, type RequestHandler } from "@sveltejs/kit";
import { requireAppPermission } from "$lib/server/auth/authorization";
import { getPermissionScope } from "$lib/server/auth/permissions";
import { getUserSupportQueueIds } from "$lib/server/support/supportAccess";
import { getSupportChatPerformance } from "$lib/server/reports/supportChatPerformanceRepository";
import type { ChatPerformanceFilters } from "$lib/support/chatPerformanceReport";

function parsePeriod(value: string | null): ChatPerformanceFilters["periodDays"] {
  return value === "7" ? 7 : value === "90" ? 90 : 30;
}

function parseDepartment(value: string | null): ChatPerformanceFilters["department"] {
  return value === "finance" || value === "support" ? value : "all";
}

function parseView(value: string | null): ChatPerformanceFilters["view"] {
  if (value === "waiting" || value === "late" || value === "unanswered" || value === "abandoned") {
    return value;
  }
  return "all";
}

function parsePage(value: string | null): number {
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed >= 1 && parsed <= 1000 ? parsed : 1;
}

function parseId(value: string | null): string {
  return value && /^[0-9a-f]{8}-[0-9a-f-]{27,48}$/i.test(value)
    ? value
    : "all";
}

export const GET: RequestHandler = async ({ cookies, url }) => {
  const context = await requireAppPermission(cookies, "performance.view", url.pathname);
  const scope = getPermissionScope(context.permissions, "performance.view") ?? "own";
  const queueIds = scope === "team"
    ? await getUserSupportQueueIds(context.session.user.id)
    : [];
  const filters: ChatPerformanceFilters = {
    periodDays: parsePeriod(url.searchParams.get("period")),
    department: parseDepartment(url.searchParams.get("department")),
    queueId: parseId(url.searchParams.get("queue")),
    userId: parseId(url.searchParams.get("user")),
    view: parseView(url.searchParams.get("view")),
    page: parsePage(url.searchParams.get("page")),
  };

  const report = await getSupportChatPerformance(filters, {
    scope,
    actorUserId: context.session.user.id,
    queueIds,
  });
  return json(report, { headers: { "Cache-Control": "private, no-store" } });
};
