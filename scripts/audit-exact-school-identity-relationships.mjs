import { createHash } from "node:crypto";
import postgres from "postgres";
import { classifyBrazilianDocument } from "./lib/brazilianDocumentValidation.mjs";
import {
  classifySchoolCandidates,
  schoolNameCandidates,
} from "./lib/schoolCandidateMatcher.mjs";

const SAMPLE_LIMIT = 12;

function databaseConfig() {
  const url = process.env.DATABASE_URL?.trim();
  const unitId = Number(process.env.F10_UID);
  if (!url) throw new Error("DATABASE_URL_MISSING");
  if (!Number.isSafeInteger(unitId) || unitId < 1) {
    throw new Error("F10_UID_INVALID");
  }
  return { url, unitId };
}

function commercialSource(unitId) {
  return unitId === 1 ? "f10_sheet" : "f10_sheet_unit_" + unitId;
}

function contractKey(unitId, contractId) {
  return String(unitId) + ":" + String(contractId);
}

function safeReference(contactId) {
  return "C-" + createHash("sha256")
    .update("support-relationships:" + String(contactId))
    .digest("hex")
    .slice(0, 12);
}

function validLoginGroups(value) {
  if (!Array.isArray(value)) return [];
  return value.filter((group) =>
    group && Number.isSafeInteger(group.grupo_id) && Array.isArray(group.unidades));
}

function increment(report, key, amount = 1) {
  report[key] = (report[key] ?? 0) + amount;
}

async function loadDatabaseSnapshot(tx, unitId) {
  const logins = await tx.unsafe(
    "SELECT f.legacy_user_id, f.customer_contact_id::text AS contact_id, " +
    "s.legacy_groups, s.selected_group_id, s.selected_unit_id " +
    "FROM customer_f10_identities f " +
    "LEFT JOIN LATERAL (SELECT legacy_groups, selected_group_id, " +
    "selected_unit_id FROM customer_portal_sessions " +
    "WHERE legacy_user_id = f.legacy_user_id AND auth_source = 'f10' " +
    "ORDER BY created_at DESC, id DESC LIMIT 1) s ON true " +
    "ORDER BY f.legacy_user_id",
  );
  const groups = await tx.unsafe(
    "SELECT id::text, source_group_id FROM customer_groups " +
    "WHERE source_system = $1",
    [commercialSource(unitId)],
  );
  const units = await tx.unsafe(
    "SELECT u.id::text, u.group_id::text, u.organization_id::text, " +
    "u.name, u.apelido, o.name AS organization_name, " +
    "u.f10_unit_id, u.f10_contract_id::text AS f10_contract_id " +
    "FROM customer_units u " +
    "JOIN customer_organizations o ON o.id = u.organization_id " +
    "WHERE u.source_system = $1",
    [commercialSource(unitId)],
  );
  const contracts = await tx.unsafe(
    "SELECT unit_id, contract_id::text, numero_contrato, " +
    "pessoa_id::text, titular_id::text, status, data_cancelamento " +
    "FROM f10_customer_contracts WHERE unit_id = $1",
    [unitId],
  );
  const profiles = await tx.unsafe(
    "SELECT contract_id::text, customer_unit_id::text " +
    "FROM f10_customer_contract_profiles WHERE unit_id = $1",
    [unitId],
  );
  const assignments = await tx.unsafe(
    "SELECT legacy_user_id, customer_unit_id::text " +
    "FROM customer_f10_unit_assignments",
  );
  const access = await tx.unsafe(
    "SELECT customer_contact_id::text AS contact_id, unit_id, contract_id::text " +
    "FROM customer_contract_access WHERE unit_id = $1",
    [unitId],
  );
  const holders = await tx.unsafe(
    "SELECT holder_id::text, document FROM f10_customer_holder_profiles " +
    "WHERE unit_id = $1 AND status = 'synced'",
    [unitId],
  );
  const organizations = await tx.unsafe(
    "SELECT o.id::text, o.document FROM customer_organizations o",
  );
  return {
    logins, groups, units, contracts, profiles, assignments, access,
    holders, organizations,
  };
}

function indexContracts(contracts) {
  const byKey = new Map();
  for (const contract of contracts) {
    byKey.set(contractKey(contract.unit_id, contract.contract_id), contract);
  }
  return byKey;
}

