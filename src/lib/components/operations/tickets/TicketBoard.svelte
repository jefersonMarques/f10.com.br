<script lang="ts">
  import { ArrowLeft, ArrowRight, Boxes, GitBranch } from "lucide-svelte";
  import TicketCard from "./TicketCard.svelte";
  import { stageColumnClass } from "./presentation";
  import type { TicketItem, TicketWorkflow } from "./types";

  export let workflowId: string;
  export let activeWorkflow: TicketWorkflow | null;
  export let areaWorkflows: TicketWorkflow[] = [];
  export let tickets: TicketItem[] = [];
  export let canReply = false;
  export let onDropTicket: (event: DragEvent, stageId: string) => void | Promise<void>;
  export let onStartDrag: (event: DragEvent, ticketId: string) => void;
  export let onOpenTicket: (ticketId: string) => void | Promise<void>;

  $: stages = activeWorkflow?.stages ?? [];

  function ticketStageId(ticket: TicketItem): string | null {
    if (!activeWorkflow) return null;
    if (activeWorkflow.kind === "global") return ticket.workflowState?.globalStageId ?? null;
    return ticket.workflowState?.areaWorkflowId === activeWorkflow.id
      ? ticket.workflowState?.areaStageId ?? null
      : null;
  }

  function ticketsForStage(stageId: string): TicketItem[] {
    return tickets.filter((ticket) => ticketStageId(ticket) === stageId);
  }

  function areaWorkflowByAreaId(areaId: string | null | undefined): TicketWorkflow | null {
    if (!areaId) return null;
    return areaWorkflows.find((workflow) => workflow.areaId === areaId) ?? null;
  }

  function enterArea(areaId: string | null | undefined): void {
    const workflow = areaWorkflowByAreaId(areaId);
    if (workflow) workflowId = workflow.id;
  }
</script>

<div class="flex flex-col gap-3 border-b border-[#EEF0F5] p-4 sm:flex-row sm:items-center sm:justify-between">
  <div class="flex flex-wrap items-center gap-3">
    {#if activeWorkflow?.kind === "area"}
      <button type="button" on:click={() => (workflowId = "global")} class="application-text-meta inline-flex h-9 items-center gap-1.5 rounded-lg border border-[#D9DDE5] bg-white px-3 font-semibold text-[#4E5565] shadow-sm hover:border-[#C7CBD4] hover:bg-[#F8F9FB]"><ArrowLeft size={13}/>Voltar ao nível anterior</button>
    {/if}
    <div class="flex items-center gap-2">
      {#if activeWorkflow?.kind === "area"}<Boxes size={15} class="text-[#EA6D0B]"/>{:else}<GitBranch size={15} class="text-[#000A57]"/>{/if}
      <div>
        <strong class="application-text-caption block text-[#343B4B]">{activeWorkflow?.kind === "area" ? `${activeWorkflow.areaName} · processo interno` : "Kanban global"}</strong>
        <span class="application-text-meta text-[#858B99]">{activeWorkflow?.kind === "area" ? "Conclua uma coluna terminal antes de devolver o ticket ao fluxo global." : "Clique na seta de uma coluna de área para abrir seu processo interno."}</span>
      </div>
    </div>
  </div>
  <select bind:value={workflowId} class="application-text-meta h-10 rounded-xl border border-[#DDE1EA] bg-white px-3 font-semibold">
    <option value="global">Visão global</option>
    {#each areaWorkflows as workflow}<option value={workflow.id}>{workflow.areaName}</option>{/each}
  </select>
</div>

<div class="overflow-x-auto p-4">
  <div class="grid min-w-max gap-4" style={`grid-template-columns: repeat(${Math.max(stages.length, 1)}, minmax(280px, 300px));`}>
    {#each stages as stage}
      <section class={`min-h-[390px] rounded-[16px] border p-3 ${stageColumnClass(activeWorkflow, stage)}`} role="group" aria-label={`Coluna ${stage.name}`} on:dragover|preventDefault on:drop={(event) => void onDropTicket(event, stage.id)}>
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
            <TicketCard {ticket} canDrag={canReply} onDragStart={onStartDrag} onOpen={onOpenTicket}/>
          {:else}
            <div class="application-text-meta rounded-xl border border-dashed border-[#D2D6DF] bg-white/60 p-7 text-center text-[#9A9FAC]">Sem tickets</div>
          {/each}
        </div>
      </section>
    {/each}
  </div>
</div>
