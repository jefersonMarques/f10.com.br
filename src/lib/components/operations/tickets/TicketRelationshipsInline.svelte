<script lang="ts">
  import { onDestroy, onMount, tick } from "svelte";
  import {
    Building2, Check, CircleAlert, LoaderCircle, Plus, Search,
    ShieldCheck, UserPlus, UserRound, Users, X,
  } from "lucide-svelte";

  type Contract = {
    contractId: string;
    contractNumber: string | null;
    name?: string;
    displayName?: string;
    isPrimary?: boolean;
  };

  type Contact = {
    id: string;
    name: string;
    email: string | null;
  };

  type Participant = {
    contactId: string;
    name: string;
    email: string | null;
    portalAccessEnabled: boolean;
    notificationsEnabled: boolean;
  };

  type Relationships = {
    requester: {
      contactId: string | null;
      explicitContactId: string | null;
      originalContactId: string | null;
      requesterName: string | null;
      requesterEmail: string | null;
    };
    contracts: Contract[];
    participants: Participant[];
    allowedContracts: Contract[];
    canEdit: boolean;
    canManageCustomers: boolean;
  };

  export let ticketId: string;
  export let onRefresh: () => void | Promise<void> = () => undefined;
  let contractSearchInput: HTMLInputElement;
  let contractSearchDialog: HTMLDialogElement;

  export async function focusContracts(): Promise<void> {
    if (!contractSearchDialog) return;
    if (!contractSearchDialog.open) contractSearchDialog.showModal();
    await loadRelationships();
    await tick();
    contractSearchInput?.focus();
  }

  let data: Relationships | null = null;
  let loading = true;
  let saving = false;
  let errorMessage = "";
  let successMessage = "";
  let contractSearch = "";
  let contractMatches: Contract[] = [];
  let contractSearchLoading = false;
  let contractSearchAttempted = false;
  let contractSearchError = "";
  let contactSearch = "";
  let contactMatches: Contact[] = [];
  let contractTimer: ReturnType<typeof setTimeout> | null = null;
  let contactTimer: ReturnType<typeof setTimeout> | null = null;
  let relationshipsRequestId = 0;
  let contractRequestId = 0;
  let contactRequestId = 0;

  $: if (contractSearch.trim().length >= 2 || /^[0-9]$/.test(contractSearch.trim())) scheduleContractSearch(contractSearch);
  $: if (contractSearch.trim().length < 2 && !/^[0-9]$/.test(contractSearch.trim())) {
    contractMatches = [];
    contractSearchAttempted = false;
    contractSearchError = "";
    contractSearchLoading = false;
    contractRequestId += 1;
    if (contractTimer) clearTimeout(contractTimer);
  }
  $: if (contactSearch.trim().length >= 2) scheduleContactSearch(contactSearch);
  $: if (contactSearch.trim().length < 2) {
    contactMatches = [];
    contactRequestId += 1;
    if (contactTimer) clearTimeout(contactTimer);
  }

  onMount(() => {
    void loadRelationships();
  });

  onDestroy(() => {
    if (contractTimer) clearTimeout(contractTimer);
    if (contactTimer) clearTimeout(contactTimer);
    relationshipsRequestId += 1;
    contractRequestId += 1;
    contactRequestId += 1;
  });

  async function loadRelationships(): Promise<void> {
    const requestId = ++relationshipsRequestId;
    loading = true;
    try {
      const response = await fetch(
        "/api/app/tickets/" + encodeURIComponent(ticketId) + "/relationships",
        { cache: "no-store" },
      );
      if (!response.ok) throw new Error(response.status === 403 ? "RELATIONSHIPS_FORBIDDEN" : "RELATIONSHIPS_LOAD_FAILED");
      const next = await response.json() as Relationships;
      if (requestId !== relationshipsRequestId) return;
      data = next;
      errorMessage = "";
    } catch (cause) {
      if (requestId !== relationshipsRequestId) return;
      data = null;
      errorMessage = cause instanceof Error && cause.message === "RELATIONSHIPS_FORBIDDEN"
        ? "Seu perfil não possui permissão para consultar os contratos F10 deste ticket."
        : "Não foi possível carregar empresas e pessoas deste ticket.";
    } finally {
      if (requestId === relationshipsRequestId) {
        loading = false;
        if (contractSearchDialog?.open) {
          await tick();
          contractSearchInput?.focus();
        }
      }
    }
  }

  function scheduleContractSearch(value: string): void {
    if (contractTimer) clearTimeout(contractTimer);
    contractTimer = setTimeout(() => void searchContracts(value), 260);
  }

  async function searchContracts(value: string): Promise<void> {
    const requestId = ++contractRequestId;
    contractSearchLoading = true;
    contractSearchAttempted = false;
    contractSearchError = "";

    try {
      const response = await fetch(
        "/api/app/customers/contracts/search?q=" + encodeURIComponent(value.trim()),
        { cache: "no-store" },
      );
      if (response.status === 403) throw new Error("CONTRACT_SEARCH_FORBIDDEN");
      if (!response.ok) throw new Error("CONTRACT_SEARCH_FAILED");

      const payload = await response.json() as { contracts?: Contract[] };
      if (!Array.isArray(payload.contracts)) throw new Error("CONTRACT_SEARCH_FAILED");

      if (requestId === contractRequestId) {
        contractMatches = payload.contracts;
        contractSearchAttempted = true;
      }
    } catch (cause) {
      if (requestId === contractRequestId) {
        contractMatches = [];
        contractSearchError = cause instanceof Error && cause.message === "CONTRACT_SEARCH_FORBIDDEN"
          ? "Seu perfil não tem permissão para pesquisar contratos F10."
          : "Não foi possível pesquisar contratos. Tente novamente.";
      }
    } finally {
      if (requestId === contractRequestId) contractSearchLoading = false;
    }
  }

  function scheduleContactSearch(value: string): void {
    if (contactTimer) clearTimeout(contactTimer);
    contactTimer = setTimeout(() => void searchContacts(value), 260);
  }

  async function searchContacts(value: string): Promise<void> {
    const requestId = ++contactRequestId;
    try {
      const response = await fetch(
        "/api/app/customers/search?purpose=requester&q=" + encodeURIComponent(value.trim()),
        { cache: "no-store" },
      );
      if (!response.ok) throw new Error("CONTACT_SEARCH_FAILED");
      const payload = await response.json() as { customers: Contact[] };
      if (requestId === contactRequestId) {
        contactMatches = payload.customers.filter((person) =>
          person.id !== data?.requester.contactId &&
          person.id !== data?.requester.originalContactId &&
          !data?.participants.some((participant) => participant.contactId === person.id));
      }
    } catch {
      if (requestId === contactRequestId) {
        errorMessage = "Pesquisa de pessoas indisponível.";
      }
    }
  }

  function isAuthorized(contractId: string): boolean {
    return Boolean(data?.allowedContracts.some((contract) =>
      contract.contractId === contractId));
  }

  function isLinked(contractId: string): boolean {
    return Boolean(data?.contracts.some((contract) =>
      contract.contractId === contractId));
  }

  async function updateRelationships(
    action: "addContract" | "removeContract" | "addParticipant" | "removeParticipant" |
      "setParticipantNotifications",
    options: {
      contractId?: string;
      contactId?: string;
      grantToRequester?: boolean;
      notificationsEnabled?: boolean;
    },
  ): Promise<void> {
    if (saving || (action === "addContract" && !data?.requester.contactId)) return;
    const expectedRequesterContactId = action === "addContract" ? data?.requester.contactId : undefined;
    saving = true;
    errorMessage = "";
    successMessage = "";
    try {
      const response = await fetch(
        "/api/app/tickets/" + encodeURIComponent(ticketId) + "/relationships",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action, ...options, expectedRequesterContactId }),
        },
      );
      if (!response.ok) {
        const payload = await response.json().catch(() => ({})) as { message?: string };
        throw new Error(payload.message || "Não foi possível salvar a alteração.");
      }
      await loadRelationships();
      await onRefresh();
      contractSearch = "";
      contactSearch = "";
      contractMatches = [];
      contactMatches = [];
      successMessage = "Alteração salva.";
      if (contractSearchDialog?.open) contractSearchDialog.close();
    } catch (cause) {
      errorMessage = cause instanceof Error ? cause.message :
        "Não foi possível salvar a alteração.";
      if (contractSearchDialog?.open) contractSearchError = errorMessage;
    } finally {
      saving = false;
    }
  }

  function resetContractSearch(): void {
    if (contractTimer) clearTimeout(contractTimer);
    contractRequestId += 1;
    contractSearch = "";
    contractMatches = [];
    contractSearchError = "";
    contractSearchAttempted = false;
    contractSearchLoading = false;
  }

  function contractName(contract: Contract): string {
    return contract.displayName ?? contract.name ??
      "Contrato F10 #" + contract.contractId;
  }
