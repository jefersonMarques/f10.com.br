import postgres from "postgres";
import { summarizeApiObject, summarizeContractPage } from "./lib/f10ApiKeyEvidence.mjs";

const API_BASE_URL = "https://api.f10.com.br";
const REQUEST_TIMEOUT_MS = 20_000;
const MAX_RESPONSE_BYTES = 8 * 1024 * 1024;
const BETWEEN_REQUESTS_MS = 1_500;

function environment() {
  const databaseUrl = process.env.DATABASE_URL?.trim();
  const token = process.env.F10_API_BEARER_TOKEN?.trim();
  const unitId = Number(process.env.F10_UID);
  if (!databaseUrl) throw new Error("DATABASE_URL_MISSING");
  if (!token) throw new Error("F10_API_TOKEN_MISSING");
  if (!Number.isSafeInteger(unitId) || unitId < 1) {
    throw new Error("F10_UID_INVALID");
  }
  return { databaseUrl, token, unitId };
}

function positiveInteger(value) {
  const number = Number(value);
  return Number.isSafeInteger(number) && number > 0 ? number : null;
}

async function readSnapshot(databaseUrl, unitId) {
  const db = postgres(databaseUrl, {
    max: 1, prepare: false, connect_timeout: 10,
  });
  try {
    return await db.begin(async (tx) => {
      await tx.unsafe("SET TRANSACTION READ ONLY");
      await tx.unsafe("SET LOCAL statement_timeout = '20000ms'");

      const [sample] = await tx.unsafe(
        "SELECT pessoa_id::text AS person_id, titular_id::text AS holder_id " +
        "FROM f10_customer_contracts " +
        "WHERE unit_id = $1 AND pessoa_id IS NOT NULL " +
        "ORDER BY CASE WHEN status = 1 AND data_cancelamento IS NULL " +
        "THEN 0 ELSE 1 END, " +
        "CASE WHEN titular_id IS NOT NULL THEN 0 ELSE 1 END, contract_id " +
        "LIMIT 1",
        [unitId],
      );

      const [counts] = await tx.unsafe(
        "SELECT count(*)::int AS total, " +
        "count(*) FILTER (WHERE status = 1 " +
        "AND data_cancelamento IS NULL)::int AS active " +
        "FROM f10_customer_contracts WHERE unit_id = $1",
        [unitId],
      );

      const sessions = await tx.unsafe(
        "SELECT s.legacy_groups " +
        "FROM customer_f10_identities identity " +
        "LEFT JOIN LATERAL (" +
        "SELECT legacy_groups FROM customer_portal_sessions " +
        "WHERE legacy_user_id = identity.legacy_user_id " +
        "AND auth_source = 'f10' ORDER BY created_at DESC, id DESC LIMIT 1" +
        ") s ON true",
      );

      let loginContexts = 0;
      let loginContextsWithSchema = 0;
      let loginContextsWithNumericUnitId = 0;
      for (const session of sessions) {
        const groups = Array.isArray(session.legacy_groups) ? session.legacy_groups : [];
        for (const group of groups) {
          const units = Array.isArray(group?.unidades) ? group.unidades : [];
          for (const unit of units) {
            loginContexts += 1;
            if (typeof unit?.schema === "string" && unit.schema.trim()) {
              loginContextsWithSchema += 1;
            }
            if (Number.isSafeInteger(unit?.unidade_id)) {
              loginContextsWithNumericUnitId += 1;
            }
          }
        }
      }

      return {
        samplePersonId: positiveInteger(sample?.person_id),
        sampleHolderId: positiveInteger(sample?.holder_id),
        cachedContracts: counts?.total ?? 0,
        cachedActiveContracts: counts?.active ?? 0,
        loginAccounts: sessions.length,
        loginContexts,
        loginContextsWithSchema,
        loginContextsWithNumericUnitId,
      };
    });
  } finally {
    await db.end({ timeout: 5 });
  }
}

