<script lang="ts">
  import AnFunnel from "$lib/components/AnFunnel.svelte";
  import FaqAccordion from "$lib/components/FaqAccordion.svelte";
  import IconArrowRight from "$lib/icons/IconArrowRight.svelte";
  import { contactModalConfig } from "$lib/stores/contactModals";
  import { showForm } from "$lib/stores/formPopup";
  import {
    CalendarCheck,
    Funnel,
    FileDown,
    PhoneCall,
    Users,
    TrendingUp,
  } from "lucide-svelte";

  // ===== Tipos =====
  type Step = {
    label: string;
    title: string;
    description: string;
  };

  type FunnelStage = {
    level: string;
    title: string;
    description: string;
    maxWidthClass: string;
  };

  type FaqItem = {
    question: string;
    answer: string;
  };

  type SourceRow = {
    source: string;
    media: string;
    conversion: string;
  };

  // ===== Conteúdos =====

  // Agora focado em Marketing & Prospecção (não no dia a dia do time comercial)
  const steps: Step[] = [
    {
      label: "Etapa 1",
      title: "Campanhas conectadas em tempo real",
      description:
        "Meta Ads, Google Ads, formulários, WhatsApp e indicações caem direto no F10 como leads, já vinculados a curso, unidade, campanha, fonte e fornecedor de mídia.",
    },
    {
      label: "Etapa 2",
      title: "Listas organizadas e prontas para ação",
      description:
        "O módulo de Marketing centraliza listas de prospecção, importações em massa e leads de remessas. Você enxerga macrocaptação, reciclagem, repique e qualidade por origem, sem criar novas planilhas a cada campanha.",
    },
    {
      label: "Etapa 3",
      title: "Indicadores de marketing e passagem de bastão",
      description:
        "Com custo por lead, custo por matrícula estimada, desempenho por campanha e por fornecedor, o marketing entrega leads qualificados para o módulo Comercial, com clareza sobre o que está funcionando de verdade.",
    },
  ];

  // Funil reposicionado como funil de marketing & captação
  const funnelStages: FunnelStage[] = [
    {
      level: "ALCANCE",
      title: "Público impactado pelas campanhas",
      description:
        "Suas campanhas rodam em Meta Ads, Google e outros canais, trazendo cliques e visitas para páginas, formulários ou WhatsApp. O F10 registra as Fontes e Eventos, permitindo entender quais ações realmente geram intenção, não só impressões.",
      maxWidthClass: "max-w-3xl",
    },
    {
      level: "LEADS",
      title: "Contatos gerados e identificados",
      description:
        "Quem preenche um formulário, pede informação pelo WhatsApp ou responde a uma lista de prospecção vira lead dentro do F10, com origem, curso desejado, unidade e dados mínimos para contato. Aqui nascem os indicadores de custo por lead e volume de captação.",
      maxWidthClass: "max-w-2xl",
    },
    {
      level: "OPORTUNIDADES",
      title: "Leads aquecidos prontos para o Comercial",
      description:
        "À medida que o marketing qualifica listas, remove duplicidades e melhora formulários, parte dos leads se transforma em oportunidades claras para o time comercial. O módulo de Marketing mostra quais campanhas geram leads de melhor qualidade, não só quantidade.",
      maxWidthClass: "max-w-xl",
    },
    {
      level: "MATRÍCULAS",
      title: "Resultado real das ações de marketing",
      description:
        "Quando o módulo Comercial converte oportunidades em matrículas, o F10 devolve para o Marketing os dados de fechamento. Assim, você consegue enxergar custo por matrícula, retorno por canal e por fornecedor, e tomar decisões de investimento com segurança.",
      maxWidthClass: "max-w-lg",
    },
  ];

  const faqItems: FaqItem[] = [
    {
      question:
        "Já usamos planilhas e WhatsApp, o F10 realmente faz diferença?",
      answer:
        "Sim. Planilhas funcionam até certo ponto, mas não avisam quem está sem retorno, não organizam as fontes de leads e não conectam campanhas com matrículas. No F10, cada lead entra organizado por curso, unidade e origem, passa por etapas do funil de marketing e segue para o módulo Comercial com muito mais clareza.",
    },
    {
      question:
        "Minha equipe não é muito ‘de tecnologia’. Eles vão conseguir usar?",
      answer:
        "O F10 foi pensado para rotina de escola: tela única com lista de leads, estágios claros, filtros por campanha e integração com WhatsApp. O consultor e o time de marketing basicamente seguem as filas, registram as ações e acompanham os indicadores. Na implantação, configuramos o funil junto com você para que o dia a dia fique simples, sem telas escondidas nem menus confusos.",
    },
    {
      question: "Funciona para escolas pequenas ou só para grandes redes?",
      answer:
        "Funciona para os dois. Em escolas menores, o F10 tira tudo de planilha e centraliza os contatos de campanha em um único lugar, mesmo com equipe enxuta. Em redes maiores, ganha importância o controle por unidade, comparativo entre cursos, metas por equipe e relatórios consolidados para direção e marketing.",
    },
    {
      question: "Vou precisar mudar todos os processos de uma vez?",
      answer:
        "Não. Muitas escolas começam conectando as principais Fontes e Eventos, organizando apenas o funil de marketing e a captação de leads. Depois, à medida que a equipe se adapta, é possível avançar para o módulo Comercial, contratos, financeiro e demais módulos. O importante é ter, desde o início, um fluxo claro do anúncio até o lead qualificado.",
    },
    {
      question:
        "O módulo de Marketing funciona mesmo sem um time de marketing estruturado?",
      answer:
        "Funciona. Mesmo com tráfego terceirizado ou uma única pessoa cuidando da captação, as campanhas são registradas em Fontes e Eventos, os leads entram automaticamente via formulários, integrações ou importações, e a escola passa a trabalhar com um funil organizado, em vez de várias planilhas soltas.",
    },
    {
      question: "Como funciona a implantação e o suporte do F10?",
      answer:
        "Na implantação, configuramos com você as Fontes e Eventos, principais funis, estágios e perfis de usuários. A equipe recebe treinamento prático com exemplos reais da sua escola. Depois disso, você conta com suporte contínuo para dúvidas, ajustes e inclusão de novos usuários. A ideia é que o módulo de Marketing faça parte do dia a dia, não seja apenas mais um software contratado.",
    },
  ];

  const sourceRows: SourceRow[] = [
    { source: "Matrículas 2025", media: "facebook-ads", conversion: "18,40 %" },
    { source: "EM Integral", media: "facebook-ads", conversion: "12,75 %" },
    { source: "Rematrícula", media: "facebook-ads", conversion: "32,10 %" },
    { source: "Indicações", media: "Indicação", conversion: "45,00 %" },
    { source: "Lista WhatsApp", media: "whatsapp", conversion: "27,50 %" },
    { source: "Curso Técnico", media: "google-ads", conversion: "9,80 %" },
    { source: "Site Escola", media: "Google", conversion: "14,20 %" },
    { source: "Feira Profissões", media: "Evento", conversion: "22,00 %" },
    { source: "Leads Importados", media: "Importação", conversion: "6,40 %" },
    { source: "Bolsa Estudos", media: "instagram", conversion: "11,30 %" },
  ];

  const sourceIcons = [
    { alt: "Facebook Ads", src: "/icon_facebook.webp" },
    { alt: "Google Ads", src: "/icon_google.webp" },
    { alt: "E-mail marketing", src: "/icon_mail.webp" },
    { alt: "WhatsApp", src: "/icon_whatsApp.webp" },
  ];

  const apiIcon = { alt: "Integração via API", src: "/api.webp" };

  function openMarketingModal() {
    contactModalConfig.set({
      defaultMessage: "Quero agendar uma demonstração do Marketing",
      product: "F10 – Marketing",
      subSource: "Modal Marketing – dobra 1",
      leadDescription: "Contato iniciado pelo formulário do menu.",
    });

    showForm.set(true);
  }
