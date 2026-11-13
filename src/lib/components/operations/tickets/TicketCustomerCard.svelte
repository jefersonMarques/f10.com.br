<script lang="ts">
  import {
    Building2,
    Check,
    Ellipsis,
    ExternalLink,
    Mail,
    Pencil,
    UserRound,
  } from "lucide-svelte";
  import type { TicketDetailsData } from "./types";
  import TicketRequesterPicker from "./TicketRequesterPicker.svelte";

  type EditorMode = "requester" | "contact" | null;

  export let ticketData: TicketDetailsData;
  export let surface: "page" | "split" | "modal" = "split";
  export let saving = false;
  export let onAction: (action: string, body: FormData) => Promise<boolean>;
  export let onManageContracts: () => void = () => undefined;

  let editMode: EditorMode = null;
  let menuOpen = false;

  $: overview = ticketData.customerOverview;

  const originLabels: Record<string, string> = {
    manual: "Informado pelo operador",
    email: "Remetente do e-mail",
    portal: "Portal F10",
    chat: "Chat",
    contact: "Contato cadastrado",
    unknown: "Não identificado",
  };

  function showEditor(mode: EditorMode): void {
    editMode = mode;
    menuOpen = false;
  }

  async function submitAction(action: string, body: FormData): Promise<void> {
    if (saving) return;
    const saved = await onAction(action, body);
    if (saved) editMode = null;
  }

  async function submitForm(event: SubmitEvent, action: string): Promise<void> {
    const form = event.currentTarget as HTMLFormElement;
    await submitAction(action, new FormData(form));
  }

  async function linkRequester(contactId: string | null): Promise<void> {
    const body = new FormData();
    if (contactId) body.set("requesterContactId", contactId);
    await submitAction("linkRequesterContact", body);
  }

  async function confirmSuggestedUnit(): Promise<void> {
    if (!overview.suggestedUnit) return;
    const body = new FormData();
    body.set("customerUnitId", overview.suggestedUnit.id);
    await submitAction("linkCommercialUnit", body);
  }

  async function removeCommercialUnit(): Promise<void> {
    if (!confirm("Remover o contrato vinculado a este ticket?")) return;
    const body = new FormData();
    body.set("operation", "remove");
    await submitAction("linkCommercialUnit", body);
  }
</script>

