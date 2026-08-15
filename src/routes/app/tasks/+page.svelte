<script lang="ts">
  import {
    CalendarDays,
    CheckCircle2,
    CheckSquare2,
    CircleAlert,
    FolderKanban,
    Plus,
    UserPlus,
    Users,
    X,
  } from "lucide-svelte";
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

  $: memberIds = new Set(data.members.map((member) => member.id));
  $: availableUsers = data.activeUsers.filter((user) => !memberIds.has(user.id));

  function tasksForStatus(statusId: string) {
    return data.board?.tasks.filter((task) => task.statusId === statusId) ?? [];
  }
</script>

<svelte:head>
  <title>Tarefas | F10 Operations</title>
</svelte:head>

<div class="mx-auto max-w-[1540px] px-5 py-7 sm:px-8 sm:py-9">
  <div class="flex flex-col justify-between gap-5 xl:flex-row xl:items-end">
    <div>
      <p class="text-[10px] font-bold uppercase tracking-[0.14em] text-[#EA6D0B]">
        Trabalho interno
      </p>
      <h1 class="mt-2 text-[30px] font-semibold tracking-[-0.035em] text-[#010D28] sm:text-[38px]">
        Tarefas
      </h1>
      <p class="mt-2 max-w-[760px] text-[14px] leading-6 text-[#6F7585]">
        Organize projetos, responsáveis, prioridades e andamento sem sair do F10 Operations.
      </p>
    </div>

    {#if data.projects.length > 0}
      <nav class="flex max-w-full gap-2 overflow-x-auto pb-1" aria-label="Projetos">
        {#each data.projects as project}
          <a
            href={`/app/tasks?project=${project.id}`}
            class={`shrink-0 rounded-xl border px-4 py-2.5 text-[11px] font-semibold transition ${
              project.id === data.selectedProjectId
                ? "border-[#000A57] bg-[#000A57] text-white"
                : "border-[#DDE1EA] bg-white text-[#656B7B] hover:border-[#BFC5D2] hover:text-[#000A57]"
            }`}
          >
            {project.name}
          </a>
        {/each}
      </nav>
    {/if}
  </div>

  {#if form?.message}
    <div
      class={`mt-6 flex items-start gap-3 rounded-2xl border px-4 py-3 text-[12px] font-medium ${
        form.success
          ? "border-[#B9E6C9] bg-[#F1FBF4] text-[#176B35]"
          : "border-[#F0C8C8] bg-[#FFF5F5] text-[#9B2C2C]"
      }`}
    >
      {#if form.success}
        <CheckCircle2 size={18} class="mt-0.5 shrink-0" aria-hidden="true" />
      {:else}
        <CircleAlert size={18} class="mt-0.5 shrink-0" aria-hidden="true" />
      {/if}
      <span>{form.message}</span>
    </div>
  {/if}

  {#if !data.board}
    <section class="mt-7 rounded-[26px] border border-dashed border-[#CBD0DC] bg-white px-6 py-16 text-center">
      <FolderKanban size={38} class="mx-auto text-[#AEB4C1]" aria-hidden="true" />
      <h2 class="mt-5 text-[18px] font-semibold text-[#303645]">Nenhum projeto disponível</h2>
      <p class="mx-auto mt-2 max-w-[520px] text-[12px] leading-6 text-[#818795]">
        {data.canManage
          ? "Crie o primeiro projeto e escolha quem fará parte dele."
          : "Você ainda não participa de nenhum projeto de tarefas. Um administrador pode adicionar você a um projeto."}
      </p>
    </section>
  {:else}
    <section class="mt-7 rounded-[24px] border border-[#E2E5ED] bg-white px-5 py-5 sm:px-6">
      <div class="flex flex-col justify-between gap-4 lg:flex-row lg:items-center">
        <div class="min-w-0">
          <div class="flex items-center gap-3">
            <span class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#EEF0FF] text-[#000A57]">
              <FolderKanban size={19} aria-hidden="true" />
            </span>
            <div class="min-w-0">
              <h2 class="truncate text-[16px] font-semibold text-[#11182C]">{data.board.project.name}</h2>
              {#if data.board.project.description}
                <p class="mt-1 line-clamp-1 text-[11px] text-[#858A98]">{data.board.project.description}</p>
              {/if}
            </div>
          </div>
        </div>

        <div class="flex flex-wrap items-center gap-2 text-[10px] text-[#777D8D]">
          <span class="rounded-full bg-[#F4F5F8] px-3 py-1.5">
            {data.board.tasks.length} {data.board.tasks.length === 1 ? "tarefa" : "tarefas"}
          </span>
          <span class="rounded-full bg-[#F4F5F8] px-3 py-1.5">
            {data.members.length} {data.members.length === 1 ? "integrante" : "integrantes"}
          </span>
        </div>
      </div>
    </section>

    <div class="mt-5 overflow-x-auto pb-3">
      <div class="grid min-w-[920px] gap-4" style={`grid-template-columns: repeat(${Math.max(data.board.statuses.length, 1)}, minmax(280px, 1fr));`}>
        {#each data.board.statuses as status}
          <section class="rounded-[22px] border border-[#E0E3EB] bg-[#F8F9FB] p-3">
            <header class="flex items-center justify-between gap-3 px-1 pb-3">
              <div class="flex items-center gap-2">
                <span class={`h-2.5 w-2.5 rounded-full ${status.isClosed ? "bg-[#4F9B67]" : "bg-[#EA6D0B]"}`}></span>
                <h3 class="text-[12px] font-semibold text-[#3A4050]">{status.name}</h3>
              </div>
              <span class="rounded-full bg-white px-2 py-1 text-[9px] font-semibold text-[#858B99] shadow-sm">
                {tasksForStatus(status.id).length}
              </span>
            </header>

            <div class="space-y-3">
              {#each tasksForStatus(status.id) as task}
                <article class="rounded-2xl border border-[#E2E5EC] bg-white p-4 shadow-[0_5px_18px_rgba(1,13,40,0.04)]">
                  <div class="flex items-start justify-between gap-3">
                    <h4 class="text-[13px] font-semibold leading-5 text-[#252B3B]">{task.title}</h4>
                    <span class={`shrink-0 rounded-full px-2 py-1 text-[8px] font-bold uppercase tracking-[0.05em] ${priorityClasses[task.priority]}`}>
                      {priorityLabels[task.priority]}
                    </span>
                  </div>

                  {#if task.description}
                    <p class="mt-2 line-clamp-3 text-[10px] leading-5 text-[#7B8190]">{task.description}</p>
                  {/if}

                  <div class="mt-4 flex flex-wrap gap-2">
                    {#if task.dueOn}
                      <span class="inline-flex items-center gap-1.5 rounded-lg bg-[#F5F6F9] px-2 py-1.5 text-[9px] font-medium text-[#666C7B]">
                        <CalendarDays size={12} aria-hidden="true" />
                        {task.dueOn.split("-").reverse().join("/")}
                      </span>
                    {/if}

                    {#each task.assignees as assignee}
                      <span class="rounded-lg bg-[#EEF0FF] px-2 py-1.5 text-[9px] font-medium text-[#000A57]">
                        {assignee.name}
                      </span>
                    {/each}
                  </div>

                  {#if data.canUpdate}
                    <form method="POST" action="?/moveTask" class="mt-4 flex gap-2 border-t border-[#F0F1F4] pt-3">
                      <input type="hidden" name="taskId" value={task.id} />
                      <select
                        name="statusId"
                        value={task.statusId}
                        class="h-9 min-w-0 flex-1 rounded-lg border border-[#DDE1E8] bg-white px-2 text-[9px] outline-none focus:border-[#000A57]"
                      >
                        {#each data.board.statuses as destinationStatus}
                          <option value={destinationStatus.id}>{destinationStatus.name}</option>
                        {/each}
                      </select>
                      <button
                        type="submit"
                        class="h-9 rounded-lg bg-[#000A57] px-3 text-[9px] font-semibold text-white"
                      >
                        Mover
                      </button>
                    </form>
                  {/if}
                </article>
              {/each}

              {#if tasksForStatus(status.id).length === 0}
                <div class="rounded-2xl border border-dashed border-[#D6DAE3] bg-white/50 px-4 py-8 text-center text-[10px] text-[#9A9FAC]">
                  Nenhuma tarefa neste status
                </div>
              {/if}
            </div>
          </section>
        {/each}
      </div>
    </div>
  {/if}

  <div class="mt-7 grid gap-6 xl:grid-cols-2">
    {#if data.canCreate && data.board}
      <section class="rounded-[24px] border border-[#E2E5ED] bg-white p-5 sm:p-6">
        <div class="flex items-start gap-3">
          <span class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#FFF0E4] text-[#EA6D0B]">
            <Plus size={19} aria-hidden="true" />
          </span>
          <div>
            <h2 class="text-[16px] font-semibold text-[#11182C]">Nova tarefa</h2>
            <p class="mt-1 text-[11px] leading-5 text-[#858A98]">
              A tarefa começa no primeiro status aberto do projeto.
            </p>
          </div>
        </div>

        <form method="POST" action="?/createTask" class="mt-6 grid gap-4 sm:grid-cols-2">
          <input type="hidden" name="projectId" value={data.board.project.id} />

          <label class="block sm:col-span-2">
            <span class="mb-1.5 block text-[11px] font-semibold text-[#4A5060]">Título</span>
            <input
              name="title"
              required
              maxlength="180"
              class="h-11 w-full rounded-xl border border-[#DDE1EA] px-3 text-[13px] outline-none transition focus:border-[#000A57] focus:ring-2 focus:ring-[#000A57]/10"
            />
          </label>

          <label class="block sm:col-span-2">
            <span class="mb-1.5 block text-[11px] font-semibold text-[#4A5060]">Descrição</span>
            <textarea
              name="description"
              maxlength="5000"
              rows="4"
              class="w-full resize-y rounded-xl border border-[#DDE1EA] px-3 py-2.5 text-[13px] leading-5 outline-none transition focus:border-[#000A57] focus:ring-2 focus:ring-[#000A57]/10"
            ></textarea>
          </label>

          <label class="block">
            <span class="mb-1.5 block text-[11px] font-semibold text-[#4A5060]">Prioridade</span>
            <select
              name="priority"
              class="h-11 w-full rounded-xl border border-[#DDE1EA] bg-white px-3 text-[12px] outline-none focus:border-[#000A57]"
            >
              <option value="normal">Normal</option>
              <option value="low">Baixa</option>
              <option value="high">Alta</option>
              <option value="urgent">Urgente</option>
            </select>
          </label>

          <label class="block">
            <span class="mb-1.5 block text-[11px] font-semibold text-[#4A5060]">Prazo</span>
            <input
              name="dueOn"
              type="date"
              class="h-11 w-full rounded-xl border border-[#DDE1EA] px-3 text-[12px] outline-none focus:border-[#000A57]"
            />
          </label>

          {#if data.canAssign}
            <label class="block sm:col-span-2">
              <span class="mb-1.5 block text-[11px] font-semibold text-[#4A5060]">Responsável</span>
              <select
                name="assigneeId"
                class="h-11 w-full rounded-xl border border-[#DDE1EA] bg-white px-3 text-[12px] outline-none focus:border-[#000A57]"
              >
                <option value="">Atribuir a mim</option>
                {#each data.members as member}
                  <option value={member.id}>{member.name}</option>
                {/each}
              </select>
            </label>
          {/if}

          <button
            type="submit"
            class="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[#000A57] px-4 text-[12px] font-semibold text-white sm:col-span-2"
          >
            <CheckSquare2 size={17} aria-hidden="true" />
            Criar tarefa
          </button>
        </form>
      </section>
    {/if}

    {#if data.canManage}
      <section class="rounded-[24px] border border-[#E2E5ED] bg-white p-5 sm:p-6">
        <div class="flex items-start gap-3">
          <span class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#EEF0FF] text-[#000A57]">
            <FolderKanban size={19} aria-hidden="true" />
          </span>
          <div>
            <h2 class="text-[16px] font-semibold text-[#11182C]">Novo projeto</h2>
            <p class="mt-1 text-[11px] leading-5 text-[#858A98]">
              O criador sempre permanece como integrante e os status básicos são criados automaticamente.
            </p>
          </div>
        </div>

        <form method="POST" action="?/createProject" class="mt-6 space-y-4">
          <label class="block">
            <span class="mb-1.5 block text-[11px] font-semibold text-[#4A5060]">Nome</span>
            <input
              name="name"
              required
              maxlength="120"
              class="h-11 w-full rounded-xl border border-[#DDE1EA] px-3 text-[13px] outline-none focus:border-[#000A57]"
            />
          </label>

          <label class="block">
            <span class="mb-1.5 block text-[11px] font-semibold text-[#4A5060]">Descrição</span>
            <textarea
              name="description"
              maxlength="1000"
              rows="3"
              class="w-full resize-y rounded-xl border border-[#DDE1EA] px-3 py-2.5 text-[12px] leading-5 outline-none focus:border-[#000A57]"
            ></textarea>
          </label>

          <label class="block">
            <span class="mb-1.5 block text-[11px] font-semibold text-[#4A5060]">Integrantes iniciais</span>
            <select
              name="memberIds"
              multiple
              size="5"
              class="w-full rounded-xl border border-[#DDE1EA] bg-white px-3 py-2 text-[11px] outline-none focus:border-[#000A57]"
            >
              {#each data.activeUsers as user}
                <option value={user.id}>{user.name} — {user.email}</option>
              {/each}
            </select>
            <span class="mt-1.5 block text-[9px] leading-4 text-[#989DAA]">Use Ctrl/Cmd para selecionar mais de uma pessoa.</span>
          </label>

          <button
            type="submit"
            class="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-[#000A57] px-4 text-[12px] font-semibold text-white"
          >
            <Plus size={17} aria-hidden="true" />
            Criar projeto
          </button>
        </form>
      </section>
    {/if}
  </div>

  {#if data.canManage && data.board}
    <section class="mt-7 rounded-[24px] border border-[#E2E5ED] bg-white p-5 sm:p-6">
      <div class="flex items-center gap-3">
        <span class="flex h-10 w-10 items-center justify-center rounded-xl bg-[#EEF0FF] text-[#000A57]">
          <Users size={19} aria-hidden="true" />
        </span>
        <div>
          <h2 class="text-[16px] font-semibold text-[#11182C]">Integrantes do projeto</h2>
          <p class="mt-1 text-[11px] text-[#858A98]">Controle quem pode receber e acompanhar tarefas deste projeto.</p>
        </div>
      </div>

      <div class="mt-5 grid gap-5 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div class="flex flex-wrap gap-2">
          {#each data.members as member}
            <div class="inline-flex items-center gap-2 rounded-xl border border-[#E0E3EA] bg-[#FAFAFC] px-3 py-2">
              <span class="text-[10px] font-semibold text-[#555B6A]">{member.name}</span>
              {#if member.id !== data.board.project.id}
                <form method="POST" action="?/removeMember">
                  <input type="hidden" name="projectId" value={data.board.project.id} />
                  <input type="hidden" name="userId" value={member.id} />
                  <button
                    type="submit"
                    class="inline-flex h-6 w-6 items-center justify-center rounded-md text-[#9B9FAB] transition hover:bg-[#FFF0F0] hover:text-[#A52A2A]"
                    aria-label={`Remover ${member.name}`}
                  >
                    <X size={13} aria-hidden="true" />
                  </button>
                </form>
              {/if}
            </div>
          {/each}
        </div>

        <form method="POST" action="?/addMember" class="flex gap-2">
          <input type="hidden" name="projectId" value={data.board.project.id} />
          <select
            name="userId"
            required
            class="h-10 min-w-0 flex-1 rounded-xl border border-[#DDE1EA] bg-white px-3 text-[10px] outline-none focus:border-[#000A57]"
          >
            <option value="">Adicionar integrante...</option>
            {#each availableUsers as user}
              <option value={user.id}>{user.name}</option>
            {/each}
          </select>
          <button
            type="submit"
            disabled={availableUsers.length === 0}
            class="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-[#000A57] px-3 text-[10px] font-semibold text-white disabled:bg-[#D8DBE3]"
          >
            <UserPlus size={14} aria-hidden="true" />
            Adicionar
          </button>
        </form>
      </div>
    </section>
  {/if}
</div>
