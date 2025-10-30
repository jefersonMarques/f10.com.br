<script lang="ts">
    // ===== Componente de Formulário de Contato =====
    // - Integração via fetch POST (JSON)
    // - Acessível (labels, aria-live, estados)
    // - LGPD (consent), honeypot anti-spam, loading e mensagens
    // - Tipos e validações simples no front
    // - Emite evento 'submitted' quando concluído (sucesso)

    import { createEventDispatcher, onMount } from "svelte";
    import type { Topic } from "$lib/types/contact";

    // ===== Props =====
    /** Endpoint que receberá o POST em JSON */
    export let endpoint: string;
    /** Tópico selecionado na aba externa (usado como hidden) */
    export let topic: Topic = "f10";
    /** Título exibido no topo do card */
    export let title: string = "Falar sobre o F10";
    /** Placeholder e copy adaptada ao tópico */
    export let subtitle: string =
        "Preencha os dados para que nossa equipe entre em contato.";

    /** Envio com credenciais (se o endpoint estiver no mesmo domínio/proxy) */
    export let withCredentials: RequestCredentials = "same-origin";
    /** Opcional: redireciona após sucesso */
    export let successRedirect: string | null = null;

    const dispatch = createEventDispatcher();

    // ===== Estado do formulário =====
    let isSubmitting = false;
    let isSuccess = false;
    let serverError: string | null = null;

    // Campos do formulário
    type FormData = {
        name: string;
        email: string;
        phone: string;
        company: string;
        message: string;
        topic: Topic;
        consent: boolean;
        // Honeypot (não preencher)
        website?: string;
    };

    let form: FormData = {
        name: "",
        email: "",
        phone: "",
        company: "",
        message: "",
        topic,
        consent: false,
        website: "",
    };

    // Mantém 'topic' sincronizado quando a prop mudar
    $: form.topic = topic;

    // Erros por campo
    let errors: Partial<Record<keyof FormData, string>> = {};

    // ===== Validações simples (front) =====
    function validate(): boolean {
        errors = {};
        if (!form.name.trim()) errors.name = "Informe seu nome completo.";
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email))
            errors.email = "Informe um e-mail válido.";
        if (!form.phone.trim() || form.phone.replace(/\D/g, "").length < 10)
            errors.phone = "Informe um WhatsApp/telefone válido.";
        if (!form.company.trim())
            errors.company = "Informe sua escola/empresa.";
        if (!form.message.trim() || form.message.trim().length < 8)
            errors.message = "Escreva uma mensagem (mín. 8 caracteres).";
        if (!form.consent)
            errors.consent = "Autorize o contato para prosseguir (LGPD).";
        // Honeypot: se preenchido, travar envio
        if (form.website && form.website.trim().length > 0)
            errors.website = "Spam detectado.";
        return Object.keys(errors).length === 0;
    }

    // Formata telefone enquanto digita (BR)
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
        form.phone = formatPhone(el.value);
    }

    // ===== Envio =====
    async function handleSubmit(e: Event) {
        e.preventDefault();
        serverError = null;
        isSuccess = false;

        if (!validate()) return;

        isSubmitting = true;
        try {
            const res = await fetch(endpoint, {
                method: "POST",
                credentials: withCredentials,
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    name: form.name.trim(),
                    email: form.email.trim(),
                    phone: form.phone.trim(),
                    company: form.company.trim(),
                    message: form.message.trim(),
                    topic: form.topic,
                    consent: form.consent,
                }),
            });

            if (!res.ok) {
                const text = await res.text().catch(() => "");
                throw new Error(text || `Falha ao enviar (${res.status}).`);
            }

            isSuccess = true;
            dispatch("submitted", { topic: form.topic });

            // limpa os campos (mantém tópico)
            form = {
                name: "",
                email: "",
                phone: "",
                company: "",
                message: "",
                topic,
                consent: false,
                website: "",
            };

            if (successRedirect) {
                window.location.href = successRedirect;
            }
        } catch (err: any) {
            serverError = err?.message || "Não foi possível enviar agora.";
        } finally {
            isSubmitting = false;
        }
    }
</script>

