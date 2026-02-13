<!-- src/routes/solucoes/whatsapp/+page.svelte -->
<script lang="ts">
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

	let templateTab: TemplateTab = "finance";

	let templatePanelTitle = "Financeiro: cobrança automática com variáveis";
	let templatePanelText =
		"Dispare cobranças e lembretes com dados do sistema (aluno, vencimento, parcelas, links). Sem copiar/colar e com histórico por responsável.";

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
					"Dispare cobranças e lembretes com dados do sistema (aluno, vencimento, parcelas, links). Sem copiar/colar e com histórico por responsável.",
			};
		}

		if (tab === "marketing") {
			return {
				imageSrc: "/wp_template_marketing.png",
				panelTitle: "Marketing: campanhas com personalização em escala",
				panelText:
					"Envie campanhas e ativações com variáveis (lead, segmento, cupom, interesse). Mais resposta com menos esforço e com rastreio no F10.",
			};
		}

		return {
			imageSrc: "/wp_template_secretaria.png",
			panelTitle: "Secretaria: avisos e solicitações sem retrabalho",
			panelText:
				"Comunicados por turma/aluno, pedidos de documentos e confirmações com variáveis. Tudo registrado no histórico do F10.",
		};
	}

	function requestTemplateTab(tab: TemplateTab) {
		if (templateTab === tab) return;

		// evita “spam click” durante transição
		if (isAnimating) {
			pendingTab = tab;
			return;
		}

		const next = getTabState(tab);

		templateTab = tab;
		templatePanelTitle = next.panelTitle;
		templatePanelText = next.panelText;

		// inicia pré-carregamento da próxima imagem (crossfade só após load)
		nextImageSrc = next.imageSrc;
	}

	function handleNextLoaded() {
		if (!nextImageSrc) return;

		isAnimating = true;

		// finaliza a transição após o tempo do CSS
		window.setTimeout(() => {
			currentImageSrc = nextImageSrc as string;
			nextImageSrc = null;
			isAnimating = false;

			// aplica clique pendente, se houver
			if (pendingTab) {
				const t = pendingTab;
				pendingTab = null;
				requestTemplateTab(t);
			}
		}, 320);
	}

    // =========================
    // SEO / LLM
    // =========================
    const siteName = "F10";
    const pagePath = "/solucoes/whatsapp";
    const baseUrl = "https://f10.com.br";
    const canonicalUrl = `${baseUrl}${pagePath}`;

    const seoTitle =
        "WhatsApp para Escolas no F10 | Cobranças, Matrículas e Comunicação com Pais";
    const seoDescription =
        "WhatsApp integrado direto no F10 para escolas: comunicação com pais, cobranças, matrículas, financeiro e comercial. API oficial + opções alternativas, histórico preservado e automação em tempo real.";
    const ogImage = `${baseUrl}/og/whatsapp-f10.webp`;

    // HERO
    let pillText: string = "WhatsApp para escolas";
    let title: string =
        "WhatsApp para escolas\nque resolvem o dia a dia por mensagem";
    let subtitle: string =
        "Comunicação com pais, cobranças e matrículas com automação, controle e histórico centralizado — integrado direto no F10.";

    let primaryCtaLabel: string = "Começar Agora";
    let primaryCtaHref: string = "#comecar";

    let secondaryCtaLabel: string = "Como funciona";
    let secondaryCtaHref: string = "#como-funciona";

    // SECTION 2
    let section2Title: string =
        "WhatsApp para escolas, direto na plataforma F10";
    let section2Text: string =
        "Centralize comunicação com pais e alunos em um canal que todos já usam. No F10, o WhatsApp deixa de ser “ferramenta separada” e vira parte do fluxo: financeiro, matrículas, secretaria, comercial e relacionamento — com automação e controle.";

    let section2Bullets: Array<string> = [
        "Cobranças e lembretes do financeiro com mensagens automáticas",
        "Matrículas e renovações com confirmação rápida no WhatsApp",
        "Comercial e atendimento com histórico centralizado no F10",
    ];

    // SECTION 3
    let section3TitleTop: string =
        "Crie estratégias de\ncomunicação automatizada\npara sua escola";
    let section3TextTop: string =
        "Combine mensagens automáticas com textos personalizados. Padronize avisos, melhore resposta do atendimento e aumente o engajamento com pais e responsáveis.";

    let section3TitleBottom: string =
        "WhatsApp é a evolução do SMS\ndentro do F10";
    let section3TextBottom: string =
        "O WhatsApp integrado no F10 substitui fluxos antigos de SMS e “mensagens soltas”. Você dispara comunicações essenciais com contexto (aluno, responsável, financeiro, matrícula, turma) e mantém o histórico guardado dentro da plataforma.";

    // SECTION 4 (FAQ)
    let faqPill: string = "Perguntas frequentes";
    let faqTitle: string =
        "Perguntas frequentes\nsobre WhatsApp integrado\nno F10";
    let faqText: string =
        "Aqui estão respostas objetivas sobre integração, armazenamento de conversas, uso de API e aplicações práticas na escola. Se você quer reduzir trabalho manual e melhorar comunicação com pais, este é o ponto de partida.";

    let faqs: Array<{ q: string; a: string }> = [
        {
            q: "Para que a escola pode usar o WhatsApp no F10?",
            a: "Para comunicação com pais e responsáveis, cobranças e lembretes do financeiro, confirmações de matrícula e renovação, avisos operacionais, suporte e comercial. Tudo com histórico e rastreio dentro do F10.",
        },
        {
            q: "O WhatsApp fica integrado no F10 mesmo, ou depende de intermediários?",
            a: "Fica integrado direto no F10, sem depender de “painéis paralelos”. O objetivo é que o WhatsApp seja parte do fluxo da escola: secretaria, financeiro, comercial e relacionamento.",
        },
        {
            q: "Vocês usam API oficial?",
            a: "Sim. Trabalhamos com API oficial quando a estratégia pede. Também suportamos caminhos alternativos em cenários específicos, sempre com foco em continuidade operacional e preservação de histórico.",
        },
        {
            q: "Se ocorrer bloqueio/banimento do número, perco as conversas?",
            a: "Não. O histórico de conversas permanece armazenado no F10. Em cenários de bloqueio do canal, você mantém os registros e consegue retomar o atendimento quando o canal for restabelecido ou substituído.",
        },
    ];

    // SECTION 5 (final CTA)
    let section5Title: string =
        "Conecte-se com pais e alunos em\ntempo real. Simples, rápido e escalável.";
    let section5Subtitle: string =
        "Potencialize o atendimento com mensagens automáticas:\n";
    let section5SubtitleBold: string =
        "cobranças, matrículas e comunicação em escala — direto no F10.";
    let section5CtaLabel: string = "Quero WhatsApp no F10";
    let section5CtaHref: string = "#contato";

    // SECTION 6 (use cases)
    const section6Pill = "Casos de uso";
    const section6Title = "O que você automatiza com WhatsApp na sua escola";
    const section6Text =
        "Modelos prontos e fluxos integrados aos módulos do F10. Você reduz retrabalho e garante que cada mensagem tenha contexto e rastreabilidade.";

    const useCases: Array<{
        title: string;
        text: string;
        icon: "billing" | "enrollment" | "office" | "sales";
    }> = [
        {
            title: "Cobranças e financeiro",
            text: "Lembretes, boletos/links, negociações e confirmações com histórico por responsável. Menos inadimplência, mais controle.",
            icon: "billing",
        },
        {
            title: "Matrículas e renovações",
            text: "Convites, confirmações e checklist de documentos. A escola acompanha o status e evita “ida e volta” de informações.",
            icon: "enrollment",
        },
        {
            title: "Secretaria e avisos",
            text: "Comunicados por turma, eventos, documentos pendentes e recados urgentes. Mensagens com segmentação e rastreio.",
            icon: "office",
        },
        {
            title: "Comercial e atendimento",
            text: "Captação de leads, follow-up e suporte com contexto do aluno/prospect. Atendimento consistente, sem perder conversa.",
            icon: "sales",
        },
    ];

    // SECTION 7 (how it works)
    const section7Pill = "Como funciona";
    const section7Title = "Integração nativa no F10, do jeito certo";
    const section7Steps: Array<{
        title: string;
        text: string;
        icon: "zap" | "workflow" | "messages" | "shield";
    }> = [
        {
            title: "Ativação do canal",
            text: "Configuramos o WhatsApp conforme sua estratégia (API oficial e/ou opção alternativa).",
            icon: "zap",
        },
        {
            title: "Conexão com módulos do F10",
            text: "Financeiro, matrículas, secretaria e comercial passam a disparar mensagens com contexto e regras.",
            icon: "workflow",
        },
        {
            title: "Automação e templates",
            text: "Você usa templates e fluxos prontos (cobrança, confirmação, lembrete) com personalização por escola.",
            icon: "messages",
        },
        {
            title: "Histórico centralizado",
            text: "Conversas ficam registradas no F10. Em cenários de bloqueio do canal, o histórico permanece preservado.",
            icon: "shield",
        },
    ];

    // SECTION MID CTA (break de cor)
    const midCtaPill = "Demonstração rápida";
    const midCtaTitle =
        "Quer ver o WhatsApp funcionando no seu fluxo\n(financeiro, matrícula e secretaria)?";
    const midCtaText =
        "Em poucos minutos você entende como o WhatsApp vira parte do F10: envio automatizado, rastreio e histórico centralizado — sem intermediários.";
    const midCtaPrimaryLabel = "Quero uma demonstração";
    const midCtaPrimaryHref = "#contato";
    const midCtaSecondaryLabel = "Ver casos de uso";
    const midCtaSecondaryHref = "#casos-de-uso";

    // JSON-LD helpers
    function buildFaqJsonLd(items: Array<{ q: string; a: string }>) {
        return {
            "@context": "https://schema.org",
            "@type": "FAQPage",
            mainEntity: items.map((x) => ({
                "@type": "Question",
                name: x.q,
                acceptedAnswer: {
                    "@type": "Answer",
                    text: x.a,
                },
            })),
        };
    }

    const organizationJsonLd = {
        "@context": "https://schema.org",
        "@type": "Organization",
        name: "F10",
        url: baseUrl,
    };

    const webPageJsonLd = {
        "@context": "https://schema.org",
        "@type": "WebPage",
        name: seoTitle,
        description: seoDescription,
        url: canonicalUrl,
        isPartOf: {
            "@type": "WebSite",
            name: siteName,
            url: baseUrl,
        },
    };

    const faqJsonLd = buildFaqJsonLd(faqs);

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

    function openWhatsAppModal(dobra) {
        contactModalConfig.set({
            defaultMessage: "Quero agendar uma demonstração do whatsApp",
            product: "F10 – WhatsApp",
            subSource: `Modal WhatsApp – dobra ${dobra}`,
            leadDescription: "Contato iniciado pelo formulário WhatsApp.",
        });

        showForm.set(true);
    }

    // SECTION 8 (Oficial vs Alternativo)
    const section8Pill = "Canais do WhatsApp";
    const section8Title =
        "WhatsApp oficial e alternativa\nno F10 — você escolhe a estratégia";
    const section8Text =
        "Trabalhamos com os dois caminhos: WhatsApp oficial e opção alternativa em cenários específicos. Você escolhe com base em volume, operação e custo. Em ambos os casos, o histórico fica no F10 — se o número for banido no canal alternativo, as conversas não são perdidas.";

    const section8Cards: Array<{
        title: string;
        subtitle: string;
        bullets: Array<string>;
        badge: string;
        tone: "official" | "alternative";
    }> = [
        {
            title: "WhatsApp Oficial",
            subtitle:
                "Mais previsível para operação, excelente para uso em escala, ideal para uso contínuo com templates e automações robustas.",
            badge: "Recomendado para escala",
            tone: "official",
            bullets: [
                "Maior estabilidade e conformidade",
                "Templates e automações com governança",
                "Ideal para alta demanda e times maiores",
            ],
        },
        {
            title: "Opção alternativa",
            subtitle:
                "Útil em cenários pontuais e de implantação rápida. Estratégia aplicada com cuidado para continuidade operacional.",
            badge: "Flexível para cenários específicos",
            tone: "alternative",
            bullets: [
                "Ativação mais rápida em casos específicos",
                "Boa opção para começar e validar o canal",
                "Mesmo com banimento, histórico fica no F10",
            ],
        },
    ];

    const section8NoteTitle = "Histórico preservado, independente do canal";
    const section8NoteText =
        "Mesmo utilizando a opção alternativa, se o número for banido você não perde as conversas: o F10 mantém o histórico armazenado e você retoma o atendimento ao reativar ou substituir o canal.";
