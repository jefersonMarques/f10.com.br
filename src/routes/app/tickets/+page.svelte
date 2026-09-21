<script lang="ts">
  import { goto, invalidateAll } from "$app/navigation";
  import { CheckCircle2, CircleAlert } from "lucide-svelte";
  import ApplicationContent from "$lib/components/application/ApplicationContent.svelte";
  import TicketBoard from "$lib/components/operations/tickets/TicketBoard.svelte";
  import TicketCreateDialog from "$lib/components/operations/tickets/TicketCreateDialog.svelte";
  import TicketDetailsDrawer from "$lib/components/operations/tickets/TicketDetailsDrawer.svelte";
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
  let cardWorkflowId = "";
  let cardStageId = "";
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

  function cardCurrentAreaStage(): BoardStage | null {
    const areaWorkflowId = card?.workflowContext?.areaWorkflowId;
    const areaStageId = card?.workflowContext?.areaStageId;
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
      if (
        card.workflowContext?.areaWorkflowId
        && data.workflowBoard.areaWorkflows.some(
          (workflow) => workflow.id === card?.workflowContext?.areaWorkflowId,
        )
      ) {
        cardWorkflowId = card.workflowContext.areaWorkflowId;
        cardStageId = card.workflowContext.areaStageId ?? "";
      } else {
        cardWorkflowId = data.workflowBoard.globalWorkflow?.id ?? "";
        cardStageId = card.workflowContext?.globalStageId ?? "";
      }
    } catch {
      window.alert("Não foi possível abrir o ticket.");
    } finally {
      cardLoading = false;
    }
  }

  async function refreshCard(): Promise<void> {
    if (!card) return;
    await openCard(card.details.ticket.id);
  }

  async function postCardAction(
    action: string,
    body: FormData,
    conflictMessage = "Não foi possível concluir a operação.",
  ): Promise<boolean> {
    const response = await fetch(`/app/tickets?/${action}`, { method: "POST", body });
    if (!response.ok) {
      window.alert(response.status === 409 ? conflictMessage : "Não foi possível concluir a operação.");
      return false;
    }
    await invalidateAll();
    await refreshCard();
    return true;
  }

  async function moveCard(): Promise<void> {
    if (!card || !cardWorkflowId || !cardStageId) return;

    const currentAreaWorkflowId = card.workflowContext?.areaWorkflowId;
    if (
      currentAreaWorkflowId
      && cardWorkflowId !== currentAreaWorkflowId
      && cardCurrentAreaStage()?.stageType !== "terminal"
    ) {
      window.alert(AREA_EXIT_MESSAGE);
      return;
    }

    const body = new FormData();
    body.set("ticketId", card.details.ticket.id);
    body.set("workflowId", cardWorkflowId);
    body.set("stageId", cardStageId);
    await postCardAction("moveTicketLocation", body, AREA_EXIT_MESSAGE);
  }

  async function addCardComment(event: SubmitEvent): Promise<void> {
    event.preventDefault();
    if (!card || !card.canCommentInternal) return;
    const formElement = event.currentTarget as HTMLFormElement;
    const formData = new FormData(formElement);
    const bodyValue = String(formData.get("body") ?? "").trim();
    if (!bodyValue) return;
    const response = await fetch(`/app/tickets/${card.details.ticket.id}?/note`, {
      method: "POST",
      body: formData,
    });
    if (!response.ok) {
      window.alert("Não foi possível adicionar o comentário.");
      return;
    }
    formElement.reset();
    await invalidateAll();
    await refreshCard();
  }

  async function addLabel(tagId: string): Promise<void> {
    if (!card) return;
    const body = new FormData();
    body.set("ticketId", card.details.ticket.id);
    body.set("tagId", tagId);
    await postCardAction("addLabel", body);
  }

  async function removeLabel(tagId: string): Promise<void> {
    if (!card) return;
    const body = new FormData();
    body.set("ticketId", card.details.ticket.id);
    body.set("tagId", tagId);
    await postCardAction("removeLabel", body);
  }

  async function createLabel(event: SubmitEvent): Promise<void> {
    event.preventDefault();
    if (!card) return;
    const formElement = event.currentTarget as HTMLFormElement;
    const body = new FormData(formElement);
    body.set("ticketId", card.details.ticket.id);
    if (await postCardAction("createLabel", body)) formElement.reset();
  }

  async function uploadAttachment(event: SubmitEvent): Promise<void> {
    event.preventDefault();
    if (!card) return;
    const formElement = event.currentTarget as HTMLFormElement;
    const body = new FormData(formElement);
    body.set("ticketId", card.details.ticket.id);
    if (await postCardAction("uploadAttachment", body)) formElement.reset();
  }

  async function deleteAttachment(attachmentId: string): Promise<void> {
    if (!card || !confirm("Remover este anexo?")) return;
    const body = new FormData();
    body.set("ticketId", card.details.ticket.id);
    body.set("attachmentId", attachmentId);
    await postCardAction("deleteAttachment", body);
  }
  async function addFollower(userId: string): Promise<void> {
    if (!card) return;
    const body = new FormData();
    body.set("ticketId", card.details.ticket.id);
    body.set("userId", userId);
    if (await postCardAction("addFollower", body)) await refreshCard();
  }

  async function removeFollower(userId: string): Promise<void> {
    if (!card) return;
    const body = new FormData();
    body.set("ticketId", card.details.ticket.id);
    body.set("userId", userId);
    if (await postCardAction("removeFollower", body)) await refreshCard();
  }

