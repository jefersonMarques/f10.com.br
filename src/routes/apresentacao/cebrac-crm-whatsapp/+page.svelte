<script lang="ts">
  import {
    AlertTriangle,
    ArrowRight,
    BarChart3,
    BookOpen,
    CalendarCheck,
    CheckCircle2,
    Clock3,
    Database,
    GraduationCap,
    History,
    Kanban,
    Layers,
    Megaphone,
    MessageCircle,
    PhoneCall,
    PieChart,
    Rocket,
    Settings,
    ShieldCheck,
    Target,
    TrendingUp,
    UserCheck,
    Users,
    Workflow,
    XCircle,
  } from "lucide-svelte";

  const problems = [
    {
      title: "Leads esquecidos",
      description:
        "Sem um processo visível, oportunidades ficam sem retorno, follow-up ou próximo passo definido.",
      icon: AlertTriangle,
      tone: "bg-amber-50 text-amber-600",
    },
    {
      title: "Falta de acompanhamento",
      description:
        "A operação depende da memória e da rotina individual de cada pessoa do time comercial.",
      icon: PhoneCall,
      tone: "bg-orange-50 text-[#e96f0b]",
    },
    {
      title: "Perda de conhecimento",
      description:
        "Quando alguém deixa a equipe, histórico, objeções e negociações podem desaparecer junto.",
      icon: Users,
      tone: "bg-emerald-50 text-emerald-600",
    },
    {
      title: "Pouca visão dos indicadores",
      description:
        "Sem dados centralizados, fica difícil comparar unidades, campanhas, equipes e etapas do funil.",
      icon: BarChart3,
      tone: "bg-blue-50 text-blue-600",
    },
  ];

  const crmFeatures = [
    "Funil comercial visual em formato Kanban",
    "Follow-ups, tarefas e próximos passos",
    "Histórico completo por lead e oportunidade",
    "Workflow comercial padronizado para a rede",
    "Indicadores de conversão e produtividade",
  ];

  const whatsappFeatures = [
    "Conversas centralizadas dentro do sistema",
    "Histórico vinculado ao lead ou ao aluno",
    "Atendimento comercial e comunicação acadêmica",
    "Avisos, lembretes e mensagens organizadas",
    "Até 5 números por unidade, conforme implantação",
  ];

  const benefits = [
    {
      title: "Aumento da conversão",
      description:
        "Mais oportunidades acompanhadas até a decisão e menos leads desperdiçados.",
      icon: TrendingUp,
      tone: "bg-emerald-50 text-emerald-600",
    },
    {
      title: "Organização do funil",
      description:
        "Visibilidade clara de cada etapa, responsável e oportunidade que precisa de atenção.",
      icon: Kanban,
      tone: "bg-orange-50 text-[#e96f0b]",
    },
    {
      title: "Disciplina comercial",
      description:
        "Cadências, tarefas e retornos programados sustentam uma rotina comercial consistente.",
      icon: CalendarCheck,
      tone: "bg-blue-50 text-blue-600",
    },
    {
      title: "Preservação do conhecimento",
      description:
        "O histórico permanece na unidade e o próximo responsável continua de onde o atendimento parou.",
      icon: BookOpen,
      tone: "bg-violet-50 text-violet-600",
    },
    {
      title: "Automação e produtividade",
      description:
        "Lembretes, atividades e comunicação integrada reduzem retrabalho e tarefas manuais.",
      icon: Settings,
      tone: "bg-lime-50 text-lime-700",
    },
    {
      title: "Gestão por indicadores",
      description:
        "Dados em tempo real ajudam a identificar gargalos, boas práticas e oportunidades de melhoria.",
      icon: PieChart,
      tone: "bg-amber-50 text-amber-600",
    },
  ];

  const implementationSteps = [
    {
      label: "1",
      title: "Comunicação oficial",
      description:
        "Apresentação da evolução, dos objetivos do projeto e das responsabilidades de cada unidade.",
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
        "Parametrização do CRM, usuários, funil, regras comerciais e números de WhatsApp.",
      icon: Settings,
    },
    {
      label: "4",
      title: "Treinamento",
      description:
        "Capacitação das equipes para uso do sistema e aplicação do método comercial da rede.",
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

  const withoutCrm = [
    "Informações ficam espalhadas ou concentradas na memória do vendedor.",
    "Leads podem ficar sem retorno quando a rotina muda.",
    "A troca de colaborador pode interromper negociações em andamento.",
    "A gestão depende de planilhas e verificações manuais.",
  ];

  const withCrm = [
    "Todo histórico fica registrado e acessível para a unidade.",
    "Cada oportunidade possui responsável, etapa e próximo passo.",
    "Negociações continuam mesmo com mudanças na equipe.",
    "Indicadores ajudam a acompanhar a operação em tempo real.",
  ];
</script>

<svelte:head>
  <title>Cebrac + F10 | Evolução da gestão comercial da rede</title>
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
  <header class="border-b border-slate-200/80 bg-white/95">
    <div
      class="mx-auto flex max-w-[1180px] items-center justify-between gap-5 px-5 py-5 sm:px-8 lg:px-10"
    >
      <div class="flex items-center gap-4 sm:gap-5">
        <img
          src="/logo_f10.svg"
          alt="F10 Software"
          class="h-10 w-auto sm:h-12"
        />
        <span class="h-9 w-px bg-slate-200"></span>
        <div>
          <p class="text-lg font-extrabold tracking-tight text-[#071735] sm:text-xl">
            Cebrac
          </p>
          <p class="text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-400">
            Rede parceira
          </p>
        </div>
      </div>

      <div class="text-right">
        <p class="text-xs font-bold uppercase tracking-[0.16em] text-[#e96f0b]">
          Apresentação interna
        </p>
        <p class="mt-1 text-xs text-slate-500">Julho de 2026</p>
      </div>
    </div>
  </header>

  <section class="relative border-b border-slate-200 bg-[#f7f8fc]">
    <div
      class="pointer-events-none absolute inset-x-0 top-0 h-72 bg-[radial-gradient(circle_at_18%_12%,rgba(233,111,11,0.12),transparent_34%),radial-gradient(circle_at_82%_8%,rgba(37,99,235,0.10),transparent_32%)]"
    ></div>

    <div
      class="relative mx-auto grid max-w-[1180px] items-center gap-12 px-5 py-16 sm:px-8 sm:py-20 lg:grid-cols-[0.92fr_1.08fr] lg:px-10 lg:py-24"
    >
      <div>
        <div
          class="inline-flex items-center gap-2 rounded-full border border-blue-200 bg-blue-50 px-4 py-2 text-xs font-bold uppercase tracking-[0.12em] text-blue-700"
        >
          <ShieldCheck size={16} strokeWidth={2} />
          Comunicado para a rede Cebrac
        </div>

        <h1
          class="mt-7 max-w-[660px] text-4xl font-black leading-[1.08] tracking-[-0.035em] text-[#071735] sm:text-5xl lg:text-[62px]"
        >
          Uma nova etapa na
          <span class="text-[#e96f0b]">gestão comercial</span>
          da rede
        </h1>

        <p class="mt-7 max-w-[620px] text-lg leading-8 text-slate-600 sm:text-xl">
          CRM de Leads e WhatsApp integrado ao F10 para trazer mais
          organização, produtividade, continuidade e matrículas para as unidades.
        </p>

        <div class="mt-8 flex flex-wrap gap-3">
          <span
            class="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm"
            >Mais organização</span
          >
          <span
            class="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm"
            >Mais produtividade</span
          >
          <span
            class="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm"
            >Mais matrículas</span
          >
          <span
            class="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm"
            >Mais previsibilidade</span
          >
        </div>
      </div>

      <div
        class="relative flex aspect-[14/9] min-h-[330px] items-center justify-center overflow-hidden rounded-[32px] border border-slate-300 bg-slate-200 p-8 shadow-[0_30px_70px_-38px_rgba(7,23,53,0.45)]"
      >
        <div class="text-center text-slate-500">
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
    <div class="mx-auto max-w-[780px] text-center">
      <p class="text-sm font-extrabold uppercase tracking-[0.18em] text-[#e96f0b]">
        O ponto de partida
      </p>
      <h2 class="mt-4 text-3xl font-black tracking-[-0.025em] sm:text-4xl">
        Por que a rede precisa dessa evolução?
      </h2>
      <p class="mt-5 text-lg leading-8 text-slate-600">
        O projeto nasceu para reduzir perdas invisíveis, organizar o método
        comercial e dar continuidade aos atendimentos em todas as unidades.
      </p>
    </div>

    <div class="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
      {#each problems as item}
        <article
          class="rounded-[24px] border border-slate-200 bg-white p-6 shadow-[0_16px_40px_-32px_rgba(7,23,53,0.45)]"
        >
          <div class={`flex h-12 w-12 items-center justify-center rounded-2xl ${item.tone}`}>
            <svelte:component this={item.icon} size={24} strokeWidth={1.9} />
          </div>
          <h3 class="mt-5 text-lg font-extrabold text-[#071735]">{item.title}</h3>
          <p class="mt-3 text-sm leading-6 text-slate-600">{item.description}</p>
        </article>
      {/each}
    </div>
  </section>

  <section class="px-5 pb-16 sm:px-8 sm:pb-20 lg:px-10">
    <div
      class="mx-auto max-w-[1180px] overflow-hidden rounded-[34px] bg-[#071735] px-6 py-12 text-white shadow-[0_30px_80px_-45px_rgba(7,23,53,0.75)] sm:px-10 lg:px-14 lg:py-16"
    >
      <div class="mx-auto max-w-[780px] text-center">
        <p class="text-sm font-extrabold uppercase tracking-[0.18em] text-orange-300">
          O que muda para as unidades
        </p>
        <h2 class="mt-4 text-3xl font-black tracking-[-0.025em] sm:text-4xl">
          Duas frentes integradas em uma única operação
        </h2>
        <p class="mt-5 text-base leading-7 text-blue-100/80 sm:text-lg">
          O CRM organiza a jornada comercial. O WhatsApp conecta as conversas ao
          histórico de leads e alunos dentro do ecossistema F10.
        </p>
      </div>

      <div class="mt-12 grid gap-6 lg:grid-cols-2">
        <article
          class="rounded-[26px] border border-white/10 bg-white/[0.06] p-6 sm:p-8"
        >
          <div class="flex items-center gap-4">
            <div
              class="flex h-12 w-12 items-center justify-center rounded-2xl bg-orange-400/15 text-orange-300"
            >
              <Kanban size={25} strokeWidth={1.9} />
            </div>
            <div>
              <p class="text-xs font-bold uppercase tracking-[0.15em] text-orange-300">
                Frente comercial
              </p>
              <h3 class="mt-1 text-2xl font-black">CRM de Leads</h3>
            </div>
          </div>

          <p class="mt-5 leading-7 text-blue-100/80">
            Uma visão completa do funil para organizar a rotina comercial,
            acompanhar oportunidades e transformar processo em resultado.
          </p>

          <div
            class="mt-7 flex aspect-[3/2] items-center justify-center rounded-[22px] border border-white/15 bg-slate-300/20 p-6"
          >
            <div class="text-center text-blue-100/65">
              <Kanban class="mx-auto h-10 w-10" strokeWidth={1.5} />
              <p class="mt-3 text-sm font-bold text-blue-50">
                Imagem do CRM de Leads / Funil Kanban
              </p>
              <p class="mt-1 text-xs">Tamanho recomendado: 1200 × 800 px</p>
            </div>
          </div>

          <ul class="mt-7 space-y-3">
            {#each crmFeatures as feature}
              <li class="flex items-start gap-3 text-sm leading-6 text-blue-50/90">
                <CheckCircle2
                  class="mt-0.5 h-5 w-5 shrink-0 text-emerald-400"
                  strokeWidth={2}
                />
                <span>{feature}</span>
              </li>
            {/each}
          </ul>
        </article>

        <article
          class="rounded-[26px] border border-white/10 bg-white/[0.06] p-6 sm:p-8"
        >
          <div class="flex items-center gap-4">
            <div
              class="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-400/15 text-emerald-300"
            >
              <MessageCircle size={25} strokeWidth={1.9} />
            </div>
            <div>
              <p class="text-xs font-bold uppercase tracking-[0.15em] text-emerald-300">
                Comunicação integrada
              </p>
              <h3 class="mt-1 text-2xl font-black">WhatsApp no CRM e no F10</h3>
            </div>
          </div>

          <p class="mt-5 leading-7 text-blue-100/80">
            Conversas comerciais e acadêmicas organizadas dentro do sistema, com
            histórico, contexto e continuidade para cada atendimento.
          </p>

          <div
            class="mt-7 flex aspect-[3/2] items-center justify-center rounded-[22px] border border-white/15 bg-slate-300/20 p-6"
          >
            <div class="text-center text-blue-100/65">
              <MessageCircle class="mx-auto h-10 w-10" strokeWidth={1.5} />
              <p class="mt-3 text-sm font-bold text-blue-50">
                Imagem do WhatsApp integrado ao CRM e ao F10
              </p>
              <p class="mt-1 text-xs">Tamanho recomendado: 1200 × 800 px</p>
            </div>
          </div>

          <ul class="mt-7 space-y-3">
            {#each whatsappFeatures as feature}
              <li class="flex items-start gap-3 text-sm leading-6 text-blue-50/90">
                <CheckCircle2
                  class="mt-0.5 h-5 w-5 shrink-0 text-emerald-400"
                  strokeWidth={2}
                />
                <span>{feature}</span>
              </li>
            {/each}
          </ul>
        </article>
      </div>
    </div>
  </section>

  <section class="border-y border-slate-200 bg-[#f7f8fc]">
    <div class="mx-auto max-w-[1180px] px-5 py-16 sm:px-8 sm:py-20 lg:px-10">
      <div class="grid items-center gap-12 lg:grid-cols-2">
        <div>
          <p class="text-sm font-extrabold uppercase tracking-[0.18em] text-[#e96f0b]">
            Problema 1
          </p>
          <h2 class="mt-4 text-3xl font-black tracking-[-0.025em] sm:text-4xl">
            Esgotamento inteligente das tentativas com cada lead
          </h2>
          <p class="mt-5 text-lg leading-8 text-slate-600">
            Cada lead representa investimento e oportunidade. Com método e CRM,
            os contatos seguem uma cadência definida até que haja resposta,
            matrícula ou encerramento consciente da oportunidade.
          </p>

          <div class="mt-7 space-y-4">
            <div class="flex gap-4">
              <div
                class="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-orange-50 text-[#e96f0b]"
              >
                <Workflow size={19} />
              </div>
              <div>
                <h3 class="font-extrabold">Sequência de contatos programada</h3>
                <p class="mt-1 text-sm leading-6 text-slate-600">
                  Ligações, mensagens, tarefas e retornos deixam de depender da memória.
                </p>
              </div>
            </div>
            <div class="flex gap-4">
              <div
                class="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600"
              >
                <Clock3 size={19} />
              </div>
              <div>
                <h3 class="font-extrabold">Follow-up no momento certo</h3>
                <p class="mt-1 text-sm leading-6 text-slate-600">
                  O responsável sabe o que precisa fazer, quando e com qual oportunidade.
                </p>
              </div>
            </div>
            <div class="flex gap-4">
              <div
                class="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600"
              >
                <Target size={19} />
              </div>
              <div>
                <h3 class="font-extrabold">Mais conversão, menos desperdício</h3>
                <p class="mt-1 text-sm leading-6 text-slate-600">
                  A unidade aproveita melhor os leads que já foram captados pelas campanhas.
                </p>
              </div>
            </div>
          </div>
        </div>

        <div
          class="flex aspect-[5/4] items-center justify-center rounded-[30px] border border-slate-300 bg-slate-200 p-8"
        >
          <div class="text-center text-slate-500">
            <Target class="mx-auto h-12 w-12" strokeWidth={1.5} />
            <p class="mt-4 font-bold text-slate-600">
              Infográfico: funil de leads até a matrícula
            </p>
            <p class="mt-2 text-sm">Tamanho recomendado: 1250 × 1000 px</p>
          </div>
        </div>
      </div>

      <div class="my-16 h-px bg-slate-200 sm:my-20"></div>

      <div class="grid items-center gap-12 lg:grid-cols-2">
        <div
          class="order-2 flex aspect-[5/4] items-center justify-center rounded-[30px] border border-slate-300 bg-slate-200 p-8 lg:order-1"
        >
          <div class="text-center text-slate-500">
            <History class="mx-auto h-12 w-12" strokeWidth={1.5} />
            <p class="mt-4 font-bold text-slate-600">
              Infográfico: continuidade com troca de equipe
            </p>
            <p class="mt-2 text-sm">Tamanho recomendado: 1250 × 1000 px</p>
          </div>
        </div>

        <div class="order-1 lg:order-2">
          <p class="text-sm font-extrabold uppercase tracking-[0.18em] text-[#e96f0b]">
            Problema 2
          </p>
          <h2 class="mt-4 text-3xl font-black tracking-[-0.025em] sm:text-4xl">
            Continuidade mesmo quando a equipe muda
          </h2>
          <p class="mt-5 text-lg leading-8 text-slate-600">
            O conhecimento comercial deixa de ficar apenas na cabeça de uma pessoa.
            Histórico, negociações, objeções e próximos passos permanecem registrados
            para que a unidade continue operando sem voltar ao ponto zero.
          </p>

          <div
            class="mt-8 rounded-[24px] border border-emerald-200 bg-emerald-50 p-6"
          >
            <div class="flex items-start gap-4">
              <ShieldCheck
                class="mt-0.5 h-7 w-7 shrink-0 text-emerald-600"
                strokeWidth={1.9}
              />
              <div>
                <h3 class="text-lg font-extrabold text-emerald-950">
                  O relacionamento pertence à unidade
                </h3>
                <p class="mt-2 leading-7 text-emerald-900/75">
                  O novo responsável encontra contexto, atividades realizadas e o
                  estágio exato de cada negociação.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </section>

  <section class="mx-auto max-w-[1180px] px-5 py-16 sm:px-8 sm:py-20 lg:px-10">
    <div class="mx-auto max-w-[760px] text-center">
      <p class="text-sm font-extrabold uppercase tracking-[0.18em] text-[#e96f0b]">
        Método + tecnologia
      </p>
      <h2 class="mt-4 text-3xl font-black tracking-[-0.025em] sm:text-4xl">
        Benefícios diretos para a operação
      </h2>
      <p class="mt-5 text-lg leading-8 text-slate-600">
        Mais do que implantar uma ferramenta, a proposta é criar uma rotina
        comercial previsível, mensurável e replicável em toda a rede.
      </p>
    </div>

    <div class="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
      {#each benefits as item}
        <article
          class="rounded-[24px] border border-slate-200 bg-white p-6 shadow-[0_16px_45px_-34px_rgba(7,23,53,0.5)]"
        >
          <div class={`flex h-12 w-12 items-center justify-center rounded-2xl ${item.tone}`}>
            <svelte:component this={item.icon} size={24} strokeWidth={1.9} />
          </div>
          <h3 class="mt-5 text-lg font-extrabold">{item.title}</h3>
          <p class="mt-3 text-sm leading-6 text-slate-600">{item.description}</p>
        </article>
      {/each}
    </div>
  </section>

  <section class="border-y border-slate-200 bg-[#f7f8fc]">
    <div class="mx-auto max-w-[1180px] px-5 py-16 sm:px-8 sm:py-20 lg:px-10">
      <div class="mx-auto max-w-[760px] text-center">
        <p class="text-sm font-extrabold uppercase tracking-[0.18em] text-[#e96f0b]">
          Comparação prática
        </p>
        <h2 class="mt-4 text-3xl font-black tracking-[-0.025em] sm:text-4xl">
          Sem CRM x com CRM e método
        </h2>
        <p class="mt-5 text-lg leading-8 text-slate-600">
          A principal diferença está na continuidade do processo e na capacidade
          de transformar rotina em informação de gestão.
        </p>
      </div>

      <div class="mt-12 grid gap-6 lg:grid-cols-[1fr_auto_1fr] lg:items-stretch">
        <article class="rounded-[26px] border border-red-100 bg-white p-7 sm:p-8">
          <div
            class="inline-flex rounded-full bg-[#071735] px-4 py-2 text-xs font-extrabold uppercase tracking-[0.12em] text-white"
          >
            Sem CRM e método
          </div>
          <ul class="mt-7 space-y-4">
            {#each withoutCrm as item}
              <li class="flex items-start gap-3 text-sm leading-6 text-slate-600">
                <XCircle class="mt-0.5 h-5 w-5 shrink-0 text-red-500" strokeWidth={2} />
                <span>{item}</span>
              </li>
            {/each}
          </ul>
        </article>

        <div class="flex items-center justify-center">
          <span
            class="flex h-12 w-12 items-center justify-center rounded-full bg-[#071735] text-xs font-black text-white shadow-lg"
            >VS</span
          >
        </div>

        <article class="rounded-[26px] border border-emerald-200 bg-white p-7 sm:p-8">
          <div
            class="inline-flex rounded-full bg-emerald-600 px-4 py-2 text-xs font-extrabold uppercase tracking-[0.12em] text-white"
          >
            Com CRM e método
          </div>
          <ul class="mt-7 space-y-4">
            {#each withCrm as item}
              <li class="flex items-start gap-3 text-sm leading-6 text-slate-600">
                <CheckCircle2
                  class="mt-0.5 h-5 w-5 shrink-0 text-emerald-600"
                  strokeWidth={2}
                />
                <span>{item}</span>
              </li>
            {/each}
          </ul>
        </article>
      </div>
    </div>
  </section>

  <section class="mx-auto max-w-[1180px] px-5 py-16 sm:px-8 sm:py-20 lg:px-10">
    <div class="grid gap-8 lg:grid-cols-[0.82fr_1.18fr]">
      <div>
        <p class="text-sm font-extrabold uppercase tracking-[0.18em] text-[#e96f0b]">
          Escopo da evolução
        </p>
        <h2 class="mt-4 text-3xl font-black tracking-[-0.025em] sm:text-4xl">
          O que passa a fazer parte da operação
        </h2>
        <p class="mt-5 text-lg leading-8 text-slate-600">
          Os novos recursos conectam captação, atendimento, gestão comercial e
          comunicação em uma experiência única para a equipe.
        </p>
      </div>

      <div class="grid gap-5 sm:grid-cols-2">
        <article class="rounded-[24px] border border-slate-200 bg-white p-6">
          <div
            class="flex h-11 w-11 items-center justify-center rounded-2xl bg-orange-50 text-[#e96f0b]"
          >
            <Workflow size={23} />
          </div>
          <h3 class="mt-5 text-lg font-extrabold">CRM + workflow comercial</h3>
          <p class="mt-3 text-sm leading-6 text-slate-600">
            Funil, tarefas, atividades, histórico, regras de atendimento e gestão
            das oportunidades até a matrícula.
          </p>
        </article>

        <article class="rounded-[24px] border border-slate-200 bg-white p-6">
          <div
            class="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600"
          >
            <MessageCircle size={23} />
          </div>
          <h3 class="mt-5 text-lg font-extrabold">WhatsApp integrado</h3>
          <p class="mt-3 text-sm leading-6 text-slate-600">
            Até 5 números por unidade, distribuídos entre CRM e F10 de acordo com
            a configuração definida na implantação.
          </p>
        </article>

        <article class="rounded-[24px] border border-slate-200 bg-white p-6">
          <div
            class="flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-50 text-blue-600"
          >
            <Database size={23} />
          </div>
          <h3 class="mt-5 text-lg font-extrabold">Histórico centralizado</h3>
          <p class="mt-3 text-sm leading-6 text-slate-600">
            Informações comerciais e conversas organizadas para consulta,
            continuidade e acompanhamento da gestão.
          </p>
        </article>

        <article class="rounded-[24px] border border-slate-200 bg-white p-6">
          <div
            class="flex h-11 w-11 items-center justify-center rounded-2xl bg-violet-50 text-violet-600"
          >
            <BarChart3 size={23} />
          </div>
          <h3 class="mt-5 text-lg font-extrabold">Indicadores da operação</h3>
          <p class="mt-3 text-sm leading-6 text-slate-600">
            Acompanhamento de etapas, atividades, conversão, produtividade e
            oportunidades que precisam de atenção.
          </p>
        </article>
      </div>
    </div>
  </section>

  <section class="border-y border-slate-200 bg-[#f7f8fc]">
    <div class="mx-auto max-w-[1180px] px-5 py-16 sm:px-8 sm:py-20 lg:px-10">
      <div class="mx-auto max-w-[760px] text-center">
        <p class="text-sm font-extrabold uppercase tracking-[0.18em] text-[#e96f0b]">
          Implantação
        </p>
        <h2 class="mt-4 text-3xl font-black tracking-[-0.025em] sm:text-4xl">
          Como essa evolução chega às unidades
        </h2>
        <p class="mt-5 text-lg leading-8 text-slate-600">
          O processo será conduzido em etapas, com orientação, configuração e
          acompanhamento para que a tecnologia entre na rotina de forma organizada.
        </p>
      </div>

      <div class="relative mt-14">
        <div
          class="absolute left-[10%] right-[10%] top-8 hidden border-t-2 border-dashed border-blue-200 lg:block"
        ></div>

        <div class="relative grid gap-7 sm:grid-cols-2 lg:grid-cols-5">
          {#each implementationSteps as step}
            <article class="text-center">
              <div
                class="mx-auto flex h-16 w-16 items-center justify-center rounded-full border-4 border-white bg-[#071735] text-white shadow-lg"
              >
                <svelte:component this={step.icon} size={25} strokeWidth={1.8} />
              </div>
              <div
                class="mx-auto -mt-2 flex h-6 w-6 items-center justify-center rounded-full bg-[#e96f0b] text-[11px] font-black text-white ring-4 ring-[#f7f8fc]"
              >
                {step.label}
              </div>
              <h3 class="mt-4 font-extrabold">{step.title}</h3>
              <p class="mt-2 text-sm leading-6 text-slate-600">{step.description}</p>
            </article>
          {/each}
        </div>
      </div>
    </div>
  </section>

  <section class="mx-auto max-w-[1180px] px-5 py-16 sm:px-8 sm:py-20 lg:px-10">
    <div
      class="overflow-hidden rounded-[32px] bg-[#071735] px-6 py-12 text-white sm:px-10 lg:px-14"
    >
      <div class="grid items-center gap-10 lg:grid-cols-[1fr_0.78fr]">
        <div>
          <p class="text-sm font-extrabold uppercase tracking-[0.18em] text-orange-300">
            Resultado esperado
          </p>
          <h2 class="mt-4 text-3xl font-black tracking-[-0.025em] sm:text-4xl">
            Uma operação comercial mais previsível, organizada e escalável
          </h2>
          <p class="mt-5 max-w-[720px] text-lg leading-8 text-blue-100/80">
            O objetivo é garantir que nenhuma oportunidade fique para trás, que o
            conhecimento permaneça na unidade e que cada equipe tenha clareza sobre
            o que precisa fazer para transformar leads em matrículas.
          </p>

          <div class="mt-8 grid gap-4 sm:grid-cols-3">
            <div class="rounded-2xl border border-white/10 bg-white/[0.06] p-4">
              <TrendingUp class="h-6 w-6 text-emerald-400" />
              <p class="mt-3 text-sm font-bold">Mais conversão</p>
            </div>
            <div class="rounded-2xl border border-white/10 bg-white/[0.06] p-4">
              <Clock3 class="h-6 w-6 text-blue-300" />
              <p class="mt-3 text-sm font-bold">Mais produtividade</p>
            </div>
            <div class="rounded-2xl border border-white/10 bg-white/[0.06] p-4">
              <BarChart3 class="h-6 w-6 text-orange-300" />
              <p class="mt-3 text-sm font-bold">Mais gestão</p>
            </div>
          </div>
        </div>

        <div
          class="flex aspect-[4/3] items-center justify-center rounded-[24px] border border-white/15 bg-slate-300/20 p-6"
        >
          <div class="text-center text-blue-100/65">
            <BarChart3 class="mx-auto h-11 w-11" strokeWidth={1.5} />
            <p class="mt-4 font-bold text-white">
              Imagem final: indicadores e crescimento da rede
            </p>
            <p class="mt-2 text-sm">Tamanho recomendado: 1200 × 900 px</p>
          </div>
        </div>
      </div>
    </div>
  </section>

  <footer class="border-t border-slate-200 bg-white">
    <div
      class="mx-auto flex max-w-[1180px] flex-col gap-5 px-5 py-8 text-sm text-slate-500 sm:px-8 md:flex-row md:items-center md:justify-between lg:px-10"
    >
      <div class="flex items-center gap-4">
        <img src="/logo_f10.svg" alt="F10 Software" class="h-8 w-auto" />
        <span class="h-7 w-px bg-slate-200"></span>
        <span class="font-bold text-[#071735]">Cebrac</span>
      </div>
      <p>Material de apresentação interna para apoio à implantação.</p>
    </div>
  </footer>
</div>
