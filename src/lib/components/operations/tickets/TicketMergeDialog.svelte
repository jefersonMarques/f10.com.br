<script lang="ts">
  import { onDestroy } from "svelte";
  import { Check, GitMerge, Search, X } from "lucide-svelte";
  import type { TicketDetailsData } from "./types";

  type Candidate = TicketDetailsData["mergeContext"]["members"][number];

  export let ticketData: TicketDetailsData;
  export let open = false;
  export let saving = false;
  export let onAction: (action: string, body: FormData) => Promise<boolean>;

  let query = "";
  let results: Candidate[] = [];
  let candidate: Candidate | null = null;
  let principal: "current" | "candidate" = "current";
  $: currentPrimary = ticketData.mergeContext.members.find(
    (member) => member.id === ticketData.mergeContext.rootId,
  );
  $: currentPrimaryNumber = currentPrimary?.ticketNumber ?? ticketData.details.ticket.ticketNumber;

  let loading = false;
  let errorMessage = "";
  let timer: ReturnType<typeof setTimeout> | null = null;
  let controller: AbortController | null = null;

  function close(): void {
    if (saving) return;
    open = false;
    candidate = null;
    query = "";
    results = [];
    errorMessage = "";
    controller?.abort();
    if (timer) clearTimeout(timer);
  }

  function search(): void {
    candidate = null;
    results = [];
    errorMessage = "";
    controller?.abort();
    if (timer) clearTimeout(timer);
    if (query.trim().length < 2) {
      loading = false;
      return;
    }

    loading = true;
    timer = setTimeout(() => void loadCandidates(query.trim()), 250);
  }

  async function loadCandidates(value: string): Promise<void> {
    const request = new AbortController();
    controller = request;
    try {
      const response = await fetch(
        `/api/app/tickets/merge-candidates?q=${encodeURIComponent(value)}`,
        { cache: "no-store", signal: request.signal },
      );
      if (!response.ok) throw new Error("TICKET_MERGE_SEARCH_FAILED");
      const payload = await response.json() as { tickets: Candidate[] };
      if (!request.signal.aborted) {
        results = payload.tickets.filter((row) => row.id !== ticketData.details.ticket.id);
      }
    } catch {
      if (!request.signal.aborted) errorMessage = "Não foi possível buscar os tickets.";
    } finally {
      if (!request.signal.aborted) loading = false;
    }
  }

  async function merge(): Promise<void> {
    if (!candidate || saving) return;
    const currentNumber = currentPrimaryNumber;
    const primaryNumber = principal === "current" ? currentNumber : candidate.ticketNumber;
    if (!confirm(`Mesclar os tickets e manter #${primaryNumber} como principal?\nOs históricos serão preservados e o acesso dos clientes não será ampliado.`)) {
      return;
    }
    const body = new FormData();
    body.set("candidateTicketId", candidate.id);
    body.set("principal", principal);
    if (await onAction("mergeTickets", body)) close();
  }

  onDestroy(() => {
    controller?.abort();
    if (timer) clearTimeout(timer);
  });
</script>

