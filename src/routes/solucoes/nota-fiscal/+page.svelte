<script lang="ts">
  import { goto } from "$app/navigation";
  import { onDestroy, tick } from "svelte";
  import Breadcrumb from "$lib/components/Breadcrumb.svelte";
  import FaqAccordion from "$lib/components/FaqAccordion.svelte";
  import {
    ArrowRight,
    BadgeCheck,
    Bell,
    CheckCircle2,
    Download,
    FileText,
    Landmark,
    Loader2,
    MapPin,
    ReceiptText,
    RotateCcw,
    ShieldCheck,
    TriangleAlert,
    WalletCards,
    X,
  } from "lucide-svelte";

  type IconComponent = typeof ReceiptText;

  type CityCheckStatus =
    | "idle"
    | "checking"
    | "available"
    | "unavailable"
    | "error";

  type CityCheckResult = {
    status: CityCheckStatus;
    city: string;
    state: string;
    ibgeCode: string;
    provider: string;
    message: string;
    checkedAt: string;
    raw?: Record<string, unknown> | null;
  };

  type CityCoverageStatus = "idle" | "loading" | "ready" | "empty" | "error";

  type FormErrors = Partial<
    Record<
      "name" | "email" | "whatsapp" | "schoolName" | "city" | "state",
      string
    >
  >;

  type FiscalShortcut = {
    id: string;
    imgSrc: string;
    alt: string;
    labelLine1: string;
    labelLine2?: string;
  };

  type FiscalRow = {
    contract: string;
    enrollment: string;
    course: string;
    className: string;
    receiveType: string;
    due: string;
    received: string;
    bank: string;
    status: string;
    issueStatus: string;
    student: string;
    phone: string;
  };

  type FiscalFeature = {
    title: string;
    description: string;
    icon: IconComponent;
  };

  type FlowStep = {
    label: string;
    title: string;
    description: string;
  };

  type FaqItem = {
    question: string;
    answer: string;
  };

  const registrationUrl = "/nota-fiscal/cadastro-de-escolas";
  const cityCoverageEndpoint =
    "https://backend.f10.com.br/dfe/nfse/cidades-cobertura";
  const scrollXWrap =
    "overflow-x-auto [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden";
  const noOverflowPage = "overflow-x-hidden";

  const fiscalShortcuts: FiscalShortcut[] = [
    {
      id: "recebimento",
      imgSrc: "/financeiro_recebimento.webp",
      alt: "Recebimento de mensalidades",
      labelLine1: "Recebimento",
      labelLine2: "de Mensalidades",
    },
    {
      id: "cobranca",
      imgSrc: "/financeiro_cobranca_mensalidade.webp",
      alt: "Cobranças de mensalidades",
      labelLine1: "Cobranças",
      labelLine2: "de Mensalidades",
    },
    {
      id: "lista-cobrancas",
      imgSrc: "/financeiro_cobranca_mensalidade.webp",
      alt: "Lista total de cobranças",
      labelLine1: "Lista Total",
      labelLine2: "de Cobranças",
    },
    {
      id: "movimentacoes",
      imgSrc: "/financeiro_movimentacao.webp",
      alt: "Movimentações financeiras",
      labelLine1: "Movimentações",
      labelLine2: "Financeiras",
    },
    {
      id: "nota-fiscal",
      imgSrc: "/financeiro_nota.webp",
      alt: "Nota Fiscal Eletrônica",
      labelLine1: "Nota Fiscal",
      labelLine2: "Eletrônica",
    },
    {
      id: "contas-pagar",
      imgSrc: "/financeiro_contas_pagar.webp",
      alt: "Contas a pagar",
      labelLine1: "Contas",
      labelLine2: "a Pagar",
    },
    {
      id: "caixas-bancos",
      imgSrc: "/financeiro_fluxo_caixa.webp",
      alt: "Caixas e bancos",
      labelLine1: "Caixas e",
      labelLine2: "Bancos",
    },
    {
      id: "plano-contas",
      imgSrc: "/financeiro_plano_contas.webp",
      alt: "Plano de contas",
      labelLine1: "Plano de",
      labelLine2: "Contas",
    },
    {
      id: "receitas-despesas",
      imgSrc: "/financeiro_orcamento_contas.webp",
      alt: "Receitas e despesas",
      labelLine1: "Receitas e",
      labelLine2: "Despesas",
    },
  ];

  const fiscalRows: FiscalRow[] = [
    {
      contract: "9650",
      enrollment: "06/04/2026",
      course: "Curso Livre F10 (Híbrido)",
      className: "Tudo Fácil,EAD",
      receiveType: "Material Didático",
      due: "07/04/2026",
      received: "R$ 150,00 Dinheiro",
      bank: "Secretaria",
      status: "Pré Matrícula",
      issueStatus: "Completa",
      student: "Aluno Testes",
      phone: "—",
    },
    {
      contract: "9651",
      enrollment: "06/04/2026",
      course: "Curso Livre F10 (100% Presencial)",
      className: "Turma 21 Noite,EAD",
      receiveType: "Parcela",
      due: "10/04/2026",
      received: "R$ 160,00 Dinheiro",
      bank: "Secretaria",
      status: "Matrícula",
      issueStatus: "Completa",
      student: "Mais Aluno Testes",
      phone: "(94) 93241-6541",
    },
    {
      contract: "9652",
      enrollment: "06/04/2026",
      course: "Curso Livre F10 (100% Presencial)",
      className: "Turma 21 Noite,EAD",
      receiveType: "Parcela",
      due: "12/04/2026",
      received: "R$ 210,00 Dinheiro",
      bank: "Secretaria",
      status: "Matrícula",
      issueStatus: "Incompleta",
      student: "Outro Aluno Testes de Hoje",
      phone: "—",
    },
    {
      contract: "9654",
      enrollment: "17/04/2026",
      course: "Curso Livre F10 (100% Presencial)",
      className: "Robótica,EAD",
      receiveType: "Material Didático",
      due: "07/05/2026",
      received: "R$ 259,90 F10 Cel_Cash",
      bank: "Subconta Produção",
      status: "Matrícula",
      issueStatus: "Completa",
      student: "Matheus Kud",
      phone: "(41) 98490-3125",
    },
    {
      contract: "9657",
      enrollment: "20/04/2026",
      course: "Curso Livre F10 (100% Presencial)",
      className: "EAD",
      receiveType: "Parcela",
      due: "20/04/2026",
      received: "R$ 2.980,00 Visa Crédito",
      bank: "Banco",
      status: "Quitado",
      issueStatus: "Emitida",
      student: "Teste Megamente",
      phone: "(45) 99627-9784",
    },
    {
      contract: "9661",
      enrollment: "20/05/2026",
      course: "Curso Livre F10 (100% Presencial)",
      className: "Turma 21 Noite,EAD",
      receiveType: "Matrícula",
      due: "20/05/2026",
      received: "R$ 100,00 Dinheiro",
      bank: "Secretaria",
      status: "Matrícula",
      issueStatus: "Completa",
      student: "Yasmin Almeida Lopes",
      phone: "(11) 95203-4001",
    },
    {
      contract: "9664",
      enrollment: "28/05/2026",
      course: "Curso Livre F10 (Híbrido)",
      className: "Teste Anna,EAD",
      receiveType: "Matrícula",
      due: "28/05/2026",
      received: "R$ 290,00 F10 Cel_Cash",
      bank: "Subconta Produção",
      status: "Matrícula",
      issueStatus: "Incompleta",
      student: "Aline Camila",
      phone: "(31) 98254-3013",
    },
  ];

  const fiscalFeatures: FiscalFeature[] = [
    {
      title: "Emissão de NFS-e para serviços educacionais",
      description:
        "Controle notas fiscais de serviço para mensalidades, matrículas, cursos, treinamentos e outras receitas de prestação de serviço da escola.",
      icon: ReceiptText,
    },
    {
      title: "Emissão de NF-e para produtos escolares",
      description:
        "Organize a emissão de nota fiscal eletrônica de produto para materiais didáticos, apostilas, livros, uniformes e demais vendas da instituição.",
      icon: FileText,
    },
    {
      title: "Exportação de notas para conferência",
      description:
        "Facilite a guarda de documentos, conferências internas, envio à contabilidade e acompanhamento das notas fiscais emitidas pelo F10.",
      icon: Download,
    },
    {
      title: "Inutilização, correção e devolução",
      description:
        "Mantenha processos para cenários fiscais do dia a dia, como numeração inutilizada, carta de correção e devolução de venda de produto.",
      icon: RotateCcw,
    },
  ];

  const flowSteps: FlowStep[] = [
    {
      label: "1",
      title: "Recebimento nasce no financeiro",
      description:
        "Mensalidades, matrículas, materiais e produtos já aparecem dentro da rotina financeira, com aluno, responsável, valores e forma de recebimento.",
    },
    {
      label: "2",
      title: "A escola acompanha pendências fiscais",
      description:
        "A tela de Nota Fiscal Eletrônica ajuda a enxergar o que está completo, incompleto, emitido, pendente ou pronto para tratativa.",
    },
    {
      label: "3",
      title: "O F10 apoia a emissão de NFS-e e NF-e",
      description:
        "Com os dados fiscais parametrizados, a operação fica mais próxima do financeiro, reduzindo retrabalho entre secretaria, direção e contabilidade.",
    },
    {
      label: "4",
      title: "Documentos fiscais ficam mais fáceis de controlar",
      description:
        "Exportação, conferência, inutilização, correção e devolução deixam de ficar espalhadas em planilhas e portais separados.",
    },
  ];

  const faqItems: FaqItem[] = [
    {
      question: "O F10 emite nota fiscal de serviço e nota fiscal de produto?",
      answer:
        "Sim. O sistema escolar F10 possui rotinas para emissão de NFS-e, usada em serviços educacionais, e NF-e, usada em venda de produtos como materiais didáticos, apostilas, livros, uniformes e outros itens comercializados pela escola.",
    },
    {
      question:
        "Por que a escola deve emitir notas fiscais pelo próprio sistema escolar?",
      answer:
        "Porque a emissão fiscal passa a ficar conectada aos recebimentos, contratos, alunos, responsáveis e produtos da escola. Isso reduz retrabalho, facilita conferência, melhora o histórico financeiro e ajuda a contabilidade a receber informações mais organizadas.",
    },
    {
      question: "A NFS-e depende da cidade da escola?",
      answer:
        "Sim. A emissão de NFS-e depende do município, do provedor utilizado pela prefeitura, das regras locais e da configuração fiscal da escola. Por isso, a página permite verificar cidade e estado antes de iniciar o cadastro de homologação.",
    },
    {
      question:
        "O F10 ajuda em exportação, inutilização, carta de correção e devolução?",
      answer:
        "Sim. A solução considera rotinas fiscais complementares importantes para a operação escolar, incluindo exportação de notas, inutilização, carta de correção de NF-e e nota de devolução de venda de produto.",
    },
    {
      question:
        "Essa página é voltada para clientes atuais ou escolas interessadas?",
      answer:
        "Esta página é voltada para leads e escolas interessadas em conhecer a solução. O objetivo é explicar o controle fiscal no F10, verificar a cidade e iniciar a tratativa comercial ou técnica com a equipe F10.",
    },
  ];

  const structuredDataScript = [
    {
      "@context": "https://schema.org",
      "@type": "WebPage",
      name: "Nota fiscal para escolas: NFS-e e NF-e no sistema escolar F10",
      url: "https://f10.com.br/solucoes/nota-fiscal",
      description:
        "Página comercial da solução F10 para emissão de notas fiscais de serviço e produto em escolas, com NFS-e, NF-e, exportação, inutilização, carta de correção, devolução e verificação de cidade.",
      inLanguage: "pt-BR",
      keywords:
        "nota fiscal para escolas, emissão de NFS-e para escola, NF-e para escola, sistema escolar com nota fiscal, software escolar financeiro, nota fiscal de serviço educacional, nota fiscal de produto escolar, F10 Software",
      isPartOf: {
        "@type": "WebSite",
        name: "F10 Software",
        url: "https://f10.com.br",
      },
      about: [
        { "@type": "Thing", name: "Nota Fiscal de Serviço para escolas" },
        {
          "@type": "Thing",
          name: "Nota Fiscal Eletrônica de produto para escolas",
        },
        { "@type": "Thing", name: "Sistema financeiro escolar" },
      ],
    },
    {
      "@context": "https://schema.org",
      "@type": "SoftwareApplication",
      name: "F10 Nota Fiscal Eletrônica para Escolas",
      applicationCategory: "BusinessApplication",
      operatingSystem: "Web",
      url: "https://f10.com.br/solucoes/nota-fiscal",
      description:
        "Solução do sistema escolar F10 para emissão e controle de notas fiscais de serviço e produto, integrada ao financeiro da escola.",
      featureList: [
        "Emissão de NFS-e para serviços educacionais",
        "Emissão de NF-e para venda de produtos escolares",
        "Controle fiscal conectado ao financeiro escolar",
        "Exportação de notas fiscais",
        "Inutilização de notas",
        "Carta de correção de NF-e",
        "Nota de devolução de venda de produto",
        "Verificação de disponibilidade por cidade",
      ],
      provider: {
        "@type": "Organization",
        name: "F10 Software",
        url: "https://f10.com.br",
      },
      audience: {
        "@type": "Audience",
        audienceType:
          "Escolas, cursos livres, escolas de idiomas e instituições de ensino não regular",
      },
    },
    {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: faqItems.map((item) => ({
        "@type": "Question",
        name: item.question,
        acceptedAnswer: {
          "@type": "Answer",
          text: item.answer,
        },
      })),
    },
  ]
    .map(
      (item, index) =>
        `<script id="jsonld-nota-fiscal-${index}" type="application/ld+json">${JSON.stringify(
          item,
        )}<\/script>`,
    )
    .join("\n");

  let isModalOpen = false;
  let isChecking = false;
  let isSendingNotification = false;
  let notificationSent = false;
  let formMessage = "";
  let result: CityCheckResult | null = null;
  let errors: FormErrors = {};

  let name = "";
  let email = "";
  let whatsapp = "";
  let schoolName = "";
  let city = "";
  let state = "";
  let cityCoverageStatus: CityCoverageStatus = "idle";
  let cityCoverageState = "";
  let cityCoverageRequestId = 0;
  let coveredCities: string[] = [];
  let isCityDropdownOpen = false;
  let lastBodyOverflow = "";
  let lastHtmlOverflow = "";

  function normalizeState(value: string): string {
    return value
      .replace(/[^a-zA-Z]/g, "")
      .slice(0, 2)
      .toUpperCase();
  }

  function normalizeWhitespace(value: string): string {
    return value.replace(/\s+/g, " ").trim();
  }

  function normalizeText(value: string): string {
    return value
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-zA-Z0-9\s]/g, " ")
      .replace(/\s+/g, " ")
      .trim()
      .toLowerCase();
  }

  function extractCityNames(payload: unknown): string[] {
    const data = payload as {
      data?: unknown;
      cidades?: unknown;
      cities?: unknown;
    };
    const source = Array.isArray(payload)
      ? payload
      : Array.isArray(data?.data)
        ? data.data
        : Array.isArray(data?.cidades)
          ? data.cidades
          : Array.isArray(data?.cities)
            ? data.cities
            : [];

    return Array.from(
      new Set(
        source
          .map((item) => {
            if (typeof item === "string") return item.trim();
            if (!item || typeof item !== "object") return "";

            const cityItem = item as {
              nome?: unknown;
              name?: unknown;
              cidade?: unknown;
              city?: unknown;
            };

            return String(
              cityItem.nome ??
                cityItem.name ??
                cityItem.cidade ??
                cityItem.city ??
                "",
            ).trim();
          })
          .filter(Boolean),
      ),
    ).sort((a, b) => a.localeCompare(b, "pt-BR"));
  }

  function normalizePhoneDigits(value: string): string {
    const digits = value.replace(/\D/g, "");
    if ((digits.length === 12 || digits.length === 13) && digits.startsWith("55")) {
      return digits.slice(2);
    }
    return digits.slice(0, 11);
  }

  function formatBrazilianPhone(value: string): string {
    const digits = normalizePhoneDigits(value);

    if (digits.length <= 2) {
      return digits ? `(${digits}` : "";
    }

    if (digits.length <= 6) {
      return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
    }

    if (digits.length <= 10) {
      return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
    }

    return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
  }

  function handleWhatsappInput(event: Event) {
    const target = event.currentTarget as HTMLInputElement;
    whatsapp = formatBrazilianPhone(target.value);
  }

  async function loadCitiesByState(stateValue: string) {
    const normalizedState = normalizeState(stateValue);

    if (normalizedState.length !== 2) {
      cityCoverageState = "";
      cityCoverageStatus = "idle";
      coveredCities = [];
      isCityDropdownOpen = false;
      return;
    }

    if (
      normalizedState === cityCoverageState &&
      cityCoverageStatus !== "error"
    ) {
      return;
    }

    const requestId = ++cityCoverageRequestId;
    cityCoverageState = normalizedState;
    cityCoverageStatus = "loading";
    coveredCities = [];

    try {
      const params = new URLSearchParams({ uf: normalizedState });
      const response = await fetch(`${cityCoverageEndpoint}?${params}`, {
        headers: { Accept: "application/json" },
      });

      if (!response.ok) throw new Error("coverage_request_failed");

      const cities = extractCityNames(await response.json());
      if (requestId !== cityCoverageRequestId) return;

      coveredCities = cities;
      cityCoverageStatus = cities.length > 0 ? "ready" : "empty";
    } catch {
      if (requestId !== cityCoverageRequestId) return;

      cityCoverageStatus = "error";
      coveredCities = [];
    }
  }

  function handleStateInput(event: Event) {
    const target = event.currentTarget as HTMLInputElement;
    state = normalizeState(target.value);
    void loadCitiesByState(state);
  }

  function handleCityInput() {
    isCityDropdownOpen = true;
  }

  function selectCitySuggestion(selectedCity: string) {
    city = selectedCity;
    isCityDropdownOpen = false;
  }

  $: filteredCities =
    normalizeWhitespace(city).length >= 2
      ? coveredCities
          .filter((item) => normalizeText(item).includes(normalizeText(city)))
          .slice(0, 8)
      : [];

  $: cityCoverageMessage =
    cityCoverageStatus === "loading"
      ? "Buscando sugestões de cidades com cobertura..."
      : cityCoverageStatus === "empty"
        ? "Nenhuma sugestão encontrada para essa UF."
        : "";

  function isEmailValid(value: string): boolean {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
  }

  function getIssueStatusClass(status: string): string {
    if (status === "Completa" || status === "Emitida") {
      return "bg-[#DCFCE7] text-[#166534] ring-1 ring-[#BBF7D0]";
    }

    return "bg-[#FFEDD5] text-[#9A3412] ring-1 ring-[#FED7AA]";
  }

  function portal(node: HTMLElement) {
    if (typeof document === "undefined") return;

    const target = document.getElementById("modal-root") ?? document.body;
    const parent = node.parentNode;
    const placeholder = document.createComment("city-modal-portal");

    parent?.insertBefore(placeholder, node);
    target.appendChild(node);

    return {
      destroy() {
        if (node.parentNode) {
          node.remove();
        }

        if (placeholder.parentNode) {
          placeholder.remove();
        }
      },
    };
  }

  async function openCityModal() {
    isModalOpen = true;
    formMessage = "";
    notificationSent = false;

    if (typeof document === "undefined") return;

    await tick();

    lastHtmlOverflow = document.documentElement.style.overflow;
    lastBodyOverflow = document.body.style.overflow;

    document.documentElement.style.overflow = "hidden";
    document.body.style.overflow = "hidden";
  }

  function closeCityModal() {
    if (isChecking || isSendingNotification) return;

    isModalOpen = false;

    if (typeof document === "undefined") return;

    document.documentElement.style.overflow = lastHtmlOverflow;
    document.body.style.overflow = lastBodyOverflow;
  }

  onDestroy(() => {
    if (typeof document === "undefined") return;

    document.documentElement.style.overflow = lastHtmlOverflow;
    document.body.style.overflow = lastBodyOverflow;
  });

  function validateLeadForm(): boolean {
    const next: FormErrors = {};

    if (!normalizeWhitespace(name)) next.name = "Informe o nome.";
    if (!isEmailValid(email)) next.email = "Informe um e-mail válido.";
    if (normalizePhoneDigits(whatsapp).length < 10)
      next.whatsapp = "Informe um WhatsApp válido.";
    if (!normalizeWhitespace(schoolName))
      next.schoolName = "Informe o nome da escola.";
    if (!normalizeWhitespace(city)) next.city = "Informe a cidade.";
    if (normalizeState(state).length !== 2)
      next.state = "Informe a UF com 2 letras.";

    errors = next;
    return Object.keys(next).length === 0;
  }

  function createLeadCache(
    cityCheckResult: CityCheckResult,
    shouldSkipCityCheck: boolean,
  ) {
    window.sessionStorage.setItem(
      "nfseCityCheckLead",
      JSON.stringify({
        shouldSkipCityCheck,
        contactName: normalizeWhitespace(name),
        contactEmail: email.trim(),
        contactWhatsapp: normalizeWhitespace(whatsapp),
        schoolName: normalizeWhitespace(schoolName),
        cityCheckResult,
      }),
    );
  }

  async function checkCityAvailability() {
    formMessage = "";
    notificationSent = false;
    result = null;

    if (!validateLeadForm()) return;

    isChecking = true;

    try {
      const params = new URLSearchParams({
        city: normalizeWhitespace(city),
        state: normalizeState(state),
      });

      const response = await fetch(
        `/api/nfse/nfse-city-check?${params.toString()}`,
      );
      const data = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(
          data?.message || "Não foi possível verificar a cidade agora.",
        );
      }

      result = {
        status: data.available ? "available" : "unavailable",
        city: data.city || normalizeWhitespace(city),
        state: data.state || normalizeState(state),
        ibgeCode: data.ibgeCode || "",
        provider: data.provider || "",
        message: data.message || "Verificação concluída.",
        checkedAt: data.checkedAt || new Date().toISOString(),
        raw: data.raw || null,
      };

      city = result.city;
      state = result.state;

      await requestAvailabilityNotification();
    } catch (error) {
      result = {
        status: "error",
        city: normalizeWhitespace(city),
        state: normalizeState(state),
        ibgeCode: "",
        provider: "",
        message:
          error instanceof Error
            ? error.message
            : "Não foi possível verificar a cidade agora.",
        checkedAt: new Date().toISOString(),
        raw: null,
      };
      formMessage = result.message;
    } finally {
      isChecking = false;
    }
  }

  async function continueAnyway() {
    if (!result) return;
    createLeadCache(result, true);
    await goto(registrationUrl);
  }

  async function requestAvailabilityNotification() {
    formMessage = "";

    if (!validateLeadForm()) return;

    const currentResult: CityCheckResult = result ?? {
      status: "unavailable",
      city: normalizeWhitespace(city),
      state: normalizeState(state),
      ibgeCode: "",
      provider: "",
      message: "Cidade em análise para implantação para NFS-e.",
      checkedAt: new Date().toISOString(),
      raw: null,
    };

    isSendingNotification = true;

    try {
      const payload = {
        submissionKind: "nfse_interest_lead",
        submittedAt: new Date().toISOString(),
        city: currentResult.city,
        state: currentResult.state,
        ibgeCode: currentResult.ibgeCode,
        cityCheckStatus: currentResult.status,
        cityCheckMessage: currentResult.message,
        cityCheckCity: currentResult.city,
        cityCheckState: currentResult.state,
        cityCheckIbgeCode: currentResult.ibgeCode,
        cityCheckProvider: currentResult.provider,
        cityCheckCheckedAt: currentResult.checkedAt,
        name: normalizeWhitespace(name),
        email: email.trim(),
        whatsapp: formatBrazilianPhone(whatsapp),
        schoolName: normalizeWhitespace(schoolName),
        emailFields: [
          {
            key: "submissionKind",
            label: "Tipo de solicitação",
            value: "Avisar quando cidade estiver disponível",
          },
          { key: "name", label: "Nome", value: normalizeWhitespace(name) },
          { key: "email", label: "E-mail", value: email.trim() },
          {
            key: "whatsapp",
            label: "WhatsApp",
            value: formatBrazilianPhone(whatsapp),
          },
          {
            key: "schoolName",
            label: "Nome da escola",
            value: normalizeWhitespace(schoolName),
          },
          { key: "city", label: "Cidade", value: currentResult.city },
          { key: "state", label: "UF", value: currentResult.state },
          {
            key: "ibgeCode",
            label: "Código IBGE",
            value: currentResult.ibgeCode,
          },
          {
            key: "cityCheckStatus",
            label: "Status da cidade",
            value: currentResult.status,
          },
          {
            key: "cityCheckMessage",
            label: "Mensagem da verificação",
            value: currentResult.message,
          },
        ],
      };

      const response = await fetch("/api/nfse/nfse-interest/submit", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const body = await response.json().catch(() => null);
        throw new Error(
          body?.message || "Não foi possível enviar a solicitação.",
        );
      }

      notificationSent = true;
    } catch (error) {
      formMessage =
        error instanceof Error ? error.message : "Falha ao enviar solicitação.";
    } finally {
      isSendingNotification = false;
    }
  }

  $: state = normalizeState(state);
