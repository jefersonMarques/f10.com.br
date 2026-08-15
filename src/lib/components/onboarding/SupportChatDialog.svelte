<script lang="ts">
  import { browser } from "$app/environment";
  import { onDestroy } from "svelte";
  import { LifeBuoy, LoaderCircle, Send, X } from "lucide-svelte";

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
    body: string;
    createdAt: string;
  };

  const STORAGE_KEY = "f10-support-chat-session-v1";

  let dialogElement: HTMLDialogElement;
  let closeButtonElement: HTMLButtonElement;
  let previouslyFocusedElement: HTMLElement | null = null;
  let restored = false;
  let pollingSessionId = "";
  let pollTimer: ReturnType<typeof setInterval> | null = null;

  let name = "";
  let email = "";
  let phone = "";
  let initialMessage = "";
  let reply = "";
  let session: ChatSession | null = null;
  let messages: ChatMessage[] = [];
  let starting = false;
  let sending = false;
  let loadingMessages = false;
  let errorMessage = "";

  $: if (browser && dialogElement) syncDialogState(isOpen);
  $: if (browser && isOpen && !restored) restoreStoredSession();
  $: if (browser) syncPolling(isOpen, session?.sessionId ?? "");

  function syncDialogState(shouldOpen: boolean): void {
    if (shouldOpen && !dialogElement.open) {
      previouslyFocusedElement = document.activeElement as HTMLElement | null;
      dialogElement.showModal();
      window.requestAnimationFrame(() => closeButtonElement?.focus());
      return;
    }

    if (!shouldOpen && dialogElement.open) dialogElement.close();
  }

  function restoreStoredSession(): void {
    restored = true;
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
      void refreshMessages();
    } catch {
      clearStoredSession();
    }
  }

  function persistSession(value: ChatSession): void {
    if (!browser) return;
    window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(value));
  }

  function clearStoredSession(): void {
    if (browser) window.sessionStorage.removeItem(STORAGE_KEY);
    session = null;
    messages = [];
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

    void refreshMessages();
    pollTimer = setInterval(() => void refreshMessages(), 4_000);
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
      await refreshMessages();
    } catch {
      errorMessage = "Não foi possível conectar ao chat F10. Verifique sua conexão e tente novamente.";
    } finally {
      starting = false;
    }
  }

  async function refreshMessages(): Promise<void> {
    if (!session || loadingMessages) return;
    loadingMessages = true;

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
      messages = Array.isArray(payload.messages) ? payload.messages as ChatMessage[] : [];
      if (typeof payload.aiState === "string" && session) {
        session = { ...session, aiState: payload.aiState as ChatSession["aiState"] };
        persistSession(session);
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
      if (typeof payload.aiState === "string" && session) {
        session = { ...session, aiState: payload.aiState as ChatSession["aiState"] };
        persistSession(session);
      }
      await refreshMessages();
    } catch {
      errorMessage = "Não foi possível enviar sua mensagem. Tente novamente.";
    } finally {
      sending = false;
    }
  }

  function startAnotherChat(): void {
    clearStoredSession();
    errorMessage = "";
    reply = "";
  }

  function formatTime(value: string): string {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "";
    return new Intl.DateTimeFormat("pt-BR", { hour: "2-digit", minute: "2-digit" }).format(date);
  }

  onDestroy(() => {
    if (pollTimer) clearInterval(pollTimer);
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
            <p class="text-[10px] font-bold uppercase tracking-[0.16em] text-[#EA6D0B]">Atendimento F10</p>
            <h2 id="support-chat-title" class="mt-1 text-[20px] font-semibold leading-tight text-[#010D28] sm:text-[24px]">
              {session ? `Chamado #${session.ticketNumber}` : "Converse com o suporte"}
            </h2>
            {#if session}
              <p class="mt-1 text-[9px] text-[#7D8494]">Conversa registrada diretamente no F10 Operations.</p>
            {/if}
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
        <div class="min-h-0 flex-1 overflow-y-auto bg-[#F7F8FB] px-4 py-5 sm:px-6" aria-live="polite">
          {#if messages.length === 0 && loadingMessages}
            <div class="flex h-full items-center justify-center text-[#7D8494]"><LoaderCircle class="animate-spin" size={22} aria-hidden="true" /></div>
          {:else}
            <div class="space-y-3">
              {#each messages as message (message.id)}
                <div class={`flex ${message.authorType === "customer" ? "justify-end" : "justify-start"}`}>
                  <div class={`max-w-[86%] rounded-2xl px-4 py-3 ${message.authorType === "customer" ? "bg-[#000A57] text-white" : "border border-[#E0E4EC] bg-white text-[#343B4C]"}`}>
                    <p class="whitespace-pre-wrap text-[12px] leading-5">{message.body}</p>
                    <span class={`mt-1.5 block text-[8px] ${message.authorType === "customer" ? "text-white/55" : "text-[#969CAA]"}`}>{formatTime(message.createdAt)}</span>
                  </div>
                </div>
              {/each}
            </div>
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
            ></textarea>
            <button type="submit" disabled={sending || !reply.trim()} class="inline-flex h-12 min-w-12 items-center justify-center rounded-2xl bg-[#EA6D0B] text-white transition hover:bg-[#D96208] disabled:cursor-not-allowed disabled:opacity-45" aria-label="Enviar mensagem">
              {#if sending}<LoaderCircle class="animate-spin" size={18} aria-hidden="true" />{:else}<Send size={18} aria-hidden="true" />{/if}
            </button>
          </div>
          <div class="mt-2 flex items-center justify-between gap-3">
            <span class="text-[8px] text-[#9298A5]">A sessão permanece ativa neste navegador por até 8 horas.</span>
            <button type="button" class="text-[9px] font-semibold text-[#6D7485] hover:text-[#000A57]" on:click={startAnotherChat}>Novo atendimento</button>
          </div>
        </form>
      {:else}
        <div class="min-h-0 flex-1 overflow-y-auto bg-[#F7F8FB] px-5 py-5 sm:px-7 sm:py-6">
          <div class="mx-auto max-w-[590px] rounded-[22px] border border-[#E2E5EC] bg-white p-5 sm:p-6">
            <h3 class="text-[15px] font-semibold text-[#252C3D]">Conte brevemente o que precisa</h3>
            <p class="mt-1.5 text-[10px] leading-5 text-[#7B8292]">Seu atendimento será criado como um chamado da F10. Informe um e-mail válido para que o chamado também possa ser associado ao seu cadastro.</p>

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
                <textarea bind:value={initialMessage} required maxlength="4000" rows="5" class="mt-1.5 w-full resize-y rounded-xl border border-[#DDE1E9] px-3 py-3 text-[12px] font-normal leading-5 text-[#252C3D] outline-none focus:border-[#000A57] focus:ring-3 focus:ring-[#000A57]/10"></textarea>
              </label>

              {#if errorMessage}<p class="rounded-xl bg-[#FFF4F1] px-3 py-2.5 text-[10px] leading-4 text-[#9A4E3D]">{errorMessage}</p>{/if}

              <button type="submit" disabled={starting} class="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-[#000A57] px-5 text-[11px] font-semibold text-white transition hover:bg-[#111B71] disabled:cursor-not-allowed disabled:opacity-60">
                {#if starting}<LoaderCircle class="animate-spin" size={17} aria-hidden="true" /> Iniciando atendimento...{:else}Iniciar atendimento{/if}
              </button>
            </form>
          </div>
        </div>
      {/if}
    </section>
  {/if}
</dialog>

<style>
  .support-dialog::backdrop {
    background: rgba(1, 7, 25, 0.78);
    backdrop-filter: blur(7px);
  }

  .support-dialog[open] {
    animation: support-dialog-enter 180ms ease-out;
  }

  @keyframes support-dialog-enter {
    from { opacity: 0; transform: translateY(12px) scale(0.985); }
    to { opacity: 1; transform: translateY(0) scale(1); }
  }

  @media (max-height: 660px) {
    section { min-height: calc(100dvh - 1.5rem); }
  }

  @media (prefers-reduced-motion: reduce) {
    .support-dialog[open] { animation: none; }
  }
</style>
