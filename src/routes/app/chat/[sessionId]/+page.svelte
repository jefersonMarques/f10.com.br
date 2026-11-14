<script lang="ts">
  import { onMount, tick } from "svelte";
  import { browser } from "$app/environment";
  import {
    ArrowDown,
    ArrowLeft,
    Bot,
    BookOpen,
    CalendarClock,
    CheckCircle2,
    ChevronDown,
    CircleAlert,
    Clock3,
    Download,
    ExternalLink,
    Hand,
    History,
    ListTodo,
    LoaderCircle,
    MessageCircleMore,
    MonitorCog,
    Plus,
    Send,
    TicketCheck,
    UserRound,
    UserRoundCog,
  } from "lucide-svelte";
  import ApplicationContent from "$lib/components/application/ApplicationContent.svelte";
  import MentionTextarea from "$lib/components/operations/MentionTextarea.svelte";
  import TicketRichTextEditor from "$lib/components/operations/tickets/TicketRichTextEditor.svelte";
  import SupportChatMarkdown from "$lib/components/support/SupportChatMarkdown.svelte";
  import ChatInbox from "$lib/components/support/ChatInbox.svelte";
  import type { ActionData, PageData } from "./$types";

  export let data: PageData;
  export let form: ActionData;

  type ChatAttachment = {
    id: string;
    originalName: string;
    mimeType: string;
    sizeBytes: number;
  };

  type ChatMessage = PageData["initial"]["messages"][number] & {
    sourceSessionId?: string;
    storageSource?: "chat" | "ticket";
    attachments?: ChatAttachment[];
  };

  type ChatDetails = PageData["initial"]["chat"];
  type ComposerMode = "reply" | "note";

  type RelatedTicket = {
    id: string;
    ticketNumber: number;
    subject: string;
    status: string;
    priority: string;
    updatedAt: string | Date;
    isCurrent: boolean;
  };

  const BOTTOM_THRESHOLD = 120;
  const MESSAGE_PAGE_SIZE = 40;

  let loadedSessionId = data.initial.chat.sessionId;
  let messages: ChatMessage[] = data.initial.messages;
  let chat: ChatDetails = data.initial.chat;
  let messageBody = "";
  let replyFiles: File[] = [];
  let liveCustomerDraft = "";
  let liveDraftSessionId = "";
  let liveDraftStream: EventSource | null = null;
  let composerMode: ComposerMode = "reply";
  let composerExpanded = false;
  let composerContainer: HTMLDivElement | null = null;
  let replyEditor: TicketRichTextEditor | null = null;
  let sending = false;
  let errorMessage = "";
  let newMessageCount = 0;
  let messagesElement: HTMLDivElement;
  let conversationInitialized = false;
  let conversationKey: string | null = data.chatInbox.find((item) => item.sessionId === chat.sessionId)?.conversationKey ?? null;
  let hasOlderMessages = false;
  let loadingOlderMessages = false;
  let relatedTickets: RelatedTicket[] = [];
  let loadingRelatedTickets = true;

  $: onlineRemoteDevices = data.remoteDevices.filter((device) => device.online);
  $: assignedToMe = chat.assignedUserId === data.currentUserId;
  $: canWrite = data.canRespond && (!chat.assignedUserId || assignedToMe);
  $: draftKey = `f10:chat-draft:${chat.sessionId}`;
  $: f10GroupName = chat.customerContext?.groupName ?? "";
  $: f10UnitName = chat.customerContext?.unitName ?? "";
  $: f10LegacyUserId = chat.customerContext?.legacyUserId ?? "";
  $: openRelatedTickets = relatedTickets.filter((ticket) => !["resolved", "closed"].includes(ticket.status));
  $: closedRelatedTickets = relatedTickets.filter((ticket) => ["resolved", "closed"].includes(ticket.status));
  $: if (!canWrite && data.canInternalNote && composerMode === "reply") composerMode = "note";
  $: if (browser && composerExpanded && draftKey && typeof messageBody === "string") persistDraft();
  $: if (data.initial.chat.sessionId !== loadedSessionId) resetConversationState();

  const statusLabels: Record<string, string> = {
    new: "Novo",
    open: "Aberto",
    in_progress: "Em andamento",
    waiting_customer: "Aguardando cliente",
    resolved: "Resolvido",
    closed: "Fechado",
  };

  const priorityLabels: Record<string, string> = {
    low: "Baixa",
    normal: "Normal",
    high: "Alta",
    urgent: "Urgente",
  };

  const aiLabels: Record<string, string> = {
    active: "Automação atendendo",
    escalated: "Aguardando equipe",
    human: "Atendimento humano",
    disabled: "Aguardando equipe",
  };

  function connectLiveDraft(sessionId: string): void {
    if (typeof EventSource === "undefined" || liveDraftSessionId === sessionId) return;

    liveDraftStream?.close();
    liveDraftSessionId = sessionId;
    liveCustomerDraft = "";
    const stream = new EventSource(`/api/app/chat/${encodeURIComponent(sessionId)}/typing`);
    liveDraftStream = stream;
    stream.onmessage = (event: MessageEvent<string>) => {
      if (liveDraftSessionId !== sessionId) return;
      try {
        const payload = JSON.parse(event.data) as { body?: unknown };
        liveCustomerDraft = typeof payload.body === "string" ? payload.body : "";
      } catch {
        liveCustomerDraft = "";
      }
    };
  }

  function resetConversationState(): void {
    loadedSessionId = data.initial.chat.sessionId;
    chat = data.initial.chat;
    messages = data.initial.messages;
    replyFiles = [];
    conversationInitialized = false;
    composerExpanded = false;
    conversationKey = data.chatInbox.find((item) => item.sessionId === chat.sessionId)?.conversationKey ?? null;
    hasOlderMessages = false;
    loadingOlderMessages = false;
    relatedTickets = [];
    loadingRelatedTickets = true;
    newMessageCount = 0;
    errorMessage = "";

    if (typeof window !== "undefined") {
      messageBody = window.sessionStorage.getItem(`f10:chat-draft:${chat.sessionId}`) ?? "";
      connectLiveDraft(chat.sessionId);
      void refreshMessages(true);
      void refreshRelatedTickets();
    }
  }

  function formatTime(value: string | Date): string {
    return new Intl.DateTimeFormat("pt-BR", {
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(value));
  }

  function formatDateTime(value: string | Date): string {
    return new Intl.DateTimeFormat("pt-BR", {
      dateStyle: "short",
      timeStyle: "short",
    }).format(new Date(value));
  }

  function messageAuthor(message: ChatMessage): string {
    if (message.authorType === "customer") return chat.customerName ?? "Cliente";
    if (message.authorType === "system") return message.authorUserName ?? "Sistema F10";
    return message.authorUserName ?? "Equipe F10";
  }

  function attachmentUrl(message: ChatMessage, attachmentId: string): string {
    const sourceSessionId = message.sourceSessionId ?? chat.sessionId;
    return `/api/app/chat/${encodeURIComponent(sourceSessionId)}/attachments/${encodeURIComponent(attachmentId)}`;
  }

  function showSessionDivider(index: number): boolean {
    const currentSessionId = messages[index]?.sourceSessionId;
    if (!currentSessionId) return false;
    if (index === 0) return true;
    return messages[index - 1]?.sourceSessionId !== currentSessionId;
  }

  function slaText(): string {
    if (!chat.ticketId) return "Não iniciado";
    const dueAt = !chat.firstResponseAt ? chat.firstResponseDueAt : chat.resolutionDueAt;
    if (!dueAt || ["resolved", "closed"].includes(chat.status)) return "Sem prazo ativo";

    const minutes = Math.round((new Date(dueAt).getTime() - Date.now()) / 60_000);
    if (minutes < 0) return `Vencido há ${Math.abs(minutes)} min`;
    if (minutes < 60) return `${minutes} min restantes`;
    return `${Math.ceil(minutes / 60)} h restantes`;
  }

  function isNearBottom(): boolean {
    if (!messagesElement) return true;
    return messagesElement.scrollHeight - messagesElement.scrollTop - messagesElement.clientHeight <= BOTTOM_THRESHOLD;
  }

  async function scrollToLatest(behavior: ScrollBehavior = "smooth"): Promise<void> {
    await tick();
    messagesElement?.scrollTo({ top: messagesElement.scrollHeight, behavior });
    newMessageCount = 0;
  }

  function handleMessagesScroll(): void {
    if (isNearBottom()) newMessageCount = 0;
  }

  function persistDraft(): void {
    if (messageBody) window.sessionStorage.setItem(draftKey, messageBody);
    else window.sessionStorage.removeItem(draftKey);
  }

  async function openComposer(): Promise<void> {
    composerExpanded = true;
    await tick();
    if (composerMode === "reply") replyEditor?.focus();
    else composerContainer?.querySelector<HTMLTextAreaElement>("textarea")?.focus();
  }

  async function selectComposerMode(mode: ComposerMode): Promise<void> {
    composerMode = mode;
    await openComposer();
  }

  function collapseComposerOnOutsidePointerDown(event: PointerEvent): void {
    if (!composerExpanded || sending || !composerContainer) return;
    if (event.composedPath().includes(composerContainer)) return;
    composerExpanded = false;
  }

  function insertSchedulingLink(): void {
    if (!data.schedulingPath) return;
    const absoluteUrl = new URL(data.schedulingPath, window.location.origin).toString();
    const prefix = "Você pode escolher o melhor horário na minha agenda:";
    messageBody = messageBody.trim()
      ? `${messageBody.trim()}\n\n${absoluteUrl}`
      : `${prefix}\n${absoluteUrl}`;
    persistDraft();
  }

  function messageCursor(message: ChatMessage): string {
    return `${encodeURIComponent(new Date(message.createdAt).toISOString())}&afterId=${encodeURIComponent(message.id)}`;
  }

  async function refreshMessages(forceScroll = false): Promise<void> {
    if (document.visibilityState !== "visible") return;

    const wasNearBottom = isNearBottom();
    const lastMessage = messages.at(-1);
    const query = conversationInitialized && lastMessage
      ? `?afterAt=${messageCursor(lastMessage)}&limit=${MESSAGE_PAGE_SIZE}`
      : `?limit=${MESSAGE_PAGE_SIZE}`;

    try {
      const response = await fetch(`/api/app/chat/${chat.sessionId}/messages${query}`, {
        headers: { Accept: "application/json" },
        cache: "no-store",
      });
      if (!response.ok) return;

      const payload = (await response.json()) as {
        messages?: ChatMessage[];
        chat?: ChatDetails;
        conversationKey?: string;
        hasOlder?: boolean;
      };
      const nextMessages = payload.messages ?? [];
      if (payload.chat) chat = payload.chat;
      if (payload.conversationKey) conversationKey = payload.conversationKey;

      if (!conversationInitialized) {
        messages = nextMessages;
        hasOlderMessages = payload.hasOlder === true;
        conversationInitialized = true;
        if (forceScroll || wasNearBottom) await scrollToLatest("auto");
        return;
      }

      if (nextMessages.length === 0) return;
      const existingIds = new Set(messages.map((message) => message.id));
      const additions = nextMessages.filter((message) => !existingIds.has(message.id));
      if (additions.length === 0) return;

      messages = [...messages, ...additions];
      if (forceScroll || wasNearBottom) {
        await scrollToLatest(forceScroll ? "auto" : "smooth");
      } else {
        newMessageCount += additions.length;
      }
    } catch {
      // Falhas transitórias de polling não interrompem a conversa.
    }
  }

  async function loadOlderMessages(): Promise<void> {
    const firstMessage = messages[0];
    if (!firstMessage || !hasOlderMessages || loadingOlderMessages) return;

    loadingOlderMessages = true;
    const previousHeight = messagesElement?.scrollHeight ?? 0;
    const previousTop = messagesElement?.scrollTop ?? 0;

    try {
      const beforeAt = encodeURIComponent(new Date(firstMessage.createdAt).toISOString());
      const beforeId = encodeURIComponent(firstMessage.id);
      const response = await fetch(
        `/api/app/chat/${chat.sessionId}/messages?beforeAt=${beforeAt}&beforeId=${beforeId}&limit=${MESSAGE_PAGE_SIZE}`,
        { headers: { Accept: "application/json" }, cache: "no-store" },
      );
      if (!response.ok) return;

      const payload = (await response.json()) as {
        messages?: ChatMessage[];
        hasOlder?: boolean;
      };
      const olderMessages = payload.messages ?? [];
      hasOlderMessages = payload.hasOlder === true;
      if (olderMessages.length === 0) return;

      const existingIds = new Set(messages.map((message) => message.id));
      messages = [
        ...olderMessages.filter((message) => !existingIds.has(message.id)),
        ...messages,
      ];
      await tick();
      if (messagesElement) {
        messagesElement.scrollTop = previousTop + messagesElement.scrollHeight - previousHeight;
      }
    } finally {
      loadingOlderMessages = false;
    }
  }

  async function refreshRelatedTickets(): Promise<void> {
    try {
      const response = await fetch(`/api/app/chat/${chat.sessionId}/related-tickets`, {
        headers: { Accept: "application/json" },
        cache: "no-store",
      });
      if (!response.ok) return;
      const payload = (await response.json()) as { tickets?: RelatedTicket[] };
      relatedTickets = payload.tickets ?? [];
    } catch {
      relatedTickets = [];
    } finally {
      loadingRelatedTickets = false;
    }
  }

  async function sendMessage(): Promise<void> {
    const body = messageBody.trim();
    if ((!body && replyFiles.length === 0) || sending || !canWrite) return;
    if (replyFiles.length > 4 || replyFiles.reduce((total, file) => total + file.size, 0) > 12 * 1024 * 1024) {
      errorMessage = "Máximo de 4 arquivos e 12 MB por mensagem.";
      return;
    }

    sending = true;
    errorMessage = "";

    try {
      const form = new FormData();
      form.set("body", body);
      for (const file of replyFiles) form.append("files", file, file.name);
      const response = await fetch(`/api/app/chat/${chat.sessionId}/messages`, {
        method: "POST",
        body: form,
      });

      if (!response.ok) {
        errorMessage = "Não foi possível enviar a mensagem. Verifique se o atendimento continua atribuído a você.";
        return;
      }

      messageBody = "";
      replyFiles = [];
      persistDraft();
      composerExpanded = false;
      await refreshMessages(true);
    } catch {
      errorMessage = "Não foi possível enviar a mensagem.";
    } finally {
      sending = false;
    }
  }

  onMount(() => {
    messageBody = window.sessionStorage.getItem(draftKey) ?? "";
    connectLiveDraft(chat.sessionId);
    void refreshMessages(true);
    void refreshRelatedTickets();

    const intervalId = window.setInterval(() => void refreshMessages(), 3_000);
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        void refreshMessages();
        void refreshRelatedTickets();
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      window.clearInterval(intervalId);
      liveDraftStream?.close();
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  });
</script>

<svelte:window on:pointerdown={collapseComposerOnOutsidePointerDown}/>

<svelte:head>
  <title>{chat.ticketNumber ? `Chamado #${chat.ticketNumber}` : "Chat"} | F10 Operations</title>
</svelte:head>

<ApplicationContent
  width="full"
  padding="none"
  className="h-[calc(100dvh-var(--application-header-height))] min-h-[620px] overflow-hidden bg-[#F5F6FA]"
>
  <div class="support-chat-workspace grid h-full min-h-0 grid-cols-1 gap-3 p-3 lg:grid-cols-[315px_minmax(0,1fr)] lg:gap-4 lg:p-4 xl:grid-cols-[315px_minmax(520px,1fr)_310px]">
    <aside class="hidden min-h-0 overflow-hidden rounded-[22px] border border-[#E2E5ED] bg-white shadow-[0_12px_32px_rgba(1,13,40,0.05)] lg:block">
      <ChatInbox
        chats={data.chatInbox}
        currentUserId={data.chatCurrentUserId}
        selectedConversationKey={conversationKey}
        compact
      />
    </aside>

    <main class="relative flex min-h-0 min-w-0 flex-col overflow-hidden rounded-[22px] border border-[#E2E5ED] bg-white shadow-[0_12px_32px_rgba(1,13,40,0.05)]">
      <header class="shrink-0 border-b border-[#E9EBF1] bg-white px-4 pb-3 pt-4 sm:px-5">
        <div class="flex items-start justify-between gap-3">
          <div class="flex min-w-0 items-center gap-3">
            <a href="/app/chat" class="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-[#E1E4EA] text-[#69707E] transition hover:bg-[#F6F7F9] hover:text-[#000A57] lg:hidden" aria-label="Voltar para conversas">
              <ArrowLeft size={16} />
            </a>
            <span class="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#EEF0FF] text-[#000A57]">
              <MessageCircleMore size={19} />
            </span>
            <div class="min-w-0">
              <div class="flex flex-wrap items-center gap-2">
                <h1 class="truncate text-[14px] font-semibold text-[#202637]">{chat.customerName ?? "Cliente"}</h1>
                {#if chat.ticketNumber}
                  <span class="rounded-full bg-[#FFF0E4] px-2 py-1 text-[9px] font-bold text-[#B95B12]">Chamado #{chat.ticketNumber}</span>
                {:else}
                  <span class="rounded-full bg-[#EEF0FF] px-2 py-1 text-[9px] font-bold text-[#000A57]">Chat</span>
                {/if}
                <span class="rounded-full bg-[#F2F3F6] px-2 py-1 text-[9px] font-semibold text-[#666D7C]">{statusLabels[chat.status]}</span>
                {#if chat.aiState === "escalated" || chat.aiState === "active"}
                  <span class={`rounded-full px-2 py-1 text-[9px] font-semibold ${chat.aiState === "escalated" ? "bg-[#FFF0F0] text-[#9B4343]" : "bg-[#F0EEFF] text-[#5E51A6]"}`}>{aiLabels[chat.aiState]}</span>
                {/if}
              </div>
              <p class="mt-1 truncate text-[10px] text-[#858B98]">
                {f10UnitName ? `${f10UnitName}${f10GroupName ? ` · ${f10GroupName}` : ""}` : chat.organizationName ?? chat.customerEmail ?? "Atendimento F10"}
              </p>
            </div>
          </div>

          <div class="flex shrink-0 items-center gap-2">
            {#if chat.contextUrl}
              <a href={chat.contextUrl} target="_blank" rel="noopener noreferrer" class="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-[#E0E3EA] bg-white text-[#69707E] transition hover:bg-[#F6F7F9] hover:text-[#000A57]" aria-label="Abrir página de origem">
                <ExternalLink size={14} />
              </a>
            {/if}
            <a href="/app/help" target="_blank" rel="noopener noreferrer" class="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-[#E0E3EA] bg-white text-[#69707E] transition hover:bg-[#F6F7F9] hover:text-[#000A57]" aria-label="Abrir base de conhecimento">
              <BookOpen size={14} />
            </a>

            {#if data.canRespond && !chat.assignedUserId && chat.status !== "closed"}
              <form method="POST" action="?/claim"><button type="submit" class="inline-flex h-9 items-center gap-1.5 rounded-xl bg-[#176B35] px-3 text-[10px] font-semibold text-white"><Hand size={13} /> Pegar</button></form>
            {/if}

            {#if chat.ticketId && chat.ticketNumber}
              <a href={`/app/tickets/${chat.ticketId}`} class="hidden h-9 items-center gap-1.5 rounded-xl bg-[#000A57] px-3 text-[10px] font-semibold text-white sm:inline-flex xl:hidden"><TicketCheck size={13} /> #{chat.ticketNumber}</a>
            {:else if data.canCreateTicket && chat.status !== "closed"}
              <form method="POST" action="?/createTicket" class="hidden sm:block xl:hidden" on:submit={(event) => { if (!confirm("Criar um chamado a partir desta conversa? O histórico público e as notas internas serão preservados.")) event.preventDefault(); }}>
                <button type="submit" class="inline-flex h-9 items-center gap-1.5 rounded-xl bg-[#000A57] px-3 text-[10px] font-semibold text-white"><TicketCheck size={13} /> Criar chamado</button>
              </form>
            {/if}

            {#if canWrite && chat.status !== "closed"}
              <form method="POST" action="?/finish" on:submit={(event) => { if (!confirm(chat.ticketId ? "Finalizar este atendimento? A conversa e o chamado vinculado serão encerrados." : "Finalizar esta conversa? Nenhum chamado será criado.")) event.preventDefault(); }}>
                <button type="submit" class="inline-flex h-9 items-center gap-1.5 rounded-xl border border-[#E5C6C6] bg-[#FFF8F8] px-2.5 text-[10px] font-semibold text-[#984343]"><CheckCircle2 size={13} /> <span class="hidden sm:inline">Finalizar</span></button>
              </form>
            {/if}
          </div>
        </div>

        {#if form?.message}
          <div class={`mt-3 flex items-center gap-2 rounded-xl px-3 py-2.5 text-[10px] font-medium ${form.success ? "bg-[#EEF8F1] text-[#2F7045]" : "bg-[#FFF0F0] text-[#9B3C3C]"}`}>
            {#if form.success}<CheckCircle2 size={13} />{:else}<CircleAlert size={13} />{/if}{form.message}
          </div>
        {/if}
      </header>

      <div class="relative min-h-0 flex-1 bg-[#F7F8FB]">
        <div bind:this={messagesElement} on:scroll={handleMessagesScroll} class="h-full overflow-y-auto px-4 py-5 sm:px-6">
          <div class="mx-auto max-w-[840px]">
            <div class="mb-4 flex min-h-8 items-center justify-center">
              {#if loadingOlderMessages}
                <span class="inline-flex items-center gap-2 text-[9.5px] font-medium text-[#858B99]"><LoaderCircle size={13} class="animate-spin" />Carregando mensagens antigas...</span>
              {:else if hasOlderMessages}
                <button type="button" on:click={() => void loadOlderMessages()} class="inline-flex h-8 items-center gap-2 rounded-full border border-[#D9DDE7] bg-white px-3.5 text-[9.5px] font-semibold text-[#000A57] shadow-sm transition hover:border-[#BBC2D1] hover:bg-[#F9FAFC]"><History size={12} />Carregar mensagens anteriores</button>
              {:else if conversationInitialized && messages.length > 0}
                <span class="text-[9px] text-[#A0A5B0]">Início do histórico disponível</span>
              {/if}
            </div>

            <div class="space-y-3.5">
              {#each messages as message, index (message.id)}
                {#if showSessionDivider(index)}
                  <div class="flex items-center gap-3 py-2" aria-label="Início de uma sessão de atendimento">
                    <span class="h-px flex-1 bg-[#E3E6ED]"></span>
                    <span class="inline-flex items-center gap-1.5 rounded-full border border-[#E1E4EA] bg-white px-3 py-1 text-[8.5px] font-medium text-[#858B99]"><History size={10} />Atendimento · {formatDateTime(message.createdAt)}</span>
                    <span class="h-px flex-1 bg-[#E3E6ED]"></span>
                  </div>
                {/if}

                {#if message.visibility === "internal"}
                  <div class="flex justify-center py-1">
                    <article class="w-full max-w-[88%] rounded-2xl border border-[#E9D6C1] bg-[#FFF9F3] px-4 py-3 text-[#6F4B29] shadow-sm">
                      <div class="mb-2 flex items-center justify-between gap-3"><span class="text-[9px] font-bold uppercase tracking-[0.08em] text-[#9A5513]">Nota interna · {messageAuthor(message)}</span><span class="text-[9px] text-[#AC8B6A]">{formatTime(message.createdAt)}</span></div>
                      <p class="whitespace-pre-wrap text-[11.5px] leading-5">{message.body}</p>
                    </article>
                  </div>
                {:else}
                  <div class={`flex ${message.authorType === "customer" ? "justify-start" : "justify-end"}`}>
                    <article class={`max-w-[80%] rounded-2xl px-4 py-3 shadow-sm ${message.authorType === "customer" ? "rounded-bl-md border border-[#E0E3EA] bg-white text-[#4D5361]" : message.authorType === "system" ? "rounded-br-md border border-[#DDD8F4] bg-[#F2F0FF] text-[#453D78]" : "rounded-br-md bg-[#000A57] text-white"}`}>
                      {#if message.authorType === "system"}<div class="mb-2 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.07em] text-[var(--app-info-text)]"><Bot size={13} />{message.authorUserName ?? "Sistema F10"}</div>{/if}

                      {#if message.attachments && message.attachments.length > 0}
                        <div class="mb-2 grid gap-2">
                          {#each message.attachments as attachment}
                            <a href={attachmentUrl(message, attachment.id)} target="_blank" rel="noopener noreferrer"
                              class="flex min-h-12 items-center justify-center gap-2 overflow-hidden rounded-xl border border-[var(--app-border)] bg-[var(--app-surface)] p-2 text-[var(--app-text)]">
                              {#if attachment.mimeType.startsWith("image/")}
                                <img src={attachmentUrl(message, attachment.id)} alt={attachment.originalName} loading="lazy" class="max-h-[300px] w-full object-contain"/>
                              {:else}
                                <Download size={17}/><span class="min-w-0 break-all text-[13px]">{attachment.originalName}</span>
                              {/if}
                            </a>
                          {/each}
                        </div>
                      {/if}

                      {#if message.body}<SupportChatMarkdown text={message.body} isCustomer={message.authorType === "user"} size="md" />{/if}
                      <div class={`mt-2 flex items-center gap-1.5 text-[9px] ${message.authorType === "customer" ? "text-[#989EAB]" : message.authorType === "system" ? "text-[#8178B5]" : "text-white/65"}`}><span>{messageAuthor(message)}</span><span>·</span><span>{formatTime(message.createdAt)}</span></div>
                    </article>
                  </div>
                {/if}
              {/each}
            </div>
          </div>
        </div>

        {#if newMessageCount > 0}
          <button type="button" on:click={() => void scrollToLatest()} class="absolute bottom-4 left-1/2 inline-flex -translate-x-1/2 items-center gap-1.5 rounded-full bg-[#000A57] px-3.5 py-2 text-[10px] font-semibold text-white shadow-lg">{newMessageCount} {newMessageCount === 1 ? "nova mensagem" : "novas mensagens"}<ArrowDown size={13} /></button>
        {/if}
      </div>

      {#if liveCustomerDraft && !chat.closedAt}
        <div class="shrink-0 border-t border-[var(--app-border)] bg-[var(--app-surface)] px-4 py-2.5">
          <div class="mx-auto max-w-[840px] rounded-xl border border-[var(--app-border-control)] bg-[var(--app-surface-subtle)] px-3.5 py-2.5" aria-live="polite">
            <span class="text-[10px] font-semibold text-[var(--app-text-muted)]">Cliente digitando...</span>
            <p class="mt-1 max-h-32 overflow-y-auto whitespace-pre-wrap break-words text-[12px] leading-5 text-[var(--app-text)]">{liveCustomerDraft}</p>
          </div>
        </div>
      {/if}

      {#if chat.status !== "closed" && (canWrite || data.canInternalNote)}
        <footer class="shrink-0 border-t border-[var(--app-border)] bg-[var(--app-surface)] px-3 py-3 sm:px-5">
          <div class="mx-auto max-w-[840px]">
            {#if !composerExpanded}
              <button
                type="button"
                on:click={() => void openComposer()}
                class="flex min-h-12 w-full items-center gap-3 rounded-xl border border-[var(--app-border-control)] bg-[var(--app-surface)] px-4 text-left text-[14px] text-[var(--app-text-muted)] transition-colors hover:border-[var(--app-primary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--app-primary)]"
                aria-label={composerMode === "note" ? "Escrever uma nota interna" : "Escrever uma resposta"}
              >
                <span class="min-w-0 flex-1 truncate">
                  {messageBody.trim() && composerMode === "reply" ? "Continuar resposta..." : composerMode === "note" ? "Escrever nota interna..." : "Escrever uma resposta..."}
                </span>
                <Send size={18} class="shrink-0 text-[var(--app-primary)]" />
              </button>
            {:else}
              <div bind:this={composerContainer} class="rounded-xl border border-[var(--app-border-control)] bg-[var(--app-surface)] p-3">
                <div class="mb-2 flex flex-wrap items-center justify-between gap-2 border-b border-[var(--app-border-soft)] pb-2">
                  <div class="flex items-center gap-1 rounded-lg bg-[var(--app-surface-muted)] p-1">
                    {#if canWrite}
                      <button type="button" on:click={() => void selectComposerMode("reply")}
                        aria-pressed={composerMode === "reply"}
                        class={`rounded-md px-3 py-1.5 text-[12px] font-semibold ${composerMode === "reply" ? "bg-[var(--app-surface)] text-[var(--app-primary)] shadow-sm" : "text-[var(--app-text-muted)]"}`}>Resposta</button>
                    {/if}
                    {#if data.canInternalNote}
                      <button type="button" on:click={() => void selectComposerMode("note")}
                        aria-pressed={composerMode === "note"}
                        class={`rounded-md px-3 py-1.5 text-[12px] font-semibold ${composerMode === "note" ? "bg-[var(--app-surface)] text-[var(--app-warning-text)] shadow-sm" : "text-[var(--app-text-muted)]"}`}>Nota interna</button>
                    {/if}
                  </div>
                  {#if data.schedulingPath && canWrite && composerMode === "reply"}
                    <button type="button" on:click={insertSchedulingLink}
                      class="inline-flex items-center gap-1.5 rounded-lg bg-[var(--app-info-bg)] px-3 py-1.5 text-[12px] font-semibold text-[var(--app-info-text)]">
                      <CalendarClock size={14}/>Minha agenda
                    </button>
                  {/if}
                </div>
                {#if composerMode === "reply" && canWrite}
                  {#if chat.aiState === "active"}
                    <div class="mb-2 flex items-center gap-2 rounded-lg bg-[var(--app-info-bg)] px-3 py-2 text-[12px] text-[var(--app-info-text)]"><Bot size={14}/>Sua resposta assume a conversa.</div>
                  {/if}
                  {#if errorMessage}
                    <p class="mb-2 flex items-center gap-2 text-[12px] text-[var(--app-danger-text)]"><CircleAlert size={14}/>{errorMessage}</p>
                  {/if}
                  <form on:submit|preventDefault={() => void sendMessage()}>
                    <TicketRichTextEditor
                      bind:this={replyEditor}
                      bind:value={messageBody}
                      bind:files={replyFiles}
                      submitting={sending}
                      sendOnEnter
                      onSend={() => void sendMessage()}
                      placeholder="Escreva uma mensagem para o cliente..."
                    />
                    <div class="mt-2 flex items-center justify-between gap-3 border-t border-[var(--app-border-soft)] pt-2">
                      <span class="text-[12px] text-[var(--app-text-muted)]">Enter envia · Shift+Enter quebra linha</span>
                      <div class="flex items-center gap-1">
                        <button type="button" disabled={sending} aria-label="Anexar arquivos" title="Anexar arquivo"
                          on:click={() => replyEditor?.openFilePicker()}
                          class="flex h-10 w-10 items-center justify-center rounded-lg text-[var(--app-text-muted)] hover:bg-[var(--app-surface-muted)]"><Download size={17}/></button>
                      <button type="submit" disabled={sending || (!messageBody.trim() && replyFiles.length === 0)}
                        class="inline-flex h-10 items-center gap-2 rounded-lg bg-[var(--app-primary)] px-4 text-[12px] font-semibold text-white disabled:opacity-50">
                        <Send size={15}/>{sending ? "Enviando..." : "Enviar"}
                      </button>
                      </div>
                    </div>
                  </form>
                {:else if composerMode === "note" && data.canInternalNote}
                  <form method="POST" action="?/note" class="bg-[var(--app-surface)]">
                    <MentionTextarea users={data.mentionUsers} name="body" rows={3} maxlength={10000}
                      placeholder="Escreva uma nota interna. Use @ para mencionar alguém..."
                      className="min-h-[100px] w-full resize-none rounded-lg bg-[var(--app-surface)] px-3 py-3 text-[14px] leading-6 text-[var(--app-text)] outline-none" />
                    <div class="mt-2 flex items-center justify-between gap-3 border-t border-[var(--app-border-soft)] pt-2">
                      <span class="text-[11px] text-[var(--app-warning-text)]">Somente equipe F10</span>
                      <button type="submit" class="inline-flex h-10 items-center gap-2 rounded-lg bg-[var(--app-warning-text)] px-4 text-[12px] font-semibold text-white">Adicionar nota</button>
                    </div>
                  </form>
                {/if}
              </div>
            {/if}
          </div>
        </footer>
      {:else if data.canRespond && chat.assignedUserId && !assignedToMe && chat.status !== "closed"}
        <footer class="shrink-0 border-t border-[#E2E5ED] bg-[#FAFAFC] px-4 py-3 text-center text-[10px] text-[#777D8D]">Este atendimento está atribuído a <strong>{chat.assignedUserName ?? "outro atendente"}</strong>.</footer>
      {/if}
    </main>

    <aside class="hidden min-h-0 space-y-3 overflow-y-auto pr-1 xl:block">
      <section class="rounded-[20px] border border-[#E2E5ED] bg-white p-4 shadow-[0_10px_28px_rgba(1,13,40,0.04)]">
        <div class="flex items-center gap-3">
          <span class="flex h-10 w-10 items-center justify-center rounded-xl bg-[#EEF0FF] text-[#000A57]"><UserRound size={17} /></span>
          <div class="min-w-0"><h2 class="truncate text-[12px] font-semibold text-[#303644]">{chat.customerName ?? "Cliente"}</h2><p class="mt-0.5 truncate text-[9.5px] text-[#8B919F]">{chat.customerEmail ?? "Sem e-mail informado"}</p></div>
        </div>
        {#if chat.organizationName}<p class="mt-3 text-[10px] font-medium text-[#646B7A]">{chat.organizationName}</p>{/if}
        {#if chat.customerPhone}<p class="mt-1 text-[10px] text-[#777E8D]">{chat.customerPhone}</p>{/if}
        {#if f10UnitName}
          <div class="mt-4 border-t border-[#EEF0F5] pt-4">
            <h3 class="text-[9px] font-bold uppercase tracking-[0.09em] text-[#858C9B]">Contexto F10</h3>
            <dl class="mt-3 space-y-2.5">
              <div><dt class="text-[9px] text-[#969CAA]">Escola / unidade</dt><dd class="mt-0.5 text-[10.5px] font-semibold text-[#414857]">{f10UnitName}</dd></div>
              {#if f10GroupName}<div><dt class="text-[9px] text-[#969CAA]">Grupo</dt><dd class="mt-0.5 text-[10.5px] font-semibold text-[#414857]">{f10GroupName}</dd></div>{/if}
              {#if f10LegacyUserId}<div><dt class="text-[9px] text-[#969CAA]">Usuário F10</dt><dd class="mt-0.5 truncate font-mono text-[9.5px] text-[#5C6372]">{f10LegacyUserId}</dd></div>{/if}
            </dl>
          </div>
        {/if}
      </section>

      <section class="rounded-[20px] border border-[#E2E5ED] bg-white p-4 shadow-[0_10px_28px_rgba(1,13,40,0.04)]">
        <div class="flex items-center justify-between gap-2"><div class="flex items-center gap-2"><Clock3 size={14} class="text-[#000A57]" /><h3 class="text-[11px] font-semibold text-[#343A49]">Atendimento</h3></div><span class="text-[9px] text-[#9A9FAC]">{formatDateTime(chat.createdAt)}</span></div>
        <div class="mt-3 grid grid-cols-2 gap-2">
          <div class="rounded-xl bg-[#F7F8FA] px-3 py-2.5"><span class="text-[9px] text-[#969CAA]">Fila</span><strong class="mt-1 block truncate text-[10px] text-[#454B5B]">{chat.queueName}</strong></div>
          <div class="rounded-xl bg-[#F7F8FA] px-3 py-2.5"><span class="text-[9px] text-[#969CAA]">{chat.ticketId ? "SLA" : "Chamado"}</span><strong class={`mt-1 block truncate text-[10px] ${slaText().includes("Vencido") ? "text-[#A13C3C]" : "text-[#454B5B]"}`}>{slaText()}</strong></div>
        </div>
        <div class="mt-4 border-t border-[#EEF0F5] pt-3">
          <span class="text-[9px] text-[#8D93A0]">Responsável pelo chat</span><p class="mt-1 text-[10.5px] font-semibold text-[#414857]">{chat.assignedUserName ?? "Não atribuído"}</p>
          {#if data.canAssign && chat.status !== "closed"}
            <form method="POST" action="?/assign" class="mt-2.5 flex gap-2">
              <select name="assignedUserId" required class="h-9 min-w-0 flex-1 rounded-xl border border-[#DDE1EA] bg-white px-2.5 text-[10px]"><option value="" disabled selected={!chat.assignedUserId}>Selecionar...</option>{#each data.assignees as assignee}<option value={assignee.id} selected={assignee.id === chat.assignedUserId}>{assignee.name}</option>{/each}</select>
              <button type="submit" class="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-[#DDE1EA] bg-white text-[#000A57]" aria-label="Atribuir atendimento"><UserRoundCog size={14} /></button>
            </form>
          {/if}
        </div>
      </section>

      <section class="rounded-[20px] border border-[#E2E5ED] bg-white p-4 shadow-[0_10px_28px_rgba(1,13,40,0.04)]">
        <div class="flex items-center justify-between gap-2">
          <div class="flex items-center gap-2"><TicketCheck size={14} class="text-[#000A57]" /><h3 class="text-[11px] font-semibold text-[#343A49]">Chamados relacionados</h3></div>
          {#if !loadingRelatedTickets}<span class="rounded-full bg-[#F2F3F6] px-2 py-1 text-[9px] font-semibold text-[#6D7382]">{relatedTickets.length}</span>{/if}
        </div>

        {#if loadingRelatedTickets}
          <div class="mt-3 flex items-center gap-2 text-[9.5px] text-[#8B919F]"><LoaderCircle size={12} class="animate-spin" />Carregando chamados...</div>
        {:else if relatedTickets.length === 0}
          <p class="mt-3 text-[9.5px] leading-4 text-[#8B919F]">Nenhum outro chamado encontrado para este cliente e contexto.</p>
        {:else}
          <div class="mt-3 space-y-2">
            {#each openRelatedTickets as ticket}
              <a href={`/app/tickets/${ticket.id}`} class={`block rounded-xl border px-3 py-2.5 transition hover:border-[#BFC6D5] ${ticket.isCurrent ? "border-[#C8CEE8] bg-[#F7F8FF]" : "border-[#E6E9EF] bg-[#FAFAFC]"}`}>
                <div class="flex items-center justify-between gap-2"><strong class="text-[9.5px] text-[#000A57]">#{ticket.ticketNumber}</strong><span class="rounded-full bg-white px-2 py-0.5 text-[8px] font-semibold text-[#6A7180]">{statusLabels[ticket.status] ?? ticket.status}</span></div>
                <p class="mt-1 line-clamp-2 text-[9.5px] leading-4 text-[#505766]">{ticket.subject}</p>
                {#if ticket.isCurrent}<span class="mt-1.5 inline-block text-[8px] font-semibold text-[#EA6D0B]">Chamado desta conversa</span>{/if}
              </a>
            {/each}
          </div>

          {#if closedRelatedTickets.length > 0}
            <details class="mt-3 border-t border-[#EEF0F5] pt-3">
              <summary class="flex cursor-pointer list-none items-center justify-between text-[9px] font-semibold text-[#6D7382]">Encerrados ({closedRelatedTickets.length}) <ChevronDown size={12} /></summary>
              <div class="mt-2 space-y-1.5">
                {#each closedRelatedTickets as ticket}
                  <a href={`/app/tickets/${ticket.id}`} class="block rounded-lg border border-[#EBEDF2] bg-[#FAFAFC] px-2.5 py-2 transition hover:bg-white"><div class="flex items-center justify-between gap-2"><strong class="text-[8.5px] text-[#646B79]">#{ticket.ticketNumber}</strong><span class="text-[8px] text-[#969CA8]">{statusLabels[ticket.status] ?? ticket.status}</span></div><p class="mt-0.5 line-clamp-1 text-[8.5px] text-[#777E8D]">{ticket.subject}</p></a>
                {/each}
              </div>
            </details>
          {/if}
        {/if}
      </section>

      {#if chat.ticketId}
        <section class="rounded-[20px] border border-[#E2E5ED] bg-white p-4 shadow-[0_10px_28px_rgba(1,13,40,0.04)]">
          <div class="flex items-center justify-between gap-2"><div class="flex items-center gap-2"><TicketCheck size={14} class="text-[#EA6D0B]" /><h3 class="text-[11px] font-semibold text-[#343A49]">Chamado #{chat.ticketNumber}</h3></div><a href={`/app/tickets/${chat.ticketId}`} class="text-[9.5px] font-semibold text-[#000A57] hover:underline">Abrir</a></div>
          <p class="mt-2 text-[9.5px] text-[#8B919F]">Prioridade atual: <strong class="text-[#555C6B]">{priorityLabels[chat.priority]}</strong></p>
          {#if data.canManageTicket && chat.status !== "closed"}
            <form method="POST" action="?/status" class="mt-4"><label for="chat-ticket-status" class="text-[9px] font-semibold text-[#666D7C]">Status</label><div class="mt-1.5 flex gap-2"><select id="chat-ticket-status" name="status" value={chat.status} class="h-9 min-w-0 flex-1 rounded-xl border border-[#DDE1EA] bg-white px-2.5 text-[10px]"><option value="new">Novo</option><option value="open">Aberto</option><option value="in_progress">Em andamento</option><option value="waiting_customer">Aguardando cliente</option><option value="resolved">Resolvido</option></select><button type="submit" class="h-9 rounded-xl bg-[#000A57] px-3 text-[9.5px] font-semibold text-white">Salvar</button></div></form>
            <form method="POST" action="?/priority" class="mt-3"><label for="chat-ticket-priority" class="text-[9px] font-semibold text-[#666D7C]">Prioridade</label><div class="mt-1.5 flex gap-2"><select id="chat-ticket-priority" name="priority" value={chat.priority} class="h-9 min-w-0 flex-1 rounded-xl border border-[#DDE1EA] bg-white px-2.5 text-[10px]"><option value="low">Baixa</option><option value="normal">Normal</option><option value="high">Alta</option><option value="urgent">Urgente</option></select><button type="submit" class="h-9 rounded-xl bg-[#000A57] px-3 text-[9.5px] font-semibold text-white">Salvar</button></div></form>
          {/if}
        </section>
      {:else}
        <section class="rounded-[20px] border border-[#DCE1F2] bg-[#F8F9FF] p-4 shadow-[0_10px_28px_rgba(1,13,40,0.035)]">
          <div class="flex items-center gap-2 text-[#000A57]"><TicketCheck size={15} /><h3 class="text-[11px] font-semibold">Conversa sem chamado</h3></div>
          <p class="mt-2 text-[9.5px] leading-4 text-[#747C8D]">Continue o atendimento normalmente. Crie um chamado apenas quando o caso precisar de acompanhamento formal.</p>
          {#if data.canCreateTicket && chat.status !== "closed"}<form method="POST" action="?/createTicket" class="mt-3" on:submit={(event) => { if (!confirm("Criar um chamado a partir desta conversa? O histórico público e as notas internas serão preservados.")) event.preventDefault(); }}><button type="submit" class="inline-flex h-9 w-full items-center justify-center gap-2 rounded-xl bg-[#000A57] text-[10px] font-semibold text-white"><TicketCheck size={13} />Criar chamado</button></form>{/if}
        </section>
      {/if}

      {#if data.canViewTasks}
        <section class="rounded-[20px] border border-[#E2E5ED] bg-white p-4 shadow-[0_10px_28px_rgba(1,13,40,0.04)]">
          <div class="flex items-center justify-between gap-2"><div class="flex items-center gap-2"><ListTodo size={14} class="text-[#000A57]" /><h3 class="text-[11px] font-semibold text-[#343A49]">Tarefas do chamado</h3></div><span class="rounded-full bg-[#F2F3F6] px-2 py-1 text-[9px] font-semibold text-[#6D7382]">{data.linkedTasks.length}</span></div>
          {#if data.linkedTasks.length > 0}<div class="mt-3 space-y-2">{#each data.linkedTasks as task}<a href={`/app/tasks/${task.id}`} class="block rounded-xl border border-[#E7E9EF] bg-[#FAFAFC] px-3 py-2.5 transition hover:border-[#C9CFE0] hover:bg-white"><strong class="line-clamp-1 text-[9.5px] text-[#454B59]">{task.title}</strong><span class="mt-1 block text-[8.5px] text-[#9298A5]">{task.projectName}{task.dueOn ? ` · ${task.dueOn}` : ""}</span></a>{/each}</div>{:else}<p class="mt-3 text-[9.5px] text-[#8B919F]">Nenhuma tarefa vinculada.</p>{/if}
          {#if data.canCreateTask && data.taskProjects.length > 0 && chat.status !== "closed"}
            <details class="mt-3 border-t border-[#EEF0F5] pt-3"><summary class="flex cursor-pointer list-none items-center gap-1.5 text-[9.5px] font-semibold text-[#000A57]"><Plus size={12} />Criar tarefa</summary><form method="POST" action="?/createTask" class="mt-3 space-y-2"><select name="projectId" required class="h-9 w-full rounded-xl border border-[#DDE1EA] bg-white px-2.5 text-[9.5px]">{#each data.taskProjects as project}<option value={project.id}>{project.name}</option>{/each}</select><input name="title" required maxlength="180" value={`Chamado #${chat.ticketNumber} · ${chat.subject}`.slice(0, 180)} class="h-9 w-full rounded-xl border border-[#DDE1EA] px-2.5 text-[9.5px]" /><textarea name="description" rows="2" maxlength="5000" placeholder="O que precisa ser feito?" class="w-full rounded-xl border border-[#DDE1EA] px-2.5 py-2 text-[9.5px]"></textarea><div class="grid grid-cols-2 gap-2"><select name="priority" class="h-9 rounded-xl border border-[#DDE1EA] bg-white px-2 text-[9.5px]"><option value="normal">Normal</option><option value="low">Baixa</option><option value="high">Alta</option><option value="urgent">Urgente</option></select><input name="dueOn" type="date" class="h-9 rounded-xl border border-[#DDE1EA] px-2 text-[9.5px]" /></div><button type="submit" class="h-9 w-full rounded-xl bg-[#000A57] text-[9.5px] font-semibold text-white">Criar tarefa</button></form></details>
          {/if}
        </section>
      {/if}

      {#if chat.ticketId}
        <section class="rounded-[20px] border border-[#E2E5ED] bg-white p-4 shadow-[0_10px_28px_rgba(1,13,40,0.04)]">
          <div class="flex items-center gap-2"><MonitorCog size={14} class="text-[#000A57]" /><h3 class="text-[11px] font-semibold text-[#343A49]">Acesso remoto</h3></div>
          {#if onlineRemoteDevices.length > 0}<p class="mt-2 text-[9.5px] font-medium text-[#398155]">{onlineRemoteDevices.length} {onlineRemoteDevices.length === 1 ? "computador online" : "computadores online"}</p>{:else if data.remoteDevices.length > 0}<p class="mt-2 text-[9.5px] text-[#858B99]">Computadores vinculados estão offline.</p>{:else}<p class="mt-2 text-[9.5px] text-[#858B99]">Nenhum computador vinculado.</p>{/if}
          <div class="mt-3 flex flex-col gap-2">
            {#if data.remoteReady && onlineRemoteDevices.length === 1 && data.canUseRemote}<form method="POST" action="?/startRemote"><input type="hidden" name="deviceId" value={onlineRemoteDevices[0].id} /><button type="submit" class="inline-flex h-9 w-full items-center justify-center gap-2 rounded-xl bg-[#000A57] text-[9.5px] font-semibold text-white"><MonitorCog size={12} />Iniciar acesso remoto</button></form>{:else if data.remoteReady && data.canRequestRemote && data.remoteDevices.length === 0}<form method="POST" action="?/enrollRemote"><button type="submit" class="inline-flex h-9 w-full items-center justify-center gap-2 rounded-xl border border-[#DDE1EA] bg-white text-[9.5px] font-semibold text-[#000A57]"><Download size={12} />Instalar suporte remoto</button></form>{/if}
            {#if data.canRequestRemote}<a href={`/app/tickets/${chat.ticketId}/remote`} class="inline-flex h-9 w-full items-center justify-center rounded-xl border border-[#DDE1EA] bg-white text-[9.5px] font-semibold text-[#000A57]">Gerenciar computadores</a>{/if}
          </div>
        </section>
      {/if}
    </aside>
  </div>
</ApplicationContent>
