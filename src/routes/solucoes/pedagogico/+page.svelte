<script lang="ts">
    // ===== Imports =====
    import Breadcrumb from "$lib/components/Breadcrumb.svelte";
    import FaqAccordion from "$lib/components/FaqAccordion.svelte";
    import KpiPanel from "$lib/components/KpiPanel.svelte";
    import { contactModalConfig } from "$lib/stores/contactModals";
    import { showForm } from "$lib/stores/formPopup";
    import {
        BookOpen,
        GraduationCap,
        Smartphone,
        CalendarRange,
        ClipboardList,
        BadgeCheck,
        Users,
        Layers,
        ArrowRight,
    } from "lucide-svelte";

    // ===== Tipos =====
    type IconComponent = typeof BookOpen;

    type Pill = {
        label: string;
        description: string;
    };

    type Layer = {
        title: string;
        subtitle: string;
        description: string;
        icon: IconComponent;
        bullets: string[];
    };

    type TimelineStep = {
        phase: string;
        title: string;
        description: string;
        bullets: string[];
    };

    type Feature = {
        title: string;
        description: string;
        icon: IconComponent;
    };

    type FaqItem = {
        question: string;
        answer: string;
    };

    type CapacityStatus = "ok" | "alert" | "full";

    type ClassRow = {
        name: string;
        course: string;
        subjectProgress: number;
        classProgress: number;
        capacity: number;
        capacityStatus: CapacityStatus;
    };

    // ===== Jornada do Aluno – mini tela =====
    type JourneyStageFilter = {
        label: string;
        count: number;
        colorClass: string;
    };

    type JourneyStudentRow = {
        name: string;
        course: string;
        phone: string;
        teacher: string;
    };

    type JourneyGroup = {
        label: string;
        rows: JourneyStudentRow[];
    };

    type ExtraClassActivity = {
        type: string;
        date: string;
        responsible: string;
        room: string;
        capacity: number;
        nonStudents: boolean;
        progress: number;
        start: string;
        end: string;
    };

    type KpiItem = {
        label: string;
        value: string;
        helper?: string;
    };

    const pedagogicalKpis: KpiItem[] = [
        {
            label: "Tempo para montar relatórios pedagógicos",
            value: "-60%",
            helper: "Comparado a planilhas e sistemas separados.",
        },
        {
            label: "Lançamentos de presença feitos em dia",
            value: "85–95%",
            helper: "Quando professores usam pauta e app integrados.",
        },
        {
            label: "Aulas com conteúdo registrado",
            value: "90%+",
            helper: "Histórico do que foi trabalhado em cada encontro.",
        },
    ];

    const extraClassActivities: ExtraClassActivity[] = [
        {
            type: "Oficina Redação 02",
            date: "02/05/2026",
            responsible: "André F10",
            room: "Sala 02",
            capacity: 12,
            nonStudents: true,
            progress: 40,
            start: "04:00",
            end: "10:00",
        },
        {
            type: "Robótica Kids",
            date: "10/05/2026",
            responsible: "Prof. Carla",
            room: "Lab 01",
            capacity: 16,
            nonStudents: false,
            progress: 65,
            start: "14:00",
            end: "16:00",
        },
        {
            type: "Clube de Leitura",
            date: "18/05/2026",
            responsible: "Prof. Paulo",
            room: "Sala 03",
            capacity: 20,
            nonStudents: true,
            progress: 80,
            start: "19:00",
            end: "21:00",
        },
        {
            type: "Oficina de Redação 01",
            date: "25/04/2026",
            responsible: "Ana Souza",
            room: "Sala 01",
            capacity: 15,
            nonStudents: false,
            progress: 55,
            start: "08:00",
            end: "11:00",
        },
        {
            type: "Xadrez Escolar",
            date: "30/04/2026",
            responsible: "Prof. Marcos",
            room: "Sala 05",
            capacity: 18,
            nonStudents: false,
            progress: 30,
            start: "15:00",
            end: "17:00",
        },
        {
            type: "Reforço de Matemática",
            date: "05/05/2026",
            responsible: "Marina Lima",
            room: "Sala 04",
            capacity: 22,
            nonStudents: false,
            progress: 20,
            start: "09:00",
            end: "11:00",
        },
        {
            type: "Cinema com Debate",
            date: "12/05/2026",
            responsible: "Rogério F10",
            room: "Auditório",
            capacity: 40,
            nonStudents: true,
            progress: 50,
            start: "18:30",
            end: "21:30",
        },
        {
            type: "Oficina de Empreendedorismo",
            date: "20/05/2026",
            responsible: "Patrícia N.",
            room: "Sala 06",
            capacity: 25,
            nonStudents: false,
            progress: 10,
            start: "14:00",
            end: "17:00",
        },
        {
            type: "Clube de Conversação Inglês",
            date: "22/05/2026",
            responsible: "Teacher John",
            room: "Sala 08",
            capacity: 12,
            nonStudents: false,
            progress: 70,
            start: "19:00",
            end: "20:30",
        },
        {
            type: "Ensaio Coral",
            date: "28/05/2026",
            responsible: "Maestro Luiz",
            room: "Sala de Música",
            capacity: 30,
            nonStudents: true,
            progress: 35,
            start: "17:00",
            end: "19:00",
        },
    ];

    const journeyGroups: JourneyGroup[] = [
        {
            label: "Boas-vindas",
            rows: [
                {
                    name: "Ana Beatriz Souza",
                    course: "Inglês Básico",
                    phone: "(11) 98563-5333",
                    teacher: "João da Cintra",
                },
                {
                    name: "Gabriel Henrique Lima",
                    course: "Curso Livre F10 (Híbrido)",
                    phone: "(41) 99642-1341",
                    teacher: "Alexandre Silva",
                },
                {
                    name: "Mariana Alves Ribeiro",
                    course: "Informática · Melhor Idade",
                    phone: "(11) 99878-7444",
                    teacher: "Aleks Silva",
                },
            ],
        },
        {
            label: "Início do Curso · Aguardando Início de Turma",
            rows: [
                {
                    name: "José Ricardo da Silva Peres Junior",
                    course: "Curso Livre F10 (Híbrido)",
                    phone: "(11) 98289-0927",
                    teacher: "Ostfágio Gomes",
                },
                {
                    name: "Vinícius Carvalho Braga",
                    course: "Inglês Teen · 1A",
                    phone: "(95) 96581-6516",
                    teacher: "Alexandre Silva",
                },
                {
                    name: "Samara Martins Costa",
                    course: "Curso de Inglês Conversação",
                    phone: "(43) 99811-5766",
                    teacher: "Aleks Silva",
                },
                {
                    name: "Abidane da Cintra",
                    course: "Informática · Melhor Idade",
                    phone: "(81) 99283-1646",
                    teacher: "Nicholas de Gusmão",
                },
                {
                    name: "Jeferson Marques",
                    course: "Inglês Básico · Noturno",
                    phone: "(41) 99839-8027",
                    teacher: "Cesar de Gusmão",
                },
            ],
        },
        {
            label: "Início do Curso · 1 falta",
            rows: [
                {
                    name: "Larissa Oliveira Santos",
                    course: "Curso Livre F10 (100% Presencial)",
                    phone: "(41) 99721-4455",
                    teacher: "Alexandre Silva",
                },
                {
                    name: "Pedro Miguel Fernandes",
                    course: "Inglês Kids · Turma B",
                    phone: "(21) 99788-3201",
                    teacher: "Professor Dahora",
                },
                {
                    name: "Julia Rocha Menezes",
                    course: "Informática Profissionalizante",
                    phone: "(31) 99965-9042",
                    teacher: "Alan Borges Silva",
                },
            ],
        },
    ];

    const classRows: ClassRow[] = [
        {
            name: "Turma A",
            course: "Curso Livre F10 (Híbrido)",
            subjectProgress: 5,
            classProgress: 10,
            capacity: 10,
            capacityStatus: "ok",
        },
        {
            name: "Turma B",
            course: "Curso Livre F10 (Híbrido)",
            subjectProgress: 15,
            classProgress: 25,
            capacity: 10,
            capacityStatus: "ok",
        },
        {
            name: "Turma C",
            course: "Curso Livre F10 (Híbrido)",
            subjectProgress: 28,
            classProgress: 38,
            capacity: 10,
            capacityStatus: "ok",
        },
        {
            name: "Turma D",
            course: "English Kids",
            subjectProgress: 40,
            classProgress: 52,
            capacity: 40,
            capacityStatus: "ok",
        },
        {
            name: "Turma E",
            course: "Gestão Administrativa",
            subjectProgress: 55,
            classProgress: 65,
            capacity: 20,
            capacityStatus: "full",
        },
        {
            name: "Turma F",
            course: "English Kids",
            subjectProgress: 72,
            classProgress: 82,
            capacity: 42,
            capacityStatus: "alert",
        },
        {
            name: "Turma G",
            course: "ADM - Assistente Administrativo",
            subjectProgress: 88,
            classProgress: 96,
            capacity: 40,
            capacityStatus: "ok",
        },
    ];

    // ===== Pílulas principais (o que o módulo cobre) =====
    const corePills: Pill[] = [
        {
            label: "Secretaria",
            description:
                "Matrículas, documentos obrigatórios, contratos ligados às turmas e cursos.",
        },
        {
            label: "Pedagógico",
            description:
                "Conteúdo programático, frequência, avaliações, reposições e certificados.",
        },
        {
            label: "Experiência do aluno",
            description:
                "Portal, aplicativo, conteúdos digitais e jornada de aprendizagem.",
        },
    ];

    // ===== Camadas do pedagógico F10 =====
    const layers: Layer[] = [
        {
            title: "Secretaria e matrículas",
            subtitle: "Base acadêmica bem construída",
            description:
                "Cursos, planos, documentos obrigatórios, turmas e contratos conversando entre si. A matrícula já nasce pronta para a rotina pedagógica.",
            icon: Users,
            bullets: [
                "Criação de cursos com planos e regras de matrícula",
                "Documentos obrigatórios por curso e tipo de contrato",
                "Clones de turmas para novas entradas de forma rápida",
            ],
        },
        {
            title: "Pedagógico e conteúdos",
            subtitle: "Rotina de aula estruturada",
            description:
                "Matérias, conteúdo programático, pauta de chamada, reposições e jornada do aluno em um fluxo único para coordenação e professores.",
            icon: BookOpen,
            bullets: [
                "Conteúdo programático por curso, módulo e matéria",
                "Pauta de chamada manual ou automatizada (online)",
                "Reposição de aulas a partir das faltas registradas",
            ],
        },
        {
            title: "Smart, digital e EAD",
            subtitle: "Aprendizagem além da sala física",
            description:
                "Portal, aplicativo do aluno, videoaulas, materiais digitais e controle de quem realmente consome o que é publicado.",
            icon: Smartphone,
            bullets: [
                "Publicação de conteúdos digitais e tarefas",
                "Histórico de consumo de conteúdos no App/Portal",
                "Emissão de certificados personalizados ao final",
            ],
        },
    ];

    // ===== Linha do tempo: antes, durante e depois da aula =====
    const timelineSteps: TimelineStep[] = [
        {
            phase: "ANTES DA AULA",
            title: "Planejamento de cursos, turmas e materiais",
            description:
                "A coordenação organiza tudo antes do aluno entrar em sala: cursos, turmas, professores, conteúdos e regras de presença.",
            bullets: [
                "Criação de cursos com módulos e matérias",
                "Configuração de conteúdo programático por turma",
                "Definição de critérios de frequência e nota de corte",
            ],
        },
        {
            phase: "DURANTE A AULA",
            title: "Chamada, conteúdo e participação do aluno",
            description:
                "Na hora da aula, o F10 registra presença, conteúdo ministrado e interação com materiais digitais.",
            bullets: [
                "Pauta de chamada com presença automatizada",
                "Registro de conteúdos trabalhados em cada encontro",
                "Integração com aulas online e conteúdos EAD",
            ],
        },
        {
            phase: "DEPOIS DA AULA",
            title: "Jornada do aluno, reforço e conclusão",
            description:
                "Após cada encontro, o sistema alimenta a jornada do aluno, indicando quem está fora do ciclo ideal e quem já pode avançar.",
            bullets: [
                "Relatório de Jornada do Aluno com exceções",
                "Histórico de conteúdos consumidos pelo App/Portal",
                "Controle de aptos a certificado e emissão centralizada",
            ],
        },
    ];

    // ===== Recursos práticos =====
    const features: Feature[] = [
        {
            title: "Controle completo de turmas",
            description:
                "Turmas presenciais, online ou híbridas, com horários, professores, capacidade, situação e regras de entrada.",
            icon: CalendarRange,
        },
        {
            title: "Conteúdo programático vivo",
            description:
                "Matérias, aulas, conteúdos e materiais didáticos vinculados ao curso para acompanhar o que foi realmente trabalhado.",
            icon: BookOpen,
        },
        {
            title: "Cursos com módulos e trilhas",
            description:
                "Estruture trilhas com módulos e agrupamentos, conectando carga horária, avaliações e certificação final.",
            icon: Layers,
        },
        {
            title: "Presença e reposições",
            description:
                "Pauta de chamada otimizada, registro de faltas e reposição de aulas a partir das ausências lançadas.",
            icon: ClipboardList,
        },
        {
            title: "EAD, App e Portal do Aluno",
            description:
                "Publicação de conteúdos digitais, videoaulas e atividades, com histórico de acesso e engajamento.",
            icon: Smartphone,
        },
        {
            title: "Certificados personalizados",
            description:
                "Definição de critérios para aptidão, modelos de certificado por curso e controle de impressão/entrega.",
            icon: BadgeCheck,
        },
    ];

    // ===== FAQ =====
    const faqItems: FaqItem[] = [
        {
            question:
                "O que diferencia o módulo Pedagógico do F10 de um simples diário de classe?",
            answer: "Além da pauta de chamada, o módulo Pedagógico organiza cursos, turmas, conteúdo programático, jornada do aluno, EAD e certificados, tudo integrado à secretaria, ao financeiro e ao aplicativo do aluno.",
        },
        {
            question:
                "Consigo acompanhar quais conteúdos o aluno consumiu no App/Portal?",
            answer: "Sim. O F10 registra o histórico de conteúdos acessados no Portal e no App, permitindo que o pedagógico identifique quem está engajado e quem precisa de reforço.",
        },
        {
            question:
                "É possível trabalhar com ensino presencial, híbrido e totalmente online?",
            answer: "É possível. Você pode ter turmas presenciais, híbridas ou 100% online, com controle de frequência, conteúdos digitais, jornada do aluno e certificação.",
        },
        {
            question: "Como funciona a Jornada do Aluno no F10?",
            answer: "A Jornada do Aluno mostra quem está fora do ciclo natural do curso (trancados, faltosos, afastados, concluídos etc.) sem necessidade de filtros manuais, facilitando decisões pedagógicas.",
        },
        {
            question: "Os certificados são gerados dentro do sistema?",
            answer: "Sim. O F10 controla quem está apto, gera certificados personalizados, registra impressão e entrega, e atualiza automaticamente o status do contrato do aluno.",
        },
    ];

    function openPedagogyModal() {
        contactModalConfig.set({
            defaultMessage:
                "Quero agendar uma demonstração do aplicativo Pedagógico",
            product: "F10 – Pedagógico",
            subSource: "Modal Pedagógico – dobra 1",
            leadDescription: "Contato iniciado pelo formulário do Pedagógico.",
        });

        showForm.set(true);
    }
    function openPedagogyPresentationModal() {
        contactModalConfig.set({
            defaultMessage:
                "Quero agendar uma demonstração do aplicativo Pedagógico",
            product: "F10 – Pedagógico",
            subSource: "Modal Pedagógico – Final da página",
            leadDescription: "Contato iniciado pelo formulário do Pedagógico.",
        });

        showForm.set(true);
    }
