import test from "node:test";
import assert from "node:assert/strict";
import {
  parseF10Contracts,
  parseF10Person,
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
  assert.equal(result.contractsCount, 5);
  assert.equal(result.skippedContracts, 1);
  assert.deepEqual(result.owners, [
    { personId: 2549, contractIds: [15], activeContracts: 0 },
    { personId: 2600, contractIds: [16, 17], activeContracts: 1 },
  ]);
});

test("rejects incomplete or invalid contract responses instead of silently importing nobody", () => {
  assert.throws(() => parseF10Contracts([]), /F10_CONTRACTS_EMPTY/);
  assert.throws(() => parseF10Contracts({ contratos: [] }), /F10_CONTRACTS_INVALID/);
  assert.throws(() => parseF10Contracts([{ pessoa_id: 1, contrato_id: null }]), /F10_CONTRACTS_NO_VALID_PEOPLE/);
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
