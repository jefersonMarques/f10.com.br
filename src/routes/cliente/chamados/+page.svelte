<script lang="ts">
  import {
    ArrowRight,
    ChevronLeft,
    ChevronRight,
    Clock3,
    Inbox,
    LayoutGrid,
    List,
    Search,
    SlidersHorizontal,
    X,
  } from "lucide-svelte";
  import ApplicationContent from "$lib/components/application/ApplicationContent.svelte";
  import type { PageData } from "./$types";

  export let data: PageData;

  const statusLabels: Record<string, string> = {
    new: "Aguardando atendimento",
    open: "Aberto",
    in_progress: "Em atendimento",
    waiting_customer: "Aguardando você",
    resolved: "Resolvido",
    closed: "Fechado",
  };

  const priorityLabels: Record<string, string> = {
    low: "Baixa",
    normal: "Normal",
    high: "Alta",
    urgent: "Urgente",
  };

  let filterKey = "";
  let groupValue = "all";
  let unitValue = "all";

  $: nextFilterKey = `${data.filters.groupId ?? "all"}:${data.filters.unitId ?? "all"}`;
  $: if (nextFilterKey !== filterKey) {
    filterKey = nextFilterKey;
    groupValue = data.filters.groupId === null ? "all" : String(data.filters.groupId);
    unitValue = data.filters.unitId === null ? "all" : String(data.filters.unitId);
  }
  $: selectedGroup = groupValue === "all"
    ? null
    : data.groups.find((group) => group.grupo_id === Number(groupValue)) ?? null;
  $: availableUnits = selectedGroup?.unidades ?? [];
  $: hasActiveFilters = Boolean(
    data.filters.unitId !== null ||
      data.filters.status !== null ||
      data.filters.priority !== null ||
      data.filters.period !== "all" ||
      data.filters.search ||
      (data.groups.length > 1 && data.filters.groupId === null),
  );
  $: firstVisible = data.total === 0 ? 0 : (data.page - 1) * data.pageSize + 1;
  $: lastVisible = Math.min(data.page * data.pageSize, data.total);

  function handleGroupChange(event: Event): void {
    groupValue = (event.currentTarget as HTMLSelectElement).value;
    unitValue = "all";
  }

  function formatDate(value: Date | string | null): string {
    if (!value) return "";
    const date = new Date(value);
    return new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" }).format(date);
  }

  function slaLabel(ticket: PageData["tickets"][number]): string {
    if (ticket.status === "resolved" || ticket.status === "closed") return "Concluído";
    const due = ticket.firstResponseAt ? ticket.resolutionDueAt : ticket.firstResponseDueAt;
    if (!due) return "Em acompanhamento";
    const difference = new Date(due).getTime() - Date.now();
    if (difference < 0) return "Prazo excedido";
    const hours = Math.max(1, Math.ceil(difference / 3_600_000));
    return hours < 24 ? `${hours}h restantes` : `${Math.ceil(hours / 24)}d restantes`;
  }

  function statusClass(status: string): string {
    if (status === "waiting_customer") return "bg-[#FFF4E8] text-[#9A541A]";
    if (status === "resolved" || status === "closed") return "bg-[#EEF5F0] text-[#47705A]";
    if (status === "in_progress") return "bg-[#EEF0FF] text-[#303C91]";
    return "bg-[#F1F3F7] text-[#626A7B]";
  }

  function priorityClass(priority: string): string {
    if (priority === "urgent") return "bg-[#FFF0ED] text-[#A04435]";
    if (priority === "high") return "bg-[#FFF4E8] text-[#9A541A]";
    return "bg-[#F4F5F8] text-[#6A7180]";
  }

  function buildListHref(options: { view?: "cards" | "table"; page?: number } = {}): string {
    const params = new URLSearchParams();
    params.set("groupId", data.filters.groupId === null ? "all" : String(data.filters.groupId));
    if (data.filters.unitId !== null) params.set("unitId", String(data.filters.unitId));
    if (data.filters.status) params.set("status", data.filters.status);
    if (data.filters.priority) params.set("priority", data.filters.priority);
    if (data.filters.period !== "all") params.set("period", data.filters.period);
    if (data.filters.search) params.set("q", data.filters.search);
    params.set("view", options.view ?? data.filters.view);
    const targetPage = options.page ?? data.page;
    if (targetPage > 1) params.set("page", String(targetPage));
    return `/cliente/chamados?${params.toString()}`;
  }
