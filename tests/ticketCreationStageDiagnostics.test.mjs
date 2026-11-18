import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const support = readFileSync("src/lib/server/support/supportRepository.ts", "utf8");
const action = readFileSync("src/routes/app/tickets/+page.server.ts", "utf8");

test("records the creation stage without exposing request content", () => {
  for (const stage of [
    "validate_queue",
    "calculate_sla",
    "resolve_start_stage",
    "validate_area_access",
    "validate_contracts",
    "resolve_customer",
    "validate_email",
    "insert_ticket",
    "save_customer_context",
    "save_contract_links",
    "save_participants",
    "save_f10_link",
    "save_workflow_state",
    "insert_initial_message",
    "insert_ticket_event",
  ]) {
    assert.ok(support.includes(stage), "Missing stage: " + stage);
  }
  assert.match(support, /Object\.defineProperty\(cause, "ticketCreationStage"/);
  assert.match(support, /tagTicketCreationError\(cause, transactionStage\)/);
  assert.match(support, /throw cause;/);
});

test("logs stage and nested database codes but no raw messages", () => {
  assert.match(action, /const stage = typeof rawStage/);
  assert.match(action, /const nestedCode = typeof nestedCause\.code/);
  assert.match(action, /\[ticket\.create\.failed\]/);
  assert.match(action, /nestedType,/);
  assert.match(action, /nestedCode,/);
  const logStart = action.indexOf('console.error("[ticket.create.failed]"');
  const logEnd = action.indexOf("\n  });", logStart);
  assert.ok(logStart >= 0 && logEnd > logStart);
  const loggedFields = action.slice(logStart, logEnd);
  assert.doesNotMatch(loggedFields, /\b(?:message|stack|sql|customerEmail|subject|body)\b\s*[:,]/);
});