</script>

<svelte:head>
  <title>
    Marketing e captação de alunos — campanhas conectadas ao CRM | F10 Software
  </title>
  <meta
    name="description"
    content="O módulo de Marketing da F10 conecta campanhas, formulários e APIs ao CRM e aos funis de vendas. Controle Fontes e Eventos, leads, listas de prospecção e ROI por canal, com visão clara de quais ações realmente geram matrículas."
  />
  <meta
    property="og:title"
    content="Marketing e captação de alunos — campanhas conectadas ao CRM | F10 Software"
  />
  <meta
    property="og:description"
    content="Centralize suas campanhas de marketing educacional no F10: receba leads por formulários e APIs, organize listas de prospecção e conecte o módulo de Marketing ao CRM para enxergar o impacto real em matrículas."
  />
  <link rel="canonical" href="https://f10.com.br/solucoes/marketing" />

  <!-- JSON-LD: SoftwareApplication -->
  <script type="application/ld+json">
    {
      "@context": "https://schema.org",
      "@type": "SoftwareApplication",
      "name": "Módulo de Marketing e Captação de Alunos F10",
      "applicationCategory": "BusinessApplication",
      "operatingSystem": "Web",
      "description": "Módulo de Marketing da plataforma F10 que centraliza campanhas, Fontes e Eventos, leads, listas de prospecção, integrações com formulários e APIs, funis e relatórios de ROI com visão de impacto em matrículas.",
      "provider": {
        "@type": "Organization",
        "name": "F10 Software"
      }
    }
  </script>

  <!-- JSON-LD: BreadcrumbList -->
  <script type="application/ld+json">
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      "itemListElement": [
        {
          "@type": "ListItem",
          "position": 1,
          "name": "Início",
          "item": "https://f10.com.br/"
        },
        {
          "@type": "ListItem",
          "position": 2,
          "name": "Soluções",
          "item": "https://f10.com.br/solucoes"
        },
        {
          "@type": "ListItem",
          "position": 3",
          "name": "Marketing e Captação",
          "item": "https://f10.com.br/solucoes/marketing"
        }
      ]
    }
  </script>

  <!-- JSON-LD: FAQPage (versão resumida das objeções principais) -->
  <script type="application/ld+json">
    {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      "mainEntity": [
        {
          "@type": "Question",
          "name": "Já usamos planilhas e WhatsApp, o F10 realmente faz diferença?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "Sim. Planilhas não organizam as fontes de leads nem conectam campanhas com matrículas. No F10, cada lead entra com origem, curso e unidade definidos e segue por um funil estruturado, facilitando o trabalho do time de marketing e do Comercial."
          }
        },
        {
          "@type": "Question",
          "name": "Minha equipe não é muito ‘de tecnologia’. Eles vão conseguir usar?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "O F10 foi pensado para equipes de escola, com telas simples de leads, estágios claros, filtros por campanha e treinamento na implantação."
          }
        },
        {
          "@type": "Question",
          "name": "Funciona para escolas pequenas ou só para grandes redes?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "Funciona para escolas de todos os portes. Em escolas menores, centraliza planilhas e contatos. Em redes, permite visão consolidada por unidade, curso e campanha."
          }
        },
        {
          "@type": "Question",
          "name": "Vou precisar mudar todos os processos de uma vez?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "Não. É possível começar apenas conectando as principais Fontes e Eventos e organizando o funil de marketing, evoluindo depois para o módulo Comercial e outros recursos."
          }
        },
        {
          "@type": "Question",
          "name": "O módulo de Marketing funciona mesmo sem um time de marketing estruturado?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "Sim. Mesmo com time enxuto ou tráfego terceirizado, as campanhas são registradas em Fontes e Eventos e os leads entram automaticamente em listas e funis no F10."
          }
        }
      ]
    }
  </script>
