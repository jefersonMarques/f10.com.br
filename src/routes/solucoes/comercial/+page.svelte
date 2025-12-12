<script lang="ts">
  // ===== Imports =====
  import Breadcrumb from "$lib/components/Breadcrumb.svelte";
  import IconArrowRight from "$lib/icons/IconArrowRight.svelte";
  import FaqAccordion from "$lib/components/FaqAccordion.svelte";
  import { Megaphone, BarChart3, FileText, Users2 } from "lucide-svelte";
  import type { ComponentType } from "svelte";
  import KpiPanel from "$lib/components/KpiPanel.svelte";
  import Testimonial from "$lib/components/Testimonial.svelte";
  import { contactModalConfig } from "$lib/stores/contactModals";
  import { showForm } from "$lib/stores/formPopup";

  // ===== Tipos =====
  // Ícone compatível com <svelte:component this={pillar.icon} />
  type IconComponent = ComponentType;

  type Pillar = {
    title: string;
    description: string;
    icon: IconComponent;
  };

  type StepItem = {
    label: string;
    title: string;
    description: string;
  };

  type BenefitItem = {
    title: string;
    description: string;
  };

  type KpiItem = {
    value: string;
    label: string;
  };

  type IntegrationHighlight = {
    title: string;
    description: string;
  };

  type CrmRow = {
    name: string;
    status: string;
    phone?: string;
    source: string;
    course: string;
  };

  type CrmStage = {
    label: string;
    colorClass: string; // cor da faixa do estágio
    rows: CrmRow[];
  };

  type ContractPoint = {
    title: string;
    description: string;
  };

  // Mini grid para exemplo de contratos
  type MiniContractRow = {
    id: string;
    student: string;
    status: string;
    type: string;
    course: string;
  };

  type ContractSourceRow = {
    source: string;
    value: string; // já formatado em R$ para exibição
    enrollments: number; // quantidade de matrículas
    ticket: string; // ticket médio formatado
  };

  type ContractBar = {
    label: string;
    percent: number; // 0–100, usado só pra largura visual
    count: number; // quantidade de matrículas
    color: string; // cor da barra
  };

  const contractCubeSummary: ContractSourceRow[] = [
    {
      source: "Cadastro secretaria",
      value: "R$ 318.080,00",
      enrollments: 284,
      ticket: "R$ 1.120,00",
    },
    {
      source: "Facebook Ads",
      value: "R$ 94.080,00",
      enrollments: 196,
      ticket: "R$ 480,00",
    },
    {
      source: "Google / site",
      value: "R$ 77.520,00",
      enrollments: 152,
      ticket: "R$ 510,00",
    },
    {
      source: "Feira de cursos",
      value: "R$ 29.760,00",
      enrollments: 64,
      ticket: "R$ 465,00",
    },
    {
      source: "Indicação",
      value: "R$ 51.940,00",
      enrollments: 98,
      ticket: "R$ 530,00",
    },
  ];

  const contractCubeBars: ContractBar[] = [
    { label: "Secretaria", percent: 100, count: 284, color: "#EA6D0B" },
    { label: "Facebook Ads", percent: 70, count: 196, color: "#4F46E5" },
    { label: "Google / site", percent: 55, count: 152, color: "#0EA5E9" },
    { label: "Indicação", percent: 35, count: 98, color: "#10B981" },
    { label: "Feira", percent: 25, count: 64, color: "#64748B" },
  ];

  const contractRows: MiniContractRow[] = [
    {
      id: "9.588",
      student: "Ana Carolina Oliveira",
      status: "Pré matrícula",
      type: "Online",
      course: "Informática · Melhor Idade",
    },
    {
      id: "9.589",
      student: "Lucas Henrique Silva",
      status: "Pré matrícula",
      type: "Online",
      course: "Inglês Básico",
    },
    {
      id: "9.590",
      student: "Beatriz Santos Almeida",
      status: "Pré matrícula",
      type: "Balcão",
      course: "Administração 2.0",
    },
    {
      id: "9.591",
      student: "João Pedro Nogueira",
      status: "Matrícula",
      type: "Online",
      course: "Curso Livre F10 (100% Presencial)",
    },
    {
      id: "9.592",
      student: "Mariana Rocha Ferreira",
      status: "Matrícula",
      type: "Balcão",
      course: "Enfermagem",
    },
    {
      id: "9.593",
      student: "Gabriel Costa Martins",
      status: "Pré matrícula",
      type: "Online",
      course: "Gestão Administrativa",
    },
    {
      id: "9.594",
      student: "Carolina Teixeira Souza",
      status: "Ativo",
      type: "Online",
      course: "Curso Livre F10 (100% Presencial)",
    },
    {
      id: "9.595",
      student: "Rafael Moreira Lima",
      status: "Ativo",
      type: "Balcão",
      course: "Inglês Intermediário",
    },
    {
      id: "9.596",
      student: "Isabela Mendes Duarte",
      status: "Quitado",
      type: "Online",
      course: "Informática Profissionalizante",
    },
  ];

  const contractFlowPoints: ContractPoint[] = [
    {
      title: "Contratos físicos e digitais com checklist de matrícula",
      description:
        "Tudo começa com um pré-contrato: coleta de dados, checklist de documentos, selfie, CNH, comprovantes e termos obrigatórios antes da assinatura.",
    },
    {
      title: "Matrícula conectada a cursos, turmas e integrações",
      description:
        "Cada contrato pode envolver um ou múltiplos cursos, com inclusão em uma ou mais turmas, integração entre cursos e aulas compartilhadas.",
    },
    {
      title: "Arquivamento, assinatura e auditoria em um só lugar",
      description:
        "Histórico de versões, tipo de assinatura (digital ou impressa) com validade legal, registros de quem assinou, quando e por qual canal.",
    },
  ];

  const contractStatusPoints: ContractPoint[] = [
    {
      title: "Pré-contrato e pendências",
      description:
        "Contrato criado = pré-contrato. Acompanhamento de documentos faltantes, pendência de assinatura e conferência de dados pela secretaria.",
    },
    {
      title: "Matrícula confirmada",
      description:
        "Entrada paga (matrícula, material ou primeira parcela) transforma o contrato em matrícula ativa, pronta para ser acompanhada no pedagógico.",
    },
    {
      title: "Presença, experiência e risco de evasão",
      description:
        "Primeira presença, primeira falta, status de 'não veio' e alertas que conectam Comercial, Secretaria e Pedagógico na jornada do aluno.",
    },
  ];

  // ===== Mini-CRM do mock =====
  const crmStages: CrmStage[] = [
    {
      label: "Sem dono",
      // entrada do funil: leads que acabaram de chegar
      colorClass: "bg-[#E4F1FF]",
      rows: [
        {
          name: "Yasmin",
          status: "Novo",
          phone: "(41) 99821-4503",
          source: "Facebook Ads",
          course: "Inglês intensivo",
        },
        {
          name: "Weverton",
          status: "Novo",
          phone: "(41) 99732-1189",
          source: "Google Ads",
          course: "Informática básica",
        },
        {
          name: "Wilson",
          status: "Novo",
          phone: "(41) 99980-7742",
          source: "Indicação",
          course: "Espanhol conversação",
        },
      ],
    },
    {
      label: "1ª abordagem",
      // abordagem inicial: ligação, WhatsApp, retorno
      colorClass: "bg-[#FFEBDD]",
      rows: [
        {
          name: "Estefani",
          status: "Ligação",
          phone: "(41) 98876-2345",
          source: "Facebook Ads",
          course: "Curso de informática",
        },
        {
          name: "Jeferson",
          status: "WhatsApp",
          phone: "(41) 99989-9899",
          source: "WhatsApp",
          course: "Programação para jovens",
        },
        {
          name: "Lead 0001",
          status: "Retorno",
          phone: "(41) 99771-6655",
          source: "Landing page",
          course: "Inglês Kids",
        },
      ],
    },
    {
      label: "Trabalhando",
      // leads em negociação ativa
      colorClass: "bg-[#E5F6EE]",
      rows: [
        {
          name: "Maria",
          status: "Visita",
          phone: "(41) 99650-2211",
          source: "Instagram Ads",
          course: "Design gráfico",
        },
        {
          name: "Wilson",
          status: "Proposta",
          phone: "(41) 99544-3322",
          source: "Google Ads",
          course: "Excel avançado",
        },
        {
          name: "Maicon",
          status: "Fechamento",
          phone: "(41) 99430-1188",
          source: "Facebook Ads",
          course: "Preparatório ENEM",
        },
      ],
    },
  ];

  // ===== Pilares do Comercial & CRM =====
  const pillars: Pillar[] = [
    {
      title: "Leads de vários canais<br/>em um só funil",
      description:
        "Facebook Lead Ads, formulários do site, listas importadas (CSV/Excel), campanhas de Google Ads e integrações via API chegam higienizados e organizados no mesmo funil, com rastreabilidade da jornada do lead do primeiro contato até a matrícula.",
      icon: Megaphone,
    },
    {
      title: "Funil de vendas<br/>com etapas configuráveis",
      description:
        "Status por estágio (novo, em atendimento, agendado, atendido, proposta, matrícula, ganho/perdido), atribuição de leads, cadência de atividades, controle de tempo de atendimento e tempo de resposta, cadastros rápidos de visitas e workflow comercial completo.",
      icon: BarChart3,
    },
    {
      title: "Contratos, matrículas<br/>e financeiro integrados",
      description:
        "Do lead à matrícula em poucos cliques: contrato criado a partir da oportunidade, plano financeiro livre ou tabelado, assinatura digital ou impressa, controle de entrada paga, status de contrato (pré-contrato, pendente, assinado) e vínculo automático com turmas e financeiro.",
      icon: FileText,
    },
    {
      title: "Equipe, metas<br/>e comissões automáticas",
      description:
        "Distribuição de listas para TMK/SDR, atribuição de leads por vendedor, controle de macrocaptação, repique/reciclagem de cadastros e ex-alunos, cálculo automático de comissão por tipo de venda (bolsa, bolsa parcial, particular) e relatórios por equipe e período.",
      icon: Users2,
    },
  ];

  // ===== Etapas – da campanha ao contrato =====
  const steps: StepItem[] = [
    {
      label: "1",
      title: "Geração e entrada dos leads no F10",
      description:
        "Campanhas de Meta Ads/Google Ads, formulários do site, importação de planilhas, listas de fornecedores e envios via API alimentam Fontes e Eventos. O sistema registra origem, responsável, macrocaptação, custo por lead e já prepara as listas de prospecção.",
    },
    {
      label: "2",
      title: "Prospecção, distribuição e cadência comercial",
      description:
        "As listas são distribuídas para TMK/Tele/SDR, com controle de tempo de resposta, tempo de atendimento, agendamentos, confirmações, reagendamentos e serviço de mensageria (SMS e WhatsApp). A cadência de contatos é registrada no funil com workflow definido pela escola.",
    },
    {
      label: "3",
      title: "Visitas, propostas e contratos com status claros",
      description:
        "Cada visita gera registro de atendimento, proposta e pré-contrato. O sistema acompanha status como contrato criado, contrato pendente, contrato assinado, entrada paga (matrícula/material/primeira parcela), primeira presença e ‘não veio’, mantendo a trilha completa do aluno.",
    },
    {
      label: "4",
      title: "Matrículas, planos financeiros e comissões",
      description:
        "Ao fechar a venda, o lead se transforma em matrícula vinculada a uma ou múltiplas turmas, com plano financeiro livre ou tabelado, integração com cobrança recorrente e cálculo automático de comissão. Tudo aparece nos dashboards comerciais, pedagógicos e financeiros.",
    },
  ];

  // ===== Benefícios =====
  const benefits: BenefitItem[] = [
    {
      title: "Previsibilidade de matrículas e faturamento",
      description:
        "Funil de vendas estruturado por estágio, curso e unidade, com visão da carteira em cada fase (pipeline), contratos gerados, entradas pagas e impacto direto no caixa da escola.",
    },
    {
      title: "Menos planilhas soltas, mais controle em um só sistema",
      description:
        "Geração de listas, importação de arquivos, higienização de cadastros, controles de repique/reciclagem e acompanhamento das campanhas acontecem direto no F10, sem planilhas paralelas.",
    },
    {
      title: "Time comercial focado em vender, não em lançar dados",
      description:
        "Fluxos pensados para o dia a dia: registro rápido de visitas, mudanças de status em poucos cliques, disparos de SMS/WhatsApp diretamente do sistema e contratos gerados a partir do próprio funil.",
    },
    {
      title: "Integração total com marketing, pedagógico e financeiro",
      description:
        "Campanhas, Fontes e Eventos, CRM, visitas, contratos, matrícula, turmas, cobrança de mensalidade, recorrência e comissão formam uma jornada única – do anúncio até o aluno ativo.",
    },
  ];

  // ===== KPIs sugeridos =====
  const kpis: KpiItem[] = [
    { value: "30%", label: "mais matrículas a partir dos mesmos leads*" },
    { value: "2x", label: "mais previsibilidade na projeção de vendas*" },
    { value: "50%", label: "menos tempo em planilhas e retrabalho*" },
  ];

  // ===== Integração com Marketing / Prospecção =====
  const integrationHighlights: IntegrationHighlight[] = [
    {
      title: "Campanhas digitais conectadas ao CRM",
      description:
        "Leads gerados em campanhas de Facebook/Instagram, Google e landing pages chegam direto em Fontes e Eventos, com rastreio de origem, responsável, custo por lead e tempo de resposta médio.",
    },
    {
      title: "Prospecção com listas, reciclagem e higienização",
      description:
        "Importe planilhas CSV/Excel, receba listas via API e controle fornecedores de cadastros. O F10 permite higienização de leads, macrocaptação, repique/reciclagem de ex-alunos e exportação de cadastros quando necessário.",
    },
    {
      title: "Relatórios por fonte, campanha, equipe e estágio",
      description:
        "Dashboards mostram conversão por campanha, funil por estágio, desempenho da equipe, tempo de atendimento, taxa de comparecimento nas visitas e impacto de cada canal nas matrículas e no faturamento.",
    },
  ];

  // ===== FAQ =====
  const faqItems = [
    {
      question: "O que é o módulo Comercial e CRM da F10?",
      answer:
        "É o módulo responsável por organizar geração de listas, prospecção, leads, visitas, oportunidades, contratos e matrículas em um funil de vendas estruturado. Ele conecta campanhas, Fontes e Eventos, funil de vendas, contratos, financeiro e comissões em um só lugar.",
    },
    {
      question: "Quais canais de entrada de leads o F10 aceita?",
      answer:
        "O F10 recebe leads de várias formas: cadastro direto em Fontes e Eventos, formulários do Facebook e do site, integrações via API com outros sistemas e automações, importação de planilhas CSV/Excel e listas de fornecedores.",
    },
    {
      question: "O funil de vendas é configurável por escola?",
      answer:
        "Sim. É possível habilitar o CRM, definir tipos de fonte, estágios do funil, regras de distribuição de listas, responsáveis, workflow de atividades e permissões por usuário. Cada instituição adapta o processo comercial à sua realidade.",
    },
    {
      question:
        "O módulo Comercial está integrado aos contratos, turmas e ao financeiro?",
      answer:
        "Sim. A partir do lead ou visita, o usuário gera o contrato, configura o plano financeiro (livre ou tabelado), escolhe tipo de venda (bolsa, bolsa parcial, particular), cria a matrícula, vincula às turmas e acompanha recebimento de mensalidades, renegociações e situação do aluno.",
    },
    {
      question: "O F10 calcula automaticamente a comissão dos vendedores?",
      answer:
        "Sim. É possível configurar regras comerciais, tipos de venda e recebimentos para que comissões sejam calculadas automaticamente, com relatórios por vendedor, equipe, campanha, curso e período.",
    },
  ];

  function openComercialModal() {
    contactModalConfig.set({
      defaultMessage: "Quero agendar uma demonstração do Comercial",
      product: "F10 – Comercial",
      subSource: "Modal Comercial – dobra 1",
      leadDescription: "Contato iniciado pelo formulário do comercial.",
    });

    showForm.set(true);
  }

  function openComercialPresentationModal() {
    contactModalConfig.set({
      defaultMessage: "Quero agendar uma apresentação do Comercial",
      product: "F10 – Comercial",
      subSource: "Modal Comercial – fim da página",
      leadDescription: "Contato iniciado pelo formulário do comercial.",
    });

    showForm.set(true);
  }
