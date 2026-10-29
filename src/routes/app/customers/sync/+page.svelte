<script lang="ts">
  import { AlertTriangle, ArrowLeft, CheckCircle2, Clock3, FileSpreadsheet, RefreshCw, ShieldCheck, Users } from "lucide-svelte";
  import { onMount } from "svelte";
  import { invalidateAll } from "$app/navigation";
  import ApplicationContent from "$lib/components/application/ApplicationContent.svelte";
  import type { ActionData, PageData } from "./$types";

  export let data: PageData;
  export let form: ActionData;

  const statusNames: Record<string, string> = {
    queued: "Na fila", scanning: "Consultando API", review: "Prévia pronta", failed: "Falha",
  };
  const resultNames: Record<string, string> = {
    pending: "Pendente", create: "Novo cliente", update: "Atualizar cadastro",
    unchanged: "Sem mudanças", possible_match: "Conferir duplicidade", failed: "Falhou",
  };

  onMount(() => {
    const timer = setInterval(() => {
      if (data.view === "sync" && data.batch && ["queued", "scanning"].includes(String(data.batch.status))) void invalidateAll();
    }, 5_000);
    return () => clearInterval(timer);
  });

  function pageHref(page: number): string {
    return "/app/customers/sync?batch=" + String(data.batch?.id ?? "") + "&page=" + page;
  }

  function dateLabel(value: unknown): string {
    if (!value) return "—";
    return new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" })
      .format(new Date(String(value)));
  }
</script>

<svelte:head><title>Sincronizar clientes | F10 Operations</title></svelte:head>


