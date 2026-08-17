<script lang="ts">
  import { enhance } from "$app/forms";
  import { goto } from "$app/navigation";
  import { page } from "$app/stores";
  import { onMount } from "svelte";
  import {
    CalendarDays,
    ChevronLeft,
    ChevronRight,
    CircleAlert,
    Clock3,
    ExternalLink,
    Link2,
    Plus,
    Unplug,
    Video,
    X,
  } from "lucide-svelte";
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

  let calendarView: CalendarView = "month";
  let cursorDate = parseDateKey(data.calendarAnchor);
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
    return data.tasks.filter((task) => task.dueOn === key);
  }

  function googleEventsForDay(key: string) {
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

<svelte:head><title>Calendário | F10 Operations</title></svelte:head>

<div class="mx-auto max-w-[1560px] px-5 py-7 sm:px-8 sm:py-9">
  <div class="flex flex-col justify-between gap-5 xl:flex-row xl:items-end">
    <div>
      <p class="text-[11px] font-bold uppercase tracking-[0.14em] text-[#EA6D0B]">Planejamento</p>
      <h1 class="mt-2 text-[30px] font-semibold tracking-[-0.035em] text-[#010D28] sm:text-[38px]">Calendário</h1>
      <p class="mt-2 max-w-[800px] text-[14px] leading-6 text-[#6F7585]">Prazos das tarefas F10 e eventos da sua agenda Google no mesmo lugar.</p>
    </div>

    <div class="flex flex-wrap items-center gap-2">
      {#if data.googleCalendar.configured && !data.googleCalendar.connected}
        <a href="/app/tasks/calendar/google/connect" class="inline-flex h-11 items-center gap-2 rounded-xl border border-[#C9D0E0] bg-white px-4 text-[11px] font-semibold text-[#000A57] shadow-sm"><Link2 size={15}/>Conectar Google Calendar</a>
      {:else if data.googleCalendar.connected}
        <div class="inline-flex h-11 max-w-[270px] items-center gap-2 rounded-xl border border-[#D8DDF4] bg-[#F8F9FF] px-3 text-[10px] font-semibold text-[#000A57]"><Link2 size={14}/><span class="truncate">{data.googleCalendar.googleEmail || "Google Calendar conectado"}</span></div>
        <button type="button" on:click={() => openGoogleEvent()} class="inline-flex h-11 items-center gap-2 rounded-xl bg-[#000A57] px-4 text-[11px] font-semibold text-white"><Plus size={15}/>Novo evento</button>
        <form method="POST" action="?/disconnectGoogle" on:submit={(event) => { if (!confirm("Desconectar o Google Calendar deste usuário?")) event.preventDefault(); }}><button type="submit" class="inline-flex h-11 w-11 items-center justify-center rounded-xl border border-[#DDE1EA] bg-white text-[#777D8C]" aria-label="Desconectar Google Calendar"><Unplug size={15}/></button></form>
      {:else}
        <span class="inline-flex h-11 items-center rounded-xl border border-[#E4E6EC] bg-[#F7F8FA] px-3 text-[9px] font-semibold text-[#858B99]">Google Calendar não configurado</span>
      {/if}

      <select value={data.selectedProjectId ?? ""} on:change={changeProject} class="h-11 rounded-xl border border-[#DDE1EA] bg-white px-3 text-[11px] font-semibold text-[#5F6575] outline-none focus:border-[#000A57]">
        <option value="">Minhas tarefas · todos os projetos</option>
        {#each data.projects as project}<option value={project.id}>{project.name}</option>{/each}
      </select>
      <div class="flex rounded-xl bg-[#EDEFF4] p-1">
        <button type="button" on:click={() => (calendarView = "month")} class={`h-9 rounded-lg px-3 text-[11px] font-semibold ${calendarView === "month" ? "bg-white text-[#000A57] shadow-sm" : "text-[#737989]"}`}>Mês</button>
        <button type="button" on:click={() => (calendarView = "week")} class={`h-9 rounded-lg px-3 text-[11px] font-semibold ${calendarView === "week" ? "bg-white text-[#000A57] shadow-sm" : "text-[#737989]"}`}>Semana</button>
      </div>
    </div>
  </div>

  {#if oauthMessage}
    <div class={`mt-5 rounded-xl border px-4 py-3 text-[11px] font-medium ${data.googleStatus === "connected" ? "border-[#B9E6C9] bg-[#F1FBF4] text-[#176B35]" : "border-[#F0D6BD] bg-[#FFF9F3] text-[#935018]"}`}>{oauthMessage}</div>
  {/if}
  {#if data.googleCalendarError}<div class="mt-5 flex items-center gap-2 rounded-xl border border-[#F0D6BD] bg-[#FFF9F3] px-4 py-3 text-[11px] font-medium text-[#935018]"><CircleAlert size={16}/>{data.googleCalendarError}</div>{/if}
  {#if form?.message}
    <div class={`mt-5 flex items-center gap-2 rounded-xl border px-4 py-3 text-[11px] font-medium ${form.syncWarning ? "border-[#F0D2A9] bg-[#FFF9EF] text-[#8A4B0F]" : form.success ? "border-[#B9E6C9] bg-[#F1FBF4] text-[#176B35]" : "border-[#F0C8C8] bg-[#FFF5F5] text-[#9B2C2C]"}`}>
      {#if !form.success || form.syncWarning}<CircleAlert size={16}/>{/if}{form.message}
    </div>
  {/if}

  <section class="mt-7 overflow-hidden rounded-[24px] border border-[#E1E4EB] bg-white shadow-[0_8px_30px_rgba(1,13,40,0.04)]">
    <header class="flex flex-col gap-3 border-b border-[#E8EAF0] px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
      <div class="flex items-center gap-2">
        <button type="button" on:click={goToday} class="h-9 rounded-lg border border-[#DDE1EA] px-3 text-[10px] font-semibold text-[#555C6D] hover:bg-[#F7F8FB]">Hoje</button>
        <button type="button" on:click={previousPeriod} class="flex h-9 w-9 items-center justify-center rounded-lg text-[#686E7E] hover:bg-[#F5F6F9]" aria-label="Período anterior"><ChevronLeft size={17}/></button>
        <button type="button" on:click={nextPeriod} class="flex h-9 w-9 items-center justify-center rounded-lg text-[#686E7E] hover:bg-[#F5F6F9]" aria-label="Próximo período"><ChevronRight size={17}/></button>
        <h2 class="ml-1 capitalize text-[16px] font-semibold text-[#202637]">{periodLabel}</h2>
      </div>
      <div class="flex flex-wrap items-center gap-4 text-[10px] text-[#808695]"><span class="inline-flex items-center gap-2"><Clock3 size={14}/>{unscheduledCount} tarefa(s) sem prazo</span>{#if data.googleCalendar.connected}<span class="inline-flex items-center gap-2"><Link2 size={13}/>{data.googleEvents.length} evento(s) Google carregados</span>{/if}</div>
    </header>

    {#if calendarView === "month"}
      <div class="grid grid-cols-7 border-b border-[#E8EAF0] bg-[#FAFAFC]">
        {#each weekdayLabels as label}<div class="px-2 py-2.5 text-center text-[9px] font-bold uppercase tracking-[0.08em] text-[#858B99]">{label}</div>{/each}
      </div>
      <div class="grid min-w-[880px] grid-cols-7">
        {#each visibleDays as day}
          {@const key = dateKey(day)}
          {@const dayTasks = tasksForDay(key)}
          {@const dayGoogleEvents = googleEventsForDay(key)}
          {@const outsideMonth = day.getMonth() !== cursorDate.getMonth()}
          {@const isToday = key === dateKey(new Date())}
          <div class={`group min-h-[142px] border-b border-r border-[#ECEEF3] p-2 transition ${outsideMonth ? "bg-[#FAFAFC]" : "bg-white hover:bg-[#FCFCFE]"}`}>
            <button type="button" on:click={() => openCreate(day)} class="flex w-full items-center justify-between rounded-lg px-1 py-0.5 text-left" aria-label={`Criar tarefa em ${formatModalDate(key)}`}>
              <span class={`flex h-7 min-w-7 items-center justify-center rounded-full px-1 text-[10px] font-semibold ${isToday ? "bg-[#000A57] text-white" : outsideMonth ? "text-[#B1B5BF]" : "text-[#5D6372]"}`}>{formatDayNumber(day)}</span>
              {#if data.canCreate}<Plus size={14} class="text-[#C0C4CE] opacity-0 transition group-hover:opacity-100"/>{/if}
            </button>
            <div class="mt-1 space-y-1">
              {#each dayGoogleEvents.slice(0, 2) as event}
                {#if event.htmlLink}<a href={event.htmlLink} target="_blank" rel="noopener noreferrer" class="block truncate rounded-md border border-[#CFE0D5] bg-[#F1F8F3] px-2 py-1.5 text-[9px] font-semibold text-[#2F7045]" title={`${googleEventTime(event)} · ${event.summary}`}><span class="mr-1 text-[8px] font-bold">G</span>{#if event.meetUrl}<Video size={10} class="mr-1 inline"/>{/if}{googleEventTime(event)} · {event.summary}</a>{:else}<span class="block truncate rounded-md border border-[#CFE0D5] bg-[#F1F8F3] px-2 py-1.5 text-[9px] font-semibold text-[#2F7045]">G · {event.summary}</span>{/if}
              {/each}
              {#each dayTasks.slice(0, Math.max(1, 4 - Math.min(dayGoogleEvents.length, 2))) as task}
                <a href={taskHref(task.id)} class={`block truncate rounded-md border px-2 py-1.5 text-[9px] font-semibold transition hover:brightness-[0.98] ${priorityClasses[task.priority]}`}>{#if taskLinkedToGoogle(task.id)}<span class="mr-1 font-bold text-[#2F7045]">G</span>{/if}{#if taskHasMeet(task.id)}<Video size={10} class="mr-1 inline text-[#214A9A]"/>{/if}{task.title}</a>
              {/each}
              {#if dayGoogleEvents.length + dayTasks.length > 4}<span class="block px-1 text-[9px] font-semibold text-[#7C8291]">+ mais itens</span>{/if}
            </div>
          </div>
        {/each}
      </div>
    {:else}
      <div class="grid min-w-[880px] grid-cols-7">
        {#each visibleDays as day, index}
          {@const key = dateKey(day)}
          {@const dayTasks = tasksForDay(key)}
          {@const dayGoogleEvents = googleEventsForDay(key)}
          {@const isToday = key === dateKey(new Date())}
          <section class={`min-h-[540px] border-r border-[#E8EAF0] ${index === 6 ? "border-r-0" : ""}`}>
            <button type="button" on:click={() => openCreate(day)} class="group flex w-full flex-col items-center border-b border-[#E8EAF0] px-2 py-3 hover:bg-[#FAFAFC]">
              <span class="text-[9px] font-bold uppercase tracking-[0.08em] text-[#858B99]">{weekdayLabels[index]}</span>
              <span class={`mt-1 flex h-9 min-w-9 items-center justify-center rounded-full px-1 text-[13px] font-semibold ${isToday ? "bg-[#000A57] text-white" : "text-[#303646]"}`}>{day.getDate()}</span>
              {#if data.canCreate}<span class="mt-1 inline-flex items-center gap-1 text-[9px] font-semibold text-[#9A9FAC] opacity-0 transition group-hover:opacity-100"><Plus size={11}/>Adicionar tarefa</span>{/if}
            </button>
            <div class="space-y-2 p-2.5">
              {#each dayGoogleEvents as event}
                <article class="rounded-xl border border-[#CFE0D5] bg-[#F1F8F3] p-3 text-[#2F7045] transition hover:shadow-sm">
                  <span class="text-[8px] font-bold uppercase tracking-[0.08em]">Google · {googleEventTime(event)}</span>
                  <strong class="mt-1 block text-[10px] font-semibold leading-4">{event.summary}</strong>
                  {#if event.location}<span class="mt-1 block truncate text-[8px] opacity-75">{event.location}</span>{/if}
                  <div class="mt-2 flex flex-wrap items-center gap-2">
                    {#if event.htmlLink}<a href={event.htmlLink} target="_blank" rel="noopener noreferrer" class="inline-flex items-center gap-1 text-[8px] font-semibold text-[#2F7045]">Evento <ExternalLink size={10}/></a>{/if}
                    {#if event.meetUrl}<a href={event.meetUrl} target="_blank" rel="noopener noreferrer" class="inline-flex items-center gap-1 rounded-md bg-[#214A9A] px-2 py-1 text-[8px] font-semibold text-white"><Video size={10}/>Entrar no Meet</a>{/if}
                  </div>
                </article>
              {/each}
              {#each dayTasks as task}
                <a href={taskHref(task.id)} class={`block rounded-xl border p-3 transition hover:shadow-sm ${priorityClasses[task.priority]}`}><span class="inline-flex items-center gap-1 text-[8px] font-bold uppercase tracking-[0.06em] opacity-70">Tarefa F10{taskLinkedToGoogle(task.id) ? " · Google" : ""}{#if taskHasMeet(task.id)}<Video size={10}/>{/if}</span><strong class="mt-1 block text-[10px] font-semibold leading-4">{task.title}</strong><span class="mt-2 block truncate text-[9px] opacity-75">{task.projectName}</span></a>
              {/each}
              {#if dayGoogleEvents.length === 0 && dayTasks.length === 0}<button type="button" on:click={() => openCreate(day)} class="flex min-h-20 w-full items-center justify-center rounded-xl border border-dashed border-[#E1E4EA] text-[9px] text-[#A0A5B0] hover:border-[#C8CDD7] hover:bg-[#FAFAFC]">{data.canCreate ? "+ Criar tarefa" : "Sem compromissos"}</button>{/if}
            </div>
          </section>
        {/each}
      </div>
    {/if}
  </section>
</div>

{#if createOpen}
  <div class="fixed inset-0 z-[100] flex items-center justify-center bg-[#010D28]/30 p-4 backdrop-blur-[2px]" role="presentation" on:click={() => (createOpen = false)}>
    <section class="max-h-[92vh] w-full max-w-[520px] overflow-y-auto rounded-[22px] border border-[#E0E3EA] bg-white shadow-[0_28px_90px_rgba(1,13,40,0.26)]" role="dialog" aria-modal="true" aria-label="Criar tarefa" on:click|stopPropagation>
      <header class="sticky top-0 z-10 flex items-start justify-between gap-4 border-b border-[#EEF0F4] bg-white px-5 py-4"><div><span class="inline-flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.08em] text-[#EA6D0B]"><CalendarDays size={14}/>Nova tarefa F10</span><h2 class="mt-1 capitalize text-[15px] font-semibold text-[#202637]">{formatModalDate(createDate)}</h2></div><button type="button" on:click={() => (createOpen = false)} class="flex h-8 w-8 items-center justify-center rounded-lg text-[#8B909D] hover:bg-[#F3F4F7]" aria-label="Fechar"><X size={16}/></button></header>
      <form method="POST" action="?/createTask" use:enhance={() => { return async ({ result, update }) => { await update(); if (result.type === "success") { createOpen = false; await refreshCalendarData(); } }; }} class="space-y-4 p-5">
        <input type="hidden" name="dueOn" value={createDate}/>
        <input type="hidden" name="googleTimeZone" value={googleTimeZone}/>
        <label class="block"><span class="mb-1.5 block text-[10px] font-semibold text-[#565D6D]">Tarefa</span><input name="title" required minlength="3" maxlength="180" autofocus placeholder="O que precisa ser feito?" class="h-11 w-full rounded-xl border border-[#DDE1EA] px-3 text-[13px] outline-none focus:border-[#000A57] focus:ring-2 focus:ring-[#000A57]/10"/></label>
        <label class="block"><span class="mb-1.5 block text-[10px] font-semibold text-[#565D6D]">Projeto</span><select name="projectId" bind:value={createProjectId} required class="h-11 w-full rounded-xl border border-[#DDE1EA] bg-white px-3 text-[11px] outline-none focus:border-[#000A57]">{#each data.projects as project}<option value={project.id}>{project.name}</option>{/each}</select></label>
        <div class={`grid gap-3 ${data.canAssign ? "grid-cols-2" : "grid-cols-1"}`}><label class="block"><span class="mb-1.5 block text-[10px] font-semibold text-[#565D6D]">Prioridade</span><select name="priority" class="h-11 w-full rounded-xl border border-[#E1E4EA] bg-white px-2 text-[10px]"><option value="normal">Normal</option><option value="low">Baixa</option><option value="high">Alta</option><option value="urgent">Urgente</option></select></label>{#if data.canAssign}<label class="block"><span class="mb-1.5 block text-[10px] font-semibold text-[#565D6D]">Responsável</span><select name="assigneeId" class="h-11 w-full rounded-xl border border-[#E1E4EA] bg-white px-2 text-[10px]"><option value="">Atribuir a mim</option>{#each selectedMembers as member}<option value={member.id}>{member.name}</option>{/each}</select></label>{/if}</div>

        {#if data.googleCalendar.connected}
          <div class="rounded-xl border border-[#DDE7E1] bg-[#F8FBF9] p-3">
            <label class="flex cursor-pointer items-start gap-2"><input type="checkbox" name="syncGoogle" value="true" bind:checked={taskSyncGoogle} class="mt-0.5"/><span><strong class="block text-[10px] font-semibold text-[#2F7045]">Adicionar ao Google Calendar</strong><span class="mt-0.5 block text-[8px] leading-4 text-[#7A857D]">Cria um evento vinculado. Alterações futuras da tarefa no F10 atualizam esse evento.</span></span></label>
            {#if taskSyncGoogle}
              <div class="mt-3 space-y-3 border-t border-[#E3EAE5] pt-3">
                <label class="flex items-center gap-2 text-[9px] font-medium text-[#59635C]"><input type="checkbox" name="googleAllDay" value="true" bind:checked={taskGoogleAllDay}/>Dia inteiro</label>
                {#if !taskGoogleAllDay}
                  <div class="grid grid-cols-2 gap-2"><label><span class="mb-1 block text-[8px] font-semibold text-[#737C75]">Início</span><input type="time" name="googleStartTime" bind:value={taskGoogleStartTime} required class="h-9 w-full rounded-lg border border-[#DDE1EA] px-2 text-[10px]"/></label><label><span class="mb-1 block text-[8px] font-semibold text-[#737C75]">Fim</span><input type="time" name="googleEndTime" bind:value={taskGoogleEndTime} required class="h-9 w-full rounded-lg border border-[#DDE1EA] px-2 text-[10px]"/></label></div>
                {:else}
                  <input type="hidden" name="googleStartTime" value=""/><input type="hidden" name="googleEndTime" value=""/>
                {/if}
                <label class="flex cursor-pointer items-start gap-2 rounded-lg border border-[#DDE3F1] bg-white px-3 py-2"><input type="checkbox" name="googleMeet" value="true" bind:checked={taskGoogleMeet} class="mt-0.5"/><span><strong class="block text-[9px] font-semibold text-[#35445F]">Gerar Google Meet</strong><span class="mt-0.5 block text-[8px] text-[#7D8797]">Gera um link exclusivo para esta reunião.</span></span></label>
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

        <div class="flex items-center justify-between gap-3 pt-1"><span class="text-[9px] text-[#9297A4]">Prazo: {createDate.split("-").reverse().join("/")}</span><button type="submit" class="inline-flex h-11 items-center gap-2 rounded-xl bg-[#000A57] px-5 text-[11px] font-semibold text-white"><Plus size={15}/>Criar tarefa</button></div>
      </form>
    </section>
  </div>
{/if}

{#if googleEventOpen}
  <div class="fixed inset-0 z-[110] flex items-center justify-center bg-[#010D28]/30 p-4 backdrop-blur-[2px]" role="presentation" on:click={() => (googleEventOpen = false)}>
    <section class="max-h-[92vh] w-full max-w-[560px] overflow-y-auto rounded-[22px] border border-[#E0E3EA] bg-white shadow-[0_28px_90px_rgba(1,13,40,0.26)]" role="dialog" aria-modal="true" aria-label="Novo evento no Google Calendar" on:click|stopPropagation>
      <header class="sticky top-0 z-10 flex items-start justify-between gap-4 border-b border-[#EEF0F4] bg-white px-5 py-4"><div><span class="inline-flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.08em] text-[#2F7045]"><Link2 size={14}/>Google Calendar</span><h2 class="mt-1 text-[16px] font-semibold text-[#202637]">Novo evento</h2></div><button type="button" on:click={() => (googleEventOpen = false)} class="flex h-8 w-8 items-center justify-center rounded-lg text-[#8B909D] hover:bg-[#F3F4F7]" aria-label="Fechar"><X size={16}/></button></header>
      <form method="POST" action="?/createGoogleEvent" use:enhance={() => { return async ({ result, update }) => { await update(); if (result.type === "success") { googleEventOpen = false; await refreshCalendarData(); } }; }} class="space-y-4 p-5">
        <input type="hidden" name="timeZone" value={googleTimeZone}/>
        <label class="block"><span class="mb-1.5 block text-[10px] font-semibold text-[#565D6D]">Título</span><input name="title" required minlength={googleEventCreateAsTask ? 3 : 2} maxlength="180" placeholder="Ex.: Reunião com cliente" class="h-11 w-full rounded-xl border border-[#DDE1EA] px-3 text-[13px] outline-none focus:border-[#000A57]"/></label>
        <label class="block"><span class="mb-1.5 block text-[10px] font-semibold text-[#565D6D]">Data</span><input name="date" type="date" bind:value={googleEventDate} required class="h-11 w-full rounded-xl border border-[#DDE1EA] px-3 text-[11px]"/></label>
        <label class="flex items-center gap-2 rounded-xl border border-[#E7E9EF] bg-[#FAFAFC] px-3 py-3 text-[10px] font-semibold text-[#565D6D]"><input type="checkbox" name="allDay" value="true" bind:checked={googleEventAllDay}/>Evento de dia inteiro</label>
        {#if !googleEventAllDay}<div class="grid grid-cols-2 gap-3"><label class="block"><span class="mb-1.5 block text-[10px] font-semibold text-[#565D6D]">Início</span><input name="startTime" type="time" bind:value={googleEventStartTime} required class="h-11 w-full rounded-xl border border-[#DDE1EA] px-3 text-[11px]"/></label><label class="block"><span class="mb-1.5 block text-[10px] font-semibold text-[#565D6D]">Fim</span><input name="endTime" type="time" bind:value={googleEventEndTime} required class="h-11 w-full rounded-xl border border-[#DDE1EA] px-3 text-[11px]"/></label></div>{:else}<input type="hidden" name="startTime" value={googleEventStartTime}/><input type="hidden" name="endTime" value={googleEventEndTime}/>{/if}
        <label class="flex cursor-pointer items-start gap-2 rounded-xl border border-[#DDE3F1] bg-[#F8FAFF] px-3 py-3"><input type="checkbox" name="addGoogleMeet" value="true" bind:checked={googleEventMeet} class="mt-0.5"/><span><strong class="inline-flex items-center gap-1.5 text-[10px] font-semibold text-[#214A9A]"><Video size={14}/>Adicionar Google Meet</strong><span class="mt-0.5 block text-[8px] leading-4 text-[#7D8797]">O Google gera um link exclusivo e o anexa a este evento.</span></span></label>

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

        <label class="block"><span class="mb-1.5 block text-[10px] font-semibold text-[#565D6D]">Descrição <span class="font-normal text-[#9A9FAC]">(opcional)</span></span><textarea name="description" maxlength="5000" rows="4" class="w-full resize-y rounded-xl border border-[#DDE1EA] px-3 py-3 text-[11px] leading-5"></textarea></label>

        {#if data.canCreate && data.projects.length > 0}
          <div class="rounded-xl border border-[#E2E5ED] bg-[#FAFAFC] p-3">
            <label class="flex cursor-pointer items-start gap-2"><input type="checkbox" name="createAsTask" value="true" bind:checked={googleEventCreateAsTask} class="mt-0.5"/><span><strong class="block text-[10px] font-semibold text-[#303747]">Criar também como tarefa F10</strong><span class="mt-0.5 block text-[8px] leading-4 text-[#828896]">O evento e a tarefa ficam vinculados. Alterações futuras da tarefa atualizam o evento.</span></span></label>
            {#if googleEventCreateAsTask}
              <div class="mt-3 grid gap-3 border-t border-[#E6E8EE] pt-3 sm:grid-cols-2">
                <label class="block sm:col-span-2"><span class="mb-1 block text-[8px] font-semibold text-[#6E7483]">Projeto</span><select name="projectId" bind:value={googleEventProjectId} required class="h-10 w-full rounded-lg border border-[#DDE1EA] bg-white px-2 text-[10px]">{#each data.projects as project}<option value={project.id}>{project.name}</option>{/each}</select></label>
                <label class="block"><span class="mb-1 block text-[8px] font-semibold text-[#6E7483]">Prioridade</span><select name="priority" class="h-10 w-full rounded-lg border border-[#DDE1EA] bg-white px-2 text-[10px]"><option value="normal">Normal</option><option value="low">Baixa</option><option value="high">Alta</option><option value="urgent">Urgente</option></select></label>
                {#if data.canAssign}<label class="block"><span class="mb-1 block text-[8px] font-semibold text-[#6E7483]">Responsável</span><select name="assigneeId" class="h-10 w-full rounded-lg border border-[#DDE1EA] bg-white px-2 text-[10px]"><option value="">Atribuir a mim</option>{#each googleEventMembers as member}<option value={member.id}>{member.name}</option>{/each}</select></label>{/if}
              </div>
            {/if}
          </div>
        {/if}

        <div class="flex items-center justify-between gap-3"><span class="text-[8px] text-[#969BA7]">Agenda principal de {data.googleCalendar.googleEmail}. Convidados recebem atualização pelo Google.</span><button type="submit" class="inline-flex h-11 items-center gap-2 rounded-xl bg-[#2F7045] px-5 text-[11px] font-semibold text-white"><Plus size={15}/>{googleEventCreateAsTask ? "Criar evento + tarefa" : "Criar no Google"}</button></div>
      </form>
    </section>
  </div>
{/if}
