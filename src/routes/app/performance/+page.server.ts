import { error } from "@sveltejs/kit";
import type { PageServerLoad } from "./$types";
import { hasPermission } from "$lib/server/auth/permissions";
import {
  getSupportPerformance,
  type SupportPerformancePeriod,
} from "$lib/server/reports/supportPerformanceRepository";
import { getSupportPresenceTimeline } from "$lib/server/reports/supportPresenceTimelineRepository";

function readPeriod(value: string | null): SupportPerformancePeriod {
  if (value === "7") return 7;
  if (value === "90") return 90;
  return 30;
}

export const load: PageServerLoad = async ({ parent, url }) => {
  const layout = await parent();
  const permissions = new Map(
    layout.permissions.map((permission) => [permission.code, permission.scope]),
  );
  if (!hasPermission(permissions, "performance.view")) {
    throw error(403, "Acesso não autorizado.");
  }

  const periodDays = readPeriod(url.searchParams.get("period"));
  const [performance, presence] = await Promise.all([
    getSupportPerformance(periodDays),
    getSupportPresenceTimeline(url.searchParams.get("date")),
  ]);

  return { performance, presence };
};
