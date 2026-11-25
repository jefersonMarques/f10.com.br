<script lang="ts">
  import CustomerProfileForm from "$lib/components/customerPortal/CustomerProfileForm.svelte";
  import { needsCustomerNameConfirmation } from "$lib/support/customerProfile";
  import { browser } from "$app/environment";
  import {
    readRestorableSupportGuestMessages,
    SUPPORT_CHAT_GUEST_KEY,
    SUPPORT_ASSISTANT_GUEST_KEY,
    SUPPORT_CHAT_SESSION_KEY,
  } from "$lib/support/supportChatRestore";
  import { onDestroy, tick } from "svelte";
  import SupportChatMarkdown from "$lib/components/support/SupportChatMarkdown.svelte";
  import ChatWaitingOffer from "$lib/components/support/ChatWaitingOffer.svelte";
  import FinancePaymentPanel from "$lib/components/finance/FinancePaymentPanel.svelte";
  import MessageActionMenu from "$lib/components/support/MessageActionMenu.svelte";
  import {
    filterChatOptionsByDepartment,
    getFinanceEntryAction,
    isChatEntryVisible,
    canStartHumanChat,
    type FinanceEntryAction,
  } from "$lib/support/chatEntryRouting";
  import {
    ArrowDown,
    CheckCircle2,
    ChevronRight,
    CreditCard,
    ExternalLink,
    Image as ImageIcon,
    LifeBuoy,
    Headset,
    LoaderCircle,
    LockKeyhole,
    MessageCircleMore,
    EllipsisVertical,
    Paperclip,
    Send,
    Ticket,
    UserRound,
    X,
  } from "lucide-svelte";

  type CustomerUnit = {
    id: number;
    name: string;
  };

  type CustomerGroup = {
    id: number;
    name: string;
    units: CustomerUnit[];
  };

  type CustomerSupportContext = {
    authenticated: boolean;
    name: string;
    email: string;
    requiresNameConfirmation?: boolean;
    groupName: string | null;
    unitName: string | null;
    requiresUnitSelection?: boolean;
    groups?: CustomerGroup[];
  };

  type AuthState = {
    authenticated: boolean;
    name: string;
    email: string;
    requiresNameConfirmation?: boolean;
    groupName: string | null;
    unitName: string | null;
    requiresUnitSelection: boolean;
    groups: CustomerGroup[];
  };

  type ChatSession = {
    sessionId: string;
    token: string;
    ticketNumber: number;
    expiresAt: string;
    aiState: "active" | "escalated" | "human" | "disabled";
    entryOptionLabel?: string;
    department?: "support" | "finance";
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
    reactions?: Array<{ code: "like" | "heart" | "check" | "eyes"; count: number }>;
    myReaction?: "like" | "heart" | "check" | "eyes" | null;
  };

  type GuestMessage = {
    id: string;
    role: "assistant" | "customer";
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

  type EntryOption = {
    id: string;
    label: string;
    teamName?: string | null;
    description: string;
    initialHandling: "ai" | "human";
    showOutsideHours: boolean;
  };

  type PendingImage = {
    id: string;
    file: File;
    previewUrl: string;
  };

  export let isOpen = false;
  export let entryDepartment: "support" | "finance" = "support";
  export let onClose: () => void = () => undefined;
  export let customerSupport: CustomerSupportContext = {
    authenticated: false,
    name: "",
    email: "",
    groupName: null,
    unitName: null,
    requiresUnitSelection: false,
    groups: [],
  };

  const STORAGE_KEY = SUPPORT_CHAT_SESSION_KEY;
  const DRAFT_KEY = "f10-support-chat-draft-v1";
  const GUEST_KEY = SUPPORT_CHAT_GUEST_KEY;
  const UNRESOLVED_KEY = "f10-support-chat-unresolved-v1";
  const BOTTOM_THRESHOLD = 100;
  const MAX_FILES = 4;
  const MAX_FILE_BYTES = 10 * 1024 * 1024;
  const ALLOWED_ATTACHMENT_TYPES = new Set(["image/png", "image/jpeg", "image/webp", "application/pdf"]);

  let chatDialogElement: HTMLDivElement;
  let messagesElement: HTMLDivElement;
  let conversationMenuOpen = false;
  let finishingChat = false;
  let fileInputElement: HTMLInputElement;
  let restored = false;
  let resumeLoading = false;
  let hasConfirmedActiveChat = false;
  let checkingActiveChat = false;
  let resumeCheckedForOpen = false;
  let resumeOnly = false;
  let storedSessionHint = "";
  let authInitialized = false;
  let pollingSessionId = "";
  let pollTimer: ReturnType<typeof setInterval> | null = null;
  let draftSyncTimer: ReturnType<typeof setTimeout> | null = null;
  let lastDraftPublishedAt = 0;
  let draftHeartbeat: ReturnType<typeof setInterval> | null = null;
  let statusTimer: ReturnType<typeof setInterval> | null = null;
  let statusPollingActive = false;

  let session: ChatSession | null = null;
  let messages: ChatMessage[] = [];
  let waitingStatus: { waitingSinceMs: number | null; offerTicket: boolean } = { waitingSinceMs: null, offerTicket: false };
  let conversionSubmitting = false;
  let ticketRequested = false;
  let ticketFormOpen = false;
  let ticketSourceSessionId = "";
  let ticketAssistantTranscript = "";
  let guestOffer: "none" | "handoff" | "ticket" = "none";
  let convertedTicket: { ticketId: string; ticketNumber: number } | null = null;
  let guestMessages: GuestMessage[] = [];
  let status: SupportStatus | null = null;
  let entryOptions: EntryOption[] = [];
  $: visibleEntryOptions = entryOptions.filter((option) => isChatEntryVisible(option, status));
  $: financeEntryOptions = filterChatOptionsByDepartment(visibleEntryOptions, "finance")
    .filter((option) => getFinanceEntryAction(option) !== null);
  $: supportEntryOptions = filterChatOptionsByDepartment(visibleEntryOptions, "support");
  $: selectedSupportOption = supportEntryOptions.find((option) => option.id === selectedEntryOptionId);
  $: humanSupportOption = selectedSupportOption?.initialHandling === "ai" && canStartHumanChat(selectedSupportOption, status)
    ? selectedSupportOption : supportEntryOptions.length === 1 && supportEntryOptions[0].initialHandling === "ai"
      && canStartHumanChat(supportEntryOptions[0], status) ? supportEntryOptions[0] : null;
  $: canRequestHuman = humanSupportOption !== null;
  let entryOptionsLoading = false;
  let entryOptionsRequest: Promise<void> | null = null;
  let selectedEntryOptionId = "";
  let selectedEntryOptionLabel = "";
  let guestReply = "";
  let reply = "";
  let pendingImages: PendingImage[] = [];
  let dragActive = false;
  let assistantSending = false;
  let unresolvedCount = 0;
  let starting = false;
  let sending = false;
  let loadingMessages = false;
  let errorMessage = "";
  let attachmentError = "";
  let newMessageCount = 0;
  let handoffRequested = false;
  let authStep: "login" | "unit" | "profile" | "ready" = "login";
  let loginEmail = "";
  let loginPassword = "";
  let authSubmitting = false;
  let selectedGroupId = 0;
  let selectedUnitId = 0;
  let authRequiredForSession = false;
  let financeAction: FinanceEntryAction | "portal" | null = null;
  let configuredDepartment = entryDepartment;
  $: if (entryDepartment !== configuredDepartment) {
    configuredDepartment = entryDepartment;
    ticketRequested = false;
    ticketFormOpen = false;
    ticketSourceSessionId = "";
    ticketAssistantTranscript = "";
    financeAction = null;
    handoffRequested = false;
    selectedEntryOptionId = "";
    selectedEntryOptionLabel = "";
  }
  $: activeDepartment = entryDepartment;
  $: canOpenTicket = status?.isOpen === true || status?.hoursConfigured === false || guestOffer !== "none";
  let initializedDepartment: "support" | "finance" | null = null;
  let authState: AuthState = {
    authenticated: false,
    name: "",
    email: "",
    groupName: null,
    unitName: null,
    requiresUnitSelection: false,
    groups: [],
  };

  $: if (!authInitialized) initializeAuthState();
  $: if (browser && isOpen && !restored) restoreStoredState();
  $: if (browser) syncPolling(isOpen && !authRequiredForSession && !resumeLoading, session?.sessionId ?? "");
  $: if (browser) syncStatusPolling(isOpen);

  $: if (browser && isOpen && restored && initializedDepartment !== activeDepartment) {
    initializedDepartment = activeDepartment;
    if (activeDepartment === "finance" && !resumeOnly && !ticketRequested) {
      handoffRequested = false;
    } else if (activeDepartment === "support" && !session && !resumeOnly && !ticketRequested) {
      handoffRequested = false;
      authStep = "login";
      selectedEntryOptionId = "";
      selectedEntryOptionLabel = "";
    }
  }
  $: if (browser && isOpen && restored && !resumeCheckedForOpen) {
    resumeCheckedForOpen = true;
    hasConfirmedActiveChat = false;
    if (!convertedTicket && !starting) void checkRestorableChat();
  }
  $: if (!isOpen) {
    resumeCheckedForOpen = false;
    initializedDepartment = null;
    financeAction = null;
  }
  $: if (browser && restored) persistDraft(reply);
  $: if (browser && restored && guestMessages) persistGuestConversation();
  $: selectedUnits = authState.groups.find((group) => group.id === selectedGroupId)?.units ?? [];
  $: departmentSessionMismatch = session !== null
    && (session.department ?? "support") !== activeDepartment;
  $: ticketDescription = (session
    ? messages.filter((message) => message.authorType === "customer" && !message.optimistic).map((message) => message.body)
    : guestMessages.filter((message) => message.role === "customer").map((message) => message.body))
      .filter((body) => body.trim() && !/^(?:solicito atendimento|quero (?:abrir|criar) (?:um )?chamado|falar com a equipe)/i.test(body.trim()))
      .slice(-6).join("\n\n").slice(0, 10000);
  $: ticketFormReady = authState.authenticated && !authState.requiresNameConfirmation
    && !authState.requiresUnitSelection && authStep === "ready" && !handoffRequested && !resumeLoading
    && (!ticketSourceSessionId || session?.sessionId === ticketSourceSessionId);

  function initializeAuthState(): void {
    authState = {
      authenticated: customerSupport.authenticated,
      name: customerSupport.name,
      email: customerSupport.email,
      requiresNameConfirmation: customerSupport.requiresNameConfirmation ?? needsCustomerNameConfirmation(customerSupport.name, customerSupport.email),
      groupName: customerSupport.groupName,
      unitName: customerSupport.unitName,
      requiresUnitSelection: customerSupport.requiresUnitSelection ?? false,
      groups: customerSupport.groups ?? [],
    };
    loginEmail = customerSupport.email;
    prepareUnitSelection();
    authInitialized = true;
  }

  function prepareUnitSelection(): void {
    const currentGroup = authState.groups.find((group) => group.name === authState.groupName);
    const group = currentGroup ?? authState.groups[0] ?? null;
    selectedGroupId = group?.id ?? 0;
    selectedUnitId = group?.units.length === 1 ? group.units[0]?.id ?? 0 : 0;
  }

  function nowIso(): string {
    return new Date().toISOString();
  }

  function createGuestMessage(role: GuestMessage["role"], body: string): GuestMessage {
    return {
      id: `${role}-${Date.now()}-${Math.random().toString(36).slice(2)}`,
      role,
      body,
      createdAt: nowIso(),
    };
  }

  function ensureGuestGreeting(): void {
    if (guestMessages.length > 0) return;
    guestMessages = [
      createGuestMessage(
        "assistant",
        "Olá! Como posso ajudar?",
      ),
    ];
  }

  function restoreStoredState(): void {
    restored = true;
    reply = window.sessionStorage.getItem(DRAFT_KEY) ?? "";

    guestMessages = readRestorableSupportGuestMessages(window.sessionStorage, GUEST_KEY);
    if (guestMessages[0]?.role === "assistant" &&
      guestMessages[0].body === "Olá! Sou o Assistente F10. Posso tentar resolver sua dúvida agora. Você também pode pedir para falar com alguém da equipe a qualquer momento.") {
      guestMessages = [{ ...guestMessages[0], body: "Olá! Como posso ajudar?" }, ...guestMessages.slice(1)];
    }
    if (guestMessages.length === 0) {
      const priorMessages = readRestorableSupportGuestMessages(
        window.sessionStorage,
        SUPPORT_ASSISTANT_GUEST_KEY,
      );
      if (priorMessages.length > 0) {
        guestMessages = priorMessages;
        window.sessionStorage.setItem(GUEST_KEY, JSON.stringify(priorMessages));
      }
    }
    updateUnresolvedCount(guestMessages.length > 0 ? Number(window.sessionStorage.getItem(UNRESOLVED_KEY)) : 0);
    ensureGuestGreeting();

    // O navegador guarda apenas a referência utilizada para preservar o rascunho.
    try {
      const raw = window.sessionStorage.getItem(STORAGE_KEY);
      const stored = raw ? JSON.parse(raw) as Partial<ChatSession> : null;
      storedSessionHint = typeof stored?.sessionId === "string" ? stored.sessionId : "";
    } catch {
      storedSessionHint = "";
    }
  }

  function requireChatLogin(message = "Entre na sua conta F10 para retomar o atendimento."): void {
    storedSessionHint = session?.sessionId ?? storedSessionHint;
    clearStoredSession();
    resumeOnly = true;
    authState = { ...authState, authenticated: false, requiresUnitSelection: false, groups: [] };
    authStep = "login";
    handoffRequested = true;
    errorMessage = message;
  }

  async function checkActiveChatAvailability(): Promise<void> {
    if (checkingActiveChat || !authState.authenticated || authState.requiresUnitSelection
      || session || handoffRequested || convertedTicket) return;
    checkingActiveChat = true;
    try {
      const response = await fetch("/api/support/chat/resume", { cache: "no-store" });
      const payload = response.ok ? await response.json() as { active?: boolean } : null;
      hasConfirmedActiveChat = payload?.active === true;
    } catch {
      hasConfirmedActiveChat = false;
    } finally {
      checkingActiveChat = false;
    }
  }

  async function checkRestorableChat(): Promise<void> {
    if (authState.authenticated && !authState.requiresUnitSelection) {
      if (session || storedSessionHint) await recoverActiveChat();
      else await checkActiveChatAvailability();
    } else if (session || storedSessionHint) {
      requireChatLogin("Entre na sua conta F10 para verificar seus atendimentos.");
      await scrollToLatest();
    }
  }

  async function requestResumeChat(): Promise<void> {
    resumeOnly = true;
    handoffRequested = true;
    errorMessage = "";
    if (!authState.authenticated) {
      requireChatLogin();
      await scrollToLatest();
      return;
    }
    await continueAfterAuthentication();
  }

  async function recoverActiveChat(): Promise<"resumed" | "none" | "error"> {
    if (resumeLoading) return "error";
    resumeLoading = true;
    try {
      const response = await fetch("/api/support/chat/resume", {
        method: "POST",
        cache: "no-store",
      });
      const payload = await response.json() as { session?: ChatSession | null; error?: string };

      if (response.status === 401) {
        requireChatLogin();
        return "error";
      }
      if (response.status === 409 && payload.error === "CUSTOMER_CONTEXT_REQUIRED") {
        if (session || storedSessionHint || !handoffRequested) resumeOnly = true;
        storedSessionHint = session?.sessionId ?? storedSessionHint;
        clearStoredSession();
        authState = { ...authState, requiresUnitSelection: true };
        authStep = "unit";
        handoffRequested = true;
        prepareUnitSelection();
        return "error";
      }
      if (!response.ok) {
        errorMessage = "Não foi possível recuperar seu atendimento. Tente novamente.";
        return "error";
      }

      const recovered = payload.session;
      const priorSessionId = session?.sessionId ?? storedSessionHint;
      if (!recovered) {
        hasConfirmedActiveChat = false;
        if (priorSessionId) {
          clearStoredSession();
          storedSessionHint = "";
          reply = "";
          revokeImages(pendingImages);
          pendingImages = [];
          persistDraft("");
        }
        return "none";
      }
      if (!recovered.sessionId || !recovered.token || !recovered.expiresAt) {
        errorMessage = "Não foi possível recuperar seu atendimento.";
        return "error";
      }

      if (priorSessionId !== recovered.sessionId) {
        messages = [];
        reply = "";
        revokeImages(pendingImages);
        pendingImages = [];
        persistDraft("");
      }

      session = recovered;
      hasConfirmedActiveChat = false;
      storedSessionHint = recovered.sessionId;
      persistSession(recovered);
      resumeOnly = false;
      handoffRequested = false;
      authRequiredForSession = false;
      authStep = "ready";
      errorMessage = "";
      await refreshMessages(true);
      return "resumed";
    } catch {
      errorMessage = "Não foi possível recuperar seu atendimento. Tente novamente.";
      return "error";
    } finally {
      resumeLoading = false;
    }
  }

  function persistSession(value: ChatSession): void {
    if (!browser) return;
    try {
      window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(value));
    } catch {
      // A sessão continua disponível no servidor.
    }
  }

  function persistDraft(value: string): void {
    if (!browser) return;
    if (value) window.sessionStorage.setItem(DRAFT_KEY, value);
    else window.sessionStorage.removeItem(DRAFT_KEY);
  }

  function persistGuestConversation(): void {
    if (!browser) return;
    try {
      window.sessionStorage.setItem(GUEST_KEY, JSON.stringify(guestMessages.slice(-30)));
    } catch {
      // Falhas de armazenamento não devem interromper o atendimento.
    }
  }

  function clearStoredSession(): void {
    if (browser) {
      try { window.sessionStorage.removeItem(STORAGE_KEY); } catch {}
    }
    session = null;
    hasConfirmedActiveChat = false;
    waitingStatus = { waitingSinceMs: null, offerTicket: false };
    messages = [];
    newMessageCount = 0;
    authRequiredForSession = false;
  }

  async function publishLiveDraft(body: string, expectedSessionId?: string): Promise<void> {
    const activeSession = session;
    if (!activeSession || (expectedSessionId && activeSession.sessionId !== expectedSessionId)) return;

    try {
      await fetch(`/api/support/chat/${encodeURIComponent(activeSession.sessionId)}/messages`, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${activeSession.token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ body }),
        keepalive: body.length === 0,
      });
    } catch {
      // A prévia é temporária e não interfere no envio das mensagens.
    }
  }

  function handleCustomerDraftInput(event: Event): void {
    if (draftSyncTimer) clearTimeout(draftSyncTimer);
    if (!session || !isOpen || authRequiredForSession) return;

    const body = (event.currentTarget as HTMLTextAreaElement).value;
    const remaining = Math.max(0, 500 - (Date.now() - lastDraftPublishedAt));
    if (remaining === 0) {
      lastDraftPublishedAt = Date.now();
      void publishLiveDraft(body);
      return;
    }

    draftSyncTimer = setTimeout(() => {
      lastDraftPublishedAt = Date.now();
      void publishLiveDraft(body);
    }, remaining);
  }

  function syncPolling(shouldPoll: boolean, sessionId: string): void {
    const desiredSessionId = shouldPoll ? sessionId : "";
    if (desiredSessionId === pollingSessionId) return;

    if (pollTimer) {
      clearInterval(pollTimer);
      pollTimer = null;
    }
    if (draftHeartbeat) {
      clearInterval(draftHeartbeat);
      draftHeartbeat = null;
    }
    if (draftSyncTimer) {
      clearTimeout(draftSyncTimer);
      draftSyncTimer = null;
    }
    if (pollingSessionId && pollingSessionId !== desiredSessionId) {
      void publishLiveDraft("", pollingSessionId);
    }

    pollingSessionId = desiredSessionId;
    if (!desiredSessionId) return;

    void refreshMessages(true);
    pollTimer = setInterval(() => void refreshMessages(false), 4_000);
    draftHeartbeat = setInterval(() => {
      if (reply.trim()) void publishLiveDraft(reply, desiredSessionId);
    }, 3_000);
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
    void refreshEntryOptions();
    statusTimer = setInterval(() => {
      void refreshStatus();
      void refreshEntryOptions();
      void checkActiveChatAvailability();
    }, 60_000);
  }

  async function refreshStatus(): Promise<void> {
    try {
      const response = await fetch("/api/support/chat/status", { cache: "no-store" });
      status = response.ok ? await response.json() as SupportStatus : null;
    } catch {
      status = null;
      // O chat continua funcional mesmo sem o indicador de disponibilidade.
    }
  }

  function refreshEntryOptions(): Promise<void> {
    if (entryOptionsRequest) return entryOptionsRequest;
    entryOptionsLoading = true;
    entryOptionsRequest = loadEntryOptions();
    return entryOptionsRequest;
  }

  async function loadEntryOptions(): Promise<void> {
    try {
      const response = await fetch("/api/support/chat/options", { cache: "no-store" });
      if (!response.ok) {
        entryOptions = [];
        return;
      }
      const payload = await response.json() as { options?: EntryOption[] };
      entryOptions = Array.isArray(payload.options) ? payload.options : [];
    } catch {
      entryOptions = [];
    } finally {
      entryOptionsLoading = false;
      entryOptionsRequest = null;
    }
  }

  function availabilityText(): string {
    if (!status) return "Atendimento F10";
    if (status.isOpen === false) {
      return status.nextOpenLabel
        ? `Equipe retorna ${status.nextOpenLabel.toLowerCase()}`
        : "Equipe fora do horário agora";
    }
    if ((status.onlineAgents ?? 0) > 0) {
      return `${status.onlineAgents} ${status.onlineAgents === 1 ? "atendente online" : "atendentes online"}`;
    }
    if (status.isOpen === true) return "Equipe dentro do horário";
    return "Atendimento F10";
  }

  function sessionStatusText(): string {
    if (!session) return "Assistente F10";
    if (session.aiState === "human") return "Equipe F10 atendendo";
    if (session.aiState === "escalated" || session.aiState === "disabled") return "Aguardando equipe F10";
    return "Assistente F10";
  }

  function apiErrorMessage(error: string): string {
    if (error === "RATE_LIMITED") return "Muitas tentativas em pouco tempo. Aguarde alguns minutos e tente novamente.";
    if (error === "INVALID_CREDENTIALS") return "E-mail ou senha inválidos. Use os mesmos dados de acesso do F10.";
    if (error === "CUSTOMER_AUTH_REQUIRED") return "Sua sessão F10 expirou. Entre novamente para continuar.";
    if (error === "UNIT_NOT_AUTHORIZED") return "Esta unidade não está disponível para sua conta F10.";
    if (error === "UNIT_SELECTION_UNAVAILABLE") return "Não foi possível confirmar sua unidade. Tente novamente.";
    if (error === "CHAT_UNAVAILABLE") return "Não foi possível abrir o atendimento humano agora. Tente novamente.";
    if (error === "FINANCE_QUEUE_UNAVAILABLE") return "O atendimento financeiro ainda não está configurado. Entre em contato com a equipe F10.";
    if (error === "CHAT_QUEUE_MISMATCH") return "Já existe uma conversa em outra fila. Finalize esse atendimento antes de iniciar um novo com o Financeiro.";
    if (error === "INVALID_MESSAGE") return "Escreva uma mensagem para iniciar o atendimento.";
    if (error === "HUMAN_HANDOFF_REQUIRED") return "Tente novamente pelo botão Falar com a equipe.";
    if (error === "SUPPORT_QUEUE_UNAVAILABLE") return "O atendimento humano está indisponível no momento.";
    if (error === "INVALID_SESSION") return "Este atendimento expirou. Inicie uma nova conversa.";
    if (error === "CHAT_CLOSED") return "Este atendimento foi encerrado. Inicie uma nova conversa se ainda precisar de ajuda.";
    if (error === "INVALID_ENTRY_OPTION") return "Esta opção de atendimento não está mais disponível.";
    if (error === "SUPPORT_IMAGE_TOO_MANY" || error === "TOO_MANY_ATTACHMENTS") return "Envie no máximo 4 imagens por mensagem.";
    if (error === "SUPPORT_IMAGE_SIZE_INVALID") return "Cada imagem pode ter no máximo 8 MB.";
    if (error === "SUPPORT_IMAGE_TYPE_INVALID") return "Use imagens PNG, JPG/JPEG ou WebP.";
    if (error === "ATTACHMENT_STORAGE_UNAVAILABLE") return "O envio de imagens está temporariamente indisponível. Você ainda pode enviar texto.";
    return "Não foi possível concluir esta operação agora.";
  }

  function buildAssistantContext(): string {
    const context = guestMessages
      .filter((message) => message.role === "customer")
      .slice(-6)
      .map((message) => `Cliente: ${message.body.trim()}`)
      .join("\n");
    return `${selectedEntryOptionLabel ? `Assunto: ${selectedEntryOptionLabel}\n` : ""}${context}`.slice(0, 3_000);
  }

  function updateUnresolvedCount(value: unknown): void {
    unresolvedCount = typeof value === "number" && Number.isFinite(value)
      ? Math.max(0, Math.min(3, Math.trunc(value)))
      : 0;
    if (browser) window.sessionStorage.setItem(UNRESOLVED_KEY, String(unresolvedCount));
  }

  function buildGuestTranscript(): string {
    const optionContext = selectedEntryOptionLabel ? `Assunto selecionado: ${selectedEntryOptionLabel}\n` : "";
    const transcript = guestMessages
      .slice(-18)
      .map((message) => `${message.role === "customer" ? "Cliente" : "Assistente F10"}: ${message.body.trim()}`)
      .join("\n");
    return `${optionContext}${transcript}`.trim().slice(0, 8_000);
  }

  async function scrollToLatest(behavior: ScrollBehavior = "smooth"): Promise<void> {
    await tick();
    messagesElement?.scrollTo({ top: messagesElement.scrollHeight, behavior });
    newMessageCount = 0;
  }

  function resetFinanceChoice(): void {
    financeAction = null;
    handoffRequested = false;
    selectedEntryOptionId = "";
    selectedEntryOptionLabel = "";
    errorMessage = "";
  }

  async function selectFinanceOption(option: EntryOption): Promise<void> {
    if (!isChatEntryVisible(option, status)) return;
    const action = getFinanceEntryAction(option);
    if (!action) return;

    financeAction = action;
    selectedEntryOptionId = option.id;
    selectedEntryOptionLabel = option.label;
    errorMessage = "";

    if (action === "human") {
      await requestHumanSupport();
      return;
    }

    if (!authState.authenticated) {
      authStep = "login";
      handoffRequested = true;
    } else if (authState.requiresUnitSelection) {
      authStep = "unit";
      prepareUnitSelection();
      handoffRequested = true;
    } else {
      authStep = "ready";
      handoffRequested = false;
    }
  }

  function handleFinancePortalClick(event: MouseEvent): void {
    if (authState.authenticated && !authState.requiresUnitSelection) return;

    event.preventDefault();
    financeAction = "portal";
    selectedEntryOptionId = "";
    selectedEntryOptionLabel = "";
    errorMessage = "";
    handoffRequested = true;

    if (!authState.authenticated) {
      authStep = "login";
    } else {
      authStep = "unit";
      prepareUnitSelection();
    }
  }

  function cancelTicketRequest(): void {
    ticketRequested = false;
    ticketFormOpen = false;
    ticketSourceSessionId = "";
    ticketAssistantTranscript = "";
    handoffRequested = false;
    resumeOnly = false;
    errorMessage = "";
    if (authStep === "profile") authStep = "login";
  }

  async function requestTicket(): Promise<void> {
    if (conversionSubmitting || resumeLoading) return;
    if (!ticketRequested) {
      ticketSourceSessionId = session?.sessionId ?? "";
      ticketAssistantTranscript = session ? "" : buildGuestTranscript();
    }
    ticketRequested = true;
    ticketFormOpen = true;
    resumeOnly = false;
    handoffRequested = true;
    errorMessage = "";
    if (!authState.authenticated) {
      authStep = "login";
      await scrollToLatest();
      return;
    }
    await continueAfterAuthentication();
    await scrollToLatest();
  }

  function handleTicketFormOpen(): void {
    ticketSourceSessionId = session?.sessionId ?? "";
    ticketAssistantTranscript = "";
    ticketRequested = true;
    void scrollToLatest();
  }

  async function reauthenticateTicket(): Promise<void> {
    ticketRequested = true;
    requireChatLogin("Entre novamente na sua conta F10 para enviar o chamado.");
    await scrollToLatest();
  }

  async function sendGuestMessage(): Promise<void> {
    const body = guestReply.trim();
    if (!body || assistantSending || ticketRequested || handoffRequested) return;

    guestOffer = "none";
    errorMessage = "";
    guestReply = "";
    const previousContext = buildAssistantContext();
    guestMessages = [...guestMessages, createGuestMessage("customer", body)];
    assistantSending = true;
    await scrollToLatest();

    try {
      const response = await fetch("/api/support/chat/assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: body,
          conversationContext: previousContext,
          unresolvedCount,
        }),
      });
      const payload = await response.json() as Record<string, unknown>;

      if (!response.ok) {
        errorMessage = apiErrorMessage(typeof payload.error === "string" ? payload.error : "");
        guestOffer = "ticket";
        await scrollToLatest();
        return;
      }

      const answer = typeof payload.answer === "string" && payload.answer.trim()
        ? payload.answer.trim()
        : "Essa situação precisa de uma análise da nossa equipe técnica.";
      updateUnresolvedCount(payload.unresolvedCount);
      const needsHuman = payload.requiresHuman === true;
      const offersTicket = payload.offerTicket === true || payload.action === "ticket_offer";
      if (needsHuman || offersTicket) {
        await refreshStatus();
        guestOffer = needsHuman ? "handoff" : "ticket";
      }
      const responseText = needsHuman && status?.isOpen === false
        ? "Essa situação precisa de uma análise da nossa equipe técnica."
        : answer;
      guestMessages = [...guestMessages, createGuestMessage("assistant", responseText)];
      await scrollToLatest();
    } catch {
      guestMessages = [
        ...guestMessages,
        createGuestMessage(
          "assistant",
          "Não consegui consultar o assistente agora. Tente novamente ou abra um chamado aqui mesmo.",
        ),
      ];
      guestOffer = "ticket";
      await scrollToLatest();
    } finally {
      assistantSending = false;
    }
  }

  function handleGuestKeydown(event: KeyboardEvent): void {
    if (event.isComposing) return;
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      void sendGuestMessage();
    }
  }

  async function selectSupportOption(option: EntryOption): Promise<void> {
    if (!isChatEntryVisible(option, status)) return;
    selectedEntryOptionId = option.id;
    selectedEntryOptionLabel = option.label;
    errorMessage = "";
    if (option.initialHandling === "human") {
      await requestHumanSupport();
      return;
    }
    guestMessages = [...guestMessages,
      createGuestMessage("customer", option.label),
      createGuestMessage("assistant", "Conte um pouco mais sobre o que precisa.")];
    await scrollToLatest();
  }

  async function ensureHumanEntryAvailable(): Promise<boolean> {
    await Promise.all([refreshStatus(), refreshEntryOptions()]);
    const option = entryOptions.find((item) => item.id === selectedEntryOptionId);
    if (option && canStartHumanChat(option, status)) return true;
    handoffRequested = false;
    if (activeDepartment === "finance") {
      resetFinanceChoice();
      errorMessage = "Esta opção de atendimento não está mais disponível.";
    } else {
      guestOffer = "handoff";
      selectedEntryOptionId = "";
      selectedEntryOptionLabel = "";
      errorMessage = "";
    }
    await scrollToLatest();
    return false;
  }

  async function requestHumanSupport(option?: EntryOption): Promise<void> {
    if (option) {
      selectedEntryOptionId = option.id;
      selectedEntryOptionLabel = option.label;
    }
    if (starting || handoffRequested || !await ensureHumanEntryAvailable()) return;
    resumeOnly = false;
    handoffRequested = true;
    errorMessage = "";

    if (authState.authenticated) {
      if (authState.requiresNameConfirmation) {
        authStep = "profile";
        await scrollToLatest();
        return;
      }
      if (authState.requiresUnitSelection) {
        authStep = "unit";
        prepareUnitSelection();
        await scrollToLatest();
        return;
      }
      authStep = "ready";
      await startHumanChat();
      return;
    }

    authStep = "login";
    await scrollToLatest();
  }

  async function submitLogin(): Promise<void> {
    if (authSubmitting) return;
    errorMessage = "";
    authSubmitting = true;

    try {
      const response = await fetch("/api/support/chat/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: loginEmail.trim(), password: loginPassword }),
      });
      const payload = await response.json() as Record<string, unknown>;
      if (!response.ok) {
        errorMessage = apiErrorMessage(typeof payload.error === "string" ? payload.error : "");
        return;
      }

      authState = payload as unknown as AuthState;
      loginPassword = "";
      authRequiredForSession = false;
      if (authState.requiresNameConfirmation) {
        authStep = "profile";
        await scrollToLatest();
        return;
      }
      if (authState.requiresUnitSelection) {
        authStep = "unit";
        prepareUnitSelection();
        return;
      }

      authRequiredForSession = false;
      await continueAfterAuthentication();
    } catch {
      errorMessage = "Não foi possível validar sua conta F10 agora. Tente novamente em instantes.";
    } finally {
      authSubmitting = false;
    }
  }

  function handleGroupChange(event: Event): void {
    const target = event.currentTarget as HTMLSelectElement;
    selectedGroupId = Number(target.value);
    const units = authState.groups.find((group) => group.id === selectedGroupId)?.units ?? [];
    selectedUnitId = units.length === 1 ? units[0]?.id ?? 0 : 0;
  }

  async function submitUnitSelection(): Promise<void> {
    if (authSubmitting || !selectedGroupId || !selectedUnitId) return;
    errorMessage = "";
    authSubmitting = true;

    try {
      const response = await fetch("/api/support/chat/auth/unit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ groupId: selectedGroupId, unitId: selectedUnitId }),
      });
      const payload = await response.json() as Record<string, unknown>;
      if (!response.ok) {
        errorMessage = apiErrorMessage(typeof payload.error === "string" ? payload.error : "");
        return;
      }

      authState = payload as unknown as AuthState;
      authRequiredForSession = false;
      await continueAfterAuthentication();
    } catch {
      errorMessage = "Não foi possível confirmar a unidade agora. Tente novamente.";
    } finally {
      authSubmitting = false;
    }
  }

  async function handleProfileSaved(name: string): Promise<void> {
    authState = { ...authState, name, requiresNameConfirmation: false };
    await continueAfterAuthentication();
  }

  async function continueAfterAuthentication(): Promise<void> {
    if (authState.requiresNameConfirmation) {
      authStep = "profile";
      await scrollToLatest();
      return;
    }
    if (authState.requiresUnitSelection) {
      authStep = "unit";
      prepareUnitSelection();
      await scrollToLatest();
      return;
    }
    authStep = "ready";
    const result = await recoverActiveChat();
    if (ticketRequested) {
      if (result === "error") return;
      if (ticketSourceSessionId && session?.sessionId !== ticketSourceSessionId) {
        handoffRequested = true;
        errorMessage = "A conversa original foi encerrada. Confira seus chamados antes de iniciar outro atendimento.";
        return;
      }
      if (result === "resumed" && (session?.department ?? "support") !== activeDepartment) {
        cancelTicketRequest();
        errorMessage = "Existe um atendimento em outro setor. Continue por essa conversa.";
        return;
      }
      ticketSourceSessionId = session?.sessionId ?? "";
      handoffRequested = false;
      resumeOnly = false;
      ticketFormOpen = true;
      await scrollToLatest();
      return;
    }
    if (result !== "none") return;
    if (resumeOnly) {
      resumeOnly = false;
      handoffRequested = false;
      errorMessage = "Não há atendimento em andamento nesta unidade.";
      return;
    }
    if (activeDepartment === "finance") {
      handoffRequested = false;
      if (financeAction === "human") await startHumanChat(true);
      else if (financeAction === "pix") {
        await Promise.all([refreshStatus(), refreshEntryOptions()]);
        const option = entryOptions.find((item) => item.id === selectedEntryOptionId);
        if (!option || !isChatEntryVisible(option, status) || getFinanceEntryAction(option) !== "pix") {
          resetFinanceChoice();
          errorMessage = "Esta opção de atendimento não está mais disponível.";
        }
      }
      return;
    }
    await startHumanChat(true);
  }

  async function startHumanChat(checkedActiveChat = false): Promise<void> {
    if (session || starting || resumeLoading || !authState.authenticated || ticketRequested) return;
    starting = true;
    if (!await ensureHumanEntryAvailable()) { starting = false; return; }
    if (authState.requiresNameConfirmation) {
      starting = false;
      authStep = "profile";
      await scrollToLatest();
      return;
    }
    authStep = "ready";
    errorMessage = "";
    if (!checkedActiveChat && await recoverActiveChat() !== "none") {
      starting = false;
      return;
    }

    const lastCustomerMessage = [...guestMessages].reverse().find((message) => message.role === "customer")?.body;
    const message = activeDepartment === "finance"
      ? "Solicito atendimento financeiro."
      : lastCustomerMessage?.trim() || "Solicito atendimento com a equipe F10.";

    try {
      const response = await fetch("/api/support/chat/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phone: "",
          message,
          entryOptionId: selectedEntryOptionId || null,
          department: activeDepartment,
          contextUrl: browser ? window.location.href : "",
          pageTitle: browser ? document.title : "",
          helpContext: activeDepartment === "finance" ? "Financeiro F10" : "Central de Ajuda F10",
          forceHuman: true,
          handoffTranscript: buildGuestTranscript(),
        }),
      });
      const payload = await response.json() as Record<string, unknown>;

      if (!response.ok) {
        if (payload.error === "SUPPORT_OUTSIDE_HOURS") {
          await refreshStatus();
          status = status ? { ...status, isOpen: false, nextOpenLabel: typeof payload.nextOpenLabel === "string" ? payload.nextOpenLabel : status.nextOpenLabel } : {
            supportDisplayName: "F10", hoursConfigured: true, isOpen: false,
            nextOpenLabel: typeof payload.nextOpenLabel === "string" ? payload.nextOpenLabel : null,
            onlineAgents: null, averageWaitMinutes: null, waitSampleCount: 0,
          };
          guestOffer = "handoff";
          handoffRequested = false;
          await refreshEntryOptions();
          if (activeDepartment === "finance") resetFinanceChoice();
          await scrollToLatest();
          return;
        }
        if (payload.error === "INVALID_ENTRY_OPTION") {
          await refreshEntryOptions();
          if (activeDepartment === "finance") resetFinanceChoice();
          else {
            selectedEntryOptionId = "";
            selectedEntryOptionLabel = "";
            handoffRequested = false;
            guestOffer = "handoff";
          }
          errorMessage = "Esta opção de atendimento não está mais disponível.";
          return;
        }
        if (response.status === 401) {
          authState = { ...authState, authenticated: false, requiresUnitSelection: false, groups: [] };
          authStep = "login";
          handoffRequested = true;
        }
        const error = typeof payload.error === "string" ? payload.error : "";
        const diagnostic = typeof payload.diagnosticCode === "string" ? payload.diagnosticCode : "";
        if (error === "FINANCE_QUEUE_UNAVAILABLE" || error === "CHAT_QUEUE_MISMATCH") {
          errorMessage = apiErrorMessage(error);
        } else if (error === "CHAT_UNAVAILABLE" && diagnostic === "SUPPORT_QUEUE_UNAVAILABLE") {
          errorMessage = "A fila de atendimento humano está indisponível. A equipe F10 precisa verificar a configuração.";
        } else if (error === "CHAT_UNAVAILABLE" && diagnostic === "RATE_LIMIT_NOT_CONFIGURED") {
          errorMessage = "O atendimento humano precisa de uma configuração no servidor F10.";
        } else if (error === "CHAT_UNAVAILABLE" && diagnostic === "DATABASE_UNAVAILABLE") {
          errorMessage = "A conexão com o atendimento está indisponível. Tente novamente em instantes.";
        } else {
          errorMessage = apiErrorMessage(error);
        }
        return;
      }

      const nextSession: ChatSession = {
        sessionId: String(payload.sessionId ?? ""),
        token: String(payload.token ?? ""),
        ticketNumber: Number(payload.ticketNumber ?? 0),
        expiresAt: String(payload.expiresAt ?? ""),
        aiState: (payload.aiState ?? "disabled") as ChatSession["aiState"],
        entryOptionLabel: String(payload.entryOptionLabel ?? selectedEntryOptionLabel ?? ""),
        department: payload.department === "finance" ? "finance" : "support",
      };

      if (!nextSession.sessionId || !nextSession.token || !nextSession.expiresAt) {
        errorMessage = "O servidor iniciou o atendimento, mas não retornou uma sessão válida.";
        return;
      }

      session = nextSession;
      hasConfirmedActiveChat = false;
      storedSessionHint = nextSession.sessionId;
      persistSession(nextSession);
      handoffRequested = false;
      authRequiredForSession = false;
      await refreshMessages(true);
    } catch {
      errorMessage = "Não foi possível iniciar o atendimento humano agora. Tente novamente.";
    } finally {
      starting = false;
    }
  }

  function isNearBottom(): boolean {
    if (!messagesElement) return true;
    return messagesElement.scrollHeight - messagesElement.scrollTop - messagesElement.clientHeight <= BOTTOM_THRESHOLD;
  }

  function handleMessagesScroll(): void {
    if (isNearBottom()) newMessageCount = 0;
  }

  async function refreshMessages(forceScroll: boolean): Promise<void> {
    if (!session || loadingMessages || authRequiredForSession || conversionSubmitting) return;
    const requestedSessionId = session.sessionId;
    loadingMessages = true;
    const wasNearBottom = isNearBottom();
    const previousServerMessages = messages.filter((message) => !message.optimistic);
    const previousLastId = previousServerMessages.at(-1)?.id;

    try {
      const response = await fetch(`/api/support/chat/${encodeURIComponent(session.sessionId)}/messages`, {
        headers: {
          Authorization: `Bearer ${session.token}`,
          ...(isOpen && document.visibilityState === "visible" ? { "X-F10-Chat-Presence": "active" } : {}),
        },
        cache: "no-store",
      });
      const payload = await response.json() as Record<string, unknown>;

      if (conversionSubmitting || session?.sessionId !== requestedSessionId) return;
      if (response.status === 401) {
        if (payload.error === "CUSTOMER_AUTH_REQUIRED") {
          requireChatLogin("Sua sessão F10 expirou. Entre novamente para retomar o atendimento.");
          return;
        }
        if (!resumeLoading) {
          const result = await recoverActiveChat();
          if (result === "none") errorMessage = "Este atendimento foi finalizado.";
        }
        return;
      }

      if (!response.ok) return;
      const previousOffer = waitingStatus.offerTicket;
      if (payload.waiting && typeof payload.waiting === "object") {
        const waiting = payload.waiting as Record<string, unknown>;
        waitingStatus = {
          waitingSinceMs: typeof waiting.waitingSinceMs === "number" ? waiting.waitingSinceMs : null,
          offerTicket: waiting.offerTicket === true,
        };
      }
      const nextMessages = Array.isArray(payload.messages) ? payload.messages as ChatMessage[] : [];
      const nextLastId = nextMessages.at(-1)?.id;
      const changed = nextMessages.length !== previousServerMessages.length || nextLastId !== previousLastId || messages.some((message) => message.optimistic);
      const added = Math.max(nextMessages.length - previousServerMessages.length, 0);
      messages = nextMessages;

      if (typeof payload.aiState === "string" && session) {
        session = { ...session, aiState: payload.aiState as ChatSession["aiState"] };
        persistSession(session);
      }

      if (changed || (!previousOffer && waitingStatus.offerTicket)) {
        if (forceScroll || wasNearBottom) await scrollToLatest(forceScroll ? "auto" : "smooth");
        else newMessageCount += added || 1;
      }
    } catch {
      // O polling tenta novamente no próximo ciclo.
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
      if (!ALLOWED_ATTACHMENT_TYPES.has(file.type)) {
        attachmentError = "Aceitos: PNG, JPG, WebP e PDF.";
        continue;
      }
      if (file.size < 1 || file.size > MAX_FILE_BYTES) {
        attachmentError = "Cada arquivo pode ter no máximo 10 MB.";
        continue;
      }
      valid.push(file);
    }

    const available = Math.max(MAX_FILES - pendingImages.length, 0);
    if (valid.length > available) attachmentError = "Envie no máximo 4 arquivos por mensagem.";
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
    addImageFiles(Array.from(event.dataTransfer?.files ?? []));
  }

  async function reactChatMessage(
    messageId: string,
    code: "like" | "heart" | "check" | "eyes",
  ): Promise<void> {
    if (!session) return;
    const response = await fetch(`/api/support/chat/${encodeURIComponent(session.sessionId)}/reactions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${session.token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ messageId, reaction: code }),
    });
    if (!response.ok) {
      attachmentError = "Não foi possível registrar a reação.";
      return;
    }
    await refreshMessages(false);
  }

  async function sendReply(): Promise<void> {
    if (!session || sending || conversionSubmitting || resumeLoading) return;
    const body = reply.trim();
    const images = [...pendingImages];
    if (!body && images.length === 0) return;

    errorMessage = "";
    attachmentError = "";
    sending = true;
    if (draftSyncTimer) clearTimeout(draftSyncTimer);
    void publishLiveDraft("");
    const optimisticId = `pending-${Date.now()}`;
    const optimisticMessage: ChatMessage = {
      id: optimisticId,
      authorType: "customer",
      body,
      createdAt: nowIso(),
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
    await scrollToLatest();

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
          if (error === "CUSTOMER_AUTH_REQUIRED") {
            requireChatLogin("Entre novamente para continuar o atendimento.");
          } else {
            const result = await recoverActiveChat();
            if (result === "resumed") errorMessage = "Conversa recuperada. Confira a mensagem e envie novamente.";
            else if (result === "none") errorMessage = "Este atendimento foi finalizado.";
          }
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
      if (reply.trim()) void publishLiveDraft(reply);
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

  function formatTime(value: string): string {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "";
    return new Intl.DateTimeFormat("pt-BR", { hour: "2-digit", minute: "2-digit" }).format(date);
  }

  function initials(value: string): string {
    return value
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase() ?? "")
      .join("") || "F10";
  }

  function hideBrokenImage(event: Event): void {
    const image = event.currentTarget as HTMLImageElement;
    image.style.display = "none";
  }

  function systemCardTitle(presentation: ChatMessage["presentation"]): string {
    if (presentation === "remote_access") return "Acesso remoto";
    if (presentation === "routing") return "Contexto do atendimento";
    if (presentation === "closed") return "Atendimento finalizado";
    return "Atendimento F10";
  }

  function handleOutsidePointerDown(event: PointerEvent): void {
    if (!isOpen || !chatDialogElement) return;
    if (event.target instanceof Node && !chatDialogElement.contains(event.target)) {
      conversationMenuOpen = false;
      onClose();
    }
  }

  function handleDialogKeydown(event: KeyboardEvent): void {
    if (!isOpen || event.key !== "Escape") return;
    event.preventDefault();

    if (conversationMenuOpen) {
      conversationMenuOpen = false;
      return;
    }

    onClose();
  }

  async function handleConvertedTicket(ticket: { ticketId: string; ticketNumber: number }): Promise<void> {
    clearStoredSession();
    storedSessionHint = "";
    resumeOnly = false;
    revokeImages(pendingImages);
    pendingImages = [];
    reply = "";
    guestReply = "";
    guestMessages = [];
    guestOffer = "none";
    ticketRequested = false;
    ticketFormOpen = false;
    ticketSourceSessionId = "";
    ticketAssistantTranscript = "";
    handoffRequested = false;
    conversionSubmitting = false;
    errorMessage = "";
    attachmentError = "";
    convertedTicket = ticket;
    if (browser) {
      window.sessionStorage.removeItem(GUEST_KEY);
      window.sessionStorage.removeItem(SUPPORT_ASSISTANT_GUEST_KEY);
      persistDraft("");
    }
    updateUnresolvedCount(0);
    await scrollToLatest();
  }

  function startNewConversation(): void {
    convertedTicket = null;
    resumeOnly = false;
    resetFinanceChoice();
    ensureGuestGreeting();
  }

  async function finishCustomerConversation(): Promise<void> {
    if (finishingChat || conversionSubmitting || resumeLoading || !browser) return;
    if (!window.confirm("Finalizar esta conversa?")) return;

    conversationMenuOpen = false;
    finishingChat = true;
    errorMessage = "";

    try {
      if (session || authState.authenticated) {
        const response = await fetch("/api/support/chat/close-current", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "same-origin",
        });

        if (!response.ok) {
          const result = await response.json().catch(() => ({})) as { error?: string };
          errorMessage = result.error === "CUSTOMER_AUTH_REQUIRED"
            ? "Entre novamente no F10 para finalizar a conversa."
            : result.error === "CHAT_UNIT_REQUIRED"
              ? "Selecione seu grupo e unidade antes de finalizar."
              : "Não foi possível finalizar a conversa. Tente novamente.";
          return;
        }
      }

      clearStoredSession();
      storedSessionHint = "";
      resumeOnly = false;
      revokeImages(pendingImages);
      pendingImages = [];
      guestMessages = [];
      guestOffer = "none";
      ticketRequested = false;
      ticketFormOpen = false;
      ticketSourceSessionId = "";
      ticketAssistantTranscript = "";
      guestReply = "";
      reply = "";
      handoffRequested = false;
      restored = false;
      window.sessionStorage.removeItem(GUEST_KEY);
      window.sessionStorage.removeItem(SUPPORT_ASSISTANT_GUEST_KEY);
      persistDraft("");
      updateUnresolvedCount(0);
      onClose();
    } catch {
      errorMessage = "Não foi possível finalizar a conversa. Tente novamente.";
    } finally {
      finishingChat = false;
    }
  }

  onDestroy(() => {
    if (draftSyncTimer) clearTimeout(draftSyncTimer);
    if (draftHeartbeat) clearInterval(draftHeartbeat);
    void publishLiveDraft("");
    if (pollTimer) clearInterval(pollTimer);
    if (statusTimer) clearInterval(statusTimer);
    revokeImages(pendingImages);
  });
</script>

<svelte:window on:pointerdown={handleOutsidePointerDown} on:keydown={handleDialogKeydown}/>

{#if isOpen}
  <div
    bind:this={chatDialogElement}
    class="fixed bottom-4 right-4 z-[10020] flex h-[min(680px,calc(100dvh-2rem))] w-[calc(100vw-2rem)] max-w-[420px] flex-col overflow-hidden rounded-[24px] border border-[#DDE1E9] bg-white shadow-[0_24px_80px_rgba(1,13,40,0.24)] sm:bottom-6 sm:right-6"
    role="dialog"
    aria-modal="false"
    aria-labelledby="support-chat-title"
  >
    <header class="flex shrink-0 items-center justify-between gap-3 border-b border-[#E7E9EF] bg-white px-4 py-3.5">
      <div class="flex min-w-0 items-center gap-3">
        <span class="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[#FFF0E4] text-[#EA6D0B]">
          {#if session && session.aiState !== "active"}<UserRound size={19} aria-hidden="true" />{:else}<Headset size={19} aria-hidden="true" />{/if}
        </span>
        <div class="min-w-0">
          <h2 id="support-chat-title" class="truncate text-[14px] font-semibold text-[#111A30]">
            {departmentSessionMismatch ? "Atendimento em andamento" : activeDepartment === "finance" ? "Financeiro F10" : session && session.aiState !== "active" ? "Atendimento F10" : "Helpdesk F10"}
          </h2>
          <div class="mt-0.5 flex items-center gap-1.5 text-[12px] text-[#6C7484]">
            <span class={`h-2 w-2 rounded-full ${session ? "bg-[#38A169]" : "bg-[#EA6D0B]"}`}></span>
            <span class="truncate">{session ? `#${session.ticketNumber} · ${sessionStatusText()}` : availabilityText()}</span>
          </div>
        </div>
      </div>
      <details bind:open={conversationMenuOpen} class="relative shrink-0">
        <summary aria-label="Opções da conversa" title="Opções da conversa"
          class="flex h-9 w-9 cursor-pointer list-none items-center justify-center rounded-full bg-[#F2F3F7] text-[#5F6676] transition hover:bg-[#E7E9EF] hover:text-[#000A57] focus-visible:ring-2 focus-visible:ring-[#000A57]">
          <EllipsisVertical size={19} aria-hidden="true"/>
        </summary>
        <div class="absolute right-0 top-11 z-50 w-[192px] rounded-xl border border-[#DDE1E9] bg-white p-1.5 shadow-[0_14px_36px_rgba(1,13,40,0.18)]">
          <button type="button" disabled={finishingChat}
            on:click={() => void finishCustomerConversation()}
            class="flex min-h-10 w-full items-center gap-2 rounded-lg px-3 text-left text-[13px] font-semibold text-[#A83F32] transition hover:bg-[#FFF0EC] disabled:opacity-50">
            {#if finishingChat}<LoaderCircle size={16} class="animate-spin"/>{:else}<CheckCircle2 size={16}/>{/if}
            Finalizar conversa
          </button>
        </div>
      </details>
    </header>

    <div bind:this={messagesElement} on:scroll={handleMessagesScroll} class="min-h-0 flex-1 overflow-y-auto bg-[#F8F9FC] px-4 py-4" aria-live="polite">
      {#if convertedTicket}
        <div class="space-y-4 rounded-2xl border border-[#DDE2EB] bg-white p-5 shadow-sm">
          <div class="flex items-center gap-3">
            <CheckCircle2 size={28} class="shrink-0 text-[#207345]"/>
            <div>
              <h3 class="text-[16px] font-semibold text-[#18233D]">Chamado #{convertedTicket.ticketNumber} aberto</h3>
              <p class="mt-1 text-[13px] leading-5 text-[#5E687A]">Seu chamado foi registrado. Nossa equipe dará continuidade por lá; você não precisa permanecer na fila.</p>
            </div>
          </div>
          <a href={`/cliente/chamados/${convertedTicket.ticketId}`} target="_blank" rel="noopener noreferrer" class="flex min-h-11 items-center justify-center rounded-xl bg-[#000A57] px-4 text-[14px] font-semibold text-white">Acompanhar chamado</a>
          <a href="/cliente/chamados" target="_blank" rel="noopener noreferrer" class="flex min-h-11 items-center justify-center rounded-xl border border-[#DDE2EB] text-[14px] font-semibold text-[#000A57]">Meus chamados</a>
          <button type="button" on:click={startNewConversation} class="w-full py-2 text-[13px] font-medium text-[#596171]">Iniciar outra conversa</button>
        </div>
      {:else if resumeLoading}
        <div class="flex items-center justify-center gap-2 py-8 text-[13px] text-[#697184]"><LoaderCircle size={18} class="animate-spin"/> Recuperando atendimento...</div>
      {:else if authStep === "profile" && authState.authenticated}
        <div class="space-y-4 rounded-2xl border border-[#DDE2EB] bg-white p-5 shadow-sm">
          <h3 class="text-[15px] font-semibold text-[#18233D]">Complete seu perfil</h3>
          <CustomerProfileForm onSaved={handleProfileSaved} />
        </div>
      {:else}
      {#if activeDepartment === "finance" && !session && financeAction === null && !handoffRequested}
        <div class="space-y-3 rounded-2xl border border-[#DDE2EB] bg-white p-4 shadow-sm">
          <h3 class="text-[14px] font-semibold text-[#18233D]">Como podemos ajudar?</h3>
          {#if entryOptionsLoading}
            <div class="flex items-center gap-2 py-3 text-[13px] text-[#697184]">
              <LoaderCircle size={16} class="animate-spin"/> Carregando opções...
            </div>
          {:else if financeEntryOptions.length > 0}
            {#each financeEntryOptions as option (option.id)}
              <button type="button" on:click={() => void selectFinanceOption(option)}
                class="flex min-h-[64px] w-full items-center gap-3 rounded-xl border border-[#DDE2EB] bg-white px-3 py-3 text-left transition hover:border-[#A8B4D7] hover:bg-[#F5F7FC]">
                <span class="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#EDF0FA] text-[#000A57]">
                  {#if getFinanceEntryAction(option) === "human"}
                    <UserRound size={18} aria-hidden="true"/>
                  {:else}
                    <CreditCard size={18} aria-hidden="true"/>
                  {/if}
                </span>
                <span class="min-w-0 flex-1">
                  <strong class="block text-[13px] font-semibold text-[#18233D]">
                    {option.label}
                  </strong>
                  <span class="mt-0.5 block text-[12px] text-[#747D8F]">
                    {option.description}
                    {#if status?.isOpen === false && getFinanceEntryAction(option) === "human"}
                      <span class="block text-[#A65B13]">Entrada na fila · {status.nextOpenLabel ?? "próximo expediente"}</span>
                    {/if}
                  </span>
                </span>
                <ChevronRight size={18} class="shrink-0 text-[#8D97AA]" aria-hidden="true"/>
              </button>
            {/each}
            <a href="/api/finance/portal" target="_blank" rel="noopener noreferrer"
              on:click={handleFinancePortalClick}
              class="flex min-h-[64px] w-full items-center gap-3 rounded-xl border border-[#DDE2EB] bg-white px-3 py-3 text-left transition hover:border-[#A8B4D7] hover:bg-[#F5F7FC]">
              <span class="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#EDF0FA] text-[#000A57]">
                <ExternalLink size={18} aria-hidden="true"/>
              </span>
              <span class="min-w-0 flex-1">
                <strong class="block text-[13px] font-semibold text-[#18233D]">
                  Meu painel financeiro
                </strong>
                <span class="mt-0.5 block text-[12px] text-[#747D8F]">
                  Acesse pagamentos e histórico
                </span>
              </span>
              <ChevronRight size={18} class="shrink-0 text-[#8D97AA]" aria-hidden="true"/>
            </a>
          {:else}
            <p role="status" class="text-[13px] text-[#747D8F]">
              Não há opções financeiras disponíveis neste momento.
            </p>
          {/if}
        </div>
      {/if}

      {#if activeDepartment === "finance" && financeAction === "pix" && !session && authState.authenticated && !authState.requiresUnitSelection}
        <FinancePaymentPanel scope="customer"/>
      {/if}

      {#if activeDepartment === "finance" && financeAction === "portal" && !session && authState.authenticated && !authState.requiresUnitSelection}
        <div class="space-y-3 rounded-2xl border border-[#DDE2EB] bg-white p-4 shadow-sm">
          <div class="flex items-center gap-3">
            <ExternalLink size={20} class="shrink-0 text-[#000A57]" aria-hidden="true"/>
            <div class="min-w-0">
              <h3 class="text-[14px] font-semibold text-[#18233D]">Meu painel financeiro</h3>
              <p class="text-[12px] text-[#747D8F]">Acesse pagamentos e histórico completo.</p>
            </div>
          </div>
          <a href="/api/finance/portal" target="_blank" rel="noopener noreferrer"
            class="flex min-h-11 w-full items-center justify-between rounded-xl bg-[#000A57] px-4 text-[13px] font-semibold text-white">
            Abrir painel financeiro
            <ChevronRight size={17} aria-hidden="true"/>
          </a>
        </div>
      {/if}


      {#if activeDepartment === "finance" && financeAction !== null && !session}
        <button type="button" on:click={resetFinanceChoice}
          class="mb-3 mt-2 text-[13px] font-semibold text-[#000A57] underline underline-offset-2">
          Voltar às opções
        </button>
      {/if}
      {#if session && (activeDepartment !== "finance" || authState.authenticated)}
        {#if departmentSessionMismatch}
          <div role="status" class="mb-3 rounded-xl border border-[#F1CFB5] bg-[#FFF8F1] p-3 text-[11px] leading-5 text-[#81512A]">
            Existe um atendimento em andamento em outro setor. Solicite a transferência nesta conversa antes de continuar.
          </div>
        {/if}
        {#if messages.length === 0 && loadingMessages}
          <div class="flex h-full items-center justify-center text-[#8A909E]"><LoaderCircle class="animate-spin" size={21}/></div>
        {:else}
          <div class="space-y-3">
            {#each messages as message (message.id)}
              {#if message.presentation}
                <div class="mx-auto max-w-[94%] rounded-2xl border border-[#DDE2EB] bg-white px-3.5 py-3 shadow-sm">
                  <div class="flex items-start gap-2.5">
                    <span class="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-[#EEF0FF] text-[#000A57]"><MessageCircleMore size={15}/></span>
                    <div class="min-w-0 flex-1">
                      <strong class="text-[13px] font-semibold text-[#303746]">{systemCardTitle(message.presentation)}</strong>
                      <SupportChatMarkdown text={message.body} className="mt-1 text-[#687080]"/>
                      <span class="mt-1 block text-[11px] text-[#A0A5B0]">{formatTime(message.createdAt)}</span>
                    </div>
                  </div>
                </div>
              {:else if message.authorType === "customer"}
                <div class="flex justify-end">
                  <div class={`group relative max-w-[86%] rounded-2xl rounded-br-md bg-[#000A57] px-3.5 py-2.5 text-white ${message.optimistic ? "opacity-70" : ""}`}>
                    {#if message.attachments?.length}
                      <div class={`grid gap-1.5 ${message.attachments.length > 1 ? "grid-cols-2" : "grid-cols-1"}`}>
                        {#each message.attachments as attachment}
                          <a href={attachment.url} target="_blank" rel="noopener noreferrer" class="block overflow-hidden rounded-xl bg-white/10">{#if attachment.mimeType.startsWith("image/")}
                              <img src={attachment.url} alt={attachment.originalName} class="max-h-52 w-full object-contain" on:error={hideBrokenImage}/>
                            {:else}
                              <span class="flex min-h-12 items-center gap-2 px-3 py-2 text-[12px]"><Paperclip size={16}/><span class="min-w-0 truncate">{attachment.originalName}</span></span>
                            {/if}</a>
                        {/each}
                      </div>
                    {/if}
                    {#if message.body}<SupportChatMarkdown text={message.body} isCustomer className={message.attachments?.length ? "mt-2" : ""}/>{/if}
                    <span class="mt-1 block text-[11px] text-white/70">{message.optimistic ? "Enviando..." : formatTime(message.createdAt)}</span>
                    {#if !message.optimistic}
                      <MessageActionMenu reactions={message.reactions ?? []} myReaction={message.myReaction ?? null}
                        onReact={(code) => reactChatMessage(message.id, code)}/>
                    {/if}
                  </div>
                </div>
              {:else}
                <div class="flex items-start gap-2">
                  <span class="relative flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-full border border-[#E0E4EC] bg-white text-[11px] font-bold text-[#000A57]">
                    {#if message.authorType === "user"}
                      {initials(message.authorUserName ?? "F10")}
                      {#if message.avatarUrl}<img src={message.avatarUrl} alt="" class="absolute inset-0 h-full w-full object-cover" on:error={hideBrokenImage}/>{/if}
                    {:else}
                      <LifeBuoy size={14}/>
                    {/if}
                  </span>
                  <div class="max-w-[84%]">
                    <div class="mb-1 px-1 text-[12px] font-semibold text-[#596171]">{message.authorType === "user" ? (message.authorUserName ?? "Equipe F10") : "Atendimento F10"}</div>
                    <div class="group relative rounded-2xl rounded-tl-md border border-[#E0E4EC] bg-[var(--app-surface)] px-3.5 py-3 text-[var(--app-text)]">
                      {#if message.attachments?.length}
                        <div class={`grid gap-1.5 ${message.attachments.length > 1 ? "grid-cols-2" : "grid-cols-1"}`}>
                          {#each message.attachments as attachment}
                            <a href={attachment.url} target="_blank" rel="noopener noreferrer" class="block overflow-hidden rounded-xl bg-[#F4F5F8]">{#if attachment.mimeType.startsWith("image/")}
                              <img src={attachment.url} alt={attachment.originalName} class="max-h-52 w-full object-contain" on:error={hideBrokenImage}/>
                            {:else}
                              <span class="flex min-h-12 items-center gap-2 px-3 py-2 text-[12px]"><Paperclip size={16}/><span class="min-w-0 truncate">{attachment.originalName}</span></span>
                            {/if}</a>
                          {/each}
                        </div>
                      {/if}
                      {#if message.body}<SupportChatMarkdown text={message.body} className={message.attachments?.length ? "mt-2" : ""}/>{/if}
                      <span class="mt-1 block text-[11px] text-[#6D7485]">{formatTime(message.createdAt)}</span>
                      {#if message.authorType !== "system"}
                        <MessageActionMenu reactions={message.reactions ?? []} myReaction={message.myReaction ?? null}
                          onReact={(code) => reactChatMessage(message.id, code)}/>
                      {/if}
                    </div>
                  </div>
                </div>
              {/if}
            {/each}
          </div>
        {/if}

      {:else}
        <div class="space-y-3">
          {#each (activeDepartment === "support" ? guestMessages : []) as message (message.id)}
            {#if message.role === "customer"}
              <div class="flex justify-end">
                <div class="max-w-[84%] rounded-2xl rounded-br-md bg-[#000A57] px-3.5 py-2.5 text-white">
                  <SupportChatMarkdown text={message.body} isCustomer/>
                </div>
              </div>
            {:else}
              <div class="flex items-start gap-2">
                <span class="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#FFF0E4] text-[#EA6D0B]"><Headset size={14}/></span>
                <div class="max-w-[84%] rounded-2xl rounded-tl-md border border-[#E1E4EB] bg-[var(--app-surface)] px-3.5 py-3 text-[var(--app-text)] shadow-sm">
                  <SupportChatMarkdown text={message.body}/>
                </div>
              </div>
            {/if}
          {/each}

          {#if activeDepartment === "support" && !handoffRequested && !ticketRequested && !assistantSending}
            {#if supportEntryOptions.length > 0 && (!selectedSupportOption || selectedSupportOption.initialHandling === "human")}
              <div class="ml-10 space-y-2" aria-label="Opções cadastradas">
                {#each supportEntryOptions as option (option.id)}
                  <button type="button" on:click={() => void selectSupportOption(option)} class="flex w-full items-center gap-2 rounded-xl border border-[#DDE1E9] bg-white px-3 py-2.5 text-left">
                    {#if option.initialHandling === "human"}<UserRound size={16} class="shrink-0 text-[#A84B08]"/>{:else}<MessageCircleMore size={16} class="shrink-0 text-[#000A57]"/>{/if}
                    <span class="min-w-0 flex-1">
                      <strong class="block text-[13px] font-semibold text-[#18233D]">{option.label}</strong>
                      {#if option.description}<span class="block text-[12px] text-[#697184]">{option.description}</span>{/if}
                      {#if option.initialHandling === "human" && status?.isOpen === false}
                        <span class="block text-[12px] text-[#A65B13]">Entrada na fila · {status.nextOpenLabel ?? "próximo expediente"}</span>
                      {/if}
                    </span>
                    <ChevronRight size={15} class="shrink-0 text-[#8D97AA]"/>
                  </button>
                {/each}
              </div>
            {:else if selectedSupportOption}
              <button type="button" on:click={() => { selectedEntryOptionId = ""; selectedEntryOptionLabel = ""; }} class="ml-10 text-[12px] font-medium text-[#596171]">Alterar assunto</button>
            {/if}
            {#if canRequestHuman || canOpenTicket}
              <section class={guestOffer === "none" ? "ml-10 flex flex-wrap gap-2" : "ml-10 space-y-2 rounded-2xl border border-[#DDE2EB] bg-white p-3.5 shadow-sm"} aria-label="Opções de atendimento">
                {#if status?.isOpen === false}
                  <p class="text-[13px] leading-5 text-[#596171]">{status.nextOpenLabel ? "Nossa equipe retorna " + status.nextOpenLabel.toLowerCase() + "." : "Nossa equipe retorna no próximo expediente."} Você pode abrir um chamado aqui mesmo.</p>
                {/if}
                {#if canRequestHuman}
                  <button type="button" on:click={() => humanSupportOption && void requestHumanSupport(humanSupportOption)} class={`inline-flex min-h-10 items-center justify-center gap-1.5 rounded-xl border border-[#F3B88D] bg-[#FFF6EE] px-3 text-[13px] font-semibold text-[#A84B08] ${guestOffer === "none" ? "" : "w-full"}`}><UserRound size={16}/> Falar com a equipe</button>
                {/if}
                {#if canOpenTicket}<button type="button" on:click={() => void requestTicket()} class={`inline-flex min-h-10 items-center justify-center gap-1.5 rounded-xl px-3 text-[13px] font-semibold ${guestOffer === "none" ? "border border-[#DDE1E9] bg-white text-[#000A57]" : "w-full bg-[#000A57] text-white"}`}><Ticket size={16}/> Abrir chamado</button>{/if}
                {#if guestOffer !== "none"}
                  <button type="button" on:click={() => (guestOffer = "none")} class="min-h-9 w-full text-[13px] font-medium text-[#596171]">Continuar com o assistente</button>
                {/if}
              </section>
            {/if}
            {#if authState.authenticated && !authState.requiresUnitSelection && hasConfirmedActiveChat}
              <button type="button" on:click={() => void requestResumeChat()} class="ml-10 inline-flex min-h-9 items-center gap-1.5 rounded-xl border border-[#DDE1E9] bg-white px-3 text-[12px] font-semibold text-[#000A57]"><MessageCircleMore size={15}/> Retomar atendimento</button>
            {/if}
          {/if}

          {#if activeDepartment === "support" && assistantSending}
            <div class="flex items-start gap-2">
              <span class="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#FFF0E4] text-[#EA6D0B]"><Headset size={14}/></span>
              <div class="rounded-2xl rounded-tl-md border border-[#E1E4EB] bg-white px-3.5 py-3 text-[#7B8292]"><LoaderCircle class="animate-spin" size={15}/></div>
            </div>
          {/if}

          {#if handoffRequested && (activeDepartment !== "finance" || authStep !== "ready" || starting || Boolean(errorMessage))}
            <div class="ml-10 rounded-2xl border border-[#DDE2EB] bg-white p-4 shadow-sm">
              {#if authState.authenticated && starting}
                <div class="flex items-center gap-2.5 text-[12px] font-semibold text-[#4C5363]"><LoaderCircle class="animate-spin" size={16}/>Criando seu atendimento identificado...</div>
              {:else if authStep === "login" && !authState.authenticated}
                <div class="flex items-start gap-2.5">
                  <span class="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#EEF0FF] text-[#000A57]"><LockKeyhole size={16}/></span>
                  <div><h3 class="text-[12px] font-semibold text-[#252C3D]">{ticketRequested ? "Entre para abrir seu chamado" : activeDepartment === "finance" ? "Entre para acessar o Financeiro" : "Entre para falar com a equipe"}</h3><p class="mt-1 text-[12px] leading-5 text-[#7B8292]">Use o mesmo e-mail e senha do F10. A senha é validada e não fica armazenada.</p></div>
                </div>
                <form class="mt-4 space-y-3" on:submit|preventDefault={submitLogin}>
                  <label class="block text-[11px] font-semibold text-[#596171]">E-mail F10<input bind:value={loginEmail} type="email" required maxlength="254" autocomplete="username" class="mt-1.5 h-10 w-full rounded-xl border border-[#DDE1E9] px-3 text-[11px] font-normal outline-none focus:border-[#000A57] focus:ring-3 focus:ring-[#000A57]/10"/></label>
                  <label class="block text-[11px] font-semibold text-[#596171]">Senha<input bind:value={loginPassword} type="password" required maxlength="512" autocomplete="current-password" class="mt-1.5 h-10 w-full rounded-xl border border-[#DDE1E9] px-3 text-[11px] font-normal outline-none focus:border-[#000A57] focus:ring-3 focus:ring-[#000A57]/10"/></label>
                  <button type="submit" disabled={authSubmitting || !loginEmail.trim() || !loginPassword} class="inline-flex h-10 w-full items-center justify-center gap-2 rounded-xl bg-[#000A57] px-4 text-[12px] font-semibold text-white disabled:opacity-50">{#if authSubmitting}<LoaderCircle class="animate-spin" size={15}/>{/if}Entrar e continuar</button>
                </form>
              {:else if authStep === "unit"}
                <div class="flex items-start gap-2.5">
                  <span class="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#EEF0FF] text-[#000A57]"><CheckCircle2 size={16}/></span>
                  <div><h3 class="text-[12px] font-semibold text-[#252C3D]">Selecione a unidade</h3><p class="mt-1 text-[12px] leading-5 text-[#7B8292]">Sua conta já está autenticada. Escolha o grupo e a unidade para vincular o atendimento corretamente.</p></div>
                </div>
                <form class="mt-4 space-y-3" on:submit|preventDefault={submitUnitSelection}>
                  <label class="block text-[11px] font-semibold text-[#596171]">Grupo<select value={selectedGroupId || ""} on:change={handleGroupChange} required class="mt-1.5 h-10 w-full rounded-xl border border-[#DDE1E9] bg-white px-3 text-[11px] font-normal outline-none"><option value="" disabled>Selecione</option>{#each authState.groups as group}<option value={group.id}>{group.name}</option>{/each}</select></label>
                  <label class="block text-[11px] font-semibold text-[#596171]">Unidade<select bind:value={selectedUnitId} required class="mt-1.5 h-10 w-full rounded-xl border border-[#DDE1E9] bg-white px-3 text-[11px] font-normal outline-none"><option value={0} disabled>Selecione</option>{#each selectedUnits as unit}<option value={unit.id}>{unit.name}</option>{/each}</select></label>
                  <button type="submit" disabled={authSubmitting || !selectedGroupId || !selectedUnitId} class="inline-flex h-10 w-full items-center justify-center gap-2 rounded-xl bg-[#000A57] px-4 text-[12px] font-semibold text-white disabled:opacity-50">{#if authSubmitting}<LoaderCircle class="animate-spin" size={15}/>{/if}Continuar atendimento</button>
                </form>
              {:else if authState.authenticated}
                <div class="flex items-start gap-2.5">
                  <span class="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#EEF0FF] text-[#000A57]"><CheckCircle2 size={16}/></span>
                  <div><h3 class="text-[12px] font-semibold text-[#252C3D]">Acesso confirmado</h3><p class="mt-1 text-[12px] leading-4 text-[#7B8292]">Seu grupo e unidade foram identificados. Tente conectar ao atendimento novamente.</p></div>
                </div>
                <button type="button" on:click={() => ticketRequested ? void requestTicket() : resumeOnly ? void requestResumeChat() : void startHumanChat()} disabled={starting || resumeLoading} class="mt-3 inline-flex h-10 w-full items-center justify-center gap-2 rounded-xl bg-[#000A57] px-4 text-[11px] font-semibold text-white disabled:opacity-50">Tentar conectar ao atendimento</button>
              {/if}
              {#if errorMessage}<p class="mt-3 rounded-xl bg-[#FFF4F1] px-3 py-2 text-[11px] leading-5 text-[#9A4E3D]">{errorMessage}</p>{/if}
              {#if activeDepartment === "support" && !starting}
                <button type="button" on:click={cancelTicketRequest} class="mt-3 text-[11px] font-semibold text-[#000A57] underline underline-offset-2">
                  Voltar ao Assistente F10
                </button>
              {/if}
            </div>
          {/if}
        </div>
      {/if}
      {/if}
      {#if ticketRequested && handoffRequested && session}
        <div class="mt-3 space-y-2 rounded-xl border border-[#E1E4EB] bg-white p-3 text-[13px]">
          <p>{errorMessage || "Confirme a conversa antes de registrar o chamado."}</p>
          <button type="button" on:click={cancelTicketRequest} class="font-semibold text-[#000A57]">Voltar à conversa</button>
        </div>
      {/if}
      {#if !convertedTicket && !departmentSessionMismatch && (session || ticketRequested)}
        <ChatWaitingOffer
          sessionId={session?.sessionId ?? ""}
          token={session?.token ?? ""}
          waitingSinceMs={waitingStatus.waitingSinceMs}
          available={Boolean(session) && waitingStatus.offerTicket}
          outsideSupportHours={status?.isOpen === false}
          unitName={authState.unitName}
          groupName={authState.groupName}
          suggestedDescription={ticketDescription}
          assistantTranscript={ticketAssistantTranscript}
          ready={ticketFormReady && !authRequiredForSession}
          bind:opened={ticketFormOpen}
          bind:submitting={conversionSubmitting}
          onOpen={handleTicketFormOpen}
          onCancel={cancelTicketRequest}
          onAuthRequired={reauthenticateTicket}
          onActiveChat={requestTicket}
          onConverted={handleConvertedTicket}
        />
      {/if}
    </div>

    {#if newMessageCount > 0}
      <button type="button" on:click={() => void scrollToLatest()} class="absolute bottom-20 left-1/2 z-10 inline-flex -translate-x-1/2 items-center gap-1.5 rounded-full bg-[#000A57] px-3 py-2 text-[11px] font-semibold text-white shadow-lg">{newMessageCount} nova{newMessageCount > 1 ? "s" : ""}<ArrowDown size={12}/></button>
    {/if}

    {#if convertedTicket}
      <div class="shrink-0 border-t border-[#E6E8EF] bg-white px-3 py-2 text-center text-[12px] text-[#697184]">Continue o atendimento pelo chamado.</div>
    {:else if ticketFormOpen || resumeLoading || (authStep === "profile" && authState.authenticated)}
      <div class="shrink-0 border-t border-[#E6E8EF] bg-white py-2"></div>
    {:else if session && (activeDepartment !== "finance" || authState.authenticated)}
      <form class={`relative shrink-0 border-t bg-white px-3 py-3 ${dragActive ? "border-[#EA6D0B] ring-2 ring-inset ring-[#EA6D0B]/20" : "border-[#E6E8EF]"}`} on:submit|preventDefault={sendReply} on:dragenter={handleDragEnter} on:dragover={handleDragOver} on:dragleave={handleDragLeave} on:drop={handleDrop}>
        {#if dragActive}<div class="pointer-events-none absolute inset-2 z-10 flex items-center justify-center rounded-xl border-2 border-dashed border-[#EA6D0B] bg-[#FFF8F1]/95 text-[12px] font-semibold text-[#B9570A]"><ImageIcon size={16} class="mr-2"/>Solte o arquivo para anexar</div>{/if}
        {#if errorMessage}<p class="mb-2 rounded-xl bg-[#FFF4F1] px-3 py-2 text-[12px] leading-5 text-[#9A4E3D]">{errorMessage}</p>{/if}
        {#if attachmentError}<p class="mb-2 rounded-xl bg-[#FFF8EE] px-3 py-2 text-[12px] leading-5 text-[#8B5B24]">{attachmentError}</p>{/if}
        {#if pendingImages.length > 0}<div class="mb-2 flex gap-2 overflow-x-auto">{#each pendingImages as image (image.id)}<div class="relative h-14 w-16 shrink-0 overflow-hidden rounded-xl border border-[#DDE1E9]">{#if image.file.type.startsWith("image/")}
          <img src={image.previewUrl} alt={image.file.name || "Imagem"} class="h-full w-full object-cover"/>
        {:else}
          <span class="flex h-full w-full flex-col items-center justify-center bg-[var(--app-surface-muted)] text-[var(--app-text)]"><Paperclip size={17}/><span class="max-w-full truncate px-1 text-[12px]">PDF</span></span>
        {/if}<button type="button" on:click={() => removePendingImage(image.id)} class="absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-black/65 text-white" aria-label="Remover imagem"><X size={10}/></button></div>{/each}</div>{/if}
        <input bind:this={fileInputElement} type="file" multiple accept="image/png,image/jpeg,image/webp,application/pdf" class="hidden" on:change={handleFileInput}/>
        <div class="flex items-end gap-2">
          <button type="button" on:click={() => fileInputElement?.click()} class="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-[#DDE1E9] text-[#667080] hover:text-[#000A57]" aria-label="Anexar arquivo"><Paperclip size={16}/></button>
          <textarea bind:value={reply} maxlength="4000" rows="1" placeholder="Escreva sua mensagem..." class="max-h-28 min-h-10 flex-1 resize-none rounded-xl border border-[#DDE1E9] bg-[#FAFBFC] px-3 py-2.5 text-[14px] leading-6 outline-none focus:border-[#000A57] focus:ring-3 focus:ring-[#000A57]/10" on:input={handleCustomerDraftInput} on:keydown={handleReplyKeydown} on:paste={handleReplyPaste}></textarea>
          <button type="submit" disabled={sending || conversionSubmitting || resumeLoading || (!reply.trim() && pendingImages.length === 0)} class="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#EA6D0B] text-white disabled:opacity-40" aria-label="Enviar">{#if sending}<LoaderCircle class="animate-spin" size={16}/>{:else}<Send size={16}/>{/if}</button>
        </div>
      </form>
    {:else if activeDepartment === "support" && !handoffRequested}
      <form class="shrink-0 border-t border-[#E6E8EF] bg-white px-3 py-3" on:submit|preventDefault={sendGuestMessage}>
        {#if errorMessage && !handoffRequested}<p class="mb-2 rounded-xl bg-[#FFF4F1] px-3 py-2 text-[12px] leading-5 text-[#9A4E3D]">{errorMessage}</p>{/if}
        <div class="flex items-end gap-2">
          <textarea bind:value={guestReply} maxlength="2000" rows="1" placeholder="Digite sua dúvida..." disabled={assistantSending || handoffRequested} class="max-h-28 min-h-10 flex-1 resize-none rounded-xl border border-[#DDE1E9] bg-[#FAFBFC] px-3 py-2.5 text-[14px] leading-6 outline-none focus:border-[#000A57] focus:ring-3 focus:ring-[#000A57]/10 disabled:opacity-55" on:keydown={handleGuestKeydown}></textarea>
          <button type="submit" disabled={assistantSending || handoffRequested || !guestReply.trim()} class="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#000A57] text-white disabled:opacity-40" aria-label="Enviar para o Assistente F10">{#if assistantSending}<LoaderCircle class="animate-spin" size={16}/>{:else}<Send size={16}/>{/if}</button>
        </div>
      </form>
    {/if}
  </div>
{/if}