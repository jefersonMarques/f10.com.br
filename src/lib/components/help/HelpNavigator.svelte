<script lang="ts">
  import { browser } from "$app/environment";
  import { goto } from "$app/navigation";
  import { onMount, tick } from "svelte";
  import {
    ArrowLeft,
    ArrowRight,
    Check,
    CheckCircle2,
    CircleAlert,
    LifeBuoy,
    PlayCircle,
    RotateCcw,
    Search,
    Sparkles,
  } from "lucide-svelte";
  import HelpOptionCard from "$lib/components/help/HelpOptionCard.svelte";
  import SupportChatDialog from "$lib/components/onboarding/SupportChatDialog.svelte";
  import TrainingVideoDialog from "$lib/components/onboarding/TrainingVideoDialog.svelte";
  import {
    HELP_ROOT_QUESTION_ID,
    getHelpDestination,
    getHelpQuestion,
    type HelpDestination,
    type HelpOption,
  } from "$lib/help/helpDecisionTree";
  import { searchHelpDestinations } from "$lib/help/helpSearchAliases";
  import {
    trainingVideos,
    type TrainingVideo,
  } from "$lib/help/trainingCatalog";

  type NavigatorScreen =
    | "question"
    | "search"
    | "destination"
    | "feedback"
    | "uncertain"
    | "success";

  type DestinationOrigin = "question" | "search";

  type AnalyticsWindow = Window & {
    dataLayer?: Array<Record<string, string | number | boolean>>;
  };

  let screen: NavigatorScreen = "question";
  let currentQuestionId = HELP_ROOT_QUESTION_ID;
  let questionHistory: string[] = [];
  let currentDestination: HelpDestination | null = null;
  let destinationOrigin: DestinationOrigin = "question";
  let currentTrainingIndex = 0;
  let activeTraining: TrainingVideo | null = null;
  let supportDialogOpen = false;
  let searchQuery = "";
  let contentElement: HTMLElement;
  let searchInputElement: HTMLInputElement;

  $: currentQuestion = getHelpQuestion(currentQuestionId);
  $: currentTrainingIds = currentDestination?.trainingIds ?? [];
  $: currentTraining = findTraining(currentTrainingIds[currentTrainingIndex]);
  $: searchResults = searchHelpDestinations(searchQuery);
  $: canGoBack =
    screen !== "question" || currentQuestionId !== HELP_ROOT_QUESTION_ID;

  onMount(() => {
    const goalId = new URL(window.location.href).searchParams.get("goal");
    if (!goalId) return;

    const destination = getHelpDestination(goalId);
    if (destination) openDestination(destination, "question", false);
  });

  function findTraining(trainingId?: string): TrainingVideo | null {
    if (!trainingId) return null;
    return trainingVideos.find((training) => training.id === trainingId) ?? null;
  }

  function handleOptionSelection(option: HelpOption): void {
    trackHelpEvent("help_option_selected", {
      help_option_id: option.id,
      help_question_id: currentQuestionId,
    });

    if (option.nextQuestionId) {
      questionHistory = [...questionHistory, currentQuestionId];
      currentQuestionId = option.nextQuestionId;
      void focusContent();
      return;
    }

    if (option.opensSearch) {
      openSearch();
      return;
    }

    if (!option.destinationId) return;
    const destination = getHelpDestination(option.destinationId);
    if (destination) openDestination(destination, "question");
  }

  function openDestination(
    destination: HelpDestination,
    origin: DestinationOrigin,
    updateUrl = true,
  ): void {
    currentDestination = destination;
    destinationOrigin = origin;
    currentTrainingIndex = 0;
    activeTraining = null;
    screen = "destination";

    if (updateUrl) updateGoalUrl(destination.id);
    trackHelpEvent("help_destination_opened", {
      help_destination_id: destination.id,
      help_destination_kind: destination.kind,
    });
    void focusContent();
  }

  function openSearch(): void {
    searchQuery = "";
    screen = "search";
    clearGoalUrl();
    trackHelpEvent("help_search_opened");
    void focusSearchInput();
  }

  function openTraining(): void {
    if (!currentTraining) return;
    activeTraining = currentTraining;
    trackHelpEvent("help_training_started", {
      help_training_id: currentTraining.id,
    });
  }

  function closeTraining(): void {
    activeTraining = null;
  }

  function completeTraining(): void {
    if (currentTraining) {
      trackHelpEvent("help_training_completed", {
        help_training_id: currentTraining.id,
      });
    }
    activeTraining = null;

    if (currentTrainingIndex < currentTrainingIds.length - 1) {
      currentTrainingIndex += 1;
      screen = "destination";
      void focusContent();
      return;
    }

    screen = "feedback";
    void focusContent();
  }

  function confirmSuccess(): void {
    screen = "success";
    void focusContent();
  }

  function showUncertainOptions(): void {
    screen = "uncertain";
    void focusContent();
  }

  function replayLastTraining(): void {
    currentTrainingIndex = Math.max(0, currentTrainingIds.length - 1);
    openTraining();
  }

  function openSupport(): void {
    supportDialogOpen = true;
    trackHelpEvent("help_support_opened", {
      help_context_id: currentDestination?.id ?? currentQuestionId,
    });
  }

  function closeSupport(): void {
    supportDialogOpen = false;
  }

  function goBack(): void {
    if (screen === "feedback") {
      screen = "destination";
      void focusContent();
      return;
    }

    if (screen === "uncertain") {
      screen = "feedback";
      void focusContent();
      return;
    }

    if (screen === "destination") {
      screen = destinationOrigin;
      currentDestination = null;
      currentTrainingIndex = 0;
      clearGoalUrl();
      void focusContent();
      return;
    }

    if (screen === "search") {
      screen = "question";
      void focusContent();
      return;
    }

    if (screen === "success") {
      restartNavigator();
      return;
    }

    const previousQuestionId = questionHistory.at(-1);
    if (!previousQuestionId) return;

    currentQuestionId = previousQuestionId;
    questionHistory = questionHistory.slice(0, -1);
    void focusContent();
  }

  function restartNavigator(): void {
    screen = "question";
    currentQuestionId = HELP_ROOT_QUESTION_ID;
    questionHistory = [];
    currentDestination = null;
    currentTrainingIndex = 0;
    activeTraining = null;
    searchQuery = "";
    clearGoalUrl();
    void focusContent();
  }

  function updateGoalUrl(goalId: string): void {
    if (!browser) return;
    const url = new URL(window.location.href);
    url.searchParams.set("goal", goalId);
    void goto(`${url.pathname}${url.search}`, {
      replaceState: true,
      noScroll: true,
      keepFocus: true,
    });
  }

  function clearGoalUrl(): void {
    if (!browser) return;
    const url = new URL(window.location.href);
    if (!url.searchParams.has("goal")) return;
    url.searchParams.delete("goal");
    void goto(`${url.pathname}${url.search}`, {
      replaceState: true,
      noScroll: true,
      keepFocus: true,
    });
  }

  async function focusContent(): Promise<void> {
    await tick();
    contentElement?.focus({ preventScroll: true });
  }

  async function focusSearchInput(): Promise<void> {
    await tick();
    searchInputElement?.focus({ preventScroll: true });
  }

  function trackHelpEvent(
    eventName: string,
    eventData: Record<string, string | number | boolean> = {},
  ): void {
    if (!browser) return;
    const analyticsWindow = window as AnalyticsWindow;
    analyticsWindow.dataLayer ??= [];
    analyticsWindow.dataLayer.push({ event: eventName, ...eventData });
  }