function indexCommercialUnits(units, contracts, profiles, unitId) {
  const contractsByKey = indexContracts(contracts);
  const profileUnits = new Map();
  for (const profile of profiles) {
    const unitIds = profileUnits.get(contractKey(unitId, profile.contract_id)) ?? [];
    if (profile.customer_unit_id) unitIds.push(profile.customer_unit_id);
    profileUnits.set(contractKey(unitId, profile.contract_id), unitIds);
  }
  const linkedByContract = new Map();
  for (const unit of units) {
    if (unit.f10_unit_id !== unitId || !unit.f10_contract_id) continue;
    const key = contractKey(unitId, unit.f10_contract_id);
    if (!contractsByKey.has(key)) continue;
    const linked = linkedByContract.get(key) ?? [];
    linked.push(unit);
    linkedByContract.set(key, linked);
  }
  const unitsById = new Map(units.map((unit) => [unit.id, unit]));
  for (const [key, references] of profileUnits) {
    const linked = linkedByContract.get(key) ?? [];
    const included = new Set(linked.map((unit) => unit.id));
    for (const reference of references) {
      const unit = unitsById.get(reference);
      if (unit && !included.has(unit.id)) {
        included.add(unit.id);
        linked.push(unit);
      }
    }
    if (linked.length > 0) linkedByContract.set(key, linked);
  }
  return { linkedByContract, contractsByKey, unitsById };
}

function indexLoginAccess(assignments, access) {
  const assignmentsByLogin = new Map();
  const contractsByContact = new Map();

  for (const assignment of assignments) {
    const current = assignmentsByLogin.get(assignment.legacy_user_id) ?? new Set();
    current.add(assignment.customer_unit_id);
    assignmentsByLogin.set(assignment.legacy_user_id, current);
  }
  for (const record of access) {
    const current = contractsByContact.get(record.contact_id) ?? new Set();
    current.add(contractKey(record.unit_id, record.contract_id));
    contractsByContact.set(record.contact_id, current);
  }
  return { assignmentsByLogin, contractsByContact };
}

