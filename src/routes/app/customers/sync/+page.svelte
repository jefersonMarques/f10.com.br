<script lang="ts">
  import { AlertTriangle, ArrowLeft, CheckCircle2, Clock3, RefreshCw, ShieldCheck, Users } from "lucide-svelte";
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
      if (data.batch && ["queued", "scanning"].includes(String(data.batch.status))) void invalidateAll();
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
  <div class="mb-5 flex flex-wrap items-center justify-between gap-3">
    <div>
      <a href="/app/customers" class="application-text-meta mb-2 inline-flex items-center gap-1 font-semibold text-app-primary"><ArrowLeft size={15}/> Clientes</a>
      <h1 class="text-xl font-bold text-app-text">Sincronizar clientes</h1>
      <p class="application-text-caption mt-1 text-app-text-muted">API F10 · Unidade 1 · Todas as pessoas com contrato, inclusive cancelados.</p>
    </div>
    <span class="application-text-caption inline-flex items-center gap-2 rounded-xl border border-app-border px-3 py-2 text-app-text-muted"><ShieldCheck size={17}/> Somente leitura</span>
  </div>

  {#if form?.message}
    <div role="alert" class="application-text-caption mb-4 flex items-center gap-2 rounded-xl border border-app-warning-bg bg-app-warning-bg p-3 text-app-warning-text"><AlertTriangle size={17}/>{form.message}</div>
  {/if}

  <div class="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(240px,310px)]">
    <section class="rounded-[20px] border border-app-border bg-app-surface p-5">
      <div class="mb-3 flex items-center gap-2 font-bold text-app-text"><RefreshCw size={18}/> Nova busca na API</div>
      <p class="application-text-caption mb-4 text-app-text-muted">Consulta contratos, identifica pessoas únicas e compara com os contatos existentes. Não cria clientes nem altera cadastros nesta etapa.</p>
      <form method="POST" action="?/start">
        <button type="submit" disabled={!data.apiConfigured} class="application-text-caption inline-flex h-11 items-center gap-2 rounded-xl bg-app-primary px-5 font-semibold text-white disabled:cursor-not-allowed disabled:opacity-40"><RefreshCw size={17}/> Buscar atualizações</button>
      </form>
      {#if !data.apiConfigured}<p role="alert" class="application-text-caption mt-3 text-app-warning-text">Configure F10_API_BEARER_TOKEN no servidor para habilitar a conexão.</p>{/if}
    </section>
    <section class="rounded-[20px] border border-app-border bg-app-surface p-5">
      <h2 class="application-text-caption mb-3 font-bold text-app-text">Diagnósticos recentes</h2>
      {#if data.batches.length === 0}
        <p class="application-text-caption text-app-text-muted">Nenhuma busca realizada.</p>
      {:else}
        <div class="max-h-44 space-y-1 overflow-auto">
          {#each data.batches as batch}
            <a href={"/app/customers/sync?batch=" + String(batch.id)} class="application-text-caption flex justify-between gap-2 rounded-lg px-2 py-2 hover:bg-app-subtle" class:bg-app-subtle={batch.id === data.batch?.id}>
              <span class="text-app-text">{dateLabel(batch.created_at)}</span>
              <span class="text-app-text-muted">{statusNames[String(batch.status)] ?? String(batch.status)}</span>
            </a>
          {/each}
        </div>
      {/if}
    </section>
  </div>

  {#if data.batch && data.summary}
    <section class="mt-5 overflow-hidden rounded-[20px] border border-app-border bg-app-surface">
      <div class="flex flex-wrap items-center justify-between gap-3 border-b border-app-border-soft p-4">
        <div class="flex items-center gap-2">
          {#if data.batch.status === "review"}<CheckCircle2 size={19} class="text-app-success-text"/>{:else}<Clock3 size={19} class="text-app-text-muted"/>{/if}
          <div>
            <h2 class="application-text-caption font-bold text-app-text">{statusNames[String(data.batch.status)] ?? String(data.batch.status)}</h2>
            <p class="application-text-meta text-app-text-muted">Criado em {dateLabel(data.batch.created_at)}</p>
          </div>
        </div>
        {#if data.batch.status === "queued" || data.batch.status === "scanning"}
          <form method="POST" action="?/process">
            <button type="submit" class="application-text-caption inline-flex h-9 items-center gap-2 rounded-lg border border-app-border-control px-3 font-semibold text-app-text"><RefreshCw size={14}/> Continuar agora</button>
          </form>
        {/if}
      </div>

      <div class="grid grid-cols-2 gap-3 p-4 sm:grid-cols-3 lg:grid-cols-7">
        {#each [
          { label: "Contratos", value: data.batch.total_contracts },
          { label: "Pessoas", value: data.batch.total_people },
          { label: "Analisadas", value: data.batch.processed_people },
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
        <p role="alert" class="application-text-caption mx-4 mb-3 text-app-warning-text">{data.batch.skipped_contracts} contrato(s) com identificação incompleta foram ignorados na busca.</p>
      {/if}
      {#if data.batch.last_error_code}
        <p role="alert" class="application-text-caption mx-4 mb-3 text-app-danger-text">Não foi possível concluir: {String(data.batch.last_error_code)}. Verifique a credencial e a API.</p>
      {/if}
      {#if data.batch.status === "review"}
        <div class="mx-4 mb-4 rounded-xl border border-app-border-control bg-app-subtle p-3">
          <p class="application-text-caption flex items-center gap-2 text-app-text"><ShieldCheck size={17}/> Prévia concluída. Nenhum cadastro foi criado ou atualizado.</p>
          <p class="application-text-meta mt-1 text-app-text-muted">A aplicação de alterações será disponibilizada em etapa separada, com revisão e confirmação explícita.</p>
        </div>
      {:else if data.batch.status === "scanning" || data.batch.status === "queued"}
        <p class="application-text-caption mx-4 mb-4 text-app-text-muted">A busca pode continuar no worker, mesmo após fechar esta página.</p>
      {/if}

      <div class="overflow-x-auto border-t border-app-border-soft">
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
    </section>
  {/if}
</ApplicationContent>
