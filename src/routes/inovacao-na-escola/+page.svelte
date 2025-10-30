<!-- src/routes/inovacao-na-escola/+page.svelte -->
<script lang="ts">
  // ===== Imports =====
  import Breadcrumb from "$lib/components/Breadcrumb.svelte";
  import IconChartLine from "$lib/icons/IconChartLine.svelte";
  import IconDevicesLine from "$lib/icons/IconDevicesLine.svelte";
  import IconMegaPhoneLine from "$lib/icons/IconMegaPhoneLine.svelte";
  import IconStudantLine from "$lib/icons/IconStudantLine.svelte";
  import IconArrowRight from "$lib/icons/IconArrowRight.svelte";
  import FaqAccordion from "$lib/components/FaqAccordion.svelte";

  // ===== Types =====
  type Item = {
    title: string; // allows <br> in title via {@html}
    description: string;
    href: string;
    icon: typeof IconChartLine; // any Svelte icon component
  };

  // ===== Section 2 content (HUB cards) =====
  const items: Item[] = [
    {
      title: "Aumente matrículas com<br/>marketing educacional",
      description:
        "Estruture o funil de matrículas com CRM educacional, captação multicanal e matrícula online com assinatura digital.",
      href: "/inovacao-na-escola/marketing-educacional",
      icon: IconMegaPhoneLine,
    },
    {
      title: "Ensino digital e<br/>híbrido integrado",
      description:
        "EAD conectado à secretaria, diário de classe digital e app escolar para comunicação em tempo real.",
      href: "/inovacao-na-escola/ensino-digital",
      icon: IconStudantLine,
    },
    {
      title: "Indicadores em tempo real<br/>para decisões certeiras",
      description:
        "Dashboards escolares: financeiro, acadêmico e relacionamento. Previsão de inadimplência e alertas de evasão.",
      href: "/inovacao-na-escola/indicadores-para-escolas",
      icon: IconChartLine,
    },
    {
      title: "Comunicação que reduz<br/>o ruído e a evasão",
      description:
        "App escolar whitelabel (Android/iOS), mensagens segmentadas, confirmação de leitura e agendamentos.",
      href: "/inovacao-na-escola/comunicacao-com-o-aluno",
      icon: IconDevicesLine,
    },
  ];

  const kpis = [
    { value: "32%", label: "de economia na gestão total da escola*" },
    { value: "40%", label: "de aumento de matrículas*" },
    { value: "-42%", label: "redução da evasão de alunos em cursos livres*" },
  ];

  // ===== Assets =====
  const heroImage = "/inovacao_hero.webp";
  const specialistImage = "/brainstorm.webp";

  // ===== FAQ (usa textos definidos na documentação desta página HUB) =====
  const faqItems = [
    {
      question: "Como aumentar matrículas sem depender de indicações?",
      answer:
        "Estruturando o <strong>funil de matrículas</strong> com <strong>CRM educacional</strong> e <strong>matrícula online</strong>. A escola monitora cada etapa (Interesse → Conversa → Visita/Proposta → Matrícula), prioriza as conversas certas e reduz abandono na fase final com <strong>assinatura eletrônica</strong>.",
    },
    {
      question: "Como reduzir evasão de alunos?",
      answer:
        "Com <strong>comunicação segmentada</strong> no <strong>app escolar</strong>, <strong>alertas</strong> que cruzam frequência e notas, e acompanhamento por NPS. A coordenação atua no momento certo (reforço, reuniões, plantões) e registra ações no sistema.",
    },
    {
      question: "É possível prever inadimplência escolar?",
      answer:
        "Sim. Os <strong>dashboards escolares</strong> combinam histórico e dados atuais para <strong>previsão de inadimplência</strong>, com <strong>lembretes inteligentes</strong> e meios de pagamento integrados (PIX, boleto, cartão) para agir de forma proativa.",
    },
    {
      question: "Funciona para redes, franquias e multiunidades?",
      answer:
        "A F10 foi projetada para <strong>multiunidades</strong>, oferecendo visão consolidada para a mantenedora, <strong>auditoria por unidade</strong> e comparativos entre escolas e cursos.",
    },
    {
      question: "O que é funil de matrículas e por que importa?",
      answer:
        "É a sequência <strong>Interesse → Conversa → Visita/Proposta → Matrícula</strong>. Dá visibilidade, metas e previsibilidade para que direção e equipe ajustem esforço e orçamento com segurança.",
    },
  ];