</script>

<section class="space-y-4 rounded-xl border border-[var(--app-border)] bg-[var(--app-surface)] p-3 sm:p-4">
  <div class="flex items-center justify-between gap-2">
    <h3 class="application-text-caption flex items-center gap-2 font-bold text-[var(--app-text)]">
      <Building2 size={17} class="text-[var(--app-primary)]"/>
      Empresas vinculadas
    </h3>
    <span class="application-text-meta rounded-full bg-[var(--app-surface-muted)] px-2 py-1 font-semibold text-[var(--app-text-muted)]">
      {data?.contracts.length ?? 0}
    </span>
  </div>

  {#if loading && !data}
    <p class="application-text-caption flex items-center gap-2 text-[var(--app-text-muted)]">
      <LoaderCircle size={15} class="animate-spin"/> Carregando...
    </p>
  {:else if data}
    {#if data.contracts.length > 0}
      <div class="grid gap-2 sm:grid-cols-2">
        {#each data.contracts as contract (contract.contractId)}
          <div class="flex min-w-0 items-center gap-2 rounded-lg border border-[var(--app-border)] bg-[var(--app-surface-subtle)] px-3 py-2.5">
            <Building2 size={17} class="shrink-0 text-[var(--app-primary)]"/>
            <div class="min-w-0 flex-1">
              <a href={"/app/customers/contracts/" + contract.contractId}
                class="application-text-caption block truncate font-semibold text-[var(--app-text)] hover:underline">
                {contractName(contract)}
              </a>
              <span class="application-text-meta text-[var(--app-text-muted)]">
                Contrato {contract.contractNumber ?? contract.contractId}
                {contract.isPrimary ? " · Principal" : ""}
              </span>
            </div>
            {#if data.canEdit && data.contracts.length > 1}
              <button type="button" disabled={saving}
                on:click={() => void updateRelationships("removeContract", { contractId: contract.contractId })}
                aria-label={"Remover contrato " + contract.contractId}
                class="rounded-lg p-2 text-[var(--app-text-muted)] hover:bg-[var(--app-surface-muted)] disabled:opacity-50">
                <X size={17}/>
              </button>
            {/if}
          </div>
        {/each}
      </div>
    {:else}
      <p class="application-text-caption text-[var(--app-text-muted)]">
        Nenhum contrato F10 vinculado. Os dados comerciais antigos foram preservados.
      </p>
    {/if}

    {#if data.canEdit}
      <button type="button" on:click={() => void focusContracts()}
        class="application-text-caption inline-flex min-h-10 items-center gap-2 rounded-lg border border-[var(--app-border-control)] bg-[var(--app-surface)] px-3 font-semibold text-[var(--app-primary)] hover:bg-[var(--app-surface-muted)]">
        <Search size={16}/> Buscar contrato F10
      </button>
    {/if}
  {:else if !loading}
    <button type="button" on:click={() => void loadRelationships()}
      class="application-text-caption font-semibold text-[var(--app-primary)]">
      Tentar novamente
    </button>
  {/if}

  <div class="border-t border-[var(--app-border-soft)] pt-4">
    <div class="mb-3 flex items-center justify-between gap-2">
      <h3 class="application-text-caption flex items-center gap-2 font-bold text-[var(--app-text)]">
        <Users size={17} class="text-[var(--app-primary)]"/>
        Pessoas acompanhantes
      </h3>
      <span class="application-text-meta rounded-full bg-[var(--app-surface-muted)] px-2 py-1 font-semibold text-[var(--app-text-muted)]">
        {data?.participants.length ?? 0}
      </span>
    </div>

    {#if data?.participants.length}
      <div class="flex flex-wrap gap-2">
        {#each data.participants as person (person.contactId)}
          <span class="inline-flex max-w-full items-center gap-2 rounded-lg border border-[var(--app-border)] bg-[var(--app-surface-subtle)] px-2.5 py-2">
            <UserRound size={15} class="shrink-0 text-[var(--app-text-muted)]"/>
            <span class="min-w-0">
              <strong class="application-text-caption block truncate text-[var(--app-text)]">{person.name}</strong>
              <span class="application-text-meta block truncate text-[var(--app-text-muted)]">
                {person.portalAccessEnabled ? "Acompanha no portal" : "Sem acesso ao portal"}
              </span>
            </span>
            {#if data.canEdit}
              <label class="application-text-meta flex shrink-0 items-center gap-1.5 text-[var(--app-text-muted)]"
                title="Enviar e-mails de respostas públicas e alterações de status">
                <input type="checkbox" checked={person.notificationsEnabled} disabled={saving}
                  on:change={(event) => void updateRelationships(
                    "setParticipantNotifications", {
                      contactId: person.contactId,
                      notificationsEnabled: event.currentTarget.checked,
                    },
                  )}/>
                E-mails
              </label>
              <button type="button" disabled={saving}
                on:click={() => void updateRelationships("removeParticipant", { contactId: person.contactId })}
                class="rounded-lg p-1.5 text-[var(--app-text-muted)] hover:bg-[var(--app-surface-muted)] disabled:opacity-50"
                aria-label={"Remover acompanhante " + person.name}>
                <X size={16}/>
              </button>
            {/if}
          </span>
        {/each}
      </div>
    {:else}
      <p class="application-text-caption text-[var(--app-text-muted)]">
        Nenhuma pessoa adicional acompanha este ticket.
      </p>
    {/if}

    {#if data?.canEdit && data.requester.contactId && data.contracts.length > 0}
      <div class="relative mt-3">
        <UserPlus size={16} class="pointer-events-none absolute left-3 top-3 text-[var(--app-text-muted)]"/>
        <input bind:value={contactSearch} maxlength="120"
          placeholder="Adicionar acompanhante por nome ou e-mail"
          aria-label="Pesquisar pessoas acompanhantes"
          class="application-text-caption h-10 w-full rounded-lg border border-[var(--app-border-control)] bg-[var(--app-surface)] pl-9 pr-3 text-[var(--app-text)]"/>
      </div>
      {#if contactSearch.trim().length >= 2}
        <div class="mt-2 max-h-48 space-y-1 overflow-y-auto rounded-lg border border-[var(--app-border)] p-1">
          {#each contactMatches as person (person.id)}
            <button type="button" disabled={saving}
              on:click={() => void updateRelationships("addParticipant", { contactId: person.id })}
              class="application-text-caption flex w-full items-center justify-between gap-2 rounded-lg p-2 text-left text-[var(--app-text)] hover:bg-[var(--app-surface-subtle)] disabled:opacity-50">
              <span class="min-w-0 truncate">{person.name} · {person.email ?? "Sem e-mail"}</span>
              <Plus size={16} class="shrink-0 text-[var(--app-primary)]"/>
            </button>
          {:else}
            <p class="application-text-caption p-2 text-[var(--app-text-muted)]">
              Nenhuma pessoa encontrada.
            </p>
          {/each}
        </div>
      {/if}
    {/if}
  </div>

  {#if errorMessage}
    <p role="alert" class="application-text-caption flex items-start gap-2 text-[var(--app-danger-text)]">
      <CircleAlert size={16} class="shrink-0"/>{errorMessage}
    </p>
  {/if}
  {#if successMessage}
    <p role="status" class="application-text-caption flex items-center gap-2 text-[var(--app-success-text)]">
      <Check size={16}/>{successMessage}
    </p>
  {/if}
</section>

<dialog bind:this={contractSearchDialog} on:close={resetContractSearch}
  aria-labelledby="ticket-contract-search-title"
  class="w-[min(92vw,560px)] max-h-[85vh] rounded-2xl border border-[var(--app-border)] bg-[var(--app-surface)] p-0 text-[var(--app-text)] shadow-2xl backdrop:bg-[#0B1737]/45">
  <div class="flex max-h-[85vh] flex-col">
    <header class="flex items-center justify-between gap-3 border-b border-[var(--app-border-soft)] px-4 py-3">
      <h3 id="ticket-contract-search-title" class="application-text-caption flex items-center gap-2 font-semibold">
        <Building2 size={17}/> Buscar contrato F10
      </h3>
      <button type="button" on:click={() => contractSearchDialog.close()}
        aria-label="Fechar pesquisa de contratos"
        class="inline-flex h-9 w-9 items-center justify-center rounded-lg hover:bg-[var(--app-surface-muted)]">
        <X size={18}/>
      </button>
    </header>
    <div class="space-y-3 overflow-y-auto p-4">
      {#if loading}
        <p role="status" class="application-text-caption flex items-center gap-2 text-[var(--app-text-muted)]">
          <LoaderCircle size={16} class="animate-spin"/> Carregando contratos...
        </p>
      {:else if !data}
        <p role="alert" class="application-text-caption text-[var(--app-danger-text)]">
          {errorMessage || "Não foi possível carregar os dados do ticket."}
        </p>
        <button type="button" on:click={() => void loadRelationships()}
          class="application-text-caption min-h-10 rounded-lg border border-[var(--app-border-control)] px-3 font-semibold">
          Tentar novamente
        </button>
      {:else if !data.canEdit}
        <p role="alert" class="application-text-caption text-[var(--app-danger-text)]">
          Seu perfil não tem permissão para vincular contratos a este ticket.
        </p>
      {:else}
        <div class="relative">
          <Search size={17} class="pointer-events-none absolute left-3 top-3 text-[var(--app-text-muted)]"/>
          <input bind:this={contractSearchInput} bind:value={contractSearch} maxlength="120"
            placeholder="Nome da empresa ou número do contrato"
            aria-label="Pesquisar empresas para vincular"
            class="application-text-caption h-11 w-full rounded-xl border border-[var(--app-border-control)] bg-[var(--app-surface)] pl-10 pr-3 text-[var(--app-text)]"/>
        </div>
        {#if !data.requester.contactId}
          <p role="status" class="application-text-caption rounded-lg bg-[var(--app-surface-muted)] px-3 py-2 text-[var(--app-text-muted)]">
            Vincule um contato cadastrado em "Vincular ou trocar solicitante".
          </p>
        {:else}
          <p class="application-text-caption flex items-center gap-2 text-[var(--app-text-muted)]">
            <UserRound size={15} class="shrink-0"/> {data.requester.requesterName ?? data.requester.requesterEmail ?? "Solicitante vinculado"}
          </p>
        {/if}
        {#if contractSearchLoading}
          <p role="status" class="application-text-caption flex items-center gap-2 text-[var(--app-text-muted)]">
            <LoaderCircle size={15} class="animate-spin"/> Pesquisando...
          </p>
        {:else if contractSearchAttempted}
          <div class="max-h-72 space-y-1 overflow-y-auto rounded-xl border border-[var(--app-border)] p-1">
            {#each contractMatches.filter((contract) => !isLinked(contract.contractId)) as contract (contract.contractId)}
              <div class="flex min-w-0 items-center justify-between gap-2 rounded-lg px-2 py-2 hover:bg-[var(--app-surface-subtle)]">
                <span class="min-w-0">
                  <strong class="application-text-caption block truncate text-[var(--app-text)]">
                    {contractName(contract)}
                  </strong>
                  <span class="application-text-meta text-[var(--app-text-muted)]">
                    Contrato {contract.contractNumber ?? contract.contractId}
                  </span>
                </span>
                {#if !data.requester.contactId}
                  <span class="application-text-meta shrink-0 text-[var(--app-text-muted)]">Solicitante necessário</span>
                {:else if isAuthorized(contract.contractId)}
                  <button type="button" disabled={saving}
                    on:click={() => void updateRelationships("addContract", { contractId: contract.contractId })}
                    class="application-text-caption inline-flex min-h-9 shrink-0 items-center gap-1 rounded-lg border border-[var(--app-border-control)] px-2.5 font-semibold text-[var(--app-primary)] disabled:opacity-50">
                    <Plus size={15}/> Vincular
                  </button>
                {:else if data.canManageCustomers}
                  <button type="button" disabled={saving}
                    on:click={() => void updateRelationships("addContract", { contractId: contract.contractId, grantToRequester: true })}
                    class="application-text-caption inline-flex min-h-9 shrink-0 items-center gap-1 rounded-lg border border-[var(--app-border-control)] px-2.5 font-semibold text-[var(--app-primary)] disabled:opacity-50"
                    title="Autorizar este contrato para o solicitante no Suporte e vinculá-lo ao ticket">
                    <ShieldCheck size={15}/> Autorizar e vincular
                  </button>
                {:else}
                  <span class="application-text-meta shrink-0 text-[var(--app-text-muted)]">Sem permissão</span>
                {/if}
              </div>
            {:else}
              <p class="application-text-caption p-3 text-[var(--app-text-muted)]">
                Nenhum contrato encontrado.
              </p>
            {/each}
          </div>
        {:else if contractSearch.trim().length < 2 && !/^[0-9]$/.test(contractSearch.trim())}
          <p class="application-text-meta text-[var(--app-text-muted)]">
            Digite ao menos 2 caracteres ou 1 número para pesquisar.
          </p>
        {/if}
        {#if contractSearchError}
          <p role="alert" class="application-text-caption text-[var(--app-danger-text)]">
            {contractSearchError}
          </p>
        {/if}
      {/if}
    </div>
  </div>
</dialog>
