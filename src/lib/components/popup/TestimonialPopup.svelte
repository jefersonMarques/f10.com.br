<script lang="ts" context="module">
  export type PopupSize = "sm" | "md" | "lg" | "xl" | "full";
</script>

<script lang="ts">
  import { onDestroy, onMount } from "svelte";
  import { showTestimonialPopup } from "$lib/stores/testimonialPopup";

  export let size: PopupSize = "lg";

  let isOpen = false;
  const unsubscribe = showTestimonialPopup.subscribe((v) => (isOpen = v));
  onDestroy(unsubscribe);

  function closeModal() {
    showTestimonialPopup.set(false);
  }

  let portal: HTMLElement | null = null;
  let modalEl: HTMLElement | null = null;
  let mounted = false;

  onMount(() => {
    portal = document.getElementById("modal-root");
    mounted = true;
  });

  $: sizeClass =
    size === "sm"
      ? "max-w-md"
      : size === "md"
        ? "max-w-xl"
        : size === "lg"
          ? "max-w-3xl"
          : size === "xl"
            ? "max-w-5xl"
            : "max-w-[96rem]";

  $: {
    if (mounted && portal && modalEl && isOpen) {
      if (!portal.contains(modalEl)) portal.appendChild(modalEl);
      document.body.style.overflow = "hidden";
    } else if (mounted) {
      document.body.style.overflow = "";
    }
  }
</script>

{#if mounted && portal && isOpen}
  <div bind:this={modalEl} class="fixed inset-0 z-[9999] flex items-center justify-center">
    <div class="absolute inset-0 bg-black/50 backdrop-blur-sm z-0" on:click={closeModal}></div>

    <div
      class={`relative z-10 bg-white rounded-2xl  ${sizeClass} overflow-hidden shadow-2xl animate-fadeIn transition-all duration-300`}
    >
      <button
        on:click={closeModal}
        class="absolute top-4 right-6 text-gray-400 hover:text-gray-600 text-2xl"
        aria-label="Fechar modal"
      >
        ×
      </button>

      <slot />
    </div>
  </div>
{/if}

<style>
  @keyframes fadeIn {
    from { opacity: 0; transform: scale(0.96); }
    to { opacity: 1; transform: scale(1); }
  }
  .animate-fadeIn { animation: fadeIn 0.25s ease-out; }
</style>
