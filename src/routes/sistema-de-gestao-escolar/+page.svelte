<script lang="ts">
    import Breadcrumb from "$lib/components/Breadcrumb.svelte";
    import FaqAccordion from "$lib/components/FaqAccordion.svelte";
    import SeoHead from "$lib/components/SeoHead.svelte";
    import { contactModalConfig } from "$lib/stores/contactModals";
    import { showForm } from "$lib/stores/formPopup";
    import {
        ArrowRight,
        BadgeDollarSign,
        BarChart3,
        BookOpenCheck,
        CheckCircle2,
        ClipboardList,
        GraduationCap,
        MessageCircle,
        PhoneCall,
        Smartphone,
        Users,
    } from "lucide-svelte";
    import type { ComponentType } from "svelte";

    type FeatureItem = {
        title: string;
        description: string;
        icon: ComponentType;
        href?: string;
    };

    type ComparisonRow = {
        criterion: string;
        spreadsheets: string;
        genericSystems: string;
        f10: string;
    };

    type ReasonItem = {
        title: string;
        description: string;
        href?: string;
    };

    const baseUrl = "https://f10.com.br";
    const canonicalUrl = `${baseUrl}/sistema-de-gestao-escolar`;
    const ogImage = `${baseUrl}/cover.jpg`;

    const seoTitle = "Sistema de Gestão Escolar Completo | F10 Software";
    const seoDescription =
        "Centralize matrículas, financeiro, CRM escolar, WhatsApp, aplicativo para alunos e rotina administrativa com o sistema de gestão escolar da F10.";

    const faqItems = [
        {
            question: "O que é um sistema de gestão escolar?",
            answer:
                "Um sistema de gestão escolar é uma plataforma que centraliza processos administrativos, acadêmicos, financeiros, comerciais e de comunicação da instituição. Ele ajuda escolas e cursos a organizar matrículas, alunos, responsáveis, atendimentos, pagamentos, relatórios e rotinas da secretaria em um único ambiente.",
        },
        {
            question: "Para que serve um software de gestão escolar?",
            answer:
                "Um software de gestão escolar serve para reduzir retrabalho, organizar informações, melhorar o atendimento, controlar matrículas e financeiro, acompanhar alunos e dar mais visibilidade para a gestão. Em vez de depender de planilhas e conversas soltas, a escola trabalha com dados centralizados.",
        },
        {
            question: "A F10 serve para escola de idiomas?",
            answer:
                "Sim. A F10 atende escolas de ensino regular, escolas particulares, escolas de idiomas, cursos livres, cursos técnicos, cursos profissionalizantes e instituições de ensino que precisam centralizar processos administrativos, comerciais, pedagógicos, financeiros e de comunicação.",
        },
        {
            question: "A F10 tem WhatsApp integrado?",
            answer:
                "Sim. A F10 possui solução de WhatsApp para escolas e cursos, com atendimento compartilhado, histórico centralizado e uso em fluxos como secretaria, financeiro, matrículas e relacionamento.",
        },
        {
            question: "A F10 tem aplicativo para pais e alunos?",
            answer:
                "Sim. A F10 oferece aplicativo para alunos e responsáveis, apoiando comunicação, acesso a informações acadêmicas e relacionamento entre instituição, aluno e família.",
        },
        {
            question: "Um sistema de gestão escolar substitui planilhas?",
            answer:
                "Na prática, sim. Planilhas podem continuar sendo usadas para análises pontuais, mas deixam de ser o centro da operação. O sistema passa a concentrar cadastros, matrículas, financeiro, comunicação, CRM escolar e relatórios com mais organização e rastreabilidade.",
        },
        {
            question: "Como escolher o melhor sistema de gestão escolar?",
            answer:
                "Avalie se o sistema é fácil de usar, tem suporte, organiza financeiro, secretaria, matrículas, CRM escolar, comunicação e relatórios. Também é importante verificar se a plataforma se adapta à rotina real da instituição, seja uma escola de ensino regular, escola de idiomas, curso livre, técnico ou profissionalizante.",
        },
        {
            question: "A F10 ajuda na captação de alunos?",
            answer:
                "Sim. A F10 apoia a captação ao organizar leads, atendimento, histórico de contatos e processo comercial. A instituição pode conectar marketing, CRM escolar e matrícula para acompanhar melhor a jornada do interessado até a inscrição.",
        },
        {
            question: "O sistema de gestão escolar ajuda no financeiro?",
            answer:
                "Sim. Um sistema de gestão escolar ajuda a acompanhar cobranças, recebimentos, pagamentos e informações financeiras da rotina da escola. Na F10, o financeiro fica conectado à operação da instituição para reduzir controles paralelos e dar mais visibilidade à gestão.",
        },
        {
            question: "Como solicitar uma demonstração da F10?",
            answer:
                "Para solicitar uma demonstração, use os botões desta página e envie seus dados pelo formulário. A equipe da F10 entra em contato para entender a rotina da instituição e apresentar a plataforma de acordo com as necessidades da escola ou curso.",
        },
    ];

    const breadcrumbItems = [
        { name: "Home", item: baseUrl },
        { name: "Sistema de Gestão Escolar", item: canonicalUrl },
    ];

    const softwareApplicationData = {
        name: "Sistema de Gestão Escolar F10 Software",
        description: seoDescription,
        url: canonicalUrl,
        brandName: "F10 Software",
        applicationCategory: "BusinessApplication",
        applicationSubCategory: "Sistema de gestão escolar",
        operatingSystem: "Web",
        provider: {
            name: "F10 Software",
            url: baseUrl,
        },
        publisher: {
            name: "F10 Software",
            url: baseUrl,
        },
        featureList: [
            "Matrículas e rematrículas",
            "CRM escolar e captação de alunos",
            "Atendimento e comunicação",
            "WhatsApp para escolas",
            "Aplicativo para pais e alunos",
            "Gestão financeira",
            "Gestão pedagógica",
            "Secretaria escolar",
            "Relatórios e indicadores",
        ],
        image: [ogImage],
    };

    const painItems = [
        "Perda de informações importantes",
        "Demora no atendimento a alunos, pais e leads",
        "Dificuldade para acompanhar matrículas",
        "Falta de controle financeiro",
        "Retrabalho da secretaria",
        "Comunicação espalhada em canais diferentes",
        "Baixa visibilidade sobre alunos e responsáveis",
    ];

    const featureItems: FeatureItem[] = [
        {
            title: "Matrículas e rematrículas",
            description:
                "Organize dados de alunos, responsáveis, contratos e etapas de matrícula com um software para gestão de matrículas mais conectado à secretaria e à gestão.",
            icon: ClipboardList,
        },
        {
            title: "CRM escolar e captação de alunos",
            description:
                "Acompanhe leads, oportunidades, histórico de contato e rotina comercial com visão mais clara do funil de matrículas.",
            icon: Users,
            href: "/solucoes/crm-escolar",
        },
        {
            title: "Atendimento e comunicação",
            description:
                "Centralize conversas e registros para que a equipe mantenha contexto e continuidade no relacionamento com famílias e alunos.",
            icon: PhoneCall,
        },
        {
            title: "WhatsApp para escolas",
            description:
                "Use o WhatsApp na rotina de secretaria, financeiro, matrículas e atendimento com histórico compartilhado pela equipe.",
            icon: MessageCircle,
            href: "/solucoes/whatsapp",
        },
        {
            title: "Aplicativo para pais e alunos",
            description:
                "Aproxime a escola de alunos e responsáveis com acesso a informações importantes em uma experiência digital própria.",
            icon: Smartphone,
            href: "/solucoes/aplicativo-smart-aluno",
        },
        {
            title: "Gestão financeira",
            description:
                "Acompanhe cobranças, recebimentos, pagamentos e rotina financeira escolar com mais previsibilidade e organização.",
            icon: BadgeDollarSign,
        },
        {
            title: "Gestão pedagógica",
            description:
                "Apoie o acompanhamento da jornada do aluno, atividades acadêmicas e informações pedagógicas da instituição.",
            icon: BookOpenCheck,
        },
        {
            title: "Secretaria escolar",
            description:
                "Reduza tarefas manuais com um sistema para secretaria escolar que concentra cadastros, documentos, solicitações e processos administrativos.",
            icon: GraduationCap,
        },
        {
            title: "Relatórios e indicadores",
            description:
                "Tenha visão integrada para acompanhar operação, comercial, financeiro e rotina escolar com dados mais confiáveis.",
            icon: BarChart3,
        },
    ];

    const institutionItems = [
        "Escolas de ensino regular",
        "Escolas particulares",
        "Escolas de idiomas",
        "Cursos livres",
        "Cursos técnicos",
        "Cursos profissionalizantes",
        "Instituições com atendimento recorrente por WhatsApp",
        "Operações educacionais que precisam organizar matrículas, comunicação e rotina administrativa",
    ];

    const reasonItems: ReasonItem[] = [
        {
            title: "Gestão escolar centralizada",
            description:
                "A plataforma de gestão escolar da F10 reúne processos administrativos, pedagógicos, financeiros e comerciais para reduzir controles paralelos.",
        },
        {
            title: "Atendimento com contexto",
            description:
                "A equipe trabalha com histórico mais organizado para atender alunos, responsáveis e interessados com continuidade entre setores.",
        },
        {
            title: "Matrículas e CRM escolar",
            description:
                "A F10 conecta captação, atendimento e matrícula em um fluxo comercial mais claro para escolas e cursos.",
            href: "/solucoes/crm-escolar",
        },
        {
            title: "WhatsApp para escolas",
            description:
                "O WhatsApp entra na rotina da secretaria, financeiro, matrículas e relacionamento com histórico compartilhado pela equipe.",
            href: "/solucoes/whatsapp",
        },
        {
            title: "Aplicativo para pais e alunos",
            description:
                "A instituição aproxima alunos e responsáveis da rotina escolar com uma experiência digital conectada ao ecossistema F10.",
            href: "/solucoes/aplicativo-smart-aluno",
        },
        {
            title: "Financeiro, secretaria e jornada do aluno",
            description:
                "A F10 ajuda a dar mais visibilidade para cobranças, rotina administrativa e acompanhamento da jornada do aluno.",
        },
    ];

    const comparisonRows: ComparisonRow[] = [
        {
            criterion: "Matrículas",
            spreadsheets: "Controle manual e sujeito a versões diferentes",
            genericSystems: "Fluxo pouco aderente à rotina escolar",
            f10: "Processos pensados para escolas e cursos",
        },
        {
            criterion: "Comunicação",
            spreadsheets: "Conversas ficam fora do controle da gestão",
            genericSystems: "Registros podem ficar desconectados do aluno",
            f10: "Histórico conectado à rotina escolar e ao atendimento",
        },
        {
            criterion: "Atendimento",
            spreadsheets: "Dependência de anotações e memória da equipe",
            genericSystems: "Pouco contexto educacional no relacionamento",
            f10: "Contexto de aluno, responsável, lead e matrícula",
        },
        {
            criterion: "Financeiro",
            spreadsheets: "Conciliação e cobrança exigem muito retrabalho",
            genericSystems: "Pode exigir adaptações manuais",
            f10: "Controle financeiro alinhado à operação da instituição",
        },
        {
            criterion: "Gestão pedagógica",
            spreadsheets: "Informações espalhadas e difíceis de acompanhar",
            genericSystems: "Nem sempre cobre a jornada do aluno",
            f10: "Apoio à rotina pedagógica e acompanhamento do aluno",
        },
        {
            criterion: "Relatórios",
            spreadsheets: "Dependem de atualização manual",
            genericSystems: "Indicadores podem não refletir a escola",
            f10: "Visão integrada para tomada de decisão",
        },
        {
            criterion: "Escalabilidade",
            spreadsheets: "Perdem eficiência conforme a operação cresce",
            genericSystems: "Crescem com limitações de aderência",
            f10: "Estrutura para organizar equipes, unidades e processos",
        },
        {
            criterion: "Experiência dos pais e alunos",
            spreadsheets: "Baixa visibilidade e comunicação fragmentada",
            genericSystems: "Experiência menos especializada",
            f10: "Aplicativo, comunicação e atendimento voltados ao ensino",
        },
    ];

    const benefitItems = [
        "Menos retrabalho",
        "Mais organização",
        "Atendimento mais rápido",
        "Melhor acompanhamento de alunos",
        "Comunicação mais profissional",
        "Mais controle financeiro",
        "Mais previsibilidade comercial",
        "Visão integrada da escola",
    ];

    const choiceItems = [
        "Facilidade de uso",
        "Suporte",
        "Integração com canais de atendimento",
        "Controle financeiro",
        "CRM escolar",
        "Aplicativo para alunos e responsáveis",
        "Relatórios",
        "Segurança dos dados",
        "Aderência à rotina da escola",
    ];

    function openSchoolManagementModal(fold: string): void {
        contactModalConfig.set({
            defaultMessage:
                "Quero agendar uma demonstração do sistema de gestão escolar da F10",
            product: "F10 Software - Sistema de Gestão Escolar",
            subSource: `Landing Page Sistema de Gestão Escolar - ${fold}`,
            leadDescription:
                "Contato iniciado pela landing page de sistema de gestão escolar.",
        });

        showForm.set(true);
    }
