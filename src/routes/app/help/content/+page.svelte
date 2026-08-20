<script lang="ts">
  import {
    Archive,
    ArrowRight,
    BookOpenCheck,
    BrainCircuit,
    CircleAlert,
    ExternalLink,
    Eye,
    FilePlus2,
    HardDrive,
    Layers3,
    Trash2,
    UploadCloud,
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

  $: values = form && "values" in form ? form.values : null;
</script>

<svelte:head><title>Base de Conhecimento | F10 Operations</title></svelte:head>

<ApplicationContent width="wide">
  <div class="mb-3 flex flex-wrap justify-end gap-2">
    <a href="/app/help/assets" class="inline-flex min-h-10 items-center gap-2 rounded-xl border border-[#DDE1EA] bg-white px-4 text-[11px] font-semibold text-[#000A57]"><HardDrive size={15}/>Biblioteca</a>
    {#if data.canEdit}<a href="/app/help/content/import" class="inline-flex min-h-10 items-center gap-2 rounded-xl border border-[#DDE1EA] bg-white px-4 text-[11px] font-semibold text-[#000A57]"><UploadCloud size={15}/>Importar</a>{/if}
  </div>

  {#if form?.message}<div class="mb-3 flex items-start gap-3 rounded-2xl border border-[#F0C8C8] bg-[#FFF5F5] px-4 py-3 text-[12px] font-medium text-[#9B2C2C]"><CircleAlert size={18}/><span>{form.message}</span></div>{/if}

  <section class="grid gap-3 md:grid-cols-3">
    <div class="rounded-2xl border border-[#E2E5ED] bg-white p-5"><BookOpenCheck size={20} class="text-[#000A57]"/><strong class="mt-4 block text-[26px] font-semibold">{data.contents.length}</strong><span class="text-[11px] text-[#858A98]">conteúdos estruturados</span></div>
    <div class="rounded-2xl border border-[#E2E5ED] bg-white p-5"><Layers3 size={20} class="text-[#000A57]"/><strong class="mt-4 block text-[26px] font-semibold">{data.contents.reduce((total, content) => total + content.stepCount, 0)}</strong><span class="text-[11px] text-[#858A98]">passos cadastrados</span></div>
    <div class="rounded-2xl border border-[#E2E5ED] bg-white p-5"><BrainCircuit size={20} class="text-[#EA6D0B]"/><strong class="mt-4 block text-[15px] font-semibold">Fonte única</strong><span class="mt-2 block text-[11px] leading-5 text-[#858A98]">Pesquisa, Central pública e agente de suporte consomem a publicação desta base.</span></div>
  </section>

  <div class="mt-5 grid gap-5 xl:grid-cols-[minmax(0,1fr)_410px]">
    <section class="overflow-hidden rounded-[22px] border border-[#E2E5ED] bg-white">
      <header class="border-b border-[#EEF0F5] px-5 py-4 sm:px-6"><h2 class="text-[16px] font-semibold text-[#11182C]">Conteúdos</h2><p class="mt-1 text-[11px] text-[#858A98]">Rascunhos podem ser descartados antes da primeira publicação. Conteúdos já publicados podem ser arquivados para sair da Central e da IA sem perder o histórico.</p></header>
      {#if data.contents.length === 0}
        <div class="px-6 py-16 text-center"><BookOpenCheck size={34} class="mx-auto text-[#B6BBC7]"/><p class="mt-4 text-[13px] font-semibold text-[#4B5160]">Nenhum conteúdo estruturado</p></div>
      {:else}
        <div class="divide-y divide-[#EEF0F5]">
          {#each data.contents as content}
            <div class={`px-5 py-4 transition sm:px-6 ${content.status === "archived" ? "bg-[#FAFAFC] opacity-80" : "hover:bg-[#FAFAFC]"}`}>
              <div class="flex flex-col justify-between gap-4 lg:flex-row lg:items-center">
                <a href={`/app/help/content/${content.id}`} class="min-w-0 flex-1 group">
                  <div class="flex flex-wrap items-center gap-2"><strong class="truncate text-[13px] font-semibold text-[#252B3B]">{content.title}</strong><span class={`application-text-meta rounded-full px-2 py-1 font-bold uppercase tracking-[0.05em] ${content.status === "published" ? "bg-[#EEF8F1] text-[#2F7045]" : content.status === "archived" ? "bg-[#F1F1F3] text-[#676D7D]" : "bg-[#F2F3F7] text-[#707687]"}`}>{statusLabels[content.status] ?? content.status}</span></div>
                  <p class="application-text-caption mt-1 truncate text-[#858B99]">{content.category || "Sem categoria"} · {content.stepCount} {content.stepCount === 1 ? "passo" : "passos"} · /{content.slug}</p>
                  {#if content.summary}<p class="mt-2 line-clamp-2 max-w-[780px] text-[11px] leading-5 text-[#737989]">{content.summary}</p>{/if}
                </a>
                <div class="flex shrink-0 flex-wrap items-center gap-2">
                  <a href={`/app/help/content/${content.id}/preview`} class="application-text-meta inline-flex min-h-9 items-center gap-1.5 rounded-lg border border-[#DDE1EA] bg-white px-3 font-semibold text-[#626979]"><Eye size={13}/>Preview</a>
                  {#if content.publishedSlug}
                    <a href={`/ajuda-f10/${content.publishedSlug}`} target="_blank" rel="noopener noreferrer" class="application-text-meta inline-flex min-h-9 items-center gap-1.5 rounded-lg bg-[#000A57] px-3 font-semibold text-white">Ver artigo<ExternalLink size={12}/></a>
                  {:else}
                    <a href={`/app/help/content/${content.id}`} class="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-[#F3F4F7] text-[#777D8D]" aria-label={content.status === "archived" ? "Ver conteúdo arquivado" : "Editar"}><ArrowRight size={14}/></a>
                  {/if}

                  {#if data.canEdit && !content.publishedAt && content.status !== "archived"}
                    <form method="POST" action="?/discard" on:submit={(event) => { if (!confirm("Descartar este conteúdo definitivamente? Esta ação remove o rascunho e não pode ser desfeita.")) event.preventDefault(); }}>
                      <input type="hidden" name="contentId" value={content.id}/>
                      <button type="submit" class="application-text-meta inline-flex min-h-9 items-center gap-1.5 rounded-lg border border-[#F0C8C8] bg-white px-3 font-semibold text-[#9B2C2C] transition hover:bg-[#FFF5F5]"><Trash2 size={12}/>Descartar</button>
                    </form>
                  {:else if data.canArchive && content.publishedAt && content.status !== "archived"}
                    <form method="POST" action="?/archive" on:submit={(event) => { if (!confirm("Arquivar este conteúdo? Ele deixará de aparecer na Central pública e deixará de ser usado pela IA. O histórico será mantido.")) event.preventDefault(); }}>
                      <input type="hidden" name="contentId" value={content.id}/>
                      <button type="submit" class="application-text-meta inline-flex min-h-9 items-center gap-1.5 rounded-lg border border-[#DDE1EA] bg-white px-3 font-semibold text-[#626979] transition hover:bg-[#F5F6F8]"><Archive size={12}/>Arquivar</button>
                    </form>
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
        <div class="flex items-start gap-3"><span class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#FFF0E4] text-[#EA6D0B]"><FilePlus2 size={19}/></span><div><h2 class="text-[16px] font-semibold text-[#11182C]">Novo conteúdo</h2><p class="mt-1 text-[11px] leading-5 text-[#858A98]">O Passo 1 é criado automaticamente.</p></div></div>
        <form method="POST" action="?/create" class="mt-6 space-y-4">
          <label class="block"><span class="mb-1.5 block text-[11px] font-semibold text-[#4A5060]">Título</span><input name="title" required maxlength="160" value={values?.title ?? ""} placeholder="Ex.: Como cadastrar uma turma" class="h-11 w-full rounded-xl border border-[#DDE1EA] px-3 text-[12px] outline-none focus:border-[#000A57]" /></label>
          <label class="block"><span class="mb-1.5 block text-[11px] font-semibold text-[#4A5060]">Endereço</span><input name="slug" maxlength="120" value={values?.slug ?? ""} placeholder="Gerado automaticamente se vazio" class="h-11 w-full rounded-xl border border-[#DDE1EA] px-3 text-[12px] outline-none focus:border-[#000A57]" /></label>
          <label class="block"><span class="mb-1.5 block text-[11px] font-semibold text-[#4A5060]">Categoria</span><input name="category" maxlength="120" value={values?.category ?? ""} class="h-11 w-full rounded-xl border border-[#DDE1EA] px-3 text-[12px]" /></label>
          <label class="block"><span class="mb-1.5 block text-[11px] font-semibold text-[#4A5060]">Resumo</span><textarea name="summary" maxlength="320" rows="3" class="w-full rounded-xl border border-[#DDE1EA] px-3 py-2.5 text-[12px]">{values?.summary ?? ""}</textarea></label>
          <label class="block rounded-2xl border border-[#D8DDF4] bg-[#F8F9FF] p-4"><span class="flex items-center gap-2 text-[11px] font-semibold text-[#000A57]"><BrainCircuit size={15}/>Conhecimento geral para IA</span><textarea name="aiGeneralKnowledge" maxlength="20000" rows="5" class="mt-3 w-full rounded-xl border border-[#D8DDF4] bg-white px-3 py-2.5 text-[11px]">{values?.aiGeneralKnowledge ?? ""}</textarea></label>
          <button type="submit" class="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-[#000A57] px-4 text-[12px] font-semibold text-white"><FilePlus2 size={17}/>Criar e preencher Passo 1</button>
        </form>
      </section>
    {/if}
  </div>
</ApplicationContent>
