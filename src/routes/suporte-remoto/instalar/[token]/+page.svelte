<script lang="ts">
  import { CheckCircle2, Download, MonitorCog, ShieldCheck } from "lucide-svelte";
  import type { PageData } from "./$types";

  export let data: PageData;
</script>

<svelte:head>
  <title>Suporte Remoto F10</title>
  <meta name="robots" content="noindex,nofollow,noarchive" />
</svelte:head>

<div class="min-h-[100dvh] bg-[#F5F6FA] px-5 py-10 text-[#010D28] sm:py-16">
  <main class="mx-auto max-w-[620px] overflow-hidden rounded-[28px] border border-[#E2E5ED] bg-white shadow-[0_24px_70px_rgba(1,13,40,0.08)]">
    <header class="border-b border-[#EEF0F5] px-6 py-6 sm:px-8">
      <div class="flex items-center gap-3">
        <span class="flex h-11 w-11 items-center justify-center rounded-xl bg-[#000A57] text-white"><MonitorCog size={20}/></span>
        <div>
          <p class="text-[9px] font-bold uppercase tracking-[0.12em] text-[#EA6D0B]">Atendimento F10</p>
          <h1 class="mt-1 text-[21px] font-semibold">Suporte Remoto F10</h1>
        </div>
      </div>
    </header>

    <div class="px-6 py-7 sm:px-8 sm:py-8">
      {#if data.enrollment.status === "completed"}
        <div class="rounded-2xl bg-[#EEF8F1] p-5 text-center">
          <CheckCircle2 size={30} class="mx-auto text-[#2F7045]"/>
          <h2 class="mt-3 text-[14px] font-semibold text-[#245D37]">Computador identificado</h2>
          <p class="mt-2 text-[10px] leading-5 text-[#50705B]">O Suporte Remoto F10 já foi reconhecido. Volte para a conversa com o atendente.</p>
        </div>
      {:else if data.enrollment.expired || data.enrollment.status === "expired" || data.enrollment.status === "cancelled"}
        <div class="rounded-2xl bg-[#FFF3F3] p-5 text-center">
          <h2 class="text-[14px] font-semibold text-[#913939]">Este link não está mais disponível</h2>
          <p class="mt-2 text-[10px] leading-5 text-[#8B6262]">Peça ao atendente F10 para gerar um novo instalador de suporte.</p>
        </div>
      {:else}
        <p class="text-[12px] leading-6 text-[#5F6676]">
          Instale este componente para que a equipe F10 possa ajudar neste computador. Ele é separado do Software F10 e pode permanecer instalado para facilitar atendimentos futuros.
        </p>

        <div class="mt-6 rounded-2xl border border-[#E2E5ED] bg-[#FAFAFC] p-5">
          <ol class="space-y-4 text-[10px] leading-5 text-[#626979]">
            <li class="flex gap-3"><span class="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#EEF0FF] text-[9px] font-bold text-[#000A57]">1</span><span>Baixe o arquivo de suporte abaixo.</span></li>
            <li class="flex gap-3"><span class="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#EEF0FF] text-[9px] font-bold text-[#000A57]">2</span><span>Abra o arquivo e escolha a opção de instalar. Se o Windows pedir autorização, confirme.</span></li>
            <li class="flex gap-3"><span class="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#EEF0FF] text-[9px] font-bold text-[#000A57]">3</span><span>Depois da instalação, volte ao chat. O atendente poderá identificar este computador automaticamente.</span></li>
          </ol>
        </div>

        <a href={`/suporte-remoto/instalar/${data.token}/download`} class="mt-6 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#000A57] px-5 text-[11px] font-semibold text-white shadow-[0_12px_30px_rgba(0,10,87,0.18)]">
          <Download size={17}/>
          Baixar Suporte Remoto F10
        </a>

        <div class="mt-5 flex items-start gap-3 rounded-2xl border border-[#D8DEF2] bg-[#F8F9FF] px-4 py-3">
          <ShieldCheck size={16} class="mt-0.5 shrink-0 text-[#000A57]"/>
          <p class="text-[9px] leading-5 text-[#626A7E]">Mesmo instalado, o componente não deve liberar acesso silencioso. Nos próximos atendimentos, confirme a solicitação exibida no próprio computador antes do acesso remoto.</p>
        </div>
      {/if}
    </div>
  </main>
</div>
