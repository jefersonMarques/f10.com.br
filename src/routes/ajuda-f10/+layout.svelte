<script lang="ts">
  import { onMount } from "svelte";
  import { MessageCircleMore } from "lucide-svelte";
  import SupportAssistantDialog from "$lib/components/onboarding/SupportAssistantDialog.svelte";
  import type { LayoutData } from "./$types";

  export let data: LayoutData;

  const HELP_CHAT_CLOSED_KEY = "f10-help-assistant-closed-v1";
  let chatOpen = false;
  let mounted = false;

  function openChat(): void {
    chatOpen = true;
    if (mounted) window.sessionStorage.removeItem(HELP_CHAT_CLOSED_KEY);
  }

  function closeChat(): void {
    chatOpen = false;
    if (mounted) window.sessionStorage.setItem(HELP_CHAT_CLOSED_KEY, "1");
  }

  onMount(() => {
    mounted = true;
    chatOpen = window.sessionStorage.getItem(HELP_CHAT_CLOSED_KEY) !== "1";
  });
</script>

<slot />

{#if mounted && !chatOpen}
  <button
    type="button"
    class="fixed bottom-5 right-5 z-[10010] inline-flex h-14 w-14 items-center justify-center rounded-full bg-[#000A57] text-white shadow-[0_14px_36px_rgba(1,13,40,0.24)] transition hover:-translate-y-0.5 hover:bg-[#111B71] hover:shadow-[0_18px_42px_rgba(1,13,40,0.3)] sm:bottom-6 sm:right-6"
    aria-label="Abrir Assistente F10"
    title="Assistente F10"
    on:click={openChat}
  >
    <MessageCircleMore size={23} aria-hidden="true" />
  </button>
{/if}

<SupportAssistantDialog
  isOpen={chatOpen}
  onClose={closeChat}
  customerSupport={data.customerSupport}
/>
