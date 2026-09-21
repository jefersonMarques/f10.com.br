import { json, type RequestHandler } from "@sveltejs/kit";
import { requireAppPermission } from "$lib/server/auth/authorization";
import {
  getSupportAgentPresence,
  heartbeatSupportAgent,
  isSupportAgentManualStatus,
  setSupportAgentManualStatus,
} from "$lib/server/support/supportAgentPresence";

export const GET: RequestHandler = async ({ cookies, url }) => {
  const { session } = await requireAppPermission(
    cookies,
    "chat.respond",
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

  const { session } = await requireAppPermission(
    cookies,
    "chat.respond",
    "/app",
  );

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return json({ error: "INVALID_JSON" }, { status: 400 });
  }

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
};
