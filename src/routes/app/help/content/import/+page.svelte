<script lang="ts">
  import {
    ArrowLeft,
    Bot,
    CheckCircle2,
    CircleAlert,
    Download,
    FileJson2,
    UploadCloud,
  } from "lucide-svelte";
  import type { ActionData, PageData } from "./$types";

  export let data: PageData;
  export let form: ActionData;

  function formatMegabytes(bytes: number): string {
    return `${Math.round((bytes / 1024 / 1024) * 10) / 10} MB`;
  }
</script>

<svelte:head>
  <title>Importar Base de Conhecimento | F10 Operations</title>
</svelte:head>

<div class="mx-auto max-w-[1180px] px-5 py-7 sm:px-8 sm:py-9">
  <a href="/app/help/content" class="inline-flex min-h-10 items-center gap-2 rounded-xl px-2 text-[12px] font-semibold text-[#5F6575] transition hover:bg-white hover:text-[#000A57]">
    <ArrowLeft size={17} aria-hidden="true" />
    Voltar para Base de Conhecimento
  </a>

  <div class="mt-5 flex flex-col justify-between gap-5 lg:flex-row lg:items-end">
    <div>
      <p class="text-[10px] font-bold uppercase tracking-[0.14em] text-[#EA6D0B]">Migração de conteúdo</p>
      <h1 class="mt-2 text-[30px] font-semibold tracking-[-0.035em] text-[#010D28] sm:text-[38px]">Importar conteúdos</h1>
      <p class="mt-2 max-w-[790px] text-[14px] leading-6 text-[#6F7585]">
        Use uma IA externa para organizar artigos, transcrições e vídeos no formato F10. A importação valida o arquivo inteiro e cria tudo como rascunho para revisão antes da publicação.
      </p>
    </div>

    <a href="/templates/f10-help-import-v1.example.json" class="inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-xl border border-[#DDE1EA] bg-white px-4 text-[11px] font-semibold text-[#000A57] transition hover:bg-[#F8F9FF]">
      <Download size={16} aria-hidden="true" />
      Baixar modelo JSON
    </a>
  </div>

  <section class="mt-7 grid gap-4 md:grid-cols-3">
    <div class="rounded-2xl border border-[#E2E5ED] bg-white p-5">
      <FileJson2 size={20} class="text-[#000A57]" aria-hidden="true" />
      <strong class="mt-4 block text-[13px] font-semibold text-[#303645]">Formato versionado</strong>
      <p class="mt-2 text-[10px] leading-5 text-[#858B99]">O arquivo usa <code>f10-help-import</code> versão 1 para permitir evoluções futuras sem quebrar migrações antigas.</p>
    </div>
    <div class="rounded-2xl border border-[#E2E5ED] bg-white p-5">
      <Bot size={20} class="text-[#EA6D0B]" aria-hidden="true" />
      <strong class="mt-4 block text-[13px] font-semibold text-[#303645]">Pronto para IA</strong>
      <p class="mt-2 text-[10px] leading-5 text-[#858B99]">Transcrição, resumo da mídia, conhecimento geral e conhecimento por passo entram na biblioteca privada do agente.</p>
    </div>
    <div class="rounded-2xl border border-[#E2E5ED] bg-white p-5">
      <CheckCircle2 size={20} class="text-[#2F7045]" aria-hidden="true" />
      <strong class="mt-4 block text-[13px] font-semibold text-[#303645]">Sem publicação automática</strong>
      <p class="mt-2 text-[10px] leading-5 text-[#858B99]">Todo conteúdo importado entra como rascunho. A publicação continua sendo uma decisão humana.</p>
    </div>
  </section>

  {#if form?.message}
    <div class={`mt-6 flex items-start gap-3 rounded-2xl border px-4 py-3 text-[11px] font-medium ${form.success ? "border-[#B9E6C9] bg-[#F1FBF4] text-[#176B35]" : "border-[#F0C8C8] bg-[#FFF5F5] text-[#9B2C2C]"}`}>
      {#if form.success}<CheckCircle2 size={18} class="mt-0.5 shrink-0" aria-hidden="true" />{:else}<CircleAlert size={18} class="mt-0.5 shrink-0" aria-hidden="true" />{/if}
      <span>{form.message}</span>
    </div>
  {/if}

  {#if form && "summary" in form && form.summary}
    <section class="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      <div class="rounded-xl bg-white p-4"><span class="text-[9px] font-bold uppercase tracking-[0.08em] text-[#959AA8]">Origem</span><strong class="mt-2 block text-[12px] text-[#303645]">{form.summary.source || "-"}</strong></div>
      <div class="rounded-xl bg-white p-4"><span class="text-[9px] font-bold uppercase tracking-[0.08em] text-[#959AA8]">Conteúdos</span><strong class="mt-2 block text-[20px] text-[#303645]">{form.summary.contentCount}</strong></div>
      <div class="rounded-xl bg-white p-4"><span class="text-[9px] font-bold uppercase tracking-[0.08em] text-[#959AA8]">Passos</span><strong class="mt-2 block text-[20px] text-[#303645]">{form.summary.stepCount}</strong></div>
      <div class="rounded-xl bg-white p-4"><span class="text-[9px] font-bold uppercase tracking-[0.08em] text-[#959AA8]">Blocos</span><strong class="mt-2 block text-[20px] text-[#303645]">{form.summary.blockCount}</strong></div>
    </section>
  {/if}

  {#if form && "issues" in form && form.issues.length > 0}
    <section class="mt-5 rounded-[20px] border border-[#F0C8C8] bg-white p-5">
      <h2 class="text-[13px] font-semibold text-[#8D3333]">Problemas encontrados no arquivo</h2>
      <ul class="mt-3 space-y-2 text-[10px] leading-5 text-[#725454]">
        {#each form.issues as issue}
          <li class="rounded-xl bg-[#FFF7F7] px-3 py-2">{issue}</li>
        {/each}
      </ul>
    </section>
  {/if}

  {#if form && "imported" in form && form.imported && form.imported.length > 0}
    <section class="mt-5 overflow-hidden rounded-[20px] border border-[#DCEDE2] bg-white">
      <header class="border-b border-[#EDF4EF] px-5 py-4"><h2 class="text-[13px] font-semibold text-[#225C37]">Conteúdos importados</h2></header>
      <div class="divide-y divide-[#EEF0F5]">
        {#each form.imported as item}
          <a href={`/app/help/content/${item.id}`} class="flex items-center justify-between gap-3 px-5 py-3 text-[11px] transition hover:bg-[#FAFAFC]">
            <div class="min-w-0"><strong class="block truncate text-[#303645]">{item.title}</strong><span class="mt-1 block text-[9px] text-[#999EAA]">ID externo: {item.externalId}</span></div>
            <span class="shrink-0 font-semibold text-[#000A57]">Revisar</span>
          </a>
        {/each}
      </div>
    </section>
  {/if}

  {#if data.canImport}
    <section class="mt-7 rounded-[24px] border border-[#E2E5ED] bg-white p-5 shadow-[0_10px_32px_rgba(1,13,40,0.04)] sm:p-7">
      <div class="flex items-start gap-3">
        <span class="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#EEF0FF] text-[#000A57]"><UploadCloud size={20} aria-hidden="true" /></span>
        <div><h2 class="text-[15px] font-semibold text-[#202637]">Enviar arquivo JSON</h2><p class="mt-1 text-[10px] leading-5 text-[#858B99]">Limite: {formatMegabytes(data.maxImportBytes)}. Se houver qualquer erro estrutural ou conflito, a transação inteira é cancelada.</p></div>
      </div>

      <form method="POST" action="?/import" enctype="multipart/form-data" class="mt-6">
        <label class="block rounded-2xl border border-dashed border-[#CBD0DC] bg-[#FAFBFD] p-6 text-center">
          <FileJson2 size={30} class="mx-auto text-[#A7ADBA]" aria-hidden="true" />
          <span class="mt-3 block text-[12px] font-semibold text-[#404656]">Selecione o arquivo preparado pela IA</span>
          <span class="mt-1 block text-[10px] text-[#9297A5]">Somente JSON no formato F10 Help Import v1</span>
          <input type="file" name="file" accept="application/json,.json" required class="mx-auto mt-4 block max-w-full text-[10px] text-[#697080] file:mr-3 file:rounded-lg file:border-0 file:bg-[#EEF0FF] file:px-3 file:py-2 file:text-[10px] file:font-semibold file:text-[#000A57]" />
        </label>

        <div class="mt-4 rounded-xl bg-[#FFF9F3] px-4 py-3 text-[10px] leading-5 text-[#81512A]">
          A importação não baixa nem copia os arquivos de imagem/vídeo. Ela registra as URLs fornecidas no JSON. A hospedagem/migração física dessas mídias pode ser tratada separadamente depois.
        </div>

        <button type="submit" class="mt-4 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-[#000A57] px-5 text-[12px] font-semibold text-white transition hover:bg-[#111B71]">
          <UploadCloud size={17} aria-hidden="true" />
          Validar e importar como rascunho
        </button>
      </form>
    </section>
  {/if}
</div>
