<script lang="ts">
  import { Check, ChevronRight, CircleAlert, GraduationCap, HelpCircle, Play, RotateCcw, X } from "lucide-svelte";
  import type { ActionData, PageData } from "./$types";

  export let data: PageData;
  export let form: ActionData;

  let failureOpen = false;
  let retryMode = false;

  $: currentStep = data.state?.currentStep ?? null;
  $: progress = data.state?.progress ?? null;
  $: recoveryReason = currentStep && progress?.failureReasonKey
    ? currentStep.failureReasons.find((reason) => reason.key === progress?.failureReasonKey) ?? null
    : null;
  $: showRecovery = Boolean(data.failureReported && recoveryReason && !retryMode);

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
</script>

<svelte:head>
  <title>{data.landing.title} | F10</title>
  <meta name="robots" content="index,follow" />
</svelte:head>

<div class="min-h-[100dvh] bg-[#F5F6FA] px-4 py-6 text-[#010D28] sm:px-6 sm:py-10">
  <div class="mx-auto max-w-[860px]">
    <header class="flex items-center justify-between gap-4">
      <div class="flex items-center gap-3">
        <span class="flex h-10 w-10 items-center justify-center rounded-xl bg-[#000A57] text-sm font-bold text-white">F10</span>
        <div><strong class="block text-[14px] font-semibold">Aprender fazendo</strong><span class="text-[10px] text-[#858A98]">uma ação curta por vez</span></div>
      </div>
      {#if data.state}<form method="POST" action="?/restart"><button type="submit" class="rounded-xl px-3 py-2 text-[10px] font-semibold text-[#777D8D] hover:bg-white">Recomeçar</button></form>{/if}
    </header>

    {#if !data.state}
      <section class="mt-12 overflow-hidden rounded-[28px] border border-[#E2E5ED] bg-white shadow-[0_18px_60px_rgba(1,13,40,0.06)]">
        <div class="bg-[#000A57] px-7 py-8 text-white sm:px-10">
          <p class="text-[10px] font-bold uppercase tracking-[0.12em] text-[#FFB475]">Trilha F10</p>
          <h1 class="mt-3 text-[28px] font-semibold tracking-[-0.03em] sm:text-[34px]">{data.landing.title}</h1>
          {#if data.landing.audience}<p class="mt-2 text-[11px] text-white/65">{data.landing.audience}</p>{/if}
        </div>
        <div class="p-7 sm:p-10">
          <p class="max-w-[650px] text-[12px] leading-6 text-[#6F7585]">{data.landing.welcomeMessage || "Você verá somente o que precisa fazer agora. Quando terminar, seguimos para a próxima orientação."}</p>
          {#if form?.message}<p class="mt-4 rounded-xl bg-[#FFF5F5] px-4 py-3 text-[10px] text-[#9B2C2C]">{form.message}</p>{/if}
          <form method="POST" action="?/start" class="mt-7"><button type="submit" class="inline-flex min-h-12 items-center gap-2 rounded-xl bg-[#EA6D0B] px-6 text-[12px] font-semibold text-white">Começar<ChevronRight size={16}/></button></form>
        </div>
      </section>
    {:else if data.state.completed}
      <section class="mt-12 rounded-[28px] border border-[#CFE9D7] bg-white p-7 text-center shadow-[0_18px_60px_rgba(1,13,40,0.06)] sm:p-10">
        <span class="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[#EEF8F1] text-[#2F7045]"><Check size={28}/></span>
        <p class="mt-5 text-[10px] font-bold uppercase tracking-[0.12em] text-[#2F7045]">Concluído</p>
        <h1 class="mt-2 text-[28px] font-semibold tracking-[-0.03em]">Você concluiu esta trilha.</h1>
        <p class="mx-auto mt-3 max-w-[560px] text-[12px] leading-6 text-[#747A8A]">Quando precisar, você pode acessar novamente pelo mesmo endereço.</p>
      </section>
    {:else if currentStep}
      <section class="mt-8 overflow-hidden rounded-[28px] border border-[#E2E5ED] bg-white shadow-[0_18px_60px_rgba(1,13,40,0.06)]">
        <div class="border-b border-[#EEF0F5] px-6 py-6 sm:px-8">
          <p class="text-[9px] font-bold uppercase tracking-[0.12em] text-[#EA6D0B]">Agora</p>
          <h1 class="mt-2 text-[24px] font-semibold tracking-[-0.03em] text-[#11182C] sm:text-[30px]">{currentStep.title}</h1>
        </div>
        <div class="p-6 sm:p-8">
          {#if data.successMessage}
            <div class="mb-5 flex items-start gap-3 rounded-2xl border border-[#B9E6C9] bg-[#F1FBF4] px-4 py-3"><Check size={17} class="mt-0.5 shrink-0 text-[#2F7045]"/><span class="text-[10px] leading-5 text-[#397B4F]">{data.successMessage}</span></div>
          {/if}
          {#if form?.message}<div class="mb-5 flex items-start gap-3 rounded-2xl border border-[#F0C8C8] bg-[#FFF5F5] px-4 py-3 text-[10px] text-[#9B2C2C]"><CircleAlert size={16}/>{form.message}</div>{/if}

          {#if showRecovery && recoveryReason}
            <div class="rounded-2xl border border-[#F1D7BD] bg-[#FFF9F3] p-5">
              <div class="flex items-start gap-3"><HelpCircle size={18} class="mt-0.5 shrink-0 text-[#EA6D0B]"/><div><strong class="block text-[12px] text-[#7A3B08]">{recoveryReason.label}</strong><p class="mt-2 text-[11px] leading-6 text-[#91603A]">{recoveryReason.recoveryMessage}</p></div></div>
              <div class="mt-4 flex flex-wrap gap-2"><button type="button" on:click={() => (retryMode = true)} class="inline-flex min-h-10 items-center gap-2 rounded-xl bg-white px-4 text-[10px] font-semibold text-[#000A57] ring-1 ring-[#DDE1EA]"><RotateCcw size={13}/>Vou tentar de novo</button><a href="/ajuda-f10" class="inline-flex min-h-10 items-center gap-2 rounded-xl bg-[#000A57] px-4 text-[10px] font-semibold text-white">Falar com a equipe F10</a></div>
            </div>
          {:else}
            <p class="whitespace-pre-line text-[14px] leading-7 text-[#3E4555]">{currentStep.instruction}</p>

            {#if currentStep.images.length > 0}
              <div class="mt-6 space-y-4">{#each currentStep.images as image, imageIndex}<figure class="overflow-hidden rounded-2xl border border-[#E2E5ED] bg-[#FAFAFC] p-2"><img src={`/treinamento/assets/${image.assetId}`} alt={image.altText || `Demonstração ${imageIndex + 1}`} class="mx-auto max-h-[520px] w-auto rounded-xl object-contain"/>{#if image.altText}<figcaption class="px-2 pb-1 pt-2 text-center text-[9px] text-[#858A98]">{image.altText}</figcaption>{/if}</figure>{/each}</div>
            {/if}

            {#if currentStep.videoUrl}
              <details class="mt-6 rounded-2xl border border-[#D8DDF4] bg-[#F8F9FF] p-4">
                <summary class="flex cursor-pointer list-none items-center gap-2 text-[11px] font-semibold text-[#000A57]"><Play size={14}/>Ver demonstração rápida</summary>
                {#if videoAssetId}
                  <div class="mt-4 overflow-hidden rounded-xl bg-black"><video src={`/treinamento/assets/${videoAssetId}`} controls preload="metadata" playsinline class="aspect-video w-full">{#if currentStep.captionAssetId}<track kind="captions" srclang="pt-BR" label="Português" src={`/treinamento/assets/${currentStep.captionAssetId}`} default />{/if}</video></div>
                {:else if videoEmbed}
                  <div class="mt-4 overflow-hidden rounded-xl bg-black"><iframe src={videoEmbed} title="Demonstração rápida" class="aspect-video w-full" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe></div>
                {:else}
                  <a href={currentStep.videoUrl} target="_blank" rel="noopener noreferrer" class="mt-4 inline-flex text-[10px] font-semibold text-[#000A57]">Abrir demonstração</a>
                {/if}
              </details>
            {/if}

            {#if currentStep.interactionMode === "action" && currentStep.expectedResult}
              <div class="mt-6 rounded-2xl bg-[#F6F7FA] px-4 py-4"><p class="text-[9px] font-bold uppercase tracking-[0.1em] text-[#8B909D]">Quando terminar</p><p class="mt-2 text-[11px] leading-5 text-[#565D6D]">{currentStep.expectedResult}</p></div>
            {/if}

            {#if currentStep.interactionMode === "presentation"}
              <form method="POST" action="?/success" class="mt-7"><button type="submit" class="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#000A57] px-5 text-[11px] font-semibold text-white">Continuar<ChevronRight size={16}/></button></form>
            {:else}
              <div class="mt-7 grid gap-3 sm:grid-cols-2"><form method="POST" action="?/success"><button type="submit" class="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#2F7045] px-5 text-[11px] font-semibold text-white"><Check size={16}/>Consegui fazer</button></form><button type="button" on:click={() => (failureOpen = true)} class="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl border border-[#DDE1EA] bg-white px-5 text-[11px] font-semibold text-[#5D6474]"><HelpCircle size={16}/>Não consegui</button></div>
            {/if}
          {/if}
        </div>
      </section>
    {/if}
  </div>
</div>

{#if failureOpen && currentStep && currentStep.interactionMode === "action"}
  <div class="fixed inset-0 z-[100] flex items-end justify-center bg-[#010D28]/45 p-3 sm:items-center" role="presentation" on:click={(event) => { if (event.currentTarget === event.target) failureOpen = false; }}>
    <div class="w-full max-w-[560px] rounded-[24px] bg-white p-5 shadow-2xl sm:p-6" role="dialog" aria-modal="true" aria-labelledby="public-failure-title">
      <div class="flex items-start justify-between gap-3"><div><p class="text-[9px] font-bold uppercase tracking-[0.1em] text-[#EA6D0B]">Vamos entender</p><h2 id="public-failure-title" class="mt-1 text-[20px] font-semibold text-[#11182C]">O que impediu você?</h2></div><button type="button" on:click={() => (failureOpen = false)} class="flex h-9 w-9 items-center justify-center rounded-xl bg-[#F5F6F8] text-[#747A8A]" aria-label="Fechar"><X size={15}/></button></div>
      <form method="POST" action="?/failure" class="mt-5 space-y-3">
        {#each currentStep.failureReasons as reason}<label class="flex cursor-pointer items-start gap-3 rounded-xl border border-[#E2E5ED] p-3"><input type="radio" name="reasonKey" value={reason.key} required class="mt-0.5"/><span class="text-[11px] font-semibold text-[#424958]">{reason.label}</span></label>{/each}
        <label class="block"><span class="mb-1.5 block text-[9px] font-semibold text-[#616777]">Quer contar mais alguma coisa? <span class="font-normal text-[#969BA7]">(opcional)</span></span><textarea name="detail" rows="3" maxlength="4000" class="w-full rounded-xl border border-[#DDE1EA] px-3 py-2.5 text-[10px] leading-5"></textarea></label>
        <button type="submit" class="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-[#000A57] px-4 text-[10px] font-semibold text-white">Continuar<ChevronRight size={14}/></button>
      </form>
    </div>
  </div>
{/if}
