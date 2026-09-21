<script lang="ts">
  import {
    ArrowRight,
    CheckCircle2,
    ClipboardCheck,
    MessageCircle,
    ShieldCheck,
    Sparkles,
  } from "lucide-svelte";

  const steps = [
    {
      icon: ClipboardCheck,
      title: "Conte um pouco sobre sua empresa",
      text: "Confirmamos os dados cadastrais e responsáveis pela operação.",
    },
    {
      icon: ShieldCheck,
      title: "Envie os dados do Cellcoin",
      text: "Coletamos as informações e documentos necessários para preparar sua implantação.",
    },
    {
      icon: MessageCircle,
      title: "Acompanhe tudo pela Área do Cliente",
      text: "Depois da ativação, você acompanha o andamento e fala com a equipe F10 pelo mesmo lugar.",
    },
  ];
</script>

<svelte:head>
  <title>Boas-vindas | F10 Software</title>
  <meta
    name="description"
    content="Primeiros passos para iniciar sua implantação com a F10."
  />
</svelte:head>

<main class="bg-[#F7F8FB] text-[#11182C]">
  <section class="relative overflow-hidden border-b border-[#E5E8EF] bg-[#010D28]">
    <div class="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-[#EA6D0B]/20 blur-3xl"></div>
    <div class="pointer-events-none absolute -bottom-36 left-1/3 h-80 w-80 rounded-full bg-white/5 blur-3xl"></div>

    <div class="relative mx-auto max-w-[1120px] px-5 py-14 sm:px-8 sm:py-20 lg:py-24">
      <div class="max-w-[760px]">
        <div class="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-[11px] font-semibold text-white/80">
          <Sparkles size={13} class="text-[#FF9A4B]" />
          Você agora faz parte da F10
        </div>

        <h1 class="mt-6 max-w-[720px] text-[34px] font-semibold leading-[1.08] tracking-[-0.045em] text-white sm:text-[48px]">
          Bem-vindo. Vamos preparar tudo para sua operação começar do jeito certo.
        </h1>

        <p class="mt-5 max-w-[650px] text-[15px] leading-7 text-white/65 sm:text-[16px]">
          O próximo passo é concluir seu cadastro de implantação. São algumas informações da empresa, documentos e os dados necessários para configurar o Cellcoin.
        </p>

        <div class="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
          <a
            href="/celcoin/cadastro-de-escolas?flow=onboarding"
            class="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-[#EA6D0B] px-5 text-[13px] font-semibold text-white transition hover:brightness-105"
          >
            Começar configuração
            <ArrowRight size={16} />
          </a>
          <span class="text-[11px] text-white/45">Separe seus documentos antes de começar.</span>
        </div>
      </div>
    </div>
  </section>

  <section class="mx-auto max-w-[1120px] px-5 py-10 sm:px-8 sm:py-14">
    <div class="grid gap-4 md:grid-cols-3">
      {#each steps as step, index}
        <article class="rounded-[22px] border border-[#E2E5ED] bg-white p-5 sm:p-6">
          <div class="flex items-center justify-between gap-3">
            <span class="flex h-10 w-10 items-center justify-center rounded-xl bg-[#FFF3E9] text-[#C45B0B]">
              <svelte:component this={step.icon} size={18} />
            </span>
            <span class="text-[11px] font-bold text-[#B1B6C1]">0{index + 1}</span>
          </div>
          <h2 class="mt-5 text-[15px] font-semibold text-[#202637]">{step.title}</h2>
          <p class="mt-2 text-[12px] leading-5 text-[#777E8D]">{step.text}</p>
        </article>
      {/each}
    </div>

    <div class="mt-6 grid gap-5 rounded-[24px] border border-[#E2E5ED] bg-white p-5 sm:grid-cols-[1fr_auto] sm:items-center sm:p-7">
      <div class="flex min-w-0 items-start gap-3">
        <CheckCircle2 size={20} class="mt-0.5 shrink-0 text-[#2F7045]" />
        <div>
          <h2 class="text-[14px] font-semibold text-[#252C3D]">Você não precisa concluir a implantação sozinho.</h2>
          <p class="mt-1 text-[12px] leading-5 text-[#777E8D]">
            Assim que o formulário for enviado, a equipe F10 recebe seu ticket e você ganha acesso para acompanhar cada etapa.
          </p>
        </div>
      </div>

      <a
        href="/celcoin/cadastro-de-escolas?flow=onboarding"
        class="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-[#DDE1EA] bg-[#FAFAFC] px-4 text-[12px] font-semibold text-[#000A57] transition hover:bg-[#F1F2F6]"
      >
        Iniciar agora
        <ArrowRight size={14} />
      </a>
    </div>
  </section>
</main>
