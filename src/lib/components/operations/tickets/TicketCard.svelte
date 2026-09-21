<script lang="ts">
  import { Clock3, Mail, UserRound } from "lucide-svelte";
  import { labelClasses, priorityLabels } from "./presentation";
  import type { TicketItem } from "./types";

  export let ticket: TicketItem;
  export let canDrag = false;
  export let onDragStart: (event: DragEvent, ticketId: string) => void;
  export let onOpen: (ticketId: string) => void | Promise<void>;

  function initials(name: string | null): string {
    if (!name) return "—";
    return name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase() ?? "")
      .join("");
  }

  function activeSla(): string | Date | null {
    if (ticket.resolvedAt) return null;
    if (!ticket.firstResponseAt) return ticket.firstResponseDueAt;
    return ticket.nextResponseDueAt ?? ticket.resolutionDueAt;
  }

  function slaText(): string {
    const value = activeSla();
    if (!value) return ticket.resolvedAt ? "Concluído" : "Sem SLA";
    const diff = new Date(value).getTime() - Date.now();
    const minutes = Math.max(1, Math.round(Math.abs(diff) / 60_000));
    if (diff < 0) return minutes < 60 ? `Vencido ${minutes}m` : `Vencido ${Math.floor(minutes / 60)}h`;
    return minutes < 60 ? `${minutes}m` : `${Math.floor(minutes / 60)}h ${minutes % 60}m`;
  }

  function slaClass(): string {
    const value = activeSla();
    if (!value) return "bg-[#F1F2F5] text-[#777D8C]";
    const diff = new Date(value).getTime() - Date.now();
    if (diff < 0) return "bg-[#FFF0F0] text-[#A33A3A]";
    if (diff <= 60 * 60_000) return "bg-[#FFF4E9] text-[#A9510D]";
    return "bg-[#EEF8F1] text-[#2F7045]";
  }
</script>

<article
  draggable={canDrag}
  on:dragstart={(event) => onDragStart(event, ticket.id)}
  class="rounded-xl border border-[#DDE1E8] bg-white p-3 shadow-[0_2px_8px_rgba(9,30,66,0.08)] transition hover:border-[#B9C0CE] hover:shadow-[0_5px_16px_rgba(9,30,66,0.12)]"
>
  <button type="button" on:click={() => void onOpen(ticket.id)} class="block w-full text-left">
    {#if ticket.labels.length > 0}
      <div class="mb-2 flex flex-wrap gap-1">
        {#each ticket.labels.slice(0, 5) as label}
          <span class={`h-2 w-10 rounded-full ${labelClasses[label.color] ?? labelClasses.gray}`} title={label.name}></span>
        {/each}
      </div>
    {/if}

    <div class="flex items-start justify-between gap-2">
      <span class="application-text-meta flex items-center gap-1.5 font-bold text-[#EA6D0B]">
        #{ticket.ticketNumber}
        {#if ticket.channel === "email"}<Mail size={11} aria-label="Recebido por e-mail"/>{/if}
      </span>
      <span class="application-text-meta text-[#7C8290]">{priorityLabels[ticket.priority] ?? ticket.priority}</span>
    </div>

    <strong class="mt-1.5 block text-[11px] font-semibold leading-4 text-[#252B3B]">{ticket.subject}</strong>

    <div class="application-text-meta mt-3 flex items-center gap-1.5 text-[#7D8392]">
      <UserRound size={11}/>
      <span class="truncate">{ticket.customerName ?? "Cliente não identificado"}</span>
    </div>

    <div class="mt-3 flex items-center justify-between gap-2 border-t border-[#EEF0F4] pt-2.5">
      <div class="flex min-w-0 items-center gap-2">
        <span class="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#EEF0FF] text-[9px] font-bold text-[#000A57]">{initials(ticket.assignedUserName)}</span>
        <span class="application-text-meta truncate font-semibold text-[#6B7280]">{ticket.assignedUserName ?? "Sem responsável"}</span>
      </div>
      <span class={`application-text-meta inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-1 font-bold ${slaClass()}`}>
        <Clock3 size={10}/>
        {slaText()}
      </span>
    </div>
  </button>
</article>
