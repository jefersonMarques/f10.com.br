<script lang="ts">
  import { onMount } from "svelte";
  import {
    Clock3,
    MessageCircleMore,
    Search,
    UserRound,
  } from "lucide-svelte";

  type ChatInboxItem = {
    sessionId: string;
    ticketId: string | null;
    ticketNumber: number | null;
    subject: string;
    status: string;
    aiState: string;
    assignedUserId: string | null;
    assignedUserName: string | null;
    customerName: string | null;
    customerEmail: string | null;
    organizationName: string | null;
    lastMessageBody: string | null;
    lastMessageAuthorType: string | null;
    updatedAt: string | Date;
    customerContext: {
      groupName: string;
      unitName: string;
      legacyUserId?: string | null;
    } | null;
  };

  type InboxScope = "mine" | "unassigned" | "waiting" | "all";

  export let chats: ChatInboxItem[] = [];
  export let currentUserId = "";
  export let selectedSessionId: string | null = null;
  export let compact = false;

  let inboxChats: ChatInboxItem[] = chats;
  let query = "";
  let scope: InboxScope = "all";
  let searchElement: HTMLInputElement;

  const scopes: Array<{ value: InboxScope; label: string }> = [
    { value: "mine", label: "Meus" },
    { value: "unassigned", label: "Não atribuídos" },
    { value: "waiting", label: "Aguardando" },
    { value: "all", label: "Todos" },
  ];

  function matchesScope(chat: ChatInboxItem, value: InboxScope): boolean {
    if (value === "mine") {
      return chat.assignedUserId === currentUserId && !["resolved", "closed"].includes(chat.status);
    }
    if (value === "unassigned") {
      return !chat.assignedUserId && !["resolved", "closed"].includes(chat.status);
    }
    if (value === "waiting") {
      return chat.aiState === "escalated" || (
        chat.lastMessageAuthorType === "customer" &&
        !["waiting_customer", "resolved", "closed"].includes(chat.status)
      );
    }
    return true;
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

  function scopeCount(value: InboxScope): number {
    return inboxChats.filter((chat) => matchesScope(chat, value)).length;
  }

  function formatRelative(value: string | Date): string {
    const date = new Date(value);
    const minutes = Math.max(0, Math.round((Date.now() - date.getTime()) / 60_000));
    if (minutes < 1) return "agora";
    if (minutes < 60) return `${minutes}m`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h`;
    return `${Math.floor(hours / 24)}d`;
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
  $: filteredChats = inboxChats.filter((chat) => matchesScope(chat, scope) && matchesQuery(chat, query));

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
    window.addEventListener("keydown", handleKeydown);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      window.clearInterval(intervalId);
      window.removeEventListener("keydown", handleKeydown);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  });
</script>

<section class="flex h-full min-h-0 flex-col bg-white">
  <header class="shrink-0 border-b border-[#E8EAF0] px-3.5 pb-3 pt-3.5">
    <div class="flex items-center justify-between gap-3">
      <div class="flex min-w-0 items-center gap-2.5">
        <span class="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#EEF0FF] text-[#000A57]">
          <MessageCircleMore size={16} aria-hidden="true" />
        </span>
        <div class="min-w-0">
          <h2 class="truncate text-[13px] font-semibold text-[#252B3A]">Conversas</h2>
          <p class="text-[9px] text-[#969BA8]">{inboxChats.length} no seu escopo</p>
        </div>
      </div>
    </div>

    <label class="relative mt-3 block">
      <Search size={14} class="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#A0A5B1]" aria-hidden="true" />
      <input
        bind:this={searchElement}
        bind:value={query}
        placeholder="Buscar conversa..."
        class="h-9 w-full rounded-lg border border-[#DFE2E9] bg-[#FAFAFC] pl-9 pr-8 text-[10px] text-[#3A4050] outline-none transition focus:border-[#000A57] focus:bg-white focus:ring-2 focus:ring-[#000A57]/10"
      />
      <span class="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 rounded border border-[#E1E3E9] bg-white px-1 text-[8px] text-[#9DA2AD]">/</span>
    </label>

    <div class="mt-3 flex gap-1 overflow-x-auto pb-0.5">
      {#each scopes as item}
        <button
          type="button"
          on:click={() => scope = item.value}
          class={`inline-flex shrink-0 items-center gap-1 rounded-md px-2 py-1.5 text-[9px] font-semibold transition ${scope === item.value ? "bg-[#EEF0FF] text-[#000A57]" : "text-[#777D8C] hover:bg-[#F4F5F7]"}`}
        >
          {item.label}
          <span class={`rounded-full px-1.5 py-0.5 text-[8px] ${scope === item.value ? "bg-white text-[#000A57]" : "bg-[#F1F2F5] text-[#9297A3]"}`}>{scopeCount(item.value)}</span>
        </button>
      {/each}
    </div>
  </header>

  <div class="min-h-0 flex-1 overflow-y-auto">
    {#if filteredChats.length === 0}
      <div class="px-5 py-12 text-center">
        <MessageCircleMore size={28} class="mx-auto text-[#C1C5CE]" aria-hidden="true" />
        <p class="mt-3 text-[10px] font-semibold text-[#656B78]">Nenhuma conversa</p>
        <p class="mt-1 text-[9px] leading-4 text-[#9A9FAC]">Altere a busca ou o filtro.</p>
      </div>
    {:else}
      <div class="divide-y divide-[#EEF0F4]">
        {#each filteredChats as chat}
          <a
            href={`/app/chat/${chat.sessionId}`}
            class={`group block px-3.5 py-3 transition ${selectedSessionId === chat.sessionId ? "bg-[#F1F3FF]" : "hover:bg-[#FAFAFC]"}`}
          >
            <div class="flex gap-2.5">
              <span class={`relative mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${chat.aiState === "escalated" ? "bg-[#FFF0F0] text-[#A44141]" : "bg-[#F0F1F4] text-[#6B7180]"}`}>
                <UserRound size={15} aria-hidden="true" />
                {#if chat.lastMessageAuthorType === "customer" && !["waiting_customer", "resolved", "closed"].includes(chat.status)}
                  <span class="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full border-2 border-white bg-[#EA6D0B]"></span>
                {/if}
              </span>

              <div class="min-w-0 flex-1">
                <div class="flex items-start justify-between gap-2">
                  <strong class="truncate text-[10.5px] font-semibold text-[#2E3442]">{chat.customerName ?? "Cliente"}</strong>
                  <span class="flex shrink-0 items-center gap-1 text-[8px] text-[#A0A5B0]"><Clock3 size={9} />{formatRelative(chat.updatedAt)}</span>
                </div>

                <div class="mt-0.5 flex min-w-0 items-center gap-1.5">
                  {#if chat.ticketNumber}
                    <span class="shrink-0 rounded bg-[#FFF0E4] px-1.5 py-0.5 text-[7.5px] font-bold text-[#B95B12]">#{chat.ticketNumber}</span>
                  {:else}
                    <span class="shrink-0 rounded bg-[#EEF0FF] px-1.5 py-0.5 text-[7.5px] font-bold text-[#000A57]">CHAT</span>
                  {/if}
                  <span class="truncate text-[8.5px] text-[#777D8C]">
                    {chat.customerContext?.unitName ?? chat.organizationName ?? chat.customerEmail ?? "Atendimento F10"}
                  </span>
                </div>

                <p class={`mt-1.5 line-clamp-1 text-[9.5px] leading-4 ${chat.lastMessageAuthorType === "customer" ? "font-medium text-[#4B5160]" : "text-[#7B8190]"}`}>
                  {messagePrefix(chat)}{chat.lastMessageBody ?? chat.subject}
                </p>

                {#if !compact}
                  <div class="mt-1.5 flex items-center justify-between gap-2 text-[8px] text-[#9A9FAC]">
                    <span class="truncate">{chat.assignedUserName ?? "Não atribuído"}</span>
                    {#if chat.aiState === "escalated"}<span class="shrink-0 font-semibold text-[#A14A4A]">Aguardando equipe</span>{/if}
                  </div>
                {/if}
              </div>
            </div>
          </a>
        {/each}
      </div>
    {/if}
  </div>
</section>
