<script lang="ts">
  import { CalendarDays, Clock3, History } from "lucide-svelte";
  import { eventLabels, formatDateTime } from "./presentation";
  import type { TicketDetailsData } from "./types";

  export let ticketData: TicketDetailsData;

  let showAllEvents = false;

  $: ticket = ticketData.details.ticket;
  $: events = ticketData.details.events;
  $: visibleEvents = showAllEvents ? events : events.slice(0, 12);
  $: nextResponseStatus = ticket.resolvedAt || ticket.closedAt
    ? { label: "Atendimento encerrado", color: "var(--app-text-muted)" }
    : deadlineStatus(ticket.nextResponseDueAt, null);

  function dateTime(value: string | Date | null): string {
    return value ? formatDateTime(value) : "Não registrado";
  }

  function deadlineStatus(
    dueAt: string | Date | null,
    completedAt: string | Date | null,
  ): { label: string; color: string } {
    if (completedAt) {
      if (dueAt && new Date(completedAt).getTime() > new Date(dueAt).getTime()) {
        return { label: "Concluído após o prazo", color: "var(--app-warning-text)" };
      }
      return { label: "Concluído", color: "var(--app-success-text)" };
    }
    if (!dueAt) {
      return { label: "Sem meta configurada", color: "var(--app-text-muted)" };
    }
    if (Date.now() > new Date(dueAt).getTime()) {
      return { label: "Prazo vencido", color: "var(--app-danger-text)" };
    }
    return { label: "Dentro do prazo", color: "var(--app-success-text)" };
  }
</script>

<div class="w-full space-y-4 p-3 sm:p-5">
  <section class="rounded-xl border border-[var(--app-border)] bg-[var(--app-surface)] p-4">
    <h2 class="application-text-caption mb-3 flex items-center gap-2 font-bold text-[var(--app-text)]">
      <Clock3 size={18} class="text-[var(--app-primary)]"/> Indicadores e prazos de SLA
    </h2>
    <div class="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
      <div class="rounded-lg border border-[var(--app-border)] bg-[var(--app-surface-subtle)] p-3">
        <p class="application-text-caption font-semibold text-[var(--app-text)]">Primeira resposta</p>
        <p class="application-text-caption mt-1 font-semibold"
          style:color={deadlineStatus(ticket.firstResponseDueAt, ticket.firstResponseAt).color}>
          {deadlineStatus(ticket.firstResponseDueAt, ticket.firstResponseAt).label}
        </p>
        <dl class="application-text-meta mt-2 space-y-1 text-[var(--app-text-muted)]">
          <div><dt class="inline">Meta: </dt><dd class="inline">{dateTime(ticket.firstResponseDueAt)}</dd></div>
          <div><dt class="inline">Resposta: </dt><dd class="inline">{dateTime(ticket.firstResponseAt)}</dd></div>
        </dl>
      </div>
      <div class="rounded-lg border border-[var(--app-border)] bg-[var(--app-surface-subtle)] p-3">
        <p class="application-text-caption font-semibold text-[var(--app-text)]">Próxima resposta</p>
        <p class="application-text-caption mt-1 font-semibold"
          style:color={nextResponseStatus.color}>
          {nextResponseStatus.label}
        </p>
        <p class="application-text-meta mt-2 text-[var(--app-text-muted)]">
          Meta: {dateTime(ticket.nextResponseDueAt)}
        </p>
      </div>
      <div class="rounded-lg border border-[var(--app-border)] bg-[var(--app-surface-subtle)] p-3">
        <p class="application-text-caption font-semibold text-[var(--app-text)]">Resolução</p>
        <p class="application-text-caption mt-1 font-semibold"
          style:color={deadlineStatus(ticket.resolutionDueAt, ticket.resolvedAt).color}>
          {deadlineStatus(ticket.resolutionDueAt, ticket.resolvedAt).label}
        </p>
        <dl class="application-text-meta mt-2 space-y-1 text-[var(--app-text-muted)]">
          <div><dt class="inline">Meta: </dt><dd class="inline">{dateTime(ticket.resolutionDueAt)}</dd></div>
          <div><dt class="inline">Resolução: </dt><dd class="inline">{dateTime(ticket.resolvedAt)}</dd></div>
        </dl>
      </div>
    </div>
    <div class="application-text-caption mt-3 flex flex-wrap gap-x-5 gap-y-2 border-t border-[var(--app-border-soft)] pt-3 text-[var(--app-text-muted)]">
      <span class="inline-flex items-center gap-1.5"><CalendarDays size={15}/> Criado: {dateTime(ticket.createdAt)}</span>
      <span>Última atualização: {dateTime(ticket.updatedAt)}</span>
      {#if ticket.closedAt}
        <span>Fechado: {dateTime(ticket.closedAt)}</span>
      {/if}
    </div>
  </section>

  <section class="rounded-xl border border-[var(--app-border)] bg-[var(--app-surface)] p-4">
    <div class="flex flex-wrap items-center justify-between gap-2">
      <h2 class="application-text-caption flex items-center gap-2 font-bold text-[var(--app-text)]">
        <History size={18} class="text-[var(--app-primary)]"/>
        Histórico do ticket
        <span class="application-text-meta rounded-full bg-[var(--app-surface-muted)] px-2 py-1 text-[var(--app-text-muted)]">
          {events.length}
        </span>
      </h2>
      {#if events.length > 12}
        <button type="button" on:click={() => (showAllEvents = !showAllEvents)}
          class="application-text-caption font-semibold text-[var(--app-primary)]">
          {showAllEvents ? "Mostrar menos" : "Ver histórico completo"}
        </button>
      {/if}
    </div>
    {#if visibleEvents.length === 0}
      <p class="application-text-caption mt-3 text-[var(--app-text-muted)]">
        Ainda não há eventos registrados.
      </p>
    {:else}
      <ol class="mt-4 space-y-4 border-l border-[var(--app-border)] pl-5">
        {#each visibleEvents as event (event.id)}
          <li class="relative">
            <span class="absolute -left-[26px] top-1 h-2.5 w-2.5 rounded-full border-2 border-[var(--app-surface)] bg-[var(--app-primary)]"></span>
            <p class="application-text-caption leading-5 text-[var(--app-text)]">
              <strong>{event.actorName ?? "Sistema"}</strong>
              {eventLabels[event.eventType] ?? event.eventType}
              {#if event.sourceTicketNumber && event.sourceTicketNumber !== ticket.ticketNumber}
                · Origem: #{event.sourceTicketNumber}
              {/if}
            </p>
            <p class="application-text-meta mt-1 text-[var(--app-text-muted)]">
              {dateTime(event.createdAt)}
            </p>
          </li>
        {/each}
      </ol>
    {/if}
  </section>
</div>
