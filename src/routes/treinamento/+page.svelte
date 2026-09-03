<script lang="ts">
  import { enhance } from "$app/forms";
  import type { SubmitFunction } from "@sveltejs/kit";
  import { Check, ChevronRight, GraduationCap } from "lucide-svelte";
  import HelpTrainingPlayer from "$lib/components/help/HelpTrainingPlayer.svelte";
  import HelpTrainingSourceContent from "$lib/components/help/HelpTrainingSourceContent.svelte";
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
  <title>Treinamento F10</title>
  <meta name="robots" content="noindex,nofollow,noarchive" />
</svelte:head>

{#if data.invitePreview && !data.state}
  <main class="flex min-h-[100dvh] items-center justify-center bg-[#F5F6FA] px-5 py-8 text-[#010D28]">
    <section class="w-full max-w-[820px] text-center">
      <span class="mx-auto text-[40px] font-black tracking-[-0.08em] text-[#F36B00]">F10</span>
      <p class="mt-8 text-[9px] font-bold uppercase tracking-[0.16em] text-[#F36B00]">Trilha F10</p>
      <h1 class="mx-auto mt-3 max-w-[760px] text-[30px] font-semibold tracking-[-0.04em] text-[#061333] sm:text-[44px]">{data.invitePreview.trainingTitle}</h1>
      {#if data.invitePreview.audience}<p class="mt-3 text-[11px] text-[#858A98]">{data.invitePreview.audience}</p>{/if}
      <p class="mt-7 text-[14px] font-semibold text-[#2B3141]">Olá, {data.invitePreview.participantName}.</p>
      <p class="mx-auto mt-3 max-w-[620px] text-[13px] leading-7 text-[#656C7C]">O conteúdo completo ficará aberto como referência enquanto uma guia flutuante conduz cada ação no F10.</p>
      <form method="POST" action="?/acceptInvite" use:enhance={enhanceStart} class="mt-8"><button type="submit" class="inline-flex min-h-14 items-center gap-2 rounded-full bg-[#F36B00] px-8 text-[12px] font-bold text-white shadow-[0_18px_36px_rgba(243,107,0,0.22)]">Começar trilha<ChevronRight size={17}/></button></form>
    </section>
  </main>
{:else if !data.state}
  <main class="flex min-h-[100dvh] items-center justify-center bg-white px-5 py-8 text-center text-[#010D28]">
    <section class="max-w-[620px]">
      <span class="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[#EEF0FF] text-[#000A57]"><GraduationCap size={26}/></span>
      <h1 class="mt-6 text-[28px] font-semibold tracking-[-0.03em] text-[#11182C]">Este convite não está disponível</h1>
      <p class="mt-4 text-[12px] leading-6 text-[#747A8A]">{data.inviteState === "expirado" ? "Sua sessão expirou. Peça um novo convite à equipe responsável." : "Use o link individual recebido por e-mail para iniciar."}</p>
    </section>
  </main>
{:else if !data.state.session.startedAt}
  <main class="flex min-h-[100dvh] items-center justify-center bg-[#F5F6FA] px-5 py-8 text-center text-[#010D28]">
    <section class="w-full max-w-[760px]">
      <span class="mx-auto text-[40px] font-black tracking-[-0.08em] text-[#F36B00]">F10</span>
      <h1 class="mt-8 text-[30px] font-semibold tracking-[-0.035em] text-[#11182C] sm:text-[40px]">{data.state.training.title}</h1>
      <p class="mt-5 text-[14px] font-semibold text-[#2B3141]">Olá, {data.state.invite.participantName}.</p>
      <form method="POST" action="?/start" use:enhance={enhanceStart} class="mt-8"><button type="submit" class="inline-flex min-h-14 items-center gap-2 rounded-full bg-[#F36B00] px-8 text-[12px] font-bold text-white">Começar trilha<ChevronRight size={17}/></button></form>
    </section>
  </main>
{:else}
  <HelpTrainingSourceContent sourceContent={data.state.sourceContent} assetBasePath="/treinamento/assets" />
  {#if data.state.completed}
    <div class="fixed bottom-5 left-1/2 z-[120] w-[min(92vw,500px)] -translate-x-1/2 rounded-2xl border border-[#CFE9D7] bg-white px-5 py-4 text-center shadow-[0_18px_48px_rgba(1,13,40,0.16)]">
      <span class="mx-auto flex h-9 w-9 items-center justify-center rounded-full bg-[#EEF8F1] text-[#2F7045]"><Check size={18}/></span>
      <strong class="mt-2 block text-[12px] text-[#234F32]">Trilha concluída</strong>
      <p class="mt-1 text-[9px] text-[#6E8C78]">Você pode continuar consultando o conteúdo completo.</p>
    </div>
  {:else if currentStep}
    <HelpTrainingPlayer
      mode="invite"
      trainingTitle={data.state.training.title}
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
{/if}
