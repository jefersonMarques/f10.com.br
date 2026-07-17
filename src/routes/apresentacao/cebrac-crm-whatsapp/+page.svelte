<script lang="ts">
  import {
    ArrowUp,
    BarChart3,
    BellRing,
    Building2,
    CalendarCheck2,
    CheckCircle2,
    Clock3,
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
  } from "lucide-svelte";

  type IconComponent = typeof Target;

  type FeatureItem = {
    title: string;
    description: string;
    icon: IconComponent;
  };

  type ComparisonItem = {
    current: string;
    future: string;
  };

  type CampaignRow = {
    month: string;
    f10CashShare: string;
    turbo: string;
    totalDiscount: string;
    finalValue: string;
  };

  type ImplementationStep = {
    number: string;
    title: string;
    description: string;
    owner: string;
  };

  const benefits: FeatureItem[] = [
    {
      title: "Menos desperdício de marketing",
      description:
        "Mais oportunidades acompanhadas até uma conclusão, sem aumentar o investimento para gerar novos leads.",
      icon: Target,
    },
    {
      title: "Mais continuidade comercial",
      description:
        "O histórico permanece na unidade mesmo quando vendedores, gestores ou responsáveis mudam.",
      icon: ShieldCheck,
    },
    {
      title: "Mais produtividade",
      description:
        "A equipe enxerga quem precisa de retorno, qual é a próxima ação e há quanto tempo o lead está parado.",
      icon: Clock3,
    },
    {
      title: "Mais controle para a gestão",
      description:
        "Responsáveis, atividades, gargalos e conversões passam a ser acompanhados em uma única operação.",
      icon: BarChart3,
    },
    {
      title: "Mais previsibilidade",
      description:
        "A rede passa a trabalhar com um processo comercial comum, mensurável e mais fácil de evoluir.",
      icon: TrendingUp,
    },
    {
      title: "Maior potencial de matrículas",
      description:
        "O ganho esperado vem do melhor aproveitamento dos leads já captados e pagos pela unidade.",
      icon: CheckCircle2,
    },
  ];

  const comparisonItems: ComparisonItem[] = [
    {
      current: "Conversas espalhadas em celulares, planilhas e anotações",
      future: "Histórico centralizado e vinculado à operação da unidade",
    },
    {
      current: "Retornos dependem da memória e da organização individual",
      future: "Tarefas, alertas e próximas ações organizam os follow-ups",
    },
    {
      current: "O gestor descobre atrasos quando a oportunidade já esfriou",
      future: "Indicadores mostram leads parados, atrasos e gargalos",
    },
    {
      current: "A saída de um colaborador interrompe negociações",
      future: "Outro profissional continua com todo o contexto preservado",
    },
    {
      current: "Parte dos leads pagos pelo marketing não recebe continuidade",
      future: "Cada oportunidade possui responsável e próxima atividade",
    },
    {
      current: "Cada unidade trabalha com controles e rotinas diferentes",
      future: "A rede adota um padrão comercial comum e mensurável",
    },
  ];

  const crmFeatures: FeatureItem[] = [
    {
      title: "Funil visual",
      description:
        "Cada lead fica posicionado em uma etapa clara até a matrícula.",
      icon: Funnel,
    },
    {
      title: "Responsáveis e tarefas",
      description:
        "A equipe sabe quem deve agir, quando retornar e qual é a próxima ação.",
      icon: CalendarCheck2,
    },
    {
      title: "Histórico preservado",
      description:
        "Mensagens, observações, objeções e negociações permanecem na unidade.",
      icon: FileText,
    },
    {
      title: "Indicadores comerciais",
      description:
        "A gestão acompanha produtividade, conversão e oportunidades paradas.",
      icon: BarChart3,
    },
  ];

  const whatsappFeatures: FeatureItem[] = [
    {
      title: "Atendimento comercial",
      description:
        "Conversas com leads dentro do contexto da oportunidade no CRM.",
      icon: MessagesSquare,
    },
    {
      title: "Continuidade entre atendentes",
      description:
        "O atendimento não depende de um aparelho ou colaborador específico.",
      icon: UsersRound,
    },
    {
      title: "Relacionamento pós-matrícula",
      description: "Comunicação com alunos e responsáveis dentro do F10.",
      icon: MessageCircleMore,
    },
    {
      title: "Comunicação administrativa",
      description:
        "Avisos, orientações, cobranças e acordos em um canal organizado.",
      icon: BellRing,
    },
  ];

  const metrics: FeatureItem[] = [
    {
      title: "Tempo do primeiro atendimento",
      description: "Quanto tempo o lead espera até receber o primeiro retorno.",
      icon: Clock3,
    },
    {
      title: "Leads sem próxima atividade",
      description:
        "Oportunidades que precisam de uma ação definida pela equipe.",
      icon: CalendarCheck2,
    },
    {
      title: "Conversão entre etapas",
      description: "Avanço do lead ao longo do funil até a matrícula.",
      icon: Funnel,
    },
    {
      title: "Produtividade da equipe",
      description:
        "Atividades, contatos e acompanhamentos executados no período.",
      icon: BarChart3,
    },
  ];

  const campaignRows: CampaignRow[] = [
    {
      month: "Julho",
      f10CashShare: "0%",
      turbo: "20%",
      totalDiscount: "20%",
      finalValue: "R$ 359",
    },
    {
      month: "Agosto",
      f10CashShare: "20%",
      turbo: "15%",
      totalDiscount: "35%",
      finalValue: "R$ 329",
    },
    {
      month: "Setembro",
      f10CashShare: "50%",
      turbo: "10%",
      totalDiscount: "60%",
      finalValue: "R$ 279",
    },
    {
      month: "Outubro",
      f10CashShare: "70%",
      turbo: "5%",
      totalDiscount: "75%",
      finalValue: "R$ 245",
    },
  ];

  const implementationSteps: ImplementationStep[] = [
    {
      number: "01",
      title: "Preparar",
      description:
        "Indicar o responsável local, os usuários e os números que participarão da operação.",
      owner: "Unidade",
    },
    {
      number: "02",
      title: "Configurar",
      description:
        "Estruturar acessos, workflow comercial e distribuição dos números de WhatsApp.",
      owner: "F10 + unidade",
    },
    {
      number: "03",
      title: "Treinar",
      description:
        "Capacitar vendedores, gestores e responsáveis pela operação.",
      owner: "F10",
    },
    {
      number: "04",
      title: "Operar",
      description:
        "Iniciar o uso com acompanhamento dos indicadores e ajustes necessários.",
      owner: "Rede + F10 + unidade",
    },
  ];
</script>

<svelte:head>
  <title>Rede Cebrac | Novo padrão comercial com CRM e WhatsApp</title>
  <meta
    name="description"
    content="Comunicado às unidades Cebrac sobre o novo padrão comercial, investimento adicional, CRM de Leads, WhatsApp integrado e implantação na rede."
  />
  <meta name="robots" content="noindex,nofollow,noarchive,nosnippet" />
  <link rel="preload" as="image" href="/background-hero-cebrac.png" />
  <link rel="preload" as="image" href="/hero-cebrac.webp" type="image/webp" />
  <link rel="preload" as="image" href="/Logo-Cebrac.png" />
