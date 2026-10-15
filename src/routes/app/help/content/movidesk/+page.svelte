<script lang="ts">
  import { onDestroy, onMount } from "svelte";
  import { invalidateAll } from "$app/navigation";
  import { ArrowLeft, ArrowUpRight, CheckCircle2, CircleAlert, Clock3, ExternalLink, Pause, Play, RefreshCw, ShieldCheck } from "lucide-svelte";
  import ApplicationContent from "$lib/components/application/ApplicationContent.svelte";
  import type { ActionData, PageData } from "./$types";

  export let data: PageData;
  export let form: ActionData;

  let query = "";
  let filter = "all";
  let timer: ReturnType<typeof setInterval> | undefined;

  $: filtered = data.articles.filter((article) => {
    const term = query.trim().toLocaleLowerCase("pt-BR");
    const matches = !term || `${article.title} ${article.sourceId}`.toLocaleLowerCase("pt-BR").includes(term);
    if (!matches) return false;
    if (filter === "pending") return article.state === "discovered";
    if (filter === "failed") return article.state === "failed";
    if (filter === "review") return article.needsReview && Boolean(article.contentId);
    if (filter === "published") return article.published;
    return true;
  });

  function migrationError(value: string): string {
    if (value === "MOVIDESK_API_AUTH_REJECTED" || value === "MOVIDESK_API_HTTP_401") {
      return "O Movidesk não autorizou o token (401). Confira o token de API em Configurações → Conta → Parâmetros → Ambiente.";
    }
    if (value === "MOVIDESK_API_HTTP_404") {
      return "O endereço da API não foi encontrado (404). Confirme se o servidor está atualizado.";
    }
    return value;
  }

  function stateName(value: string): string {
    if (value === "catalog") return "Listando artigos";
    if (value === "details") return "Importando conteúdos";
    if (value === "done") return "Concluído";
    return "Aguardando";
  }

  onMount(() => {
    timer = setInterval(() => {
      if (data.state?.enabled && !document.hidden) void invalidateAll();
    }, 8_000);
  });
  onDestroy(() => { if (timer) clearInterval(timer); });
</script>

<svelte:head><title>Migração Movidesk | F10 Operations</title></svelte:head>

