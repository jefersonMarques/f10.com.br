<script lang="ts">
  import { enhance } from "$app/forms";
  import { goto, invalidateAll } from "$app/navigation";
  import { page } from "$app/stores";
  import {
    CalendarDays,
    ChevronLeft,
    ChevronRight,
    CircleAlert,
    Clock3,
    Plus,
    Ticket,
    X,
  } from "lucide-svelte";
  import type { ActionData, PageData } from "./$types";

  export let data: PageData;
  export let form: ActionData;

  type CalendarView = "month" | "week";

  const weekdayLabels = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"];
  const priorityLabels: Record<string, string> = {
    low: "Baixa",
    normal: "Normal",
    high: "Alta",
    urgent: "Urgente",
  };
  const priorityClasses: Record<string, string> = {
    low: "border-[#DDE2EA] bg-[#F5F7FA] text-[#667085]",
    normal: "border-[#D8DBFF] bg-[#F3F4FF] text-[#000A57]",
    high: "border-[#F3D2B6] bg-[#FFF7EF] text-[#A9510D]",
    urgent: "border-[#F2C5C5] bg-[#FFF3F3] text-[#A52A2A]",
  };

  let calendarView: CalendarView = "month";
  let cursorDate = new Date();
  let createOpen = false;
  let createDate = dateKey(new Date());
  let createProjectId = data.selectedProjectId ?? data.projects[0]?.id ?? "";

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

  function taskHref(taskId: string, projectId: string): string {
    const params = new URLSearchParams();
    params.set("task", taskId);
    if (data.selectedProjectId || projectId) params.set("project", data.selectedProjectId ?? projectId);
    return `/app/tasks?${params.toString()}`;
  }

  function openCreate(date: Date): void {
    if (!data.canCreate || data.projects.length === 0) return;
    createDate = dateKey(date);
    createProjectId = data.selectedProjectId ?? data.projects[0]?.id ?? "";
    createOpen = true;
  }

  function previousPeriod(): void {
    if (calendarView === "month") {
      cursorDate = new Date(cursorDate.getFullYear(), cursorDate.getMonth() - 1, 1);
    } else {
      cursorDate = addDays(cursorDate, -7);
    }
  }

  function nextPeriod(): void {
    if (calendarView === "month") {
      cursorDate = new Date(cursorDate.getFullYear(), cursorDate.getMonth() + 1, 1);
    } else {
      cursorDate = addDays(cursorDate, 7);
    }
  }

  function goToday(): void {
    cursorDate = new Date();
  }

  function changeProject(event: Event): void {
    const value = (event.currentTarget as HTMLSelectElement).value;
    const url = new URL($page.url);
    if (value) url.searchParams.set("project", value);
    else url.searchParams.delete("project");
    void goto(`${url.pathname}${url.search}`);
  }

  $: monthDays = Array.from({ length: 42 }, (_, index) => addDays(startOfMonthGrid(cursorDate), index));
  $: weekDays = Array.from({ length: 7 }, (_, index) => addDays(startOfWeek(cursorDate), index));
  $: visibleDays = calendarView === "month" ? monthDays : weekDays;
  $: selectedMembers = data.membersByProject[createProjectId] ?? [];
  $: unscheduledCount = data.tasks.filter((task) => !task.dueOn).length;
  $: periodLabel = calendarView === "month"
    ? new Intl.DateTimeFormat("pt-BR", { month: "long", year: "numeric" }).format(cursorDate)
    : `${new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "short" }).format(weekDays[0])} – ${new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "short", year: "numeric" }).format(weekDays[6])}`;
</script>

<svelte:head><title>Calendário de tarefas | F10 Operations</title></svelte:head>

