import { json, type RequestHandler } from "@sveltejs/kit";
import { getSessionUser, SESSION_COOKIE_NAME } from "$lib/server/auth/session";
import {
  pushPublicKey, validatePushSubscription, saveDeviceSubscription, removeDeviceSubscription,
} from "$lib/server/notifications/devicePush";

async function userFromCookies(cookies: Parameters<RequestHandler>[0]["cookies"]) {
  const token = cookies.get(SESSION_COOKIE_NAME);
  return token ? (await getSessionUser(token))?.user ?? null : null;
}

function allowedOrigin(request: Request): boolean {
  const origin = request.headers.get("origin");
  return !!origin && origin === new URL(request.url).origin;
}

export const GET: RequestHandler = async ({ cookies }) => {
  const user = await userFromCookies(cookies);
  if (!user) return json({ error: "UNAUTHORIZED" }, { status: 401 });
  const publicKey = pushPublicKey();
  return json({ enabled: Boolean(publicKey), publicKey }, {
    headers: { "Cache-Control": "no-store" },
  });
};

export const POST: RequestHandler = async ({ cookies, request }) => {
  const user = await userFromCookies(cookies);
  if (!user) return json({ error: "UNAUTHORIZED" }, { status: 401 });
  if (!allowedOrigin(request) || !pushPublicKey()) return json({ error: "NOT_CONFIGURED" }, { status: 403 });
  const text = await request.text();
  if (text.length > 4_096) return json({ error: "INVALID_DATA" }, { status: 400 });
  let parsed: unknown;
  try { parsed = JSON.parse(text); } catch { return json({ error: "INVALID_JSON" }, { status: 400 }); }
  const subscription = validatePushSubscription(parsed);
  if (!subscription) return json({ error: "INVALID_SUBSCRIPTION" }, { status: 400 });
  await saveDeviceSubscription(user.id, subscription);
  return json({ enabled: true }, { headers: { "Cache-Control": "no-store" } });
};

export const DELETE: RequestHandler = async ({ cookies, request }) => {
  const user = await userFromCookies(cookies);
  if (!user) return json({ error: "UNAUTHORIZED" }, { status: 401 });
  if (!allowedOrigin(request)) return json({ error: "INVALID_ORIGIN" }, { status: 403 });
  const text = await request.text();
  if (text.length > 4_096) return json({ error: "INVALID_DATA" }, { status: 400 });
  let endpoint: string | undefined;
  try { endpoint = JSON.parse(text)?.endpoint; } catch { /* ignored */ }
  if (typeof endpoint !== "string" || endpoint.length > 2048) {
    return json({ error: "INVALID_ENDPOINT" }, { status: 400 });
  }
  await removeDeviceSubscription(user.id, endpoint);
  return json({ enabled: false }, { headers: { "Cache-Control": "no-store" } });
};
