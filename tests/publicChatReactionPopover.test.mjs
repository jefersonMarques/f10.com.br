import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

test("message actions always render with an opaque, readable overlay", () => {
  const source = readFileSync("src/lib/components/support/MessageActionMenu.svelte", "utf8");
  assert.match(source, /bg-white p-2 text-\[#192237\]/);
  assert.match(source, /background-color: #ffffff/);
  assert.match(source, /absolute bottom-9 right-0/);
  assert.match(source, /aria-label="Ações da mensagem"/);
  assert.match(source, /canCreateTask/);
  for (const emoji of ["👍", "❤️", "✅", "👀"]) {
    assert.ok(source.includes(emoji));
  }
});
