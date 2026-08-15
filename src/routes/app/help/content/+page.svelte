<script lang="ts">
  import {
    ArrowRight,
    BookOpenCheck,
    BrainCircuit,
    CircleAlert,
    FilePlus2,
    Layers3,
    UploadCloud,
  } from "lucide-svelte";
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

<svelte:head>
  <title>Base de Conhecimento | F10 Operations</title>
</svelte:head>

<div class="mx-auto max-w-[1480px] px-5 py-7 sm:px-8 sm:py-9">
  <div class="flex flex-col justify-between gap-5 lg:flex-row lg:items-end">
    <div>
      <p class="text-[10px] font-bold uppercase tracking-[0.14em] text-[#EA6D0B]">
        Conhecimento estruturado
      </p>
      <h1 class="mt-2 text-[30px] font-semibold tracking-[-0.035em] text-[#010D28] sm:text-[38px]">
        Base de Conhecimento
      </h1>
      <p class="mt-2 max-w-[780px] text-[14px] leading-6 text-[#6F7585]">
        Crie procedimentos em passos. Cada passo pode combinar texto, imagem e vídeo e manter contexto exclusivo para a IA.
      </p>
    </div>

    {#if data.canEdit}
      <a href="/app/help/content/import" class="inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-xl border border-[#DDE1EA] bg-white px-4 text-[11px] font-semibold text-[#000A57] transition hover:bg-[#F8F9FF]">
        <UploadCloud size={16} aria-hidden="true" />
        Importar conteúdos
      </a>
    {/if}
  </div>

  {#if form?.message}
    <div class="mt-6 flex items-start gap-3 rounded-2xl border border-[#F0C8C8] bg-[#FFF5F5] px-4 py-3 text-[12px] font-medium text-[#9B2C2C]">
      <CircleAlert size={18} class="mt-0.5 shrink-0" aria-hidden="true" />
      <span>{form.message}</span>
    </div>
  {/if}

  <section class="mt-7 grid gap-3 md:grid-cols-3">
    <div class="rounded-2xl border border-[#E2E5ED] bg-white p-5">
      <BookOpenCheck size={20} class="text-[#000A57]" aria-hidden="true" />
      <strong class="mt-4 block text-[26px] font-semibold">{data.contents.length}</strong>
      <span class="text-[11px] text-[#858A98]">conteúdos estruturados</span>
    </div>
    <div class="rounded-2xl border border-[#E2E5ED] bg-white p-5">
      <Layers3 size={20} class="text-[#000A57]" aria-hidden="true" />
      <strong class="mt-4 block text-[26px] font-semibold">
        {data.contents.reduce((total, content) => total + content.stepCount, 0)}
      </strong>
      <span class="text-[11px] text-[#858A98]">passos cadastrados</span>
    </div>
    <div class="rounded-2xl border border-[#E2E5ED] bg-white p-5">
      <BrainCircuit size={20} class="text-[#EA6D0B]" aria-hidden="true" />
      <strong class="mt-4 block text-[15px] font-semibold">Fonte única</strong>
      <span class="mt-2 block text-[11px] leading-5 text-[#858A98]">Pesquisa, Central pública e agente de suporte usarão esta mesma base publicada.</span>
    </div>
  </section>

  <div class="mt-7 grid gap-6 xl:grid-cols-[minmax(0,1fr)_410px]">
    <section class="overflow-hidden rounded-[24px] border border-[#E2E5ED] bg-white">
      <header class="border-b border-[#EEF0F5] px-5 py-4 sm:px-6">
        <h2 class="text-[16px] font-semibold text-[#11182C]">Conteúdos</h2>
        <p class="mt-1 text-[11px] text-[#858A98]">O conteúdo bruto é organizado em passos antes da publicação.</p>
      </header>

      {#if data.contents.length === 0}
        <div class="px-6 py-16 text-center">
          <BookOpenCheck size={34} class="mx-auto text-[#B6BBC7]" aria-hidden="true" />
          <p class="mt-4 text-[13px] font-semibold text-[#4B5160]">Nenhum conteúdo estruturado</p>
          <p class="mt-1 text-[11px] text-[#9297A5]">Crie o primeiro procedimento usando o formulário ao lado.</p>
        </div>
      {:else}
        <div class="divide-y divide-[#EEF0F5]">
          {#each data.contents as content}
            <a href={`/app/help/content/${content.id}`} class="group block px-5 py-4 transition hover:bg-[#FAFAFC] sm:px-6">
              <div class="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
                <div class="min-w-0">
                  <div class="flex flex-wrap items-center gap-2">
                    <strong class="truncate text-[13px] font-semibold text-[#252B3B]">{content.title}</strong>
                    <span class={`rounded-full px-2 py-1 text-[9px] font-bold uppercase tracking-[0.05em] ${content.status === "published" ? "bg-[#EEF8F1] text-[#2F7045]" : "bg-[#F2F3F7] text-[#707687]"}`}>
                      {statusLabels[content.status] ?? content.status}
                    </span>
                  </div>
                  <p class="mt-1 truncate text-[10px] text-[#858B99]">
                    {content.category || "Sem categoria"} · {content.stepCount} {content.stepCount === 1 ? "passo" : "passos"} · /{content.slug}
                  </p>
                  {#if content.summary}
                    <p class="mt-2 line-clamp-2 max-w-[780px] text-[11px] leading-5 text-[#737989]">{content.summary}</p>
                  {/if}
                </div>
                <ArrowRight size={17} class="shrink-0 text-[#A0A5B2] transition group-hover:translate-x-1 group-hover:text-[#EA6D0B]" aria-hidden="true" />
              </div>
            </a>
          {/each}
        </div>
      {/if}
    </section>

    {#if data.canEdit}
      <section class="h-fit rounded-[24px] border border-[#E2E5ED] bg-white p-5 sm:p-6">
        <div class="flex items-start gap-3">
          <span class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#FFF0E4] text-[#EA6D0B]">
            <FilePlus2 size={19} aria-hidden="true" />
          </span>
          <div>
            <h2 class="text-[16px] font-semibold text-[#11182C]">Novo conteúdo</h2>
            <p class="mt-1 text-[11px] leading-5 text-[#858A98]">O Passo 1 é criado automaticamente.</p>
          </div>
        </div>

        <form method="POST" action="?/create" class="mt-6 space-y-4">
          <label class="block">
            <span class="mb-1.5 block text-[11px] font-semibold text-[#4A5060]">Título</span>
            <input name="title" required maxlength="160" value={values?.title ?? ""} placeholder="Ex.: Como cadastrar uma turma" class="h-11 w-full rounded-xl border border-[#DDE1EA] px-3 text-[12px] outline-none focus:border-[#000A57]" />
          </label>

          <label class="block">
            <span class="mb-1.5 block text-[11px] font-semibold text-[#4A5060]">Endereço</span>
            <input name="slug" maxlength="120" value={values?.slug ?? ""} placeholder="Gerado automaticamente se vazio" class="h-11 w-full rounded-xl border border-[#DDE1EA] px-3 text-[12px] outline-none focus:border-[#000A57]" />
          </label>

          <label class="block">
            <span class="mb-1.5 block text-[11px] font-semibold text-[#4A5060]">Categoria</span>
            <input name="category" maxlength="120" value={values?.category ?? ""} placeholder="Ex.: Acadêmico" class="h-11 w-full rounded-xl border border-[#DDE1EA] px-3 text-[12px] outline-none focus:border-[#000A57]" />
          </label>

          <label class="block">
            <span class="mb-1.5 block text-[11px] font-semibold text-[#4A5060]">Resumo</span>
            <textarea name="summary" maxlength="320" rows="3" class="w-full resize-y rounded-xl border border-[#DDE1EA] px-3 py-2.5 text-[12px] leading-5 outline-none focus:border-[#000A57]">{values?.summary ?? ""}</textarea>
          </label>

          <label class="block rounded-2xl border border-[#D8DDF4] bg-[#F8F9FF] p-4">
            <span class="flex items-center gap-2 text-[11px] font-semibold text-[#000A57]"><BrainCircuit size={15} aria-hidden="true" /> Conhecimento geral para IA</span>
            <span class="mt-1 block text-[10px] leading-5 text-[#777D8D]">Informações que ajudam o agente, mas não precisam aparecer para o cliente.</span>
            <textarea name="aiGeneralKnowledge" maxlength="20000" rows="5" class="mt-3 w-full resize-y rounded-xl border border-[#D8DDF4] bg-white px-3 py-2.5 text-[11px] leading-5 outline-none focus:border-[#000A57]">{values?.aiGeneralKnowledge ?? ""}</textarea>
          </label>

          <button type="submit" class="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-[#000A57] px-4 text-[12px] font-semibold text-white transition hover:bg-[#111B71]">
            <FilePlus2 size={17} aria-hidden="true" />
            Criar e preencher Passo 1
          </button>
        </form>
      </section>
    {/if}
  </div>
</div>
