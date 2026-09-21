import { json, type RequestHandler } from "@sveltejs/kit";
import { getPublicSupportStatus } from "$lib/server/support/publicSupportStatus";

export const GET: RequestHandler = async () => {
  try {
    const status = await getPublicSupportStatus();
    return json(status, {
      headers: {
        "Cache-Control": "no-store",
      },
    });
  } catch {
    return json(
      {
        supportDisplayName: "Equipe F10",
        hoursConfigured: false,
        isOpen: null,
        nextOpenLabel: null,
        onlineAgents: null,
        averageWaitMinutes: null,
        waitSampleCount: 0,
      },
      {
        headers: {
          "Cache-Control": "no-store",
        },
      },
    );
  }
};
