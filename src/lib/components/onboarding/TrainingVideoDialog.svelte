<script lang="ts">
  import { browser } from "$app/environment";
  import { Check, PlayCircle, X } from "lucide-svelte";
  import {
    getYoutubeEmbedUrl,
    type TrainingVideo,
  } from "$lib/onboarding/trainingCatalog";

  export let training: TrainingVideo | null = null;
  export let isOpen = false;
  export let isCompleted = false;
  export let showCompletionAction = true;
  export let completeActionLabel = "Concluí este treinamento";
  export let onClose: () => void = () => undefined;
  export let onComplete: () => void = () => undefined;

  let dialogElement: HTMLDialogElement;
  let closeButtonElement: HTMLButtonElement;
  let previouslyFocusedElement: HTMLElement | null = null;

  $: if (browser && dialogElement) {
    syncDialogState(isOpen);
  }

  function syncDialogState(shouldOpen: boolean): void {
    if (shouldOpen && !dialogElement.open) {
      previouslyFocusedElement = document.activeElement as HTMLElement | null;
      dialogElement.showModal();
      window.requestAnimationFrame(() => closeButtonElement?.focus());
      return;
    }

    if (!shouldOpen && dialogElement.open) {
      dialogElement.close();
    }
  }

  function closeDialog(): void {
    onClose();
  }

  function handleDialogClose(): void {
    if (isOpen) onClose();
    previouslyFocusedElement?.focus();
    previouslyFocusedElement = null;
  }

  function handleDialogCancel(event: Event): void {
    event.preventDefault();
    closeDialog();
  }

  function handleBackdropClick(event: MouseEvent): void {
    if (event.target === event.currentTarget) closeDialog();
  }
</script>

<dialog
  bind:this={dialogElement}
  class="video-dialog m-auto max-w-none overflow-visible bg-transparent p-0"
  aria-labelledby="training-dialog-title"
  on:close={handleDialogClose}
  on:cancel={handleDialogCancel}
  on:click={handleBackdropClick}
>
  {#if training && isOpen}
    <article
      class="mx-auto flex max-h-[calc(100dvh-1.5rem)] w-full flex-col overflow-hidden rounded-[24px] bg-[#07112D] text-white shadow-[0_30px_100px_rgba(0,0,0,0.55)]"
    >
      <header class="flex shrink-0 items-center justify-between gap-4 px-4 py-3 sm:px-6 sm:py-4">
        <div class="min-w-0">
          <p class="text-[11px] font-bold uppercase tracking-[0.16em] text-[#FF9A49]">
            Treinamento F10
          </p>
          <h2 id="training-dialog-title" class="mt-1 truncate text-[15px] font-semibold sm:text-[18px]">
            {training.title}
          </h2>
        </div>

        <button
          bind:this={closeButtonElement}
          type="button"
          class="inline-flex h-11 min-w-11 items-center justify-center rounded-full bg-white/10 text-white transition hover:bg-white/20 focus:outline-none focus:ring-2 focus:ring-white/70"
          on:click={closeDialog}
          aria-label="Fechar vídeo"
        >
          <X size={22} aria-hidden="true" />
        </button>
      </header>

      <div class="min-h-0 flex-1 bg-black">
        <div class="aspect-video max-h-full w-full">
          <iframe
            class="h-full w-full"
            src={getYoutubeEmbedUrl(training.videoId, true)}
            title={training.title}
            referrerpolicy="strict-origin-when-cross-origin"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowfullscreen
          ></iframe>
        </div>
      </div>

      <footer class="flex shrink-0 flex-col gap-3 border-t border-white/10 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <p class="flex items-center gap-2 text-[12px] leading-relaxed text-white/65 sm:text-[13px]">
          <PlayCircle class="min-w-4" size={17} aria-hidden="true" />
          Use os controles do vídeo para pausar, voltar ou ativar a tela cheia.
        </p>

        {#if showCompletionAction}
          <button
            type="button"
            class={`inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-full px-6 py-3 text-[14px] font-semibold transition focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-[#07112D] sm:w-auto ${isCompleted ? "bg-emerald-500 text-[#03160D] focus:ring-emerald-300" : "bg-[#EA6D0B] text-white shadow-[0_12px_30px_rgba(234,109,11,0.3)] hover:brightness-105 focus:ring-[#FF9A49]"}`}
            on:click={isCompleted ? closeDialog : onComplete}
          >
            <Check size={18} aria-hidden="true" />
            {isCompleted ? "Treinamento concluído" : completeActionLabel}
          </button>
        {/if}
      </footer>
    </article>
  {/if}
</dialog>

<style>
  .video-dialog::backdrop {
    background: rgba(1, 7, 25, 0.88);
    backdrop-filter: blur(8px);
  }

  .video-dialog {
    width: min(
      1180px,
      calc(100vw - 1.5rem),
      calc(177.777dvh - 17.777rem)
    );
  }

  .video-dialog[open] {
    animation: dialog-enter 180ms ease-out;
  }

  @keyframes dialog-enter {
    from {
      opacity: 0;
      transform: translateY(12px) scale(0.985);
    }
    to {
      opacity: 1;
      transform: translateY(0) scale(1);
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .video-dialog[open] {
      animation: none;
    }
  }
</style>
