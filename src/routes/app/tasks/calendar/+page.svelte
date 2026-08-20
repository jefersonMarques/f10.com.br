<script lang="ts">
  import { enhance } from "$app/forms";
  import { goto } from "$app/navigation";
  import { page } from "$app/stores";
  import { onMount } from "svelte";
  import {
    CalendarDays,
    ChevronDown,
    ChevronLeft,
    ChevronRight,
    CircleAlert,
    Clock3,
    ExternalLink,
    Headphones,
    Link2,
    Plus,
    Unplug,
    Video,
    X,
  } from "lucide-svelte";
  import ApplicationContent from "$lib/components/application/ApplicationContent.svelte";
  import GoogleEventDetailsEditor from "$lib/components/operations/GoogleEventDetailsEditor.svelte";
  import type { ActionData, PageData } from "./$types";

  export let data: PageData;
  export let form: ActionData;

  type CalendarView = "month" | "week";

  const weekdayLabels = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"];
  const priorityClasses: Record<string, string> = {
    low: "border-[#DDE2EA] bg-[#F5F7FA] text-[#667085]",
    normal: "border-[#D8DBFF] bg-[#F3F4FF] text-[#000A57]",
    high: "border-[#F3D2B6] bg-[#FFF7EF] text-[#A9510D]",
    urgent: "border-[#F2C5C5] bg-[#FFF3F3] text-[#A52A2A]",
  };
  const ticketPriorityClasses: Record<string, string> = {
    low: "border-[#DDE2EA] bg-white text-[#667085]",
    normal: "border-[#D7DDF0] bg-[#F8F9FF] text-[#35416E]",
    high: "border-[#F0D2B5] bg-[#FFF8F1] text-[#9B530F]",
    urgent: "border-[#EFC6C6] bg-[#FFF5F5] text-[#A52A2A]",
  };
  const ticketStatusLabels: Record<string, string> = {
    new: "Novo",
    open: "Aberto",
    in_progress: "Em andamento",
    waiting_customer: "Aguardando cliente",
    resolved: "Resolvido",
    closed: "Fechado",
  };

  let calendarView: CalendarView = "month";
  let cursorDate = parseDateKey(data.calendarAnchor);
  let showTasks = data.canViewTasks;
  let showTickets = data.canViewTickets;
  let showGoogle = data.googleCalendar.connected;
  let draggingTicketId: string | null = null;
  let movingTicket = false;

  let createOpen = false;
  let createDate = data.calendarAnchor;
  let createProjectId = data.selectedProjectId ?? data.projects[0]?.id ?? "";
  let taskSyncGoogle = false;
  let taskGoogleAllDay = false;
  let taskGoogleStartTime = "09:00";
  let taskGoogleEndTime = "10:00";
  let taskGoogleMeet = false;

  let googleEventOpen = false;
  let googleEventDate = data.calendarAnchor;
  let googleEventAllDay = true;
  let googleEventStartTime = "09:00";
  let googleEventEndTime = "09:30";
  let googleEventMeet = false;
  let googleEventCreateAsTask = false;
  let googleEventProjectId = data.selectedProjectId ?? data.projects[0]?.id ?? "";
  let googleTimeZone = "UTC";

  onMount(() => {
    googleTimeZone = Intl.DateTimeFormat().resolvedOptions().timeZone || googleTimeZone;
  });

  function parseDateKey(value: string): Date {
    const [year, month, day] = value.split("-").map(Number);
    return new Date(year, month - 1, day);
  }

  function dateKey(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }

  function cloneDate(date: Date): Date {
    return new Date(date.getFullYear(), date.getMonth(), date.getDate());
  }

  function addDays(date: Date, amount: number): Date {
    const next = cloneDate(date);
    next.setDate(next.getDate() + amount);
    return next;
  }

  function startOfWeek(date: Date): Date {
    const next = cloneDate(date);
    const offset = (next.getDay() + 6) % 7;
    next.setDate(next.getDate() - offset);
    return next;
  }

  function startOfMonthGrid(date: Date): Date {
    return startOfWeek(new Date(date.getFullYear(), date.getMonth(), 1));
  }

  function tasksForDay(key: string) {
    return showTasks ? data.tasks.filter((task) => task.dueOn === key) : [];
  }

  function ticketsForDay(key: string) {
    return showTickets ? data.tickets.filter((ticket) => ticket.dueOn === key) : [];
  }

  function googleEventsForDay(key: string) {
    if (!showGoogle) return [];
    return data.googleEvents.filter((event) => {
      if (event.allDay && event.startDate) {
        return event.startDate <= key && (!event.endDate || key < event.endDate);
      }
      return event.startDateTime?.slice(0, 10) === key;
    });
  }

  function googleEventTime(event: PageData["googleEvents"][number]): string {
    if (event.allDay || !event.startDateTime) return "Dia inteiro";
    return new Intl.DateTimeFormat("pt-BR", {
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(event.startDateTime));
  }

  function formatDayNumber(date: Date): string {
    return String(date.getDate());
  }

  function formatModalDate(key: string): string {
    const [year, month, day] = key.split("-").map(Number);
    return new Intl.DateTimeFormat("pt-BR", {
      weekday: "long",
      day: "2-digit",
      month: "long",
      year: "numeric",
    }).format(new Date(year, month - 1, day));
  }

  function taskHref(taskId: string): string {
    return `/app/tasks/${taskId}`;
  }

  function ticketHref(ticketId: string): string {
    return `/app/tickets/${ticketId}`;
  }

  function taskLinkedToGoogle(taskId: string): boolean {
    return data.googleLinkedTaskIds.includes(taskId);
  }

  function taskHasMeet(taskId: string): boolean {
    return data.googleMeetTaskIds.includes(taskId);
  }

  function openCreate(date: Date): void {
    if (!data.canCreate || data.projects.length === 0) return;
    createDate = dateKey(date);
    createProjectId = data.selectedProjectId ?? data.projects[0]?.id ?? "";
    taskSyncGoogle = false;
    taskGoogleAllDay = false;
    taskGoogleStartTime = "09:00";
    taskGoogleEndTime = "10:00";
    taskGoogleMeet = false;
    createOpen = true;
  }

  function openGoogleEvent(date = cursorDate): void {
    if (!data.googleCalendar.connected) return;
    googleEventDate = dateKey(date);
    googleEventAllDay = true;
    googleEventStartTime = "09:00";
    googleEventEndTime = "09:30";
    googleEventMeet = false;
    googleEventCreateAsTask = false;
    googleEventProjectId = data.selectedProjectId ?? data.projects[0]?.id ?? "";
    googleEventOpen = true;
  }

  async function refreshCalendarData(): Promise<void> {
    const current = `${$page.url.pathname}${$page.url.search}`;
    await goto(current, {
      replaceState: true,
      noScroll: true,
      invalidateAll: true,
    });
  }

  function startTicketDrag(event: DragEvent, ticketId: string): void {
    if (!data.canChangeTicketDueOn || movingTicket) return;
    draggingTicketId = ticketId;
    event.dataTransfer?.setData("text/plain", ticketId);
    if (event.dataTransfer) event.dataTransfer.effectAllowed = "move";
  }

  function allowTicketDrop(event: DragEvent): void {
    if (!data.canChangeTicketDueOn || !draggingTicketId || movingTicket) return;
    event.preventDefault();
    if (event.dataTransfer) event.dataTransfer.dropEffect = "move";
  }

  async function dropTicketDueOn(event: DragEvent, dueOn: string): Promise<void> {
    event.preventDefault();
    if (!data.canChangeTicketDueOn || movingTicket) return;
    const ticketId = draggingTicketId ?? event.dataTransfer?.getData("text/plain") ?? "";
    const ticket = data.tickets.find((item) => item.id === ticketId);
    draggingTicketId = null;
    if (!ticket || ticket.dueOn === dueOn) return;

    movingTicket = true;
    try {
      const body = new FormData();
      body.set("ticketId", ticket.id);
      body.set("dueOn", dueOn);
      const response = await fetch("?/updateTicketDueOn", { method: "POST", body });
      if (!response.ok) {
        window.alert("Não foi possível alterar a conclusão planejada deste ticket.");
        return;
      }
      await refreshCalendarData();
    } finally {
      movingTicket = false;
    }
  }

  function navigateCalendar(next: Date): void {
    cursorDate = next;
    const url = new URL($page.url);
    url.searchParams.set("date", dateKey(next));
    url.searchParams.delete("google");
    void goto(`${url.pathname}${url.search}`);
  }

  function previousPeriod(): void {
    if (calendarView === "month") {
      navigateCalendar(new Date(cursorDate.getFullYear(), cursorDate.getMonth() - 1, 1));
    } else {
      navigateCalendar(addDays(cursorDate, -7));
    }
  }

  function nextPeriod(): void {
    if (calendarView === "month") {
      navigateCalendar(new Date(cursorDate.getFullYear(), cursorDate.getMonth() + 1, 1));
    } else {
      navigateCalendar(addDays(cursorDate, 7));
    }
  }

  function goToday(): void {
    navigateCalendar(new Date());
  }

  function changeProject(event: Event): void {
    const value = (event.currentTarget as HTMLSelectElement).value;
    const url = new URL($page.url);
    if (value) url.searchParams.set("project", value);
    else url.searchParams.delete("project");
    void goto(`${url.pathname}${url.search}`);
  }

  function googleStatusMessage(status: string): string {
    if (status === "connected") return "Google Calendar conectado. Os eventos da agenda principal já aparecem aqui.";
    if (status === "cancelled") return "A autorização do Google Calendar foi cancelada.";
    if (status === "invalid_state") return "A autorização do Google Calendar expirou. Tente conectar novamente.";
    if (status === "connect_failed" || status === "missing_code") return "Não foi possível concluir a conexão com o Google Calendar.";
    return "";
  }

  $: monthDays = Array.from({ length: 42 }, (_, index) => addDays(startOfMonthGrid(cursorDate), index));
  $: weekDays = Array.from({ length: 7 }, (_, index) => addDays(startOfWeek(cursorDate), index));
  $: visibleDays = calendarView === "month" ? monthDays : weekDays;
  $: selectedMembers = data.membersByProject[createProjectId] ?? [];
  $: googleEventMembers = data.membersByProject[googleEventProjectId] ?? [];
  $: unscheduledCount = data.tasks.filter((task) => !task.dueOn).length;
  $: periodLabel = calendarView === "month"
    ? new Intl.DateTimeFormat("pt-BR", { month: "long", year: "numeric" }).format(cursorDate)
    : `${new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "short" }).format(weekDays[0])} – ${new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "short", year: "numeric" }).format(weekDays[6])}`;
  $: oauthMessage = googleStatusMessage(data.googleStatus);
</script>

<svelte:head><title>Agenda | F10 Operations</title></svelte:head>

<ApplicationContent width="full" padding="none">
  <section class="min-h-[calc(100dvh-var(--application-header-height))] overflow-hidden border-b border-[#E1E4EB] bg-white">
    <header class="flex flex-col gap-3 border-b border-[#E8EAF0] px-3 py-3 lg:px-4 xl:flex-row xl:items-center xl:justify-between">
      <div class="flex min-w-0 flex-wrap items-center gap-2">
        <button type="button" on:click={goToday} class="application-text-caption h-9 rounded-lg border border-[#DDE1EA] px-3 font-semibold text-[#555C6D] hover:bg-[#F7F8FB]">Hoje</button>
        <div class="flex items-center rounded-lg border border-[#E2E5EB] bg-[#FAFAFC]">
          <button type="button" on:click={previousPeriod} class="flex h-9 w-9 items-center justify-center text-[#686E7E] hover:bg-[#F1F2F5]" aria-label="Período anterior"><ChevronLeft size={17}/></button>
          <button type="button" on:click={nextPeriod} class="flex h-9 w-9 items-center justify-center border-l border-[#E2E5EB] text-[#686E7E] hover:bg-[#F1F2F5]" aria-label="Próximo período"><ChevronRight size={17}/></button>
        </div>
        <h2 class="min-w-0 capitalize text-[16px] font-semibold text-[#202637]">{periodLabel}</h2>
      </div>

      <div class="flex flex-wrap items-center gap-2 xl:justify-end">
        {#if data.canViewTasks && data.projects.length > 0}
          <select value={data.selectedProjectId ?? ""} on:change={changeProject} class="application-text-caption h-9 max-w-[260px] rounded-lg border border-[#DDE1EA] bg-white px-3 font-semibold text-[#5F6575] outline-none focus:border-[#000A57]">
            <option value="">Todos os projetos</option>
            {#each data.projects as project}<option value={project.id}>{project.name}</option>{/each}
          </select>
        {/if}

        <div class="flex rounded-lg bg-[#EDEFF4] p-1">
          {#if data.canViewTasks}<button type="button" aria-pressed={showTasks} on:click={() => (showTasks = !showTasks)} class={`application-text-meta h-7 rounded-md px-2.5 font-semibold ${showTasks ? "bg-white text-[#000A57] shadow-sm" : "text-[#8A909E]"}`}>Tarefas</button>{/if}
          {#if data.canViewTickets}<button type="button" aria-pressed={showTickets} on:click={() => (showTickets = !showTickets)} class={`application-text-meta h-7 rounded-md px-2.5 font-semibold ${showTickets ? "bg-white text-[#8B4D12] shadow-sm" : "text-[#8A909E]"}`}>Tickets</button>{/if}
          {#if data.googleCalendar.connected}<button type="button" aria-pressed={showGoogle} on:click={() => (showGoogle = !showGoogle)} class={`application-text-meta h-7 rounded-md px-2.5 font-semibold ${showGoogle ? "bg-white text-[#2F7045] shadow-sm" : "text-[#8A909E]"}`}>Google</button>{/if}
        </div>

        <div class="flex rounded-lg bg-[#EDEFF4] p-1">
          <button type="button" on:click={() => (calendarView = "month")} class={`application-text-caption h-7 rounded-md px-3 font-semibold ${calendarView === "month" ? "bg-white text-[#000A57] shadow-sm" : "text-[#737989]"}`}>Mês</button>
          <button type="button" on:click={() => (calendarView = "week")} class={`application-text-caption h-7 rounded-md px-3 font-semibold ${calendarView === "week" ? "bg-white text-[#000A57] shadow-sm" : "text-[#737989]"}`}>Semana</button>
        </div>

        {#if data.googleCalendar.configured && !data.googleCalendar.connected}
          <a href="/app/tasks/calendar/google/connect" class="application-text-caption inline-flex h-9 items-center gap-2 rounded-lg border border-[#C9D0E0] bg-white px-3 font-semibold text-[#000A57]"><Link2 size={14}/>Conectar Google</a>
        {:else if data.googleCalendar.connected}
          <button type="button" on:click={() => openGoogleEvent()} class="application-text-caption inline-flex h-9 items-center gap-2 rounded-lg bg-[#000A57] px-3 font-semibold text-white"><Plus size={14}/>Novo evento</button>
          <details class="relative">
            <summary class="application-text-caption flex h-9 cursor-pointer list-none items-center gap-2 rounded-lg border border-[#D8DDF4] bg-[#F8F9FF] px-3 font-semibold text-[#000A57]"><Link2 size={13}/><span>Google</span><ChevronDown size={12}/></summary>
            <div class="absolute right-0 z-30 mt-2 w-[280px] rounded-xl border border-[#DDE1EA] bg-white p-3 shadow-[0_16px_45px_rgba(1,13,40,0.16)]">
              <span class="application-text-meta block font-semibold uppercase tracking-[0.08em] text-[#9A9FAC]">Conta conectada</span>
              <strong class="application-text-caption mt-1 block truncate text-[#303746]">{data.googleCalendar.googleEmail || "Google Calendar"}</strong>
              <form method="POST" action="?/disconnectGoogle" class="mt-3 border-t border-[#EEF0F4] pt-3" on:submit={(event) => { if (!confirm("Desconectar o Google Calendar deste usuário?")) event.preventDefault(); }}><button type="submit" class="application-text-meta inline-flex h-8 w-full items-center justify-center gap-2 rounded-lg border border-[#E7D1D1] bg-[#FFF8F8] font-semibold text-[#9B3C3C]"><Unplug size={12}/>Desconectar Google Calendar</button></form>
            </div>
          </details>
        {/if}
      </div>
    </header>

    {#if oauthMessage || data.googleCalendarError || form?.message}
      <div class="space-y-2 border-b border-[#E8EAF0] bg-[#FAFAFC] px-4 py-3">
        {#if oauthMessage}
          <div class={`rounded-xl border px-4 py-3 text-[11px] font-medium ${data.googleStatus === "connected" ? "border-[#B9E6C9] bg-[#F1FBF4] text-[#176B35]" : "border-[#F0D6BD] bg-[#FFF9F3] text-[#935018]"}`}>{oauthMessage}</div>
        {/if}
        {#if data.googleCalendarError}<div class="flex items-center gap-2 rounded-xl border border-[#F0D6BD] bg-[#FFF9F3] px-4 py-3 text-[11px] font-medium text-[#935018]"><CircleAlert size={16}/>{data.googleCalendarError}</div>{/if}
        {#if form?.message}
          <div class={`flex items-center gap-2 rounded-xl border px-4 py-3 text-[11px] font-medium ${form.syncWarning ? "border-[#F0D2A9] bg-[#FFF9EF] text-[#8A4B0F]" : form.success ? "border-[#B9E6C9] bg-[#F1FBF4] text-[#176B35]" : "border-[#F0C8C8] bg-[#FFF5F5] text-[#9B2C2C]"}`}>
            {#if !form.success || form.syncWarning}<CircleAlert size={16}/>{/if}{form.message}
          </div>
        {/if}
      </div>
    {/if}

    <div class="application-text-caption flex flex-wrap items-center justify-between gap-2 border-b border-[#E8EAF0] bg-[#FAFAFC] px-4 py-2 text-[#808695]">
      <div class="flex flex-wrap items-center gap-4">
        {#if data.canViewTasks}<span class="inline-flex items-center gap-2"><Clock3 size={14}/>{unscheduledCount} tarefa(s) sem prazo</span>{/if}
        {#if data.canViewTickets}<span class="inline-flex items-center gap-2"><Headphones size={13}/>{data.tickets.length} ticket(s) no período</span>{/if}
        {#if data.googleCalendar.connected}<span class="inline-flex items-center gap-2"><Link2 size={13}/>{data.googleEvents.length} evento(s) Google</span>{/if}
        {#if data.canChangeTicketDueOn}<span class="application-text-meta text-[#9A744F]">Arraste um Ticket para outro dia para alterar a conclusão planejada.</span>{/if}
      </div>
      {#if data.canViewTasks}<a href="/app/tasks/calendar/scheduling" class="application-text-caption font-semibold text-[#000A57] hover:underline">Links de agendamento</a>{/if}
    </div>

    {#if calendarView === "month"}
      <div class="overflow-x-auto">
        <div class="grid min-w-[880px] grid-cols-7 border-b border-[#E8EAF0] bg-[#FAFAFC]">
          {#each weekdayLabels as label}<div class="application-text-meta px-2 py-2.5 text-center font-bold uppercase tracking-[0.08em] text-[#858B99]">{label}</div>{/each}
        </div>
        <div class="grid min-w-[880px] grid-cols-7">
          {#each visibleDays as day}
            {@const key = dateKey(day)}
            {@const dayTasks = tasksForDay(key)}
            {@const dayTickets = ticketsForDay(key)}
            {@const dayGoogleEvents = googleEventsForDay(key)}
            {@const totalItems = dayTasks.length + dayTickets.length + dayGoogleEvents.length}
            {@const outsideMonth = day.getMonth() !== cursorDate.getMonth()}
            {@const isToday = key === dateKey(new Date())}
            <div
              role="group"
              aria-label={`Agenda de ${formatModalDate(key)}`}
              on:dragover={allowTicketDrop}
              on:drop={(event) => void dropTicketDueOn(event, key)}
              class={`group min-h-[150px] border-b border-r border-[#ECEEF3] p-2 transition ${outsideMonth ? "bg-[#FAFAFC]" : "bg-white hover:bg-[#FCFCFE]"} ${draggingTicketId ? "hover:bg-[#FFF8F1]" : ""}`}
            >
              {#if data.canCreate}
                <button type="button" on:click={() => openCreate(day)} class="flex w-full items-center justify-between rounded-lg px-1 py-0.5 text-left" aria-label={`Criar tarefa em ${formatModalDate(key)}`}>
                  <span class={`application-text-caption flex h-7 min-w-7 items-center justify-center rounded-full px-1 font-semibold ${isToday ? "bg-[#000A57] text-white" : outsideMonth ? "text-[#B1B5BF]" : "text-[#5D6372]"}`}>{formatDayNumber(day)}</span>
                  <Plus size={14} class="text-[#C0C4CE] opacity-0 transition group-hover:opacity-100"/>
                </button>
              {:else}
                <div class="flex w-full items-center justify-between rounded-lg px-1 py-0.5"><span class={`application-text-caption flex h-7 min-w-7 items-center justify-center rounded-full px-1 font-semibold ${isToday ? "bg-[#000A57] text-white" : outsideMonth ? "text-[#B1B5BF]" : "text-[#5D6372]"}`}>{formatDayNumber(day)}</span></div>
              {/if}
              <div class="mt-1 space-y-1">
                {#each dayGoogleEvents.slice(0, 1) as event}
                  {#if event.htmlLink}<a href={event.htmlLink} target="_blank" rel="noopener noreferrer" class="application-text-meta block truncate rounded-md border border-[#CFE0D5] bg-[#F1F8F3] px-2 py-1.5 font-semibold text-[#2F7045]" title={`${googleEventTime(event)} · ${event.summary}`}><span class="application-text-meta mr-1 font-bold">G</span>{#if event.meetUrl}<Video size={10} class="mr-1 inline"/>{/if}{googleEventTime(event)} · {event.summary}</a>{:else}<span class="application-text-meta block truncate rounded-md border border-[#CFE0D5] bg-[#F1F8F3] px-2 py-1.5 font-semibold text-[#2F7045]">G · {event.summary}</span>{/if}
                {/each}
                {#each dayTickets.slice(0, 2) as ticket}
                  <a
                    href={ticketHref(ticket.id)}
                    draggable={data.canChangeTicketDueOn}
                    on:dragstart={(event) => startTicketDrag(event, ticket.id)}
                    on:dragend={() => (draggingTicketId = null)}
                    class={`application-text-meta block truncate rounded-md border px-2 py-1.5 font-semibold transition hover:brightness-[0.98] ${ticketPriorityClasses[ticket.priority]}`}
                    title={`Ticket #${ticket.ticketNumber} · ${ticket.subject} · ${ticketStatusLabels[ticket.status] ?? ticket.status}`}
                  >T#{ticket.ticketNumber} · {ticket.subject}</a>
                {/each}
                {#each dayTasks.slice(0, 2) as task}
                  <a href={taskHref(task.id)} class={`application-text-meta block truncate rounded-md border px-2 py-1.5 font-semibold transition hover:brightness-[0.98] ${priorityClasses[task.priority]}`}>{#if taskLinkedToGoogle(task.id)}<span class="mr-1 font-bold text-[#2F7045]">G</span>{/if}{#if taskHasMeet(task.id)}<Video size={10} class="mr-1 inline text-[#214A9A]"/>{/if}{task.title}</a>
                {/each}
                {#if totalItems > 5}<span class="application-text-meta block px-1 font-semibold text-[#7C8291]">+ {totalItems - 5} item(ns)</span>{/if}
              </div>
            </div>
          {/each}
        </div>
      </div>
    {:else}
      <div class="overflow-x-auto">
        <div class="grid min-w-[880px] grid-cols-7">
          {#each visibleDays as day, index}
            {@const key = dateKey(day)}
            {@const dayTasks = tasksForDay(key)}
            {@const dayTickets = ticketsForDay(key)}
            {@const dayGoogleEvents = googleEventsForDay(key)}
            {@const isToday = key === dateKey(new Date())}
            <div
              role="group"
              aria-label={`Agenda de ${formatModalDate(key)}`}
              on:dragover={allowTicketDrop}
              on:drop={(event) => void dropTicketDueOn(event, key)}
              class={`min-h-[540px] border-r border-[#E8EAF0] ${index === 6 ? "border-r-0" : ""} ${draggingTicketId ? "hover:bg-[#FFF8F1]" : ""}`}
            >
              {#if data.canCreate}
                <button type="button" on:click={() => openCreate(day)} class="group flex w-full flex-col items-center border-b border-[#E8EAF0] px-2 py-3 hover:bg-[#FAFAFC]">
                  <span class="application-text-meta font-bold uppercase tracking-[0.08em] text-[#858B99]">{weekdayLabels[index]}</span>
                  <span class={`mt-1 flex h-9 min-w-9 items-center justify-center rounded-full px-1 text-[13px] font-semibold ${isToday ? "bg-[#000A57] text-white" : "text-[#303646]"}`}>{day.getDate()}</span>
                  <span class="application-text-meta mt-1 inline-flex items-center gap-1 font-semibold text-[#9A9FAC] opacity-0 transition group-hover:opacity-100"><Plus size={11}/>Adicionar tarefa</span>
                </button>
              {:else}
                <div class="flex w-full flex-col items-center border-b border-[#E8EAF0] px-2 py-3"><span class="application-text-meta font-bold uppercase tracking-[0.08em] text-[#858B99]">{weekdayLabels[index]}</span><span class={`mt-1 flex h-9 min-w-9 items-center justify-center rounded-full px-1 text-[13px] font-semibold ${isToday ? "bg-[#000A57] text-white" : "text-[#303646]"}`}>{day.getDate()}</span></div>
              {/if}
              <div class="space-y-2 p-2.5">
                {#each dayGoogleEvents as event}
                  <article class="rounded-xl border border-[#CFE0D5] bg-[#F1F8F3] p-3 text-[#2F7045] transition hover:shadow-sm">
                    <span class="application-text-meta font-bold uppercase tracking-[0.08em]">Google · {googleEventTime(event)}</span>
                    <strong class="application-text-caption mt-1 block font-semibold leading-4">{event.summary}</strong>
                    {#if event.location}<span class="application-text-meta mt-1 block truncate opacity-75">{event.location}</span>{/if}
                    <div class="mt-2 flex flex-wrap items-center gap-2">
                      {#if event.htmlLink}<a href={event.htmlLink} target="_blank" rel="noopener noreferrer" class="application-text-meta inline-flex items-center gap-1 font-semibold text-[#2F7045]">Evento <ExternalLink size={10}/></a>{/if}
                      {#if event.meetUrl}<a href={event.meetUrl} target="_blank" rel="noopener noreferrer" class="application-text-meta inline-flex items-center gap-1 rounded-md bg-[#214A9A] px-2 py-1 font-semibold text-white"><Video size={10}/>Entrar no Meet</a>{/if}
                    </div>
                  </article>
                {/each}
                {#each dayTickets as ticket}
                  <a
                    href={ticketHref(ticket.id)}
                    draggable={data.canChangeTicketDueOn}
                    on:dragstart={(event) => startTicketDrag(event, ticket.id)}
                    on:dragend={() => (draggingTicketId = null)}
                    class={`block rounded-xl border p-3 transition hover:shadow-sm ${ticketPriorityClasses[ticket.priority]}`}
                  ><span class="application-text-meta inline-flex items-center gap-1 font-bold uppercase tracking-[0.06em] opacity-70"><Headphones size={10}/>Ticket #{ticket.ticketNumber}</span><strong class="application-text-caption mt-1 block font-semibold leading-4">{ticket.subject}</strong><span class="application-text-meta mt-2 block truncate opacity-75">{ticketStatusLabels[ticket.status] ?? ticket.status} · {ticket.queueName}{ticket.assignedUserName ? ` · ${ticket.assignedUserName}` : ""}</span></a>
                {/each}
                {#each dayTasks as task}
                  <a href={taskHref(task.id)} class={`block rounded-xl border p-3 transition hover:shadow-sm ${priorityClasses[task.priority]}`}><span class="application-text-meta inline-flex items-center gap-1 font-bold uppercase tracking-[0.06em] opacity-70">Tarefa F10{taskLinkedToGoogle(task.id) ? " · Google" : ""}{#if taskHasMeet(task.id)}<Video size={10}/>{/if}</span><strong class="application-text-caption mt-1 block font-semibold leading-4">{task.title}</strong><span class="application-text-meta mt-2 block truncate opacity-75">{task.projectName}</span></a>
                {/each}
                {#if dayGoogleEvents.length === 0 && dayTickets.length === 0 && dayTasks.length === 0}
                  {#if data.canCreate}<button type="button" on:click={() => openCreate(day)} class="application-text-meta flex min-h-20 w-full items-center justify-center rounded-xl border border-dashed border-[#E1E4EA] text-[#A0A5B0] hover:border-[#C8CDD7] hover:bg-[#FAFAFC]">+ Criar tarefa</button>{:else}<div class="application-text-meta flex min-h-20 w-full items-center justify-center rounded-xl border border-dashed border-[#E1E4EA] text-[#A0A5B0]">Sem compromissos</div>{/if}
                {/if}
              </div>
            </div>
          {/each}
        </div>
      </div>
    {/if}
  </section>
</ApplicationContent>

{#if createOpen}
  <div class="fixed inset-0 z-[100] flex items-center justify-center p-4">
    <button type="button" class="absolute inset-0 bg-[#010D28]/30 backdrop-blur-[2px]" aria-label="Fechar criação de tarefa" on:click={() => (createOpen = false)}></button>
    <div class="relative z-10 max-h-[92vh] w-full max-w-[520px] overflow-y-auto rounded-[22px] border border-[#E0E3EA] bg-white shadow-[0_28px_90px_rgba(1,13,40,0.26)]" role="dialog" aria-modal="true" aria-label="Criar tarefa">
      <header class="sticky top-0 z-10 flex items-start justify-between gap-4 border-b border-[#EEF0F4] bg-white px-5 py-4"><div><span class="application-text-caption inline-flex items-center gap-2 font-bold uppercase tracking-[0.08em] text-[#EA6D0B]"><CalendarDays size={14}/>Nova tarefa F10</span><h2 class="mt-1 capitalize text-[15px] font-semibold text-[#202637]">{formatModalDate(createDate)}</h2></div><button type="button" on:click={() => (createOpen = false)} class="flex h-8 w-8 items-center justify-center rounded-lg text-[#8B909D] hover:bg-[#F3F4F7]" aria-label="Fechar"><X size={16}/></button></header>
      <form method="POST" action="?/createTask" use:enhance={() => { return async ({ result, update }) => { await update(); if (result.type === "success") { createOpen = false; await refreshCalendarData(); } }; }} class="space-y-4 p-5">
        <input type="hidden" name="dueOn" value={createDate}/>
        <input type="hidden" name="googleTimeZone" value={googleTimeZone}/>
        <label class="block"><span class="application-text-caption mb-1.5 block font-semibold text-[#565D6D]">Tarefa</span><input name="title" required minlength="3" maxlength="180" placeholder="O que precisa ser feito?" class="h-11 w-full rounded-xl border border-[#DDE1EA] px-3 text-[13px] outline-none focus:border-[#000A57] focus:ring-2 focus:ring-[#000A57]/10"/></label>
        <label class="block"><span class="application-text-caption mb-1.5 block font-semibold text-[#565D6D]">Projeto</span><select name="projectId" bind:value={createProjectId} required class="h-11 w-full rounded-xl border border-[#DDE1EA] bg-white px-3 text-[11px] outline-none focus:border-[#000A57]">{#each data.projects as project}<option value={project.id}>{project.name}</option>{/each}</select></label>
        <div class={`grid gap-3 ${data.canAssign ? "grid-cols-2" : "grid-cols-1"}`}><label class="block"><span class="application-text-caption mb-1.5 block font-semibold text-[#565D6D]">Prioridade</span><select name="priority" class="application-text-caption h-11 w-full rounded-xl border border-[#E1E4EA] bg-white px-2"><option value="normal">Normal</option><option value="low">Baixa</option><option value="high">Alta</option><option value="urgent">Urgente</option></select></label>{#if data.canAssign}<label class="block"><span class="application-text-caption mb-1.5 block font-semibold text-[#565D6D]">Responsável</span><select name="assigneeId" class="application-text-caption h-11 w-full rounded-xl border border-[#E1E4EA] bg-white px-2"><option value="">Atribuir a mim</option>{#each selectedMembers as member}<option value={member.id}>{member.name}</option>{/each}</select></label>{/if}</div>

        {#if data.googleCalendar.connected}
          <div class="rounded-xl border border-[#DDE7E1] bg-[#F8FBF9] p-3">
            <label class="flex cursor-pointer items-start gap-2"><input type="checkbox" name="syncGoogle" value="true" bind:checked={taskSyncGoogle} class="mt-0.5"/><span><strong class="application-text-caption block font-semibold text-[#2F7045]">Adicionar ao Google Calendar</strong><span class="application-text-meta mt-0.5 block leading-4 text-[#7A857D]">Cria um evento vinculado. Alterações futuras da tarefa no F10 atualizam esse evento.</span></span></label>
            {#if taskSyncGoogle}
              <div class="mt-3 space-y-3 border-t border-[#E3EAE5] pt-3">
                <label class="application-text-meta flex items-center gap-2 font-medium text-[#59635C]"><input type="checkbox" name="googleAllDay" value="true" bind:checked={taskGoogleAllDay}/>Dia inteiro</label>
                {#if !taskGoogleAllDay}
                  <div class="grid grid-cols-2 gap-2"><label><span class="application-text-meta mb-1 block font-semibold text-[#737C75]">Início</span><input type="time" name="googleStartTime" bind:value={taskGoogleStartTime} required class="application-text-caption h-9 w-full rounded-lg border border-[#DDE1EA] px-2"/></label><label><span class="application-text-meta mb-1 block font-semibold text-[#737C75]">Fim</span><input type="time" name="googleEndTime" bind:value={taskGoogleEndTime} required class="application-text-caption h-9 w-full rounded-lg border border-[#DDE1EA] px-2"/></label></div>
                {:else}
                  <input type="hidden" name="googleStartTime" value=""/><input type="hidden" name="googleEndTime" value=""/>
                {/if}
                <label class="flex cursor-pointer items-start gap-2 rounded-lg border border-[#DDE3F1] bg-white px-3 py-2"><input type="checkbox" name="googleMeet" value="true" bind:checked={taskGoogleMeet} class="mt-0.5"/><span><strong class="application-text-meta block font-semibold text-[#35445F]">Gerar Google Meet</strong><span class="application-text-meta mt-0.5 block text-[#7D8797]">Gera um link exclusivo para esta reunião.</span></span></label>
                <GoogleEventDetailsEditor
                  users={data.calendarUsers}
                  organizerUserId={data.organizerUserId}
                  organizerEmail={data.googleCalendar.googleEmail}
                  date={createDate}
                  startTime={taskGoogleStartTime}
                  endTime={taskGoogleEndTime}
                  timeZone={googleTimeZone}
                  allDay={taskGoogleAllDay}
                />
              </div>
            {/if}
          </div>
        {/if}

        <div class="flex items-center justify-between gap-3 pt-1"><span class="application-text-meta text-[#9297A4]">Prazo: {createDate.split("-").reverse().join("/")}</span><button type="submit" class="inline-flex h-11 items-center gap-2 rounded-xl bg-[#000A57] px-5 text-[11px] font-semibold text-white"><Plus size={15}/>Criar tarefa</button></div>
      </form>
    </div>
  </div>
{/if}

{#if googleEventOpen}
  <div class="fixed inset-0 z-[110] flex items-center justify-center p-4">
    <button type="button" class="absolute inset-0 bg-[#010D28]/30 backdrop-blur-[2px]" aria-label="Fechar criação de evento" on:click={() => (googleEventOpen = false)}></button>
    <div class="relative z-10 max-h-[92vh] w-full max-w-[560px] overflow-y-auto rounded-[22px] border border-[#E0E3EA] bg-white shadow-[0_28px_90px_rgba(1,13,40,0.26)]" role="dialog" aria-modal="true" aria-label="Novo evento no Google Calendar">
      <header class="sticky top-0 z-10 flex items-start justify-between gap-4 border-b border-[#EEF0F4] bg-white px-5 py-4"><div><span class="application-text-caption inline-flex items-center gap-2 font-bold uppercase tracking-[0.08em] text-[#2F7045]"><Link2 size={14}/>Google Calendar</span><h2 class="mt-1 text-[16px] font-semibold text-[#202637]">Novo evento</h2></div><button type="button" on:click={() => (googleEventOpen = false)} class="flex h-8 w-8 items-center justify-center rounded-lg text-[#8B909D] hover:bg-[#F3F4F7]" aria-label="Fechar"><X size={16}/></button></header>
      <form method="POST" action="?/createGoogleEvent" use:enhance={() => { return async ({ result, update }) => { await update(); if (result.type === "success") { googleEventOpen = false; await refreshCalendarData(); } }; }} class="space-y-4 p-5">
        <input type="hidden" name="timeZone" value={googleTimeZone}/>
        <label class="block"><span class="application-text-caption mb-1.5 block font-semibold text-[#565D6D]">Título</span><input name="title" required minlength={googleEventCreateAsTask ? 3 : 2} maxlength="180" placeholder="Ex.: Reunião com cliente" class="h-11 w-full rounded-xl border border-[#DDE1EA] px-3 text-[13px] outline-none focus:border-[#000A57]"/></label>
        <label class="block"><span class="application-text-caption mb-1.5 block font-semibold text-[#565D6D]">Data</span><input name="date" type="date" bind:value={googleEventDate} required class="h-11 w-full rounded-xl border border-[#DDE1EA] px-3 text-[11px]"/></label>
        <label class="application-text-caption flex items-center gap-2 rounded-xl border border-[#E7E9EF] bg-[#FAFAFC] px-3 py-3 font-semibold text-[#565D6D]"><input type="checkbox" name="allDay" value="true" bind:checked={googleEventAllDay}/>Evento de dia inteiro</label>
        {#if !googleEventAllDay}<div class="grid grid-cols-2 gap-3"><label class="block"><span class="application-text-caption mb-1.5 block font-semibold text-[#565D6D]">Início</span><input name="startTime" type="time" bind:value={googleEventStartTime} required class="h-11 w-full rounded-xl border border-[#DDE1EA] px-3 text-[11px]"/></label><label class="block"><span class="application-text-caption mb-1.5 block font-semibold text-[#565D6D]">Fim</span><input name="endTime" type="time" bind:value={googleEventEndTime} required class="h-11 w-full rounded-xl border border-[#DDE1EA] px-3 text-[11px]"/></label></div>{:else}<input type="hidden" name="startTime" value={googleEventStartTime}/><input type="hidden" name="endTime" value={googleEventEndTime}/>{/if}
        <label class="flex cursor-pointer items-start gap-2 rounded-xl border border-[#DDE3F1] bg-[#F8FAFF] px-3 py-3"><input type="checkbox" name="addGoogleMeet" value="true" bind:checked={googleEventMeet} class="mt-0.5"/><span><strong class="application-text-caption inline-flex items-center gap-1.5 font-semibold text-[#214A9A]"><Video size={14}/>Adicionar Google Meet</strong><span class="application-text-meta mt-0.5 block leading-4 text-[#7D8797]">O Google gera um link exclusivo e o anexa a este evento.</span></span></label>

        <GoogleEventDetailsEditor
          users={data.calendarUsers}
          organizerUserId={data.organizerUserId}
          organizerEmail={data.googleCalendar.googleEmail}
          date={googleEventDate}
          startTime={googleEventStartTime}
          endTime={googleEventEndTime}
          timeZone={googleTimeZone}
          allDay={googleEventAllDay}
        />

        <label class="block"><span class="application-text-caption mb-1.5 block font-semibold text-[#565D6D]">Descrição <span class="font-normal text-[#9A9FAC]">(opcional)</span></span><textarea name="description" maxlength="5000" rows="4" class="w-full resize-y rounded-xl border border-[#DDE1EA] px-3 py-3 text-[11px] leading-5"></textarea></label>

        {#if data.canCreate && data.projects.length > 0}
          <div class="rounded-xl border border-[#E2E5ED] bg-[#FAFAFC] p-3">
            <label class="flex cursor-pointer items-start gap-2"><input type="checkbox" name="createAsTask" value="true" bind:checked={googleEventCreateAsTask} class="mt-0.5"/><span><strong class="application-text-caption block font-semibold text-[#303747]">Criar também como tarefa F10</strong><span class="application-text-meta mt-0.5 block leading-4 text-[#828896]">O evento e a tarefa ficam vinculados. Alterações futuras da tarefa atualizam o evento.</span></span></label>
            {#if googleEventCreateAsTask}
              <div class="mt-3 grid gap-3 border-t border-[#E6E8EE] pt-3 sm:grid-cols-2">
                <label class="block sm:col-span-2"><span class="application-text-meta mb-1 block font-semibold text-[#6E7483]">Projeto</span><select name="projectId" bind:value={googleEventProjectId} required class="application-text-caption h-10 w-full rounded-lg border border-[#DDE1EA] bg-white px-2">{#each data.projects as project}<option value={project.id}>{project.name}</option>{/each}</select></label>
                <label class="block"><span class="application-text-meta mb-1 block font-semibold text-[#6E7483]">Prioridade</span><select name="priority" class="application-text-caption h-10 w-full rounded-lg border border-[#DDE1EA] bg-white px-2"><option value="normal">Normal</option><option value="low">Baixa</option><option value="high">Alta</option><option value="urgent">Urgente</option></select></label>
                {#if data.canAssign}<label class="block"><span class="application-text-meta mb-1 block font-semibold text-[#6E7483]">Responsável</span><select name="assigneeId" class="application-text-caption h-10 w-full rounded-lg border border-[#DDE1EA] bg-white px-2"><option value="">Atribuir a mim</option>{#each googleEventMembers as member}<option value={member.id}>{member.name}</option>{/each}</select></label>{/if}
              </div>
            {/if}
          </div>
        {/if}

        <div class="flex items-center justify-between gap-3"><span class="application-text-meta text-[#969BA7]">Agenda principal de {data.googleCalendar.googleEmail}. Convidados recebem atualização pelo Google.</span><button type="submit" class="inline-flex h-11 items-center gap-2 rounded-xl bg-[#2F7045] px-5 text-[11px] font-semibold text-white"><Plus size={15}/>{googleEventCreateAsTask ? "Criar evento + tarefa" : "Criar no Google"}</button></div>
      </form>
    </div>
  </div>
{/if}
