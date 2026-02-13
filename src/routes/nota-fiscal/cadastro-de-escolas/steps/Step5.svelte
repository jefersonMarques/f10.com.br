<!-- src/routes/nota-fiscal/cadastro-de-escolas/steps/Step5.svelte -->
<script lang="ts">
  import { browser } from "$app/environment";
  import { tick, onDestroy } from "svelte";
  import { Camera, CheckCircle2, X, Eye, Lock } from "lucide-svelte";
  import { formDataStore, type FormErrors } from "../formStore";

  export let errors: FormErrors = {};
  export let selfieFile: File | null = null;

  // ==============================
  // Constantes
  // ==============================
  const maxFileSizeBytes = 2 * 1024 * 1024; // 2MB

  // ==============================
  // Câmera / Selfie
  // ==============================
  let cameraOverlayOpen = false;
  let cameraActive = false;

  let cameraStream: MediaStream | null = null;
  let videoEl: HTMLVideoElement | null = null;
  let canvasEl: HTMLCanvasElement | null = null;

  // Preview antes de confirmar (permite cancelar sem salvar)
  let pendingSelfie: { file: File; previewUrl: string } | null = null;

  function clearPendingSelfie() {
    if (pendingSelfie?.previewUrl) URL.revokeObjectURL(pendingSelfie.previewUrl);
    pendingSelfie = null;
  }

  function stopCamera() {
    if (!cameraStream) return;
    for (const track of cameraStream.getTracks()) track.stop();
    cameraStream = null;
    cameraActive = false;
  }

  async function startCamera() {
    if (!browser) return;

    try {
      clearPendingSelfie();
      stopCamera();

      cameraStream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: "user",
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: false,
      });

      if (videoEl) {
        videoEl.srcObject = cameraStream;
        await videoEl.play();
      }

      cameraActive = true;
    } catch {
      cameraActive = false;
    }
  }

  async function openCameraOverlay() {
    if (!browser) return;
    if (!$formDataStore.acceptedTerms) return;

    cameraOverlayOpen = true;
    await tick();
    await startCamera();
  }

  function closeCameraOverlay() {
    cameraOverlayOpen = false;
    clearPendingSelfie();
    stopCamera();
  }

  async function retakeSelfie() {
    clearPendingSelfie();
    await startCamera();
  }

  function confirmSelfie() {
    if (!pendingSelfie) return;
    selfieFile = pendingSelfie.file;
    closeCameraOverlay();
  }

  /**
   * Captura com compressão adaptativa (JPEG) para caber em 2MB.
   * Estratégia:
   * - normaliza largura máxima
   * - tenta qualidades decrescentes até ficar <= 2MB
   */
  async function captureSelfie() {
    if (!browser) return;
    if (!videoEl || !canvasEl) return;
    if (!cameraActive) return;

    const vW = videoEl.videoWidth || 1280;
    const vH = videoEl.videoHeight || 720;

    const maxW = 1280;
    const scale = Math.min(1, maxW / vW);
    const w = Math.max(1, Math.round(vW * scale));
    const h = Math.max(1, Math.round(vH * scale));

    canvasEl.width = w;
    canvasEl.height = h;

    const ctx = canvasEl.getContext("2d");
    if (!ctx) return;

    ctx.drawImage(videoEl, 0, 0, w, h);

    const qualities = [0.92, 0.86, 0.8, 0.72];
    let blob: Blob | null = null;

    for (const q of qualities) {
      blob = await new Promise((resolve) =>
        canvasEl!.toBlob((b) => resolve(b), "image/jpeg", q),
      );
      if (blob && blob.size <= maxFileSizeBytes) break;
    }

    if (!blob) return;
    if (blob.size > maxFileSizeBytes) return;

    const file = new File([blob], `selfie_${Date.now()}.jpg`, {
      type: "image/jpeg",
    });

    const previewUrl = URL.createObjectURL(file);
    pendingSelfie = { file, previewUrl };

    stopCamera();
  }

  // ==============================
  // Scroll lock (somente overlay da câmera)
  // ==============================
  let prevBodyOverflow = "";
  let prevHtmlOverflow = "";

  function lockScroll() {
    if (!browser) return;
    prevBodyOverflow = document.body.style.overflow;
    prevHtmlOverflow = document.documentElement.style.overflow;
    document.body.style.overflow = "hidden";
    document.documentElement.style.overflow = "hidden";
  }

  function unlockScroll() {
    if (!browser) return;
    document.body.style.overflow = prevBodyOverflow;
    document.documentElement.style.overflow = prevHtmlOverflow;
  }

  $: if (browser) {
    if (cameraOverlayOpen) lockScroll();
    else unlockScroll();
  }

  // ==============================
  // Regras de negócio
  // ==============================
  // Intenção: se o aceite for removido na etapa anterior, revoga selfie e fecha câmera.
  $: if (!$formDataStore.acceptedTerms) {
    if (cameraOverlayOpen) closeCameraOverlay();
    if (selfieFile) selfieFile = null;
  }

  onDestroy(() => {
    closeCameraOverlay();
    unlockScroll();
  });
