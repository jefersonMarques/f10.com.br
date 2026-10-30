<script lang="ts">
  import { onDestroy } from "svelte";
  import { Building2, Check, Search, X } from "lucide-svelte";
  import type { TicketCommercialUnit } from "$lib/server/support/ticketCommercialUnitRepository";

  export let current: TicketCommercialUnit | null = null;

  let query = "";
  let results: TicketCommercialUnit[] = [];
  let selected: TicketCommercialUnit | null = current;
  let loading = false;
  let error = "";
  let timeout: ReturnType<typeof setTimeout> | null = null;
  let controller: AbortController | null = null;

  function search(value: string): void {
    if (timeout) clearTimeout(timeout);
    controller?.abort();
    const term = value.trim();
    if (term.length < 2) {
      results = [];
      loading = false;
      return;
    }
    loading = true;
    timeout = setTimeout(() => void loadResults(term), 250);
  }

  async function loadResults(term: string): Promise<void> {
    const request = new AbortController();
    controller = request;
    error = "";
    try {
      const response = await fetch(
        "/api/app/customers/units/search?q=" + encodeURIComponent(term),
        { cache: "no-store", signal: request.signal },
      );
      if (!response.ok) throw new Error("UNIT_SEARCH_FAILED");
      const payload = await response.json() as { units: TicketCommercialUnit[] };
      if (request.signal.aborted) return;
      results = payload.units;
    } catch {
      if (!request.signal.aborted) {
        results = [];
        error = "Não foi possível consultar as unidades.";
      }
    } finally {
      if (!request.signal.aborted) loading = false;
    }
  }

  function choose(unit: TicketCommercialUnit): void {
    selected = unit;
    query = "";
    results = [];
  }

  function clearSelection(): void {
    selected = null;
    query = "";
    results = [];
  }

  onDestroy(() => {
    if (timeout) clearTimeout(timeout);
    controller?.abort();
  });
</script>

<input type="hidden" name="customerUnitId" value={selected?.id ?? ""}/>
{#if selected}
  <div class="flex min-w-0 items-center gap-2 rounded-xl border border-[var(--app-border-control)] bg-[var(--app-info-bg)] p-3">
    <Check size={17} class="shrink-0 text-[var(--app-success-text)]"/>
    <div class="min-w-0 flex-1">
      <strong class="application-text-caption block break-words text-[var(--app-text)]">{selected.name}</strong>
      <span class="application-text-meta block text-[var(--app-text-muted)]">
        {selected.groupName} · Contrato {selected.contractNumber}
      </span>
    </div>
    <button type="button" on:click={clearSelection} aria-label="Escolher outra unidade"
      class="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-[var(--app-text-muted)] hover:bg-[var(--app-surface)]"><X size={16}/></button>
  </div>
{:else}
  <label class="relative block">
    <span class="application-text-meta mb-1 block font-semibold text-[var(--app-text-muted)]">Buscar unidade / contrato</span>
    <Search size={16} class="absolute bottom-3 left-3 text-[var(--app-text-muted)]"/>
    <input bind:value={query} on:input={(event) => search(event.currentTarget.value)} autocomplete="off"
      placeholder="Escola, grupo ou número do contrato"
      class="application-text-caption h-11 w-full rounded-xl border border-[var(--app-border-control)] bg-[var(--app-surface)] pl-10 pr-3 text-[var(--app-text)] outline-none focus:border-[var(--app-primary)]"/>
  </label>
  {#if loading}
    <p class="application-text-caption mt-2 text-[var(--app-text-muted)]">Consultando unidades...</p>
  {:else if error}
    <p role="alert" class="application-text-caption mt-2 text-[var(--app-danger-text)]">{error}</p>
  {:else if query.trim().length >= 2}
    {#if results.length}
      <div class="mt-2 max-h-64 overflow-y-auto rounded-xl border border-[var(--app-border)]">
        {#each results as unit (unit.id)}
          <button type="button" on:click={() => choose(unit)}
            class="flex w-full items-start gap-3 border-b border-[var(--app-border-soft)] px-3 py-3 text-left last:border-0 hover:bg-[var(--app-surface-subtle)]">
            <Building2 size={17} class="mt-0.5 shrink-0 text-[var(--app-primary)]"/>
            <span class="min-w-0 flex-1">
              <strong class="application-text-caption block break-words text-[var(--app-text)]">{unit.name}</strong>
              <span class="application-text-meta block text-[var(--app-text-muted)]">
                {unit.groupName} · Contrato {unit.contractNumber} · {unit.status}
              </span>
            </span>
          </button>
        {/each}
      </div>
    {:else}
      <p class="application-text-caption mt-2 text-[var(--app-text-muted)]">Nenhum contrato importado encontrado.</p>
    {/if}
  {/if}
{/if}
<button type="submit" disabled={!selected || selected.id === current?.id}
  class="application-text-caption mt-3 h-10 rounded-xl bg-[var(--app-primary)] px-4 font-semibold text-white disabled:opacity-50">
  {current ? "Atualizar vínculo" : "Vincular unidade"}
</button>
