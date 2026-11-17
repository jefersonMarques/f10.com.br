import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

function source(path) {
  return readFileSync(path, "utf8");
}

test("ticket search accepts exact F10 and original Movidesk numbers", () => {
  const parser = source("src/lib/support/ticketNumberSearch.ts");
  const workspace = source("src/lib/server/support/ticketWorkspaceRepository.ts");
  const loader = source("src/routes/app/tickets/+page.server.ts");
  const toolbar = source("src/lib/components/operations/tickets/TicketToolbar.svelte");

  assert.match(parser, /Number\.isSafeInteger\(number\)/);
  assert.match(workspace, /eq\(tickets\.ticketNumber, Number\(ticketNumberSearch\)\)/);
  assert.match(workspace, /imported\.source_ticket_id = \$\{ticketNumberSearch\}/);
  assert.match(loader, /Boolean\(parseTicketNumberSearch\(search\)\)/);
  assert.match(toolbar, /ID do ticket, cliente ou empresa/);
});

test("ticket number reconciliation audit cannot modify production data", () => {
  const audit = source("scripts/audit-ticket-number-reconciliation.mjs");
  assert.match(audit, /SET TRANSACTION READ ONLY/);
  assert.match(audit, /historicalNumberChangesRequired/);
  assert.match(audit, /conflictsWithNativeTickets/);
  assert.doesNotMatch(audit, /\bUPDATE\s+tickets\b/i);
  assert.doesNotMatch(audit, /\bDELETE\s+FROM\s+tickets\b/i);
});
