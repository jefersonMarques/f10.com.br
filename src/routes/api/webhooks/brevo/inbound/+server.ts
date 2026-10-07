import { createHash, timingSafeEqual } from "node:crypto";
import { env } from "$env/dynamic/private";
import { json, type RequestHandler } from "@sveltejs/kit";
import { enqueueBrevoInboundWebhook } from "$lib/server/support/emailInboundParseService";

const MAX_WEBHOOK_BYTES = 5 * 1024 * 1024;

type JsonObject = Record<string, unknown>;

function isJsonObject(value: unknown): value is JsonObject {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function secureEqual(left: string, right: string): boolean {
  const leftHash = createHash("sha256").update(left).digest();
  const rightHash = createHash("sha256").update(right).digest();
  return timingSafeEqual(leftHash, rightHash);
}

function receivedToken(request: Request): string {
  const explicit = request.headers.get("x-f10-webhook-token")?.trim() ?? "";
  if (explicit) return explicit;

  const authorization = request.headers.get("authorization")?.trim() ?? "";
  return authorization.toLowerCase().startsWith("bearer ")
    ? authorization.slice(7).trim()
    : "";
}

export const POST: RequestHandler = async ({ request }) => {
  const expected = env.BREVO_INBOUND_WEBHOOK_TOKEN?.trim() ?? "";
  if (!expected) {
    console.error("[brevo-inbound-webhook] token not configured");
    return json({ accepted: false }, { status: 503 });
  }

  const received = receivedToken(request);
  if (!received || !secureEqual(received, expected)) {
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

  if (!isJsonObject(payload) || !Array.isArray(payload.items)) {
    return json({ accepted: false }, { status: 400 });
  }

  const payloadHash = createHash("sha256").update(rawBody).digest("hex");
  const event = await enqueueBrevoInboundWebhook({ payload, payloadHash });

  return json(
    { accepted: true, duplicate: event.duplicate },
    { status: 202, headers: { "Cache-Control": "no-store" } },
  );
};
