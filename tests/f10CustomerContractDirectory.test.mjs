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
  assert.match(repository, /f10_person_id::text, .*ILIKE/);
  assert.match(repository, /count\(\*\)::int AS total/);
});

test("refresh updates existing API contracts without overwriting commercial data", () => {
  const repository = source("src/lib/server/support/f10CustomerContractDirectoryRepository.ts");
  const serverRoute = source("src/routes/app/customers/+page.server.ts");

  const refresh = repository.split("export async function refreshF10CustomerContracts(")[1]
    ?.split("export async function listF10CustomerContractUnits(")[0];
  assert.ok(refresh);
  assert.match(refresh, /await listF10CustomerContractOwners\(unitId\)/);
  assert.match(refresh, /pg_advisory_xact_lock/);
  assert.match(refresh, /ON CONFLICT \(unit_id, contract_id\) DO UPDATE SET/);
  assert.match(refresh, /status = excluded.status/);
  assert.match(refresh, /x_status = excluded.x_status/);
  assert.match(refresh, /pessoa_id = excluded.pessoa_id/);
  assert.match(refresh, /titular_id = excluded.titular_id/);
  assert.match(refresh, /data_cancelamento = excluded.data_cancelamento/);
  assert.match(refresh, /source_record = excluded.source_record/);
  assert.match(refresh, /last_seen_at = now\(\)/);
  assert.match(refresh, /statusChanged \+= 1/);
  assert.match(refresh, /previousById/);
  assert.match(refresh, /RETURNING contract_id::text/);
  assert.doesNotMatch(refresh, /DELETE FROM f10_customer_contracts/);
  assert.doesNotMatch(refresh, /(?:UPDATE|INSERT INTO|DELETE FROM) customer_units/);
  assert.doesNotMatch(refresh, /(?:UPDATE|INSERT INTO|DELETE FROM) customer_contract_access/);
  assert.doesNotMatch(refresh, /(?:UPDATE|INSERT INTO|DELETE FROM) f10_customer_contract_profiles/);

  assert.match(serverRoute, /requireAppPermission/);
  assert.match(serverRoute, /hasPermission\(permissions, "customers.manage", "all"\)/);
  assert.match(serverRoute, /refreshF10CustomerContracts/);
  assert.match(serverRoute, /statusChanged/);
  assert.match(serverRoute, /redirect\(303/);
});

test("the customers list offers refresh and keeps commercial information secondary", () => {
  const page = source("src/routes/app/customers/+page.svelte");
  const route = source("src/routes/app/customers/+page.server.ts");

  assert.match(page, /action="\?\/refresh"/);
  assert.match(page, /"Atualizar"/);
  assert.doesNotMatch(page, /Sem complemento/);
  assert.match(page, /app\/customers\/contracts/);
  assert.match(route, /"__active__"/);
  assert.match(route, /listF10CustomerContractUnits/);
  assert.doesNotMatch(route, /listImportedCustomerUnits/);
});

test("the contract status badge follows the canonical numeric status", () => {
  const page = source("src/routes/app/customers/+page.svelte");
  assert.match(page, /unit.is_active \? "Ativo" : "Não ativo"/);
  assert.match(page, /data.refreshedSummary.statusChanged/);
  assert.match(page, /data.refreshedSummary.synchronized/);
  assert.doesNotMatch(page, /String\(unit.commercial_status\).toLowerCase\(\) === "ativo"/);
});
