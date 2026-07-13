<script lang="ts">
  import {
    AlertTriangle,
    ArrowRight,
    BarChart3,
    BookOpen,
    CalendarCheck,
    CheckCircle2,
    CircleDot,
    Clock3,
    Database,
    Gauge,
    GraduationCap,
    History,
    Kanban,
    Layers,
    Megaphone,
    MessageCircle,
    PhoneCall,
    PieChart,
    Repeat2,
    Rocket,
    Send,
    Settings,
    ShieldCheck,
    Target,
    TrendingUp,
    UserCheck,
    Users,
    Workflow,
    XCircle,
  } from "lucide-svelte";

  const objectives = [
    {
      title: "Padronizar o método comercial",
      description:
        "Criar uma rotina clara para captação, contato, acompanhamento e conversão em todas as unidades.",
      icon: Workflow,
      tone: "bg-blue-50 text-blue-700",
    },
    {
      title: "Reduzir perdas invisíveis",
      description:
        "Evitar que leads já captados fiquem sem retorno, sem responsável ou sem próximo passo definido.",
      icon: Target,
      tone: "bg-orange-50 text-[#e96f0b]",
    },
    {
      title: "Preservar o conhecimento",
      description:
        "Manter histórico, negociações e objeções acessíveis mesmo quando houver mudanças na equipe.",
      icon: BookOpen,
      tone: "bg-emerald-50 text-emerald-700",
    },
    {
      title: "Dar escala à operação",
      description:
        "Permitir que a rede cresça mantendo controle, qualidade, produtividade e previsibilidade.",
      icon: TrendingUp,
      tone: "bg-violet-50 text-violet-700",
    },
  ];

  const challenges = [
    {
      number: "01",
      title: "Leads esquecidos",
      description:
        "Sem um processo visual, oportunidades podem ficar paradas entre uma tentativa de contato e outra.",
      icon: AlertTriangle,
      accent: "text-amber-600",
      iconBackground: "bg-amber-50",
    },
    {
      number: "02",
      title: "Falta de acompanhamento",
      description:
        "A operação depende da memória e da disciplina individual, dificultando a gestão do funil.",
      icon: PhoneCall,
      accent: "text-[#e96f0b]",
      iconBackground: "bg-orange-50",
    },
    {
      number: "03",
      title: "Perda de conhecimento",
      description:
        "Quando alguém sai da equipe, negociações, objeções e contexto podem desaparecer junto.",
      icon: Users,
      accent: "text-emerald-600",
      iconBackground: "bg-emerald-50",
    },
    {
      number: "04",
      title: "Pouca visibilidade dos dados",
      description:
        "Sem indicadores centralizados, comparar unidades, campanhas e vendedores se torna trabalhoso.",
      icon: BarChart3,
      accent: "text-blue-600",
      iconBackground: "bg-blue-50",
    },
  ];

  const crmFeatures = [
    "Funil visual em formato Kanban",
    "Follow-ups, tarefas e próximos passos",
    "Histórico completo por oportunidade",
    "Workflow comercial padronizado",
    "Indicadores de conversão e produtividade",
  ];

  const whatsappFeatures = [
    "Conversas centralizadas no sistema",
    "Histórico vinculado ao lead ou aluno",
    "Atendimento comercial e acadêmico",
    "Avisos, lembretes e mensagens organizadas",
    "Até 5 números por unidade, conforme implantação",
  ];

  const practicalFlow = [
    {
      number: "1",
      title: "Lead entra na unidade",
      description: "A oportunidade chega por campanha, indicação, site ou atendimento direto.",
      icon: Send,
    },
    {
      number: "2",
      title: "Atendimento é registrado",
      description: "O lead recebe responsável, etapa atual e histórico centralizado.",
      icon: Database,
    },
    {
      number: "3",
      title: "Follow-up é programado",
      description: "Tarefas e retornos passam a fazer parte de uma cadência organizada.",
      icon: CalendarCheck,
    },
    {
      number: "4",
      title: "WhatsApp apoia a comunicação",
      description: "As conversas ficam integradas ao contexto da oportunidade.",
      icon: MessageCircle,
    },
    {
      number: "5",
      title: "Matrícula e acompanhamento",
      description: "A gestão visualiza resultado, conversão e próximos passos da jornada.",
      icon: GraduationCap,
    },
  ];

  const impacts = [
    {
      title: "Mais controle do funil",
      description:
        "Cada lead passa a ter etapa, responsável, histórico e ação seguinte claramente definidos.",
      icon: Kanban,
      tone: "bg-orange-50 text-[#e96f0b]",
    },
    {
      title: "Mais disciplina comercial",
      description:
        "Cadências, tarefas e retornos programados ajudam a manter uma rotina consistente.",
      icon: Clock3,
      tone: "bg-blue-50 text-blue-700",
    },
    {
      title: "Preservação do conhecimento",
      description:
        "O relacionamento não fica preso ao celular ou à memória de uma única pessoa.",
      icon: History,
      tone: "bg-emerald-50 text-emerald-700",
    },
    {
      title: "Acompanhamento da equipe",
      description:
        "Gestores conseguem visualizar atividades, gargalos e necessidades de apoio.",
      icon: UserCheck,
      tone: "bg-violet-50 text-violet-700",
    },
    {
      title: "Menos retrabalho",
      description:
        "Informações centralizadas reduzem buscas manuais, duplicidade e perda de contexto.",
      icon: Repeat2,
      tone: "bg-amber-50 text-amber-700",
    },
    {
      title: "Decisão baseada em dados",
      description:
        "Indicadores ajudam a entender campanhas, cursos, equipes e etapas com maior conversão.",
      icon: PieChart,
      tone: "bg-cyan-50 text-cyan-700",
    },
  ];

  const beforeItems = [
    "Informações espalhadas entre planilhas, celulares e memória da equipe.",
    "Leads sem retorno quando a rotina muda ou o responsável se ausenta.",
    "Troca de colaborador interrompendo negociações em andamento.",
    "Gestão reativa, baseada em conferências e levantamentos manuais.",
  ];

  const afterItems = [
    "Histórico centralizado e acessível para os responsáveis da unidade.",
    "Cada oportunidade com etapa, responsável e próximo passo definido.",
    "Continuidade das negociações mesmo quando houver mudança na equipe.",
    "Indicadores atualizados para orientar decisões e prioridades comerciais.",
  ];

  const implementationSteps = [
    {
      label: "1",
      title: "Comunicação oficial",
      description:
        "Apresentação da evolução, dos objetivos do projeto e do que muda para cada unidade.",
      icon: Megaphone,
    },
    {
      label: "2",
      title: "Responsável da unidade",
      description:
        "Definição do ponto de contato que acompanhará configuração, treinamento e início da operação.",
      icon: UserCheck,
    },
    {
      label: "3",
      title: "Configuração inicial",
      description:
        "Parametrização de usuários, funil, regras comerciais e números de WhatsApp.",
      icon: Settings,
    },
    {
      label: "4",
      title: "Treinamento",
      description:
        "Capacitação das equipes para uso do sistema e aplicação da rotina comercial.",
      icon: GraduationCap,
    },
    {
      label: "5",
      title: "Operação assistida",
      description:
        "Acompanhamento inicial para apoiar a adesão, resolver dúvidas e estabilizar os processos.",
      icon: Rocket,
    },
  ];

  const visualMaterials = [
    {
      title: "Print do CRM em uso",
      dimensions: "1400 × 900 px",
      description: "Preferência por uma tela real com funil, etapas e oportunidades.",
    },
    {
      title: "Print do WhatsApp integrado",
      dimensions: "1200 × 900 px",
      description: "Exemplo de conversa vinculada ao histórico de um contato.",
    },
    {
      title: "Comparativo sem CRM × com CRM",
      dimensions: "1400 × 900 px",
      description: "Peça visual resumindo continuidade, produtividade e controle.",
    },
    {
      title: "Linha do tempo da implantação",
      dimensions: "1400 × 700 px",
      description: "Imagem complementar com fases, responsáveis e marcos do projeto.",
    },
  ];
