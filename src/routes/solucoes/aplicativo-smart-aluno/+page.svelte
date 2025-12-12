<script lang="ts">
  // ===== Imports =====
  import Breadcrumb from "$lib/components/Breadcrumb.svelte";
  import FaqAccordion from "$lib/components/FaqAccordion.svelte";
  import KpiPanel from "$lib/components/KpiPanel.svelte";
  import { contactModalConfig } from "$lib/stores/contactModals";
  import { showForm } from "$lib/stores/formPopup";

  // Ícones via lucide-svelte (ou pacote similar)
  import {
    BookOpen,
    Smartphone,
    BarChart3,
    Megaphone,
    ArrowRight,
    Layers,
  } from "lucide-svelte";

  // ===== Tipos =====
  type IconComponent = typeof BookOpen;

  type Feature = {
    title: string; // aceita <br> via {@html}
    description: string;
    icon: IconComponent;
  };

  type Benefit = {
    title: string;
    description: string;
  };

  type DayUse = {
    title: string;
    description: string;
  };

  type Pillar = {
    title: string; // aceita <br> via {@html}
    description: string;
    icon: IconComponent;
  };

  // ===== Funcionalidades principais do Smart Aluno =====
  const features: Feature[] = [
    {
      title: "Conteúdo de aula<br/>sempre à mão",
      description:
        "Todos os conteúdos estudados em sala, organizados por data e matéria, para o aluno revisar, baixar e consultar quando quiser.",
      icon: BookOpen,
    },
    {
      title: "Vídeos e podcasts<br/>para reforçar o aprendizado",
      description:
        "Videoaulas, gravações de aula e podcasts com os conteúdos vistos, permitindo que o aluno revise no seu ritmo, em qualquer lugar.",
      icon: Smartphone,
    },
    {
      title: "Conteúdo complementar<br/>e tarefas para casa",
      description:
        "Professores podem enviar materiais extras e atividades para serem feitos em casa, reforçando o que foi visto em sala.",
      icon: Layers,
    },
    {
      title: "Notas, frequências<br/>e desempenho em tempo real",
      description:
        "Visualização de notas, faltas, médias parciais e finais por matéria, ajudando o aluno e os responsáveis a acompanharem o desempenho.",
      icon: BarChart3,
    },
    {
      title: "Situação financeira<br/>com sinalização clara",
      description:
        "Histórico de mensalidades, taxas e outros pagamentos, com marcações coloridas indicando parcelas pagas, em aberto ou em atraso. Em muitos casos, o próprio aluno ou responsável já consegue gerar boleto ou Pix direto pelo app.",
      icon: BarChart3,
    },
    {
      title: "Notificações e mensagens<br/>que engajam a turma",
      description:
        "Notificações instantâneas, avisos de eventos e mensagens entre escola, professores, alunos e responsáveis, reduzindo ruído em grupos dispersos de WhatsApp.",
      icon: Megaphone,
    },
    {
      title: "Indique um amigo<br/>com benefícios para todos",
      description:
        "O aluno indica amigos direto da agenda do celular; a escola recebe contatos qualificados, acompanha o status das indicações e pode oferecer descontos, pontos no Clube do Aluno ou outros benefícios.",
      icon: Megaphone,
    },
    {
      title: "Clube do Aluno<br/>e experiências de comunidade",
      description:
        "Espaço para benefícios, campanhas, conteúdos exclusivos e ações de relacionamento que fortalecem a marca da escola.",
      icon: Smartphone,
    },
    {
      title: "Atividades e aulas online<br/>conectadas ao AVA",
      description:
        "O aluno acessa pelo app os materiais e atividades criadas no AVA, com indicação do que está pendente, concluído e prazos de entrega.",
      icon: Layers,
    },
  ];

  // ===== Benefícios =====
  const benefits: Benefit[] = [
    {
      title: "Comunicação centralizada entre escola, alunos e responsáveis",
      description:
        "Avisos, conteúdos, eventos, financeiro e mensagens em um só canal, reduzindo ruído em grupos dispersos de WhatsApp.",
    },
    {
      title: "Mais retenção e engajamento dos alunos",
      description:
        "O aluno enxerga valor no dia a dia: conteúdos, podcasts, eventos, Clube do Aluno e um canal direto com a escola.",
    },
    {
      title: "Transparência para responsáveis e direção",
      description:
        "Responsáveis acompanham notas, faltas e financeiro; a direção visualiza engajamento e consegue agir antes da evasão.",
    },
    {
      title: "Marca da escola no bolso do aluno",
      description:
        "App personalizado com identidade visual da escola, reforçando a percepção de modernidade e organização.",
    },
  ];

  // ===== Exemplos de uso no dia a dia =====
  const dayUse: DayUse[] = [
    {
      title: "Antes da aula",
      description:
        "O aluno recebe uma notificação pelo app lembrando da aula, com link para o conteúdo complementar ou material pré-aula.",
    },
    {
      title: "Durante e logo após a aula",
      description:
        "O professor lança o conteúdo e a atividade no F10; o aluno visualiza tudo no Smart Aluno poucos minutos depois.",
    },
    {
      title: "Em casa, estudando",
      description:
        "O aluno revisa conteúdos, vídeos e podcasts pelo app, sem depender de planilhas, PDFs perdidos ou links soltos.",
    },
    {
      title: "No relacionamento com a família",
      description:
        "Responsáveis acompanham notas, faltas e financeiro, evitando surpresas de desempenho ou atrasos nas mensalidades.",
    },
  ];

  // ===== Pilares EAD + APP + AVA (bloco dark) =====
  const pillars: Pillar[] = [
    {
      title: "Trilhas de EAD<br/>bem estruturadas no AVA",
      description:
        "Cursos, módulos, aulas e atividades organizados em trilhas de aprendizagem, com progresso e prazos bem definidos.",
      icon: BookOpen,
    },
    {
      title: "Engajamento diário<br/>pelo app Smart Aluno",
      description:
        "Notificações, conteúdos resumidos, podcasts e lembretes de atividades mantendo o aluno conectado ao curso todos os dias.",
      icon: Smartphone,
    },
    {
      title: "Dados acadêmicos e financeiros<br/>unificados no F10",
      description:
        "Notas, presença, contratos e cobranças em um único lugar, alimentando relatórios que ajudam a direção a decidir com segurança.",
      icon: BarChart3,
    },
    {
      title: "Comunicação clara<br/>com alunos e responsáveis",
      description:
        "Mensagens, avisos e campanhas segmentadas por turma, curso ou unidade, com histórico e registro dentro da plataforma.",
      icon: Megaphone,
    },
  ];

  // ===== KPIs sugestivos (sem promessas absolutas) =====
  const kpis = [
    {
      value: "↑",
      label:
        "Retenção de alunos mais alta em escolas que usam app escolar diariamente*",
    },
    {
      value: "3x",
      label: "mais engajamento em avisos e conteúdos quando tudo está no app*",
    },
    {
      value: "-30%",
      label:
        "redução estimada em ligações de dúvidas básicas para a secretaria*",
    },
  ];

  // ===== FAQ (será espelhado em JSON-LD) =====
  const faqItems = [
    {
      question: "O que é o aplicativo escolar F10 Smart Aluno?",
      answer:
        "O F10 Smart Aluno é o aplicativo escolar que conecta a escola, os alunos e os responsáveis. Nele ficam concentrados conteúdos de aula, vídeos, podcasts, notas, frequências, financeiro, notificações, Clube do Aluno e recursos como Indique um Amigo.",
    },
    {
      question: "O aplicativo Smart Aluno substitui o AVA / Portal do Aluno?",
      answer:
        "Não. O Smart Aluno complementa o AVA / Portal do Aluno. O AVA é o ambiente principal de estudo online (especialmente para EAD e trilhas completas), enquanto o app é o companheiro de bolso para o dia a dia, reforçando comunicação, notificações e acesso rápido a conteúdos e financeiro.",
    },
    {
      question: "Quais dispositivos podem usar o Smart Aluno?",
      answer:
        "O F10 Smart Aluno foi pensado para smartphones, com versões para Android e iOS. Os mesmos dados também podem ser acessados no Portal do Aluno via navegador, mantendo a experiência em múltiplas telas.",
    },
    {
      question: "O que os responsáveis podem acompanhar pelo app?",
      answer:
        "Responsáveis podem acompanhar notas, faltas, médias, mensagens, avisos da escola, eventos, histórico financeiro e situação das parcelas, além de receber notificações importantes diretamente no celular.",
    },
    {
      question: "A escola consegue escolher o que aparece no aplicativo?",
      answer:
        "Sim. As funcionalidades do Smart Aluno podem ser habilitadas ou desabilitadas diretamente no F10. A escola escolhe quais menus, cards e recursos estarão disponíveis para cada perfil de aluno.",
    },
  ];

  function openSmartAppModal() {
    contactModalConfig.set({
      defaultMessage:
        "Quero agendar uma demonstração do aplicativo Smart Aluno",
      product: "F10 – Smart Aluno",
      subSource: "Modal Smart Aluno – dobra 1",
      leadDescription: "Contato iniciado pelo formulário do Smart Aluno.",
    });

    showForm.set(true);
  }
  function openSmartAppPresentationModal() {
    contactModalConfig.set({
      defaultMessage:
        "Quero agendar uma demonstração do aplicativo Smart Aluno",
      product: "F10 – Smart Aluno",
      subSource: "Modal Smart Aluno – Final da página",
      leadDescription: "Contato iniciado pelo formulário do Smart Aluno.",
    });

    showForm.set(true);
  }
