export const SUPPORT_CHAT_SESSION_KEY = "f10-support-chat-session-v1";

export function hasRestorableSupportChat(storage: Storage): boolean {
  let raw: string | null;

  try {
    raw = storage.getItem(SUPPORT_CHAT_SESSION_KEY);
  } catch {
    return false;
  }

  if (!raw) return false;

  try {
    const stored = JSON.parse(raw) as {
      sessionId?: unknown;
      token?: unknown;
      expiresAt?: unknown;
    };

    const valid =
      typeof stored.sessionId === "string" &&
      stored.sessionId.length > 0 &&
      typeof stored.token === "string" &&
      stored.token.length > 0 &&
      typeof stored.expiresAt === "string" &&
      Date.parse(stored.expiresAt) > Date.now();

    if (valid) return true;
  } catch {
    // Sessões inválidas não devem reabrir automaticamente.
  }

  try {
    storage.removeItem(SUPPORT_CHAT_SESSION_KEY);
  } catch {
    // O navegador pode restringir o acesso ao armazenamento.
  }

  return false;
}
