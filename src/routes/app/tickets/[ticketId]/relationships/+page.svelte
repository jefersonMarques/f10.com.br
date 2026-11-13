<script lang="ts">
  import { ArrowLeft, Building2, Search, ShieldCheck, UserPlus, Users, X } from "lucide-svelte";
  import ApplicationContent from "$lib/components/application/ApplicationContent.svelte";
  import AllowedContractsPicker from "$lib/components/operations/AllowedContractsPicker.svelte";
  import type { ActionData, PageData } from "./$types";

  export let data: PageData;
  export let form: ActionData;

  type Contact = { id: string; name: string; email: string | null };
  let search = "";
  let results: Contact[] = [];
  let selectedContact: Contact | null = null;
  let searchError = "";
  let timer: ReturnType<typeof setTimeout> | null = null;
  let sequence = 0;

  const allowedContracts = data.allowedContracts.map((contract) => ({
    contractId: String(contract.contractId),
    name: String(contract.name),
    contractNumber: contract.contractNumber ? String(contract.contractNumber) : null,
  }));
  const initialContracts = data.contracts.map((contract) => String(contract.contractId));

  $: if (search.trim().length >= 2) {
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => void searchContacts(search), 300);
  }
  $: if (search.trim().length < 2) results = [];

  async function searchContacts(query: string): Promise<void> {
    const current = ++sequence;
    try {
      const response = await fetch(
        "/api/app/customers/search?purpose=requester&q=" + encodeURIComponent(query),
        { cache: "no-store" },
      );
      if (!response.ok) throw new Error("CONTACT_SEARCH_FAILED");
      const payload = await response.json() as { customers: Contact[] };
      if (current === sequence) {
        results = payload.customers.filter((contact) =>
          contact.id !== data.ticket.contactId &&
          !data.participants.some((participant) => participant.contactId === contact.id));
      }
    } catch {
      if (current === sequence) searchError = "Pesquisa indisponível.";
    }
  }

  function selectContact(contact: Contact): void {
    selectedContact = contact;
    search = "";
    results = [];
  }
</script>

<svelte:head><title>Empresas e pessoas | Ticket #{data.ticket.ticketNumber}</title></svelte:head>