</script>

<svelte:head>
  <title>
    Aplicativo escolar F10 Smart Aluno — app da escola para alunos e
    responsáveis | F10 Software
  </title>
  <meta
    name="description"
    content="Com o aplicativo escolar F10 Smart Aluno, a sua escola tem um app próprio nas lojas Apple e Android, com a sua marca, cores e menus. Conteúdos de aula, videoaulas, avisos, chat, notas, frequência, financeiro, boletos, Pix e Clube do Aluno, tudo integrado ao sistema F10 e ao AVA."
  />
  <meta
    property="og:title"
    content="Aplicativo escolar F10 Smart Aluno — app da escola para alunos e responsáveis"
  />
  <meta
    property="og:description"
    content="Leve a escola para o bolso do aluno com um aplicativo próprio, nas lojas Apple e Android. O F10 Smart Aluno concentra conteúdos, notas, presença, financeiro, notificações, indicações e muito mais, integrado ao F10 e ao ambiente virtual de aprendizagem (AVA)."
  />
  <link
    rel="canonical"
    href="https://f10.com.br/solucoes/aplicativo-smart-aluno"
  />

  <!-- JSON-LD: SoftwareApplication -->
  <script type="application/ld+json">
    {
      "@context": "https://schema.org",
      "@type": "SoftwareApplication",
      "name": "F10 Smart Aluno",
      "applicationCategory": "EducationalApplication",
      "operatingSystem": "Android, iOS",
      "description": "Aplicativo escolar que conecta escola, alunos e responsáveis, com conteúdos de aula, vídeos, podcasts, notas, frequência, financeiro, notificações e Clube do Aluno, integrado ao F10 e ao AVA.",
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
          "position": 3,
          "name": "Aplicativo Smart Aluno",
          "item": "https://f10.com.br/solucoes/aplicativo-smart-aluno"
        }
      ]
    }
  </script>

  <!-- JSON-LD: FAQPage (mesmas perguntas do FaqAccordion) -->
  <script type="application/ld+json">
    {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      "mainEntity": [
        {
          "@type": "Question",
          "name": "O que é o aplicativo escolar F10 Smart Aluno?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "O F10 Smart Aluno é o aplicativo escolar que conecta a escola, os alunos e os responsáveis. Nele ficam concentrados conteúdos de aula, vídeos, podcasts, notas, frequências, financeiro, notificações, Clube do Aluno e recursos como Indique um Amigo."
          }
        },
        {
          "@type": "Question",
          "name": "O aplicativo Smart Aluno substitui o AVA / Portal do Aluno?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "Não. O Smart Aluno complementa o AVA / Portal do Aluno. O AVA é o ambiente principal de estudo online, enquanto o app é o companheiro de bolso para o dia a dia, reforçando comunicação, notificações e acesso rápido a conteúdos e financeiro."
          }
        },
        {
          "@type": "Question",
          "name": "Quais dispositivos podem usar o Smart Aluno?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "O F10 Smart Aluno foi pensado para smartphones, com versões para Android e iOS. Os mesmos dados também podem ser acessados no Portal do Aluno via navegador, mantendo a experiência em múltiplas telas."
          }
        },
        {
          "@type": "Question",
          "name": "O que os responsáveis podem acompanhar pelo app?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "Responsáveis podem acompanhar notas, faltas, médias, mensagens, avisos da escola, eventos, histórico financeiro e situação das parcelas, além de receber notificações importantes diretamente no celular."
          }
        },
        {
          "@type": "Question",
          "name": "A escola consegue escolher o que aparece no aplicativo?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "Sim. As funcionalidades do Smart Aluno podem ser habilitadas ou desabilitadas diretamente no F10. A escola escolhe quais menus, cards e recursos estarão disponíveis para cada perfil de aluno."
          }
        }
      ]
    }
  </script>
