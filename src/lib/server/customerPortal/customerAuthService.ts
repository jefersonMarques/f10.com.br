import { createHash, randomBytes } from "node:crypto";
import { and, eq, gt, isNull, or, sql } from "drizzle-orm";
import { getDatabase } from "$lib/server/db";
import {
  customerAuthActivationTokens,
  customerAuthIdentities,
  customerPortalSessions,
} from "$lib/server/db/customerPortalSchema";
import { serviceRequests } from "$lib/server/db/serviceRequestSchema";
import { supportEmailThreads } from "$lib/server/db/supportEmailSchema";
import { customerContacts, ticketEvents, ticketMessages, tickets } from "$lib/server/db/supportSchema";
import { hashPassword, verifyPassword } from "$lib/server/auth/password";
import { buildEmailHtml } from "$lib/server/email/emailTemplate";
import { sendTransactionalEmail } from "$lib/server/email/transactionalEmail";
import { getCustomerPortalBaseUrl } from "$lib/server/customerPortal/customerPortalMailer";

const ACTIVATION_TTL_MS = 48 * 60 * 60 * 1000;
const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000;

function hashToken(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

function randomToken(): string {
  return randomBytes(32).toString("base64url");
}

function normalizeEmail(value: string): string {
  return value.trim().toLowerCase();
}

async function createPortalSession(customerContactId: string): Promise<{ token: string; expiresAt: Date }> {
  const token = randomToken();
  const now = new Date();
  const expiresAt = new Date(now.getTime() + SESSION_TTL_MS);

  await getDatabase().insert(customerPortalSessions).values({
    customerContactId,
    tokenHash: hashToken(token),
    authSource: "portal_password",
    expiresAt,
    lastSeenAt: now,
  });

  return { token, expiresAt };
}

export async function createCustomerPortalCredentialInvite(input: {
  customerContactId: string;
  email: string;
  password: string;
  name: string;
  requestOrigin?: string;
}): Promise<void> {
  const email = normalizeEmail(input.email);
  if (!email || input.password.length < 8 || input.password.length > 256) {
    throw new Error("CUSTOMER_PORTAL_CREDENTIAL_INVALID");
  }

  const db = getDatabase();
  const passwordHash = await hashPassword(input.password);
  const now = new Date();
  const [existing] = await db
    .select({
      id: customerAuthIdentities.id,
      customerContactId: customerAuthIdentities.customerContactId,
    })
    .from(customerAuthIdentities)
    .where(
      and(
        eq(customerAuthIdentities.provider, "portal"),
        sql`lower(${customerAuthIdentities.login}) = ${email}`,
      ),
    )
    .limit(1);

  if (existing && existing.customerContactId !== input.customerContactId) {
    throw new Error("CUSTOMER_PORTAL_LOGIN_ALREADY_IN_USE");
  }

  let identityId = existing?.id ?? null;
  if (identityId) {
    await db
      .update(customerAuthIdentities)
      .set({
        passwordHash,
        verifiedAt: null,
        updatedAt: now,
      })
      .where(eq(customerAuthIdentities.id, identityId));
  } else {
    const [created] = await db
      .insert(customerAuthIdentities)
      .values({
        customerContactId: input.customerContactId,
        provider: "portal",
        login: email,
        passwordHash,
        verifiedAt: null,
        updatedAt: now,
      })
      .returning({ id: customerAuthIdentities.id });
    identityId = created?.id ?? null;
  }

  if (!identityId) throw new Error("CUSTOMER_PORTAL_IDENTITY_NOT_CREATED");

  const token = randomToken();
  const expiresAt = new Date(now.getTime() + ACTIVATION_TTL_MS);
  await db.insert(customerAuthActivationTokens).values({
    identityId,
    tokenHash: hashToken(token),
    expiresAt,
  });

  const baseUrl = getCustomerPortalBaseUrl(input.requestOrigin || "https://f10.com.br");
  const activationUrl = `${baseUrl}/cliente/ativar?token=${encodeURIComponent(token)}`;

  await sendTransactionalEmail({
    to: { email, name: input.name },
    subject: "Ative seu acesso à área do cliente F10",
    textContent: [
      `Olá, ${input.name || "cliente"}.`,
      "",
      "Seu acesso à área do cliente F10 foi criado.",
      `Ative a conta por este link: ${activationUrl}`,
      "",
      "O link expira em 48 horas.",
    ].join("\n"),
    htmlContent: buildEmailHtml({
      eyebrow: "Área do Cliente",
      title: "Ative seu acesso",
      greeting: `Olá, ${input.name || "cliente"}.`,
      body: [
        "Seu acesso à área do cliente F10 foi criado.",
        "Confirme seu e-mail para acompanhar tickets, respostas e etapas do atendimento.",
      ],
      action: { label: "Ativar acesso", href: activationUrl },
      footer: "O link de ativação expira em 48 horas.",
    }),
  });
}

export async function activateCustomerPortalCredential(token: string): Promise<boolean> {
  const cleanToken = token.trim();
  if (!/^[A-Za-z0-9_-]{40,120}$/.test(cleanToken)) return false;

  const db = getDatabase();
  const now = new Date();

  const identity = await db.transaction(async (tx) => {
    const [activation] = await tx
      .update(customerAuthActivationTokens)
      .set({ usedAt: now })
      .where(
        and(
          eq(customerAuthActivationTokens.tokenHash, hashToken(cleanToken)),
          gt(customerAuthActivationTokens.expiresAt, now),
          isNull(customerAuthActivationTokens.usedAt),
        ),
      )
      .returning({ identityId: customerAuthActivationTokens.identityId });

    if (!activation) return null;

    const [updated] = await tx
      .update(customerAuthIdentities)
      .set({ verifiedAt: now, updatedAt: now })
      .where(
        and(
          eq(customerAuthIdentities.id, activation.identityId),
          eq(customerAuthIdentities.provider, "portal"),
        ),
      )
      .returning({
        customerContactId: customerAuthIdentities.customerContactId,
        login: customerAuthIdentities.login,
      });

    return updated ?? null;
  });

  if (!identity) return false;
  await reconcileCustomerTickets(identity.customerContactId, identity.login);
  return true;
}

export async function authenticateCustomerPortalCredential(
  emailValue: string,
  password: string,
): Promise<{ token: string; expiresAt: Date } | null> {
  const email = normalizeEmail(emailValue);
  if (!email || !password) return null;

  const [identity] = await getDatabase()
    .select({
      customerContactId: customerAuthIdentities.customerContactId,
      passwordHash: customerAuthIdentities.passwordHash,
      verifiedAt: customerAuthIdentities.verifiedAt,
    })
    .from(customerAuthIdentities)
    .innerJoin(customerContacts, eq(customerContacts.id, customerAuthIdentities.customerContactId))
    .where(
      and(
        eq(customerAuthIdentities.provider, "portal"),
        sql`lower(${customerAuthIdentities.login}) = ${email}`,
        eq(customerContacts.active, true),
      ),
    )
    .limit(1);

  if (!identity?.passwordHash || !identity.verifiedAt) return null;
  if (!(await verifyPassword(password, identity.passwordHash))) return null;

  await reconcileCustomerTickets(identity.customerContactId, email);
  return createPortalSession(identity.customerContactId);
}

export async function upsertF10CustomerIdentity(input: {
  customerContactId: string;
  legacyUserId: string;
  login: string;
}): Promise<void> {
  const login = normalizeEmail(input.login);
  const now = new Date();
  const db = getDatabase();

  const [existing] = await db
    .select({ id: customerAuthIdentities.id })
    .from(customerAuthIdentities)
    .where(
      and(
        eq(customerAuthIdentities.provider, "f10"),
        eq(customerAuthIdentities.providerUserId, input.legacyUserId),
      ),
    )
    .limit(1);

  if (existing) {
    await db
      .update(customerAuthIdentities)
      .set({
        customerContactId: input.customerContactId,
        login,
        verifiedAt: now,
        updatedAt: now,
      })
      .where(eq(customerAuthIdentities.id, existing.id));
  } else {
    await db.insert(customerAuthIdentities).values({
      customerContactId: input.customerContactId,
      provider: "f10",
      providerUserId: input.legacyUserId,
      login,
      verifiedAt: now,
      updatedAt: now,
    });
  }

  await reconcileCustomerTickets(input.customerContactId, login);
}

export async function reconcileCustomerTickets(
  customerContactId: string,
  verifiedEmail: string,
): Promise<number> {
  const email = normalizeEmail(verifiedEmail);
  if (!email) return 0;

  const db = getDatabase();
  const candidateRows = await db
    .select({ id: tickets.id })
    .from(tickets)
    .leftJoin(supportEmailThreads, eq(supportEmailThreads.ticketId, tickets.id))
    .leftJoin(serviceRequests, eq(serviceRequests.ticketId, tickets.id))
    .where(
      and(
        isNull(tickets.customerContactId),
        or(
          sql`lower(coalesce(${supportEmailThreads.senderEmail}, '')) = ${email}`,
          sql`lower(coalesce(${serviceRequests.data}->>'managerEmail', '')) = ${email}`,
          sql`lower(coalesce(${serviceRequests.data}->>'email', '')) = ${email}`,
        ),
      ),
    )
    .limit(200);

  const ticketIds = Array.from(new Set(candidateRows.map((row) => row.id)));
  if (ticketIds.length === 0) return 0;

  let linked = 0;
  await db.transaction(async (tx) => {
    for (const ticketId of ticketIds) {
      const [updated] = await tx
        .update(tickets)
        .set({ customerContactId, updatedAt: new Date() })
        .where(and(eq(tickets.id, ticketId), isNull(tickets.customerContactId)))
        .returning({ id: tickets.id });
      if (!updated) continue;

      linked += 1;
      await tx
        .update(ticketMessages)
        .set({ customerContactId })
        .where(
          and(
            eq(ticketMessages.ticketId, ticketId),
            eq(ticketMessages.authorType, "customer"),
            isNull(ticketMessages.customerContactId),
          ),
        );
      await tx
        .update(serviceRequests)
        .set({ customerContactId, updatedAt: new Date() })
        .where(eq(serviceRequests.ticketId, ticketId));
      await tx.insert(ticketEvents).values({
        ticketId,
        eventType: "ticket.customer.auto_linked",
        metadata: {
          customerContactId,
          matchedBy: "verified_email",
        },
      });
    }
  });

  return linked;
}
