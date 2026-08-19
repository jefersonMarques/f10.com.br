<script lang="ts">
  import { enhance } from "$app/forms";
  import { invalidateAll } from "$app/navigation";
  import { page } from "$app/stores";
  import {
    CalendarDays,
    Check,
    CheckCircle2,
    ChevronRight,
    CircleAlert,
    Columns3,
    FolderKanban,
    GripVertical,
    List,
    MessageSquare,
    MoreHorizontal,
    Plus,
    Search,
    Settings,
    SlidersHorizontal,
    Ticket,
    X,
  } from "lucide-svelte";
  import ApplicationContent from "$lib/components/application/ApplicationContent.svelte";
  import MentionTextarea from "$lib/components/operations/MentionTextarea.svelte";
  import type { ActionData, PageData } from "./$types";

  export let data: PageData;
  export let form: ActionData;

  const priorityLabels: Record<string, string> = {
    low: "Baixa",
    normal: "Normal",
    high: "Alta",
    urgent: "Urgente",
  };

  const priorityClasses: Record<string, string> = {
    low: "bg-[#F1F4F8] text-[#667085]",
    normal: "bg-[#EEF0FF] text-[#000A57]",
    high: "bg-[#FFF4E9] text-[#A9510D]",
    urgent: "bg-[#FFF0F0] text-[#A52A2A]",
  };

  let newProjectOpen = false;
  let filterAssignee = "all";
  let filterPriority = "all";
  let filterOrigin = "all";
  let filterState = "open";
  let searchTerm = "";
  let draggingTaskId: string | null = null;
  let dragOverStatusId: string | null = null;
  let movingTask = false;

  function todayKey(): string {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const day = String(now.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }

  const today = todayKey();

  function taskHref(taskId: string): string {
    const params = new URLSearchParams($page.url.searchParams);
    params.set("task", taskId);
    return `/app/tasks?${params.toString()}`;
  }

  function closeTaskHref(): string {
    const params = new URLSearchParams($page.url.searchParams);
    params.delete("task");
    const query = params.toString();
    return query ? `/app/tasks?${query}` : "/app/tasks";
  }

  function projectHref(projectId: string, view: "list" | "board" = "list"): string {
    return `/app/tasks?project=${projectId}&view=${view}`;
  }

  function originsFor(taskId: string) {
    return data.ticketOriginsByTask[taskId] ?? [];
  }

  function formatDueDate(value: string | null): string {
    if (!value) return "Sem prazo";
    if (value === today) return "Hoje";
    const [year, month, day] = value.split("-");
    return `${day}/${month}/${year}`;
  }

  function dueClass(value: string | null, closed = false): string {
    if (closed || !value) return "text-[#7F8594]";
    if (value < today) return "text-[#B42318]";
    if (value === today) return "text-[#A9510D]";
    return "text-[#596071]";
  }

  function myTaskGroup(task: PageData["myTasks"][number]): string {
    if (task.statusClosed) return "completed";
    if (!task.dueOn) return "no_due";
    if (task.dueOn < today) return "overdue";
    if (task.dueOn === today) return "today";
    return "upcoming";
  }

  function matchesSearch(task: { title: string; description: string }): boolean {
    const query = searchTerm.trim().toLocaleLowerCase("pt-BR");
    if (!query) return true;
    return `${task.title} ${task.description}`.toLocaleLowerCase("pt-BR").includes(query);
  }

  $: filteredProjectTasks = (data.board?.tasks ?? []).filter((task) => {
    if (!matchesSearch(task)) return false;
    if (filterPriority !== "all" && task.priority !== filterPriority) return false;
    if (filterAssignee !== "all" && !task.assignees.some((assignee) => assignee.userId === filterAssignee)) return false;
    const hasTicket = originsFor(task.id).length > 0;
    if (filterOrigin === "ticket" && !hasTicket) return false;
    if (filterOrigin === "standalone" && hasTicket) return false;
    const status = data.board?.statuses.find((item) => item.id === task.statusId);
    if (filterState === "open" && status?.isClosed) return false;
    if (filterState === "closed" && !status?.isClosed) return false;
    return true;
  });

  $: filteredMyTasks = data.myTasks.filter((task) => matchesSearch(task));
  $: overdueTasks = filteredMyTasks.filter((task) => myTaskGroup(task) === "overdue");
  $: todayTasks = filteredMyTasks.filter((task) => myTaskGroup(task) === "today");
  $: upcomingTasks = filteredMyTasks.filter((task) => myTaskGroup(task) === "upcoming");
  $: noDueTasks = filteredMyTasks.filter((task) => myTaskGroup(task) === "no_due");
  $: completedTasks = filteredMyTasks.filter((task) => myTaskGroup(task) === "completed");

  function tasksForStatus(statusId: string) {
    return filteredProjectTasks.filter((task) => task.statusId === statusId);
  }

  function startDrag(event: DragEvent, taskId: string): void {
    if (!data.canUpdate) return;
    draggingTaskId = taskId;
    event.dataTransfer?.setData("text/plain", taskId);
    if (event.dataTransfer) event.dataTransfer.effectAllowed = "move";
  }

  function endDrag(): void {
    draggingTaskId = null;
    dragOverStatusId = null;
  }

  async function dropTask(event: DragEvent, statusId: string): Promise<void> {
    event.preventDefault();
    if (!data.canUpdate || movingTask) return;
    const taskId = draggingTaskId ?? event.dataTransfer?.getData("text/plain") ?? "";
    if (!taskId) return;

    const currentTask = data.board?.tasks.find((task) => task.id === taskId);
    if (!currentTask || currentTask.statusId === statusId) {
      endDrag();
      return;
    }

    movingTask = true;
    try {
      const body = new FormData();
      body.set("taskId", taskId);
      body.set("statusId", statusId);
      const response = await fetch("/app/tasks?/moveTask", { method: "POST", body });
      if (response.ok) await invalidateAll();
    } finally {
      movingTask = false;
      endDrag();
    }
  }

  function activityLabel(action: string): string {
    if (action === "task.created") return "criou a tarefa";
    if (action === "task.status.changed") return "alterou o status";
    if (action === "task.completed") return "concluiu a tarefa";
    if (action === "task.reopened") return "reabriu a tarefa";
    if (action === "task.details.updated") return "atualizou os detalhes";
    if (action === "task.assignee.changed") return "alterou o responsável";
    if (action === "task.comment.added") return "adicionou um comentário";
    return action;
  }

  function formatDateTime(value: string | Date): string {
    return new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" }).format(new Date(value));
  }
</script>

<svelte:head><title>Tarefas | F10 Operations</title></svelte:head>

<ApplicationContent width="full">
  {#if form?.message}
    <div class={`mb-3 flex items-start gap-3 rounded-2xl border px-4 py-3 text-[12px] font-medium ${form.success ? "border-[#B9E6C9] bg-[#F1FBF4] text-[#176B35]" : "border-[#F0C8C8] bg-[#FFF5F5] text-[#9B2C2C]"}`}>
      {#if form.success}<CheckCircle2 size={18} class="mt-0.5 shrink-0"/>{:else}<CircleAlert size={18} class="mt-0.5 shrink-0"/>{/if}<span>{form.message}</span>
    </div>
  {/if}

  <section class="overflow-hidden rounded-[22px] border border-[#E2E5ED] bg-white">
    <div class="flex flex-col gap-3 border-b border-[#EEF0F5] px-4 py-4 sm:px-5 lg:flex-row lg:items-center lg:justify-between">
      <nav class="flex min-w-0 gap-1 overflow-x-auto" aria-label="Escopo das tarefas">
        <a href="/app/tasks" class={`shrink-0 rounded-xl px-4 py-2.5 text-[12px] font-semibold transition ${data.mode === "mine" ? "bg-[#000A57] text-white" : "text-[#656B7B] hover:bg-[#F6F7FA] hover:text-[#000A57]"}`}>Minhas tarefas</a>
        {#each data.projects as project}
          <a href={projectHref(project.id)} class={`shrink-0 rounded-xl px-4 py-2.5 text-[12px] font-semibold transition ${project.id === data.selectedProjectId ? "bg-[#EEF0FF] text-[#000A57]" : "text-[#656B7B] hover:bg-[#F6F7FA] hover:text-[#000A57]"}`}>{project.name}</a>
        {/each}
      </nav>
      <div class="flex flex-wrap items-center gap-2">
        <label class="relative block min-w-[220px] lg:w-[300px]"><Search size={15} class="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#9499A5]"/><input bind:value={searchTerm} placeholder="Buscar tarefas" class="h-10 w-full rounded-xl border border-[#DDE1EA] bg-[#FAFAFC] pl-9 pr-3 text-[12px] outline-none focus:border-[#000A57] focus:bg-white"/></label>
        {#if data.canManage}<button type="button" on:click={() => (newProjectOpen = true)} class="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-[#DDE1EA] bg-white px-3 text-[11px] font-semibold text-[#000A57] transition hover:border-[#B9C0CF]"><Plus size={15}/>Novo projeto</button>{/if}
      </div>
    </div>

    {#if data.mode === "mine"}
      <div class="px-4 py-5 sm:px-5">
        <div class="flex items-start justify-between gap-4">
          <div><h2 class="text-[18px] font-semibold text-[#202637]">Minhas tarefas</h2><p class="mt-1 text-[11px] text-[#858A98]">Tudo que está atribuído a você, independente do projeto.</p></div>
          <span class="rounded-full bg-[#F4F5F8] px-3 py-1.5 text-[10px] font-semibold text-[#727887]">{data.myTasks.length} no total</span>
        </div>

        {#if filteredMyTasks.length === 0}
          <div class="mt-6 rounded-2xl border border-dashed border-[#D6DAE3] bg-[#FAFAFC] px-5 py-12 text-center"><CheckCircle2 size={30} class="mx-auto text-[#A9AFBC]"/><h3 class="mt-4 text-[14px] font-semibold text-[#444A59]">Nada por aqui</h3><p class="mt-1 text-[11px] text-[#8A909E]">Você não tem tarefas atribuídas que correspondam à busca.</p></div>
        {:else}
          <div class="mt-5 space-y-6">
            {#each [
              { key: "overdue", title: "Atrasadas", tasks: overdueTasks },
              { key: "today", title: "Hoje", tasks: todayTasks },
              { key: "upcoming", title: "Próximas", tasks: upcomingTasks },
              { key: "no_due", title: "Sem prazo", tasks: noDueTasks },
              { key: "completed", title: "Concluídas", tasks: completedTasks },
            ] as group}
              {#if group.tasks.length > 0}
                <section>
                  <header class="mb-2 flex items-center gap-2 px-2"><span class={`h-2 w-2 rounded-full ${group.key === "overdue" ? "bg-[#D92D20]" : group.key === "completed" ? "bg-[#2F9E5B]" : "bg-[#EA6D0B]"}`}></span><h3 class="text-[11px] font-bold uppercase tracking-[0.08em] text-[#6E7483]">{group.title}</h3><span class="text-[10px] text-[#A0A5B0]">{group.tasks.length}</span></header>
                  <div class="overflow-hidden rounded-xl border border-[#E7E9EF]">
                    {#each group.tasks as task}
                      <a href={taskHref(task.id)} class="grid min-h-12 grid-cols-[minmax(0,1fr)] items-center gap-2 border-b border-[#F0F1F4] px-3 py-2.5 transition last:border-b-0 hover:bg-[#F8F9FC] md:grid-cols-[minmax(260px,1.8fr)_minmax(130px,0.8fr)_110px_100px_minmax(130px,0.9fr)]">
                        <div class="flex min-w-0 items-center gap-3"><span class={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border ${task.statusClosed ? "border-[#A9D7B7] bg-[#EAF7EE] text-[#287645]" : "border-[#D5D9E2] text-transparent"}`}>{#if task.statusClosed}<Check size={13}/>{/if}</span><span class="min-w-0"><strong class={`block truncate text-[12px] font-semibold ${task.statusClosed ? "text-[#8B909C] line-through" : "text-[#2D3342]"}`}>{task.title}</strong>{#if originsFor(task.id).length > 0}<span class="mt-0.5 inline-flex items-center gap-1 text-[10px] font-medium text-[#000A57]"><Ticket size={11}/>Ticket #{originsFor(task.id)[0].ticketNumber}</span>{/if}</span></div>
                        <span class="truncate text-[11px] text-[#747A89]">{task.projectName}</span>
                        <span class={`text-[11px] font-medium ${dueClass(task.dueOn, task.statusClosed)}`}>{formatDueDate(task.dueOn)}</span>
                        <span class={`w-fit rounded-full px-2 py-1 text-[9px] font-bold ${priorityClasses[task.priority]}`}>{priorityLabels[task.priority]}</span>
                        <span class="truncate text-[10px] text-[#8B909D]">{task.statusName}</span>
                      </a>
                    {/each}
                  </div>
                </section>
              {/if}
            {/each}
          </div>
        {/if}
      </div>
    {:else if data.board}
      <div class="px-4 py-5 sm:px-5">
        <div class="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
          <div class="min-w-0"><div class="flex items-center gap-3"><span class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#EEF0FF] text-[#000A57]"><FolderKanban size={19}/></span><div class="min-w-0"><h2 class="truncate text-[18px] font-semibold text-[#202637]">{data.board.project.name}</h2>{#if data.board.project.description}<p class="mt-1 max-w-[760px] text-[11px] leading-5 text-[#858A98]">{data.board.project.description}</p>{/if}</div></div></div>
          <div class="flex flex-wrap items-center gap-2">
            <div class="flex rounded-xl bg-[#F3F4F7] p-1"><a href={projectHref(data.board.project.id, "list")} class={`inline-flex h-9 items-center gap-2 rounded-lg px-3 text-[11px] font-semibold ${data.view === "list" ? "bg-white text-[#000A57] shadow-sm" : "text-[#777D8C]"}`}><List size={15}/>Lista</a><a href={projectHref(data.board.project.id, "board")} class={`inline-flex h-9 items-center gap-2 rounded-lg px-3 text-[11px] font-semibold ${data.view === "board" ? "bg-white text-[#000A57] shadow-sm" : "text-[#777D8C]"}`}><Columns3 size={15}/>Quadro</a></div>
            {#if data.canManage}<a href={`/app/tasks/projects/${data.board.project.id}/settings`} class="inline-flex h-11 items-center gap-2 rounded-xl border border-[#DDE1EA] px-3 text-[11px] font-semibold text-[#626879] hover:border-[#BFC5D2] hover:text-[#000A57]"><Settings size={15}/>Configurações</a>{/if}
          </div>
        </div>

        <div class="mt-5 flex flex-wrap items-center gap-2 rounded-2xl border border-[#E8EAF0] bg-[#FAFAFC] p-3">
          <span class="inline-flex items-center gap-2 px-1 text-[10px] font-bold uppercase tracking-[0.08em] text-[#777D8C]"><SlidersHorizontal size={14}/>Filtros</span>
          <select bind:value={filterState} class="h-9 rounded-lg border border-[#DDE1EA] bg-white px-2 text-[10px]"><option value="open">Abertas</option><option value="all">Todas</option><option value="closed">Concluídas</option></select>
          <select bind:value={filterAssignee} class="h-9 rounded-lg border border-[#DDE1EA] bg-white px-2 text-[10px]"><option value="all">Todos responsáveis</option>{#each data.members as member}<option value={member.id}>{member.name}</option>{/each}</select>
          <select bind:value={filterPriority} class="h-9 rounded-lg border border-[#DDE1EA] bg-white px-2 text-[10px]"><option value="all">Todas prioridades</option><option value="urgent">Urgente</option><option value="high">Alta</option><option value="normal">Normal</option><option value="low">Baixa</option></select>
          <select bind:value={filterOrigin} class="h-9 rounded-lg border border-[#DDE1EA] bg-white px-2 text-[10px]"><option value="all">Todas origens</option><option value="ticket">Vindas de ticket</option><option value="standalone">Sem ticket</option></select>
          <span class="ml-auto rounded-full bg-white px-3 py-1.5 text-[10px] font-semibold text-[#777D8D] shadow-sm">{filteredProjectTasks.length} tarefa(s)</span>
        </div>

        {#if data.canCreate}
          <form use:enhance method="POST" action="?/createTask" class={`mt-4 grid gap-2 rounded-2xl border border-dashed border-[#CDD2DD] bg-white p-3 ${data.canAssign ? "md:grid-cols-[minmax(220px,1.6fr)_150px_135px_150px_auto]" : "md:grid-cols-[minmax(220px,1.6fr)_135px_150px_auto]"}`}>
            <input type="hidden" name="projectId" value={data.board.project.id}/>
            <input name="title" required minlength="3" maxlength="180" placeholder="+ Adicionar tarefa" class="h-10 min-w-0 rounded-xl border border-transparent bg-[#F8F9FB] px-3 text-[12px] font-medium outline-none focus:border-[#000A57] focus:bg-white"/>
            {#if data.canAssign}<select name="assigneeId" class="h-10 rounded-xl border border-[#E1E4EA] bg-white px-2 text-[10px]"><option value="">Atribuir a mim</option>{#each data.members as member}<option value={member.id}>{member.name}</option>{/each}</select>{/if}
            <input name="dueOn" type="date" class="h-10 rounded-xl border border-[#E1E4EA] bg-white px-2 text-[10px]"/>
            <select name="priority" class="h-10 rounded-xl border border-[#E1E4EA] bg-white px-2 text-[10px]"><option value="normal">Normal</option><option value="low">Baixa</option><option value="high">Alta</option><option value="urgent">Urgente</option></select>
            <button type="submit" class="h-10 rounded-xl bg-[#000A57] px-4 text-[11px] font-semibold text-white">Adicionar</button>
          </form>
        {/if}

        {#if data.view === "list"}
          <div class="mt-5 overflow-hidden rounded-2xl border border-[#E3E6ED]">
            <div class="hidden grid-cols-[minmax(300px,1.8fr)_140px_130px_110px_150px_40px] gap-2 border-b border-[#E8EAF0] bg-[#F8F9FB] px-4 py-3 text-[9px] font-bold uppercase tracking-[0.08em] text-[#8A909E] md:grid"><span>Tarefa</span><span>Responsável</span><span>Prazo</span><span>Prioridade</span><span>Status</span><span></span></div>
            {#each filteredProjectTasks as task}
              <a href={taskHref(task.id)} class="grid min-h-14 grid-cols-[minmax(0,1fr)] items-center gap-2 border-b border-[#EEF0F4] px-4 py-3 transition last:border-b-0 hover:bg-[#F8F9FC] md:grid-cols-[minmax(300px,1.8fr)_140px_130px_110px_150px_40px]">
                <div class="min-w-0"><strong class="block truncate text-[12px] font-semibold text-[#2D3342]">{task.title}</strong>{#if originsFor(task.id).length > 0}<span class="mt-1 inline-flex items-center gap-1 text-[10px] font-medium text-[#000A57]"><Ticket size={11}/>Ticket #{originsFor(task.id)[0].ticketNumber}</span>{/if}</div>
                <span class="truncate text-[10px] text-[#686E7E]">{task.assignees[0]?.name ?? "Sem responsável"}</span>
                <span class={`text-[10px] font-medium ${dueClass(task.dueOn)}`}>{formatDueDate(task.dueOn)}</span>
                <span class={`w-fit rounded-full px-2 py-1 text-[9px] font-bold ${priorityClasses[task.priority]}`}>{priorityLabels[task.priority]}</span>
                <span class="truncate text-[10px] text-[#737988]">{data.board.statuses.find((status) => status.id === task.statusId)?.name ?? ""}</span>
                <ChevronRight size={15} class="text-[#A0A5B0]"/>
              </a>
            {:else}
              <div class="px-5 py-12 text-center"><Search size={26} class="mx-auto text-[#B1B6C1]"/><p class="mt-3 text-[11px] text-[#8A909E]">Nenhuma tarefa corresponde aos filtros.</p></div>
            {/each}
          </div>
        {:else}
          {#if data.canUpdate}<p class="mt-4 text-[10px] font-medium text-[#7D8392]">Arraste os cards entre as colunas para atualizar o status.</p>{/if}
          <div class="mt-4 overflow-x-auto pb-3">
            <div class="grid min-w-[940px] gap-4" style={`grid-template-columns: repeat(${Math.max(data.board.statuses.length, 1)}, minmax(290px, 1fr));`}>
              {#each data.board.statuses as status}
                <section
                  class={`min-h-[260px] rounded-[20px] border p-3 transition ${dragOverStatusId === status.id ? "border-[#000A57] bg-[#EEF0FF]" : "border-[#E0E3EB] bg-[#F8F9FB]"}`}
                  on:dragover|preventDefault={() => (dragOverStatusId = status.id)}
                  on:dragleave={() => { if (dragOverStatusId === status.id) dragOverStatusId = null; }}
                  on:drop={(event) => void dropTask(event, status.id)}
                >
                  <header class="flex items-center justify-between gap-3 px-1 pb-3"><div class="flex items-center gap-2"><span class={`h-2.5 w-2.5 rounded-full ${status.isClosed ? "bg-[#4F9B67]" : "bg-[#EA6D0B]"}`}></span><h3 class="text-[12px] font-semibold text-[#3A4050]">{status.name}</h3></div><span class="rounded-full bg-white px-2 py-1 text-[9px] font-semibold text-[#858B99] shadow-sm">{tasksForStatus(status.id).length}</span></header>
                  <div class="space-y-3">
                    {#each tasksForStatus(status.id) as task (task.id)}
                      <article
                        draggable={data.canUpdate}
                        on:dragstart={(event) => startDrag(event, task.id)}
                        on:dragend={endDrag}
                        class={`group rounded-2xl border bg-white p-4 shadow-[0_5px_18px_rgba(1,13,40,0.04)] transition ${draggingTaskId === task.id ? "border-[#000A57] opacity-60" : "border-[#E2E5EC] hover:border-[#C9CEDA]"}`}
                      >
                        <div class="flex items-start gap-2">{#if data.canUpdate}<GripVertical size={15} class="mt-0.5 shrink-0 cursor-grab text-[#C0C5CF] group-hover:text-[#7B8190]"/>{/if}<a href={taskHref(task.id)} class="min-w-0 flex-1"><div class="flex items-start justify-between gap-3"><h4 class="text-[12px] font-semibold leading-5 text-[#252B3B]">{task.title}</h4><span class={`shrink-0 rounded-full px-2 py-1 text-[8px] font-bold uppercase tracking-[0.05em] ${priorityClasses[task.priority]}`}>{priorityLabels[task.priority]}</span></div>{#if task.description}<p class="mt-2 line-clamp-2 text-[10px] leading-5 text-[#7B8190]">{task.description}</p>{/if}</a></div>
                        <div class="mt-4 flex flex-wrap items-center gap-2">{#if task.dueOn}<span class={`inline-flex items-center gap-1.5 rounded-lg bg-[#F5F6F9] px-2 py-1.5 text-[9px] font-medium ${dueClass(task.dueOn, status.isClosed)}`}><CalendarDays size={12}/>{formatDueDate(task.dueOn)}</span>{/if}{#if task.assignees[0]}<span class="rounded-lg bg-[#EEF0FF] px-2 py-1.5 text-[9px] font-medium text-[#000A57]">{task.assignees[0].name}</span>{/if}{#if originsFor(task.id).length > 0}<span class="inline-flex items-center gap-1 rounded-lg bg-[#FFF4E9] px-2 py-1.5 text-[9px] font-medium text-[#A9510D]"><Ticket size={11}/>#{originsFor(task.id)[0].ticketNumber}</span>{/if}</div>
                      </article>
                    {/each}
                    {#if tasksForStatus(status.id).length === 0}<div class="rounded-2xl border border-dashed border-[#D6DAE3] bg-white/50 px-4 py-10 text-center text-[10px] text-[#9A9FAC]">Solte uma tarefa aqui</div>{/if}
                  </div>
                </section>
              {/each}
            </div>
          </div>
        {/if}
      </div>
    {/if}
  </section>
</ApplicationContent>

{#if newProjectOpen}
  <div class="fixed inset-0 z-[80] flex items-center justify-center bg-[#010D28]/35 p-4" role="presentation" on:click={() => (newProjectOpen = false)}>
    <section class="w-full max-w-[620px] rounded-[24px] border border-[#E1E4EC] bg-white p-5 shadow-2xl sm:p-6" role="dialog" aria-modal="true" aria-label="Novo projeto" on:click|stopPropagation>
      <div class="flex items-start justify-between gap-4"><div><h2 class="text-[18px] font-semibold text-[#202637]">Novo projeto</h2><p class="mt-1 text-[11px] text-[#858A98]">Crie o espaço de trabalho e escolha os integrantes iniciais.</p></div><button type="button" on:click={() => (newProjectOpen = false)} class="flex h-9 w-9 items-center justify-center rounded-xl text-[#7F8594] hover:bg-[#F4F5F8]" aria-label="Fechar"><X size={17}/></button></div>
      <form method="POST" action="?/createProject" class="mt-5 space-y-4">
        <label class="block"><span class="mb-1.5 block text-[11px] font-semibold text-[#4A5060]">Nome</span><input name="name" required maxlength="120" class="h-11 w-full rounded-xl border border-[#DDE1EA] px-3 text-[13px] outline-none focus:border-[#000A57]"/></label>
        <label class="block"><span class="mb-1.5 block text-[11px] font-semibold text-[#4A5060]">Descrição</span><textarea name="description" maxlength="1000" rows="3" class="w-full resize-y rounded-xl border border-[#DDE1EA] px-3 py-3 text-[12px] leading-5 outline-none focus:border-[#000A57]"></textarea></label>
        {#if data.activeUsers.length > 0}<fieldset><legend class="text-[11px] font-semibold text-[#4A5060]">Integrantes</legend><div class="mt-2 grid max-h-48 gap-2 overflow-y-auto rounded-xl border border-[#E7E9EF] p-2 sm:grid-cols-2">{#each data.activeUsers as user}<label class="flex items-center gap-2 rounded-lg px-2 py-2 text-[11px] text-[#555B69] hover:bg-[#F7F8FB]"><input type="checkbox" name="memberIds" value={user.id}/><span class="truncate">{user.name}</span></label>{/each}</div></fieldset>{/if}
        <button type="submit" class="min-h-11 w-full rounded-xl bg-[#000A57] px-5 text-[12px] font-semibold text-white">Criar projeto</button>
      </form>
    </section>
  </div>
{/if}

{#if data.selectedTask}
  <div class="fixed inset-0 z-[75] bg-[#010D28]/25" role="presentation">
    <a href={closeTaskHref()} class="absolute inset-0" aria-label="Fechar detalhes da tarefa"></a>
    <aside class="absolute inset-y-0 right-0 z-10 w-full max-w-[620px] overflow-y-auto border-l border-[#DDE1EA] bg-white shadow-[-18px_0_55px_rgba(1,13,40,0.16)]" aria-label="Detalhes da tarefa">
      <div class="sticky top-0 z-20 flex items-center justify-between border-b border-[#EEF0F5] bg-white/95 px-5 py-4 backdrop-blur"><div class="flex min-w-0 items-center gap-3"><span class="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#EEF0FF] text-[#000A57]"><CheckCircle2 size={17}/></span><div class="min-w-0"><span class="block text-[9px] font-bold uppercase tracking-[0.08em] text-[#EA6D0B]">{data.selectedTask.details.task.projectName}</span><strong class="block truncate text-[13px] text-[#2D3342]">Detalhes da tarefa</strong></div></div><a href={closeTaskHref()} class="flex h-9 w-9 items-center justify-center rounded-xl text-[#747A89] hover:bg-[#F4F5F8]" aria-label="Fechar"><X size={18}/></a></div>

      <div class="space-y-6 p-5 sm:p-6">
        {#if data.selectedTask.ticketOrigins.length > 0}
          <div class="rounded-2xl border border-[#F0D6BD] bg-[#FFF9F3] p-4"><div class="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.08em] text-[#A9510D]"><Ticket size={14}/>Origem do suporte</div>{#each data.selectedTask.ticketOrigins as origin}<a href={`/app/tickets/${origin.id}`} class="mt-2 flex items-center justify-between gap-3 rounded-xl bg-white px-3 py-2.5 text-[11px] font-semibold text-[#000A57] shadow-sm"><span class="truncate">Ticket #{origin.ticketNumber} · {origin.subject}</span><ChevronRight size={14}/></a>{/each}</div>
        {/if}

        {#if data.canUpdate}
          <form use:enhance method="POST" action="?/toggleComplete">
            <input type="hidden" name="taskId" value={data.selectedTask.details.task.id}/>
            <input type="hidden" name="completed" value={data.selectedTask.details.task.statusClosed ? "false" : "true"}/>
            <button type="submit" class={`inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl px-4 text-[11px] font-semibold ${data.selectedTask.details.task.statusClosed ? "border border-[#DDE1EA] bg-white text-[#000A57]" : "bg-[#2F7045] text-white"}`}><CheckCircle2 size={16}/>{data.selectedTask.details.task.statusClosed ? "Reabrir tarefa" : "Concluir tarefa"}</button>
          </form>
        {/if}

        <form use:enhance method="POST" action="?/updateTask" class="space-y-4">
          <input type="hidden" name="taskId" value={data.selectedTask.details.task.id}/>
          <label class="block"><span class="mb-1.5 block text-[10px] font-semibold text-[#555B69]">Título</span><input name="title" required maxlength="180" value={data.selectedTask.details.task.title} disabled={!data.canUpdate} class="h-11 w-full rounded-xl border border-[#DDE1EA] px-3 text-[14px] font-semibold text-[#202637] outline-none focus:border-[#000A57] disabled:bg-[#FAFAFC]"/></label>
          <label class="block"><span class="mb-1.5 block text-[10px] font-semibold text-[#555B69]">Descrição</span><textarea name="description" maxlength="5000" rows="6" value={data.selectedTask.details.task.description} disabled={!data.canUpdate} placeholder="Adicione contexto, critérios e próximos passos..." class="w-full resize-y rounded-xl border border-[#DDE1EA] px-3 py-3 text-[12px] leading-6 outline-none focus:border-[#000A57] disabled:bg-[#FAFAFC]"></textarea></label>
          <div class="grid gap-3 sm:grid-cols-2"><label class="block"><span class="mb-1.5 block text-[10px] font-semibold text-[#555B69]">Prazo</span><input name="dueOn" type="date" value={data.selectedTask.details.task.dueOn ?? ""} disabled={!data.canUpdate} class="h-10 w-full rounded-xl border border-[#DDE1EA] px-3 text-[11px] disabled:bg-[#FAFAFC]"/></label><label class="block"><span class="mb-1.5 block text-[10px] font-semibold text-[#555B69]">Prioridade</span><select name="priority" value={data.selectedTask.details.task.priority} disabled={!data.canUpdate} class="h-10 w-full rounded-xl border border-[#DDE1EA] bg-white px-3 text-[11px] disabled:bg-[#FAFAFC]"><option value="low">Baixa</option><option value="normal">Normal</option><option value="high">Alta</option><option value="urgent">Urgente</option></select></label></div>
          {#if data.canUpdate}<button type="submit" class="min-h-10 rounded-xl bg-[#000A57] px-4 text-[11px] font-semibold text-white">Salvar alterações</button>{/if}
        </form>

        <section class="grid gap-4 rounded-2xl border border-[#E7E9EF] bg-[#FAFAFC] p-4 sm:grid-cols-2">
          <div><span class="text-[9px] font-bold uppercase tracking-[0.08em] text-[#8A909E]">Status</span><p class="mt-1 text-[11px] font-semibold text-[#3B4150]">{data.selectedTask.details.task.statusName}</p></div>
          <div><span class="text-[9px] font-bold uppercase tracking-[0.08em] text-[#8A909E]">Responsável</span><p class="mt-1 text-[11px] font-semibold text-[#3B4150]">{data.selectedTask.details.assignees[0]?.name ?? "Sem responsável"}</p></div>
          {#if data.canAssign}<form use:enhance method="POST" action="?/assignTask" class="sm:col-span-2"><input type="hidden" name="taskId" value={data.selectedTask.details.task.id}/><div class="flex gap-2"><select name="assigneeId" required class="h-10 min-w-0 flex-1 rounded-xl border border-[#DDE1EA] bg-white px-3 text-[11px]">{#each data.selectedTask.details.projectMembers as member}<option value={member.id} selected={member.id === data.selectedTask.details.assignees[0]?.userId}>{member.name}</option>{/each}</select><button type="submit" class="h-10 rounded-xl border border-[#CCD1DD] bg-white px-3 text-[10px] font-semibold text-[#000A57]">Atribuir</button></div></form>{/if}
        </section>

        <section>
          <div class="flex items-center gap-2"><MessageSquare size={16} class="text-[#000A57]"/><h3 class="text-[13px] font-semibold text-[#2D3342]">Comentários</h3></div>
          {#if data.selectedTask.details.comments.length > 0}<div class="mt-4 space-y-3">{#each data.selectedTask.details.comments as comment}<article class="rounded-2xl border border-[#E7E9EF] bg-[#FAFAFC] p-4"><div class="flex items-center justify-between gap-3"><strong class="text-[10px] font-semibold text-[#3B4150]">{comment.authorName ?? "Usuário removido"}</strong><span class="text-[9px] text-[#999EAA]">{formatDateTime(comment.createdAt)}</span></div><p class="mt-2 whitespace-pre-wrap text-[11px] leading-5 text-[#646A79]">{comment.body}</p></article>{/each}</div>{:else}<p class="mt-3 text-[10px] text-[#969BA7]">Nenhum comentário ainda.</p>{/if}
          {#if data.canUpdate}<form use:enhance method="POST" action="?/commentTask" class="mt-4"><input type="hidden" name="taskId" value={data.selectedTask.details.task.id}/><MentionTextarea users={data.selectedTask.details.projectMembers} name="body" rows={3} maxlength={5000} placeholder="Comente ou use @ para mencionar alguém" className="w-full resize-y rounded-xl border border-[#DDE1EA] px-3 py-3 text-[12px] leading-5 outline-none focus:border-[#000A57]"/><button type="submit" class="mt-2 min-h-10 rounded-xl bg-[#000A57] px-4 text-[11px] font-semibold text-white">Comentar</button></form>{/if}
        </section>

        <section>
          <div class="flex items-center gap-2"><MoreHorizontal size={16} class="text-[#000A57]"/><h3 class="text-[13px] font-semibold text-[#2D3342]">Atividade</h3></div>
          <div class="mt-4 space-y-4">{#each data.selectedTask.details.activities as activity}<div class="border-l-2 border-[#E5E7ED] pl-3"><p class="text-[10px] leading-4 text-[#626877]"><strong class="font-semibold text-[#3E4453]">{activity.actorName ?? "Sistema"}</strong> {activityLabel(activity.action)}</p><span class="mt-1 block text-[9px] text-[#9B9FAC]">{formatDateTime(activity.createdAt)}</span></div>{/each}</div>
        </section>
      </div>
    </aside>
  </div>
{/if}
