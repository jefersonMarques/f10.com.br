<script lang="ts">
  // ===== Imports =====
  import Breadcrumb from "$lib/components/Breadcrumb.svelte";
  import IconChartLine from "$lib/icons/IconChartLine.svelte";
  import IconDevicesLine from "$lib/icons/IconDevicesLine.svelte";
  import IconMegaPhoneLine from "$lib/icons/IconMegaPhoneLine.svelte";
  import IconStudantLine from "$lib/icons/IconStudantLine.svelte";
  import IconArrowRight from "$lib/icons/IconArrowRight.svelte";
  import FaqAccordion from "$lib/components/FaqAccordion.svelte";

  // ===== Tipos =====
  type Item = {
    title: string;       // aceita <br> via {@html}
    description: string;
    href: string;
    icon: typeof IconChartLine;
  };

  // ===== Conteúdo (ajustado à narrativa de INOVAÇÃO para Marketing Educacional) =====
  const items: Item[] = [
    {
      title: "Funil de matrículas<br/>com previsibilidade",
      description:
        "Interesse → Conversa → Visita/Proposta → Matrícula, com metas e pipeline por etapa e unidade.",
      href: "/solucoes/comercial",
      icon: IconChartLine,
    },
    {
      title: "Captação multicanal<br/>integrada ao CRM",
      description:
        "Origem por canal (site, WhatsApp, eventos) conectada ao histórico: nada se perde, tudo avança.",
      href: "/solucoes/comercial",
      icon: IconMegaPhoneLine,
    },
    {
      title: "Matrícula online<br/>com assinatura digital",
      description:
        "Documentos digitais e assinatura eletrônica reduzem abandono e aceleram a confirmação da vaga.",
      href: "/solucoes/portal-do-aluno",
      icon: IconStudantLine,
    },
    {
      title: "Comunicação<br/>que engaja famílias",
      description:
        "Mensagens segmentadas no app escolar (Android/iOS) e confirmação de leitura em avisos críticos.",
      href: "/solucoes/aplicativo-smart-aluno",
      icon: IconDevicesLine,
    },
  ];

  const kpis = [
    { value: "40%", label: "aumento médio em novas matrículas*" },
    { value: "3x",  label: "mais previsibilidade no funil*" },
    { value: "-28%", label: "abandono menor no fechamento*" },
  ];

  // ===== Assets =====
  const heroImage = "/inovacao_marketing_hero.webp";
  const secondaryImage = "/brainstorm.webp";

  // ===== FAQ (reaproveitando textos de documentação deste chat) =====
  const faqItems = [
    {
      question: "Como aumentar matrículas sem depender de indicações?",
      answer:
        "Com <strong>funil de matrículas</strong> e <strong>CRM educacional</strong>. A escola acompanha cada etapa (Interesse → Conversa → Visita/Proposta → Matrícula) e prioriza as conversas com maior chance de fechamento. O <strong>fechamento digital</strong> com assinatura eletrônica reduz abandono.",
    },
    {
      question: "Como trazer previsibilidade para a direção?",
      answer:
        "Através de <strong>metas e pipeline por etapa</strong> e por <strong>unidade</strong>. Você enxerga gargalos, redistribui esforço e ajusta ações por curso/turno. Os <strong>indicadores em tempo real</strong> mostram onde atuar.",
    },
    {
      question: "Captação multicanal (site e WhatsApp) integra ao CRM?",
      answer:
        "Sim. Site, WhatsApp e eventos ficam conectados ao <strong>histórico</strong> no CRM educacional, preservando origem e contexto. Nada se perde, tudo fica rastreável.",
    },
    {
      question: "A matrícula online ajuda a reduzir abandono na última etapa?",
      answer:
        "Sim. O fluxo digital com <strong>documentos eletrônicos</strong> e <strong>assinatura</strong> reduz atritos (papel, deslocamento e espera), agilizando a confirmação de vaga.",
    },
    {
      question: "Funciona para redes, franquias e multiunidades?",
      answer:
        "A F10 foi projetada para <strong>multiunidades</strong>, com visão consolidada para a mantenedora, <strong>auditoria por unidade</strong> e comparativos entre escolas e cursos.",
    },
  ];
</script>

