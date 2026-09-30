<script lang="ts">
  import { ExternalLink, Image as ImageIcon, Megaphone, Pin, Plus, Save, Trash2 } from "lucide-svelte";
  import ApplicationContent from "$lib/components/application/ApplicationContent.svelte";
  import type { ActionData, PageData } from "./$types";

  export let data: PageData;
  export let form: ActionData;

  function dateTimeLocal(value: string | Date | null): string {
    if (!value) return "";
    const date = new Date(value);
    const pad = (part: number) => String(part).padStart(2, "0");
    return date.getFullYear() + "-" + pad(date.getMonth() + 1) + "-" + pad(date.getDate())
      + "T" + pad(date.getHours()) + ":" + pad(date.getMinutes());
  }

  function formatDate(value: string | Date | null): string {
    if (!value) return "Não expira";
    return new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" }).format(new Date(value));
  }
</script>

<svelte:head><title>Novidades F10 | Operations</title></svelte:head>

<ApplicationContent width="wide">
  {#if form?.message}
    <div class={"mb-4 rounded-2xl border px-4 py-3 text-[11px] font-medium " + (form.success ? "border-app-success-border bg-app-success-bg text-app-success-text" : "border-app-danger-border bg-app-danger-bg text-app-danger-text")}>{form.message}</div>
  {/if}

  <div class="space-y-5">
    {#if data.canEdit}
      <details class="rounded-[22px] border border-app-border bg-app-surface p-5">
        <summary class="flex cursor-pointer list-none items-center gap-2 text-[13px] font-semibold text-app-text"><Plus size={16}/>Nova novidade</summary>
        <form method="POST" action="?/create" enctype="multipart/form-data" class="mt-5 grid gap-4 lg:grid-cols-2">
          <label class="lg:col-span-2"><span class="mb-1.5 block text-[11px] font-semibold">Título</span><input name="title" required maxlength="160" class="h-11 w-full rounded-xl border border-app-border-control bg-app-surface px-3 text-[12px]"/></label>
          <label class="lg:col-span-2"><span class="mb-1.5 block text-[11px] font-semibold">Markdown</span><textarea name="bodyMarkdown" required maxlength="50000" rows="10" placeholder="## Novidade&#10;&#10;Explique a melhoria e use [links](https://f10.com.br) quando necessário." class="w-full resize-y rounded-xl border border-app-border-control bg-app-surface px-3 py-3 font-mono text-[12px] leading-6"></textarea><span class="mt-1 block text-[10px] text-app-text-soft">Aceita títulos, listas, negrito, itálico, citações e links.</span></label>
          <label><span class="mb-1.5 block text-[11px] font-semibold">Imagem de capa</span><input name="cover" type="file" accept="image/png,image/jpeg,image/webp" class="block w-full text-[11px] text-app-text-muted"/></label>
          <label><span class="mb-1.5 block text-[11px] font-semibold">Validade</span><input name="expiresAt" type="datetime-local" class="h-11 w-full rounded-xl border border-app-border-control bg-app-surface px-3 text-[12px]"/><span class="mt-1 block text-[10px] text-app-text-soft">Vazio = não expira.</span></label>
          <div class="flex flex-wrap gap-4 lg:col-span-2">
            <label class="flex items-center gap-2 text-[11px] font-semibold"><input name="active" type="checkbox" checked/>Ativo</label>
            <label class="flex items-center gap-2 text-[11px] font-semibold"><input name="pinned" type="checkbox"/>Fixado no topo</label>
          </div>
          <button type="submit" class="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-app-primary px-4 text-[11px] font-semibold text-white lg:col-span-2"><Megaphone size={15}/>Publicar novidade</button>
        </form>
      </details>
    {/if}

    <section class="overflow-hidden rounded-[22px] border border-app-border bg-app-surface">
      <header class="flex items-center gap-3 border-b border-app-border-soft px-5 py-4">
        <span class="flex h-10 w-10 items-center justify-center rounded-xl bg-app-info-bg text-app-primary"><Megaphone size={18}/></span>
        <div><h1 class="text-[15px] font-semibold">Novidades F10</h1><p class="text-[11px] text-app-text-soft">{data.updates.length} publicação(ões)</p></div>
      </header>

      {#if data.updates.length === 0}
        <p class="px-5 py-12 text-center text-[12px] text-app-text-soft">Nenhuma novidade criada.</p>
      {:else}
        <div class="divide-y divide-app-border-soft">
          {#each data.updates as update}
            <details class="group">
              <summary class="flex cursor-pointer list-none items-center gap-4 px-5 py-4 hover:bg-app-subtle">
                {#if update.coverStorageKey}<img src={"/api/iframef10/updates/" + update.id + "/cover"} alt="" class="h-16 w-24 shrink-0 rounded-xl object-cover"/>{:else}<span class="flex h-16 w-24 shrink-0 items-center justify-center rounded-xl bg-app-muted text-app-text-soft"><ImageIcon size={18}/></span>{/if}
                <div class="min-w-0 flex-1">
                  <div class="flex flex-wrap items-center gap-2"><strong class="truncate text-[13px]">{update.title}</strong>{#if update.pinned}<span class="inline-flex items-center gap-1 rounded-full bg-app-info-bg px-2 py-1 text-[9px] font-bold text-app-primary"><Pin size={10}/>FIXADO</span>{/if}{#if !update.active}<span class="rounded-full bg-app-danger-bg px-2 py-1 text-[9px] font-bold text-app-danger-text">INATIVO</span>{/if}</div>
                  <p class="mt-1 text-[10px] text-app-text-soft">Validade: {formatDate(update.expiresAt)}</p>
                </div>
                {#if update.active}<a href={"/iframef10/novidades/" + update.slug} target="_blank" rel="noreferrer" on:click|stopPropagation class="flex h-9 w-9 items-center justify-center rounded-xl border border-app-border-control text-app-primary" aria-label="Abrir"><ExternalLink size={14}/></a>{/if}
              </summary>

              {#if data.canEdit}
                <div class="border-t border-app-border-soft bg-app-subtle p-5">
                  <form method="POST" action="?/update" enctype="multipart/form-data" class="grid gap-4 lg:grid-cols-2">
                    <input type="hidden" name="updateId" value={update.id}/>
                    <label class="lg:col-span-2"><span class="mb-1.5 block text-[11px] font-semibold">Título</span><input name="title" required maxlength="160" value={update.title} class="h-11 w-full rounded-xl border border-app-border-control bg-app-surface px-3 text-[12px]"/></label>
                    <label class="lg:col-span-2"><span class="mb-1.5 block text-[11px] font-semibold">Markdown</span><textarea name="bodyMarkdown" required maxlength="50000" rows="10" class="w-full resize-y rounded-xl border border-app-border-control bg-app-surface px-3 py-3 font-mono text-[12px] leading-6">{update.bodyMarkdown}</textarea></label>
                    <label><span class="mb-1.5 block text-[11px] font-semibold">Trocar capa</span><input name="cover" type="file" accept="image/png,image/jpeg,image/webp" class="block w-full text-[11px] text-app-text-muted"/>{#if update.coverStorageKey}<span class="mt-2 flex items-center gap-2 text-[10px]"><input name="removeCover" type="checkbox"/>Remover capa atual</span>{/if}</label>
                    <label><span class="mb-1.5 block text-[11px] font-semibold">Validade</span><input name="expiresAt" type="datetime-local" value={dateTimeLocal(update.expiresAt)} class="h-11 w-full rounded-xl border border-app-border-control bg-app-surface px-3 text-[12px]"/><span class="mt-1 block text-[10px] text-app-text-soft">Vazio = não expira.</span></label>
                    <div class="flex flex-wrap gap-4 lg:col-span-2"><label class="flex items-center gap-2 text-[11px] font-semibold"><input name="active" type="checkbox" checked={update.active}/>Ativo</label><label class="flex items-center gap-2 text-[11px] font-semibold"><input name="pinned" type="checkbox" checked={update.pinned}/>Fixado no topo</label></div>
                    <div class="flex flex-wrap justify-end gap-2 lg:col-span-2">
                      <button type="submit" class="inline-flex h-10 items-center gap-2 rounded-xl bg-app-primary px-4 text-[10px] font-semibold text-white"><Save size={14}/>Salvar</button>
                    </div>
                  </form>
                  <form method="POST" action="?/delete" class="mt-3 flex justify-end" on:submit={(event)=>{if(!confirm("Excluir esta novidade?")) event.preventDefault();}}>
                    <input type="hidden" name="updateId" value={update.id}/>
                    <button type="submit" class="inline-flex h-9 items-center gap-2 rounded-xl border border-app-danger-border px-3 text-[10px] font-semibold text-app-danger-text"><Trash2 size={13}/>Excluir</button>
                  </form>
                </div>
              {/if}
            </details>
          {/each}
        </div>
      {/if}
    </section>
  </div>
</ApplicationContent>
