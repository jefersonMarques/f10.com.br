<script lang="ts">
  import { shortTicketSubject } from "./shortSubject";
  import { Check, Clock3, Copy, ExternalLink, Mail, MessageSquare, MoreHorizontal, PanelRightOpen, TicketCheck, UserRound } from "lucide-svelte";
  import { tick } from "svelte";
  import { labelClasses, priorityLabels } from "./presentation";
  import type { TicketItem, TicketWorkflow } from "./types";

  export let tickets: TicketItem[] = [];
  export let globalWorkflow: TicketWorkflow | null;
  export let areaWorkflows: TicketWorkflow[] = [];
  export let selectedTicketId: string | null = null;
  export let compact = false;
  export let onOpenTicket: (ticketId: string) => void | Promise<void>;
  export let onOpenTicketService: ((ticketId: string) => void | Promise<void>) | null = null;
  export let onQuickAction: ((ticketId: string, action: "status" | "addLabel", value: string) => Promise<void>) | null = null;
  export let labels: Array<{ id: string; name: string }> = [];

  let menuTicket: TicketItem | null = null;
  let menuTop = 0;
  let menuLeft = 0;
  let menuElement: HTMLDivElement;
  let copiedTicketId: string | null = null;
  let hoveredTicket: TicketItem | null = null;
  let previewTop = 0;
  let previewLeft = 0;

  function showPreview(event: MouseEvent, ticket: TicketItem): void {
    if (menuTicket) return;
    const element = event.currentTarget as HTMLElement;
    const rect = element.getBoundingClientRect();
    previewLeft = Math.max(8, Math.min(rect.left + 140, window.innerWidth - 370));
    previewTop = Math.min(rect.bottom + 6, window.innerHeight - 180);
    hoveredTicket = ticket;
  }

  function hidePreview(): void {
    hoveredTicket = null;
  }

  async function quickAction(action: "status" | "addLabel", value: string): Promise<void> {
    const id = menuTicket?.id;
    closeTicketMenu();
    if (id && value) await onQuickAction?.(id, action, value);
  }

  function closeTicketMenu(): void {
    menuTicket = null;
  }

  async function toggleTicketMenu(event: MouseEvent, ticket: TicketItem): Promise<void> {
    event.stopPropagation();
    if (menuTicket?.id === ticket.id) {
      closeTicketMenu();
      return;
    }

    const button = event.currentTarget as HTMLButtonElement;
    const rect = button.getBoundingClientRect();
    const height = onQuickAction ? 360 : 192;
    menuTop = window.innerHeight - rect.bottom >= height + 8
      ? rect.bottom + 6
      : Math.max(8, rect.top - height - 6);
    menuLeft = Math.max(8, Math.min(rect.right - 224, window.innerWidth - 232));
    menuTicket = ticket;
    hidePreview();
    await tick();
    menuElement?.querySelector<HTMLElement>("[data-first-action]")?.focus();
  }

  function openTicketService(ticketId: string): void {
    closeTicketMenu();
    void onOpenTicketService?.(ticketId);
  }

  async function copyTicketLink(ticketId: string): Promise<void> {
    closeTicketMenu();
    const url = `${window.location.origin}/app/tickets/${ticketId}`;
    try {
      await navigator.clipboard.writeText(url);
      copiedTicketId = ticketId;
      window.setTimeout(() => {
        if (copiedTicketId === ticketId) copiedTicketId = null;
      }, 2500);
    } catch {
      window.prompt("Copie o link do ticket:", url);
    }
  }

  function handleMenuKeydown(event: KeyboardEvent): void {
    if (event.key === "Escape" && menuTicket) closeTicketMenu();
  }

  function initials(name: string | null): string {
    if (!name) return "—";
    return name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase() ?? "")
      .join("");
  }

  function processLabel(ticket: TicketItem): string {
    if (ticket.workflowState?.areaWorkflowId) {
      const workflow = areaWorkflows.find(
        (item) => item.id === ticket.workflowState?.areaWorkflowId,
      );
      const stage = workflow?.stages.find(
        (item) => item.id === ticket.workflowState?.areaStageId,
      );
      if (workflow) return `${workflow.areaName ?? workflow.id} · ${stage?.name ?? "Sem etapa"}`;
    }

    const stage = globalWorkflow?.stages.find(
      (item) => item.id === ticket.workflowState?.globalStageId,
    );
    return stage?.name ?? "Sem processo";
  }

  function activeSla(ticket: TicketItem): string | Date | null {
    if (ticket.resolvedAt) return null;
    if (!ticket.firstResponseAt) return ticket.firstResponseDueAt;
    return ticket.nextResponseDueAt ?? ticket.resolutionDueAt;
  }

  function slaText(ticket: TicketItem): string {
    const value = activeSla(ticket);
    if (!value) return ticket.resolvedAt ? "Concluído" : "Sem meta";
    const diff = new Date(value).getTime() - Date.now();
    const minutes = Math.max(1, Math.round(Math.abs(diff) / 60_000));
    if (diff < 0) {
      return minutes < 60
        ? `Vencido ${minutes}m`
        : `Vencido ${Math.floor(minutes / 60)}h`;
    }
    if (minutes < 60) return `${minutes}m`;
    return `${Math.floor(minutes / 60)}h ${minutes % 60}m`;
  }

  function slaClass(ticket: TicketItem): string {
    const value = activeSla(ticket);
    if (!value) return "bg-[var(--app-surface-muted)] text-[#777D8C]";
    const diff = new Date(value).getTime() - Date.now();
    if (diff < 0) return "bg-[var(--app-danger-bg)] text-[#A33A3A]";
    if (diff <= 60 * 60_000) return "bg-[var(--app-warning-bg)] text-[#A9510D]";
    return "bg-[var(--app-success-bg)] text-[#2F7045]";
  }

  function relativeUpdated(value: string | Date): string {
    const diffMinutes = Math.round((new Date(value).getTime() - Date.now()) / 60_000);
    const formatter = new Intl.RelativeTimeFormat("pt-BR", { numeric: "auto" });
    if (Math.abs(diffMinutes) < 60) return formatter.format(diffMinutes, "minute");
    const hours = Math.round(diffMinutes / 60);
    if (Math.abs(hours) < 24) return formatter.format(hours, "hour");
    return formatter.format(Math.round(hours / 24), "day");
  }
