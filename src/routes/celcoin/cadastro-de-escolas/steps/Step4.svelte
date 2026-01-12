<script lang="ts">
  import { Upload, Camera, CheckCircle2, Trash2, X } from "lucide-svelte";
  import type { DocFilesMap, DocTypeErrorsMap, PendingSelfie } from "$lib/types/celcoinSchoolRegistration";

  export let docFiles: DocFilesMap;
  export let docErrorsByType: DocTypeErrorsMap;
  export let docMessage: string;
  export let submitMessage: string;

  export let docCardBorderClass: (docType: "selfie") => string;
  export let formatBytes: (bytes: number) => string;

  export let openCameraOverlay: () => Promise<void>;
  export let closeCameraOverlay: () => void;
  export let captureSelfie: () => Promise<void> | void;
  export let confirmSelfie: () => void;
  export let retakeSelfie: () => Promise<void> | void;

  export let openFilePicker: (docType: "selfie") => void;
  export let removeDocFile: (docType: "selfie") => void;

  // Estado da câmera (controlado no parent)
  export let cameraOverlayOpen: boolean;
  export let cameraActive: boolean;
  export let pendingSelfie: PendingSelfie;

  // bind:this (referências sobem pro parent)
  export let videoEl: HTMLVideoElement | null = null;
  export let canvasEl: HTMLCanvasElement | null = null;
</script>

