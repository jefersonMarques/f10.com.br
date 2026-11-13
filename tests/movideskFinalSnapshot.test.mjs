import assert from "node:assert/strict";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import {
  iterateSnapshotLines,
  mapSnapshotChannel,
  mapSnapshotStatus,
  parseSnapshotOptions,
  parseSnapshotDate,
  splitMovideskChatTranscript,
  validateSnapshotRecord,
} from "../scripts/lib/movideskSnapshot.mjs";

test("timezone-free Movidesk dates use UTC, matching the exported chat time", () => {
  assert.equal(
    parseSnapshotDate("2026-11-09T15:15:55.3569949")?.toISOString(),
    "2026-11-09T15:15:55.356Z",
  );
  assert.equal(
    parseSnapshotDate("2026-11-09T15:15:55.3569949Z")?.toISOString(),
    "2026-11-09T15:15:55.356Z",
  );
  assert.equal(parseSnapshotDate("invalid", null), null);
});

test("maps canceled tickets to closed without discarding their original state", () => {
  assert.equal(mapSnapshotStatus("Resolved"), "resolved");
  assert.equal(mapSnapshotStatus("Closed"), "closed");
  assert.equal(mapSnapshotStatus("Canceled"), "closed");
  assert.throws(() => mapSnapshotStatus("New"), /UNSUPPORTED_SNAPSHOT_STATUS/);
});

test("preserves historical chat, email and WhatsApp channels", () => {
  assert.equal(mapSnapshotChannel(5), "web_chat");
  assert.equal(mapSnapshotChannel(3), "email");
  assert.equal(mapSnapshotChannel(7), "email");
  assert.equal(mapSnapshotChannel(18), "whatsapp");
  assert.equal(mapSnapshotChannel(23), "whatsapp");
  assert.equal(mapSnapshotChannel(0), "manual");
});

test("all database changes require an explicit apply flag and batch or all selection", () => {
  const preview = parseSnapshotOptions([]);
  assert.equal(preview.apply, false);
  assert.equal(preview.directory, "/var/lib/f10/movidesk-final-snapshot");
  assert.deepEqual(
    parseSnapshotOptions(["--apply", "--limit", "10", "--offset", "20"]),
    { ...preview, apply: true, limit: 10, offset: 20 },
  );
  assert.equal(parseSnapshotOptions(["--apply", "--all"]).all, true);
  assert.throws(() => parseSnapshotOptions(["--apply"]), /APPLY_REQUIRES_ALL_OR_LIMIT/);
  assert.throws(() => parseSnapshotOptions(["--all"]), /ALL_REQUIRES_APPLY/);
  assert.throws(() => parseSnapshotOptions(["--apply", "--all", "--limit", "2"]), /INVALID_ARGUMENTS/);
  assert.throws(() => parseSnapshotOptions(["--apply", "--limit", "0"]), /INVALID_ARGUMENTS/);
});

test("parses the actual Movidesk chat header with the first timestamp attached", () => {
  const source = [
    "Fuso horário: America/Sao_Paulo09/11/2026 12:15 - : Bom dia, como podemos ajudar?",
    "09/11/2026 12:16 - Rodrigo: Dúvida do Operacional",
    "09/11/2026 12:27 - Marina: Olá, Rodrigo!",
    "",
  ].join("\r\n");

  const messages = splitMovideskChatTranscript(source);
  assert.equal(messages?.length, 3);
  assert.equal(messages?.[0].authorName, "");
  assert.equal(messages?.[0].createdAt.toISOString(), "2026-11-09T15:15:00.000Z");
  assert.equal(messages?.[1].authorName, "Rodrigo");
  assert.equal(messages?.[1].body, "Dúvida do Operacional");
  assert.equal(messages?.[2].createdAt.toISOString(), "2026-11-09T15:27:00.000Z");
});

test("an unknown chat format must preserve its original action rather than invent messages", () => {
  assert.equal(splitMovideskChatTranscript("custom transcript without dates"), null);
  assert.equal(splitMovideskChatTranscript(""), null);
});

test("the snapshot validator checks original IDs, status and inventory route", () => {
  const inventory = new Map([
    ["43205", { route: "/tickets", status: "Resolved" }],
  ]);
  const valid = {
    sourceId: "43205",
    sourceRoute: "/tickets",
    ticket: { id: "43205", baseStatus: "Resolved", actions: [] },
  };
  assert.equal(validateSnapshotRecord(valid, inventory), "43205");
  assert.throws(
    () => validateSnapshotRecord({
      ...valid,
      sourceRoute: "/tickets/past",
    }, inventory),
    /SNAPSHOT_INVENTORY_MISMATCH/,
  );
  assert.throws(
    () => validateSnapshotRecord({
      ...valid,
      ticket: { ...valid.ticket, id: "43206" },
    }, inventory),
    /INVALID_SOURCE_TICKET_ID/,
  );
});

test("streams JSONL line-by-line and rejects malformed records", async () => {
  const directory = mkdtempSync(join(tmpdir(), "movidesk-import-test-"));
  const validPath = join(directory, "tickets.jsonl");
  const invalidPath = join(directory, "invalid.jsonl");
  try {
    writeFileSync(validPath, [
      JSON.stringify({ sourceId: "1", ticket: { id: "1" } }),
      JSON.stringify({ sourceId: "2", ticket: { id: "2" } }),
      "",
    ].join("\n"));
    writeFileSync(invalidPath, '{"sourceId":"1"}\n{not-json}\n');

    const numbers = [];
    for await (const { lineNumber, record } of iterateSnapshotLines(validPath)) {
      numbers.push([lineNumber, record.sourceId]);
    }
    assert.deepEqual(numbers, [[1, "1"], [2, "2"]]);

    await assert.rejects(async () => {
      for await (const _ of iterateSnapshotLines(invalidPath)) {
        // A leitura deve interromper ao encontrar JSON inválido.
      }
    }, /INVALID_SNAPSHOT_JSON_LINE_2/);
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});
