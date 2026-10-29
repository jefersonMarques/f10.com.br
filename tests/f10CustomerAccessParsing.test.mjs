import test from "node:test";
import assert from "node:assert/strict";
import { parseLegacyF10Groups, isF10CustomerRole } from "../src/lib/server/support/f10CustomerAccessParsing.ts";

test("reconhece grupo F10 pela mesma chave numerica da planilha, sem inferir unidade", () => {
  const groups = parseLegacyF10Groups([
    { grupo_id: 1, grupo: "Demonstração", unidades: [{ unidade_id: 2 }] },
    { grupo_id: 244, grupo: "Origem Educacional", unidades: [{ unidade_id: 79 }] },
  ]);
  assert.deepEqual(groups, [
    { groupId: "1", groupName: "Demonstração", grantedUnitCount: 1 },
    { groupId: "244", groupName: "Origem Educacional", grantedUnitCount: 1 },
  ]);
  assert.equal(JSON.stringify(groups).includes("unidade_id"), false);
});

test("ignora grupos invalidos e identificadores repetidos", () => {
  assert.deepEqual(parseLegacyF10Groups([
    { grupo_id: 244, grupo: "Origem Educacional", unidades: [] },
    { grupo_id: "244", grupo: "Duplicado", unidades: [] },
    { grupo_id: "abc", grupo: "Inválido", unidades: [] },
    null,
  ]).map(group => group.groupId), ["244"]);
  assert.deepEqual(parseLegacyF10Groups(undefined), []);
});

test("somente papeis administrativos definidos podem ser salvos", () => {
  for (const role of ["responsavel", "gestor", "financeiro", "comercial", "operacional", "contato"]) {
    assert.equal(isF10CustomerRole(role), true);
  }
  for (const role of ["admin", "super_admin", "owner", "", null, 1]) {
    assert.equal(isF10CustomerRole(role), false);
  }
});
