<script lang="ts">
  import { labelClasses } from "./presentation";
  import type { TicketItem, TicketWorkflow } from "./types";

  export let tickets: TicketItem[] = [];
  export let globalWorkflow: TicketWorkflow | null;
  export let onOpenTicket: (ticketId: string) => void | Promise<void>;

  function globalStageName(ticket: TicketItem): string {
    return globalWorkflow?.stages.find((stage) => stage.id === ticket.workflowState?.globalStageId)?.name ?? "Sem etapa";
  }
</script>

<div class="divide-y divide-[#EEF0F4]">
  {#each tickets as ticket}
    <button type="button" on:click={() => void onOpenTicket(ticket.id)} class="grid w-full gap-2 px-5 py-4 text-left hover:bg-[#F8F9FC] md:grid-cols-[100px_1.6fr_1fr_1fr_180px]">
      <span class="application-text-meta font-bold text-[#EA6D0B]">#{ticket.ticketNumber}</span>
      <div>
        <strong class="block truncate text-[11px] text-[#2D3342]">{ticket.subject}</strong>
        {#if ticket.labels.length > 0}
          <div class="mt-1 flex gap-1">
            {#each ticket.labels.slice(0, 4) as label}<span class={`application-text-meta rounded px-1.5 py-0.5 font-semibold ${labelClasses[label.color] ?? labelClasses.gray}`}>{label.name}</span>{/each}
          </div>
        {/if}
      </div>
      <span class="application-text-meta truncate text-[#667080]">{ticket.customerName ?? "Cliente"}</span>
      <span class="application-text-meta truncate text-[#667080]">{ticket.queueName}</span>
      <span class="application-text-meta font-semibold text-[#000A57]">{globalStageName(ticket)}</span>
    </button>
  {/each}
</div>
