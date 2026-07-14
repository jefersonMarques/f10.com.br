<script lang="ts">
  import {
    ArrowRight,
    BarChart3,
    BellRing,
    CalendarCheck2,
    CheckCircle2,
    ClipboardCheck,
    Database,
    FileText,
    Funnel,
    MessageCircleMore,
    MessagesSquare,
    ShieldCheck,
    Target,
    TimerReset,
    TrendingUp,
    UserCheck,
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
    icon: IconComponent;
    points: string[];
  };

  type ComparisonRow = {
    before: string;
    after: string;
  };

  type ImplementationStep = {
    number: string;
    title: string;
    description: string;
  };

  const heroFeatures: FeatureItem[] = [
    {
      title: "Funil visual",
      description: "Acompanhe cada etapa das matrículas de forma clara.",
      icon: Funnel,
      iconClass: "text-[#ff7900]",
    },
    {
      title: "WhatsApp integrado",
      description: "Converse, agende e responda seus leads sem sair do CRM.",
      icon: MessageCircleMore,
      iconClass: "text-[#17a85b]",
    },
    {
      title: "Mais produtividade",
      description: "Automatize tarefas e ganhe tempo no que realmente importa.",
      icon: TrendingUp,
      iconClass: "text-[#ff7900]",
    },
    {
      title: "Histórico centralizado",
      description: "Todas as interações reunidas em um só lugar.",
      icon: FileText,
      iconClass: "text-[#0a2c67]",
    },
  ];

  const challenges: ChallengeItem[] = [
    {
      number: "01",
      title: "Leads param antes da matrícula",
      description:
        "Sem uma rotina clara de contato, parte das oportunidades deixa de avançar, mesmo depois do investimento realizado para captar cada lead.",
      icon: TimerReset,
      points: [
        "Follow-ups esquecidos",
        "Demora no primeiro retorno",
        "Negociações sem próximo passo",
      ],
    },
    {
      number: "02",
      title: "O conhecimento sai junto com a pessoa",
      description:
        "Quando o histórico fica na memória do vendedor ou em conversas isoladas, a troca de equipe interrompe negociações e reduz a produtividade.",
      icon: Database,
      points: [
        "Histórico espalhado",
        "Novo colaborador começa do zero",
        "Perda de contexto no atendimento",
      ],
    },
  ];

  const crmFeatures: FeatureItem[] = [
    {
      title: "Kanban por etapa",
      description: "Visualize onde cada oportunidade está e o que precisa acontecer a seguir.",
      icon: Funnel,
      iconClass: "text-[#ff7900]",
    },
    {
      title: "Responsáveis e tarefas",
      description: "Cada lead tem dono, prioridade, prazo e próxima atividade definida.",
      icon: CalendarCheck2,
      iconClass: "text-[#0a3a81]",
    },
    {
      title: "Histórico completo",
      description: "Contatos, observações, mensagens e mudanças de etapa permanecem registrados.",
      icon: FileText,
      iconClass: "text-[#0a3a81]",
    },
    {
      title: "Indicadores comerciais",
      description: "Acompanhe conversão, produtividade, campanhas, cursos e gargalos do funil.",
      icon: BarChart3,
      iconClass: "text-[#17a85b]",
    },
  ];

  const whatsappFeatures: FeatureItem[] = [
    {
      title: "Conversas centralizadas",
      description: "O atendimento comercial fica vinculado ao lead dentro do CRM.",
      icon: MessagesSquare,
      iconClass: "text-[#17a85b]",
    },
    {
      title: "Continuidade no atendimento",
      description: "A equipe consegue retomar conversas sem depender de um único aparelho ou colaborador.",
      icon: UserCheck,
      iconClass: "text-[#0a3a81]",
    },
    {
      title: "Mensagens no momento certo",
      description: "Lembretes, avisos e acompanhamentos passam a fazer parte da rotina operacional.",
      icon: BellRing,
      iconClass: "text-[#ff7900]",
    },
    {
      title: "Informação protegida",
      description: "O histórico permanece na unidade e acompanha toda a jornada do relacionamento.",
      icon: ShieldCheck,
      iconClass: "text-[#6b55c7]",
    },
  ];

  const journeySteps: FeatureItem[] = [
    {
      title: "Atrair",
      description: "Receber leads das campanhas e canais de captação.",
      icon: Target,
      iconClass: "text-[#ff7900]",
    },
    {
      title: "Nutrir",
      description: "Manter contato com cadência, contexto e prioridade.",
      icon: MessagesSquare,
      iconClass: "text-[#0a3a81]",
    },
    {
      title: "Converter",
      description: "Acompanhar visitas, propostas e negociações.",
      icon: TrendingUp,
      iconClass: "text-[#17a85b]",
    },
    {
      title: "Matricular",
      description: "Concluir a venda e iniciar o relacionamento com o aluno.",
      icon: CheckCircle2,
      iconClass: "text-[#6b55c7]",
    },
  ];

  const comparisonRows: ComparisonRow[] = [
    {
      before: "Informações em planilhas, anotações e celulares",
      after: "Histórico centralizado em um único ambiente",
    },
    {
      before: "Follow-ups dependem da memória do vendedor",
      after: "Tarefas e lembretes orientam a próxima ação",
    },
    {
      before: "Dificuldade para identificar leads parados",
      after: "Funil visual mostra gargalos e prioridades",
    },
    {
      before: "Troca de equipe interrompe negociações",
      after: "Novo colaborador assume com todo o contexto",
    },
    {
      before: "Gestão baseada em percepção",
      after: "Decisões apoiadas por indicadores reais",
    },
  ];

  const benefits: FeatureItem[] = [
    {
      title: "Mais matrículas",
      description: "Melhor aproveitamento dos leads já captados.",
      icon: TrendingUp,
      iconClass: "text-[#ff9a42]",
    },
    {
      title: "Mais produtividade",
      description: "Menos improviso e mais clareza sobre a rotina.",
      icon: ClipboardCheck,
      iconClass: "text-[#ff9a42]",
    },
    {
      title: "Mais controle",
      description: "Visão completa do funil e do desempenho comercial.",
      icon: BarChart3,
      iconClass: "text-[#ff9a42]",
    },
    {
      title: "Mais continuidade",
      description: "O processo permanece mesmo com mudanças na equipe.",
      icon: UserCheck,
      iconClass: "text-[#ff9a42]",
    },
    {
      title: "Mais previsibilidade",
      description: "Processos padronizados geram resultados comparáveis.",
      icon: Workflow,
      iconClass: "text-[#ff9a42]",
    },
    {
      title: "Mais segurança",
      description: "Históricos e informações ficam vinculados à operação.",
      icon: ShieldCheck,
      iconClass: "text-[#ff9a42]",
    },
  ];

  const implementationSteps: ImplementationStep[] = [
    {
      number: "01",
      title: "Comunicação oficial",
      description: "Apresentação do novo modelo, dos objetivos e do cronograma para toda a rede.",
    },
    {
      number: "02",
      title: "Definição dos responsáveis",
      description: "Cada unidade indica as pessoas que acompanharão configuração, treinamento e adoção.",
    },
    {
      number: "03",
      title: "Configuração inicial",
      description: "Organização de usuários, permissões, funil comercial e números de WhatsApp.",
    },
    {
      number: "04",
      title: "Treinamento das equipes",
      description: "Capacitação prática para vendedores, gestores e responsáveis pela operação.",
    },
    {
      number: "05",
      title: "Início assistido",
      description: "Entrada em operação com acompanhamento, análise dos indicadores e ajustes contínuos.",
    },
  ];

  const unitActions: FeatureItem[] = [
    {
      title: "Indicar um responsável",
      description: "Definir quem será o ponto de contato da unidade durante a implantação.",
      icon: UserCheck,
      iconClass: "text-[#ff7900]",
    },
    {
      title: "Mapear equipe e números",
      description: "Informar usuários comerciais e números de WhatsApp que participarão da operação.",
      icon: ClipboardCheck,
      iconClass: "text-[#0a3a81]",
    },
    {
      title: "Participar do treinamento",
      description: "Garantir que gestores e equipe comercial conheçam o método e os recursos.",
      icon: CalendarCheck2,
      iconClass: "text-[#17a85b]",
    },
  ];
