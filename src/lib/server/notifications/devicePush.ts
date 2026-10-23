import {
  createCipheriv, createECDH, createPrivateKey, createHmac,
  randomBytes, sign,
} from "node:crypto";
import { env } from "$env/dynamic/private";
import { and, eq, inArray } from "drizzle-orm";
import { getDatabase } from "$lib/server/db";
import { notificationPushSubscriptions } from "$lib/server/db/notificationPushSchema";

type ClientSubscription = {
  endpoint: string;
  keys: { p256dh: string; auth: string };
};
type PushAlert = { id: string; title: string; body: string; kind: string };

function publicPrivateKeys() {
  const privateEncoded = env.F10_PUSH_VAPID_PRIVATE_KEY?.trim();
  if (!privateEncoded) return null;
  const privateBytes = Buffer.from(privateEncoded, "base64url");
  if (privateBytes.length !== 32) return null;
  const ecdh = createECDH("prime256v1");
  ecdh.setPrivateKey(privateBytes);
  const publicKey = ecdh.getPublicKey(undefined, "uncompressed");
  const expected = env.F10_PUSH_VAPID_PUBLIC_KEY?.trim();
  if (expected && expected !== publicKey.toString("base64url")) return null;
  const privateKey = createPrivateKey({
    key: {
      kty: "EC", crv: "P-256",
      x: publicKey.subarray(1, 33).toString("base64url"),
      y: publicKey.subarray(33).toString("base64url"),
      d: privateBytes.toString("base64url"),
    },
    format: "jwk",
  });
  return { publicKey, privateKey };
}

export function pushPublicKey(): string | null {
  return publicPrivateKeys()?.publicKey.toString("base64url") ?? null;
}

function pushEndpoint(value: string): URL | null {
  if (value.length > 2048) return null;
  try {
    const url = new URL(value);
    if (url.protocol !== "https:" || url.port && url.port !== "443" ||
      url.username || url.password || url.hash) return null;
    const host = url.hostname.toLowerCase();
    const permitted = [
      "fcm.googleapis.com", "updates.push.services.mozilla.com",
      "web.push.apple.com", "api.push.apple.com",
    ];
    if (!permitted.includes(host) && !host.endsWith(".push.apple.com") &&
      !host.endsWith(".notify.windows.com")) return null;
    return url;
  } catch {
    return null;
  }
}

export function validatePushSubscription(raw: unknown): ClientSubscription | null {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const value = raw as Record<string, unknown>;
  const keys = value.keys as Record<string, unknown> | undefined;
  const endpoint = typeof value.endpoint === "string" ? value.endpoint : "";
  const p256dh = typeof keys?.p256dh === "string" ? keys.p256dh : "";
  const auth = typeof keys?.auth === "string" ? keys.auth : "";
  if (!pushEndpoint(endpoint) || p256dh.length > 150 || auth.length > 100) return null;
  if (Buffer.from(p256dh, "base64url").length !== 65 ||
    Buffer.from(auth, "base64url").length !== 16) return null;
  return { endpoint, keys: { p256dh, auth } };
}

export async function saveDeviceSubscription(userId: string, subscription: ClientSubscription): Promise<string> {
  const db = getDatabase();
  const [saved] = await db.insert(notificationPushSubscriptions).values({
    userId, endpoint: subscription.endpoint,
    p256dh: subscription.keys.p256dh, authSecret: subscription.keys.auth,
  }).onConflictDoUpdate({
    target: notificationPushSubscriptions.endpoint,
    set: {
      userId,
      p256dh: subscription.keys.p256dh,
      authSecret: subscription.keys.auth,
      updatedAt: new Date(),
    },
  }).returning({ id: notificationPushSubscriptions.id });
  if (!saved) throw new Error("PUSH_SUBSCRIPTION_NOT_SAVED");
  return saved.id;
}

export async function isDeviceSubscriptionLinked(userId: string, deviceId: string | undefined): Promise<boolean> {
  if (!deviceId || !/^[a-f0-9-]{36}$/i.test(deviceId)) return false;
  const [row] = await getDatabase().select({ id: notificationPushSubscriptions.id })
    .from(notificationPushSubscriptions)
    .where(and(
      eq(notificationPushSubscriptions.id, deviceId),
      eq(notificationPushSubscriptions.userId, userId),
    )).limit(1);
  return Boolean(row);
}

export async function removeDeviceSubscriptionById(userId: string, deviceId: string | undefined): Promise<void> {
  if (!deviceId || !/^[a-f0-9-]{36}$/i.test(deviceId)) return;
  await getDatabase().delete(notificationPushSubscriptions).where(and(
    eq(notificationPushSubscriptions.id, deviceId),
    eq(notificationPushSubscriptions.userId, userId),
  ));
}

export async function removeDeviceSubscription(userId: string, endpoint: string): Promise<void> {
  await getDatabase().delete(notificationPushSubscriptions)
    .where(and(eq(notificationPushSubscriptions.userId, userId),
      eq(notificationPushSubscriptions.endpoint, endpoint)));
}

function hkdfExtract(salt: Buffer, key: Buffer): Buffer {
  return createHmac("sha256", salt).update(key).digest();
}
function hkdfExpand(key: Buffer, info: Buffer, length: number): Buffer {
  const block = createHmac("sha256", key).update(info).update(Buffer.from([1])).digest();
  return block.subarray(0, length);
}

