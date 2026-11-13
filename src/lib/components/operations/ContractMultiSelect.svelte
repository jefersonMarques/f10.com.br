<script lang="ts">
  import { onDestroy } from "svelte";
  import { Building2, Check, Plus, Search, X } from "lucide-svelte";

  type ContractOption = {
    contractId: string;
    contractNumber: string | null;
    displayName: string;
    holderName: string | null;
    status: string;
  };

  export let name = "contractId";
  export let initial: ContractOption[] = [];
  export let maxSelected = 500;

  let selected: ContractOption[] = [...initial];
  let query = "";
  let matches: ContractOption[] = [];
  let loading = false;
  let searchError = "";
  let timer: ReturnType<typeof setTimeout> | null = null;
  let requestId = 0;

  $: if (query.trim().length >= 2) schedule(query);
  $: if (query.trim().length < 2) {
    matches = [];
    searchError = "";
  }

  function schedule(value: string): void {
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => void search(value), 250);
  }

  async function search(value: string): Promise<void> {
    const current = ++requestId;
    loading = true;
    try {
      const response = await fetch(
        "/api/app/customers/contracts/search?q=" + encodeURIComponent(value.trim()),
        { cache: "no-store" },
      );
      if (!response.ok) throw new Error("CONTRACT_SEARCH_FAILED");
      const payload = await response.json() as { contracts: ContractOption[] };
      if (current !== requestId) return;
      matches = payload.contracts;
      searchError = "";
    } catch {
      if (current === requestId) searchError = "Não foi possível pesquisar contratos.";
    } finally {
      if (current === requestId) loading = false;
    }
  }

  function add(option: ContractOption): void {
    if (selected.length >= maxSelected ||
        selected.some((item) => item.contractId === option.contractId)) return;
    selected = [...selected, option];
  }

  function remove(id: string): void {
    selected = selected.filter((item) => item.contractId !== id);
  }

  onDestroy(() => {
    if (timer) clearTimeout(timer);
    requestId += 1;
  });
</script>

<div class="space-y-3">
  {#each selected as item (item.contractId)}
    <input type="hidden" {name} value={item.contractId}/>
  {/each}

  <label class="block">
    <span class="application-text-caption mb-1 flex items-center gap-2 font-semibold text-app-text">
      <Building2 size={16}/> Contratos autorizados ({selected.length})
    </span>
    <span class="relative block">
      <Search size={16} class="absolute left-3 top-1/2 -translate-y-1/2 text-app-text-muted"/>
      <input bind:value={query} maxlength="120" autocomplete="off" placeholder="Pesquisar empresa ou contrato"
        class="application-text-caption h-10 w-full rounded-lg border border-app-border-control bg-app-subtle pl-9 pr-3"/>
    </span>
  </label>

  {#if loading}
    <p class="application-text-meta text-app-text-muted">Pesquisando...</p>
  {/if}
  {#if searchError}
    <p role="alert" class="application-text-caption text-app-danger-text">{searchError}</p>
  {/if}
  {#if matches.length > 0}
    <div class="max-h-56 divide-y divide-app-border-soft overflow-y-auto rounded-lg border border-app-border">
      {#each matches as item (item.contractId)}
        <button type="button" disabled={selected.length >= maxSelected || selected.some((chosen) => chosen.contractId === item.contractId)}
          class="flex w-full items-center justify-between gap-3 px-3 py-2.5 text-left hover:bg-app-subtle disabled:opacity-45"
          on:click={() => add(item)}>
          <span class="min-w-0">
            <strong class="application-text-caption block truncate">{item.displayName}</strong>
            <span class="application-text-meta text-app-text-muted">Contrato {item.contractNumber ?? item.contractId}</span>
          </span>
          {#if selected.some((chosen) => chosen.contractId === item.contractId)}
            <Check size={17} class="shrink-0 text-app-success-text"/>
          {:else}
            <Plus size={17} class="shrink-0 text-app-primary"/>
          {/if}
        </button>
      {/each}
    </div>
  {/if}

  {#if selected.length > 0}
    <div class="max-h-64 space-y-2 overflow-y-auto">
      {#each selected as item (item.contractId)}
        <div class="flex items-center justify-between gap-2 rounded-lg bg-app-subtle px-3 py-2">
          <span class="min-w-0">
            <strong class="application-text-caption block truncate">{item.displayName}</strong>
            <span class="application-text-meta text-app-text-muted">Contrato {item.contractNumber ?? item.contractId}</span>
          </span>
          <button type="button" class="rounded-lg p-2 text-app-text-muted hover:bg-app-surface"
            aria-label={"Remover " + item.displayName} on:click={() => remove(item.contractId)}>
            <X size={16}/>
          </button>
        </div>
      {/each}
    </div>
  {/if}
</div>