</script>

<svelte:head><title>Tickets | F10 Operations</title></svelte:head>

<ApplicationContent width="full">
  {#if form?.message}
    <div class={`mb-3 flex items-center gap-2 rounded-xl border px-4 py-3 text-[11px] ${form.success ? "border-[#B9E6C9] bg-[#F1FBF4] text-[#176B35]" : "border-[#F0C8C8] bg-[#FFF5F5] text-[#9B2C2C]"}`}>
      {#if form.success}<CheckCircle2 size={15}/>{:else}<CircleAlert size={15}/>{/if}{form.message}
    </div>
  {/if}

  <section class="overflow-hidden rounded-[22px] border border-[#E2E5ED] bg-white">
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
      <div class="grid min-h-[680px] xl:grid-cols-[minmax(360px,0.72fr)_minmax(0,1.7fr)]">
        <div class="min-w-0 border-r border-[#E3E6EC] bg-white">
          <TicketList
            tickets={filteredTickets}
            globalWorkflow={data.workflowBoard.globalWorkflow}
            areaWorkflows={data.workflowBoard.areaWorkflows}
            selectedTicketId={card?.details.ticket.id ?? null}
            compact
            onOpenTicket={openCard}
          />
        </div>
        <div class="min-w-0 bg-[#F7F8FA]">
          {#if card}
            <TicketDetailsDrawer
              {card}
              embedded
              canReply={data.canReply}
              workflowBoard={data.workflowBoard}
              bind:cardWorkflowId
              bind:cardStageId
              onClose={() => (card = null)}
              onMove={moveCard}
              onAddComment={addCardComment}
              onAddLabel={addLabel}
              onRemoveLabel={removeLabel}
              onCreateLabel={createLabel}
              onUploadAttachment={uploadAttachment}
              onDeleteAttachment={deleteAttachment}
              onAddFollower={addFollower}
              onRemoveFollower={removeFollower}
              onRefresh={refreshCard}
            />
          {:else if cardLoading}
            <div class="flex min-h-[680px] items-center justify-center text-[11px] font-semibold text-[#777E8D]">Abrindo ticket...</div>
          {:else}
            <div class="flex min-h-[680px] items-center justify-center px-8 text-center text-[11px] text-[#9297A4]">Selecione um ticket para abrir os detalhes.</div>
          {/if}
        </div>
      </div>
    {:else}
      <TicketList
        tickets={filteredTickets}
        globalWorkflow={data.workflowBoard.globalWorkflow}
        areaWorkflows={data.workflowBoard.areaWorkflows}
        onOpenTicket={openCard}
      />
    {/if}

    {#if view !== "board" && data.pagination.totalPages > 1}
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
  <TicketDetailsDrawer
    {card}
    canReply={data.canReply}
    workflowBoard={data.workflowBoard}
    bind:cardWorkflowId
    bind:cardStageId
    onClose={() => (card = null)}
    onMove={moveCard}
    onAddComment={addCardComment}
    onAddLabel={addLabel}
    onRemoveLabel={removeLabel}
    onCreateLabel={createLabel}
    onUploadAttachment={uploadAttachment}
    onDeleteAttachment={deleteAttachment}
    onAddFollower={addFollower}
    onRemoveFollower={removeFollower}
    onRefresh={refreshCard}
  />
{/if}
