<script lang="ts">
  import { invalidateAll } from "$app/navigation";
  import { onDestroy, onMount } from "svelte";
  import {
    Archive,
    ArrowRight,
    BarChart3,
    BookOpenCheck,
    CheckCircle2,
    CircleAlert,
    ExternalLink,
    Eye,
    FilePlus2,
    HardDrive,
    Layers3,
    LoaderCircle,
    RefreshCw,
    RotateCcw,
    Trash2,
    TriangleAlert,
    UploadCloud,
    X,
  } from "lucide-svelte";
  import ApplicationContent from "$lib/components/application/ApplicationContent.svelte";
  import type { ActionData, PageData } from "./$types";

  export let data: PageData;
  export let form: ActionData;

  const statusLabels: Record<string, string> = {
    draft: "Rascunho",
    review: "Em revisão",
    published: "Publicado",
    archived: "Arquivado",
  };
  const ACTIVE_PROCESSING_STATUSES = new Set([
    "queued",
    "running",
    "retry_waiting",
  ]);

  type ContentItem = PageData["contents"][number];
  type ProcessingJob = NonNullable<ContentItem["processingJob"]>;

  let deleteTarget: { id: string; title: string; hasPublicVersion: boolean } | null = null;
  let deleteConfirmation = "";
  let processingTargetId: string | null = null;
  let processingTarget: ContentItem | null = null;
  let processingTargetJob: ProcessingJob | null = null;
  let retryingJobId = "";
  let cancellingJobId = "";
  let processingRefreshTimer: ReturnType<typeof setInterval> | null = null;

  $: processingTarget = processingTargetId
    ? data.contents.find((content) => content.id === processingTargetId) ?? null
    : null;
  $: processingTargetJob = processingTarget?.processingJob ?? null;
  $: hasProcessingJobs = data.contents.some(
    (content) =>
      content.processingJob
      && ACTIVE_PROCESSING_STATUSES.has(content.processingJob.status),
  );
  $: values = form && "values" in form ? form.values : null;
  $: deleteConfirmationReady = deleteConfirmation.trim().toLocaleLowerCase("pt-BR").replace(/\s+/g, " ") === "quero excluir";

  function openDeleteModal(content: { id: string; title: string; publishedSlug: string | null }): void {
    deleteTarget = {
      id: content.id,
      title: content.title,
      hasPublicVersion: Boolean(content.publishedSlug),
    };
    deleteConfirmation = "";
  }

  function closeDeleteModal(): void {
    deleteTarget = null;
    deleteConfirmation = "";
  }

  function isProcessingActive(status: string | undefined): boolean {
    return Boolean(status && ACTIVE_PROCESSING_STATUSES.has(status));
  }

  function openProcessingDetails(contentId: string): void {
    processingTargetId = contentId;
  }

  function closeProcessingDetails(): void {
    processingTargetId = null;
  }

  function isProcessingCancelled(job: ProcessingJob): boolean {
    return job.lastErrorCode === "HELP_VIDEO_PROCESSING_CANCELLED";
  }

  function isQueueStalled(job: ProcessingJob): boolean {
    if (job.status !== "queued") return false;
    const createdAt = new Date(job.createdAt).getTime();
    return Number.isFinite(createdAt) && Date.now() - createdAt > 60_000;
  }

  function processingStatusLabel(job: ProcessingJob): string {
    if (job.status === "completed") return "Concluído";
    if (isProcessingCancelled(job)) return "Cancelado";
    if (job.status === "failed") return "Falhou";
    if (job.status === "retry_waiting") return "Nova tentativa";
    if (job.status === "queued") return isQueueStalled(job) ? "Fila parada" : "Na fila";
    return "Processando";
  }

  function processingCurrentLabel(job: ProcessingJob): string {
    return isQueueStalled(job)
      ? "O servidor de processamento ainda não iniciou este job"
      : job.progressLabel;
  }

  function processingCurrentDetail(job: ProcessingJob): string {
    return isQueueStalled(job)
      ? "Você pode cancelar esta execução. Após o deploy, o worker também será validado pelo PM2."
      : job.progressDetail;
  }

  function processingTime(value: string): string {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "";
    return new Intl.DateTimeFormat("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    }).format(date);
  }

  async function cancelProcessing(job: ProcessingJob): Promise<void> {
    if (cancellingJobId || !data.canEdit) return;
    if (!confirm("Cancelar este processamento? O progresso já salvo será preservado.")) return;

    cancellingJobId = job.id;
    try {
      const response = await fetch(
        `/api/app/help/content/${job.contentId}/regenerate`,
        {
          method: "PATCH",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            jobId: job.id,
            action: "cancel",
          }),
        },
      );
      if (response.ok) await invalidateAll();
    } finally {
      cancellingJobId = "";
    }
  }

  async function retryProcessing(job: ProcessingJob): Promise<void> {
    if (retryingJobId || !data.canEdit) return;
    retryingJobId = job.id;
    try {
      const response = await fetch(
        `/api/app/help/content/${job.contentId}/regenerate`,
        {
          method: "PATCH",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            jobId: job.id,
            action: "retry",
          }),
        },
      );
      if (response.ok) await invalidateAll();
    } finally {
      retryingJobId = "";
    }
  }

  function handleEscape(event: KeyboardEvent): void {
    if (event.key !== "Escape") return;
    if (processingTargetId) {
      closeProcessingDetails();
      return;
    }
    if (deleteTarget) closeDeleteModal();
  }

  onMount(() => {
    processingRefreshTimer = setInterval(() => {
      if (hasProcessingJobs && !document.hidden) {
        void invalidateAll();
      }
    }, 5_000);
  });

  onDestroy(() => {
    if (processingRefreshTimer) clearInterval(processingRefreshTimer);
  });