function inspectLoginUnits(snapshot, unitId, commercialLinks) {
  const groupIdBySource = new Map(snapshot.groups.map((group) => [
    String(group.source_group_id), group.id,
  ]));
  const unitsByGroup = new Map();
  for (const unit of snapshot.units) {
    const entries = unitsByGroup.get(unit.group_id) ?? [];
    entries.push({
      ...unit,
      organizationId: unit.organization_id,
      organizationName: unit.organization_name,
    });
    unitsByGroup.set(unit.group_id, entries);
  }
  const { assignmentsByLogin, contractsByContact } = indexLoginAccess(
    snapshot.assignments,
    snapshot.access,
  );
  const contractsByOrganization = new Map();
  for (const [key, commercialUnits] of commercialLinks.linkedByContract) {
    for (const unit of commercialUnits) {
      const keys = contractsByOrganization.get(unit.organization_id) ?? new Set();
      keys.add(key);
      contractsByOrganization.set(unit.organization_id, keys);
    }
  }
  const counts = {
    loginAccounts: snapshot.logins.length,
    accountsWithoutSessionSnapshot: 0,
    accountsWithCommercialGroupMatch: 0,
    accountsWithExplicitContractAccess: 0,
    accountsWithManualCommercialAssignment: 0,
    contextsInLoginSnapshots: 0,
    contextsWithCommercialGroup: 0,
    contextsWithUniqueSchoolNameCandidate: 0,
    contextsWithAmbiguousSchoolNameCandidate: 0,
    contextsWithoutSchoolNameCandidate: 0,
    uniqueSchoolNameCandidatesWithApiContract: 0,
    uniqueSchoolNameCandidatesWithActiveApiContract: 0,
    uniqueNameCandidatesAlreadyManuallyAssigned: 0,
    selectedContexts: 0,
    selectedContextsWithUniqueNameCandidate: 0,
  };
  const samples = [];

  for (const identity of snapshot.logins) {
    const groups = validLoginGroups(identity.legacy_groups);
    const assignments = assignmentsByLogin.get(identity.legacy_user_id) ?? new Set();
    const authorized = contractsByContact.get(identity.contact_id) ?? new Set();
    const entry = {
      reference: safeReference(identity.contact_id),
      loginGroups: groups.length,
      loginContexts: 0,
      uniqueSchoolNameCandidates: 0,
      ambiguousSchoolNameCandidates: 0,
      noSchoolNameCandidates: 0,
      candidateContracts: 0,
      manuallyAssignedSchools: assignments.size,
      alreadyAuthorizedContracts: authorized.size,
      selectedContextResult: "not_selected",
    };
    if (!Array.isArray(identity.legacy_groups)) {
      increment(counts, "accountsWithoutSessionSnapshot");
    }
    if (assignments.size > 0) increment(counts, "accountsWithManualCommercialAssignment");
    if (authorized.size > 0) increment(counts, "accountsWithExplicitContractAccess");

    let hasMatchingGroup = false;
    const candidateContractKeys = new Set();
    const seenContexts = new Set();
    for (const group of groups) {
      const commercialId = groupIdBySource.get(String(group.grupo_id));
      if (commercialId) hasMatchingGroup = true;
      for (const loginUnit of group.unidades) {
        if (!loginUnit || !Number.isSafeInteger(loginUnit.unidade_id)) continue;
        const contextKey = [
          group.grupo_id, loginUnit.unidade_id, String(loginUnit.schema ?? ""),
        ].join(":");
        if (seenContexts.has(contextKey)) continue;
        seenContexts.add(contextKey);
        entry.loginContexts += 1;
        increment(counts, "contextsInLoginSnapshots");

        let classification = "unmatched";
        if (commercialId) {
          increment(counts, "contextsWithCommercialGroup");
          const candidates = schoolNameCandidates(
            unitsByGroup.get(commercialId) ?? [],
            loginUnit.unidade,
          );
          classification = classifySchoolCandidates(candidates);
          if (classification === "unique_name_candidate") {
            entry.uniqueSchoolNameCandidates += 1;
            increment(counts, "contextsWithUniqueSchoolNameCandidate");
            const relevantOrganization = candidates[0].organizationId;
            const contracts = contractsByOrganization.get(relevantOrganization) ?? new Set();
            let hasActiveContract = false;
            for (const key of contracts) {
              const contract = commercialLinks.contractsByKey.get(key);
              if (!contract) continue;
              candidateContractKeys.add(key);
              if (contract.status === 1 && contract.data_cancelamento === null) {
                hasActiveContract = true;
              }
            }
            if (contracts.size > 0) {
              increment(counts, "uniqueSchoolNameCandidatesWithApiContract");
            }
            if (hasActiveContract) {
              increment(counts, "uniqueSchoolNameCandidatesWithActiveApiContract");
            }
            if (candidates.some((unit) => assignments.has(unit.id))) {
              increment(counts, "uniqueNameCandidatesAlreadyManuallyAssigned");
            }
          } else if (classification === "ambiguous_name_candidate") {
            entry.ambiguousSchoolNameCandidates += 1;
            increment(counts, "contextsWithAmbiguousSchoolNameCandidate");
          } else {
            entry.noSchoolNameCandidates += 1;
            increment(counts, "contextsWithoutSchoolNameCandidate");
          }
        } else {
          entry.noSchoolNameCandidates += 1;
          increment(counts, "contextsWithoutSchoolNameCandidate");
        }

        if (identity.selected_group_id === group.grupo_id &&
            identity.selected_unit_id === loginUnit.unidade_id) {
          increment(counts, "selectedContexts");
          entry.selectedContextResult = classification;
          if (classification === "unique_name_candidate") {
            increment(counts, "selectedContextsWithUniqueNameCandidate");
          }
        }
      }
    }
    entry.candidateContracts = candidateContractKeys.size;
    if (hasMatchingGroup) increment(counts, "accountsWithCommercialGroupMatch");
    if (samples.length < SAMPLE_LIMIT) samples.push(entry);
  }

  return {
    state: "login_unit_evidence",
    ...counts,
    samples,
    definitiveUnitIdMatches: null,
    definitiveUnitIdReason:
      "customer_units has no stored legacy login unidade_id or schema key",
    note: "Even unique group-and-name matches are candidates, never authorization.",
  };
}

