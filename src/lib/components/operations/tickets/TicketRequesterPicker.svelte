<script lang="ts">
  import { onDestroy } from "svelte";
  import { Search, UserRound } from "lucide-svelte";

  type ContactOption = {
    id: string;
    name: string;
    email: string | null;
    organizationName: string | null;
  };

  export let disabled = false;
  export let onSelect: (contactId: string) => Promise<void>;

  let query = "";
  let contacts: ContactOption[] = [];
  let loading = false;
  let errorMessage = "";
  let timer: ReturnType<typeof setTimeout> | null = null;
  let controller: AbortController | null = null;

  function searchContacts(): void {
    if (timer) clearTimeout(timer);
    controller?.abort();

    contacts = [];
    errorMessage = "";
    if (query.trim().length < 2) {
      loading = false;
      return;
    }

    loading = true;
    timer = setTimeout(() => void loadContacts(query.trim()), 250);
  }

  async function loadContacts(value: string): Promise<void> {
    const request = new AbortController();
    controller = request;

    try {
      const response = await fetch(
        `/api/app/customers/search?purpose=requester&q=${encodeURIComponent(value)}`,
        { signal: request.signal, cache: "no-store" },
      );
      if (!response.ok) throw new Error("CONTACT_SEARCH_FAILED");
      const payload = await response.json() as { customers: ContactOption[] };
      if (!request.signal.aborted) contacts = payload.customers;
    } catch {
      if (!request.signal.aborted) {
        errorMessage = "Não foi possível buscar contatos.";
        contacts = [];
      }
    } finally {
      if (!request.signal.aborted) loading = false;
    }
  }

  async function selectContact(contactId: string): Promise<void> {
    if (disabled) return;
    await onSelect(contactId);
  }

  onDestroy(() => {
    if (timer) clearTimeout(timer);
    controller?.abort();
  });
</script>

<label class="block">
  <span class="mb-1.5 block text-[12px] font-medium text-[var(--app-text-muted)]">Buscar contato cadastrado</span>
  <span class="relative block">
    <Search size={16} class="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--app-text-muted)]"/>
    <input type="search" bind:value={query} on:input={searchContacts} disabled={disabled}
      placeholder="Nome ou e-mail" autocomplete="off"
      class="h-11 w-full rounded-lg border border-[var(--app-border-control)] bg-[var(--app-surface)] pl-10 pr-3 text-[13px] text-[var(--app-text)] outline-none focus:border-[var(--app-primary)]"/>
  </span>
</label>

{#if loading}
  <p class="mt-2 text-[12px] text-[var(--app-text-muted)]">Buscando...</p>
{:else if errorMessage}
  <p class="mt-2 text-[12px] text-[var(--app-danger-text)]" role="alert">{errorMessage}</p>
{:else if query.trim().length >= 2}
  <div class="mt-2 max-h-56 overflow-y-auto rounded-lg border border-[var(--app-border)]">
    {#each contacts as contact (contact.id)}
      <button type="button" disabled={disabled} on:click={() => void selectContact(contact.id)}
        class="flex min-h-12 w-full items-center gap-2 border-b border-[var(--app-border-soft)] px-3 py-2 text-left text-[var(--app-text)] hover:bg-[var(--app-surface-muted)] last:border-0 disabled:opacity-50">
        <UserRound size={16} class="shrink-0 text-[var(--app-primary)]"/>
        <span class="min-w-0 flex-1">
          <strong class="block truncate text-[12px]">{contact.name}</strong>
          <span class="block truncate text-[11px] text-[var(--app-text-muted)]">{contact.email ?? contact.organizationName ?? "Sem e-mail"}</span>
        </span>
      </button>
    {:else}
      <p class="p-3 text-[12px] text-[var(--app-text-muted)]">Nenhum contato encontrado.</p>
    {/each}
  </div>
{/if}