</script>

<svelte:head><title>Base de Conhecimento | F10 Operations</title></svelte:head>

<svelte:window on:keydown={handleEscape} />

<ApplicationContent width="wide">
  <div class="mb-3 flex flex-wrap justify-end gap-2">
    <a href="/app/help/insights" class="inline-flex min-h-10 items-center gap-2 rounded-xl border border-[#DDE1EA] bg-white px-4 text-[11px] font-semibold text-[#000A57]"><BarChart3 size={15}/>Insights</a>
    <a href="/app/help/categories" class="inline-flex min-h-10 items-center gap-2 rounded-xl border border-[#DDE1EA] bg-white px-4 text-[11px] font-semibold text-[#000A57]">Categorias</a>
    <a href="/app/help/assets" class="inline-flex min-h-10 items-center gap-2 rounded-xl border border-[#DDE1EA] bg-white px-4 text-[11px] font-semibold text-[#000A57]"><HardDrive size={15}/>Biblioteca</a>
    {#if data.canEdit}<a href="/app/help/content/import" class="inline-flex min-h-10 items-center gap-2 rounded-xl border border-[#DDE1EA] bg-white px-4 text-[11px] font-semibold text-[#000A57]"><UploadCloud size={15}/>Importar</a>{/if}
  </div>

  {#if form?.message}
    <div class="mb-3 flex items-start gap-3 rounded-2xl border border-[#F0C8C8] bg-[#FFF5F5] px-4 py-3 text-[12px] font-medium text-[#9B2C2C]"><CircleAlert size={18}/><span>{form.message}</span></div>
  {/if}

  <section class="grid gap-3 md:grid-cols-3">
    <div class="rounded-2xl border border-[#E2E5ED] bg-white p-5"><BookOpenCheck size={20} class="text-[#000A57]"/><strong class="mt-4 block text-[26px] font-semibold">{data.contents.length}</strong><span class="text-[11px] text-[#858A98]">conteúdos estruturados</span></div>
    <div class="rounded-2xl border border-[#E2E5ED] bg-white p-5"><Layers3 size={20} class="text-[#000A57]"/><strong class="mt-4 block text-[26px] font-semibold">{data.contents.reduce((total, content) => total + content.stepCount, 0)}</strong><span class="text-[11px] text-[#858A98]">passos cadastrados</span></div>
    <div class="rounded-2xl border border-[#E2E5ED] bg-white p-5"><strong class="block text-[15px] font-semibold text-[#11182C]">Conhecimento único</strong><span class="mt-2 block text-[11px] leading-5 text-[#858A98]">Central, artigos e chat usarão a mesma publicação estruturada.</span></div>
  </section>

  <div class="mt-5 grid gap-5 xl:grid-cols-[minmax(0,1fr)_410px]">
    <section class="overflow-hidden rounded-[22px] border border-[#E2E5ED] bg-white">
      <header class="border-b border-[#EEF0F5] px-5 py-4 sm:px-6"><h2 class="text-[16px] font-semibold text-[#11182C]">Conteúdos</h2><p class="mt-1 text-[11px] text-[#858A98]">Cada conteúdo deve participar de pelo menos uma categoria ativa.</p></header>
      {#if data.contents.length === 0}
        <div class="px-6 py-16 text-center"><BookOpenCheck size={34} class="mx-auto text-[#B6BBC7]"/><p class="mt-4 text-[13px] font-semibold text-[#4B5160]">Nenhum conteúdo estruturado</p></div>
      {:else}
        <div class="divide-y divide-[#EEF0F5]">
          {#each data.contents as content}
            <div class={`px-5 py-4 transition sm:px-6 ${content.status === "archived" ? "bg-[#FAFAFC] opacity-80" : "hover:bg-[#FAFAFC]"}`}>
              <div class="flex flex-col justify-between gap-4 lg:flex-row lg:items-center">
                <div class="min-w-0 flex-1">
                  <div class="flex flex-wrap items-center gap-2">
                    {#if isProcessingActive(content.processingJob?.status)}
                      <strong class="truncate text-[13px] font-semibold text-[#252B3B]">{content.title}</strong>
                    {:else}
                      <a href={`/app/help/content/${content.id}/images`} class="truncate text-[13px] font-semibold text-[#252B3B] hover:text-[#000A57]">{content.title}</a>
                    {/if}

                    <span class={`application-text-meta rounded-full px-2 py-1 font-bold uppercase tracking-[0.05em] ${content.status === "published" ? "bg-[#EEF8F1] text-[#2F7045]" : content.status === "archived" ? "bg-[#F1F1F3] text-[#676D7D]" : "bg-[#F2F3F7] text-[#707687]"}`}>
                      {statusLabels[content.status] ?? content.status}
                    </span>

                    {#if content.processingJob?.status === "completed"}
                      <span class="application-text-meta inline-flex items-center gap-1.5 rounded-full bg-[#EEF8F1] px-2 py-1 font-bold uppercase tracking-[0.05em] text-[#2F7045]"><CheckCircle2 size={11}/>Processado</span>
                    {:else if content.processingJob && isProcessingCancelled(content.processingJob)}
                      <span class="application-text-meta inline-flex items-center gap-1.5 rounded-full bg-[#F1F1F3] px-2 py-1 font-bold uppercase tracking-[0.05em] text-[#676D7D]"><X size={11}/>Cancelado</span>
                    {:else if content.processingJob?.status === "failed"}
                      <span class="application-text-meta inline-flex items-center gap-1.5 rounded-full bg-[#FFF0F0] px-2 py-1 font-bold uppercase tracking-[0.05em] text-[#9B2C2C]"><TriangleAlert size={11}/>Falhou</span>
                    {:else if content.processingJob}
                      <span class="application-text-meta inline-flex items-center gap-1.5 rounded-full bg-[#FFF3E9] px-2 py-1 font-bold uppercase tracking-[0.05em] text-[#A9510D]"><LoaderCircle size={11} class="animate-spin"/>Processando</span>
                    {/if}
                  </div>

                  {#if content.processingJob && isProcessingActive(content.processingJob.status)}
                    <p class="application-text-caption mt-1 truncate font-medium text-[#A9510D]">
                      {content.processingJob.progressLabel}
                      {#if content.processingJob.totalParts}
                        · {Math.min(content.processingJob.completedParts, content.processingJob.totalParts)}/{content.processingJob.totalParts} partes
                      {/if}
                      {#if content.processingJob.attemptCount > 0}
                        · tentativa {content.processingJob.attemptCount}/{content.processingJob.maxAttempts}
                      {/if}
                    </p>
                  {:else}
                    <p class="application-text-caption mt-1 truncate text-[#858B99]">{content.categories.length ? content.categories.map((category) => category.name).join(" · ") : "Sem categoria"} · {content.stepCount} {content.stepCount === 1 ? "passo" : "passos"} · /{content.slug}</p>
                  {/if}

                  {#if content.processingJob && !isProcessingActive(content.processingJob.status)}
                    <p class={`mt-1 line-clamp-1 text-[10px] leading-4 ${content.processingJob.status === "failed" ? "text-[#9B2C2C]" : "text-[#5D7765]"}`}>
                      {content.processingJob.progressDetail}
                    </p>
                  {/if}

                  {#if content.summary}<p class="mt-2 line-clamp-2 max-w-[780px] text-[11px] leading-5 text-[#737989]">{content.summary}</p>{/if}
                </div>

                <div class="flex shrink-0 flex-wrap items-center gap-2">
                  {#if content.processingJob}
                    <button
                      type="button"
                      on:click={() => openProcessingDetails(content.id)}
                      class={`application-text-meta inline-flex min-h-9 items-center gap-1.5 rounded-lg border px-3 font-semibold ${content.processingJob.status === "failed" ? "border-[#F0C8C8] bg-[#FFF7F7] text-[#9B2C2C]" : content.processingJob.status === "completed" ? "border-[#CFE8D7] bg-[#F6FBF7] text-[#2D7143]" : "border-[#F1D7BD] bg-[#FFF9F3] text-[#A9510D]"}`}
                    >
                      {#if isProcessingActive(content.processingJob.status)}<LoaderCircle size={13} class="animate-spin"/>{:else if content.processingJob.status === "failed"}<TriangleAlert size={13}/>{:else}<CheckCircle2 size={13}/>{/if}
                      {isProcessingActive(content.processingJob.status) ? "Andamento" : "Detalhes"}
                    </button>
                  {/if}

                  {#if !isProcessingActive(content.processingJob?.status)}
                    <a href={`/app/help/content/${content.id}/preview`} class="application-text-meta inline-flex min-h-9 items-center gap-1.5 rounded-lg border border-[#DDE1EA] bg-white px-3 font-semibold text-[#626979]"><Eye size={13}/>Preview</a>
                    {#if content.publishedSlug}<a href={`/ajuda-f10/${content.publishedSlug}`} target="_blank" rel="noopener noreferrer" class="application-text-meta inline-flex min-h-9 items-center gap-1.5 rounded-lg bg-[#000A57] px-3 font-semibold text-white">Ver artigo<ExternalLink size={12}/></a>{:else if content.status !== "archived"}<a href={`/app/help/content/${content.id}/images`} class="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-[#F3F4F7] text-[#777D8D]" aria-label="Editar"><ArrowRight size={14}/></a>{/if}

                    {#if data.canEdit && content.status === "draft"}
                      <button type="button" on:click={() => openDeleteModal(content)} class="application-text-meta inline-flex min-h-9 items-center gap-1.5 rounded-lg border border-[#F0C8C8] bg-white px-3 font-semibold text-[#9B2C2C]"><Trash2 size={12}/>Excluir</button>
                    {:else if data.canEdit && content.status === "archived"}
                      <form method="POST" action="?/restore"><input type="hidden" name="contentId" value={content.id}/><button type="submit" class="application-text-meta inline-flex min-h-9 items-center gap-1.5 rounded-lg border border-[#D8DDF4] bg-white px-3 font-semibold text-[#000A57]"><RotateCcw size={12}/>Restaurar</button></form>
                    {:else if data.canArchive && content.status === "published"}
                      <form method="POST" action="?/archive" on:submit={(event) => { if (!confirm("Arquivar este conteúdo? Ele sairá da Central e da IA pública.")) event.preventDefault(); }}><input type="hidden" name="contentId" value={content.id}/><button type="submit" class="application-text-meta inline-flex min-h-9 items-center gap-1.5 rounded-lg border border-[#DDE1EA] bg-white px-3 font-semibold text-[#626979]"><Archive size={12}/>Arquivar</button></form>
                    {/if}
                  {/if}
                </div>
              </div>
            </div>
          {/each}
        </div>
      {/if}
    </section>

    {#if data.canEdit}
      <section class="h-fit rounded-[22px] border border-[#E2E5ED] bg-white p-5 sm:p-6">
        <div class="flex items-start gap-3"><span class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#FFF0E4] text-[#EA6D0B]"><FilePlus2 size={19}/></span><div><h2 class="text-[16px] font-semibold text-[#11182C]">Novo conteúdo</h2><p class="mt-1 text-[11px] leading-5 text-[#858A98]">Escolha uma categoria editorial real. A categoria técnica “Sem categoria” é reservada às importações automáticas.</p></div></div>
        <form method="POST" action="?/create" class="mt-6 space-y-4">
          <label class="block"><span class="mb-1.5 block text-[11px] font-semibold text-[#4A5060]">Título</span><input name="title" required maxlength="160" value={values?.title ?? ""} placeholder="Ex.: Como cadastrar uma turma" class="h-11 w-full rounded-xl border border-[#DDE1EA] px-3 text-[12px]" /></label>
          <label class="block"><span class="mb-1.5 block text-[11px] font-semibold text-[#4A5060]">Endereço</span><input name="slug" maxlength="120" value={values?.slug ?? ""} placeholder="Gerado automaticamente se vazio" class="h-11 w-full rounded-xl border border-[#DDE1EA] px-3 text-[12px]" /></label>
          <label class="block"><span class="mb-1.5 block text-[11px] font-semibold text-[#4A5060]">Categoria *</span><select name="categoryId" required class="h-11 w-full rounded-xl border border-[#DDE1EA] bg-white px-3 text-[12px]"><option value="">Selecione</option>{#each data.categories as category}<option value={category.id} selected={values?.categoryId === category.id}>{category.name}</option>{/each}</select></label>
          <label class="block"><span class="mb-1.5 block text-[11px] font-semibold text-[#4A5060]">Resumo</span><textarea name="summary" maxlength="320" rows="3" class="w-full rounded-xl border border-[#DDE1EA] px-3 py-2.5 text-[12px]">{values?.summary ?? ""}</textarea></label>
          {#if data.categories.length === 0}<p class="rounded-xl border border-[#F0C8C8] bg-[#FFF5F5] px-3 py-2 text-[10px] text-[#9B2C2C]">Crie ao menos uma categoria editorial ativa antes de criar artigos manualmente.</p>{/if}
          <button type="submit" disabled={data.categories.length === 0} class="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-[#000A57] px-4 text-[12px] font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"><FilePlus2 size={17}/>Criar e preencher Passo 1</button>
        </form>
      </section>
    {/if}
  </div>
</ApplicationContent>

{#if processingTarget && processingTargetJob}
  <div class="fixed inset-0 z-[125] flex items-center justify-center bg-[#050A1A]/60 px-4 py-6" role="presentation" on:click={(event) => event.currentTarget === event.target && closeProcessingDetails()}>
    <section role="dialog" aria-modal="true" aria-labelledby="processing-details-title" class="max-h-[88vh] w-full max-w-[620px] overflow-y-auto rounded-[24px] bg-white p-5 shadow-2xl sm:p-6">
      <div class="flex items-start justify-between gap-4">
        <div class="min-w-0">
          <div class="flex flex-wrap items-center gap-2">
            <h2 id="processing-details-title" class="truncate text-[16px] font-semibold text-[#11182C]">{processingTarget.title}</h2>
            {#if processingTargetJob.status === "completed"}
              <span class="application-text-meta rounded-full bg-[#EEF8F1] px-2 py-1 font-bold text-[#2F7045]">CONCLUÍDO</span>
            {:else if isProcessingCancelled(processingTargetJob)}
              <span class="application-text-meta rounded-full bg-[#F1F1F3] px-2 py-1 font-bold text-[#676D7D]">CANCELADO</span>
            {:else if processingTargetJob.status === "failed"}
              <span class="application-text-meta rounded-full bg-[#FFF0F0] px-2 py-1 font-bold text-[#9B2C2C]">FALHOU</span>
            {:else}
              <span class="application-text-meta rounded-full bg-[#FFF3E9] px-2 py-1 font-bold text-[#A9510D]">{processingStatusLabel(processingTargetJob).toUpperCase()}</span>
            {/if}
          </div>
          <p class="mt-1 text-[10px] text-[#858A98]">Histórico do processamento do vídeo</p>
        </div>
        <button type="button" on:click={closeProcessingDetails} class="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#F3F4F7] text-[#6E7482]" aria-label="Fechar"><X size={16}/></button>
      </div>

      <div class={`mt-4 rounded-2xl border px-4 py-3 ${processingTargetJob.status === "failed" ? "border-[#F0C8C8] bg-[#FFF7F7]" : processingTargetJob.status === "completed" ? "border-[#CFE8D7] bg-[#F6FBF7]" : "border-[#F1D7BD] bg-[#FFF9F3]"}`}>
        <div class="flex items-start gap-3">
          <span class="mt-0.5">
            {#if processingTargetJob.status === "completed"}
              <CheckCircle2 size={17} class="text-[#2D7143]"/>
            {:else if processingTargetJob.status === "failed"}
              <TriangleAlert size={17} class="text-[#9B2C2C]"/>
            {:else}
              <LoaderCircle size={17} class="animate-spin text-[#A9510D]"/>
            {/if}
          </span>
          <div class="min-w-0 flex-1">
            <strong class="block text-[11px] text-[#343A49]">{processingCurrentLabel(processingTargetJob)}</strong>
            {#if processingCurrentDetail(processingTargetJob)}<p class="mt-1 text-[10px] leading-5 text-[#747A89]">{processingCurrentDetail(processingTargetJob)}</p>{/if}
            <div class="mt-2 flex flex-wrap gap-2">
              {#if processingTargetJob.totalParts}
                <span class="application-text-meta rounded-full bg-white px-2 py-1 font-semibold text-[#666D7C]">{Math.min(processingTargetJob.completedParts, processingTargetJob.totalParts)}/{processingTargetJob.totalParts} partes</span>
              {/if}
              {#if processingTargetJob.attemptCount > 0}
                <span class="application-text-meta rounded-full bg-white px-2 py-1 font-semibold text-[#666D7C]">Tentativa {processingTargetJob.attemptCount}/{processingTargetJob.maxAttempts}</span>
              {/if}
            </div>
          </div>
        </div>
      </div>

      <div class="mt-5">
        <h3 class="text-[11px] font-semibold text-[#303645]">Etapas realizadas</h3>
        {#if processingTargetJob.events.length > 0}
          <div class="mt-3 space-y-1.5">
            {#each processingTargetJob.events as event, eventIndex}
              <div class="flex items-start gap-3 rounded-xl border border-[#EEF0F5] bg-[#FAFAFC] px-3 py-2.5">
                <span class="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-white">
                  {#if eventIndex === processingTargetJob.events.length - 1 && isProcessingActive(processingTargetJob.status) && event.progressStatus !== "done"}
                    <LoaderCircle size={13} class="animate-spin text-[#A9510D]"/>
                  {:else if event.status === "failed"}
                    <TriangleAlert size={13} class="text-[#9B2C2C]"/>
                  {:else if event.eventType === "retry_scheduled" || event.eventType === "manual_retry" || event.eventType === "resumed"}
                    <RotateCcw size={13} class="text-[#A9510D]"/>
                  {:else}
                    <CheckCircle2 size={13} class="text-[#2D7143]"/>
                  {/if}
                </span>
                <div class="min-w-0 flex-1">
                  <div class="flex flex-wrap items-center justify-between gap-2">
                    <strong class="text-[10px] font-semibold text-[#454C5D]">{event.label}</strong>
                    <span class="application-text-meta text-[#9A9EAA]">{processingTime(event.createdAt)}</span>
                  </div>
                  {#if event.detail}<p class="mt-0.5 text-[9px] leading-4 text-[#858B99]">{event.detail}</p>{/if}
                </div>
              </div>
            {/each}
          </div>
        {:else}
          <div class="mt-3 rounded-xl border border-[#E2E5ED] bg-[#FAFAFC] px-4 py-3 text-[10px] text-[#777D8D]">Esta execução é anterior ao histórico detalhado. O status atual continua preservado.</div>
        {/if}
      </div>

      <div class="mt-5 flex flex-wrap justify-end gap-2">
        <button type="button" on:click={closeProcessingDetails} class="min-h-10 rounded-xl border border-[#DDE1EA] bg-white px-4 text-[10px] font-semibold text-[#626979]">Fechar</button>
        {#if isProcessingActive(processingTargetJob.status) && data.canEdit}
          <button type="button" on:click={() => cancelProcessing(processingTargetJob)} disabled={cancellingJobId === processingTargetJob.id} class="inline-flex min-h-10 items-center gap-2 rounded-xl border border-[#F0C8C8] bg-white px-4 text-[10px] font-semibold text-[#9B2C2C] disabled:opacity-50">
            {#if cancellingJobId === processingTargetJob.id}<LoaderCircle size={14} class="animate-spin"/>{:else}<X size={14}/>{/if}
            Cancelar processamento
          </button>
        {:else if processingTargetJob.status === "failed" && data.canEdit}
          <button type="button" on:click={() => retryProcessing(processingTargetJob)} disabled={retryingJobId === processingTargetJob.id} class="inline-flex min-h-10 items-center gap-2 rounded-xl bg-[#000A57] px-4 text-[10px] font-semibold text-white disabled:opacity-50">
            {#if retryingJobId === processingTargetJob.id}<LoaderCircle size={14} class="animate-spin"/>{:else}<RefreshCw size={14}/>{/if}
            Tentar novamente
          </button>
        {:else if processingTargetJob.status === "completed"}
          <a href={`/app/help/content/${processingTarget.id}/images`} class="inline-flex min-h-10 items-center gap-2 rounded-xl bg-[#000A57] px-4 text-[10px] font-semibold text-white"><ArrowRight size={14}/>Revisar conteúdo</a>
        {/if}
      </div>
    </section>
  </div>
{/if}

{#if deleteTarget}
  <div class="fixed inset-0 z-[120] flex items-center justify-center bg-[#050A1A]/55 px-4" role="presentation" on:click={(event) => event.currentTarget === event.target && closeDeleteModal()}>
    <section role="dialog" aria-modal="true" aria-labelledby="delete-help-content-title" class="w-full max-w-[520px] rounded-[24px] border border-[#F0C8C8] bg-white p-5 shadow-2xl sm:p-6">
      <div class="flex items-start justify-between gap-4">
        <div><h2 id="delete-help-content-title" class="text-[17px] font-semibold text-[#7F2525]">Excluir rascunho definitivamente</h2><p class="mt-1 text-[11px] leading-5 text-[#777D8D]">{deleteTarget.title}</p></div>
        <button type="button" on:click={closeDeleteModal} class="flex h-9 w-9 items-center justify-center rounded-lg text-[#777D8D] hover:bg-[#F3F4F7]" aria-label="Fechar"><X size={16}/></button>
      </div>

      <div class="mt-4 rounded-2xl border border-[#F2DADA] bg-[#FFF7F7] px-4 py-3 text-[10px] leading-5 text-[#7D4A4A]">
        Esta ação remove o conteúdo, versões editoriais, publicação e índice de pesquisa relacionados. Não pode ser desfeita.
        {#if deleteTarget.hasPublicVersion}<strong class="mt-2 block text-[#8C2F2F]">Este rascunho ainda possui uma versão pública anterior. Ela também será retirada imediatamente.</strong>{/if}
      </div>

      <form method="POST" action="?/discard" class="mt-5 space-y-4">
        <input type="hidden" name="contentId" value={deleteTarget.id}/>
        <label class="block"><span class="mb-1.5 block text-[11px] font-semibold text-[#4A5060]">Digite <strong>quero excluir</strong> para confirmar</span><input name="confirmation" bind:value={deleteConfirmation} autocomplete="off" autofocus class="h-11 w-full rounded-xl border border-[#DDE1EA] px-3 text-[12px] outline-none focus:border-[#9B2C2C]" /></label>
        <div class="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button type="button" on:click={closeDeleteModal} class="min-h-10 rounded-xl border border-[#DDE1EA] bg-white px-4 text-[11px] font-semibold text-[#626979]">Cancelar</button>
          <button type="submit" disabled={!deleteConfirmationReady} class="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl bg-[#9B2C2C] px-4 text-[11px] font-semibold text-white disabled:cursor-not-allowed disabled:opacity-40"><Trash2 size={14}/>Excluir definitivamente</button>
        </div>
      </form>
    </section>
  </div>
{/if}
