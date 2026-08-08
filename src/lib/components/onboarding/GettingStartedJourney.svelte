<script lang="ts">
  import { browser } from "$app/environment";
  import { onMount, tick } from "svelte";
  import {
    ArrowRight,
    Check,
    CheckCircle2,
    LifeBuoy,
    RotateCcw,
    Sparkles,
    X,
  } from "lucide-svelte";
  import DownloadStep from "$lib/components/onboarding/DownloadStep.svelte";
  import FinalAccessStep from "$lib/components/onboarding/FinalAccessStep.svelte";
  import FirstAccessStep from "$lib/components/onboarding/FirstAccessStep.svelte";
  import InstallationStep from "$lib/components/onboarding/InstallationStep.svelte";
  import PasswordSetupStep from "$lib/components/onboarding/PasswordSetupStep.svelte";
  import SupportChatDialog from "$lib/components/onboarding/SupportChatDialog.svelte";

  export let startAtFirstAccess = false;

  type JourneyStepId =
    | "download"
    | "installation"
    | "provisional-access"
    | "password-setup"
    | "final-access";

  type JourneyStep = {
    id: JourneyStepId;
    shortTitle: string;
    objective: string;
  };

  type StoredJourneyProgress = {
    currentStepId?: string;
    completedStepIds?: string[];
    downloadStarted?: boolean;
    isCompleted?: boolean;
  };

  const storageKey = "f10-getting-started-progress-v3";
  const legacyStorageKey = "f10-getting-started-progress-v2";
  const removedStepIds = new Set([
    "user-registration",
    "user-permissions",
    "training-library",
  ]);
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
  ];

  const firstAccessStepIndex = journeySteps.findIndex(
    (step) => step.id === "provisional-access",
  );
  const firstAccessCompletedSteps: JourneyStepId[] = [
    "download",
    "installation",
  ];

  let currentStepIndex = startAtFirstAccess ? firstAccessStepIndex : 0;
  let completedStepIds: JourneyStepId[] = startAtFirstAccess
    ? firstAccessCompletedSteps
    : [];
  let supportDialogOpen = false;
  let downloadStarted = false;
  let hasStarted = false;
  let hasSavedProgress = false;
  let showCompletion = false;
  let shouldResumeCompletion = false;
  let contentElement: HTMLElement;

  $: currentStep = journeySteps[currentStepIndex];
  $: completedStepCount = journeySteps.filter((step) =>
    completedStepIds.includes(step.id),
  ).length;

  onMount(() => {
    if (startAtFirstAccess) return;
    restoreProgress();
  });

  function restoreProgress(): void {
    if (!browser) return;

    try {
      const storedValue =
        window.localStorage.getItem(storageKey) ??
        window.localStorage.getItem(legacyStorageKey);
      if (!storedValue) return;

      const storedProgress = JSON.parse(storedValue) as StoredJourneyProgress;
      const knownStepIds = new Set(journeySteps.map((step) => step.id));

      completedStepIds = (storedProgress.completedStepIds ?? []).filter(
        (stepId): stepId is JourneyStepId => knownStepIds.has(stepId as JourneyStepId),
      );

      const storedStepIndex = journeySteps.findIndex(
        (step) => step.id === storedProgress.currentStepId,
      );

      if (storedStepIndex >= 0) {
        currentStepIndex = storedStepIndex;
      } else if (
        storedProgress.currentStepId &&
        removedStepIds.has(storedProgress.currentStepId)
      ) {
        currentStepIndex = journeySteps.length - 1;
        completedStepIds = journeySteps.map((step) => step.id);
        shouldResumeCompletion = true;
      }

      downloadStarted = storedProgress.downloadStarted === true;
      shouldResumeCompletion =
        shouldResumeCompletion || storedProgress.isCompleted === true;
      hasSavedProgress = true;
    } catch {
      window.localStorage.removeItem(storageKey);
      window.localStorage.removeItem(legacyStorageKey);
    }
  }

  function persistProgress(): void {
    if (!browser) return;

    const progress: StoredJourneyProgress = {
      currentStepId: journeySteps[currentStepIndex].id,
      completedStepIds,
      downloadStarted,
      isCompleted: showCompletion,
    };

    try {
      window.localStorage.setItem(storageKey, JSON.stringify(progress));
      window.localStorage.removeItem(legacyStorageKey);
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
    showCompletion = shouldResumeCompletion;
    persistProgress();
    void focusCurrentContent();
  }

  function restartExperience(): void {
    currentStepIndex = 0;
    completedStepIds = [];
    supportDialogOpen = false;
    downloadStarted = false;
    showCompletion = false;
    shouldResumeCompletion = false;
    hasStarted = true;

    if (browser) {
      window.localStorage.removeItem(storageKey);
      window.localStorage.removeItem(legacyStorageKey);
    }

    persistProgress();
    void focusCurrentContent();
  }

  function returnToIntroduction(): void {
    supportDialogOpen = false;
    showCompletion = false;
    hasStarted = false;
  }

  function addCompletedStep(stepId: JourneyStepId): void {
    if (completedStepIds.includes(stepId)) return;
    completedStepIds = [...completedStepIds, stepId];
  }

  function completeStepAndContinue(): void {
    addCompletedStep(currentStep.id);

    if (currentStepIndex === journeySteps.length - 1) {
      showCompletion = true;
      shouldResumeCompletion = true;
      persistProgress();
      void focusCurrentContent();
      return;
    }

    currentStepIndex += 1;
    persistProgress();
    void focusCurrentContent();
  }

  function markDownloadStarted(): void {
    downloadStarted = true;
    persistProgress();
  }

  function skipToFirstAccess(): void {
    completedStepIds = Array.from(
      new Set([...completedStepIds, ...firstAccessCompletedSteps]),
    );
    currentStepIndex = firstAccessStepIndex;
    showCompletion = false;
    shouldResumeCompletion = false;
    persistProgress();
    void focusCurrentContent();
  }

  function openSupportDialog(): void {
    supportDialogOpen = true;
  }

  function closeSupportDialog(): void {
    supportDialogOpen = false;
  }
</script>

<section
  id="onboarding-journey"
  class="relative h-[100dvh] overflow-hidden bg-[#F5F6FB] text-[#010D28]"
>
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
          {startAtFirstAccess ? "Primeiro acesso ao F10" : "Introdução ao F10"}
        </p>

        <h1
          id="welcome-title"
          class="mx-auto mt-4 max-w-xl text-[31px] font-semibold leading-[1.08] tracking-[-0.04em] text-[#010D28] sm:text-[43px]"
        >
          {startAtFirstAccess
            ? "Vamos fazer seu primeiro acesso, passo a passo"
            : "Vamos preparar seu primeiro acesso, passo a passo"}
        </h1>

        <p class="mx-auto mt-4 max-w-lg text-[14px] leading-[1.7] text-[#5F6475] sm:text-[16px]">
          {startAtFirstAccess
            ? "Você usará o login e a senha provisória recebidos por e-mail para criar sua nova senha."
            : "Mostraremos uma ação por vez: baixar, instalar, entrar com a senha provisória e criar sua senha definitiva."}
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
          {startAtFirstAccess
            ? "Começar primeiro acesso"
            : hasSavedProgress
              ? "Continuar de onde parei"
              : "Começar meus primeiros passos"}
          <ArrowRight size={19} aria-hidden="true" />
        </button>

        {#if hasSavedProgress && !startAtFirstAccess}
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
          <ol class="grid flex-1 grid-cols-5 gap-1.5" aria-label="Progresso dos primeiros passos">
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
                Primeiro acesso concluído
              </p>
              <h1
                id="completion-title"
                class="mt-2 text-[30px] font-semibold leading-tight tracking-[-0.04em] text-[#010D28] sm:text-[42px]"
              >
                Tudo pronto para usar o F10
              </h1>
              <p class="mx-auto mt-4 max-w-xl text-[14px] leading-[1.7] text-[#5F6475] sm:text-[16px]">
                Agora escolha na Ajuda F10 a rotina que deseja aprender.
              </p>

              <div class="mx-auto mt-7 grid max-w-xl gap-3 sm:grid-cols-2">
                <a
                  href="/ajuda-f10#treinamentos-f10"
                  class="inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-[#000A57] px-6 py-3 text-[14px] font-semibold text-white transition hover:bg-[#111B71] focus:outline-none focus:ring-2 focus:ring-[#000A57]/40"
                >
                  Acessar a Ajuda F10
                  <ArrowRight size={18} aria-hidden="true" />
                </a>
                <button
                  type="button"
                  class="inline-flex min-h-12 items-center justify-center gap-2 rounded-full border border-[#DDE1EC] bg-white px-6 py-3 text-[14px] font-semibold text-[#000A57] transition hover:bg-[#F8F9FC] focus:outline-none focus:ring-2 focus:ring-[#000A57]/20"
                  on:click={openSupportDialog}
                >
                  <LifeBuoy size={18} aria-hidden="true" />
                  Falar com o suporte
                </button>
              </div>
            </section>
          {:else}
            {#key currentStep.id}
              <div class="step-transition w-full">
                {#if currentStep.id === "download"}
                  <DownloadStep
                    {downloadStarted}
                    onDownloadStarted={markDownloadStarted}
                    onComplete={completeStepAndContinue}
                    onAlreadyInstalled={skipToFirstAccess}
                  />
                {:else if currentStep.id === "installation"}
                  <InstallationStep
                    onComplete={completeStepAndContinue}
                    onRequestSupport={openSupportDialog}
                  />
                {:else if currentStep.id === "provisional-access"}
                  <FirstAccessStep
                    onComplete={completeStepAndContinue}
                    onRequestSupport={openSupportDialog}
                  />
                {:else if currentStep.id === "password-setup"}
                  <PasswordSetupStep
                    onComplete={completeStepAndContinue}
                    onRequestSupport={openSupportDialog}
                  />
                {:else}
                  <FinalAccessStep
                    onComplete={completeStepAndContinue}
                    onRequestSupport={openSupportDialog}
                  />
                {/if}
              </div>
            {/key}
          {/if}
        </div>
      </main>
    </div>
  {/if}
</section>

<SupportChatDialog isOpen={supportDialogOpen} onClose={closeSupportDialog} />

<style>
  .welcome-action {
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
    .step-transition {
      animation: none;
    }
  }
</style>
