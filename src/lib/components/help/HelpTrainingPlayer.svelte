<script lang="ts">
  import { enhance } from "$app/forms";
  import type { SubmitFunction } from "@sveltejs/kit";
  import {
    Check,
    ChevronLeft,
    ChevronRight,
    CircleAlert,
    HelpCircle,
    LoaderCircle,
    Play,
    RotateCcw,
    Send,
    X,
  } from "lucide-svelte";

  export type TrainingPlayerStep = {
    id: string;
    title: string;
    instruction: string;
    expectedResult: string;
    successMessage: string;
    interactionMode: "presentation" | "action";
    images: Array<{ assetId: string; altText: string }>;
    videoUrl: string | null;
    captionAssetId?: string | null;
  };

  export let mode: "preview" | "invite" | "public";
  export let trainingTitle: string;
  export let step: TrainingPlayerStep;
  export let assetBasePath: string;
  export let canGoBack = false;
  export let successMessage = "";
  export let failureReported = false;
  export let failureDetail = "";
  export let helpRequested = false;
  export let formMessage = "";
  export let successAction = "";
  export let backAction = "";
  export let failureAction = "";
  export let helpAction = "";
  export let helpHref = "";
  export let identityRequired = false;
  export let onAdvance: (() => void) | null = null;
  export let onBack: (() => void) | null = null;
  export let onFailure: ((detail: string) => void) | null = null;

  let imageIndex = 0;
  let videoOpen = false;
  let videoSeen = false;
  let failureOpen = false;
  let failureDismissed = false;
  let difficultyDetail = "";
  let reporterName = "";
  let reporterEmail = "";
  let isSubmitting = false;
  let trackedStepId = step.id;

  $: if (step.id !== trackedStepId) {
    trackedStepId = step.id;
    imageIndex = 0;
    videoOpen = false;
    videoSeen = false;
    failureOpen = false;
    failureDismissed = false;
    difficultyDetail = "";
  }

  $: currentImage = step.images[imageIndex] ?? null;
  $: showDifficultyConfirmation = failureReported && !failureDismissed;
  $: videoAssetId = trainingVideoAssetId(step.videoUrl);
  $: videoEmbedUrl = youtubeEmbedUrl(step.videoUrl);
  $: captionUrl = step.captionAssetId
    ? `${assetBasePath}/${step.captionAssetId}`
    : "/help-training-empty.vtt";

  const enhanceNavigation: SubmitFunction = () => {
    if (isSubmitting) return () => undefined;
    isSubmitting = true;
    return async ({ update }) => {
      try {
        await update({ reset: false, invalidateAll: true });
      } finally {
        isSubmitting = false;
      }
    };
  };

  const enhanceFailure: SubmitFunction = () => {
    if (isSubmitting) return () => undefined;
    isSubmitting = true;
    return async ({ update }) => {
      try {
        await update({ reset: false, invalidateAll: true });
        failureOpen = false;
      } finally {
        isSubmitting = false;
      }
    };
  };

  function trainingVideoAssetId(value: string | null): string | null {
    if (!value?.startsWith("asset:")) return null;
    const assetId = value.slice("asset:".length);
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(assetId)
      ? assetId
      : null;
  }

  function youtubeEmbedUrl(value: string | null): string | null {
    if (!value || value.startsWith("asset:")) return null;
    try {
      const url = new URL(value);
      let id = "";
      if (url.hostname === "youtu.be") id = url.pathname.slice(1).split("/")[0] ?? "";
      if (url.hostname.endsWith("youtube.com")) {
        if (url.pathname === "/watch") id = url.searchParams.get("v") ?? "";
        else if (url.pathname.startsWith("/shorts/") || url.pathname.startsWith("/embed/")) {
          id = url.pathname.split("/")[2] ?? "";
        }
      }
      return id ? `https://www.youtube-nocookie.com/embed/${encodeURIComponent(id)}` : null;
    } catch {
      return null;
    }
  }

  function showPreviousImage(): void {
    imageIndex = imageIndex <= 0 ? step.images.length - 1 : imageIndex - 1;
  }

  function showNextImage(): void {
    imageIndex = imageIndex + 1 >= step.images.length ? 0 : imageIndex + 1;
  }

  function openVideo(): void {
    videoSeen = true;
    videoOpen = true;
  }

  function submitPreviewFailure(): void {
    const detail = difficultyDetail.trim();
    if (detail.length < 3) return;
    onFailure?.(detail);
    failureOpen = false;
  }