</svelte:head>

<!-- ===== HERO ===== -->
<section class="relative isolate overflow-hidden bg-white/60">
  <!-- Breadcrumb -->
  <div class="lg:px-20 sm:px-2 pb-10 pt-4">
    <Breadcrumb
      baseUrl="https://f10.com.br"
      items={[
        { label: "HOME", href: "/" },
        { label: "SOLUÇÕES", href: "/solucoes" },
        { label: "APLICATIVO SMART ALUNO" },
      ]}
    />
  </div>

  <div class="container pb-16">
    <div class="grid gap-10 lg:grid-cols-12 items-start">
      <!-- Texto HERO -->
      <div class="lg:col-span-6">
        <h1
          class="max-w-[820px] text-[#010D28] tracking-[-0.03em] leading-[1.08]
                 text-[34px] sm:text-[42px] md:text-[50px] font-semibold"
        >
          O app oficial da sua escola, direto no bolso do aluno
        </h1>

        <p class="mt-6 text-[18px] leading-[1.8] text-[#000A57] max-w-[640px]">
          O <strong>F10 Smart Aluno</strong> é o aplicativo escolar da sua
          instituição nas lojas Apple e Android, com
          <strong>nome, marca e cores da escola</strong>. Em um só lugar, o
          aluno encontra conteúdos, videoaulas, avisos, chat, notas, presença,
          financeiro e Clube do Aluno.
        </p>

        <p
          class="mt-4 text-[16px] leading-[1.8] text-[#000A57]/80 max-w-[640px]"
        >
          Como o app é <strong>integrado ao F10</strong> e ao
          <a
            href="/solucoes/ambiente-virtual-de-aprendizado-ava"
            class="text-[#EA6D0B] underline-offset-2 hover:underline"
            >Ambiente Virtual de Aprendizagem (AVA)</a
          >, tudo o que acontece nas aulas, nos contratos e nas cobranças
          reflete automaticamente no Smart Aluno — sem retrabalho para a equipe.
        </p>

        <div class="mt-8 flex flex-wrap items-center gap-4">
          <button
            type="button"
            on:click={openSmartAppModal}
            class="inline-flex items-center justify-center gap-3 rounded-[999px]
                   bg-[#EA6D0B] px-8 md:px-10 py-3.5 text-white text-[16px] font-bold
                   transition hover:brightness-110 focus:outline-none focus:ring-2
                   focus:ring-[#EA6D0B]/40"
          >
            <span>Agendar demonstração</span>
            <ArrowRight size={22} />
          </button>

          <p class="text-[13px] text-[#7E82A2]">
            Demonstração com exemplos reais de conteúdos, notificações,
            financeiro, indicações de alunos e jornada completa no app.
          </p>
        </div>
      </div>

      <!-- Imagem HERO -->
      <div class="lg:col-span-6 mt-4 lg:mt-0">
        <div class="relative h-auto overflow-hidden">
          <img
            src="/smart_aluno.webp"
            alt="Telas do F10 Smart Aluno em smartphones com conteúdos, notificações, notas e financeiro"
            class="h-full w-full object-cover object-center"
            loading="lazy"
          />

          <div
            class="pointer-events-none absolute inset-0 rounded-[20px]
                   ring-1 ring-inset ring-white/30"
          ></div>
        </div>
      </div>
    </div>
  </div>
</section>

<!-- ===== O QUE É O SMART ALUNO ===== -->
<section class="relative py-12 md:py-16 bg-white">
  <div class="container">
    <div class="max-w-[760px]">
      <h2
        class="text-[30px] md:text-[36px] lg:text-[40px] font-semibold
               leading-[1.13] tracking-[-0.015em] text-[#000A57]"
      >
        O que é o aplicativo escolar F10 Smart Aluno?
      </h2>
      <p class="mt-4 text-[16px] leading-[1.8] text-[#000A57]/80">
        O Smart Aluno é o <strong>canal oficial de relacionamento</strong> da escola
        com alunos e responsáveis. Tudo o que antes se perdia em murais, bilhetes,
        agendas e grupos de WhatsApp passa a ficar organizado em um aplicativo único:
        conteúdos, videoaulas, recados, atividades para casa, eventos, financeiro
        e comunicação.
      </p>
      <p class="mt-3 text-[16px] leading-[1.8] text-[#000A57]/80">
        A escola controla tudo a partir do <strong>F10</strong>: quais menus e
        cards aparecem no app, quais cursos e turmas enviam conteúdos, como
        funcionam as campanhas de <strong>indicação de alunos</strong>, o Clube
        do Aluno e as regras de cobrança (boletos, Pix e notificações de
        mensalidade).
      </p>
    </div>
  </div>
</section>

<!-- ===== FUNCIONALIDADES ===== -->
<section class="relative py-12 md:py-16 bg-[#F3F4FD]">
  <div class="container">
    <div
      class="flex flex-col gap-4 md:flex-row md:items-end md:justify-between"
    >
      <div class="max-w-[620px]">
        <h2
          class="text-[28px] md:text-[34px] font-semibold leading-[1.15]
                 text-[#000A57]"
        >
          Quais funcionalidades o Smart Aluno oferece para alunos e
          responsáveis?
        </h2>
        <p
          class="mt-3 text-[15px] md:text-[16px] leading-[1.8] text-[#000A57]/80"
        >
          O app foi pensado para ir muito além de um simples boletim digital.
          Ele acompanha a jornada completa: do conteúdo da aula ao financeiro,
          passando por comunicação, engajamento e indicações.
        </p>
      </div>
    </div>

    <div class="mt-10 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
      {#each features as feature}
        <article
          class="rounded-[20px] bg-white px-6 py-6 md:px-7 md:py-7
                 ring-1 ring-[#E5E7EB] flex flex-col gap-4"
        >
          <div
            class="flex h-[56px] w-[56px] items-center justify-center rounded-full
                   bg-[#F3F4FD] text-[#000A57]"
          >
            <svelte:component this={feature.icon} />
          </div>
          <div>
            <h3
              class="text-[18px] md:text-[19px] font-semibold text-[#000A57]
                     leading-snug"
            >
              {@html feature.title}
            </h3>
            <p
              class="mt-2 text-[14px] md:text-[15px] leading-[1.7]
                     text-[#000A57]/80"
            >
              {feature.description}
            </p>
          </div>
        </article>
      {/each}
    </div>

    <p class="mt-6 text-[13px] text-[#000A57]/60">
      Todas essas funcionalidades podem ser habilitadas ou desabilitadas a
      qualquer momento diretamente no F10, por unidade ou por perfil.
    </p>
  </div>
</section>

<!-- ===== SMART ALUNO + AVA (BRANCO) ===== -->
<section class="relative py-14 md:py-16 bg-white">
  <div class="container">
    <div class="grid gap-10 lg:grid-cols-12 items-center">
      <div class="lg:col-span-6">
        <p class="text-[14px] font-semibold tracking-[0.18em] text-[#7E82A2]">
          ECOSSISTEMA F10
        </p>
        <h2
          class="mt-3 text-[28px] md:text-[34px] font-semibold
                 leading-[1.15] text-[#000A57]"
        >
          Como o Smart Aluno funciona junto com o AVA / Portal do Aluno?
        </h2>
        <p
          class="mt-4 text-[15px] md:text-[16px] leading-[1.8] text-[#000A57]/80"
        >
          O <strong>Smart Aluno</strong> e o
          <a
            href="/solucoes/ambiente-virtual-de-aprendizado-ava"
            class="text-[#EA6D0B] underline-offset-2 hover:underline"
            >Ambiente Virtual de Aprendizagem (AVA)</a
          >
          compartilham a mesma base de dados dentro do F10. O AVA foca na experiência
          de estudo online (trilhas, videoaulas, atividades). O app foca em acesso
          rápido, notificações e relacionamento.
        </p>
        <p
          class="mt-3 text-[15px] md:text-[16px] leading-[1.8] text-[#000A57]/80"
        >
          Na prática, o aluno pode assistir às aulas no AVA e continuar
          acompanhando notificações, conteúdos complementares, podcasts e
          financeiro pelo Smart Aluno, sem perder nada pelo caminho.
        </p>

        <ul class="mt-4 space-y-2 text-[14px] md:text-[15px] text-[#000A57]/85">
          <li>
            • AVA: foco em trilhas de EAD, videoaulas e atividades online.
          </li>
          <li>• Smart Aluno: foco no dia a dia, comunicação e engajamento.</li>
          <li>
            • F10: cérebro por trás, integrando dados acadêmicos e financeiros.
          </li>
        </ul>

        <div class="mt-5">
          <a
            href="/solucoes/ambiente-virtual-de-aprendizado-ava"
            class="inline-flex items-center rounded-full border
                   border-[#EA6D0B] px-4 py-2 text-[14px] font-semibold
                   text-[#000A57] hover:bg-[#EA6D0B]/10
                   focus:outline-none focus:ring-2 focus:ring-[#EA6D0B]/40"
          >
            Conhecer o Ambiente Virtual de Aprendizagem (AVA)
          </a>
        </div>
      </div>

      <div class="lg:col-span-6 mt-4 lg:mt-0 lg:ml-[-100px] lg:mb-[-50px]">
        <div class="relative h-auto overflow-hidden">
          <img
            src="/bg_smart_aluno_app_web.webp"
            alt="Telas do F10 Smart Aluno em smartphones e no portal web"
            class="h-full w-full object-cover object-center"
            loading="lazy"
          />

          <div
            class="pointer-events-none absolute inset-0 rounded-[20px]
                   ring-1 ring-inset ring-white/30"
          ></div>
        </div>
      </div>
    </div>
  </div>
</section>

<!-- ===== EAD + APP + AVA (BLOCO DARK) ===== -->
<section class="relative py-12 md:py-16 bg-white/80">
  <div class="lg:container lg:px-20">
    <div
      class="relative overflow-hidden lg:rounded-[28px]
             bg-[#0A1533] text-white ring-1 ring-white/5"
    >
      <div class="px-6 md:px-10 lg:px-14 py-12 md:py-16">
        <p
          class="flex items-center justify-center gap-4 pb-4 text-[#AEB3D9] text-[15px]"
        >
          <span class="inline-block h-px w-10 bg-[#AEB3D9]"></span>
          <span>EAD + App + AVA trabalhando juntos</span>
          <span class="inline-block h-px w-10 bg-[#AEB3D9]"></span>
        </p>

        <h2
          class="mt-2 text-center text-[26px] sm:text-[32px] md:text-[38px]
                 leading-[1.15] font-semibold"
        >
          Seu EAD com <span class="text-[#EA6D0B]">estrutura</span>,
          <span class="text-[#EA6D0B]">progresso</span> e
          <span class="text-[#EA6D0B]">relacionamento</span> no mesmo ecossistema
        </h2>

        <!-- Pilares em grade -->
        <div class="mt-10 grid gap-8 md:grid-cols-2">
          {#each pillars as pillar}
            <article
              class="rounded-[22px] bg-white/5 border border-white/10
                     px-6 py-6 md:px-7 md:py-7 flex gap-4"
            >
              <div
                class="flex-shrink-0 flex h-[60px] w-[60px] items-center
                       justify-center rounded-full bg-[#7E82A2]/40
                       ring-1 ring-white/20"
                aria-hidden="true"
              >
                <svelte:component this={pillar.icon} />
              </div>

              <div>
                <h3
                  class="text-[19px] md:text-[20px] font-semibold
                         text-white leading-snug"
                >
                  {@html pillar.title}
                </h3>
                <p
                  class="mt-2 text-[15px] md:text-[16px] leading-relaxed
                         text-white/80"
                >
                  {pillar.description}
                </p>
              </div>
            </article>
          {/each}
        </div>

        <p class="mt-6 text-[13px] text-[#CBD0FF]/80 text-center">
          Configurações, menus, cards e regras de acesso são definidos no F10 e
          refletidos automaticamente no AVA e no aplicativo, mantendo EAD, app e
          gestão sempre sincronizados.
        </p>

        <div
          class="pointer-events-none absolute inset-0 lg:rounded-[28px]
                 ring-1 ring-inset ring-white/10"
        ></div>
      </div>
    </div>
  </div>
</section>

<!-- ===== BENEFÍCIOS E KPIs ===== -->
<section class="relative py-14 md:py-16 bg-white">
  <div class="container px-5 md:px-8 lg:px-20">
    <!-- TÍTULO + SUBTÍTULO (FULL WIDTH, ACIMA DAS 2 COLUNAS) -->
    <div class="max-w-[1280px] space-y-4 mb-10">
      <h2
        class="text-[32px] md:text-[40px] lg:text-[48px]
               font-semibold leading-[1.3]
               tracking-[-0.03em] text-[#000A57]"
      >
        Quais benefícios o aplicativo traz para a escola?
      </h2>

      <p
        class="text-[18px] md:text-[22px] lg:text-[27px]
               leading-[1.5] font-medium text-[#000A57]/80
               max-w-[980px]"
      >
        Mais do que “ter um app”, a escola passa a ter uma estratégia clara de
        comunicação, engajamento e retenção, com dados para ajustar campanhas,
        reduzir evasão e diminuir o trabalho operacional da secretaria.
      </p>
    </div>

    <!-- 2 COLUNAS: ESQUERDA (BENEFÍCIOS) + DIREITA (KPIs) -->
    <div class="grid gap-10 lg:grid-cols-12 items-start lg:items-stretch">
      <!-- ESQUERDA: LISTA DE BENEFÍCIOS NO ESTILO FIGMA -->
      <div class="lg:col-span-6 flex">
        <div class="w-full flex flex-col justify-between">
          {#each benefits as benefit, i}
            <div class="flex flex-col gap-3">
              <p
                class="text-[16px] md:text-[18px] leading-[1.8]
                   font-semibold text-[#000A57]"
              >
                {benefit.title}
                <span
                  class="block font-normal text-[15px] md:text-[16px]
                     leading-[1.8] text-[#000A57]/80"
                >
                  {benefit.description}
                </span>
              </p>

              {#if i < benefits.length - 1}
                <div class="h-px w-full border-t border-[#000A57]/18"></div>
              {/if}
            </div>
          {/each}
        </div>
      </div>

      <!-- DIREITA: CARD DE KPIs (COMPONENTE) -->
      <div class="lg:col-span-6 flex justify-end">
        <div class="w-full max-w-[690px]">
          <KpiPanel
            title="Impacto direto nas matrículas e no caixa"
            items={kpis}
            footnote="*Indicadores sugeridos com base em boas práticas de comunicação e
            engajamento; os resultados variam conforme perfil da escola, região e
            execução."
          />
        </div>
      </div>
    </div>
  </div>
</section>

<!-- ===== DIA A DIA COM O APP ===== -->
<section class="relative py-14 md:py-16 bg-[#F3F4FD]">
  <div class="container">
    <div class="max-w-[720px]">
      <h2
        class="text-[28px] md:text-[34px] font-semibold leading-[1.15]
               text-[#000A57]"
      >
        Como o Smart Aluno entra na rotina da escola?
      </h2>
      <p
        class="mt-3 text-[15px] md:text-[16px] leading-[1.8] text-[#000A57]/80"
      >
        O app acompanha o aluno e os responsáveis em diferentes momentos do dia,
        ajudando a escola a se manter presente sem ser invasiva.
      </p>
    </div>

    <div class="mt-8 grid gap-6 md:grid-cols-2">
      {#each dayUse as row}
        <article
          class="rounded-[20px] bg-white px-6 py-6 md:px-7 md:py-7
                 ring-1 ring-[#E5E7EB]"
        >
          <h3
            class="text-[18px] md:text-[19px] font-semibold text-[#000A57]
                   leading-snug"
          >
            {row.title}
          </h3>
          <p
            class="mt-2 text-[14px] md:text-[15px] leading-[1.7]
                   text-[#000A57]/80"
          >
            {row.description}
          </p>
        </article>
      {/each}
    </div>
  </div>
</section>

<!-- ===== FAQ ===== -->
<section class="relative py-12 md:py-16 bg-white">
  <div class="container">
    <div
      class="flex flex-col md:flex-row md:items-center md:justify-between gap-6"
    >
      <div>
        <h2
          class="text-[26px] md:text-[32px] font-semibold leading-tight
                 text-[#000A57]"
        >
          Perguntas frequentes sobre o F10 Smart Aluno
        </h2>
        <p
          class="mt-2 text-[14px] md:text-[15px] text-[#000A57]/80 max-w-[520px]"
        >
          Entenda rapidamente como o aplicativo escolar funciona, para quem é e
          como se integra ao restante da plataforma F10.
        </p>
      </div>

      <a
        href="/solucoes"
        class="hidden md:inline-flex items-center rounded-full border
               border-[#EA6D0B] px-4 py-2 text-[14px] font-semibold
               text-[#000A57] hover:bg-[#EA6D0B]/10
               focus:outline-none focus:ring-2 focus:ring-[#EA6D0B]/40"
      >
        Ver todas as soluções F10
      </a>
    </div>

    <div class="mt-8">
      <FaqAccordion items={faqItems} />
    </div>

    <div class="mt-6 md:hidden">
      <a
        href="/solucoes"
        class="inline-flex items-center rounded-full border
               border-[#EA6D0B] px-4 py-2 text-[14px] font-semibold
               text-[#000A57] hover:bg-[#EA6D0B]/10
               focus:outline-none focus:ring-2 focus:ring-[#EA6D0B]/40"
      >
        Ver todas as soluções F10
      </a>
    </div>
  </div>
</section>

<!-- ===== CTA FINAL ===== -->
<section class="relative py-12 md:py-16 bg-white/60">
  <div class="container">
    <div class="grid gap-10 lg:grid-cols-12 items-center">
      <div class="lg:col-span-7 flex flex-col gap-5">
        <h2
          class="text-[#7E82A2] font-medium leading-[1.1] tracking-[-0.01em]
                 text-[32px] md:text-[40px]"
        >
          Coloque o nome da sua escola na Apple Store e na Google Play
        </h2>

        <p
          class="text-[#000A57] text-[15px] md:text-[16px] leading-[1.8] max-w-[560px]"
        >
          Com o <strong>F10 Smart Aluno</strong>, sua escola passa a ter
          <strong>um app próprio</strong>, com nome, cores e identidade visual
          da instituição nas lojas Apple e Android. Nada de soluções genéricas:
          é a sua marca na tela do aluno todos os dias.
        </p>

        <p class="text-[#000A57]/80 text-[14px] md:text-[15px] max-w-[560px]">
          Como o app já nasce integrado ao <strong>Software F10</strong>, você
          conta com cobrança de mensalidade, boletos e Pix, avisos e lembretes,
          grupos de estudo, chat, conteúdos, videoaulas, presença, notas,
          boletim, eventos, atividades para casa, Clube do Aluno e indicação de
          novos alunos — tudo em um único ecossistema.
        </p>

        <div class="pt-2">
          <button
            type="button"
            on:click={openSmartAppPresentationModal}
            class="inline-flex items-center justify-center gap-3 rounded-[999px]
                   bg-[#EA6D0B] px-8 md:px-10 py-4 text-white text-[16px]
                   font-bold transition hover:brightness-110
                   focus:outline-none focus:ring-2 focus:ring-[#EA6D0B]/40"
          >
            <span>Agendar apresentação do Smart Aluno</span>
            <ArrowRight size={24} />
          </button>
        </div>
      </div>

      <!-- Imagem final -->
      <div class="lg:col-span-5 mt-4 lg:mt-0">
        <div class="relative h-auto overflow-hidden">
          <img
            src="/aplicativo_para_escola_apple_android.webp"
            alt="Aplicativo escolar F10 Smart Aluno disponível nas lojas Apple e Google, com a marca da escola"
            class="h-full w-full object-cover object-center"
            loading="lazy"
          />

          <div
            class="pointer-events-none absolute inset-0 rounded-[20px]
                   ring-1 ring-inset ring-white/30"
          ></div>
        </div>
      </div>
    </div>
  </div>
</section>

<style>
  /* Mantém o padrão visual atual; ajustes finos via utilitários Tailwind. */
</style>
