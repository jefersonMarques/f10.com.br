<script lang="ts">
  import ApplicationBackLink from "$lib/components/application/ApplicationBackLink.svelte";
  import ApplicationContent from "$lib/components/application/ApplicationContent.svelte";
  import TicketDetails from "$lib/components/operations/tickets/TicketDetails.svelte";
  import type { ActionData, PageData } from "./$types";

  export let data: PageData;
  export let form: ActionData;
</script>

<svelte:head>
  <title>Ticket #{data.details.ticket.ticketNumber} | F10 Operations</title>
</svelte:head>

<ApplicationContent width="full" padding="none" className="min-h-[calc(100dvh-var(--application-header-height))] bg-[#F5F6FA]">
  <div class="mx-auto w-full max-w-[1560px] p-3 lg:p-4">
    <ApplicationBackLink href="/app/tickets" label="Tickets" className="mb-3" />
    <TicketDetails ticketData={data} surface="page" feedback={form}/>
  </div>
</ApplicationContent>
