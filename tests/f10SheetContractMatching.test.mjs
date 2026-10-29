import test from "node:test";
import assert from "node:assert/strict";
import { matchSheetContractNumbers } from "../src/lib/server/support/f10SheetContractMatching.ts";

test("matches ID from spreadsheet against numero_contrato, never contrato_id", () => {
  const matches = matchSheetContractNumbers(
    ["815", "43", "999"],
    [{ contractId: 43, contractNumber: "815" }],
  );
  assert.deepEqual(matches.get("815"), { status: "matched", contractId: 43 });
  assert.deepEqual(matches.get("43"), { status: "not_found", contractId: null });
  assert.deepEqual(matches.get("999"), { status: "not_found", contractId: null });
});

test("does not create a link for duplicate commercial numbers", () => {
  const matches = matchSheetContractNumbers(
    ["815"], [
      { contractId: 43, contractNumber: "815" },
      { contractId: 44, contractNumber: "815" },
    ],
  );
  assert.deepEqual(matches.get("815"), { status: "ambiguous", contractId: null });
});

test("matches only exact normalized whitespace and preserves leading zeroes", () => {
  const matches = matchSheetContractNumbers(
    ["0815", "815"],
    [{ contractId: 43, contractNumber: " 815 " }],
  );
  assert.equal(matches.get("0815")?.status, "not_found");
  assert.equal(matches.get("815")?.status, "matched");
});
