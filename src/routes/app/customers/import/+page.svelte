<script lang="ts">
  import { AlertTriangle, ArrowLeft, CheckCircle2, FileSpreadsheet, ShieldCheck, Upload } from "lucide-svelte";
  import ApplicationContent from "$lib/components/application/ApplicationContent.svelte";
  import { onMount } from "svelte";
  import { invalidateAll } from "$app/navigation";
  import type { ActionData, PageData } from "./$types";

  export let data: PageData;
  export let form: ActionData;

  onMount(() => {
    const interval = setInterval(() => {
      if (data.batch?.status === "running") void invalidateAll();
    }, 5_000);
    return () => clearInterval(interval);
  });

  function pageHref(page: number): string {
    return "/app/customers/import?batch=" + data.batch?.id + "&page=" + page;
  }

  function formatDate(value: unknown): string {
    if (!value) return "";
    return new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" })
      .format(new Date(String(value)));
  }
</script>

<svelte:head><title>Importar clientes | F10 Operations</title></svelte:head>

<ApplicationContent width="wide">
  <div class="mb-5 flex flex-wrap items-center justify-between gap-3">
    <div>
      <a href="/app/customers" class="application-text-meta mb-2 inline-flex items-center gap-1 font-semibold text-app-primary">
        <ArrowLeft size={15}/> Clientes
      </a>
      <h1 class="text-xl font-bold text-app-heading">Importar clientes</h1>
      <p class="application-text-caption mt-1 text-app-muted">Prévia e conciliação antes de gravar.</p>
    </div>
    <span class="application-text-caption inline-flex items-center gap-2 rounded-xl border border-app-border px-3 py-2 text-app-muted">
      <ShieldCheck size={17}/> Acesso administrativo
    </span>
  </div>

  {#if form?.message}
    <div role="alert" class="application-text-caption mb-4 flex items-center gap-2 rounded-xl border border-amber-300 bg-amber-50 p-3 text-amber-900">
      <AlertTriangle size={17}/>{form.message}
    </div>
  {/if}

  <div class="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(260px,340px)]">
    <section class="rounded-[20px] border border-app-border bg-app-surface p-5">
      <div class="mb-4 flex items-center gap-2 font-bold text-app-heading"><Upload size={18}/> Enviar planilha</div>
      <form method="POST" action="?/upload" enctype="multipart/form-data" class="flex flex-wrap items-end gap-3">
        <label class="application-text-caption block min-w-[200px] flex-1 font-semibold text-app-muted">
          Arquivo XLSX ou CSV (até 5 MB)
          <input type="file" name="file" accept=".xlsx,.csv" required class="application-text-caption mt-2 block w-full rounded-xl border border-app-border-control bg-app-subtle p-2.5 text-app-heading"/>
        </label>
        <button class="application-text-caption inline-flex h-11 items-center gap-2 rounded-xl bg-app-primary px-5 font-semibold text-white" type="submit">
          <FileSpreadsheet size={17}/> Analisar
        </button>
      </form>
      <p class="application-text-meta mt-3 text-app-muted">O envio não cadastra clientes nem cria acessos.</p>
    </section>
    <section class="rounded-[20px] border border-app-border bg-app-surface p-5">
      <h2 class="application-text-caption mb-3 font-bold text-app-heading">Lotes recentes</h2>
      {#if data.batches.length === 0}
        <p class="application-text-caption text-app-muted">Nenhum lote preparado.</p>
      {:else}
        <div class="max-h-40 space-y-2 overflow-auto">
          {#each data.batches as batch}
            <a href={"/app/customers/import?batch=" + String(batch.id)} class="application-text-caption flex justify-between gap-2 rounded-lg px-2 py-2 hover:bg-app-subtle" class:bg-app-subtle={batch.id === data.batch?.id}>
              <span class="min-w-0 truncate text-app-heading">{String(batch.file_name)}</span>
              <span class="shrink-0 text-app-muted">{String(batch.status)}</span>
            </a>
          {/each}
        </div>
      {/if}
    </section>
  </div>

  {#if data.batch && data.summary}
    <section class="mt-5 overflow-hidden rounded-[20px] border border-app-border bg-app-surface">
      <div class="flex flex-wrap items-center justify-between gap-3 border-b border-app-border-soft p-4">
        <div>
          <h2 class="application-text-caption font-bold text-app-heading">{String(data.batch.file_name)}</h2>
          <span class="application-text-meta text-app-muted">Criado em {formatDate(data.batch.created_at)} · {String(data.batch.status)}</span>
        </div>
        {#if data.batch.status === "review"}
          <span class="application-text-meta rounded-full bg-amber-100 px-3 py-1 font-bold text-amber-800">Aguardando conferência</span>
        {:else if data.batch.status === "completed"}
          <span class="application-text-meta inline-flex items-center gap-1 rounded-full bg-green-100 px-3 py-1 font-bold text-green-800"><CheckCircle2 size={14}/> Concluído</span>
        {:else}
          <span class="application-text-meta rounded-full bg-blue-100 px-3 py-1 font-bold text-blue-800">{data.batch.status === "failed" ? "Com falhas" : "Em processamento"}</span>
        {/if}
      </div>

      <div class="flex justify-end px-4 pt-3">
        <a href={"/app/customers/import/export?batch=" + String(data.batch.id)} class="application-text-caption rounded-lg border border-app-border-control px-3 py-2 font-semibold text-app-heading">Baixar relatório CSV</a>
      </div>
      <div class="grid grid-cols-2 gap-3 p-4 sm:grid-cols-4 lg:grid-cols-7">
        {#each [
          { label: "Linhas", count: data.summary.total },
          { label: "Revisar", count: data.summary.review },
          { label: "Criar", count: data.summary.create_count },
          { label: "Vincular", count: data.summary.link_count },
          { label: "Ignorar", count: data.summary.skip_count },
          { label: "Processadas", count: data.summary.processed },
          { label: "Erros", count: data.summary.failed },
        ] as metric}
          <div class="rounded-xl bg-app-subtle p-3">
            <div class="text-lg font-bold text-app-heading">{Number(metric.count)}</div>
            <div class="application-text-meta mt-1 text-app-muted">{metric.label}</div>
          </div>
        {/each}
      </div>

      <div class="flex flex-wrap items-center justify-between gap-3 border-y border-app-border-soft p-4">
        {#if data.batch.status === "review"}
          <p class="application-text-caption text-app-muted">Resolva as pendências e confirme a gravação.</p>
          <form method="POST" action="?/confirm" class="flex flex-wrap items-center gap-2">
            <input type="hidden" name="batchId" value={String(data.batch.id)}/>
            <label class="application-text-meta text-app-muted">
              Digite <strong>IMPORTAR</strong>
              <input name="confirmation" placeholder="IMPORTAR" autocomplete="off" required class="ml-2 h-10 w-32 rounded-xl border border-app-border-control px-3 text-app-heading"/>
            </label>
            <button type="submit" disabled={Number(data.summary.review) !== 0} class="application-text-caption h-10 rounded-xl bg-app-primary px-4 font-semibold text-white disabled:cursor-not-allowed disabled:opacity-40">Confirmar importação</button>
          </form>
        {:else if data.batch.status === "running"}
          <p class="application-text-caption text-app-muted">Processando automaticamente. Pode fechar esta página.</p>
          <form method="POST" action="?/process">
            <input type="hidden" name="batchId" value={String(data.batch.id)}/>
            <button type="submit" class="application-text-caption h-10 rounded-xl bg-app-primary px-4 font-semibold text-white">Processar próximo lote</button>
          </form>
        {:else if data.batch.status === "failed"}
          <p class="application-text-caption text-amber-800">Algumas linhas falharam. Reprocesse somente as pendentes.</p>
        {:else}
          <p class="application-text-caption text-app-muted">Importação finalizada. O reenvio é idempotente por ID de origem.</p>
        {/if}
      </div>

      <div class="overflow-x-auto">
        <table class="w-full min-w-[950px] text-left">
          <thead class="application-text-meta bg-app-subtle text-app-muted">
            <tr>
              <th class="px-4 py-3">Origem</th>
              <th class="px-4 py-3">Unidade / Grupo</th>
              <th class="px-4 py-3">Titular</th>
              <th class="px-4 py-3">Situação</th>
              <th class="px-4 py-3">Conciliação</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-app-border-soft">
            {#each data.rows as row}
              <tr>
                <td class="application-text-caption px-4 py-4 align-top font-semibold text-app-heading">#{row.source_id}</td>
                <td class="application-text-caption px-4 py-4 align-top">
                  <div class="font-bold text-app-heading">{row.record.unitName}</div>
                  <div class="application-text-meta mt-1 text-app-muted">{row.record.groupName || "Sem grupo"} · {row.source_group_id || "—"}</div>
                </td>
                <td class="application-text-caption px-4 py-4 align-top text-app-muted">
                  {row.record.holderName || "Não informado"}
                </td>
                <td class="application-text-caption px-4 py-4 align-top text-app-muted">{row.record.commercialStatus}</td>
                <td class="application-text-caption px-4 py-4 align-top">
                  {#if row.applied_at}
                    <span class="font-semibold text-green-700">Concluído</span>
                  {:else if data.batch.status === "review"}
                    <form method="POST" action="?/resolve" class="space-y-2">
                      <input type="hidden" name="batchId" value={String(data.batch.id)}/>
                      <input type="hidden" name="rowId" value={row.id}/>
                      <input type="hidden" name="page" value={data.page}/>
                      <select name="decision" aria-label="Decisão de conciliação" class="application-text-caption w-full rounded-lg border border-app-border-control bg-white p-2 text-app-heading">
                        <option value="review" selected={row.decision === "review"} disabled>Revisar</option>
                        <option value="create" selected={row.decision === "create"}>Criar unidade</option>
                        <option value="link" selected={row.decision === "link"}>Vincular organização</option>
                        <option value="skip" selected={row.decision === "skip"}>Ignorar</option>
                      </select>
                      {#if row.candidate_organizations.length > 0}
                        <select name="targetOrganizationId" aria-label="Organização existente" class="application-text-meta w-full rounded-lg border border-app-border-control bg-white p-2 text-app-heading">
                          <option value="">Organização existente</option>
                          {#each row.candidate_organizations as candidate}
                            <option value={candidate.id} selected={row.target_organization_id === candidate.id}>{candidate.name}</option>
                          {/each}
                        </select>
                      {/if}
                      <button type="submit" class="application-text-meta rounded-lg border border-app-border-control px-3 py-1.5 font-semibold text-app-heading">Salvar decisão</button>
                    </form>
                  {:else}
                    <span class="font-semibold text-app-muted">{row.decision}</span>
                  {/if}
                  {#if row.warnings.length}
                    <div class="application-text-meta mt-2 space-y-1 text-amber-700">
                      {#each row.warnings as warning}<div>{warning}</div>{/each}
                    </div>
                  {/if}
                  {#if row.error_code}
                    <div role="alert" class="application-text-meta mt-2 text-red-700">Falha nesta linha</div>
                    {#if data.batch.status === "failed"}
                      <form method="POST" action="?/retry" class="mt-2">
                        <input type="hidden" name="batchId" value={String(data.batch.id)}/>
                        <input type="hidden" name="rowId" value={row.id}/>
                        <button type="submit" class="application-text-meta rounded-lg border border-app-border-control px-3 py-1.5 font-semibold text-app-heading">Reprocessar</button>
                      </form>
                    {/if}
                  {/if}
                </td>
              </tr>
            {/each}
          </tbody>
        </table>
      </div>
      {#if data.pageCount > 1}
        <div class="flex items-center justify-between border-t border-app-border-soft p-4">
          <span class="application-text-caption text-app-muted">Página {data.page} de {data.pageCount}</span>
          <div class="flex gap-2">
            {#if data.page > 1}
              <a href={pageHref(data.page - 1)} class="application-text-caption rounded-lg border border-app-border-control px-3 py-2">Anterior</a>
            {/if}
            {#if data.page < data.pageCount}
              <a href={pageHref(data.page + 1)} class="application-text-caption rounded-lg border border-app-border-control px-3 py-2">Próxima</a>
            {/if}
          </div>
        </div>
      {/if}
    </section>
  {/if}
</ApplicationContent>