<section class={surface === "page"
  ? "rounded-2xl border border-[var(--app-border)] bg-[var(--app-surface)] p-4"
  : "w-full rounded-xl bg-[var(--app-surface)] p-3 sm:p-4"}>
  <header class="flex items-center justify-between gap-3">
    <h3 class="flex min-w-0 items-center gap-2 text-[13px] font-semibold text-[var(--app-text)]">
      <Building2 size={17}/>Dados do atendimento
    </h3>
    {#if ticketData.canLinkCustomer}
      <details bind:open={menuOpen} class="relative shrink-0">
        <summary role="button" aria-label="Opções dos dados do atendimento"
          class="flex h-9 w-9 cursor-pointer list-none items-center justify-center rounded-lg border border-[var(--app-border-control)] text-[var(--app-text)] hover:bg-[var(--app-surface-muted)]">
          <Ellipsis size={20}/>
        </summary>
        <div class="absolute right-0 top-10 z-30 w-56 rounded-xl border border-[var(--app-border)] bg-[var(--app-surface)] p-1.5 shadow-lg">
          <button type="button" on:click={() => showEditor("requester")}
            class="flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-left text-[12px] text-[var(--app-text)] hover:bg-[var(--app-surface-muted)]">
            <Pencil size={15}/>Editar solicitante
          </button>
          <button type="button" on:click={() => showEditor("contact")}
            class="flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-left text-[12px] text-[var(--app-text)] hover:bg-[var(--app-surface-muted)]">
            <UserRound size={15}/>Vincular ou trocar solicitante
          </button>
          <button type="button" on:click={() => { menuOpen = false; onManageContracts(); }}
            class="flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-left text-[12px] text-[var(--app-text)] hover:bg-[var(--app-surface-muted)]">
            <Building2 size={15}/>Buscar contrato F10
          </button>
          {#if overview.contractUnitId}
            <button type="button" on:click={() => { menuOpen = false; void removeCommercialUnit(); }}
              class="flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-left text-[12px] text-[var(--app-danger-text)] hover:bg-[var(--app-danger-bg)]">
              Remover contrato
            </button>
          {/if}
          {#if overview.operationalContactId}
            <button type="button" on:click={() => { menuOpen = false; void linkRequester(null); }}
              class="flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-left text-[12px] text-[var(--app-text-muted)] hover:bg-[var(--app-surface-muted)]">
              Desvincular contato operacional
            </button>
          {/if}
        </div>
      </details>
    {/if}
  </header>

  <dl class={surface === "page" ? "mt-4 grid gap-3" : "mt-4 grid gap-4 sm:grid-cols-2"}>
    <div class="min-w-0">
      <dt class="text-[12px] text-[var(--app-text-muted)]">Cliente</dt>
      <dd class="mt-1 break-words text-[14px] font-semibold text-[var(--app-text)]">
        {overview.clientName ?? "Não vinculado"}
        {#if overview.contractUnitId && ticketData.canViewCommercialProfiles}
          <a href={`/app/customers/units/${overview.contractUnitId}`}
            title="Abrir perfil da unidade" aria-label="Abrir perfil da unidade"
            class="ml-1.5 inline-flex align-middle text-[var(--app-primary)] hover:underline"><ExternalLink size={15}/></a>
        {/if}
      </dd>
      <dd class="mt-1 text-[12px] text-[var(--app-text-muted)]">
        {#if overview.clientEmail}
          <a class="inline-flex max-w-full items-center gap-1.5 break-all hover:text-[var(--app-primary)]" href={`mailto:${overview.clientEmail}`}>
            <Mail size={13} class="shrink-0"/>{overview.clientEmail}
          </a>
          {#if overview.clientEmailSource === "holder"}
            <span class="ml-1 text-[11px]">(titular)</span>
          {/if}
        {:else}
          E-mail comercial não informado
        {/if}
      </dd>
    </div>
    <div class="min-w-0">
      <dt class="text-[12px] text-[var(--app-text-muted)]">Contrato</dt>
      <dd class="mt-1 text-[14px] font-semibold text-[var(--app-text)]">{overview.contractNumber ?? "Não vinculado"}</dd>
      {#if overview.suggestedUnit}
        <p class="mt-1 text-[12px] text-[var(--app-text-muted)]">Contrato anterior: {overview.suggestedUnit.contractNumber}</p>
        {#if ticketData.canLinkCustomer}
          <button type="button" disabled={saving} on:click={() => void confirmSuggestedUnit()}
            class="mt-1 inline-flex items-center gap-1 text-[12px] font-semibold text-[var(--app-primary)] hover:underline disabled:opacity-50">
            <Check size={13}/>Confirmar vínculo
          </button>
        {/if}
      {/if}
    </div>
    <div class="min-w-0">
      <dt class="text-[12px] text-[var(--app-text-muted)]">Nome solicitante</dt>
      <dd class="mt-1 break-words text-[14px] font-semibold text-[var(--app-text)]">
        {overview.requesterName ?? "Não informado"}
        {#if overview.requesterContactId && ticketData.canViewCustomerProfiles}
          <a href={`/app/customers/${overview.requesterContactId}`}
            title="Abrir perfil do solicitante" aria-label="Abrir perfil do solicitante"
            class="ml-1.5 inline-flex align-middle text-[var(--app-primary)] hover:underline"><ExternalLink size={15}/></a>
        {/if}
      </dd>
    </div>
    <div class="min-w-0">
      <dt class="text-[12px] text-[var(--app-text-muted)]">E-mail solicitante</dt>
      <dd class="mt-1 break-all text-[14px] font-medium text-[var(--app-text)]">
        {#if overview.requesterEmail}
          <a href={`mailto:${overview.requesterEmail}`} class="hover:text-[var(--app-primary)] hover:underline">{overview.requesterEmail}</a>
        {:else}Não informado{/if}
      </dd>
    </div>
  </dl>

  <div class="mt-4 flex flex-wrap items-center gap-x-3 gap-y-1 border-t border-[var(--app-border-soft)] pt-3 text-[11px] text-[var(--app-text-muted)]">
    <span>Origem: {originLabels[overview.requesterSource] ?? "Não identificada"}</span>
    {#if overview.legacyUserId}<span>Usuário F10: {overview.legacyUserId}</span>{/if}
  </div>

  {#if editMode && ticketData.canLinkCustomer}
    <div class="mt-4 rounded-xl border border-[var(--app-border)] bg-[var(--app-surface-subtle)] p-3 sm:p-4">
      <div class="mb-3 flex items-center justify-between gap-2">
        <strong class="text-[13px] font-semibold text-[var(--app-text)]">
          {editMode === "requester" ? "Editar solicitante" : "Vincular ou trocar solicitante"}
        </strong>
        <button type="button" on:click={() => showEditor(null)} class="text-[12px] text-[var(--app-text-muted)] hover:underline">Fechar</button>
      </div>
      {#if editMode === "requester"}
        <form on:submit|preventDefault={(event) => void submitForm(event, "saveRequesterDetails")} class="space-y-3">
          <label class="block">
            <span class="mb-1 block text-[12px] text-[var(--app-text-muted)]">Nome solicitante</span>
            <input name="requesterName" maxlength="120" value={overview.requesterName ?? ""} disabled={saving}
              class="h-11 w-full rounded-lg border border-[var(--app-border-control)] bg-[var(--app-surface)] px-3 text-[13px] text-[var(--app-text)]"/>
          </label>
          <label class="block">
            <span class="mb-1 block text-[12px] text-[var(--app-text-muted)]">E-mail solicitante</span>
            <input name="requesterEmail" type="email" maxlength="254" value={overview.requesterEmail ?? ""} disabled={saving}
              class="h-11 w-full rounded-lg border border-[var(--app-border-control)] bg-[var(--app-surface)] px-3 text-[13px] text-[var(--app-text)]"/>
          </label>
          <p class="text-[11px] text-[var(--app-text-muted)]">Altera a identificação deste ticket, não o cadastro ou destinatário das mensagens.</p>
          <button type="submit" disabled={saving}
            class="h-10 rounded-lg bg-[var(--app-primary)] px-4 text-[12px] font-semibold text-white disabled:opacity-50">Salvar</button>
        </form>
      {:else if editMode === "contact"}
        <TicketRequesterPicker disabled={saving} onSelect={linkRequester}/>
      {/if}
    </div>
  {/if}
</section>
