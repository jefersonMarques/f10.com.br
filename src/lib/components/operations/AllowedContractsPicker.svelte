<script lang="ts">
  import { Building2, Search } from "lucide-svelte";

  type Contract = {
    contractId: string;
    name: string;
    contractNumber: string | null;
  };
  export let name = "contractIds";
  export let allowed: Contract[] = [];
  export let initiallySelected: string[] = [];

  let search = "";
  let selectedIds: string[] = [...initiallySelected];
  $: visible = allowed.filter((contract) => (
    contract.name + " " + (contract.contractNumber ?? "") + " " + contract.contractId
  ).toLowerCase().includes(search.trim().toLowerCase()));

  function toggle(id: string, checked: boolean): void {
    selectedIds = checked
      ? [...selectedIds.filter((value) => value !== id), id]
      : selectedIds.filter((value) => value !== id);
  }
</script>

<div class="space-y-3">
  {#each selectedIds as id (id)}
    <input type="hidden" {name} value={id}/>
  {/each}
  <label class="relative block">
    <Search size={16} class="absolute left-3 top-1/2 -translate-y-1/2 text-app-text-muted"/>
    <input bind:value={search} placeholder="Pesquisar contratos autorizados"
      class="application-text-caption h-10 w-full rounded-lg border border-app-border-control pl-9 pr-3"/>
  </label>
  <p class="application-text-meta text-app-text-muted">{selectedIds.length} contrato(s) selecionado(s) · {allowed.length} autorizado(s)</p>
  <div class="max-h-80 divide-y divide-app-border-soft overflow-y-auto rounded-lg border border-app-border">
    {#each visible as contract (contract.contractId)}
      <label class="flex cursor-pointer items-center gap-3 p-3 hover:bg-app-subtle">
        <input type="checkbox" checked={selectedIds.includes(contract.contractId)}
          on:change={(event) => toggle(contract.contractId, event.currentTarget.checked)}
          class="h-4 w-4"/>
        <Building2 size={17} class="shrink-0 text-app-primary"/>
        <span class="min-w-0">
          <strong class="application-text-caption block truncate">{contract.name}</strong>
          <span class="application-text-meta text-app-text-muted">
            Contrato {contract.contractNumber ?? contract.contractId}
          </span>
        </span>
      </label>
    {:else}
      <p class="application-text-caption p-3 text-app-text-muted">Nenhum contrato correspondente.</p>
    {/each}
  </div>
</div>