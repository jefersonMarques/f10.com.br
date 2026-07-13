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
  <section class="relative isolate min-h-[100svh] overflow-hidden bg-white">
    <div class="pointer-events-none absolute inset-0 -z-10">
      <div class="absolute -right-[16rem] -top-[18rem] h-[48rem] w-[48rem] rounded-full bg-[#edf3ff]"></div>
      <div class="absolute -right-[9rem] -top-[11rem] h-[38rem] w-[38rem] rounded-full border-[72px] border-[#dce8ff]/80"></div>
      <div class="absolute bottom-[-20rem] left-[12%] h-[39rem] w-[39rem] rounded-full bg-[#f6f8fc]"></div>
      <div class="absolute right-[17%] top-5 grid grid-cols-6 gap-3 opacity-60">
        {#each Array(30) as _}
          <span class="h-1.5 w-1.5 rounded-full bg-[#9cb6e9]"></span>
        {/each}
      </div>
    </div>

    <div class="mx-auto flex min-h-[100svh] max-w-[1540px] items-center px-5 py-10 sm:px-8 lg:px-12 xl:px-16">
      <div class="grid w-full items-center gap-12 lg:grid-cols-[0.88fr_1.12fr] xl:gap-16">
        <div class="relative z-20 max-w-[690px]">
          <div class="mb-12 flex items-center gap-5 sm:gap-7">
            <div class="flex items-center gap-2.5" aria-label="Cebrac">
              <svg class="h-10 w-16 sm:h-12 sm:w-20" viewBox="0 0 76 44" aria-hidden="true">
                <path d="M4 22 24 4h27L31 22l20 18H24L4 22Z" fill="#21854a" />
                <path d="m31 22 20-18 21 18-21 18-20-18Z" fill="#f4bd20" />
                <circle cx="31" cy="22" r="10.5" fill="white" />
              </svg>
              <div class="leading-none">
                <div class="text-[26px] font-extrabold tracking-[-0.06em] text-[#0d3678] sm:text-[31px]">
                  cebrac
                </div>
                <div class="mt-1 text-[9px] font-semibold italic tracking-tight text-[#0d3678] sm:text-[10px]">
                  Você profissional.
                </div>
              </div>
            </div>

            <span class="h-14 w-px bg-slate-300"></span>

            <img src="/logo_f10.svg" alt="F10 Software" class="h-12 w-auto sm:h-14" />
          </div>

          <div class="mb-5 inline-flex items-center gap-2 rounded-full border border-orange-100 bg-orange-50 px-4 py-2 text-xs font-bold uppercase tracking-[0.13em] text-[#ea6d0b]">
            <span class="h-2 w-2 rounded-full bg-[#ea6d0b]"></span>
            Nova etapa
          </div>

          <h1 class="max-w-[660px] text-[42px] font-bold leading-[1.03] tracking-[-0.048em] text-[#07163a] sm:text-[56px] xl:text-[66px]">
            Uma nova etapa na
            <span class="text-[#ea6d0b]">gestão comercial</span>
            da rede Cebrac.
          </h1>

          <p class="mt-7 max-w-[650px] text-[20px] font-semibold leading-[1.45] tracking-[-0.02em] text-[#0c2d69] sm:text-[22px]">
            CRM de Leads + <span class="text-[#18a45f]">WhatsApp integrado</span> no F10:
            <span class="font-medium text-[#263c66]">mais organização, continuidade, produtividade, controle e matrículas.</span>
          </p>

          <p class="mt-7 max-w-[625px] text-base leading-7 text-slate-600 sm:text-lg">
            Esta iniciativa traz um método comercial estruturado, apoiado por tecnologia, para que nenhum lead se perca e a operação não dependa de uma única pessoa.
          </p>

          <div class="mt-10 grid gap-3 rounded-3xl border border-slate-200/80 bg-white/70 p-3 shadow-[0_24px_60px_rgba(15,35,75,0.10)] backdrop-blur sm:grid-cols-2 xl:grid-cols-4">
            {#each heroFeatures as feature}
              <article class="min-h-[175px] rounded-2xl border border-slate-200/80 bg-white p-5 sm:p-6">
                <div class={`flex h-11 w-11 items-center justify-center rounded-2xl ring-1 ${feature.iconClass}`}>
                  <svelte:component this={feature.icon} size={23} strokeWidth={2} />
                </div>
                <h2 class="mt-4 text-base font-bold leading-tight text-[#0b285f]">{feature.title}</h2>
                <p class="mt-2 text-sm leading-5 text-slate-500">{feature.description}</p>
              </article>
            {/each}
          </div>
        </div>

        <div class="relative min-h-[610px] lg:min-h-[700px]">
          <div class="absolute right-0 top-0 hidden h-44 w-64 items-end justify-end gap-4 lg:flex">
            {#each [36, 56, 78, 105] as height}
              <span class="w-9 rounded-t-md bg-gradient-to-t from-[#86a9e7] to-[#aac3ef]" style={`height:${height}px`}></span>
            {/each}
            <svg class="absolute -right-4 top-0 h-32 w-72" viewBox="0 0 288 128" fill="none" aria-hidden="true">
              <path d="M12 108C83 98 142 75 198 43c25-14 46-26 74-29" stroke="#f49a4e" stroke-width="7" stroke-linecap="round" />
              <path d="m255 8 22 4-12 19" stroke="#f49a4e" stroke-width="7" stroke-linecap="round" stroke-linejoin="round" />
            </svg>
          </div>

          <div class="absolute left-0 right-4 top-24 rounded-[30px] bg-[#0a1020] p-2.5 shadow-[0_40px_90px_rgba(9,24,58,0.30)] sm:right-14 lg:top-28">
            <div class="overflow-hidden rounded-[22px] bg-[#f7faff]">
              <div class="flex items-center justify-between border-b border-slate-200 bg-white px-4 py-3 sm:px-5">
                <div class="flex items-center gap-3">
                  <div class="flex h-8 w-8 items-center justify-center rounded-lg bg-[#07163a] text-[10px] font-extrabold text-[#ff8311]">
                    F10
                  </div>
                  <div>
                    <p class="text-[11px] font-bold text-[#132a5c] sm:text-xs">F10 CRM</p>
                    <p class="text-[8px] text-slate-400 sm:text-[9px]">Unidade Cebrac Centro</p>
                  </div>
                </div>
                <div class="flex items-center gap-2">
                  <span class="hidden rounded-lg border border-slate-200 px-3 py-1.5 text-[9px] font-semibold text-slate-500 sm:inline">Filtros</span>
                  <div class="h-7 w-7 rounded-full bg-gradient-to-br from-[#f3ad73] to-[#d17948]"></div>
                </div>
              </div>

              <div class="p-3.5 sm:p-5">
                <div class="mb-3 flex items-center justify-between">
                  <div>
                    <p class="text-[9px] font-medium uppercase tracking-[0.16em] text-slate-400">Gestão comercial</p>
                    <h3 class="mt-1 text-sm font-bold text-[#102b62] sm:text-base">Funil de matrículas</h3>
                  </div>
                  <span class="rounded-full bg-blue-50 px-3 py-1 text-[8px] font-bold text-blue-700 sm:text-[9px]">Este mês</span>
                </div>

                <div class="mb-4 grid grid-cols-4 gap-2">
                  {#each [
                    { label: "Leads totais", value: "1.248" },
                    { label: "Novos", value: "312" },
                    { label: "Conversões", value: "96" },
                    { label: "Taxa", value: "7,7%" },
                  ] as metric}
                    <div class="rounded-xl border border-slate-200 bg-white p-2.5 sm:p-3">
                      <p class="truncate text-[7px] font-semibold text-slate-400 sm:text-[8px]">{metric.label}</p>
                      <p class="mt-1 text-xs font-extrabold text-[#173c7a] sm:text-base">{metric.value}</p>
                    </div>
                  {/each}
                </div>

                <div class="grid grid-cols-5 gap-1.5 sm:gap-2">
                  {#each kanbanColumns as column}
                    <div class="min-w-0 rounded-xl bg-[#edf2f9] p-1.5 sm:p-2">
                      <div class="mb-2 flex items-center justify-between gap-1">
                        <div class="min-w-0">
                          <p class="truncate text-[6px] font-bold text-[#233a68] sm:text-[8px]">{column.title}</p>
                          <p class="mt-0.5 text-[5px] text-slate-400 sm:text-[7px]">{column.total} leads</p>
                        </div>
                        <span class={`h-1.5 w-1.5 shrink-0 rounded-full ${column.accentClass}`}></span>
                      </div>

                      <div class="space-y-1.5">
                        {#each column.cards as card}
                          <div class="rounded-lg border border-slate-200 bg-white p-1.5 shadow-sm sm:p-2">
                            <div class="flex items-start justify-between gap-1">
                              <p class="truncate text-[5.5px] font-bold text-[#1f3157] sm:text-[7px]">{card.name}</p>
                              {#if card.whatsapp}
                                <MessageCircleMore size={7} class="shrink-0 text-emerald-500 sm:h-2.5 sm:w-2.5" />
                              {/if}
                            </div>
                            <p class="mt-1 truncate text-[4.5px] text-slate-400 sm:text-[6px]">{card.course}</p>
                            <p class="mt-1 truncate text-[4px] text-slate-300 sm:text-[5px]">{card.time}</p>
                          </div>
                        {/each}
                      </div>
                    </div>
                  {/each}
                </div>

                <div class="mt-4 grid grid-cols-[1.15fr_0.85fr] gap-2 sm:gap-3">
                  <div class="rounded-xl border border-slate-200 bg-white p-3">
                    <div class="flex items-center justify-between">
                      <p class="text-[7px] font-bold text-[#243d6d] sm:text-[8px]">Leads por período</p>
                      <span class="text-[6px] text-slate-300">Últimos 30 dias</span>
                    </div>
                    <svg class="mt-2 h-12 w-full" viewBox="0 0 240 48" preserveAspectRatio="none" aria-hidden="true">
                      <defs>
                        <linearGradient id="areaGradient" x1="0" x2="0" y1="0" y2="1">
                          <stop offset="0%" stop-color="#6b9de8" stop-opacity="0.34" />
                          <stop offset="100%" stop-color="#6b9de8" stop-opacity="0" />
                        </linearGradient>
                      </defs>
                      <path d="M0 40 28 30 54 34 82 19 108 25 136 9 164 15 190 30 218 21 240 24V48H0Z" fill="url(#areaGradient)" />
                      <path d="M0 40 28 30 54 34 82 19 108 25 136 9 164 15 190 30 218 21 240 24" fill="none" stroke="#4e86d8" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" />
                    </svg>
                  </div>

                  <div class="rounded-xl border border-slate-200 bg-white p-3">
                    <p class="text-[7px] font-bold text-[#243d6d] sm:text-[8px]">Conversões</p>
                    <div class="mt-3 flex h-12 items-end gap-2">
                      {#each [42, 72, 55, 88, 100] as height}
                        <span class="flex-1 rounded-t-sm bg-gradient-to-t from-[#6a94d4] to-[#a7c1ed]" style={`height:${height}%`}></span>
                      {/each}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div class="absolute bottom-2 left-[7%] right-[15%] h-8 rounded-[50%] bg-slate-300/35 blur-xl"></div>
          <div class="absolute left-[5%] right-[9%] top-[80%] h-5 rounded-b-[70px] bg-gradient-to-b from-[#dbe0e8] to-[#aeb6c4] shadow-lg sm:top-[78%]"></div>

          <div class="absolute bottom-4 right-0 z-20 w-[238px] overflow-hidden rounded-[24px] border border-slate-200 bg-white shadow-[0_28px_70px_rgba(13,37,78,0.24)] sm:bottom-10 sm:w-[270px] lg:bottom-16 lg:w-[285px]">
            <div class="flex items-center gap-2 bg-[#19a963] px-4 py-3 text-white">
              <MessageCircleMore size={18} />
              <div>
                <p class="text-xs font-bold">WhatsApp</p>
                <p class="text-[8px] text-white/75">Atendimento integrado</p>
              </div>
            </div>

            <div class="bg-[#f2f6f3] p-3.5">
              <div class="flex items-center gap-2 border-b border-emerald-100 pb-3">
                <div class="h-8 w-8 rounded-full bg-gradient-to-br from-[#f0b88e] to-[#be7549]"></div>
                <div>
                  <p class="text-[10px] font-bold text-[#26354d]">Ana Beatriz Lima</p>
                  <p class="text-[8px] text-emerald-600">online</p>
                </div>
              </div>

              <div class="mt-3 space-y-2.5">
                <div class="ml-auto max-w-[85%] rounded-2xl rounded-br-md bg-[#d9fdd3] px-3 py-2 text-[9px] leading-4 text-[#334155] shadow-sm">
                  Olá! Gostaria de saber mais sobre o curso de Inglês Flex.
                </div>
                <div class="max-w-[88%] rounded-2xl rounded-bl-md bg-white px-3 py-2 text-[9px] leading-4 text-[#334155] shadow-sm">
                  Olá, Ana. Claro, vou enviar as informações e organizar o próximo contato.
                </div>
                <div class="max-w-[92%] rounded-2xl rounded-bl-md bg-white p-2.5 shadow-sm">
                  <div class="flex items-center gap-2">
                    <div class="flex h-10 w-10 items-center justify-center rounded-xl bg-[#102d68] text-[8px] font-bold text-white">ING</div>
                    <div>
                      <p class="text-[9px] font-bold text-[#26354d]">Inglês Flex — Cebrac</p>
                      <p class="mt-0.5 text-[7px] text-slate-400">Informações registradas no lead</p>
                    </div>
                  </div>
                </div>
                <div class="ml-auto max-w-[85%] rounded-2xl rounded-br-md bg-[#d9fdd3] px-3 py-2 text-[9px] leading-4 text-[#334155] shadow-sm">
                  Perfeito. Vamos marcar uma visita.
                </div>
              </div>

              <div class="mt-3 flex items-center gap-2 rounded-full bg-white px-3 py-2 shadow-sm">
                <span class="flex-1 text-[8px] text-slate-400">Mensagem</span>
                <span class="flex h-6 w-6 items-center justify-center rounded-full bg-[#19a963] text-white">
                  <MessageCircleMore size={12} />
                </span>
              </div>
            </div>
          </div>
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
