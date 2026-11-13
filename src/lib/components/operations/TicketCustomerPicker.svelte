<script lang="ts">
  import { onDestroy } from "svelte";
  import {
    Building2,
    Check,
    Plus,
    Search,
    UserRound,
    X,
  } from "lucide-svelte";

  export let enabled = false;
  export let canSearchF10Contracts = false;

  type CustomerOption = {
    id: string;
    name: string;
    email: string | null;
    phone: string | null;
    whatsapp: string | null;
    organizationName: string | null;
    latestContextTicketId: string;
    latestGroupId: number;
    latestGroupName: string;
    latestSubgroup: boolean | null;
    latestUnitId: number;
    latestUnitName: string;
    latestUnitSchema: string;
    openTicketCount: number;
  };

  type ContractOption = {
    contractId: string;
    contractNumber: string | null;
    displayName: string;
    personName: string | null;
    holderName: string | null;
    nickname: string | null;
    groupName: string | null;
    status: string;
  };

  let customerMode: "existing" | "api_contract" | "new" = "existing";
  let f10ContractId = "";
  let contracts: ContractOption[] = [];
  let selectedContract: ContractOption | null = null;
  let customerContactId = "";
  let customerContextTicketId = "";
  let query = "";
  let results: CustomerOption[] = [];
  let selectedCustomer: CustomerOption | null = null;
  let loading = false;
  let searchError = "";
  let debounceTimer: ReturnType<typeof setTimeout> | null = null;
  let requestSequence = 0;

  $: if (enabled && customerMode !== "new" && !selectedCustomer && !selectedContract) {
    scheduleSearch(query);
  }

  function scheduleSearch(value: string): void {
    if (debounceTimer) clearTimeout(debounceTimer);
    const normalized = value.trim();
    if (normalized.length < 2) {
      requestSequence += 1;
      results = [];
      contracts = [];
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
    const oldSearch = "/api/app/customers/search?q=" + encodeURIComponent(value);
    const apiSearch = "/api/app/customers/contracts/search?q=" + encodeURIComponent(value);

    try {
      const [contactResponse, contractResponse] = await Promise.all([
        fetch(oldSearch, { cache: "no-store" }),
        canSearchF10Contracts
          ? fetch(apiSearch, { cache: "no-store" })
          : Promise.resolve(null),
      ]);
      if (sequence !== requestSequence) return;

      if (!contactResponse.ok || (contractResponse && !contractResponse.ok)) {
        throw new Error("CUSTOMER_SEARCH_FAILED");
      }
      const contactPayload = await contactResponse.json() as { customers: CustomerOption[] };
      const contractPayload = contractResponse
        ? await contractResponse.json() as { contracts: ContractOption[] }
        : { contracts: [] };

      if (sequence !== requestSequence) return;
      results = contactPayload.customers;
      contracts = contractPayload.contracts;
    } catch {
      if (sequence !== requestSequence) return;
      results = [];
      contracts = [];
      searchError = "Não foi possível pesquisar clientes.";
    } finally {
      if (sequence === requestSequence) loading = false;
    }
  }

  function selectCustomer(customer: CustomerOption): void {
    customerMode = "existing";
    selectedContract = null;
    f10ContractId = "";
    selectedCustomer = customer;
    customerContactId = customer.id;
    customerContextTicketId = customer.latestContextTicketId;
    query = "";
    results = [];
    contracts = [];
    searchError = "";
  }

  function selectContract(contract: ContractOption): void {
    customerMode = "api_contract";
    selectedCustomer = null;
    selectedContract = contract;
    f10ContractId = contract.contractId;
    customerContactId = "";
    customerContextTicketId = "";
    query = "";
    results = [];
    contracts = [];
    searchError = "";
  }

  function clearSelection(): void {
    requestSequence += 1;
    customerMode = "existing";
    selectedCustomer = null;
    selectedContract = null;
    f10ContractId = "";
    customerContactId = "";
    customerContextTicketId = "";
    query = "";
    results = [];
    contracts = [];
  }

  function toggleNewCustomer(): void {
    const wasNew = customerMode === "new";
    clearSelection();
    customerMode = wasNew ? "existing" : "new";
  }

  onDestroy(() => {
    if (debounceTimer) clearTimeout(debounceTimer);
  });
</script>

<input type="hidden" name="customerMode" value={customerMode} />
<input type="hidden" name="customerContactId" value={customerContactId} />
<input type="hidden" name="customerContextTicketId" value={customerContextTicketId} />
<input type="hidden" name="f10ContractId" value={f10ContractId} />

{#if enabled}
  <div class="sm:col-span-2">
    <div class="flex items-end gap-2">
      <div class="min-w-0 flex-1">
        <span class="application-text-meta mb-1.5 block font-bold uppercase tracking-[0.07em] text-[#858B99]">Cliente existente</span>
        {#if selectedContract}
          <div class="flex min-h-10 items-center gap-2 rounded-xl border border-[#C8D2F1] bg-[#F7F8FF] px-3">
            <Check size={14} class="shrink-0 text-[#000A57]"/>
            <div class="min-w-0 flex-1">
              <strong class="application-text-caption block truncate text-[#303746]">{selectedContract.displayName}</strong>
              <span class="application-text-meta block truncate text-[#727988]">Contrato {selectedContract.contractNumber ?? "#" + selectedContract.contractId} · API F10</span>
            </div>
            <button type="button" on:click={clearSelection} class="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-[#727988] hover:bg-white" aria-label="Trocar cliente"><X size={13}/></button>
          </div>
        {:else if selectedCustomer}
          <div class="flex min-h-10 items-center gap-2 rounded-xl border border-[#C8D2F1] bg-[#F7F8FF] px-3">
            <Check size={14} class="shrink-0 text-[#000A57]"/>
            <span class="min-w-0 flex-1 truncate application-text-caption font-semibold text-[#303746]">{selectedCustomer.name} · {selectedCustomer.latestUnitName}</span>
            <button type="button" on:click={clearSelection} class="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-[#727988] hover:bg-white" aria-label="Trocar cliente"><X size={13}/></button>
          </div>
        {:else}
          <span class="relative block">
            <Search size={14} class="absolute left-3 top-1/2 -translate-y-1/2 text-[#989EAA]"/>
            <input
              bind:value={query}
              autocomplete="off"
              disabled={customerMode === "new"}
              placeholder="Cliente, escola, pessoa ou nº contrato F10"
              class="application-text-caption h-10 w-full rounded-xl border border-[#DDE1EA] bg-[#FAFAFC] pl-9 pr-3 outline-none focus:border-[#000A57] disabled:opacity-50"
            />
          </span>
        {/if}
      </div>
      <button
        type="button"
        on:click={toggleNewCustomer}
        class={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border font-semibold transition ${customerMode === "new" ? "border-[#E3B98F] bg-[#FFF7EE] text-[#A55A12]" : "border-[#C9CEE0] bg-white text-[#000A57] hover:bg-[#F7F8FF]"}`}
        aria-label={customerMode === "new" ? "Cancelar novo cliente" : "Cadastrar novo cliente"}
        title={customerMode === "new" ? "Cancelar novo cliente" : "Cadastrar novo cliente"}
      >
        {#if customerMode === "new"}<X size={16}/>{:else}<Plus size={16}/>{/if}
      </button>
    </div>

    {#if customerMode !== "new" && !selectedCustomer && !selectedContract}
      {#if loading}<p role="status" class="application-text-meta mt-2 text-[#8A909D]">Pesquisando clientes...</p>{/if}
      {#if searchError}<p role="alert" class="application-text-meta mt-2 text-[#A13B3B]">{searchError}</p>{/if}
      {#if contracts.length > 0 || results.length > 0}
        <div class="mt-2 max-h-64 overflow-y-auto rounded-xl border border-[#E1E4EA] bg-white p-1 shadow-lg">
          {#if contracts.length > 0}
            <span class="application-text-meta block px-3 py-2 font-bold text-[#777D8D]">Contratos da API F10</span>
            {#each contracts as contract (contract.contractId)}
              <button type="button" on:click={() => selectContract(contract)}
                class="flex w-full items-start gap-2.5 rounded-lg px-3 py-2.5 text-left hover:bg-[#F6F7FB]">
                <span class="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#F0F2F7] text-[#000A57]"><Building2 size={15}/></span>
                <span class="min-w-0 flex-1">
                  <strong class="application-text-caption block truncate font-semibold text-[#303746]">{contract.displayName}</strong>
                  <span class="application-text-meta mt-0.5 block truncate text-[#7B8291]">Contrato {contract.contractNumber ?? "#" + contract.contractId} · {contract.status}</span>
                  {#if contract.personName}<span class="application-text-meta mt-0.5 block truncate text-[#7B8291]">Pessoa: {contract.personName}</span>{/if}
                  {#if contract.holderName && contract.holderName !== contract.personName}
                    <span class="application-text-meta mt-0.5 block truncate text-[#7B8291]">Titular: {contract.holderName}</span>
                  {/if}
                </span>
              </button>
            {/each}
          {/if}
          {#if results.length > 0}
            <span class="application-text-meta block px-3 py-2 font-bold text-[#777D8D]">Contatos com atendimento anterior</span>
            {#each results as customer (customer.id)}
              <button type="button" on:click={() => selectCustomer(customer)}
                class="flex w-full items-start gap-2.5 rounded-lg px-3 py-2.5 text-left hover:bg-[#F6F7FB]">
                <span class="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#F0F2F7] text-[#000A57]"><UserRound size={15}/></span>
                <span class="min-w-0 flex-1">
                  <strong class="application-text-caption block truncate font-semibold text-[#303746]">{customer.name}</strong>
                  <span class="application-text-meta mt-0.5 block truncate text-[#7B8291]">{customer.latestGroupName} · {customer.latestUnitName}</span>
                </span>
              </button>
            {/each}
          {/if}
        </div>
      {:else if query.trim().length >= 2 && !loading && !searchError}
        <p class="application-text-meta mt-2 text-[#8A909D]">Nenhum cliente encontrado na API ou no atendimento.</p>
      {/if}
    {/if}

    {#if selectedContract}
      <div class="mt-2 rounded-xl border border-[#E0E4EE] bg-[#FAFBFD] px-3 py-2.5">
        <div class="flex flex-wrap items-center justify-between gap-2">
          <strong class="application-text-caption text-[#3B4252]">{selectedContract.displayName}</strong>
          <span class="application-text-meta rounded-full bg-[#EEF0FF] px-2.5 py-1 font-bold text-[#000A57]">API F10</span>
        </div>
        <p class="application-text-meta mt-1 text-[#7A8190]">Contrato {selectedContract.contractNumber ?? "#" + selectedContract.contractId} · {selectedContract.status}</p>
        {#if selectedContract.personName}<p class="application-text-meta mt-1 text-[#7A8190]">Pessoa: {selectedContract.personName}</p>{/if}
        {#if selectedContract.holderName}<p class="application-text-meta mt-0.5 text-[#7A8190]">Titular: {selectedContract.holderName}</p>{/if}
      </div>
    {/if}

    {#if selectedCustomer}
      <div class="mt-2 rounded-xl border border-[#E0E4EE] bg-[#FAFBFD] px-3 py-2.5">
        <div class="flex items-start justify-between gap-3">
          <div>
            <strong class="application-text-caption text-[#3B4252]">{selectedCustomer.organizationName ?? selectedCustomer.latestGroupName}</strong>
            <p class="application-text-meta mt-1 text-[#7A8190]">{selectedCustomer.latestGroupName} · grupo {selectedCustomer.latestGroupId}</p>
            <p class="application-text-meta mt-0.5 text-[#7A8190]">{selectedCustomer.latestUnitName} · unidade {selectedCustomer.latestUnitId} · schema {selectedCustomer.latestUnitSchema}</p>
          </div>
          <span class="application-text-meta shrink-0 rounded-full bg-[#EEF0FF] px-2 py-1 font-bold text-[#000A57]">{selectedCustomer.openTicketCount} aberto(s)</span>
        </div>
      </div>
    {/if}

    {#if customerMode === "new"}
      <div class="mt-3 rounded-2xl border border-[#D8DDF0] bg-[#F8F9FF] p-4">
        <div class="flex items-center gap-2"><Plus size={14} class="text-[#000A57]"/><strong class="application-text-caption text-[#303746]">Novo cliente F10</strong></div>
        <p class="application-text-meta mt-1 leading-4 text-[#7C8290]">O cliente só será criado junto com o ticket e precisa nascer vinculado a grupo e unidade F10.</p>

        <div class="mt-4 grid gap-3 sm:grid-cols-2">
          <input name="customerName" required={customerMode === "new"} maxlength="120" placeholder="Nome do contato *" class="application-text-caption h-10 rounded-xl border border-[#DDE1EA] bg-white px-3"/>
          <input name="organizationName" required={customerMode === "new"} maxlength="160" placeholder="Escola / empresa *" class="application-text-caption h-10 rounded-xl border border-[#DDE1EA] bg-white px-3"/>
          <input name="customerEmail" type="email" maxlength="254" placeholder="E-mail" class="application-text-caption h-10 rounded-xl border border-[#DDE1EA] bg-white px-3"/>
          <input name="customerPhone" maxlength="40" placeholder="Telefone" class="application-text-caption h-10 rounded-xl border border-[#DDE1EA] bg-white px-3"/>
          <input name="customerWhatsapp" maxlength="40" placeholder="WhatsApp" class="application-text-caption h-10 rounded-xl border border-[#DDE1EA] bg-white px-3 sm:col-span-2"/>

          <div class="sm:col-span-2 mt-1 border-t border-[#E1E4ED] pt-3">
            <span class="application-text-meta font-bold uppercase tracking-[0.07em] text-[#858B99]">Contexto F10 obrigatório</span>
          </div>
          <input name="groupId" type="number" min="1" step="1" required={customerMode === "new"} placeholder="ID do grupo F10 *" class="application-text-caption h-10 rounded-xl border border-[#DDE1EA] bg-white px-3"/>
          <input name="groupName" required={customerMode === "new"} maxlength="160" placeholder="Nome do grupo *" class="application-text-caption h-10 rounded-xl border border-[#DDE1EA] bg-white px-3"/>
          <label>
            <span class="application-text-meta mb-1 block text-[#777D8D]">Subgrupo *</span>
            <select name="subgroup" required={customerMode === "new"} class="application-text-caption h-10 w-full rounded-xl border border-[#DDE1EA] bg-white px-3">
              <option value="">Selecione</option>
              <option value="false">Não</option>
              <option value="true">Sim</option>
            </select>
          </label>
          <input name="unitId" type="number" min="1" step="1" required={customerMode === "new"} placeholder="ID da unidade F10 *" class="application-text-caption h-10 self-end rounded-xl border border-[#DDE1EA] bg-white px-3"/>
          <input name="unitName" required={customerMode === "new"} maxlength="160" placeholder="Nome da unidade *" class="application-text-caption h-10 rounded-xl border border-[#DDE1EA] bg-white px-3"/>
          <input name="unitSchema" required={customerMode === "new"} maxlength="120" placeholder="Schema da unidade *" class="application-text-caption h-10 rounded-xl border border-[#DDE1EA] bg-white px-3"/>
        </div>
      </div>
    {/if}
  </div>
{:else}
  <div class="sm:col-span-2 rounded-xl border border-[#F0D2B5] bg-[#FFF8F1] px-3 py-2.5 application-text-meta text-[#8D551F]">Seu usuário não possui acesso ao cadastro de clientes F10.</div>
{/if}
