<script lang="ts">
    // ===== Imports =====
    import Breadcrumb from "$lib/components/Breadcrumb.svelte";
    import type { ComponentType } from "svelte";
    import {
        LineChart,
        PieChart,
        BarChart3,
        TrendingUp,
        Users,
        Building2,
        AlertTriangle,
        Activity,
        ArrowRight,
        GraduationCap,
        Wallet,
        Megaphone,
    } from "lucide-svelte";
    import FaqAccordion from "$lib/components/FaqAccordion.svelte";
    import { contactModalConfig } from "$lib/stores/contactModals";
    import { showForm } from "$lib/stores/formPopup";

    // ===== Tipagens =====
    type IconComponent = typeof LineChart;

    type AreaHighlight = {
        id: string;
        label: string;
        description: string;
        icon: ComponentType;
        badge?: string;
    };

    type DashboardHighlight = {
        title: string;
        description: string;
        icon: IconComponent;
    };

    type MultiUnitFeature = {
        title: string;
        description: string;
    };

    type Trend = "up" | "down" | "neutral";

    type RiskMetrics = {
        primaryLabel: string;
        primaryValue: string;
        secondaryLabel: string;
        secondaryValue: string;
        secondaryTrend: Trend;
    };

    type RiskControlItem = {
        title: string;
        subtitle?: string;
        bullets: string[];
        icon?: ComponentType;
        metrics?: RiskMetrics;
    };

    type PersonaView = {
        role: string;
        title: string;
        description: string;
        bullets: string[];
    };

    // Tipos dos dados dos indicadores (apenas para organizar melhor)
    type OverviewKpi = {
        id: string;
        label: string;
        value: number | string;
        prefix?: string;
        suffix?: string;
        colorClass: string;
        description?: string;
    };

    type SalesRow = {
        name: string;
        dayVisits: number;
        monthVisits: number;
        dayEnrollments: number;
        monthEnrollments: number;
    };

    type TicketRow = {
        ticket: number;
        revenue: number;
        rescues: number;
    };

    type MonthlyBars = {
        label: string;
        bars: {
            ninetyDays: number;
            sixtyDays: number;
            thirtyDays: number;
        };
    };

    type ReceivableBucket = {
        id: string;
        label: string;
        dotClass: string;
        barClass: string;
        percent: number;
        summaryLabel: string;
    };

    type NetworkPanelKpi = {
        id: string;
        label: string;
        value: string;
    };

    type NetworkPanelSlice = {
        id: string;
        label: string;
        colorClass: string;
        percentage: number;
    };

    type NetworkPanelConversion = {
        id: string;
        label: string;
        percent: number;
        barColorClass: string;
        textColorClass: string;
    };

    type NetworkPanelUnitRow = {
        id: string;
        unit: string;
        barColorClass: string;
        percent: number;
        value: number;
    };

    type LeadSourceRow = {
        origin: string;
        registrations: number;
        enrollments: number;
        variant?: "stripe" | "total" | "highlight";
    };

    type CaptureRow = {
        advisor: string;
        scheduled: number;
        visits: number;
        enrollments: number;
        variant?: "stripe" | "highlight";
    };

    type SalesChannelRow = {
        channel: string;
        enrollments: number;
        avgTicket: string;
        revenue: string;
        variant?: "stripe" | "highlight";
    };

    type EnrollmentUnitRow = {
        unit: string;
        segment: string;
        newEnrollments: number;
        activeStudents: number;
        canceled: number;
        retention: string;
        stripe?: boolean;
    };

    type QuickSummaryKpi = {
        label: string;
        value: string;
        ringClasses: string;
        valueClasses?: string;
    };

    // ===== Inadimplência (painel visual) =====
    type OverdueKpi = {
        id: string;
        label: string;
        value: string;
        helper?: string;
        colorClass: string;
    };

    type OverdueBucket = {
        label: string;
        amount: string;
        percent: string;
        barWidth: string; // ex: "68%"
        colorClass: string;
    };

    type OverdueUnitRow = {
        unit: string;
        segment: string;
        onTime: string;
        overdue: string;
        overdueRate: string;
    };

    type FaqItem = {
        question: string;
        answer: string;
    };

    const overdueView = {
        periodLabel: "Outubro/2025",
        filters: {
            scope: "Rede cursos livres",
            paymentMethods: "Boleto • Pix • Cartão",
        },
        kpis: <OverdueKpi[]>[
            {
                id: "adimplenciaMes",
                label: "Adimplência do mês",
                value: "92,4%",
                helper: "Receitas recebidas até o vencimento",
                colorClass: "text-emerald-600",
            },
            {
                id: "overdue30",
                label: "Inadimplência 30+ dias",
                value: "4,3%",
                helper: "Alunos com parcelas acima de 30 dias",
                colorClass: "text-rose-600",
            },
            {
                id: "openInvoices",
                label: "Títulos em aberto",
                value: "R$ 38,2 mil",
                helper: "Boletos, Pix e cartão ainda não liquidados",
                colorClass: "text-sky-600",
            },
        ],
        buckets: <OverdueBucket[]>[
            {
                label: "0–7 dias",
                amount: "R$ 14,6 mil",
                percent: "38%",
                barWidth: "38%",
                colorClass: "bg-emerald-500",
            },
            {
                label: "8–15 dias",
                amount: "R$ 9,8 mil",
                percent: "26%",
                barWidth: "26%",
                colorClass: "bg-amber-500",
            },
            {
                label: "16–30 dias",
                amount: "R$ 7,2 mil",
                percent: "19%",
                barWidth: "19%",
                colorClass: "bg-orange-500",
            },
            {
                label: "30+ dias",
                amount: "R$ 6,6 mil",
                percent: "17%",
                barWidth: "17%",
                colorClass: "bg-rose-500",
            },
        ],
        units: <OverdueUnitRow[]>[
            {
                unit: "F10 Centro",
                segment: "Cursos livres presenciais",
                onTime: "R$ 61,4k",
                overdue: "R$ 3,2k",
                overdueRate: "4,9%",
            },
            {
                unit: "F10 Zona Sul",
                segment: "Tecnologia & idiomas",
                onTime: "R$ 42,7k",
                overdue: "R$ 1,9k",
                overdueRate: "4,3%",
            },
            {
                unit: "Polo EAD",
                segment: "Cursos livres on-line",
                onTime: "R$ 27,8k",
                overdue: "R$ 1,6k",
                overdueRate: "5,4%",
            },
            {
                unit: "Unidade Kids",
                segment: "Atividades extracurriculares",
                onTime: "R$ 18,3k",
                overdue: "R$ 0,7k",
                overdueRate: "3,7%",
            },
        ],
    };

    // ===== Risco de evasão / inadimplência =====
    const riskControlItems: RiskControlItem[] = [
        {
            title: "Mapa de risco de evasão",
            subtitle:
                "Alunos de cursos livres por engajamento, presença e billing",
            bullets: [
                "Lista de alunos em risco por unidade, turno e turma.",
                "Alertas por queda de frequência ou atrasos recorrentes.",
                "Filtro rápido por curso, canal de entrada e faixa etária.",
            ],
            metrics: {
                primaryLabel: "Alunos em risco monitorados",
                primaryValue: "124",
                secondaryLabel: "Evasão nos últimos 90 dias",
                secondaryValue: "-12% vs. período anterior",
                secondaryTrend: "down",
            },
        },
        {
            title: "Painel de inadimplência inteligente",
            subtitle:
                "Receitas dos cursos livres agrupadas por status de cobrança",
            bullets: [
                "Faixas de atraso (7, 15, 30+ dias) em um só painel.",
                "Unidades acima da meta destacadas automaticamente.",
                "Base pronta para régua de cobrança via WhatsApp ou e-mail.",
            ],
            metrics: {
                primaryLabel: "Receita em dia",
                primaryValue: "R$ 286 mil",
                secondaryLabel: "Alunos com 30+ dias de atraso",
                secondaryValue: "4,3% da base",
                secondaryTrend: "up",
            },
        },
    ];

    // ===== Indicadores por área =====
    const areaHighlights: AreaHighlight[] = [
        {
            id: "commercial",
            label: "Funil comercial e matrículas",
            description:
                "Acompanhe visitas, propostas, matrículas confirmadas e taxa de conversão por campanha, vendedor, turma e canal de entrada.",
            icon: LineChart,
            badge: "Comercial",
        },
        {
            id: "pedagogy",
            label: "Desempenho pedagógico e engajamento",
            description:
                "Indicadores por turma, disciplina e professor: frequência, notas, uso do app do aluno e risco de evasão por perfil.",
            icon: GraduationCap,
            badge: "Pedagógico",
        },
        {
            id: "financial",
            label: "Inadimplência, recebíveis e fluxo de caixa",
            description:
                "Painéis de boletos, Pix, cartão e parcelamentos com visão por unidade, curso, faixa de atraso e origem da matrícula.",
            icon: Wallet,
            badge: "Financeiro",
        },
        {
            id: "marketing",
            label: "Marketing digital e campanhas de retenção",
            description:
                "Mensure leads por fonte, custo por matrícula, desempenho de campanhas de remarketing e régua de comunicação no WhatsApp.",
            icon: Megaphone,
            badge: "Marketing",
        },
    ];

    // ===== Destaques de dashboards =====
    const dashboardHighlights: DashboardHighlight[] = [
        {
            title: "Visão 360° da escola em um painel único",
            description:
                "Indicadores consolidados de matrícula, evasão, receita e engajamento acadêmico para decisões rápidas em reuniões de diretoria.",
            icon: LineChart,
        },
        {
            title: "Drill-down por curso, unidade e turno",
            description:
                "Comece pela visão geral e aprofunde até chegar no curso, turma ou unidade que está puxando o resultado para cima ou para baixo.",
            icon: BarChart3,
        },
        {
            title: "Comparativos ao longo do tempo",
            description:
                "Compare períodos, campanhas e turmas para entender tendências, sazonalidade e impacto de ações específicas.",
            icon: Activity,
        },
        {
            title: "Indicadores configuráveis",
            description:
                "Defina metas e cortes por área: evasão máxima aceitável, inadimplência-alvo, ticket médio por curso e mais.",
            icon: PieChart,
        },
    ];

    // ===== Multiunidades / franquias =====
    const multiUnitFeatures: MultiUnitFeature[] = [
        {
            title: "Ranking de unidades e franquias",
            description:
                "Compare desempenho em matrículas, receita, inadimplência e evasão por unidade, franqueado ou polo.",
        },
        {
            title: "Indicadores padronizados com leitura simples",
            description:
                "KPIs iguais para todas as unidades, facilitando o acompanhamento da rede sem planilhas paralelas.",
        },
        {
            title: "Visão consolidada e visão detalhada",
            description:
                "Veja o resultado global da rede e, com poucos cliques, desça até a unidade ou curso que precisa de atenção.",
        },
    ];

    // ===== Perfis de gestores =====
    const personaViews: PersonaView[] = [
        {
            role: "Direção / Mantenedor",
            title: "Visão estratégica da escola ou rede",
            description:
                "Indicadores consolidados para quem precisa tomar decisões de investimento, expansão e revisão de portfólio de cursos.",
            bullets: [
                "Receita x metas por período e por unidade.",
                "Evolução de matrículas e evasão ao longo do ano.",
                "Cursos que mais contribuem para o resultado.",
            ],
        },
        {
            role: "Coordenação pedagógica",
            title: "Frequência, notas e evolução da aprendizagem",
            description:
                "Dashboards focados em desempenho acadêmico, engajamento e turmas que exigem intervenção.",
            bullets: [
                "Acompanhamento de frequência por turma e professor.",
                "Mapa de notas e retenção por disciplina.",
                "Indicadores cruzando aproveitamento e uso de conteúdos digitais.",
            ],
        },
        {
            role: "Gestor financeiro",
            title: "Fluxo de caixa, inadimplência e recebimentos",
            description:
                "Painéis financeiros alinhados aos contratos, formas de pagamento e histórico de cobrança.",
            bullets: [
                "Curva de recebimentos previstos x realizados.",
                "Inadimplência por faixa de atraso e por curso.",
                "Impacto das bolsas, descontos e renegociações.",
            ],
        },
    ];

    // ===== Indicadores do painel principal (hero) =====
    const indicatorsView = {
        filters: {
            unitLabel: "IFP - Unidade Centro",
            unitDescription: "Ensino Fundamental II e Médio",
            periodLabel: "Novembro/2025",
        },
        overviewKpis: <OverviewKpi[]>[
            {
                id: "enrollmentsMonth",
                label: "Matrículas confirmadas (mês)",
                value: 128,
                colorClass: "text-emerald-500",
                description: "Novos alunos com contrato assinado em Novembro",
            },
            {
                id: "enrollmentsYear",
                label: "Matrículas acumuladas (ano)",
                value: 842,
                colorClass: "text-indigo-500",
                description:
                    "Matrículas confirmadas de janeiro até o mês atual",
            },
            {
                id: "occupancyRate",
                label: "Taxa de ocupação",
                value: "92%",
                colorClass: "text-amber-500",
                description: "Percentual de vagas ocupadas por turma",
            },
            {
                id: "overdueRate",
                label: "Inadimplência (30+ dias)",
                value: "7,8%",
                colorClass: "text-rose-500",
                description:
                    "Percentual de responsáveis com parcelas em atraso",
            },
        ],
        salesTop5: <SalesRow[]>[
            {
                name: "Amanda Lopes de Brito",
                dayVisits: 7,
                monthVisits: 96,
                dayEnrollments: 3,
                monthEnrollments: 42,
            },
            {
                name: "Letícia Rocha",
                dayVisits: 6,
                monthVisits: 84,
                dayEnrollments: 2,
                monthEnrollments: 35,
            },
            {
                name: "Ivanilde Rodrigues Monteiro dos Santos",
                dayVisits: 5,
                monthVisits: 73,
                dayEnrollments: 2,
                monthEnrollments: 31,
            },
            {
                name: "Luanna Cristina Diogo Nascimento",
                dayVisits: 4,
                monthVisits: 65,
                dayEnrollments: 2,
                monthEnrollments: 27,
            },
            {
                name: "Letícia Pereira do Nascimento",
                dayVisits: 3,
                monthVisits: 49,
                dayEnrollments: 1,
                monthEnrollments: 21,
            },
        ],
        ticketRows: <TicketRow[]>[
            { ticket: 168, revenue: 51300, rescues: 11 },
            { ticket: 174, revenue: 34780, rescues: 8 },
            { ticket: 159, revenue: 28940, rescues: 7 },
            { ticket: 181, revenue: 26820, rescues: 6 },
            { ticket: 162, revenue: 24150, rescues: 5 },
        ],
        monthlyBars: <MonthlyBars[]>[
            {
                label: "Ago",
                bars: { ninetyDays: 55, sixtyDays: 70, thirtyDays: 40 },
            },
            {
                label: "Set",
                bars: { ninetyDays: 62, sixtyDays: 82, thirtyDays: 48 },
            },
            {
                label: "Out",
                bars: { ninetyDays: 58, sixtyDays: 76, thirtyDays: 65 },
            },
        ],
    };

    // ===== Adimplência (card flutuante) =====
    const receivableBuckets: ReceivableBucket[] = [
        {
            id: "onTime",
            label: "Em dia",
            dotClass: "bg-emerald-500",
            barClass: "bg-emerald-500",
            percent: 88,
            summaryLabel: "R$ 182k em dia",
        },
        {
            id: "late",
            label: "Em atraso",
            dotClass: "bg-rose-500",
            barClass: "bg-rose-400",
            percent: 12,
            summaryLabel: "R$ 14k em atraso",
        },
    ];

    // ===== Painel dark de rede (cursos livres) =====
    const networkPanel = {
        kpis: <NetworkPanelKpi[]>[
            { id: "leads", label: "Leads cadastrados", value: "4.120" },
            { id: "worked", label: "Leads trabalhados", value: "3.085" },
            { id: "scheduled", label: "Visitas agendadas", value: "812" },
            { id: "attended", label: "Visitas atendidas", value: "539" },
            {
                id: "enrollments",
                label: "Matrículas cursos livres",
                value: "318",
            },
        ],
        slices: <NetworkPanelSlice[]>[
            {
                id: "health",
                label: "Saúde & bem-estar",
                colorClass: "bg-[#22C55E]",
                percentage: 32,
            },
            {
                id: "tech",
                label: "Tecnologia",
                colorClass: "bg-[#3B82F6]",
                percentage: 27,
            },
            {
                id: "languages",
                label: "Idiomas",
                colorClass: "bg-[#F97316]",
                percentage: 21,
            },
            {
                id: "business",
                label: "Negócios & gestão",
                colorClass: "bg-[#E5E7EB]",
                percentage: 20,
            },
        ],
        conversions: <NetworkPanelConversion[]>[
            {
                id: "step1",
                label: "Cadastros → Leads trabalhados",
                percent: 74,
                barColorClass: "bg-[#DC2626]",
                textColorClass: "text-[#FCA5A5]",
            },
            {
                id: "step2",
                label: "Leads trabalhados → Visitas ag.",
                percent: 38,
                barColorClass: "bg-[#F59E0B]",
                textColorClass: "text-[#FED7AA]",
            },
            {
                id: "step3",
                label: "Visitas atendidas → Matrículas",
                percent: 59,
                barColorClass: "bg-[#22C55E]",
                textColorClass: "text-[#BBF7D0]",
            },
        ],
        units: <NetworkPanelUnitRow[]>[
            {
                id: "u1",
                unit: "Colégio F10 Centro",
                barColorClass: "bg-[#22C55E]",
                percent: 88,
                value: 72,
            },
            {
                id: "u2",
                unit: "F10 Zona Sul",
                barColorClass: "bg-[#3B82F6]",
                percent: 66,
                value: 54,
            },
            {
                id: "u3",
                unit: "F10 Norte",
                barColorClass: "bg-[#F97316]",
                percent: 48,
                value: 39,
            },
            {
                id: "u4",
                unit: "Polo EAD Leste",
                barColorClass: "bg-[#FACC15]",
                percent: 34,
                value: 27,
            },
        ],
    };

    // ===== Painel claro: tabelas comerciais / matrículas =====

    const leadSourceRows: LeadSourceRow[] = [
        {
            origin: "Feira de profissões",
            registrations: 132,
            enrollments: 38,
        },
        {
            origin: "Indicação de famílias",
            registrations: 96,
            enrollments: 42,
            variant: "highlight",
        },
        {
            origin: "Landing page vestibulinho",
            registrations: 187,
            enrollments: 21,
        },
        {
            origin: "Total do mês",
            registrations: 415,
            enrollments: 101,
            variant: "total",
        },
    ];

    const captureRows: CaptureRow[] = [
        {
            advisor: "Amanda",
            scheduled: 21,
            visits: 18,
            enrollments: 9,
        },
        {
            advisor: "Carlos",
            scheduled: 18,
            visits: 14,
            enrollments: 8,
            variant: "highlight",
        },
        {
            advisor: "Letícia",
            scheduled: 16,
            visits: 12,
            enrollments: 6,
        },
        {
            advisor: "Conversão média",
            scheduled: 0,
            visits: 0,
            enrollments: 42,
            variant: "stripe",
        },
    ];

    const salesChannelRows: SalesChannelRow[] = [
        {
            channel: "Presencial",
            enrollments: 39,
            avgTicket: "R$ 940",
            revenue: "R$ 36,7k",
        },
        {
            channel: "Online / remoto",
            enrollments: 21,
            avgTicket: "R$ 780",
            revenue: "R$ 16,4k",
            variant: "highlight",
        },
        {
            channel: "Renovação automática",
            enrollments: 27,
            avgTicket: "R$ 910",
            revenue: "R$ 24,5k",
        },
        {
            channel: "Total do mês",
            enrollments: 87,
            avgTicket: "R$ 884",
            revenue: "R$ 77,6k",
            variant: "stripe",
        },
    ];

    const enrollmentUnitRows: EnrollmentUnitRow[] = [
        {
            unit: "Colégio F10 Centro",
            segment: "Fundamental II",
            newEnrollments: 24,
            activeStudents: 312,
            canceled: 3,
            retention: "98%",
        },
        {
            unit: "Colégio F10 Zona Sul",
            segment: "Ensino Médio",
            newEnrollments: 18,
            activeStudents: 214,
            canceled: 4,
            retention: "96%",
            stripe: true,
        },
        {
            unit: "Escola F10 Kids",
            segment: "Educação Infantil",
            newEnrollments: 15,
            activeStudents: 168,
            canceled: 1,
            retention: "99%",
        },
        {
            unit: "F10 Unidade Online",
            segment: "Cursos livres",
            newEnrollments: 30,
            activeStudents: 247,
            canceled: 7,
            retention: "95%",
            stripe: true,
        },
    ];

    const quickSummaryKpis: QuickSummaryKpi[] = [
        {
            label: "Presença média",
            value: "92%",
            ringClasses: "border-[#10B981] border-b-[#E5E7EB]",
            valueClasses: "text-[#111827]",
        },
        {
            label: "Adimplência",
            value: "93,5%",
            ringClasses: "border-[#22C55E] border-l-[#E5E7EB]",
            valueClasses: "text-[#111827]",
        },
        {
            label: "Alunos em risco",
            value: "27",
            ringClasses: "border-[#F97316] border-t-[#FCA5A5]",
            valueClasses: "text-[#B91C1C]",
        },
    ];

    const quickSummaryNotes: string[] = [
        "78% das famílias acessaram o app do aluno na última semana.",
        "11 turmas com presença abaixo de 85% foram sinalizadas para contato.",
    ];

    // ===== FAQ – Indicadores e BI =====
    const faqIndicatorsItems: FaqItem[] = [
        {
            question:
                "O módulo de Indicadores e BI usa os dados que já tenho no F10?",
            answer: "Sim. Os dashboards são montados a partir dos dados que você já alimenta nos módulos Comercial, Financeiro, Pedagógico, AVA e App Smart Aluno. Matrículas, contratos, presença, notas, cobranças e até cursos livres entram automaticamente na base de indicadores, sem digitação em planilhas paralelas.",
        },
        {
            question:
                "Preciso de um analista de BI ou equipe de dados para usar o módulo?",
            answer: "Não. A equipe F10 cuida da modelagem inicial dos painéis e já entrega um conjunto de indicadores prontos para uso. A escola pode solicitar ajustes, novos filtros e recortes, mas o uso diário é simples: os gestores acessam os dashboards e navegam por unidades, cursos, turmas e períodos com poucos cliques.",
        },
        {
            question:
                "Os indicadores funcionam para cursos livres, EAD e redes com várias unidades?",
            answer: "Sim. O BI do F10 foi pensado para escolas presenciais, polos EAD e redes de cursos livres. É possível enxergar a rede consolidada, comparar unidades, analisar famílias de cursos (idiomas, tecnologia, profissionalizantes) e ver o detalhe por turma ou polo específico.",
        },
        {
            question: "Com que frequência os painéis são atualizados?",
            answer: "A atualização é feita em tempo quase real, de acordo com o uso dos módulos do F10. Sempre que há novas matrículas, registros de presença, lançamentos financeiros ou movimentações em cursos livres, os dados alimentam a base de indicadores, mantendo os dashboards sempre alinhados ao dia a dia da operação.",
        },
        {
            question:
                "É possível personalizar gráficos, filtros e metas dos indicadores?",
            answer: "Sim. Além dos painéis padrão, a escola pode definir metas de evasão, inadimplência, ticket médio, ocupação de turmas e conversão comercial. Também é possível criar recortes por nível de ensino, turno, unidade, canal de captação e trilhas de cursos livres, sempre com o apoio da equipe F10.",
        },
        {
            question:
                "Consigo exportar ou compartilhar os relatórios gerados pelos dashboards?",
            answer: "Os indicadores podem ser utilizados diretamente nas reuniões, em grandes telas ou notebooks, e também exportados em formatos como PDF, planilhas e imagens. Assim, fica fácil enviar um resumo para a mantenedora, coordenações ou parceiros, mantendo todos alinhados aos mesmos números.",
        },
        {
            question:
                "Quais perfis de usuários costumam acessar o módulo de Indicadores e BI?",
            answer: "Normalmente, direção, mantenedores, gestores de rede, coordenações pedagógicas, equipe financeira e líderes comerciais. Os acessos podem ser configurados por perfil, garantindo que cada área enxergue o que é relevante para a sua rotina, sempre na mesma base de dados.",
        },
        {
            question:
                "O módulo de BI substitui relatórios em planilhas e controles manuais?",
            answer: "Sim. O objetivo é justamente reduzir a dependência de planilhas soltas, consolidando tudo em dashboards confiáveis. Em vez de buscar dados em vários lugares, a equipe consulta um painel único com indicadores de matrícula, evasão, inadimplência, engajamento e desempenho por unidade, curso e período.",
        },
    ];

    function openIndicadoresModal() {
        contactModalConfig.set({
            defaultMessage:
                "Quero agendar uma demonstração dos indicadores",
            product: "F10 – Indicadores",
            subSource: "Modal Indicadores – dobra 1",
            leadDescription: "Contato iniciado pelo formulário do Indicadores.",
        });

        showForm.set(true);
    }
