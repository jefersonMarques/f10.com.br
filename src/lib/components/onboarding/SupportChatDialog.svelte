<script lang="ts">
  import { browser } from "$app/environment";
  import { ExternalLink, LifeBuoy, X } from "lucide-svelte";
  import { supportChatUrl } from "$lib/support/supportConfig";

  export let isOpen = false;
  export let onClose: () => void = () => undefined;

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

    if (!shouldOpen && dialogElement.open) dialogElement.close();
  }

  function handleDialogClose(): void {
    if (isOpen) onClose();
    previouslyFocusedElement?.focus();
    previouslyFocusedElement = null;
  }

  function handleDialogCancel(event: Event): void {
    event.preventDefault();
    onClose();
  }

  function handleBackdropClick(event: MouseEvent): void {
    if (event.target === event.currentTarget) onClose();
  }
</script>

<dialog
  bind:this={dialogElement}
  class="support-dialog m-auto w-[calc(100%-1.5rem)] max-w-[920px] overflow-visible bg-transparent p-0"
  aria-labelledby="support-chat-title"
  on:close={handleDialogClose}
  on:cancel={handleDialogCancel}
  on:click={handleBackdropClick}
>
  {#if isOpen}
    <section class="flex max-h-[calc(100dvh-1.5rem)] min-h-[620px] flex-col overflow-hidden rounded-[26px] bg-white shadow-[0_30px_100px_rgba(0,0,0,0.38)]">
      <header class="flex shrink-0 items-start justify-between gap-4 border-b border-[#E6E8EF] bg-white px-5 py-4 sm:px-7">
        <div class="flex items-start gap-3">
          <span class="inline-flex h-11 min-w-11 items-center justify-center rounded-2xl bg-[#FFF0E4] text-[#EA6D0B]">
            <LifeBuoy size={22} aria-hidden="true" />
          </span>
          <div>
            <p class="text-[11px] font-bold uppercase tracking-[0.16em] text-[#EA6D0B]">
              Atendimento F10
            </p>
            <h2 id="support-chat-title" class="mt-1 text-[20px] font-semibold leading-tight text-[#010D28] sm:text-[24px]">
              Converse com o suporte
            </h2>
          </div>
        </div>
        <button
          bind:this={closeButtonElement}
          type="button"
          class="inline-flex h-10 min-w-10 items-center justify-center rounded-full bg-[#F1F3F7] text-[#000A57] transition hover:bg-[#E6E8EF] focus:outline-none focus:ring-2 focus:ring-[#000A57]/25"
          on:click={onClose}
          aria-label="Fechar atendimento"
        >
          <X size={20} aria-hidden="true" />
        </button>
      </header>

      <iframe
        src={supportChatUrl}
        title="Chat do suporte F10"
        class="min-h-0 flex-1 border-0 bg-[#F7F8FB]"
        loading="eager"
      ></iframe>

      <footer class="flex shrink-0 flex-col items-center justify-between gap-3 border-t border-[#E6E8EF] bg-[#F8F9FC] px-5 py-3 text-center sm:flex-row sm:px-7 sm:text-left">
        <p class="text-[11px] leading-[1.5] text-[#666C7D]">
          Se o chat não carregar, abra o atendimento em uma nova janela.
        </p>
        <a
          href={supportChatUrl}
          target="_blank"
          rel="noopener noreferrer"
          class="inline-flex min-h-10 items-center justify-center gap-2 rounded-full bg-[#000A57] px-4 py-2 text-[12px] font-semibold text-white transition hover:bg-[#111B71] focus:outline-none focus:ring-2 focus:ring-[#000A57]/35"
        >
          Abrir atendimento
          <ExternalLink size={15} aria-hidden="true" />
        </a>
      </footer>
    </section>
  {/if}
</dialog>

<style>
  .support-dialog::backdrop {
    background: rgba(1, 7, 25, 0.78);
    backdrop-filter: blur(7px);
  }

  .support-dialog[open] {
    animation: support-dialog-enter 180ms ease-out;
  }

  @keyframes support-dialog-enter {
    from {
      opacity: 0;
      transform: translateY(12px) scale(0.985);
    }
    to {
      opacity: 1;
      transform: translateY(0) scale(1);
    }
  }

  @media (max-height: 700px) {
    section {
      min-height: calc(100dvh - 1.5rem);
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .support-dialog[open] {
      animation: none;
    }
  }
</style>