</svelte:head>

<!-- =================================================================== -->
<!-- 1. HERO - MARKETING E CAPTAÇÃO                                      -->
<!-- =================================================================== -->

<section
  class="relative overflow-hidden border-b border-slate-200"
  aria-label="Seção principal — Marketing e captação F10"
>
  <div
    class="container relative z-10 grid grid-cols-1 gap-12 py-16 md:grid-cols-12 md:gap-8 lg:py-24"
  >
    <!-- COLUNA ESQUERDA -->
    <div class="lg:col-span-6 lg:mr-[-80px]">
      <div
        class="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1
               text-[12px] font-medium text-slate-700"
      >
        <span class="inline-block h-2 w-2 rounded-full bg-primary"></span>
        <span>Marketing e captação integrados ao CRM F10</span>
      </div>

      <h1 class="h1-display text-dark mt-4">
        Marketing e captação
        <br />
        focados em matrícula
      </h1>

      <p class="mt-8 max-w-[620px] text-soft">
        Traga leads do Meta Ads, Google Ads, formulários, listas de prospecção e
        APIs direto para o F10. Organize Fontes e Eventos, compare campanhas e
        enxergue o impacto real das ações de marketing em novas matrículas.
      </p>

      <div
        class="mt-10 md:mt-12 flex flex-col md:flex-row items-center md:items-center gap-4 md:gap-8
               justify-center md:justify-start text-center md:text-left w-full"
      >
        <button
          type="button"
          on:click={openMarketingModal}
          class="inline-flex h-[52px] items-center justify-center rounded-full bg-primary
                 px-8 text-[16px] font-semibold leading-[22px] tracking-[-0.02em] text-white
                 hover:brightness-95 active:brightness-90 transition w-full md:w-auto"
        >
          Agendar demonstração
          <IconArrowRight size={24} classType="ml-4" />
        </button>

        <a
          href="/solucoes/comercial"
          class="text-[16px] font-semibold text-text underline decoration-2 underline-offset-[6px]
                 hover:text-primary w-full md:w-auto md:pl-4"
        >
          Ver módulo Comercial / CRM
        </a>
      </div>

      <!-- Linha de funcionalidades -->
      <div class="mt-12 md:mt-14">
        <div
          class="flex flex-col md:flex-row items-center md:items-center w-full gap-4 md:gap-6"
        >
          <p
            class="text-xs font-bold tracking-wider text-slate-900
                   text-center md:text-left w-full md:w-auto md:whitespace-nowrap"
          >
            Funcionalidades
          </p>

          <div
            class="flex justify-center md:justify-start flex-wrap md:flex-nowrap
                     gap-4 md:gap-8 mt-1 md:mt-0 w-full md:w-auto"
          >
            <div
              class="inline-flex items-center gap-2 text-[14px] text-slate-700"
            >
              <span
                class="inline-flex h-7 w-7 p-[6px] items-center justify-center rounded-full bg-slate-100"
              >
                <CalendarCheck />
              </span>
              <span>Fontes e eventos</span>
            </div>

            <div
              class="inline-flex items-center gap-2 text-[14px] text-slate-700"
            >
              <span
                class="inline-flex h-7 w-7 p-[6px] items-center justify-center rounded-full bg-slate-100"
              >
                <Funnel />
              </span>
              <span>Indicadores de funil</span>
            </div>

            <div
              class="inline-flex items-center gap-2 text-[14px] text-slate-700"
            >
              <span
                class="inline-flex h-7 w-7 p-[6px] items-center justify-center rounded-full bg-slate-100"
              >
                <FileDown />
              </span>
              <span>Importação de leads</span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- COLUNA DIREITA (FUNIL ANIMADO) -->
    <div
      class="relative hidden md:flex md:col-span-6 items-center justify-center"
    >
      <AnFunnel />
    </div>
  </div>
</section>

<!-- =================================================================== -->
<!-- 2. COMO FUNCIONA - CARD ESCURO                                      -->
<!-- =================================================================== -->

<section
  id="como-funciona"
  class="relative py-16 lg:py-24"
  aria-label="Como funciona o marketing integrado ao F10"
