<script lang="ts">
  import {
    ArrowRight,
    ArrowUp,
    BarChart3,
    CalendarCheck2,
    CheckCircle2,
    Clock3,
    FileText,
    Funnel,
    MessagesSquare,
    ShieldCheck,
    Target,
    TrendingUp,
    UserCheck,
    Workflow,
  } from "lucide-svelte";

  type IconComponent = typeof Target;

  type FeatureItem = {
    title: string;
    description: string;
    icon: IconComponent;
  };

  type ComparisonItem = {
    label: string;
    current: string;
    future: string;
  };

  type InvestmentRow = {
    cashShare: string;
    discount: string;
    monthlyValue: string;
    highlighted?: boolean;
  };

  type ImplementationStep = {
    number: string;
    title: string;
    description: string;
    owner: string;
  };

  const journeySteps = [
    "Lead recebido",
    "Distribuição",
    "Primeiro contato",
    "Follow-ups",
    "Negociação",
    "Matrícula",
    "Relacionamento no F10",
  ];

  const operationRisks: FeatureItem[] = [
    {
      title: "Retorno sem prazo definido",
      description: "O lead esfria quando ninguém sabe qual é a próxima ação ou quando ela deve acontecer.",
      icon: Clock3,
    },
    {
      title: "Conversa fora da operação",
      description: "O histórico fica preso em aparelhos, planilhas e canais que a gestão não acompanha.",
      icon: MessagesSquare,
    },
    {
      title: "Troca de colaboradores",
      description: "A negociação perde continuidade quando o contexto depende da memória de uma pessoa.",
      icon: UserCheck,
    },
    {
      title: "Gestão sem visibilidade",
      description: "Gargalos e oportunidades paradas só aparecem quando o momento de agir já passou.",
      icon: BarChart3,
    },
  ];

  const crmFeatures: FeatureItem[] = [
    {
      title: "Funil visual",
      description: "Cada oportunidade fica posicionada em uma etapa clara até a matrícula.",
      icon: Funnel,
    },
    {
      title: "Responsáveis e tarefas",
      description: "A equipe sabe quem deve agir, quando retornar e qual é a próxima ação.",
      icon: CalendarCheck2,
    },
    {
      title: "Histórico preservado",
      description: "Mensagens, observações, objeções e negociações permanecem na unidade.",
      icon: FileText,
    },
    {
      title: "Indicadores comerciais",
      description: "A gestão acompanha produtividade, conversão, atrasos e oportunidades paradas.",
      icon: BarChart3,
    },
  ];

  const benefits: FeatureItem[] = [
    {
      title: "Menos desperdício do investimento em marketing",
      description:
        "Mais oportunidades acompanhadas até uma conclusão e melhor aproveitamento do investimento que a unidade já realiza para gerar leads.",
      icon: Target,
    },
    {
      title: "Histórico que permanece na unidade",
      description:
        "Conversas, objeções, negociações e próximas ações continuam disponíveis mesmo quando a equipe muda.",
      icon: ShieldCheck,
    },
    {
      title: "Gestão com prioridades mais claras",
      description:
        "Indicadores mostram atrasos, gargalos e oportunidades que precisam de ação.",
      icon: TrendingUp,
    },
  ];

  const comparisonItems: ComparisonItem[] = [
    {
      label: "Atendimento",
      current: "Informações espalhadas em celulares, planilhas e anotações.",
      future: "Histórico centralizado e vinculado à oportunidade.",
    },
    {
      label: "Follow-up",
      current: "Retornos dependem da memória e da organização individual.",
      future: "Próxima atividade, responsável e prazo ficam registrados.",
    },
    {
      label: "Gestão",
      current: "Oportunidades paradas são percebidas tarde demais.",
      future: "Indicadores mostram atrasos, gargalos e prioridades.",
    },
    {
      label: "Troca de equipe",
      current: "Parte do contexto desaparece quando um colaborador sai.",
      future: "Outro profissional continua com o histórico preservado.",
    },
    {
      label: "Padronização",
      current: "Cada unidade utiliza controles e rotinas diferentes.",
      future: "A rede passa a operar com um processo comum, visível e mensurável.",
    },
  ];

  const metrics: FeatureItem[] = [
    {
      title: "Primeiro atendimento",
      description: "Tempo entre a entrada do lead e o primeiro retorno.",
      icon: Clock3,
    },
    {
      title: "Próxima atividade",
      description: "Oportunidades sem ação futura definida.",
      icon: CalendarCheck2,
    },
    {
      title: "Conversão",
      description: "Avanço entre as etapas até a matrícula.",
      icon: Funnel,
    },
    {
      title: "Produtividade",
      description: "Atividades e acompanhamentos realizados no período.",
      icon: BarChart3,
    },
  ];

  const investmentRows: InvestmentRow[] = [
    {
      cashShare: "100%",
      discount: "R$ 200",
      monthlyValue: "R$ 199",
      highlighted: true,
    },
    {
      cashShare: "80%",
      discount: "R$ 160",
      monthlyValue: "R$ 239",
    },
    {
      cashShare: "40%",
      discount: "R$ 80",
      monthlyValue: "R$ 319",
    },
    {
      cashShare: "20%",
      discount: "R$ 40",
      monthlyValue: "R$ 359",
    },
    {
      cashShare: "Sem uso",
      discount: "—",
      monthlyValue: "R$ 399",
    },
  ];

  const implementationSteps: ImplementationStep[] = [
    {
      number: "01",
      title: "Preparar",
      description: "Indicar o responsável local, os usuários e os números que participarão da operação.",
      owner: "Unidade",
    },
    {
      number: "02",
      title: "Configurar",
      description: "Estruturar acessos, workflow comercial e distribuição dos números de WhatsApp.",
      owner: "F10 + unidade",
    },
    {
      number: "03",
      title: "Treinar",
      description: "Capacitar vendedores, gestores e responsáveis pela operação.",
      owner: "F10",
    },
    {
      number: "04",
      title: "Operar",
      description: "Iniciar o uso com acompanhamento dos indicadores e ajustes necessários.",
      owner: "Rede + F10 + unidade",
    },
  ];
