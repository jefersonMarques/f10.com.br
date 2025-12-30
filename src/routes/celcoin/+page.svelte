<!-- src/routes/celcoin/+page.svelte -->
<script lang="ts">
    // ===== Imports =====
    import Breadcrumb from "$lib/components/Breadcrumb.svelte";
    import FaqAccordion from "$lib/components/FaqAccordion.svelte";

    // Ícones (Lucide)
    import {
        ArrowRight,
        Zap,
        ShieldCheck,
        CalendarClock,
        Handshake,
        PiggyBank,
        QrCode,
        Building2,
        BadgeCheck,
        Wallet,
    } from "lucide-svelte";

    // ===== Types =====
    type BenefitCard = {
        title: string;
        description: string;
        icon: typeof Zap;
    };

    // ===== Content =====
    const ctaHref = "/celcoin/cadastro-de-escolas";

    // Troque as imagens pelos seus assets reais (ou remova se preferir)
    const heroImage = "/celcoin_pay_f10.webp";
    const integrationImage = "/celcoin_integration.webp";

    const kpis = [
        {
            value: "24/7",
            label: "Pix disponível o tempo todo (inclusive finais de semana)",
        },
        {
            value: "Segundos",
            label: "confirmação de pagamento rápida (na maioria dos casos)",
        },
        { value: "Por aluno", label: "conciliação organizada direto no F10" },
    ];

    const benefitCards: BenefitCard[] = [
        {
            title: "Pagamento confirmado na hora certa",
            description:
                "Menos “mande o comprovante”. Mais agilidade para identificar o pagamento e seguir com a rotina da secretaria sem travar atendimento.",
            icon: Zap,
        },
        {
            title: "Conciliação sem planilhas e sem caça ao print",
            description:
                "Cobrança e baixa ficam mais claras: você enxerga o que entrou, o que falta e onde está o gargalo — com trilha de auditoria para conferência.",
            icon: ShieldCheck,
        },
        {
            title: "Disponível quando o responsável paga",
            description:
                "Pix funciona 24/7. Ideal para escolas com alto volume, múltiplos horários de pagamento e responsáveis que pagam fora do expediente.",
            icon: CalendarClock,
        },
        {
            title: "Menos atrito no atendimento",
            description:
                "Equipe ganha tempo: menos retrabalho conferindo extrato, menos mensagens repetidas e mais clareza na conversa com os responsáveis.",
            icon: Handshake,
        },
        {
            title: "Operação mais enxuta",
            description:
                "Centralize cobrança e conferência no sistema. Menos etapas manuais = menos erro, menos retrabalho e mais previsibilidade de caixa.",
            icon: PiggyBank,
        },
        {
            title: "Mais fácil para o responsável pagar",
            description:
                "QR Code e pronto. Quanto menor a fricção, menor a chance de atraso — e você sente isso no fluxo de recebimentos ao longo do mês.",
            icon: QrCode,
        },
    ];

    const faqItems = [
        {
            question: "Como funciona a cobrança via Pix integrada ao F10?",
            answer: "Você ativa a conta PJ na <strong>Celcoin</strong> e passa a gerar cobranças Pix dentro do <strong>F10</strong>. O pagamento acontece via QR Code e o sistema ajuda na <strong>conciliação</strong> (organização/baixa por aluno) para reduzir conferências manuais e retrabalho.",
        },
        {
            question:
                "Minha escola consegue usar Pix e manter outros meios de pagamento?",
            answer: "Sim. O Pix entra como um caminho rápido e direto para receber e confirmar pagamentos, mas você pode manter outros meios quando fizer sentido. A ideia é reduzir atrito no dia a dia — sem bagunçar sua operação.",
        },
        {
            question: "Dá para usar Pix para mensalidades e cobranças recorrentes?",
            answer: "Sim. Muitas escolas operam por período (mensalidade) gerando cobranças com QR Code e organizando o acompanhamento pelo sistema. Dependendo da estratégia da escola, também é comum automatizar lembretes e comunicação para reduzir atrasos.",
        },
        {
            question: "Quais ganhos reais o Pix traz para a escola (PJ)?",
            answer: "Na prática: <strong>confirmação mais rápida</strong>, menos ruído no atendimento, menos tempo “batendo” pagamento e uma visão mais clara do caixa. Em meses de grande volume, isso costuma virar <strong>previsibilidade</strong> e <strong>controle</strong>.",
        },
        {
            question: "Tem custo para abrir a conta? E as tarifas?",
            answer: "A abertura da conta pode ser <strong>gratuita</strong>. Tarifas e condições variam conforme regras do provedor e configuração da sua operação. No cadastro, você vê o que se aplica ao seu cenário.",
        },
    ];