</script>

<div class="space-y-10">
  <section class="rounded-2xl border border-black/10 bg-white/70 p-5 sm:p-6 space-y-4">
    <div class="flex items-start justify-between gap-4">
      <div>
        <h2 class="text-[18px] font-semibold text-black/85">
          Verificação (Selfie)
        </h2>
        <p class="mt-1 text-[13px] text-black/60 max-w-[80ch]">
          A selfie só é liberada após o aceite do contrato na etapa anterior.
        </p>
      </div>

      {#if $formDataStore.acceptedTerms}
        <span class="shrink-0 inline-flex items-center gap-2 rounded-xl px-3 py-2 text-[12px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200/70">
          <CheckCircle2 size={16} />
          Contrato aceito
        </span>
      {:else}
        <span class="shrink-0 inline-flex items-center gap-2 rounded-xl px-3 py-2 text-[12px] font-semibold text-black/70 bg-black/5 border border-black/10">
          <Lock size={16} />
          Bloqueado
        </span>
      {/if}
    </div>

    <!-- Selfie -->
    <div class="rounded-2xl border border-black/10 bg-white p-4 sm:p-5">
      <div class="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-5">
        <div class="space-y-2">
          <p class="text-[13px] font-semibold text-black/80">Selfie com documento</p>
          <p class="text-[13px] text-black/60 max-w-[80ch]">
            Tire uma selfie segurando seu documento de identidade aberto. Garanta que o rosto e os dados do documento estejam legíveis.
          </p>

          <div class="pt-2">
            <button
              type="button"
              class="rounded-xl px-6 py-3 text-[13px] font-semibold text-white bg-[var(--primary)] hover:brightness-110 disabled:opacity-60 disabled:cursor-not-allowed"
              on:click={openCameraOverlay}
              disabled={!$formDataStore.acceptedTerms}
            >
              <span class="inline-flex items-center gap-2">
                <Camera size={16} />
                {selfieFile ? "Refazer selfie" : "Realizar selfie"}
              </span>
            </button>

            {#if !$formDataStore.acceptedTerms}
              <div class="mt-2 text-[12px] text-black/50 flex items-center gap-2">
                <Eye size={14} />
                Aceite o contrato na etapa anterior para habilitar a câmera.
              </div>
            {/if}

            {#if selfieFile}
              <p class="mt-2 text-[13px] text-emerald-600">
                Selfie capturada com sucesso:
                <span class="font-semibold">{selfieFile.name}</span>
              </p>
            {/if}

            {#if errors.selfieFile}
              <p class="mt-2 text-[12px] text-red-600">{errors.selfieFile}</p>
            {/if}
          </div>
        </div>

        <div class="shrink-0">
          <img
            src="/selfie_documento.webp"
            alt="Exemplo: selfie segurando documento aberto, com rosto e dados visíveis."
            class="w-full max-w-xs rounded-xl border border-black/10 shadow-sm"
          />
          <p class="mt-2 text-[12px] text-black/45 max-w-xs">
            Exemplo ilustrativo.
          </p>
        </div>
      </div>
    </div>
  </section>
</div>

<!-- OVERLAY: Câmera (tela cheia) -->
{#if cameraOverlayOpen}
  <div class="fixed inset-0 z-[100] bg-black overflow-hidden">
    <div class="h-[100dvh] max-h-[100dvh] w-full flex flex-col">
      <!-- Header -->
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

      <!-- Conteúdo -->
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
              <span class="inline-block h-8 w-8 rounded-full border-2 border-white/20 border-t-white animate-spin"></span>
            </div>
          {/if}
        {/if}

        <!-- Barra inferior -->
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
                class="flex-1 inline-flex items-center justify-center gap-2 rounded-full px-6 py-4 text-[14px] font-semibold text-white bg-[var(--primary)] shadow-lg shadow-black/30 disabled:opacity-60 disabled:cursor-not-allowed"
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