</script>

<svelte:window on:click={closeTicketMenu} on:keydown={handleMenuKeydown} on:scroll|capture={closeTicketMenu} on:resize={closeTicketMenu}/>

{#if tickets.length > 0}
  {#if compact}
    <section class="flex h-full min-h-0 flex-col bg-white">
      <header class="flex h-11 shrink-0 items-center justify-between border-b border-[var(--app-border-soft)] px-4">
        <h2 class="text-[13px] font-semibold text-[#202637]">Tickets</h2>
        <span class="text-[12px] font-medium tabular-nums text-[#707787]">{tickets.length}</span>
      </header>

      <div class="min-h-0 flex-1 overflow-y-auto">
        <div class="divide-y divide-[var(--app-border-soft)]">
          {#each tickets as ticket (ticket.id)}
            <div class={`relative border-l-[3px] transition-colors ${selectedTicketId === ticket.id ? "border-[var(--app-primary)] bg-[var(--app-surface-selected)]" : "border-transparent hover:bg-[var(--app-surface-subtle)]"}`}>
              <button
                type="button"
                on:click={() => { closeTicketMenu(); void onOpenTicket(ticket.id); }}
                aria-pressed={selectedTicketId === ticket.id}
                title={ticket.subject}
                class="block w-full px-3 py-3 pr-11 text-left"
              >
                <div class="flex min-w-0 items-center gap-2">
                  {#if ticket.unread}
                    <span class="h-2 w-2 shrink-0 rounded-full bg-[#EA6D0B]" aria-label="Ticket não visualizado" title="Não visualizado"></span>
                  {/if}
                  <span class="shrink-0 text-[11px] font-bold text-[#000A57]">#{ticket.ticketNumber}</span>
                  <strong class="min-w-0 flex-1 truncate text-[13px] font-semibold text-[#303645]">{shortTicketSubject(ticket.subject)}</strong>
                </div>
                <div class="mt-1 flex min-w-0 items-center gap-1.5 text-[12px] text-[#737989]">
                  <span class="min-w-0 flex-1 truncate">{ticket.customerName ?? ticket.assignedUserName ?? "Cliente pendente"}</span>
                  {#if ticket.channel === "email"}<Mail size={13} class="shrink-0" aria-label="Recebido por e-mail"/>{/if}
                  {#if activeSla(ticket)}
                    <span class={`shrink-0 rounded px-1.5 py-0.5 text-[10.5px] font-semibold ${slaClass(ticket)}`}>{slaText(ticket)}</span>
                  {:else if ticket.priority !== "normal"}
                    <span class="shrink-0 text-[11px] font-medium text-[#7B5561]">{priorityLabels[ticket.priority] ?? ticket.priority}</span>
                  {/if}
                </div>
                {#if ticket.labels.length > 0}
                  <div class="mt-1.5 flex min-w-0 items-center gap-1 overflow-hidden">
                    {#each ticket.labels.slice(0, 2) as label (label.id)}
                      <span class={`max-w-[110px] truncate rounded-md px-1.5 py-0.5 text-[11px] font-semibold ${labelClasses[label.color] ?? labelClasses.gray}`} title={label.name}>{label.name}</span>
                    {/each}
                    {#if ticket.labels.length > 2}
                      <span class="shrink-0 text-[11px] text-[#868E9D]">+{ticket.labels.length - 2}</span>
                    {/if}
                  </div>
                {/if}
                {#if ticket.workflowState?.areaWorkflowId}
                  <p class="mt-0.5 truncate text-[11px] text-[#989EAA]">{processLabel(ticket)}</p>
                {/if}
              </button>
              <div class="absolute right-2 top-2 flex items-center gap-1">
                <span class="hidden max-w-[65px] truncate text-[10px] text-[#9298A5] sm:block">{relativeUpdated(ticket.updatedAt)}</span>
                <button
                  type="button"
                  on:click={(event) => void toggleTicketMenu(event, ticket)}
                  class={`flex h-8 w-8 items-center justify-center rounded-lg text-[#747C8A] transition hover:bg-white hover:text-[#000A57] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[#000A57] ${menuTicket?.id === ticket.id ? "bg-white text-[#000A57]" : ""}`}
                  aria-label={`Ações do ticket #${ticket.ticketNumber}`}
                  aria-haspopup="menu"
                  aria-expanded={menuTicket?.id === ticket.id}
                  title="Ações do ticket"
                ><MoreHorizontal size={17}/></button>
              </div>
            </div>
          {/each}
        </div>
      </div>
    </section>
  {:else}
  <div class="hidden overflow-x-auto md:block">
    <div class={compact ? "min-w-[760px]" : "min-w-[1480px]"}>
      <div class={`grid border-b border-[var(--app-border-soft)] bg-[var(--app-surface-subtle)] px-4 py-2.5 ${compact ? "grid-cols-[88px_minmax(220px,1.5fr)_minmax(160px,1fr)_120px]" : "grid-cols-[90px_minmax(320px,2fr)_minmax(220px,1.4fr)_minmax(175px,1fr)_115px_minmax(160px,1fr)_125px_110px_54px]"}`}>
        <span class="application-text-caption font-bold uppercase tracking-[0.07em] text-[#969CAA]">Ticket</span>
        <span class="application-text-caption font-bold uppercase tracking-[0.07em] text-[#969CAA]">Assunto</span>
        <span class="application-text-caption font-bold uppercase tracking-[0.07em] text-[#969CAA]">Cliente</span>
        {#if !compact}
          <span class="application-text-caption font-bold uppercase tracking-[0.07em] text-[#969CAA]">Processo</span>
          <span class="application-text-caption font-bold uppercase tracking-[0.07em] text-[#969CAA]">Prioridade</span>
          <span class="application-text-caption font-bold uppercase tracking-[0.07em] text-[#969CAA]">Responsável</span>
          <span class="application-text-caption font-bold uppercase tracking-[0.07em] text-[#969CAA]">SLA</span>
        {/if}
        <span class="application-text-caption font-bold uppercase tracking-[0.07em] text-[#969CAA]">Atualizado</span>
        {#if !compact}<span class="application-text-caption font-bold uppercase tracking-[0.07em] text-[#969CAA]">Ações</span>{/if}
      </div>

      <div class="divide-y divide-[#EEF0F4]">
        {#each tickets as ticket}
          <div class="relative group">
          <button
            type="button"
            on:mouseenter={(event) => showPreview(event, ticket)}
            on:mouseleave={hidePreview}
            on:focus={(event) => showPreview(event as unknown as MouseEvent, ticket)}
            on:blur={hidePreview}
            on:click={() => void onOpenTicket(ticket.id)}
            class={`grid w-full items-center gap-3 px-4 py-3.5 text-left transition hover:bg-[var(--app-surface-subtle)] ${selectedTicketId === ticket.id ? "bg-[var(--app-info-bg)]" : ""} ${compact ? "grid-cols-[88px_minmax(220px,1.5fr)_minmax(160px,1fr)_120px]" : "grid-cols-[90px_minmax(320px,2fr)_minmax(220px,1.4fr)_minmax(175px,1fr)_115px_minmax(160px,1fr)_125px_110px_54px]"}`}
          >
            <span class="application-text-caption flex items-center gap-1.5 font-bold text-[#000A57]">
              #{ticket.ticketNumber}
              {#if ticket.channel === "email"}<Mail size={11} aria-label="Recebido por e-mail"/>{/if}
            </span>

            <div class="min-w-0">
              <strong class="block truncate text-[13px] font-semibold text-[#2D3342]">{shortTicketSubject(ticket.subject)}</strong>
              {#if ticket.labels.length > 0}
                <div class="mt-1 flex min-w-0 gap-1 overflow-hidden">
                  {#each ticket.labels.slice(0, 3) as label}
                    <span class={`application-text-meta max-w-[90px] truncate rounded px-1.5 py-0.5 font-semibold ${labelClasses[label.color] ?? labelClasses.gray}`}>{label.name}</span>
                  {/each}
                </div>
              {/if}
            </div>

            <div class="min-w-0">
              <span class="application-text-control block truncate font-semibold text-[#505868]">{ticket.customerName ?? "Cliente não identificado"}</span>
              {#if ticket.organizationName}<span class="application-text-meta block truncate text-[#9297A4]">{ticket.organizationName}</span>{/if}
            </div>

            {#if !compact}
              <span class="application-text-caption truncate font-semibold text-[#5D6574]" title={processLabel(ticket)}>{processLabel(ticket)}</span>
              <span class="application-text-caption font-semibold text-[#626978]">{priorityLabels[ticket.priority] ?? ticket.priority}</span>
              <span class="flex min-w-0 items-center gap-2">
                <span class="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[var(--app-info-bg)] text-[10px] font-bold text-[#000A57]">{initials(ticket.assignedUserName)}</span>
                <span class="application-text-caption truncate font-semibold text-[#5D6574]">{ticket.assignedUserName ?? "Sem responsável"}</span>
              </span>
              <span class={`application-text-caption inline-flex w-fit items-center gap-1 rounded-full px-2 py-1 font-bold ${slaClass(ticket)}`}><Clock3 size={11}/>{slaText(ticket)}</span>
            {/if}

            <span class="application-text-caption text-[#858B99]">{relativeUpdated(ticket.updatedAt)}</span>
            {#if !compact}<span aria-hidden="true"></span>{/if}
          </button>
          {#if !compact}
            <button type="button" on:click={(event) => void toggleTicketMenu(event, ticket)}
              class="absolute right-4 top-1/2 z-10 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-lg border border-[var(--app-border-control)] bg-[var(--app-surface)] text-[var(--app-text-muted)] hover:text-[var(--app-primary)]"
              aria-label={`Ações rápidas do ticket #${ticket.ticketNumber}`} title="Ações rápidas"><MoreHorizontal size={17}/></button>
          {/if}
          </div>
        {/each}
      </div>
    </div>
  </div>

  <div class="divide-y divide-[#EEF0F4] md:hidden">
    {#each tickets as ticket}
      <button type="button" on:click={() => void onOpenTicket(ticket.id)} class={`w-full px-4 py-4 text-left ${selectedTicketId === ticket.id ? "bg-[var(--app-info-bg)]" : ""}`}>
        <div class="flex items-start justify-between gap-3">
          <div class="min-w-0">
            <span class="application-text-caption font-bold text-[#000A57]">#{ticket.ticketNumber}</span>
            <strong class="mt-1 block text-[13px] font-semibold leading-5 text-[#2D3342]">{shortTicketSubject(ticket.subject)}</strong>
          </div>
          <span class={`application-text-caption shrink-0 rounded-full px-2 py-1 font-bold ${slaClass(ticket)}`}>{slaText(ticket)}</span>
        </div>
        <div class="application-text-caption mt-2 flex items-center gap-2 text-[#777E8D]">
          <UserRound size={12}/>
          <span class="truncate">{ticket.customerName ?? "Cliente não identificado"}</span>
          <span>·</span>
          <span class="truncate">{ticket.assignedUserName ?? "Sem responsável"}</span>
        </div>
        {#if ticket.labels.length > 0}
          <div class="mt-2 flex flex-wrap gap-1.5">
            {#each ticket.labels.slice(0, 3) as label (label.id)}
              <span class={`max-w-[135px] truncate rounded-md px-2 py-1 text-[11px] font-semibold ${labelClasses[label.color] ?? labelClasses.gray}`} title={label.name}>{label.name}</span>
            {/each}
            {#if ticket.labels.length > 3}
              <span class="text-[11px] text-[#868E9D]">+{ticket.labels.length - 3}</span>
            {/if}
          </div>
        {/if}
      </button>
    {/each}
  </div>
  {/if}
{:else}
  <div class="px-5 py-12 text-center">
    <p class="application-text-caption font-semibold text-[#5D6574]">Nenhum ticket encontrado.</p>
    <p class="application-text-meta mt-1 text-[#969CAA]">Ajuste os filtros para ampliar a busca.</p>
  </div>
{/if}

{#if menuTicket}
  <div
    bind:this={menuElement}
    role="menu"
    aria-label={`Ações do ticket #${menuTicket.ticketNumber}`}
    class="fixed z-[80] max-h-[min(470px,90vh)] w-56 overflow-y-auto rounded-xl border border-[var(--app-border)] bg-white py-1.5 shadow-[0_16px_45px_rgba(1,13,40,0.18)]"
    style:top={`${menuTop}px`}
    style:left={`${menuLeft}px`}
  >
    <button
      type="button"
      role="menuitem"
      data-first-action
      on:click={() => { const id = menuTicket?.id; closeTicketMenu(); if (id) void onOpenTicket(id); }}
      class="flex h-9 w-full items-center gap-2.5 px-3 text-left text-[12px] font-medium text-[#4C5363] hover:bg-[var(--app-surface-subtle)]"
    ><MessageSquare size={15}/>Abrir conversa</button>

    {#if onOpenTicketService}
      <button
        type="button"
        role="menuitem"
        on:click={() => { if (menuTicket) openTicketService(menuTicket.id); }}
        class="flex h-9 w-full items-center gap-2.5 px-3 text-left text-[12px] font-medium text-[#4C5363] hover:bg-[var(--app-surface-subtle)]"
      ><PanelRightOpen size={15}/>Abrir Atendimento</button>
    {/if}

    <a
      role="menuitem"
      href={`/app/tickets/${menuTicket.id}`}
      target="_blank"
      rel="noopener noreferrer"
      class="flex h-9 items-center gap-2.5 px-3 text-[12px] font-medium text-[#4C5363] hover:bg-[var(--app-surface-subtle)]"
      on:click={closeTicketMenu}
    ><ExternalLink size={15}/>Abrir página completa</a>

    {#if onQuickAction}
      <div class="my-1 border-t border-[var(--app-border-soft)]"></div>
      <label class="block px-3 py-1.5">
        <span class="application-text-meta block font-semibold text-[var(--app-text-muted)]">Alterar status</span>
        <select value="" aria-label="Alterar status do ticket"
          on:click|stopPropagation
          on:change={(event) => void quickAction("status", event.currentTarget.value)}
          class="application-text-caption mt-1 h-9 w-full rounded-lg border border-[var(--app-border-control)] bg-[var(--app-surface)] px-2 text-[var(--app-text)]">
          <option value="" disabled>Escolher status</option>
          <option value="open">Aberto</option><option value="in_progress">Em andamento</option>
          <option value="waiting_customer">Aguardando cliente</option>
          <option value="resolved">Resolvido</option><option value="closed">Fechado</option>
        </select>
      </label>
      {#if labels.length}
        <label class="block px-3 py-1.5">
          <span class="application-text-meta block font-semibold text-[var(--app-text-muted)]">Adicionar etiqueta</span>
          <select value="" aria-label="Adicionar etiqueta ao ticket"
            on:click|stopPropagation
            on:change={(event) => void quickAction("addLabel", event.currentTarget.value)}
            class="application-text-caption mt-1 h-9 w-full rounded-lg border border-[var(--app-border-control)] bg-[var(--app-surface)] px-2 text-[var(--app-text)]">
            <option value="" disabled>Escolher etiqueta</option>
            {#each labels as label}<option value={label.id}>{label.name}</option>{/each}
          </select>
        </label>
      {/if}
    {/if}
    <div class="my-1 border-t border-[var(--app-border-soft)]"></div>
    <button
      type="button"
      role="menuitem"
      on:click={() => { if (menuTicket) void copyTicketLink(menuTicket.id); }}
      class="flex h-9 w-full items-center gap-2.5 px-3 text-left text-[12px] font-medium text-[#4C5363] hover:bg-[var(--app-surface-subtle)]"
    ><Copy size={15}/>Copiar link</button>
  </div>
{/if}

{#if hoveredTicket && !menuTicket}
  <div class="pointer-events-none fixed z-[75] w-[min(350px,calc(100vw-2rem))] rounded-xl border border-[var(--app-border)] bg-[var(--app-surface)] p-3 text-left shadow-xl" style:top={`${Math.max(8,previewTop)}px`} style:left={`${previewLeft}px`} role="status">
    <strong class="application-text-caption block font-semibold text-[var(--app-text)]">#{hoveredTicket.ticketNumber} · {hoveredTicket.subject}</strong>
    <p class="application-text-caption mt-2 line-clamp-5 whitespace-pre-wrap break-words text-[var(--app-text-muted)]">{hoveredTicket.descriptionPreview || "Não há descrição pública disponível."}</p>
  </div>
{/if}

{#if copiedTicketId}
  <div class="pointer-events-none fixed bottom-5 right-5 z-[110] flex items-center gap-2 rounded-lg bg-[#202637] px-3 py-2 text-[12px] font-semibold text-white shadow-lg" role="status">
    <Check size={14}/>Link copiado
  </div>
{/if}
