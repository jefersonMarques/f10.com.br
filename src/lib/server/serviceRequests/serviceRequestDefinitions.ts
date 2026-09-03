export const SERVICE_REQUEST_TYPES = ["nfse", "cell_coin"] as const;
export type ServiceRequestType = (typeof SERVICE_REQUEST_TYPES)[number];

export type ServiceRequestAttachmentDefinition = {
  fieldKey: string;
  label: string;
  required: boolean;
  maxFiles: number;
  maxBytes: number;
  kinds: Array<"image" | "pdf" | "xml" | "pkcs12">;
};

const MB = 1024 * 1024;

export const SERVICE_REQUEST_ATTACHMENT_DEFINITIONS: Record<
  ServiceRequestType,
  ServiceRequestAttachmentDefinition[]
> = {
  nfse: [
    {
      fieldKey: "certificate_file",
      label: "Certificado digital",
      required: true,
      maxFiles: 1,
      maxBytes: 5 * MB,
      kinds: ["pkcs12"],
    },
    {
      fieldKey: "invoice_xml_file",
      label: "XML recente de nota fiscal emitida",
      required: false,
      maxFiles: 1,
      maxBytes: 5 * MB,
      kinds: ["xml"],
    },
  ],
  cell_coin: [
    {
      fieldKey: "doc_rg_cnh",
      label: "RG ou CNH",
      required: true,
      maxFiles: 6,
      maxBytes: 10 * MB,
      kinds: ["image", "pdf"],
    },
    {
      fieldKey: "doc_cnpj",
      label: "Documento do CNPJ",
      required: true,
      maxFiles: 6,
      maxBytes: 10 * MB,
      kinds: ["image", "pdf"],
    },
    {
      fieldKey: "doc_contrato",
      label: "Contrato Social",
      required: true,
      maxFiles: 6,
      maxBytes: 10 * MB,
      kinds: ["image", "pdf"],
    },
    {
      fieldKey: "doc_selfie",
      label: "Selfie com documento",
      required: true,
      maxFiles: 1,
      maxBytes: 5 * MB,
      kinds: ["image"],
    },
  ],
};

const SECRET_FIELDS: Record<ServiceRequestType, ReadonlySet<string>> = {
  nfse: new Set(["certificatePassword", "cityHallPassword", "securityPhrase"]),
  cell_coin: new Set(),
};

const REQUIRED_FIELDS: Record<ServiceRequestType, readonly string[]> = {
  nfse: ["cnpj", "legalName", "city", "state", "noteKind"],
  cell_coin: ["cnpj", "unitLegalName", "unitFantasyName", "managerName", "managerEmail"],
};

export function isServiceRequestType(value: string): value is ServiceRequestType {
  return (SERVICE_REQUEST_TYPES as readonly string[]).includes(value);
}

function normalizeFieldValue(value: unknown): string | number | boolean | null {
  if (value === null) return null;
  if (typeof value === "boolean") return value;
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const normalized = value.trim();
    if (normalized.length > 10_000) throw new Error("SERVICE_REQUEST_FIELD_TOO_LONG");
    return normalized;
  }
  throw new Error("SERVICE_REQUEST_FIELD_TYPE_INVALID");
}

export function normalizeServiceRequestFields(
  requestType: ServiceRequestType,
  fields: Record<string, unknown>,
): {
  data: Record<string, string | number | boolean | null>;
  secrets: Record<string, string>;
} {
  const entries = Object.entries(fields);
  if (entries.length > 120) throw new Error("SERVICE_REQUEST_TOO_MANY_FIELDS");

  const data: Record<string, string | number | boolean | null> = {};
  const secrets: Record<string, string> = {};
  const secretFields = SECRET_FIELDS[requestType];

  for (const [fieldKey, rawValue] of entries) {
    if (!/^[A-Za-z][A-Za-z0-9_]{0,79}$/.test(fieldKey)) {
      throw new Error("SERVICE_REQUEST_FIELD_KEY_INVALID");
    }
    if (secretFields.has(fieldKey)) {
      if (typeof rawValue !== "string") throw new Error("SERVICE_REQUEST_SECRET_TYPE_INVALID");
      const secret = rawValue.trim();
      if (secret.length > 512) throw new Error("SERVICE_REQUEST_SECRET_TOO_LONG");
      if (secret) secrets[fieldKey] = secret;
      continue;
    }
    data[fieldKey] = normalizeFieldValue(rawValue);
  }

  for (const fieldKey of REQUIRED_FIELDS[requestType]) {
    const value = data[fieldKey];
    if (typeof value !== "string" || value.trim().length === 0) {
      throw new Error(`SERVICE_REQUEST_REQUIRED_FIELD:${fieldKey}`);
    }
  }

  const cnpj = String(data.cnpj ?? "").replace(/\D+/g, "");
  if (cnpj.length !== 14) throw new Error("SERVICE_REQUEST_CNPJ_INVALID");
  if (requestType === "cell_coin") {
    const managerEmail = String(data.managerEmail ?? "");
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(managerEmail) || managerEmail.length > 254) {
      throw new Error("SERVICE_REQUEST_EMAIL_INVALID");
    }
  }

  return { data, secrets };
}

export function serviceRequestLabel(requestType: ServiceRequestType): string {
  return requestType === "nfse" ? "Nota Fiscal" : "CELL COIN";
}
