<script lang="ts">
  import { onDestroy } from "svelte";
  import TicketContractAccessModal from "./TicketContractAccessModal.svelte";
  import { selectAuthorizedSchoolContracts } from "$lib/support/ticketSchoolContractSelection";
  import {
    Building2, Check, Mail, Plus, Search, ShieldCheck, UserRound,
    Users, X, Settings2,
  } from "lucide-svelte";

  export let enabled = false;
  export let canSearchF10Contracts = false;
  export let canManageCustomers = false;

  type Contact = { id: string; name: string; email: string | null };
  type Contract = {
    contractId: string;
    contractNumber: string | null;
    displayName: string;
    status: string;
    isActive: boolean;
  };

  let customerMode: "existing" | "new" = "existing";
  let selectedCustomer: Contact | null = null;
  let customerContactId = "";
  let requesterQuery = "";
  let requesterResults: Contact[] = [];
  let availableContracts: Contract[] = [];
  let selectedContracts: Contract[] = [];
  let contractQuery = "";
  let attendeeQuery = "";
  let attendeeResults: Contact[] = [];
  let attendeeError = "";
  let attendees: Contact[] = [];
  let loading = false;
  let managingContracts = false;
  let error = "";
  let requesterTimer: ReturnType<typeof setTimeout> | null = null;
  let contractTimer: ReturnType<typeof setTimeout> | null = null;
  let attendeeTimer: ReturnType<typeof setTimeout> | null = null;
  let requesterSequence = 0;
  let contractSequence = 0;
  let attendeeSequence = 0;

  $: if (customerMode === "existing" && !selectedCustomer) scheduleRequesterSearch(requesterQuery);
  $: if (customerMode === "new") scheduleContractSearch(contractQuery);
  $: scheduleAttendeeSearch(attendeeQuery);

  function scheduleRequesterSearch(query: string): void {
    if (requesterTimer) clearTimeout(requesterTimer);
    if (query.trim().length < 2) {
      requesterSequence += 1;
      requesterResults = [];
      return;
    }
    requesterTimer = setTimeout(() => void searchContacts(query, "requester"), 280);
  }

  function scheduleContractSearch(query: string): void {
    if (contractTimer) clearTimeout(contractTimer);
    if (query.trim().length < 2) {
      contractSequence += 1;
      availableContracts = [];
      return;
    }
    contractTimer = setTimeout(() => void searchGlobalContracts(query), 280);
  }

  function scheduleAttendeeSearch(query: string): void {
    if (attendeeTimer) clearTimeout(attendeeTimer);
    attendeeError = "";
    if (query.trim().length < 2 || selectedContracts.length === 0) {
      attendeeSequence += 1;
      attendeeResults = [];
      return;
    }
    attendeeTimer = setTimeout(() => void searchContacts(query, "attendee"), 280);
  }

  async function searchContacts(query: string, purpose: "requester" | "attendee"): Promise<void> {
    const sequence = purpose === "requester" ? ++requesterSequence : ++attendeeSequence;
    try {
      const parameters = new URLSearchParams({
        purpose,
        q: query.trim(),
      });
      if (purpose === "attendee") {
        selectedContracts.forEach((contract) => parameters.append("contractId", contract.contractId));
      }
      const response = await fetch(
        "/api/app/customers/search?" + parameters.toString(),
        { cache: "no-store" },
      );
      if (!response.ok) {
        if (purpose === "attendee") {
          const failure = await response.json().catch(() => null) as {
            reference?: unknown;
          } | null;
          const reference = typeof failure?.reference === "string" &&
            /^[A-F0-9]{8}$/.test(failure.reference)
            ? failure.reference : null;
          const message = response.status === 401
            ? "Sessão expirada. Entre novamente para pesquisar acompanhantes."
            : response.status === 403
              ? "Sem permissão para pesquisar acompanhantes."
              : reference
                ? "Não foi possível pesquisar acompanhantes. Referência: " + reference
                : "Não foi possível pesquisar acompanhantes.";
          throw new Error(message);
        }
        throw new Error("CONTACT_SEARCH_FAILED");
      }
      const data = await response.json() as { customers: Contact[] };
      if (purpose === "requester" && sequence === requesterSequence) {
        requesterResults = data.customers;
        error = "";
      }
      if (purpose === "attendee" && sequence === attendeeSequence) {
        attendeeResults = data.customers;
        attendeeError = "";
      }
    } catch (cause) {
      if (purpose === "requester" && sequence === requesterSequence) {
        error = "Não foi possível pesquisar pessoas.";
      }
      if (purpose === "attendee" && sequence === attendeeSequence) {
        attendeeError = cause instanceof Error
          ? cause.message : "Não foi possível pesquisar acompanhantes.";
      }
    }
  }

  async function selectCustomer(contact: Contact): Promise<void> {
    requesterSequence += 1;
    if (requesterTimer) clearTimeout(requesterTimer);
    error = "";
    selectedCustomer = contact;
    customerContactId = contact.id;
    requesterQuery = "";
    requesterResults = [];
    attendeeQuery = "";
    attendeeError = "";
    selectedContracts = [];
    availableContracts = [];
    attendees = attendees.filter((person) => person.id !== contact.id);
    await loadContactContracts(contact);
  }

  async function loadContactContracts(contact: Contact): Promise<void> {
    loading = true;
    error = "";
    try {
      const response = await fetch(
        "/api/app/customers/" + encodeURIComponent(contact.id) + "/contracts",
        { cache: "no-store" },
      );
      if (!response.ok) throw new Error("CONTACT_ACCESS_FAILED");
      const data = await response.json() as { contracts: Array<{
        contractId: string;
        contractNumber: string | null;
        name: string;
        status: string;
        isActive: boolean;
      }> };
      if (selectedCustomer?.id !== contact.id) return;

      availableContracts = data.contracts.map((item) => ({
        contractId: item.contractId,
        contractNumber: item.contractNumber,
        displayName: item.name,
        status: item.status,
        isActive: item.isActive,
      }));
      selectedContracts = selectAuthorizedSchoolContracts(
        availableContracts,
        selectedContracts.map((contract) => contract.contractId),
      );
    } catch {
      error = "Não foi possível carregar os contratos autorizados.";
    } finally {
      loading = false;
    }
  }

  async function searchGlobalContracts(query: string): Promise<void> {
    const sequence = ++contractSequence;
    loading = true;
    try {
      const response = await fetch(
        "/api/app/customers/contracts/search?q=" + encodeURIComponent(query.trim()),
        { cache: "no-store" },
      );
      if (!response.ok) throw new Error("CONTRACT_SEARCH_FAILED");
      const data = await response.json() as { contracts: Contract[] };
      if (sequence === contractSequence) availableContracts = data.contracts;
    } catch {
      if (sequence === contractSequence) error = "Não foi possível pesquisar contratos.";
    } finally {
      if (sequence === contractSequence) loading = false;
    }
  }

  function selectContract(contract: Contract): void {
    if (selectedContracts.some((item) => item.contractId === contract.contractId) ||
        selectedContracts.length >= 500) return;
    selectedContracts = [...selectedContracts, contract];
    attendeeQuery = "";
    attendeeError = "";
    attendeeResults = [];
    attendees = [];
    attendeeSequence += 1;
  }

  function removeContract(id: string): void {
    selectedContracts = selectedContracts.filter((item) => item.contractId !== id);
    attendeeQuery = "";
    attendeeError = "";
    attendeeResults = [];
    attendees = [];
    attendeeSequence += 1;
  }

  function selectAttendee(contact: Contact): void {
    if (selectedContracts.length === 0 || contact.id === customerContactId ||
        attendees.some((item) => item.id === contact.id) ||
        attendees.length >= 20) return;
    attendees = [...attendees, contact];
    attendeeQuery = "";
    attendeeError = "";
    attendeeResults = [];
  }

  function reset(): void {
    requesterSequence += 1;
    contractSequence += 1;
    attendeeSequence += 1;
    selectedCustomer = null;
    customerContactId = "";
    selectedContracts = [];
    availableContracts = [];
    attendees = [];
    requesterQuery = "";
    contractQuery = "";
    attendeeQuery = "";
    attendeeError = "";
    managingContracts = false;
    error = "";
  }

  function toggleNew(): void {
    const wasNew = customerMode === "new";
    reset();
    customerMode = wasNew ? "existing" : "new";
  }

  onDestroy(() => {
    if (requesterTimer) clearTimeout(requesterTimer);
    if (contractTimer) clearTimeout(contractTimer);
    if (attendeeTimer) clearTimeout(attendeeTimer);
    requesterSequence += 1;
    contractSequence += 1;
    attendeeSequence += 1;
  });
