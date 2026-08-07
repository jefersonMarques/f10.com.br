<script lang="ts">
  import { browser } from "$app/environment";
  import { onMount, tick } from "svelte";
  import {
    ArrowLeft,
    ArrowRight,
    Check,
    CheckCircle2,
    LifeBuoy,
    RotateCcw,
    Sparkles,
    X,
  } from "lucide-svelte";
  import EssentialTrainingStep from "$lib/components/onboarding/EssentialTrainingStep.svelte";
  import FirstAccessStep from "$lib/components/onboarding/FirstAccessStep.svelte";
  import InstallationStep from "$lib/components/onboarding/InstallationStep.svelte";
  import TrainingLibrary from "$lib/components/onboarding/TrainingLibrary.svelte";
  import TrainingVideoDialog from "$lib/components/onboarding/TrainingVideoDialog.svelte";
  import {
    trainingVideos,
    type TrainingVideo,
  } from "$lib/onboarding/trainingCatalog";

  type JourneyStepId =
    | "installation"
    | "first-access"
    | "user-registration"
    | "user-permissions"
    | "training-library";

  type JourneyStep = {
    id: JourneyStepId;
    shortTitle: string;
    objective: string;
  };

  type StoredJourneyProgress = {
    currentStepId?: JourneyStepId;
    completedStepIds?: JourneyStepId[];
    completedTrainingIds?: string[];
    selectedTrainingId?: string | null;
  };

  const storageKey = "f10-getting-started-progress-v1";
  const journeySteps: JourneyStep[] = [
    {
      id: "installation",
      shortTitle: "Instalar o F10",
      objective: "Baixar e instalar o sistema no computador.",
    },
    {
      id: "first-access",
      shortTitle: "Primeiro acesso",
      objective: "Entrar usando os dados recebidos por e-mail.",
    },
    {
      id: "user-registration",
      shortTitle: "Criar usuários",
      objective: "Cadastrar as pessoas que usarão o F10.",
    },
    {
      id: "user-permissions",
      shortTitle: "Organizar acessos",
      objective: "Definir o que cada pessoa poderá acessar.",
    },
    {
      id: "training-library",
      shortTitle: "Aprender uma rotina",
      objective: "Escolher o que você precisa fazer agora.",
    },
  ];

  let currentStepIndex = 0;
  let completedStepIds: JourneyStepId[] = [];
  let completedTrainingIds: string[] = [];
  let selectedTrainingId: string | null = null;
  let activeTraining: TrainingVideo | null = null;
  let hasStarted = false;
  let hasSavedProgress = false;
  let showCompletion = false;
  let contentElement: HTMLElement;

  $: currentStep = journeySteps[currentStepIndex];
  $: completedStepCount = journeySteps.filter((step) =>
    completedStepIds.includes(step.id),
  ).length;
  $: activeTrainingIsCompleted = activeTraining
    ? completedTrainingIds.includes(activeTraining.id)
    : false;
  $: currentEssentialTraining =
    currentStep?.id === "user-registration"
      ? trainingVideos[0]
      : currentStep?.id === "user-permissions"
        ? trainingVideos[1]
        : null;
  $: primaryActionLabel = getPrimaryActionLabel();

  onMount(() => {
    restoreProgress();
  });

  function restoreProgress(): void {
    if (!browser) return;

    try {
      const storedValue = window.localStorage.getItem(storageKey);
      if (!storedValue) return;

      const storedProgress = JSON.parse(storedValue) as StoredJourneyProgress;
      const knownStepIds = new Set(journeySteps.map((step) => step.id));
      const knownTrainingIds = new Set(trainingVideos.map((training) => training.id));

      completedStepIds = (storedProgress.completedStepIds ?? []).filter(
        (stepId) => knownStepIds.has(stepId),
      );
      completedTrainingIds = (
        storedProgress.completedTrainingIds ?? []
      ).filter((trainingId) => knownTrainingIds.has(trainingId));

      if (
        storedProgress.selectedTrainingId &&
        knownTrainingIds.has(storedProgress.selectedTrainingId)
      ) {
        selectedTrainingId = storedProgress.selectedTrainingId;
      }

      const storedStepIndex = journeySteps.findIndex(
        (step) => step.id === storedProgress.currentStepId,
      );
      if (storedStepIndex >= 0) currentStepIndex = storedStepIndex;

      hasSavedProgress = true;
    } catch {
      window.localStorage.removeItem(storageKey);
    }
  }

  function persistProgress(): void {
    if (!browser) return;

    const progress: StoredJourneyProgress = {
      currentStepId: journeySteps[currentStepIndex].id,
      completedStepIds,
      completedTrainingIds,
      selectedTrainingId,
    };

    try {
      window.localStorage.setItem(storageKey, JSON.stringify(progress));
      hasSavedProgress = true;
    } catch {
      return;
    }
  }

  async function focusCurrentContent(): Promise<void> {
    await tick();
    contentElement?.focus({ preventScroll: true });
  }

  function startExperience(): void {
    hasStarted = true;
    showCompletion = false;
    persistProgress();
    void focusCurrentContent();
  }

  function restartExperience(): void {
    currentStepIndex = 0;
    completedStepIds = [];
    completedTrainingIds = [];
    selectedTrainingId = null;
    activeTraining = null;
    showCompletion = false;
    hasStarted = true;

    if (browser) window.localStorage.removeItem(storageKey);
    persistProgress();
    void focusCurrentContent();
  }

  function returnToIntroduction(): void {
    activeTraining = null;
    showCompletion = false;
    hasStarted = false;
  }

  function addCompletedStep(stepId: JourneyStepId): void {
    if (completedStepIds.includes(stepId)) return;
    completedStepIds = [...completedStepIds, stepId];
  }

  function addCompletedTraining(trainingId: string): void {
    if (completedTrainingIds.includes(trainingId)) return;
    completedTrainingIds = [...completedTrainingIds, trainingId];
  }

  function openStep(stepIndex: number): void {
    currentStepIndex = Math.min(
      Math.max(stepIndex, 0),
      journeySteps.length - 1,
    );
    showCompletion = false;
    persistProgress();
    void focusCurrentContent();
  }

  function goBack(): void {
    if (currentStepIndex === 0) {
      returnToIntroduction();
      return;
    }

    openStep(currentStepIndex - 1);
  }

  function completeStepAndContinue(): void {
    addCompletedStep(currentStep.id);

    if (currentStep.id === "user-registration") {
      addCompletedTraining(trainingVideos[0].id);
    }

    if (currentStep.id === "user-permissions") {
      addCompletedTraining(trainingVideos[1].id);
    }

    currentStepIndex = Math.min(
      currentStepIndex + 1,
      journeySteps.length - 1,
    );
    persistProgress();
    void focusCurrentContent();
  }

  function getPrimaryActionLabel(): string | null {
    if (!currentStep) return null;

    if (currentStep.id === "installation") return "Já instalei o F10";
    if (currentStep.id === "first-access") return "Consegui entrar no F10";

    if (currentEssentialTraining) {
      return completedTrainingIds.includes(currentEssentialTraining.id)
        ? "Continuar"
        : "Assistir ao vídeo";
    }

    return null;
  }

  function handlePrimaryAction(): void {
    if (
      currentStep.id === "installation" ||
      currentStep.id === "first-access"
    ) {
      completeStepAndContinue();
      return;
    }

    if (!currentEssentialTraining) return;

    if (completedTrainingIds.includes(currentEssentialTraining.id)) {
      completeStepAndContinue();
      return;
    }

    openTraining(currentEssentialTraining);
  }

  function openTraining(training: TrainingVideo): void {
    selectedTrainingId = training.id;
    activeTraining = training;
    persistProgress();
  }

  function closeTraining(): void {
    activeTraining = null;
  }

  function completeActiveTraining(): void {
    if (!activeTraining) return;

    const completedTraining = activeTraining;
    addCompletedTraining(completedTraining.id);

    if (
      currentStep.id === "user-registration" &&
      completedTraining.id === trainingVideos[0].id
    ) {
      addCompletedStep("user-registration");
      currentStepIndex = 3;
    } else if (
      currentStep.id === "user-permissions" &&
      completedTraining.id === trainingVideos[1].id
    ) {
      addCompletedStep("user-permissions");
      currentStepIndex = 4;
    } else if (currentStep.id === "training-library") {
      addCompletedStep("training-library");
      showCompletion = true;
    }

    activeTraining = null;
    persistProgress();
    void focusCurrentContent();
  }
