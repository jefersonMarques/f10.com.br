<script lang="ts">
  import { invalidateAll } from "$app/navigation";
  import { Boxes, GitBranch } from "lucide-svelte";
  import type { LayoutData } from "./$types";

  export let data: LayoutData;

  const AREA_EXIT_MESSAGE = "Entre na área e conclua o fluxo antes de movimentar o ticket.";

  let workflowId = data.workflowContext?.areaWorkflowId
    ?? data.workflowBoard.globalWorkflow?.id
    ?? "";
  let stageId = data.workflowContext?.areaStageId
    ?? data.workflowContext?.globalStageId
    ?? "";
  let moving = false;
  let synchronizedContextKey = "";

  $: contextKey = `${data.workflowContext?.areaWorkflowId ?? data.workflowBoard.globalWorkflow?.id ?? ""}:${data.workflowContext?.areaStageId ?? data.workflowContext?.globalStageId ?? ""}`;
  $: if (!moving && contextKey && contextKey !== synchronizedContextKey) {
    workflowId = data.workflowContext?.areaWorkflowId ?? data.workflowBoard.globalWorkflow?.id ?? "";
    stageId = data.workflowContext?.areaStageId ?? data.workflowContext?.globalStageId ?? "";
    synchronizedContextKey = contextKey;
  }

  $: selectedWorkflow = workflowId === data.workflowBoard.globalWorkflow?.id
    ? data.workflowBoard.globalWorkflow
    : data.workflowBoard.areaWorkflows.find((workflow) => workflow.id === workflowId) ?? null;
  $: stages = selectedWorkflow?.stages ?? [];
  $: movableAreaWorkflows = data.workflowBoard.areaWorkflows.filter((workflow) =>
    Boolean(workflow.areaId && data.workflowBoard.globalWorkflow?.stages.some(
      (stage) => stage.stageType === "area_gateway" && stage.linkedAreaId === workflow.areaId,
    )),
  );
  $: currentAreaStage = data.workflowContext?.areaWorkflowId && data.workflowContext?.areaStageId
    ? data.workflowBoard.areaWorkflows
        .find((workflow) => workflow.id === data.workflowContext?.areaWorkflowId)
        ?.stages.find((stage) => stage.id === data.workflowContext?.areaStageId) ?? null
    : null;

  function changeWorkflow(event: Event): void {
    workflowId = (event.currentTarget as HTMLSelectElement).value;
    const workflow = workflowId === data.workflowBoard.globalWorkflow?.id
      ? data.workflowBoard.globalWorkflow
      : data.workflowBoard.areaWorkflows.find((item) => item.id === workflowId) ?? null;
    stageId = workflow?.stages[0]?.id ?? "";
  }

  async function moveTicket(): Promise<void> {
    if (!data.canReply || !workflowId || !stageId || moving) return;

    if (
      data.workflowContext?.areaWorkflowId
      && workflowId !== data.workflowContext.areaWorkflowId
      && currentAreaStage?.stageType !== "terminal"
    ) {
      window.alert(AREA_EXIT_MESSAGE);
      return;
    }

    moving = true;
    try {
      const body = new FormData();
      body.set("ticketId", data.ticketId);
      body.set("workflowId", workflowId);
      body.set("stageId", stageId);
      const response = await fetch("/app/tickets?/moveTicketLocation", { method: "POST", body });
      if (!response.ok) {
        window.alert(response.status === 409 && data.workflowContext?.areaWorkflowId
          ? AREA_EXIT_MESSAGE
          : "Não foi possível alterar a área ou coluna deste ticket.");
      } else {
        await invalidateAll();
      }
    } finally {
      moving = false;
    }
  }
</script>

{#if data.workflowContext}
  <div class="mx-auto mt-5 max-w-[1320px] px-5 sm:px-8">
    <div class="rounded-2xl border border-[#DDE2EC] bg-white px-4 py-3 shadow-[0_4px_18px_rgba(1,13,40,0.03)]">
      <div class="flex flex-wrap items-center gap-2 text-[10px] text-[#626979]">
        <span class="inline-flex items-center gap-1.5 font-semibold text-[#000A57]"><GitBranch size={13}/>Global · {data.workflowContext.globalStageName}</span>
        {#if data.workflowContext.areaName}
          <span class="text-[#B2B7C1]">/</span>
          <span class="inline-flex items-center gap-1.5 font-semibold text-[#A35714]"><Boxes size={13}/>{data.workflowContext.areaName}{data.workflowContext.areaStageName ? ` · ${data.workflowContext.areaStageName}` : ""}</span>
        {/if}
      </div>

      {#if data.canReply}
        <div class="mt-3 flex flex-col gap-2 border-t border-[#EEF0F4] pt-3 sm:flex-row sm:items-center">
          <span class="text-[8px] font-bold uppercase tracking-[0.07em] text-[#8A909E]">Mover ticket</span>
          <select value={workflowId} on:change={changeWorkflow} class="h-9 min-w-[190px] rounded-lg border border-[#DDE1EA] bg-white px-2 text-[9px]"><option value={data.workflowBoard.globalWorkflow?.id ?? ""}>Fluxo global</option>{#each movableAreaWorkflows as workflow}<option value={workflow.id}>Área · {workflow.areaName}</option>{/each}</select>
          <select bind:value={stageId} class="h-9 min-w-[190px] rounded-lg border border-[#DDE1EA] bg-white px-2 text-[9px]">{#each stages as stage}<option value={stage.id}>{stage.name}{stage.stageType === "area_gateway" ? ` · ${stage.linkedAreaName}` : ""}</option>{/each}</select>
          <button type="button" on:click={() => void moveTicket()} disabled={moving || !stageId} class="h-9 rounded-lg bg-[#000A57] px-3 text-[9px] font-semibold text-white disabled:opacity-50">{moving ? "Movendo..." : "Aplicar"}</button>
        </div>
      {/if}
    </div>
  </div>
{/if}

<slot />

<style>
  :global(form[action="?/status"]) {
    display: none !important;
  }
</style>