function encryptPayload(subscription: ClientSubscription, data: object): Buffer {
  const recipientPublic = Buffer.from(subscription.keys.p256dh, "base64url");
  const auth = Buffer.from(subscription.keys.auth, "base64url");
  const sender = createECDH("prime256v1");
  sender.generateKeys();
  const senderPublic = sender.getPublicKey(undefined, "uncompressed");
  const shared = sender.computeSecret(recipientPublic);
  const sharedPrk = hkdfExtract(auth, shared);
  const info = Buffer.concat([Buffer.from("WebPush: info\0"), recipientPublic, senderPublic]);
  const ikm = hkdfExpand(sharedPrk, info, 32);
  const salt = randomBytes(16);
  const encryptionPrk = hkdfExtract(salt, ikm);
  const contentKey = hkdfExpand(encryptionPrk, Buffer.from("Content-Encoding: aes128gcm\0"), 16);
  const nonce = hkdfExpand(encryptionPrk, Buffer.from("Content-Encoding: nonce\0"), 12);
  const plaintext = Buffer.concat([Buffer.from(JSON.stringify(data), "utf8"), Buffer.from([2])]);
  if (plaintext.length > 3800) throw new Error("PUSH_PAYLOAD_TOO_LARGE");
  const cipher = createCipheriv("aes-128-gcm", contentKey, nonce);
  const encrypted = Buffer.concat([cipher.update(plaintext), cipher.final(), cipher.getAuthTag()]);
  const recordSize = Buffer.alloc(4);
  recordSize.writeUInt32BE(4096, 0);
  return Buffer.concat([salt, recordSize, Buffer.from([senderPublic.length]), senderPublic, encrypted]);
}

function vapidToken(url: URL, privateKey: ReturnType<typeof createPrivateKey>) {
  const header = Buffer.from(JSON.stringify({ typ: "JWT", alg: "ES256" })).toString("base64url");
  const contact = env.F10_PUSH_CONTACT_EMAIL?.trim() || "suporte@f10.com.br";
  const claims = Buffer.from(JSON.stringify({
    aud: url.origin,
    exp: Math.floor(Date.now() / 1000) + 3600,
    sub: "mailto:" + contact,
  })).toString("base64url");
  const unsigned = header + "." + claims;
  const signature = sign("SHA256", Buffer.from(unsigned), {
    key: privateKey, dsaEncoding: "ieee-p1363",
  }).toString("base64url");
  return unsigned + "." + signature;
}

export async function sendDevicePushAlerts(
  rows: Array<{ userId: string } & PushAlert>,
): Promise<void> {
  const signing = publicPrivateKeys();
  if (!signing || rows.length === 0) return;
  const byUser = new Map<string, PushAlert[]>();
  for (const item of rows) {
    if (!byUser.has(item.userId)) byUser.set(item.userId, []);
    byUser.get(item.userId)!.push(item);
  }
  const users = [...byUser.keys()];
  const subscriptions = await getDatabase()
    .select()
    .from(notificationPushSubscriptions)
    .where(inArray(notificationPushSubscriptions.userId, users))
    .limit(300);
  const requests = subscriptions.flatMap((sub) =>
    (byUser.get(sub.userId) ?? []).map((alert) => ({ sub, alert }))
  ).slice(0, 300);

  for (let offset = 0; offset < requests.length; offset += 8) {
    await Promise.allSettled(requests.slice(offset, offset + 8).map(async ({ sub, alert }) => {
      const url = pushEndpoint(sub.endpoint);
      if (!url) return;
      const subscription = {
        endpoint: sub.endpoint,
        keys: { p256dh: sub.p256dh, auth: sub.authSecret },
      };
      try {
        const encrypted = encryptPayload(subscription, {
          title: alert.title.slice(0, 120),
          body: alert.body.slice(0, 180),
          kind: alert.kind,
          url: "/app/notifications/open/" + alert.id,
          id: alert.id,
        });
        const result = await fetch(url.toString(), {
          method: "POST",
          headers: {
            "Authorization": "vapid t=" + vapidToken(url, signing.privateKey) +
              ", k=" + signing.publicKey.toString("base64url"),
            "Content-Encoding": "aes128gcm",
            "Content-Type": "application/octet-stream",
            "TTL": "3600",
            ...(url.hostname.toLowerCase().endsWith(".notify.windows.com")
              ? { "X-WNS-Type": "wns/raw" }
              : { "Urgency": "high" }),
          },
          body: new Uint8Array(encrypted),
          cache: "no-store",
          redirect: "error",
          signal: AbortSignal.timeout(5_000),
        });
        if (result.status === 404 || result.status === 410) {
          await getDatabase().delete(notificationPushSubscriptions)
            .where(eq(notificationPushSubscriptions.id, sub.id));
        }
        if (!result.ok && result.status !== 404 && result.status !== 410) {
          console.warn("[notification.push.delivery]", { status: result.status });
        }
      } catch (error) {
        console.warn("[notification.push.delivery]", {
          error: error instanceof Error ? error.name : "DELIVERY_FAILED",
        });
      }
    }));
  }
}
