import assert from "node:assert/strict";
import test from "node:test";
import {
  classifyTicketLoadFailure,
} from "../src/lib/server/support/ticketLoadFailure.ts";

test("an inaccessible ticket produces HTTP 403", () => {
  for (const code of ["TICKET_NOT_ACCESSIBLE", "TICKET_PERMISSION_NOT_ALLOWED"]) {
    const result = classifyTicketLoadFailure(new Error(code));
    assert.equal(result.status, 403);
    assert.match(result.message, /permissão/);
  }
});

test("a genuinely missing ticket produces HTTP 404", () => {
  const result = classifyTicketLoadFailure(new Error("TICKET_NOT_FOUND"));
  assert.equal(result.status, 404);
  assert.equal(result.message, "Ticket não encontrado.");
});

test("a PostgreSQL query error is not reported as a missing ticket", () => {
  const databaseError = Object.assign(
    new Error("for SELECT DISTINCT, ORDER BY expressions must appear in select list"),
    { code: "42P10" },
  );
  const result = classifyTicketLoadFailure(databaseError);

  assert.equal(result.status, 500);
  assert.equal(result.databaseCode, "42P10");
  assert.equal(result.message, "Não foi possível carregar este ticket.");
});

test("a nested PostgreSQL error retains its diagnostic code", () => {
  const databaseError = Object.assign(new Error("query failed"), {
    code: "42P10",
  });
  const result = classifyTicketLoadFailure(new Error("database failure", {
    cause: databaseError,
  }));

  assert.equal(result.status, 500);
  assert.equal(result.databaseCode, "42P10");
});

test("unexpected exceptions remain server errors without leaking details", () => {
  const result = classifyTicketLoadFailure(new Error("internal sensitive details"));
  assert.equal(result.status, 500);
  assert.doesNotMatch(result.message, /sensitive/);
});
