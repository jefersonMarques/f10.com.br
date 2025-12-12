<script lang="ts">
    import IconArrowRight from "$lib/icons/IconArrowRight.svelte";
    import { Check, X, AlertTriangle } from "lucide-svelte";

    type BillingPeriod = "monthly" | "yearly";

    const PLAN_IDS = ["starter", "standard", "pro", "enterprise"] as const;
    type PlanId = (typeof PLAN_IDS)[number];

    type ModuleId =
        | "users"
        | "marketing"
        | "sales"
        | "pedagogy"
        | "finance"
        | "indicators"
        | "app"
        | "lms"
        | "migration";

    const moduleList: { id: ModuleId; label: string }[] = [
        { id: "users", label: "Usuários" },
        { id: "marketing", label: "Marketing" },
        { id: "sales", label: "Comercial" },
        { id: "pedagogy", label: "Pedagógico" },
        { id: "finance", label: "Financeiro" },
        { id: "indicators", label: "Indicadores" },
        { id: "app", label: "Aplicativo" },
        { id: "lms", label: "AVA" },
        { id: "migration", label: "Migração" },
    ];

    type Plan = {
        id: PlanId;
        name: string;
        badge?: string;
        description: string;
        highlight?: boolean;
        priceMonthly: string;
        priceYearly: string;
        priceSuffix: string;
        note: string;
        ctaLabel: string;
        ctaHref: string;
        bestFor: string;
        enterpriseNote?: string;
        modules?: ModuleId[];
        moduleBadges?: Partial<Record<ModuleId, "limited" | "consult">>;
    };

    let billing: BillingPeriod = "monthly";

    const plans: Plan[] = [
        {
            id: "starter",
            name: "Inicial",
            moduleBadges: {
                finance: "limited",
                pedagogy: "limited",
                users: "limited",
            },
            description:
                "Para escolas que estão saindo da planilha e querem organizar vendas, matrículas e turmas com o essencial.",
            priceMonthly: "R$ 549",
            priceYearly: "R$ 5.490", // ~10x
            priceSuffix: "por unidade escolar",
            note: "Implantação a partir de R$ 799, inclui trilha em vídeo, suporte por WhatsApp e até 3 usuários internos.",
            ctaLabel: "Começar agora",
            ctaHref: "/contato?plano=inicial",
            bestFor:
                "Escolas pequenas, pilotos em uma unidade e operações que estão dando os primeiros passos no funil.",
            enterpriseNote:
                "Inclui até 3 usuários internos. Para adicionar mais usuários, solicite uma condição personalizada.",
            // Comercial + Contratos + Pedagógico essencial + Turmas/Conteúdo + Financeiro só recebimento
            modules: ["users", "sales", "pedagogy", "finance"],
        },
        {
            id: "standard",
            name: "Essencial",
            badge: "Mais escolhido",
            moduleBadges: {
                lms: "consult", // AVA sob consulta
                app: "consult", // App sob consulta
            },
            highlight: true,
            description:
                "Gestão completa de Vendas, Pedagógico e Financeiro dentro do F10, sem depender de integrações externas.",
            priceMonthly: "R$ 849",
            priceYearly: "R$ 8.490", // ~10x
            priceSuffix: "por unidade escolar",
            note: "Implantação a partir de R$ 1.299, com treinamento em vídeo, suporte por WhatsApp e meetings em vídeo.",
            ctaLabel: "Falar com o time comercial",
            ctaHref: "/contato?plano=Essencial",
            bestFor:
                "Escolas com equipe comercial ativa que precisam controlar funil, contratos, jornada do aluno e financeiro completo com o mínimo de fricção técnica.",
            enterpriseNote:
                "Descontos progressivos em contratos anuais e para redes com múltiplas unidades.",
            modules: ["users", "marketing", "sales", "pedagogy", "finance"],
        },
        {
            id: "pro",
            name: "Completo",
            description:
                "Tudo do plano Essencial, somado a indicadores avançados, aplicativo, AVA/EAD e integrações oficiais.",
            priceMonthly: "R$ 1.899",
            priceYearly: "R$ 18.990", // ~10x
            priceSuffix: "por unidade escolar",
            note: "Implantação Premium a partir de R$ 3.499, incluindo integrações, app Smart Aluno, portal e configuração avançada.",
            ctaLabel: "Agendar demonstração",
            ctaHref: "/contato?plano=completo",
            bestFor:
                "Redes, franquias e escolas com alto volume de leads que precisam de indicadores, app com a marca da escola, AVA/EAD e integrações completas.",
            enterpriseNote:
                "Franquias e multiunidades: condições especiais e governança sob consulta.",
            modules: [
                "users",
                "marketing",
                "sales",
                "pedagogy",
                "finance",
                "indicators",
                "app",
                "lms",
                "migration",
            ],
        },
        {
            id: "enterprise",
            name: "Multiunidades",
            badge: "Sob medida",
            description:
                "Projeto sob medida para grupos com múltiplas unidades, marcas diferentes e operação em rede ou franquia.",
            priceMonthly: "Sob consulta",
            priceYearly: "Sob consulta",
            priceSuffix: "",
            note: "Inclui onboarding dedicado, integrações corporativas, governança por rede e modelos avançados de indicadores.",
            ctaLabel: "Analisar operação",
            ctaHref: "/contato?plano=multiunidades",
            bestFor:
                "Grupos educacionais, redes de franquia e operações com 2 ou mais unidades que exigem visão consolidada e regras de acesso por unidade/nível.",
            modules: [
                "marketing",
                "sales",
                "pedagogy",
                "finance",
                "indicators",
                "app",
                "lms",
                "migration",
            ],
        },
    ];

    const planMap: Record<PlanId, Plan> = plans.reduce(
        (acc, plan) => {
            acc[plan.id] = plan;
            return acc;
        },
        {} as Record<PlanId, Plan>,
    );

    function getCurrentPrice(plan: Plan): string {
        if (plan.priceMonthly === "Sob consulta") {
            return "Sob consulta";
        }
        return billing === "monthly" ? plan.priceMonthly : plan.priceYearly;
    }

    function getBillingSuffix(): string {
        return billing === "monthly" ? "/mês" : "/mês (no plano anual)";
    }

    function isHighlighted(plan: Plan): boolean {
        return !!plan.highlight;
    }

    function badgeColor(plan: Plan): string {
        if (!plan.badge) return "";
        if (plan.highlight) {
            return "bg-white text-[#010D28]";
        }
        return "bg-[#010D28] text-white";
    }
