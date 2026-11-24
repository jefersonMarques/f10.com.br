import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = readFileSync("src/lib/components/operations/MentionTextarea.svelte", "utf8");

test("mention suggestions escape clipped ticket and chat containers", () => {
  assert.match(source, /popover="manual"/);
  assert.match(source, /suggestionsPopover\.showPopover\(\)/);
  assert.match(source, /suggestionsPopover\.hidePopover\(\)/);
  assert.match(source, /getBoundingClientRect\(\)/);
  assert.match(source, /availableAbove/);
  assert.match(source, /availableBelow/);
  assert.match(source, /background-color: #ffffff/);
  assert.match(source, /on:pointerdown\|preventDefault/);
});

test("mention text and recipient IDs remain linked to the selected user", () => {
  assert.match(source, /name="mentionedUserIds"/);
  assert.match(source, /value=\{JSON\.stringify\(activeMentionIds\)\}/);
  assert.match(source, /selectedMentions = \[\.\.\.selectedMentions, \{ id: user\.id, token \}]/);
  assert.match(source, /on:keydown=\{handleKeydown\}/);
  assert.match(source, /event\.key === "ArrowDown"/);
  assert.match(source, /event\.key === "Enter"/);
});

test("both ticket and chat note composers share mention component", () => {
  for (const file of [
    "src/lib/components/operations/tickets/TicketDetails.svelte",
    "src/routes/app/chat/[sessionId]/+page.svelte",
  ]) {
    const content = readFileSync(file, "utf8");
    assert.match(content, /<MentionTextarea users=/);
  }
});

test("mention positioning is coalesced and cancelled when the popover closes", () => {
  assert.match(source, /if \(positionFrame !== null \|\| !active \|\| !open\) return/);
  assert.match(source, /positionFrame = requestAnimationFrame/);
  assert.match(source, /cancelAnimationFrame\(positionFrame\)/);
  assert.match(source, /suggestionsPopover\?\.contains\(target\)\) return/);
  assert.match(source, /suggestionsPopover\.style\[property\] !== value/);
  assert.doesNotMatch(source, /await tick\(\)/);
  assert.doesNotMatch(source, /addEventListener\("scroll", positionSuggestions/);
});

test("unchanged cursor and query do not trigger another mention update", () => {
  assert.match(source, /query === nextQuery && mentionStart === nextStart && open\) return/);
  assert.match(source, /refreshMentionState\(input\.value\)/);
  assert.match(source, /if \(!active && open\) closeSuggestions\(\)/);
  assert.match(source, /event\.stopPropagation\(\)/);
});
