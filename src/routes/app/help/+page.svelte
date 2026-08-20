<script lang="ts">
  import {
    BookOpen,
    CheckCircle2,
    CircleAlert,
    FilePlus2,
    GitBranch,
    Library,
    PlaySquare,
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

  $: createValues =
    form && form.action === "createArticle" && "values" in form
      ? form.values
      : null;
</script>

<svelte:head>
  <title>Central de Ajuda | F10 Operations</title>
</svelte:head>

<ApplicationContent width="standard">
  {#if data.canEdit}
    <div class="mb-3 flex justify-end">
      <form method="POST" action="?/importLegacy">
        <button
          type="submit"
          class="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-[#DDE1EA] bg-white px-4 text-[11px] font-semibold text-[#000A57] shadow-sm transition hover:bg-[#F8F9FC]"
        >
          <GitBranch size={15} aria-hidden="true" />
          Importar conteúdo atual
        </button>
      </form>
    </div>
  {/if}

  {#if form?.message}
    <div
      class={`mb-3 flex items-start gap-3 rounded-2xl border px-4 py-3 text-[12px] font-medium ${
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

  <section class="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
    <div class="rounded-2xl border border-[#E2E5ED] bg-white p-5">
      <Library size={20} class="text-[#000A57]" aria-hidden="true" />
      <strong class="mt-4 block text-[26px] font-semibold">{data.summary.articles}</strong>
      <span class="text-[11px] text-[#858A98]">conteúdos editoriais</span>
    </div>
    <div class="rounded-2xl border border-[#E2E5ED] bg-white p-5">
      <BookOpen size={20} class="text-[#000A57]" aria-hidden="true" />
      <strong class="mt-4 block text-[26px] font-semibold">{data.summary.destinations}</strong>
      <span class="text-[11px] text-[#858A98]">destinos de ajuda</span>
    </div>
    <div class="rounded-2xl border border-[#E2E5ED] bg-white p-5">
      <GitBranch size={20} class="text-[#000A57]" aria-hidden="true" />
      <strong class="mt-4 block text-[26px] font-semibold">{data.summary.questions}</strong>
      <span class="text-[11px] text-[#858A98]">perguntas interativas</span>
    </div>
    <div class="rounded-2xl border border-[#E2E5ED] bg-white p-5">
      <PlaySquare size={20} class="text-[#000A57]" aria-hidden="true" />
      <strong class="mt-4 block text-[26px] font-semibold">{data.summary.trainings}</strong>
      <span class="text-[11px] text-[#858A98]">treinamentos</span>
    </div>
  </section>

  <div class="mt-5 grid gap-5 xl:grid-cols-[minmax(0,1fr)_420px]">
    <section class="overflow-hidden rounded-[22px] border border-[#E2E5ED] bg-white">
      <header class="flex items-center justify-between gap-4 border-b border-[#EEF0F5] px-5 py-4 sm:px-6">
        <div>
          <h2 class="text-[16px] font-semibold text-[#11182C]">Conteúdos</h2>
          <p class="mt-1 text-[11px] text-[#858A98]">Rascunhos e conteúdos publicados pela equipe.</p>
        </div>
      </header>

      {#if data.articles.length === 0}
        <div class="px-6 py-14 text-center">
          <BookOpen size={30} class="mx-auto text-[#B5BAC7]" aria-hidden="true" />
          <p class="mt-4 text-[13px] font-semibold text-[#4B5160]">Nenhum conteúdo editorial criado</p>
          <p class="mt-1 text-[11px] text-[#9297A5]">Os fluxos atuais podem ser importados sem afetar a Central pública.</p>
        </div>
      {:else}
        <div class="divide-y divide-[#EEF0F5]">
          {#each data.articles as article}
            <article class="flex flex-col gap-4 px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
              <div class="min-w-0">
                <div class="flex flex-wrap items-center gap-2">
                  <a
                    href={`/app/help/${article.id}`}
                    class="truncate text-[13px] font-semibold text-[#202637] transition hover:text-[#000A57] hover:underline"
                  >
                    {article.title}
                  </a>
                  <span class="application-text-meta rounded-full bg-[#F2F3F7] px-2 py-1 font-bold uppercase tracking-[0.06em] text-[#707687]">
                    {statusLabels[article.status] ?? article.status}
                  </span>
                </div>
                <p class="mt-1 truncate text-[11px] text-[#8B909E]">/{article.slug}</p>
                {#if article.summary}
                  <p class="mt-2 line-clamp-2 text-[12px] leading-5 text-[#666C7D]">{article.summary}</p>
                {/if}
              </div>

              {#if data.canPublish && article.status !== "published"}
                <form method="POST" action="?/publishArticle" class="shrink-0">
                  <input type="hidden" name="articleId" value={article.id} />
                  <button
                    type="submit"
                    class="min-h-9 rounded-lg bg-[#000A57] px-3 text-[11px] font-semibold text-white transition hover:bg-[#111B71]"
                  >
                    Publicar
                  </button>
                </form>
              {/if}
            </article>
          {/each}
        </div>
      {/if}
    </section>

    {#if data.canEdit}
      <section class="rounded-[22px] border border-[#E2E5ED] bg-white p-5 sm:p-6">
        <div class="flex items-start gap-3">
          <span class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#FFF0E4] text-[#EA6D0B]">
            <FilePlus2 size={19} aria-hidden="true" />
          </span>
          <div>
            <h2 class="text-[16px] font-semibold text-[#11182C]">Novo conteúdo</h2>
            <p class="mt-1 text-[11px] leading-5 text-[#858A98]">Cria um rascunho simples para evolução no editor.</p>
          </div>
        </div>

        <form method="POST" action="?/createArticle" class="mt-6 space-y-4">
          <label class="block">
            <span class="mb-1.5 block text-[11px] font-semibold text-[#4A5060]">Título</span>
            <input name="title" required maxlength="160" value={createValues?.title ?? ""} class="h-11 w-full rounded-xl border border-[#DDE1EA] px-3 text-[13px] outline-none transition focus:border-[#000A57] focus:ring-2 focus:ring-[#000A57]/10" />
          </label>

          <label class="block">
            <span class="mb-1.5 block text-[11px] font-semibold text-[#4A5060]">Endereço</span>
            <input name="slug" maxlength="120" value={createValues?.slug ?? ""} placeholder="gerado a partir do título" class="h-11 w-full rounded-xl border border-[#DDE1EA] px-3 text-[13px] outline-none transition focus:border-[#000A57] focus:ring-2 focus:ring-[#000A57]/10" />
          </label>

          <label class="block">
            <span class="mb-1.5 block text-[11px] font-semibold text-[#4A5060]">Resumo</span>
            <textarea name="summary" maxlength="320" rows="3" value={createValues?.summary ?? ""} class="w-full resize-y rounded-xl border border-[#DDE1EA] px-3 py-2.5 text-[13px] outline-none transition focus:border-[#000A57] focus:ring-2 focus:ring-[#000A57]/10"></textarea>
          </label>

          <label class="block">
            <span class="mb-1.5 block text-[11px] font-semibold text-[#4A5060]">Conteúdo</span>
            <textarea name="bodyText" required maxlength="50000" rows="9" value={createValues?.bodyText ?? ""} placeholder="Separe os parágrafos com uma linha em branco." class="w-full resize-y rounded-xl border border-[#DDE1EA] px-3 py-2.5 text-[13px] leading-6 outline-none transition focus:border-[#000A57] focus:ring-2 focus:ring-[#000A57]/10"></textarea>
          </label>

          <button type="submit" class="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-[#000A57] px-4 text-[12px] font-semibold text-white transition hover:bg-[#111B71]">
            <FilePlus2 size={17} aria-hidden="true" />
            Criar rascunho
          </button>
        </form>
      </section>
    {/if}
  </div>

  <section class="mt-5 rounded-[22px] border border-dashed border-[#CFD3DD] bg-[#FAFAFC] px-5 py-5 sm:px-6">
    <div class="flex items-start gap-3">
      <GitBranch size={20} class="mt-0.5 shrink-0 text-[#EA6D0B]" aria-hidden="true" />
      <div>
        <h2 class="text-[13px] font-semibold text-[#323848]">Transição sem impacto no site público</h2>
        <p class="mt-1 max-w-[900px] text-[11px] leading-5 text-[#777D8D]">Nesta fase, os dados são administrados no PostgreSQL, mas a rota pública /ajuda-f10 continua usando a estrutura atual em TypeScript. A troca para leitura dinâmica será feita somente depois de validar a importação e o mecanismo de publicação.</p>
      </div>
    </div>
  </section>
</ApplicationContent>
