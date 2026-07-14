<script lang="ts">
  import {
    ArrowRight,
    BarChart3,
    BellRing,
    CalendarCheck2,
    CheckCircle2,
    ClipboardCheck,
    FileText,
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

  type ChallengeItem = {
    number: string;
    title: string;
    description: string;
    points: string[];
    icon: IconComponent;
  };

  type ComparisonItem = {
    before: string;
    after: string;
  };

  type ImplementationStep = {
    number: string;
    title: string;
    description: string;
  };

  const heroHighlights: FeatureItem[] = [
    {
      title: "Funil visual",
      description: "Cada lead com etapa, responsável e próximo passo.",
      icon: Funnel,
      iconClass: "text-[#ff7900]",
    },
    {
      title: "WhatsApp integrado",
      description: "Atendimento de leads no CRM e comunicação com alunos no F10.",
      icon: MessageCircleMore,
      iconClass: "text-[#17a85b]",
    },
    {
      title: "Gestão baseada em dados",
      description: "Indicadores para acompanhar equipes, campanhas e conversão.",
      icon: BarChart3,
      iconClass: "text-[#2B4091]",
    },
  ];

  const challenges: ChallengeItem[] = [
    {
      number: "01",
      title: "Nenhuma oportunidade pode ficar para trás",
      description:
        "A Rede Cebrac investe para gerar oportunidades. O CRM organiza a cadência comercial para que cada lead seja acompanhado até a matrícula.",
      points: ["Follow-ups no momento certo", "Próxima ação definida", "Menos leads esquecidos"],
      icon: TimerReset,
    },
    {
      number: "02",
      title: "O conhecimento precisa permanecer na unidade",
      description:
        "Com atividades, conversas e negociações registradas, o atendimento continua mesmo quando há mudanças na equipe comercial.",
      points: ["Histórico preservado", "Continuidade nas negociações", "Treinamento mais rápido"],
      icon: UsersRound,
    },
  ];

  const crmFeatures: FeatureItem[] = [
    {
      title: "Workflow comercial",
      description: "Etapas claras para conduzir o lead do primeiro contato à matrícula.",
      icon: Workflow,
      iconClass: "text-[#ff7900]",
    },
    {
      title: "Tarefas e lembretes",
      description: "A equipe sabe o que fazer, com quem falar e quando agir.",
      icon: CalendarCheck2,
      iconClass: "text-[#2B4091]",
    },
    {
      title: "Histórico completo",
      description: "Contatos, observações, mensagens e mudanças de etapa ficam registrados.",
      icon: FileText,
      iconClass: "text-[#2B4091]",
    },
    {
      title: "Indicadores da operação",
      description: "Conversão, produtividade, campanhas, cursos e gargalos em uma visão gerencial.",
      icon: BarChart3,
      iconClass: "text-[#17a85b]",
    },
  ];

  const leadWhatsAppFeatures: FeatureItem[] = [
    {
      title: "Conversa vinculada ao lead",
      description: "O atendimento comercial permanece dentro do contexto da oportunidade.",
      icon: MessagesSquare,
      iconClass: "text-[#17a85b]",
    },
    {
      title: "Mais velocidade no retorno",
      description: "A equipe responde com histórico, modelos e informações organizadas.",
      icon: BellRing,
      iconClass: "text-[#ff7900]",
    },
    {
      title: "Continuidade do atendimento",
      description: "A negociação não depende de um único aparelho ou colaborador.",
      icon: ShieldCheck,
      iconClass: "text-[#2B4091]",
    },
  ];

  const studentWhatsAppFeatures: FeatureItem[] = [
    {
      title: "Checklist pós-matrícula",
      description: "Orientações e documentos necessários após a venda.",
      icon: ClipboardCheck,
      iconClass: "text-[#17a85b]",
    },
    {
      title: "Avisos e lembretes",
      description: "Faltas, compromissos e comunicações importantes para o aluno.",
      icon: BellRing,
      iconClass: "text-[#ff7900]",
    },
    {
      title: "Cobranças e acordos",
      description: "Boletos, lembretes financeiros e negociações com mais agilidade.",
      icon: FileText,
      iconClass: "text-[#2B4091]",
    },
  ];

  const journeySteps: FeatureItem[] = [
    {
      title: "Atrair",
      description: "Receber oportunidades das campanhas e canais de captação.",
      icon: Target,
      iconClass: "text-[#ff7900]",
    },
    {
      title: "Organizar",
      description: "Classificar o lead, definir responsável e próxima atividade.",
      icon: Funnel,
      iconClass: "text-[#2B4091]",
    },
    {
      title: "Acompanhar",
      description: "Executar contatos e follow-ups com método e contexto.",
      icon: MessagesSquare,
      iconClass: "text-[#17a85b]",
    },
    {
      title: "Matricular",
      description: "Converter a oportunidade e iniciar a jornada do aluno.",
      icon: CheckCircle2,
      iconClass: "text-[#6b55c7]",
    },
  ];

  const comparisonItems: ComparisonItem[] = [
    {
      before: "Informações espalhadas em planilhas, anotações e celulares",
      after: "Histórico centralizado na operação da unidade Cebrac",
    },
    {
      before: "Follow-ups dependentes da memória do vendedor",
      after: "Tarefas e lembretes orientam a próxima ação",
    },
    {
      before: "Dificuldade para saber onde cada lead está",
      after: "Funil visual mostra prioridades, gargalos e oportunidades",
    },
    {
      before: "Mudanças na equipe interrompem negociações",
      after: "O novo colaborador assume com todo o contexto registrado",
    },
  ];

  const benefits: FeatureItem[] = [
    {
      title: "Mais matrículas",
      description: "Melhor aproveitamento dos leads já captados pela unidade.",
      icon: TrendingUp,
      iconClass: "text-[#ffb26e]",
    },
    {
      title: "Mais produtividade",
      description: "Menos improviso e mais clareza para a rotina comercial.",
      icon: ClipboardCheck,
      iconClass: "text-[#ffb26e]",
    },
    {
      title: "Mais controle",
      description: "Visão completa do funil, das atividades e dos resultados.",
      icon: BarChart3,
      iconClass: "text-[#ffb26e]",
    },
    {
      title: "Mais continuidade",
      description: "O processo permanece mesmo quando a equipe muda.",
      icon: UserCheck,
      iconClass: "text-[#ffb26e]",
    },
    {
      title: "Mais previsibilidade",
      description: "Um método comum permite comparar e evoluir as unidades.",
      icon: Workflow,
      iconClass: "text-[#ffb26e]",
    },
    {
      title: "Mais segurança",
      description: "Históricos e informações ficam vinculados à operação.",
      icon: ShieldCheck,
      iconClass: "text-[#ffb26e]",
    },
  ];

  const implementationSteps: ImplementationStep[] = [
    {
      number: "01",
      title: "Comunicação oficial",
      description: "Apresentação dos recursos, objetivos e cronograma para a Rede Cebrac.",
    },
    {
      number: "02",
      title: "Responsáveis por unidade",
      description: "Definição das pessoas que acompanharão configuração, treinamento e adoção.",
    },
    {
      number: "03",
      title: "Configuração inicial",
      description: "Usuários, permissões, funil comercial e distribuição dos números de WhatsApp.",
    },
    {
      number: "04",
      title: "Treinamento das equipes",
      description: "Capacitação prática para vendedores, gestores e responsáveis pela operação.",
    },
    {
      number: "05",
      title: "Início assistido",
      description: "Entrada em operação com acompanhamento dos indicadores e ajustes contínuos.",
    },
  ];

  const unitActions: FeatureItem[] = [
    {
      title: "Indicar o responsável",
      description: "Definir o ponto de contato da unidade durante a implantação.",
      icon: UserCheck,
      iconClass: "text-[#ff7900]",
    },
    {
      title: "Mapear equipe e números",
      description: "Informar usuários comerciais e números de WhatsApp que participarão da operação.",
      icon: ClipboardCheck,
      iconClass: "text-[#2B4091]",
    },
    {
      title: "Preparar a equipe",
      description: "Garantir a participação de gestores e vendedores no treinamento.",
      icon: CalendarCheck2,
      iconClass: "text-[#17a85b]",
    },
  ];
</script>

<svelte:head>
  <title>Rede Cebrac | CRM de Leads e WhatsApp integrado ao F10</title>
  <meta
    name="description"
    content="Apresentação exclusiva para as unidades Cebrac sobre CRM de Leads, workflow comercial e WhatsApp integrado ao F10."
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

    <div class="mx-auto grid min-h-[100svh] w-full max-w-[1660px] items-center gap-10 px-5 py-12 sm:px-8 lg:grid-cols-[0.88fr_1.12fr] lg:px-10 lg:py-10 xl:px-14">
      <div class="relative z-20 max-w-[720px] lg:py-10">
        <div class="inline-flex max-w-full items-stretch overflow-hidden rounded-2xl border border-[#2B4091]/10 bg-white shadow-[0_16px_40px_rgba(43,64,145,0.13)]">
          <div class="flex min-w-[150px] items-center justify-center bg-[#2B4091] px-5 py-3.5 sm:min-w-[180px] sm:px-7">
            <img src="/Logo-Cebrac.png" alt="Cebrac" class="h-9 w-auto object-contain sm:h-11" />
          </div>
          <div class="flex items-center px-4 py-3 text-[10px] font-extrabold uppercase leading-5 tracking-[0.14em] text-[#2B4091] sm:px-6 sm:text-xs">
            Apresentação exclusiva para a rede
          </div>
        </div>

        <p class="mt-8 text-xs font-extrabold uppercase tracking-[0.2em] text-[#ff7900]">
          Uma nova etapa na operação comercial
        </p>

        <h1 class="mt-5 text-[42px] font-extrabold leading-[1.06] tracking-[-0.05em] sm:text-[56px] lg:text-[59px] xl:text-[66px]">
          <span class="text-[#ff7900]">CRM</span>
          <span> e </span>
          <span class="text-[#14a458]">WhatsApp</span>
          <br />
          integrados para a Rede Cebrac.
        </h1>

        <p class="mt-7 max-w-[680px] text-lg font-medium leading-8 text-[#3d4d6b] sm:text-[21px] sm:leading-9">
          Um método comercial estruturado para organizar os leads, preservar o histórico dos atendimentos e transformar mais oportunidades em matrículas.
        </p>

        <div class="mt-9 grid gap-3 sm:grid-cols-3">
          {#each heroHighlights as item}
            <article class="rounded-2xl border border-slate-200 bg-white/85 p-4 shadow-[0_12px_32px_rgba(14,37,83,0.07)] backdrop-blur">
              <svelte:component this={item.icon} size={24} strokeWidth={2} class={item.iconClass} />
              <h2 class="mt-3 text-sm font-extrabold text-[#07173e]">{item.title}</h2>
              <p class="mt-1.5 text-xs leading-5 text-slate-500">{item.description}</p>
            </article>
          {/each}
        </div>
      </div>

      <div class="relative z-10 flex min-h-[420px] items-center justify-center lg:min-h-[740px] lg:justify-end">
        <img
          src="/hero-cebrac.webp"
          alt="CRM F10 para a Rede Cebrac exibido em computador e atendimento integrado pelo WhatsApp"
          class="h-auto w-full max-w-[980px] object-contain drop-shadow-[0_34px_48px_rgba(14,37,83,0.18)]"
          fetchpriority="high"
        />
      </div>
    </div>
  </section>

  <section class="bg-[#2B4091] px-5 py-7 text-white sm:px-8 lg:px-12">
    <div class="mx-auto grid max-w-[1320px] gap-6 md:grid-cols-[auto_1fr_auto] md:items-center">
      <div class="flex justify-center md:justify-start">
        <img src="/Logo-Cebrac.png" alt="Cebrac" class="h-11 w-auto object-contain" />
      </div>
      <p class="text-center text-lg font-semibold leading-8 md:text-left sm:text-xl">
        Mais do que uma nova ferramenta: um método comum para dar continuidade, controle e previsibilidade à operação comercial da rede.
      </p>
      <img src="/logo_f10.svg" alt="F10 Software" class="mx-auto h-11 w-auto brightness-0 invert md:mx-0" />
    </div>
  </section>

  <section class="border-b border-slate-200 bg-white px-5 py-4 sm:px-8 lg:px-12">
    <div class="mx-auto grid max-w-[1320px] divide-y divide-slate-200 sm:grid-cols-3 sm:divide-x sm:divide-y-0">
      <div class="px-5 py-5 text-center">
        <strong class="block text-2xl font-extrabold tracking-[-0.04em] text-[#ff7900] sm:text-3xl">CRM + Workflow</strong>
        <span class="mt-1 block text-sm font-medium text-slate-500">gestão de leads com foco em matrícula</span>
      </div>
      <div class="px-5 py-5 text-center">
        <strong class="block text-2xl font-extrabold tracking-[-0.04em] text-[#2B4091] sm:text-3xl">2 frentes</strong>
        <span class="mt-1 block text-sm font-medium text-slate-500">atendimento aos leads e relacionamento com alunos</span>
      </div>
      <div class="px-5 py-5 text-center">
        <strong class="block text-2xl font-extrabold tracking-[-0.04em] text-[#17a85b] sm:text-3xl">5 números</strong>
        <span class="mt-1 block text-sm font-medium text-slate-500">de WhatsApp incluídos por unidade Cebrac</span>
      </div>
    </div>
  </section>

  <section class="bg-[#f5f7fc] px-5 py-24 sm:px-8 lg:px-12 lg:py-32">
    <div class="mx-auto max-w-[1320px]">
      <div class="grid gap-10 lg:grid-cols-[0.72fr_1.28fr] lg:items-end lg:gap-16">
        <div>
          <p class="section-label">01 · Por que essa evolução</p>
          <h2 class="section-title mt-5">Dois desafios que afetam diretamente as matrículas.</h2>
        </div>
        <p class="max-w-[760px] text-lg leading-8 text-slate-600 lg:pb-1">
          O projeto nasce para reduzir desperdícios no tratamento dos leads e evitar que o conhecimento comercial se perca quando há mudanças na equipe.
        </p>
      </div>

      <div class="mt-14 grid gap-6 lg:grid-cols-2">
        {#each challenges as challenge}
          <article class="relative overflow-hidden rounded-[34px] border border-slate-200 bg-white p-8 shadow-[0_18px_55px_rgba(15,35,75,0.07)] sm:p-10">
            <span class="absolute right-7 top-4 text-[84px] font-black leading-none tracking-[-0.08em] text-slate-100">
              {challenge.number}
            </span>
            <div class="relative">
              <div class="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#edf1ff] text-[#2B4091]">
                <svelte:component this={challenge.icon} size={27} strokeWidth={1.9} />
              </div>
              <h3 class="mt-7 max-w-[520px] text-3xl font-extrabold leading-tight tracking-[-0.035em] text-[#14275f]">
                {challenge.title}
              </h3>
              <p class="mt-5 max-w-[600px] text-base leading-7 text-slate-600">{challenge.description}</p>
              <div class="mt-7 space-y-3">
                {#each challenge.points as point}
                  <div class="flex items-center gap-3 text-sm font-semibold text-slate-600">
                    <CheckCircle2 size={18} class="shrink-0 text-[#17a85b]" />
                    <span>{point}</span>
                  </div>
                {/each}
              </div>
            </div>
          </article>
        {/each}
      </div>

      <div class="mt-8 rounded-[30px] bg-[#06173e] px-7 py-8 text-white sm:px-10 lg:flex lg:items-center lg:justify-between lg:gap-10">
        <p class="max-w-[920px] text-xl font-semibold leading-8 tracking-[-0.02em] sm:text-2xl">
          O CRM não substitui a equipe comercial. Ele transforma o método em rotina, visibilidade e continuidade.
        </p>
        <div class="mt-6 flex shrink-0 items-center gap-3 lg:mt-0">
          <BarChart3 size={27} class="text-[#ff9a42]" />
          <span class="text-sm font-bold text-white/70">Decisões apoiadas por dados</span>
        </div>
      </div>
    </div>
  </section>

  <section class="bg-white px-5 py-24 sm:px-8 lg:px-12 lg:py-32">
    <div class="mx-auto max-w-[1320px]">
      <div class="grid items-center gap-14 lg:grid-cols-[0.92fr_1.08fr] lg:gap-20">
        <div>
          <p class="section-label">02 · CRM de Leads</p>
          <h2 class="section-title mt-5">Cada oportunidade em uma etapa, com responsável e próximo passo.</h2>
          <p class="mt-6 text-lg leading-8 text-slate-600">
            O CRM F10 organiza a jornada comercial da unidade Cebrac desde a entrada do lead até a matrícula, com workflow, atividades e indicadores em um único ambiente.
          </p>

          <div class="mt-9 grid gap-4 sm:grid-cols-2">
            {#each crmFeatures as feature}
              <article class="rounded-2xl border border-slate-200 bg-white p-5">
                <svelte:component this={feature.icon} size={25} strokeWidth={1.9} class={feature.iconClass} />
                <h3 class="mt-4 text-base font-extrabold text-[#14275f]">{feature.title}</h3>
                <p class="mt-2 text-sm leading-6 text-slate-500">{feature.description}</p>
              </article>
            {/each}
          </div>
        </div>

        <div class="image-placeholder aspect-[16/11] rounded-[34px] border-2 border-dashed border-slate-300 p-8 shadow-inner">
          <div class="flex h-full flex-col items-center justify-center rounded-[24px] border border-white/70 bg-white/25 text-center">
            <Funnel size={42} strokeWidth={1.5} class="text-slate-500" />
            <strong class="mt-5 text-sm font-extrabold uppercase tracking-[0.16em] text-slate-600">Imagem do CRM</strong>
            <span class="mt-2 max-w-[330px] text-sm leading-6 text-slate-500">
              Inserir captura real da visão Kanban com etapas, leads, responsáveis e atividades.
            </span>
          </div>
        </div>
      </div>

      <div class="mt-14 rounded-[30px] border border-orange-100 bg-orange-50 px-7 py-7 sm:flex sm:items-center sm:justify-between sm:gap-8 sm:px-9">
        <div>
          <strong class="text-lg font-extrabold text-[#8c3f00]">Resultado para a unidade</strong>
          <p class="mt-1 text-sm leading-6 text-[#9a5721]">
            Menos leads esquecidos, maior disciplina comercial e melhor aproveitamento do investimento em marketing.
          </p>
        </div>
        <TrendingUp size={38} class="mt-5 shrink-0 text-[#ff7900] sm:mt-0" />
      </div>
    </div>
  </section>

  <section class="bg-[#f2faf5] px-5 py-24 sm:px-8 lg:px-12 lg:py-32">
    <div class="mx-auto max-w-[1320px]">
      <div class="grid items-center gap-14 lg:grid-cols-[1.04fr_0.96fr] lg:gap-20">
        <div class="image-placeholder order-2 aspect-[16/11] rounded-[34px] border-2 border-dashed border-slate-300 p-8 shadow-inner lg:order-1">
          <div class="flex h-full flex-col items-center justify-center rounded-[24px] border border-white/70 bg-white/25 text-center">
            <MessageCircleMore size={42} strokeWidth={1.5} class="text-slate-500" />
            <strong class="mt-5 text-sm font-extrabold uppercase tracking-[0.16em] text-slate-600">Imagem do WhatsApp integrado</strong>
            <span class="mt-2 max-w-[350px] text-sm leading-6 text-slate-500">
              Inserir captura real da conversa vinculada ao lead ou ao cadastro do aluno.
            </span>
          </div>
        </div>

        <div class="order-1 lg:order-2">
          <p class="section-label text-[#159552]">03 · WhatsApp integrado</p>
          <h2 class="section-title mt-5">A conversa deixa de ficar solta e passa a fazer parte do processo.</h2>
          <p class="mt-6 text-lg leading-8 text-slate-600">
            Os cinco números incluídos por unidade podem ser distribuídos entre o CRM e o F10, conforme a necessidade da operação Cebrac.
          </p>

          <div class="mt-8 grid gap-4 sm:grid-cols-2">
            <div class="rounded-[26px] border border-emerald-100 bg-white p-6 shadow-[0_12px_32px_rgba(14,70,45,0.05)]">
              <div class="flex items-center justify-between gap-4">
                <div>
                  <span class="text-xs font-extrabold uppercase tracking-[0.15em] text-[#159552]">No CRM</span>
                  <h3 class="mt-2 text-xl font-extrabold text-[#14275f]">Atendimento aos leads</h3>
                </div>
                <MessageCircleMore size={30} class="shrink-0 text-[#17a85b]" />
              </div>
              <div class="mt-6 space-y-5">
                {#each leadWhatsAppFeatures as feature}
                  <div class="flex gap-3">
                    <svelte:component this={feature.icon} size={20} strokeWidth={1.9} class={`mt-0.5 shrink-0 ${feature.iconClass}`} />
                    <div>
                      <strong class="text-sm font-extrabold text-[#14275f]">{feature.title}</strong>
                      <p class="mt-1 text-sm leading-5 text-slate-500">{feature.description}</p>
                    </div>
                  </div>
                {/each}
              </div>
            </div>

            <div class="rounded-[26px] border border-[#2B4091]/10 bg-white p-6 shadow-[0_12px_32px_rgba(43,64,145,0.05)]">
              <div class="flex items-center justify-between gap-4">
                <div>
                  <span class="text-xs font-extrabold uppercase tracking-[0.15em] text-[#2B4091]">No F10</span>
                  <h3 class="mt-2 text-xl font-extrabold text-[#14275f]">Relacionamento com alunos</h3>
                </div>
                <MessagesSquare size={30} class="shrink-0 text-[#2B4091]" />
              </div>
              <div class="mt-6 space-y-5">
                {#each studentWhatsAppFeatures as feature}
                  <div class="flex gap-3">
                    <svelte:component this={feature.icon} size={20} strokeWidth={1.9} class={`mt-0.5 shrink-0 ${feature.iconClass}`} />
                    <div>
                      <strong class="text-sm font-extrabold text-[#14275f]">{feature.title}</strong>
                      <p class="mt-1 text-sm leading-5 text-slate-500">{feature.description}</p>
                    </div>
                  </div>
                {/each}
              </div>
            </div>
          </div>

          <div class="mt-6 rounded-2xl bg-[#17a85b] px-6 py-5 text-white">
            <strong class="text-lg font-extrabold">Cinco números de WhatsApp incluídos por unidade</strong>
            <p class="mt-1 text-sm leading-6 text-white/80">
              A definição de quais números serão usados no CRM ou no F10 fará parte da etapa de configuração.
            </p>
          </div>
        </div>
      </div>
    </div>
  </section>

  <section class="bg-white px-5 py-24 sm:px-8 lg:px-12 lg:py-32">
    <div class="mx-auto max-w-[1320px]">
      <div class="mx-auto max-w-[880px] text-center">
        <p class="section-label">04 · O método comercial</p>
        <h2 class="section-title mt-5">Da captação à matrícula, cada etapa tem uma função clara.</h2>
        <p class="mt-6 text-lg leading-8 text-slate-600">
          A tecnologia organiza o fluxo. O método define ritmo, prioridade e qualidade no acompanhamento das oportunidades.
        </p>
      </div>

      <div class="relative mt-14 grid gap-5 md:grid-cols-4">
        <div class="absolute left-[12%] right-[12%] top-12 hidden h-px bg-slate-200 md:block"></div>
        {#each journeySteps as step, index}
          <article class="relative rounded-[28px] border border-slate-200 bg-white p-7 text-center shadow-[0_14px_40px_rgba(15,35,75,0.06)]">
            <div class="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[#f5f7fc] ring-8 ring-white">
              <svelte:component this={step.icon} size={26} strokeWidth={2} class={step.iconClass} />
            </div>
            <span class="mt-6 block text-xs font-extrabold tracking-[0.16em] text-slate-400">0{index + 1}</span>
            <h3 class="mt-2 text-xl font-extrabold text-[#14275f]">{step.title}</h3>
            <p class="mt-3 text-sm leading-6 text-slate-500">{step.description}</p>
          </article>
        {/each}
      </div>
    </div>
  </section>

  <section class="bg-[#f5f7fc] px-5 py-24 sm:px-8 lg:px-12 lg:py-32">
    <div class="mx-auto grid max-w-[1320px] gap-10 lg:grid-cols-[0.72fr_1.28fr] lg:gap-16">
      <div>
        <p class="section-label">05 · O que muda na prática</p>
        <h2 class="section-title mt-5">Menos dependência de controles individuais. Mais clareza para toda a equipe.</h2>
        <p class="mt-6 text-lg leading-8 text-slate-600">
          O novo modelo substitui rotinas frágeis por um processo visível, rastreável e fácil de acompanhar.
        </p>
      </div>

      <div class="overflow-hidden rounded-[30px] border border-slate-200 bg-white shadow-[0_18px_55px_rgba(15,35,75,0.06)]">
        <div class="grid grid-cols-2 bg-[#06173e] text-white">
          <div class="border-r border-white/10 px-5 py-4 text-sm font-extrabold uppercase tracking-[0.13em] text-white/60 sm:px-7">Antes</div>
          <div class="px-5 py-4 text-sm font-extrabold uppercase tracking-[0.13em] text-emerald-300 sm:px-7">Com CRM e método</div>
        </div>
        {#each comparisonItems as item}
          <div class="grid grid-cols-2 border-t border-slate-100">
            <div class="border-r border-slate-100 px-5 py-5 text-sm leading-6 text-slate-500 sm:px-7">{item.before}</div>
            <div class="px-5 py-5 text-sm font-semibold leading-6 text-[#14275f] sm:px-7">
              <span class="mr-2 text-[#17a85b]">✓</span>{item.after}
            </div>
          </div>
        {/each}
      </div>
    </div>
  </section>

  <section class="relative overflow-hidden bg-[#06173e] px-5 py-24 text-white sm:px-8 lg:px-12 lg:py-32">
    <div class="pointer-events-none absolute -left-48 top-0 h-96 w-96 rounded-full bg-[#2B4091]/30 blur-3xl"></div>
    <div class="pointer-events-none absolute -right-48 bottom-0 h-96 w-96 rounded-full bg-orange-500/10 blur-3xl"></div>

    <div class="relative mx-auto max-w-[1320px]">
      <div class="grid gap-10 lg:grid-cols-[1fr_auto] lg:items-end">
        <div class="max-w-[900px]">
          <p class="text-xs font-extrabold uppercase tracking-[0.2em] text-[#ff9a42]">Resultados para a Rede Cebrac</p>
          <h2 class="mt-5 text-4xl font-extrabold leading-tight tracking-[-0.04em] sm:text-5xl lg:text-[58px]">
            Mais controle para a gestão. Mais clareza para a equipe. Mais oportunidades convertidas.
          </h2>
        </div>
        <img src="/Logo-Cebrac.png" alt="Cebrac" class="hidden h-16 w-auto object-contain opacity-80 lg:block" />
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
    <div class="mx-auto grid max-w-[1320px] gap-14 lg:grid-cols-[0.72fr_1.28fr] lg:gap-20">
      <div>
        <p class="section-label">06 · Como será a implantação</p>
        <h2 class="section-title mt-5">Uma adoção progressiva, acompanhada e orientada por etapas.</h2>
        <p class="mt-6 text-lg leading-8 text-slate-600">
          Cada unidade será conduzida desde a preparação inicial até o início da operação, com treinamento e acompanhamento dos primeiros resultados.
        </p>

        <div class="image-placeholder mt-9 aspect-[16/9] rounded-[26px] border-2 border-dashed border-slate-300 p-5">
          <div class="flex h-full flex-col items-center justify-center rounded-[18px] border border-white/70 bg-white/25 text-center">
            <CalendarCheck2 size={34} strokeWidth={1.5} class="text-slate-500" />
            <strong class="mt-4 text-xs font-extrabold uppercase tracking-[0.15em] text-slate-600">Imagem do cronograma</strong>
            <span class="mt-2 max-w-[280px] text-xs leading-5 text-slate-500">
              Inserir o cronograma oficial assim que as datas forem aprovadas.
            </span>
          </div>
        </div>
      </div>

      <div class="relative">
        <div class="absolute bottom-8 left-[27px] top-8 hidden w-px bg-slate-300 sm:block"></div>
        <div class="space-y-4">
          {#each implementationSteps as step}
            <article class="relative rounded-3xl border border-slate-200 bg-[#f8fafc] p-6 sm:pl-24">
              <div class="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-[#2B4091] text-sm font-extrabold text-white sm:absolute sm:left-0 sm:top-1/2 sm:mb-0 sm:-translate-x-1/2 sm:-translate-y-1/2">
                {step.number}
              </div>
              <h3 class="text-xl font-extrabold tracking-[-0.02em] text-[#14275f]">{step.title}</h3>
              <p class="mt-2 text-sm leading-6 text-slate-600">{step.description}</p>
            </article>
          {/each}
        </div>
      </div>
    </div>
  </section>

  <section class="bg-[#f5f7fc] px-5 py-24 sm:px-8 lg:px-12 lg:py-32">
    <div class="mx-auto max-w-[1320px]">
      <div class="mx-auto max-w-[840px] text-center">
        <p class="section-label">Preparação das unidades</p>
        <h2 class="section-title mt-5">O que cada unidade Cebrac precisa fazer agora.</h2>
        <p class="mt-6 text-lg leading-8 text-slate-600">
          A implantação começa com três definições simples para garantir velocidade e organização nas próximas etapas.
        </p>
      </div>

      <div class="mt-14 grid gap-5 md:grid-cols-3">
        {#each unitActions as action, index}
          <article class="rounded-[28px] border border-slate-200 bg-white p-8 shadow-[0_14px_40px_rgba(15,35,75,0.05)]">
            <div class="flex items-start justify-between gap-4">
              <div class="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#f5f7fc]">
                <svelte:component this={action.icon} size={25} strokeWidth={1.9} class={action.iconClass} />
              </div>
              <span class="text-xs font-extrabold text-slate-300">0{index + 1}</span>
            </div>
            <h3 class="mt-7 text-xl font-extrabold text-[#14275f]">{action.title}</h3>
            <p class="mt-3 text-sm leading-6 text-slate-500">{action.description}</p>
          </article>
        {/each}
      </div>
    </div>
  </section>

  <section class="bg-white px-5 py-24 sm:px-8 lg:px-12 lg:py-32">
    <div class="mx-auto max-w-[1180px] overflow-hidden rounded-[42px] bg-[#2B4091] px-7 py-14 text-center text-white shadow-[0_30px_80px_rgba(43,64,145,0.24)] sm:px-12 sm:py-20">
      <img src="/Logo-Cebrac.png" alt="Cebrac" class="mx-auto h-16 w-auto object-contain" />
      <p class="mt-8 text-sm font-extrabold uppercase tracking-[0.18em] text-white/55">Cebrac + F10</p>
      <h2 class="mx-auto mt-4 max-w-[940px] text-4xl font-extrabold leading-tight tracking-[-0.04em] sm:text-5xl">
        Método comercial, tecnologia integrada e uma operação preparada para crescer.
      </h2>
      <p class="mx-auto mt-6 max-w-[790px] text-base leading-7 text-white/70 sm:text-lg">
        O objetivo é transformar cada oportunidade em um processo acompanhado, mensurável e contínuo — do primeiro contato até a matrícula.
      </p>
      <a
        href="#inicio"
        class="mt-9 inline-flex items-center gap-2 rounded-full bg-white px-6 py-3 text-sm font-extrabold text-[#2B4091] transition hover:-translate-y-0.5 hover:shadow-lg"
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

  .section-label {
    color: #ff7900;
    font-size: 0.75rem;
    font-weight: 800;
    letter-spacing: 0.2em;
    text-transform: uppercase;
  }

  .section-title {
    color: #06173e;
    font-size: clamp(2.25rem, 4vw, 3.6rem);
    font-weight: 800;
    letter-spacing: -0.04em;
    line-height: 1.08;
  }

  .image-placeholder {
    background-color: #e4e7ec;
    background-image: linear-gradient(135deg, rgba(255, 255, 255, 0.24) 25%, transparent 25%),
      linear-gradient(225deg, rgba(255, 255, 255, 0.24) 25%, transparent 25%),
      linear-gradient(45deg, rgba(255, 255, 255, 0.24) 25%, transparent 25%),
      linear-gradient(315deg, rgba(255, 255, 255, 0.24) 25%, #d9dde3 25%);
    background-position: 18px 0, 18px 0, 0 0, 0 0;
    background-repeat: repeat;
    background-size: 36px 36px;
  }

  :global(html) {
    scroll-behavior: smooth;
  }
</style>
