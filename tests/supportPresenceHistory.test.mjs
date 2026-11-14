import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const migration = readFileSync("migrations/0115_support_presence_timeline.sql", "utf8");
const source = readFileSync("src/lib/server/support/supportAgentPresence.ts", "utf8");

test("presence history is explicitly recorded without reconstructing past sessions", () => {
  assert.match(migration, /CREATE TABLE IF NOT EXISTS support_presence_intervals/);
  assert.match(migration, /support_presence_intervals_open_idx/);
  assert.match(migration, /CHECK \(ended_at IS NULL OR ended_at >= started_at\)/);
  assert.match(source, /await db.transaction/);
  assert.match(source, /FOR UPDATE/);
  assert.match(source, /last_activity_at \+ interval '10 minutes'/);
  assert.match(source, /if \(stale\)/);
});
