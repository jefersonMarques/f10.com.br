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
    MessageCircleMore,
    MessagesSquare,
    ShieldCheck,
    Target,
    TrendingUp,
    UserCheck,
    UsersRound,
    Workflow,
  } from "lucide-svelte";

  type IconComponent = typeof Target;

  type JourneyStep = {
    title: string;
    description: string;
    icon: IconComponent;
  };

  type ChangeItem = {
    area: string;
    current: string;
    future: string;
  };

  type BenefitItem = {
    title: string;
    description: string;
    outcome: string;
    icon: IconComponent;
  };

  type MetricItem = {
    title: string;
    description: string;
    icon: IconComponent;
  };

  type ResourceGroup = {
    label: string;
    title: string;
    description: string;
    icon: IconComponent;
    items: string[];
  };

  type CashExample = {
    share: string;
    value: string;
  };

  type ImplementationStep = {
    number: string;
    owner: string;
    title: string;
    description: string;
  };

  const journeySteps: JourneyStep[] = [
    {
      title: "Lead recebido",
      description: "Origem e dados entram no processo comercial.",
      icon: Target,
    },
    {
      title: "Responsável definido",
      description: "A oportunidade passa a ter um dono e um prazo.",
      icon: UserCheck,
    },
    {
      title: "Contato pelo WhatsApp",
      description: "A conversa permanece vinculada ao atendimento.",
      icon: MessagesSquare,
    },
    {
      title: "Próxima ação registrada",
      description: "Tarefas e retornos deixam de depender da memória.",
      icon: CalendarCheck2,
    },
    {
      title: "Gestão acompanha",
      description: "Atrasos, gargalos e conversões ficam visíveis.",
      icon: BarChart3,
    },
    {
      title: "Matrícula e continuidade",
      description: "O relacionamento segue dentro do F10.",
      icon: CheckCircle2,
    },
  ];

  const changeItems: ChangeItem[] = [
    {
      area: "Atendimento",
      current: "Conversas distribuídas entre celulares, planilhas e anotações.",
      future: "Histórico centralizado e vinculado a cada oportunidade.",
    },
    {
      area: "Follow-up",
      current: "Retornos dependem da memória e da organização individual.",
      future: "Próxima atividade, prazo e responsável ficam registrados.",
    },
    {
      area: "Gestão",
      current: "O gestor descobre atrasos quando a oportunidade já esfriou.",
      future: "Funil e indicadores mostram onde a equipe precisa agir.",
    },
    {
      area: "Troca de equipe",
      current: "Parte do contexto desaparece quando um colaborador sai.",
      future: "Outro profissional continua a negociação sem começar do zero.",
    },
    {
      area: "Padrão da rede",
      current: "Cada unidade organiza a operação de uma maneira diferente.",
      future: "Toda a rede passa a trabalhar com um processo comum e mensurável.",
    },
  ];

  const benefits: BenefitItem[] = [
    {
      title: "Melhor aproveitamento dos leads",
      description:
        "Mais oportunidades acompanhadas até uma conclusão, sem depender apenas de aumentar o investimento em mídia.",
      outcome: "Menos desperdício do marketing já realizado",
      icon: Target,
    },
    {
      title: "Continuidade da operação",
      description:
        "Históricos, objeções, propostas e próximos passos permanecem disponíveis para a unidade.",
      outcome: "Menos perda de contexto e retrabalho",
      icon: ShieldCheck,
    },
    {
      title: "Gestão mais previsível",
      description:
        "Produtividade, conversão, tempo de resposta e oportunidades paradas passam a ser acompanhados com clareza.",
      outcome: "Decisões baseadas na rotina real da equipe",
      icon: TrendingUp,
    },
  ];

  const metrics: MetricItem[] = [
    {
      title: "Primeiro atendimento",
      description: "Tempo entre a entrada do lead e o primeiro retorno.",
      icon: Clock3,
    },
    {
      title: "Próxima atividade",
      description: "Oportunidades sem ação ou prazo definido.",
      icon: CalendarCheck2,
    },
    {
      title: "Conversão por etapa",
      description: "Avanço do lead ao longo do funil comercial.",
      icon: Funnel,
    },
    {
      title: "Produtividade",
      description: "Contatos e acompanhamentos executados no período.",
      icon: BarChart3,
    },
  ];

  const resourceGroups: ResourceGroup[] = [
    {
      label: "CRM de Leads",
      title: "Cada oportunidade com etapa, responsável e próxima ação.",
      description:
        "O CRM reúne o histórico comercial e oferece uma visão única do que está acontecendo em cada unidade.",
      icon: Funnel,
      items: [
        "Funil visual até a matrícula",
        "Responsáveis, tarefas e prazos",
        "Histórico de mensagens e negociações",
        "Indicadores para gestores e franqueadora",
      ],
    },
    {
      label: "Workflow comercial",
      title: "Uma rotina comum para orientar o trabalho da equipe.",
      description:
        "As etapas e os acompanhamentos deixam de ser controles individuais e passam a fazer parte do processo oficial.",
      icon: Workflow,
      items: [
        "Etapas padronizadas para a rede",
        "Cadências e retornos organizados",
        "Critérios claros para avanço do lead",
        "Acompanhamento das oportunidades paradas",
      ],
    },
    {
      label: "WhatsApp integrado",
      title: "Cinco números por unidade, distribuídos conforme a operação.",
      description:
        "Os números poderão ser utilizados no CRM de Leads e no F10, conforme a definição realizada durante a implantação.",
      icon: MessageCircleMore,
      items: [
        "Atendimento comercial vinculado ao lead",
        "Continuidade entre diferentes atendentes",
        "Relacionamento com alunos e responsáveis",
        "Avisos, orientações, cobranças e acordos",
      ],
    },
  ];

  const cashExamples: CashExample[] = [
    { share: "20%", value: "R$ 359" },
    { share: "40%", value: "R$ 319" },
    { share: "80%", value: "R$ 239" },
    { share: "100%", value: "R$ 199" },
  ];

  const implementationSteps: ImplementationStep[] = [
    {
      number: "01",
      owner: "Unidade",
      title: "Preparação",
      description: "Indicar o responsável local, os usuários e os números que participarão da operação.",
    },
    {
      number: "02",
      owner: "F10 + unidade",
      title: "Configuração",
      description: "Estruturar acessos, workflow comercial e distribuição dos números de WhatsApp.",
    },
    {
      number: "03",
      owner: "F10",
      title: "Treinamento",
      description: "Capacitar gestores, vendedores e demais responsáveis pela rotina comercial.",
    },
    {
      number: "04",
      owner: "Rede + F10 + unidade",
      title: "Início assistido",
      description: "Colocar o novo modelo em operação, acompanhar indicadores e realizar os ajustes iniciais.",
    },
  ];
