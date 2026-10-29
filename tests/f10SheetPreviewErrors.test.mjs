import test from "node:test";
import assert from "node:assert/strict";
import { getF10SheetPreviewError } from "../src/lib/server/support/f10SheetPreviewErrors.ts";

test("identifies pending migration through nested Postgres cause without exposing SQL", () => {
  const error = new Error("Sensitive SQL", { cause: Object.assign(new Error("private query"), {
    code: "42703", query: "select customer_email",
  }) });
  const info = getF10SheetPreviewError(error);
  assert.equal(info.code, "F10_IMPORT_SCHEMA_OUTDATED");
  assert.equal(info.message.includes("customer_email"), false);
});

test("exposes safe code for unexpected database errors", () => {
  const info = getF10SheetPreviewError({ code: "22003", query: "private" });
  assert.equal(info.code, "F10_IMPORT_DB_22003");
  assert.equal(info.message.includes("private"), false);
});

test("returns human-readable duplicate ID validation", () => {
  const info = getF10SheetPreviewError(new Error("F10_SHEET_DUPLICATE_IDS"));
  assert.equal(info.code, "F10_SHEET_DUPLICATE_IDS");
});
