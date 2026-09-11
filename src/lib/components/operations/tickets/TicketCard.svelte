<script lang="ts">
  import { UserRound } from "lucide-svelte";
  import { labelClasses, priorityLabels } from "./presentation";
  import type { TicketItem } from "./types";

  export let ticket: TicketItem;
  export let canDrag = false;
  export let onDragStart: (event: DragEvent, ticketId: string) => void;
  export let onOpen: (ticketId: string) => void | Promise<void>;
</script>

<article
  draggable={canDrag}
  on:dragstart={(event) => onDragStart(event, ticket.id)}
  class="rounded-xl border border-[#DDE1E8] bg-white p-3 shadow-[0_2px_8px_rgba(9,30,66,0.08)] transition hover:border-[#B9C0CE] hover:shadow-[0_5px_16px_rgba(9,30,66,0.12)]"
>
  <button type="button" on:click={() => void onOpen(ticket.id)} class="block w-full text-left">
    {#if ticket.labels.length > 0}
      <div class="mb-2 flex flex-wrap gap-1">
        {#each ticket.labels.slice(0, 5) as label}
          <span class={`h-2 w-10 rounded-full ${labelClasses[label.color] ?? labelClasses.gray}`} title={label.name}></span>
        {/each}
      </div>
    {/if}
    <div class="flex items-start justify-between gap-2">
      <span class="application-text-meta font-bold text-[#EA6D0B]">#{ticket.ticketNumber}</span>
      <span class="application-text-meta text-[#7C8290]">{priorityLabels[ticket.priority]}</span>
    </div>
    <strong class="mt-1.5 block text-[11px] font-semibold leading-4 text-[#252B3B]">{ticket.subject}</strong>
    <div class="application-text-meta mt-3 flex items-center gap-1.5 text-[#7D8392]"><UserRound size={11}/><span class="truncate">{ticket.customerName ?? "Cliente não identificado"}</span></div>
    <div class="application-text-meta mt-1.5 truncate text-[#9297A5]">{ticket.assignedUserName ?? "Sem responsável"}</div>
  </button>
</article>
