<script lang="ts">
  import { CheckCircle2, Play, ShieldCheck, UserPlus } from "lucide-svelte";
  import {
    getYoutubeThumbnailUrl,
    type TrainingVideo,
  } from "$lib/onboarding/trainingCatalog";

  export let training: TrainingVideo;
  export let variant: "users" | "permissions";
  export let title: string;
  export let description: string;
  export let isCompleted = false;
  export let onWatch: () => void = () => undefined;
</script>

<section class="mx-auto w-full max-w-5xl" aria-labelledby={`essential-training-title-${training.id}`}>
  <div class="grid items-center gap-6 lg:grid-cols-[0.8fr_1.2fr] lg:gap-10">
    <div class="text-center lg:text-left">
      <span class={`inline-flex h-12 w-12 items-center justify-center rounded-2xl ${variant === "users" ? "bg-[#EA6D0B]/10 text-[#EA6D0B]" : "bg-[#000A57]/5 text-[#000A57]"}`}>
        {#if variant === "users"}
          <UserPlus size={24} aria-hidden="true" />
        {:else}
          <ShieldCheck size={24} aria-hidden="true" />
        {/if}
      </span>
      <p class="mt-4 text-[11px] font-bold uppercase tracking-[0.18em] text-[#EA6D0B]">
        Assista e faça no F10
      </p>
      <h1
        id={`essential-training-title-${training.id}`}
        class="mt-2 text-[27px] font-semibold leading-tight tracking-[-0.035em] text-[#010D28] sm:text-[34px] lg:text-[40px]"
      >
        {title}
      </h1>
      <p class="mt-3 text-[14px] leading-[1.7] text-[#5F6475] sm:text-[15px]">
        {description}
      </p>

      {#if isCompleted}
        <p class="mt-4 inline-flex items-center gap-2 rounded-full bg-emerald-50 px-4 py-2 text-[12px] font-semibold text-emerald-700 ring-1 ring-emerald-200">
          <CheckCircle2 size={17} aria-hidden="true" />
          Você já concluiu este treinamento
        </p>
      {/if}
    </div>

    <button
      type="button"
      class="video-action group relative mx-auto block w-full max-w-2xl overflow-hidden rounded-[22px] bg-[#010D28] text-left shadow-[0_22px_60px_rgba(1,13,40,0.22)] focus:outline-none focus:ring-2 focus:ring-[#EA6D0B] focus:ring-offset-4"
      on:click={onWatch}
      aria-label={`Assistir ao vídeo ${training.title}`}
    >
      <img
        src={getYoutubeThumbnailUrl(training.videoId)}
        alt=""
        class="aspect-video w-full object-cover opacity-65 transition duration-300 group-hover:scale-[1.02] group-hover:opacity-75"
        loading="lazy"
      />
      <span class="absolute inset-0 bg-gradient-to-t from-[#010D28] via-transparent to-transparent" aria-hidden="true"></span>
      <span class="absolute inset-0 flex items-center justify-center">
        <span class="inline-flex h-16 w-16 items-center justify-center rounded-full bg-[#EA6D0B] text-white shadow-[0_14px_35px_rgba(234,109,11,0.45)] transition group-hover:scale-105 sm:h-20 sm:w-20">
          <Play class="ml-1" size={30} fill="currentColor" aria-hidden="true" />
        </span>
      </span>
      <span class="absolute inset-x-0 bottom-0 flex items-center justify-between gap-3 p-4 text-white sm:p-5">
        <span class="text-[14px] font-semibold sm:text-[16px]">Assistir ao treinamento</span>
        <span class="rounded-full bg-white/10 px-3 py-1 text-[11px] backdrop-blur">Vídeo</span>
      </span>
    </button>
  </div>
</section>

<style>
  .video-action:not(:focus) span span {
    animation: onboarding-float 2.8s ease-in-out infinite;
  }

  @keyframes onboarding-float {
    0%, 100% {
      transform: translateY(0);
    }
    50% {
      transform: translateY(-5px);
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .video-action:not(:focus) span span {
      animation: none;
    }
  }
</style>
