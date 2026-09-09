<script lang="ts">
  import {
    ArrowUpRight,
    BarChart3,
    BrainCircuit,
    CircleAlert,
    FileText,
    GraduationCap,
    Layers3,
    Search,
    SearchX,
    Users,
  } from "lucide-svelte";
  import ApplicationContent from "$lib/components/application/ApplicationContent.svelte";
  import type { PageData } from "./$types";

  export let data: PageData;

  function formatDate(value: string | Date): string {
    return new Intl.DateTimeFormat("pt-BR", {
      dateStyle: "short",
    }).format(new Date(value));
  }
</script>

<svelte:head><title>Base de Conhecimento | F10 Operations</title></svelte:head>

<ApplicationContent width="wide">
  <div class="mb-4 flex flex-wrap items-center justify-end gap-2">
    <a href="/app/help/content" class="inline-flex min-h-10 items-center gap-2 rounded-xl border border-[#DDE1EA] bg-white px-3.5 text-[10px] font-semibold text-[#000A57]"><FileText size={14}/>Conteúdos</a>
    <a href="/app/help/collections" class="inline-flex min-h-10 items-center gap-2 rounded-xl border border-[#DDE1EA] bg-white px-3.5 text-[10px] font-semibold text-[#000A57]"><Layers3 size={14}/>Coleções</a>
    <a href="/app/help/trilhas" class="inline-flex min-h-10 items-center gap-2 rounded-xl border border-[#DDE1EA] bg-white px-3.5 text-[10px] font-semibold text-[#000A57]"><GraduationCap size={14}/>Trilhas</a>
    <a href="/app/help/insights" class="inline-flex min-h-10 items-center gap-2 rounded-xl bg-[#000A57] px-3.5 text-[10px] font-semibold text-white"><BarChart3 size={14}/>Detalhes</a>
  </div>

  <section class="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
    <div class="rounded-2xl border border-[#E2E5ED] bg-white p-5">
      <Search size={19} class="text-[#000A57]"/>
      <strong class="mt-4 block text-[26px] font-semibold">{data.summary.searches}</strong>
      <span class="text-[10px] text-[#858A98]">pesquisas</span>
    </div>
    <div class="rounded-2xl border border-[#F0D7C4] bg-[#FFF9F4] p-5">
      <SearchX size={19} class="text-[#A9510D]"/>
      <strong class="mt-4 block text-[26px] font-semibold text-[#7A3B08]">{data.summary.withoutResults}</strong>
      <span class="text-[10px] text-[#91603A]">sem resultado</span>
    </div>
    <div class="rounded-2xl border border-[#F0D7C4] bg-[#FFF9F4] p-5">
      <BrainCircuit size={19} class="text-[#EA6D0B]"/>
      <strong class="mt-4 block text-[26px] font-semibold text-[#7A3B08]">{data.knowledge.summary.notFound}</strong>
      <span class="text-[10px] text-[#91603A]">IA sem resposta</span>
    </div>
    <div class="rounded-2xl border border-[#E2E5ED] bg-white p-5">
      <Users size={19} class="text-[#000A57]"/>
      <strong class="mt-4 block text-[26px] font-semibold">{data.summary.escalations}</strong>
      <span class="text-[10px] text-[#858A98]">viraram atendimento</span>
    </div>
  </section>

  <div class="mt-5 grid gap-5 xl:grid-cols-2">
    <section class="overflow-hidden rounded-[22px] border border-[#F0D7C4] bg-white">
      <header class="flex items-center gap-3 border-b border-[#F4E4D7] bg-[#FFF9F4] px-5 py-4 sm:px-6">
        <BrainCircuit size={17} class="text-[#EA6D0B]"/>
        <h2 class="text-[13px] font-semibold text-[#303645]">IA não conseguiu responder</h2>
      </header>
      {#if data.knowledge.gaps.length === 0}
        <div class="px-6 py-12 text-center text-[10px] text-[#9297A5]">Nenhuma lacuna registrada.</div>
      {:else}
        <div class="divide-y divide-[#EEF0F5]">
          {#each data.knowledge.gaps.slice(0, 10) as item}
            <div class="flex items-start justify-between gap-4 px-5 py-4 sm:px-6">
              <div class="min-w-0">
                <strong class="block text-[11px] leading-5 text-[#303645]">{item.sampleQuestion}</strong>
                <span class="mt-1 block text-[8px] text-[#A0A5B0]">{formatDate(item.lastAskedAt)}</span>
              </div>
              <span class="shrink-0 rounded-full bg-[#FFF0E4] px-2.5 py-1 text-[9px] font-bold text-[#A9510D]">{item.attempts}x</span>
            </div>
          {/each}
        </div>
      {/if}
    </section>

    <section class="overflow-hidden rounded-[22px] border border-[#E2E5ED] bg-white">
      <header class="flex items-center gap-3 border-b border-[#EEF0F5] px-5 py-4 sm:px-6">
        <SearchX size={17} class="text-[#A9510D]"/>
        <h2 class="text-[13px] font-semibold text-[#303645]">Buscas sem conteúdo</h2>
      </header>
      {#if data.noResultQueries.length === 0}
        <div class="px-6 py-12 text-center text-[10px] text-[#9297A5]">Nenhuma busca sem resultado.</div>
      {:else}
        <div class="divide-y divide-[#EEF0F5]">
          {#each data.noResultQueries.slice(0, 10) as item}
            <div class="flex items-start justify-between gap-4 px-5 py-4 sm:px-6">
              <div class="min-w-0">
                <strong class="block text-[11px] leading-5 text-[#303645]">{item.sampleQuery}</strong>
                <span class="mt-1 block text-[8px] text-[#A0A5B0]">{formatDate(item.lastSearchedAt)}</span>
              </div>
              <span class="shrink-0 rounded-full bg-[#F3F4F7] px-2.5 py-1 text-[9px] font-bold text-[#5E6575]">{item.searches}x</span>
            </div>
          {/each}
        </div>
      {/if}
    </section>
  </div>

  <div class="mt-5 grid gap-5 xl:grid-cols-2">
    <section class="overflow-hidden rounded-[22px] border border-[#E2E5ED] bg-white">
      <header class="flex items-center gap-3 border-b border-[#EEF0F5] px-5 py-4 sm:px-6">
        <ArrowUpRight size={17} class="text-[#76510A]"/>
        <h2 class="text-[13px] font-semibold text-[#303645]">Resposta estava em outro artigo</h2>
      </header>
      {#if data.knowledge.foundElsewhere.length === 0}
        <div class="px-6 py-12 text-center text-[10px] text-[#9297A5]">Nenhum caso registrado.</div>
      {:else}
        <div class="divide-y divide-[#EEF0F5]">
          {#each data.knowledge.foundElsewhere.slice(0, 10) as item}
            <div class="px-5 py-4 sm:px-6">
              <div class="flex items-start justify-between gap-3">
                <strong class="text-[11px] leading-5 text-[#303645]">{item.sampleQuestion}</strong>
                <span class="shrink-0 text-[9px] font-bold text-[#76510A]">{item.attempts}x</span>
              </div>
              <div class="mt-2 flex items-center justify-between gap-3">
                <span class="truncate text-[8px] text-[#9297A5]">/{item.contextSlug || "global"} → /{item.targetSlug}</span>
                {#if item.targetContentId}
                  <a href={`/app/help/content/${item.targetContentId}/images`} class="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#F3F4F7] text-[#000A57]" aria-label="Abrir conteúdo" title="Abrir conteúdo"><ArrowUpRight size={12}/></a>
                {/if}
              </div>
            </div>
          {/each}
        </div>
      {/if}
    </section>

    <section class="overflow-hidden rounded-[22px] border border-[#E2E5ED] bg-white">
      <header class="flex items-center gap-3 border-b border-[#EEF0F5] px-5 py-4 sm:px-6">
        <Search size={17} class="text-[#000A57]"/>
        <h2 class="text-[13px] font-semibold text-[#303645]">Mais pesquisados</h2>
      </header>
      {#if data.topQueries.length === 0}
        <div class="px-6 py-12 text-center text-[10px] text-[#9297A5]">Sem pesquisas registradas.</div>
      {:else}
        <div class="divide-y divide-[#EEF0F5]">
          {#each data.topQueries.slice(0, 10) as item}
            <div class="px-5 py-4 sm:px-6">
              <div class="flex items-center justify-between gap-4">
                <strong class="truncate text-[11px] text-[#303645]">{item.sampleQuery}</strong>
                <span class="shrink-0 text-[9px] font-bold text-[#000A57]">{item.searches}x</span>
              </div>
              {#if item.withoutResults > 0}
                <div class="mt-2 flex items-center gap-1.5 text-[8px] font-medium text-[#A9510D]"><CircleAlert size={11}/>{item.withoutResults} sem resultado</div>
              {/if}
            </div>
          {/each}
        </div>
      {/if}
    </section>
  </div>
</ApplicationContent>
