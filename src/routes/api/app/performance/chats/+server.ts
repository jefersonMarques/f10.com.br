import { json, type RequestHandler } from "@sveltejs/kit";
import { requireAppPermission } from "$lib/server/auth/authorization";
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

function parseId(value: string | null): string {
  return value && /^[0-9a-f]{8}-[0-9a-f-]{27,48}$/i.test(value)
    ? value
    : "all";
}

export const GET: RequestHandler = async ({ cookies, url }) => {
  await requireAppPermission(cookies, "performance.view", url.pathname);
  const filters: ChatPerformanceFilters = {
    periodDays: parsePeriod(url.searchParams.get("period")),
    department: parseDepartment(url.searchParams.get("department")),
    queueId: parseId(url.searchParams.get("queue")),
    userId: parseId(url.searchParams.get("user")),
    view: parseView(url.searchParams.get("view")),
  };

  const report = await getSupportChatPerformance(filters);
  return json(report, { headers: { "Cache-Control": "private, no-store" } });
};
