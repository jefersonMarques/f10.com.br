<script lang="ts">
  import { MessageCircleMore, ShieldCheck } from "lucide-svelte";
  import SupportChatDialog from "$lib/components/onboarding/SupportChatDialog.svelte";
  import type { PageData } from "./$types";

  export let data: PageData;

  let chatOpen = false;
</script>

<svelte:head>
  <title>Homologação do Chat | F10</title>
  <meta name="robots" content="noindex, nofollow, noarchive" />
  <meta name="googlebot" content="noindex, nofollow, noarchive" />
</svelte:head>

<div class="flex min-h-[100dvh] flex-col bg-[#F7F8FB] text-[#111A30]">
  <header class="border-b border-[#E6E9F0] bg-white">
    <div class="mx-auto flex max-w-[880px] items-center justify-between px-5 py-4 sm:px-8">
      <span class="text-[15px] font-bold tracking-tight text-[#000A57]">F10 <span class="font-medium text-[#424A5E]">/ Chat</span></span>
      <span class="rounded-full border border-[#DCE2EF] bg-[#F6F8FC] px-3 py-1.5 text-[11px] font-semibold text-[#566078]">Homologação interna</span>
    </div>
  </header>

  <main class="mx-auto flex w-full max-w-[880px] flex-1 items-center px-5 py-14 sm:px-8">
    <section class="w-full rounded-[24px] border border-[#E3E7EF] bg-white p-7 shadow-[0_16px_45px_rgba(1,13,40,0.05)] sm:p-10">
      <div class="mb-5 inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-[#EEF0FF] text-[#000A57]">
        <MessageCircleMore size={25} aria-hidden="true" />
      </div>
      <h1 class="text-[24px] font-semibold tracking-tight sm:text-[30px]">Teste do atendimento F10</h1>
      <p class="mt-3 max-w-[590px] text-[14px] leading-7 text-[#5E687A]">
        Ambiente isolado da navegação pública para validar o balão, as respostas da IA e a transferência ao atendimento.
      </p>

      <button
        type="button"
        on:click={() => (chatOpen = true)}
        class="mt-6 inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-[#000A57] px-5 text-[13px] font-semibold text-white transition hover:bg-[#111B71] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#000A57]"
      >
        <MessageCircleMore size={18} aria-hidden="true" />
        Abrir chat F10
      </button>

      <div class="mt-7 flex items-start gap-2 border-t border-[#EEF0F4] pt-5 text-[12px] leading-6 text-[#737C8C]">
        <ShieldCheck size={17} class="mt-1 shrink-0" aria-hidden="true" />
        <p>O assistente pode ser testado sem login. O atendimento humano exige autenticação da conta F10 e seleção de unidade. As conversas humanas de teste são registradas no atendimento real.</p>
      </div>
    </section>
  </main>
</div>

{#if !chatOpen}
  <button
    type="button"
    on:click={() => (chatOpen = true)}
    class="fixed bottom-5 right-5 z-[10010] flex h-14 w-14 items-center justify-center rounded-full bg-[#000A57] text-white shadow-[0_12px_35px_rgba(1,13,40,0.25)] transition hover:bg-[#111B71] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#000A57] sm:bottom-6 sm:right-6"
    aria-label="Abrir balão de atendimento F10"
    title="Conversar com a F10"
  >
    <MessageCircleMore size={25} aria-hidden="true" />
  </button>
{/if}

<SupportChatDialog
  isOpen={chatOpen}
  onClose={() => (chatOpen = false)}
  customerSupport={data.customerSupport}
/>
