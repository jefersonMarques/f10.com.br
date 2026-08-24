<script lang="ts">
  import {
    Bot,
    CheckCircle2,
    CircleAlert,
    Download,
    FileJson2,
    FileVideo2,
    Link2,
    LoaderCircle,
    Sparkles,
    UploadCloud,
    Video,
  } from "lucide-svelte";
  import { UNCATEGORIZED_HELP_CATEGORY_SLUG } from "$lib/help/helpCategoryConstants";
  import ApplicationBackLink from "$lib/components/application/ApplicationBackLink.svelte";
  import ApplicationContent from "$lib/components/application/ApplicationContent.svelte";
  import HelpCategoryIcon from "$lib/components/help/HelpCategoryIcon.svelte";
  import type { ActionData, PageData } from "./$types";

  type ImportMode = "zip" | "mp4" | "youtube";

  type ProgressItem = {
    stage: string;
    status: "active" | "done";
    label: string;
    detail?: string;
  };

  type ImportedItem = {
    id: string;
    title: string;
    externalId: string;
    overwritten: boolean;
  };

  type AutomaticResult = {
    message: string;
    summary: {
      source: string;
      contentCount: number;
      stepCount: number;
      blockCount: number;
      assetCount: number;
    };
    automation: {
      sourceType: "youtube" | "upload";
      transcriptChars: number;
      analyzedFrameCount: number;
      selectedScreenshotCount: number;
    };
    imported: ImportedItem[];
  };

  type StreamPayload =
    | ({ type: "progress" } & ProgressItem)
    | ({ type: "success" } & AutomaticResult)
    | { type: "error"; message: string; issues?: string[] };

  export let data: PageData;
  export let form: ActionData;

  let importMode: ImportMode | null = form?.action === "import" ? "zip" : null;
  let isProcessing = false;
  let processingSteps: ProgressItem[] = [];
  let automaticResult: AutomaticResult | null = null;
  let automaticError = "";
  let automaticIssues: string[] = [];

  $: realCategories = data.categories.filter(
    (category) => category.slug !== UNCATEGORIZED_HELP_CATEGORY_SLUG,
  );
  $: mp4Available =
    data.canImport &&
    data.videoAutomation.enabled &&
    data.videoRuntime.openAi &&
    data.videoRuntime.ffmpeg;
  $: youtubeAvailable = mp4Available && data.videoRuntime.youtube;

  function formatMegabytes(bytes: number): string {
    return `${Math.round((bytes / 1024 / 1024) * 10) / 10} MB`;
  }

  function selectMode(mode: ImportMode): void {
    if (!data.canImport) return;
    if (mode === "mp4" && !mp4Available) return;
    if (mode === "youtube" && !youtubeAvailable) return;
    importMode = mode;
    automaticResult = null;
    automaticError = "";
    automaticIssues = [];
  }

  function markClientUploadDone(): void {
    processingSteps = processingSteps.map((item) =>
      item.stage === "upload" ? { ...item, status: "done" as const } : item,
    );
  }

  function updateProgress(item: ProgressItem): void {
    const index = processingSteps.findIndex((current) => current.stage === item.stage);
    if (index < 0) {
      processingSteps = [...processingSteps, item];
      return;
    }
    processingSteps = processingSteps.map((current, currentIndex) =>
      currentIndex === index ? item : current,
    );
  }

  function handleStreamPayload(payload: StreamPayload): void {
    if (payload.type === "progress") {
      updateProgress(payload);
      return;
    }
    if (payload.type === "success") {
      automaticResult = {
        message: payload.message,
        summary: payload.summary,
        automation: payload.automation,
        imported: payload.imported,
      };
      automaticError = "";
      automaticIssues = [];
      processingSteps = processingSteps.map((item) => ({ ...item, status: "done" as const }));
      return;
    }
    automaticError = payload.message;
    automaticIssues = payload.issues ?? [];
  }

  async function processAutomaticImport(event: SubmitEvent): Promise<void> {
    event.preventDefault();
    if (isProcessing || (importMode !== "mp4" && importMode !== "youtube")) return;

    const currentTarget = event.currentTarget;
    if (!(currentTarget instanceof HTMLFormElement)) return;

    automaticResult = null;
    automaticError = "";
    automaticIssues = [];
    isProcessing = true;
    processingSteps = [{
      stage: "upload",
      status: "active",
      label: importMode === "mp4" ? "Enviando o MP4 ao servidor" : "Enviando o link do YouTube ao servidor",
    }];

    const formData = new FormData(currentTarget);
    formData.set("sourceType", importMode === "youtube" ? "youtube" : "upload");

    try {
      const response = await fetch("/app/help/content/import/process", {
        method: "POST",
        body: formData,
      });

      markClientUploadDone();

      if (!response.ok) {
        const payload = await response.json().catch(() => ({})) as { message?: string };
        automaticError = payload.message || "Não foi possível iniciar o processamento do vídeo.";
        return;
      }
      if (!response.body) {
        automaticError = "O servidor não iniciou o stream de processamento.";
        return;
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";
        for (const line of lines) {
          if (!line.trim()) continue;
          handleStreamPayload(JSON.parse(line) as StreamPayload);
        }
      }

      buffer += decoder.decode();
      if (buffer.trim()) handleStreamPayload(JSON.parse(buffer) as StreamPayload);
      if (!automaticResult && !automaticError) {
        automaticError = "O processamento terminou sem retornar o resultado final.";
      }
    } catch {
      automaticError = "A conexão com o servidor foi interrompida durante o processamento. Verifique o rascunho antes de tentar novamente.";
    } finally {
      isProcessing = false;
    }
  }