</script>

<svelte:head>
    <title>Celcoin + F10 — Cobranças via Pix para Escolas | F10 Software</title>
    <meta
        name="description"
        content="Receba mensalidades via Pix com Celcoin integrada ao F10. Conciliação organizada por aluno, menos retrabalho e mais previsibilidade no caixa da escola."
    />
    <meta
        property="og:title"
        content="Celcoin + F10 — Cobranças via Pix para Escolas"
    />
    <meta
        property="og:description"
        content="Pix integrado no F10 para escolas: confirmação rápida, conciliação por aluno e menos atrito no financeiro."
    />
    <link rel="canonical" href="https://f10.com.br/celcoin" />

    <!-- JSON-LD: WebPage + FAQPage (leve e útil para SEO/LLMs) -->
    <script type="application/ld+json">
        {
            "@context": "https://schema.org",
            "@type": "WebPage",
            "name": "Celcoin + F10 — Cobranças via Pix para Escolas",
            "description": "Receba via Pix com Celcoin integrada ao F10 e tenha conciliação organizada por aluno.",
            "publisher": { "@type": "Organization", "name": "F10 Software" }
        }
    </script>

    <script type="application/ld+json">
        {
            "@context": "https://schema.org",
            "@type": "FAQPage",
            "mainEntity": [
                {
                    "@type": "Question",
                    "name": "Como funciona a cobrança via Pix integrada ao F10?",
                    "acceptedAnswer": {
                        "@type": "Answer",
                        "text": "Você ativa a conta PJ na Celcoin e passa a gerar cobranças Pix dentro do F10. O pagamento acontece via QR Code e o sistema ajuda na conciliação (organização/baixa por aluno)."
                    }
                },
                {
                    "@type": "Question",
                    "name": "Minha escola consegue usar Pix e manter outros meios de pagamento?",
                    "acceptedAnswer": {
                        "@type": "Answer",
                        "text": "Sim. O Pix pode ser o caminho principal e você pode manter outros meios quando fizer sentido para sua operação."
                    }
                },
                {
                    "@type": "Question",
                    "name": "Dá para usar Pix para mensalidades e cobranças recorrentes?",
                    "acceptedAnswer": {
                        "@type": "Answer",
                        "text": "Sim. Muitas escolas geram cobranças por período com QR Code e organizam o acompanhamento pelo sistema. Dependendo da estratégia, também é comum automatizar lembretes."
                    }
                },
                {
                    "@type": "Question",
                    "name": "Quais ganhos reais o Pix traz para a escola (PJ)?",
                    "acceptedAnswer": {
                        "@type": "Answer",
                        "text": "Confirmação mais rápida, menos ruído no atendimento, menos tempo conferindo pagamentos e mais previsibilidade de caixa."
                    }
                },
                {
                    "@type": "Question",
                    "name": "Tem custo para abrir a conta? E as tarifas?",
                    "acceptedAnswer": {
                        "@type": "Answer",
                        "text": "A abertura pode ser gratuita. Tarifas e condições variam conforme regras do provedor e configuração da sua operação."
                    }
                }
            ]
        }
    </script>
</svelte:head>

