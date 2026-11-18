import { createHash } from "node:crypto";
import postgres from "postgres";

const MODES = new Set(["login", "manual", "movidesk"]);
const SAMPLE_LIMIT = 12;

function parseMode(args) {
  if (args.length !== 2 || args[0] !== "--mode" || !MODES.has(args[1])) {
    throw new Error("MODE_REQUIRED_LOGIN_MANUAL_OR_MOVIDESK");
  }
  return args[1];
}

function getDatabaseConfig() {
  const url = process.env.DATABASE_URL?.trim();
  const unitId = Number(process.env.F10_UID);
  if (!url) throw new Error("DATABASE_URL_MISSING");
  if (!Number.isSafeInteger(unitId) || unitId <= 0) {
    throw new Error("F10_UID_INVALID");
  }
  return { url, unitId };
}

function safeReference(contactId) {
  return "C-" + createHash("sha256")
    .update("support-relationships:" + contactId)
    .digest("hex")
    .slice(0, 12);
}

function isActive(contract) {
  return Number(contract?.status) === 1 && contract.data_cancelamento === null;
}

function commercialSource(unitId) {
  return unitId === 1 ? "f10_sheet" : "f10_sheet_unit_" + unitId;
}

function validGroups(value) {
  return Array.isArray(value) ? value.filter((group) =>
    group && typeof group === "object" && Number.isSafeInteger(group.grupo_id)) : [];
}

