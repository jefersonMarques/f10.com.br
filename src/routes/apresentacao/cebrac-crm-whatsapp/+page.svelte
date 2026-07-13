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
    iconClass?: string;
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

  const painPoints: FeatureItem[] = [
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

  const crmHighlights: FeatureItem[] = [
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

  const whatsappHighlights: FeatureItem[] = [
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

  const benefits: FeatureItem[] = [
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
</svelte:head>

<div class="presentation-page overflow-hidden bg-white text-[#07163a]">
  <section class="relative isolate min-h-[100svh] overflow-hidden bg-white">
    <img
      src="/background-hero-cebrac.png"
      alt=""
      aria-hidden="true"
      class="pointer-events-none absolute inset-0 -z-20 h-full w-full object-cover"
    />
    <div class="pointer-events-none absolute inset-0 -z-10 bg-white/20"></div>

    <div class="mx-auto flex min-h-[100svh] max-w-[1540px] items-center px-5 py-10 sm:px-8 lg:px-12 xl:px-16">
      <div class="grid w-full items-center gap-12 lg:grid-cols-[0.84fr_1.16fr] xl:gap-16">
        <div class="relative z-10 max-w-[690px]">
          <div class="mb-10 flex items-center gap-5 sm:gap-7">
            <img src="/cebrac-logo.svg" alt="Cebrac" class="h-14 w-auto sm:h-16" />
            <span class="h-14 w-px bg-slate-300"></span>
            <img src="/logo_f10.svg" alt="F10 Software" class="h-12 w-auto sm:h-14" />
          </div>

          <div class="mb-5 inline-flex items-center gap-2 rounded-full border border-orange-100 bg-orange-50/90 px-4 py-2 text-xs font-bold uppercase tracking-[0.13em] text-[#ea6d0b]">
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

          <div class="mt-10 grid gap-3 rounded-3xl border border-slate-200/80 bg-white/75 p-3 shadow-[0_24px_60px_rgba(15,35,75,0.10)] backdrop-blur sm:grid-cols-2 xl:grid-cols-4">
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

        <div class="relative flex min-h-[420px] items-center justify-center lg:min-h-[650px] lg:justify-end">
          <img
            src="/hero-cebrac.webp"
            alt="CRM F10 e WhatsApp integrado"
            class="relative z-10 w-full max-w-[980px] object-contain drop-shadow-[0_35px_65px_rgba(15,35,75,0.22)]"
          />
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
