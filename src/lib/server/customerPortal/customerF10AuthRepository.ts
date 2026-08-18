import { createHash, randomBytes } from "node:crypto";
import { and, eq, gt, isNull, sql } from "drizzle-orm";
import { getDatabase } from "$lib/server/db";
import {
  customerActivityEvents,
  customerF10Identities,
  customerPortalSessions,
  type CustomerF10GroupSnapshot,
} from "$lib/server/db/customerPortalSchema";
import { customerContacts } from "$lib/server/db/supportSchema";
import {
  authenticateF10Customer,
  getAuthenticatedF10CustomerGroups,
} from "$lib/server/customerPortal/legacyF10CustomerClient";
import {
  decryptF10CustomerToken,
  encryptF10CustomerToken,
} from "$lib/server/customerPortal/customerF10TokenCrypto";

const SESSION_INACTIVITY_MS = 24 * 60 * 60 * 1000;

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

function createSessionToken(): string {
  return randomBytes(32).toString("base64url");
}

function contactFallbackName(email: string): string {
  const localPart = email.split("@")[0]?.trim();
  return localPart || "Cliente F10";
}

export function countF10Units(groups: CustomerF10GroupSnapshot[]): number {
  return groups.reduce((total, group) => total + group.unidades.length, 0);
}

export type CustomerF10PortalSession = {
  sessionId: string;
  contactId: string;
  name: string;
  email: string;
  legacyUserId: string;
  groups: CustomerF10GroupSnapshot[];
  selectedGroupId: number | null;
  selectedGroupName: string | null;
  selectedUnitId: number | null;
  selectedUnitName: string | null;
  selectedUnitSchema: string | null;
  expiresAt: Date;
};

async function findOrCreateCustomerContact(legacyUserId: string, email: string): Promise<{ id: string; name: string }> {
  const db = getDatabase();
  const [identity] = await db
    .select({
      contactId: customerF10Identities.customerContactId,
      contactName: customerContacts.name,
    })
    .from(customerF10Identities)
    .innerJoin(customerContacts, eq(customerContacts.id, customerF10Identities.customerContactId))
    .where(eq(customerF10Identities.legacyUserId, legacyUserId))
    .limit(1);

  const now = new Date();
  if (identity) {
    await Promise.all([
      db
        .update(customerF10Identities)
        .set({ loginEmail: email, lastAuthenticatedAt: now, updatedAt: now })
        .where(eq(customerF10Identities.legacyUserId, legacyUserId)),
      db
        .update(customerContacts)
        .set({ email, active: true, updatedAt: now })
        .where(eq(customerContacts.id, identity.contactId)),
    ]);
    return { id: identity.contactId, name: identity.contactName };
  }

  const contacts = await db
    .select({ id: customerContacts.id, name: customerContacts.name })
    .from(customerContacts)
    .where(
      and(
        eq(customerContacts.active, true),
        sql`lower(${customerContacts.email}) = ${email}`,
      ),
    )
    .limit(2);

  let contact = contacts.length === 1 ? contacts[0] : null;
  if (!contact) {
    const [created] = await db
      .insert(customerContacts)
      .values({ name: contactFallbackName(email), email })
      .returning({ id: customerContacts.id, name: customerContacts.name });
    if (!created) throw new Error("F10_CUSTOMER_CONTACT_NOT_CREATED");
    contact = created;
  }

  await db
    .insert(customerF10Identities)
    .values({
      legacyUserId,
      customerContactId: contact.id,
      loginEmail: email,
      firstAuthenticatedAt: now,
      lastAuthenticatedAt: now,
      updatedAt: now,
    })
    .onConflictDoUpdate({
      target: customerF10Identities.legacyUserId,
      set: {
        customerContactId: contact.id,
        loginEmail: email,
        lastAuthenticatedAt: now,
        updatedAt: now,
      },
    });

  return contact;
}

function onlyUnit(groups: CustomerF10GroupSnapshot[]) {
  const flattened = groups.flatMap((group) =>
    group.unidades.map((unit) => ({ group, unit })),
  );
  return flattened.length === 1 ? flattened[0] : null;
}

export async function createF10CustomerPortalSession(email: string, password: string) {
  const authenticated = await authenticateF10Customer(email, password);
  const contact = await findOrCreateCustomerContact(authenticated.userId, authenticated.login);
  const sessionToken = createSessionToken();
  const now = new Date();
  const selected = onlyUnit(authenticated.groups);
  const db = getDatabase();

  const [session] = await db
    .insert(customerPortalSessions)
    .values({
      customerContactId: contact.id,
      tokenHash: hashToken(sessionToken),
      authSource: "f10",
      legacyUserId: authenticated.userId,
      legacyLogin: authenticated.login,
      legacyTokenEncrypted: encryptF10CustomerToken(authenticated.token),
      legacyTokenExpiresAt: authenticated.expiresAt,
      legacyGroups: authenticated.groups,
      selectedGroupId: selected?.group.grupo_id ?? null,
      selectedGroupName: selected?.group.grupo ?? null,
      selectedUnitId: selected?.unit.unidade_id ?? null,
      selectedUnitName: selected?.unit.unidade ?? null,
      selectedUnitSchema: selected?.unit.schema ?? null,
      expiresAt: authenticated.expiresAt,
      lastSeenAt: now,
    })
    .returning({ id: customerPortalSessions.id });

  if (!session) throw new Error("F10_CUSTOMER_SESSION_NOT_CREATED");

  await db.insert(customerActivityEvents).values({
    customerContactId: contact.id,
    portalSessionId: session.id,
    legacyUserId: authenticated.userId,
    groupId: selected?.group.grupo_id ?? null,
    unitId: selected?.unit.unidade_id ?? null,
    eventType: "auth.f10.login",
    source: "customer_portal",
    path: "/cliente",
    metadata: {
      authorizedGroupCount: authenticated.groups.length,
      authorizedUnitCount: countF10Units(authenticated.groups),
      unitAutoSelected: Boolean(selected),
    },
  });

  return {
    token: sessionToken,
    expiresAt: authenticated.expiresAt,
    needsUnitSelection: !selected,
  };
}

