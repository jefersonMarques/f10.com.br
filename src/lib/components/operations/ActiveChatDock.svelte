<script lang="ts">
  import { onMount, tick } from "svelte";
  import {
    CheckCircle2,
    EllipsisVertical,
    ExternalLink,
    MessageCircleMore,
    Minus,
    Send,
    TicketCheck,
    UserRound,
  } from "lucide-svelte";

  export let enabled = false;

  type DockChat = {
    sessionId: string;
    ticketId: string;
    ticketNumber: number;
    status: string;
    customerContactId: string | null;
    customerName: string | null;
    organizationName: string | null;
    assignedUserName: string | null;
    lastMessageBody: string | null;
    lastMessageAuthorType: string | null;
    updatedAt: string | Date;
    unreadCount: number;
  };

  type DockMessage = {
    id: string;
    authorType: string;
    authorUserName: string | null;
    visibility: string;
    body: string;
    createdAt: string | Date;
    attachments?: Array<{
      id: string;
      originalName: string;
      url: string;
    }>;
  };

  let chats: DockChat[] = [];
  let messages: DockMessage[] = [];
  let expandedSessionId: string | null = null;
  let draft = "";
  let sending = false;
  let finishing = false;
  let refreshing = false;
  let errorMessage = "";
  let messageViewport: HTMLDivElement | null = null;

  $: activeChat = expandedSessionId
    ? chats.find((chat) => chat.sessionId === expandedSessionId) ?? null
    : null;
  $: visibleChats = visibleChatTabs(chats, expandedSessionId);
  $: hiddenChatCount = Math.max(chats.length - visibleChats.length, 0);

  function visibleChatTabs(items: DockChat[], selectedSessionId: string | null): DockChat[] {
    const visible = items.slice(0, 4);
    if (!selectedSessionId || visible.some((chat) => chat.sessionId === selectedSessionId)) {
      return visible;
    }
    const selected = items.find((chat) => chat.sessionId === selectedSessionId);
    if (!selected) return visible;
    return [...visible.slice(0, 3), selected];
  }

  function customerLabel(chat: DockChat): string {
    return chat.customerName || chat.organizationName || `Ticket #${chat.ticketNumber}`;
  }

  function statusLabel(status: string): string {
    if (status === "new") return "Novo";
    if (status === "open") return "Aberto";
    if (status === "in_progress") return "Em atendimento";
    if (status === "waiting_customer") return "Aguardando cliente";
    if (status === "resolved") return "Resolvido";
    return status;
  }

  function formatMessageTime(value: string | Date): string {
    return new Intl.DateTimeFormat("pt-BR", {
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(value));
  }

  function hasUserAttention(): boolean {
    return document.visibilityState === "visible" && document.hasFocus();
  }

  async function scrollMessagesToEnd(): Promise<void> {
    await tick();
    if (messageViewport) messageViewport.scrollTop = messageViewport.scrollHeight;
  }

  async function refreshMessages(sessionId: string, scrollToEnd = false): Promise<void> {
    try {
      const response = await fetch(
        `/api/app/chat/${encodeURIComponent(sessionId)}/messages`,
        { cache: "no-store" },
      );
      if (!response.ok) return;
      const result = await response.json() as { messages: DockMessage[] };
      if (expandedSessionId !== sessionId) return;
      messages = result.messages.filter((message) => message.visibility === "public");
      if (scrollToEnd) await scrollMessagesToEnd();
    } catch {
      // A próxima atualização global tenta novamente.
    }
  }

  async function acknowledgeChat(sessionId: string): Promise<void> {
    if (!hasUserAttention()) return;
    try {
      const response = await fetch(
        `/api/app/chat/${encodeURIComponent(sessionId)}/read`,
        { method: "POST" },
      );
      if (!response.ok) return;
      chats = chats.map((chat) =>
        chat.sessionId === sessionId ? { ...chat, unreadCount: 0 } : chat,
      );
    } catch {
      // O unread permanece visível e poderá ser reconhecido na próxima atualização.
    }
  }

  async function refreshDock(): Promise<void> {
    if (!enabled || refreshing) return;
    refreshing = true;
    try {
      const response = await fetch("/api/app/chat/active", { cache: "no-store" });
      if (!response.ok) return;
      const result = await response.json() as { chats: DockChat[] };
      chats = result.chats;

      if (expandedSessionId && !chats.some((chat) => chat.sessionId === expandedSessionId)) {
        expandedSessionId = null;
        messages = [];
        draft = "";
        return;
      }

      if (expandedSessionId) {
        await refreshMessages(expandedSessionId);
        const selected = chats.find((chat) => chat.sessionId === expandedSessionId);
        if (selected?.unreadCount) await acknowledgeChat(expandedSessionId);
      }
    } catch {
      // O dock mantém o último estado conhecido e tenta novamente no próximo ciclo.
    } finally {
      refreshing = false;
    }
  }

  async function toggleChat(sessionId: string): Promise<void> {
    if (expandedSessionId === sessionId) {
      expandedSessionId = null;
      messages = [];
      draft = "";
      errorMessage = "";
      return;
    }

    expandedSessionId = sessionId;
    messages = [];
    draft = "";
    errorMessage = "";
    await refreshMessages(sessionId, true);
    await acknowledgeChat(sessionId);
  }

  async function finishChat(sessionId: string): Promise<void> {
    if (finishing) return;
    if (!window.confirm("Finalizar este atendimento? O chat será fechado para novas respostas.")) {
      return;
    }

    finishing = true;
    errorMessage = "";
    try {
      const response = await fetch(
        `/api/app/chat/${encodeURIComponent(sessionId)}/close`,
        { method: "POST" },
      );
      if (!response.ok) {
        errorMessage = response.status === 409
          ? "Este atendimento foi atribuído a outro usuário."
          : "Não foi possível finalizar o atendimento.";
        return;
      }

      chats = chats.filter((chat) => chat.sessionId !== sessionId);
      if (expandedSessionId === sessionId) {
        expandedSessionId = null;
        messages = [];
        draft = "";
      }
    } catch {
      errorMessage = "Não foi possível finalizar o atendimento.";
    } finally {
      finishing = false;
    }
  }

  async function sendMessage(): Promise<void> {
    if (!expandedSessionId || sending) return;
    const body = draft.trim();
    if (!body) return;

    sending = true;
    errorMessage = "";
    try {
      const response = await fetch(
        `/api/app/chat/${encodeURIComponent(expandedSessionId)}/messages`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ body }),
        },
      );
      if (!response.ok) {
        errorMessage = response.status === 403
          ? "Este atendimento não está mais disponível para resposta."
          : "Não foi possível enviar a mensagem.";
        return;
      }

      draft = "";
      await refreshDock();
      await scrollMessagesToEnd();
    } catch {
      errorMessage = "Não foi possível enviar a mensagem.";
    } finally {
      sending = false;
    }
  }

  onMount(() => {
    if (!enabled) return;

    void refreshDock();
    const timer = window.setInterval(() => void refreshDock(), 5_000);
    const handleAttention = () => {
      if (expandedSessionId && hasUserAttention()) {
        void acknowledgeChat(expandedSessionId);
      }
    };

    window.addEventListener("focus", handleAttention);
    document.addEventListener("visibilitychange", handleAttention);

    return () => {
      window.clearInterval(timer);
      window.removeEventListener("focus", handleAttention);
      document.removeEventListener("visibilitychange", handleAttention);
    };
  });
