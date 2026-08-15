<script lang="ts">
  import {
    ArrowLeft,
    BarChart3,
    BrainCircuit,
    CheckCircle2,
    MousePointerClick,
    Search,
    SearchX,
  } from "lucide-svelte";
  import type { PageData } from "./$types";

  export let data: PageData;

  function formatDate(value: string | Date): string {
    return new Intl.DateTimeFormat("pt-BR", {
      dateStyle: "short",
      timeStyle: "short",
    }).format(new Date(value));
  }
</script>

<svelte:head>
  <title>Insights da Central | F10 Operations</title>
</svelte:head>

<div class="mx-auto max-w-[1380px] px-5 py-7 sm:px-8 sm:py-9">
  <a href="/app/help/search" class="inline-flex min-h-10 items-center gap-2 rounded-xl px-2 text-[12px] font-semibold text-[#5F6575] transition hover:bg-white hover:text-[#000A57]">
    <ArrowLeft size={17} aria-hidden="true" />
    Voltar para Pesquisa de Suporte
  </a>

  <div class="mt-5">
    <p class="text-[10px] font-bold uppercase tracking-[0.14em] text-[#EA6D0B]">Evolução contínua</p>
    <h1 class="mt-2 text-[30px] font-semibold tracking-[-0.035em] text-[#010D28] sm:text-[38px]">Insights da Central</h1>
    <p class="mt-2 max-w-[800px] text-[14px] leading-6 text-[#6F7585]">Veja o que as pessoas realmente procuram, onde a base não responde, quais conteúdos são escolhidos e quantas dúvidas o agente consegue responder sem atendimento humano.</p>
  </div>

  <section class="mt-7 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
    <div class="rounded-2xl border border-[#E2E5ED] bg-white p-5"><Search size={20} class="text-[#000A57]" aria-hidden="true" /><strong class="mt-4 block text-[26px] font-semibold">{data.summary.searches}</strong><span class="text-[11px] text-[#858A98]">pesquisas registradas</span></div>
    <div class="rounded-2xl border border-[#E2E5ED] bg-white p-5"><SearchX size={20} class="text-[#A9510D]" aria-hidden="true" /><strong class="mt-4 block text-[26px] font-semibold">{data.summary.withoutResults}</strong><span class="text-[11px] text-[#858A98]">sem resultado</span></div>
    <div class="rounded-2xl border border-[#E2E5ED] bg-white p-5"><MousePointerClick size={20} class="text-[#2F7045]" aria-hidden="true" /><strong class="mt-4 block text-[26px] font-semibold">{data.summary.selections}</strong><span class="text-[11px] text-[#858A98]">resultados escolhidos</span></div>
    <div class="rounded-2xl border border-[#E2E5ED] bg-white p-5"><CheckCircle2 size={20} class="text-[#2F7045]" aria-hidden="true" /><strong class="mt-4 block text-[26px] font-semibold">{data.summary.aiAnswers}</strong><span class="text-[11px] text-[#858A98]">respondidas pela IA</span></div>
    <div class="rounded-2xl border border-[#E2E5ED] bg-white p-5"><BrainCircuit size={20} class="text-[#EA6D0B]" aria-hidden="true" /><strong class="mt-4 block text-[26px] font-semibold">{data.summary.escalations}</strong><span class="text-[11px] text-[#858A98]">escalamentos para humano</span></div>
  </section>

  <div class="mt-7 grid gap-6 xl:grid-cols-2">
    <section class="overflow-hidden rounded-[24px] border border-[#E2E5ED] bg-white">
      <header class="border-b border-[#EEF0F5] px-5 py-4 sm:px-6"><div class="flex items-center gap-3"><BarChart3 size={18} class="text-[#000A57]" aria-hidden="true" /><div><h2 class="text-[14px] font-semibold text-[#222839]">Pesquisas mais frequentes</h2><p class="mt-1 text-[10px] text-[#8A909E]">Termos equivalentes são agrupados pela forma normalizada.</p></div></div></header>
      {#if data.topQueries.length === 0}
        <div class="px-6 py-12 text-center text-[11px] text-[#9297A5]">A telemetria aparecerá depois das primeiras pesquisas.</div>
      {:else}
        <div class="divide-y divide-[#EEF0F5]">
          {#each data.topQueries as item}
            <div class="px-5 py-4 sm:px-6">
              <div class="flex items-start justify-between gap-4"><div class="min-w-0"><strong class="block truncate text-[12px] font-semibold text-[#303645]">{item.sampleQuery}</strong><span class="mt-1 block text-[9px] text-[#A0A5B0]">normalizado: {item.normalizedQuery}</span></div><span class="shrink-0 rounded-full bg-[#EEF0FF] px-2.5 py-1 text-[9px] font-bold text-[#000A57]">{item.searches}x</span></div>
              <div class="mt-2 flex flex-wrap gap-2 text-[9px] text-[#858B99]"><span>{item.withoutResults} sem resultado</span><span>·</span><span>última em {formatDate(item.lastSearchedAt)}</span></div>
            </div>
          {/each}
        </div>
      {/if}
    </section>

    <section class="overflow-hidden rounded-[24px] border border-[#E2E5ED] bg-white">
      <header class="border-b border-[#EEF0F5] px-5 py-4 sm:px-6"><div class="flex items-center gap-3"><SearchX size={18} class="text-[#A9510D]" aria-hidden="true" /><div><h2 class="text-[14px] font-semibold text-[#222839]">Lacunas de conhecimento</h2><p class="mt-1 text-[10px] text-[#8A909E]">Perguntas que não encontraram nenhum conteúdo publicado.</p></div></div></header>
      {#if data.noResultQueries.length === 0}
        <div class="px-6 py-12 text-center text-[11px] text-[#9297A5]">Nenhuma lacuna registrada até agora.</div>
      {:else}
        <div class="divide-y divide-[#EEF0F5]">
          {#each data.noResultQueries as item}
            <div class="px-5 py-4 sm:px-6">
              <div class="flex items-start justify-between gap-4"><strong class="text-[12px] font-semibold text-[#303645]">{item.sampleQuery}</strong><span class="shrink-0 rounded-full bg-[#FFF4E9] px-2.5 py-1 text-[9px] font-bold text-[#A9510D]">{item.searches}x</span></div>
              <p class="mt-2 text-[9px] text-[#999EAA]">Última tentativa em {formatDate(item.lastSearchedAt)}</p>
            </div>
          {/each}
        </div>
      {/if}
    </section>
  </div>

  <section class="mt-6 overflow-hidden rounded-[24px] border border-[#E2E5ED] bg-white">
    <header class="border-b border-[#EEF0F5] px-5 py-4 sm:px-6"><div class="flex items-center gap-3"><MousePointerClick size={18} class="text-[#2F7045]" aria-hidden="true" /><div><h2 class="text-[14px] font-semibold text-[#222839]">Conteúdos encontrados e escolhidos</h2><p class="mt-1 text-[10px] text-[#8A909E]">Ajuda a identificar conteúdo relevante e resultado que aparece mas não resolve.</p></div></div></header>
    {#if data.clickedContents.length === 0}
      <div class="px-6 py-12 text-center text-[11px] text-[#9297A5]">Ainda não há seleção de resultados.</div>
    {:else}
      <div class="divide-y divide-[#EEF0F5]">
        {#each data.clickedContents as item}
          <a href={`/app/help/content/${item.contentId}`} class="flex flex-col justify-between gap-3 px-5 py-4 transition hover:bg-[#FAFAFC] sm:flex-row sm:items-center sm:px-6"><strong class="text-[12px] font-semibold text-[#303645]">{item.title}</strong><div class="flex gap-2 text-[9px]"><span class="rounded-full bg-[#F3F4F7] px-2.5 py-1 font-semibold text-[#777D8D]">{item.impressions} aparições</span><span class="rounded-full bg-[#EEF8F1] px-2.5 py-1 font-semibold text-[#2F7045]">{item.clicks} escolhas</span></div></a>
        {/each}
      </div>
    {/if}
  </section>
</div>