</script>

<svelte:head>
  <title
    >Nota fiscal para escolas — emissão de NFS-e e NF-e | F10 Software</title
  >
  <meta
    name="description"
    content="Emita notas fiscais de serviço e produto no sistema escolar F10. Controle NFS-e, NF-e, exportação, inutilização, carta de correção, devolução e financeiro escolar em um só lugar."
  />
  <meta
    name="keywords"
    content="nota fiscal para escolas, NFS-e para escolas, NF-e para escolas, emissão de nota fiscal escolar, sistema escolar com nota fiscal, software escolar financeiro, F10 nota fiscal"
  />
  <meta
    property="og:title"
    content="Nota fiscal para escolas — emissão de NFS-e e NF-e | F10 Software"
  />
  <meta
    property="og:description"
    content="Sistema escolar F10 para emissão e controle de notas fiscais de serviço e produto, integrado ao financeiro da escola."
  />
  <meta property="og:type" content="website" />
  <meta property="og:url" content="https://f10.com.br/solucoes/nota-fiscal" />
  <meta
    property="og:image"
    content="https://f10.com.br/og/nota-fiscal-escolar-f10.jpg"
  />
  <meta name="twitter:card" content="summary_large_image" />
  <meta
    name="twitter:title"
    content="Nota fiscal para escolas — emissão de NFS-e e NF-e | F10 Software"
  />
  <meta
    name="twitter:description"
    content="Emita NFS-e e NF-e pelo sistema escolar F10, com controle conectado ao financeiro da escola."
  />
  <link rel="canonical" href="https://f10.com.br/solucoes/nota-fiscal" />
  {@html structuredDataScript}
