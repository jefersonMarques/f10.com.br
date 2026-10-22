<script lang="ts">
  import { invalidateAll } from "$app/navigation";
  import { onDestroy, onMount } from "svelte";
  import {
    Archive,
    ArrowDown,
    ArrowRight,
    ArrowUp,
    BarChart3,
    BookOpenCheck,
    CheckCircle2,
    CircleAlert,
    ExternalLink,
    ChevronLeft,
    ChevronRight,
    Search,
    SlidersHorizontal,
    MoreHorizontal,
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

  let createOpen = Boolean(form && "values" in form);
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
    if (deleteTarget) { closeDeleteModal(); return; }
    createOpen = false;
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
  function pageHref(nextPage: number): string {
    const params = new URLSearchParams();
    const { query, status, categoryId, sort, perPage } = data.filters;
    if (query) params.set("q", query);
    if (status) params.set("status", status);
    if (categoryId) params.set("category", categoryId);
    if (sort !== "updated") params.set("sort", sort);
    if (perPage !== 25) params.set("perPage", String(perPage));
    params.set("page", String(nextPage));
    return `/app/help/content?${params.toString()}`;
  }

  function formatUpdatedAt(value: Date | string | null): string {
    if (!value) return "—";
    const date = new Date(value);
    return Number.isNaN(date.getTime())
      ? "—"
      : new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" }).format(date);
  }
</script>

<svelte:head><title>Base de Conhecimento | F10 Operations</title></svelte:head>

<svelte:window on:keydown={handleEscape} />

<ApplicationContent width="wide">
  <div class="mb-5 flex flex-wrap items-center justify-between gap-3">
    <div>
      <h1 class="text-[20px] font-semibold text-[#11182C]">Conteúdos</h1>
      <p class="mt-1 text-[13px] text-[#777D8D]">{data.total} conteúdo(s) encontrado(s)</p>
    </div>
    <div class="flex flex-wrap items-center gap-2">
      <a href="/app/help/categories" class="inline-flex min-h-10 items-center gap-2 rounded-xl border border-[#DDE1EA] bg-white px-3 text-[13px] font-semibold text-[#000A57]"><Layers3 size={16}/>Categorias</a>
      <a href="/app/help/assets" class="inline-flex min-h-10 items-center gap-2 rounded-xl border border-[#DDE1EA] bg-white px-3 text-[13px] font-semibold text-[#000A57]"><HardDrive size={16}/>Biblioteca</a>
      {#if data.canEdit}
        <a href="/app/help/content/import" class="inline-flex min-h-10 items-center gap-2 rounded-xl border border-[#DDE1EA] bg-white px-3 text-[13px] font-semibold text-[#000A57]"><UploadCloud size={16}/>Importar</a>
        <button type="button" on:click={() => (createOpen = true)} class="inline-flex min-h-10 items-center gap-2 rounded-xl bg-[#000A57] px-4 text-[13px] font-semibold text-white"><FilePlus2 size={16}/>Novo conteúdo</button>
      {/if}
    </div>
  </div>

  {#if form?.message}
    <div role="alert" class="mb-4 flex items-center gap-2 rounded-xl border border-[#F0C8C8] bg-[#FFF5F5] px-4 py-3 text-[13px] text-[#9B2C2C]"><CircleAlert size={17}/>{form.message}</div>
  {/if}

  <section class="overflow-hidden rounded-[22px] border border-[#E2E5ED] bg-white">
    <form method="GET" action="/app/help/content" class="grid gap-3 border-b border-[#EDF0F5] p-4 lg:grid-cols-[minmax(220px,1fr)_180px_180px_150px_110px_auto]">
      <label class="relative block">
        <Search size={17} class="pointer-events-none absolute left-3 top-3 text-[#808696]"/>
        <input name="q" aria-label="Buscar conteúdos" value={data.filters.query} placeholder="Buscar por título ou resumo" class="h-11 w-full rounded-xl border border-[#DDE1EA] bg-white pl-10 pr-3 text-[13px]"/>
      </label>
      <select name="status" aria-label="Filtrar por status" class="h-11 rounded-xl border border-[#DDE1EA] bg-white px-3 text-[13px]">
        <option value="">Todos os status</option>
        {#each Object.entries(statusLabels) as [value, label]}
          <option value={value} selected={data.filters.status === value}>{label}</option>
        {/each}
      </select>
      <select name="category" aria-label="Filtrar por categoria" class="h-11 rounded-xl border border-[#DDE1EA] bg-white px-3 text-[13px]">
        <option value="">Todas as categorias</option>
        {#each data.categories as category}
          <option value={category.id} selected={data.filters.categoryId === category.id}>{category.name}</option>
        {/each}
      </select>
      <select name="sort" aria-label="Ordenar conteúdos" class="h-11 rounded-xl border border-[#DDE1EA] bg-white px-3 text-[13px]">
        <option value="updated" selected={data.filters.sort === "updated"}>Mais recentes</option>
        <option value="title" selected={data.filters.sort === "title"}>Título A–Z</option>
        <option value="status" selected={data.filters.sort === "status"}>Status</option>
      </select>
      <select name="perPage" aria-label="Registros por página" class="h-11 rounded-xl border border-[#DDE1EA] bg-white px-3 text-[13px]">
        {#each [25,50,100] as limit}
          <option value={limit} selected={data.filters.perPage === limit}>{limit} / página</option>
        {/each}
      </select>
      <button type="submit" class="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[#000A57] px-4 text-[13px] font-semibold text-white"><SlidersHorizontal size={16}/>Aplicar</button>
    </form>

    <div class="overflow-x-auto lg:overflow-visible">
      <table class="w-full min-w-[780px] border-collapse text-left">
        <thead class="bg-[#FAFBFD] text-[12px] font-semibold text-[#666D7F]">
          <tr>
            <th scope="col" class="px-5 py-3">Conteúdo</th>
            <th scope="col" class="px-4 py-3">Categoria</th>
            <th scope="col" class="px-4 py-3">Status</th>
            <th scope="col" class="px-4 py-3 text-center">Passos</th>
            <th scope="col" class="px-4 py-3">Atualizado</th>
            <th scope="col" class="px-4 py-3 text-right">Ações</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-[#EEF0F5]">
          {#each data.contents as content (content.id)}
            <tr class="transition hover:bg-[#FAFBFD]">
              <td class="max-w-[420px] px-5 py-4 align-middle">
                <div class="flex items-center gap-2">
                  {#if isProcessingActive(content.processingJob?.status)}
                    <span class="truncate text-[13px] font-semibold text-[#303746]">{content.title}</span>
                  {:else}
                    <a class="truncate text-[13px] font-semibold text-[#000A57] hover:underline" href={`/app/help/content/${content.id}`}>{content.title}</a>
                  {/if}
                </div>
                {#if content.processingJob}
                  <button type="button" class="mt-1 inline-flex items-center gap-1 text-[12px] text-[#A9510D] hover:underline" on:click={() => openProcessingDetails(content.id)}>
                    {#if isProcessingActive(content.processingJob.status)}<LoaderCircle size={12} class="animate-spin"/>{:else}<CheckCircle2 size={12}/>{/if}
                    {processingStatusLabel(content.processingJob)} · Detalhes
                  </button>
                {:else}
                  <p class="mt-1 truncate text-[12px] text-[#8C91A0]">/{content.slug}</p>
                {/if}
              </td>
              <td class="max-w-[210px] px-4 py-4 text-[13px] text-[#636A79]"><span class="block truncate">{content.categories.map((category) => category.name).join(", ") || "Sem categoria"}</span></td>
              <td class="px-4 py-4"><span class={`inline-flex rounded-full px-2.5 py-1 text-[12px] font-semibold ${content.status === "published" ? "bg-[#EDF9F0] text-[#276E3C]" : content.status === "archived" ? "bg-[#F1F1F3] text-[#686D78]" : "bg-[#FFF4E6] text-[#965208]"}`}>{statusLabels[content.status] ?? content.status}</span></td>
              <td class="px-4 py-4 text-center text-[13px] text-[#555D6B]">{content.stepCount}</td>
              <td class="whitespace-nowrap px-4 py-4 text-[13px] text-[#6B7280]">{formatUpdatedAt(content.updatedAt)}</td>
              <td class="px-4 py-4">
                <div class="flex items-center justify-end gap-2">
                  {#if !isProcessingActive(content.processingJob?.status)}
                    <a href={`/app/help/content/${content.id}`} aria-label="Editar {content.title}" title="Editar" class="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-[#E0E4EC] text-[#000A57] hover:bg-[#F4F5FC]"><ArrowRight size={16}/></a>
                    <a href={`/app/help/content/${content.id}/preview`} aria-label="Prévia de {content.title}" title="Prévia" class="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-[#E0E4EC] text-[#626979] hover:bg-[#F4F5FC]"><Eye size={16}/></a>
                  {/if}
                  <details class="relative">
                    <summary class="flex h-9 w-9 cursor-pointer list-none items-center justify-center rounded-lg border border-[#E0E4EC] text-[#626979]" aria-label="Mais ações" title="Mais ações"><MoreHorizontal size={17}/></summary>
                    <div class="absolute right-0 top-10 z-30 min-w-[184px] rounded-xl border border-[#E0E4EC] bg-white p-2 shadow-xl">
                      {#if content.publishedSlug}
                        <a href={`/ajuda-f10/${content.publishedSlug}`} target="_blank" rel="noopener noreferrer" class="block rounded-lg px-3 py-2 text-[13px] hover:bg-[#F5F6FA]">Ver artigo público</a>
                      {/if}
                      {#if data.canEdit && content.status === "draft"}
                        <button type="button" on:click={() => openDeleteModal(content)} class="block w-full rounded-lg px-3 py-2 text-left text-[13px] text-red-700 hover:bg-red-50">Excluir rascunho</button>
                      {:else if data.canEdit && content.status === "archived"}
                        <form method="POST" action="?/restore"><input type="hidden" name="contentId" value={content.id}/><button type="submit" class="w-full rounded-lg px-3 py-2 text-left text-[13px]">Restaurar</button></form>
                      {:else if data.canArchive && content.status === "published"}
                        <form method="POST" action="?/archive" on:submit={(event) => { if (!confirm("Arquivar este conteúdo?")) event.preventDefault(); }}><input type="hidden" name="contentId" value={content.id}/><button type="submit" class="w-full rounded-lg px-3 py-2 text-left text-[13px]">Arquivar</button></form>
                      {/if}
                      {#if data.canEdit}
                        <div class="mt-1 border-t border-[#EEF0F5] pt-1">
                          <p class="px-3 py-1 text-[13px] text-[#89909B]">Ordem pública</p>
                          <div class="flex gap-2 px-2">
                            <form method="POST" action="?/move"><input type="hidden" name="contentId" value={content.id}/><input type="hidden" name="direction" value="up"/><button type="submit" title="Subir na ordem pública" aria-label="Subir na ordem pública" class="rounded-lg border border-[#E0E4EC] p-2"><ArrowUp size={15}/></button></form>
                            <form method="POST" action="?/move"><input type="hidden" name="contentId" value={content.id}/><input type="hidden" name="direction" value="down"/><button type="submit" title="Descer na ordem pública" aria-label="Descer na ordem pública" class="rounded-lg border border-[#E0E4EC] p-2"><ArrowDown size={15}/></button></form>
                          </div>
                        </div>
                      {/if}
                    </div>
                  </details>
                </div>
              </td>
            </tr>
          {:else}
            <tr><td colspan="6" class="px-6 py-16 text-center text-[13px] text-[#7A8190]">Nenhum conteúdo encontrado. Ajuste os filtros ou crie um artigo.</td></tr>
          {/each}
        </tbody>
      </table>
    </div>

    <footer class="flex flex-wrap items-center justify-between gap-3 border-t border-[#EDF0F5] px-5 py-4 text-[13px] text-[#747C8B]">
      <span>{data.total === 0 ? 0 : (data.filters.page - 1) * data.filters.perPage + 1}–{Math.min(data.total, data.filters.page * data.filters.perPage)} de {data.total}</span>
      <div class="flex items-center gap-2">
        {#if data.filters.page > 1}
          <a href={pageHref(data.filters.page - 1)} aria-label="Página anterior" class="flex h-9 items-center gap-1 rounded-lg border border-[#E0E4EC] px-3 font-medium text-[#000A57]"><ChevronLeft size={15}/>Anterior</a>
        {/if}
        <span class="px-2">{data.filters.page} / {data.totalPages}</span>
        {#if data.filters.page < data.totalPages}
          <a href={pageHref(data.filters.page + 1)} aria-label="Próxima página" class="flex h-9 items-center gap-1 rounded-lg border border-[#E0E4EC] px-3 font-medium text-[#000A57]">Próxima<ChevronRight size={15}/></a>
        {/if}
      </div>
    </footer>
  </section>
</ApplicationContent>

{#if createOpen && data.canEdit}
  <div class="fixed inset-0 z-[145] flex items-center justify-center bg-[#050A1A]/60 px-4 py-6" role="presentation" on:click={(event) => { if (event.target === event.currentTarget) createOpen = false; }}>
    <section role="dialog" aria-modal="true" aria-labelledby="new-help-title" class="w-full max-w-[560px] rounded-[22px] bg-white p-5 shadow-2xl sm:p-6">
      <div class="mb-5 flex items-center justify-between gap-3">
        <h2 id="new-help-title" class="text-[18px] font-semibold">Novo conteúdo</h2>
        <button type="button" on:click={() => (createOpen = false)} aria-label="Fechar" class="rounded-lg p-2 text-[#717888] hover:bg-[#F5F6FA]"><X size={18}/></button>
      </div>
      <form method="POST" action="?/create" class="space-y-4">
        <label class="block text-[13px] font-semibold text-[#414A5C]">Título
          <input autofocus name="title" required maxlength="160" value={values?.title ?? ""} placeholder="Ex.: Como cadastrar uma turma" class="mt-1.5 h-11 w-full rounded-xl border border-[#DDE1EA] px-3 text-[14px] font-normal"/>
        </label>
        <label class="block text-[13px] font-semibold text-[#414A5C]">Categoria
          <select name="categoryId" required class="mt-1.5 h-11 w-full rounded-xl border border-[#DDE1EA] bg-white px-3 text-[14px] font-normal">
            <option value="">Selecione uma categoria</option>
            {#each data.categories as category}<option value={category.id} selected={values?.categoryId === category.id}>{category.name}</option>{/each}
          </select>
        </label>
        <details class="rounded-xl border border-[#E1E5EC] p-3">
          <summary class="cursor-pointer text-[13px] font-medium text-[#000A57]">Opções adicionais</summary>
          <label class="mt-3 block text-[12px] text-[#535C6B]">Endereço (opcional)<input name="slug" maxlength="120" value={values?.slug ?? ""} placeholder="Gerado automaticamente" class="mt-1 h-10 w-full rounded-lg border border-[#DDE1EA] px-3 text-[13px]"/></label>
          <label class="mt-3 block text-[12px] text-[#535C6B]">Resumo (opcional)<textarea name="summary" maxlength="320" rows="3" class="mt-1 w-full rounded-lg border border-[#DDE1EA] p-3 text-[13px]">{values?.summary ?? ""}</textarea></label>
        </details>
        <div class="flex justify-end gap-2 pt-2">
          <button type="button" on:click={() => (createOpen = false)} class="min-h-10 rounded-xl border border-[#DDE1EA] px-4 text-[13px] font-semibold">Cancelar</button>
          <button type="submit" disabled={data.categories.length === 0} class="min-h-10 rounded-xl bg-[#000A57] px-5 text-[13px] font-semibold text-white disabled:opacity-50">Criar e editar</button>
        </div>
      </form>
    </section>
  </div>
{/if}

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
          <p class="mt-1 text-[12px] text-[#858A98]">Histórico do processamento do vídeo</p>
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
            <strong class="block text-[13px] text-[#343A49]">{processingCurrentLabel(processingTargetJob)}</strong>
            {#if processingCurrentDetail(processingTargetJob)}<p class="mt-1 text-[12px] leading-5 text-[#747A89]">{processingCurrentDetail(processingTargetJob)}</p>{/if}
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
        <h3 class="text-[13px] font-semibold text-[#303645]">Etapas realizadas</h3>
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
                    <strong class="text-[12px] font-semibold text-[#454C5D]">{event.label}</strong>
                    <span class="application-text-meta text-[#9A9EAA]">{processingTime(event.createdAt)}</span>
                  </div>
                  {#if event.detail}<p class="mt-0.5 text-[12px] leading-4 text-[#858B99]">{event.detail}</p>{/if}
                </div>
              </div>
            {/each}
          </div>
        {:else}
          <div class="mt-3 rounded-xl border border-[#E2E5ED] bg-[#FAFAFC] px-4 py-3 text-[12px] text-[#777D8D]">Esta execução é anterior ao histórico detalhado. O status atual continua preservado.</div>
        {/if}
      </div>

      <div class="mt-5 flex flex-wrap justify-end gap-2">
        <button type="button" on:click={closeProcessingDetails} class="min-h-10 rounded-xl border border-[#DDE1EA] bg-white px-4 text-[12px] font-semibold text-[#626979]">Fechar</button>
        {#if isProcessingActive(processingTargetJob.status) && data.canEdit}
          <button type="button" on:click={() => cancelProcessing(processingTargetJob)} disabled={cancellingJobId === processingTargetJob.id} class="inline-flex min-h-10 items-center gap-2 rounded-xl border border-[#F0C8C8] bg-white px-4 text-[12px] font-semibold text-[#9B2C2C] disabled:opacity-50">
            {#if cancellingJobId === processingTargetJob.id}<LoaderCircle size={14} class="animate-spin"/>{:else}<X size={14}/>{/if}
            Cancelar processamento
          </button>
        {:else if processingTargetJob.status === "failed" && data.canEdit}
          <button type="button" on:click={() => retryProcessing(processingTargetJob)} disabled={retryingJobId === processingTargetJob.id} class="inline-flex min-h-10 items-center gap-2 rounded-xl bg-[#000A57] px-4 text-[12px] font-semibold text-white disabled:opacity-50">
            {#if retryingJobId === processingTargetJob.id}<LoaderCircle size={14} class="animate-spin"/>{:else}<RefreshCw size={14}/>{/if}
            Tentar novamente
          </button>
        {:else if processingTargetJob.status === "completed"}
          <a href={`/app/help/content/${processingTarget.id}/images`} class="inline-flex min-h-10 items-center gap-2 rounded-xl bg-[#000A57] px-4 text-[12px] font-semibold text-white"><ArrowRight size={14}/>Revisar conteúdo</a>
        {/if}
      </div>
    </section>
  </div>
{/if}

{#if deleteTarget}
  <div class="fixed inset-0 z-[120] flex items-center justify-center bg-[#050A1A]/55 px-4" role="presentation" on:click={(event) => event.currentTarget === event.target && closeDeleteModal()}>
    <section role="dialog" aria-modal="true" aria-labelledby="delete-help-content-title" class="w-full max-w-[520px] rounded-[24px] border border-[#F0C8C8] bg-white p-5 shadow-2xl sm:p-6">
      <div class="flex items-start justify-between gap-4">
        <div><h2 id="delete-help-content-title" class="text-[17px] font-semibold text-[#7F2525]">Excluir rascunho definitivamente</h2><p class="mt-1 text-[13px] leading-5 text-[#777D8D]">{deleteTarget.title}</p></div>
        <button type="button" on:click={closeDeleteModal} class="flex h-9 w-9 items-center justify-center rounded-lg text-[#777D8D] hover:bg-[#F3F4F7]" aria-label="Fechar"><X size={16}/></button>
      </div>

      <div class="mt-4 rounded-2xl border border-[#F2DADA] bg-[#FFF7F7] px-4 py-3 text-[12px] leading-5 text-[#7D4A4A]">
        Esta ação remove o conteúdo, versões editoriais, publicação e índice de pesquisa relacionados. Não pode ser desfeita.
        {#if deleteTarget.hasPublicVersion}<strong class="mt-2 block text-[#8C2F2F]">Este rascunho ainda possui uma versão pública anterior. Ela também será retirada imediatamente.</strong>{/if}
      </div>

      <form method="POST" action="?/discard" class="mt-5 space-y-4">
        <input type="hidden" name="contentId" value={deleteTarget.id}/>
        <label class="block"><span class="mb-1.5 block text-[13px] font-semibold text-[#4A5060]">Digite <strong>quero excluir</strong> para confirmar</span><input name="confirmation" bind:value={deleteConfirmation} autocomplete="off" autofocus class="h-11 w-full rounded-xl border border-[#DDE1EA] px-3 text-[12px] outline-none focus:border-[#9B2C2C]" /></label>
        <div class="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button type="button" on:click={closeDeleteModal} class="min-h-10 rounded-xl border border-[#DDE1EA] bg-white px-4 text-[13px] font-semibold text-[#626979]">Cancelar</button>
          <button type="submit" disabled={!deleteConfirmationReady} class="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl bg-[#9B2C2C] px-4 text-[13px] font-semibold text-white disabled:cursor-not-allowed disabled:opacity-40"><Trash2 size={14}/>Excluir definitivamente</button>
        </div>
      </form>
    </section>
  </div>
{/if}