</script>

<svelte:head>
  <!-- Palavras-chave ainda têm pouco impacto em Google,
       mas ajudam alguns motores de busca de LLM/semânticos -->
  <meta
    name="keywords"
    content="CRM escolar, módulo comercial para escolas, funil de matrículas, software de gestão escolar, contratos de matrícula, captação de alunos, F10 Software"
  />
  <title
    >Comercial e CRM escolar F10 — Funil de vendas, contratos e campanhas
    integradas para escolas | F10 Software</title
  >
  <meta
    name="description"
    content="Organize leads, campanhas, funil de vendas, contratos e comissões em um só lugar. O módulo Comercial e CRM escolar F10 conecta marketing, atendimento e financeiro para aumentar matrículas com previsibilidade em escolas e cursos livres."
  />
  <meta name="robots" content="index,follow" />
  <meta name="language" content="pt-BR" />
  <meta
    property="og:title"
    content="Comercial e CRM escolar F10 — Funil de vendas, contratos e campanhas integradas para escolas | F10 Software"
  />
  <meta
    property="og:description"
    content="Funil de vendas integrado a campanhas, contratos, financeiro e comissões para escolas. Receba leads via Facebook, formulários, planilhas ou API e acompanhe tudo pelo Comercial e CRM escolar F10."
  />
  <meta property="og:type" content="website" />
  <meta property="og:url" content="https://f10.com.br/solucoes/comercial" />
  <meta
    property="og:image"
    content="https://f10.com.br/og/solucoes-comercial-f10.jpg"
  />
  <link rel="canonical" href="https://f10.com.br/solucoes/comercial" />

  <!-- JSON-LD: SoftwareApplication -->
  <script type="application/ld+json">
    {
      "@context": "https://schema.org",
      "@type": "SoftwareApplication",
      "name": "F10 Comercial e CRM escolar",
      "applicationCategory": "BusinessApplication",
      "operatingSystem": "Web",
      "url": "https://f10.com.br/solucoes/comercial",
      "image": "https://f10.com.br/og/solucoes-comercial-f10.jpg",
      "description": "Módulo Comercial e CRM escolar do F10: organiza leads, funil de vendas, campanhas, contratos, matrículas, financeiro e comissões em um só sistema, integrado ao restante da plataforma de gestão escolar.",
      "inLanguage": "pt-BR",
      "provider": {
        "@type": "Organization",
        "name": "F10 Software"
      },
      "publisher": {
        "@type": "Organization",
        "name": "F10 Software",
        "url": "https://f10.com.br"
      }
    }
  </script>

  <!-- JSON-LD: BreadcrumbList -->
  <script type="application/ld+json">
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      "itemListElement": [
        {
          "@type": "ListItem",
          "position": 1,
          "name": "Início",
          "item": "https://f10.com.br/"
        },
        {
          "@type": "ListItem",
          "position": 2,
          "name": "Soluções",
          "item": "https://f10.com.br/solucoes"
        },
        {
          "@type": "ListItem",
          "position": 3,
          "name": "Comercial e CRM",
          "item": "https://f10.com.br/solucoes/comercial"
        }
      ]
    }
  </script>

  <!-- JSON-LD: FAQPage -->
  <script type="application/ld+json">
    {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      "inLanguage": "pt-BR",
      "mainEntity": [
        {
          "@type": "Question",
          "name": "O que é o módulo Comercial e CRM da F10?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "É o módulo responsável por organizar leads, visitas, oportunidades e contratos em um funil de vendas estruturado. Ele conecta campanhas, Fontes e Eventos, funil de vendas, contratos, financeiro e comissões em um só lugar."
          }
        },
        {
          "@type": "Question",
          "name": "Quais canais de entrada de leads o F10 aceita?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "O F10 recebe leads de várias formas: cadastro direto em Fontes e Eventos, formulários do Facebook, integrações via API com formulários externos, importação de planilhas CSV/Excel e campanhas do site ou landing pages."
          }
        },
        {
          "@type": "Question",
          "name": "O funil de vendas é configurável por escola?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "Sim. É possível habilitar o CRM, definir tipos de fonte, etapas do funil, responsáveis, regras de uso e permissões por usuário. Cada instituição pode adaptar o processo comercial à sua realidade."
          }
        },
        {
          "@type": "Question",
          "name": "O módulo Comercial está integrado aos contratos e ao financeiro?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "Sim. A partir do lead ou visita, o usuário cria o contrato, configura planos de pagamento, gera a matrícula, controla recebimento de mensalidades, renegocia parcelas e acompanha o histórico financeiro diretamente no F10."
          }
        },
        {
          "@type": "Question",
          "name": "O F10 calcula automaticamente a comissão dos vendedores?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "Sim. É possível configurar regras comerciais, contratos e recebimentos para que comissões sejam calculadas automaticamente, vinculando resultados ao desempenho de cada vendedor ou equipe."
          }
        }
      ]
    }
  </script>

  <!-- JSON-LD: WebPage com foco em CRM escolar (contexto rico para LLMs) -->
  <script type="application/ld+json">
    {
      "@context": "https://schema.org",
      "@type": "WebPage",
      "name": "Comercial e CRM escolar F10",
      "url": "https://f10.com.br/solucoes/comercial",
      "inLanguage": "pt-BR",
      "isPartOf": {
        "@type": "WebSite",
        "name": "F10 Software",
        "url": "https://f10.com.br"
      },
      "about": [
        "CRM escolar para captação e fidelização de alunos",
        "funil de vendas para escolas e cursos livres",
        "gestão de contratos de matrícula físicos e digitais",
        "integração entre marketing, financeiro e pedagógico",
        "controle de comissões e desempenho da equipe comercial"
      ],
      "mentions": [
        "Ambiente Virtual de Aprendizagem (AVA) F10",
        "Aplicativo Smart Aluno",
        "módulo de Marketing e Fontes & Eventos"
      ]
    }
  </script>
