<script lang="ts">
  import { goto, invalidateAll } from "$app/navigation";
  import { CheckCircle2, CircleAlert } from "lucide-svelte";
  import ApplicationContent from "$lib/components/application/ApplicationContent.svelte";
  import TicketBoard from "$lib/components/operations/tickets/TicketBoard.svelte";
  import TicketCreateDialog from "$lib/components/operations/tickets/TicketCreateDialog.svelte";
  import TicketDetails from "$lib/components/operations/tickets/TicketDetails.svelte";
  import TicketDetailsModal from "$lib/components/operations/tickets/TicketDetailsModal.svelte";
  import TicketList from "$lib/components/operations/tickets/TicketList.svelte";
  import TicketToolbar from "$lib/components/operations/tickets/TicketToolbar.svelte";
  import type { TicketCardData, TicketScope, TicketView } from "$lib/components/operations/tickets/types";
  import type { ActionData, PageData } from "./$types";

  export let data: PageData;
  export let form: ActionData;

  type Ticket = PageData["tickets"][number];
  type BoardWorkflow = NonNullable<PageData["workflowBoard"]["globalWorkflow"]>;
  type BoardStage = BoardWorkflow["stages"][number];

  const AREA_EXIT_MESSAGE = "Entre na área e conclua o fluxo antes de movimentar o ticket.";

  let scope: TicketScope = data.filters.scope;
  let view: TicketView = data.filters.view;
  let search = data.filters.search;
  let status = data.filters.status ?? "";
  let priority = data.filters.priority ?? "";
  let queueId = data.filters.queueId ?? "";
  let assigneeId = data.filters.assigneeId ?? "";
  let areaId = data.filters.areaId ?? "";
  let stageId = data.filters.stageId ?? "";
  let channel = data.filters.channel ?? "";
  let sla = data.filters.sla ?? "";
  let tagId = data.filters.tagId ?? "";
  let workflowId = areaId
    ? data.workflowBoard.areaWorkflows.find((workflow) => workflow.areaId === areaId)?.id ?? "global"
    : "global";
  let createOpen = false;
  let draggingTicketId: string | null = null;
  let moving = false;
  let card: TicketCardData | null = null;
  let cardLoading = false;
  let splitInitializedFor = "";

  $: if (
    view === "split"
    && data.tickets.length > 0
    && !card
    && !cardLoading
    && splitInitializedFor !== data.tickets[0].id
  ) {
    splitInitializedFor = data.tickets[0].id;
    void openCard(data.tickets[0].id);
  }

  $: activeWorkflow = workflowId === "global"
    ? data.workflowBoard.globalWorkflow
    : data.workflowBoard.areaWorkflows.find((workflow) => workflow.id === workflowId)
      ?? data.workflowBoard.globalWorkflow;

  $: filteredTickets = data.tickets;

  function workspaceUrl(page = 1): string {
    const params = new URLSearchParams();
    if (view !== "board") params.set("view", view);
    if (scope !== "all") params.set("scope", scope);
    if (search.trim()) params.set("q", search.trim());
    if (status) params.set("status", status);
    if (priority) params.set("priority", priority);
    if (queueId) params.set("queueId", queueId);
    if (assigneeId) params.set("assigneeId", assigneeId);
    if (areaId) params.set("areaId", areaId);
    if (stageId) params.set("stageId", stageId);
    if (channel) params.set("channel", channel);
    if (sla) params.set("sla", sla);
    if (tagId) params.set("tagId", tagId);
    if (page > 1) params.set("page", String(page));
    const query = params.toString();
    return query ? `/app/tickets?${query}` : "/app/tickets";
  }

  function applyFilters(): void {
    if (areaId) {
      workflowId = data.workflowBoard.areaWorkflows.find(
        (workflow) => workflow.areaId === areaId,
      )?.id ?? workflowId;
    } else if (view === "board") {
      workflowId = "global";
    }
    void goto(workspaceUrl(1), { keepFocus: true, noScroll: true });
  }

  function clearFilters(): void {
    status = "";
    priority = "";
    queueId = "";
    assigneeId = "";
    areaId = "";
    stageId = "";
    channel = "";
    sla = "";
    tagId = "";
    applyFilters();
  }

  function goToPage(page: number): void {
    void goto(workspaceUrl(page), { keepFocus: true, noScroll: true });
  }

  function ticketStageId(ticket: Ticket): string | null {
    if (!activeWorkflow) return null;
    if (activeWorkflow.kind === "global") return ticket.workflowState?.globalStageId ?? null;
    return ticket.workflowState?.areaWorkflowId === activeWorkflow.id
      ? ticket.workflowState?.areaStageId ?? null
      : null;
  }

  function currentAreaStage(ticket: Ticket): BoardStage | null {
    const areaWorkflowId = ticket.workflowState?.areaWorkflowId;
    const areaStageId = ticket.workflowState?.areaStageId;
    if (!areaWorkflowId || !areaStageId) return null;
    const workflow = data.workflowBoard.areaWorkflows.find((item) => item.id === areaWorkflowId);
    return workflow?.stages.find((stage) => stage.id === areaStageId) ?? null;
  }

  function startDrag(event: DragEvent, ticketId: string): void {
    if (!data.canReply) return;
    draggingTicketId = ticketId;
    event.dataTransfer?.setData("text/plain", ticketId);
    if (event.dataTransfer) event.dataTransfer.effectAllowed = "move";
  }

  async function dropTicket(event: DragEvent, stageId: string): Promise<void> {
    event.preventDefault();
    if (!data.canReply || !activeWorkflow || moving) return;
    const ticketId = draggingTicketId ?? event.dataTransfer?.getData("text/plain") ?? "";
    const ticket = data.tickets.find((item) => item.id === ticketId);
    if (!ticket || ticketStageId(ticket) === stageId) return;

    if (
      activeWorkflow.kind === "global"
      && ticket.workflowState?.areaWorkflowId
      && currentAreaStage(ticket)?.stageType !== "terminal"
    ) {
      window.alert(AREA_EXIT_MESSAGE);
      draggingTicketId = null;
      return;
    }

    moving = true;
    try {
      const body = new FormData();
      body.set("ticketId", ticketId);
      body.set("stageId", stageId);
      body.set("workflowKind", activeWorkflow.kind);
      const response = await fetch("/app/tickets?/moveWorkflowStage", { method: "POST", body });
      if (!response.ok) {
        window.alert(response.status === 409 && ticket.workflowState?.areaWorkflowId
          ? AREA_EXIT_MESSAGE
          : "Não foi possível mover o ticket para esta coluna.");
      } else {
        await invalidateAll();
      }
    } finally {
      moving = false;
      draggingTicketId = null;
    }
  }

  async function openCard(ticketId: string): Promise<void> {
    cardLoading = true;
    card = null;
    splitInitializedFor = ticketId;
    try {
      const response = await fetch(`/app/tickets/${ticketId}/card`, { cache: "no-store" });
      if (!response.ok) throw new Error("CARD_LOAD_FAILED");
      card = await response.json() as TicketCardData;
    } catch {
      window.alert("Não foi possível abrir o ticket.");
    } finally {
      cardLoading = false;
    }
  }

  async function refreshCard(): Promise<void> {
    if (!card) return;
    const ticketId = card.details.ticket.id;

    try {
      const response = await fetch(`/app/tickets/${ticketId}/card`, { cache: "no-store" });
      if (!response.ok) throw new Error("CARD_REFRESH_FAILED");
      card = await response.json() as TicketCardData;
    } catch {
      window.alert("Não foi possível atualizar o ticket.");
    }
  }


