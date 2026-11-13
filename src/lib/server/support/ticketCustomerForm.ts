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
  const contractValues = formData.getAll("contractIds");
  if (contractValues.length > 500) throw new Error("SUPPORT_CONTRACT_SELECTION_LIMIT");
  const contractIds = contractValues.map((value) =>
    typeof value === "string" ? positiveInteger(value.trim()) : null);
  if (contractIds.some((id) => id === null) ||
      new Set(contractIds).size !== contractIds.length) {
    throw new Error("SUPPORT_CONTRACT_SELECTION_INVALID");
  }

  const participantValues = formData.getAll("participantIds");
  if (participantValues.length > 20) throw new Error("SUPPORT_PARTICIPANT_LIMIT");
  const participantIds = participantValues.map((value) =>
    typeof value === "string" ? value.trim() : "");
  if (participantIds.some((id) => !isUuid(id)) ||
      new Set(participantIds).size !== participantIds.length) {
    throw new Error("SUPPORT_PARTICIPANT_INVALID");
  }
  const contractSelection = contractIds as number[];
  if (customerMode === "api_contract") {
    const f10ContractId = positiveInteger(read(formData, "f10ContractId"));
    if (f10ContractId === null) throw new Error("F10_TICKET_CONTRACT_REQUIRED");

    return {
      customerMode: "api_contract",
      customerContactId: null,
      customerContextTicketId: null,
      f10ContractId,
      contractIds: contractSelection,
      participantIds,
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

  if (customerMode === "existing") {
    const customerContactId = read(formData, "customerContactId");
    const customerContextTicketId = read(formData, "customerContextTicketId");
    if (!isUuid(customerContactId) ||
        (!isUuid(customerContextTicketId) && contractSelection.length === 0)) {
      throw new Error("CUSTOMER_F10_CONTEXT_REQUIRED");
    }
    return {
      customerMode: "existing",
      customerContactId,
      customerContextTicketId: isUuid(customerContextTicketId) ? customerContextTicketId : null,
      f10ContractId: null,
      contractIds: contractSelection,
      participantIds,
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
  if (contractSelection.length > 0) {
    if (!customerEmail || customerEmail.length > 254 ||
        !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customerEmail) ||
        customerPhone.length > 40 || customerWhatsapp.length > 40) {
      throw new Error("CUSTOMER_CONTACT_INVALID");
    }
    return {
      customerMode: "new",
      customerContactId: null,
      customerContextTicketId: null,
      f10ContractId: null,
      contractIds: contractSelection,
      participantIds,
      customerName,
      customerEmail,
      customerPhone,
      customerWhatsapp,
      organizationName: "",
      groupId: null,
      groupName: "",
      subgroup: null,
      unitId: null,
      unitName: "",
      unitSchema: "",
    };
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
    f10ContractId: null,
    contractIds: contractSelection,
    participantIds,
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