<ApplicationContent width="wide">
  <a href="/app/help/content" class="mb-4 inline-flex items-center gap-2 text-[13px] font-semibold text-[#566075] hover:text-[#000A57]"><ArrowLeft size={16}/>Base de Conhecimento</a>

  <header class="flex flex-wrap items-center justify-between gap-4">
    <div>
      <h1 class="text-[21px] font-semibold text-[#202637]">Migração Movidesk</h1>
      <p class="mt-1 text-[13px] text-[#737989]">Importação temporária sem IA · o conteúdo original permanece preservado.</p>
    </div>
    <span class="rounded-full px-3 py-1.5 text-[12px] font-semibold {data.state?.enabled ? 'bg-[#E9F7ED] text-[#267444]' : 'bg-[#F1F2F6] text-[#677080]'}">
      {data.state?.enabled ? "Em execução" : stateName(data.state?.phase ?? "idle")}
    </span>
  </header>

  {#if form?.message}
    <div role="status" class="mt-4 rounded-xl border px-4 py-3 text-[13px] {form.success ? 'border-[#B9E6C9] bg-[#F1FBF4] text-[#176B35]' : 'border-[#F0C8C8] bg-[#FFF5F5] text-[#9B2C2C]'}">{form.message}</div>
  {/if}
  {#if !data.tokenConfigured}
    <div class="mt-4 flex items-start gap-3 rounded-xl border border-[#F2D4B0] bg-[#FFF9F1] px-4 py-3 text-[13px] text-[#81501B]"><CircleAlert size={18} class="shrink-0"/>Configure a variável MOVIDESK_KB_API_TOKEN no servidor e reinicie o serviço para iniciar a migração. A chave não deve ser enviada pelo navegador.</div>
  {/if}
  {#if data.state?.lastError}
    <div class="mt-4 flex items-start gap-3 rounded-xl border border-[#F0C8C8] bg-[#FFF5F5] px-4 py-3 text-[13px] text-[#9B2C2C]"><CircleAlert size={18} class="shrink-0"/>{migrationError(data.state.lastError)}</div>
  {/if}

  <div class="mt-5 grid gap-3 sm:grid-cols-4">
    {#each [
      { label: "Localizados", count: data.total, icon: "total" },
      { label: "Importados", count: data.imported, icon: "imported" },
      { label: "Publicados", count: data.published, icon: "published" },
      { label: "Revisão / Falhas", count: data.review + data.failed, icon: "pending" }
    ] as metric}
      <div class="rounded-xl border border-[#E2E5ED] bg-white p-4">
        <div class="text-[12px] font-medium text-[#737989]">{metric.label}</div>
        <div class="mt-2 text-[25px] font-semibold tabular-nums text-[#202637]">{metric.count}</div>
      </div>
    {/each}
  </div>

  <section class="mt-5 rounded-2xl border border-[#E2E5ED] bg-white p-4">
    <div class="flex flex-wrap items-center justify-between gap-3">
      <div class="flex items-center gap-2 text-[13px] text-[#657082]"><Clock3 size={16}/><strong class="text-[#303645]">{stateName(data.state?.phase ?? "idle")}</strong>{#if data.state?.totalCount != null}<span>· {data.state.totalCount} encontrados na API</span>{/if}</div>
      <div class="flex flex-wrap gap-2">
        {#if data.state?.enabled}
          <form method="POST" action="?/pause"><button class="inline-flex h-9 items-center gap-2 rounded-lg border border-[#DDE1EA] px-3 text-[12px] font-semibold text-[#46516A]"><Pause size={15}/>Pausar</button></form>
        {:else}
          {#if data.state?.phase === "catalog" || data.state?.phase === "details"}
            <form method="POST" action="?/resume"><button disabled={!data.tokenConfigured} class="inline-flex h-9 items-center gap-2 rounded-lg bg-[#000A57] px-3 text-[12px] font-semibold text-white disabled:opacity-40"><Play size={15}/>Continuar</button></form>
          {/if}
          <form method="POST" action="?/sync" on:submit={(event) => { if (data.total > 0 && !confirm("Atualizar o inventário do Movidesk? Artigos editados no F10 não serão substituídos.")) event.preventDefault(); }}>
            <button disabled={!data.tokenConfigured} class="inline-flex h-9 items-center gap-2 rounded-lg border border-[#DDE1EA] px-3 text-[12px] font-semibold text-[#000A57] disabled:opacity-40"><RefreshCw size={15}/>{data.total ? "Atualizar inventário" : "Iniciar migração"}</button>
          </form>
        {/if}
        {#if data.failed > 0 && !data.state?.enabled}
          <form method="POST" action="?/retry"><button disabled={!data.tokenConfigured} class="inline-flex h-9 items-center gap-2 rounded-lg border border-[#DDE1EA] px-3 text-[12px] font-semibold text-[#9B3C3C] disabled:opacity-40">Tentar falhas novamente</button></form>
        {/if}
      </div>
    </div>
    <p class="mt-3 text-[12px] leading-5 text-[#828997]">O servidor continua trabalhando mesmo com esta página fechada. Nenhum artigo existente no F10 será sobrescrito. A publicação e o redirecionamento exigem revisão.</p>
  </section>

  <section class="mt-5 overflow-hidden rounded-2xl border border-[#E2E5ED] bg-white">
    <div class="flex flex-wrap items-center gap-3 border-b border-[#ECEEF3] px-4 py-3">
      <h2 class="mr-auto text-[14px] font-semibold text-[#303645]">Artigos</h2>
      <input bind:value={query} aria-label="Buscar artigo" placeholder="Buscar título ou ID..." class="h-9 min-w-[190px] rounded-lg border border-[#DDE1EA] bg-white px-3 text-[13px] outline-none focus:border-[#000A57]"/>
      <select bind:value={filter} aria-label="Filtrar artigos" class="h-9 rounded-lg border border-[#DDE1EA] bg-white px-2 text-[13px]">
        <option value="all">Todos</option>
        <option value="pending">Pendentes</option>
        <option value="review">Revisar</option>
        <option value="failed">Falhas</option>
        <option value="published">Publicados</option>
      </select>
    </div>
    {#if filtered.length === 0}
      <p class="px-5 py-10 text-center text-[13px] text-[#8A909E]">Nenhum artigo encontrado para este filtro.</p>
    {:else}
      <div class="divide-y divide-[#ECEEF3]">
        {#each filtered as article (article.sourceId)}
          <div class="flex flex-wrap items-center gap-3 px-4 py-3 hover:bg-[#FAFAFC]">
            <div class="min-w-[220px] flex-1">
              <div class="flex items-center gap-2">
                <strong class="truncate text-[13px] font-semibold text-[#303645]">{article.title}</strong>
                <span class="shrink-0 text-[11px] tabular-nums text-[#9198A5]">#{article.sourceId}</span>
              </div>
              <div class="mt-1 flex flex-wrap items-center gap-2">
                <span class="text-[11px] {article.published ? 'text-[#277845]' : article.state === 'failed' ? 'text-[#B14C44]' : 'text-[#7A8190]'}">
                  {article.published ? "Publicado" : article.state === "failed" ? "Falha" : article.state === "review" ? "Precisa de revisão" : article.contentId ? "Importado · rascunho" : "Na fila"}
                </span>
                {#if article.issue}<span class="max-w-[460px] truncate text-[11px] text-[#A16A36]" title={article.issue}>{article.issue}</span>{/if}
              </div>
            </div>
            <div class="flex shrink-0 flex-wrap items-center gap-2">
              <a href={article.sourceUrl} target="_blank" rel="noopener noreferrer" title="Abrir original no Movidesk" aria-label="Abrir original no Movidesk" class="flex h-9 w-9 items-center justify-center rounded-lg border border-[#E3E6ED] text-[#697182] hover:text-[#000A57]"><ExternalLink size={16}/></a>
              <a href={`/app/help/content/movidesk/${article.sourceId}`} class="inline-flex h-9 items-center rounded-lg border border-[#DDE1EA] px-3 text-[12px] font-semibold text-[#4D596B]">Original salvo</a>
              {#if article.contentId}
                <a href={`/app/help/content/${article.contentId}`} class="inline-flex h-9 items-center gap-1.5 rounded-lg border border-[#DDE1EA] px-3 text-[12px] font-semibold text-[#000A57]">Abrir no F10<ArrowUpRight size={14}/></a>
                {#if article.needsReview}
                  <form method="POST" action="?/approve" on:submit={(event) => { if (!confirm("Você conferiu o conteúdo, as imagens e os anexos deste artigo no F10?")) event.preventDefault(); }}>
                    <input type="hidden" name="sourceId" value={article.sourceId}/>
                    <button class="inline-flex h-9 items-center gap-1.5 rounded-lg bg-[#EDF5EF] px-3 text-[12px] font-semibold text-[#287B49]"><ShieldCheck size={15}/>Aprovar</button>
                  </form>
                {:else}
                  <span class="inline-flex items-center gap-1 text-[12px] font-semibold text-[#27804E]"><CheckCircle2 size={15}/>Revisado</span>
                {/if}
              {/if}
            </div>
          </div>
        {/each}
      </div>
    {/if}
  </section>
</ApplicationContent>