</script>

<svelte:head>
    <title>{seoTitle}</title>
    <meta name="description" content={seoDescription} />
    <link rel="canonical" href={canonicalUrl} />

    <!-- Robots -->
    <meta
        name="robots"
        content="index,follow,max-snippet:-1,max-image-preview:large,max-video-preview:-1"
    />

    <!-- Open Graph -->
    <meta property="og:type" content="website" />
    <meta property="og:site_name" content={siteName} />
    <meta property="og:title" content={seoTitle} />
    <meta property="og:description" content={seoDescription} />
    <meta property="og:url" content={canonicalUrl} />
    <meta property="og:image" content={ogImage} />

    <!-- Twitter -->
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content={seoTitle} />
    <meta name="twitter:description" content={seoDescription} />
    <meta name="twitter:image" content={ogImage} />

    <meta
        name="keywords"
        content="whatsapp para escolas, whatsapp integrado, cobrança whatsapp escola, matrículas whatsapp, financeiro escolar, comunicação com pais, F10, WhatsApp oficial, automação whatsapp"
    />

    <!-- JSON-LD -->
    <script type="application/ld+json">
{JSON.stringify(organizationJsonLd)}
    </script>
    <script type="application/ld+json">
{JSON.stringify(webPageJsonLd)}
    </script>
    <script type="application/ld+json">
{JSON.stringify(faqJsonLd)}
    </script>