</script>

<svelte:head>
    <title>Pedagógico, Secretaria e Jornada do Aluno | F10 Software</title>
    <meta
        name="description"
        content="Organize cursos, turmas, matrículas, conteúdos digitais, frequência, jornada do aluno e certificados em um único módulo pedagógico integrado ao App e ao Portal do Aluno."
    />
    <link rel="canonical" href="https://f10.com.br/solucoes/pedagogico" />
</svelte:head>

<!-- ===== HERO REESTRUTURADO ===== -->
<section class="relative isolate overflow-hidden bg-white/60 pb-24">
    <div class="pt-4">
        <Breadcrumb
            baseUrl="https://f10.com.br"
            items={[
                { label: "HOME", href: "/" },
                { label: "SOLUÇÕES", href: "/solucoes" },
                { label: "PEDAGÓGICO" },
            ]}
        />
    </div>

    <div class="container">
        <div class="grid gap-10 lg:grid-cols-12 lg:items-center">
            <!-- COL ESQUERDA: HERO ENXUTO -->
            <div class="lg:col-span-6 space-y-6">
                <!-- Subtítulo pequeno -->
                <p
                    class="text-[12px] font-semibold text-[#7E82A2]
                           tracking-[0.22em] uppercase"
                >
                    MÓDULO PEDAGÓGICO F10
                </p>

                <!-- H1 forte -->
                <h1
                    class="text-[#010D28] tracking-[-0.03em] leading-[1.08]
                           text-[32px] sm:text-[40px] md:text-[46px] font-semibold"
                >
                    Organize cursos, turmas e certificados em uma única jornada
                    acadêmica
                </h1>

                <!-- Texto explicativo -->
                <p
                    class="text-[15px] md:text-[17px] leading-[1.9]
                           text-[#000A57]/82 max-w-xl"
                >
                    O F10 conecta secretaria, pedagógico, EAD e aplicativo do
                    aluno: da matrícula ao certificado, você acompanha presença,
                    conteúdos digitais e Jornada do Aluno sem planilhas
                    paralelas ou sistemas separados.
                </p>

                <!-- CTA principal -->
                <div class="pt-1">
                    <button
                        type="button"
                        on:click={openPedagogyModal}
                        class="inline-flex items-center justify-center gap-3
                               rounded-full bg-[#EA6D0B] px-7 md:px-9 py-3
                               text-[14px] md:text-[15px] font-semibold text-white
                               shadow-[0_14px_40px_rgba(234,109,11,0.45)]
                               hover:brightness-110 focus:outline-none
                               focus:ring-2 focus:ring-[#EA6D0B]/60"
                    >
                        <span>Agendar apresentação</span>
                        <ArrowRight size={18} />
                    </button>
                </div>
            </div>

            <!-- COL DIREITA: MOCK DE INTERFACE -->
            <div class="lg:col-span-6 mt-6 lg:mt-0">
                <div class="relative flex justify-center lg:justify-end">
                    <div class="relative w-full max-w-[640px]">
                        <!-- JANELA PRINCIPAL -->
                        <div
                            class="relative z-10 rounded-[26px] bg-white border border-slate-200
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
                                        <span
                                            class="font-semibold text-slate-800"
                                        >
                                            Meu F10
                                        </span>
                                        <span>Cadastros</span>
                                        <span>Comercial</span>
                                        <span
                                            class="font-semibold text-primary"
                                        >
                                            Pedagógico
                                        </span>
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

                            <!-- ABAS -->
                            <div class="px-4 pt-3 pb-1">
                                <div
                                    class="inline-flex items-center gap-2 rounded-t-xl bg-slate-100
                                           px-3 py-1.5 text-[12px] font-semibold text-slate-700
                                           border border-b-0 border-slate-200"
                                >
                                    <span
                                        class="inline-flex h-4 w-4 items-center justify-center rounded-full bg-primary/10"
                                    >
                                        <span
                                            class="h-2 w-2 bg-primary rounded-[3px]"
                                        ></span>
                                    </span>
                                    <span>Turmas</span>
                                </div>
                            </div>

                            <!-- CABEÇALHO DAS COLUNAS -->
                            <div class="px-4 pb-3">
                                <div
                                    class="grid grid-cols-[0.8fr,1.5fr,1.2fr,1.2fr,0.7fr]
                                           text-[11px] font-semibold text-slate-600
                                           bg-slate-100 rounded-xl px-3 py-2 border border-slate-200"
                                >
                                    <span>Turma</span>
                                    <span>Curso</span>
                                    <span>Aulas na Matéria</span>
                                    <span>Aulas na Turma</span>
                                    <span>Capacidade</span>
                                </div>
                            </div>

                            <!-- LINHAS DE TURMAS -->
                            <div class="px-4 pb-4">
                                <div
                                    class="rounded-[18px] border border-slate-200 bg-slate-50 overflow-hidden"
                                >
                                    {#each classRows as row, ri}
                                        <div
                                            class={`grid grid-cols-[0.8fr,1.5fr,1.2fr,1.2fr,0.7fr]
                                                    px-3 py-2 text-[12px]
                                                    ${
                                                        ri % 2 === 0
                                                            ? "bg-white"
                                                            : "bg-slate-50/80"
                                                    }`}
                                        >
                                            <!-- Turma -->
                                            <div
                                                class="truncate text-slate-800"
                                            >
                                                {row.name}
                                            </div>

                                            <!-- Curso -->
                                            <div
                                                class="truncate text-slate-700"
                                            >
                                                {row.course}
                                            </div>

                                            <!-- Aulas na Matéria -->
                                            <div
                                                class="flex items-center gap-2 justify-center"
                                            >
                                                <div
                                                    class="flex-1 h-full ml-2 bg-slate-100 overflow-hidden"
                                                >
                                                    <div
                                                        class="h-full bg-[#2563EB]"
                                                        style={`width: ${Math.min(
                                                            row.subjectProgress,
                                                            100,
                                                        )}%;`}
                                                    ></div>
                                                </div>
                                                <span
                                                    class="text-[11px] text-slate-600 tabular-nums"
                                                >
                                                    {row.subjectProgress}%
                                                </span>
                                            </div>

                                            <!-- Aulas na Turma -->
                                            <div
                                                class="flex items-center gap-2 justify-center"
                                            >
                                                <div
                                                    class="flex-1 h-full ml-2 bg-slate-100 overflow-hidden"
                                                >
                                                    <div
                                                        class="h-full bg-primary"
                                                        style={`width: ${Math.min(
                                                            row.classProgress,
                                                            100,
                                                        )}%;`}
                                                    ></div>
                                                </div>
                                                <span
                                                    class="text-[11px] text-slate-600 tabular-nums"
                                                >
                                                    {row.classProgress}%
                                                </span>
                                            </div>

                                            <!-- Capacidade -->
                                            <div
                                                class="flex flex-col items-center gap-1"
                                            >
                                                <span
                                                    class="text-[11px] text-slate-700 tabular-nums"
                                                >
                                                    {row.capacity} alunos
                                                </span>
                                            </div>
                                        </div>
                                    {/each}
                                </div>

                                <!-- barra de status -->
                                <div
                                    class="mt-2 text-[10px] text-slate-500 flex items-center justify-between"
                                >
                                    <span>
                                        Turmas não concluídas ou concluídas
                                        desde{" "}
                                        <span class="font-medium">01/08/25</span
                                        >
                                    </span>
                                    <span class="hidden sm:inline">
                                        {classRows.length} registros · filtro “Turmas
                                        em andamento”
                                    </span>
                                </div>
                            </div>
                        </div>

                        <!-- MOCKUP DO CELULAR SOBRE A MINI TELA (CANTO INFERIOR DIREITO) -->
                        <div
                            class="pointer-events-none absolute top-[120px] -right-24 hidden md:block z-20"
                            aria-hidden="true"
                        >
                            <img
                                src="/app_pauta_de_chamada.webp"
                                alt="App de pauta de chamada do F10 no celular"
                                class="w-32 md:w-40 lg:w-80"
                                loading="lazy"
                            />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>
</section>

<!-- ===== CAMADAS DO PEDAGÓGICO ===== -->
<section class="relative py-12 md:py-16 bg-[#F3F4FD]">
    <div class="container px-5 md:px-8 lg:px-20">
        <div
            class="flex flex-col gap-4 md:flex-row md:items-end md:justify-between"
        >
            <div class="max-w-[560px]">
                <p
                    class="text-[13px] font-semibold tracking-[0.18em]
                           text-[#7E82A2]"
                >
                    COMO O PEDAGÓGICO SE ORGANIZA NO F10
                </p>
                <h2
                    class="mt-2 text-[28px] md:text-[34px] font-semibold
                           leading-[1.15] text-[#000A57]"
                >
                    Três camadas para enxergar o aluno por inteiro
                </h2>
                <p
                    class="mt-3 text-[15px] md:text-[16px] leading-[1.8]
                           text-[#000A57]/80"
                >
                    Em vez de separar secretaria, pedagógico e digital em
                    sistemas diferentes, o F10 organiza tudo em camadas que se
                    conversam naturalmente.
                </p>
            </div>
        </div>

        <div class="mt-8 grid gap-6 md:grid-cols-3">
            {#each layers as layer}
                <article
                    class="rounded-[22px] bg-white px-5 py-6 md:px-6 md:py-7
                           ring-1 ring-[#E5E7EB] flex flex-col gap-3"
                >
                    <div class="flex items-center gap-3">
                        <div
                            class="h-10 w-10 rounded-full bg-[#EFF0FF]
                                   flex items-center justify-center text-[#4C5CFF]"
                        >
                            <svelte:component this={layer.icon} size={20} />
                        </div>
                        <div>
                            <h3
                                class="text-[16px] md:text-[17px] font-semibold
                                       text-[#000A57]"
                            >
                                {layer.title}
                            </h3>
                            <p
                                class="text-[12px] text-[#7E82A2] font-medium uppercase tracking-[0.12em]"
                            >
                                {layer.subtitle}
                            </p>
                        </div>
                    </div>
                    <p
                        class="text-[14px] md:text-[15px] leading-[1.7]
                               text-[#000A57]/80"
                    >
                        {layer.description}
                    </p>
                    <ul
                        class="mt-1 space-y-1.5 text-[13px] md:text-[14px]
                               text-[#000A57]/80"
                    >
                        {#each layer.bullets as bullet}
                            <li class="flex gap-2">
                                <span
                                    class="mt-[6px] h-1.5 w-1.5 rounded-full bg-[#EA6D0B]"
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

<!-- ===== LINHA DO TEMPO: ANTES, DURANTE, DEPOIS DA AULA ===== -->
<section class="relative py-12 md:py-16 bg-white">
    <div class="container px-5 md:px-8 lg:px-20">
        <div class="grid gap-10 lg:grid-cols-12 items-start">
            <div class="lg:col-span-5">
                <p
                    class="text-[13px] font-semibold tracking-[0.18em]
                           text-[#7E82A2]"
                >
                    ROTINA PEDAGÓGICA NO DIA A DIA
                </p>
                <h2
                    class="mt-2 text-[26px] md:text-[32px] font-semibold
                           leading-[1.15] text-[#000A57]"
                >
                    Antes, durante e depois da aula em um único fluxo
                </h2>
                <p
                    class="mt-3 text-[15px] md:text-[16px] leading-[1.8]
                           text-[#000A57]/80"
                >
                    Não é só registrar presença. O módulo pedagógico acompanha o
                    que foi planejado, ministrado e consolidado na jornada do
                    aluno.
                </p>

                <div class="mt-6">
                    <a
                        href="/contato"
                        class="inline-flex items-center gap-2 rounded-full
                               bg-[#EA6D0B] px-6 py-2.5 text-[14px] md:text-[15px]
                               font-semibold text-white hover:brightness-110
                               focus:outline-none focus:ring-2 focus:ring-[#EA6D0B]/40"
                    >
                        <span>Ver exemplo da jornada na prática</span>
                        <ArrowRight size={18} />
                    </a>
                </div>
            </div>

            <div class="lg:col-span-7">
                <div class="relative pl-6 md:pl-8 space-y-6">
                    {#each timelineSteps as step, i}
                        <article
                            class="relative rounded-[18px] bg-[#F9FAFB] px-4 py-4 md:px-5 md:py-5"
                        >
                            <div
                                class="absolute left-[-26px] top-[14px] h-3 w-3 rounded-full
                                       border-2 border-white bg-primary shadow-md"
                            ></div>
                            <p
                                class="text-[11px] md:text-[12px] tracking-[0.18em]
                                       text-[#9CA3AF] font-semibold"
                            >
                                {step.phase}
                            </p>
                            <h3
                                class="mt-1 text-[16px] md:text-[18px] font-semibold
                                       text-[#000A57]"
                            >
                                {step.title}
                            </h3>
                            <p
                                class="mt-1 text-[13px] md:text-[14px] leading-[1.7]
                                       text-[#4B5563]/85"
                            >
                                {step.description}
                            </p>
                            <ul
                                class="mt-2 space-y-1.5 text-[13px] md:text-[14px]
                                       text-[#000A57]/80"
                            >
                                {#each step.bullets as bullet}
                                    <li class="flex gap-2">
                                        <span
                                            class="mt-[6px] h-1.5 w-1.5 rounded-full bg-[#000A57]"
                                        />
                                        <span>{bullet}</span>
                                    </li>
                                {/each}
                            </ul>

                            {#if i < timelineSteps.length - 1}
                                <div
                                    class="absolute left-[-20px] top-[26px] bottom-[-18px]
                                           border-l border-dashed border-[#E5E7EB]"
                                ></div>
                            {/if}
                        </article>
                    {/each}
                </div>
            </div>
        </div>
    </div>
</section>

<!-- ===== RECURSOS PRÁTICOS ===== -->
<section class="relative py-12 md:py-16 bg-[#F3F4FD]">
    <div class="container px-5 md:px-8 lg:px-20">
        <div class="max-w-[720px]">
            <p
                class="text-[13px] font-semibold tracking-[0.18em]
                       text-[#7E82A2]"
            >
                RECURSOS PEDAGÓGICOS NA PRÁTICA
            </p>
            <h2
                class="mt-2 text-[28px] md:text-[34px] font-semibold
                       leading-[1.15] text-[#000A57]"
            >
                Do cadastro do curso à impressão do certificado
            </h2>
            <p
                class="mt-3 text-[15px] md:text-[16px] leading-[1.8]
                       text-[#000A57]/80"
            >
                Os recursos abaixo já existem hoje em escolas que usam o F10:
                controle de estoque de materiais didáticos, clones de turmas,
                documentos obrigatórios, pauta automática, jornada do aluno, EAD
                e certificados personalizados.
            </p>
        </div>

        <div class="mt-8 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {#each features as feature}
                <article
                    class="rounded-[20px] bg-white px-5 py-6 md:px-6 md:py-7
                           ring-1 ring-[#E5E7EB] flex flex-col gap-3"
                >
                    <div
                        class="h-10 w-10 rounded-full bg-[#F3F4FD]
                               flex items-center justify-center text-[#000A57]"
                    >
                        <svelte:component this={feature.icon} size={20} />
                    </div>
                    <h3
                        class="text-[16px] md:text-[17px] font-semibold
                               text-[#000A57]"
                    >
                        {feature.title}
                    </h3>
                    <p
                        class="text-[13px] md:text-[14px] leading-[1.7]
                               text-[#000A57]/80"
                    >
                        {feature.description}
                    </p>
                </article>
            {/each}
        </div>
    </div>
</section>

<!-- ===== APLICATIVO DO PROFESSOR – SMART ESCOLA ===== -->
<section class="relative py-12 md:py-16 bg-white">
    <div class="container px-5 md:px-8 lg:px-20">
        <div class="grid gap-10 lg:grid-cols-12 lg:items-center">
            <!-- TEXTO / BENEFÍCIOS -->
            <div class="lg:col-span-6 space-y-5">
                <p
                    class="text-[13px] font-semibold tracking-[0.18em]
                           text-[#7E82A2] uppercase"
                >
                    APP DO PROFESSOR · SMART ESCOLA
                </p>

                <h2
                    class="text-[28px] md:text-[34px] font-semibold
                           leading-[1.15] text-[#000A57]"
                >
                    Pauta, conteúdos e avisos na palma da mão do professor
                </h2>

                <p
                    class="text-[15px] md:text-[16px] leading-[1.8]
                           text-[#000A57]/82 max-w-xl"
                >
                    O aplicativo do professor Smart Escola tira o peso da rotina
                    de sala: presença, conteúdos, atividades e registros do dia
                    a dia ficam conectados ao F10 em tempo real — sem depender
                    de planilha, diário em papel ou computador da secretaria.
                </p>

                <!-- Bullets de fluxo do professor -->
                <div class="space-y-3">
                    <div class="flex gap-3">
                        <div
                            class="mt-1 h-5 w-5 rounded-full bg-[#F3F4FD]
                                   flex items-center justify-center"
                        >
                            <span class="h-2 w-2 rounded-full bg-[#EA6D0B]" />
                        </div>
                        <div>
                            <p class="text-[13px] font-semibold text-[#000A57]">
                                Pauta de chamada direto do celular
                            </p>
                            <p class="text-[13px] text-[#000A57]/80">
                                Professores registram presença, atrasos e saídas
                                antecipadas sem depender do computador da
                                escola.
                            </p>
                        </div>
                    </div>

                    <div class="flex gap-3">
                        <div
                            class="mt-1 h-5 w-5 rounded-full bg-[#F3F4FD]
                                   flex items-center justify-center"
                        >
                            <span class="h-2 w-2 rounded-full bg-[#4F46E5]" />
                        </div>
                        <div>
                            <p class="text-[13px] font-semibold text-[#000A57]">
                                Conteúdos e atividades sincronizados com o AVA
                            </p>
                            <p class="text-[13px] text-[#000A57]/80">
                                Lançamento de conteúdos e atividades que
                                alimentam o portal/App do aluno e a pauta
                                automática das aulas online.
                            </p>
                        </div>
                    </div>

                    <div class="flex gap-3">
                        <div
                            class="mt-1 h-5 w-5 rounded-full bg-[#F3F4FD]
                                   flex items-center justify-center"
                        >
                            <span class="h-2 w-2 rounded-full bg-[#16A34A]" />
                        </div>
                        <div>
                            <p class="text-[13px] font-semibold text-[#000A57]">
                                Comunicação rápida com coordenação e alunos
                            </p>
                            <p class="text-[13px] text-[#000A57]/80">
                                Avisos, tarefas e registros pedagógicos ficam
                                alinhados com a coordenação, evitando ruídos e
                                retrabalho.
                            </p>
                        </div>
                    </div>
                </div>

                <!-- Mini cards de recursos do app do professor -->
                <div class="mt-5 grid gap-3 sm:grid-cols-2 max-w-xl">
                    <article
                        class="rounded-2xl border border-[#E5E7EB] bg-[#F9FAFB]
                               px-3.5 py-3.5 md:px-4 md:py-4"
                    >
                        <div
                            class="mb-2 h-8 w-8 rounded-full bg-[#EFF0FF]
                                   flex items-center justify-center text-[#4C5CFF]"
                        >
                            <Smartphone size={16} />
                        </div>
                        <p
                            class="text-[13px] font-semibold text-[#000A57]
                                   mb-0.5"
                        >
                            Tudo no celular do professor
                        </p>
                        <p
                            class="text-[13px] md:text-[14px] leading-[1.6]
                                   text-[#000A57]/82"
                        >
                            Acesso às turmas do dia, pauta, conteúdos e lista de
                            alunos sem precisar abrir o F10 no computador.
                        </p>
                    </article>

                    <article
                        class="rounded-2xl border border-[#E5E7EB] bg-[#F9FAFB]
                               px-3.5 py-3.5 md:px-4 md:py-4"
                    >
                        <div
                            class="mb-2 h-8 w-8 rounded-full bg-[#ECFDF3]
                                   flex items-center justify-center text-[#16A34A]"
                        >
                            <ClipboardList size={16} />
                        </div>
                        <p
                            class="text-[13px] font-semibold text-[#000A57]
                                   mb-0.5"
                        >
                            Pauta automática integrada
                        </p>
                        <p
                            class="text-[13px] md:text-[14px] leading-[1.6]
                                   text-[#000A57]/82"
                        >
                            Aulas online e videoaulas registram presença
                            automaticamente na pauta, sem o professor ter que
                            refazer lançamento.
                        </p>
                    </article>
                </div>
            </div>

            <!-- MOCKUP DO APP DO PROFESSOR / MINI TELA -->

            <div class="lg:col-span-6 flex justify-end">
                <div class="relative w-full max-w-[690px]">
                    <!-- FUNDO CINZA ROTACIONADO -->
                    <div
                        class="pointer-events-none absolute inset-0 rounded-[32px]
             bg-[#F3F4F6]/50 rotate-[-10deg]"
                        aria-hidden="true"
                    ></div>

                    <figure
                        class="relative mx-auto rounded-[24px] overflow-hidden
             shadow-[0_18px_40px_rgba(1,13,40,0.12)]
             bg-[#020617] ring-1 ring-black/5"
                    >
                        <!-- NOISE DE FUNDO BEM SUTIL -->
                        <div
                            class="pointer-events-none absolute inset-0 opacity-[0.10] mix-blend-overlay
               bg-[url('/noise.svg')] bg-repeat [background-size:250px_250px]"
                            aria-hidden="true"
                        ></div>

                        <!-- CONTEÚDO DA “JANELA” -->
                        <div class="relative flex flex-col">
                            <!-- BARRA SUPERIOR ESTILO SAFARI -->
                            <div
                                class="relative flex items-center justify-center
                 px-4 md:px-6 pt-3 pb-2
                 bg-gradient-to-b from-[#020A24] via-[#020A24] to-[#020617]
                 border-b border-white/10"
                            >
                                <!-- bolinhas estilo macOS (ESQUERDA) -->
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

                                <!-- BARRA DE ENDEREÇO CENTRALIZADA -->
                                <div
                                    class="flex items-center justify-center
                   px-4 md:px-6 py-1.5
                   rounded-full bg-[#020817] border border-white/15
                   text-[11px] md:text-[12px] text-white/80 tracking-tight
                   shadow-[0_0_0_1px_rgba(15,23,42,0.3)]
                   max-w-[260px] md:max-w-[320px]"
                                >
                                    <span class="truncate">
                                        app.f10.com.br • Ambiente virtual do
                                        aluno
                                    </span>
                                </div>
                            </div>

                            <!-- ÁREA DA TELA / PRINT DO SISTEMA -->
                            <div class="relative bg-white">
                                <img
                                    src="/pauta_de_chamada_f10_ava.webp"
                                    alt="Pauta de chamada e acompanhamento de alunos no AVA F10."
                                    class="w-full h-auto object-cover"
                                    loading="lazy"
                                />
                            </div>
                        </div>
                    </figure>
                </div>
                <!-- MOCKUP DO CELULAR SOBRE A MINI TELA (PROFESSOR) -->
                <div
                    class="pointer-events-none absolute bottom-[-24px] lg:left-[47%] hidden md:block z-20"
                    aria-hidden="true"
                >
                    <img
                        src="/app_pauta_de_chamada.webp"
                        alt="App do professor Smart Escola exibindo pauta de chamada"
                        class="w-32 md:w-40 lg:w-80"
                        loading="lazy"
                    />
                </div>
            </div>
        </div>
    </div>
</section>

<!-- ===== JORNADA DO ALUNO NO F10 ===== -->
<section class="relative py-12 md:py-16 bg-white">
    <div class="container px-5 md:px-8 lg:px-20">
        <div class="grid gap-10 lg:grid-cols-12 lg:items-center">
            <!-- COL DIREITA: MINI TELA JORNADA DO ALUNO -->
            <div class="lg:col-span-6">
                <div
                    class="relative flex justify-center lg:justify-end mt-6 lg:mt-0"
                >
                    <!-- glow de fundo -->
                    <div
                        class="pointer-events-none absolute -top-10 -left-8 h-40 w-40 rounded-full
                               bg-[#4F46E5]/8 blur-3xl"
                        aria-hidden="true"
                    ></div>

                    <div class="relative w-full max-w-[620px]">
                        <div
                            class="relative z-10 rounded-[26px] bg-white border border-slate-200
                                   shadow-[0_22px_60px_rgba(15,23,42,0.22)] overflow-hidden"
                        >
                            <!-- topo tipo sistema -->
                            <div
                                class="flex items-center justify-between px-4 pt-3 pb-2
                                       border-b border-slate-200 bg-slate-50"
                            >
                                <div class="flex items-center gap-3">
                                    <div
                                        class="hidden sm:flex items-center gap-3 text-[11px] text-slate-600"
                                    >
                                        <span
                                            class="font-semibold text-slate-800"
                                        >
                                            Meu F10
                                        </span>
                                        <span>Cadastros</span>
                                        <span>Comercial</span>
                                        <span
                                            class="font-semibold text-primary"
                                        >
                                            Pedagógico
                                        </span>
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

                            <!-- barra de filtros (Estágio / Categoria) -->
                            <div
                                class="px-4 pt-3 pb-2 flex items-center justify-between gap-3"
                            >
                                <div
                                    class="flex items-center gap-2 text-[11px]"
                                >
                                    <div
                                        class="inline-flex items-center gap-1.5 rounded-full
                                               border border-slate-200 bg-slate-50 px-2.5 py-1"
                                    >
                                        <span class="text-slate-500">
                                            Estágio:
                                        </span>
                                        <span
                                            class="font-semibold text-slate-800"
                                        >
                                            Início do Curso
                                        </span>
                                        <span
                                            class="text-slate-400 text-[10px]"
                                        >
                                            ▾
                                        </span>
                                    </div>
                                    <div
                                        class="hidden sm:inline-flex items-center gap-1.5 rounded-full
                                               border border-slate-200 bg-slate-50 px-2.5 py-1"
                                    >
                                        <span class="text-slate-500">
                                            Categoria:
                                        </span>
                                        <span
                                            class="font-semibold text-slate-800"
                                        >
                                            Aguardando início
                                        </span>
                                        <span
                                            class="text-slate-400 text-[10px]"
                                        >
                                            ▾
                                        </span>
                                    </div>
                                </div>

                                <p
                                    class="hidden md:inline text-[11px] text-slate-500"
                                >
                                    0/538 registros · filtro Jornada do Aluno
                                </p>
                            </div>

                            <!-- cabeçalho da grade -->
                            <div class="px-4 pb-3">
                                <div
                                    class="grid grid-cols-[1.6fr,1.6fr,1.3fr,1.3fr]
                                           text-[11px] font-semibold text-slate-600
                                           bg-slate-100 rounded-xl px-3 py-2 border border-slate-200"
                                >
                                    <span>Nome</span>
                                    <span>Pedagógico · Curso</span>
                                    <span>Celular</span>
                                    <span>Pedagógico · Professor</span>
                                </div>
                            </div>

                            <!-- LISTA DE ALUNOS -->
                            <div class="px-4 pb-4">
                                <div
                                    class="mt-1 rounded-[18px] border border-slate-200
                                           bg-slate-50 overflow-hidden"
                                >
                                    {#each journeyGroups as group}
                                        <!-- título do agrupamento -->
                                        <div
                                            class="bg-slate-100/80 px-3 py-1.5 text-[11px] font-semibold
                                                   text-slate-600 border-b border-slate-200"
                                        >
                                            {group.label}
                                        </div>

                                        <!-- linhas do grupo -->
                                        {#each group.rows as row, ri}
                                            <div
                                                class={`grid grid-cols-[1.6fr,1.6fr,1.3fr,1.3fr]
                                                        px-3 py-1.5 text-[12px]
                                                        ${
                                                            ri % 2 === 0
                                                                ? "bg-white"
                                                                : "bg-slate-50/80"
                                                        }`}
                                            >
                                                <!-- Nome -->
                                                <div
                                                    class="truncate text-slate-800"
                                                >
                                                    {row.name}
                                                </div>

                                                <!-- Curso -->
                                                <div
                                                    class="truncate text-slate-700"
                                                >
                                                    {row.course}
                                                </div>

                                                <!-- Celular + ícone WhatsApp -->
                                                <div
                                                    class="flex items-center gap-1.5 text-slate-700
                                                           tabular-nums"
                                                >
                                                    <img
                                                        src="/icon_whatsApp.webp"
                                                        alt="WhatsApp"
                                                        class="h-3.5 w-3.5 flex-shrink-0"
                                                        loading="lazy"
                                                    />
                                                    <span class="truncate">
                                                        {row.phone}
                                                    </span>
                                                </div>

                                                <!-- Professor -->
                                                <div
                                                    class="truncate text-slate-700"
                                                >
                                                    {row.teacher}
                                                </div>
                                            </div>
                                        {/each}
                                    {/each}
                                </div>

                                <!-- rodapé informativo -->
                                <div
                                    class="mt-2 text-[10px] text-slate-500 flex items-center justify-between"
                                >
                                    <span>
                                        Alunos fora do ciclo natural exibidos
                                        pela
                                        <span class="font-medium"
                                            >Jornada do Aluno</span
                                        >.
                                    </span>
                                    <span class="hidden sm:inline">
                                        Botão direito: cadastro, app, atividades
                                        extras e turmas.
                                    </span>
                                </div>
                            </div>
                        </div>

                        <!-- pequeno glow extra -->
                        <div
                            class="pointer-events-none absolute -bottom-10 -right-10 h-40 w-40 rounded-full
                                   bg-[#EA6D0B]/14 blur-3xl"
                            aria-hidden="true"
                        ></div>
                    </div>
                </div>
            </div>
            <!-- COL ESQUERDA: TEXTO / CONCEITO -->
            <div class="lg:col-span-6 space-y-5">
                <p
                    class="text-[13px] font-semibold tracking-[0.18em]
                           text-[#7E82A2] uppercase"
                >
                    JORNADA DO ALUNO · VISÃO PEDAGÓGICA
                </p>

                <h2
                    class="text-[28px] md:text-[34px] font-semibold
                           leading-[1.15] text-[#000A57]"
                >
                    Veja, em poucos cliques, quem saiu do ciclo natural do curso
                </h2>

                <p
                    class="text-[15px] md:text-[16px] leading-[1.8]
                           text-[#000A57]/82 max-w-xl"
                >
                    A Jornada do Aluno mostra, em tempo real, quem está no fluxo
                    ideal do curso e quem exige ação rápida: faltosos,
                    desistentes, não aprovados, alunos em atividades extras ou
                    em resgate pedagógico — sem precisar montar filtros
                    complexos.
                </p>

                <!-- 3 níveis de agrupamento / estágios -->
                <div class="grid gap-3 sm:grid-cols-3 max-w-xl">
                    <article
                        class="rounded-2xl border border-[#E5E7EB] bg-[#F9FAFB]
                               px-3.5 py-3.5 md:px-4 md:py-4"
                    >
                        <p
                            class="text-[12px] font-semibold tracking-[0.16em]
                                   text-[#7E82A2] uppercase"
                        >
                            Boas-vindas
                        </p>
                        <p class="mt-1.5 text-[13px] text-[#000A57]/85">
                            Primeiros contatos, aula inaugural, quem nunca veio
                            e quem já deu sinais de desistência.
                        </p>
                    </article>

                    <article
                        class="rounded-2xl border border-[#E5E7EB] bg-[#F9FAFB]
                               px-3.5 py-3.5 md:px-4 md:py-4"
                    >
                        <p
                            class="text-[12px] font-semibold tracking-[0.16em]
                                   text-[#7E82A2] uppercase"
                        >
                            Atividades extras
                        </p>
                        <p class="mt-1.5 text-[13px] text-[#000A57]/85">
                            Inscritos, presentes e faltosos em atividades
                            extra-classe, tudo agrupado em um único lugar.
                        </p>
                    </article>

                    <article
                        class="rounded-2xl border border-[#E5E7EB] bg-[#F9FAFB]
                               px-3.5 py-3.5 md:px-4 md:py-4"
                    >
                        <p
                            class="text-[12px] font-semibold tracking-[0.16em]
                                   text-[#7E82A2] uppercase"
                        >
                            Início e conclusão
                        </p>
                        <p class="mt-1.5 text-[13px] text-[#000A57]/85">
                            Aguardando turma, faltas sucessivas, não aprovados e
                            alunos aptos a resgate ou certificação.
                        </p>
                    </article>
                </div>

                <!-- mini bullets de ação rápida -->
                <div class="mt-4 space-y-2">
                    <div class="flex gap-2">
                        <span
                            class="mt-[6px] h-1.5 w-1.5 rounded-full bg-[#EA6D0B]"
                        />
                        <p class="text-[13px] text-[#000A57]/85">
                            Acesse a Jornada do Aluno pela guia
                            <span class="font-semibold"
                                >Secretaria/Pedagógico</span
                            >, sem relatórios manuais.
                        </p>
                    </div>
                    <div class="flex gap-2">
                        <span
                            class="mt-[6px] h-1.5 w-1.5 rounded-full bg-[#4F46E5]"
                        />
                        <p class="text-[13px] text-[#000A57]/85">
                            Clique com o botão direito sobre o aluno para abrir
                            cadastro, titular, opções do App, SMS, WhatsApp,
                            atividades extras e turmas.
                        </p>
                    </div>
                    <div class="flex gap-2">
                        <span
                            class="mt-[6px] h-1.5 w-1.5 rounded-full bg-emerald-500"
                        />
                        <p class="text-[13px] text-[#000A57]/85">
                            Centralize resgates pedagógicos, tarefas e
                            observações em um único fluxo para coordenação e
                            equipes.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    </div>
</section>

<!-- ===== ATIVIDADES EXTRA CLASSE ===== -->
<section class="relative py-12 md:py-16 bg-[#F3F4FD]">
    <div class="container px-5 md:px-8 lg:px-20">
        <div class="grid gap-10 lg:grid-cols-12 lg:items-center">
            <!-- COL ESQUERDA: TEXTO / CONCEITO -->
            <div class="lg:col-span-5 space-y-5">
                <p
                    class="text-[13px] font-semibold tracking-[0.18em]
                           text-[#7E82A2] uppercase"
                >
                    ATIVIDADES EXTRA CLASSE · ENGAJAMENTO E HORAS
                </p>

                <h2
                    class="text-[28px] md:text-[34px] font-semibold
                           leading-[1.15] text-[#000A57]"
                >
                    Controle de oficinas, eventos e horas extras sem planilhas
                    paralelas
                </h2>

                <p
                    class="text-[15px] md:text-[16px] leading-[1.8]
                           text-[#000A57]/82"
                >
                    Cadastre atividades extra classe, convide alunos pelo App e
                    Portal, acompanhe presença e veja em um clique quantas horas
                    cada turma acumula em oficinas, projetos e eventos
                    especiais.
                </p>

                <!-- Mini benefícios -->
                <div class="space-y-2">
                    <div class="flex gap-2">
                        <span
                            class="mt-[6px] h-1.5 w-1.5 rounded-full bg-[#EA6D0B]"
                        />
                        <p class="text-[13px] text-[#000A57]/85">
                            Agrupamento específico em
                            <span class="font-semibold"
                                >Atividades Extra Classe</span
                            >: inscritos, presentes e faltosos.
                        </p>
                    </div>
                    <div class="flex gap-2">
                        <span
                            class="mt-[6px] h-1.5 w-1.5 rounded-full bg-[#4F46E5]"
                        />
                        <p class="text-[13px] text-[#000A57]/85">
                            Convites exibidos diretamente no App e Portal, com
                            registro de quem confirmou e quem participou.
                        </p>
                    </div>
                    <div class="flex gap-2">
                        <span
                            class="mt-[6px] h-1.5 w-1.5 rounded-full bg-emerald-500"
                        />
                        <p class="text-[13px] text-[#000A57]/85">
                            Relatório de horas em atividades extra classe para
                            pais e coordenação, sem montar filtros complexos.
                        </p>
                    </div>
                </div>

                <!-- Chamado rápido -->
                <div class="pt-2">
                    <p class="text-[12px] text-[#6B7280]">
                        Acesse pela guia
                        <span class="font-semibold">Secretaria/Pedagógico</span>
                        em
                        <span class="font-semibold"
                            >Atividades Extra Classe</span
                        >
                        e use o botão direito para incluir alunos, transferir turmas
                        e abrir relatórios.
                    </p>
                </div>
            </div>

            <!-- COL DIREITA: MINI TELA ATIVIDADES EXTRA CLASSE -->
            <div class="lg:col-span-7">
                <div
                    class="relative flex justify-center lg:justify-end mt-6 lg:mt-0"
                >
                    <!-- glow de fundo -->
                    <div
                        class="pointer-events-none absolute -top-10 -left-8 h-40 w-40 rounded-full
                               bg-[#4F46E5]/10 blur-3xl"
                        aria-hidden="true"
                    ></div>

                    <div class="relative w-full max-w-[680px]">
                        <div
                            class="relative z-10 rounded-[26px] bg-white border border-slate-200
                                   shadow-[0_22px_60px_rgba(15,23,42,0.22)] overflow-hidden"
                        >
                            <!-- topo tipo sistema -->
                            <div
                                class="flex items-center justify-between px-4 pt-3 pb-2
                                       border-b border-slate-200 bg-slate-50"
                            >
                                <div class="flex items-center gap-3">
                                    <div
                                        class="hidden sm:flex items-center gap-3 text-[11px] text-slate-600"
                                    >
                                        <span
                                            class="font-semibold text-slate-800"
                                        >
                                            Meu F10
                                        </span>
                                        <span>Cadastros</span>
                                        <span>Comercial</span>
                                        <span
                                            class="font-semibold text-primary"
                                        >
                                            Pedagógico
                                        </span>
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

                            <!-- Abas / filtros -->
                            <div
                                class="px-4 pt-3 pb-2 flex items-center justify-between"
                            >
                                <div class="flex items-center gap-2">
                                    <div
                                        class="inline-flex items-center gap-2 rounded-t-xl bg-slate-100
                                               px-3 py-1.5 text-[12px] font-semibold text-slate-700
                                               border border-b-0 border-slate-200"
                                    >
                                        <span
                                            class="inline-flex h-4 w-4 items-center justify-center rounded-full bg-primary/10"
                                        >
                                            <span
                                                class="h-2 w-2 bg-primary rounded-[3px]"
                                            ></span>
                                        </span>
                                        <span>Atividades Extra Classe</span>
                                    </div>
                                </div>

                                <p
                                    class="hidden sm:inline text-[11px] text-slate-500"
                                >
                                    Próximas atividades com data futura
                                </p>
                            </div>

                            <!-- Cabeçalho da grade (colunas como no print) -->
                            <div class="px-4 pb-3">
                                <div
                                    class="grid grid-cols-[1.6fr,0.9fr,0.8fr,0.6fr,0.9fr,1.3fr,0.7fr,0.7fr]
                                           text-[11px] font-semibold text-slate-600
                                           bg-slate-100 rounded-xl px-3 py-2 border border-slate-200"
                                >
                                    <span>Tipo</span>
                                    <span>Data</span>
                                    <span>Local</span>
                                    <span>Cap.</span>
                                    <span>Alunos</span>
                                    <span>Aulas</span>
                                    <span>Início</span>
                                    <span>Fim</span>
                                </div>
                            </div>

                            <!-- Linhas de atividades -->
                            <div class="px-4 pb-4">
                                <div
                                    class="rounded-[18px] border border-slate-200 bg-slate-50 overflow-hidden"
                                >
                                    {#each extraClassActivities as activity, ri}
                                        <div
                                            class={`grid grid-cols-[1.6fr,0.9fr,0.8fr,0.6fr,0.9fr,1.3fr,0.7fr,0.7fr]
                                                    px-3 py-2 text-[12px]
                                                    ${
                                                        ri % 2 === 0
                                                            ? "bg-white"
                                                            : "bg-slate-50/80"
                                                    }`}
                                        >
                                            <!-- Tipo -->
                                            <div
                                                class="truncate text-slate-800"
                                            >
                                                {activity.type}
                                            </div>

                                            <!-- Data -->
                                            <div
                                                class="truncate text-slate-700 tabular-nums"
                                            >
                                                {activity.date}
                                            </div>

                                            <!-- Local -->
                                            <div
                                                class="truncate text-slate-700"
                                            >
                                                {activity.room}
                                            </div>

                                            <!-- Capacidade -->
                                            <div
                                                class="truncate text-slate-600 tabular-nums"
                                            >
                                                {activity.capacity}
                                            </div>

                                            <!-- Não alunos (checkbox fake) -->
                                            <div class="flex items-center">
                                                <span
                                                    class="inline-flex h-3.5 w-3.5 items-center justify-center
                                                           rounded-[4px] border border-slate-300 bg-white"
                                                >
                                                    {#if activity.nonStudents}
                                                        <span
                                                            class="h-2.5 w-2.5 rounded-[3px] bg-emerald-500"
                                                        ></span>
                                                    {/if}
                                                </span>
                                            </div>

                                            <!-- Aulas realizadas na (barra azul) -->
                                            <div
                                                class="flex items-center gap-2"
                                            >
                                                <div
                                                    class="flex-1 h-full bg-slate-100 overflow-hidden"
                                                >
                                                    <div
                                                        class="h-full bg-[#2563EB]"
                                                        style={`width: ${activity.progress}%;`}
                                                    ></div>
                                                </div>
                                                <span
                                                    class="text-[11px] text-slate-600 tabular-nums mr-2"
                                                >
                                                    {activity.progress}%
                                                </span>
                                            </div>

                                            <!-- Início -->
                                            <div
                                                class="truncate text-slate-600 tabular-nums"
                                            >
                                                {activity.start}
                                            </div>

                                            <!-- Fim -->
                                            <div
                                                class="truncate text-slate-600 tabular-nums"
                                            >
                                                {activity.end}
                                            </div>
                                        </div>
                                    {/each}
                                </div>

                                <!-- Barra de status -->
                                <div
                                    class="mt-2 text-[10px] text-slate-500 flex items-center justify-between"
                                >
                                    <span>
                                        Atividades Extra Classe com próxima data
                                        maior ou igual a
                                        <span class="font-medium">
                                            29/11/2025
                                        </span>
                                        .
                                    </span>
                                    <span class="hidden sm:inline">
                                        Botão direito: incluir alunos,
                                        transferir turmas e abrir relatórios de
                                        frequência.
                                    </span>
                                </div>
                            </div>
                        </div>

                        <!-- Glow extra à direita -->
                        <div
                            class="pointer-events-none absolute -bottom-10 -right-10 h-40 w-40 rounded-full
                                   bg-[#EA6D0B]/18 blur-3xl"
                            aria-hidden="true"
                        ></div>
                    </div>
                </div>
            </div>
        </div>
    </div>
</section>

<!-- ===== BENEFÍCIOS E KPIs PEDAGÓGICOS ===== -->
<section class="relative py-14 md:py-16 bg-[#F3F4FD]/60">
    <div class="container px-5 md:px-8 lg:px-20">
        <div class="grid gap-10 lg:grid-cols-12 items-start">
            <!-- Texto / benefícios -->
            <div class="lg:col-span-6">
                <h2
                    class="text-[30px] md:text-[36px] lg:text-[40px] font-semibold
                           leading-[1.13] tracking-[-0.015em] text-[#000A57]"
                >
                    Benefícios diretos para secretaria, coordenação e direção
                </h2>

                <p
                    class="mt-4 text-[15px] md:text-[16px] leading-[1.8]
                           text-[#000A57]/80"
                >
                    O módulo Pedagógico reduz retrabalho, organiza turmas e
                    conteúdos e dá previsibilidade para quem precisa decidir:
                    coordenação, direção e mantenedora. Os indicadores abaixo
                    são típicos de escolas que usam o F10 de forma estruturada.
                </p>

                <ul
                    class="mt-6 space-y-3 text-[15px] md:text-[16px]
                           text-[#000A57]/90"
                >
                    <li>
                        <strong
                            >Menos tempo em planilhas, mais tempo em alunos.</strong
                        >
                        <br />
                        <span class="text-[#000A57]/80">
                            Relatórios de presença, conclusão e certificados
                            saem direto do sistema, sem ficar juntando dados de
                            vários lugares.
                        </span>
                    </li>
                    <li>
                        <strong
                            >Visão real de quem está fora do ciclo ideal.</strong
                        >
                        <br />
                        <span class="text-[#000A57]/80">
                            Jornada do Aluno destaca trancados, faltosos,
                            afastados e concluídos sem precisar montar filtros.
                        </span>
                    </li>
                    <li>
                        <strong
                            >Integração total com App, AVA e financeiro.</strong
                        >
                        <br />
                        <span class="text-[#000A57]/80">
                            Chamada, conteúdos digitais, contratos e boletos
                            falam a mesma língua, do cadastro ao certificado.
                        </span>
                    </li>
                </ul>
            </div>

            <!-- KPIs em painel -->
            <div class="lg:col-span-6">
                <KpiPanel
                    title="Impacto que o módulo Pedagógico costuma gerar"
                    items={pedagogicalKpis}
                    footnote="*Estimativas baseadas em resultados recorrentes de escolas que utilizam o F10 com pauta, jornada do aluno e atividades extra classe ativas."
                />
            </div>
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
                    Perguntas frequentes sobre o módulo Pedagógico
                </h2>
                <p
                    class="mt-2 text-[14px] md:text-[15px] text-[#000A57]/80
                           max-w-[520px]"
                >
                    Entenda como o controle acadêmico conversa com o financeiro,
                    o CRM e o aplicativo Smart Aluno dentro do F10.
                </p>
            </div>

            <a
                href="/solucoes/aplicativo-smart-aluno"
                class="hidden md:inline-flex items-center rounded-full border
                       border-[#EA6D0B] px-4 py-2 text-[14px] font-semibold
                       text-[#000A57] hover:bg-[#EA6D0B]/10
                       focus:outline-none focus:ring-2 focus:ring-[#EA6D0B]/40"
            >
                Ver mais sobre o App do aluno
            </a>
        </div>

        <div class="mt-8">
            <FaqAccordion items={faqItems} />
        </div>

        <div class="mt-6 md:hidden">
            <a
                href="/solucoes/aplicativo-smart-aluno"
                class="inline-flex items-center rounded-full border
                       border-[#EA6D0B] px-4 py-2 text-[14px] font-semibold
                       text-[#000A57] hover:bg-[#EA6D0B]/10
                       focus:outline-none focus:ring-2 focus:ring-[#EA6D0B]/40"
            >
                Ver mais sobre o App do aluno
            </a>
        </div>
    </div>
</section>

<!-- ===== BLOCO FINAL (CTA · PEDAGÓGICO) ===== -->
<section class="relative py-12 md:py-16 bg-white/90">
    <div class="container px-5 md:px-8 lg:px-20">
        <div class="grid gap-10 lg:grid-cols-12 items-center">
            <!-- TEXTO / CTA -->
            <div class="lg:col-span-6 flex flex-col gap-5">
                <h2
                    class="text-[#7E82A2] font-medium leading-[1.1] tracking-[-0.01em]
                           text-[30px] md:text-[36px] lg:text-[40px]"
                >
                    Secretaria, pedagógico e jornada do aluno puxando para o
                    mesmo lado
                </h2>

                <p
                    class="text-[#000A57] text-[15px] md:text-[16px] leading-[1.8]
                           max-w-[560px]"
                >
                    Com o módulo Pedagógico do F10, cursos, turmas, chamadas,
                    conteúdos digitais e certificados ficam no mesmo ambiente
                    que contratos, financeiro e app do aluno. A coordenação
                    enxerga o todo, e cada professor sabe exatamente o que fazer
                    em cada aula.
                </p>

                <p
                    class="text-[#000A57]/80 text-[14px] md:text-[15px]
                           max-w-[560px]"
                >
                    Somado à Jornada do Aluno e às Atividades Extra Classe, sua
                    escola passa a trabalhar com indicadores reais de presença,
                    engajamento e conclusão — não apenas com impressão de
                    boletins.
                </p>

                <div class="pt-2">
                    <button
                        type="button"
                        on:click={openPedagogyPresentationModal}
                        class="inline-flex items-center justify-center gap-3 rounded-[999px]
                               bg-[#EA6D0B] px-8 md:px-10 py-4 text-white text-[15px] md:text-[16px]
                               font-bold transition hover:brightness-110
                               focus:outline-none focus:ring-2 focus:ring-[#EA6D0B]/40"
                    >
                        <span>Agendar apresentação</span>
                        <ArrowRight size={22} />
                    </button>
                </div>

                <p
                    class="text-[12px] md:text-[13px] text-[#6B7280] max-w-[520px]"
                >
                    Indicamos que a demonstração envolva coordenação pedagógica,
                    direção e alguém da secretaria. Assim, todos já enxergam
                    como o fluxo completo funciona na prática.
                </p>
            </div>

            <!-- IMAGEM FINAL -->
            <div class="lg:col-span-6 mt-4 lg:mt-0">
                <div class="relative h-auto overflow-hidden">
                    <img
                        src="/sala_de_aula_f10_software.webp"
                        alt="Painel pedagógico do F10 com cursos, turmas, jornada do aluno e certificados."
                        class="h-full w-full rounded-[20px] ring-1 object-cover object-center"
                        loading="lazy"
                    />
                    <div
                        class="pointer-events-none absolute inset-0 rounded-[20px]
                               ring-1 ring-inset ring-white/30"
                    ></div>
                </div>
            </div>
        </div>
    </div>
</section>
