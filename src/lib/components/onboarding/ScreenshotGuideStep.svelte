<script lang="ts">
  import { ArrowLeft, ArrowRight, CheckCircle2, MousePointerClick } from "lucide-svelte";
  import type { SetupGuideSlide } from "$lib/onboarding/setupGuide";

  export let eyebrow: string;
  export let title: string;
  export let description: string;
  export let slides: SetupGuideSlide[];
  export let completionLabel = "Concluí esta etapa";
  export let onComplete: () => void = () => undefined;

  let activeSlideIndex = 0;

  $: activeSlide = slides[activeSlideIndex];
  $: isFirstSlide = activeSlideIndex === 0;
  $: isLastSlide = activeSlideIndex === slides.length - 1;

  function showPreviousSlide(): void {
    activeSlideIndex = Math.max(activeSlideIndex - 1, 0);
  }

  function showNextSlide(): void {
    if (isLastSlide) {
      onComplete();
      return;
    }

    activeSlideIndex = Math.min(activeSlideIndex + 1, slides.length - 1);
  }
</script>

<section class="mx-auto w-full max-w-6xl" aria-labelledby={`guide-title-${activeSlide.id}`}>
  <div class="grid items-center gap-5 lg:grid-cols-[0.72fr_1.28fr] lg:gap-8">
    <div class="text-center lg:text-left">
      <p class="text-[11px] font-bold uppercase tracking-[0.18em] text-[#EA6D0B]">
        {eyebrow}
      </p>
      <h1 class="mt-2 text-[27px] font-semibold leading-tight tracking-[-0.035em] text-[#010D28] sm:text-[34px] lg:text-[38px]">
        {title}
      </h1>
      <p class="mt-3 text-[13px] leading-[1.65] text-[#5F6475] sm:text-[15px]">
        {description}
      </p>

      <div class="mt-5 rounded-[20px] border border-[#DFE3ED] bg-white p-4 text-left shadow-[0_12px_30px_rgba(1,13,40,0.06)] sm:p-5" aria-live="polite">
        <div class="flex items-center justify-between gap-3">
          <span class="inline-flex h-9 w-9 items-center justify-center rounded-full bg-[#FFF0E4] text-[#EA6D0B]">
            {#if isLastSlide}
              <CheckCircle2 size={19} aria-hidden="true" />
            {:else}
              <MousePointerClick size={19} aria-hidden="true" />
            {/if}
          </span>
          <span class="text-[11px] font-bold uppercase tracking-[0.1em] text-[#000A57]/45">
            Orientação {activeSlideIndex + 1} de {slides.length}
          </span>
        </div>

        <h2 id={`guide-title-${activeSlide.id}`} class="mt-4 text-[17px] font-semibold leading-snug text-[#010D28] sm:text-[19px]">
          {activeSlide.title}
        </h2>
        <p class="mt-2 text-[13px] leading-[1.65] text-[#5F6475]">
          {activeSlide.description}
        </p>
      </div>

      <div class={`mt-4 grid gap-2 ${slides.length > 1 ? "grid-cols-2" : "grid-cols-1"}`}>
        {#if slides.length > 1}
          <button
            type="button"
            class="inline-flex min-h-11 items-center justify-center gap-2 rounded-full border-2 border-[#000A57] bg-white px-4 py-2.5 text-[12px] font-semibold text-[#000A57] transition hover:bg-[#F4F5FA] focus:outline-none focus:ring-2 focus:ring-[#000A57]/25 disabled:cursor-not-allowed disabled:border-[#D6D9E2] disabled:text-[#A1A5B1]"
            on:click={showPreviousSlide}
            disabled={isFirstSlide}
          >
            <ArrowLeft size={16} aria-hidden="true" />
            Imagem anterior
          </button>
        {/if}
        <button
          type="button"
          class={`inline-flex min-h-11 items-center justify-center gap-2 rounded-full px-4 py-2.5 text-[12px] font-semibold text-white shadow-sm transition focus:outline-none focus:ring-2 ${isLastSlide ? "bg-[#EA6D0B] hover:brightness-105 focus:ring-[#EA6D0B]/40" : "bg-[#000A57] hover:bg-[#111B71] focus:ring-[#000A57]/35"}`}
          on:click={showNextSlide}
        >
          {isLastSlide ? completionLabel : "Próxima imagem"}
          <ArrowRight size={16} aria-hidden="true" />
        </button>
      </div>
    </div>

    <figure class="overflow-hidden rounded-[22px] border border-[#D8DCE6] bg-[#E9E9E9] shadow-[0_22px_60px_rgba(1,13,40,0.14)]">
      {#key activeSlide.id}
        <img
          src={activeSlide.imageUrl}
          alt={activeSlide.imageAlt}
          class="guide-image mx-auto max-h-[52dvh] w-full object-contain"
          loading="eager"
        />
      {/key}
    </figure>
  </div>
</section>

<style>
  .guide-image {
    animation: guide-image-enter 180ms ease-out;
  }

  @keyframes guide-image-enter {
    from {
      opacity: 0;
      transform: translateX(8px);
    }
    to {
      opacity: 1;
      transform: translateX(0);
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .guide-image {
      animation: none;
    }
  }
</style>
