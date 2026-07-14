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
    Phone,
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

  type ContentItem = {
    title: string;
    description: string;
    icon: IconComponent;
  };

  type KanbanCard = {
    name: string;
    source: string;
    status: string;
    time: string;
  };

  type KanbanColumn = {
    title: string;
    total: number;
    color: string;
    cards: KanbanCard[];
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

  const painPoints: ContentItem[] = [
    {
      title: "Leads sem continuidade",
      description:
        "Oportunidades deixam de avançar quando não existe uma rotina de acompanhamento, prazo e responsável claramente definidos.",
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
        "Sem uma visão centralizada do funil, fica mais difícil entender conversão, produtividade, gargalos e oportunidades.",
      icon: BarChart3,
    },
    {
      title: "Processos diferentes por unidade",
      description:
        "A ausência de um método comum gera variações na abordagem comercial e reduz a previsibilidade dos resultados da rede.",
      icon: Workflow,
    },
  ];

  const crmHighlights: ContentItem[] = [
    {
      title: "Funil organizado em etapas",
      description: "Cada lead tem posição, responsável, histórico e próximo passo.",
      icon: Funnel,
    },
    {
      title: "Tarefas e acompanhamentos",
      description: "Lembretes e rotinas ajudam a reduzir oportunidades esquecidas.",
      icon: CalendarCheck2,
    },
    {
      title: "Gestão baseada em dados",
      description: "Indicadores apoiam decisões, treinamentos e melhorias do processo.",
      icon: TrendingUp,
    },
  ];

  const whatsappHighlights: ContentItem[] = [
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

  const benefits: ContentItem[] = [
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

  const kanbanColumns: KanbanColumn[] = [
    {
      title: "Novos cadastros",
      total: 18,
      color: "#ff7900",
      cards: [
        { name: "Francieli", source: "Faixa de Rua", status: "Novo lead", time: "11:04" },
        { name: "Sheila Monteiro", source: "Landing page", status: "WhatsApp", time: "13:04" },
        { name: "Massao", source: "Facebook", status: "Novo", time: "14:18" },
      ],
    },
    {
      title: "Sem resposta",
      total: 6,
      color: "#f7b500",
      cards: [
        { name: "Flaviana", source: "Faixa de Rua", status: "Retomar contato", time: "Hoje" },
        { name: "Andrieli", source: "WhatsApp", status: "Sem resposta", time: "12:26" },
        { name: "Leani Lima", source: "Indicação", status: "Ligação", time: "16:40" },
      ],
    },
    {
      title: "Interessado",
      total: 3,
      color: "#25a95b",
      cards: [
        { name: "Maria Luiza", source: "Relacionamento", status: "WhatsApp", time: "15:36" },
        { name: "Asd", source: "Facebook", status: "Ligação", time: "16:18" },
        { name: "Borges", source: "Faixa de Rua", status: "Retorno", time: "18:12" },
      ],
    },
    {
      title: "Visitas",
      total: 9,
      color: "#0b78e3",
      cards: [
        { name: "Beatriz Nagem", source: "Curso: ADM", status: "Visita confirmada", time: "16:29" },
        { name: "Maria das Graças", source: "Curso: ADM", status: "Agendado", time: "15:25" },
        { name: "Renata Santos", source: "Indicação", status: "Visita", time: "Amanhã" },
      ],
    },
    {
      title: "Contratos",
      total: 4,
      color: "#17a85b",
      cards: [
        { name: "Beatriz Pereira", source: "Curso: ADM", status: "Contrato", time: "16:58" },
        { name: "Carlos Henrique", source: "Curso: Inglês", status: "Documentos", time: "17:20" },
      ],
    },
  ];

  const chatMessages = [
    { text: "Olá! Gostaria de saber mais sobre o curso de Administração.", sent: true },
    { text: "Olá, Ana! Claro, vou te passar todas as informações.", sent: false },
    { text: "O curso tem duração de 2 anos e oferece estágio supervisionado.", sent: false },
    { text: "Posso te enviar a grade completa e os valores?", sent: false },
    { text: "Sim, por favor!", sent: true },
    { text: "Pronto! Segue o material em anexo.", sent: false },
    { text: "Perfeito! Vou analisar e retorno em breve.", sent: true },
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
</script>

<svelte:head>
  <title>Cebrac + F10 | CRM de Leads e WhatsApp integrado</title>
  <meta
    name="description"
    content="Apresentação institucional do CRM de Leads e WhatsApp integrado para a rede Cebrac."
  />
  <meta name="robots" content="noindex,nofollow,noarchive,nosnippet" />
</svelte:head>

<div class="presentation-page overflow-hidden bg-white text-[#06173e]">
  <section id="inicio" class="relative isolate min-h-[100svh] overflow-hidden bg-white">
    <div class="pointer-events-none absolute inset-0 -z-10">
      <div class="absolute -right-[18%] -top-[34%] h-[78rem] w-[78rem] rounded-full bg-[#edf3ff]"></div>
      <div class="absolute right-[4%] top-[7%] h-[43rem] w-[43rem] rounded-full border-[92px] border-[#dce7ff]/70"></div>
      <div class="absolute -bottom-16 -left-24 h-56 w-56 rounded-full border border-[#d9e5fb]"></div>
      <div class="absolute -bottom-24 -left-16 h-56 w-56 rounded-full border border-[#d9e5fb]"></div>
      <div class="absolute left-[36%] top-12 grid grid-cols-5 gap-3 opacity-70">
        {#each Array(25) as _}
          <span class="h-1.5 w-1.5 rounded-full bg-[#a8bee8]"></span>
        {/each}
      </div>
    </div>

    <div class="mx-auto grid min-h-[100svh] w-full max-w-[1660px] items-center gap-10 px-5 py-14 sm:px-8 lg:grid-cols-[0.82fr_1.18fr] lg:px-10 lg:py-10 xl:px-14">
      <div class="relative z-20 max-w-[690px] lg:py-12">
        <div class="inline-flex items-center rounded-xl border border-[#ffd3b3] bg-white/75 px-5 py-2.5 text-base font-extrabold tracking-[0.02em] text-[#ff7900] shadow-sm backdrop-blur">
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

      <div class="relative z-10 -mx-3 mt-2 min-h-[540px] self-end sm:-mx-5 sm:min-h-[650px] lg:-ml-20 lg:-mr-24 lg:mt-0 lg:min-h-[780px] xl:-ml-24 xl:-mr-28">
        <div class="absolute inset-x-[4%] top-[3%] h-[78%] rounded-[48%] bg-gradient-to-br from-[#f8fbff] via-[#e7efff] to-[#d8e5ff]"></div>
        <div class="absolute right-[4%] top-[12%] h-[68%] w-[68%] rounded-full bg-white/35"></div>

        <div class="absolute left-[1%] right-[6%] top-[13%]">
          <div class="relative rounded-[28px] border-[10px] border-[#101217] bg-[#101217] p-1 shadow-[0_34px_80px_rgba(11,28,68,0.28)] sm:border-[13px] lg:rounded-[34px]">
            <div class="overflow-hidden rounded-[16px] bg-[#f7f9fb] lg:rounded-[20px]">
              <div class="flex h-10 items-center border-b border-slate-200 bg-white px-3 sm:h-12 sm:px-4">
                <div class="flex items-center gap-2">
                  <div class="flex h-6 w-6 items-center justify-center rounded-md bg-[#07173e] text-[9px] font-extrabold text-[#ff7900] sm:h-7 sm:w-7 sm:text-[10px]">
                    F10
                  </div>
                  <span class="text-[8px] font-extrabold text-[#0a2c67] sm:text-[10px]">Minha Escola</span>
                </div>
                <div class="ml-auto flex items-center gap-2">
                  <span class="h-2 w-2 rounded-full bg-slate-300"></span>
                  <span class="h-2 w-2 rounded-full bg-slate-300"></span>
                  <span class="h-2 w-2 rounded-full bg-[#ff5a4f]"></span>
                </div>
              </div>

              <div class="flex min-h-[310px] sm:min-h-[390px] lg:min-h-[500px]">
                <aside class="hidden w-10 shrink-0 flex-col items-center gap-4 bg-[#07173e] py-4 text-white/75 sm:flex lg:w-12">
                  <span class="h-2.5 w-2.5 rounded-full bg-[#ff7900]"></span>
                  <span class="h-4 w-4 rounded border border-white/35"></span>
                  <span class="h-4 w-4 rounded border border-white/35"></span>
                  <span class="h-4 w-4 rounded border border-white/35"></span>
                  <span class="h-4 w-4 rounded border border-white/35"></span>
                </aside>

                <div class="min-w-0 flex-1 p-2 sm:p-3 lg:p-4">
                  <div class="mb-2 flex items-center gap-2 sm:mb-3">
                    <div class="rounded-md bg-emerald-50 px-2 py-1 text-[7px] font-extrabold text-emerald-700 sm:text-[9px]">
                      Funil: Prospecção Ativa
                    </div>
                    <div class="flex gap-1">
                      <span class="h-3 w-3 rounded-full bg-red-500 sm:h-4 sm:w-4"></span>
                      <span class="h-3 w-3 rounded-full bg-amber-400 sm:h-4 sm:w-4"></span>
                      <span class="h-3 w-3 rounded-full bg-blue-500 sm:h-4 sm:w-4"></span>
                    </div>
                    <div class="ml-auto h-5 w-[28%] rounded-full border border-slate-200 bg-white sm:h-6"></div>
                  </div>

                  <div class="grid grid-cols-5 gap-1 sm:gap-2">
                    {#each kanbanColumns as column}
                      <div class="min-w-0 rounded-lg bg-[#eef1f3] p-1 sm:rounded-xl sm:p-1.5">
                        <div class="mb-1.5 flex items-center justify-between gap-1 px-0.5">
                          <span class="truncate text-[5px] font-extrabold text-[#263650] sm:text-[7px] lg:text-[9px]">
                            {column.title}
                          </span>
                          <span class="text-[5px] font-bold text-slate-500 sm:text-[7px]">{column.total}</span>
                        </div>

                        <div class="space-y-1 sm:space-y-1.5">
                          {#each column.cards as card}
                            <article
                              class="rounded-md border-l-2 bg-white p-1 shadow-sm sm:rounded-lg sm:p-1.5 lg:p-2"
                              style:border-left-color={column.color}
                            >
                              <p class="truncate text-[5px] font-extrabold text-[#1f2937] sm:text-[7px] lg:text-[8px]">
                                {card.name}
                              </p>
                              <p class="mt-0.5 truncate text-[4px] text-slate-500 sm:text-[6px] lg:text-[7px]">
                                {card.source}
                              </p>
                              <p class="mt-1 truncate text-[4px] font-semibold text-emerald-700 sm:text-[6px]">
                                {card.status}
                              </p>
                              <p class="mt-0.5 text-[4px] text-slate-400 sm:text-[5px]">{card.time}</p>
                            </article>
                          {/each}
                        </div>
                      </div>
                    {/each}
                  </div>
                </div>
              </div>
            </div>

            <span class="absolute left-1/2 top-1 h-1.5 w-1.5 -translate-x-1/2 rounded-full bg-[#31343a] sm:h-2 sm:w-2"></span>
          </div>

          <div class="relative mx-auto h-7 w-[108%] -translate-x-[4%] rounded-b-[55%] bg-gradient-to-b from-[#d9dde2] to-[#9aa2ad] shadow-[0_15px_25px_rgba(14,30,60,0.2)] sm:h-10">
            <div class="absolute left-1/2 top-0 h-2 w-[18%] -translate-x-1/2 rounded-b-xl bg-[#aeb5bf] sm:h-3"></div>
          </div>
        </div>

        <div class="absolute bottom-[4%] right-[1%] w-[31%] min-w-[160px] max-w-[265px] rotate-[1deg] rounded-[30px] border-[8px] border-[#111318] bg-[#111318] p-1 shadow-[0_28px_55px_rgba(8,25,61,0.35)] sm:bottom-[3%] sm:border-[10px] lg:rounded-[38px]">
          <div class="overflow-hidden rounded-[22px] bg-[#efeae2] lg:rounded-[28px]">
            <div class="flex h-9 items-center bg-[#1f2c34] px-2 text-white sm:h-11 sm:px-3">
              <div class="flex h-5 w-5 items-center justify-center rounded-full bg-white text-[7px] font-extrabold text-[#0a2c67] sm:h-6 sm:w-6">
                F10
              </div>
              <div class="ml-2">
                <p class="text-[7px] font-bold sm:text-[9px]">F10 Escola</p>
                <p class="text-[5px] text-white/60 sm:text-[6px]">online</p>
              </div>
              <span class="ml-auto text-[12px] text-white/70">•••</span>
            </div>

            <div class="space-y-1.5 px-2 py-2 sm:px-3 sm:py-3">
              {#each chatMessages as message}
                <div class:ml-auto={message.sent} class="max-w-[88%]">
                  <p
                    class={`rounded-lg px-2 py-1.5 text-[6px] leading-[1.35] shadow-sm sm:text-[8px] ${
                      message.sent ? "bg-[#d9fdd3]" : "bg-white"
                    }`}
                  >
                    {message.text}
                  </p>
                </div>
              {/each}
            </div>

            <div class="m-2 flex h-7 items-center rounded-full bg-white px-2 text-[6px] text-slate-400 sm:h-8 sm:text-[7px]">
              Mensagem
              <span class="ml-auto flex h-5 w-5 items-center justify-center rounded-full bg-[#16a05d] text-white">●</span>
            </div>
          </div>
        </div>

        <div class="absolute bottom-[5%] right-[27%] flex h-16 w-16 items-center justify-center rounded-[18px] border border-slate-200 bg-white shadow-[0_16px_35px_rgba(8,36,75,0.18)] sm:h-20 sm:w-20 sm:rounded-[22px]">
          <span class="flex h-11 w-11 items-center justify-center rounded-full bg-[#18a45f] text-white sm:h-14 sm:w-14">
            <Phone size={27} fill="currentColor" strokeWidth={1.5} class="sm:hidden" />
            <Phone size={34} fill="currentColor" strokeWidth={1.5} class="hidden sm:block" />
          </span>
        </div>
      </div>
    </div>
  </section>

  <section class="relative bg-[#f5f8fd] px-5 py-24 sm:px-8 lg:px-12 lg:py-32">
    <div class="mx-auto max-w-[1320px]">
      <div class="grid gap-12 lg:grid-cols-[0.72fr_1.28fr] lg:gap-16">
        <div>
          <p class="text-xs font-extrabold uppercase tracking-[0.18em] text-[#ff7900]">Por que um CRM?</p>
          <h2 class="mt-4 text-4xl font-extrabold leading-tight tracking-[-0.04em] text-[#06173e] sm:text-5xl">
            O problema não é falta de lead. É perder oportunidades no caminho.
          </h2>
          <p class="mt-6 text-lg leading-8 text-slate-600">
            O CRM organiza o método comercial, registra o histórico e garante que cada oportunidade seja acompanhada até a matrícula.
          </p>
        </div>

        <div class="grid gap-4 sm:grid-cols-2">
          {#each painPoints as item}
            <article class="rounded-3xl border border-slate-200 bg-white p-7 shadow-[0_16px_45px_rgba(15,35,75,0.06)]">
              <div class="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#edf3ff] text-[#0a3478]">
                <svelte:component this={item.icon} size={24} strokeWidth={1.9} />
              </div>
              <h3 class="mt-5 text-xl font-extrabold tracking-[-0.02em] text-[#102b62]">{item.title}</h3>
              <p class="mt-3 text-sm leading-6 text-slate-600">{item.description}</p>
            </article>
          {/each}
        </div>
      </div>

      <div class="mt-16 rounded-[32px] bg-[#06173e] px-7 py-9 text-white sm:px-12 lg:flex lg:items-center lg:justify-between lg:gap-10">
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
      <div class="mx-auto max-w-[860px] text-center">
        <p class="text-xs font-extrabold uppercase tracking-[0.18em] text-[#ff7900]">O que muda na operação</p>
        <h2 class="mt-4 text-4xl font-extrabold leading-tight tracking-[-0.04em] text-[#06173e] sm:text-5xl">
          Um canal, duas frentes de atendimento.
        </h2>
        <p class="mt-6 text-lg leading-8 text-slate-600">
          O WhatsApp passa a fazer parte da jornada, desde o primeiro contato com o lead até o relacionamento com o aluno após a matrícula.
        </p>
      </div>

      <div class="mt-14 grid gap-6 lg:grid-cols-2">
        <article class="relative overflow-hidden rounded-[36px] bg-[#06173e] p-8 text-white sm:p-10 lg:p-12">
          <div class="absolute -right-24 -top-24 h-72 w-72 rounded-full border-[54px] border-blue-400/10"></div>
          <div class="relative">
            <div class="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/10 text-[#ff8d2a] ring-1 ring-white/10">
              <Funnel size={27} />
            </div>
            <p class="mt-8 text-sm font-extrabold uppercase tracking-[0.17em] text-[#ff9a42]">CRM de Leads</p>
            <h3 class="mt-3 text-3xl font-extrabold tracking-[-0.035em]">Da oportunidade à matrícula</h3>
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
                    <h4 class="text-sm font-extrabold">{item.title}</h4>
                    <p class="mt-1 text-sm leading-5 text-white/60">{item.description}</p>
                  </div>
                </div>
              {/each}
            </div>
          </div>
        </article>

        <article class="relative overflow-hidden rounded-[36px] border border-emerald-100 bg-[#f3fbf6] p-8 sm:p-10 lg:p-12">
          <div class="absolute -right-24 -top-24 h-72 w-72 rounded-full border-[54px] border-emerald-300/20"></div>
          <div class="relative">
            <div class="flex h-14 w-14 items-center justify-center rounded-2xl bg-white text-[#18a45f] shadow-sm ring-1 ring-emerald-100">
              <MessageCircleMore size={27} />
            </div>
            <p class="mt-8 text-sm font-extrabold uppercase tracking-[0.17em] text-[#169257]">WhatsApp integrado</p>
            <h3 class="mt-3 text-3xl font-extrabold tracking-[-0.035em] text-[#0d315f]">
              Do primeiro contato ao pós-matrícula
            </h3>
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
                    <h4 class="text-sm font-extrabold text-[#0d315f]">{item.title}</h4>
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

  <section class="relative overflow-hidden bg-[#05132f] px-5 py-24 text-white sm:px-8 lg:px-12 lg:py-32">
    <div class="pointer-events-none absolute inset-0">
      <div class="absolute -left-44 top-10 h-96 w-96 rounded-full bg-blue-500/10 blur-3xl"></div>
      <div class="absolute -right-44 bottom-0 h-96 w-96 rounded-full bg-orange-500/10 blur-3xl"></div>
    </div>

    <div class="relative mx-auto max-w-[1320px]">
      <div class="max-w-[880px]">
        <p class="text-xs font-extrabold uppercase tracking-[0.18em] text-[#ff9a42]">Benefícios para a rede</p>
        <h2 class="mt-4 text-4xl font-extrabold leading-tight tracking-[-0.04em] sm:text-5xl">
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
              <span class="text-xs font-extrabold text-white/25">0{index + 1}</span>
            </div>
            <h3 class="mt-6 text-lg font-extrabold">{item.title}</h3>
            <p class="mt-3 text-sm leading-6 text-white/55">{item.description}</p>
          </article>
        {/each}
      </div>
    </div>
  </section>

  <section class="bg-[#f5f8fd] px-5 py-24 sm:px-8 lg:px-12 lg:py-32">
    <div class="mx-auto max-w-[1320px]">
      <div class="grid gap-12 lg:grid-cols-[0.72fr_1.28fr] lg:gap-20">
        <div>
          <p class="text-xs font-extrabold uppercase tracking-[0.18em] text-[#ff7900]">Próximos passos</p>
          <h2 class="mt-4 text-4xl font-extrabold leading-tight tracking-[-0.04em] text-[#06173e] sm:text-5xl">
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

  <section class="bg-white px-5 py-24 sm:px-8 lg:px-12 lg:py-32">
    <div class="mx-auto max-w-[1180px] overflow-hidden rounded-[40px] bg-gradient-to-br from-[#06173e] via-[#0b2b64] to-[#123f87] px-7 py-14 text-center text-white shadow-[0_30px_80px_rgba(8,29,67,0.24)] sm:px-12 sm:py-20">
      <div class="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-white/10 text-[#ff9a42] ring-1 ring-white/10">
        <CheckCircle2 size={28} />
      </div>
      <p class="mt-7 text-sm font-extrabold uppercase tracking-[0.18em] text-[#ffad68]">Cebrac + F10</p>
      <h2 class="mx-auto mt-4 max-w-[900px] text-4xl font-extrabold leading-tight tracking-[-0.04em] sm:text-5xl">
        Método comercial, tecnologia integrada e uma operação preparada para crescer.
      </h2>
      <p class="mx-auto mt-6 max-w-[760px] text-base leading-7 text-white/65 sm:text-lg">
        O objetivo é simples: dar à rede mais organização, continuidade e inteligência para transformar oportunidades em matrículas.
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

  :global(html) {
    scroll-behavior: smooth;
  }
</style>
