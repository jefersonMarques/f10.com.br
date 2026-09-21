import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";
import { env } from "$env/dynamic/private";

const ALGORITHM = "aes-256-gcm";
const VERSION = "v1";
const IV_BYTES = 12;
const MIN_SECRET_LENGTH = 32;

function encryptionKey(): Buffer {
  const secret = env.AI_SECRETS_KEY?.trim() ?? "";
  if (secret.length < MIN_SECRET_LENGTH) {
    throw new Error("AI_SECRETS_KEY_NOT_CONFIGURED");
  }
  return createHash("sha256").update(secret).digest();
}

export function isAiSecretsKeyConfigured(): boolean {
  return (env.AI_SECRETS_KEY?.trim().length ?? 0) >= MIN_SECRET_LENGTH;
}

export function encryptAiSecret(value: string): string {
  const iv = randomBytes(IV_BYTES);
  const cipher = createCipheriv(ALGORITHM, encryptionKey(), iv);
  const encrypted = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [
    VERSION,
    iv.toString("base64url"),
    tag.toString("base64url"),
    encrypted.toString("base64url"),
  ].join(".");
}

export function decryptAiSecret(payload: string): string {
  const [version, ivValue, tagValue, encryptedValue, ...extra] = payload.split(".");
  if (
    version !== VERSION ||
    !ivValue ||
    !tagValue ||
    encryptedValue === undefined ||
    extra.length > 0
  ) {
    throw new Error("AI_SECRET_INVALID");
  }

  try {
    const decipher = createDecipheriv(
      ALGORITHM,
      encryptionKey(),
      Buffer.from(ivValue, "base64url"),
    );
    decipher.setAuthTag(Buffer.from(tagValue, "base64url"));
    return Buffer.concat([
      decipher.update(Buffer.from(encryptedValue, "base64url")),
      decipher.final(),
    ]).toString("utf8");
  } catch {
    throw new Error("AI_SECRET_DECRYPT_FAILED");
  }
}
