<script lang="ts">
  import { Upload, FileText, CheckCircle2, XCircle, Trash2 } from "lucide-svelte";
  import type {
    DocFilesMap,
    DocType,
    DocTypeAttentionMap,
    DocTypeErrorsMap,
    Step3DocType,
    UploadedFile,
  } from "$lib/types/celcoinSchoolRegistration";

  export let step3DocTypes: Step3DocType[];
  export let docFiles: DocFilesMap;

  export let docErrorsByType: DocTypeErrorsMap;
  export let docAttentionByType: DocTypeAttentionMap;
  export let docMessage: string;

  export let maxFilesPerDocType: number;

  export let docTitle: (docType: DocType) => string;
  export let docHint: (docType: DocType) => string;
  export let docCardBorderClass: (docType: DocType) => string;

  export let formatBytes: (bytes: number) => string;

  export let openFilePicker: (docType: DocType) => void;
  export let removeDocFileById: (docType: Step3DocType, id: string) => void;
  export let clearDocFiles: (docType: Step3DocType) => void;
</script>

<div>
  <h2 class="text-[18px] font-semibold text-[var(--primary)]">
    Documentos
  </h2>

  <div class="mt-4 rounded-2xl bg-[var(--page-bg)] border border-black/5 p-4">
    <div class="flex items-start gap-3">
      <div class="mt-0.5">
        <FileText size={18} class="text-[var(--primary)]" />
      </div>
      <div class="text-[13px] text-black/65 space-y-1">
        <p>Envie os documentos obrigatórios (você pode anexar mais de um arquivo por item).</p>
        <p>Formatos aceitos: PDF, JPG, PNG (até 2MB por arquivo).</p>
      </div>
    </div>
  </div>

  <div class="mt-6 grid grid-cols-1 md:grid-cols-3 gap-5">
    {#each step3DocTypes as dt (dt)}
      <div class={`rounded-2xl border ${docCardBorderClass(dt)} bg-white p-5`}>
        <div class="flex items-start justify-between gap-3">
          <div class="min-w-0">
            <p class="text-[14px] font-semibold text-black/80">{docTitle(dt)}</p>
            <p class="mt-1 text-[12px] text-black/55">{docHint(dt)}</p>
          </div>

          {#if docFiles[dt].length > 0}
            <CheckCircle2 size={18} class="text-[var(--primary)]" />
          {:else}
            <XCircle
              size={18}
              class={docAttentionByType[dt] ? "text-red-500" : "text-black/25"}
            />
          {/if}
        </div>

        <div class="mt-4 space-y-2">
          {#if docFiles[dt].length > 0}
            {#each docFiles[dt] as uf (uf.id)}
              <div class="flex items-start justify-between gap-3 rounded-xl border border-black/10 bg-black/[0.02] px-4 py-3">
                <div class="min-w-0">
                  <p class="text-[13px] font-semibold text-black/75 truncate">{uf.file.name}</p>
                  <p class="text-[12px] text-black/50">{formatBytes(uf.file.size)}</p>
                </div>

                <button
                  type="button"
                  class="inline-flex items-center justify-center rounded-xl px-3 py-2 text-[12px] font-semibold text-[var(--primary)] border border-[var(--primary)]/30 hover:bg-[var(--primary)]/10"
                  on:click={() => removeDocFileById(dt, uf.id)}
                  aria-label="Remover arquivo"
                  title="Remover"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            {/each}
          {:else}
            <div class="rounded-xl border border-black/10 bg-black/[0.02] px-4 py-3">
              <p class="text-[13px] text-black/55">Nenhum arquivo enviado.</p>
            </div>
          {/if}
        </div>

        {#if docErrorsByType[dt]}
          <p class="mt-3 text-[12px] text-red-600">{docErrorsByType[dt]}</p>
        {/if}

        <div class="mt-4 flex gap-3">
          <button
            type="button"
            class="flex-1 inline-flex items-center justify-center gap-2 rounded-xl px-4 py-3 text-[13px] font-semibold text-white bg-[var(--primary)] hover:brightness-110"
            on:click={() => openFilePicker(dt)}
          >
            <Upload size={16} />
            {docFiles[dt].length > 0 ? "Adicionar" : "Enviar"}
          </button>

          {#if docFiles[dt].length > 0}
            <button
              type="button"
              class="inline-flex items-center justify-center rounded-xl px-4 py-3 text-[13px] font-semibold text-[var(--primary)] border border-[var(--primary)]/30 hover:bg-[var(--primary)]/10"
              on:click={() => clearDocFiles(dt)}
              aria-label="Remover todos"
              title="Remover todos"
            >
              <Trash2 size={16} />
            </button>
          {/if}
        </div>

        {#if docFiles[dt].length > 0}
          <p class="mt-3 text-[12px] text-black/50">
            {docFiles[dt].length} arquivo(s) anexado(s) — limite {maxFilesPerDocType}.
          </p>
        {/if}
      </div>
    {/each}
  </div>

  {#if docMessage}
    <p class="mt-4 text-[13px] text-black/70">{docMessage}</p>
  {/if}
</div>
