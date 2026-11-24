import { and, eq } from "drizzle-orm";
import { getDatabase } from "$lib/server/db";
import { customerContacts } from "$lib/server/db/supportSchema";
import { customerF10Identities } from "$lib/server/db/customerPortalSchema";
import type { CustomerF10PortalSession } from "$lib/server/customerPortal/customerF10AuthRepository";
import { normalizeCustomerProfileName } from "$lib/support/customerProfile";

export async function updateCustomerProfileName(session: CustomerF10PortalSession, value: unknown) {
  const name = normalizeCustomerProfileName(value);
  if (!name) throw new Error("INVALID_CUSTOMER_NAME");
  const db = getDatabase();
  return db.transaction(async (tx) => {
    const [identity] = await tx.select({ contactId: customerF10Identities.customerContactId })
      .from(customerF10Identities)
      .where(eq(customerF10Identities.legacyUserId, session.legacyUserId))
      .limit(1);
    if (!identity || identity.contactId !== session.contactId) throw new Error("CUSTOMER_AUTH_REQUIRED");
    const now = new Date();
    const [contact] = await tx.update(customerContacts)
      .set({ name, nameConfirmedAt: now, updatedAt: now })
      .where(and(eq(customerContacts.id, session.contactId), eq(customerContacts.active, true)))
      .returning({ name: customerContacts.name });
    if (!contact) throw new Error("CUSTOMER_AUTH_REQUIRED");
    return { name: contact.name, requiresNameConfirmation: false };
  });
}
