<script lang="ts">
  import { onDestroy, onMount } from "svelte";
  import { MessageCircle } from "lucide-svelte";
  import SupportChatDialog from "$lib/components/onboarding/SupportChatDialog.svelte";

  type SupportStatus = {
    isOpen: boolean | null;
    onlineAgents: number | null;
  };

  let chatOpen = false;
  let status: SupportStatus | null = null;
  let refreshTimer: ReturnType<typeof setInterval> | null = null;

  $: isLive = status?.isOpen !== false && (status?.onlineAgents ?? 0) > 0;

  async function refreshStatus(): Promise<void> {
    try {
      const response = await fetch("/api/support/chat/status", { cache: "no-store" });
      if (response.ok) status = await response.json() as SupportStatus;
    } catch {
      // O botão continua disponível mesmo se o status operacional não puder ser consultado.
    }
  }

  onMount(() => {
    void refreshStatus();
    refreshTimer = setInterval(() => void refreshStatus(), 60_000);
  });

  onDestroy(() => {
    if (refreshTimer) clearInterval(refreshTimer);
  });
</script>

<button
  type="button"
  class="fixed bottom-5 right-5 z-40 inline-flex min-h-12 items-center gap-2 rounded-full bg-[#000A57] px-4 text-[11px] font-semibold text-white shadow-[0_16px_40px_rgba(1,13,40,0.28)] transition hover:-translate-y-0.5 hover:bg-[#07146F] focus:outline-none focus:ring-4 focus:ring-[#000A57]/20 sm:bottom-7 sm:right-7"
  aria-label="Abrir atendimento F10"
  on:click={() => (chatOpen = true)}
>
  <span class="relative inline-flex h-8 w-8 items-center justify-center rounded-full bg-white/12">
    <MessageCircle size={17} aria-hidden="true" />
    {#if isLive}
      <span class="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full border-2 border-[#000A57] bg-[#38A169]" aria-hidden="true"></span>
    {/if}
  </span>
  <span>Suporte F10</span>
</button>

<SupportChatDialog isOpen={chatOpen} onClose={() => (chatOpen = false)} />
