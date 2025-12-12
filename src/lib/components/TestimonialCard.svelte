<script lang="ts">
  import { fade, fly } from "svelte/transition";
  import { cubicOut } from "svelte/easing";

  export let title = "";
  export let quote = "";
  export let author = "";
  export let role = "";
  export let avatar: string | undefined = undefined;

  export let index = 1;
  export let total = 1;

  export let onPrev: (() => void) | undefined;
  export let onNext: (() => void) | undefined;

  export let onOpenDetails: (() => void) | undefined;
  export let hasVideo: boolean = false;
</script>

<div class="absolute inset-0 flex flex-col justify-between px-2">
  <!-- TÍTULO -->
  <div
    class="flex items-center text-left gap-4 text-[#010d286b] text-[16px]"
    in:fade={{ duration: 250, easing: cubicOut }}
    out:fade={{ duration: 200, easing: cubicOut }}
  >
    <span class="inline-block h-px w-16 bg-[#010d286b]/40"></span>
    <span>{title}</span>
  </div>

  <!-- QUOTE -->
  <div
    class="will-change-[opacity,transform] mt-10"
    in:fade={{ duration: 250, easing: cubicOut }}
    out:fade={{ duration: 200, easing: cubicOut }}
  >
    <div
      class="will-change-[opacity,transform]"
      in:fly={{ y: 10, duration: 280, easing: cubicOut }}
      out:fly={{ y: -10, duration: 220, easing: cubicOut }}
    >
      <blockquote
        class="min-h-[200px] relative text-[#010D28] font-semibold leading-[1.15]
         text-[28px] sm:text-[36px] md:text-[44px] lg:text-[56px] xl:text-[36px]"
      >
        <span aria-hidden="true" class="select-none">“</span>
        <span>{quote}</span>
        <span aria-hidden="true" class="select-none">”</span>

        {#if onOpenDetails}
          {#if hasVideo}
            <!-- Play inline no fim do texto -->
            <button
              type="button"
              on:click={() => onOpenDetails && onOpenDetails()}
              class="group relative ml-3 inline-flex h-11 w-11 items-center justify-center rounded-full
               bg-[#0B1020] text-white shadow-sm
               hover:brightness-110 transition
               align-middle
               focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0B1020]/40"
              style="vertical-align: baseline;"
              aria-label="Assistir depoimento em vídeo"
            >
              <span class="pulse-ring" aria-hidden="true"></span>
              <svg
                viewBox="0 0 100 100"
                class="h-[22px] w-[22px] text-white translate-x-[1px]"
                aria-hidden="true"
                fill="currentColor"
              >
                <path
                  d="M76.982,50c0-0.847-0.474-1.575-1.167-1.957L26.541,19.595c-0.363-0.253-0.803-0.404-1.279-0.404
            c-1.239,0-2.244,1.004-2.244,2.243c0,0.087,0.016,0.169,0.026,0.253h-0.026v57.131h0.026c0.127,1.119,1.066,1.99,2.218,1.99
            c0.409,0,0.787-0.117,1.117-0.308l0.02,0.035L75.875,51.97l-0.02-0.035C76.526,51.547,76.982,50.83,76.982,50z"
                />
              </svg>
            </button>
          {:else}
            <!-- “Ler completo” inline no fim do texto -->
            <button
              type="button"
              on:click={() => onOpenDetails && onOpenDetails()}
              class="ml-3 inline-flex items-center gap-2 rounded-full border border-[#0B1020]/15
               px-3 py-1.5 text-[13px] font-semibold text-[#0B1020]/70
               hover:text-[#0B1020] hover:bg-[#0B1020]/[0.03]
               transition align-middle
               focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0B1020]/20"
              style="vertical-align: baseline;"
              aria-label="Ler depoimento completo"
            >
              Ler completo <span aria-hidden="true" class="text-[#0B1020]/40"
                >→</span
              >
            </button>
          {/if}
        {/if}
      </blockquote>
    </div>
  </div>

  <!-- LINHA INFERIOR -->
  <div
    class="mt-10 will-change-[opacity,transform] flex items-center justify-between flex-wrap gap-6"
    in:fade={{ duration: 240, delay: 120, easing: cubicOut }}
    out:fade={{ duration: 180, easing: cubicOut }}
  >
    <!-- Autor -->
    <div
      class="flex items-center gap-5 will-change-[opacity,transform]"
      in:fly={{ y: 8, duration: 300, delay: 120, easing: cubicOut }}
      out:fly={{ y: -8, duration: 220, easing: cubicOut }}
    >
      <div
        class="h-20 w-20 rounded-full bg-slate-300 overflow-hidden shrink-0 ring-1 ring-black/5"
      >
        {#if avatar}
          <img
            src={avatar}
            alt=""
            class="h-full w-full object-cover"
            loading="lazy"
          />
        {/if}
      </div>

      <div class="min-w-0">
        <p class="text-[22px] font-semibold text-[#010D28] truncate">
          {author}
        </p>
        <p class="text-[16px] text-[#8A9099]">{role}</p>
      </div>
    </div>

    <!-- Navegação -->
    <div class="flex items-center gap-12">
      <button
        type="button"
        class="h-[56px] w-[88px] rounded-full border border-[#0B1020]/30
               text-[#0B1020] hover:bg-[#0B1020]/5 transition focus-visible:outline-none
               focus-visible:ring-2 focus-visible:ring-[#0B1020]/30"
        aria-label="Anterior"
        on:click={() => onPrev && onPrev()}
      >
        <svg viewBox="0 0 24 24" class="mx-auto h-6 w-6" aria-hidden="true">
          <path
            d="M15 6l-6 6 6 6"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
          />
        </svg>
      </button>

      <div class="text-[18px] md:text-[20px] font-medium tabular-nums">
        <span class="underline underline-offset-4 decoration-2">
          {String(index).padStart(2, "0")}
        </span>
        <span class="text-[#A7AAB3]">/{String(total).padStart(2, "0")}</span>
      </div>

      <button
        type="button"
        class="h-[56px] w-[88px] rounded-full bg-[#0B1020]
               text-white hover:brightness-110 transition focus-visible:outline-none
               focus-visible:ring-2 focus-visible:ring-[#0B1020]/40"
        aria-label="Próximo"
        on:click={() => onNext && onNext()}
      >
        <svg viewBox="0 0 24 24" class="mx-auto h-6 w-6" aria-hidden="true">
          <path
            d="M9 6l6 6-6 6"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
          />
        </svg>
      </button>
    </div>
  </div>
</div>

<style>
  .pulse-ring {
    position: absolute;
    inset: -8px;
    border-radius: 9999px;
    border: 1px solid rgba(11, 16, 32, 0.35);
    opacity: 0;
    transform: scale(0.92);
    animation: pulseRing 1.6s ease-out infinite;
  }

  button:hover .pulse-ring {
    animation-play-state: paused;
    opacity: 0.18;
    transform: scale(1.03);
  }

  @keyframes pulseRing {
    0% {
      opacity: 0;
      transform: scale(0.92);
    }
    18% {
      opacity: 0.55;
    }
    100% {
      opacity: 0;
      transform: scale(1.28);
    }
  }
</style>