<ApplicationContent width="wide">
  <header class="mb-4 flex flex-wrap items-center justify-between gap-3">
    <div>
      <a href="/app/customers" class="application-text-meta mb-1 inline-flex items-center gap-1 font-semibold text-app-primary"><ArrowLeft size={15}/> Clientes</a>
      <h1 class="text-xl font-bold text-app-text">Clientes F10</h1>
      <p class="application-text-caption mt-1 text-app-text-muted">
        Unidade {data.sourceUnitId ?? "não configurada"} ·
        {data.batch ? "Última consulta: " + dateLabel(data.batch.created_at) : "Ainda não sincronizado"}
      </p>
    </div>
    <form method="POST" action="?/start">
      <button type="submit" disabled={!data.apiConfigured || data.batch?.status === "queued" || data.batch?.status === "scanning"}
        class="application-text-caption inline-flex h-10 items-center gap-2 rounded-xl bg-app-primary px-4 font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50">
        <RefreshCw size={17}/> {data.batch?.status === "queued" || data.batch?.status === "scanning" ? "Atualizando..." : "Atualizar API"}
      </button>
    </form>
  </header>

  {#if form?.message}
    <div role="alert" class="application-text-caption mb-4 flex items-center gap-2 rounded-xl border border-app-warning-bg bg-app-warning-bg p-3 text-app-warning-text"><AlertTriangle size={17}/>{form.message}</div>
  {/if}
  {#if !data.apiConfigured}
    <p role="alert" class="application-text-caption mb-4 rounded-xl bg-app-warning-bg p-3 text-app-warning-text">
      API indisponível. Verifique F10_UID e F10_API_BEARER_TOKEN.
    </p>
  {/if}
  {#if data.batch?.last_error_code}
    <p role="alert" class="application-text-caption mb-4 rounded-xl bg-app-danger-bg p-3 text-app-danger-text">
      Falha na consulta: {String(data.batch.last_error_code)}. Confira a integração.
    </p>
  {/if}

  <div class="mb-4 grid grid-cols-3 gap-2 sm:gap-3">
    {#each [
      { label: "Contratos", value: data.contracts.summary?.total ?? 0 },
      { label: "Com apelido", value: data.contracts.summary?.with_nickname ?? 0 },
      { label: "Com franquia", value: data.contracts.summary?.with_group ?? 0 },
    ] as metric}
      <div class="rounded-xl border border-app-border bg-app-surface px-3 py-3 sm:px-4">
        <div class="text-xl font-bold tabular-nums text-app-text">{Number(metric.value)}</div>
        <div class="application-text-caption mt-1 text-app-text-muted">{metric.label}</div>
      </div>
    {/each}
  </div>

  <nav aria-label="Seções de clientes F10" class="mb-4 flex flex-wrap gap-2 border-b border-app-border pb-3">
    <a href="/app/customers/sync?view=contracts" aria-current={data.view === "contracts" ? "page" : undefined}
      class={data.view === "contracts" ? "application-text-caption inline-flex h-10 items-center gap-2 rounded-lg border px-3 font-semibold border-app-primary bg-app-subtle text-app-primary" : "application-text-caption inline-flex h-10 items-center gap-2 rounded-lg border px-3 font-semibold border-app-border-control text-app-text"}>
      <Users size={16}/> Contratos
    </a>
    <a href="/app/customers/sync?view=sheet" aria-current={data.view === "sheet" ? "page" : undefined}
      class={data.view === "sheet" ? "application-text-caption inline-flex h-10 items-center gap-2 rounded-lg border px-3 font-semibold border-app-primary bg-app-subtle text-app-primary" : "application-text-caption inline-flex h-10 items-center gap-2 rounded-lg border px-3 font-semibold border-app-border-control text-app-text"}>
      <FileSpreadsheet size={16}/> Apelidos e franquias
    </a>
    <a href="/app/customers/sync?view=sync" aria-current={data.view === "sync" ? "page" : undefined}
      class={data.view === "sync" ? "application-text-caption inline-flex h-10 items-center gap-2 rounded-lg border px-3 font-semibold border-app-primary bg-app-subtle text-app-primary" : "application-text-caption inline-flex h-10 items-center gap-2 rounded-lg border px-3 font-semibold border-app-border-control text-app-text"}>
      <Clock3 size={16}/> Diagnóstico
    </a>
  </nav>

  {#if data.view === "sync"}
    <details class="mb-4 rounded-xl border border-app-border bg-app-surface">
      <summary class="application-text-caption cursor-pointer p-4 font-semibold text-app-text">Histórico de consultas ({data.batches.length})</summary>
      {#if data.batches.length === 0}
        <p class="application-text-caption px-4 pb-4 text-app-text-muted">Nenhuma consulta realizada.</p>
      {:else}
        <div class="max-h-56 space-y-1 overflow-auto px-4 pb-4">
          {#each data.batches as batch}
            <a href={"/app/customers/sync?batch=" + String(batch.id)}
              class="application-text-caption flex flex-wrap justify-between gap-2 rounded-lg px-2 py-2 hover:bg-app-subtle"
              class:bg-app-subtle={batch.id === data.batch?.id}>
              <span>{dateLabel(batch.created_at)}</span>
              <span class="text-app-text-muted">{statusNames[String(batch.status)] ?? String(batch.status)}</span>
            </a>
          {/each}
        </div>
      {/if}
    </details>

  {#if data.batch && data.summary}
    <section class="mt-5 overflow-hidden rounded-[20px] border border-app-border bg-app-surface">
      <div class="flex flex-wrap items-center justify-between gap-3 border-b border-app-border-soft p-4">
        <div class="flex items-center gap-2">
          {#if data.batch.status === "review"}<CheckCircle2 size={19} class="text-app-success-text"/>{:else}<Clock3 size={19} class="text-app-text-muted"/>{/if}
          <div>
            <h2 class="application-text-caption font-bold text-app-text">{statusNames[String(data.batch.status)] ?? String(data.batch.status)}</h2>
            <p class="application-text-meta text-app-text-muted">Unidade {String(data.batch.unit_id)} · Criado em {dateLabel(data.batch.created_at)}</p>
          </div>
        </div>
        {#if data.batch.status === "queued" || data.batch.status === "scanning"}
          <form method="POST" action="?/process">
            <button type="submit" class="application-text-caption inline-flex h-9 items-center gap-2 rounded-lg border border-app-border-control px-3 font-semibold text-app-text"><RefreshCw size={14}/> Continuar agora</button>
          </form>
        {/if}
      </div>

      <div class="grid grid-cols-2 gap-3 p-4 sm:grid-cols-3 lg:grid-cols-5">
        {#each [
          { label: "Consultadas", value: data.batch.processed_people },
          { label: "Novos", value: data.summary.create_count },
          { label: "Atualizações", value: data.summary.update_count },
          { label: "Revisar", value: data.summary.review_count },
          { label: "Falhas", value: data.summary.failed_count },
        ] as metric}
          <div class="rounded-xl bg-app-subtle p-3">
            <div class="text-lg font-bold tabular-nums text-app-text">{Number(metric.value ?? 0)}</div>
            <div class="application-text-meta mt-1 text-app-text-muted">{metric.label}</div>
          </div>
        {/each}
      </div>
      {#if Number(data.batch.skipped_contracts) > 0}
        <p role="alert" class="application-text-caption mx-4 mb-3 text-app-warning-text">{data.batch.skipped_contracts} contrato(s) sem pessoa identificada foram preservados, mas não participam da conciliação de clientes.</p>
      {/if}
      {#if data.batch.status === "review"}
        <div class="mx-4 mb-4 rounded-xl border border-app-border-control bg-app-subtle p-3">
          <p class="application-text-caption flex items-center gap-2 text-app-text"><ShieldCheck size={17}/> Prévia concluída. Nenhum cadastro foi criado ou atualizado.</p>
          <p class="application-text-meta mt-1 text-app-text-muted">A aplicação de alterações será disponibilizada em etapa separada, com revisão e confirmação explícita.</p>
        </div>
      {:else if data.batch.status === "scanning" || data.batch.status === "queued"}
        <p class="application-text-caption mx-4 mb-4 text-app-text-muted">A busca pode continuar no worker, mesmo após fechar esta página.</p>
      {/if}

      <details class="border-t border-app-border-soft">
        <summary class="application-text-caption cursor-pointer p-4 font-semibold text-app-primary">Ver pessoas consultadas</summary>
        <div class="overflow-x-auto">
        <table class="w-full min-w-[880px] text-left">
          <thead class="application-text-meta bg-app-subtle text-app-text-muted">
            <tr><th class="px-4 py-3">Pessoa F10</th><th class="px-4 py-3">Contato</th><th class="px-4 py-3">Contratos</th><th class="px-4 py-3">Resultado</th></tr>
          </thead>
          <tbody class="divide-y divide-app-border-soft">
            {#each data.rows as row}
              <tr>
                <td class="application-text-caption px-4 py-3 align-top">
                  <div class="font-semibold text-app-text">{String(row.customer_name ?? "Aguardando consulta")}</div>
                  <span class="application-text-meta text-app-text-muted">ID {String(row.person_id)}</span>
                </td>
                <td class="application-text-caption px-4 py-3 align-top text-app-text-muted">
                  <div>{String(row.email || "Sem e-mail")}</div>
                  <div class="application-text-meta mt-1">{String(row.whatsapp || row.phone || "")}</div>
                </td>
                <td class="application-text-caption px-4 py-3 align-top text-app-text-muted">
                  <span>{Array.isArray(row.contract_ids) ? row.contract_ids.length : 0} contrato(s)</span>
                  <div class="application-text-meta mt-1 text-app-text">Nº {Array.isArray(row.contract_numbers) && row.contract_numbers.length ? row.contract_numbers.slice(0, 5).map(String).join(", ") : "não informado"}</div>
                  <div class="application-text-meta mt-1">{Number(row.active_contracts)} ativo(s)</div>
                </td>
                <td class="application-text-caption px-4 py-3 align-top">
                  <span class="inline-flex items-center gap-1 font-semibold text-app-text">{#if row.result === "possible_match"}<AlertTriangle size={14} class="text-app-warning-text"/>{:else if row.result === "unchanged"}<CheckCircle2 size={14} class="text-app-success-text"/>{:else}<Users size={14} class="text-app-text-muted"/>{/if}{resultNames[String(row.result)] ?? String(row.result)}</span>
                  {#if Number(row.potential_match_count) > 0}<div class="application-text-meta mt-1 text-app-text-muted">{row.potential_match_count} contato(s) parecido(s)</div>{/if}
                  {#if row.error_code}<div class="application-text-meta mt-1 text-app-danger-text">Consulta não concluída: {String(row.error_code)}</div>{/if}
                </td>
              </tr>
            {/each}
          </tbody>
        </table>
        {#if data.rows.length === 0}
          <p class="application-text-caption px-4 py-8 text-center text-app-text-muted">Aguardando resultados da consulta.</p>
        {/if}
      </div>
      {#if data.pages > 1}
        <div class="flex items-center justify-between gap-2 border-t border-app-border-soft p-4">
          <span class="application-text-caption text-app-text-muted">Página {data.page} de {data.pages}</span>
          <div class="flex gap-2">
            {#if data.page > 1}<a href={pageHref(data.page - 1)} class="application-text-caption rounded-lg border border-app-border-control px-3 py-2 text-app-text">Anterior</a>{/if}
            {#if data.page < data.pages}<a href={pageHref(data.page + 1)} class="application-text-caption rounded-lg bg-app-primary px-3 py-2 font-semibold text-white">Próxima</a>{/if}
          </div>
        </div>
      {/if}
      </details>
    </section>
  {/if}

  {/if}

  {#if data.view === "contracts"}
  <section id="contratos" class="overflow-hidden rounded-[20px] border border-app-border bg-app-surface">
    <div class="flex flex-wrap items-center justify-between gap-3 border-b border-app-border-soft p-4">
      <div>
        <h2 class="application-text-caption font-bold text-app-text">Contratos e unidades</h2>
        <p class="application-text-meta mt-1 text-app-text-muted">
          {Number(data.contracts.summary?.total ?? 0)} contratos ·
          {Number(data.contracts.summary?.with_nickname ?? 0)} com apelido ·
          {Number(data.contracts.summary?.with_group ?? 0)} com grupo
        </p>
      </div>
      <form method="GET" action="/app/customers/sync" class="flex w-full gap-2 sm:w-auto">
        <input type="search" name="q" value={data.contractQuery}
          placeholder="Nº, apelido, grupo ou pessoa"
          class="application-text-caption h-10 min-w-0 flex-1 rounded-xl border border-app-border-control bg-app-subtle px-3 text-app-text sm:w-64"/>
        <button type="submit" class="application-text-caption h-10 rounded-xl bg-app-primary px-4 font-semibold text-white">Buscar</button>
      </form>
    </div>
    {#if data.contracts.rows.length}
      <div class="overflow-x-auto">
        <table class="w-full min-w-[830px] text-left">
          <thead class="application-text-meta bg-app-subtle text-app-text-muted">
            <tr>
              <th class="px-4 py-3">Contrato</th>
              <th class="px-4 py-3">Apelido / unidade</th>
              <th class="px-4 py-3">Franquia</th>
              <th class="px-4 py-3">Pessoa / responsável</th>
              <th class="px-4 py-3">Situação</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-app-border-soft">
            {#each data.contracts.rows as contract}
              <tr>
                <td class="application-text-caption px-4 py-3 align-top">
                  <strong class="text-app-text">Nº {String(contract.numero_contrato ?? "—")}</strong>
                  <div class="application-text-meta text-app-text-muted">ID {String(contract.contract_id)}</div>
                </td>
                <td class="application-text-caption px-4 py-3 align-top">
                  <strong class="text-app-text">{String(contract.apelido ?? "Não informado")}</strong>
                  {#if contract.contracted_plan}
                    <div class="application-text-meta mt-1 text-app-text-muted">{String(contract.contracted_plan)}</div>
                  {/if}
                  {#if contract.city}
                    <div class="application-text-meta text-app-text-muted">{String(contract.city)}</div>
                  {/if}
                </td>
                <td class="application-text-caption px-4 py-3 align-top text-app-text-muted">
                  {String(contract.group_name ?? "Sem grupo")}
                </td>
                <td class="application-text-caption px-4 py-3 align-top">
                  <div class="text-app-text">{String(contract.person_name ?? contract.spreadsheet_student_name ?? "Não informado")}</div>
                  <div class="application-text-meta mt-1 text-app-text-muted">Pessoa {String(contract.pessoa_id ?? "—")} · Titular {String(contract.titular_id ?? "—")}</div>
                </td>
                <td class="application-text-caption px-4 py-3 align-top text-app-text-muted">
                  {String(contract.x_status ?? "Não informado")}
                </td>
              </tr>
            {/each}
          </tbody>
        </table>
      </div>
      {#if data.contracts.pages > 1}
        <div class="flex flex-wrap items-center justify-between gap-2 border-t border-app-border-soft p-4">
          <span class="application-text-caption text-app-text-muted">Página {data.contracts.page} de {data.contracts.pages}</span>
          <div class="flex gap-2">
            {#if data.contracts.page > 1}
              <a class="application-text-caption rounded-lg border border-app-border-control px-3 py-2 font-semibold text-app-text"
                href={"/app/customers/sync?q=" + encodeURIComponent(data.contractQuery) + "&contractsPage=" + (data.contracts.page - 1)}>Anterior</a>
            {/if}
            {#if data.contracts.page < data.contracts.pages}
              <a class="application-text-caption rounded-lg bg-app-primary px-3 py-2 font-semibold text-white"
                href={"/app/customers/sync?q=" + encodeURIComponent(data.contractQuery) + "&contractsPage=" + (data.contracts.page + 1)}>Próxima</a>
            {/if}
          </div>
        </div>
      {/if}
    {:else}
      <div class="application-text-caption p-6 text-center text-app-text-muted">
        {Number(data.contracts.summary?.total ?? 0) === 0 ? "Sincronize a API para listar os contratos." : "Nenhum contrato corresponde ao filtro."}
      </div>
    {/if}
  </section>

  {/if}

  {#if data.view === "sheet"}
  <section class="overflow-hidden rounded-[20px] border border-app-border bg-app-surface">
    <div class="border-b border-app-border-soft p-4">
      <div class="flex items-center gap-2 font-bold text-app-text"><FileSpreadsheet size={18}/> Apelidos e franquias</div>
      <p class="application-text-caption mt-1 text-app-text-muted">
        Complete apelidos e franquias pelo número do contrato.
      </p>
    </div>
    <div class="p-4">
      <form method="POST" action="?/sheetUpload" enctype="multipart/form-data" class="flex flex-wrap items-end gap-3">
        <label class="application-text-caption min-w-[220px] flex-1 font-semibold text-app-text">
          Planilha Clientes F10
          <input type="file" name="file" accept=".xlsx,.csv" required
            class="application-text-caption mt-2 block w-full rounded-lg border border-app-border-control bg-app-subtle p-2.5 text-app-text"/>
        </label>
        <button type="submit" disabled={Number(data.contracts.summary?.total ?? 0) === 0}
          class="application-text-caption h-11 rounded-xl bg-app-primary px-5 font-semibold text-white disabled:cursor-not-allowed disabled:opacity-40">
          Conferir vínculos
        </button>
      </form>
    </div>
    {#if data.sheet.batch && data.sheet.summary}
      <div class="border-t border-app-border-soft p-4">
        <div class="flex flex-wrap items-center justify-between gap-2">
          <div>
            <strong class="application-text-caption text-app-text">{String(data.sheet.batch.file_name)}</strong>
            <span class="application-text-meta ml-2 text-app-text-muted">{String(data.sheet.batch.status === "applied" ? "Aplicada" : "Prévia")}</span>
          </div>
          <span class="application-text-meta text-app-text-muted">{Number(data.sheet.batch.total_rows)} linhas</span>
        </div>
        <div class="mt-3 grid grid-cols-3 gap-2">
          {#each [
            { title: "Encontrados", value: data.sheet.summary.matched },
            { title: "Não encontrados", value: data.sheet.summary.missing },
            { title: "Duplicados", value: data.sheet.summary.ambiguous },
          ] as entry}
            <div class="rounded-lg bg-app-subtle p-3">
              <div class="text-lg font-bold tabular-nums text-app-text">{Number(entry.value ?? 0)}</div>
              <div class="application-text-meta text-app-text-muted">{entry.title}</div>
            </div>
          {/each}
        </div>
        {#if data.sheet.batch.status === "review"}
          <form method="POST" action="?/sheetApply" class="mt-4 flex flex-wrap items-center gap-3"
            on:submit={(event) => {
              if (!window.confirm("Aplicar " + Number(data.sheet.summary.matched ?? 0) + " vínculos de apelidos e franquias? Os registros não encontrados continuarão pendentes.")) event.preventDefault();
            }}>
            <input type="hidden" name="batchId" value={String(data.sheet.batch.id)}/>
            <input type="hidden" name="confirmation" value="VINCULAR"/>
            <button type="submit" disabled={Number(data.sheet.summary.matched ?? 0) === 0}
              class="application-text-caption h-10 rounded-lg bg-app-primary px-4 font-semibold text-white disabled:opacity-40">
              Aplicar {Number(data.sheet.summary.matched ?? 0)} vínculos
            </button>
            <span class="application-text-meta text-app-text-muted">Somente números com correspondência única.</span>
          </form>
        {:else}
          <p class="application-text-caption mt-3 flex items-center gap-2 text-app-success-text">
            <CheckCircle2 size={16}/> Apelidos e franquias vinculados aos contratos.
          </p>
        {/if}
      </div>
      <details class="border-t border-app-border-soft">
        <summary class="application-text-caption cursor-pointer p-4 font-semibold text-app-primary">Ver contratos e pendências</summary>
        <div class="overflow-x-auto">
        <table class="w-full min-w-[650px] text-left">
          <thead class="application-text-meta bg-app-subtle text-app-text-muted">
            <tr><th class="px-4 py-3">Nº contrato</th><th class="px-4 py-3">Apelido</th><th class="px-4 py-3">Franquia</th><th class="px-4 py-3">Conciliação</th></tr>
          </thead>
          <tbody class="divide-y divide-app-border-soft">
            {#each data.sheet.rows as item}
              <tr>
                <td class="application-text-caption px-4 py-3 text-app-text">{String(item.source_id)}</td>
                <td class="application-text-caption px-4 py-3 text-app-text">
                  {String((item.record as Record<string, unknown>).holderName || (item.record as Record<string, unknown>).unitName || "—")}
                </td>
                <td class="application-text-caption px-4 py-3 text-app-text-muted">
                  {String((item.record as Record<string, unknown>).groupName || "—")}
                </td>
                <td class="application-text-caption px-4 py-3">
                  {#if item.match_status === "matched"}
                    <span class="font-semibold text-app-success-text">Encontrado · ID {String(item.contract_id)}</span>
                  {:else if item.match_status === "not_found"}
                    <span class="font-semibold text-app-warning-text">Não localizado na API</span>
                  {:else}
                    <span class="font-semibold text-app-danger-text">Revisar duplicidade</span>
                  {/if}
                </td>
              </tr>
            {/each}
          </tbody>
        </table>
      </div>
      {#if data.sheet.pages > 1}
        <div class="flex items-center justify-between gap-2 border-t border-app-border-soft p-4">
          <span class="application-text-caption text-app-text-muted">Página {data.sheet.page} de {data.sheet.pages}</span>
          <div class="flex gap-2">
            {#if data.sheet.page > 1}
              <a href={"/app/customers/sync?sheetBatch=" + String(data.sheet.batch.id) + "&sheetPage=" + (data.sheet.page - 1)}
                class="application-text-caption rounded-lg border border-app-border-control px-3 py-2 text-app-text">Anterior</a>
            {/if}
            {#if data.sheet.page < data.sheet.pages}
              <a href={"/app/customers/sync?sheetBatch=" + String(data.sheet.batch.id) + "&sheetPage=" + (data.sheet.page + 1)}
                class="application-text-caption rounded-lg bg-app-primary px-3 py-2 font-semibold text-white">Próxima</a>
            {/if}
          </div>
        </div>
      {/if}
      </details>
    {/if}
  </section>
  {/if}

</ApplicationContent>
