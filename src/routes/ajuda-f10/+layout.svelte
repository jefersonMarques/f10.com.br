<script lang="ts">
  import { onMount } from "svelte";
  import {
    hasRestorableSupportChat,
    readRestorableSupportGuestMessages,
    SUPPORT_CHAT_GUEST_KEY,
    SUPPORT_ASSISTANT_GUEST_KEY,
  } from "$lib/support/supportChatRestore";
  import { page } from "$app/stores";
  import { MessageCircleMore } from "lucide-svelte";
  import HelpPublicAiAssistant from "$lib/components/help/HelpPublicAiAssistant.svelte";
  import SupportChatDialog from "$lib/components/onboarding/SupportChatDialog.svelte";
  import type { LayoutData } from "./$types";

  export let data: LayoutData;

  let chatOpen = false;
  let mounted = false;
  let chatActive = data.hasActiveChat;
  let checkingActiveChat = false;
  $: chatActive = data.hasActiveChat;

  $: isArticlePage = /^\/ajuda-f10\/[^/]+\/?$/.test($page.url.pathname);

  function openChat(): void {
    chatOpen = true;
  }

  async function checkActiveChat(): Promise<void> {
    if (checkingActiveChat) return;
    checkingActiveChat = true;
    try {
      const response = await fetch("/api/support/chat/resume", { cache: "no-store" });
      if (response.ok) {
        const result = await response.json() as { active?: boolean };
        chatActive = result.active === true;
      } else {
        chatActive = false;
      }
    } catch {
      chatActive = false;
    } finally {
      checkingActiveChat = false;
    }
  }

  function closeChat(): void {
    chatOpen = false;
    void checkActiveChat();
  }

  onMount(() => {
    mounted = true;
    chatOpen = hasRestorableSupportChat(window.sessionStorage) ||
      readRestorableSupportGuestMessages(window.sessionStorage, SUPPORT_CHAT_GUEST_KEY).length > 0 ||
      readRestorableSupportGuestMessages(window.sessionStorage, SUPPORT_ASSISTANT_GUEST_KEY).length > 0 ||
      ($page.data as { openChat?: boolean }).openChat === true;
    const handleOpenHelpAssistant = (): void => openChat();
    window.addEventListener("f10:open-help-assistant", handleOpenHelpAssistant);

    const refreshActiveChat = () => {
      if (!chatOpen && document.visibilityState === "visible"
        && (chatActive || data.customerSupport.authenticated)) void checkActiveChat();
    };
    refreshActiveChat();
    const timer = window.setInterval(refreshActiveChat, 15_000);
    document.addEventListener("visibilitychange", refreshActiveChat);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", refreshActiveChat);
      window.removeEventListener("f10:open-help-assistant", handleOpenHelpAssistant);
    };
  });
</script>

<slot />

{#if isArticlePage}
  <HelpPublicAiAssistant
    enabled={data.helpPublicAi.enabled}
    available={data.helpPublicAi.available}
    requiresAuthentication={data.helpPublicAi.requiresAuthentication}
  />
{/if}

{#if mounted && !chatOpen && (!isArticlePage || chatActive)}
  <button
    type="button"
    class={`fixed right-5 z-[10010] inline-flex h-14 w-14 items-center justify-center rounded-full bg-[#000A57] text-white shadow-[0_14px_36px_rgba(1,13,40,0.24)] transition hover:-translate-y-0.5 hover:bg-[#111B71] hover:shadow-[0_18px_42px_rgba(1,13,40,0.3)] sm:right-6 ${isArticlePage ? "bottom-20 sm:bottom-24" : "bottom-5 sm:bottom-6"}`}
    aria-label={chatActive ? "Retomar atendimento" : "Abrir Assistente F10"}
    title={chatActive ? "Retomar atendimento" : "Assistente F10"}
    on:click={openChat}
  >
    <MessageCircleMore size={23} aria-hidden="true" />
    {#if chatActive}<span class="absolute right-1 top-1 h-3.5 w-3.5 rounded-full border-2 border-white bg-[#22A05B]" aria-hidden="true"></span>{/if}
  </button>
{/if}

<SupportChatDialog
  isOpen={chatOpen}
  onClose={closeChat}
  customerSupport={data.customerSupport}
/>
