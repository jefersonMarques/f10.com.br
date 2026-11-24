export type ChatMessageGroupCandidate = {
  authorType: string;
  authorUserId?: string | null;
  authorUserName?: string | null;
  customerName?: string | null;
  visibility: string;
  channel?: string | null;
  sourceSessionId?: string | null;
  sourceTicketId?: string | null;
  createdAt: string | Date;
};

const MAX_MESSAGE_INTERVAL_MS = 5 * 60 * 1000;
const conversationDateFormatter = new Intl.DateTimeFormat("pt-BR", {
  timeZone: "America/Sao_Paulo",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

export function isSameChatMessageGroup(
  previous: ChatMessageGroupCandidate | undefined,
  current: ChatMessageGroupCandidate | undefined,
): boolean {
  if (!previous || !current) return false;
  if (previous.visibility !== "public" || current.visibility !== "public") return false;
  if (previous.authorType === "system" || previous.authorType !== current.authorType) return false;
  if ((previous.authorUserId ?? null) !== (current.authorUserId ?? null)) return false;
  if ((previous.authorUserName ?? null) !== (current.authorUserName ?? null)) return false;
  if ((previous.customerName ?? null) !== (current.customerName ?? null)) return false;
  if ((previous.sourceSessionId ?? null) !== (current.sourceSessionId ?? null)) return false;
  if ((previous.sourceTicketId ?? null) !== (current.sourceTicketId ?? null)) return false;
  if ((previous.channel ?? null) !== (current.channel ?? null)) return false;

  const previousDate = new Date(previous.createdAt);
  const currentDate = new Date(current.createdAt);
  const interval = currentDate.getTime() - previousDate.getTime();

  return Number.isFinite(interval)
    && interval >= 0
    && interval <= MAX_MESSAGE_INTERVAL_MS
    && conversationDateFormatter.format(previousDate) === conversationDateFormatter.format(currentDate);
}
