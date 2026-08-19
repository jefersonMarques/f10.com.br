<script lang="ts">
  import { invalidateAll } from "$app/navigation";
  import { Film, UploadCloud } from "lucide-svelte";

  export let pathId: string;
  export let stepId: string;

  const MAX_BYTES = 25 * 1024 * 1024;
  const MAX_SECONDS = 60;

  let fileInput: HTMLInputElement;
  let uploading = false;
  let dragActive = false;
  let message = "";
  let errorMessage = "";

  function getBrowserDuration(file: File): Promise<number> {
    return new Promise((resolve, reject) => {
      const objectUrl = URL.createObjectURL(file);
      const video = document.createElement("video");
      video.preload = "metadata";
      video.onloadedmetadata = () => {
        const duration = video.duration;
        URL.revokeObjectURL(objectUrl);
        if (!Number.isFinite(duration) || duration <= 0) reject(new Error("INVALID_DURATION"));
        else resolve(duration);
      };
      video.onerror = () => {
        URL.revokeObjectURL(objectUrl);
        reject(new Error("INVALID_VIDEO"));
      };
      video.src = objectUrl;
    });
  }

  async function uploadVideo(file: File): Promise<void> {
    if (uploading) return;
    message = "";
    errorMessage = "";

    if (file.type.toLowerCase() !== "video/mp4") {
      errorMessage = "Use um vídeo MP4.";
      return;
    }
    if (file.size > MAX_BYTES) {
      errorMessage = "O vídeo deve ter no máximo 25 MB.";
      return;
    }

    try {
      const duration = await getBrowserDuration(file);
      if (duration > MAX_SECONDS + 0.05) {
        errorMessage = `Este vídeo tem cerca de ${Math.ceil(duration)}s. O limite é 60s; divida a demonstração em microações menores.`;
        return;
      }
    } catch {
      errorMessage = "Não foi possível ler este MP4. Exporte o vídeo novamente e tente outra vez.";
      return;
    }

    uploading = true;
    try {
      const body = new FormData();
      body.set("file", file, file.name || "demonstracao.mp4");
      const response = await fetch(`/api/app/help/trilhas/${pathId}/steps/${stepId}/video`, {
        method: "POST",
        body,
      });
      const result = await response.json() as {
        success?: boolean;
        message?: string;
        durationSeconds?: number;
      };
      if (!response.ok || !result.success) {
        errorMessage = result.message ?? "Não foi possível enviar o vídeo.";
        return;
      }

      const durationLabel = typeof result.durationSeconds === "number"
        ? ` (${result.durationSeconds.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}s)`
        : "";
      message = `${result.message ?? "Vídeo adicionado."}${durationLabel}`;
      if (fileInput) fileInput.value = "";
      await invalidateAll();
    } catch {
      errorMessage = "Não foi possível enviar o vídeo.";
    } finally {
      uploading = false;
    }
  }

  function handleFileInput(event: Event): void {
    const input = event.currentTarget as HTMLInputElement;
    const file = input.files?.[0];
    if (file) void uploadVideo(file);
  }

  function handleDrop(event: DragEvent): void {
    event.preventDefault();
    dragActive = false;
    const file = Array.from(event.dataTransfer?.files ?? []).find((item) => item.type === "video/mp4");
    if (file) void uploadVideo(file);
    else errorMessage = "Arraste um vídeo MP4.";
  }
</script>

<div
  class={`rounded-xl border border-dashed p-3 transition ${dragActive ? "border-[#EA6D0B] bg-[#FFF7ED]" : "border-[#CDD2DD] bg-[#FAFAFC]"}`}
  role="group"
  aria-label="Upload de microvídeo de treinamento"
  on:dragenter|preventDefault={() => (dragActive = true)}
  on:dragover|preventDefault={() => (dragActive = true)}
  on:dragleave={() => (dragActive = false)}
  on:drop={handleDrop}
>
  <div class="flex items-start gap-3">
    <span class="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white text-[#EA6D0B] shadow-sm">
      <Film size={17} aria-hidden="true" />
    </span>
    <div class="min-w-0 flex-1">
      <strong class="application-text-caption block font-semibold text-[#303645]">Demonstração em microvídeo</strong>
      <span class="application-text-caption mt-1 block leading-5 text-[#858B99]">MP4 · máximo 60 segundos · até 25 MB. O ideal é manter entre 20 e 45 segundos e ensinar somente uma ação.</span>
    </div>
  </div>

  <input
    bind:this={fileInput}
    type="file"
    accept="video/mp4,.mp4"
    class="sr-only"
    on:change={handleFileInput}
  />

  <button
    type="button"
    disabled={uploading}
    on:click={() => fileInput?.click()}
    class="application-text-caption mt-3 inline-flex min-h-9 w-full items-center justify-center gap-2 rounded-lg bg-[#EA6D0B] px-3 font-semibold text-white disabled:cursor-wait disabled:opacity-60"
  >
    <UploadCloud size={14} class={uploading ? "animate-pulse" : ""} aria-hidden="true" />
    {uploading ? "Validando e enviando..." : "Selecionar ou arrastar MP4"}
  </button>

  {#if message}<p class="application-text-meta mt-2 font-medium text-[#257342]">{message}</p>{/if}
  {#if errorMessage}<p class="application-text-meta mt-2 font-medium text-[#A52A2A]">{errorMessage}</p>{/if}
</div>