</svelte:head>

<!-- ===== HERO ===== -->
<section class="relative isolate overflow-hidden bg-white/60">
  <!-- Breadcrumb -->
  <div class="pt-4">
    <Breadcrumb
      baseUrl="https://f10.com.br"
      items={[
        { label: "HOME", href: "/" },
        { label: "SOLUÇÕES", href: "/solucoes" },
        { label: "COMERCIAL E CRM" },
      ]}
    />
  </div>

  <div class="container pb-16">
    <div class="grid gap-10 lg:grid-cols-12 items-start">
      <!-- TEXTO HERO -->
      <div class="lg:col-span-6">
        <div
          class="inline-flex items-center gap-2 rounded-full bg-white/80 px-3 py-1
                 text-[12px] text-[#7E82A2] ring-1 ring-[#E5E7EB] mb-4"
        >
          <span class="h-2 w-2 rounded-full bg-[#EA6D0B]"></span>
          Comercial, CRM e contratos integrados ao F10
        </div>

        <h1
          class="max-w-[800px] text-[#010D28] tracking-[-0.03em] leading-[1.05]
         text-[34px] sm:text-[42px] md:text-[50px] font-semibold"
        >
          Comercial e CRM escolar F10 para transformar leads em matrículas
        </h1>

        <p class="mt-6 text-[18px] leading-[1.8] text-[#000A57] max-w-[640px]">
          O módulo Comercial e CRM do F10 organiza campanhas, leads, visitas,
          contratos e comissões em um só lugar – dando previsibilidade de
          matrículas e faturamento para sua escola.
        </p>

        <p
          class="mt-4 text-[16px] leading-[1.8] text-[#000A57]/80 max-w-[640px]"
        >
          Receba leads de <strong
            >Facebook, formulários, planilhas e APIs</strong
          >, acompanhe cada etapa no <strong>funil de vendas</strong> e conclua
          a jornada com o <strong>contrato e financeiro integrados</strong>.
        </p>

        <div class="mt-8 flex flex-wrap items-center gap-4">
          <button
            type="button"
            on:click={openComercialModal}
            class="inline-flex items-center justify-center gap-3 rounded-[999px]
                   bg-[#EA6D0B] px-8 md:px-10 py-3.5 text-white text-[16px] font-bold
                   transition hover:brightness-110 focus:outline-none focus:ring-2
                   focus:ring-[#EA6D0B]/40"
          >
            <span>Falar com comercial</span>
            <IconArrowRight size={22} />
          </button>
        </div>

        <div class="mt-6 flex flex-wrap gap-3 text-[12px] text-[#6B7280]">
          <p class="text-[13px] text-[#7E82A2]">
            Demonstração com funil de vendas, contratos, comissão automática e
            exemplos reais de campanhas conectadas.
          </p>
        </div>
      </div>

      <!-- MINI TELA CRM & FUNIL DE VENDAS -->
      <div class="lg:col-span-6 mt-6 lg:mt-0">
        <div class="relative flex justify-center lg:justify-end">
          <!-- glow roxo suave -->
          <div
            class="pointer-events-none absolute -top-10 -left-6 h-40 w-40 rounded-full
             bg-[#4F46E5]/7 blur-3xl"
            aria-hidden="true"
          ></div>

          <!-- hexágono sutil ao fundo -->
          <div
            class="pointer-events-none absolute -bottom-20 right-10 w-40 h-40 opacity-30"
            aria-hidden="true"
          >
            <svg viewBox="0 0 120 120" class="w-full h-full">
              <defs>
                <linearGradient id="hexGradient" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0%" stop-color="#EA6D0B" stop-opacity="0.12" />
                  <stop
                    offset="100%"
                    stop-color="#010D28"
                    stop-opacity="0.05"
                  />
                </linearGradient>
              </defs>
              <polygon
                points="60,5 110,32 110,88 60,115 10,88 10,32"
                fill="url(#hexGradient)"
              />
            </svg>
          </div>

          <div class="relative w-full max-w-[640px]">
            <!-- glow laranja discreto -->
            <div
              class="pointer-events-none absolute -top-14 -right-6 h-40 w-40
               rounded-full bg-[#EA6D0B]/18 blur-3xl"
              aria-hidden="true"
            ></div>

            <!-- JANELA PRINCIPAL -->
            <div
              class="relative rounded-[26px] bg-white border border-slate-200
               shadow-[0_22px_60px_rgba(15,23,42,0.22)] overflow-hidden"
            >
              <!-- TOPO tipo sistema -->
              <div
                class="flex items-center justify-between px-4 pt-3 pb-2
                 border-b border-slate-200 bg-slate-50"
              >
                <div class="flex items-center gap-3">
                  <div
                    class="hidden sm:flex items-center gap-3 text-[11px] text-slate-600"
                  >
                    <span class="font-semibold text-slate-800">Meu F10</span>
                    <span>Cadastros</span>
                    <span class="font-semibold text-primary">Comercial</span>
                    <span>Pedagógico</span>
                    <span>Financeiro</span>
                    <span>Sistema</span>
                  </div>
                </div>

                <div class="flex items-center gap-2">
                  <img
                    src="/logo_f10_3.webp"
                    alt="F10 Software"
                    class="h-6 w-auto object-contain"
                  />
                </div>
              </div>

              <!-- ABA / TÍTULO DA GRADE -->
              <div class="px-4 pt-3 pb-2">
                <div
                  class="inline-flex items-center gap-2 rounded-t-xl bg-slate-100
                   px-3 py-1.5 text-[12px] font-semibold text-slate-700
                   border border-b-0 border-slate-200"
                >
                  <span
                    class="inline-flex h-4 w-4 items-center justify-center rounded-full bg-primary/10"
                  >
                    <span class="h-2 w-2 bg-primary rounded-[3px]"></span>
                  </span>
                  <span>CRM e Funil de Vendas</span>
                </div>
              </div>

              <!-- CABEÇALHO DAS COLUNAS -->
              <div class="px-4 pb-3">
                <div
                  class="grid grid-cols-[1fr_1fr_1.5fr_1.5fr_1.5fr]
                   text-[11px] font-semibold text-slate-600
                   bg-slate-100 rounded-xl px-3 py-2 border border-slate-200"
                >
                  <span>Nome</span>
                  <span>Status</span>
                  <span>Celular</span>
                  <span>Fonte</span>
                  <span>Curso</span>
                </div>
              </div>

              <!-- ESTÁGIOS + LINHAS -->
              <div class="px-4 pb-4">
                <div
                  class="rounded-[18px] border border-slate-200 bg-slate-50 overflow-hidden"
                >
                  {#each crmStages as stage, si}
                    <!-- faixa de estágio -->
                    <div class="relative">
                      <div class={`h-6 w-full ${stage.colorClass}`}></div>
                      <div
                        class="absolute inset-y-0 left-0 flex items-center px-3
                         text-[11px] font-semibold text-slate-900"
                      >
                        {stage.label}
                      </div>
                    </div>

                    <!-- linhas do estágio -->
                    <div class="divide-y divide-slate-200 bg-white">
                      {#each stage.rows as row, ri}
                        <div
                          class={`grid grid grid-cols-[1fr_1fr_1.5fr_1.5fr_1.5fr]
                            px-3 py-1.5 text-[12px]
                            ${ri % 2 === 0 ? "bg-white" : "bg-slate-50/70"}`}
                        >
                          <div class="truncate text-slate-800">
                            {row.name}
                          </div>
                          <div class="truncate text-slate-700">
                            {row.status}
                          </div>
                          <div
                            class="flex items-center gap-1.5 text-slate-600 tabular-nums"
                          >
                            <img
                              src="/icon_whatsApp.webp"
                              alt="WhatsApp"
                              class="h-3.5 w-3.5 flex-shrink-0"
                              loading="lazy"
                            />
                            <span class="truncate">{row.phone}</span>
                          </div>
                          <div class="truncate text-slate-600">
                            {row.source}
                          </div>
                          <div class="truncate text-slate-700">
                            {row.course}
                          </div>
                        </div>
                      {/each}
                    </div>

                    {#if si < crmStages.length - 1}
                      <div class="h-px bg-slate-200/80"></div>
                    {/if}
                  {/each}
                </div>

                <!-- barra de status -->
                <div
                  class="mt-2 text-[10px] text-slate-500 flex items-center justify-between"
                >
                  <span>
                    Agrupado por <span class="font-medium">Estágio</span> · visualização
                    CRM e Funil
                  </span>
                  <span class="hidden sm:inline">
                    21 registros · filtro “Turmas 1º semestre”
                  </span>
                </div>
              </div>
            </div>

            <!-- CARDS FLOTANTES ALINHADOS À DIREITA (BASE) -->
            <div
              class="absolute -bottom-6 -right-4 flex flex-col gap-3 mr-[-50px]
               items-stretch"
            >
              <!-- Card 1: gráfico de pizza -->
              <div
                class="rounded-2xl bg-white px-4 py-3 shadow-[0_16px_40px_rgba(15,23,42,0.3)]
                 border border-slate-200"
              >
                <p class="text-[11px] font-semibold text-slate-800">
                  Origem das matrículas
                </p>
                <p class="mt-1 text-[11px] text-slate-500">Últimos 30 dias</p>

                <div class="mt-2 flex items-center gap-3">
                  <!-- pizza fake -->
                  <div
                    class="relative h-14 w-14 rounded-full"
                    style="
                background: conic-gradient(
                  #ea6d0b 0 38%,
                  #4ade80 38% 72%,
                  #e5e7eb 72% 100%
                );
              "
                  >
                    <div
                      class="absolute inset-1 rounded-full bg-white"
                      aria-hidden="true"
                    ></div>
                  </div>

                  <div class="flex-1 space-y-1.5">
                    <div class="flex items-center justify-between text-[11px]">
                      <span class="flex items-center gap-1 text-slate-600">
                        <span class="h-2 w-2 rounded-full bg-[#EA6D0B]"></span>
                        Facebook / Instagram
                      </span>
                      <span class="text-slate-700 font-medium">38%</span>
                    </div>
                    <div class="flex items-center justify-between text-[11px]">
                      <span class="flex items-center gap-1 text-slate-600">
                        <span class="h-2 w-2 rounded-full bg-[#4ADE80]"></span>
                        Google / site
                      </span>
                      <span class="text-slate-700 font-medium">34%</span>
                    </div>
                    <div class="flex items-center justify-between text-[11px]">
                      <span class="flex items-center gap-1 text-slate-600">
                        <span class="h-2 w-2 rounded-full bg-slate-300"></span>
                        Indicações &amp; outros
                      </span>
                      <span class="text-slate-700 font-medium">28%</span>
                    </div>
                  </div>
                </div>
              </div>

              <!-- Card 2: indicador de comissão -->
              <div
                class="rounded-2xl bg-[#020617] text-white px-4 py-3
                 shadow-[0_18px_45px_rgba(15,23,42,0.75)]
                 ring-1 ring-white/10"
              >
                <p class="text-[11px] font-semibold text-slate-200">
                  Comissão do time
                </p>
                <p class="mt-1 text-[11px] text-slate-400">Mês atual</p>

                <div class="mt-2 flex items-end justify-between">
                  <div>
                    <p class="text-[11px] text-slate-400">Prevista</p>
                    <p class="text-[18px] font-semibold">R$ 8.450</p>
                  </div>
                  <div>
                    <p class="text-[11px] text-slate-400">Paga</p>
                    <p class="text-[18px] font-semibold text-emerald-400">
                      72%
                    </p>
                  </div>
                </div>

                <div
                  class="mt-2 h-1.5 w-full rounded-full bg-slate-700 overflow-hidden"
                >
                  <div
                    class="h-full w-[72%] rounded-full bg-gradient-to-r
                     from-emerald-400 to-[#EA6D0B]"
                  ></div>
                </div>

                <p class="mt-1 text-[10px] text-slate-400">
                  Baseado em contratos recebidos no período.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</section>

<!-- ===== SEÇÃO ESCURA — Pilares do Comercial ===== -->
<section class="relative py-12 md:py-16 bg-white/80">
  <div class="lg:container">
    <div
      class="relative overflow-hidden lg:rounded-[28px]
             bg-[#0A1533] text-white ring-1 ring-white/5"
    >
      <div class="px-6 md:px-10 lg:px-14 py-12 md:py-16">
        <p
          class="flex items-center justify-center gap-4 pb-4 text-[#AEB3D9] text-[15px]"
        >
          <span class="inline-block h-px w-10 bg-[#AEB3D9]"></span>
          <span>O que o Comercial F10 entrega na prática</span>
          <span class="inline-block h-px w-10 bg-[#AEB3D9]"></span>
        </p>

        <h2
          class="mt-2 text-center text-[26px] sm:text-[32px] md:text-[38px]
         leading-[1.15] font-semibold"
        >
          Do lead ao contrato,
          <span class="text-[#EA6D0B]">tudo controlado</span> no mesmo lugar
        </h2>

        <!-- Pilares em grade -->
        <div class="mt-10 grid gap-8 md:grid-cols-2">
          {#each pillars as pillar}
            <article
              class="rounded-[22px] bg-white/5 border border-white/10
                     px-6 py-6 md:px-7 md:py-7 flex gap-4"
            >
              <div
                class="flex-shrink-0 flex h-[60px] w-[60px] items-center
                       justify-center rounded-full bg-[#7E82A2]/40
                       ring-1 ring-white/20"
                aria-hidden="true"
              >
                <svelte:component this={pillar.icon} class="w-8 h-8" />
              </div>

              <div>
                <h3
                  class="text-[19px] md:text-[20px] font-semibold
                         text-white leading-snug"
                >
                  {@html pillar.title}
                </h3>
                <p
                  class="mt-2 text-[15px] md:text-[16px] leading-relaxed
                         text-white/80"
                >
                  {pillar.description}
                </p>
              </div>
            </article>
          {/each}
        </div>

        <p class="mt-6 text-[13px] text-[#CBD0FF]/80 text-center">
          Campanhas, Fontes e Eventos, CRM, contratos, financeiro e comissões
          fazem parte do mesmo ecossistema F10, sem integrações frágeis ou dados
          duplicados.
        </p>

        <div
          class="pointer-events-none absolute inset-0 lg:rounded-[28px]
                 ring-1 ring-inset ring-white/10"
        ></div>
      </div>
    </div>
  </div>
</section>

<!-- ===== DA CAMPANHA AO CONTRATO ===== -->
<!-- ===== DA CAMPANHA AO CONTRATO ===== -->
<section class="relative py-14 md:py-16 bg-white">
  <div class="container px-5 md:px-8 lg:px-20">
    <div class="max-w-[740px]">
      <h2
        class="text-[30px] md:text-[36px] lg:text-[40px] font-semibold
         leading-[1.13] tracking-[-0.015em] text-[#000A57]"
      >
        Campanhas conectadas a contratos e matrículas no F10
      </h2>
      <p class="mt-4 text-[16px] leading-[1.8] text-[#000A57]/80">
        O Comercial F10 foi pensado para que marketing, atendimento e financeiro
        falem a mesma língua. Do cadastro da visita ao recebimento da primeira
        mensalidade, tudo fica rastreado.
      </p>
    </div>

    <div class="mt-10 grid gap-6 md:gap-7 lg:grid-cols-12 items-start">
      <div class="lg:col-span-7">
        <div class="grid gap-6 md:gap-7">
          {#each steps as step}
            <article
              class="relative rounded-[20px] bg-white px-5 py-5 md:px-6 md:py-6
                     ring-1 ring-[#E5E7EB]"
            >
              <div class="flex gap-4">
                <div
                  class="flex-shrink-0 h-[36px] w-[36px] rounded-full
                         bg-[#EA6D0B] text-white text-[18px] font-bold
                         flex items-center justify-center"
                >
                  {step.label}
                </div>
                <div>
                  <h3
                    class="text-[18px] md:text-[19px] font-semibold
                           text-[#000A57]"
                  >
                    {step.title}
                  </h3>
                  <p
                    class="mt-1.5 text-[14px] md:text-[15px] leading-[1.7]
                           text-[#000A57]/80"
                  >
                    {step.description}
                  </p>
                </div>
              </div>
            </article>
          {/each}
        </div>
      </div>

      <!-- IMAGEM LATERAL: DA CAMPANHA AO CONTRATO -->
      <div class="lg:col-span-5 mt-8 lg:mt-0">
        <figure
          class="relative
           rounded-[20px] overflow-hidden ring-1 ring-[#E5E7EB]
           shadow-[0_18px_40px_rgba(1,13,40,0.12)] bg-[#010D28]"
        >
          <!-- imagem base -->
          <img
            src="/f10_software_escolar_bg_campanha_ao_contrato.webp"
            alt="Fluxo do Comercial F10: da campanha ao contrato assinado, com funil de vendas integrado."
            class="h-full w-full object-cover"
            loading="lazy"
          />

          <!-- overlay azul escuro -->
          <div class="pointer-events-none absolute inset-0" aria-hidden="true">
            <!-- bloco azul escuro com leve gradiente -->
            <div
              class="absolute inset-0 bg-gradient-to-tr
               from-[#010D28]/50 via-[#010D28]/40 to-[#010D28]/80"
            ></div>

            <!-- vinheta nas bordas, mantendo tudo em azul -->
            <div
              class="absolute inset-0"
              style="box-shadow: inset 0 0 160px rgba(0, 10, 40, 0.95);"
            ></div>
          </div>

          <!-- legenda -->
          <figcaption
            class="absolute bottom-0 left-0 right-0 px-4 py-3
             bg-gradient-to-t from-black/75 via-black/40 to-transparent
             text-[12px] md:text-[13px] text-white z-20"
          >
            Da campanha e Fontes &amp; Eventos ao contrato assinado e matrícula:
            toda a jornada do aluno rastreada dentro do Comercial F10.
          </figcaption>
        </figure>
      </div>
    </div>
  </div>
</section>

<!-- ===== INTEGRAÇÃO COM MARKETING ===== -->
<section class="relative py-14 md:py-16 bg-[#F3F4FD]">
  <div class="container px-5 md:px-8 lg:px-20">
    <div class="max-w-6xl mx-auto flex flex-col items-center text-center">
      <p class="text-[14px] font-semibold tracking-[0.18em] text-[#7E82A2]">
        COMERCIAL + MARKETING
      </p>

      <h2
        class="mt-3 text-[28px] md:text-[34px] font-semibold
               leading-[1.15] text-[#000A57]"
      >
        Campanhas, formulários e APIs
        <span class="block">trazendo leads prontos para o Comercial F10</span>
      </h2>

      <p
        class="mt-4 text-[15px] md:text-[16px] leading-[1.8] text-[#000A57]/80 max-w-3xl"
      >
        Chega de lead perdido entre e-mail, WhatsApp e planilhas soltas.
      </p>
      <p
        class="mt-2 text-[15px] md:text-[16px] leading-[1.8] text-[#000A57]/80 max-w-3xl"
      >
        O F10 recebe contatos de vários canais e coloca cada um no lugar certo
        dentro do funil, com <strong>origem rastreada</strong>,
        <strong>responsável definido</strong> e foco em
        <strong>custo por matrícula</strong>.
      </p>

      <!-- Lista com ícones -->
      <div class="mt-8 grid gap-5 md:grid-cols-3 w-full text-left">
        {#each integrationHighlights as item, index}
          <article
            class="rounded-[18px] bg-white/70 px-5 py-5
                   shadow-[0_10px_28px_rgba(15,23,42,0.12)]
                   ring-1 ring-[#E5E7EB]"
          >
            <div
              class="flex h-10 w-10 items-center justify-center
                     rounded-full bg-[#EA6D0B]/10 text-[#EA6D0B] mb-3"
            >
              {#if index === 0}
                <Megaphone size={20} />
              {:else if index === 1}
                <FileText size={20} />
              {:else}
                <BarChart3 size={20} />
              {/if}
            </div>

            <h3 class="text-[15px] font-semibold text-[#000A57]">
              {item.title}
            </h3>
            <p class="mt-2 text-[14px] leading-relaxed text-[#000A57]/80">
              {item.description}
            </p>
          </article>
        {/each}
      </div>

      <!-- CTA final da seção -->
      <div class="mt-8 flex flex-col items-center gap-3">
        <a
          href="/solucoes/marketing"
          class="inline-flex items-center justify-center rounded-full
                 bg-[#EA6D0B] px-7 py-3 text-[14px] md:text-[15px]
                 font-semibold text-white
                 hover:brightness-110
                 focus:outline-none focus:ring-2 focus:ring-[#EA6D0B]/40"
        >
          Ver módulo de Marketing
        </a>
        <p class="text-[12px] text-[#7E82A2] max-w-[360px] text-center">
          Marketing, Fontes &amp; Eventos e Comercial trabalhando juntos para
          transformar cliques em matrículas com previsibilidade.
        </p>
      </div>
    </div>
  </div>
</section>

<!-- ===== BENEFÍCIOS E KPIs ===== -->
<section class="relative py-14 md:py-16 bg-white">
  <div class="container px-5 md:px-8 lg:px-20">
    <!-- TÍTULO + SUBTÍTULO (FULL WIDTH, ACIMA DAS 2 COLUNAS) -->
    <div class="max-w-[1280px] space-y-4 mb-10">
      <h2
        class="text-[32px] md:text-[40px] lg:text-[48px]
               font-semibold leading-[1.3]
               tracking-[-0.03em] text-[#010D28]"
      >
        Benefícios diretos para direção, marketing e comercial
      </h2>

      <p
        class="text-[18px] md:text-[22px] lg:text-[27px]
               leading-[1.5] font-medium text-[#7E82A2]
               max-w-[980px]"
      >
        O Comercial F10 reduz o ruído entre áreas, organiza a rotina dos
        vendedores e mostra números claros para tomada de decisão.
      </p>
    </div>

    <!-- 2 COLUNAS: ESQUERDA (BENEFÍCIOS) + DIREITA (KPIs) -->
    <div class="grid gap-10 lg:grid-cols-12 items-start lg:items-stretch">
      <!-- ESQUERDA: LISTA DE BENEFÍCIOS NO ESTILO FIGMA -->
      <div class="lg:col-span-6 flex">
        <div class="w-full flex flex-col justify-between">
          {#each benefits as benefit, i}
            <div class="flex flex-col gap-3">
              <p
                class="text-[16px] md:text-[18px] leading-[1.8]
                 font-semibold text-[#000A57]"
              >
                {benefit.title}
                <span
                  class="block font-normal text-[15px] md:text-[16px]
                   leading-[1.8] text-[#000A57]/80"
                >
                  {benefit.description}
                </span>
              </p>

              {#if i < benefits.length - 1}
                <div class="h-px w-full border-t border-[#000A57]/18"></div>
              {/if}
            </div>
          {/each}
        </div>
      </div>

      <!-- DIREITA: CARD DE KPIs (COMPONENTE) -->
      <div class="lg:col-span-6 flex justify-end">
        <div class="w-full max-w-[690px]">
          <KpiPanel
            title="Impacto direto nas matrículas e no caixa"
            items={kpis}
            footnote="*Estimativas simuladas com base em boas práticas comerciais; os resultados variam conforme perfil da escola, região, ticket médio e execução das campanhas."
          />
        </div>
      </div>
    </div>
  </div>
</section>

<!-- ===== CONTRATOS, MATRÍCULAS E JORNADA DO ALUNO ===== -->
<section class="relative py-14 md:py-16 bg-[#F3F4FD]">
  <div class="container px-5 md:px-8 lg:px-20 space-y-10 md:space-y-12">
    <!-- Título + subtítulo -->
    <header class="max-w-4xl mx-auto text-center">
      <p class="text-[14px] font-semibold tracking-[0.18em] text-[#7E82A2]">
        CONTRATOS · MATRÍCULAS · JORNADA DO ALUNO
      </p>
      <h2
        class="mt-3 text-[30px] md:text-[36px] lg:text-[40px] font-semibold
         leading-[1.13] tracking-[-0.03em] text-[#010D28]"
      >
        Contratos, matrículas e experiência digital do aluno em sincronia
      </h2>
      <p class="mt-4 text-[15px] md:text-[17px] leading-[1.7] text-[#7E82A2]">
        Contratos físicos ou digitais, matrículas ligadas a cursos e turmas,
        indicadores de resultado e a jornada do aluno conectada ao
        <a
          href="/solucoes/ambiente-virtual-de-aprendizado-ava"
          class="font-semibold text-[#EA6D0B] hover:underline"
          >Ambiente Virtual de Aprendizagem</a
        >
        e ao
        <a
          href="/solucoes/aplicativo-smart-aluno"
          class="font-semibold text-[#EA6D0B] hover:underline"
          >Aplicativo Smart Aluno</a
        >.
      </p>
    </header>

    <!-- NÍVEL 1 – Lista de contratos + texto -->
    <div
      class="grid gap-8 lg:grid-cols-12 items-stretch bg-white/60 rounded-[24px]
             ring-1 ring-[#E5E7EB] px-5 py-7 md:px-8 md:py-8"
    >
      <!-- Mini sistema contratos (esquerda) -->
      <!-- MINI TELA CONTRATOS & MATRÍCULAS -->
      <div class="lg:col-span-6 mt-6 lg:mt-0">
        <div class="relative flex justify-center lg:justify-end">
          <!-- glow roxo suave -->
          <div
            class="pointer-events-none absolute -top-10 -left-6 h-40 w-40 rounded-full
             bg-[#4F46E5]/7 blur-3xl"
            aria-hidden="true"
          ></div>

          <!-- hexágono sutil ao fundo -->
          <div
            class="pointer-events-none absolute -bottom-20 right-10 w-40 h-40 opacity-30"
            aria-hidden="true"
          >
            <svg viewBox="0 0 120 120" class="w-full h-full">
              <defs>
                <linearGradient
                  id="hexGradientContracts"
                  x1="0"
                  y1="0"
                  x2="1"
                  y2="1"
                >
                  <stop offset="0%" stop-color="#EA6D0B" stop-opacity="0.12" />
                  <stop
                    offset="100%"
                    stop-color="#010D28"
                    stop-opacity="0.05"
                  />
                </linearGradient>
              </defs>
              <polygon
                points="60,5 110,32 110,88 60,115 10,88 10,32"
                fill="url(#hexGradientContracts)"
              />
            </svg>
          </div>

          <div class="relative w-full max-w-[640px]">
            <!-- glow laranja discreto -->
            <div
              class="pointer-events-none absolute -top-14 -right-6 h-40 w-40
               rounded-full bg-[#EA6D0B]/18 blur-3xl"
              aria-hidden="true"
            ></div>

            <!-- JANELA PRINCIPAL -->
            <div
              class="relative rounded-[26px] bg-white border border-slate-200
               shadow-[0_22px_60px_rgba(15,23,42,0.22)] overflow-hidden"
            >
              <!-- TOPO tipo sistema -->
              <div
                class="flex items-center justify-between px-4 pt-3 pb-2
                 border-b border-slate-200 bg-slate-50"
              >
                <div class="flex items-center gap-3">
                  <div
                    class="hidden sm:flex items-center gap-3 text-[11px] text-slate-600"
                  >
                    <span class="font-semibold text-slate-800">Meu F10</span>
                    <span>Cadastros</span>
                    <span class="font-semibold text-primary">Comercial</span>
                    <span>Pedagógico</span>
                    <span>Financeiro</span>
                    <span>Sistema</span>
                  </div>
                </div>

                <div class="flex items-center gap-2">
                  <img
                    src="/logo_f10_3.webp"
                    alt="F10 Software"
                    class="h-6 w-auto object-contain"
                  />
                </div>
              </div>

              <!-- ABA / TÍTULO DA GRADE -->
              <div class="px-4 pt-3 pb-2">
                <div
                  class="inline-flex items-center gap-2 rounded-t-xl bg-slate-100
                   px-3 py-1.5 text-[12px] font-semibold text-slate-700
                   border border-b-0 border-slate-200"
                >
                  <span
                    class="inline-flex h-4 w-4 items-center justify-center rounded-full bg-primary/10"
                  >
                    <span class="h-2 w-2 bg-primary rounded-[3px]"></span>
                  </span>
                  <span>Contratos e matrículas</span>
                </div>
              </div>

              <!-- CABEÇALHO DAS COLUNAS -->
              <!-- CABEÇALHO DAS COLUNAS -->
              <div class="px-4 pb-3">
                <div
                  class="grid
     grid-cols-[minmax(52px,0.5fr)_minmax(0,1.5fr)_minmax(70px,1fr)_minmax(0,1.2fr)_minmax(0,1.2fr)]
     text-[11px] font-semibold text-slate-600
     bg-slate-100 rounded-xl px-3 py-2 border border-slate-200"
                >
                  <span>Contrato</span>
                  <span>Aluno</span>
                  <span class="text-left">Status</span>
                  <span>Tipo</span>
                  <span class="text-left">Curso</span>
                </div>
              </div>

              <!-- LINHAS DE CONTRATOS -->
              <div class="px-4 pb-4">
                <div
                  class="rounded-[18px] border border-slate-200 bg-slate-50 overflow-hidden"
                >
                  <div class="divide-y divide-slate-200 bg-white">
                    {#each contractRows as row, i}
                      <div
                        class={`grid
     grid-cols-[minmax(52px,0.5fr)_minmax(0,1.5fr)_minmax(70px,1fr)_minmax(0,1.2fr)_minmax(0,1.2fr)]
     px-3 py-1.5 text-[12px]
     ${i % 2 === 0 ? "bg-white" : "bg-slate-50/70"}`}
                      >
                        <div class="text-slate-700 tabular-nums">
                          {row.id}
                        </div>

                        <div class="truncate text-slate-800 font-medium">
                          {row.student}
                        </div>

                        <div
                          class="text-[11px] font-semibold text-amber-700 text-left"
                        >
                          {row.status}
                        </div>

                        <div class="truncate text-[11px] text-slate-600">
                          {row.type}
                        </div>

                        <div
                          class="truncate text-left text-[11px] text-slate-700"
                        >
                          {row.course}
                        </div>
                      </div>
                    {/each}
                  </div>
                </div>

                <!-- barra de status -->
                <div
                  class="mt-2 text-[10px] text-slate-500 flex items-center justify-between"
                >
                  <span>
                    Matrículas realizadas
                    <span class="font-medium">nos últimos 30 dias</span>
                  </span>
                  <span class="hidden sm:inline">
                    150+ registros · visão Contratos &amp; Comercial
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Texto contratos (direita) -->
      <div class="lg:col-span-6 flex items-center order-2 lg:order-2">
        <div class="w-full flex flex-col gap-6">
          <h3
            class="text-[22px] md:text-[26px] font-semibold text-[#000A57]
                   leading-[1.3]"
          >
            Contratos físicos e digitais, checklist completo e matrícula ligada
            à operação
          </h3>

          <div class="space-y-5">
            {#each contractFlowPoints as point, i}
              <div class="flex flex-col gap-2">
                <p
                  class="text-[15px] md:text-[16px] font-semibold text-[#000A57]"
                >
                  {point.title}
                </p>
                <p
                  class="text-[14px] md:text-[15px] leading-[1.7]
                         text-[#000A57]/80"
                >
                  {point.description}
                </p>

                {#if i < contractFlowPoints.length - 1}
                  <div class="h-px w-full border-t border-[#000A57]/14"></div>
                {/if}
              </div>
            {/each}
          </div>

          <p class="text-[13px] text-[#7E82A2]">
            O mesmo fluxo funciona para contratos impressos ou digitais, com
            trilha de auditoria, anexos e histórico acessível para direção,
            secretaria e coordenação.
          </p>
        </div>
      </div>
    </div>

    <!-- NÍVEL 2 – Indicadores + mini cubo de dados (layout invertido) -->
    <div
      class="grid gap-8 lg:grid-cols-12 items-stretch bg-white/80 rounded-[24px]
             ring-1 ring-[#E5E7EB] px-5 py-7 md:px-8 md:py-8"
    >
      <!-- Texto indicadores (esquerda) -->
      <div class="lg:col-span-6 flex items-center order-2 lg:order-1">
        <div class="w-full flex flex-col gap-6">
          <h3
            class="text-[22px] md:text-[26px] font-semibold text-[#000A57]
                   leading-[1.3]"
          >
            Indicadores de matrículas, fontes de captação e risco de evasão
          </h3>

          <div class="space-y-5">
            {#each contractStatusPoints as point, i}
              <div class="flex flex-col gap-2">
                <p
                  class="text-[15px] md:text-[16px] font-semibold text-[#000A57]"
                >
                  {point.title}
                </p>
                <p
                  class="text-[14px] md:text-[15px] leading-[1.7]
                         text-[#000A57]/80"
                >
                  {point.description}
                </p>

                {#if i < contractStatusPoints.length - 1}
                  <div class="h-px w-full border-t border-[#000A57]/14"></div>
                {/if}
              </div>
            {/each}
          </div>

          <p class="text-[13px] text-[#7E82A2]">
            Os dados de contratos alimentam relatórios por origem (secretaria,
            Facebook, indicação, feiras, site) e ajudam a enxergar a jornada
            completa: da campanha ao engajamento no AVA e no aplicativo.
          </p>
        </div>
      </div>

      <!-- Mini cubo / gráfico (direita) -->
      <div class="lg:col-span-6 order-1 lg:order-2">
        <div class="relative flex justify-center lg:justify-start">
          <!-- glow discreto -->
          <div
            class="pointer-events-none absolute -top-10 right-0 h-40 w-40
             rounded-full bg-[#EA6D0B]/10 blur-3xl"
            aria-hidden="true"
          ></div>

          <div
            class="relative w-full max-w-[640px]
             rounded-[26px] bg-white border border-slate-200
             shadow-[0_22px_60px_rgba(15,23,42,0.18)] overflow-hidden"
          >
            <!-- TOPO tipo sistema (menu principal) -->
            <div
              class="flex items-center justify-between px-4 pt-3 pb-2
               border-b border-slate-200 bg-slate-50"
            >
              <div
                class="hidden sm:flex items-center gap-3 text-[11px] text-slate-600"
              >
                <span class="font-semibold text-slate-800">Meu F10</span>
                <span>Cadastros</span>
                <span class="font-semibold text-primary">Comercial</span>
                <span>Pedagógico</span>
                <span>Financeiro</span>
                <span>Sistema</span>
              </div>

              <div class="flex items-center gap-2">
                <img
                  src="/logo_f10_3.webp"
                  alt="F10 Software"
                  class="h-6 w-auto object-contain"
                />
              </div>
            </div>

            <!-- ABA / título da tela -->
            <div class="px-4 pt-3 pb-2">
              <div
                class="inline-flex items-center gap-2 rounded-t-xl bg-slate-100
                 px-3 py-1.5 text-[12px] font-semibold text-slate-700
                 border border-b-0 border-slate-200"
              >
                <span
                  class="inline-flex h-4 w-4 items-center justify-center
                   rounded-full bg-primary/10"
                >
                  <span class="h-2 w-2 bg-primary rounded-[3px]"></span>
                </span>
                <span>Contratos · Cubo por fonte</span>
              </div>
            </div>

            <!-- CABEÇALHO TABELA -->
            <div class="px-4 pb-2">
              <div
                class="grid grid-cols-[1.5fr_1.1fr_1.1fr_1.1fr]
                 text-[11px] font-semibold text-slate-600
                 bg-slate-100 px-3 py-2 border border-slate-200
                 rounded-xl"
              >
                <span>Fonte</span>
                <span class="text-right">Valor pago</span>
                <span class="text-right">Matrículas</span>
                <span class="text-right">Ticket médio</span>
              </div>
            </div>

            <!-- LINHAS DA TABELA -->
            <div class="px-4 pb-3 space-y-0.5">
              {#each contractCubeSummary as row, i}
                <div
                  class={`grid grid-cols-[1.5fr_1.1fr_1.1fr_1.1fr]
              px-3 py-1.5 text-[11px]
              ${i % 2 === 0 ? "bg-white" : "bg-slate-50"}`}
                >
                  <span class="text-slate-700">{row.source}</span>
                  <span class="text-right text-slate-800 font-medium">
                    {row.value}
                  </span>
                  <span class="text-right text-slate-700">
                    {row.enrollments}
                  </span>
                  <span class="text-right text-slate-700">
                    {row.ticket}
                  </span>
                </div>
              {/each}

              <!-- linha de totais -->
              <div
                class="grid grid-cols-[1.5fr_1.1fr_1.1fr_1.1fr]
           px-3 py-1.5 text-[11px]
           border-t border-slate-200 bg-slate-100/80"
              >
                <span class="font-semibold text-slate-800">Totais</span>
                <span class="text-right text-slate-800 font-semibold">
                  R$ 670.707,90
                </span>
                <span class="text-right text-slate-800 font-semibold">
                  906
                </span>
                <span class="text-right text-slate-700"> — </span>
              </div>
            </div>

            <!-- GRÁFICO DE BARRAS -->
            <div
              class="border-t border-slate-200 bg-slate-50/90 px-4 pt-4 pb-5"
            >
              <div class="flex items-center justify-between mb-3 gap-2">
                <p class="text-[11px] text-slate-600">
                  Matrículas por fonte nos últimos 6 meses
                </p>
                <p class="text-[10px] text-slate-500">
                  Escala em quantidade de matrículas
                </p>
              </div>

              <div class="space-y-2">
                {#each contractCubeBars as bar}
                  <div class="flex items-center gap-3 text-[10px]">
                    <span class="w-20 text-slate-600">{bar.label}</span>

                    <div class="flex-1 h-[9px] bg-slate-200">
                      <div
                        class="h-full"
                        style={`width: ${bar.percent}%; background-color: ${bar.color};`}
                      ></div>
                    </div>

                    <span class="w-16 text-right text-slate-700 tabular-nums">
                      {bar.count}
                    </span>
                  </div>
                {/each}
              </div>

              <p class="mt-3 text-[10px] text-slate-500">
                Distribuição aproximada com base nos contratos recebidos no
                período.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</section>

<!-- ===== DEPOIMENTOS ===== -->
<section class="relative py-14 md:py-16 bg-[#F9FAFB]">
  <div class="container px-5 md:px-8 lg:px-20">
    <div
      class="flex flex-col md:flex-row md:items-end md:justify-between gap-6"
    >
      <div>
        <p class="text-[14px] font-semibold tracking-[0.18em] text-[#7E82A2]">
          RESULTADOS REAIS
        </p>
        <h2
          class="mt-3 text-[26px] md:text-[32px] font-semibold leading-tight
                 text-[#000A57]"
        >
          Escolas que organizaram o comercial dentro do F10
        </h2>
        <p
          class="mt-2 text-[14px] md:text-[15px] text-[#000A57]/80 max-w-[520px]"
        >
          Depoimentos de quem saiu do caos de planilhas, grupos de mensagens e
          contratos soltos para um processo comercial estruturado.
        </p>
      </div>
    </div>

    <div class="mt-8">
      <Testimonial />
    </div>
  </div>
</section>

<!-- ===== FAQ ===== -->
<section class="relative py-12 md:py-16 bg-white">
  <div class="container px-5 md:px-8 lg:px-20">
    <div
      class="flex flex-col md:flex-row md:items-center md:justify-between gap-6"
    >
      <div>
        <h2
          class="text-[26px] md:text-[32px] font-semibold leading-tight
                 text-[#000A57]"
        >
          Perguntas frequentes sobre o Comercial F10
        </h2>
        <p
          class="mt-2 text-[14px] md:text-[15px] text-[#000A57]/80 max-w-[520px]"
        >
          Como o funil de vendas funciona, como conectar campanhas, quais
          integrações existem e como isso conversa com contratos e financeiro.
        </p>
      </div>

      <a
        href="/solucoes"
        class="hidden md:inline-flex items-center rounded-full border
               border-[#EA6D0B] px-4 py-2 text-[14px] font-semibold
               text-[#000A57] hover:bg-[#EA6D0B]/10
               focus:outline-none focus:ring-2 focus:ring-[#EA6D0B]/40"
      >
        Ver todas as soluções F10
      </a>
    </div>

    <div class="mt-8">
      <FaqAccordion items={faqItems} />
    </div>

    <div class="mt-6 md:hidden">
      <a
        href="/solucoes"
        class="inline-flex items-center rounded-full border
               border-[#EA6D0B] px-4 py-2 text-[14px] font-semibold
               text-[#000A57] hover:bg-[#EA6D0B]/10
               focus:outline-none focus:ring-2 focus:ring-[#EA6D0B]/40"
      >
        Ver todas as soluções F10
      </a>
    </div>
  </div>
</section>

<!-- ===== BLOCO FINAL (CTA) ===== -->
<section class="relative py-12 md:py-16 bg-white/60">
  <div class="container px-5 md:px-8 lg:px-20">
    <div class="grid gap-10 lg:grid-cols-12 items-center">
      <div class="lg:col-span-6 flex flex-col gap-5">
        <h2
          class="text-[#7E82A2] font-medium leading-[1.1] tracking-[-0.01em]
                 text-[32px] md:text-[40px]"
        >
          Mais matrículas saindo do mesmo volume de leads
        </h2>

        <p
          class="text-[#000A57] text-[15px] md:text-[16px] leading-[1.8] max-w-[560px]"
        >
          Organize campanhas, leads, funil, contratos e comissões no Comercial
          F10 e deixe de depender de planilhas e controles paralelos para fechar
          turmas.
        </p>

        <p class="text-[#000A57]/80 text-[14px] md:text-[15px] max-w-[560px]">
          Junto com o módulo de Marketing, você terá uma visão completa da
          jornada: do anúncio à matrícula, com dados confiáveis para investir
          melhor.
        </p>

        <div class="pt-2 flex flex-wrap gap-3">
          <button
            type="button"
            on:click={openComercialPresentationModal}
            class="inline-flex items-center justify-center gap-3 rounded-[999px]
                   bg-[#EA6D0B] px-8 md:px-10 py-4 text-white text-[16px]
                   font-bold transition hover:brightness-110
                   focus:outline-none focus:ring-2 focus:ring-[#EA6D0B]/40"
          >
            <span>Agendar apresentação</span>
            <IconArrowRight size={24} />
          </button>
        </div>
      </div>

      <!-- Placeholder imagem final -->
      <div class="lg:col-span-6">
        <figure
          class="relative h-[320px] sm:h-[380px] md:h-[420px]
           overflow-hidden rounded-[18px] ring-1 ring-black/5
           bg-[#010D28] shadow-[0_18px_50px_rgba(1,13,40,0.16)]"
        >
          <img
            src="/mais_matriculas_f10.webp"
            alt="Dashboard do F10 com funil de vendas, contratos, matrículas, faturamento e comissões em um único painel."
            class="h-full w-full object-cover object-top"
            loading="lazy"
          />

          <!-- overlay azul escuro, mesmo conceito da outra sessão -->
          <div
            class="pointer-events-none absolute inset-0 mix-blend-multiply opacity-85"
            aria-hidden="true"
          >
            <div
              class="w-full h-full bg-gradient-to-tr
               from-[#010D28]/50 via-[#010D28]/60 to-[#010D28]/80"
            ></div>
          </div>

          <!-- leve glow laranja no canto, bem sutil -->
          <div
            class="pointer-events-none absolute -bottom-10 -right-10 w-40 h-40
             bg-[#EA6D0B]/26 blur-3xl opacity-70"
            aria-hidden="true"
          ></div>

          <!-- legenda -->
          <figcaption
            class="absolute bottom-0 inset-x-0 px-4 md:px-6 py-3 md:py-4
             bg-gradient-to-t from-black/70 via-black/35 to-transparent
             text-[12px] md:text-[13px] text-white"
          >
            Visão consolidada de
            <strong
              >funil de vendas, contratos, matrículas, faturamento e comissões</strong
            >
            em um painel único para direção e coordenação comercial.
          </figcaption>

          <div
            class="pointer-events-none absolute inset-0 rounded-[18px]
             ring-1 ring-inset ring-white/10"
          ></div>
        </figure>
      </div>
    </div>
  </div>
</section>

<style>
  /* Mantido o padrão visual e tokens já utilizados nas outras páginas.
     Ajustes finos (cores, espaçamentos, tipografia) podem ser feitos via Tailwind. */
</style>
