import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

function source(path) {
  return readFileSync(path, "utf8");
}

test("ticket creation returns actionable errors and a diagnostic reference", () => {
  const server = source("src/routes/app/tickets/+page.server.ts");

  assert.match(server, /SUPPORT_TICKET_CONTRACT_REQUIRED: "Selecione ao menos um contrato/);
  assert.match(server, /TICKET_WORKFLOW_ENTRY_POINT_INVALID:/);
  assert.match(server, /\[ticket\.create\.failed\]/);
  assert.match(server, /randomUUID\(\)\.slice\(0, 8\)/);
  assert.match(server, /"23505"/);
  assert.match(server, /domainCode/);
  assert.doesNotMatch(server, /console\.error\([^\n]*cause\)/);
});

test("ticket form prevents empty contracts and retains inputs on action failure", () => {
  const dialog = source("src/lib/components/operations/tickets/TicketCreateDialog.svelte");
  const page = source("src/routes/app/tickets/+page.svelte");

  assert.match(dialog, /formData\.getAll\("contractIds"\)\.length === 0/);
  assert.match(dialog, /await update\(\{ reset: false \}\)/);
  assert.match(dialog, /role="alert"/);
  assert.match(page, /errorMessage=\{form\?\.action === "create"/);
});

test("read-only ticket creation audit checks sequence and schema readiness", () => {
  const script = source("scripts/diagnose-ticket-creation.mjs");

  assert.match(script, /SET TRANSACTION READ ONLY/);
  assert.match(script, /pg_get_serial_sequence/);
  assert.match(script, /sequenceBehind/);
  assert.match(script, /ticket_contract_links/);
  assert.doesNotMatch(script, /\bUPDATE\s+tickets\b|\bDELETE\s+FROM\s+tickets\b/i);
});
