<script lang="ts">
  import { invalidateAll } from "$app/navigation";
  import {
    CheckCircle2,
    ChevronRight,
    CircleAlert,
    Columns3,
    Filter,
    GripVertical,
    Headphones,
    List,
    MessageCircleMore,
    Plus,
    Search,
    UserRound,
    Users,
    X,
  } from "lucide-svelte";
  import type { ActionData, PageData } from "./$types";

  export let data: PageData;
  export let form: ActionData;

  type TicketScope = "mine" | "unassigned" | "all";
  type TicketView = "list" | "board";

  const statusLabels: Record<string, string> = {
    new: "Novo",
    open: "Aberto",
    in_progress: "Em andamento",
    waiting_customer: "Aguardando cliente",
    resolved: "Resolvido",
    closed: "Fechado",
  };

  const statusOrder = [
    "new",
    "open",
    "in_progress",
    "waiting_customer",
    "resolved",
    "closed",
  ];

  const statusClasses: Record<string, string> = {
    new: "bg-[#FFF4E9] text-[#A9510D]",
    open: "bg-[#EEF0FF] text-[#000A57]",
    in_progress: "bg-[#EAF6FF] text-[#17658B]",
    waiting_customer: "bg-[#F6F1FF] text-[#6D45A0]",
    resolved: "bg-[#EEF8F1] text-[#2F7045]",
    closed: "bg-[#F1F3F6] text-[#6F7583]",
  };

  const priorityLabels: Record<string, string> = {
    low: "Baixa",
    normal: "Normal",
    high: "Alta",
    urgent: "Urgente",
  };

  const priorityClasses: Record<string, string> = {
    low: "bg-[#F1F4F8] text-[#667085]",
    normal: "bg-[#EEF0FF] text-[#000A57]",
    high: "bg-[#FFF4E9] text-[#A9510D]",
    urgent: "bg-[#FFF0F0] text-[#A52A2A]",
  };

  const channelLabels: Record<string, string> = {
    manual: "Manual",
    web_chat: "Chat",
    portal: "Área do cliente",
    customer_portal: "Área do cliente",
  };

  let scope: TicketScope = "mine";
  let view: TicketView = "list";
  let searchTerm = "";
  let statusFilter = "active";
  let priorityFilter = "all";
  let queueFilter = "all";
  let channelFilter = "all";
  let assigneeFilter = "all";
  let createOpen = false;
  let draggingTicketId: string | null = null;
  let dragOverStatus: string | null = null;
  let movingTicket = false;

  function formatDateTime(value: string | Date): string {
    return new Intl.DateTimeFormat("pt-BR", {
      dateStyle: "short",
      timeStyle: "short",
    }).format(new Date(value));
  }

  function matchesSearch(
    ticket: PageData["tickets"][number],
    searchValue: string,
  ): boolean {
    const query = searchValue.trim().toLocaleLowerCase("pt-BR");
    if (!query) return true;
    return [
      ticket.ticketNumber,
      ticket.subject,
      ticket.customerName,
      ticket.customerEmail,
      ticket.organizationName,
      ticket.assignedUserName,
      ticket.queueName,
    ]
      .filter(Boolean)
      .join(" ")
      .toLocaleLowerCase("pt-BR")
      .includes(query);
  }

  function matchesScope(
    ticket: PageData["tickets"][number],
    selectedScope: TicketScope,
    currentUserId: string,
  ): boolean {
    if (selectedScope === "mine") return ticket.assignedUserId === currentUserId;
    if (selectedScope === "unassigned") return !ticket.assignedUserId;
    return true;
  }

  function matchesStatus(
    ticket: PageData["tickets"][number],
    selectedStatus: string,
  ): boolean {
    if (selectedStatus === "all") return true;
    if (selectedStatus === "active") return ticket.status !== "resolved" && ticket.status !== "closed";
    if (selectedStatus === "completed") return ticket.status === "resolved" || ticket.status === "closed";
    return ticket.status === selectedStatus;
  }

  $: queueOptions = Array.from(new Set(data.tickets.map((ticket) => ticket.queueName))).sort((a, b) => a.localeCompare(b, "pt-BR"));
  $: channelOptions = Array.from(new Set(data.tickets.map((ticket) => ticket.channel))).sort();
  $: assigneeOptions = Array.from(
    new Map(
      data.tickets
        .filter((ticket) => ticket.assignedUserId && ticket.assignedUserName)
        .map((ticket) => [ticket.assignedUserId, { id: ticket.assignedUserId as string, name: ticket.assignedUserName as string }]),
    ).values(),
  ).sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));

  $: filteredTickets = data.tickets.filter((ticket) => {
    if (
      !matchesScope(ticket, scope, data.currentUserId) ||
      !matchesSearch(ticket, searchTerm) ||
      !matchesStatus(ticket, statusFilter)
    ) return false;
    if (priorityFilter !== "all" && ticket.priority !== priorityFilter) return false;
    if (queueFilter !== "all" && ticket.queueName !== queueFilter) return false;
    if (channelFilter !== "all" && ticket.channel !== channelFilter) return false;
    if (assigneeFilter === "unassigned" && ticket.assignedUserId) return false;
    if (assigneeFilter !== "all" && assigneeFilter !== "unassigned" && ticket.assignedUserId !== assigneeFilter) return false;
    return true;
  });

  $: activeMineCount = data.tickets.filter(
    (ticket) => ticket.assignedUserId === data.currentUserId && ticket.status !== "resolved" && ticket.status !== "closed",
  ).length;
  $: newCount = data.tickets.filter((ticket) => ticket.status === "new").length;
  $: unassignedCount = data.tickets.filter(
    (ticket) => !ticket.assignedUserId && ticket.status !== "resolved" && ticket.status !== "closed",
  ).length;
  $: waitingCount = data.tickets.filter((ticket) => ticket.status === "waiting_customer").length;
  $: completedCount = data.tickets.filter((ticket) => ticket.status === "resolved" || ticket.status === "closed").length;

  $: visibleStatuses = statusOrder.filter((status) => {
    if (statusFilter === "all") return true;
    if (statusFilter === "active") return status !== "resolved" && status !== "closed";
    if (statusFilter === "completed") return status === "resolved" || status === "closed";
    return status === statusFilter;
  });

  function ticketsForStatus(
    ticketList: PageData["tickets"],
    status: string,
  ) {
    return ticketList.filter((ticket) => ticket.status === status);
  }

  function startDrag(event: DragEvent, ticketId: string): void {
    if (!data.canReply) return;
    draggingTicketId = ticketId;
    event.dataTransfer?.setData("text/plain", ticketId);
    if (event.dataTransfer) event.dataTransfer.effectAllowed = "move";
  }

  function endDrag(): void {
    draggingTicketId = null;
    dragOverStatus = null;
  }

  async function dropTicket(event: DragEvent, status: string): Promise<void> {
    event.preventDefault();
    if (!data.canReply || movingTicket) return;
    const ticketId = draggingTicketId ?? event.dataTransfer?.getData("text/plain") ?? "";
    const ticket = data.tickets.find((item) => item.id === ticketId);
    if (!ticket || ticket.status === status) {
      endDrag();
      return;
    }

    movingTicket = true;
    try {
      const body = new FormData();
      body.set("ticketId", ticketId);
      body.set("status", status);
      const response = await fetch("/app/tickets?/moveStatus", { method: "POST", body });
      if (response.ok) await invalidateAll();
    } finally {
      movingTicket = false;
      endDrag();
    }
  }
