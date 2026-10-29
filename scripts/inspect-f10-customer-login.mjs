// Diagnóstico local: autentica a conta de teste, mas não cria sessão/vínculos.
// Uso: F10_TEST_LOGIN=usuario@empresa.com npm run f10:inspect-login
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { createInterface } from "node:readline";
import postgres from "postgres";
import { describeF10Login } from "./f10-login-inspection-utils.mjs";

const TIMEOUT_MS = 12_000;
const email = (process.env.F10_TEST_LOGIN ?? "").trim().toLowerCase();
const base = (process.env.F10_BACKEND_URL?.trim() || "https://backend.f10.com.br").replace(/\/$/, "");
const url = new URL(base);

if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254) {
  throw new Error("Informe F10_TEST_LOGIN com o e-mail de uma conta de teste autorizada.");
}
if (url.protocol !== "https:" || url.username || url.password || url.search || url.hash) {
  throw new Error("F10_BACKEND_URL precisa ser HTTPS e não pode conter credenciais.");
}

async function hiddenPassword() {
  if (!process.stdin.isTTY || !process.stdout.isTTY) {
    throw new Error("Execute em um terminal interativo, sem passar a senha em argumentos.");
  }
  process.stdout.write("Senha da conta F10 de teste (oculta): ");
  execFileSync("stty", ["-echo"], { stdio: ["inherit", "ignore", "ignore"] });
  const input = createInterface({ input: process.stdin, terminal: false });
  const restore = () => {
    try { execFileSync("stty", ["echo"], { stdio: ["inherit", "ignore", "ignore"] }); }
    catch { /* Terminal pode ter sido encerrado */ }
  };
  const interrupted = () => {
    restore();
    process.stdout.write("\n");
    process.exit(130);
  };
  process.once("SIGINT", interrupted);
  try {
    return await new Promise((resolve, reject) => {
      input.once("line", resolve);
      input.once("close", () => reject(new Error("F10_TEST_PASSWORD_NOT_PROVIDED")));
    });
  } finally {
    restore();
    process.removeListener("SIGINT", interrupted);
    input.close();
    process.stdout.write("\n");
  }
}

async function readObject(response, stage) {
  if (!response.ok) throw new Error(stage + "_HTTP_" + response.status);
  const object = await response.json().catch(() => null);
  if (!object || typeof object !== "object" || Array.isArray(object)) {
    throw new Error(stage + "_INVALID_JSON");
  }
  return object;
}

