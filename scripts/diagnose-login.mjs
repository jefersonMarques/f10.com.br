import { createHash } from "node:crypto";
import postgres from "postgres";

// Operação somente leitura. Não mostra senhas, hashes de senha ou tokens.
// Uso: DIAGNOSE_LOGIN_EMAIL=usuario@empresa.com npm run auth:diagnose
const email = (process.env.DIAGNOSE_LOGIN_EMAIL ?? "").trim().toLowerCase();
const databaseUrl = process.env.DATABASE_URL?.trim();

if (!databaseUrl) throw new Error("DATABASE_URL is required.");
if (!email || email.length > 254 || !/^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/.test(email)) {
  throw new Error("Set DIAGNOSE_LOGIN_EMAIL to an internal F10 Operations email.");
}

const emailHash = createHash("sha256").update(email).digest("hex");
const keyPrefix = `operations-login:v2:${emailHash}:`;
const db = postgres(databaseUrl, { max: 1, prepare: false, connect_timeout: 10 });

try {
  const [accounts, attempts, recentFailures] = await Promise.all([
    db`SELECT status,
        activated_at IS NOT NULL AS activated,
        last_login_at,
        password_hash LIKE 'scrypt$%' AS supported_password_format,
        email = lower(btrim(email)) AS normalized_email
      FROM users
      WHERE lower(btrim(email)) = ${email}
      LIMIT 3`,
    db`SELECT COUNT(*)::int AS tracked_devices,
        COUNT(*) FILTER (WHERE blocked_until > now())::int AS currently_blocked,
        MAX(blocked_until) FILTER (WHERE blocked_until > now()) AS blocked_until
      FROM auth_login_attempts
      WHERE key LIKE ${keyPrefix + "%"}`,
    db`SELECT metadata ->> 'failureKind' AS reason,
        COUNT(*)::int AS occurrences
      FROM audit_logs
      WHERE action = 'auth.login_failed'
        AND metadata ->> 'emailHash' = ${emailHash}
        AND created_at > now() - interval '7 days'
      GROUP BY 1 ORDER BY occurrences DESC`,
  ]);

  process.stdout.write(JSON.stringify({
    matchingAccounts: accounts.length,
    accounts: accounts.map((account) => ({
      status: account.status,
      activated: account.activated,
      lastLoginAt: account.last_login_at,
      supportedPasswordFormat: account.supported_password_format,
      normalizedEmail: account.normalized_email,
    })),
    loginAttempts: attempts[0] ?? {},
    failureSummaryLast7Days: recentFailures,
  }, null, 2) + "\n");
} finally {
  await db.end({ timeout: 5 });
}
