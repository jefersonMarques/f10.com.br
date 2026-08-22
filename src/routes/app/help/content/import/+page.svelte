<script lang="ts">
  import {
    Bot,
    CheckCircle2,
    CircleAlert,
    Download,
    FileArchive,
    FileJson2,
    HardDrive,
    UploadCloud,
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
      <a href="/templates/f10-help-import-v2-prompt.md" class="application-text-caption inline-flex min-h-10 items-center gap-2 rounded-xl border border-[#DDE1EA] bg-white px-3 font-semibold text-[#000A57]"><Download size={14}/>Prompt v2 para IA</a>
      <a href="/templates/f10-help-import-v2.example.json" class="application-text-caption inline-flex min-h-10 items-center gap-2 rounded-xl border border-[#DDE1EA] bg-white px-3 font-semibold text-[#000A57]"><Download size={14}/>Modelo JSON v2</a>
    </div>
  </div>

  <section class="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
    <div class="rounded-2xl border border-[#E2E5ED] bg-white p-4"><FileJson2 size={20} class="text-[#000A57]"/><strong class="mt-3 block text-[13px]">JSON v2</strong><p class="application-text-caption mt-2 leading-5 text-[#858B99]">Contrato atual para texto, vídeo principal e mídias por URL.</p></div>
    <div class="rounded-2xl border border-[#E2E5ED] bg-white p-4"><FileArchive size={20} class="text-[#000A57]"/><strong class="mt-3 block text-[13px]">ZIP + assets</strong><p class="application-text-caption mt-2 leading-5 text-[#858B99]">Use <code>manifest.json</code> e referências como <code>assets/tela.png</code>.</p></div>
    <div class="rounded-2xl border border-[#E2E5ED] bg-white p-4"><Bot size={20} class="text-[#EA6D0B]"/><strong class="mt-3 block text-[13px]">Preparado para IA</strong><p class="application-text-caption mt-2 leading-5 text-[#858B99]">Passos específicos, transcrição, resumos e conhecimento interno entram estruturados.</p></div>
    <div class="rounded-2xl border border-[#E2E5ED] bg-white p-4"><CheckCircle2 size={20} class="text-[#2F7045]"/><strong class="mt-3 block text-[13px]">Sempre rascunho</strong><p class="application-text-caption mt-2 leading-5 text-[#858B99]">Nenhuma importação ganha publicação automática. Arquivos v1 continuam aceitos como legado.</p></div>
  </section>

  <section class="mt-4 flex items-center gap-3 rounded-2xl border border-[#E2E5ED] bg-white px-4 py-3">
    <HardDrive size={17} class="text-[#000A57]"/>
    <div class="min-w-0 flex-1"><strong class="application-text-caption block">Armazenamento para pacotes ZIP</strong><span class="application-text-meta block truncate text-[#9297A5]">{data.storage.configured ? `${data.storage.bucket} · ${data.storage.endpoint}` : "MinIO/S3 ainda não configurado"}</span></div>
    <span class={`application-text-meta rounded-full px-2 py-1 font-bold ${data.storage.configured ? "bg-[#EEF8F1] text-[#2F7045]" : "bg-[#FFF0F0] text-[#9B3C3C]"}`}>{data.storage.configured ? "Pronto" : "Pendente"}</span>
  </section>

  {#if form?.message}<div class={`mt-4 flex items-start gap-3 rounded-2xl border px-4 py-3 text-[11px] font-medium ${form.success ? "border-[#B9E6C9] bg-[#F1FBF4] text-[#176B35]" : "border-[#F0C8C8] bg-[#FFF5F5] text-[#9B2C2C]"}`}>{#if form.success}<CheckCircle2 size={18}/>{:else}<CircleAlert size={18}/>{/if}<span>{form.message}</span></div>{/if}

  {#if form && "summary" in form && form.summary}
    <section class="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
      <div class="rounded-xl bg-white p-4"><span class="application-text-meta font-bold uppercase text-[#959AA8]">Origem</span><strong class="mt-2 block text-[12px]">{form.summary.source || "-"}</strong></div>
      <div class="rounded-xl bg-white p-4"><span class="application-text-meta font-bold uppercase text-[#959AA8]">Conteúdos</span><strong class="mt-2 block text-[20px]">{form.summary.contentCount}</strong></div>
      <div class="rounded-xl bg-white p-4"><span class="application-text-meta font-bold uppercase text-[#959AA8]">Passos</span><strong class="mt-2 block text-[20px]">{form.summary.stepCount}</strong></div>
      <div class="rounded-xl bg-white p-4"><span class="application-text-meta font-bold uppercase text-[#959AA8]">Blocos</span><strong class="mt-2 block text-[20px]">{form.summary.blockCount}</strong></div>
      <div class="rounded-xl bg-white p-4"><span class="application-text-meta font-bold uppercase text-[#959AA8]">Mídias/arquivos</span><strong class="mt-2 block text-[20px]">{form.summary.assetCount ?? 0}</strong></div>
    </section>
  {/if}

  {#if form && "issues" in form && form.issues.length > 0}
    <section class="mt-4 rounded-[20px] border border-[#F0C8C8] bg-white p-5"><h2 class="text-[13px] font-semibold text-[#8D3333]">Problemas encontrados</h2><ul class="application-text-caption mt-3 space-y-2 leading-5 text-[#725454]">{#each form.issues as issue}<li class="rounded-xl bg-[#FFF7F7] px-3 py-2">{issue}</li>{/each}</ul></section>
  {/if}

  {#if form && "imported" in form && form.imported && form.imported.length > 0}
    <section class="mt-4 overflow-hidden rounded-[20px] border border-[#DCEDE2] bg-white"><header class="border-b px-5 py-4"><h2 class="text-[13px] font-semibold text-[#225C37]">Conteúdos importados</h2></header><div class="divide-y">{#each form.imported as item}<a href={`/app/help/content/${item.id}`} class="flex items-center justify-between px-5 py-3 text-[11px] hover:bg-[#FAFAFC]"><div class="min-w-0"><strong class="block truncate">{item.title}</strong><span class="application-text-meta text-[#999EAA]">ID externo: {item.externalId}</span></div><span class="font-semibold text-[#000A57]">Revisar</span></a>{/each}</div></section>
  {/if}

  {#if data.canImport}
    <section class="mt-5 rounded-[22px] border border-[#E2E5ED] bg-white p-5 shadow-[0_10px_32px_rgba(1,13,40,0.04)] sm:p-6">
      <div class="flex items-start gap-3"><span class="flex h-11 w-11 items-center justify-center rounded-xl bg-[#EEF0FF] text-[#000A57]"><UploadCloud size={20}/></span><div><h2 class="text-[15px] font-semibold">Enviar JSON ou ZIP</h2><p class="application-text-caption mt-1 text-[#858B99]">ZIP até {formatMegabytes(data.maxImportBytes)}. A importação é atômica: conflito ou erro cancela o lote.</p></div></div>
      <form method="POST" action="?/import" enctype="multipart/form-data" class="mt-6">
        <label class="block rounded-2xl border border-dashed border-[#CBD0DC] bg-[#FAFBFD] p-6 text-center"><FileArchive size={30} class="mx-auto text-[#A7ADBA]"/><span class="mt-3 block text-[12px] font-semibold">Selecione o arquivo preparado pela IA</span><span class="application-text-caption mt-1 block text-[#9297A5]">.json ou .zip no formato F10 Help Import v2; v1 permanece compatível</span><input type="file" name="file" accept="application/json,.json,application/zip,.zip" required class="application-text-caption mx-auto mt-4 block max-w-full" /></label>
        <div class="application-text-caption mt-4 rounded-xl bg-[#F8F9FF] px-4 py-3 leading-5 text-[#5F6575]">No v2 existe no máximo um <code>featuredVideo</code> por conteúdo e ele fica no topo da página. Não use vídeo dentro dos passos. No ZIP, imagens e documentos em <code>assets/</code> são copiados para o MinIO.</div>
        <button type="submit" class="mt-4 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-[#000A57] px-5 text-[12px] font-semibold text-white"><UploadCloud size={17}/>Validar e importar como rascunho</button>
      </form>
    </section>
  {/if}
</ApplicationContent>
