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

  const presentationBenefits = [
    { label: "Mais organização", icon: Target, tone: "text-[#ff7900] bg-orange-50" },
    { label: "Mais produtividade", icon: CalendarCheck, tone: "text-blue-600 bg-blue-50" },
    { label: "Mais matrículas", icon: TrendingUp, tone: "text-emerald-600 bg-emerald-50" },
    { label: "Mais previsibilidade", icon: BarChart3, tone: "text-violet-600 bg-violet-50" },
  ];

  const objectives = [
    {
      title: "Padronizar o método comercial",
      description:
        "Uma rotina comum para registrar oportunidades, acompanhar retornos e conduzir cada lead até a decisão.",
      icon: Workflow,
      tone: "text-[#ff7900] bg-orange-50",
    },
    {
      title: "Reduzir perdas invisíveis",
      description:
        "Garantir que nenhum contato fique sem acompanhamento ou dependa apenas da memória de uma pessoa.",
      icon: Target,
      tone: "text-blue-600 bg-blue-50",
    },
    {
      title: "Preservar o histórico",
      description:
        "Centralizar conversas, decisões, tarefas e próximos passos para que o atendimento sempre continue.",
      icon: History,
      tone: "text-emerald-600 bg-emerald-50",
    },
    {
      title: "Dar escala à operação",
      description:
        "Permitir crescimento com qualidade, visibilidade e consistência em todas as unidades da rede.",
      icon: BarChart3,
      tone: "text-violet-600 bg-violet-50",
    },
  ];

  const challenges = [
    {
      title: "Leads esquecidos",
      description:
        "Sem um processo visível, oportunidades ficam sem retorno e desaparecem ao longo do caminho.",
      icon: AlertTriangle,
      tone: "text-rose-600 bg-rose-50",
    },
    {
      title: "Falta de acompanhamento",
      description:
        "A ausência de follow-up e tarefas programadas reduz a conversão e dificulta a gestão da rotina.",
      icon: PhoneCall,
      tone: "text-blue-600 bg-blue-50",
    },
    {
      title: "Perda de conhecimento",
      description:
        "Trocas de equipe podem levar junto informações, objeções, acordos e o contexto das negociações.",
      icon: Users,
      tone: "text-emerald-600 bg-emerald-50",
    },
    {
      title: "Pouca visão dos indicadores",
      description:
        "Sem dados centralizados, fica difícil identificar gargalos, comparar resultados e agir rapidamente.",
      icon: PieChart,
      tone: "text-violet-600 bg-violet-50",
    },
  ];

  const crmFeatures = [
    "Funil visual em formato Kanban",
    "Follow-ups, tarefas e próximos passos",
    "Histórico completo por oportunidade",
    "Workflow comercial padronizado",
    "Indicadores em tempo real",
  ];

  const whatsappFeatures = [
    "Conversas centralizadas no sistema",
    "Histórico vinculado ao contato",
    "Atendimento comercial e acadêmico",
    "Avisos, lembretes e mensagens",
    "Até 5 números por unidade",
  ];

  const journeySteps = [
    {
      number: "01",
      title: "O lead entra",
      description: "A oportunidade chega por um dos canais da unidade e é cadastrada no CRM.",
      icon: Users,
    },
    {
      number: "02",
      title: "O atendimento é registrado",
      description: "Interações, interesses, objeções e decisões passam a fazer parte do histórico.",
      icon: BookOpen,
    },
    {
      number: "03",
      title: "O próximo passo é definido",
      description: "Tarefas e follow-ups organizam a rotina e evitam que o contato seja esquecido.",
      icon: CalendarCheck,
    },
    {
      number: "04",
      title: "O WhatsApp apoia a jornada",
      description: "Conversas, avisos e materiais são enviados de forma rápida e integrada.",
      icon: MessageCircle,
    },
    {
      number: "05",
      title: "A matrícula é acompanhada",
      description: "A jornada continua com histórico, visibilidade e comunicação organizada.",
      icon: GraduationCap,
    },
  ];

  const unitBenefits = [
    {
      title: "Mais controle do funil",
      description: "Visão clara das etapas, responsáveis e oportunidades que exigem atenção.",
      icon: Kanban,
    },
    {
      title: "Mais disciplina comercial",
      description: "Uma rotina de retornos e tarefas sustenta o processo e melhora a conversão.",
      icon: CalendarCheck,
    },
    {
      title: "Preservação do conhecimento",
      description: "O histórico permanece acessível mesmo quando há mudanças na equipe.",
      icon: Database,
    },
    {
      title: "Melhor gestão da equipe",
      description: "Gestores acompanham atividades, ritmo, resultados e necessidades de apoio.",
      icon: UserCheck,
    },
    {
      title: "Menos retrabalho",
      description: "Informações organizadas evitam repetições, desencontros e perda de tempo.",
      icon: Clock3,
    },
    {
      title: "Decisões baseadas em dados",
      description: "Indicadores ajudam a enxergar gargalos e agir com mais rapidez e precisão.",
      icon: BarChart3,
    },
  ];

  const beforeItems = [
    "Leads em planilhas, anotações ou conversas isoladas",
    "Pouca clareza sobre quem precisa receber retorno",
    "Dependência da memória individual da equipe",
    "Perda de contexto quando alguém deixa a unidade",
    "Baixa previsibilidade sobre os resultados",
  ];

  const afterItems = [
    "Histórico centralizado e acessível",
    "Rotina organizada com tarefas e follow-ups",
    "Comunicação integrada ao WhatsApp",
    "Continuidade mesmo com mudanças na equipe",
    "Indicadores para acompanhar a operação",
  ];

  const implementationSteps = [
    {
      number: "01",
      title: "Comunicação oficial",
      description: "Apresentação do projeto, dos objetivos e do papel de cada unidade.",
      icon: Megaphone,
    },
    {
      number: "02",
      title: "Responsável da unidade",
      description: "Definição do ponto focal que acompanhará configuração e treinamento.",
      icon: UserCheck,
    },
    {
      number: "03",
      title: "Configuração inicial",
      description: "Parametrização do CRM, usuários, funil e números de WhatsApp.",
      icon: Settings,
    },
    {
      number: "04",
      title: "Treinamento",
      description: "Capacitação da equipe para uso da ferramenta e aplicação da nova rotina.",
      icon: GraduationCap,
    },
    {
      number: "05",
      title: "Operação assistida",
      description: "Acompanhamento inicial para apoiar adesão, dúvidas e ajustes do processo.",
      icon: Rocket,
    },
  ];
