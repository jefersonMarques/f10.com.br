<script lang="ts">
  import {
    ArrowLeft,
    ArrowRight,
    Check,
    GraduationCap,
    Handshake,
    LayoutGrid,
    PackageOpen,
    PlayCircle,
    Wallet,
  } from "lucide-svelte";
  import {
    trainingCategories,
    trainingVideos,
    type TrainingCategoryId,
    type TrainingVideo,
  } from "$lib/onboarding/trainingCatalog";

  export let selectedTrainingId: string | null = null;
  export let completedTrainingIds: string[] = [];
  export let onSelect: (training: TrainingVideo) => void = () => undefined;

  let selectedCategoryId: TrainingCategoryId | null = null;
  let showAllTrainings = false;

  const choiceCategories = trainingCategories.filter(
    (category) => category.id !== "essential",
  );

  $: selectedCategory =
    trainingCategories.find((category) => category.id === selectedCategoryId) ??
    null;
  $: visibleTrainingVideos = showAllTrainings
    ? trainingVideos
    : selectedCategoryId
      ? trainingVideos.filter(
          (training) => training.categoryId === selectedCategoryId,
        )
      : [];
  $: isChoosingArea = !selectedCategoryId && !showAllTrainings;

  function selectCategory(categoryId: TrainingCategoryId): void {
    selectedCategoryId = categoryId;
    showAllTrainings = false;
  }

  function showAll(): void {
    selectedCategoryId = null;
    showAllTrainings = true;
  }

  function returnToCategories(): void {
    selectedCategoryId = null;
    showAllTrainings = false;
  }

  function getCategoryTrainingCount(categoryId: TrainingCategoryId): number {
    return trainingVideos.filter(
      (training) => training.categoryId === categoryId,
    ).length;
  }
</script>

