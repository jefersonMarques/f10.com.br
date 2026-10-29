import test from "node:test";
import assert from "node:assert/strict";
import { collectF10ContractPages } from "../src/lib/server/integrations/f10/f10ContractPagination.ts";
import { parseF10Contracts } from "../src/lib/server/integrations/f10/f10CustomerSyncParsing.ts";

function contracts(from, to, status = 1) {
  return Array.from({ length: to - from + 1 }, (_, index) => {
    const id = from + index;
    return {
      contrato_id: id,
      numero_contrato: id + 2000,
      pessoa_id: id + 3000,
      status,
      x_status: status === 1 ? "Ativo" : "Cancelado",
    };
  });
}

test("visits all pages via last contrato_id; collects active and cancelled contracts", async () => {
  const cursors = [];
  const pages = new Map([
    [null, contracts(1, 100)],
    [100, contracts(101, 200, 6)],
    [200, contracts(201, 254)],
    [254, []],
  ]);
  const raw = await collectF10ContractPages(async (lastId) => {
    cursors.push(lastId);
    return pages.get(lastId) ?? [];
  });
  const parsed = parseF10Contracts(raw);
  assert.deepEqual(cursors, [null, 100, 200, 254]);
  assert.equal(parsed.contractsCount, 254);
  assert.equal(parsed.owners.length, 254);
  assert.equal(parsed.contracts.find((row) => row.contractId === 150)?.statusLabel, "Cancelado");
  assert.equal(parsed.contracts.find((row) => row.contractId === 150)?.contractNumber, "2150");
});

test("deduplicates identical overlap but still advances the cursor", async () => {
  const cursors = [];
  const first = contracts(1, 100);
  const pages = new Map([
    [null, first],
    [100, [first[99], ...contracts(101, 175)]],
    [175, []],
  ]);
  const result = await collectF10ContractPages(async (lastId) => {
    cursors.push(lastId);
    return pages.get(lastId) ?? [];
  });
  assert.deepEqual(cursors, [null, 100, 175]);
  assert.equal(result.length, 175);
});

test("continues fetching even if a page has fewer than 100 results", async () => {
  const cursors = [];
  const pages = new Map([
    [null, contracts(1, 3)],
    [3, contracts(4, 5)],
    [5, []],
  ]);
  const result = await collectF10ContractPages(async (lastId) => {
    cursors.push(lastId);
    return pages.get(lastId) ?? [];
  });
  assert.deepEqual(cursors, [null, 3, 5]);
  assert.equal(result.length, 5);
});

test("fails closed on a repeated page instead of importing a partial list", async () => {
  const first = contracts(1, 100);
  await assert.rejects(() => collectF10ContractPages(async () => first),
    /F10_API_PAGINATION_STALLED/);
});

test("rejects unexpected response shape, invalid IDs and conflicting records", async () => {
  await assert.rejects(() => collectF10ContractPages(async () => ({ data: [] })),
    /F10_CONTRACTS_INVALID/);
  await assert.rejects(() => collectF10ContractPages(async () => []),
    /F10_CONTRACTS_EMPTY/);
  await assert.rejects(() => collectF10ContractPages(async () => [{ contrato_id: null }]),
    /F10_CONTRACT_ID_INVALID/);
  const first = contracts(1, 2);
  const changed = { ...first[1], status: 6 };
  await assert.rejects(() => collectF10ContractPages(async (cursor) =>
    cursor === null ? first : cursor === 2 ? [changed, ...contracts(3, 4)] : []),
  /F10_CONTRACT_ID_CONFLICT/);
});

test("rejects unordered pages so a cursor cannot silently skip contracts", async () => {
  await assert.rejects(() => collectF10ContractPages(async () =>
    [contracts(1, 1)[0], contracts(3, 3)[0], contracts(2, 2)[0]]),
  /F10_API_PAGINATION_ORDER/);
});