<ApplicationContent width="wide">
  <a href={"/app/tickets/" + data.ticketId}
    class="application-text-caption mb-4 inline-flex items-center gap-2 font-semibold text-app-primary">
    <ArrowLeft size={17}/> Voltar ao ticket
  </a>
  <header class="mb-4">
    <h1 class="text-xl font-bold text-app-text">Empresas e pessoas</h1>
    <p class="application-text-caption text-app-text-muted">
      Ticket #{data.ticket.ticketNumber} · {data.ticket.subject}
    </p>
  </header>

  {#if form?.message}
    <p role="status" class="application-text-caption mb-4 rounded-lg border border-app-border p-3 text-app-text">{form.message}</p>
  {/if}

  <div class="grid gap-4 lg:grid-cols-2">
    <section class="space-y-3 rounded-xl border border-app-border bg-app-surface p-4">
      <h2 class="application-text-caption flex items-center gap-2 font-bold text-app-text">
        <Users size={18}/> Solicitante principal
      </h2>
      {#if data.ticket.contactId}
        <a href={"/app/customers/" + data.ticket.contactId}
          class="application-text-caption block rounded-lg bg-app-subtle p-3 font-semibold text-app-primary">
          {data.ticket.name || "Pessoa sem nome"}
          <span class="application-text-meta mt-1 block text-app-text-muted">{data.ticket.email ?? "Sem e-mail"}</span>
        </a>
      {:else}
        <p class="application-text-caption text-app-warning-text">
          Ticket histórico sem solicitante. É necessário conciliar o cadastro antes de vincular novos contratos.
        </p>
      {/if}

      <h2 class="application-text-caption flex items-center gap-2 pt-2 font-bold text-app-text">
        <Building2 size={18}/> Contratos envolvidos
      </h2>
      <form method="POST" action="?/saveContracts" class="space-y-3">
        <AllowedContractsPicker allowed={allowedContracts} initiallySelected={initialContracts}/>
        {#if data.canEdit && data.ticket.contactId}
          <button type="submit" class="application-text-caption h-10 w-full rounded-lg bg-app-primary font-semibold text-white">
            Salvar contratos
          </button>
        {/if}
      </form>
      <p class="application-text-meta flex items-center gap-1.5 text-app-text-muted">
        <ShieldCheck size={14}/> Apenas contratos autorizados ao solicitante.
      </p>
    </section>

    <section class="space-y-3 rounded-xl border border-app-border bg-app-surface p-4">
      <h2 class="application-text-caption flex items-center gap-2 font-bold text-app-text">
        <Users size={18}/> Pessoas acompanhantes ({data.participants.length})
      </h2>
      {#each data.participants as participant}
        <div class="flex items-center justify-between gap-2 rounded-lg bg-app-subtle p-3">
          <span class="min-w-0">
            <strong class="application-text-caption block truncate">{String(participant.name)}</strong>
            <span class="application-text-meta text-app-text-muted">
              {participant.portalAccessEnabled ? "Acompanha pelo portal" : "Sem acesso ao portal"}
            </span>
          </span>
          {#if data.canEdit}
            <form method="POST" action="?/removeParticipant">
              <input type="hidden" name="contactId" value={String(participant.contactId)}/>
              <button type="submit" aria-label={"Remover " + String(participant.name)}
                class="rounded-lg p-2 text-app-text-muted hover:bg-app-surface">
                <X size={17}/>
              </button>
            </form>
          {/if}
        </div>
      {/each}
      {#if data.participants.length === 0}
        <p class="application-text-caption text-app-text-muted">Nenhuma pessoa acompanhando.</p>
      {/if}

      {#if data.canEdit && data.ticket.contactId && data.contracts.length > 0}
        <div class="border-t border-app-border pt-4">
          <h3 class="application-text-caption mb-2 flex items-center gap-2 font-semibold">
            <UserPlus size={17}/> Adicionar acompanhante
          </h3>
          <form method="POST" action="?/addParticipant" class="space-y-2">
            <input type="hidden" name="contactId" value={selectedContact?.id ?? ""}/>
            {#if selectedContact}
              <div class="flex items-center justify-between rounded-lg border border-app-border p-3">
                <span class="application-text-caption">{selectedContact.name}</span>
                <button type="button" aria-label="Trocar acompanhante" on:click={() => (selectedContact = null)}>
                  <X size={16}/>
                </button>
              </div>
            {:else}
              <label class="relative block">
                <Search size={16} class="absolute left-3 top-1/2 -translate-y-1/2 text-app-text-muted"/>
                <input bind:value={search} maxlength="120" placeholder="Buscar pessoa"
                  class="application-text-caption h-10 w-full rounded-lg border border-app-border-control pl-9 pr-3"/>
              </label>
              {#if searchError}<p class="application-text-meta text-app-danger-text">{searchError}</p>{/if}
              {#if results.length > 0}
                <div class="max-h-40 divide-y divide-app-border-soft overflow-y-auto rounded-lg border border-app-border">
                  {#each results as contact (contact.id)}
                    <button type="button" on:click={() => selectContact(contact)}
                      class="application-text-caption block w-full p-3 text-left hover:bg-app-subtle">
                      {contact.name} · {contact.email ?? "Sem e-mail"}
                    </button>
                  {/each}
                </div>
              {/if}
            {/if}
            <button type="submit" disabled={!selectedContact}
              class="application-text-caption h-10 w-full rounded-lg bg-app-primary font-semibold text-white disabled:opacity-40">
              Adicionar
            </button>
          </form>
        </div>
      {/if}
    </section>
  </div>
</ApplicationContent>