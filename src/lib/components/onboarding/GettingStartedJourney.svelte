<script lang="ts">
  import { browser } from "$app/environment";
  import { onMount } from "svelte";
  import { Check } from "lucide-svelte";
  import EssentialTrainingStep from "$lib/components/onboarding/EssentialTrainingStep.svelte";
  import FirstAccessStep from "$lib/components/onboarding/FirstAccessStep.svelte";
  import InstallationStep from "$lib/components/onboarding/InstallationStep.svelte";
  import TrainingLibrary from "$lib/components/onboarding/TrainingLibrary.svelte";
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
  };

  type StoredJourneyProgress = {
    currentStepId?: JourneyStepId;
    completedStepIds?: JourneyStepId[];
    completedTrainingIds?: string[];
    selectedTrainingId?: string | null;
  };

  const storageKey = "f10-getting-started-progress-v1";
  const journeySteps: JourneyStep[] = [
    { id: "installation", shortTitle: "Baixar o F10" },
    { id: "first-access", shortTitle: "Primeiro acesso" },
    { id: "user-registration", shortTitle: "Criar usuários" },
    { id: "user-permissions", shortTitle: "Dar direitos" },
    { id: "training-library", shortTitle: "Escolher rotina" },
  ];

  let currentStepIndex = 0;
  let completedStepIds: JourneyStepId[] = [];
  let completedTrainingIds: string[] = [];
  let selectedTrainingId: string | null = null;
  let journeyElement: HTMLElement;

  $: completedStepCount = journeySteps.filter((step) =>
    completedStepIds.includes(step.id),
  ).length;
  $: progressPercentage = Math.round(
    (completedStepCount / journeySteps.length) * 100,
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
    } catch {
      try {
        window.localStorage.removeItem(storageKey);
      } catch {
        return;
      }
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
    } catch {
      return;
    }
  }

  function scrollToJourney(): void {
    if (!browser) return;

    window.requestAnimationFrame(() => {
      journeyElement?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }

  function openStep(stepIndex: number): void {
    currentStepIndex = Math.min(
      Math.max(stepIndex, 0),
      journeySteps.length - 1,
    );
    persistProgress();
    scrollToJourney();
  }

  function addCompletedStep(stepId: JourneyStepId): void {
    if (completedStepIds.includes(stepId)) return;
    completedStepIds = [...completedStepIds, stepId];
  }

  function addCompletedTraining(trainingId: string): void {
    if (completedTrainingIds.includes(trainingId)) return;
    completedTrainingIds = [...completedTrainingIds, trainingId];
  }

  function completeStepAndContinue(stepIndex: number): void {
    const step = journeySteps[stepIndex];
    if (!step) return;

    addCompletedStep(step.id);

    if (step.id === "user-registration") {
      addCompletedTraining("user-registration");
    }

    if (step.id === "user-permissions") {
      addCompletedTraining("user-permissions");
    }

    currentStepIndex = Math.min(stepIndex + 1, journeySteps.length - 1);
    persistProgress();
    scrollToJourney();
  }

  function selectTraining(training: TrainingVideo): void {
    selectedTrainingId = training.id;
    persistProgress();
  }

  function completeTraining(training: TrainingVideo): void {
    addCompletedTraining(training.id);

    if (training.id === "user-registration") {
      addCompletedStep("user-registration");
    }

    if (training.id === "user-permissions") {
      addCompletedStep("user-permissions");
    }

    addCompletedStep("training-library");
    persistProgress();
  }
</script>

<section
  id="onboarding-journey"
  bind:this={journeyElement}
  class="scroll-mt-24 bg-[#F7F8FE] py-12 md:py-20"
>
  <div class="container">
    <div class="mx-auto max-w-6xl">
      <div class="rounded-[28px] border border-[#DFE3F2] bg-white p-5 shadow-[0_24px_70px_rgba(1,13,40,0.08)] sm:p-7 lg:p-9">
        <div class="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p class="text-[12px] font-bold uppercase tracking-[0.16em] text-[#EA6D0B]">
              Sua trilha de implantação
            </p>
            <h2 class="mt-3 text-[28px] font-semibold tracking-[-0.03em] text-[#010D28] sm:text-[34px]">
              Etapa {currentStepIndex + 1} de {journeySteps.length}
            </h2>
            <p class="mt-2 text-[15px] leading-relaxed text-[#5F6475]">
              Siga uma etapa por vez. Seu progresso fica salvo neste navegador.
            </p>
          </div>

          <div class="min-w-[220px] lg:text-right">
            <p class="text-[13px] font-semibold text-[#000A57]">
              {completedStepCount} de {journeySteps.length} etapas concluídas
            </p>
            <div
              class="mt-2 h-2 overflow-hidden rounded-full bg-[#E8EAF4]"
              role="progressbar"
              aria-label="Progresso da trilha"
              aria-valuemin="0"
              aria-valuemax="100"
              aria-valuenow={progressPercentage}
            >
              <div
                class="h-full rounded-full bg-[#EA6D0B] transition-[width] duration-500"
                style={`width: ${progressPercentage}%`}
              ></div>
            </div>
          </div>
        </div>

        <ol class="mt-7 grid gap-3 sm:grid-cols-2 lg:grid-cols-5" aria-label="Etapas da trilha">
          {#each journeySteps as step, index}
            <li>
              <button
                type="button"
                class={`flex min-h-[82px] w-full items-center gap-3 rounded-2xl border p-3 text-left transition focus:outline-none focus:ring-2 focus:ring-[#EA6D0B]/35 ${currentStepIndex === index ? "border-[#EA6D0B] bg-[#FFF7F0] shadow-sm" : "border-[#E4E7F1] bg-white hover:border-[#C9CDDC]"}`}
                on:click={() => openStep(index)}
                aria-current={currentStepIndex === index ? "step" : undefined}
              >
                <span
                  class={`inline-flex h-9 min-w-9 items-center justify-center rounded-full text-[13px] font-bold ${completedStepIds.includes(step.id) ? "bg-emerald-600 text-white" : currentStepIndex === index ? "bg-[#EA6D0B] text-white" : "bg-[#F0F2F8] text-[#000A57]"}`}
                >
                  {#if completedStepIds.includes(step.id)}
                    <Check size={18} aria-hidden="true" />
                  {:else}
                    {index + 1}
                  {/if}
                </span>
                <span class="text-[13px] font-semibold leading-snug text-[#010D28]">
                  {step.shortTitle}
                </span>
              </button>
            </li>
          {/each}
        </ol>
      </div>

      <div class="mt-6 rounded-[28px] border border-[#DFE3F2] bg-white p-5 shadow-[0_24px_70px_rgba(1,13,40,0.08)] sm:p-8 lg:p-10">
        <div hidden={currentStepIndex !== 0}>
          <InstallationStep onComplete={() => completeStepAndContinue(0)} />
        </div>

        <div hidden={currentStepIndex !== 1}>
          <FirstAccessStep
            onBack={() => openStep(0)}
            onComplete={() => completeStepAndContinue(1)}
          />
        </div>

        <div hidden={currentStepIndex !== 2}>
          <EssentialTrainingStep
            training={trainingVideos[0]}
            variant="users"
            title="Aprenda a criar usuários e funcionários"
            description="Assista ao vídeo com calma e repita os passos dentro do F10."
            isCompleted={completedTrainingIds.includes(trainingVideos[0].id)}
            isActive={currentStepIndex === 2}
            onBack={() => openStep(1)}
            onComplete={() => completeStepAndContinue(2)}
          />
        </div>

        <div hidden={currentStepIndex !== 3}>
          <EssentialTrainingStep
            training={trainingVideos[1]}
            variant="permissions"
            title="Defina o que cada usuário pode acessar"
            description="Os direitos de usuário ajudam a proteger as informações e organizar o trabalho da equipe."
            isCompleted={completedTrainingIds.includes(trainingVideos[1].id)}
            isActive={currentStepIndex === 3}
            onBack={() => openStep(2)}
            onComplete={() => completeStepAndContinue(3)}
          />
        </div>

        <div hidden={currentStepIndex !== 4}>
          <TrainingLibrary
            {selectedTrainingId}
            {completedTrainingIds}
            isActive={currentStepIndex === 4}
            onSelect={selectTraining}
            onComplete={completeTraining}
            onBack={() => openStep(3)}
          />
        </div>
      </div>
    </div>
  </div>
</section>
