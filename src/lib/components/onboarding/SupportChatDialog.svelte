<script lang="ts">
  import { browser } from "$app/environment";
  import { onDestroy, tick } from "svelte";
  import { ArrowDown, LifeBuoy, LoaderCircle, Send, X } from "lucide-svelte";

  export let isOpen = false;
  export let onClose: () => void = () => undefined;

  type ChatSession = {
    sessionId: string;
    token: string;
    ticketNumber: number;
    expiresAt: string;
    aiState: "active" | "escalated" | "human" | "disabled";
  };

  type ChatMessage = {
    id: string;
    authorType: "customer" | "user" | "system";
    authorUserId?: string | null;
    authorUserName?: string | null;
    authorOnline?: boolean;
    avatarUrl?: string | null;
    body: string;
    createdAt: string;
  };

  type SupportStatus = {
    supportDisplayName: string;
    hoursConfigured: boolean;
    isOpen: boolean | null;
    nextOpenLabel: string | null;
    onlineAgents: number | null;
    averageWaitMinutes: number | null;
    waitSampleCount: number;
  };

  const STORAGE_KEY = "f10-support-chat-session-v1";
  const DRAFT_KEY = "f10-support-chat-draft-v1";
  const BOTTOM_THRESHOLD = 120;

  let dialogElement: HTMLDialogElement;
  let closeButtonElement: HTMLButtonElement;
  let messagesElement: HTMLDivElement;
  let previouslyFocusedElement: HTMLElement | null = null;
  let restored = false;
  let pollingSessionId = "";
  let pollTimer: ReturnType<typeof setInterval> | null = null;
  let statusTimer: ReturnType<typeof setInterval> | null = null;
  let statusPollingActive = false;

  let name = "";
  let email = "";
  let phone = "";
  let initialMessage = "";
  let reply = "";
  let session: ChatSession | null = null;
  let messages: ChatMessage[] = [];
  let status: SupportStatus | null = null;
  let starting = false;
  let sending = false;
  let loadingMessages = false;
  let errorMessage = "";
  let newMessageCount = 0;

  $: if (browser && dialogElement) syncDialogState(isOpen);
  $: if (browser && isOpen && !restored) restoreStoredState();
  $: if (browser) syncPolling(isOpen, session?.sessionId ?? "");
  $: if (browser) syncStatusPolling(isOpen);
  $: if (browser && restored) persistDraft(reply);

  function syncDialogState(shouldOpen: boolean): void {
    if (shouldOpen && !dialogElement.open) {
      previouslyFocusedElement = document.activeElement as HTMLElement | null;
      dialogElement.showModal();
      window.requestAnimationFrame(() => closeButtonElement?.focus());
      return;
    }

    if (!shouldOpen && dialogElement.open) dialogElement.close();
  }

  function restoreStoredState(): void {
    restored = true;
    reply = window.sessionStorage.getItem(DRAFT_KEY) ?? "";
    const raw = window.sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return;

    try {
      const stored = JSON.parse(raw) as ChatSession;
      if (
        typeof stored.sessionId !== "string" ||
        typeof stored.token !== "string" ||
        !stored.expiresAt ||
        new Date(stored.expiresAt).getTime() <= Date.now()
      ) {
        clearStoredSession();
        return;
      }
      session = stored;
      void refreshMessages(true);
    } catch {
      clearStoredSession();
    }
  }

  function persistSession(value: ChatSession): void {
    if (!browser) return;
    window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(value));
  }

  function persistDraft(value: string): void {
    if (!browser) return;
    if (value) window.sessionStorage.setItem(DRAFT_KEY, value);
    else window.sessionStorage.removeItem(DRAFT_KEY);
  }

  function clearStoredSession(): void {
    if (browser) window.sessionStorage.removeItem(STORAGE_KEY);
    session = null;
    messages = [];
    newMessageCount = 0;
  }

  function syncPolling(shouldPoll: boolean, sessionId: string): void {
    const desiredSessionId = shouldPoll ? sessionId : "";
    if (desiredSessionId === pollingSessionId) return;

    if (pollTimer) {
      clearInterval(pollTimer);
      pollTimer = null;
    }

    pollingSessionId = desiredSessionId;
    if (!desiredSessionId) return;

    void refreshMessages(true);
    pollTimer = setInterval(() => void refreshMessages(false), 4_000);
  }

  function syncStatusPolling(shouldPoll: boolean): void {
    if (shouldPoll === statusPollingActive) return;
    statusPollingActive = shouldPoll;

    if (statusTimer) {
      clearInterval(statusTimer);
      statusTimer = null;
    }

    if (!shouldPoll) return;
    void refreshStatus();
    statusTimer = setInterval(() => void refreshStatus(), 60_000);
  }

  async function refreshStatus(): Promise<void> {
    try {
      const response = await fetch("/api/support/chat/status", { cache: "no-store" });
      if (response.ok) status = await response.json() as SupportStatus;
    } catch {
      // O chat continua funcional mesmo se o indicador de disponibilidade falhar.
    }
  }

  function handleDialogClose(): void {
    if (isOpen) onClose();
    previouslyFocusedElement?.focus();
    previouslyFocusedElement = null;
  }

  function handleDialogCancel(event: Event): void {
    event.preventDefault();
    onClose();
  }

  function handleBackdropClick(event: MouseEvent): void {
    if (event.target === event.currentTarget) onClose();
  }

  function hideBrokenImage(event: Event): void {
    const image = event.currentTarget as HTMLImageElement;
    image.style.display = "none";
  }

  function initials(value: string): string {
    return value
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase() ?? "")
      .join("") || "F10";
  }

  function availabilityText(): string {
    if (!status) return "Atendimento F10";
    if (status.isOpen === false) {
      return status.nextOpenLabel
        ? `Fora do horário · volta ${status.nextOpenLabel.toLowerCase()}`
        : "Fora do horário de atendimento";
    }
    if ((status.onlineAgents ?? 0) > 0) {
      return `${status.onlineAgents} ${status.onlineAgents === 1 ? "atendente online" : "atendentes online"}`;
    }
    if (status.isOpen === true) return "Dentro do horário de atendimento";
    return "Atendimento F10";
  }

  function waitText(): string {
    if (!status?.averageWaitMinutes) return "Tempo de espera ainda sem amostra suficiente";
    return `Tempo médio de primeira resposta: ~${status.averageWaitMinutes} min`;
  }

  function sessionStatusText(): string {
    if (!session) return availabilityText();
    if (session.aiState === "escalated") {
      const online = (status?.onlineAgents ?? 0) > 0 ? ` · ${status?.onlineAgents} online` : "";
      const wait = status?.averageWaitMinutes ? ` · média ~${status.averageWaitMinutes} min` : "";
      return `Aguardando a equipe F10${online}${wait}`;
    }
    if (session.aiState === "human") return "Equipe F10 atendendo";
    if (session.aiState === "active") return "Atendimento F10";
    return availabilityText();
  }

  function apiErrorMessage(error: string, diagnosticCode = ""): string {
    if (error === "RATE_LIMITED") return "Muitas tentativas em pouco tempo. Aguarde alguns minutos e tente novamente.";
    if (error === "INVALID_SESSION") return "Este atendimento expirou. Inicie uma nova conversa.";
    if (error === "CHAT_CLOSED") return "Este atendimento foi encerrado. Inicie uma nova conversa se ainda precisar de ajuda.";
    if (error === "INVALID_NAME") return "Informe seu nome para iniciar o atendimento.";
    if (error === "INVALID_CONTACT") return "Revise o e-mail ou telefone informado.";
    if (error === "INVALID_MESSAGE") return "Escreva uma mensagem antes de enviar.";
    if (error === "CHAT_UNAVAILABLE") {
      return diagnosticCode
        ? `O chat F10 ainda não está pronto neste ambiente (${diagnosticCode}).`
        : "O chat F10 está temporariamente indisponível.";
    }
    return "Não foi possível concluir a operação no chat.";
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

  async function startChat(): Promise<void> {
    errorMessage = "";
    starting = true;

    try {
      const response = await fetch("/api/support/chat/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim(),
          phone: phone.trim(),
          message: initialMessage.trim(),
          contextUrl: browser ? window.location.href : "",
          pageTitle: browser ? document.title : "",
          helpContext: "Central de Ajuda F10",
        }),
      });
      const payload = await response.json() as Record<string, unknown>;

      if (!response.ok) {
        errorMessage = apiErrorMessage(
          typeof payload.error === "string" ? payload.error : "",
          typeof payload.diagnosticCode === "string" ? payload.diagnosticCode : "",
        );
        return;
      }

      const nextSession: ChatSession = {
        sessionId: String(payload.sessionId ?? ""),
        token: String(payload.token ?? ""),
        ticketNumber: Number(payload.ticketNumber ?? 0),
        expiresAt: String(payload.expiresAt ?? ""),
        aiState: (payload.aiState ?? "disabled") as ChatSession["aiState"],
      };

      if (!nextSession.sessionId || !nextSession.token || !nextSession.expiresAt) {
        errorMessage = "O servidor iniciou o atendimento, mas não retornou uma sessão válida.";
        return;
      }

      session = nextSession;
      persistSession(nextSession);
      initialMessage = "";
      await refreshMessages(true);
    } catch {
      errorMessage = "Não foi possível conectar ao chat F10. Verifique sua conexão e tente novamente.";
    } finally {
      starting = false;
    }
  }

  async function refreshMessages(forceScroll: boolean): Promise<void> {
    if (!session || loadingMessages) return;
    loadingMessages = true;
    const wasNearBottom = isNearBottom();
    const previousLastId = messages.at(-1)?.id;

    try {
      const response = await fetch(`/api/support/chat/${encodeURIComponent(session.sessionId)}/messages`, {
        headers: { Authorization: `Bearer ${session.token}` },
        cache: "no-store",
      });
      const payload = await response.json() as Record<string, unknown>;

      if (response.status === 401) {
        clearStoredSession();
        errorMessage = "Este atendimento expirou. Inicie uma nova conversa.";
        return;
      }

      if (!response.ok) return;
      const nextMessages = Array.isArray(payload.messages) ? payload.messages as ChatMessage[] : [];
      const nextLastId = nextMessages.at(-1)?.id;
      const changed = nextMessages.length !== messages.length || nextLastId !== previousLastId;
      const added = Math.max(nextMessages.length - messages.length, 0);
      messages = nextMessages;

      if (typeof payload.aiState === "string" && session) {
        session = { ...session, aiState: payload.aiState as ChatSession["aiState"] };
        persistSession(session);
      }

      if (changed) {
        if (forceScroll || wasNearBottom) await scrollToLatest(forceScroll ? "auto" : "smooth");
        else newMessageCount += added || 1;
      }
    } catch {
      // A atualização automática tenta novamente no próximo ciclo.
    } finally {
      loadingMessages = false;
    }
  }

  async function sendReply(): Promise<void> {
    if (!session || !reply.trim() || sending) return;
    errorMessage = "";
    sending = true;
    const body = reply.trim();

    try {
      const response = await fetch(`/api/support/chat/${encodeURIComponent(session.sessionId)}/messages`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${session.token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ body }),
      });
      const payload = await response.json() as Record<string, unknown>;

      if (!response.ok) {
        const error = typeof payload.error === "string" ? payload.error : "";
        errorMessage = apiErrorMessage(error);
        if (response.status === 401) clearStoredSession();
        return;
      }

      reply = "";
      persistDraft("");
      if (typeof payload.aiState === "string" && session) {
        session = { ...session, aiState: payload.aiState as ChatSession["aiState"] };
        persistSession(session);
      }
      await refreshMessages(true);
    } catch {
      errorMessage = "Não foi possível enviar sua mensagem. Tente novamente.";
    } finally {
      sending = false;
    }
  }

  function handleReplyKeydown(event: KeyboardEvent): void {
    if ((event.ctrlKey || event.metaKey) && event.key === "Enter") {
      event.preventDefault();
      void sendReply();
    }
  }

  function startAnotherChat(): void {
    clearStoredSession();
    errorMessage = "";
    reply = "";
    persistDraft("");
  }

  function formatTime(value: string): string {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "";
    return new Intl.DateTimeFormat("pt-BR", { hour: "2-digit", minute: "2-digit" }).format(date);
  }

  onDestroy(() => {
    if (pollTimer) clearInterval(pollTimer);
    if (statusTimer) clearInterval(statusTimer);
  });
