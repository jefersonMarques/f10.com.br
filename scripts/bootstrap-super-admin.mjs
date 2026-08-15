import { randomBytes, scrypt } from "node:crypto";
import postgres from "postgres";

const databaseUrl = process.env.DATABASE_URL?.trim();
const email = process.env.BOOTSTRAP_SUPER_ADMIN_EMAIL?.trim().toLowerCase();
const name = process.env.BOOTSTRAP_SUPER_ADMIN_NAME?.trim();
const password = process.env.BOOTSTRAP_SUPER_ADMIN_PASSWORD ?? "";
const forcePassword = process.env.BOOTSTRAP_SUPER_ADMIN_FORCE_PASSWORD === "true";

if (!databaseUrl) throw new Error("DATABASE_URL is required.");
if (!email) throw new Error("BOOTSTRAP_SUPER_ADMIN_EMAIL is required.");
if (!name) throw new Error("BOOTSTRAP_SUPER_ADMIN_NAME is required.");
if (password.length < 14) throw new Error("BOOTSTRAP_SUPER_ADMIN_PASSWORD must have at least 14 characters.");

function deriveKey(value, salt) {
  return new Promise((resolve, reject) => {
    scrypt(value, salt, 64, { N: 16384, r: 8, p: 1, maxmem: 64 * 1024 * 1024 }, (error, key) => {
      if (error) {
        reject(error);
        return;
      }

      resolve(key);
    });
  });
}

async function hashPassword(value) {
  const salt = randomBytes(24);
  const key = await deriveKey(value, salt);
  return `scrypt$16384$8$1$${salt.toString("base64url")}$${key.toString("base64url")}`;
}

const sql = postgres(databaseUrl, { max: 1, prepare: false, connect_timeout: 10 });

try {
  await sql.begin(async (transaction) => {
    const [role] = await transaction`SELECT id FROM roles WHERE code = 'SUPER_ADMIN' LIMIT 1`;
    if (!role) throw new Error("SUPER_ADMIN role not found. Run migrations first.");

    const [existingUser] = await transaction`SELECT id FROM users WHERE email = ${email} LIMIT 1`;
    let userId = existingUser?.id;

    if (!existingUser) {
      const passwordHash = await hashPassword(password);
      const [createdUser] = await transaction`
        INSERT INTO users (name, email, password_hash, status)
        VALUES (${name}, ${email}, ${passwordHash}, 'active')
        RETURNING id
      `;
      userId = createdUser.id;
    } else if (forcePassword) {
      const passwordHash = await hashPassword(password);
      await transaction`
        UPDATE users
        SET name = ${name}, password_hash = ${passwordHash}, status = 'active', updated_at = now()
        WHERE id = ${userId}
      `;
    } else {
      await transaction`
        UPDATE users
        SET name = ${name}, status = 'active', updated_at = now()
        WHERE id = ${userId}
      `;
    }

    await transaction`
      INSERT INTO user_roles (user_id, role_id)
      VALUES (${userId}, ${role.id})
      ON CONFLICT (user_id, role_id) DO NOTHING
    `;
  });

  process.stdout.write(`Super admin ready: ${email}\n`);
} finally {
  await sql.end({ timeout: 5 });
}
