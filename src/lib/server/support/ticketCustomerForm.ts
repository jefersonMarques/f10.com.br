import type { TicketCustomerLinkInput } from "$lib/server/support/supportRepository";

function read(formData: FormData, name: string): string {
  const value = formData.get(name);
  return typeof value === "string" ? value.trim() : "";
}

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

function positiveInteger(value: string): number | null {
  if (!/^\d+$/.test(value)) return null;
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : null;
}

function booleanValue(value: string): boolean | null {
  if (value === "true") return true;
  if (value === "false") return false;
  return null;
}

export function parseTicketCustomerLinkForm(formData: FormData): TicketCustomerLinkInput {
  const customerMode = read(formData, "customerMode");
  if (customerMode === "existing") {
    const customerContactId = read(formData, "customerContactId");
    const customerContextTicketId = read(formData, "customerContextTicketId");
    if (!isUuid(customerContactId) || !isUuid(customerContextTicketId)) {
      throw new Error("CUSTOMER_F10_CONTEXT_REQUIRED");
    }
    return {
      customerMode: "existing",
      customerContactId,
      customerContextTicketId,
      customerName: "",
      customerEmail: "",
      customerPhone: "",
      customerWhatsapp: "",
      organizationName: "",
      groupId: null,
      groupName: "",
      subgroup: null,
      unitId: null,
      unitName: "",
      unitSchema: "",
    };
  }

  if (customerMode !== "new") throw new Error("CUSTOMER_REQUIRED");

  const customerName = read(formData, "customerName");
  const organizationName = read(formData, "organizationName");
  const customerEmail = read(formData, "customerEmail").toLowerCase();
  const customerPhone = read(formData, "customerPhone");
  const customerWhatsapp = read(formData, "customerWhatsapp");
  const groupId = positiveInteger(read(formData, "groupId"));
  const groupName = read(formData, "groupName");
  const subgroup = booleanValue(read(formData, "subgroup"));
  const unitId = positiveInteger(read(formData, "unitId"));
  const unitName = read(formData, "unitName");
  const unitSchema = read(formData, "unitSchema");

  if (customerName.length < 2 || customerName.length > 120) {
    throw new Error("CUSTOMER_NAME_INVALID");
  }
  if (organizationName.length < 2 || organizationName.length > 160) {
    throw new Error("CUSTOMER_ORGANIZATION_INVALID");
  }
  if (
    customerEmail.length > 254 ||
    (customerEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customerEmail)) ||
    customerPhone.length > 40 ||
    customerWhatsapp.length > 40
  ) {
    throw new Error("CUSTOMER_CONTACT_INVALID");
  }
  if (
    groupId === null ||
    groupName.length < 1 ||
    groupName.length > 160 ||
    subgroup === null ||
    unitId === null ||
    unitName.length < 1 ||
    unitName.length > 160 ||
    unitSchema.length < 1 ||
    unitSchema.length > 120
  ) {
    throw new Error("CUSTOMER_F10_CONTEXT_REQUIRED");
  }

  return {
    customerMode: "new",
    customerContactId: null,
    customerContextTicketId: null,
    customerName,
    customerEmail,
    customerPhone,
    customerWhatsapp,
    organizationName,
    groupId,
    groupName,
    subgroup,
    unitId,
    unitName,
    unitSchema,
  };
}