</script>

<svelte:head>
  <title>Rede Cebrac | Novo padrão comercial com CRM e WhatsApp</title>
  <meta
    name="description"
    content="Comunicado às unidades Cebrac sobre o novo padrão comercial, CRM de Leads, workflow, WhatsApp integrado, investimento e implantação na rede."
  />
  <meta name="robots" content="noindex,nofollow,noarchive,nosnippet" />
  <link rel="preload" as="image" href="/background-hero-cebrac.png" />
  <link rel="preload" as="image" href="/hero-cebrac.webp" type="image/webp" />
  <link rel="preload" as="image" href="/f10_kanban.png" />
</svelte:head>

<div class="page-shell" id="inicio">
  <header class="hero-section">
    <img class="hero-background" src="/background-hero-cebrac.png" alt="" aria-hidden="true" />

    <div class="hero-container">
      <div class="hero-copy">
        <div class="brand-lockup" aria-label="Cebrac e F10 Software">
          <span class="brand-cebrac"><img src="/Logo-Cebrac.png" alt="Cebrac" /></span>
          <span class="brand-divider"></span>
          <img class="brand-f10" src="/logo_f10.svg" alt="F10 Software" />
        </div>

        <p class="eyebrow eyebrow-orange">Comunicado às unidades Cebrac</p>
        <h1>Um novo padrão para acompanhar cada oportunidade até a matrícula.</h1>
        <p class="hero-description">
          A Rede Cebrac adotará CRM de Leads, workflow comercial e WhatsApp integrado ao F10 para organizar a rotina, preservar os históricos e dar mais visibilidade à gestão.
        </p>

        <dl class="hero-facts">
          <div>
            <dt>Aplicação</dt>
            <dd>Todas as unidades da rede</dd>
          </div>
          <div>
            <dt>WhatsApp no F10</dt>
            <dd>A partir de agosto de 2026</dd>
          </div>
          <div>
            <dt>Implantação</dt>
            <dd>Progressiva e acompanhada</dd>
          </div>
        </dl>
      </div>

      <div class="hero-visual">
        <img
          src="/hero-cebrac.webp"
          alt="CRM F10 exibido em notebook e atendimento integrado pelo WhatsApp"
          fetchpriority="high"
        />
      </div>
    </div>
  </header>

  <nav class="page-nav" aria-label="Navegação do comunicado">
    <div class="page-nav-inner">
      <img src="/Logo-Cebrac.png" alt="" aria-hidden="true" />
      <div class="page-nav-links">
        <a href="#motivo">Por que muda</a>
        <a href="#modelo">Novo modelo</a>
        <a href="#mudancas">O que muda</a>
        <a href="#beneficios">Benefícios</a>
        <a href="#recursos">Recursos</a>
        <a href="#investimento">Investimento</a>
        <a href="#implantacao">Implantação</a>
      </div>
    </div>
  </nav>

  <main>
    <section class="section section-light" id="motivo">
      <div class="section-container context-layout">
        <div class="section-heading context-heading">
          <p class="eyebrow">Por que a rede está mudando</p>
          <h2>Gerar oportunidades não é suficiente. É necessário garantir continuidade.</h2>
          <p>
            A unidade já investe para atrair interessados. O novo padrão foi criado para reduzir perdas entre a entrada do lead e a matrícula, especialmente quando faltam prazo, responsável, histórico ou acompanhamento.
          </p>
        </div>

        <div class="journey-panel">
          <div class="journey-line" aria-hidden="true"></div>
          <ol class="journey-list">
            {#each journeySteps as step, index}
              <li class="journey-item">
                <span class="journey-number">0{index + 1}</span>
                <span class="journey-icon"><svelte:component this={step.icon} size={21} strokeWidth={1.9} /></span>
                <div>
                  <h3>{step.title}</h3>
                  <p>{step.description}</p>
                </div>
              </li>
            {/each}
          </ol>

          <div class="context-note">
            <strong>Onde as perdas aparecem hoje</strong>
            <span>Retorno atrasado</span>
            <span>Lead sem próxima ação</span>
            <span>Conversa em canal pessoal</span>
            <span>Troca de vendedor sem histórico</span>
          </div>
        </div>
      </div>
    </section>

    <section class="section section-blue" id="modelo">
      <div class="section-container">
        <div class="model-intro">
          <div class="section-heading section-heading-light">
            <p class="eyebrow eyebrow-yellow">O novo modelo comercial</p>
            <h2>Uma operação visível do primeiro contato ao relacionamento com o aluno.</h2>
          </div>
          <p>
            O CRM organiza a oportunidade, o workflow orienta a rotina e o WhatsApp mantém a conversa dentro do contexto. Depois da matrícula, o relacionamento continua no F10.
          </p>
        </div>

        <div class="model-showcase">
          <div class="model-copy">
            <div class="model-statement">
              <span>01</span>
              <div>
                <strong>O lead entra com origem e responsável.</strong>
                <p>Nenhuma oportunidade começa sem contexto ou sem uma pessoa definida para agir.</p>
              </div>
            </div>
            <div class="model-statement">
              <span>02</span>
              <div>
                <strong>A equipe trabalha com prazo e próxima ação.</strong>
                <p>Retornos, tarefas e follow-ups passam a fazer parte do processo, não da memória.</p>
              </div>
            </div>
            <div class="model-statement">
              <span>03</span>
              <div>
                <strong>A gestão acompanha o que está avançando e o que parou.</strong>
                <p>O funil apresenta volume, tempo em etapa, produtividade e gargalos.</p>
              </div>
            </div>
          </div>

          <figure class="crm-figure">
            <div class="browser-bar">
              <span></span><span></span><span></span>
              <small>Visão Kanban do CRM</small>
            </div>
            <img src="/f10_kanban.png" alt="Visão Kanban real do CRM de Leads F10" />
            <figcaption>Exemplo da visão utilizada para acompanhar etapas, responsáveis e próximas ações.</figcaption>
          </figure>
        </div>
      </div>
    </section>

    <section class="section section-paper" id="mudancas">
      <div class="section-container change-layout">
        <div class="section-heading change-heading">
          <p class="eyebrow">O que muda na rotina</p>
          <h2>Menos dependência de controles individuais. Mais continuidade de processo.</h2>
          <p>
            A mudança não elimina a responsabilidade da equipe. Ela cria uma estrutura para que a rotina seja executada, acompanhada e preservada.
          </p>
        </div>

        <div class="change-list">
          <div class="change-header" aria-hidden="true">
            <span>Área</span>
            <span>Hoje</span>
            <span>Novo padrão</span>
          </div>
          {#each changeItems as item}
            <article class="change-row">
              <strong>{item.area}</strong>
              <p>{item.current}</p>
              <div class="change-future">
                <ArrowRight size={19} strokeWidth={2} />
                <p>{item.future}</p>
              </div>
            </article>
          {/each}
        </div>
      </div>
    </section>

    <section class="section section-light" id="beneficios">
      <div class="section-container">
        <div class="benefit-intro">
          <div class="section-heading">
            <p class="eyebrow">Benefícios esperados</p>
            <h2>O ganho vem da combinação entre método, disciplina comercial e informação.</h2>
          </div>
          <p>
            A tecnologia fornece a estrutura. O resultado depende da adoção do processo pelas unidades e do acompanhamento contínuo da gestão.
          </p>
        </div>

        <div class="benefit-grid">
          {#each benefits as benefit, index}
            <article class="benefit-item">
              <div class="benefit-meta">
                <span>0{index + 1}</span>
                <svelte:component this={benefit.icon} size={25} strokeWidth={1.8} />
              </div>
              <h3>{benefit.title}</h3>
              <p>{benefit.description}</p>
              <strong>{benefit.outcome}</strong>
            </article>
          {/each}
        </div>

        <div class="metric-band">
          <div class="metric-band-heading">
            <span>Gestão</span>
            <strong>Quatro perguntas simples para acompanhar a operação.</strong>
          </div>
          <div class="metric-grid">
            {#each metrics as metric}
              <article>
                <svelte:component this={metric.icon} size={22} strokeWidth={1.9} />
                <div>
                  <h3>{metric.title}</h3>
                  <p>{metric.description}</p>
                </div>
              </article>
            {/each}
          </div>
        </div>
      </div>
    </section>

    <section class="section section-resources" id="recursos">
      <div class="section-container">
        <div class="resources-intro">
          <div class="section-heading">
            <p class="eyebrow">O que será entregue</p>
            <h2>Três recursos trabalhando como uma única operação.</h2>
          </div>
          <p>
            CRM, workflow e WhatsApp não serão módulos isolados. Eles foram organizados para sustentar a mesma jornada comercial e administrativa.
          </p>
        </div>

        <div class="resource-list">
          {#each resourceGroups as group, index}
            <article class="resource-row">
              <div class="resource-index">0{index + 1}</div>
              <div class="resource-title">
                <span class="resource-icon"><svelte:component this={group.icon} size={24} strokeWidth={1.8} /></span>
                <div>
                  <small>{group.label}</small>
                  <h3>{group.title}</h3>
                </div>
              </div>
              <div class="resource-content">
                <p>{group.description}</p>
                <ul>
                  {#each group.items as item}
                    <li><CheckCircle2 size={17} strokeWidth={2} />{item}</li>
                  {/each}
                </ul>
              </div>
            </article>
          {/each}
        </div>

        <div class="whatsapp-distribution">
          <div>
            <span>5</span>
            <strong>números de WhatsApp incluídos por unidade</strong>
          </div>
          <p>
            A distribuição entre CRM de Leads e F10 será definida durante a implantação, de acordo com a operação de cada unidade.
          </p>
          <div class="distribution-example" aria-label="Exemplo de distribuição">
            <span><strong>2</strong> no CRM</span>
            <span><strong>3</strong> no F10</span>
          </div>
        </div>
      </div>
    </section>

    <section class="section section-investment" id="investimento">
      <div class="section-container investment-layout">
        <div class="investment-main">
          <p class="eyebrow eyebrow-orange">Investimento do novo modelo</p>
          <div class="price-line">
            <span>R$</span>
            <strong>399</strong>
            <span>,00</span>
          </div>
          <p class="price-period">por unidade/mês</p>
          <p class="investment-description">
            O valor reúne tecnologia, configuração, treinamento e acompanhamento inicial para implantação do novo padrão em toda a rede.
          </p>

          <ul class="included-list">
            <li><CheckCircle2 size={19} />CRM de Leads e workflow comercial</li>
            <li><CheckCircle2 size={19} />Cinco números de WhatsApp</li>
            <li><CheckCircle2 size={19} />Configuração de acessos e processo</li>
            <li><CheckCircle2 size={19} />Treinamento e início assistido</li>
          </ul>

          <div class="investment-notes">
            <p><strong>Vigência financeira:</strong> vencimento de julho de 2026.</p>
            <p><strong>Número adicional:</strong> R$ 49,00 por mês.</p>
            <p>O reajuste anual previsto para o período será substituído pelo valor do upgrade.</p>
          </div>
        </div>

        <div class="cash-panel">
          <div class="cash-heading">
            <span>F10 Cash</span>
            <h3>O percentual de recebimentos pode reduzir o valor mensal do upgrade.</h3>
            <p>
              O desconto acompanha a participação dos recebimentos via F10 Cash e pode chegar a R$ 200 por mês, conforme as regras da campanha vigente.
            </p>
          </div>

          <div class="cash-examples">
            {#each cashExamples as example}
              <article>
                <span>{example.share} via F10 Cash</span>
                <strong>{example.value}</strong>
              </article>
            {/each}
          </div>

          <div class="cash-launch-note">
            <strong>Condição de lançamento</strong>
            <p>
              Nos quatro primeiros meses, a campanha prevê faixas adicionais de incentivo. Percentuais, períodos e critérios seguem a comunicação oficial da Rede Cebrac e consideram os recebimentos do período anterior.
            </p>
          </div>
        </div>
      </div>
    </section>

    <section class="section section-blue implementation-section" id="implantacao">
      <div class="section-container">
        <div class="implementation-intro">
          <div class="section-heading section-heading-light">
            <p class="eyebrow eyebrow-yellow">Como começa</p>
            <h2>Implantação progressiva, com responsabilidades definidas.</h2>
          </div>
          <p>
            Cada unidade será preparada antes do início da operação. O cronograma oficial e as orientações serão comunicados pela Rede Cebrac.
          </p>
        </div>

        <ol class="implementation-list">
          {#each implementationSteps as step}
            <li>
              <span class="implementation-number">{step.number}</span>
              <small>{step.owner}</small>
              <h3>{step.title}</h3>
              <p>{step.description}</p>
            </li>
          {/each}
        </ol>

        <div class="implementation-summary">
          <strong>O que cada unidade deverá preparar</strong>
          <p>
            Responsável local, usuários, cinco números de WhatsApp e participação nos treinamentos previstos no cronograma oficial.
          </p>
        </div>
      </div>
    </section>
  </main>

  <footer class="page-footer">
    <div class="footer-container">
      <div class="footer-brands">
        <span class="footer-cebrac"><img src="/Logo-Cebrac.png" alt="Cebrac" /></span>
        <span></span>
        <img src="/logo_f10.svg" alt="F10 Software" />
      </div>
      <p>
        O objetivo da mudança é criar uma operação comercial mais organizada, contínua e mensurável em toda a Rede Cebrac.
      </p>
      <a href="#inicio">Voltar ao início <ArrowUp size={17} /></a>
    </div>
  </footer>
</div>

<style>
  :global(html) {
    scroll-behavior: smooth;
  }

  .page-shell {
    --blue: #2b4091;
    --blue-dark: #1f3078;
    --orange: #f36b21;
    --yellow: #ffcd40;
    --green: #61ce70;
    --ink: #18265f;
    --muted: #6773a4;
    --line: rgba(43, 64, 145, 0.15);
    --paper: #f7f8fc;
    font-family: "Plus Jakarta Sans", ui-sans-serif, system-ui, sans-serif;
    color: var(--ink);
    background: white;
  }

  .hero-section {
    position: relative;
    min-height: 720px;
    overflow: hidden;
    background: white;
  }

  .hero-background {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    object-fit: cover;
    opacity: 0.86;
  }

  .hero-container {
    position: relative;
    z-index: 1;
    display: grid;
    width: min(1460px, calc(100% - 2.5rem));
    min-height: 720px;
    margin: 0 auto;
    align-items: center;
    gap: 2rem;
    padding: 4.5rem 0 3.5rem;
  }

  .hero-copy {
    max-width: 740px;
  }

  .brand-lockup {
    display: inline-flex;
    min-height: 58px;
    align-items: center;
    overflow: hidden;
    border: 1px solid var(--line);
    border-radius: 14px;
    background: rgba(255, 255, 255, 0.94);
    box-shadow: 0 16px 45px rgba(43, 64, 145, 0.12);
  }

  .brand-cebrac {
    display: flex;
    min-height: 58px;
    align-items: center;
    background: var(--blue);
    padding: 0 1.35rem;
  }

  .brand-cebrac img {
    width: 170px;
    height: 38px;
    object-fit: contain;
  }

  .brand-divider {
    width: 1px;
    height: 30px;
    background: var(--line);
  }

  .brand-f10 {
    width: 78px;
    height: 36px;
    margin: 0 1.4rem;
    object-fit: contain;
  }

  .eyebrow {
    margin: 0;
    color: var(--blue);
    font-size: 0.72rem;
    font-weight: 800;
    letter-spacing: 0.19em;
    text-transform: uppercase;
  }

  .eyebrow-orange {
    margin-top: 2.2rem;
    color: var(--orange);
  }

  .eyebrow-yellow {
    color: var(--yellow);
  }

  .hero-copy h1 {
    max-width: 720px;
    margin: 1rem 0 0;
    color: var(--blue);
    font-size: clamp(2.75rem, 5.2vw, 5.2rem);
    font-weight: 600;
    letter-spacing: -0.055em;
    line-height: 0.99;
  }

  .hero-description {
    max-width: 670px;
    margin: 1.65rem 0 0;
    color: rgba(43, 64, 145, 0.78);
    font-size: 1.15rem;
    line-height: 1.85;
  }

  .hero-facts {
    display: grid;
    max-width: 720px;
    margin: 2rem 0 0;
    border-top: 1px solid var(--line);
    border-bottom: 1px solid var(--line);
  }

  .hero-facts div {
    padding: 1rem 0;
  }

  .hero-facts dt {
    color: var(--orange);
    font-size: 0.66rem;
    font-weight: 800;
    letter-spacing: 0.13em;
    text-transform: uppercase;
  }

  .hero-facts dd {
    margin: 0.35rem 0 0;
    color: var(--blue);
    font-size: 0.92rem;
    font-weight: 700;
  }

  .hero-visual {
    display: none;
  }

  .hero-visual img {
    display: block;
    width: 112%;
    max-width: none;
    filter: drop-shadow(0 34px 45px rgba(43, 64, 145, 0.2));
  }

  .page-nav {
    position: sticky;
    z-index: 40;
    top: 0;
    background: var(--blue);
    box-shadow: 0 8px 30px rgba(25, 39, 104, 0.14);
  }

  .page-nav-inner {
    display: flex;
    width: min(1280px, calc(100% - 2rem));
    margin: 0 auto;
    align-items: center;
    gap: 1.5rem;
    overflow-x: auto;
    scrollbar-width: none;
  }

  .page-nav-inner::-webkit-scrollbar,
  .page-nav-links::-webkit-scrollbar {
    display: none;
  }

  .page-nav-inner > img {
    display: none;
    width: 132px;
    height: 32px;
    flex: 0 0 auto;
    object-fit: contain;
  }

  .page-nav-links {
    display: flex;
    min-width: max-content;
    align-items: center;
    gap: 0.2rem;
    overflow-x: auto;
    padding: 0.62rem 0;
    scrollbar-width: none;
  }

  .page-nav-links a {
    border-radius: 999px;
    color: rgba(255, 255, 255, 0.76);
    font-size: 0.72rem;
    font-weight: 700;
    padding: 0.55rem 0.78rem;
    text-decoration: none;
    transition: background 160ms ease, color 160ms ease;
  }

  .page-nav-links a:hover,
  .page-nav-links a:focus-visible {
    background: rgba(255, 255, 255, 0.12);
    color: white;
    outline: none;
  }

  .section {
    scroll-margin-top: 56px;
    padding: 5.5rem 1.25rem;
  }

  .section-container {
    width: min(1200px, 100%);
    margin: 0 auto;
  }

  .section-light {
    background: white;
  }

  .section-paper {
    background: var(--paper);
  }

  .section-blue {
    background: var(--blue);
    color: white;
  }

  .section-heading h2 {
    margin: 0.8rem 0 0;
    color: var(--blue);
    font-size: clamp(2.2rem, 4vw, 3.65rem);
    font-weight: 600;
    letter-spacing: -0.045em;
    line-height: 1.05;
  }

  .section-heading > p:last-child,
  .section-heading + p {
    color: var(--muted);
    font-size: 1.02rem;
    line-height: 1.85;
  }

  .section-heading-light h2 {
    color: white;
  }

  .context-layout {
    display: grid;
    gap: 3.5rem;
  }

  .context-heading p:last-child {
    margin: 1.5rem 0 0;
  }

  .journey-panel {
    position: relative;
    border-top: 3px solid var(--blue);
    padding-top: 1.5rem;
  }

  .journey-line {
    display: none;
  }

  .journey-list {
    display: grid;
    margin: 0;
    padding: 0;
    list-style: none;
  }

  .journey-item {
    display: grid;
    grid-template-columns: 36px 44px 1fr;
    gap: 0.75rem;
    align-items: start;
    padding: 1.25rem 0;
    border-bottom: 1px solid var(--line);
  }

  .journey-number {
    padding-top: 0.7rem;
    color: var(--orange);
    font-size: 0.72rem;
    font-weight: 800;
  }

  .journey-icon {
    display: flex;
    width: 42px;
    height: 42px;
    align-items: center;
    justify-content: center;
    border-radius: 50%;
    background: rgba(97, 206, 112, 0.17);
    color: var(--blue);
  }

  .journey-item h3 {
    margin: 0;
    color: var(--blue);
    font-size: 1rem;
  }

  .journey-item p {
    margin: 0.35rem 0 0;
    color: var(--muted);
    font-size: 0.85rem;
    line-height: 1.55;
  }

  .context-note {
    display: flex;
    flex-wrap: wrap;
    gap: 0.65rem;
    margin-top: 1.5rem;
    align-items: center;
  }

  .context-note strong {
    width: 100%;
    color: var(--blue);
    font-size: 0.82rem;
  }

  .context-note span {
    border: 1px solid var(--line);
    border-radius: 999px;
    color: var(--muted);
    font-size: 0.75rem;
    padding: 0.45rem 0.65rem;
  }

  .model-intro,
  .benefit-intro,
  .resources-intro,
  .implementation-intro {
    display: grid;
    gap: 1.5rem;
    align-items: end;
  }

  .model-intro > p,
  .implementation-intro > p {
    margin: 0;
    color: rgba(255, 255, 255, 0.68);
    font-size: 1rem;
    line-height: 1.8;
  }

  .model-showcase {
    display: grid;
    gap: 2.5rem;
    margin-top: 3.5rem;
    align-items: center;
  }

  .model-copy {
    border-top: 1px solid rgba(255, 255, 255, 0.18);
  }

  .model-statement {
    display: grid;
    grid-template-columns: 46px 1fr;
    gap: 0.9rem;
    padding: 1.4rem 0;
    border-bottom: 1px solid rgba(255, 255, 255, 0.18);
  }

  .model-statement > span {
    color: var(--yellow);
    font-size: 0.78rem;
    font-weight: 800;
  }

  .model-statement strong {
    color: white;
    font-size: 1.05rem;
  }

  .model-statement p {
    margin: 0.45rem 0 0;
    color: rgba(255, 255, 255, 0.64);
    font-size: 0.86rem;
    line-height: 1.6;
  }

  .crm-figure {
    overflow: hidden;
    margin: 0;
    border: 1px solid rgba(255, 255, 255, 0.19);
    border-radius: 18px;
    background: white;
    box-shadow: 0 26px 70px rgba(8, 18, 67, 0.32);
  }

  .browser-bar {
    display: flex;
    min-height: 42px;
    align-items: center;
    gap: 0.4rem;
    border-bottom: 1px solid var(--line);
    background: #f2f4fa;
    padding: 0 1rem;
  }

  .browser-bar span {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: var(--green);
  }

  .browser-bar span:nth-child(2) {
    background: var(--yellow);
  }

  .browser-bar span:nth-child(3) {
    background: var(--orange);
  }

  .browser-bar small {
    margin-left: 0.4rem;
    color: var(--muted);
    font-size: 0.63rem;
    font-weight: 800;
    letter-spacing: 0.1em;
    text-transform: uppercase;
  }

  .crm-figure img {
    display: block;
    width: 100%;
  }

  .crm-figure figcaption {
    border-top: 1px solid var(--line);
    color: var(--muted);
    font-size: 0.72rem;
    line-height: 1.5;
    padding: 0.8rem 1rem;
  }

  .change-layout {
    display: grid;
    gap: 3rem;
  }

  .change-heading p:last-child {
    margin: 1.4rem 0 0;
  }

  .change-list {
    border-top: 3px solid var(--blue);
  }

  .change-header {
    display: none;
  }

  .change-row {
    display: grid;
    gap: 0.75rem;
    padding: 1.35rem 0;
    border-bottom: 1px solid var(--line);
  }

  .change-row > strong {
    color: var(--orange);
    font-size: 0.72rem;
    letter-spacing: 0.12em;
    text-transform: uppercase;
  }

  .change-row p {
    margin: 0;
    color: var(--muted);
    font-size: 0.88rem;
    line-height: 1.6;
  }

  .change-future {
    display: grid;
    grid-template-columns: 24px 1fr;
    gap: 0.5rem;
    color: var(--green);
  }

  .change-future p {
    color: var(--blue);
    font-weight: 700;
  }

  .benefit-intro > p,
  .resources-intro > p {
    margin: 0;
    color: var(--muted);
    font-size: 1rem;
    line-height: 1.8;
  }

  .benefit-grid {
    display: grid;
    gap: 2rem;
    margin-top: 3.25rem;
  }

  .benefit-item {
    border-top: 4px solid var(--blue);
    padding-top: 1.2rem;
  }

  .benefit-item:nth-child(2) {
    border-color: var(--green);
  }

  .benefit-item:nth-child(3) {
    border-color: var(--orange);
  }

  .benefit-meta {
    display: flex;
    align-items: center;
    justify-content: space-between;
    color: var(--blue);
  }

  .benefit-meta span {
    color: rgba(43, 64, 145, 0.25);
    font-size: 2rem;
    font-weight: 700;
  }

  .benefit-item h3 {
    margin: 1rem 0 0;
    color: var(--blue);
    font-size: 1.35rem;
    line-height: 1.25;
  }

  .benefit-item > p {
    margin: 0.8rem 0 0;
    color: var(--muted);
    font-size: 0.9rem;
    line-height: 1.7;
  }

  .benefit-item > strong {
    display: block;
    margin-top: 1.1rem;
    color: var(--ink);
    font-size: 0.78rem;
    line-height: 1.5;
  }

  .metric-band {
    margin-top: 4rem;
    background: var(--blue);
    color: white;
    padding: 1.5rem;
  }

  .metric-band-heading span {
    color: var(--yellow);
    font-size: 0.68rem;
    font-weight: 800;
    letter-spacing: 0.14em;
    text-transform: uppercase;
  }

  .metric-band-heading strong {
    display: block;
    margin-top: 0.45rem;
    font-size: 1.15rem;
  }

  .metric-grid {
    display: grid;
    gap: 1rem;
    margin-top: 1.5rem;
  }

  .metric-grid article {
    display: grid;
    grid-template-columns: 34px 1fr;
    gap: 0.7rem;
    border-top: 1px solid rgba(255, 255, 255, 0.17);
    padding-top: 1rem;
  }

  .metric-grid article > :global(svg) {
    color: var(--green);
  }

  .metric-grid h3 {
    margin: 0;
    color: white;
    font-size: 0.88rem;
  }

  .metric-grid p {
    margin: 0.3rem 0 0;
    color: rgba(255, 255, 255, 0.62);
    font-size: 0.75rem;
    line-height: 1.5;
  }

  .section-resources {
    background: #f2f4fa;
  }

  .resource-list {
    margin-top: 3.25rem;
    border-top: 3px solid var(--blue);
  }

  .resource-row {
    display: grid;
    gap: 1rem;
    padding: 1.75rem 0;
    border-bottom: 1px solid var(--line);
  }

  .resource-index {
    color: rgba(43, 64, 145, 0.25);
    font-size: 1.6rem;
    font-weight: 700;
  }

  .resource-title {
    display: grid;
    grid-template-columns: 44px 1fr;
    gap: 0.85rem;
    align-items: start;
  }

  .resource-icon {
    display: flex;
    width: 42px;
    height: 42px;
    align-items: center;
    justify-content: center;
    border-radius: 50%;
    background: rgba(97, 206, 112, 0.18);
    color: var(--blue);
  }

  .resource-title small {
    color: var(--orange);
    font-size: 0.66rem;
    font-weight: 800;
    letter-spacing: 0.13em;
    text-transform: uppercase;
  }

  .resource-title h3 {
    margin: 0.35rem 0 0;
    color: var(--blue);
    font-size: 1.3rem;
    line-height: 1.3;
  }

  .resource-content > p {
    margin: 0;
    color: var(--muted);
    font-size: 0.88rem;
    line-height: 1.7;
  }

  .resource-content ul {
    display: grid;
    gap: 0.65rem;
    margin: 1rem 0 0;
    padding: 0;
    list-style: none;
  }

  .resource-content li {
    display: flex;
    gap: 0.55rem;
    color: var(--blue);
    font-size: 0.82rem;
    font-weight: 700;
  }

  .resource-content li :global(svg) {
    flex: 0 0 auto;
    color: var(--green);
  }

  .whatsapp-distribution {
    display: grid;
    gap: 1.25rem;
    margin-top: 2.5rem;
    align-items: center;
    border-left: 5px solid var(--green);
    background: white;
    padding: 1.5rem;
    box-shadow: 0 18px 45px rgba(43, 64, 145, 0.08);
  }

  .whatsapp-distribution > div:first-child {
    display: flex;
    gap: 0.8rem;
    align-items: center;
  }

  .whatsapp-distribution > div:first-child span {
    color: var(--blue);
    font-size: 3rem;
    font-weight: 700;
    line-height: 1;
  }

  .whatsapp-distribution > div:first-child strong {
    color: var(--blue);
    font-size: 1rem;
    line-height: 1.4;
  }

  .whatsapp-distribution > p {
    margin: 0;
    color: var(--muted);
    font-size: 0.85rem;
    line-height: 1.65;
  }

  .distribution-example {
    display: flex;
    gap: 0.7rem;
  }

  .distribution-example span {
    min-width: 96px;
    background: var(--paper);
    color: var(--muted);
    font-size: 0.75rem;
    padding: 0.7rem 0.8rem;
  }

  .distribution-example strong {
    display: block;
    color: var(--orange);
    font-size: 1.5rem;
  }

  .section-investment {
    background: #fffaf5;
  }

  .investment-layout {
    display: grid;
    gap: 3rem;
  }

  .investment-main {
    border-top: 4px solid var(--orange);
    padding-top: 1.5rem;
  }

  .price-line {
    display: flex;
    margin-top: 1.2rem;
    align-items: flex-end;
    color: var(--orange);
  }

  .price-line span {
    padding-bottom: 0.65rem;
    font-size: 1.15rem;
    font-weight: 800;
  }

  .price-line strong {
    font-size: clamp(4rem, 9vw, 6.5rem);
    font-weight: 600;
    letter-spacing: -0.07em;
    line-height: 0.85;
  }

  .price-period {
    margin: 0.7rem 0 0;
    color: var(--blue);
    font-size: 0.85rem;
    font-weight: 700;
  }

  .investment-description {
    margin: 1.5rem 0 0;
    color: var(--muted);
    font-size: 0.95rem;
    line-height: 1.75;
  }

  .included-list {
    display: grid;
    gap: 0.8rem;
    margin: 1.6rem 0 0;
    padding: 0;
    list-style: none;
  }

  .included-list li {
    display: flex;
    gap: 0.6rem;
    color: var(--blue);
    font-size: 0.86rem;
    font-weight: 700;
  }

  .included-list :global(svg) {
    flex: 0 0 auto;
    color: var(--green);
  }

  .investment-notes {
    display: grid;
    gap: 0.45rem;
    margin-top: 1.6rem;
    border-top: 1px solid var(--line);
    padding-top: 1.2rem;
  }

  .investment-notes p {
    margin: 0;
    color: var(--muted);
    font-size: 0.78rem;
    line-height: 1.6;
  }

  .investment-notes strong {
    color: var(--blue);
  }

  .cash-panel {
    background: white;
    border: 1px solid var(--line);
    padding: 1.5rem;
    box-shadow: 0 22px 60px rgba(43, 64, 145, 0.09);
  }

  .cash-heading > span {
    color: var(--green);
    font-size: 0.7rem;
    font-weight: 800;
    letter-spacing: 0.14em;
    text-transform: uppercase;
  }

  .cash-heading h3 {
    margin: 0.65rem 0 0;
    color: var(--blue);
    font-size: 1.65rem;
    line-height: 1.25;
  }

  .cash-heading p {
    margin: 0.9rem 0 0;
    color: var(--muted);
    font-size: 0.86rem;
    line-height: 1.7;
  }

  .cash-examples {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    margin-top: 1.5rem;
    border-top: 1px solid var(--line);
    border-left: 1px solid var(--line);
  }

  .cash-examples article {
    border-right: 1px solid var(--line);
    border-bottom: 1px solid var(--line);
    padding: 1rem;
  }

  .cash-examples span {
    display: block;
    color: var(--muted);
    font-size: 0.68rem;
  }

  .cash-examples strong {
    display: block;
    margin-top: 0.35rem;
    color: var(--blue);
    font-size: 1.25rem;
  }

  .cash-launch-note {
    margin-top: 1.4rem;
    border-left: 4px solid var(--yellow);
    background: #fffbec;
    padding: 1rem;
  }

  .cash-launch-note strong {
    color: var(--blue);
    font-size: 0.82rem;
  }

  .cash-launch-note p {
    margin: 0.35rem 0 0;
    color: var(--muted);
    font-size: 0.74rem;
    line-height: 1.6;
  }

  .implementation-list {
    display: grid;
    gap: 2rem;
    margin: 3.25rem 0 0;
    padding: 0;
    list-style: none;
  }

  .implementation-list li {
    position: relative;
    border-top: 1px solid rgba(255, 255, 255, 0.2);
    padding-top: 1.35rem;
  }

  .implementation-number {
    display: inline-flex;
    width: 44px;
    height: 44px;
    align-items: center;
    justify-content: center;
    border-radius: 50%;
    background: var(--yellow);
    color: var(--blue);
    font-size: 0.72rem;
    font-weight: 800;
  }

  .implementation-list small {
    display: block;
    margin-top: 1rem;
    color: var(--green);
    font-size: 0.65rem;
    font-weight: 800;
    letter-spacing: 0.12em;
    text-transform: uppercase;
  }

  .implementation-list h3 {
    margin: 0.4rem 0 0;
    color: white;
    font-size: 1.2rem;
  }

  .implementation-list p {
    margin: 0.6rem 0 0;
    color: rgba(255, 255, 255, 0.62);
    font-size: 0.83rem;
    line-height: 1.65;
  }

  .implementation-summary {
    display: grid;
    gap: 0.5rem;
    margin-top: 3rem;
    border-top: 1px solid rgba(255, 255, 255, 0.18);
    border-bottom: 1px solid rgba(255, 255, 255, 0.18);
    padding: 1.4rem 0;
  }

  .implementation-summary strong {
    color: var(--yellow);
    font-size: 0.72rem;
    letter-spacing: 0.13em;
    text-transform: uppercase;
  }

  .implementation-summary p {
    margin: 0;
    color: white;
    font-size: 1rem;
    line-height: 1.6;
  }

  .page-footer {
    background: white;
    padding: 3rem 1.25rem;
  }

  .footer-container {
    display: grid;
    width: min(1200px, 100%);
    margin: 0 auto;
    gap: 1.5rem;
    align-items: center;
    border-top: 1px solid var(--line);
    padding-top: 2rem;
  }

  .footer-brands {
    display: flex;
    align-items: center;
    gap: 1rem;
  }

  .footer-brands > span:nth-child(2) {
    width: 1px;
    height: 34px;
    background: var(--line);
  }

  .footer-cebrac {
    display: flex;
    align-items: center;
    background: var(--blue);
    padding: 0.45rem 0.7rem;
  }

  .footer-cebrac img {
    width: 135px;
    height: 31px;
    object-fit: contain;
  }

  .footer-brands > img {
    width: 68px;
    height: 36px;
    object-fit: contain;
  }

  .footer-container > p {
    margin: 0;
    color: var(--muted);
    font-size: 0.85rem;
    line-height: 1.7;
  }

  .footer-container > a {
    display: inline-flex;
    align-items: center;
    gap: 0.4rem;
    color: var(--blue);
    font-size: 0.78rem;
    font-weight: 800;
    text-decoration: none;
  }

  @media (min-width: 640px) {
    .hero-facts {
      grid-template-columns: repeat(3, minmax(0, 1fr));
    }

    .hero-facts div {
      padding: 1rem 1.1rem;
      border-right: 1px solid var(--line);
    }

    .hero-facts div:first-child {
      padding-left: 0;
    }

    .hero-facts div:last-child {
      border-right: 0;
    }

    .metric-grid {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }

    .whatsapp-distribution {
      grid-template-columns: 0.8fr 1.3fr auto;
    }
  }

  @media (min-width: 768px) {
    .section {
      padding: 6.5rem 2rem;
    }

    .benefit-grid {
      grid-template-columns: repeat(3, minmax(0, 1fr));
    }

    .metric-band {
      display: grid;
      grid-template-columns: 0.7fr 1.3fr;
      gap: 2rem;
      padding: 1.8rem 2rem;
    }

    .metric-grid {
      margin-top: 0;
    }

    .resource-row {
      grid-template-columns: 60px minmax(0, 0.9fr) minmax(0, 1.1fr);
      gap: 1.5rem;
      align-items: start;
    }

    .investment-layout {
      grid-template-columns: minmax(0, 0.82fr) minmax(0, 1.18fr);
      gap: 4rem;
      align-items: start;
    }

    .cash-panel {
      padding: 2rem;
    }

    .implementation-list {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }

    .footer-container {
      grid-template-columns: auto 1fr auto;
      gap: 2rem;
    }
  }

  @media (min-width: 1024px) {
    .hero-container {
      grid-template-columns: minmax(0, 0.86fr) minmax(0, 1.14fr);
    }

    .hero-visual {
      display: flex;
      min-height: 620px;
      margin-left: -7rem;
      margin-right: -5rem;
      align-items: center;
      justify-content: flex-end;
      pointer-events: none;
    }

    .page-nav-inner > img {
      display: block;
    }

    .context-layout {
      grid-template-columns: minmax(0, 0.62fr) minmax(0, 1.38fr);
      gap: 5rem;
      align-items: start;
    }

    .context-heading {
      position: sticky;
      top: 92px;
    }

    .model-intro,
    .benefit-intro,
    .resources-intro,
    .implementation-intro {
      grid-template-columns: minmax(0, 1.15fr) minmax(0, 0.85fr);
      gap: 5rem;
    }

    .model-showcase {
      grid-template-columns: minmax(0, 0.68fr) minmax(0, 1.32fr);
      gap: 4rem;
    }

    .change-layout {
      grid-template-columns: minmax(0, 0.55fr) minmax(0, 1.45fr);
      gap: 5rem;
      align-items: start;
    }

    .change-heading {
      position: sticky;
      top: 92px;
    }

    .change-header {
      display: grid;
      grid-template-columns: 0.45fr 1fr 1fr;
      gap: 1.4rem;
      padding: 0.8rem 0;
      border-bottom: 1px solid var(--line);
      color: var(--muted);
      font-size: 0.65rem;
      font-weight: 800;
      letter-spacing: 0.12em;
      text-transform: uppercase;
    }

    .change-row {
      grid-template-columns: 0.45fr 1fr 1fr;
      gap: 1.4rem;
      align-items: center;
    }

    .benefit-grid {
      gap: 3rem;
    }

    .implementation-list {
      grid-template-columns: repeat(4, minmax(0, 1fr));
      gap: 2.5rem;
    }

    .implementation-summary {
      grid-template-columns: 0.45fr 1.55fr;
      gap: 2rem;
      align-items: center;
    }
  }

  @media (prefers-reduced-motion: reduce) {
    :global(html) {
      scroll-behavior: auto;
    }

    .page-shell *,
    .page-shell *::before,
    .page-shell *::after {
      transition-duration: 0.01ms !important;
    }
  }
</style>
