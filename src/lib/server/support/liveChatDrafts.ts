const DRAFT_TTL_MS = 8_000;
const MAX_ACTIVE_DRAFTS = 300;

type LiveDraft = {
  body: string;
  updatedAt: number;
};

type LiveDraftSubscriber = (body: string) => void;

const drafts = new Map<string, LiveDraft>();
const subscribers = new Map<string, Set<LiveDraftSubscriber>>();

function notifySubscribers(sessionId: string, body: string): void {
  for (const subscriber of subscribers.get(sessionId) ?? []) {
    subscriber(body);
  }
}

export function getLiveChatDraft(sessionId: string): string {
  const draft = drafts.get(sessionId);
  if (!draft) return "";
  if (Date.now() - draft.updatedAt < DRAFT_TTL_MS) return draft.body;

  drafts.delete(sessionId);
  notifySubscribers(sessionId, "");
  return "";
}

export function updateLiveChatDraft(sessionId: string, body: string): void {
  const previous = getLiveChatDraft(sessionId);
  const next = body.trim() ? body : "";

  if (!next) {
    drafts.delete(sessionId);
  } else {
    drafts.set(sessionId, { body: next, updatedAt: Date.now() });
    if (drafts.size > MAX_ACTIVE_DRAFTS) {
      const oldest = drafts.keys().next().value;
      if (oldest && oldest !== sessionId) {
        drafts.delete(oldest);
        notifySubscribers(oldest, "");
      }
    }
  }

  if (previous !== next) notifySubscribers(sessionId, next);
}

export function subscribeLiveChatDraft(
  sessionId: string,
  subscriber: LiveDraftSubscriber,
): () => void {
  const listeners = subscribers.get(sessionId) ?? new Set<LiveDraftSubscriber>();
  listeners.add(subscriber);
  subscribers.set(sessionId, listeners);
  subscriber(getLiveChatDraft(sessionId));

  return () => {
    listeners.delete(subscriber);
    if (listeners.size === 0) subscribers.delete(sessionId);
  };
}
