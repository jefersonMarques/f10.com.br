<script lang="ts">
  import { Check, ChevronRight, GraduationCap } from "lucide-svelte";
  import HelpTrainingPlayer from "$lib/components/help/HelpTrainingPlayer.svelte";
  import type { ActionData, PageData } from "./$types";

  export let data: PageData;
  export let form: ActionData;

  $: currentStep = data.state?.currentStep ?? null;
  $: formMessage = form && "message" in form && typeof form.message === "string" ? form.message : "";
  $: failureReported = Boolean(data.state?.progress?.status === "blocked" || data.state?.progress?.status === "help_requested");
</script>

<svelte:head>
  <title>Treinamento F10</title>
  <meta name="robots" content="noindex,nofollow,noarchive" />
</svelte:head>

{#if data.invitePreview && !data.state}
  <main class="flex min-h-[100dvh] items-center justify-center bg-[#F5F6FA] px-5 py-8 text-[#010D28]">
    <section class="w-full max-w-[820px] text-center">
      <span class="mx-auto text-[40px] font-black tracking-[-0.08em] text-[#F36B00]">F10</span>
      <p class="mt-8 text-[9px] font-bold uppercase tracking-[0.16em] text-[#F36B00]">Orientação F10</p>
      <h1 class="mx-auto mt-3 max-w-[760px] text-[30px] font-semibold tracking-[-0.04em] text-[#061333] sm:text-[44px]">{data.invitePreview.trainingTitle}</h1>
      {#if data.invitePreview.audience}<p class="mt-3 text-[11px] text-[#858A98]">{data.invitePreview.audience}</p>{/if}
      <p class="mt-7 text-[14px] font-semibold text-[#2B3141]">Olá, {data.invitePreview.participantName}.</p>
      <p class="mx-auto mt-3 max-w-[620px] text-[13px] leading-7 text-[#656C7C]">{data.invitePreview.welcomeMessage || "Vamos fazer uma coisa de cada vez. Leia a orientação, faça a ação e continue quando estiver pronto."}</p>
      <form method="POST" action="?/acceptInvite" class="mt-8"><button type="submit" class="training-start inline-flex min-h-14 items-center gap-2 rounded-full bg-[#F36B00] px-8 text-[12px] font-bold text-white shadow-[0_18px_36px_rgba(243,107,0,0.22)]">Começar<ChevronRight size={17}/></button></form>
    </section>
  </main>
{:else if !data.state}
  <main class="flex min-h-[100dvh] items-center justify-center bg-white px-5 py-8 text-center text-[#010D28]">
    <section class="max-w-[620px]">
      <span class="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[#EEF0FF] text-[#000A57]"><GraduationCap size={26}/></span>
      <h1 class="mt-6 text-[28px] font-semibold tracking-[-0.03em] text-[#11182C]">Este convite não está disponível</h1>
      <p class="mt-4 text-[12px] leading-6 text-[#747A8A]">{data.inviteState === "usado" ? "Este link já foi utilizado. Continue pelo mesmo navegador em que o treinamento foi iniciado." : data.inviteState === "expirado" ? "Sua sessão expirou. Peça um novo convite à equipe responsável." : "Use o link individual recebido por e-mail para iniciar."}</p>
    </section>
  </main>
{:else if data.state.completed}
  <main class="flex min-h-[100dvh] items-center justify-center bg-[#F5F6FA] px-5 py-8 text-center text-[#010D28]">
    <section class="max-w-[680px]">
      <span class="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[#EEF8F1] text-[#2F7045]"><Check size={27}/></span>
      <p class="mt-6 text-[9px] font-bold uppercase tracking-[0.14em] text-[#2F7045]">Concluído</p>
      <h1 class="mt-3 text-[30px] font-semibold tracking-[-0.035em] text-[#11182C] sm:text-[40px]">Você concluiu esta orientação.</h1>
      <p class="mt-4 text-[12px] leading-6 text-[#747A8A]">Se precisar rever alguma ação depois, use novamente o conteúdo recebido.</p>
    </section>
  </main>
{:else if !data.state.session.startedAt}
  <main class="flex min-h-[100dvh] items-center justify-center bg-[#F5F6FA] px-5 py-8 text-[#010D28]">
    <section class="w-full max-w-[760px] text-center">
      <span class="mx-auto text-[40px] font-black tracking-[-0.08em] text-[#F36B00]">F10</span>
      <h1 class="mt-8 text-[30px] font-semibold tracking-[-0.035em] text-[#11182C] sm:text-[40px]">{data.state.training.title}</h1>
      <p class="mt-5 text-[14px] font-semibold text-[#2B3141]">Olá, {data.state.invite.participantName}.</p>
      <p class="mx-auto mt-3 max-w-[620px] text-[13px] leading-7 text-[#656C7C]">{data.state.training.welcomeMessage || "Vamos fazer uma coisa de cada vez."}</p>
      <form method="POST" action="?/start" class="mt-8"><button type="submit" class="training-start inline-flex min-h-14 items-center gap-2 rounded-full bg-[#F36B00] px-8 text-[12px] font-bold text-white">Começar<ChevronRight size={17}/></button></form>
    </section>
  </main>
{:else if currentStep}
  <HelpTrainingPlayer
    mode="invite"
    trainingTitle={data.state.training.title}
    step={currentStep}
    assetBasePath="/treinamento/assets"
    canGoBack={data.canGoBack}
    successMessage={data.successMessage}
    failureReported={failureReported}
    failureDetail={data.state.progress?.failureDetail ?? ""}
    formMessage={formMessage}
    successAction="?/success"
    backAction="?/back"
    failureAction="?/failure"
    difficultyAuth={data.difficultyAuth}
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
    0%, 100% { transform: translateY(0); box-shadow: 0 18px 36px rgba(243, 107, 0, 0.20); }
    50% { transform: translateY(-5px); box-shadow: 0 24px 44px rgba(243, 107, 0, 0.28); }
  }
  @media (prefers-reduced-motion: reduce) {
    .training-start { animation: none; transition: none; }
  }
</style>