</svelte:head>

<!-- =========================
  HERO
========================= -->
<section id="home" class="relative isolate overflow-hidden">
    <!-- BACKGROUND -->
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
        <!-- floating icons -->
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
                    <!-- pill -->
                    <div class="flex justify-center">
                        <div
                            class="inline-flex h-9 items-center justify-center rounded-full bg-white/20 px-8 py-1 text-base font-medium text-white/95 ring-1 ring-white/10 backdrop-blur-md"
                        >
                            {pillText}
                        </div>
                    </div>

                    <h1
                        class="mx-auto mt-10 max-w-[980px] text-center font-medium tracking-[-0.03em] text-white"
                    >
                        <span
                            class="block text-[46px] leading-[0.98] sm:text-[72px] sm:leading-[0.98] lg:text-[92px] lg:leading-[0.96]"
                        >
                            {title}
                        </span>
                    </h1>

                    <p
                        class="mx-auto mt-8 max-w-[760px] text-center text-base font-medium leading-relaxed text-white/90 sm:text-lg"
                    >
                        {subtitle}
                    </p>

                    <div
                        class="relative mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row sm:gap-6"
                    >
                        <div
                            class="pointer-events-none absolute -left-2 top-1/2 hidden -translate-y-1/2 sm:block md:left-[12%] lg:left-[18%]"
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

                    <!-- pt-BR: bloco semântico para LLMs e SEO -->
                    <div
                        class="mx-auto mt-10 max-w-[980px] text-center text-sm text-white/75"
                    >
                        WhatsApp integrado direto na plataforma F10 para
                        escolas: comunicação com pais, cobranças, matrículas,
                        financeiro e comercial. Sem intermediários, com
                        automação, rastreio e histórico centralizado.
                    </div>
                </div>
            </div>
        </div>
    </div>
