<script lang="ts">
  import { onMount, tick } from "svelte";
  import {
    ArrowDown,
    ArrowLeft,
    Bot,
    BookOpen,
    CheckCircle2,
    CircleAlert,
    Clock3,
    Download,
    ExternalLink,
    Hand,
    ListTodo,
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
  import ChatInbox from "$lib/components/support/ChatInbox.svelte";
  import type { ActionData, PageData } from "./$types";

  export let data: PageData;
  export let form: ActionData;

  type ChatAttachment = {
    id: string;
    originalName: string;
    mimeType: string;
    sizeBytes: number;
    url: string;
  };

  type ChatMessage = PageData["initial"]["messages"][number] & {
    attachments?: ChatAttachment[];
  };

  type ChatDetails = PageData["initial"]["chat"];
  type ComposerMode = "reply" | "note";

  const BOTTOM_THRESHOLD = 120;

  let messages: ChatMessage[] = data.initial.messages;
  let chat: ChatDetails = data.initial.chat;
  let messageBody = "";
  let composerMode: ComposerMode = "reply";
  let sending = false;
  let errorMessage = "";
  let newMessageCount = 0;
  let messagesElement: HTMLDivElement;

  $: onlineRemoteDevices = data.remoteDevices.filter((device) => device.online);
  $: assignedToMe = chat.assignedUserId === data.currentUserId;
  $: canWrite = data.canRespond && (!chat.assignedUserId || assignedToMe);
  $: draftKey = `f10:chat-draft:${chat.sessionId}`;
  $: f10GroupName = chat.customerContext?.groupName ?? "";
  $: f10UnitName = chat.customerContext?.unitName ?? "";
  $: f10LegacyUserId = chat.customerContext?.legacyUserId ?? "";
  $: if (!canWrite && data.canInternalNote && composerMode === "reply") composerMode = "note";

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
    if (message.authorType === "system") return "Atendimento F10";
    return message.authorUserName ?? "Equipe F10";
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

  async function refreshMessages(forceScroll = false): Promise<void> {
    if (document.visibilityState !== "visible") return;

    const wasNearBottom = isNearBottom();
    const previousLength = messages.length;
    const previousLastId = messages.at(-1)?.id;

    try {
      const response = await fetch(`/api/app/chat/${chat.sessionId}/messages`, {
        headers: { Accept: "application/json" },
        cache: "no-store",
      });
      if (!response.ok) return;

      const payload = (await response.json()) as {
        messages?: ChatMessage[];
        chat?: ChatDetails;
      };
      const nextMessages = payload.messages ?? [];
      const changed =
        nextMessages.length !== previousLength ||
        nextMessages.at(-1)?.id !== previousLastId ||
        nextMessages.some(
          (message, index) => message.attachments?.length !== messages[index]?.attachments?.length,
        );

      if (payload.chat) chat = payload.chat;
      if (!changed) return;

      messages = nextMessages;
      if (forceScroll || wasNearBottom) {
        await scrollToLatest(forceScroll ? "auto" : "smooth");
      } else {
        newMessageCount += Math.max(nextMessages.length - previousLength, 1);
      }
    } catch {
      // Falhas transitórias de polling não interrompem a conversa.
    }
  }

  async function sendMessage(): Promise<void> {
    const body = messageBody.trim();
    if (!body || sending || !canWrite) return;

    sending = true;
    errorMessage = "";

    try {
      const response = await fetch(`/api/app/chat/${chat.sessionId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body }),
      });

      if (!response.ok) {
        errorMessage = "Não foi possível enviar a mensagem. Verifique se o atendimento continua atribuído a você.";
        return;
      }

      messageBody = "";
      persistDraft();
      await refreshMessages(true);
    } catch {
      errorMessage = "Não foi possível enviar a mensagem.";
    } finally {
      sending = false;
    }
  }

  function handleComposerKeydown(event: KeyboardEvent): void {
    if ((event.ctrlKey || event.metaKey) && event.key === "Enter") {
      event.preventDefault();
      void sendMessage();
    }
  }

  onMount(() => {
    messageBody = window.sessionStorage.getItem(draftKey) ?? "";
    void refreshMessages(true);

    const intervalId = window.setInterval(() => void refreshMessages(), 3_000);
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") void refreshMessages();
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      window.clearInterval(intervalId);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  });
</script>

<svelte:head>
  <title>{chat.ticketNumber ? `Chamado #${chat.ticketNumber}` : "Chat"} | F10 Operations</title>
</svelte:head>

<ApplicationContent
  width="full"
  padding="none"
  className="h-[calc(100dvh-var(--application-header-height))] min-h-[620px] overflow-hidden bg-white"
>
  <div class="grid h-full min-h-0 grid-cols-1 bg-white lg:grid-cols-[300px_minmax(0,1fr)] xl:grid-cols-[300px_minmax(520px,1fr)_300px]">
    <aside class="hidden min-h-0 border-r border-[#E4E6EC] lg:block">
      <ChatInbox
        chats={data.chatInbox}
        currentUserId={data.chatCurrentUserId}
        selectedSessionId={chat.sessionId}
        compact
      />
    </aside>

    <main class="flex min-h-0 min-w-0 flex-col bg-white">
      <header class="shrink-0 border-b border-[#E5E7ED] bg-white px-4 py-3 sm:px-5">
        <div class="flex items-start justify-between gap-3">
          <div class="flex min-w-0 items-center gap-3">
            <a
              href="/app/chat"
              class="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-[#E1E4EA] text-[#69707E] transition hover:bg-[#F6F7F9] hover:text-[#000A57] lg:hidden"
              aria-label="Voltar para conversas"
            >
              <ArrowLeft size={16} />
            </a>
            <span class="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#F0F1F4] text-[#626978]">
              <UserRound size={16} />
            </span>
            <div class="min-w-0">
              <div class="flex flex-wrap items-center gap-2">
                <h1 class="truncate text-[13px] font-semibold text-[#262C3A]">{chat.customerName ?? "Cliente"}</h1>
                {#if chat.ticketNumber}
                  <span class="rounded-md bg-[#FFF0E4] px-1.5 py-1 text-[8px] font-bold text-[#B95B12]">Chamado #{chat.ticketNumber}</span>
                {:else}
                  <span class="rounded-md bg-[#EEF0FF] px-1.5 py-1 text-[8px] font-bold text-[#000A57]">CHAT</span>
                {/if}
                <span class="rounded-md bg-[#F1F2F5] px-1.5 py-1 text-[8px] font-semibold text-[#6C7280]">{statusLabels[chat.status]}</span>
                {#if chat.aiState === "escalated" || chat.aiState === "active"}
                  <span class={`rounded-md px-1.5 py-1 text-[8px] font-semibold ${chat.aiState === "escalated" ? "bg-[#FFF0F0] text-[#9B4343]" : "bg-[#F0EEFF] text-[#5E51A6]"}`}>{aiLabels[chat.aiState]}</span>
                {/if}
              </div>
              <p class="mt-1 truncate text-[9px] text-[#858B98]">
                {f10UnitName ? `${f10UnitName}${f10GroupName ? ` · ${f10GroupName}` : ""}` : chat.organizationName ?? chat.customerEmail ?? "Atendimento F10"}
              </p>
            </div>
          </div>

          <div class="flex shrink-0 items-center gap-1.5">
            {#if chat.contextUrl}
              <a href={chat.contextUrl} target="_blank" rel="noopener noreferrer" class="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-[#E0E3EA] text-[#69707E] transition hover:bg-[#F6F7F9] hover:text-[#000A57]" aria-label="Abrir página de origem">
                <ExternalLink size={14} />
              </a>
            {/if}
            <a href="/app/help" target="_blank" rel="noopener noreferrer" class="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-[#E0E3EA] text-[#69707E] transition hover:bg-[#F6F7F9] hover:text-[#000A57]" aria-label="Abrir base de conhecimento">
              <BookOpen size={14} />
            </a>

            {#if data.canRespond && !chat.assignedUserId && chat.status !== "closed"}
              <form method="POST" action="?/claim">
                <button type="submit" class="inline-flex h-9 items-center gap-1.5 rounded-lg bg-[#176B35] px-3 text-[9px] font-semibold text-white">
                  <Hand size={12} /> Pegar
                </button>
              </form>
            {/if}

            {#if chat.ticketId && chat.ticketNumber}
              <a href={`/app/tickets/${chat.ticketId}`} class="hidden h-9 items-center gap-1.5 rounded-lg bg-[#000A57] px-3 text-[9px] font-semibold text-white sm:inline-flex">
                <TicketCheck size={12} /> #{chat.ticketNumber}
              </a>
            {:else if data.canCreateTicket && chat.status !== "closed"}
              <form method="POST" action="?/createTicket" class="hidden sm:block" on:submit={(event) => { if (!confirm("Criar um chamado a partir desta conversa? O histórico público e as notas internas serão preservados.")) event.preventDefault(); }}>
                <button type="submit" class="inline-flex h-9 items-center gap-1.5 rounded-lg bg-[#000A57] px-3 text-[9px] font-semibold text-white">
                  <TicketCheck size={12} /> Criar chamado
                </button>
              </form>
            {/if}

            {#if canWrite && chat.status !== "closed"}
              <form method="POST" action="?/finish" on:submit={(event) => { if (!confirm(chat.ticketId ? "Finalizar este atendimento? A conversa e o chamado vinculado serão encerrados." : "Finalizar esta conversa? Nenhum chamado será criado.")) event.preventDefault(); }}>
                <button type="submit" class="inline-flex h-9 items-center gap-1.5 rounded-lg border border-[#E5C6C6] bg-[#FFF8F8] px-2.5 text-[9px] font-semibold text-[#984343]">
                  <CheckCircle2 size={12} /> <span class="hidden sm:inline">Finalizar</span>
                </button>
              </form>
            {/if}
          </div>
        </div>

        {#if form?.message}
          <div class={`mt-2 flex items-center gap-2 rounded-lg px-3 py-2 text-[9px] font-medium ${form.success ? "bg-[#EEF8F1] text-[#2F7045]" : "bg-[#FFF0F0] text-[#9B3C3C]"}`}>
            {#if form.success}<CheckCircle2 size={12} />{:else}<CircleAlert size={12} />{/if}
            {form.message}
          </div>
        {/if}
      </header>

      <div class="relative min-h-0 flex-1 bg-[#F7F8FA]">
        <div bind:this={messagesElement} on:scroll={handleMessagesScroll} class="h-full overflow-y-auto px-4 py-5 sm:px-6">
          <div class="mx-auto max-w-[820px] space-y-3">
            {#each messages as message (message.id)}
              {#if message.visibility === "internal"}
                <div class="flex justify-center py-1">
                  <article class="w-full max-w-[88%] rounded-xl border border-[#E9D6C1] bg-[#FFF9F3] px-3.5 py-3 text-[#6F4B29]">
                    <div class="mb-1.5 flex items-center justify-between gap-3">
                      <span class="text-[8px] font-bold uppercase tracking-[0.08em] text-[#9A5513]">Nota interna · {messageAuthor(message)}</span>
                      <span class="text-[8px] text-[#AC8B6A]">{formatTime(message.createdAt)}</span>
                    </div>
                    <p class="whitespace-pre-wrap text-[10.5px] leading-5">{message.body}</p>
                  </article>
                </div>
              {:else}
                <div class={`flex ${message.authorType === "customer" ? "justify-start" : "justify-end"}`}>
                  <article class={`max-w-[78%] rounded-2xl px-3.5 py-2.5 ${message.authorType === "customer" ? "rounded-bl-md border border-[#DFE2E8] bg-white text-[#4D5361]" : message.authorType === "system" ? "rounded-br-md border border-[#DDD8F4] bg-[#F2F0FF] text-[#453D78]" : "rounded-br-md bg-[#DCEBFF] text-[#273246]"}`}>
                    {#if message.authorType === "system"}
                      <div class="mb-1.5 flex items-center gap-1.5 text-[8px] font-bold uppercase tracking-[0.07em] text-[#6255A8]"><Bot size={11} />Atendimento F10</div>
                    {/if}

                    {#if message.attachments && message.attachments.length > 0}
                      <div class={`mb-2 grid gap-1.5 ${message.attachments.length > 1 ? "grid-cols-2" : "grid-cols-1"}`}>
                        {#each message.attachments as attachment}
                          <a href={attachment.url} target="_blank" rel="noopener noreferrer" class="block overflow-hidden rounded-lg border border-black/5 bg-[#F2F3F6]">
                            <img src={attachment.url} alt={attachment.originalName} class="max-h-[280px] w-full object-contain" />
                          </a>
                        {/each}
                      </div>
                    {/if}

                    {#if message.body}<p class="whitespace-pre-wrap text-[10.5px] leading-5">{message.body}</p>{/if}
                    <div class={`mt-1.5 flex items-center gap-1.5 text-[8px] ${message.authorType === "customer" ? "text-[#9A9FAC]" : message.authorType === "system" ? "text-[#8178B5]" : "text-[#6D7E95]"}`}>
                      <span>{messageAuthor(message)}</span><span>·</span><span>{formatTime(message.createdAt)}</span>
                    </div>
                  </article>
                </div>
              {/if}
            {/each}
          </div>
        </div>

        {#if newMessageCount > 0}
          <button type="button" on:click={() => void scrollToLatest()} class="absolute bottom-4 left-1/2 inline-flex -translate-x-1/2 items-center gap-1.5 rounded-full bg-[#000A57] px-3 py-2 text-[9px] font-semibold text-white shadow-lg">
            {newMessageCount} {newMessageCount === 1 ? "nova" : "novas"}<ArrowDown size={12} />
          </button>
        {/if}
      </div>

      {#if chat.status !== "closed" && (canWrite || data.canInternalNote)}
        <footer class="shrink-0 border-t border-[#E1E4EA] bg-white p-3.5 sm:p-4">
          <div class="mx-auto max-w-[820px] overflow-hidden rounded-xl border border-[#DDE1E8] bg-white focus-within:border-[#B9C0D2] focus-within:shadow-sm">
            <div class="flex items-center gap-1 border-b border-[#ECEEF2] px-2.5 py-2">
              {#if canWrite}
                <button type="button" on:click={() => composerMode = "reply"} class={`rounded-md px-2.5 py-1.5 text-[9px] font-semibold transition ${composerMode === "reply" ? "bg-[#EEF0FF] text-[#000A57]" : "text-[#717785] hover:bg-[#F5F6F8]"}`}>Resposta</button>
              {/if}
              {#if data.canInternalNote}
                <button type="button" on:click={() => composerMode = "note"} class={`rounded-md px-2.5 py-1.5 text-[9px] font-semibold transition ${composerMode === "note" ? "bg-[#FFF0E4] text-[#9A5513]" : "text-[#717785] hover:bg-[#F5F6F8]"}`}>Nota interna</button>
              {/if}
              <span class="ml-auto text-[8px] text-[#A0A5B0]">{composerMode === "note" ? "Somente equipe F10" : "Visível ao cliente"}</span>
            </div>

            {#if composerMode === "reply" && canWrite}
              {#if chat.aiState === "active"}
                <div class="mx-3 mt-3 flex items-center gap-2 rounded-lg bg-[#F4F2FF] px-3 py-2 text-[8.5px] font-medium text-[#6255A8]"><Bot size={12} />Sua resposta assume a conversa e encerra a automação.</div>
              {/if}
              {#if errorMessage}
                <div class="mx-3 mt-3 flex items-center gap-2 rounded-lg bg-[#FFF3F3] px-3 py-2 text-[8.5px] font-medium text-[#A13C3C]"><CircleAlert size={12} />{errorMessage}</div>
              {/if}
              <form on:submit|preventDefault={() => void sendMessage()}>
                <textarea
                  bind:value={messageBody}
                  on:input={persistDraft}
                  on:keydown={handleComposerKeydown}
                  maxlength="4000"
                  rows="3"
                  placeholder="Escreva uma mensagem..."
                  class="max-h-36 min-h-[78px] w-full resize-none border-0 px-3.5 py-3 text-[10.5px] leading-5 outline-none"
                ></textarea>
                <div class="flex items-center justify-between border-t border-[#F0F1F4] px-3 py-2">
                  <span class="text-[8px] text-[#A0A5B0]">Ctrl/⌘ + Enter envia</span>
                  <button type="submit" disabled={sending || !messageBody.trim()} class="inline-flex h-8 items-center gap-1.5 rounded-lg bg-[#000A57] px-3 text-[9px] font-semibold text-white disabled:bg-[#D6D9E2]">
                    Enviar <Send size={12} />
                  </button>
                </div>
              </form>
            {:else if composerMode === "note" && data.canInternalNote}
              <form method="POST" action="?/note" class="bg-[#FFFDFC]">
                <MentionTextarea
                  users={data.mentionUsers}
                  name="body"
                  rows={3}
                  maxlength={10000}
                  placeholder="Escreva uma nota interna. Use @ para chamar alguém da equipe..."
                  className="min-h-[78px] w-full resize-none border-0 bg-transparent px-3.5 py-3 text-[10.5px] leading-5 outline-none"
                />
                <div class="flex items-center justify-between border-t border-[#F1E7DD] px-3 py-2">
                  <span class="text-[8px] text-[#9A744F]">O cliente nunca vê esta nota.</span>
                  <button type="submit" class="inline-flex h-8 items-center rounded-lg bg-[#9A5513] px-3 text-[9px] font-semibold text-white">Adicionar nota</button>
                </div>
              </form>
            {/if}
          </div>
        </footer>
      {:else if data.canRespond && chat.assignedUserId && !assignedToMe && chat.status !== "closed"}
        <footer class="shrink-0 border-t border-[#E1E4EA] bg-[#FAFAFC] px-4 py-3 text-center text-[9px] text-[#777D8D]">
          Este atendimento está atribuído a <strong>{chat.assignedUserName ?? "outro atendente"}</strong>.
        </footer>
      {/if}
    </main>

    <aside class="hidden min-h-0 overflow-y-auto border-l border-[#E4E6EC] bg-white xl:block">
      <section class="border-b border-[#ECEEF2] p-4">
        <div class="flex items-center gap-2">
          <span class="flex h-9 w-9 items-center justify-center rounded-full bg-[#F0F1F4] text-[#626978]"><UserRound size={15} /></span>
          <div class="min-w-0">
            <h2 class="truncate text-[11px] font-semibold text-[#303644]">{chat.customerName ?? "Cliente"}</h2>
            <p class="truncate text-[8.5px] text-[#9398A4]">{chat.customerEmail ?? "Sem e-mail informado"}</p>
          </div>
        </div>
        {#if chat.organizationName}<p class="mt-3 text-[9px] text-[#686F7E]">{chat.organizationName}</p>{/if}
        {#if chat.customerPhone}<p class="mt-1 text-[9px] text-[#686F7E]">{chat.customerPhone}</p>{/if}
      </section>

      {#if f10UnitName}
        <section class="border-b border-[#ECEEF2] p-4">
          <h3 class="text-[8px] font-bold uppercase tracking-[0.1em] text-[#9398A4]">Contexto F10</h3>
          <dl class="mt-3 space-y-2.5">
            <div><dt class="text-[8px] text-[#A0A5B0]">Escola / unidade</dt><dd class="mt-0.5 text-[9.5px] font-semibold text-[#454B59]">{f10UnitName}</dd></div>
            {#if f10GroupName}<div><dt class="text-[8px] text-[#A0A5B0]">Grupo</dt><dd class="mt-0.5 text-[9.5px] font-semibold text-[#454B59]">{f10GroupName}</dd></div>{/if}
            {#if f10LegacyUserId}<div><dt class="text-[8px] text-[#A0A5B0]">Usuário F10</dt><dd class="mt-0.5 truncate font-mono text-[8.5px] text-[#666D7C]">{f10LegacyUserId}</dd></div>{/if}
          </dl>
        </section>
      {/if}

      <section class="border-b border-[#ECEEF2] p-4">
        <div class="flex items-center justify-between gap-2">
          <h3 class="text-[8px] font-bold uppercase tracking-[0.1em] text-[#9398A4]">Atendimento</h3>
          <span class="text-[8px] text-[#A0A5B0]">{formatDateTime(chat.createdAt)}</span>
        </div>

        <dl class="mt-3 grid grid-cols-2 gap-2">
          <div class="rounded-lg bg-[#F7F8FA] px-2.5 py-2"><dt class="text-[7.5px] uppercase text-[#A0A5B0]">Fila</dt><dd class="mt-1 truncate text-[9px] font-semibold text-[#4A5060]">{chat.queueName}</dd></div>
          <div class="rounded-lg bg-[#F7F8FA] px-2.5 py-2"><dt class="text-[7.5px] uppercase text-[#A0A5B0]">{chat.ticketId ? "SLA" : "Chamado"}</dt><dd class={`mt-1 truncate text-[9px] font-semibold ${slaText().includes("Vencido") ? "text-[#A13C3C]" : "text-[#4A5060]"}`}>{slaText()}</dd></div>
        </dl>

        <div class="mt-3">
          <span class="text-[8px] text-[#9398A4]">Responsável</span>
          <p class="mt-0.5 text-[9.5px] font-semibold text-[#454B59]">{chat.assignedUserName ?? "Não atribuído"}</p>
          {#if data.canAssign && chat.status !== "closed"}
            <form method="POST" action="?/assign" class="mt-2 flex gap-1.5">
              <select name="assignedUserId" required class="h-8 min-w-0 flex-1 rounded-lg border border-[#DDE1E8] bg-white px-2 text-[8.5px]">
                <option value="" disabled selected={!chat.assignedUserId}>Selecionar...</option>
                {#each data.assignees as assignee}<option value={assignee.id} selected={assignee.id === chat.assignedUserId}>{assignee.name}</option>{/each}
              </select>
              <button type="submit" class="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-[#DDE1E8] text-[#000A57]" aria-label="Atribuir"><UserRoundCog size={12} /></button>
            </form>
          {/if}
        </div>
      </section>

      {#if chat.ticketId}
        <section class="border-b border-[#ECEEF2] p-4">
          <div class="flex items-center justify-between gap-2">
            <h3 class="text-[8px] font-bold uppercase tracking-[0.1em] text-[#9398A4]">Chamado #{chat.ticketNumber}</h3>
            <a href={`/app/tickets/${chat.ticketId}`} class="text-[8px] font-semibold text-[#000A57] hover:underline">Abrir</a>
          </div>

          {#if data.canManageTicket && chat.status !== "closed"}
            <form method="POST" action="?/status" class="mt-3">
              <label class="text-[8px] text-[#9398A4]">Status</label>
              <div class="mt-1 flex gap-1.5">
                <select name="status" value={chat.status} class="h-8 min-w-0 flex-1 rounded-lg border border-[#DDE1E8] bg-white px-2 text-[8.5px]"><option value="new">Novo</option><option value="open">Aberto</option><option value="in_progress">Em andamento</option><option value="waiting_customer">Aguardando cliente</option><option value="resolved">Resolvido</option></select>
                <button type="submit" class="h-8 rounded-lg bg-[#000A57] px-2.5 text-[8px] font-semibold text-white">Salvar</button>
              </div>
            </form>

            <form method="POST" action="?/priority" class="mt-2.5">
              <label class="text-[8px] text-[#9398A4]">Prioridade</label>
              <div class="mt-1 flex gap-1.5">
                <select name="priority" value={chat.priority} class="h-8 min-w-0 flex-1 rounded-lg border border-[#DDE1E8] bg-white px-2 text-[8.5px]"><option value="low">Baixa</option><option value="normal">Normal</option><option value="high">Alta</option><option value="urgent">Urgente</option></select>
                <button type="submit" class="h-8 rounded-lg bg-[#000A57] px-2.5 text-[8px] font-semibold text-white">Salvar</button>
              </div>
            </form>
          {/if}
        </section>
      {:else}
        <section class="border-b border-[#ECEEF2] p-4">
          <div class="flex items-center gap-2 text-[#000A57]"><TicketCheck size={13} /><h3 class="text-[9px] font-semibold">Conversa sem chamado</h3></div>
          <p class="mt-2 text-[8.5px] leading-4 text-[#858B99]">Atenda e converse internamente sem gerar ticket. Crie um chamado somente quando o caso precisar de acompanhamento.</p>
          {#if data.canCreateTicket && chat.status !== "closed"}
            <form method="POST" action="?/createTicket" class="mt-3" on:submit={(event) => { if (!confirm("Criar um chamado a partir desta conversa? O histórico público e as notas internas serão preservados.")) event.preventDefault(); }}>
              <button type="submit" class="inline-flex h-8 w-full items-center justify-center gap-1.5 rounded-lg bg-[#000A57] text-[8.5px] font-semibold text-white"><TicketCheck size={11} />Criar chamado</button>
            </form>
          {/if}
        </section>
      {/if}

      {#if data.canViewTasks}
        <section class="border-b border-[#ECEEF2] p-4">
          <div class="flex items-center justify-between gap-2">
            <div class="flex items-center gap-1.5"><ListTodo size={12} class="text-[#000A57]" /><h3 class="text-[8px] font-bold uppercase tracking-[0.1em] text-[#9398A4]">Tarefas</h3></div>
            <span class="rounded-full bg-[#F1F2F5] px-1.5 py-0.5 text-[8px] font-semibold text-[#717785]">{data.linkedTasks.length}</span>
          </div>

          {#if data.linkedTasks.length > 0}
            <div class="mt-2.5 space-y-1.5">
              {#each data.linkedTasks as task}
                <a href={`/app/tasks/${task.id}`} class="block rounded-lg border border-[#E7E9EF] px-2.5 py-2 transition hover:bg-[#FAFAFC]">
                  <strong class="line-clamp-1 text-[8.5px] text-[#454B59]">{task.title}</strong>
                  <span class="mt-0.5 block text-[7.5px] text-[#9A9FAC]">{task.projectName}{task.dueOn ? ` · ${task.dueOn}` : ""}</span>
                </a>
              {/each}
            </div>
          {/if}

          {#if data.canCreateTask && data.taskProjects.length > 0 && chat.status !== "closed"}
            <details class="mt-3">
              <summary class="flex cursor-pointer list-none items-center gap-1 text-[8px] font-semibold text-[#000A57]"><Plus size={10} />Criar tarefa</summary>
              <form method="POST" action="?/createTask" class="mt-2 space-y-1.5">
                <select name="projectId" required class="h-8 w-full rounded-lg border border-[#DDE1E8] bg-white px-2 text-[8px]">{#each data.taskProjects as project}<option value={project.id}>{project.name}</option>{/each}</select>
                <input name="title" required maxlength="180" value={`Chamado #${chat.ticketNumber} · ${chat.subject}`.slice(0, 180)} class="h-8 w-full rounded-lg border border-[#DDE1E8] px-2 text-[8px]" />
                <textarea name="description" rows="2" maxlength="5000" placeholder="O que precisa ser feito?" class="w-full rounded-lg border border-[#DDE1E8] px-2 py-2 text-[8px]"></textarea>
                <div class="grid grid-cols-2 gap-1.5"><select name="priority" class="h-8 rounded-lg border border-[#DDE1E8] bg-white px-2 text-[8px]"><option value="normal">Normal</option><option value="low">Baixa</option><option value="high">Alta</option><option value="urgent">Urgente</option></select><input name="dueOn" type="date" class="h-8 rounded-lg border border-[#DDE1E8] px-2 text-[8px]" /></div>
                <button type="submit" class="h-8 w-full rounded-lg bg-[#000A57] text-[8px] font-semibold text-white">Criar tarefa</button>
              </form>
            </details>
          {/if}
        </section>
      {/if}

      {#if chat.ticketId}
        <section class="p-4">
          <div class="flex items-center gap-1.5"><MonitorCog size={12} class="text-[#000A57]" /><h3 class="text-[8px] font-bold uppercase tracking-[0.1em] text-[#9398A4]">Acesso remoto</h3></div>
          {#if onlineRemoteDevices.length > 0}
            <p class="mt-2 text-[8.5px] font-medium text-[#398155]">{onlineRemoteDevices.length} {onlineRemoteDevices.length === 1 ? "computador online" : "computadores online"}</p>
          {:else if data.remoteDevices.length > 0}
            <p class="mt-2 text-[8.5px] text-[#858B99]">Computadores vinculados estão offline.</p>
          {:else}
            <p class="mt-2 text-[8.5px] text-[#858B99]">Nenhum computador vinculado.</p>
          {/if}

          <div class="mt-2 flex flex-col gap-1.5">
            {#if onlineRemoteDevices.length === 1 && data.canUseRemote}
              <form method="POST" action="?/startRemote"><input type="hidden" name="deviceId" value={onlineRemoteDevices[0].id} /><button type="submit" class="inline-flex h-8 w-full items-center justify-center gap-1.5 rounded-lg bg-[#000A57] text-[8px] font-semibold text-white"><MonitorCog size={10} />Iniciar acesso remoto</button></form>
            {:else if data.canRequestRemote && data.remoteDevices.length === 0}
              <form method="POST" action="?/enrollRemote"><button type="submit" class="inline-flex h-8 w-full items-center justify-center gap-1.5 rounded-lg border border-[#DDE1E8] text-[8px] font-semibold text-[#000A57]"><Download size={10} />Instalar suporte remoto</button></form>
            {/if}
            {#if data.canRequestRemote}
              <a href={`/app/tickets/${chat.ticketId}/remote`} class="inline-flex h-8 w-full items-center justify-center rounded-lg border border-[#DDE1E8] text-[8px] font-semibold text-[#000A57]">Gerenciar computadores</a>
            {/if}
          </div>
        </section>
      {/if}
    </aside>
  </div>
</ApplicationContent>
