<script lang="ts">
  import {
    Bot,
    CheckCircle2,
    CircleAlert,
    Download,
    FileJson2,
    UploadCloud,
    Video,
  } from "lucide-svelte";
  import ApplicationBackLink from "$lib/components/application/ApplicationBackLink.svelte";
  import ApplicationContent from "$lib/components/application/ApplicationContent.svelte";
  import type { ActionData, PageData } from "./$types";

  export let data: PageData;
  export let form: ActionData;

  function formatMegabytes(bytes: number): string {
    return `${Math.round((bytes / 1024 / 1024) * 10) / 10} MB`;
  }
</script>

<svelte:head><title>Importar Base de Conhecimento | F10 Operations</title></svelte:head>

<ApplicationContent width="narrow">
  <div class="mb-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
    <ApplicationBackLink href="/app/help/content" label="Base de Conhecimento" />
    <div class="flex flex-wrap gap-2">
      <a href="/app/help/content/import/prompt" class="application-text-caption inline-flex min-h-10 items-center gap-2 rounded-xl border border-[#DDE1EA] bg-white px-3 font-semibold text-[#000A57]"><Download size={14}/>1. Baixar prompt</a>
      <a href="/templates/f10-help-import-template.json" download class="application-text-caption inline-flex min-h-10 items-center gap-2 rounded-xl border border-[#DDE1EA] bg-white px-3 font-semibold text-[#000A57]"><Download size={14}/>2. Baixar template JSON</a>
    </div>
  </div>

  <section class="rounded-[22px] border border-[#E2E5ED] bg-white p-5 sm:p-6">
    <div class="flex items-start gap-3"><span class="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#FFF3E9] text-[#EA6D0B]"><Video size={20}/></span><div><h1 class="text-[18px] font-semibold text-[#11182C]">Criar conteúdo a partir dos subtitles</h1><p class="mt-1 max-w-[760px] text-[11px] leading-5 text-[#858A98]">Use exatamente os dois arquivos acima junto com os subtitles do vídeo. O prompt é gerado na hora e contém somente as categorias ativas atuais.</p></div></div>

    <ol class="mt-5 grid gap-3 md:grid-cols-4">
      <li class="rounded-2xl border border-[#E2E5ED] bg-[#FAFAFC] p-4"><strong class="text-[11px] text-[#000A57]">1. Baixe</strong><p class="mt-2 text-[10px] leading-5 text-[#777D8D]">Prompt dinâmico e template JSON.</p></li>
      <li class="rounded-2xl border border-[#E2E5ED] bg-[#FAFAFC] p-4"><strong class="text-[11px] text-[#000A57]">2. Envie à IA</strong><p class="mt-2 text-[10px] leading-5 text-[#777D8D]">Prompt + template + subtitles do vídeo.</p></li>
      <li class="rounded-2xl border border-[#E2E5ED] bg-[#FAFAFC] p-4"><strong class="text-[11px] text-[#000A57]">3. Receba</strong><p class="mt-2 text-[10px] leading-5 text-[#777D8D]">Um JSON no contrato F10 Help Import.</p></li>
      <li class="rounded-2xl border border-[#E2E5ED] bg-[#FAFAFC] p-4"><strong class="text-[11px] text-[#000A57]">4. Importe</strong><p class="mt-2 text-[10px] leading-5 text-[#777D8D]">O F10 valida tudo e cria rascunhos para revisão.</p></li>
    </ol>
  </section>

  <section class="mt-4 rounded-[20px] border border-[#D8DDF4] bg-[#F8F9FF] p-5">
    <div class="flex items-start gap-3"><Bot size={18} class="mt-0.5 shrink-0 text-[#000A57]"/><div><h2 class="text-[13px] font-semibold text-[#000A57]">Categorias disponíveis agora</h2><p class="mt-1 text-[10px] leading-5 text-[#6B7180]">A IA só pode escolher estas categorias. Se a lista mudar, baixe um prompt novo.</p></div></div>
    {#if data.categories.length === 0}
      <p class="mt-4 rounded-xl border border-[#F0C8C8] bg-white px-3 py-2 text-[10px] text-[#9B2C2C]">Não há categoria ativa. Crie uma categoria antes de gerar/importar artigos.</p>
    {:else}
      <div class="mt-4 flex flex-wrap gap-2">{#each data.categories as category}<span class="rounded-full border border-[#D8DDF4] bg-white px-3 py-1.5 text-[10px] font-semibold text-[#454C60]">{category.icon ? `${category.icon} ` : ""}{category.name} · {category.slug}</span>{/each}</div>
    {/if}
  </section>

  {#if form?.message}<div class={`mt-4 flex items-start gap-3 rounded-2xl border px-4 py-3 text-[11px] font-medium ${form.success ? "border-[#B9E6C9] bg-[#F1FBF4] text-[#176B35]" : "border-[#F0C8C8] bg-[#FFF5F5] text-[#9B2C2C]"}`}>{#if form.success}<CheckCircle2 size={18}/>{:else}<CircleAlert size={18}/>{/if}<span>{form.message}</span></div>{/if}

  {#if form && "summary" in form && form.summary}
    <section class="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
      <div class="rounded-xl bg-white p-4"><span class="application-text-meta font-bold uppercase text-[#959AA8]">Origem</span><strong class="mt-2 block text-[12px]">{form.summary.source || "-"}</strong></div>
      <div class="rounded-xl bg-white p-4"><span class="application-text-meta font-bold uppercase text-[#959AA8]">Conteúdos</span><strong class="mt-2 block text-[20px]">{form.summary.contentCount}</strong></div>
      <div class="rounded-xl bg-white p-4"><span class="application-text-meta font-bold uppercase text-[#959AA8]">Passos</span><strong class="mt-2 block text-[20px]">{form.summary.stepCount}</strong></div>
      <div class="rounded-xl bg-white p-4"><span class="application-text-meta font-bold uppercase text-[#959AA8]">Blocos</span><strong class="mt-2 block text-[20px]">{form.summary.blockCount}</strong></div>
      <div class="rounded-xl bg-white p-4"><span class="application-text-meta font-bold uppercase text-[#959AA8]">Mídias</span><strong class="mt-2 block text-[20px]">{form.summary.assetCount ?? 0}</strong></div>
    </section>
  {/if}

  {#if form && "issues" in form && form.issues.length > 0}
    <section class="mt-4 rounded-[20px] border border-[#F0C8C8] bg-white p-5"><h2 class="text-[13px] font-semibold text-[#8D3333]">Problemas encontrados</h2><ul class="application-text-caption mt-3 space-y-2 leading-5 text-[#725454]">{#each form.issues as issue}<li class="rounded-xl bg-[#FFF7F7] px-3 py-2">{issue}</li>{/each}</ul></section>
  {/if}

  {#if form && "imported" in form && form.imported && form.imported.length > 0}
    <section class="mt-4 overflow-hidden rounded-[20px] border border-[#DCEDE2] bg-white"><header class="border-b px-5 py-4"><h2 class="text-[13px] font-semibold text-[#225C37]">Conteúdos importados</h2></header><div class="divide-y">{#each form.imported as item}<a href={`/app/help/content/${item.id}`} class="flex items-center justify-between px-5 py-3 text-[11px] hover:bg-[#FAFAFC]"><div class="min-w-0"><strong class="block truncate">{item.title}</strong><span class="application-text-meta text-[#999EAA]">ID externo: {item.externalId}</span></div><span class="font-semibold text-[#000A57]">Revisar</span></a>{/each}</div></section>
  {/if}

  {#if data.canImport}
    <section class="mt-5 rounded-[22px] border border-[#E2E5ED] bg-white p-5 sm:p-6">
      <div class="flex items-start gap-3"><span class="flex h-11 w-11 items-center justify-center rounded-xl bg-[#EEF0FF] text-[#000A57]"><UploadCloud size={20}/></span><div><h2 class="text-[15px] font-semibold">Importar JSON gerado pela IA</h2><p class="application-text-caption mt-1 text-[#858B99]">Até {formatMegabytes(data.maxImportBytes)}. Categorias desconhecidas, subtitles ausentes ou contrato inválido cancelam o lote.</p></div></div>
      <form method="POST" action="?/import" enctype="multipart/form-data" class="mt-6">
        <label class="block rounded-2xl border border-dashed border-[#CBD0DC] bg-[#FAFBFD] p-6 text-center"><FileJson2 size={30} class="mx-auto text-[#A7ADBA]"/><span class="mt-3 block text-[12px] font-semibold">Selecione o JSON final</span><span class="application-text-caption mt-1 block text-[#9297A5]">Somente f10-help-import version 1</span><input type="file" name="file" accept="application/json,.json" required class="application-text-caption mx-auto mt-4 block max-w-full" /></label>
        <div class="application-text-caption mt-4 rounded-xl bg-[#F8F9FF] px-4 py-3 leading-5 text-[#5F6575]">A importação nunca publica automaticamente. Revise categorias, links, textos e subtitles no editor antes de publicar.</div>
        <button type="submit" disabled={data.categories.length === 0} class="mt-4 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-[#000A57] px-5 text-[12px] font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"><UploadCloud size={17}/>Validar e importar como rascunho</button>
      </form>
    </section>
  {/if}
</ApplicationContent>