<svelte:head>
  <title>Marketing Educacional — Inovação em Captação e Matrícula | F10 Software</title>
  <meta
    name="description"
    content="Inovação em Marketing Educacional para escolas: funil de matrículas com previsibilidade, captação multicanal integrada ao CRM e matrícula online com assinatura digital. Direção com metas e pipeline por etapa e unidade."
  />
  <meta property="og:title" content="Marketing Educacional — Inovação | F10 Software" />
  <meta
    property="og:description"
    content="Do primeiro contato ao contrato assinado: funil de matrículas visível, CRM educacional e matrícula online para previsibilidade e menos abandono."
  />
  <link rel="canonical" href="https://f10.com.br/inovacao-na-escola/marketing-educacional" />
  <!-- JSON-LD: Article + BreadcrumbList (SEO/LLMs) -->
  <script type="application/ld+json">
    {
      "@context":"https://schema.org",
      "@type":"Article",
      "headline":"Marketing Educacional — Inovação em Captação e Matrícula",
      "about":["Marketing educacional","CRM educacional","Funil de matrículas","Matrícula online","Captação multicanal","Previsibilidade de matrículas"],
      "publisher":{"@type":"Organization","name":"F10 Software"}
    }
  </script>
  <script type="application/ld+json">
    {
      "@context":"https://schema.org",
      "@type":"BreadcrumbList",
      "itemListElement":[
        {"@type":"ListItem","position":1,"name":"Início","item":"https://f10.com.br/"},
        {"@type":"ListItem","position":2,"name":"Inovação na Escola","item":"https://f10.com.br/inovacao-na-escola"},
        {"@type":"ListItem","position":3,"name":"Marketing Educacional","item":"https://f10.com.br/inovacao-na-escola/marketing-educacional"}
      ]
    }
  </script>
</svelte:head>

<!-- ===== HERO ===== -->
<section class="relative isolate overflow-hidden bg-white/60">
  <!-- Breadcrumb -->
  <div class="lg:px-20 sm:px-2 pb-12">
    <Breadcrumb
      baseUrl="https://f10.com.br"
      items={[
        { label: "HOME", href: "/" },
        { label: "INOVAÇÃO NA ESCOLA", href: "/inovacao-na-escola" },
        { label: "MARKETING EDUCACIONAL" }
      ]}
    />
  </div>

  <!-- Título + texto -->
  <div class="container pb-16">
    <h1
      class="max-w-[1100px] text-[#010D28] tracking-[-0.02em] leading-[1.08] text-[36px] sm:text-[44px] md:text-[52px] font-semibold"
    >
      Marketing educacional com funil visível, captação integrada e matrícula online
    </h1>

    <div class="mt-12 grid gap-10 lg:grid-cols-12 items-start">
      <!-- Texto -->
      <div class="lg:col-span-5">
        <h2 class="text-[#7E82A2] text-[27px] leading-snug">
          Da descoberta à matrícula, sem achismo e sem fricção
        </h2>

        <div class="mt-6 space-y-6 text-[#000A57]">
          <p class="text-[16px] leading-[1.8]">
            Estruture o <strong>funil de matrículas</strong> (Interesse → Conversa → Visita/Proposta → Matrícula) com
            <strong>metas</strong> e <strong>pipeline por etapa</strong>. Conecte <strong>site</strong>, <strong>WhatsApp</strong> e eventos ao
            <strong>CRM educacional</strong> para que nada se perca no caminho.
          </p>
          <p class="text-[16px] leading-[1.8]">
            Conclua com <strong>matrícula online</strong> e <strong>assinatura digital</strong>, reduzindo abandono na última etapa.
            Ganhe previsibilidade real para a <strong>direção</strong> com indicadores por curso, turno e unidade.
          </p>
        </div>
      </div>

      <!-- Imagem -->
      <div class="lg:col-span-7 mt-6 lg:mt-0">
        <div
          class="relative overflow-hidden rounded-[20px] md:rounded-[24px] ring-1 ring-black/5 shadow-[0_18px_50px_rgba(1,13,40,0.16)]"
        >
          <img
            src={heroImage}
            alt="Dashboard de funil de matrículas e CRM educacional em uso por equipe"
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