{#if open}
  <div class="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-5" role="presentation">
    <button type="button" class="absolute inset-0 bg-black/50" aria-label="Fechar mesclagem" on:click={close}></button>
    <section role="dialog" aria-modal="true" aria-labelledby="merge-ticket-title"
      class="relative z-10 flex max-h-[90vh] w-full max-w-[560px] flex-col overflow-hidden rounded-2xl border border-[var(--app-border)] bg-[var(--app-surface)] shadow-2xl">
      <header class="flex items-center justify-between gap-3 border-b border-[var(--app-border)] px-4 py-3 sm:px-5">
        <div class="flex items-center gap-2">
          <GitMerge size={18} class="text-[var(--app-primary)]"/>
          <h2 id="merge-ticket-title" class="text-[16px] font-semibold text-[var(--app-text)]">Mesclar tickets</h2>
        </div>
        <button type="button" on:click={close} aria-label="Fechar"
          class="flex h-9 w-9 items-center justify-center rounded-lg text-[var(--app-text-muted)] hover:bg-[var(--app-surface-muted)]">
          <X size={18}/>
        </button>
      </header>

      <div class="min-h-0 space-y-4 overflow-y-auto p-4 sm:p-5">
        <div class="rounded-lg border border-[var(--app-border)] bg-[var(--app-surface-subtle)] p-3">
          <p class="text-[11px] text-[var(--app-text-muted)]">{ticketData.mergeContext.isSource ? "Principal do grupo atual" : "Ticket atual"}</p>
          <strong class="mt-1 block text-[13px] text-[var(--app-text)]">#{currentPrimaryNumber} · {currentPrimary?.subject ?? ticketData.details.ticket.subject}</strong>
          <p class="mt-1 text-[12px] text-[var(--app-text-muted)]">
            {ticketData.customerOverview.clientName ?? "Sem empresa"} · {ticketData.customerOverview.requesterName ?? "Sem solicitante"}
          </p>
        </div>

        <label class="block">
          <span class="mb-1.5 block text-[12px] font-semibold text-[var(--app-text)]">Localizar outro ticket</span>
          <span class="relative block">
            <Search size={16} class="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--app-text-muted)]"/>
            <input type="search" bind:value={query} on:input={search}
              placeholder="Número ou assunto do ticket"
              class="h-11 w-full rounded-lg border border-[var(--app-border-control)] bg-[var(--app-surface)] pl-10 pr-3 text-[13px] text-[var(--app-text)] outline-none focus:border-[var(--app-primary)]"/>
          </span>
        </label>

        {#if loading}
          <p class="text-[12px] text-[var(--app-text-muted)]">Buscando...</p>
        {:else if errorMessage}
          <p role="alert" class="text-[12px] text-[var(--app-danger-text)]">{errorMessage}</p>
        {:else if results.length > 0}
          <div class="max-h-44 overflow-y-auto rounded-lg border border-[var(--app-border)]">
            {#each results as result (result.id)}
              <button type="button" on:click={() => { candidate = result; results = []; }}
                class="flex w-full items-start gap-2 border-b border-[var(--app-border-soft)] px-3 py-2.5 text-left hover:bg-[var(--app-surface-muted)] last:border-0">
                <span class="min-w-0 flex-1">
                  <strong class="block truncate text-[12px] text-[var(--app-text)]">#{result.ticketNumber} · {result.subject}</strong>
                  <span class="block truncate text-[11px] text-[var(--app-text-muted)]">{result.customerName ?? result.organizationName ?? "Cliente não identificado"} · {result.channel}</span>
                </span>
                <Check size={15} class="mt-1 shrink-0 text-[var(--app-primary)]"/>
              </button>
            {/each}
          </div>
        {/if}

        {#if candidate}
          <div class="rounded-lg border border-[var(--app-primary)] bg-[var(--app-surface-subtle)] p-3">
            <p class="text-[11px] text-[var(--app-text-muted)]">Ticket selecionado</p>
            <strong class="mt-1 block text-[13px] text-[var(--app-text)]">#{candidate.ticketNumber} · {candidate.subject}</strong>
            <p class="mt-1 text-[12px] text-[var(--app-text-muted)]">{candidate.customerName ?? candidate.organizationName ?? "Solicitante não identificado"}</p>
          </div>

          <fieldset class="space-y-2">
            <legend class="text-[12px] font-semibold text-[var(--app-text)]">Qual ticket permanece principal?</legend>
            <label class="flex min-h-10 cursor-pointer items-center gap-2 rounded-lg border border-[var(--app-border)] p-2.5 text-[12px] text-[var(--app-text)]">
              <input type="radio" name="principal" value="current" bind:group={principal}/>
              <span>Manter #{currentPrimaryNumber} — cliente e solicitante do principal atual</span>
            </label>
            <label class="flex min-h-10 cursor-pointer items-center gap-2 rounded-lg border border-[var(--app-border)] p-2.5 text-[12px] text-[var(--app-text)]">
              <input type="radio" name="principal" value="candidate" bind:group={principal}/>
              <span>Usar #{candidate.ticketNumber} — cliente e solicitante do outro ticket</span>
            </label>
          </fieldset>
        {/if}

        <p class="text-[12px] leading-5 text-[var(--app-text-muted)]">
          A mesclagem não exclui tickets nem compartilha mensagens privadas com outros clientes.
          E-mails, chats, anexos e solicitações NFS-e/Cellcoin mantêm suas origens.
        </p>
      </div>

      <footer class="flex justify-end gap-2 border-t border-[var(--app-border)] px-4 py-3 sm:px-5">
        <button type="button" on:click={close} disabled={saving}
          class="h-10 rounded-lg border border-[var(--app-border-control)] px-4 text-[12px] font-medium text-[var(--app-text)]">Cancelar</button>
        <button type="button" disabled={!candidate || saving} on:click={() => void merge()}
          class="inline-flex h-10 items-center gap-2 rounded-lg bg-[var(--app-primary)] px-4 text-[12px] font-semibold text-white disabled:opacity-50">
          <GitMerge size={15}/>Mesclar tickets
        </button>
      </footer>
    </section>
  </div>
{/if}
