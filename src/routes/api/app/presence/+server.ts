import { json, type RequestHandler } from "@sveltejs/kit";
import { requireAppAnyPermission } from "$lib/server/auth/authorization";
import {
  getSupportAgentPresence,
  heartbeatSupportAgent,
  isSupportAgentManualStatus,
  setSupportAgentManualStatus,
} from "$lib/server/support/supportAgentPresence";

export const GET: RequestHandler = async ({ cookies, url }) => {
  const { session } = await requireAppAnyPermission(
    cookies,
    ["chat.respond", "tickets.reply"],
    `${url.pathname}${url.search}`,
  );
  return json(await getSupportAgentPresence(session.user.id), {
    headers: { "Cache-Control": "no-store" },
  });
};

export const POST: RequestHandler = async ({ cookies, request, url }) => {
  if (request.headers.get("origin") !== url.origin) {
    return json({ error: "INVALID_ORIGIN" }, { status: 403 });
  }

  const { session } = await requireAppAnyPermission(
    cookies,
    ["chat.respond", "tickets.reply"],
    "/app",
  );

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return json({ error: "INVALID_JSON" }, { status: 400 });
  }

  try {
    if (body.action === "heartbeat") {
      return json(await heartbeatSupportAgent(session.user.id), {
        headers: { "Cache-Control": "no-store" },
      });
    }

    const status = typeof body.status === "string" ? body.status : "";
    if (body.action !== "status" || !isSupportAgentManualStatus(status)) {
      return json({ error: "INVALID_PRESENCE" }, { status: 400 });
    }

    return json(await setSupportAgentManualStatus(session.user.id, status), {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (cause) {
    const error = cause as { code?: string; cause?: { code?: string } } | null;
    console.error("[support.presence.update]", {
      action: body.action === "heartbeat" ? "heartbeat" : "status",
      causeType: cause instanceof Error ? cause.name : typeof cause,
      databaseCode: error?.code ?? error?.cause?.code ?? null,
    });

    return json({ error: "PRESENCE_UNAVAILABLE" }, {
      status: 503,
      headers: { "Cache-Control": "no-store" },
    });
  }
};
