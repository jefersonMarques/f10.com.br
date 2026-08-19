<script lang="ts">
  import { invalidateAll } from "$app/navigation";
  import { Boxes, CheckCircle2, CircleAlert, Columns3, GitBranch, List, Plus, Search, Settings2, X } from "lucide-svelte";
  import type { ActionData, PageData } from "./$types";

  export let data: PageData;
  export let form: ActionData;

  type Scope = "mine" | "unassigned" | "all";
  type View = "board" | "list";
  type Ticket = PageData["tickets"][number];

  const priorityLabels: Record<string, string> = { low: "Baixa", normal: "Normal", high: "Alta", urgent: "Urgente" };
  let scope: Scope = "mine";
  let view: View = "board";
  let search = "";
  let workflowId = "global";
  let createOpen = false;
  let handoffTicket: Ticket | null = null;
  let draggingTicketId: string | null = null;
  let moving = false;

  $: activeWorkflow = workflowId === "global"
    ? data.workflowBoard.globalWorkflow
    : data.workflowBoard.areaWorkflows.find((workflow) => workflow.id === workflowId) ?? data.workflowBoard.globalWorkflow;
  $: stages = activeWorkflow?.stages ?? [];
  $: filteredTickets = data.tickets.filter((ticket) => {
    if (scope === "mine" && ticket.assignedUserId !== data.currentUserId) return false;
    if (scope === "unassigned" && ticket.assignedUserId) return false;
    const query = search.trim().toLocaleLowerCase("pt-BR");
    if (!query) return true;
    return [ticket.ticketNumber, ticket.subject, ticket.customerName, ticket.organizationName, ticket.queueName]
      .filter(Boolean).join(" ").toLocaleLowerCase("pt-BR").includes(query);
  });
  $: handoffTargets = data.workflowBoard.globalWorkflow?.stages.filter((stage) => stage.id !== handoffTicket?.workflowState?.globalStageId) ?? [];

  function ticketStageId(ticket: Ticket): string | null {
    if (!activeWorkflow) return null;
    if (activeWorkflow.kind === "global") return ticket.workflowState?.globalStageId ?? null;
    return ticket.workflowState?.areaWorkflowId === activeWorkflow.id ? ticket.workflowState?.areaStageId ?? null : null;
  }
  function ticketsForStage(stageId: string): Ticket[] {
    return filteredTickets.filter((ticket) => ticketStageId(ticket) === stageId);
  }
  function startDrag(event: DragEvent, ticketId: string): void {
    if (!data.canReply) return;
    draggingTicketId = ticketId;
    event.dataTransfer?.setData("text/plain", ticketId);
  }
  async function dropTicket(event: DragEvent, stageId: string): Promise<void> {
    event.preventDefault();
    if (!data.canReply || !activeWorkflow || moving) return;
    const ticketId = draggingTicketId ?? event.dataTransfer?.getData("text/plain") ?? "";
    const ticket = data.tickets.find((item) => item.id === ticketId);
    if (!ticket || ticketStageId(ticket) === stageId) return;
    moving = true;
    try {
      const body = new FormData();
      body.set("ticketId", ticketId);
      body.set("stageId", stageId);
      body.set("workflowKind", activeWorkflow.kind);
      const response = await fetch("/app/tickets?/moveWorkflowStage", { method: "POST", body });
      if (!response.ok) window.alert(response.status === 409 ? "Movimento bloqueado. Conclua a etapa interna antes do handoff." : "Não foi possível mover o ticket.");
      else await invalidateAll();
    } finally {
      moving = false;
      draggingTicketId = null;
    }
  }
</script>

<svelte:head><title>Tickets | F10 Operations</title></svelte:head>

