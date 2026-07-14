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
      description: "Cada lead em uma etapa clara, com responsável e próximo passo.",
      icon: Funnel,
      iconClass: "text-[#ff7900]",
    },
    {
      title: "WhatsApp integrado",
      description: "Atendimento aos leads no CRM e comunicação com alunos no F10.",
      icon: MessageCircleMore,
      iconClass: "text-[#17a85b]",
    },
    {
      title: "Mais produtividade",
      description: "Tarefas, lembretes e rotinas para a equipe comercial Cebrac.",
      icon: TrendingUp,
      iconClass: "text-[#ff7900]",
    },
    {
      title: "Histórico centralizado",
      description: "O conhecimento permanece na unidade, mesmo com mudanças na equipe.",
      icon: FileText,
      iconClass: "text-[#2B4091]",
    },
  ];

  const challenges: ChallengeItem[] = [
    {
      number: "01",
      title: "Nenhuma oportunidade pode ficar para trás",
      description:
        "A Rede Cebrac investe para gerar oportunidades. O CRM cria uma rotina de acompanhamento para que cada lead seja trabalhado até a matrícula.",
      icon: TimerReset,
      points: [
        "Sequência de contatos organizada",
        "Follow-ups no momento certo",
        "Avisos para nenhum lead ser esquecido",
      ],
    },
    {
      number: "02",
      title: "O conhecimento precisa permanecer na unidade",
      description:
        "Com o histórico registrado, as negociações continuam mesmo quando há mudanças na equipe comercial da unidade Cebrac.",
      icon: Database,
      points: [
        "Todo o histórico fica registrado",
        "Negociações continuam sem interrupção",
        "Novo colaborador assume com contexto",
      ],
    },
  ];

  const crmFeatures: FeatureItem[] = [
    {
      title: "Visão Kanban inteligente",
      description: "Acompanhe os leads em cada etapa do funil de forma visual e intuitiva.",
      icon: Funnel,
      iconClass: "text-[#ff7900]",
    },
    {
      title: "Organização que gera resultados",
      description: "Priorize atendimentos e concentre o esforço nos leads com maior potencial de matrícula.",
      icon: Target,
      iconClass: "text-[#17a85b]",
    },
    {
      title: "Mais agilidade para o time",
      description: "Atendimentos centralizados, lembretes e tarefas para reduzir oportunidades perdidas.",
      icon: CalendarCheck2,
      iconClass: "text-[#2B4091]",
    },
    {
      title: "Decisões baseadas em dados",
      description: "Relatórios e indicadores para acompanhar performance e orientar melhorias comerciais.",
      icon: BarChart3,
      iconClass: "text-[#6b55c7]",
    },
  ];

  const crmWhatsAppFeatures: FeatureItem[] = [
    {
      title: "Conversas centralizadas",
      description: "As interações comerciais ficam vinculadas ao cadastro do lead.",
      icon: MessagesSquare,
      iconClass: "text-[#17a85b]",
    },
    {
      title: "Histórico completo",
      description: "A equipe acompanha cada etapa do atendimento sem perder contexto.",
      icon: FileText,
      iconClass: "text-[#2B4091]",
    },
    {
      title: "Mais agilidade",
      description: "Respostas rápidas com modelos e informações organizadas.",
      icon: BellRing,
      iconClass: "text-[#ff7900]",
    },
    {
      title: "Mais conversões",
      description: "Atendimentos organizados apoiam a transformação de oportunidades em matrículas.",
      icon: TrendingUp,
      iconClass: "text-[#6b55c7]",
    },
  ];

  const studentWhatsAppFeatures: FeatureItem[] = [
    {
      title: "Checklist pós-matrícula",
      description: "Envio e acompanhamento das etapas necessárias depois da matrícula.",
      icon: ClipboardCheck,
      iconClass: "text-[#17a85b]",
    },
    {
      title: "Avisos aos faltantes",
      description: "Comunicação de ausências e lembretes para apoiar a permanência do aluno.",
      icon: BellRing,
      iconClass: "text-[#ff7900]",
    },
    {
      title: "Cobranças e acordos",
      description: "Lembretes de pagamento, boletos e acordos enviados com mais agilidade.",
      icon: FileText,
      iconClass: "text-[#2B4091]",
    },
    {
      title: "Comunicação completa",
      description: "Um canal direto para as necessidades administrativas e acadêmicas do aluno.",
      icon: MessagesSquare,
      iconClass: "text-[#6b55c7]",
    },
  ];

  const journeySteps: FeatureItem[] = [
    {
      title: "Atrair",
      description: "Receber leads das campanhas e canais de captação da Rede Cebrac.",
      icon: Target,
      iconClass: "text-[#ff7900]",
    },
    {
      title: "Nutrir",
      description: "Manter relacionamento no momento certo, com cadência e contexto.",
      icon: MessagesSquare,
      iconClass: "text-[#2B4091]",
    },
    {
      title: "Converter",
      description: "Acompanhar atendimentos, visitas, propostas e negociações.",
      icon: TrendingUp,
      iconClass: "text-[#17a85b]",
    },
    {
      title: "Matricular",
      description: "Concluir a venda e iniciar a jornada de relacionamento com o aluno.",
      icon: CheckCircle2,
      iconClass: "text-[#6b55c7]",
    },
  ];

  const comparisonRows: ComparisonRow[] = [
    {
      before: "Informações em planilhas, anotações e celulares",
      after: "Histórico centralizado na operação da unidade Cebrac",
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
      description: "Melhor aproveitamento dos leads já captados pela unidade.",
      icon: TrendingUp,
      iconClass: "text-[#ffb26e]",
    },
    {
      title: "Mais produtividade",
      description: "Menos improviso e mais clareza para a equipe comercial.",
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
      title: "Comunicação oficial à Rede Cebrac",
      description: "Apresentação do novo modelo, dos recursos e do cronograma de implantação.",
    },
    {
      number: "02",
      title: "Definição dos responsáveis",
      description: "Cada unidade indica quem acompanhará configuração, treinamento e adoção.",
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
      description: "Entrada em operação com acompanhamento dos indicadores e ajustes contínuos.",
    },
  ];

  const unitActions: FeatureItem[] = [
    {
      title: "Indicar um responsável",
      description: "Definir o ponto de contato da unidade Cebrac durante a implantação.",
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
      title: "Participar do treinamento",
      description: "Garantir que gestores e equipe comercial conheçam o método e os recursos.",
      icon: CalendarCheck2,
      iconClass: "text-[#17a85b]",
    },
  ];
