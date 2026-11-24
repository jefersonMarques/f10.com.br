<script lang="ts">
  import { onMount } from "svelte";
  import { Plus, Search, Pencil, Trash2, X } from "lucide-svelte";
  import { renderQuickReply, type QuickReply, type QuickReplyContext, type QuickReplyScope } from "$lib/support/quickReplies";

  export let context: QuickReplyContext = {};
  export let onInsert: (value: string) => void;
  export let onClose: () => void;

  let dialog: HTMLDialogElement;
  let scopes: QuickReplyScope[] = [];
  let agentName = "";
  let selectedScope = "";
  let search = "";
  let loading = true;
  let saving = false;
  let errorMessage = "";
  let editing = false;
  let editScope = "personal";
  let editId = "";
  let command = "";
  let title = "";
  let body = "";

  $: editableScopes = scopes.filter((scope) => scope.canEdit);
  $: visibleScopes = scopes.filter((scope) => !selectedScope || scope.id === selectedScope);
  $: filtered = visibleScopes.flatMap((scope) => scope.replies
    .filter((reply) => `${reply.command} ${reply.title} ${reply.body}`.toLocaleLowerCase("pt-BR").includes(search.trim().replace(/^\//, "").toLocaleLowerCase("pt-BR")))
    .map((reply) => ({ reply, scope })));

  async function load(): Promise<void> {
    try {
      const response = await fetch("/api/app/support/quick-replies", { cache: "no-store" });
      if (!response.ok) throw new Error("LOAD_FAILED");
      const result = await response.json() as { scopes: QuickReplyScope[]; agentName: string };
      scopes = result.scopes;
      agentName = result.agentName;
    } catch {
      errorMessage = "Não foi possível carregar as respostas rápidas.";
    } finally { loading = false; }
  }

  function edit(scope?: QuickReplyScope, reply?: QuickReply): void {
    editScope = scope?.id ?? (editableScopes.find((item) => item.id === selectedScope)?.id || "personal");
    editId = reply?.id ?? "";
    command = reply?.command ?? "";
    title = reply?.title ?? "";
    body = reply?.body ?? "";
    editing = true;
    errorMessage = "";
  }

  async function save(action: "save" | "delete", scopeId = editScope, id = editId): Promise<void> {
    if (saving) return;
    if (action === "delete" && !window.confirm("Excluir esta resposta rápida?")) return;
    saving = true;
    errorMessage = "";
    try {
      const response = await fetch("/api/app/support/quick-replies", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, scopeId, id, command, title, body }),
      });
      const result = await response.json() as { scopes?: QuickReplyScope[]; error?: string };
      if (!response.ok || !result.scopes) {
        errorMessage = result.error === "QUICK_REPLY_DUPLICATE" ? "Este atalho já existe neste grupo."
          : result.error === "QUICK_REPLY_LIMIT" ? "Limite de 50 respostas por grupo."
          : "Não foi possível salvar. Revise o atalho, os campos e suas permissões.";
        return;
      }
      scopes = result.scopes;
      editing = false;
    } catch { errorMessage = "Não foi possível salvar a resposta."; }
    finally { saving = false; }
  }

  function choose(reply: QuickReply): void {
    const rendered = renderQuickReply(reply.body, { ...context, agentName });
    if (rendered === null) {
      errorMessage = "Esta resposta usa uma informação que não está disponível neste atendimento.";
      return;
    }
    dialog.close();
    onInsert(rendered);
  }

  function handleKeydown(event: KeyboardEvent): void {
    if (event.key === "Escape") event.stopPropagation();
    if (event.key === "Enter" && event.target instanceof HTMLInputElement) event.preventDefault();
  }

  onMount(() => { dialog.showModal(); void load(); });
</script>

