<script lang="ts">
  import {
    ArrowUp,
    BarChart3,
    BellRing,
    Building2,
    CalendarCheck2,
    CheckCircle2,
    ClipboardCheck,
    Clock3,
    FileText,
    Funnel,
    MessageCircleMore,
    MessagesSquare,
    ShieldCheck,
    Target,
    TimerReset,
    TrendingUp,
    UserCheck,
    UsersRound,
    Workflow,
  } from "lucide-svelte";

  type IconComponent = typeof Target;

  type FeatureItem = {
    number?: string;
    title: string;
    description: string;
    icon: IconComponent;
  };

  type ComparisonItem = {
    current: string;
    future: string;
  };

  type ResponsibilityItem = {
    title: string;
    subtitle: string;
    icon: IconComponent;
    items: string[];
  };

  type ImplementationStep = {
    number: string;
    title: string;
    description: string;
    owner: string;
  };

  const projectSummary: FeatureItem[] = [
    {
      number: "01",
      title: "CRM de Leads",
      description: "Organiza o funil, os responsáveis, as tarefas e o histórico comercial até a matrícula.",
      icon: Workflow,
    },
    {
      number: "02",
      title: "WhatsApp integrado",
      description: "Mantém as conversas dentro do contexto do lead e continua o relacionamento com o aluno.",
      icon: MessageCircleMore,
    },
    {
      number: "03",
      title: "Cinco números por unidade",
      description: "Os números podem ser distribuídos entre o CRM e o F10 conforme a necessidade da operação.",
      icon: MessagesSquare,
    },
  ];

  const journeySteps: FeatureItem[] = [
    {
      number: "01",
      title: "Atrair",
      description: "O lead entra com origem, responsável e contexto inicial.",
      icon: Target,
    },
    {
      number: "02",
      title: "Nutrir",
      description: "Tarefas, mensagens e lembretes orientam a sequência de contatos.",
      icon: BellRing,
    },
    {
      number: "03",
      title: "Converter",
      description: "A equipe acompanha prioridades, negociações e oportunidades paradas.",
      icon: TrendingUp,
    },
    {
      number: "04",
      title: "Matricular",
      description: "A conversão encerra o ciclo comercial e inicia a jornada do aluno.",
      icon: CheckCircle2,
    },
  ];

  const crmPracticeRows: FeatureItem[] = [
    {
      number: "A",
      title: "A equipe sabe o que fazer hoje",
      description: "Tarefas e lembretes mostram os retornos, contatos e follow-ups que não podem esperar.",
      icon: CalendarCheck2,
    },
    {
      number: "B",
      title: "O histórico permanece na unidade",
      description: "Mensagens, observações e negociações continuam disponíveis mesmo quando o responsável muda.",
      icon: ShieldCheck,
    },
    {
      number: "C",
      title: "A gestão enxerga onde agir",
      description: "A visão Kanban mostra gargalos, volume por etapa, oportunidades paradas e produtividade.",
      icon: Funnel,
    },
  ];

  const leadWhatsAppUses: FeatureItem[] = [
    {
      title: "Conversa vinculada ao lead",
      description: "Cada mensagem permanece dentro do histórico da oportunidade.",
      icon: MessagesSquare,
    },
    {
      title: "Retorno mais rápido",
      description: "A equipe responde com contexto, modelos e informações organizadas.",
      icon: Clock3,
    },
    {
      title: "Continuidade comercial",
      description: "A negociação não depende de um único aparelho ou colaborador.",
      icon: ShieldCheck,
    },
  ];

  const studentWhatsAppUses: FeatureItem[] = [
    {
      title: "Checklist pós-matrícula",
      description: "Orientações, documentos e próximas etapas depois da venda.",
      icon: ClipboardCheck,
    },
    {
      title: "Avisos aos faltantes",
      description: "Comunicações e lembretes para apoiar a permanência do aluno.",
      icon: BellRing,
    },
    {
      title: "Cobranças e acordos",
      description: "Boletos, lembretes financeiros e negociações com mais agilidade.",
      icon: FileText,
    },
    {
      title: "Comunicação administrativa",
      description: "Um canal direto para assuntos acadêmicos e operacionais.",
      icon: MessageCircleMore,
    },
  ];

  const comparisonItems: ComparisonItem[] = [
    {
      current: "Informações espalhadas em planilhas, anotações e celulares",
      future: "Histórico centralizado e vinculado à operação da unidade",
    },
    {
      current: "Follow-ups dependentes da memória do vendedor",
      future: "Tarefas, alertas e próximas ações organizadas pelo sistema",
    },
    {
      current: "Dificuldade para saber onde cada lead está",
      future: "Funil visual com responsáveis, prioridades e gargalos",
    },
    {
      current: "Trocas na equipe interrompem negociações",
      future: "O atendimento continua com todo o contexto preservado",
    },
  ];

  const metrics: FeatureItem[] = [
    {
      title: "Tempo do primeiro atendimento",
      description: "Quanto tempo o lead espera até receber o primeiro retorno.",
      icon: Clock3,
    },
    {
      title: "Leads sem próxima atividade",
      description: "Oportunidades que precisam de uma ação definida pela equipe.",
      icon: CalendarCheck2,
    },
    {
      title: "Conversão entre etapas",
      description: "Avanço do lead ao longo do funil até a matrícula.",
      icon: Funnel,
    },
    {
      title: "Produtividade da equipe",
      description: "Atividades, contatos e acompanhamentos executados no período.",
      icon: BarChart3,
    },
  ];

  const responsibilities: ResponsibilityItem[] = [
    {
      title: "F10",
      subtitle: "Tecnologia e implantação",
      icon: Workflow,
      items: [
        "Configurar acessos, permissões e workflow",
        "Apoiar a distribuição dos números de WhatsApp",
        "Treinar gestores e equipes comerciais",
        "Acompanhar o início da operação",
      ],
    },
    {
      title: "Rede Cebrac",
      subtitle: "Diretriz e acompanhamento",
      icon: Building2,
      items: [
        "Conduzir a comunicação oficial",
        "Alinhar diretrizes do processo comercial",
        "Acompanhar a adesão das unidades",
        "Consolidar aprendizados da rede",
      ],
    },
    {
      title: "Unidade Cebrac",
      subtitle: "Adoção no dia a dia",
      icon: UserCheck,
      items: [
        "Indicar o responsável local",
        "Informar usuários e números de WhatsApp",
        "Participar dos treinamentos",
        "Registrar os atendimentos e próximas ações",
      ],
    },
  ];

  const implementationSteps: ImplementationStep[] = [
    {
      number: "01",
      title: "Preparar",
      description: "Indicar o responsável, os usuários e os números que participarão da operação.",
      owner: "Unidade",
    },
    {
      number: "02",
      title: "Configurar",
      description: "Estruturar acessos, workflow comercial e distribuição dos números de WhatsApp.",
      owner: "F10 + unidade",
    },
    {
      number: "03",
      title: "Treinar",
      description: "Capacitar vendedores, gestores e responsáveis pela operação.",
      owner: "F10",
    },
    {
      number: "04",
      title: "Operar",
      description: "Iniciar o uso com acompanhamento dos indicadores e ajustes necessários.",
      owner: "Todos",
    },
  ];
