<script lang="ts">
  import { onMount } from "svelte";
  import { Clock3, MessageCircleMore, Search, UserRound } from "lucide-svelte";

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
    if (minutes < 60) return `${minutes} min`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours} h`;
    return `${Math.floor(hours / 24)} d`;
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
  <header class="shrink-0 px-4 pb-3 pt-4">
    <div class="flex items-center gap-3">
      <span class="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#000A57] text-white shadow-sm">
        <MessageCircleMore size={18} aria-hidden="true" />
        <span class="absolute -right-1 -top-1 h-3 w-3 rounded-full border-2 border-white bg-[#EA6D0B]"></span>
      </span>
      <div class="min-w-0">
        <h2 class="truncate text-[14px] font-semibold text-[#202637]">Conversas</h2>
        <p class="mt-0.5 text-[10px] text-[#8B919F]">{inboxChats.length} atendimentos no seu escopo</p>
      </div>
    </div>

    <label class="relative mt-4 block">
      <Search size={15} class="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[#9AA0AD]" aria-hidden="true" />
      <input
        bind:this={searchElement}
        bind:value={query}
        placeholder="Buscar cliente, escola ou chamado..."
        class="h-10 w-full rounded-xl border border-[#DDE1EA] bg-[#F8F9FB] pl-10 pr-9 text-[11px] text-[#343A49] outline-none transition focus:border-[#000A57] focus:bg-white focus:ring-2 focus:ring-[#000A57]/10"
      />
      <span class="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 rounded-md border border-[#E0E3EA] bg-white px-1.5 py-0.5 text-[9px] text-[#9DA2AD]">/</span>
    </label>

    <div class="mt-3 flex gap-1.5 overflow-x-auto pb-1">
      {#each scopes as item}
        <button
          type="button"
          on:click={() => scope = item.value}
          class={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-[10px] font-semibold transition ${scope === item.value ? "bg-[#000A57] text-white shadow-sm" : "border border-[#E4E6EC] bg-white text-[#6D7382] hover:border-[#C9CEDA] hover:bg-[#F8F9FB]"}`}
        >
          {item.label}
          <span class={`rounded-full px-1.5 py-0.5 text-[9px] ${scope === item.value ? "bg-white/15 text-white" : "bg-[#F1F2F5] text-[#858B99]"}`}>{scopeCount(item.value)}</span>
        </button>
      {/each}
    </div>
  </header>

  <div class="min-h-0 flex-1 overflow-y-auto px-3 pb-3">
    {#if filteredChats.length === 0}
      <div class="rounded-2xl border border-dashed border-[#DDE1EA] bg-[#FAFAFC] px-5 py-12 text-center">
        <MessageCircleMore size={30} class="mx-auto text-[#BEC3CD]" aria-hidden="true" />
        <p class="mt-3 text-[11px] font-semibold text-[#5E6574]">Nenhuma conversa</p>
        <p class="mt-1 text-[10px] leading-4 text-[#9298A5]">Altere a busca ou o filtro para continuar.</p>
      </div>
    {:else}
      <div class="space-y-2">
        {#each filteredChats as chat}
          <a
            href={`/app/chat/${chat.sessionId}`}
            class={`relative block overflow-hidden rounded-2xl border px-3.5 py-3 transition ${selectedSessionId === chat.sessionId ? "border-[#000A57] bg-[#F6F7FF] shadow-[0_8px_20px_rgba(0,10,87,0.08)]" : "border-[#E7E9EF] bg-white hover:border-[#CDD2DE] hover:shadow-sm"}`}
          >
            {#if selectedSessionId === chat.sessionId}
              <span class="absolute inset-y-3 left-0 w-1 rounded-r-full bg-[#EA6D0B]"></span>
            {/if}

            <div class="flex gap-3">
              <span class={`relative mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${chat.aiState === "escalated" ? "bg-[#FFF0F0] text-[#A44141]" : "bg-[#EEF0FF] text-[#000A57]"}`}>
                <UserRound size={17} aria-hidden="true" />
                {#if chat.lastMessageAuthorType === "customer" && !["waiting_customer", "resolved", "closed"].includes(chat.status)}
                  <span class="absolute -right-1 -top-1 h-3 w-3 rounded-full border-2 border-white bg-[#EA6D0B]"></span>
                {/if}
              </span>

              <div class="min-w-0 flex-1">
                <div class="flex items-start justify-between gap-2">
                  <strong class="truncate text-[11.5px] font-semibold text-[#303645]">{chat.customerName ?? "Cliente"}</strong>
                  <span class="flex shrink-0 items-center gap-1 text-[9px] text-[#9CA1AD]"><Clock3 size={10} />{formatRelative(chat.updatedAt)}</span>
                </div>

                <div class="mt-1 flex min-w-0 items-center gap-2">
                  {#if chat.ticketNumber}
                    <span class="shrink-0 rounded-md bg-[#FFF0E4] px-1.5 py-0.5 text-[9px] font-bold text-[#B95B12]">#{chat.ticketNumber}</span>
                  {:else}
                    <span class="shrink-0 rounded-md bg-[#EEF0FF] px-1.5 py-0.5 text-[9px] font-bold text-[#000A57]">CHAT</span>
                  {/if}
                  <span class="truncate text-[9.5px] font-medium text-[#747B8B]">
                    {chat.customerContext?.unitName ?? chat.organizationName ?? chat.customerEmail ?? "Atendimento F10"}
                  </span>
                </div>

                <p class={`mt-2 line-clamp-1 text-[10.5px] leading-4 ${chat.lastMessageAuthorType === "customer" ? "font-medium text-[#474E5D]" : "text-[#777E8D]"}`}>
                  {messagePrefix(chat)}{chat.lastMessageBody ?? chat.subject}
                </p>

                {#if !compact}
                  <div class="mt-2 flex items-center justify-between gap-2 text-[9px] text-[#969CA9]">
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
