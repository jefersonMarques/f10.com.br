import test from "node:test";
import assert from "node:assert/strict";
import {
  parseF10Contracts,
  parseF10Person,
  parseF10UnitId,
  classifyF10CustomerMatch,
} from "../src/lib/server/integrations/f10/f10CustomerSyncParsing.ts";

test("identifies one customer for multiple contracts and preserves cancelled customers", () => {
  const result = parseF10Contracts([
    { pessoa_id: 2600, contrato_id: 16, status: 1, x_status: "Ativo" },
    { pessoa_id: 2600, contrato_id: 17, status: 6, x_status: "Cancelado" },
    { pessoa_id: 2600, contrato_id: 17, status: 6, x_status: "Cancelado" },
    { pessoa_id: 2549, contrato_id: 15, status: 6, x_status: "Cancelado" },
    { pessoa_id: null, contrato_id: 99 },
  ]);
  assert.equal(result.contractsCount, 4);
  assert.equal(result.contracts.length, 4);
  assert.equal(result.contracts.find((item) => item.contractId === 99)?.personId, null);
  assert.equal(result.skippedContracts, 1);
  assert.deepEqual(result.owners, [
    { personId: 2549, contractIds: [15], contractNumbers: [], activeContracts: 0 },
    { personId: 2600, contractIds: [16, 17], contractNumbers: [], activeContracts: 1 },
  ]);
});

test("rejects incomplete or invalid contract responses instead of silently importing nobody", () => {
  assert.throws(() => parseF10Contracts([]), /F10_CONTRACTS_EMPTY/);
  assert.throws(() => parseF10Contracts({ contratos: [] }), /F10_CONTRACTS_INVALID/);
  assert.throws(() => parseF10Contracts([{ pessoa_id: 1, contrato_id: null }]), /F10_CONTRACT_ID_INVALID/);
});

test("reads only contact fields and rejects wrong person ID", () => {
  const person = parseF10Person({
    pessoa_id: 103445, nome: "João da Silva", email: " ALUNO@ESCOLA.COM.BR ",
    telefone: "(41) 3333-3333", celular: "(41) 99999-9999",
    cpf: "123", rg_ie: "456", logradouro: "Dados sigilosos",
  }, 103445);
  assert.deepEqual(person, {
    personId: 103445, name: "João da Silva", email: "aluno@escola.com.br",
    phone: "(41) 3333-3333", whatsapp: "(41) 99999-9999",
  });
  assert.throws(() => parseF10Person({ pessoa_id: 1, nome: "Teste" }, 2), /F10_PERSON_ID_MISMATCH/);
});

test("never automatically merges a plausible match", () => {
  const person = { personId: 8, name: "Pessoa A", email: "a@example.com", phone: "", whatsapp: "" };
  assert.equal(classifyF10CustomerMatch({ mappedContact: null, candidates: [], person }), "create");
  assert.equal(classifyF10CustomerMatch({ mappedContact: null, candidates: [{ id: "x" }], person }), "possible_match");
  assert.equal(classifyF10CustomerMatch({ mappedContact: { id: "1", name: "Pessoa A", email: "a@example.com", phone: null, whatsapp: null }, candidates: [], person }), "unchanged");
  assert.equal(classifyF10CustomerMatch({ mappedContact: { id: "1", name: "Outro", email: "a@example.com", phone: null, whatsapp: null }, candidates: [], person }), "update");
});

test("uses configured F10_UID and rejects unsafe or missing values", () => {
  assert.equal(parseF10UnitId("1"), 1);
  assert.equal(parseF10UnitId(" 42 "), 42);
  for (const value of [undefined, "", "0", "-1", "1.5", "1e3", "wrong", "2147483648", "9007199254740992"]) {
    assert.throws(() => parseF10UnitId(value), /F10_UID_INVALID/);
  }
});

test("retains all API fields and treats numero_contrato as the searchable business number", () => {
  const source = {
    polo: null, fonte: null, media: null, status: 1, curso_id: 1, fonte_id: null,
    x_status: "Ativo", conclusao: null, matricula: "2000-01-01",
    pessoa_id: 1561, titular_id: null, contrato_id: 43, vendedor_id: null,
    numero_contrato: 815, telemarketing_id: 6, data_cancelamento: null,
    campo_futuro: { detalhe: "preservado" },
  };
  const snapshot = parseF10Contracts([source]);
  assert.equal(snapshot.contractsCount, 1);
  assert.deepEqual(snapshot.owners, [{
    personId: 1561, contractIds: [43], contractNumbers: ["815"], activeContracts: 1,
  }]);
  assert.equal(snapshot.contracts[0].contractId, 43);
  assert.equal(snapshot.contracts[0].contractNumber, "815");
  assert.equal(snapshot.contracts[0].telemarketingId, 6);
  assert.deepEqual(snapshot.contracts[0].sourceRecord, source);
});

test("keeps distinct contracts even when numero_contrato repeats and rejects conflicting IDs", () => {
  const first = { contrato_id: 10, numero_contrato: 815, pessoa_id: 1, status: 1 };
  const second = { contrato_id: 20, numero_contrato: 815, pessoa_id: 2, status: 6 };
  const result = parseF10Contracts([first, second]);
  assert.equal(result.contracts.length, 2);
  assert.equal(result.contracts[0].contractNumber, "815");
  assert.equal(result.contracts[1].contractNumber, "815");
  assert.throws(
    () => parseF10Contracts([first, { ...first, status: 6 }]),
    /F10_CONTRACT_ID_CONFLICT/,
  );
});