</script>

<svelte:head>
  <title>Rede Cebrac | CRM de Leads e WhatsApp integrado ao F10</title>
  <meta
    name="description"
    content="Apresentação institucional para as unidades Cebrac sobre CRM de Leads, WhatsApp integrado e implantação do novo modelo operacional."
  />
  <meta name="robots" content="noindex,nofollow,noarchive,nosnippet" />
  <link rel="preload" as="image" href="/background-hero-cebrac.png" />
  <link rel="preload" as="image" href="/hero-cebrac.webp" type="image/webp" />
  <link rel="preload" as="image" href="/Logo-Cebrac.png" />
</svelte:head>

<div class="presentation-page overflow-hidden bg-white text-[#2B4091]">
  <section id="inicio" class="hero-section relative isolate overflow-hidden bg-white">
    <img
      src="/background-hero-cebrac.png"
      alt=""
      aria-hidden="true"
      class="pointer-events-none absolute inset-0 -z-20 h-full w-full object-cover object-center"
      fetchpriority="high"
    />
    <div class="hero-orbit hero-orbit-left"></div>
    <div class="hero-orbit hero-orbit-right"></div>

    <div class="hero-grid mx-auto grid w-full max-w-[1660px] items-center px-5 py-12 sm:px-8 sm:py-16 lg:min-h-[100svh] lg:px-10 lg:py-10 xl:px-14">
      <div class="hero-copy relative z-20 max-w-[720px] lg:py-10">
        <div class="inline-flex max-w-full items-stretch overflow-hidden rounded-[20px] border border-[#2B4091]/15 bg-white/95 shadow-[0_16px_40px_rgba(43,64,145,0.14)] backdrop-blur-md">
          <div class="flex min-w-[145px] items-center justify-center bg-[#2B4091] px-5 py-3 sm:min-w-[174px] sm:px-7">
            <img src="/Logo-Cebrac.png" alt="Cebrac" class="h-9 w-auto object-contain sm:h-10" />
          </div>
          <div class="flex items-center px-4 py-3 text-[10px] font-extrabold uppercase leading-5 tracking-[0.13em] text-[#2B4091] sm:px-6 sm:text-xs">
            Evolução comercial da rede
          </div>
        </div>

        <p class="mt-8 text-xs font-extrabold uppercase tracking-[0.22em] text-[#2B4091]">
          Novos recursos para as unidades Cebrac
        </p>

        <h1 class="mt-5 text-[42px] font-semibold leading-[1.04] tracking-[-0.05em] text-[#2B4091] sm:text-[56px] lg:text-[59px] xl:text-[68px]">
          CRM e WhatsApp<br />
          <span class="relative inline-block">
            integrados.
            <span class="absolute -bottom-1 left-0 h-3 w-full -rotate-1 rounded-full bg-[#ffcd40]/80 -z-10"></span>
          </span>
        </h1>

        <p class="mt-7 max-w-[650px] text-lg font-medium leading-8 text-[#2B4091]/80 sm:text-[21px] sm:leading-9">
          Uma nova rotina para acompanhar cada lead até a matrícula e manter o relacionamento com o aluno dentro do F10.
        </p>

        <div class="mt-8 flex flex-wrap items-center gap-x-6 gap-y-3 border-l-4 border-[#61CE70] pl-5">
          <div>
            <strong class="block text-sm font-extrabold text-[#2B4091]">5 números de WhatsApp</strong>
            <span class="text-sm text-[#2B4091]/65">incluídos por unidade</span>
          </div>
          <div class="hidden h-10 w-px bg-[#2B4091]/15 sm:block"></div>
          <div>
            <strong class="block text-sm font-extrabold text-[#2B4091]">Agosto de 2026</strong>
            <span class="text-sm text-[#2B4091]/65">WhatsApp disponível no F10</span>
          </div>
        </div>
      </div>

      <div class="hero-visual relative z-10 hidden items-center justify-end lg:flex">
        <img
          src="/hero-cebrac.webp"
          alt="CRM F10 para a Rede Cebrac exibido em computador e atendimento integrado pelo WhatsApp"
          class="h-auto object-contain drop-shadow-[0_34px_48px_rgba(43,64,145,0.20)]"
          fetchpriority="high"
        />
      </div>
    </div>
  </section>

  <nav class="presentation-nav sticky top-0 z-40 bg-[#2B4091]" aria-label="Navegação da apresentação">
    <div class="mx-auto flex max-w-[1260px] items-center gap-5 overflow-x-auto px-5 py-3 sm:px-8">
      <img src="/Logo-Cebrac.png" alt="" aria-hidden="true" class="hidden h-8 w-auto shrink-0 lg:block" />
      <div class="presentation-nav-links flex min-w-max items-center gap-1">
        <a href="#resumo" class="presentation-nav-link">O que muda</a>
        <a href="#crm" class="presentation-nav-link">Como funciona</a>
        <a href="#whatsapp" class="presentation-nav-link">WhatsApp</a>
        <a href="#problemas" class="presentation-nav-link">Problemas resolvidos</a>
        <a href="#gestao" class="presentation-nav-link">Gestão</a>
        <a href="#implantacao" class="presentation-nav-link">Implantação</a>
      </div>
    </div>
  </nav>

  <section id="resumo" class="relative scroll-mt-16 bg-white px-5 py-20 sm:px-8 lg:px-12 lg:py-28">
    <div class="summary-shape"></div>
    <div class="relative mx-auto max-w-[1260px]">
      <div class="grid gap-14 lg:grid-cols-[0.7fr_1.3fr] lg:items-start lg:gap-24">
        <div class="lg:sticky lg:top-24">
          <p class="section-label">O projeto em 30 segundos</p>
          <h2 class="section-title mt-4">Três recursos.<br />Uma única jornada.</h2>
          <p class="mt-6 max-w-[480px] text-lg leading-8 text-[#2B4091]/72">
            O CRM organiza a operação comercial. O WhatsApp registra as conversas. O F10 continua o relacionamento depois da matrícula.
          </p>
        </div>

        <ol class="divide-y divide-[#2B4091]/15 border-y border-[#2B4091]/15">
          {#each projectSummary as item}
            <li class="group grid gap-5 py-8 sm:grid-cols-[90px_1fr] sm:items-start sm:gap-8 lg:py-10">
              <span class="text-[48px] font-semibold leading-none tracking-[-0.06em] text-[#ffcd40] sm:text-[64px]">{item.number}</span>
              <div class="grid gap-4 sm:grid-cols-[1fr_1.2fr] sm:items-start sm:gap-8">
                <div class="flex items-center gap-4">
                  <div class="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[#61CE70]/20 text-[#2B4091]">
                    <svelte:component this={item.icon} size={24} strokeWidth={1.9} />
                  </div>
                  <h3 class="text-2xl font-semibold tracking-[-0.03em] text-[#2B4091]">{item.title}</h3>
                </div>
                <p class="text-base leading-7 text-[#2B4091]/70">{item.description}</p>
              </div>
            </li>
          {/each}
        </ol>
      </div>
    </div>
  </section>

  <section id="crm" class="relative scroll-mt-16 overflow-hidden bg-[#2B4091] px-5 py-20 text-white sm:px-8 lg:px-12 lg:py-28">
    <div class="crm-sun"></div>
    <div class="relative mx-auto max-w-[1260px]">
      <div class="mx-auto max-w-[820px] text-center">
        <p class="section-label section-label-light">Como o CRM funciona</p>
        <h2 class="mt-4 text-[38px] font-semibold leading-[1.06] tracking-[-0.045em] text-white sm:text-[50px] lg:text-[60px]">
          O lead entra, avança e chega à matrícula.
        </h2>
        <p class="mx-auto mt-6 max-w-[720px] text-lg leading-8 text-white/72">
          Em cada etapa, a equipe enxerga o responsável, a próxima ação e o tempo que a oportunidade está parada.
        </p>
      </div>

      <div class="journey-track mt-16">
        {#each journeySteps as step, index}
          <article class="journey-step">
            <div class="journey-node">
              <svelte:component this={step.icon} size={26} strokeWidth={1.9} />
            </div>
            <span class="mt-5 block text-xs font-extrabold tracking-[0.16em] text-[#ffcd40]">{step.number}</span>
            <h3 class="mt-2 text-2xl font-semibold text-white">{step.title}</h3>
            <p class="mt-3 text-sm leading-6 text-white/62">{step.description}</p>
            {#if index < journeySteps.length - 1}
              <div class="journey-arrow" aria-hidden="true">→</div>
            {/if}
          </article>
        {/each}
      </div>

      <div class="mt-20 grid items-center gap-14 lg:grid-cols-[0.9fr_1.1fr] lg:gap-20">
        <div>
          <p class="section-label section-label-light">Na prática</p>
          <h3 class="mt-4 text-[34px] font-semibold leading-[1.08] tracking-[-0.04em] text-white sm:text-[44px]">
            A equipe deixa de depender da memória.
          </h3>

          <div class="mt-8 divide-y divide-white/15 border-y border-white/15">
            {#each crmPracticeRows as row}
              <div class="grid gap-4 py-6 sm:grid-cols-[52px_1fr] sm:gap-5">
                <span class="text-3xl font-semibold text-[#ffcd40]">{row.number}</span>
                <div>
                  <h4 class="text-lg font-semibold text-white">{row.title}</h4>
                  <p class="mt-2 text-sm leading-6 text-white/62">{row.description}</p>
                </div>
              </div>
            {/each}
          </div>
        </div>

        <div class="media-frame media-frame-light aspect-[16/11]">
          <div class="media-toolbar">
            <span></span><span></span><span></span>
            <small>Captura da visão Kanban</small>
          </div>
          <div class="media-canvas">
            <Funnel size={42} strokeWidth={1.4} />
            <strong>Imagem do CRM</strong>
            <p>Inserir a tela real com etapas, leads, responsáveis e próximas ações.</p>
          </div>
        </div>
      </div>
    </div>
  </section>

  <section id="whatsapp" class="relative scroll-mt-16 overflow-hidden bg-white">
    <div class="whatsapp-heading px-5 py-20 sm:px-8 lg:px-12 lg:py-24">
      <div class="mx-auto max-w-[900px] text-center">
        <p class="section-label">Onde o WhatsApp será usado</p>
        <h2 class="section-title mt-4">Antes e depois da matrícula.</h2>
        <p class="mx-auto mt-5 max-w-[760px] text-lg leading-8 text-[#2B4091]/72">
          Os cinco números incluídos por unidade podem ser distribuídos entre o CRM de Leads e o F10 conforme a necessidade da operação.
        </p>
      </div>
    </div>

    <div class="whatsapp-split">
      <section class="whatsapp-side whatsapp-before">
        <div class="whatsapp-side-inner">
          <span class="whatsapp-kicker">Antes da matrícula</span>
          <h3>WhatsApp no CRM de Leads</h3>
          <p class="whatsapp-intro">A conversa comercial passa a fazer parte do processo de matrícula.</p>

          <div class="whatsapp-list">
            {#each leadWhatsAppUses as item}
              <div class="whatsapp-list-item">
                <svelte:component this={item.icon} size={22} strokeWidth={1.9} />
                <div>
                  <strong>{item.title}</strong>
                  <p>{item.description}</p>
                </div>
              </div>
            {/each}
          </div>
        </div>
      </section>

      <div class="whatsapp-bridge">
        <span>5</span>
        <strong>números</strong>
        <small>por unidade</small>
      </div>

      <section class="whatsapp-side whatsapp-after">
        <div class="whatsapp-side-inner">
          <span class="whatsapp-kicker">Depois da matrícula</span>
          <h3>WhatsApp dentro do F10</h3>
          <p class="whatsapp-intro">O relacionamento continua com alunos, responsáveis e equipe administrativa.</p>

          <div class="whatsapp-list whatsapp-list-grid">
            {#each studentWhatsAppUses as item}
              <div class="whatsapp-list-item">
                <svelte:component this={item.icon} size={22} strokeWidth={1.9} />
                <div>
                  <strong>{item.title}</strong>
                  <p>{item.description}</p>
                </div>
              </div>
            {/each}
          </div>

          <div class="mt-8 inline-flex items-center gap-3 rounded-full bg-white/15 px-4 py-2.5 text-sm font-semibold text-white">
            <CalendarCheck2 size={18} />
            Disponível a partir de agosto de 2026
          </div>
        </div>
      </section>
    </div>
  </section>

  <section id="problemas" class="relative scroll-mt-16 overflow-hidden bg-[#ffcd40] px-5 py-20 sm:px-8 lg:px-12 lg:py-28">
    <div class="comparison-ring comparison-ring-one"></div>
    <div class="comparison-ring comparison-ring-two"></div>

    <div class="relative mx-auto max-w-[1260px]">
      <div class="grid gap-8 lg:grid-cols-[0.7fr_1.3fr] lg:items-end lg:gap-20">
        <div>
          <p class="section-label">Problemas que o projeto resolve</p>
          <h2 class="section-title mt-4">O que muda na rotina comercial.</h2>
        </div>
        <p class="max-w-[760px] text-lg leading-8 text-[#2B4091]/75 lg:pb-1">
          A proposta substitui controles individuais por um processo visível, contínuo e fácil de acompanhar.
        </p>
      </div>

      <div class="mt-14 overflow-hidden rounded-[32px] bg-white/95 shadow-[0_24px_60px_rgba(43,64,145,0.16)]">
        <div class="grid grid-cols-2 bg-[#2B4091] text-white">
          <div class="border-r border-white/15 px-5 py-4 text-sm font-extrabold uppercase tracking-[0.14em] sm:px-8">Hoje</div>
          <div class="px-5 py-4 text-sm font-extrabold uppercase tracking-[0.14em] text-[#ffcd40] sm:px-8">Com o novo modelo</div>
        </div>
        {#each comparisonItems as item}
          <div class="grid grid-cols-2 border-t border-[#2B4091]/10">
            <div class="border-r border-[#2B4091]/10 px-5 py-6 text-sm leading-6 text-[#2B4091]/65 sm:px-8">{item.current}</div>
            <div class="px-5 py-6 text-sm font-semibold leading-6 text-[#2B4091] sm:px-8">
              <span class="mr-2 text-[#61CE70]">✓</span>{item.future}
            </div>
          </div>
        {/each}
      </div>
    </div>
  </section>

  <section id="gestao" class="scroll-mt-16 bg-white px-5 py-20 sm:px-8 lg:px-12 lg:py-28">
    <div class="mx-auto max-w-[1260px]">
      <div class="grid gap-14 lg:grid-cols-[0.65fr_1.35fr] lg:gap-24">
        <div>
          <p class="section-label">Como a gestão acompanha</p>
          <h2 class="section-title mt-4">Poucos indicadores. Perguntas claras.</h2>
          <p class="mt-6 max-w-[500px] text-lg leading-8 text-[#2B4091]/72">
            O acompanhamento mostra onde a equipe precisa agir e se o processo está realmente avançando.
          </p>
        </div>

        <div class="metric-lines">
          {#each metrics as metric, index}
            <div class="metric-line">
              <span class="metric-index">0{index + 1}</span>
              <div class="metric-icon">
                <svelte:component this={metric.icon} size={24} strokeWidth={1.9} />
              </div>
              <div>
                <h3>{metric.title}</h3>
                <p>{metric.description}</p>
              </div>
            </div>
          {/each}
        </div>
      </div>

      <div class="mt-24 border-y border-[#2B4091]/15 py-12">
        <div class="grid gap-10 lg:grid-cols-[0.55fr_1.45fr] lg:gap-20">
          <div>
            <p class="section-label">Quem faz o quê</p>
            <h3 class="mt-4 text-[34px] font-semibold leading-[1.08] tracking-[-0.04em] text-[#2B4091] sm:text-[42px]">Responsabilidades sem dúvida.</h3>
          </div>

          <div class="responsibility-columns">
            {#each responsibilities as responsibility}
              <article class="responsibility-column">
                <div class="responsibility-heading">
                  <svelte:component this={responsibility.icon} size={24} strokeWidth={1.9} />
                  <div>
                    <span>{responsibility.subtitle}</span>
                    <h4>{responsibility.title}</h4>
                  </div>
                </div>
                <ul>
                  {#each responsibility.items as item}
                    <li><span></span>{item}</li>
                  {/each}
                </ul>
              </article>
            {/each}
          </div>
        </div>
      </div>
    </div>
  </section>

  <section id="implantacao" class="relative scroll-mt-16 overflow-hidden bg-[#2B4091] px-5 py-20 text-white sm:px-8 lg:px-12 lg:py-28">
    <div class="implementation-wave"></div>
    <div class="relative mx-auto max-w-[1260px]">
      <div class="grid gap-10 lg:grid-cols-[0.7fr_1.3fr] lg:items-end lg:gap-20">
        <div>
          <p class="section-label section-label-light">Como começa</p>
          <h2 class="mt-4 text-[38px] font-semibold leading-[1.06] tracking-[-0.045em] text-white sm:text-[50px] lg:text-[58px]">Quatro etapas até a operação.</h2>
        </div>
        <p class="max-w-[760px] text-lg leading-8 text-white/70 lg:pb-1">
          A implantação será progressiva, com preparação, configuração, treinamento e início assistido.
        </p>
      </div>

      <div class="implementation-track mt-16">
        {#each implementationSteps as step}
          <article class="implementation-step">
            <div class="implementation-number">{step.number}</div>
            <div class="implementation-content">
              <span>{step.owner}</span>
              <h3>{step.title}</h3>
              <p>{step.description}</p>
            </div>
          </article>
        {/each}
      </div>

      <div class="mt-18 grid gap-8 border-t border-white/15 pt-12 lg:grid-cols-[1fr_auto] lg:items-center">
        <div>
          <p class="text-xs font-extrabold uppercase tracking-[0.2em] text-[#ffcd40]">O que a unidade precisa organizar agora</p>
          <p class="mt-4 max-w-[820px] text-2xl font-semibold leading-9 text-white">
            Indicar o responsável, mapear os usuários e definir os cinco números de WhatsApp da operação.
          </p>
        </div>
        <div class="rounded-full bg-[#ffcd40] px-6 py-4 text-sm font-extrabold text-[#2B4091]">
          Cronograma oficial será comunicado pela Rede Cebrac
        </div>
      </div>
    </div>
  </section>

  <footer class="bg-white px-5 py-14 sm:px-8 lg:px-12">
    <div class="mx-auto flex max-w-[1180px] flex-col gap-8 border-t border-[#2B4091]/15 pt-10 md:flex-row md:items-center md:justify-between">
      <div class="flex items-center gap-6">
        <img src="/Logo-Cebrac.png" alt="Cebrac" class="h-12 w-auto rounded-xl bg-[#2B4091] px-3 py-2 object-contain" />
        <div class="h-9 w-px bg-[#2B4091]/15"></div>
        <img src="/logo_f10.svg" alt="F10 Software" class="h-10 w-auto" />
      </div>
      <p class="max-w-[640px] text-base font-semibold leading-7 text-[#2B4091]/75">
        Método comercial, tecnologia integrada e uma operação preparada para crescer com continuidade e controle.
      </p>
      <a href="#inicio" class="inline-flex items-center gap-2 text-sm font-extrabold text-[#2B4091] transition hover:text-[#61CE70]">
        Voltar ao início
        <ArrowUp size={18} />
      </a>
    </div>
  </footer>
</div>

<style>
  .presentation-page {
    font-family: "Plus Jakarta Sans", ui-sans-serif, system-ui, sans-serif;
  }

  .hero-grid {
    grid-template-columns: minmax(0, 1fr);
  }

  .hero-orbit {
    position: absolute;
    z-index: -10;
    border-radius: 9999px;
    border: 28px solid rgba(255, 205, 64, 0.22);
    pointer-events: none;
  }

  .hero-orbit-left {
    left: -150px;
    top: 110px;
    width: 340px;
    height: 340px;
  }

  .hero-orbit-right {
    right: -190px;
    bottom: 20px;
    width: 440px;
    height: 440px;
    border-color: rgba(97, 206, 112, 0.16);
  }

  .section-label {
    color: #2b4091;
    font-size: 0.75rem;
    font-weight: 800;
    letter-spacing: 0.2em;
    text-transform: uppercase;
  }

  .section-label-light {
    color: #ffcd40;
  }

  .section-title {
    color: #2b4091;
    font-size: clamp(2.3rem, 4vw, 3.75rem);
    font-weight: 600;
    letter-spacing: -0.045em;
    line-height: 1.06;
  }

  .presentation-nav-links {
    scrollbar-width: none;
  }

  .presentation-nav-links::-webkit-scrollbar {
    display: none;
  }

  .presentation-nav-link {
    flex: 0 0 auto;
    border-radius: 9999px;
    padding: 0.58rem 0.9rem;
    color: rgba(255, 255, 255, 0.72);
    font-size: 0.75rem;
    font-weight: 800;
    letter-spacing: 0.025em;
    transition: background-color 160ms ease, color 160ms ease;
  }

  .presentation-nav-link:hover,
  .presentation-nav-link:focus-visible {
    background: #ffcd40;
    color: #2b4091;
    outline: none;
  }

  .summary-shape {
    position: absolute;
    right: -110px;
    top: 60px;
    width: 280px;
    height: 280px;
    border-radius: 52% 48% 61% 39% / 43% 57% 43% 57%;
    background: rgba(97, 206, 112, 0.12);
    transform: rotate(18deg);
  }

  .crm-sun {
    position: absolute;
    right: -120px;
    top: -120px;
    width: 360px;
    height: 360px;
    border-radius: 9999px;
    border: 52px solid rgba(255, 205, 64, 0.14);
  }

  .journey-track {
    position: relative;
    display: grid;
    gap: 2rem;
  }

  .journey-step {
    position: relative;
    text-align: center;
  }

  .journey-node {
    position: relative;
    z-index: 2;
    display: flex;
    width: 72px;
    height: 72px;
    align-items: center;
    justify-content: center;
    margin: 0 auto;
    border-radius: 9999px;
    background: #ffcd40;
    color: #2b4091;
    box-shadow: 0 0 0 14px rgba(255, 255, 255, 0.08);
  }

  .journey-arrow {
    display: none;
  }

  .media-frame {
    overflow: hidden;
    border: 1px solid rgba(43, 64, 145, 0.18);
    border-radius: 30px;
    background: rgba(43, 64, 145, 0.06);
    box-shadow: 0 22px 55px rgba(43, 64, 145, 0.16);
  }

  .media-frame-light {
    border-color: rgba(255, 255, 255, 0.22);
    background: rgba(255, 255, 255, 0.95);
  }

  .media-toolbar {
    display: flex;
    min-height: 44px;
    align-items: center;
    gap: 7px;
    border-bottom: 1px solid rgba(43, 64, 145, 0.14);
    background: rgba(43, 64, 145, 0.06);
    padding: 0 18px;
  }

  .media-toolbar > span {
    width: 8px;
    height: 8px;
    border-radius: 9999px;
    background: #61ce70;
  }

  .media-toolbar > span:nth-child(2) {
    background: #ffcd40;
  }

  .media-toolbar > span:nth-child(3) {
    background: #2b4091;
  }

  .media-toolbar small {
    margin-left: 8px;
    color: rgba(43, 64, 145, 0.58);
    font-size: 0.68rem;
    font-weight: 700;
    letter-spacing: 0.08em;
    text-transform: uppercase;
  }

  .media-canvas {
    display: flex;
    min-height: calc(100% - 44px);
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 32px;
    color: #2b4091;
    text-align: center;
  }

  .media-canvas strong {
    margin-top: 16px;
    font-size: 0.8rem;
    font-weight: 800;
    letter-spacing: 0.13em;
    text-transform: uppercase;
  }

  .media-canvas p {
    margin-top: 8px;
    max-width: 380px;
    color: rgba(43, 64, 145, 0.62);
    font-size: 0.82rem;
    line-height: 1.5rem;
  }

  .whatsapp-heading {
    background: linear-gradient(180deg, rgba(97, 206, 112, 0.12), rgba(255, 255, 255, 1));
  }

  .whatsapp-split {
    position: relative;
    display: grid;
  }

  .whatsapp-side {
    padding: 4.5rem 1.25rem;
    color: white;
  }

  .whatsapp-before {
    background: #2b4091;
  }

  .whatsapp-after {
    background: #61ce70;
  }

  .whatsapp-side-inner {
    max-width: 560px;
    margin: 0 auto;
  }

  .whatsapp-kicker {
    font-size: 0.75rem;
    font-weight: 800;
    letter-spacing: 0.18em;
    text-transform: uppercase;
    color: #ffcd40;
  }

  .whatsapp-side h3 {
    margin-top: 0.85rem;
    font-size: clamp(2rem, 4vw, 3.1rem);
    font-weight: 600;
    letter-spacing: -0.04em;
    line-height: 1.06;
  }

  .whatsapp-intro {
    margin-top: 1.2rem;
    max-width: 520px;
    color: rgba(255, 255, 255, 0.78);
    font-size: 1.05rem;
    line-height: 1.8rem;
  }

  .whatsapp-list {
    margin-top: 2rem;
    border-top: 1px solid rgba(255, 255, 255, 0.2);
  }

  .whatsapp-list-item {
    display: grid;
    grid-template-columns: 32px 1fr;
    gap: 0.8rem;
    padding: 1.15rem 0;
    border-bottom: 1px solid rgba(255, 255, 255, 0.2);
  }

  .whatsapp-list-item strong {
    font-size: 0.95rem;
  }

  .whatsapp-list-item p {
    margin-top: 0.25rem;
    color: rgba(255, 255, 255, 0.68);
    font-size: 0.85rem;
    line-height: 1.45rem;
  }

  .whatsapp-bridge {
    position: relative;
    z-index: 5;
    display: flex;
    width: 132px;
    height: 132px;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    margin: -38px auto;
    border: 10px solid white;
    border-radius: 9999px;
    background: #ffcd40;
    color: #2b4091;
    box-shadow: 0 18px 45px rgba(43, 64, 145, 0.18);
  }

  .whatsapp-bridge span {
    font-size: 2.5rem;
    font-weight: 700;
    line-height: 1;
  }

  .whatsapp-bridge strong {
    font-size: 0.95rem;
  }

  .whatsapp-bridge small {
    font-size: 0.7rem;
    opacity: 0.72;
  }

  .comparison-ring {
    position: absolute;
    border-radius: 9999px;
    border: 34px solid rgba(43, 64, 145, 0.08);
  }

  .comparison-ring-one {
    left: -110px;
    top: 30px;
    width: 280px;
    height: 280px;
  }

  .comparison-ring-two {
    right: -140px;
    bottom: -40px;
    width: 360px;
    height: 360px;
  }

  .metric-lines {
    border-top: 1px solid rgba(43, 64, 145, 0.16);
  }

  .metric-line {
    display: grid;
    grid-template-columns: 52px 48px 1fr;
    gap: 1rem;
    align-items: start;
    padding: 1.7rem 0;
    border-bottom: 1px solid rgba(43, 64, 145, 0.16);
  }

  .metric-index {
    padding-top: 0.7rem;
    color: #ffcd40;
    font-size: 1.7rem;
    font-weight: 700;
    letter-spacing: -0.04em;
  }

  .metric-icon {
    display: flex;
    width: 46px;
    height: 46px;
    align-items: center;
    justify-content: center;
    border-radius: 9999px;
    background: rgba(97, 206, 112, 0.18);
    color: #2b4091;
  }

  .metric-line h3 {
    color: #2b4091;
    font-size: 1.15rem;
    font-weight: 700;
  }

  .metric-line p {
    margin-top: 0.35rem;
    color: rgba(43, 64, 145, 0.68);
    font-size: 0.9rem;
    line-height: 1.55rem;
  }

  .responsibility-columns {
    display: grid;
    gap: 2rem;
  }

  .responsibility-column {
    position: relative;
    padding-left: 1.25rem;
    border-left: 5px solid #61ce70;
  }

  .responsibility-column:nth-child(2) {
    border-left-color: #2b4091;
  }

  .responsibility-column:nth-child(3) {
    border-left-color: #ffcd40;
  }

  .responsibility-heading {
    display: flex;
    align-items: center;
    gap: 0.8rem;
    color: #2b4091;
  }

  .responsibility-heading span {
    display: block;
    color: rgba(43, 64, 145, 0.55);
    font-size: 0.68rem;
    font-weight: 800;
    letter-spacing: 0.12em;
    text-transform: uppercase;
  }

  .responsibility-heading h4 {
    margin-top: 0.15rem;
    font-size: 1.35rem;
    font-weight: 700;
  }

  .responsibility-column ul {
    margin-top: 1.2rem;
  }

  .responsibility-column li {
    display: flex;
    gap: 0.65rem;
    padding: 0.45rem 0;
    color: rgba(43, 64, 145, 0.72);
    font-size: 0.85rem;
    line-height: 1.45rem;
  }

  .responsibility-column li span {
    width: 6px;
    height: 6px;
    flex: 0 0 auto;
    margin-top: 0.48rem;
    border-radius: 9999px;
    background: #61ce70;
  }

  .implementation-wave {
    position: absolute;
    left: -10%;
    right: -10%;
    bottom: -180px;
    height: 360px;
    border-radius: 50%;
    background: rgba(97, 206, 112, 0.12);
  }

  .implementation-track {
    position: relative;
    display: grid;
    gap: 2rem;
  }

  .implementation-step {
    display: grid;
    grid-template-columns: 72px 1fr;
    gap: 1.1rem;
    align-items: start;
  }

  .implementation-number {
    display: flex;
    width: 64px;
    height: 64px;
    align-items: center;
    justify-content: center;
    border-radius: 9999px;
    background: #ffcd40;
    color: #2b4091;
    font-size: 0.95rem;
    font-weight: 800;
  }

  .implementation-content {
    padding-top: 0.2rem;
  }

  .implementation-content span {
    display: block;
    color: #61ce70;
    font-size: 0.68rem;
    font-weight: 800;
    letter-spacing: 0.13em;
    text-transform: uppercase;
  }

  .implementation-content h3 {
    margin-top: 0.25rem;
    color: white;
    font-size: 1.55rem;
    font-weight: 600;
  }

  .implementation-content p {
    margin-top: 0.5rem;
    max-width: 520px;
    color: rgba(255, 255, 255, 0.64);
    font-size: 0.9rem;
    line-height: 1.55rem;
  }

  @media (min-width: 768px) {
    .whatsapp-list-grid {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      column-gap: 2rem;
    }

    .implementation-track {
      grid-template-columns: repeat(2, minmax(0, 1fr));
      column-gap: 4rem;
      row-gap: 3rem;
    }
  }

  @media (min-width: 1024px) {
    .hero-grid {
      grid-template-columns: minmax(0, 0.9fr) minmax(0, 1.3fr);
      column-gap: 0;
    }

    .hero-visual {
      min-height: 780px;
      margin-left: -9rem;
      margin-right: -6rem;
      pointer-events: none;
    }

    .hero-visual img {
      width: 105%;
      max-width: none;
      transform: translateX(-1.5%);
      transform-origin: center right;
    }

    .journey-track {
      grid-template-columns: repeat(4, minmax(0, 1fr));
      gap: 3rem;
    }

    .journey-track::before {
      content: "";
      position: absolute;
      left: 10%;
      right: 10%;
      top: 35px;
      height: 2px;
      background: rgba(255, 255, 255, 0.18);
    }

    .journey-arrow {
      position: absolute;
      right: -2rem;
      top: 21px;
      z-index: 3;
      display: block;
      color: #ffcd40;
      font-size: 1.6rem;
    }

    .whatsapp-split {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }

    .whatsapp-side {
      padding: 6rem 4rem;
    }

    .whatsapp-before .whatsapp-side-inner {
      margin-left: auto;
      margin-right: 4rem;
    }

    .whatsapp-after .whatsapp-side-inner {
      margin-left: 4rem;
      margin-right: auto;
    }

    .whatsapp-bridge {
      position: absolute;
      left: 50%;
      top: 50%;
      margin: 0;
      transform: translate(-50%, -50%);
    }

    .responsibility-columns {
      grid-template-columns: repeat(3, minmax(0, 1fr));
      gap: 2.5rem;
    }

    .implementation-track {
      grid-template-columns: repeat(4, minmax(0, 1fr));
      gap: 2rem;
    }

    .implementation-track::before {
      content: "";
      position: absolute;
      left: 32px;
      right: 10%;
      top: 31px;
      height: 2px;
      background: rgba(255, 255, 255, 0.16);
    }

    .implementation-step {
      position: relative;
      z-index: 2;
      display: block;
    }

    .implementation-content {
      padding-top: 1.5rem;
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .presentation-page *,
    .presentation-page *::before,
    .presentation-page *::after {
      scroll-behavior: auto !important;
      transition-duration: 0.01ms !important;
    }
  }

  :global(html) {
    scroll-behavior: smooth;
  }
</style>
