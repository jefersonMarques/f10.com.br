<script lang="ts">
  import { Check, CircleHelp } from "lucide-svelte";

  export let titleId: string;
  export let eyebrow = "Responda para continuar";
  export let title: string;
  export let description = "";
  export let primaryLabel: string;
  export let secondaryLabel: string | null = null;
  export let onPrimary: () => void = () => undefined;
  export let onSecondary: () => void = () => undefined;
</script>

<section class="mx-auto w-full max-w-3xl text-center" aria-labelledby={titleId}>
  <slot />

  <p class="mt-5 text-[11px] font-bold uppercase tracking-[0.17em] text-[#EA6D0B]">
    {eyebrow}
  </p>
  <h1
    id={titleId}
    class="mx-auto mt-2 max-w-2xl text-[29px] font-semibold leading-tight tracking-[-0.04em] text-[#010D28] sm:text-[40px]"
  >
    {title}
  </h1>

  {#if description}
    <p class="mx-auto mt-3 max-w-xl text-[14px] leading-[1.65] text-[#5F6475] sm:text-[16px]">
      {description}
    </p>
  {/if}

  <slot name="detail" />

  <div class={`mx-auto mt-7 grid max-w-xl gap-3 ${secondaryLabel ? "sm:grid-cols-2" : "grid-cols-1"}`}>
    <button
      type="button"
      class="choice-action inline-flex min-h-16 items-center justify-center gap-2 rounded-full bg-emerald-600 px-6 py-4 text-[16px] font-semibold text-white shadow-[0_14px_32px_rgba(5,150,105,0.24)] transition hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:ring-offset-2"
      on:click={onPrimary}
    >
      <Check size={21} strokeWidth={2.5} aria-hidden="true" />
      {primaryLabel}
    </button>

    {#if secondaryLabel}
      <button
        type="button"
        class="inline-flex min-h-16 items-center justify-center gap-2 rounded-full border-2 border-[#EA6D0B] bg-white px-6 py-4 text-[16px] font-semibold text-[#C95717] transition hover:bg-[#FFF5EC] focus:outline-none focus:ring-2 focus:ring-[#EA6D0B]/35 focus:ring-offset-2"
        on:click={onSecondary}
      >
        <CircleHelp size={21} aria-hidden="true" />
        {secondaryLabel}
      </button>
    {/if}
  </div>
</section>

<style>
  .choice-action {
    animation: choice-float 2.8s ease-in-out infinite;
  }

  @keyframes choice-float {
    0%, 100% {
      transform: translateY(0);
    }
    50% {
      transform: translateY(-4px);
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .choice-action {
      animation: none;
    }
  }
</style>
