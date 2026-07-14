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

  type ContentItem = {
    title: string;
    description: string;
    icon: IconComponent;
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
