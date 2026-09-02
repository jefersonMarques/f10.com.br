<script lang="ts">
  import { browser } from "$app/environment";
  import { onDestroy, tick } from "svelte";
  import {
    CheckCircle2,
    ExternalLink,
    Image as ImageIcon,
    LoaderCircle,
    LockKeyhole,
    MessageCircleMore,
    Paperclip,
    PlayCircle,
    Send,
    Sparkles,
    X,
  } from "lucide-svelte";
  import HelpRichText from "$lib/components/help/HelpRichText.svelte";

  type CustomerUnit = { id: number; name: string };
  type CustomerGroup = { id: number; name: string; units: CustomerUnit[] };

  type CustomerSupportContext = {
    authenticated: boolean;
    name: string;
    email: string;
    groupName: string | null;
    unitName: string | null;
    requiresUnitSelection?: boolean;
    groups?: CustomerGroup[];
  };

  type AuthState = {
    authenticated: boolean;
    name: string;
    email: string;
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
    authorUserName?: string | null;
    authorOnline?: boolean;
    avatarUrl?: string | null;
    body: string;
    createdAt: string;
    attachments?: ChatAttachment[];
  };

  type AssistantSource = {
    contentId: string;
    slug: string;
    title: string;
    href: string;
  };

  type AssistantMedia = {
    kind: "youtube" | "video" | "link";
    title: string;
    url: string;
  };

  type GuestMessage = {
    id: string;
    role: "assistant" | "customer";
    body: string;
    createdAt: string;
    actionUrl?: string;
    actionLabel?: string;
    source?: AssistantSource;
    media?: AssistantMedia;
  };

  type AssistantResponse = {
    answer?: string;
    action?: "answer" | "clarify" | "handoff" | "ticket_offer";
    requiresHuman?: boolean;
    unresolvedCount?: number;
    handoffReason?: string;
    offerTicket?: boolean;
    ticketUrl?: string;
    source?: AssistantSource | null;
    media?: AssistantMedia | null;
    error?: string;
  };

  type PendingImage = {
    id: string;
    file: File;
    previewUrl: string;
  };

  export let isOpen = false;
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

  const SESSION_KEY = "f10-support-chat-session-v1";
  const GUEST_KEY = "f10-support-assistant-conversation-v2";
  const UNRESOLVED_KEY = "f10-support-assistant-unresolved-v1";
  const MAX_IMAGES = 4;
  const MAX_IMAGE_BYTES = 8 * 1024 * 1024;
  const ALLOWED_IMAGE_TYPES = new Set(["image/png", "image/jpeg", "image/webp"]);

  let initialized = false;
  let restored = false;
  let messagesElement: HTMLDivElement;
  let fileInputElement: HTMLInputElement;
  let session: ChatSession | null = null;
  let messages: ChatMessage[] = [];
  let guestMessages: GuestMessage[] = [];
  let guestReply = "";
  let reply = "";
  let unresolvedCount = 0;
  let pendingImages: PendingImage[] = [];
  let assistantSending = false;
  let starting = false;
  let sending = false;
  let loadingMessages = false;
  let errorMessage = "";
  let attachmentError = "";
  let pendingHandoffReason = "";
  let authRequired = false;
  let authStep: "login" | "unit" = "login";
  let loginEmail = "";
  let loginPassword = "";
  let authSubmitting = false;
  let selectedGroupId = 0;
  let selectedUnitId = 0;
  let pollTimer: ReturnType<typeof setInterval> | null = null;
  let pollingSessionId = "";
  let authState: AuthState = {
    authenticated: false,
    name: "",
    email: "",
    groupName: null,
    unitName: null,
    requiresUnitSelection: false,
    groups: [],
  };

  $: if (!initialized) initializeAuthState();
  $: if (browser && isOpen && !restored) restoreState();
  $: if (browser) syncPolling(isOpen && !authRequired, session?.sessionId ?? "");
  $: selectedUnits = authState.groups.find((group) => group.id === selectedGroupId)?.units ?? [];

  function initializeAuthState(): void {
    authState = {
      authenticated: customerSupport.authenticated,
      name: customerSupport.name,
      email: customerSupport.email,
      groupName: customerSupport.groupName,
      unitName: customerSupport.unitName,
      requiresUnitSelection: customerSupport.requiresUnitSelection ?? false,
      groups: customerSupport.groups ?? [],
    };
    loginEmail = customerSupport.email;
    prepareUnitSelection();
    initialized = true;
  }

  function prepareUnitSelection(): void {
    const currentGroup = authState.groups.find((group) => group.name === authState.groupName);
    const group = currentGroup ?? authState.groups[0] ?? null;
    selectedGroupId = group?.id ?? 0;
    selectedUnitId = group?.units.length === 1 ? group.units[0]?.id ?? 0 : 0;
  }

  function isAssistantSource(value: unknown): value is AssistantSource {
    if (!value || typeof value !== "object") return false;
    const source = value as Record<string, unknown>;
    if (
      typeof source.contentId !== "string" ||
      typeof source.slug !== "string" ||
      typeof source.title !== "string" ||
      typeof source.href !== "string"
    ) return false;
    if (!/^[a-z0-9][a-z0-9-]{0,159}$/i.test(source.slug)) return false;
    return source.href.startsWith(`/ajuda-f10/${encodeURIComponent(source.slug)}`);
  }

  function isAssistantMedia(value: unknown): value is AssistantMedia {
    if (!value || typeof value !== "object") return false;
    const media = value as Record<string, unknown>;
    if (
      (media.kind !== "youtube" && media.kind !== "video" && media.kind !== "link") ||
      typeof media.title !== "string" ||
      typeof media.url !== "string"
    ) return false;

    if (media.kind === "youtube") {
      return /^https:\/\/www\.youtube-nocookie\.com\/embed\/[A-Za-z0-9_-]{6,20}$/.test(media.url);
    }
    if (media.kind === "video") {
      return /^\/api\/help\/content\/[^/]+\/assets\/[0-9a-f-]{36}$/i.test(media.url);
    }
    try {
      const url = new URL(media.url);
      return url.protocol === "https:" || url.protocol === "http:";
    } catch {
      return false;
    }
  }

  function createGuestMessage(
    role: GuestMessage["role"],
    body: string,
    action?: { url: string; label: string },
    presentation?: { source?: AssistantSource | null; media?: AssistantMedia | null },
  ): GuestMessage {
    return {
      id: `${role}-${Date.now()}-${Math.random().toString(36).slice(2)}`,
      role,
      body,
      createdAt: new Date().toISOString(),
      actionUrl: action?.url,
      actionLabel: action?.label,
      source: isAssistantSource(presentation?.source) ? presentation.source : undefined,
      media: isAssistantMedia(presentation?.media) ? presentation.media : undefined,
    };
  }

  function ensureGreeting(): void {
    if (guestMessages.length > 0) return;
    guestMessages = [
      createGuestMessage(
        "assistant",
        "Olá! Sou o Assistente F10. Como posso ajudar com o F10 hoje?",
      ),
    ];
  }

  function restoreState(): void {
    restored = true;
    try {
      const rawGuest = window.sessionStorage.getItem(GUEST_KEY);
      if (rawGuest) {
        const stored = JSON.parse(rawGuest) as GuestMessage[];
        if (Array.isArray(stored)) {
          guestMessages = stored
            .filter((message) => message && (message.role === "assistant" || message.role === "customer") && typeof message.body === "string")
            .map((message) => ({
              ...message,
              source: isAssistantSource(message.source) ? message.source : undefined,
              media: isAssistantMedia(message.media) ? message.media : undefined,
            }))
            .slice(-30);
        }
      }
    } catch {
      window.sessionStorage.removeItem(GUEST_KEY);
    }
    unresolvedCount = Number(window.sessionStorage.getItem(UNRESOLVED_KEY) ?? "0") || 0;
    ensureGreeting();

    const rawSession = window.sessionStorage.getItem(SESSION_KEY);
    if (!rawSession) return;
    try {
      const stored = JSON.parse(rawSession) as ChatSession;
      if (!stored.sessionId || !stored.token || new Date(stored.expiresAt).getTime() <= Date.now()) {
        clearSession();
        return;
      }
      session = stored;
      void refreshMessages(true);
    } catch {
      clearSession();
    }
  }

  function persistGuestState(): void {
    if (!browser) return;
    window.sessionStorage.setItem(GUEST_KEY, JSON.stringify(guestMessages.slice(-30)));
    window.sessionStorage.setItem(UNRESOLVED_KEY, String(unresolvedCount));
  }

  function persistSession(value: ChatSession): void {
    if (!browser) return;
    window.sessionStorage.setItem(SESSION_KEY, JSON.stringify(value));
  }

  function clearSession(): void {
    if (browser) window.sessionStorage.removeItem(SESSION_KEY);
    session = null;
    messages = [];
    pollingSessionId = "";
  }

  function pageContext(): string {
    if (!browser) return "";
    const heading = document.querySelector("main h1")?.textContent?.trim() ?? "";
    return [
      `Página: ${document.title}`,
      `Caminho: ${window.location.pathname}`,
      heading ? `Título visível: ${heading}` : "",
    ].filter(Boolean).join("\n").slice(0, 1_200);
  }

  function helpContext(): string {
    if (!browser || !window.location.pathname.startsWith("/ajuda-f10")) return "";
    return document.querySelector("main h1")?.textContent?.trim().slice(0, 200) ?? document.title.slice(0, 200);
  }

  function buildTranscript(): string {
    return guestMessages
      .slice(-18)
      .map((message) => `${message.role === "customer" ? "Cliente" : "Assistente F10"}: ${message.body.trim()}`)
      .join("\n")
      .slice(0, 8_000);
  }

  function latestAssistantSource(): AssistantSource | null {
    for (let index = guestMessages.length - 1; index >= 0; index -= 1) {
      const message = guestMessages[index];
      if (message?.role === "assistant" && isAssistantSource(message.source)) return message.source;
    }
    return null;
  }

  function lastCustomerMessage(): string {
    return [...guestMessages].reverse().find((message) => message.role === "customer")?.body.trim() || "Preciso de ajuda com o F10.";
  }

  async function scrollToLatest(): Promise<void> {
    await tick();
    messagesElement?.scrollTo({ top: messagesElement.scrollHeight, behavior: "smooth" });
  }

  function apiErrorMessage(error: string): string {
    if (error === "RATE_LIMITED") return "Muitas tentativas em pouco tempo. Aguarde alguns minutos e tente novamente.";
    if (error === "INVALID_CREDENTIALS") return "E-mail ou senha inválidos. Use os mesmos dados de acesso do F10.";
    if (error === "CUSTOMER_AUTH_REQUIRED") return "Sua sessão F10 expirou. Entre novamente para continuar.";
    if (error === "UNIT_NOT_AUTHORIZED") return "Esta unidade não está disponível para sua conta F10.";
    if (error === "INVALID_SESSION") return "Este atendimento expirou. Inicie uma nova conversa.";
    if (error === "CHAT_CLOSED") return "Este atendimento foi encerrado.";
    if (error === "TOO_MANY_ATTACHMENTS") return "Envie no máximo 4 imagens por mensagem.";
    if (error === "SUPPORT_IMAGE_SIZE_INVALID") return "Cada imagem pode ter no máximo 8 MB.";
    if (error === "SUPPORT_IMAGE_TYPE_INVALID") return "Use imagens PNG, JPG/JPEG ou WebP.";
    return "Não foi possível concluir esta operação agora.";
  }

  async function sendGuestMessage(): Promise<void> {
    const body = guestReply.trim();
    if (!body || assistantSending || starting) return;

    errorMessage = "";
    guestReply = "";
    const conversationContext = buildTranscript();
    const contextSource = latestAssistantSource();
    guestMessages = [...guestMessages, createGuestMessage("customer", body)];
    persistGuestState();
    assistantSending = true;
    await scrollToLatest();

    try {
      const response = await fetch("/api/support/chat/assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: body,
          conversationContext,
          contextSourceSlug: contextSource?.slug ?? "",
          unresolvedCount,
          pageContext: pageContext(),
        }),
      });
      const payload = await response.json() as AssistantResponse;
      if (!response.ok) throw new Error(payload.error || "ASSISTANT_UNAVAILABLE");

      const action = payload.action ?? (payload.requiresHuman ? "handoff" : "answer");
      unresolvedCount = Number.isFinite(payload.unresolvedCount) ? Math.max(0, Number(payload.unresolvedCount)) : 0;
      const ticketAction = action === "ticket_offer" && payload.ticketUrl
        ? { url: payload.ticketUrl, label: "Abrir chamado" }
        : undefined;
      guestMessages = [
        ...guestMessages,
        createGuestMessage(
          "assistant",
          payload.answer || "Como posso ajudar?",
          ticketAction,
          { source: payload.source, media: payload.media },
        ),
      ];
      persistGuestState();
      await scrollToLatest();

      if (action === "handoff" || payload.requiresHuman) {
        await requestHumanSupport(payload.handoffReason || "O Assistente F10 encaminhou a conversa para atendimento humano.");
      }
    } catch (cause) {
      errorMessage = cause instanceof Error && cause.message !== "ASSISTANT_UNAVAILABLE"
        ? apiErrorMessage(cause.message)
        : "O Assistente F10 não conseguiu responder agora. Tente enviar sua mensagem novamente.";
    } finally {
      assistantSending = false;
    }
  }

  async function requestHumanSupport(reason: string): Promise<void> {
    if (starting || session) return;
    pendingHandoffReason = reason;

    if (!authState.authenticated) {
      authRequired = true;
      authStep = "login";
      guestMessages = [
        ...guestMessages,
        createGuestMessage("assistant", "Para continuar com o atendente, preciso identificar sua conta F10. Faça o login aqui no chat."),
      ];
      persistGuestState();
      await scrollToLatest();
      return;
    }

    if (authState.requiresUnitSelection) {
      authRequired = true;
      authStep = "unit";
      prepareUnitSelection();
      guestMessages = [
        ...guestMessages,
        createGuestMessage("assistant", "Selecione o grupo e a escola relacionados a esta conversa para eu encaminhar corretamente."),
      ];
      persistGuestState();
      await scrollToLatest();
      return;
    }

    await startHumanChat();
  }

  async function submitLogin(): Promise<void> {
    if (authSubmitting || !loginEmail.trim() || !loginPassword) return;
    authSubmitting = true;
    errorMessage = "";
    try {
      const response = await fetch("/api/support/chat/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: loginEmail.trim(), password: loginPassword }),
      });
      const payload = await response.json() as AuthState & { error?: string };
      if (!response.ok) throw new Error(payload.error || "AUTH_UNAVAILABLE");
      authState = {
        authenticated: payload.authenticated,
        name: payload.name,
        email: payload.email,
        groupName: payload.groupName,
        unitName: payload.unitName,
        requiresUnitSelection: payload.requiresUnitSelection,
        groups: payload.groups ?? [],
      };
      loginPassword = "";
      prepareUnitSelection();

      if (session) {
        authRequired = false;
        await refreshMessages(true);
      } else if (authState.requiresUnitSelection) {
        authStep = "unit";
      } else {
        authRequired = false;
        await startHumanChat();
      }
    } catch (cause) {
      errorMessage = apiErrorMessage(cause instanceof Error ? cause.message : "AUTH_UNAVAILABLE");
    } finally {
      authSubmitting = false;
    }
  }

  async function submitUnit(): Promise<void> {
    if (authSubmitting || selectedGroupId <= 0 || selectedUnitId <= 0) return;
    authSubmitting = true;
    errorMessage = "";
    try {
      const response = await fetch("/api/support/chat/auth/unit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ groupId: selectedGroupId, unitId: selectedUnitId }),
      });
      const payload = await response.json() as AuthState & { error?: string };
      if (!response.ok) throw new Error(payload.error || "UNIT_SELECTION_UNAVAILABLE");
      authState = {
        authenticated: true,
        name: payload.name,
        email: payload.email,
        groupName: payload.groupName,
        unitName: payload.unitName,
        requiresUnitSelection: false,
        groups: payload.groups ?? authState.groups,
      };
      authRequired = false;
      await startHumanChat();
    } catch (cause) {
      errorMessage = apiErrorMessage(cause instanceof Error ? cause.message : "UNIT_SELECTION_UNAVAILABLE");
    } finally {
      authSubmitting = false;
    }
  }

  async function startHumanChat(): Promise<void> {
    if (starting || session) return;
    starting = true;
    errorMessage = "";
    try {
      const response = await fetch("/api/support/chat/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          forceHuman: true,
          message: lastCustomerMessage(),
          contextUrl: browser ? window.location.href : "",
          pageTitle: browser ? document.title : "",
          helpContext: helpContext(),
          handoffTranscript: buildTranscript(),
          handoffReason: pendingHandoffReason,
        }),
      });
      const payload = await response.json() as {
        sessionId?: string;
        token?: string;
        ticketNumber?: number;
        expiresAt?: string;
        aiState?: ChatSession["aiState"];
        entryOptionLabel?: string;
        error?: string;
      };
      if (!response.ok || !payload.sessionId || !payload.token || !payload.expiresAt) {
        if (payload.error === "CUSTOMER_AUTH_REQUIRED") {
          authRequired = true;
          authStep = "login";
        }
        throw new Error(payload.error || "CHAT_UNAVAILABLE");
      }

      session = {
        sessionId: payload.sessionId,
        token: payload.token,
        ticketNumber: payload.ticketNumber ?? 0,
        expiresAt: payload.expiresAt,
        aiState: payload.aiState ?? "escalated",
        entryOptionLabel: payload.entryOptionLabel,
      };
      persistSession(session);
      authRequired = false;
      unresolvedCount = 0;
      persistGuestState();
      pendingHandoffReason = "";
      await refreshMessages(true);
    } catch (cause) {
      errorMessage = apiErrorMessage(cause instanceof Error ? cause.message : "CHAT_UNAVAILABLE");
    } finally {
      starting = false;
    }
  }

  function syncPolling(shouldPoll: boolean, sessionId: string): void {
    const desired = shouldPoll ? sessionId : "";
    if (desired === pollingSessionId) return;
    if (pollTimer) clearInterval(pollTimer);
    pollTimer = null;
    pollingSessionId = desired;
    if (!desired) return;
    void refreshMessages(true);
    pollTimer = setInterval(() => void refreshMessages(false), 4_000);
  }

  async function refreshMessages(scroll = false): Promise<void> {
    if (!session || loadingMessages) return;
    loadingMessages = true;
    try {
      const response = await fetch(`/api/support/chat/${encodeURIComponent(session.sessionId)}/messages`, {
        headers: { Authorization: `Bearer ${session.token}` },
        cache: "no-store",
      });
      const payload = await response.json() as { messages?: ChatMessage[]; aiState?: ChatSession["aiState"]; error?: string };
      if (response.status === 401 && payload.error === "CUSTOMER_AUTH_REQUIRED") {
        authRequired = true;
        authStep = "login";
        return;
      }
      if (!response.ok) throw new Error(payload.error || "CHAT_UNAVAILABLE");
      messages = Array.isArray(payload.messages) ? payload.messages : [];
      if (payload.aiState && session.aiState !== payload.aiState) {
        session = { ...session, aiState: payload.aiState };
        persistSession(session);
      }
      if (scroll) await scrollToLatest();
    } catch (cause) {
      const code = cause instanceof Error ? cause.message : "CHAT_UNAVAILABLE";
      if (code === "INVALID_SESSION") clearSession();
    } finally {
      loadingMessages = false;
    }
  }

  function addImages(files: File[]): void {
    attachmentError = "";
    for (const file of files) {
      if (pendingImages.length >= MAX_IMAGES) {
        attachmentError = "Envie no máximo 4 imagens por mensagem.";
        break;
      }
      if (!ALLOWED_IMAGE_TYPES.has(file.type)) {
        attachmentError = "Use imagens PNG, JPG/JPEG ou WebP.";
        continue;
      }
      if (file.size > MAX_IMAGE_BYTES) {
        attachmentError = "Cada imagem pode ter no máximo 8 MB.";
        continue;
      }
      pendingImages = [
        ...pendingImages,
        { id: `${Date.now()}-${Math.random()}`, file, previewUrl: URL.createObjectURL(file) },
      ];
    }
  }

  function handleFiles(event: Event): void {
    const input = event.currentTarget as HTMLInputElement;
    addImages(Array.from(input.files ?? []));
    input.value = "";
  }

  function removeImage(id: string): void {
    const image = pendingImages.find((item) => item.id === id);
    if (image) URL.revokeObjectURL(image.previewUrl);
    pendingImages = pendingImages.filter((item) => item.id !== id);
  }

  async function sendHumanMessage(): Promise<void> {
    if (!session || sending) return;
    const body = reply.trim();
    if (!body && pendingImages.length === 0) return;
    sending = true;
    errorMessage = "";
    attachmentError = "";
    try {
      const formData = new FormData();
      formData.set("body", body);
      for (const image of pendingImages) formData.append("files", image.file);
      const response = await fetch(`/api/support/chat/${encodeURIComponent(session.sessionId)}/messages`, {
        method: "POST",
        headers: { Authorization: `Bearer ${session.token}` },
        body: formData,
      });
      const payload = await response.json() as { error?: string; aiState?: ChatSession["aiState"] };
      if (response.status === 401 && payload.error === "CUSTOMER_AUTH_REQUIRED") {
        authRequired = true;
        authStep = "login";
        return;
      }
      if (!response.ok) throw new Error(payload.error || "CHAT_UNAVAILABLE");
      reply = "";
      for (const image of pendingImages) URL.revokeObjectURL(image.previewUrl);
      pendingImages = [];
      if (payload.aiState && session.aiState !== payload.aiState) {
        session = { ...session, aiState: payload.aiState };
        persistSession(session);
      }
      await refreshMessages(true);
    } catch (cause) {
      errorMessage = apiErrorMessage(cause instanceof Error ? cause.message : "CHAT_UNAVAILABLE");
    } finally {
      sending = false;
    }
  }

  function formatTime(value: string): string {
    return new Intl.DateTimeFormat("pt-BR", { hour: "2-digit", minute: "2-digit" }).format(new Date(value));
  }

  onDestroy(() => {
    if (pollTimer) clearInterval(pollTimer);
    for (const image of pendingImages) URL.revokeObjectURL(image.previewUrl);
  });