async function inspectLogin(tx, unitId) {
  const identities = await tx.unsafe(`
    SELECT f.legacy_user_id, f.customer_contact_id::text AS contact_id,
      s.legacy_groups, s.selected_unit_id
    FROM customer_f10_identities f
    LEFT JOIN LATERAL (
      SELECT legacy_groups, selected_unit_id
      FROM customer_portal_sessions
      WHERE legacy_user_id = f.legacy_user_id AND auth_source = 'f10'
      ORDER BY created_at DESC, id DESC LIMIT 1
    ) s ON true
    ORDER BY f.legacy_user_id
  `);
  const groups = await tx.unsafe(`
    SELECT id::text, source_group_id
    FROM customer_groups WHERE source_system = $1
  `, [commercialSource(unitId)]);
  const units = await tx.unsafe(`
    SELECT u.id::text, u.group_id::text, u.f10_unit_id, u.f10_contract_id::text,
      c.status, c.data_cancelamento
    FROM customer_units u
    LEFT JOIN f10_customer_contracts c
      ON c.unit_id = u.f10_unit_id AND c.contract_id = u.f10_contract_id
    WHERE u.source_system = $1
  `, [commercialSource(unitId)]);
  const assignments = await tx.unsafe(`
    SELECT a.legacy_user_id, a.customer_unit_id::text
    FROM customer_f10_unit_assignments a
  `);
  const accesses = await tx.unsafe(`
    SELECT a.customer_contact_id::text AS contact_id, a.unit_id,
      a.contract_id::text
    FROM customer_contract_access a
  `);
  const apiIdentities = await tx.unsafe(`
    SELECT customer_contact_id::text AS contact_id
    FROM f10_customer_external_identities WHERE unit_id = $1
  `, [unitId]);

  const groupsBySource = new Map(groups.map((group) =>
    [String(group.source_group_id), group.id]));
  const unitsByGroup = new Map();
  const unitsById = new Map();
  for (const unit of units) {
    unitsById.set(unit.id, unit);
    const matching = unitsByGroup.get(unit.group_id) ?? [];
    matching.push(unit);
    unitsByGroup.set(unit.group_id, matching);
  }
  const assignmentsByLogin = new Map();
  for (const assignment of assignments) {
    const list = assignmentsByLogin.get(assignment.legacy_user_id) ?? [];
    list.push(assignment.customer_unit_id);
    assignmentsByLogin.set(assignment.legacy_user_id, list);
  }
  const accessesByContact = new Map();
  for (const access of accesses) {
    const list = accessesByContact.get(access.contact_id) ?? [];
    list.push(String(access.unit_id) + ":" + access.contract_id);
    accessesByContact.set(access.contact_id, list);
  }
  const apiContactIds = new Set(apiIdentities.map((row) => row.contact_id));

  const results = identities.map((identity) => {
    const sessionGroups = validGroups(identity.legacy_groups);
    const groupUnitKeys = new Set();
    const groupCandidates = new Set();
    let mappedGroups = 0;
    let groupsWithoutCommercialMatch = 0;

    for (const group of sessionGroups) {
      const commercialId = groupsBySource.get(String(group.grupo_id));
      if (!commercialId) {
        groupsWithoutCommercialMatch += 1;
        continue;
      }
      mappedGroups += 1;
      for (const unit of unitsByGroup.get(commercialId) ?? []) {
        groupUnitKeys.add(unit.id);
        if (unit.f10_unit_id === unitId && unit.f10_contract_id) {
          groupCandidates.add(String(unit.f10_unit_id) + ":" + unit.f10_contract_id);
        }
      }
    }

    const assignedUnits = assignmentsByLogin.get(identity.legacy_user_id) ?? [];
    const assignedContracts = new Set();
    let assignedWithoutContract = 0;
    let assignedOutsideLoginGroup = 0;
    for (const assignedId of assignedUnits) {
      const unit = unitsById.get(assignedId);
      if (!unit || unit.f10_unit_id !== unitId || !unit.f10_contract_id) {
        assignedWithoutContract += 1;
      } else {
        assignedContracts.add(String(unit.f10_unit_id) + ":" + unit.f10_contract_id);
      }
      if (!groupUnitKeys.has(assignedId)) assignedOutsideLoginGroup += 1;
    }

    const authorized = new Set(accessesByContact.get(identity.contact_id) ?? []);
    const confirmedContracts = [...assignedContracts]
      .filter((key) => authorized.has(key)).length;
    const legacyUnitCount = sessionGroups.reduce((total, group) =>
      total + (Array.isArray(group.unidades) ? group.unidades.length : 0), 0);

    return {
      reference: safeReference(identity.contact_id),
      hasLoginSnapshot: Array.isArray(identity.legacy_groups),
      loginGroups: sessionGroups.length,
      loginUnits: legacyUnitCount,
      hasSelectedLoginUnit: identity.selected_unit_id !== null,
      matchingCommercialGroups: mappedGroups,
      unmatchedGroups: groupsWithoutCommercialMatch,
      possibleGroupContracts: groupCandidates.size,
      manuallyAssignedSchoolUnits: assignedUnits.length,
      assignedContracts: assignedContracts.size,
      assignedSchoolsNotInLoginGroup: assignedOutsideLoginGroup,
      assignedSchoolsWithoutApiContract: assignedWithoutContract,
      authorizedContracts: authorized.size,
      assignedAndAuthorizedContracts: confirmedContracts,
      hasDirectApiPersonIdentity: apiContactIds.has(identity.contact_id),
    };
  });

  const count = (predicate) => results.filter(predicate).length;
  return {
    state: "identity_relationship_login_audit",
    readOnly: true,
    totalLogins: results.length,
    loginsWithoutSessionSnapshot: count((item) => !item.hasLoginSnapshot),
    loginsWithUnmatchedGroups: count((item) => item.unmatchedGroups > 0),
    loginsWithGroupOnlyCandidates: count((item) =>
      item.possibleGroupContracts > 0 && item.manuallyAssignedSchoolUnits === 0),
    loginsWithManualSchoolAssignments: count((item) =>
      item.manuallyAssignedSchoolUnits > 0),
    loginsWithAssignmentsOutsideLoginGroup: count((item) =>
      item.assignedSchoolsNotInLoginGroup > 0),
    loginsWithAssignmentsNotMappedToApiContracts: count((item) =>
      item.assignedSchoolsWithoutApiContract > 0),
    loginsWithAssignedAndAuthorizedContracts: count((item) =>
      item.assignedAndAuthorizedContracts > 0),
    loginsWithoutExplicitContractAccess: count((item) =>
      item.authorizedContracts === 0),
    loginsWithDirectApiPersonIdentity: count((item) =>
      item.hasDirectApiPersonIdentity),
    samples: results.slice(0, SAMPLE_LIMIT),
    interpretation: "Login groups are candidate school context, not proof of contract authorization.",
  };
}