<!-- ===== HERO ===== -->
<section class="relative isolate overflow-hidden bg-white/60">
    <Breadcrumb
        baseUrl="https://f10.com.br"
        items={[{ label: "HOME", href: "/" }, { label: "CELCOIN" }]}
    />
    <div class="container pb-16">
        <div class="grid gap-10 lg:grid-cols-12 items-start">
            <!-- Left -->
            <div class="lg:col-span-6">
                <p
                    class="inline-flex items-center gap-2 rounded-full bg-[#F3F4FD] px-4 py-2 text-[13px] font-semibold text-[#000A57] ring-1 ring-black/5"
                >
                    <Building2 size={16} />
                    Pix pensado para o financeiro escolar
                    <span class="ml-1 h-1 w-1 rounded-full bg-[#EA6D0B]"></span>
                </p>

                <h1
                    class="mt-6 max-w-[720px] text-[#010D28] tracking-[-0.02em] leading-[1.06]
                 text-[36px] sm:text-[44px] md:text-[52px] font-semibold"
                >
                    Receba mensalidades por Pix com
                    <span class="text-[#EA6D0B]">Celcoin</span> integrada ao F10
                </h1>

                <p
                    class="mt-5 max-w-[640px] text-[#7E82A2] text-[16px] leading-[1.85]"
                >
                    Ative sua conta PJ e gere cobranças Pix direto no sistema.
                    Menos conferência manual, menos ruído no atendimento e mais previsibilidade:
                    conciliação organizada por aluno para a rotina da sua escola.
                </p>

                <!-- CTA -->
                <div
                    class="mt-8 flex flex-col sm:flex-row sm:items-center gap-4"
                >
                    <a
                        href={ctaHref}
                        class="inline-flex items-center justify-center gap-3 rounded-[70px]
                   bg-[#EA6D0B] px-8 md:px-10 py-4 text-white text-[16px] font-bold
                   transition hover:brightness-110 focus:outline-none focus:ring-2
                   focus:ring-[#EA6D0B]/40"
                        aria-label="Ativar Celcoin e cadastrar escola"
                    >
                        <span>Quero ativar</span>
                        <ArrowRight size={22} />
                    </a>

                    <a
                        href="#vantagens"
                        class="inline-flex items-center justify-center gap-3 rounded-[70px]
                   border border-[#EA6D0B] px-8 md:px-10 py-4 text-[#000A57] text-[16px] font-semibold
                   transition hover:bg-[#EA6D0B]/10 focus:outline-none focus:ring-2
                   focus:ring-[#EA6D0B]/30"
                    >
                        <span>Ver mais</span>
                        <ArrowRight size={22} class="text-[#EA6D0B]" />
                    </a>
                </div>

                <!-- KPIs -->
                <div class="mt-10 grid gap-4 sm:grid-cols-3">
                    {#each kpis as k}
                        <article
                            class="rounded-[20px] bg-white ring-1 ring-black/5 p-5 shadow-sm"
                        >
                            <p
                                class="text-[#EA6D0B] text-[22px] font-semibold leading-tight"
                            >
                                {k.value}
                            </p>
                            <p
                                class="mt-1 text-[#000A57]/75 text-[13px] leading-relaxed"
                            >
                                {k.label}
                            </p>
                        </article>
                    {/each}
                </div>
            </div>

            <!-- Right (Image) -->
            <div class="lg:col-span-6 mt-2 lg:mt-0">
                <div
                    class="relative overflow-hidden rounded-[20px] md:rounded-[24px]
                 ring-1 ring-black/5 shadow-[0_18px_50px_rgba(1,13,40,0.16)]"
                >
                    <img
                        src={heroImage}
                        alt="Cobranças via Pix integradas ao F10 com Celcoin para escolas"
                        class="block h-full w-full object-cover"
                        loading="eager"
                    />
                    <div class="absolute inset-0 bg-[#000A57]/30"></div>
                    <div
                        class="pointer-events-none absolute inset-0 rounded-[inherit]
                   ring-1 ring-inset ring-white/10"
                    ></div>
                </div>

                <p class="mt-3 text-[12px] text-[#000A57]/55">
                    Dica: use uma imagem de dashboard/financeiro (sem dados sensíveis) para reforçar confiança.
                </p>
            </div>
        </div>
    </div>
</section>

<!-- ===== VANTAGENS ===== -->
<section id="vantagens" class="relative py-12 md:py-16 bg-white/80">
    <div class="container px-5 md:px-8 lg:px-20">
        <div class="flex flex-col gap-3">
            <p
                class="inline-flex items-center gap-2 text-[#7E82A2] text-[14px] font-semibold"
            >
                <BadgeCheck size={18} class="text-[#EA6D0B]" />
                Por que escolas estão migrando para Pix
            </p>
            <h2
                class="text-[30px] md:text-[40px] lg:text-[46px]
               font-semibold leading-[1.12] tracking-[-0.015em] text-[#000A57]"
            >
                Menos retrabalho. Mais clareza. Mais previsibilidade.
            </h2>
            <p
                class="max-w-[820px] text-[#000A57]/75 text-[16px] leading-[1.8]"
            >
                O Pix reduz atrito no pagamento e acelera a confirmação. Para escolas, isso costuma virar
                menos mensagens repetidas, menos conferência manual e mais controle do caixa — especialmente
                no pico das mensalidades.
            </p>
        </div>

        <div class="mt-10 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {#each benefitCards as card}
                <article
                    class="rounded-[24px] bg-white ring-1 ring-black/5 p-6 shadow-sm"
                >
                    <div
                        class="flex h-12 w-12 items-center justify-center rounded-full bg-[#F3F4FD]
                   ring-1 ring-black/5"
                        aria-hidden="true"
                    >
                        <svelte:component
                            this={card.icon}
                            size={20}
                            class="text-[#EA6D0B]"
                        />
                    </div>

                    <h3 class="mt-4 text-[#010D28] font-semibold text-[20px]">
                        {card.title}
                    </h3>
                    <p class="mt-2 text-[#7E82A2] text-[15px] leading-relaxed">
                        {card.description}
                    </p>
                </article>
            {/each}
        </div>

        <div class="mt-10">
            <a
                href={ctaHref}
                class="inline-flex items-center justify-center gap-3 rounded-[70px]
               bg-[#EA6D0B] px-8 md:px-10 py-4 text-white text-[16px] font-bold
               transition hover:brightness-110 focus:outline-none focus:ring-2
               focus:ring-[#EA6D0B]/40"
            >
                <span>Ativar Celcoin e começar</span>
                <ArrowRight size={22} />
            </a>
        </div>
    </div>
</section>

<!-- ===== BLOCO ESCURO: ABRA SUA CONTA ===== -->
<section class="relative py-12 md:py-16 bg-white">
    <div class="lg:container">
        <div
            class="relative overflow-hidden lg:rounded-[28px] bg-[#0A1533] text-white ring-1 ring-white/5"
        >
            <div class="px-6 md:px-10 lg:px-14 py-12 md:py-16">
                <p
                    class="flex items-center justify-center gap-4 pb-6 text-[#AEB3D9] text-[17px]"
                >
                    <span class="inline-block h-px w-12 bg-[#AEB3D9]"></span>
                    <span>Ativação simples e guiada</span>
                    <span class="inline-block h-px w-12 bg-[#AEB3D9]"></span>
                </p>

                <h2
                    class="mt-2 text-center text-[28px] sm:text-[34px] md:text-[40px] leading-[1.15] font-semibold"
                >
                    Abra sua conta e cobre com
                    <span class="text-[#EA6D0B]">Pix</span> no F10 sem reinventar seu financeiro
                </h2>

                <div class="mt-10 grid gap-10 lg:grid-cols-12 items-start">
                    <div class="lg:col-span-7">
                        <p class="text-white/80 text-[16px] leading-[1.85]">
                            A integração com a <strong>Celcoin</strong> foi pensada para o dia a dia da escola:
                            gerar cobrança, identificar pagamento e conciliar com menos esforço — tudo no <strong>F10</strong>.
                        </p>

                        <div class="mt-6 grid gap-4 sm:grid-cols-2">
                            <div
                                class="rounded-[18px] bg-white/5 ring-1 ring-white/10 p-5"
                            >
                                <div class="flex items-center gap-3 text-white">
                                    <Wallet size={18} class="text-[#EA6D0B]" />
                                    <p class="font-semibold">
                                        Conta PJ pronta para cobrança
                                    </p>
                                </div>
                                <p
                                    class="mt-2 text-white/75 text-[14px] leading-relaxed"
                                >
                                    Centralize recebimentos e reduza dependência de processos paralelos (planilhas, prints e conferência manual).
                                </p>
                            </div>

                            <div
                                class="rounded-[18px] bg-white/5 ring-1 ring-white/10 p-5"
                            >
                                <div class="flex items-center gap-3 text-white">
                                    <Handshake
                                        size={18}
                                        class="text-[#EA6D0B]"
                                    />
                                    <p class="font-semibold">
                                        Conciliação com menos atrito
                                    </p>
                                </div>
                                <p
                                    class="mt-2 text-white/75 text-[14px] leading-relaxed"
                                >
                                    Menos “confere em planilha”, mais visibilidade do que entrou, do que falta e do que precisa de ação.
                                </p>
                            </div>
                        </div>

                        <div class="mt-8 flex flex-col sm:flex-row gap-4">
                            <a
                                href={ctaHref}
                                class="inline-flex items-center justify-center gap-3 rounded-[70px]
                       bg-[#EA6D0B] px-8 md:px-10 py-4 text-white text-[16px] font-bold
                       transition hover:brightness-110 focus:outline-none focus:ring-2
                       focus:ring-[#EA6D0B]/40"
                            >
                                <span>Criar conta Celcoin</span>
                                <ArrowRight size={22} />
                            </a>

                            <a
                                href="#faq"
                                class="inline-flex items-center justify-center gap-3 rounded-[70px]
                       border border-white/20 px-8 md:px-10 py-4 text-white text-[16px] font-semibold
                       transition hover:bg-white/10 focus:outline-none focus:ring-2
                       focus:ring-white/20"
                            >
                                <span>Tirar dúvidas rápidas</span>
                                <ArrowRight size={22} class="text-[#EA6D0B]" />
                            </a>
                        </div>

                        <p class="mt-4 text-[12px] text-white/55">
                            Observação: condições e tarifas podem variar conforme regras do provedor e configuração da operação.
                        </p>
                    </div>

                    <div class="lg:col-span-5">
                        <div
                            class="relative h-[260px] sm:h-[320px] md:h-[360px]
                     overflow-hidden rounded-[20px] ring-1 ring-white/10
                     shadow-[0_18px_50px_rgba(0,0,0,0.25)]"
                        >
                            <img
                                src={integrationImage}
                                alt="Integração Celcoin + F10 para cobranças via Pix"
                                class="absolute inset-0 h-full w-full object-cover"
                                loading="lazy"
                            />
                            <div class="absolute inset-0 bg-[#000A57]/25"></div>
                            <div
                                class="pointer-events-none absolute inset-0 rounded-[20px] ring-1 ring-inset ring-white/10"
                            ></div>
                        </div>
                    </div>
                </div>
            </div>

            <div
                class="pointer-events-none absolute inset-0 rounded-[28px] ring-1 ring-inset ring-white/10"
            ></div>
        </div>
    </div>
</section>

<!-- ===== FAQ ===== -->
<section id="faq" class="relative py-12 md:py-16 bg-white">
    <div class="container px-5 md:px-8 lg:px-20">
        <div class="flex items-center justify-between gap-6">
            <h2
                class="text-[28px] md:text-[36px] font-semibold leading-tight text-[#000A57]"
            >
                Perguntas frequentes
            </h2>

            <a
                href={ctaHref}
                class="hidden md:inline-flex items-center rounded-full border border-[#EA6D0B]
               px-4 py-2 text-[14px] font-semibold text-[#000A57]
               hover:bg-[#EA6D0B]/10 focus:outline-none focus:ring-2 focus:ring-[#EA6D0B]/40"
            >
                Ativar Celcoin
                <ArrowRight size={18} class="ml-2 text-[#EA6D0B]" />
            </a>
        </div>

        <div class="mt-8">
            <FaqAccordion items={faqItems} />
        </div>

        <div
            class="mt-8 rounded-[24px] bg-[#F3F4FD] ring-1 ring-black/5 p-6 md:p-8"
        >
            <h3 class="text-[#010D28] font-semibold text-[20px]">
                O financeiro da escola não precisa ser um “campo minado”
            </h3>
            <p
                class="mt-2 text-[#7E82A2] text-[15px] leading-relaxed max-w-[820px]"
            >
                Se a sua escola tem volume de mensalidades, múltiplos canais de atendimento e sente “gargalo”
                na confirmação de pagamento, Pix integrado ajuda a tirar peso da operação e a dar visibilidade
                real do que entrou e do que falta.
            </p>

            <div class="mt-6">
                <a
                    href={ctaHref}
                    class="inline-flex items-center justify-center gap-3 rounded-[70px]
                 bg-[#EA6D0B] px-8 md:px-10 py-4 text-white text-[16px] font-bold
                 transition hover:brightness-110 focus:outline-none focus:ring-2
                 focus:ring-[#EA6D0B]/40"
                >
                    <span>Ir para o cadastro</span>
                    <ArrowRight size={22} />
                </a>
            </div>
        </div>
    </div>
</section>
