export type ChatInboxScope = "waiting" | "mine" | "unassigned" | "finished" | "all";

const SCOPE_PARAMETER = "inbox";
const VALID_SCOPES = new Set<ChatInboxScope>([
  "waiting",
  "mine",
  "unassigned",
  "finished",
  "all",
]);

export function readChatInboxScope(url: URL): ChatInboxScope {
  const scope = url.searchParams.get(SCOPE_PARAMETER);
  return VALID_SCOPES.has(scope as ChatInboxScope) ? scope as ChatInboxScope : "all";
}

export function withChatInboxScope(url: URL, scope: ChatInboxScope): URL {
  const nextUrl = new URL(url);

  if (scope === "all") {
    nextUrl.searchParams.delete(SCOPE_PARAMETER);
  } else {
    nextUrl.searchParams.set(SCOPE_PARAMETER, scope);
  }

  return nextUrl;
}
