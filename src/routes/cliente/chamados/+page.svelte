<script lang="ts">
  import { goto } from "$app/navigation";
  import {
    Activity,
    ArrowRight,
    Bell,
    Building2,
    CheckCircle2,
    ChevronLeft,
    ChevronRight,
    Clock3,
    Globe2,
    Inbox,
    LayoutGrid,
    List,
    MessageCircle,
    School,
    Search,
    Users,
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

  const channelLabels: Record<string, string> = {
    portal: "Portal",
    web_chat: "Chat",
    email: "E-mail",
    whatsapp: "WhatsApp",
    manual: "Suporte",
  };

  let filterKey = "";
  let groupValue = "all";
  let unitValue = "all";
  let statusValue = "";
  let priorityValue = "";
  let periodValue = "all";
  let searchValue = "";
  let searchTimer: ReturnType<typeof setTimeout> | null = null;

  $: nextFilterKey = [
    data.filters.groupId ?? "all",
    data.filters.unitId ?? "all",
    data.filters.status ?? "",
    data.filters.priority ?? "",
    data.filters.period,
    data.filters.search,
  ].join(":");

  $: if (nextFilterKey !== filterKey) {
    filterKey = nextFilterKey;
    groupValue = data.filters.groupId === null ? "all" : String(data.filters.groupId);
    unitValue = data.filters.unitId === null ? "all" : String(data.filters.unitId);
    statusValue = data.filters.status ?? "";
    priorityValue = data.filters.priority ?? "";
    periodValue = data.filters.period;
    searchValue = data.filters.search;
  }

  $: selectedGroup = groupValue === "all"
    ? null
    : data.groups.find((group) => group.grupo_id === Number(groupValue)) ?? null;
  $: availableUnits = selectedGroup?.unidades ?? [];
  $: firstVisible = data.total === 0 ? 0 : (data.page - 1) * data.pageSize + 1;
  $: lastVisible = Math.min(data.page * data.pageSize, data.total);

  function buildHref(options: {
    page?: number;
    view?: "cards" | "table";
    group?: string;
    unit?: string;
    status?: string;
    priority?: string;
    period?: string;
    search?: string;
  } = {}): string {
    const params = new URLSearchParams();
    const group = options.group ?? groupValue;
    const unit = options.unit ?? unitValue;
    const status = options.status ?? statusValue;
    const priority = options.priority ?? priorityValue;
    const period = options.period ?? periodValue;
    const search = options.search ?? searchValue;

    params.set("groupId", group);
    if (group !== "all" && unit !== "all") params.set("unitId", unit);
    if (status) params.set("status", status);
    if (priority) params.set("priority", priority);
    if (period !== "all") params.set("period", period);
    if (search.trim()) params.set("q", search.trim());
    params.set("view", options.view ?? data.filters.view);

    const page = options.page ?? 1;
    if (page > 1) params.set("page", String(page));
    return `/cliente/chamados?${params.toString()}`;
  }

  function navigateFilters(options: Parameters<typeof buildHref>[0] = {}): void {
    void goto(buildHref({ ...options, page: 1 }), {
      keepFocus: true,
      noScroll: true,
    });
  }

  function handleGroupChange(event: Event): void {
    groupValue = (event.currentTarget as HTMLSelectElement).value;
    unitValue = "all";
    navigateFilters({ group: groupValue, unit: "all" });
  }

  function handleUnitChange(event: Event): void {
    unitValue = (event.currentTarget as HTMLSelectElement).value;
    navigateFilters({ unit: unitValue });
  }

  function handleStatusChange(event: Event): void {
    statusValue = (event.currentTarget as HTMLSelectElement).value;
    navigateFilters({ status: statusValue });
  }

  function handlePriorityChange(event: Event): void {
    priorityValue = (event.currentTarget as HTMLSelectElement).value;
    navigateFilters({ priority: priorityValue });
  }

  function handlePeriodChange(event: Event): void {
    periodValue = (event.currentTarget as HTMLSelectElement).value;
    navigateFilters({ period: periodValue });
  }

  function handleSearchInput(event: Event): void {
    searchValue = (event.currentTarget as HTMLInputElement).value;
    if (searchTimer) clearTimeout(searchTimer);
    searchTimer = setTimeout(() => navigateFilters({ search: searchValue }), 400);
  }

  function formatDate(value: Date | string | null): string {
    if (!value) return "";
    return new Intl.DateTimeFormat("pt-BR", {
      dateStyle: "short",
      timeStyle: "short",
    }).format(new Date(value));
  }

  function activityAge(value: Date | string): string {
    const difference = Math.max(0, Date.now() - new Date(value).getTime());
    const minutes = Math.floor(difference / 60_000);
    if (minutes < 1) return "agora";
    if (minutes < 60) return `há ${minutes} min`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `há ${hours} h`;
    return formatDate(value);
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
    if (status === "resolved" || status === "closed") return "bg-[#EEF7F1] text-[#3F7257]";
    if (status === "in_progress") return "bg-[#EEF0FF] text-[#303C91]";
    if (status === "new") return "bg-[#FFF2E7] text-[#A9500C]";
    return "bg-[#F1F3F7] text-[#626A7B]";
  }

  function priorityClass(priority: string): string {
    if (priority === "urgent") return "bg-[#FFF0ED] text-[#A04435]";
    if (priority === "high") return "bg-[#FFF4E8] text-[#9A541A]";
    return "bg-[#F4F5F8] text-[#6A7180]";
  }

  function slaClass(ticket: PageData["tickets"][number]): string {
    const label = slaLabel(ticket);
    if (label === "Concluído") return "text-[#47705A]";
    if (label === "Prazo excedido") return "text-[#A04435]";
    return "text-[#5F687B]";
  }
</script>

<svelte:head><title>Meus chamados | F10 Software</title></svelte:head>

<ApplicationContent width="wide" className="pb-10">
  <section class="mb-5 rounded-[22px] border border-[#E1E4EC] bg-white p-4 shadow-[0_8px_28px_rgba(1,13,40,0.035)] sm:p-5">
    <div>
      <p class="application-text-caption font-bold uppercase tracking-[0.1em] text-[#EA6D0B]">Central de suporte</p>
      <h2 class="mt-1 text-[22px] font-semibold tracking-[-0.035em] text-[#202737]">Seus chamados</h2>
      <p class="application-text-meta mt-1 text-[#858C9C]">Cada alteração nos filtros atualiza a consulta automaticamente.</p>
    </div>

    <div class="mt-5 border-t border-[#ECEEF3] pt-4">
      <div class="grid gap-3 md:grid-cols-2 xl:grid-cols-[minmax(260px,2fr)_repeat(5,minmax(130px,1fr))]">
        <label>
          <span class="application-text-caption font-semibold text-[#596172]">Buscar chamado</span>
          <div class="relative mt-1.5">
            <Search size={15} class="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[#8E95A4]" />
            <input
              type="search"
              maxlength="120"
              bind:value={searchValue}
              on:input={handleSearchInput}
              placeholder="Número ou assunto"
              class="application-text-control h-11 w-full rounded-xl border border-[#DDE1E9] bg-white pl-10 pr-3 outline-none transition focus:border-[#000A57] focus:ring-4 focus:ring-[#000A57]/10"
            />
          </div>
        </label>

        {#if data.groups.length > 1}
          <label>
            <span class="application-text-caption font-semibold text-[#596172]">Grupo</span>
            <select bind:value={groupValue} on:change={handleGroupChange} class="application-text-control mt-1.5 h-11 w-full rounded-xl border border-[#DDE1E9] bg-white px-3 outline-none transition focus:border-[#000A57]">
              <option value="all">Todos os grupos</option>
              {#each data.groups as group}
                <option value={String(group.grupo_id)}>{group.grupo}</option>
              {/each}
            </select>
          </label>
        {:else if data.groups[0]}
          <div>
            <span class="application-text-caption font-semibold text-[#596172]">Grupo</span>
            <div class="application-text-control mt-1.5 flex h-11 items-center rounded-xl border border-[#E5E7ED] bg-[#F8F9FB] px-3 text-[#596172]">{data.groups[0].grupo}</div>
          </div>
        {/if}

        <label>
          <span class="application-text-caption font-semibold text-[#596172]">Escola</span>
          <select bind:value={unitValue} on:change={handleUnitChange} disabled={!selectedGroup} class="application-text-control mt-1.5 h-11 w-full rounded-xl border border-[#DDE1E9] bg-white px-3 outline-none transition disabled:bg-[#F5F6F8] disabled:text-[#A1A6B0] focus:border-[#000A57]">
            <option value="all">{selectedGroup ? "Todas as escolas" : "Selecione um grupo"}</option>
            {#each availableUnits as unit}
              <option value={String(unit.unidade_id)}>{unit.unidade}</option>
            {/each}
          </select>
        </label>

        <label>
          <span class="application-text-caption font-semibold text-[#596172]">Status</span>
          <select bind:value={statusValue} on:change={handleStatusChange} class="application-text-control mt-1.5 h-11 w-full rounded-xl border border-[#DDE1E9] bg-white px-3 outline-none transition focus:border-[#000A57]">
            <option value="">Todos</option>
            {#each Object.entries(statusLabels) as [value, label]}
              <option value={value}>{label}</option>
            {/each}
          </select>
        </label>

        <label>
          <span class="application-text-caption font-semibold text-[#596172]">Prioridade</span>
          <select bind:value={priorityValue} on:change={handlePriorityChange} class="application-text-control mt-1.5 h-11 w-full rounded-xl border border-[#DDE1E9] bg-white px-3 outline-none transition focus:border-[#000A57]">
            <option value="">Todas</option>
            {#each Object.entries(priorityLabels) as [value, label]}
              <option value={value}>{label}</option>
            {/each}
          </select>
        </label>

        <label>
          <span class="application-text-caption font-semibold text-[#596172]">Período de abertura</span>
          <select bind:value={periodValue} on:change={handlePeriodChange} class="application-text-control mt-1.5 h-11 w-full rounded-xl border border-[#DDE1E9] bg-white px-3 outline-none transition focus:border-[#000A57]">
            <option value="all">Todo o período</option>
            <option value="7d">Últimos 7 dias</option>
            <option value="30d">Últimos 30 dias</option>
            <option value="90d">Últimos 90 dias</option>
          </select>
        </label>
      </div>

      <div class="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <div class="flex min-h-[88px] items-center gap-3 rounded-2xl border border-[#EEE4DA] bg-[#FFFCF9] px-4 py-3.5">
          <span class="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#FFF0E2] text-[#EA6D0B]"><Clock3 size={19} /></span>
          <div class="min-w-0">
            <p class="application-text-meta font-semibold text-[#6F7480]">Aguardando atendimento</p>
            <div class="mt-0.5 flex items-baseline gap-2"><span class="text-[20px] font-semibold tracking-[-0.03em] text-[#C85D08]">{data.summary.awaiting}</span><span class="application-text-meta text-[#A1A5AF]">de {data.summary.total}</span></div>
            <p class="application-text-meta truncate text-[#9A9FAC]">aguardando triagem</p>
          </div>
        </div>

        <div class="flex min-h-[88px] items-center gap-3 rounded-2xl border border-[#E3E6F7] bg-[#FCFCFF] px-4 py-3.5">
          <span class="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#EEF0FF] text-[#3444B5]"><MessageCircle size={19} /></span>
          <div class="min-w-0">
            <p class="application-text-meta font-semibold text-[#6F7480]">Em andamento</p>
            <div class="mt-0.5 flex items-baseline gap-2"><span class="text-[20px] font-semibold tracking-[-0.03em] text-[#283AAE]">{data.summary.inProgress}</span><span class="application-text-meta text-[#A1A5AF]">de {data.summary.total}</span></div>
            <p class="application-text-meta truncate text-[#9A9FAC]">em acompanhamento</p>
          </div>
        </div>

        <div class="flex min-h-[88px] items-center gap-3 rounded-2xl border border-[#DDEDE3] bg-[#FBFEFC] px-4 py-3.5">
          <span class="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#EAF6EE] text-[#39815A]"><CheckCircle2 size={19} /></span>
          <div class="min-w-0">
            <p class="application-text-meta font-semibold text-[#6F7480]">Resolvidos</p>
            <div class="mt-0.5 flex items-baseline gap-2"><span class="text-[20px] font-semibold tracking-[-0.03em] text-[#33734F]">{data.summary.resolved}</span><span class="application-text-meta text-[#A1A5AF]">de {data.summary.total}</span></div>
            <p class="application-text-meta truncate text-[#9A9FAC]">resolvidos ou fechados</p>
          </div>
        </div>

        <div class="flex min-h-[88px] items-center gap-3 rounded-2xl border border-[#E8E2F6] bg-[#FDFCFF] px-4 py-3.5">
          <span class="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#F3EDFF] text-[#7047C8]"><Bell size={19} /></span>
          <div class="min-w-0">
            <p class="application-text-meta font-semibold text-[#6F7480]">Nova atualização</p>
            <div class="mt-0.5 flex items-baseline gap-2"><span class="text-[20px] font-semibold tracking-[-0.03em] text-[#6840BF]">{data.summary.unread}</span><span class="application-text-meta text-[#A1A5AF]">de {data.summary.total}</span></div>
            <p class="application-text-meta truncate text-[#9A9FAC]">desde sua última visualização</p>
          </div>
        </div>
      </div>
    </div>
  </section>

  <div class="mb-3 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
    <div>
      <p class="text-[13px] font-semibold text-[#303746]">{data.total} {data.total === 1 ? "chamado encontrado" : "chamados encontrados"}</p>
      {#if data.total > 0}
        <p class="application-text-meta mt-0.5 text-[#9298A5]">Exibindo {firstVisible}–{lastVisible} de {data.total}</p>
      {/if}
    </div>
    <div class="inline-flex w-fit rounded-xl border border-[#DDE1E9] bg-white p-1 shadow-[0_4px_14px_rgba(1,13,40,0.03)]">
      <a href={buildHref({ view: "cards", page: 1 })} class={`inline-flex min-h-9 items-center gap-2 rounded-lg px-3 text-[11px] font-semibold transition ${data.filters.view === "cards" ? "bg-[#000A57] text-white" : "text-[#6B7280] hover:bg-[#F7F8FA] hover:text-[#000A57]"}`}><LayoutGrid size={14} />Cards</a>
      <a href={buildHref({ view: "table", page: 1 })} class={`inline-flex min-h-9 items-center gap-2 rounded-lg px-3 text-[11px] font-semibold transition ${data.filters.view === "table" ? "bg-[#000A57] text-white" : "text-[#6B7280] hover:bg-[#F7F8FA] hover:text-[#000A57]"}`}><List size={14} />Tabela</a>
    </div>
  </div>

  {#if data.tickets.length === 0}
    <section class="rounded-[22px] border border-dashed border-[#CBD1DE] bg-white px-6 py-12 text-center">
      <Inbox size={30} class="mx-auto text-[#9BA1AE]" />
      <h2 class="mt-4 text-[17px] font-semibold text-[#303746]">Nenhum chamado encontrado</h2>
      <p class="mx-auto mt-2 max-w-[520px] text-[11px] leading-5 text-[#777E8D]">Ajuste os filtros ou use “Novo chamado” na barra superior para falar com a equipe F10.</p>
    </section>
  {:else}
    <div class={data.filters.view === "cards" ? "overflow-hidden rounded-[18px] border border-[#E1E4EC] bg-white shadow-[0_8px_26px_rgba(1,13,40,0.035)]" : "overflow-hidden rounded-[18px] border border-[#E1E4EC] bg-white shadow-[0_8px_26px_rgba(1,13,40,0.035)] md:hidden"}>
      {#each data.tickets as ticket}
        <a href={`/cliente/chamados/${ticket.id}`} class={`group relative block border-b border-[#ECEEF3] transition last:border-b-0 hover:bg-[#FAFBFD] ${ticket.hasUnreadUpdate ? "bg-[#FFFCF9]" : "bg-white"}`}>
          {#if ticket.hasUnreadUpdate}<span class="absolute inset-y-0 left-0 w-[3px] bg-[#EA6D0B]"></span>{/if}
          <div class="grid gap-4 px-4 py-3.5 lg:grid-cols-[185px_minmax(260px,1.55fr)_minmax(205px,1fr)_145px_165px_22px] lg:items-center xl:px-5">
            <div class="min-w-0">
              <div class="flex flex-wrap items-center gap-2">
                <span class="application-text-caption font-bold text-[#EA6D0B]">#{ticket.ticketNumber}</span>
                <span class={`application-text-meta rounded-full px-2.5 py-1 font-semibold ${statusClass(ticket.status)}`}>{statusLabels[ticket.status] ?? ticket.status}</span>
              </div>
              <div class="mt-1.5 flex flex-wrap items-center gap-2">
                <span class={`application-text-meta rounded-full px-2.5 py-1 font-semibold ${priorityClass(ticket.priority)}`}>{priorityLabels[ticket.priority] ?? ticket.priority}</span>
                {#if ticket.hasUnreadUpdate}
                  <span class="application-text-meta inline-flex items-center gap-1 rounded-full bg-[#FFF1E5] px-2 py-1 font-semibold text-[#A9500C]"><Bell size={11} />Nova atualização</span>
                {/if}
              </div>
            </div>

            <div class="min-w-0">
              <h3 class="truncate text-[14px] font-semibold tracking-[-0.01em] text-[#262D3D] transition group-hover:text-[#000A57]">{ticket.subject}</h3>
              <div class="application-text-meta mt-1.5 flex min-w-0 flex-wrap items-center gap-x-2.5 gap-y-1 text-[#8A91A0]">
                {#if ticket.context?.scope === "global"}
                  <span class="inline-flex items-center gap-1"><Globe2 size={12} />Todos os grupos</span>
                  <span class="inline-flex items-center gap-1"><Building2 size={12} />Global</span>
                {:else if ticket.context}
                  <span class="inline-flex items-center gap-1"><Users size={12} />{ticket.context.groupName}</span>
                  <span class="inline-flex items-center gap-1"><School size={12} />{ticket.context.unitName}</span>
                {:else}
                  <span class="inline-flex items-center gap-1"><Building2 size={12} />Contexto do atendimento</span>
                {/if}
                <span class="inline-flex items-center gap-1"><MessageCircle size={12} />{channelLabels[ticket.channel] ?? ticket.channel}</span>
              </div>
            </div>

            <div class="min-w-0">
              <p class="application-text-meta inline-flex items-center gap-1.5 font-medium text-[#9A9FAC]"><Activity size={12} />Última atividade da equipe</p>
              {#if ticket.lastTeamActivityAt}
                <p class={`mt-1 truncate text-[11px] font-semibold ${ticket.hasUnreadUpdate ? "text-[#A9500C]" : "text-[#626A7B]"}`}>Equipe movimentou este chamado {activityAge(ticket.lastTeamActivityAt)}</p>
              {:else}
                <p class="mt-1 text-[11px] text-[#8A91A0]">Aguardando primeira movimentação</p>
              {/if}
            </div>

            <div>
              <p class="application-text-meta inline-flex items-center gap-1.5 font-medium text-[#9A9FAC]"><Clock3 size={12} />Atualizado</p>
              <p class="mt-1 text-[11px] font-semibold text-[#596172]">{formatDate(ticket.updatedAt)}</p>
            </div>

            <div>
              <p class="application-text-meta font-medium text-[#9A9FAC]">Acompanhamento</p>
              <p class={`mt-1 inline-flex items-center gap-1.5 text-[11px] font-semibold ${slaClass(ticket)}`}>
                {#if ticket.status === "resolved" || ticket.status === "closed"}<CheckCircle2 size={13} />{:else}<Clock3 size={13} />{/if}
                {slaLabel(ticket)}
              </p>
            </div>

            <ArrowRight size={17} class="hidden text-[#A1A7B4] transition group-hover:translate-x-0.5 group-hover:text-[#000A57] lg:block" />
          </div>
        </a>
      {/each}
    </div>

    {#if data.filters.view === "table"}
      <div class="hidden overflow-hidden rounded-[18px] border border-[#E1E4EC] bg-white shadow-[0_6px_22px_rgba(1,13,40,0.028)] md:block">
        <table class="w-full border-collapse text-left">
          <thead class="bg-[#F7F8FA] text-[10px] font-bold uppercase tracking-[0.06em] text-[#747C8D]">
            <tr>
              <th class="px-4 py-3">Chamado</th>
              <th class="px-4 py-3">Assunto</th>
              <th class="px-4 py-3">Contexto</th>
              <th class="px-4 py-3">Status</th>
              <th class="px-4 py-3">Atividade da equipe</th>
              <th class="px-4 py-3">Atualizado</th>
              <th class="px-4 py-3">Acompanhamento</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-[#ECEEF3]">
            {#each data.tickets as ticket}
              <tr class={ticket.hasUnreadUpdate ? "bg-[#FFFBF7] transition hover:bg-[#FFF8F1]" : "transition hover:bg-[#FAFBFC]"}>
                <td class="px-4 py-3">
                  <a class="font-semibold text-[#EA6D0B]" href={`/cliente/chamados/${ticket.id}`}>#{ticket.ticketNumber}</a>
                  {#if ticket.hasUnreadUpdate}<div class="application-text-meta mt-1 inline-flex items-center gap-1 font-semibold text-[#A9500C]"><Bell size={11} />Nova atualização</div>{/if}
                </td>
                <td class="max-w-[320px] px-4 py-3 text-[12px] font-medium text-[#303746]"><a class="block truncate hover:text-[#000A57]" href={`/cliente/chamados/${ticket.id}`}>{ticket.subject}</a></td>
                <td class="px-4 py-3 text-[11px] text-[#6D7484]">
                  {#if ticket.context?.scope === "global"}
                    <span class="inline-flex items-center gap-1"><Globe2 size={12} />Todos os grupos · Global</span>
                  {:else if ticket.context}
                    <span class="inline-flex items-center gap-1"><School size={12} />{ticket.context.groupName} · {ticket.context.unitName}</span>
                  {:else}—{/if}
                  <div class="application-text-meta mt-1 inline-flex items-center gap-1 text-[#9A9FAC]"><MessageCircle size={11} />{channelLabels[ticket.channel] ?? ticket.channel}</div>
                </td>
                <td class="px-4 py-3"><span class={`application-text-meta rounded-full px-2.5 py-1 font-semibold ${statusClass(ticket.status)}`}>{statusLabels[ticket.status] ?? ticket.status}</span><div class="mt-2"><span class={`application-text-meta rounded-full px-2.5 py-1 font-semibold ${priorityClass(ticket.priority)}`}>{priorityLabels[ticket.priority] ?? ticket.priority}</span></div></td>
                <td class="px-4 py-3 text-[11px] text-[#687081]">{ticket.lastTeamActivityAt ? activityAge(ticket.lastTeamActivityAt) : "Aguardando movimentação"}</td>
                <td class="px-4 py-3 text-[11px] font-medium text-[#687081]">{formatDate(ticket.updatedAt)}</td>
                <td class={`px-4 py-3 text-[11px] font-semibold ${slaClass(ticket)}`}><span class="inline-flex items-center gap-1.5">{#if ticket.status === "resolved" || ticket.status === "closed"}<CheckCircle2 size={13} />{:else}<Clock3 size={13} />{/if}{slaLabel(ticket)}</span></td>
              </tr>
            {/each}
          </tbody>
        </table>
      </div>
    {/if}
  {/if}

  {#if data.totalPages > 1}
    <nav class="mt-5 flex items-center justify-between rounded-2xl border border-[#E1E4EC] bg-white px-3 py-2 shadow-[0_4px_14px_rgba(1,13,40,0.025)]">
      {#if data.page > 1}<a href={buildHref({ page: data.page - 1 })} class="inline-flex min-h-9 items-center gap-1 rounded-lg px-3 text-[11px] font-semibold text-[#000A57] hover:bg-[#F5F6F8]"><ChevronLeft size={14} />Anterior</a>{:else}<span></span>{/if}
      <span class="application-text-meta text-[#777E8D]">Página {data.page} de {data.totalPages}</span>
      {#if data.page < data.totalPages}<a href={buildHref({ page: data.page + 1 })} class="inline-flex min-h-9 items-center gap-1 rounded-lg px-3 text-[11px] font-semibold text-[#000A57] hover:bg-[#F5F6F8]">Próxima<ChevronRight size={14} /></a>{:else}<span></span>{/if}
    </nav>
  {/if}
</ApplicationContent>
