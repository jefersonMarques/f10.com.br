<script lang="ts">
  import {
    Archive,
    ArrowRight,
    BarChart3,
    BookOpenCheck,
    CircleAlert,
    ExternalLink,
    Eye,
    FilePlus2,
    HardDrive,
    Layers3,
    RotateCcw,
    Trash2,
    UploadCloud,
    X,
  } from "lucide-svelte";
  import ApplicationContent from "$lib/components/application/ApplicationContent.svelte";
  import type { ActionData, PageData } from "./$types";

  export let data: PageData;
  export let form: ActionData;

  const statusLabels: Record<string, string> = {
    draft: "Rascunho",
    review: "Em revisão",
    published: "Publicado",
    archived: "Arquivado",
  };

  let deleteTarget: { id: string; title: string; hasPublicVersion: boolean } | null = null;
  let deleteConfirmation = "";

  $: values = form && "values" in form ? form.values : null;
  $: deleteConfirmationReady = deleteConfirmation.trim().toLocaleLowerCase("pt-BR").replace(/\s+/g, " ") === "quero excluir";

  function openDeleteModal(content: { id: string; title: string; publishedSlug: string | null }): void {
    deleteTarget = {
      id: content.id,
      title: content.title,
      hasPublicVersion: Boolean(content.publishedSlug),
    };
    deleteConfirmation = "";
  }

  function closeDeleteModal(): void {
    deleteTarget = null;
    deleteConfirmation = "";
  }
</script>

<svelte:head><title>Base de Conhecimento | F10 Operations</title></svelte:head>

<svelte:window on:keydown={(event) => event.key === "Escape" && deleteTarget && closeDeleteModal()} />

