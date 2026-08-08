<script lang="ts">
  import {
    ArrowRight,
    Download,
    GraduationCap,
    KeyRound,
    LifeBuoy,
    ShieldCheck,
    UserPlus,
  } from "lucide-svelte";
  import TrainingBrowser from "$lib/components/help/TrainingBrowser.svelte";
  import SupportChatDialog from "$lib/components/onboarding/SupportChatDialog.svelte";
  import TrainingVideoDialog from "$lib/components/onboarding/TrainingVideoDialog.svelte";
  import {
    trainingVideos,
    type TrainingVideo,
  } from "$lib/help/trainingCatalog";

  const managerTrainings = trainingVideos.filter(
    (training) => training.audience === "manager",
  );

  let activeTraining: TrainingVideo | null = null;
  let supportDialogOpen = false;

  function openTraining(training: TrainingVideo): void {
    activeTraining = training;
  }

  function closeTraining(): void {
    activeTraining = null;
  }

  function openSupport(): void {
    supportDialogOpen = true;
  }

  function closeSupport(): void {
    supportDialogOpen = false;
  }
</script>

<div class="min-h-screen bg-[#F5F6FB] text-[#010D28]">
  <header class="sticky top-0 z-30 border-b border-[#E4E7F0] bg-white/95 px-4 py-3 backdrop-blur sm:px-6">
    <div class="mx-auto flex max-w-7xl items-center justify-between gap-4">
      <a
        href="/ajuda-f10"
        class="flex min-w-0 items-center gap-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#EA6D0B]/35"
        aria-label="Página inicial da Ajuda F10"
      >
        <img src="/logo_f10.svg" alt="F10 Software" class="h-8 w-auto sm:h-9" />
        <span class="h-8 w-px bg-[#DFE3ED]" aria-hidden="true"></span>
        <span class="truncate text-[14px] font-semibold text-[#010D28]">Ajuda F10</span>
      </a>

      <button
        type="button"
        class="inline-flex min-h-11 items-center justify-center gap-2 rounded-full border border-[#DDE1EC] bg-white px-4 py-2 text-[13px] font-semibold text-[#000A57] transition hover:border-[#000A57]/25 hover:bg-[#F5F6FB] focus:outline-none focus:ring-2 focus:ring-[#000A57]/20"
        on:click={openSupport}
      >
        <LifeBuoy size={18} aria-hidden="true" />
        <span class="hidden sm:inline">Falar com o suporte</span>
        <span class="sm:hidden">Suporte</span>
      </button>
    </div>
  </header>

  <main>
    <section class="relative overflow-hidden px-4 pb-14 pt-12 sm:px-6 sm:pb-20 sm:pt-16">
      <div
        class="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_12%_10%,rgba(234,109,11,0.13),transparent_31%),radial-gradient(circle_at_88%_70%,rgba(0,10,87,0.1),transparent_32%)]"
        aria-hidden="true"
      ></div>

      <div class="relative mx-auto max-w-7xl">
        <div class="mx-auto max-w-3xl text-center">
          <p class="text-[11px] font-bold uppercase tracking-[0.18em] text-[#EA6D0B]">
            Central de orientação F10
          </p>
          <h1 class="mt-3 text-[36px] font-semibold leading-[1.05] tracking-[-0.045em] text-[#010D28] sm:text-[52px]">
            Como podemos ajudar?
          </h1>
          <p class="mx-auto mt-4 max-w-2xl text-[15px] leading-[1.75] text-[#5F6475] sm:text-[17px]">
            Escolha o que precisa fazer agora. Você encontrará instruções diretas e treinamentos organizados por rotina.
          </p>
        </div>

        <div class="mx-auto mt-9 grid max-w-6xl gap-4 md:grid-cols-3">
          <a
            href="/primeiros-passos-f10"
            class="group flex min-h-[210px] flex-col rounded-[26px] bg-[#EA6D0B] p-6 text-white shadow-[0_22px_52px_rgba(234,109,11,0.25)] transition hover:-translate-y-1 hover:shadow-[0_28px_60px_rgba(234,109,11,0.3)] focus:outline-none focus:ring-2 focus:ring-[#EA6D0B]/50 focus:ring-offset-2"
          >
            <span class="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-white/15 ring-1 ring-white/20">
              <Download size={24} aria-hidden="true" />
            </span>
            <span class="mt-5 text-[21px] font-semibold">Instalar o F10</span>
            <span class="mt-2 text-[13px] leading-[1.65] text-white/82">
              Baixe e instale o F10 em um computador com Windows.
            </span>
            <span class="mt-auto flex items-center gap-2 pt-5 text-[13px] font-bold">
              Começar instalação
              <ArrowRight class="transition group-hover:translate-x-1" size={18} aria-hidden="true" />
            </span>
          </a>

          <a
            href="/primeiros-passos-f10?etapa=primeiro-acesso"
            class="group flex min-h-[210px] flex-col rounded-[26px] bg-[#000A57] p-6 text-white shadow-[0_22px_52px_rgba(0,10,87,0.2)] transition hover:-translate-y-1 hover:bg-[#101B70] hover:shadow-[0_28px_60px_rgba(0,10,87,0.24)] focus:outline-none focus:ring-2 focus:ring-[#000A57]/50 focus:ring-offset-2"
          >
            <span class="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-white/10 ring-1 ring-white/15">
              <KeyRound size={24} aria-hidden="true" />
            </span>
            <span class="mt-5 text-[21px] font-semibold">Primeiro acesso</span>
            <span class="mt-2 text-[13px] leading-[1.65] text-white/75">
              Use a senha provisória do e-mail e crie sua nova senha.
            </span>
            <span class="mt-auto flex items-center gap-2 pt-5 text-[13px] font-bold text-[#FF9A49]">
              Iniciar primeiro acesso
              <ArrowRight class="transition group-hover:translate-x-1" size={18} aria-hidden="true" />
            </span>
          </a>

          <a
            href="#treinamentos-f10"
            class="group flex min-h-[210px] flex-col rounded-[26px] border border-[#DDE1EC] bg-white p-6 shadow-[0_16px_44px_rgba(1,13,40,0.07)] transition hover:-translate-y-1 hover:border-[#EA6D0B]/40 hover:shadow-[0_24px_54px_rgba(1,13,40,0.11)] focus:outline-none focus:ring-2 focus:ring-[#EA6D0B]/35 focus:ring-offset-2"
          >
            <span class="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-[#FFF0E4] text-[#EA6D0B]">
              <GraduationCap size={24} aria-hidden="true" />
            </span>
            <span class="mt-5 text-[21px] font-semibold text-[#010D28]">Aprender uma rotina</span>
            <span class="mt-2 text-[13px] leading-[1.65] text-[#656A7A]">
              Encontre vídeos sobre matrículas, turmas, financeiro e outras rotinas.
            </span>
            <span class="mt-auto flex items-center gap-2 pt-5 text-[13px] font-bold text-[#C95717]">
              Ver treinamentos
              <ArrowRight class="transition group-hover:translate-x-1" size={18} aria-hidden="true" />
            </span>
          </a>
        </div>
      </div>
    </section>

    <section class="border-y border-[#E5E8F0] bg-white px-4 py-9 sm:px-6 sm:py-11">
      <div class="mx-auto flex max-w-6xl flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
        <div class="max-w-xl">
          <p class="inline-flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.15em] text-[#C95717]">
            <ShieldCheck size={16} aria-hidden="true" />
            Para quem administra a equipe
          </p>
          <h2 class="mt-2 text-[24px] font-semibold tracking-[-0.03em] text-[#010D28] sm:text-[30px]">
            Configure os acessos quando precisar
          </h2>
          <p class="mt-2 text-[14px] leading-[1.65] text-[#656A7A]">
            Estes treinamentos são úteis para gestores, mas não são obrigatórios para os funcionários.
          </p>
        </div>

        <div class="grid gap-3 sm:grid-cols-2 lg:min-w-[520px]">
          {#each managerTrainings as training, index}
            <button
              type="button"
              class="group flex min-h-[88px] items-center gap-3 rounded-[18px] border border-[#E0E3EC] bg-[#F8F9FC] p-4 text-left transition hover:border-[#EA6D0B]/45 hover:bg-[#FFF8F2] focus:outline-none focus:ring-2 focus:ring-[#EA6D0B]/35"
              on:click={() => openTraining(training)}
            >
              <span class="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white text-[#EA6D0B] shadow-sm">
                {#if index === 0}
                  <UserPlus size={22} aria-hidden="true" />
                {:else}
                  <ShieldCheck size={22} aria-hidden="true" />
                {/if}
              </span>
              <span class="min-w-0 flex-1">
                <span class="block text-[13px] font-semibold leading-snug text-[#010D28]">
                  {training.title}
                </span>
                <span class="mt-1 flex items-center gap-1 text-[11px] font-bold text-[#C95717]">
                  Assistir
                  <ArrowRight class="transition group-hover:translate-x-0.5" size={14} aria-hidden="true" />
                </span>
              </span>
            </button>
          {/each}
        </div>
      </div>
    </section>

    <section class="px-4 py-14 sm:px-6 sm:py-20">
      <div class="mx-auto max-w-7xl">
        <TrainingBrowser onSelect={openTraining} />
      </div>
    </section>

    <section class="px-4 pb-16 sm:px-6 sm:pb-20">
      <div class="mx-auto flex max-w-5xl flex-col items-center justify-between gap-5 rounded-[28px] bg-[#07112D] px-6 py-8 text-center text-white shadow-[0_24px_70px_rgba(1,13,40,0.18)] sm:flex-row sm:px-9 sm:py-9 sm:text-left">
        <div>
          <p class="text-[22px] font-semibold tracking-[-0.03em]">Ainda precisa de ajuda?</p>
          <p class="mt-2 text-[13px] leading-relaxed text-white/65 sm:text-[14px]">
            Fale com o suporte F10 e explique em qual etapa encontrou dificuldade.
          </p>
        </div>
        <button
          type="button"
          class="inline-flex min-h-[52px] w-full shrink-0 items-center justify-center gap-2 rounded-full bg-[#EA6D0B] px-6 py-3 text-[14px] font-semibold text-white shadow-[0_12px_30px_rgba(234,109,11,0.28)] transition hover:brightness-105 focus:outline-none focus:ring-2 focus:ring-[#FF9A49] focus:ring-offset-2 focus:ring-offset-[#07112D] sm:w-auto"
          on:click={openSupport}
        >
          <LifeBuoy size={19} aria-hidden="true" />
          Abrir suporte F10
        </button>
      </div>
    </section>
  </main>
</div>

<TrainingVideoDialog
  training={activeTraining}
  isOpen={activeTraining !== null}
  showCompletionAction={false}
  onClose={closeTraining}
/>

<SupportChatDialog isOpen={supportDialogOpen} onClose={closeSupport} />
