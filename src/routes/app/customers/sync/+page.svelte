<script lang="ts">
  import { AlertTriangle, ArrowLeft, CheckCircle2, Clock3, FileSpreadsheet, RefreshCw, UploadCloud } from "lucide-svelte";
  import ApplicationContent from "$lib/components/application/ApplicationContent.svelte";
  import { onMount } from "svelte";
  import { invalidateAll } from "$app/navigation";
  import type { ActionData, PageData } from "./$types";

  export let data: PageData;
  export let form: ActionData;

  let importing = false;
  $: activeSync = data.batch?.status === "queued" || data.batch?.status === "scanning";

  onMount(() => {
    const timer = setInterval(() => {
      if (data.batch && ["queued", "scanning"].includes(String(data.batch.status))) {
        void invalidateAll();
      }
    }, 6000);
    return () => clearInterval(timer);
  });

  function dateLabel(value: unknown): string {
    if (!value) return "—";
    const date = new Date(String(value));
    return Number.isNaN(date.getTime()) ? "—" :
      new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" }).format(date);
  }
</script>

<svelte:head><title>Importar clientes F10 | F10 Operations</title></svelte:head>

<ApplicationContent width="wide">
  <header class="mb-5 flex flex-wrap items-center justify-between gap-3">
    <div>
      <a href="/app/customers" class="application-text-meta mb-1 inline-flex items-center gap-1 font-semibold text-app-primary"><ArrowLeft size={15}/> Clientes</a>
      <h1 class="text-xl font-bold text-app-text">Importar clientes F10</h1>
      <p class="application-text-caption mt-1 text-app-text-muted">Planilha como origem · API F10 como complemento · Unidade {data.sourceUnitId ?? "não configurada"}</p>
    </div>
  </header>

  {#if form?.message}
    <div role="alert" class="application-text-caption mb-4 flex items-center gap-2 rounded-xl bg-app-warning-bg p-3 text-app-warning-text"><AlertTriangle size={17}/>{form.message}</div>
  {/if}

  <section class="rounded-2xl border border-app-border bg-app-surface p-5">
    <div class="mb-4 flex flex-wrap items-center gap-3">
      <span class="flex h-10 w-10 items-center justify-center rounded-xl bg-app-subtle text-app-primary"><FileSpreadsheet size={21}/></span>
      <div>
        <h2 class="application-text-caption font-bold text-app-text">Planilha de clientes</h2>
        <p class="application-text-caption text-app-text-muted">Novos e existentes serão identificados automaticamente pelo ID do contrato.</p>
      </div>
    </div>

    <form method="POST" action="?/sheetUpload" enctype="multipart/form-data" class="flex flex-wrap items-end gap-3">
      <label class="application-text-caption min-w-[220px] flex-1 font-semibold text-app-text">
        Arquivo XLSX ou CSV
        <input type="file" name="file" accept=".xlsx,.csv" required
          class="application-text-caption mt-2 block w-full rounded-xl border border-app-border-control bg-app-subtle p-2.5 text-app-text"/>
      </label>
      <button type="submit" disabled={!data.sourceUnitId}
        class="application-text-caption inline-flex h-11 items-center gap-2 rounded-xl bg-app-primary px-4 font-semibold text-white disabled:opacity-40">
        <UploadCloud size={17}/> Prévia da importação
      </button>
    </form>

    {#if data.sheet.batch && data.sheet.summary}
      <div class="mt-5 border-t border-app-border-soft pt-5">
        <div class="flex flex-wrap items-center justify-between gap-2">
          <div>
            <strong class="application-text-caption text-app-text">{String(data.sheet.batch.file_name)}</strong>
            <p class="application-text-meta text-app-text-muted">Prévia de {dateLabel(data.sheet.batch.created_at)}</p>
          </div>
          {#if Number(data.sheet.batch.record_version) < 2}
            <span class="application-text-caption rounded-full bg-app-warning-bg px-3 py-1 font-semibold text-app-warning-text">Prévia antiga</span>
          {:else if data.sheet.batch.status === "applied"}
            <span class="application-text-caption inline-flex items-center gap-1 rounded-full bg-app-success-bg px-3 py-1 font-semibold text-app-success-text"><CheckCircle2 size={15}/> Importação concluída</span>
          {:else}
            <span class="application-text-caption rounded-full bg-app-subtle px-3 py-1 font-semibold text-app-text">Pronta para importar</span>
          {/if}
        </div>

        <div class="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {#each [
            { label: "Total da planilha", value: data.sheet.batch.total_rows },
            { label: "Novas unidades", value: data.sheet.summary.create_count },
            { label: "Atualizações", value: data.sheet.summary.update_count },
            { label: "Com dados da API", value: data.sheet.summary.matched },
          ] as metric}
            <div class="rounded-xl bg-app-subtle p-3">
              <div class="text-xl font-bold tabular-nums text-app-text">{Number(metric.value ?? 0)}</div>
              <div class="application-text-caption mt-1 text-app-text-muted">{metric.label}</div>
            </div>
          {/each}
        </div>

        <div class="mt-4 rounded-xl border border-app-border p-3">
          <div class="application-text-caption font-semibold text-app-text">Conferência dos números de contrato</div>
          <p class="application-text-caption mt-1 text-app-text-muted">
            ID da planilha = numero_contrato da API (não contrato_id).
          </p>
          {#if data.sheet.batch.api_match_source === "live"}
            <p class="application-text-caption mt-2 text-app-text">
              API consultada agora: <strong>{Number(data.sheet.batch.api_contract_count ?? 0)} contratos retornados</strong> ·
              {Number(data.sheet.summary.matched ?? 0)} encontrados ·
              {Number(data.sheet.summary.missing ?? 0)} sem correspondência ·
              {Number(data.sheet.summary.ambiguous ?? 0)} duplicados.
            </p>
          {:else}
            <p role="alert" class="application-text-caption mt-2 flex items-start gap-2 text-app-warning-text">
              <AlertTriangle size={16} class="mt-0.5 shrink-0"/>
              A API não foi consultada nesta prévia. A comparação usou os contratos gravados localmente e pode estar incompleta.
            </p>
          {/if}
          <p class="application-text-meta mt-1 text-app-text-muted">
            Contratos atualmente no banco local: {Number(data.sheet.apiCacheTotal ?? 0)}
          </p>
        </div>

        {#if Number(data.sheet.summary.missing ?? 0) + Number(data.sheet.summary.ambiguous ?? 0) > 0}
          <p class="application-text-caption mt-3 flex items-center gap-2 text-app-text-muted">
            <AlertTriangle size={16} class="shrink-0 text-app-warning-text"/>
            {Number(data.sheet.summary.missing ?? 0) + Number(data.sheet.summary.ambiguous ?? 0)} registro(s) não têm vínculo único na fonte consultada. A planilha continua sendo a base da importação.
          </p>
        {/if}

        {#if Number(data.sheet.batch.record_version) < 2}
          <p role="alert" class="application-text-caption mt-4 text-app-warning-text">
            Esta prévia é de uma versão anterior. Envie novamente a planilha para importar todos os dados.
          </p>
        {:else if data.sheet.batch.status === "review"}
          <form method="POST" action="?/sheetApply" class="mt-5 flex flex-wrap items-center gap-3"
            on:submit={(event) => {
              if (importing || !window.confirm("Importar " + Number(data.sheet.batch.total_rows) + " registros da planilha? " + Number(data.sheet.summary.missing ?? 0) + " estão sem correspondência na fonte consultada. Clientes existentes serão atualizados, sem criar acessos ao portal.")) {
                event.preventDefault();
              } else {
                importing = true;
              }
            }}>
            <input type="hidden" name="batchId" value={String(data.sheet.batch.id)}/>
            <input type="hidden" name="confirmation" value="IMPORTAR"/>
            <button type="submit" disabled={importing}
              class="application-text-caption inline-flex h-11 items-center gap-2 rounded-xl bg-app-primary px-5 font-semibold text-white disabled:opacity-40">
              <CheckCircle2 size={17}/> {importing ? "Importando..." : "Realizar importação"}
            </button>
            <span class="application-text-caption text-app-text-muted">Importação completa em uma única operação.</span>
          </form>
        {:else}
          <p class="application-text-caption mt-4 flex items-center gap-2 font-semibold text-app-success-text">
            <CheckCircle2 size={17}/> {Number(data.sheet.summary.applied ?? 0)} registros processados.
          </p>
        {/if}
      </div>
    {/if}
  </section>

  <details class="mt-4 rounded-2xl border border-app-border bg-app-surface">
    <summary class="application-text-caption flex cursor-pointer items-center gap-2 p-4 font-semibold text-app-text">
      <RefreshCw size={17}/> Atualização opcional pela API
    </summary>
    <div class="border-t border-app-border-soft px-4 py-4">
      <p class="application-text-caption mb-3 text-app-text-muted">
        Consulta contratos e pessoas para complementar a planilha. Não é obrigatória para importar.
      </p>
      {#if data.batch}
        <p class="application-text-caption mb-3 text-app-text-muted">
          Última consulta: {dateLabel(data.batch.created_at)} ·
          {String(data.batch.status === "review" ? "Concluída" : data.batch.status === "failed" ? "Falhou" : "Em processamento")}
          {#if data.batch.last_error_code} · {String(data.batch.last_error_code)}{/if}
        </p>
      {/if}
      <form method="POST" action="?/start">
        <button type="submit" disabled={!data.apiConfigured || activeSync}
          class="application-text-caption inline-flex h-10 items-center gap-2 rounded-xl border border-app-border-control px-4 font-semibold text-app-text disabled:opacity-40">
          <RefreshCw size={16}/> {activeSync ? "Atualizando..." : "Atualizar dados da API"}
        </button>
      </form>
      {#if !data.apiConfigured}
        <p role="alert" class="application-text-caption mt-3 text-app-warning-text">API não configurada. A importação pela planilha continua disponível.</p>
      {/if}
      {#if activeSync}
        <form method="POST" action="?/process" class="mt-3">
          <button type="submit" class="application-text-caption inline-flex h-9 items-center gap-2 rounded-lg bg-app-subtle px-3 text-app-text"><Clock3 size={15}/> Continuar consulta</button>
        </form>
      {/if}
    </div>
  </details>
</ApplicationContent>