>
  <div class="container">
    <div
      class="relative mx-auto rounded-[28px] bg-[#010D28] text-white py-8 md:py-10 lg:px-12 lg:py-12 overflow-hidden"
    >
      <!-- fundo -->
      <div class="pointer-events-none absolute inset-0" aria-hidden="true">
        <img
          src="/booble_bg.webp"
          alt=""
          class="absolute inset-0 w-full h-full object-cover opacity-[0.26]
                 rotate-[-250deg] scale-[1.6]"
        />

        <div
          class="absolute inset-0 bg-[radial-gradient(120%_100%_at_50%_0%,rgba(0,0,0,0)_0%,rgba(0,0,0,0.65)_80%)] opacity-80"
        ></div>

        <div
          class="absolute inset-0 opacity-[0.16]"
          style="
            background-image: url('/noise.svg');
            background-repeat: repeat;
            background-size: 220px 220px;
          "
        ></div>
      </div>

      <div
        class="relative z-10 grid grid-cols-1 gap-10 md:grid-cols-12 md:items-start"
      >
        <!-- ESQUERDA -->
        <div class="md:col-span-6 flex flex-col justify-center">
          <div
            class="inline-flex items-center gap-2 rounded-full bg-white/5 px-3 py-1 max-w-[320px]
                   text-[12px] font-medium text-slate-200"
          >
            <span class="inline-block h-2 w-2 rounded-full bg-primary"></span>
            <span>Lead qualificado em poucos passos</span>
          </div>

          <h2
            class="mt-4 text-[26px] md:text-[32px] lg:text-[38px] leading-tight font-semibold tracking-[-0.03em]"
          >
            Como o F10 transforma
            <span class="text-primary">cliques e listas</span>
            em oportunidades de matrícula.
          </h2>

          <p
            class="mt-6 text-[15px] md:text-[16px] leading-relaxed text-slate-200 max-w-[520px]"
          >
            Em vez de cada agência ou campanha mandar uma planilha diferente, o
            módulo de Marketing do F10 conecta as fontes de leads, centraliza
            remessas de prospecção e organiza tudo em funis por curso, unidade e
            origem. Você passa a enxergar o que vale a pena manter, pausar ou
            escalar.
          </p>

          <ul
            class="mt-6 space-y-2 text-[14px] leading-relaxed text-slate-300 max-w-[480px]"
          >
            <li class="flex items-start gap-2">
              <span
                class="mt-[6px] h-1.5 w-1.5 rounded-full bg-primary flex-shrink-0"
              ></span>
              <span
                >Funis separados por curso, unidade, campanha e fornecedor de
                leads.</span
              >
            </li>
            <li class="flex items-start gap-2">
              <span
                class="mt-[6px] h-1.5 w-1.5 rounded-full bg-primary flex-shrink-0"
              ></span>
              <span>
                Histórico de remessas, listas, macrocaptação e reciclagem sem
                depender de novas planilhas.
              </span>
            </li>
            <li class="flex items-start gap-2">
              <span
                class="mt-[6px] h-1.5 w-1.5 rounded-full bg-primary flex-shrink-0"
              ></span>
              <span>
                Indicadores claros de custo por lead, custo por oportunidade e
                desempenho por canal.
              </span>
            </li>
          </ul>
        </div>

        <!-- DIREITA: ETAPAS -->
        <div class="md:col-span-6">
          <div class="space-y-4">
            {#each steps as step, idx}
              <article
                class="relative flex gap-4 rounded-2xl bg-white/[0.06] px-4 py-4 md:px-5 md:py-5 border border-white/5"
              >
                <div class="relative flex flex-col items-center">
                  <div
                    class="flex min-h-8 w-8 items-center justify-center rounded-full
                           bg-white/10 border border-white/25 text-[12px] font-semibold"
                  >
                    {idx + 1}
                  </div>
                  {#if idx < steps.length - 1}
                    <div
                      class="mt-1 h-full w-px bg-gradient-to-b from-white/40 to-white/5"
                    ></div>
                  {/if}
                </div>

                <div class="flex-1">
                  <p
                    class="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-300"
                  >
                    {step.label}
                  </p>
                  <h3
                    class="mt-1 text-[16px] md:text-[18px] font-semibold leading-snug"
                  >
                    {step.title}
                  </h3>
                  <p
                    class="mt-2 text-[14px] leading-relaxed text-slate-200/90 max-w-[520px]"
                  >
                    {step.description}
                  </p>
                </div>
              </article>
            {/each}
          </div>

          <div
            class="mt-5 grid grid-cols-1 gap-3 text-[13px] text-slate-100 md:grid-cols-3"
          >
            <div
              class="rounded-2xl bg-white/[0.06] px-4 py-3 border border-white/5"
            >
              <p class="text-[20px] font-semibold leading-tight">+12</p>
              <p class="mt-1 leading-snug">fontes e campanhas conectáveis.</p>
            </div>
            <div
              class="rounded-2xl bg-white/[0.06] px-4 py-3 border border-white/5"
            >
              <p class="text-[20px] font-semibold leading-tight">
                Funis ilimitados
              </p>
              <p class="mt-1 leading-snug">por curso, unidade e fornecedor.</p>
            </div>
            <div
              class="rounded-2xl bg-white/[0.06] px-4 py-3 border border-white/5"
            >
              <p class="text-[20px] font-semibold leading-tight">Visão 360º</p>
              <p class="mt-1 leading-snug">
                do marketing até o impacto em matrículas.
              </p>
            </div>
          </div>
        </div>
      </div>

      <div
        class="relative z-10 mt-6 pt-4 border-t border-white/10 text-[12px] md:text-[13px]
               text-slate-300/85 text-left md:text-right"
      >
        Para entrada automática de leads é necessária integração via API ou
        planilhas modelo.
      </div>
    </div>
  </div>
</section>

<!-- =================================================================== -->
<!-- 3. CAMPANHAS, FORMULÁRIOS E FONTES & EVENTOS                        -->
<!-- =================================================================== -->

<section
  id="campanhas-fontes"
  class="relative py-16 lg:py-24 bg-white/80"
  aria-label="Campanhas, formulários e Fontes & Eventos no F10"
>
  <div class="container">
    <div
      class="grid gap-10 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)] items-start"
    >
      <!-- TEXTO -->
      <div>
        <h2
          class="text-[26px] md:text-[38px] lg:text-[42px] leading-tight font-semibold tracking-[-0.03em] text-[#010D28]"
        >
          Campanhas, formulários e
          <span class="text-primary">Fontes &amp; Eventos</span>
          no mesmo painel.
        </h2>

        <p
          class="mt-4 text-[15px] md:text-[17px] leading-relaxed text-[#4B5563] max-w-[640px]"
        >
          Em vez de cada campanha virar uma planilha ou relatório separado, o
          módulo de Marketing do F10 registra tudo como
          <strong>Fontes &amp; Eventos</strong>: Meta Ads, Google Ads,
          formulários, APIs, remessas de prospecção e até indicações de amigos.
          Assim, cada lead já nasce com a origem certa, pronta para ser lida
          pelo time Comercial.
        </p>

        <ul class="mt-6 space-y-2 text-[14px] leading-relaxed text-[#4B5563]">
          <li class="flex gap-2">
            <span
              class="mt-[7px] h-1.5 w-1.5 rounded-full bg-primary flex-shrink-0"
            ></span>
            <span>
              Campanhas de <strong>formulário de Meta Ads e Google Ads</strong>
              conectadas via integração com API.
            </span>
          </li>
          <li class="flex gap-2">
            <span
              class="mt-[7px] h-1.5 w-1.5 rounded-full bg-primary flex-shrink-0"
            ></span>
            <span>
              Controle de diversas campanhas diferentes no mesmo lugar, com
              comparativo por curso, unidade e fornecedor de mídia.
            </span>
          </li>
          <li class="flex gap-2">
            <span
              class="mt-[7px] h-1.5 w-1.5 rounded-full bg-primary flex-shrink-0"
            ></span>
            <span>
              Recebimento de dados externos via API, formulários próprios ou
              arquivos de remessa — sem quebrar o funil.
            </span>
          </li>
        </ul>

        <p class="mt-5 text-[13px] text-[#6B7280] max-w-[580px]">
          Para a equipe, isso significa ter um
          <strong>cadastro único de Fontes &amp; Eventos</strong>, sem perder
          tempo “caçando” de qual planilha veio cada lead.
        </p>
      </div>

      <div class="flex justify-center lg:justify-end">
        <div class="relative w-full max-w-[720px]">
          <!-- FUNDO SUAVE (glow + noise, sem quadrado estranho) -->
          <div
            class="pointer-events-none absolute inset-x-[-32px] -top-10 bottom-[-24px] -z-10"
            aria-hidden="true"
          >
            <div
              class="absolute inset-0 opacity-55
               bg-[radial-gradient(circle_at_top,rgba(15,23,42,0.16),transparent_60%),radial-gradient(circle_at_bottom,rgba(15,23,42,0.10),transparent_55%)]"
            ></div>
            <div
              class="absolute inset-0 opacity-[0.14] rounded-[32px]"
              style="
          background-image: url('/noise.svg');
          background-repeat: repeat;
          background-size: 180px 180px;
        "
            ></div>
          </div>

          <!-- LINHA PRINCIPAL: logos + mini interface -->
          <div class="relative flex items-stretch gap-3 md:gap-4">
            <!-- COLUNA ESTREITA DE LOGOS (alinhada no topo) -->
            <aside class="hidden sm:flex flex-col items-center pt-1">
              <div
                class="rounded-full bg-white border border-slate-200 shadow-[0_14px_35px_rgba(148,163,184,0.45)]
                 px-2 py-3 flex flex-col items-center gap-2"
              >
                {#each sourceIcons as icon}
                  <div
                    class="flex h-8 w-8 items-center justify-center rounded-full bg-slate-50 shadow-sm"
                  >
                    <img
                      src={icon.src}
                      alt={icon.alt}
                      class="h-4 w-4 object-contain"
                    />
                  </div>
                {/each}
              </div>

              <!-- ligação visual até a API -->
              <div
                class="mt-2 h-24 w-px border-l border-dashed border-slate-300"
              ></div>
            </aside>

            <!-- MINI INTERFACE F10 -->
            <div
              class="relative flex-1 rounded-[26px] bg-white border border-slate-200
               shadow-[0_20px_60px_rgba(15,23,42,0.18)] overflow-hidden"
            >
              <!-- TOPO: barra tipo janela + menu + logo F10 -->
              <div
                class="flex items-center justify-between px-4 pt-3 pb-2 border-b border-slate-200 bg-slate-50"
              >
                <div class="flex items-center gap-3">
                  <div
                    class="hidden md:flex items-center gap-3 text-[11px] text-slate-600"
                  >
                    <span class="font-semibold text-slate-800">Meu F10</span>
                    <span>Cadastros</span>
                    <span class="font-semibold text-primary">Comercial</span>
                    <span>Pedagógico</span>
                    <span>Financeiro</span>
                    <span>Sistema</span>
                  </div>
                </div>

                <div class="flex items-center gap-2">
                  <img
                    src="/logo_f10_3.webp"
                    alt="F10 Software"
                    class="h-7 w-auto object-contain"
                  />
                </div>
              </div>

              <!-- CONTEÚDO: TABELA -->
              <div class="px-4 py-4">
                <div class="mb-2">
                  <div
                    class="inline-flex items-center gap-2 rounded-t-xl bg-slate-100 px-3 py-1
                     text-[12px] font-semibold text-slate-700 border border-b-0 border-slate-200"
                  >
                    <span
                      class="inline-flex h-4 w-4 items-center justify-center rounded-full bg-red-500/10"
                    >
                      <span class="h-2 w-2 bg-red-500 rounded-[3px]"></span>
                    </span>
                    <span>Fontes &amp; Eventos</span>
                  </div>
                </div>

                <div
                  class="grid grid-cols-[1.2fr_1fr_1.1fr] text-[11px] font-semibold text-slate-600
                   bg-slate-100 rounded-xl px-3 py-2 border border-slate-200"
                >
                  <span>Fonte</span>
                  <span>Mídia</span>
                  <span class="text-right">Conversão %</span>
                </div>

                <div
                  class="mt-1 rounded-xl border border-slate-200 bg-slate-50"
                >
                  <div class="divide-y divide-slate-200 text-[12px]">
                    {#each sourceRows as row, i}
                      <div
                        class={`grid grid-cols-[1.2fr_1fr_1.1fr] px-3 py-1.5 ${
                          i % 2 === 0 ? "bg-white" : "bg-slate-50"
                        }`}
                      >
                        <span class="truncate text-slate-800">{row.source}</span
                        >
                        <span class="truncate text-slate-600">{row.media}</span>
                        <span class="text-right tabular-nums text-slate-700">
                          {row.conversion}
                        </span>
                      </div>
                    {/each}
                  </div>
                </div>

                <p
                  class="mt-2 text-[10px] text-slate-500 flex items-center justify-between"
                >
                  <span>
                    Mídia seja
                    <span class="font-medium">
                      ('facebook-ads', 'Google', 'google-ads', 'Indicação',
                      'instagram')
                    </span>
                  </span>
                  <span class="hidden sm:inline">
                    1 / {sourceRows.length} registros
                  </span>
                </p>
              </div>
            </div>

            <!-- BLOCO API FLUTUANDO SOBRE A MINI TELA (ligado ao pontilhado) -->
            <div
              class="hidden sm:flex absolute left-[-45px] top-[300px] -translate-y-1/2
               rounded-[18px] bg-slate-900 text-white px-3 py-2
               shadow-[0_14px_30px_rgba(15,23,42,0.7)] items-center gap-2"
            >
              <div
                class="flex h-8 w-8 items-center justify-center rounded-full
                 bg-white/5 border border-white/15"
              >
                <img
                  src={apiIcon.src}
                  alt={apiIcon.alt}
                  class="h-4 w-4 object-contain"
                />
              </div>
              <div>
                <p
                  class="text-[10px] font-semibold uppercase tracking-[0.16em]"
                >
                  Entrada via
                </p>
                <p class="text-[11px] font-semibold">API / integrações</p>
              </div>
            </div>
          </div>

          <!-- CARDS DECORATIVOS, VAZANDO ~60PX PRA DIREITA (gráficos) -->
          <div
            class="absolute -bottom-9 right-[-60px] flex flex-col gap-3
             w-[220px] sm:w-[240px]"
          >
            <!-- Card 1: Pizza / donut de conversão -->
            <div
              class="rounded-[20px] bg-white border border-slate-200
               shadow-[0_18px_50px_rgba(148,163,184,0.55)]
               px-4 py-3 flex items-center gap-3"
            >
              <div class="relative h-14 w-14">
                <div
                  class="absolute inset-0 rounded-full
                   bg-[conic-gradient(#22c55e_0_72%,#e5e7eb_72%)]"
                ></div>
                <div class="absolute inset-2 rounded-full bg-white"></div>
                <span
                  class="absolute inset-0 flex items-center justify-center
                   text-[11px] font-semibold text-slate-800"
                >
                  82%
                </span>
              </div>
              <div class="flex-1">
                <p class="text-[11px] font-semibold text-slate-700">
                  Conversão média
                </p>
                <p class="text-[11px] text-slate-500 mt-0.5">
                  Do cadastro até oportunidades geradas.
                </p>
              </div>
            </div>

            <!-- Card 2: Gráfico de linha em degradê -->
            <div
              class="rounded-[20px] bg-slate-900 text-white
               shadow-[0_18px_50px_rgba(15,23,42,0.80)]
               px-4 py-3"
            >
              <p class="text-[11px] font-semibold mb-2">
                Leads trabalhados no mês
              </p>
              <div
                class="h-14 w-full rounded-xl bg-slate-800 overflow-hidden mb-2"
              >
                <svg viewBox="0 0 100 40" class="h-full w-full">
                  <defs>
                    <linearGradient
                      id="leadLineGrad"
                      x1="0"
                      y1="0"
                      x2="1"
                      y2="0"
                    >
                      <stop
                        offset="0%"
                        stop-color="#22c55e"
                        stop-opacity="0.3"
                      />
                      <stop
                        offset="40%"
                        stop-color="#22c55e"
                        stop-opacity="0.8"
                      />
                      <stop
                        offset="100%"
                        stop-color="#bef264"
                        stop-opacity="0.9"
                      />
                    </linearGradient>
                  </defs>
                  <path
                    d="M0 30 L15 26 L30 20 L45 24 L60 14 L75 18 L90 10 100 8"
                    fill="none"
                    stroke="url(#leadLineGrad)"
                    stroke-width="2.2"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                  />
                </svg>
              </div>
              <p class="text-[11px] text-slate-200">
                +24% leads trabalhados em relação ao mês anterior.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</section>

<!-- =================================================================== -->
<!-- 4. MOTOR DE PROSPECÇÃO, LISTAS E FORNECEDORES                       -->
<!-- =================================================================== -->

<section
  id="prospeccao"
  class="relative py-16 lg:py-24 bg-white/40"
  aria-label="Motor de prospecção e listas de leads no F10"
>
  <div class="container">
    <!-- TÍTULO + INTRO -->
    <div class="max-w-3xl">
      <h2
        class="text-[26px] md:text-[38px] lg:text-[42px] leading-tight font-semibold tracking-[-0.03em] text-[#010D28]"
      >
        Um motor de
        <span class="text-primary">prospecção</span>
        para quem trabalha com listas grandes.
      </h2>

      <p
        class="mt-4 text-[15px] md:text-[17px] leading-relaxed text-[#4B5563] max-w-[640px]"
      >
        Se a sua escola trabalha com TMK, Tele, SDR, remessas compradas ou
        listas indicadas, o F10 vira um
        <strong>motor de prospecção</strong>: gera listas, distribui para a
        equipe, mede conversões, controla fornecedores e ainda limpa a base ao
        longo do tempo. Ideal para quem não quer depender só de mídia paga.
      </p>
    </div>

    <!-- FAIXA RESUMO EM 3 PASSOS -->
    <div
      class="mt-8 grid gap-3 md:grid-cols-3 rounded-[24px] border border-slate-200 bg-slate-50/60 px-4 py-4 md:px-6"
    >
      <div class="flex items-start gap-3">
        <div
          class="mt-0.5 flex h-9 w-9 items-center justify-center rounded-2xl bg-white text-primary shadow-xs"
        >
          <span class="text-[13px] font-semibold">1</span>
        </div>
        <div>
          <p
            class="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#9CA3AF]"
          >
            Entrada
          </p>
          <p class="text-[13px] md:text-[14px] font-medium text-[#111827]">
            Listas geradas, importadas ou via API, já com origem e fornecedor.
          </p>
        </div>
      </div>

      <div class="flex items-start gap-3">
        <div
          class="mt-0.5 flex h-9 w-9 items-center justify-center rounded-2xl bg-primary/10 text-primary shadow-xs"
        >
          <span class="text-[13px] font-semibold">2</span>
        </div>
        <div>
          <p
            class="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#9CA3AF]"
          >
            Prospecção
          </p>
          <p class="text-[13px] md:text-[14px] font-medium text-[#111827]">
            TMK, Tele e SDR trabalhando filas organizadas, tarefas e contatos.
          </p>
        </div>
      </div>

      <div class="flex items-start gap-3">
        <div
          class="mt-0.5 flex h-9 w-9 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-500 shadow-xs"
        >
          <span class="text-[13px] font-semibold">3</span>
        </div>
        <div>
          <p
            class="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#9CA3AF]"
          >
            Resultado
          </p>
          <p class="text-[13px] md:text-[14px] font-medium text-[#111827]">
            Qualidade da base, custo por lead e funil integrado ao Comercial.
          </p>
        </div>
      </div>
    </div>

    <!-- 3 BLOCOS PRINCIPAIS (TEXTO EM PEDAÇOS) -->
    <div class="relative mt-10">
      <div class="relative grid gap-6 lg:grid-cols-3 lg:items-stretch">
        <!-- BLOCO 1 - ENTRADA DAS LISTAS -->
        <article
          class="rounded-[24px] border border-slate-200 bg-white px-5 py-5 md:px-6 md:py-6 shadow-sm flex flex-col"
        >
          <div class="flex items-start gap-3">
            <div
              class="mt-1 flex h-9 w-9 items-center justify-center rounded-2xl bg-primary/10 text-primary"
            >
              <FileDown class="w-4 h-4" />
            </div>
            <div class="flex-1">
              <p
                class="text-[11px] font-semibold tracking-[0.18em] uppercase text-[#9CA3AF]"
              >
                ENTRADA DAS LISTAS
              </p>
              <h3
                class="mt-1 text-[17px] md:text-[19px] font-semibold leading-snug text-[#010D28]"
              >
                Geração e importação de leads sem perder a origem.
              </h3>
            </div>
          </div>

          <!-- highlights curtinhos -->
          <div
            class="mt-4 space-y-2 text-[13px] leading-relaxed text-[#374151]"
          >
            <div class="flex gap-2">
              <span
                class="mt-1 h-1.5 w-1.5 rounded-full bg-primary flex-shrink-0"
              ></span>
              <span>
                <strong>Listas de campanhas, remessas e indicações</strong> entram
                com a origem marcada desde o primeiro dia.
              </span>
            </div>
            <div class="flex gap-2">
              <span
                class="mt-1 h-1.5 w-1.5 rounded-full bg-primary flex-shrink-0"
              ></span>
              <span>
                <strong>Importação de planilhas</strong> seguindo modelos padronizados,
                sem perder campos importantes.
              </span>
            </div>
            <div class="flex gap-2">
              <span
                class="mt-1 h-1.5 w-1.5 rounded-full bg-primary flex-shrink-0"
              ></span>
              <span>
                <strong>Atualização via API</strong> para bases recorrentes de parceiros
                e portais.
              </span>
            </div>
          </div>

          <!-- parágrafo de suporte (SEO, mas mais leve) -->
          <p class="mt-4 text-[12px] leading-relaxed text-[#6B7280]">
            O F10 registra qual
            <strong>fornecedor de lista/remessa</strong> trouxe cada lead, se
            veio de
            <strong>campanha, remessa externa, indicação ou formulário</strong>,
            facilitando o controle de desempenho e custo por origem.
          </p>
        </article>

        <!-- BLOCO 2 - TRABALHO DA EQUIPE (PROSPECÇÃO) -->
        <article
          class="rounded-[24px] border border-[#010D28]/10 bg-[#010D28] px-5 py-5 md:px-6 md:py-6 text-white relative overflow-hidden flex flex-col"
        >
          <div
            class="pointer-events-none absolute inset-0 opacity-[0.35]"
            aria-hidden="true"
          >
            <div
              class="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(234,109,11,0.5),transparent_65%)]"
            ></div>
            <div
              class="absolute inset-0 opacity-[0.45]"
              style="
                background-image: url('/noise.svg');
                background-repeat: repeat;
                background-size: 220px 220px;
              "
            ></div>
          </div>

          <div class="relative z-10 flex-1 flex flex-col">
            <div class="flex items-start gap-3">
              <div
                class="mt-1 flex h-9 w-9 items-center justify-center rounded-2xl bg-white/10 text-emerald-300"
              >
                <PhoneCall class="w-4 h-4" />
              </div>
              <div class="flex-1">
                <p
                  class="text-[11px] font-semibold tracking-[0.18em] uppercase text-slate-200"
                >
                  TRABALHO DA EQUIPE
                </p>
                <h3
                  class="mt-1 text-[17px] md:text-[19px] font-semibold leading-snug"
                >
                  TMK, Tele e SDR trabalhando na fila certa, na hora certa.
                </h3>
              </div>
            </div>

            <div
              class="mt-4 space-y-2 text-[13px] leading-relaxed text-slate-100"
            >
              <div class="flex gap-2">
                <span
                  class="mt-1 h-1.5 w-1.5 rounded-full bg-emerald-400 flex-shrink-0"
                ></span>
                <span>
                  <strong>Distribuição automática das listas</strong> por fila, prioridade
                  ou carteira, sem planilha paralela.
                </span>
              </div>
              <div class="flex gap-2">
                <span
                  class="mt-1 h-1.5 w-1.5 rounded-full bg-emerald-400 flex-shrink-0"
                ></span>
                <span>
                  Registro rápido de
                  <strong>agendamentos, contatos e matrículas</strong> direto no
                  lead.
                </span>
              </div>
              <div class="flex gap-2">
                <span
                  class="mt-1 h-1.5 w-1.5 rounded-full bg-emerald-400 flex-shrink-0"
                ></span>
                <span>
                  <strong>Mensageria integrada</strong> (SMS e WhatsApp) e
                  <strong>indicação de amigos</strong> sem sair do F10.
                </span>
              </div>
            </div>

            <p class="mt-4 text-[12px] leading-relaxed text-slate-200">
              O fluxo de prospecção deixa de depender da memória do operador: o
              F10 controla
              <strong>tarefas, tempo de atendimento, tempo de resposta</strong> e
              histórico de cada contato, permitindo medir produtividade e conversão
              da equipe.
            </p>
          </div>
        </article>

        <!-- BLOCO 3 - QUALIDADE, FORNECEDORES E SAÍDA PARA COMERCIAL -->
        <article
          class="rounded-[24px] border border-slate-200 bg-white px-5 py-5 md:px-6 md:py-6 shadow-sm flex flex-col"
        >
          <div class="flex items-start gap-3">
            <div
              class="mt-1 flex h-9 w-9 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-500"
            >
              <TrendingUp class="w-4 h-4" />
            </div>
            <div class="flex-1">
              <p
                class="text-[11px] font-semibold tracking-[0.18em] uppercase text-[#9CA3AF]"
              >
                QUALIDADE &amp; RESULTADO
              </p>
              <h3
                class="mt-1 text-[17px] md:text-[19px] font-semibold leading-snug text-[#010D28]"
              >
                Base limpa, fornecedores comparáveis e funil integrado.
              </h3>
            </div>
          </div>

          <div
            class="mt-4 space-y-2 text-[13px] leading-relaxed text-[#374151]"
          >
            <div class="flex gap-2">
              <span
                class="mt-1 h-1.5 w-1.5 rounded-full bg-primary flex-shrink-0"
              ></span>
              <span>
                <strong>Controle de fornecedores</strong> com visão de
                macrocaptação, reciclagem e
                <strong>custo por lead/cadastro</strong>.
              </span>
            </div>
            <div class="flex gap-2">
              <span
                class="mt-1 h-1.5 w-1.5 rounded-full bg-primary flex-shrink-0"
              ></span>
              <span>
                <strong>Exportação de cadastros</strong> para ações externas sem
                perder a origem no F10.
              </span>
            </div>
            <div class="flex gap-2">
              <span
                class="mt-1 h-1.5 w-1.5 rounded-full bg-primary flex-shrink-0"
              ></span>
              <span>
                <strong>Higienização de leads</strong> para remover duplicidades,
                contatos inválidos e bases desatualizadas.
              </span>
            </div>
          </div>

          <p class="mt-4 text-[12px] leading-relaxed text-[#6B7280]">
            Todo esse trabalho se conecta direto ao
            <a
              href="/solucoes/comercial"
              class="underline decoration-2 underline-offset-[3px] text-primary hover:text-primary/90 font-semibold"
            >
              funil de vendas do módulo Comercial
            </a>
            : listas trabalhadas viram
            <strong>oportunidades reais de matrícula</strong>, com dados de
            <strong>qualidade de base, custo por lead e conversão</strong>
            consolidados em um só lugar.
          </p>
        </article>
      </div>
    </div>
  </div>
</section>

<!-- =================================================================== -->
<!-- 5. FAQ - OBJEÇÕES REAIS                                            -->
<!-- =================================================================== -->

<section
  class="relative py-12 md:py-16 bg-white/80"
  aria-label="Perguntas frequentes sobre marketing e captação no F10"
>
  <div class="container">
    <div
      class="flex flex-col md:flex-row md:items-center md:justify-between gap-6"
    >
      <div>
        <h2
          class="text-[26px] md:text-[32px] font-semibold leading-tight
                 text-[#010D28]"
        >
          Perguntas frequentes de quem
          <span class="text-primary">ainda não usa o F10</span>
          no marketing
        </h2>
        <p class="mt-2 text-[14px] md:text-[15px] text-[#4B5563] max-w-[520px]">
          Reunimos as principais dúvidas de gestores e equipes que saíram de
          planilhas e passaram a organizar a captação de leads dentro do módulo
          de Marketing do F10.
        </p>
      </div>

      <a
        href="/solucoes/comercial"
        class="hidden md:inline-flex items-center rounded-full border
               border-[#EA6D0B] px-4 py-2 text-[14px] font-semibold
               text-[#010D28] hover:bg-[#EA6D0B]/10
               focus:outline-none focus:ring-2 focus:ring-[#EA6D0B]/40"
      >
        Ver módulo Comercial / CRM
      </a>
    </div>

    <div class="mt-8">
      <FaqAccordion items={faqItems} />
    </div>

    <div class="mt-6 md:hidden">
      <a
        href="/solucoes/comercial"
        class="inline-flex items-center rounded-full border
               border-[#EA6D0B] px-4 py-2 text-[14px] font-semibold
               text-[#010D28] hover:bg-[#EA6D0B]/10
               focus:outline-none focus:ring-2 focus:ring-[#EA6D0B]/40"
      >
        Ver módulo Comercial / CRM
      </a>
    </div>
  </div>
</section>

<style></style>
