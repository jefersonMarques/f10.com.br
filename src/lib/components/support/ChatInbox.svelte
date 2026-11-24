<script lang="ts">
  import { onMount } from "svelte";
  import { getCustomerChatPresence, CUSTOMER_CHAT_PRESENCE_LABELS } from "$lib/support/chatOperationalPolicy";
  import { page } from "$app/stores";
  import { replaceState } from "$app/navigation";
  import { isChatAwaitingAgent, isChatOpen } from "$lib/support/chatInboxClassification";
  import { readChatInboxScope, withChatInboxScope, type ChatInboxScope } from "$lib/support/chatInboxScope";
  import { Clock3, History, Search } from "lucide-svelte";

  type ChatInboxItem = {
    conversationKey: string;
    sessionCount: number;
    sessionId: string;
    ticketId: string | null;
    ticketNumber: number | null;
    subject: string;
    status: string;
    closedAt: string | Date | null;
    aiState: string;
    assignedUserId: string | null;
    assignedUserName: string | null;
    customerName: string | null;
    customerEmail: string | null;
    organizationName: string | null;
    lastMessageBody: string | null;
    lastMessageAuthorType: string | null;
    updatedAt: string | Date;
    lastSeenAt?: string | Date | null;
    waitingSinceMs?: number | null;
    customerContext: {
      groupName: string;
      unitName: string;
      legacyUserId?: string | null;
    } | null;
  };



  export let chats: ChatInboxItem[] = [];
  export let currentUserId = "";
  export let selectedConversationKey: string | null = null;

  let inboxChats: ChatInboxItem[] = chats;
  let query = "";
  let clockMs = Date.now();
  let scope: ChatInboxScope = readChatInboxScope($page.url);
  let lastNavigatedUrl = $page.url.href;
  let searchElement: HTMLInputElement;

  const scopes: Array<{ value: ChatInboxScope; label: string }> = [
    { value: "waiting", label: "Aguardando" },
    { value: "mine", label: "Meus" },
    { value: "unassigned", label: "Não atribuídos" },
    { value: "finished", label: "Finalizados" },
    { value: "all", label: "Todos" },
  ];

  function selectScope(value: ChatInboxScope): void {
    if (scope === value) return;

    scope = value;
    replaceState(withChatInboxScope(new URL(window.location.href), value), $page.state);
  }

  function conversationHref(sessionId: string): string {
    const url = new URL(`/app/chat/${encodeURIComponent(sessionId)}`, $page.url);
    const filteredUrl = withChatInboxScope(url, scope);
    return filteredUrl.pathname + filteredUrl.search;
  }

  function matchesScope(chat: ChatInboxItem, value: ChatInboxScope): boolean {
    if (value === "all") return true;
    if (value === "finished") return !isChatOpen(chat);
    if (!isChatOpen(chat)) return false;
    if (value === "mine") return chat.assignedUserId === currentUserId;
    if (value === "unassigned") return !chat.assignedUserId;
    return isChatAwaitingAgent(chat);
  }

  function matchesQuery(chat: ChatInboxItem, value: string): boolean {
    const normalized = value.trim().toLocaleLowerCase("pt-BR");
    if (!normalized) return true;

    return [
      chat.customerName,
      chat.customerEmail,
      chat.organizationName,
      chat.customerContext?.groupName,
      chat.customerContext?.unitName,
      chat.subject,
      chat.lastMessageBody,
      chat.ticketNumber ? `#${chat.ticketNumber}` : null,
    ]
      .filter(Boolean)
      .join(" ")
      .toLocaleLowerCase("pt-BR")
      .includes(normalized);
  }

  function scopeCount(value: ChatInboxScope): number {
    return inboxChats.filter((chat) => matchesScope(chat, value)).length;
  }

  function formatRelative(value: string | Date): string {
    const date = new Date(value);
    const minutes = Math.max(0, Math.round((Date.now() - date.getTime()) / 60_000));
    if (minutes < 1) return "agora";
    if (minutes < 60) return `${minutes} min`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours} h`;
    return `${Math.floor(hours / 24)} d`;
  }

  function formatWaitingTime(waitingSinceMs: number, now: number): string {
    const seconds = Math.max(0, Math.floor((now - waitingSinceMs) / 1000));
    const minutes = Math.floor(seconds / 60);
    return `${String(minutes).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`;
  }

  function messagePrefix(chat: ChatInboxItem): string {
    if (chat.lastMessageAuthorType === "customer") return "Cliente: ";
    if (chat.lastMessageAuthorType === "user") return "Equipe: ";
    if (chat.lastMessageAuthorType === "system") return "F10: ";
    return "";
  }

  async function refreshInbox(): Promise<void> {
    if (document.visibilityState !== "visible") return;

    try {
      const response = await fetch("/api/app/chat/inbox", {
        headers: { Accept: "application/json" },
        cache: "no-store",
      });
      if (!response.ok) return;

      const payload = (await response.json()) as { chats?: ChatInboxItem[] };
      if (payload.chats) inboxChats = payload.chats;
    } catch {
      // O inbox mantém o último estado conhecido em falhas transitórias.
    }
  }

  $: inboxChats = chats;
  $: if ($page.url.href !== lastNavigatedUrl) {
    lastNavigatedUrl = $page.url.href;
    scope = readChatInboxScope($page.url);
  }
  $: filteredChats = inboxChats.filter((chat) => matchesScope(chat, scope) && matchesQuery(chat, query))
    .sort((left, right) => scope === "waiting"
      ? (left.waitingSinceMs ?? Number.MAX_SAFE_INTEGER) - (right.waitingSinceMs ?? Number.MAX_SAFE_INTEGER)
      : new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime());

  onMount(() => {
    const handleKeydown = (event: KeyboardEvent) => {
      if (event.key !== "/" || event.ctrlKey || event.metaKey || event.altKey) return;
      const target = event.target as HTMLElement | null;
      if (target?.tagName === "INPUT" || target?.tagName === "TEXTAREA" || target?.isContentEditable) return;
      event.preventDefault();
      searchElement?.focus();
    };
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") void refreshInbox();
    };

    void refreshInbox();
    const intervalId = window.setInterval(() => void refreshInbox(), 5_000);
    const clockIntervalId = window.setInterval(() => { clockMs = Date.now(); }, 1_000);
    window.addEventListener("keydown", handleKeydown);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      window.clearInterval(intervalId);
      window.clearInterval(clockIntervalId);
      window.removeEventListener("keydown", handleKeydown);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  });
</script>

<section class="flex min-h-[540px] flex-col bg-[var(--app-surface)] lg:h-full lg:min-h-0">
  <header class="relative z-30 w-full min-w-0 shrink-0 border-b border-[var(--app-border)] bg-white">
    <div class="flex w-full min-w-0 min-h-[54px] flex-wrap items-center gap-2 px-4 py-2">
      <div class="flex min-w-0 flex-1 flex-wrap items-center gap-2">
        <div class="flex max-w-full overflow-x-auto rounded-lg bg-[#F3F4F7] p-0.5">
          {#each scopes as item (item.value)}
            <button type="button" on:click={() => selectScope(item.value)}
              aria-pressed={scope === item.value}
              class={`application-text-caption flex h-8 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-lg px-3 font-semibold ${scope === item.value ? "bg-white text-[#000A57] shadow-sm" : "text-[#737989]"}`}>
              {item.label}
              <span class="tabular-nums text-[11px]">{scopeCount(item.value)}</span>
            </button>
          {/each}
        </div>
        <label class="relative min-w-[170px] flex-[1_1_220px]">
          <Search size={14} class="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#9499A5]" aria-hidden="true"/>
          <input bind:this={searchElement} bind:value={query} placeholder="Cliente, escola ou chamado"
            aria-label="Buscar conversas" class="application-text-control h-9 w-full rounded-lg border border-[#E6E8EF] bg-[#F8F9FC] pl-9 pr-8 text-[13px]"/>
          <span class="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[11px] text-[#9499A5]">/</span>
        </label>
      </div>
    </div>
  </header>

  <div class="grid min-h-[540px] bg-white lg:min-h-0 lg:flex-1 lg:grid-cols-[minmax(330px,390px)_minmax(0,1fr)]">
    <aside class="flex min-h-[240px] max-h-[38dvh] flex-col overflow-hidden border-b border-[var(--app-border)] bg-white lg:max-h-none lg:min-h-0 lg:border-b-0 lg:border-r">
      <header class="flex h-11 shrink-0 items-center justify-between border-b border-[var(--app-border-soft)] px-4">
        <h2 class="text-[13px] font-semibold text-[#202637]">Conversas</h2>
        <span class="text-[12px] font-medium tabular-nums text-[#707787]">{filteredChats.length}</span>
      </header>
      <div class="min-h-0 flex-1 overflow-y-auto">
        {#if filteredChats.length === 0}
          <div class="flex min-h-[160px] items-center justify-center px-4 text-center text-[12px] text-[#9297A4]">Nenhuma conversa encontrada.</div>
        {:else}
          <div class="divide-y divide-[var(--app-border-soft)]">
            {#each filteredChats as chat (chat.conversationKey)}
              <a href={conversationHref(chat.sessionId)} aria-current={selectedConversationKey === chat.conversationKey ? "page" : undefined}
                class={`block border-l-[3px] px-3 py-3 transition-colors ${selectedConversationKey === chat.conversationKey ? "border-[var(--app-primary)] bg-[var(--app-surface-selected)]" : "border-transparent hover:bg-[var(--app-surface-subtle)]"}`}>
                <div class="flex min-w-0 items-center justify-between gap-3">
                  <div class="flex min-w-0 items-center gap-2">
                    {#if isChatAwaitingAgent(chat)}
                      <span class="h-2 w-2 shrink-0 rounded-full bg-[#EA6D0B]" title="Aguardando resposta" aria-label="Aguardando resposta"></span>
                    {/if}
                    <span class="shrink-0 text-[11px] font-bold text-[#000A57]">{chat.ticketNumber ? "#" + chat.ticketNumber : "CHAT"}</span>
                    {#if !isChatOpen(chat)}
                      <span class="text-[11px] text-[#737989]">Finalizada</span>
                    {:else if chat.aiState === "escalated"}
                      <span class="text-[11px] font-medium text-[#A14A4A]">Aguardando equipe</span>
                    {/if}
                    {#if chat.sessionCount > 1}
                      <span class="inline-flex shrink-0 items-center gap-1 text-[11px] text-[#737989]" title={`${chat.sessionCount} sessões de atendimento`}><History size={12}/>{chat.sessionCount}</span>
                    {/if}
                  </div>
                  {#if isChatAwaitingAgent(chat) && chat.waitingSinceMs != null}
                    <span class={`flex shrink-0 items-center gap-1 text-[12px] font-semibold tabular-nums ${clockMs - chat.waitingSinceMs >= 120_000 ? "text-[#A13C3C]" : "text-[#A65B13]"}`} title="Tempo sem resposta humana"><Clock3 size={12}/>{formatWaitingTime(chat.waitingSinceMs, clockMs)}</span>
                  {:else}
                    <span class="shrink-0 whitespace-nowrap text-[11px] text-[#9298A5]">{formatRelative(chat.updatedAt)}</span>
                  {/if}
                </div>
                <strong class="mt-1 block min-w-0 break-words text-[13px] font-semibold leading-5 text-[#303645]">{chat.customerName ?? "Cliente"}</strong>
                <p class="mt-1 line-clamp-2 break-words text-[13px] leading-5 text-[#505766]">{messagePrefix(chat)}{chat.lastMessageBody ?? chat.subject}</p>
                <div class="mt-1 flex min-w-0 items-center gap-1.5 text-[12px] text-[#737989]">
                  {#if isChatOpen(chat)}
                    {@const presence = getCustomerChatPresence(chat.lastSeenAt, clockMs)}
                    <span class={`h-2 w-2 shrink-0 rounded-full ${presence === "recent" ? "bg-emerald-600" : presence === "away" ? "bg-amber-500" : "bg-slate-400"}`} title={CUSTOMER_CHAT_PRESENCE_LABELS[presence]} aria-label={CUSTOMER_CHAT_PRESENCE_LABELS[presence]}></span>
                  {/if}
                  <span class="min-w-0 flex-1 truncate">{chat.customerContext?.unitName ?? chat.organizationName ?? chat.customerEmail ?? "Atendimento F10"}</span>
                  <span class="max-w-[120px] truncate text-[11px]" title={chat.assignedUserName ?? "Sem responsável"}>{chat.assignedUserName ?? "Sem responsável"}</span>
                </div>
              </a>
            {/each}
          </div>
        {/if}
      </div>
    </aside>
    <slot />
  </div>
</section>
