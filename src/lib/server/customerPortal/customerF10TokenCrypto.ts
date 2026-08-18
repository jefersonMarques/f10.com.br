import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";
import { env } from "$env/dynamic/private";

function getTokenKey(): Buffer {
  const secret = env.F10_CUSTOMER_TOKEN_KEY?.trim() ?? "";
  if (secret.length < 32) {
    throw new Error("F10_CUSTOMER_TOKEN_KEY must contain at least 32 characters.");
  }
  return createHash("sha256").update(secret, "utf8").digest();
}

export function encryptF10CustomerToken(value: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", getTokenKey(), iv);
  const encrypted = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return ["v1", iv.toString("base64url"), tag.toString("base64url"), encrypted.toString("base64url")].join(":");
}

export function decryptF10CustomerToken(value: string): string {
  const [version, ivValue, tagValue, encryptedValue] = value.split(":");
  if (version !== "v1" || !ivValue || !tagValue || !encryptedValue) {
    throw new Error("F10_CUSTOMER_TOKEN_INVALID");
  }

  const decipher = createDecipheriv(
    "aes-256-gcm",
    getTokenKey(),
    Buffer.from(ivValue, "base64url"),
  );
  decipher.setAuthTag(Buffer.from(tagValue, "base64url"));
  const decrypted = Buffer.concat([
    decipher.update(Buffer.from(encryptedValue, "base64url")),
    decipher.final(),
  ]);
  return decrypted.toString("utf8");
}
