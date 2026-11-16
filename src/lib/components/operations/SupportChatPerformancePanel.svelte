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
    queueId = "all";
    userId = "all";
    void refresh();
  }

  function updateQueue(): void {
    userId = "all";
    void refresh();
  }

  function handleFilterChange(): void {
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
    view = next;
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
  <div class="rounded-2xl border border-[#DDE2EA] bg-white p-4 sm:p-5">
    <div class="flex flex-wrap items-start justify-between gap-3">
      <div>
        <h2 class="flex items-center gap-2 text-[16px] font-semibold text-[#18233D]">
          <MessageCircle size={19} class="text-[#000A57]"/> Atendimento por chat
        </h2>
        <p class="application-text-caption mt-1 text-[#747D8F]">
          Espera dos clientes, atendimentos sem resposta e desempenho por fila.
        </p>
      </div>
      <button type="button" disabled={loading} on:click={() => void refresh()}
        aria-label="Atualizar indicadores de chat"
        title="Atualizar indicadores de chat"
        class="flex h-10 w-10 items-center justify-center rounded-xl border border-[#DDE2EA] text-[#000A57] disabled:opacity-50">
        <RefreshCw size={18} class={loading ? "animate-spin" : ""}/>
      </button>
    </div>

    <div class="mt-4 flex flex-wrap gap-2">
      <select bind:value={periodDays} on:change={handleFilterChange}
        aria-label="Período dos chats"
        class="application-text-caption min-h-10 rounded-xl border border-[#DDE2EA] bg-white px-3 text-[#263249]">
        <option value={7}>7 dias</option>
        <option value={30}>30 dias</option>
        <option value={90}>90 dias</option>
      </select>
      <select bind:value={department} on:change={updateDepartment}
        aria-label="Canal dos chats"
        class="application-text-caption min-h-10 rounded-xl border border-[#DDE2EA] bg-white px-3 text-[#263249]">
        <option value="all">Todos os canais</option>
        <option value="support">Suporte</option>
        <option value="finance">Financeiro</option>
      </select>
      <select bind:value={queueId} on:change={updateQueue}
        aria-label="Fila dos chats"
        class="application-text-caption min-h-10 min-w-[140px] max-w-full rounded-xl border border-[#DDE2EA] bg-white px-3 text-[#263249]">
        <option value="all">Todas as filas</option>
        {#each selectableQueues as queue (queue.id)}
          <option value={queue.id}>{queue.name}</option>
        {/each}
      </select>
      <select bind:value={userId} on:change={handleFilterChange}
        aria-label="Operador dos chats"
        class="application-text-caption min-h-10 min-w-[150px] rounded-xl border border-[#DDE2EA] bg-white px-3 text-[#263249]">
        <option value="all">Todos os operadores</option>
        {#each report?.users ?? [] as operator (operator.id)}
          <option value={operator.id}>{operator.name}</option>
        {/each}
      </select>
    </div>

    {#if errorMessage}
      <p role="alert" class="application-text-caption mt-3 rounded-lg bg-[#FFF2EF] px-3 py-2 text-[#AB493E]">
        {errorMessage}
      </p>
    {/if}
    {#if report?.truncated}
      <p role="status" class="application-text-caption mt-3 rounded-lg bg-[#FFF7E9] px-3 py-2 text-[#886228]">
        Há mais de 10.000 conversas no recorte. Reduza o período para obter totais completos.
      </p>
    {/if}
    {#if report}
      <p class="application-text-meta mt-3 text-[#8E96A4]">
        Atualizado às {formatDate(report.generatedAt)} · Atualização automática a cada 30 segundos
      </p>
    {/if}
  </div>

  {#if report}
    <div class="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      <button type="button" on:click={showWaiting}
        class="rounded-2xl border border-[#E2E5ED] bg-white p-4 text-left hover:border-[#AAB8DC]">
        <Users size={20} class="text-[#000A57]"/>
        <strong class="mt-3 block text-[26px] font-semibold text-[#11182C]">{report.summary.waiting}</strong>
        <span class="application-text-caption text-[#747D8F]">Chats aguardando resposta</span>
      </button>
      <button type="button" on:click={showLate}
        class="rounded-2xl border border-[#F0DACA] bg-white p-4 text-left hover:border-[#E1AD8B]">
        <AlertTriangle size={20} class="text-[#B35A2E]"/>
        <strong class="mt-3 block text-[26px] font-semibold text-[#A34B25]">{report.summary.late}</strong>
        <span class="application-text-caption text-[#747D8F]">Espera acima do limite</span>
      </button>
      <button type="button" on:click={showUnanswered}
        class="rounded-2xl border border-[#E2E5ED] bg-white p-4 text-left hover:border-[#AAB8DC]">
        <Headphones size={20} class="text-[#5D55A1]"/>
        <strong class="mt-3 block text-[26px] font-semibold text-[#11182C]">{report.summary.unansweredClosed}</strong>
        <span class="application-text-caption text-[#747D8F]">Encerrados sem resposta humana</span>
      </button>
      <button type="button" on:click={showAbandoned}
        class="rounded-2xl border border-[#E2E5ED] bg-white p-4 text-left hover:border-[#AAB8DC]">
        <UserRoundX size={20} class="text-[#B35A2E]"/>
        <strong class="mt-3 block text-[26px] font-semibold text-[#11182C]">{report.summary.abandonedAfterWait}</strong>
        <span class="application-text-caption text-[#747D8F]">Cliente encerrou após longa espera</span>
      </button>
    </div>

    <div class="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
      <article class="rounded-2xl border border-[#E2E5ED] bg-white p-4">
        <Clock3 size={19} class="text-[#000A57]"/>
        <strong class="mt-2 block text-[21px] text-[#11182C]">{formatMinutes(report.summary.longestWaitingMinutes)}</strong>
        <p class="application-text-caption text-[#747D8F]">Maior espera atual</p>
      </article>
      <article class="rounded-2xl border border-[#E2E5ED] bg-white p-4">
        <CheckCircle2 size={19} class="text-[#378558]"/>
        <strong class="mt-2 block text-[21px] text-[#11182C]">{report.summary.answered} / {report.summary.received}</strong>
        <p class="application-text-caption text-[#747D8F]">Com resposta humana / solicitados</p>
      </article>
      <article class="rounded-2xl border border-[#E2E5ED] bg-white p-4">
        <Clock3 size={19} class="text-[#5D55A1]"/>
        <strong class="mt-2 block text-[21px] text-[#11182C]">{formatMinutes(report.summary.medianFirstMinutes)}</strong>
        <p class="application-text-caption text-[#747D8F]">Mediana 1ª resposta</p>
      </article>
      <article class="rounded-2xl border border-[#E2E5ED] bg-white p-4">
        <Clock3 size={19} class="text-[#B35A2E]"/>
        <strong class="mt-2 block text-[21px] text-[#11182C]">{formatMinutes(report.summary.p90FirstMinutes)}</strong>
        <p class="application-text-caption text-[#747D8F]">P90 1ª resposta ({report.summary.firstResponseSamples})</p>
      </article>
      <article class="rounded-2xl border border-[#E2E5ED] bg-white p-4">
        <AlertTriangle size={19} class="text-[#B35A2E]"/>
        <strong class="mt-2 block text-[21px] text-[#11182C]">{report.summary.lateFirstResponses}</strong>
        <p class="application-text-caption text-[#747D8F]">1ª resposta acima do limite</p>
      </article>
    </div>

    <section class="rounded-2xl border border-[#E2E5ED] bg-white">
      <div class="flex flex-wrap items-center justify-between gap-2 border-b border-[#E2E5ED] px-4 py-4 sm:px-5">
        <div>
          <h3 class="text-[15px] font-semibold text-[#18233D]">Conversas para acompanhar</h3>
          <p class="application-text-caption mt-1 text-[#747D8F]">
            {report.listTotal} conversa(s) no filtro · clique para ver o histórico
          </p>
        </div>
        <select bind:value={view} on:change={handleFilterChange}
          aria-label="Filtrar situação do chat"
          class="application-text-caption min-h-10 rounded-xl border border-[#DDE2EA] bg-white px-3 text-[#263249]">
          <option value="all">Todas as situações</option>
          <option value="waiting">Aguardando</option>
          <option value="late">Espera acima do limite</option>
          <option value="unanswered">Encerradas sem resposta</option>
          <option value="abandoned">Encerradas pelo cliente após espera</option>
        </select>
      </div>
      {#if report.items.length === 0}
        <p role="status" class="application-text-caption px-5 py-8 text-center text-[#8A93A3]">
          Nenhuma conversa encontrada.
        </p>
      {:else}
        <div class="divide-y divide-[#ECEEF4]">
          {#each report.items as item (item.id)}
            <a href={`/app/chat/${item.id}`}
              class="flex flex-wrap items-center gap-3 px-4 py-3.5 transition hover:bg-[#F8F9FC] sm:px-5">
              <span class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#F0F2F9] text-[#000A57]">
                <MessageCircle size={18}/>
              </span>
              <span class="min-w-0 flex-1">
                <strong class="application-text-caption block font-semibold text-[#18233D]">
                  Chat #{item.number} · {item.queueName}
                </strong>
                <span class="application-text-meta mt-0.5 block text-[#747D8F]">
                  {statusLabel(item)} · {item.agentName ?? "Sem responsável"}
                </span>
                <span class="application-text-meta block text-[#939BA9]">{formatDate(item.createdAt)}</span>
              </span>
              <span class="text-right">
                <strong class={`block text-[13px] font-semibold ${item.overdue && item.waitingSince ? "text-[#A34B25]" : "text-[#35415A]"}`}>
                  {item.waitingMinutes === null ? "—" : formatMinutes(item.waitingMinutes)}
                </strong>
                <span class="application-text-meta block text-[#939BA9]">
                  {item.waitingSince ? "Aguardando" : item.firstResponseMinutes !== null ? "Tempo até resposta/espera" : "Espera total"}
                </span>
              </span>
              <ArrowUpRight size={17} class="shrink-0 text-[#929BAB]"/>
            </a>
          {/each}
        </div>
      {/if}
      {#if report.listTotal > report.items.length}
        <p class="application-text-meta border-t border-[#ECEEF4] px-5 py-3 text-[#858D9C]">
          Exibindo as {report.items.length} conversas prioritárias. Use filtros para detalhar outras.
        </p>
      {/if}
    </section>

    <section class="rounded-2xl border border-[#E2E5ED] bg-white">
      <div class="border-b border-[#E2E5ED] px-4 py-4 sm:px-5">
        <h3 class="text-[15px] font-semibold text-[#18233D]">Por operador</h3>
        <p class="application-text-caption mt-1 text-[#747D8F]">
          Atribuídos no momento, tempo após a atribuição e chats aguardando.
        </p>
      </div>
      <div class="overflow-x-auto">
        <table class="w-full min-w-[720px] border-collapse text-left">
          <thead class="application-text-meta bg-[#FAFAFC] font-semibold text-[#858B99]">
            <tr>
              <th class="px-5 py-3">Operador</th>
              <th class="px-3 py-3">Atribuídos</th>
              <th class="px-3 py-3">Respondidos</th>
              <th class="px-3 py-3">Aguardando</th>
              <th class="px-3 py-3">Atraso após atribuição</th>
              <th class="px-3 py-3">Mediana após atribuição</th>
              <th class="px-3 py-3">P90 após atribuição</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-[#EEF0F5]">
            {#each report.agents as agent (agent.id)}
              <tr class="application-text-caption text-[#515C70]">
                <td class="px-5 py-3 font-semibold text-[#29364E]">{agent.name}</td>
                <td class="px-3 py-3">{agent.assigned}</td>
                <td class="px-3 py-3">{agent.responded}</td>
                <td class="px-3 py-3">{agent.waiting}</td>
                <td class={`px-3 py-3 font-semibold ${agent.late > 0 ? "text-[#B14C32]" : ""}`}>{agent.late}</td>
                <td class="px-3 py-3">{formatMinutes(agent.medianFirstMinutes)}</td>
                <td class="px-3 py-3">{formatMinutes(agent.p90FirstMinutes)}</td>
              </tr>
            {:else}
              <tr><td colspan="7" class="application-text-caption px-5 py-5 text-[#8A93A3]">Sem atendimentos atribuídos.</td></tr>
            {/each}
          </tbody>
        </table>
      </div>
    </section>

    <p class="application-text-meta px-1 leading-5 text-[#8C94A2]">
      Tempos em minutos corridos, inclusive fora do expediente. O limite considera o SLA da fila quando ativo; caso contrário, 10 minutos de atenção operacional.
      Encerramento pelo cliente após o limite é um indício de abandono, não prova da motivação.
      Sessões expiradas ficam separadas. Conversas ainda abertas anteriores ao período também entram no monitoramento atual.
      Indicadores individuais só consideram o tempo após atribuição registrada; para chats antigos sem esse registro, o valor é exibido como indisponível.
    </p>
  {:else if loading}
    <div role="status" class="flex items-center justify-center gap-3 rounded-2xl border border-[#E2E5ED] bg-white px-5 py-12 text-[13px] text-[#747D8F]">
      <RefreshCw size={18} class="animate-spin"/> Carregando indicadores de chat...
    </div>
  {/if}
</section>
