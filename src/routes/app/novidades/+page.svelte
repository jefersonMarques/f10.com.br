<script lang="ts">
  import { ExternalLink, Megaphone, Plus } from "lucide-svelte";
  import ApplicationContent from "$lib/components/application/ApplicationContent.svelte";
  import type { ActionData, PageData } from "./$types";

  export let data: PageData;
  export let form: ActionData;

  const statusLabel: Record<string, string> = {
    draft: "Rascunho",
    review: "Revisão",
    published: "Publicado",
    archived: "Arquivado",
  };

  function formatDate(value: string | Date | null): string {
    if (!value) return "Ainda não publicado";
    return new Intl.DateTimeFormat("pt-BR", { dateStyle: "medium" }).format(new Date(value));
  }
</script>

<svelte:head><title>Novidades F10 | Operations</title></svelte:head>

<ApplicationContent width="wide">
  <div class="flex flex-col gap-5">
    {#if data.canEdit}
      <details class="rounded-[22px] border border-app-border bg-app-surface p-5 shadow-sm">
        <summary class="flex cursor-pointer list-none items-center gap-2 text-[13px] font-semibold text-app-text">
          <Plus size={16}/>Nova atualização
        </summary>
        <form method="POST" action="?/create" class="mt-4 grid gap-3 md:grid-cols-2">
          <input name="title" required maxlength="160" placeholder="Título da novidade" class="h-11 rounded-xl border border-app-border-control bg-app-surface px-3 text-[12px] md:col-span-2"/>
          <textarea name="summary" maxlength="320" rows="3" placeholder="Resumo curto" class="rounded-xl border border-app-border-control bg-app-surface px-3 py-2.5 text-[12px] md:col-span-2"></textarea>
          <select name="categoryId" required class="h-11 rounded-xl border border-app-border-control bg-app-surface px-3 text-[12px]">
            <option value="">Categoria...</option>
            {#each data.categories as category}<option value={category.id}>{category.name}</option>{/each}
          </select>
          <button type="submit" class="h-11 rounded-xl bg-app-primary px-4 text-[11px] font-semibold text-white">Criar e editar</button>
        </form>
        {#if form?.message}<p class="mt-3 text-[11px] font-medium text-app-danger-text">{form.message}</p>{/if}
      </details>
    {/if}

    <section class="overflow-hidden rounded-[22px] border border-app-border bg-app-surface">
      <header class="flex items-center gap-3 border-b border-app-border-soft px-5 py-4">
        <span class="flex h-10 w-10 items-center justify-center rounded-xl bg-app-info-bg text-app-primary"><Megaphone size={18}/></span>
        <div><h1 class="text-[15px] font-semibold">Atualizações F10</h1><p class="mt-0.5 text-[11px] text-app-text-soft">{data.contents.length} conteúdo(s)</p></div>
      </header>

      {#if data.contents.length === 0}
        <p class="px-5 py-12 text-center text-[12px] text-app-text-soft">Nenhuma atualização criada.</p>
      {:else}
        <div class="divide-y divide-app-border-soft">
          {#each data.contents as content}
            <article class="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
              <div class="min-w-0">
                <div class="flex flex-wrap items-center gap-2">
                  <a href={`/app/help/content/${content.id}`} class="truncate text-[13px] font-semibold text-app-text hover:text-app-primary">{content.title}</a>
                  <span class="rounded-full bg-app-muted px-2 py-1 text-[9px] font-bold uppercase text-app-text-muted">{statusLabel[content.status] ?? content.status}</span>
                </div>
                {#if content.summary}<p class="mt-1 line-clamp-2 text-[11px] leading-5 text-app-text-muted">{content.summary}</p>{/if}
                <p class="mt-1 text-[10px] text-app-text-soft">{formatDate(content.publishedAt)} · {content.categories.map((category) => category.name).join(" · ")}</p>
              </div>
              <div class="flex shrink-0 gap-2">
                <a href={`/app/help/content/${content.id}`} class="inline-flex h-9 items-center rounded-xl border border-app-border-control px-3 text-[10px] font-semibold text-app-primary">Editar</a>
                {#if content.publishedSlug}<a href={`/iframef10/novidades/${content.publishedSlug}`} target="_blank" rel="noreferrer" class="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-app-border-control text-app-primary" aria-label="Abrir publicação"><ExternalLink size={14}/></a>{/if}
              </div>
            </article>
          {/each}
        </div>
      {/if}
    </section>
  </div>
</ApplicationContent>