<section class="mx-auto w-full max-w-6xl" aria-labelledby="training-library-title">
  {#if isChoosingArea}
    <div class="text-center">
      <p class="text-[11px] font-bold uppercase tracking-[0.18em] text-[#EA6D0B]">
        Escolha pelo que você quer fazer
      </p>
      <h1
        id="training-library-title"
        class="mt-2 text-[27px] font-semibold leading-tight tracking-[-0.035em] text-[#010D28] sm:text-[34px] lg:text-[40px]"
      >
        O que você precisa aprender agora?
      </h1>
      <p class="mx-auto mt-3 max-w-2xl text-[14px] leading-relaxed text-[#5F6475] sm:text-[15px]">
        Primeiro escolha uma área. Na próxima tela aparecerão somente os vídeos relacionados.
      </p>
    </div>

    <div class="mx-auto mt-6 grid max-w-4xl gap-3 sm:grid-cols-2 lg:mt-8">
      {#each choiceCategories as category}
        <button
          type="button"
          class="group flex min-h-[112px] items-center gap-4 rounded-[20px] border border-[#E1E4EF] bg-white p-4 text-left shadow-[0_10px_30px_rgba(1,13,40,0.05)] transition hover:-translate-y-0.5 hover:border-[#EA6D0B]/50 hover:shadow-[0_16px_35px_rgba(1,13,40,0.08)] focus:outline-none focus:ring-2 focus:ring-[#EA6D0B]/40 sm:p-5"
          on:click={() => selectCategory(category.id)}
        >
          <span class="inline-flex h-12 min-w-12 items-center justify-center rounded-2xl bg-[#F1F3FA] text-[#000A57] transition group-hover:bg-[#FFF2E8] group-hover:text-[#EA6D0B]">
            {#if category.id === "sales"}
              <Handshake size={24} aria-hidden="true" />
            {:else if category.id === "pedagogy"}
              <GraduationCap size={24} aria-hidden="true" />
            {:else if category.id === "finance"}
              <Wallet size={24} aria-hidden="true" />
            {:else}
              <PackageOpen size={24} aria-hidden="true" />
            {/if}
          </span>
          <span class="min-w-0 flex-1">
            <span class="block text-[16px] font-semibold text-[#010D28]">
              {category.label}
            </span>
            <span class="mt-1 block text-[12px] leading-[1.5] text-[#5F6475] sm:text-[13px]">
              {category.description}
            </span>
            <span class="mt-2 block text-[11px] font-bold uppercase tracking-[0.08em] text-[#000A57]/45">
              {getCategoryTrainingCount(category.id)} treinamentos
            </span>
          </span>
          <ArrowRight class="min-w-5 text-[#000A57]/30 transition group-hover:translate-x-1 group-hover:text-[#EA6D0B]" size={20} aria-hidden="true" />
        </button>
      {/each}
    </div>

    <div class="mt-5 text-center">
      <button
        type="button"
        class="inline-flex min-h-11 items-center justify-center gap-2 rounded-full px-4 py-2 text-[13px] font-semibold text-[#000A57] underline decoration-[#EA6D0B]/50 underline-offset-4 transition hover:text-[#EA6D0B] focus:outline-none focus:ring-2 focus:ring-[#EA6D0B]/35"
        on:click={showAll}
      >
        <LayoutGrid size={17} aria-hidden="true" />
        Ver todos os 16 treinamentos
      </button>
    </div>
  {:else}
    <div class="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <button
          type="button"
          class="inline-flex min-h-10 items-center gap-2 rounded-full px-3 py-2 text-[13px] font-semibold text-[#000A57] transition hover:bg-white focus:outline-none focus:ring-2 focus:ring-[#EA6D0B]/35"
          on:click={returnToCategories}
        >
          <ArrowLeft size={17} aria-hidden="true" />
          Escolher outra área
        </button>
        <h1
          id="training-library-title"
          class="mt-2 text-[25px] font-semibold leading-tight tracking-[-0.03em] text-[#010D28] sm:text-[32px]"
        >
          {showAllTrainings ? "Todos os treinamentos" : selectedCategory?.label}
        </h1>
        <p class="mt-2 text-[13px] leading-relaxed text-[#5F6475] sm:text-[14px]">
          Clique no treinamento desejado. O vídeo abrirá no centro da tela.
        </p>
      </div>

      <p class="shrink-0 rounded-full bg-white px-4 py-2 text-[12px] font-semibold text-[#000A57] ring-1 ring-[#E1E4EF]">
        {visibleTrainingVideos.length} opções
      </p>
    </div>

    <div class="mt-5 grid gap-3 md:grid-cols-2">
      {#each visibleTrainingVideos as training}
        <button
          type="button"
          class={`group flex min-h-[82px] w-full items-center gap-3 rounded-[18px] border p-3 text-left transition hover:-translate-y-0.5 focus:outline-none focus:ring-2 focus:ring-[#EA6D0B]/40 sm:p-4 ${selectedTrainingId === training.id ? "border-[#EA6D0B] bg-[#FFF7F0]" : "border-[#E1E4EF] bg-white hover:border-[#C9CDDC]"}`}
          on:click={() => onSelect(training)}
          aria-label={`Assistir ao treinamento ${training.title}`}
        >
          <span class={`inline-flex h-10 min-w-10 items-center justify-center rounded-full ${completedTrainingIds.includes(training.id) ? "bg-emerald-600 text-white" : "bg-[#F1F3FA] text-[#000A57] group-hover:bg-[#EA6D0B] group-hover:text-white"}`}>
            {#if completedTrainingIds.includes(training.id)}
              <Check size={18} aria-hidden="true" />
            {:else}
              <PlayCircle size={20} aria-hidden="true" />
            {/if}
          </span>

          <span class="min-w-0 flex-1">
            <span class="flex flex-wrap items-center gap-2">
              <span class="text-[10px] font-bold text-[#000A57]/35">
                {String(trainingVideos.indexOf(training) + 1).padStart(2, "0")}
              </span>
              {#if training.isEssential}
                <span class="rounded-full bg-[#EA6D0B]/10 px-2 py-0.5 text-[9px] font-bold uppercase tracking-[0.08em] text-[#C95717]">
                  Essencial
                </span>
              {/if}
              {#if training.isNew}
                <span class="rounded-full bg-emerald-50 px-2 py-0.5 text-[9px] font-bold uppercase tracking-[0.08em] text-emerald-700">
                  Novo
                </span>
              {/if}
            </span>
            <span class="mt-1 block text-[13px] font-semibold leading-snug text-[#010D28] sm:text-[14px]">
              {training.title}
            </span>
          </span>

          <ArrowRight class="min-w-4 text-[#000A57]/25 transition group-hover:translate-x-0.5 group-hover:text-[#EA6D0B]" size={17} aria-hidden="true" />
        </button>
      {/each}
    </div>
  {/if}
</section>