async function readResponseBody(response) {
  const length = Number(response.headers.get("content-length") ?? 0);
  if (length > MAX_RESPONSE_BYTES) throw new Error("F10_API_RESPONSE_TOO_LARGE");
  if (!response.body) throw new Error("F10_API_EMPTY_RESPONSE");

  const reader = response.body.getReader();
  const chunks = [];
  let total = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value.byteLength;
      if (total > MAX_RESPONSE_BYTES) {
        throw new Error("F10_API_RESPONSE_TOO_LARGE");
      }
      chunks.push(Buffer.from(value));
    }
  } finally {
    reader.releaseLock();
  }

  try {
    return JSON.parse(Buffer.concat(chunks, total).toString("utf8"));
  } catch {
    throw new Error("F10_API_INVALID_JSON");
  }
}

async function apiGet(path, token) {
  let response;
  try {
    response = await fetch(API_BASE_URL + path, {
      method: "GET",
      headers: {
        Accept: "application/json",
        Authorization: "Bearer " + token,
      },
      redirect: "error",
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
  } catch {
    throw new Error("F10_API_CONNECTION_FAILED");
  }
  if (!response.ok) {
    throw new Error("F10_API_HTTP_" + response.status);
  }
  return readResponseBody(response);
}

function safeError(cause) {
  const code = cause instanceof Error ? cause.message : "";
  return /^F10_[A-Z_]+(?:_[0-9]{3})?$/.test(code) ? code : "F10_API_UNEXPECTED_ERROR";
}

async function inspectPerson(unitId, personId, token) {
  if (!personId) return { available: false, reason: "NO_PERSON_REFERENCE" };
  await new Promise((resolve) => setTimeout(resolve, BETWEEN_REQUESTS_MS));
  try {
    const result = await apiGet("/unidade/pessoas/" + unitId + "/" + personId, token);
    return { available: true, ...summarizeApiObject(result) };
  } catch (cause) {
    return { available: false, errorCode: safeError(cause) };
  }
}

async function main() {
  if (process.argv.length !== 2) throw new Error("NO_ARGUMENTS_SUPPORTED");
  const { databaseUrl, token, unitId } = environment();
  const snapshot = await readSnapshot(databaseUrl, unitId);
  const apiContracts = await apiGet("/unidade/contratos/" + unitId, token);
  const contractPage = summarizeContractPage(apiContracts);
  const person = await inspectPerson(unitId, snapshot.samplePersonId, token);
  const holder = snapshot.sampleHolderId === snapshot.samplePersonId
    ? { ...person, sameApiPersonAsContractPerson: true }
    : await inspectPerson(unitId, snapshot.sampleHolderId, token);

  const report = {
    state: "f10_live_identity_api_structure",
    readOnly: true,
    requests: {
      contracts: "GET /unidade/contratos/{configuredUnit}",
      person: "GET /unidade/pessoas/{configuredUnit}/{personId}",
      holder: "GET /unidade/pessoas/{configuredUnit}/{holderId}",
    },
    localCoverage: {
      cachedContracts: snapshot.cachedContracts,
      cachedActiveContracts: snapshot.cachedActiveContracts,
      loginAccounts: snapshot.loginAccounts,
      loginContexts: snapshot.loginContexts,
      loginContextsWithSchema: snapshot.loginContextsWithSchema,
      loginContextsWithNumericUnitId: snapshot.loginContextsWithNumericUnitId,
    },
    liveContractFirstPage: contractPage,
    livePersonShape: person,
    liveHolderShape: holder,
    officialLoginSchoolCrosswalkVerified: false,
    crosswalkLimitation:
      "A unidade do login e o tenant da API de contratos pertencem a dominios distintos; " +
      "campos com o mesmo nome nao comprovam equivalencia sem documentacao oficial.",
    permissionsChanged: 0,
    ticketsChanged: 0,
  };
  console.log(JSON.stringify(report, null, 2));
}

main().catch((cause) => {
  console.error(JSON.stringify({
    state: "error",
    code: safeError(cause),
  }));
  process.exitCode = 1;
});
