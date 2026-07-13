<script lang="ts">
  import {
    BarChart3,
    BellRing,
    CalendarCheck2,
    CheckCircle2,
    ClipboardCheck,
    Database,
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
    title: string;
    description: string;
    icon: IconComponent;
    iconClass: string;
  };

  type PresentationItem = {
    title: string;
    description: string;
    icon: IconComponent;
  };

  type KanbanCard = {
    name: string;
    course: string;
    time: string;
    whatsapp?: boolean;
  };

  type KanbanColumn = {
    title: string;
    total: string;
    accentClass: string;
    cards: KanbanCard[];
  };

  const heroFeatures: FeatureItem[] = [
    {
      title: "CRM com método",
      description: "Processos claros que geram resultados.",
      icon: Target,
      iconClass: "bg-blue-50 text-[#123f87] ring-blue-100",
    },
    {
      title: "WhatsApp integrado",
      description: "Conversas centralizadas e histórico preservado.",
      icon: MessageCircleMore,
      iconClass: "bg-emerald-50 text-[#16a05d] ring-emerald-100",
    },
    {
      title: "Mais controle do funil",
      description: "Visão completa para decisões melhores.",
      icon: Funnel,
      iconClass: "bg-blue-50 text-[#123f87] ring-blue-100",
    },
    {
      title: "Continuidade da operação",
      description: "Informação registrada, operação que não para.",
      icon: UsersRound,
      iconClass: "bg-orange-50 text-[#ea6d0b] ring-orange-100",
    },
  ];

  const painPoints: PresentationItem[] = [
    {
      title: "Leads sem continuidade",
      description:
        "Oportunidades deixam de avançar quando não existe rotina de acompanhamento, prazo e responsável claramente definidos.",
      icon: TimerReset,
    },
    {
      title: "Histórico disperso",
      description:
        "Informações ficam em conversas individuais, anotações ou na memória de uma pessoa, dificultando a retomada do atendimento.",
      icon: Database,
    },
    {
      title: "Gestão sem indicadores",
      description:
        "Sem uma visão centralizada do funil, fica mais difícil entender conversão, produtividade, gargalos e oportunidades de melhoria.",
      icon: BarChart3,
    },
    {
      title: "Processos diferentes por unidade",
      description:
        "A ausência de um método comum gera variações na abordagem comercial e reduz a previsibilidade dos resultados da rede.",
      icon: Workflow,
    },
  ];

  const crmHighlights: PresentationItem[] = [
    {
      title: "Funil organizado em etapas",
      description: "Cada lead tem posição, histórico, responsável e próximo passo.",
      icon: Funnel,
    },
    {
      title: "Tarefas e acompanhamentos",
      description: "Lembretes e rotinas ajudam a reduzir o esgotamento de tentativas.",
      icon: CalendarCheck2,
    },
    {
      title: "Gestão baseada em dados",
      description: "Indicadores apoiam decisões, treinamentos e melhorias do processo.",
      icon: TrendingUp,
    },
  ];

  const whatsappHighlights: PresentationItem[] = [
    {
      title: "Conversas dentro da operação",
      description: "O atendimento permanece vinculado ao lead ou ao aluno.",
      icon: MessagesSquare,
    },
    {
      title: "Histórico preservado",
      description: "A informação não se perde com troca de equipe ou de aparelho.",
      icon: ShieldCheck,
    },
    {
      title: "Comunicação em duas frentes",
      description: "CRM para captação e F10 para relacionamento após a matrícula.",
      icon: BellRing,
    },
  ];

  const benefits: PresentationItem[] = [
    {
      title: "Mais matrículas",
      description: "Menos oportunidades esquecidas e mais disciplina comercial.",
      icon: TrendingUp,
    },
    {
      title: "Mais produtividade",
      description: "A equipe sabe o que fazer, com quem falar e quando agir.",
      icon: ClipboardCheck,
    },
    {
      title: "Mais controle",
      description: "Gestores acompanham o funil e os resultados em tempo real.",
      icon: BarChart3,
    },
    {
      title: "Mais continuidade",
      description: "O processo continua mesmo quando há mudança de pessoas.",
      icon: UserCheck,
    },
    {
      title: "Mais segurança",
      description: "Históricos e informações ficam centralizados na operação.",
      icon: ShieldCheck,
    },
  ];

  const implementationSteps = [
    {
      number: "01",
      title: "Comunicação oficial",
      description: "Apresentação do novo modelo e alinhamento dos objetivos com a rede.",
    },
    {
      number: "02",
      title: "Definição dos responsáveis",
      description: "Identificação das pessoas que participarão da implantação em cada unidade.",
    },
    {
      number: "03",
      title: "Configuração",
      description: "Organização dos usuários, números de WhatsApp e etapas do processo comercial.",
    },
    {
      number: "04",
      title: "Treinamento",
      description: "Capacitação das equipes para o uso do CRM, do método e dos novos recursos.",
    },
    {
      number: "05",
      title: "Início assistido",
      description: "Acompanhamento da operação e evolução contínua a partir dos indicadores.",
    },
  ];

  const kanbanColumns: KanbanColumn[] = [
    {
      title: "Novo lead",
      total: "312",
      accentClass: "bg-blue-500",
      cards: [
        { name: "Ana Beatriz", course: "Inglês Flex", time: "Há 10 min", whatsapp: true },
        { name: "Lucas Fernandes", course: "Informática", time: "Há 25 min", whatsapp: true },
      ],
    },
    {
      title: "Contato efetuado",
      total: "186",
      accentClass: "bg-sky-400",
      cards: [
        { name: "Carlos Eduardo", course: "Informática", time: "Hoje 09:15" },
        { name: "Juliana Alves", course: "Inglês Adulto", time: "Hoje 10:32", whatsapp: true },
      ],
    },
    {
      title: "Negociação",
      total: "98",
      accentClass: "bg-orange-400",
      cards: [
        { name: "Tatiane Rodrigues", course: "Inglês Flex", time: "Ontem 16:40" },
        { name: "Bruno Oliveira", course: "Informática", time: "Ontem 17:20" },
      ],
    },
    {
      title: "Proposta enviada",
      total: "64",
      accentClass: "bg-violet-400",
      cards: [
        { name: "Rafael Costa", course: "Inglês Adulto", time: "Anteontem" },
        { name: "Beatriz Martins", course: "Informática", time: "Anteontem" },
      ],
    },
    {
      title: "Matrícula",
      total: "96",
      accentClass: "bg-emerald-500",
      cards: [
        { name: "Gabriela Lima", course: "Inglês Flex", time: "Hoje 08:50" },
        { name: "Matheus Silva", course: "Informática", time: "Hoje 09:10" },
      ],
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
</svelte:head>

<div class="presentation-page overflow-hidden bg-white text-[#07163a]">
  <!-- === HERO SIMPLIFICADO PARA TESTE === -->
<section class="relative isolate min-h-[100svh] overflow-hidden bg-white pt-8 lg:pt-0">
  <div class="mx-auto flex min-h-[100svh] max-w-[1540px] items-center px-5 py-10 sm:px-8 lg:px-12 xl:px-16">
    <div class="grid w-full items-center gap-12 lg:grid-cols-[1fr_1.12fr] xl:gap-16">
      
      <!-- Lado esquerdo -->
      <div class="relative z-20 max-w-[680px]">
        <!-- Logos -->
        <div class="mb-10 flex items-center gap-5">
          <div class="flex items-center gap-2.5">
            <svg class="h-10 w-16 sm:h-12 sm:w-20" viewBox="0 0 76 44" aria-hidden="true">
              <path d="M4 22 24 4h27L31 22l20 18H24L4 22Z" fill="#21854a" />
              <path d="m31 22 20-18 21 18-21 18-20-18Z" fill="#f4bd20" />
              <circle cx="31" cy="22" r="10.5" fill="white" />
            </svg>
            <div class="leading-none">
              <div class="text-[26px] font-extrabold tracking-[-0.06em] text-[#0d3678]">cebrac</div>
              <div class="text-[9px] font-semibold italic text-[#0d3678]">Você profissional.</div>
            </div>
          </div>
          <span class="h-12 w-px bg-slate-300"></span>
          <img src="/logo_f10.svg" alt="F10" class="h-11" />
        </div>

        <div class="mb-6 inline-flex rounded-3xl bg-orange-50 px-5 py-1.5 text-sm font-bold text-[#ea6d0b]">
          F10 CRM
        </div>

        <h1 class="text-[42px] font-bold leading-[1.05] tracking-[-0.045em] text-[#07163a] sm:text-[54px]">
          CRM e <span class="text-[#10b981]">WhatsApp</span> integrados
        </h1>

        <p class="mt-6 text-[21px] font-medium text-[#0c2d69]">
          Mais organização, rapidez no atendimento e controle completo do funil de matrículas.
        </p>
      </div>

      <!-- Lado direito - Apenas a imagem -->
      <div class="relative">
        <img 
          src="/static/hero-cebrac.webp" 
          alt="Mockup F10 CRM" 
          class="w-full rounded-3xl shadow-2xl"
        >
      </div>
    </div>
  </div>
</section>

  <section class="relative bg-[#f4f7fc] px-5 py-24 sm:px-8 lg:px-12 lg:py-32">
    <div class="mx-auto max-w-[1320px]">
      <div class="grid gap-10 lg:grid-cols-[0.72fr_1.28fr] lg:gap-16">
        <div>
          <p class="text-xs font-bold uppercase tracking-[0.18em] text-[#ea6d0b]">Por que um CRM?</p>
          <h2 class="mt-4 text-4xl font-bold leading-tight tracking-[-0.04em] text-[#07163a] sm:text-5xl">
            O problema não é falta de lead. É perder oportunidades no caminho.
          </h2>
          <p class="mt-6 text-lg leading-8 text-slate-600">
            O CRM organiza o método comercial, registra o histórico e garante que cada oportunidade seja acompanhada até a matrícula.
          </p>
        </div>

        <div class="grid gap-4 sm:grid-cols-2">
          {#each painPoints as item}
            <article class="rounded-3xl border border-slate-200 bg-white p-7 shadow-[0_16px_45px_rgba(15,35,75,0.06)]">
              <div class="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#eef4ff] text-[#174583]">
                <svelte:component this={item.icon} size={24} strokeWidth={1.9} />
              </div>
              <h3 class="mt-5 text-xl font-bold tracking-[-0.02em] text-[#102b62]">{item.title}</h3>
              <p class="mt-3 text-sm leading-6 text-slate-600">{item.description}</p>
            </article>
          {/each}
        </div>
      </div>

      <div class="mt-16 rounded-[32px] bg-[#07163a] px-7 py-9 text-white sm:px-12 lg:flex lg:items-center lg:justify-between lg:gap-10">
        <div class="max-w-[900px]">
          <p class="text-sm font-semibold uppercase tracking-[0.16em] text-[#ff9a42]">O papel da tecnologia</p>
          <p class="mt-3 text-2xl font-semibold leading-snug tracking-[-0.025em] sm:text-3xl">
            O CRM não substitui o trabalho comercial. Ele transforma o método em rotina, visibilidade e continuidade.
          </p>
        </div>
        <div class="mt-7 flex shrink-0 items-center gap-3 lg:mt-0">
          <CheckCircle2 size={28} class="text-emerald-400" />
          <span class="text-sm font-semibold text-white/80">Método apoiado por dados</span>
        </div>
      </div>
    </div>
  </section>

  <section class="bg-white px-5 py-24 sm:px-8 lg:px-12 lg:py-32">
    <div class="mx-auto max-w-[1320px]">
      <div class="mx-auto max-w-[850px] text-center">
        <p class="text-xs font-bold uppercase tracking-[0.18em] text-[#ea6d0b]">O que muda na operação</p>
        <h2 class="mt-4 text-4xl font-bold leading-tight tracking-[-0.04em] text-[#07163a] sm:text-5xl">
          Um canal, duas frentes de atendimento.
        </h2>
        <p class="mt-6 text-lg leading-8 text-slate-600">
          O WhatsApp passa a fazer parte da jornada, desde o primeiro contato com o lead até o relacionamento com o aluno após a matrícula.
        </p>
      </div>

      <div class="mt-14 grid gap-6 lg:grid-cols-2">
        <article class="relative overflow-hidden rounded-[36px] bg-[#07163a] p-8 text-white sm:p-10 lg:p-12">
          <div class="absolute -right-24 -top-24 h-72 w-72 rounded-full border-[54px] border-blue-400/10"></div>
          <div class="relative">
            <div class="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/10 text-[#ff973b] ring-1 ring-white/10">
              <Funnel size={27} />
            </div>
            <p class="mt-8 text-sm font-bold uppercase tracking-[0.17em] text-[#ff9a42]">CRM de Leads</p>
            <h3 class="mt-3 text-3xl font-bold tracking-[-0.035em]">Da oportunidade à matrícula</h3>
            <p class="mt-5 max-w-[560px] text-base leading-7 text-white/70">
              Leads, tarefas, histórico, WhatsApp e indicadores em um fluxo único para que a equipe comercial trabalhe com prioridade e método.
            </p>

            <div class="mt-9 space-y-4">
              {#each crmHighlights as item}
                <div class="flex gap-4 rounded-2xl border border-white/10 bg-white/[0.06] p-4">
                  <div class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/10 text-[#ff9a42]">
                    <svelte:component this={item.icon} size={20} />
                  </div>
                  <div>
                    <h4 class="text-sm font-bold">{item.title}</h4>
                    <p class="mt-1 text-sm leading-5 text-white/60">{item.description}</p>
                  </div>
                </div>
              {/each}
            </div>
          </div>
        </article>

        <article class="relative overflow-hidden rounded-[36px] border border-emerald-100 bg-[#f4fbf7] p-8 sm:p-10 lg:p-12">
          <div class="absolute -right-24 -top-24 h-72 w-72 rounded-full border-[54px] border-emerald-300/20"></div>
          <div class="relative">
            <div class="flex h-14 w-14 items-center justify-center rounded-2xl bg-white text-[#18a45f] shadow-sm ring-1 ring-emerald-100">
              <MessageCircleMore size={27} />
            </div>
            <p class="mt-8 text-sm font-bold uppercase tracking-[0.17em] text-[#169257]">WhatsApp integrado</p>
            <h3 class="mt-3 text-3xl font-bold tracking-[-0.035em] text-[#0d315f]">Do primeiro contato ao pós-matrícula</h3>
            <p class="mt-5 max-w-[560px] text-base leading-7 text-slate-600">
              No CRM, o WhatsApp apoia a conversão de leads. No F10, fortalece a comunicação com alunos por meio de avisos, lembretes e acompanhamentos.
            </p>

            <div class="mt-9 space-y-4">
              {#each whatsappHighlights as item}
                <div class="flex gap-4 rounded-2xl border border-emerald-100 bg-white p-4 shadow-sm">
                  <div class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-[#18a45f]">
                    <svelte:component this={item.icon} size={20} />
                  </div>
                  <div>
                    <h4 class="text-sm font-bold text-[#0d315f]">{item.title}</h4>
                    <p class="mt-1 text-sm leading-5 text-slate-500">{item.description}</p>
                  </div>
                </div>
              {/each}
            </div>
          </div>
        </article>
      </div>
    </div>
  </section>

  <section class="relative overflow-hidden bg-[#06122e] px-5 py-24 text-white sm:px-8 lg:px-12 lg:py-32">
    <div class="pointer-events-none absolute inset-0">
      <div class="absolute -left-44 top-10 h-96 w-96 rounded-full bg-blue-500/10 blur-3xl"></div>
      <div class="absolute -right-44 bottom-0 h-96 w-96 rounded-full bg-orange-500/10 blur-3xl"></div>
    </div>

    <div class="relative mx-auto max-w-[1320px]">
      <div class="max-w-[850px]">
        <p class="text-xs font-bold uppercase tracking-[0.18em] text-[#ff9a42]">Benefícios para a rede</p>
        <h2 class="mt-4 text-4xl font-bold leading-tight tracking-[-0.04em] sm:text-5xl">
          Mais controle para a gestão. Mais clareza para a equipe. Mais oportunidades convertidas.
        </h2>
      </div>

      <div class="mt-14 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {#each benefits as item, index}
          <article class="rounded-3xl border border-white/10 bg-white/[0.055] p-6 backdrop-blur">
            <div class="flex items-start justify-between gap-3">
              <div class="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/10 text-[#ff9a42]">
                <svelte:component this={item.icon} size={22} />
              </div>
              <span class="text-xs font-bold text-white/25">0{index + 1}</span>
            </div>
            <h3 class="mt-6 text-lg font-bold">{item.title}</h3>
            <p class="mt-3 text-sm leading-6 text-white/55">{item.description}</p>
          </article>
        {/each}
      </div>
    </div>
  </section>

  <section class="bg-[#f4f7fc] px-5 py-24 sm:px-8 lg:px-12 lg:py-32">
    <div class="mx-auto max-w-[1320px]">
      <div class="grid gap-12 lg:grid-cols-[0.72fr_1.28fr] lg:gap-20">
        <div>
          <p class="text-xs font-bold uppercase tracking-[0.18em] text-[#ea6d0b]">Próximos passos</p>
          <h2 class="mt-4 text-4xl font-bold leading-tight tracking-[-0.04em] text-[#07163a] sm:text-5xl">
            Uma implantação organizada, acompanhada e progressiva.
          </h2>
          <p class="mt-6 text-lg leading-8 text-slate-600">
            A adoção será conduzida por etapas para que cada unidade compreenda o método, configure sua operação e inicie o uso com segurança.
          </p>
        </div>

        <div class="relative">
          <div class="absolute bottom-8 left-[27px] top-8 hidden w-px bg-slate-300 sm:block"></div>
          <div class="space-y-4">
            {#each implementationSteps as step}
              <article class="relative rounded-3xl border border-slate-200 bg-white p-6 shadow-[0_12px_35px_rgba(15,35,75,0.05)] sm:pl-24">
                <div class="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-[#07163a] text-sm font-extrabold text-[#ff9638] sm:absolute sm:left-0 sm:top-1/2 sm:mb-0 sm:-translate-x-1/2 sm:-translate-y-1/2">
                  {step.number}
                </div>
                <h3 class="text-xl font-bold tracking-[-0.02em] text-[#102b62]">{step.title}</h3>
                <p class="mt-2 text-sm leading-6 text-slate-600">{step.description}</p>
              </article>
            {/each}
          </div>
        </div>
      </div>
    </div>
  </section>

  <section class="bg-white px-5 py-24 sm:px-8 lg:px-12 lg:py-32">
    <div class="mx-auto max-w-[1180px] overflow-hidden rounded-[40px] bg-gradient-to-br from-[#07163a] via-[#0b2b64] to-[#123f87] px-7 py-14 text-center text-white shadow-[0_30px_80px_rgba(8,29,67,0.24)] sm:px-12 sm:py-20">
      <div class="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-white/10 text-[#ff9a42] ring-1 ring-white/10">
        <CheckCircle2 size={28} />
      </div>
      <p class="mt-7 text-sm font-bold uppercase tracking-[0.18em] text-[#ffad68]">Cebrac + F10</p>
      <h2 class="mx-auto mt-4 max-w-[900px] text-4xl font-bold leading-tight tracking-[-0.04em] sm:text-5xl">
        Método comercial, tecnologia integrada e uma operação preparada para crescer.
      </h2>
      <p class="mx-auto mt-6 max-w-[760px] text-base leading-7 text-white/65 sm:text-lg">
        O objetivo é simples: dar à rede mais organização, continuidade e inteligência para transformar oportunidades em matrículas.
      </p>
    </div>
  </section>
</div>

<style>
  .presentation-page {
    font-family: "Plus Jakarta Sans", ui-sans-serif, system-ui, sans-serif;
  }
</style>