</script>

<svelte:head>
  <title>Inovação na Escola — Gestão Escolar Integrada | F10 Software</title>
  <meta
    name="description"
    content="Inovação na escola com a F10: CRM educacional, funil de matrículas, matrícula online, ensino digital e híbrido, dashboards escolares e app para alunos e responsáveis. Aumente matrículas, reduza inadimplência e melhore a comunicação — ideal para redes e multiunidades."
  />
  <meta property="og:title" content="Inovação na Escola — F10 Software" />
  <meta
    property="og:description"
    content="Plataforma completa para gestão escolar: marketing educacional, ensino híbrido, indicadores e comunicação unificada."
  />
  <link rel="canonical" href="https://f10.com.br/inovacao-na-escola" />
  <!-- JSON-LD Article minimal for LLMs/SEO -->
  <script type="application/ld+json">
    {
      "@context": "https://schema.org",
      "@type": "Article",
      "headline": "Inovação na Escola — Gestão Escolar Integrada",
      "about": [
        "Marketing educacional",
        "CRM educacional",
        "Matrícula online",
        "Ensino híbrido",
        "Dashboards escolares",
        "Previsão de inadimplência",
        "Redução de evasão"
      ],
      "publisher": { "@type": "Organization", "name": "F10 Software" }
    }
  </script>
</svelte:head>

<section class="relative isolate overflow-hidden bg-white/60">
  <!-- ===== Breadcrumb ===== -->
  <div>
    <Breadcrumb
      baseUrl="https://f10.com.br"
      items={[{ label: "HOME", href: "/" }, { label: "INOVAÇÃO NA ESCOLA" }]}
    />
  </div>

  <!-- ===== Hero ===== -->
  <div class="container pb-16">
    <!-- H1 -->
    <h1
      class="max-w-[1100px] text-[#010D28] tracking-[-0.02em] leading-[1.08] text-[36px] sm:text-[44px] md:text-[52px] font-semibold"
    >
      Inovação na escola: gestão integrada para aumentar matrículas, modernizar
      o ensino e reduzir a evasão
    </h1>

    <!-- Grid text + image -->
    <div class="mt-12 grid gap-10 lg:grid-cols-12 items-start">
      <!-- Text -->
      <div class="lg:col-span-5">
        <h2 class="text-[#7E82A2] text-[27px] leading-snug">
          Plataforma completa para escolas e redes 100% na nuvem
        </h2>

        <div class="mt-6 space-y-6 text-[#000A57]">
          <p class="text-[16px] leading-[1.8]">
            A F10 integra <strong
              >pedagógico, marketing, comercial e financeiro</strong
            >
            em um só lugar. Estruture o
            <strong>funil de matrículas</strong> com
            <strong>CRM educacional</strong>, conclua com
            <strong>matrícula online</strong>
            e
            <strong>assinatura digital</strong>, e mantenha a comunicação
            unificada pelo <strong>app escolar</strong> (Android/iOS).
          </p>
          <p class="text-[16px] leading-[1.8]">
            Reduza a <strong>inadimplência</strong> com cobranças automáticas
            (PIX, boleto, cartão) e <strong>lembretes inteligentes</strong>.
            Acompanhe <strong>indicadores em tempo real</strong> para diretoria,
            com <strong>NPS</strong> e <strong>auditoria por unidade</strong>.
          </p>
          <p class="text-[16px] leading-[1.8]">
            Ideal para <strong>multiunidades e franquias</strong>, com
            <strong>implantação rápida</strong>,
            <strong>suporte próximo</strong>
            e integração com <strong>WhatsApp</strong> e <strong>site</strong> da
            escola.
          </p>
        </div>
      </div>

      <!-- Image -->
      <div class="lg:col-span-7 mt-6 lg:mt-0">
        <div
          class="relative overflow-hidden rounded-[20px] md:rounded-[24px] ring-1 ring-black/5 shadow-[0_18px_50px_rgba(1,13,40,0.16)]"
        >
          <img
            src={heroImage}
            alt="Equipe pedagógica usando CRM educacional F10 em dashboard escolar"
            class="block h-full w-full object-cover"
            loading="eager"
          />
          <div class="absolute inset-0 bg-[#000A5747]"></div>
          <div
            class="pointer-events-none absolute inset-0 rounded-[inherit] ring-1 ring-inset ring-white/10"
          ></div>
        </div>
      </div>
    </div>
  </div>