</script>

<!-- Toggle mensal / anual -->
<div class="mt-8 flex justify-center">
    <div
        class="inline-flex items-center rounded-full border border-slate-200 bg-white px-1 py-1 shadow-sm"
    >
        <button
            type="button"
            class={`relative rounded-full px-4 py-2 text-[13px] font-medium transition ${
                billing === "monthly"
                    ? "bg-[#010D28] text-white shadow-sm"
                    : "text-slate-600 hover:text-[#010D28]"
            }`}
            on:click={() => (billing = "monthly")}
        >
            Mensal
        </button>
        <button
            type="button"
            class={`relative rounded-full px-4 py-2 text-[13px] font-medium transition ${
                billing === "yearly"
                    ? "bg-[#010D28] text-white shadow-sm"
                    : "text-slate-600 hover:text-[#010D28]"
            }`}
            on:click={() => (billing = "yearly")}
        >
            Anual
            <span
                class="ml-1 rounded-full bg-emerald-50 px-2 py-[2px] text-[11px] font-semibold text-emerald-700"
            >
                2 meses grátis
            </span>
        </button>
    </div>
</div>

<p class="mt-3 text-center text-[12px] text-[#6B7280]">
    Valores indicativos. Na conversa comercial ajustamos ao seu cenário de
    unidades e volume.
</p>

<!-- GRID DE PLANOS PRINCIPAIS -->
<div
    class="mt-10 lg:mt-14 grid grid-cols-1 gap-6 md:grid-cols-3 md:gap-6 max-w-6xl mx-auto"