async function inspectLocalRecords(userId, login) {
  if (!process.env.DATABASE_URL) return { available: false, reason: "DATABASE_URL ausente" };
  const db = postgres(process.env.DATABASE_URL, {
    max: 1, prepare: false, connect_timeout: 10, idle_timeout: 10,
  });
  try {
    // Cada consulta roda na mesma transação explicitamente somente leitura.
    return await db.begin(async (tx) => {
      await tx`SET TRANSACTION READ ONLY`;
      const existing = await tx`
        SELECT customer_contact_id::text AS id
        FROM customer_f10_identities WHERE legacy_user_id = ${userId} LIMIT 2
      `;
      const providers = await tx`
        SELECT customer_contact_id::text AS id
        FROM customer_auth_identities
        WHERE provider = 'f10' AND provider_user_id = ${userId} LIMIT 2
      `;
      const emails = await tx`
        SELECT id::text FROM customer_contacts
        WHERE lower(email) = ${login} LIMIT 101
      `;

      const explicit = [...new Set([...existing, ...providers].map((row) => row.id))];
      let units = [];
      if (explicit.length === 1) {
        units = await tx`
          SELECT u.source_id AS numero_contrato,
                 u.f10_person_id::text AS pessoa_id,
                 coalesce(u.apelido, u.name) AS apelido,
                 g.name AS franquia
          FROM customer_unit_contacts uc
          JOIN customer_units u ON u.id = uc.unit_id
          LEFT JOIN customer_groups g ON g.id = u.group_id
          WHERE uc.customer_contact_id = ${explicit[0]}::uuid
            AND u.source_system LIKE 'f10_sheet%'
          ORDER BY u.source_id LIMIT 30
        `;
      }
      return {
        available: true,
        explicitIdentityCount: explicit.length,
        explicitContactId: explicit.length === 1 ? explicit[0] : null,
        conflictingExplicitIdentities: explicit.length > 1,
        emailCandidateCount: emails.length,
        uniqueEmailCandidateId: emails.length === 1 ? emails[0].id : null,
        explicitIdentityMatchesEmailCandidate: explicit.length === 1 && emails.length === 1
          ? explicit[0] === emails[0].id : null,
        emailCandidateLimitReached: emails.length > 100,
        hasExactlyOneEmailCandidate: emails.length === 1,
        linkedUnitCountShown: units.length,
        linkedUnits: units.map((row) => ({
          numero_contrato: row.numero_contrato,
          pessoa_id: row.pessoa_id,
          apelido: row.apelido,
          franquia: row.franquia,
        })),
        interpretation: explicit.length === 1
          ? "Ja existe contato explicitamente vinculado ao user_id. Conferir unidades."
          : "Nao vincular automaticamente por e-mail, nome ou igualdade numerica de IDs.",
      };
    });
  } catch (cause) {
    let code = "READ_FAILED";
    if (cause && typeof cause === "object" && typeof cause.code === "string"
        && /^[0-9A-Z]{5}$/.test(cause.code)) code = cause.code;
    return { available: false, errorCode: code };
  } finally {
    await db.end({ timeout: 5 });
  }
}

process.stdout.write("Servidor de autenticação: " + url.host + "\n");
let password = await hiddenPassword();
try {
  const response = await fetch(new URL("/adm/user/login", base), {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({
      login: email,
      pass: createHash("md5").update(password, "utf8").digest("hex"),
      web: true,
    }),
    redirect: "error",
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  password = "";
  const loginPayload = await readObject(response, "F10_TEST_LOGIN");
  const token = typeof loginPayload.token === "string" ? loginPayload.token : "";
  if (!token || token.split(".").length !== 3) throw new Error("F10_TEST_TOKEN_INVALID");

  let claims;
  try {
    claims = JSON.parse(Buffer.from(token.split(".")[1], "base64url").toString("utf8"));
  } catch {
    throw new Error("F10_TEST_JWT_INVALID");
  }
  const groupsResponse = await fetch(new URL("/adm/user/groups", base), {
    method: "GET",
    headers: { Authorization: "Bearer " + token, Accept: "application/json" },
    redirect: "error",
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  const groupsPayload = await readObject(groupsResponse, "F10_TEST_GROUPS");
  const inspection = describeF10Login(loginPayload, claims, groupsPayload, email);
  if (!inspection.identity.user_id || !inspection.identity.jwtIdMatchesUserId
      || inspection.identity.jwtLoginMatchesSubmitted === false) {
    throw new Error("F10_TEST_IDENTITY_MISMATCH");
  }
  const local = await inspectLocalRecords(inspection.identity.user_id, email);
  process.stdout.write(JSON.stringify({
    mode: "somente_leitura",
    environment: { F10_UID: process.env.F10_UID ?? "nao_configurado" },
    ...inspection,
    localRecords: local,
  }, null, 2) + "\n");
} catch (cause) {
  // Exceções brutas podem incluir parâmetros e credenciais: não exibir nem registrar.
  const message = cause instanceof Error ? cause.message : "F10_TEST_FAILED";
  const safe = /^F10_TEST_[A-Z_]+(?:_HTTP_\d{3})?$/.test(message)
    ? message : "F10_TEST_CONNECTION_FAILED";
  process.stderr.write("Teste não concluído: " + safe + "\n");
  process.exitCode = 1;
} finally {
  password = "";
}