</script>

<svelte:head>
  <title>Cebrac + F10 | Evolução da gestão comercial da rede</title>
  <meta
    name="description"
    content="Apresentação interna sobre a implantação do CRM de Leads e do WhatsApp integrado ao F10 para as unidades Cebrac."
  />
  <meta name="robots" content="noindex, nofollow, noarchive, nosnippet, noimageindex" />
  <meta name="googlebot" content="noindex, nofollow, noarchive, nosnippet, noimageindex" />
  <meta name="bingbot" content="noindex, nofollow, noarchive, nosnippet" />
</svelte:head>

<div class="min-h-screen overflow-hidden bg-white text-[#071735]">
  <header class="border-b border-slate-200/80 bg-white">
    <div
      class="mx-auto flex max-w-[1240px] flex-col gap-5 px-5 py-5 sm:px-8 md:flex-row md:items-center md:justify-between lg:px-10"
    >
      <div class="flex items-center gap-4 sm:gap-6">
        <img src="/logo_f10.svg" alt="F10 Software" class="h-9 w-auto sm:h-11" />
        <span class="h-10 w-px bg-slate-200"></span>
        <img src="/cebrac-logo.svg" alt="Cebrac" class="h-12 w-auto object-contain sm:h-14" />
      </div>

      <div class="flex flex-wrap items-center gap-3 md:justify-end">
        <span
          class="rounded-full border border-blue-200 bg-blue-50 px-3 py-1.5 text-[11px] font-extrabold uppercase tracking-[0.14em] text-blue-700"
        >
          Implantação CRM + WhatsApp
        </span>
        <div class="hidden text-right sm:block">
          <p class="text-[11px] font-extrabold uppercase tracking-[0.16em] text-[#ff7900]">
            Apresentação interna
          </p>
          <p class="mt-1 text-xs text-slate-500">Julho de 2026</p>
        </div>
      </div>
    </div>
  </header>

  <main>
    <section class="bg-[#f5f7fb] px-5 py-8 sm:px-8 sm:py-12 lg:px-10 lg:py-16">
      <div
        class="relative mx-auto grid max-w-[1240px] items-center gap-14 overflow-hidden rounded-[38px] border border-slate-200 bg-white px-6 py-12 shadow-[0_30px_90px_-55px_rgba(7,23,53,0.45)] sm:px-10 sm:py-16 lg:grid-cols-[0.9fr_1.1fr] lg:px-14 lg:py-20"
      >
        <div
          class="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_6%_8%,rgba(255,121,0,0.11),transparent_30%),radial-gradient(circle_at_94%_12%,rgba(48,70,154,0.12),transparent_32%)]"
        ></div>

        <div class="relative z-10">
          <div
            class="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white/90 px-4 py-2 text-xs font-bold uppercase tracking-[0.12em] text-slate-600 shadow-sm"
          >
            <ShieldCheck size={16} strokeWidth={2} />
            Comunicado para a rede Cebrac
          </div>

          <h1
            class="mt-7 max-w-[680px] text-4xl font-black leading-[1.04] tracking-[-0.045em] text-[#071735] sm:text-5xl lg:text-[64px]"
          >
            Cebrac + <span class="text-[#ff7900]">F10:</span><br />
            uma nova etapa na gestão comercial da rede
          </h1>

          <p class="mt-7 max-w-[620px] text-lg leading-8 text-slate-600 sm:text-xl">
            CRM de Leads e WhatsApp integrado ao F10 para trazer mais organização,
            continuidade, produtividade e matrículas para todas as unidades.
          </p>

          <div class="mt-9 grid gap-3 sm:grid-cols-2">
            {#each presentationBenefits as item}
              <div
                class="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-[0_14px_30px_-24px_rgba(7,23,53,0.45)]"
              >
                <span class={`flex h-10 w-10 items-center justify-center rounded-xl ${item.tone}`}>
                  <svelte:component this={item.icon} size={20} strokeWidth={2} />
                </span>
                <span class="text-sm font-extrabold text-[#071735]">{item.label}</span>
              </div>
            {/each}
          </div>
        </div>

        <div
          class="relative z-10 flex aspect-[14/10] min-h-[390px] items-center justify-center overflow-hidden rounded-[30px] border border-slate-300 bg-gradient-to-br from-slate-100 to-slate-200 p-8 shadow-[0_28px_70px_-40px_rgba(7,23,53,0.5)]"
        >
          <div class="text-center text-slate-500">
            <Layers class="mx-auto h-14 w-14" strokeWidth={1.35} />
            <p class="mt-5 text-base font-extrabold text-slate-600">
              Imagem principal: CRM no notebook + WhatsApp no celular
            </p>
            <p class="mt-2 text-sm">Tamanho recomendado: 1400 × 900 px</p>
            <p class="mt-1 text-xs">Fundo transparente ou claro</p>
          </div>
        </div>
      </div>
    </section>

    <section class="mx-auto max-w-[1240px] px-5 py-20 sm:px-8 sm:py-24 lg:px-10 lg:py-28">
      <div class="grid gap-12 lg:grid-cols-[0.78fr_1.22fr] lg:items-start">
        <div>
          <p class="text-sm font-black uppercase tracking-[0.2em] text-[#ff7900]">
            O ponto de partida
          </p>
          <h2 class="mt-4 text-3xl font-black tracking-[-0.03em] sm:text-4xl lg:text-5xl">
            Uma evolução do método, não apenas uma nova ferramenta
          </h2>
          <p class="mt-6 text-lg leading-8 text-slate-600">
            Esta página apresenta o que será implantado, por que a mudança é necessária e
            como a nova rotina comercial deverá funcionar nas unidades.
          </p>

          <div class="mt-8 rounded-[24px] border border-blue-100 bg-blue-50/70 p-6">
            <p class="text-base font-extrabold leading-7 text-[#071735]">
              “O CRM não substitui o trabalho comercial. Ele organiza o método, registra o
              histórico e garante que cada oportunidade seja acompanhada até a matrícula.”
            </p>
          </div>
        </div>

        <div class="grid gap-5 sm:grid-cols-2">
          {#each objectives as item}
            <article
              class="rounded-[26px] border border-slate-200 bg-white p-7 shadow-[0_18px_50px_-38px_rgba(7,23,53,0.5)]"
            >
              <div class={`flex h-12 w-12 items-center justify-center rounded-2xl ${item.tone}`}>
                <svelte:component this={item.icon} size={24} strokeWidth={1.9} />
              </div>
              <h3 class="mt-5 text-xl font-black tracking-[-0.02em]">{item.title}</h3>
              <p class="mt-3 text-sm leading-7 text-slate-600">{item.description}</p>
            </article>
          {/each}
        </div>
      </div>
    </section>

    <section class="border-y border-slate-200 bg-[#f7f8fc]">
      <div class="mx-auto max-w-[1240px] px-5 py-20 sm:px-8 sm:py-24 lg:px-10 lg:py-28">
        <div class="mx-auto max-w-[820px] text-center">
          <p class="text-sm font-black uppercase tracking-[0.2em] text-[#ff7900]">
            Os desafios atuais
          </p>
          <h2 class="mt-4 text-3xl font-black tracking-[-0.03em] sm:text-4xl lg:text-5xl">
            Quais problemas essa evolução ajuda a resolver?
          </h2>
          <p class="mt-5 text-lg leading-8 text-slate-600">
            O objetivo é reduzir perdas silenciosas e tornar o processo comercial mais
            visível, previsível e fácil de acompanhar.
          </p>
        </div>

        <div class="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {#each challenges as item}
            <article
              class="rounded-[26px] border border-slate-200 bg-white p-7 shadow-[0_18px_45px_-38px_rgba(7,23,53,0.45)]"
            >
              <div class={`flex h-12 w-12 items-center justify-center rounded-2xl ${item.tone}`}>
                <svelte:component this={item.icon} size={24} strokeWidth={1.9} />
              </div>
              <h3 class="mt-5 text-xl font-black tracking-[-0.02em]">{item.title}</h3>
              <p class="mt-3 text-sm leading-7 text-slate-600">{item.description}</p>
            </article>
          {/each}
        </div>
      </div>
    </section>

    <section class="bg-[#071735] text-white">
      <div class="mx-auto max-w-[1240px] px-5 py-20 sm:px-8 sm:py-24 lg:px-10 lg:py-28">
        <div class="grid gap-8 lg:grid-cols-[0.72fr_1.28fr] lg:items-end">
          <div>
            <p class="text-sm font-black uppercase tracking-[0.2em] text-[#ff9a3c]">
              O que está sendo implantado
            </p>
            <h2 class="mt-4 text-3xl font-black tracking-[-0.03em] sm:text-4xl lg:text-5xl">
              Duas frentes conectadas para uma operação mais organizada
            </h2>
          </div>
          <p class="max-w-[650px] text-lg leading-8 text-slate-300 lg:justify-self-end">
            O CRM organiza a jornada comercial. O WhatsApp integrado concentra a comunicação
            e mantém o histórico ligado ao lead ou ao aluno.
          </p>
        </div>

        <div class="mt-14 grid gap-6 lg:grid-cols-2">
          <article
            class="overflow-hidden rounded-[30px] border border-white/10 bg-white/[0.06] p-7 shadow-[0_30px_80px_-55px_rgba(0,0,0,0.8)] sm:p-9"
          >
            <div class="flex items-center gap-4">
              <span class="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#ff7900]/15 text-[#ff9a3c]">
                <Kanban size={25} strokeWidth={1.9} />
              </span>
              <div>
                <p class="text-xs font-black uppercase tracking-[0.17em] text-[#ff9a3c]">
                  Frente comercial
                </p>
                <h3 class="mt-1 text-2xl font-black">CRM de Leads</h3>
              </div>
            </div>

            <ul class="mt-7 space-y-4">
              {#each crmFeatures as feature}
                <li class="flex items-start gap-3 text-sm leading-6 text-slate-200">
                  <CheckCircle2 class="mt-0.5 shrink-0 text-[#ff9a3c]" size={19} strokeWidth={2.2} />
                  <span>{feature}</span>
                </li>
              {/each}
            </ul>

            <div
              class="mt-8 flex aspect-[14/9] items-center justify-center rounded-[22px] border border-white/15 bg-slate-200 p-7 text-center text-slate-500"
            >
              <div>
                <Layers class="mx-auto h-11 w-11" strokeWidth={1.4} />
                <p class="mt-4 text-sm font-extrabold text-slate-600">Tela do CRM</p>
                <p class="mt-1 text-xs">1400 × 900 px</p>
              </div>
            </div>
          </article>

          <article
            class="overflow-hidden rounded-[30px] border border-white/10 bg-white/[0.06] p-7 shadow-[0_30px_80px_-55px_rgba(0,0,0,0.8)] sm:p-9"
          >
            <div class="flex items-center gap-4">
              <span class="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-400/15 text-emerald-400">
                <MessageCircle size={25} strokeWidth={1.9} />
              </span>
              <div>
                <p class="text-xs font-black uppercase tracking-[0.17em] text-emerald-400">
                  Comunicação integrada
                </p>
                <h3 class="mt-1 text-2xl font-black">WhatsApp integrado</h3>
              </div>
            </div>

            <ul class="mt-7 space-y-4">
              {#each whatsappFeatures as feature}
                <li class="flex items-start gap-3 text-sm leading-6 text-slate-200">
                  <CheckCircle2 class="mt-0.5 shrink-0 text-emerald-400" size={19} strokeWidth={2.2} />
                  <span>{feature}</span>
                </li>
              {/each}
            </ul>

            <div
              class="mt-8 flex aspect-[14/9] items-center justify-center rounded-[22px] border border-white/15 bg-slate-200 p-7 text-center text-slate-500"
            >
              <div>
                <Layers class="mx-auto h-11 w-11" strokeWidth={1.4} />
                <p class="mt-4 text-sm font-extrabold text-slate-600">Tela do WhatsApp integrado</p>
                <p class="mt-1 text-xs">1200 × 900 px</p>
              </div>
            </div>
          </article>
        </div>
      </div>
    </section>

    <section class="mx-auto max-w-[1240px] px-5 py-20 sm:px-8 sm:py-24 lg:px-10 lg:py-28">
      <div class="grid gap-14 lg:grid-cols-[0.92fr_1.08fr] lg:items-center">
        <div>
          <p class="text-sm font-black uppercase tracking-[0.2em] text-[#ff7900]">
            A jornada na prática
          </p>
          <h2 class="mt-4 text-3xl font-black tracking-[-0.03em] sm:text-4xl lg:text-5xl">
            Um processo contínuo, do primeiro contato ao acompanhamento do aluno
          </h2>
          <p class="mt-6 text-lg leading-8 text-slate-600">
            O novo fluxo torna explícito o que precisa acontecer em cada etapa e mantém as
            informações acessíveis para toda a equipe responsável.
          </p>

          <div class="mt-10 space-y-4">
            {#each journeySteps as item}
              <div class="group flex gap-4 rounded-[22px] border border-slate-200 bg-white p-5 shadow-[0_16px_40px_-34px_rgba(7,23,53,0.45)]">
                <div class="flex flex-col items-center">
                  <span class="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#071735] text-white">
                    <svelte:component this={item.icon} size={21} strokeWidth={1.9} />
                  </span>
                  <span class="mt-2 text-[10px] font-black tracking-[0.15em] text-[#ff7900]">{item.number}</span>
                </div>
                <div>
                  <h3 class="text-lg font-black">{item.title}</h3>
                  <p class="mt-2 text-sm leading-6 text-slate-600">{item.description}</p>
                </div>
              </div>
            {/each}
          </div>
        </div>

        <div class="space-y-6">
          <div
            class="flex aspect-[14/10] items-center justify-center rounded-[30px] border border-slate-300 bg-gradient-to-br from-slate-100 to-slate-200 p-8 text-center text-slate-500 shadow-[0_28px_70px_-45px_rgba(7,23,53,0.45)]"
          >
            <div>
              <Layers class="mx-auto h-12 w-12" strokeWidth={1.4} />
              <p class="mt-4 text-base font-extrabold text-slate-600">Fluxo comercial ilustrado</p>
              <p class="mt-2 text-sm">1400 × 900 px</p>
            </div>
          </div>

          <div
            class="flex aspect-[14/7] items-center justify-center rounded-[30px] border border-slate-300 bg-gradient-to-br from-slate-100 to-slate-200 p-8 text-center text-slate-500 shadow-[0_28px_70px_-45px_rgba(7,23,53,0.45)]"
          >
            <div>
              <Layers class="mx-auto h-11 w-11" strokeWidth={1.4} />
              <p class="mt-4 text-base font-extrabold text-slate-600">Exemplo de jornada no WhatsApp</p>
              <p class="mt-2 text-sm">1200 × 800 px</p>
            </div>
          </div>
        </div>
      </div>
    </section>

    <section class="border-y border-slate-200 bg-[#f7f8fc]">
      <div class="mx-auto max-w-[1240px] px-5 py-20 sm:px-8 sm:py-24 lg:px-10 lg:py-28">
        <div class="grid gap-10 lg:grid-cols-[0.72fr_1.28fr] lg:items-end">
          <div>
            <p class="text-sm font-black uppercase tracking-[0.2em] text-[#ff7900]">
              Impacto para a unidade
            </p>
            <h2 class="mt-4 text-3xl font-black tracking-[-0.03em] sm:text-4xl lg:text-5xl">
              O que muda na rotina de gestão e atendimento
            </h2>
          </div>
          <p class="max-w-[650px] text-lg leading-8 text-slate-600 lg:justify-self-end">
            A mudança não está apenas na tecnologia. Ela cria uma rotina mais clara para a
            equipe, mais visível para a gestão e mais consistente para o aluno.
          </p>
        </div>

        <div class="mt-14 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {#each unitBenefits as item, index}
            <article
              class="rounded-[26px] border border-slate-200 bg-white p-7 shadow-[0_18px_45px_-38px_rgba(7,23,53,0.45)]"
            >
              <div class="flex items-start justify-between gap-4">
                <span class="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 text-blue-700">
                  <svelte:component this={item.icon} size={24} strokeWidth={1.9} />
                </span>
                <span class="text-sm font-black text-slate-300">0{index + 1}</span>
              </div>
              <h3 class="mt-5 text-xl font-black tracking-[-0.02em]">{item.title}</h3>
              <p class="mt-3 text-sm leading-7 text-slate-600">{item.description}</p>
            </article>
          {/each}
        </div>
      </div>
    </section>

    <section class="mx-auto max-w-[1240px] px-5 py-20 sm:px-8 sm:py-24 lg:px-10 lg:py-28">
      <div class="mx-auto max-w-[820px] text-center">
        <p class="text-sm font-black uppercase tracking-[0.2em] text-[#ff7900]">
          Antes e depois
        </p>
        <h2 class="mt-4 text-3xl font-black tracking-[-0.03em] sm:text-4xl lg:text-5xl">
          A diferença aparece na continuidade da operação
        </h2>
      </div>

      <div class="mt-14 grid overflow-hidden rounded-[34px] border border-slate-200 bg-white shadow-[0_28px_80px_-55px_rgba(7,23,53,0.5)] lg:grid-cols-[1fr_auto_1fr]">
        <div class="p-7 sm:p-10">
          <div class="flex items-center gap-3">
            <span class="flex h-11 w-11 items-center justify-center rounded-2xl bg-rose-50 text-rose-600">
              <XCircle size={23} strokeWidth={2} />
            </span>
            <div>
              <p class="text-xs font-black uppercase tracking-[0.17em] text-rose-500">Antes</p>
              <h3 class="mt-1 text-2xl font-black">Processo fragmentado</h3>
            </div>
          </div>

          <ul class="mt-8 space-y-4">
            {#each beforeItems as item}
              <li class="flex items-start gap-3 text-sm leading-6 text-slate-600">
                <XCircle class="mt-0.5 shrink-0 text-rose-500" size={18} strokeWidth={2} />
                <span>{item}</span>
              </li>
            {/each}
          </ul>
        </div>

        <div class="hidden items-center justify-center border-x border-slate-200 bg-slate-50 px-6 lg:flex">
          <span class="flex h-12 w-12 items-center justify-center rounded-full border border-slate-200 bg-white text-[#071735] shadow-sm">
            <ArrowRight size={21} strokeWidth={2} />
          </span>
        </div>

        <div class="border-t border-slate-200 p-7 sm:p-10 lg:border-l-0 lg:border-t-0">
          <div class="flex items-center gap-3">
            <span class="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600">
              <CheckCircle2 size={23} strokeWidth={2} />
            </span>
            <div>
              <p class="text-xs font-black uppercase tracking-[0.17em] text-emerald-600">Depois</p>
              <h3 class="mt-1 text-2xl font-black">Processo centralizado</h3>
            </div>
          </div>

          <ul class="mt-8 space-y-4">
            {#each afterItems as item}
              <li class="flex items-start gap-3 text-sm leading-6 text-slate-600">
                <CheckCircle2 class="mt-0.5 shrink-0 text-emerald-600" size={18} strokeWidth={2} />
                <span>{item}</span>
              </li>
            {/each}
          </ul>
        </div>
      </div>

      <div
        class="mt-6 flex aspect-[14/5] min-h-[240px] items-center justify-center rounded-[30px] border border-slate-300 bg-gradient-to-br from-slate-100 to-slate-200 p-8 text-center text-slate-500"
      >
        <div>
          <Layers class="mx-auto h-12 w-12" strokeWidth={1.4} />
          <p class="mt-4 text-base font-extrabold text-slate-600">Comparativo visual explicativo</p>
          <p class="mt-2 text-sm">1400 × 700 px</p>
        </div>
      </div>
    </section>

    <section class="bg-[#071735] text-white">
      <div class="mx-auto max-w-[1240px] px-5 py-20 sm:px-8 sm:py-24 lg:px-10 lg:py-28">
        <div class="mx-auto max-w-[820px] text-center">
          <p class="text-sm font-black uppercase tracking-[0.2em] text-[#ff9a3c]">
            Etapas da implantação
          </p>
          <h2 class="mt-4 text-3xl font-black tracking-[-0.03em] sm:text-4xl lg:text-5xl">
            Uma evolução conduzida em etapas claras
          </h2>
          <p class="mt-5 text-lg leading-8 text-slate-300">
            Cada fase prepara a próxima para que a unidade comece com contexto, configuração,
            treinamento e apoio no início da operação.
          </p>
        </div>

        <div class="relative mt-16 grid gap-5 md:grid-cols-2 lg:grid-cols-5">
          <div class="pointer-events-none absolute left-[9%] right-[9%] top-8 hidden h-px bg-white/15 lg:block"></div>

          {#each implementationSteps as item}
            <article class="relative rounded-[26px] border border-white/10 bg-white/[0.06] p-6">
              <span class="relative z-10 flex h-16 w-16 items-center justify-center rounded-full border-4 border-[#071735] bg-[#ff7900] text-white shadow-lg">
                <svelte:component this={item.icon} size={25} strokeWidth={1.9} />
              </span>
              <p class="mt-5 text-xs font-black uppercase tracking-[0.17em] text-[#ff9a3c]">{item.number}</p>
              <h3 class="mt-2 text-lg font-black">{item.title}</h3>
              <p class="mt-3 text-sm leading-6 text-slate-300">{item.description}</p>
            </article>
          {/each}
        </div>

        <div class="mt-12 grid gap-6 lg:grid-cols-[1fr_0.72fr]">
          <div
            class="flex min-h-[280px] items-center justify-center rounded-[30px] border border-white/15 bg-white/[0.05] p-8 text-center text-slate-400"
          >
            <div>
              <Layers class="mx-auto h-12 w-12" strokeWidth={1.4} />
              <p class="mt-4 text-base font-extrabold text-slate-200">Timeline visual da implantação</p>
              <p class="mt-2 text-sm">1400 × 700 px</p>
            </div>
          </div>

          <div class="rounded-[30px] border border-blue-400/20 bg-blue-500/10 p-8">
            <div class="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-400/15 text-blue-300">
              <ShieldCheck size={24} strokeWidth={1.9} />
            </div>
            <h3 class="mt-6 text-2xl font-black">Material vivo de apoio</h3>
            <p class="mt-4 text-sm leading-7 text-slate-300">
              Esta página funciona como base para apresentação e esclarecimento das unidades.
              Imagens reais do CRM, do WhatsApp e da implantação poderão substituir os quadros
              cinza conforme o projeto avançar.
            </p>
          </div>
        </div>
      </div>
    </section>

    <footer class="border-t border-slate-200 bg-white">
      <div
        class="mx-auto flex max-w-[1240px] flex-col gap-5 px-5 py-8 sm:px-8 md:flex-row md:items-center md:justify-between lg:px-10"
      >
        <div class="flex items-center gap-4">
          <img src="/logo_f10.svg" alt="F10 Software" class="h-8 w-auto" />
          <span class="h-8 w-px bg-slate-200"></span>
          <img src="/cebrac-logo.svg" alt="Cebrac" class="h-10 w-auto" />
        </div>
        <p class="text-sm text-slate-500">Apresentação interna • CRM de Leads + WhatsApp integrado</p>
      </div>
    </footer>
  </main>
</div>
