<!-- src/routes/nota-fiscal/+page.svelte -->
<script lang="ts">
  import Breadcrumb from "$lib/components/Breadcrumb.svelte";
  import FaqAccordion from "$lib/components/FaqAccordion.svelte";
  import {
    ArrowRight,
    BadgeCheck,
    Building2,
    Clock,
    FileCheck2,
    FileText,
    Landmark,
    PlugZap,
    ReceiptText,
    ShieldCheck,
    TriangleAlert,
    Workflow,
  } from "lucide-svelte";

  type IconComponent = typeof ReceiptText;

  type BenefitCard = {
    title: string;
    description: string;
    icon: IconComponent;
  };

  type FlowStep = {
    label: string;
    title: string;
    description: string;
  };

  type FaqItem = {
    question: string;
    answer: string;
  };

  const ctaHref = "/nota-fiscal/cadastro-de-escolas";
  const heroImage = "/nota-fiscal-para-escolas-f10.webp";

  const kpis = [
    {
      value: "NFS-e",
      label: "cobertura por cidade e prefeitura, com fluxo guiado no F10",
    },
    {
      value: "Status",
      label: "acompanhamento claro do que foi solicitado e retornado pelo emissor",
    },
    {
      value: "Menos etapas",
      label: "menos portal externo, menos conferência solta e menos retrabalho",
    },
  ];

  const benefitCards: BenefitCard[] = [
    {
      title: "Fluxo fiscal mais organizado",
      description:
        "A escola informa os dados necessários e o F10 centraliza o caminho de emissão, reduzindo etapas soltas e dúvidas no financeiro.",
      icon: Workflow,
    },
    {
      title: "Clareza sobre o emissor oficial",
      description:
        "A nota é emitida pelo órgão responsável — prefeitura ou ambiente nacional. O F10 organiza a integração e mostra o status do processo.",
      icon: Landmark,
    },
    {
      title: "Menos operação manual",
      description:
        "Quando há cobertura, a emissão fica mais previsível e integrada ao financeiro, evitando repetição de tarefas em portais externos.",
      icon: PlugZap,
    },
    {
      title: "Validação por cidade",
      description:
        "Antes do cadastro completo, a escola consulta a cobertura da cidade e entende se já existe caminho disponível para seguir.",
      icon: BadgeCheck,
    },
    {
      title: "Rastreabilidade do processo",
      description:
        "A solicitação e o retorno do emissor ficam mais claros, facilitando conferência, suporte e acompanhamento interno.",
      icon: FileCheck2,
    },
    {
      title: "Expectativa realista",
      description:
        "Se a prefeitura ou ambiente oficial estiver instável, o sistema deixa isso claro. O F10 não substitui o órgão emissor.",
      icon: ShieldCheck,
    },
  ];

  const flowSteps: FlowStep[] = [
    {
      label: "01",
      title: "Selecione a UF e a cidade",
      description:
        "A primeira etapa verifica se a cidade já aparece na cobertura atual de NFS-e. Se não aparecer, ainda é possível enviar os dados para análise.",
    },
    {
      label: "02",
      title: "Preencha os dados fiscais da escola",
      description:
        "CNPJ, inscrições, endereço, regime tributário e informações necessárias para avaliar o melhor caminho de integração.",
    },
    {
      label: "03",
      title: "A equipe avalia o cenário",
      description:
        "O F10 identifica se a emissão será por prefeitura, ambiente nacional ou outro fluxo disponível para o município.",
    },
    {
      label: "04",
      title: "A emissão passa a ser acompanhada no sistema",
      description:
        "Com o fluxo configurado, a rotina de emissão fica mais centralizada, com status e menos etapas manuais.",
    },
  ];

  const faqItems: FaqItem[] = [
    {
      question: "O F10 emite a nota fiscal diretamente?",
      answer:
        "Não. O emissor oficial é sempre o órgão responsável, como a prefeitura na NFS-e ou o ambiente nacional quando aplicável. O F10 organiza, integra e acompanha o fluxo para reduzir etapas manuais.",
    },
    {
      question: "Toda cidade está disponível para NFS-e no F10?",
      answer:
        "Não necessariamente. A disponibilidade depende da cidade, da prefeitura e do tipo de integração disponível. Por isso a primeira etapa valida a cobertura antes do cadastro completo.",
    },
    {
      question: "Posso continuar mesmo se minha cidade não aparecer?",
      answer:
        "Sim. Mesmo que a cidade ainda não esteja elegível na consulta inicial, é possível prosseguir com o preenchimento para a equipe avaliar o cenário e registrar a demanda.",
    },
    {
      question: "O que acontece se a prefeitura estiver fora do ar?",
      answer:
        "A emissão pode ficar temporariamente indisponível, porque depende do emissor oficial. O F10 registra e informa o status para reduzir dúvidas e retrabalho no atendimento.",
    },
    {
      question: "Quais dados preciso enviar?",
      answer:
        "Normalmente são necessários dados do CNPJ, endereço, inscrições fiscais, regime tributário e informações de emissão. O formulário guia esse preenchimento em etapas.",
    },
  ];
