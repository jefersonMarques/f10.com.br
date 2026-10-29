const sensitiveKeys = /token|pass|senha|password|secret|auth|cookie|hash|signature|cpf|cnpj/i;

export function fieldDescriptions(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return [];
  return Object.entries(value).map(([key, data]) => ({
    field: key,
    type: sensitiveKeys.test(key) ? "redacted"
      : data === null ? "null"
      : Array.isArray(data) ? "array"
      : typeof data,
  }));
}

export function redactEmail(value) {
  if (typeof value !== "string") return null;
  const [local, domain] = value.trim().toLowerCase().split("@");
  if (!local || !domain) return null;
  return local[0] + "***@" + domain;
}

function idOf(value) {
  if (typeof value !== "number" && typeof value !== "string") return null;
  const text = String(value).trim();
  return /^\d+$/.test(text) ? text : null;
}

export function describeF10Login(loginResponse, jwtClaims, groupResponse) {
  if (!loginResponse || typeof loginResponse !== "object" || Array.isArray(loginResponse)) {
    throw new Error("F10_TEST_LOGIN_RESPONSE_INVALID");
  }
  if (!jwtClaims || typeof jwtClaims !== "object" || Array.isArray(jwtClaims)) {
    throw new Error("F10_TEST_JWT_INVALID");
  }
  if (!groupResponse || typeof groupResponse !== "object" || !Array.isArray(groupResponse.grupos)) {
    throw new Error("F10_TEST_GROUPS_INVALID");
  }

  const userId = idOf(loginResponse.user_id);
  const jwtId = idOf(jwtClaims.id);
  const groups = groupResponse.grupos.map((raw) => {
    if (!raw || typeof raw !== "object" || !Array.isArray(raw.unidades)) {
      throw new Error("F10_TEST_GROUPS_INVALID");
    }
    const id = idOf(raw.grupo_id);
    if (!id) throw new Error("F10_TEST_GROUPS_INVALID");
    const units = raw.unidades.map((unit) => {
      if (!unit || typeof unit !== "object") throw new Error("F10_TEST_GROUPS_INVALID");
      const unitId = idOf(unit.unidade_id);
      if (!unitId) throw new Error("F10_TEST_GROUPS_INVALID");
      return {
        unidade_id: unitId,
        unidade: typeof unit.unidade === "string" ? unit.unidade : null,
        schemaPresent: typeof unit.schema === "string" && unit.schema.length > 0,
      };
    });
    return {
      grupo_id: id,
      grupo: typeof raw.grupo === "string" ? raw.grupo : null,
      subgrupo: raw.subgrupo === true,
      unidades: units,
    };
  });
  const authorizedUnits = new Set(groups.flatMap((group) =>
    group.unidades.map((unit) => group.grupo_id + ":" + unit.unidade_id)));
  const count = authorizedUnits.size;
  const scope = groups.length > 1 ? "multigrupos"
    : count > 1 ? "multiunidades"
    : count === 1 ? "unidade_unica"
    : "sem_unidades";
  const possibleRoleFields = [...Object.keys(loginResponse), ...Object.keys(jwtClaims),
    ...Object.keys(groupResponse)].filter((key) => /perfil|role|cargo|permiss|tipo_usuario|nivel/i.test(key));
  return {
    endpointLogin: "/adm/user/login",
    endpointGroups: "/adm/user/groups",
    loginResponseFields: fieldDescriptions(loginResponse),
    jwtFields: fieldDescriptions(jwtClaims),
    groupsResponseFields: fieldDescriptions(groupResponse),
    identity: {
      user_id: userId,
      jwtIdMatchesUserId: Boolean(userId && jwtId === userId),
      jwtNamePresent: typeof jwtClaims.nome === "string" && jwtClaims.nome.length > 0,
      jwtLogin: redactEmail(jwtClaims.login),
    },
    access: {
      classification: scope,
      groupCount: groups.length,
      authorizedUnitCount: count,
      hasSubgroup: groups.some((group) => group.subgrupo),
      role: "nao_comprovado",
      possibleRoleFields,
    },
    groups,
    warnings: [
      "user_id do login nao equivale automaticamente a pessoa_id dos contratos.",
      "unidade_id do login nao equivale automaticamente ao numero_contrato da planilha.",
      "Grupos autorizados descrevem alcance de acesso, nao cargo ou papel juridico.",
      "Nenhum vinculo ou permissao foi criado por este teste.",
    ],
  };
}