function inspectDocuments(snapshot, unitId, links) {
  const counters = {
    syncedHolderProfiles: snapshot.holders.length,
    holderCpfValid: 0,
    holderCnpjValid: 0,
    holderDocumentInvalid: 0,
    holderDocumentMissing: 0,
    commercialOrganizations: snapshot.organizations.length,
    organizationCpfValid: 0,
    organizationCnpjValid: 0,
    organizationDocumentInvalid: 0,
    organizationDocumentMissing: 0,
    contractsWithSyncedHolder: 0,
    contractsWithValidatedHolderCnpj: 0,
    contractsWithValidatedHolderCpf: 0,
    contractsWithLinkedOrganizationAndMatchingDocument: 0,
    contractsWithLinkedOrganizationAndConflictingValidDocument: 0,
    contractsWithSamePersonAndHolderId: 0,
    contractsWithDifferentPersonAndHolderId: 0,
  };
  const holderDocuments = new Map();
  for (const holder of snapshot.holders) {
    const document = classifyBrazilianDocument(holder.document);
    holderDocuments.set(holder.holder_id, document);
    increment(counters, "holder" + document.kind[0].toUpperCase() +
      document.kind.slice(1) + (["cpf", "cnpj"].includes(document.kind) ? "Valid" : ""));
  }
  const organizationDocuments = new Map();
  for (const organization of snapshot.organizations) {
    const document = classifyBrazilianDocument(organization.document);
    organizationDocuments.set(organization.id, document);
    increment(counters, "organization" + document.kind[0].toUpperCase() +
      document.kind.slice(1) + (["cpf", "cnpj"].includes(document.kind) ? "Valid" : ""));
  }

  for (const contract of snapshot.contracts) {
    if (contract.pessoa_id && contract.titular_id) {
      increment(
        counters,
        contract.pessoa_id === contract.titular_id
          ? "contractsWithSamePersonAndHolderId"
          : "contractsWithDifferentPersonAndHolderId",
      );
    }
    if (!contract.titular_id) continue;
    const holderDocument = holderDocuments.get(contract.titular_id);
    if (!holderDocument) continue;
    increment(counters, "contractsWithSyncedHolder");
    if (holderDocument.kind === "cpf") {
      increment(counters, "contractsWithValidatedHolderCpf");
    }
    if (holderDocument.kind === "cnpj") {
      increment(counters, "contractsWithValidatedHolderCnpj");
    }
    if (!holderDocument.digits) continue;

    const linked = links.linkedByContract.get(contractKey(unitId, contract.contract_id)) ?? [];
    const organizations = new Set(linked.map((unit) => unit.organization_id));
    let hasMatch = false;
    let hasConflict = false;
    for (const organizationId of organizations) {
      const organizationDocument = organizationDocuments.get(organizationId);
      if (!organizationDocument?.digits) continue;
      if (organizationDocument.digits === holderDocument.digits) {
        hasMatch = true;
      } else {
        hasConflict = true;
      }
    }
    if (hasMatch) {
      increment(counters, "contractsWithLinkedOrganizationAndMatchingDocument");
    } else if (hasConflict) {
      increment(counters, "contractsWithLinkedOrganizationAndConflictingValidDocument");
    }
  }
  return {
    state: "legal_document_evidence",
    ...counters,
    notes: [
      "CPF/CNPJ validity includes check-digit verification, not just string length.",
      "Holder document is not necessarily the school's legal document.",
      "Document matches are candidates and do not identify a login user.",
    ],
  };
}

