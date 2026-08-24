<script lang="ts">
  import {
    Activity,
    ArrowUpRight,
    BarChart3,
    BrainCircuit,
    CheckCircle2,
    CircleAlert,
    Clock3,
    Compass,
    MousePointerClick,
    Search,
    SearchX,
  } from "lucide-svelte";
  import ApplicationBackLink from "$lib/components/application/ApplicationBackLink.svelte";
  import ApplicationContent from "$lib/components/application/ApplicationContent.svelte";
  import type { PageData } from "./$types";

  export let data: PageData;

  function formatDate(value: string | Date): string {
    return new Intl.DateTimeFormat("pt-BR", {
      dateStyle: "short",
      timeStyle: "short",
    }).format(new Date(value));
  }

  function formatNumber(value: number): string {
    return new Intl.NumberFormat("pt-BR").format(value);
  }

  function resolutionLabel(value: string): string {
    if (value === "answered") return "Respondida";
    if (value === "navigate") return "Navegação direta";
    if (value === "found_elsewhere") return "Outro artigo";
    if (value === "not_found") return "Sem resposta";
    if (value === "failed") return "Falha técnica";
    return value;
  }
</script>

<svelte:head>
  <title>Insights da Base de Conhecimento | F10 Operations</title>
</svelte:head>

