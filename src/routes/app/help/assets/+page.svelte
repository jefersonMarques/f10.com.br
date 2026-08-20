<script lang="ts">
  import { FileText, HardDrive, Image, Link2, Trash2, UploadCloud } from "lucide-svelte";
  import ApplicationBackLink from "$lib/components/application/ApplicationBackLink.svelte";
  import ApplicationContent from "$lib/components/application/ApplicationContent.svelte";
  import type { ActionData, PageData } from "./$types";

  export let data: PageData;
  export let form: ActionData;

  function formatBytes(value: number | null): string {
    if (!value) return "—";
    if (value < 1024) return `${value} B`;
    if (value < 1024 * 1024) return `${(value / 1024).toFixed(1)} KB`;
    return `${(value / (1024 * 1024)).toFixed(1)} MB`;
  }
</script>

<svelte:head><title>Biblioteca de arquivos | F10 Operations</title></svelte:head>

<ApplicationContent width="wide">
  <ApplicationBackLink href="/app/help/content" label="Conteúdos" className="mb-3" />

  <section class="flex items-center gap-3 rounded-2xl border border-[#E2E5ED] bg-white px-4 py-3">
    <HardDrive size={18} class="text-[#000A57]" aria-hidden="true" />
    <div class="min-w-0 flex-1">
      <strong class="block text-[11px] text-[#303645]">{data.storage.provider === "s3" ? "S3 / MinIO" : "Armazenamento desativado"}</strong>
      <span class="application-text-meta block truncate text-[#9297A5]">{data.storage.configured ? `${data.storage.bucket} · ${data.storage.endpoint}` : "Configure em Configurações > Armazenamento"}</span>
    </div>
    <span class={`application-text-meta rounded-full px-2 py-1 font-bold ${data.storage.configured ? "bg-[#EEF8F1] text-[#2F7045]" : "bg-[#FFF0F0] text-[#9B3C3C]"}`}>{data.storage.configured ? "Configurado" : "Pendente"}</span>
  </section>

  {#if form?.message}
    <div class={`application-text-caption mt-3 rounded-xl px-4 py-3 font-medium ${form.success ? "bg-[#EEF8F1] text-[#2F7045]" : "bg-[#FFF0F0] text-[#9B3C3C]"}`}>{form.message}</div>
  {/if}

  <div class="mt-4 grid gap-5 xl:grid-cols-[360px_minmax(0,1fr)]">
    {#if data.canEdit}
      <section class="h-fit rounded-[22px] border border-[#E2E5ED] bg-white p-5">
        <div class="flex items-center gap-3"><UploadCloud size={19} class="text-[#000A57]"/><div><h2 class="text-[14px] font-semibold">Novo arquivo</h2><p class="application-text-meta mt-1 text-[#9297A5]">Imagens até 10 MB; documentos até 25 MB.</p></div></div>
        <form method="POST" action="?/upload" enctype="multipart/form-data" class="mt-5 space-y-4">
          <label class="block rounded-2xl border border-dashed border-[#C9CEDA] bg-[#FAFAFC] p-5 text-center">
            <span class="application-text-caption block font-semibold text-[#555B6B]">Selecionar arquivo</span>
            <input name="file" type="file" required accept="image/png,image/jpeg,image/webp,image/gif,application/pdf,.docx,.xlsx,.xls,.csv,.txt" class="application-text-meta mt-3 block w-full text-[#777D8D]" />
          </label>
          <label class="block"><span class="application-text-caption mb-1.5 block font-semibold text-[#555B6B]">Texto alternativo</span><input name="altText" maxlength="500" class="h-10 w-full rounded-xl border border-[#DDE1EA] px-3 text-[11px]" /></label>
          <label class="block"><span class="application-text-caption mb-1.5 block font-semibold text-[#555B6B]">Resumo para IA</span><textarea name="aiSummary" maxlength="20000" rows="4" class="application-text-caption w-full rounded-xl border border-[#DDE1EA] px-3 py-2.5 leading-5"></textarea></label>
          <button type="submit" disabled={!data.storage.configured} class="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-[#000A57] px-4 text-[11px] font-semibold text-white disabled:bg-[#C8CBD5]"><UploadCloud size={16}/>Enviar para biblioteca</button>
        </form>
      </section>
    {/if}

    <section class="overflow-hidden rounded-[22px] border border-[#E2E5ED] bg-white">
      <header class="border-b border-[#EEF0F5] px-5 py-4"><h2 class="text-[14px] font-semibold">Arquivos ({data.assets.length})</h2><p class="application-text-meta mt-1 text-[#9297A5]">Vincular um arquivo a um passo transforma o conteúdo em rascunho até nova publicação.</p></header>
      {#if data.assets.length === 0}
        <div class="application-text-caption py-16 text-center text-[#9297A5]">Nenhum arquivo na biblioteca.</div>
      {:else}
        <div class="grid gap-px bg-[#EEF0F5] sm:grid-cols-2 lg:grid-cols-3">
          {#each data.assets as asset}
            <article class="bg-white p-4">
              <div class="flex h-24 items-center justify-center rounded-xl bg-[#F7F8FB]">
                {#if asset.assetType === "image"}<Image size={30} class="text-[#000A57]"/>{:else}<FileText size={30} class="text-[#EA6D0B]"/>{/if}
              </div>
              <strong class="application-text-caption mt-3 block truncate text-[#303645]">{asset.originalName ?? asset.id}</strong>
              <p class="application-text-meta mt-1 text-[#9297A5]">{asset.mimeType ?? asset.assetType} · {formatBytes(asset.sizeBytes)}</p>

              {#if data.canEdit && (asset.assetType === "image" || asset.assetType === "file") && data.targets.length > 0}
                <details class="mt-3 rounded-xl border border-[#E1E4EC] bg-[#FAFAFC] p-3">
                  <summary class="application-text-meta flex cursor-pointer list-none items-center gap-2 font-semibold text-[#000A57]"><Link2 size={13}/>Usar em um passo</summary>
                  <form method="POST" action="?/attach" class="mt-3 space-y-2">
                    <input type="hidden" name="assetId" value={asset.id} />
                    <select name="stepId" required class="application-text-meta h-9 w-full rounded-lg border border-[#DDE1EA] bg-white px-2">
                      <option value="" disabled selected>Selecione conteúdo / passo</option>
                      {#each data.targets as target}
                        <option value={target.stepId}>{target.contentTitle} — {target.stepTitle}</option>
                      {/each}
                    </select>
                    {#if asset.assetType === "file"}<input name="label" maxlength="240" value={asset.originalName ?? "Baixar arquivo"} class="application-text-meta h-9 w-full rounded-lg border border-[#DDE1EA] bg-white px-2" />{/if}
                    <button type="submit" class="application-text-meta min-h-9 w-full rounded-lg bg-[#000A57] font-semibold text-white">Adicionar ao passo</button>
                  </form>
                </details>
              {/if}

              <div class="mt-3 flex items-center justify-between gap-2">
                <a href={`/api/app/help/assets/${asset.id}`} target="_blank" rel="noopener noreferrer" class="application-text-meta font-semibold text-[#000A57]">Abrir</a>
                {#if data.canEdit}
                  <form method="POST" action="?/delete"><input type="hidden" name="assetId" value={asset.id}/><button type="submit" class="inline-flex h-8 w-8 items-center justify-center rounded-lg text-[#A34242] hover:bg-[#FFF0F0]" aria-label="Excluir"><Trash2 size={14}/></button></form>
                {/if}
              </div>
            </article>
          {/each}
        </div>
      {/if}
    </section>
  </div>
</ApplicationContent>
