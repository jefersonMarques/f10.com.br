<script lang="ts">
  import { onMount } from "svelte";
  import { CalendarDays, ListTodo, UserRound, X } from "lucide-svelte";

  type TaskPriority = "low" | "normal" | "high" | "urgent";
  type MessageSourceKind = "chat" | "ticket";
  type Project = { id: string; name: string };
  type ProjectMember = { id: string; name: string; email: string };

  export let sourceKind: MessageSourceKind;
  export let messageId: string;
  export let messageBody: string;
  export let sourceSessionId: string | null = null;
  export let ticketId: string | null = null;
  export let projects: Project[] = [];
  export let onCreated: (task: { id: string; title: string }) => void | Promise<void>;
  export let onClose: () => void = () => undefined;

  let modal: HTMLDialogElement;
  let selectedProjectId = projects[0]?.id ?? "";
  let title = messageBody.trim().slice(0, 120) || "Acompanhar atendimento";
  let description = messageBody.trim().slice(0, 5000);
  let priority: TaskPriority = "normal";
  let dueOn = "";
  let assigneeId = "";
  let members: ProjectMember[] = [];
  let canAssign = false;
  let loadingMembers = false;
  let memberRequestId = 0;
  let saving = false;
  let errorMessage = "";
  let requestKey = "";

  async function loadMembers(): Promise<void> {
    const requestId = ++memberRequestId;
    const projectId = selectedProjectId;
    if (!projectId) {
      members = [];
      return;
    }

    loadingMembers = true;
    try {
      const response = await fetch(
        `/api/app/messages/tasks?projectId=${encodeURIComponent(projectId)}`,
        { cache: "no-store" },
      );
      if (!response.ok) throw new Error("PROJECT_MEMBERS_UNAVAILABLE");

      const result = await response.json() as {
        members: ProjectMember[];
        canAssign: boolean;
        currentUserId: string;
      };
      if (requestId !== memberRequestId) return;
      members = result.members;
      canAssign = result.canAssign;
      assigneeId = result.canAssign
        ? members.find((member) => member.id === result.currentUserId)?.id ?? members[0]?.id ?? ""
        : result.currentUserId;
    } catch {
      if (requestId !== memberRequestId) return;
      errorMessage = "Não foi possível consultar os responsáveis deste projeto.";
      members = [];
      assigneeId = "";
    } finally {
      if (requestId === memberRequestId) loadingMembers = false;
    }
  }

  async function saveTask(): Promise<void> {
    if (saving || loadingMembers || !selectedProjectId || !assigneeId) return;
    saving = true;
    errorMessage = "";
    try {
      const response = await fetch("/api/app/messages/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sourceKind,
          messageId,
          sourceSessionId,
          ticketId,
          projectId: selectedProjectId,
          title,
          description,
          priority,
          dueOn,
          assigneeId,
          requestKey,
        }),
      });
      if (!response.ok) throw new Error("TASK_CREATE_FAILED");
      const task = await response.json() as { taskId: string; title: string };
      await onCreated({ id: task.taskId, title: task.title });
      modal?.close();
    } catch {
      errorMessage = "Não foi possível criar a tarefa. Revise projeto, responsável e permissões.";
    } finally {
      saving = false;
    }
  }

  onMount(() => {
    requestKey = crypto.randomUUID();
    modal?.showModal();
    void loadMembers();
  });
</script>