</script>

<svelte:head><title>Meus chamados | F10 Software</title></svelte:head>

<ApplicationContent width="wide">
  <section class="mb-4 rounded-[22px] border border-[#E1E4EC] bg-white p-4 shadow-[0_8px_28px_rgba(1,13,40,0.035)] sm:p-5">
    <div class="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
      <div>
        <p class="application-text-caption font-bold uppercase tracking-[0.1em] text-[#EA6D0B]">Central de suporte</p>
        <h2 class="mt-1 text-[20px] font-semibold tracking-[-0.03em] text-[#202737]">Consulte seus chamados</h2>
        <p class="application-text-meta mt-1 text-[#858C9C]">Filtre por grupo, escola, situação, prioridade ou período sem trocar o contexto da sua sessão.</p>
      </div>
      <a href="/ajuda-f10" class="inline-flex min-h-10 shrink-0 items-center justify-center rounded-xl border border-[#DDE1E9] px-4 text-[11px] font-semibold text-[#000A57] hover:bg-[#F8F9FC]">Consultar Central de Ajuda</a>
    </div>

    <form method="GET" class="mt-5 border-t border-[#ECEEF3] pt-4">
      <input type="hidden" name="view" value={data.filters.view} />
      <div class="grid gap-3 md:grid-cols-2 xl:grid-cols-6">
        <label class="md:col-span-2 xl:col-span-2">
          <span class="application-text-caption font-semibold text-[#596172]">Buscar chamado</span>
          <div class="relative mt-1.5">
            <Search size={15} class="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[#8E95A4]" />
            <input
              name="q"
              type="search"
              maxlength="120"
              value={data.filters.search}
              placeholder="Número ou assunto"
              class="application-text-control h-11 w-full rounded-xl border border-[#DDE1E9] bg-white pl-10 pr-3 outline-none focus:border-[#000A57] focus:ring-4 focus:ring-[#000A57]/10"
            />
          </div>
        </label>

        {#if data.groups.length > 1}
          <label>
            <span class="application-text-caption font-semibold text-[#596172]">Grupo</span>
            <select
              name="groupId"
              bind:value={groupValue}
              on:change={handleGroupChange}
              class="application-text-control mt-1.5 h-11 w-full rounded-xl border border-[#DDE1E9] bg-white px-3 outline-none focus:border-[#000A57]"
            >
              <option value="all">Todos os grupos</option>
              {#each data.groups as group}
                <option value={String(group.grupo_id)}>{group.grupo}</option>
              {/each}
            </select>
          </label>
        {:else if data.groups[0]}
          <input type="hidden" name="groupId" value={data.groups[0].grupo_id} />
        {/if}

        <label>
          <span class="application-text-caption font-semibold text-[#596172]">Escola</span>
          <select
            name="unitId"
            bind:value={unitValue}
            disabled={!selectedGroup}
            class="application-text-control mt-1.5 h-11 w-full rounded-xl border border-[#DDE1E9] bg-white px-3 outline-none disabled:bg-[#F5F6F8] disabled:text-[#A1A6B0] focus:border-[#000A57]"
          >
            <option value="all">{selectedGroup ? "Todas as escolas" : "Selecione um grupo"}</option>
            {#each availableUnits as unit}
              <option value={String(unit.unidade_id)}>{unit.unidade}</option>
            {/each}
          </select>
        </label>

        <label>
          <span class="application-text-caption font-semibold text-[#596172]">Status</span>
          <select name="status" class="application-text-control mt-1.5 h-11 w-full rounded-xl border border-[#DDE1E9] bg-white px-3 outline-none focus:border-[#000A57]">
            <option value="" selected={data.filters.status === null}>Todos</option>
            {#each Object.entries(statusLabels) as [value, label]}
              <option value={value} selected={data.filters.status === value}>{label}</option>
            {/each}
          </select>
        </label>

        <label>
          <span class="application-text-caption font-semibold text-[#596172]">Prioridade</span>
          <select name="priority" class="application-text-control mt-1.5 h-11 w-full rounded-xl border border-[#DDE1E9] bg-white px-3 outline-none focus:border-[#000A57]">
            <option value="" selected={data.filters.priority === null}>Todas</option>
            {#each Object.entries(priorityLabels) as [value, label]}
              <option value={value} selected={data.filters.priority === value}>{label}</option>
            {/each}
          </select>
        </label>
      </div>

      <div class="mt-3 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <label class="sm:w-[210px]">
          <span class="application-text-caption font-semibold text-[#596172]">Período de abertura</span>
          <select name="period" class="application-text-control mt-1.5 h-11 w-full rounded-xl border border-[#DDE1E9] bg-white px-3 outline-none focus:border-[#000A57]">
            <option value="all" selected={data.filters.period === "all"}>Todo o período</option>
            <option value="7d" selected={data.filters.period === "7d"}>Últimos 7 dias</option>
            <option value="30d" selected={data.filters.period === "30d"}>Últimos 30 dias</option>
            <option value="90d" selected={data.filters.period === "90d"}>Últimos 90 dias</option>
          </select>
        </label>
        <div class="flex flex-wrap items-center gap-2">
          <a href={`/cliente/chamados?view=${data.filters.view}`} class="inline-flex min-h-11 items-center gap-2 rounded-xl px-3 text-[11px] font-semibold text-[#6B7280] hover:bg-[#F5F6F8] hover:text-[#000A57]"><X size={14} />Limpar filtros</a>
          <button type="submit" class="inline-flex min-h-11 items-center gap-2 rounded-xl bg-[#000A57] px-5 text-[11px] font-semibold text-white hover:bg-[#111B71]"><SlidersHorizontal size={14} />Aplicar filtros</button>
        </div>
      </div>
    </form>
  </section>

  <div class="mb-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
    <div>
      <p class="text-[13px] font-semibold text-[#303746]">{data.total} {data.total === 1 ? "chamado encontrado" : "chamados encontrados"}</p>
      {#if data.total > 0}
        <p class="application-text-meta mt-0.5 text-[#9298A5]">Exibindo {firstVisible}–{lastVisible} de {data.total}</p>
      {/if}
    </div>
    <div class="inline-flex w-fit rounded-xl border border-[#DDE1E9] bg-white p-1">
      <a
        href={buildListHref({ view: "cards", page: 1 })}
        aria-label="Visualizar chamados em cards"
        class={`inline-flex min-h-9 items-center gap-2 rounded-lg px-3 text-[11px] font-semibold ${data.filters.view === "cards" ? "bg-[#000A57] text-white" : "text-[#6B7280] hover:text-[#000A57]"}`}
      ><LayoutGrid size={14} />Cards</a>
      <a
        href={buildListHref({ view: "table", page: 1 })}
        aria-label="Visualizar chamados em tabela"
        class={`inline-flex min-h-9 items-center gap-2 rounded-lg px-3 text-[11px] font-semibold ${data.filters.view === "table" ? "bg-[#000A57] text-white" : "text-[#6B7280] hover:text-[#000A57]"}`}
      ><List size={14} />Tabela</a>
    </div>
  </div>

  {#if data.tickets.length === 0}
    <section class="rounded-[22px] border border-dashed border-[#CBD1DE] bg-white px-6 py-12 text-center">
      <Inbox size={30} class="mx-auto text-[#9BA1AE]" />
      <h2 class="mt-4 text-[17px] font-semibold text-[#303746]">{hasActiveFilters ? "Nenhum chamado com estes filtros" : "Nenhum chamado encontrado"}</h2>
      <p class="mx-auto mt-2 max-w-[520px] text-[11px] leading-5 text-[#777E8D]">
        {hasActiveFilters ? "Ajuste os filtros para ampliar a consulta." : "Quando você iniciar um atendimento com este e-mail, o chamado aparecerá aqui."}
      </p>
      {#if hasActiveFilters}
        <a href={`/cliente/chamados?view=${data.filters.view}`} class="mt-5 inline-flex min-h-11 items-center justify-center rounded-xl border border-[#DDE1E9] bg-white px-5 text-[11px] font-semibold text-[#000A57]">Limpar filtros</a>
      {:else}
        <a href="/ajuda-f10" class="mt-5 inline-flex min-h-11 items-center justify-center rounded-xl bg-[#000A57] px-5 text-[11px] font-semibold text-white">Ir para a Central de Ajuda</a>
      {/if}
    </section>
  {:else}
    <div class={data.filters.view === "cards" ? "space-y-3" : "space-y-3 md:hidden"}>
      {#each data.tickets as ticket}
        <a href={`/cliente/chamados/${ticket.id}`} class="group block rounded-[22px] border border-[#E1E4EC] bg-white p-5 shadow-[0_8px_28px_rgba(1,13,40,0.035)] transition hover:border-[#C8CEDB] hover:shadow-[0_12px_32px_rgba(1,13,40,0.07)]">
          <div class="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div class="min-w-0 flex-1">
              <div class="flex flex-wrap items-center gap-2">
                <span class="application-text-meta font-bold uppercase tracking-[0.08em] text-[#EA6D0B]">Chamado #{ticket.ticketNumber}</span>
                <span class={`application-text-meta rounded-full px-2.5 py-1 font-semibold ${statusClass(ticket.status)}`}>{statusLabels[ticket.status] ?? ticket.status}</span>
                <span class={`application-text-meta rounded-full px-2.5 py-1 font-semibold ${priorityClass(ticket.priority)}`}>{priorityLabels[ticket.priority] ?? ticket.priority}</span>
              </div>
              <h2 class="mt-2 truncate text-[15px] font-semibold text-[#252C3D] group-hover:text-[#000A57]">{ticket.subject}</h2>
              {#if ticket.context}
                <p class="application-text-meta mt-1.5 truncate text-[#737B8B]">{ticket.context.groupName} · {ticket.context.unitName}</p>
              {/if}
              <p class="application-text-meta mt-1 text-[#9298A5]">Atualizado {formatDate(ticket.updatedAt)}</p>
            </div>
            <div class="flex shrink-0 items-center justify-between gap-4 sm:justify-end">
              <span class={`application-text-meta inline-flex items-center gap-1.5 font-semibold ${slaLabel(ticket) === "Prazo excedido" ? "text-[#A44E3B]" : "text-[#687083]"}`}><Clock3 size={13} />{slaLabel(ticket)}</span>
              <ArrowRight size={17} class="text-[#000A57]" />
            </div>
          </div>
        </a>
      {/each}
    </div>

    {#if data.filters.view === "table"}
      <div class="hidden overflow-hidden rounded-[22px] border border-[#E1E4EC] bg-white shadow-[0_8px_28px_rgba(1,13,40,0.035)] md:block">
        <div class="overflow-x-auto">
          <table class="w-full min-w-[980px] border-collapse text-left">
            <thead class="bg-[#F8F9FB]">
              <tr class="border-b border-[#E7E9EF]">
                <th class="px-4 py-3 text-[10px] font-bold uppercase tracking-[0.08em] text-[#7C8494]">Chamado</th>
                <th class="px-4 py-3 text-[10px] font-bold uppercase tracking-[0.08em] text-[#7C8494]">Assunto</th>
                <th class="px-4 py-3 text-[10px] font-bold uppercase tracking-[0.08em] text-[#7C8494]">Grupo / Escola</th>
                <th class="px-4 py-3 text-[10px] font-bold uppercase tracking-[0.08em] text-[#7C8494]">Status</th>
                <th class="px-4 py-3 text-[10px] font-bold uppercase tracking-[0.08em] text-[#7C8494]">Prioridade</th>
                <th class="px-4 py-3 text-[10px] font-bold uppercase tracking-[0.08em] text-[#7C8494]">Atualização</th>
                <th class="px-4 py-3 text-[10px] font-bold uppercase tracking-[0.08em] text-[#7C8494]">SLA</th>
              </tr>
            </thead>
            <tbody>
              {#each data.tickets as ticket}
                <tr class="border-b border-[#EEF0F4] last:border-b-0 hover:bg-[#FBFBFD]">
                  <td class="px-4 py-3"><a href={`/cliente/chamados/${ticket.id}`} class="text-[11px] font-bold text-[#EA6D0B] hover:underline">#{ticket.ticketNumber}</a></td>
                  <td class="max-w-[300px] px-4 py-3"><a href={`/cliente/chamados/${ticket.id}`} class="block truncate text-[12px] font-semibold text-[#2D3444] hover:text-[#000A57]">{ticket.subject}</a></td>
                  <td class="max-w-[260px] px-4 py-3"><span class="block truncate text-[11px] text-[#687083]">{ticket.context ? `${ticket.context.groupName} · ${ticket.context.unitName}` : "Contexto não informado"}</span></td>
                  <td class="px-4 py-3"><span class={`application-text-meta whitespace-nowrap rounded-full px-2.5 py-1 font-semibold ${statusClass(ticket.status)}`}>{statusLabels[ticket.status] ?? ticket.status}</span></td>
                  <td class="px-4 py-3"><span class={`application-text-meta whitespace-nowrap rounded-full px-2.5 py-1 font-semibold ${priorityClass(ticket.priority)}`}>{priorityLabels[ticket.priority] ?? ticket.priority}</span></td>
                  <td class="px-4 py-3 text-[11px] whitespace-nowrap text-[#7A8292]">{formatDate(ticket.updatedAt)}</td>
                  <td class={`px-4 py-3 text-[11px] font-semibold whitespace-nowrap ${slaLabel(ticket) === "Prazo excedido" ? "text-[#A44E3B]" : "text-[#687083]"}`}>{slaLabel(ticket)}</td>
                </tr>
              {/each}
            </tbody>
          </table>
        </div>
      </div>
    {/if}
  {/if}

  {#if data.totalPages > 1}
    <nav class="mt-5 flex items-center justify-between rounded-[18px] border border-[#E1E4EC] bg-white px-4 py-3" aria-label="Paginação de chamados">
      <a
        href={buildListHref({ page: Math.max(1, data.page - 1) })}
        aria-disabled={data.page <= 1}
        class={`inline-flex min-h-9 items-center gap-1.5 rounded-lg px-3 text-[11px] font-semibold ${data.page <= 1 ? "pointer-events-none text-[#B1B5BE]" : "text-[#5F6676] hover:bg-[#F5F6F8] hover:text-[#000A57]"}`}
      ><ChevronLeft size={14} />Anterior</a>
      <span class="application-text-meta font-semibold text-[#747C8C]">Página {data.page} de {data.totalPages}</span>
      <a
        href={buildListHref({ page: Math.min(data.totalPages, data.page + 1) })}
        aria-disabled={data.page >= data.totalPages}
        class={`inline-flex min-h-9 items-center gap-1.5 rounded-lg px-3 text-[11px] font-semibold ${data.page >= data.totalPages ? "pointer-events-none text-[#B1B5BE]" : "text-[#5F6676] hover:bg-[#F5F6F8] hover:text-[#000A57]"}`}
      >Próxima<ChevronRight size={14} /></a>
    </nav>
  {/if}
</ApplicationContent>
