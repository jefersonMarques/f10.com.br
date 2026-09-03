<script lang="ts">
  import { Check, ChevronRight, RotateCcw } from "lucide-svelte";
  import HelpTrainingPlayer from "$lib/components/help/HelpTrainingPlayer.svelte";
  import HelpTrainingSourceContent from "$lib/components/help/HelpTrainingSourceContent.svelte";
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
    successMessage = currentStep.successMessage || "Etapa concluída.";
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

<HelpTrainingSourceContent sourceContent={data.preview.sourceContent} assetBasePath="/api/app/help/assets" />

{#if !started}
  <div class="fixed bottom-5 left-1/2 z-[120] w-[min(92vw,520px)] -translate-x-1/2 rounded-2xl border border-[#D8DDF4] bg-white px-5 py-4 text-center shadow-[0_18px_48px_rgba(1,13,40,0.18)]">
    <p class="text-[8px] font-bold uppercase tracking-[0.12em] text-[#EA6D0B]">Pré-visualização</p>
    <strong class="mt-1 block text-[12px] text-[#11182C]">{data.preview.title}</strong>
    <button type="button" on:click={start} class="mt-3 inline-flex min-h-10 items-center gap-2 rounded-full bg-[#EA6D0B] px-5 text-[9px] font-bold text-white">Começar trilha<ChevronRight size={13}/></button>
  </div>
{:else if completed}
  <div class="fixed bottom-5 left-1/2 z-[120] w-[min(92vw,500px)] -translate-x-1/2 rounded-2xl border border-[#CFE9D7] bg-white px-5 py-4 text-center shadow-[0_18px_48px_rgba(1,13,40,0.16)]">
    <span class="mx-auto flex h-8 w-8 items-center justify-center rounded-full bg-[#EEF8F1] text-[#2F7045]"><Check size={16}/></span>
    <strong class="mt-2 block text-[11px] text-[#234F32]">Fim da pré-visualização</strong>
    <button type="button" on:click={restart} class="mt-3 inline-flex min-h-9 items-center gap-2 rounded-full border border-[#DDE1EA] bg-white px-4 text-[8px] font-semibold text-[#000A57]"><RotateCcw size={11}/>Recomeçar</button>
  </div>
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
