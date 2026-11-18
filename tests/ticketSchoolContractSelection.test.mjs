import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { selectAuthorizedSchoolContracts } from "../src/lib/support/ticketSchoolContractSelection.ts";

const school = (contractId, isActive = true) => ({ contractId, isActive });

test("selects the only active authorized school by default", () => {
  assert.deepEqual(
    selectAuthorizedSchoolContracts([school("1")], []),
    [school("1")],
  );
  assert.deepEqual(
    selectAuthorizedSchoolContracts([school("1"), school("2", false)], []),
    [school("1")],
  );
});

test("does not guess a school when multiple active contracts exist", () => {
  assert.deepEqual(
    selectAuthorizedSchoolContracts([school("1"), school("2")], []),
    [],
  );
  assert.deepEqual(
    selectAuthorizedSchoolContracts([school("1"), school("2")], ["2"]),
    [school("2")],
  );
});

test("never selects inactive or unrecognized contracts", () => {
  assert.deepEqual(
    selectAuthorizedSchoolContracts([school("1", false)], ["1"]),
    [],
  );
  assert.deepEqual(
    selectAuthorizedSchoolContracts([school("1"), school("2")], ["999"]),
    [],
  );
});

test("contract grants require admin permissions, active contracts and audit", () => {
  const endpoint = readFileSync(
    "src/routes/api/app/customers/[customerId]/contracts/+server.ts", "utf8",
  );
  const repository = readFileSync(
    "src/lib/server/support/customerContractAccessRepository.ts", "utf8",
  );

  assert.match(endpoint, /hasPermission\(permissions, "customers.manage", "all"\)/);
  assert.match(endpoint, /hasPermission\(permissions, "tickets.create"\)/);
  assert.match(repository, /status = 1 AND data_cancelamento IS NULL/);
  assert.match(repository, /customer_contract_access_events/);
  assert.match(repository, /ON CONFLICT \(customer_contact_id, unit_id, contract_id\) DO NOTHING/);
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
