import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { selectAuthorizedSchoolContracts } from "../src/lib/support/ticketSchoolContractSelection.ts";

const school = (contractId, isActive = true) => ({ contractId, isActive });

test("selects the only authorized contract, regardless of active status", () => {
  assert.deepEqual(
    selectAuthorizedSchoolContracts([school("1")], []),
    [school("1")],
  );
  assert.deepEqual(
    selectAuthorizedSchoolContracts([school("1", false)], []),
    [school("1", false)],
  );
});

test("requires manual selection when several authorized contracts exist", () => {
  assert.deepEqual(
    selectAuthorizedSchoolContracts([school("1"), school("2", false)], []),
    [],
  );
  assert.deepEqual(
    selectAuthorizedSchoolContracts([school("1"), school("2", false)], ["2"]),
    [school("2", false)],
  );
});

test("never selects an unrecognized contract or grants new access", () => {
  assert.deepEqual(
    selectAuthorizedSchoolContracts([school("1", false)], ["999"]),
    [school("1", false)],
  );
  assert.deepEqual(
    selectAuthorizedSchoolContracts([school("1"), school("2", false)], ["999"]),
    [],
  );
});

test("contract grants still require admin permissions and audited existing contracts", () => {
  const endpoint = readFileSync(
    "src/routes/api/app/customers/[customerId]/contracts/+server.ts", "utf8",
  );
  const repository = readFileSync(
    "src/lib/server/support/customerContractAccessRepository.ts", "utf8",
  );

  assert.match(endpoint, /hasPermission\(permissions, "customers.manage", "all"\)/);
  assert.match(endpoint, /hasPermission\(permissions, "tickets.create"\)/);
  assert.match(repository, /FROM f10_customer_contracts/);
  assert.match(repository, /WHERE unit_id = \$\{unitId\} AND contract_id = \$\{contractId\}/);
  assert.match(repository, /customer_contract_access_events/);
  assert.match(repository, /ON CONFLICT \(customer_contact_id, unit_id, contract_id\) DO NOTHING/);
  const grant = repository.split("export async function grantContactContractAccess(")[1]
    ?.split("export async function replaceContactContractAccess(")[0];
  assert.ok(grant);
  assert.doesNotMatch(grant, /status = 1|data_cancelamento IS NULL|SUPPORT_CONTRACT_NOT_ACTIVE/);
});

test("ticket creation checks contract existence without requiring active status", () => {
  const support = readFileSync("src/lib/server/support/supportRepository.ts", "utf8");
  const validate = support.split("async function ensureExistingTicketContracts(")[1]
    ?.split("function tagTicketCreationError(")[0];
  assert.ok(validate);
  assert.match(validate, /FROM f10_customer_contracts/);
  assert.match(validate, /SUPPORT_CONTRACT_NOT_FOUND/);
  assert.doesNotMatch(validate, /status = 1|data_cancelamento IS NULL/);

  assert.doesNotMatch(support, /SUPPORT_CONTRACT_NOT_ACTIVE|ensureActiveTicketContracts/);
  assert.match(support, /customer_contract_access_events/);
});

test("inactive contracts remain selectable in the operator form", () => {
  const picker = readFileSync(
    "src/lib/components/operations/TicketCustomerPicker.svelte", "utf8",
  );
  const modal = readFileSync(
    "src/lib/components/operations/TicketContractAccessModal.svelte", "utf8",
  );
  assert.match(picker, /\{#if !contract.isActive\} · Inativo\{\/if\}/);
  assert.doesNotMatch(picker, /disabled=\{!contract.isActive|if \(!contract.isActive/);
  assert.match(modal, /\{#if !contract.isActive\} · Inativo\{\/if\}/);
  assert.doesNotMatch(modal, /disabled=\{!contract.isActive|if \(!contract.isActive/);
});

test("attendee lookup requires selected contract authorization", () => {
  const route = readFileSync("src/routes/api/app/customers/search/+server.ts", "utf8");
  const directory = readFileSync("src/lib/server/support/customerDirectoryRepository.ts", "utf8");
  assert.match(route, /attendeeSearch/);
  assert.match(route, /getAll\("contractId"\)/);
  assert.match(directory, /contractAccessCondition/);
  assert.match(directory, /NOT EXISTS \(/);
});

test("school audit is strictly read-only", () => {
  const script = readFileSync("scripts/audit-support-school-contract-access.mjs", "utf8");
  assert.match(script, /SET TRANSACTION READ ONLY/);
  assert.match(script, /automaticGrantsPerformed: 0/);
  assert.doesNotMatch(script, /INSERT INTO|UPDATE customer|DELETE FROM customer/i);
});