<div>
  <h2 class="text-[18px] font-semibold text-[var(--primary)]">
    Selfie com documento
  </h2>

  <div class="mt-4 grid grid-cols-1 md:grid-cols-2 gap-5">
    <div class={`rounded-2xl border ${docCardBorderClass("selfie")} bg-white p-5`}>
      <div class="flex items-center justify-between gap-3">
        <p class="text-[14px] font-semibold text-black/80">Como fazer</p>
        <Camera size={18} class="text-[var(--primary)]" />
      </div>

      <div class="mt-4 rounded-2xl overflow-hidden border border-black/10 bg-black/[0.02]">
        <img src="/selfie_documento.webp" alt="Exemplo selfie com documento" class="w-full h-auto" />
      </div>

      <ul class="mt-4 text-[13px] text-black/65 space-y-2">
        <li>• Ambiente bem iluminado (evite contraluz).</li>
        <li>• Segure o documento próximo ao rosto, sem cobrir sua face.</li>
        <li>• Texto do documento legível, sem reflexo ou tremido.</li>
        <li>• Olhe para a câmera (foto nítida).</li>
      </ul>

      <div class="mt-4 rounded-xl border border-black/10 bg-black/[0.02] px-4 py-3">
        {#if docFiles.selfie}
          <div class="flex items-start justify-between gap-3">
            <div class="min-w-0">
              <p class="text-[13px] font-semibold text-black/75 truncate">{docFiles.selfie.file.name}</p>
              <p class="text-[12px] text-black/50">{formatBytes(docFiles.selfie.file.size)}</p>
            </div>

            <div class="flex items-center gap-2">
              <CheckCircle2 size={18} class="text-[var(--primary)]" />

              <button
                type="button"
                class="inline-flex items-center justify-center rounded-xl px-3 py-2 text-[12px] font-semibold text-[var(--primary)] border border-[var(--primary)]/30 hover:bg-[var(--primary)]/10"
                on:click={() => removeDocFile("selfie")}
                aria-label="Remover selfie"
                title="Remover"
              >
                <Trash2 size={16} />
              </button>
            </div>
          </div>
        {:else}
          <p class="text-[13px] text-black/55">Nenhuma selfie enviada.</p>
        {/if}
      </div>

      {#if docErrorsByType.selfie}
        <p class="mt-3 text-[12px] text-red-600">{docErrorsByType.selfie}</p>
      {/if}

      {#if docMessage}
        <p class="mt-4 text-[13px] text-black/70">{docMessage}</p>
      {/if}
    </div>

    <div class={`rounded-2xl border ${docCardBorderClass("selfie")} bg-white p-5`}>
      <div class="flex items-center justify-between gap-3">
        <p class="text-[14px] font-semibold text-black/80">Enviar selfie</p>
        <Upload size={18} class="text-[var(--primary)]" />
      </div>

      <div class="mt-4 rounded-xl border border-black/10 bg-black/[0.02] px-4 py-3">
        <p class="text-[13px] text-black/65">
          Você pode tirar na câmera ou escolher um arquivo (JPG/PNG até 2MB).
        </p>
      </div>

      <div class="mt-4 flex flex-col sm:flex-row gap-3">
        <button
          type="button"
          class="flex-1 inline-flex items-center justify-center gap-2 rounded-xl px-4 py-3 text-[13px] font-semibold text-white bg-[var(--primary)] hover:brightness-110"
          on:click={openCameraOverlay}
        >
          <Camera size={16} />
          {docFiles.selfie ? "Tirar outra" : "Abrir câmera"}
        </button>

        <button
          type="button"
          class="flex-1 inline-flex items-center justify-center gap-2 rounded-xl px-4 py-3 text-[13px] font-semibold border border-black/15 bg-white hover:bg-black/[0.03]"
          on:click={() => openFilePicker("selfie")}
        >
          <Upload size={16} />
          {docFiles.selfie ? "Substituir arquivo" : "Escolher arquivo"}
        </button>
      </div>

      {#if submitMessage}
        <p class="mt-4 text-[13px] text-black/70">{submitMessage}</p>
      {/if}
    </div>
  </div>
</div>

{#if cameraOverlayOpen}
  <div class="fixed inset-0 z-[60] bg-black overflow-hidden">
    <div class="h-[100dvh] max-h-[100dvh] w-full flex flex-col">
      <div class="shrink-0 flex items-center justify-between px-4 py-3 border-b border-white/10 bg-black/60 backdrop-blur">
        <p class="text-white/90 text-[13px] font-semibold">
          {#if pendingSelfie}Prévia{:else}Câmera{/if}
        </p>

        <button
          type="button"
          class="inline-flex items-center gap-2 rounded-xl px-3 py-2 text-[12px] font-semibold text-white/90 border border-white/15 hover:bg-white/10"
          on:click={closeCameraOverlay}
        >
          <X size={16} />
          Cancelar
        </button>
      </div>

      <div class="relative flex-1 min-h-0 overflow-hidden">
        {#if pendingSelfie}
          <img
            src={pendingSelfie.previewUrl}
            alt="Prévia da selfie"
            class="absolute inset-0 w-full h-full object-contain bg-black"
          />
        {:else}
          <video
            bind:this={videoEl}
            playsinline
            class="absolute inset-0 w-full h-full object-contain bg-black"
          >
            <track kind="captions" />
          </video>

          <canvas bind:this={canvasEl} class="hidden"></canvas>

          {#if !cameraActive}
            <div class="absolute inset-0 flex items-center justify-center">
              <span class="inline-block h-8 w-8 rounded-full border-2 border-white/20 border-t-[var(--primary)] animate-spin"></span>
            </div>
          {/if}
        {/if}

        <div class="absolute inset-x-0 bottom-0 px-5 pt-4 pb-[calc(env(safe-area-inset-bottom)+1.25rem)] flex items-center justify-center bg-gradient-to-t from-black/70 to-transparent">
          {#if pendingSelfie}
            <div class="w-full max-w-[520px] flex flex-col sm:flex-row gap-3">
              <button
                type="button"
                class="flex-1 inline-flex items-center justify-center gap-2 rounded-full px-6 py-4 text-[14px] font-semibold text-white bg-[var(--primary)] shadow-lg shadow-black/30"
                on:click={confirmSelfie}
              >
                <CheckCircle2 size={18} />
                Usar foto
              </button>

              <button
                type="button"
                class="flex-1 inline-flex items-center justify-center gap-2 rounded-full px-6 py-4 text-[14px] font-semibold text-white/90 border border-white/20 hover:bg-white/10"
                on:click={retakeSelfie}
              >
                <Camera size={18} />
                Tirar outra
              </button>

              <button
                type="button"
                class="flex-1 inline-flex items-center justify-center gap-2 rounded-full px-6 py-4 text-[14px] font-semibold text-white/90 border border-white/20 hover:bg-white/10"
                on:click={closeCameraOverlay}
              >
                <X size={18} />
                Cancelar
              </button>
            </div>
          {:else}
            <div class="w-full max-w-[420px] flex flex-col sm:flex-row gap-3">
              <button
                type="button"
                class="flex-1 inline-flex items-center justify-center gap-2 rounded-full px-6 py-4 text-[14px] font-semibold text-white bg-[var(--primary)] shadow-lg shadow-black/30 disabled:opacity-60"
                on:click={captureSelfie}
                disabled={!cameraActive}
              >
                <Camera size={18} />
                Capturar
              </button>

              <button
                type="button"
                class="flex-1 inline-flex items-center justify-center gap-2 rounded-full px-6 py-4 text-[14px] font-semibold text-white/90 border border-white/20 hover:bg-white/10"
                on:click={closeCameraOverlay}
              >
                <X size={18} />
                Cancelar
              </button>
            </div>
          {/if}
        </div>
      </div>
    </div>
  </div>
{/if}
