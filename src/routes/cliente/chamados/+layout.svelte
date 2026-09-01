<script lang="ts">
  import { page } from "$app/stores";
  import { onMount } from "svelte";
  import { CircleHelp, LogOut, MessageCircleMore, Plus } from "lucide-svelte";
  import ApplicationHeader from "$lib/components/application/ApplicationHeader.svelte";
  import SupportAssistantDialog from "$lib/components/onboarding/SupportAssistantDialog.svelte";
  import { resolveCustomerRouteMetadata } from "$lib/application/routeMetadata";
  import type { LayoutData } from "./$types";

  type StoredChatSession = {
    sessionId: string;
    token: string;
    expiresAt: string;
  };

  type ChatMessagePreview = {
    id: string;
    authorType: "customer" | "user" | "system";
  };

  export let data: LayoutData;

  const CHAT_SESSION_KEY = "f10-support-chat-session-v1";
  const CHAT_NOTIFICATION_INTERVAL_MS = 4_000;

  let chatOpen = false;
  let chatUnread = false;
  let observedSessionId = "";
  let observedAgentMessageId = "";

  $: routeMetadata = resolveCustomerRouteMetadata($page.url.pathname);
  $: customerContext = data.customer.groupName
    ? `${data.customer.name} · ${data.customer.groupName}`
    : `${data.customer.name} · ${data.customer.email}`;
  $: customerSupport = {
    authenticated: true,
    name: data.customer.name,
    email: data.customer.email,
    groupName: data.customer.groupName,
    unitName: data.customer.unitName,
    requiresUnitSelection: data.customer.unitId === null,
    groups: data.customer.groups.map((group) => ({
      id: group.grupo_id,
      name: group.grupo,
      units: group.unidades.map((unit) => ({
        id: unit.unidade_id,
        name: unit.unidade,
      })),
    })),
  };

  function readStoredChatSession(): StoredChatSession | null {
    const raw = window.sessionStorage.getItem(CHAT_SESSION_KEY);
    if (!raw) return null;

    try {
      const session = JSON.parse(raw) as StoredChatSession;
      if (
        typeof session.sessionId !== "string" ||
        typeof session.token !== "string" ||
        !session.sessionId ||
        !session.token ||
        !session.expiresAt ||
        new Date(session.expiresAt).getTime() <= Date.now()
      ) {
        return null;
      }
      return session;
    } catch {
      return null;
    }
  }

  async function checkChatNotification(markAsRead = false): Promise<void> {
    if (chatOpen && !markAsRead) return;

    const session = readStoredChatSession();
    if (!session) {
      observedSessionId = "";
      observedAgentMessageId = "";
      chatUnread = false;
      return;
    }

    const sessionChanged = observedSessionId !== session.sessionId;
    if (sessionChanged) {
      observedSessionId = session.sessionId;
      observedAgentMessageId = "";
      chatUnread = false;
    }

    try {
      const response = await fetch(`/api/support/chat/${encodeURIComponent(session.sessionId)}/messages`, {
        headers: { Authorization: `Bearer ${session.token}` },
        cache: "no-store",
      });
      if (!response.ok) return;

      const payload = await response.json() as { messages?: ChatMessagePreview[] };
      const messages = Array.isArray(payload.messages) ? payload.messages : [];
      const latestAgentMessageId = [...messages]
        .reverse()
        .find((message) => message.authorType === "user")?.id ?? "";

      if (sessionChanged || !observedAgentMessageId || markAsRead) {
        observedAgentMessageId = latestAgentMessageId;
        if (markAsRead) chatUnread = false;
        return;
      }

      if (latestAgentMessageId && latestAgentMessageId !== observedAgentMessageId) {
        chatUnread = true;
      }
      observedAgentMessageId = latestAgentMessageId;
    } catch {
      // O próximo polling tenta novamente sem afetar o restante do Portal do Cliente.
    }
  }

  function openChat(): void {
    chatUnread = false;
    chatOpen = true;
    void checkChatNotification(true);
  }

  function closeChat(): void {
    void checkChatNotification(true);
    chatOpen = false;
  }

  onMount(() => {
    void checkChatNotification();
    const timer = window.setInterval(
      () => void checkChatNotification(),
      CHAT_NOTIFICATION_INTERVAL_MS,
    );
    return () => window.clearInterval(timer);
  });
</script>

<div class="min-h-screen bg-[#F7F8FB] text-[#10172A]">
  <ApplicationHeader
    title={routeMetadata.title}
    section={routeMetadata.section}
    description={customerContext}
    contentWidth="wide"
  >
    <svelte:fragment slot="actions">
      <a href="/ajuda-f10" aria-label="Central de ajuda" class="inline-flex min-h-10 min-w-10 items-center justify-center gap-2 rounded-xl border border-[#E0E3EA] bg-white px-2.5 text-[11px] font-semibold text-[#5E6575] transition hover:border-[#C8CEDB] hover:text-[#000A57] lg:px-3">
        <CircleHelp size={15} />
        <span class="hidden xl:inline">Central de ajuda</span>
      </a>
      <a href="/cliente/chamados/novo" aria-label="Novo chamado" class="inline-flex min-h-10 min-w-10 items-center justify-center gap-2 rounded-xl bg-[#000A57] px-2.5 text-[11px] font-semibold text-white transition hover:bg-[#111B71] sm:px-3.5">
        <Plus size={15} />
        <span class="hidden sm:inline">Novo chamado</span>
      </a>
      <form method="POST" action="/cliente/sair">
        <button type="submit" aria-label="Sair" class="inline-flex min-h-10 min-w-10 items-center justify-center gap-2 rounded-xl bg-[#F1F3F7] px-2.5 text-[11px] font-semibold text-[#5E6575] transition hover:bg-[#E9ECF2] hover:text-[#000A57] sm:px-3">
          <LogOut size={15} />
          <span class="hidden sm:inline">Sair</span>
        </button>
      </form>
    </svelte:fragment>
  </ApplicationHeader>

  <slot />

  {#if !chatOpen}
    <button
      type="button"
      class="fixed bottom-5 right-5 z-[10010] inline-flex h-14 w-14 items-center justify-center rounded-full bg-[#000A57] text-white shadow-[0_14px_36px_rgba(1,13,40,0.24)] transition hover:-translate-y-0.5 hover:bg-[#111B71] hover:shadow-[0_18px_42px_rgba(1,13,40,0.3)] sm:bottom-6 sm:right-6"
      aria-label={chatUnread ? "Abrir Assistente F10 — nova mensagem" : "Abrir Assistente F10"}
      title={chatUnread ? "Nova mensagem no Assistente F10" : "Assistente F10"}
      on:click={openChat}
    >
      <span class="relative inline-flex h-full w-full items-center justify-center">
        <MessageCircleMore size={23} aria-hidden="true" />
        {#if chatUnread}
          <span class="absolute right-0 top-0 h-3.5 w-3.5 rounded-full border-2 border-[#F7F8FB] bg-[#E53935]" aria-hidden="true"></span>
        {/if}
      </span>
    </button>
  {/if}
</div>

<SupportAssistantDialog
  isOpen={chatOpen}
  onClose={closeChat}
  customerSupport={customerSupport}
/>