</svelte:head>

<div class="presentation-page overflow-hidden bg-white text-[#2B4091]">
  <section
    id="inicio"
    class="hero-section relative isolate overflow-hidden bg-white"
  >
    <img
      src="/background-hero-cebrac.png"
      alt=""
      aria-hidden="true"
      class="pointer-events-none absolute inset-0 -z-20 h-full w-full object-cover object-center"
      fetchpriority="high"
    />
    <div class="hero-orbit hero-orbit-left"></div>
    <div class="hero-orbit hero-orbit-right"></div>

    <div
      class="hero-grid mx-auto grid w-full max-w-[1660px] items-center px-5 py-12 sm:px-8 sm:py-16 lg:min-h-[100svh] lg:px-10 lg:py-10 xl:px-14"
    >
      <div class="hero-copy relative z-20 max-w-[760px] lg:py-10">
        <div
          class="inline-flex max-w-full items-stretch overflow-hidden rounded-[20px] border border-[#2B4091]/[0.15] bg-white/95 shadow-[0_16px_40px_rgba(43,64,145,0.14)] backdrop-blur-md"
        >
          <div
            class="flex min-w-[145px] items-center justify-center bg-[#2B4091] px-5 py-3 sm:min-w-[174px] sm:px-7"
          >
            <img
              src="/Logo-Cebrac.png"
              alt="Cebrac"
              class="h-9 w-auto object-contain sm:h-10"
            />
          </div>
          <div
            class="flex items-center px-4 py-3 text-[10px] font-extrabold uppercase leading-5 tracking-[0.13em] text-[#2B4091] sm:px-6 sm:text-xs"
          >
            Comunicado às unidades Cebrac
          </div>
        </div>

        <p
          class="mt-8 text-xs font-extrabold uppercase tracking-[0.22em] text-[#f36b21]"
        >
          Novo padrão comercial da rede
        </p>

        <h1
          class="mt-5 text-[42px] font-semibold leading-[1.02] tracking-[-0.05em] text-[#2B4091] sm:text-[56px] lg:text-[61px] xl:text-[70px]"
        >
          Mais controle sobre cada lead.
          <span class="relative mt-2 inline-block">
            Menos oportunidades perdidas.
            <span
              class="absolute -bottom-1 left-0 -z-10 h-3 w-full -rotate-1 rounded-full bg-[#ffcd40]/80"
            ></span>
          </span>
        </h1>

        <p
          class="mt-7 max-w-[700px] text-lg font-medium leading-8 text-[#2B4091]/80 sm:text-[21px] sm:leading-9"
        >
          A Rede Cebrac adotará CRM de Leads, workflow comercial e WhatsApp
          integrado ao F10 para padronizar a operação, preservar o histórico e
          aumentar o aproveitamento dos leads já captados pelas unidades.
        </p>

        <div
          class="mt-8 rounded-[24px] border border-[#2B4091]/[0.12] bg-white/90 p-5 shadow-[0_18px_48px_rgba(43,64,145,0.12)] backdrop-blur-md sm:p-6"
        >
          <div class="grid gap-5 sm:grid-cols-[1fr_auto] sm:items-center">
            <div>
              <span
                class="block text-xs font-extrabold uppercase tracking-[0.16em] text-[#f36b21]"
                >Aplicação em toda a rede</span
              >
              <p class="mt-2 text-base font-semibold leading-7 text-[#2B4091]">
                Esta atualização será incorporada ao modelo operacional das
                unidades. Não se trata de uma contratação opcional ou de um
                módulo isolado.
              </p>
            </div>
            <div class="rounded-[18px] bg-[#2B4091] px-5 py-4 text-white">
              <span
                class="block text-[11px] font-extrabold uppercase tracking-[0.15em] text-[#ffcd40]"
                >Vigência financeira</span
              >
              <strong class="mt-1 block text-lg"
                >Vencimento de julho/2026</strong
              >
            </div>
          </div>
        </div>
      </div>

      <div
        class="hero-visual relative z-10 hidden items-center justify-end lg:flex"
      >
        <img
          src="/hero-cebrac.webp"
          alt="CRM F10 para a Rede Cebrac exibido em computador e atendimento integrado pelo WhatsApp"
          class="h-auto object-contain drop-shadow-[0_34px_48px_rgba(43,64,145,0.20)]"
          fetchpriority="high"
        />
      </div>
    </div>
  </section>

  <nav
    class="presentation-nav sticky top-0 z-40 bg-[#2B4091]"
    aria-label="Navegação do comunicado"
  >
    <div
      class="mx-auto flex max-w-[1320px] items-center gap-5 overflow-x-auto px-5 py-3 sm:px-8"
    >
      <img
        src="/Logo-Cebrac.png"
        alt=""
        aria-hidden="true"
        class="hidden h-8 w-auto shrink-0 lg:block"
      />
      <div class="presentation-nav-links flex min-w-max items-center gap-1">
        <a href="#investimento" class="presentation-nav-link">Investimento</a>
        <a href="#porque" class="presentation-nav-link">Por que muda</a>
        <a href="#beneficios" class="presentation-nav-link">Benefícios</a>
        <a href="#comparacao" class="presentation-nav-link"
          >Hoje × novo padrão</a
        >
        <a href="#recursos" class="presentation-nav-link">Recursos</a>
        <a href="#incentivo" class="presentation-nav-link">Incentivo</a>
        <a href="#implantacao" class="presentation-nav-link">Implantação</a>
      </div>
    </div>
  </nav>

  <section
    id="investimento"
    class="relative scroll-mt-16 overflow-hidden bg-[#2B4091] px-5 py-20 text-white sm:px-8 lg:px-12 lg:py-28"
  >
    <div class="investment-glow investment-glow-one"></div>
    <div class="investment-glow investment-glow-two"></div>

    <div class="relative mx-auto max-w-[1260px]">
      <div
        class="grid gap-12 lg:grid-cols-[0.82fr_1.18fr] lg:items-center lg:gap-20"
      >
        <div>
          <p class="section-label section-label-light">
            O que muda no investimento
          </p>
          <h2
            class="mt-4 text-[40px] font-semibold leading-[1.05] tracking-[-0.045em] text-white sm:text-[52px] lg:text-[60px]"
          >
            Um novo valor para uma nova estrutura comercial.
          </h2>
          <p class="mt-6 max-w-[570px] text-lg leading-8 text-white/70">
            O investimento adicional financia uma mudança de operação: processo
            comercial padronizado, tecnologia integrada, implantação,
            treinamento e acompanhamento inicial.
          </p>

          <div class="mt-8 border-l-4 border-[#f36b21] pl-5">
            <p class="text-base font-semibold leading-7 text-white">
              O reajuste anual previsto para o período será substituído pelo
              valor do upgrade.
            </p>
          </div>
        </div>

        <div
          class="investment-card overflow-hidden rounded-[34px] bg-white text-[#2B4091] shadow-[0_34px_90px_rgba(0,0,0,0.24)]"
        >
          <div
            class="border-b border-[#2B4091]/10 px-6 py-5 sm:px-8"
          >
            <span
              class="text-xs font-extrabold uppercase tracking-[0.17em] text-[#f36b21]"
              >Investimento adicional</span
            >
          </div>

          <div class="grid gap-0 lg:grid-cols-[0.92fr_1.08fr]">
            <div class="bg-[#fff7f1] px-6 py-8 sm:px-8">
              <div class="flex items-end gap-2">
                <span class="pb-2 text-lg font-extrabold text-[#f36b21]"
                  >R$</span
                >
                <strong
                  class="text-[72px] font-semibold leading-none tracking-[-0.065em] text-[#f36b21] sm:text-[84px]"
                  >399</strong
                >
                <span class="pb-2 text-lg font-extrabold text-[#f36b21]"
                  >,00</span
                >
              </div>
              <p class="mt-2 text-sm font-semibold text-[#2B4091]/[0.65]">
                por unidade/mês
              </p>

              <div
                class="mt-7 rounded-[18px] bg-white p-4 shadow-[0_12px_30px_rgba(43,64,145,0.08)]"
              >
                <span
                  class="block text-xs font-extrabold uppercase tracking-[0.14em] text-[#2B4091]/[0.55]"
                  >Número adicional</span
                >
                <strong class="mt-1 block text-2xl text-[#2B4091]"
                  >R$ 49,00/mês</strong
                >
                <span class="mt-1 block text-sm text-[#2B4091]/60"
                  >por número extra no CRM ou F10</span
                >
              </div>
            </div>

            <div class="px-6 py-8 sm:px-8">
              <p
                class="text-sm font-extrabold uppercase tracking-[0.14em] text-[#2B4091]"
              >
                Incluído no novo valor
              </p>
              <ul class="mt-5 space-y-4">
                <li class="investment-list-item">
                  <CheckCircle2 size={20} />CRM de Leads e workflow comercial
                </li>
                <li class="investment-list-item">
                  <CheckCircle2 size={20} />Cinco números de WhatsApp por unidade
                </li>
                <li class="investment-list-item">
                  <CheckCircle2 size={20} />Configuração de acessos e processo
                </li>
                <li class="investment-list-item">
                  <CheckCircle2 size={20} />Treinamento de gestores e equipes
                </li>
                <li class="investment-list-item">
                  <CheckCircle2 size={20} />Acompanhamento inicial da operação
                </li>
              </ul>

              <div
                class="mt-7 rounded-[18px] border border-[#2B4091]/[0.12] bg-[#f7f8fc] p-4"
              >
                <span
                  class="block text-xs font-extrabold uppercase tracking-[0.14em] text-[#2B4091]/[0.55]"
                  >Disponibilidade do WhatsApp no F10</span
                >
                <strong class="mt-1 block text-lg text-[#2B4091]"
                  >A partir de agosto de 2026</strong
                >
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </section>

  <section
    id="porque"
    class="relative scroll-mt-16 overflow-hidden bg-white px-5 py-20 sm:px-8 lg:px-12 lg:py-28"
  >
    <div class="summary-shape"></div>
    <div class="relative mx-auto max-w-[1260px]">
      <div
        class="grid gap-14 lg:grid-cols-[0.72fr_1.28fr] lg:items-start lg:gap-24"
      >
        <div class="lg:sticky lg:top-24">
          <p class="section-label">Por que existe um investimento adicional</p>
          <h2 class="section-title mt-4">
            O custo do CRM é visível. O custo dos leads perdidos normalmente não
            é.
          </h2>
          <p
            class="mt-6 max-w-[520px] text-lg leading-8 text-[#2B4091]/[0.72]"
          >
            A unidade já investe para gerar oportunidades. O novo modelo foi
            criado para reduzir perdas durante o caminho entre a captação e a
            matrícula.
          </p>
        </div>

        <div>
          <div
            class="rounded-[30px] border border-[#2B4091]/[0.12] bg-[#f7f8fc] p-6 shadow-[0_22px_60px_rgba(43,64,145,0.08)] sm:p-8"
          >
            <span
              class="text-xs font-extrabold uppercase tracking-[0.15em] text-[#f36b21]"
              >Exemplo ilustrativo</span
            >
            <div class="mt-6 grid gap-4 sm:grid-cols-3">
              <article class="impact-card">
                <strong>R$ 10 mil</strong>
                <span>investidos em marketing</span>
              </article>
              <article class="impact-card">
                <strong>500</strong>
                <span>leads captados</span>
              </article>
              <article class="impact-card impact-card-alert">
                <strong>40</strong>
                <span
                  >oportunidades sem continuidade se 8% forem esquecidas</span
                >
              </article>
            </div>

            <div
              class="mt-7 rounded-[22px] bg-[#2B4091] px-5 py-5 text-white sm:px-6"
            >
              <p class="text-lg font-semibold leading-8">
                A atualização não tem como objetivo apenas gerar mais leads. Ela
                busca aumentar o aproveitamento das oportunidades que a unidade
                já recebe.
              </p>
            </div>
          </div>

          <div class="mt-10 grid gap-5 sm:grid-cols-2">
            <article class="problem-card">
              <TimerReset size={28} />
              <h3>Retornos fora do prazo</h3>
              <p>
                O lead esfria quando não existe uma próxima ação definida.
              </p>
            </article>
            <article class="problem-card">
              <MessagesSquare size={28} />
              <h3>Conversas fora da operação</h3>
              <p>
                Históricos ficam presos em celulares pessoais e canais
                separados.
              </p>
            </article>
            <article class="problem-card">
              <UserCheck size={28} />
              <h3>Troca de colaboradores</h3>
              <p>
                Negociações perdem continuidade quando o contexto não está
                registrado.
              </p>
            </article>
            <article class="problem-card">
              <Building2 size={28} />
              <h3>Gestão sem visibilidade</h3>
              <p>
                O gestor não enxerga gargalos, atrasos e oportunidades paradas.
              </p>
            </article>
          </div>
        </div>
      </div>
    </div>
  </section>

  <section
    id="beneficios"
    class="relative scroll-mt-16 overflow-hidden bg-[#fff8e4] px-5 py-20 sm:px-8 lg:px-12 lg:py-28"
  >
    <div class="benefit-ring benefit-ring-one"></div>
    <div class="benefit-ring benefit-ring-two"></div>

    <div class="relative mx-auto max-w-[1260px]">
      <div class="mx-auto max-w-[900px] text-center">
        <p class="section-label">O que a unidade passa a ganhar</p>
        <h2 class="section-title mt-4">
          O benefício vem do processo. A tecnologia é o meio.
        </h2>
        <p
          class="mx-auto mt-6 max-w-[760px] text-lg leading-8 text-[#2B4091]/[0.72]"
        >
          O resultado não depende apenas de instalar um sistema. Ele vem da
          combinação entre método comercial, rotina de acompanhamento e
          informação disponível para a gestão.
        </p>
      </div>

      <div class="mt-14 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
        {#each benefits as benefit, index}
          <article class="benefit-card">
            <div class="benefit-card-topline"></div>
            <span class="benefit-index">0{index + 1}</span>
            <div class="benefit-icon">
              <svelte:component
                this={benefit.icon}
                size={25}
                strokeWidth={1.9}
              />
            </div>
            <h3>{benefit.title}</h3>
            <p>{benefit.description}</p>
          </article>
        {/each}
      </div>
    </div>
  </section>

  <section
    id="comparacao"
    class="relative scroll-mt-16 overflow-hidden bg-[#ffcd40] px-5 py-20 sm:px-8 lg:px-12 lg:py-28"
  >
    <div class="comparison-ring comparison-ring-one"></div>
    <div class="comparison-ring comparison-ring-two"></div>

    <div class="relative mx-auto max-w-[1260px]">
      <div
        class="grid gap-8 lg:grid-cols-[0.7fr_1.3fr] lg:items-end lg:gap-20"
      >
        <div>
          <p class="section-label">Hoje × novo padrão</p>
          <h2 class="section-title mt-4">
            O que deixa de depender das pessoas e passa a fazer parte do
            processo.
          </h2>
        </div>
        <p
          class="max-w-[760px] text-lg leading-8 text-[#2B4091]/75 lg:pb-1"
        >
          A mudança substitui controles individuais por uma operação visível,
          contínua e padronizada em toda a rede.
        </p>
      </div>

      <div
        class="mt-14 overflow-hidden rounded-[32px] bg-white/95 shadow-[0_24px_60px_rgba(43,64,145,0.16)]"
      >
        <div class="grid grid-cols-2 bg-[#2B4091] text-white">
          <div
            class="border-r border-white/[0.15] px-5 py-4 text-sm font-extrabold uppercase tracking-[0.14em] sm:px-8"
          >
            Hoje
          </div>
          <div
            class="px-5 py-4 text-sm font-extrabold uppercase tracking-[0.14em] text-[#ffcd40] sm:px-8"
          >
            Com o novo padrão
          </div>
        </div>
        {#each comparisonItems as item}
          <div class="grid grid-cols-2 border-t border-[#2B4091]/10">
            <div
              class="border-r border-[#2B4091]/10 px-5 py-6 text-sm leading-6 text-[#2B4091]/[0.65] sm:px-8"
            >
              {item.current}
            </div>
            <div
              class="px-5 py-6 text-sm font-semibold leading-6 text-[#2B4091] sm:px-8"
            >
              <span class="mr-2 text-[#61CE70]">✓</span>{item.future}
            </div>
          </div>
        {/each}
      </div>
    </div>
  </section>

  <section
    class="scroll-mt-16 bg-white px-5 py-20 sm:px-8 lg:px-12 lg:py-28"
  >
    <div class="mx-auto max-w-[1260px]">
      <div
        class="grid gap-12 lg:grid-cols-[0.78fr_1.22fr] lg:items-center lg:gap-20"
      >
        <div>
          <p class="section-label">Continuidade comercial</p>
          <h2 class="section-title mt-4">
            Quando um vendedor sai, as negociações não podem sair com ele.
          </h2>
          <p class="mt-6 text-lg leading-8 text-[#2B4091]/[0.72]">
            Sem uma operação centralizada, parte do conhecimento comercial fica
            na memória do vendedor, em conversas pessoais ou em anotações
            individuais.
          </p>
          <p class="mt-4 text-lg leading-8 text-[#2B4091]/[0.72]">
            Com o CRM, históricos, objeções, propostas, atividades e próximos
            passos permanecem na unidade. Outro colaborador consegue assumir a
            negociação sem começar do zero.
          </p>
        </div>

        <div class="turnover-board">
          <div class="turnover-column turnover-column-current">
            <span>Sem CRM e método</span>
            <div class="turnover-flow">
              <UserCheck size={28} />
              <strong>Colaborador sai</strong>
              <span>→</span>
              <strong>Contexto desaparece</strong>
              <span>→</span>
              <strong>Negociação é interrompida</strong>
            </div>
          </div>
          <div class="turnover-column turnover-column-future">
            <span>Com CRM e método</span>
            <div class="turnover-flow">
              <ShieldCheck size={28} />
              <strong>Colaborador sai</strong>
              <span>→</span>
              <strong>Histórico permanece</strong>
              <span>→</span>
              <strong>Atendimento continua</strong>
            </div>
          </div>
        </div>
      </div>
    </div>
  </section>

  <section
    id="recursos"
    class="relative scroll-mt-16 overflow-hidden bg-[#2B4091] px-5 py-20 text-white sm:px-8 lg:px-12 lg:py-28"
  >
    <div class="crm-sun"></div>
    <div class="relative mx-auto max-w-[1260px]">
      <div class="mx-auto max-w-[900px] text-center">
        <p class="section-label section-label-light">O que será entregue</p>
        <h2
          class="mt-4 text-[40px] font-semibold leading-[1.05] tracking-[-0.045em] text-white sm:text-[52px] lg:text-[60px]"
        >
          CRM de Leads, workflow comercial e WhatsApp integrado.
        </h2>
        <p
          class="mx-auto mt-6 max-w-[760px] text-lg leading-8 text-white/70"
        >
          Os recursos foram organizados para acompanhar a jornada desde a
          entrada do lead até o relacionamento com o aluno depois da matrícula.
        </p>
      </div>

      <div
        class="mt-16 grid items-center gap-12 lg:grid-cols-[0.9fr_1.1fr] lg:gap-16"
      >
        <div>
          <p class="section-label section-label-light">CRM e workflow</p>
          <h3
            class="mt-4 text-[34px] font-semibold leading-[1.08] tracking-[-0.04em] text-white sm:text-[44px]"
          >
            Cada oportunidade com etapa, responsável e próxima ação.
          </h3>

          <div
            class="mt-8 divide-y divide-white/[0.15] border-y border-white/[0.15]"
          >
            {#each crmFeatures as feature}
              <div class="resource-row">
                <div class="resource-icon">
                  <svelte:component
                    this={feature.icon}
                    size={22}
                    strokeWidth={1.9}
                  />
                </div>
                <div>
                  <h4>{feature.title}</h4>
                  <p>{feature.description}</p>
                </div>
              </div>
            {/each}
          </div>
        </div>

        <div class="kanban-frame">
          <div class="media-toolbar">
            <span></span><span></span><span></span>
            <small>Visão Kanban do CRM</small>
          </div>
          <img
            src="/f10_kanban.png"
            alt="Tela real do CRM F10 com etapas do funil comercial em formato Kanban"
            loading="lazy"
          />
        </div>
      </div>

      <div class="mt-24 border-t border-white/[0.15] pt-16">
        <div
          class="grid gap-12 lg:grid-cols-[0.72fr_1.28fr] lg:items-start lg:gap-20"
        >
          <div>
            <p class="section-label section-label-light">WhatsApp integrado</p>
            <h3
              class="mt-4 text-[34px] font-semibold leading-[1.08] tracking-[-0.04em] text-white sm:text-[44px]"
            >
              Cinco números por unidade, distribuídos conforme a operação.
            </h3>
            <p class="mt-6 text-lg leading-8 text-white/70">
              Os números poderão ser utilizados no CRM de Leads ou no F10. A
              distribuição será definida pela unidade durante a implantação.
            </p>

            <div class="mt-7 rounded-[20px] bg-white/10 p-5">
              <span
                class="text-xs font-extrabold uppercase tracking-[0.15em] text-[#ffcd40]"
                >Exemplo de distribuição</span
              >
              <div class="mt-4 grid grid-cols-2 gap-3">
                <div class="distribution-box">
                  <strong>2</strong><span>números no CRM</span>
                </div>
                <div class="distribution-box">
                  <strong>3</strong><span>números no F10</span>
                </div>
              </div>
            </div>
          </div>

          <div class="grid gap-5 sm:grid-cols-2">
            {#each whatsappFeatures as feature}
              <article class="whatsapp-feature-card">
                <div class="whatsapp-feature-icon">
                  <svelte:component
                    this={feature.icon}
                    size={24}
                    strokeWidth={1.9}
                  />
                </div>
                <h4>{feature.title}</h4>
                <p>{feature.description}</p>
              </article>
            {/each}
          </div>
        </div>
      </div>
    </div>
  </section>

  <section
    class="scroll-mt-16 bg-white px-5 py-20 sm:px-8 lg:px-12 lg:py-28"
  >
    <div class="mx-auto max-w-[1260px]">
      <div class="grid gap-14 lg:grid-cols-[0.65fr_1.35fr] lg:gap-24">
        <div>
          <p class="section-label">Como a gestão acompanha</p>
          <h2 class="section-title mt-4">
            Poucos indicadores. Perguntas claras.
          </h2>
          <p
            class="mt-6 max-w-[500px] text-lg leading-8 text-[#2B4091]/[0.72]"
          >
            O acompanhamento mostra onde a equipe precisa agir e se o processo
            está realmente avançando.
          </p>
        </div>

        <div class="metric-lines">
          {#each metrics as metric, index}
            <div class="metric-line">
              <span class="metric-index">0{index + 1}</span>
              <div class="metric-icon">
                <svelte:component
                  this={metric.icon}
                  size={24}
                  strokeWidth={1.9}
                />
              </div>
              <div>
                <h3>{metric.title}</h3>
                <p>{metric.description}</p>
              </div>
            </div>
          {/each}
        </div>
      </div>
    </div>
  </section>

  <section
    id="incentivo"
    class="relative scroll-mt-16 overflow-hidden bg-[#f5f7ff] px-5 py-20 sm:px-8 lg:px-12 lg:py-28"
  >
    <div class="incentive-shape"></div>
    <div class="relative mx-auto max-w-[1260px]">
      <div
        class="grid gap-12 lg:grid-cols-[0.72fr_1.28fr] lg:items-start lg:gap-20"
      >
        <div>
          <p class="section-label">Campanha de incentivo</p>
          <h2 class="section-title mt-4">
            Como a unidade pode reduzir o impacto do novo valor.
          </h2>
          <p class="mt-6 text-lg leading-8 text-[#2B4091]/[0.72]">
            O valor-base do upgrade é de R$ 399 por mês. Unidades que concentram
            recebimentos no F10 Cash poderão obter desconto conforme as regras
            da campanha vigente.
          </p>

          <div
            class="mt-8 rounded-[24px] bg-[#2B4091] p-6 text-white shadow-[0_18px_45px_rgba(43,64,145,0.18)]"
          >
            <span
              class="text-xs font-extrabold uppercase tracking-[0.14em] text-[#ffcd40]"
              >Desconto recorrente</span
            >
            <strong
              class="mt-2 block text-[42px] font-semibold leading-none"
              >Até R$ 200</strong
            >
            <p class="mt-3 text-sm leading-6 text-white/70">
              O desconto regular acompanha o percentual de recebimentos via F10
              Cash, respeitando o limite máximo mensal.
            </p>
          </div>
        </div>

        <div
          class="overflow-hidden rounded-[30px] bg-white shadow-[0_22px_60px_rgba(43,64,145,0.12)]"
        >
          <div
            class="border-b border-[#2B4091]/10 px-6 py-5 sm:px-8"
          >
            <span
              class="text-xs font-extrabold uppercase tracking-[0.15em] text-[#f36b21]"
              >Condição de lançamento — primeiros quatro meses</span
            >
          </div>

          <div class="overflow-x-auto">
            <table class="campaign-table">
              <thead>
                <tr>
                  <th>Mês</th>
                  <th>% F10 Cash</th>
                  <th>Turbo</th>
                  <th>Desconto total</th>
                  <th>Valor final</th>
                </tr>
              </thead>
              <tbody>
                {#each campaignRows as row}
                  <tr>
                    <td>{row.month}</td>
                    <td>{row.f10CashShare}</td>
                    <td>{row.turbo}</td>
                    <td>{row.totalDiscount}</td>
                    <td><strong>{row.finalValue}</strong></td>
                  </tr>
                {/each}
              </tbody>
            </table>
          </div>

          <div
            class="border-t border-[#2B4091]/10 bg-[#fff8e4] px-6 py-5 sm:px-8"
          >
            <p class="text-sm font-semibold leading-6 text-[#2B4091]">
              Os percentuais, faixas e descontos seguem as regras da campanha
              oficial e consideram os recebimentos do período anterior.
            </p>
          </div>
        </div>
      </div>

      <div class="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <article class="discount-example">
          <span>20% via F10 Cash</span><strong>R$ 359</strong>
        </article>
        <article class="discount-example">
          <span>40% via F10 Cash</span><strong>R$ 319</strong>
        </article>
        <article class="discount-example">
          <span>80% via F10 Cash</span><strong>R$ 239</strong>
        </article>
        <article class="discount-example">
          <span>100% via F10 Cash</span><strong>R$ 199</strong>
        </article>
      </div>
    </div>
  </section>

  <section
    id="implantacao"
    class="relative scroll-mt-16 overflow-hidden bg-[#2B4091] px-5 py-20 text-white sm:px-8 lg:px-12 lg:py-28"
  >
    <div class="implementation-wave"></div>
    <div class="relative mx-auto max-w-[1260px]">
      <div
        class="grid gap-10 lg:grid-cols-[0.7fr_1.3fr] lg:items-end lg:gap-20"
      >
        <div>
          <p class="section-label section-label-light">Como começa</p>
          <h2
            class="mt-4 text-[40px] font-semibold leading-[1.05] tracking-[-0.045em] text-white sm:text-[52px] lg:text-[58px]"
          >
            Quatro etapas até a operação.
          </h2>
        </div>
        <p class="max-w-[760px] text-lg leading-8 text-white/70 lg:pb-1">
          A implantação será progressiva, com preparação, configuração,
          treinamento e início assistido.
        </p>
      </div>

      <div class="implementation-track mt-16">
        {#each implementationSteps as step}
          <article class="implementation-step">
            <div class="implementation-number">{step.number}</div>
            <div class="implementation-content">
              <span>{step.owner}</span>
              <h3>{step.title}</h3>
              <p>{step.description}</p>
            </div>
          </article>
        {/each}
      </div>

      <div
        class="mt-16 grid gap-8 border-t border-white/[0.15] pt-12 lg:grid-cols-[1fr_auto] lg:items-center"
      >
        <div>
          <p
            class="text-xs font-extrabold uppercase tracking-[0.2em] text-[#ffcd40]"
          >
            O que cada unidade deverá preparar
          </p>
          <p
            class="mt-4 max-w-[850px] text-2xl font-semibold leading-9 text-white"
          >
            Indicar o responsável local, informar os usuários, definir os cinco
            números de WhatsApp e participar dos treinamentos previstos no
            cronograma oficial.
          </p>
        </div>
        <div
          class="rounded-[20px] bg-[#ffcd40] px-6 py-4 text-sm font-extrabold leading-6 text-[#2B4091]"
        >
          Cronograma oficial será comunicado pela Rede Cebrac
        </div>
      </div>
    </div>
  </section>

  <section class="bg-white px-5 py-16 sm:px-8 lg:px-12 lg:py-20">
    <div
      class="mx-auto max-w-[1260px] overflow-hidden rounded-[32px] border border-[#2B4091]/[0.12] bg-[#f7f8fc] shadow-[0_22px_60px_rgba(43,64,145,0.08)]"
    >
      <div class="grid lg:grid-cols-[0.8fr_1.2fr]">
        <div class="bg-[#2B4091] p-7 text-white sm:p-9">
          <p
            class="text-xs font-extrabold uppercase tracking-[0.18em] text-[#ffcd40]"
          >
            Resumo do comunicado
          </p>
          <h2
            class="mt-4 text-[34px] font-semibold leading-[1.08] tracking-[-0.04em] sm:text-[42px]"
          >
            O valor muda. A estrutura comercial da unidade também.
          </h2>
        </div>

        <div class="grid gap-5 p-7 sm:grid-cols-2 sm:p-9">
          <div class="summary-item">
            <span>Novo investimento</span
            ><strong>R$ 399 por unidade/mês</strong>
          </div>
          <div class="summary-item">
            <span>Incluído</span
            ><strong>CRM, workflow e 5 números de WhatsApp</strong>
          </div>
          <div class="summary-item">
            <span>Objetivo</span
            ><strong>Reduzir desperdícios e preservar o histórico</strong>
          </div>
          <div class="summary-item">
            <span>Aplicação</span
            ><strong>Todas as unidades da Rede Cebrac</strong>
          </div>
        </div>
      </div>
    </div>
  </section>

  <footer class="bg-white px-5 py-14 sm:px-8 lg:px-12">
    <div
      class="mx-auto flex max-w-[1180px] flex-col gap-8 border-t border-[#2B4091]/[0.15] pt-10 md:flex-row md:items-center md:justify-between"
    >
      <div class="flex items-center gap-6">
        <img
          src="/Logo-Cebrac.png"
          alt="Cebrac"
          class="h-12 w-auto rounded-xl bg-[#2B4091] px-3 py-2 object-contain"
        />
        <div class="h-9 w-px bg-[#2B4091]/[0.15]"></div>
        <img src="/logo_f10.svg" alt="F10 Software" class="h-10 w-auto" />
      </div>
      <p
        class="max-w-[650px] text-base font-semibold leading-7 text-[#2B4091]/75"
      >
        A unidade já investe para gerar oportunidades. O novo modelo foi criado
        para que menos oportunidades sejam perdidas durante o caminho até a
        matrícula.
      </p>
      <a
        href="#inicio"
        class="inline-flex items-center gap-2 text-sm font-extrabold text-[#2B4091] transition hover:text-[#61CE70]"
      >
        Voltar ao início
        <ArrowUp size={18} />
      </a>
    </div>
  </footer>
</div>

<style>
  .presentation-page {
    font-family: "Plus Jakarta Sans", ui-sans-serif, system-ui, sans-serif;
  }

  .hero-grid {
    grid-template-columns: minmax(0, 1fr);
  }

  .hero-orbit {
    position: absolute;
    z-index: -10;
    border-radius: 9999px;
    border: 28px solid rgba(255, 205, 64, 0.22);
    pointer-events: none;
  }

  .hero-orbit-left {
    left: -150px;
    top: 110px;
    width: 340px;
    height: 340px;
  }

  .hero-orbit-right {
    right: -190px;
    bottom: 20px;
    width: 440px;
    height: 440px;
    border-color: rgba(97, 206, 112, 0.16);
  }

  .section-label {
    color: #2b4091;
    font-size: 0.75rem;
    font-weight: 800;
    letter-spacing: 0.2em;
    text-transform: uppercase;
  }

  .section-label-light {
    color: #ffcd40;
  }

  .section-title {
    color: #2b4091;
    font-size: clamp(2.3rem, 4vw, 3.75rem);
    font-weight: 600;
    letter-spacing: -0.045em;
    line-height: 1.06;
  }

  .presentation-nav-links {
    scrollbar-width: none;
  }

  .presentation-nav-links::-webkit-scrollbar {
    display: none;
  }

  .presentation-nav-link {
    flex: 0 0 auto;
    border-radius: 9999px;
    padding: 0.58rem 0.9rem;
    color: rgba(255, 255, 255, 0.72);
    font-size: 0.75rem;
    font-weight: 800;
    letter-spacing: 0.025em;
    transition:
      background-color 160ms ease,
      color 160ms ease;
  }

  .presentation-nav-link:hover,
  .presentation-nav-link:focus-visible {
    background: #ffcd40;
    color: #2b4091;
    outline: none;
  }

  .investment-glow,
  .benefit-ring,
  .comparison-ring {
    position: absolute;
    border-radius: 9999px;
    pointer-events: none;
  }

  .investment-glow-one {
    right: -140px;
    top: -170px;
    width: 410px;
    height: 410px;
    border: 58px solid rgba(255, 205, 64, 0.1);
  }

  .investment-glow-two {
    left: -120px;
    bottom: -180px;
    width: 340px;
    height: 340px;
    background: rgba(243, 107, 33, 0.08);
  }

  .investment-list-item {
    display: flex;
    align-items: flex-start;
    gap: 0.75rem;
    color: rgba(43, 64, 145, 0.78);
    font-size: 0.92rem;
    font-weight: 650;
    line-height: 1.5rem;
  }

  .investment-list-item :global(svg) {
    flex: 0 0 auto;
    margin-top: 0.1rem;
    color: #61ce70;
  }

  .summary-shape {
    position: absolute;
    right: -110px;
    top: 60px;
    width: 280px;
    height: 280px;
    border-radius: 52% 48% 61% 39% / 43% 57% 43% 57%;
    background: rgba(97, 206, 112, 0.12);
    transform: rotate(18deg);
  }

  .impact-card {
    min-height: 150px;
    border-radius: 22px;
    background: white;
    padding: 1.3rem;
    box-shadow: 0 14px 34px rgba(43, 64, 145, 0.08);
  }

  .impact-card strong {
    display: block;
    color: #2b4091;
    font-size: 2rem;
    font-weight: 700;
    letter-spacing: -0.04em;
  }

  .impact-card span {
    display: block;
    margin-top: 0.6rem;
    color: rgba(43, 64, 145, 0.65);
    font-size: 0.86rem;
    line-height: 1.4rem;
  }

  .impact-card-alert {
    background: #fff0e7;
  }

  .impact-card-alert strong {
    color: #f36b21;
  }

  .problem-card {
    border-top: 4px solid #2b4091;
    border-radius: 0 0 22px 22px;
    background: #f7f8fc;
    padding: 1.4rem;
    color: #2b4091;
  }

  .problem-card:nth-child(2) {
    border-top-color: #61ce70;
  }

  .problem-card:nth-child(3) {
    border-top-color: #ffcd40;
  }

  .problem-card:nth-child(4) {
    border-top-color: #f36b21;
  }

  .problem-card h3 {
    margin-top: 1rem;
    font-size: 1.1rem;
    font-weight: 700;
  }

  .problem-card p {
    margin-top: 0.45rem;
    color: rgba(43, 64, 145, 0.66);
    font-size: 0.88rem;
    line-height: 1.5rem;
  }

  .benefit-ring-one {
    left: -90px;
    top: 80px;
    width: 240px;
    height: 240px;
    border: 32px solid rgba(43, 64, 145, 0.06);
  }

  .benefit-ring-two {
    right: -120px;
    bottom: 40px;
    width: 320px;
    height: 320px;
    border: 42px solid rgba(97, 206, 112, 0.1);
  }

  .benefit-card {
    position: relative;
    min-height: 280px;
    overflow: hidden;
    border: 1px solid rgba(43, 64, 145, 0.1);
    border-radius: 26px;
    background: rgba(255, 255, 255, 0.94);
    padding: 1.65rem;
    box-shadow: 0 18px 45px rgba(43, 64, 145, 0.08);
  }

  .benefit-card-topline {
    position: absolute;
    inset: 0 0 auto;
    height: 5px;
    background: #2b4091;
  }

  .benefit-card:nth-child(2) .benefit-card-topline,
  .benefit-card:nth-child(5) .benefit-card-topline {
    background: #61ce70;
  }

  .benefit-card:nth-child(3) .benefit-card-topline,
  .benefit-card:nth-child(6) .benefit-card-topline {
    background: #f36b21;
  }

  .benefit-index {
    position: absolute;
    right: 1.25rem;
    top: 1.15rem;
    color: rgba(43, 64, 145, 0.12);
    font-size: 2.7rem;
    font-weight: 700;
    letter-spacing: -0.06em;
  }

  .benefit-icon {
    display: flex;
    width: 54px;
    height: 54px;
    align-items: center;
    justify-content: center;
    border-radius: 18px;
    background: rgba(97, 206, 112, 0.18);
    color: #2b4091;
  }

  .benefit-card h3 {
    margin-top: 1.5rem;
    color: #2b4091;
    font-size: 1.28rem;
    font-weight: 700;
    letter-spacing: -0.02em;
  }

  .benefit-card p {
    margin-top: 0.75rem;
    color: rgba(43, 64, 145, 0.67);
    font-size: 0.92rem;
    line-height: 1.6rem;
  }

  .comparison-ring {
    border: 34px solid rgba(43, 64, 145, 0.08);
  }

  .comparison-ring-one {
    left: -110px;
    top: 30px;
    width: 280px;
    height: 280px;
  }

  .comparison-ring-two {
    right: -140px;
    bottom: -40px;
    width: 360px;
    height: 360px;
  }

  .turnover-board {
    overflow: hidden;
    border-radius: 30px;
    box-shadow: 0 24px 65px rgba(43, 64, 145, 0.14);
  }

  .turnover-column {
    padding: 2rem;
  }

  .turnover-column > span {
    display: inline-flex;
    border-radius: 9999px;
    padding: 0.55rem 0.9rem;
    font-size: 0.72rem;
    font-weight: 800;
    letter-spacing: 0.12em;
    text-transform: uppercase;
  }

  .turnover-column-current {
    background: #f1f3f9;
    color: #2b4091;
  }

  .turnover-column-current > span {
    background: rgba(43, 64, 145, 0.1);
  }

  .turnover-column-future {
    background: #2b4091;
    color: white;
  }

  .turnover-column-future > span {
    background: #61ce70;
    color: #123d1d;
  }

  .turnover-flow {
    display: grid;
    gap: 0.9rem;
    margin-top: 1.5rem;
  }

  .turnover-flow strong {
    font-size: 1rem;
    line-height: 1.5rem;
  }

  .turnover-flow > span {
    color: #f36b21;
    font-size: 1.2rem;
    font-weight: 800;
  }

  .crm-sun {
    position: absolute;
    right: -120px;
    top: -120px;
    width: 360px;
    height: 360px;
    border-radius: 9999px;
    border: 52px solid rgba(255, 205, 64, 0.14);
  }

  .resource-row {
    display: grid;
    grid-template-columns: 48px 1fr;
    gap: 1rem;
    padding: 1.35rem 0;
  }

  .resource-icon {
    display: flex;
    width: 44px;
    height: 44px;
    align-items: center;
    justify-content: center;
    border-radius: 9999px;
    background: #ffcd40;
    color: #2b4091;
  }

  .resource-row h4 {
    color: white;
    font-size: 1.05rem;
    font-weight: 700;
  }

  .resource-row p {
    margin-top: 0.35rem;
    color: rgba(255, 255, 255, 0.64);
    font-size: 0.88rem;
    line-height: 1.5rem;
  }

  .kanban-frame {
    overflow: hidden;
    border: 1px solid rgba(255, 255, 255, 0.22);
    border-radius: 30px;
    background: white;
    box-shadow: 0 28px 70px rgba(0, 0, 0, 0.24);
  }

  .kanban-frame img {
    display: block;
    width: 100%;
    height: auto;
  }

  .media-toolbar {
    display: flex;
    min-height: 44px;
    align-items: center;
    gap: 7px;
    border-bottom: 1px solid rgba(43, 64, 145, 0.14);
    background: rgba(43, 64, 145, 0.06);
    padding: 0 18px;
  }

  .media-toolbar > span {
    width: 8px;
    height: 8px;
    border-radius: 9999px;
    background: #61ce70;
  }

  .media-toolbar > span:nth-child(2) {
    background: #ffcd40;
  }

  .media-toolbar > span:nth-child(3) {
    background: #f36b21;
  }

  .media-toolbar small {
    margin-left: 8px;
    color: rgba(43, 64, 145, 0.58);
    font-size: 0.68rem;
    font-weight: 700;
    letter-spacing: 0.08em;
    text-transform: uppercase;
  }

  .distribution-box {
    border-radius: 16px;
    background: rgba(255, 255, 255, 0.1);
    padding: 1rem;
  }

  .distribution-box strong {
    display: block;
    color: #ffcd40;
    font-size: 2rem;
    line-height: 1;
  }

  .distribution-box span {
    display: block;
    margin-top: 0.4rem;
    color: rgba(255, 255, 255, 0.72);
    font-size: 0.78rem;
  }

  .whatsapp-feature-card {
    min-height: 230px;
    border: 1px solid rgba(255, 255, 255, 0.16);
    border-radius: 24px;
    background: rgba(255, 255, 255, 0.08);
    padding: 1.5rem;
    backdrop-filter: blur(8px);
  }

  .whatsapp-feature-icon {
    display: flex;
    width: 50px;
    height: 50px;
    align-items: center;
    justify-content: center;
    border-radius: 18px;
    background: #61ce70;
    color: #153e1d;
  }

  .whatsapp-feature-card h4 {
    margin-top: 1.3rem;
    color: white;
    font-size: 1.15rem;
    font-weight: 700;
  }

  .whatsapp-feature-card p {
    margin-top: 0.6rem;
    color: rgba(255, 255, 255, 0.64);
    font-size: 0.88rem;
    line-height: 1.55rem;
  }

  .metric-lines {
    border-top: 1px solid rgba(43, 64, 145, 0.16);
  }

  .metric-line {
    display: grid;
    grid-template-columns: 52px 48px 1fr;
    gap: 1rem;
    align-items: start;
    padding: 1.7rem 0;
    border-bottom: 1px solid rgba(43, 64, 145, 0.16);
  }

  .metric-index {
    padding-top: 0.7rem;
    color: #ffcd40;
    font-size: 1.7rem;
    font-weight: 700;
    letter-spacing: -0.04em;
  }

  .metric-icon {
    display: flex;
    width: 46px;
    height: 46px;
    align-items: center;
    justify-content: center;
    border-radius: 9999px;
    background: rgba(97, 206, 112, 0.18);
    color: #2b4091;
  }

  .metric-line h3 {
    color: #2b4091;
    font-size: 1.15rem;
    font-weight: 700;
  }

  .metric-line p {
    margin-top: 0.35rem;
    color: rgba(43, 64, 145, 0.68);
    font-size: 0.9rem;
    line-height: 1.55rem;
  }

  .incentive-shape {
    position: absolute;
    right: -120px;
    top: 60px;
    width: 330px;
    height: 330px;
    border-radius: 46% 54% 64% 36% / 43% 39% 61% 57%;
    background: rgba(255, 205, 64, 0.18);
    transform: rotate(18deg);
  }

  .campaign-table {
    width: 100%;
    min-width: 720px;
    border-collapse: collapse;
  }

  .campaign-table th,
  .campaign-table td {
    border-bottom: 1px solid rgba(43, 64, 145, 0.1);
    padding: 1rem 1.2rem;
    text-align: left;
  }

  .campaign-table th {
    background: #2b4091;
    color: white;
    font-size: 0.72rem;
    font-weight: 800;
    letter-spacing: 0.09em;
    text-transform: uppercase;
  }

  .campaign-table td {
    color: rgba(43, 64, 145, 0.76);
    font-size: 0.9rem;
  }

  .campaign-table td strong {
    color: #f36b21;
    font-size: 1rem;
  }

  .discount-example {
    border: 1px solid rgba(43, 64, 145, 0.1);
    border-radius: 20px;
    background: white;
    padding: 1.25rem;
    box-shadow: 0 12px 30px rgba(43, 64, 145, 0.06);
  }

  .discount-example span {
    display: block;
    color: rgba(43, 64, 145, 0.6);
    font-size: 0.78rem;
    font-weight: 700;
  }

  .discount-example strong {
    display: block;
    margin-top: 0.35rem;
    color: #2b4091;
    font-size: 1.6rem;
  }

  .implementation-wave {
    position: absolute;
    left: -10%;
    right: -10%;
    bottom: -180px;
    height: 360px;
    border-radius: 50%;
    background: rgba(97, 206, 112, 0.12);
  }

  .implementation-track {
    position: relative;
    display: grid;
    gap: 2rem;
  }

  .implementation-step {
    display: grid;
    grid-template-columns: 72px 1fr;
    gap: 1.1rem;
    align-items: start;
  }

  .implementation-number {
    display: flex;
    width: 64px;
    height: 64px;
    align-items: center;
    justify-content: center;
    border-radius: 9999px;
    background: #ffcd40;
    color: #2b4091;
    font-size: 0.95rem;
    font-weight: 800;
  }

  .implementation-content {
    padding-top: 0.2rem;
  }

  .implementation-content span {
    display: block;
    color: #61ce70;
    font-size: 0.68rem;
    font-weight: 800;
    letter-spacing: 0.13em;
    text-transform: uppercase;
  }

  .implementation-content h3 {
    margin-top: 0.25rem;
    color: white;
    font-size: 1.55rem;
    font-weight: 600;
  }

  .implementation-content p {
    margin-top: 0.5rem;
    max-width: 520px;
    color: rgba(255, 255, 255, 0.64);
    font-size: 0.9rem;
    line-height: 1.55rem;
  }

  .summary-item span {
    display: block;
    color: rgba(43, 64, 145, 0.54);
    font-size: 0.68rem;
    font-weight: 800;
    letter-spacing: 0.12em;
    text-transform: uppercase;
  }

  .summary-item strong {
    display: block;
    margin-top: 0.4rem;
    color: #2b4091;
    font-size: 1rem;
    line-height: 1.55rem;
  }

  @media (min-width: 768px) {
    .turnover-board {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }

    .implementation-track {
      grid-template-columns: repeat(2, minmax(0, 1fr));
      column-gap: 4rem;
      row-gap: 3rem;
    }
  }

  @media (min-width: 1024px) {
    .hero-grid {
      grid-template-columns: minmax(0, 0.95fr) minmax(0, 1.25fr);
      column-gap: 0;
    }

    .hero-visual {
      min-height: 780px;
      margin-left: -8rem;
      margin-right: -6rem;
      pointer-events: none;
    }

    .hero-visual img {
      width: 104%;
      max-width: none;
      transform: translateX(-1%);
      transform-origin: center right;
    }

    .implementation-track {
      grid-template-columns: repeat(4, minmax(0, 1fr));
      gap: 2rem;
    }

    .implementation-track::before {
      content: "";
      position: absolute;
      left: 32px;
      right: 10%;
      top: 31px;
      height: 2px;
      background: rgba(255, 255, 255, 0.16);
    }

    .implementation-step {
      position: relative;
      z-index: 2;
      display: block;
    }

    .implementation-content {
      padding-top: 1.5rem;
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .presentation-page *,
    .presentation-page *::before,
    .presentation-page *::after {
      scroll-behavior: auto !important;
      transition-duration: 0.01ms !important;
    }
  }

  :global(html) {
    scroll-behavior: smooth;
  }
</style>
