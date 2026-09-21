<script lang="ts">
  import {
    Download,
    Eye,
    FileText,
    HardDrive,
    Image,
    Link2,
    Trash2,
    UploadCloud,
    Video,
    X,
  } from "lucide-svelte";
  import ApplicationBackLink from "$lib/components/application/ApplicationBackLink.svelte";
  import ApplicationContent from "$lib/components/application/ApplicationContent.svelte";
  import type { ActionData, PageData } from "./$types";

  export let data: PageData;
  export let form: ActionData;

  type Asset = PageData["assets"][number];

  let selectedAsset: Asset | null = null;

  function formatBytes(value: number | null): string {
    if (!value) return "—";
    if (value < 1024) return `${value} B`;
    if (value < 1024 * 1024) return `${(value / 1024).toFixed(1)} KB`;
    return `${(value / (1024 * 1024)).toFixed(1)} MB`;
  }

  function assetUrl(assetId: string, preview = false): string {
    return `/api/app/help/assets/${assetId}${preview ? "?preview=1" : ""}`;
  }

  function supportsBrowserDocumentPreview(asset: Asset): boolean {
    return ["application/pdf", "text/plain", "text/csv", "text/vtt"].includes(
      asset.mimeType ?? "",
    );
  }

  function closePreview(): void {
    selectedAsset = null;
  }
</script>

<svelte:head><title>Biblioteca de arquivos | F10 Operations</title></svelte:head>
<svelte:window on:keydown={(event) => { if (event.key === "Escape") closePreview(); }} />