</script>

<svelte:head>
  <title>Cebrac + F10 | CRM de Leads e WhatsApp integrado</title>
  <meta
    name="description"
    content="Apresentação institucional do CRM de Leads e WhatsApp integrado para a rede Cebrac."
  />
  <meta name="robots" content="noindex,nofollow,noarchive,nosnippet" />
  <link rel="preload" as="image" href="/background-hero-cebrac.png" />
  <link rel="preload" as="image" href="/hero-cebrac.webp" type="image/webp" />
</svelte:head>

<div class="presentation-page overflow-hidden bg-white text-[#06173e]">
  <section id="inicio" class="relative isolate min-h-[100svh] overflow-hidden bg-white">
    <img
      src="/background-hero-cebrac.png"
      alt=""
      aria-hidden="true"
      class="pointer-events-none absolute inset-0 -z-10 h-full w-full object-cover object-center"
      fetchpriority="high"
    />

    <div class="mx-auto grid min-h-[100svh] w-full max-w-[1660px] items-center gap-8 px-5 py-12 sm:px-8 lg:grid-cols-[0.82fr_1.18fr] lg:px-10 lg:py-8 xl:px-14">
      <div class="relative z-20 max-w-[690px] lg:py-12">
        <div class="inline-flex items-center rounded-xl border border-[#ffd3b3] bg-white/80 px-5 py-2.5 text-base font-extrabold tracking-[0.02em] text-[#ff7900] shadow-sm backdrop-blur">
          F10 CRM
        </div>

        <h1 class="mt-8 text-[44px] font-extrabold leading-[1.08] tracking-[-0.048em] sm:text-[58px] lg:text-[60px] xl:text-[68px]">
          <span class="text-[#ff7900]">CRM</span>
          <span class="text-[#06173e]"> e </span>
          <span class="text-[#14a458]">WhatsApp</span>
          <br />
          <span class="text-[#06173e]">integrados para sua equipe comercial.</span>
        </h1>

        <p class="mt-7 max-w-[650px] text-lg font-medium leading-8 text-[#3d4d6b] sm:text-[22px] sm:leading-9">
          Mais organização, rapidez no atendimento e controle completo do funil de matrículas.
        </p>

        <div class="mt-8 h-1 w-12 rounded-full bg-[#ff7900]"></div>

        <div class="mt-7 grid grid-cols-2 gap-3 sm:gap-4">
          {#each heroFeatures as feature}
            <article class="min-h-[178px] rounded-[22px] border border-[#edf0f5] bg-white/90 p-5 shadow-[0_16px_42px_rgba(14,37,83,0.08)] backdrop-blur sm:min-h-[190px] sm:p-6">
              <svelte:component this={feature.icon} size={36} strokeWidth={2.1} class={feature.iconClass} />
              <h2 class="mt-5 text-[15px] font-extrabold leading-5 text-[#07173e] sm:text-base">
                {feature.title}
              </h2>
              <p class="mt-2 text-xs leading-5 text-[#52617c] sm:text-[13px]">
                {feature.description}
              </p>
            </article>
          {/each}
        </div>
      </div>

      <div class="relative z-10 flex min-h-[420px] items-center justify-center lg:min-h-[760px] lg:justify-end">
        <img
          src="/hero-cebrac.webp"
          alt="CRM F10 exibido em um computador com atendimento integrado pelo WhatsApp em um smartphone"
          class="h-auto w-full max-w-[980px] object-contain drop-shadow-[0_32px_42px_rgba(14,37,83,0.18)]"
          fetchpriority="high"
        />
      </div>
    </div>
  </section>

  <section class="border-y border-slate-200 bg-white px-5 py-6 sm:px-8 lg:px-12">
    <div class="mx-auto grid max-w-[1320px] divide-y divide-slate-200 sm:grid-cols-3 sm:divide-x sm:divide-y-0">
      <div class="px-5 py-5 text-center">
        <strong class="block text-3xl font-extrabold tracking-[-0.04em] text-[#ff7900]">1 método</strong>
        <span class="mt-1 block text-sm font-medium text-slate-500">comercial padronizado</span>
      </div>
      <div class="px-5 py-5 text-center">
        <strong class="block text-3xl font-extrabold tracking-[-0.04em] text-[#0a3a81]">2 frentes</strong>
        <span class="mt-1 block text-sm font-medium text-slate-500">leads e relacionamento com alunos</span>
      </div>
      <div class="px-5 py-5 text-center">
        <strong class="block text-3xl font-extrabold tracking-[-0.04em] text-[#17a85b]">5 números</strong>
        <span class="mt-1 block text-sm font-medium text-slate-500">de WhatsApp incluídos por unidade</span>
      </div>
    </div>
  </section>

  <section class="bg-[#f5f8fd] px-5 py-24 sm:px-8 lg:px-12 lg:py-32">
    <div class="mx-auto max-w-[1320px]">
      <div class="max-w-[900px]">
        <p class="text-xs font-extrabold uppercase tracking-[0.2em] text-[#ff7900]">Por que essa evolução é necessária</p>
        <h2 class="mt-5 text-4xl font-extrabold leading-tight tracking-[-0.04em] text-[#06173e] sm:text-5xl lg:text-[58px]">
          O problema não é apenas captar leads. É garantir que cada oportunidade avance.
        </h2>
        <p class="mt-6 max-w-[800px] text-lg leading-8 text-slate-600">
          A nova operação organiza o atendimento comercial, preserva o conhecimento da unidade e reduz perdas que normalmente não aparecem nos relatórios.
        </p>
      </div>

      <div class="mt-14 grid gap-6 lg:grid-cols-2">
        {#each challenges as challenge}
          <article class="relative overflow-hidden rounded-[34px] border border-slate-200 bg-white p-8 shadow-[0_18px_55px_rgba(15,35,75,0.07)] sm:p-10">
            <div class="absolute right-7 top-6 text-6xl font-black tracking-[-0.08em] text-slate-100">
              {challenge.number}
            </div>
            <div class="relative">
              <div class="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#edf3ff] text-[#0a3a81]">
                <svelte:component this={challenge.icon} size={27} strokeWidth={1.9} />
              </div>
              <h3 class="mt-7 max-w-[520px] text-3xl font-extrabold leading-tight tracking-[-0.035em] text-[#0b2e68]">
                {challenge.title}
              </h3>
              <p class="mt-5 max-w-[600px] text-base leading-7 text-slate-600">
                {challenge.description}
              </p>
              <div class="mt-7 flex flex-wrap gap-2">
                {#each challenge.points as point}
                  <span class="rounded-full border border-slate-200 bg-slate-50 px-4 py-2 text-xs font-bold text-slate-600">
                    {point}
                  </span>
                {/each}
              </div>
            </div>
          </article>
        {/each}
      </div>

      <div class="mt-8 rounded-[30px] bg-[#06173e] px-7 py-8 text-white sm:px-10 lg:flex lg:items-center lg:justify-between lg:gap-10">
        <p class="max-w-[920px] text-xl font-semibold leading-8 tracking-[-0.02em] sm:text-2xl">
          O CRM não substitui o trabalho comercial. Ele transforma o método em rotina, visibilidade e continuidade.
        </p>
        <div class="mt-6 flex shrink-0 items-center gap-3 lg:mt-0">
          <CheckCircle2 size={27} class="text-emerald-400" />
          <span class="text-sm font-bold text-white/75">Processo apoiado por dados</span>
        </div>
      </div>
    </div>
  </section>

  <section class="bg-white px-5 py-24 sm:px-8 lg:px-12 lg:py-32">
    <div class="mx-auto grid max-w-[1320px] items-center gap-14 lg:grid-cols-[0.92fr_1.08fr] lg:gap-20">
      <div>
        <div class="inline-flex rounded-full bg-orange-50 px-4 py-2 text-xs font-extrabold uppercase tracking-[0.16em] text-[#ff7900]">
          01 · CRM de Leads
        </div>
        <h2 class="mt-6 text-4xl font-extrabold leading-tight tracking-[-0.04em] text-[#06173e] sm:text-5xl">
          Cada oportunidade em uma etapa, com responsável e próximo passo.
        </h2>
        <p class="mt-6 text-lg leading-8 text-slate-600">
          O CRM F10 organiza toda a jornada comercial, desde a entrada do lead até a matrícula, deixando claro o que está acontecendo e o que precisa ser feito.
        </p>

        <div class="mt-9 grid gap-4 sm:grid-cols-2">
          {#each crmFeatures as feature}
            <article class="rounded-2xl border border-slate-200 bg-white p-5">
              <svelte:component this={feature.icon} size={25} strokeWidth={1.9} class={feature.iconClass} />
              <h3 class="mt-4 text-base font-extrabold text-[#0b2e68]">{feature.title}</h3>
              <p class="mt-2 text-sm leading-6 text-slate-500">{feature.description}</p>
            </article>
          {/each}
        </div>
      </div>

      <div class="image-placeholder aspect-[16/11] rounded-[34px] border-2 border-dashed border-slate-300 bg-slate-200/80 p-8 shadow-inner">
        <div class="flex h-full flex-col items-center justify-center rounded-[24px] border border-white/70 bg-white/20 text-center">
          <Funnel size={42} strokeWidth={1.5} class="text-slate-500" />
          <strong class="mt-5 text-sm font-extrabold uppercase tracking-[0.16em] text-slate-600">
            Imagem do CRM
          </strong>
          <span class="mt-2 max-w-[310px] text-sm leading-6 text-slate-500">
            Inserir captura real da visão Kanban com etapas, leads e atividades comerciais.
          </span>
        </div>
      </div>
    </div>

    <div class="mx-auto mt-14 max-w-[1320px] rounded-[30px] border border-orange-100 bg-orange-50 px-7 py-7 sm:flex sm:items-center sm:justify-between sm:gap-8 sm:px-9">
      <div>
        <strong class="text-lg font-extrabold text-[#8c3f00]">Resultado esperado</strong>
        <p class="mt-1 text-sm leading-6 text-[#9a5721]">Menos leads esquecidos, mais disciplina no acompanhamento e melhor conversão do investimento em marketing.</p>
      </div>
      <TrendingUp size={38} class="mt-5 shrink-0 text-[#ff7900] sm:mt-0" />
    </div>
  </section>

  <section class="bg-[#f3fbf6] px-5 py-24 sm:px-8 lg:px-12 lg:py-32">
    <div class="mx-auto grid max-w-[1320px] items-center gap-14 lg:grid-cols-[1.08fr_0.92fr] lg:gap-20">
      <div class="image-placeholder order-2 aspect-[16/11] rounded-[34px] border-2 border-dashed border-slate-300 bg-slate-200/80 p-8 shadow-inner lg:order-1">
        <div class="flex h-full flex-col items-center justify-center rounded-[24px] border border-white/70 bg-white/20 text-center">
          <MessageCircleMore size={42} strokeWidth={1.5} class="text-slate-500" />
          <strong class="mt-5 text-sm font-extrabold uppercase tracking-[0.16em] text-slate-600">
            Imagem do WhatsApp integrado
          </strong>
          <span class="mt-2 max-w-[340px] text-sm leading-6 text-slate-500">
            Inserir captura real da conversa vinculada ao lead ou ao cadastro do aluno.
          </span>
        </div>
      </div>

      <div class="order-1 lg:order-2">
        <div class="inline-flex rounded-full bg-white px-4 py-2 text-xs font-extrabold uppercase tracking-[0.16em] text-[#159552] shadow-sm">
          02 · WhatsApp integrado
        </div>
        <h2 class="mt-6 text-4xl font-extrabold leading-tight tracking-[-0.04em] text-[#06173e] sm:text-5xl">
          A conversa deixa de ficar solta e passa a fazer parte do processo.
        </h2>
        <p class="mt-6 text-lg leading-8 text-slate-600">
          O WhatsApp conecta duas etapas da jornada: atendimento comercial de leads no CRM e relacionamento com alunos dentro do F10.
        </p>

        <div class="mt-9 space-y-4">
          {#each whatsappFeatures as feature}
            <article class="flex gap-4 rounded-2xl border border-emerald-100 bg-white p-5 shadow-[0_10px_28px_rgba(14,70,45,0.05)]">
              <div class="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-emerald-50">
                <svelte:component this={feature.icon} size={22} strokeWidth={1.9} class={feature.iconClass} />
              </div>
              <div>
                <h3 class="text-base font-extrabold text-[#0b2e68]">{feature.title}</h3>
                <p class="mt-1 text-sm leading-6 text-slate-500">{feature.description}</p>
              </div>
            </article>
          {/each}
        </div>

        <div class="mt-7 rounded-2xl bg-[#17a85b] px-6 py-5 text-white">
          <strong class="text-lg font-extrabold">Cinco números incluídos por unidade</strong>
          <p class="mt-1 text-sm leading-6 text-white/80">A distribuição entre CRM e F10 será definida conforme a necessidade da operação.</p>
        </div>
      </div>
    </div>
  </section>

  <section class="bg-white px-5 py-24 sm:px-8 lg:px-12 lg:py-32">
    <div class="mx-auto max-w-[1320px]">
      <div class="mx-auto max-w-[860px] text-center">
        <p class="text-xs font-extrabold uppercase tracking-[0.2em] text-[#ff7900]">O método comercial</p>
        <h2 class="mt-5 text-4xl font-extrabold leading-tight tracking-[-0.04em] text-[#06173e] sm:text-5xl">
          Da captação à matrícula, a equipe sabe o que fazer.
        </h2>
        <p class="mt-6 text-lg leading-8 text-slate-600">
          A tecnologia organiza o fluxo. O método define o ritmo, a prioridade e a qualidade do acompanhamento.
        </p>
      </div>

      <div class="relative mt-14 grid gap-5 md:grid-cols-4">
        <div class="absolute left-[12%] right-[12%] top-12 hidden h-px bg-slate-200 md:block"></div>
        {#each journeySteps as step, index}
          <article class="relative rounded-[28px] border border-slate-200 bg-white p-7 text-center shadow-[0_14px_40px_rgba(15,35,75,0.06)]">
            <div class="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[#f5f8fd] ring-8 ring-white">
              <svelte:component this={step.icon} size={26} strokeWidth={2} class={step.iconClass} />
            </div>
            <span class="mt-6 block text-xs font-extrabold tracking-[0.16em] text-slate-400">0{index + 1}</span>
            <h3 class="mt-2 text-xl font-extrabold text-[#0b2e68]">{step.title}</h3>
            <p class="mt-3 text-sm leading-6 text-slate-500">{step.description}</p>
          </article>
        {/each}
      </div>
    </div>
  </section>

  <section class="bg-[#f5f8fd] px-5 py-24 sm:px-8 lg:px-12 lg:py-32">
    <div class="mx-auto max-w-[1320px]">
      <div class="grid gap-8 lg:grid-cols-[0.75fr_1.25fr] lg:gap-16">
        <div>
          <p class="text-xs font-extrabold uppercase tracking-[0.2em] text-[#ff7900]">O que muda na prática</p>
          <h2 class="mt-5 text-4xl font-extrabold leading-tight tracking-[-0.04em] text-[#06173e] sm:text-5xl">
            Menos dependência de controles individuais. Mais clareza para toda a equipe.
          </h2>
          <p class="mt-6 text-lg leading-8 text-slate-600">
            O novo modelo substitui rotinas frágeis por um processo visível, rastreável e fácil de acompanhar.
          </p>
        </div>

        <div class="overflow-hidden rounded-[30px] border border-slate-200 bg-white shadow-[0_18px_55px_rgba(15,35,75,0.06)]">
          <div class="grid grid-cols-2 bg-[#06173e] text-white">
            <div class="border-r border-white/10 px-5 py-4 text-sm font-extrabold uppercase tracking-[0.13em] text-white/65 sm:px-7">
              Antes
            </div>
            <div class="px-5 py-4 text-sm font-extrabold uppercase tracking-[0.13em] text-emerald-300 sm:px-7">
              Com CRM e método
            </div>
          </div>
          {#each comparisonRows as row}
            <div class="grid grid-cols-2 border-t border-slate-100">
              <div class="border-r border-slate-100 px-5 py-5 text-sm leading-6 text-slate-500 sm:px-7">
                {row.before}
              </div>
              <div class="px-5 py-5 text-sm font-semibold leading-6 text-[#0b2e68] sm:px-7">
                <span class="mr-2 text-[#17a85b]">✓</span>{row.after}
              </div>
            </div>
          {/each}
        </div>
      </div>
    </div>
  </section>

  <section class="relative overflow-hidden bg-[#05132f] px-5 py-24 text-white sm:px-8 lg:px-12 lg:py-32">
    <div class="pointer-events-none absolute inset-0">
      <div class="absolute -left-44 top-10 h-96 w-96 rounded-full bg-blue-500/10 blur-3xl"></div>
      <div class="absolute -right-44 bottom-0 h-96 w-96 rounded-full bg-orange-500/10 blur-3xl"></div>
    </div>

    <div class="relative mx-auto max-w-[1320px]">
      <div class="max-w-[900px]">
        <p class="text-xs font-extrabold uppercase tracking-[0.2em] text-[#ff9a42]">Benefícios para a rede</p>
        <h2 class="mt-5 text-4xl font-extrabold leading-tight tracking-[-0.04em] sm:text-5xl lg:text-[58px]">
          Mais controle para a gestão. Mais clareza para a equipe. Mais oportunidades convertidas.
        </h2>
      </div>

      <div class="mt-14 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {#each benefits as benefit, index}
          <article class="rounded-[26px] border border-white/10 bg-white/[0.055] p-7 backdrop-blur">
            <div class="flex items-start justify-between gap-4">
              <div class="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/10">
                <svelte:component this={benefit.icon} size={24} strokeWidth={1.9} class={benefit.iconClass} />
              </div>
              <span class="text-xs font-extrabold text-white/25">0{index + 1}</span>
            </div>
            <h3 class="mt-6 text-xl font-extrabold">{benefit.title}</h3>
            <p class="mt-3 text-sm leading-6 text-white/55">{benefit.description}</p>
          </article>
        {/each}
      </div>
    </div>
  </section>

  <section class="bg-white px-5 py-24 sm:px-8 lg:px-12 lg:py-32">
    <div class="mx-auto max-w-[1320px]">
      <div class="grid gap-14 lg:grid-cols-[0.72fr_1.28fr] lg:gap-20">
        <div>
          <p class="text-xs font-extrabold uppercase tracking-[0.2em] text-[#ff7900]">Como será a implantação</p>
          <h2 class="mt-5 text-4xl font-extrabold leading-tight tracking-[-0.04em] text-[#06173e] sm:text-5xl">
            Uma adoção progressiva, acompanhada e orientada por etapas.
          </h2>
          <p class="mt-6 text-lg leading-8 text-slate-600">
            Cada unidade será conduzida desde a preparação inicial até o início da operação, com treinamento e acompanhamento dos primeiros resultados.
          </p>

          <div class="image-placeholder mt-9 aspect-[16/9] rounded-[26px] border-2 border-dashed border-slate-300 bg-slate-200/80 p-5">
            <div class="flex h-full flex-col items-center justify-center rounded-[18px] border border-white/70 bg-white/20 text-center">
              <CalendarCheck2 size={34} strokeWidth={1.5} class="text-slate-500" />
              <strong class="mt-4 text-xs font-extrabold uppercase tracking-[0.15em] text-slate-600">
                Imagem do cronograma
              </strong>
              <span class="mt-2 max-w-[270px] text-xs leading-5 text-slate-500">
                Inserir cronograma oficial assim que as datas forem aprovadas.
              </span>
            </div>
          </div>
        </div>

        <div class="relative">
          <div class="absolute bottom-8 left-[27px] top-8 hidden w-px bg-slate-300 sm:block"></div>
          <div class="space-y-4">
            {#each implementationSteps as step}
              <article class="relative rounded-3xl border border-slate-200 bg-[#f8fafc] p-6 sm:pl-24">
                <div class="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-[#06173e] text-sm font-extrabold text-[#ff9638] sm:absolute sm:left-0 sm:top-1/2 sm:mb-0 sm:-translate-x-1/2 sm:-translate-y-1/2">
                  {step.number}
                </div>
                <h3 class="text-xl font-extrabold tracking-[-0.02em] text-[#102b62]">{step.title}</h3>
                <p class="mt-2 text-sm leading-6 text-slate-600">{step.description}</p>
              </article>
            {/each}
          </div>
        </div>
      </div>
    </div>
  </section>

  <section class="bg-[#f5f8fd] px-5 py-24 sm:px-8 lg:px-12 lg:py-32">
    <div class="mx-auto max-w-[1320px]">
      <div class="mx-auto max-w-[820px] text-center">
        <p class="text-xs font-extrabold uppercase tracking-[0.2em] text-[#ff7900]">Preparação das unidades</p>
        <h2 class="mt-5 text-4xl font-extrabold leading-tight tracking-[-0.04em] text-[#06173e] sm:text-5xl">
          O que cada unidade precisa fazer agora.
        </h2>
        <p class="mt-6 text-lg leading-8 text-slate-600">
          A implantação começa com três definições simples que garantem velocidade e organização nas próximas etapas.
        </p>
      </div>

      <div class="mt-14 grid gap-5 md:grid-cols-3">
        {#each unitActions as action, index}
          <article class="rounded-[28px] border border-slate-200 bg-white p-8 shadow-[0_14px_40px_rgba(15,35,75,0.05)]">
            <div class="flex items-start justify-between gap-4">
              <div class="flex h-13 w-13 items-center justify-center rounded-2xl bg-[#f5f8fd] p-3">
                <svelte:component this={action.icon} size={26} strokeWidth={1.9} class={action.iconClass} />
              </div>
              <span class="text-xs font-extrabold text-slate-300">0{index + 1}</span>
            </div>
            <h3 class="mt-7 text-xl font-extrabold text-[#0b2e68]">{action.title}</h3>
            <p class="mt-3 text-sm leading-6 text-slate-500">{action.description}</p>
          </article>
        {/each}
      </div>
    </div>
  </section>

  <section class="bg-white px-5 py-24 sm:px-8 lg:px-12 lg:py-32">
    <div class="mx-auto max-w-[1180px] overflow-hidden rounded-[42px] bg-gradient-to-br from-[#06173e] via-[#0b2b64] to-[#123f87] px-7 py-14 text-center text-white shadow-[0_30px_80px_rgba(8,29,67,0.24)] sm:px-12 sm:py-20">
      <div class="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-white/10 text-[#ff9a42] ring-1 ring-white/10">
        <CheckCircle2 size={28} />
      </div>
      <p class="mt-7 text-sm font-extrabold uppercase tracking-[0.18em] text-[#ffad68]">Cebrac + F10</p>
      <h2 class="mx-auto mt-4 max-w-[940px] text-4xl font-extrabold leading-tight tracking-[-0.04em] sm:text-5xl">
        Método comercial, tecnologia integrada e uma operação preparada para crescer.
      </h2>
      <p class="mx-auto mt-6 max-w-[790px] text-base leading-7 text-white/65 sm:text-lg">
        O objetivo é transformar cada oportunidade em um processo acompanhado, mensurável e contínuo — do primeiro contato até a matrícula.
      </p>
      <a
        href="#inicio"
        class="mt-9 inline-flex items-center gap-2 rounded-full bg-white px-6 py-3 text-sm font-extrabold text-[#0a2c67] transition hover:-translate-y-0.5 hover:shadow-lg"
      >
        Rever apresentação
        <ArrowRight size={18} />
      </a>
    </div>
  </section>
</div>

<style>
  .presentation-page {
    font-family: "Plus Jakarta Sans", ui-sans-serif, system-ui, sans-serif;
  }

  .image-placeholder {
    background-image: linear-gradient(135deg, rgba(255, 255, 255, 0.18) 25%, transparent 25%),
      linear-gradient(225deg, rgba(255, 255, 255, 0.18) 25%, transparent 25%),
      linear-gradient(45deg, rgba(255, 255, 255, 0.18) 25%, transparent 25%),
      linear-gradient(315deg, rgba(255, 255, 255, 0.18) 25%, #dfe3e8 25%);
    background-position: 16px 0, 16px 0, 0 0, 0 0;
    background-size: 32px 32px;
    background-repeat: repeat;
  }

  :global(html) {
    scroll-behavior: smooth;
  }
</style>
