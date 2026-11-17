import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { buildTicketNumberPlan } from "../scripts/lib/ticketNumberReconciliationPlan.mjs";

const originalRows = [
  { id: "native-a", current_number: "9", source_ticket_id: null },
  { id: "import-9", current_number: "1000", source_ticket_id: "9" },
  { id: "native-b", current_number: "5", source_ticket_id: null },
  { id: "import-12", current_number: "1001", source_ticket_id: "12" },
];

test("preserves Movidesk numbers and orders native F10 tickets deterministically", () => {
  const plan = buildTicketNumberPlan(originalRows);

  assert.equal(plan.importedTickets, 2);
  assert.equal(plan.nativeTickets, 2);
  assert.equal(plan.maximumMovideskNumber, 12);
  assert.equal(plan.nativeStartingNumber, 13);
  assert.equal(plan.maximumTargetNumber, 14);
  assert.equal(plan.changes.length, 4);
  assert.equal(plan.collidingPreviousNumbers, 1);

  const numbers = new Map(plan.changes.map((change) => [change.ticketId, change.nextNumber]));
  assert.deepEqual([...numbers], [
    ["native-a", 13],
    ["import-9", 9],
    ["native-b", 14],
    ["import-12", 12],
  ]);
  assert.equal(new Set(plan.changes.map((change) => change.temporaryNumber)).size, 4);
  assert.ok(plan.changes.every((change) => change.temporaryNumber > 1001));
  assert.equal(buildTicketNumberPlan(originalRows).planHash, plan.planHash);
});

test("fails closed on Movidesk source IDs representing the same number", () => {
  const rows = [
    { id: "one", current_number: "1", source_ticket_id: "9" },
    { id: "two", current_number: "2", source_ticket_id: "0009" },
  ];
  assert.throws(() => buildTicketNumberPlan(rows), /MOVIDESK_SOURCE_NUMBER_COLLISION/);
});

test("rejects unsafe and nonnumeric source numbers", () => {
  assert.throws(() => buildTicketNumberPlan([
    { id: "one", current_number: "1", source_ticket_id: "9007199254740992" },
  ]), /INVALID_TICKET_NUMBER/);
  assert.throws(() => buildTicketNumberPlan([
    { id: "one", current_number: "1", source_ticket_id: "legacy-9" },
  ]), /MOVIDESK_SOURCE_NUMBER_INVALID/);
});

test("reconciled numbers require no further updates", () => {
  const plan = buildTicketNumberPlan([
    { id: "import", current_number: "9", source_ticket_id: "9" },
    { id: "native", current_number: "10", source_ticket_id: null },
  ]);
  assert.equal(plan.changes.length, 0);
});

test("migration guards the plan and records previous IDs", () => {
  const migration = readFileSync("migrations/0120_ticket_number_continuity.sql", "utf8");
  const script = readFileSync("scripts/reconcile-ticket-numbers.mjs", "utf8");
  const workspace = readFileSync("src/lib/server/support/ticketWorkspaceRepository.ts", "utf8");
  const portal = readFileSync("src/lib/server/customerPortal/customerF10TicketRepository.ts", "utf8");

  assert.match(migration, /CREATE TABLE IF NOT EXISTS ticket_number_aliases/);
  assert.match(script, /TICKET_NUMBER_PLAN_CHANGED_RERUN_PREVIEW/);
  assert.match(script, /ACCESS EXCLUSIVE MODE/);
  assert.match(script, /TICKET_NUMBER_FINAL_VERIFICATION_FAILED/);
  assert.match(script, /SET TRANSACTION READ ONLY/);
  assert.match(workspace, /ticket_number_aliases alias/);
  assert.match(portal, /ticket_number_aliases alias/);
});