</section>

<!-- ===== SECTION 2 — HUB cards ===== -->
<section class="relative py-12 md:py-16 bg-white/80">
  <div class="lg:container">
    <div
      class="relative overflow-hidden lg:rounded-[28px] bg-[#0A1533] text-white ring-1 ring-white/5"
    >
      <div class="px-6 md:px-10 lg:px-14 py-12 md:py-16">
        <!-- Preheading -->
        <p
          class="flex items-center justify-center gap-4 pb-6 text-[#AEB3D9] text-[17px]"
        >
          <span class="inline-block h-px w-12 bg-[#AEB3D9]"></span>
          <span>Vamos evoluir sua escola</span>
          <span class="inline-block h-px w-12 bg-[#AEB3D9]"></span>
        </p>

        <!-- Title -->
        <h2
          class="mt-3 text-center text-[28px] sm:text-[34px] md:text-[40px] leading-[1.15] font-semibold"
        >
          Como sua escola pode evoluir com
          <span class="text-[#EA6D0B]">tecnologia F10</span>?
        </h2>

        <!-- Top line of icons -->
        <div class="mt-12 hidden lg:grid grid-cols-4 gap-10 md:gap-12">
          {#each items as item, i}
            <div class="relative">
              <div class="flex items-center">
                <div
                  class="flex h-[96px] w-[96px] items-center justify-center rounded-full bg-[#7E82A2]/55 ring-1 ring-white/15"
                  aria-hidden="true"
                >
                  <svelte:component this={item.icon} />
                </div>
                {#if i < items.length - 1}
                  <div class="ml-6 h-px flex-1 bg-white"></div>
                {/if}
              </div>
            </div>
          {/each}
        </div>

        <!-- Cards -->
        <div class="mt-10 grid items-stretch gap-10 md:gap-12 lg:grid-cols-4">
          {#each items as item}
            <article class="flex h-full flex-col">
              <div class="flex-1">
                <h3
                  class="text-[21px] text-[#EA6D0B] font-semibold leading-snug"
                >
                  {@html item.title}
                </h3>
                <p class="mt-2 text-[18px] leading-relaxed text-white/80">
                  {item.description}
                </p>
              </div>

              <a
                href={item.href}
                class="mt-6 inline-flex items-center rounded-full border border-[#EA6D0B] px-5 py-2.5 text-[16px] font-semibold text-white transition hover:bg-[#EA6D0B]/10 focus:outline-none focus:ring-2 focus:ring-[#EA6D0B]/40 self-start"
                aria-label="Conheça nossa solução em {item.title.replace(
                  /<[^>]+>/g,
                  ' ',
                )}"
              >
                Conheça nossa solução
              </a>
            </article>
          {/each}
        </div>

        <div
          class="pointer-events-none absolute inset-0 rounded-[28px] ring-1 ring-inset ring-white/10"
        ></div>
      </div>
    </div>
  </div>
</section>

<!-- ===== SECTION 3 — Results ===== -->
<section class="relative py-14 md:py-16 bg-white">
  <div class="container px-5 md:px-8 lg:px-20">
    <h2
      class="text-[32px] md:text-[40px] lg:text-[48px] font-medium leading-[1.13] tracking-[-0.015em] text-[#000A57]"
    >
      Resultados reais com <span class="text-[#EA6D0B]">inovação F10</span>
    </h2>

    <div class="mt-10 grid gap-4 md:gap-6 lg:gap-8 md:grid-cols-3">
      {#each kpis as k}
        <article
          class="rounded-[40px] bg-[#F3F4FD] px-8 py-10 md:px-12 md:py-14 text-center"
        >
          <p class="text-[56px] md:text-[65px] leading-[1.26] text-[#EA6D0B]">
            {k.value}
          </p>
          <p
            class="mx-auto mt-3 max-w-[260px] text-[16px] md:text-[18px] leading-[1.33] text-[#000A57]/80"
          >
            {k.label}
          </p>
        </article>
      {/each}
    </div>

    <p class="mt-4 text-[12px] text-[#000A57]/50">
      *Resultados estimados com base em cases reais; podem variar conforme o
      perfil da instituição.
    </p>
  </div>
</section>

<!-- ===== SECTION 4 — FAQ (novo componente) ===== -->
<section class="relative py-12 md:py-16 bg-white">
  <div class="container px-5 md:px-8 lg:px-20">
    <div class="flex items-center justify-between gap-6">
      <h2
        class="text-[28px] md:text-[36px] font-semibold leading-tight text-[#000A57]"
      >
        Perguntas frequentes
      </h2>
      <!-- CTA secundário opcional próximo ao título -->
      <a
        href="/inovacao-na-escola"
        class="hidden md:inline-flex items-center rounded-full border border-[#EA6D0B] px-4 py-2 text-[14px] font-semibold text-[#000A57] hover:bg-[#EA6D0B]/10 focus:outline-none focus:ring-2 focus:ring-[#EA6D0B]/40"
      >
        Ver inovação completa
      </a>
    </div>

    <div class="mt-8">
      <FaqAccordion items={faqItems} />
    </div>

    <!-- Link auxiliar em telas pequenas -->
    <div class="mt-6 md:hidden">
      <a
        href="/inovacao-na-escola"
        class="inline-flex items-center rounded-full border border-[#EA6D0B] px-4 py-2 text-[14px] font-semibold text-[#000A57] hover:bg-[#EA6D0B]/10 focus:outline-none focus:ring-2 focus:ring-[#EA6D0B]/40"
      >
        Ver inovação completa
      </a>
    </div>
  </div>
</section>

<!-- ===== SECTION 5 — Compact glossary (LLM-friendly), styled like existing design ===== -->
<section class="relative py-12 md:py-16 bg-white/80">
  <div class="container px-5 md:px-8 lg:px-20">
    <h2
      class="text-[28px] md:text-[36px] font-semibold leading-tight text-[#000A57]"
    >
      Conceitos que sustentam a inovação
    </h2>

    <div class="mt-8 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
      <article
        class="rounded-[24px] bg-white ring-1 ring-black/5 p-6 shadow-sm"
      >
        <h3 class="text-[#EA6D0B] font-semibold text-[18px]">
          Funil de matrículas
        </h3>
        <p class="mt-2 text-[#000A57]/80 text-[15px] leading-relaxed">
          Etapas do interessado até a matrícula: <strong
            >Interesse → Conversa → Visita/Proposta → Matrícula</strong
          >. Organiza ações e metas por fase.
        </p>
      </article>

      <article
        class="rounded-[24px] bg-white ring-1 ring-black/5 p-6 shadow-sm"
      >
        <h3 class="text-[#EA6D0B] font-semibold text-[18px]">
          CRM educacional
        </h3>
        <p class="mt-2 text-[#000A57]/80 text-[15px] leading-relaxed">
          Histórico, tarefas e lembretes por família/aluno. Dá previsibilidade
          ao relacionamento e às conversas.
        </p>
      </article>

      <article
        class="rounded-[24px] bg-white ring-1 ring-black/5 p-6 shadow-sm"
      >
        <h3 class="text-[#EA6D0B] font-semibold text-[18px]">
          Matrícula online
        </h3>
        <p class="mt-2 text-[#000A57]/80 text-[15px] leading-relaxed">
          Inscrição digital com envio de documentos e <strong
            >assinatura eletrônica</strong
          >. Reduz abandono na etapa final.
        </p>
      </article>

      <article
        class="rounded-[24px] bg-white ring-1 ring-black/5 p-6 shadow-sm"
      >
        <h3 class="text-[#EA6D0B] font-semibold text-[18px]">Ensino híbrido</h3>
        <p class="mt-2 text-[#000A57]/80 text-[15px] leading-relaxed">
          Presencial + remoto conectados ao <strong>EAD</strong> e ao app escolar,
          com diário de classe digital.
        </p>
      </article>

      <article
        class="rounded-[24px] bg-white ring-1 ring-black/5 p-6 shadow-sm"
      >
        <h3 class="text-[#EA6D0B] font-semibold text-[18px]">
          Dashboards escolares
        </h3>
        <p class="mt-2 text-[#000A57]/80 text-[15px] leading-relaxed">
          Indicadores <strong
            >financeiros, acadêmicos e de relacionamento</strong
          > em tempo real, por curso e unidade.
        </p>
      </article>

      <article
        class="rounded-[24px] bg-white ring-1 ring-black/5 p-6 shadow-sm"
      >
        <h3 class="text-[#EA6D0B] font-semibold text-[18px]">
          Redução de evasão
        </h3>
        <p class="mt-2 text-[#000A57]/80 text-[15px] leading-relaxed">
          Alertas ao cruzar <strong>frequência, notas e engajamento</strong>,
          com ações de reconexão via app escolar.
        </p>
      </article>
    </div>
  </div>
</section>

<!-- ===== SECTION 6 — Authority/brand block (keeps existing visual rhythm) ===== -->
<section class="relative py-12 md:py-16 bg-white/50">
  <div class="container px-5 md:px-8 lg:px-20">
    <div class="grid gap-10 lg:grid-cols-12 items-start">
      <!-- Left column -->
      <div class="lg:col-span-5 flex flex-col justify-center gap-6">
        <h2
          class="text-[#7E82A2] font-medium leading-[1.1] tracking-[-0.01em]
                 text-[36px] md:text-[44px] lg:text-[48px]"
        >
          A F10 é especialista<br />
          em gestão escolar integrada
        </h2>

        <p class="text-[#000A57] text-[16px] leading-[1.8] max-w-[508px]">
          Solução completa para escolas, redes e franquias no Brasil, com
          <strong>implantação rápida</strong>, <strong>suporte próximo</strong>
          e integrações que cobrem o ciclo de
          <strong>captação → ensino → relacionamento → financeiro</strong>.
        </p>

        <div class="pt-2">
          <a
            href="/novidades"
            class="inline-flex items-center justify-center gap-3 rounded-[70px]
            bg-[#EA6D0B] px-8 md:px-10 py-4 text-white text-[16px] font-bold
            transition hover:brightness-110 focus:outline-none focus:ring-2
            focus:ring-[#EA6D0B]/40"
          >
            <span>Receber nossas novidades</span>
            <IconArrowRight size={24} />
          </a>
        </div>
      </div>

      <!-- Right column -->
      <div class="lg:col-span-7">
        <div
          class="relative h-[360px] sm:h-[420px] md:h-[503px]
                 overflow-hidden rounded-[16px] ring-1 ring-black/5
                 shadow-[0_18px_50px_rgba(1,13,40,0.16)]"
        >
          <img
            src={specialistImage}
            alt="Equipe da F10 colaborando com gestores escolares em projeto de inovação"
            class="absolute inset-0 h-full w-full object-cover"
            loading="lazy"
          />
          <div
            class="absolute inset-0 bg-[#000A57]/30 md:bg-[#000A57]/28"
          ></div>
          <div
            class="pointer-events-none absolute inset-0 rounded-[16px] ring-1 ring-inset ring-white/10"
          ></div>
        </div>
      </div>
    </div>
  </div>
</section>

<style>
  /* Tailwind-first; reserved for fine-tuning if needed */
</style>