</script>

<svelte:head>
  <title>Tickets | F10 Operations</title>
</svelte:head>

<div class="mx-auto max-w-[1560px] px-5 py-7 sm:px-8 sm:py-9">
  <div class="flex flex-col justify-between gap-5 xl:flex-row xl:items-end">
    <div>
      <p class="text-[11px] font-bold uppercase tracking-[0.14em] text-[#EA6D0B]">Atendimento</p>
      <h1 class="mt-2 text-[30px] font-semibold tracking-[-0.035em] text-[#010D28] sm:text-[38px]">Tickets</h1>
      <p class="mt-2 max-w-[760px] text-[14px] leading-6 text-[#6F7585]">Organize sua fila, priorize o que exige ação e acompanhe o atendimento até a resolução.</p>
    </div>

    {#if data.canCreate}
      <button type="button" on:click={() => (createOpen = true)} class="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[#000A57] px-4 text-[12px] font-semibold text-white shadow-sm transition hover:bg-[#00116F]">
        <Plus size={17} aria-hidden="true" />
        Novo ticket
      </button>
    {/if}
  </div>

  {#if form?.message}
    <div class={`mt-6 flex items-start gap-3 rounded-2xl border px-4 py-3 text-[12px] font-medium ${form.success ? "border-[#B9E6C9] bg-[#F1FBF4] text-[#176B35]" : "border-[#F0C8C8] bg-[#FFF5F5] text-[#9B2C2C]"}`}>
      {#if form.success}<CheckCircle2 size={18} class="mt-0.5 shrink-0" />{:else}<CircleAlert size={18} class="mt-0.5 shrink-0" />{/if}
      <span>{form.message}</span>
    </div>
  {/if}

  <div class="mt-7 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
    <button type="button" on:click={() => { scope = "mine"; statusFilter = "active"; }} class="rounded-2xl border border-[#E1E4EB] bg-white p-4 text-left transition hover:border-[#C9CEDA] hover:shadow-sm">
      <span class="text-[10px] font-bold uppercase tracking-[0.08em] text-[#818796]">Minha fila</span>
      <strong class="mt-2 block text-[24px] font-semibold text-[#202637]">{activeMineCount}</strong>
      <span class="mt-1 block text-[10px] text-[#8B909E]">ativos atribuídos a você</span>
    </button>
    <button type="button" on:click={() => { scope = "all"; statusFilter = "new"; }} class="rounded-2xl border border-[#E1E4EB] bg-white p-4 text-left transition hover:border-[#C9CEDA] hover:shadow-sm">
      <span class="text-[10px] font-bold uppercase tracking-[0.08em] text-[#818796]">Novos</span>
      <strong class="mt-2 block text-[24px] font-semibold text-[#A9510D]">{newCount}</strong>
      <span class="mt-1 block text-[10px] text-[#8B909E]">ainda no início</span>
    </button>
    <button type="button" on:click={() => { scope = "unassigned"; statusFilter = "active"; }} class="rounded-2xl border border-[#E1E4EB] bg-white p-4 text-left transition hover:border-[#C9CEDA] hover:shadow-sm">
      <span class="text-[10px] font-bold uppercase tracking-[0.08em] text-[#818796]">Sem responsável</span>
      <strong class="mt-2 block text-[24px] font-semibold text-[#B42318]">{unassignedCount}</strong>
      <span class="mt-1 block text-[10px] text-[#8B909E]">aguardando alguém assumir</span>
    </button>
    <button type="button" on:click={() => { scope = "all"; statusFilter = "waiting_customer"; }} class="rounded-2xl border border-[#E1E4EB] bg-white p-4 text-left transition hover:border-[#C9CEDA] hover:shadow-sm">
      <span class="text-[10px] font-bold uppercase tracking-[0.08em] text-[#818796]">Aguardando cliente</span>
      <strong class="mt-2 block text-[24px] font-semibold text-[#6D45A0]">{waitingCount}</strong>
      <span class="mt-1 block text-[10px] text-[#8B909E]">dependem de retorno externo</span>
    </button>
    <button type="button" on:click={() => { scope = "all"; statusFilter = "completed"; }} class="rounded-2xl border border-[#E1E4EB] bg-white p-4 text-left transition hover:border-[#C9CEDA] hover:shadow-sm">
      <span class="text-[10px] font-bold uppercase tracking-[0.08em] text-[#818796]">Concluídos</span>
      <strong class="mt-2 block text-[24px] font-semibold text-[#2F7045]">{completedCount}</strong>
      <span class="mt-1 block text-[10px] text-[#8B909E]">resolvidos ou fechados</span>
    </button>
  </div>

  <section class="mt-5 overflow-hidden rounded-[24px] border border-[#E2E5ED] bg-white">
    <div class="flex flex-col gap-4 border-b border-[#EEF0F5] px-4 py-4 sm:px-5 xl:flex-row xl:items-center xl:justify-between">
      <nav class="flex gap-1 rounded-xl bg-[#F3F4F7] p-1" aria-label="Escopo dos tickets">
        <button type="button" on:click={() => (scope = "mine")} class={`h-9 rounded-lg px-3 text-[11px] font-semibold transition ${scope === "mine" ? "bg-white text-[#000A57] shadow-sm" : "text-[#737989]"}`}>Minha fila</button>
        <button type="button" on:click={() => (scope = "unassigned")} class={`h-9 rounded-lg px-3 text-[11px] font-semibold transition ${scope === "unassigned" ? "bg-white text-[#000A57] shadow-sm" : "text-[#737989]"}`}>Sem responsável</button>
        <button type="button" on:click={() => (scope = "all")} class={`h-9 rounded-lg px-3 text-[11px] font-semibold transition ${scope === "all" ? "bg-white text-[#000A57] shadow-sm" : "text-[#737989]"}`}>Todos</button>
      </nav>

      <div class="flex flex-col gap-2 sm:flex-row sm:items-center">
        <label class="relative block sm:w-[310px]">
          <Search size={15} class="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#9499A5]" />
          <input bind:value={searchTerm} placeholder="Buscar por ticket, cliente ou assunto" class="h-10 w-full rounded-xl border border-[#DDE1EA] bg-[#FAFAFC] pl-9 pr-3 text-[11px] outline-none focus:border-[#000A57] focus:bg-white" />
        </label>
        <div class="flex rounded-xl bg-[#F3F4F7] p-1">
          <button type="button" on:click={() => (view = "list")} class={`inline-flex h-9 items-center gap-2 rounded-lg px-3 text-[11px] font-semibold ${view === "list" ? "bg-white text-[#000A57] shadow-sm" : "text-[#777D8C]"}`}><List size={15} />Lista</button>
          <button type="button" on:click={() => (view = "board")} class={`inline-flex h-9 items-center gap-2 rounded-lg px-3 text-[11px] font-semibold ${view === "board" ? "bg-white text-[#000A57] shadow-sm" : "text-[#777D8C]"}`}><Columns3 size={15} />Quadro</button>
        </div>
      </div>
    </div>

    <div class="flex flex-wrap items-center gap-2 border-b border-[#EEF0F5] bg-[#FAFAFC] px-4 py-3 sm:px-5">
      <span class="inline-flex items-center gap-2 px-1 text-[10px] font-bold uppercase tracking-[0.08em] text-[#777D8C]"><Filter size={14} />Filtros</span>
      <select bind:value={statusFilter} class="h-9 rounded-lg border border-[#DDE1EA] bg-white px-2 text-[10px]"><option value="active">Ativos</option><option value="all">Todos os status</option><option value="new">Novos</option><option value="open">Abertos</option><option value="in_progress">Em andamento</option><option value="waiting_customer">Aguardando cliente</option><option value="completed">Concluídos</option><option value="resolved">Resolvidos</option><option value="closed">Fechados</option></select>
      <select bind:value={priorityFilter} class="h-9 rounded-lg border border-[#DDE1EA] bg-white px-2 text-[10px]"><option value="all">Todas prioridades</option><option value="urgent">Urgente</option><option value="high">Alta</option><option value="normal">Normal</option><option value="low">Baixa</option></select>
      <select bind:value={queueFilter} class="h-9 rounded-lg border border-[#DDE1EA] bg-white px-2 text-[10px]"><option value="all">Todas as filas</option>{#each queueOptions as queue}<option value={queue}>{queue}</option>{/each}</select>
      <select bind:value={channelFilter} class="h-9 rounded-lg border border-[#DDE1EA] bg-white px-2 text-[10px]"><option value="all">Todos os canais</option>{#each channelOptions as channel}<option value={channel}>{channelLabels[channel] ?? channel}</option>{/each}</select>
      <select bind:value={assigneeFilter} class="h-9 rounded-lg border border-[#DDE1EA] bg-white px-2 text-[10px]"><option value="all">Todos responsáveis</option><option value="unassigned">Sem responsável</option>{#each assigneeOptions as agent}<option value={agent.id}>{agent.name}</option>{/each}</select>
      <span class="ml-auto rounded-full bg-white px-3 py-1.5 text-[10px] font-semibold text-[#777D8D] shadow-sm">{filteredTickets.length} ticket(s)</span>
    </div>

    {#if filteredTickets.length === 0}
      <div class="px-6 py-16 text-center">
        <Headphones size={34} class="mx-auto text-[#B5BAC7]" aria-hidden="true" />
        <p class="mt-4 text-[13px] font-semibold text-[#4B5160]">Nenhum ticket nesta visão</p>
        <p class="mt-1 text-[11px] text-[#9297A5]">Altere o escopo, os filtros ou a busca para encontrar outros atendimentos.</p>
      </div>
    {:else if view === "list"}
      <div class="overflow-x-auto">
        <div class="min-w-[1040px]">
          <div class="grid grid-cols-[minmax(320px,1.8fr)_minmax(190px,1fr)_150px_140px_130px_170px_34px] gap-3 border-b border-[#E8EAF0] bg-[#F8F9FB] px-5 py-3 text-[9px] font-bold uppercase tracking-[0.08em] text-[#8A909E]">
            <span>Ticket</span><span>Cliente</span><span>Responsável</span><span>Fila</span><span>Canal</span><span>Atualizado</span><span></span>
          </div>
          {#each filteredTickets as ticket}
            <a href={`/app/tickets/${ticket.id}`} class="grid min-h-[72px] grid-cols-[minmax(320px,1.8fr)_minmax(190px,1fr)_150px_140px_130px_170px_34px] items-center gap-3 border-b border-[#EEF0F4] px-5 py-3 transition last:border-b-0 hover:bg-[#F8F9FC]">
              <div class="min-w-0">
                <div class="flex flex-wrap items-center gap-2"><span class="text-[10px] font-bold text-[#EA6D0B]">#{ticket.ticketNumber}</span><span class={`rounded-full px-2 py-1 text-[9px] font-bold ${statusClasses[ticket.status]}`}>{statusLabels[ticket.status]}</span><span class={`rounded-full px-2 py-1 text-[9px] font-bold ${priorityClasses[ticket.priority]}`}>{priorityLabels[ticket.priority]}</span></div>
                <strong class="mt-1.5 block truncate text-[12px] font-semibold text-[#2D3342]">{ticket.subject}</strong>
              </div>
              <div class="min-w-0"><span class="block truncate text-[11px] font-medium text-[#4E5565]">{ticket.customerName ?? "Cliente não identificado"}</span>{#if ticket.organizationName}<span class="mt-1 block truncate text-[9px] text-[#9297A5]">{ticket.organizationName}</span>{/if}</div>
              <span class={`truncate text-[10px] ${ticket.assignedUserName ? "text-[#5F6575]" : "font-semibold text-[#B42318]"}`}>{ticket.assignedUserName ?? "Sem responsável"}</span>
              <span class="truncate text-[10px] text-[#737989]">{ticket.queueName}</span>
              <span class="text-[10px] text-[#737989]">{channelLabels[ticket.channel] ?? ticket.channel}</span>
              <span class="text-[10px] text-[#8A909E]">{formatDateTime(ticket.updatedAt)}</span>
              <ChevronRight size={15} class="text-[#A0A5B0]" />
            </a>
          {/each}
        </div>
      </div>
    {:else}
      {#if data.canReply}<p class="px-5 pt-4 text-[10px] font-medium text-[#7D8392]">Arraste um ticket entre as colunas para atualizar o status.</p>{/if}
      <div class="overflow-x-auto px-4 pb-5 pt-4 sm:px-5">
        <div class="grid min-w-[980px] gap-4" style={`grid-template-columns: repeat(${Math.max(visibleStatuses.length, 1)}, minmax(280px, 1fr));`}>
          {#each visibleStatuses as status}
            <section
              class={`min-h-[320px] rounded-[20px] border p-3 transition ${dragOverStatus === status ? "border-[#000A57] bg-[#EEF0FF]" : "border-[#E0E3EB] bg-[#F8F9FB]"}`}
              on:dragover|preventDefault={() => (dragOverStatus = status)}
              on:dragleave={() => { if (dragOverStatus === status) dragOverStatus = null; }}
              on:drop={(event) => void dropTicket(event, status)}
            >
              <header class="flex items-center justify-between gap-3 px-1 pb-3"><div class="flex items-center gap-2"><span class={`h-2.5 w-2.5 rounded-full ${status === "resolved" || status === "closed" ? "bg-[#4F9B67]" : status === "waiting_customer" ? "bg-[#7A5AA6]" : "bg-[#EA6D0B]"}`}></span><h3 class="text-[12px] font-semibold text-[#3A4050]">{statusLabels[status]}</h3></div><span class="rounded-full bg-white px-2 py-1 text-[9px] font-semibold text-[#858B99] shadow-sm">{ticketsForStatus(filteredTickets, status).length}</span></header>
              <div class="space-y-3">
                {#each ticketsForStatus(filteredTickets, status) as ticket (ticket.id)}
                  <article
                    draggable={data.canReply}
                    on:dragstart={(event) => startDrag(event, ticket.id)}
                    on:dragend={endDrag}
                    class={`group rounded-2xl border bg-white p-4 shadow-[0_5px_18px_rgba(1,13,40,0.04)] transition ${draggingTicketId === ticket.id ? "border-[#000A57] opacity-60" : "border-[#E2E5EC] hover:border-[#C9CEDA]"}`}
                  >
                    <div class="flex items-start gap-2">
                      {#if data.canReply}<GripVertical size={15} class="mt-0.5 shrink-0 cursor-grab text-[#C0C5CF] group-hover:text-[#7B8190]" />{/if}
                      <a href={`/app/tickets/${ticket.id}`} class="min-w-0 flex-1">
                        <div class="flex items-start justify-between gap-3"><span class="text-[9px] font-bold text-[#EA6D0B]">#{ticket.ticketNumber}</span><span class={`shrink-0 rounded-full px-2 py-1 text-[8px] font-bold ${priorityClasses[ticket.priority]}`}>{priorityLabels[ticket.priority]}</span></div>
                        <strong class="mt-2 block text-[12px] font-semibold leading-5 text-[#252B3B]">{ticket.subject}</strong>
                        <div class="mt-3 flex items-center gap-2 text-[9px] text-[#7D8392]"><UserRound size={12} /><span class="truncate">{ticket.customerName ?? "Cliente não identificado"}</span></div>
                        <div class="mt-2 flex items-center gap-2 text-[9px] text-[#7D8392]"><Users size={12} /><span class={`truncate ${ticket.assignedUserName ? "" : "font-semibold text-[#B42318]"}`}>{ticket.assignedUserName ?? "Sem responsável"}</span></div>
                        {#if ticket.channel === "web_chat"}<div class="mt-2 inline-flex items-center gap-1 rounded-lg bg-[#EEF0FF] px-2 py-1 text-[8px] font-semibold text-[#000A57]"><MessageCircleMore size={10} />Chat</div>{/if}
                      </a>
                    </div>
                  </article>
                {:else}
                  <div class="rounded-2xl border border-dashed border-[#D6DAE3] bg-white/50 px-4 py-8 text-center text-[10px] text-[#9A9FAC]">Nenhum ticket neste status</div>
                {/each}
              </div>
            </section>
          {/each}
        </div>
      </div>
    {/if}
  </section>
</div>

{#if createOpen}
  <div class="fixed inset-0 z-[100] flex items-center justify-center bg-[#010D28]/30 p-4 backdrop-blur-[2px]" role="presentation" on:click={() => (createOpen = false)}>
    <section class="max-h-[calc(100vh-2rem)] w-full max-w-[620px] overflow-y-auto rounded-[24px] border border-[#E0E3EA] bg-white shadow-[0_28px_90px_rgba(1,13,40,0.26)]" role="dialog" aria-modal="true" aria-label="Novo ticket" on:click|stopPropagation>
      <header class="flex items-start justify-between gap-4 border-b border-[#EEF0F4] px-5 py-4 sm:px-6">
        <div><span class="text-[10px] font-bold uppercase tracking-[0.08em] text-[#EA6D0B]">Atendimento manual</span><h2 class="mt-1 text-[18px] font-semibold text-[#202637]">Novo ticket</h2><p class="mt-1 text-[10px] leading-5 text-[#858A98]">Para atendimentos iniciados por telefone, WhatsApp ou outro canal manual.</p></div>
        <button type="button" on:click={() => (createOpen = false)} class="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-[#858B99] hover:bg-[#F5F6F9]" aria-label="Fechar"><X size={17} /></button>
      </header>

      <form method="POST" action="?/create" class="grid gap-4 p-5 sm:grid-cols-2 sm:p-6">
        <label class="block sm:col-span-2"><span class="mb-1.5 block text-[11px] font-semibold text-[#4A5060]">Assunto</span><input name="subject" required maxlength="180" autofocus class="h-11 w-full rounded-xl border border-[#DDE1EA] px-3 text-[12px] outline-none focus:border-[#000A57]" /></label>
        <label class="block"><span class="mb-1.5 block text-[11px] font-semibold text-[#4A5060]">Cliente</span><input name="customerName" required maxlength="120" class="h-11 w-full rounded-xl border border-[#DDE1EA] px-3 text-[12px] outline-none focus:border-[#000A57]" /></label>
        <label class="block"><span class="mb-1.5 block text-[11px] font-semibold text-[#4A5060]">Escola / empresa</span><input name="organizationName" maxlength="160" class="h-11 w-full rounded-xl border border-[#DDE1EA] px-3 text-[12px] outline-none focus:border-[#000A57]" /></label>
        <label class="block"><span class="mb-1.5 block text-[11px] font-semibold text-[#4A5060]">E-mail</span><input name="customerEmail" type="email" maxlength="254" class="h-11 w-full rounded-xl border border-[#DDE1EA] px-3 text-[11px] outline-none focus:border-[#000A57]" /></label>
        <label class="block"><span class="mb-1.5 block text-[11px] font-semibold text-[#4A5060]">Telefone</span><input name="customerPhone" maxlength="40" class="h-11 w-full rounded-xl border border-[#DDE1EA] px-3 text-[11px] outline-none focus:border-[#000A57]" /></label>
        <label class="block"><span class="mb-1.5 block text-[11px] font-semibold text-[#4A5060]">Fila</span><select name="queueId" required class="h-11 w-full rounded-xl border border-[#DDE1EA] bg-white px-3 text-[11px] outline-none focus:border-[#000A57]">{#each data.queues as queue}<option value={queue.id}>{queue.name}</option>{/each}</select></label>
        <label class="block"><span class="mb-1.5 block text-[11px] font-semibold text-[#4A5060]">Prioridade</span><select name="priority" class="h-11 w-full rounded-xl border border-[#DDE1EA] bg-white px-3 text-[11px] outline-none focus:border-[#000A57]"><option value="normal">Normal</option><option value="low">Baixa</option><option value="high">Alta</option><option value="urgent">Urgente</option></select></label>
        <label class="block sm:col-span-2"><span class="mb-1.5 block text-[11px] font-semibold text-[#4A5060]">Descrição do atendimento</span><textarea name="message" required maxlength="10000" rows="5" class="w-full resize-y rounded-xl border border-[#DDE1EA] px-3 py-2.5 text-[12px] leading-5 outline-none focus:border-[#000A57]"></textarea></label>
        <div class="flex justify-end gap-2 border-t border-[#EEF0F4] pt-4 sm:col-span-2"><button type="button" on:click={() => (createOpen = false)} class="h-10 rounded-xl border border-[#DDE1EA] px-4 text-[11px] font-semibold text-[#626879]">Cancelar</button><button type="submit" class="inline-flex h-10 items-center gap-2 rounded-xl bg-[#000A57] px-4 text-[11px] font-semibold text-white"><Plus size={15} />Criar ticket</button></div>
      </form>
    </section>
  </div>
{/if}