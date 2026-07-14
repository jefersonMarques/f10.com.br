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
    Gauge,
    MessageCircleMore,
    MessagesSquare,
    ShieldCheck,
    SlidersHorizontal,
    Target,
    TimerReset,
    TrendingUp,
    UserCheck,
    UsersRound,
    Workflow,
  } from "lucide-svelte";

  type IconComponent = typeof Target;

  type FeatureItem = {
    title: string;
    description: string;
    icon: IconComponent;
    iconClass: string;
  };

  type ChallengeItem = {
    number: string;
    title: string;
    description: string;
    points: string[];
    icon: IconComponent;
  };

  type ResponsibilityItem = {
    label: string;
    title: string;
    description: string;
    icon: IconComponent;
    accentClass: string;
    iconClass: string;
    items: string[];
  };

  type ImplementationStep = {
    number: string;
    title: string;
    description: string;
    owner: string;
  };

  const heroHighlights: FeatureItem[] = [
    {
      title: "CRM + workflow",
      description: "Cada lead com etapa, responsável e próxima ação.",
      icon: Workflow,
      iconClass: "text-[#EA6D0B]",
    },
    {
      title: "WhatsApp integrado",
      description: "Atendimento de leads no CRM e de alunos no F10.",
      icon: MessageCircleMore,
      iconClass: "text-[#2F8F57]",
    },
    {
      title: "Gestão por indicadores",
      description: "Visibilidade para acompanhar a operação e a conversão.",
      icon: BarChart3,
      iconClass: "text-[#2B4091]",
    },
  ];

  const overviewItems = [
    {
      number: "01",
      title: "Organizar a jornada comercial",
      description: "Workflow, responsáveis, tarefas e histórico em um único ambiente.",
    },
    {
      number: "02",
      title: "Integrar as conversas",
      description: "Cinco números de WhatsApp por unidade, distribuídos entre CRM e F10.",
    },
    {
      number: "03",
      title: "Acompanhar a evolução",
      description: "Indicadores para orientar a rotina da equipe e as decisões da gestão.",
    },
  ];

  const challenges: ChallengeItem[] = [
    {
      number: "01",
      title: "Nenhuma oportunidade pode ficar para trás",
      description:
        "A Rede Cebrac investe para gerar oportunidades. O novo modelo cria uma rotina de acompanhamento para que cada lead avance com contexto, prazo e responsável.",
      points: ["Follow-ups no momento certo", "Próxima ação definida", "Menos leads esquecidos"],
      icon: TimerReset,
    },
    {
      number: "02",
      title: "O conhecimento precisa permanecer na unidade",
      description:
        "Atividades, conversas e negociações passam a compor um histórico único. Assim, o atendimento continua mesmo quando existem mudanças na equipe comercial.",
      points: ["Histórico preservado", "Continuidade nas negociações", "Integração mais rápida de novos colaboradores"],
      icon: UsersRound,
    },
  ];

  const crmFeatures: FeatureItem[] = [
    {
      title: "Visão Kanban",
      description: "Leads organizados por etapa para mostrar prioridades, gargalos e volume em andamento.",
      icon: Funnel,
      iconClass: "text-[#EA6D0B]",
    },
    {
      title: "Tarefas e lembretes",
      description: "A equipe sabe o que fazer, com quem falar e quando executar o próximo contato.",
      icon: CalendarCheck2,
      iconClass: "text-[#2B4091]",
    },
    {
      title: "Cadência e automação",
      description: "Mensagens, alertas e atividades ajudam a manter a sequência comercial sem depender da memória.",
      icon: BellRing,
      iconClass: "text-[#2F8F57]",
    },
    {
      title: "Decisões baseadas em dados",
      description: "Indicadores de conversão, produtividade, campanhas, cursos e oportunidades paradas.",
      icon: Gauge,
      iconClass: "text-[#6B55C7]",
    },
  ];

  const leadWhatsAppFeatures: FeatureItem[] = [
    {
      title: "Conversas vinculadas ao lead",
      description: "Cada interação comercial permanece dentro do contexto da oportunidade.",
      icon: MessagesSquare,
      iconClass: "text-[#2F8F57]",
    },
    {
      title: "Mais velocidade no retorno",
      description: "A equipe responde com histórico, modelos e informações organizadas.",
      icon: Clock3,
      iconClass: "text-[#EA6D0B]",
    },
    {
      title: "Continuidade no atendimento",
      description: "A negociação não depende de um único aparelho ou colaborador.",
      icon: ShieldCheck,
      iconClass: "text-[#2B4091]",
    },
  ];

  const studentWhatsAppFeatures: FeatureItem[] = [
    {
      title: "Checklist pós-matrícula",
      description: "Orientações, documentos e etapas necessárias depois da venda.",
      icon: ClipboardCheck,
      iconClass: "text-[#2F8F57]",
    },
    {
      title: "Avisos aos faltantes",
      description: "Comunicação de ausências e lembretes para apoiar a permanência do aluno.",
      icon: BellRing,
      iconClass: "text-[#EA6D0B]",
    },
    {
      title: "Cobranças e acordos",
      description: "Boletos, lembretes financeiros e negociações enviados com mais agilidade.",
      icon: FileText,
      iconClass: "text-[#2B4091]",
    },
    {
      title: "Comunicação completa",
      description: "Um canal direto para necessidades administrativas e acadêmicas do aluno.",
      icon: MessageCircleMore,
      iconClass: "text-[#6B55C7]",
    },
  ];

  const responsibilities: ResponsibilityItem[] = [
    {
      label: "Tecnologia e implantação",
      title: "F10",
      description: "Prepara a plataforma e acompanha a entrada em operação.",
      icon: SlidersHorizontal,
      accentClass: "from-[#071133] to-[#16244c]",
      iconClass: "bg-white/10 text-white",
      items: [
        "Configurar usuários, permissões e workflow",
        "Apoiar a distribuição dos números de WhatsApp",
        "Treinar gestores e equipes comerciais",
        "Acompanhar o início da operação e os indicadores",
      ],
    },
    {
      label: "Diretriz e governança",
      title: "Gestão da Rede Cebrac",
      description: "Orienta o método comum e coordena a evolução da rede.",
      icon: Building2,
      accentClass: "from-[#2B4091] to-[#4762be]",
      iconClass: "bg-white/10 text-white",
      items: [
        "Conduzir a comunicação oficial",
        "Alinhar diretrizes e padrões do processo comercial",
        "Acompanhar adesão e evolução das unidades",
        "Consolidar aprendizados e necessidades da rede",
      ],
    },
    {
      label: "Adoção no dia a dia",
      title: "Unidade Cebrac",
      description: "Organiza as pessoas e aplica o método na rotina comercial.",
      icon: UserCheck,
      accentClass: "from-[#EA6D0B] to-[#ff983e]",
      iconClass: "bg-white/15 text-white",
      items: [
        "Indicar o responsável local pela implantação",
        "Informar usuários e números de WhatsApp",
        "Participar dos treinamentos previstos",
        "Registrar atendimentos e executar as próximas ações",
      ],
    },
  ];

  const successMetrics: FeatureItem[] = [
    {
      title: "Tempo do primeiro atendimento",
      description: "Quanto tempo o lead espera até receber o primeiro retorno.",
      icon: Clock3,
      iconClass: "text-[#ff9a42]",
    },
    {
      title: "Leads sem próxima atividade",
      description: "Oportunidades que precisam de uma ação definida pela equipe.",
      icon: CalendarCheck2,
      iconClass: "text-[#91a5ff]",
    },
    {
      title: "Conversão entre etapas",
      description: "Avanço do lead ao longo do funil até a matrícula.",
      icon: Funnel,
      iconClass: "text-[#5ed79b]",
    },
    {
      title: "Conversão por origem e curso",
      description: "Resultados das campanhas, canais e ofertas trabalhadas.",
      icon: Target,
      iconClass: "text-[#b7a8ff]",
    },
    {
      title: "Produtividade da equipe",
      description: "Atividades, contatos e acompanhamentos executados no período.",
      icon: TrendingUp,
      iconClass: "text-[#5ed79b]",
    },
    {
      title: "Oportunidades paradas",
      description: "Leads que não avançaram e precisam de atenção gerencial.",
      icon: Gauge,
      iconClass: "text-[#ff9a42]",
    },
  ];

  const implementationSteps: ImplementationStep[] = [
    {
      number: "01",
      title: "Comunicação oficial",
      description: "Apresentação dos recursos, objetivos, responsabilidades e cronograma para a Rede Cebrac.",
      owner: "Rede Cebrac",
    },
    {
      number: "02",
      title: "Preparação das unidades",
      description: "Indicação dos responsáveis, usuários e números que participarão da operação.",
      owner: "Unidades",
    },
    {
      number: "03",
      title: "Configuração inicial",
      description: "Estruturação de acessos, workflow comercial e distribuição dos números de WhatsApp.",
      owner: "F10 + unidades",
    },
    {
      number: "04",
      title: "Treinamento das equipes",
      description: "Capacitação prática para vendedores, gestores e responsáveis pela operação.",
      owner: "F10",
    },
    {
      number: "05",
      title: "Início assistido",
      description: "Entrada em operação com acompanhamento dos indicadores e ajustes contínuos.",
      owner: "F10 + Rede Cebrac",
    },
  ];

  const nextSteps = [
    "Indicar o responsável pela implantação na unidade",
    "Mapear os usuários que utilizarão o CRM",
    "Definir os cinco números de WhatsApp da operação",
    "Aguardar o cronograma oficial de configuração e treinamento",
  ];
