<script lang="ts">
  import { browser } from "$app/environment";
  import { onDestroy, tick } from "svelte";
  import {
    ArrowDown,
    ArrowLeft,
    CreditCard,
    Image as ImageIcon,
    LifeBuoy,
    LoaderCircle,
    MessageCircleMore,
    MonitorCog,
    Paperclip,
    Send,
    Sparkles,
    X,
  } from "lucide-svelte";

  export let isOpen = false;
  export let onClose: () => void = () => undefined;

  type ChatSession = {
    sessionId: string;
    token: string;
    ticketNumber: number;
    expiresAt: string;
    aiState: "active" | "escalated" | "human" | "disabled";
    entryOptionLabel?: string;
  };

  type ChatAttachment = {
    id: string;
    originalName: string;
    mimeType: string;
    sizeBytes: number;
    url: string;
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
    presentation?: "remote_access" | "routing" | "closed" | null;
    attachments?: ChatAttachment[];
    optimistic?: boolean;
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

  type EntryOption = {
    id: string;
    label: string;
    description: string;
    initialHandling: "ai" | "human";
  };

  type PendingImage = {
    id: string;
    file: File;
    previewUrl: string;
  };

  const STORAGE_KEY = "f10-support-chat-session-v1";
  const DRAFT_KEY = "f10-support-chat-draft-v1";
  const BOTTOM_THRESHOLD = 120;
  const MAX_IMAGES = 4;
  const MAX_IMAGE_BYTES = 8 * 1024 * 1024;
  const ALLOWED_IMAGE_TYPES = new Set(["image/png", "image/jpeg", "image/webp"]);

  let dialogElement: HTMLDialogElement;
  let closeButtonElement: HTMLButtonElement;
  let messagesElement: HTMLDivElement;
  let fileInputElement: HTMLInputElement;
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
  let entryOptions: EntryOption[] = [];
  let entryOptionsLoaded = false;
  let entryOptionsLoading = false;
  let selectedEntryOptionId = "";
  let selectedEntryOptionLabel = "";
  let intakeStep: "intent" | "identity" = "intent";
  let intentDraft = "";
  let pendingImages: PendingImage[] = [];
  let dragActive = false;
  let starting = false;
  let sending = false;
  let loadingMessages = false;
  let errorMessage = "";
  let attachmentError = "";
  let newMessageCount = 0;

  $: if (browser && dialogElement) syncDialogState(isOpen);
  $: if (browser && isOpen && !restored) restoreStoredState();
  $: if (browser) syncPolling(isOpen, session?.sessionId ?? "");
  $: if (browser) syncStatusPolling(isOpen);
  $: if (browser && isOpen && !session && !entryOptionsLoaded && !entryOptionsLoading) void refreshEntryOptions();
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

  async function refreshEntryOptions(): Promise<void> {
    entryOptionsLoading = true;
    try {
      const response = await fetch("/api/support/chat/options", { cache: "no-store" });
      if (!response.ok) return;
      const payload = await response.json() as { options?: EntryOption[] };
      entryOptions = Array.isArray(payload.options) ? payload.options : [];
    } catch {
      entryOptions = [];
    } finally {
      entryOptionsLoaded = true;
      entryOptionsLoading = false;
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
    if (error === "INVALID_MESSAGE") return "Escreva uma mensagem ou adicione uma imagem antes de enviar.";
    if (error === "INVALID_ENTRY_OPTION") return "Esta opção de atendimento não está mais disponível. Escolha outra opção.";
    if (error === "SUPPORT_IMAGE_TOO_MANY" || error === "TOO_MANY_ATTACHMENTS") return "Envie no máximo 4 imagens por mensagem.";
    if (error === "SUPPORT_IMAGE_SIZE_INVALID") return "Cada imagem pode ter no máximo 8 MB.";
    if (error === "SUPPORT_IMAGE_TYPE_INVALID") return "Use imagens PNG, JPG/JPEG ou WebP.";
    if (error === "ATTACHMENT_STORAGE_UNAVAILABLE") return "O envio de imagens está temporariamente indisponível. Você ainda pode enviar texto.";
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

  function chooseEntryOption(option: EntryOption | null): void {
    selectedEntryOptionId = option?.id ?? "";
    selectedEntryOptionLabel = option?.label ?? "Outro assunto";
    errorMessage = "";
    intakeStep = "identity";
  }

  function continueFromIntent(): void {
    const value = intentDraft.trim();
    if (!value) return;
    selectedEntryOptionId = "";
    selectedEntryOptionLabel = "Outro assunto";
    initialMessage = value;
    intakeStep = "identity";
  }

  function handleIntentKeydown(event: KeyboardEvent): void {
    if (event.isComposing) return;
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      continueFromIntent();
    }
  }

  function returnToIntent(): void {
    intakeStep = "intent";
    errorMessage = "";
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
          entryOptionId: selectedEntryOptionId || null,
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
        entryOptionLabel: String(payload.entryOptionLabel ?? selectedEntryOptionLabel ?? ""),
      };

      if (!nextSession.sessionId || !nextSession.token || !nextSession.expiresAt) {
        errorMessage = "O servidor iniciou o atendimento, mas não retornou uma sessão válida.";
        return;
      }

      session = nextSession;
      persistSession(nextSession);
      initialMessage = "";
      intentDraft = "";
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
    const previousServerMessages = messages.filter((message) => !message.optimistic);
    const previousLastId = previousServerMessages.at(-1)?.id;

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
      const changed = nextMessages.length !== previousServerMessages.length || nextLastId !== previousLastId || messages.some((message) => message.optimistic);
      const added = Math.max(nextMessages.length - previousServerMessages.length, 0);
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

  function makePendingImage(file: File): PendingImage {
    return {
      id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
      file,
      previewUrl: URL.createObjectURL(file),
    };
  }

  function addImageFiles(files: File[]): void {
    attachmentError = "";
    const valid: File[] = [];
    for (const file of files) {
      if (!ALLOWED_IMAGE_TYPES.has(file.type)) {
        attachmentError = "Use imagens PNG, JPG/JPEG ou WebP.";
        continue;
      }
      if (file.size < 1 || file.size > MAX_IMAGE_BYTES) {
        attachmentError = "Cada imagem pode ter no máximo 8 MB.";
        continue;
      }
      valid.push(file);
    }

    const available = Math.max(MAX_IMAGES - pendingImages.length, 0);
    if (valid.length > available) attachmentError = "Envie no máximo 4 imagens por mensagem.";
    pendingImages = [...pendingImages, ...valid.slice(0, available).map(makePendingImage)];
  }

  function removePendingImage(id: string): void {
    const image = pendingImages.find((item) => item.id === id);
    if (image) URL.revokeObjectURL(image.previewUrl);
    pendingImages = pendingImages.filter((item) => item.id !== id);
  }

  function revokeImages(images: PendingImage[]): void {
    for (const image of images) URL.revokeObjectURL(image.previewUrl);
  }

  function handleFileInput(event: Event): void {
    const input = event.currentTarget as HTMLInputElement;
    addImageFiles(Array.from(input.files ?? []));
    input.value = "";
  }

  function handleReplyPaste(event: ClipboardEvent): void {
    const imageFiles = Array.from(event.clipboardData?.files ?? []).filter((file) => file.type.startsWith("image/"));
    if (imageFiles.length === 0) return;
    event.preventDefault();
    addImageFiles(imageFiles);
  }

  function handleDragEnter(event: DragEvent): void {
    event.preventDefault();
    if (event.dataTransfer?.types.includes("Files")) dragActive = true;
  }

  function handleDragOver(event: DragEvent): void {
    event.preventDefault();
    if (event.dataTransfer) event.dataTransfer.dropEffect = "copy";
  }

  function handleDragLeave(event: DragEvent): void {
    if (event.currentTarget === event.target) dragActive = false;
  }

  function handleDrop(event: DragEvent): void {
    event.preventDefault();
    dragActive = false;
    addImageFiles(Array.from(event.dataTransfer?.files ?? []).filter((file) => file.type.startsWith("image/")));
  }

  async function sendReply(): Promise<void> {
    if (!session || sending) return;
    const body = reply.trim();
    const images = [...pendingImages];
    if (!body && images.length === 0) return;

    errorMessage = "";
    attachmentError = "";
    sending = true;
    const optimisticId = `pending-${Date.now()}`;
    const optimisticMessage: ChatMessage = {
      id: optimisticId,
      authorType: "customer",
      body,
      createdAt: new Date().toISOString(),
      optimistic: true,
      attachments: images.map((image) => ({
        id: image.id,
        originalName: image.file.name || "imagem",
        mimeType: image.file.type,
        sizeBytes: image.file.size,
        url: image.previewUrl,
      })),
    };

    messages = [...messages, optimisticMessage];
    reply = "";
    pendingImages = [];
    persistDraft("");
    await scrollToLatest("smooth");

    try {
      const formData = new FormData();
      formData.set("body", body);
      for (const image of images) formData.append("files", image.file, image.file.name || "imagem.png");

      const response = await fetch(`/api/support/chat/${encodeURIComponent(session.sessionId)}/messages`, {
        method: "POST",
        headers: { Authorization: `Bearer ${session.token}` },
        body: formData,
      });
      const payload = await response.json() as Record<string, unknown>;

      if (!response.ok) {
        messages = messages.filter((message) => message.id !== optimisticId);
        reply = body;
        pendingImages = images;
        const error = typeof payload.error === "string" ? payload.error : "";
        errorMessage = apiErrorMessage(error);
        if (response.status === 401) {
          revokeImages(images);
          pendingImages = [];
          clearStoredSession();
        }
        return;
      }

      if (typeof payload.aiState === "string" && session) {
        session = { ...session, aiState: payload.aiState as ChatSession["aiState"] };
        persistSession(session);
      }
      await refreshMessages(true);
      revokeImages(images);
    } catch {
      messages = messages.filter((message) => message.id !== optimisticId);
      reply = body;
      pendingImages = images;
      errorMessage = "Não foi possível enviar sua mensagem. Tente novamente.";
    } finally {
      sending = false;
    }
  }

  function handleReplyKeydown(event: KeyboardEvent): void {
    if (event.isComposing) return;
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      void sendReply();
    }
  }

  function startAnotherChat(): void {
    clearStoredSession();
    revokeImages(pendingImages);
    pendingImages = [];
    errorMessage = "";
    attachmentError = "";
    reply = "";
    name = "";
    email = "";
    phone = "";
    initialMessage = "";
    intentDraft = "";
    selectedEntryOptionId = "";
    selectedEntryOptionLabel = "";
    intakeStep = "intent";
    persistDraft("");
  }

  function formatTime(value: string): string {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "";
    return new Intl.DateTimeFormat("pt-BR", { hour: "2-digit", minute: "2-digit" }).format(date);
  }

  function systemCardTitle(presentation: ChatMessage["presentation"]): string {
    if (presentation === "remote_access") return "Acesso remoto";
    if (presentation === "routing") return "Atualização do atendimento";
    if (presentation === "closed") return "Atendimento finalizado";
    return "Atendimento F10";
  }

  onDestroy(() => {
    if (pollTimer) clearInterval(pollTimer);
    if (statusTimer) clearInterval(statusTimer);
    revokeImages(pendingImages);
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
            <p class="text-[10px] font-bold uppercase tracking-[0.16em] text-[#EA6D0B]">EQUIPE F10</p>
            <h2 id="support-chat-title" class="mt-1 text-[20px] font-semibold leading-tight text-[#010D28] sm:text-[24px]">Atendimento F10</h2>
            <div class="mt-1 flex flex-wrap items-center gap-1.5 text-[9px] text-[#7D8494]">
              <span class={`h-2 w-2 rounded-full ${(status?.isOpen !== false && (status?.onlineAgents ?? 0) > 0) ? "bg-[#38A169]" : "bg-[#B8BDC8]"}`}></span>
              {#if session}<span>Atendimento #{session.ticketNumber} · {sessionStatusText()}</span>{:else}<span>{availabilityText()}</span>{/if}
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
                  {#if message.presentation}
                    <div class="mx-auto max-w-[88%] rounded-2xl border border-[#DDE2EB] bg-white px-4 py-3 shadow-sm">
                      <div class="flex items-start gap-3">
                        <span class="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-[#EEF0FF] text-[#000A57]">
                          {#if message.presentation === "remote_access"}<MonitorCog size={15}/>{:else if message.presentation === "routing"}<MessageCircleMore size={15}/>{:else}<LifeBuoy size={15}/>{/if}
                        </span>
                        <div class="min-w-0 flex-1">
                          <strong class="text-[10px] font-semibold text-[#303746]">{systemCardTitle(message.presentation)}</strong>
                          <p class="mt-1 whitespace-pre-wrap text-[10px] leading-5 text-[#687080]">{message.body}</p>
                          <span class="mt-1.5 block text-[8px] text-[#A0A5B0]">{formatTime(message.createdAt)}</span>
                        </div>
                      </div>
                    </div>
                  {:else if message.authorType === "customer"}
                    <div class="flex justify-end">
                      <div class={`max-w-[86%] rounded-2xl bg-[#000A57] px-3.5 py-3 text-white ${message.optimistic ? "opacity-70" : ""}`}>
                        {#if message.attachments && message.attachments.length > 0}
                          <div class={`grid gap-2 ${message.attachments.length > 1 ? "grid-cols-2" : "grid-cols-1"}`}>
                            {#each message.attachments as attachment}
                              <a href={attachment.url} target="_blank" rel="noopener noreferrer" class="block overflow-hidden rounded-xl bg-white/10">
                                <img src={attachment.url} alt={attachment.originalName} class="max-h-64 w-full object-cover" on:error={hideBrokenImage}/>
                              </a>
                            {/each}
                          </div>
                        {/if}
                        {#if message.body}<p class={`${message.attachments?.length ? "mt-2" : ""} whitespace-pre-wrap text-[12px] leading-5`}>{message.body}</p>{/if}
                        <span class="mt-1.5 block text-[8px] text-white/55">{message.optimistic ? "Enviando..." : formatTime(message.createdAt)}</span>
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
                          {#if message.attachments && message.attachments.length > 0}
                            <div class={`grid gap-2 ${message.attachments.length > 1 ? "grid-cols-2" : "grid-cols-1"}`}>
                              {#each message.attachments as attachment}
                                <a href={attachment.url} target="_blank" rel="noopener noreferrer" class="block overflow-hidden rounded-xl bg-[#F4F5F8]"><img src={attachment.url} alt={attachment.originalName} class="max-h-64 w-full object-cover" on:error={hideBrokenImage}/></a>
                              {/each}
                            </div>
                          {/if}
                          {#if message.body}<p class={`${message.attachments?.length ? "mt-2" : ""} whitespace-pre-wrap text-[12px] leading-5`}>{message.body}</p>{/if}
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

        <form
          class={`relative shrink-0 border-t bg-white px-4 py-4 sm:px-6 ${dragActive ? "border-[#EA6D0B] ring-2 ring-inset ring-[#EA6D0B]/25" : "border-[#E6E8EF]"}`}
          on:submit|preventDefault={sendReply}
          on:dragenter={handleDragEnter}
          on:dragover={handleDragOver}
          on:dragleave={handleDragLeave}
          on:drop={handleDrop}
        >
          {#if dragActive}<div class="pointer-events-none absolute inset-2 z-10 flex items-center justify-center rounded-2xl border-2 border-dashed border-[#EA6D0B] bg-[#FFF8F1]/95 text-[11px] font-semibold text-[#B9570A]"><ImageIcon size={18} class="mr-2"/>Solte a imagem para anexar</div>{/if}
          {#if errorMessage}<p class="mb-3 rounded-xl bg-[#FFF4F1] px-3 py-2 text-[10px] leading-4 text-[#9A4E3D]">{errorMessage}</p>{/if}
          {#if attachmentError}<p class="mb-3 rounded-xl bg-[#FFF8EE] px-3 py-2 text-[10px] leading-4 text-[#8B5B24]">{attachmentError}</p>{/if}

          {#if pendingImages.length > 0}
            <div class="mb-3 flex gap-2 overflow-x-auto pb-1">
              {#each pendingImages as image (image.id)}
                <div class="relative h-16 w-20 shrink-0 overflow-hidden rounded-xl border border-[#DDE1E9] bg-[#F4F5F8]">
                  <img src={image.previewUrl} alt={image.file.name || "Imagem para enviar"} class="h-full w-full object-cover"/>
                  <button type="button" on:click={() => removePendingImage(image.id)} class="absolute right-1 top-1 inline-flex h-5 w-5 items-center justify-center rounded-full bg-black/65 text-white" aria-label="Remover imagem"><X size={11}/></button>
                </div>
              {/each}
            </div>
          {/if}

          <input bind:this={fileInputElement} type="file" multiple accept="image/png,image/jpeg,image/webp" class="hidden" on:change={handleFileInput}/>
          <div class="flex items-end gap-2">
            <button type="button" on:click={() => fileInputElement?.click()} class="inline-flex h-12 min-w-12 items-center justify-center rounded-2xl border border-[#DDE1E9] bg-white text-[#667080] transition hover:border-[#B9BFCC] hover:text-[#000A57]" aria-label="Anexar imagem"><Paperclip size={18}/></button>
            <label class="sr-only" for="support-chat-reply">Mensagem</label>
            <textarea
              id="support-chat-reply"
              bind:value={reply}
              maxlength="4000"
              rows="2"
              placeholder="Escreva sua mensagem..."
              class="min-h-[48px] flex-1 resize-none rounded-2xl border border-[#DDE1E9] bg-[#FAFBFC] px-4 py-3 text-[12px] leading-5 text-[#252C3D] outline-none transition focus:border-[#000A57] focus:ring-3 focus:ring-[#000A57]/10"
              on:keydown={handleReplyKeydown}
              on:paste={handleReplyPaste}
            ></textarea>
            <button type="submit" disabled={sending || (!reply.trim() && pendingImages.length === 0)} class="inline-flex h-12 min-w-12 items-center justify-center rounded-2xl bg-[#EA6D0B] text-white transition hover:bg-[#D96208] disabled:cursor-not-allowed disabled:opacity-45" aria-label="Enviar mensagem">
              {#if sending}<LoaderCircle class="animate-spin" size={18} aria-hidden="true" />{:else}<Send size={18} aria-hidden="true" />{/if}
            </button>
          </div>
          <div class="mt-2 flex items-center justify-between gap-3">
            <span class="text-[8px] text-[#9298A5]">Enter envia · Shift+Enter quebra linha · cole ou arraste imagens · <a href="/cliente" class="font-semibold text-[#000A57] hover:underline">Área do Cliente</a></span>
            <button type="button" class="text-[9px] font-semibold text-[#6D7485] hover:text-[#000A57]" on:click={startAnotherChat}>Novo atendimento</button>
          </div>
        </form>
      {:else}
        <div class="min-h-0 flex-1 overflow-y-auto bg-[#F7F8FB] px-5 py-5 sm:px-7 sm:py-6">
          <div class="mx-auto max-w-[610px]">
            {#if intakeStep === "intent"}
              <div class="text-center">
                <h3 class="text-[20px] font-semibold tracking-[-0.02em] text-[#172036]">Olá! Como podemos ajudar?</h3>
                <p class="mt-1.5 text-[10px] leading-5 text-[#7B8292]">Escolha o assunto para encaminharmos seu atendimento à equipe certa.</p>
              </div>

              <div class="mt-5 space-y-2.5">
                {#if entryOptionsLoading}
                  <div class="flex justify-center py-8 text-[#8A909E]"><LoaderCircle class="animate-spin" size={20}/></div>
                {:else}
                  {#each entryOptions as option}
                    <button type="button" on:click={() => chooseEntryOption(option)} class="group flex w-full items-center gap-3 rounded-2xl border border-[#E0E4EC] bg-white px-4 py-3.5 text-left transition hover:border-[#B9C0D3] hover:shadow-sm">
                      <span class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#EEF0FF] text-[#000A57]">
                        {#if option.label.toLowerCase().includes("finance")}<CreditCard size={17}/>{:else if option.initialHandling === "human"}<MessageCircleMore size={17}/>{:else}<LifeBuoy size={17}/>{/if}
                      </span>
                      <span class="min-w-0 flex-1"><strong class="block text-[11px] font-semibold text-[#303746]">{option.label}</strong>{#if option.description}<span class="mt-0.5 block text-[9px] leading-4 text-[#858B99]">{option.description}</span>{/if}</span>
                      <span class="text-[16px] text-[#B1B6C2] transition group-hover:translate-x-0.5 group-hover:text-[#000A57]">›</span>
                    </button>
                  {/each}

                  {#if entryOptions.length === 0}
                    <button type="button" on:click={() => chooseEntryOption(null)} class="group flex w-full items-center gap-3 rounded-2xl border border-[#E0E4EC] bg-white px-4 py-3.5 text-left transition hover:border-[#B9C0D3] hover:shadow-sm">
                      <span class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#EEF0FF] text-[#000A57]"><LifeBuoy size={17}/></span>
                      <span class="min-w-0 flex-1"><strong class="block text-[11px] font-semibold text-[#303746]">Preciso de suporte</strong><span class="mt-0.5 block text-[9px] leading-4 text-[#858B99]">Problemas, dúvidas ou ajuda com o F10</span></span>
                      <span class="text-[16px] text-[#B1B6C2]">›</span>
                    </button>
                  {/if}

                  <button type="button" on:click={() => chooseEntryOption(null)} class="group flex w-full items-center gap-3 rounded-2xl border border-[#E0E4EC] bg-white px-4 py-3.5 text-left transition hover:border-[#B9C0D3] hover:shadow-sm">
                    <span class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#F3F4F7] text-[#687080]"><MessageCircleMore size={17}/></span>
                    <span class="min-w-0 flex-1"><strong class="block text-[11px] font-semibold text-[#303746]">Outro assunto</strong><span class="mt-0.5 block text-[9px] leading-4 text-[#858B99]">Conte o que precisa e a equipe direciona por aqui</span></span>
                    <span class="text-[16px] text-[#B1B6C2]">›</span>
                  </button>
                {/if}
              </div>

              <div class="my-5 flex items-center gap-3"><span class="h-px flex-1 bg-[#E1E4EA]"></span><span class="text-[8px] font-semibold uppercase tracking-[0.12em] text-[#A0A5B0]">ou descreva direto</span><span class="h-px flex-1 bg-[#E1E4EA]"></span></div>
              <div class="rounded-2xl border border-[#E0E4EC] bg-white p-3">
                <textarea bind:value={intentDraft} maxlength="4000" rows="3" placeholder="Ex.: Não consigo emitir uma nota..." on:keydown={handleIntentKeydown} class="w-full resize-none border-0 bg-transparent px-1 py-1 text-[11px] leading-5 text-[#303746] outline-none"></textarea>
                <div class="mt-2 flex items-center justify-between gap-3 border-t border-[#F0F1F4] pt-2"><span class="text-[8px] text-[#999EAA]">Enter continua · Shift+Enter quebra linha</span><button type="button" disabled={!intentDraft.trim()} on:click={continueFromIntent} class="inline-flex h-8 items-center gap-1.5 rounded-lg bg-[#000A57] px-3 text-[9px] font-semibold text-white disabled:opacity-40">Continuar<Send size={12}/></button></div>
              </div>

              <div class="mt-4 grid gap-2 sm:grid-cols-2">
                <div class="rounded-xl border border-[#E2E5EC] bg-white px-3 py-2.5"><span class="block text-[8px] font-bold uppercase tracking-[0.1em] text-[#969CAA]">Disponibilidade</span><strong class="mt-1 block text-[9px] leading-4 text-[#343B4C]">{availabilityText()}</strong></div>
                <div class="rounded-xl border border-[#E2E5EC] bg-white px-3 py-2.5"><span class="block text-[8px] font-bold uppercase tracking-[0.1em] text-[#969CAA]">Espera estimada</span><strong class="mt-1 block text-[9px] leading-4 text-[#343B4C]">{waitText()}</strong></div>
              </div>
            {:else}
              <button type="button" on:click={returnToIntent} class="mb-4 inline-flex items-center gap-1.5 text-[9px] font-semibold text-[#6D7485] hover:text-[#000A57]"><ArrowLeft size={13}/>Trocar assunto</button>
              <div class="rounded-[22px] border border-[#E2E5EC] bg-white p-5 sm:p-6">
                <div class="flex items-start gap-3">
                  <span class="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#EEF0FF] text-[#000A57]"><Sparkles size={16}/></span>
                  <div><h3 class="text-[15px] font-semibold text-[#252C3D]">Vamos iniciar seu atendimento</h3><p class="mt-1 text-[9px] leading-4 text-[#7B8292]">{selectedEntryOptionLabel || "Atendimento F10"}</p></div>
                </div>

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
                  <label class="block text-[10px] font-semibold text-[#5E6575]">O que está acontecendo?
                    <textarea bind:value={initialMessage} required maxlength="4000" rows="4" placeholder="Descreva o problema, dúvida ou solicitação." class="mt-1.5 w-full resize-y rounded-xl border border-[#DDE1E9] px-3 py-3 text-[12px] font-normal leading-5 text-[#252C3D] outline-none focus:border-[#000A57] focus:ring-3 focus:ring-[#000A57]/10"></textarea>
                  </label>

                  {#if status?.isOpen === false}
                    <p class="rounded-xl bg-[#FFF8EE] px-3 py-2.5 text-[9px] leading-4 text-[#8B5B24]">Pode enviar agora. Sua mensagem ficará registrada e a equipe continua o atendimento no próximo horário disponível{status.nextOpenLabel ? ` (${status.nextOpenLabel})` : ""}.</p>
                  {/if}
                  {#if errorMessage}<p class="rounded-xl bg-[#FFF4F1] px-3 py-2.5 text-[10px] leading-4 text-[#9A4E3D]">{errorMessage}</p>{/if}

                  <button type="submit" disabled={starting || !initialMessage.trim()} class="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-[#000A57] px-5 text-[11px] font-semibold text-white transition hover:bg-[#111B71] disabled:cursor-not-allowed disabled:opacity-60">
                    {#if starting}<LoaderCircle class="animate-spin" size={17} aria-hidden="true" /> Iniciando atendimento...{:else}Iniciar atendimento{/if}
                  </button>
                </form>
              </div>
            {/if}
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
