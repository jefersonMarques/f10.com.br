<script lang="ts">
    type LeadIcon = {
        src: string;
        alt: string;
        className: string;
    };

    // Ícones que representam os leads que entram no funil
    const leadIcons: LeadIcon[] = [
        {
            src: "/icon_google.webp",
            alt: "Leads do Google Ads",
            className: "lead-dot lead-dot--center lead-dot--delay-1",
        },
        {
            src: "/icon_mail.webp",
            alt: "Leads por email",
            className: "lead-dot lead-dot--left lead-dot--delay-1",
        },
        {
            src: "/icon_facebook.webp",
            alt: "Leads do Facebook Ads",
            className: "lead-dot lead-dot--right lead-dot--delay-2",
        },
        {
            src: "/icon_instagram.webp",
            alt: "Leads do Instagram",
            className: "lead-dot lead-dot--left lead-dot--delay-3",
        },
        {
            src: "/icon_phone.webp",
            alt: "Leads de telefone",
            className: "lead-dot lead-dot--diag-right lead-dot--delay-4",
        },
        {
            src: "/icon_whatsApp.webp",
            alt: "Leads do WhatsApp",
            className: "lead-dot lead-dot--diag-left lead-dot--delay-5",
        },
        {
            src: "/icon_user.webp",
            alt: "Equipe comercial recebendo leads",
            className: "lead-dot lead-dot--center-2 lead-dot--delay-6",
        },
    ];
</script>

<div class="relative w-full flex items-center justify-center min-h-[320px]">
    <!-- Glow / cartão de fundo para dar profundidade -->
    <div
        class="absolute right-0 md:right-[5%] top-6 md:top-12 w-[260px] sm:w-[320px] lg:w-[400px] h-[340px] lg:h-[300px]
                 rounded-[32px] bg-white/30"
    ></div>

    <!-- Wrapper central do funil + leads -->
    <div
        class="relative flex items-center justify-center w-[260px] sm:w-[320px] lg:w-[420px]"
    >
        <!-- Funil semitransparente -->
        <img
            src="/funnel_marketing.svg"
            alt="Funil de marketing"
            class="relative w-full opacity-80 z-[2]"
            loading="lazy"
            aria-hidden="true"
        />

        <!-- Leads animados (ícones) por trás do funil -->
        <div
            class="pointer-events-none absolute inset-0 overflow-visible z-[1]"
            aria-hidden="true"
        >
            {#each leadIcons as lead}
                <span class={lead.className}>
                    <img src={lead.src} alt={lead.alt} loading="lazy" />
                </span>
            {/each}
        </div>

        <!-- Mini-card de contexto no rodapé do funil -->
        <div
            class="absolute -bottom-8 right-1 sm:right-6 lg:right-10 z-[3]
                   inline-flex items-center gap-3 rounded-2xl bg-white/90 backdrop-blur
                   px-4 py-3 shadow-[0_10px_30px_rgba(1,13,40,0.18)]"
        >
            <div
                class="h-8 w-8 rounded-full bg-[#16ff001a] flex items-center justify-center"
            >
                <span class="h-2 w-2 rounded-full bg-[#16a34a] animate-ping"
                ></span>
            </div>
            <div class="flex flex-col text-left">
                <span
                    class="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500"
                >
                    Leads entrando agora
                </span>
                <span class="text-[14px] font-semibold text-slate-900">
                    Distribuídos para o time comercial
                </span>
            </div>
        </div>
    </div>
</div>

<style>
    /* ===================== LEADS (ÍCONES EM BOLINHAS) ===================== */
    .lead-dot {
        position: absolute;
        top: 0;
        left: 50%;
        width: 30px;
        height: 30px;
        border-radius: 9999px;
        background: #ffffff;
        opacity: 0;
        transform: translate(-200px, -260px) scale(0.8);
        animation-duration: 7s;
        animation-timing-function: linear;
        animation-iteration-count: infinite;
    }

    @media (min-width: 1024px) {
        .lead-dot {
            width: 48px;
            height: 48px;
        }
    }

    .lead-dot img {
        width: 100%;
        height: 100%;
        border-radius: inherit;
        object-fit: contain;
        padding: 4px;
    }

    .lead-dot--center {
        animation-name: leadArcCenter;
    }
    .lead-dot--center-2 {
        animation-name: leadArcCenter2;
    }
    .lead-dot--right {
        animation-name: leadArcRight;
    }
    .lead-dot--left {
        animation-name: leadArcLeft;
    }
    .lead-dot--diag-right {
        animation-name: leadArcDiagRight;
    }
    .lead-dot--diag-left {
        animation-name: leadArcDiagLeft;
    }

    .lead-dot--delay-1 {
        animation-delay: 0s;
    }
    .lead-dot--delay-2 {
        animation-delay: 1.1s;
    }
    .lead-dot--delay-3 {
        animation-delay: 2.2s;
    }
    .lead-dot--delay-4 {
        animation-delay: 3.3s;
    }
    .lead-dot--delay-5 {
        animation-delay: 4.4s;
    }
    .lead-dot--delay-6 {
        animation-delay: 5.2s;
    }

    @keyframes leadArcCenter {
        0% {
            opacity: 0;
            transform: translate(-220px, -260px) scale(0.8);
        }
        20% {
            opacity: 1;
            transform: translate(-150px, -210px) scale(0.85);
        }
        40% {
            transform: translate(-60px, -140px) scale(0.95);
        }
        60% {
            transform: translate(0px, -50px) scale(1);
        }
        80% {
            transform: translate(10px, 80px) scale(1.02);
            opacity: 0.9;
        }
        100% {
            opacity: 0;
            transform: translate(0px, 250px) scale(0.95);
        }
    }

    @keyframes leadArcCenter2 {
        0% {
            opacity: 0;
            transform: translate(220px, -260px) scale(0.8);
        }
        20% {
            opacity: 1;
        }
        80% {
            transform: translate(0px, 90px) scale(1.02);
            opacity: 0.9;
        }
        100% {
            opacity: 0;
            transform: translate(-10px, 250px) scale(0.95);
        }
    }

    @keyframes leadArcRight {
        0% {
            opacity: 0;
            transform: translate(260px, -240px) scale(0.8);
        }
        22% {
            opacity: 1;
        }
        82% {
            transform: translate(40px, 90px) scale(1.03);
            opacity: 0.9;
        }
        100% {
            opacity: 0;
            transform: translate(0px, 260px) scale(0.96);
        }
    }

    @keyframes leadArcLeft {
        0% {
            opacity: 0;
            transform: translate(-300px, -240px) scale(0.8);
        }
        22% {
            opacity: 1;
        }
        82% {
            opacity: 0.9;
        }
        100% {
            opacity: 0;
            transform: translate(0px, 260px) scale(0.96);
        }
    }

    @keyframes leadArcDiagRight {
        0% {
            opacity: 0;
            transform: translate(210px, -260px) scale(0.8);
        }
        20% {
            opacity: 1;
        }
        80% {
            transform: translate(40px, 90px) scale(1.03);
            opacity: 0.9;
        }
        100% {
            opacity: 0;
            transform: translate(-5px, 260px) scale(0.96);
        }
    }

    @keyframes leadArcDiagLeft {
        0% {
            opacity: 0;
            transform: translate(-230px, -260px) scale(0.8);
        }
        20% {
            opacity: 1;
        }
        80% {
            transform: translate(-60px, 90px) scale(1.03);
            opacity: 0.9;
        }
        100% {
            opacity: 0;
            transform: translate(0px, 260px) scale(0.96);
        }
    }
</style>
