import { classifyBrazilianDocument } from "./brazilianDocumentValidation.mjs";

const IDENTIFIER_FIELDS = [
  "contrato_id",
  "numero_contrato",
  "pessoa_id",
  "titular_id",
  "unidade_id",
  "grupo_id",
  "schema",
  "escola_id",
  "empresa_id",
  "cliente_id",
  "grupo",
  "unidade",
  "cpf_cnpj",
  "cpf",
  "cnpj",
  "nome",
  "nome_fantasia",
  "razao_social",
];

function recordFields(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return [];
  }
  return IDENTIFIER_FIELDS
    .filter((field) => Object.hasOwn(value, field))
    .map((field) => ({
      field,
      type: value[field] === null ? "null"
        : Array.isArray(value[field]) ? "array"
          : typeof value[field],
    }));
}

export function summarizeApiObject(record) {
  const fields = recordFields(record);
  const documentValue = ["cpf_cnpj", "cnpj", "cpf"]
    .map((field) => record && typeof record === "object" ? record[field] : null)
    .find((value) => typeof value === "string" && value.trim()) ?? null;
  const documentKind = classifyBrazilianDocument(documentValue).kind;
  return {
    structureValid: Boolean(record && typeof record === "object" && !Array.isArray(record)),
    identifierFields: fields,
    documentKind,
  };
}

export function summarizeContractPage(payload) {
  if (!Array.isArray(payload)) throw new Error("F10_CONTRACT_PAGE_INVALID");
  const counts = new Map();
  for (const record of payload) {
    for (const field of recordFields(record)) {
      counts.set(field.field, (counts.get(field.field) ?? 0) + 1);
    }
  }
  return {
    firstPageOnly: true,
    contractsOnFirstPage: payload.length,
    fields: IDENTIFIER_FIELDS
      .filter((field) => counts.has(field))
      .map((field) => ({ field, records: counts.get(field) })),
  };
}
