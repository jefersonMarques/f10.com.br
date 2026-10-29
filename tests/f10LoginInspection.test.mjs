import test from "node:test";
import assert from "node:assert/strict";
import { describeF10Login, fieldDescriptions, redactEmail } from "../scripts/f10-login-inspection-utils.mjs";

function login(userId = 123) {
  return { token: "SENSITIVE_TOKEN", user_id: userId, pass: "SECRET_PASSWORD" };
}
function claims(id = 123) {
  return { id, nome: "Nome Restrito", login: "teste@exemplo.com", exp: 9999999999, cpf: "SECRET_CPF" };
}
function group(id, units) {
  return {
    grupo_id: id, grupo: "Rede " + id, subgrupo: false,
    unidades: units.map((n) => ({ unidade_id: n, unidade: "Unidade " + n, schema: "private_schema" })),
  };
}
test("exibe somente tipos dos campos sensíveis e mascara o login", () => {
  const result = describeF10Login(login(), claims(), { grupos: [group(1, [10])] }, "teste@exemplo.com");
  assert.deepEqual(result.identity, {
    user_id: "123",
    jwtIdMatchesUserId: true,
    jwtNamePresent: true,
    jwtLogin: "t***@exemplo.com",
    jwtLoginMatchesSubmitted: true,
  });
  assert.equal(result.loginResponseFields.find((f) => f.field === "token")?.type, "redacted");
  assert.equal(result.jwtFields.find((f) => f.field === "cpf")?.type, "redacted");
  assert.equal(result.groups[0].unidades[0].schemaPresent, true);
  assert.equal(result.access.classification, "unidade_unica");
  assert.equal(result.access.role, "nao_comprovado");
  assert.equal(JSON.stringify(result).includes("SENSITIVE_TOKEN"), false);
  assert.equal(JSON.stringify(result).includes("SECRET_PASSWORD"), false);
  assert.equal(JSON.stringify(result).includes("private_schema"), false);
});
test("separa acesso multiunidade e multigrupo sem inferir cargo", () => {
  const multiUnit = describeF10Login(login(), claims(), { grupos: [group(1, [10, 11])] });
  assert.equal(multiUnit.access.classification, "multiunidades");
  assert.equal(multiUnit.access.authorizedUnitCount, 2);
  const multiGroup = describeF10Login(login(), claims(), {
    grupos: [group(1, [10]), group(2, [11, 12])],
  });
  assert.equal(multiGroup.access.classification, "multigrupos");
  assert.equal(multiGroup.access.groupCount, 2);
  assert.equal(multiGroup.access.role, "nao_comprovado");
});
test("conta concessões por (grupo_id, unidade_id), sem duplicá-las", () => {
  const result = describeF10Login(login(), claims(), { grupos: [group(1, [10, 10])] });
  assert.equal(result.access.authorizedUnitCount, 1);
});
test("aceita user_id opaco, mas rejeita IDs inválidos de grupo", () => {
  const result = describeF10Login(login("abc-012"), claims("abc-012"), { grupos: [group(1, [10])] });
  assert.equal(result.identity.jwtIdMatchesUserId, true);
  assert.throws(() =>
    describeF10Login(login(), claims(), { grupos: [{ ...group(1, [10]), grupo_id: "abc" }] }),
  /F10_TEST_GROUPS_INVALID/);
});
test("não presume equivalência entre user_id, pessoa_id e contrato", () => {
  const result = describeF10Login(login(987), claims(987), { grupos: [group(1, [815])] });
  assert.equal(result.groups[0].unidades[0].unidade_id, "815");
  assert.equal(result.identity.user_id, "987");
  assert.match(result.warnings.join(" "), /pessoa_id/);
  assert.match(result.warnings.join(" "), /numero_contrato/);
});
test("identifica campos extras sem mostrar seus valores", () => {
  const fields = fieldDescriptions({ senha: "never", perfil: "gerente", contrato_id: 815 });
  assert.deepEqual(fields, [
    { field: "senha", type: "redacted" },
    { field: "perfil", type: "string" },
    { field: "contrato_id", type: "number" },
  ]);
  assert.equal(redactEmail("usuario@exemplo.com"), "u***@exemplo.com");
});
