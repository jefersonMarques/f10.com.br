<script lang="ts">
  import { onDestroy } from "svelte";
  import { Building2, Check, Search, UserRound, X } from "lucide-svelte";

  export let enabled = false;

  type CustomerOption = {
    id: string;
    name: string;
    email: string | null;
    phone: string | null;
    whatsapp: string | null;
    organizationName: string | null;
    latestUnitName: string | null;
    latestGroupName: string | null;
    openTicketCount: number;
  };

  let customerContactId = "";
  let customerName = "";
  let organizationName = "";
  let customerEmail = "";
  let customerPhone = "";
  let customerWhatsapp = "";
  let query = "";
  let results: CustomerOption[] = [];
  let selectedCustomer: CustomerOption | null = null;
  let loading = false;
  let searchError = "";
  let debounceTimer: ReturnType<typeof setTimeout> | null = null;
  let requestSequence = 0;

  $: if (enabled && !selectedCustomer) scheduleSearch(query);

  function scheduleSearch(value: string): void {
    if (debounceTimer) clearTimeout(debounceTimer);
    const normalized = value.trim();
    if (normalized.length < 2) {
      results = [];
      loading = false;
      searchError = "";
      return;
    }
    debounceTimer = setTimeout(() => void searchCustomers(normalized), 250);
  }

  async function searchCustomers(value: string): Promise<void> {
    const sequence = ++requestSequence;
    loading = true;
    searchError = "";
    try {
      const response = await fetch(`/api/app/customers/search?q=${encodeURIComponent(value)}`, {
        cache: "no-store",
      });
      if (sequence !== requestSequence) return;
      if (!response.ok) {
        results = [];
        searchError = "Não foi possível pesquisar clientes.";
        return;
      }
      const payload = await response.json() as { customers: CustomerOption[] };
      results = payload.customers;
    } catch {
      if (sequence !== requestSequence) return;
      results = [];
      searchError = "Não foi possível pesquisar clientes.";
    } finally {
      if (sequence === requestSequence) loading = false;
    }
  }

  function selectCustomer(customer: CustomerOption): void {
    selectedCustomer = customer;
    customerContactId = customer.id;
    customerName = customer.name;
    organizationName = customer.organizationName ?? "";
    customerEmail = customer.email ?? "";
    customerPhone = customer.phone ?? "";
    customerWhatsapp = customer.whatsapp ?? "";
    query = "";
    results = [];
    searchError = "";
  }

  function clearSelection(): void {
    selectedCustomer = null;
    customerContactId = "";
    customerName = "";
    organizationName = "";
    customerEmail = "";
    customerPhone = "";
    customerWhatsapp = "";
    query = "";
    results = [];
  }

  onDestroy(() => {
    if (debounceTimer) clearTimeout(debounceTimer);
  });
</script>

<input type="hidden" name="customerContactId" value={customerContactId} />

