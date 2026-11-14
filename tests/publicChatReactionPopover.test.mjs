import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

test("reaction menu uses an opaque browser top-layer popover", () => {
  const source = readFileSync("src/lib/components/support/MessageActionMenu.svelte", "utf8");

  assert.match(source, /popover="auto"/);
  assert.match(source, /reactionPopover\.showPopover\(\)/);
  assert.match(source, /reactionPopover\.hidePopover\(\)/);
  assert.match(source, /background-color: #ffffff/);
  assert.match(source, /shadow-\[0_16px_48px/);
  assert.match(source, /aria-label="Ações da mensagem"/);
  assert.match(source, /aria-expanded=\{menuOpen\}/);
  assert.match(source, /canCreateTask/);
  assert.match(source, /removeMenuListeners/);
  for (const emoji of ["👍", "❤️", "✅", "👀"]) {
    assert.ok(source.includes(emoji));
  }
});
