<script lang="ts">
  import { CheckCircle2, CheckSquare2, ExternalLink, Headphones, Link2 } from "lucide-svelte";

  export let anchor: string;
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

  type ListItem = {
    key: string;
    source: "task" | "ticket" | "google";
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

  function googleDate(event: typeof googleEvents[number]): string | null {
    return event.startDate ?? event.startDateTime?.slice(0, 10) ?? null;
  }

  function googleTime(event: typeof googleEvents[number]): string {
    if (event.allDay || !event.startDateTime) return "Dia inteiro";
    return new Intl.DateTimeFormat("pt-BR", { hour: "2-digit", minute: "2-digit" }).format(new Date(event.startDateTime));
  }

  function formatDate(value: string): { day: string; weekday: string } {
    const [year, month, day] = value.split("-").map(Number);
    const date = new Date(year, month - 1, day);
    return {
      day: new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "short" }).format(date),
      weekday: new Intl.DateTimeFormat("pt-BR", { weekday: "short" }).format(date).replace(".", ""),
    };
  }

  $: monthPrefix = anchor.slice(0, 7);
  $: items = [
    ...tasks.flatMap((task): ListItem[] => task.dueOn && task.dueOn.startsWith(monthPrefix) ? [{
      key: task.dueOn,
      source: "task",
      id: task.id,
      title: task.title,
      subtitle: task.projectName,
      status: task.statusName,
      completed: task.statusClosed,
      href: `/app/tasks/${task.id}`,
      external: false,
    }] : []),
    ...tickets.flatMap((ticket): ListItem[] => ticket.dueOn.startsWith(monthPrefix) ? [{
      key: ticket.dueOn,
      source: "ticket",
      id: ticket.id,
      title: `#${ticket.ticketNumber} · ${ticket.subject}`,
      subtitle: `${ticket.queueName}${ticket.assignedUserName ? ` · ${ticket.assignedUserName}` : ""}`,
      status: ticketStatusLabels[ticket.status] ?? ticket.status,
      completed: ticket.status === "resolved" || ticket.status === "closed",
      href: `/app/tickets/${ticket.id}`,
      external: false,
    }] : []),
    ...googleEvents.flatMap((event): ListItem[] => {
      const key = googleDate(event);
      if (!key || !key.startsWith(monthPrefix)) return [];
      return [{
        key,
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
  ].sort((left, right) => left.key.localeCompare(right.key) || left.title.localeCompare(right.title));
</script>

<div class="bg-white">
  {#if items.length === 0}
    <div class="flex min-h-[360px] items-center justify-center px-5 py-12 text-center">
      <div>
        <CheckCircle2 size={28} class="mx-auto text-[#B6BBC6]"/>
        <strong class="application-text-body mt-3 block font-semibold text-[#515868]">Nenhum item com os filtros atuais</strong>
        <span class="application-text-caption mt-1 block text-[#8C929F]">Altere as fontes ou a opção de concluídos para ampliar a lista.</span>
      </div>
    </div>
  {:else}
    <div class="divide-y divide-[#ECEEF3]">
      {#each items as item}
        {@const date = formatDate(item.key)}
        <div class={`grid gap-3 px-4 py-3 transition hover:bg-[#FAFAFC] sm:grid-cols-[92px_110px_minmax(0,1fr)_150px] sm:items-center lg:px-5 ${item.completed ? "opacity-60" : ""}`}>
          <div class="flex items-baseline gap-2 sm:block">
            <strong class="application-text-body capitalize text-[#303747]">{date.day}</strong>
            <span class="application-text-meta capitalize text-[#9298A5] sm:mt-0.5 sm:block">{date.weekday}</span>
          </div>

          <div>
            {#if item.source === "task"}
              <span class="application-text-meta inline-flex items-center gap-1.5 rounded-full bg-[#EEF0FF] px-2 py-1 font-bold text-[#000A57]"><CheckSquare2 size={11}/>Tarefa</span>
            {:else if item.source === "ticket"}
              <span class="application-text-meta inline-flex items-center gap-1.5 rounded-full bg-[#FFF4E8] px-2 py-1 font-bold text-[#9B530F]"><Headphones size={11}/>Ticket</span>
            {:else}
              <span class="application-text-meta inline-flex items-center gap-1.5 rounded-full bg-[#EEF8F1] px-2 py-1 font-bold text-[#2F7045]"><Link2 size={11}/>Google</span>
            {/if}
          </div>

          <div class="min-w-0">
            {#if item.href}
              <a href={item.href} target={item.external ? "_blank" : undefined} rel={item.external ? "noopener noreferrer" : undefined} class={`application-text-caption inline-flex max-w-full items-center gap-1.5 font-semibold text-[#343B4B] hover:text-[#000A57] ${item.completed ? "line-through" : ""}`}>
                <span class="truncate">{item.title}</span>
                {#if item.external}<ExternalLink size={10} class="shrink-0"/>{/if}
              </a>
            {:else}
              <strong class={`application-text-caption block truncate font-semibold text-[#343B4B] ${item.completed ? "line-through" : ""}`}>{item.title}</strong>
            {/if}
            <span class="application-text-meta mt-1 block truncate text-[#858B99]">{item.subtitle}</span>
          </div>

          <div class="sm:text-right">
            <span class={`application-text-meta inline-flex items-center gap-1 font-semibold ${item.completed ? "text-[#2F7045]" : "text-[#747B8A]"}`}>
              {#if item.completed}<CheckCircle2 size={12}/>{/if}{item.status}
            </span>
          </div>
        </div>
      {/each}
    </div>
  {/if}
</div>
