<script lang="ts">
  import { enhance } from "$app/forms";
  import type { SubmitFunction } from "@sveltejs/kit";
  import { Check, ChevronRight, RotateCcw } from "lucide-svelte";
  import HelpTrainingCompletionFeedback from "$lib/components/help/HelpTrainingCompletionFeedback.svelte";
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
  <main class="flex min-h-[100dvh] items-center justify-center bg-[#F5F6FA] px-5 py-8 text-[#010D28]">
    <section class="w-full max-w-[820px] text-center">
      <span class="mx-auto text-[40px] font-black tracking-[-0.08em] text-[#F36B00]">F10</span>
      <p class="mt-8 text-[9px] font-bold uppercase tracking-[0.16em] text-[#F36B00]">Trilha F10</p>
      <h1 class="mx-auto mt-3 max-w-[760px] text-[30px] font-semibold tracking-[-0.04em] text-[#061333] sm:text-[44px]">{data.landing.title}</h1>
      {#if data.landing.audience}<p class="mt-3 text-[11px] text-[#858A98]">{data.landing.audience}</p>{/if}
      <p class="mx-auto mt-7 max-w-[620px] text-[13px] leading-7 text-[#656C7C]">Mantenha o F10 aberto. A tela principal mostra a referência visual da etapa e a guia flutuante conduz cada ação.</p>
      {#if formMessage}<p class="mx-auto mt-5 max-w-[560px] rounded-xl bg-[#FFF5F5] px-4 py-3 text-[10px] leading-5 text-[#9B2C2C]">{formMessage}</p>{/if}
      <form method="POST" action="?/start" use:enhance={enhanceStart} class="mt-8">
        <button type="submit" class="training-start inline-flex min-h-14 items-center gap-2 rounded-full bg-[#F36B00] px-8 text-[12px] font-bold text-white shadow-[0_18px_36px_rgba(243,107,0,0.22)]">Começar trilha<ChevronRight size={17}/></button>
      </form>
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
{:else if currentStep}
  <HelpTrainingPlayer
    mode="public"
    trainingTitle={data.landing.title}
    sourceContentSlug={data.state.sourceContent.slug}
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
    animation: training-start-float 3.2s ease-in-out infinite;
    transition: transform 180ms ease, box-shadow 180ms ease;
  }
  .training-start:hover { transform: translateY(-2px); }
  .training-start:active { transform: translateY(1px) scale(0.98); }
  @keyframes training-start-float {
    0%, 100% { transform: translateY(0); box-shadow: 0 18px 36px rgba(243,107,0,0.20); }
    50% { transform: translateY(-5px); box-shadow: 0 24px 44px rgba(243,107,0,0.28); }
  }
  @media (prefers-reduced-motion: reduce) {
    .training-start { animation: none; transition: none; }
  }
</style>
