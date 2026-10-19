<script lang="ts">
  import { onDestroy, onMount } from "svelte";
  import { invalidateAll } from "$app/navigation";
  import { enhance } from "$app/forms";
  import { ArrowLeft, ArrowUpRight, CheckCircle2, ChevronLeft, ChevronRight, CircleAlert, Clock3, ExternalLink, Eye, Images, Pause, Play, RefreshCw, ShieldCheck, X, Download } from "lucide-svelte";
  import ApplicationContent from "$lib/components/application/ApplicationContent.svelte";
  import type { ActionData, PageData } from "./$types";

  export let data: PageData;
  export let form: ActionData;

  let query = "";
  let filter = "all";
  let timer: ReturnType<typeof setInterval> | undefined;
  let previewId: number | null = null;
  let approvalMessage = "";
  let savingApproval = false;
  let previousFocus: HTMLElement | null = null;
  $: previewArticle = data.articles.find((article) => article.sourceId === previewId) ?? null;
  $: previewIndex = filtered.findIndex((article) => article.sourceId === previewId);

  function openPreview(sourceId: number): void {
    previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    previewId = sourceId;
    approvalMessage = "";
    document.body.style.overflow = "hidden";
  }
  function closePreview(): void {
    previewId = null;
    approvalMessage = "";
    document.body.style.overflow = "";
    previousFocus?.focus();
  }
  function movePreview(direction: -1 | 1): void {
    const next = filtered[previewIndex + direction];
    if (next?.contentId) {
      previewId = next.sourceId;
      approvalMessage = "";
    }
  }
  function leaveDraft(): void {
    const next = filtered.slice(previewIndex + 1).find((article) => article.contentId && article.needsReview);
    if (next) {
      previewId = next.sourceId;
      approvalMessage = "";
    } else {
      closePreview();
    }
  }
  function modalKeydown(event: KeyboardEvent): void {
    if (previewId === null || savingApproval) return;
    if (event.key === "Escape") closePreview();
  }

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
      if ((data.state?.enabled || data.imageRecovery.enabled) && !document.hidden) void invalidateAll();
    }, 8_000);
  });
  onDestroy(() => { if (timer) clearInterval(timer); if (typeof document !== "undefined") document.body.style.overflow = ""; });
</script>

<svelte:head><title>Migração Movidesk | F10 Operations</title></svelte:head>
<svelte:window on:keydown={modalKeydown} />

