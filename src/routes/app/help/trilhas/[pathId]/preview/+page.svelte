<script lang="ts">
  import { Check, ChevronRight, HelpCircle, Play, RotateCcw, X } from "lucide-svelte";
  import type { PageData } from "./$types";

  export let data: PageData;

  let started = false;
  let stepIndex = 0;
  let failureOpen = false;
  let recoveryMessage = "";
  let successMessage = "";
  let completed = false;

  $: currentStep = data.preview.steps[stepIndex] ?? null;

  function trainingVideoAssetId(value: string | null): string | null {
    if (!value?.startsWith("asset:")) return null;
    const assetId = value.slice("asset:".length);
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(assetId) ? assetId : null;
  }

  function youtubeEmbedUrl(value: string | null): string | null {
    if (!value || value.startsWith("asset:")) return null;
    try {
      const url = new URL(value);
      let id = "";
      if (url.hostname === "youtu.be") id = url.pathname.slice(1).split("/")[0] ?? "";
      if (url.hostname.endsWith("youtube.com")) {
        if (url.pathname === "/watch") id = url.searchParams.get("v") ?? "";
        else if (url.pathname.startsWith("/shorts/") || url.pathname.startsWith("/embed/")) id = url.pathname.split("/")[2] ?? "";
      }
      return id ? `https://www.youtube-nocookie.com/embed/${encodeURIComponent(id)}` : null;
    } catch {
      return null;
    }
  }

  $: videoAssetId = trainingVideoAssetId(currentStep?.videoUrl ?? null);
  $: videoEmbed = youtubeEmbedUrl(currentStep?.videoUrl ?? null);

  function advance(): void {
    if (!currentStep) return;
    successMessage = currentStep.successMessage || (currentStep.interactionMode === "presentation" ? "Certo. Vamos continuar." : "Perfeito. Você concluiu esta ação.");
    recoveryMessage = "";
    failureOpen = false;
    if (stepIndex + 1 >= data.preview.steps.length) {
      completed = true;
      return;
    }
    stepIndex += 1;
  }

  function chooseFailure(reason: { recoveryMessage: string }): void {
    recoveryMessage = reason.recoveryMessage;
    failureOpen = false;
  }

  function restart(): void {
    started = false;
    stepIndex = 0;
    failureOpen = false;
    recoveryMessage = "";
    successMessage = "";
    completed = false;
  }
</script>

<svelte:head><title>Pré-visualização | {data.preview.title}</title></svelte:head>

