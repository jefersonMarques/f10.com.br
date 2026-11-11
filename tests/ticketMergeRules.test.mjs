import assert from "node:assert/strict";
import test from "node:test";
import {
  ensureDistinctMergeGroups,
  uniqueMergeMemberIds,
  isTicketMergeRoot,
} from "../src/lib/support/ticketMergeRules.ts";

test("tickets already in one merged group cannot be merged again", () => {
  assert.throws(
    () => ensureDistinctMergeGroups("root-1", "root-1"),
    /TICKET_MERGE_ALREADY_GROUPED/,
  );
  assert.doesNotThrow(() => ensureDistinctMergeGroups("root-1", "root-2"));
});

test("group verification deduplicates descendant identities", () => {
  assert.deepEqual(
    uniqueMergeMemberIds([["root-1", "child"], ["root-2", "child"]]),
    ["root-1", "child", "root-2"],
  );
});

test("only the root is the canonical conversation owner", () => {
  assert.equal(isTicketMergeRoot("root-1", "root-1"), true);
  assert.equal(isTicketMergeRoot("root-1", "source-2"), false);
});
