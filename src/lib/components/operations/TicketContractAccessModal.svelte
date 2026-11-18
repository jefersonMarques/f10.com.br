<script lang="ts">
  import { onDestroy } from "svelte";
  import { Building2, Check, Loader2, Plus, Search, X } from "lucide-svelte";

  type Contact = { id: string; name: string };
  type Contract = {
    contractId: string;
    contractNumber: string | null;
    displayName: string;
    status: string;
    isActive: boolean;
  };

  export let contact: Contact;
  export let existingIds: string[] = [];
  export let onClose: () => void;
  export let onSaved: () => Promise<void>;

  let query = "";
  let matches: Contract[] = [];
  let error = "";
  let loading = false;
  let savingId = "";
  let requestSequence = 0;
  let searchTimer: ReturnType<typeof setTimeout> | null = null;

  function scheduleSearch(): void {
    if (searchTimer) clearTimeout(searchTimer);
    if (query.trim().length < 2) {
      requestSequence += 1;
      matches = [];
      return;
    }
    searchTimer = setTimeout(() => void searchContracts(), 280);
  }

  async function searchContracts(): Promise<void> {
    const current = ++requestSequence;
    loading = true;
    error = "";
    try {
      const response = await fetch(
        "/api/app/customers/contracts/search?q=" + encodeURIComponent(query.trim()),
        { cache: "no-store" },
      );
      if (!response.ok) throw new Error("CONTRACT_LOOKUP_FAILED");
      const payload = await response.json() as { contracts: Contract[] };
      if (current === requestSequence) matches = payload.contracts;
    } catch {
      if (current === requestSequence) error = "Não foi possível buscar escolas.";
    } finally {
      if (current === requestSequence) loading = false;
    }
  }

  async function grant(contract: Contract): Promise<void> {
    if (savingId || !contract.isActive || existingIds.includes(contract.contractId)) return;
    savingId = contract.contractId;
    error = "";
    try {
      const response = await fetch(
        "/api/app/customers/" + encodeURIComponent(contact.id) + "/contracts",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ contractId: contract.contractId }),
        },
      );
      if (!response.ok) throw new Error("CONTRACT_GRANT_FAILED");
      await onSaved();
      onClose();
    } catch {
      error = "Não foi possível vincular. Confirme suas permissões e se o contrato está ativo.";
    } finally {
      savingId = "";
    }
  }

  onDestroy(() => {
    if (searchTimer) clearTimeout(searchTimer);
    requestSequence += 1;
  });
</script>

<div class="fixed inset-0 z-[160] flex items-center justify-center bg-[#010D28]/50 p-3" role="presentation">
  <button type="button" class="absolute inset-0" on:click={onClose} aria-label="Fechar vínculos"></button>
  <section role="dialog" aria-modal="true" aria-label="Gerenciar escolas da pessoa"
    class="relative z-10 w-full max-w-lg space-y-3 rounded-2xl bg-white p-4 shadow-xl">
    <div class="flex items-center justify-between gap-3">
      <div class="min-w-0">
        <h2 class="text-[16px] font-semibold text-app-text">Vincular escola / contrato</h2>
        <p class="application-text-caption truncate text-app-text-muted">{contact.name}</p>
      </div>
      <button type="button" on:click={onClose} aria-label="Fechar"><X size={19}/></button>
    </div>
    <p class="application-text-caption text-app-text-muted">
      O vínculo libera acesso contratual no suporte para esta pessoa.
    </p>
    <label class="relative block">
      <Search size={17} class="absolute left-3 top-1/2 -translate-y-1/2 text-app-text-muted"/>
      <input bind:value={query} on:input={scheduleSearch} maxlength="120"
        autocomplete="off" placeholder="Buscar escola ou nº do contrato"
        class="application-text-caption h-11 w-full rounded-lg border border-app-border-control pl-10 pr-3"/>
    </label>
    {#if loading}
      <p class="application-text-caption flex items-center gap-2 text-app-text-muted">
        <Loader2 size={16} class="animate-spin"/> Pesquisando...
      </p>
    {/if}
    {#if error}<p role="alert" class="application-text-caption text-app-danger-text">{error}</p>{/if}
    <div class="max-h-64 overflow-y-auto divide-y divide-app-border-soft rounded-lg border border-app-border">
      {#each matches as contract (contract.contractId)}
        <div class="flex items-center gap-3 px-3 py-2.5">
          <Building2 size={17} class="shrink-0 text-app-primary"/>
          <div class="min-w-0 flex-1">
            <strong class="application-text-caption block truncate">{contract.displayName}</strong>
            <span class="application-text-meta text-app-text-muted">
              Contrato {contract.contractNumber ?? contract.contractId}
              {#if !contract.isActive} · Inativo{/if}
            </span>
          </div>
          <button type="button" disabled={!contract.isActive || savingId !== "" ||
            existingIds.includes(contract.contractId)}
            aria-label={"Vincular " + contract.displayName}
            on:click={() => void grant(contract)}
            class="rounded-lg border border-app-border-control p-2 text-app-primary disabled:opacity-40">
            {#if existingIds.includes(contract.contractId)}
              <Check size={17}/>
            {:else if savingId === contract.contractId}
              <Loader2 size={17} class="animate-spin"/>
            {:else}
              <Plus size={17}/>
            {/if}
          </button>
        </div>
      {/each}
    </div>
    <p class="application-text-meta text-app-text-muted">
      Para remover vínculos existentes, abra o cadastro da pessoa em Clientes.
    </p>
  </section>
</div>
