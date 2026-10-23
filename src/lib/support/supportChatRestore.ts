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

export const SUPPORT_ASSISTANT_GUEST_KEY = "f10-support-assistant-guest-conversation-v1";
export const SUPPORT_CHAT_GUEST_KEY = "f10-support-assistant-conversation-v1";

const GUEST_CONVERSATION_TTL_MS = 24 * 60 * 60 * 1000;

export type StoredSupportGuestMessage = {
  id: string;
  role: "assistant" | "customer";
  body: string;
  createdAt: string;
  actionUrl?: string;
  actionLabel?: string;
};

export function readRestorableSupportGuestMessages(
  storage: Storage,
  key: string,
): StoredSupportGuestMessage[] {
  try {
    const raw = storage.getItem(key);
    if (!raw) return [];

    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      storage.removeItem(key);
      return [];
    }

    const messages: StoredSupportGuestMessage[] = parsed
      .filter((message): message is StoredSupportGuestMessage =>
        message !== null &&
        typeof message === "object" &&
        typeof message.id === "string" &&
        (message.role === "customer" || message.role === "assistant") &&
        typeof message.body === "string" &&
        typeof message.createdAt === "string" &&
        Number.isFinite(Date.parse(message.createdAt)),
      )
      .slice(-30)
      .map((message) => {
        const actionUrl = typeof message.actionUrl === "string" &&
          message.actionUrl.startsWith("/") &&
          !message.actionUrl.startsWith("//") &&
          !message.actionUrl.includes("\\")
          ? message.actionUrl
          : undefined;
        return {
          id: message.id,
          role: message.role,
          body: message.body.slice(0, 4000),
          createdAt: message.createdAt,
          actionUrl,
          actionLabel: actionUrl && typeof message.actionLabel === "string"
            ? message.actionLabel.slice(0, 100)
            : undefined,
        };
      });

    const latestCustomerMessage = [...messages]
      .reverse()
      .find((message) => message.role === "customer");
    const lastActivityAt = latestCustomerMessage
      ? Date.parse(latestCustomerMessage.createdAt)
      : 0;

    if (lastActivityAt <= 0 || Date.now() - lastActivityAt > GUEST_CONVERSATION_TTL_MS) {
      storage.removeItem(key);
      return [];
    }

    return messages;
  } catch {
    try {
      storage.removeItem(key);
    } catch {
      // O armazenamento pode estar desabilitado no navegador.
    }
    return [];
  }
}
