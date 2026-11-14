import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const repository = readFileSync("src/lib/server/reports/supportPresenceTimelineRepository.ts", "utf8");
const endpoint = readFileSync("src/routes/api/app/performance/presence/+server.ts", "utf8");
const view = readFileSync("src/lib/components/operations/SupportPresencePanel.svelte", "utf8");

test("presence reporting uses configured support hours and connected-time denominator", () => {
  assert.match(repository, /getSupportHoursSettings/);
  assert.match(repository, /verifiedTimezone/);
  assert.match(repository, /connectedMilliseconds \/ elapsed/);
  assert.match(repository, /getSupportRoutingSettings/);
  assert.match(repository, /last_activity_at \+ interval '10 minutes'/);
});

test("presence API requires reports permission and the UI exposes filters", () => {
  assert.match(endpoint, /requireAppPermission\(cookies, "reports.view"/);
  assert.match(endpoint, /private, no-store/);
  assert.match(view, /bind:value=\{teamFilter\}/);
  assert.match(view, /bind:value=\{statusFilter\}/);
  assert.match(view, /role="tooltip"/);
});
