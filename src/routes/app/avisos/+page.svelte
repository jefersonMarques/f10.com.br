<script lang="ts">
  import { BellRing, Plus, Trash2 } from "lucide-svelte";
  import ApplicationContent from "$lib/components/application/ApplicationContent.svelte";
  import type { ActionData, PageData } from "./$types";

  export let data: PageData;
  export let form: ActionData;

  const severityLabel: Record<string, string> = {
    info: "Informação",
    warning: "Atenção",
    critical: "Crítico",
  };

  function format(value: string | Date | null): string {
    if (!value) return "—";
    return new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" }).format(new Date(value));
  }
</script>

<svelte:head><title>Avisos F10 | Operations</title></svelte:head>

<ApplicationContent width="wide">
  <div class="space-y-5">
    {#if data.canEdit}
      <details class="rounded-[22px] border border-app-border bg-app-surface p-5">
        <summary class="flex cursor-pointer list-none items-center gap-2 text-[13px] font-semibold"><Plus size={16}/>Novo aviso</summary>
        <form method="POST" action="?/create" class="mt-4 grid gap-3 md:grid-cols-2">
          <input name="title" required maxlength="120" placeholder="Título" class="h-11 rounded-xl border border-app-border-control bg-app-surface px-3 text-[12px] md:col-span-2"/>
          <textarea name="message" required maxlength="2000" rows="4" placeholder="Mensagem" class="rounded-xl border border-app-border-control bg-app-surface px-3 py-2.5 text-[12px] md:col-span-2"></textarea>
          <select name="severity" class="h-11 rounded-xl border border-app-border-control bg-app-surface px-3 text-[12px]"><option value="info">Informação</option><option value="warning">Atenção</option><option value="critical">Crítico</option></select>
          <label class="flex h-11 items-center gap-2 rounded-xl border border-app-border-control px-3 text-[11px]"><input type="checkbox" name="requiresAcknowledgement" checked/>Exigir confirmação</label>
          <label class="text-[10px] text-app-text-soft">Início opcional<input name="startsAt" type="datetime-local" class="mt-1 h-11 w-full rounded-xl border border-app-border-control bg-app-surface px-3 text-[12px]"/><span class="mt-1 block text-[9px]">Vazio = mostrar imediatamente.</span></label>
          <label class="text-[10px] text-app-text-soft">Término *<input name="expiresAt" type="datetime-local" required class="mt-1 h-11 w-full rounded-xl border border-app-border-control bg-app-surface px-3 text-[12px]"/></label>
          <button type="submit" class="h-11 rounded-xl bg-app-primary px-4 text-[11px] font-semibold text-white md:col-span-2">Publicar aviso</button>
        </form>
        {#if form?.message}<p class="mt-3 text-[11px] text-app-text-muted">{form.message}</p>{/if}
      </details>
    {/if}

    <section class="overflow-hidden rounded-[22px] border border-app-border bg-app-surface">
      <header class="flex items-center gap-3 border-b border-app-border-soft px-5 py-4"><span class="flex h-10 w-10 items-center justify-center rounded-xl bg-app-warning-bg text-app-warning-text"><BellRing size={18}/></span><div><h1 class="text-[15px] font-semibold">Avisos do WebView</h1><p class="text-[11px] text-app-text-soft">Exibidos dentro do /iframef10.</p></div></header>
      {#if data.notices.length === 0}<p class="px-5 py-12 text-center text-[12px] text-app-text-soft">Nenhum aviso criado.</p>{/if}
      <div class="divide-y divide-app-border-soft">
        {#each data.notices as notice}
          <article class="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
            <div class="min-w-0"><div class="flex flex-wrap items-center gap-2"><strong class="text-[13px]">{notice.title}</strong><span class="rounded-full bg-app-muted px-2 py-1 text-[9px] font-bold uppercase text-app-text-muted">{severityLabel[notice.severity]}</span>{#if !notice.active}<span class="rounded-full bg-app-danger-bg px-2 py-1 text-[9px] font-bold uppercase text-app-danger-text">Inativo</span>{/if}</div><p class="mt-1 text-[11px] leading-5 text-app-text-muted">{notice.message}</p><p class="mt-1 text-[10px] text-app-text-soft">{format(notice.startsAt)} → {format(notice.expiresAt)}</p></div>
            {#if data.canEdit}<div class="flex shrink-0 gap-2"><form method="POST" action="?/toggle"><input type="hidden" name="noticeId" value={notice.id}/><input type="hidden" name="active" value={notice.active ? "false" : "true"}/><button type="submit" class="h-9 rounded-xl border border-app-border-control px-3 text-[10px] font-semibold text-app-primary">{notice.active ? "Desativar" : "Ativar"}</button></form><form method="POST" action="?/delete" on:submit={(event)=>{if(!confirm("Excluir este aviso?")) event.preventDefault();}}><input type="hidden" name="noticeId" value={notice.id}/><button type="submit" class="flex h-9 w-9 items-center justify-center rounded-xl border border-app-danger-border text-app-danger-text" aria-label="Excluir"><Trash2 size={14}/></button></form></div>{/if}
          </article>
        {/each}
      </div>
    </section>
  </div>
</ApplicationContent>
