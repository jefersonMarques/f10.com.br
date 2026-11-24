import { randomUUID } from "node:crypto";
import { and, eq } from "drizzle-orm";
import { getDatabase } from "$lib/server/db";
import { customerContacts } from "$lib/server/db/supportSchema";
import { customerF10Identities } from "$lib/server/db/customerPortalSchema";
import type { CustomerF10PortalSession } from "$lib/server/customerPortal/customerF10AuthRepository";
import {
  MAX_CUSTOMER_AVATAR_BYTES,
  normalizeCustomerProfileName,
  normalizeCustomerContactEmail,
  normalizeCustomerContactPhone,
} from "$lib/support/customerProfile";
import { detectAvatar } from "$lib/server/storage/avatarImage";
import { deleteAssetObject, getAssetObject, putAssetObject } from "$lib/server/storage/assetStorage";

type ProfileInput = {
  name: unknown;
  contactEmail?: unknown;
  contactPhone?: unknown;
  avatar?: File;
  removeAvatar?: boolean;
};

function identityCondition(session: CustomerF10PortalSession) {
  return and(
    eq(customerF10Identities.legacyUserId, session.legacyUserId),
    eq(customerF10Identities.customerContactId, session.contactId),
  );
}

export async function getCustomerProfile(session: CustomerF10PortalSession) {
  const [row] = await getDatabase().select({
    name: customerContacts.name,
    contactEmail: customerF10Identities.contactEmail,
    contactPhone: customerF10Identities.contactPhone,
    avatarKey: customerF10Identities.avatarKey,
    avatarContentType: customerF10Identities.avatarContentType,
  }).from(customerF10Identities)
    .innerJoin(customerContacts, eq(customerContacts.id, customerF10Identities.customerContactId))
    .where(and(identityCondition(session), eq(customerContacts.active, true)))
    .limit(1);
  if (!row) throw new Error("CUSTOMER_AUTH_REQUIRED");
  return row;
}

export async function updateCustomerProfile(session: CustomerF10PortalSession, input: ProfileInput) {
  const name = normalizeCustomerProfileName(input.name);
  if (!name) throw new Error("INVALID_CUSTOMER_NAME");
  const contactEmail = input.contactEmail === undefined ? undefined : normalizeCustomerContactEmail(input.contactEmail);
  const contactPhone = input.contactPhone === undefined ? undefined : normalizeCustomerContactPhone(input.contactPhone);
  if (input.avatar && input.removeAvatar) throw new Error("INVALID_AVATAR");

  await getCustomerProfile(session);
  let newAvatar: { key: string; contentType: string } | null = null;
  if (input.avatar) {
    if (input.avatar.size < 1 || input.avatar.size > MAX_CUSTOMER_AVATAR_BYTES) throw new Error("INVALID_AVATAR");
    const bytes = new Uint8Array(await input.avatar.arrayBuffer());
    const detected = detectAvatar(bytes);
    if (!detected) throw new Error("INVALID_AVATAR");
    const key = `customers/${session.contactId}/avatars/${randomUUID()}.${detected.extension}`;
    await putAssetObject(key, bytes, detected.contentType);
    newAvatar = { key, contentType: detected.contentType };
  }

  const db = getDatabase();
  let result: { name: string; requiresNameConfirmation: boolean; previousAvatarKey: string | null; avatarKey: string | null };
  try {
    result = await db.transaction(async (tx) => {
      const [identity] = await tx.select({ avatarKey: customerF10Identities.avatarKey })
        .from(customerF10Identities).where(identityCondition(session)).limit(1).for("update");
      if (!identity) throw new Error("CUSTOMER_AUTH_REQUIRED");
      const now = new Date();
      const [contact] = await tx.update(customerContacts)
        .set({ name, nameConfirmedAt: now, updatedAt: now })
        .where(and(eq(customerContacts.id, session.contactId), eq(customerContacts.active, true)))
        .returning({ name: customerContacts.name });
      if (!contact) throw new Error("CUSTOMER_AUTH_REQUIRED");

      const avatarChanges = newAvatar
        ? { avatarKey: newAvatar.key, avatarContentType: newAvatar.contentType }
        : input.removeAvatar ? { avatarKey: null, avatarContentType: null } : {};
      if (contactEmail !== undefined || contactPhone !== undefined || newAvatar || input.removeAvatar) {
        await tx.update(customerF10Identities).set({
          ...(contactEmail !== undefined ? { contactEmail } : {}),
          ...(contactPhone !== undefined ? { contactPhone } : {}),
          ...avatarChanges,
          updatedAt: now,
        }).where(identityCondition(session));
      }
      return {
        name: contact.name,
        requiresNameConfirmation: false,
        previousAvatarKey: identity.avatarKey,
        avatarKey: newAvatar?.key ?? (input.removeAvatar ? null : identity.avatarKey),
      };
    });
  } catch (cause) {
    if (newAvatar) await deleteAssetObject(newAvatar.key).catch(() => undefined);
    throw cause;
  }

  if (result.previousAvatarKey && result.previousAvatarKey !== result.avatarKey) {
    await deleteAssetObject(result.previousAvatarKey).catch(() => undefined);
  }

  return { name: result.name, requiresNameConfirmation: result.requiresNameConfirmation, hasAvatar: Boolean(result.avatarKey) };
}

export async function updateCustomerProfileName(session: CustomerF10PortalSession, value: unknown) {
  return updateCustomerProfile(session, { name: value });
}

export async function getCustomerAvatarResponse(session: CustomerF10PortalSession): Promise<Response | null> {
  const profile = await getCustomerProfile(session);
  if (!profile.avatarKey || !profile.avatarContentType) return null;
  const response = await getAssetObject(profile.avatarKey);
  return new Response(response.body, {
    status: response.status,
    headers: {
      "Content-Type": profile.avatarContentType,
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
      "Cross-Origin-Resource-Policy": "same-origin",
    },
  });
}
