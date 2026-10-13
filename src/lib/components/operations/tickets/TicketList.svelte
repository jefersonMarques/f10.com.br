<script lang="ts">
  import { Clock3, Mail, TicketCheck, UserRound } from "lucide-svelte";
  import { labelClasses, priorityLabels } from "./presentation";
  import type { TicketItem, TicketWorkflow } from "./types";

  export let tickets: TicketItem[] = [];
  export let globalWorkflow: TicketWorkflow | null;
  export let areaWorkflows: TicketWorkflow[] = [];
  export let selectedTicketId: string | null = null;
  export let compact = false;
  export let onOpenTicket: (ticketId: string) => void | Promise<void>;

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

{#if tickets.length > 0}
  {#if compact}
    <section class="flex h-full min-h-0 flex-col bg-white">
      <header class="flex shrink-0 items-center justify-between border-b border-[var(--app-border-soft)] px-3 py-2.5">
        <h2 class="text-[13px] font-semibold text-[#202637]">Tickets</h2>
        <span class="rounded-full bg-[var(--app-surface-muted)] px-2 py-0.5 text-[11px] font-semibold text-[#687080]">{tickets.length}</span>
      </header>

      <div class="min-h-0 flex-1 overflow-y-auto px-2 py-2">
        <div class="space-y-1.5">
          {#each tickets as ticket}
            <button
              type="button"
              on:click={() => void onOpenTicket(ticket.id)}
              aria-pressed={selectedTicketId === ticket.id}
              title={ticket.subject}
              class={`block w-full rounded-xl border px-3 py-2 text-left transition ${selectedTicketId === ticket.id ? "border-[var(--app-info-border)] bg-[var(--app-surface-selected)]" : "border-[var(--app-border)] bg-white hover:border-[var(--app-border-control)] hover:bg-[var(--app-surface-subtle)]"}`}
            >
              <div class="flex min-w-0 items-center gap-2">
                <span class="shrink-0 rounded-md bg-[var(--app-info-bg)] px-1.5 py-0.5 text-[11px] font-bold text-[#000A57]">#{ticket.ticketNumber}</span>
                <strong class="min-w-0 flex-1 truncate text-[12px] font-semibold text-[#303645]">{ticket.subject}</strong>
                <span class="shrink-0 text-[11px] text-[#8A909D]">{relativeUpdated(ticket.updatedAt)}</span>
              </div>
              <div class="mt-1.5 flex min-w-0 items-center gap-1.5 text-[11px] text-[#656D7D]">
                <UserRound size={12} class="shrink-0" aria-hidden="true"/>
                <span class="min-w-0 flex-1 truncate">{ticket.customerName ?? "Cliente não identificado"}</span>
                <span class="shrink-0 text-[#C0C4CD]">·</span>
                <span class="min-w-0 flex-1 truncate">{processLabel(ticket)}</span>
                {#if ticket.channel === "email"}<Mail size={12} class="shrink-0" aria-label="Recebido por e-mail"/>{/if}
              </div>
              <div class="mt-1.5 flex min-w-0 items-center gap-1.5">
                <span class={`inline-flex shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold ${slaClass(ticket)}`}>{slaText(ticket)}</span>
                <span class="min-w-0 flex-1 truncate text-[11px] text-[#747B8B]">{priorityLabels[ticket.priority] ?? ticket.priority} · {ticket.assignedUserName ?? "Sem responsável"}</span>
                {#if ticket.labels.length > 0}
                  <span class={`max-w-[70px] shrink-0 truncate rounded px-1 py-0.5 text-[10px] font-semibold ${labelClasses[ticket.labels[0].color] ?? labelClasses.gray}`}>{ticket.labels[0].name}</span>
                {/if}
              </div>
            </button>
          {/each}
        </div>
      </div>
    </section>
  {:else}
  <div class="hidden overflow-x-auto md:block">
    <div class={compact ? "min-w-[760px]" : "min-w-[1020px]"}>
      <div class={`grid border-b border-[var(--app-border-soft)] bg-[var(--app-surface-subtle)] px-4 py-2.5 ${compact ? "grid-cols-[88px_minmax(220px,1.5fr)_minmax(160px,1fr)_120px]" : "grid-cols-[90px_minmax(220px,1.5fr)_minmax(160px,1fr)_minmax(180px,1fr)_110px_180px_120px_110px]"}`}>
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
      </div>

      <div class="divide-y divide-[#EEF0F4]">
        {#each tickets as ticket}
          <button
            type="button"
            on:click={() => void onOpenTicket(ticket.id)}
            class={`grid w-full items-center gap-3 px-4 py-3.5 text-left transition hover:bg-[var(--app-surface-subtle)] ${selectedTicketId === ticket.id ? "bg-[var(--app-info-bg)]" : ""} ${compact ? "grid-cols-[88px_minmax(220px,1.5fr)_minmax(160px,1fr)_120px]" : "grid-cols-[90px_minmax(220px,1.5fr)_minmax(160px,1fr)_minmax(180px,1fr)_110px_180px_120px_110px]"}`}
          >
            <span class="application-text-caption flex items-center gap-1.5 font-bold text-[#000A57]">
              #{ticket.ticketNumber}
              {#if ticket.channel === "email"}<Mail size={11} aria-label="Recebido por e-mail"/>{/if}
            </span>

            <div class="min-w-0">
              <strong class="block truncate text-[13px] font-semibold text-[#2D3342]">{ticket.subject}</strong>
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
          </button>
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
            <strong class="mt-1 block text-[13px] font-semibold leading-5 text-[#2D3342]">{ticket.subject}</strong>
          </div>
          <span class={`application-text-caption shrink-0 rounded-full px-2 py-1 font-bold ${slaClass(ticket)}`}>{slaText(ticket)}</span>
        </div>
        <div class="application-text-caption mt-2 flex items-center gap-2 text-[#777E8D]">
          <UserRound size={12}/>
          <span class="truncate">{ticket.customerName ?? "Cliente não identificado"}</span>
          <span>·</span>
          <span class="truncate">{ticket.assignedUserName ?? "Sem responsável"}</span>
        </div>
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
