<script lang="ts">
  import { Check, ChevronRight, RotateCcw } from "lucide-svelte";
  import HelpTrainingPlayer from "$lib/components/help/HelpTrainingPlayer.svelte";
  import { requestTrainingPipWindow } from "$lib/help/trainingPipBridge";
  import type { PageData } from "./$types";

  export let data: PageData;

  let started = false;
  let stepIndex = 0;
  let completed = false;
  let successMessage = "";

  $: currentStep = data.preview.steps[stepIndex] ?? null;
  $: canGoBack = stepIndex > 0;

  function start(): void {
    requestTrainingPipWindow();
    started = true;
  }

  function advance(): void {
    if (!currentStep) return;
    successMessage = currentStep.successMessage || "Etapa confirmada.";
    if (stepIndex + 1 >= data.preview.steps.length) {
      completed = true;
      return;
    }
    stepIndex += 1;
  }

  function goBack(): void {
    if (stepIndex <= 0) return;
    stepIndex -= 1;
    successMessage = "";
  }

  function restart(): void {
    started = false;
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
      <p class="mx-auto mt-7 max-w-[620px] text-[13px] leading-7 text-[#656C7C]">A tela principal mantém a referência visual e a orientação abre em uma guia flutuante.</p>
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
      <button type="button" on:click={restart} class="training-start mt-7 inline-flex min-h-11 items-center gap-2 rounded-xl border border-[#DDE1EA] bg-white px-5 text-[10px] font-semibold text-[#000A57]"><RotateCcw size={14}/>Recomeçar</button>
    </section>
  </main>
{:else if currentStep}
  <HelpTrainingPlayer
    mode="preview"
    trainingTitle={data.preview.title}
    sourceContentSlug={data.preview.sourceContent.slug}
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