</svelte:head>

<!-- ===== HERO NOTA FISCAL ===== -->
<section
  class={`relative isolate flex min-h-[auto] flex-col overflow-hidden bg-white/80 lg:min-h-screen lg:max-h-[900px] ${noOverflowPage}`}
>
  <div class="pb-3 pt-4">
    <Breadcrumb
      baseUrl="https://f10.com.br"
      items={[
        { label: "HOME", href: "/" },
        { label: "SOLUÇÕES", href: "/solucoes" },
        { label: "NOTA FISCAL" },
      ]}
    />
  </div>

  <div class="container flex flex-1 flex-col pb-16">
    <div class="mx-auto max-w-6xl pb-10 pt-4 text-center md:pb-12 lg:pb-14">
      <h1
        class="mx-auto mt-4 text-[30px] font-semibold leading-[1.1]
                       tracking-[-0.03em] text-[#010D28] sm:text-[38px] md:text-[44px]"
      >
        Nota fiscal para escolas: emita NFS-e e NF-e direto no Software F10
      </h1>

      <p
        class="mx-auto mt-3 max-w-[760px] text-[15px] leading-[1.8]
                       text-[#000A57]/85 md:text-[17px]"
      >
        Controle a emissão de notas fiscais de serviço e produto junto ao
        financeiro escolar. O F10 ajuda sua escola a organizar mensalidades,
        matrículas, cursos, materiais didáticos, livros, apostilas e outras
        receitas que precisam de documento fiscal.
      </p>

      <div
        class="mt-6 flex flex-col items-center justify-center gap-3 sm:flex-row"
      >
        <button
          type="button"
          on:click={openCityModal}
          class="inline-flex items-center justify-center gap-3 rounded-full
                           bg-[#EA6D0B] px-8 py-3.5 text-[15px] font-semibold text-white
                           shadow-[0_14px_40px_rgba(234,109,11,0.45)] hover:brightness-110
                           focus:outline-none focus:ring-2 focus:ring-[#EA6D0B]/60 md:px-10 md:text-[16px]"
        >
          <span>Verificar minha cidade</span>
          <ArrowRight size={20} />
        </button>

        <a
          href="#funcionalidades"
          class="inline-flex items-center justify-center gap-3 rounded-full border
                           border-[#000A57]/10 bg-white px-8 py-3.5 text-[15px]
                           font-semibold text-[#010D28] shadow-sm hover:bg-[#F8FAFF] md:px-10 md:text-[16px]"
        >
          Ver funcionalidades
        </a>
      </div>
    </div>

    <div class="relative mx-auto w-full flex-1">
      <figure
        class="relative z-0 overflow-hidden rounded-[18px] border border-[#D4D7E3]
                       bg-[#F2F3FA] shadow-[0_18px_45px_rgba(15,23,42,0.18)]"
      >
        <div
          class="flex items-center justify-between border-b border-[#D4D7E3]
                           bg-[#F2F3FA] px-4 py-1.5 text-[11px] text-[#4B5563]"
        >
          <div class="flex items-center gap-3 min-w-0">
            <span class="font-semibold text-[#111827]">Meu F10</span>
            <span>Cadastros</span>
            <span>Comercial</span>
            <span>Pedagógico</span>
            <span class="font-semibold text-primary">Financeiro</span>
            <span>Sistema</span>
          </div>
          <span class="hidden text-[11px] text-slate-500 md:block">
            Nota Fiscal Eletrônica · F10 Administração Escolar
          </span>
        </div>

        <div
          class="flex items-center justify-between border-b border-[#D4D7E3]
                           bg-[#F5F6FC] px-4 py-3"
        >
          <div
            class="grid flex-1 grid-cols-3 gap-2 sm:grid-cols-4 sm:gap-3 md:grid-cols-6 lg:grid-cols-9"
          >
            {#each fiscalShortcuts as shortcut}
              <div
                class="flex flex-col items-center gap-1 rounded-[12px]
                                       bg-gradient-to-b from-white/40 via-white/15 to-transparent
                                       px-2 py-2 text-center sm:px-3"
              >
                <img
                  src={shortcut.imgSrc}
                  alt={shortcut.alt}
                  class="h-7 w-auto object-contain sm:h-8"
                  loading="lazy"
                />
                <span class="text-[10px] leading-[1.15] text-[#111827]">
                  {shortcut.labelLine1}
                  {#if shortcut.labelLine2}
                    <br />
                    {shortcut.labelLine2}
                  {/if}
                </span>
              </div>
            {/each}
          </div>

          <div class="ml-4 hidden md:block">
            <img
              src="/logo_f10_3.webp"
              alt="F10 Software"
              class="h-16 w-auto"
              loading="lazy"
            />
          </div>
        </div>

        <div class="px-4 pb-2 pt-3">
          <div
            class="inline-flex items-center gap-2 rounded-t-xl border border-b-0 border-slate-200
                               bg-slate-100 px-3 py-1.5 text-[12px] font-semibold text-slate-700"
          >
            <span
              class="inline-flex h-4 w-4 items-center justify-center rounded-full bg-primary/10"
            >
              <span class="h-2 w-2 rounded-[3px] bg-primary"></span>
            </span>
            <span>Nota Fiscal Eletrônica</span>
          </div>
        </div>

        <div class="bg-white">
          <div class={scrollXWrap}>
            <div class="min-w-[1280px] px-3 py-1.5">
              <div
                class="grid grid-cols-[0.65fr,0.85fr,1.35fr,1.05fr,1.1fr,0.85fr,1.15fr,1.15fr,0.95fr,0.85fr,1.2fr,0.95fr]
                                       gap-2 rounded-[6px] bg-[#EEF1F8] px-2.5 py-1
                                       text-[10px] font-semibold text-[#4B5563] whitespace-nowrap"
              >
                <span>Contrato</span>
                <span>Matrícula</span>
                <span>Curso</span>
                <span>Turmas</span>
                <span>Tipo Recebimento</span>
                <span>Vencimento</span>
                <span>Recebido</span>
                <span>Banco Cobrança</span>
                <span>Status Contrato</span>
                <span>Emissão</span>
                <span>Aluno - Aluno</span>
                <span>Aluno - Celular</span>
              </div>
            </div>
          </div>
        </div>

        <div class="bg-white">
          <div class={scrollXWrap}>
            <div class="min-w-[1280px] px-3 pb-2 pt-1">
              <div class="bg-[#DDEEFF] px-2 py-1 text-[11px] text-[#006AC8]">
                ▸ Pagamento : abril 2026 (Nota Fiscal - , , , )
              </div>
              <div class="bg-[#EEF1F8] px-6 py-1 text-[11px] text-[#006AC8]">
                ▸ Status : (Nota Fiscal - , , , )
              </div>
              <div class="bg-[#EEF1F8] px-10 py-1 text-[11px] text-[#006AC8]">
                ▸ Tipo Nota : (Nota Fiscal - , , , )
              </div>

              {#each fiscalRows.slice(0, 5) as row, i}
                <div
                  class={`grid grid-cols-[0.65fr,0.85fr,1.35fr,1.05fr,1.1fr,0.85fr,1.15fr,1.15fr,0.95fr,0.85fr,1.2fr,0.95fr]
                                            gap-2 px-2.5 py-1 text-[11px] whitespace-nowrap
                                            ${i % 2 === 0 ? "bg-white" : "bg-[#F8FAFC]"}`}
                >
                  <span class="truncate text-[#111827]">{row.contract}</span>
                  <span class="truncate text-[#111827]">{row.enrollment}</span>
                  <span class="truncate text-[#111827]">{row.course}</span>
                  <span class="truncate text-[#111827]">{row.className}</span>
                  <span class="truncate text-[#111827]">{row.receiveType}</span>
                  <span class="tabular-nums text-[#111827]">{row.due}</span>
                  <span class="truncate text-[#111827]">{row.received}</span>
                  <span class="truncate text-[#111827]">{row.bank}</span>
                  <span class="truncate text-[#111827]">{row.status}</span>
                  <span>
                    <span
                      class={`inline-flex px-1.5 py-0.5 text-[10px] font-medium ${getIssueStatusClass(row.issueStatus)}`}
                    >
                      {row.issueStatus}
                    </span>
                  </span>
                  <span class="truncate text-[#111827]">{row.student}</span>
                  <span class="truncate text-[#111827]">{row.phone}</span>
                </div>
              {/each}

              <div
                class="mt-8 bg-[#EEF1F8] px-2 py-1 text-[11px] text-[#006AC8]"
              >
                ▸ Pagamento : maio 2026 (Nota Fiscal - , , , )
              </div>
              <div class="bg-[#EEF1F8] px-6 py-1 text-[11px] text-[#006AC8]">
                ▸ Status : (Nota Fiscal - , , , )
              </div>
              <div class="bg-[#EEF1F8] px-10 py-1 text-[11px] text-[#006AC8]">
                ▸ Tipo Nota : (Nota Fiscal - , , , )
              </div>

              {#each fiscalRows.slice(5) as row, i}
                <div
                  class={`grid grid-cols-[0.65fr,0.85fr,1.35fr,1.05fr,1.1fr,0.85fr,1.15fr,1.15fr,0.95fr,0.85fr,1.2fr,0.95fr]
                                            gap-2 px-2.5 py-1 text-[11px] whitespace-nowrap
                                            ${i === 1 ? "bg-[#CFE3F7]" : i % 2 === 0 ? "bg-white" : "bg-[#F8FAFC]"}`}
                >
                  <span class="truncate text-[#111827]">{row.contract}</span>
                  <span class="truncate text-[#111827]">{row.enrollment}</span>
                  <span class="truncate text-[#111827]">{row.course}</span>
                  <span class="truncate text-[#111827]">{row.className}</span>
                  <span class="truncate text-[#111827]">{row.receiveType}</span>
                  <span class="tabular-nums text-[#111827]">{row.due}</span>
                  <span class="truncate text-[#111827]">{row.received}</span>
                  <span class="truncate text-[#111827]">{row.bank}</span>
                  <span class="truncate text-[#111827]">{row.status}</span>
                  <span>
                    <span
                      class={`inline-flex px-1.5 py-0.5 text-[10px] font-medium ${getIssueStatusClass(row.issueStatus)}`}
                    >
                      {row.issueStatus}
                    </span>
                  </span>
                  <span class="truncate text-[#111827]">{row.student}</span>
                  <span class="truncate text-[#111827]">{row.phone}</span>
                </div>
              {/each}
            </div>
          </div>
        </div>

        <div
          class="flex items-center justify-between border-t border-[#D4D7E3]
                           bg-[#F3F4F6] px-3 py-1.5 text-[10px] text-[#4B5563]"
        >
          <span class="min-w-0 flex-1 truncate">
            Tela de Nota Fiscal Eletrônica integrada ao módulo Financeiro:
            recebimentos, responsáveis, produtos, serviços e situação da emissão
            em uma única rotina.
          </span>
          <span class="ml-3 hidden whitespace-nowrap md:inline">
            NFS-e · NF-e · exportação · inutilização · correção
          </span>
        </div>
      </figure>
    </div>
  </div>
</section>

<!-- ===== O QUE A SOLUÇÃO ENTREGA ===== -->
<section
  class={`relative bg-white py-12 md:py-16 ${noOverflowPage}`}
  id="funcionalidades"
>
  <div class="container">
    <div class="grid gap-8 lg:grid-cols-3 lg:items-stretch">
      <article
        class="relative overflow-hidden rounded-[24px] bg-[#0B1020] px-6 py-7 text-white
                       shadow-[0_22px_60px_rgba(1,13,40,0.60)] md:px-8 md:py-8"
      >
        <div
          class="pointer-events-none absolute select-none"
          style="width: 1288.32px; height: 843.67px; left: -265.53px; top: 14.84px;"
        >
          <img
            src="/booble_bg.webp"
            alt=""
            aria-hidden="true"
            class="absolute inset-0 h-full w-full origin-center transform-gpu object-cover opacity-30"
            style="transform: rotate(-246.48deg) scale(1.24);"
          />
        </div>

        <div class="relative flex h-full flex-col justify-between gap-4">
          <div class="space-y-3">
            <h2
              class="text-[22px] font-semibold leading-[1.2]
                                   tracking-[-0.02em] md:text-[32px]"
            >
              O que é a solução de nota fiscal escolar F10?
            </h2>

            <p class="text-[14px] leading-[1.8] text-[#D1D5F0] md:text-[16px]">
              É a rotina do F10 que aproxima emissão fiscal, recebimentos,
              contratos, responsáveis, alunos e produtos escolares. A escola
              ganha uma visão mais clara sobre o que precisa virar NFS-e ou
              NF-e, sem depender de controles paralelos.
            </p>
          </div>
        </div>
      </article>

      <div class="flex flex-col justify-center lg:col-span-2">
        <p
          class="mb-4 text-[15px] leading-[1.9] text-[#000A57]/85 md:text-[16px]"
        >
          A emissão fiscal em escolas não deve ficar isolada em planilhas,
          portais e anotações manuais. Ao conectar nota fiscal ao financeiro, a
          direção consegue acompanhar recebimentos, serviços, produtos e
          documentos fiscais com mais previsibilidade.
        </p>

        <div class="grid gap-2 sm:grid-cols-2">
          {#each fiscalFeatures as feature}
            <div class="inline-flex min-w-0 items-start gap-2">
              <CheckCircle2
                size={16}
                class="mt-1 flex-shrink-0 text-[#16A34A]"
              />
              <div>
                <span class="block font-semibold leading-snug text-[#010D28]">
                  {feature.title}
                </span>
                <span
                  class="block text-[13px] leading-relaxed text-[#000A57]/70"
                >
                  {feature.description}
                </span>
              </div>
            </div>
          {/each}
        </div>
      </div>
    </div>
  </div>
</section>

<!-- ===== CONTROLE DE SERVIÇOS E PRODUTOS ===== -->
<section class={`relative bg-white/80 py-12 md:py-16 ${noOverflowPage}`}>
  <div class="container">
    <div class="grid gap-10 lg:grid-cols-12 lg:items-center">
      <div class="lg:col-span-5">
        <p
          class="text-[12px] font-semibold uppercase tracking-[0.22em] text-[#7E82A2]"
        >
          NFS-e e NF-e no mesmo sistema
        </p>

        <h2
          class="mt-2 text-[26px] font-semibold leading-[1.15] text-[#000A57]
                           md:text-[32px]"
        >
          Emissão de nota fiscal direto do contrato do aluno.
        </h2>

        <p
          class="mt-3 text-[15px] leading-[1.8] text-[#000A57]/85 md:text-[16px]"
        >
          No F10, a rotina fiscal nasce próxima do contrato: aluno, turma,
          curso, responsável, forma de recebimento e valores ficam no mesmo
          contexto antes da emissão da NFS-e ou NF-e.
        </p>

        <div class="mt-4 space-y-2 text-[14px] text-[#000A57]/85">
          <div class="flex min-w-0 items-start gap-2">
            <CheckCircle2
              size={18}
              class="mt-[2px] flex-shrink-0 text-[#16A34A]"
            />
            <span class="break-words">
              Acesse as notas fiscais vinculadas ao contrato sem procurar dados
              em telas separadas.
            </span>
          </div>
          <div class="flex min-w-0 items-start gap-2">
            <CheckCircle2
              size={18}
              class="mt-[2px] flex-shrink-0 text-[#16A34A]"
            />
            <span class="break-words">
              Controle serviços educacionais, mensalidades e produtos escolares
              a partir da base financeira da matrícula.
            </span>
          </div>
          <div class="flex min-w-0 items-start gap-2">
            <CheckCircle2
              size={18}
              class="mt-[2px] flex-shrink-0 text-[#16A34A]"
            />
            <span class="break-words">
              Facilite a conferência entre secretaria, financeiro, direção e
              contabilidade.
            </span>
          </div>
        </div>

        <div class="mt-6">
          <a
            href="/solucoes/vendas#contratos"
            class="inline-flex items-center justify-center gap-3 rounded-full border border-[#EA6D0B]/30
                               bg-white px-6 py-3 text-[14px] font-semibold text-[#010D28]
                               shadow-sm transition hover:bg-[#FFF7EF] focus:outline-none
                               focus:ring-2 focus:ring-[#EA6D0B]/40"
          >
            <span>Conhecer a rotina de contratos</span>
            <ArrowRight size={18} />
          </a>
        </div>
      </div>

      <div class="lg:col-span-7">
        <div class="relative flex justify-center lg:justify-end">
          <div
            class="pointer-events-none absolute -left-8 -top-10 h-40 w-40 rounded-full
                               bg-[#4F46E5]/8 blur-3xl"
            aria-hidden="true"
          ></div>

          <div class="relative w-full max-w-[720px]">
            <div
              class="relative z-10 rounded-[26px] border border-slate-200
                                   bg-white shadow-[0_22px_60px_rgba(15,23,42,0.22)]"
            >
              <div
                class="flex items-center justify-between rounded-t-[24px] border-b border-slate-200 bg-slate-50 px-4 pb-2 pt-3"
              >
                <div
                  class="hidden min-w-0 items-center gap-3 text-[11px] text-slate-600 sm:flex"
                >
                  <span class="font-semibold text-slate-800">Meu F10</span>
                  <span>Cadastros</span>
                  <span>Comercial</span>
                  <span>Pedagógico</span>
                  <span class="font-semibold text-primary">Financeiro</span>
                  <span>Sistema</span>
                </div>

                <img
                  src="/logo_f10_3.webp"
                  alt="F10 Software"
                  class="h-6 w-auto object-contain"
                />
              </div>

              <div class="px-4 pb-0 pt-3">
                <div
                  class="inline-flex items-center gap-2 rounded-t-xl border border-b-0 border-slate-200 bg-slate-100 px-3 py-1.5 text-[12px] font-semibold text-slate-700"
                >
                  <span
                    class="inline-flex h-4 w-4 items-center justify-center rounded-full bg-primary/10"
                  >
                    <span class="h-2 w-2 rounded-[3px] bg-primary"></span>
                  </span>
                  <span>Contratos</span>
                </div>
              </div>

              <div class="px-4 pb-4 pt-0">
                <div class="border border-slate-200 bg-[#EEF0F6]">
                  <div class={scrollXWrap}>
                    <div class="min-w-[760px]">
                      <div
                        class="grid grid-cols-[0.7fr,1.6fr,0.9fr,0.9fr,1.55fr,1.3fr]
                                                       border-b border-slate-300 bg-white px-2 py-1
                                                       text-[10px] font-semibold text-slate-600"
                      >
                        <span>Contrato</span>
                        <span>Aluno</span>
                        <span>Status</span>
                        <span>Data Matrícula</span>
                        <span>Tipo</span>
                        <span>Curso</span>
                      </div>

                      {#each [{ contract: "9.659", student: "Maria Santos", status: "Ativo", statusClass: "bg-[#006AC8] text-white", date: "13/05/2026", type: "Venda online - Assinado", course: "Informática - Melhor Idade", selected: true }, { contract: "9.661", student: "Yasmin Almeida Lopes", status: "Matrícula", statusClass: "bg-[#E7F600] text-black", date: "20/05/2026", type: "Venda online - Assinado", course: "Curso Livre F10 (100% Presencial)" }, { contract: "9.660", student: "Victoria da Silva Cardoso", status: "Pré Matrícula", statusClass: "bg-[#9200A8] text-white", date: "18/05/2026", type: "Venda online - Pendente", course: "Curso Livre F10 (100% Presencial)" }, { contract: "9.662", student: "Enzo Martins", status: "Pré Matrícula", statusClass: "bg-[#9200A8] text-white", date: "19/05/2026", type: "Venda online - Assinado", course: "Curso Livre F10 (100% Presencial)" }, { contract: "9.663", student: "Joanderson Testes de Hoje", status: "Ativo", statusClass: "bg-[#006AC8] text-white", date: "21/05/2026", type: "Presencial - Assinado", course: "Informática - Melhor Idade" }] as row}
                        <div
                          class={`grid grid-cols-[0.7fr,1.6fr,0.9fr,0.9fr,1.55fr,1.3fr]
                                                           px-2 py-1 text-[11px] ${row.selected ? "bg-[#CFE3F7]" : "bg-white"}`}
                        >
                          <span class="truncate text-slate-900"
                            >{row.contract}</span
                          >
                          <span class="truncate text-slate-900"
                            >{row.student}</span
                          >
                          <span>
                            <span
                              class={`inline-flex px-1.5 py-0.5 text-[10px] font-semibold ${row.statusClass}`}
                            >
                              {row.status}
                            </span>
                          </span>
                          <span class="truncate text-slate-900">{row.date}</span
                          >
                          <span class="truncate text-slate-900">{row.type}</span
                          >
                          <span class="truncate text-red-600">{row.course}</span
                          >
                        </div>
                      {/each}
                    </div>
                  </div>

                  <div
                    class="relative h-[230px] border-t border-slate-200 bg-[#EEF0F6] sm:h-[170px]"
                  >
                    <div
                      class="absolute left-3 top-3 w-[210px] sm:left-[34%] overflow-hidden rounded-sm border border-slate-300
                                                   bg-white text-[12px] shadow-[0_10px_24px_rgba(15,23,42,0.24)]"
                    >
                      <div
                        class="flex items-center gap-2 px-3 py-2 hover:bg-[#EAF2FF]"
                      >
                        <span class="h-3 w-3 rounded-[3px] bg-[#FBBF24]"></span>
                        <span>Adicionar</span>
                      </div>
                      <div
                        class="flex items-center gap-2 px-3 py-2 hover:bg-[#EAF2FF]"
                      >
                        <span class="h-3 w-3 rounded-[3px] bg-[#22C55E]"></span>
                        <span>Mensagens</span>
                      </div>
                      <div
                        class="flex items-center gap-2 bg-[#D8EAFD] px-3 py-2 font-medium text-[#010D28]"
                      >
                        <span class="h-3 w-3 rounded-[3px] bg-[#16A34A]"></span>
                        <span>Financeiro</span>
                        <span class="ml-auto">›</span>
                      </div>
                      <div class="flex items-center gap-2 px-3 py-2">
                        <span class="h-3 w-3 rounded-[3px] bg-[#38BDF8]"></span>
                        <span>Pedagógico</span>
                      </div>
                      <div class="flex items-center gap-2 px-3 py-2">
                        <span class="h-3 w-3 rounded-[3px] bg-[#94A3B8]"></span>
                        <span>Documentos</span>
                      </div>
                    </div>

                    <div
                      class="absolute left-10 top-[70px] w-[285px] max-w-[calc(100%-3rem)] sm:left-[62%] sm:top-[52px] overflow-hidden rounded-sm border border-slate-300
                                                   bg-white text-[12px] shadow-[0_10px_24px_rgba(15,23,42,0.24)]"
                    >
                      <div class="flex items-center gap-2 px-3 py-2">
                        <span class="h-3 w-3 rounded-[3px] bg-[#CBD5E1]"></span>
                        <span>Situação Financeira</span>
                        <span class="ml-auto text-[11px] text-slate-500"
                          >Shift+Ctrl+P</span
                        >
                      </div>
                      <div class="flex items-center gap-2 px-3 py-2">
                        <span class="h-3 w-3 rounded-[3px] bg-[#FDBA74]"></span>
                        <span>Recebimento de Parcelas</span>
                        <span class="ml-auto text-[11px] text-slate-500"
                          >Shift+Ctrl+R</span
                        >
                      </div>
                      <div
                        class="flex items-center gap-2 bg-[#CFE3F7] px-3 py-2 font-medium text-[#010D28]"
                      >
                        <span class="h-3 w-3 rounded-[3px] bg-[#16A34A]"></span>
                        <span>Notas Fiscais do Contrato</span>
                      </div>
                      <div class="flex items-center gap-2 px-3 py-2">
                        <span class="h-3 w-3 rounded-[3px] bg-[#F97316]"></span>
                        <span>Alterar Banco</span>
                        <span class="ml-auto">›</span>
                      </div>
                      <div class="flex items-center gap-2 px-3 py-2">
                        <span class="h-3 w-3 rounded-[3px] bg-[#14B8A6]"></span>
                        <span>Pagamento Digital - Pix, Boleto e Cartão</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div
                class="border-t border-slate-200 rounded-b-[24px] bg-slate-50 px-4 py-3 text-[11px] text-slate-600"
              >
                Exemplo visual da rotina: contrato do aluno → financeiro → notas
                fiscais do contrato.
              </div>
            </div>

            <div
              class="pointer-events-none absolute -bottom-10 -right-10 h-40 w-40 rounded-full
                                   bg-[#EA6D0B]/14 blur-3xl"
              aria-hidden="true"
            ></div>
          </div>
        </div>
      </div>
    </div>
  </div>
</section>

<!-- ===== FUNCIONALIDADES FISCAIS ===== -->
<section class={`relative bg-white py-12 md:py-16 ${noOverflowPage}`}>
  <div class="container">
    <div class="mx-auto max-w-3xl text-center">
      <p
        class="text-[13px] font-semibold uppercase tracking-[0.18em] text-[#7E82A2]"
      >
        Funcionalidades fiscais relevantes
      </p>
      <h2
        class="mt-3 text-[26px] font-semibold leading-[1.15] text-[#000A57]
                       md:text-[32px]"
      >
        Da emissão à organização dos documentos fiscais da escola
      </h2>
      <p
        class="mt-3 text-[14px] leading-[1.8] text-[#000A57]/80 md:text-[15px]"
      >
        A página de Nota Fiscal do F10 deve ser encontrada por escolas que
        procuram controle de NFS-e, NF-e, exportação de notas, inutilização,
        carta de correção e devolução de venda de produto no sistema escolar.
      </p>
    </div>

    <div class="mt-8 grid gap-6 md:grid-cols-4">
      {#each fiscalFeatures as feature}
        <article
          class="relative flex min-w-0 flex-col gap-2 rounded-[20px] bg-[#F3F4FD]
                           px-5 py-5 ring-1 ring-[#E5E7EB] md:px-6 md:py-6"
        >
          <div
            class="flex h-10 w-10 items-center justify-center rounded-full bg-white
                               text-[#EA6D0B] shadow-sm"
          >
            <svelte:component this={feature.icon} size={19} />
          </div>
          <h3
            class="mt-1 text-[15px] font-semibold text-[#000A57] md:text-[16px]"
          >
            {feature.title}
          </h3>
          <p
            class="break-words text-[13px] leading-[1.7] text-[#4B5563]/85 md:text-[14px]"
          >
            {feature.description}
          </p>
        </article>
      {/each}
    </div>
  </div>
</section>

<!-- ===== VERIFICAÇÃO DE CIDADE ===== -->
<section class={`relative bg-white py-12 md:py-16 ${noOverflowPage}`}>
  <div class="container">
    <div class="grid gap-10 lg:grid-cols-12 lg:items-center">
      <div class="lg:col-span-6">
        <p
          class="text-[12px] font-semibold uppercase tracking-[0.22em] text-[#7E82A2]"
        >
          Verificação antes da homologação
        </p>

        <h2
          class="mt-2 text-[26px] font-semibold leading-[1.15] text-[#000A57]
                           md:text-[32px]"
        >
          Veja se sua cidade já está pronta para emissão pelo F10.
        </h2>

        <p
          class="mt-3 text-[15px] leading-[1.8] text-[#000A57]/85 md:text-[16px]"
        >
          A NFS-e segue as regras de cada prefeitura. A verificação inicial
          ajuda a equipe F10 a direcionar a implantação com mais precisão e
          permite que a escola avance com os próximos passos de forma mais
          organizada.
        </p>

        <button
          type="button"
          on:click={openCityModal}
          class="mt-6 inline-flex items-center justify-center gap-3 rounded-[999px]
                           bg-[#EA6D0B] px-8 py-4 text-[16px] font-bold text-white transition
                           hover:brightness-110 focus:outline-none focus:ring-2 focus:ring-[#EA6D0B]/40"
        >
          <span>Verificar minha cidade</span>
          <MapPin size={21} />
        </button>
      </div>

      <div class="lg:col-span-6">
        <div
          class="relative overflow-hidden rounded-[24px] bg-[#020617] p-7 text-white
                           shadow-[0_18px_50px_rgba(1,13,40,0.16)] ring-1 ring-black/5"
        >
          <div
            class="pointer-events-none absolute inset-0 opacity-[0.10] mix-blend-overlay
                               bg-[url('/noise.svg')] bg-repeat [background-size:250px_250px]"
            aria-hidden="true"
          ></div>

          <div class="relative grid gap-5 md:grid-cols-3">
            <div>
              <ShieldCheck class="text-[#FDBA74]" size={28} />
              <p class="mt-3 text-[15px] font-semibold">Cidade disponível</p>
              <p class="mt-1 text-[13px] leading-relaxed text-slate-200/80">
                O lead segue para o cadastro de homologação fiscal.
              </p>
            </div>
            <div>
              <TriangleAlert class="text-[#FDBA74]" size={28} />
              <p class="mt-3 text-[15px] font-semibold">Cidade em análise</p>
              <p class="mt-1 text-[13px] leading-relaxed text-slate-200/80">
                A escola pode avançar com a solicitação ou pedir acompanhamento.
              </p>
            </div>
            <div>
              <Bell class="text-[#FDBA74]" size={28} />
              <p class="mt-3 text-[15px] font-semibold">Aviso para equipe</p>
              <p class="mt-1 text-[13px] leading-relaxed text-slate-200/80">
                Nome, e-mail, WhatsApp, escola, cidade e UF são enviados ao time
                F10.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</section>

<!-- ===== FAQ ===== -->
<section class={`relative bg-white py-12 md:py-16 ${noOverflowPage}`}>
  <div class="container">
    <div
      class="flex flex-col gap-4 md:flex-row md:items-end md:justify-between"
    >
      <div class="max-w-3xl">
        <p
          class="text-[13px] font-semibold uppercase tracking-[0.18em] text-[#7E82A2]"
        >
          Dúvidas sobre nota fiscal para escolas
        </p>
        <h2
          class="mt-2 text-[26px] font-semibold leading-[1.15] text-[#000A57] md:text-[32px]"
        >
          Perguntas frequentes sobre NFS-e e NF-e no F10
        </h2>
        <p class="mt-3 text-[15px] leading-[1.8] text-[#000A57]/80">
          Conteúdo estruturado para escolas, buscadores e assistentes de IA
          entenderem como a solução fiscal do F10 se conecta ao financeiro
          escolar.
        </p>
      </div>

      <button
        type="button"
        on:click={openCityModal}
        class="hidden rounded-full border border-[#EA6D0B] px-4 py-2 text-[14px]
                       font-semibold text-[#000A57] hover:bg-[#EA6D0B]/10
                       focus:outline-none focus:ring-2 focus:ring-[#EA6D0B]/40 md:inline-flex"
      >
        Verificar cidade
      </button>
    </div>

    <div class="mt-8">
      <FaqAccordion items={faqItems} />
    </div>

    <div class="mt-6 md:hidden">
      <button
        type="button"
        on:click={openCityModal}
        class="inline-flex rounded-full border border-[#EA6D0B] px-4 py-2 text-[14px]
                       font-semibold text-[#000A57] hover:bg-[#EA6D0B]/10
                       focus:outline-none focus:ring-2 focus:ring-[#EA6D0B]/40"
      >
        Verificar cidade
      </button>
    </div>
  </div>
</section>

<!-- ===== CTA FINAL ===== -->
<section class={`relative bg-[#F3F4FD] py-12 md:py-16 ${noOverflowPage}`}>
  <div class="container">
    <div class="grid items-center gap-10 lg:grid-cols-12">
      <div class="flex min-w-0 flex-col gap-5 lg:col-span-6">
        <h2
          class="text-[32px] font-medium leading-[1.1] tracking-[-0.01em]
                           text-[#7E82A2] md:text-[40px]"
        >
          Transforme nota fiscal em parte natural do financeiro da sua escola
        </h2>

        <p
          class="max-w-[560px] text-[15px] leading-[1.8] text-[#000A57] md:text-[16px]"
        >
          Com NFS-e, NF-e, exportação de notas, correções e devoluções
          conectadas à rotina administrativa, o F10 ajuda a escola a ganhar
          controle fiscal sem aumentar a complexidade operacional.
        </p>

        <div class="pt-2">
          <button
            type="button"
            on:click={openCityModal}
            class="inline-flex items-center justify-center gap-3 rounded-[999px]
                               bg-[#EA6D0B] px-8 py-4 text-[16px] font-bold text-white transition
                               hover:brightness-110 focus:outline-none focus:ring-2 focus:ring-[#EA6D0B]/40 md:px-10"
          >
            <span>Verificar minha cidade</span>
            <ArrowRight size={24} />
          </button>
        </div>
      </div>

      <div class="lg:col-span-6">
        <div
          class="relative h-[360px] overflow-hidden rounded-[18px] bg-[#020617]
         bg-[url('/nota-fiscal-para-escolas-f10.webp')] bg-cover bg-center
         shadow-[0_18px_50px_rgba(1,13,40,0.16)] ring-1 ring-black/5
         sm:h-[380px] md:h-[420px]"
        >
          <div
            class="absolute inset-0 bg-gradient-to-br from-[#020A24]/85 via-[#07143A]/55 to-[#EA6D0B]/35"
          ></div>

          <div
            class="pointer-events-none absolute inset-0 opacity-[0.12] mix-blend-overlay
           bg-[url('/noise.svg')] bg-repeat [background-size:250px_250px]"
            aria-hidden="true"
          ></div>

          <div class="relative flex h-full w-full items-end">
            <div class="w-full min-w-0 px-6 pb-6">
              <div
                class="inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-2 text-[13px] font-semibold text-white/85 ring-1 ring-white/10 backdrop-blur-sm"
              >
                <BadgeCheck size={16} />
                <span>NFS-e + NF-e + Financeiro F10</span>
              </div>

              <p
                class="mt-4 max-w-[460px] text-[20px] font-semibold leading-snug text-white md:text-[26px]"
              >
                Uma página fiscal pensada para escolas que querem vender,
                receber, emitir e controlar com mais segurança.
              </p>
            </div>
          </div>

          <div
            class="pointer-events-none absolute inset-0 rounded-[18px] ring-1 ring-inset ring-white/15"
          ></div>
        </div>
      </div>
    </div>
  </div>
</section>

{#if isModalOpen}
  <div
    use:portal
    class="fixed inset-0 z-[2147483647] flex items-end justify-center overflow-y-auto bg-[#010D28]/45 px-0 py-0 backdrop-blur-sm sm:items-center sm:px-4 sm:py-6"
    style="position: fixed; inset: 0; width: 100vw; height: 100dvh;"
    role="dialog"
    aria-modal="true"
    aria-labelledby="city-check-title"
  >
    <button
      class="absolute inset-0 cursor-default"
      type="button"
      aria-label="Fechar modal"
      on:click={closeCityModal}
    ></button>

    <div
      class="relative z-10 flex max-h-[100dvh] w-full max-w-[720px] flex-col bg-white shadow-[0_28px_90px_rgba(1,13,40,0.28)] sm:m-auto sm:max-h-[calc(100dvh-48px)] sm:rounded-[30px]"
    >
      <div
        class="flex rounded-t-[28px] items-start justify-between gap-3 border-b border-black/5 bg-[#FFF7EF] px-4 py-4 sm:gap-4 sm:px-5 sm:py-5 md:px-7"
      >
        <div>
          <p
            class="text-[13px] mt-3 font-semibold uppercase tracking-[0.14em] text-[#EA6D0B]"
          >
            Verificação NFS-e
          </p>
        </div>

        <button
          type="button"
          on:click={closeCityModal}
          class="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white text-[#010D28] ring-1 ring-black/5 transition hover:bg-black/[0.03] sm:h-10 sm:w-10"
          aria-label="Fechar"
        >
          <X size={18} />
        </button>
      </div>

      <div
        class="flex-1 px-4 py-5 sm:px-5 sm:py-6 md:px-7"
      >
        {#if notificationSent}
          <div
            class="flex min-h-[360px] flex-col items-center justify-center text-center"
          >
            <div
              class={`flex h-20 w-20 items-center justify-center rounded-full ring-1 ${
                result?.status === "available"
                  ? "bg-emerald-50 text-emerald-600 ring-emerald-100"
                  : "bg-amber-50 text-amber-600 ring-amber-100"
              }`}
            >
              {#if result?.status === "available"}
                <CheckCircle2 size={34} strokeWidth={2.4} />
              {:else}
                <TriangleAlert size={34} strokeWidth={2.4} />
              {/if}
            </div>

            <h3
              class="mt-6 text-[22px] font-semibold tracking-[-0.02em] text-[#010D28] sm:text-[26px]"
            >
              {result?.status === "available"
                ? "Cidade elegível para emissão fiscal"
                : "Cidade ainda não elegível"}
            </h3>

            <p
              class="mt-3 max-w-[460px] text-[14px] leading-relaxed text-[#000A57]/70 sm:text-[15px]"
            >
              {result?.status === "available"
                ? "Sua cidade está elegível para emissão de notas fiscais pelo Software F10. Nossa equipe já foi notificada e entrará em contato em breve para orientar os próximos passos."
                : "Sua cidade ainda não está elegível para emissão de notas fiscais pelo Software F10. Mesmo assim, nossa equipe já foi notificada e entrará em contato em breve para orientar sua escola e tirar qualquer dúvida."}
            </p>
          </div>
        {:else}
          <div class="grid gap-4 md:grid-cols-2">
            <label class="block">
              <span class="text-[13px] font-semibold text-[#010D28]">Nome</span>
              <input
                bind:value={name}
                class="mt-1.5 w-full rounded-2xl border border-black/10 bg-white px-3 py-2.5 sm:px-4 sm:py-3
                                   text-[14px] outline-none transition focus:border-[#EA6D0B]
                                   focus:ring-4 focus:ring-[#EA6D0B]/10"
                placeholder="Seu nome"
              />
              {#if errors.name}
                <span class="mt-1 block text-[12px] text-rose-600"
                  >{errors.name}</span
                >
              {/if}
            </label>

            <label class="block">
              <span class="text-[13px] font-semibold text-[#010D28]"
                >E-mail</span
              >
              <input
                bind:value={email}
                type="email"
                class="mt-1.5 w-full rounded-2xl border border-black/10 bg-white px-3 py-2.5 sm:px-4 sm:py-3
                                   text-[14px] outline-none transition focus:border-[#EA6D0B]
                                   focus:ring-4 focus:ring-[#EA6D0B]/10"
                placeholder="email@escola.com.br"
              />
              {#if errors.email}
                <span class="mt-1 block text-[12px] text-rose-600"
                  >{errors.email}</span
                >
              {/if}
            </label>

            <label class="block">
              <span class="text-[13px] font-semibold text-[#010D28]"
                >WhatsApp</span
              >
              <input
                bind:value={whatsapp}
                on:input={handleWhatsappInput}
                inputmode="tel"
                class="mt-1.5 w-full rounded-2xl border border-black/10 bg-white px-3 py-2.5 sm:px-4 sm:py-3
                                   text-[14px] outline-none transition focus:border-[#EA6D0B]
                                   focus:ring-4 focus:ring-[#EA6D0B]/10"
                placeholder="(00) 00000-0000"
              />
              {#if errors.whatsapp}
                <span class="mt-1 block text-[12px] text-rose-600"
                  >{errors.whatsapp}</span
                >
              {/if}
            </label>

            <label class="block">
              <span class="text-[13px] font-semibold text-[#010D28]"
                >Nome da escola</span
              >
              <input
                bind:value={schoolName}
                class="mt-1.5 w-full rounded-2xl border border-black/10 bg-white px-3 py-2.5 sm:px-4 sm:py-3
                                   text-[14px] outline-none transition focus:border-[#EA6D0B]
                                   focus:ring-4 focus:ring-[#EA6D0B]/10"
                placeholder="Nome fantasia da escola"
              />
              {#if errors.schoolName}
                <span class="mt-1 block text-[12px] text-rose-600"
                  >{errors.schoolName}</span
                >
              {/if}
            </label>

            <label class="block md:col-span-1">
              <span class="text-[13px] font-semibold text-[#010D28]"
                >Estado</span
              >
              <input
                bind:value={state}
                on:input={handleStateInput}
                maxlength="2"
                class="mt-1.5 w-full rounded-2xl border border-black/10 bg-white px-3 py-2.5 sm:px-4 sm:py-3
                                   text-[14px] uppercase outline-none transition focus:border-[#EA6D0B]
                                   focus:ring-4 focus:ring-[#EA6D0B]/10"
                placeholder="UF"
              />
              {#if errors.state}
                <span class="mt-1 block text-[12px] text-rose-600"
                  >{errors.state}</span
                >
              {/if}
            </label>

            <label class="relative block md:col-span-1">
              <span class="text-[13px] font-semibold text-[#010D28]"
                >Cidade</span
              >
              <input
                bind:value={city}
                on:focus={() => (isCityDropdownOpen = true)}
                on:input={handleCityInput}
                on:blur={() =>
                  window.setTimeout(() => (isCityDropdownOpen = false), 120)}
                autocomplete="off"
                class="mt-1.5 w-full rounded-2xl border border-black/10 bg-white px-3 py-2.5 sm:px-4 sm:py-3
                                   text-[14px] outline-none transition focus:border-[#EA6D0B]
                                   focus:ring-4 focus:ring-[#EA6D0B]/10"
                placeholder={cityCoverageStatus === "ready"
                  ? "Digite ao menos 2 letras"
                  : "Ex.: Curitiba"}
              />
              {#if isCityDropdownOpen && filteredCities.length > 0}
                <div
                  class="absolute left-0 right-0 top-full z-[2147483647] mt-2 max-h-60 overflow-y-auto rounded-2xl border border-black/10 bg-white p-1 shadow-2xl"
                >
                  {#each filteredCities as cityOption}
                    <button
                      type="button"
                      class="block w-full rounded-xl px-3 py-2 text-left text-[14px] font-medium text-slate-700 hover:bg-orange-50 hover:text-slate-950"
                      on:mousedown|preventDefault={() =>
                        selectCitySuggestion(cityOption)}
                    >
                      {cityOption}
                    </button>
                  {/each}
                </div>
              {/if}
              {#if cityCoverageMessage}
                <span class="mt-1 block text-[12px] text-slate-500">
                  {cityCoverageMessage}
                </span>
              {/if}
              {#if errors.city}
                <span class="mt-1 block text-[12px] text-rose-600"
                  >{errors.city}</span
                >
              {/if}
            </label>
          </div>

          {#if result?.status === "unavailable"}
            <div
              class="mt-5 rounded-2xl border border-amber-200 bg-amber-50 p-4"
            >
              <div class="flex gap-3">
                <TriangleAlert
                  size={22}
                  class="mt-0.5 shrink-0 text-amber-700"
                />
                <div>
                  <p class="text-[14px] font-semibold text-amber-900">
                    Cidade em análise para implantação
                  </p>
                  <p class="mt-1 text-[13px] leading-relaxed text-amber-800">
                    {result.message}
                  </p>
                </div>
              </div>
            </div>
          {:else if result?.status === "error"}
            <div class="mt-5 rounded-2xl border border-rose-200 bg-rose-50 p-4">
              <div class="flex gap-3">
                <TriangleAlert
                  size={22}
                  class="mt-0.5 shrink-0 text-rose-700"
                />
                <div>
                  <p class="text-[14px] font-semibold text-rose-900">
                    Não foi possível verificar agora
                  </p>
                  <p class="mt-1 text-[13px] leading-relaxed text-rose-800">
                    {result.message}
                  </p>
                </div>
              </div>
            </div>
          {/if}

          {#if formMessage}
            <p class="mt-4 text-[13px] text-rose-600">{formMessage}</p>
          {/if}

          <div
            class="sticky bottom-0 -mx-4 mt-6 flex flex-col gap-3 border-t border-black/5 bg-white/95 px-4 py-4 backdrop-blur sm:static sm:mx-0 sm:flex-row sm:justify-end sm:border-0 sm:bg-transparent sm:px-0 sm:py-0 sm:backdrop-blur-0"
          >
            {#if result?.status === "unavailable" || result?.status === "error"}
              <button
                type="button"
                on:click={continueAnyway}
                disabled={isChecking || isSendingNotification}
                class="inline-flex w-full items-center justify-center rounded-full border border-black/10
                                   bg-white px-5 py-3 text-[14px] sm:w-auto font-semibold text-[#010D28]
                                   transition hover:bg-black/[0.03] disabled:opacity-60"
              >
                Enviar assim mesmo
              </button>

              <button
                type="button"
                on:click={requestAvailabilityNotification}
                disabled={isChecking || isSendingNotification}
                class="inline-flex w-full items-center justify-center gap-2 rounded-full bg-[#010D28]
                                   px-5 py-3 text-[14px] sm:w-auto font-semibold text-white transition
                                   hover:bg-[#000A57] disabled:opacity-60"
              >
                {#if isSendingNotification}
                  <Loader2 size={17} class="animate-spin" />
                {:else}
                  <Bell size={17} />
                {/if}
                <span
                  >{isSendingNotification
                    ? "Enviando..."
                    : "Me avise quando disponível"}</span
                >
              </button>
            {:else}
              <button
                type="button"
                on:click={checkCityAvailability}
                disabled={isChecking || isSendingNotification}
                class="inline-flex w-full items-center justify-center gap-2 rounded-full bg-[#EA6D0B]
                                   px-6 py-3 text-[14px] sm:w-auto font-semibold text-white
                                   shadow-[0_14px_34px_rgba(234,109,11,0.28)] transition
                                   hover:brightness-110 disabled:opacity-60"
              >
                {#if isChecking}
                  <Loader2 size={18} class="animate-spin" />
                {:else}
                  <MapPin size={18} />
                {/if}
                <span
                  >{isChecking
                    ? "Verificando..."
                    : "Verificar minha cidade"}</span
                >
              </button>
            {/if}
          </div>
        {/if}
      </div>
    </div>
  </div>
{/if}

<style>
  /* pt-BR: Mantém a página alinhada ao padrão visual das páginas de soluções F10. */
</style>
