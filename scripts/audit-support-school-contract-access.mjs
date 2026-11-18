import postgres from "postgres";

function databaseUrl() {
  const value = process.env.DATABASE_URL?.trim();
  if (!value) throw new Error("DATABASE_URL_MISSING");
  return value;
}

async function analyze(tx) {
  const [people] = await tx.unsafe(
    "SELECT count(DISTINCT f.customer_contact_id)::int AS f10_identities, " +
    "count(DISTINCT f.customer_contact_id) FILTER (WHERE NOT EXISTS (" +
    "SELECT 1 FROM customer_contract_access access " +
    "WHERE access.customer_contact_id = f.customer_contact_id))::int AS without_contract_access, " +
    "count(DISTINCT f.customer_contact_id) FILTER (WHERE EXISTS (" +
    "SELECT 1 FROM customer_contract_access access " +
    "WHERE access.customer_contact_id = f.customer_contact_id))::int AS with_contract_access " +
    "FROM customer_f10_identities f",
  );

  const [contracts] = await tx.unsafe(
    "SELECT count(*)::int AS contracts, " +
    "count(*) FILTER (WHERE status = 1 AND data_cancelamento IS NULL)::int AS active, " +
    "count(*) FILTER (WHERE status IS DISTINCT FROM 1 " +
    "OR data_cancelamento IS NOT NULL)::int AS inactive " +
    "FROM f10_customer_contracts",
  );

  const [access] = await tx.unsafe(
    "SELECT count(*)::int AS grants, " +
    "count(DISTINCT customer_contact_id)::int AS people_with_access, " +
    "count(*) FILTER (WHERE c.status IS DISTINCT FROM 1 " +
    "OR c.data_cancelamento IS NOT NULL)::int AS inactive_contract_grants, " +
    "count(DISTINCT access.customer_contact_id) FILTER (" +
    "WHERE (SELECT count(*) FROM customer_contract_access x " +
    "WHERE x.customer_contact_id = access.customer_contact_id) > 1" +
    ")::int AS people_with_multiple_contracts " +
    "FROM customer_contract_access access " +
    "JOIN f10_customer_contracts c " +
    "ON c.unit_id = access.unit_id AND c.contract_id = access.contract_id",
  );

  const [sessions] = await tx.unsafe(
    "SELECT count(DISTINCT legacy_user_id)::int AS authenticated_accounts, " +
    "count(DISTINCT legacy_user_id) FILTER (" +
    "WHERE selected_unit_id IS NOT NULL)::int AS accounts_with_selected_unit " +
    "FROM customer_portal_sessions WHERE auth_source = 'f10'",
  );

  const [directIdentifiers] = await tx.unsafe(
    "SELECT count(DISTINCT f.customer_contact_id)::int AS identities_with_api_person_link " +
    "FROM customer_f10_identities f " +
    "JOIN f10_customer_external_identities e " +
    "ON e.customer_contact_id = f.customer_contact_id",
  );

  return {
    state: "support_school_access_audit",
    readOnly: true,
    f10Identities: people.f10_identities,
    f10IdentitiesWithoutContractAccess: people.without_contract_access,
    f10IdentitiesWithContractAccess: people.with_contract_access,
    f10AccountsWithSession: sessions.authenticated_accounts,
    f10AccountsWithSelectedUnit: sessions.accounts_with_selected_unit,
    identitiesWithApiPersonLink: directIdentifiers.identities_with_api_person_link,
    contracts: contracts.contracts,
    activeContracts: contracts.active,
    inactiveContracts: contracts.inactive,
    accessGrants: access.grants,
    peopleWithContractAccess: access.people_with_access,
    peopleWithMultipleContracts: access.people_with_multiple_contracts,
    inactiveContractGrants: access.inactive_contract_grants,
    automaticGrantsPerformed: 0,
    note: "Legacy login units are not equivalent to contract identifiers; no access is granted.",
  };
}

async function main() {
  const db = postgres(databaseUrl(), {
    max: 1,
    prepare: false,
    connect_timeout: 10,
  });
  try {
    const report = await db.begin(async (tx) => {
      await tx.unsafe("SET TRANSACTION READ ONLY");
      return analyze(tx);
    });
    console.log(JSON.stringify(report, null, 2));
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
