import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";
import {
  parseTicketCustomerLinkForm,
} from "../src/lib/server/support/ticketCustomerForm.ts";

function file(path) {
  return readFileSync(join(process.cwd(), path), "utf8");
}

function apiContractForm(id) {
  const form = new FormData();
  form.set("customerMode", "api_contract");
  form.set("f10ContractId", id);
  return form;
}

test("a ticket accepts an existing F10 API contract without a previous ticket", () => {
  const parsed = parseTicketCustomerLinkForm(apiContractForm("24"));
  assert.equal(parsed.customerMode, "api_contract");
  assert.equal(parsed.f10ContractId, 24);
  assert.equal(parsed.customerContextTicketId, null);
  assert.equal(parsed.customerContactId, null);
  assert.equal(parsed.groupId, null);
});

test("invalid API contract IDs are rejected", () => {
  for (const id of ["", "0", "-2", "1.5", "letters", "9007199254740992"]) {
    assert.throws(
      () => parseTicketCustomerLinkForm(apiContractForm(id)),
      /F10_TICKET_CONTRACT_REQUIRED/,
    );
  }
});

test("API contract selections require global customer visibility and stable IDs", () => {
  const source = file("src/lib/server/support/supportRepository.ts");
  const resolver = file("src/lib/server/support/f10TicketContractRepository.ts");
  const api = file("src/routes/api/app/customers/contracts/search/+server.ts");

  assert.match(source, /hasPermission\(permissions, "customers.view", "all"\)/);
  assert.match(source, /resolveF10TicketContract/);
  assert.match(source, /INSERT INTO ticket_f10_contract_links/);
  assert.match(source, /customer\.f10Contract \|\| customer\.groupId === null/);
  assert.match(resolver, /c\.unit_id = \$\{unitId\} AND c\.contract_id = \$\{contractId\}/);
  assert.match(resolver, /f10_customer_external_identities/);
  assert.match(resolver, /ON CONFLICT \(import_source, import_source_id\)/);
  assert.doesNotMatch(resolver, /lower\(.*email.*\).*customer_contacts/);
  assert.match(api, /hasPermission\(permissions, "customers.view", "all"\)/);
  assert.match(api, /hasPermission\(permissions, "tickets.create"\)/);
});

test("ticket picker includes API contracts, existing helpdesk contacts and contract selection", () => {
  const picker = file("src/lib/components/operations/TicketCustomerPicker.svelte");
  assert.match(picker, /\/api\/app\/customers\/contracts\/search/);
  assert.match(picker, /\/api\/app\/customers\/search/);
  assert.match(picker, /name="f10ContractId"/);
  assert.match(picker, /function selectContract/);
  assert.match(picker, /selectedContracts/);
  assert.match(picker, /Solicitante principal/);
  assert.match(picker, /Pessoas acompanhantes/);
});

test("contract details are protected, loaded on click and separate account from person", () => {
  const directory = file("src/lib/server/support/f10CustomerContractDirectoryRepository.ts");
  const page = file("src/routes/app/customers/+page.svelte");
  const detailsPage = file("src/routes/app/customers/contracts/[contractId]/+page.svelte");
  const detailApi = file("src/routes/api/app/customers/contracts/[contractId]/+server.ts");

  assert.match(directory, /p\.spreadsheet_student_name/);
  assert.match(directory, /AS account_name/);
  assert.match(directory, /AS person_name/);
  assert.match(page, /\/app\/customers\/contracts\//);
  assert.doesNotMatch(page, /F10ContractDetailsModal/);
  assert.match(detailsPage, /Pessoa vinculada/);
  assert.match(detailsPage, /Titular/);
  assert.match(detailsPage, /<svelte:component this=\{field.icon\}/);
  assert.match(detailApi, /hasPermission\(permissions, "customers.view", "all"\)/);
});
