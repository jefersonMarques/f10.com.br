export type F10ContractOwner = {
  personId: number;
  contractIds: number[];
  activeContracts: number;
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

function positiveId(value: unknown): number | null {
  if (typeof value !== "number" && typeof value !== "string") return null;
  const number = Number(value);
  return Number.isSafeInteger(number) && number > 0 ? number : null;
}

function cleanText(value: unknown, maxLength: number): string {
  return typeof value === "string" ? value.trim().slice(0, maxLength) : "";
}

export function parseF10Contracts(payload: unknown): {
  contractsCount: number;
  skippedContracts: number;
  owners: F10ContractOwner[];
} {
  if (!Array.isArray(payload)) throw new Error("F10_CONTRACTS_INVALID");
  if (!payload.length) throw new Error("F10_CONTRACTS_EMPTY");
  if (payload.length > MAX_CONTRACTS) throw new Error("F10_CONTRACTS_TOO_LARGE");

  const people = new Map<number, { contractIds: Set<number>; activeContracts: number }>();
  let skippedContracts = 0;

  for (const item of payload) {
    if (!item || typeof item !== "object" || Array.isArray(item)) {
      skippedContracts += 1;
      continue;
    }
    const contract = item as Record<string, unknown>;
    const personId = positiveId(contract.pessoa_id);
    const contractId = positiveId(contract.contrato_id);
    if (!personId || !contractId) {
      skippedContracts += 1;
      continue;
    }
    const existing = people.get(personId) ?? { contractIds: new Set<number>(), activeContracts: 0 };
    if (!existing.contractIds.has(contractId)) {
      existing.contractIds.add(contractId);
      const label = cleanText(contract.x_status, 60).toLowerCase();
      if (label === "ativo" || (label === "" && Number(contract.status) === 1)) {
        existing.activeContracts += 1;
      }
    }
    people.set(personId, existing);
    if (people.size > MAX_PEOPLE) throw new Error("F10_PEOPLE_TOO_LARGE");
  }

  if (!people.size) throw new Error("F10_CONTRACTS_NO_VALID_PEOPLE");
  return {
    contractsCount: payload.length,
    skippedContracts,
    owners: Array.from(people, ([personId, value]) => ({
      personId,
      contractIds: [...value.contractIds].sort((a, b) => a - b),
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