<div class="mx-auto max-w-[1560px] px-5 py-7 sm:px-8 sm:py-9">
  <div class="flex flex-col justify-between gap-5 xl:flex-row xl:items-end">
    <div>
      <p class="text-[11px] font-bold uppercase tracking-[0.14em] text-[#EA6D0B]">Planejamento</p>
      <h1 class="mt-2 text-[30px] font-semibold tracking-[-0.035em] text-[#010D28] sm:text-[38px]">Calendário</h1>
      <p class="mt-2 max-w-[760px] text-[14px] leading-6 text-[#6F7585]">Veja prazos por mês ou semana e crie tarefas diretamente no dia em que elas devem ser concluídas.</p>
    </div>

    <div class="flex flex-wrap items-center gap-2">
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

  {#if form?.message}
    <div class={`mt-5 flex items-center gap-2 rounded-xl border px-4 py-3 text-[11px] font-medium ${form.success ? "border-[#B9E6C9] bg-[#F1FBF4] text-[#176B35]" : "border-[#F0C8C8] bg-[#FFF5F5] text-[#9B2C2C]"}`}>
      {#if !form.success}<CircleAlert size={16}/>{/if}{form.message}
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
      <div class="flex items-center gap-2 text-[10px] text-[#808695]"><Clock3 size={14}/><span>{unscheduledCount} tarefa(s) sem prazo não aparecem no calendário.</span></div>
    </header>

    {#if calendarView === "month"}
      <div class="grid grid-cols-7 border-b border-[#E8EAF0] bg-[#FAFAFC]">
        {#each weekdayLabels as label}<div class="px-2 py-2.5 text-center text-[9px] font-bold uppercase tracking-[0.08em] text-[#858B99]">{label}</div>{/each}
      </div>
      <div class="grid min-w-[880px] grid-cols-7">
        {#each visibleDays as day}
          {@const key = dateKey(day)}
          {@const dayTasks = tasksForDay(key)}
          {@const outsideMonth = day.getMonth() !== cursorDate.getMonth()}
          {@const isToday = key === dateKey(new Date())}
          <div class={`group min-h-[142px] border-b border-r border-[#ECEEF3] p-2 transition ${outsideMonth ? "bg-[#FAFAFC]" : "bg-white hover:bg-[#FCFCFE]"}`}>
            <button type="button" on:click={() => openCreate(day)} class="flex w-full items-center justify-between rounded-lg px-1 py-0.5 text-left" aria-label={`Criar tarefa em ${formatModalDate(key)}`}>
              <span class={`flex h-7 min-w-7 items-center justify-center rounded-full px-1 text-[10px] font-semibold ${isToday ? "bg-[#000A57] text-white" : outsideMonth ? "text-[#B1B5BF]" : "text-[#5D6372]"}`}>{formatDayNumber(day)}</span>
              {#if data.canCreate}<Plus size={14} class="text-[#C0C4CE] opacity-0 transition group-hover:opacity-100"/>{/if}
            </button>
            <div class="mt-1 space-y-1">
              {#each dayTasks.slice(0, 4) as task}
                <a href={taskHref(task.id, task.projectId)} class={`block truncate rounded-md border px-2 py-1.5 text-[9px] font-semibold transition hover:brightness-[0.98] ${priorityClasses[task.priority]}`}>{task.title}</a>
              {/each}
              {#if dayTasks.length > 4}<span class="block px-1 text-[9px] font-semibold text-[#7C8291]">+ {dayTasks.length - 4} tarefa(s)</span>{/if}
            </div>
          </div>
        {/each}
      </div>
    {:else}
      <div class="grid min-w-[880px] grid-cols-7">
        {#each visibleDays as day, index}
          {@const key = dateKey(day)}
          {@const dayTasks = tasksForDay(key)}
          {@const isToday = key === dateKey(new Date())}
          <section class={`min-h-[540px] border-r border-[#E8EAF0] ${index === 6 ? "border-r-0" : ""}`}>
            <button type="button" on:click={() => openCreate(day)} class="group flex w-full flex-col items-center border-b border-[#E8EAF0] px-2 py-3 hover:bg-[#FAFAFC]">
              <span class="text-[9px] font-bold uppercase tracking-[0.08em] text-[#858B99]">{weekdayLabels[index]}</span>
              <span class={`mt-1 flex h-9 min-w-9 items-center justify-center rounded-full px-1 text-[13px] font-semibold ${isToday ? "bg-[#000A57] text-white" : "text-[#303646]"}`}>{day.getDate()}</span>
              {#if data.canCreate}<span class="mt-1 inline-flex items-center gap-1 text-[9px] font-semibold text-[#9A9FAC] opacity-0 transition group-hover:opacity-100"><Plus size={11}/>Adicionar</span>{/if}
            </button>
            <div class="space-y-2 p-2.5">
              {#each dayTasks as task}
                <a href={taskHref(task.id, task.projectId)} class={`block rounded-xl border p-3 transition hover:shadow-sm ${priorityClasses[task.priority]}`}>
                  <strong class="block text-[10px] font-semibold leading-4">{task.title}</strong>
                  <span class="mt-2 block truncate text-[9px] opacity-75">{task.projectName}</span>
                </a>
              {:else}
                <button type="button" on:click={() => openCreate(day)} class="flex min-h-20 w-full items-center justify-center rounded-xl border border-dashed border-[#E1E4EA] text-[9px] text-[#A0A5B0] hover:border-[#C8CDD7] hover:bg-[#FAFAFC]">{data.canCreate ? "+ Criar tarefa" : "Sem tarefas"}</button>
              {/each}
            </div>
          </section>
        {/each}
      </div>
    {/if}
  </section>
</div>

{#if createOpen}
  <div class="fixed inset-0 z-[100] flex items-center justify-center bg-[#010D28]/30 p-4 backdrop-blur-[2px]" role="presentation" on:click={() => (createOpen = false)}>
    <section class="w-full max-w-[430px] rounded-[22px] border border-[#E0E3EA] bg-white shadow-[0_28px_90px_rgba(1,13,40,0.26)]" role="dialog" aria-modal="true" aria-label="Criar tarefa" on:click|stopPropagation>
      <header class="flex items-start justify-between gap-4 border-b border-[#EEF0F4] px-5 py-4">
        <div><span class="inline-flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.08em] text-[#EA6D0B]"><CalendarDays size={14}/>Nova tarefa</span><h2 class="mt-1 capitalize text-[15px] font-semibold text-[#202637]">{formatModalDate(createDate)}</h2></div>
        <button type="button" on:click={() => (createOpen = false)} class="flex h-8 w-8 items-center justify-center rounded-lg text-[#8B909D] hover:bg-[#F3F4F7]" aria-label="Fechar"><X size={16}/></button>
      </header>

      <form
        method="POST"
        action="?/createTask"
        use:enhance={() => {
          return async ({ result, update }) => {
            await update();
            if (result.type === "success") {
              createOpen = false;
              await invalidateAll();
            }
          };
        }}
        class="space-y-4 p-5"
      >
        <input type="hidden" name="dueOn" value={createDate}/>

        <label class="block"><span class="mb-1.5 block text-[10px] font-semibold text-[#565D6D]">Tarefa</span><input name="title" required minlength="3" maxlength="180" autofocus placeholder="O que precisa ser feito?" class="h-11 w-full rounded-xl border border-[#DDE1EA] px-3 text-[13px] outline-none focus:border-[#000A57] focus:ring-2 focus:ring-[#000A57]/10"/></label>

        <label class="block"><span class="mb-1.5 block text-[10px] font-semibold text-[#565D6D]">Projeto</span><select name="projectId" bind:value={createProjectId} required class="h-11 w-full rounded-xl border border-[#DDE1EA] bg-white px-3 text-[11px] outline-none focus:border-[#000A57]">{#each data.projects as project}<option value={project.id}>{project.name}</option>{/each}</select></label>

        <div class={`grid gap-3 ${data.canAssign ? "grid-cols-2" : "grid-cols-1"}`}>
          <label class="block"><span class="mb-1.5 block text-[10px] font-semibold text-[#565D6D]">Prioridade</span><select name="priority" class="h-11 w-full rounded-xl border border-[#DDE1EA] bg-white px-3 text-[11px] outline-none focus:border-[#000A57]"><option value="normal">Normal</option><option value="low">Baixa</option><option value="high">Alta</option><option value="urgent">Urgente</option></select></label>
          {#if data.canAssign}<label class="block"><span class="mb-1.5 block text-[10px] font-semibold text-[#565D6D]">Responsável</span><select name="assigneeId" class="h-11 w-full rounded-xl border border-[#DDE1EA] bg-white px-3 text-[11px] outline-none focus:border-[#000A57]"><option value="">Atribuir a mim</option>{#each selectedMembers as member}<option value={member.id}>{member.name}</option>{/each}</select></label>{/if}
        </div>

        <div class="flex items-center justify-between gap-3 pt-1"><span class="text-[9px] text-[#9297A4]">Prazo: {createDate.split("-").reverse().join("/")}</span><button type="submit" class="inline-flex h-11 items-center gap-2 rounded-xl bg-[#000A57] px-5 text-[11px] font-semibold text-white"><Plus size={15}/>Criar tarefa</button></div>
      </form>
    </section>
  </div>
{/if}
