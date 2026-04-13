<!-- src/routes/solucoes/whatsapp/+page.svelte -->
<script lang="ts">
    import SeoHead from "$lib/components/SeoHead.svelte";

    import { contactModalConfig } from "$lib/stores/contactModals";
    import { showForm } from "$lib/stores/formPopup";

    import {
        ArrowUpRight,
        CheckCircle2,
        Zap,
        MessagesSquare,
        ShieldCheck,
        Workflow,
        PhoneCall,
        GraduationCap,
        BadgeDollarSign,
    } from "lucide-svelte";

    type TemplateTab = "finance" | "marketing" | "office";

    const baseUrl = "https://f10.com.br";
    const canonicalUrl = `${baseUrl}/solucoes/whatsapp`;
    const ogImage = `${baseUrl}/og/whatsapp-f10.webp`;

    const seoTitle =
        "WhatsApp para Escolas e Cursos no F10 | Atendimento Multiusuário, Matrículas e Cobranças";

    const seoDescription =
        "WhatsApp para escolas e cursos no F10: atendimento multiusuário, histórico centralizado, matrículas, cobranças, secretaria e comercial. Organize a comunicação com pais, alunos e leads sem depender do aparelho.";

    const breadcrumbItems = [
        { name: "Home", item: baseUrl },
        { name: "Soluções", item: `${baseUrl}/solucoes` },
        { name: "WhatsApp para Escolas e Cursos", item: canonicalUrl },
    ];

    let templateTab: TemplateTab = "finance";

    let templatePanelTitle = "Financeiro: cobrança automática com variáveis";
    let templatePanelText =
        "Dispare cobranças e lembretes com dados do sistema, sem copiar e colar, com histórico por responsável e rastreio de quem enviou.";

    let currentImageSrc = "/wp_template_financeiro.png";
    let nextImageSrc: string | null = null;

    let isAnimating = false;
    let pendingTab: TemplateTab | null = null;

    function getTabState(tab: TemplateTab) {
        if (tab === "finance") {
            return {
                imageSrc: "/wp_template_financeiro.png",
                panelTitle: "Financeiro: cobrança automática com variáveis",
                panelText:
                    "Dispare cobranças e lembretes com dados do sistema, sem copiar e colar, com histórico por responsável e rastreio de quem enviou.",
            };
        }

        if (tab === "marketing") {
            return {
                imageSrc: "/wp_template_marketing.png",
                panelTitle: "Captação: campanhas com personalização em escala",
                panelText:
                    "Envie ativações e mensagens comerciais com nome do lead, turma de interesse e contexto da matrícula, tudo registrado no F10.",
            };
        }

        return {
            imageSrc: "/wp_template_secretaria.png",
            panelTitle: "Secretaria: avisos e solicitações sem retrabalho",
            panelText:
                "Comunicados por turma, pedidos de documentos e confirmações com histórico centralizado, continuidade entre usuários e rastreio por perfil.",
        };
    }

    function requestTemplateTab(tab: TemplateTab) {
        if (templateTab === tab) return;

        if (isAnimating) {
            pendingTab = tab;
            return;
        }

        const next = getTabState(tab);

        templateTab = tab;
        templatePanelTitle = next.panelTitle;
        templatePanelText = next.panelText;
        nextImageSrc = next.imageSrc;
    }

    function handleNextLoaded() {
        if (!nextImageSrc) return;

        isAnimating = true;

        window.setTimeout(() => {
            currentImageSrc = nextImageSrc as string;
            nextImageSrc = null;
            isAnimating = false;

            if (pendingTab) {
                const nextTab = pendingTab;
                pendingTab = null;
                requestTemplateTab(nextTab);
            }
        }, 320);
    }

    // HERO
    let pillText = "WhatsApp para escolas e cursos";
    let title =
        "WhatsApp para escolas e cursos\ncom atendimento compartilhado\ne histórico no F10";
    let subtitle =
        "Comunicação com pais, responsáveis, alunos e leads com atendimento multiusuário, histórico centralizado e gestão sem depender do aparelho — integrado direto no F10.";

    let primaryCtaLabel = "Quero ver funcionando na minha escola";
    let secondaryCtaLabel = "Como funciona";
    let secondaryCtaHref = "#como-funciona";

    // SECTION 2
    let section2Title =
        "WhatsApp para escolas e cursos, direto na plataforma F10";
    let section2Text =
        "Centralize a comunicação com pais, responsáveis, alunos e leads em um canal compartilhado pela equipe. No F10, o WhatsApp deixa de depender do aparelho e passa a fazer parte do fluxo da instituição: secretaria escolar, financeiro escolar, matrículas, comercial e relacionamento.";

    let section2Bullets: string[] = [
        "Atendimento multiusuário com histórico centralizado no F10",
        "Gestão acompanha conversas sem depender do aparelho",
        "Múltiplos números por usuário e múltiplos usuários por número",
    ];

    // FAQ
    let faqPill = "Perguntas frequentes";
    let faqTitle = "Perguntas frequentes\nsobre WhatsApp integrado\nno F10";
    let faqText =
        "Aqui estão respostas objetivas sobre operação multiusuário, histórico centralizado, gestão por usuário, templates e automação para a rotina da escola ou curso.";

    let faqs: Array<{ q: string; a: string }> = [
        {
            q: "O atendimento depende de alguém ficar com o celular?",
            a: "Não. O WhatsApp funciona dentro do F10 como canal de atendimento. Nem quem enviou, nem colegas do setor, nem coordenação, nem gerente precisam ficar com o aparelho para acompanhar as conversas.",
        },
        {
            q: "Mais de um usuário pode atender no mesmo número?",
            a: "Sim. Um mesmo número pode ser acessado por múltiplos usuários, com visibilidade por perfil e continuidade do atendimento entre pessoas do mesmo setor.",
        },
        {
            q: "Um usuário pode operar mais de um número?",
            a: "Sim. Um mesmo usuário pode trabalhar com múltiplos números conforme a estrutura da escola ou curso e as permissões definidas.",
        },
        {
            q: "Como saber quem enviou cada mensagem?",
            a: "O histórico fica identificado por usuário dentro do F10. Assim, a instituição sabe quem respondeu, quando respondeu e consegue manter gestão e auditoria do atendimento.",
        },
        {
            q: "O gerente consegue acompanhar os chats sem pegar o telefone?",
            a: "Sim. A gerência pode visualizar conversas e acompanhar o atendimento diretamente pelo sistema, sem depender de pedir o aparelho a alguém da equipe.",
        },
        {
            q: "O WhatsApp do F10 serve para cursos também?",
            a: "Sim. A solução atende escolas, cursos livres, escolas de idiomas, cursos técnicos, pré-vestibulares e outras instituições de ensino que precisam organizar comunicação, matrícula, secretaria, financeiro e comercial.",
        },
        {
            q: "Posso usar o WhatsApp no financeiro escolar?",
            a: "Sim. O F10 permite organizar cobranças, lembretes, envio de links de pagamento, confirmações e histórico por responsável, com rastreio de quem enviou cada mensagem.",
        },
        {
            q: "Posso usar o WhatsApp na secretaria escolar?",
            a: "Sim. A secretaria pode usar o WhatsApp para avisos, documentos pendentes, confirmações, matrícula, renovação e comunicação recorrente com pais, responsáveis e alunos.",
        },
        {
            q: "O histórico fica salvo no sistema?",
            a: "Sim. As conversas ficam centralizadas no F10, facilitando continuidade do atendimento, auditoria, acompanhamento da gestão e operação compartilhada pela equipe.",
        },
        {
            q: "Já existem templates e envios automáticos?",
            a: "Os templates já fazem parte da apresentação da solução e os envios automáticos estão em implantação. A proposta é permitir cobranças, lembretes, avisos e comunicações recorrentes com contexto do sistema.",
        },
    ];

    const faqItems = faqs.map((item) => ({
        question: item.q,
        answer: item.a,
    }));

    const softwareApplicationData = {
        name: "F10 WhatsApp para Escolas e Cursos",
        description:
            "Solução de WhatsApp integrada ao F10 para escolas e cursos, com atendimento multiusuário, histórico centralizado, matrículas, secretaria, financeiro e comercial.",
        url: canonicalUrl,
        brandName: "F10",
        applicationCategory: "BusinessApplication",
        applicationSubCategory: "WhatsApp para Escolas e Cursos",
        operatingSystem: "Web",
        providerName: "F10",
        publisherName: "F10",
        featureList: [
            "Atendimento multiusuário",
            "Histórico centralizado",
            "Identificação por usuário",
            "WhatsApp para secretaria escolar",
            "WhatsApp para financeiro escolar",
            "WhatsApp para matrículas",
            "Templates de mensagens",
            "Gestão sem depender do aparelho",
        ],
        image: [ogImage],
    };

    // CTA final
    let section5Title =
        "Conecte-se com pais, alunos e leads em\ntempo real, com visão compartilhada e histórico central";
    let section5Subtitle =
        "Potencialize o atendimento com mensagens, templates e organização operacional:\n";
    let section5SubtitleBold =
        "cobranças, matrículas, secretaria e comercial — direto no F10.";
    let section5CtaLabel = "Quero uma demonstração do WhatsApp no F10";

    // Casos de uso
    const section6Pill = "Casos de uso";
    const section6Title =
        "O que você organiza e acelera com WhatsApp na sua escola ou curso";
    const section6Text =
        "Modelos prontos e fluxos integrados aos módulos do F10 para instituições de ensino. Você reduz retrabalho, mantém contexto em cada conversa e evita depender do aparelho para continuar o atendimento.";

    const useCases: Array<{
        title: string;
        text: string;
        icon: "billing" | "enrollment" | "office" | "sales";
    }> = [
        {
            title: "Cobranças e financeiro",
            text: "Lembretes, links de pagamento, negociações e confirmações com histórico por responsável e rastreio de envio.",
            icon: "billing",
        },
        {
            title: "Matrículas e renovações",
            text: "Convites, confirmações e checklist de documentos com continuidade entre usuários e setores.",
            icon: "enrollment",
        },
        {
            title: "Secretaria e avisos",
            text: "Comunicados por turma, eventos, documentos pendentes e recados urgentes com histórico centralizado.",
            icon: "office",
        },
        {
            title: "Comercial e atendimento",
            text: "Captação, follow-up e suporte com contexto do aluno ou prospect e identificação de quem enviou cada mensagem.",
            icon: "sales",
        },
    ];

    // Como funciona
    const section7Pill = "Como funciona";
    const section7Title =
        "Integração nativa no F10, com operação real de escola";
    const section7Steps: Array<{
        title: string;
        text: string;
        icon: "zap" | "workflow" | "messages" | "shield";
    }> = [
        {
            title: "Configuração de usuários, números e permissões",
            text: "Definimos quem acessa cada número, quais setores acompanham as conversas e como a gestão visualiza o atendimento.",
            icon: "zap",
        },
        {
            title: "Conexão com módulos do F10",
            text: "Financeiro, matrículas, secretaria e comercial passam a usar o mesmo canal com contexto de aluno, responsável e turma.",
            icon: "workflow",
        },
        {
            title: "Templates e rotina operacional",
            text: "A escola padroniza mensagens, reduz retrabalho e mantém rastreio de quem enviou cada atendimento.",
            icon: "messages",
        },
        {
            title: "Histórico centralizado e continuidade",
            text: "As conversas ficam registradas no F10 para que outros usuários e a gestão acompanhem e deem sequência ao atendimento.",
            icon: "shield",
        },
    ];

    // CTA intermediário
    const midCtaPill = "Demonstração rápida";
    const midCtaTitle =
        "Quer ver o WhatsApp funcionando no seu fluxo\n(financeiro, matrícula, secretaria e atendimento)?";
    const midCtaText =
        "Em poucos minutos você entende como o WhatsApp vira parte do F10: atendimento compartilhado, rastreio por usuário, histórico centralizado e templates prontos para a rotina da escola.";
    const midCtaPrimaryLabel = "Quero uma demonstração";

    function iconForUseCase(
        kind: "billing" | "enrollment" | "office" | "sales",
    ) {
        if (kind === "billing") return BadgeDollarSign;
        if (kind === "enrollment") return GraduationCap;
        if (kind === "office") return PhoneCall;
        return MessagesSquare;
    }

    function iconForStep(kind: "zap" | "workflow" | "messages" | "shield") {
        if (kind === "zap") return Zap;
        if (kind === "workflow") return Workflow;
        if (kind === "messages") return MessagesSquare;
        return ShieldCheck;
    }

    function openWhatsAppModal(fold: number) {
        contactModalConfig.set({
            defaultMessage:
                "Quero agendar uma demonstração do WhatsApp para minha escola ou curso",
            product: "F10 – WhatsApp",
            subSource: `Modal WhatsApp – dobra ${fold}`,
            leadDescription: "Contato iniciado pelo formulário WhatsApp.",
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

<!-- =========================
  HERO
========================= -->
<section id="home" class="relative isolate overflow-hidden">
    <div class="absolute inset-0 -z-10">
        <div class="absolute inset-0" style="background-color:#005843;"></div>

        <div
            class="absolute inset-0 bg-repeat opacity-100"
            style="background-image:url('/wp_patern.svg'); background-size: 760px auto;"
            aria-hidden="true"
        ></div>

        <div
            class="absolute inset-0 bg-gradient-to-b from-black/10 via-black/0 to-black/12"
            aria-hidden="true"
        ></div>
    </div>

    <div class="relative">
        <div
            class="pointer-events-none absolute left-[14%] top-[18%] z-10 hidden sm:block"
        >
            <img
                src="/wp_icon_book.webp"
                alt="Ícone livro"
                class="h-[76px] min-w-[76px]"
            />
        </div>

        <div
            class="pointer-events-none absolute right-[10%] top-[20%] z-10 hidden sm:block"
        >
            <img
                src="/wp_icon_code.webp"
                alt="Ícone código"
                class="h-[76px] min-w-[76px]"
            />
        </div>

        <div
            class="pointer-events-none absolute left-[18%] top-[54%] z-10 hidden sm:block"
        >
            <img
                src="/wp_icon_school.webp"
                alt="Ícone escola"
                class="h-[70px] min-w-[70px]"
            />
        </div>

        <div
            class="pointer-events-none absolute right-[24%] top-[52%] z-10 hidden sm:block"
        >
            <img
                src="/wp_icon_heart.webp"
                alt="Ícone coração"
                class="h-[70px] min-w-[70px]"
            />
        </div>

        <div
            class="pointer-events-none absolute right-[14%] top-[70%] z-10 hidden sm:block"
        >
            <img
                src="/wp_icon_like.webp"
                alt="Ícone like"
                class="h-[76px] min-w-[76px]"
            />
        </div>

        <div class="mx-auto max-w-[1200px] px-4 sm:px-6">
            <div
                class="relative flex min-h-[857px] items-center justify-center pb-16"
            >
                <div class="w-full">
                    <div class="flex justify-center">
                        <div
                            class="inline-flex h-9 items-center justify-center rounded-full bg-white/20 px-8 py-1 text-base font-medium text-white/95 ring-1 ring-white/10 backdrop-blur-md"
                        >
                            {pillText}
                        </div>
                    </div>

                    <h1
                        class="mx-auto mt-10 max-w-[1020px] text-center font-medium tracking-[-0.03em] text-white"
                    >
                        <span
                            class="block text-[44px] leading-[0.98] sm:text-[72px] sm:leading-[0.98] lg:text-[90px] lg:leading-[0.96]"
                        >
                            {title}
                        </span>
                    </h1>

                    <p
                        class="mx-auto mt-8 max-w-[780px] text-center text-base font-medium leading-relaxed text-white/90 sm:text-lg"
                    >
                        {subtitle}
                    </p>

                    <div
                        class="relative mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row sm:gap-6"
                    >
                        <div
                            class="pointer-events-none absolute ml-[-40px] top-1/2 hidden -translate-y-1/2 sm:block md:left-[12%] lg:left-[18%]"
                        >
                            <img
                                src="/wp_message_text.svg"
                                alt="Anotação"
                                class="h-24 w-auto"
                            />
                        </div>

                        <button
                            on:click={() => openWhatsAppModal(1)}
                            class="inline-flex h-14 items-center justify-center rounded-full px-10 text-base font-bold text-white shadow-sm transition hover:brightness-110 focus:outline-none focus:ring-2 focus:ring-white/30"
                            style="background-color:#00A13A;"
                        >
                            {primaryCtaLabel}
                        </button>

                        <a
                            href={secondaryCtaHref}
                            class="inline-flex h-14 items-center justify-center rounded-full border border-white px-10 text-base font-bold text-white/95 transition hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-white/30"
                        >
                            {secondaryCtaLabel}
                        </a>
                    </div>

                    <div
                        class="mx-auto mt-10 max-w-[980px] text-center text-sm text-white/75"
                    >
                        WhatsApp para escolas e cursos integrado ao F10:
                        atendimento multiusuário, comunicação com pais,
                        responsáveis, alunos e leads, cobranças, matrículas,
                        secretaria, financeiro e comercial, com histórico
                        centralizado, rastreio por usuário e operação sem
                        depender do aparelho.
                    </div>
                </div>
            </div>
        </div>
    </div>
</section>

<!-- =========================
  SECTION - VISÃO COMPARTILHADA
========================= -->
<section id="visao-compartilhada" class="bg-[#F8FAFC]">
    <div class="mx-auto max-w-[1200px] px-4 py-16 sm:px-6 sm:py-20">
        <div class="mx-auto max-w-[900px] text-center">
            <div class="flex justify-center">
                <div
                    class="inline-flex items-center gap-2 rounded-full bg-emerald-100 px-6 py-2 text-sm font-semibold text-emerald-950 ring-1 ring-emerald-200"
                >
                    <span
                        class="inline-flex h-2 w-2 rounded-full bg-emerald-700"
                    ></span>
                    Atendimento compartilhado
                </div>
            </div>

            <h2
                class="mt-6 text-balance text-[40px] font-semibold leading-[1.05] tracking-[-0.02em] text-slate-900 sm:text-[52px]"
            >
                Uma pessoa envia. O setor inteiro acompanha.
            </h2>

            <p
                class="mx-auto mt-6 max-w-[760px] text-pretty text-base leading-relaxed text-slate-600 sm:text-lg"
            >
                O WhatsApp deixa de ficar preso no aparelho de alguém. A
                mensagem pode ser enviada por um usuário, mas o histórico
                continua visível no F10 para os demais colegas do setor e para a
                gestão, conforme as permissões da escola ou curso.
            </p>
        </div>

        <div class="mt-10 grid gap-6 lg:grid-cols-12 lg:items-stretch">
            <div class="flex lg:col-span-7">
                <div
                    class="h-full w-full overflow-hidden rounded-[30px] bg-white ring-1 ring-slate-200 shadow-[0_20px_60px_rgba(2,6,23,0.08)]"
                >
                    <div
                        class="border-b border-slate-200 bg-slate-50 px-5 py-4"
                    >
                        <div class="text-sm font-semibold text-slate-900">
                            Exemplo de operação no dia a dia
                        </div>
                        <div class="mt-1 text-sm text-slate-500">
                            O atendimento começa com um usuário e continua
                            disponível para o setor.
                        </div>
                    </div>

                    <div class="p-4 sm:p-5">
                        <div
                            class="overflow-hidden rounded-[28px] border border-slate-200 bg-[#E7F7ED] shadow-inner"
                        >
                            <div
                                class="flex items-center justify-between bg-emerald-700 px-4 py-3 text-white sm:px-5"
                            >
                                <div class="flex min-w-0 items-center gap-3">
                                    <div
                                        class="flex h-11 w-11 items-center justify-center rounded-full bg-white/15 text-sm font-bold"
                                    >
                                        AS
                                    </div>

                                    <div class="min-w-0">
                                        <div
                                            class="truncate text-sm font-semibold sm:text-base"
                                        >
                                            Ana Souza · Responsável
                                        </div>
                                        <div
                                            class="text-[12px] text-emerald-50/90 sm:text-xs"
                                        >
                                            Atendimento visível para Financeiro
                                            e Gestão
                                        </div>
                                    </div>
                                </div>

                                <div class="hidden items-center gap-2 sm:flex">
                                    <span
                                        class="h-2.5 w-2.5 rounded-full bg-emerald-200"
                                    ></span>
                                    <span
                                        class="text-xs font-medium text-emerald-50/90"
                                        >online</span
                                    >
                                </div>
                            </div>

                            <div
                                class="space-y-3 bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.55),transparent_36%),linear-gradient(180deg,rgba(255,255,255,0.28),rgba(255,255,255,0.12))] px-4 py-5 sm:px-5"
                            >
                                <div class="flex justify-start">
                                    <div
                                        class="max-w-[82%] rounded-[20px] rounded-tl-md bg-white px-4 py-3 text-sm leading-relaxed text-slate-700 shadow-[0_2px_10px_rgba(15,23,42,0.06)]"
                                    >
                                        <div>
                                            Bom dia. A mensalidade de março já
                                            está disponível?
                                        </div>
                                        <div
                                            class="mt-1 text-right text-[11px] text-slate-400"
                                        >
                                            09:14
                                        </div>
                                    </div>
                                </div>

                                <div class="flex justify-end">
                                    <div
                                        class="max-w-[82%] rounded-[20px] rounded-tr-md bg-[#DCF8C6] px-4 py-3 text-sm leading-relaxed text-slate-800 shadow-[0_2px_10px_rgba(15,23,42,0.05)]"
                                    >
                                        <div>
                                            Olá, Ana. Sim, já está disponível.
                                            Posso te enviar o link de pagamento
                                            por aqui.
                                        </div>
                                        <div
                                            class="mt-1 flex items-center justify-end gap-1 text-[11px] text-slate-500"
                                        >
                                            <span>09:15</span>
                                            <span class="text-emerald-700"
                                                >✓✓</span
                                            >
                                        </div>
                                    </div>
                                </div>

                                <div class="flex justify-start">
                                    <div
                                        class="max-w-[82%] rounded-[20px] rounded-tl-md bg-white px-4 py-3 text-sm leading-relaxed text-slate-700 shadow-[0_2px_10px_rgba(15,23,42,0.06)]"
                                    >
                                        <div>
                                            Pode enviar. Também preciso do
                                            comprovante da parcela anterior.
                                        </div>
                                        <div
                                            class="mt-1 text-right text-[11px] text-slate-400"
                                        >
                                            09:16
                                        </div>
                                    </div>
                                </div>

                                <div class="flex justify-center py-1">
                                    <div
                                        class="rounded-full bg-white/80 px-3 py-1 text-[11px] font-medium text-slate-500 ring-1 ring-slate-200"
                                    >
                                        Juliana iniciou o atendimento · Camila
                                        pode continuar no mesmo histórico
                                    </div>
                                </div>

                                <div class="flex justify-end">
                                    <div
                                        class="max-w-[82%] rounded-[20px] rounded-tr-md bg-[#DCF8C6] px-4 py-3 text-sm leading-relaxed text-slate-800 shadow-[0_2px_10px_rgba(15,23,42,0.05)]"
                                    >
                                        <div>
                                            Perfeito. Já te enviei o link e
                                            também vou anexar o comprovante da
                                            parcela anterior neste mesmo
                                            atendimento.
                                        </div>
                                        <div
                                            class="mt-2 rounded-2xl bg-white/70 px-3 py-2 text-[12px] text-slate-600 ring-1 ring-emerald-200"
                                        >
                                            <span
                                                class="font-semibold text-slate-800"
                                                >Enviado por:</span
                                            >
                                            Camila · Financeiro
                                        </div>
                                        <div
                                            class="mt-1 flex items-center justify-end gap-1 text-[11px] text-slate-500"
                                        >
                                            <span>09:18</span>
                                            <span class="text-emerald-700"
                                                >✓✓</span
                                            >
                                        </div>
                                    </div>
                                </div>

                                <div class="flex justify-start">
                                    <div
                                        class="max-w-[82%] rounded-[20px] rounded-tl-md bg-white px-4 py-3 text-sm leading-relaxed text-slate-700 shadow-[0_2px_10px_rgba(15,23,42,0.06)]"
                                    >
                                        <div>
                                            Recebi. Obrigada pelo retorno.
                                        </div>
                                        <div
                                            class="mt-1 text-right text-[11px] text-slate-400"
                                        >
                                            09:19
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div
                                class="flex flex-wrap items-center justify-between gap-3 border-t border-emerald-200 bg-white px-4 py-4 sm:px-5"
                            >
                                <div
                                    class="flex items-center gap-2 text-xs text-slate-500 sm:text-sm"
                                >
                                    <span
                                        class="inline-flex h-2.5 w-2.5 rounded-full bg-emerald-500"
                                    ></span>
                                    Histórico compartilhado entre usuários autorizados
                                </div>

                                <div class="flex flex-wrap items-center gap-2">
                                    <span
                                        class="rounded-full bg-emerald-100 px-3 py-1 text-[12px] font-semibold text-emerald-900 ring-1 ring-emerald-200"
                                    >
                                        Juliana
                                    </span>
                                    <span
                                        class="rounded-full bg-slate-100 px-3 py-1 text-[12px] font-semibold text-slate-700 ring-1 ring-slate-200"
                                    >
                                        Camila
                                    </span>
                                    <span
                                        class="rounded-full bg-slate-100 px-3 py-1 text-[12px] font-semibold text-slate-700 ring-1 ring-slate-200"
                                    >
                                        Gestão
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div class="flex lg:col-span-5">
                <div
                    class="flex h-full w-full flex-col justify-between rounded-3xl bg-white p-6 ring-1 ring-slate-200 shadow-[0_12px_30px_rgba(2,6,23,0.06)] lg:p-7"
                >
                    <div>
                        <div class="flex items-start gap-3">
                            <span
                                class="inline-flex h-11 min-w-11 items-center justify-center rounded-xl bg-emerald-700 text-white"
                            >
                                <ShieldCheck
                                    class="h-5 w-5"
                                    aria-hidden="true"
                                />
                            </span>
                            <div>
                                <div
                                    class="text-base font-semibold text-slate-900"
                                >
                                    Gestão sem depender do aparelho
                                </div>
                                <p
                                    class="mt-2 text-sm leading-relaxed text-slate-600"
                                >
                                    O gestor visualiza os chats em andamento,
                                    acompanha histórico, verifica quem respondeu
                                    e mantém continuidade no atendimento sem
                                    pedir o telefone para ninguém.
                                </p>
                            </div>
                        </div>
                    </div>

                    <div class="my-7 flex-1">
                        <div class="relative pl-1">
                            <div
                                class="absolute left-[16px] top-2 bottom-2 border-l-2 border-dotted border-emerald-200"
                            ></div>

                            <div class="relative space-y-6">
                                <div class="relative pl-10">
                                    <CheckCircle2
                                        class="absolute left-0 top-0.5 h-7 w-7 bg-emerald-50 text-emerald-700 rounded-full p-1"
                                    />
                                    <div
                                        class="text-sm font-semibold text-slate-900"
                                    >
                                        Visualização compartilhada por setor
                                    </div>
                                    <div
                                        class="mt-1 text-sm leading-relaxed text-slate-600"
                                    >
                                        Atendentes, financeiro e gestão
                                        acompanham o mesmo histórico conforme as
                                        permissões definidas no F10.
                                    </div>
                                </div>

                                <div class="relative pl-10">
                                    <CheckCircle2
                                        class="absolute left-0 top-0.5 h-7 w-7 bg-emerald-50 text-emerald-700 rounded-full p-1"
                                    />
                                    <div
                                        class="text-sm font-semibold text-slate-900"
                                    >
                                        Identificação clara de quem respondeu
                                    </div>
                                    <div
                                        class="mt-1 text-sm leading-relaxed text-slate-600"
                                    >
                                        Cada envio fica vinculado ao usuário
                                        responsável, facilitando controle,
                                        rastreabilidade e acompanhamento da
                                        operação.
                                    </div>
                                </div>

                                <div class="relative pl-10">
                                    <CheckCircle2
                                        class="absolute left-0 top-0.5 h-7 w-7 bg-emerald-50 text-emerald-700 rounded-full p-1"
                                    />
                                    <div
                                        class="text-sm font-semibold text-slate-900"
                                    >
                                        Continuidade sem troca de aparelho
                                    </div>
                                    <div
                                        class="mt-1 text-sm leading-relaxed text-slate-600"
                                    >
                                        Se outro colaborador assumir o
                                        atendimento, ele continua do ponto certo
                                        sem perder contexto nem depender do
                                        celular de alguém.
                                    </div>
                                </div>

                                <div class="relative pl-10">
                                    <CheckCircle2
                                        class="absolute left-0 top-0.5 h-7 w-7 bg-emerald-50 text-emerald-700 rounded-full p-1"
                                    />
                                    <div
                                        class="text-sm font-semibold text-slate-900"
                                    >
                                        Mais visão para coordenação e direção
                                    </div>
                                    <div
                                        class="mt-1 text-sm leading-relaxed text-slate-600"
                                    >
                                        A liderança acompanha o fluxo real dos
                                        atendimentos, identifica gargalos e
                                        evita conversas espalhadas em aparelhos
                                        pessoais.
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div
                        class="rounded-2xl bg-slate-50 px-4 py-4 ring-1 ring-slate-100"
                    >
                        <div class="text-sm font-semibold text-slate-900">
                            O ganho prático é simples
                        </div>
                        <p class="mt-2 text-sm leading-relaxed text-slate-600">
                            O atendimento continua no sistema, com histórico,
                            contexto e responsabilidade registrada. A operação
                            deixa de depender de um aparelho específico.
                        </p>
                    </div>

                    <div class="mt-6 border-t border-slate-200 pt-6">
                        <button
                            on:click={() => openWhatsAppModal(11)}
                            class="inline-flex h-12 w-full items-center justify-center rounded-full bg-emerald-700 px-8 text-base font-bold text-white shadow-sm transition hover:brightness-110 focus:outline-none focus:ring-2 focus:ring-emerald-300"
                        >
                            Quero ver esse fluxo
                            <ArrowUpRight
                                class="ml-2 min-h-5 min-w-5"
                                aria-hidden="true"
                            />
                        </button>
                    </div>
                </div>
            </div>
        </div>
    </div>
</section>
<!-- =========================
  SECTION - MULTIUSUÁRIO / MULTINÚMERO
========================= -->
<section id="multiusuario" class="bg-white overflow-hidden relative">
    <div
        class="absolute inset-0 bg-repeat opacity-5"
        style="background-image:url('/patern_whatsapp.png'); background-size: 700px auto;"
        aria-hidden="true"
    ></div>

    <div class="relative mx-auto max-w-[1200px] px-4 py-16 sm:px-6 sm:py-20">
        <div class="mx-auto max-w-[920px] text-center">
            <div class="flex justify-center">
                <div
                    class="inline-flex items-center gap-2 rounded-full bg-emerald-700 px-6 py-2 text-sm font-semibold text-white ring-1 ring-emerald-200"
                >
                    <span class="inline-flex h-2 w-2 rounded-full bg-white"
                    ></span>
                    Multiusuário e multinúmero
                </div>
            </div>

            <h2
                class="mt-6 whitespace-pre-line text-balance text-[40px] font-semibold leading-[1.05] tracking-[-0.02em] text-slate-900 sm:text-[52px]"
            >
                Sua operação não fica presa em uma pessoa nem em um único número
            </h2>

            <p
                class="mx-auto mt-6 max-w-[820px] text-pretty text-base leading-relaxed text-slate-600 sm:text-lg"
            >
                No F10, um mesmo número pode ser acessado por múltiplos usuários
                e um mesmo usuário pode operar múltiplos números. Cada envio
                fica identificado no histórico, com visibilidade por perfil e
                continuidade entre setores.
            </p>
        </div>

        <div class="mt-10 grid gap-8 lg:grid-cols-12 lg:items-start">
            <div class="lg:col-span-6">
                <div class="grid gap-4 sm:grid-cols-2">
                    <div
                        class="rounded-2xl bg-white p-6 ring-1 ring-slate-200 shadow-[0_12px_30px_rgba(2,6,23,0.06)]"
                    >
                        <div class="flex items-start gap-3">
                            <span
                                class="inline-flex h-10 min-w-10 items-center justify-center rounded-xl bg-emerald-700 ring-1 ring-emerald-600"
                            >
                                <MessagesSquare
                                    class="h-5 w-5 text-white"
                                    aria-hidden="true"
                                />
                            </span>
                            <div class="min-w-0">
                                <div
                                    class="text-base font-semibold text-slate-900"
                                >
                                    1 número com vários usuários
                                </div>
                                <p
                                    class="mt-2 text-sm leading-relaxed text-slate-600"
                                >
                                    Secretaria, financeiro ou comercial podem
                                    compartilhar o mesmo número sem disputa de
                                    aparelho.
                                </p>
                            </div>
                        </div>
                    </div>

                    <div
                        class="rounded-2xl bg-white p-6 ring-1 ring-slate-200 shadow-[0_12px_30px_rgba(2,6,23,0.06)]"
                    >
                        <div class="flex items-start gap-3">
                            <span
                                class="inline-flex h-10 min-w-10 items-center justify-center rounded-xl bg-emerald-700 ring-1 ring-emerald-600"
                            >
                                <Workflow
                                    class="h-5 w-5 text-white"
                                    aria-hidden="true"
                                />
                            </span>
                            <div class="min-w-0">
                                <div
                                    class="text-base font-semibold text-slate-900"
                                >
                                    1 usuário com vários números
                                </div>
                                <p
                                    class="mt-2 text-sm leading-relaxed text-slate-600"
                                >
                                    O mesmo colaborador pode atuar em números
                                    diferentes conforme a rotina e a permissão
                                    configurada.
                                </p>
                            </div>
                        </div>
                    </div>

                    <div
                        class="rounded-2xl bg-white p-6 ring-1 ring-slate-200 shadow-[0_12px_30px_rgba(2,6,23,0.06)]"
                    >
                        <div class="flex items-start gap-3">
                            <span
                                class="inline-flex h-10 min-w-10 items-center justify-center rounded-xl bg-emerald-700 ring-1 ring-emerald-600"
                            >
                                <ShieldCheck
                                    class="h-5 w-5 text-white"
                                    aria-hidden="true"
                                />
                            </span>
                            <div class="min-w-0">
                                <div
                                    class="text-base font-semibold text-slate-900"
                                >
                                    Identificação por usuário
                                </div>
                                <p
                                    class="mt-2 text-sm leading-relaxed text-slate-600"
                                >
                                    Cada mensagem fica vinculada ao usuário que
                                    enviou, facilitando gestão, auditoria e
                                    continuidade.
                                </p>
                            </div>
                        </div>
                    </div>

                    <div
                        class="rounded-2xl bg-white p-6 ring-1 ring-slate-200 shadow-[0_12px_30px_rgba(2,6,23,0.06)]"
                    >
                        <div class="flex items-start gap-3">
                            <span
                                class="inline-flex h-10 min-w-10 items-center justify-center rounded-xl bg-emerald-700 ring-1 ring-emerald-600"
                            >
                                <CheckCircle2
                                    class="h-5 w-5 text-white"
                                    aria-hidden="true"
                                />
                            </span>
                            <div class="min-w-0">
                                <div
                                    class="text-base font-semibold text-slate-900"
                                >
                                    Gerência com visão central
                                </div>
                                <p
                                    class="mt-2 text-sm leading-relaxed text-slate-600"
                                >
                                    O gerente acompanha conversas sem depender
                                    de pedir o aparelho a um atendente.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>

                <div
                    class="mt-6 overflow-hidden rounded-2xl ring-1 ring-emerald-800/30"
                >
                    <div class="relative bg-emerald-700">
                        <div
                            class="absolute inset-0 bg-repeat opacity-20"
                            style="background-image:url('/patern_whatsapp.png'); background-size: 700px auto;"
                            aria-hidden="true"
                        ></div>

                        <div class="relative p-6">
                            <div class="flex items-start gap-3">
                                <span
                                    class="inline-flex min-h-10 min-w-10 items-center justify-center rounded-xl bg-white text-emerald-800 ring-1 ring-emerald-200"
                                >
                                    <ShieldCheck
                                        class="h-5 w-5"
                                        aria-hidden="true"
                                    />
                                </span>

                                <div class="min-w-0">
                                    <div
                                        class="text-base font-semibold text-white"
                                    >
                                        Sem aparelho como ponto de falha
                                    </div>

                                    <p
                                        class="mt-2 text-sm leading-relaxed text-white"
                                    >
                                        O WhatsApp passa a funcionar como canal
                                        operacional do F10. Se alguém sair,
                                        trocar de função ou estiver ausente, o
                                        histórico e a continuidade do
                                        atendimento continuam disponíveis no
                                        sistema.
                                    </p>

                                    <div class="mt-4 flex flex-wrap gap-2">
                                        <span
                                            class="rounded-full bg-white px-3 py-1.5 text-[12px] font-semibold text-emerald-900 ring-1 ring-emerald-200"
                                        >
                                            Multiusuário
                                        </span>
                                        <span
                                            class="rounded-full bg-white px-3 py-1.5 text-[12px] font-semibold text-emerald-900 ring-1 ring-emerald-200"
                                        >
                                            Multinúmero
                                        </span>
                                        <span
                                            class="rounded-full bg-white px-3 py-1.5 text-[12px] font-semibold text-emerald-900 ring-1 ring-emerald-200"
                                        >
                                            Histórico central
                                        </span>
                                        <span
                                            class="rounded-full bg-white px-3 py-1.5 text-[12px] font-semibold text-emerald-900 ring-1 ring-emerald-200"
                                        >
                                            Gestão por usuário
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <div class="mt-8 flex flex-col items-start gap-3 sm:flex-row">
                    <button
                        on:click={() => openWhatsAppModal(10)}
                        class="inline-flex h-12 items-center justify-center rounded-full bg-emerald-700 px-8 text-base font-bold text-white shadow-sm transition hover:brightness-110 focus:outline-none focus:ring-2 focus:ring-emerald-300"
                    >
                        Quero mais
                        <ArrowUpRight
                            class="ml-2 min-h-5 min-w-5"
                            aria-hidden="true"
                        />
                    </button>

                    <a
                        href="#faq"
                        class="inline-flex h-12 items-center justify-center rounded-full border border-slate-200 bg-white px-8 text-base font-bold text-slate-900 transition hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-slate-200"
                    >
                        Ver perguntas frequentes
                    </a>
                </div>
            </div>

            <div class="lg:col-span-6">
                <div class="mx-auto max-w-[560px]">
                    <div class="overflow-hidden">
                        <img
                            src="/whatsApp_sem_celular.webp"
                            alt="Atendimento multiusuário e multinúmero no F10"
                            class="h-auto w-full select-none"
                            draggable="false"
                        />
                    </div>

                    <div class="mt-4 text-center text-sm text-slate-500">
                        Um número pode atender vários usuários. Um usuário pode
                        operar vários números. Tudo com identificação de envio.
                    </div>
                </div>
            </div>
        </div>
    </div>
</section>

<!-- =========================
  SECTION 2
========================= -->
<section id="como-funciona" class="bg-white">
    <div class="mx-auto max-w-[1200px] px-4 py-16 sm:px-6 sm:py-20">
        <div class="grid gap-12 lg:grid-cols-12 lg:items-center">
            <div class="lg:col-span-6">
                <h2
                    class="text-balance text-[40px] font-semibold leading-[1.05] tracking-[-0.02em] text-slate-900 sm:text-[52px]"
                >
                    {section2Title}
                </h2>

                <p
                    class="mt-6 max-w-[560px] text-pretty text-base leading-relaxed text-slate-500 sm:text-lg"
                >
                    {section2Text}
                </p>

                <ul class="mt-8 space-y-4">
                    {#each section2Bullets as item}
                        <li class="flex gap-3">
                            <span
                                class="mt-0.5 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-50"
                            >
                                <CheckCircle2
                                    class="min-h-5 min-w-5 text-emerald-700"
                                    aria-hidden="true"
                                />
                            </span>
                            <span class="text-base font-medium text-slate-800"
                                >{item}</span
                            >
                        </li>
                    {/each}
                </ul>
            </div>

            <div class="lg:col-span-6">
                <div class="relative mx-auto max-w-[560px]">
                    <div
                        class="pointer-events-none absolute left-20 top-8 hidden lg:block"
                        aria-hidden="true"
                    >
                        <img
                            src="/wp_icon_code.webp"
                            alt="Ícone flutuante"
                            class="max-h-[88px] max-w-[88px] drop-shadow-[0_10px_26px_rgba(0,0,0,0.18)]"
                        />
                    </div>

                    <div
                        class="pointer-events-none absolute left-10 top-1/2 hidden -translate-y-1/2 lg:block"
                        aria-hidden="true"
                    >
                        <img
                            src="/wp_icon_money.webp"
                            alt="Ícone flutuante"
                            class="max-h-[88px] max-w-[88px] drop-shadow-[0_10px_26px_rgba(0,0,0,0.18)]"
                        />
                    </div>

                    <div
                        class="pointer-events-none absolute right-6 top-10 hidden lg:block"
                        aria-hidden="true"
                    >
                        <img
                            src="/wp_icon_like.webp"
                            alt="Ícone flutuante"
                            class="max-h-[88px] max-w-[88px] drop-shadow-[0_10px_26px_rgba(0,0,0,0.18)]"
                        />
                    </div>

                    <div
                        class="pointer-events-none absolute right-12 bottom-32 hidden lg:block"
                        aria-hidden="true"
                    >
                        <img
                            src="/wp_icon_cap.webp"
                            alt="Ícone flutuante"
                            class="max-h-[120px] max-w-[120px] drop-shadow-[0_12px_30px_rgba(0,0,0,0.18)]"
                        />
                    </div>

                    <div class="relative mx-auto w-full">
                        <div
                            class="relative mx-auto w-[360px] sm:w-[400px] lg:w-[430px]"
                        >
                            <img
                                src="/wp_smartphone.webp"
                                alt="WhatsApp para escolas e cursos no F10"
                                class="h-auto w-full select-none"
                                draggable="false"
                            />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>
</section>

<!-- =========================
  SECTION - PARA QUEM É
========================= -->
<section id="para-quem-e" class="bg-[#F8FAFC]">
    <div class="mx-auto max-w-[1200px] px-4 py-16 sm:px-6 sm:py-20">
        <div class="grid gap-10 lg:grid-cols-12 lg:items-start">
            <div class="lg:col-span-5">
                <div
                    class="inline-flex items-center rounded-full bg-emerald-100 px-6 py-2 text-sm font-semibold text-emerald-950 ring-1 ring-emerald-200"
                >
                    Para quem é
                </div>

                <h2
                    class="mt-6 text-balance text-[40px] font-semibold leading-[1.05] tracking-[-0.02em] text-slate-900 sm:text-[52px]"
                >
                    Ideal para escolas, cursos e instituições de ensino
                </h2>

                <p
                    class="mt-6 max-w-[560px] text-pretty text-base leading-relaxed text-slate-600 sm:text-lg"
                >
                    O WhatsApp no F10 foi pensado para operações educacionais
                    que precisam organizar atendimento, matrícula, secretaria,
                    financeiro escolar e comunicação recorrente com pais,
                    responsáveis, alunos e leads.
                </p>
            </div>

            <div class="lg:col-span-7">
                <div class="grid gap-4 sm:grid-cols-2">
                    <div
                        class="rounded-2xl bg-white p-6 ring-1 ring-slate-200 shadow-[0_12px_30px_rgba(2,6,23,0.06)]"
                    >
                        <div class="text-base font-semibold text-slate-900">
                            Escolas particulares
                        </div>
                        <p class="mt-2 text-sm leading-relaxed text-slate-600">
                            Comunicação escolar pelo WhatsApp com secretaria,
                            financeiro, matrícula e gestão.
                        </p>
                    </div>

                    <div
                        class="rounded-2xl bg-white p-6 ring-1 ring-slate-200 shadow-[0_12px_30px_rgba(2,6,23,0.06)]"
                    >
                        <div class="text-base font-semibold text-slate-900">
                            Cursos livres
                        </div>
                        <p class="mt-2 text-sm leading-relaxed text-slate-600">
                            Atendimento comercial, confirmação de turmas, avisos
                            e comunicação com alunos.
                        </p>
                    </div>

                    <div
                        class="rounded-2xl bg-white p-6 ring-1 ring-slate-200 shadow-[0_12px_30px_rgba(2,6,23,0.06)]"
                    >
                        <div class="text-base font-semibold text-slate-900">
                            Escolas de idiomas
                        </div>
                        <p class="mt-2 text-sm leading-relaxed text-slate-600">
                            Rotina com responsáveis, alunos, renovação,
                            lembretes e acompanhamento de atendimento.
                        </p>
                    </div>

                    <div
                        class="rounded-2xl bg-white p-6 ring-1 ring-slate-200 shadow-[0_12px_30px_rgba(2,6,23,0.06)]"
                    >
                        <div class="text-base font-semibold text-slate-900">
                            Cursos técnicos e pré-vestibulares
                        </div>
                        <p class="mt-2 text-sm leading-relaxed text-slate-600">
                            Operação com múltiplos usuários, histórico
                            centralizado e rastreio de quem respondeu.
                        </p>
                    </div>
                </div>

                <div class="mt-6 rounded-2xl bg-emerald-700 p-6 text-white">
                    <div class="text-base font-semibold">
                        Também atende instituições com secretaria, financeiro e
                        comercial integrados
                    </div>
                    <p class="mt-2 text-sm leading-relaxed text-white/90">
                        O objetivo é transformar o WhatsApp em um canal
                        operacional da instituição de ensino, e não em um
                        atendimento preso no celular de uma pessoa.
                    </p>
                </div>
            </div>
        </div>
    </div>
</section>

<!-- =========================
  SECTION 6 (Casos de uso)
========================= -->
<section id="casos-de-uso" class="bg-[#F2F2F2] py-12">
    <div class="mx-auto max-w-[1200px] px-4 py-14 sm:px-6 sm:py-16">
        <div class="grid gap-10 lg:grid-cols-12 lg:items-start">
            <div class="lg:col-span-5">
                <div
                    class="inline-flex items-center rounded-full bg-emerald-50 px-6 py-2 text-sm font-semibold text-emerald-900"
                >
                    {section6Pill}
                </div>

                <h2
                    class="mt-6 text-balance text-[40px] font-semibold leading-[1.05] tracking-[-0.02em] text-slate-900 sm:text-[52px]"
                >
                    {section6Title}
                </h2>

                <p
                    class="mt-6 max-w-[520px] text-pretty text-base leading-relaxed text-slate-600 sm:text-lg"
                >
                    {section6Text}
                </p>

                <div
                    class="mt-8 max-w-[520px] rounded-2xl bg-slate-50 p-6 ring-1 ring-slate-200"
                >
                    <div class="text-sm font-semibold text-slate-900">
                        Resumo
                    </div>
                    <p class="mt-2 text-sm leading-relaxed text-slate-600">
                        WhatsApp integrado ao F10 para escolas e cursos:
                        comunicação com pais, responsáveis, alunos e leads,
                        matrículas, secretaria, financeiro e comercial — com
                        atendimento compartilhado, rastreio por usuário e
                        histórico centralizado.
                    </p>
                </div>
            </div>

            <div class="lg:col-span-7">
                <div class="grid gap-4 sm:grid-cols-2">
                    {#each useCases as card}
                        {@const CardIcon = iconForUseCase(card.icon)}
                        <div
                            class="rounded-2xl bg-white p-6 ring-1 ring-slate-200 shadow-[0_12px_30px_rgba(2,6,23,0.06)]"
                        >
                            <div class="flex items-start gap-3">
                                <span
                                    class="inline-flex min-h-10 min-w-10 items-center justify-center rounded-xl bg-emerald-50 ring-1 ring-emerald-100"
                                >
                                    <CardIcon
                                        class="min-h-5 min-w-5 text-emerald-700"
                                        aria-hidden="true"
                                    />
                                </span>
                                <div>
                                    <div
                                        class="text-base font-semibold text-slate-900"
                                    >
                                        {card.title}
                                    </div>
                                    <p
                                        class="mt-2 text-sm leading-relaxed text-slate-600"
                                    >
                                        {card.text}
                                    </p>
                                </div>
                            </div>
                        </div>
                    {/each}
                </div>
            </div>
        </div>
    </div>
</section>

<!-- =========================
  SECTION - TEMPLATES EXEMPLOS
========================= -->
<section id="templates-exemplos" class="bg-[#F8FAFC]">
    <div class="mx-auto max-w-[1200px] px-4 py-16 sm:px-6 sm:py-20">
        <div class="mx-auto max-w-[920px] text-center">
            <div class="flex justify-center">
                <div
                    class="inline-flex items-center gap-2 rounded-full bg-emerald-100 px-6 py-2 text-sm font-semibold text-emerald-950 ring-1 ring-emerald-200"
                >
                    <span
                        class="inline-flex h-2 w-2 rounded-full bg-emerald-700"
                    ></span>
                    Templates com exemplo real
                </div>
            </div>

            <h2
                class="mt-6 text-balance text-[40px] font-semibold leading-[1.05] tracking-[-0.02em] text-slate-900 sm:text-[52px]"
            >
                Você cria o modelo. O F10 envia com os dados certos.
            </h2>

            <p
                class="mx-auto mt-6 max-w-[760px] text-pretty text-base leading-relaxed text-slate-600 sm:text-lg"
            >
                O sistema substitui variáveis automaticamente e envia a mensagem
                final pronta. Assim, a escola ou curso padroniza a comunicação
                sem depender de copiar, colar e revisar tudo manual a cada
                atendimento.
            </p>
        </div>

        <div
            class="mt-10 overflow-hidden rounded-[32px] bg-white ring-1 ring-slate-200 shadow-[0_20px_60px_rgba(2,6,23,0.08)]"
        >
            <div
                class="border-b border-slate-200 bg-slate-50 px-5 py-4 sm:px-6"
            >
                <div
                    class="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between"
                >
                    <div>
                        <div class="text-sm font-semibold text-slate-900">
                            Exemplos de uso no dia a dia
                        </div>
                        <div class="mt-1 text-sm text-slate-500">
                            O modelo fica salvo no sistema e o F10 preenche as
                            variáveis antes do envio.
                        </div>
                    </div>

                    <div class="flex flex-wrap items-center gap-2">
                        <span
                            class="rounded-full bg-slate-100 px-3 py-1 text-[12px] font-semibold text-slate-700 ring-1 ring-slate-200"
                        >
                            Financeiro
                        </span>
                        <span
                            class="rounded-full bg-slate-100 px-3 py-1 text-[12px] font-semibold text-slate-700 ring-1 ring-slate-200"
                        >
                            Secretaria
                        </span>
                        <span
                            class="rounded-full bg-slate-100 px-3 py-1 text-[12px] font-semibold text-slate-700 ring-1 ring-slate-200"
                        >
                            Captação
                        </span>
                    </div>
                </div>
            </div>

            <div class="divide-y divide-slate-200">
                <div
                    class="grid gap-6 px-5 py-6 sm:px-6 lg:grid-cols-12 lg:gap-8"
                >
                    <div class="lg:col-span-4">
                        <div class="flex items-center gap-3">
                            <span
                                class="inline-flex h-10 min-w-10 items-center justify-center rounded-2xl bg-emerald-100 text-sm font-bold text-emerald-900"
                            >
                                R$
                            </span>
                            <div>
                                <div
                                    class="text-base font-semibold text-slate-900"
                                >
                                    Financeiro
                                </div>
                                <p
                                    class="mt-1 text-sm leading-relaxed text-slate-600"
                                >
                                    Cobranças, aviso de vencimento e envio de
                                    link para pagamento.
                                </p>
                            </div>
                        </div>

                        <div class="mt-4">
                            <div
                                class="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400"
                            >
                                Variáveis usadas
                            </div>
                            <div class="mt-3 flex flex-wrap gap-2">
                                <span
                                    class="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700 ring-1 ring-slate-200"
                                >
                                    {"{{nome_responsavel}}"}
                                </span>
                                <span
                                    class="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700 ring-1 ring-slate-200"
                                >
                                    {"{{mes_referencia}}"}
                                </span>
                                <span
                                    class="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700 ring-1 ring-slate-200"
                                >
                                    {"{{nome_aluno}}"}
                                </span>
                                <span
                                    class="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700 ring-1 ring-slate-200"
                                >
                                    {"{{data_vencimento}}"}
                                </span>
                                <span
                                    class="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700 ring-1 ring-slate-200"
                                >
                                    {"{{link_pagamento}}"}
                                </span>
                            </div>
                        </div>
                    </div>

                    <div class="lg:col-span-8">
                        <div class="grid gap-4 md:grid-cols-2">
                            <div>
                                <div
                                    class="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400"
                                >
                                    Modelo salvo no F10
                                </div>
                                <div
                                    class="mt-3 rounded-[24px] bg-slate-50 px-4 py-4 text-sm leading-relaxed text-slate-700 ring-1 ring-slate-100"
                                >
                                    Olá, {"{{nome_responsavel}}"}! A mensalidade
                                    de {"{{mes_referencia}}"} do aluno {"{{nome_aluno}}"}
                                    vence em {"{{data_vencimento}}"}. Segue o
                                    link para pagamento: {"{{link_pagamento}}"}.
                                </div>
                            </div>

                            <div>
                                <div
                                    class="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400"
                                >
                                    Como chega no WhatsApp
                                </div>
                                <div
                                    class="mt-3 rounded-[24px] bg-stone-50 p-3 ring-1 ring-stone-100"
                                >
                                    <div
                                        class="ml-auto max-w-[92%] rounded-[20px] rounded-tr-md bg-[#DCF8C6] px-4 py-3 text-sm leading-relaxed text-slate-800 shadow-[0_2px_10px_rgba(15,23,42,0.05)]"
                                    >
                                        <div>
                                            Olá, Carla! A mensalidade de março
                                            do aluno Pedro Henrique vence em
                                            10/04. Segue o link para pagamento:
                                            pagamento.escola.com/45821.
                                        </div>
                                        <div
                                            class="mt-1 flex items-center justify-end gap-1 text-[11px] text-slate-500"
                                        >
                                            <span>09:42</span>
                                            <span class="text-emerald-700"
                                                >✓✓</span
                                            >
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <div
                    class="grid gap-6 px-5 py-6 sm:px-6 lg:grid-cols-12 lg:gap-8"
                >
                    <div class="lg:col-span-4">
                        <div class="flex items-center gap-3">
                            <span
                                class="inline-flex h-10 min-w-10 items-center justify-center rounded-2xl bg-blue-100 text-sm font-bold text-blue-900"
                            >
                                SC
                            </span>
                            <div>
                                <div
                                    class="text-base font-semibold text-slate-900"
                                >
                                    Secretaria
                                </div>
                                <p
                                    class="mt-1 text-sm leading-relaxed text-slate-600"
                                >
                                    Lembretes de documentos pendentes e
                                    comunicações administrativas.
                                </p>
                            </div>
                        </div>

                        <div class="mt-4">
                            <div
                                class="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400"
                            >
                                Variáveis usadas
                            </div>
                            <div class="mt-3 flex flex-wrap gap-2">
                                <span
                                    class="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700 ring-1 ring-slate-200"
                                >
                                    {"{{nome_responsavel}}"}
                                </span>
                                <span
                                    class="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700 ring-1 ring-slate-200"
                                >
                                    {"{{nome_documento}}"}
                                </span>
                                <span
                                    class="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700 ring-1 ring-slate-200"
                                >
                                    {"{{nome_aluno}}"}
                                </span>
                                <span
                                    class="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700 ring-1 ring-slate-200"
                                >
                                    {"{{prazo_envio}}"}
                                </span>
                            </div>
                        </div>
                    </div>

                    <div class="lg:col-span-8">
                        <div class="grid gap-4 md:grid-cols-2">
                            <div>
                                <div
                                    class="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400"
                                >
                                    Modelo salvo no F10
                                </div>
                                <div
                                    class="mt-3 rounded-[24px] bg-slate-50 px-4 py-4 text-sm leading-relaxed text-slate-700 ring-1 ring-slate-100"
                                >
                                    Olá, {"{{nome_responsavel}}"}! O documento {"{{nome_documento}}"}
                                    do aluno
                                    {"{{nome_aluno}}"} ainda está pendente. Pode
                                    enviar até {"{{prazo_envio}}"}?
                                </div>
                            </div>

                            <div>
                                <div
                                    class="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400"
                                >
                                    Como chega no WhatsApp
                                </div>
                                <div
                                    class="mt-3 rounded-[24px] bg-stone-50 p-3 ring-1 ring-stone-100"
                                >
                                    <div
                                        class="ml-auto max-w-[92%] rounded-[20px] rounded-tr-md bg-[#DCF8C6] px-4 py-3 text-sm leading-relaxed text-slate-800 shadow-[0_2px_10px_rgba(15,23,42,0.05)]"
                                    >
                                        <div>
                                            Olá, Rafael! O documento comprovante
                                            de residência do aluno Lucas ainda
                                            está pendente. Pode enviar até
                                            15/04?
                                        </div>
                                        <div
                                            class="mt-1 flex items-center justify-end gap-1 text-[11px] text-slate-500"
                                        >
                                            <span>10:11</span>
                                            <span class="text-emerald-700"
                                                >✓✓</span
                                            >
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <div
                    class="grid gap-6 px-5 py-6 sm:px-6 lg:grid-cols-12 lg:gap-8"
                >
                    <div class="lg:col-span-4">
                        <div class="flex items-center gap-3">
                            <span
                                class="inline-flex h-10 min-w-10 items-center justify-center rounded-2xl bg-violet-100 text-sm font-bold text-violet-900"
                            >
                                CP
                            </span>
                            <div>
                                <div
                                    class="text-base font-semibold text-slate-900"
                                >
                                    Captação
                                </div>
                                <p
                                    class="mt-1 text-sm leading-relaxed text-slate-600"
                                >
                                    Contato inicial com leads e mensagens
                                    padronizadas para matrícula.
                                </p>
                            </div>
                        </div>

                        <div class="mt-4">
                            <div
                                class="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400"
                            >
                                Variáveis usadas
                            </div>
                            <div class="mt-3 flex flex-wrap gap-2">
                                <span
                                    class="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700 ring-1 ring-slate-200"
                                >
                                    {"{{nome_lead}}"}
                                </span>
                                <span
                                    class="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700 ring-1 ring-slate-200"
                                >
                                    {"{{turma_interesse}}"}
                                </span>
                            </div>
                        </div>
                    </div>

                    <div class="lg:col-span-8">
                        <div class="grid gap-4 md:grid-cols-2">
                            <div>
                                <div
                                    class="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400"
                                >
                                    Modelo salvo no F10
                                </div>
                                <div
                                    class="mt-3 rounded-[24px] bg-slate-50 px-4 py-4 text-sm leading-relaxed text-slate-700 ring-1 ring-slate-100"
                                >
                                    Olá, {"{{nome_lead}}"}! Temos condição
                                    especial para a turma
                                    {"{{turma_interesse}}"}. Posso te enviar os
                                    detalhes da matrícula?
                                </div>
                            </div>

                            <div>
                                <div
                                    class="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400"
                                >
                                    Como chega no WhatsApp
                                </div>
                                <div
                                    class="mt-3 rounded-[24px] bg-stone-50 p-3 ring-1 ring-stone-100"
                                >
                                    <div
                                        class="ml-auto max-w-[92%] rounded-[20px] rounded-tr-md bg-[#DCF8C6] px-4 py-3 text-sm leading-relaxed text-slate-800 shadow-[0_2px_10px_rgba(15,23,42,0.05)]"
                                    >
                                        <div>
                                            Olá, Fernanda! Temos condição
                                            especial para a turma Infantil 5.
                                            Posso te enviar os detalhes da
                                            matrícula?
                                        </div>
                                        <div
                                            class="mt-1 flex items-center justify-end gap-1 text-[11px] text-slate-500"
                                        >
                                            <span>14:26</span>
                                            <span class="text-emerald-700"
                                                >✓✓</span
                                            >
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <div
            class="mt-8 overflow-hidden rounded-[32px] bg-emerald-700 text-white shadow-[0_18px_50px_rgba(5,150,105,0.28)]"
        >
            <div
                class="grid gap-6 px-6 py-6 lg:grid-cols-12 lg:items-center lg:px-7"
            >
                <div class="lg:col-span-8">
                    <div class="text-base font-semibold">
                        Envios automáticos em implantação
                    </div>
                    <p
                        class="mt-2 max-w-[720px] text-sm leading-relaxed text-white/90"
                    >
                        Já estamos estruturando os envios automáticos dentro do
                        F10 para cobranças, avisos, lembretes e comunicações
                        recorrentes. A base de templates e a padronização do
                        atendimento já podem ser apresentadas desde agora.
                    </p>
                </div>

                <div class="lg:col-span-4 lg:text-right">
                    <button
                        on:click={() => openWhatsAppModal(12)}
                        class="inline-flex h-12 items-center justify-center rounded-full bg-white px-8 text-base font-bold text-emerald-900 shadow-sm transition hover:brightness-95 focus:outline-none focus:ring-2 focus:ring-white/40"
                    >
                        Quero conhecer os templates
                        <ArrowUpRight
                            class="ml-2 min-h-5 min-w-5"
                            aria-hidden="true"
                        />
                    </button>
                </div>
            </div>
        </div>
    </div>
</section>

<!-- =========================
  SECTION 3 (Visual dos templates)
========================= -->
<section id="comecar" class="relative bg-white">
    <div class="mx-auto max-w-[1200px] px-4 pt-16 sm:px-6 sm:pt-20">
        <div class="mx-auto max-w-[920px] text-center">
            <div class="flex justify-center">
                <div
                    class="inline-flex items-center gap-2 rounded-full bg-emerald-100 px-5 py-2 text-sm font-semibold text-emerald-950 ring-1 ring-emerald-200"
                >
                    <span
                        class="inline-flex h-2 w-2 rounded-full bg-emerald-700"
                    ></span>
                    Templates prontos com variáveis do sistema
                </div>
            </div>

            <h2
                class="mt-6 text-balance text-[36px] font-semibold leading-[1.06] tracking-[-0.02em] text-slate-900 sm:text-[42px]"
            >
                Templates prontos para financeiro, secretaria e captação
            </h2>

            <p
                class="mx-auto mt-5 max-w-[760px] text-pretty text-base leading-relaxed text-slate-600 sm:text-lg"
            >
                No F10, você cria modelos reutilizáveis com variáveis do sistema
                e envia mensagens com o contexto correto em poucos cliques. O
                resultado é mais padronização, mais agilidade na rotina e menos
                retrabalho no WhatsApp.
            </p>
        </div>

        <div class="mx-auto mt-10 max-w-[980px]">
            <div class="grid gap-4 md:grid-cols-3">
                <div
                    class="rounded-3xl bg-slate-50 px-5 py-5 text-center ring-1 ring-slate-200"
                >
                    <div
                        class="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-emerald-700 text-sm font-bold text-white"
                    >
                        1
                    </div>
                    <div class="mt-4 text-sm font-semibold text-slate-900">
                        Você monta o modelo uma vez
                    </div>
                    <p class="mt-2 text-sm leading-relaxed text-slate-600">
                        A equipe define a mensagem-base com campos como
                        responsável, aluno, vencimento, documento pendente,
                        turma de interesse e outros dados do sistema.
                    </p>
                </div>

                <div
                    class="rounded-3xl bg-slate-50 px-5 py-5 text-center ring-1 ring-slate-200"
                >
                    <div
                        class="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-emerald-700 text-sm font-bold text-white"
                    >
                        2
                    </div>
                    <div class="mt-4 text-sm font-semibold text-slate-900">
                        O F10 preenche automaticamente
                    </div>
                    <p class="mt-2 text-sm leading-relaxed text-slate-600">
                        As variáveis são substituídas pelos dados corretos,
                        evitando erro manual, mensagem genérica e perda de
                        contexto no atendimento.
                    </p>
                </div>

                <div
                    class="rounded-3xl bg-slate-50 px-5 py-5 text-center ring-1 ring-slate-200"
                >
                    <div
                        class="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-emerald-700 text-sm font-bold text-white"
                    >
                        3
                    </div>
                    <div class="mt-4 text-sm font-semibold text-slate-900">
                        A mensagem sai pronta e fica no histórico
                    </div>
                    <p class="mt-2 text-sm leading-relaxed text-slate-600">
                        Financeiro, secretaria e captação trabalham com mais
                        consistência, mantendo o histórico centralizado no F10.
                    </p>
                </div>
            </div>

            <div class="mt-8 flex flex-wrap justify-center gap-2">
                <span
                    class="rounded-full bg-slate-100 px-3 py-1 text-[12px] font-semibold text-slate-800 ring-1 ring-slate-200"
                >
                    Cobrança com vencimento e link
                </span>
                <span
                    class="rounded-full bg-slate-100 px-3 py-1 text-[12px] font-semibold text-slate-800 ring-1 ring-slate-200"
                >
                    Documentos pendentes
                </span>
                <span
                    class="rounded-full bg-slate-100 px-3 py-1 text-[12px] font-semibold text-slate-800 ring-1 ring-slate-200"
                >
                    Captação com turma de interesse
                </span>
                <span
                    class="rounded-full bg-slate-100 px-3 py-1 text-[12px] font-semibold text-slate-800 ring-1 ring-slate-200"
                >
                    Histórico centralizado
                </span>
            </div>

            <div
                class="mt-6 flex items-center justify-center gap-2 text-sm text-slate-600"
            >
                <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="2"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    class="h-4 w-4 text-emerald-700"
                    aria-hidden="true"
                >
                    <path
                        d="M21 15a4 4 0 0 1-4 4H7l-4 3V7a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4z"
                    />
                </svg>
                <span
                    >Mensagem certa, no momento certo, com o contexto certo.</span
                >
            </div>
        </div>
    </div>

    <div class="relative z-20 mx-auto max-w-[1200px] px-4 py-12 sm:px-6">
        <div
            class="mx-auto w-full max-w-[980px] -mb-[120px] sm:-mb-[340px] lg:-mb-[340px]"
        >
            <div
                class="overflow-hidden rounded-[28px] border border-slate-200 bg-slate-900 shadow-[0_40px_120px_-40px_rgba(2,6,23,.45)] ring-1 ring-black/5"
            >
                <div
                    class="flex items-center gap-3 border-b border-slate-200 bg-slate-800 px-4 py-3"
                >
                    <div class="flex items-center gap-2">
                        <span class="h-3 w-3 rounded-full bg-red-400"></span>
                        <span class="h-3 w-3 rounded-full bg-yellow-400"></span>
                        <span class="h-3 w-3 rounded-full bg-green-400"></span>
                    </div>

                    <div class="flex flex-1 justify-center">
                        <div
                            class="flex w-full max-w-[560px] items-center gap-2 rounded-full bg-white px-4 py-1.5 text-[13px] text-slate-600 ring-1 ring-slate-200"
                        >
                            <svg
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                stroke-width="2"
                                stroke-linecap="round"
                                stroke-linejoin="round"
                                class="h-4 w-4 text-slate-400"
                                aria-hidden="true"
                            >
                                <path d="M16 11V7a4 4 0 0 0-8 0v4" />
                                <rect
                                    x="5"
                                    y="11"
                                    width="14"
                                    height="10"
                                    rx="2"
                                />
                            </svg>
                            <span class="truncate">{canonicalUrl}</span>
                        </div>
                    </div>

                    <div class="hidden items-center gap-2 sm:flex">
                        <span class="h-2 w-2 rounded-full bg-slate-300"></span>
                        <span class="h-2 w-2 rounded-full bg-slate-300"></span>
                        <span class="h-2 w-2 rounded-full bg-slate-300"></span>
                    </div>
                </div>

                <div class="relative bg-slate-50">
                    <img
                        src={currentImageSrc}
                        alt="Templates de WhatsApp no F10"
                        class="block h-auto w-full select-none transition-opacity duration-300 ease-out"
                        class:opacity-0={isAnimating}
                        class:opacity-100={!isAnimating}
                        draggable="false"
                    />

                    {#if nextImageSrc}
                        <img
                            src={nextImageSrc}
                            alt="Templates de WhatsApp no F10"
                            class="pointer-events-none absolute inset-0 block h-full w-full select-none object-cover transition-opacity duration-300 ease-out"
                            class:opacity-100={isAnimating}
                            class:opacity-0={!isAnimating}
                            draggable="false"
                            on:load={handleNextLoaded}
                        />
                    {/if}
                </div>
            </div>

            <div class="mt-4 flex flex-wrap justify-center gap-2">
                <button
                    type="button"
                    on:click={() => requestTemplateTab("finance")}
                    class="inline-flex h-10 items-center justify-center rounded-full px-5 text-sm font-semibold ring-1 transition"
                    class:bg-emerald-700={templateTab === "finance"}
                    class:text-white={templateTab === "finance"}
                    class:ring-emerald-700={templateTab === "finance"}
                    class:bg-white={templateTab !== "finance"}
                    class:text-slate-900={templateTab !== "finance"}
                    class:ring-slate-200={templateTab !== "finance"}
                >
                    Financeiro
                </button>

                <button
                    type="button"
                    on:click={() => requestTemplateTab("marketing")}
                    class="inline-flex h-10 items-center justify-center rounded-full px-5 text-sm font-semibold ring-1 transition"
                    class:bg-emerald-700={templateTab === "marketing"}
                    class:text-white={templateTab === "marketing"}
                    class:ring-emerald-700={templateTab === "marketing"}
                    class:bg-white={templateTab !== "marketing"}
                    class:text-slate-900={templateTab !== "marketing"}
                    class:ring-slate-200={templateTab !== "marketing"}
                >
                    Captação
                </button>

                <button
                    type="button"
                    on:click={() => requestTemplateTab("office")}
                    class="inline-flex h-10 items-center justify-center rounded-full px-5 text-sm font-semibold ring-1 transition"
                    class:bg-emerald-700={templateTab === "office"}
                    class:text-white={templateTab === "office"}
                    class:ring-emerald-700={templateTab === "office"}
                    class:bg-white={templateTab !== "office"}
                    class:text-slate-900={templateTab !== "office"}
                    class:ring-slate-200={templateTab !== "office"}
                >
                    Secretaria
                </button>
            </div>

            <div class="hidden" aria-hidden="true">
                <img src="/wp_template_financeiro.png" alt="" />
                <img src="/wp_template_marketing.png" alt="" />
                <img src="/wp_template_secretaria.png" alt="" />
            </div>
        </div>
    </div>

    <div class="relative z-10 overflow-hidden bg-[#043214]">
        <div class="absolute inset-0">
            <div
                class="absolute inset-0 bg-repeat"
                style="background-image:url('/wp_patern.svg'); background-size: 760px auto;"
                aria-hidden="true"
            ></div>
            <div
                class="absolute inset-0 bg-gradient-to-b from-black/15 via-black/0 to-black/15"
                aria-hidden="true"
            ></div>
        </div>

        <div
            class="relative z-10 mx-auto max-w-[1200px] px-4 pb-16 pt-[400px] sm:px-6 sm:pb-20 sm:pt-[360px]"
        >
            <div class="grid gap-12 lg:grid-cols-12 lg:items-center">
                <div class="lg:col-span-7">
                    <h3
                        class="whitespace-pre-line text-balance text-[44px] font-semibold leading-[1.06] tracking-[-0.02em] text-white sm:text-[56px]"
                    >
                        Templates + operação compartilhada{"\n"}com histórico
                        centralizado no F10
                    </h3>

                    <p
                        class="mt-6 max-w-[560px] text-pretty text-sm leading-relaxed text-white/85 sm:text-base"
                    >
                        Mensagens deixam de ser texto solto e passam a ser parte
                        do fluxo da escola ou curso. Financeiro, secretaria e
                        comercial usam o mesmo histórico com continuidade entre
                        usuários e setores.
                    </p>
                </div>

                <div class="lg:col-span-5">
                    <div class="mx-auto max-w-[520px]">
                        <img
                            src="/wp_guys.webp"
                            alt="Equipe usando WhatsApp para escolas e cursos"
                            class="h-auto w-full"
                            draggable="false"
                        />
                    </div>
                </div>
            </div>
        </div>
    </div>
</section>

<!-- =========================
  SECTION 7 (Como funciona)
========================= -->
<section id="integracao" class="bg-white">
    <div class="mx-auto max-w-[1200px] px-4 py-16 sm:px-6 sm:py-20">
        <div class="grid gap-12 lg:grid-cols-12 lg:items-start">
            <div class="lg:col-span-5">
                <div
                    class="inline-flex items-center rounded-full bg-emerald-50 px-6 py-2 text-sm font-semibold text-emerald-900"
                >
                    {section7Pill}
                </div>
                <h2
                    class="mt-6 text-balance text-[40px] font-semibold leading-[1.05] tracking-[-0.02em] text-slate-900 sm:text-[52px]"
                >
                    {section7Title}
                </h2>
                <p
                    class="mt-6 max-w-[520px] text-pretty text-base leading-relaxed text-slate-600 sm:text-lg"
                >
                    Implementação com foco em operação real da escola: usuários,
                    números, permissões, histórico, templates e continuidade do
                    atendimento dentro do F10.
                </p>
            </div>

            <div class="lg:col-span-7">
                <ol class="space-y-4">
                    {#each section7Steps as step, idx}
                        {@const StepIcon = iconForStep(step.icon)}
                        <li
                            class="rounded-2xl bg-slate-50 p-6 ring-1 ring-slate-200"
                        >
                            <div class="flex items-start gap-4">
                                <div
                                    class="mt-0.5 inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-emerald-600 text-white shadow-sm"
                                >
                                    <StepIcon
                                        class="min-h-5 min-w-5"
                                        aria-hidden="true"
                                    />
                                </div>
                                <div>
                                    <div
                                        class="text-base font-semibold text-slate-900"
                                    >
                                        {idx + 1}. {step.title}
                                    </div>
                                    <div
                                        class="mt-2 text-sm leading-relaxed text-slate-600"
                                    >
                                        {step.text}
                                    </div>
                                </div>
                            </div>
                        </li>
                    {/each}
                </ol>
            </div>
        </div>
    </div>
</section>

<!-- =========================
  CTA INTERMEDIÁRIO
========================= -->
<section id="cta-meio" class="relative overflow-hidden bg-[#0A7A3A]">
    <div class="absolute inset-0 -z-10">
        <div class="absolute inset-0 bg-emerald-700/80"></div>
        <div
            class="absolute inset-0 opacity-100"
            style="background-image:url('/wp_patern.svg'); background-size: 760px auto;"
            aria-hidden="true"
        ></div>
        <div
            class="absolute inset-0 bg-gradient-to-b from-black/15 via-black/0 to-black/15"
            aria-hidden="true"
        ></div>
    </div>

    <div class="mx-auto max-w-[1200px] px-4 py-14 sm:px-6 sm:py-16">
        <div class="grid gap-10 lg:grid-cols-12 lg:items-center">
            <div class="lg:col-span-7">
                <div
                    class="inline-flex items-center gap-2 rounded-full bg-white/15 px-5 py-2 text-sm font-semibold text-white ring-1 ring-white/20 backdrop-blur-md"
                >
                    <Zap class="h-4 w-4" aria-hidden="true" />
                    {midCtaPill}
                </div>

                <h2
                    class="mt-6 whitespace-pre-line text-balance text-[34px] font-semibold leading-[1.08] tracking-[-0.02em] text-white sm:text-[44px]"
                >
                    {midCtaTitle}
                </h2>

                <p
                    class="mt-5 max-w-[700px] text-pretty text-base leading-relaxed text-white/85 sm:text-lg"
                >
                    {midCtaText}
                </p>

                <div
                    class="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center"
                >
                    <button
                        on:click={() => openWhatsAppModal(7)}
                        class="inline-flex h-12 items-center justify-center rounded-full bg-white px-8 text-base font-bold text-emerald-900 shadow-sm transition hover:brightness-95 focus:outline-none focus:ring-2 focus:ring-white/40"
                    >
                        <PhoneCall
                            class="mr-2 min-h-5 min-w-5"
                            aria-hidden="true"
                        />
                        {midCtaPrimaryLabel}
                        <ArrowUpRight
                            class="ml-2 min-h-5 min-w-5"
                            aria-hidden="true"
                        />
                    </button>
                </div>
            </div>

            <div class="lg:col-span-5">
                <div class="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
                    <div
                        class="rounded-2xl bg-white/10 p-5 ring-1 ring-white/15 backdrop-blur-md"
                    >
                        <div
                            class="flex items-center gap-2 text-sm font-semibold text-white"
                        >
                            <BadgeDollarSign
                                class="h-4 w-4"
                                aria-hidden="true"
                            />
                            Financeiro e cobranças
                        </div>
                        <div class="mt-2 text-sm leading-relaxed text-white/80">
                            Lembretes, links e confirmações com rastreio por
                            responsável.
                        </div>
                    </div>

                    <div
                        class="rounded-2xl bg-white/10 p-5 ring-1 ring-white/15 backdrop-blur-md"
                    >
                        <div
                            class="flex items-center gap-2 text-sm font-semibold text-white"
                        >
                            <GraduationCap class="h-4 w-4" aria-hidden="true" />
                            Matrículas e secretaria
                        </div>
                        <div class="mt-2 text-sm leading-relaxed text-white/80">
                            Confirmações, documentos e avisos com histórico
                            compartilhado no F10.
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <div
            class="mx-auto mt-10 max-w-[980px] text-center text-sm text-white/80"
        >
            WhatsApp para escolas e cursos no F10: atendimento compartilhado,
            histórico centralizado, rastreio por usuário, comunicação com pais,
            responsáveis, alunos e leads, além de apoio para secretaria,
            matrículas, financeiro escolar e comercial.
        </div>
    </div>
</section>

<!-- =========================
  FAQ
========================= -->
<section id="faq" class="bg-white">
    <div class="mx-auto max-w-[1200px] px-4 py-16 sm:px-6 sm:py-20">
        <div class="grid gap-12 lg:grid-cols-12 lg:items-start">
            <div class="lg:col-span-6">
                <div
                    class="inline-flex items-center rounded-full bg-emerald-50 px-6 py-2 text-sm font-semibold text-emerald-900"
                >
                    {faqPill}
                </div>

                <h2
                    class="mt-6 whitespace-pre-line text-balance text-[44px] font-semibold leading-[1.06] tracking-[-0.02em] text-slate-900 sm:text-[56px]"
                >
                    {faqTitle}
                </h2>

                <p
                    class="mt-6 max-w-[560px] text-pretty text-base leading-relaxed text-slate-600 sm:text-lg"
                >
                    {faqText}
                </p>
            </div>

            <div class="lg:col-span-6">
                <div class="space-y-4">
                    {#each faqs as item, index}
                        <details
                            class="group rounded-2xl bg-slate-50 p-6 ring-1 ring-slate-200 open:bg-emerald-50 open:ring-emerald-200"
                            open={index === 0}
                        >
                            <summary
                                class="flex cursor-pointer list-none items-center justify-between gap-4"
                            >
                                <span
                                    class="text-base font-semibold text-slate-900"
                                    >{item.q}</span
                                >

                                <span
                                    class="inline-flex min-h-10 min-w-10 items-center justify-center rounded-xl bg-white ring-1 ring-slate-200 transition group-open:rotate-180"
                                >
                                    <svg
                                        viewBox="0 0 24 24"
                                        class="min-h-5 min-w-5"
                                        fill="none"
                                        aria-hidden="true"
                                    >
                                        <path
                                            d="M6 9l6 6 6-6"
                                            stroke="#0F172A"
                                            stroke-width="2.2"
                                            stroke-linecap="round"
                                            stroke-linejoin="round"
                                        />
                                    </svg>
                                </span>
                            </summary>

                            <div
                                class="mt-4 text-sm leading-relaxed text-slate-600"
                            >
                                {item.a}
                            </div>
                        </details>
                    {/each}
                </div>
            </div>
        </div>
    </div>
</section>

<!-- =========================
  CTA FINAL
========================= -->
<section id="contato" class="relative overflow-hidden">
    <div class="absolute inset-0 -z-10">
        <div class="absolute inset-0" style="background-color:#0A7A3A;"></div>
        <div
            class="absolute inset-0 bg-[#E5E7EB] opacity-20"
            aria-hidden="true"
        ></div>
        <div
            class="absolute inset-0 bg-emerald-700/80"
            aria-hidden="true"
        ></div>
    </div>

    <div class="mx-auto max-w-[1200px] px-4 py-20 sm:px-6 sm:py-24">
        <div class="mx-auto max-w-[980px] text-center">
            <h2
                class="whitespace-pre-line text-balance text-[38px] font-semibold leading-[1.08] tracking-[-0.02em] text-white sm:text-[52px]"
            >
                {section5Title}
            </h2>

            <p
                class="mt-6 whitespace-pre-line text-base leading-relaxed text-white/85 sm:text-lg"
            >
                {section5Subtitle}<span class="font-bold text-white"
                    >{section5SubtitleBold}</span
                >
            </p>

            <div class="mt-10 flex justify-center">
                <button
                    on:click={() => openWhatsAppModal(9)}
                    class="inline-flex h-14 items-center justify-center rounded-full bg-white/20 px-10 text-base font-bold text-white ring-1 ring-white/25 backdrop-blur-md transition hover:bg-white/25 focus:outline-none focus:ring-2 focus:ring-white/35"
                >
                    {section5CtaLabel}
                    <ArrowUpRight
                        class="ml-3 min-h-5 min-w-5"
                        aria-hidden="true"
                    />
                </button>
            </div>

            <div
                class="mx-auto mt-10 max-w-[920px] text-center text-sm text-white/80"
            >
                <strong>WhatsApp para escolas e cursos</strong> no F10: operação
                multiusuário, comunicação com pais, responsáveis, alunos e leads,
                apoio para secretaria escolar, financeiro escolar, matrículas e comercial,
                com histórico centralizado, identificação por usuário e continuidade
                do atendimento.
            </div>
        </div>
    </div>
</section>
