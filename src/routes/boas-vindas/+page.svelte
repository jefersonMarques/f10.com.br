<script lang="ts">
  import {
    ArrowRight,
    BadgeCheck,
    CheckCircle2,
    ClipboardCheck,
    Clock3,
    MessageCircle,
    ShieldCheck,
    Sparkles,
  } from "lucide-svelte";

  const destination = "/celcoin/cadastro-de-escolas?flow=onboarding";
  const steps = [
    {
      icon: ClipboardCheck,
      title: "Dados da empresa",
      description: "Confirme as informações cadastrais e os responsáveis pela operação.",
    },
    {
      icon: ShieldCheck,
      title: "Documentos e configuração",
      description: "Envie os dados necessários para preparar a integração com o Cellcoin.",
    },
    {
      icon: MessageCircle,
      title: "Acompanhamento F10",
      description: "Acompanhe cada etapa e converse com nossa equipe pela Área do Cliente.",
    },
  ];
</script>

<svelte:head>
  <title>Boas-vindas | F10 Software</title>
  <meta name="description" content="Comece a implantação da sua empresa com o acompanhamento da equipe F10."/>
</svelte:head>

<main class="min-h-screen bg-[#F6F8FC] text-[#151C30]">
  <section class="relative isolate overflow-hidden bg-[#071330]">
    <div class="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_78%_18%,rgba(0,169,162,0.18),transparent_42%),radial-gradient(ellipse_at_10%_85%,rgba(234,109,11,0.12),transparent_45%)]"></div>
    <div class="pointer-events-none absolute -right-24 -top-28 h-80 w-80 rounded-full border border-white/10"></div>
    <div class="pointer-events-none absolute -right-10 -top-10 h-56 w-56 rounded-full border border-white/10"></div>

    <div class="relative mx-auto grid max-w-[1160px] gap-10 px-5 py-14 sm:px-8 sm:py-20 lg:grid-cols-[minmax(0,1.05fr)_minmax(340px,0.95fr)] lg:items-center lg:gap-12 lg:py-24">
      <div class="max-w-[650px]">
        <div class="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3.5 py-2 text-[12px] font-semibold text-white/85">
          <Sparkles size={15} class="text-[#FFAE71]" aria-hidden="true"/>
          Sua jornada com a F10 começa aqui
        </div>
        <h1 class="mt-7 text-[38px] font-bold leading-[1.09] tracking-[-0.045em] text-white sm:text-[52px] lg:text-[56px]">
          Bem-vindo à F10.
          <span class="block text-[#61D3CD]">Vamos começar juntos.</span>
        </h1>
        <p class="mt-6 max-w-[560px] text-[15px] leading-7 text-white/75 sm:text-[16px]">
          Prepare sua operação em um processo simples e acompanhado. Preencha os dados da empresa, envie seus documentos e dê início à configuração do Cellcoin.
        </p>

        <div class="mt-9 flex flex-col items-start gap-4 sm:flex-row sm:items-center">
          <a href={destination} class="floating-cta inline-flex min-h-[52px] w-full items-center justify-center gap-3 rounded-2xl bg-[#EA6D0B] px-6 py-3.5 text-[14px] font-bold text-white shadow-[0_15px_35px_rgba(234,109,11,0.3)] transition-[background-color,box-shadow] hover:bg-[#FA7B17] hover:shadow-[0_17px_38px_rgba(234,109,11,0.4)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white sm:w-auto">
            Começar configuração
            <ArrowRight size={18} aria-hidden="true"/>
          </a>
          <span class="flex items-center gap-2 text-[12px] text-white/65">
            <Clock3 size={16} aria-hidden="true"/>
            Tenha seus documentos em mãos
          </span>
        </div>

        <div class="mt-9 flex flex-wrap gap-3">
          <span class="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-[12px] text-white/85"><CheckCircle2 size={15} class="text-[#77DAB2]"/> Processo guiado</span>
          <span class="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-[12px] text-white/85"><ShieldCheck size={15} class="text-[#77DAB2]"/> Dados protegidos</span>
        </div>
      </div>

      <div class="relative">
        <div class="rounded-[28px] border border-white/15 bg-white/[0.08] p-5 shadow-[0_30px_80px_rgba(0,0,0,0.22)] backdrop-blur-sm sm:p-6">
          <div class="flex items-center justify-between gap-3 border-b border-white/10 pb-5">
            <div>
              <p class="text-[11px] font-bold uppercase tracking-[0.16em] text-[#74DBD4]">Sua implantação</p>
              <h2 class="mt-2 text-[20px] font-semibold text-white">Três passos para começar</h2>
            </div>
            <span class="rounded-full bg-white/10 px-3 py-1.5 text-[12px] font-semibold text-white/80">01 — 03</span>
          </div>

          <ol class="mt-5 space-y-3">
            {#each steps as step, index}
              <li class="flex items-start gap-4 rounded-2xl border border-white/10 bg-white/[0.07] p-4">
                <span class="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#74DBD4]/15 text-[#74DBD4]">
                  <svelte:component this={step.icon} size={20}/>
                </span>
                <div class="min-w-0">
                  <span class="text-[11px] font-bold uppercase tracking-wider text-white/45">Etapa 0{index + 1}</span>
                  <h3 class="mt-0.5 text-[14px] font-semibold text-white">{step.title}</h3>
                  <p class="mt-1 text-[12px] leading-5 text-white/65">{step.description}</p>
                </div>
              </li>
            {/each}
          </ol>
          <div class="mt-5 flex items-start gap-3 rounded-2xl border border-[#73DBD3]/20 bg-[#0B766F]/20 p-4">
            <BadgeCheck size={20} class="mt-0.5 shrink-0 text-[#73DBD3]"/>
            <p class="text-[12px] leading-5 text-white/85">A equipe F10 recebe sua solicitação e acompanha o andamento do começo ao fim.</p>
          </div>
        </div>
      </div>
    </div>
  </section>

  <section class="mx-auto max-w-[1160px] px-5 py-12 sm:px-8 sm:py-16">
    <div class="mb-7 text-center">
      <p class="text-[12px] font-bold uppercase tracking-[0.14em] text-[#078C87]">Próximos passos</p>
      <h2 class="mt-2 text-[25px] font-bold tracking-[-0.025em] text-[#111A35] sm:text-[30px]">Uma implantação organizada, do início ao fim</h2>
    </div>
    <div class="grid gap-4 md:grid-cols-3">
      {#each steps as step, index}
        <article class="rounded-[22px] border border-[#E3E7EF] bg-white p-6 shadow-[0_10px_30px_rgba(20,34,62,0.04)] transition-transform duration-200 hover:-translate-y-1">
          <div class="flex items-center justify-between">
            <span class="flex h-11 w-11 items-center justify-center rounded-xl bg-[#E8F8F7] text-[#058F88]"><svelte:component this={step.icon} size={20}/></span>
            <span class="text-[13px] font-bold text-[#B5BDC9]">0{index + 1}</span>
          </div>
          <h3 class="mt-5 text-[15px] font-bold text-[#1B253B]">{step.title}</h3>
          <p class="mt-2 text-[13px] leading-6 text-[#687387]">{step.description}</p>
        </article>
      {/each}
    </div>
    <div class="mt-7 flex flex-col items-center justify-between gap-5 rounded-[22px] border border-[#E3E7EF] bg-white px-6 py-6 sm:flex-row sm:px-8">
      <div class="flex items-start gap-3">
        <CheckCircle2 size={23} class="mt-1 shrink-0 text-[#07988C]"/>
        <div>
          <h3 class="text-[16px] font-bold text-[#1B253B]">Pronto para dar o primeiro passo?</h3>
          <p class="mt-1 text-[13px] leading-5 text-[#687387]">Quando terminar o cadastro, nosso time continuará com você.</p>
        </div>
      </div>
      <a href={destination} class="inline-flex min-h-11 w-full shrink-0 items-center justify-center gap-2 rounded-xl bg-[#071B4D] px-5 text-[13px] font-semibold text-white transition hover:bg-[#132B6A] sm:w-auto">
        Iniciar agora <ArrowRight size={16}/>
      </a>
    </div>
  </section>
</main>

<style>
  .floating-cta {
    animation: float-cta 3s ease-in-out infinite;
  }
  @keyframes float-cta {
    0%, 100% { transform: translateY(0); }
    50% { transform: translateY(-7px); }
  }
  .floating-cta:hover, .floating-cta:focus-visible { animation-play-state: paused; }
  @media (prefers-reduced-motion: reduce) {
    .floating-cta { animation: none; }
  }
</style>