<ApplicationContent width="wide">
  <ApplicationBackLink href="/app/help/content" label="Conteúdos" className="mb-3" />

  <section class="flex items-center gap-3 rounded-2xl border border-[#E2E5ED] bg-white px-4 py-3">
    <HardDrive size={18} class="text-[#000A57]" aria-hidden="true" />
    <div class="min-w-0 flex-1"><strong class="block text-[11px] text-[#303645]">{data.storage.provider === "s3" ? "S3 / MinIO" : "Armazenamento desativado"}</strong><span class="application-text-meta block truncate text-[#9297A5]">{data.storage.configured ? `${data.storage.bucket} · ${data.storage.endpoint}` : "Configure em Configurações > Armazenamento"}</span></div>
    <span class={`application-text-meta rounded-full px-2 py-1 font-bold ${data.storage.configured ? "bg-[#EEF8F1] text-[#2F7045]" : "bg-[#FFF0F0] text-[#9B3C3C]"}`}>{data.storage.configured ? "Configurado" : "Pendente"}</span>
  </section>

  {#if form?.message}<div class={`application-text-caption mt-3 rounded-xl px-4 py-3 font-medium ${form.success ? "bg-[#EEF8F1] text-[#2F7045]" : "bg-[#FFF0F0] text-[#9B3C3C]"}`}>{form.message}</div>{/if}

  <div class="mt-4 grid gap-5 xl:grid-cols-[360px_minmax(0,1fr)]">
    {#if data.canEdit}
      <section class="h-fit rounded-[22px] border border-[#E2E5ED] bg-white p-5">
        <div class="flex items-center gap-3"><UploadCloud size={19} class="text-[#000A57]"/><div><h2 class="text-[14px] font-semibold">Novo arquivo</h2><p class="application-text-meta mt-1 text-[#9297A5]">Imagens até 10 MB; documentos até 25 MB.</p></div></div>
        <form method="POST" action="?/upload" enctype="multipart/form-data" class="mt-5 space-y-4">
          <label class="block rounded-2xl border border-dashed border-[#C9CEDA] bg-[#FAFAFC] p-5 text-center"><span class="application-text-caption block font-semibold text-[#555B6B]">Selecionar arquivo</span><input name="file" type="file" required accept="image/png,image/jpeg,image/webp,image/gif,application/pdf,.docx,.xlsx,.xls,.csv,.txt" class="application-text-meta mt-3 block w-full text-[#777D8D]" /></label>
          <label class="block"><span class="application-text-caption mb-1.5 block font-semibold text-[#555B6B]">Texto alternativo</span><input name="altText" maxlength="500" class="h-10 w-full rounded-xl border border-[#DDE1EA] px-3 text-[11px]" /></label>
          <label class="block"><span class="application-text-caption mb-1.5 block font-semibold text-[#555B6B]">Descrição adicional do conteúdo visual</span><textarea name="assistantDescription" maxlength="20000" rows="3" class="application-text-caption w-full rounded-xl border border-[#DDE1EA] px-3 py-2.5 leading-5"></textarea></label>
          <label class="block"><span class="application-text-caption mb-1.5 block font-semibold text-[#555B6B]">Texto extraído do documento</span><textarea name="extractedText" maxlength="200000" rows="5" placeholder="Opcional. Para TXT/CSV ou conteúdo extraído de PDF/DOCX/XLSX." class="application-text-caption w-full rounded-xl border border-[#DDE1EA] px-3 py-2.5 leading-5"></textarea></label>
          <label class="block"><span class="application-text-caption mb-1.5 block font-semibold text-[#555B6B]">Resumo operacional opcional</span><textarea name="assistantSummary" maxlength="20000" rows="3" class="application-text-caption w-full rounded-xl border border-[#DDE1EA] px-3 py-2.5 leading-5"></textarea></label>
          <button type="submit" disabled={!data.storage.configured} class="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-[#000A57] px-4 text-[11px] font-semibold text-white disabled:bg-[#C8CBD5]"><UploadCloud size={16}/>Enviar para biblioteca</button>
        </form>
      </section>
    {/if}

    <section class="overflow-hidden rounded-[22px] border border-[#E2E5ED] bg-white">
      <header class="border-b border-[#EEF0F5] px-5 py-4"><h2 class="text-[14px] font-semibold">Arquivos ({data.assets.length})</h2><p class="application-text-meta mt-1 text-[#9297A5]">Clique em Preview para inspecionar imagens e documentos antes de reutilizá-los em um passo.</p></header>
      {#if data.assets.length === 0}
        <div class="application-text-caption py-16 text-center text-[#9297A5]">Nenhum arquivo na biblioteca.</div>
      {:else}
        <div class="grid gap-px bg-[#EEF0F5] sm:grid-cols-2 lg:grid-cols-3">
          {#each data.assets as asset}
            <article class="bg-white p-4">
              <button type="button" class="group flex h-32 w-full items-center justify-center overflow-hidden rounded-xl bg-[#F7F8FB]" on:click={() => (selectedAsset = asset)} aria-label={`Visualizar ${asset.originalName ?? "arquivo"}`}>
                {#if asset.assetType === "image"}
                  <img src={assetUrl(asset.id, true)} alt={asset.altText || asset.originalName || "Imagem"} loading="lazy" class="h-full w-full object-contain transition group-hover:scale-[1.02]" />
                {:else if asset.assetType === "video"}
                  <div class="flex flex-col items-center gap-2 text-[#000A57]"><Video size={30}/><span class="application-text-meta font-semibold">Vídeo</span></div>
                {:else}
                  <div class="flex flex-col items-center gap-2 text-[#EA6D0B]"><FileText size={30}/><span class="application-text-meta font-semibold">{asset.mimeType === "application/pdf" ? "PDF" : "Documento"}</span></div>
                {/if}
              </button>
              <strong class="application-text-caption mt-3 block truncate text-[#303645]">{asset.originalName ?? asset.id}</strong>
              <p class="application-text-meta mt-1 text-[#9297A5]">{asset.mimeType ?? asset.assetType} · {formatBytes(asset.sizeBytes)}</p>
              {#if asset.assistantDescription}<p class="mt-2 line-clamp-3 text-[10px] leading-4 text-[#6F7584]">{asset.assistantDescription}</p>{/if}
              {#if asset.extractedText}<span class="application-text-meta mt-2 inline-flex rounded-full bg-[#EEF8F1] px-2 py-1 font-semibold text-[#2F7045]">Texto indexável</span>{/if}

              {#if data.canEdit && (asset.assetType === "image" || asset.assetType === "file") && data.targets.length > 0}
                <details class="mt-3 rounded-xl border border-[#E1E4EC] bg-[#FAFAFC] p-3"><summary class="application-text-meta flex cursor-pointer list-none items-center gap-2 font-semibold text-[#000A57]"><Link2 size={13}/>Usar em um passo</summary><form method="POST" action="?/attach" class="mt-3 space-y-2"><input type="hidden" name="assetId" value={asset.id} /><select name="stepId" required class="application-text-meta h-9 w-full rounded-lg border border-[#DDE1EA] bg-white px-2"><option value="" disabled selected>Selecione conteúdo / passo</option>{#each data.targets as target}<option value={target.stepId}>{target.contentTitle} — {target.stepTitle}</option>{/each}</select>{#if asset.assetType === "file"}<input name="label" maxlength="240" value={asset.originalName ?? "Baixar arquivo"} class="application-text-meta h-9 w-full rounded-lg border border-[#DDE1EA] bg-white px-2" />{/if}<button type="submit" class="application-text-meta min-h-9 w-full rounded-lg bg-[#000A57] font-semibold text-white">Adicionar ao passo</button></form></details>
              {/if}

              <div class="mt-3 flex items-center justify-between gap-2">
                <div class="flex gap-3">
                  <button type="button" on:click={() => (selectedAsset = asset)} class="application-text-meta inline-flex items-center gap-1.5 font-semibold text-[#000A57]"><Eye size={13}/>Preview</button>
                  <a href={assetUrl(asset.id)} target="_blank" rel="noopener noreferrer" class="application-text-meta inline-flex items-center gap-1.5 font-semibold text-[#626979]"><Download size={13}/>Abrir</a>
                </div>
                {#if data.canEdit}<form method="POST" action="?/delete"><input type="hidden" name="assetId" value={asset.id}/><button type="submit" class="inline-flex h-8 w-8 items-center justify-center rounded-lg text-[#A34242] hover:bg-[#FFF0F0]" aria-label="Excluir"><Trash2 size={14}/></button></form>{/if}
              </div>
            </article>
          {/each}
        </div>
      {/if}
    </section>
  </div>
</ApplicationContent>

{#if selectedAsset}
  <div class="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4" role="presentation" on:click={closePreview}>
    <section class="flex max-h-[92vh] w-full max-w-5xl flex-col overflow-hidden rounded-[22px] bg-white shadow-2xl" role="dialog" aria-modal="true" aria-label={`Preview de ${selectedAsset.originalName ?? "arquivo"}`} on:click|stopPropagation>
      <header class="flex items-start justify-between gap-4 border-b border-[#E8EAF0] px-5 py-4">
        <div class="min-w-0"><h2 class="truncate text-[14px] font-semibold text-[#202637]">{selectedAsset.originalName ?? selectedAsset.id}</h2><p class="application-text-meta mt-1 text-[#858B99]">{selectedAsset.mimeType ?? selectedAsset.assetType} · {formatBytes(selectedAsset.sizeBytes)}</p></div>
        <button type="button" class="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-[#6F7584] hover:bg-[#F3F4F7]" on:click={closePreview} aria-label="Fechar preview"><X size={18}/></button>
      </header>

      <div class="min-h-0 flex-1 overflow-auto bg-[#F7F8FB] p-4 sm:p-6">
        {#if selectedAsset.assetType === "image"}
          <div class="flex min-h-[300px] items-center justify-center"><img src={assetUrl(selectedAsset.id, true)} alt={selectedAsset.altText || selectedAsset.originalName || "Imagem"} class="max-h-[72vh] max-w-full rounded-xl bg-white object-contain shadow-sm" /></div>
        {:else if selectedAsset.assetType === "video"}
          <video src={assetUrl(selectedAsset.id, true)} controls class="mx-auto max-h-[72vh] max-w-full rounded-xl bg-black">Seu navegador não consegue reproduzir este vídeo.</video>
        {:else if supportsBrowserDocumentPreview(selectedAsset)}
          <iframe src={assetUrl(selectedAsset.id, true)} title={`Preview de ${selectedAsset.originalName ?? "arquivo"}`} class="h-[70vh] w-full rounded-xl border border-[#DDE1EA] bg-white"></iframe>
        {:else if selectedAsset.extractedText}
          <div class="rounded-xl border border-[#DDE1EA] bg-white p-5"><p class="application-text-meta mb-3 font-bold uppercase tracking-[0.08em] text-[#777D8D]">Texto extraído</p><pre class="whitespace-pre-wrap break-words font-sans text-[11px] leading-6 text-[#4E5565]">{selectedAsset.extractedText}</pre></div>
        {:else if selectedAsset.assistantSummary}
          <div class="rounded-xl border border-[#DDE1EA] bg-white p-5"><p class="application-text-meta mb-3 font-bold uppercase tracking-[0.08em] text-[#777D8D]">Resumo disponível</p><p class="whitespace-pre-wrap text-[11px] leading-6 text-[#4E5565]">{selectedAsset.assistantSummary}</p></div>
        {:else}
          <div class="mx-auto max-w-xl rounded-xl border border-[#DDE1EA] bg-white p-8 text-center"><FileText size={32} class="mx-auto text-[#A6ABB7]"/><p class="mt-4 text-[12px] font-semibold text-[#444B5B]">Este formato não possui preview nativo no navegador.</p><p class="application-text-caption mt-2 leading-5 text-[#858B99]">Baixe o arquivo para visualizá-lo ou adicione texto extraído para consulta dentro da biblioteca.</p></div>
        {/if}
      </div>

      <footer class="flex flex-wrap items-center justify-between gap-3 border-t border-[#E8EAF0] px-5 py-3">
        <div class="min-w-0 text-[10px] leading-5 text-[#777D8D]">{#if selectedAsset.altText}<strong>Descrição:</strong> {selectedAsset.altText}{:else}Sem descrição visual informada.{/if}</div>
        <a href={assetUrl(selectedAsset.id)} target="_blank" rel="noopener noreferrer" class="application-text-caption inline-flex min-h-9 items-center gap-2 rounded-lg bg-[#000A57] px-3 font-semibold text-white"><Download size={14}/>Abrir arquivo</a>
      </footer>
    </section>
  </div>
{/if}
