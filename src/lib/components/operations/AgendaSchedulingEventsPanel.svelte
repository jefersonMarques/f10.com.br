<script lang="ts">
  import { page } from "$app/stores";
  import { onMount } from "svelte";
  import { CalendarPlus2, Clock3, ListChecks, Users, X } from "lucide-svelte";

  type AgendaSchedulingEvent = {
    id: string;
    organizerUserId: string;
    organizerName: string;
    title: string;
    description: string;
    startsAt: Date | string;
    endsAt: Date | string;
    timeZone: string;
    status: "confirmed" | "cancelled";
    ticketId: string | null;
    taskId: string | null;
    googleMeetUrl: string | null;
  };

  type AgendaHost = {
    id: string;
    name: string;
    email: string;
  };

  type AgendaUser = {
    id: string;
    name: string;
    email: string;
  };

  type AgendaTask = {
    id: string;
    title: string;
  };

  type AgendaTicket = {
    id: string;
    subject?: string;
    title?: string;
  };

  type AgendaPageData = {
    calendarAnchor?: string;
    organizerUserId?: string;
    canViewScheduling?: boolean;
    canCreateSchedulingEvent?: boolean;
    canCancelSchedulingEvent?: boolean;
    schedulingEvents?: AgendaSchedulingEvent[];
    schedulingHosts?: AgendaHost[];
    calendarUsers?: AgendaUser[];
    tasks?: AgendaTask[];
    tickets?: AgendaTicket[];
  };

  let createOpen = false;
  let eventDate = "";
  let eventStartTime = "09:00";
  let eventEndTime = "09:30";
  let eventTimeZone = "America/Sao_Paulo";
  let organizerUserId = "";
  let internalParticipantIds: string[] = [];
  let externalEmails = "";

  $: agenda = $page.data as AgendaPageData;
  $: events = agenda.schedulingEvents ?? [];
  $: confirmedEvents = events.filter((event) => event.status === "confirmed");
  $: hosts = agenda.schedulingHosts ?? [];
  $: users = agenda.calendarUsers ?? [];
  $: tasks = agenda.tasks ?? [];
  $: tickets = agenda.tickets ?? [];
  $: attendeesJson = JSON.stringify([
    ...internalParticipantIds
      .map((userId) => users.find((user) => user.id === userId))
      .filter((user): user is AgendaUser => Boolean(user))
      .map((user) => ({ userId: user.id, name: user.name, email: user.email, optional: false })),
    ...externalEmails
      .split(/[;,\n]/)
      .map((email) => email.trim().toLowerCase())
      .filter(Boolean)
      .map((email) => ({ userId: null, name: "", email, optional: false })),
  ]);

  onMount(() => {
    eventTimeZone = Intl.DateTimeFormat().resolvedOptions().timeZone || eventTimeZone;
    const handleCreateRequest = (event: Event) => {
      const detail = (event as CustomEvent<{ date?: string }>).detail;
      openCreate(detail?.date);
    };
    window.addEventListener("f10-agenda:create-event", handleCreateRequest);
    return () => window.removeEventListener("f10-agenda:create-event", handleCreateRequest);
  });

  function openCreate(requestedDate?: string): void {
    eventDate = requestedDate || agenda.calendarAnchor || new Date().toISOString().slice(0, 10);
    organizerUserId = hosts.find((host) => host.id === agenda.organizerUserId)?.id
      ?? hosts[0]?.id
      ?? agenda.organizerUserId
      ?? "";
    internalParticipantIds = [];
    externalEmails = "";
    createOpen = true;
  }

  function asDate(value: Date | string): Date {
    return value instanceof Date ? value : new Date(value);
  }

  function formatEventRange(event: AgendaSchedulingEvent): string {
    const start = asDate(event.startsAt);
    const end = asDate(event.endsAt);
    const date = new Intl.DateTimeFormat("pt-BR", {
      day: "2-digit",
      month: "short",
      timeZone: event.timeZone,
    }).format(start);
    const time = new Intl.DateTimeFormat("pt-BR", {
      hour: "2-digit",
      minute: "2-digit",
      timeZone: event.timeZone,
    });
    return `${date} · ${time.format(start)}–${time.format(end)}`;
  }

  function canCancelEvent(event: AgendaSchedulingEvent): boolean {
    return Boolean(
      agenda.canCancelSchedulingEvent
      && hosts.some((host) => host.id === event.organizerUserId),
    );
  }

  function ticketLabel(ticket: AgendaTicket): string {
    return ticket.subject ?? ticket.title ?? ticket.id;
  }