<ApplicationContent width="wide">
  <ApplicationBackLink href="/app/help/content" label="Base de Conhecimento" className="mb-3" />

  <section class="rounded-[22px] border border-[#D8DDF4] bg-[#F8F9FF] p-5 sm:p-6">
    <div class="flex items-start gap-3">
      <BrainCircuit size={21} class="mt-0.5 shrink-0 text-[#000A57]" />
      <div>
        <h1 class="text-[18px] font-semibold text-[#11182C]">Qualidade do Help Knowledge Core</h1>
        <p class="mt-1 max-w-[820px] text-[11px] leading-5 text-[#71788A]">
          Estes números medem a resolução final do motor único. Uma busca pode encontrar documentos e ainda assim terminar sem resposta segura; por isso as lacunas abaixo são mais importantes que resultado zero do FTS.
        </p>
      </div>
    </div>
  </section>

  <section class="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
    <div class="rounded-2xl border border-[#E2E5ED] bg-white p-5"><Activity size={19} class="text-[#000A57]"/><strong class="mt-4 block text-[25px] font-semibold">{data.knowledge.summary.runs}</strong><span class="text-[10px] text-[#858A98]">perguntas ao motor</span></div>
    <div class="rounded-2xl border border-[#E2E5ED] bg-white p-5"><CheckCircle2 size={19} class="text-[#2F7045]"/><strong class="mt-4 block text-[25px] font-semibold">{data.knowledge.summary.answered}</strong><span class="text-[10px] text-[#858A98]">resolvidas</span></div>
    <div class="rounded-2xl border border-[#E2E5ED] bg-white p-5"><SearchX size={19} class="text-[#A9510D]"/><strong class="mt-4 block text-[25px] font-semibold">{data.knowledge.summary.notFound}</strong><span class="text-[10px] text-[#858A98]">lacunas reais</span></div>
    <div class="rounded-2xl border border-[#E2E5ED] bg-white p-5"><Compass size={19} class="text-[#76510A]"/><strong class="mt-4 block text-[25px] font-semibold">{data.knowledge.summary.foundElsewhere}</strong><span class="text-[10px] text-[#858A98]">encontradas em outro artigo</span></div>
    <div class="rounded-2xl border border-[#E2E5ED] bg-white p-5"><Clock3 size={19} class="text-[#5C6475]"/><strong class="mt-4 block text-[25px] font-semibold">{data.knowledge.summary.averageLatencyMs} ms</strong><span class="text-[10px] text-[#858A98]">latência média</span></div>
    <div class="rounded-2xl border border-[#E2E5ED] bg-white p-5"><BrainCircuit size={19} class="text-[#EA6D0B]"/><strong class="mt-4 block text-[25px] font-semibold">{formatNumber(data.knowledge.summary.inputTokens + data.knowledge.summary.outputTokens)}</strong><span class="text-[10px] text-[#858A98]">tokens registrados</span></div>
  </section>

  <div class="mt-5 grid gap-5 xl:grid-cols-2">
    <section class="overflow-hidden rounded-[22px] border border-[#E2E5ED] bg-white">
      <header class="border-b border-[#EEF0F5] px-5 py-4 sm:px-6">
        <div class="flex items-center gap-3"><SearchX size={18} class="text-[#A9510D]"/><div><h2 class="text-[14px] font-semibold text-[#222839]">Lacunas da Base de Conhecimento</h2><p class="mt-1 text-[10px] text-[#8A909E]">Perguntas que chegaram ao fim do fluxo como <code>not_found</code>.</p></div></div>
      </header>
      {#if data.knowledge.gaps.length === 0}
        <div class="px-6 py-12 text-center text-[11px] text-[#9297A5]">Nenhuma lacuna real registrada até agora.</div>
      {:else}
        <div class="divide-y divide-[#EEF0F5]">
          {#each data.knowledge.gaps as item}
            <div class="px-5 py-4 sm:px-6">
              <div class="flex items-start justify-between gap-4"><strong class="text-[12px] font-semibold leading-5 text-[#303645]">{item.sampleQuestion}</strong><span class="shrink-0 rounded-full bg-[#FFF4E9] px-2.5 py-1 text-[9px] font-bold text-[#A9510D]">{item.attempts}x</span></div>
              <div class="mt-2 flex flex-wrap gap-2 text-[9px] text-[#9297A5]"><span>{item.articleAttempts} dentro de artigo</span><span>·</span><span>última em {formatDate(item.lastAskedAt)}</span></div>
            </div>
          {/each}
        </div>
      {/if}
    </section>

    <section class="overflow-hidden rounded-[22px] border border-[#E2E5ED] bg-white">
      <header class="border-b border-[#EEF0F5] px-5 py-4 sm:px-6">
        <div class="flex items-center gap-3"><Compass size={18} class="text-[#76510A]"/><div><h2 class="text-[14px] font-semibold text-[#222839]">Assunto encontrado em outro artigo</h2><p class="mt-1 text-[10px] text-[#8A909E]">Ajuda a detectar artigos com escopo confuso ou perguntas recorrentes feitas no contexto errado.</p></div></div>
      </header>
      {#if data.knowledge.foundElsewhere.length === 0}
        <div class="px-6 py-12 text-center text-[11px] text-[#9297A5]">Nenhum redirecionamento contextual registrado.</div>
      {:else}
        <div class="divide-y divide-[#EEF0F5]">
          {#each data.knowledge.foundElsewhere as item}
            <div class="px-5 py-4 sm:px-6">
              <div class="flex items-start justify-between gap-4"><strong class="text-[12px] font-semibold leading-5 text-[#303645]">{item.sampleQuestion}</strong><span class="shrink-0 rounded-full bg-[#FFF8E9] px-2.5 py-1 text-[9px] font-bold text-[#76510A]">{item.attempts}x</span></div>
              <p class="mt-2 text-[9px] text-[#9297A5]">Contexto: /{item.contextSlug || "global"} → /{item.targetSlug}</p>
              <div class="mt-2 flex items-center justify-between gap-3"><span class="text-[9px] text-[#A0A5B0]">Última em {formatDate(item.lastAskedAt)}</span>{#if item.targetContentId}<a href={`/app/help/content/${item.targetContentId}`} class="inline-flex items-center gap-1 text-[9px] font-semibold text-[#000A57]">Abrir destino <ArrowUpRight size={11}/></a>{/if}</div>
            </div>
          {/each}
        </div>
      {/if}
    </section>
  </div>

  <section class="mt-5 overflow-hidden rounded-[22px] border border-[#E2E5ED] bg-white">
    <header class="border-b border-[#EEF0F5] px-5 py-4 sm:px-6"><div class="flex items-center gap-3"><Activity size={18} class="text-[#000A57]"/><div><h2 class="text-[14px] font-semibold text-[#222839]">Execuções recentes</h2><p class="mt-1 text-[10px] text-[#8A909E]">Central, artigos e chat registrados no mesmo formato.</p></div></div></header>
    {#if data.knowledge.recentRuns.length === 0}
      <div class="px-6 py-12 text-center text-[11px] text-[#9297A5]">As execuções aparecerão após a migration e as primeiras perguntas.</div>
    {:else}
      <div class="divide-y divide-[#EEF0F5]">
        {#each data.knowledge.recentRuns as run}
          <div class="grid gap-2 px-5 py-4 sm:px-6 lg:grid-cols-[110px_1fr_160px_120px] lg:items-center">
            <div><span class="block text-[9px] font-bold uppercase text-[#737A8B]">{run.source} · {run.scope}</span><span class="mt-1 block text-[8px] text-[#A0A5B0]">{formatDate(run.createdAt)}</span></div>
            <div class="min-w-0"><strong class="block truncate text-[11px] font-semibold text-[#303645]">{run.question}</strong>{#if run.targetSlug}<span class="mt-1 block truncate text-[9px] text-[#9297A5]">Destino: /{run.targetSlug} · {run.targetType}</span>{/if}</div>
            <span class={`w-fit rounded-full px-2.5 py-1 text-[9px] font-semibold ${run.resolution === "not_found" || run.resolution === "failed" ? "bg-[#FFF3EB] text-[#A9510D]" : "bg-[#EEF8F1] text-[#2F7045]"}`}>{resolutionLabel(run.resolution)}</span>
            <div class="text-[9px] text-[#858B99]"><span>{run.latencyMs} ms</span>{#if run.inputTokens !== null || run.outputTokens !== null}<span class="block">{formatNumber((run.inputTokens ?? 0) + (run.outputTokens ?? 0))} tokens</span>{/if}</div>
          </div>
        {/each}
      </div>
    {/if}
  </section>

  <section class="mt-7 border-t border-[#DDE1EA] pt-6">
    <div class="mb-4 flex items-start gap-3"><BarChart3 size={18} class="mt-0.5 text-[#5E6677]"/><div><h2 class="text-[14px] font-semibold text-[#303645]">Retrieval textual</h2><p class="mt-1 text-[10px] text-[#8A909E]">Métricas auxiliares de FTS + similaridade. Servem para decidir futuramente se embeddings são realmente necessários.</p></div></div>

    <section class="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
      <div class="rounded-2xl border border-[#E2E5ED] bg-white p-4"><Search size={17}/><strong class="mt-3 block text-[22px] font-semibold">{data.summary.searches}</strong><span class="text-[9px] text-[#858A98]">pesquisas</span></div>
      <div class="rounded-2xl border border-[#E2E5ED] bg-white p-4"><SearchX size={17}/><strong class="mt-3 block text-[22px] font-semibold">{data.summary.withoutResults}</strong><span class="text-[9px] text-[#858A98]">resultado zero</span></div>
      <div class="rounded-2xl border border-[#E2E5ED] bg-white p-4"><MousePointerClick size={17}/><strong class="mt-3 block text-[22px] font-semibold">{data.summary.selections}</strong><span class="text-[9px] text-[#858A98]">seleções</span></div>
      <div class="rounded-2xl border border-[#E2E5ED] bg-white p-4"><CheckCircle2 size={17}/><strong class="mt-3 block text-[22px] font-semibold">{data.summary.aiAnswers}</strong><span class="text-[9px] text-[#858A98]">marcadas como respondidas</span></div>
      <div class="rounded-2xl border border-[#E2E5ED] bg-white p-4"><CircleAlert size={17}/><strong class="mt-3 block text-[22px] font-semibold">{data.summary.escalations}</strong><span class="text-[9px] text-[#858A98]">escaladas</span></div>
    </section>

    <div class="mt-5 grid gap-5 xl:grid-cols-2">
      <section class="overflow-hidden rounded-[22px] border border-[#E2E5ED] bg-white">
        <header class="border-b border-[#EEF0F5] px-5 py-4"><h3 class="text-[13px] font-semibold text-[#303645]">Pesquisas mais frequentes</h3></header>
        {#if data.topQueries.length === 0}<div class="px-5 py-10 text-center text-[10px] text-[#9297A5]">Sem dados.</div>{:else}<div class="divide-y divide-[#EEF0F5]">{#each data.topQueries as item}<div class="px-5 py-3"><div class="flex justify-between gap-3"><strong class="truncate text-[11px] text-[#303645]">{item.sampleQuery}</strong><span class="text-[9px] font-bold text-[#000A57]">{item.searches}x</span></div><p class="mt-1 text-[9px] text-[#9297A5]">{item.withoutResults} sem resultado · {formatDate(item.lastSearchedAt)}</p></div>{/each}</div>{/if}
      </section>

      <section class="overflow-hidden rounded-[22px] border border-[#E2E5ED] bg-white">
        <header class="border-b border-[#EEF0F5] px-5 py-4"><h3 class="text-[13px] font-semibold text-[#303645]">Conteúdos encontrados e escolhidos</h3></header>
        {#if data.clickedContents.length === 0}<div class="px-5 py-10 text-center text-[10px] text-[#9297A5]">Sem dados.</div>{:else}<div class="divide-y divide-[#EEF0F5]">{#each data.clickedContents as item}<a href={`/app/help/content/${item.contentId}`} class="flex items-center justify-between gap-3 px-5 py-3 hover:bg-[#FAFAFC]"><strong class="truncate text-[11px] text-[#303645]">{item.title}</strong><span class="shrink-0 text-[9px] text-[#858B99]">{item.impressions} aparições · {item.clicks} escolhas</span></a>{/each}</div>{/if}
      </section>
    </div>
  </section>
</ApplicationContent>