<div class="mx-auto max-w-[1560px] px-5 py-7 sm:px-8 sm:py-9">
  <div class="flex flex-col justify-between gap-4 xl:flex-row xl:items-end">
    <div><p class="text-[10px] font-bold uppercase tracking-[0.12em] text-[#EA6D0B]">Atendimento</p><h1 class="mt-2 text-[34px] font-semibold tracking-[-0.035em] text-[#010D28]">Tickets</h1><p class="mt-2 text-[12px] text-[#6F7585]">Fluxo global entre áreas e processo interno de cada equipe.</p></div>
    <div class="flex flex-wrap gap-2">{#if data.canManageWorkflow}<a href="/app/tickets/workflows" class="inline-flex h-10 items-center gap-2 rounded-xl border border-[#DDE1EA] px-3 text-[10px] font-semibold text-[#000A57]"><Settings2 size={14}/>Configurar workflows</a>{/if}{#if data.canCreate}<button on:click={() => (createOpen = true)} class="inline-flex h-10 items-center gap-2 rounded-xl bg-[#000A57] px-4 text-[10px] font-semibold text-white"><Plus size={14}/>Novo ticket</button>{/if}</div>
  </div>

  {#if form?.message}<div class={`mt-5 flex items-center gap-2 rounded-xl border px-4 py-3 text-[11px] ${form.success ? "border-[#B9E6C9] bg-[#F1FBF4] text-[#176B35]" : "border-[#F0C8C8] bg-[#FFF5F5] text-[#9B2C2C]"}`}>{#if form.success}<CheckCircle2 size={15}/>{:else}<CircleAlert size={15}/>{/if}{form.message}</div>{/if}

  <section class="mt-6 overflow-hidden rounded-[22px] border border-[#E2E5ED] bg-white">
    <div class="flex flex-col gap-3 border-b border-[#EEF0F5] p-4 lg:flex-row lg:items-center lg:justify-between">
      <div class="flex rounded-xl bg-[#F3F4F7] p-1">{#each [["mine","Minha fila"],["unassigned","Sem responsável"],["all","Todos"]] as option}<button on:click={() => (scope = option[0] as Scope)} class={`h-8 rounded-lg px-3 text-[9px] font-semibold ${scope === option[0] ? "bg-white text-[#000A57] shadow-sm" : "text-[#737989]"}`}>{option[1]}</button>{/each}</div>
      <div class="flex flex-wrap gap-2"><label class="relative min-w-[250px] flex-1"><Search size={14} class="absolute left-3 top-1/2 -translate-y-1/2 text-[#9499A5]"/><input bind:value={search} placeholder="Buscar ticket, cliente ou área" class="h-10 w-full rounded-xl border border-[#DDE1EA] bg-[#FAFAFC] pl-9 pr-3 text-[10px]"/></label><div class="flex rounded-xl bg-[#F3F4F7] p-1"><button on:click={() => (view = "board")} class={`flex h-8 items-center gap-1 rounded-lg px-2 text-[9px] ${view === "board" ? "bg-white text-[#000A57]" : "text-[#737989]"}`}><Columns3 size={13}/>Quadro</button><button on:click={() => (view = "list")} class={`flex h-8 items-center gap-1 rounded-lg px-2 text-[9px] ${view === "list" ? "bg-white text-[#000A57]" : "text-[#737989]"}`}><List size={13}/>Lista</button></div></div>
    </div>

    {#if view === "list"}
      <div class="divide-y divide-[#EEF0F4]">{#each filteredTickets as ticket}<a href={`/app/tickets/${ticket.id}`} class="grid gap-2 px-5 py-4 hover:bg-[#F8F9FC] md:grid-cols-[100px_1.6fr_1fr_1fr_150px]"><span class="text-[9px] font-bold text-[#EA6D0B]">#{ticket.ticketNumber}</span><strong class="truncate text-[11px] text-[#2D3342]">{ticket.subject}</strong><span class="truncate text-[9px] text-[#667080]">{ticket.customerName ?? "Cliente"}</span><span class="truncate text-[9px] text-[#667080]">{ticket.queueName}</span><span class="text-[9px] font-semibold text-[#000A57]">{data.workflowBoard.globalWorkflow?.stages.find((stage) => stage.id === ticket.workflowState?.globalStageId)?.name ?? "Sem etapa"}</span></a>{:else}<div class="p-12 text-center text-[10px] text-[#858B99]">Nenhum ticket encontrado.</div>{/each}</div>
    {:else}
      <div class="flex flex-col gap-3 border-b border-[#EEF0F5] p-4 sm:flex-row sm:items-center sm:justify-between"><div class="flex items-center gap-2">{#if activeWorkflow?.kind === "area"}<Boxes size={15} class="text-[#EA6D0B]"/>{:else}<GitBranch size={15} class="text-[#000A57]"/>{/if}<div><strong class="block text-[10px] text-[#343B4B]">{activeWorkflow?.kind === "area" ? `${activeWorkflow.queueName} · processo interno` : "Fluxo global"}</strong><span class="text-[8px] text-[#858B99]">{activeWorkflow?.kind === "area" ? "Detalhes visíveis apenas conforme acesso à área." : "Gateways exibem somente a área responsável."}</span></div></div><select bind:value={workflowId} class="h-10 rounded-xl border border-[#DDE1EA] bg-white px-3 text-[9px] font-semibold"><option value="global">Visão global</option>{#each data.workflowBoard.areaWorkflows as workflow}<option value={workflow.id}>{workflow.queueName}</option>{/each}</select></div>
      {#if stages.length === 0}<div class="p-12 text-center text-[10px] text-[#858B99]">Workflow sem colunas ativas.</div>{:else}<div class="overflow-x-auto p-4"><div class="grid min-w-max gap-4" style={`grid-template-columns: repeat(${stages.length}, minmax(280px, 300px));`}>{#each stages as stage}<section class={`min-h-[360px] rounded-[18px] border p-3 ${stage.stageType === "area_gateway" ? "border-[#E8C49F] bg-[#FFF9F3]" : "border-[#E0E3EB] bg-[#F8F9FB]"}`} on:dragover|preventDefault on:drop={(event) => void dropTicket(event, stage.id)}><header class="mb-3 flex items-start justify-between"><div><strong class="text-[11px] text-[#3A4050]">{stage.name}</strong>{#if stage.stageType === "area_gateway"}<span class="mt-1 block text-[8px] font-semibold text-[#A76225]">Área · {stage.linkedQueueName}</span>{/if}</div><span class="rounded-full bg-white px-2 py-1 text-[8px]">{ticketsForStage(stage.id).length}</span></header><div class="space-y-2">{#each ticketsForStage(stage.id) as ticket (ticket.id)}<article draggable={data.canReply} on:dragstart={(event) => startDrag(event, ticket.id)} class="rounded-xl border border-[#E2E5EC] bg-white p-3"><a href={`/app/tickets/${ticket.id}`}><div class="flex justify-between"><span class="text-[8px] font-bold text-[#EA6D0B]">#{ticket.ticketNumber}</span><span class="text-[8px] text-[#7C8290]">{priorityLabels[ticket.priority]}</span></div><strong class="mt-1 block text-[11px] leading-4 text-[#252B3B]">{ticket.subject}</strong><span class="mt-2 block truncate text-[8px] text-[#7D8392]">{ticket.customerName ?? "Cliente"} · {ticket.assignedUserName ?? "Sem responsável"}</span></a>{#if activeWorkflow?.kind === "area" && stage.stageType === "terminal" && data.canReply}<button on:click={() => (handoffTicket = ticket)} class="mt-2 h-8 w-full rounded-lg bg-[#000A57] text-[8px] font-semibold text-white">Concluir área e encaminhar</button>{/if}</article>{:else}<div class="rounded-xl border border-dashed border-[#D6DAE3] p-6 text-center text-[9px] text-[#9A9FAC]">Sem tickets</div>{/each}</div></section>{/each}</div></div>{/if}
    {/if}
  </section>
</div>

{#if createOpen}<div class="fixed inset-0 z-[100] flex items-center justify-center bg-[#010D28]/35 p-4" on:click={() => (createOpen = false)} role="presentation"><form method="POST" action="?/create" class="grid w-full max-w-[620px] gap-3 rounded-[22px] bg-white p-5 sm:grid-cols-2" on:click|stopPropagation><div class="flex items-center justify-between sm:col-span-2"><h2 class="text-[16px] font-semibold">Novo ticket</h2><button type="button" on:click={() => (createOpen = false)}><X size={16}/></button></div><input name="subject" required maxlength="180" placeholder="Assunto" class="h-10 rounded-xl border border-[#DDE1EA] px-3 text-[10px] sm:col-span-2"/><input name="customerName" required maxlength="120" placeholder="Cliente" class="h-10 rounded-xl border border-[#DDE1EA] px-3 text-[10px]"/><input name="organizationName" maxlength="160" placeholder="Escola / empresa" class="h-10 rounded-xl border border-[#DDE1EA] px-3 text-[10px]"/><input name="customerEmail" type="email" maxlength="254" placeholder="E-mail" class="h-10 rounded-xl border border-[#DDE1EA] px-3 text-[10px]"/><input name="customerPhone" maxlength="40" placeholder="Telefone" class="h-10 rounded-xl border border-[#DDE1EA] px-3 text-[10px]"/><select name="queueId" required class="h-10 rounded-xl border border-[#DDE1EA] px-2 text-[9px]">{#each data.queues as queue}<option value={queue.id}>{queue.name}</option>{/each}</select><select name="priority" class="h-10 rounded-xl border border-[#DDE1EA] px-2 text-[9px]"><option value="normal">Normal</option><option value="low">Baixa</option><option value="high">Alta</option><option value="urgent">Urgente</option></select><textarea name="message" required maxlength="10000" rows="5" placeholder="Descrição do atendimento" class="rounded-xl border border-[#DDE1EA] p-3 text-[10px] sm:col-span-2"></textarea><button class="h-10 rounded-xl bg-[#000A57] text-[9px] font-semibold text-white sm:col-span-2">Criar ticket</button></form></div>{/if}

{#if handoffTicket}<div class="fixed inset-0 z-[110] flex items-center justify-center bg-[#010D28]/35 p-4" on:click={() => (handoffTicket = null)} role="presentation"><form method="POST" action="?/moveWorkflowStage" class="w-full max-w-[460px] space-y-3 rounded-[22px] bg-white p-5" on:click|stopPropagation><div class="flex justify-between"><div><span class="text-[9px] font-bold uppercase text-[#EA6D0B]">Handoff</span><h2 class="mt-1 text-[16px] font-semibold">Concluir área</h2></div><button type="button" on:click={() => (handoffTicket = null)}><X size={15}/></button></div><input type="hidden" name="ticketId" value={handoffTicket.id}/><input type="hidden" name="workflowKind" value="global"/><select name="stageId" required class="h-11 w-full rounded-xl border border-[#DDE1EA] px-3 text-[10px]">{#each handoffTargets as stage}<option value={stage.id}>{stage.name}{stage.stageType === "area_gateway" ? ` · ${stage.linkedQueueName}` : ""}</option>{/each}</select><p class="rounded-xl bg-[#F6F7FA] p-3 text-[9px] leading-5 text-[#747B8B]">Ao mudar de área, o responsável atual é limpo e o ticket entra na coluna inicial do novo processo.</p><button class="h-10 w-full rounded-xl bg-[#000A57] text-[9px] font-semibold text-white">Concluir e encaminhar</button></form></div>{/if}
