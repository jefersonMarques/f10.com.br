import { and, eq, isNull, sql } from "drizzle-orm";
import { createCustomerPortalCredentialInvite } from "$lib/server/customerPortal/customerAuthService";
import { getDatabase } from "$lib/server/db";
import { customerAuthIdentities } from "$lib/server/db/customerPortalSchema";
import { serviceRequests } from "$lib/server/db/serviceRequestSchema";
import {
  customerContacts,
  customerOrganizations,
  ticketEvents,
  tickets,
} from "$lib/server/db/supportSchema";

type PublicCustomerOnboardingInput = {
  ticketId: string;
  serviceRequestId: string;
  name: string;
  email: string;
  whatsapp: string;
  organizationName: string;
  organizationDocument: string;
  password: string;
  requestOrigin: string;
};

function normalizeEmail(value: string): string {
  return value.trim().toLowerCase();
}

function normalizeDocument(value: string): string {
  return value.replace(/\D/g, "");
}

export async function setupPublicCustomerOnboarding(
  input: PublicCustomerOnboardingInput,
): Promise<void> {
  const name = input.name.trim();
  const email = normalizeEmail(input.email);
  const whatsapp = input.whatsapp.trim();
  const organizationName = input.organizationName.trim();
  const document = normalizeDocument(input.organizationDocument);

  if (name.length < 2 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new Error("CUSTOMER_PORTAL_ONBOARDING_IDENTITY_INVALID");
  }
  if (input.password.length < 8 || input.password.length > 256) {
    throw new Error("CUSTOMER_PORTAL_PASSWORD_INVALID");
  }

  const db = getDatabase();
  let customerContactId = "";

  await db.transaction(async (tx) => {
    const [portalIdentity] = await tx
      .select({ customerContactId: customerAuthIdentities.customerContactId })
      .from(customerAuthIdentities)
      .where(
        and(
          eq(customerAuthIdentities.provider, "portal"),
          sql`lower(${customerAuthIdentities.login}) = ${email}`,
        ),
      )
      .limit(1);

    const [contactByEmail] = portalIdentity
      ? [null]
      : await tx
          .select({
            id: customerContacts.id,
            organizationId: customerContacts.organizationId,
          })
          .from(customerContacts)
          .where(
            and(
              eq(customerContacts.active, true),
              sql`lower(coalesce(${customerContacts.email}, '')) = ${email}`,
            ),
          )
          .limit(1);

    if (portalIdentity) {
      customerContactId = portalIdentity.customerContactId;
    } else if (contactByEmail) {
      customerContactId = contactByEmail.id;
    } else {
      let organizationId: string | null = null;

      if (document) {
        const [organizationByDocument] = await tx
          .select({ id: customerOrganizations.id })
          .from(customerOrganizations)
          .where(
            and(
              eq(customerOrganizations.active, true),
              sql`regexp_replace(coalesce(${customerOrganizations.document}, ''), '\\D', '', 'g') = ${document}`,
            ),
          )
          .limit(1);
        organizationId = organizationByDocument?.id ?? null;
      }

      if (!organizationId && organizationName) {
        const [organizationByName] = await tx
          .select({ id: customerOrganizations.id })
          .from(customerOrganizations)
          .where(
            and(
              eq(customerOrganizations.active, true),
              sql`lower(${customerOrganizations.name}) = ${organizationName.toLowerCase()}`,
            ),
          )
          .limit(1);
        organizationId = organizationByName?.id ?? null;
      }

      if (!organizationId) {
        const [organization] = await tx
          .insert(customerOrganizations)
          .values({
            name: organizationName || name,
            document: document || null,
          })
          .returning({ id: customerOrganizations.id });
        organizationId = organization?.id ?? null;
      }

      const [contact] = await tx
        .insert(customerContacts)
        .values({
          organizationId,
          name,
          email,
          whatsapp: whatsapp || null,
        })
        .returning({ id: customerContacts.id });
      if (!contact) throw new Error("CUSTOMER_PORTAL_CONTACT_NOT_CREATED");
      customerContactId = contact.id;
    }

    if (!customerContactId) throw new Error("CUSTOMER_PORTAL_CONTACT_NOT_FOUND");

    await tx
      .update(customerContacts)
      .set({
        name,
        email,
        ...(whatsapp ? { whatsapp } : {}),
        updatedAt: new Date(),
      })
      .where(eq(customerContacts.id, customerContactId));

    await tx
      .update(tickets)
      .set({ customerContactId, updatedAt: new Date() })
      .where(and(eq(tickets.id, input.ticketId), isNull(tickets.customerContactId)));

    await tx
      .update(serviceRequests)
      .set({ customerContactId, updatedAt: new Date() })
      .where(
        and(
          eq(serviceRequests.id, input.serviceRequestId),
          isNull(serviceRequests.customerContactId),
        ),
      );

    await tx.insert(ticketEvents).values({
      ticketId: input.ticketId,
      eventType: "customer.onboarding.linked",
      metadata: {
        customerContactId,
        matchedBy: portalIdentity ? "portal_identity" : contactByEmail ? "email" : "created",
      },
    });
  });

  await createCustomerPortalCredentialInvite({
    customerContactId,
    email,
    password: input.password,
    name,
    requestOrigin: input.requestOrigin,
  });
}
