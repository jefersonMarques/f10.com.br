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
  import MentionTextarea from "$lib/components/operations/MentionTextarea.svelte";
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
  $: f10GroupName = chatContextValue("groupName");
  $: f10UnitName = chatContextValue("unitName");
  $: f10LegacyUserId = chatContextValue("legacyUserId");

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
    escalated: "Aguardando humano",
    human: "Atendimento humano",
    disabled: "Automação desativada",
  };

  function chatContextValue(key: string): string {
    const value = chat.contextData;
    if (!value || typeof value !== "object" || Array.isArray(value)) return "";
    const field = (value as Record<string, unknown>)[key];
    if (typeof field === "string") return field.trim();
    if (typeof field === "number") return String(field);
    return "";
  }

  function formatTime(value: string | Date): string {
    return new Intl.DateTimeFormat("pt-BR", { hour: "2-digit", minute: "2-digit" }).format(new Date(value));
  }

  function formatDateTime(value: string | Date): string {
    return new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" }).format(new Date(value));
  }

  function messageAuthor(message: ChatMessage): string {
    if (message.authorType === "customer") return chat.customerName ?? "Cliente";
    if (message.authorType === "system") return "Automação F10";
    return message.authorUserName ?? "Equipe F10";
  }

  function slaText(): string {
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

      const payload = (await response.json()) as { messages?: ChatMessage[]; chat?: ChatDetails };
      const nextMessages = payload.messages ?? [];
      const changed = nextMessages.length !== previousLength || nextMessages.at(-1)?.id !== previousLastId || nextMessages.some((message, index) => message.attachments?.length !== messages[index]?.attachments?.length);
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

<svelte:head><title>Chat #{chat.ticketNumber} | F10 Operations</title></svelte:head>

<div class="mx-auto flex min-h-[calc(100dvh-78px)] max-w-[1500px] flex-col px-5 py-5 sm:px-8">
  <div class="flex shrink-0 flex-col justify-between gap-4 pb-5 xl:flex-row xl:items-center">
    <div class="flex min-w-0 items-center gap-3">
      <a href="/app/chat" class="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-[#606676] shadow-sm transition hover:text-[#000A57]" aria-label="Voltar para conversas"><ArrowLeft size={18}/></a>
      <span class="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#EEF0FF] text-[#000A57]"><UserRound size={20}/></span>
      <div class="min-w-0">
        <div class="flex flex-wrap items-center gap-2">
          <h1 class="truncate text-[16px] font-semibold text-[#222838]">{chat.customerName ?? "Cliente"}</h1>
          <span class="text-[9px] font-bold text-[#EA6D0B]">#{chat.ticketNumber}</span>
          <span class="rounded-full bg-[#EEF0FF] px-2 py-1 text-[8px] font-bold text-[#000A57]">{statusLabels[chat.status]}</span>
          <span class="rounded-full bg-[#F3F4F7] px-2 py-1 text-[8px] font-bold text-[#777D8D]">{priorityLabels[chat.priority]}</span>
          <span class={`rounded-full px-2 py-1 text-[8px] font-bold ${chat.aiState === "active" ? "bg-[#F0EEFF] text-[#5142A6]" : chat.aiState === "escalated" ? "bg-[#FFF0F0] text-[#9B3C3C]" : "bg-[#F3F4F7] text-[#777D8D]"}`}>{aiLabels[chat.aiState]}</span>
        </div>
        {#if f10UnitName}
          <p class="mt-1 truncate text-[10px] font-medium text-[#666D7C]">{f10UnitName}{f10GroupName ? ` · ${f10GroupName}` : ""}</p>
        {:else}
          <p class="mt-1 truncate text-[10px] text-[#898E9B]">{chat.organizationName ?? chat.customerEmail ?? "Chat do site"}</p>
        {/if}
        {#if chat.aiHandoffReason && chat.aiState === "escalated"}<p class="mt-1 line-clamp-1 text-[9px] text-[#9A6464]">{chat.aiHandoffReason}</p>{/if}
      </div>
    </div>

    <div class="flex flex-wrap items-center gap-2">
      {#if data.canRespond && !chat.assignedUserId && chat.status !== "closed"}
        <form method="POST" action="?/claim"><button type="submit" class="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl bg-[#176B35] px-3 text-[10px] font-semibold text-white"><Hand size={14}/>Pegar atendimento</button></form>
      {/if}

      {#if chat.contextUrl}<a href={chat.contextUrl} target="_blank" rel="noopener noreferrer" class="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-[#DDE1EA] bg-white px-3 text-[10px] font-semibold text-[#666C7B]">Página de origem<ExternalLink size={13}/></a>{/if}
      <a href="/app/help" target="_blank" rel="noopener noreferrer" class="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-[#DDE1EA] bg-white px-3 text-[10px] font-semibold text-[#000A57]"><BookOpen size={14}/>Base de conhecimento</a>

      {#if data.remoteReady}
        {#if onlineRemoteDevices.length === 1 && data.canUseRemote}
          <form method="POST" action="?/startRemote"><input type="hidden" name="deviceId" value={onlineRemoteDevices[0].id}/><button type="submit" class="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-[#DDE1EA] bg-white px-3 text-[10px] font-semibold text-[#000A57]"><MonitorCog size={14}/>Iniciar acesso remoto</button></form>
        {:else if onlineRemoteDevices.length > 0 && data.canRequestRemote}
          <a href={`/app/tickets/${chat.ticketId}/remote`} class="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-[#DDE1EA] bg-white px-3 text-[10px] font-semibold text-[#000A57]"><MonitorCog size={14}/>Escolher computador</a>
        {:else if data.remoteDevices.length === 0 && data.canRequestRemote}
          <form method="POST" action="?/enrollRemote"><button type="submit" class="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-[#DDE1EA] bg-white px-3 text-[10px] font-semibold text-[#000A57]"><Download size={14}/>Instalar suporte remoto</button></form>
        {:else if data.remoteDevices.length > 0 && data.canRequestRemote}
          <a href={`/app/tickets/${chat.ticketId}/remote`} class="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-[#E4E6EC] bg-[#F7F8FA] px-3 text-[10px] font-semibold text-[#777D8D]"><MonitorCog size={14}/>Computador offline</a>
        {/if}
      {:else if data.canRequestRemote}
        <a href={`/app/tickets/${chat.ticketId}/remote`} class="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-[#DDE1EA] bg-white px-3 text-[10px] font-semibold text-[#777D8D]"><MonitorCog size={14}/>Acesso remoto</a>
      {/if}

      <a href={`/app/tickets/${chat.ticketId}`} class="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl bg-[#000A57] px-3 text-[10px] font-semibold text-white">Abrir ticket<TicketCheck size={14}/></a>
    </div>
  </div>

  {#if form?.message}
    <div class={`mb-4 flex shrink-0 items-center gap-2 rounded-xl px-4 py-3 text-[10px] font-medium ${form.success ? "bg-[#EEF8F1] text-[#2F7045]" : "bg-[#FFF0F0] text-[#9B3C3C]"}`}>
      {#if form.success}<CheckCircle2 size={14}/>{:else}<CircleAlert size={14}/>{/if}{form.message}
    </div>
  {/if}

  <div class="grid min-h-0 flex-1 gap-5 xl:grid-cols-[minmax(0,1fr)_330px]">
    <section class="flex min-h-[640px] flex-col overflow-hidden rounded-[24px] border border-[#E2E5ED] bg-white shadow-[0_14px_40px_rgba(1,13,40,0.05)] xl:min-h-0">
      <header class="flex shrink-0 items-center justify-between border-b border-[#EEF0F5] px-5 py-3.5">
        <div class="flex items-center gap-2"><MessageCircleMore size={16} class="text-[#000A57]"/><span class="text-[11px] font-semibold text-[#444A59]">Conversa em tempo real</span></div>
        <span class="text-[9px] text-[#989DAA]">{chat.assignedUserName ? `Atendendo: ${chat.assignedUserName}` : chat.aiState === "active" ? "Automação F10" : "Aguardando atendente"}</span>
      </header>

      <div class="relative min-h-0 flex-1">
        <div bind:this={messagesElement} on:scroll={handleMessagesScroll} class="h-full overflow-y-auto bg-[#F8F9FB] px-4 py-5 sm:px-6">
          <div class="mx-auto max-w-[860px] space-y-3">
            {#each messages as message (message.id)}
              {#if message.visibility === "internal"}
                <div class="flex justify-center">
                  <article class="w-full max-w-[88%] rounded-2xl border border-[#E9D6C1] bg-[#FFF9F3] px-4 py-3 text-[#6F4B29] shadow-sm">
                    <div class="mb-2 flex items-center justify-between gap-3"><span class="text-[8px] font-bold uppercase tracking-[0.08em] text-[#9A5513]">Nota interna · {messageAuthor(message)}</span><span class="text-[8px] text-[#AC8B6A]">{formatTime(message.createdAt)}</span></div>
                    <p class="whitespace-pre-wrap text-[12px] leading-5">{message.body}</p>
                  </article>
                </div>
              {:else}
                <div class={`flex ${message.authorType === "customer" ? "justify-start" : "justify-end"}`}>
                  <article class={`max-w-[82%] rounded-2xl px-4 py-3 shadow-sm ${message.authorType === "customer" ? "rounded-bl-md border border-[#E0E3EA] bg-white text-[#565C6B]" : message.authorType === "system" ? "rounded-br-md border border-[#D9D4F5] bg-[#F2F0FF] text-[#403878]" : "rounded-br-md bg-[#000A57] text-white"}`}>
                    {#if message.authorType === "system"}<div class="mb-2 flex items-center gap-1.5 text-[8px] font-bold uppercase tracking-[0.08em] text-[#6255A8]"><Bot size={12}/>Automação F10</div>{/if}
                    {#if message.attachments && message.attachments.length > 0}
                      <div class={`mb-2 grid gap-2 ${message.attachments.length > 1 ? "grid-cols-2" : "grid-cols-1"}`}>
                        {#each message.attachments as attachment}
                          <a href={attachment.url} target="_blank" rel="noopener noreferrer" class="block overflow-hidden rounded-xl border border-black/5 bg-[#F2F3F6]">
                            <img src={attachment.url} alt={attachment.originalName} class="max-h-[320px] w-full object-contain"/>
                          </a>
                        {/each}
                      </div>
                    {/if}
                    {#if message.body}<p class="whitespace-pre-wrap text-[12px] leading-5">{message.body}</p>{/if}
                    <div class={`mt-2 flex items-center gap-2 text-[8px] ${message.authorType === "customer" ? "text-[#9A9FAC]" : message.authorType === "system" ? "text-[#8178B5]" : "text-white/60"}`}><span>{messageAuthor(message)}</span><span>·</span><span>{formatTime(message.createdAt)}</span></div>
                  </article>
                </div>
              {/if}
            {/each}
          </div>
        </div>

        {#if newMessageCount > 0}
          <button type="button" on:click={() => void scrollToLatest()} class="absolute bottom-4 left-1/2 inline-flex -translate-x-1/2 items-center gap-2 rounded-full bg-[#000A57] px-4 py-2 text-[10px] font-semibold text-white shadow-lg">
            {newMessageCount} {newMessageCount === 1 ? "nova mensagem" : "novas mensagens"}<ArrowDown size={14}/>
          </button>
        {/if}
      </div>

      {#if chat.status !== "closed" && (canWrite || data.canManageTicket)}
        <footer class="shrink-0 border-t border-[#E6E8EE] bg-white p-4 sm:p-5">
          <div class="mx-auto max-w-[860px]">
            <div class="mb-3 flex items-center gap-2">
              {#if canWrite}<button type="button" on:click={() => composerMode = "reply"} class={`rounded-full px-3 py-1.5 text-[9px] font-semibold ${composerMode === "reply" ? "bg-[#000A57] text-white" : "bg-[#F2F3F6] text-[#6D7382]"}`}>Resposta ao cliente</button>{/if}
              {#if data.canManageTicket}<button type="button" on:click={() => composerMode = "note"} class={`rounded-full px-3 py-1.5 text-[9px] font-semibold ${composerMode === "note" ? "bg-[#9A5513] text-white" : "bg-[#FFF3E7] text-[#8B4D12]"}`}>Nota interna</button>{/if}
            </div>

            {#if composerMode === "reply" && canWrite}
              {#if chat.aiState === "active"}<div class="mb-3 flex items-center gap-2 rounded-xl bg-[#F4F2FF] px-3 py-2 text-[9px] font-medium text-[#6255A8]"><Bot size={14}/>Sua primeira resposta assume a conversa e interrompe a automação nesta sessão.</div>{/if}
              {#if errorMessage}<div class="mb-3 flex items-center gap-2 rounded-xl bg-[#FFF3F3] px-3 py-2 text-[10px] font-medium text-[#A13C3C]"><CircleAlert size={14}/>{errorMessage}</div>{/if}
              <form on:submit|preventDefault={() => void sendMessage()} class="flex items-end gap-3">
                <label class="min-w-0 flex-1"><span class="sr-only">Mensagem</span><textarea bind:value={messageBody} on:input={persistDraft} on:keydown={handleComposerKeydown} maxlength="4000" rows="2" placeholder="Escreva uma mensagem..." class="max-h-32 min-h-[52px] w-full resize-none rounded-2xl border border-[#DDE1EA] px-4 py-3 text-[12px] leading-5 outline-none focus:border-[#000A57] focus:ring-2 focus:ring-[#000A57]/10"></textarea></label>
                <button type="submit" disabled={sending || !messageBody.trim()} class="inline-flex h-[52px] w-[52px] shrink-0 items-center justify-center rounded-2xl bg-[#000A57] text-white transition hover:bg-[#111B71] disabled:bg-[#D6D9E2]" aria-label="Enviar mensagem"><Send size={18}/></button>
              </form>
              <div class="mt-2 flex items-center justify-between gap-3 text-[8px] text-[#999EAA]"><span>Ctrl/⌘ + Enter envia · Enter cria nova linha</span><a href="/app/help" target="_blank" rel="noopener noreferrer" class="font-semibold text-[#000A57] hover:underline">Consultar base de conhecimento</a></div>
            {:else if composerMode === "note" && data.canManageTicket}
              <form method="POST" action="?/note" class="rounded-2xl border border-[#F1D7BD] bg-[#FFF9F3] p-3">
                <MentionTextarea users={data.mentionUsers} name="body" rows={3} maxlength={10000} placeholder="Ex.: @jeferson pode verificar este caso?" className="w-full resize-y rounded-xl border border-[#E9D6C1] bg-white px-3 py-3 text-[12px] leading-5 outline-none focus:border-[#C46C17]" />
                <div class="mt-2 flex items-center justify-between gap-3"><span class="text-[8px] text-[#9A744F]">Use @ para mencionar. O cliente nunca vê esta nota.</span><button type="submit" class="min-h-9 rounded-xl bg-[#9A5513] px-4 text-[10px] font-semibold text-white">Adicionar nota</button></div>
              </form>
            {/if}
          </div>
        </footer>
      {:else if data.canRespond && chat.assignedUserId && !assignedToMe && chat.status !== "closed"}
        <footer class="shrink-0 border-t border-[#E6E8EE] bg-[#FAFAFC] px-5 py-4 text-center text-[10px] text-[#777D8D]">Este atendimento está atribuído a <strong>{chat.assignedUserName ?? "outro atendente"}</strong>. Reatribua antes de responder.</footer>
      {/if}
    </section>

    <aside class="space-y-4 xl:overflow-y-auto xl:pr-1">
      <section class="rounded-[22px] border border-[#E2E5ED] bg-white p-5">
        <div class="flex items-center gap-2"><UserRound size={16} class="text-[#000A57]"/><h2 class="text-[12px] font-semibold text-[#333948]">Cliente</h2></div>
        <p class="mt-4 text-[12px] font-semibold text-[#303645]">{chat.customerName ?? "Cliente"}</p>
        {#if chat.organizationName}<p class="mt-1 text-[10px] text-[#747B8D]">{chat.organizationName}</p>{/if}
        {#if chat.customerEmail}<p class="mt-3 break-all text-[10px] text-[#5E6575]">{chat.customerEmail}</p>{/if}
        {#if chat.customerPhone}<p class="mt-1 text-[10px] text-[#5E6575]">{chat.customerPhone}</p>{/if}
        {#if f10UnitName}
          <div class="mt-4 rounded-2xl border border-[#DDE3EC] bg-[#F7F9FC] p-3">
            <span class="block text-[8px] font-bold uppercase tracking-[0.1em] text-[#808797]">Contexto F10 autenticado</span>
            <div class="mt-2 grid gap-2">
              <div><span class="block text-[8px] text-[#969CAA]">Escola / unidade</span><strong class="mt-0.5 block text-[10px] text-[#3F4656]">{f10UnitName}</strong></div>
              {#if f10GroupName}<div><span class="block text-[8px] text-[#969CAA]">Grupo</span><strong class="mt-0.5 block text-[10px] text-[#3F4656]">{f10GroupName}</strong></div>{/if}
              {#if f10LegacyUserId}<div><span class="block text-[8px] text-[#969CAA]">Usuário F10</span><strong class="mt-0.5 block font-mono text-[9px] text-[#5C6372]">{f10LegacyUserId}</strong></div>{/if}
            </div>
          </div>
        {/if}
        <p class="mt-3 text-[9px] text-[#9A9FAC]">Conversa iniciada em {formatDateTime(chat.createdAt)}</p>
      </section>

      <section class="rounded-[22px] border border-[#E2E5ED] bg-white p-5">
        <div class="flex items-center gap-2"><Clock3 size={16} class="text-[#000A57]"/><h2 class="text-[12px] font-semibold text-[#333948]">Atendimento</h2></div>
        <div class="mt-4 grid grid-cols-2 gap-2">
          <div class="rounded-xl bg-[#F7F8FA] px-3 py-2"><span class="block text-[8px] uppercase tracking-[0.06em] text-[#999EAA]">Fila</span><strong class="mt-1 block text-[10px] text-[#4A5060]">{chat.queueName}</strong></div>
          <div class="rounded-xl bg-[#F7F8FA] px-3 py-2"><span class="block text-[8px] uppercase tracking-[0.06em] text-[#999EAA]">SLA</span><strong class={`mt-1 block text-[10px] ${slaText().includes("Vencido") ? "text-[#A13C3C]" : "text-[#4A5060]"}`}>{slaText()}</strong></div>
        </div>

        {#if data.canManageTicket && chat.status !== "closed"}
          <form method="POST" action="?/status" class="mt-4"><label class="block"><span class="mb-1.5 block text-[9px] font-semibold text-[#666C7B]">Status</span><div class="flex gap-2"><select name="status" value={chat.status} class="h-10 min-w-0 flex-1 rounded-xl border border-[#DDE1EA] bg-white px-2 text-[10px]"><option value="new">Novo</option><option value="open">Aberto</option><option value="in_progress">Em andamento</option><option value="waiting_customer">Aguardando cliente</option><option value="resolved">Resolvido</option><option value="closed">Fechado</option></select><button type="submit" class="h-10 rounded-xl bg-[#000A57] px-3 text-[9px] font-semibold text-white">Salvar</button></div></label></form>
          <form method="POST" action="?/priority" class="mt-3"><label class="block"><span class="mb-1.5 block text-[9px] font-semibold text-[#666C7B]">Prioridade</span><div class="flex gap-2"><select name="priority" value={chat.priority} class="h-10 min-w-0 flex-1 rounded-xl border border-[#DDE1EA] bg-white px-2 text-[10px]"><option value="low">Baixa</option><option value="normal">Normal</option><option value="high">Alta</option><option value="urgent">Urgente</option></select><button type="submit" class="h-10 rounded-xl bg-[#000A57] px-3 text-[9px] font-semibold text-white">Salvar</button></div></label></form>
        {/if}

        <div class="mt-4 border-t border-[#EEF0F5] pt-4">
          <span class="text-[9px] font-semibold text-[#666C7B]">Responsável</span>
          <p class="mt-1 text-[10px] font-medium text-[#414756]">{chat.assignedUserName ?? "Não atribuído"}</p>
          {#if data.canAssign && chat.status !== "closed"}
            <form method="POST" action="?/assign" class="mt-2 flex gap-2"><select name="assignedUserId" required class="h-10 min-w-0 flex-1 rounded-xl border border-[#DDE1EA] bg-white px-2 text-[10px]"><option value="" disabled selected={!chat.assignedUserId}>Selecionar...</option>{#each data.assignees as assignee}<option value={assignee.id} selected={assignee.id === chat.assignedUserId}>{assignee.name}</option>{/each}</select><button type="submit" class="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-[#DDE1EA] bg-white text-[#000A57]" aria-label="Atribuir"><UserRoundCog size={15}/></button></form>
          {/if}
        </div>
      </section>

      {#if data.canViewTasks}
        <section class="rounded-[22px] border border-[#E2E5ED] bg-white p-5">
          <div class="flex items-center justify-between gap-3"><div class="flex items-center gap-2"><ListTodo size={16} class="text-[#000A57]"/><h2 class="text-[12px] font-semibold text-[#333948]">Tarefas</h2></div><span class="rounded-full bg-[#F3F4F7] px-2 py-1 text-[8px] font-bold text-[#676D7D]">{data.linkedTasks.length}</span></div>
          {#if data.linkedTasks.length > 0}
            <div class="mt-3 space-y-2">{#each data.linkedTasks as task}<a href={`/app/tasks/${task.id}`} class="block rounded-xl border border-[#E7E9EF] bg-[#FAFAFC] px-3 py-3 transition hover:border-[#C9CFE6]"><div class="flex items-start justify-between gap-2"><strong class="text-[9px] leading-4 text-[#3D4454]">{task.title}</strong><span class={`shrink-0 rounded-full px-2 py-1 text-[7px] font-bold ${task.statusClosed ? "bg-[#EEF8F1] text-[#2F7045]" : "bg-[#EEF0FF] text-[#000A57]"}`}>{task.statusName}</span></div><p class="mt-1 text-[8px] text-[#8A909E]">{task.projectName}{task.dueOn ? ` · ${task.dueOn}` : ""}</p></a>{/each}</div>
          {:else}<p class="mt-3 text-[9px] leading-4 text-[#858B99]">Nenhuma tarefa vinculada a este atendimento.</p>{/if}

          {#if data.canCreateTask && data.taskProjects.length > 0 && chat.status !== "closed"}
            <details class="mt-4 border-t border-[#EEF0F5] pt-4"><summary class="flex cursor-pointer list-none items-center gap-2 text-[9px] font-semibold text-[#000A57]"><Plus size={13}/>Criar tarefa vinculada</summary><form method="POST" action="?/createTask" class="mt-3 space-y-2"><select name="projectId" required class="h-9 w-full rounded-xl border border-[#DDE1EA] bg-white px-2 text-[9px]">{#each data.taskProjects as project}<option value={project.id}>{project.name}</option>{/each}</select><input name="title" required maxlength="180" value={`Ticket #${chat.ticketNumber} · ${chat.subject}`.slice(0, 180)} class="h-9 w-full rounded-xl border border-[#DDE1EA] px-2 text-[9px]"/><textarea name="description" rows="3" maxlength="5000" placeholder="O que precisa ser feito?" class="w-full rounded-xl border border-[#DDE1EA] px-2 py-2 text-[9px]"></textarea><div class="grid grid-cols-2 gap-2"><select name="priority" class="h-9 rounded-xl border border-[#DDE1EA] bg-white px-2 text-[9px]"><option value="normal">Normal</option><option value="low">Baixa</option><option value="high">Alta</option><option value="urgent">Urgente</option></select><input name="dueOn" type="date" class="h-9 rounded-xl border border-[#DDE1EA] px-2 text-[9px]"/></div><button type="submit" class="min-h-9 w-full rounded-xl bg-[#000A57] px-3 text-[9px] font-semibold text-white">Criar tarefa</button></form></details>
          {/if}
        </section>
      {/if}

      <section class="rounded-[22px] border border-[#E2E5ED] bg-white p-5">
        <div class="flex items-center gap-2"><MonitorCog size={16} class="text-[#000A57]"/><h2 class="text-[12px] font-semibold text-[#333948]">Acesso remoto</h2></div>
        {#if onlineRemoteDevices.length > 0}<p class="mt-3 text-[9px] text-[#398155]">{onlineRemoteDevices.length} {onlineRemoteDevices.length === 1 ? "computador online" : "computadores online"}</p>{:else if data.remoteDevices.length > 0}<p class="mt-3 text-[9px] text-[#858B99]">Computadores vinculados estão offline.</p>{:else}<p class="mt-3 text-[9px] text-[#858B99]">Nenhum computador vinculado a este cliente.</p>{/if}
        {#if data.canRequestRemote}<a href={`/app/tickets/${chat.ticketId}/remote`} class="mt-3 inline-flex min-h-9 w-full items-center justify-center rounded-xl border border-[#DDE1EA] text-[9px] font-semibold text-[#000A57]">Gerenciar acesso remoto</a>{/if}
      </section>
    </aside>
  </div>
</div>
