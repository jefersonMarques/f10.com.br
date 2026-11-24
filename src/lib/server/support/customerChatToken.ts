import { createHmac } from "node:crypto";
import { env } from "$env/dynamic/private";

export const CHAT_TOKEN_TTL_MS = 8 * 60 * 60 * 1000;
export const CHAT_TOKEN_RENEWAL_WINDOW_MS = 5 * 60 * 1000;

// A credencial estável evita invalidar outra aba quando o cliente retoma o chat.
// A autorização F10 continua obrigatória em todas as rotas públicas.
export function createCustomerChatToken(sessionId: string): string {
  const secret = env.F10_CUSTOMER_TOKEN_KEY?.trim() ?? "";
  if (secret.length < 32) throw new Error("F10_CUSTOMER_TOKEN_KEY_NOT_CONFIGURED");
  return createHmac("sha256", secret)
    .update("f10:customer-chat-token:v1:")
    .update(sessionId)
    .digest("base64url");
}