export async function authorizeF10CustomerPortalSession(
  token: string,
): Promise<CustomerF10PortalSession | null> {
  if (!token) return null;
  const db = getDatabase();
  const now = new Date();
  const [session] = await db
    .select({
      sessionId: customerPortalSessions.id,
      contactId: customerPortalSessions.customerContactId,
      expiresAt: customerPortalSessions.expiresAt,
      lastSeenAt: customerPortalSessions.lastSeenAt,
      legacyTokenExpiresAt: customerPortalSessions.legacyTokenExpiresAt,
      legacyUserId: customerPortalSessions.legacyUserId,
      groups: customerPortalSessions.legacyGroups,
      selectedGroupId: customerPortalSessions.selectedGroupId,
      selectedGroupName: customerPortalSessions.selectedGroupName,
      selectedUnitId: customerPortalSessions.selectedUnitId,
      selectedUnitName: customerPortalSessions.selectedUnitName,
      selectedUnitSchema: customerPortalSessions.selectedUnitSchema,
      name: customerContacts.name,
      email: customerContacts.email,
    })
    .from(customerPortalSessions)
    .innerJoin(customerContacts, eq(customerContacts.id, customerPortalSessions.customerContactId))
    .where(
      and(
        eq(customerPortalSessions.tokenHash, hashToken(token)),
        eq(customerPortalSessions.authSource, "f10"),
        gt(customerPortalSessions.expiresAt, now),
        isNull(customerPortalSessions.revokedAt),
        eq(customerContacts.active, true),
      ),
    )
    .limit(1);

  if (!session || !session.email || !session.legacyUserId || !session.legacyTokenExpiresAt) return null;
  if (session.legacyTokenExpiresAt.getTime() <= now.getTime()) return null;

  if (now.getTime() - session.lastSeenAt.getTime() > SESSION_INACTIVITY_MS) {
    await db
      .update(customerPortalSessions)
      .set({ revokedAt: now })
      .where(eq(customerPortalSessions.id, session.sessionId));
    return null;
  }

  await db
    .update(customerPortalSessions)
    .set({ lastSeenAt: now })
    .where(eq(customerPortalSessions.id, session.sessionId));

  return {
    sessionId: session.sessionId,
    contactId: session.contactId,
    name: session.name,
    email: session.email,
    legacyUserId: session.legacyUserId,
    groups: session.groups,
    selectedGroupId: session.selectedGroupId,
    selectedGroupName: session.selectedGroupName,
    selectedUnitId: session.selectedUnitId,
    selectedUnitName: session.selectedUnitName,
    selectedUnitSchema: session.selectedUnitSchema,
    expiresAt: session.expiresAt,
  };
}

export async function selectF10CustomerUnit(
  sessionToken: string,
  groupId: number,
  unitId: number,
): Promise<CustomerF10PortalSession> {
  const current = await authorizeF10CustomerPortalSession(sessionToken);
  if (!current) throw new Error("F10_CUSTOMER_SESSION_INVALID");

  const db = getDatabase();
  const [stored] = await db
    .select({ encryptedToken: customerPortalSessions.legacyTokenEncrypted })
    .from(customerPortalSessions)
    .where(eq(customerPortalSessions.id, current.sessionId))
    .limit(1);
  if (!stored?.encryptedToken) throw new Error("F10_CUSTOMER_TOKEN_MISSING");

  const legacyToken = decryptF10CustomerToken(stored.encryptedToken);
  const groups = await getAuthenticatedF10CustomerGroups(legacyToken);
  const group = groups.find((item) => item.grupo_id === groupId);
  const unit = group?.unidades.find((item) => item.unidade_id === unitId);
  if (!group || !unit) throw new Error("F10_CUSTOMER_UNIT_NOT_AUTHORIZED");

  const now = new Date();
  await db
    .update(customerPortalSessions)
    .set({
      legacyGroups: groups,
      selectedGroupId: group.grupo_id,
      selectedGroupName: group.grupo,
      selectedUnitId: unit.unidade_id,
      selectedUnitName: unit.unidade,
      selectedUnitSchema: unit.schema,
      lastSeenAt: now,
    })
    .where(eq(customerPortalSessions.id, current.sessionId));

  await db.insert(customerActivityEvents).values({
    customerContactId: current.contactId,
    portalSessionId: current.sessionId,
    legacyUserId: current.legacyUserId,
    groupId: group.grupo_id,
    unitId: unit.unidade_id,
    eventType: "auth.f10.unit_selected",
    source: "customer_portal",
    path: "/cliente/unidade",
    metadata: { groupName: group.grupo, unitName: unit.unidade },
  });

  const updated = await authorizeF10CustomerPortalSession(sessionToken);
  if (!updated) throw new Error("F10_CUSTOMER_SESSION_INVALID");
  return updated;
}
