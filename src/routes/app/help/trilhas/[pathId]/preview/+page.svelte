<script lang="ts">
  import { Check, ChevronRight, RotateCcw } from "lucide-svelte";
  import HelpTrainingCompletionFeedback from "$lib/components/help/HelpTrainingCompletionFeedback.svelte";
  import HelpTrainingJourney from "$lib/components/help/HelpTrainingJourney.svelte";
  import HelpTrainingPlayer from "$lib/components/help/HelpTrainingPlayer.svelte";
  import { requestTrainingPipWindow } from "$lib/help/trainingPipBridge";
  import type { PageData } from "./$types";

  export let data: PageData;

  let started = false;
  let inModule = false;
  let stepIndex = 0;
  let completed = false;
  let successMessage = "";

  $: currentStep = data.preview.steps[stepIndex] ?? null;
  $: previousStep = data.preview.steps[stepIndex - 1] ?? null;
  $: multiModule = data.preview.modules.length > 1;
  $: canGoBack = stepIndex > 0 && (!multiModule || previousStep?.pathItemId === currentStep?.pathItemId);
  $: journeyModules = data.preview.modules.map((module) => {
    const indexes = module.stepIds
      .map((stepId) => data.preview.steps.findIndex((step) => step.id === stepId))
      .filter((index) => index >= 0);
    const firstIndex = indexes.length ? Math.min(...indexes) : Number.MAX_SAFE_INTEGER;
    const lastIndex = indexes.length ? Math.max(...indexes) : -1;
    const status = completed || (lastIndex >= 0 && stepIndex > lastIndex)
      ? "completed"
      : stepIndex >= firstIndex && stepIndex <= lastIndex
        ? "current"
        : "pending";
    return {
      id: module.id,
      title: module.title,
      summary: module.summary,
      slug: module.slug,
      sortOrder: module.sortOrder,
      stepCount: indexes.length,
      estimatedSeconds: indexes.reduce(
        (sum, index) => sum + Math.max(0, data.preview.steps[index]?.estimatedSeconds ?? 45),
        0,
      ),
      status: status as "completed" | "current" | "pending",
    };
  });
  $: completedModules = journeyModules.filter((module) => module.status === "completed").length;
  $: percent = completed
    ? 100
    : Math.min(99, Math.max(0, Math.round((stepIndex / Math.max(1, data.preview.steps.length)) * 100)));

  function start(): void {
    started = true;
    if (!multiModule) {
      requestTrainingPipWindow();
      inModule = true;
    }
  }

  function openModule(): void {
    requestTrainingPipWindow();
    inModule = true;
    successMessage = "";
  }

  function advance(): void {
    if (!currentStep) return;
    successMessage = currentStep.successMessage || "Etapa confirmada.";
    if (stepIndex + 1 >= data.preview.steps.length) {
      completed = true;
      inModule = false;
      return;
    }

    const nextStep = data.preview.steps[stepIndex + 1];
    const crossedModule = multiModule && nextStep?.pathItemId !== currentStep.pathItemId;
    stepIndex += 1;
    if (crossedModule) {
      inModule = false;
      successMessage = "";
    }
  }

  function goBack(): void {
    if (!canGoBack) return;
    stepIndex -= 1;
    successMessage = "";
  }

  function restart(): void {
    started = false;
    inModule = false;
    stepIndex = 0;
    completed = false;
    successMessage = "";
  }
</script>

<svelte:head><title>Pré-visualização | {data.preview.title}</title></svelte:head>

{#if !started}
  <main class="flex min-h-[100dvh] items-center justify-center bg-white px-5 py-8 text-center text-[#010D28]">
    <section class="w-full max-w-[820px]">
      <span class="mx-auto flex h-11 w-11 items-center justify-center rounded-xl bg-[#000A57] text-[11px] font-bold text-white">F10</span>
      <p class="mt-8 text-[9px] font-bold uppercase tracking-[0.14em] text-[#EA6D0B]">Pré-visualização</p>
      <h1 class="mx-auto mt-3 max-w-[760px] text-[30px] font-semibold tracking-[-0.035em] text-[#11182C] sm:text-[42px]">{data.preview.title}</h1>
      {#if data.preview.audience}<p class="mt-3 text-[11px] text-[#858A98]">{data.preview.audience}</p>{/if}
      <p class="mx-auto mt-7 max-w-[620px] text-[13px] leading-7 text-[#656C7C]">
        {multiModule
          ? "A prévia começa pelo mapa da jornada. Cada módulo abre a orientação atual e retorna ao mapa ao ser concluído."
          : "A tela principal mantém a referência visual e a orientação abre em uma guia flutuante."}
      </p>
      <p class="mt-3 text-[9px] text-[#9A9EAA]">Nenhum progresso será registrado nesta prévia.</p>
      <button type="button" on:click={start} class="training-start mt-8 inline-flex min-h-12 items-center gap-2 rounded-xl bg-[#000A57] px-6 text-[11px] font-semibold text-white shadow-[0_12px_28px_rgba(0,10,87,0.16)]">Começar<ChevronRight size={16}/></button>
    </section>
  </main>
{:else if completed}
  <main class="flex min-h-[100dvh] items-center justify-center bg-white px-5 py-8 text-center text-[#010D28]">
    <section class="max-w-[680px]">
      <span class="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[#EEF8F1] text-[#2F7045]"><Check size={27}/></span>
      <p class="mt-6 text-[9px] font-bold uppercase tracking-[0.14em] text-[#2F7045]">Fim da pré-visualização</p>
      <h1 class="mt-3 text-[30px] font-semibold tracking-[-0.035em] text-[#11182C] sm:text-[40px]">Experiência concluída.</h1>
      <HelpTrainingCompletionFeedback mode="preview" sourceContentSlug={data.preview.sourceContent.slug} />
      <button type="button" on:click={restart} class="training-start mt-7 inline-flex min-h-11 items-center gap-2 rounded-xl border border-[#DDE1EA] bg-white px-5 text-[10px] font-semibold text-[#000A57]"><RotateCcw size={14}/>Recomeçar</button>
    </section>
  </main>
{:else if multiModule && !inModule}
  <HelpTrainingJourney
    trainingTitle={data.preview.title}
    welcomeMessage={data.preview.welcomeMessage}
    modules={journeyModules}
    completedModules={completedModules}
    totalModules={journeyModules.length}
    percent={percent}
    onOpen={openModule}
    preview={true}
  />
{:else if currentStep}
  <HelpTrainingPlayer
    mode="preview"
    trainingTitle={data.preview.title}
    sourceContentSlug={currentStep.sourceContentSlug}
    step={currentStep}
    assetBasePath="/api/app/help/assets"
    canGoBack={canGoBack}
    successMessage={successMessage}
    onAdvance={advance}
    onBack={goBack}
  />
{/if}

<style>
  .training-start {
    transition: transform 180ms ease, box-shadow 180ms ease;
  }
  .training-start:hover { transform: translateY(-1px); box-shadow: 0 14px 32px rgba(0, 10, 87, 0.18); }
  .training-start:active { transform: translateY(1px) scale(0.98); }
  @media (prefers-reduced-motion: reduce) {
    .training-start { transition: none; }
  }
</style>
