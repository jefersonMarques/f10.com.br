<script lang="ts">
  import {
    ArrowUp,
    BarChart3,
    BellRing,
    Building2,
    CalendarCheck2,
    CheckCircle2,
    ClipboardCheck,
    Clock3,
    FileText,
    Funnel,
    MessageCircleMore,
    MessagesSquare,
    ShieldCheck,
    Target,
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

  type JourneyStep = FeatureItem & {
    number: string;
  };

  type ResponsibilityItem = {
    title: string;
    description: string;
    icon: IconComponent;
    accentClass: string;
    iconClass: string;
    items: string[];
  };

  const projectSummary: FeatureItem[] = [
    {
      title: "CRM de Leads",
      description: "Organiza o funil comercial, as tarefas e o próximo passo de cada oportunidade.",
      icon: Funnel,
      iconClass: "text-[#EA6D0B]",
    },
    {
      title: "WhatsApp integrado",
      description: "Centraliza conversas com leads no CRM e com alunos dentro do F10.",
      icon: MessageCircleMore,
      iconClass: "text-[#2F8F57]",
    },
    {
      title: "5 números por unidade",
      description: "Cada unidade poderá distribuir os números entre o CRM e o F10.",
      icon: MessagesSquare,
      iconClass: "text-[#2B4091]",
    },
  ];

  const journeySteps: JourneyStep[] = [
    {
      number: "01",
      title: "Atrair",
      description: "Receber os leads das campanhas e dos canais de captação.",
      icon: Target,
      iconClass: "text-[#EA6D0B]",
    },
    {
      number: "02",
      title: "Nutrir",
      description: "Executar contatos, mensagens, tarefas e follow-ups no momento certo.",
      icon: BellRing,
      iconClass: "text-[#2B4091]",
    },
    {
      number: "03",
      title: "Converter",
      description: "Acompanhar a negociação com histórico, responsável e próxima ação.",
      icon: Workflow,
      iconClass: "text-[#2F8F57]",
    },
    {
      number: "04",
      title: "Matricular",
      description: "Concluir a oportunidade e iniciar o relacionamento com o aluno no F10.",
      icon: CheckCircle2,
      iconClass: "text-[#6B55C7]",
    },
  ];

  const leadWhatsAppFeatures: FeatureItem[] = [
    {
      title: "Conversa vinculada ao lead",
      description: "Mensagens e histórico ficam dentro da oportunidade comercial.",
      icon: MessagesSquare,
      iconClass: "text-[#2F8F57]",
    },
    {
      title: "Retorno no tempo certo",
      description: "Tarefas e lembretes ajudam a equipe a manter a cadência de atendimento.",
      icon: Clock3,
      iconClass: "text-[#EA6D0B]",
    },
    {
      title: "Continuidade na troca de equipe",
      description: "A negociação continua mesmo quando o responsável pelo lead muda.",
      icon: ShieldCheck,
      iconClass: "text-[#2B4091]",
    },
  ];

  const studentWhatsAppFeatures: FeatureItem[] = [
    {
      title: "Checklist pós-matrícula",
      description: "Envio de orientações, documentos e próximos passos para o aluno.",
      icon: ClipboardCheck,
      iconClass: "text-[#2F8F57]",
    },
    {
      title: "Avisos aos faltantes",
      description: "Comunicações para apoiar frequência, permanência e acompanhamento.",
      icon: BellRing,
      iconClass: "text-[#EA6D0B]",
    },
    {
      title: "Cobranças e acordos",
      description: "Boletos, lembretes financeiros e negociações com mais agilidade.",
      icon: FileText,
      iconClass: "text-[#2B4091]",
    },
    {
      title: "Comunicação com o aluno",
      description: "Um canal integrado para mensagens administrativas e acadêmicas.",
      icon: MessageCircleMore,
      iconClass: "text-[#6B55C7]",
    },
  ];

  const solvedProblems = [
    {
      number: "01",
      title: "Leads esquecidos",
      problem: "Follow-ups dependem da memória, de planilhas e de controles individuais.",
      solution: "O CRM mostra a próxima ação, envia alertas e mantém uma sequência de acompanhamento.",
      icon: CalendarCheck2,
    },
    {
      number: "02",
      title: "Perda de histórico quando a equipe muda",
      problem: "Conversas e negociações podem ficar presas a um aparelho ou colaborador.",
      solution: "O histórico permanece na unidade e permite que outra pessoa continue o atendimento.",
      icon: UsersRound,
    },
  ];

  const managementMetrics: FeatureItem[] = [
    {
      title: "Tempo até o primeiro atendimento",
      description: "Quanto tempo o lead espera pelo primeiro retorno.",
      icon: Clock3,
      iconClass: "text-[#ffad66]",
    },
    {
      title: "Leads sem próxima ação",
      description: "Oportunidades que precisam de atenção da equipe.",
      icon: CalendarCheck2,
      iconClass: "text-[#9fb0ff]",
    },
    {
      title: "Conversão do funil",
      description: "Avanço entre as etapas até a matrícula.",
      icon: Funnel,
      iconClass: "text-[#66d99e]",
    },
    {
      title: "Resultados por campanha e curso",
      description: "Comparação das origens e ofertas com melhor desempenho.",
      icon: BarChart3,
      iconClass: "text-[#c2b6ff]",
    },
  ];

  const responsibilities: ResponsibilityItem[] = [
    {
      title: "F10",
      description: "Prepara a plataforma e acompanha a entrada em operação.",
      icon: Workflow,
      accentClass: "from-[#071133] to-[#182953]",
      iconClass: "bg-white/10 text-white",
      items: ["Configurar acessos e workflow", "Apoiar os números de WhatsApp", "Treinar as equipes", "Acompanhar o início da operação"],
    },
    {
      title: "Gestão da Rede Cebrac",
      description: "Coordena a comunicação, o cronograma e as diretrizes da rede.",
      icon: Building2,
      accentClass: "from-[#2B4091] to-[#4f67bf]",
      iconClass: "bg-white/10 text-white",
      items: ["Comunicar as unidades", "Definir diretrizes comuns", "Organizar o cronograma", "Acompanhar a adesão da rede"],
    },
    {
      title: "Unidade Cebrac",
      description: "Organiza as pessoas e aplica o processo no dia a dia.",
      icon: UsersRound,
      accentClass: "from-[#EA6D0B] to-[#ff9a43]",
      iconClass: "bg-white/15 text-white",
      items: ["Indicar um responsável", "Mapear usuários", "Definir os cinco números", "Participar do treinamento"],
    },
  ];

  const implementationSteps = [
    {
      number: "1",
      title: "Preparação",
      description: "A unidade informa responsável, equipe e números de WhatsApp.",
    },
    {
      number: "2",
      title: "Configuração",
      description: "A F10 prepara acessos, funil, permissões e distribuição dos números.",
    },
    {
      number: "3",
      title: "Treinamento",
      description: "Gestores e equipe comercial aprendem a executar a nova rotina.",
    },
    {
      number: "4",
      title: "Início assistido",
      description: "A operação começa com acompanhamento e ajustes dos primeiros resultados.",
    },
  ];
</script>

<svelte:head>
  <title>Rede Cebrac | CRM de Leads e WhatsApp integrado ao F10</title>
  <meta
    name="description"
    content="Apresentação institucional para as unidades Cebrac sobre CRM de Leads, WhatsApp integrado e implantação do novo modelo comercial."
  />
  <meta name="robots" content="noindex,nofollow,noarchive,nosnippet" />
  <link rel="preload" as="image" href="/background-hero-cebrac.png" />
  <link rel="preload" as="image" href="/hero-cebrac.webp" type="image/webp" />
  <link rel="preload" as="image" href="/Logo-Cebrac.png" />
</svelte:head>

<div class="presentation-page overflow-hidden bg-white text-[#071133]">
  <section id="inicio" class="relative isolate overflow-hidden bg-white/40">
    <img
      src="/background-hero-cebrac.png"
      alt=""
      aria-hidden="true"
      class="pointer-events-none absolute inset-0 -z-20 h-full w-full object-cover object-center"
      fetchpriority="high"
    />
    <div class="pointer-events-none absolute -left-28 top-24 -z-10 h-72 w-72 rounded-full bg-[#EA6D0B]/[0.07] blur-3xl"></div>
    <div class="pointer-events-none absolute -right-28 bottom-16 -z-10 h-96 w-96 rounded-full bg-[#2B4091]/[0.08] blur-3xl"></div>

    <div class="hero-grid mx-auto grid w-full max-w-[1660px] items-center px-5 py-12 sm:px-8 sm:py-16 lg:min-h-[100svh] lg:px-10 lg:py-10 xl:px-14">
      <div class="hero-copy relative z-20 max-w-[720px] lg:py-10">
        <div class="inline-flex max-w-full items-stretch overflow-hidden rounded-[18px] border border-[#2B4091]/10 bg-white/[0.92] shadow-[0_14px_36px_rgba(43,64,145,0.12)] backdrop-blur-md">
          <div class="flex min-w-[145px] items-center justify-center bg-[#2B4091] px-5 py-3 sm:min-w-[174px] sm:px-7">
            <img src="/Logo-Cebrac.png" alt="Cebrac" class="h-9 w-auto object-contain sm:h-10" />
          </div>
          <div class="flex items-center px-4 py-3 text-[10px] font-extrabold uppercase leading-5 tracking-[0.13em] text-[#2B4091] sm:px-6 sm:text-xs">
            Projeto de evolução comercial
          </div>
        </div>

        <p class="mt-8 text-xs font-extrabold uppercase tracking-[0.2em] text-[#EA6D0B]">
          Novos recursos para as unidades Cebrac
        </p>

        <h1 class="mt-5 text-[42px] font-semibold leading-[1.06] tracking-[-0.05em] text-[#010D28] sm:text-[56px] lg:text-[59px] xl:text-[66px]">
          <span class="text-[#EA6D0B]">CRM</span>
          <span> e </span>
          <span class="text-[#2F8F57]">WhatsApp</span>
          <br />
          integrados para a Rede Cebrac.
        </h1>

        <p class="mt-7 max-w-[650px] text-lg font-medium leading-8 text-[#24345F]/85 sm:text-[21px] sm:leading-9">
          Uma nova rotina para acompanhar cada lead até a matrícula e manter o relacionamento com o aluno dentro do F10.
        </p>

        <div class="mt-8 inline-flex items-center gap-3 rounded-full border border-[#2B4091]/10 bg-white/[0.88] px-4 py-2.5 text-sm font-semibold text-[#2B4091] shadow-[0_10px_28px_rgba(43,64,145,0.08)] backdrop-blur-md">
          <CalendarCheck2 size={18} />
          WhatsApp no F10 disponível a partir de agosto de 2026
        </div>
      </div>

      <div class="hero-visual relative z-10 hidden items-center justify-end lg:flex">
        <img
          src="/hero-cebrac.webp"
          alt="CRM F10 para a Rede Cebrac exibido em computador e atendimento integrado pelo WhatsApp"
          class="h-auto object-contain drop-shadow-[0_34px_48px_rgba(14,37,83,0.18)]"
          fetchpriority="high"
        />
      </div>
    </div>
  </section>

  <nav class="presentation-nav sticky top-3 z-40" aria-label="Navegação da apresentação">
    <div class="mx-auto max-w-[1180px] px-4 sm:px-8">
      <div class="flex items-center rounded-full border border-white/80 bg-white/[0.94] px-3 shadow-[0_12px_34px_rgba(1,13,40,0.10)] backdrop-blur-xl">
        <div class="presentation-nav-links flex min-w-0 flex-1 gap-1 overflow-x-auto py-2.5">
          <a href="#resumo" class="presentation-nav-link">O que muda</a>
          <a href="#crm" class="presentation-nav-link">Como funciona</a>
          <a href="#whatsapp" class="presentation-nav-link">WhatsApp</a>
          <a href="#problemas" class="presentation-nav-link">Problemas resolvidos</a>
          <a href="#implantacao" class="presentation-nav-link">Próximos passos</a>
        </div>
      </div>
    </div>
  </nav>

  <section id="resumo" class="scroll-mt-24 bg-stone-100 px-5 pb-16 pt-20 sm:px-8 lg:px-12 lg:pb-20 lg:pt-24">
    <div class="mx-auto max-w-[1260px]">
      <div class="mx-auto max-w-[850px] text-center">
        <p class="section-label">O que muda para a unidade</p>
        <h2 class="section-title mt-4">Três recursos que passam a trabalhar juntos.</h2>
        <p class="mx-auto mt-5 max-w-[720px] text-lg leading-8 text-[#24345F]/75">
          O CRM organiza a operação comercial. O WhatsApp registra as conversas. O F10 continua o relacionamento depois da matrícula.
        </p>
      </div>

      <div class="mt-12 grid gap-5 md:grid-cols-3">
        {#each projectSummary as item}
          <article class="rounded-[26px] border border-[#E5EBF2] bg-white p-7 shadow-[0_14px_38px_rgba(1,13,40,0.06)]">
            <div class="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#F7F9FC]">
              <svelte:component this={item.icon} size={24} strokeWidth={1.9} class={item.iconClass} />
            </div>
            <h3 class="mt-6 text-xl font-semibold tracking-[-0.02em] text-[#071133]">{item.title}</h3>
            <p class="mt-3 text-sm leading-7 text-[#314372]/72">{item.description}</p>
          </article>
        {/each}
      </div>
    </div>
  </section>

  <section id="crm" class="relative scroll-mt-24 overflow-hidden bg-white px-5 py-16 sm:px-8 lg:px-12 lg:py-24">
    <div class="pointer-events-none absolute left-[-120px] top-[80px] h-[320px] w-[320px] rounded-full bg-[#EA6D0B]/[0.05] blur-3xl"></div>
    <div class="pointer-events-none absolute right-[-120px] bottom-[40px] h-[360px] w-[360px] rounded-full bg-[#010D28]/[0.045] blur-3xl"></div>

    <div class="relative mx-auto max-w-[1260px]">
      <div class="mx-auto max-w-[820px] text-center">
        <p class="section-label">Como o CRM funciona</p>
        <h2 class="section-title mt-4">O lead entra, recebe acompanhamento e avança até a matrícula.</h2>
        <p class="mx-auto mt-5 max-w-[720px] text-lg leading-8 text-[#24345F]/75">
          Cada etapa deixa claro quem é o responsável, qual é a próxima ação e há quanto tempo a oportunidade está parada.
        </p>
      </div>

      <div class="mt-12 grid gap-5 md:grid-cols-2 xl:grid-cols-4">
        {#each journeySteps as step}
          <article class="rounded-[24px] border border-[#E5EBF2] bg-white p-6 shadow-[0_12px_32px_rgba(1,13,40,0.05)]">
            <div class="flex items-center justify-between gap-4">
              <div class="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#F7F9FC]">
                <svelte:component this={step.icon} size={22} strokeWidth={1.9} class={step.iconClass} />
              </div>
              <span class="rounded-full bg-[#F8FAFC] px-3 py-1 text-xs font-extrabold tracking-[0.12em] text-slate-400 ring-1 ring-[#E8EDF3]">{step.number}</span>
            </div>
            <h3 class="mt-6 text-xl font-semibold text-[#071133]">{step.title}</h3>
            <p class="mt-3 text-sm leading-7 text-[#314372]/72">{step.description}</p>
          </article>
        {/each}
      </div>

      <div class="mt-12 grid items-center gap-10 lg:grid-cols-[0.9fr_1.1fr] lg:gap-16">
        <div class="max-w-[560px]">
          <p class="section-label">Na prática</p>
          <h3 class="mt-4 text-[32px] font-semibold leading-[1.1] tracking-[-0.035em] text-[#010D28] sm:text-[40px]">
            A equipe deixa de depender da memória para saber o que fazer.
          </h3>
          <div class="mt-7 space-y-4">
            <div class="flex gap-3 rounded-[20px] border border-[#E5EBF2] bg-white px-5 py-4 shadow-[0_8px_22px_rgba(1,13,40,0.035)]">
              <CheckCircle2 size={20} class="mt-0.5 shrink-0 text-[#2F8F57]" />
              <p class="text-sm leading-6 text-[#314372]/75"><strong class="text-[#071133]">Tarefas e lembretes:</strong> mostram o que precisa ser feito hoje.</p>
            </div>
            <div class="flex gap-3 rounded-[20px] border border-[#E5EBF2] bg-white px-5 py-4 shadow-[0_8px_22px_rgba(1,13,40,0.035)]">
              <CheckCircle2 size={20} class="mt-0.5 shrink-0 text-[#2F8F57]" />
              <p class="text-sm leading-6 text-[#314372]/75"><strong class="text-[#071133]">Histórico completo:</strong> preserva mensagens, observações e negociações.</p>
            </div>
            <div class="flex gap-3 rounded-[20px] border border-[#E5EBF2] bg-white px-5 py-4 shadow-[0_8px_22px_rgba(1,13,40,0.035)]">
              <CheckCircle2 size={20} class="mt-0.5 shrink-0 text-[#2F8F57]" />
              <p class="text-sm leading-6 text-[#314372]/75"><strong class="text-[#071133]">Visão Kanban:</strong> mostra prioridades, gargalos e oportunidades paradas.</p>
            </div>
          </div>
        </div>

        <div class="media-frame aspect-[16/11]">
          <div class="media-toolbar">
            <span></span><span></span><span></span>
            <small>Captura da visão Kanban</small>
          </div>
          <div class="media-canvas">
            <Funnel size={42} strokeWidth={1.4} class="text-slate-500" />
            <strong>Imagem do CRM</strong>
            <p>Inserir a tela real com etapas, leads, responsáveis e próximas ações.</p>
          </div>
        </div>
      </div>
    </div>
  </section>

  <section id="whatsapp" class="relative scroll-mt-24 overflow-hidden bg-stone-100 px-5 py-16 sm:px-8 lg:px-12 lg:py-24">
    <div class="pointer-events-none absolute -left-32 top-12 h-80 w-80 rounded-full bg-[#2F8F57]/[0.055] blur-3xl"></div>
    <div class="pointer-events-none absolute -right-32 bottom-10 h-96 w-96 rounded-full bg-[#2B4091]/[0.055] blur-3xl"></div>

    <div class="relative mx-auto max-w-[1260px]">
      <div class="mx-auto max-w-[850px] text-center">
        <p class="section-label text-[#2F8F57]">Onde o WhatsApp será usado</p>
        <h2 class="section-title mt-4">Antes e depois da matrícula.</h2>
        <p class="mx-auto mt-5 max-w-[760px] text-lg leading-8 text-[#24345F]/75">
          Os cinco números incluídos por unidade podem ser distribuídos entre o CRM de Leads e o F10, de acordo com a necessidade da operação.
        </p>
      </div>

      <div class="mt-12 grid gap-6 lg:grid-cols-2">
        <article class="overflow-hidden rounded-[30px] border border-emerald-100 bg-white shadow-[0_16px_44px_rgba(14,70,45,0.07)]">
          <div class="bg-gradient-to-br from-[#1f7f4c] to-[#2F8F57] px-7 py-7 text-white sm:px-8">
            <div class="flex items-center justify-between gap-5">
              <div>
                <span class="text-xs font-extrabold uppercase tracking-[0.16em] text-white/65">Antes da matrícula</span>
                <h3 class="mt-2 text-2xl font-semibold">WhatsApp no CRM de Leads</h3>
              </div>
              <div class="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/12">
                <MessageCircleMore size={26} />
              </div>
            </div>
          </div>
          <div class="divide-y divide-slate-100 px-7 sm:px-8">
            {#each leadWhatsAppFeatures as feature}
              <div class="flex gap-4 py-6">
                <div class="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#F7F9FC]">
                  <svelte:component this={feature.icon} size={21} strokeWidth={1.9} class={feature.iconClass} />
                </div>
                <div>
                  <strong class="text-sm font-extrabold text-[#071133]">{feature.title}</strong>
                  <p class="mt-1 text-sm leading-6 text-[#314372]/68">{feature.description}</p>
                </div>
              </div>
            {/each}
          </div>
        </article>

        <article class="overflow-hidden rounded-[30px] border border-[#2B4091]/10 bg-white shadow-[0_16px_44px_rgba(43,64,145,0.07)]">
          <div class="bg-gradient-to-br from-[#2B4091] to-[#4f67bf] px-7 py-7 text-white sm:px-8">
            <div class="flex items-center justify-between gap-5">
              <div>
                <span class="text-xs font-extrabold uppercase tracking-[0.16em] text-white/65">Depois da matrícula</span>
                <h3 class="mt-2 text-2xl font-semibold">WhatsApp dentro do F10</h3>
              </div>
              <div class="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/12">
                <MessagesSquare size={26} />
              </div>
            </div>
          </div>
          <div class="grid sm:grid-cols-2">
            {#each studentWhatsAppFeatures as feature, index}
              <div class={`px-7 py-6 sm:px-8 ${index % 2 === 0 ? "sm:border-r" : ""} ${index < 2 ? "border-b" : ""} border-slate-100`}>
                <div class="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#F7F9FC]">
                  <svelte:component this={feature.icon} size={21} strokeWidth={1.9} class={feature.iconClass} />
                </div>
                <strong class="mt-4 block text-sm font-extrabold text-[#071133]">{feature.title}</strong>
                <p class="mt-1 text-sm leading-6 text-[#314372]/68">{feature.description}</p>
              </div>
            {/each}
          </div>
        </article>
      </div>

      <div class="mt-8 flex flex-col items-center justify-between gap-5 rounded-[24px] border border-[#2B4091]/10 bg-white px-6 py-5 text-center shadow-[0_12px_30px_rgba(43,64,145,0.06)] sm:flex-row sm:text-left">
        <div>
          <strong class="text-lg font-semibold text-[#071133]">Disponibilidade do WhatsApp no F10</strong>
          <p class="mt-1 text-sm leading-6 text-[#314372]/70">O recurso para relacionamento com alunos estará disponível a partir de agosto de 2026.</p>
        </div>
        <span class="shrink-0 rounded-full bg-[#EEF2FF] px-4 py-2 text-sm font-extrabold text-[#2B4091]">Agosto de 2026</span>
      </div>
    </div>
  </section>

  <section id="problemas" class="scroll-mt-24 bg-white px-5 py-16 sm:px-8 lg:px-12 lg:py-24">
    <div class="mx-auto max-w-[1260px]">
      <div class="mx-auto max-w-[820px] text-center">
        <p class="section-label">Por que este projeto é importante</p>
        <h2 class="section-title mt-4">Dois problemas que passam a ter uma resposta clara.</h2>
      </div>

      <div class="mt-12 grid gap-6 lg:grid-cols-2">
        {#each solvedProblems as item}
          <article class="overflow-hidden rounded-[30px] border border-[#E5EBF2] bg-white shadow-[0_16px_44px_rgba(1,13,40,0.06)]">
            <div class="flex items-center justify-between gap-5 border-b border-[#E5EBF2] bg-[#F8FAFC] px-7 py-6 sm:px-8">
              <div class="flex items-center gap-4">
                <div class="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#EEF2FF] text-[#2B4091]">
                  <svelte:component this={item.icon} size={24} strokeWidth={1.9} />
                </div>
                <h3 class="text-2xl font-semibold text-[#071133]">{item.title}</h3>
              </div>
              <span class="text-xs font-extrabold tracking-[0.14em] text-slate-400">{item.number}</span>
            </div>
            <div class="grid sm:grid-cols-2">
              <div class="border-b border-slate-100 px-7 py-7 sm:border-b-0 sm:border-r sm:px-8">
                <span class="text-xs font-extrabold uppercase tracking-[0.16em] text-slate-400">Hoje</span>
                <p class="mt-3 text-sm leading-7 text-[#314372]/72">{item.problem}</p>
              </div>
              <div class="px-7 py-7 sm:px-8">
                <span class="text-xs font-extrabold uppercase tracking-[0.16em] text-[#2F8F57]">Com o novo modelo</span>
                <p class="mt-3 text-sm leading-7 text-[#314372]/72">{item.solution}</p>
              </div>
            </div>
          </article>
        {/each}
      </div>
    </div>
  </section>

  <section class="bg-[#071133] px-5 py-16 text-white sm:px-8 lg:px-12 lg:py-24">
    <div class="mx-auto max-w-[1260px]">
      <div class="grid gap-8 lg:grid-cols-[0.75fr_1.25fr] lg:items-end lg:gap-16">
        <div>
          <p class="text-xs font-extrabold uppercase tracking-[0.2em] text-[#ffad66]">Como a gestão acompanha</p>
          <h2 class="mt-4 text-[36px] font-semibold leading-[1.08] tracking-[-0.04em] sm:text-[46px]">
            O objetivo não é apenas usar o sistema. É melhorar a rotina comercial.
          </h2>
        </div>
        <p class="max-w-[720px] text-lg leading-8 text-white/62">
          Os indicadores ajudam a identificar atrasos, gargalos, oportunidades paradas e pontos de melhoria em cada unidade.
        </p>
      </div>

      <div class="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {#each managementMetrics as metric}
          <article class="rounded-[24px] border border-white/10 bg-white/[0.055] px-6 py-7 backdrop-blur-sm">
            <svelte:component this={metric.icon} size={25} strokeWidth={1.9} class={metric.iconClass} />
            <h3 class="mt-5 text-lg font-semibold">{metric.title}</h3>
            <p class="mt-2 text-sm leading-6 text-white/55">{metric.description}</p>
          </article>
        {/each}
      </div>
    </div>
  </section>

  <section id="implantacao" class="relative scroll-mt-24 overflow-hidden bg-stone-100 px-5 py-16 sm:px-8 lg:px-12 lg:py-24">
    <div class="pointer-events-none absolute -left-32 top-20 h-80 w-80 rounded-full bg-[#EA6D0B]/[0.05] blur-3xl"></div>
    <div class="pointer-events-none absolute -right-32 bottom-10 h-96 w-96 rounded-full bg-[#2B4091]/[0.05] blur-3xl"></div>

    <div class="relative mx-auto max-w-[1260px]">
      <div class="mx-auto max-w-[850px] text-center">
        <p class="section-label">O que acontece agora</p>
        <h2 class="section-title mt-4">A implantação será feita em quatro etapas simples.</h2>
        <p class="mx-auto mt-5 max-w-[720px] text-lg leading-8 text-[#24345F]/75">
          A unidade não precisa organizar tudo sozinha. Cada etapa terá orientação da gestão Cebrac e acompanhamento da F10.
        </p>
      </div>

      <div class="mt-12 grid gap-5 md:grid-cols-2 xl:grid-cols-4">
        {#each implementationSteps as step}
          <article class="rounded-[24px] border border-[#E5EBF2] bg-white p-6 shadow-[0_12px_32px_rgba(1,13,40,0.05)]">
            <span class="flex h-10 w-10 items-center justify-center rounded-full bg-[#2B4091] text-sm font-extrabold text-white">{step.number}</span>
            <h3 class="mt-5 text-xl font-semibold text-[#071133]">{step.title}</h3>
            <p class="mt-3 text-sm leading-7 text-[#314372]/72">{step.description}</p>
          </article>
        {/each}
      </div>

      <div class="mt-12 grid gap-6 lg:grid-cols-3">
        {#each responsibilities as responsibility}
          <article class="overflow-hidden rounded-[28px] border border-[#E5EBF2] bg-white shadow-[0_14px_38px_rgba(1,13,40,0.06)]">
            <div class={`bg-gradient-to-br px-7 py-7 text-white ${responsibility.accentClass}`}>
              <div class={`flex h-12 w-12 items-center justify-center rounded-2xl ${responsibility.iconClass}`}>
                <svelte:component this={responsibility.icon} size={24} strokeWidth={1.8} />
              </div>
              <h3 class="mt-5 text-2xl font-semibold">{responsibility.title}</h3>
              <p class="mt-2 text-sm leading-6 text-white/72">{responsibility.description}</p>
            </div>
            <div class="space-y-4 px-7 py-7">
              {#each responsibility.items as item}
                <div class="flex gap-3 text-sm leading-6 text-[#314372]/75">
                  <CheckCircle2 size={18} class="mt-0.5 shrink-0 text-[#2F8F57]" />
                  <span>{item}</span>
                </div>
              {/each}
            </div>
          </article>
        {/each}
      </div>

      <div class="mt-10 overflow-hidden rounded-[28px] bg-[#2B4091] shadow-[0_20px_55px_rgba(43,64,145,0.18)]">
        <div class="grid items-center gap-8 px-7 py-8 text-white sm:px-10 lg:grid-cols-[1fr_auto] lg:px-12">
          <div>
            <p class="text-xs font-extrabold uppercase tracking-[0.18em] text-white/55">Cronograma oficial</p>
            <h3 class="mt-3 text-2xl font-semibold">Datas, turmas e canal de implantação serão comunicados pela Rede Cebrac.</h3>
            <p class="mt-3 max-w-[760px] text-sm leading-7 text-white/68">
              Neste momento, cada unidade deve apenas identificar o responsável, mapear os usuários e definir os cinco números de WhatsApp.
            </p>
          </div>
          <CalendarCheck2 size={42} class="hidden text-white/70 lg:block" />
        </div>
      </div>
    </div>
  </section>

  <footer class="bg-[#071133] px-5 py-14 text-white sm:px-8 lg:px-12">
    <div class="mx-auto grid max-w-[1180px] gap-8 md:grid-cols-[auto_1fr_auto] md:items-center">
      <div class="flex items-center gap-6">
        <img src="/Logo-Cebrac.png" alt="Cebrac" class="h-12 w-auto object-contain" />
        <div class="h-9 w-px bg-white/20"></div>
        <img src="/logo_f10.svg" alt="F10 Software" class="h-10 w-auto brightness-0 invert" />
      </div>
      <p class="max-w-[650px] text-base leading-7 text-white/68">
        CRM, WhatsApp e método comercial trabalhando juntos para acompanhar cada oportunidade até a matrícula.
      </p>
      <a href="#inicio" class="inline-flex items-center gap-2 text-sm font-extrabold text-white/70 transition hover:text-white">
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

  .section-label {
    color: #ea6d0b;
    font-size: 0.75rem;
    font-weight: 800;
    letter-spacing: 0.2em;
    text-transform: uppercase;
  }

  .section-title {
    color: #010d28;
    font-size: clamp(2.15rem, 4vw, 3.45rem);
    font-weight: 600;
    letter-spacing: -0.04em;
    line-height: 1.08;
  }

  .presentation-nav-links {
    scrollbar-width: none;
    scroll-snap-type: x proximity;
  }

  .presentation-nav-links::-webkit-scrollbar {
    display: none;
  }

  .presentation-nav-link {
    flex: 0 0 auto;
    scroll-snap-align: start;
    border-radius: 9999px;
    padding: 0.55rem 0.9rem;
    color: #52617c;
    font-size: 0.75rem;
    font-weight: 800;
    letter-spacing: 0.025em;
    transition: background-color 160ms ease, color 160ms ease;
  }

  .presentation-nav-link:hover,
  .presentation-nav-link:focus-visible {
    background: #eef2ff;
    color: #2b4091;
    outline: none;
  }

  .media-frame {
    overflow: hidden;
    border: 1px solid #d8dee7;
    border-radius: 30px;
    background: #e7eaef;
    box-shadow: 0 20px 50px rgba(1, 13, 40, 0.09);
  }

  .media-toolbar {
    display: flex;
    min-height: 44px;
    align-items: center;
    gap: 7px;
    border-bottom: 1px solid #d8dee7;
    background: #f4f6f8;
    padding: 0 18px;
  }

  .media-toolbar > span {
    width: 8px;
    height: 8px;
    border-radius: 9999px;
    background: #b5bcc6;
  }

  .media-toolbar small {
    margin-left: 8px;
    color: #7a8492;
    font-size: 0.68rem;
    font-weight: 700;
    letter-spacing: 0.08em;
    text-transform: uppercase;
  }

  .media-canvas {
    display: flex;
    min-height: calc(100% - 44px);
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 32px;
    text-align: center;
  }

  .media-canvas strong {
    margin-top: 16px;
    color: #536071;
    font-size: 0.8rem;
    font-weight: 800;
    letter-spacing: 0.13em;
    text-transform: uppercase;
  }

  .media-canvas p {
    margin-top: 8px;
    max-width: 380px;
    color: #7a8492;
    font-size: 0.82rem;
    line-height: 1.5rem;
  }

  @media (min-width: 1024px) {
    .hero-grid {
      grid-template-columns: minmax(0, 0.9fr) minmax(0, 1.3fr);
      column-gap: 0;
    }

    .hero-visual {
      min-height: 780px;
      margin-left: -9rem;
      margin-right: -6rem;
      pointer-events: none;
    }

    .hero-visual img {
      width: 105%;
      max-width: none;
      transform: translateX(-1.5%);
      transform-origin: center right;
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