<div class="min-h-[100dvh] bg-[#F5F6FA] px-4 py-6 text-[#010D28] sm:px-6 sm:py-10">
  <div class="mx-auto max-w-[860px]">
    <header class="flex items-center justify-between gap-4"><div class="flex items-center gap-3"><span class="flex h-10 w-10 items-center justify-center rounded-xl bg-[#000A57] text-sm font-bold text-white">F10</span><div><strong class="block text-[14px] font-semibold">Pré-visualização</strong><span class="text-[10px] text-[#858A98]">nenhum progresso ou dificuldade será registrado</span></div></div><button type="button" on:click={restart} class="rounded-xl px-3 py-2 text-[10px] font-semibold text-[#777D8D] hover:bg-white">Recomeçar</button></header>

    {#if !started}
      <section class="mt-12 overflow-hidden rounded-[28px] border border-[#E2E5ED] bg-white shadow-[0_18px_60px_rgba(1,13,40,0.06)]"><div class="bg-[#000A57] px-7 py-8 text-white sm:px-10"><p class="text-[10px] font-bold uppercase tracking-[0.12em] text-[#FFB475]">Pré-visualização da trilha</p><h1 class="mt-3 text-[28px] font-semibold tracking-[-0.03em] sm:text-[34px]">{data.preview.title}</h1>{#if data.preview.audience}<p class="mt-2 text-[11px] text-white/65">{data.preview.audience}</p>{/if}</div><div class="p-7 sm:p-10"><p class="max-w-[650px] text-[12px] leading-6 text-[#6F7585]">{data.preview.welcomeMessage || "Você verá somente a orientação necessária agora."}</p><button type="button" on:click={() => (started = true)} class="mt-7 inline-flex min-h-12 items-center gap-2 rounded-xl bg-[#EA6D0B] px-6 text-[12px] font-semibold text-white">Começar<ChevronRight size={16}/></button></div></section>
    {:else if completed}
      <section class="mt-12 rounded-[28px] border border-[#CFE9D7] bg-white p-7 text-center shadow-[0_18px_60px_rgba(1,13,40,0.06)] sm:p-10"><span class="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[#EEF8F1] text-[#2F7045]"><Check size={28}/></span><p class="mt-5 text-[10px] font-bold uppercase tracking-[0.12em] text-[#2F7045]">Fim da pré-visualização</p><h1 class="mt-2 text-[28px] font-semibold tracking-[-0.03em]">Experiência concluída.</h1></section>
    {:else if currentStep}
      <section class="mt-8 overflow-hidden rounded-[28px] border border-[#E2E5ED] bg-white shadow-[0_18px_60px_rgba(1,13,40,0.06)]"><div class="border-b border-[#EEF0F5] px-6 py-6 sm:px-8"><p class="text-[9px] font-bold uppercase tracking-[0.12em] text-[#EA6D0B]">Agora</p><h1 class="mt-2 text-[24px] font-semibold tracking-[-0.03em] text-[#11182C] sm:text-[30px]">{currentStep.title}</h1></div><div class="p-6 sm:p-8">
        {#if successMessage}<div class="mb-5 flex items-start gap-3 rounded-2xl border border-[#B9E6C9] bg-[#F1FBF4] px-4 py-3"><Check size={17} class="mt-0.5 shrink-0 text-[#2F7045]"/><span class="text-[10px] leading-5 text-[#397B4F]">{successMessage}</span></div>{/if}
        {#if recoveryMessage}<div class="rounded-2xl border border-[#F1D7BD] bg-[#FFF9F3] p-5"><div class="flex items-start gap-3"><HelpCircle size={18} class="mt-0.5 shrink-0 text-[#EA6D0B]"/><p class="text-[11px] leading-6 text-[#91603A]">{recoveryMessage}</p></div><button type="button" on:click={() => (recoveryMessage = "")} class="mt-4 inline-flex min-h-10 items-center gap-2 rounded-xl bg-white px-4 text-[10px] font-semibold text-[#000A57] ring-1 ring-[#DDE1EA]"><RotateCcw size={13}/>Vou tentar de novo</button></div>{:else}
          <p class="whitespace-pre-line text-[14px] leading-7 text-[#3E4555]">{currentStep.instruction}</p>
          {#if currentStep.images.length > 0}<div class="mt-6 space-y-4">{#each currentStep.images as image, imageIndex}<figure class="overflow-hidden rounded-2xl border border-[#E2E5ED] bg-[#FAFAFC] p-2"><img src={`/api/app/help/assets/${image.assetId}`} alt={image.altText || `Demonstração ${imageIndex + 1}`} class="mx-auto max-h-[520px] w-auto rounded-xl object-contain"/></figure>{/each}</div>{/if}
          {#if currentStep.videoUrl}
            <details class="mt-6 rounded-2xl border border-[#D8DDF4] bg-[#F8F9FF] p-4"><summary class="flex cursor-pointer list-none items-center gap-2 text-[11px] font-semibold text-[#000A57]"><Play size={14}/>Ver demonstração rápida</summary>
              {#if videoAssetId}<video src={`/api/app/help/assets/${videoAssetId}`} controls preload="metadata" playsinline class="mt-4 aspect-video w-full rounded-xl bg-black">{#if currentStep.captionAssetId}<track kind="captions" srclang="pt-BR" label="Português" src={`/api/app/help/assets/${currentStep.captionAssetId}`} default />{/if}</video>{:else if videoEmbed}<iframe src={videoEmbed} title="Demonstração rápida" class="mt-4 aspect-video w-full rounded-xl bg-black" allowfullscreen></iframe>{:else}<a href={currentStep.videoUrl} target="_blank" rel="noopener noreferrer" class="mt-4 inline-flex text-[10px] font-semibold text-[#000A57]">Abrir demonstração</a>{/if}
            </details>
          {/if}
          {#if currentStep.interactionMode === "action" && currentStep.expectedResult}<div class="mt-6 rounded-2xl bg-[#F6F7FA] px-4 py-4"><p class="text-[9px] font-bold uppercase tracking-[0.1em] text-[#8B909D]">Quando terminar</p><p class="mt-2 text-[11px] leading-5 text-[#565D6D]">{currentStep.expectedResult}</p></div>{/if}
          {#if currentStep.interactionMode === "presentation"}<button type="button" on:click={advance} class="mt-7 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#000A57] px-5 text-[11px] font-semibold text-white">Continuar<ChevronRight size={16}/></button>{:else}<div class="mt-7 grid gap-3 sm:grid-cols-2"><button type="button" on:click={advance} class="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#2F7045] px-5 text-[11px] font-semibold text-white"><Check size={16}/>Consegui fazer</button><button type="button" on:click={() => (failureOpen = true)} class="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl border border-[#DDE1EA] bg-white px-5 text-[11px] font-semibold text-[#5D6474]"><HelpCircle size={16}/>Não consegui</button></div>{/if}
        {/if}
      </div></section>
    {/if}
  </div>
</div>

{#if failureOpen && currentStep && currentStep.interactionMode === "action"}<div class="fixed inset-0 z-[100] flex items-end justify-center bg-[#010D28]/45 p-3 sm:items-center" role="presentation" on:click={(event) => { if (event.currentTarget === event.target) failureOpen = false; }}><div class="w-full max-w-[560px] rounded-[24px] bg-white p-5 shadow-2xl sm:p-6" role="dialog" aria-modal="true" aria-labelledby="preview-failure-title"><div class="flex items-start justify-between gap-3"><div><p class="text-[9px] font-bold uppercase tracking-[0.1em] text-[#EA6D0B]">Pré-visualização</p><h2 id="preview-failure-title" class="mt-1 text-[20px] font-semibold text-[#11182C]">O que impediu você?</h2></div><button type="button" on:click={() => (failureOpen = false)} class="flex h-9 w-9 items-center justify-center rounded-xl bg-[#F5F6F8] text-[#747A8A]" aria-label="Fechar"><X size={15}/></button></div><div class="mt-5 space-y-3">{#each currentStep.failureReasons as reason}<button type="button" on:click={() => chooseFailure(reason)} class="block w-full rounded-xl border border-[#E2E5ED] p-3 text-left text-[11px] font-semibold text-[#424958]">{reason.label}</button>{/each}</div></div></div>{/if}