</script>

<svelte:head>
  <title>Rede Cebrac | CRM de Leads e WhatsApp integrado ao F10</title>
  <meta
    name="description"
    content="Apresentação institucional para as unidades Cebrac sobre CRM de Leads, workflow comercial, WhatsApp integrado e implantação do novo modelo operacional."
  />
  <meta name="robots" content="noindex,nofollow,noarchive,nosnippet" />
  <link rel="preload" as="image" href="/background-hero-cebrac.png" />
  <link rel="preload" as="image" href="/hero-cebrac.webp" type="image/webp" />
  <link rel="preload" as="image" href="/Logo-Cebrac.png" />
</svelte:head>

<div class="presentation-page overflow-hidden bg-white text-[#071133]">
  <section id="inicio" class="relative isolate overflow-hidden bg-white/40">
    <img
      src="/background-hero-cebrac.png"
      alt=""
      aria-hidden="true"
      class="pointer-events-none absolute inset-0 -z-20 h-full w-full object-cover object-center"
      fetchpriority="high"
    />
    <div class="pointer-events-none absolute -left-28 top-24 -z-10 h-72 w-72 rounded-full bg-[#EA6D0B]/[0.07] blur-3xl"></div>
    <div class="pointer-events-none absolute -right-28 bottom-16 -z-10 h-96 w-96 rounded-full bg-[#2B4091]/[0.08] blur-3xl"></div>

    <div class="hero-grid mx-auto grid w-full max-w-[1660px] items-center px-5 py-12 sm:px-8 sm:py-16 lg:min-h-[100svh] lg:px-10 lg:py-10 xl:px-14">
      <div class="hero-copy relative z-20 max-w-[720px] lg:py-10">
        <div class="inline-flex max-w-full items-stretch overflow-hidden rounded-[18px] border border-[#2B4091]/10 bg-white/[0.92] shadow-[0_14px_36px_rgba(43,64,145,0.12)] backdrop-blur-md">
          <div class="flex min-w-[145px] items-center justify-center bg-[#2B4091] px-5 py-3 sm:min-w-[174px] sm:px-7">
            <img src="/Logo-Cebrac.png" alt="Cebrac" class="h-9 w-auto object-contain sm:h-10" />
          </div>
          <div class="flex items-center px-4 py-3 text-[10px] font-extrabold uppercase leading-5 tracking-[0.13em] text-[#2B4091] sm:px-6 sm:text-xs">
            Projeto de evolução comercial
          </div>
        </div>

        <p class="mt-8 text-xs font-extrabold uppercase tracking-[0.2em] text-[#EA6D0B]">
          Novos recursos para as unidades Cebrac
        </p>

        <h1 class="mt-5 text-[42px] font-semibold leading-[1.06] tracking-[-0.05em] text-[#010D28] sm:text-[56px] lg:text-[59px] xl:text-[66px]">
          <span class="text-[#EA6D0B]">CRM</span>
          <span> e </span>
          <span class="text-[#2F8F57]">WhatsApp</span>
          <br />
          integrados para a Rede Cebrac.
        </h1>

        <p class="mt-7 max-w-[660px] text-lg font-medium leading-8 text-[#24345F]/85 sm:text-[21px] sm:leading-9">
          Um método comercial estruturado para organizar os leads, preservar o histórico dos atendimentos e transformar mais oportunidades em matrículas.
        </p>

        <div class="mt-9 grid gap-3 sm:grid-cols-3">
          {#each heroHighlights as item}
            <article class="rounded-[22px] border border-[#E5EBF2] bg-white/[0.88] p-4 shadow-[0_12px_30px_rgba(1,13,40,0.05)] backdrop-blur-md transition duration-300 hover:-translate-y-0.5 hover:shadow-[0_16px_34px_rgba(1,13,40,0.08)]">
              <div class="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#F7F9FC]">
                <svelte:component this={item.icon} size={21} strokeWidth={2} class={item.iconClass} />
              </div>
              <h2 class="mt-3 text-sm font-extrabold text-[#071133]">{item.title}</h2>
              <p class="mt-1.5 text-xs leading-5 text-[#314372]/65">{item.description}</p>
            </article>
          {/each}
        </div>
      </div>

      <div class="hero-visual relative z-10 hidden items-center justify-end lg:flex">
        <img
          src="/hero-cebrac.webp"
          alt="CRM F10 para a Rede Cebrac exibido em computador e atendimento integrado pelo WhatsApp"
          class="h-auto object-contain drop-shadow-[0_34px_48px_rgba(14,37,83,0.18)]"
          fetchpriority="high"
        />
      </div>
    </div>
  </section>

  <nav class="presentation-nav sticky top-3 z-40" aria-label="Navegação da apresentação">
    <div class="mx-auto max-w-[1320px] px-4 sm:px-8 lg:px-12">
      <div class="flex items-center gap-4 rounded-full border border-white/80 bg-white/[0.92] px-3 shadow-[0_12px_34px_rgba(1,13,40,0.10)] backdrop-blur-xl">
        <img src="/Logo-Cebrac.png" alt="" aria-hidden="true" class="hidden h-8 w-auto shrink-0 rounded-full bg-[#2B4091] px-2.5 py-1.5 lg:block" />
        <div class="presentation-nav-links flex min-w-0 flex-1 gap-1 overflow-x-auto py-2.5">
          <a href="#visao-geral" class="presentation-nav-link">Visão geral</a>
          <a href="#contexto" class="presentation-nav-link">Contexto</a>
          <a href="#crm" class="presentation-nav-link">CRM</a>
          <a href="#whatsapp" class="presentation-nav-link">WhatsApp</a>
          <a href="#responsabilidades" class="presentation-nav-link">Responsabilidades</a>
          <a href="#indicadores" class="presentation-nav-link">Indicadores</a>
          <a href="#implantacao" class="presentation-nav-link">Implantação</a>
          <a href="#proximos-passos" class="presentation-nav-link">Próximos passos</a>
        </div>
      </div>
    </div>
  </nav>

  <section id="visao-geral" class="scroll-mt-24 bg-stone-100 px-5 pb-16 pt-20 sm:px-8 lg:px-12 lg:pb-20 lg:pt-24">
    <div class="mx-auto max-w-[1320px] overflow-hidden rounded-[30px] bg-[#010D28] shadow-[0_24px_60px_rgba(1,13,40,0.16)]">
      <div class="grid lg:grid-cols-[0.72fr_1.28fr]">
        <div class="border-b border-white/10 px-7 py-10 sm:px-10 lg:border-b-0 lg:border-r lg:px-12 lg:py-14">
          <p class="text-xs font-semibold uppercase tracking-[0.22em] text-[#ff9a42]">Visão geral</p>
          <h2 class="mt-4 text-[34px] font-semibold leading-[1.08] tracking-[-0.035em] text-white sm:text-[42px]">
            Uma mudança de processo apoiada por tecnologia.
          </h2>
          <p class="mt-5 max-w-[520px] text-base leading-8 text-white/65">
            O objetivo não é apenas adicionar ferramentas. É estabelecer uma rotina comercial comum, mensurável e capaz de continuar mesmo quando a equipe muda.
          </p>
        </div>

        <ol class="grid gap-3 p-4 sm:p-6 lg:p-8">
          {#each overviewItems as item}
            <li class="grid gap-4 rounded-[22px] border border-white/10 bg-white/[0.055] px-5 py-5 sm:grid-cols-[52px_0.8fr_1.2fr] sm:items-center sm:gap-6 sm:px-6">
              <span class="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-xs font-extrabold text-[#ffb06a]">{item.number}</span>
              <strong class="text-base font-semibold leading-6 text-white">{item.title}</strong>
              <span class="text-sm leading-6 text-white/55">{item.description}</span>
            </li>
          {/each}
        </ol>
      </div>
    </div>
  </section>

  <section id="contexto" class="relative scroll-mt-24 overflow-hidden bg-stone-100 px-5 py-16 sm:px-8 lg:px-12 lg:py-24">
    <div class="pointer-events-none absolute -left-32 top-20 h-80 w-80 rounded-full bg-[#EA6D0B]/[0.06] blur-3xl"></div>
    <div class="pointer-events-none absolute -right-32 bottom-12 h-96 w-96 rounded-full bg-[#2B4091]/[0.06] blur-3xl"></div>

    <div class="relative mx-auto max-w-[1320px]">
      <div class="grid gap-8 lg:grid-cols-[0.72fr_1.28fr] lg:items-end lg:gap-16">
        <div>
          <p class="section-label">01 · Por que essa evolução</p>
          <h2 class="section-title mt-5">Dois desafios que afetam diretamente as matrículas.</h2>
        </div>
        <p class="max-w-[760px] text-lg leading-8 text-[#24345F]/75 lg:pb-1">
          O projeto foi desenhado para reduzir desperdícios no tratamento dos leads e evitar que o conhecimento comercial se perca quando existem mudanças na equipe.
        </p>
      </div>

      <div class="mt-12 grid gap-6 lg:grid-cols-2">
        {#each challenges as challenge}
          <article class="group relative overflow-hidden rounded-[28px] border border-[#E5EBF2] bg-white p-7 shadow-[0_14px_38px_rgba(1,13,40,0.06)] transition duration-300 hover:-translate-y-1 hover:shadow-[0_20px_48px_rgba(1,13,40,0.10)] sm:p-9">
            <div class="absolute -right-8 -top-10 h-36 w-36 rounded-full bg-[#2B4091]/[0.045] blur-2xl"></div>
            <div class="relative flex items-start justify-between gap-6">
              <div class="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#EEF2FF] text-[#2B4091]">
                <svelte:component this={challenge.icon} size={24} strokeWidth={1.9} />
              </div>
              <span class="rounded-full bg-[#F8FAFC] px-3 py-1 text-xs font-extrabold tracking-[0.12em] text-slate-400 ring-1 ring-[#E8EDF3]">{challenge.number}</span>
            </div>
            <h3 class="relative mt-6 max-w-[520px] text-2xl font-semibold leading-tight tracking-[-0.03em] text-[#071133] sm:text-3xl">
              {challenge.title}
            </h3>
            <p class="relative mt-4 max-w-[600px] text-base leading-7 text-[#314372]/75">{challenge.description}</p>
            <div class="relative mt-6 grid gap-3 sm:grid-cols-3 lg:grid-cols-1 xl:grid-cols-3">
              {#each challenge.points as point}
                <div class="flex items-start gap-2.5 rounded-2xl bg-[#F8FAFC] px-3.5 py-3 text-sm font-semibold leading-5 text-[#314372]/80">
                  <CheckCircle2 size={17} class="mt-0.5 shrink-0 text-[#2F8F57]" />
                  <span>{point}</span>
                </div>
              {/each}
            </div>
          </article>
        {/each}
      </div>
    </div>
  </section>

  <section id="crm" class="relative scroll-mt-24 overflow-hidden bg-white px-5 py-16 sm:px-8 lg:px-12 lg:py-24">
    <div class="pointer-events-none absolute left-[-120px] top-[80px] h-[320px] w-[320px] rounded-full bg-[#EA6D0B]/[0.05] blur-3xl"></div>
    <div class="pointer-events-none absolute right-[-120px] bottom-[40px] h-[360px] w-[360px] rounded-full bg-[#010D28]/[0.045] blur-3xl"></div>

    <div class="relative mx-auto max-w-[1320px]">
      <div class="grid items-center gap-14 lg:grid-cols-[0.88fr_1.12fr] lg:gap-20">
        <div>
          <p class="section-label">02 · CRM de Leads</p>
          <h2 class="section-title mt-5">Cada oportunidade em uma etapa, com responsável e próximo passo.</h2>
          <p class="mt-6 text-lg leading-8 text-[#24345F]/75">
            O CRM F10 organiza a jornada comercial da unidade Cebrac desde a entrada do lead até a matrícula, com workflow, atividades e indicadores em um único ambiente.
          </p>

          <div class="mt-8 grid gap-3 sm:grid-cols-2">
            {#each crmFeatures as feature}
              <article class="group rounded-[22px] border border-[#E5EBF2] bg-white px-5 py-5 shadow-[0_10px_26px_rgba(1,13,40,0.035)] transition duration-300 hover:border-[#D3DCE8] hover:shadow-[0_14px_30px_rgba(1,13,40,0.06)]">
                <div class="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#F7F9FC]">
                  <svelte:component this={feature.icon} size={22} strokeWidth={1.9} class={feature.iconClass} />
                </div>
                <h3 class="mt-4 text-base font-semibold text-[#071133]">{feature.title}</h3>
                <p class="mt-2 text-sm leading-6 text-[#314372]/65">{feature.description}</p>
              </article>
            {/each}
          </div>
        </div>

        <div class="relative">
          <div class="absolute inset-0 rounded-[38px] bg-gradient-to-br from-[#EA6D0B]/10 via-transparent to-[#2B4091]/10 blur-2xl"></div>
          <div class="media-frame relative aspect-[16/11]">
            <div class="media-toolbar">
              <span></span><span></span><span></span>
              <small>Captura da visão Kanban</small>
            </div>
            <div class="media-canvas">
              <Funnel size={40} strokeWidth={1.4} class="text-slate-500" />
              <strong>Imagem do CRM</strong>
              <p>Inserir a tela real com etapas, leads, responsáveis e atividades.</p>
            </div>
          </div>
        </div>
      </div>

      <div class="mt-14 overflow-hidden rounded-[28px] bg-[#010D28] text-white shadow-[0_20px_50px_rgba(1,13,40,0.15)]">
        <div class="grid lg:grid-cols-[0.72fr_1.28fr]">
          <div class="border-b border-white/10 px-7 py-8 lg:border-b-0 lg:border-r lg:px-9">
            <p class="text-xs font-semibold uppercase tracking-[0.2em] text-[#ff9a42]">Cadência comercial</p>
            <h3 class="mt-3 text-2xl font-semibold leading-tight">O CRM organiza o ritmo do atendimento.</h3>
          </div>
          <ol class="grid gap-3 p-5 sm:grid-cols-3 sm:p-7">
            <li class="rounded-[20px] border border-white/10 bg-white/[0.055] p-5">
              <span class="flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-sm font-extrabold text-[#ffb06a]">1</span>
              <strong class="mt-4 block text-sm font-extrabold">Priorizar</strong>
              <p class="mt-1 text-sm leading-6 text-white/55">Identificar quem precisa de retorno primeiro.</p>
            </li>
            <li class="rounded-[20px] border border-white/10 bg-white/[0.055] p-5">
              <span class="flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-sm font-extrabold text-[#91a5ff]">2</span>
              <strong class="mt-4 block text-sm font-extrabold">Executar</strong>
              <p class="mt-1 text-sm leading-6 text-white/55">Realizar contatos, tarefas e follow-ups previstos.</p>
            </li>
            <li class="rounded-[20px] border border-white/10 bg-white/[0.055] p-5">
              <span class="flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-sm font-extrabold text-[#5ed79b]">3</span>
              <strong class="mt-4 block text-sm font-extrabold">Acompanhar</strong>
              <p class="mt-1 text-sm leading-6 text-white/55">Verificar avanço, gargalos e oportunidades paradas.</p>
            </li>
          </ol>
        </div>
      </div>
    </div>
  </section>

  <section id="whatsapp" class="relative scroll-mt-24 overflow-hidden bg-stone-100 px-5 py-16 sm:px-8 lg:px-12 lg:py-24">
    <div class="pointer-events-none absolute -left-32 top-24 h-80 w-80 rounded-full bg-[#2F8F57]/[0.06] blur-3xl"></div>
    <div class="pointer-events-none absolute -right-24 bottom-20 h-80 w-80 rounded-full bg-[#2B4091]/[0.055] blur-3xl"></div>

    <div class="relative mx-auto max-w-[1320px]">
      <div class="grid gap-8 lg:grid-cols-[0.72fr_1.28fr] lg:items-end lg:gap-16">
        <div>
          <p class="section-label text-[#2F8F57]">03 · WhatsApp integrado</p>
          <h2 class="section-title mt-5">Um canal integrado a duas etapas da jornada.</h2>
        </div>
        <div>
          <p class="text-lg leading-8 text-[#24345F]/75">
            Os cinco números incluídos por unidade podem ser distribuídos entre o CRM e o F10, conforme a necessidade da operação Cebrac.
          </p>
          <div class="mt-5 inline-flex max-w-[650px] items-start gap-3 rounded-[18px] border border-[#2B4091]/10 bg-white px-5 py-4 shadow-[0_10px_26px_rgba(43,64,145,0.07)]">
            <div class="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[#EEF2FF]">
              <CalendarCheck2 size={19} class="text-[#2B4091]" />
            </div>
            <div>
              <strong class="text-sm font-extrabold text-[#2B4091]">Marco de disponibilidade</strong>
              <p class="mt-1 text-sm leading-6 text-[#314372]/75">WhatsApp no F10 disponível a partir de agosto de 2026.</p>
            </div>
          </div>
        </div>
      </div>

      <div class="mt-12 grid gap-6 lg:grid-cols-2">
        <article class="overflow-hidden rounded-[28px] border border-emerald-100 bg-white shadow-[0_16px_44px_rgba(14,70,45,0.07)]">
          <div class="flex items-center justify-between gap-5 bg-gradient-to-r from-[#EEF8F2] to-white px-7 py-6 sm:px-8">
            <div>
              <span class="text-xs font-extrabold uppercase tracking-[0.15em] text-[#2F8F57]">No CRM de Leads</span>
              <h3 class="mt-2 text-2xl font-semibold text-[#071133]">Atendimento comercial</h3>
            </div>
            <div class="flex h-12 w-12 items-center justify-center rounded-2xl bg-white shadow-sm">
              <MessageCircleMore size={27} class="text-[#2F8F57]" />
            </div>
          </div>
          <div class="space-y-3 p-5 sm:p-6">
            {#each leadWhatsAppFeatures as feature}
              <div class="flex gap-4 rounded-[20px] border border-[#EAF0ED] bg-white px-4 py-4">
                <div class="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[#F7F9FC]">
                  <svelte:component this={feature.icon} size={20} strokeWidth={1.9} class={feature.iconClass} />
                </div>
                <div>
                  <strong class="text-sm font-extrabold text-[#071133]">{feature.title}</strong>
                  <p class="mt-1 text-sm leading-6 text-[#314372]/65">{feature.description}</p>
                </div>
              </div>
            {/each}
          </div>
        </article>

        <article class="overflow-hidden rounded-[28px] border border-[#2B4091]/10 bg-white shadow-[0_16px_44px_rgba(43,64,145,0.07)]">
          <div class="flex items-center justify-between gap-5 bg-gradient-to-r from-[#EEF2FF] to-white px-7 py-6 sm:px-8">
            <div>
              <span class="text-xs font-extrabold uppercase tracking-[0.15em] text-[#2B4091]">No F10</span>
              <h3 class="mt-2 text-2xl font-semibold text-[#071133]">Relacionamento com alunos</h3>
            </div>
            <div class="flex h-12 w-12 items-center justify-center rounded-2xl bg-white shadow-sm">
              <MessagesSquare size={27} class="text-[#2B4091]" />
            </div>
          </div>
          <div class="grid gap-3 p-5 sm:grid-cols-2 sm:p-6">
            {#each studentWhatsAppFeatures as feature}
              <div class="rounded-[20px] border border-[#E8EDF5] bg-white px-4 py-4">
                <div class="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#F7F9FC]">
                  <svelte:component this={feature.icon} size={20} strokeWidth={1.9} class={feature.iconClass} />
                </div>
                <strong class="mt-4 block text-sm font-extrabold text-[#071133]">{feature.title}</strong>
                <p class="mt-1 text-sm leading-6 text-[#314372]/65">{feature.description}</p>
              </div>
            {/each}
          </div>
        </article>
      </div>

      <div class="relative mt-8">
        <div class="absolute inset-0 rounded-[34px] bg-gradient-to-r from-[#2F8F57]/10 via-transparent to-[#2B4091]/10 blur-xl"></div>
        <div class="media-frame relative min-h-[230px]">
          <div class="media-toolbar">
            <span></span><span></span><span></span>
            <small>Captura do WhatsApp integrado</small>
          </div>
          <div class="media-canvas py-10">
            <MessageCircleMore size={38} strokeWidth={1.4} class="text-slate-500" />
            <strong>Imagem das duas frentes de atendimento</strong>
            <p>Inserir a conversa vinculada ao lead e a comunicação com o aluno no F10.</p>
          </div>
        </div>
      </div>
    </div>
  </section>

  <section id="responsabilidades" class="relative scroll-mt-24 overflow-hidden bg-white px-5 py-16 sm:px-8 lg:px-12 lg:py-24">
    <div class="pointer-events-none absolute left-[-120px] top-24 h-72 w-72 rounded-full bg-[#EA6D0B]/[0.045] blur-3xl"></div>

    <div class="relative mx-auto max-w-[1320px]">
      <div class="grid gap-8 lg:grid-cols-[0.72fr_1.28fr] lg:items-end lg:gap-16">
        <div>
          <p class="section-label">04 · Quem faz o quê</p>
          <h2 class="section-title mt-5">Responsabilidades claras aceleram a adoção.</h2>
        </div>
        <p class="max-w-[760px] text-lg leading-8 text-[#24345F]/75 lg:pb-1">
          A implantação é um trabalho conjunto. Cada parte assume um papel específico para que a tecnologia entre em operação com método, suporte e participação das equipes.
        </p>
      </div>

      <div class="mt-12 grid gap-6 lg:grid-cols-3">
        {#each responsibilities as responsibility}
          <article class="overflow-hidden rounded-[28px] border border-[#E5EBF2] bg-white shadow-[0_14px_38px_rgba(1,13,40,0.055)] transition duration-300 hover:-translate-y-1 hover:shadow-[0_20px_48px_rgba(1,13,40,0.09)]">
            <div class={`bg-gradient-to-br px-7 py-7 text-white ${responsibility.accentClass}`}>
              <div class="flex items-start justify-between gap-5">
                <div>
                  <span class="text-xs font-semibold uppercase tracking-[0.15em] text-white/65">{responsibility.label}</span>
                  <h3 class="mt-2 text-2xl font-semibold">{responsibility.title}</h3>
                </div>
                <div class={`flex h-12 w-12 items-center justify-center rounded-2xl ${responsibility.iconClass}`}>
                  <svelte:component this={responsibility.icon} size={24} strokeWidth={1.8} />
                </div>
              </div>
              <p class="mt-4 text-sm leading-6 text-white/70">{responsibility.description}</p>
            </div>
            <div class="space-y-4 px-7 py-7">
              {#each responsibility.items as item}
                <div class="flex gap-3 text-sm leading-6 text-[#314372]/75">
                  <CheckCircle2 size={18} class="mt-0.5 shrink-0 text-[#2F8F57]" />
                  <span>{item}</span>
                </div>
              {/each}
            </div>
          </article>
        {/each}
      </div>
    </div>
  </section>

  <section id="indicadores" class="relative scroll-mt-24 overflow-hidden bg-[#010D28] px-5 py-16 text-white sm:px-8 lg:px-12 lg:py-24">
    <div class="pointer-events-none absolute -left-48 top-0 h-96 w-96 rounded-full bg-[#2B4091]/25 blur-3xl"></div>
    <div class="pointer-events-none absolute -right-48 bottom-0 h-96 w-96 rounded-full bg-[#EA6D0B]/10 blur-3xl"></div>

    <div class="relative mx-auto max-w-[1320px]">
      <div class="grid gap-8 lg:grid-cols-[0.72fr_1.28fr] lg:items-end lg:gap-16">
        <div>
          <p class="text-xs font-semibold uppercase tracking-[0.2em] text-[#ff9a42]">05 · Como medir a evolução</p>
          <h2 class="mt-5 text-4xl font-semibold leading-[1.08] tracking-[-0.04em] sm:text-5xl lg:text-[58px]">
            A implantação só gera valor quando a rotina melhora.
          </h2>
        </div>
        <p class="max-w-[760px] text-lg leading-8 text-white/60 lg:pb-1">
          O acompanhamento não termina no treinamento. Os indicadores mostram onde a equipe evoluiu, onde existem gargalos e quais ações precisam ser ajustadas.
        </p>
      </div>

      <div class="mt-12 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {#each successMetrics as metric}
          <article class="rounded-[22px] border border-white/10 bg-white/[0.055] px-6 py-7 backdrop-blur-sm transition duration-300 hover:bg-white/[0.08]">
            <div class="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/[0.07]">
              <svelte:component this={metric.icon} size={23} strokeWidth={1.9} class={metric.iconClass} />
            </div>
            <h3 class="mt-5 text-lg font-semibold">{metric.title}</h3>
            <p class="mt-2 text-sm leading-6 text-white/55">{metric.description}</p>
          </article>
        {/each}
      </div>
    </div>
  </section>

  <section id="implantacao" class="relative scroll-mt-24 overflow-hidden bg-white px-5 py-16 sm:px-8 lg:px-12 lg:py-24">
    <div class="pointer-events-none absolute right-[-120px] top-24 h-80 w-80 rounded-full bg-[#2B4091]/[0.05] blur-3xl"></div>

    <div class="relative mx-auto max-w-[1320px]">
      <div class="grid gap-14 lg:grid-cols-[0.72fr_1.28fr] lg:gap-20">
        <div>
          <p class="section-label">06 · Como será a implantação</p>
          <h2 class="section-title mt-5">Uma adoção progressiva e acompanhada.</h2>
          <p class="mt-6 text-lg leading-8 text-[#24345F]/75">
            Cada unidade será conduzida desde a preparação inicial até o início da operação, com treinamento e acompanhamento dos primeiros resultados.
          </p>

          <div class="media-frame mt-8 aspect-[16/10]">
            <div class="media-toolbar">
              <span></span><span></span><span></span>
              <small>Cronograma oficial</small>
            </div>
            <div class="media-canvas">
              <CalendarCheck2 size={36} strokeWidth={1.4} class="text-slate-500" />
              <strong>Datas e turmas de treinamento</strong>
              <p>O cronograma e o canal oficial serão comunicados pela gestão da Rede Cebrac.</p>
            </div>
          </div>
        </div>

        <ol class="space-y-4">
          {#each implementationSteps as step}
            <li class="group relative rounded-[22px] border border-[#E5EBF2] bg-[#F8FAFC] p-5 shadow-[0_8px_24px_rgba(1,13,40,0.035)] transition duration-300 hover:border-[#D3DCE8] hover:bg-white hover:shadow-[0_14px_30px_rgba(1,13,40,0.06)] sm:grid sm:grid-cols-[56px_1fr] sm:gap-5 sm:p-6">
              <div class="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#2B4091] text-sm font-extrabold text-white shadow-[0_10px_22px_rgba(43,64,145,0.22)]">
                {step.number}
              </div>
              <div class="mt-4 sm:mt-0">
                <div class="flex flex-wrap items-center justify-between gap-3">
                  <h3 class="text-xl font-semibold tracking-[-0.02em] text-[#071133]">{step.title}</h3>
                  <span class="rounded-full bg-white px-3 py-1 text-[11px] font-extrabold uppercase tracking-[0.12em] text-[#52617c] ring-1 ring-[#E1E7EF]">
                    {step.owner}
                  </span>
                </div>
                <p class="mt-2 text-sm leading-6 text-[#314372]/70">{step.description}</p>
              </div>
            </li>
          {/each}
        </ol>
      </div>
    </div>
  </section>

  <section id="proximos-passos" class="relative scroll-mt-24 overflow-hidden bg-stone-100 px-5 py-16 sm:px-8 lg:px-12 lg:py-24">
    <div class="pointer-events-none absolute -left-32 bottom-12 h-80 w-80 rounded-full bg-[#EA6D0B]/[0.055] blur-3xl"></div>

    <div class="relative mx-auto max-w-[1180px] overflow-hidden rounded-[34px] border border-[#2B4091]/10 bg-white shadow-[0_24px_70px_rgba(43,64,145,0.12)]">
      <div class="grid lg:grid-cols-[0.78fr_1.22fr]">
        <div class="relative overflow-hidden bg-gradient-to-br from-[#2B4091] to-[#1d2f73] px-8 py-10 text-white sm:px-10 lg:px-12 lg:py-14">
          <div class="pointer-events-none absolute -right-14 -top-14 h-44 w-44 rounded-full bg-white/10 blur-2xl"></div>
          <img src="/Logo-Cebrac.png" alt="Cebrac" class="relative h-14 w-auto object-contain" />
          <p class="relative mt-8 text-xs font-semibold uppercase tracking-[0.18em] text-white/55">Próxima etapa</p>
          <h2 class="relative mt-4 text-3xl font-semibold leading-tight tracking-[-0.035em] sm:text-4xl">
            O que cada unidade precisa organizar agora.
          </h2>
          <p class="relative mt-5 text-sm leading-7 text-white/70">
            Essas definições permitem iniciar a configuração assim que o cronograma oficial for comunicado.
          </p>
        </div>

        <div class="px-8 py-10 sm:px-10 lg:px-12 lg:py-14">
          <ol class="space-y-4">
            {#each nextSteps as step, index}
              <li class="grid grid-cols-[46px_1fr] items-start gap-4 rounded-[18px] border border-[#E8EDF3] bg-[#F8FAFC] px-4 py-4">
                <span class="flex h-10 w-10 items-center justify-center rounded-full bg-[#EEF2FF] text-sm font-extrabold text-[#2B4091]">
                  {index + 1}
                </span>
                <span class="pt-2 text-base font-semibold leading-6 text-[#071133]">{step}</span>
              </li>
            {/each}
          </ol>

          <div class="mt-7 flex items-start gap-3 rounded-[18px] bg-[#FFF7F1] px-5 py-4 text-sm leading-6 text-[#8f531f] ring-1 ring-[#F4E2D2]">
            <CalendarCheck2 size={19} class="mt-0.5 shrink-0 text-[#EA6D0B]" />
            <p>Datas, turmas e orientações serão centralizadas no canal oficial definido pela gestão da Rede Cebrac.</p>
          </div>
        </div>
      </div>
    </div>
  </section>

  <footer class="bg-[#010D28] px-5 py-14 text-white sm:px-8 lg:px-12 lg:py-16">
    <div class="mx-auto grid max-w-[1180px] gap-10 md:grid-cols-[auto_1fr_auto] md:items-center">
      <div class="flex items-center gap-6">
        <img src="/Logo-Cebrac.png" alt="Cebrac" class="h-12 w-auto object-contain" />
        <div class="h-9 w-px bg-white/20"></div>
        <img src="/logo_f10.svg" alt="F10 Software" class="h-10 w-auto brightness-0 invert" />
      </div>
      <div class="max-w-[680px]">
        <p class="text-xs font-semibold uppercase tracking-[0.18em] text-[#ff9a42]">Cebrac + F10</p>
        <p class="mt-3 text-xl font-semibold leading-8 text-white/80">
          Método comercial, tecnologia integrada e uma operação preparada para crescer com continuidade e controle.
        </p>
      </div>
      <a href="#inicio" class="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/[0.055] px-5 py-3 text-sm font-extrabold text-white/75 transition hover:bg-white/[0.09] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70">
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

  .section-label {
    color: #ea6d0b;
    font-size: 0.75rem;
    font-weight: 700;
    letter-spacing: 0.2em;
    text-transform: uppercase;
  }

  .section-title {
    color: #010d28;
    font-size: clamp(2.2rem, 4vw, 3.55rem);
    font-weight: 600;
    letter-spacing: -0.04em;
    line-height: 1.08;
  }

  .presentation-nav-links {
    scrollbar-width: none;
    scroll-snap-type: x proximity;
  }

  .presentation-nav-links::-webkit-scrollbar {
    display: none;
  }

  .presentation-nav-link {
    flex: 0 0 auto;
    scroll-snap-align: start;
    border-radius: 9999px;
    padding: 0.6rem 0.95rem;
    color: #52617c;
    font-size: 0.75rem;
    font-weight: 700;
    letter-spacing: 0.025em;
    transition: background-color 160ms ease, color 160ms ease;
  }

  .presentation-nav-link:hover,
  .presentation-nav-link:focus-visible {
    background: #eef2ff;
    color: #2b4091;
    outline: none;
  }

  .presentation-nav-link:focus-visible {
    box-shadow: 0 0 0 2px #2b4091;
  }

  .media-frame {
    overflow: hidden;
    border: 1px solid #d5dbe4;
    border-radius: 32px;
    background: #e7eaef;
    box-shadow: 0 20px 50px rgba(1, 13, 40, 0.1);
  }

  .media-toolbar {
    display: flex;
    min-height: 44px;
    align-items: center;
    gap: 7px;
    border-bottom: 1px solid #d5dbe4;
    background: #f4f6f8;
    padding: 0 18px;
  }

  .media-toolbar > span {
    width: 9px;
    height: 9px;
    border-radius: 9999px;
    background: #b5bcc6;
  }

  .media-toolbar small {
    margin-left: 8px;
    color: #7a8492;
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
    text-align: center;
    background-image: linear-gradient(135deg, rgba(255, 255, 255, 0.28) 25%, transparent 25%),
      linear-gradient(225deg, rgba(255, 255, 255, 0.28) 25%, transparent 25%),
      linear-gradient(45deg, rgba(255, 255, 255, 0.28) 25%, transparent 25%),
      linear-gradient(315deg, rgba(255, 255, 255, 0.28) 25%, #dde1e7 25%);
    background-position: 18px 0, 18px 0, 0 0, 0 0;
    background-repeat: repeat;
    background-size: 36px 36px;
  }

  .media-canvas strong {
    margin-top: 16px;
    color: #536071;
    font-size: 0.8rem;
    font-weight: 800;
    letter-spacing: 0.13em;
    text-transform: uppercase;
  }

  .media-canvas p {
    margin-top: 8px;
    max-width: 380px;
    color: #7a8492;
    font-size: 0.82rem;
    line-height: 1.5rem;
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
