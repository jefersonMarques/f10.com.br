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
  import DownloadStep from "$lib/components/onboarding/DownloadStep.svelte";
  import EssentialTrainingStep from "$lib/components/onboarding/EssentialTrainingStep.svelte";
  import FinalAccessStep from "$lib/components/onboarding/FinalAccessStep.svelte";
  import FirstAccessStep from "$lib/components/onboarding/FirstAccessStep.svelte";
  import InstallationStep from "$lib/components/onboarding/InstallationStep.svelte";
  import PasswordSetupStep from "$lib/components/onboarding/PasswordSetupStep.svelte";
  import SupportChatDialog from "$lib/components/onboarding/SupportChatDialog.svelte";
  import TrainingLibrary from "$lib/components/onboarding/TrainingLibrary.svelte";
  import TrainingVideoDialog from "$lib/components/onboarding/TrainingVideoDialog.svelte";
  import TroubleshootingDialog from "$lib/components/onboarding/TroubleshootingDialog.svelte";
  import { troubleshootingGuides } from "$lib/onboarding/setupGuide";
  import {
    trainingVideos,
    type TrainingVideo,
  } from "$lib/onboarding/trainingCatalog";

  type JourneyStepId =
    | "download"
    | "installation"
    | "provisional-access"
    | "password-setup"
    | "final-access"
    | "user-registration"
    | "user-permissions"
    | "training-library";

  type TroubleshootingGuideId = keyof typeof troubleshootingGuides;

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
    downloadStarted?: boolean;
  };

  const storageKey = "f10-getting-started-progress-v2";
  const journeySteps: JourneyStep[] = [
    {
      id: "download",
      shortTitle: "Baixar o F10",
      objective: "Baixar o instalador em um computador com Windows.",
    },
    {
      id: "installation",
      shortTitle: "Instalar o F10",
      objective: "Abrir o instalador e concluir cada tela do assistente.",
    },
    {
      id: "provisional-access",
      shortTitle: "Acesso provisório",
      objective: "Entrar com o login e a senha recebidos por e-mail.",
    },
    {
      id: "password-setup",
      shortTitle: "Criar nova senha",
      objective: "Trocar a senha provisória por uma senha pessoal.",
    },
    {
      id: "final-access",
      shortTitle: "Entrar no F10",
      objective: "Fazer o segundo login utilizando a nova senha.",
    },
    {
      id: "user-registration",
      shortTitle: "Criar usuários",
      objective: "Cadastrar as pessoas que utilizarão o F10.",
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
  let activeTroubleshootingGuideId: TroubleshootingGuideId | null = null;
  let supportDialogOpen = false;
  let downloadStarted = false;
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
  $: currentTroubleshootingGuideId = getTroubleshootingGuideId(currentStep?.id);
  $: activeTroubleshootingGuide = activeTroubleshootingGuideId
    ? troubleshootingGuides[activeTroubleshootingGuideId]
    : null;
  $: primaryActionLabel = getPrimaryActionLabel(
    currentStep?.id,
    downloadStarted,
    currentEssentialTraining,
    completedTrainingIds,
  );

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

      downloadStarted = storedProgress.downloadStarted === true;
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
      downloadStarted,
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
    activeTroubleshootingGuideId = null;
    supportDialogOpen = false;
    downloadStarted = false;
    showCompletion = false;
    hasStarted = true;

    if (browser) window.localStorage.removeItem(storageKey);
    persistProgress();
    void focusCurrentContent();
  }

  function returnToIntroduction(): void {
    activeTraining = null;
    activeTroubleshootingGuideId = null;
    supportDialogOpen = false;
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

  function findStepIndex(stepId: JourneyStepId): number {
    return journeySteps.findIndex((step) => step.id === stepId);
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

  function markDownloadStarted(): void {
    downloadStarted = true;
    persistProgress();
  }

  function skipSetupAndOpenTraining(): void {
    const trainingStepIndex = findStepIndex("user-registration");
    const setupStepIds = journeySteps
      .slice(0, trainingStepIndex)
      .map((step) => step.id);

    completedStepIds = Array.from(
      new Set([...completedStepIds, ...setupStepIds]),
    );
    currentStepIndex = trainingStepIndex;
    showCompletion = false;
    persistProgress();
    void focusCurrentContent();
  }

  function getPrimaryActionLabel(
    stepId: JourneyStepId | undefined,
    hasDownloadStarted: boolean,
    essentialTraining: TrainingVideo | null,
    completedTraining: string[],
  ): string | null {
    if (!stepId) return null;

    if (stepId === "download") {
      return hasDownloadStarted ? "O arquivo apareceu — prosseguir" : null;
    }
    if (stepId === "installation") return "Concluí a instalação";
    if (stepId === "provisional-access") {
      return "A tela para criar senha apareceu";
    }
    if (stepId === "password-setup") return "Criei minha nova senha";
    if (stepId === "final-access") return "Consegui entrar no F10";

    if (essentialTraining) {
      return completedTraining.includes(essentialTraining.id)
        ? "Continuar"
        : "Assistir ao vídeo";
    }

    return null;
  }

  function handlePrimaryAction(): void {
    if (currentEssentialTraining) {
      if (completedTrainingIds.includes(currentEssentialTraining.id)) {
        completeStepAndContinue();
        return;
      }

      openTraining(currentEssentialTraining);
      return;
    }

    if (currentStep.id !== "training-library") completeStepAndContinue();
  }

  function getTroubleshootingGuideId(
    stepId: JourneyStepId | undefined,
  ): TroubleshootingGuideId | null {
    if (stepId === "download") return "download";
    if (stepId === "installation") return "installation";
    if (stepId === "provisional-access") return "provisionalAccess";
    if (stepId === "password-setup") return "passwordSetup";
    if (stepId === "final-access") return "finalAccess";
    return null;
  }

  function openTroubleshooting(): void {
    if (!currentTroubleshootingGuideId) return;
    activeTroubleshootingGuideId = currentTroubleshootingGuideId;
  }

  function closeTroubleshooting(): void {
    activeTroubleshootingGuideId = null;
  }

  function resolveTroubleshooting(): void {
    activeTroubleshootingGuideId = null;
    completeStepAndContinue();
  }

  function requestSupport(): void {
    activeTroubleshootingGuideId = null;

    if (!browser) return;
    window.setTimeout(openSupportDialog, 180);
  }

  function openSupportDialog(): void {
    supportDialogOpen = true;
  }

  function closeSupportDialog(): void {
    supportDialogOpen = false;
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
      currentStepIndex = findStepIndex("user-permissions");
    } else if (
      currentStep.id === "user-permissions" &&
      completedTraining.id === trainingVideos[1].id
    ) {
      addCompletedStep("user-permissions");
      currentStepIndex = findStepIndex("training-library");
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
          Mostraremos uma ação por vez: baixar, instalar, entrar com a senha provisória e criar sua senha definitiva.
        </p>

        <div class="mx-auto mt-6 flex max-w-md items-center justify-center gap-3 rounded-2xl bg-[#F6F7FB] px-4 py-3 text-left ring-1 ring-[#E3E6F0]">
          <CheckCircle2 class="min-w-5 text-emerald-600" size={20} aria-hidden="true" />
          <p class="text-[12px] font-semibold leading-relaxed text-[#41475A] sm:text-[13px]">
            Seu progresso ficará salvo neste navegador para você continuar quando quiser.
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
            <span class="h-8 w-px bg-[#DFE3ED]" aria-hidden="true"></span>
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
          <ol class="grid flex-1 grid-cols-8 gap-1.5" aria-label="Progresso dos primeiros passos">
            {#each journeySteps as step, index}
              <li>
                <span
                  class={`block h-2 rounded-full transition ${completedStepIds.includes(step.id) ? "bg-emerald-500" : currentStepIndex === index ? "bg-[#EA6D0B]" : "bg-[#DDE0E9]"}`}
                  aria-current={currentStepIndex === index ? "step" : undefined}
                >
                  <span class="sr-only">Etapa {index + 1}: {step.shortTitle}</span>
                </span>
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
                Agora você já sabe instalar, acessar, organizar os usuários e encontrar treinamentos para cada rotina.
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
                {#if currentStep.id === "download"}
                  <DownloadStep
                    {downloadStarted}
                    onDownloadStarted={markDownloadStarted}
                    onAlreadyInstalled={skipSetupAndOpenTraining}
                  />
                {:else if currentStep.id === "installation"}
                  <InstallationStep onComplete={completeStepAndContinue} />
                {:else if currentStep.id === "provisional-access"}
                  <FirstAccessStep onComplete={completeStepAndContinue} />
                {:else if currentStep.id === "password-setup"}
                  <PasswordSetupStep onComplete={completeStepAndContinue} />
                {:else if currentStep.id === "final-access"}
                  <FinalAccessStep onComplete={completeStepAndContinue} />
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
        <footer class="shrink-0 border-t border-[#D9DDE7] bg-white/98 px-4 py-3 shadow-[0_-12px_35px_rgba(1,13,40,0.08)] backdrop-blur sm:px-6">
          <div class="mx-auto grid max-w-7xl grid-cols-2 gap-2 sm:flex sm:items-center sm:justify-between sm:gap-3">
            <button
              type="button"
              class="order-2 inline-flex min-h-[52px] items-center justify-center gap-2 rounded-full border-2 border-[#000A57] bg-white px-4 py-3 text-[13px] font-semibold text-[#000A57] shadow-sm transition hover:bg-[#F3F4FA] focus:outline-none focus:ring-2 focus:ring-[#000A57]/25 sm:order-1 sm:min-w-[150px] sm:px-6 sm:text-[14px]"
              on:click={goBack}
            >
              <ArrowLeft size={18} aria-hidden="true" />
              <span>{currentStepIndex === 0 ? "Introdução" : "Voltar"}</span>
            </button>

            {#if currentTroubleshootingGuideId}
              <button
                type="button"
                class="order-3 inline-flex min-h-[52px] items-center justify-center gap-2 rounded-full border-2 border-[#EA6D0B] bg-[#FFF8F2] px-4 py-3 text-[13px] font-semibold text-[#C95717] transition hover:bg-[#FFF0E4] focus:outline-none focus:ring-2 focus:ring-[#EA6D0B]/30 sm:order-2 sm:min-w-[170px] sm:px-6 sm:text-[14px]"
                on:click={openTroubleshooting}
              >
                <LifeBuoy size={18} aria-hidden="true" />
                Preciso de ajuda
              </button>
            {/if}

            {#if primaryActionLabel}
              <button
                type="button"
                class="primary-navigation order-1 col-span-2 inline-flex min-h-14 items-center justify-center gap-2 rounded-full bg-[#EA6D0B] px-6 py-3.5 text-[15px] font-semibold text-white shadow-[0_14px_34px_rgba(234,109,11,0.34)] transition hover:brightness-105 focus:outline-none focus:ring-2 focus:ring-[#EA6D0B]/45 sm:order-3 sm:ml-auto sm:min-w-[260px] sm:px-8 sm:text-[16px]"
                on:click={handlePrimaryAction}
              >
                {primaryActionLabel}
                <ArrowRight size={19} aria-hidden="true" />
              </button>
            {:else if currentStep.id === "training-library"}
              <p class="order-1 col-span-2 hidden text-right text-[12px] font-semibold text-[#5F6475] sm:order-3 sm:ml-auto sm:block">
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

<TroubleshootingDialog
  guide={activeTroubleshootingGuide}
  guideId={activeTroubleshootingGuideId}
  isOpen={activeTroubleshootingGuideId !== null}
  onClose={closeTroubleshooting}
  onResolved={resolveTroubleshooting}
  onRequestSupport={requestSupport}
/>

<SupportChatDialog
  isOpen={supportDialogOpen}
  onClose={closeSupportDialog}
/>

<style>
  .welcome-action,
  .primary-navigation {
    animation: onboarding-float 2.8s ease-in-out infinite;
  }

  .step-transition {
    animation: step-enter 220ms ease-out;
  }

  @keyframes onboarding-float {
    0%, 100% {
      transform: translateY(0);
    }
    50% {
      transform: translateY(-5px);
    }
  }

  @keyframes step-enter {
    from {
      opacity: 0;
      transform: translateX(10px);
    }
    to {
      opacity: 1;
      transform: translateX(0);
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .welcome-action,
    .primary-navigation,
    .step-transition {
      animation: none;
    }
  }
</style>
