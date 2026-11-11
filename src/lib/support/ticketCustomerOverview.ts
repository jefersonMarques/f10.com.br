export type TicketCustomerOverview = {
  clientName: string | null;
  clientEmail: string | null;
  clientEmailSource: "general" | "holder" | null;
  contractNumber: string | null;
  contractUnitId: string | null;
  requesterName: string | null;
  requesterEmail: string | null;
  requesterContactId: string | null;
  requesterSource: "manual" | "email" | "portal" | "chat" | "contact" | "unknown";
  channel: string;
  legacyUserId: string | null;
  suggestedUnit: {
    id: string;
    name: string;
    contractNumber: string;
  } | null;
};

export type CustomerOverviewSource = {
  channel: string;
  customerContactId: string | null;
  customerName: string | null;
  customerEmail: string | null;
  organizationName: string | null;
  commercialUnit: {
    id: string;
    name: string;
    contractNumber: string;
  } | null;
  customerContext: {
    unitName: string | null;
    legacyUserId: string | null;
  } | null;
  emailSender: { name: string | null; email: string | null } | null;
  requesterOverride: {
    contactId: string | null;
    displayName: string | null;
    displayEmail: string | null;
    contactName: string | null;
    contactEmail: string | null;
  } | null;
  portalLoginEmail: string | null;
  commercialEmail: { email: string; kind: "general" | "holder" } | null;
  suggestedUnit: TicketCustomerOverview["suggestedUnit"];
};

function present(...values: Array<string | null | undefined>): string | null {
  for (const value of values) {
    const normalized = value?.trim();
    if (normalized) return normalized;
  }
  return null;
}

export function buildTicketCustomerOverview(source: CustomerOverviewSource): TicketCustomerOverview {
  const override = source.requesterOverride;
  const sender = source.channel === "email" ? source.emailSender : null;
  const requesterContactId = override?.contactId ?? source.customerContactId;
  const requesterName = present(
    override?.displayName,
    override?.contactName,
    sender?.name,
    source.customerName,
  );
  const requesterEmail = present(
    override?.displayEmail,
    override?.contactEmail,
    sender?.email,
    source.customerEmail,
    source.portalLoginEmail,
  );
  const requesterSource: TicketCustomerOverview["requesterSource"] =
    override?.displayName || override?.displayEmail ? "manual"
      : override?.contactId ? "contact"
      : sender?.email ? "email"
      : source.customerContactId ? "contact"
      : source.portalLoginEmail ? "portal"
      : source.channel === "web_chat" ? "chat"
      : "unknown";

  return {
    clientName: present(
      source.commercialUnit?.name,
      source.customerContext?.unitName,
      source.organizationName,
    ),
    clientEmail: source.commercialEmail?.email ?? null,
    clientEmailSource: source.commercialEmail?.kind ?? null,
    contractNumber: source.commercialUnit?.contractNumber ?? null,
    contractUnitId: source.commercialUnit?.id ?? null,
    requesterName,
    requesterEmail,
    requesterContactId,
    requesterSource,
    channel: source.channel,
    legacyUserId: source.customerContext?.legacyUserId ?? null,
    suggestedUnit: source.commercialUnit ? null : source.suggestedUnit,
  };
}