async function inspectManual(tx) {
  const [contacts] = await tx.unsafe(`
    SELECT count(*)::int AS total,
      count(*) FILTER (WHERE active)::int AS active,
      count(*) FILTER (WHERE import_source = 'movidesk')::int AS movidesk,
      count(*) FILTER (WHERE import_source IS DISTINCT FROM 'movidesk')::int AS other,
      count(*) FILTER (WHERE nullif(btrim(email), '') IS NOT NULL)::int AS with_email
    FROM customer_contacts
  `);
  const [explicit] = await tx.unsafe(`
    SELECT count(*)::int AS links,
      count(DISTINCT a.customer_contact_id)::int AS people,
      count(*) FILTER (WHERE c.status = 1 AND c.data_cancelamento IS NULL)::int AS active,
      count(*) FILTER (WHERE c.status IS DISTINCT FROM 1
        OR c.data_cancelamento IS NOT NULL)::int AS inactive
    FROM customer_contract_access a
    JOIN f10_customer_contracts c
      ON c.unit_id = a.unit_id AND c.contract_id = a.contract_id
  `);
  const [loginMatches] = await tx.unsafe(`
    WITH candidates AS (
      SELECT f.legacy_user_id,
        count(c.id) FILTER (WHERE c.id <> f.customer_contact_id)::int AS other_contacts,
        count(c.id) FILTER (WHERE c.id <> f.customer_contact_id
          AND c.import_source = 'movidesk')::int AS movidesk_contacts
      FROM customer_f10_identities f
      LEFT JOIN customer_contacts c ON c.active
        AND lower(btrim(c.email)) = lower(btrim(f.login_email))
      GROUP BY f.legacy_user_id
    )
    SELECT count(*) FILTER (WHERE other_contacts = 0)::int AS no_other_contacts,
      count(*) FILTER (WHERE other_contacts = 1)::int AS one_other_contact,
      count(*) FILTER (WHERE other_contacts > 1)::int AS multiple_other_contacts,
      count(*) FILTER (WHERE movidesk_contacts > 0)::int AS movidesk_email_candidates
    FROM candidates
  `);
  const [manualUnits] = await tx.unsafe(`
    SELECT count(*)::int AS assignments,
      count(DISTINCT legacy_user_id)::int AS login_accounts,
      count(*) FILTER (WHERE u.f10_contract_id IS NOT NULL)::int AS mapped_contracts
    FROM customer_f10_unit_assignments a
    JOIN customer_units u ON u.id = a.customer_unit_id
  `);
  const [documents] = await tx.unsafe(`
    WITH holder_documents AS (
      SELECT regexp_replace(coalesce(document, ''), '[^0-9]', '', 'g') AS digits
      FROM f10_customer_holder_profiles WHERE status = 'synced'
    )
    SELECT count(*) FILTER (WHERE length(digits) = 11)::int AS cpf_length,
      count(*) FILTER (WHERE length(digits) = 14)::int AS cnpj_length,
      count(*) FILTER (WHERE length(digits) NOT IN (11,14))::int AS missing_or_invalid_length
    FROM holder_documents
  `);
  const [owners] = await tx.unsafe(`
    WITH by_person AS (
      SELECT unit_id, pessoa_id, count(*)::int AS contracts,
        count(*) FILTER (WHERE status = 1 AND data_cancelamento IS NULL)::int AS active
      FROM f10_customer_contracts
      WHERE pessoa_id IS NOT NULL
      GROUP BY unit_id, pessoa_id
    ), by_holder AS (
      SELECT unit_id, titular_id, count(*)::int AS contracts
      FROM f10_customer_contracts
      WHERE titular_id IS NOT NULL
      GROUP BY unit_id, titular_id
    )
    SELECT
      (SELECT count(*)::int FROM by_person) AS api_people_with_contracts,
      (SELECT count(*)::int FROM by_person WHERE contracts > 1) AS api_people_with_multiple_contracts,
      (SELECT count(*)::int FROM by_person WHERE active > 1) AS api_people_with_multiple_active_contracts,
      (SELECT count(*)::int FROM by_holder WHERE contracts > 1) AS holders_with_multiple_contracts
  `);
  const [linking] = await tx.unsafe(`
    SELECT (SELECT count(*)::int FROM f10_customer_external_identities) AS api_person_links,
      (SELECT count(*)::int FROM customer_contact_merges) AS existing_contact_merges,
      (SELECT count(*)::int FROM customer_unit_contacts
        WHERE customer_contact_id IS NOT NULL) AS commercial_contacts_linked,
      (SELECT count(*)::int FROM f10_customer_sync_rows
        WHERE result = 'possible_match') AS possible_match_preview_rows
  `);
  return {
    state: "identity_relationship_manual_audit",
    readOnly: true,
    contacts,
    explicitContractAccess: explicit,
    loginSameEmailCandidates: loginMatches,
    manuallyAssignedCommercialUnits: manualUnits,
    holderDocumentLengths: documents,
    apiContractCardinality: owners,
    existingAssociations: linking,
    interpretation: "CPF/CNPJ lengths are indicative only; shared emails and names do not authorize merging.",
  };
}

