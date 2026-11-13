import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { parseTicketCustomerLinkForm } from "../src/lib/server/support/ticketCustomerForm.ts";

function source(path) {
  return readFileSync(path, "utf8");
}

test("manual ticket requires a person and independently selected contracts", () => {
  const form = new FormData();
  form.set("customerMode", "existing");
  form.set("customerContactId", "a81e4b3b-3587-4f31-a6c9-7e090f13514b");
  form.append("contractIds", "24");
  form.append("contractIds", "639");
  form.append("participantIds", "d8447cbb-bbf0-47bf-b303-cbad286de141");
  const result = parseTicketCustomerLinkForm(form);
  assert.equal(result.customerContactId, form.get("customerContactId"));
  assert.deepEqual(result.contractIds, [24, 639]);
  assert.equal(result.customerContextTicketId, null);
  assert.equal(result.participantIds.length, 1);
});

test("a new person may be created without legacy F10 group context", () => {
  const form = new FormData();
  form.set("customerMode", "new");
  form.set("customerName", "New Customer");
  form.set("customerEmail", "new@example.com");
  form.append("contractIds", "639");
  const result = parseTicketCustomerLinkForm(form);
  assert.equal(result.customerMode, "new");
  assert.equal(result.groupId, null);
  assert.equal(result.unitId, null);
  assert.deepEqual(result.contractIds, [639]);
});

test("duplicate, invalid, and oversized contract selections are rejected", () => {
  for (const ids of [["24", "24"], ["0"], ["bad"], ["9007199254740993"]]) {
    const form = new FormData();
    form.set("customerMode", "existing");
    form.set("customerContactId", "a81e4b3b-3587-4f31-a6c9-7e090f13514b");
    for (const id of ids) form.append("contractIds", id);
    assert.throws(
      () => parseTicketCustomerLinkForm(form),
      /SUPPORT_CONTRACT_SELECTION_INVALID/,
    );
  }
});

test("multi-contract relationships use stable IDs and explicit support permissions", () => {
  const migration = source("migrations/0114_support_contact_contract_access.sql");
  const repository = source("src/lib/server/support/customerContractAccessRepository.ts");
  const support = source("src/lib/server/support/supportRepository.ts");
  assert.match(migration, /PRIMARY KEY \(customer_contact_id, unit_id, contract_id\)/);
  assert.match(migration, /PRIMARY KEY \(ticket_id, unit_id, contract_id\)/);
  assert.match(migration, /INSERT INTO ticket_contract_links/);
  assert.match(repository, /assertContactAccess/);
  assert.match(repository, /SUPPORT_TICKET_CONTRACT_FORBIDDEN/);
  assert.match(repository, /UPDATE ticket_participants participant/);
  assert.match(support, /addInitialTicketParticipants/);
  assert.match(support, /saveTicketContracts/);
  assert.match(support, /SUPPORT_TICKET_CONTRACT_REQUIRED/);
});

test("a participant never receives portal rights without all contract permissions", () => {
  const ownership = source("src/lib/server/customerPortal/ticketOwnership.ts");
  const repository = source("src/lib/server/support/customerContractAccessRepository.ts");
  assert.match(ownership, /authorizedContractScope/);
  assert.match(ownership, /participant.portal_access_enabled = true/);
  assert.match(ownership, /customer_contract_access/);
  assert.match(repository, /portal_access_enabled, notifications_enabled/);
  assert.match(repository, /portal_access_enabled = false/);
});

test("customer merging archives a manual source and retains historical IDs", () => {
  const contacts = source("src/lib/server/support/customerContactManagementRepository.ts");
  const detail = source("src/routes/app/customers/[customerId]/+page.server.ts");
  assert.match(contacts, /CUSTOMER_MERGE_LOGIN_SOURCE_FORBIDDEN/);
  assert.match(contacts, /INSERT INTO customer_contact_merges/);
  assert.match(contacts, /UPDATE customer_contacts SET active = false/);
  assert.match(detail, /mergeCustomerContacts/);
});

test("customer screens show active contracts, full details and manual-person creation", () => {
  const listing = source("src/routes/app/customers/+page.server.ts");
  const details = source("src/routes/app/customers/contracts/[contractId]/+page.server.ts");
  const page = source("src/routes/app/customers/+page.svelte");
  assert.match(listing, /"__active__"/);
  assert.match(details, /getContractTicketCounts/);
  assert.match(page, /app\/customers\/new/);
  assert.match(page, /app\/customers\/contracts/);
});
