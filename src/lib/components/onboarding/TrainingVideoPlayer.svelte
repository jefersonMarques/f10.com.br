<script lang="ts">
  import { Check, ExternalLink } from "lucide-svelte";
  import {
    getYoutubeEmbedUrl,
    getYoutubeUrl,
    type TrainingVideo,
  } from "$lib/onboarding/trainingCatalog";

  export let training: TrainingVideo;
  export let isCompleted = false;
  export let onComplete: () => void = () => undefined;
  export let completedActionLabel = "Treinamento concluído";
  export let allowCompletedAction = false;
</script>

<article
  class="overflow-hidden rounded-[24px] border border-[#DFE3F2] bg-white shadow-[0_20px_60px_rgba(1,13,40,0.1)]"
  aria-labelledby={`training-title-${training.id}`}
>
  <div class="aspect-video bg-[#010D28]">
    <iframe
      class="h-full w-full"
      src={getYoutubeEmbedUrl(training.videoId)}
      title={training.title}
      loading="lazy"
      referrerpolicy="strict-origin-when-cross-origin"
      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
      allowfullscreen
    ></iframe>
  </div>

  <div class="p-5 sm:p-7">
    <div class="flex flex-wrap items-center gap-2">
      {#if training.isEssential}
        <span class="rounded-full bg-[#EA6D0B]/10 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.12em] text-[#C95717]">
          Essencial
        </span>
      {/if}

      {#if training.isNew}
        <span class="rounded-full bg-emerald-50 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.12em] text-emerald-700">
          Novo
        </span>
      {/if}
    </div>

    <h3
      id={`training-title-${training.id}`}
      class="mt-3 text-[22px] font-semibold leading-tight tracking-[-0.02em] text-[#010D28]"
    >
      {training.title}
    </h3>
    <p class="mt-3 text-[15px] leading-[1.7] text-[#5F6475]">
      {training.description}
    </p>

    <div class="mt-6 flex flex-col gap-3 sm:flex-row">
      <button
        type="button"
        class={`inline-flex min-h-12 items-center justify-center gap-2 rounded-full px-5 py-3 text-[14px] font-semibold transition focus:outline-none focus:ring-2 focus:ring-offset-2 ${isCompleted ? "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200 focus:ring-emerald-300" : "bg-[#EA6D0B] text-white shadow-[0_12px_28px_rgba(234,109,11,0.25)] hover:brightness-105 focus:ring-[#EA6D0B]/40"}`}
        on:click={onComplete}
        disabled={isCompleted && !allowCompletedAction}
      >
        <Check size={18} aria-hidden="true" />
        {isCompleted ? completedActionLabel : "Concluí este treinamento"}
      </button>

      <a
        href={getYoutubeUrl(training.videoId)}
        target="_blank"
        rel="noopener noreferrer"
        class="inline-flex min-h-12 items-center justify-center gap-2 rounded-full border border-slate-200 bg-white px-5 py-3 text-[14px] font-semibold text-[#000A57] transition hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-slate-300"
      >
        Abrir no YouTube
        <ExternalLink size={17} aria-hidden="true" />
      </a>
    </div>
  </div>
</article>