<ApplicationContent width="wide">
  <a href="/app/help/content" class="mb-4 inline-flex items-center gap-2 text-[13px] font-semibold text-[#566075] hover:text-[#000A57]"><ArrowLeft size={16}/>Base de Conhecimento</a>

  <header class="flex flex-wrap items-center justify-between gap-4">
    <div>
      <h1 class="text-[21px] font-semibold text-[#202637]">Migração Movidesk</h1>
      <p class="mt-1 text-[13px] text-[#737989]">Importação temporária sem IA · o conteúdo original permanece preservado.</p>
    </div>
    <div class="flex items-center gap-2">
      <a href="/app/help/content/movidesk/export" class="inline-flex min-h-10 items-center gap-2 rounded-xl border border-[#CAD7F6] bg-white px-3 text-[13px] font-semibold text-[#000A57] hover:bg-[#F5F7FF]" title="Baixar ZIP para revisão com IA">
        <Download size={16}/>Exportar pacote
      </a>
      <span class="rounded-full px-3 py-1.5 text-[12px] font-semibold {data.state?.enabled ? 'bg-[#E9F7ED] text-[#267444]' : 'bg-[#F1F2F6] text-[#677080]'}">
        {data.state?.enabled ? "Em execução" : stateName(data.state?.phase ?? "idle")}
      </span>
    </div>
  </header>

  <p class="mt-3 text-[12px] leading-5 text-[#737989]">
    O ZIP inclui todos os originais, rascunhos do F10, categorias e coleções, além dos artigos publicados somente para comparação.
    Imagens e vídeos locais são identificados por ID, sem duplicar arquivos.
  </p>

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
        {#if !data.state?.enabled && (data.state?.phase === "done" || data.state?.phase === "details") && data.total > 0}
          <form method="POST" action="?/reprocess" on:submit={(event) => {
            if (!confirm("Reprocessar os artigos ainda não revisados? Rascunhos editados, aprovados e publicados serão preservados. A fila continua no servidor.")) event.preventDefault();
          }}>
            <button disabled={!data.tokenConfigured} class="inline-flex h-9 items-center gap-2 rounded-lg border border-[#CAD7F6] bg-[#EFF3FF] px-3 text-[12px] font-semibold text-[#000A57] disabled:opacity-40"><RefreshCw size={15}/>Reprocessar artigos</button>
          </form>
        {/if}
      </div>
    </div>
    <p class="mt-3 text-[12px] leading-5 text-[#828997]">O servidor continua mesmo com a página fechada. O reprocessamento substitui apenas rascunhos importados e ainda não editados. A publicação exige revisão.</p>
  </section>

  <section class="mt-5 rounded-2xl border border-[#CAD7F6] bg-white p-4 sm:p-5">
    <div class="flex flex-wrap items-start justify-between gap-3">
      <div>
        <div class="flex items-center gap-2"><Images size={18} class="text-[#000A57]"/><h2 class="text-[15px] font-semibold text-[#111D3C]">Recuperar imagens para o bucket F10</h2></div>
        <p class="mt-1 text-[12px] text-[#667085]">Copia os arquivos e conserva artigos, vídeos, etapas e IDs. Pode fechar esta página.</p>
      </div>
      <div class="flex flex-wrap gap-2">
        {#if data.imageRecovery.enabled}
          <form method="POST" action="?/pauseImages"><button class="inline-flex h-9 items-center gap-2 rounded-lg border border-[#DDE1EA] px-3 text-[12px] font-semibold"><Pause size={15}/>Pausar</button></form>
        {:else}
          {#if data.imageRecovery.pending > 0}
            <form method="POST" action="?/recoverImages"><button disabled={!data.imageRecovery.bucketConfigured} class="inline-flex h-9 items-center gap-2 rounded-lg bg-[#000A57] px-3 text-[12px] font-semibold text-white disabled:opacity-40"><Play size={15}/>Recuperar imagens</button></form>
          {/if}
          {#if data.imageRecovery.failed > 0}
            <form method="POST" action="?/retryImages" on:submit={(event) => { if (!confirm("Tentar novamente as imagens com falha? O servidor tentará também a API de arquivos do Movidesk.")) event.preventDefault(); }}><button disabled={!data.imageRecovery.bucketConfigured} class="inline-flex h-9 items-center gap-2 rounded-lg border border-[#CAD7F6] px-3 text-[12px] font-semibold text-[#000A57] disabled:opacity-40"><RefreshCw size={15}/>Repetir falhas</button></form>
          {/if}
        {/if}
      </div>
    </div>
    <div class="mt-4 grid grid-cols-3 gap-2 text-center">
      <div class="rounded-lg bg-[#F2F7F4] px-2 py-3"><div class="text-[21px] font-semibold text-[#267444]">{data.imageRecovery.stored}</div><p class="text-[11px] text-[#657082]">No bucket</p></div>
      <div class="rounded-lg bg-[#F2F4F9] px-2 py-3"><div class="text-[21px] font-semibold text-[#202637]">{data.imageRecovery.pending}</div><p class="text-[11px] text-[#657082]">Na fila</p></div>
      <div class="rounded-lg bg-[#FFF5F1] px-2 py-3"><div class="text-[21px] font-semibold text-[#A14C3E]">{data.imageRecovery.failed}</div><p class="text-[11px] text-[#657082]">Com falha</p></div>
    </div>
    {#if !data.imageRecovery.bucketConfigured}
      <p class="mt-3 text-[12px] font-semibold text-[#A14C3E]"><CircleAlert size={14} class="mr-1 inline"/>Bucket F10 não configurado neste processo.</p>
    {/if}
    {#if data.imageRecovery.failedHosts.length}
      <p class="mt-3 text-[12px] text-[#657082]">Domínios das imagens com falha: {data.imageRecovery.failedHosts.map(item => `${item.host} (${item.count})`).join(", ")}.</p>
    {/if}
    {#if data.imageRecovery.unimported.length}
      <p class="mt-3 text-[12px] font-semibold text-[#A14C3E]">
        <CircleAlert size={14} class="mr-1 inline"/>Ainda há {data.imageRecovery.unimported.reduce((sum, item) => sum + item.missing, 0)} imagem(ns) do HTML original que não viraram bloco no F10. Revise os artigos {data.imageRecovery.unimported.map(item => "#" + item.sourceId).join(", ")} separadamente.
      </p>
    {/if}

  </section>

  <section class="mt-5 rounded-2xl border border-[#CAD7F6] bg-white p-4 sm:p-5">
    <div class="flex flex-wrap items-center justify-between gap-2">
      <div>
        <h2 class="text-[15px] font-semibold text-[#111D3C]">Importar revisão organizada</h2>
        <p class="mt-1 text-[12px] leading-5 text-[#667085]">Atualiza somente rascunhos Movidesk ainda intactos. IDs, imagens e vídeos são preservados; nada é publicado.</p>
      </div>
    </div>
    <form method="POST" action="?/editorialReview" enctype="multipart/form-data"
      class="mt-3 flex flex-wrap items-center gap-2"
      on:submit={(event) => {
        const mode = (event.submitter as HTMLButtonElement | null)?.value;
        if (mode === "apply" && !confirm("Aplicar a revisão editorial aos rascunhos? Serão verificados IDs, versões e mídias. Artigos publicados não serão alterados.")) event.preventDefault();
      }}>
      <label class="sr-only" for="movidesk-review-file">Pacote de revisão ZIP</label>
      <input id="movidesk-review-file" type="file" name="reviewFile" accept=".zip,.json,application/zip,application/json" required
        class="min-w-[180px] max-w-full rounded-lg border border-[#DDE1EA] px-2 py-2 text-[12px] text-[#45516A] file:mr-2 file:rounded file:border-0 file:bg-[#EEF0FC] file:px-2 file:py-1 file:font-semibold file:text-[#000A57]" />
      <button type="submit" name="mode" value="validate" class="min-h-10 rounded-lg border border-[#DDE1EA] px-3 text-[12px] font-semibold text-[#000A57]">Conferir pacote</button>
      <button type="submit" name="mode" value="apply" class="min-h-10 rounded-lg bg-[#000A57] px-3 text-[12px] font-semibold text-white">Aplicar revisão</button>
    </form>
    {#if form?.action === "editorialReview"}
      <p role="status" class="mt-3 text-[12px] font-semibold {form.success ? 'text-[#287B49]' : 'text-[#A14C3E]'}">{form.message}</p>
    {/if}
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
              {#if article.contentId}
                <button type="button" on:click={() => openPreview(article.sourceId)} class="inline-flex h-9 items-center gap-1.5 rounded-lg bg-[#000A57] px-3 text-[12px] font-semibold text-white hover:bg-[#121E77]"><Eye size={15}/>Prévia</button>
              {/if}
              <a href={`/app/help/content/movidesk/${article.sourceId}`} class="inline-flex h-9 items-center rounded-lg border border-[#DDE1EA] px-3 text-[12px] font-semibold text-[#4D596B]">Original salvo</a>
              {#if article.contentId}
                <a href={`/app/help/content/${article.contentId}`} class="inline-flex h-9 items-center gap-1.5 rounded-lg border border-[#DDE1EA] px-3 text-[12px] font-semibold text-[#000A57]">Abrir no F10<ArrowUpRight size={14}/></a>
                {#if article.imageStats && article.imageStats.total > 0}
                  <span class="inline-flex h-9 items-center gap-1 rounded-lg px-2 text-[12px] font-semibold {article.imageStats.stored === article.imageStats.total ? 'text-[#287B49]' : 'text-[#A14C3E]'}" title="Imagens armazenadas no F10">
                    <Images size={14}/>{article.imageStats.stored}/{article.imageStats.total}
                  </span>
                {/if}
                {#if !article.needsReview}
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

{#if previewArticle && previewArticle.contentId}
  <div class="application-ui fixed inset-0 z-[22000] flex flex-col bg-[#F5F6FA]" role="dialog" aria-modal="true" aria-labelledby="movidesk-preview-title">
    <header class="flex min-h-[72px] shrink-0 items-center justify-between gap-3 border-b border-[#DDE1E9] bg-white px-4 py-3 shadow-sm sm:px-6">
      <div class="min-w-0">
        <p class="text-[11px] font-semibold text-[#7C8492]">Revisão Movidesk · #{previewArticle.sourceId} · {previewIndex + 1}/{filtered.length}</p>
        <h2 id="movidesk-preview-title" class="mt-0.5 truncate text-[17px] font-semibold text-[#202637]">{previewArticle.title}</h2>
      </div>
      <div class="flex shrink-0 items-center gap-2">
        <button type="button" on:click={() => movePreview(-1)} disabled={previewIndex <= 0 || !filtered[previewIndex - 1]?.contentId} class="flex h-10 w-10 items-center justify-center rounded-xl border border-[#DDE1E9] disabled:opacity-30" aria-label="Artigo anterior"><ChevronLeft size={19}/></button>
        <button type="button" on:click={() => movePreview(1)} disabled={previewIndex >= filtered.length - 1 || !filtered[previewIndex + 1]?.contentId} class="flex h-10 w-10 items-center justify-center rounded-xl border border-[#DDE1E9] disabled:opacity-30" aria-label="Próximo artigo"><ChevronRight size={19}/></button>
        <button type="button" on:click={closePreview} class="flex h-10 w-10 items-center justify-center rounded-xl border border-[#DDE1E9]" aria-label="Fechar prévia"><X size={20}/></button>
      </div>
    </header>

    <div class="min-h-0 flex-1">
      {#key previewArticle.contentId}
        <iframe src={`/app/help/content/${previewArticle.contentId}/preview?movideskReview=1`} title={`Prévia do artigo: ${previewArticle.title}`} class="h-full w-full border-0" />
      {/key}
    </div>

    <footer class="flex shrink-0 flex-wrap items-center justify-between gap-3 border-t border-[#DDE1E9] bg-white px-4 py-3 sm:px-6">
      <div class="min-w-0 text-[12px] text-[#697182]">
        {#if previewArticle.imageStats && previewArticle.imageStats.total > 0}
          <span class={previewArticle.imageStats.stored === previewArticle.imageStats.total ? "text-[#287B49]" : "font-semibold text-[#A14C3E]"}>
            Imagens no F10: {previewArticle.imageStats.stored}/{previewArticle.imageStats.total}
          </span>
        {:else}
          <span>Confira os vídeos, textos e imagens antes de aprovar.</span>
        {/if}
        {#if approvalMessage}<p role="alert" class="mt-1 font-semibold text-[#A14C3E]">{approvalMessage}</p>{/if}
      </div>
      <div class="flex items-center gap-2">
        <a href={`/app/help/content/${previewArticle.contentId}`} target="_blank" rel="noopener noreferrer" class="hidden min-h-10 items-center gap-1.5 rounded-xl border border-[#DDE1E9] px-4 text-[12px] font-semibold text-[#000A57] sm:inline-flex">Editar<ArrowUpRight size={15}/></a>
        <button type="button" on:click={leaveDraft} class="min-h-10 rounded-xl border border-[#DDE1E9] px-4 text-[12px] font-semibold text-[#48526A]">Manter rascunho</button>
        {#if previewArticle.needsReview}
          <form method="POST" action="?/approve" use:enhance={() => {
            savingApproval = true;
            approvalMessage = "";
            const index = previewIndex;
            const nextId = filtered.slice(index + 1).find((article) => article.contentId && article.needsReview)?.sourceId ?? null;
            return async ({ result, update }) => {
              savingApproval = false;
              if (result.type === "success") {
                await update({ reset: false, invalidateAll: true });
                if (nextId) previewId = nextId;
                else closePreview();
              } else {
                approvalMessage = result.type === "failure"
                  ? String(result.data?.message ?? "Não foi possível aprovar.")
                  : "Não foi possível aprovar.";
              }
            };
          }}>
            <input type="hidden" name="sourceId" value={previewArticle.sourceId}/>
            <button disabled={savingApproval || Boolean(previewArticle.imageStats && previewArticle.imageStats.stored < previewArticle.imageStats.total)} class="inline-flex min-h-10 items-center gap-2 rounded-xl bg-[#EDF5EF] px-4 text-[12px] font-semibold text-[#287B49] disabled:cursor-not-allowed disabled:opacity-50"><ShieldCheck size={16}/>{savingApproval ? "Aprovando..." : "Aprovar"}</button>
          </form>
        {:else}
          <span class="inline-flex min-h-10 items-center gap-2 px-3 text-[12px] font-semibold text-[#287B49]"><CheckCircle2 size={16}/>Revisado</span>
        {/if}
      </div>
    </footer>
  </div>
{/if}
