<script lang="ts">
  import { onMount } from "svelte";
  import {
    AlertTriangle, ArrowUpRight, CheckCircle2, Clock3, Headphones,
    MessageCircle, RefreshCw, UserRoundX, Users,
  } from "lucide-svelte";
  import type {
    ChatPerformanceItem,
    ChatPerformanceFilters,
    SupportChatReport,
  } from "$lib/support/chatPerformanceReport";

  export let initialPeriodDays: 7 | 30 | 90 = 30;

  let report: SupportChatReport | null = null;
  let periodDays: ChatPerformanceFilters["periodDays"] = initialPeriodDays;
  let department: ChatPerformanceFilters["department"] = "all";
  let queueId = "all";
  let userId = "all";
  let view: ChatPerformanceFilters["view"] = "all";
  let page = 1;
  let loading = false;
  let errorMessage = "";
  let requestVersion = 0;

  $: selectableQueues = report?.queues.filter((queue) =>
    department === "all" || queue.department === department
  ) ?? [];

  function formatMinutes(value: number | null): string {
    if (value === null) return "—";
    if (value < 60) return `${value.toLocaleString("pt-BR", { maximumFractionDigits: 1 })} min`;
    return `${(value / 60).toLocaleString("pt-BR", { maximumFractionDigits: 1 })} h`;
  }

  function formatDate(value: string): string {
    return new Intl.DateTimeFormat("pt-BR", {
      dateStyle: "short",
      timeStyle: "short",
      timeZone: "America/Sao_Paulo",
    }).format(new Date(value));
  }

  function statusLabel(item: ChatPerformanceItem): string {
    if (item.state === "waiting_first") return "Aguardando 1ª resposta";
    if (item.state === "waiting_reply") return "Aguardando retorno";
    if (item.state === "abandoned") return "Cliente encerrou após espera";
    if (item.state === "closed_unanswered") return "Encerrado sem resposta";
    if (item.state === "expired_unanswered") return "Expirado sem atendimento";
    if (item.state === "closed") return "Concluído";
    return "Em atendimento";
  }

  async function refresh(): Promise<void> {
    const current = ++requestVersion;
    loading = true;
    errorMessage = "";

    try {
      const params = new URLSearchParams({
        period: String(periodDays),
        department,
        queue: queueId,
        user: userId,
        view,
        page: String(page),
      });
      const response = await fetch(`/api/app/performance/chats?${params.toString()}`, {
        cache: "no-store",
      });
      if (!response.ok) throw new Error("CHAT_PERFORMANCE_UNAVAILABLE");
      const result = await response.json() as SupportChatReport;
      if (current === requestVersion) report = result;
    } catch {
      if (current === requestVersion) {
        errorMessage = "Não foi possível atualizar os indicadores de chat.";
      }
    } finally {
      if (current === requestVersion) loading = false;
    }
  }

  function updateDepartment(): void {
    page = 1;
    queueId = "all";
    userId = "all";
    void refresh();
  }

  function updateQueue(): void {
    page = 1;
    userId = "all";
    void refresh();
  }

  function handleFilterChange(): void {
    page = 1;
    void refresh();
  }

  function showWaiting(): void {
    setView("waiting");
  }

  function showLate(): void {
    setView("late");
  }

  function showUnanswered(): void {
    setView("unanswered");
  }

  function showAbandoned(): void {
    setView("abandoned");
  }

  function setView(next: ChatPerformanceFilters["view"]): void {
    page = 1;
    view = next;
    void refresh();
  }

  function previousPage(): void {
    if (page <= 1) return;
    page -= 1;
    void refresh();
  }

  function nextPage(): void {
    if (!report || page >= report.pageCount) return;
    page += 1;
    void refresh();
  }

  onMount(() => {
    void refresh();
    const timer = setInterval(() => {
      if (!document.hidden && !loading) void refresh();
    }, 30_000);

    const onFocus = () => {
      if (!document.hidden) void refresh();
    };
    window.addEventListener("focus", onFocus);

    return () => {
      clearInterval(timer);
      window.removeEventListener("focus", onFocus);
      requestVersion += 1;
    };
  });