</script>

<svelte:head>
  <title>Cebrac + F10 | Apresentação da evolução comercial</title>
  <meta
    name="description"
    content="Apresentação interna sobre a implantação do CRM de Leads e do WhatsApp integrado ao F10 para as unidades Cebrac."
  />
  <meta
    name="robots"
    content="noindex, nofollow, noarchive, nosnippet, noimageindex"
  />
  <meta
    name="googlebot"
    content="noindex, nofollow, noarchive, nosnippet, noimageindex"
  />
  <meta name="bingbot" content="noindex, nofollow, noarchive, nosnippet" />
</svelte:head>

<div class="min-h-screen overflow-hidden bg-white text-[#071735]">
  <header class="border-b border-slate-200/80 bg-white">
    <div
      class="mx-auto flex max-w-[1180px] flex-col gap-5 px-5 py-5 sm:px-8 md:flex-row md:items-center md:justify-between lg:px-10"
    >
      <div class="flex items-center gap-4 sm:gap-6">
        <img src="/logo_f10.svg" alt="F10 Software" class="h-9 w-auto sm:h-11" />
        <span class="h-10 w-px bg-slate-200"></span>
        <img
          src="/cebrac-logo.svg"
          alt="Cebrac"
          class="h-12 w-auto object-contain sm:h-14"
        />
      </div>

      <div class="flex items-center gap-3 md:justify-end">
        <span
          class="rounded-full border border-blue-200 bg-blue-50 px-3 py-1.5 text-[11px] font-extrabold uppercase tracking-[0.14em] text-blue-700"
        >
          Implantação CRM + WhatsApp
        </span>
        <div class="hidden text-right sm:block">
          <p class="text-[11px] font-extrabold uppercase tracking-[0.16em] text-[#e96f0b]">
            Apresentação interna
          </p>
          <p class="mt-1 text-xs text-slate-500">Julho de 2026</p>
        </div>
      </div>
    </div>
  </header>

  <main>
    <section class="relative border-b border-slate-200 bg-[#f7f8fc]">
      <div
        class="pointer-events-none absolute inset-x-0 top-0 h-96 bg-[radial-gradient(circle_at_16%_12%,rgba(233,111,11,0.12),transparent_34%),radial-gradient(circle_at_84%_8%,rgba(37,99,235,0.11),transparent_32%)]"
      ></div>

      <div
        class="relative mx-auto grid max-w-[1180px] items-center gap-12 px-5 py-16 sm:px-8 sm:py-20 lg:grid-cols-[0.92fr_1.08fr] lg:px-10 lg:py-24"
      >
        <div>
          <div
            class="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-bold uppercase tracking-[0.12em] text-slate-600 shadow-sm"
          >
            <ShieldCheck size={16} strokeWidth={2} />
            Comunicado para a rede Cebrac
          </div>

          <h1
            class="mt-7 max-w-[660px] text-4xl font-black leading-[1.06] tracking-[-0.04em] text-[#071735] sm:text-5xl lg:text-[62px]"
          >
            Uma nova etapa na
            <span class="text-[#e96f0b]">gestão comercial</span>
            da rede
          </h1>

          <p class="mt-7 max-w-[620px] text-lg leading-8 text-slate-600 sm:text-xl">
            CRM de Leads e WhatsApp integrado ao F10 para trazer mais organização,
            continuidade, produtividade e matrículas para todas as unidades.
          </p>

          <div class="mt-8 flex flex-wrap gap-3">
            {#each ["Mais organização", "Mais produtividade", "Mais matrículas", "Mais previsibilidade"] as benefit}
              <span
                class="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm"
              >
                {benefit}
              </span>
            {/each}
          </div>
        </div>

        <div
          class="relative flex aspect-[14/9] min-h-[330px] items-center justify-center overflow-hidden rounded-[32px] border border-slate-300 bg-slate-200 p-8 shadow-[0_30px_70px_-38px_rgba(7,23,53,0.45)]"
        >
          <div class="absolute inset-0 bg-[linear-gradient(135deg,rgba(255,255,255,0.4),transparent_60%)]"></div>
          <div class="relative text-center text-slate-500">
            <Layers class="mx-auto h-12 w-12" strokeWidth={1.5} />
            <p class="mt-4 text-base font-bold text-slate-600">
              Imagem principal: CRM no notebook + WhatsApp no celular
            </p>
            <p class="mt-2 text-sm">Tamanho recomendado: 1400 × 900 px</p>
            <p class="mt-1 text-xs">Proporção 14:9 • fundo transparente ou claro</p>
          </div>
        </div>
      </div>
    </section>

    <section class="mx-auto max-w-[1180px] px-5 py-16 sm:px-8 sm:py-20 lg:px-10">
      <div class="grid gap-10 lg:grid-cols-[0.72fr_1.28fr] lg:items-start">
        <div>
          <div class="flex items-center gap-3">
            <span
              class="flex h-9 w-9 items-center justify-center rounded-full bg-[#071735] text-sm font-black text-white"
              >01</span
            >
            <p class="text-sm font-extrabold uppercase tracking-[0.18em] text-[#e96f0b]">
              Objetivo da implantação
            </p>
          </div>
          <h2 class="mt-5 text-3xl font-black tracking-[-0.03em] sm:text-4xl">
            Tecnologia para sustentar um método comercial comum à rede
          </h2>
          <p class="mt-5 text-lg leading-8 text-slate-600">
            Esta apresentação explica por que a evolução está sendo realizada, o que será
            implantado e como a nova rotina ajudará as unidades a aproveitar melhor cada
            oportunidade comercial.
          </p>
        </div>

        <div class="grid gap-4 sm:grid-cols-2">
          {#each objectives as item}
            <article
              class="rounded-[24px] border border-slate-200 bg-white p-6 shadow-[0_16px_44px_-34px_rgba(7,23,53,0.5)]"
            >
              <div class={`flex h-12 w-12 items-center justify-center rounded-2xl ${item.tone}`}>
                <svelte:component this={item.icon} size={24} strokeWidth={1.9} />
              </div>
              <h3 class="mt-5 text-lg font-extrabold">{item.title}</h3>
              <p class="mt-3 text-sm leading-6 text-slate-600">{item.description}</p>
            </article>
          {/each}
        </div>
      </div>
    </section>

    <section class="border-y border-slate-200 bg-[#f7f8fc]">
      <div class="mx-auto max-w-[1180px] px-5 py-16 sm:px-8 sm:py-20 lg:px-10">
        <div class="mx-auto max-w-[800px] text-center">
          <div class="flex items-center justify-center gap-3">
            <span
              class="flex h-9 w-9 items-center justify-center rounded-full bg-[#071735] text-sm font-black text-white"
              >02</span
            >
            <p class="text-sm font-extrabold uppercase tracking-[0.18em] text-[#e96f0b]">
              Ponto de partida
            </p>
          </div>
          <h2 class="mt-5 text-3xl font-black tracking-[-0.03em] sm:text-4xl">
            Quais desafios essa evolução resolve?
          </h2>
          <p class="mt-5 text-lg leading-8 text-slate-600">
            O objetivo não é apenas adicionar uma nova ferramenta, mas reduzir situações que
            hoje geram desperdício, descontinuidade e perda de oportunidades.
          </p>
        </div>

        <div class="mt-12 grid gap-5 md:grid-cols-2">
          {#each challenges as item}
            <article
              class="group grid gap-5 rounded-[26px] border border-slate-200 bg-white p-6 shadow-[0_18px_46px_-36px_rgba(7,23,53,0.5)] sm:grid-cols-[auto_1fr] sm:p-7"
            >
              <div class={`flex h-14 w-14 items-center justify-center rounded-2xl ${item.iconBackground} ${item.accent}`}>
                <svelte:component this={item.icon} size={27} strokeWidth={1.8} />
              </div>
              <div>
                <p class={`text-xs font-black tracking-[0.18em] ${item.accent}`}>{item.number}</p>
                <h3 class="mt-2 text-xl font-black">{item.title}</h3>
                <p class="mt-3 leading-7 text-slate-600">{item.description}</p>
              </div>
            </article>
          {/each}
        </div>
      </div>
    </section>

    <section class="bg-[#071735] text-white">
      <div class="mx-auto max-w-[1180px] px-5 py-16 sm:px-8 sm:py-20 lg:px-10">
        <div class="mx-auto max-w-[820px] text-center">
          <div class="flex items-center justify-center gap-3">
            <span
              class="flex h-9 w-9 items-center justify-center rounded-full bg-white text-sm font-black text-[#071735]"
              >03</span
            >
            <p class="text-sm font-extrabold uppercase tracking-[0.18em] text-orange-300">
              Solução integrada
            </p>
          </div>
          <h2 class="mt-5 text-3xl font-black tracking-[-0.03em] sm:text-4xl">
            O que está sendo implantado?
          </h2>
          <p class="mt-5 text-lg leading-8 text-slate-300">
            Duas frentes conectadas: organização do processo comercial e centralização da
            comunicação com leads e alunos.
          </p>
        </div>

        <div class="mt-12 grid gap-6 lg:grid-cols-2">
          <article
            class="overflow-hidden rounded-[30px] border border-white/10 bg-white/[0.06] p-6 backdrop-blur sm:p-8"
          >
            <div class="flex items-start justify-between gap-5">
              <div>
                <div class="flex h-14 w-14 items-center justify-center rounded-2xl bg-orange-500/15 text-orange-300">
                  <Kanban size={28} strokeWidth={1.8} />
                </div>
                <p class="mt-6 text-xs font-black uppercase tracking-[0.18em] text-orange-300">
                  Frente 1
                </p>
                <h3 class="mt-2 text-3xl font-black">CRM de Leads</h3>
              </div>
              <span class="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-bold text-slate-300">
                Gestão comercial
              </span>
            </div>

            <p class="mt-5 leading-7 text-slate-300">
              Estrutura o funil, registra atividades e cria uma visão única das oportunidades
              comerciais da unidade.
            </p>

            <ul class="mt-7 space-y-3">
              {#each crmFeatures as feature}
                <li class="flex items-start gap-3 text-sm leading-6 text-slate-200">
                  <CheckCircle2 class="mt-0.5 h-5 w-5 shrink-0 text-orange-300" strokeWidth={2} />
                  <span>{feature}</span>
                </li>
              {/each}
            </ul>

            <div
              class="mt-8 flex aspect-[14/9] items-center justify-center rounded-[22px] border border-dashed border-white/20 bg-white/10 p-6 text-center"
            >
              <div>
                <Layers class="mx-auto h-9 w-9 text-slate-400" strokeWidth={1.5} />
                <p class="mt-3 font-bold text-white">Tela do CRM</p>
                <p class="mt-1 text-sm text-slate-400">Tamanho recomendado: 1400 × 900 px</p>
              </div>
            </div>
          </article>

          <article
            class="overflow-hidden rounded-[30px] border border-white/10 bg-white/[0.06] p-6 backdrop-blur sm:p-8"
          >
            <div class="flex items-start justify-between gap-5">
              <div>
                <div class="flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-400/15 text-emerald-300">
                  <MessageCircle size={28} strokeWidth={1.8} />
                </div>
                <p class="mt-6 text-xs font-black uppercase tracking-[0.18em] text-emerald-300">
                  Frente 2
                </p>
                <h3 class="mt-2 text-3xl font-black">WhatsApp integrado</h3>
              </div>
              <span class="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-bold text-slate-300">
                Comunicação
              </span>
            </div>

            <p class="mt-5 leading-7 text-slate-300">
              Mantém as conversas conectadas ao contexto do atendimento e reduz a dependência
              de históricos isolados em aparelhos.
            </p>

            <ul class="mt-7 space-y-3">
              {#each whatsappFeatures as feature}
                <li class="flex items-start gap-3 text-sm leading-6 text-slate-200">
                  <CheckCircle2 class="mt-0.5 h-5 w-5 shrink-0 text-emerald-300" strokeWidth={2} />
                  <span>{feature}</span>
                </li>
              {/each}
            </ul>

            <div
              class="mt-8 flex aspect-[4/3] items-center justify-center rounded-[22px] border border-dashed border-white/20 bg-white/10 p-6 text-center"
            >
              <div>
                <MessageCircle class="mx-auto h-9 w-9 text-slate-400" strokeWidth={1.5} />
                <p class="mt-3 font-bold text-white">Tela do WhatsApp integrado</p>
                <p class="mt-1 text-sm text-slate-400">Tamanho recomendado: 1200 × 900 px</p>
              </div>
            </div>
          </article>
        </div>
      </div>
    </section>

    <section class="mx-auto max-w-[1180px] px-5 py-16 sm:px-8 sm:py-20 lg:px-10">
      <div class="mx-auto max-w-[820px] text-center">
        <div class="flex items-center justify-center gap-3">
          <span
            class="flex h-9 w-9 items-center justify-center rounded-full bg-[#071735] text-sm font-black text-white"
            >04</span
          >
          <p class="text-sm font-extrabold uppercase tracking-[0.18em] text-[#e96f0b]">
            Rotina operacional
          </p>
        </div>
        <h2 class="mt-5 text-3xl font-black tracking-[-0.03em] sm:text-4xl">
          Como isso funciona na prática?
        </h2>
        <p class="mt-5 text-lg leading-8 text-slate-600">
          O sistema acompanha a jornada desde a entrada do lead até a matrícula, mantendo
          responsáveis, atividades e comunicação em um único fluxo.
        </p>
      </div>

      <div class="mt-14 grid gap-4 lg:grid-cols-5">
        {#each practicalFlow as item, index}
          <article class="relative rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm">
            {#if index < practicalFlow.length - 1}
              <ArrowRight
                class="absolute -right-5 top-8 z-10 hidden h-6 w-6 text-slate-300 lg:block"
                strokeWidth={1.8}
              />
            {/if}
            <div class="flex items-center justify-between gap-3">
              <span
                class="flex h-10 w-10 items-center justify-center rounded-full bg-[#071735] text-sm font-black text-white"
              >
                {item.number}
              </span>
              <svelte:component this={item.icon} size={23} class="text-[#e96f0b]" strokeWidth={1.8} />
            </div>
            <h3 class="mt-5 text-base font-black leading-6">{item.title}</h3>
            <p class="mt-3 text-sm leading-6 text-slate-600">{item.description}</p>
          </article>
        {/each}
      </div>

      <div class="mt-10 grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
        <div
          class="flex aspect-[14/9] items-center justify-center rounded-[28px] border border-dashed border-slate-300 bg-slate-100 p-8 text-center"
        >
          <div class="text-slate-500">
            <Workflow class="mx-auto h-11 w-11" strokeWidth={1.5} />
            <p class="mt-4 font-bold text-slate-700">Fluxo comercial ilustrado</p>
            <p class="mt-2 text-sm">Tamanho recomendado: 1400 × 900 px</p>
          </div>
        </div>
        <div
          class="flex aspect-[3/2] items-center justify-center rounded-[28px] border border-dashed border-slate-300 bg-slate-100 p-8 text-center lg:aspect-auto"
        >
          <div class="text-slate-500">
            <MessageCircle class="mx-auto h-11 w-11" strokeWidth={1.5} />
            <p class="mt-4 font-bold text-slate-700">Exemplo de jornada no WhatsApp</p>
            <p class="mt-2 text-sm">Tamanho recomendado: 1200 × 800 px</p>
          </div>
        </div>
      </div>
    </section>

    <section class="border-y border-slate-200 bg-[#f7f8fc]">
      <div class="mx-auto max-w-[1180px] px-5 py-16 sm:px-8 sm:py-20 lg:px-10">
        <div class="grid gap-10 lg:grid-cols-[0.7fr_1.3fr] lg:items-start">
          <div>
            <div class="flex items-center gap-3">
              <span
                class="flex h-9 w-9 items-center justify-center rounded-full bg-[#071735] text-sm font-black text-white"
                >05</span
              >
              <p class="text-sm font-extrabold uppercase tracking-[0.18em] text-[#e96f0b]">
                Impactos esperados
              </p>
            </div>
            <h2 class="mt-5 text-3xl font-black tracking-[-0.03em] sm:text-4xl">
              O que muda para a unidade?
            </h2>
            <p class="mt-5 text-lg leading-8 text-slate-600">
              A principal mudança está na rotina: menos dependência de controles paralelos e
              mais clareza sobre o que precisa ser feito em cada oportunidade.
            </p>
            <div
              class="mt-8 rounded-[24px] border border-blue-100 bg-blue-50 p-6 text-sm leading-7 text-blue-900"
            >
              <div class="flex items-start gap-3">
                <Gauge class="mt-0.5 h-5 w-5 shrink-0" strokeWidth={1.9} />
                <p>
                  O CRM não substitui o trabalho comercial. Ele organiza o método, registra o
                  histórico e dá visibilidade para que a equipe atue com mais consistência.
                </p>
              </div>
            </div>
          </div>

          <div class="grid gap-4 sm:grid-cols-2">
            {#each impacts as item}
              <article
                class="rounded-[24px] border border-slate-200 bg-white p-6 shadow-[0_16px_44px_-34px_rgba(7,23,53,0.5)]"
              >
                <div class={`flex h-12 w-12 items-center justify-center rounded-2xl ${item.tone}`}>
                  <svelte:component this={item.icon} size={24} strokeWidth={1.9} />
                </div>
                <h3 class="mt-5 text-lg font-extrabold">{item.title}</h3>
                <p class="mt-3 text-sm leading-6 text-slate-600">{item.description}</p>
              </article>
            {/each}
          </div>
        </div>
      </div>
    </section>

    <section class="mx-auto max-w-[1180px] px-5 py-16 sm:px-8 sm:py-20 lg:px-10">
      <div class="mx-auto max-w-[820px] text-center">
        <div class="flex items-center justify-center gap-3">
          <span
            class="flex h-9 w-9 items-center justify-center rounded-full bg-[#071735] text-sm font-black text-white"
            >06</span
          >
          <p class="text-sm font-extrabold uppercase tracking-[0.18em] text-[#e96f0b]">
            Visão comparativa
          </p>
        </div>
        <h2 class="mt-5 text-3xl font-black tracking-[-0.03em] sm:text-4xl">
          Antes e depois da implantação
        </h2>
        <p class="mt-5 text-lg leading-8 text-slate-600">
          A mudança central é sair de uma operação dependente de controles individuais para um
          processo compartilhado, rastreável e orientado por dados.
        </p>
      </div>

      <div class="mt-12 grid gap-6 lg:grid-cols-2">
        <article class="rounded-[30px] border border-orange-200 bg-orange-50/60 p-6 sm:p-8">
          <div class="flex items-center gap-4">
            <div class="flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-orange-600 shadow-sm">
              <XCircle size={25} strokeWidth={1.9} />
            </div>
            <div>
              <p class="text-xs font-black uppercase tracking-[0.16em] text-orange-600">
                Cenário anterior
              </p>
              <h3 class="mt-1 text-2xl font-black">Antes</h3>
            </div>
          </div>
          <ul class="mt-7 space-y-4">
            {#each beforeItems as item}
              <li class="flex items-start gap-3 leading-7 text-slate-700">
                <CircleDot class="mt-1 h-5 w-5 shrink-0 text-orange-500" strokeWidth={1.9} />
                <span>{item}</span>
              </li>
            {/each}
          </ul>
        </article>

        <article class="rounded-[30px] border border-emerald-200 bg-emerald-50/60 p-6 sm:p-8">
          <div class="flex items-center gap-4">
            <div class="flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-emerald-600 shadow-sm">
              <CheckCircle2 size={25} strokeWidth={1.9} />
            </div>
            <div>
              <p class="text-xs font-black uppercase tracking-[0.16em] text-emerald-700">
                Novo cenário
              </p>
              <h3 class="mt-1 text-2xl font-black">Depois</h3>
            </div>
          </div>
          <ul class="mt-7 space-y-4">
            {#each afterItems as item}
              <li class="flex items-start gap-3 leading-7 text-slate-700">
                <CheckCircle2 class="mt-1 h-5 w-5 shrink-0 text-emerald-600" strokeWidth={1.9} />
                <span>{item}</span>
              </li>
            {/each}
          </ul>
        </article>
      </div>

      <div
        class="mt-8 flex aspect-[2/1] min-h-[300px] items-center justify-center rounded-[28px] border border-dashed border-slate-300 bg-slate-100 p-8 text-center sm:aspect-[14/7]"
      >
        <div class="text-slate-500">
          <Layers class="mx-auto h-11 w-11" strokeWidth={1.5} />
          <p class="mt-4 font-bold text-slate-700">Comparativo visual / quadro explicativo</p>
          <p class="mt-2 text-sm">Tamanho recomendado: 1400 × 700 px</p>
        </div>
      </div>
    </section>

    <section class="border-y border-slate-200 bg-[#f7f8fc]">
      <div class="mx-auto max-w-[1180px] px-5 py-16 sm:px-8 sm:py-20 lg:px-10">
        <div class="mx-auto max-w-[820px] text-center">
          <div class="flex items-center justify-center gap-3">
            <span
              class="flex h-9 w-9 items-center justify-center rounded-full bg-[#071735] text-sm font-black text-white"
              >07</span
            >
            <p class="text-sm font-extrabold uppercase tracking-[0.18em] text-[#e96f0b]">
              Implantação
            </p>
          </div>
          <h2 class="mt-5 text-3xl font-black tracking-[-0.03em] sm:text-4xl">
            Etapas previstas para colocar a operação em funcionamento
          </h2>
          <p class="mt-5 text-lg leading-8 text-slate-600">
            A adoção será conduzida em fases para alinhar responsáveis, preparar o ambiente e
            apoiar as equipes no início da nova rotina.
          </p>
        </div>

        <div class="mt-14 grid gap-5 lg:grid-cols-5">
          {#each implementationSteps as item, index}
            <article class="relative rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm">
              {#if index < implementationSteps.length - 1}
                <ArrowRight
                  class="absolute -right-5 top-8 z-10 hidden h-6 w-6 text-slate-300 lg:block"
                  strokeWidth={1.8}
                />
              {/if}
              <div class="flex items-center justify-between gap-3">
                <span
                  class="flex h-10 w-10 items-center justify-center rounded-full bg-[#e96f0b] text-sm font-black text-white"
                >
                  {item.label}
                </span>
                <svelte:component this={item.icon} size={23} class="text-[#071735]" strokeWidth={1.8} />
              </div>
              <h3 class="mt-5 text-base font-black leading-6">{item.title}</h3>
              <p class="mt-3 text-sm leading-6 text-slate-600">{item.description}</p>
            </article>
          {/each}
        </div>

        <div
          class="mt-10 rounded-[26px] border border-blue-100 bg-blue-50 px-6 py-5 text-sm leading-7 text-blue-900 sm:px-8"
        >
          <div class="flex items-start gap-3">
            <ShieldCheck class="mt-0.5 h-5 w-5 shrink-0" strokeWidth={1.9} />
            <p>
              Esta página funciona como material de apoio à implantação. Novas imagens, exemplos
              de tela e orientações operacionais poderão ser incorporados conforme o projeto avançar.
            </p>
          </div>
        </div>
      </div>
    </section>

    <section class="mx-auto max-w-[1180px] px-5 py-16 sm:px-8 sm:py-20 lg:px-10">
      <div class="grid gap-10 lg:grid-cols-[0.72fr_1.28fr] lg:items-start">
        <div>
          <div class="flex items-center gap-3">
            <span
              class="flex h-9 w-9 items-center justify-center rounded-full bg-[#071735] text-sm font-black text-white"
              >08</span
            >
            <p class="text-sm font-extrabold uppercase tracking-[0.18em] text-[#e96f0b]">
              Material complementar
            </p>
          </div>
          <h2 class="mt-5 text-3xl font-black tracking-[-0.03em] sm:text-4xl">
            Imagens previstas para enriquecer a apresentação
          </h2>
          <p class="mt-5 text-lg leading-8 text-slate-600">
            Os quadros ao lado indicam os materiais visuais mais úteis para demonstrar a solução
            de forma prática às unidades.
          </p>
        </div>

        <div class="grid gap-5 sm:grid-cols-2">
          {#each visualMaterials as material}
            <article
              class="flex min-h-[250px] flex-col items-center justify-center rounded-[26px] border border-dashed border-slate-300 bg-slate-100 p-7 text-center"
            >
              <Layers class="h-10 w-10 text-slate-400" strokeWidth={1.5} />
              <h3 class="mt-4 text-lg font-black text-slate-700">{material.title}</h3>
              <p class="mt-2 text-sm font-bold text-[#e96f0b]">{material.dimensions}</p>
              <p class="mt-3 max-w-[280px] text-sm leading-6 text-slate-500">
                {material.description}
              </p>
            </article>
          {/each}
        </div>
      </div>
    </section>
  </main>

  <footer class="bg-[#071735] text-white">
    <div
      class="mx-auto flex max-w-[1180px] flex-col gap-5 px-5 py-8 sm:px-8 md:flex-row md:items-center md:justify-between lg:px-10"
    >
      <div class="flex items-center gap-5">
        <img src="/logo_f10.svg" alt="F10 Software" class="h-8 w-auto brightness-0 invert" />
        <span class="h-8 w-px bg-white/20"></span>
        <img
          src="/cebrac-logo-white.svg"
          alt="Cebrac"
          class="h-8 w-auto object-contain"
        />
      </div>
      <p class="text-xs leading-5 text-slate-400 md:text-right">
        Material interno de apoio à implantação<br />CRM de Leads + WhatsApp integrado
      </p>
    </div>
  </footer>
</div>
