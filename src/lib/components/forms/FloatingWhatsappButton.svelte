<script lang="ts">
    import { createEventDispatcher, onMount } from "svelte";

    // Payload enviado pro back
    type LeadPayload = {
        name: string;
        phone: string;
        createdAt?: string;
        source?: string;
        page?: string;
        product?: string;
        subSource?: string;
        description?: string;
        schoolName?: string;
    };

    const dispatch = createEventDispatcher<{
        leadSent: LeadPayload;
    }>();

    export let whatsAppNumber: string;
    export let defaultMessage: string =
        "Olá, quero falar com a equipe da F10 sobre planos e implantação.";

    // origem genérica (se vier vazio, usamos pathname)
    export let source: string = "";

    // página mais específica (se não vier, pathname)
    export let page: string | undefined;

    // Produto do interesse daquele botão (página)
    export let product: string = "Software F10";
    // SubSource mais específico (bot flutuante / página tal)
    export let subSource: string = "Botão flutuante site";
    // Descrição contextual vinda do front
    export let leadDescription: string = "";

    let isOpen = false;
    let name = "";
    let phone = "";
    let schoolName = ""; // 🆕 campo Nome da escola
    let isSubmitting = false;
    let errorMessage = "";

    let isBusinessHours = false;
    let showOnlineHint = false;

    function normalizePhone(rawPhone: string): string {
        return rawPhone.replace(/\D/g, "");
    }

    function getCurrentPath(): string | undefined {
        if (typeof window === "undefined") return undefined;
        return window.location?.pathname || "/";
    }

    function checkBusinessHours(): boolean {
        const now = new Date();
        const day = now.getDay(); // 0 = domingo
        const hour = now.getHours(); // 0–23

        const isWeekday = day >= 1 && day <= 5;
        const inWorkingHours = hour >= 9 && hour < 18;

        return isWeekday && inWorkingHours;
    }

    onMount(() => {
        isBusinessHours = checkBusinessHours();

        if (isBusinessHours) {
            const timer = setTimeout(() => {
                showOnlineHint = true;
            }, 5000);

            return () => clearTimeout(timer);
        }
    });

    function toggleOpen() {
        isOpen = !isOpen;
        errorMessage = "";
        if (isOpen) {
            showOnlineHint = false;
        }
    }

    async function handleSubmit() {
        errorMessage = "";

        const trimmedName = name.trim();
        const normalizedPhone = normalizePhone(phone);
        const trimmedSchoolName = schoolName.trim();

        if (!trimmedName || normalizedPhone.length < 10) {
            errorMessage =
                "Preencha seu nome e um número de WhatsApp válido (com DDD).";
            return;
        }

        const currentPath = getCurrentPath();

        const resolvedPage =
            page && page.trim().length > 0 ? page : currentPath;

        const resolvedSource =
            source && source.trim().length > 0 ? source : currentPath || "/";

        const payload: LeadPayload = {
            name: trimmedName,
            phone: normalizedPhone,
            createdAt: new Date().toISOString(),
            source: resolvedSource,
            page: resolvedPage,
            product,
            subSource,
            description: leadDescription,
            schoolName:
                trimmedSchoolName.length > 0 ? trimmedSchoolName : undefined,
        };

        isSubmitting = true;

        try {
            const response = await fetch("/api/whatsapp-lead", {
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

            const encodedMessage = encodeURIComponent(
                `${defaultMessage}\n\nNome: ${trimmedName}${
                    trimmedSchoolName ? `\nEscola: ${trimmedSchoolName}` : ""
                }\nWhatsApp: ${normalizedPhone}`,
            );
            const targetNumber = normalizePhone(whatsAppNumber);
            const whatsAppUrl = `https://wa.me/${targetNumber}?text=${encodedMessage}`;

            if (typeof window !== "undefined") {
                window.open(whatsAppUrl, "_blank");
            }

            name = "";
            phone = "";
            schoolName = "";
            isOpen = false;
        } catch (error) {
            console.error("Erro ao enviar lead:", error);
            errorMessage =
                "Erro de conexão ao enviar seus dados. Verifique sua internet e tente de novo.";
        } finally {
            isSubmitting = false;
        }
    }
</script>

<!-- Overlay global, sempre fixo no viewport -->
<div class="fixed inset-0 z-[9999] pointer-events-none">
    <!-- Container do botão / card: flutua no canto -->
    <div
        class="absolute bottom-4 right-4 md:bottom-6 md:right-6 pointer-events-auto"
    >
        <div class="relative flex flex-col items-end gap-3">
            {#if isOpen}
                <div
                    class="w-[320px] rounded-2xl border border-slate-200/90 bg-white/95 p-4 shadow-2xl shadow-slate-900/25 backdrop-blur-sm origin-bottom-right transform transition duration-200 ease-out scale-100 opacity-100"
                    aria-label="Formulário para atendimento pelo WhatsApp"
                >
                    <div class="flex items-start justify-between gap-3">
                        <div class="text-left">
                            <p
                                class="inline-flex items-center rounded-full bg-emerald-50 px-2.5 py-[3px] text-[11px] font-semibold text-emerald-700"
                            >
                                Atendimento F10
                            </p>
                            <h3
                                class="mt-2 text-sm font-semibold text-slate-900"
                            >
                                Vamos acelerar seu atendimento 👇
                            </h3>
                            {#if isBusinessHours}
                                <p class="mt-1 text-xs text-slate-600">
                                    Nossa equipe comercial está online agora.
                                    Preencha rapidinho e já continuamos a
                                    conversa pelo WhatsApp.
                                </p>
                            {:else}
                                <p class="mt-1 text-xs text-slate-600">
                                    Estamos fora do horário comercial, mas seu
                                    contato será registrado. Preencha seus dados
                                    e o time comercial vai falar com você no
                                    próximo horário útil.
                                </p>
                            {/if}
                        </div>

                        <button
                            type="button"
                            class="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200 hover:text-slate-700 text-xs font-semibold"
                            on:click={toggleOpen}
                            aria-label="Fechar formulário de WhatsApp"
                        >
                            ×
                        </button>
                    </div>

                    <form
                        class="mt-4 space-y-3"
                        on:submit|preventDefault={handleSubmit}
                    >
                        <div class="text-left">
                            <label
                                for="floating-name"
                                class="block text-xs font-medium text-slate-700"
                                >Nome completo</label
                            >
                            <input
                                id="floating-name"
                                type="text"
                                bind:value={name}
                                class="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-[#EA6D0B] focus:outline-none focus:ring-2 focus:ring-[#EA6D0B]/20"
                                placeholder="Como podemos te chamar?"
                            />
                        </div>

                        <div class="text-left">
                            <label
                                for="floating-school"
                                class="block text-xs font-medium text-slate-700"
                                >Nome da escola (opcional)</label
                            >
                            <input
                                id="floating-school"
                                type="text"
                                bind:value={schoolName}
                                class="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-[#EA6D0B] focus:outline-none focus:ring-2 focus:ring-[#EA6D0B]/20"
                                placeholder="Ex.: Colégio F10"
                            />
                            <p class="mt-1 text-[11px] text-slate-500">
                                Ajuda nossa equipe a entender o contexto do seu
                                colégio logo no primeiro contato.
                            </p>
                        </div>

                        <div class="text-left">
                            <label
                                for="floating-phone"
                                class="block text-xs font-medium text-slate-700"
                                >WhatsApp</label
                            >
                            <input
                                id="floating-phone"
                                type="tel"
                                bind:value={phone}
                                class="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-[#EA6D0B] focus:outline-none focus:ring-2 focus:ring-[#EA6D0B]/20"
                                placeholder="(DDD) 99999-9999"
                            />
                            <p class="mt-1 text-[11px] text-slate-500">
                                Usaremos este número para seguir a conversa pelo
                                WhatsApp.
                            </p>
                        </div>

                        {#if errorMessage}
                            <p class="text-xs text-red-600">{errorMessage}</p>
                        {/if}

                        <button
                            type="submit"
                            class="flex w-full items-center justify-center rounded-full bg-[#25D366] px-4 py-2 text-sm font-semibold text-white shadow-md shadow-emerald-500/30 hover:bg-[#20bd59] disabled:cursor-not-allowed disabled:opacity-70 transition"
                            disabled={isSubmitting}
                        >
                            {#if isSubmitting}
                                Enviando...
                            {:else}
                                Continuar no WhatsApp
                            {/if}
                        </button>

                        <button
                            type="button"
                            class="mx-auto block text-[11px] text-slate-500 hover:text-slate-700"
                            on:click={toggleOpen}
                        >
                            Cancelar
                        </button>

                        <p class="mt-1 text-[10px] text-slate-400 text-center">
                            Seus dados são registrados internamente e nossa
                            equipe irá tratar sua solicitação 🧡.
                        </p>
                    </form>
                </div>
            {/if}

            <!-- Botão flutuante: sempre bolinha -->
            <button
                type="button"
                class="relative flex h-16 w-16 items-center justify-center rounded-full bg-[#25D366] text-white shadow-xl shadow-emerald-500/35 hover:bg-[#20bd59] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#25D366]/70 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900 transition"
                on:click={toggleOpen}
                aria-label="Falar com a F10 pelo WhatsApp"
                aria-expanded={isOpen}
            >
                <img
                    src="/icon_whatsapp_white.svg"
                    alt="WhatsApp"
                    class="h-10 w-10"
                />
            </button>

            {#if showOnlineHint && !isOpen}
                <div
                    class="absolute right-20 bottom-3 max-w-[200px] rounded-2xl bg-white shadow-lg shadow-slate-900/20 border border-emerald-100 px-3 py-2 text-[11px] text-slate-800"
                >
                    <div class="flex items-center gap-2 whitespace-nowrap">
                        <span
                            class="h-2.5 min-w-2.5 rounded-full bg-emerald-500 animate-pulse"
                        ></span>
                        <span>Estamos online.</span>
                    </div>
                </div>
            {/if}
        </div>
    </div>
</div>
