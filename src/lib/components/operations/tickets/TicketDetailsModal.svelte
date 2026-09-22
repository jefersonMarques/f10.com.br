<script lang="ts">
  import TicketDetails from "./TicketDetails.svelte";
  import type { TicketDetailsData } from "./types";

  export let ticketData: TicketDetailsData;
  export let onClose: () => void;
  export let onRefresh: () => void | Promise<void> = () => undefined;

  function handleKeydown(event: KeyboardEvent): void {
    if (event.key === "Escape") onClose();
  }
</script>

<svelte:window on:keydown={handleKeydown}/>

<div class="fixed inset-0 z-[120] flex items-end justify-center bg-[#010D28]/45 p-0 sm:items-center sm:p-4" role="presentation">
  <button type="button" class="absolute inset-0 cursor-default" aria-label="Fechar ticket" on:click={onClose}></button>
  <div class="relative z-10 h-[96dvh] w-full overflow-hidden rounded-t-[24px] sm:h-[92dvh] sm:max-w-[1480px] sm:rounded-[24px]" role="dialog" aria-modal="true" aria-label={`Ticket #${ticketData.details.ticket.ticketNumber}`}>
    <TicketDetails {ticketData} surface="modal" {onClose} {onRefresh}/>
  </div>
</div>
