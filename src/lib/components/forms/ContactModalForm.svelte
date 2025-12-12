<script lang="ts">
    import { createEventDispatcher, onMount } from "svelte";

    type PopupSize = "sm" | "md" | "lg" | "xl" | "full";

    type ModalLeadPayload = {
        name: string;
        email: string;
        phone: string;
        schoolName?: string;
        createdAt?: string;
        source?: string;
        page?: string;
        product?: string;
        subSource?: string;
        description?: string;
    };

    const dispatch = createEventDispatcher<{
        leadSent: ModalLeadPayload;
    }>();

    export let whatsAppNumber: string;
    export let defaultMessage: string =
        "Olá, quero falar com a equipe da F10 sobre planos e implantação.";
    export let source: string = "";
    export let page: string = "";
    export let product: string = "Modal contato – F10";
    export let subSource: string = "Modal de contato";
    export let leadDescription: string = "";

    // Callback vindo do pai para mudar o tamanho do Popup
    export let onChangeSize: (size: PopupSize) => void = () => {};

    let name = "";
    let email = "";
    let phone = "";
    let schoolName = "";
    let isSubmitting = false;
    let errorMessage = "";
    let isSuccess = false;

    let headerTitle = "Quero uma demonstração";
    $: headerTitle = isSuccess
        ? "Contato registrado"
        : "Quero uma demonstração";

    let lastLead: {
        name: string;
        email: string;
        phone: string;
        schoolName?: string;
    } | null = null;

    // Quando o modal abre, já pedimos o tamanho grande (2 colunas)
    onMount(() => {
        onChangeSize("xl");
    });

    function normalizePhone(rawPhone: string): string {
        return rawPhone.replace(/\D/g, "");
    }

    function getCurrentPath(): string | undefined {
        if (typeof window === "undefined") return undefined;
        return window.location?.pathname || "/";
    }

    function formatPhone(value: string): string {
        const digits = value.replace(/\D/g, "").slice(0, 11);
        if (digits.length <= 10) {
            return digits.replace(/(\d{0,2})(\d{0,4})(\d{0,4})/, (_, a, b, c) =>
                [a && `(${a}`, a && ") ", b, c && `-${c}`]
                    .filter(Boolean)
                    .join(""),
            );
        }
        return digits.replace(/(\d{2})(\d{1})(\d{4})(\d{4})/, "($1) $2$3-$4");
    }

    function onPhoneInput(e: Event) {
        const el = e.target as HTMLInputElement;
        phone = formatPhone(el.value);
    }

    function validateEmail(val: string): boolean {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(val.trim());
    }

    async function handleSubmit(e: Event) {
        e.preventDefault();
        errorMessage = "";

        const trimmedName = name.trim();
        const trimmedEmail = email.trim();
        const normalizedPhone = normalizePhone(phone);
        const trimmedSchoolName = schoolName.trim();

        if (
            !trimmedName ||
            normalizedPhone.length < 10 ||
            !validateEmail(trimmedEmail)
        ) {
            errorMessage =
                "Preencha nome, um e-mail válido e um número de WhatsApp com DDD.";
            return;
        }

        const currentPath = getCurrentPath();

        const resolvedPage =
            page && page.trim().length > 0 ? page : currentPath;

        const resolvedSource =
            source && source.trim().length > 0 ? source : currentPath || "/";

        const payload: ModalLeadPayload = {
            name: trimmedName,
            email: trimmedEmail,
            phone: normalizedPhone,
            schoolName:
                trimmedSchoolName.length > 0 ? trimmedSchoolName : undefined,
            createdAt: new Date().toISOString(),
            source: resolvedSource,
            page: resolvedPage,
            product,
            subSource,
            description: leadDescription,
        };

        isSubmitting = true;

        try {
            const response = await fetch("/api/contact-modal", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(payload),
            });

            if (!response.ok) {
                const body = await response.json().catch(() => null);
                errorMessage =
                    body?.error ||
                    "Não conseguimos registrar seus dados agora. Tente novamente em instantes.";
                return;
            }

            dispatch("leadSent", payload);

            lastLead = {
                name: trimmedName,
                email: trimmedEmail,
                phone: normalizedPhone,
                schoolName: trimmedSchoolName || undefined,
            };

            isSuccess = true;

            // 👇 aqui reduz o tamanho do popup para o estado "card de sucesso"
            onChangeSize("sm");
        } catch (error) {
            console.error(
                "[ContactModalForm] Erro ao enviar lead:",
                error,
            );
            errorMessage =
                "Erro de conexão ao enviar seus dados. Verifique sua internet e tente de novo.";
        } finally {
            isSubmitting = false;
        }
    }

    function openWhatsappNow() {
        if (!lastLead) return;

        const extraLines: string[] = [];

        if (lastLead.schoolName) {
            extraLines.push(`Escola: ${lastLead.schoolName}`);
        }
        extraLines.push(`WhatsApp: ${lastLead.phone}`);
        extraLines.push(`E-mail: ${lastLead.email}`);

        const encodedMessage = encodeURIComponent(
            `${defaultMessage}\n\nNome: ${lastLead.name}\n${extraLines.join(
                "\n",
            )}`,
        );
        const targetNumber = normalizePhone(whatsAppNumber);
        const whatsAppUrl = `https://wa.me/${targetNumber}?text=${encodedMessage}`;

        if (typeof window !== "undefined") {
            window.open(whatsAppUrl, "_blank");
        }
    }

    function goTo(url: string) {
        if (typeof window !== "undefined") {
            window.location.href = url;
        }
    }