</script>

<svelte:head><title>Importar Base de Conhecimento | F10 Operations</title></svelte:head>

<ApplicationContent width="narrow">
  <div class="mb-3">
    <ApplicationBackLink href="/app/help/content" label="Base de Conhecimento" />
  </div>

  <section class="rounded-[22px] border border-[#E2E5ED] bg-white p-5 sm:p-6">
    <div class="flex items-start gap-3">
      <span class="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#FFF3E9] text-[#EA6D0B]"><Video size={20}/></span>
      <div>
        <h1 class="text-[18px] font-semibold text-[#11182C]">Importar conteúdo para a Base de Conhecimento</h1>
        <p class="mt-1 max-w-[760px] text-[11px] leading-5 text-[#858A98]">Primeiro escolha como o conteúdo será recebido. Cada modo mostra somente os campos e instruções necessários para aquele fluxo.</p>
      </div>
    </div>

    <div class="mt-6">
      <h2 class="text-[13px] font-semibold text-[#303645]">1. Selecione o tipo de importação</h2>
      <div class="mt-3 grid gap-3 md:grid-cols-3">
        <button
          type="button"
          disabled={!data.canImport}
          on:click={() => selectMode("zip")}
          class={`rounded-2xl border p-4 text-left transition disabled:cursor-not-allowed disabled:opacity-50 ${importMode === "zip" ? "border-[#000A57] bg-[#F6F7FF] ring-1 ring-[#000A57]" : "border-[#E2E5ED] bg-[#FAFBFD] hover:border-[#C7CCDA]"}`}
        >
          <span class="flex items-start gap-3"><FileJson2 size={19} class="mt-0.5 shrink-0 text-[#000A57]"/><span><strong class="block text-[12px] text-[#2F3544]">Pacote ZIP</strong><small class="mt-1 block text-[9px] leading-4 text-[#858B99]">Importe um pacote já preparado com JSON e screenshots.</small><span class="mt-3 inline-flex rounded-full bg-[#EEF0F5] px-2 py-1 text-[8px] font-bold text-[#656B79]">MANUAL / IA EXTERNA</span></span></span>
        </button>

        <button
          type="button"
          disabled={!mp4Available}
          on:click={() => selectMode("mp4")}
          class={`rounded-2xl border p-4 text-left transition disabled:cursor-not-allowed disabled:opacity-50 ${importMode === "mp4" ? "border-[#000A57] bg-[#F6F7FF] ring-1 ring-[#000A57]" : "border-[#E2E5ED] bg-[#FAFBFD] hover:border-[#C7CCDA]"}`}
        >
          <span class="flex items-start gap-3"><FileVideo2 size={19} class="mt-0.5 shrink-0 text-[#000A57]"/><span><strong class="block text-[12px] text-[#2F3544]">Arquivo MP4</strong><small class="mt-1 block text-[9px] leading-4 text-[#858B99]">O F10 transcreve com tempos, planeja os cortes e valida apenas screenshots relevantes.</small><span class={`mt-3 inline-flex rounded-full px-2 py-1 text-[8px] font-bold ${mp4Available ? "bg-[#EAF7EE] text-[#2D7143]" : "bg-[#FFF0E9] text-[#A9510D]"}`}>{mp4Available ? "AUTOMAÇÃO DISPONÍVEL" : data.videoAutomation.enabled ? "OPENAI / FFMPEG PENDENTE" : "DESABILITADO PELO ADMIN"}</span></span></span>
        </button>

        <button
          type="button"
          disabled={!youtubeAvailable}
          on:click={() => selectMode("youtube")}
          class={`rounded-2xl border p-4 text-left transition disabled:cursor-not-allowed disabled:opacity-50 ${importMode === "youtube" ? "border-[#000A57] bg-[#F6F7FF] ring-1 ring-[#000A57]" : "border-[#E2E5ED] bg-[#FAFBFD] hover:border-[#C7CCDA]"}`}
        >
          <span class="flex items-start gap-3"><Link2 size={19} class="mt-0.5 shrink-0 text-[#000A57]"/><span><strong class="block text-[12px] text-[#2F3544]">Link do YouTube</strong><small class="mt-1 block text-[9px] leading-4 text-[#858B99]">Cole o link e o F10 baixa temporariamente o vídeo para análise.</small><span class={`mt-3 inline-flex rounded-full px-2 py-1 text-[8px] font-bold ${youtubeAvailable ? "bg-[#EAF7EE] text-[#2D7143]" : "bg-[#FFF0E9] text-[#A9510D]"}`}>{youtubeAvailable ? "AUTOMAÇÃO DISPONÍVEL" : !data.videoAutomation.enabled ? "DESABILITADO PELO ADMIN" : !data.videoRuntime.youtube ? "YT-DLP PENDENTE" : "OPENAI / FFMPEG PENDENTE"}</span></span></span>
        </button>
      </div>
      {#if !data.canImport}<p class="mt-3 text-[10px] text-[#A9510D]">Seu usuário possui acesso de leitura, mas não possui permissão para importar conteúdo.</p>{/if}
    </div>
  </section>

  {#if importMode === "zip"}
    <section class="mt-4 rounded-[22px] border border-[#E2E5ED] bg-white p-5 sm:p-6">
      <div class="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div class="flex items-start gap-3"><span class="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#EEF0FF] text-[#000A57]"><FileJson2 size={20}/></span><div><h2 class="text-[15px] font-semibold text-[#11182C]">2. Importar pacote ZIP</h2><p class="application-text-caption mt-1 max-w-[620px] leading-5 text-[#858B99]">Use este modo quando outra IA já tiver criado o JSON e extraído os screenshots do vídeo.</p></div></div>
        <div class="flex flex-wrap gap-2">
          <a href="/app/help/content/import/prompt" class="application-text-meta inline-flex min-h-9 items-center gap-2 rounded-lg border border-[#DDE1EA] px-3 font-semibold text-[#000A57]"><Download size={13}/>Baixar prompt</a>
          <a href="/templates/f10-help-import-template.json" download class="application-text-meta inline-flex min-h-9 items-center gap-2 rounded-lg border border-[#DDE1EA] px-3 font-semibold text-[#000A57]"><Download size={13}/>Template JSON</a>
        </div>
      </div>

      {#if form?.message}
        <div class={`mt-4 flex items-start gap-3 rounded-2xl border px-4 py-3 text-[11px] font-medium ${form.success ? "border-[#B9E6C9] bg-[#F1FBF4] text-[#176B35]" : "border-[#F0C8C8] bg-[#FFF5F5] text-[#9B2C2C]"}`}>{#if form.success}<CheckCircle2 size={18}/>{:else}<CircleAlert size={18}/>{/if}<span>{form.message}</span></div>
      {/if}

      {#if form && "issues" in form && form.issues.length > 0}
        <div class="mt-4 rounded-2xl border border-[#F0C8C8] bg-[#FFF7F7] p-4"><ul class="space-y-1 text-[10px] leading-5 text-[#725454]">{#each form.issues as issue}<li>{issue}</li>{/each}</ul></div>
      {/if}

      <form method="POST" action="?/import" enctype="multipart/form-data" class="mt-5">
        <label class="block rounded-2xl border border-dashed border-[#CBD0DC] bg-[#FAFBFD] p-6 text-center"><UploadCloud size={30} class="mx-auto text-[#A7ADBA]"/><span class="mt-3 block text-[12px] font-semibold">Selecione o ZIP final</span><span class="application-text-caption mt-1 block text-[#9297A5]">f10-help-import.json + screenshots · até {formatMegabytes(data.maxImportBytes)}</span><input type="file" name="file" accept="application/zip,.zip" required class="application-text-caption mx-auto mt-4 block max-w-full" /></label>
        <div class="application-text-caption mt-4 rounded-xl bg-[#F8F9FF] px-4 py-3 leading-5 text-[#5F6575]">O pacote é validado antes de alterar o banco. A importação sempre cria ou atualiza um <strong>rascunho</strong>.</div>
        <button type="submit" class="mt-4 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-[#000A57] px-5 text-[12px] font-semibold text-white"><UploadCloud size={17}/>Validar ZIP e importar</button>
      </form>

      {#if form && "imported" in form && form.imported && form.imported.length > 0}
        <div class="mt-4 divide-y overflow-hidden rounded-2xl border border-[#DCEDE2]">{#each form.imported as item}<a href={`/app/help/content/${item.id}`} class="flex items-center justify-between bg-white px-4 py-3 text-[11px] hover:bg-[#FAFAFC]"><span><strong>{item.title}</strong><small class="mt-1 block text-[#9297A5]">ID externo: {item.externalId}</small></span><span class="font-semibold text-[#000A57]">Revisar</span></a>{/each}</div>
      {/if}
    </section>
  {:else if importMode === "mp4" || importMode === "youtube"}
    <section class="mt-4 rounded-[22px] border border-[#D8DDF4] bg-white p-5 sm:p-6">
      <div class="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div class="flex items-start gap-3"><span class="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#EEF0FF] text-[#000A57]"><Sparkles size={20}/></span><div><h2 class="text-[15px] font-semibold text-[#11182C]">2. Gerar automaticamente por {importMode === "youtube" ? "YouTube" : "MP4"}</h2><p class="application-text-caption mt-1 max-w-[650px] leading-5 text-[#858B99]">O F10 transcreve o áudio com timestamps, estrutura o artigo em texto, planeja janelas de captura e valida somente poucos frames candidatos por etapa.</p></div></div>
        <a href="/app/settings/help-video" class="application-text-meta w-fit rounded-lg border border-[#DDE1EA] px-3 py-2 font-semibold text-[#000A57]">Configuração</a>
      </div>

      <div class="mt-5 grid gap-2 sm:grid-cols-3">
        <div class={`rounded-xl border px-3 py-2.5 ${data.videoRuntime.openAi ? "border-[#CFE4D6] bg-[#F5FBF7]" : "border-[#F0C8C8] bg-[#FFF5F5]"}`}><span class="application-text-meta text-[#777D8D]">OpenAI</span><strong class="ml-2 text-[10px]">{data.videoRuntime.openAi ? "OK" : "Pendente"}</strong></div>
        <div class={`rounded-xl border px-3 py-2.5 ${data.videoRuntime.ffmpeg ? "border-[#CFE4D6] bg-[#F5FBF7]" : "border-[#F0C8C8] bg-[#FFF5F5]"}`}><span class="application-text-meta text-[#777D8D]">FFmpeg</span><strong class="ml-2 text-[10px]">{data.videoRuntime.ffmpeg ? "OK" : "Pendente"}</strong></div>
        <div class={`rounded-xl border px-3 py-2.5 ${importMode === "mp4" || data.videoRuntime.youtube ? "border-[#CFE4D6] bg-[#F5FBF7]" : "border-[#F1D7BD] bg-[#FFF9F3]"}`}><span class="application-text-meta text-[#777D8D]">{importMode === "youtube" ? "yt-dlp" : "Fonte"}</span><strong class="ml-2 text-[10px]">{importMode === "youtube" ? (data.videoRuntime.youtube ? "OK" : "Pendente") : "MP4 local"}</strong></div>
      </div>

      {#if automaticError}
        <div class="mt-4 flex items-start gap-3 rounded-2xl border border-[#F0C8C8] bg-[#FFF5F5] px-4 py-3 text-[11px] font-medium text-[#9B2C2C]"><CircleAlert size={18}/><div><span>{automaticError}</span>{#if automaticIssues.length > 0}<ul class="mt-2 list-disc pl-4 text-[10px] font-normal">{#each automaticIssues as issue}<li>{issue}</li>{/each}</ul>{/if}</div></div>
      {/if}

      {#if automaticResult}
        <div class="mt-4 rounded-2xl border border-[#B9E6C9] bg-[#F1FBF4] px-4 py-3 text-[11px] font-medium text-[#176B35]"><div class="flex items-start gap-3"><CheckCircle2 size={18}/><span>{automaticResult.message}</span></div></div>
        <div class="mt-3 grid gap-3 sm:grid-cols-4">
          <div class="rounded-xl border border-[#E3E6EE] bg-[#FAFBFD] p-3"><span class="text-[8px] font-bold uppercase text-[#959AA8]">Transcrição</span><strong class="mt-1 block text-[14px]">{automaticResult.automation.transcriptChars}</strong><small class="text-[8px] text-[#9297A5]">caracteres</small></div>
          <div class="rounded-xl border border-[#E3E6EE] bg-[#FAFBFD] p-3"><span class="text-[8px] font-bold uppercase text-[#959AA8]">Entradas visuais</span><strong class="mt-1 block text-[18px]">{automaticResult.automation.analyzedFrameCount}</strong></div>
          <div class="rounded-xl border border-[#E3E6EE] bg-[#FAFBFD] p-3"><span class="text-[8px] font-bold uppercase text-[#959AA8]">Screenshots</span><strong class="mt-1 block text-[18px]">{automaticResult.automation.selectedScreenshotCount}</strong></div>
          <div class="rounded-xl border border-[#E3E6EE] bg-[#FAFBFD] p-3"><span class="text-[8px] font-bold uppercase text-[#959AA8]">Etapas</span><strong class="mt-1 block text-[18px]">{automaticResult.summary.stepCount}</strong></div>
        </div>
        {#if automaticResult.imported.length > 0}<div class="mt-3 divide-y overflow-hidden rounded-2xl border border-[#DCEDE2]">{#each automaticResult.imported as item}<a href={`/app/help/content/${item.id}`} class="flex items-center justify-between bg-white px-4 py-3 text-[11px] hover:bg-[#FAFAFC]"><span><strong>{item.title}</strong>{#if item.overwritten}<small class="ml-2 rounded-full bg-[#FFF0E4] px-2 py-0.5 text-[8px] font-bold text-[#A9510D]">ATUALIZADO</small>{/if}<small class="mt-1 block text-[#9297A5]">ID externo: {item.externalId}</small></span><span class="font-semibold text-[#000A57]">Revisar</span></a>{/each}</div>{/if}
      {/if}

      <form enctype="multipart/form-data" class="mt-5 space-y-4" on:submit={processAutomaticImport}>
        {#if importMode === "youtube"}
          <label class="block"><span class="application-text-caption mb-1.5 block font-semibold text-[#555B6B]">URL do YouTube</span><input name="youtubeUrl" type="url" required placeholder="https://www.youtube.com/watch?v=..." class="h-11 w-full rounded-xl border border-[#DDE1EA] px-3 text-[11px]"/><span class="application-text-meta mt-1 block leading-4 text-[#9297A5]">A mesma URL será usada como vídeo principal do artigo.</span></label>
        {:else}
          <label class="block rounded-2xl border border-dashed border-[#CBD0DC] bg-[#FAFBFD] p-5 text-center"><FileVideo2 size={27} class="mx-auto text-[#A7ADBA]"/><span class="mt-2 block text-[11px] font-semibold">Arquivo MP4 para análise e publicação</span><span class="application-text-meta mt-1 block text-[#9297A5]">Até {formatMegabytes(data.maxVideoBytes)} · o arquivo será armazenado e usado como vídeo principal</span><input type="file" name="videoFile" accept="video/mp4,.mp4" required class="application-text-caption mx-auto mt-3 block max-w-full"/></label>
        {/if}

        <label class="block"><span class="application-text-caption mb-1.5 block font-semibold text-[#555B6B]">ID externo estável <span class="font-normal text-[#9297A5]">(opcional)</span></span><input name="externalId" maxlength="200" placeholder="Ex.: cadastro-funcionario-video-01" class="h-10 w-full rounded-xl border border-[#DDE1EA] px-3 text-[11px]"/><span class="application-text-meta mt-1 block leading-4 text-[#9297A5]">Repita este valor para sobrescrever o mesmo conteúdo em uma nova geração. YouTube usa o ID do vídeo automaticamente quando este campo fica vazio.</span></label>

        <div class="rounded-xl border border-[#F1D7BD] bg-[#FFF9F3] px-4 py-3 text-[10px] leading-5 text-[#7A3B08]"><strong>O processamento pode levar alguns minutos.</strong> Depois de iniciar, mantenha esta aba aberta. O F10 mostrará a transcrição temporal, o planejamento das capturas e a validação dos screenshots até o rascunho ser salvo.</div>
        <button type="submit" disabled={isProcessing} class="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-[#000A57] px-5 text-[12px] font-semibold text-white disabled:cursor-not-allowed disabled:bg-[#B8BCC8]"><Sparkles size={17}/>Processar e criar rascunho</button>
      </form>
    </section>
  {/if}

  {#if importMode}
    <section class="mt-4 rounded-[20px] border border-[#D8DDF4] bg-[#F8F9FF] p-5">
      <div class="flex items-start gap-3"><Bot size={18} class="mt-0.5 shrink-0 text-[#000A57]"/><div><h2 class="text-[13px] font-semibold text-[#000A57]">Categorias editoriais disponíveis</h2><p class="mt-1 text-[10px] leading-5 text-[#6B7180]">A IA deve preferir categorias reais. Se não conseguir classificar com segurança, usa <strong>uncategorized</strong> apenas para permitir a criação do rascunho.</p></div></div>
      {#if realCategories.length === 0}
        <p class="mt-4 rounded-xl border border-[#F1D7BD] bg-white px-3 py-2 text-[10px] text-[#7A3B08]">Ainda não há categoria editorial real. O conteúdo pode ser criado, mas não poderá ser publicado até receber uma categoria real.</p>
      {:else}
        <div class="mt-4 flex flex-wrap gap-2">{#each realCategories as category}<span class="inline-flex items-center gap-1.5 rounded-full border border-[#D8DDF4] bg-white px-3 py-1.5 text-[10px] font-semibold text-[#454C60]"><HelpCategoryIcon name={category.icon} size={12}/>{category.name} · {category.slug}</span>{/each}</div>
      {/if}
    </section>

    <section class="mt-4 rounded-[20px] border border-[#DCE0EA] bg-white p-5">
      <h2 class="text-[13px] font-semibold text-[#303645]">Reimportação segura</h2>
      <p class="mt-2 text-[10px] leading-5 text-[#777D8D]">O par <strong>source + externalId</strong> identifica o mesmo conteúdo. Uma nova versão substitui o rascunho mantendo o mesmo ID, enquanto a publicação anterior continua atendendo até a nova revisão ser publicada.</p>
    </section>
  {/if}
</ApplicationContent>

{#if isProcessing}
  <div class="fixed inset-0 z-[120] flex items-center justify-center bg-[#0B1020]/60 p-4 backdrop-blur-sm">
    <section class="w-full max-w-[560px] rounded-[24px] border border-white/20 bg-white p-5 shadow-2xl sm:p-6" role="status" aria-live="polite">
      <div class="flex items-start gap-4">
        <span class="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#EEF0FF] text-[#000A57]"><LoaderCircle size={24} class="animate-spin"/></span>
        <div><h2 class="text-[16px] font-semibold text-[#11182C]">Processando o vídeo</h2><p class="mt-1 text-[10px] leading-5 text-[#777D8D]"><strong>Mantenha esta aba aberta.</strong> O tempo varia conforme a duração do vídeo, o download e a resposta da OpenAI.</p></div>
      </div>

      <div class="mt-5 space-y-2">
        {#each processingSteps as item}
          <div class={`flex items-start gap-3 rounded-xl border px-3 py-2.5 ${item.status === "done" ? "border-[#D7ECDD] bg-[#F6FBF7]" : "border-[#D8DDF4] bg-[#F8F9FF]"}`}>
            <span class={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full ${item.status === "done" ? "bg-[#DDF2E3] text-[#24703E]" : "bg-[#E9EBFF] text-[#000A57]"}`}>{#if item.status === "done"}<CheckCircle2 size={13}/>{:else}<LoaderCircle size={13} class="animate-spin"/>{/if}</span>
            <div><strong class="block text-[10px] text-[#3B4252]">{item.label}</strong>{#if item.detail}<small class="mt-0.5 block text-[9px] text-[#8A909E]">{item.detail}</small>{/if}</div>
          </div>
        {/each}
      </div>

      <div class="mt-5 rounded-xl border border-[#F1D7BD] bg-[#FFF9F3] px-4 py-3 text-[9px] leading-5 text-[#7A3B08]">Não atualize, feche ou navegue para outra página enquanto o processamento estiver em andamento. O rascunho só é confirmado quando a etapa <strong>Rascunho e screenshots salvos</strong> for concluída.</div>
    </section>
  </div>
{/if}
