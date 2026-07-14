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
      iconClass: "text-[#ff7900]",
    },
    {
      title: "WhatsApp integrado",
      description: "Atendimento de leads no CRM e de alunos no F10.",
      icon: MessageCircleMore,
      iconClass: "text-[#159552]",
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
      iconClass: "text-[#ff7900]",
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
      iconClass: "text-[#159552]",
    },
    {
      title: "Decisões baseadas em dados",
      description: "Indicadores de conversão, produtividade, campanhas, cursos e oportunidades paradas.",
      icon: Gauge,
      iconClass: "text-[#6b55c7]",
    },
  ];

  const leadWhatsAppFeatures: FeatureItem[] = [
    {
      title: "Conversas vinculadas ao lead",
      description: "Cada interação comercial permanece dentro do contexto da oportunidade.",
      icon: MessagesSquare,
      iconClass: "text-[#159552]",
    },
    {
      title: "Mais velocidade no retorno",
      description: "A equipe responde com histórico, modelos e informações organizadas.",
      icon: Clock3,
      iconClass: "text-[#ff7900]",
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
      iconClass: "text-[#159552]",
    },
    {
      title: "Avisos aos faltantes",
      description: "Comunicação de ausências e lembretes para apoiar a permanência do aluno.",
      icon: BellRing,
      iconClass: "text-[#ff7900]",
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
      iconClass: "text-[#6b55c7]",
    },
  ];

  const responsibilities: ResponsibilityItem[] = [
    {
      label: "Tecnologia e implantação",
      title: "F10",
      description: "Prepara a plataforma e acompanha a entrada em operação.",
      icon: SlidersHorizontal,
      accentClass: "border-t-[#06173e]",
      iconClass: "bg-[#eef1f6] text-[#06173e]",
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
      accentClass: "border-t-[#2B4091]",
      iconClass: "bg-[#eef1fb] text-[#2B4091]",
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
      accentClass: "border-t-[#ff7900]",
      iconClass: "bg-orange-50 text-[#ff7900]",
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

<div class="presentation-page overflow-hidden bg-white text-[#06173e]">
  <section id="inicio" class="relative isolate overflow-hidden bg-white">
    <img
      src="/background-hero-cebrac.png"
      alt=""
      aria-hidden="true"
      class="pointer-events-none absolute inset-0 -z-10 h-full w-full object-cover object-center"
      fetchpriority="high"
    />

    <div class="hero-grid mx-auto grid w-full max-w-[1660px] items-center px-5 py-12 sm:px-8 sm:py-16 lg:min-h-[100svh] lg:px-10 lg:py-10 xl:px-14">
      <div class="hero-copy relative z-20 max-w-[720px] lg:py-10">
        <div class="inline-flex max-w-full items-stretch overflow-hidden rounded-xl border border-[#2B4091]/10 bg-white shadow-[0_12px_32px_rgba(43,64,145,0.11)]">
          <div class="flex min-w-[145px] items-center justify-center bg-[#2B4091] px-5 py-3 sm:min-w-[174px] sm:px-7">
            <img src="/Logo-Cebrac.png" alt="Cebrac" class="h-9 w-auto object-contain sm:h-10" />
          </div>
          <div class="flex items-center px-4 py-3 text-[10px] font-extrabold uppercase leading-5 tracking-[0.13em] text-[#2B4091] sm:px-6 sm:text-xs">
            Projeto de evolução comercial
          </div>
        </div>

        <p class="mt-8 text-xs font-extrabold uppercase tracking-[0.2em] text-[#ff7900]">
          Novos recursos para as unidades Cebrac
        </p>

        <h1 class="mt-5 text-[42px] font-extrabold leading-[1.06] tracking-[-0.05em] sm:text-[56px] lg:text-[59px] xl:text-[66px]">
          <span class="text-[#ff7900]">CRM</span>
          <span> e </span>
          <span class="text-[#159552]">WhatsApp</span>
          <br />
          integrados para a Rede Cebrac.
        </h1>

        <p class="mt-7 max-w-[660px] text-lg font-medium leading-8 text-[#3d4d6b] sm:text-[21px] sm:leading-9">
          Um método comercial estruturado para organizar os leads, preservar o histórico dos atendimentos e transformar mais oportunidades em matrículas.
        </p>

        <div class="mt-9 grid border-y border-[#2B4091]/10 bg-white/[0.82] backdrop-blur-sm sm:grid-cols-3">
          {#each heroHighlights as item}
            <article class="border-t border-[#2B4091]/10 px-1 py-5 first:border-t-0 sm:border-l sm:border-t-0 sm:px-5 sm:first:border-l-0">
              <svelte:component this={item.icon} size={22} strokeWidth={2} class={item.iconClass} />
              <h2 class="mt-3 text-sm font-extrabold text-[#07173e]">{item.title}</h2>
              <p class="mt-1.5 text-xs leading-5 text-slate-500">{item.description}</p>
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

  <nav class="presentation-nav sticky top-0 z-40 border-y border-slate-200 backdrop-blur-xl" aria-label="Navegação da apresentação">
    <div class="mx-auto flex max-w-[1320px] items-center gap-4 px-4 sm:px-8 lg:px-12">
      <img src="/Logo-Cebrac.png" alt="" aria-hidden="true" class="hidden h-7 w-auto shrink-0 rounded bg-[#2B4091] px-2 py-1 lg:block" />
      <div class="presentation-nav-links flex min-w-0 flex-1 gap-1 overflow-x-auto py-3">
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
  </nav>

  <section id="visao-geral" class="scroll-mt-20 border-b border-slate-200 bg-white px-5 py-20 sm:px-8 lg:px-12 lg:py-24">
    <div class="mx-auto grid max-w-[1320px] gap-12 lg:grid-cols-[0.72fr_1.28fr] lg:items-start lg:gap-20">
      <div class="max-w-[520px]">
        <p class="section-label">Visão geral</p>
        <h2 class="section-title mt-5">Uma mudança de processo apoiada por tecnologia.</h2>
        <p class="mt-6 text-lg leading-8 text-slate-600">
          O objetivo não é apenas adicionar ferramentas. É estabelecer uma rotina comercial comum, mensurável e capaz de continuar mesmo quando a equipe muda.
        </p>
      </div>

      <ol class="border-y border-slate-200">
        {#each overviewItems as item}
          <li class="grid gap-4 border-b border-slate-200 py-6 last:border-b-0 sm:grid-cols-[56px_0.8fr_1.2fr] sm:items-start sm:gap-6">
            <span class="text-sm font-extrabold tracking-[0.1em] text-[#ff7900]">{item.number}</span>
            <strong class="text-lg font-extrabold leading-7 text-[#14275f]">{item.title}</strong>
            <span class="text-sm leading-6 text-slate-500">{item.description}</span>
          </li>
        {/each}
      </ol>
    </div>
  </section>

  <section id="contexto" class="scroll-mt-20 bg-[#f5f7fc] px-5 py-20 sm:px-8 lg:px-12 lg:py-28">
    <div class="mx-auto max-w-[1320px]">
      <div class="grid gap-8 lg:grid-cols-[0.72fr_1.28fr] lg:items-end lg:gap-16">
        <div>
          <p class="section-label">01 · Por que essa evolução</p>
          <h2 class="section-title mt-5">Dois desafios que afetam diretamente as matrículas.</h2>
        </div>
        <p class="max-w-[760px] text-lg leading-8 text-slate-600 lg:pb-1">
          O projeto foi desenhado para reduzir desperdícios no tratamento dos leads e evitar que o conhecimento comercial se perca quando existem mudanças na equipe.
        </p>
      </div>

      <div class="mt-12 grid gap-5 lg:grid-cols-2">
        {#each challenges as challenge}
          <article class="relative border-l-4 border-l-[#2B4091] bg-white px-7 py-8 shadow-[0_10px_32px_rgba(15,35,75,0.05)] sm:px-9 sm:py-10">
            <div class="flex items-start justify-between gap-6">
              <div class="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[#eef1fb] text-[#2B4091]">
                <svelte:component this={challenge.icon} size={24} strokeWidth={1.9} />
              </div>
              <span class="text-xs font-extrabold tracking-[0.15em] text-slate-400">{challenge.number}</span>
            </div>
            <h3 class="mt-6 max-w-[520px] text-2xl font-extrabold leading-tight tracking-[-0.03em] text-[#14275f] sm:text-3xl">
              {challenge.title}
            </h3>
            <p class="mt-4 max-w-[600px] text-base leading-7 text-slate-600">{challenge.description}</p>
            <div class="mt-6 grid gap-3 sm:grid-cols-3 lg:grid-cols-1 xl:grid-cols-3">
              {#each challenge.points as point}
                <div class="flex items-start gap-2.5 text-sm font-semibold leading-6 text-slate-600">
                  <CheckCircle2 size={17} class="mt-1 shrink-0 text-[#159552]" />
                  <span>{point}</span>
                </div>
              {/each}
            </div>
          </article>
        {/each}
      </div>
    </div>
  </section>

  <section id="crm" class="scroll-mt-20 bg-white px-5 py-20 sm:px-8 lg:px-12 lg:py-28">
    <div class="mx-auto max-w-[1320px]">
      <div class="grid items-center gap-14 lg:grid-cols-[0.88fr_1.12fr] lg:gap-20">
        <div>
          <p class="section-label">02 · CRM de Leads</p>
          <h2 class="section-title mt-5">Cada oportunidade em uma etapa, com responsável e próximo passo.</h2>
          <p class="mt-6 text-lg leading-8 text-slate-600">
            O CRM F10 organiza a jornada comercial da unidade Cebrac desde a entrada do lead até a matrícula, com workflow, atividades e indicadores em um único ambiente.
          </p>

          <div class="mt-8 divide-y divide-slate-200 border-y border-slate-200">
            {#each crmFeatures as feature}
              <article class="grid gap-3 py-5 sm:grid-cols-[44px_1fr] sm:gap-4">
                <div class="flex h-11 w-11 items-center justify-center rounded-xl bg-[#f5f7fc]">
                  <svelte:component this={feature.icon} size={22} strokeWidth={1.9} class={feature.iconClass} />
                </div>
                <div>
                  <h3 class="text-base font-extrabold text-[#14275f]">{feature.title}</h3>
                  <p class="mt-1 text-sm leading-6 text-slate-500">{feature.description}</p>
                </div>
              </article>
            {/each}
          </div>
        </div>

        <div class="media-frame aspect-[16/11]">
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

      <div class="mt-14 border-y border-slate-200 py-8">
        <div class="grid gap-7 lg:grid-cols-[0.72fr_1.28fr] lg:items-center lg:gap-12">
          <div>
            <p class="text-xs font-extrabold uppercase tracking-[0.18em] text-[#ff7900]">Cadência comercial</p>
            <h3 class="mt-3 text-2xl font-extrabold leading-tight text-[#14275f]">O CRM organiza o ritmo do atendimento.</h3>
          </div>
          <ol class="relative grid gap-6 sm:grid-cols-3">
            <div class="absolute left-[16%] right-[16%] top-5 hidden h-px bg-slate-200 sm:block"></div>
            <li class="relative">
              <span class="relative flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white text-sm font-extrabold text-[#2B4091]">1</span>
              <strong class="mt-4 block text-sm font-extrabold text-[#14275f]">Priorizar</strong>
              <p class="mt-1 text-sm leading-6 text-slate-500">Identificar quem precisa de retorno primeiro.</p>
            </li>
            <li class="relative">
              <span class="relative flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white text-sm font-extrabold text-[#2B4091]">2</span>
              <strong class="mt-4 block text-sm font-extrabold text-[#14275f]">Executar</strong>
              <p class="mt-1 text-sm leading-6 text-slate-500">Realizar contatos, tarefas e follow-ups previstos.</p>
            </li>
            <li class="relative">
              <span class="relative flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white text-sm font-extrabold text-[#2B4091]">3</span>
              <strong class="mt-4 block text-sm font-extrabold text-[#14275f]">Acompanhar</strong>
              <p class="mt-1 text-sm leading-6 text-slate-500">Verificar avanço, gargalos e oportunidades paradas.</p>
            </li>
          </ol>
        </div>
      </div>
    </div>
  </section>

  <section id="whatsapp" class="scroll-mt-20 bg-[#f2faf5] px-5 py-20 sm:px-8 lg:px-12 lg:py-28">
    <div class="mx-auto max-w-[1320px]">
      <div class="grid gap-8 lg:grid-cols-[0.72fr_1.28fr] lg:items-end lg:gap-16">
        <div>
          <p class="section-label text-[#159552]">03 · WhatsApp integrado</p>
          <h2 class="section-title mt-5">Um canal integrado a duas etapas da jornada.</h2>
        </div>
        <div>
          <p class="text-lg leading-8 text-slate-600">
            Os cinco números incluídos por unidade podem ser distribuídos entre o CRM e o F10, conforme a necessidade da operação Cebrac.
          </p>
          <div class="mt-5 flex max-w-[620px] items-start gap-3 border-l-4 border-[#2B4091] bg-white px-5 py-4 shadow-[0_8px_24px_rgba(43,64,145,0.06)]">
            <CalendarCheck2 size={20} class="mt-0.5 shrink-0 text-[#2B4091]" />
            <div>
              <strong class="text-sm font-extrabold text-[#2B4091]">Marco de disponibilidade</strong>
              <p class="mt-1 text-sm leading-6 text-slate-600">WhatsApp no F10 disponível a partir de agosto de 2026.</p>
            </div>
          </div>
        </div>
      </div>

      <div class="mt-12 grid gap-6 lg:grid-cols-2">
        <article class="overflow-hidden border border-emerald-100 bg-white shadow-[0_12px_38px_rgba(14,70,45,0.05)]">
          <div class="flex items-center justify-between gap-5 border-b border-emerald-100 bg-emerald-50/70 px-7 py-6 sm:px-8">
            <div>
              <span class="text-xs font-extrabold uppercase tracking-[0.15em] text-[#159552]">No CRM de Leads</span>
              <h3 class="mt-2 text-2xl font-extrabold text-[#14275f]">Atendimento comercial</h3>
            </div>
            <MessageCircleMore size={32} class="shrink-0 text-[#159552]" />
          </div>
          <div class="divide-y divide-slate-100 px-7 sm:px-8">
            {#each leadWhatsAppFeatures as feature}
              <div class="flex gap-4 py-6">
                <div class="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#f5f7fc]">
                  <svelte:component this={feature.icon} size={21} strokeWidth={1.9} class={feature.iconClass} />
                </div>
                <div>
                  <strong class="text-sm font-extrabold text-[#14275f]">{feature.title}</strong>
                  <p class="mt-1 text-sm leading-6 text-slate-500">{feature.description}</p>
                </div>
              </div>
            {/each}
          </div>
        </article>

        <article class="overflow-hidden border border-[#2B4091]/10 bg-white shadow-[0_12px_38px_rgba(43,64,145,0.05)]">
          <div class="flex items-center justify-between gap-5 border-b border-[#2B4091]/10 bg-[#eef1fb] px-7 py-6 sm:px-8">
            <div>
              <span class="text-xs font-extrabold uppercase tracking-[0.15em] text-[#2B4091]">No F10</span>
              <h3 class="mt-2 text-2xl font-extrabold text-[#14275f]">Relacionamento com alunos</h3>
            </div>
            <MessagesSquare size={32} class="shrink-0 text-[#2B4091]" />
          </div>
          <div class="grid sm:grid-cols-2">
            {#each studentWhatsAppFeatures as feature, index}
              <div class={`border-slate-100 px-7 py-6 sm:px-8 ${index % 2 === 0 ? "sm:border-r" : ""} ${index < 2 ? "border-b" : ""}`}>
                <svelte:component this={feature.icon} size={22} strokeWidth={1.9} class={feature.iconClass} />
                <strong class="mt-4 block text-sm font-extrabold text-[#14275f]">{feature.title}</strong>
                <p class="mt-1 text-sm leading-6 text-slate-500">{feature.description}</p>
              </div>
            {/each}
          </div>
        </article>
      </div>

      <div class="media-frame mt-8 min-h-[230px]">
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
  </section>

  <section id="responsabilidades" class="scroll-mt-20 bg-white px-5 py-20 sm:px-8 lg:px-12 lg:py-28">
    <div class="mx-auto max-w-[1320px]">
      <div class="grid gap-8 lg:grid-cols-[0.72fr_1.28fr] lg:items-end lg:gap-16">
        <div>
          <p class="section-label">04 · Quem faz o quê</p>
          <h2 class="section-title mt-5">Responsabilidades claras aceleram a adoção.</h2>
        </div>
        <p class="max-w-[760px] text-lg leading-8 text-slate-600 lg:pb-1">
          A implantação é um trabalho conjunto. Cada parte assume um papel específico para que a tecnologia entre em operação com método, suporte e participação das equipes.
        </p>
      </div>

      <div class="mt-12 grid gap-5 lg:grid-cols-3">
        {#each responsibilities as responsibility}
          <article class={`border border-t-4 border-slate-200 bg-white px-7 py-8 ${responsibility.accentClass}`}>
            <div class={`flex h-12 w-12 items-center justify-center rounded-xl ${responsibility.iconClass}`}>
              <svelte:component this={responsibility.icon} size={24} strokeWidth={1.8} />
            </div>
            <span class="mt-6 block text-xs font-extrabold uppercase tracking-[0.15em] text-slate-400">{responsibility.label}</span>
            <h3 class="mt-2 text-2xl font-extrabold text-[#14275f]">{responsibility.title}</h3>
            <p class="mt-3 min-h-[48px] text-sm leading-6 text-slate-500">{responsibility.description}</p>
            <div class="mt-6 space-y-4 border-t border-slate-100 pt-6">
              {#each responsibility.items as item}
                <div class="flex gap-3 text-sm leading-6 text-slate-600">
                  <CheckCircle2 size={18} class="mt-0.5 shrink-0 text-[#159552]" />
                  <span>{item}</span>
                </div>
              {/each}
            </div>
          </article>
        {/each}
      </div>
    </div>
  </section>

  <section id="indicadores" class="scroll-mt-20 bg-[#06173e] px-5 py-20 text-white sm:px-8 lg:px-12 lg:py-28">
    <div class="mx-auto max-w-[1320px]">
      <div class="grid gap-8 lg:grid-cols-[0.72fr_1.28fr] lg:items-end lg:gap-16">
        <div>
          <p class="text-xs font-extrabold uppercase tracking-[0.2em] text-[#ff9a42]">05 · Como medir a evolução</p>
          <h2 class="mt-5 text-4xl font-extrabold leading-[1.08] tracking-[-0.04em] sm:text-5xl lg:text-[58px]">
            A implantação só gera valor quando a rotina melhora.
          </h2>
        </div>
        <p class="max-w-[760px] text-lg leading-8 text-white/60 lg:pb-1">
          O acompanhamento não termina no treinamento. Os indicadores mostram onde a equipe evoluiu, onde existem gargalos e quais ações precisam ser ajustadas.
        </p>
      </div>

      <div class="mt-12 grid overflow-hidden border border-white/10 sm:grid-cols-2 lg:grid-cols-3">
        {#each successMetrics as metric, index}
          <article class={`border-white/10 bg-white/[0.035] px-7 py-8 ${index % 3 !== 2 ? "lg:border-r" : ""} ${index < 3 ? "lg:border-b" : ""} ${index % 2 === 0 ? "sm:border-r lg:border-r" : ""} ${index < 4 ? "sm:border-b" : ""}`}>
            <svelte:component this={metric.icon} size={25} strokeWidth={1.9} class={metric.iconClass} />
            <h3 class="mt-5 text-lg font-extrabold">{metric.title}</h3>
            <p class="mt-2 text-sm leading-6 text-white/55">{metric.description}</p>
          </article>
        {/each}
      </div>
    </div>
  </section>

  <section id="implantacao" class="scroll-mt-20 bg-white px-5 py-20 sm:px-8 lg:px-12 lg:py-28">
    <div class="mx-auto max-w-[1320px]">
      <div class="grid gap-14 lg:grid-cols-[0.72fr_1.28fr] lg:gap-20">
        <div>
          <p class="section-label">06 · Como será a implantação</p>
          <h2 class="section-title mt-5">Uma adoção progressiva e acompanhada.</h2>
          <p class="mt-6 text-lg leading-8 text-slate-600">
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

        <div class="relative">
          <div class="absolute bottom-8 left-[27px] top-8 hidden w-px bg-slate-300 sm:block"></div>
          <ol class="space-y-4">
            {#each implementationSteps as step}
              <li class="relative border border-slate-200 bg-[#f8fafc] p-6 sm:ml-7 sm:pl-16">
                <div class="mb-4 flex h-14 w-14 items-center justify-center rounded-xl bg-[#2B4091] text-sm font-extrabold text-white sm:absolute sm:left-0 sm:top-1/2 sm:mb-0 sm:-translate-x-1/2 sm:-translate-y-1/2">
                  {step.number}
                </div>
                <div class="flex flex-wrap items-center justify-between gap-3">
                  <h3 class="text-xl font-extrabold tracking-[-0.02em] text-[#14275f]">{step.title}</h3>
                  <span class="border border-slate-200 bg-white px-3 py-1 text-[11px] font-extrabold uppercase tracking-[0.12em] text-slate-500">
                    {step.owner}
                  </span>
                </div>
                <p class="mt-2 text-sm leading-6 text-slate-600">{step.description}</p>
              </li>
            {/each}
          </ol>
        </div>
      </div>
    </div>
  </section>

  <section id="proximos-passos" class="scroll-mt-20 bg-[#f5f7fc] px-5 py-20 sm:px-8 lg:px-12 lg:py-28">
    <div class="mx-auto max-w-[1180px] overflow-hidden border border-[#2B4091]/10 bg-white shadow-[0_20px_60px_rgba(43,64,145,0.09)]">
      <div class="grid lg:grid-cols-[0.78fr_1.22fr]">
        <div class="bg-[#2B4091] px-8 py-10 text-white sm:px-10 lg:px-12 lg:py-14">
          <img src="/Logo-Cebrac.png" alt="Cebrac" class="h-14 w-auto object-contain" />
          <p class="mt-8 text-xs font-extrabold uppercase tracking-[0.18em] text-white/55">Próxima etapa</p>
          <h2 class="mt-4 text-3xl font-extrabold leading-tight tracking-[-0.035em] sm:text-4xl">
            O que cada unidade precisa organizar agora.
          </h2>
          <p class="mt-5 text-sm leading-7 text-white/70">
            Essas definições permitem iniciar a configuração assim que o cronograma oficial for comunicado.
          </p>
        </div>

        <div class="px-8 py-10 sm:px-10 lg:px-12 lg:py-14">
          <ol class="space-y-5">
            {#each nextSteps as step, index}
              <li class="grid grid-cols-[42px_1fr] items-start gap-4 border-b border-slate-100 pb-5 last:border-b-0 last:pb-0">
                <span class="flex h-10 w-10 items-center justify-center rounded-full bg-[#eef1fb] text-sm font-extrabold text-[#2B4091]">
                  {index + 1}
                </span>
                <span class="pt-2 text-base font-semibold leading-6 text-[#14275f]">{step}</span>
              </li>
            {/each}
          </ol>

          <div class="mt-8 flex items-start gap-3 border-t border-slate-200 pt-6 text-sm leading-6 text-slate-500">
            <CalendarCheck2 size={19} class="mt-0.5 shrink-0 text-[#ff7900]" />
            <p>Datas, turmas e orientações serão centralizadas no canal oficial definido pela gestão da Rede Cebrac.</p>
          </div>
        </div>
      </div>
    </div>
  </section>

  <footer class="bg-[#06173e] px-5 py-16 text-white sm:px-8 lg:px-12 lg:py-20">
    <div class="mx-auto grid max-w-[1180px] gap-10 md:grid-cols-[auto_1fr_auto] md:items-center">
      <div class="flex items-center gap-6">
        <img src="/Logo-Cebrac.png" alt="Cebrac" class="h-12 w-auto object-contain" />
        <div class="h-9 w-px bg-white/20"></div>
        <img src="/logo_f10.svg" alt="F10 Software" class="h-10 w-auto brightness-0 invert" />
      </div>
      <div class="max-w-[680px]">
        <p class="text-xs font-extrabold uppercase tracking-[0.18em] text-[#ff9a42]">Cebrac + F10</p>
        <p class="mt-3 text-xl font-semibold leading-8 text-white/85">
          Método comercial, tecnologia integrada e uma operação preparada para crescer com continuidade e controle.
        </p>
      </div>
      <a href="#inicio" class="inline-flex items-center gap-2 text-sm font-extrabold text-white/70 transition hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70 focus-visible:ring-offset-4 focus-visible:ring-offset-[#06173e]">
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
    color: #ff7900;
    font-size: 0.75rem;
    font-weight: 800;
    letter-spacing: 0.2em;
    text-transform: uppercase;
  }

  .section-title {
    color: #06173e;
    font-size: clamp(2.2rem, 4vw, 3.55rem);
    font-weight: 800;
    letter-spacing: -0.04em;
    line-height: 1.08;
  }

  .presentation-nav {
    background-color: rgba(255, 255, 255, 0.94);
    box-shadow: 0 8px 24px rgba(15, 35, 75, 0.05);
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
    padding: 0.55rem 0.9rem;
    color: #52617c;
    font-size: 0.75rem;
    font-weight: 800;
    letter-spacing: 0.035em;
    transition: background-color 160ms ease, color 160ms ease;
  }

  .presentation-nav-link:hover,
  .presentation-nav-link:focus-visible {
    background: #eef1fb;
    color: #2b4091;
    outline: none;
  }

  .presentation-nav-link:focus-visible {
    box-shadow: 0 0 0 2px #2b4091;
  }

  .media-frame {
    overflow: hidden;
    border: 1px solid #cbd1da;
    background: #e5e8ed;
    box-shadow: 0 18px 45px rgba(15, 35, 75, 0.08);
  }

  .media-toolbar {
    display: flex;
    min-height: 42px;
    align-items: center;
    gap: 7px;
    border-bottom: 1px solid #cbd1da;
    background: #f1f3f6;
    padding: 0 16px;
  }

  .media-toolbar > span {
    width: 8px;
    height: 8px;
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
    min-height: calc(100% - 42px);
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 32px;
    text-align: center;
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
    max-width: 360px;
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
