import { json } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";
import { requireAppAnyPermission } from "$lib/server/auth/authorization";
import { listHelpVideoProcessingJobSummaries } from "$lib/server/help/helpVideoProcessingRepository";

export const GET: RequestHandler = async ({ cookies }) => {
  const { session } = await requireAppAnyPermission(
    cookies,
    ["help.view", "help.edit"],
    "/app",
  );

  const jobs = await listHelpVideoProcessingJobSummaries(session.user.id);
  return json(
    { success: true, jobs },
    {
      headers: {
        "cache-control": "no-store, max-age=0",
      },
    },
  );
};