<!-- ===== UI ===== -->
<div class="rounded-[16px] bg-white">
    <div class="p-6 md:p-7 lg:p-8">
        <h3 class="text-[22px] md:text-[24px] font-semibold text-[#000A57]">
            {title}
        </h3>
        <p class="mt-1 text-[13px] md:text-[14px] text-[#7E82A2]">{subtitle}</p>

        <!-- Mensagem de sucesso -->
        {#if isSuccess}
            <div
                class="mt-4 rounded-[12px] border border-emerald-200 bg-emerald-50 px-4 py-3 text-emerald-900"
                role="status"
                aria-live="polite"
            >
                <div class="flex items-start gap-3">
                    <svg
                        width="20"
                        height="20"
                        viewBox="0 0 24 24"
                        aria-hidden="true"
                        ><path
                            d="M12 22c5.5 0 10-4.5 10-10S17.5 2 12 2 2 6.5 2 12s4.5 10 10 10z"
                            fill="#34d399"
                            opacity="0.2"
                        /><path
                            d="M8.5 12.5l2.7 2.7 4.3-5.4"
                            fill="none"
                            stroke="#059669"
                            stroke-width="2"
                            stroke-linecap="round"
                            stroke-linejoin="round"
                        /></svg
                    >
                    <div>
                        <p class="font-medium">Recebemos seu contato!</p>
                        <p class="text-sm opacity-80">
                            Nossa equipe vai responder em breve pelo e-mail ou
                            WhatsApp informado.
                        </p>
                    </div>
                </div>
            </div>
        {/if}

        <!-- Erro do servidor -->
        {#if serverError}
            <div
                class="mt-4 rounded-[12px] border border-rose-200 bg-rose-50 px-4 py-3 text-rose-900"
                role="alert"
                aria-live="assertive"
            >
                {serverError}
            </div>
        {/if}

        <form
            class="mt-6 space-y-4"
            on:submit|preventDefault={handleSubmit}
            novalidate
        >
            <!-- Honeypot (não remover) -->
            <div class="hidden">
                <label>
                    Website
                    <input
                        class="border"
                        bind:value={form.website}
                        autocomplete="off"
                        tabindex="-1"
                    />
                </label>
            </div>

            <input type="hidden" name="topic" value={form.topic} />

            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <!-- Nome -->
                <div>
                    <label
                        for="name"
                        class="block text-[13px] font-medium text-[#010D28]/80"
                        >Nome completo</label
                    >
                    <input
                        id="name"
                        name="name"
                        type="text"
                        class="mt-1 w-full rounded-[12px] border border-[#E6E8F5] bg-white px-4 py-3 text-[14px] outline-none ring-0 focus:border-[#000A57] focus:shadow-[0_0_0_3px_rgba(0,10,87,0.12)]"
                        placeholder="Como devemos te chamar?"
                        bind:value={form.name}
                        autocomplete="name"
                        required
                        aria-invalid={!!errors.name}
                        aria-describedby="err-name"
                    />
                    {#if errors.name}
                        <p id="err-name" class="mt-1 text-[12px] text-rose-600">
                            {errors.name}
                        </p>
                    {/if}
                </div>

                <!-- E-mail -->
                <div>
                    <label
                        for="email"
                        class="block text-[13px] font-medium text-[#010D28]/80"
                        >E-mail</label
                    >
                    <input
                        id="email"
                        name="email"
                        type="email"
                        class="mt-1 w-full rounded-[12px] border border-[#E6E8F5] bg-white px-4 py-3 text-[14px] outline-none focus:border-[#000A57] focus:shadow-[0_0_0_3px_rgba(0,10,87,0.12)]"
                        placeholder="seuemail@exemplo.com"
                        bind:value={form.email}
                        autocomplete="email"
                        required
                        aria-invalid={!!errors.email}
                        aria-describedby="err-email"
                    />
                    {#if errors.email}
                        <p
                            id="err-email"
                            class="mt-1 text-[12px] text-rose-600"
                        >
                            {errors.email}
                        </p>
                    {/if}
                </div>
            </div>

            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <!-- Telefone -->
                <div>
                    <label
                        for="phone"
                        class="block text-[13px] font-medium text-[#010D28]/80"
                        >WhatsApp/Telefone</label
                    >
                    <input
                        id="phone"
                        name="phone"
                        type="tel"
                        class="mt-1 w-full rounded-[12px] border border-[#E6E8F5] bg-white px-4 py-3 text-[14px] outline-none focus:border-[#000A57] focus:shadow-[0_0_0_3px_rgba(0,10,87,0.12)]"
                        placeholder="(41) 9 9999-9999"
                        bind:value={form.phone}
                        on:input={onPhoneInput}
                        inputmode="tel"
                        autocomplete="tel"
                        required
                        aria-invalid={!!errors.phone}
                        aria-describedby="err-phone"
                    />
                    {#if errors.phone}
                        <p
                            id="err-phone"
                            class="mt-1 text-[12px] text-rose-600"
                        >
                            {errors.phone}
                        </p>
                    {/if}
                </div>

                <!-- Empresa/Escola -->
                <div>
                    <label
                        for="company"
                        class="block text-[13px] font-medium text-[#010D28]/80"
                        >Escola/Empresa</label
                    >
                    <input
                        id="company"
                        name="company"
                        type="text"
                        class="mt-1 w-full rounded-[12px] border border-[#E6E8F5] bg-white px-4 py-3 text-[14px] outline-none focus:border-[#000A57] focus:shadow-[0_0_0_3px_rgba(0,10,87,0.12)]"
                        placeholder="Nome da instituição"
                        bind:value={form.company}
                        autocomplete="organization"
                        required
                        aria-invalid={!!errors.company}
                        aria-describedby="err-company"
                    />
                    {#if errors.company}
                        <p
                            id="err-company"
                            class="mt-1 text-[12px] text-rose-600"
                        >
                            {errors.company}
                        </p>
                    {/if}
                </div>
            </div>

            <!-- Mensagem -->
            <div>
                <label
                    for="message"
                    class="block text-[13px] font-medium text-[#010D28]/80"
                    >Mensagem</label
                >
                <textarea
                    id="message"
                    name="message"
                    rows={5}
                    class="mt-1 w-full rounded-[12px] border border-[#E6E8F5] bg-white px-4 py-3 text-[14px] outline-none focus:border-[#000A57] focus:shadow-[0_0_0_3px_rgba(0,10,87,0.12)]"
                    placeholder="Conte brevemente sobre sua necessidade…"
                    bind:value={form.message}
                    required
                    aria-invalid={!!errors.message}
                    aria-describedby="err-message"
                />
                {#if errors.message}
                    <p id="err-message" class="mt-1 text-[12px] text-rose-600">
                        {errors.message}
                    </p>
                {/if}
            </div>

            <!-- Consentimento LGPD -->
            <div class="flex items-start gap-3">
                <input
                    id="consent"
                    type="checkbox"
                    class="mt-1 h-4 w-4 rounded border-[#E6E8F5] text-[#000A57] focus:ring-[#000A57]"
                    bind:checked={form.consent}
                    aria-invalid={!!errors.consent}
                    aria-describedby="err-consent"
                />
                <label for="consent" class="text-[13px] text-[#010D28]/80">
                    Autorizo o contato da F10 por e-mail ou WhatsApp com base
                    nesta solicitação.
                </label>
            </div>
            {#if errors.consent}
                <p id="err-consent" class="mt-1 text-[12px] text-rose-600">
                    {errors.consent}
                </p>
            {/if}

            <!-- Botão -->
            <div class="pt-2">
                <button
                    type="submit"
                    class="inline-flex w-full items-center justify-center gap-2 rounded-full bg-[#EA6D0B] px-6 py-3 text-[15px] font-semibold text-white transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-70"
                    disabled={isSubmitting}
                    aria-busy={isSubmitting}
                >
                    {#if isSubmitting}
                        <svg
                            class="h-5 w-5 animate-spin"
                            viewBox="0 0 24 24"
                            aria-hidden="true"
                        >
                            <circle
                                cx="12"
                                cy="12"
                                r="9"
                                stroke="currentColor"
                                stroke-opacity=".25"
                                stroke-width="4"
                                fill="none"
                            />
                            <path
                                d="M21 12a9 9 0 00-9-9"
                                stroke="currentColor"
                                stroke-width="4"
                                stroke-linecap="round"
                            />
                        </svg>
                        Enviando…
                    {:else}
                        Enviar contato
                    {/if}
                </button>
            </div>
        </form>
    </div>
</div>
