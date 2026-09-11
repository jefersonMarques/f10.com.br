import { createHash, timingSafeEqual } from "node:crypto";
import { env } from "$env/dynamic/private";
import { json, type RequestHandler } from "@sveltejs/kit";
import { enqueueBrevoConversationWebhook } from "$lib/server/support/emailInboundService";
import { startSupportEmailInboundWorker } from "$lib/server/support/emailInboundWorker";

const MAX_WEBHOOK_BYTES = 2 * 1024 * 1024;

type JsonObject = Record<string, unknown>;

function isJsonObject(value: unknown): value is JsonObject {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function secureEqual(left: string, right: string): boolean {
  const leftHash = createHash("sha256").update(left).digest();
  const rightHash = createHash("sha256").update(right).digest();
  return timingSafeEqual(leftHash, rightHash);
}

function bearerToken(request: Request): string {
  const authorization = request.headers.get("authorization")?.trim() ?? "";
  if (!authorization.toLowerCase().startsWith("bearer ")) return "";
  return authorization.slice(7).trim();
}

function isAuthorized(request: Request): boolean {
  const expected = env.BREVO_CONVERSATIONS_WEBHOOK_TOKEN?.trim() ?? "";
  const received = bearerToken(request);
  return Boolean(expected && received && secureEqual(received, expected));
}

export const POST: RequestHandler = async ({ request }) => {
  if (!env.BREVO_CONVERSATIONS_WEBHOOK_TOKEN?.trim()) {
    console.error("[brevo-conversations-webhook] token not configured");
    return json({ accepted: false }, { status: 503 });
  }
  if (!isAuthorized(request)) {
    return json({ accepted: false }, { status: 401 });
  }

  const rawBody = await request.text();
  if (Buffer.byteLength(rawBody, "utf8") > MAX_WEBHOOK_BYTES) {
    return json({ accepted: false }, { status: 413 });
  }

  let payload: unknown;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return json({ accepted: false }, { status: 400 });
  }
  if (!isJsonObject(payload)) {
    return json({ accepted: false }, { status: 400 });
  }

  const payloadHash = createHash("sha256").update(rawBody).digest("hex");
  const event = await enqueueBrevoConversationWebhook({ payload, payloadHash });
  startSupportEmailInboundWorker();

  return json(
    { accepted: true, duplicate: event.duplicate },
    {
      status: 202,
      headers: { "Cache-Control": "no-store" },
    },
  );
};
