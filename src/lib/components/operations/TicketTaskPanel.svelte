<script lang="ts">
  import { ListTodo, Plus } from "lucide-svelte";

  type LinkedTask = {
    id: string;
    title: string;
    projectName: string;
    statusName: string;
    statusClosed: boolean;
    dueOn: string | null;
  };

  type TaskProject = {
    id: string;
    name: string;
  };

  export let ticketId: string;
  export let ticketNumber: number;
  export let ticketSubject: string;
  export let tasks: LinkedTask[] = [];
  export let projects: TaskProject[] = [];
  export let canCreate = false;
  export let onCreated: () => void | Promise<void> = () => undefined;

  let submitting = false;

  async function createTask(event: SubmitEvent): Promise<void> {
    event.preventDefault();
    if (!canCreate || submitting) return;

    const formElement = event.currentTarget as HTMLFormElement;
    submitting = true;
    try {
      const response = await fetch(`/app/tickets/${ticketId}?/createTask`, {
        method: "POST",
        body: new FormData(formElement),
      });
      if (!response.ok) {
        window.alert("Não foi possível criar a tarefa deste ticket.");
        return;
      }
      formElement.reset();
      await onCreated();
    } finally {
      submitting = false;
    }
  }
</script>

<section class="rounded-xl border border-[#DDE1E7] bg-white p-4">
  <div class="flex items-center justify-between gap-3">
    <h3 class="application-text-caption flex items-center gap-2 font-semibold text-[#3D4452]"><ListTodo size={13}/>Tarefas</h3>
    <span class="application-text-meta rounded-full bg-[#F3F4F7] px-2 py-1 font-bold text-[#676D7D]">{tasks.length}</span>
  </div>

  {#if tasks.length > 0}
    <div class="mt-3 space-y-2">
      {#each tasks as task}
        <a href={`/app/tasks/${task.id}`} class="block rounded-lg border border-[#E7E9EF] bg-[#FAFAFC] px-3 py-2.5 transition hover:border-[#C9CFE6] hover:bg-[#F7F8FF]">
          <div class="flex items-start justify-between gap-2">
            <strong class="application-text-meta min-w-0 flex-1 leading-4 text-[#3D4454]">{task.title}</strong>
            <span class={`application-text-meta shrink-0 rounded-full px-2 py-1 font-bold ${task.statusClosed ? "bg-[#EEF8F1] text-[#2F7045]" : "bg-[#EEF0FF] text-[#000A57]"}`}>{task.statusName}</span>
          </div>
          <p class="application-text-meta mt-1 text-[#8A909E]">{task.projectName}{task.dueOn ? ` · prazo ${task.dueOn}` : ""}</p>
        </a>
      {/each}
    </div>
  {:else}
    <p class="application-text-meta mt-3 leading-4 text-[#858B99]">Nenhuma tarefa vinculada a este ticket.</p>
  {/if}

  {#if canCreate && projects.length > 0}
    <details class="mt-3 border-t border-[#EEF0F5] pt-3">
      <summary class="application-text-meta cursor-pointer list-none font-semibold text-[#000A57]">+ Criar tarefa</summary>
      <form on:submit={createTask} class="mt-3 space-y-2.5">
        <label class="block"><span class="application-text-meta mb-1 block font-semibold text-[#777D8D]">Projeto</span><select name="projectId" required class="application-text-caption h-9 w-full rounded-lg border border-[#D9DDE4] bg-white px-2">{#each projects as project}<option value={project.id}>{project.name}</option>{/each}</select></label>
        <label class="block"><span class="application-text-meta mb-1 block font-semibold text-[#777D8D]">Título</span><input name="title" required minlength="2" maxlength="180" value={`Ticket #${ticketNumber} · ${ticketSubject}`} class="application-text-caption h-9 w-full rounded-lg border border-[#D9DDE4] px-2"/></label>
        <label class="block"><span class="application-text-meta mb-1 block font-semibold text-[#777D8D]">Descrição</span><textarea name="description" rows="2" maxlength="5000" placeholder="O que precisa ser feito?" class="application-text-caption w-full resize-y rounded-lg border border-[#D9DDE4] px-2 py-2"></textarea></label>
        <div class="grid grid-cols-2 gap-2">
          <label><span class="application-text-meta mb-1 block font-semibold text-[#777D8D]">Prioridade</span><select name="priority" class="application-text-caption h-9 w-full rounded-lg border border-[#D9DDE4] bg-white px-2"><option value="normal">Normal</option><option value="low">Baixa</option><option value="high">Alta</option><option value="urgent">Urgente</option></select></label>
          <label><span class="application-text-meta mb-1 block font-semibold text-[#777D8D]">Prazo</span><input name="dueOn" type="date" class="application-text-caption h-9 w-full rounded-lg border border-[#D9DDE4] px-2"/></label>
        </div>
        <button type="submit" disabled={submitting} class="application-text-meta inline-flex h-9 w-full items-center justify-center gap-2 rounded-lg bg-[#000A57] px-3 font-semibold text-white disabled:cursor-wait disabled:opacity-60"><Plus size={12}/>{submitting ? "Criando..." : "Criar e vincular"}</button>
      </form>
    </details>
  {/if}
</section>