</script>

<div class="w-full">
    <!-- HEADER DO MODAL -->
    <div
        class="flex items-center justify-between border-b border-slate-200 px-6 md:px-8 py-4 md:py-5"
    >
        <h2 class="text-[#010D28] font-semibold text-lg md:text-[20px]">
            {headerTitle}
        </h2>
    </div>

    {#if !isSuccess}
        <!-- ESTADO: FORMULÁRIO -->
        <div class="grid gap-8 px-6 py-6 md:px-8 md:py-8 md:grid-cols-2 max-h-[70vh] overflow-y-auto">

            <!-- COLUNA ESQUERDA -->
            <div class="hidden lg:block">
                <h3
                    class="text-[24px] md:text-[28px] font-semibold leading-snug text-[#EA6D0B] mb-6"
                >
                    Transforme a rotina da sua escola com tecnologia inteligente
                </h3>

                <img
                    src="/form_img.webp"
                    alt="Equipe utilizando o sistema F10"
                    class="w-full rounded-2xl shadow-sm mb-6"
                    loading="lazy"
                />

                <p class="text-[15px] leading-relaxed text-[#5A5E75]">
                    Conheça todos os módulos da F10 na prática, com a orientação
                    de um dos nossos especialistas. Sem compromisso, direto ao
                    ponto e personalizado para a realidade do seu colégio.
                </p>
            </div>

            <!-- COLUNA DIREITA: FORM -->
            <div class="flex items-stretch">
                <form
                    on:submit={handleSubmit}
                    class="w-full flex flex-col gap-4 rounded-2xl bg-[#F3F4F7] p-6 md:p-7"
                    novalidate
                >
                    <p class="text-[12px] text-[#6B7280] mb-1">
                        Preencha seus dados para continuarmos o atendimento com
                        você.
                    </p>

                    <label
                        class="flex flex-col text-sm font-medium text-gray-700"
                        for="modal-name"
                    >
                        Nome
                        <input
                            id="modal-name"
                            type="text"
                            bind:value={name}
                            required
                            class="mt-1 rounded-lg border border-gray-300 px-4 py-3 text-[14px] focus:outline-none focus:ring-2 focus:ring-[#EA6D0B]"
                            placeholder="Seu nome completo"
                            autocomplete="name"
                        />
                    </label>

                    <label
                        class="flex flex-col text-sm font-medium text-gray-700"
                        for="modal-email"
                    >
                        E-mail
                        <input
                            id="modal-email"
                            type="email"
                            bind:value={email}
                            required
                            class="mt-1 rounded-lg border border-gray-300 px-4 py-3 text-[14px] focus:outline-none focus:ring-2 focus:ring-[#EA6D0B]"
                            placeholder="seuemail@exemplo.com"
                            autocomplete="email"
                        />
                    </label>

                    <label
                        class="flex flex-col text-sm font-medium text-gray-700"
                        for="modal-phone"
                    >
                        WhatsApp
                        <input
                            id="modal-phone"
                            type="tel"
                            bind:value={phone}
                            required
                            class="mt-1 rounded-lg border border-gray-300 px-4 py-3 text-[14px] focus:outline-none focus:ring-2 focus:ring-[#EA6D0B]"
                            placeholder="(00) 00000-0000"
                            on:input={onPhoneInput}
                            inputmode="tel"
                            autocomplete="tel"
                        />
                    </label>

                    <label
                        class="flex flex-col text-sm font-medium text-gray-700"
                        for="modal-school"
                    >
                        Nome da escola
                        <input
                            id="modal-school"
                            type="text"
                            bind:value={schoolName}
                            class="mt-1 rounded-lg border border-gray-300 px-4 py-3 text-[14px] focus:outline-none focus:ring-2 focus:ring-[#EA6D0B]"
                            placeholder="Nome da instituição"
                            autocomplete="organization"
                        />
                    </label>

                    {#if errorMessage}
                        <p class="text-[12px] text-rose-600">
                            {errorMessage}
                        </p>
                    {/if}

                    <button
                        type="submit"
                        class="mt-2 rounded-lg bg-[#EA6D0B] py-3 text-[15px] font-semibold text-white transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-70"
                        disabled={isSubmitting}
                    >
                        {#if isSubmitting}
                            Enviando…
                        {:else}
                            Enviar dados
                        {/if}
                    </button>

                    <p class="mt-1 text-center text-[11px] text-[#9CA3C8]">
                        Seus dados serão usados apenas para contato comercial
                        sobre o F10.
                    </p>
                </form>
            </div>
        </div>
    {:else}
        <!-- ESTADO: SUCESSO / PRÓXIMO PASSO -->
        <div
            class="px-6 py-10 md:px-10 flex flex-col items-center text-center gap-6"
        >
            <!-- ÍCONE MAIOR -->
            <div
                class="flex h-20 w-20 items-center justify-center rounded-full bg-emerald-50 text-emerald-600"
            >
                <div
                    class="flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100"
                >
                    <svg viewBox="0 0 24 24" class="h-8 w-8" aria-hidden="true">
                        <circle
                            cx="12"
                            cy="12"
                            r="10"
                            fill="currentColor"
                            opacity="0.12"
                        />
                        <path
                            d="M8 12.5l2.5 2.5L16 9"
                            fill="none"
                            stroke="currentColor"
                            stroke-width="2"
                            stroke-linecap="round"
                            stroke-linejoin="round"
                        />
                    </svg>
                </div>
            </div>

            <div class="space-y-2 max-w-md">
                <h3
                    class="text-[22px] md:text-[24px] font-semibold text-[#010D28]"
                >
                    Recebemos seus dados com sucesso
                </h3>
                <p class="text-[14px] md:text-[15px] text-[#5A5E75]">
                    Sua solicitação já foi registrada com nossa equipe
                    comercial.
                </p>
                <p class="text-[14px] md:text-[15px] text-[#5A5E75]">
                    O que você quer fazer agora?
                </p>
            </div>

            <!-- BOTÕES EMPILHADOS -->
            <div class="mt-2 flex w-full max-w-sm flex-col gap-3">
                <button
                    type="button"
                    class="w-full rounded-full bg-[#25D366] py-3 px-4 text-[15px] font-semibold text-white transition hover:bg-[#20bd59]"
                    on:click={openWhatsappNow}
                >
                    Falar agora pelo WhatsApp
                </button>

                <button
                    type="button"
                    class="w-full rounded-full border border-slate-300 bg-white py-3 px-4 text-[15px] font-semibold text-[#010D28] hover:bg-slate-50 transition"
                    on:click={() => goTo("/preco")}
                >
                    Ver planos e preços
                </button>

                <button
                    type="button"
                    class="w-full rounded-full border border-slate-300 bg-white py-3 px-4 text-[15px] font-semibold text-[#010D28] hover:bg-slate-50 transition"
                    on:click={() => goTo("/solucoes")}
                >
                    Ver funcionalidades
                </button>
            </div>
        </div>
    {/if}
</div>
