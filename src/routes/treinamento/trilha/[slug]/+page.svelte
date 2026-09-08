<script lang="ts">
  import { enhance } from "$app/forms";
  import type { SubmitFunction } from "@sveltejs/kit";
  import { Check, ChevronRight, RotateCcw } from "lucide-svelte";
  import HelpTrainingCompletionFeedback from "$lib/components/help/HelpTrainingCompletionFeedback.svelte";
  import HelpTrainingJourney from "$lib/components/help/HelpTrainingJourney.svelte";
  import HelpTrainingPlayer from "$lib/components/help/HelpTrainingPlayer.svelte";
  import { requestTrainingPipWindow } from "$lib/help/trainingPipBridge";
  import type { ActionData, PageData } from "./$types";

  export let data: PageData;
  export let form: ActionData;

  $: currentStep = data.state?.currentStep ?? null;
  $: formMessage = form && "message" in form && typeof form.message === "string" ? form.message : "";

  const enhanceStart: SubmitFunction = () => {
    requestTrainingPipWindow();
    return async ({ update }) => {
      await update({ reset: false, invalidateAll: true });
    };
  };
</script>

<svelte:head>
  <title>{data.landing.title} | F10</title>
  <meta name="robots" content="index,follow" />
</svelte:head>

{#if !data.state}
  <main class="min-h-[100dvh] bg-[radial-gradient(circle_at_top_left,rgba(243,107,0,0.08),transparent_30%),linear-gradient(180deg,#F8F9FC_0%,#F2F4F8_100%)] px-4 py-6 text-[#010D28] sm:px-6 sm:py-10">
    <section class="mx-auto flex min-h-[calc(100dvh-3rem)] w-full max-w-[1120px] items-center sm:min-h-[calc(100dvh-5rem)]">
      <div class="grid w-full overflow-hidden rounded-[30px] border border-[#E1E5ED] bg-white shadow-[0_28px_80px_rgba(12,23,52,0.10)] lg:grid-cols-[minmax(0,1.35fr)_minmax(320px,0.65fr)]">
        <div class="p-7 sm:p-10 lg:p-12">
          <div class="flex flex-wrap items-center gap-3">
            <span class="text-[32px] font-black tracking-[-0.08em] text-[#F36B00]">F10</span>
            <span class="h-7 w-px bg-[#DDE1E9]"></span>
            <span class="rounded-full bg-[#F2F4F8] px-3 py-1.5 text-[9px] font-bold uppercase tracking-[0.14em] text-[#000A57]">Trilha guiada</span>
          </div>

          <div class="mt-9 max-w-[690px]">
            <p class="text-[10px] font-bold uppercase tracking-[0.16em] text-[#F36B00]">Aprenda dentro do fluxo real</p>
            <h1 class="mt-3 text-balance text-[34px] font-semibold leading-[1.08] tracking-[-0.045em] text-[#061333] sm:text-[46px] lg:text-[52px]">{data.landing.title}</h1>

            {#if data.landing.audience}
              <div class="mt-5">
                <span class="inline-flex rounded-full border border-[#E3E6ED] bg-[#FAFBFC] px-3 py-1.5 text-[10px] font-semibold text-[#697080]">{data.landing.audience}</span>
              </div>
            {/if}

            <p class="mt-6 max-w-[620px] text-[13px] leading-7 text-[#60697B]">
              {data.landing.welcomeMessage?.trim() || "Siga cada orientação no seu ritmo, com a referência visual da etapa sempre ao lado."}
            </p>
          </div>

          {#if formMessage}
            <p class="mt-6 max-w-[620px] rounded-xl border border-[#F2D4D4] bg-[#FFF7F7] px-4 py-3 text-[10px] leading-5 text-[#9B2C2C]">{formMessage}</p>
          {/if}

          <form method="POST" action="?/start" use:enhance={enhanceStart} class="mt-8">
            <button type="submit" class="training-start inline-flex min-h-14 items-center gap-2 rounded-full bg-[#F36B00] px-7 text-[12px] font-bold text-white shadow-[0_14px_30px_rgba(243,107,0,0.22)]">
              Começar trilha
              <ChevronRight size={17}/>
            </button>
          </form>

          <p class="mt-4 text-[9px] leading-5 text-[#9499A6]">A trilha salva seu progresso durante a sessão e libera os módulos na ordem correta.</p>
        </div>

        <aside class="relative overflow-hidden bg-[#071431] p-7 text-white sm:p-9 lg:p-10">
          <div class="pointer-events-none absolute -right-16 -top-16 h-52 w-52 rounded-full bg-[#F36B00]/10 blur-2xl"></div>
          <div class="relative">
            <p class="text-[9px] font-bold uppercase tracking-[0.16em] text-[#F7A466]">Como funciona</p>
            <h2 class="mt-3 max-w-[300px] text-[25px] font-semibold leading-tight tracking-[-0.035em]">Uma orientação por vez, sem tirar o foco do F10.</h2>
            <p class="mt-4 text-[11px] leading-6 text-[#B8C0D2]">Mantenha o sistema aberto enquanto acompanha a guia. Cada etapa mostra apenas o necessário para executar a ação atual.</p>

            <div class="mt-8 space-y-3">
              <div class="rounded-2xl border border-white/10 bg-white/[0.045] p-4">
                <div class="flex gap-3">
                  <span class="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/10 text-[10px] font-bold text-[#F7A466]">01</span>
                  <div>
                    <strong class="block text-[11px] font-semibold">Referência visual</strong>
                    <p class="mt-1 text-[10px] leading-5 text-[#AEB7CA]">A tela principal destaca exatamente onde a ação acontece.</p>
                  </div>
                </div>
              </div>

              <div class="rounded-2xl border border-white/10 bg-white/[0.045] p-4">
                <div class="flex gap-3">
                  <span class="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/10 text-[10px] font-bold text-[#F7A466]">02</span>
                  <div>
                    <strong class="block text-[11px] font-semibold">Guia flutuante</strong>
                    <p class="mt-1 text-[10px] leading-5 text-[#AEB7CA]">As instruções acompanham o trabalho sem cobrir a referência da etapa.</p>
                  </div>
                </div>
              </div>

              <div class="rounded-2xl border border-white/10 bg-white/[0.045] p-4">
                <div class="flex gap-3">
                  <span class="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/10 text-[10px] font-bold text-[#F7A466]">03</span>
                  <div>
                    <strong class="block text-[11px] font-semibold">Demonstração em MP4</strong>
                    <p class="mt-1 text-[10px] leading-5 text-[#AEB7CA]">Quando houver vídeo, ele abre dentro da experiência da trilha.</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </aside>
      </div>
    </section>
  </main>
{:else if data.state.completed}
  <main class="flex min-h-[100dvh] items-center justify-center bg-[#F5F6FA] px-5 py-8 text-center text-[#010D28]">
    <section class="max-w-[680px]">
      <span class="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[#EEF8F1] text-[#2F7045]"><Check size={27}/></span>
      <p class="mt-6 text-[9px] font-bold uppercase tracking-[0.14em] text-[#2F7045]">Concluído</p>
      <h1 class="mt-3 text-[30px] font-semibold tracking-[-0.035em] text-[#11182C] sm:text-[40px]">Você concluiu esta trilha.</h1>
      <p class="mt-4 text-[12px] leading-6 text-[#747A8A]">Quando precisar relembrar, você pode acessar novamente pelo mesmo endereço.</p>
      <HelpTrainingCompletionFeedback mode="public" sourceContentSlug={data.state.sourceContent.slug} />
      <form method="POST" action="?/restart" class="mt-7"><button type="submit" class="training-start inline-flex min-h-11 items-center gap-2 rounded-full border border-[#DDE1EA] bg-white px-5 text-[10px] font-semibold text-[#000A57]"><RotateCcw size={14}/>Recomeçar</button></form>
    </section>
  </main>
{:else if data.showJourney}
  <HelpTrainingJourney
    trainingTitle={data.state.training.title}
    welcomeMessage={data.state.training.welcomeMessage}
    modules={data.state.journey.modules}
    completedModules={data.state.journey.completedModules}
    totalModules={data.state.journey.totalModules}
    percent={data.state.journey.percent}
    openAction="?/openModule"
  />
{:else if currentStep}
  <HelpTrainingPlayer
    mode="public"
    trainingTitle={data.landing.title}
    sourceContentSlug={data.state.currentSourceContent.slug}
    step={currentStep}
    assetBasePath="/treinamento/assets"
    canGoBack={data.canGoBack}
    successMessage={data.successMessage}
    formMessage={formMessage}
    successAction="?/success"
    backAction="?/back"
  />
{/if}

<style>
  .training-start {
    transition: transform 180ms ease, box-shadow 180ms ease;
  }

  .training-start:hover {
    transform: translateY(-2px);
    box-shadow: 0 18px 34px rgba(243, 107, 0, 0.26);
  }

  .training-start:active {
    transform: translateY(1px) scale(0.99);
  }

  @media (prefers-reduced-motion: reduce) {
    .training-start {
      transition: none;
    }
  }
</style>