async function inspectMovidesk(tx) {
  const [inventory] = await tx.unsafe(`
    SELECT
      (SELECT count(*)::int FROM movidesk_ticket_imports) AS imported_tickets,
      (SELECT count(*)::int FROM customer_contacts
        WHERE import_source = 'movidesk') AS imported_contacts,
      (SELECT count(*)::int FROM customer_contacts
        WHERE import_source = 'movidesk' AND nullif(btrim(email), '') IS NOT NULL)
        AS imported_contacts_with_email,
      (SELECT count(*)::int FROM customer_contact_merges m
        JOIN customer_contacts c ON c.id = m.source_contact_id
        WHERE c.import_source = 'movidesk') AS already_merged_movidesk_contacts,
      (SELECT count(DISTINCT participant.customer_contact_id)::int
        FROM ticket_participants participant
        WHERE participant.source_system = 'movidesk'
          AND participant.participant_type = 'customer')
        AS historical_customer_participants,
      (SELECT count(*)::int FROM movidesk_ticket_imports imported
        JOIN tickets t ON t.id = imported.ticket_id
        WHERE t.customer_contact_id IS NOT NULL) AS imported_tickets_with_current_customer
  `);

  const [evidence] = await tx.unsafe(`
    WITH historical AS (
      SELECT DISTINCT m.customer_contact_id AS historical_contact_id,
        lower(btrim(m.external_metadata->>'sourceAuthorEmail')) AS email
      FROM ticket_messages m
      WHERE m.author_type = 'customer'
        AND m.customer_contact_id IS NOT NULL
        AND m.external_metadata->>'source' = 'movidesk'
        AND nullif(btrim(m.external_metadata->>'sourceAuthorEmail'), '') IS NOT NULL
        AND length(m.external_metadata->>'sourceAuthorEmail') BETWEEN 3 AND 254
    ), current_emails AS (
      SELECT lower(btrim(email)) AS email, count(DISTINCT id)::int AS contacts
      FROM customer_contacts
      WHERE active AND import_source IS DISTINCT FROM 'movidesk'
        AND nullif(btrim(email), '') IS NOT NULL
      GROUP BY lower(btrim(email))
    ), login_emails AS (
      SELECT lower(btrim(login_email)) AS email,
        count(DISTINCT customer_contact_id)::int AS logins
      FROM customer_f10_identities
      GROUP BY lower(btrim(login_email))
    ), matched AS (
      SELECT h.historical_contact_id,
        coalesce(c.contacts, 0) AS contacts,
        coalesce(l.logins, 0) AS logins
      FROM historical h
      LEFT JOIN current_emails c ON c.email = h.email
      LEFT JOIN login_emails l ON l.email = h.email
    ), by_historical_contact AS (
      SELECT historical_contact_id, count(*)::int AS distinct_emails,
        max(contacts) AS most_contact_candidates,
        max(logins) AS most_login_candidates
      FROM matched GROUP BY historical_contact_id
    )
    SELECT count(*)::int AS contacts_with_historical_author_email,
      count(*) FILTER (WHERE distinct_emails > 1)::int AS contacts_with_multiple_historical_emails,
      count(*) FILTER (WHERE distinct_emails = 1 AND most_contact_candidates = 1)::int
        AS single_email_single_contact_candidates,
      count(*) FILTER (WHERE most_contact_candidates > 1)::int
        AS multiple_contact_candidates,
      count(*) FILTER (WHERE most_contact_candidates = 0)::int
        AS without_current_contact_email_match,
      count(*) FILTER (WHERE most_login_candidates > 0)::int
        AS possible_login_email_matches,
      count(*) FILTER (WHERE most_login_candidates > 1)::int
        AS multiple_login_email_matches
    FROM by_historical_contact
  `);

  return {
    state: "identity_relationship_movidesk_audit",
    readOnly: true,
    inventory,
    historicalEmailEvidence: evidence,
    interpretation: "Historical email evidence is unverified and never grants portal access or merges imported tickets.",
  };
}

async function main() {
  const mode = parseMode(process.argv.slice(2));
  const { url, unitId } = getDatabaseConfig();
  const db = postgres(url, { max: 1, prepare: false, connect_timeout: 10 });
  try {
    const result = await db.begin(async (tx) => {
      await tx.unsafe("SET TRANSACTION READ ONLY");
      await tx.unsafe("SET LOCAL statement_timeout = '60000ms'");
      if (mode === "login") return inspectLogin(tx, unitId);
      if (mode === "manual") return inspectManual(tx);
      return inspectMovidesk(tx);
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
