<script lang="ts">
  import {
    Bot,
    CheckCircle2,
    CircleAlert,
    Download,
    FileJson2,
    FileVideo2,
    Link2,
    Sparkles,
    UploadCloud,
    Video,
  } from "lucide-svelte";
  import { UNCATEGORIZED_HELP_CATEGORY_SLUG } from "$lib/help/helpCategoryConstants";
  import ApplicationBackLink from "$lib/components/application/ApplicationBackLink.svelte";
  import ApplicationContent from "$lib/components/application/ApplicationContent.svelte";
  import HelpCategoryIcon from "$lib/components/help/HelpCategoryIcon.svelte";
  import type { ActionData, PageData } from "./$types";

  export let data: PageData;
  export let form: ActionData;

  let automaticSourceType: "youtube" | "upload" = "youtube";

  $: realCategories = data.categories.filter(
    (category) => category.slug !== UNCATEGORIZED_HELP_CATEGORY_SLUG,
  );
  $: automaticMp4Ready = data.videoRuntime.openAi && data.videoRuntime.ffmpeg;
  $: automaticYoutubeReady = automaticMp4Ready && data.videoRuntime.youtube;
  $: automaticReady = automaticSourceType === "youtube"
    ? automaticYoutubeReady
    : automaticMp4Ready;

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
    <div class="flex items-start gap-3"><span class="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#FFF3E9] text-[#EA6D0B]"><Video size={20}/></span><div><h1 class="text-[18px] font-semibold text-[#11182C]">Criar conteúdo a partir do vídeo</h1><p class="mt-1 max-w-[760px] text-[11px] leading-5 text-[#858A98]">Use a automação do F10 quando estiver habilitada pelo administrador ou mantenha o fluxo manual de prompt + ZIP. Os dois caminhos terminam no mesmo rascunho estruturado e nunca publicam automaticamente.</p></div></div>
  </section>

  {#if data.canImport && data.videoAutomation.enabled}
    <section class="mt-4 rounded-[22px] border border-[#D8DDF4] bg-white p-5 sm:p-6">
      <div class="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div class="flex items-start gap-3"><span class="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#EEF0FF] text-[#000A57]"><Sparkles size={20}/></span><div><h2 class="text-[15px] font-semibold text-[#11182C]">Gerar automaticamente</h2><p class="application-text-caption mt-1 max-w-[700px] leading-5 text-[#858B99]">O F10 extrai áudio e frames, transcreve, seleciona screenshots da tela inteira e gera resumo rápido, passos e rascunho usando OpenAI.</p></div></div>
        <a href="/app/settings/help-video" class="application-text-meta w-fit rounded-lg border border-[#DDE1EA] px-3 py-2 font-semibold text-[#000A57]">Configuração</a>
      </div>

      <div class="mt-5 grid gap-2 sm:grid-cols-3">
        <div class={`rounded-xl border px-3 py-2.5 ${data.videoRuntime.openAi ? "border-[#CFE4D6] bg-[#F5FBF7]" : "border-[#F0C8C8] bg-[#FFF5F5]"}`}><span class="application-text-meta text-[#777D8D]">OpenAI</span><strong class="ml-2 text-[10px]">{data.videoRuntime.openAi ? "OK" : "Pendente"}</strong></div>
        <div class={`rounded-xl border px-3 py-2.5 ${data.videoRuntime.ffmpeg ? "border-[#CFE4D6] bg-[#F5FBF7]" : "border-[#F0C8C8] bg-[#FFF5F5]"}`}><span class="application-text-meta text-[#777D8D]">FFmpeg</span><strong class="ml-2 text-[10px]">{data.videoRuntime.ffmpeg ? "OK" : "Pendente"}</strong></div>
        <div class={`rounded-xl border px-3 py-2.5 ${data.videoRuntime.youtube ? "border-[#CFE4D6] bg-[#F5FBF7]" : "border-[#F1D7BD] bg-[#FFF9F3]"}`}><span class="application-text-meta text-[#777D8D]">YouTube / yt-dlp</span><strong class="ml-2 text-[10px]">{data.videoRuntime.youtube ? "OK" : "Opcional"}</strong></div>
      </div>

      <form method="POST" action="?/automatic" enctype="multipart/form-data" class="mt-5 space-y-4">
        <div class="grid gap-3 sm:grid-cols-2">
          <label class={`cursor-pointer rounded-2xl border p-4 ${automaticSourceType === "youtube" ? "border-[#AEB7EF] bg-[#F8F9FF]" : "border-[#E2E5ED] bg-[#FAFBFD]"}`}>
            <span class="flex items-start gap-3"><input bind:group={automaticSourceType} name="sourceType" type="radio" value="youtube" class="mt-0.5 h-4 w-4"/><Link2 size={16} class="mt-0.5 shrink-0 text-[#000A57]"/><span><strong class="application-text-caption block text-[#343B4B]">Link do YouTube</strong><small class="application-text-meta mt-1 block leading-5 text-[#858B99]">O F10 baixa temporariamente o vídeo no servidor. Exige yt-dlp.</small></span></span>
          </label>
          <label class={`cursor-pointer rounded-2xl border p-4 ${automaticSourceType === "upload" ? "border-[#AEB7EF] bg-[#F8F9FF]" : "border-[#E2E5ED] bg-[#FAFBFD]"}`}>
            <span class="flex items-start gap-3"><input bind:group={automaticSourceType} name="sourceType" type="radio" value="upload" class="mt-0.5 h-4 w-4"/><FileVideo2 size={16} class="mt-0.5 shrink-0 text-[#000A57]"/><span><strong class="application-text-caption block text-[#343B4B]">Arquivo .mp4</strong><small class="application-text-meta mt-1 block leading-5 text-[#858B99]">Processamento direto no servidor. Não depende de yt-dlp.</small></span></span>
          </label>
        </div>

        {#if automaticSourceType === "youtube"}
          <label class="block"><span class="application-text-caption mb-1.5 block font-semibold text-[#555B6B]">URL do YouTube</span><input name="youtubeUrl" type="url" placeholder="https://www.youtube.com/watch?v=..." class="h-11 w-full rounded-xl border border-[#DDE1EA] px-3 text-[11px]"/><span class="application-text-meta mt-1 block leading-4 text-[#9297A5]">Essa mesma URL será usada como vídeo principal do artigo.</span></label>
        {:else}
          <label class="block rounded-2xl border border-dashed border-[#CBD0DC] bg-[#FAFBFD] p-5 text-center"><FileVideo2 size={26} class="mx-auto text-[#A7ADBA]"/><span class="mt-2 block text-[11px] font-semibold">Arquivo MP4 para análise</span><span class="application-text-meta mt-1 block text-[#9297A5]">Até {formatMegabytes(data.maxVideoBytes)}</span><input type="file" name="videoFile" accept="video/mp4,.mp4" class="application-text-caption mx-auto mt-3 block max-w-full"/></label>
          <label class="block"><span class="application-text-caption mb-1.5 block font-semibold text-[#555B6B]">URL pública do vídeo no artigo <span class="font-normal text-[#9297A5]">(opcional)</span></span><input name="publishedVideoUrl" type="url" placeholder="https://..." class="h-11 w-full rounded-xl border border-[#DDE1EA] px-3 text-[11px]"/><span class="application-text-meta mt-1 block leading-4 text-[#9297A5]">O MP4 enviado é usado para análise. Sem uma URL pública, o rascunho será criado sem vídeo principal e você poderá adicioná-lo depois.</span></label>
        {/if}

        <label class="block"><span class="application-text-caption mb-1.5 block font-semibold text-[#555B6B]">ID externo estável <span class="font-normal text-[#9297A5]">(opcional)</span></span><input name="externalId" maxlength="200" placeholder="Ex.: cadastro-funcionario-video-01" class="h-10 w-full rounded-xl border border-[#DDE1EA] px-3 text-[11px]"/><span class="application-text-meta mt-1 block leading-4 text-[#9297A5]">Use o mesmo valor em futuras reprocessamentos para sobrescrever o mesmo conteúdo. Sem preencher, YouTube usa o ID do vídeo e MP4 usa o hash do arquivo.</span></label>

        <div class="rounded-xl border border-[#F1D7BD] bg-[#FFF9F3] px-4 py-3 text-[10px] leading-5 text-[#7A3B08]">O processamento pode levar alguns minutos. Mantenha esta aba aberta. A automação gera somente rascunho; revise categorias, texto, screenshots e marcações antes de publicar.</div>
        <button type="submit" disabled={!automaticReady} class="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-[#000A57] px-5 text-[12px] font-semibold text-white disabled:cursor-not-allowed disabled:bg-[#B8BCC8]"><Sparkles size={17}/>Processar vídeo e criar rascunho</button>
        {#if !automaticReady}<p class="application-text-meta text-center text-[#A9510D]">Faltam pré-requisitos do servidor para a fonte selecionada. Consulte Configurações > Automação de vídeos.</p>{/if}
      </form>
    </section>
  {/if}

  <section class="mt-4 rounded-[20px] border border-[#D8DDF4] bg-[#F8F9FF] p-5">
    <div class="flex items-start gap-3"><Bot size={18} class="mt-0.5 shrink-0 text-[#000A57]"/><div><h2 class="text-[13px] font-semibold text-[#000A57]">Categorias editoriais disponíveis</h2><p class="mt-1 text-[10px] leading-5 text-[#6B7180]">A IA deve preferir categorias reais. Se não conseguir classificar com segurança, pode manter <strong>uncategorized</strong> para criar o rascunho sem bloquear a automação.</p></div></div>
    {#if realCategories.length === 0}
      <p class="mt-4 rounded-xl border border-[#F1D7BD] bg-white px-3 py-2 text-[10px] text-[#7A3B08]">Ainda não há categoria editorial real. Os rascunhos podem ser importados como <strong>uncategorized</strong>, mas não poderão ser publicados até receberem uma categoria real.</p>
    {:else}
      <div class="mt-4 flex flex-wrap gap-2">{#each realCategories as category}<span class="inline-flex items-center gap-1.5 rounded-full border border-[#D8DDF4] bg-white px-3 py-1.5 text-[10px] font-semibold text-[#454C60]"><HelpCategoryIcon name={category.icon} size={12}/>{category.name} · {category.slug}</span>{/each}</div>
    {/if}
    <div class="mt-3 rounded-xl border border-[#F1D7BD] bg-[#FFF9F3] px-3 py-2 text-[10px] leading-5 text-[#7A3B08]"><strong>uncategorized · Sem categoria</strong> é técnica e temporária. A publicação exige remover essa associação e escolher uma ou mais categorias reais.</div>
  </section>

  <section class="mt-4 rounded-[20px] border border-[#DCE0EA] bg-white p-5">
    <h2 class="text-[13px] font-semibold text-[#303645]">Reimportação segura</h2>
    <p class="mt-2 text-[10px] leading-5 text-[#777D8D]">O par <strong>source + externalId</strong> identifica o mesmo conteúdo. Uma nova versão com essa mesma identidade substitui o rascunho anterior mantendo o mesmo ID. Se já existir uma publicação, ela continua atendendo clientes até você revisar e publicar novamente.</p>
  </section>

  {#if form?.message}<div class={`mt-4 flex items-start gap-3 rounded-2xl border px-4 py-3 text-[11px] font-medium ${form.success ? "border-[#B9E6C9] bg-[#F1FBF4] text-[#176B35]" : "border-[#F0C8C8] bg-[#FFF5F5] text-[#9B2C2C]"}`}>{#if form.success}<CheckCircle2 size={18}/>{:else}<CircleAlert size={18}/>{/if}<span>{form.message}</span></div>{/if}

  {#if form && "automation" in form && form.automation}
    <section class="mt-4 grid gap-3 sm:grid-cols-4">
      <div class="rounded-xl bg-white p-4"><span class="application-text-meta font-bold uppercase text-[#959AA8]">Fonte</span><strong class="mt-2 block text-[12px]">{form.automation.sourceType === "youtube" ? "YouTube" : "MP4"}</strong></div>
      <div class="rounded-xl bg-white p-4"><span class="application-text-meta font-bold uppercase text-[#959AA8]">Transcrição</span><strong class="mt-2 block text-[16px]">{form.automation.transcriptChars}</strong><small class="text-[9px] text-[#9297A5]"> caracteres</small></div>
      <div class="rounded-xl bg-white p-4"><span class="application-text-meta font-bold uppercase text-[#959AA8]">Frames analisados</span><strong class="mt-2 block text-[20px]">{form.automation.analyzedFrameCount}</strong></div>
      <div class="rounded-xl bg-white p-4"><span class="application-text-meta font-bold uppercase text-[#959AA8]">Screenshots</span><strong class="mt-2 block text-[20px]">{form.automation.selectedScreenshotCount}</strong></div>
    </section>
  {/if}

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
    <section class="mt-4 overflow-hidden rounded-[20px] border border-[#DCEDE2] bg-white"><header class="border-b px-5 py-4"><h2 class="text-[13px] font-semibold text-[#225C37]">Conteúdos importados</h2></header><div class="divide-y">{#each form.imported as item}<a href={`/app/help/content/${item.id}`} class="flex items-center justify-between px-5 py-3 text-[11px] hover:bg-[#FAFAFC]"><div class="min-w-0"><div class="flex items-center gap-2"><strong class="block truncate">{item.title}</strong>{#if item.overwritten}<span class="rounded-full bg-[#FFF0E4] px-2 py-0.5 text-[8px] font-bold text-[#A9510D]">ATUALIZADO</span>{/if}</div><span class="application-text-meta text-[#999EAA]">ID externo: {item.externalId}</span></div><span class="font-semibold text-[#000A57]">Revisar</span></a>{/each}</div></section>
  {/if}

  {#if data.canImport}
    <section class="mt-5 rounded-[22px] border border-[#E2E5ED] bg-white p-5 sm:p-6">
      <div class="flex items-start gap-3"><span class="flex h-11 w-11 items-center justify-center rounded-xl bg-[#EEF0FF] text-[#000A57]"><UploadCloud size={20}/></span><div><h2 class="text-[15px] font-semibold">Alternativa manual: importar ZIP</h2><p class="application-text-caption mt-1 text-[#858B99]">Até {formatMegabytes(data.maxImportBytes)}. Continua disponível independentemente da automação. O pacote precisa conter f10-help-import.json e os screenshots referenciados.</p></div></div>
      <ol class="mt-4 grid gap-2 sm:grid-cols-4"><li class="rounded-xl bg-[#FAFAFC] p-3 text-[9px] leading-4 text-[#777D8D]"><strong class="block text-[#000A57]">1. Baixe</strong>Prompt e template.</li><li class="rounded-xl bg-[#FAFAFC] p-3 text-[9px] leading-4 text-[#777D8D]"><strong class="block text-[#000A57]">2. Envie à IA</strong>Vídeo + subtitles.</li><li class="rounded-xl bg-[#FAFAFC] p-3 text-[9px] leading-4 text-[#777D8D]"><strong class="block text-[#000A57]">3. Receba</strong>ZIP completo.</li><li class="rounded-xl bg-[#FAFAFC] p-3 text-[9px] leading-4 text-[#777D8D]"><strong class="block text-[#000A57]">4. Importe</strong>Rascunho F10.</li></ol>
      <form method="POST" action="?/import" enctype="multipart/form-data" class="mt-6">
        <label class="block rounded-2xl border border-dashed border-[#CBD0DC] bg-[#FAFBFD] p-6 text-center"><FileJson2 size={30} class="mx-auto text-[#A7ADBA]"/><span class="mt-3 block text-[12px] font-semibold">Selecione o ZIP final</span><span class="application-text-caption mt-1 block text-[#9297A5]">f10-help-import.json + screenshots do vídeo</span><input type="file" name="file" accept="application/zip,.zip" required class="application-text-caption mx-auto mt-4 block max-w-full" /></label>
        <div class="application-text-caption mt-4 rounded-xl bg-[#F8F9FF] px-4 py-3 leading-5 text-[#5F6575]">A importação nunca publica automaticamente. Screenshots são salvos no storage do F10. Artigos em <strong>uncategorized</strong> permanecem rascunhos até receberem categorias reais.</div>
        <button type="submit" class="mt-4 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-[#000A57] px-5 text-[12px] font-semibold text-white"><UploadCloud size={17}/>Validar ZIP e importar como rascunho</button>
      </form>
    </section>
  {/if}
</ApplicationContent>
