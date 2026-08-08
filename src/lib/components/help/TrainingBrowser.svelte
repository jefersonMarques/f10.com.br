<script lang="ts">
  import { PlayCircle, Search, Sparkles, Users, X } from "lucide-svelte";
  import {
    getYoutubeThumbnailUrl,
    trainingCategories,
    trainingVideos,
    type TrainingCategoryId,
    type TrainingVideo,
  } from "$lib/help/trainingCatalog";

  export let onSelect: (training: TrainingVideo) => void = () => undefined;

  type CategoryFilter = TrainingCategoryId | "all";

  let searchQuery = "";
  let selectedCategoryId: CategoryFilter = "all";

  $: normalizedSearchQuery = normalizeText(searchQuery);
  $: visibleTrainingVideos = trainingVideos.filter((training) => {
    const matchesCategory =
      selectedCategoryId === "all" ||
      training.categoryId === selectedCategoryId;
    const category = trainingCategories.find(
      (item) => item.id === training.categoryId,
    );
    const searchableContent = normalizeText(
      `${training.title} ${training.description} ${category?.label ?? ""}`,
    );
    const matchesSearch =
      normalizedSearchQuery.length === 0 ||
      searchableContent.includes(normalizedSearchQuery);

    return matchesCategory && matchesSearch;
  });

  function normalizeText(value: string): string {
    return value
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .trim();
  }

  function getCategoryLabel(categoryId: TrainingCategoryId): string {
    return (
      trainingCategories.find((category) => category.id === categoryId)
        ?.label ?? "Treinamento"
    );
  }

  function clearSearch(): void {
    searchQuery = "";
  }
</script>

<section
  id="treinamentos-f10"
  class="scroll-mt-24"
  aria-labelledby="training-browser-title"
