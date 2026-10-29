export type F10ContractOwner = {
  personId: number;
  contractIds: number[];
  contractNumbers: string[];
  activeContracts: number;
};

export type F10ContractSnapshot = {
  contractId: number;
  personId: number | null;
  holderId: number | null;
  contractNumber: string | null;
  status: number | null;
  statusLabel: string | null;
  courseId: number | null;
  sourceId: number | null;
  sellerId: number | null;
  telemarketingId: number | null;
  enrollmentDate: string | null;
  completionDate: string | null;
  cancellationDate: string | null;
  sourceRecord: Record<string, unknown>;
};

export type F10CustomerPerson = {
  personId: number;
  name: string;
  email: string;
  phone: string;
  whatsapp: string;
};

const MAX_CONTRACTS = 50_000;
const MAX_PEOPLE = 10_000;

export function parseF10UnitId(value: string | undefined): number {
  const raw = value?.trim() ?? "";
  if (!/^[1-9][0-9]*$/.test(raw)) throw new Error("F10_UID_INVALID");
  const unitId = Number(raw);
  if (!Number.isSafeInteger(unitId) || unitId > 2_147_483_647) {
    throw new Error("F10_UID_INVALID");
  }
  return unitId;
}

function positiveId(value: unknown): number | null {
  if (typeof value !== "number" && typeof value !== "string") return null;
  const number = Number(value);
  return Number.isSafeInteger(number) && number > 0 ? number : null;
}

function statusNumber(value: unknown): number | null {
  const number = typeof value === "number" || typeof value === "string" ? Number(value) : NaN;
  return Number.isSafeInteger(number) ? number : null;
}

function optionalText(value: unknown, maxLength: number): string | null {
  if (typeof value !== "string" && typeof value !== "number") return null;
  const text = String(value).trim();
  return text ? text.slice(0, maxLength) : null;
}

function cleanText(value: unknown, maxLength: number): string {
  return typeof value === "string" ? value.trim().slice(0, maxLength) : "";
}

export function parseF10Contracts(payload: unknown): {
  contractsCount: number;
  skippedContracts: number;
  owners: F10ContractOwner[];
  contracts: F10ContractSnapshot[];
} {
  if (!Array.isArray(payload)) throw new Error("F10_CONTRACTS_INVALID");
  if (!payload.length) throw new Error("F10_CONTRACTS_EMPTY");
  if (payload.length > MAX_CONTRACTS) throw new Error("F10_CONTRACTS_TOO_LARGE");

  const people = new Map<number, {
    contractIds: Set<number>;
    contractNumbers: Set<string>;
    activeContracts: number;
  }>();
  const contracts = new Map<number, F10ContractSnapshot>();
  let skippedContracts = 0;

  for (const item of payload) {
    if (!item || typeof item !== "object" || Array.isArray(item)) {
      throw new Error("F10_CONTRACT_RECORD_INVALID");
    }
    const sourceRecord = item as Record<string, unknown>;
    const contractId = positiveId(sourceRecord.contrato_id);
    if (!contractId) throw new Error("F10_CONTRACT_ID_INVALID");

    const existingContract = contracts.get(contractId);
    if (existingContract) {
      if (JSON.stringify(existingContract.sourceRecord) !== JSON.stringify(sourceRecord)) {
        throw new Error("F10_CONTRACT_ID_CONFLICT");
      }
      continue;
    }

    const personId = positiveId(sourceRecord.pessoa_id);
    const contractNumber = optionalText(sourceRecord.numero_contrato, 120);
    const status = statusNumber(sourceRecord.status);
    const statusLabel = optionalText(sourceRecord.x_status, 120);

    const snapshot: F10ContractSnapshot = {
      contractId,
      personId,
      holderId: positiveId(sourceRecord.titular_id),
      contractNumber,
      status,
      statusLabel,
      courseId: positiveId(sourceRecord.curso_id),
      sourceId: positiveId(sourceRecord.fonte_id),
      sellerId: positiveId(sourceRecord.vendedor_id),
      telemarketingId: positiveId(sourceRecord.telemarketing_id),
      enrollmentDate: optionalText(sourceRecord.matricula, 80),
      completionDate: optionalText(sourceRecord.conclusao, 80),
      cancellationDate: optionalText(sourceRecord.data_cancelamento, 80),
      sourceRecord,
    };
    contracts.set(contractId, snapshot);

    if (!personId) {
      skippedContracts += 1;
      continue;
    }

    const person = people.get(personId) ?? {
      contractIds: new Set<number>(),
      contractNumbers: new Set<string>(),
      activeContracts: 0,
    };
    person.contractIds.add(contractId);
    if (contractNumber) person.contractNumbers.add(contractNumber);
    if (statusLabel?.toLowerCase() === "ativo" || (!statusLabel && status === 1)) {
      person.activeContracts += 1;
    }
    people.set(personId, person);
    if (people.size > MAX_PEOPLE) throw new Error("F10_PEOPLE_TOO_LARGE");
  }

  if (!people.size) throw new Error("F10_CONTRACTS_NO_VALID_PEOPLE");

  return {
    contractsCount: contracts.size,
    skippedContracts,
    contracts: Array.from(contracts.values()),
    owners: Array.from(people, ([personId, value]) => ({
      personId,
      contractIds: [...value.contractIds].sort((a, b) => a - b),
      contractNumbers: [...value.contractNumbers].sort((a, b) =>
        a.localeCompare(b, "pt-BR", { numeric: true })),
      activeContracts: value.activeContracts,
    })).sort((a, b) => a.personId - b.personId),
  };
}

export function parseF10Person(payload: unknown, expectedId: number): F10CustomerPerson {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    throw new Error("F10_PERSON_INVALID");
  }
  const person = payload as Record<string, unknown>;
  if (positiveId(person.pessoa_id) !== expectedId) throw new Error("F10_PERSON_ID_MISMATCH");
  const name = cleanText(person.nome, 120);
  if (name.length < 2) throw new Error("F10_PERSON_NAME_MISSING");
  const rawEmail = cleanText(person.email, 254).toLowerCase();
  const email = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(rawEmail) ? rawEmail : "";
  return {
    personId: expectedId,
    name,
    email,
    phone: cleanText(person.telefone, 40),
    whatsapp: cleanText(person.celular, 40),
  };
}

export function classifyF10CustomerMatch(input: {
  mappedContact: { id: string; name: string; email: string | null; phone: string | null; whatsapp: string | null } | null;
  candidates: Array<{ id: string }>;
  person: F10CustomerPerson;
}): "create" | "update" | "unchanged" | "possible_match" {
  if (input.mappedContact) {
    const existing = input.mappedContact;
    return existing.name.trim() === input.person.name
      && (existing.email ?? "").trim().toLowerCase() === input.person.email
      && (existing.phone ?? "").trim() === input.person.phone
      && (existing.whatsapp ?? "").trim() === input.person.whatsapp
      ? "unchanged" : "update";
  }
  return input.candidates.length > 0 ? "possible_match" : "create";
}