</script>

<section class="relative h-[100dvh] overflow-hidden bg-[#F5F6FB] text-[#010D28]">
  <div
    class="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_10%_12%,rgba(234,109,11,0.13),transparent_29%),radial-gradient(circle_at_88%_84%,rgba(0,10,87,0.1),transparent_31%)]"
    aria-hidden="true"
  ></div>

  <div class="relative flex h-full flex-col">
    <header class="shrink-0 border-b border-[#E3E6EF] bg-white/95 px-4 py-3 backdrop-blur sm:px-6">
      <div class="mx-auto flex max-w-6xl items-center justify-between gap-4">
        <div class="flex min-w-0 items-center gap-3">
          <img src="/logo_f10.svg" alt="F10 Software" class="h-8 w-auto sm:h-9" />
          <span class="h-8 w-px bg-[#DFE3ED]" aria-hidden="true"></span>
          <span class="truncate text-[13px] font-semibold text-[#010D28] sm:text-[14px]">
            Orientação F10
          </span>
        </div>

        {#if canGoBack}
          <button
            type="button"
            class="inline-flex min-h-10 items-center justify-center gap-2 rounded-full px-3 py-2 text-[12px] font-semibold text-[#53596B] transition hover:bg-[#F2F4F8] hover:text-[#000A57] focus:outline-none focus:ring-2 focus:ring-[#000A57]/20 sm:px-4"
            on:click={goBack}
          >
            <ArrowLeft size={17} aria-hidden="true" />
            Voltar
          </button>
        {/if}
      </div>
    </header>

    <main
      bind:this={contentElement}
      class="min-h-0 flex-1 overflow-y-auto px-4 py-4 focus:outline-none sm:px-6 sm:py-6"
      tabindex="-1"
      aria-live="polite"
    >
      <div class="mx-auto flex min-h-full w-full max-w-6xl items-center justify-center">
        {#if screen === "question" && currentQuestion}
          <section class="navigator-enter w-full text-center" aria-labelledby="help-question-title">
            <p class="text-[10px] font-bold uppercase tracking-[0.18em] text-[#D65B0A] sm:text-[11px]">
              {currentQuestion.eyebrow}
            </p>
            <h1
              id="help-question-title"
              class="mx-auto mt-2 max-w-3xl text-[27px] font-semibold leading-[1.08] tracking-[-0.04em] text-[#010D28] sm:text-[40px] lg:text-[46px]"
            >
              {currentQuestion.title}
            </h1>
            <p class="mx-auto mt-3 max-w-xl text-[13px] leading-[1.6] text-[#646A7B] sm:text-[15px]">
              {currentQuestion.description}
            </p>

            <div
              class={`mx-auto mt-5 grid gap-3 sm:mt-7 ${currentQuestion.options.length === 3 && !currentQuestion.compact ? "max-w-5xl sm:grid-cols-3" : currentQuestion.options.length <= 3 ? "max-w-3xl sm:grid-cols-3" : "max-w-4xl grid-cols-2"}`}
            >
              {#each currentQuestion.options as option}
                <HelpOptionCard
                  {option}
                  compact={currentQuestion.compact === true}
                  onSelect={handleOptionSelection}
                />
              {/each}
            </div>

            {#if currentQuestion.searchLabel}
              <button
                type="button"
                class="mx-auto mt-4 inline-flex min-h-10 items-center justify-center gap-2 rounded-full px-4 py-2 text-[12px] font-semibold text-[#000A57] underline decoration-[#EA6D0B]/60 underline-offset-4 transition hover:bg-white/70 focus:outline-none focus:ring-2 focus:ring-[#EA6D0B]/30"
                on:click={openSearch}
              >
                <Search size={16} aria-hidden="true" />
                {currentQuestion.searchLabel}
              </button>
            {/if}
          </section>
        {:else if screen === "search"}
          <section class="navigator-enter w-full max-w-3xl text-center" aria-labelledby="help-search-title">
            <p class="text-[10px] font-bold uppercase tracking-[0.18em] text-[#D65B0A] sm:text-[11px]">
              Encontrar uma orientação
            </p>
            <h1
              id="help-search-title"
              class="mt-2 text-[27px] font-semibold leading-tight tracking-[-0.04em] sm:text-[40px]"
            >
              O que você quer fazer?
            </h1>
            <p class="mt-3 text-[13px] leading-relaxed text-[#646A7B] sm:text-[15px]">
              Escreva de forma simples, por exemplo: “receber Pix” ou “lançar notas”.
            </p>

            <label class="relative mx-auto mt-6 block max-w-xl">
              <span class="sr-only">Descreva o que deseja fazer</span>
              <Search
                class="pointer-events-none absolute left-5 top-1/2 -translate-y-1/2 text-[#000A57]/45"
                size={21}
                aria-hidden="true"
              />
              <input
                bind:this={searchInputElement}
                bind:value={searchQuery}
                type="search"
                placeholder="Ex.: cadastrar funcionário"
                class="h-16 w-full rounded-full border border-[#D9DEEA] bg-white pl-14 pr-5 text-[15px] font-medium text-[#010D28] shadow-[0_14px_38px_rgba(1,13,40,0.08)] outline-none transition placeholder:text-[#8A90A0] focus:border-[#EA6D0B] focus:ring-4 focus:ring-[#EA6D0B]/10"
              />
            </label>

            {#if searchQuery.trim().length >= 2}
              {#if searchResults.length > 0}
                <div class="mx-auto mt-5 grid max-w-2xl gap-2.5">
                  {#each searchResults as result}
                    <button
                      type="button"
                      class="group flex min-h-[68px] items-center justify-between gap-3 rounded-[18px] border border-[#DFE3ED] bg-white px-4 py-3 text-left shadow-[0_8px_24px_rgba(1,13,40,0.05)] transition hover:border-[#EA6D0B]/50 hover:bg-[#FFF9F4] focus:outline-none focus:ring-2 focus:ring-[#EA6D0B]/35"
                      on:click={() => openDestination(result.destination, "search")}
                    >
                      <span>
                        <span class="block text-[13px] font-semibold text-[#010D28] sm:text-[14px]">
                          {result.destination.title}
                        </span>
                        <span class="mt-1 block text-[11px] text-[#6A7080] sm:text-[12px]">
                          {result.destination.eyebrow}
                        </span>
                      </span>
                      <ArrowRight
                        class="shrink-0 text-[#EA6D0B] transition group-hover:translate-x-1"
                        size={18}
                        aria-hidden="true"
                      />
                    </button>
                  {/each}
                </div>
              {:else}
                <div class="mx-auto mt-5 max-w-xl rounded-[20px] border border-[#E0E3EC] bg-white p-5">
                  <p class="text-[14px] font-semibold text-[#010D28]">
                    Não encontramos uma orientação exata.
                  </p>
                  <button
                    type="button"
                    class="mt-3 inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-[#000A57] px-5 py-2.5 text-[13px] font-semibold text-white focus:outline-none focus:ring-2 focus:ring-[#000A57]/35"
                    on:click={openSupport}
                  >
                    <LifeBuoy size={17} aria-hidden="true" />
                    Pedir ajuda ao suporte
                  </button>
                </div>
              {/if}
            {/if}
          </section>
        {:else if screen === "destination" && currentDestination}
          <section class="navigator-enter w-full max-w-3xl text-center" aria-labelledby="help-destination-title">
            <span class="inline-flex h-16 w-16 items-center justify-center rounded-full bg-[#FFF0E4] text-[#D65B0A] ring-8 ring-white/75">
              {#if currentDestination.kind === "support"}
                <LifeBuoy size={29} aria-hidden="true" />
              {:else if currentDestination.kind === "route"}
                <ArrowRight size={29} aria-hidden="true" />
              {:else}
                <PlayCircle size={30} aria-hidden="true" />
              {/if}
            </span>
            <p class="mt-6 text-[10px] font-bold uppercase tracking-[0.18em] text-[#D65B0A] sm:text-[11px]">
              {currentDestination.eyebrow}
            </p>
            <h1
              id="help-destination-title"
              class="mx-auto mt-2 max-w-2xl text-[28px] font-semibold leading-[1.08] tracking-[-0.04em] sm:text-[42px]"
            >
              {currentDestination.title}
            </h1>
            <p class="mx-auto mt-4 max-w-xl text-[13px] leading-[1.7] text-[#646A7B] sm:text-[15px]">
              {currentDestination.description}
            </p>

            {#if currentDestination.kind === "route" && currentDestination.href}
              <a
                href={currentDestination.href}
                class="primary-action mt-7 inline-flex min-h-14 w-full items-center justify-center gap-2 rounded-full bg-[#EA6D0B] px-7 py-3.5 text-[15px] font-semibold text-white shadow-[0_18px_42px_rgba(234,109,11,0.3)] transition hover:brightness-105 focus:outline-none focus:ring-2 focus:ring-[#EA6D0B]/45 focus:ring-offset-2 sm:w-auto"
              >
                {currentDestination.actionLabel}
                <ArrowRight size={19} aria-hidden="true" />
              </a>
            {:else if currentDestination.kind === "support"}
              <button
                type="button"
                class="primary-action mt-7 inline-flex min-h-14 w-full items-center justify-center gap-2 rounded-full bg-[#EA6D0B] px-7 py-3.5 text-[15px] font-semibold text-white shadow-[0_18px_42px_rgba(234,109,11,0.3)] focus:outline-none focus:ring-2 focus:ring-[#EA6D0B]/45 focus:ring-offset-2 sm:w-auto"
                on:click={openSupport}
              >
                <LifeBuoy size={19} aria-hidden="true" />
                {currentDestination.actionLabel}
              </button>
            {:else if currentTraining}
              <div class="mx-auto mt-6 max-w-xl rounded-[22px] border border-[#DFE3ED] bg-white p-4 shadow-[0_14px_38px_rgba(1,13,40,0.07)] sm:p-5">
                {#if currentTrainingIds.length > 1}
                  <p class="text-[10px] font-bold uppercase tracking-[0.14em] text-[#000A57]/55">
                    Orientação {currentTrainingIndex + 1} de {currentTrainingIds.length}
                  </p>
                {/if}
                <p class="mt-1 text-[16px] font-semibold leading-snug text-[#010D28] sm:text-[18px]">
                  {currentTraining.title}
                </p>
                <button
                  type="button"
                  class="primary-action mt-4 inline-flex min-h-[52px] w-full items-center justify-center gap-2 rounded-full bg-[#EA6D0B] px-6 py-3 text-[14px] font-semibold text-white shadow-[0_14px_34px_rgba(234,109,11,0.28)] focus:outline-none focus:ring-2 focus:ring-[#EA6D0B]/45 focus:ring-offset-2"
                  on:click={openTraining}
                >
                  <PlayCircle size={19} aria-hidden="true" />
                  {currentTrainingIndex > 0 ? "Assistir próxima orientação" : currentDestination.actionLabel}
                </button>
              </div>
            {/if}
          </section>
        {:else if screen === "feedback" && currentDestination}
          <section class="navigator-enter w-full max-w-3xl text-center" aria-labelledby="help-feedback-title">
            <span class="inline-flex h-16 w-16 items-center justify-center rounded-full bg-[#EAF9F3] text-emerald-700 ring-8 ring-white/75">
              <CheckCircle2 size={30} aria-hidden="true" />
            </span>
            <p class="mt-6 text-[10px] font-bold uppercase tracking-[0.18em] text-emerald-700 sm:text-[11px]">
              Orientação finalizada
            </p>
            <h1
              id="help-feedback-title"
              class="mt-2 text-[29px] font-semibold tracking-[-0.04em] sm:text-[42px]"
            >
              Você conseguiu fazer?
            </h1>
            <p class="mt-3 text-[13px] text-[#646A7B] sm:text-[15px]">
              Escolha o que aconteceu depois de seguir a orientação.
            </p>

            <div class="mx-auto mt-7 grid max-w-3xl gap-3 sm:grid-cols-3">
              <button
                type="button"
                class="inline-flex min-h-[72px] items-center justify-center gap-2 rounded-[20px] bg-emerald-600 px-5 py-3 text-[14px] font-semibold text-white shadow-[0_14px_32px_rgba(5,150,105,0.22)] focus:outline-none focus:ring-2 focus:ring-emerald-500/40 focus:ring-offset-2"
                on:click={confirmSuccess}
              >
                <Check size={19} aria-hidden="true" />
                Sim, consegui
              </button>
              <button
                type="button"
                class="inline-flex min-h-[72px] items-center justify-center gap-2 rounded-[20px] border border-[#DDE1EC] bg-white px-5 py-3 text-[14px] font-semibold text-[#000A57] focus:outline-none focus:ring-2 focus:ring-[#000A57]/20"
                on:click={showUncertainOptions}
              >
                <RotateCcw size={19} aria-hidden="true" />
                Ainda tenho dúvida
              </button>
              <button
                type="button"
                class="inline-flex min-h-[72px] items-center justify-center gap-2 rounded-[20px] border border-[#F1C5A7] bg-[#FFF8F2] px-5 py-3 text-[14px] font-semibold text-[#B94A07] focus:outline-none focus:ring-2 focus:ring-[#EA6D0B]/30"
                on:click={openSupport}
              >
                <CircleAlert size={19} aria-hidden="true" />
                Apareceu um erro
              </button>
            </div>
          </section>
        {:else if screen === "uncertain"}
          <section class="navigator-enter w-full max-w-2xl text-center" aria-labelledby="help-uncertain-title">
            <span class="inline-flex h-16 w-16 items-center justify-center rounded-full bg-[#FFF0E4] text-[#D65B0A] ring-8 ring-white/75">
              <RotateCcw size={29} aria-hidden="true" />
            </span>
            <h1
              id="help-uncertain-title"
              class="mt-6 text-[29px] font-semibold tracking-[-0.04em] sm:text-[42px]"
            >
              Vamos tentar mais uma vez
            </h1>
            <p class="mx-auto mt-3 max-w-lg text-[13px] leading-relaxed text-[#646A7B] sm:text-[15px]">
              Você pode rever a última orientação. Se a dúvida continuar, fale com o suporte.
            </p>
            <div class="mx-auto mt-7 grid max-w-xl gap-3 sm:grid-cols-2">
              <button
                type="button"
                class="inline-flex min-h-14 items-center justify-center gap-2 rounded-full bg-[#EA6D0B] px-6 py-3 text-[14px] font-semibold text-white focus:outline-none focus:ring-2 focus:ring-[#EA6D0B]/40"
                on:click={replayLastTraining}
              >
                <PlayCircle size={19} aria-hidden="true" />
                Assistir novamente
              </button>
              <button
                type="button"
                class="inline-flex min-h-14 items-center justify-center gap-2 rounded-full bg-[#000A57] px-6 py-3 text-[14px] font-semibold text-white focus:outline-none focus:ring-2 focus:ring-[#000A57]/35"
                on:click={openSupport}
              >
                <LifeBuoy size={19} aria-hidden="true" />
                Falar com o suporte
              </button>
            </div>
          </section>
        {:else if screen === "success"}
          <section class="navigator-enter w-full max-w-2xl text-center" aria-labelledby="help-success-title">
            <span class="inline-flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 text-emerald-700 ring-8 ring-emerald-50/80">
              <Sparkles size={30} aria-hidden="true" />
            </span>
            <p class="mt-6 text-[10px] font-bold uppercase tracking-[0.18em] text-emerald-700 sm:text-[11px]">
              Tudo certo
            </p>
            <h1
              id="help-success-title"
              class="mt-2 text-[30px] font-semibold tracking-[-0.04em] sm:text-[43px]"
            >
              Orientação concluída
            </h1>
            <p class="mt-3 text-[14px] text-[#646A7B] sm:text-[15px]">
              Quando precisar realizar outra tarefa, comece uma nova orientação.
            </p>
            <button
              type="button"
              class="mt-7 inline-flex min-h-14 w-full items-center justify-center gap-2 rounded-full bg-[#000A57] px-7 py-3 text-[15px] font-semibold text-white focus:outline-none focus:ring-2 focus:ring-[#000A57]/35 focus:ring-offset-2 sm:w-auto"
              on:click={restartNavigator}
            >
              Preciso de outra ajuda
              <ArrowRight size={19} aria-hidden="true" />
            </button>
          </section>
        {/if}
      </div>
    </main>
  </div>
</section>

<TrainingVideoDialog
  training={activeTraining}
  isOpen={activeTraining !== null}
  completeActionLabel="Terminei de assistir"
  onClose={closeTraining}
  onComplete={completeTraining}
/>

<SupportChatDialog isOpen={supportDialogOpen} onClose={closeSupport} />

<style>
  .navigator-enter {
    animation: navigator-enter 200ms ease-out;
  }

  .primary-action {
    animation: primary-action-float 2.8s ease-in-out infinite;
  }

  @keyframes navigator-enter {
    from {
      opacity: 0;
      transform: translateX(10px);
    }
    to {
      opacity: 1;
      transform: translateX(0);
    }
  }

  @keyframes primary-action-float {
    0%, 100% {
      transform: translateY(0);
    }
    50% {
      transform: translateY(-4px);
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .navigator-enter,
    .primary-action {
      animation: none;
    }
  }
</style>