</script>

{#if $page.url.pathname === "/app/tasks/calendar" && agenda.canViewScheduling}
  <section class="border-b border-[#E5E8EF] bg-[#F8F9FC] px-3 py-2.5 lg:px-4" aria-label="Compromissos da Agenda F10">
    <div class="flex flex-wrap items-center gap-2">
      <div class="mr-auto flex min-w-0 items-center gap-2">
        <span class="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#EEF0FF] text-[#000A57]"><CalendarPlus2 size={15}/></span>
        <div class="min-w-0">
          <strong class="block text-[12px] font-semibold text-[#202637]">Agenda F10</strong>
          <span class="block text-[10px] text-[#7A8190]">{confirmedEvents.length} compromisso(s) no período</span>
        </div>
      </div>

      {#each confirmedEvents.slice(0, 4) as event}
        <span class="hidden max-w-[250px] items-center gap-1.5 truncate rounded-lg border border-[#D8DDF4] bg-white px-2.5 py-1.5 text-[10px] font-semibold text-[#40475A] xl:inline-flex" title={`${event.title} · ${formatEventRange(event)}`}>
          <Clock3 size={11} class="shrink-0 text-[#000A57]"/>
          <span class="truncate">{event.title}</span>
          <span class="shrink-0 font-medium text-[#858B99]">{formatEventRange(event)}</span>
        </span>
      {/each}

      {#if confirmedEvents.length > 0}
        <details class="relative">
          <summary class="inline-flex h-8 cursor-pointer list-none items-center gap-1.5 rounded-lg border border-[#DDE1EA] bg-white px-3 text-[10px] font-semibold text-[#555C6D] hover:bg-[#F7F8FB]">
            <ListChecks size={13}/>Gerenciar
          </summary>
          <div class="absolute right-0 z-50 mt-2 max-h-[420px] w-[min(420px,calc(100vw-24px))] overflow-y-auto rounded-xl border border-[#DDE1EA] bg-white p-2 shadow-[0_18px_50px_rgba(11,18,45,0.18)]">
            {#each confirmedEvents as event}
              <article class="flex items-start gap-3 rounded-lg px-2.5 py-2.5 hover:bg-[#F8F9FC]">
                <Clock3 size={13} class="mt-0.5 shrink-0 text-[#000A57]"/>
                <div class="min-w-0 flex-1">
                  <strong class="block truncate text-[11px] font-semibold text-[#303747]">{event.title}</strong>
                  <span class="mt-0.5 block text-[9px] text-[#858B99]">{formatEventRange(event)} · {event.organizerName}</span>
                </div>
                {#if canCancelEvent(event)}
                  <form
                    method="POST"
                    action="?/cancelSchedulingEvent"
                    on:submit={(submitEvent) => {
                      if (!confirm(`Cancelar o compromisso “${event.title}”?`)) submitEvent.preventDefault();
                    }}
                  >
                    <input type="hidden" name="eventId" value={event.id}/>
                    <button type="submit" class="flex h-7 w-7 items-center justify-center rounded-md border border-[#E9D6D6] text-[#9B3C3C] hover:bg-[#FFF5F5]" aria-label={`Cancelar ${event.title}`} title="Cancelar compromisso">
                      <X size={12}/>
                    </button>
                  </form>
                {/if}
              </article>
            {/each}
          </div>
        </details>
      {/if}

      {#if agenda.canCreateSchedulingEvent}
        <button type="button" on:click={() => openCreate()} class="inline-flex h-8 items-center gap-1.5 rounded-lg bg-[#000A57] px-3 text-[10px] font-semibold text-white">
          <CalendarPlus2 size={13}/>Novo compromisso F10
        </button>
      {/if}
    </div>
  </section>
{/if}

{#if createOpen}
  <div class="fixed inset-0 z-[120] flex items-center justify-center bg-[#101426]/45 p-4" role="presentation" on:click={() => (createOpen = false)}>
    <section class="max-h-[92dvh] w-full max-w-[680px] overflow-y-auto rounded-2xl border border-[#DDE1EA] bg-white shadow-[0_24px_80px_rgba(11,18,45,0.28)]" role="dialog" aria-modal="true" aria-label="Novo compromisso F10" on:click|stopPropagation>
      <header class="flex items-start justify-between border-b border-[#ECEEF3] px-5 py-4">
        <div>
          <span class="text-[10px] font-bold uppercase tracking-[0.1em] text-[#EA6D0B]">Agenda F10</span>
          <h2 class="mt-1 text-[17px] font-semibold text-[#202637]">Novo compromisso</h2>
          <p class="mt-1 text-[11px] text-[#7A8190]">O compromisso é salvo no F10. A sincronização com Google ocorre apenas quando habilitada.</p>
        </div>
        <button type="button" on:click={() => (createOpen = false)} class="flex h-8 w-8 items-center justify-center rounded-lg text-[#777E8D] hover:bg-[#F4F5F8]" aria-label="Fechar"><X size={16}/></button>
      </header>

      <form method="POST" action="?/createSchedulingEvent" class="space-y-4 p-5">
        <div class="grid gap-4 sm:grid-cols-2">
          <label class="sm:col-span-2">
            <span class="mb-1.5 block text-[10px] font-semibold text-[#555C6D]">Título</span>
            <input name="title" required minlength="3" maxlength="180" class="h-10 w-full rounded-lg border border-[#DDE1EA] px-3 text-[12px] outline-none focus:border-[#000A57]" placeholder="Ex.: Reunião de acompanhamento" />
          </label>

          <label class="sm:col-span-2">
            <span class="mb-1.5 block text-[10px] font-semibold text-[#555C6D]">Descrição</span>
            <textarea name="description" maxlength="5000" rows="3" class="w-full rounded-lg border border-[#DDE1EA] px-3 py-2 text-[12px] outline-none focus:border-[#000A57]" placeholder="Contexto opcional do compromisso"></textarea>
          </label>

          <label>
            <span class="mb-1.5 block text-[10px] font-semibold text-[#555C6D]">Responsável</span>
            <select name="organizerUserId" bind:value={organizerUserId} required class="h-10 w-full rounded-lg border border-[#DDE1EA] bg-white px-3 text-[12px] outline-none focus:border-[#000A57]">
              {#each hosts as host}<option value={host.id}>{host.name}</option>{/each}
            </select>
          </label>

          <label>
            <span class="mb-1.5 block text-[10px] font-semibold text-[#555C6D]">Data</span>
            <input name="date" type="date" bind:value={eventDate} required class="h-10 w-full rounded-lg border border-[#DDE1EA] px-3 text-[12px] outline-none focus:border-[#000A57]" />
          </label>

          <label>
            <span class="mb-1.5 block text-[10px] font-semibold text-[#555C6D]">Início</span>
            <input name="startTime" type="time" bind:value={eventStartTime} required class="h-10 w-full rounded-lg border border-[#DDE1EA] px-3 text-[12px] outline-none focus:border-[#000A57]" />
          </label>

          <label>
            <span class="mb-1.5 block text-[10px] font-semibold text-[#555C6D]">Fim</span>
            <input name="endTime" type="time" bind:value={eventEndTime} required class="h-10 w-full rounded-lg border border-[#DDE1EA] px-3 text-[12px] outline-none focus:border-[#000A57]" />
          </label>

          <label class="sm:col-span-2">
            <span class="mb-1.5 block text-[10px] font-semibold text-[#555C6D]">Fuso horário</span>
            <input name="timeZone" bind:value={eventTimeZone} required maxlength="100" class="h-10 w-full rounded-lg border border-[#DDE1EA] px-3 text-[12px] outline-none focus:border-[#000A57]" />
          </label>
        </div>

        {#if users.length > 0}
          <fieldset class="rounded-xl border border-[#E4E7EE] p-3">
            <legend class="px-1 text-[10px] font-semibold text-[#555C6D]"><span class="inline-flex items-center gap-1.5"><Users size={12}/>Participantes internos</span></legend>
            <div class="mt-1 grid max-h-32 gap-2 overflow-y-auto sm:grid-cols-2">
              {#each users.filter((user) => user.id !== organizerUserId) as user}
                <label class="flex items-center gap-2 rounded-lg px-2 py-1.5 text-[11px] text-[#4F5667] hover:bg-[#F7F8FB]">
                  <input type="checkbox" bind:group={internalParticipantIds} value={user.id} />
                  <span class="min-w-0"><strong class="block truncate font-semibold">{user.name}</strong><small class="block truncate text-[9px] text-[#9298A5]">{user.email}</small></span>
                </label>
              {/each}
            </div>
          </fieldset>
        {/if}

        <label class="block">
          <span class="mb-1.5 block text-[10px] font-semibold text-[#555C6D]">Participantes externos</span>
          <textarea bind:value={externalEmails} rows="2" class="w-full rounded-lg border border-[#DDE1EA] px-3 py-2 text-[12px] outline-none focus:border-[#000A57]" placeholder="email@cliente.com; outro@empresa.com"></textarea>
          <small class="mt-1 block text-[9px] text-[#9298A5]">Separe e-mails por vírgula, ponto e vírgula ou linha.</small>
        </label>

        <div class="grid gap-4 sm:grid-cols-2">
          {#if tickets.length > 0}
            <label>
              <span class="mb-1.5 block text-[10px] font-semibold text-[#555C6D]">Ticket relacionado</span>
              <select name="ticketId" class="h-10 w-full rounded-lg border border-[#DDE1EA] bg-white px-3 text-[12px] outline-none focus:border-[#000A57]">
                <option value="">Nenhum</option>
                {#each tickets as ticket}<option value={ticket.id}>{ticketLabel(ticket)}</option>{/each}
              </select>
            </label>
          {/if}

          {#if tasks.length > 0}
            <label>
              <span class="mb-1.5 block text-[10px] font-semibold text-[#555C6D]">Tarefa relacionada</span>
              <select name="taskId" class="h-10 w-full rounded-lg border border-[#DDE1EA] bg-white px-3 text-[12px] outline-none focus:border-[#000A57]">
                <option value="">Nenhuma</option>
                {#each tasks as task}<option value={task.id}>{task.title}</option>{/each}
              </select>
            </label>
          {/if}
        </div>

        <input type="hidden" name="attendeesJson" value={attendeesJson} />
        <input type="hidden" name="location" value="" />
        <input type="hidden" name="reminderMinutes" value="" />

        <footer class="flex justify-end gap-2 border-t border-[#ECEEF3] pt-4">
          <button type="button" on:click={() => (createOpen = false)} class="h-9 rounded-lg border border-[#DDE1EA] px-4 text-[11px] font-semibold text-[#616879]">Cancelar</button>
          <button type="submit" class="h-9 rounded-lg bg-[#000A57] px-4 text-[11px] font-semibold text-white">Criar compromisso F10</button>
        </footer>
      </form>
    </section>
  </div>
{/if}
