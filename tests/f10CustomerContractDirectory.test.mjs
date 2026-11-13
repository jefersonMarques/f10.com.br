import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

function source(path) {
  return readFileSync(join(process.cwd(), path), "utf8");
}

test("the customer directory uses the F10 API contract table as the primary source", () => {
  const repository = source("src/lib/server/support/f10CustomerContractDirectoryRepository.ts");

  assert.match(repository, /FROM f10_customer_contracts c/);
  assert.match(repository, /LEFT JOIN f10_customer_contract_profiles p/);
  assert.match(repository, /LEFT JOIN LATERAL/);
  assert.match(repository, /u\.f10_contract_id = c\.contract_id/);
  assert.match(repository, /unique_number\.numero_contrato = c\.numero_contrato/);
  assert.match(repository, /unique_number\.unit_id = c\.unit_id/);
  assert.match(repository, /coalesce\(contact\.email, person\.email, sheet\.unit_email/);
  assert.match(repository, /coalesce\(holder_name/);
  assert.match(repository, /f10_person_id::text ILIKE/);
  assert.match(repository, /count\(\*\)::int AS total/);
});

test("refresh adds missing API contracts without overwriting existing data", () => {
  const repository = source("src/lib/server/support/f10CustomerContractDirectoryRepository.ts");
  const serverRoute = source("src/routes/app/customers/+page.server.ts");

  assert.match(repository, /await listF10CustomerContractOwners\(unitId\)/);
  assert.match(repository, /pg_advisory_xact_lock/);
  assert.match(repository, /ON CONFLICT \(unit_id, contract_id\) DO NOTHING/);
  assert.match(repository, /RETURNING contract_id/);
  assert.doesNotMatch(repository, /DELETE FROM f10_customer_contracts/);

  assert.match(serverRoute, /requireAppPermission/);
  assert.match(serverRoute, /hasPermission\(permissions, "customers\.manage", "all"\)/);
  assert.match(serverRoute, /refreshMissingF10Contracts/);
  assert.match(serverRoute, /redirect\(303/);
});

test("the customers list offers refresh and keeps commercial information secondary", () => {
  const page = source("src/routes/app/customers/+page.svelte");
  const route = source("src/routes/app/customers/+page.server.ts");

  assert.match(page, /action="\?\/refresh"/);
  assert.match(page, /"Atualizar"/);
  assert.match(page, /"Sem complemento"/);
  assert.match(page, /data\.importedUnits\.summary\.with_sheet/);
  assert.match(route, /listF10CustomerContractUnits/);
  assert.doesNotMatch(route, /listImportedCustomerUnits/);
});