{#if enabled}
  <div class="sm:col-span-2">
    {#if selectedCustomer}
      <div class="flex items-start gap-3 rounded-xl border border-[#C8D2F1] bg-[#F7F8FF] p-3">
        <span class="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white text-[#000A57] shadow-sm"><Check size={16}/></span>
        <div class="min-w-0 flex-1">
          <strong class="application-text-caption block truncate font-semibold text-[#252B3B]">{selectedCustomer.name}</strong>
          <span class="application-text-meta mt-0.5 block truncate text-[#747B8A]">{selectedCustomer.organizationName ?? "Sem escola / empresa"}{selectedCustomer.latestUnitName ? ` · ${selectedCustomer.latestUnitName}` : ""}</span>
          <span class="application-text-meta mt-1 block text-[#8A909D]">{selectedCustomer.openTicketCount} ticket(s) aberto(s)</span>
        </div>
        <button type="button" on:click={clearSelection} class="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-[#727988] hover:bg-white" aria-label="Trocar cliente"><X size={14}/></button>
      </div>
    {:else}
      <label class="block">
        <span class="application-text-meta mb-1.5 block font-bold uppercase tracking-[0.07em] text-[#858B99]">Cliente existente</span>
        <span class="relative block"><Search size={14} class="absolute left-3 top-1/2 -translate-y-1/2 text-[#989EAA]"/><input bind:value={query} autocomplete="off" placeholder="Buscar por nome, escola, e-mail, telefone ou WhatsApp" class="application-text-caption h-10 w-full rounded-xl border border-[#DDE1EA] bg-[#FAFAFC] pl-9 pr-3 outline-none focus:border-[#000A57]"/></span>
      </label>
      {#if loading}<p class="application-text-meta mt-2 text-[#8A909D]">Pesquisando clientes...</p>{/if}
      {#if searchError}<p class="application-text-meta mt-2 text-[#A13B3B]">{searchError}</p>{/if}
      {#if results.length > 0}
        <div class="mt-2 max-h-48 overflow-y-auto rounded-xl border border-[#E1E4EA] bg-white p-1 shadow-lg">
          {#each results as customer (customer.id)}
            <button type="button" on:click={() => selectCustomer(customer)} class="flex w-full items-start gap-2.5 rounded-lg px-3 py-2.5 text-left hover:bg-[#F6F7FB]">
              <span class="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#F0F2F7] text-[#000A57]">{#if customer.organizationName}<Building2 size={14}/>{:else}<UserRound size={14}/>{/if}</span>
              <span class="min-w-0 flex-1"><strong class="application-text-caption block truncate font-semibold text-[#303746]">{customer.name}</strong><span class="application-text-meta mt-0.5 block truncate text-[#7B8291]">{customer.organizationName ?? "Sem escola / empresa"}{customer.latestUnitName ? ` · ${customer.latestUnitName}` : ""}</span><span class="application-text-meta mt-0.5 block truncate text-[#969BA7]">{customer.email || customer.phone || customer.whatsapp || "Sem canal cadastrado"}</span></span>
            </button>
          {/each}
        </div>
      {:else if query.trim().length >= 2 && !loading && !searchError}
        <p class="application-text-meta mt-2 text-[#8A909D]">Nenhum cliente encontrado. Preencha os dados abaixo para criar um novo contato.</p>
      {/if}
    {/if}
  </div>
{/if}

<div class="sm:col-span-2 grid gap-3 sm:grid-cols-2">
  <input name="customerName" bind:value={customerName} readonly={Boolean(selectedCustomer)} required maxlength="120" placeholder="Cliente" class={`application-text-caption h-10 rounded-xl border border-[#DDE1EA] px-3 ${selectedCustomer ? "bg-[#F7F8FA] text-[#737A89]" : "bg-white"}`}/>
  <input name="organizationName" bind:value={organizationName} readonly={Boolean(selectedCustomer)} maxlength="160" placeholder="Escola / empresa" class={`application-text-caption h-10 rounded-xl border border-[#DDE1EA] px-3 ${selectedCustomer ? "bg-[#F7F8FA] text-[#737A89]" : "bg-white"}`}/>
  <input name="customerEmail" bind:value={customerEmail} readonly={Boolean(selectedCustomer)} type="email" maxlength="254" placeholder="E-mail" class={`application-text-caption h-10 rounded-xl border border-[#DDE1EA] px-3 ${selectedCustomer ? "bg-[#F7F8FA] text-[#737A89]" : "bg-white"}`}/>
  <input name="customerPhone" bind:value={customerPhone} readonly={Boolean(selectedCustomer)} maxlength="40" placeholder="Telefone" class={`application-text-caption h-10 rounded-xl border border-[#DDE1EA] px-3 ${selectedCustomer ? "bg-[#F7F8FA] text-[#737A89]" : "bg-white"}`}/>
  <input name="customerWhatsapp" bind:value={customerWhatsapp} readonly={Boolean(selectedCustomer)} maxlength="40" placeholder="WhatsApp" class={`application-text-caption h-10 rounded-xl border border-[#DDE1EA] px-3 sm:col-span-2 ${selectedCustomer ? "bg-[#F7F8FA] text-[#737A89]" : "bg-white"}`}/>
</div>
