import { randomBytes, scrypt, timingSafeEqual } from "node:crypto";

const KEY_LENGTH = 64;
const SCRYPT_N = 16384;
const SCRYPT_R = 8;
const SCRYPT_P = 1;
const SCRYPT_MAX_MEMORY = 64 * 1024 * 1024;

function deriveKey(password: string, salt: Buffer, n = SCRYPT_N, r = SCRYPT_R, p = SCRYPT_P): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    scrypt(
      password,
      salt,
      KEY_LENGTH,
      { N: n, r, p, maxmem: SCRYPT_MAX_MEMORY },
      (error, derivedKey) => {
        if (error) {
          reject(error);
          return;
        }

        resolve(derivedKey);
      },
    );
  });
}

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(24);
  const derivedKey = await deriveKey(password, salt);

  return [
    "scrypt",
    SCRYPT_N,
    SCRYPT_R,
    SCRYPT_P,
    salt.toString("base64url"),
    derivedKey.toString("base64url"),
  ].join("$");
}

export async function verifyPassword(password: string, encodedHash: string): Promise<boolean> {
  const [algorithm, nValue, rValue, pValue, saltValue, hashValue] = encodedHash.split("$");

  if (algorithm !== "scrypt" || !nValue || !rValue || !pValue || !saltValue || !hashValue) {
    return false;
  }

  const n = Number.parseInt(nValue, 10);
  const r = Number.parseInt(rValue, 10);
  const p = Number.parseInt(pValue, 10);

  if (!Number.isFinite(n) || !Number.isFinite(r) || !Number.isFinite(p)) {
    return false;
  }

  const expectedHash = Buffer.from(hashValue, "base64url");
  const actualHash = await deriveKey(password, Buffer.from(saltValue, "base64url"), n, r, p);

  if (actualHash.length !== expectedHash.length) return false;
  return timingSafeEqual(actualHash, expectedHash);
}
