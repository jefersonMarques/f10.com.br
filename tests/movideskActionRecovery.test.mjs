import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";
import {
  activeSnapshotActions,
  actionSourceFingerprint,
  classifyDuplicateAction,
  duplicateActionOccurrences,
} from "../scripts/lib/movideskActionRecovery.mjs";

const original = {
  id: 2,
  description: "Original text",
  createdDate: "2020-01-01T12:00:00Z",
  createdBy: { id: "customer-a", profileType: 2 },
  attachments: [],
};

test("preserves the occurrence index and source fingerprint for duplicate IDs", () => {
  const ticket = {
    actions: [
      original,
      { ...original, description: "Different text" },
      { ...original, description: "Third text" },
      { id: 3, description: "Another action" },
    ],
  };

  assert.equal(activeSnapshotActions(ticket).length, 4);
  const duplicates = duplicateActionOccurrences(ticket);
  assert.deepEqual(duplicates.map((row) => row.occurrenceIndex), [1, 2]);
  assert.deepEqual(duplicates.map((row) => row.sourceActionId), [2, 2]);
  assert.equal(duplicates[0].recoverMessage, true);
  assert.equal(duplicates[0].needsChatReview, false);
  assert.equal(duplicates[0].sourceSha256.length, 64);
  assert.deepEqual(JSON.parse(duplicates[1].sourceActionJson), ticket.actions[2]);
});

test("keeps date-only and status-only differences in archive without duplicate messages", () => {
  const timestamp = { ...original, createdDate: "2020-01-02T12:00:00Z" };
  const status = { ...original, type: 2, status: 3 };
  assert.equal(classifyDuplicateAction(original, timestamp).recoverMessage, false);
  assert.equal(classifyDuplicateAction(original, status).recoverMessage, false);
  assert.equal(duplicateActionOccurrences({ actions: [original, timestamp, status] }).length, 2);
});

test("recovers changed author and attachments while retaining an internal-only model", () => {
  const authorChanged = {
    ...original,
    createdBy: { id: "customer-b", profileType: 2 },
  };
  const attachmentChanged = {
    ...original,
    attachments: [{ id: "attachment-1", fileName: "file.pdf" }],
  };
  assert.equal(classifyDuplicateAction(original, authorChanged).recoverMessage, true);
  assert.equal(classifyDuplicateAction(original, attachmentChanged).recoverMessage, true);
});

test("archives duplicate full chat transcripts instead of creating giant notes", () => {
  const description = "09/11/2026 12:15 - Customer: Hello";
  const source = { ...original, origin: 5, description: "First" };
  const duplicate = { ...source, description };
  const result = classifyDuplicateAction(source, duplicate);
  assert.equal(result.recoverMessage, false);
  assert.equal(result.needsChatReview, true);
});

test("rejects invalid IDs and ignores deleted occurrences", () => {
  assert.deepEqual(duplicateActionOccurrences({
    actions: [original, { ...original, isDeleted: true }],
  }), []);
  assert.throws(() => duplicateActionOccurrences({
    actions: [{ ...original, id: 2147483648 }],
  }), /INVALID_SOURCE_ACTION_ID/);
});

test("detects alterations of source JSON, including metadata changes", () => {
  assert.notEqual(
    actionSourceFingerprint(original).sourceSha256,
    actionSourceFingerprint({ ...original, createdDate: "2020-04-01" }).sourceSha256,
  );
});

test("recovery is separate, opt-in and preserves internal visibility", () => {
  const script = readFileSync(join(process.cwd(),
    "scripts/recover-movidesk-duplicate-actions.mjs"), "utf8");
  assert.match(script, /--apply/);
  assert.match(script, /--limit/);
  assert.match(script, /--all/);
  assert.match(script, /SET TRANSACTION READ ONLY/);
  assert.match(script, /'internal'/);
  assert.match(script, /::text::jsonb/);
});