</script>

<svelte:head>
    <title>
        Indicadores e BI — visão em tempo real da escola e da rede | F10
        Software
    </title>
    <meta
        name="description"
        content="Tenha indicadores de todas as áreas da escola — pedagógico, financeiro, comercial e retenção — em painéis de BI integrados ao F10. Ideal para gestores que tomam decisões com base em números, inclusive em redes e franquias."
    />
    <meta
        property="og:title"
        content="Indicadores e BI — visão em tempo real da escola e da rede | F10 Software"
    />
    <meta
        property="og:description"
        content="Dashboards completos para acompanhar matrículas, evasão, inadimplência, engajamento pedagógico e resultados por unidade, curso e franquia."
    />
    <link rel="canonical" href="https://f10.com.br/solucoes/indicadores-e-bi" />

    <!-- JSON-LD: SoftwareApplication -->
    <script type="application/ld+json">
        {
            "@context": "https://schema.org",
            "@type": "SoftwareApplication",
            "name": "Módulo de Indicadores e BI F10",
            "applicationCategory": "BusinessApplication",
            "operatingSystem": "Web",
            "description": "Módulo de Indicadores e BI da plataforma F10, com dashboards para matrículas, evasão, inadimplência, engajamento pedagógico e desempenho de unidades.",
            "provider": {
                "@type": "Organization",
                "name": "F10 Software"
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
                    "name": "Indicadores e BI",
                    "item": "https://f10.com.br/solucoes/indicadores-e-bi"
                }
            ]
        }
    </script>
