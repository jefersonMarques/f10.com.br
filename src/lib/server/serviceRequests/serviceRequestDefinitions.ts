export const SERVICE_REQUEST_TYPES = ["nfse", "cell_coin"] as const;
export type ServiceRequestType = (typeof SERVICE_REQUEST_TYPES)[number];

export type ServiceRequestDataValue =
  | string
  | number
  | boolean
  | null
  | ServiceRequestDataValue[]
  | { [key: string]: ServiceRequestDataValue };

export type ServiceRequestAttachmentDefinition = {
  fieldKey: string;
  label: string;
  required: boolean;
  maxFiles: number;
  maxBytes: number;
  kinds: Array<"image" | "pdf" | "xml" | "certificate">;
};

const MB = 1024 * 1024;
const MAX_TOP_LEVEL_FIELDS = 120;
const MAX_NESTED_DEPTH = 6;
const MAX_NESTED_ITEMS = 100;
const MAX_TOTAL_NODES = 1_500;
const MAX_TEXT_LENGTH = 200_000;
const MAX_SERIALIZED_DATA_BYTES = 512 * 1024;

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
      kinds: ["certificate"],
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

function isSafeKey(value: string): boolean {
  return /^[A-Za-z][A-Za-z0-9_.:-]{0,79}$/.test(value);
}

function normalizeDataValue(
  value: unknown,
  depth: number,
  state: { nodes: number },
): ServiceRequestDataValue {
  state.nodes += 1;
  if (state.nodes > MAX_TOTAL_NODES) throw new Error("SERVICE_REQUEST_DATA_TOO_COMPLEX");
  if (depth > MAX_NESTED_DEPTH) throw new Error("SERVICE_REQUEST_DATA_TOO_DEEP");

  if (value === null) return null;
  if (typeof value === "boolean") return value;
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const normalized = value.trim();
    if (normalized.length > MAX_TEXT_LENGTH) throw new Error("SERVICE_REQUEST_FIELD_TOO_LONG");
    return normalized;
  }
  if (Array.isArray(value)) {
    if (value.length > MAX_NESTED_ITEMS) throw new Error("SERVICE_REQUEST_ARRAY_TOO_LONG");
    return value.map((item) => normalizeDataValue(item, depth + 1, state));
  }
  if (typeof value === "object") {
    const entries = Object.entries(value as Record<string, unknown>);
    if (entries.length > MAX_NESTED_ITEMS) throw new Error("SERVICE_REQUEST_OBJECT_TOO_LARGE");
    const normalized: Record<string, ServiceRequestDataValue> = {};
    for (const [key, nestedValue] of entries) {
      if (!isSafeKey(key)) throw new Error("SERVICE_REQUEST_FIELD_KEY_INVALID");
      normalized[key] = normalizeDataValue(nestedValue, depth + 1, state);
    }
    return normalized;
  }

  throw new Error("SERVICE_REQUEST_FIELD_TYPE_INVALID");
}

export function normalizeServiceRequestFields(
  requestType: ServiceRequestType,
  fields: Record<string, unknown>,
): {
  data: Record<string, ServiceRequestDataValue>;
  secrets: Record<string, string>;
} {
  const entries = Object.entries(fields);
  if (entries.length > MAX_TOP_LEVEL_FIELDS) throw new Error("SERVICE_REQUEST_TOO_MANY_FIELDS");

  const data: Record<string, ServiceRequestDataValue> = {};
  const secrets: Record<string, string> = {};
  const secretFields = SECRET_FIELDS[requestType];
  const state = { nodes: 0 };

  for (const [fieldKey, rawValue] of entries) {
    if (!isSafeKey(fieldKey)) throw new Error("SERVICE_REQUEST_FIELD_KEY_INVALID");
    if (secretFields.has(fieldKey)) {
      if (typeof rawValue !== "string") throw new Error("SERVICE_REQUEST_SECRET_TYPE_INVALID");
      const secret = rawValue.trim();
      if (secret.length > 512) throw new Error("SERVICE_REQUEST_SECRET_TOO_LONG");
      if (secret) secrets[fieldKey] = secret;
      continue;
    }
    data[fieldKey] = normalizeDataValue(rawValue, 0, state);
  }

  const serializedSize = Buffer.byteLength(JSON.stringify(data), "utf8");
  if (serializedSize > MAX_SERIALIZED_DATA_BYTES) throw new Error("SERVICE_REQUEST_DATA_TOO_LARGE");

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