</script>

<dialog
  bind:this={dialogElement}
  class="support-dialog m-auto w-[calc(100%-1.5rem)] max-w-[760px] overflow-visible bg-transparent p-0"
  aria-labelledby="support-chat-title"
  on:close={handleDialogClose}
  on:cancel={handleDialogCancel}
  on:click={handleBackdropClick}
>
  {#if isOpen}
    <section class="flex max-h-[calc(100dvh-1.5rem)] min-h-[580px] flex-col overflow-hidden rounded-[26px] bg-white shadow-[0_30px_100px_rgba(0,0,0,0.38)]">
      <header class="flex shrink-0 items-start justify-between gap-4 border-b border-[#E6E8EF] bg-white px-5 py-4 sm:px-7">
        <div class="flex items-start gap-3">
          <span class="inline-flex h-11 min-w-11 items-center justify-center rounded-2xl bg-[#FFF0E4] text-[#EA6D0B]">
            <LifeBuoy size={22} aria-hidden="true" />
          </span>
          <div>
            <p class="text-[10px] font-bold uppercase tracking-[0.16em] text-[#EA6D0B]">{status?.supportDisplayName ?? "Atendimento F10"}</p>
            <h2 id="support-chat-title" class="mt-1 text-[20px] font-semibold leading-tight text-[#010D28] sm:text-[24px]">
              {session ? `Chamado #${session.ticketNumber}` : "Converse com o suporte"}
            </h2>
            <div class="mt-1 flex items-center gap-1.5 text-[9px] text-[#7D8494]">
              <span class={`h-2 w-2 rounded-full ${(status?.isOpen !== false && (status?.onlineAgents ?? 0) > 0) ? "bg-[#38A169]" : "bg-[#B8BDC8]"}`}></span>
              <span>{sessionStatusText()}</span>
            </div>
          </div>
        </div>
        <button
          bind:this={closeButtonElement}
          type="button"
          class="inline-flex h-10 min-w-10 items-center justify-center rounded-full bg-[#F1F3F7] text-[#000A57] transition hover:bg-[#E6E8EF] focus:outline-none focus:ring-2 focus:ring-[#000A57]/25"
          on:click={onClose}
          aria-label="Fechar atendimento"
        >
          <X size={20} aria-hidden="true" />
        </button>
      </header>

      {#if session}
        <div class="relative min-h-0 flex-1">
          <div bind:this={messagesElement} on:scroll={handleMessagesScroll} class="h-full overflow-y-auto bg-[#F7F8FB] px-4 py-5 sm:px-6" aria-live="polite">
            {#if messages.length === 0 && loadingMessages}
              <div class="flex h-full items-center justify-center text-[#7D8494]"><LoaderCircle class="animate-spin" size={22} aria-hidden="true" /></div>
            {:else}
              <div class="space-y-4">
                {#each messages as message (message.id)}
                  {#if message.authorType === "customer"}
                    <div class="flex justify-end">
                      <div class="max-w-[86%] rounded-2xl bg-[#000A57] px-4 py-3 text-white">
                        <p class="whitespace-pre-wrap text-[12px] leading-5">{message.body}</p>
                        <span class="mt-1.5 block text-[8px] text-white/55">{formatTime(message.createdAt)}</span>
                      </div>
                    </div>
                  {:else}
                    <div class="flex items-start gap-2.5">
                      <span class="relative flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full border border-[#E0E4EC] bg-white text-[9px] font-bold text-[#000A57]">
                        {#if message.authorType === "user"}
                          {initials(message.authorUserName ?? "F10")}
                          {#if message.avatarUrl}
                            <img src={message.avatarUrl} alt="" class="absolute inset-0 h-full w-full object-cover" on:error={hideBrokenImage} />
                          {/if}
                          {#if message.authorOnline}<span class="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full border-2 border-white bg-[#38A169]"></span>{/if}
                        {:else}
                          <LifeBuoy size={16} aria-hidden="true" />
                        {/if}
                      </span>
                      <div class="max-w-[82%]">
                        <div class="mb-1 flex items-center gap-2 px-1">
                          <strong class="text-[9px] font-semibold text-[#4C5363]">{message.authorType === "user" ? (message.authorUserName ?? "Equipe F10") : "Atendimento F10"}</strong>
                          {#if message.authorType === "user" && message.authorOnline}<span class="text-[8px] text-[#398155]">online</span>{/if}
                        </div>
                        <div class="rounded-2xl border border-[#E0E4EC] bg-white px-4 py-3 text-[#343B4C]">
                          <p class="whitespace-pre-wrap text-[12px] leading-5">{message.body}</p>
                          <span class="mt-1.5 block text-[8px] text-[#969CAA]">{formatTime(message.createdAt)}</span>
                        </div>
                      </div>
                    </div>
                  {/if}
                {/each}
              </div>
            {/if}
          </div>

          {#if newMessageCount > 0}
            <button type="button" on:click={() => void scrollToLatest()} class="absolute bottom-4 left-1/2 inline-flex -translate-x-1/2 items-center gap-2 rounded-full bg-[#000A57] px-4 py-2 text-[10px] font-semibold text-white shadow-lg">
              {newMessageCount} {newMessageCount === 1 ? "nova mensagem" : "novas mensagens"} <ArrowDown size={14} />
            </button>
          {/if}
        </div>

        <form class="shrink-0 border-t border-[#E6E8EF] bg-white px-4 py-4 sm:px-6" on:submit|preventDefault={sendReply}>
          {#if errorMessage}<p class="mb-3 rounded-xl bg-[#FFF4F1] px-3 py-2 text-[10px] leading-4 text-[#9A4E3D]">{errorMessage}</p>{/if}
          <div class="flex items-end gap-2">
            <label class="sr-only" for="support-chat-reply">Mensagem</label>
            <textarea
              id="support-chat-reply"
              bind:value={reply}
              maxlength="4000"
              rows="2"
              placeholder="Escreva sua mensagem..."
              class="min-h-[48px] flex-1 resize-none rounded-2xl border border-[#DDE1E9] bg-[#FAFBFC] px-4 py-3 text-[12px] leading-5 text-[#252C3D] outline-none transition focus:border-[#000A57] focus:ring-3 focus:ring-[#000A57]/10"
              on:keydown={handleReplyKeydown}
            ></textarea>
            <button type="submit" disabled={sending || !reply.trim()} class="inline-flex h-12 min-w-12 items-center justify-center rounded-2xl bg-[#EA6D0B] text-white transition hover:bg-[#D96208] disabled:cursor-not-allowed disabled:opacity-45" aria-label="Enviar mensagem">
              {#if sending}<LoaderCircle class="animate-spin" size={18} aria-hidden="true" />{:else}<Send size={18} aria-hidden="true" />{/if}
            </button>
          </div>
          <div class="mt-2 flex items-center justify-between gap-3">
            <span class="text-[8px] text-[#9298A5]">Ctrl/⌘ + Enter envia · sessão ativa neste navegador por até 8 horas · <a href="/cliente" class="font-semibold text-[#000A57] hover:underline">Área do Cliente</a></span>
            <button type="button" class="text-[9px] font-semibold text-[#6D7485] hover:text-[#000A57]" on:click={startAnotherChat}>Novo atendimento</button>
          </div>
        </form>
      {:else}
        <div class="min-h-0 flex-1 overflow-y-auto bg-[#F7F8FB] px-5 py-5 sm:px-7 sm:py-6">
          <div class="mx-auto max-w-[590px]">
            <div class="mb-4 grid gap-2 sm:grid-cols-2">
              <div class="rounded-2xl border border-[#E2E5EC] bg-white px-4 py-3">
                <span class="block text-[8px] font-bold uppercase tracking-[0.1em] text-[#969CAA]">Disponibilidade</span>
                <strong class="mt-1 block text-[10px] leading-4 text-[#343B4C]">{availabilityText()}</strong>
              </div>
              <div class="rounded-2xl border border-[#E2E5EC] bg-white px-4 py-3">
                <span class="block text-[8px] font-bold uppercase tracking-[0.1em] text-[#969CAA]">Espera estimada</span>
                <strong class="mt-1 block text-[10px] leading-4 text-[#343B4C]">{waitText()}</strong>
              </div>
            </div>

            <div class="rounded-[22px] border border-[#E2E5EC] bg-white p-5 sm:p-6">
              <h3 class="text-[15px] font-semibold text-[#252C3D]">Conte brevemente o que precisa</h3>
              <p class="mt-1.5 text-[10px] leading-5 text-[#7B8292]">Seu atendimento será criado como um chamado da F10. Informe um e-mail válido para acompanhar depois pela Área do Cliente.</p>

              <form class="mt-5 space-y-4" on:submit|preventDefault={startChat}>
                <div class="grid gap-4 sm:grid-cols-2">
                  <label class="block text-[10px] font-semibold text-[#5E6575]">Nome
                    <input bind:value={name} required minlength="2" maxlength="120" autocomplete="name" class="mt-1.5 h-11 w-full rounded-xl border border-[#DDE1E9] px-3 text-[12px] font-normal text-[#252C3D] outline-none focus:border-[#000A57] focus:ring-3 focus:ring-[#000A57]/10" />
                  </label>
                  <label class="block text-[10px] font-semibold text-[#5E6575]">E-mail
                    <input bind:value={email} required type="email" maxlength="254" autocomplete="email" class="mt-1.5 h-11 w-full rounded-xl border border-[#DDE1E9] px-3 text-[12px] font-normal text-[#252C3D] outline-none focus:border-[#000A57] focus:ring-3 focus:ring-[#000A57]/10" />
                  </label>
                </div>
                <label class="block text-[10px] font-semibold text-[#5E6575]">Telefone <span class="font-normal text-[#9AA0AD]">(opcional)</span>
                  <input bind:value={phone} maxlength="40" autocomplete="tel" class="mt-1.5 h-11 w-full rounded-xl border border-[#DDE1E9] px-3 text-[12px] font-normal text-[#252C3D] outline-none focus:border-[#000A57] focus:ring-3 focus:ring-[#000A57]/10" />
                </label>
                <label class="block text-[10px] font-semibold text-[#5E6575]">Como podemos ajudar?
                  <textarea bind:value={initialMessage} required maxlength="4000" rows="5" placeholder="Descreva o que está acontecendo. Se tiver uma mensagem de erro, pode incluir aqui." class="mt-1.5 w-full resize-y rounded-xl border border-[#DDE1E9] px-3 py-3 text-[12px] font-normal leading-5 text-[#252C3D] outline-none focus:border-[#000A57] focus:ring-3 focus:ring-[#000A57]/10"></textarea>
                </label>

                {#if status?.isOpen === false}
                  <p class="rounded-xl bg-[#FFF8EE] px-3 py-2.5 text-[9px] leading-4 text-[#8B5B24]">Pode enviar agora. Sua mensagem ficará registrada e a equipe continua o atendimento no próximo horário disponível{status.nextOpenLabel ? ` (${status.nextOpenLabel})` : ""}.</p>
                {/if}
                {#if errorMessage}<p class="rounded-xl bg-[#FFF4F1] px-3 py-2.5 text-[10px] leading-4 text-[#9A4E3D]">{errorMessage}</p>{/if}

                <button type="submit" disabled={starting} class="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-[#000A57] px-5 text-[11px] font-semibold text-white transition hover:bg-[#111B71] disabled:cursor-not-allowed disabled:opacity-60">
                  {#if starting}<LoaderCircle class="animate-spin" size={17} aria-hidden="true" /> Iniciando atendimento...{:else}Iniciar atendimento{/if}
                </button>
              </form>
            </div>
          </div>
        </div>
      {/if}
    </section>
  {/if}
</dialog>

<style>
  .support-dialog::backdrop {
    background: rgba(1, 13, 40, 0.58);
    backdrop-filter: blur(4px);
  }
</style>