</script>

{#if enabled && chats.length > 0}
  {#if activeChat}
    <section class="fixed bottom-8 right-3 z-[95] flex h-[min(500px,calc(100dvh-76px))] w-[min(400px,calc(100vw-1.5rem))] flex-col overflow-hidden rounded-t-[18px] border border-b-0 border-[#D9DDE6] bg-white shadow-[0_-16px_50px_rgba(1,13,40,0.18)]" aria-label={`Chat com ${customerLabel(activeChat)}`}>
      <header class="flex items-center gap-2 border-b border-[#E9EBF0] px-4 py-3">
        <span class="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#EEF0FF] text-[#000A57]"><MessageCircleMore size={17}/></span>
        <div class="min-w-0 flex-1">
          <strong class="block truncate text-[12px] font-semibold text-[#272D3B]">{customerLabel(activeChat)}</strong>
          <span class="application-text-meta mt-0.5 block truncate text-[#858B99]">#{activeChat.ticketNumber} · {statusLabel(activeChat.status)}{activeChat.organizationName && activeChat.organizationName !== activeChat.customerName ? ` · ${activeChat.organizationName}` : ""}</span>
        </div>
        <details class="relative shrink-0">
          <summary class="flex h-8 w-8 cursor-pointer list-none items-center justify-center rounded-lg text-[#737A89] transition hover:bg-[#F3F4F7] hover:text-[#000A57]" aria-label="Ações do atendimento">
            <EllipsisVertical size={16}/>
          </summary>
          <div class="absolute right-0 top-10 z-30 w-56 overflow-hidden rounded-xl border border-[#DDE1EA] bg-white p-1.5 shadow-[0_18px_50px_rgba(1,13,40,0.18)]">
            <a href={`/app/chat/${activeChat.sessionId}`} class="application-text-caption flex min-h-9 items-center gap-2.5 rounded-lg px-3 font-semibold text-[#4E5565] hover:bg-[#F6F7FB] hover:text-[#000A57]"><ExternalLink size={14}/>Abrir na área de Chat</a>
            <a href={`/app/tickets/${activeChat.ticketId}`} class="application-text-caption flex min-h-9 items-center gap-2.5 rounded-lg px-3 font-semibold text-[#4E5565] hover:bg-[#F6F7FB] hover:text-[#000A57]"><TicketCheck size={14}/>Abrir ticket</a>
            {#if activeChat.customerContactId}
              <a href={`/app/customers/${activeChat.customerContactId}`} class="application-text-caption flex min-h-9 items-center gap-2.5 rounded-lg px-3 font-semibold text-[#4E5565] hover:bg-[#F6F7FB] hover:text-[#000A57]"><UserRound size={14}/>Ver cliente</a>
            {/if}
            <div class="mt-1 border-t border-[#EEF0F4] pt-1">
              <button type="button" on:click={() => void finishChat(activeChat.sessionId)} disabled={finishing} class="application-text-caption flex min-h-9 w-full items-center gap-2.5 rounded-lg px-3 text-left font-semibold text-[#A13B3B] hover:bg-[#FFF1F1] disabled:opacity-50"><CheckCircle2 size={14}/>{finishing ? "Finalizando..." : "Finalizar atendimento"}</button>
            </div>
          </div>
        </details>
        <button type="button" on:click={() => void toggleChat(activeChat.sessionId)} class="flex h-8 w-8 items-center justify-center rounded-lg text-[#737A89] hover:bg-[#F3F4F7]" aria-label="Recolher conversa"><Minus size={15}/></button>
      </header>

      <div bind:this={messageViewport} class="min-h-0 flex-1 space-y-2.5 overflow-y-auto bg-[#F7F8FA] px-3 py-4">
        {#each messages as message (message.id)}
          {#if message.authorType === "system"}
            <div class="application-text-meta mx-auto max-w-[88%] rounded-lg bg-[#ECEEF3] px-3 py-2 text-center leading-4 text-[#737A89]">{message.body}</div>
          {:else}
            <div class={`flex ${message.authorType === "customer" ? "justify-start" : "justify-end"}`}>
              <div class={`max-w-[84%] rounded-2xl px-3 py-2.5 ${message.authorType === "customer" ? "rounded-bl-md border border-[#E0E3E9] bg-white text-[#424957]" : "rounded-br-md bg-[#000A57] text-white"}`}>
                {#if message.authorUserName && message.authorType !== "customer"}<span class="application-text-meta mb-1 block font-semibold opacity-70">{message.authorUserName}</span>{/if}
                <p class="application-text-caption whitespace-pre-wrap break-words leading-5">{message.body}</p>
                {#if message.attachments?.length}
                  <div class="mt-2 space-y-1 border-t border-current/10 pt-2">
                    {#each message.attachments as attachment}<a href={attachment.url} target="_blank" rel="noreferrer" class="application-text-meta block truncate underline underline-offset-2">{attachment.originalName}</a>{/each}
                  </div>
                {/if}
                <span class="application-text-meta mt-1 block text-right opacity-55">{formatMessageTime(message.createdAt)}</span>
              </div>
            </div>
          {/if}
        {:else}
          <p class="application-text-caption py-10 text-center text-[#969BA7]">Carregando conversa...</p>
        {/each}
      </div>

      <form on:submit|preventDefault={() => void sendMessage()} class="border-t border-[#E5E8EE] bg-white p-3">
        {#if errorMessage}<p class="application-text-meta mb-2 rounded-lg bg-[#FFF2F2] px-2.5 py-2 font-medium text-[#A13B3B]">{errorMessage}</p>{/if}
        <div class="flex items-end gap-2">
          <textarea bind:value={draft} rows="2" maxlength="4000" placeholder="Responder cliente..." class="application-text-caption min-h-[44px] max-h-28 flex-1 resize-y rounded-xl border border-[#D9DDE5] px-3 py-2.5 leading-5 outline-none focus:border-[#000A57]"></textarea>
          <button type="submit" disabled={sending || !draft.trim()} class="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#000A57] text-white disabled:cursor-not-allowed disabled:opacity-45" aria-label="Enviar mensagem"><Send size={16}/></button>
        </div>
      </form>
    </section>
  {/if}

  <div class="fixed -bottom-3 right-3 z-[96] flex max-w-[calc(100vw-1.5rem)] items-start justify-end gap-1.5">
    {#each visibleChats as chat (chat.sessionId)}
      <button type="button" on:click={() => void toggleChat(chat.sessionId)} class={`relative flex h-11 min-w-0 max-w-[150px] items-center gap-2 rounded-t-xl border border-b-0 px-3 pb-3 pt-2 text-left shadow-[0_-6px_18px_rgba(1,13,40,0.12)] transition hover:-translate-y-1 ${expandedSessionId === chat.sessionId ? "border-[#000A57] bg-[#000A57] text-white" : "border-[#D9DDE5] bg-white text-[#303746] hover:border-[#B9C0CE]"}`} aria-expanded={expandedSessionId === chat.sessionId}>
        <MessageCircleMore size={14} class="shrink-0"/>
        <span class="application-text-caption min-w-0 flex-1 truncate font-semibold">{customerLabel(chat)}</span>
        {#if chat.unreadCount > 0}<span class="application-text-meta inline-flex min-w-5 shrink-0 items-center justify-center rounded-full bg-[#D92D20] px-1.5 py-0.5 font-bold text-white">{Math.min(chat.unreadCount, 9)}{chat.unreadCount > 9 ? "+" : ""}</span>{/if}
      </button>
    {/each}
    {#if hiddenChatCount > 0}<a href="/app/chat" class="application-text-caption flex h-11 shrink-0 items-center justify-center rounded-t-xl border border-b-0 border-[#D9DDE5] bg-white px-3 pb-3 pt-2 font-bold text-[#000A57] shadow-[0_-6px_18px_rgba(1,13,40,0.12)] transition hover:-translate-y-1">+{hiddenChatCount}</a>{/if}
  </div>
{/if}