</script>

<SeoHead
    title={seoTitle}
    description={seoDescription}
    canonical={canonicalUrl}
    {ogImage}
    ogTitle={seoTitle}
    ogDescription={seoDescription}
    {faqItems}
    {breadcrumbItems}
    {softwareApplicationData}
/>

<main class="overflow-hidden bg-white text-[#010D28]">
    <section class="relative isolate bg-[#F7F8FC]">
        <div class="absolute inset-0 -z-10 bg-[url('/noise.svg')] opacity-60"></div>

        <div class="pt-3">
            <Breadcrumb
                baseUrl={baseUrl}
                items={[
                    { label: "HOME", href: "/" },
                    { label: "SISTEMA DE GESTÃO ESCOLAR" },
                ]}
            />
        </div>

        <div
            class="container grid items-center gap-10 px-5 pb-16 pt-2 md:px-8 md:pb-20 lg:grid-cols-[minmax(0,1.05fr)_minmax(360px,0.95fr)] lg:px-20 lg:pb-24"
        >
            <div>
                <p
                    class="text-[12px] font-semibold uppercase tracking-[0.22em] text-[#EA6D0B]"
                >
                    F10 Software
                </p>

                <h1
                    class="mt-5 max-w-4xl text-[38px] font-semibold leading-[1.08] tracking-[-0.02em] text-[#010D28] md:text-[52px] lg:text-[64px]"
                >
                    Sistema de gestão escolar completo para escolas e cursos
                </h1>

                <p
                    class="mt-6 max-w-2xl text-[17px] leading-[1.75] text-[#000A57]/78 md:text-[18px]"
                >
                    A F10 centraliza gestão escolar, atendimento, matrículas,
                    financeiro, comunicação, CRM escolar, WhatsApp e rotina
                    administrativa em uma plataforma de gestão escolar para
                    instituições de ensino.
                </p>

                <div class="mt-8 flex flex-col gap-3 sm:flex-row">
                    <button
                        type="button"
                        on:click={() => openSchoolManagementModal("Hero")}
                        class="inline-flex items-center justify-center gap-3 rounded-full bg-[#EA6D0B] px-8 py-4 text-white shadow-[0_16px_36px_rgba(234,109,11,0.30)] transition hover:brightness-110 focus:outline-none focus:ring-2 focus:ring-[#EA6D0B]/50"
                    >
                        <span>Solicitar demonstração</span>
                        <ArrowRight size={21} />
                    </button>

                    <a
                        href="#funcionalidades"
                        class="inline-flex items-center justify-center rounded-full border border-[#010D28]/15 bg-white px-8 py-4 font-semibold text-[#010D28] transition hover:border-[#EA6D0B]/50 hover:text-[#EA6D0B] focus:outline-none focus:ring-2 focus:ring-[#EA6D0B]/40"
                    >
                        Conhecer funcionalidades
                    </a>
                </div>
            </div>

            <div class="relative flex justify-center lg:justify-end lg:self-start">
                <img
                    src="/sistema-de-gestao-escolar-f10.webp"
                    alt="Sistema de gestão escolar F10 em uso na rotina administrativa da escola"
                    class="aspect-square w-full max-w-[560px] rounded-[28px] object-cover shadow-[0_24px_70px_rgba(1,13,40,0.12)]"
                    width="1254"
                    height="1254"
                    loading="eager"
                    fetchpriority="high"
                />
            </div>
        </div>
    </section>

    <section class="bg-white py-16 md:py-20">
        <div class="container grid gap-10 px-5 md:px-8 lg:grid-cols-12 lg:px-20">
            <div class="lg:col-span-5">
                <h2
                    class="text-[32px] font-semibold leading-[1.15] tracking-[-0.02em] md:text-[42px]"
                >
                    O que é um sistema de gestão escolar?
                </h2>
            </div>

            <div class="space-y-5 text-[17px] leading-[1.85] text-[#000A57]/78 lg:col-span-7">
                <p>
                    Um sistema de gestão escolar é uma plataforma que organiza a
                    operação de escolas e cursos em um único lugar. Esse software
                    de gestão escolar conecta secretaria, matrículas, atendimento,
                    financeiro, comunicação, CRM escolar e acompanhamento da
                    jornada do aluno.
                </p>
                <p>
                    Para escolas de ensino regular, escolas particulares, escolas
                    de idiomas, cursos livres, cursos técnicos, cursos
                    profissionalizantes e instituições de ensino, centralizar
                    processos evita perda de informações e reduz a dependência de
                    planilhas, mensagens soltas e controles paralelos.
                </p>
            </div>
        </div>
    </section>

    <section class="bg-[#F4F5FA] py-16 md:py-20">
        <div class="container px-5 md:px-8 lg:px-20">
            <div class="max-w-3xl">
                <h2
                    class="text-[30px] font-semibold leading-[1.16] tracking-[-0.02em] md:text-[42px]"
                >
                    Sua escola ainda depende de planilhas, mensagens soltas e
                    processos manuais?
                </h2>
            </div>

            <div class="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {#each painItems as item}
                    <article class="rounded-[8px] bg-white p-5 shadow-sm ring-1 ring-black/5">
                        <CheckCircle2 class="text-[#EA6D0B]" size={22} />
                        <p class="mt-4 text-[16px] font-semibold leading-snug">
                            {item}
                        </p>
                    </article>
                {/each}
            </div>
        </div>
    </section>

    <section class="bg-[#010D28] py-16 text-white md:py-20">
        <div class="container grid gap-10 px-5 md:px-8 lg:grid-cols-12 lg:px-20">
            <div class="lg:col-span-5">
                <p
                    class="text-[12px] font-semibold uppercase tracking-[0.22em] text-[#EA6D0B]"
                >
                    Plataforma F10
                </p>
                <h2
                    class="mt-4 text-[32px] font-semibold leading-[1.15] tracking-[-0.02em] md:text-[42px]"
                >
                    Como a F10 ajuda na gestão escolar
                </h2>
            </div>
            <div class="text-[17px] leading-[1.85] text-white/76 lg:col-span-7">
                <p>
                    A F10 reúne secretaria escolar, matrículas, financeiro, CRM
                    escolar, comunicação via WhatsApp, aplicativo para pais e
                    alunos, acompanhamento pedagógico e gestão da jornada do aluno.
                    Como sistema escolar online, a instituição ganha uma rotina
                    mais integrada, com dados menos espalhados e mais clareza para
                    decidir.
                </p>
            </div>
        </div>
    </section>

    <section class="bg-white py-16 md:py-24">
        <div class="container px-5 md:px-8 lg:px-20">
            <div class="max-w-3xl">
                <p
                    class="text-[12px] font-semibold uppercase tracking-[0.22em] text-[#EA6D0B]"
                >
                    Escolha da plataforma
                </p>
                <h2
                    class="mt-4 text-[32px] font-semibold leading-[1.15] tracking-[-0.02em] md:text-[44px]"
                >
                    Por que escolher a F10 como sistema de gestão escolar?
                </h2>
                <p class="mt-5 text-[17px] leading-[1.8] text-[#000A57]/76">
                    A F10 é focada em escolas e cursos que precisam organizar
                    gestão escolar, atendimento, matrículas, financeiro,
                    comunicação e relacionamento. A plataforma atende instituições
                    de ensino regular, escolas particulares, escolas de idiomas,
                    cursos livres, cursos técnicos e profissionalizantes sem
                    limitar a operação a controles genéricos.
                </p>
            </div>

            <div class="mt-10 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
                {#each reasonItems as item}
                    <article
                        class="rounded-[8px] border border-[#010D28]/8 bg-[#F7F8FC] p-6"
                    >
                        <CheckCircle2 class="text-[#EA6D0B]" size={22} />
                        <h3 class="mt-4 text-[20px] font-semibold leading-snug">
                            {item.title}
                        </h3>
                        <p class="mt-3 text-[15px] leading-relaxed text-[#000A57]/72">
                            {item.description}
                        </p>
                        {#if item.href}
                            <a
                                href={item.href}
                                class="mt-5 inline-flex items-center gap-2 text-[14px] font-semibold text-[#EA6D0B] hover:underline"
                            >
                                Conhecer solução
                                <ArrowRight size={16} />
                            </a>
                        {/if}
                    </article>
                {/each}
            </div>
        </div>
    </section>

    <section id="funcionalidades" class="bg-white py-16 md:py-24">
        <div class="container px-5 md:px-8 lg:px-20">
            <div class="max-w-3xl">
                <h2
                    class="text-[32px] font-semibold leading-[1.15] tracking-[-0.02em] md:text-[44px]"
                >
                    Funcionalidades essenciais para uma gestão escolar mais
                    eficiente
                </h2>
            </div>

            <div class="mt-10 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
                {#each featureItems as item}
                    <article
                        class="rounded-[8px] border border-[#010D28]/8 bg-white p-6 shadow-[0_12px_32px_rgba(1,13,40,0.06)]"
                    >
                        <svelte:component
                            this={item.icon}
                            class="h-7 w-7 text-[#EA6D0B]"
                        />
                        <h3 class="mt-5 text-[20px] font-semibold leading-snug">
                            {item.title}
                        </h3>
                        <p class="mt-3 text-[15px] leading-relaxed text-[#000A57]/72">
                            {item.description}
                        </p>
                        {#if item.href}
                            <a
                                href={item.href}
                                class="mt-5 inline-flex items-center gap-2 text-[14px] font-semibold text-[#EA6D0B] hover:underline"
                            >
                                Ver solução
                                <ArrowRight size={16} />
                            </a>
                        {/if}
                    </article>
                {/each}
            </div>

            <p class="mt-8 max-w-3xl text-[16px] leading-relaxed text-[#000A57]/72">
                Para fortalecer a captação, a F10 também conecta rotinas de
                <a class="font-semibold text-[#EA6D0B] hover:underline" href="/solucoes/marketing-captacao-de-alunos">marketing e captação de alunos</a>
                ao processo comercial da instituição. Esse conjunto ajuda quem
                busca um sistema para escolas de idiomas, um sistema para cursos
                livres ou uma solução mais ampla para instituições de ensino.
            </p>
        </div>
    </section>

    <section class="bg-[#F7F8FC] py-16 md:py-20">
        <div class="container grid gap-10 px-5 md:px-8 lg:grid-cols-12 lg:px-20">
            <div class="lg:col-span-5">
                <h2
                    class="text-[32px] font-semibold leading-[1.15] tracking-[-0.02em] md:text-[42px]"
                >
                    Para quais instituições o sistema de gestão escolar da F10 é
                    indicado?
                </h2>
            </div>

            <div class="grid gap-3 sm:grid-cols-2 lg:col-span-7">
                {#each institutionItems as item}
                    <div class="flex items-start gap-3 rounded-[8px] bg-white p-4 ring-1 ring-black/5">
                        <CheckCircle2 class="mt-0.5 shrink-0 text-[#EA6D0B]" size={20} />
                        <p class="text-[15px] font-semibold leading-relaxed">{item}</p>
                    </div>
                {/each}
            </div>
        </div>
    </section>

    <section class="bg-white py-16 md:py-24">
        <div class="container px-5 md:px-8 lg:px-20">
            <h2
                class="max-w-3xl text-[32px] font-semibold leading-[1.15] tracking-[-0.02em] md:text-[42px]"
            >
                Planilha, sistema genérico ou sistema de gestão escolar?
            </h2>

            <div class="mt-10 overflow-x-auto rounded-[8px] border border-[#010D28]/10">
                <table class="w-full min-w-[820px] border-collapse bg-white text-left">
                    <caption class="sr-only">
                        Comparação entre planilhas, sistemas genéricos e o sistema de gestão escolar da F10
                    </caption>
                    <thead class="bg-[#010D28] text-white">
                        <tr>
                            <th class="px-5 py-4 text-[14px] font-semibold">Critério</th>
                            <th class="px-5 py-4 text-[14px] font-semibold">Planilhas</th>
                            <th class="px-5 py-4 text-[14px] font-semibold">Sistemas genéricos</th>
                            <th class="px-5 py-4 text-[14px] font-semibold">F10 Software</th>
                        </tr>
                    </thead>
                    <tbody>
                        {#each comparisonRows as row}
                            <tr class="border-t border-[#010D28]/8">
                                <th class="px-5 py-4 text-[14px] font-semibold text-[#010D28]">
                                    {row.criterion}
                                </th>
                                <td class="px-5 py-4 text-[14px] leading-relaxed text-[#000A57]/72">
                                    {row.spreadsheets}
                                </td>
                                <td class="px-5 py-4 text-[14px] leading-relaxed text-[#000A57]/72">
                                    {row.genericSystems}
                                </td>
                                <td class="px-5 py-4 text-[14px] font-medium leading-relaxed text-[#010D28]">
                                    {row.f10}
                                </td>
                            </tr>
                        {/each}
                    </tbody>
                </table>
            </div>
        </div>
    </section>

    <section class="bg-[#F4F5FA] py-16 md:py-20">
        <div class="container grid gap-10 px-5 md:px-8 lg:grid-cols-2 lg:px-20">
            <div>
                <h2
                    class="text-[32px] font-semibold leading-[1.15] tracking-[-0.02em] md:text-[42px]"
                >
                    Benefícios de usar um sistema de gestão escolar completo
                </h2>
                <div class="mt-8 grid gap-3 sm:grid-cols-2">
                    {#each benefitItems as item}
                        <div class="flex items-center gap-3 rounded-[8px] bg-white p-4">
                            <CheckCircle2 class="shrink-0 text-[#EA6D0B]" size={20} />
                            <span class="text-[15px] font-semibold">{item}</span>
                        </div>
                    {/each}
                </div>
            </div>

            <div>
                <h2
                    class="text-[32px] font-semibold leading-[1.15] tracking-[-0.02em] md:text-[42px]"
                >
                    Como escolher o melhor sistema de gestão escolar?
                </h2>
                <ul class="mt-8 grid gap-3">
                    {#each choiceItems as item}
                        <li class="flex items-start gap-3 text-[16px] leading-relaxed">
                            <CheckCircle2 class="mt-0.5 shrink-0 text-[#EA6D0B]" size={20} />
                            <span>{item}</span>
                        </li>
                    {/each}
                </ul>
            </div>
        </div>
    </section>

    <section class="bg-[#010D28] py-16 text-white md:py-20">
        <div class="container px-5 text-center md:px-8 lg:px-20">
            <h2
                class="mx-auto max-w-3xl text-[34px] font-semibold leading-[1.12] tracking-[-0.02em] md:text-[48px]"
            >
                Quer organizar a gestão da sua escola com a F10?
            </h2>
            <p class="mx-auto mt-5 max-w-2xl text-[17px] leading-relaxed text-white/72">
                Solicite uma demonstração para entender como a F10 pode centralizar
                matrículas, atendimento, financeiro, comunicação e rotina escolar.
            </p>
            <button
                type="button"
                on:click={() => openSchoolManagementModal("CTA Final")}
                class="mt-8 inline-flex items-center justify-center gap-3 rounded-full bg-[#EA6D0B] px-9 py-4 text-white transition hover:brightness-110 focus:outline-none focus:ring-2 focus:ring-[#EA6D0B]/50"
            >
                <span>Solicitar demonstração</span>
                <ArrowRight size={21} />
            </button>
        </div>
    </section>

    <section class="bg-white py-16 md:py-24">
        <div class="container px-5 md:px-8 lg:px-20">
            <div class="mb-10 max-w-3xl">
                <h2
                    class="text-[32px] font-semibold leading-[1.15] tracking-[-0.02em] md:text-[42px]"
                >
                    Perguntas frequentes sobre sistema de gestão escolar
                </h2>
            </div>
            <FaqAccordion items={faqItems} />
        </div>
    </section>
</main>
