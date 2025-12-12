<!-- src/lib/components/forms/CustomerModal.svelte -->
<script lang="ts">
  import { onMount } from "svelte";
  import type { PopupSize } from "$lib/components/popup/Popup.svelte";

  // Título, subtítulo e labels dos botões
  export let title =
    "Já sou cliente F10";
  export let subtitle =
    "Escolha como prefere falar com nossa equipe. Estamos aqui para ajudar sua escola a tirar o máximo do sistema.";
  export let primaryLabel = "Falar com o suporte";
  export let secondaryLabel = "Acessar área do cliente";

  // Callbacks dos botões
  export let onPrimary: () => void = () => {};
  export let onSecondary: () => void = () => {};

  // Callback para mudar o tamanho do Popup
  export let onChangeSize: (size: PopupSize) => void = () => {};

  onMount(() => {
    // Tamanho padrão do popup para esse modal
    onChangeSize("md");
  });
</script>

<div class="px-6 py-8 sm:px-10 sm:py-10">
  <!-- Título -->
  <h2 class="text-xl sm:text-2xl font-semibold text-slate-900">
    {title}
  </h2>

  <!-- Subtítulo -->
  <p class="mt-2 text-sm sm:text-base text-slate-500 leading-relaxed">
    {subtitle}
  </p>

  <!-- Botões empilhados -->
  <div class="mt-8 space-y-3">
    <button
      type="button"
      class="w-full rounded-lg py-3.5 text-sm font-medium bg-[#010D28] text-white hover:bg-[#02081c] transition-colors"
      on:click={onPrimary}
    >
      {primaryLabel}
    </button>

    <button
      type="button"
      class="w-full rounded-lg py-3 text-sm font-medium border border-slate-200 text-slate-700 hover:bg-slate-50 transition-colors"
      on:click={onSecondary}
    >
      {secondaryLabel}
    </button>
  </div>
</div>
