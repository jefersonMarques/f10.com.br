import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

test("editing settings and teams preserves the relevant section after form submits", () => {
  const general = readFileSync("src/routes/app/settings/+page.svelte", "utf8");
  const attendance = readFileSync("src/routes/app/settings/atendimento/+page.svelte", "utf8");
  const team = readFileSync("src/routes/app/team/+page.svelte", "utf8");
  assert.match(general, /form\?\.action === "saveIframeF10"/);
  assert.match(attendance, /formAction === "saveRouting"/);
  assert.match(attendance, /"saveQueueSla"/);
  assert.match(team, /form.action === "updateTeam"/);
});