</script>

<div class="fixed inset-0 z-[80] grid h-[100dvh] grid-rows-[58px_minmax(0,1fr)_76px] overflow-hidden bg-white text-[#010D28] sm:grid-rows-[64px_minmax(0,1fr)_82px]">
  <header class="flex items-center justify-between border-b border-[#EEF0F5] px-4 sm:px-7">
    <div class="flex min-w-0 items-center gap-3">
      <span class="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#000A57] text-[10px] font-bold text-white sm:h-9 sm:w-9">F10</span>
      <div class="min-w-0">
        <strong class="block truncate text-[11px] font-semibold text-[#242B3D] sm:text-[12px]">{trainingTitle}</strong>
        <span class="block text-[9px] text-[#969BA7]">uma orientação por vez</span>
      </div>
    </div>
    {#if mode === "preview"}<span class="rounded-full bg-[#FFF4E9] px-2.5 py-1 text-[8px] font-bold uppercase tracking-[0.08em] text-[#B85408]">Prévia</span>{/if}
  </header>

  <main class="relative min-h-0 overflow-hidden">
    {#key step.id}
      <div class="training-step-enter mx-auto grid h-full w-full max-w-[1500px] grid-rows-[minmax(0,1fr)_auto] px-3 sm:px-6 lg:px-10">
        <section class="relative flex min-h-0 items-center justify-center overflow-hidden py-3 sm:py-4">
          {#if currentImage}
            <figure class="relative flex h-full w-full items-center justify-center overflow-hidden rounded-2xl bg-[#F7F8FB] sm:rounded-[24px]">
              <img
                src={`${assetBasePath}/${currentImage.assetId}`}
                alt={currentImage.altText || "Demonstração da ação"}
                class="h-full max-h-full w-full object-contain"
              />
              {#if step.images.length > 1}
                <button type="button" on:click={showPreviousImage} class="training-icon-action absolute left-3 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-white/95 text-[#000A57] shadow-lg" aria-label="Imagem anterior"><ChevronLeft size={18}/></button>
                <button type="button" on:click={showNextImage} class="training-icon-action absolute right-3 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-white/95 text-[#000A57] shadow-lg" aria-label="Próxima imagem"><ChevronRight size={18}/></button>
                <span class="absolute bottom-3 left-1/2 -translate-x-1/2 rounded-full bg-[#010D28]/70 px-2.5 py-1 text-[8px] font-semibold text-white">{imageIndex + 1} / {step.images.length}</span>
              {/if}
            </figure>
          {:else}
            <div class="flex h-full w-full items-center justify-center rounded-2xl bg-[radial-gradient(circle_at_center,#F7F8FB_0%,#FFFFFF_68%)] sm:rounded-[24px]">
              <div class="max-w-[720px] px-6 text-center"><span class="text-[10px] font-bold uppercase tracking-[0.12em] text-[#EA6D0B]">Agora</span><h1 class="mt-3 text-[26px] font-semibold tracking-[-0.03em] text-[#11182C] sm:text-[34px]">{step.title}</h1></div>
            </div>
          {/if}

          {#if step.videoUrl}
            <button type="button" on:click={openVideo} class:radar-unseen={!videoSeen} class="radar-button absolute right-5 top-5 flex h-11 w-11 items-center justify-center rounded-full bg-[#000A57] text-white shadow-[0_12px_30px_rgba(0,10,87,0.24)] sm:right-7 sm:top-7" aria-label="Ver demonstração rápida" title="Ver demonstração rápida"><Play size={17} fill="currentColor"/></button>
          {/if}
        </section>

        <section class="mx-auto max-h-[30dvh] w-full max-w-[1040px] overflow-y-auto px-1 pb-3 pt-2 sm:max-h-[27dvh] sm:px-4 sm:pb-4">
          {#if currentImage}<h1 class="text-[20px] font-semibold tracking-[-0.025em] text-[#11182C] sm:text-[24px]">{step.title}</h1>{/if}
          <p class="mt-2 whitespace-pre-line text-[12px] leading-6 text-[#4B5262] sm:text-[13px]">{step.instruction}</p>
          {#if step.interactionMode === "action" && step.expectedResult}
            <p class="mt-2 text-[10px] leading-5 text-[#7A8090]"><strong class="font-semibold text-[#545B6B]">Ao terminar:</strong> {step.expectedResult}</p>
          {/if}
          {#if successMessage}
            <div class="mt-3 flex items-start gap-2 rounded-xl bg-[#F1FBF4] px-3 py-2 text-[10px] leading-5 text-[#397B4F]" role="status"><Check size={14} class="mt-0.5 shrink-0"/>{successMessage}</div>
          {/if}
          {#if formMessage}
            <div class="mt-3 flex items-start gap-2 rounded-xl bg-[#FFF5F5] px-3 py-2 text-[10px] leading-5 text-[#9B2C2C]" role="alert"><CircleAlert size={14} class="mt-0.5 shrink-0"/>{formMessage}</div>
          {/if}
          {#if helpRequested}
            <div class="mt-3 flex items-start gap-2 rounded-xl bg-[#F8F9FF] px-3 py-2 text-[10px] leading-5 text-[#000A57]" role="status"><Send size={14} class="mt-0.5 shrink-0"/>A equipe recebeu o contexto desta ação. Você não precisa explicar tudo novamente.</div>
          {/if}
        </section>
      </div>
    {/key}

    {#if showDifficultyConfirmation}
      <div class="absolute inset-x-3 bottom-3 z-20 mx-auto max-w-[660px] rounded-2xl border border-[#F1D7BD] bg-white p-4 shadow-[0_18px_55px_rgba(1,13,40,0.16)] sm:bottom-5 sm:p-5" role="status" aria-live="polite">
        <div class="flex items-start gap-3"><HelpCircle size={18} class="mt-0.5 shrink-0 text-[#EA6D0B]"/><div class="min-w-0"><strong class="block text-[12px] text-[#5B3A1E]">Recebemos o que aconteceu.</strong><p class="mt-1 text-[10px] leading-5 text-[#7A6757]">Você pode tentar novamente nesta mesma orientação ou pedir ajuda com este contexto já registrado.</p></div></div>
        <div class="mt-3 flex flex-wrap gap-2">
          <button type="button" on:click={() => (failureDismissed = true)} class="training-action inline-flex min-h-9 items-center gap-2 rounded-xl border border-[#E2E5ED] bg-white px-3 text-[10px] font-semibold text-[#000A57]"><RotateCcw size={13}/>Tentar novamente</button>
          {#if helpAction}
            <form method="POST" action={helpAction} use:enhance={enhanceNavigation}><input type="hidden" name="detail" value={failureDetail}/><button type="submit" disabled={isSubmitting} class="training-action inline-flex min-h-9 items-center gap-2 rounded-xl bg-[#000A57] px-3 text-[10px] font-semibold text-white"><Send size={13}/>Falar com a equipe</button></form>
          {:else if helpHref}
            <a href={helpHref} class="training-action inline-flex min-h-9 items-center gap-2 rounded-xl bg-[#000A57] px-3 text-[10px] font-semibold text-white"><Send size={13}/>Falar com a equipe</a>
          {/if}
        </div>
      </div>
    {/if}
  </main>

  <footer class="grid grid-cols-[auto_1fr_auto] items-center gap-2 border-t border-[#E8EAF0] bg-white px-3 sm:gap-4 sm:px-7">
    {#if canGoBack}
      {#if mode === "preview"}
        <button type="button" on:click={() => onBack?.()} class="training-action inline-flex min-h-11 items-center gap-2 rounded-xl px-3 text-[10px] font-semibold text-[#5D6474] hover:bg-[#F6F7FA]"><ChevronLeft size={16}/><span class="hidden sm:inline">Voltar</span></button>
      {:else}
        <form method="POST" action={backAction} use:enhance={enhanceNavigation}><button type="submit" disabled={isSubmitting} class="training-action inline-flex min-h-11 items-center gap-2 rounded-xl px-3 text-[10px] font-semibold text-[#5D6474] hover:bg-[#F6F7FA]"><ChevronLeft size={16}/><span class="hidden sm:inline">Voltar</span></button></form>
      {/if}
    {:else}<span class="w-10"></span>{/if}

    <div class="flex justify-center">
      {#if step.interactionMode === "action"}
        <button type="button" on:click={() => (failureOpen = true)} disabled={isSubmitting} class="training-action inline-flex min-h-11 items-center gap-2 rounded-xl px-3 text-[10px] font-semibold text-[#747A8A] hover:bg-[#FFF7F0] hover:text-[#A64D08]"><HelpCircle size={15}/>Não consegui</button>
      {/if}
    </div>

    {#if mode === "preview"}
      <button type="button" on:click={() => onAdvance?.()} class="training-primary training-action inline-flex min-h-11 items-center gap-2 rounded-xl bg-[#000A57] px-4 text-[10px] font-semibold text-white sm:px-5 sm:text-[11px]">{step.interactionMode === "presentation" ? "Continuar" : "Entendi, próximo"}<ChevronRight size={16}/></button>
    {:else}
      <form method="POST" action={successAction} use:enhance={enhanceNavigation}><button type="submit" disabled={isSubmitting} class="training-primary training-action inline-flex min-h-11 items-center gap-2 rounded-xl bg-[#000A57] px-4 text-[10px] font-semibold text-white disabled:cursor-wait disabled:opacity-70 sm:px-5 sm:text-[11px]">{#if isSubmitting}<LoaderCircle size={15} class="animate-spin"/>{/if}{step.interactionMode === "presentation" ? "Continuar" : "Entendi, próximo"}<ChevronRight size={16}/></button></form>
    {/if}
  </footer>
</div>

{#if failureOpen && step.interactionMode === "action"}
  <div class="fixed inset-0 z-[120] flex items-end justify-center bg-[#010D28]/55 p-3 backdrop-blur-[2px] sm:items-center" role="presentation" on:click={(event) => { if (event.currentTarget === event.target && !isSubmitting) failureOpen = false; }}>
    <div class="w-full max-w-[560px] rounded-[24px] bg-white p-5 shadow-2xl sm:p-6" role="dialog" aria-modal="true" aria-labelledby="training-difficulty-title">
      <div class="flex items-start justify-between gap-3"><div><p class="text-[9px] font-bold uppercase tracking-[0.1em] text-[#EA6D0B]">Não consegui</p><h2 id="training-difficulty-title" class="mt-1 text-[20px] font-semibold text-[#11182C]">Conte o que aconteceu</h2><p class="mt-2 text-[10px] leading-5 text-[#7B8190]">Escreva com suas palavras. Isso fica ligado a esta orientação para podermos ajudar e melhorar o processo.</p></div><button type="button" on:click={() => (failureOpen = false)} disabled={isSubmitting} class="training-icon-action flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#F5F6F8] text-[#747A8A]" aria-label="Fechar"><X size={15}/></button></div>

      {#if mode === "preview"}
        <div class="mt-5 space-y-4">
          <label class="block"><span class="mb-1.5 block text-[10px] font-semibold text-[#555B6A]">O que impediu você?</span><textarea bind:value={difficultyDetail} rows="4" minlength="3" maxlength="4000" placeholder="Ex.: não encontrei o botão mostrado na imagem" class="w-full rounded-xl border border-[#DDE1EA] px-3 py-3 text-[11px] leading-5 outline-none focus:border-[#000A57]"></textarea></label>
          <button type="button" on:click={submitPreviewFailure} disabled={difficultyDetail.trim().length < 3} class="training-primary training-action inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-[#000A57] px-4 text-[11px] font-semibold text-white disabled:opacity-50">Registrar na prévia<ChevronRight size={14}/></button>
        </div>
      {:else}
        <form method="POST" action={failureAction} use:enhance={enhanceFailure} class="mt-5 space-y-4">
          <label class="block"><span class="mb-1.5 block text-[10px] font-semibold text-[#555B6A]">O que impediu você?</span><textarea name="detail" bind:value={difficultyDetail} required rows="4" minlength="3" maxlength="4000" placeholder="Ex.: não encontrei o botão mostrado na imagem" class="w-full rounded-xl border border-[#DDE1EA] px-3 py-3 text-[11px] leading-5 outline-none focus:border-[#000A57]"></textarea></label>
          {#if identityRequired}
            <div class="grid gap-3 sm:grid-cols-2">
              <label class="block"><span class="mb-1.5 block text-[10px] font-semibold text-[#555B6A]">Seu nome</span><input name="reporterName" bind:value={reporterName} required minlength="2" maxlength="160" autocomplete="name" class="h-11 w-full rounded-xl border border-[#DDE1EA] px-3 text-[11px] outline-none focus:border-[#000A57]"/></label>
              <label class="block"><span class="mb-1.5 block text-[10px] font-semibold text-[#555B6A]">E-mail para contato</span><input name="reporterEmail" bind:value={reporterEmail} required type="email" maxlength="320" autocomplete="email" class="h-11 w-full rounded-xl border border-[#DDE1EA] px-3 text-[11px] outline-none focus:border-[#000A57]"/></label>
            </div>
          {/if}
          <button type="submit" disabled={isSubmitting} class="training-primary training-action inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-[#000A57] px-4 text-[11px] font-semibold text-white disabled:cursor-wait disabled:opacity-60">{#if isSubmitting}<LoaderCircle size={15} class="animate-spin"/>Enviando...{:else}Registrar dificuldade<ChevronRight size={14}/>{/if}</button>
        </form>
      {/if}
    </div>
  </div>
{/if}

{#if videoOpen && step.videoUrl}
  <div class="fixed inset-0 z-[130] flex items-center justify-center bg-[#010D28]/90 p-3 sm:p-6" role="presentation" on:click={(event) => { if (event.currentTarget === event.target) videoOpen = false; }}>
    <div class="relative w-full max-w-[1100px] overflow-hidden rounded-[22px] bg-black shadow-2xl" role="dialog" aria-modal="true" aria-label="Demonstração rápida">
      <button type="button" on:click={() => (videoOpen = false)} class="training-icon-action absolute right-3 top-3 z-10 flex h-9 w-9 items-center justify-center rounded-full bg-black/65 text-white backdrop-blur" aria-label="Fechar demonstração"><X size={16}/></button>
      {#if videoAssetId}
        <video src={`${assetBasePath}/${videoAssetId}`} controls autoplay preload="metadata" playsinline class="max-h-[86dvh] w-full bg-black"><track kind="captions" srclang="pt-BR" label="Português" src={captionUrl} default /></video>
      {:else if videoEmbedUrl}
        <iframe src={videoEmbedUrl} title="Demonstração rápida" class="aspect-video max-h-[86dvh] w-full" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>
      {:else}
        <div class="flex min-h-[240px] items-center justify-center p-8"><a href={step.videoUrl} target="_blank" rel="noopener noreferrer" class="training-action inline-flex min-h-11 items-center gap-2 rounded-xl bg-white px-5 text-[11px] font-semibold text-[#000A57]"><Play size={15}/>Abrir demonstração</a></div>
      {/if}
    </div>
  </div>
{/if}

<style>
  .training-action {
    transition: transform 180ms ease, box-shadow 180ms ease, background-color 180ms ease, color 180ms ease, opacity 180ms ease;
  }

  .training-action:not(:disabled):hover,
  .training-icon-action:not(:disabled):hover {
    transform: translateY(-1px);
  }

  .training-action:not(:disabled):active,
  .training-icon-action:not(:disabled):active {
    transform: translateY(1px) scale(0.975);
  }

  .training-primary:not(:disabled):hover {
    box-shadow: 0 10px 24px rgba(0, 10, 87, 0.18);
  }

  .training-step-enter {
    animation: training-step-enter 220ms ease both;
  }

  .radar-button {
    transition: transform 180ms ease, box-shadow 180ms ease;
  }

  .radar-unseen::before,
  .radar-unseen::after {
    content: "";
    position: absolute;
    inset: -1px;
    border: 2px solid rgba(0, 10, 87, 0.28);
    border-radius: 9999px;
    animation: training-radar 2s ease-out infinite;
    pointer-events: none;
  }

  .radar-unseen::after {
    animation-delay: 1s;
  }

  @keyframes training-radar {
    0% { opacity: 0.65; transform: scale(0.9); }
    75%, 100% { opacity: 0; transform: scale(1.75); }
  }

  @keyframes training-step-enter {
    from { opacity: 0; transform: translateX(14px); }
    to { opacity: 1; transform: translateX(0); }
  }

  @media (prefers-reduced-motion: reduce) {
    .training-action,
    .training-icon-action,
    .radar-button,
    .training-step-enter {
      animation: none !important;
      transition: none !important;
    }
    .radar-unseen::before,
    .radar-unseen::after {
      animation: none !important;
      display: none;
    }
  }
</style>