</script>

<svelte:head>
  <title>Rede Cebrac | CRM de Leads e WhatsApp integrado ao F10</title>
  <meta
    name="description"
    content="Apresentação exclusiva para as unidades Cebrac sobre o CRM de Leads, workflow comercial e WhatsApp integrado ao F10."
  />
  <meta name="robots" content="noindex,nofollow,noarchive,nosnippet" />
  <link rel="preload" as="image" href="/background-hero-cebrac.png" />
  <link rel="preload" as="image" href="/hero-cebrac.webp" type="image/webp" />
  <link rel="preload" as="image" href="/Logo-Cebrac.png" />
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
      <div class="relative z-20 max-w-[700px] lg:py-12">
        <div class="inline-flex max-w-full items-stretch overflow-hidden rounded-2xl border border-[#2B4091]/10 bg-white shadow-[0_14px_35px_rgba(43,64,145,0.13)]">
          <div class="flex items-center bg-[#2B4091] px-5 py-3.5 sm:px-6">
            <img src="/Logo-Cebrac.png" alt="Cebrac" class="h-9 w-auto object-contain sm:h-11" />
          </div>
          <div class="flex items-center px-4 py-3 text-[11px] font-extrabold uppercase leading-5 tracking-[0.12em] text-[#2B4091] sm:px-5 sm:text-xs">
            Apresentação exclusiva para a rede
          </div>
        </div>

        <div class="mt-8 inline-flex items-center rounded-full border border-orange-100 bg-orange-50 px-4 py-2 text-xs font-extrabold uppercase tracking-[0.16em] text-[#ff7900]">
          Novos recursos para as unidades Cebrac
        </div>

        <h1 class="mt-6 text-[43px] font-extrabold leading-[1.07] tracking-[-0.048em] sm:text-[57px] lg:text-[59px] xl:text-[66px]">
          <span class="text-[#ff7900]">CRM</span>
          <span class="text-[#06173e]"> e </span>
          <span class="text-[#14a458]">WhatsApp</span>
          <br />
          <span class="text-[#06173e]">integrados para a Rede Cebrac.</span>
        </h1>

        <p class="mt-7 max-w-[660px] text-lg font-medium leading-8 text-[#3d4d6b] sm:text-[21px] sm:leading-9">
          Gestão de leads com foco em matrícula, mais agilidade para as equipes e uma jornada organizada do primeiro contato ao relacionamento com o aluno.
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
          alt="CRM F10 para a Rede Cebrac exibido em um computador com atendimento integrado pelo WhatsApp"
          class="h-auto w-full max-w-[980px] object-contain drop-shadow-[0_32px_42px_rgba(14,37,83,0.18)]"
          fetchpriority="high"
        />
      </div>
    </div>
  </section>

  <section class="bg-[#2B4091] px-5 py-8 text-white sm:px-8 lg:px-12">
    <div class="mx-auto flex max-w-[1320px] flex-col items-center justify-between gap-6 text-center md:flex-row md:text-left">
      <div class="flex shrink-0 items-center rounded-2xl bg-white/10 px-6 py-4 ring-1 ring-white/15">
        <img src="/Logo-Cebrac.png" alt="Cebrac" class="h-11 w-auto object-contain" />
      </div>
      <div class="max-w-[820px]">
        <p class="text-xs font-extrabold uppercase tracking-[0.18em] text-white/60">Uma nova etapa para toda a rede</p>
        <p class="mt-2 text-xl font-semibold leading-8 sm:text-2xl">
          A Cebrac passa a contar com uma operação comercial mais organizada, mensurável e preparada para transformar oportunidades em matrículas.
        </p>
      </div>
      <img src="/logo_f10.svg" alt="F10 Software" class="h-12 w-auto shrink-0 brightness-0 invert" />
    </div>
  </section>

  <section class="border-b border-slate-200 bg-white px-5 py-6 sm:px-8 lg:px-12">
    <div class="mx-auto grid max-w-[1320px] divide-y divide-slate-200 sm:grid-cols-3 sm:divide-x sm:divide-y-0">
      <div class="px-5 py-5 text-center">
        <strong class="block text-2xl font-extrabold tracking-[-0.04em] text-[#ff7900] sm:text-3xl">CRM + Workflow</strong>
        <span class="mt-1 block text-sm font-medium text-slate-500">gestão de leads com foco em matrícula</span>
      </div>
      <div class="px-5 py-5 text-center">
        <strong class="block text-2xl font-extrabold tracking-[-0.04em] text-[#2B4091] sm:text-3xl">2 frentes</strong>
        <span class="mt-1 block text-sm font-medium text-slate-500">atendimento aos leads e aos alunos</span>
      </div>
      <div class="px-5 py-5 text-center">
        <strong class="block text-2xl font-extrabold tracking-[-0.04em] text-[#17a85b] sm:text-3xl">5 números</strong>
        <span class="mt-1 block text-sm font-medium text-slate-500">de WhatsApp incluídos por unidade Cebrac</span>
      </div>
    </div>
  </section>

  <section class="bg-[#f5f8fd] px-5 py-24 sm:px-8 lg:px-12 lg:py-32">
    <div class="mx-auto max-w-[1320px]">
      <div class="max-w-[930px]">
        <div class="inline-flex items-center gap-3">
          <span class="h-1 w-10 rounded-full bg-[#ff7900]"></span>
          <p class="text-xs font-extrabold uppercase tracking-[0.2em] text-[#2B4091]">Por que a Rede Cebrac está evoluindo</p>
        </div>
        <h2 class="mt-5 text-4xl font-extrabold leading-tight tracking-[-0.04em] text-[#06173e] sm:text-5xl lg:text-[58px]">
          Captar o lead é apenas o começo. O resultado vem do acompanhamento até a matrícula.
        </h2>
        <p class="mt-6 max-w-[850px] text-lg leading-8 text-slate-600">
          A nova estrutura combina método comercial e tecnologia para reduzir desperdícios, preservar o conhecimento das unidades e criar uma operação mais previsível em toda a Rede Cebrac.
        </p>
      </div>

      <div class="mt-14 grid gap-6 lg:grid-cols-2">
        {#each challenges as challenge}
          <article class="relative overflow-hidden rounded-[34px] border border-slate-200 bg-white p-8 shadow-[0_18px_55px_rgba(15,35,75,0.07)] sm:p-10">
            <div class="absolute right-7 top-6 text-6xl font-black tracking-[-0.08em] text-slate-100">
              {challenge.number}
            </div>
            <div class="relative">
              <div class="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#eef0fb] text-[#2B4091]">
                <svelte:component this={challenge.icon} size={27} strokeWidth={1.9} />
              </div>
              <h3 class="mt-7 max-w-[540px] text-3xl font-extrabold leading-tight tracking-[-0.035em] text-[#0b2e68]">
                {challenge.title}
              </h3>
              <p class="mt-5 max-w-[610px] text-base leading-7 text-slate-600">
                {challenge.description}
              </p>
              <div class="mt-7 space-y-3">
                {#each challenge.points as point}
                  <div class="flex items-center gap-3 text-sm font-semibold text-slate-600">
                    <CheckCircle2 size={19} class="shrink-0 text-[#17a85b]" />
                    <span>{point}</span>
                  </div>
                {/each}
              </div>
            </div>
          </article>
        {/each}
      </div>

      <div class="mt-8 rounded-[30px] bg-[#2B4091] px-7 py-8 text-white sm:px-10 lg:flex lg:items-center lg:justify-between lg:gap-10">
        <p class="max-w-[930px] text-xl font-semibold leading-8 tracking-[-0.02em] sm:text-2xl">
          O CRM não substitui o trabalho comercial da unidade Cebrac. Ele transforma o método em rotina, visibilidade e continuidade.
        </p>
        <div class="mt-6 flex shrink-0 items-center gap-3 lg:mt-0">
          <CheckCircle2 size={27} class="text-emerald-300" />
          <span class="text-sm font-bold text-white/75">Processo apoiado por dados</span>
        </div>
      </div>
    </div>
  </section>

  <section class="bg-white px-5 py-24 sm:px-8 lg:px-12 lg:py-32">
    <div class="mx-auto grid max-w-[1320px] items-center gap-14 lg:grid-cols-[0.92fr_1.08fr] lg:gap-20">
      <div>
        <div class="inline-flex rounded-full bg-orange-50 px-4 py-2 text-xs font-extrabold uppercase tracking-[0.16em] text-[#ff7900]">
          01 · CRM de Leads para as unidades Cebrac
        </div>
        <h2 class="mt-6 text-4xl font-extrabold leading-tight tracking-[-0.04em] text-[#06173e] sm:text-5xl">
          Gestão de leads com foco em matrícula.
        </h2>
        <p class="mt-6 text-lg leading-8 text-slate-600">
          O CRM F10 permite visualizar, organizar e acompanhar cada etapa da jornada do lead até a matrícula. Mais controle, produtividade e conversão para a equipe comercial Cebrac.
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
            Imagem do CRM Cebrac
          </strong>
          <span class="mt-2 max-w-[330px] text-sm leading-6 text-slate-500">
            Inserir captura real do funil Kanban configurado para a operação comercial da Rede Cebrac.
          </span>
        </div>
      </div>
    </div>

    <div class="mx-auto mt-14 max-w-[1320px] rounded-[30px] border border-orange-100 bg-orange-50 px-7 py-7 sm:flex sm:items-center sm:justify-between sm:gap-8 sm:px-9">
      <div>
        <strong class="text-lg font-extrabold text-[#8c3f00]">F10 CRM + método = mais matrículas todos os meses</strong>
        <p class="mt-1 text-sm leading-6 text-[#9a5721]">Processos bem definidos, equipe alinhada e nenhuma oportunidade perdida.</p>
      </div>
      <TrendingUp size={38} class="mt-5 shrink-0 text-[#ff7900] sm:mt-0" />
    </div>
  </section>

  <section class="bg-[#f3fbf6] px-5 py-24 sm:px-8 lg:px-12 lg:py-32">
    <div class="mx-auto max-w-[1320px]">
      <div class="mx-auto max-w-[950px] text-center">
        <div class="inline-flex rounded-full bg-white px-4 py-2 text-xs font-extrabold uppercase tracking-[0.16em] text-[#159552] shadow-sm">
          02 · WhatsApp integrado para a Rede Cebrac
        </div>
        <h2 class="mt-6 text-4xl font-extrabold leading-tight tracking-[-0.04em] text-[#06173e] sm:text-5xl">
          Um único canal. Duas frentes de atendimento.
        </h2>
        <p class="mx-auto mt-6 max-w-[850px] text-lg leading-8 text-slate-600">
          O WhatsApp será utilizado diretamente no CRM de Leads e no F10, conectando a captação comercial ao relacionamento com o aluno.
        </p>
      </div>

      <div class="mt-14 grid gap-6 lg:grid-cols-2">
        <article class="rounded-[34px] border border-blue-100 bg-white p-7 shadow-[0_16px_45px_rgba(15,35,75,0.06)] sm:p-9">
          <div class="flex items-center justify-between gap-4">
            <div>
              <p class="text-xs font-extrabold uppercase tracking-[0.16em] text-[#2B4091]">WhatsApp no CRM Leads</p>
              <h3 class="mt-2 text-2xl font-extrabold text-[#06173e]">Atendimento aos leads</h3>
            </div>
            <div class="flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-50 text-[#2B4091]">
              <MessagesSquare size={28} />
            </div>
          </div>

          <div class="mt-7 grid gap-4 sm:grid-cols-2">
            {#each crmWhatsAppFeatures as feature}
              <div class="rounded-2xl border border-slate-100 bg-[#f8fafc] p-5">
                <svelte:component this={feature.icon} size={23} strokeWidth={1.9} class={feature.iconClass} />
                <h4 class="mt-4 text-sm font-extrabold text-[#0b2e68]">{feature.title}</h4>
                <p class="mt-2 text-sm leading-6 text-slate-500">{feature.description}</p>
              </div>
            {/each}
          </div>
        </article>

        <article class="rounded-[34px] border border-emerald-100 bg-white p-7 shadow-[0_16px_45px_rgba(14,70,45,0.06)] sm:p-9">
          <div class="flex items-center justify-between gap-4">
            <div>
              <p class="text-xs font-extrabold uppercase tracking-[0.16em] text-[#159552]">WhatsApp no F10</p>
              <h3 class="mt-2 text-2xl font-extrabold text-[#06173e]">Atendimento completo aos alunos</h3>
            </div>
            <div class="flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-50 text-[#17a85b]">
              <MessageCircleMore size={28} />
            </div>
          </div>

          <div class="mt-7 grid gap-4 sm:grid-cols-2">
            {#each studentWhatsAppFeatures as feature}
              <div class="rounded-2xl border border-emerald-50 bg-[#f7fcf9] p-5">
                <svelte:component this={feature.icon} size={23} strokeWidth={1.9} class={feature.iconClass} />
                <h4 class="mt-4 text-sm font-extrabold text-[#0b2e68]">{feature.title}</h4>
                <p class="mt-2 text-sm leading-6 text-slate-500">{feature.description}</p>
              </div>
            {/each}
          </div>
        </article>
      </div>

      <div class="mt-8 grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <div class="image-placeholder aspect-[16/8] rounded-[30px] border-2 border-dashed border-slate-300 bg-slate-200/80 p-6 shadow-inner">
          <div class="flex h-full flex-col items-center justify-center rounded-[22px] border border-white/70 bg-white/20 text-center">
            <MessageCircleMore size={38} strokeWidth={1.5} class="text-slate-500" />
            <strong class="mt-4 text-sm font-extrabold uppercase tracking-[0.16em] text-slate-600">
              Imagem do WhatsApp integrado
            </strong>
            <span class="mt-2 max-w-[360px] text-sm leading-6 text-slate-500">
              Inserir captura real das conversas no CRM de Leads e no cadastro do aluno no F10.
            </span>
          </div>
        </div>

        <div class="grid gap-4">
          <div class="rounded-[26px] bg-[#17a85b] px-7 py-6 text-white">
            <strong class="text-2xl font-extrabold">5 números incluídos por unidade</strong>
            <p class="mt-2 text-sm leading-6 text-white/80">Os números poderão ser utilizados no CRM ou no F10, conforme a necessidade da unidade Cebrac.</p>
          </div>
          <div class="rounded-[26px] border border-[#2B4091]/10 bg-white px-7 py-6">
            <p class="text-xs font-extrabold uppercase tracking-[0.15em] text-[#2B4091]">Disponibilidade</p>
            <strong class="mt-2 block text-xl font-extrabold text-[#06173e]">WhatsApp no F10 a partir de agosto de 2026</strong>
            <p class="mt-2 text-sm leading-6 text-slate-500">O cronograma detalhado será comunicado às unidades durante a implantação.</p>
          </div>
        </div>
      </div>
    </div>
  </section>

  <section class="bg-white px-5 py-24 sm:px-8 lg:px-12 lg:py-32">
    <div class="mx-auto max-w-[1320px]">
      <div class="mx-auto max-w-[900px] text-center">
        <p class="text-xs font-extrabold uppercase tracking-[0.2em] text-[#2B4091]">O método comercial Cebrac</p>
        <h2 class="mt-5 text-4xl font-extrabold leading-tight tracking-[-0.04em] text-[#06173e] sm:text-5xl">
          Da captação à matrícula, a equipe sabe o que fazer.
        </h2>
        <p class="mt-6 text-lg leading-8 text-slate-600">
          A tecnologia organiza o fluxo. O método define ritmo, prioridade e qualidade para que as unidades trabalhem com mais consistência.
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
          <p class="text-xs font-extrabold uppercase tracking-[0.2em] text-[#2B4091]">O que muda nas unidades Cebrac</p>
          <h2 class="mt-5 text-4xl font-extrabold leading-tight tracking-[-0.04em] text-[#06173e] sm:text-5xl">
            Menos dependência de controles individuais. Mais clareza para toda a equipe.
          </h2>
          <p class="mt-6 text-lg leading-8 text-slate-600">
            O novo modelo substitui rotinas frágeis por um processo visível, rastreável e fácil de acompanhar.
          </p>
        </div>

        <div class="overflow-hidden rounded-[30px] border border-slate-200 bg-white shadow-[0_18px_55px_rgba(15,35,75,0.06)]">
          <div class="grid grid-cols-2 bg-[#2B4091] text-white">
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

  <section class="relative overflow-hidden bg-[#1f3278] px-5 py-24 text-white sm:px-8 lg:px-12 lg:py-32">
    <div class="pointer-events-none absolute inset-0">
      <div class="absolute -left-44 top-10 h-96 w-96 rounded-full bg-blue-300/10 blur-3xl"></div>
      <div class="absolute -right-44 bottom-0 h-96 w-96 rounded-full bg-orange-400/10 blur-3xl"></div>
    </div>

    <div class="relative mx-auto max-w-[1320px]">
      <div class="flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
        <div class="max-w-[910px]">
          <p class="text-xs font-extrabold uppercase tracking-[0.2em] text-[#ffb26e]">Benefícios para a Rede Cebrac</p>
          <h2 class="mt-5 text-4xl font-extrabold leading-tight tracking-[-0.04em] sm:text-5xl lg:text-[58px]">
            Mais controle para a gestão. Mais clareza para a equipe. Mais oportunidades convertidas.
          </h2>
        </div>
        <div class="flex shrink-0 items-center rounded-2xl bg-white/10 px-6 py-4 ring-1 ring-white/15">
          <img src="/Logo-Cebrac.png" alt="Cebrac" class="h-12 w-auto object-contain" />
        </div>
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
            <p class="mt-3 text-sm leading-6 text-white/60">{benefit.description}</p>
          </article>
        {/each}
      </div>
    </div>
  </section>

  <section class="bg-white px-5 py-24 sm:px-8 lg:px-12 lg:py-32">
    <div class="mx-auto max-w-[1320px]">
      <div class="grid gap-14 lg:grid-cols-[0.72fr_1.28fr] lg:gap-20">
        <div>
          <p class="text-xs font-extrabold uppercase tracking-[0.2em] text-[#2B4091]">Implantação na Rede Cebrac</p>
          <h2 class="mt-5 text-4xl font-extrabold leading-tight tracking-[-0.04em] text-[#06173e] sm:text-5xl">
            Uma adoção progressiva, acompanhada e orientada por etapas.
          </h2>
          <p class="mt-6 text-lg leading-8 text-slate-600">
            Cada unidade Cebrac será conduzida desde a preparação inicial até o início da operação, com treinamento e acompanhamento dos primeiros resultados.
          </p>

          <div class="image-placeholder mt-9 aspect-[16/9] rounded-[26px] border-2 border-dashed border-slate-300 bg-slate-200/80 p-5">
            <div class="flex h-full flex-col items-center justify-center rounded-[18px] border border-white/70 bg-white/20 text-center">
              <CalendarCheck2 size={34} strokeWidth={1.5} class="text-slate-500" />
              <strong class="mt-4 text-xs font-extrabold uppercase tracking-[0.15em] text-slate-600">
                Cronograma oficial Cebrac
              </strong>
              <span class="mt-2 max-w-[290px] text-xs leading-5 text-slate-500">
                Inserir o cronograma oficial assim que as datas de cada etapa forem aprovadas.
              </span>
            </div>
          </div>
        </div>

        <div class="relative">
          <div class="absolute bottom-8 left-[27px] top-8 hidden w-px bg-slate-300 sm:block"></div>
          <div class="space-y-4">
            {#each implementationSteps as step}
              <article class="relative rounded-3xl border border-slate-200 bg-[#f8fafc] p-6 sm:pl-24">
                <div class="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-[#2B4091] text-sm font-extrabold text-[#ffb26e] sm:absolute sm:left-0 sm:top-1/2 sm:mb-0 sm:-translate-x-1/2 sm:-translate-y-1/2">
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
      <div class="mx-auto max-w-[850px] text-center">
        <div class="mx-auto flex w-fit items-center rounded-2xl bg-[#2B4091] px-6 py-4 shadow-[0_14px_35px_rgba(43,64,145,0.18)]">
          <img src="/Logo-Cebrac.png" alt="Cebrac" class="h-11 w-auto object-contain" />
        </div>
        <p class="mt-8 text-xs font-extrabold uppercase tracking-[0.2em] text-[#2B4091]">Próximos passos das unidades</p>
        <h2 class="mt-5 text-4xl font-extrabold leading-tight tracking-[-0.04em] text-[#06173e] sm:text-5xl">
          O que cada unidade Cebrac precisa fazer agora.
        </h2>
        <p class="mt-6 text-lg leading-8 text-slate-600">
          A implantação começa com três definições simples para dar velocidade e organização às próximas etapas.
        </p>
      </div>

      <div class="mt-14 grid gap-5 md:grid-cols-3">
        {#each unitActions as action, index}
          <article class="rounded-[28px] border border-slate-200 bg-white p-8 shadow-[0_14px_40px_rgba(15,35,75,0.05)]">
            <div class="flex items-start justify-between gap-4">
              <div class="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#f5f8fd] p-3">
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
    <div class="mx-auto max-w-[1180px] overflow-hidden rounded-[42px] bg-gradient-to-br from-[#233879] via-[#2B4091] to-[#1c2d68] px-7 py-14 text-center text-white shadow-[0_30px_80px_rgba(43,64,145,0.28)] sm:px-12 sm:py-20">
      <div class="mx-auto flex w-fit items-center rounded-2xl bg-white/10 px-7 py-4 ring-1 ring-white/15">
        <img src="/Logo-Cebrac.png" alt="Cebrac" class="h-12 w-auto object-contain" />
      </div>
      <p class="mt-8 text-sm font-extrabold uppercase tracking-[0.18em] text-[#ffb26e]">Cebrac + F10</p>
      <h2 class="mx-auto mt-4 max-w-[940px] text-4xl font-extrabold leading-tight tracking-[-0.04em] sm:text-5xl">
        Método comercial, tecnologia integrada e uma Rede Cebrac preparada para crescer.
      </h2>
      <p class="mx-auto mt-6 max-w-[800px] text-base leading-7 text-white/70 sm:text-lg">
        O objetivo é transformar cada oportunidade em um processo acompanhado, mensurável e contínuo — do primeiro contato à matrícula e ao relacionamento com o aluno.
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