</script>

<svelte:head>
  <title>Nota Fiscal no F10 — NFS-e para Escolas | F10 Software</title>
  <meta
    name="description"
    content="Entenda e inicie o cadastro de nota fiscal no F10. Validação de cidade, fluxo fiscal guiado, integração com órgão emissor e menos etapas manuais para escolas."
  />
  <meta property="og:title" content="Nota Fiscal no F10 — NFS-e para Escolas" />
  <meta
    property="og:description"
    content="Fluxo de nota fiscal para escolas: cobertura por cidade, cadastro guiado e acompanhamento da emissão pelo F10."
  />
  <link rel="canonical" href="https://f10.com.br/nota-fiscal" />

  <script type="application/ld+json">
    {
      "@context": "https://schema.org",
      "@type": "WebPage",
      "name": "Nota Fiscal no F10 — NFS-e para Escolas",
      "description": "Cadastro guiado de nota fiscal para escolas com validação de cidade e integração ao órgão emissor.",
      "publisher": { "@type": "Organization", "name": "F10 Software" }
    }
  </script>
</svelte:head>

<section class="relative isolate overflow-hidden bg-white/60">
  <Breadcrumb
    baseUrl="https://f10.com.br"
    items={[{ label: "HOME", href: "/" }, { label: "NOTA FISCAL" }]}
  />

  <div class="container pb-16">
    <div class="grid gap-10 lg:grid-cols-12 items-start">
      <div class="lg:col-span-6">
        <p
          class="inline-flex items-center gap-2 rounded-full bg-[#F3F4FD] px-4 py-2 text-[13px] font-semibold text-[#000A57] ring-1 ring-black/5"
        >
          <ReceiptText size={16} />
          Emissão fiscal pensada para escolas
          <span class="ml-1 h-1 w-1 rounded-full bg-[#EA6D0B]"></span>
        </p>

        <h1
          class="mt-6 max-w-[760px] text-[#010D28] tracking-[-0.02em] leading-[1.06]
                 text-[36px] sm:text-[44px] md:text-[52px] font-semibold"
        >
          Nota fiscal no F10 com
          <span class="text-[#EA6D0B]">menos etapas manuais</span>
        </h1>

        <p class="mt-5 max-w-[650px] text-[#7E82A2] text-[16px] leading-[1.85]">
          Valide a cobertura da sua cidade, envie os dados fiscais da escola e organize o caminho de emissão de NFS-e/NF-e com mais clareza. O F10 não substitui o órgão emissor: ele simplifica o fluxo, reduz retrabalho e acompanha o status.
        </p>

        <div class="mt-8 flex flex-col sm:flex-row sm:items-center gap-4">
          <a
            href={ctaHref}
            class="inline-flex items-center justify-center gap-3 rounded-[70px]
                   bg-[#EA6D0B] px-8 md:px-10 py-4 text-white text-[16px] font-bold
                   transition hover:brightness-110 focus:outline-none focus:ring-2
                   focus:ring-[#EA6D0B]/40"
            aria-label="Iniciar cadastro de nota fiscal"
          >
            <span>Iniciar cadastro</span>
            <ArrowRight size={22} />
          </a>

          <a
            href="#como-funciona"
            class="inline-flex items-center justify-center gap-3 rounded-[70px]
                   border border-[#EA6D0B] px-8 md:px-10 py-4 text-[#000A57] text-[16px] font-semibold
                   transition hover:bg-[#EA6D0B]/10 focus:outline-none focus:ring-2
                   focus:ring-[#EA6D0B]/30"
          >
            <span>Entender o fluxo</span>
            <ArrowRight size={22} class="text-[#EA6D0B]" />
          </a>
        </div>

        <div class="mt-10 grid gap-4 sm:grid-cols-3">
          {#each kpis as k}
            <article class="rounded-[20px] bg-white ring-1 ring-black/5 p-5 shadow-sm">
              <p class="text-[#EA6D0B] text-[22px] font-semibold leading-tight">
                {k.value}
              </p>
              <p class="mt-1 text-[#000A57]/75 text-[13px] leading-relaxed">
                {k.label}
              </p>
            </article>
          {/each}
        </div>
      </div>

      <div class="lg:col-span-6 mt-2 lg:mt-0">
        <div
          class="relative overflow-hidden rounded-[20px] md:rounded-[24px]
                 ring-1 ring-black/5 shadow-[0_18px_50px_rgba(1,13,40,0.16)]"
        >
          <img
            src={heroImage}
            alt="Nota fiscal para escolas no F10"
            class="block h-full w-full object-cover"
            loading="eager"
          />
          <div class="absolute inset-0 bg-[#000A57]/25"></div>
          <div class="pointer-events-none absolute inset-0 rounded-[inherit] ring-1 ring-inset ring-white/10"></div>
        </div>
      </div>
    </div>
  </div>
</section>

<section id="vantagens" class="relative py-12 md:py-16 bg-white/80">
  <div class="container px-5 md:px-8 lg:px-20">
    <div class="flex flex-col gap-3">
      <p class="inline-flex items-center gap-2 text-[#7E82A2] text-[14px] font-semibold">
        <BadgeCheck size={18} class="text-[#EA6D0B]" />
        Por que organizar a emissão fiscal pelo F10
      </p>
      <h2
        class="text-[30px] md:text-[40px] lg:text-[46px]
               font-semibold leading-[1.12] tracking-[-0.015em] text-[#000A57]"
      >
        Menos portal solto. Mais controle. Mais previsibilidade.
      </h2>
      <p class="max-w-[820px] text-[#000A57]/75 text-[16px] leading-[1.8]">
        A emissão fiscal depende de regras públicas e disponibilidade dos órgãos oficiais. O papel do F10 é organizar esse caminho para a rotina da escola ficar mais clara, auditável e simples de acompanhar.
      </p>
    </div>

    <div class="mt-10 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
      {#each benefitCards as card}
        <article class="rounded-[24px] bg-white ring-1 ring-black/5 p-6 shadow-sm">
          <div
            class="flex h-12 w-12 items-center justify-center rounded-full bg-[#F3F4FD] ring-1 ring-black/5"
            aria-hidden="true"
          >
            <svelte:component this={card.icon} size={20} class="text-[#EA6D0B]" />
          </div>

          <h3 class="mt-4 text-[#010D28] font-semibold text-[20px]">
            {card.title}
          </h3>
          <p class="mt-2 text-[#7E82A2] text-[15px] leading-relaxed">
            {card.description}
          </p>
        </article>
      {/each}
    </div>
  </div>
</section>

<section id="como-funciona" class="relative py-12 md:py-16 bg-white">
  <div class="lg:container">
    <div class="relative overflow-hidden lg:rounded-[28px] bg-[#0A1533] text-white ring-1 ring-white/5">
      <div class="px-6 md:px-10 lg:px-14 py-12 md:py-16">
        <p class="flex items-center justify-center gap-4 pb-6 text-[#AEB3D9] text-[17px]">
          <span class="inline-block h-px w-12 bg-[#AEB3D9]"></span>
          <span>Cadastro guiado</span>
          <span class="inline-block h-px w-12 bg-[#AEB3D9]"></span>
        </p>

        <h2 class="mt-2 text-center text-[28px] sm:text-[34px] md:text-[40px] leading-[1.15] font-semibold">
          Da consulta da cidade até a emissão com status claro
        </h2>

        <div class="mt-10 grid gap-5 md:grid-cols-2 lg:grid-cols-4">
          {#each flowSteps as step}
            <article class="rounded-[18px] bg-white/5 ring-1 ring-white/10 p-5">
              <p class="text-[#EA6D0B] text-[13px] font-bold tracking-widest">{step.label}</p>
              <h3 class="mt-3 text-white font-semibold text-[18px] leading-snug">{step.title}</h3>
              <p class="mt-2 text-white/75 text-[14px] leading-relaxed">{step.description}</p>
            </article>
          {/each}
        </div>

        <div class="mt-10 flex flex-col sm:flex-row gap-4 justify-center">
          <a
            href={ctaHref}
            class="inline-flex items-center justify-center gap-3 rounded-[70px]
                   bg-[#EA6D0B] px-8 md:px-10 py-4 text-white text-[16px] font-bold
                   transition hover:brightness-110 focus:outline-none focus:ring-2
                   focus:ring-[#EA6D0B]/40"
          >
            <span>Começar cadastro fiscal</span>
            <ArrowRight size={22} />
          </a>

          <a
            href="#faq"
            class="inline-flex items-center justify-center gap-3 rounded-[70px]
                   border border-white/20 px-8 md:px-10 py-4 text-white text-[16px] font-semibold
                   transition hover:bg-white/10 focus:outline-none focus:ring-2
                   focus:ring-white/20"
          >
            <span>Tirar dúvidas rápidas</span>
            <ArrowRight size={22} class="text-[#EA6D0B]" />
          </a>
        </div>
      </div>

      <div class="pointer-events-none absolute inset-0 rounded-[28px] ring-1 ring-inset ring-white/10"></div>
    </div>
  </div>
</section>

<section id="faq" class="relative py-12 md:py-16 bg-white">
  <div class="container px-5 md:px-8 lg:px-20">
    <div class="flex items-center justify-between gap-6">
      <h2 class="text-[28px] md:text-[36px] font-semibold leading-tight text-[#000A57]">
        Perguntas frequentes
      </h2>

      <a
        href={ctaHref}
        class="hidden md:inline-flex items-center rounded-full border border-[#EA6D0B]
               px-4 py-2 text-[14px] font-semibold text-[#000A57]
               hover:bg-[#EA6D0B]/10 focus:outline-none focus:ring-2 focus:ring-[#EA6D0B]/40"
      >
        Iniciar cadastro
        <ArrowRight size={18} class="ml-2 text-[#EA6D0B]" />
      </a>
    </div>

    <div class="mt-8">
      <FaqAccordion items={faqItems} />
    </div>

    <div class="mt-8 rounded-[24px] bg-[#F3F4FD] ring-1 ring-black/5 p-6 md:p-8">
      <h3 class="text-[#010D28] font-semibold text-[20px]">
        A emissão fiscal não precisa virar uma operação paralela
      </h3>
      <p class="mt-2 text-[#7E82A2] text-[15px] leading-relaxed max-w-[820px]">
        Se sua escola já usa o F10 para financeiro, contratos e recebimentos, faz sentido centralizar também o caminho fiscal. O cadastro ajuda a entender a cobertura e a preparar o fluxo correto para sua operação.
      </p>

      <div class="mt-6">
        <a
          href={ctaHref}
          class="inline-flex items-center justify-center gap-3 rounded-[70px]
                 bg-[#EA6D0B] px-8 md:px-10 py-4 text-white text-[16px] font-bold
                 transition hover:brightness-110 focus:outline-none focus:ring-2
                 focus:ring-[#EA6D0B]/40"
        >
          <span>Ir para o cadastro</span>
          <ArrowRight size={22} />
        </a>
      </div>
    </div>
  </div>
</section>
