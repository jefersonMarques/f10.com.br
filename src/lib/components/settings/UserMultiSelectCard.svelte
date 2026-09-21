<script lang="ts">
  import { UserCheck } from "lucide-svelte";

  type SelectableUser = {
    id: string;
    name: string;
    email: string;
  };

  export let title: string;
  export let description: string;
  export let name: string;
  export let users: SelectableUser[] = [];
  export let selectedUserIds: string[] = [];

  let selectedIds = Array.from(new Set(selectedUserIds));

  function toggleUser(userId: string, checked: boolean): void {
    selectedIds = checked
      ? Array.from(new Set([...selectedIds, userId]))
      : selectedIds.filter((id) => id !== userId);
  }

  function setAll(include: boolean): void {
    selectedIds = include ? users.map((user) => user.id) : [];
  }
</script>

<div class="overflow-hidden rounded-2xl border border-app-border bg-app-surface">
  <div class="flex flex-wrap items-center justify-between gap-2 border-b border-app-border-soft bg-app-subtle px-4 py-3">
    <div>
      <strong class="application-text-caption block text-app-text">{title}</strong>
      <span class="application-text-meta text-app-text-soft">{description}</span>
    </div>
    <div class="flex gap-2">
      <button type="button" on:click={() => setAll(true)} class="application-text-meta rounded-lg border border-app-border-control bg-app-surface px-3 py-1.5 font-semibold text-app-primary">Todos</button>
      <button type="button" on:click={() => setAll(false)} class="application-text-meta rounded-lg px-3 py-1.5 font-semibold text-app-text-muted">Limpar</button>
    </div>
  </div>

  {#if users.length > 0}
    <div class="divide-y divide-app-border-soft">
      {#each users as user}
        <label class="flex items-center gap-3 px-4 py-3 transition hover:bg-app-subtle">
          <input
            {name}
            type="checkbox"
            value={user.id}
            checked={selectedIds.includes(user.id)}
            on:change={(event) => toggleUser(user.id, event.currentTarget.checked)}
            class="h-4 w-4 rounded border-app-border-control"
          />
          <span class="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-app-warning-bg text-app-accent"><UserCheck size={15}/></span>
          <span class="min-w-0 flex-1">
            <strong class="application-text-caption block truncate text-app-text">{user.name}</strong>
            <span class="application-text-meta block truncate text-app-text-soft">{user.email}</span>
          </span>
          <span class="application-text-meta rounded-full bg-app-success-bg px-2 py-1 font-bold text-app-success-text">Ativo</span>
        </label>
      {/each}
    </div>
  {:else}
    <div class="application-text-caption px-4 py-6 text-center text-app-text-soft">Nenhuma pessoa ativa disponível.</div>
  {/if}
</div>