function inspectContractCoverage(snapshot, unitId, links) {
  const organizationContracts = new Map();
  const personContracts = new Map();
  const counters = {
    apiContracts: snapshot.contracts.length,
    activeContracts: 0,
    inactiveContracts: 0,
    contractsWithCommercialSchoolLink: 0,
    contractsWithoutCommercialSchoolLink: 0,
    contractsWithMultipleOrganizationLinks: 0,
    linkedContractsWithProfile: 0,
    commercialSchoolRows: snapshot.units.length,
    commercialRowsWithApiContract: 0,
    commercialRowsWithoutApiContract: 0,
    contractsWithApiPersonId: 0,
    contractsWithApiHolderId: 0,
    apiPeopleWithMoreThanOneContract: 0,
    apiPeopleWithMoreThanOneActiveContract: 0,
    commercialOrganizationsWithMultipleContracts: 0,
    commercialOrganizationsWithMultipleActiveContracts: 0,
  };
  const profileKeys = new Set(snapshot.profiles.map((profile) =>
    contractKey(unitId, profile.contract_id)));

  for (const school of snapshot.units) {
    const key = contractKey(school.f10_unit_id, school.f10_contract_id);
    if (school.f10_unit_id === unitId &&
        school.f10_contract_id &&
        links.contractsByKey.has(key)) {
      increment(counters, "commercialRowsWithApiContract");
    } else {
      increment(counters, "commercialRowsWithoutApiContract");
    }
  }

  for (const contract of snapshot.contracts) {
    const key = contractKey(unitId, contract.contract_id);
    const active = contract.status === 1 && contract.data_cancelamento === null;
    increment(counters, active ? "activeContracts" : "inactiveContracts");
    if (contract.pessoa_id) {
      increment(counters, "contractsWithApiPersonId");
      const person = personContracts.get(contract.pessoa_id) ?? { all: 0, active: 0 };
      person.all += 1;
      if (active) person.active += 1;
      personContracts.set(contract.pessoa_id, person);
    }
    if (contract.titular_id) increment(counters, "contractsWithApiHolderId");

    const linked = links.linkedByContract.get(key) ?? [];
    const organizations = new Set(linked.map((unit) => unit.organization_id));
    if (organizations.size === 0) {
      increment(counters, "contractsWithoutCommercialSchoolLink");
      continue;
    }
    increment(counters, "contractsWithCommercialSchoolLink");
    if (profileKeys.has(key)) increment(counters, "linkedContractsWithProfile");
    if (organizations.size > 1) {
      increment(counters, "contractsWithMultipleOrganizationLinks");
    }
    for (const organizationId of organizations) {
      const organization = organizationContracts.get(organizationId) ?? {
        all: new Set(), active: new Set(),
      };
      organization.all.add(key);
      if (active) organization.active.add(key);
      organizationContracts.set(organizationId, organization);
    }
  }
  counters.apiPeopleWithMoreThanOneContract = [...personContracts.values()]
    .filter((person) => person.all > 1).length;
  counters.apiPeopleWithMoreThanOneActiveContract = [...personContracts.values()]
    .filter((person) => person.active > 1).length;
  counters.commercialOrganizationsWithMultipleContracts = [...organizationContracts.values()]
    .filter((organization) => organization.all.size > 1).length;
  counters.commercialOrganizationsWithMultipleActiveContracts = [...organizationContracts.values()]
    .filter((organization) => organization.active.size > 1).length;

  return {
    state: "school_contract_coverage",
    ...counters,
    note: "Commercial organizations and API contract owners may represent different entities.",
  };
}

async function main() {
  if (process.argv.length !== 2) {
    throw new Error("NO_ARGUMENTS_SUPPORTED");
  }
  const { url, unitId } = databaseConfig();
  const db = postgres(url, { max: 1, prepare: false, connect_timeout: 10 });
  try {
    const result = await db.begin(async (tx) => {
      await tx.unsafe("SET TRANSACTION READ ONLY");
      await tx.unsafe("SET LOCAL statement_timeout = '60000ms'");
      const snapshot = await loadDatabaseSnapshot(tx, unitId);
      const links = indexCommercialUnits(
        snapshot.units, snapshot.contracts, snapshot.profiles, unitId,
      );
      return {
        state: "exact_school_identity_relationship_audit",
        readOnly: true,
        sourceSystem: commercialSource(unitId),
        loginUnits: inspectLoginUnits(snapshot, unitId, links),
        legalDocuments: inspectDocuments(snapshot, unitId, links),
        contractCoverage: inspectContractCoverage(snapshot, unitId, links),
        permissionsChanged: 0,
        ticketsChanged: 0,
      };
    });
    console.log(JSON.stringify(result, null, 2));
  } finally {
    await db.end({ timeout: 5 });
  }
}

main().catch((cause) => {
  console.error(JSON.stringify({
    state: "error",
    code: typeof cause?.code === "string" ? cause.code : "UNKNOWN",
  }));
  process.exitCode = 1;
});