<ApplicationContent width="wide">
  <div class="mb-3 flex flex-wrap justify-end gap-2">
    <a href="/app/help/insights" class="inline-flex min-h-10 items-center gap-2 rounded-xl border border-[#DDE1EA] bg-white px-4 text-[11px] font-semibold text-[#000A57]"><BarChart3 size={15}/>Insights</a>
    <a href="/app/help/categories" class="inline-flex min-h-10 items-center gap-2 rounded-xl border border-[#DDE1EA] bg-white px-4 text-[11px] font-semibold text-[#000A57]">Categorias</a>
    <a href="/app/help/assets" class="inline-flex min-h-10 items-center gap-2 rounded-xl border border-[#DDE1EA] bg-white px-4 text-[11px] font-semibold text-[#000A57]"><HardDrive size={15}/>Biblioteca</a>
    {#if data.canEdit}<a href="/app/help/content/import" class="inline-flex min-h-10 items-center gap-2 rounded-xl border border-[#DDE1EA] bg-white px-4 text-[11px] font-semibold text-[#000A57]"><UploadCloud size={15}/>Importar</a>{/if}
  </div>

  {#if form?.message}
    <div class="mb-3 flex items-start gap-3 rounded-2xl border border-[#F0C8C8] bg-[#FFF5F5] px-4 py-3 text-[12px] font-medium text-[#9B2C2C]"><CircleAlert size={18}/><span>{form.message}</span></div>
  {/if}

  <section class="grid gap-3 md:grid-cols-3">
    <div class="rounded-2xl border border-[#E2E5ED] bg-white p-5"><BookOpenCheck size={20} class="text-[#000A57]"/><strong class="mt-4 block text-[26px] font-semibold">{data.contents.length}</strong><span class="text-[11px] text-[#858A98]">conteúdos estruturados</span></div>
    <div class="rounded-2xl border border-[#E2E5ED] bg-white p-5"><Layers3 size={20} class="text-[#000A57]"/><strong class="mt-4 block text-[26px] font-semibold">{data.contents.reduce((total, content) => total + content.stepCount, 0)}</strong><span class="text-[11px] text-[#858A98]">passos cadastrados</span></div>
    <div class="rounded-2xl border border-[#E2E5ED] bg-white p-5"><strong class="block text-[15px] font-semibold text-[#11182C]">Conhecimento único</strong><span class="mt-2 block text-[11px] leading-5 text-[#858A98]">Central, artigos e chat usarão a mesma publicação estruturada.</span></div>
  </section>

  <div class="mt-5 grid gap-5 xl:grid-cols-[minmax(0,1fr)_410px]">
    <section class="overflow-hidden rounded-[22px] border border-[#E2E5ED] bg-white">
      <header class="border-b border-[#EEF0F5] px-5 py-4 sm:px-6"><h2 class="text-[16px] font-semibold text-[#11182C]">Conteúdos</h2><p class="mt-1 text-[11px] text-[#858A98]">Cada conteúdo deve participar de pelo menos uma categoria ativa.</p></header>
      {#if data.contents.length === 0}
        <div class="px-6 py-16 text-center"><BookOpenCheck size={34} class="mx-auto text-[#B6BBC7]"/><p class="mt-4 text-[13px] font-semibold text-[#4B5160]">Nenhum conteúdo estruturado</p></div>
      {:else}
        <div class="divide-y divide-[#EEF0F5]">
          {#each data.contents as content}
            <div class={`px-5 py-4 transition sm:px-6 ${content.status === "archived" ? "bg-[#FAFAFC] opacity-80" : "hover:bg-[#FAFAFC]"}`}>
              <div class="flex flex-col justify-between gap-4 lg:flex-row lg:items-center">
                <a href={`/app/help/content/${content.id}`} class="group min-w-0 flex-1">
                  <div class="flex flex-wrap items-center gap-2"><strong class="truncate text-[13px] font-semibold text-[#252B3B]">{content.title}</strong><span class={`application-text-meta rounded-full px-2 py-1 font-bold uppercase tracking-[0.05em] ${content.status === "published" ? "bg-[#EEF8F1] text-[#2F7045]" : content.status === "archived" ? "bg-[#F1F1F3] text-[#676D7D]" : "bg-[#F2F3F7] text-[#707687]"}`}>{statusLabels[content.status] ?? content.status}</span></div>
                  <p class="application-text-caption mt-1 truncate text-[#858B99]">{content.categories.length ? content.categories.map((category) => category.name).join(" · ") : "Sem categoria"} · {content.stepCount} {content.stepCount === 1 ? "passo" : "passos"} · /{content.slug}</p>
                  {#if content.summary}<p class="mt-2 line-clamp-2 max-w-[780px] text-[11px] leading-5 text-[#737989]">{content.summary}</p>{/if}
                </a>
                <div class="flex shrink-0 flex-wrap items-center gap-2">
                  <a href={`/app/help/content/${content.id}/preview`} class="application-text-meta inline-flex min-h-9 items-center gap-1.5 rounded-lg border border-[#DDE1EA] bg-white px-3 font-semibold text-[#626979]"><Eye size={13}/>Preview</a>
                  {#if content.publishedSlug}<a href={`/ajuda-f10/${content.publishedSlug}`} target="_blank" rel="noopener noreferrer" class="application-text-meta inline-flex min-h-9 items-center gap-1.5 rounded-lg bg-[#000A57] px-3 font-semibold text-white">Ver artigo<ExternalLink size={12}/></a>{:else if content.status !== "archived"}<a href={`/app/help/content/${content.id}`} class="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-[#F3F4F7] text-[#777D8D]" aria-label="Editar"><ArrowRight size={14}/></a>{/if}

                  {#if data.canEdit && content.status === "draft"}
                    <button type="button" on:click={() => openDeleteModal(content)} class="application-text-meta inline-flex min-h-9 items-center gap-1.5 rounded-lg border border-[#F0C8C8] bg-white px-3 font-semibold text-[#9B2C2C]"><Trash2 size={12}/>Excluir</button>
                  {:else if data.canEdit && content.status === "archived"}
                    <form method="POST" action="?/restore"><input type="hidden" name="contentId" value={content.id}/><button type="submit" class="application-text-meta inline-flex min-h-9 items-center gap-1.5 rounded-lg border border-[#D8DDF4] bg-white px-3 font-semibold text-[#000A57]"><RotateCcw size={12}/>Restaurar</button></form>
                  {:else if data.canArchive && content.status === "published"}
                    <form method="POST" action="?/archive" on:submit={(event) => { if (!confirm("Arquivar este conteúdo? Ele sairá da Central e da IA pública.")) event.preventDefault(); }}><input type="hidden" name="contentId" value={content.id}/><button type="submit" class="application-text-meta inline-flex min-h-9 items-center gap-1.5 rounded-lg border border-[#DDE1EA] bg-white px-3 font-semibold text-[#626979]"><Archive size={12}/>Arquivar</button></form>
                  {/if}
                </div>
              </div>
            </div>
          {/each}
        </div>
      {/if}
    </section>

    {#if data.canEdit}
      <section class="h-fit rounded-[22px] border border-[#E2E5ED] bg-white p-5 sm:p-6">
        <div class="flex items-start gap-3"><span class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#FFF0E4] text-[#EA6D0B]"><FilePlus2 size={19}/></span><div><h2 class="text-[16px] font-semibold text-[#11182C]">Novo conteúdo</h2><p class="mt-1 text-[11px] leading-5 text-[#858A98]">Escolha uma categoria editorial real. A categoria técnica “Sem categoria” é reservada às importações automáticas.</p></div></div>
        <form method="POST" action="?/create" class="mt-6 space-y-4">
          <label class="block"><span class="mb-1.5 block text-[11px] font-semibold text-[#4A5060]">Título</span><input name="title" required maxlength="160" value={values?.title ?? ""} placeholder="Ex.: Como cadastrar uma turma" class="h-11 w-full rounded-xl border border-[#DDE1EA] px-3 text-[12px]" /></label>
          <label class="block"><span class="mb-1.5 block text-[11px] font-semibold text-[#4A5060]">Endereço</span><input name="slug" maxlength="120" value={values?.slug ?? ""} placeholder="Gerado automaticamente se vazio" class="h-11 w-full rounded-xl border border-[#DDE1EA] px-3 text-[12px]" /></label>
          <label class="block"><span class="mb-1.5 block text-[11px] font-semibold text-[#4A5060]">Categoria *</span><select name="categoryId" required class="h-11 w-full rounded-xl border border-[#DDE1EA] bg-white px-3 text-[12px]"><option value="">Selecione</option>{#each data.categories as category}<option value={category.id} selected={values?.categoryId === category.id}>{category.name}</option>{/each}</select></label>
          <label class="block"><span class="mb-1.5 block text-[11px] font-semibold text-[#4A5060]">Resumo</span><textarea name="summary" maxlength="320" rows="3" class="w-full rounded-xl border border-[#DDE1EA] px-3 py-2.5 text-[12px]">{values?.summary ?? ""}</textarea></label>
          {#if data.categories.length === 0}<p class="rounded-xl border border-[#F0C8C8] bg-[#FFF5F5] px-3 py-2 text-[10px] text-[#9B2C2C]">Crie ao menos uma categoria editorial ativa antes de criar artigos manualmente.</p>{/if}
          <button type="submit" disabled={data.categories.length === 0} class="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-[#000A57] px-4 text-[12px] font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"><FilePlus2 size={17}/>Criar e preencher Passo 1</button>
        </form>
      </section>
    {/if}
  </div>
</ApplicationContent>

{#if deleteTarget}
  <div class="fixed inset-0 z-[120] flex items-center justify-center bg-[#050A1A]/55 px-4" role="presentation" on:click={(event) => event.currentTarget === event.target && closeDeleteModal()}>
    <section role="dialog" aria-modal="true" aria-labelledby="delete-help-content-title" class="w-full max-w-[520px] rounded-[24px] border border-[#F0C8C8] bg-white p-5 shadow-2xl sm:p-6">
      <div class="flex items-start justify-between gap-4">
        <div><h2 id="delete-help-content-title" class="text-[17px] font-semibold text-[#7F2525]">Excluir rascunho definitivamente</h2><p class="mt-1 text-[11px] leading-5 text-[#777D8D]">{deleteTarget.title}</p></div>
        <button type="button" on:click={closeDeleteModal} class="flex h-9 w-9 items-center justify-center rounded-lg text-[#777D8D] hover:bg-[#F3F4F7]" aria-label="Fechar"><X size={16}/></button>
      </div>

      <div class="mt-4 rounded-2xl border border-[#F2DADA] bg-[#FFF7F7] px-4 py-3 text-[10px] leading-5 text-[#7D4A4A]">
        Esta ação remove o conteúdo, versões editoriais, publicação e índice de pesquisa relacionados. Não pode ser desfeita.
        {#if deleteTarget.hasPublicVersion}<strong class="mt-2 block text-[#8C2F2F]">Este rascunho ainda possui uma versão pública anterior. Ela também será retirada imediatamente.</strong>{/if}
      </div>

      <form method="POST" action="?/discard" class="mt-5 space-y-4">
        <input type="hidden" name="contentId" value={deleteTarget.id}/>
        <label class="block"><span class="mb-1.5 block text-[11px] font-semibold text-[#4A5060]">Digite <strong>quero excluir</strong> para confirmar</span><input name="confirmation" bind:value={deleteConfirmation} autocomplete="off" autofocus class="h-11 w-full rounded-xl border border-[#DDE1EA] px-3 text-[12px] outline-none focus:border-[#9B2C2C]" /></label>
        <div class="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button type="button" on:click={closeDeleteModal} class="min-h-10 rounded-xl border border-[#DDE1EA] bg-white px-4 text-[11px] font-semibold text-[#626979]">Cancelar</button>
          <button type="submit" disabled={!deleteConfirmationReady} class="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl bg-[#9B2C2C] px-4 text-[11px] font-semibold text-white disabled:cursor-not-allowed disabled:opacity-40"><Trash2 size={14}/>Excluir definitivamente</button>
        </div>
      </form>
    </section>
  </div>
{/if}