</script>

{#if isOpen}
  <section class="fixed bottom-4 right-4 z-[10020] flex h-[min(720px,calc(100dvh-2rem))] w-[min(420px,calc(100vw-2rem))] flex-col overflow-hidden rounded-[22px] border border-[#DDE1E9] bg-white shadow-[0_24px_70px_rgba(1,13,40,0.24)] sm:bottom-6 sm:right-6" aria-label="Assistente F10">
    <header class="flex items-center justify-between gap-3 border-b border-[#E9EBF1] bg-[#000A57] px-4 py-3.5 text-white">
      <div class="flex min-w-0 items-center gap-3">
        <span class="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/10"><Sparkles size={18} /></span>
        <div class="min-w-0">
          <h2 class="truncate text-[13px] font-semibold">Assistente F10</h2>
          <p class="mt-0.5 truncate text-[10px] text-white/70">{session ? (session.aiState === "human" ? "Equipe F10 atendendo" : "Conversa encaminhada para a equipe F10") : "Ajuda inteligente dentro do F10"}</p>
        </div>
      </div>
      <button type="button" class="flex h-9 w-9 items-center justify-center rounded-xl text-white/80 transition hover:bg-white/10 hover:text-white" aria-label="Fechar Assistente F10" on:click={onClose}><X size={18} /></button>
    </header>

    <div bind:this={messagesElement} class="min-h-0 flex-1 overflow-y-auto bg-[#F8F9FC] px-4 py-4">
      {#if !session}
        <div class="space-y-3">
          {#each guestMessages as message}
            <div class={`flex ${message.role === "customer" ? "justify-end" : "justify-start"}`}>
              <div class={`max-w-[90%] rounded-2xl px-3.5 py-2.5 text-[12px] leading-5 ${message.role === "customer" ? "rounded-br-md bg-[#000A57] text-white" : "rounded-bl-md border border-[#E4E7EE] bg-white text-[#394052] shadow-[0_3px_12px_rgba(1,13,40,0.035)]"}`}>
                {#if message.role === "assistant"}
                  <HelpRichText text={message.body} className="space-y-1.5" />
                {:else}
                  <p class="whitespace-pre-wrap">{message.body}</p>
                {/if}

                {#if message.role === "assistant" && message.media && isAssistantMedia(message.media)}
                  <div class="mt-3 overflow-hidden rounded-xl border border-[#E2E5EC] bg-[#F7F8FB]">
                    {#if message.media.kind === "youtube"}
                      <div class="aspect-video bg-black">
                        <iframe
                          src={message.media.url}
                          title={message.media.title}
                          class="h-full w-full"
                          loading="lazy"
                          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                          allowfullscreen
                        ></iframe>
                      </div>
                    {:else if message.media.kind === "video"}
                      <video controls preload="metadata" class="aspect-video h-auto w-full bg-black" src={message.media.url}>
                        <track kind="captions" />
                      </video>
                    {:else}
                      <a href={message.media.url} target="_blank" rel="noopener noreferrer" class="flex items-center justify-between gap-3 px-3.5 py-3 text-[#000A57] transition hover:bg-white">
                        <span class="flex min-w-0 items-center gap-2.5"><PlayCircle size={18} class="shrink-0" /><span class="truncate text-[10px] font-semibold">Assistir ao vídeo</span></span><ExternalLink size={13} class="shrink-0" />
                      </a>
                    {/if}
                  </div>
                {/if}

                {#if message.role === "assistant" && message.source && isAssistantSource(message.source)}
                  <a href={message.source.href} target="_blank" rel="noopener noreferrer" class="mt-2.5 flex items-center justify-between gap-3 rounded-xl border border-[#DDE2F0] bg-[#F7F8FF] px-3 py-2.5 text-[#000A57] transition hover:border-[#BFC7E4] hover:bg-[#F1F3FF]">
                    <span class="min-w-0"><small class="block text-[8px] font-bold uppercase tracking-[0.08em] text-[#7B839B]">Central de Ajuda</small><strong class="mt-0.5 block truncate text-[10px] font-semibold">{message.source.title}</strong></span><ExternalLink size={13} class="shrink-0" />
                  </a>
                {/if}

                {#if message.actionUrl && message.actionLabel}
                  <a href={message.actionUrl} class="mt-2.5 inline-flex items-center gap-1.5 rounded-xl bg-[#000A57] px-3 py-2 text-[10px] font-semibold text-white transition hover:bg-[#111B71]"><CheckCircle2 size={13} />{message.actionLabel}</a>
                {/if}
              </div>
            </div>
          {/each}
          {#if assistantSending || starting}
            <div class="flex justify-start"><div class="inline-flex items-center gap-2 rounded-2xl rounded-bl-md border border-[#E4E7EE] bg-white px-3.5 py-2.5 text-[11px] text-[#707788]"><LoaderCircle size={14} class="animate-spin" />{starting ? "Encaminhando para a equipe F10..." : "Pensando..."}</div></div>
          {/if}
        </div>
      {:else}
        <div class="mb-3 rounded-2xl border border-[#DDE4F3] bg-[#F4F7FD] px-3.5 py-3 text-[11px] leading-5 text-[#526078]">
          <strong class="font-semibold text-[#000A57]">Conversa com a equipe F10</strong><br />O histórico do Assistente foi encaminhado para contextualizar o atendimento.
        </div>
        <div class="space-y-3">
          {#each messages as message}
            <div class={`flex ${message.authorType === "customer" ? "justify-end" : "justify-start"}`}>
              <div class={`max-w-[86%] rounded-2xl px-3.5 py-2.5 text-[12px] leading-5 ${message.authorType === "customer" ? "rounded-br-md bg-[#000A57] text-white" : message.authorType === "system" ? "border border-[#E7E9EF] bg-[#F0F2F6] text-[#6C7382]" : "rounded-bl-md border border-[#E4E7EE] bg-white text-[#394052]"}`}>
                {#if message.authorType === "user" && message.authorUserName}<p class="mb-1 text-[9px] font-semibold uppercase tracking-[0.08em] text-[#6E7690]">{message.authorUserName}{message.authorOnline ? " · online" : ""}</p>{/if}
                {#if message.body}<p class="whitespace-pre-wrap">{message.body}</p>{/if}
                {#if message.attachments?.length}
                  <div class="mt-2 grid grid-cols-2 gap-2">
                    {#each message.attachments as attachment}<a href={attachment.url} target="_blank" rel="noreferrer" class="block overflow-hidden rounded-xl border border-black/10 bg-white"><img src={attachment.url} alt={attachment.originalName} class="h-24 w-full object-cover" /></a>{/each}
                  </div>
                {/if}
                <p class={`mt-1 text-[9px] ${message.authorType === "customer" ? "text-white/60" : "text-[#9AA0AC]"}`}>{formatTime(message.createdAt)}</p>
              </div>
            </div>
          {/each}
          {#if loadingMessages && messages.length === 0}<p class="text-center text-[10px] text-[#8B92A1]">Carregando conversa...</p>{/if}
        </div>
      {/if}
    </div>

    {#if errorMessage}<div class="border-t border-[#F0D8D3] bg-[#FFF6F4] px-4 py-2.5 text-[10px] leading-4 text-[#93483C]">{errorMessage}</div>{/if}

    {#if authRequired}
      <div class="border-t border-[#E3E6ED] bg-white p-4">
        {#if authStep === "login"}
          <div class="mb-3 flex items-center gap-2 text-[11px] font-semibold text-[#303746]"><LockKeyhole size={15} class="text-[#000A57]" />Identifique sua conta F10</div>
          <form class="space-y-2.5" on:submit|preventDefault={submitLogin}>
            <input type="email" bind:value={loginEmail} autocomplete="username" placeholder="E-mail" class="h-10 w-full rounded-xl border border-[#DDE1E9] px-3 text-[11px] outline-none focus:border-[#000A57]" />
            <input type="password" bind:value={loginPassword} autocomplete="current-password" placeholder="Senha" class="h-10 w-full rounded-xl border border-[#DDE1E9] px-3 text-[11px] outline-none focus:border-[#000A57]" />
            <button type="submit" disabled={authSubmitting} class="inline-flex h-10 w-full items-center justify-center gap-2 rounded-xl bg-[#000A57] text-[11px] font-semibold text-white disabled:opacity-60">{#if authSubmitting}<LoaderCircle size={14} class="animate-spin" />{/if}Continuar</button>
          </form>
        {:else}
          <div class="mb-3 text-[11px] font-semibold text-[#303746]">Qual escola está relacionada à conversa?</div>
          <div class="space-y-2.5">
            <select bind:value={selectedGroupId} on:change={() => { selectedUnitId = 0; }} class="h-10 w-full rounded-xl border border-[#DDE1E9] bg-white px-3 text-[11px] outline-none focus:border-[#000A57]">
              <option value={0}>Selecione o grupo</option>
              {#each authState.groups as group}<option value={group.id}>{group.name}</option>{/each}
            </select>
            <select bind:value={selectedUnitId} disabled={selectedGroupId <= 0} class="h-10 w-full rounded-xl border border-[#DDE1E9] bg-white px-3 text-[11px] outline-none disabled:bg-[#F4F5F7] focus:border-[#000A57]">
              <option value={0}>Selecione a escola</option>
              {#each selectedUnits as unit}<option value={unit.id}>{unit.name}</option>{/each}
            </select>
            <button type="button" on:click={submitUnit} disabled={authSubmitting || selectedUnitId <= 0} class="inline-flex h-10 w-full items-center justify-center gap-2 rounded-xl bg-[#000A57] text-[11px] font-semibold text-white disabled:opacity-50">{#if authSubmitting}<LoaderCircle size={14} class="animate-spin" />{/if}Encaminhar conversa</button>
          </div>
        {/if}
      </div>
    {:else if !session}
      <form class="border-t border-[#E3E6ED] bg-white p-3" on:submit|preventDefault={sendGuestMessage}>
        <div class="flex items-end gap-2 rounded-2xl border border-[#DDE1E9] bg-white p-2 focus-within:border-[#000A57] focus-within:ring-4 focus-within:ring-[#000A57]/8">
          <textarea bind:value={guestReply} rows="1" maxlength="2000" placeholder="Digite sua dúvida sobre o F10..." class="max-h-28 min-h-9 flex-1 resize-none bg-transparent px-1 py-2 text-[12px] leading-5 outline-none" on:keydown={(event) => { if (event.key === "Enter" && !event.shiftKey) { event.preventDefault(); void sendGuestMessage(); } }}></textarea>
          <button type="submit" disabled={assistantSending || !guestReply.trim()} class="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#000A57] text-white transition disabled:opacity-40" aria-label="Enviar mensagem"><Send size={16} /></button>
        </div>
      </form>
    {:else}
      <form class="border-t border-[#E3E6ED] bg-white p-3" on:submit|preventDefault={sendHumanMessage}>
        {#if pendingImages.length > 0}
          <div class="mb-2 flex gap-2 overflow-x-auto pb-1">{#each pendingImages as image}<div class="relative h-16 w-16 shrink-0 overflow-hidden rounded-xl border border-[#DDE1E9]"><img src={image.previewUrl} alt="Prévia" class="h-full w-full object-cover" /><button type="button" on:click={() => removeImage(image.id)} class="absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-black/65 text-white" aria-label="Remover imagem"><X size={11} /></button></div>{/each}</div>
        {/if}
        {#if attachmentError}<p class="mb-2 text-[10px] text-[#A04435]">{attachmentError}</p>{/if}
        <div class="flex items-end gap-2 rounded-2xl border border-[#DDE1E9] p-2 focus-within:border-[#000A57]">
          <input bind:this={fileInputElement} type="file" accept="image/png,image/jpeg,image/webp" multiple class="hidden" on:change={handleFiles} />
          <button type="button" on:click={() => fileInputElement?.click()} class="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-[#6F7787] transition hover:bg-[#F2F4F8] hover:text-[#000A57]" aria-label="Anexar imagens"><Paperclip size={16} /></button>
          <textarea bind:value={reply} rows="1" maxlength="4000" placeholder="Escreva para a equipe F10..." class="max-h-28 min-h-9 flex-1 resize-none bg-transparent px-1 py-2 text-[12px] leading-5 outline-none" on:keydown={(event) => { if (event.key === "Enter" && !event.shiftKey) { event.preventDefault(); void sendHumanMessage(); } }}></textarea>
          <button type="submit" disabled={sending || (!reply.trim() && pendingImages.length === 0)} class="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#000A57] text-white disabled:opacity-40" aria-label="Enviar mensagem">{#if sending}<LoaderCircle size={15} class="animate-spin" />{:else}<Send size={16} />{/if}</button>
        </div>
        <p class="mt-1.5 flex items-center gap-1 text-[9px] text-[#9298A5]"><ImageIcon size={10} />PNG, JPG/JPEG ou WebP · até 8 MB cada</p>
      </form>
    {/if}
  </section>
{/if}