</svelte:head>

<!-- ===== HERO ===== -->
<section class="relative isolate overflow-hidden bg-white/40">
    <div class="pb-8 pt-4">
        <Breadcrumb
            baseUrl="https://f10.com.br"
            items={[
                { label: "HOME", href: "/" },
                { label: "SOLUÇÕES", href: "/solucoes" },
                { label: "INDICADORES E BI" },
            ]}
        />
    </div>

    <div class="container pb-16">
        <div class="grid gap-10 lg:grid-cols-12 items-start">
            <!-- TEXTO DO HERO -->
            <div class="lg:col-span-6">
                <h1
                    class="max-w-[820px] text-[#010D28] tracking-[-0.03em] leading-[1.08]
                           text-[34px] sm:text-[42px] md:text-[50px] font-semibold"
                >
                    Indicadores e BI
                    <span class="text-primary">
                        para escolas.
                    </span>
                </h1>

                <p
                    class="mt-6 text-[18px] leading-[1.8] text-[#000A57] max-w-[640px]"
                >
                    Visualize, em um só lugar, números do financeiro,
                    pedagógico, comercial e retenção. Do aluno individual à rede
                    inteira de escolas, os dashboards do F10 mostram o que está
                    funcionando — e onde agir antes que o problema cresça.
                </p>

                <p
                    class="mt-3 text-[16px] leading-[1.8] text-[#000A57]/80 max-w-[640px]"
                >
                    Os indicadores F10 são totalmente personalizáveis: a escola
                    define quais números quer acompanhar e a equipe F10 modela
                    os painéis para diretoria, coordenação e financeiro.
                </p>

                <div class="mt-8 flex flex-wrap items-center gap-4">
                    <button
                        on:click={openIndicadoresModal}
                        type="button"
                        class="inline-flex items-center justify-center gap-3 rounded-[999px]
                               bg-[#EA6D0B] px-8 md:px-10 py-3.5 text-white text-[16px] font-bold
                               transition hover:brightness-110 focus:outline-none focus:ring-2
                               focus:ring-[#EA6D0B]/40"
                    >
                        <span>Solicitar demonstração</span>
                        <ArrowRight size={22} />
                </button>

                    <p class="text-[13px] text-[#7E82A2]">
                        Apresentação guiada com exemplos reais de dashboards
                        pedagógicos, financeiros e de retenção.
                    </p>
                </div>
            </div>

            <!-- PAINEL DE BI (LADO DIREITO) -->
            <div class="lg:col-span-6 flex justify-end">
                <div class="relative w-full max-w-[680px]">
                    <!-- FUNDO CINZA ROTACIONADO -->
                    <div
                        class="pointer-events-none absolute inset-0 rounded-[32px] bg-[#F3F4F6]/60 rotate-[9deg]"
                        aria-hidden="true"
                    ></div>

                    <figure
                        class="relative mx-auto rounded-[24px] overflow-hidden shadow-[0_18px_40px_rgba(1,13,40,0.16)] bg-[#020617] ring-1 ring-black/5"
                    >
                        <!-- NOISE DE FUNDO -->
                        <div
                            class="pointer-events-none absolute inset-0 opacity-[0.10] mix-blend-overlay bg-[url('/noise.svg')] bg-repeat [background-size:250px_250px]"
                            aria-hidden="true"
                        ></div>

                        <div class="relative flex flex-col">
                            <!-- BARRA SUPERIOR -->
                            <div
                                class="relative flex items-center justify-center px-4 md:px-6 pt-3 pb-2 bg-gradient-to-b from-[#020A24] via-[#020A24] to-[#020617] border-b border-white/10"
                            >
                                <div
                                    class="absolute left-4 flex items-center gap-1.5"
                                >
                                    <span
                                        class="h-2.5 w-2.5 rounded-full bg-[#FF5F57]"
                                    ></span>
                                    <span
                                        class="h-2.5 w-2.5 rounded-full bg-[#FEBB2E]"
                                    ></span>
                                    <span
                                        class="h-2.5 w-2.5 rounded-full bg-[#28C840]"
                                    ></span>
                                </div>

                                <div
                                    class="flex items-center justify-center px-4 md:px-6 py-1.5 rounded-full bg-[#020817] border border-white/15 text-[11px] md:text-[12px] text-white/80 tracking-tight shadow-[0_0_0_1px_rgba(15,23,42,0.3)] max-w-[260px] md:max-w-[320px]"
                                >
                                    <span class="truncate">
                                        app.f10.com.br • Indicadores Gerenciais
                                    </span>
                                </div>
                            </div>

                            <!-- ÁREA DA TELA -->
                            <div class="relative bg-white">
                                <div
                                    class="relative bg-[#EEF1F8] border-t border-slate-200"
                                >
                                    <!-- Conteúdo principal -->
                                    <div class="p-3 space-y-3">
                                        <!-- Linha 1: Visão Geral -->
                                        <div class="grid grid-cols-12 gap-3">
                                            <section
                                                class="col-span-12 flex flex-col rounded-xl border border-slate-200 bg-white shadow-sm"
                                            >
                                                <header
                                                    class="flex items-center justify-between border-b border-slate-200 bg-[#0B2C7A] px-4 py-2 rounded-t-xl"
                                                >
                                                    <div>
                                                        <h2
                                                            class="text-[12px] font-semibold tracking-[0.14em] text-white uppercase"
                                                        >
                                                            Visão geral
                                                        </h2>
                                                        <p
                                                            class="mt-0.5 text-[10px] text-slate-100/80"
                                                        >
                                                            Painel Comercial ·
                                                            Matrículas e
                                                            retenção
                                                        </p>
                                                    </div>
                                                    <span
                                                        class="hidden md:inline text-[10px] text-slate-100/80"
                                                    >
                                                        {indicatorsView.filters
                                                            .unitDescription}
                                                    </span>
                                                </header>

                                                <div
                                                    class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 px-3 py-3"
                                                >
                                                    {#each indicatorsView.overviewKpis as kpi}
                                                        <article
                                                            class="flex flex-col justify-between rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-[11px]"
                                                        >
                                                            <div
                                                                class="flex items-center justify-between gap-2"
                                                            >
                                                                <span
                                                                    class="font-semibold text-slate-700"
                                                                >
                                                                    {kpi.label}
                                                                </span>
                                                                <span
                                                                    class="text-slate-400 text-[10px]"
                                                                    >ⓘ</span
                                                                >
                                                            </div>
                                                            <div
                                                                class={`mt-3 text-2xl md:text-3xl font-semibold leading-none tabular-nums ${kpi.colorClass}`}
                                                            >
                                                                {kpi.prefix}{kpi.value}{kpi.suffix}
                                                            </div>
                                                            {#if kpi.description}
                                                                <p
                                                                    class="mt-1 text-[10px] text-slate-500 line-clamp-2"
                                                                >
                                                                    {kpi.description}
                                                                </p>
                                                            {/if}
                                                        </article>
                                                    {/each}
                                                </div>
                                            </section>
                                        </div>

                                        <!-- Linha 2: Performance + Ticket -->
                                        <div class="grid grid-cols-12 gap-3">
                                            <!-- Performance Top 5 -->
                                            <section
                                                class="col-span-12 flex flex-col rounded-xl border border-slate-200 bg-white shadow-sm"
                                            >
                                                <header
                                                    class="flex items-center justify-between border-b border-slate-200 bg-[#0B2C7A] px-4 py-2 rounded-t-xl"
                                                >
                                                    <h2
                                                        class="text-[12px] font-semibold tracking-[0.14em] text-white uppercase"
                                                    >
                                                        Performance – Top 5
                                                    </h2>
                                                    <span
                                                        class="text-[10px] text-slate-100/80"
                                                    >
                                                        Visitou · Atendeu ·
                                                        Matriculou
                                                    </span>
                                                </header>

                                                <div class="p-3">
                                                    <h3
                                                        class="mb-1 text-[11px] font-semibold text-slate-700"
                                                    >
                                                        Performance matrículas
                                                    </h3>

                                                    <div
                                                        class="rounded-lg border border-slate-200 bg-slate-50 overflow-hidden"
                                                    >
                                                        <div
                                                            class="grid grid-cols-[1.8fr,0.9fr,0.9fr,0.9fr,0.9fr] gap-2 bg-slate-100 px-3 py-1.5 text-[10px] font-semibold text-slate-600"
                                                        >
                                                            <span>Vendedor</span
                                                            >
                                                            <span
                                                                class="text-right"
                                                                >Visitas dia</span
                                                            >
                                                            <span
                                                                class="text-right"
                                                                >Visitas mês</span
                                                            >
                                                            <span
                                                                class="text-right"
                                                                >Matrículas dia</span
                                                            >
                                                            <span
                                                                class="text-right"
                                                                >Matrículas mês</span
                                                            >
                                                        </div>

                                                        <div
                                                            class="bg-white text-[11px]"
                                                        >
                                                            {#each indicatorsView.salesTop5 as row, index}
                                                                <div
                                                                    class="grid grid-cols-[1.8fr,0.9fr,0.9fr,0.9fr,0.9fr] gap-2 px-3 py-1.5 border-t border-slate-100 {index %
                                                                        2 ===
                                                                    1
                                                                        ? 'bg-slate-50'
                                                                        : ''}"
                                                                >
                                                                    <span
                                                                        class="truncate text-slate-800"
                                                                    >
                                                                        {row.name}
                                                                    </span>
                                                                    <span
                                                                        class="text-right tabular-nums text-slate-700"
                                                                        >{row.dayVisits}</span
                                                                    >
                                                                    <span
                                                                        class="text-right tabular-nums text-slate-700"
                                                                        >{row.monthVisits}</span
                                                                    >
                                                                    <span
                                                                        class="text-right tabular-nums text-slate-700"
                                                                        >{row.dayEnrollments}</span
                                                                    >
                                                                    <span
                                                                        class="text-right tabular-nums text-emerald-600"
                                                                        >{row.monthEnrollments}</span
                                                                    >
                                                                </div>
                                                            {/each}
                                                        </div>
                                                    </div>

                                                    <div
                                                        class="mt-2 flex flex-wrap gap-3 text-[10px] text-slate-600"
                                                    >
                                                        <div
                                                            class="flex items-center gap-1.5"
                                                        >
                                                            <span
                                                                class="h-2 w-3 rounded-sm bg-slate-300"
                                                            ></span>
                                                            <span
                                                                >Visitas dia</span
                                                            >
                                                        </div>
                                                        <div
                                                            class="flex items-center gap-1.5"
                                                        >
                                                            <span
                                                                class="h-2 w-3 rounded-sm bg-slate-400"
                                                            ></span>
                                                            <span
                                                                >Visitas mês</span
                                                            >
                                                        </div>
                                                        <div
                                                            class="flex items-center gap-1.5"
                                                        >
                                                            <span
                                                                class="h-2 w-3 rounded-sm bg-sky-400"
                                                            ></span>
                                                            <span
                                                                >Matrículas dia</span
                                                            >
                                                        </div>
                                                        <div
                                                            class="flex items-center gap-1.5"
                                                        >
                                                            <span
                                                                class="h-2 w-3 rounded-sm bg-emerald-500"
                                                            ></span>
                                                            <span
                                                                >Matrículas mês</span
                                                            >
                                                        </div>
                                                    </div>
                                                </div>
                                            </section>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </figure>

                    <!-- CARDS FLUTUANTES INFERIORES (DIREITA) -->
                    <div
                        class="pointer-events-none absolute -right-8 -bottom-6 hidden lg:flex lg:flex-col gap-3"
                    >
                        <!-- Card 1: Meia pizza -->
                        <div
                            class="pointer-events-auto w-[300px] rounded-2xl bg-[#020617] border border-white/10 shadow-[0_18px_35px_rgba(15,23,42,0.55)] px-4 py-3 flex items-center gap-3"
                        >
                            <div
                                class="relative w-[70px] h-16 top-[-14px] overflow-hidden"
                            >
                                <!-- círculo "inteiro" cortado ao meio -->
                                <div
                                    class="absolute inset-x-0 bottom-[-32px] h-[70px] w-[70px] rounded-full border-[6px] border-emerald-400/90 bg-transparent"
                                ></div>
                                <!-- número central -->
                                <div
                                    class="absolute inset-0 flex items-center justify-center"
                                >
                                    <span
                                        class="text-xs font-semibold text-emerald-200 pt-10"
                                    >
                                        92%
                                    </span>
                                </div>
                            </div>
                            <div class="flex-1">
                                <p
                                    class="text-[11px] font-semibold text-slate-50"
                                >
                                    Renovação garantida
                                </p>
                                <p class="text-[10px] text-slate-400">
                                    Percentual de alunos já confirmados para o
                                    próximo ano letivo.
                                </p>
                            </div>
                        </div>

                        <!-- Card 2: Duas barras -->
                        <div
                            class="pointer-events-auto w-[300px] rounded-2xl bg-white border border-slate-200 shadow-[0_16px_30px_rgba(15,23,42,0.35)] px-4 py-3"
                        >
                            <p class="text-[11px] font-semibold text-slate-800">
                                Adimplência do mês
                            </p>
                            <p class="mt-0.5 text-[10px] text-slate-500">
                                Visão rápida da carteira de recebíveis.
                            </p>

                            <div class="mt-3 space-y-2">
                                {#each receivableBuckets as bucket}
                                    <div class="space-y-1">
                                        <div
                                            class="flex items-center justify-between text-[10px]"
                                        >
                                            <span
                                                class="flex items-center gap-1 text-slate-600"
                                            >
                                                <span
                                                    class={`h-2 w-2 rounded-full ${bucket.dotClass}`}
                                                ></span>
                                                {bucket.label}
                                            </span>
                                            <span
                                                class="font-semibold text-slate-700"
                                            >
                                                {bucket.percent}%
                                            </span>
                                        </div>
                                        <div
                                            class="h-1.5 w-full rounded-sm bg-slate-100 overflow-hidden"
                                        >
                                            <div
                                                class={`h-full rounded-sm ${bucket.barClass}`}
                                                style={`width: ${bucket.percent}%;`}
                                            ></div>
                                        </div>
                                    </div>
                                {/each}
                            </div>

                            <div
                                class="mt-3 flex justify-between text-[10px] text-slate-500"
                            >
                                <span>{receivableBuckets[0].summaryLabel}</span>
                                <span>{receivableBuckets[1].summaryLabel}</span>
                            </div>
                        </div>
                    </div>
                    <!-- FIM CARDS FLUTUANTES -->
                </div>
            </div>
        </div>
    </div>
</section>

<!-- ===== O QUE O MÓDULO ENTREGA ===== -->
<section class="relative py-12 md:py-16 bg-white">
    <div class="container">
        <div class="grid items-center gap-10 lg:gap-16 md:grid-cols-2">
            <!-- TEXTO (ESQUERDA) -->
            <div class="max-w-[780px]">
                <h2
                    class="text-[30px] md:text-[36px] lg:text-[40px] font-semibold
                           leading-[1.13] tracking-[-0.015em] text-[#000A57]"
                >
                    O que o módulo de Indicadores e BI entrega para a sua
                    escola?
                </h2>
                <p class="mt-4 text-[16px] leading-[1.8] text-[#000A57]/80">
                    O módulo de Indicadores e BI do F10 conecta os dados que
                    você já alimenta nos módulos Comercial, Financeiro,
                    Pedagógico, AVA e App do Aluno. Em vez de planilhas
                    paralelas, você tem painéis consolidados e confiáveis.
                </p>
                <p class="mt-3 text-[16px] leading-[1.8] text-[#000A57]/80">
                    A direção enxerga o resultado global, os coordenadores
                    acompanham turmas e cursos, o financeiro controla
                    inadimplência e recebíveis — e todos falam a partir dos
                    mesmos números.
                </p>
            </div>

            <!-- IMAGEM ILUSTRATIVA (DIREITA) -->
            <div class="flex justify-center">
                <div class="relative max-w-[320px] lg:max-w-[460px]">
                    <!-- glow de fundo opcional -->
                    <div
                        class="pointer-events-none absolute inset-0 -z-10 rounded-full bg-gradient-to-tr from-[#EA6D0B]/15 via-[#4F46E5]/10 to-[#0EA5E9]/20 blur-3xl"
                        aria-hidden="true"
                    ></div>

                    <img
                        src="/indicadores_escolar.webp"
                        alt="Indicadores conectando áreas pedagógicas, financeiras e comerciais da escola"
                        class="w-full h-auto drop-shadow-xl"
                        loading="lazy"
                    />
                </div>
            </div>
        </div>
    </div>
</section>

<!-- ===== MULTIUNIDADES E FRANQUIAS (PAINEL CENTRAL + TEXTO ABAIXO) ===== -->
<section class="relative py-12 md:py-16 bg-white/60">
    <div
        class="container px-0 mx-auto relative overflow-hidden lg:rounded-[28px] bg-[#010D28] text-white"
    >
        <!-- Fundo e efeitos -->
        <div class="absolute inset-0 z-0 overflow-hidden">
            <img
                src="/booble_bg.webp"
                alt=""
                aria-hidden="true"
                class="pointer-events-none select-none absolute inset-0 w-full h-full
                       object-cover opacity-[0.3] rotate-[-250deg] left-[280px] top-[400px]
                       scale-[1.8] blur-[7px]"
            />

            <div
                class="absolute inset-0 z-10 pointer-events-none mix-blend-overlay opacity-[0.08]"
                style="
                    background-image: url('/noise.svg');
                    background-repeat: repeat;
                    background-size: 250px 250px;
                "
            ></div>
        </div>

        <div
            class="absolute -top-40 -left-40 w-[520px] h-[520px] rounded-full
                   bg-[radial-gradient(closest-side,rgba(255,255,255,0.10),transparent_70%)]
                   opacity-25"
        ></div>
        <div
            class="absolute -top-[18%] right-0 w-[70%] h-[65%] rotate-[-16deg]
                   bg-[linear-gradient(90deg,rgba(255,255,255,0)_0%,rgba(255,255,255,0.16)_40%,rgba(255,255,255,0)_80%)]
                   opacity-[0.22]"
        ></div>
        <div
            class="absolute inset-0 pointer-events-none
                   bg-[radial-gradient(120%_100%_at_50%_0%,rgba(0,0,0,0)_0%,rgba(0,0,0,0.35)_80%)]
                   opacity-60"
        ></div>

        <!-- Conteúdo -->
        <div class="relative z-10 px-6 py-10 md:px-10 lg:px-14 lg:py-14">
            <!-- Subtítulo acima do painel -->
            <div
                class="flex items-center justify-center gap-4 text-[#AEB3D9] text-[12px] md:text-[13px]"
            >
                <span class="inline-block h-px w-10 bg-[#AEB3D9]"></span>
                <span class="tracking-[0.18em] uppercase">
                    MULTIESCOLAS E FRANQUIAS
                </span>
                <span class="inline-block h-px w-10 bg-[#AEB3D9]"></span>
            </div>

            <!-- Painel central -->
            <div class="mt-6 flex justify-center">
                <figure
                    class="w-full max-w-5xl rounded-[22px] border border-white/10 bg-[#020617]/95 overflow-hidden
                           shadow-[0_18px_45px_rgba(0,0,0,0.65)]"
                >
                    <!-- Barra do navegador -->
                    <div
                        class="relative flex items-center justify-between px-4 md:px-5 pt-3 pb-2
                               bg-[#020A24] border-b border-white/10"
                    >
                        <div class="flex items-center gap-1.5">
                            <span class="h-2.5 w-2.5 rounded-full bg-[#FF5F57]"
                            ></span>
                            <span class="h-2.5 w-2.5 rounded-full bg-[#FEBB2E]"
                            ></span>
                            <span class="h-2.5 w-2.5 rounded-full bg-[#28C840]"
                            ></span>
                        </div>

                        <div
                            class="flex-1 mx-4 flex items-center justify-center"
                        >
                            <div
                                class="flex items-center justify-between gap-3 px-4 py-1.5 rounded-full
                                       bg-[#020817] border border-white/15 text-[11px] md:text-[12px]
                                       text-white/80 tracking-tight max-w-[380px] w-full"
                            >
                                <span class="truncate">
                                    app.f10.com.br/painel/comercial-cursos-livres
                                </span>
                                <span
                                    class="hidden md:inline text-[10px] text-[#AEB3D9]"
                                >
                                    Outubro/2025
                                </span>
                            </div>
                        </div>

                        <div
                            class="hidden md:flex items-center gap-3 text-[11px] text-[#AEB3D9]"
                        >
                            <span>Filtro: Rede inteira</span>
                            <span>06/11/2025</span>
                        </div>
                    </div>

                    <!-- Conteúdo do painel -->
                    <div class="bg-[#020617] px-4 md:px-5 pb-4 pt-3 space-y-5">
                        <!-- Linha 1: KPIs principais -->
                        <div class="grid grid-cols-2 md:grid-cols-5 gap-3">
                            {#each networkPanel.kpis as kpi}
                                <div
                                    class="flex flex-col justify-between rounded-lg bg-[#050816]
                                           border border-white/10 px-3 py-2.5"
                                >
                                    <p class="text-[11px] text-[#AEB3D9]">
                                        {kpi.label}
                                    </p>
                                    <p
                                        class="mt-1 text-[20px] md:text-[22px] font-semibold
                                               text-[#8DF39E] tabular-nums"
                                    >
                                        {kpi.value}
                                    </p>
                                </div>
                            {/each}
                        </div>

                        <!-- Linha 2: Pizza + conversão + unidades -->
                        <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <!-- Pizza simples -->
                            <div
                                class="md:col-span-1 rounded-xl bg-[#050816] border border-white/10
                                       px-3 py-3 flex flex-col items-center"
                            >
                                <p class="text-[11px] text-[#AEB3D9] mb-2">
                                    Matrículas por família de cursos livres
                                </p>
                                <div class="relative h-32 w-32">
                                    <div
                                        class="absolute inset-0 rounded-full bg-[#111827]"
                                    ></div>
                                    <div
                                        class="absolute inset-2 rounded-full border-[10px]
                                               border-t-[#22C55E] border-r-[#22C55E]
                                               border-b-[#F97316] border-l-[#3B82F6]
                                               rotate-[22deg]"
                                    ></div>
                                    <div
                                        class="absolute inset-6 rounded-full bg-[#020617]
                                               flex flex-col items-center justify-center"
                                    >
                                        <p class="text-[11px] text-[#AEB3D9]">
                                            Cursos livres
                                        </p>
                                        <p
                                            class="text-[18px] font-semibold text-white"
                                        >
                                            100%
                                        </p>
                                    </div>
                                </div>

                                <div
                                    class="mt-3 grid grid-cols-2 gap-x-4 gap-y-1 text-[10px] text-[#E5E7FF]"
                                >
                                    {#each networkPanel.slices as slice}
                                        <div class="flex items-center gap-1.5">
                                            <span
                                                class={`h-2 w-2 rounded-sm ${slice.colorClass}`}
                                            ></span>
                                            <span>{slice.label}</span>
                                            <span
                                                class="ml-auto text-[#AEB3D9]"
                                            >
                                                {slice.percentage}%
                                            </span>
                                        </div>
                                    {/each}
                                </div>
                            </div>

                            <!-- Conversões -->
                            <div class="md:col-span-2 space-y-3">
                                <div
                                    class="rounded-xl bg-[#050816] border border-white/10 px-4 py-3"
                                >
                                    <p
                                        class="text-[11px] text-[#AEB3D9] mb-1.5"
                                    >
                                        Conversão por etapa – rede cursos livres
                                    </p>

                                    <div
                                        class="space-y-2 text-[11px] text-[#E5E7FF]"
                                    >
                                        {#each networkPanel.conversions as step}
                                            <div
                                                class="flex items-center gap-3"
                                            >
                                                <span class="w-40 truncate">
                                                    {step.label}
                                                </span>
                                                <div
                                                    class="flex-1 h-3 rounded-sm bg-[#111827]"
                                                >
                                                    <div
                                                        class={`h-3 rounded-sm ${step.barColorClass}`}
                                                        style={`width: ${step.percent}%;`}
                                                    ></div>
                                                </div>
                                                <span
                                                    class={`w-10 text-right ${step.textColorClass}`}
                                                >
                                                    {step.percent}%
                                                </span>
                                            </div>
                                        {/each}
                                    </div>
                                </div>

                                <!-- Matrículas por unidade -->
                                <div
                                    class="rounded-xl bg-[#050816] border border-white/10 px-4 py-3"
                                >
                                    <p class="text-[11px] text-[#AEB3D9] mb-2">
                                        Matrículas cursos livres por unidade
                                    </p>
                                    <div
                                        class="space-y-1.5 text-[11px] text-[#E5E7FF]"
                                    >
                                        {#each networkPanel.units as unit}
                                            <div
                                                class="flex items-center gap-2"
                                            >
                                                <span class="w-32 truncate">
                                                    {unit.unit}
                                                </span>
                                                <div
                                                    class="flex-1 h-2 rounded-sm bg-[#111827]"
                                                >
                                                    <div
                                                        class={`h-2 rounded-sm ${unit.barColorClass}`}
                                                        style={`width: ${unit.percent}%;`}
                                                    ></div>
                                                </div>
                                                <span
                                                    class="w-8 text-right text-[#AEB3D9]"
                                                >
                                                    {unit.value}
                                                </span>
                                            </div>
                                        {/each}
                                    </div>
                                </div>
                            </div>
                        </div>

                        <p
                            class="text-[10px] md:text-[11px] text-[#AEB3D9] pt-1 border-t border-white/5"
                        >
                            Números fictícios apenas para ilustrar a visão
                            consolidada de cursos livres no F10.
                        </p>
                    </div>
                </figure>
            </div>

            <!-- Texto abaixo do painel -->
            <div class="mt-10 max-w-4xl mx-auto text-center">
                <h2
                    class="text-[26px] md:text-[32px] lg:text-[34px] font-semibold
                           leading-[1.15] tracking-tight"
                >
                    BI preparado para redes, polos e
                    <span class="text-[#EA6D0B]">franquias de ensino</span>
                </h2>

                <p
                    class="mt-4 text-[14px] md:text-[16px] leading-[1.8]
                           text-[#CBD0F5]"
                >
                    A direção visualiza a rede inteira, enquanto cada
                    coordenador acompanha apenas sua unidade. Indicadores
                    padronizados permitem comparar polos, identificar gargalos
                    de captação e agir rápido onde as matrículas não estão
                    acompanhando o potencial da região.
                </p>

                <ul
                    class="mt-5 grid gap-3 text-left text-[14px] md:text-[15px]
                           text-[#E5E7FF] md:grid-cols-3"
                >
                    {#each multiUnitFeatures as feature}
                        <li class="flex gap-3">
                            <span
                                class="mt-[6px] h-1.5 min-w-1.5 rounded-full
                                       bg-[#EA6D0B]"
                            ></span>
                            <span>
                                <strong class="font-semibold text-white">
                                    {feature.title}
                                </strong>
                                <br />
                                <span class="text-[#CBD0F5]">
                                    {feature.description}
                                </span>
                            </span>
                        </li>
                    {/each}
                </ul>

                <div class="mt-7 flex justify-center">
                    <a
                        href="/contato"
                        class="inline-flex items-center justify-center gap-2 rounded-full
                               bg-[#EA6D0B] px-7 py-2.5 text-[14px] md:text-[15px] font-semibold
                               text-white transition hover:brightness-110
                               focus-visible:outline-none focus-visible:ring-2
                               focus-visible:ring-[#EA6D0B]/60 shadow-[0_14px_40px_rgba(234,109,11,0.45)] hover:brightness-110"
                    >
                        Solicitar demonstração
                    </a>
                </div>
            </div>
        </div>
    </div>
</section>

<!-- ===== INDICADORES POR ÁREA ===== -->
<section class="relative py-12 md:py-16 bg-[#F3F4FD]">
    <div class="container">
        <div
            class="flex flex-col gap-4 md:flex-row md:items-end md:justify-between"
        >
            <div class="max-w-[620px]">
                <p
                    class="text-[13px] font-semibold tracking-[0.18em]
                           text-[#7E82A2]"
                >
                    INDICADORES POR ÁREA
                </p>
                <h2
                    class="mt-2 text-[28px] md:text-[34px] font-semibold leading-[1.15]
                           text-[#000A57]"
                >
                    BI conectado a todas as partes da jornada do aluno
                </h2>
                <p
                    class="mt-3 text-[15px] md:text-[16px] leading-[1.8]
                           text-[#000A57]/80"
                >
                    Não é um painel genérico: os indicadores foram pensados para
                    instituições de ensino que precisam acompanhar matrícula,
                    permanência e resultado acadêmico com profundidade.
                </p>
            </div>

            <div class="mt-2 md:mt-0">
                <span
                    class="inline-flex items-center gap-2 rounded-full bg-white/70 px-3 py-1
                           text-[11px] text-[#4B5563] ring-1 ring-[#E5E7EB]"
                >
                    <span class="h-1.5 w-1.5 rounded-full bg-[#EA6D0B]"></span>
                    Indicadores prontos + painéis personalizados por escola
                </span>
            </div>
        </div>

        <div class="mt-8 grid gap-5 md:grid-cols-2 lg:grid-cols-2">
            {#each areaHighlights as area}
                <article
                    class="group relative overflow-hidden rounded-[18px] bg-white
                           px-6 py-5 md:px-7 md:py-6 ring-1 ring-[#E5E7EB]
                           flex flex-col gap-3 transition
                           hover:bg-[#F9FAFB] hover:ring-[#D1D5DB]"
                >
                    <div class="relative flex gap-4">
                        <!-- Ícone neutro -->
                        <div
                            class="mt-1 flex h-11 w-11 items-center justify-center rounded-full
                                   bg-[#F3F4FD] text-[#4B5563]"
                        >
                            {#if area.icon}
                                <svelte:component
                                    this={area.icon}
                                    size={20}
                                    stroke-width={2}
                                />
                            {/if}
                        </div>

                        <!-- Conteúdo principal -->
                        <div class="flex-1 space-y-1.5">
                            <div class="flex items-center gap-2 flex-wrap">
                                {#if area.badge}
                                    <span
                                        class="inline-flex items-center rounded-full bg-[#F3F4FD]
                                               px-2.5 py-0.5 text-[11px] font-semibold
                                               uppercase tracking-[0.14em] text-[#9CA3AF]"
                                    >
                                        {area.badge}
                                    </span>
                                {/if}
                                <p
                                    class="text-[12px] font-semibold uppercase tracking-[0.16em]
                                           text-[#9CA3AF]"
                                >
                                    {area.label}
                                </p>
                            </div>

                            <p
                                class="text-[14px] md:text-[15px] leading-[1.7]
                                       text-[#000A57]/85"
                            >
                                {area.description}
                            </p>
                        </div>
                    </div>
                </article>
            {/each}
        </div>
    </div>
</section>

<!-- ===== PAINEL CLARO + MATRÍCULAS POR UNIDADE ===== -->
<section class="relative py-12 md:py-16 bg-white">
    <div class="container">
        <div class="mx-auto">
            <!-- JANELA TIPO NAVEGADOR -->
            <figure
                class="rounded-[24px] bg-white ring-1 ring-[#E5E7EB] overflow-hidden"
            >
                <!-- Barra do navegador -->
                <div
                    class="flex items-center justify-between bg-[#F3F4F6] px-4 py-2 border-b border-[#E5E7EB]"
                >
                    <div class="flex items-center gap-1.5">
                        <span class="h-2.5 w-2.5 rounded-full bg-[#EF4444]"
                        ></span>
                        <span class="h-2.5 w-2.5 rounded-full bg-[#F59E0B]"
                        ></span>
                        <span class="h-2.5 w-2.5 rounded-full bg-[#10B981]"
                        ></span>
                    </div>
                    <div
                        class="flex-1 mx-4 max-w-[420px] rounded-full border border-[#D1D5DB] bg-white px-3 py-1.5 text-[11px] text-[#4B5563]"
                    >
                        app.f10.com.br / painéis / indicadores-gerais
                    </div>
                    <div class="hidden md:flex items-center gap-2 text-[10px]">
                        <span class="text-[#6B7280]">Atualizado há 5 min</span>
                    </div>
                </div>

                <!-- Conteúdo interno -->
                <div class="bg-[#F3F4F6]">
                    <!-- Linha de filtros -->
                    <div
                        class="flex flex-wrap items-center gap-3 px-4 py-3 text-[11px] text-[#4B5563]"
                    >
                        <div class="flex items-center gap-2">
                            <span
                                class="font-semibold uppercase tracking-[0.16em] text-[#9CA3AF]"
                            >
                                Filtros
                            </span>
                            <span
                                class="inline-flex items-center rounded-full bg-white px-2.5 py-1 border border-[#D1D5DB]"
                            >
                                Unidade: Rede F10 · Todas
                            </span>
                            <span
                                class="inline-flex items-center rounded-full bg-white px-2.5 py-1 border border-[#D1D5DB]"
                            >
                                Período: Outubro / 2025
                            </span>
                        </div>
                        <div class="ml-auto flex items-center gap-2">
                            <span class="hidden sm:inline text-[#9CA3AF]">
                                Exibindo visão consolidada
                            </span>
                        </div>
                    </div>

                    <!-- GRID PRINCIPAL -->
                    <div class="px-4 pb-4">
                        <div class="grid gap-3 lg:grid-cols-3">
                            <!-- COMERCIAL - CADASTROS -->
                            <section
                                class="bg-white rounded-[14px] border border-[#E5E7EB]"
                            >
                                <header
                                    class="bg-[#0B2C7A] text-white px-3 py-2 rounded-t-[14px] flex items-center justify-between"
                                >
                                    <p class="text-[11px] font-semibold">
                                        Comercial · Cadastros
                                    </p>
                                    <span class="text-[10px] text-white/80">
                                        Eventos & indicações
                                    </span>
                                </header>
                                <div class="px-3 py-2 text-[11px]">
                                    <div
                                        class="grid grid-cols-[1.5fr,0.7fr,0.7fr] bg-[#F3F4F6] rounded-md px-2 py-1 font-semibold text-[#4B5563]"
                                    >
                                        <span>Origem</span>
                                        <span class="text-right">Cadastros</span
                                        >
                                        <span class="text-right"
                                            >Matrículas</span
                                        >
                                    </div>
                                    <div
                                        class="mt-1 divide-y divide-[#E5E7EB] bg-white rounded-md"
                                    >
                                        {#each leadSourceRows as row}
                                            <div
                                                class={`grid grid-cols-[1.5fr,0.7fr,0.7fr] px-2 py-1.5 ${
                                                    row.variant === "highlight"
                                                        ? "bg-[#FEF2F2]"
                                                        : row.variant ===
                                                            "total"
                                                          ? "bg-[#F9FAFB]"
                                                          : ""
                                                }`}
                                            >
                                                <span
                                                    class={`truncate ${
                                                        row.variant === "total"
                                                            ? "font-semibold"
                                                            : ""
                                                    } text-[#111827]`}
                                                >
                                                    {row.origin}
                                                </span>
                                                <span
                                                    class={`text-right ${
                                                        row.variant === "total"
                                                            ? "font-semibold"
                                                            : ""
                                                    } text-[#111827]`}
                                                >
                                                    {row.registrations}
                                                </span>
                                                <span
                                                    class={`text-right ${
                                                        row.variant === "total"
                                                            ? "font-semibold"
                                                            : ""
                                                    } text-[#059669]`}
                                                >
                                                    {row.enrollments}
                                                </span>
                                            </div>
                                        {/each}
                                    </div>
                                </div>
                            </section>

                            <!-- COMERCIAL - CAPTAÇÃO -->
                            <section
                                class="bg-white rounded-[14px] border border-[#E5E7EB]"
                            >
                                <header
                                    class="bg-[#0B2C7A] text-white px-3 py-2 rounded-t-[14px] flex items-center justify-between"
                                >
                                    <p class="text-[11px] font-semibold">
                                        Comercial · Captação
                                    </p>
                                    <span class="text-[10px] text-white/80">
                                        Equipe de atendimento
                                    </span>
                                </header>
                                <div class="px-3 py-2 text-[11px]">
                                    <div
                                        class="grid grid-cols-[1.4fr,0.7fr,0.7fr,0.7fr] bg-[#F3F4F6] rounded-md px-2 py-1 font-semibold text-[#4B5563]"
                                    >
                                        <span>Orientador</span>
                                        <span class="text-right">Agend.</span>
                                        <span class="text-right">Visitas</span>
                                        <span class="text-right">Matric.</span>
                                    </div>
                                    <div
                                        class="mt-1 divide-y divide-[#E5E7EB] bg-white rounded-md"
                                    >
                                        {#each captureRows as row}
                                            <div
                                                class={`grid grid-cols-[1.4fr,0.7fr,0.7fr,0.7fr] px-2 py-1.5 ${
                                                    row.variant === "highlight"
                                                        ? "bg-[#ECFDF5]"
                                                        : row.variant ===
                                                            "stripe"
                                                          ? "bg-[#F9FAFB]"
                                                          : ""
                                                }`}
                                            >
                                                <span
                                                    class={`truncate ${
                                                        row.variant === "stripe"
                                                            ? "font-semibold"
                                                            : ""
                                                    } text-[#111827]`}
                                                >
                                                    {row.advisor}
                                                </span>
                                                <span
                                                    class="text-right text-[#111827]"
                                                >
                                                    {row.variant === "stripe"
                                                        ? "–"
                                                        : row.scheduled}
                                                </span>
                                                <span
                                                    class="text-right text-[#111827]"
                                                >
                                                    {row.variant === "stripe"
                                                        ? "–"
                                                        : row.visits}
                                                </span>
                                                <span
                                                    class={`text-right ${
                                                        row.variant === "stripe"
                                                            ? "font-semibold"
                                                            : ""
                                                    } text-[#059669]`}
                                                >
                                                    {row.variant === "stripe"
                                                        ? `${row.enrollments}%`
                                                        : row.enrollments}
                                                </span>
                                            </div>
                                        {/each}
                                    </div>
                                </div>
                            </section>

                            <!-- COMERCIAL - VENDAS -->
                            <section
                                class="bg-white rounded-[14px] border border-[#E5E7EB]"
                            >
                                <header
                                    class="bg-[#0B2C7A] text-white px-3 py-2 rounded-t-[14px] flex items-center justify-between"
                                >
                                    <p class="text-[11px] font-semibold">
                                        Comercial · Vendas
                                    </p>
                                    <span class="text-[10px] text-white/80">
                                        Ticket & faturamento
                                    </span>
                                </header>
                                <div class="px-3 py-2 text-[11px]">
                                    <div
                                        class="grid grid-cols-[1.3fr,0.7fr,0.7fr,0.7fr] bg-[#F3F4F6] rounded-md px-2 py-1 font-semibold text-[#4B5563]"
                                    >
                                        <span>Canal</span>
                                        <span class="text-right">Matr.</span>
                                        <span class="text-right"
                                            >Ticket médio</span
                                        >
                                        <span class="text-right"
                                            >Faturamento</span
                                        >
                                    </div>
                                    <div
                                        class="mt-1 divide-y divide-[#E5E7EB] bg-white rounded-md"
                                    >
                                        {#each salesChannelRows as row}
                                            <div
                                                class={`grid grid-cols-[1.3fr,0.7fr,0.7fr,0.7fr] px-2 py-1.5 ${
                                                    row.variant === "highlight"
                                                        ? "bg-[#FEF3C7]"
                                                        : row.variant ===
                                                            "stripe"
                                                          ? "bg-[#F9FAFB]"
                                                          : ""
                                                }`}
                                            >
                                                <span
                                                    class={`truncate ${
                                                        row.variant === "stripe"
                                                            ? "font-semibold"
                                                            : ""
                                                    } text-[#111827]`}
                                                >
                                                    {row.channel}
                                                </span>
                                                <span
                                                    class={`text-right ${
                                                        row.variant === "stripe"
                                                            ? "font-semibold"
                                                            : ""
                                                    } text-[#111827]`}
                                                >
                                                    {row.enrollments}
                                                </span>
                                                <span
                                                    class="text-right text-[#111827]"
                                                >
                                                    {row.avgTicket}
                                                </span>
                                                <span
                                                    class={`text-right ${
                                                        row.variant === "stripe"
                                                            ? "font-semibold"
                                                            : ""
                                                    } text-[#059669]`}
                                                >
                                                    {row.revenue}
                                                </span>
                                            </div>
                                        {/each}
                                    </div>
                                </div>
                            </section>
                        </div>

                        <!-- SEGUNDA LINHA: RESUMO + MATRÍCULAS POR UNIDADE -->
                        <div class="mt-3 grid gap-3 lg:grid-cols-3">
                            <!-- Resumos pedagógico/financeiro -->
                            <section
                                class="bg-white rounded-[14px] border border-[#E5E7EB] lg:col-span-1 flex flex-col"
                            >
                                <header
                                    class="bg-[#0B2C7A] text-white px-3 py-2 rounded-t-[14px] flex items-center justify-between"
                                >
                                    <p class="text-[11px] font-semibold">
                                        Pedagógico & Financeiro
                                    </p>
                                    <span class="text-[10px] text-white/80">
                                        Visão rápida
                                    </span>
                                </header>

                                <div class="px-3 py-3 grid gap-3">
                                    <!-- mini gauges -->
                                    <div
                                        class="grid grid-cols-3 gap-3 text-center"
                                    >
                                        {#each quickSummaryKpis as kpi}
                                            <div>
                                                <p
                                                    class="text-[11px] text-[#6B7280]"
                                                >
                                                    {kpi.label}
                                                </p>
                                                <div
                                                    class={`mx-auto mt-1 h-14 w-14 rounded-full border-[6px] ${kpi.ringClasses}`}
                                                ></div>
                                                <p
                                                    class={`mt-[-38px] text-[13px] font-semibold ${
                                                        kpi.valueClasses ??
                                                        "text-[#111827]"
                                                    }`}
                                                >
                                                    {kpi.value}
                                                </p>
                                            </div>
                                        {/each}
                                    </div>

                                    <div
                                        class="space-y-1 text-[11px] text-[#4B5563] mt-8"
                                    >
                                        {#each quickSummaryNotes as note}
                                            <p>• {note}</p>
                                        {/each}
                                    </div>
                                </div>
                            </section>

                            <!-- Matrículas por unidade (visualizador) -->
                            <section
                                class="bg-white rounded-[14px] border border-[#E5E7EB] lg:col-span-2"
                            >
                                <header
                                    class="bg-[#0B2C7A] text-white px-3 py-2 rounded-t-[14px] flex items-center justify-between"
                                >
                                    <p class="text-[11px] font-semibold">
                                        Matrículas por unidade
                                    </p>
                                    <span class="text-[10px] text-white/80">
                                        Comparativo do mês
                                    </span>
                                </header>

                                <div class="px-3 py-2 overflow-x-auto">
                                    <table
                                        class="min-w-full border-collapse text-[11px] text-left"
                                    >
                                        <thead>
                                            <tr
                                                class="border-b border-[#E5E7EB] bg-[#F9FAFB]"
                                            >
                                                <th
                                                    class="py-2 pr-3 pl-1 font-semibold text-[#4B5563]"
                                                >
                                                    Unidade
                                                </th>
                                                <th
                                                    class="py-2 px-3 font-semibold text-[#4B5563]"
                                                >
                                                    Segmento
                                                </th>
                                                <th
                                                    class="py-2 px-3 font-semibold text-right text-[#4B5563]"
                                                >
                                                    Novas matrículas
                                                </th>
                                                <th
                                                    class="py-2 px-3 font-semibold text-right text-[#4B5563]"
                                                >
                                                    Alunos ativos
                                                </th>
                                                <th
                                                    class="py-2 px-3 font-semibold text-right text-[#4B5563]"
                                                >
                                                    Cancelados
                                                </th>
                                                <th
                                                    class="py-2 pl-3 pr-1 font-semibold text-right text-[#4B5563]"
                                                >
                                                    Retenção
                                                </th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {#each enrollmentUnitRows as row}
                                                <tr
                                                    class={`border-b border-[#E5E7EB] ${
                                                        row.stripe
                                                            ? "bg-[#F9FAFB]"
                                                            : "bg-white"
                                                    }`}
                                                >
                                                    <td
                                                        class="py-2 pr-3 pl-1 text-[#111827]"
                                                    >
                                                        {row.unit}
                                                    </td>
                                                    <td
                                                        class="py-2 px-3 text-[#4B5563]"
                                                    >
                                                        {row.segment}
                                                    </td>
                                                    <td
                                                        class="py-2 px-3 text-right text-[#111827]"
                                                    >
                                                        {row.newEnrollments}
                                                    </td>
                                                    <td
                                                        class="py-2 px-3 text-right text-[#111827]"
                                                    >
                                                        {row.activeStudents}
                                                    </td>
                                                    <td
                                                        class="py-2 px-3 text-right text-[#B91C1C]"
                                                    >
                                                        {row.canceled}
                                                    </td>
                                                    <td
                                                        class="py-2 pl-3 pr-1 text-right text-[#059669]"
                                                    >
                                                        {row.retention}
                                                    </td>
                                                </tr>
                                            {/each}
                                        </tbody>
                                    </table>
                                </div>
                            </section>
                        </div>
                    </div>
                </div>
            </figure>

            <!-- TÍTULO + SUBTÍTULO + CTA ABAIXO DO PAINEL -->
            <div class="mt-10 max-w-3xl mx-auto text-center">
                <h3
                    class="text-[22px] md:text-[26px] font-semibold text-[#000A57] leading-tight"
                >
                    Personalização de gráficos e indicadores
                </h3>
                <p
                    class="mt-3 text-[14px] md:text-[15px] leading-relaxed text-[#4B5563]"
                >
                    A equipe F10 configura os indicadores de acordo com a sua
                    realidade: unidades, segmentos, metas comerciais, presença,
                    inadimplência e retenção. Você acompanha tudo em um único
                    painel conectado ao dia a dia da operação.
                </p>
                <div class="mt-5 flex justify-center">
                    <a
                        href="/contato"
                        class="inline-flex items-center justify-center rounded-full
                               bg-[#EA6D0B] px-7 py-2.5 text-[14px] font-semibold text-white
                               hover:brightness-110 focus:outline-none focus:ring-2
                               focus:ring-[#EA6D0B]/40"
                    >
                        Agendar demonstração do painel completo
                    </a>
                </div>
            </div>
        </div>
    </div>
</section>

<!-- ===== DESTAQUES DE DASHBOARDS ===== -->
<section class="relative py-12 md:py-16 bg-white/60">
    <div class="container">
        <div
            class="flex flex-col gap-4 md:flex-row md:items-end md:justify-between"
        >
            <div class="max-w-[580px]">
                <p
                    class="text-[13px] font-semibold tracking-[0.18em]
                           text-[#7E82A2]"
                >
                    PAINÉIS PARA DECISÃO
                </p>
                <h2
                    class="mt-2 text-[28px] md:text-[34px] font-semibold
                           leading-[1.15] text-[#000A57]"
                >
                    Dashboards pensados para quem vive de números
                </h2>
                <p
                    class="mt-3 text-[15px] md:text-[16px] leading-[1.8]
                           text-[#000A57]/80"
                >
                    Indicadores claros, comparativos simples e possibilidade de
                    aprofundar os dados quando algo foge do esperado.
                </p>
            </div>
        </div>

        <div class="mt-8 grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            {#each dashboardHighlights as item}
                <article
                    class="rounded-[20px] bg-[#F9FAFB] px-5 py-5 md:px-6 md:py-6
                           ring-1 ring-[#E5E7EB] flex flex-col gap-3"
                >
                    <div
                        class="flex h-[44px] w-[44px] items-center justify-center
                               rounded-full bg-[#F3F4FD] text-[#000A57]"
                    >
                        <svelte:component this={item.icon} size={22} />
                    </div>
                    <div>
                        <h3
                            class="text-[16px] md:text-[17px] font-semibold
                                   text-[#000A57]"
                        >
                            {item.title}
                        </h3>
                        <p
                            class="mt-1.5 text-[13px] md:text-[14px] leading-[1.7]
                                   text-[#4B5563]/85"
                        >
                            {item.description}
                        </p>
                    </div>
                </article>
            {/each}
        </div>
    </div>
</section>

<!-- ===== EVASÃO E INADIMPLÊNCIA ===== -->
<section class="relative py-12 md:py-16 bg-white">
    <div class="container">
        <div class="grid gap-10 lg:grid-cols-12 items-start">
            <!-- TEXTO À ESQUERDA -->
            <div class="lg:col-span-5 space-y-4">
                <p
                    class="inline-flex items-center gap-2 rounded-full bg-white px-3 py-1
                           text-[11px] font-semibold tracking-[0.18em] text-[#7E82A2]
                           ring-1 ring-[#E5E7EB]"
                >
                    <span class="h-1.5 w-1.5 rounded-full bg-[#EA6D0B]" />
                    CONTROLE DE INADIMPLÊNCIA
                </p>

                <h2
                    class="text-[26px] md:text-[32px] font-semibold leading-[1.15]
                           text-[#000A57]"
                >
                    Um painel de inadimplência feito para cursos livres
                </h2>

                <p
                    class="text-[15px] md:text-[16px] leading-[1.8]
                           text-[#000A57]/80"
                >
                    Em vez de planilhas soltas, o financeiro acompanha todo o
                    comportamento da carteira em um painel único: quem está em
                    dia, quem começou a atrasar e quem já entrou na faixa
                    crítica de 30+ dias.
                </p>

                <p
                    class="text-[14px] md:text-[15px] leading-[1.7]
                           text-[#000A57]/75"
                >
                    O foco é a realidade de <strong>cursos livres</strong>:
                    alunos com mensalidades flexíveis, pacotes de curta duração
                    e diferentes meios de pagamento. Tudo agrupado por unidade e
                    família de curso, pronto para acionar régua de cobrança por
                    WhatsApp, e-mail ou telefone.
                </p>

                <ul
                    class="mt-3 space-y-2 text-[13px] md:text-[14px]
                           text-[#000A57]/85"
                >
                    <li class="flex gap-2">
                        <span
                            class="mt-[7px] h-1.5 w-1.5 rounded-full
                                   bg-[#EA6D0B]"
                        />
                        <span>
                            Visão consolidada da rede com corte rápido por
                            unidade, segmento e forma de pagamento.
                        </span>
                    </li>
                    <li class="flex gap-2">
                        <span
                            class="mt-[7px] h-1.5 w-1.5 rounded-full
                                   bg-[#EA6D0B]"
                        />
                        <span>
                            Destaque automático para a faixa de
                            <strong>30+ dias</strong>, onde a chance de perda é
                            maior.
                        </span>
                    </li>
                    <li class="flex gap-2">
                        <span
                            class="mt-[7px] h-1.5 w-1.5 rounded-full
                                   bg-[#EA6D0B]"
                        />
                        <span>
                            Base pronta para automações de cobrança e
                            renegociação, sem retrabalho de exportar dados.
                        </span>
                    </li>
                </ul>
            </div>

            <!-- PAINEL NO "NAVEGADOR" À DIREITA -->
            <div class="lg:col-span-7">
                <figure
                    class="rounded-[24px] bg-white ring-1 ring-[#E5E7EB] overflow-hidden
                           shadow-[0_18px_40px_rgba(1,13,40,0.08)]"
                >
                    <!-- Barra do navegador -->
                    <div
                        class="flex items-center justify-between bg-[#F3F4F6] px-4 py-2
                               border-b border-[#E5E7EB]"
                    >
                        <div class="flex items-center gap-1.5">
                            <span
                                class="h-2.5 w-2.5 rounded-full bg-[#EF4444]"
                            />
                            <span
                                class="h-2.5 w-2.5 rounded-full bg-[#F59E0B]"
                            />
                            <span
                                class="h-2.5 w-2.5 rounded-full bg-[#10B981]"
                            />
                        </div>
                        <div
                            class="flex-1 mx-4 max-w-[420px] rounded-full border border-[#D1D5DB]
                                   bg-white px-3 py-1.5 text-[11px] text-[#4B5563]"
                        >
                            app.f10.com.br / financeiro /
                            inadimplencia-cursos-livres
                        </div>
                        <div
                            class="hidden md:flex items-center gap-2 text-[10px]"
                        >
                            <span class="text-[#6B7280]">
                                {overdueView.periodLabel}
                            </span>
                        </div>
                    </div>

                    <!-- Conteúdo interno -->
                    <div class="bg-[#F3F4F6]">
                        <!-- Filtros -->
                        <div
                            class="flex flex-wrap items-center gap-3 px-4 py-3 text-[11px]
                                   text-[#4B5563]"
                        >
                            <div class="flex flex-wrap items-center gap-2">
                                <span
                                    class="font-semibold uppercase tracking-[0.16em]
                                           text-[#9CA3AF]"
                                >
                                    Filtros
                                </span>
                                <span
                                    class="inline-flex items-center rounded-full bg-white px-2.5 py-1
                                           border border-[#D1D5DB]"
                                >
                                    {overdueView.filters.scope}
                                </span>
                                <span
                                    class="inline-flex items-center rounded-full bg-white px-2.5 py-1
                                           border border-[#D1D5DB]"
                                >
                                    {overdueView.filters.paymentMethods}
                                </span>
                            </div>
                            <div
                                class="ml-auto hidden sm:flex items-center gap-2"
                            >
                                <span class="text-[#9CA3AF]">
                                    Atualizado a cada fechamento do dia
                                </span>
                            </div>
                        </div>

                        <!-- GRID PRINCIPAL -->
                        <div class="px-4 pb-4">
                            <div class="grid gap-3 lg:grid-cols-3">
                                <!-- KPIs -->
                                <section
                                    class="bg-white rounded-[14px] border border-[#E5E7EB]
                                           lg:col-span-1 flex flex-col"
                                >
                                    <header
                                        class="bg-[#0B2C7A] text-white px-3 py-2 rounded-t-[14px]
                                               flex items-center justify-between"
                                    >
                                        <p class="text-[11px] font-semibold">
                                            Indicadores
                                        </p>
                                        <span class="text-[10px] text-white/80">
                                            Carteira de cursos
                                        </span>
                                    </header>

                                    <div class="px-3 py-3 space-y-3">
                                        {#each overdueView.kpis as kpi}
                                            <div
                                                class="rounded-[10px] border border-[#E5E7EB]
                                                       bg-[#F9FAFB] px-3 py-2"
                                            >
                                                <p
                                                    class="text-[11px] text-[#6B7280]"
                                                >
                                                    {kpi.label}
                                                </p>
                                                <p
                                                    class={`mt-0.5 text-[18px] font-semibold tabular-nums ${kpi.colorClass}`}
                                                >
                                                    {kpi.value}
                                                </p>
                                                {#if kpi.helper}
                                                    <p
                                                        class="mt-0.5 text-[11px]
                                                               text-[#9CA3AF]"
                                                    >
                                                        {kpi.helper}
                                                    </p>
                                                {/if}
                                            </div>
                                        {/each}
                                    </div>
                                </section>

                                <!-- Faixas de atraso + unidades -->
                                <section
                                    class="bg-white rounded-[14px] border border-[#E5E7EB]
                                           lg:col-span-2 flex flex-col"
                                >
                                    <header
                                        class="bg-[#0B2C7A] text-white px-3 py-2 rounded-t-[14px]
                                               flex items-center justify-between"
                                    >
                                        <p class="text-[11px] font-semibold">
                                            Distribuição dos atrasos
                                        </p>
                                        <span class="text-[10px] text-white/80">
                                            Valores em aberto por faixa
                                        </span>
                                    </header>

                                    <div class="px-3 py-3 space-y-3">
                                        <!-- Barras por faixa de atraso -->
                                        <div class="space-y-1.5">
                                            {#each overdueView.buckets as bucket}
                                                <div
                                                    class="flex items-center gap-3 text-[11px]"
                                                >
                                                    <span
                                                        class="w-24 truncate text-[#4B5563]"
                                                    >
                                                        {bucket.label}
                                                    </span>
                                                    <div class="flex-1">
                                                        <div
                                                            class="h-2 w-full bg-[#E5E7EB]"
                                                        >
                                                            <div
                                                                class={`h-2 ${bucket.colorClass}`}
                                                                style={`width: ${bucket.barWidth};`}
                                                            ></div>
                                                        </div>
                                                    </div>
                                                    <span
                                                        class="w-16 text-right text-[#4B5563]"
                                                    >
                                                        {bucket.percent}
                                                    </span>
                                                    <span
                                                        class="w-24 text-right text-[#6B7280]"
                                                    >
                                                        {bucket.amount}
                                                    </span>
                                                </div>
                                            {/each}
                                        </div>

                                        <!-- Tabela por unidade -->
                                        <div
                                            class="pt-2 border-t border-[#E5E7EB]"
                                        >
                                            <p
                                                class="mb-1 text-[11px] font-semibold
                                                       text-[#4B5563]"
                                            >
                                                Visão rápida por unidade
                                            </p>
                                            <div class="overflow-x-auto">
                                                <table
                                                    class="min-w-full border-collapse
                                                           text-[11px] text-left"
                                                >
                                                    <thead>
                                                        <tr
                                                            class="border-b border-[#E5E7EB]
                                                                   bg-[#F9FAFB]"
                                                        >
                                                            <th
                                                                class="py-1.5 pr-3 pl-1 font-semibold
                                                                       text-[#4B5563]"
                                                            >
                                                                Unidade
                                                            </th>
                                                            <th
                                                                class="py-1.5 px-3 font-semibold
                                                                       text-[#4B5563]"
                                                            >
                                                                Segmento
                                                            </th>
                                                            <th
                                                                class="py-1.5 px-3 font-semibold
                                                                       text-right text-[#4B5563]"
                                                            >
                                                                Em dia
                                                            </th>
                                                            <th
                                                                class="py-1.5 px-3 font-semibold
                                                                       text-right text-[#4B5563]"
                                                            >
                                                                Em atraso
                                                            </th>
                                                            <th
                                                                class="py-1.5 pl-3 pr-1 font-semibold
                                                                       text-right text-[#4B5563]"
                                                            >
                                                                % atraso
                                                            </th>
                                                        </tr>
                                                    </thead>
                                                    <tbody>
                                                        {#each overdueView.units as row, i}
                                                            <tr
                                                                class={`border-b border-[#E5E7EB] ${
                                                                    i % 2 === 1
                                                                        ? "bg-[#F9FAFB]"
                                                                        : "bg-white"
                                                                }`}
                                                            >
                                                                <td
                                                                    class="py-1.5 pr-3 pl-1
                                                                           text-[#111827]"
                                                                >
                                                                    {row.unit}
                                                                </td>
                                                                <td
                                                                    class="py-1.5 px-3
                                                                           text-[#4B5563]"
                                                                >
                                                                    {row.segment}
                                                                </td>
                                                                <td
                                                                    class="py-1.5 px-3 text-right
                                                                           text-[#059669]"
                                                                >
                                                                    {row.onTime}
                                                                </td>
                                                                <td
                                                                    class="py-1.5 px-3 text-right
                                                                           text-[#B91C1C]"
                                                                >
                                                                    {row.overdue}
                                                                </td>
                                                                <td
                                                                    class="py-1.5 pl-3 pr-1 text-right
                                                                           text-[#4B5563]"
                                                                >
                                                                    {row.overdueRate}
                                                                </td>
                                                            </tr>
                                                        {/each}
                                                    </tbody>
                                                </table>
                                            </div>
                                        </div>
                                    </div>
                                </section>
                            </div>

                            <p
                                class="mt-2 text-[10px] text-[#9CA3AF] text-right"
                            >
                                Valores fictícios apenas para ilustrar o painel
                                de inadimplência de cursos livres no F10.
                            </p>
                        </div>
                    </div>
                </figure>
            </div>
        </div>
    </div>
</section>

<!-- ===== PERFIS DE USO ===== -->
<section class="relative py-12 md:py-16 bg-[#F3F4FD]">
    <div class="container">
        <div class="max-w-[720px] mx-auto text-center">
            <p
                class="text-[13px] font-semibold tracking-[0.18em]
                       text-[#7E82A2]"
            >
                PARA QUEM GOSTA DE NÚMEROS
            </p>
            <h2
                class="mt-2 text-[26px] md:text-[32px] font-semibold
                       leading-[1.15] text-[#000A57]"
            >
                Perfis de gestores que mais se beneficiam do BI do F10
            </h2>
            <p
                class="mt-3 text-[14px] md:text-[15px] leading-[1.8]
                       text-[#000A57]/80"
            >
                Cada perfil enxerga o que é mais relevante para sua rotina,
                usando a mesma base de dados. Nada de relatórios conflitantes
                entre áreas.
            </p>
        </div>

        <div class="mt-8 grid gap-6 md:grid-cols-3">
            {#each personaViews as persona}
                <article
                    class="rounded-[20px] bg-white px-5 py-5 md:px-6 md:py-6
                           ring-1 ring-[#E5E7EB] flex flex-col h-full"
                >
                    <div class="flex items-center gap-2">
                        <div
                            class="h-8 w-8 rounded-full bg-[#EEF2FF] flex items-center justify-center
                                   text-[#4C5CFF]"
                        >
                            <Users size={18} />
                        </div>
                        <p
                            class="text-[12px] font-semibold tracking-[0.12em]
                                   text-[#6B7280] uppercase"
                        >
                            {persona.role}
                        </p>
                    </div>

                    <h3
                        class="mt-2 text-[16px] md:text-[17px] font-semibold
                               text-[#000A57]"
                    >
                        {persona.title}
                    </h3>

                    <p
                        class="mt-2 text-[13px] md:text-[14px] leading-[1.7]
                               text-[#4B5563]/85"
                    >
                        {persona.description}
                    </p>

                    <ul
                        class="mt-3 space-y-1.5 text-[13px] md:text-[14px]
                               text-[#000A57]/85"
                    >
                        {#each persona.bullets as bullet}
                            <li class="flex gap-2">
                                <span
                                    class="mt-[6px] h-1.5 w-1.5 rounded-full
                                           bg-[#EA6D0B]"
                                />
                                <span>{bullet}</span>
                            </li>
                        {/each}
                    </ul>
                </article>
            {/each}
        </div>
    </div>
</section>

<!-- ===== FAQ INDICADORES & BI ===== -->
<section class="relative py-12 md:py-16 bg-white">
    <div class="container">
        <div
            class="flex flex-col md:flex-row md:items-center md:justify-between gap-6"
        >
            <div>
                <h2
                    class="text-[26px] md:text-[32px] font-semibold leading-tight
                           text-[#000A57]"
                >
                    Perguntas frequentes sobre o
                    <span class="text-[#EA6D0B]">
                        Indicadores &amp; BI F10</span
                    >
                </h2>
                <p
                    class="mt-2 text-[14px] md:text-[15px] text-[#000A57]/80
                           max-w-[520px]"
                >
                    Entenda como os dashboards de BI se conectam aos módulos
                    Comercial, Financeiro, Pedagógico, AVA e aos cursos livres,
                    dando uma visão em tempo quase real da sua escola ou rede.
                </p>
            </div>

            <a
                href="/contato"
                class="hidden md:inline-flex items-center rounded-full border
                       border-[#EA6D0B] px-4 py-2 text-[14px] font-semibold
                       text-[#000A57] hover:bg-[#EA6D0B]/10
                       focus:outline-none focus:ring-2 focus:ring-[#EA6D0B]/40"
            >
                Falar com o time de Indicadores da F10
            </a>
        </div>

        <div class="mt-8">
            <FaqAccordion items={faqIndicatorsItems} />
        </div>

        <div class="mt-6 md:hidden">
            <a
                href="/contato"
                class="inline-flex items-center rounded-full border
                       border-[#EA6D0B] px-4 py-2 text-[14px] font-semibold
                       text-[#000A57] hover:bg-[#EA6D0B]/10
                       focus:outline-none focus:ring-2 focus:ring-[#EA6D0B]/40"
            >
                Falar com o time de Indicadores da F10
            </a>
        </div>
    </div>
</section>

<!-- ===== CTA FINAL ===== -->
<section class="relative py-12 md:py-16 bg-white">
    <div class="container">
        <div class="grid gap-10 lg:grid-cols-12 items-center">
            <div class="lg:col-span-6 flex flex-col gap-5">
                <h2
                    class="text-[#010D28] font-semibold leading-[1.1] tracking-[-0.01em]
                           text-[30px] md:text-[36px]"
                >
                    Leve os números da escola
                    <span class="text-[#7E82A2]">
                        para um nível de gestão mais estratégico
                    </span>
                </h2>

                <p
                    class="text-[#000A57] text-[15px] md:text-[16px]
                           leading-[1.8] max-w-[620px]"
                >
                    Com o módulo de Indicadores e BI integrado ao F10, você
                    substitui planilhas soltas por painéis confiáveis,
                    enxergando matrículas, evasão, inadimplência e aprendizagem
                    em tempo quase real.
                </p>

                <p
                    class="text-[#000A57]/80 text-[14px] md:text-[15px]
                           max-w-[620px]"
                >
                    A mesma base de dados alimenta direção, coordenação e
                    financeiro — cada um com a visão que precisa para tomar boas
                    decisões, sem perder tempo montando relatórios manualmente.
                </p>

                <div class="pt-2">
                    <a
                        href="/contato"
                        class="inline-flex items-center justify-center gap-3 rounded-[999px]
                               bg-[#EA6D0B] px-8 md:px-10 py-4 text-white text-[16px]
                               font-bold transition hover:brightness-110
                               focus:outline-none focus:ring-2 focus:ring-[#EA6D0B]/40"
                    >
                        <span>Agendar apresentação dos indicadores F10</span>
                        <ArrowRight size={24} />
                    </a>
                </div>
            </div>

            <div class="lg:col-span-6">
                <div
                    class="relative h-[260px] sm:h-[300px] md:h-[320px]
               overflow-hidden rounded-[18px] ring-1 ring-black/5
               bg-slate-900 shadow-[0_18px_45px_rgba(1,13,40,0.18)]"
                >
                    <!-- Imagem de fundo -->
                    <img
                        src="/bg_indicadores.webp"
                        alt="Painel de indicadores da escola com gráficos e números em destaque"
                        class="absolute inset-0 h-full w-full object-cover"
                        loading="lazy"
                    />

                    <!-- Cobertura azul sutil -->
                    <div
                        class="absolute inset-0 bg-gradient-to-tr
                   from-[#020A3A]/50 via-[#020A3A]/25 to-[#020A3A]/20"
                    ></div>

                    <!-- (Opcional) leve textura para ficar mais sofisticado -->
                    <div
                        class="pointer-events-none absolute inset-0 opacity-30 mix-blend-soft-light"
                        style="
                background-image: url('/noise.svg');
                background-repeat: repeat;
                background-size: 260px 260px;
            "
                    ></div>

                    <!-- Borda interna suave -->
                    <div
                        class="pointer-events-none absolute inset-0 rounded-[18px]
                   ring-1 ring-inset ring-white/10"
                    ></div>
                </div>
            </div>
        </div>
    </div>
</section>

<style>
    /* Mantido o padrão visual das demais páginas de soluções. */
</style>
