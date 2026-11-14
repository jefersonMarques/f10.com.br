import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import test from "node:test";

const logoPath = "/branding/f10-helpdesk-white.png";
const views = [
  "src/routes/login/+page.svelte",
  "src/routes/cliente/+page.svelte",
  "src/routes/ajuda-f10/+page.svelte",
  "src/lib/components/customerPortal/CustomerPortalNavigation.svelte",
];

test("public Helpdesk uses the supplied white asset without logo plates", () => {
  const image = readFileSync(`static${logoPath}`);
  assert.equal(image.subarray(0, 8).toString("hex"), "89504e470d0a1a0a");
  assert.equal(createHash("sha256").update(image).digest("hex"), "12682ffd6ac0ddafa4d9eb426c20b083a6b313f936418b682c604e76c283dbe9");
  for (const view of views) {
    const source = readFileSync(view, "utf8");
    assert.ok(source.includes(logoPath), view);
  }

  const login = readFileSync(views[0], "utf8");
  assert.doesNotMatch(login, /border-white\/15 bg-white\/10 px-4 py-3/);
});