</script>

<section class="space-y-4">
  <div class="rounded-2xl border border-app-border-control bg-app-surface p-4 sm:p-5">
    <div class="flex flex-wrap items-start justify-between gap-3">
      <div>
        <h2 class="flex items-center gap-2 text-[16px] font-semibold text-app-text">
          <MessageCircle size={19} class="text-app-primary"/> Atendimento por chat
        </h2>
        <p class="application-text-caption mt-1 text-app-text-muted">
          Espera dos clientes, atendimentos sem resposta e desempenho por fila.
        </p>
      </div>
      <button type="button" disabled={loading} on:click={() => void refresh()}
        aria-label="Atualizar indicadores de chat"
        title="Atualizar indicadores de chat"
        class="flex h-10 w-10 items-center justify-center rounded-xl border border-app-border-control text-app-primary disabled:opacity-50">
        <RefreshCw size={18} class={loading ? "animate-spin" : ""}/>
      </button>
    </div>

    <div class="mt-4 flex flex-wrap gap-2">
      <select bind:value={periodDays} on:change={handleFilterChange}
        aria-label="Período dos chats"
        class="application-text-caption min-h-10 rounded-xl border border-app-border-control bg-app-surface px-3 text-app-text">
        <option value={7}>7 dias</option>
        <option value={30}>30 dias</option>
        <option value={90}>90 dias</option>
      </select>
      <select bind:value={department} on:change={updateDepartment}
        aria-label="Canal dos chats"
        class="application-text-caption min-h-10 rounded-xl border border-app-border-control bg-app-surface px-3 text-app-text">
        <option value="all">Todos os canais</option>
        <option value="support">Suporte</option>
        <option value="finance">Financeiro</option>
      </select>
      <select bind:value={queueId} on:change={updateQueue}
        aria-label="Fila dos chats"
        class="application-text-caption min-h-10 min-w-[140px] max-w-full rounded-xl border border-app-border-control bg-app-surface px-3 text-app-text">
        <option value="all">Todas as filas</option>
        {#each selectableQueues as queue (queue.id)}
          <option value={queue.id}>{queue.name}</option>
        {/each}
      </select>
      <select bind:value={userId} on:change={handleFilterChange}
        aria-label="Operador dos chats"
        class="application-text-caption min-h-10 min-w-[150px] rounded-xl border border-app-border-control bg-app-surface px-3 text-app-text">
        <option value="all">Todos os operadores</option>
        {#each report?.users ?? [] as operator (operator.id)}
          <option value={operator.id}>{operator.name}</option>
        {/each}
      </select>
    </div>

    {#if errorMessage}
      <p role="alert" class="application-text-caption mt-3 rounded-lg bg-app-danger-bg px-3 py-2 text-app-danger-text">
        {errorMessage}
      </p>
    {/if}
    {#if report?.truncated}
      <p role="status" class="application-text-caption mt-3 rounded-lg bg-app-warning-bg px-3 py-2 text-app-warning-text">
        Há mais de 10.000 conversas no recorte. Reduza o período para obter totais completos.
      </p>
    {/if}
    {#if report}
      <p class="application-text-meta mt-3 text-app-text-soft">
        Atualizado às {formatDate(report.generatedAt)} · Atualização automática a cada 30 segundos
      </p>
    {/if}
  </div>

  {#if report}
    <div class="grid gap-3 sm:grid-cols-2 xl:grid-cols-4" aria-label="Supervisão atual">
      <article class="rounded-2xl border border-app-border bg-app-surface p-4">
        <MessageCircle size={20} class="text-app-primary"/>
        <strong class="mt-2 block text-[24px] font-semibold text-app-text">{report.summary.active}</strong>
        <span class="application-text-caption text-app-text-muted">Chats abertos</span>
      </article>
      <article class="rounded-2xl border border-app-border bg-app-surface p-4">
        <Users size={20} class="text-app-success-text"/>
        <strong class="mt-2 block text-[24px] font-semibold text-app-text">{report.summary.onlineOperators}</strong>
        <span class="application-text-caption text-app-text-muted">Operadores online no relatório</span>
      </article>
      <article class="rounded-2xl border border-app-border bg-app-surface p-4">
        <Headphones size={20} class="text-app-warning-text"/>
        <strong class="mt-2 block text-[24px] font-semibold text-app-text">{report.summary.unassignedWaiting}</strong>
        <span class="application-text-caption text-app-text-muted">Aguardando sem responsável</span>
      </article>
      <article class="rounded-2xl border border-app-warning-border bg-app-surface p-4">
        <AlertTriangle size={20} class="text-app-warning-text"/>
        <strong class="mt-2 block text-[24px] font-semibold text-app-warning-text">{report.summary.critical}</strong>
        <span class="application-text-caption text-app-text-muted">No limite de escalada crítica</span>
      </article>
    </div>
    <div class="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      <button type="button" on:click={showWaiting}
        class="rounded-2xl border border-app-border bg-app-surface p-4 text-left hover:border-app-primary">
        <Users size={20} class="text-app-primary"/>
        <strong class="mt-3 block text-[26px] font-semibold text-app-text">{report.summary.waiting}</strong>
        <span class="application-text-caption text-app-text-muted">Chats aguardando resposta</span>
      </button>
      <button type="button" on:click={showLate}
        class="rounded-2xl border border-app-warning-border bg-app-surface p-4 text-left hover:border-app-warning-border">
        <AlertTriangle size={20} class="text-app-warning-text"/>
        <strong class="mt-3 block text-[26px] font-semibold text-app-warning-text">{report.summary.late}</strong>
        <span class="application-text-caption text-app-text-muted">Espera acima do limite</span>
      </button>
      <button type="button" on:click={showUnanswered}
        class="rounded-2xl border border-app-border bg-app-surface p-4 text-left hover:border-app-primary">
        <Headphones size={20} class="text-app-info-text"/>
        <strong class="mt-3 block text-[26px] font-semibold text-app-text">{report.summary.unansweredClosed}</strong>
        <span class="application-text-caption text-app-text-muted">Encerrados sem resposta humana</span>
      </button>
      <button type="button" on:click={showAbandoned}
        class="rounded-2xl border border-app-border bg-app-surface p-4 text-left hover:border-app-primary">
        <UserRoundX size={20} class="text-app-warning-text"/>
        <strong class="mt-3 block text-[26px] font-semibold text-app-text">{report.summary.abandonedAfterWait}</strong>
        <span class="application-text-caption text-app-text-muted">Cliente encerrou após longa espera</span>
      </button>
    </div>

    <div class="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
      <article class="rounded-2xl border border-app-border bg-app-surface p-4">
        <Clock3 size={19} class="text-app-primary"/>
        <strong class="mt-2 block text-[21px] text-app-text">{formatMinutes(report.summary.longestWaitingMinutes)}</strong>
        <p class="application-text-caption text-app-text-muted">Maior espera atual</p>
      </article>
      <article class="rounded-2xl border border-app-border bg-app-surface p-4">
        <CheckCircle2 size={19} class="text-app-success-text"/>
        <strong class="mt-2 block text-[21px] text-app-text">{report.summary.answered} / {report.summary.received}</strong>
        <p class="application-text-caption text-app-text-muted">Com resposta humana / solicitados</p>
      </article>
      <article class="rounded-2xl border border-app-border bg-app-surface p-4">
        <Clock3 size={19} class="text-app-info-text"/>
        <strong class="mt-2 block text-[21px] text-app-text">{formatMinutes(report.summary.medianFirstMinutes)}</strong>
        <p class="application-text-caption text-app-text-muted">Mediana 1ª resposta</p>
      </article>
      <article class="rounded-2xl border border-app-border bg-app-surface p-4">
        <Clock3 size={19} class="text-app-warning-text"/>
        <strong class="mt-2 block text-[21px] text-app-text">{formatMinutes(report.summary.p90FirstMinutes)}</strong>
        <p class="application-text-caption text-app-text-muted">P90 1ª resposta ({report.summary.firstResponseSamples})</p>
      </article>
      <article class="rounded-2xl border border-app-border bg-app-surface p-4">
        <AlertTriangle size={19} class="text-app-warning-text"/>
        <strong class="mt-2 block text-[21px] text-app-text">{report.summary.lateFirstResponses}</strong>
        <p class="application-text-caption text-app-text-muted">1ª resposta acima do limite</p>
      </article>
    </div>

    <section class="rounded-2xl border border-app-border bg-app-surface">
      <div class="flex flex-wrap items-center justify-between gap-2 border-b border-app-border px-4 py-4 sm:px-5">
        <div>
          <h3 class="text-[15px] font-semibold text-app-text">Conversas para acompanhar</h3>
          <p class="application-text-caption mt-1 text-app-text-muted">
            {report.listTotal} conversa(s) no filtro · clique para ver o histórico
          </p>
        </div>
        <select bind:value={view} on:change={handleFilterChange}
          aria-label="Filtrar situação do chat"
          class="application-text-caption min-h-10 rounded-xl border border-app-border-control bg-app-surface px-3 text-app-text">
          <option value="all">Todas as situações</option>
          <option value="waiting">Aguardando</option>
          <option value="late">Espera acima do limite</option>
          <option value="unanswered">Encerradas sem resposta</option>
          <option value="abandoned">Encerradas pelo cliente após espera</option>
        </select>
      </div>
      {#if report.items.length === 0}
        <p role="status" class="application-text-caption px-5 py-8 text-center text-app-text-soft">
          Nenhuma conversa encontrada.
        </p>
      {:else}
        <div class="divide-y divide-app-border-soft">
          {#each report.items as item (item.id)}
            <a href={`/app/chat/${item.id}`}
              class="flex flex-wrap items-center gap-3 px-4 py-3.5 transition hover:bg-app-muted sm:px-5">
              <span class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-app-info-bg text-app-primary">
                <MessageCircle size={18}/>
              </span>
              <span class="min-w-0 flex-1">
                <strong class="application-text-caption block font-semibold text-app-text">
                  Chat #{item.number} · {item.queueName}
                </strong>
                <span class="application-text-meta mt-0.5 block text-app-text-muted">
                  {statusLabel(item)} · {item.agentName ?? "Sem responsável"}
                </span>
                <span class="application-text-meta block text-app-text-soft">{formatDate(item.createdAt)}</span>
              </span>
              <span class="text-right">
                <strong class={`block text-[13px] font-semibold ${item.overdue && item.waitingSince ? "text-app-warning-text" : "text-app-text"}`}>
                  {item.waitingMinutes === null ? "—" : formatMinutes(item.waitingMinutes)}
                </strong>
                <span class="application-text-meta block text-app-text-soft">
                  {item.waitingSince ? "Aguardando" : item.firstResponseMinutes !== null ? "Tempo até resposta/espera" : "Espera total"}
                </span>
              </span>
              <ArrowUpRight size={17} class="shrink-0 text-app-text-soft"/>
            </a>
          {/each}
        </div>
      {/if}
      {#if report.pageCount > 1}
        <div class="flex items-center justify-between gap-3 border-t border-app-border-soft px-5 py-3">
          <span class="application-text-meta text-app-text-soft">
            Página {report.page} de {report.pageCount}
          </span>
          <div class="flex gap-2">
            <button type="button" on:click={previousPage} disabled={loading || page <= 1}
              class="application-text-caption min-h-9 rounded-lg border border-app-border-control px-3 font-semibold text-app-primary disabled:opacity-40">
              Anterior
            </button>
            <button type="button" on:click={nextPage} disabled={loading || page >= report.pageCount}
              class="application-text-caption min-h-9 rounded-lg border border-app-border-control px-3 font-semibold text-app-primary disabled:opacity-40">
              Próxima
            </button>
          </div>
        </div>
      {/if}
    </section>

    <section class="rounded-2xl border border-app-border bg-app-surface">
      <div class="border-b border-app-border px-4 py-4 sm:px-5">
        <h3 class="text-[15px] font-semibold text-app-text">Por operador</h3>
        <p class="application-text-caption mt-1 text-app-text-muted">
          Atribuídos no momento, tempo após a atribuição e chats aguardando.
        </p>
      </div>
      <div class="overflow-x-auto">
        <table class="w-full min-w-[720px] border-collapse text-left">
          <thead class="application-text-meta bg-app-subtle font-semibold text-app-text-soft">
            <tr>
              <th class="px-5 py-3">Operador</th>
              <th class="px-3 py-3">Abertos agora</th>
              <th class="px-3 py-3">Atribuídos no período</th>
              <th class="px-3 py-3">Respondidos</th>
              <th class="px-3 py-3">Aguardando</th>
              <th class="px-3 py-3">Atraso após atribuição</th>
              <th class="px-3 py-3">Mediana após atribuição</th>
              <th class="px-3 py-3">P90 após atribuição</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-app-border-soft">
            {#each report.agents as agent (agent.id)}
              <tr class="application-text-caption text-app-text-muted">
                <td class="px-5 py-3 font-semibold text-app-text"><span class={`mr-2 inline-block h-2 w-2 rounded-full ${agent.presence === "online" ? "bg-emerald-600" : agent.presence === "busy" || agent.presence === "away" ? "bg-amber-500" : "bg-slate-400"}`} title={agent.presence ?? "offline"}></span>{agent.name}</td>
                <td class="px-3 py-3 font-semibold">{agent.active}</td>
                <td class="px-3 py-3">{agent.assigned}</td>
                <td class="px-3 py-3">{agent.responded}</td>
                <td class="px-3 py-3">{agent.waiting}</td>
                <td class={`px-3 py-3 font-semibold ${agent.late > 0 ? "text-app-warning-text" : ""}`}>{agent.late}</td>
                <td class="px-3 py-3">{formatMinutes(agent.medianFirstMinutes)}</td>
                <td class="px-3 py-3">{formatMinutes(agent.p90FirstMinutes)}</td>
              </tr>
            {:else}
              <tr><td colspan="8" class="application-text-caption px-5 py-5 text-app-text-soft">Sem atendimentos atribuídos.</td></tr>
            {/each}
          </tbody>
        </table>
      </div>
    </section>

    <p class="application-text-meta px-1 leading-5 text-app-text-soft">
      Tempos em minutos corridos, inclusive fora do expediente. O limite considera o SLA da fila quando ativo; caso contrário, 10 minutos de atenção operacional.
      Encerramento pelo cliente após o limite é um indício de abandono, não prova da motivação.
      Sessões antigas sem identidade continuam sujeitas à expiração. Chats autenticados permanecem abertos até o encerramento.
      Indicadores individuais só consideram o tempo após atribuição registrada; para chats antigos sem esse registro, o valor é exibido como indisponível.
    </p>
  {:else if loading}
    <div role="status" class="flex items-center justify-center gap-3 rounded-2xl border border-app-border bg-app-surface px-5 py-12 text-[13px] text-app-text-muted">
      <RefreshCw size={18} class="animate-spin"/> Carregando indicadores de chat...
    </div>
  {/if}
</section>