>
    {#each plans.filter((p) => p.id !== "enterprise") as plan}
        <article
            class={`relative overflow-hidden flex h-full flex-col rounded-3xl border px-6 py-6 md:px-7 md:py-7 transition
                ${
                    isHighlighted(plan)
                        ? "border-[#010D28] bg-[#010D28] text-white shadow-[0_18px_40px_rgba(1,13,40,0.28)] scale-[1.01]"
                        : "border-slate-200 bg-white text-[#010D28] shadow-sm hover:shadow-md"
                }`}
        >
            {#if plan.id === "standard"}
                <!-- Fundo decorativo só no Essencial -->
                <div
                    class="pointer-events-none absolute inset-0 -z-10"
                    aria-hidden="true"
                >
                    <img
                        src="/booble_bg.webp"
                        alt=""
                        class="w-full h-full object-cover opacity-[0.26] rotate-[-250deg] scale-[1.4]"
                    />
                </div>
            {/if}

            {#if plan.badge}
                <div
                    class={`absolute right-5 top-5 inline-flex items-center rounded-full px-3 py-1 text-[11px] font-semibold ${badgeColor(
                        plan,
                    )}`}
                >
                    {plan.badge}
                </div>
            {/if}

            <header>
                <h2
                    class="text-[18px] md:text-[20px] font-semibold leading-snug"
                >
                    {plan.name}
                </h2>
                <p
                    class={`mt-1 text-[13px] md:text-[14px] ${
                        isHighlighted(plan)
                            ? "text-slate-100/90"
                            : "text-[#6B7280]"
                    }`}
                >
                    {plan.description}
                </p>
            </header>

            <!-- Preço -->
            <div class="mt-5">
                <p
                    class={`text-[26px] md:text-[30px] font-semibold tracking-[-0.03em] ${
                        isHighlighted(plan)
                            ? "text-white"
                            : "text-[#010D28]"
                    }`}
                >
                    {getCurrentPrice(plan)}

                    {#if plan.priceMonthly !== "Sob consulta"}
                        <span
                            class="ml-1 text-[13px] font-normal text-inherit"
                        >
                            {getBillingSuffix()}
                        </span>
                    {/if}
                </p>

                {#if plan.priceSuffix}
                    <p
                        class={`mt-1 text-[12px] ${
                            isHighlighted(plan)
                                ? "text-slate-200/90"
                                : "text-[#6B7280]"
                        }`}
                    >
                        {plan.priceSuffix}
                    </p>
                {/if}

                {#if plan.enterpriseNote}
                    <p
                        class={`mt-1 text-[11px] ${
                            isHighlighted(plan)
                                ? "text-slate-200/90"
                                : "text-[#6B7280]"
                        }`}
                    >
                        {plan.enterpriseNote}
                    </p>
                {/if}
            </div>

            <!-- Módulos incluídos (check / X / badge limitado / sob consulta) -->
            <div class="mt-4">
                <p
                    class={`text-[12px] font-medium ${
                        isHighlighted(plan)
                            ? "text-slate-100"
                            : "text-[#4B5563]"
                    }`}
                >
                    O que este plano resolve no dia a dia:
                </p>
                <ul class="mt-2 space-y-1 text-[12px]">
                    {#each moduleList as module}
                        {#if plan}
                            {@const isFull =
                                plan.modules &&
                                plan.modules.includes(module.id)}
                            {@const badgeType =
                                plan.moduleBadges &&
                                plan.moduleBadges[module.id]}
                            <li class="flex items-center gap-2">
                                {#if isFull}
                                    <span
                                        class={`inline-flex items-center justify-center ${
                                            isHighlighted(plan)
                                                ? "text-emerald-300"
                                                : "text-emerald-500"
                                        }`}
                                    >
                                        <Check size={14} />
                                    </span>
                                {:else if badgeType}
                                    <span
                                        class={`inline-flex items-center justify-center ${
                                            badgeType === "limited"
                                                ? "text-orange-500"
                                                : "text-yellow-500"
                                        }`}
                                    >
                                        <AlertTriangle size={14} />
                                    </span>
                                {:else}
                                    <span
                                        class="inline-flex items-center justify-center text-slate-300"
                                    >
                                        <X size={14} />
                                    </span>
                                {/if}

                                <span
                                    class={`${
                                        isHighlighted(plan)
                                            ? "text-slate-100/90"
                                            : "text-[#6B7280]"
                                    }`}
                                >
                                    {module.label}
                                </span>

                                {#if badgeType}
                                    <span
                                        class={`ml-auto inline-flex items-center rounded-full px-2 py-[1px] text-[10px] font-semibold ${
                                            badgeType === "limited"
                                                ? "bg-yellow-100 text-yellow-600"
                                                : "bg-yellow-600/20 text-yellow-600"
                                        }`}
                                    >
                                        {badgeType === "limited"
                                            ? "Limitado"
                                            : "Sob consulta"}
                                    </span>
                                {/if}
                            </li>
                        {/if}
                    {/each}
                </ul>
            </div>

            <!-- CTA -->
            <div class="mt-6">
                <a
                    href={plan.ctaHref}
                    class={`inline-flex w-full items-center justify-center rounded-full px-5 py-2.5 text-[14px] font-semibold transition
                        ${
                            isHighlighted(plan)
                                ? "bg-white text-[#010D28] hover:bg-slate-100"
                                : "bg-primary text-white hover:brightness-95"
                        }`}
                >
                    {plan.ctaLabel}
                    <IconArrowRight
                        size={20}
                        stroke={isHighlighted(plan) ? "#010D28" : "white"}
                        classType="ml-2"
                    />
                </a>
                <p
                    class={`mt-2 text-[12px] ${
                        isHighlighted(plan)
                            ? "text-slate-200/90"
                            : "text-[#6B7280]"
                    }`}
                >
                    {plan.note}
                </p>
            </div>

            <div
                class="mt-4 border-t border-white/10 border-slate-200/80 pt-4"
            >
                <p
                    class={`text-[12px] font-medium ${
                        isHighlighted(plan)
                            ? "text-slate-100"
                            : "text-[#4B5563]"
                    }`}
                >
                    Indicado para:
                </p>
                <p
                    class={`mt-1 text-[13px] ${
                        isHighlighted(plan)
                            ? "text-slate-100/90"
                            : "text-[#6B7280]"
                    }`}
                >
                    {plan.bestFor}
                </p>
            </div>
        </article>
    {/each}
</div>

<!-- MULTIUNIDADES / ENTERPRISE EM CARD SEPARADO -->
<div class="mt-8 max-w-6xl mx-auto">
    {#if planMap.enterprise}
        <article
            class="relative flex flex-col gap-4 rounded-3xl border border-slate-200 bg-slate-900 px-6 py-6 md:px-8 md:py-7 text-white overflow-hidden"
        >
            <div
                class="pointer-events-none absolute inset-0 opacity-[0.28]"
                aria-hidden="true"
            >
                <div
                    class="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(234,109,11,0.45),transparent_65%)]"
                ></div>
            </div>

            <div
                class="relative z-10 flex flex-col gap-4 md:flex-row md:items-center md:justify-between"
            >
                <div>
                    <p
                        class="inline-flex items-center rounded-full bg-white/10 px-3 py-1 text-[11px] font-semibold tracking-[0.16em] uppercase"
                    >
                        {planMap.enterprise.badge}
                    </p>
                    <h2 class="mt-2 text-[20px] md:text-[22px] font-semibold">
                        {planMap.enterprise.name}
                    </h2>
                    <p class="mt-1 text-[14px] text-slate-100/90 max-w-xl">
                        {planMap.enterprise.description}
                    </p>
                </div>

                <div class="md:text-right">
                    <p class="text-[18px] font-semibold">Sob consulta</p>
                    <p class="mt-1 text-[12px] text-slate-200/90">
                        Pensado para franquias, redes e grupos com múltiplas
                        unidades que precisam de governança, integrações
                        específicas e visão consolidada dos resultados, com
                        indicadores por unidade e por grupo.
                    </p>
                    <a
                        href={planMap.enterprise.ctaHref}
                        class="mt-3 inline-flex items-center justify-center rounded-full bg-white px-5 py-2.5 text-[14px] font-semibold text-[#010D28] hover:bg-slate-100"
                    >
                        {planMap.enterprise.ctaLabel}
                        <IconArrowRight
                            size={20}
                            stroke={"#010D28"}
                            classType="ml-2"
                        />
                    </a>
                </div>
            </div>
        </article>
    {/if}
</div>