<dialog bind:this={dialog} on:close={onClose} on:keydown={handleKeydown}
  aria-label="Respostas rápidas"
  class="w-[min(94vw,560px)] max-h-[85dvh] overflow-y-auto rounded-2xl border border-app-border bg-app-surface p-0 text-app-text shadow-2xl backdrop:bg-black/40">
  <div class="sticky top-0 z-10 flex items-center justify-between border-b border-app-border bg-app-surface px-4 py-3">
    <h2 class="text-[16px] font-semibold">Respostas rápidas</h2>
    <button type="button" aria-label="Fechar respostas rápidas" on:click={() => dialog.close()} class="rounded-lg p-2 hover:bg-app-muted"><X size={18}/></button>
  </div>
  <div class="space-y-3 p-4">
    {#if errorMessage}<p role="alert" class="rounded-lg bg-app-danger-bg px-3 py-2 text-[13px] text-app-danger-text">{errorMessage}</p>{/if}
    {#if loading}<p class="py-4 text-center text-[13px] text-app-text-muted">Carregando...</p>
    {:else if editing}
      <label class="block text-[13px] font-medium">Grupo<select bind:value={editScope} disabled={Boolean(editId) || saving} class="mt-1 h-10 w-full rounded-lg border border-app-border-control bg-app-surface px-3">
        {#each editableScopes as scope (scope.id)}<option value={scope.id}>{scope.label}</option>{/each}
      </select></label>
      <label class="block text-[13px] font-medium">Atalho<input bind:value={command} maxlength="32" placeholder="ex.: verificando" class="mt-1 h-10 w-full rounded-lg border border-app-border-control bg-app-surface px-3"/></label>
      <label class="block text-[13px] font-medium">Título<input bind:value={title} maxlength="80" class="mt-1 h-10 w-full rounded-lg border border-app-border-control bg-app-surface px-3"/></label>
      <label class="block text-[13px] font-medium">Mensagem<textarea bind:value={body} rows="5" maxlength="4000" class="mt-1 w-full rounded-lg border border-app-border-control bg-app-surface p-3 text-[14px] leading-6"></textarea></label>
      <div class="flex flex-wrap gap-1">
        {#each [{ key: "customerName", label: "Cliente" }, { key: "unitName", label: "Unidade" }, { key: "ticketNumber", label: "Chamado" }, { key: "agentName", label: "Operador" }] as variable}
          <button type="button" on:click={() => body += "{{" + variable.key + "}}"} class="rounded-lg border border-app-border px-2 py-1 text-[12px] text-app-primary">{variable.label}</button>
        {/each}
      </div>
      <div class="flex justify-end gap-2"><button type="button" on:click={() => editing = false} disabled={saving} class="rounded-lg border border-app-border px-4 py-2 text-[13px]">Voltar</button><button type="button" disabled={saving || !command.trim() || !title.trim() || !body.trim()} on:click={() => void save("save")} class="rounded-lg bg-[var(--app-primary)] px-4 py-2 text-[13px] font-semibold text-white disabled:opacity-50">Salvar</button></div>
    {:else}
      <div class="flex flex-wrap items-center gap-2">
        <label class="relative min-w-[150px] flex-1"><Search size={16} class="absolute left-3 top-3 text-app-text-muted"/><input bind:value={search} placeholder="Buscar atalho..." aria-label="Buscar resposta" class="h-10 w-full rounded-lg border border-app-border-control bg-app-surface pl-9 pr-3 text-[14px]"/></label>
        <button type="button" on:click={() => edit()} disabled={!editableScopes.length} class="flex h-10 items-center gap-1 rounded-lg bg-[var(--app-primary)] px-3 text-[13px] font-semibold text-white disabled:opacity-50"><Plus size={16}/> Nova</button>
      </div>
      <select bind:value={selectedScope} aria-label="Grupo de respostas" class="h-10 w-full rounded-lg border border-app-border-control bg-app-surface px-3 text-[13px]">
        <option value="">Todas as respostas</option>
        {#each scopes as scope (scope.id)}<option value={scope.id}>{scope.label}</option>{/each}
      </select>
      {#each filtered as item (item.scope.id + ":" + item.reply.id)}
        <div class="flex items-start gap-2 rounded-xl border border-app-border p-3">
          <button type="button" on:click={() => choose(item.reply)} class="min-w-0 flex-1 text-left">
            <span class="block text-[14px] font-semibold text-app-primary">/{item.reply.command} · {item.reply.title}</span>
            <span class="mt-1 block line-clamp-2 text-[13px] leading-5 text-app-text-muted">{item.reply.body}</span>
            <span class="mt-1 block text-[11px] text-app-text-muted">{item.scope.label}</span>
          </button>
          {#if item.scope.canEdit}
            <button type="button" on:click={() => edit(item.scope, item.reply)} aria-label="Editar resposta" class="rounded-lg p-2 hover:bg-app-muted"><Pencil size={15}/></button>
            <button type="button" disabled={saving} on:click={() => void save("delete", item.scope.id, item.reply.id)} aria-label="Excluir resposta" class="rounded-lg p-2 text-app-danger-text hover:bg-app-muted"><Trash2 size={15}/></button>
          {/if}
        </div>
      {:else}<p class="py-4 text-center text-[13px] text-app-text-muted">Nenhuma resposta encontrada.</p>{/each}
    {/if}
  </div>
</dialog>
