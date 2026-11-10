export type ChatInboxState = {
  status: string;
  closedAt?: string | Date | null;
  aiState?: string | null;
  lastMessageAuthorType?: string | null;
};

const FINAL_STATUSES = new Set(["resolved", "closed"]);

export function isChatOpen(chat: ChatInboxState): boolean {
  return chat.closedAt == null && !FINAL_STATUSES.has(chat.status);
}

export function isChatAwaitingAgent(chat: ChatInboxState): boolean {
  return isChatOpen(chat)
    && chat.status !== "waiting_customer"
    && (
      chat.aiState === "escalated"
      || chat.lastMessageAuthorType === "customer"
    );
}

export function selectConversationSession<T extends ChatInboxState & { updatedAt: Date }>(
  sessions: T[],
): T | undefined {
  const recent = [...sessions].sort(
    (left, right) => right.updatedAt.getTime() - left.updatedAt.getTime(),
  );

  return recent.find(isChatOpen) ?? recent[0];
}