</section>

<!-- =========================
  SECTION (multiusuário / sem celular / gestão por departamentos)
  - Esquerda: explicação
  - Direita: imagem whatsApp_sem_celular.png
  - Inclui bloco destaque com bg-emerald-700 + /patern_whatsapp.png
========================= -->
<section id="multiusuario" class="bg-white overflow-hidden relative">
    <div
        class="absolute inset-0 bg-repeat opacity-5"
        style="background-image:url('/patern_whatsapp.png'); background-size: 700px auto;"
        aria-hidden="true"
    ></div>
    <div class="relative mx-auto max-w-[1200px] px-4 py-16 sm:px-6 sm:py-20">
        <!-- Header centralizado -->
        <div class="mx-auto max-w-[920px] text-center">
            <div class="flex justify-center">
                <div
                    class="inline-flex items-center gap-2 rounded-full bg-emerald-700 px-6 py-2 text-sm font-semibold text-white ring-1 ring-emerald-200"
                >
                    <span
                        class="inline-flex h-2 w-2 rounded-full bg-white text-white"
                    ></span>
                    Operação sem celular
                </div>
            </div>

            <h2
                class="mt-6 whitespace-pre-line text-balance text-[40px] font-semibold leading-[1.05] tracking-[-0.02em] text-slate-900 sm:text-[52px]"
            >
                Agora o WhatsApp da escola não depende de celular
            </h2>

            <p
                class="mx-auto mt-6 max-w-[820px] text-pretty text-base leading-relaxed text-slate-600 sm:text-lg"
            >
                Cada departamento pode ter <strong class="text-slate-900"
                    >um único número</strong
                >
                e
                <strong class="text-slate-900">vários usuários atendendo</strong
                > ao mesmo tempo. O gestor acompanha todas as conversas e, se você
                permitir, um atendente pode ver e continuar o chat iniciado por outro.
            </p>
        </div>

        <!-- Conteúdo -->
        <div class="mt-10 grid gap-8 lg:grid-cols-12 lg:items-start">
            <!-- LEFT: explicação -->
            <div class="lg:col-span-6">
                <div class="grid gap-4 sm:grid-cols-2">
                    <!-- Card 1 -->
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
                                    1 número por departamento
                                </div>
                                <p
                                    class="mt-2 text-sm leading-relaxed text-slate-600"
                                >
                                    Secretaria, financeiro, comercial e
                                    atendimento — cada área com um número e
                                    filas organizadas.
                                </p>
                            </div>
                        </div>
                    </div>

                    <!-- Card 2 -->
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
                                    Vários usuários no mesmo número
                                </div>
                                <p
                                    class="mt-2 text-sm leading-relaxed text-slate-600"
                                >
                                    Múltiplos atendentes atuam simultaneamente
                                    sem “disputar” o WhatsApp.
                                </p>
                            </div>
                        </div>
                    </div>

                    <!-- Card 3 -->
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
                                    Gestão e auditoria
                                </div>
                                <p
                                    class="mt-2 text-sm leading-relaxed text-slate-600"
                                >
                                    O gestor acompanha mensagens de todos, com
                                    rastreio por usuário e histórico
                                    centralizado.
                                </p>
                            </div>
                        </div>
                    </div>

                    <!-- Card 4 -->
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
                                    Chat compartilhado (com permissão)
                                </div>
                                <p
                                    class="mt-2 text-sm leading-relaxed text-slate-600"
                                >
                                    Se permitido, um atendente pode visualizar e
                                    continuar conversas iniciadas por outro.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- BLOCO DESTAQUE (bg-emerald-700 + pattern) -->
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
                                        Operação sem celular, com controle total
                                    </div>
                                    <p
                                        class="mt-2 text-sm leading-relaxed text-white"
                                    >
                                        O WhatsApp vira um canal de atendimento
                                        dentro do F10: multiusuário, rastreável
                                        e com permissões por perfil. Assim, você
                                        padroniza atendimento por departamento e
                                        mantém a continuidade do serviço.
                                    </p>

                                    <div class="mt-4 flex flex-wrap gap-2">
                                        <span
                                            class="rounded-full bg-white px-3 py-1.5 text-[12px] font-semibold text-emerald-900 ring-1 ring-emerald-200"
                                        >
                                            1 número por área
                                        </span>
                                        <span
                                            class="rounded-full bg-white px-3 py-1.5 text-[12px] font-semibold text-emerald-900 ring-1 ring-emerald-200"
                                        >
                                            Multiusuário
                                        </span>
                                        <span
                                            class="rounded-full bg-white px-3 py-1.5 text-[12px] font-semibold text-emerald-900 ring-1 ring-emerald-200"
                                        >
                                            Permissões
                                        </span>
                                        <span
                                            class="rounded-full bg-white px-3 py-1.5 text-[12px] font-semibold text-emerald-900 ring-1 ring-emerald-200"
                                        >
                                            Gestão em tempo real
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- CTA -->
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

            <!-- RIGHT: imagem -->
            <div class="lg:col-span-6">
                <div class="mx-auto max-w-[560px]">
                    <div class="overflow-hidden">
                        <img
                            src="/whatsApp_sem_celular.webp"
                            alt="WhatsApp no F10 sem celular: multiusuário por departamento"
                            class="h-auto w-full select-none"
                            draggable="false"
                        />
                    </div>

                    <div class="mt-4 text-center text-sm text-slate-500">
                        Atendimento por departamentos, multiusuário e com
                        permissões dentro do F10.
                    </div>
                </div>
            </div>
        </div>
    </div>