<dialog bind:this={modal} on:close={onClose}
  aria-labelledby="message-task-title"
  class="w-[min(94vw,480px)] max-h-[92dvh] overflow-y-auto rounded-2xl border border-[var(--app-border)] bg-[var(--app-surface)] p-0 text-[var(--app-text)] shadow-2xl backdrop:bg-black/55">
  <div class="sticky top-0 z-10 flex items-center justify-between border-b border-[var(--app-border)] bg-[var(--app-surface)] px-4 py-3">
    <h2 id="message-task-title" class="flex items-center gap-2 text-[16px] font-semibold">
      <ListTodo size={19} class="text-[var(--app-primary)]"/>Gerar tarefa
    </h2>
    <button type="button" on:click={() => modal.close()} aria-label="Fechar"
      class="flex h-9 w-9 items-center justify-center rounded-lg hover:bg-[var(--app-surface-muted)]">
      <X size={18}/>
    </button>
  </div>

  <form class="space-y-3 p-4" on:submit|preventDefault={() => void saveTask()}>
    <p class="max-h-20 overflow-y-auto rounded-lg bg-[var(--app-surface-muted)] p-3 text-[13px] leading-5 text-[var(--app-text-muted)]">
      Origem: {messageBody.slice(0, 220) || "Mensagem com anexo"}
    </p>

    <label class="block text-[13px] font-semibold">Projeto
      <select bind:value={selectedProjectId} required on:change={() => void loadMembers()}
        class="mt-1 h-11 w-full rounded-lg border border-[var(--app-border-control)] bg-[var(--app-surface)] px-3 text-[14px] font-normal">
        {#each projects as project (project.id)}
          <option value={project.id}>{project.name}</option>
        {/each}
      </select>
    </label>

    <label class="block text-[13px] font-semibold">Título
      <input bind:value={title} minlength="2" maxlength="180" required
        class="mt-1 h-11 w-full rounded-lg border border-[var(--app-border-control)] bg-[var(--app-surface)] px-3 text-[14px] font-normal"/>
    </label>

    <label class="block text-[13px] font-semibold">
      <span class="flex items-center gap-1"><UserRound size={15}/>Responsável</span>
      <select bind:value={assigneeId} disabled={loadingMembers || !canAssign || members.length < 2} required
        class="mt-1 h-11 w-full rounded-lg border border-[var(--app-border-control)] bg-[var(--app-surface)] px-3 text-[14px] font-normal disabled:opacity-65">
        {#each members as member (member.id)}
          <option value={member.id}>{member.name}</option>
        {/each}
      </select>
      {#if !loadingMembers && members.length < 2}
        <span class="mt-1 block text-[12px] font-normal text-[var(--app-text-muted)]"
          title="A atribuição segue a permissão Atribuir tarefas e os membros do projeto.">
          {canAssign ? "Adicione integrantes ao projeto para delegar." : "Atribuição limitada pelo perfil de acesso."}
        </span>
      {/if}
    </label>

    <div class="grid grid-cols-2 gap-3">
      <label class="block text-[13px] font-semibold">Prioridade
        <select bind:value={priority}
          class="mt-1 h-11 w-full rounded-lg border border-[var(--app-border-control)] bg-[var(--app-surface)] px-3 text-[14px] font-normal">
          <option value="low">Baixa</option>
          <option value="normal">Normal</option>
          <option value="high">Alta</option>
          <option value="urgent">Urgente</option>
        </select>
      </label>
      <label class="block text-[13px] font-semibold">
        <span class="flex items-center gap-1"><CalendarDays size={14}/>Prazo</span>
        <input bind:value={dueOn} type="date"
          class="mt-1 h-11 w-full rounded-lg border border-[var(--app-border-control)] bg-[var(--app-surface)] px-2 text-[14px] font-normal"/>
      </label>
    </div>

    <label class="block text-[13px] font-semibold">Descrição
      <textarea bind:value={description} rows="3" maxlength="5000"
        class="mt-1 w-full resize-y rounded-lg border border-[var(--app-border-control)] bg-[var(--app-surface)] px-3 py-2.5 text-[14px] font-normal leading-6"/>
    </label>

    {#if errorMessage}
      <p role="alert" class="rounded-lg bg-[var(--app-danger-bg)] p-3 text-[13px] text-[var(--app-danger-text)]">{errorMessage}</p>
    {/if}

    <div class="flex justify-end gap-2 border-t border-[var(--app-border)] pt-3">
      <button type="button" on:click={() => modal.close()}
        class="min-h-10 rounded-lg border border-[var(--app-border)] px-3 text-[13px] font-semibold">
        Cancelar
      </button>
      <button type="submit" disabled={saving || loadingMembers || !assigneeId}
        class="min-h-10 rounded-lg bg-[var(--app-primary)] px-4 text-[13px] font-semibold text-white disabled:opacity-50">
        {saving ? "Criando..." : "Criar tarefa"}
      </button>
    </div>
  </form>
</dialog>