>
  <div class="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
    <div class="max-w-2xl">
      <p class="text-[11px] font-bold uppercase tracking-[0.17em] text-[#EA6D0B]">
        Treinamentos em vídeo
      </p>
      <h2
        id="training-browser-title"
        class="mt-2 text-[29px] font-semibold leading-tight tracking-[-0.04em] text-[#010D28] sm:text-[38px]"
      >
        Aprenda exatamente o que precisa fazer
      </h2>
      <p class="mt-3 text-[14px] leading-[1.7] text-[#5F6475] sm:text-[16px]">
        Pesquise uma rotina ou escolha uma área. O vídeo abrirá no centro da tela.
      </p>
    </div>

    <label class="relative block w-full max-w-md">
      <span class="sr-only">Pesquisar treinamentos</span>
      <Search
        class="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[#000A57]/45"
        size={20}
        aria-hidden="true"
      />
      <input
        type="search"
        bind:value={searchQuery}
        placeholder="Ex.: Pix, matrícula ou turmas"
        class="h-14 w-full rounded-full border border-[#DDE1EC] bg-white pl-12 pr-12 text-[14px] font-medium text-[#010D28] shadow-[0_10px_30px_rgba(1,13,40,0.05)] outline-none transition placeholder:text-[#8C91A0] focus:border-[#EA6D0B] focus:ring-4 focus:ring-[#EA6D0B]/10"
      />
      {#if searchQuery}
        <button
          type="button"
          class="absolute right-2 top-1/2 inline-flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full text-[#5F6475] transition hover:bg-[#F2F3F8] hover:text-[#010D28] focus:outline-none focus:ring-2 focus:ring-[#EA6D0B]/30"
          on:click={clearSearch}
          aria-label="Limpar pesquisa"
        >
          <X size={18} aria-hidden="true" />
        </button>
      {/if}
    </label>
  </div>

  <div class="mt-6 flex flex-wrap gap-2" aria-label="Filtrar treinamentos por área">
    <button
      type="button"
      class={`min-h-11 rounded-full px-4 py-2 text-[13px] font-semibold transition focus:outline-none focus:ring-2 focus:ring-[#EA6D0B]/35 ${selectedCategoryId === "all" ? "bg-[#000A57] text-white shadow-[0_8px_22px_rgba(0,10,87,0.18)]" : "border border-[#DDE1EC] bg-white text-[#4C5263] hover:border-[#000A57]/30 hover:text-[#000A57]"}`}
      on:click={() => (selectedCategoryId = "all")}
    >
      Todos
    </button>
    {#each trainingCategories as category}
      <button
        type="button"
        class={`min-h-11 rounded-full px-4 py-2 text-[13px] font-semibold transition focus:outline-none focus:ring-2 focus:ring-[#EA6D0B]/35 ${selectedCategoryId === category.id ? "bg-[#000A57] text-white shadow-[0_8px_22px_rgba(0,10,87,0.18)]" : "border border-[#DDE1EC] bg-white text-[#4C5263] hover:border-[#000A57]/30 hover:text-[#000A57]"}`}
        on:click={() => (selectedCategoryId = category.id)}
      >
        {category.label}
      </button>
    {/each}
  </div>

  <div class="mt-5 flex items-center justify-between gap-4">
    <p class="text-[13px] font-semibold text-[#5F6475]">
      {visibleTrainingVideos.length}
      {visibleTrainingVideos.length === 1 ? "treinamento encontrado" : "treinamentos encontrados"}
    </p>
    {#if normalizedSearchQuery || selectedCategoryId !== "all"}
      <button
        type="button"
        class="min-h-10 rounded-full px-3 py-2 text-[12px] font-semibold text-[#000A57] underline decoration-[#EA6D0B]/50 underline-offset-4 focus:outline-none focus:ring-2 focus:ring-[#EA6D0B]/30"
        on:click={() => {
          searchQuery = "";
          selectedCategoryId = "all";
        }}
      >
        Limpar filtros
      </button>
    {/if}
  </div>

  {#if visibleTrainingVideos.length > 0}
    <div class="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {#each visibleTrainingVideos as training}
        <button
          type="button"
          class="group overflow-hidden rounded-[22px] border border-[#E0E3EC] bg-white text-left shadow-[0_10px_32px_rgba(1,13,40,0.05)] transition hover:-translate-y-1 hover:border-[#EA6D0B]/45 hover:shadow-[0_18px_42px_rgba(1,13,40,0.1)] focus:outline-none focus:ring-2 focus:ring-[#EA6D0B]/40 focus:ring-offset-2"
          on:click={() => onSelect(training)}
          aria-label={`Assistir ao treinamento ${training.title}`}
        >
          <span class="relative block aspect-video overflow-hidden bg-[#07112D]">
            <img
              src={getYoutubeThumbnailUrl(training.videoId)}
              alt=""
              loading="lazy"
              decoding="async"
              class="h-full w-full object-cover opacity-90 transition duration-300 group-hover:scale-[1.025] group-hover:opacity-100"
            />
            <span class="absolute inset-0 bg-gradient-to-t from-[#010D28]/45 via-transparent to-transparent"></span>
            <span class="absolute bottom-3 left-3 inline-flex h-11 w-11 items-center justify-center rounded-full bg-white text-[#EA6D0B] shadow-lg transition group-hover:scale-105 group-hover:bg-[#EA6D0B] group-hover:text-white">
              <PlayCircle size={24} aria-hidden="true" />
            </span>
          </span>

          <span class="block p-4 sm:p-5">
            <span class="flex flex-wrap items-center gap-2">
              <span class="rounded-full bg-[#F1F3FA] px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.07em] text-[#000A57]/65">
                {getCategoryLabel(training.categoryId)}
              </span>
              {#if training.audience === "manager"}
                <span class="inline-flex items-center gap-1 rounded-full bg-[#FFF1E5] px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.07em] text-[#C95717]">
                  <Users size={12} aria-hidden="true" />
                  Para gestores
                </span>
              {/if}
              {#if training.isNew}
                <span class="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.07em] text-emerald-700">
                  <Sparkles size={12} aria-hidden="true" />
                  Novo
                </span>
              {/if}
            </span>
            <span class="mt-3 block text-[16px] font-semibold leading-snug text-[#010D28]">
              {training.title}
            </span>
            <span class="mt-2 block text-[13px] leading-[1.6] text-[#646979]">
              {training.description}
            </span>
            <span class="mt-4 inline-flex items-center gap-2 text-[13px] font-bold text-[#C95717]">
              Assistir agora
              <PlayCircle size={16} aria-hidden="true" />
            </span>
          </span>
        </button>
      {/each}
    </div>
  {:else}
    <div class="mt-5 rounded-[22px] border border-dashed border-[#C9CEDC] bg-white px-5 py-12 text-center">
      <Search class="mx-auto text-[#000A57]/35" size={32} aria-hidden="true" />
      <h3 class="mt-4 text-[18px] font-semibold text-[#010D28]">
        Nenhum treinamento encontrado
      </h3>
      <p class="mt-2 text-[14px] text-[#696E7E]">
        Tente outra palavra ou limpe os filtros.
      </p>
    </div>
  {/if}
</section>