</section>

<section id="canais" class="bg-white">
    <div class="mx-auto max-w-[1200px] px-4 py-16 sm:px-6 sm:py-20">
        <!-- Header centralizado (flat, sem transparências) -->
        <div class="mx-auto max-w-[920px] text-center">
            <div class="flex justify-center">
                <div
                    class="inline-flex items-center gap-2 rounded-full bg-emerald-100 px-6 py-2 text-sm font-semibold text-emerald-950 ring-1 ring-emerald-200"
                >
                    <span
                        class="inline-flex h-2 w-2 rounded-full bg-emerald-700"
                    ></span>
                    {section8Pill}
                </div>
            </div>

            <h2
                class="mt-6 whitespace-pre-line text-balance text-[40px] font-semibold leading-[1.05] tracking-[-0.02em] text-slate-900 sm:text-[52px]"
            >
                {section8Title}
            </h2>

            <p
                class="mx-auto mt-6 max-w-[760px] text-pretty text-base leading-relaxed text-slate-600 sm:text-lg"
            >
                {section8Text}
            </p>
        </div>

        <!-- Colunas de comparação (flat, sem blur/transparência) -->
        <div class="mt-10 grid gap-4 sm:grid-cols-2">
            {#each section8Cards as card}
                <div
                    class="rounded-2xl bg-white p-6 text-left ring-1 ring-slate-200 shadow-[0_12px_30px_rgba(2,6,23,0.06)] transition hover:-translate-y-0.5 hover:shadow-[0_18px_46px_rgba(2,6,23,0.10)]"
                >
                    <div class="flex items-start justify-between gap-4">
                        <div class="min-w-0">
                            <div class="flex flex-wrap items-center gap-2">
                                <span
                                    class="text-base font-semibold text-slate-900"
                                    >{card.title}</span
                                >
                            </div>

                            <p
                                class="mt-2 text-sm leading-relaxed text-slate-600"
                            >
                                {card.subtitle}
                            </p>
                        </div>

                        <span
                            class="shrink-0 rounded-full px-3 py-1 text-[12px] font-semibold ring-1"
                            class:bg-emerald-700={card.tone === "official"}
                            class:text-white={card.tone === "official"}
                            class:ring-emerald-700={card.tone === "official"}
                            class:bg-slate-100={card.tone === "alternative"}
                            class:text-slate-900={card.tone === "alternative"}
                            class:ring-slate-200={card.tone === "alternative"}
                        >
                            {card.badge}
                        </span>
                    </div>

                    <ul class="mt-5 space-y-3">
                        {#each card.bullets as b}
                            <li class="flex gap-3">
                                <span
                                    class="mt-0.5 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full ring-1"
                                    class:bg-emerald-100={card.tone ===
                                        "official"}
                                    class:ring-emerald-200={card.tone ===
                                        "official"}
                                    class:bg-slate-100={card.tone ===
                                        "alternative"}
                                    class:ring-slate-200={card.tone ===
                                        "alternative"}
                                >
                                    <CheckCircle2 class="h-5 w-5" />
                                </span>
                                <span class="text-sm font-medium text-slate-800"
                                    >{b}</span
                                >
                            </li>
                        {/each}
                    </ul>

                    <div
                        class="mt-6 flex items-center gap-2 text-sm text-slate-600"
                    >
                        <Workflow class="h-4 w-4" aria-hidden="true" />
                        <span>Configuração guiada conforme sua operação</span>
                    </div>
                </div>
            {/each}
        </div>

        <!-- Note centralizado (flat) -->
        <div class="mt-8 flex justify-center">
            <div
                class="w-full overflow-hidden rounded-2xl ring-1 ring-emerald-800/30"
            >
                <!-- background -->
                <div class="relative bg-emerald-700">
                    <div
                        class="absolute inset-0 bg-repeat opacity-20"
                        style="background-image:url('/patern_whatsapp.png'); background-size: 700px auto;"
                        aria-hidden="true"
                    ></div>
                    <div
                        class="absolute inset-0 bg-gradient-to-b from-black/10 via-black/0 to-black/10"
                        aria-hidden="true"
                    ></div>

                    <!-- content -->
                    <div class="relative p-6">
                        <div class="flex items-start gap-3">
                            <span
                                class="inline-flex min-h-10 min-w-10 items-center justify-center rounded-xl bg-white text-emerald-800 shadow-sm ring-1 ring-white/20"
                            >
                                <ShieldCheck
                                    class="h-5 w-5"
                                    aria-hidden="true"
                                />
                            </span>

                            <div class="min-w-0">
                                <div class="text-base font-semibold text-white">
                                    {section8NoteTitle}
                                </div>
                                <p
                                    class="mt-2 text-sm leading-relaxed text-white/90"
                                >
                                    {section8NoteText}
                                </p>

                                <!-- chips (flat) -->
                                <div class="mt-4 flex flex-wrap gap-2">
                                    <span
                                        class="inline-flex items-center gap-2 rounded-full bg-white px-3 py-1.5 text-[12px] font-semibold text-emerald-900 ring-1 ring-emerald-200"
                                    >
                                        <ShieldCheck
                                            class="h-4 w-4"
                                            aria-hidden="true"
                                        />
                                        Histórico no F10
                                    </span>

                                    <span
                                        class="inline-flex items-center gap-2 rounded-full bg-white px-3 py-1.5 text-[12px] font-semibold text-emerald-900 ring-1 ring-emerald-200"
                                    >
                                        <Workflow
                                            class="h-4 w-4"
                                            aria-hidden="true"
                                        />
                                        Retomada rápida
                                    </span>

                                    <span
                                        class="inline-flex items-center gap-2 rounded-full bg-white px-3 py-1.5 text-[12px] font-semibold text-emerald-900 ring-1 ring-emerald-200"
                                    >
                                        <MessagesSquare
                                            class="h-4 w-4"
                                            aria-hidden="true"
                                        />
                                        Rastreio por aluno
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <!-- CTA centralizado -->
        <div
            class="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row"
        >
            <button
                on:click={() => openWhatsAppModal(8)}
                class="inline-flex h-12 items-center justify-center rounded-full bg-emerald-700 px-8 text-base font-bold text-white shadow-sm transition hover:brightness-110 focus:outline-none focus:ring-2 focus:ring-emerald-300"
            >
                Quero definir a melhor estratégia
                <ArrowUpRight class="ml-2 min-h-5 min-w-5" aria-hidden="true" />
            </button>

            <a
                href="#faq"
                class="inline-flex h-12 items-center justify-center rounded-full border border-slate-200 bg-white px-8 text-base font-bold text-slate-900 transition hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-slate-200"
            >
                Ver perguntas frequentes
            </a>
        </div>
    </div>
</section>

<!-- =========================
  SECTION 2
========================= -->
<section id="como-funciona" class="bg-white">
    <div class="mx-auto max-w-[1200px] px-4 py-16 sm:px-6 sm:py-20">
        <div class="grid gap-12 lg:grid-cols-12 lg:items-center">
            <!-- LEFT -->
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

            <!-- RIGHT -->
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
                                alt="WhatsApp para escolas no F10 (mockup)"
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
                        WhatsApp integrado ao F10 para escolas: comunicação com
                        pais, cobranças, matrículas, financeiro e comercial —
                        com automação, rastreio e histórico centralizado.
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
  SECTION 3 (laptop + green block) - notebook flutuando
========================= -->
<section id="comecar" class="relative bg-white">
	<!-- Top (cinza) -->
	<div class="mx-auto max-w-[1200px] px-4 pt-16 sm:px-6 sm:pt-20">
		<div class="grid gap-10 lg:grid-cols-12 lg:items-start">
			<div class="lg:col-span-7">
				<h2
					class="whitespace-pre-line text-balance text-[36px] font-semibold leading-[1.06] tracking-[-0.02em] text-slate-900 sm:text-[42px]"
				>
					WhatsApp é a evolução do SMS{"\n"}para sua escola — só que com contexto e automação
				</h2>

				<p class="mt-5 max-w-[680px] text-pretty text-base leading-relaxed text-slate-600 sm:text-lg">
					No F10, você cria <strong class="text-slate-900">templates prontos</strong> com variáveis do sistema e dispara mensagens
					sem copiar/colar. Financeiro, secretaria e marketing usam o mesmo canal — com rastreio e histórico centralizado.
				</p>

				<div class="mt-6 grid gap-3 sm:grid-cols-2">
					<div class="rounded-2xl bg-slate-50 p-5 ring-1 ring-slate-200">
						<div class="text-sm font-semibold text-slate-900">Cobrança (Financeiro)</div>
						<p class="mt-2 text-sm leading-relaxed text-slate-700">
							Olá <span class="font-semibold text-slate-900">{"{{nome_do_aluno}}"}</span>, sua parcela
							<span class="font-semibold text-slate-900">{"{{parcela_vencimento}}"}</span> está disponível para pagamento.
						</p>
					</div>

					<div class="rounded-2xl bg-slate-50 p-5 ring-1 ring-slate-200">
						<div class="text-sm font-semibold text-slate-900">Marketing (Captação)</div>
						<p class="mt-2 text-sm leading-relaxed text-slate-700">
							<span class="font-semibold text-slate-900">{"{{nome_lead}}"}</span>, você foi escolhido!
							Ganhou um cupom de <span class="font-semibold text-slate-900">50% de desconto</span>.
						</p>
					</div>
				</div>
			</div>

			<!-- Texto dinâmico (troca sem "piscada") -->
			<div class="lg:col-span-5 lg:pt-6">
				<div class="rounded-2xl bg-white p-6 ring-1 ring-slate-200 shadow-[0_12px_30px_rgba(2,6,23,0.06)]">
					<div class="text-sm font-semibold text-slate-900">{templatePanelTitle}</div>
					<p class="mt-2 text-sm leading-relaxed text-slate-600">{templatePanelText}</p>

					<div class="mt-4 flex flex-wrap gap-2">
						<span class="rounded-full bg-emerald-100 px-3 py-1 text-[12px] font-semibold text-emerald-950 ring-1 ring-emerald-200">
							Variáveis do sistema
						</span>
						<span class="rounded-full bg-slate-100 px-3 py-1 text-[12px] font-semibold text-slate-900 ring-1 ring-slate-200">
							Templates prontos
						</span>
						<span class="rounded-full bg-slate-100 px-3 py-1 text-[12px] font-semibold text-slate-900 ring-1 ring-slate-200">
							Envio em escala
						</span>
					</div>

					<div class="mt-5 flex items-center gap-2 text-sm text-slate-600">
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
							<path d="M21 15a4 4 0 0 1-4 4H7l-4 3V7a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4z" />
						</svg>
						<span>Mensagem certa, no momento certo, com o contexto certo.</span>
					</div>
				</div>
			</div>
		</div>
	</div>

	<!-- BROWSER FLUTUANTE + SLIDE -->
	<div class="relative z-20 mx-auto max-w-[1200px] px-4 py-12 sm:px-6">
		<div class="mx-auto w-full max-w-[980px] -mb-[120px] sm:-mb-[340px] lg:-mb-[340px]">
			<!-- frame -->
			<div class="overflow-hidden rounded-[28px] border border-slate-200 bg-slate-900 shadow-[0_40px_120px_-40px_rgba(2,6,23,.45)] ring-1 ring-black/5">
				<!-- top bar -->
				<div class="flex items-center gap-3 border-b border-slate-200 bg-slate-800 px-4 py-3">
					<div class="flex items-center gap-2">
						<span class="h-3 w-3 rounded-full bg-red-400"></span>
						<span class="h-3 w-3 rounded-full bg-yellow-400"></span>
						<span class="h-3 w-3 rounded-full bg-green-400"></span>
					</div>

					<div class="flex flex-1 justify-center">
						<div class="flex w-full max-w-[560px] items-center gap-2 rounded-full bg-white px-4 py-1.5 text-[13px] text-slate-600 ring-1 ring-slate-200">
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
								<rect x="5" y="11" width="14" height="10" rx="2" />
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

				<!-- content (crossfade sem piscada) -->
				<div class="relative bg-slate-50">
					<!-- layer atual -->
					<img
						src={currentImageSrc}
						alt="Templates de WhatsApp no F10"
						class="block h-auto w-full select-none transition-opacity duration-300 ease-out"
						class:opacity-0={isAnimating}
						class:opacity-100={!isAnimating}
						draggable="false"
					/>

					<!-- layer próxima (só aparece durante a troca) -->
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

			<!-- BOTÕES FORA DO FRAME (abaixo) -->
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
					Marketing
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

			<!-- preload (evita flash por carregamento) -->
			<div class="hidden" aria-hidden="true">
				<img src="/wp_template_financeiro.png" alt="" />
				<img src="/wp_template_marketing.png" alt="" />
				<img src="/wp_template_secretaria.png" alt="" />
			</div>
		</div>
	</div>

	<!-- Bottom (verde) -->
	<div class="relative z-10 overflow-hidden bg-[#043214]">
		<div class="absolute inset-0">
			<div
				class="absolute inset-0 bg-repeat"
				style="background-image:url('/wp_patern.svg'); background-size: 760px auto;"
				aria-hidden="true"
			></div>
			<div class="absolute inset-0 bg-gradient-to-b from-black/15 via-black/0 to-black/15" aria-hidden="true"></div>
		</div>

		<div class="relative z-10 mx-auto max-w-[1200px] px-4 pb-16 pt-[400px] sm:px-6 sm:pb-20 sm:pt-[360px]">
			<div class="grid gap-12 lg:grid-cols-12 lg:items-center">
				<div class="lg:col-span-7">
					<h3 class="whitespace-pre-line text-balance text-[44px] font-semibold leading-[1.06] tracking-[-0.02em] text-white sm:text-[56px]">
						Templates + automação{"\n"}com histórico centralizado no F10
					</h3>

					<p class="mt-6 max-w-[560px] text-pretty text-sm leading-relaxed text-white/85 sm:text-base">
						Mensagens deixam de ser “texto solto” e passam a ser parte do fluxo: financeiro, secretaria e comercial.
						Com variáveis do sistema, você escala comunicação sem perder personalização.
					</p>
				</div>

				<div class="lg:col-span-5">
					<div class="mx-auto max-w-[520px]">
						<img src="/wp_guys.webp" alt="Equipe usando WhatsApp para escolas" class="h-auto w-full" draggable="false" />
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
                    Implementação com foco em continuidade operacional: WhatsApp
                    oficial quando aplicável, opções alternativas quando
                    necessário e histórico preservado no F10.
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
  SECTION MID CTA (break de cor) - novo
  Quebra visual entre sessões brancas
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
                            dentro do F10.
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <!-- pt-BR: bloco semântico extra (LLM/SEO), curto e objetivo -->
        <div
            class="mx-auto mt-10 max-w-[980px] text-center text-sm text-white/80"
        >
            WhatsApp para escolas no F10: canal nativo para comunicação com
            pais, cobranças, matrículas, financeiro e comercial. WhatsApp
            oficial e alternativas por estratégia, com histórico preservado.
        </div>
    </div>
</section>

<!-- =========================
  SECTION 4 (FAQ)
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
                    {#each faqs as item, i}
                        <details
                            class="group rounded-2xl bg-slate-50 p-6 ring-1 ring-slate-200 open:bg-emerald-50 open:ring-emerald-200"
                            open={i === 0}
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
  SECTION 5 (CTA final)
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

            <!-- pt-BR: texto semântico final (SEO/LLM) -->
            <div
                class="mx-auto mt-10 max-w-[920px] text-center text-sm text-white/80"
            >
                <strong>WhatsApp para escolas</strong> no F10: comunicação com pais,
                cobranças do financeiro, matrículas e comercial. Integração direta
                na plataforma, com histórico centralizado e automações em tempo real.
            </div>
        </div>
    </div>
</section>
