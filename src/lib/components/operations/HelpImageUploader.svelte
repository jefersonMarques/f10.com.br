<script context="module" lang="ts">
  let activeUploaderStepId: string | null = null;
</script>

<script lang="ts">
  import { invalidateAll } from "$app/navigation";
  import { onMount } from "svelte";
  import { ClipboardPaste, Image as ImageIcon, UploadCloud } from "lucide-svelte";

  export let contentId: string;
  export let stepId: string;

  let fileInput: HTMLInputElement;
  let uploading = false;
  let dragActive = false;
  let message = "";
  let errorMessage = "";
  let altText = "";

  function activate(): void {
    activeUploaderStepId = stepId;
  }

  async function uploadImage(file: File): Promise<void> {
    if (uploading) return;
    if (!file.type.toLowerCase().startsWith("image/")) {
      errorMessage = "Cole ou selecione uma imagem PNG, JPG, WEBP ou GIF.";
      return;
    }

    uploading = true;
    message = "";
    errorMessage = "";

    try {
      const body = new FormData();
      body.set("stepId", stepId);
      body.set("altText", altText.trim());
      body.set("file", file, file.name || `imagem-colada-${Date.now()}.png`);

      const response = await fetch(`/api/app/help/content/${contentId}/images`, {
        method: "POST",
        body,
      });
      const result = await response.json() as { success?: boolean; message?: string };

      if (!response.ok || !result.success) {
        errorMessage = result.message ?? "Não foi possível enviar a imagem.";
        return;
      }

      message = result.message ?? "Imagem adicionada ao passo.";
      altText = "";
      if (fileInput) fileInput.value = "";
      await invalidateAll();
    } catch {
      errorMessage = "Não foi possível enviar a imagem.";
    } finally {
      uploading = false;
    }
  }

  function handleFileInput(event: Event): void {
    activate();
    const input = event.currentTarget as HTMLInputElement;
    const file = input.files?.[0];
    if (file) void uploadImage(file);
  }

  function handleDrop(event: DragEvent): void {
    event.preventDefault();
    activate();
    dragActive = false;
    const file = Array.from(event.dataTransfer?.files ?? []).find((item) => item.type.startsWith("image/"));
    if (file) void uploadImage(file);
  }

  function handlePaste(event: ClipboardEvent): void {
    if (activeUploaderStepId !== stepId || uploading) return;
    const file = Array.from(event.clipboardData?.files ?? []).find((item) => item.type.startsWith("image/"));
    if (!file) return;

    event.preventDefault();
    void uploadImage(file);
  }

  onMount(() => {
    window.addEventListener("paste", handlePaste);

    return () => {
      window.removeEventListener("paste", handlePaste);
    };
  });
</script>

<div
  class={`rounded-xl border border-dashed p-3 transition ${dragActive ? "border-[#000A57] bg-[#EEF0FF]" : "border-[#CDD2DD] bg-[#FAFAFC]"}`}
  on:pointerenter={activate}
  on:pointerdown={activate}
  on:focusin={activate}
  on:dragenter|preventDefault={() => { activate(); dragActive = true; }}
  on:dragover|preventDefault={() => { activate(); dragActive = true; }}
  on:dragleave={() => (dragActive = false)}
  on:drop={handleDrop}
>
  <div class="flex items-start gap-3">
    <span class="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white text-[#000A57] shadow-sm">
      <ImageIcon size={17} aria-hidden="true" />
    </span>
    <div class="min-w-0 flex-1">
      <strong class="block text-[11px] font-semibold text-[#303645]">Imagem do computador</strong>
      <span class="mt-1 block text-[10px] leading-5 text-[#858B99]">Clique para selecionar, arraste uma imagem aqui ou deixe este bloco ativo e use <strong>Ctrl+V</strong>.</span>
    </div>
  </div>

  <label class="mt-3 block">
    <span class="mb-1 block text-[9px] font-semibold text-[#707687]">Texto alternativo opcional</span>
    <input bind:value={altText} maxlength="500" placeholder="Ex.: Tela de cadastro com o botão Salvar destacado" class="h-9 w-full rounded-lg border border-[#DDE1EA] bg-white px-3 text-[10px] outline-none focus:border-[#000A57]" />
  </label>

  <input
    bind:this={fileInput}
    type="file"
    accept="image/png,image/jpeg,image/webp,image/gif"
    class="sr-only"
    on:change={handleFileInput}
  />

  <button
    type="button"
    disabled={uploading}
    on:click={() => { activate(); fileInput?.click(); }}
    class="mt-3 inline-flex min-h-9 w-full items-center justify-center gap-2 rounded-lg bg-[#000A57] px-3 text-[10px] font-semibold text-white disabled:cursor-wait disabled:opacity-60"
  >
    {#if uploading}
      <UploadCloud size={14} class="animate-pulse" aria-hidden="true" /> Enviando para a biblioteca...
    {:else}
      <ClipboardPaste size={14} aria-hidden="true" /> Selecionar ou colar imagem
    {/if}
  </button>

  {#if message}<p class="mt-2 text-[9px] font-medium text-[#257342]">{message}</p>{/if}
  {#if errorMessage}<p class="mt-2 text-[9px] font-medium text-[#A52A2A]">{errorMessage}</p>{/if}
</div>