<!-- ===== SEÇÃO ESCURA — Linha de ícones + blocos (evitando excesso de cards) ===== -->
<section class="relative py-12 md:py-16 bg-white/80">
  <div class="lg:container lg:px-20">
    <div
      class="relative overflow-hidden lg:rounded-[28px] bg-[#0A1533] text-white ring-1 ring-white/5"
    >
      <div class="px-6 md:px-10 lg:px-14 py-12 md:py-16">
        <!-- Preheading -->
        <p
          class="flex items-center justify-center gap-4 pb-6 text-[#AEB3D9] text-[17px]"
        >
          <span class="inline-block h-px w-12 bg-[#AEB3D9]"></span>
          <span>Como sua escola evolui na prática</span>
          <span class="inline-block h-px w-12 bg-[#AEB3D9]"></span>
        </p>

        <!-- Título -->
        <h2
          class="mt-3 text-center text-[28px] sm:text-[34px] md:text-[40px] leading-[1.15] font-semibold"
        >
          Da captação ao fechamento com
          <span class="text-[#EA6D0B]">tecnologia F10</span>
        </h2>

        <!-- Linha superior com ícones -->
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

        <!-- Blocos lineares (sem grade pesada de cards) -->
        <div class="mt-10 space-y-8">
          {#each items as item}
            <article class="grid items-start gap-5 md:gap-6 lg:grid-cols-[120px_1fr_auto]">
              <!-- Ícone em telas pequenas -->
              <div class="lg:hidden">
                <div class="inline-flex h-[64px] w-[64px] items-center justify-center rounded-full bg-[#7E82A2]/40 ring-1 ring-white/15">
                  <svelte:component this={item.icon} />
                </div>
              </div>

              <!-- Texto -->
              <div>
                <h3 class="text-[21px] text-[#EA6D0B] font-semibold leading-snug">
                  {@html item.title}
                </h3>
                <p class="mt-2 text-[18px] leading-relaxed text-white/80">
                  {item.description}
                </p>
              </div>

              <!-- Link enxuto -->
              <div class="self-center">
                <a
                  href={item.href}
                  class="inline-flex items-center rounded-full border border-[#EA6D0B] px-5 py-2.5 text-[16px] font-semibold text-white transition hover:bg-[#EA6D0B]/10 focus:outline-none focus:ring-2 focus:ring-[#EA6D0B]/40"
                >
                  Ver solução
                </a>
              </div>
            </article>
          {/each}
        </div>

        <!-- Borda interna -->
        <div
          class="pointer-events-none absolute inset-0 rounded-[28px] ring-1 ring-inset ring-white/10"
        ></div>
      </div>
    </div>
  </div>
</section>

<!-- ===== KPIs ===== -->
<section class="relative py-14 md:py-16 bg-white">
  <div class="container px-5 md:px-8 lg:px-20">
    <h2
      class="text-[32px] md:text-[40px] lg:text-[48px] font-medium leading-[1.13] tracking-[-0.015em] text-[#000A57]"
    >
      Resultados práticos com <span class="text-[#EA6D0B]">inovação F10</span>
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
            class="mx-auto mt-3 max-w-[280px] text-[16px] md:text-[18px] leading-[1.33] text-[#000A57]/80"
          >
            {k.label}
          </p>
        </article>
      {/each}
    </div>

    <p class="mt-4 text-[12px] text-[#000A57]/50">
      *Estimativas baseadas em cases; variam conforme curso, região e operação.
    </p>
  </div>
</section>

<!-- ===== FAQ (componente existente) ===== -->
<section class="relative py-12 md:py-16 bg-white">
  <div class="container px-5 md:px-8 lg:px-20">
    <div class="flex items-center justify-between gap-6">
      <h2
        class="text-[28px] md:text-[36px] font-semibold leading-tight text-[#000A57]"
      >
        Perguntas frequentes
      </h2>
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

<!-- ===== BLOCO FINAL (autoridade/brand) ===== -->
<section class="relative py-12 md:py-16 bg-white/50">
  <div class="container px-5 md:px-8 lg:px-20">
    <div class="grid gap-10 lg:grid-cols-12 items-start">
      <!-- Texto -->
      <div class="lg:col-span-5 flex flex-col justify-center gap-6">
        <h2
          class="text-[#7E82A2] font-medium leading-[1.1] tracking-[-0.01em]
                 text-[36px] md:text-[44px] lg:text-[48px]"
        >
          Inovação que vira resultado
        </h2>

        <p class="text-[#000A57] text-[16px] leading-[1.8] max-w-[560px]">
          A F10 integra captação, ensino, relacionamento e finanças em uma única plataforma.
          Ideal para <strong>multiunidades</strong> e redes, com <strong>auditoria por unidade</strong> e indicadores
          em tempo real para apoiar decisões da direção.
        </p>

        <div class="pt-2">
          <a
            href="/solucoes"
            class="inline-flex items-center justify-center gap-3 rounded-[70px]
            bg-[#EA6D0B] px-8 md:px-10 py-4 text-white text-[16px] font-bold
            transition hover:brightness-110 focus:outline-none focus:ring-2
            focus:ring-[#EA6D0B]/40"
          >
            <span>Ver Hub de Soluções</span>
            <IconArrowRight size={24} />
          </a>
        </div>
      </div>

      <!-- Imagem -->
      <div class="lg:col-span-7">
        <div
          class="relative h-[360px] sm:h-[420px] md:h-[503px]
                 overflow-hidden rounded-[16px] ring-1 ring-black/5
                 shadow-[0_18px_50px_rgba(1,13,40,0.16)]"
        >
          <img
            src={secondaryImage}
            alt="Equipe da F10 apoiando gestão escolar com tecnologia"
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
  /* Mantido o padrão visual do seu projeto; sem novos componentes além do FAQ já existente. */
</style>
