import { and, asc, eq, sql } from "drizzle-orm";
import { getDatabase } from "$lib/server/db";
import { customerF10Identities } from "$lib/server/db/customerPortalSchema";
import { supportEmailThreads } from "$lib/server/db/supportEmailSchema";
import { customerContacts, ticketMessages } from "$lib/server/db/supportSchema";
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

function readOriginalEmailSender(metadata: Record<string, unknown> | null): {
  name: string | null;
  email: string | null;
} | null {
  const from = metadata?.from;
  if (!from || typeof from !== "object" || Array.isArray(from)) return null;
  const record = from as Record<string, unknown>;
  const email = typeof record.email === "string" ? record.email.trim() : "";
  if (!email) return null;

  return {
    name: typeof record.name === "string" ? record.name : null,
    email,
  };
}

export async function getTicketCustomerOverview(
  ticket: TicketSummary,
  commercialUnit: CommercialUnit | null,
  customerContext: CustomerContext | null,
  allowCommercialHistory: boolean,
): Promise<TicketCustomerOverview> {
  const db = getDatabase();
  const [emailRows, requesterRows, portalRows, commercialEmail, originalMessages, apiContracts] = await Promise.all([
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
    ticket.channel === "email"
      ? db.select({ metadata: ticketMessages.externalMetadata })
        .from(ticketMessages)
        .where(and(
          eq(ticketMessages.ticketId, ticket.id),
          eq(ticketMessages.channel, "email"),
          eq(ticketMessages.authorType, "customer"),
        ))
        .orderBy(asc(ticketMessages.createdAt))
        .limit(1)
      : Promise.resolve([]),
    db.execute(sql`
      SELECT c.numero_contrato AS contract_number, c.contract_id::text AS contract_id,
        coalesce(nullif(p.spreadsheet_student_name, ''),
          nullif(c.source_record ->> 'nome_fantasia', ''),
          nullif(c.source_record ->> 'razao_social', ''),
          nullif(c.source_record ->> 'nome', ''),
          contact.name) AS account_name,
        contact.email AS customer_email
      FROM ticket_f10_contract_links link
      JOIN f10_customer_contracts c
        ON c.unit_id = link.unit_id AND c.contract_id = link.contract_id
      LEFT JOIN f10_customer_contract_profiles p
        ON p.unit_id = c.unit_id AND p.contract_id = c.contract_id
      LEFT JOIN customer_contacts contact ON contact.id = ${ticket.customerContactId}::uuid
      WHERE link.ticket_id = ${ticket.id}::uuid
      LIMIT 1
    `),
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
  const suggested = allowCommercialHistory && !commercialUnit && contactId
    ? await getSuggestedTicketCommercialUnit(contactId, ticket.id)
    : null;

  const overview = buildTicketCustomerOverview({
    channel: ticket.channel,
    customerContactId: ticket.customerContactId,
    customerName: ticket.customerName,
    customerEmail: ticket.customerEmail,
    organizationName: ticket.organizationName,
    commercialUnit,
    customerContext,
    emailSender: readOriginalEmailSender(originalMessages[0]?.metadata ?? null)
      ?? emailRows[0] ?? null,
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

  const apiContract = (apiContracts as unknown as Array<{
    contract_number: string | null;
    contract_id: string;
    account_name: string | null;
    customer_email: string | null;
  }>)[0];

  if (!apiContract) return overview;
  return {
    ...overview,
    clientName: apiContract.account_name ?? overview.clientName,
    contractNumber: apiContract.contract_number ?? "#" + apiContract.contract_id,
    clientEmail: overview.clientEmail ?? apiContract.customer_email,
    suggestedUnit: null,
  };
}
