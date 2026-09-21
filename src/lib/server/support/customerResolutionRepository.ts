import { and, eq, or, sql } from "drizzle-orm";
import { getDatabase } from "$lib/server/db";
import {
  customerContacts,
  customerOrganizations,
} from "$lib/server/db/supportSchema";

export type ResolveCustomerContactInput = {
  contactId?: string | null;
  name: string;
  email: string;
  phone: string;
  whatsapp?: string;
  organizationName?: string;
};

function normalizePhone(value: string): string {
  return value.replace(/\D/g, "");
}

export async function resolveCustomerContact(
  input: ResolveCustomerContactInput,
): Promise<string> {
  const db = getDatabase();

  if (input.contactId) {
    const [selected] = await db
      .select({ id: customerContacts.id })
      .from(customerContacts)
      .where(
        and(
          eq(customerContacts.id, input.contactId),
          eq(customerContacts.active, true),
        ),
      )
      .limit(1);
    if (!selected) throw new Error("CUSTOMER_CONTACT_NOT_FOUND");
    return selected.id;
  }

  const normalizedEmail = input.email.trim().toLowerCase();
  if (normalizedEmail) {
    const [existing] = await db
      .select({ id: customerContacts.id })
      .from(customerContacts)
      .where(
        and(
          eq(customerContacts.active, true),
          sql`lower(${customerContacts.email}) = ${normalizedEmail}`,
        ),
      )
      .limit(1);
    if (existing) return existing.id;
  }

  const normalizedPhone = normalizePhone(input.phone);
  if (normalizedPhone.length >= 8) {
    const [existing] = await db
      .select({ id: customerContacts.id })
      .from(customerContacts)
      .where(
        and(
          eq(customerContacts.active, true),
          or(
            sql`regexp_replace(coalesce(${customerContacts.phone}, ''), '\\D', '', 'g') = ${normalizedPhone}`,
            sql`regexp_replace(coalesce(${customerContacts.whatsapp}, ''), '\\D', '', 'g') = ${normalizedPhone}`,
          ),
        ),
      )
      .limit(1);
    if (existing) return existing.id;
  }

  return db.transaction(async (tx) => {
    let organizationId: string | null = null;
    const organizationName = input.organizationName?.trim() ?? "";

    if (organizationName) {
      const [organization] = await tx
        .insert(customerOrganizations)
        .values({ name: organizationName })
        .returning({ id: customerOrganizations.id });
      organizationId = organization?.id ?? null;
    }

    const [contact] = await tx
      .insert(customerContacts)
      .values({
        organizationId,
        name: input.name.trim(),
        email: normalizedEmail || null,
        phone: input.phone.trim() || null,
        whatsapp: input.whatsapp?.trim() || null,
      })
      .returning({ id: customerContacts.id });

    if (!contact) throw new Error("CUSTOMER_NOT_CREATED");
    return contact.id;
  });
}
