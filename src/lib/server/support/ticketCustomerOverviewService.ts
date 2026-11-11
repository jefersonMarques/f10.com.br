import { eq, sql } from "drizzle-orm";
import { getDatabase } from "$lib/server/db";
import { customerF10Identities } from "$lib/server/db/customerPortalSchema";
import { supportEmailThreads } from "$lib/server/db/supportEmailSchema";
import { customerContacts } from "$lib/server/db/supportSchema";
import { ticketRequesterProfiles } from "$lib/server/db/ticketRequesterSchema";
import { getSuggestedTicketCommercialUnit } from "$lib/server/support/ticketCommercialUnitRepository";
import {
  buildTicketCustomerOverview,
  type TicketCustomerOverview,
} from "$lib/support/ticketCustomerOverview";

type TicketSummary = {
  id: string;
  channel: string;
  customerContactId: string | null;
  customerName: string | null;
  customerEmail: string | null;
  organizationName: string | null;
};

type CommercialUnit = {
  id: string;
  name: string;
  contractNumber: string;
};

type CustomerContext = {
  legacyUserId: string | null;
  unitName: string | null;
};

type UnitContactRow = {
  email: string | null;
  contact_kind: string;
};

async function getCommercialEmail(unitId: string | null): Promise<{
  email: string;
  kind: "general" | "holder";
} | null> {
  if (!unitId) return null;

  const rows = await getDatabase().execute(sql`
    SELECT email, contact_kind
    FROM customer_unit_contacts
    WHERE unit_id = ${unitId}::uuid
      AND nullif(trim(email), '') IS NOT NULL
      AND contact_kind IN ('general', 'holder')
    ORDER BY CASE WHEN contact_kind = 'general' THEN 0 ELSE 1 END
    LIMIT 1
  `);
  const row = (rows as unknown as UnitContactRow[])[0];
  if (!row?.email) return null;

  return {
    email: row.email.trim(),
    kind: row.contact_kind === "holder" ? "holder" : "general",
  };
}

export async function getTicketCustomerOverview(
  ticket: TicketSummary,
  commercialUnit: CommercialUnit | null,
  customerContext: CustomerContext | null,
): Promise<TicketCustomerOverview> {
  const db = getDatabase();
  const [emailRows, requesterRows, portalRows, commercialEmail] = await Promise.all([
    ticket.channel === "email"
      ? db.select({
          name: supportEmailThreads.senderName,
          email: supportEmailThreads.senderEmail,
        })
        .from(supportEmailThreads)
        .where(eq(supportEmailThreads.ticketId, ticket.id))
        .limit(1)
      : Promise.resolve([]),
    db.select({
      contactId: ticketRequesterProfiles.customerContactId,
      displayName: ticketRequesterProfiles.displayName,
      displayEmail: ticketRequesterProfiles.displayEmail,
    })
      .from(ticketRequesterProfiles)
      .where(eq(ticketRequesterProfiles.ticketId, ticket.id))
      .limit(1),
    customerContext?.legacyUserId
      ? db.select({ email: customerF10Identities.loginEmail })
        .from(customerF10Identities)
        .where(eq(customerF10Identities.legacyUserId, customerContext.legacyUserId))
        .limit(1)
      : Promise.resolve([]),
    getCommercialEmail(commercialUnit?.id ?? null),
  ]);

  const requesterRow = requesterRows[0] ?? null;
  const [selectedContact] = requesterRow?.contactId
    ? await db.select({
        name: customerContacts.name,
        email: customerContacts.email,
      })
      .from(customerContacts)
      .where(eq(customerContacts.id, requesterRow.contactId))
      .limit(1)
    : [];

  const contactId = requesterRow?.contactId ?? ticket.customerContactId;
  const suggested = !commercialUnit && contactId
    ? await getSuggestedTicketCommercialUnit(contactId, ticket.id)
    : null;

  return buildTicketCustomerOverview({
    channel: ticket.channel,
    customerContactId: ticket.customerContactId,
    customerName: ticket.customerName,
    customerEmail: ticket.customerEmail,
    organizationName: ticket.organizationName,
    commercialUnit,
    customerContext,
    emailSender: emailRows[0] ?? null,
    requesterOverride: requesterRow
      ? {
          ...requesterRow,
          contactName: selectedContact?.name ?? null,
          contactEmail: selectedContact?.email ?? null,
        }
      : null,
    portalLoginEmail: portalRows[0]?.email ?? null,
    commercialEmail,
    suggestedUnit: suggested,
  });
}
