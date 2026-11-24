export type ChatEscalationLevel = "owner" | "team" | "supervisor";

export function getChatEscalationLevel(
  elapsedSeconds: number,
  teamSeconds: number,
  supervisorSeconds: number,
): ChatEscalationLevel {
  if (elapsedSeconds >= supervisorSeconds) return "supervisor";
  if (elapsedSeconds >= teamSeconds) return "team";
  return "owner";
}

export type CustomerChatPresence = "recent" | "away" | "offline" | "unknown";

export function getCustomerChatPresence(
  lastSeenAt: string | Date | null | undefined,
  nowMs: number,
): CustomerChatPresence {
  if (!lastSeenAt) return "unknown";
  const elapsed = nowMs - new Date(lastSeenAt).getTime();
  if (!Number.isFinite(elapsed)) return "unknown";
  if (elapsed <= 90_000) return "recent";
  if (elapsed <= 600_000) return "away";
  return "offline";
}

export const CUSTOMER_CHAT_PRESENCE_LABELS: Record<CustomerChatPresence, string> = {
  recent: "Atividade recente",
  away: "Ausente",
  offline: "Sem atividade recente",
  unknown: "Presença desconhecida",
};
