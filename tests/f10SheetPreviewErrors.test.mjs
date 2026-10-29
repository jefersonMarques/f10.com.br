import test from "node:test";
import assert from "node:assert/strict";
import { getF10SheetApplyError, getF10SheetPreviewDiagnostic, getF10SheetPreviewError } from "../src/lib/server/support/f10SheetPreviewErrors.ts";

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

test("reveals the failing stage and the PG code without SQL or customer values", () => {
  const inner = Object.assign(new Error("private SELECT statement"), {
    name: "PostgresError", code: "23502", column_name: "record",
  });
  const wrapped = Object.assign(new Error("F10_SHEET_STAGE_FAILED", { cause: inner }), {
    previewPhase: "rows_insert",
  });
  const diagnostic = getF10SheetPreviewDiagnostic(wrapped);
  assert.equal(diagnostic.phase, "rows_insert");
  assert.equal(diagnostic.errorType, "PostgresError");
  assert.equal(diagnostic.dbCode, "23502");
  assert.equal(diagnostic.column, "record");
  assert.equal(getF10SheetPreviewError(wrapped).code, "F10_IMPORT_DB_23502");
  assert.equal(JSON.stringify(diagnostic).includes("private"), false);
});

test("reports missing DB columns before a transaction begins", () => {
  const cause = Object.assign(
    new Error("F10_SHEET_STAGE_FAILED", { cause: new Error("F10_IMPORT_SCHEMA_OUTDATED") }),
    { previewPhase: "schema_check" },
  );
  assert.equal(getF10SheetPreviewError(cause).code, "F10_IMPORT_SCHEMA_OUTDATED");
  assert.equal(getF10SheetPreviewError(cause).phase, "schema_check");
});

test("import reports exact failed SQL phase, preserving data privacy", () => {
  const pg = Object.assign(new Error("private customer details"), {
    code: "23502", constraint_name: "customer_units_organization_id_fkey",
  });
  const cause = Object.assign(new Error("F10_SHEET_IMPORT_FAILED", { cause: pg }), {
    previewPhase: "units_upsert",
  });
  const diagnostic = getF10SheetPreviewDiagnostic(cause);
  const result = getF10SheetApplyError(cause);
  assert.equal(diagnostic.phase, "units_upsert");
  assert.equal(result.code, "F10_IMPORT_DB_23502");
  assert.match(result.message, /gravação das unidades/);
  assert.equal(JSON.stringify({ diagnostic, result }).includes("private customer"), false);
});

test("import detects missing final schema and stale contract matches", () => {
  const missing = Object.assign(
    new Error("F10_SHEET_IMPORT_FAILED", { cause: new Error("F10_IMPORT_SCHEMA_OUTDATED") }),
    { previewPhase: "schema_check" },
  );
  assert.equal(getF10SheetApplyError(missing).code, "F10_IMPORT_SCHEMA_OUTDATED");
  const stale = Object.assign(
    new Error("F10_SHEET_IMPORT_FAILED", { cause: new Error("F10_SHEET_REVIEW_REQUIRED") }),
    { previewPhase: "contracts_validate" },
  );
  assert.equal(getF10SheetApplyError(stale).code, "F10_SHEET_REVIEW_REQUIRED");
});
