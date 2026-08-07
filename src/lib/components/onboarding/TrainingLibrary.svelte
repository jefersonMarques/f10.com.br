<script lang="ts">
  import { browser } from "$app/environment";
  import {
    ArrowLeft,
    ArrowRight,
    Check,
    CheckCircle2,
    Circle,
    PlayCircle,
    Sparkles,
  } from "lucide-svelte";
  import TrainingVideoPlayer from "$lib/components/onboarding/TrainingVideoPlayer.svelte";
  import {
    trainingCategories,
    trainingVideos,
    type TrainingCategoryId,
    type TrainingVideo,
  } from "$lib/onboarding/trainingCatalog";

  export let selectedTrainingId: string | null = null;
  export let completedTrainingIds: string[] = [];
  export let isActive = false;
  export let onSelect: (training: TrainingVideo) => void = () => undefined;
  export let onComplete: (training: TrainingVideo) => void = () => undefined;
  export let onBack: () => void = () => undefined;

  let activeCategoryId: TrainingCategoryId | "all" = "all";
  let playerElement: HTMLElement;

  $: selectedTraining =
    trainingVideos.find((training) => training.id === selectedTrainingId) ?? null;
  $: visibleTrainingVideos =
    activeCategoryId === "all"
      ? trainingVideos
      : trainingVideos.filter(
          (training) => training.categoryId === activeCategoryId,
        );

  function selectTraining(training: TrainingVideo): void {
    onSelect(training);

    if (!browser || window.innerWidth >= 1024) return;

    window.requestAnimationFrame(() => {
      playerElement?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }

  function completeSelectedTraining(): void {
    if (!selectedTraining) return;
    onComplete(selectedTraining);
  }
</script>

<section aria-labelledby="training-library-title">
  <div class="text-center">
    <span class="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-[#EA6D0B]/10 text-[#EA6D0B]">
      <Sparkles size={28} aria-hidden="true" />
    </span>
    <p class="mt-5 text-[12px] font-bold uppercase tracking-[0.15em] text-[#EA6D0B]">
      Aprenda no seu ritmo
    </p>
    <h2
      id="training-library-title"
      class="mt-3 text-[30px] font-semibold leading-tight tracking-[-0.03em] text-[#010D28] sm:text-[38px]"
    >
      O que você deseja fazer no F10?
    </h2>
    <p class="mx-auto mt-4 max-w-2xl text-[16px] leading-[1.75] text-[#5F6475]">
      Escolha uma opção. O vídeo correspondente será exibido nesta página.
    </p>
  </div>

  <div class="mt-8 flex gap-2 overflow-x-auto pb-2" aria-label="Filtrar treinamentos">
    <button
      type="button"
      class={`min-h-11 min-w-fit rounded-full px-4 py-2.5 text-[13px] font-semibold transition focus:outline-none focus:ring-2 focus:ring-[#EA6D0B]/35 ${activeCategoryId === "all" ? "bg-[#000A57] text-white" : "border border-[#DFE3F2] bg-white text-[#000A57] hover:bg-[#F7F8FE]"}`}
      on:click={() => (activeCategoryId = "all")}
      aria-pressed={activeCategoryId === "all"}
    >
      Todos os treinamentos
    </button>
    {#each trainingCategories as category}
      <button
        type="button"
        class={`min-h-11 min-w-fit rounded-full px-4 py-2.5 text-[13px] font-semibold transition focus:outline-none focus:ring-2 focus:ring-[#EA6D0B]/35 ${activeCategoryId === category.id ? "bg-[#000A57] text-white" : "border border-[#DFE3F2] bg-white text-[#000A57] hover:bg-[#F7F8FE]"}`}
        on:click={() => (activeCategoryId = category.id)}
        aria-pressed={activeCategoryId === category.id}
      >
        {category.label}
      </button>
    {/each}
  </div>

  <div class="mt-6 grid gap-7 lg:grid-cols-12 lg:items-start">
    <div class="lg:col-span-5">
      <div class="max-h-[720px] space-y-3 overflow-y-auto pr-1">
        {#each visibleTrainingVideos as training}
          <button
            type="button"
            class={`group flex min-h-[88px] w-full items-start gap-3 rounded-[20px] border p-4 text-left transition focus:outline-none focus:ring-2 focus:ring-[#EA6D0B]/35 ${selectedTrainingId === training.id ? "border-[#EA6D0B] bg-[#FFF7F0] shadow-sm" : "border-[#E4E7F1] bg-white hover:border-[#C9CDDC] hover:bg-[#FAFBFD]"}`}
            on:click={() => selectTraining(training)}
            aria-pressed={selectedTrainingId === training.id}
          >
            <span
              class={`mt-0.5 inline-flex h-8 min-w-8 items-center justify-center rounded-full ${completedTrainingIds.includes(training.id) ? "bg-emerald-600 text-white" : selectedTrainingId === training.id ? "bg-[#EA6D0B] text-white" : "bg-[#F0F2F8] text-[#000A57]"}`}
            >
              {#if completedTrainingIds.includes(training.id)}
                <Check size={17} aria-hidden="true" />
              {:else}
                <PlayCircle size={17} aria-hidden="true" />
              {/if}
            </span>

            <span class="min-w-0 flex-1">
              <span class="flex flex-wrap items-center gap-2">
                <span class="text-[12px] font-bold text-[#000A57]/40">
                  {String(trainingVideos.indexOf(training) + 1).padStart(2, "0")}
                </span>
                {#if training.isEssential}
                  <span class="rounded-full bg-[#EA6D0B]/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.08em] text-[#C95717]">
                    Essencial
                  </span>
                {/if}
                {#if training.isNew}
                  <span class="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.08em] text-emerald-700">
                    Novo
                  </span>
                {/if}
              </span>
              <span class="mt-1.5 block text-[14px] font-semibold leading-snug text-[#010D28]">
                {training.title}
              </span>
            </span>

            <ArrowRight class="mt-2 min-w-4 text-[#000A57]/30 transition group-hover:translate-x-0.5 group-hover:text-[#EA6D0B]" size={17} aria-hidden="true" />
          </button>
        {/each}
      </div>
    </div>

    <div
      id="training-player"
      bind:this={playerElement}
      class="scroll-mt-24 lg:sticky lg:top-24 lg:col-span-7"
    >
      {#if selectedTraining && isActive}
        <TrainingVideoPlayer
          training={selectedTraining}
          isCompleted={completedTrainingIds.includes(selectedTraining.id)}
          onComplete={completeSelectedTraining}
        />
      {:else}
        <div class="flex min-h-[420px] flex-col items-center justify-center rounded-[24px] border border-dashed border-[#C9CDDC] bg-[#F9FAFD] p-8 text-center">
          <span class="inline-flex h-16 w-16 items-center justify-center rounded-full bg-white text-[#EA6D0B] shadow-sm ring-1 ring-black/5">
            <PlayCircle size={31} aria-hidden="true" />
          </span>
          <h3 class="mt-5 text-[21px] font-semibold text-[#010D28]">
            Escolha um treinamento
          </h3>
          <p class="mt-2 max-w-md text-[14px] leading-[1.7] text-[#5F6475]">
            Clique em uma das opções para assistir ao vídeo sem sair desta página.
          </p>
        </div>
      {/if}
    </div>
  </div>

  <div class="mt-8 flex flex-col-reverse items-center justify-between gap-4 border-t border-[#EDF0F7] pt-6 sm:flex-row">
    <button
      type="button"
      class="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-full border border-slate-200 bg-white px-6 py-3 text-[15px] font-semibold text-[#000A57] transition hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-slate-300 sm:w-auto"
      on:click={onBack}
    >
      <ArrowLeft size={18} aria-hidden="true" />
      Voltar
    </button>

    <div class="flex items-center gap-2 text-[13px] font-semibold text-[#5F6475]">
      {#if completedTrainingIds.length > 0}
        <CheckCircle2 size={18} class="text-emerald-600" aria-hidden="true" />
      {:else}
        <Circle size={18} aria-hidden="true" />
      {/if}
      {completedTrainingIds.length} de {trainingVideos.length} treinamentos concluídos
    </div>
  </div>
</section>