</script>

<svelte:head>
  <title>Rede Cebrac | Novo padrão comercial com CRM e WhatsApp</title>
  <meta
    name="description"
    content="Comunicado às unidades Cebrac sobre a incorporação do CRM de Leads F10, workflow comercial e WhatsApp integrado ao modelo operacional da rede."
  />
  <meta name="robots" content="noindex,nofollow,noarchive,nosnippet" />
  <link rel="preload" as="image" href="/background-hero-cebrac.png" />
  <link rel="preload" as="image" href="/hero-cebrac.webp" type="image/webp" />
  <link rel="preload" as="image" href="/Logo-Cebrac.png" />
</svelte:head>

<div class="page-shell overflow-hidden bg-white text-[#2B4091]">
  <section id="inicio" class="hero-section relative isolate overflow-hidden bg-white">
    <img
      src="/background-hero-cebrac.png"
      alt=""
      aria-hidden="true"
      class="pointer-events-none absolute inset-0 -z-20 h-full w-full object-cover object-center"
      fetchpriority="high"
    />

    <div class="hero-grid relative mx-auto grid w-full max-w-[1740px] items-center px-5 py-12 sm:px-8 sm:py-16 lg:min-h-[820px] lg:px-12 lg:py-14 xl:px-16">
      <div class="hero-copy relative z-30 max-w-[760px] lg:py-8">
        <div class="brand-lockup inline-flex max-w-full items-stretch overflow-hidden border border-[#2B4091]/15 bg-white/95 shadow-[0_14px_36px_rgba(43,64,145,0.12)] backdrop-blur-md">
          <div class="flex min-w-[150px] items-center justify-center bg-[#2B4091] px-5 py-3 sm:min-w-[180px] sm:px-7">
            <img src="/Logo-Cebrac.png" alt="Cebrac" class="h-9 w-auto object-contain sm:h-10" />
          </div>
          <div class="flex items-center px-5 py-3">
            <img src="/logo_f10.svg" alt="F10 Software" class="h-8 w-auto sm:h-9" />
          </div>
        </div>

        <p class="mt-8 text-xs font-extrabold uppercase tracking-[0.22em] text-[#f36b21]">
          Comunicado às unidades Cebrac
        </p>

        <h1 class="mt-5 max-w-[730px] text-[42px] font-semibold leading-[1.03] tracking-[-0.05em] text-[#2B4091] sm:text-[56px] lg:text-[62px] xl:text-[70px]">
          Um novo padrão para acompanhar cada oportunidade, até a matrícula.
        </h1>

        <p class="mt-7 max-w-[690px] text-lg font-medium leading-8 text-[#2B4091]/80 sm:text-[20px] sm:leading-9">
          A Rede Cebrac passa a incorporar ao modelo operacional das unidades o CRM de Leads F10, o workflow comercial e o WhatsApp integrado ao CRM e ao F10. O objetivo é criar um processo comum para acompanhar oportunidades, preservar históricos e ampliar a visibilidade da gestão.
        </p>

        <p class="mt-6 max-w-[690px] border-l-4 border-[#f36b21] bg-white/75 px-5 py-4 text-sm font-bold leading-6 text-[#2B4091] shadow-[0_12px_30px_rgba(43,64,145,0.08)] backdrop-blur-sm">
          Esta atualização será incorporada ao modelo operacional de todas as unidades da Rede Cebrac. Não se trata da contratação opcional de um módulo isolado.
        </p>

        <div class="hero-notes mt-9 grid gap-4 border-t border-[#2B4091]/15 pt-6 sm:grid-cols-3">
          <div>
            <span>Aplicação</span>
            <strong>Toda a rede</strong>
          </div>
          <div>
            <span>Implantação</span>
            <strong>Por etapas</strong>
          </div>
          <div>
            <span>WhatsApp no F10</span>
            <strong>Agosto de 2026</strong>
          </div>
        </div>
      </div>

      <div class="hero-visual pointer-events-none relative z-0 hidden items-center justify-end lg:flex" aria-hidden="true">
        <img
          src="/hero-cebrac.webp"
          alt=""
          class="relative z-0 h-auto w-full max-w-none object-contain drop-shadow-[0_28px_42px_rgba(43,64,145,0.18)]"
          fetchpriority="high"
        />
      </div>

      <figure class="hero-mobile-visual mt-10 lg:hidden">
        <img
          src="/hero-cebrac.webp"
          alt="CRM de Leads F10 e atendimento por WhatsApp integrados à operação Cebrac"
          class="block h-auto w-full object-contain"
        />
      </figure>
    </div>
  </section>

  <nav class="sticky top-0 z-40 border-b border-white/10 bg-[#2B4091]" aria-label="Navegação do comunicado">
    <div class="mx-auto flex max-w-[1480px] items-center justify-between gap-6 overflow-x-auto px-5 py-3 sm:px-8 lg:px-10">
      <img src="/Logo-Cebrac.png" alt="Cebrac" class="h-8 w-auto shrink-0" />
      <div class="nav-links ml-auto flex min-w-max items-center justify-end gap-1">
        <a href="#motivo" class="nav-link">Por que muda</a>
        <a href="#modelo" class="nav-link">Como funciona</a>
        <a href="#beneficios" class="nav-link">Benefícios</a>
        <a href="#investimento" class="nav-link">Investimento</a>
        <a href="#implantacao" class="nav-link">Implantação</a>
      </div>
    </div>
  </nav>

  <section id="motivo" class="scroll-mt-16 bg-white px-5 py-20 sm:px-8 lg:px-12 lg:py-24">
    <div class="mx-auto max-w-[1480px]">
      <div class="grid gap-14 lg:grid-cols-[0.72fr_1.28fr] lg:items-start lg:gap-24">
        <div>
          <p class="section-label">Por que a rede está mudando</p>
          <h2 class="section-title mt-4">Gerar leads não basta. Cada oportunidade precisa ter responsável, prazo e próxima ação.</h2>
          <p class="mt-6 max-w-[560px] text-lg leading-8 text-[#2B4091]/70">
            A unidade já investe para gerar oportunidades. O novo modelo foi estruturado para reduzir perdas entre a captação e a matrícula, organizando atendimentos e follow-ups em uma operação visível para a equipe e para a gestão.
          </p>
        </div>

        <div>
          <div class="journey-panel border border-[#2B4091]/12 bg-[#f6f8fc] px-6 py-7 sm:px-8 sm:py-8">
            <span class="text-xs font-extrabold uppercase tracking-[0.16em] text-[#f36b21]">Jornada acompanhada</span>
            <div class="journey-flow mt-7">
              {#each journeySteps as step, index}
                <div class="journey-item">
                  <span>{String(index + 1).padStart(2, "0")}</span>
                  <strong>{step}</strong>
                  {#if index < journeySteps.length - 1}
                    <span class="journey-arrow" aria-hidden="true">
                      <ArrowRight size={18} strokeWidth={1.9} />
                    </span>
                  {/if}
                </div>
              {/each}
            </div>
          </div>

          <div class="mt-8 grid gap-x-10 gap-y-0 sm:grid-cols-2">
            {#each operationRisks as risk}
              <article class="risk-row">
                <svelte:component this={risk.icon} size={24} strokeWidth={1.8} />
                <div>
                  <h3>{risk.title}</h3>
                  <p>{risk.description}</p>
                </div>
              </article>
            {/each}
          </div>
        </div>
      </div>
    </div>
  </section>

  <section id="modelo" class="scroll-mt-16 bg-[#2B4091] px-5 py-20 text-white sm:px-8 lg:px-12 lg:py-24">
    <div class="mx-auto max-w-[1480px]">
      <header class="mx-auto max-w-[900px] text-center">
        <p class="section-label text-[#ffcd40]">O novo modelo comercial</p>
        <h2 class="mt-4 text-[38px] font-semibold leading-[1.08] tracking-[-0.045em] text-white sm:text-[50px] lg:text-[58px]">
          Uma única operação para acompanhar o lead da entrada à matrícula — e manter o relacionamento depois dela.
        </h2>
        <p class="mx-auto mt-6 max-w-[820px] text-lg leading-8 text-white/70">
          CRM de Leads, workflow comercial e WhatsApp integrado conectam duas frentes de atendimento: a operação comercial no CRM e o relacionamento com alunos e responsáveis dentro do F10.
        </p>
      </header>

      <div class="mt-16 grid gap-12 lg:grid-cols-[0.82fr_1.18fr] lg:items-center lg:gap-20">
        <div>
          <p class="section-label text-[#ffcd40]">CRM e workflow</p>
          <h3 class="mt-4 max-w-[570px] text-[34px] font-semibold leading-[1.12] tracking-[-0.04em] text-white sm:text-[44px]">
            Cada oportunidade com etapa, responsável e próxima ação.
          </h3>

          <div class="mt-8 border-t border-white/15">
            {#each crmFeatures as feature}
              <article class="feature-line feature-line-dark">
                <div class="feature-icon feature-icon-yellow">
                  <svelte:component this={feature.icon} size={22} strokeWidth={1.9} />
                </div>
                <div>
                  <h4>{feature.title}</h4>
                  <p>{feature.description}</p>
                </div>
              </article>
            {/each}
          </div>
        </div>

        <figure class="crm-figure overflow-hidden border border-white/20 bg-white shadow-[0_28px_70px_rgba(0,0,0,0.24)]">
          <figcaption class="flex items-center gap-2 border-b border-[#2B4091]/10 bg-[#f6f8fc] px-5 py-3 text-[11px] font-extrabold uppercase tracking-[0.14em] text-[#2B4091]/55">
            <span class="h-2 w-2 rounded-full bg-[#61CE70]"></span>
            <span class="h-2 w-2 rounded-full bg-[#ffcd40]"></span>
            <span class="h-2 w-2 rounded-full bg-[#f36b21]"></span>
            <span class="ml-2">Visão Kanban do CRM</span>
          </figcaption>
          <img src="/f10_kanban.png" alt="Funil Kanban do CRM F10 com etapas, responsáveis e atividades" class="block h-auto w-full" />
        </figure>
      </div>
    </div>
  </section>

  <section id="beneficios" class="scroll-mt-16 bg-[#f7f8fc] px-5 py-20 sm:px-8 lg:px-12 lg:py-24">
    <div class="mx-auto max-w-[1480px]">
      <div class="grid gap-12 lg:grid-cols-[0.62fr_1.38fr] lg:items-start lg:gap-24">
        <div>
          <p class="section-label">O que a unidade passa a ganhar</p>
          <h2 class="section-title mt-4">Mais continuidade, controle e aproveitamento das oportunidades já captadas.</h2>
          <p class="mt-6 max-w-[560px] text-lg leading-8 text-[#2B4091]/70">
            O ganho esperado não vem apenas da tecnologia. Ele vem de um processo mais consistente: menos oportunidades sem continuidade, histórico preservado e indicadores que mostram onde a equipe precisa agir.
          </p>
        </div>

        <div class="benefit-columns">
          {#each benefits as benefit, index}
            <article class="benefit-column">
              <span class="benefit-number">0{index + 1}</span>
              <div class="feature-icon feature-icon-green">
                <svelte:component this={benefit.icon} size={24} strokeWidth={1.9} />
              </div>
              <h3>{benefit.title}</h3>
              <p>{benefit.description}</p>
            </article>
          {/each}
        </div>
      </div>

      <div class="mt-16 grid gap-5 border-y border-[#2B4091]/12 py-8 sm:grid-cols-2 lg:grid-cols-4">
        {#each metrics as metric}
          <article class="metric-item">
            <svelte:component this={metric.icon} size={22} strokeWidth={1.9} />
            <div>
              <strong>{metric.title}</strong>
              <span>{metric.description}</span>
            </div>
          </article>
        {/each}
      </div>
    </div>
  </section>

  <section id="comparacao" class="comparison-section scroll-mt-16 bg-white px-5 py-20 sm:px-8 lg:px-12 lg:py-24">
    <div class="mx-auto w-full max-w-[1480px]">
      <div class="grid gap-10 lg:grid-cols-[0.68fr_1.32fr] lg:items-end lg:gap-24">
        <div>
          <p class="section-label">Hoje × novo padrão</p>
          <h2 class="section-title mt-4 max-w-[610px]">O que muda na prática.</h2>
        </div>
        <p class="max-w-[780px] text-lg leading-8 text-[#2B4091]/70 lg:pb-1">
          Controles que hoje dependem da memória, dos aparelhos e da organização individual passam a fazer parte de um processo oficial, com histórico, responsáveis, prazos e acompanhamento.
        </p>
      </div>

      <div class="comparison-list mt-14 border-t border-[#2B4091]/14">
        <div class="comparison-header">
          <span>Área</span>
          <span>Hoje</span>
          <span>Com o novo padrão</span>
        </div>
        {#each comparisonItems as item}
          <article class="comparison-row">
            <strong>{item.label}</strong>
            <p>{item.current}</p>
            <p class="comparison-future"><CheckCircle2 size={18} strokeWidth={2} />{item.future}</p>
          </article>
        {/each}
      </div>
    </div>
  </section>

  <section id="whatsapp" class="model-whatsapp-section scroll-mt-16">
  <div class="whatsapp-container">
    <div class="whatsapp-heading">
      <div class="whatsapp-heading-copy">
        <p class="whatsapp-kicker">
          <img src="/icon_whatsapp_color.svg" alt="" aria-hidden="true" />
          <span>WhatsApp integrado · incluído no upgrade</span>
        </p>
        <h2>Cinco números incluídos para conectar o atendimento comercial ao relacionamento com alunos.</h2>
      </div>

      <p class="whatsapp-intro">
        Cada unidade receberá cinco números de WhatsApp. Durante a implantação, eles serão distribuídos entre o CRM de Leads e o F10 conforme a estrutura de atendimento da unidade.
      </p>
    </div>

    <div class="whatsapp-package">
      <div class="whatsapp-total">
        <strong>5</strong>
        <span>números de WhatsApp incluídos por unidade</span>
      </div>

      <div class="whatsapp-channel">
        <small>No CRM de Leads</small>
        <strong class="whatsapp-channel-title">Atendimento comercial</strong>
        <p>Novos leads, negociações e follow-ups ficam vinculados à oportunidade e ao histórico comercial.</p>
      </div>

      <div class="whatsapp-channel">
        <small>No F10</small>
        <strong class="whatsapp-channel-title">Relacionamento pós-matrícula</strong>
        <p>Alunos e responsáveis recebem avisos, orientações, cobranças e demais comunicações da unidade.</p>
      </div>

      <p class="whatsapp-distribution">
        <strong>Distribuição flexível.</strong> A unidade poderá usar, por exemplo, dois números no CRM e três no F10. A configuração será definida durante a implantação e poderá seguir a necessidade da operação.
      </p>
    </div>

    <div class="whatsapp-meta" aria-label="Condições do WhatsApp integrado">
      <div>
        <span>Disponibilidade no F10</span>
        <strong>Agosto de 2026</strong>
      </div>
      <div>
        <span>Número adicional</span>
        <strong>R$ 49,00 por número/mês</strong>
      </div>
      <div>
        <span>Uso dos números adicionais</span>
        <strong>CRM de Leads ou F10</strong>
      </div>
    </div>
  </div>
</section>

  <section id="investimento" class="scroll-mt-16 bg-[#f3f5fa] px-5 py-20 sm:px-8 lg:px-12 lg:py-24">
    <div class="mx-auto max-w-[1480px]">
      <div class="mb-12 grid gap-8 lg:grid-cols-[0.78fr_1.22fr] lg:items-end lg:gap-20">
        <div>
          <p class="section-label">Investimento e benefício F10 Cash</p>
          <h2 class="section-title mt-4">Investimento mensal e desconto recorrente via F10 Cash.</h2>
        </div>
        <p class="max-w-[760px] text-lg leading-8 text-[#2B4091]/70 lg:pb-1">
          O upgrade tem valor-base de R$ 399 por unidade/mês. O desconto recorrente é calculado conforme o percentual de recebimentos processados via F10 Cash no período anterior, limitado a R$ 200 por mês.
        </p>
      </div>

      <div class="investment-panel overflow-hidden border border-[#2B4091]/12 bg-white shadow-[0_22px_60px_rgba(43,64,145,0.10)]">
        <div class="investment-summary">
          <div class="investment-best">
            <span>Com 100% via F10 Cash</span>
            <strong>R$ 199<small>/mês</small></strong>
            <p>R$ 200 de desconto sobre o valor-base.</p>
          </div>

          <div class="investment-included">
            <span>Incluído no upgrade</span>
            <p>CRM de Leads, workflow comercial e cinco números de WhatsApp, que poderão ser distribuídos entre o CRM e o F10 conforme a operação da unidade.</p>
          </div>
        </div>

        <div class="investment-context">
          <div>
            <span>Valor-base sem desconto</span>
            <strong>R$ 399 por unidade/mês</strong>
          </div>
          <div>
            <span>Vigência financeira</span>
            <strong>A partir do vencimento de julho de 2026</strong>
          </div>
          <div>
            <span>WhatsApp no F10</span>
            <strong>Disponível a partir de agosto de 2026</strong>
          </div>
        </div>

        <div class="investment-table-title">
          <div>
            <span>Faixas recorrentes</span>
            <strong>Quanto maior o percentual de recebimentos via F10 Cash, menor o valor mensal</strong>
          </div>
          <Workflow size={28} strokeWidth={1.8} />
        </div>

        <div class="investment-table-header">
          <span>Recebimentos via F10 Cash</span>
          <span>Desconto mensal</span>
          <span>Valor mensal</span>
        </div>

        {#each investmentRows as row}
          <div class:investment-row-highlighted={row.highlighted} class="investment-row">
            <div class="investment-share">
              <strong>{row.cashShare}</strong>
              <small>{row.discount === "—" ? "Sem desconto" : `${row.discount} de desconto`}</small>
            </div>
            <span>{row.discount}</span>
            <strong>{row.monthlyValue}<small>/mês</small></strong>
          </div>
        {/each}

        <div class="investment-note">
          <p>As faixas acima representam o desconto recorrente do upgrade, calculado conforme o percentual de recebimentos via F10 Cash no período anterior. As condições especiais de lançamento serão comunicadas pela Rede Cebrac.</p>
          <p>O reajuste anual previsto para o período será substituído pelo valor do upgrade. Número adicional de WhatsApp: R$ 49,00 por número/mês, para uso no CRM ou no F10.</p>
        </div>
      </div>
    </div>
  </section>

  <section id="implantacao" class="scroll-mt-16 bg-[#2B4091] px-5 py-20 text-white sm:px-8 lg:px-12 lg:py-24">
    <div class="mx-auto max-w-[1480px]">
      <div class="grid gap-10 lg:grid-cols-[0.55fr_1.45fr] lg:items-end lg:gap-24">
        <div>
          <p class="section-label text-[#ffcd40]">Como começa</p>
          <h2 class="mt-4 text-[38px] font-semibold leading-[1.08] tracking-[-0.045em] text-white sm:text-[50px]">
            Quatro etapas até a operação.
          </h2>
        </div>
        <p class="max-w-[780px] text-lg leading-8 text-white/70 lg:pb-1">
          A implantação será realizada por etapas, com preparação das unidades, configuração da operação, treinamento das equipes e início acompanhado.
        </p>
      </div>

      <div class="implementation-grid mt-14">
        {#each implementationSteps as step}
          <article class="implementation-step">
            <span class="implementation-number">{step.number}</span>
            <small>{step.owner}</small>
            <h3>{step.title}</h3>
            <p>{step.description}</p>
          </article>
        {/each}
      </div>

      <div class="mt-14 flex flex-col gap-6 border-t border-white/15 pt-9 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <span class="text-xs font-extrabold uppercase tracking-[0.17em] text-[#ffcd40]">O que cada unidade deverá preparar</span>
          <p class="mt-3 max-w-[920px] text-xl font-semibold leading-8 text-white">
            Indicar o responsável local, informar os usuários, definir os cinco números de WhatsApp e participar dos treinamentos previstos.
          </p>
        </div>
        <div class="shrink-0 bg-[#ffcd40] px-6 py-4 text-sm font-extrabold text-[#2B4091]">
          Cronograma oficial será comunicado pela Rede Cebrac
        </div>
      </div>
    </div>
  </section>

  <footer class="bg-white px-5 py-14 sm:px-8 lg:px-12">
    <div class="mx-auto flex max-w-[1480px] flex-col gap-8 border-t border-[#2B4091]/12 pt-10 md:flex-row md:items-center md:justify-between">
      <div class="flex items-center gap-5">
        <img src="/Logo-Cebrac.png" alt="Cebrac" class="h-11 w-auto bg-[#2B4091] px-3 py-2" />
        <div class="h-8 w-px bg-[#2B4091]/15"></div>
        <img src="/logo_f10.svg" alt="F10 Software" class="h-9 w-auto" />
      </div>
      <p class="max-w-[760px] text-base font-semibold leading-7 text-[#2B4091]/70">
        A mudança incorpora à Rede Cebrac uma operação comercial comum, com mais continuidade, visibilidade e capacidade de acompanhamento.
      </p>
      <a href="#inicio" class="inline-flex items-center gap-2 text-sm font-extrabold text-[#2B4091] transition hover:text-[#61CE70]">
        Voltar ao início <ArrowUp size={18} />
      </a>
    </div>
  </footer>
</div>

<style>
  .page-shell {
    font-family: "Plus Jakarta Sans", ui-sans-serif, system-ui, sans-serif;
  }

  .hero-grid {
    grid-template-columns: minmax(0, 1fr);
  }

  .brand-lockup,
  .journey-panel,
  .crm-figure,
  .hero-mobile-visual,
  .investment-panel {
    border-radius: 0px;
  }

  .hero-mobile-visual {
    position: relative;
    z-index: 2;
    background: none;
    
  }

  .hero-notes div {
    display: grid;
    gap: 0.3rem;
  }

  .hero-notes span {
    color: rgba(43, 64, 145, 0.52);
    font-size: 0.68rem;
    font-weight: 800;
    letter-spacing: 0.12em;
    text-transform: uppercase;
  }

  .hero-notes strong {
    color: #2b4091;
    font-size: 0.95rem;
  }

  .hero-image-fade {
    position: absolute;
    inset: 0 auto 0 -12%;
    z-index: 1;
    width: 30%;
    background: linear-gradient(90deg, #ffffff 8%, rgba(255, 255, 255, 0.92) 38%, rgba(255, 255, 255, 0));
  }

  .nav-links {
    scrollbar-width: none;
  }

  .nav-links::-webkit-scrollbar {
    display: none;
  }

  .nav-link {
    flex: 0 0 auto;
    border-radius: 9999px;
    padding: 0.58rem 0.88rem;
    color: rgba(255, 255, 255, 0.72);
    font-size: 0.74rem;
    font-weight: 800;
    transition: background-color 160ms ease, color 160ms ease;
  }

  .nav-link:hover,
  .nav-link:focus-visible {
    background: #ffcd40;
    color: #2b4091;
    outline: none;
  }

  .section-label {
    color: #2b4091;
    font-size: 0.74rem;
    font-weight: 800;
    letter-spacing: 0.19em;
    text-transform: uppercase;
  }

  .section-title {
    color: #2b4091;
    font-size: clamp(2.35rem, 3.7vw, 3.7rem);
    font-weight: 600;
    letter-spacing: -0.045em;
    line-height: 1.08;
  }

  .journey-flow {
    display: grid;
    gap: 0;
  }

  .journey-item {
    position: relative;
    display: grid;
    grid-template-columns: 38px 1fr;
    gap: 0.85rem;
    align-items: center;
    min-height: 56px;
    border-bottom: 1px solid rgba(43, 64, 145, 0.1);
  }

  .journey-item:last-child {
    border-bottom: 0;
  }

  .journey-item > span {
    color: #f36b21;
    font-size: 0.75rem;
    font-weight: 800;
  }

  .journey-item strong {
    color: #2b4091;
    font-size: 0.95rem;
  }

  .journey-arrow {
    display: none;
  }

  .risk-row,
  .feature-line {
    display: grid;
    grid-template-columns: 44px 1fr;
    gap: 1rem;
    align-items: start;
    padding: 1.35rem 0;
    border-bottom: 1px solid rgba(43, 64, 145, 0.12);
  }

  .risk-row > :global(svg) {
    margin-top: 0.15rem;
    color: #2b4091;
  }

  .risk-row h3,
  .feature-line h4 {
    color: #2b4091;
    font-size: 1rem;
    font-weight: 700;
  }

  .risk-row p,
  .feature-line p {
    margin-top: 0.35rem;
    color: rgba(43, 64, 145, 0.65);
    font-size: 0.88rem;
    line-height: 1.55rem;
  }

  .feature-line-dark {
    border-color: rgba(255, 255, 255, 0.15);
  }

  .feature-line-dark h4 {
    color: white;
  }

  .feature-line-dark p {
    color: rgba(255, 255, 255, 0.63);
  }

  .feature-line-light {
    border-color: rgba(43, 64, 145, 0.12);
  }

  .feature-icon {
    display: flex;
    width: 42px;
    height: 42px;
    align-items: center;
    justify-content: center;
    border-radius: 12px;
    color: #2b4091;
  }

  .feature-icon-yellow {
    background: #ffcd40;
  }

  .feature-icon-green {
    background: rgba(97, 206, 112, 0.2);
  }

  .feature-line-dark .feature-icon-green {
    background: #61ce70;
  }

  .distribution-example {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 0.75rem;
    padding: 1.1rem;
    border-radius: 0px;
  }

  .distribution-example > span {
    grid-column: 1 / -1;
    font-size: 0.7rem;
    font-weight: 800;
    letter-spacing: 0.15em;
    text-transform: uppercase;
  }

  .distribution-example > div {
    display: grid;
    gap: 0.25rem;
    padding: 0.9rem;
    border-radius: 12px;
  }

  .distribution-example strong {
    font-size: 2rem;
    line-height: 1;
  }

  .distribution-example-light {
    border: 1px solid rgba(43, 64, 145, 0.12);
    background: rgba(255, 255, 255, 0.64);
  }

  .distribution-example-light > span {
    color: #2b4091;
  }

  .distribution-example-light > div {
    background: white;
  }

  .distribution-example-light strong {
    color: #2b4091;
  }

  .distribution-example-light small {
    color: rgba(43, 64, 145, 0.65);
  }

  .benefit-columns {
    display: grid;
    gap: 2.2rem;
  }

  .benefit-column {
    position: relative;
    padding: 0 0 2rem;
    border-bottom: 1px solid rgba(43, 64, 145, 0.12);
  }

  .benefit-number {
    position: absolute;
    right: 0;
    top: -0.35rem;
    color: rgba(43, 64, 145, 0.08);
    font-size: 3.5rem;
    font-weight: 700;
    line-height: 1;
  }

  .benefit-column h3 {
    margin-top: 1.25rem;
    color: #2b4091;
    font-size: 1.35rem;
    font-weight: 700;
  }

  .benefit-column p {
    margin-top: 0.75rem;
    max-width: 410px;
    color: rgba(43, 64, 145, 0.66);
    line-height: 1.75rem;
  }

  .metric-item {
    display: grid;
    grid-template-columns: 34px 1fr;
    gap: 0.8rem;
    color: #2b4091;
  }

  .metric-item strong,
  .metric-item span {
    display: block;
  }

  .metric-item strong {
    font-size: 0.95rem;
  }

  .metric-item span {
    margin-top: 0.25rem;
    color: rgba(43, 64, 145, 0.6);
    font-size: 0.8rem;
    line-height: 1.3rem;
  }

  .comparison-section {
    display: flex;
    align-items: center;
    min-height: 50svh;
  }

  .comparison-header,
  .comparison-row {
    display: grid;
    grid-template-columns: 0.36fr 0.82fr 0.82fr;
    gap: 1.4rem;
    align-items: center;
  }

  .comparison-header {
    padding: 0.95rem 1.35rem;
    background: #2b4091;
    color: white;
    font-size: 0.7rem;
    font-weight: 800;
    letter-spacing: 0.13em;
    text-transform: uppercase;
  }

  .comparison-row {
    min-height: 76px;
    padding: 1.45rem 1.35rem;
    border-bottom: 1px solid rgba(43, 64, 145, 0.11);
  }

  .comparison-row > strong {
    color: #2b4091;
    font-size: 0.92rem;
  }

  .comparison-row p {
    color: rgba(43, 64, 145, 0.62);
    font-size: 0.9rem;
    line-height: 1.55rem;
  }

  .comparison-future {
    display: flex;
    gap: 0.65rem;
    align-items: flex-start;
    color: #2b4091 !important;
    font-weight: 650;
  }

  .comparison-future :global(svg) {
    flex: 0 0 auto;
    margin-top: 0.18rem;
    color: #61ce70;
  }

  .investment-summary {
    display: grid;
    border-bottom: 1px solid rgba(43, 64, 145, 0.1);
  }

  .investment-best,
  .investment-included {
    padding: 1.75rem;
  }

  .investment-best {
    background: #2b4091;
    color: white;
  }

  .investment-included {
    background: white;
    color: #2b4091;
  }

  .investment-best > span,
  .investment-included > span,
  .investment-context span {
    display: block;
    font-size: 0.7rem;
    font-weight: 800;
    letter-spacing: 0.13em;
    text-transform: uppercase;
  }

  .investment-best > span {
    color: #ffcd40;
  }

  .investment-included > span,
  .investment-context span {
    color: rgba(43, 64, 145, 0.55);
  }

  .investment-best strong {
    display: block;
    margin-top: 0.55rem;
    font-size: clamp(2.8rem, 5vw, 4.5rem);
    font-weight: 600;
    letter-spacing: -0.06em;
    line-height: 1;
  }

  .investment-best small {
    margin-left: 0.28rem;
    font-size: 1rem;
    letter-spacing: 0;
  }

  .investment-best p,
  .investment-included p {
    margin-top: 0.7rem;
    font-size: 0.9rem;
    line-height: 1.55rem;
  }

  .investment-best p {
    color: rgba(255, 255, 255, 0.68);
  }

  .investment-included p {
    color: rgba(43, 64, 145, 0.63);
  }

  .investment-context {
    display: grid;
    border-bottom: 1px solid rgba(43, 64, 145, 0.1);
    background: #eef2fb;
  }

  .investment-context > div {
    padding: 1.15rem 1.5rem;
    border-bottom: 1px solid rgba(43, 64, 145, 0.08);
  }

  .investment-context > div:last-child {
    border-bottom: 0;
  }

  .investment-context strong {
    display: block;
    margin-top: 0.35rem;
    color: #2b4091;
    font-size: 0.95rem;
  }

  .investment-table-title {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 1rem;
    padding: 1.4rem 1.5rem;
    color: #2b4091;
  }

  .investment-table-title span,
  .investment-table-title strong {
    display: block;
  }

  .investment-table-title span {
    color: #f36b21;
    font-size: 0.7rem;
    font-weight: 800;
    letter-spacing: 0.14em;
    text-transform: uppercase;
  }

  .investment-table-title strong {
    margin-top: 0.3rem;
    font-size: 1.15rem;
  }

  .investment-table-header,
  .investment-row {
    display: grid;
    grid-template-columns: 1fr 0.9fr 0.48fr;
    gap: 1rem;
    align-items: center;
  }

  .investment-table-header {
    padding: 0.85rem 1.5rem;
    background: #2b4091;
    color: white;
    font-size: 0.68rem;
    font-weight: 800;
    letter-spacing: 0.12em;
    text-transform: uppercase;
  }

  .investment-row {
    min-height: 66px;
    padding: 0.95rem 1.5rem;
    border-bottom: 1px solid rgba(43, 64, 145, 0.1);
    color: #2b4091;
  }

  .investment-share {
    display: grid;
    gap: 0.25rem;
  }

  .investment-share small {
    display: none;
    color: rgba(43, 64, 145, 0.56);
    font-size: 0.72rem;
    font-weight: 500;
  }

  .investment-row > strong:last-child {
    color: #f36b21;
    font-size: 1.12rem;
    text-align: right;
  }

  .investment-row > strong:last-child small {
    margin-left: 0.18rem;
    color: rgba(243, 107, 33, 0.72);
    font-size: 0.72rem;
  }

  .investment-row > span {
    color: rgba(43, 64, 145, 0.58);
    font-size: 0.82rem;
  }

  .investment-row-highlighted {
    background: rgba(97, 206, 112, 0.12);
  }

  .investment-note {
    display: grid;
    gap: 0.35rem;
    padding: 1rem 1.5rem;
    background: #f6f8fc;
    color: rgba(43, 64, 145, 0.65);
    font-size: 0.78rem;
    line-height: 1.35rem;
  }

  .implementation-grid {
    display: grid;
    gap: 2rem;
  }

  .implementation-step {
    position: relative;
    padding-top: 1.3rem;
    border-top: 1px solid rgba(255, 255, 255, 0.16);
  }

  .implementation-number {
    display: flex;
    width: 48px;
    height: 48px;
    align-items: center;
    justify-content: center;
    margin-top: -3rem;
    border-radius: 9999px;
    background: #ffcd40;
    color: #2b4091;
    font-size: 0.75rem;
    font-weight: 800;
  }

  .implementation-step small {
    display: block;
    margin-top: 1rem;
    color: #61ce70;
    font-size: 0.66rem;
    font-weight: 800;
    letter-spacing: 0.12em;
    text-transform: uppercase;
  }

  .implementation-step h3 {
    margin-top: 0.35rem;
    color: white;
    font-size: 1.35rem;
    font-weight: 650;
  }

  .implementation-step p {
    margin-top: 0.6rem;
    color: rgba(255, 255, 255, 0.62);
    font-size: 0.88rem;
    line-height: 1.55rem;
  }

  @media (min-width: 640px) {
    .journey-flow {
      grid-template-columns: repeat(4, minmax(0, 1fr));
      gap: 1px;
      background: rgba(43, 64, 145, 0.1);
    }

    .journey-item {
      display: flex;
      min-height: 100px;
      flex-direction: column;
      align-items: flex-start;
      justify-content: center;
      gap: 0.45rem;
      padding: 1rem;
      border: 0;
      background: #f6f8fc;
    }

    .journey-item:nth-child(n + 5) {
      min-height: 90px;
    }

    .benefit-columns {
      grid-template-columns: repeat(3, minmax(0, 1fr));
      gap: 0;
    }

    .benefit-column {
      min-height: 280px;
      padding: 0 2rem 0;
      border-right: 1px solid rgba(43, 64, 145, 0.12);
      border-bottom: 0;
    }

    .benefit-column:first-child {
      padding-left: 0;
    }

    .benefit-column:last-child {
      padding-right: 0;
      border-right: 0;
    }

    .investment-summary {
      grid-template-columns: 0.82fr 1.68fr;
    }

    .investment-included {
      border-left: 1px solid rgba(43, 64, 145, 0.1);
    }

    .investment-context {
      grid-template-columns: repeat(3, minmax(0, 1fr));
    }

    .investment-context > div {
      border-right: 1px solid rgba(43, 64, 145, 0.08);
      border-bottom: 0;
    }

    .investment-context > div:last-child {
      border-right: 0;
    }
  }

  @media (min-width: 1024px) {
    .hero-grid {
      grid-template-columns: minmax(0, 0.88fr) minmax(0, 1.12fr);
      column-gap: 0;
    }

    .hero-visual {
      min-height: 720px;
      margin-left: -10rem;
      margin-right: -8rem;
    }

    .hero-visual img {
      width: 112%;
      transform: translateX(2%);
      transform-origin: center right;
    }

    .journey-flow {
      grid-template-columns: repeat(7, minmax(0, 1fr));
    }

    .journey-item,
    .journey-item:nth-child(n + 5) {
      min-height: 118px;
    }

    .journey-arrow {
      position: absolute;
      right: -10px;
      top: 50%;
      z-index: 2;
      display: block;
      color: #f36b21;
      transform: translateY(-50%);
    }

    .implementation-grid {
      grid-template-columns: repeat(4, minmax(0, 1fr));
      gap: 2.5rem;
      padding-top: 3rem;
    }
  }

  @media (max-width: 1023px) {
    .hero-grid {
      padding-bottom: 2.5rem;
    }

    .hero-mobile-visual img {
      width: 112%;
      max-width: none;
      transform: translateX(-4%);
    }
  }

  @media (max-width: 767px) {
    .comparison-section {
      min-height: auto;
    }

    .comparison-header {
      display: none;
    }

    .comparison-row {
      grid-template-columns: 1fr;
      gap: 0.65rem;
      min-height: 0;
      padding: 1.25rem 0;
    }

    .comparison-row > strong {
      color: #f36b21;
      font-size: 0.72rem;
      letter-spacing: 0.12em;
      text-transform: uppercase;
    }

    .comparison-row p::before {
      display: block;
      margin-bottom: 0.25rem;
      color: rgba(43, 64, 145, 0.45);
      font-size: 0.62rem;
      font-weight: 800;
      letter-spacing: 0.1em;
      text-transform: uppercase;
    }

    .comparison-row p:nth-child(2)::before {
      content: "Hoje";
    }

    .comparison-future::before {
      content: "Com o novo padrão";
    }

    .investment-table-header,
    .investment-row {
      grid-template-columns: 1fr auto;
    }

    .investment-table-header span:nth-child(2),
    .investment-row > span {
      display: none;
    }

    .investment-share small {
      display: block;
    }

    .investment-row > strong:last-child {
      text-align: right;
    }

    .investment-table-title :global(svg) {
      display: none;
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .page-shell *,
    .page-shell *::before,
    .page-shell *::after {
      scroll-behavior: auto !important;
      transition-duration: 0.01ms !important;
    }
  }

  :global(html) {
    scroll-behavior: smooth;
  }
</style>
