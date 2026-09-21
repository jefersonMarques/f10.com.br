import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { dev } from "$app/environment";
import { env } from "$env/dynamic/private";
import type { Cookies } from "@sveltejs/kit";
import { and, count, eq, gte, isNull, lte, sql } from "drizzle-orm";
import { getDatabase } from "$lib/server/db";
import { helpPublicAiRequests } from "$lib/server/db/helpPublicAiSchema";
import type { HelpPublicAiSettings } from "$lib/server/settings/operationsSettingsRepository";

const COOKIE_NAME = "f10_help_ai_session";
const COOKIE_TTL_SECONDS = 30 * 24 * 60 * 60;
const REQUEST_LEASE_MS = 70_000;
const GLOBAL_RATE_LIMIT_LOCK = 91_710_421;

function getSecret(): string {
  const secret = env.HELP_PUBLIC_AI_SECRET?.trim();
  if (!secret || secret.length < 32) {
    throw new Error("HELP_PUBLIC_AI_SECRET_NOT_CONFIGURED");
  }
  return secret;
}

function hmac(value: string): string {
  return createHmac("sha256", getSecret()).update(value).digest("base64url");
}

function stableKey(scope: string, value: string): string {
  return createHmac("sha256", getSecret())
    .update(`${scope}:${value}`)
    .digest("hex");
}

function signaturesMatch(left: string, right: string): boolean {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);
  return leftBuffer.length === rightBuffer.length && timingSafeEqual(leftBuffer, rightBuffer);
}

function parseCookie(value: string): string | null {
  const separator = value.lastIndexOf(".");
  if (separator <= 0) return null;
  const token = value.slice(0, separator);
  const signature = value.slice(separator + 1);
  if (!token || !signature || !signaturesMatch(signature, hmac(`session:${token}`))) return null;
  return token;
}

export function isHelpPublicAiSecretConfigured(): boolean {
  const secret = env.HELP_PUBLIC_AI_SECRET?.trim();
  return Boolean(secret && secret.length >= 32);
}

export function getOrCreateHelpPublicAiSessionKey(cookies: Cookies): string {
  const existing = cookies.get(COOKIE_NAME) ?? "";
  const token = existing ? parseCookie(existing) : null;
  const effectiveToken = token ?? randomBytes(24).toString("base64url");

  if (!token) {
    cookies.set(COOKIE_NAME, `${effectiveToken}.${hmac(`session:${effectiveToken}`)}`, {
      path: "/",
      httpOnly: true,
      sameSite: "lax",
      secure: !dev,
      maxAge: COOKIE_TTL_SECONDS,
    });
  }

  return stableKey("session", effectiveToken);
}

export function createHelpPublicAiIpKey(clientAddress: string): string {
  return stableKey("ip", clientAddress || "unknown");
}

export async function claimHelpPublicAiRequest(
  sessionKey: string,
  ipKey: string,
  settings: HelpPublicAiSettings,
): Promise<string> {
  const db = getDatabase();
  const now = new Date();
  const windowStartedAt = new Date(
    now.getTime() - settings.rateLimitWindowMinutes * 60_000,
  );
  const hourStartedAt = new Date(now.getTime() - 60 * 60_000);

  return db.transaction(async (tx) => {
    await tx.execute(sql`SELECT pg_advisory_xact_lock(${GLOBAL_RATE_LIMIT_LOCK})`);

    await tx
      .update(helpPublicAiRequests)
      .set({
        status: "expired",
        failureCode: "LEASE_EXPIRED",
        finishedAt: now,
      })
      .where(
        and(
          isNull(helpPublicAiRequests.finishedAt),
          lte(helpPublicAiRequests.leaseExpiresAt, now),
        ),
      );

    const activeSession = await tx
      .select({ value: count() })
      .from(helpPublicAiRequests)
      .where(
        and(
          eq(helpPublicAiRequests.sessionKey, sessionKey),
          isNull(helpPublicAiRequests.finishedAt),
        ),
      );
    if (Number(activeSession[0]?.value ?? 0) > 0) {
      throw new Error("HELP_PUBLIC_AI_BUSY");
    }

    const sessionUsage = await tx
      .select({ value: count() })
      .from(helpPublicAiRequests)
      .where(
        and(
          eq(helpPublicAiRequests.sessionKey, sessionKey),
          gte(helpPublicAiRequests.startedAt, windowStartedAt),
        ),
      );
    if (Number(sessionUsage[0]?.value ?? 0) >= settings.sessionRequestLimit) {
      throw new Error("HELP_PUBLIC_AI_SESSION_RATE_LIMITED");
    }

    const ipUsage = await tx
      .select({ value: count() })
      .from(helpPublicAiRequests)
      .where(
        and(
          eq(helpPublicAiRequests.ipKey, ipKey),
          gte(helpPublicAiRequests.startedAt, windowStartedAt),
        ),
      );
    if (Number(ipUsage[0]?.value ?? 0) >= settings.ipRequestLimit) {
      throw new Error("HELP_PUBLIC_AI_IP_RATE_LIMITED");
    }

    const globalUsage = await tx
      .select({ value: count() })
      .from(helpPublicAiRequests)
      .where(gte(helpPublicAiRequests.startedAt, hourStartedAt));
    if (Number(globalUsage[0]?.value ?? 0) >= settings.globalRequestLimitPerHour) {
      throw new Error("HELP_PUBLIC_AI_GLOBAL_RATE_LIMITED");
    }

    const [request] = await tx
      .insert(helpPublicAiRequests)
      .values({
        sessionKey,
        ipKey,
        status: "running",
        leaseExpiresAt: new Date(now.getTime() + REQUEST_LEASE_MS),
      })
      .returning({ id: helpPublicAiRequests.id });

    if (!request) throw new Error("HELP_PUBLIC_AI_REQUEST_NOT_CREATED");
    return request.id;
  });
}

export async function finishHelpPublicAiRequest(
  requestId: string,
  result: {
    status: "answered" | "not_found" | "failed";
    model?: string;
    inputTokens?: number | null;
    outputTokens?: number | null;
    failureCode?: string | null;
  },
): Promise<void> {
  await getDatabase()
    .update(helpPublicAiRequests)
    .set({
      status: result.status,
      model: result.model?.slice(0, 160) ?? "",
      inputTokens: result.inputTokens ?? null,
      outputTokens: result.outputTokens ?? null,
      failureCode: result.failureCode?.slice(0, 160) ?? null,
      finishedAt: new Date(),
    })
    .where(eq(helpPublicAiRequests.id, requestId));
}