</script>

<svelte:head><title>Tickets | F10 Operations</title></svelte:head>

<ApplicationContent
  width="full"
  padding={view === "split" ? "none" : "default"}
  className={view === "split" ? "bg-[#F5F6FA] lg:h-[calc(100dvh-var(--application-header-height))] lg:min-h-[620px] lg:overflow-hidden" : ""}
>
  {#if form?.message}
    <div class={`mb-3 flex items-center gap-2 rounded-xl border px-4 py-3 text-[11px] ${form.success ? "border-[#B9E6C9] bg-[#F1FBF4] text-[#176B35]" : "border-[#F0C8C8] bg-[#FFF5F5] text-[#9B2C2C]"}`}>
      {#if form.success}<CheckCircle2 size={15}/>{:else}<CircleAlert size={15}/>{/if}{form.message}
    </div>
  {/if}

  <section class={view === "split"
    ? "flex min-h-[680px] flex-col gap-3 p-3 lg:h-full lg:min-h-0 lg:gap-4 lg:p-4"
    : "overflow-hidden rounded-[22px] border border-[#E2E5ED] bg-white"}>
    <TicketToolbar
      bind:scope
      bind:view
      bind:search
      bind:status
      bind:priority
      bind:queueId
      bind:assigneeId
      bind:areaId
      bind:stageId
      bind:channel
      bind:sla
      bind:tagId
      queues={data.filterOptions.queues}
      agents={data.filterOptions.agents}
      labels={data.filterOptions.labels}
      workflowBoard={data.workflowBoard}
      canManageWorkflow={data.canManageWorkflow}
      canCreate={data.canCreate}
      onApply={applyFilters}
      onClear={clearFilters}
      onCreate={() => (createOpen = true)}
      workspace={view === "split"}
    />

    {#if view === "board"}
      {#if data.pagination.boardLimited}
        <div class="border-b border-[#F1DFC8] bg-[#FFF8EF] px-4 py-2.5 text-[11px] font-medium text-[#8A531F]">
          Muitos tickets neste quadro. Refine os filtros para visualizar além dos primeiros {data.pagination.pageSize}.
        </div>
      {/if}
      <TicketBoard
        bind:workflowId
        {activeWorkflow}
        areaWorkflows={data.workflowBoard.areaWorkflows}
        tickets={filteredTickets}
        canReply={data.canReply}
        onDropTicket={dropTicket}
        onStartDrag={startDrag}
        onOpenTicket={openCard}
      />
    {:else if view === "split"}
      <div class="grid min-h-[680px] gap-3 lg:min-h-0 lg:flex-1 lg:grid-cols-[315px_minmax(0,1fr)] lg:gap-4">
        <aside class="flex min-h-0 flex-col overflow-hidden rounded-[22px] border border-[#E2E5ED] bg-white shadow-[0_12px_32px_rgba(1,13,40,0.05)]">
          <div class="min-h-0 flex-1">
            <TicketList
              tickets={filteredTickets}
              globalWorkflow={data.workflowBoard.globalWorkflow}
              areaWorkflows={data.workflowBoard.areaWorkflows}
              selectedTicketId={card?.details.ticket.id ?? null}
              compact
              onOpenTicket={openCard}
            />
          </div>

          {#if data.pagination.totalPages > 1}
            <div class="flex shrink-0 items-center justify-between gap-2 border-t border-[#EEF0F5] bg-white px-3 py-2.5">
              <button type="button" disabled={data.pagination.page <= 1} on:click={() => goToPage(data.pagination.page - 1)} class="application-text-meta h-8 rounded-lg border border-[#DDE1EA] bg-white px-2.5 font-semibold text-[#000A57] disabled:opacity-40">Anterior</button>
              <span class="application-text-meta font-semibold text-[#737989]">{data.pagination.page} / {data.pagination.totalPages}</span>
              <button type="button" disabled={data.pagination.page >= data.pagination.totalPages} on:click={() => goToPage(data.pagination.page + 1)} class="application-text-meta h-8 rounded-lg border border-[#DDE1EA] bg-white px-2.5 font-semibold text-[#000A57] disabled:opacity-40">Próxima</button>
            </div>
          {/if}
        </aside>

        <main class="min-h-[680px] min-w-0 overflow-hidden rounded-[22px] border border-[#E2E5ED] bg-white shadow-[0_12px_32px_rgba(1,13,40,0.05)] lg:min-h-0">
          {#if card}
            <TicketDetails ticketData={card} surface="split" onRefresh={refreshCard}/>
          {:else if cardLoading}
            <div class="flex h-full min-h-[680px] items-center justify-center text-[11px] font-semibold text-[#777E8D] lg:min-h-0">Abrindo ticket...</div>
          {:else}
            <div class="flex h-full min-h-[680px] items-center justify-center px-8 text-center text-[11px] text-[#9297A4] lg:min-h-0">Selecione um ticket para abrir os detalhes.</div>
          {/if}
        </main>
      </div>
    {:else}
      <TicketList
        tickets={filteredTickets}
        globalWorkflow={data.workflowBoard.globalWorkflow}
        areaWorkflows={data.workflowBoard.areaWorkflows}
        onOpenTicket={openCard}
      />
    {/if}

    {#if view === "list" && data.pagination.totalPages > 1}
      <div class="flex items-center justify-between gap-3 border-t border-[#EEF0F5] px-4 py-3">
        <span class="application-text-meta text-[#858B99]">{data.pagination.total} tickets</span>
        <div class="flex items-center gap-2">
          <button type="button" disabled={data.pagination.page <= 1} on:click={() => goToPage(data.pagination.page - 1)} class="application-text-meta h-9 rounded-lg border border-[#DDE1EA] bg-white px-3 font-semibold text-[#000A57] disabled:opacity-40">Anterior</button>
          <span class="application-text-meta font-semibold text-[#626978]">{data.pagination.page} / {data.pagination.totalPages}</span>
          <button type="button" disabled={data.pagination.page >= data.pagination.totalPages} on:click={() => goToPage(data.pagination.page + 1)} class="application-text-meta h-9 rounded-lg border border-[#DDE1EA] bg-white px-3 font-semibold text-[#000A57] disabled:opacity-40">Próxima</button>
        </div>
      </div>
    {/if}
  </section>
</ApplicationContent>

{#if createOpen}
  <TicketCreateDialog queues={data.queues} entryPoints={data.entryPoints} canSearchCustomers={data.canSearchCustomers} onClose={() => (createOpen = false)}/>
{/if}

{#if cardLoading && view !== "split"}
  <div class="fixed inset-0 z-[120] flex items-center justify-center bg-[#010D28]/40"><div class="rounded-2xl bg-white px-5 py-4 text-[11px] font-semibold text-[#4D5464]">Abrindo ticket...</div></div>
{/if}

{#if card && view !== "split"}
  <TicketDetailsModal ticketData={card} onClose={() => (card = null)} onRefresh={refreshCard}/>
{/if}