</script>

<input type="hidden" name="customerMode" value={customerMode}/>
<input type="hidden" name="customerContactId" value={customerContactId}/>
<input type="hidden" name="customerContextTicketId" value=""/>
<input type="hidden" name="f10ContractId" value=""/>
{#each selectedContracts as contract (contract.contractId)}
  <input type="hidden" name="contractIds" value={contract.contractId}/>
{/each}
{#each attendees as person (person.id)}
  <input type="hidden" name="participantIds" value={person.id}/>
{/each}

{#if enabled}
  <div class="space-y-4 sm:col-span-2">
    <section class="space-y-2">
      <div class="flex items-center justify-between gap-2">
        <h3 class="application-text-caption flex items-center gap-2 font-bold text-app-text">
          <UserRound size={17}/> Solicitante principal *
        </h3>
        {#if canManageCustomers}
          <button type="button" on:click={toggleNew}
            class="application-text-caption inline-flex h-9 items-center gap-1 rounded-lg border border-app-border-control px-3 font-semibold text-app-primary">
            {#if customerMode === "new"}<X size={15}/> Cancelar{:else}<Plus size={15}/> Nova pessoa{/if}
          </button>
        {/if}
      </div>

      {#if customerMode === "new"}
        <div class="grid gap-2 rounded-xl border border-app-border bg-app-subtle p-3 sm:grid-cols-2">
          <input name="customerName" required minlength="2" maxlength="120" placeholder="Nome completo *"
            class="application-text-caption h-10 rounded-lg border border-app-border-control px-3"/>
          <input name="customerEmail" type="email" required maxlength="254" placeholder="E-mail *"
            class="application-text-caption h-10 rounded-lg border border-app-border-control px-3"/>
          <input name="customerPhone" maxlength="40" placeholder="Telefone"
            class="application-text-caption h-10 rounded-lg border border-app-border-control px-3"/>
          <input name="customerWhatsapp" maxlength="40" placeholder="WhatsApp"
            class="application-text-caption h-10 rounded-lg border border-app-border-control px-3"/>
          <input name="organizationName" type="hidden" value=""/>
        </div>
      {:else if selectedCustomer}
        <div class="flex items-center justify-between gap-2 rounded-lg border border-app-border bg-app-subtle p-3">
          <span class="min-w-0">
            <strong class="application-text-caption block truncate">{selectedCustomer.name}</strong>
            <span class="application-text-meta text-app-text-muted">{selectedCustomer.email ?? "Sem e-mail"}</span>
          </span>
          <button type="button" on:click={reset} aria-label="Alterar solicitante">
            <X size={17} class="text-app-text-muted"/>
          </button>
        </div>
      {:else}
        <label class="relative block">
          <Search size={16} class="absolute left-3 top-1/2 -translate-y-1/2 text-app-text-muted"/>
          <input bind:value={requesterQuery} maxlength="120" autocomplete="off"
            placeholder="Buscar pessoa por nome ou e-mail"
            class="application-text-caption h-10 w-full rounded-lg border border-app-border-control pl-9 pr-3"/>
        </label>
        {#if requesterResults.length > 0}
          <div class="max-h-48 divide-y divide-app-border-soft overflow-y-auto rounded-lg border border-app-border">
            {#each requesterResults as contact (contact.id)}
              <button type="button" on:click={() => void selectCustomer(contact)}
                class="flex w-full items-center gap-2 p-2.5 text-left hover:bg-app-subtle">
                <UserRound size={16} class="shrink-0 text-app-primary"/>
                <span>
                  <strong class="application-text-caption block">{contact.name}</strong>
                  <span class="application-text-meta text-app-text-muted">{contact.email ?? ""}</span>
                </span>
              </button>
            {/each}
          </div>
        {/if}
      {/if}
    </section>

    <section class="space-y-2 rounded-xl border border-app-border p-3">
      <div class="flex items-center justify-between gap-2">
        <h3 class="application-text-caption flex items-center gap-2 font-bold text-app-text">
          <Building2 size={17}/> Escola / contrato * ({selectedContracts.length})
        </h3>
        {#if customerMode === "existing" && selectedCustomer && canManageCustomers && canSearchF10Contracts}
          <button type="button" on:click={() => (managingContracts = true)}
            class="application-text-caption inline-flex items-center gap-1 text-app-primary font-semibold">
            <Settings2 size={15}/> Gerenciar vínculos
          </button>
        {/if}
      </div>
      {#if customerMode === "new" && canSearchF10Contracts}
        <input bind:value={contractQuery} maxlength="120" placeholder="Buscar escola ou nº do contrato"
          class="application-text-caption h-10 w-full rounded-lg border border-app-border-control px-3"/>
      {/if}
      {#if loading}<p class="application-text-caption text-app-text-muted">Carregando escolas...</p>{/if}
      {#if availableContracts.length > 0}
        <div class="max-h-44 divide-y divide-app-border-soft overflow-y-auto rounded-lg border border-app-border">
          {#each availableContracts as contract (contract.contractId)}
            <button type="button" on:click={() => selectContract(contract)}
              disabled={selectedContracts.some((item) => item.contractId === contract.contractId)}
              class="flex w-full items-center justify-between gap-2 px-3 py-2 text-left hover:bg-app-subtle disabled:opacity-50">
              <span class="min-w-0">
                <strong class="application-text-caption block truncate">{contract.displayName}</strong>
                <span class="application-text-meta text-app-text-muted">
                  Contrato {contract.contractNumber ?? contract.contractId}
                  {#if !contract.isActive} · Inativo{/if}
                </span>
              </span>
              {#if selectedContracts.some((item) => item.contractId === contract.contractId)}
                <Check size={17} class="shrink-0 text-app-success-text"/>
              {:else}
                <Plus size={17} class="shrink-0 text-app-primary"/>
              {/if}
            </button>
          {/each}
        </div>
      {:else if selectedCustomer && !loading}
        <div class="rounded-lg bg-app-subtle p-3">
          <p class="application-text-caption font-medium text-app-text">Nenhuma escola autorizada.</p>
          <p class="application-text-meta text-app-text-muted">
            {#if canManageCustomers && canSearchF10Contracts}
              Use Gerenciar vínculos acima para associar um contrato e continuar.
            {:else}
              Solicite a um administrador a vinculação da pessoa a uma escola em Clientes → Pessoas e contatos.
            {/if}
          </p>
        </div>
      {/if}
      {#if selectedContracts.length > 0}
        <div class="flex flex-wrap gap-2">
          {#each selectedContracts as contract (contract.contractId)}
            <button type="button" on:click={() => removeContract(contract.contractId)}
              title={"Remover contrato " + contract.contractId}
              class="application-text-caption inline-flex max-w-full items-center gap-2 rounded-lg bg-app-subtle px-3 py-2 text-app-text">
              <span class="truncate">{contract.displayName} · {contract.contractNumber ?? contract.contractId}</span>
              <X size={15} class="shrink-0"/>
            </button>
          {/each}
        </div>
      {/if}
    </section>

    <section class="space-y-2 rounded-xl border border-app-border p-3">
      <h3 class="application-text-caption flex items-center gap-2 font-bold text-app-text">
        <Users size={17}/> Pessoas acompanhantes ({attendees.length})
      </h3>
      <label class="relative block">
        <Search size={16} class="absolute left-3 top-1/2 -translate-y-1/2 text-app-text-muted"/>
        <input bind:value={attendeeQuery} disabled={selectedContracts.length === 0} maxlength="120"
          placeholder={selectedContracts.length === 0 ? "Selecione uma escola primeiro" : "Buscar pessoa autorizada"}
          class="application-text-caption h-10 w-full rounded-lg border border-app-border-control pl-9 pr-3"/>
      </label>
      {#if attendeeError}
        <p role="alert" class="application-text-caption text-app-danger-text">{attendeeError}</p>
      {/if}
      {#if attendeeResults.length > 0}
        <div class="max-h-40 divide-y divide-app-border-soft overflow-y-auto rounded-lg border border-app-border">
          {#each attendeeResults as contact (contact.id)}
            <button type="button" on:click={() => selectAttendee(contact)}
              class="flex w-full items-center gap-2 p-2.5 text-left hover:bg-app-subtle">
              <UserRound size={15} class="text-app-primary"/>
              <span class="application-text-caption">{contact.name} · {contact.email ?? "Sem e-mail"}</span>
            </button>
          {/each}
        </div>
      {/if}
      {#if attendees.length > 0}
        <div class="flex flex-wrap gap-2">
          {#each attendees as contact (contact.id)}
            <button type="button" on:click={() => (attendees = attendees.filter((item) => item.id !== contact.id))}
              class="application-text-meta inline-flex items-center gap-2 rounded-lg bg-app-subtle px-3 py-2">
              <UserRound size={14}/>{contact.name}<X size={14}/>
            </button>
          {/each}
        </div>
      {/if}
      <p class="application-text-meta flex items-center gap-1.5 text-app-text-muted">
        <ShieldCheck size={14}/> Cada acompanhante precisa ter acesso a todos os contratos selecionados.
      </p>
    </section>
    {#if error}<p role="alert" class="application-text-caption text-app-danger-text">{error}</p>{/if}
  </div>
  {#if managingContracts && selectedCustomer}
    <TicketContractAccessModal
      contact={selectedCustomer}
      existingIds={availableContracts.map((contract) => contract.contractId)}
      onClose={() => (managingContracts = false)}
      onSaved={() => loadContactContracts(selectedCustomer!)}
    />
  {/if}
{/if}