<script lang="ts">
  import {
    CalendarClock,
    CheckCircle2,
    CheckSquare2,
    ExternalLink,
    Headphones,
    Link2,
  } from "lucide-svelte";

  export let anchor: string;
  export let period: "today" | "tomorrow" | "week" | "next7" | "month" = "today";
  export let tasks: Array<{
    id: string;
    title: string;
    projectName: string;
    priority: string;
    dueOn: string | null;
    statusName: string;
    statusClosed: boolean;
  }> = [];
  export let tickets: Array<{
    id: string;
    ticketNumber: number;
    subject: string;
    dueOn: string;
    status: string;
    priority: string;
    queueName: string;
    assignedUserName: string | null;
  }> = [];
  export let googleEvents: Array<{
    id: string;
    summary: string;
    allDay: boolean;
    startDate: string | null;
    startDateTime: string | null;
    htmlLink: string | null;
    location: string | null;
  }> = [];
  export let bookings: Array<{
    id: string;
    customerName: string;
    notes: string;
    startAt: string | Date;
    endAt: string | Date;
    googleMeetUrl: string | null;
    googleEventId: string | null;
  }> = [];

  type ListItem = {
    key: string;
    sortTime: string;
    source: "task" | "ticket" | "google" | "booking";
    id: string;
    title: string;
    subtitle: string;
    status: string;
    completed: boolean;
    href: string | null;
    external: boolean;
  };

  const ticketStatusLabels: Record<string, string> = {
    new: "Novo",
    open: "Aberto",
    in_progress: "Em andamento",
    waiting_customer: "Aguardando cliente",
    resolved: "Resolvido",
    closed: "Fechado",
  };

  function parseDateKey(value: string): Date {
    const [year, month, day] = value.split("-").map(Number);
    return new Date(year, month - 1, day);
  }

  function dateKey(value: Date): string {
    const year = value.getFullYear();
    const month = String(value.getMonth() + 1).padStart(2, "0");
    const day = String(value.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }

  function addDays(value: string, days: number): string {
    const date = parseDateKey(value);
    date.setDate(date.getDate() + days);
    return dateKey(date);
  }

  function startOfWeek(value: string): string {
    const date = parseDateKey(value);
    const offset = (date.getDay() + 6) % 7;
    date.setDate(date.getDate() - offset);
    return dateKey(date);
  }

  function periodRange(): { start: string; end: string } {
    const today = dateKey(new Date());
    if (period === "today") return { start: today, end: today };
    if (period === "tomorrow") {
      const tomorrow = addDays(today, 1);
      return { start: tomorrow, end: tomorrow };
    }
    if (period === "week") {
      const start = startOfWeek(today);
      return { start, end: addDays(start, 6) };
    }
    if (period === "next7") return { start: today, end: addDays(today, 6) };
    const date = parseDateKey(anchor);
    const start = dateKey(new Date(date.getFullYear(), date.getMonth(), 1));
    const end = dateKey(new Date(date.getFullYear(), date.getMonth() + 1, 0));
    return { start, end };
  }

  function inRange(value: string): boolean {
    const range = periodRange();
    return value >= range.start && value <= range.end;
  }

  function googleDate(event: typeof googleEvents[number]): string | null {
    return event.startDate ?? event.startDateTime?.slice(0, 10) ?? null;
  }

  function googleTime(event: typeof googleEvents[number]): string {
    if (event.allDay || !event.startDateTime) return "Dia inteiro";
    return new Intl.DateTimeFormat("pt-BR", {
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(event.startDateTime));
  }

  function bookingDate(value: string | Date): string {
    return dateKey(new Date(value));
  }

  function bookingTime(value: string | Date): string {
    return new Intl.DateTimeFormat("pt-BR", {
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(value));
  }

  function formatDate(value: string): { day: string; weekday: string } {
    const date = parseDateKey(value);
    return {
      day: new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "short" }).format(date),
      weekday: new Intl.DateTimeFormat("pt-BR", { weekday: "short" }).format(date).replace(".", ""),
    };
  }

  $: bookingGoogleEventIds = new Set(
    bookings.map((booking) => booking.googleEventId).filter((value): value is string => Boolean(value)),
  );
  $: items = [
    ...tasks.flatMap((task): ListItem[] => task.dueOn && inRange(task.dueOn) ? [{
      key: task.dueOn,
      sortTime: "23:58",
      source: "task",
      id: task.id,
      title: task.title,
      subtitle: task.projectName,
      status: task.statusName,
      completed: task.statusClosed,
      href: `/app/tasks/${task.id}`,
      external: false,
    }] : []),
    ...tickets.flatMap((ticket): ListItem[] => inRange(ticket.dueOn) ? [{
      key: ticket.dueOn,
      sortTime: "23:59",
      source: "ticket",
      id: ticket.id,
      title: `#${ticket.ticketNumber} · ${ticket.subject}`,
      subtitle: `${ticket.queueName}${ticket.assignedUserName ? ` · ${ticket.assignedUserName}` : ""}`,
      status: ticketStatusLabels[ticket.status] ?? ticket.status,
      completed: ticket.status === "resolved" || ticket.status === "closed",
      href: `/app/tickets/${ticket.id}`,
      external: false,
    }] : []),
    ...bookings.flatMap((booking): ListItem[] => {
      const key = bookingDate(booking.startAt);
      if (!inRange(key)) return [];
      return [{
        key,
        sortTime: bookingTime(booking.startAt),
        source: "booking",
        id: booking.id,
        title: booking.customerName,
        subtitle: `${bookingTime(booking.startAt)}${booking.notes ? ` · ${booking.notes}` : ""}`,
        status: "Agendado",
        completed: false,
        href: booking.googleMeetUrl,
        external: Boolean(booking.googleMeetUrl),
      }];
    }),
    ...googleEvents.flatMap((event): ListItem[] => {
      if (bookingGoogleEventIds.has(event.id)) return [];
      const key = googleDate(event);
      if (!key || !inRange(key)) return [];
      return [{
        key,
        sortTime: event.allDay ? "00:00" : googleTime(event),
        source: "google",
        id: event.id,
        title: event.summary,
        subtitle: `${googleTime(event)}${event.location ? ` · ${event.location}` : ""}`,
        status: "Google Calendar",
        completed: false,
        href: event.htmlLink,
        external: true,
      }];
    }),
  ].sort(
    (left, right) =>
      left.key.localeCompare(right.key) ||
      left.sortTime.localeCompare(right.sortTime) ||
      left.title.localeCompare(right.title),
  );
</script>

<div class="bg-app-surface">
  {#if items.length === 0}
    <div class="flex min-h-[320px] items-center justify-center px-5 py-12 text-center">
      <div>
        <CheckCircle2 size={28} class="mx-auto text-[#B6BBC6]"/>
        <strong class="application-text-body mt-3 block font-semibold text-[#515868]">Nenhum item</strong>
      </div>
    </div>
  {:else}
    <div class="divide-y divide-[#ECEEF3]">
      {#each items as item}
        {@const date = formatDate(item.key)}
        <div class={`grid gap-3 px-4 py-3 transition hover:bg-app-subtle sm:grid-cols-[92px_110px_minmax(0,1fr)_150px] sm:items-center lg:px-5 ${item.completed ? "opacity-60" : ""}`}>
          <div class="flex items-baseline gap-2 sm:block">
            <strong class="application-text-body capitalize text-[#303747]">{date.day}</strong>
            <span class="application-text-meta capitalize text-[#9298A5] sm:mt-0.5 sm:block">{date.weekday}</span>
          </div>

          <div>
            {#if item.source === "task"}
              <span class="application-text-meta inline-flex items-center gap-1.5 rounded-full bg-app-info-bg px-2 py-1 font-bold text-app-primary"><CheckSquare2 size={11}/>Tarefa</span>
            {:else if item.source === "ticket"}
              <span class="application-text-meta inline-flex items-center gap-1.5 rounded-full bg-app-warning-surface px-2 py-1 font-bold text-app-warning-text"><Headphones size={11}/>Ticket</span>
            {:else if item.source === "booking"}
              <span class="application-text-meta inline-flex items-center gap-1.5 rounded-full bg-app-info-bg px-2 py-1 font-bold text-app-info-text"><CalendarClock size={11}/>Agendamento</span>
            {:else}
              <span class="application-text-meta inline-flex items-center gap-1.5 rounded-full bg-app-success-bg px-2 py-1 font-bold text-app-success-text"><Link2 size={11}/>Google</span>
            {/if}
          </div>

          <div class="min-w-0">
            {#if item.href}
              <a href={item.href} target={item.external ? "_blank" : undefined} rel={item.external ? "noopener noreferrer" : undefined} class={`application-text-caption inline-flex max-w-full items-center gap-1.5 font-semibold text-[#343B4B] hover:text-app-primary ${item.completed ? "line-through" : ""}`}>
                <span class="truncate">{item.title}</span>
                {#if item.external}<ExternalLink size={10} class="shrink-0"/>{/if}
              </a>
            {:else}
              <strong class={`application-text-caption block truncate font-semibold text-[#343B4B] ${item.completed ? "line-through" : ""}`}>{item.title}</strong>
            {/if}
            <span class="application-text-meta mt-1 block truncate text-[#858B99]">{item.subtitle}</span>
          </div>

          <div class="sm:text-right">
            <span class={`application-text-meta inline-flex items-center gap-1 font-semibold ${item.completed ? "text-app-success-text" : "text-[#747B8A]"}`}>
              {#if item.completed}<CheckCircle2 size={12}/>{/if}{item.status}
            </span>
          </div>
        </div>
      {/each}
    </div>
  {/if}
</div>
