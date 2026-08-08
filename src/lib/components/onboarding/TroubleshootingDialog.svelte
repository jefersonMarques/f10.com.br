<script lang="ts">
  import { browser } from "$app/environment";
  import { CheckCircle2, LifeBuoy, X } from "lucide-svelte";
  import type { TroubleshootingGuide } from "$lib/onboarding/setupGuide";

  export let guide: TroubleshootingGuide | null = null;
  export let guideId: string | null = null;
  export let isOpen = false;
  export let onClose: () => void = () => undefined;
  export let onResolved: () => void = () => undefined;
  export let onRequestSupport: () => void = () => undefined;

  let dialogElement: HTMLDialogElement;
  let closeButtonElement: HTMLButtonElement;
  let previouslyFocusedElement: HTMLElement | null = null;
  let checkedItemIndexes: number[] = [];
  let previousGuideId: string | null = null;

  $: allChecklistItemsChecked = Boolean(
    guide?.checklistItems.length &&
      checkedItemIndexes.length === guide.checklistItems.length,
  );

  $: if (guideId !== previousGuideId) {
    previousGuideId = guideId;
    checkedItemIndexes = [];
  }

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

  function toggleChecklistItem(itemIndex: number): void {
    checkedItemIndexes = checkedItemIndexes.includes(itemIndex)
      ? checkedItemIndexes.filter((index) => index !== itemIndex)
      : [...checkedItemIndexes, itemIndex];
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
  class="help-dialog m-auto w-[min(680px,calc(100%-1.5rem))] max-w-none overflow-visible bg-transparent p-0"
  aria-labelledby="troubleshooting-title"
  on:close={handleDialogClose}
  on:cancel={handleDialogCancel}
  on:click={handleBackdropClick}
>
  {#if guide && isOpen}
    <section class="max-h-[calc(100dvh-1.5rem)] overflow-y-auto rounded-[26px] bg-white shadow-[0_30px_100px_rgba(0,0,0,0.35)]">
      <header class="sticky top-0 z-10 flex items-start justify-between gap-4 border-b border-[#E6E8EF] bg-white/95 px-5 py-4 backdrop-blur sm:px-7">
        <div>
          <p class="text-[11px] font-bold uppercase tracking-[0.16em] text-[#EA6D0B]">
            Ajuda passo a passo
          </p>
          <h2 id="troubleshooting-title" class="mt-1 text-[21px] font-semibold leading-tight text-[#010D28] sm:text-[25px]">
            {guide.title}
          </h2>
        </div>
        <button
          bind:this={closeButtonElement}
          type="button"
          class="inline-flex h-10 min-w-10 items-center justify-center rounded-full bg-[#F1F3F7] text-[#000A57] transition hover:bg-[#E6E8EF] focus:outline-none focus:ring-2 focus:ring-[#000A57]/25"
          on:click={onClose}
          aria-label="Fechar ajuda"
        >
          <X size={20} aria-hidden="true" />
        </button>
      </header>

      <div class="px-5 py-5 sm:px-7">
        <p class="text-[13px] leading-[1.65] text-[#5F6475] sm:text-[14px]">
          {guide.description}
        </p>
        <p class="mt-2 text-[12px] font-semibold text-[#000A57]">
          Marque cada tentativa que você já realizou:
        </p>

        <div class="mt-4 space-y-2.5">
          {#each guide.checklistItems as checklistItem, itemIndex}
            <label class={`flex cursor-pointer items-start gap-3 rounded-2xl border p-3.5 transition ${checkedItemIndexes.includes(itemIndex) ? "border-emerald-300 bg-emerald-50" : "border-[#E0E3EC] bg-[#F9FAFC] hover:border-[#C8CCD8]"}`}>
              <input
                type="checkbox"
                class="mt-0.5 h-5 w-5 min-w-5 accent-emerald-600"
                checked={checkedItemIndexes.includes(itemIndex)}
                on:change={() => toggleChecklistItem(itemIndex)}
              />
              <span class="text-[13px] font-medium leading-[1.55] text-[#313748] sm:text-[14px]">
                {checklistItem}
              </span>
            </label>
          {/each}
        </div>

        <div class="mt-6 grid gap-3 sm:grid-cols-2">
          <button
            type="button"
            class="inline-flex min-h-[52px] items-center justify-center gap-2 rounded-full bg-emerald-600 px-5 py-3 text-[14px] font-semibold text-white shadow-[0_10px_25px_rgba(5,150,105,0.22)] transition hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-400"
            on:click={onResolved}
          >
            <CheckCircle2 size={19} aria-hidden="true" />
            Consegui resolver
          </button>
          <button
            type="button"
            class="inline-flex min-h-[52px] items-center justify-center gap-2 rounded-full bg-[#000A57] px-5 py-3 text-[14px] font-semibold text-white shadow-[0_10px_25px_rgba(0,10,87,0.2)] transition hover:bg-[#111B71] focus:outline-none focus:ring-2 focus:ring-[#000A57]/35 disabled:cursor-not-allowed disabled:bg-[#C5C8D2] disabled:text-white disabled:shadow-none"
            on:click={onRequestSupport}
            disabled={!allChecklistItemsChecked}
            aria-describedby="support-unlock-description"
          >
            <LifeBuoy size={19} aria-hidden="true" />
            Ainda não consigo
          </button>
        </div>

        <p
          id="support-unlock-description"
          class={`mt-3 text-center text-[11px] font-medium ${allChecklistItemsChecked ? "text-emerald-700" : "text-[#74798A]"}`}
          aria-live="polite"
        >
          {allChecklistItemsChecked
            ? "Atendimento liberado. Clique em Ainda não consigo para falar com o suporte."
            : "O atendimento será liberado depois que todas as tentativas forem marcadas."}
        </p>
      </div>
    </section>
  {/if}
</dialog>

<style>
  .help-dialog::backdrop {
    background: rgba(1, 7, 25, 0.72);
    backdrop-filter: blur(6px);
  }

  .help-dialog[open] {
    animation: help-dialog-enter 180ms ease-out;
  }

  @keyframes help-dialog-enter {
    from {
      opacity: 0;
      transform: translateY(10px) scale(0.985);
    }
    to {
      opacity: 1;
      transform: translateY(0) scale(1);
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .help-dialog[open] {
      animation: none;
    }
  }
</style>
