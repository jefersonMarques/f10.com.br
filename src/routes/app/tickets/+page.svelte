<script lang="ts">
  import { invalidateAll } from "$app/navigation";
  import {
    ArrowLeft,
    ArrowRight,
    Boxes,
    CheckCircle2,
    CircleAlert,
    Columns3,
    ExternalLink,
    FileText,
    GitBranch,
    List,
    Paperclip,
    Plus,
    Search,
    Settings2,
    Tag,
    Trash2,
    UserRound,
    X,
  } from "lucide-svelte";
  import ApplicationContent from "$lib/components/application/ApplicationContent.svelte";
  import type { ActionData, PageData } from "./$types";

  export let data: PageData;
  export let form: ActionData;

  type Scope = "mine" | "unassigned" | "all";
  type View = "board" | "list";
  type Ticket = PageData["tickets"][number];
  type BoardWorkflow = NonNullable<PageData["workflowBoard"]["globalWorkflow"]>;
  type BoardStage = BoardWorkflow["stages"][number];
  type CardLabel = { id: string; name: string; color: string };
  type CardAttachment = {
    id: string;
    originalName: string;
    contentType: string;
    sizeBytes: number;
    uploadedByName: string | null;
    createdAt: string | Date;
    href: string;
    previewable: boolean;
  };
  type CardData = {
    details: {
      ticket: {
        id: string;
        ticketNumber: number;
        subject: string;
        status: string;
        priority: string;
        queueName: string;
        assignedUserName: string | null;
        customerName: string | null;
        customerEmail: string | null;
        organizationName: string | null;
        createdAt: string | Date;
      };
      messages: Array<{
        id: string;
        authorType: string;
        authorUserName: string | null;
        customerName: string | null;
        visibility: string;
        body: string;
        createdAt: string | Date;
      }>;
      events: Array<{
        id: string;
        eventType: string;
        actorName: string | null;
        createdAt: string | Date;
      }>;
    };
    workflowContext: {
      globalWorkflowId: string;
      globalStageId: string;
      areaId: string | null;
      areaWorkflowId: string | null;
      areaStageId: string | null;
      globalStageName: string;
      areaName: string | null;
      areaStageName: string | null;
    } | null;
    labels: CardLabel[];
    selectedLabels: CardLabel[];
    attachments: CardAttachment[];
    attachmentsEnabled: boolean;
  };

  const AREA_EXIT_MESSAGE = "Entre na área e conclua o fluxo antes de movimentar o ticket.";

  const priorityLabels: Record<string, string> = {
    low: "Baixa",
    normal: "Normal",
    high: "Alta",
    urgent: "Urgente",
  };

  const eventLabels: Record<string, string> = {
    "ticket.created": "criou o ticket",
    "ticket.replied": "registrou uma resposta",
    "ticket.note.added": "adicionou uma nota interna",
    "ticket.workflow.global.moved": "moveu o ticket no fluxo global",
    "ticket.workflow.area.moved": "moveu o ticket dentro da área",
    "ticket.workflow.handoff": "encaminhou o ticket para outra área",
    "ticket.label.added": "adicionou uma etiqueta",
    "ticket.label.removed": "removeu uma etiqueta",
    "ticket.attachment.added": "adicionou um anexo",
    "ticket.attachment.removed": "removeu um anexo",
  };

  const labelClasses: Record<string, string> = {
    green: "bg-[#D9F2E3] text-[#23643C]",
    yellow: "bg-[#FFF0B8] text-[#775D00]",
    orange: "bg-[#FFE0C2] text-[#8D4A0B]",
    red: "bg-[#FFDADA] text-[#8D2B2B]",
    purple: "bg-[#E8DDF8] text-[#654391]",
    blue: "bg-[#DDE3FF] text-[#243B8A]",
    sky: "bg-[#D9F0FA] text-[#27637B]",
    lime: "bg-[#E5F2C9] text-[#526C20]",
    pink: "bg-[#F7DDEA] text-[#8B3F64]",
    gray: "bg-[#E8E9ED] text-[#5E6470]",
  };

  const stageColumnClasses: Record<string, string> = {
    gray: "border-[#E0E3EB] bg-[#F5F6F8]",
    blue: "border-[#C9D4F6] bg-[#EEF3FF]",
    green: "border-[#C8E3D0] bg-[#F0F8F2]",
    yellow: "border-[#E8DDA9] bg-[#FFF9DF]",
    orange: "border-[#F0C89F] bg-[#FFF4E8]",
    red: "border-[#EBC4C4] bg-[#FFF0F0]",
    purple: "border-[#D9C9EC] bg-[#F7F0FF]",
    sky: "border-[#C8E1EB] bg-[#EDF8FC]",
    lime: "border-[#D8E6B7] bg-[#F6FBE7]",
    pink: "border-[#E8C9D8] bg-[#FFF1F8]",
  };

  let scope: Scope = "mine";
  let view: View = "board";
  let search = "";
  let workflowId = "global";
  let createOpen = false;
  let draggingTicketId: string | null = null;
  let moving = false;
  let card: CardData | null = null;
  let cardLoading = false;
  let cardWorkflowId = "";
  let cardStageId = "";

  $: activeWorkflow = workflowId === "global"
    ? data.workflowBoard.globalWorkflow
    : data.workflowBoard.areaWorkflows.find((workflow) => workflow.id === workflowId)
      ?? data.workflowBoard.globalWorkflow;
  $: stages = activeWorkflow?.stages ?? [];
  $: filteredTickets = data.tickets.filter((ticket) => {
    if (scope === "mine" && ticket.assignedUserId !== data.currentUserId) return false;
    if (scope === "unassigned" && ticket.assignedUserId) return false;
    const query = search.trim().toLocaleLowerCase("pt-BR");
    if (!query) return true;
    return [ticket.ticketNumber, ticket.subject, ticket.customerName, ticket.organizationName, ticket.queueName]
      .filter(Boolean)
      .join(" ")
      .toLocaleLowerCase("pt-BR")
      .includes(query);
  });
  $: cardWorkflow = cardWorkflowId === data.workflowBoard.globalWorkflow?.id
    ? data.workflowBoard.globalWorkflow
    : data.workflowBoard.areaWorkflows.find((workflow) => workflow.id === cardWorkflowId) ?? null;
  $: cardStages = cardWorkflow?.stages ?? [];
  $: movableAreaWorkflows = data.workflowBoard.areaWorkflows.filter((workflow) =>
    Boolean(
      workflow.areaId
      && data.workflowBoard.globalWorkflow?.stages.some(
        (stage) => stage.stageType === "area_gateway" && stage.linkedAreaId === workflow.areaId,
      )
    ),
  );

  function ticketStageId(ticket: Ticket): string | null {
    if (!activeWorkflow) return null;
    if (activeWorkflow.kind === "global") return ticket.workflowState?.globalStageId ?? null;
    return ticket.workflowState?.areaWorkflowId === activeWorkflow.id
      ? ticket.workflowState?.areaStageId ?? null
      : null;
  }

  function ticketsForStage(stageId: string): Ticket[] {
    return filteredTickets.filter((ticket) => ticketStageId(ticket) === stageId);
  }

  function formatDateTime(value: string | Date): string {
    return new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" }).format(new Date(value));
  }

  function formatBytes(value: number): string {
    if (value < 1024) return `${value} B`;
    if (value < 1024 * 1024) return `${(value / 1024).toFixed(1)} KB`;
    return `${(value / (1024 * 1024)).toFixed(1)} MB`;
  }

  function areaWorkflowByAreaId(areaId: string | null | undefined) {
    if (!areaId) return null;
    return data.workflowBoard.areaWorkflows.find((workflow) => workflow.areaId === areaId) ?? null;
  }

  function enterArea(areaId: string | null | undefined): void {
    const workflow = areaWorkflowByAreaId(areaId);
    if (workflow) workflowId = workflow.id;
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

  function stageColumnClass(stage: BoardStage): string {
    if (activeWorkflow?.kind === "area") {
      return stageColumnClasses[stage.color ?? "gray"] ?? stageColumnClasses.gray;
    }
    if (stage.stageType === "area_gateway") return "border-[#E8C49F] bg-[#FFF8F1]";
    if (stage.stageType === "terminal") return "border-[#CDE5D4] bg-[#F7FBF8]";
    return "border-[#E0E3EB] bg-[#F5F6F8]";
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
    try {
      const response = await fetch(`/app/tickets/${ticketId}/card`, { cache: "no-store" });
      if (!response.ok) throw new Error("CARD_LOAD_FAILED");
      card = await response.json() as CardData;
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

  function changeCardWorkflow(event: Event): void {
    const selectedWorkflowId = (event.currentTarget as HTMLSelectElement).value;
    cardWorkflowId = selectedWorkflowId;
    const selectedWorkflow = selectedWorkflowId === data.workflowBoard.globalWorkflow?.id
      ? data.workflowBoard.globalWorkflow
      : data.workflowBoard.areaWorkflows.find((workflow) => workflow.id === selectedWorkflowId) ?? null;
    cardStageId = selectedWorkflow?.stages[0]?.id ?? "";
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
    if (!card || !data.canReply) return;
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
</script>

<svelte:head><title>Tickets | F10 Operations</title></svelte:head>

<ApplicationContent width="full">
  {#if form?.message}<div class={`mb-3 flex items-center gap-2 rounded-xl border px-4 py-3 text-[11px] ${form.success ? "border-[#B9E6C9] bg-[#F1FBF4] text-[#176B35]" : "border-[#F0C8C8] bg-[#FFF5F5] text-[#9B2C2C]"}`}>{#if form.success}<CheckCircle2 size={15}/>{:else}<CircleAlert size={15}/>{/if}{form.message}</div>{/if}

  <section class="overflow-hidden rounded-[22px] border border-[#E2E5ED] bg-white">
    <div class="flex flex-col gap-3 border-b border-[#EEF0F5] p-4 lg:flex-row lg:items-center lg:justify-between">
      <div class="flex rounded-xl bg-[#F3F4F7] p-1">
        <button type="button" on:click={() => (scope = "mine")} class={`application-text-meta h-8 rounded-lg px-3 font-semibold ${scope === "mine" ? "bg-white text-[#000A57] shadow-sm" : "text-[#737989]"}`}>Minha fila</button>
        <button type="button" on:click={() => (scope = "unassigned")} class={`application-text-meta h-8 rounded-lg px-3 font-semibold ${scope === "unassigned" ? "bg-white text-[#000A57] shadow-sm" : "text-[#737989]"}`}>Sem responsável</button>
        <button type="button" on:click={() => (scope = "all")} class={`application-text-meta h-8 rounded-lg px-3 font-semibold ${scope === "all" ? "bg-white text-[#000A57] shadow-sm" : "text-[#737989]"}`}>Todos</button>
      </div>
      <div class="flex flex-wrap items-center gap-2">
        <label class="relative min-w-[240px] flex-1 lg:min-w-[280px]"><Search size={14} class="absolute left-3 top-1/2 -translate-y-1/2 text-[#9499A5]"/><input bind:value={search} placeholder="Buscar ticket, cliente ou área" class="application-text-caption h-10 w-full rounded-xl border border-[#DDE1EA] bg-[#FAFAFC] pl-9 pr-3"/></label>
        <div class="flex rounded-xl bg-[#F3F4F7] p-1"><button type="button" on:click={() => (view = "board")} class={`application-text-meta flex h-8 items-center gap-1 rounded-lg px-2 ${view === "board" ? "bg-white text-[#000A57]" : "text-[#737989]"}`}><Columns3 size={13}/>Quadro</button><button type="button" on:click={() => (view = "list")} class={`application-text-meta flex h-8 items-center gap-1 rounded-lg px-2 ${view === "list" ? "bg-white text-[#000A57]" : "text-[#737989]"}`}><List size={13}/>Lista</button></div>
        {#if data.canManageWorkflow}<a href="/app/tickets/workflows" class="application-text-caption inline-flex h-10 items-center gap-2 rounded-xl border border-[#DDE1EA] bg-white px-3 font-semibold text-[#000A57]"><Settings2 size={14}/>Configurar</a>{/if}
        {#if data.canCreate}<button type="button" on:click={() => (createOpen = true)} class="application-text-caption inline-flex h-10 items-center gap-2 rounded-xl bg-[#000A57] px-4 font-semibold text-white"><Plus size={14}/>Novo ticket</button>{/if}
      </div>
    </div>

    {#if view === "board"}
      <div class="flex flex-col gap-3 border-b border-[#EEF0F5] p-4 sm:flex-row sm:items-center sm:justify-between">
        <div class="flex flex-wrap items-center gap-3">
          {#if activeWorkflow?.kind === "area"}
            <button type="button" on:click={() => (workflowId = "global")} class="application-text-meta inline-flex h-9 items-center gap-1.5 rounded-lg border border-[#D9DDE5] bg-white px-3 font-semibold text-[#4E5565] shadow-sm hover:border-[#C7CBD4] hover:bg-[#F8F9FB]"><ArrowLeft size={13}/>Voltar ao nível anterior</button>
          {/if}
          <div class="flex items-center gap-2">{#if activeWorkflow?.kind === "area"}<Boxes size={15} class="text-[#EA6D0B]"/>{:else}<GitBranch size={15} class="text-[#000A57]"/>{/if}<div><strong class="application-text-caption block text-[#343B4B]">{activeWorkflow?.kind === "area" ? `${activeWorkflow.areaName} · processo interno` : "Kanban global"}</strong><span class="application-text-meta text-[#858B99]">{activeWorkflow?.kind === "area" ? "Conclua uma coluna terminal antes de devolver o ticket ao fluxo global." : "Clique na seta de uma coluna de área para abrir seu processo interno."}</span></div></div>
        </div>
        <select bind:value={workflowId} class="application-text-meta h-10 rounded-xl border border-[#DDE1EA] bg-white px-3 font-semibold"><option value="global">Visão global</option>{#each data.workflowBoard.areaWorkflows as workflow}<option value={workflow.id}>{workflow.areaName}</option>{/each}</select>
      </div>

      <div class="overflow-x-auto p-4">
        <div class="grid min-w-max gap-4" style={`grid-template-columns: repeat(${Math.max(stages.length, 1)}, minmax(280px, 300px));`}>
          {#each stages as stage}
            <section class={`min-h-[390px] rounded-[16px] border p-3 ${stageColumnClass(stage)}`} role="group" aria-label={`Coluna ${stage.name}`} on:dragover|preventDefault on:drop={(event) => void dropTicket(event, stage.id)}>
              <header class="mb-3 flex items-start justify-between gap-3">
                <div>
                  <strong class="text-[11px] text-[#303746]">{stage.name}</strong>
                  {#if stage.stageType === "area_gateway"}<span class="application-text-meta mt-1 flex items-center gap-1 font-semibold text-[#A76225]"><Boxes size={10}/>Área · {stage.linkedAreaName}</span>{/if}
                  {#if activeWorkflow?.kind === "area" && stage.stageType === "terminal"}<span class="application-text-meta mt-1 block font-semibold text-[#36754A]">Fluxo da área concluído nesta coluna</span>{/if}
                </div>
                <div class="flex items-center gap-1.5">
                  <span class="application-text-meta rounded-full bg-white px-2 py-1 text-[#777D8C] shadow-sm">{ticketsForStage(stage.id).length}</span>
                  {#if stage.stageType === "area_gateway" && stage.linkedAreaId && areaWorkflowByAreaId(stage.linkedAreaId)}
                    <button type="button" title={`Entrar na área ${stage.linkedAreaName ?? stage.name}`} aria-label={`Entrar na área ${stage.linkedAreaName ?? stage.name}`} on:click={() => enterArea(stage.linkedAreaId)} class="flex h-7 w-7 items-center justify-center rounded-lg border border-[#E4C49F] bg-white text-[#A76225] shadow-sm hover:bg-[#FFF2E5]"><ArrowRight size={13}/></button>
                  {/if}
                </div>
              </header>

              <div class="space-y-2.5">
                {#each ticketsForStage(stage.id) as ticket (ticket.id)}
                  <article draggable={data.canReply} on:dragstart={(event) => startDrag(event, ticket.id)} class="rounded-xl border border-[#DDE1E8] bg-white p-3 shadow-[0_2px_8px_rgba(9,30,66,0.08)] transition hover:border-[#B9C0CE] hover:shadow-[0_5px_16px_rgba(9,30,66,0.12)]">
                    <button type="button" on:click={() => void openCard(ticket.id)} class="block w-full text-left">
                      {#if ticket.labels.length > 0}<div class="mb-2 flex flex-wrap gap-1">{#each ticket.labels.slice(0, 5) as label}<span class={`h-2 w-10 rounded-full ${labelClasses[label.color] ?? labelClasses.gray}`} title={label.name}></span>{/each}</div>{/if}
                      <div class="flex items-start justify-between gap-2"><span class="application-text-meta font-bold text-[#EA6D0B]">#{ticket.ticketNumber}</span><span class="application-text-meta text-[#7C8290]">{priorityLabels[ticket.priority]}</span></div>
                      <strong class="mt-1.5 block text-[11px] font-semibold leading-4 text-[#252B3B]">{ticket.subject}</strong>
                      <div class="application-text-meta mt-3 flex items-center gap-1.5 text-[#7D8392]"><UserRound size={11}/><span class="truncate">{ticket.customerName ?? "Cliente não identificado"}</span></div>
                      <div class="application-text-meta mt-1.5 truncate text-[#9297A5]">{ticket.assignedUserName ?? "Sem responsável"}</div>
                    </button>
                  </article>
                {:else}<div class="application-text-meta rounded-xl border border-dashed border-[#D2D6DF] bg-white/60 p-7 text-center text-[#9A9FAC]">Sem tickets</div>{/each}
              </div>
            </section>
          {/each}
        </div>
      </div>
    {:else}
      <div class="divide-y divide-[#EEF0F4]">
        {#each filteredTickets as ticket}
          <button type="button" on:click={() => void openCard(ticket.id)} class="grid w-full gap-2 px-5 py-4 text-left hover:bg-[#F8F9FC] md:grid-cols-[100px_1.6fr_1fr_1fr_180px]"><span class="application-text-meta font-bold text-[#EA6D0B]">#{ticket.ticketNumber}</span><div><strong class="block truncate text-[11px] text-[#2D3342]">{ticket.subject}</strong>{#if ticket.labels.length > 0}<div class="mt-1 flex gap-1">{#each ticket.labels.slice(0, 4) as label}<span class={`application-text-meta rounded px-1.5 py-0.5 font-semibold ${labelClasses[label.color] ?? labelClasses.gray}`}>{label.name}</span>{/each}</div>{/if}</div><span class="application-text-meta truncate text-[#667080]">{ticket.customerName ?? "Cliente"}</span><span class="application-text-meta truncate text-[#667080]">{ticket.queueName}</span><span class="application-text-meta font-semibold text-[#000A57]">{data.workflowBoard.globalWorkflow?.stages.find((stage) => stage.id === ticket.workflowState?.globalStageId)?.name ?? "Sem etapa"}</span></button>
        {/each}
      </div>
    {/if}
  </section>
</ApplicationContent>

{#if createOpen}
  <div class="fixed inset-0 z-[100] flex items-center justify-center bg-[#010D28]/35 p-4" role="presentation">
    <button type="button" class="absolute inset-0 cursor-default" aria-label="Fechar novo ticket" on:click={() => (createOpen = false)}></button>
    <div class="relative z-10 w-full max-w-[620px] rounded-[22px] bg-white p-5" role="dialog" aria-modal="true" aria-label="Novo ticket">
      <form method="POST" action="?/create" class="grid gap-3 sm:grid-cols-2">
        <div class="flex items-center justify-between sm:col-span-2"><h2 class="text-[16px] font-semibold">Novo ticket</h2><button type="button" on:click={() => (createOpen = false)}><X size={16}/></button></div>
        <input name="subject" required maxlength="180" placeholder="Assunto" class="application-text-caption h-10 rounded-xl border border-[#DDE1EA] px-3 sm:col-span-2"/>
        <input name="customerName" required maxlength="120" placeholder="Cliente" class="application-text-caption h-10 rounded-xl border border-[#DDE1EA] px-3"/>
        <input name="organizationName" maxlength="160" placeholder="Escola / empresa" class="application-text-caption h-10 rounded-xl border border-[#DDE1EA] px-3"/>
        <input name="customerEmail" type="email" maxlength="254" placeholder="E-mail" class="application-text-caption h-10 rounded-xl border border-[#DDE1EA] px-3"/>
        <input name="customerPhone" maxlength="40" placeholder="Telefone" class="application-text-caption h-10 rounded-xl border border-[#DDE1EA] px-3"/>
        <select name="queueId" required class="application-text-meta h-10 rounded-xl border border-[#DDE1EA] px-2">{#each data.queues as queue}<option value={queue.id}>{queue.name}</option>{/each}</select>
        <select name="priority" class="application-text-meta h-10 rounded-xl border border-[#DDE1EA] px-2"><option value="normal">Normal</option><option value="low">Baixa</option><option value="high">Alta</option><option value="urgent">Urgente</option></select>
        <textarea name="message" required maxlength="10000" rows="5" placeholder="Descrição do atendimento" class="application-text-caption rounded-xl border border-[#DDE1EA] p-3 sm:col-span-2"></textarea>
        <button class="application-text-meta h-10 rounded-xl bg-[#000A57] font-semibold text-white sm:col-span-2">Criar ticket</button>
      </form>
    </div>
  </div>
{/if}

{#if cardLoading}
  <div class="fixed inset-0 z-[120] flex items-center justify-center bg-[#010D28]/40"><div class="rounded-2xl bg-white px-5 py-4 text-[11px] font-semibold text-[#4D5464]">Abrindo ticket...</div></div>
{/if}

{#if card}
  <div class="fixed inset-0 z-[120] overflow-y-auto bg-[#010D28]/45 p-3 sm:p-6" role="presentation">
    <button type="button" class="fixed inset-0 cursor-default" aria-label={`Fechar ticket ${card.details.ticket.ticketNumber}`} on:click={() => (card = null)}></button>
    <div class="relative z-10 mx-auto grid min-h-[680px] w-full max-w-[1120px] overflow-hidden rounded-[20px] border border-[#D8DCE5] bg-[#F7F8FA] shadow-[0_30px_100px_rgba(1,13,40,0.35)] lg:grid-cols-[minmax(0,1.65fr)_minmax(330px,0.85fr)]" role="dialog" aria-modal="true" aria-label={`Ticket ${card.details.ticket.ticketNumber}`}>
      <div class="min-w-0 bg-white">
        <header class="flex items-start gap-3 border-b border-[#E5E7EC] px-5 py-5 sm:px-7">
          <FileText size={20} class="mt-1 shrink-0 text-[#5E6574]"/>
          <div class="min-w-0 flex-1"><div class="flex flex-wrap items-center gap-2"><span class="application-text-meta font-bold text-[#EA6D0B]">#{card.details.ticket.ticketNumber}</span><span class="application-text-meta text-[#7C8290]">{priorityLabels[card.details.ticket.priority]}</span></div><h2 class="mt-1 text-[23px] font-semibold leading-8 text-[#2B303A]">{card.details.ticket.subject}</h2><p class="application-text-meta mt-1 text-[#858B99]">{card.workflowContext?.areaName ? `${card.workflowContext.areaName} · ${card.workflowContext.areaStageName ?? card.workflowContext.globalStageName}` : card.workflowContext?.globalStageName ?? "Fluxo global"}</p></div>
          <button type="button" on:click={() => (card = null)} class="flex h-9 w-9 items-center justify-center rounded-lg text-[#6F7685] hover:bg-[#F0F1F4]"><X size={18}/></button>
        </header>

        <div class="space-y-7 px-5 py-6 sm:px-7">
          <section><div class="flex flex-wrap items-center gap-2">{#each card.selectedLabels as label}<button type="button" on:click={() => data.canReply && void removeLabel(label.id)} class={`application-text-meta rounded px-2.5 py-1.5 font-semibold ${labelClasses[label.color] ?? labelClasses.gray}`}>{label.name}{#if data.canReply}<span class="ml-1">×</span>{/if}</button>{/each}</div></section>

          <section><h3 class="text-[13px] font-semibold text-[#343A46]">Descrição</h3><div class="mt-3 whitespace-pre-wrap rounded-xl border border-[#E4E6EB] bg-[#FAFAFC] p-4 text-[11px] leading-6 text-[#555D6C]">{card.details.messages[0]?.body ?? "Sem descrição registrada."}</div></section>

          <section>
            <div class="flex items-center justify-between"><h3 class="flex items-center gap-2 text-[13px] font-semibold text-[#343A46]"><Paperclip size={15}/>Anexos</h3><span class="application-text-meta text-[#8B909D]">{card.attachments.length}</span></div>
            <div class="mt-3 space-y-3">
              {#each card.attachments as attachment}
                <article class="flex gap-3 rounded-xl border border-[#E1E4E9] bg-[#FAFAFC] p-3">
                  {#if attachment.contentType.startsWith("image/")}<a href={attachment.href} target="_blank" rel="noreferrer" class="h-20 w-28 shrink-0 overflow-hidden rounded-lg border border-[#E2E5EA] bg-white"><img src={attachment.href} alt={attachment.originalName} class="h-full w-full object-cover"/></a>{:else}<a href={attachment.href} target="_blank" rel="noreferrer" class="flex h-20 w-28 shrink-0 items-center justify-center rounded-lg border border-[#E2E5EA] bg-white text-[#7A8190]"><Paperclip size={22}/></a>{/if}
                  <div class="min-w-0 flex-1"><a href={attachment.href} target="_blank" rel="noreferrer" class="application-text-caption truncate font-semibold text-[#303746] hover:underline">{attachment.originalName}</a><p class="application-text-meta mt-1 text-[#8B909D]">{formatBytes(attachment.sizeBytes)} · {formatDateTime(attachment.createdAt)}</p>{#if data.canReply}<button type="button" on:click={() => void deleteAttachment(attachment.id)} class="application-text-meta mt-3 inline-flex items-center gap-1 font-semibold text-[#A33A3A]"><Trash2 size={11}/>Remover</button>{/if}</div>
                </article>
              {:else}<div class="application-text-meta rounded-xl border border-dashed border-[#D6DAE3] px-4 py-7 text-center text-[#9499A5]">Nenhum anexo neste ticket.</div>{/each}
            </div>
          </section>

          <section>
            <h3 class="text-[13px] font-semibold text-[#343A46]">Comentários e atividade</h3>
            {#if data.canReply}<form on:submit={addCardComment} class="mt-3 flex gap-2"><textarea name="body" required maxlength="10000" rows="2" placeholder="Escrever um comentário interno..." class="application-text-meta min-h-[54px] flex-1 resize-y rounded-xl border border-[#DCE0E6] bg-white px-3 py-2 leading-4 outline-none focus:border-[#000A57]"></textarea><button class="application-text-meta self-end rounded-lg bg-[#000A57] px-3 py-2 font-semibold text-white">Comentar</button></form>{/if}
            <div class="mt-3 space-y-3">
              {#each card.details.messages.slice().reverse().slice(0, 12) as message}<article class="rounded-xl border border-[#E5E7EC] bg-white p-3"><div class="flex justify-between gap-3"><strong class="application-text-meta text-[#3E4553]">{message.authorUserName ?? message.customerName ?? "Sistema"}</strong><span class="application-text-meta text-[#989DA8]">{formatDateTime(message.createdAt)}</span></div><p class="application-text-meta mt-1.5 whitespace-pre-wrap leading-5 text-[#626978]">{message.body}</p></article>{/each}
              {#each card.details.events.slice(0, 10) as event}<div class="application-text-meta flex items-center justify-between gap-3 px-1 text-[#858B99]"><span><strong class="font-semibold text-[#606776]">{event.actorName ?? "Sistema"}</strong> {eventLabels[event.eventType] ?? event.eventType}</span><span class="shrink-0">{formatDateTime(event.createdAt)}</span></div>{/each}
            </div>
          </section>
        </div>
      </div>

      <aside class="border-l border-[#E0E3E8] bg-[#F5F6F8] p-5 sm:p-6">
        <div class="space-y-5">
          <section class="rounded-xl border border-[#DDE1E7] bg-white p-4">
            <h3 class="application-text-caption font-semibold text-[#3D4452]">Área e coluna</h3>
            <p class="application-text-meta mt-1 leading-4 text-[#858B99]">Enquanto estiver em uma área, o ticket precisa alcançar uma coluna terminal antes de voltar ao fluxo global ou seguir para outra área.</p>
            <select value={cardWorkflowId} on:change={changeCardWorkflow} disabled={!data.canReply} class="application-text-meta mt-3 h-10 w-full rounded-lg border border-[#D9DDE4] bg-white px-2"><option value={data.workflowBoard.globalWorkflow?.id ?? ""}>Fluxo global</option>{#each movableAreaWorkflows as workflow}<option value={workflow.id}>Área · {workflow.areaName}</option>{/each}</select>
            <select bind:value={cardStageId} disabled={!data.canReply} class="application-text-meta mt-2 h-10 w-full rounded-lg border border-[#D9DDE4] bg-white px-2">{#each cardStages as stage}<option value={stage.id}>{stage.name}{stage.stageType === "area_gateway" ? ` · ${stage.linkedAreaName}` : ""}</option>{/each}</select>
            {#if data.canReply}<button type="button" on:click={() => void moveCard()} class="application-text-meta mt-2 h-9 w-full rounded-lg bg-[#000A57] font-semibold text-white">Mover ticket</button>{/if}
          </section>

          <section class="rounded-xl border border-[#DDE1E7] bg-white p-4">
            <h3 class="application-text-caption flex items-center gap-2 font-semibold text-[#3D4452]"><Tag size={13}/>Etiquetas</h3>
            {#if data.canReply}
              <select on:change={(event) => { const id = (event.currentTarget as HTMLSelectElement).value; if (id) void addLabel(id); event.currentTarget.value = ""; }} class="application-text-meta mt-3 h-10 w-full rounded-lg border border-[#D9DDE4] bg-white px-2"><option value="">Adicionar etiqueta...</option>{#each card.labels.filter((label) => !card.selectedLabels.some((selected) => selected.id === label.id)) as label}<option value={label.id}>{label.name}</option>{/each}</select>
              <form on:submit={createLabel} class="mt-3 grid grid-cols-[1fr_100px] gap-2"><input name="name" required minlength="2" maxlength="40" placeholder="Nova etiqueta" class="application-text-meta h-9 rounded-lg border border-[#D9DDE4] px-2"/><select name="color" class="application-text-meta h-9 rounded-lg border border-[#D9DDE4] bg-white px-2"><option value="blue">Azul</option><option value="green">Verde</option><option value="yellow">Amarela</option><option value="orange">Laranja</option><option value="red">Vermelha</option><option value="purple">Roxa</option><option value="gray">Cinza</option></select><button class="application-text-meta col-span-2 h-8 rounded-lg border border-[#D9DDE4] font-semibold text-[#4E5565]">Criar e adicionar</button></form>
            {/if}
          </section>

          <section class="rounded-xl border border-[#DDE1E7] bg-white p-4">
            <h3 class="application-text-caption flex items-center gap-2 font-semibold text-[#3D4452]"><Paperclip size={13}/>Adicionar anexo</h3>
            {#if data.canReply && card.attachmentsEnabled}<form on:submit={uploadAttachment} class="mt-3"><input name="file" type="file" required accept="image/png,image/jpeg,image/webp,image/gif,application/pdf,text/plain,.docx,.xlsx,.zip" class="application-text-meta block w-full text-[#6C7381]"/><button class="application-text-meta mt-3 h-9 w-full rounded-lg border border-[#D9DDE4] bg-white font-semibold text-[#4E5565]">Enviar arquivo</button></form>{:else if !card.attachmentsEnabled}<p class="application-text-meta mt-2 leading-4 text-[#8A5A2A]">Configure o storage S3 para habilitar anexos.</p>{/if}
          </section>

          <section class="application-text-meta rounded-xl border border-[#DDE1E7] bg-white p-4 leading-5 text-[#6D7482]"><p><strong>Cliente:</strong> {card.details.ticket.customerName ?? "Não identificado"}</p><p><strong>Fila técnica:</strong> {card.details.ticket.queueName}</p><p><strong>Responsável:</strong> {card.details.ticket.assignedUserName ?? "Sem responsável"}</p></section>
          <a href={`/app/tickets/${card.details.ticket.id}`} class="application-text-meta flex h-10 items-center justify-center gap-2 rounded-lg border border-[#CCD1DA] bg-white font-semibold text-[#000A57]"><ExternalLink size={12}/>Abrir página completa</a>
        </div>
      </aside>
    </div>
  </div>
{/if}