</script>

<section id="onboarding-journey" class="relative h-[100dvh] overflow-hidden bg-[#F5F6FB] text-[#010D28]">
  <div
    class="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_18%_15%,rgba(234,109,11,0.12),transparent_28%),radial-gradient(circle_at_85%_82%,rgba(0,10,87,0.1),transparent_30%)]"
    aria-hidden="true"
  ></div>

  {#if !hasStarted}
    <div class="relative flex h-full items-center justify-center overflow-y-auto px-4 py-6 sm:px-6">
      <section
        class="w-full max-w-2xl rounded-[28px] border border-white/80 bg-white/95 px-5 py-7 text-center shadow-[0_28px_90px_rgba(1,13,40,0.15)] backdrop-blur sm:px-10 sm:py-10"
        aria-labelledby="welcome-title"
      >
        <img src="/logo_f10.svg" alt="F10 Software" class="mx-auto h-9 w-auto sm:h-11" />

        <p class="mx-auto mt-6 inline-flex items-center gap-2 rounded-full bg-[#FFF3E9] px-4 py-2 text-[11px] font-bold uppercase tracking-[0.14em] text-[#C95717]">
          <Sparkles size={15} aria-hidden="true" />
          Introdução ao F10
        </p>

        <h1
          id="welcome-title"
          class="mx-auto mt-4 max-w-xl text-[31px] font-semibold leading-[1.08] tracking-[-0.04em] text-[#010D28] sm:text-[43px]"
        >
          Vamos preparar seu primeiro acesso, passo a passo
        </h1>

        <p class="mx-auto mt-4 max-w-lg text-[14px] leading-[1.7] text-[#5F6475] sm:text-[16px]">
          Você não precisa aprender tudo agora. Mostraremos somente uma ação por vez e salvaremos seu progresso neste navegador.
        </p>

        <div class="mx-auto mt-6 flex max-w-md items-center justify-center gap-3 rounded-2xl bg-[#F6F7FB] px-4 py-3 text-left ring-1 ring-[#E3E6F0]">
          <CheckCircle2 class="min-w-5 text-emerald-600" size={20} aria-hidden="true" />
          <p class="text-[12px] font-semibold leading-relaxed text-[#41475A] sm:text-[13px]">
            Instalar, entrar, configurar sua equipe e escolher o primeiro treinamento.
          </p>
        </div>

        <button
          type="button"
          class="welcome-action mt-7 inline-flex min-h-14 w-full items-center justify-center gap-2 rounded-full bg-[#EA6D0B] px-7 py-3.5 text-[16px] font-semibold text-white shadow-[0_18px_42px_rgba(234,109,11,0.35)] transition hover:brightness-105 focus:outline-none focus:ring-2 focus:ring-[#EA6D0B]/45 focus:ring-offset-2 sm:w-auto"
          on:click={startExperience}
        >
          {hasSavedProgress ? "Continuar de onde parei" : "Começar meus primeiros passos"}
          <ArrowRight size={19} aria-hidden="true" />
        </button>

        {#if hasSavedProgress}
          <button
            type="button"
            class="mx-auto mt-4 flex min-h-10 items-center justify-center gap-2 rounded-full px-4 py-2 text-[12px] font-semibold text-[#5F6475] transition hover:bg-[#F4F5F9] hover:text-[#000A57] focus:outline-none focus:ring-2 focus:ring-[#000A57]/20"
            on:click={restartExperience}
          >
            <RotateCcw size={15} aria-hidden="true" />
            Recomeçar desde a primeira etapa
          </button>
        {/if}
      </section>
    </div>
  {:else}
    <div class="relative flex h-full flex-col overflow-hidden">
      <header class="shrink-0 border-b border-[#E4E7F1] bg-white/95 px-4 py-3 backdrop-blur sm:px-6">
        <div class="mx-auto flex max-w-7xl items-center justify-between gap-4">
          <div class="flex min-w-0 items-center gap-3">
            <img src="/logo_f10.svg" alt="F10 Software" class="h-7 w-auto sm:h-8" />
            <span class="h-7 w-px bg-[#DFE3ED]" aria-hidden="true"></span>
            <div class="min-w-0">
              <p class="text-[10px] font-bold uppercase tracking-[0.13em] text-[#EA6D0B]">
                Etapa {currentStepIndex + 1} de {journeySteps.length}
              </p>
              <p class="truncate text-[12px] font-semibold text-[#010D28] sm:text-[14px]">
                {currentStep.shortTitle}
              </p>
              <p class="hidden truncate text-[11px] text-[#777C8C] md:block">
                {currentStep.objective}
              </p>
            </div>
          </div>

          <button
            type="button"
            class="inline-flex min-h-10 items-center justify-center gap-2 rounded-full px-3 py-2 text-[12px] font-semibold text-[#5F6475] transition hover:bg-[#F4F5F9] hover:text-[#000A57] focus:outline-none focus:ring-2 focus:ring-[#000A57]/20 sm:px-4"
            on:click={returnToIntroduction}
          >
            <span class="hidden sm:inline">Pausar e sair</span>
            <X size={18} aria-hidden="true" />
          </button>
        </div>
      </header>

      <div class="shrink-0 border-b border-[#E7E9F1] bg-white/75 px-4 py-2.5 sm:px-6">
        <div class="mx-auto flex max-w-7xl items-center gap-4">
          <ol class="flex flex-1 items-center gap-1.5" aria-label="Progresso dos primeiros passos">
            {#each journeySteps as step, index}
              <li class="flex flex-1 items-center gap-1.5">
                <span
                  class={`inline-flex h-6 min-w-6 items-center justify-center rounded-full text-[10px] font-bold transition ${completedStepIds.includes(step.id) ? "bg-emerald-600 text-white" : currentStepIndex === index ? "bg-[#EA6D0B] text-white" : "bg-[#E7E9F1] text-[#000A57]/55"}`}
                  aria-current={currentStepIndex === index ? "step" : undefined}
                >
                  {#if completedStepIds.includes(step.id)}
                    <Check size={13} aria-hidden="true" />
                  {:else}
                    {index + 1}
                  {/if}
                  <span class="sr-only">{step.shortTitle}</span>
                </span>
                {#if index < journeySteps.length - 1}
                  <span class={`h-1 flex-1 rounded-full ${completedStepIds.includes(step.id) ? "bg-emerald-500" : "bg-[#E7E9F1]"}`} aria-hidden="true"></span>
                {/if}
              </li>
            {/each}
          </ol>

          <span class="hidden min-w-fit text-[11px] font-semibold text-[#5F6475] md:inline">
            {completedStepCount} de {journeySteps.length} concluídas
          </span>
        </div>
      </div>

      <main
        bind:this={contentElement}
        class="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-4 focus:outline-none sm:px-6 sm:py-5 lg:py-6"
        tabindex="-1"
        aria-live="polite"
      >
        <div class="mx-auto flex min-h-full w-full items-center py-1">
          {#if showCompletion}
            <section class="mx-auto w-full max-w-3xl text-center" aria-labelledby="completion-title">
              <span class="inline-flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 text-emerald-700 ring-8 ring-emerald-50">
                <Check size={30} strokeWidth={3} aria-hidden="true" />
              </span>
              <p class="mt-6 text-[11px] font-bold uppercase tracking-[0.18em] text-emerald-700">
                Trilha concluída
              </p>
              <h1
                id="completion-title"
                class="mt-2 text-[30px] font-semibold leading-tight tracking-[-0.04em] text-[#010D28] sm:text-[42px]"
              >
                Você concluiu seus primeiros passos no F10
              </h1>
              <p class="mx-auto mt-4 max-w-xl text-[14px] leading-[1.7] text-[#5F6475] sm:text-[16px]">
                Agora você já sabe acessar o sistema, organizar os usuários e encontrar treinamentos para cada rotina.
              </p>

              <div class="mx-auto mt-7 grid max-w-xl gap-3 sm:grid-cols-2">
                <button
                  type="button"
                  class="inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-[#000A57] px-6 py-3 text-[14px] font-semibold text-white transition hover:bg-[#111B71] focus:outline-none focus:ring-2 focus:ring-[#000A57]/40"
                  on:click={() => (showCompletion = false)}
                >
                  Escolher outro treinamento
                  <ArrowRight size={18} aria-hidden="true" />
                </button>
                <a
                  href="https://f10.movidesk.com/kb"
                  target="_blank"
                  rel="noopener noreferrer"
                  class="inline-flex min-h-12 items-center justify-center gap-2 rounded-full border border-[#DDE1EC] bg-white px-6 py-3 text-[14px] font-semibold text-[#000A57] transition hover:bg-[#F8F9FC] focus:outline-none focus:ring-2 focus:ring-[#000A57]/20"
                >
                  <LifeBuoy size={18} aria-hidden="true" />
                  Abrir Central de Ajuda
                </a>
              </div>
            </section>
          {:else}
            {#key currentStep.id}
              <div class="step-transition w-full">
                {#if currentStep.id === "installation"}
                  <InstallationStep />
                {:else if currentStep.id === "first-access"}
                  <FirstAccessStep />
                {:else if currentStep.id === "user-registration"}
                  <EssentialTrainingStep
                    training={trainingVideos[0]}
                    variant="users"
                    title="Cadastre as pessoas da sua equipe"
                    description="Neste vídeo você verá onde criar usuários e funcionários. Assista com calma e repita os passos no F10."
                    isCompleted={completedTrainingIds.includes(trainingVideos[0].id)}
                    onWatch={() => openTraining(trainingVideos[0])}
                  />
                {:else if currentStep.id === "user-permissions"}
                  <EssentialTrainingStep
                    training={trainingVideos[1]}
                    variant="permissions"
                    title="Proteja e organize os acessos"
                    description="Aprenda a escolher quais menus e informações cada pessoa da equipe poderá acessar."
                    isCompleted={completedTrainingIds.includes(trainingVideos[1].id)}
                    onWatch={() => openTraining(trainingVideos[1])}
                  />
                {:else}
                  <TrainingLibrary
                    {selectedTrainingId}
                    {completedTrainingIds}
                    onSelect={openTraining}
                  />
                {/if}
              </div>
            {/key}
          {/if}
        </div>
      </main>

      {#if !showCompletion}
        <footer class="shrink-0 border-t border-[#E1E4ED] bg-white/95 px-4 py-3 backdrop-blur sm:px-6">
          <div class="mx-auto flex max-w-7xl items-center justify-between gap-3">
            <button
              type="button"
              class="inline-flex min-h-11 items-center justify-center gap-2 rounded-full border border-[#DDE1EC] bg-white px-4 py-2.5 text-[13px] font-semibold text-[#000A57] transition hover:bg-[#F6F7FA] focus:outline-none focus:ring-2 focus:ring-[#000A57]/20 sm:px-5"
              on:click={goBack}
            >
              <ArrowLeft size={17} aria-hidden="true" />
              <span>{currentStepIndex === 0 ? "Introdução" : "Voltar"}</span>
            </button>

            {#if primaryActionLabel}
              <button
                type="button"
                class="inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-[#000A57] px-5 py-2.5 text-[13px] font-semibold text-white shadow-[0_10px_25px_rgba(0,10,87,0.2)] transition hover:bg-[#111B71] focus:outline-none focus:ring-2 focus:ring-[#000A57]/40 sm:px-6 sm:text-[14px]"
                on:click={handlePrimaryAction}
              >
                {primaryActionLabel}
                <ArrowRight size={17} aria-hidden="true" />
              </button>
            {:else}
              <p class="hidden text-right text-[12px] font-semibold text-[#5F6475] sm:block">
                Escolha uma área e depois um vídeo para concluir.
              </p>
            {/if}
          </div>
        </footer>
      {/if}
    </div>
  {/if}
</section>

<TrainingVideoDialog
  training={activeTraining}
  isOpen={activeTraining !== null}
  isCompleted={activeTrainingIsCompleted}
  completeActionLabel={currentStep?.id === "training-library" ? "Concluir treinamento" : "Concluir e continuar"}
  onClose={closeTraining}
  onComplete={completeActiveTraining}
/>

<style>
  .welcome-action {
    animation: onboarding-float 2.8s ease-in-out infinite;
  }

  .step-transition {
    animation: step-enter 240ms ease-out;
  }

  @keyframes onboarding-float {
    0%, 100% {
      transform: translateY(0);
    }
    50% {
      transform: translateY(-6px);
    }
  }

  @keyframes step-enter {
    from {
      opacity: 0;
      transform: translateX(12px);
    }
    to {
      opacity: 1;
      transform: translateX(0);
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .welcome-action,
    .step-transition {
      animation: none;
    }
  }
</style>
