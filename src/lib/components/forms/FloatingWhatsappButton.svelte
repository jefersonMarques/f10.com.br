<script lang="ts">
  import { createEventDispatcher, onMount } from "svelte";
  import ArrowRight from "lucide-svelte/icons/arrow-right";
  import LifeBuoy from "lucide-svelte/icons/life-buoy";
  import whatsappIconUrl from "$lib/assets/brand/whatsapp-white-icon.svg?url&no-inline";
  import { salesContact } from "$lib/config/contactConfig";
  import { openSupportEventName } from "$lib/support/supportEvents";
  import SupportChatDialog from "$lib/components/onboarding/SupportChatDialog.svelte";

  // Props antigas mantidas por compatibilidade com chamadas existentes.
  // O fluxo de suporte agora abre o chat nativo F10, sem carregar Movidesk.
  export let movideskChatClient = "";
  export let supportOpenMode: "widget" | "iframe" = "widget";
  export let supportStartOpen = false;
  export let variant: "contact" | "support" = "contact";

  type FbqFunction = (
    command: "track" | "trackCustom" | "init",
    eventName: string,
    parameters?: Record<string, unknown>,
  ) => void;

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

  type Department = "sales" | "support" | "finance";

  const dispatch = createEventDispatcher<{ leadSent: LeadPayload }>();

  export let whatsAppNumber: string = salesContact.whatsappDisplay;
  export const supportWhatsAppNumber = "(41) 3027-4747";
  export let financeWhatsAppNumber = "(41) 99774-2363";
  export let defaultMessage =
    "Olá, quero falar com a equipe da F10 sobre planos e implantação.";
  export const supportMessage = "Olá, preciso de suporte da F10.";
  export let financeMessage = "Olá, preciso falar com o financeiro da F10.";
  export let source = "";
  export let page: string | undefined = undefined;
  export let product = "Software F10";
  export let subSource = "Botão flutuante site";
  export let leadDescription = "";

  let isOpen = false;
  let selectedDepartment: Department | null = null;
  let chatOpen = false;
  let name = "";
  let phone = "";
  let schoolName = "";
  let isSubmitting = false;
  let errorMessage = "";
  let isBusinessHours = false;
  let showOnlineHint = false;

  void movideskChatClient;
  void supportOpenMode;

  function trackLead(payload: LeadPayload) {
    if (typeof window === "undefined") return;

    const fbq = (window as Window & { fbq?: FbqFunction }).fbq;
    if (!fbq) return;

    fbq("track", "Lead", {
      content_name: payload.product || "Software F10",
      content_category: "whatsapp_lead",
      source: payload.source,
      page_path: payload.page,
      sub_source: payload.subSource,
      school_name: payload.schoolName,
      page_title: document.title,
    });
  }

  function openNativeSupport(): void {
    isOpen = false;
    selectedDepartment = null;
    showOnlineHint = false;
    chatOpen = true;
  }

  function handleOpenSupportRequest(): void {
    if (variant !== "support") return;
    openNativeSupport();
  }

  function toWaMeNumber(raw: string): string {
    const digits = normalizePhone(raw);
    if (!digits) return "";
    if (digits.startsWith("55") && digits.length >= 12) return digits;
    if (digits.length === 10 || digits.length === 11) return `55${digits}`;
    return digits;
  }

  function openWhatsApp(numberRaw: string, message: string) {
    const targetNumber = toWaMeNumber(numberRaw);
    if (!targetNumber) return;

    const encodedMessage = encodeURIComponent(message);
    const whatsAppUrl = `https://wa.me/${targetNumber}?text=${encodedMessage}`;
    if (typeof window !== "undefined") window.open(whatsAppUrl, "_blank");
  }

  function getCurrentPath(): string | undefined {
    if (typeof window === "undefined") return undefined;
    return window.location?.pathname || "/";
  }

  function checkBusinessHours(): boolean {
    const now = new Date();
    const day = now.getDay();
    const hour = now.getHours();
    return day >= 1 && day <= 5 && hour >= 9 && hour < 18;
  }

  function backToDepartmentPicker() {
    selectedDepartment = null;
    errorMessage = "";
  }

  function toggleOpen() {
    errorMessage = "";

    if (variant === "support") {
      openNativeSupport();
      return;
    }

    isOpen = !isOpen;
    if (isOpen) {
      selectedDepartment = null;
      showOnlineHint = false;
      return;
    }

    selectedDepartment = null;
  }

  function handleSelectDepartment(dep: Department) {
    errorMessage = "";

    if (dep === "sales") {
      selectedDepartment = "sales";
      return;
    }

    if (dep === "support") {
      openNativeSupport();
      return;
    }

    const currentPath = getCurrentPath() || "/";
    const msg = `${financeMessage}\n\nPágina: ${currentPath}`;
    openWhatsApp(financeWhatsAppNumber, msg);
    isOpen = false;
    selectedDepartment = null;
  }

  function normalizePhone(rawPhone: string): string {
    const digits = (rawPhone ?? "").replace(/\D/g, "");
    if ((digits.length === 12 || digits.length === 13) && digits.startsWith("55")) {
      return digits.slice(2);
    }
    return digits;
  }

  function formatPhone(value: string): string {
    const digits = normalizePhone(value).slice(0, 11);
    if (digits.length <= 2) return digits.length ? `(${digits}` : "";
    if (digits.length <= 7) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7, 11)}`;
  }

  function isValidBrazilMobilePhone(value: string): boolean {
    const digits = normalizePhone(value);
    if (digits.length !== 11) return false;

    const areaCode = Number(digits.slice(0, 2));
    return areaCode >= 11 && areaCode <= 99 && digits[2] === "9";
  }

  function handlePhoneInput(event: Event) {
    const target = event.currentTarget as HTMLInputElement;
    phone = formatPhone(target.value);
  }

  async function handleSubmit() {
    errorMessage = "";

    const trimmedName = name.trim();
    const normalizedPhone = normalizePhone(phone);
    const trimmedSchoolName = schoolName.trim();

    if (!trimmedName) {
      errorMessage = "Preencha seu nome.";
      return;
    }

    if (!isValidBrazilMobilePhone(phone)) {
      errorMessage = "Informe um WhatsApp válido no formato (XX) XXXXX-XXXX.";
      return;
    }

    const currentPath = getCurrentPath();
    const resolvedPage = page && page.trim().length > 0 ? page : currentPath;
    const resolvedSource = source && source.trim().length > 0 ? source : currentPath || "/";

    const payload: LeadPayload = {
      name: trimmedName,
      phone: normalizedPhone,
      createdAt: new Date().toISOString(),
      source: resolvedSource,
      page: resolvedPage,
      product,
      subSource,
      description: leadDescription,
      schoolName: trimmedSchoolName.length > 0 ? trimmedSchoolName : undefined,
    };

    isSubmitting = true;

    try {
      const response = await fetch("/api/whatsapp-lead", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
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
      trackLead(payload);

      const encodedMessage = encodeURIComponent(
        `${defaultMessage}\n\nNome: ${trimmedName}${trimmedSchoolName ? `\nEscola: ${trimmedSchoolName}` : ""}\nWhatsApp: ${normalizedPhone}`,
      );
      const targetNumber = toWaMeNumber(whatsAppNumber);
      const whatsAppUrl = `https://wa.me/${targetNumber}?text=${encodedMessage}`;
      if (typeof window !== "undefined") window.open(whatsAppUrl, "_blank");

      name = "";
      phone = "";
      schoolName = "";
      isOpen = false;
      selectedDepartment = null;
    } catch (error) {
      console.error("Erro ao enviar lead:", error);
      errorMessage =
        "Erro de conexão ao enviar seus dados. Verifique sua internet e tente de novo.";
    } finally {
      isSubmitting = false;
    }
  }

  function toSlug(value: string): string {
    return (value ?? "")
      .toString()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .trim()
      .replace(/&/g, " e ")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");
  }

  let pageForTracking = page && page.trim().length > 0 ? page.trim() : "";

  onMount(() => {
    if (!pageForTracking) pageForTracking = window.location?.pathname || "/";
    isBusinessHours = checkBusinessHours();

    let timer: ReturnType<typeof setTimeout> | null = null;
    if (isBusinessHours) {
      timer = setTimeout(() => {
        showOnlineHint = true;
      }, 5000);
    }

    if (supportStartOpen) openNativeSupport();
    window.addEventListener(openSupportEventName, handleOpenSupportRequest);

    return () => {
      if (timer) clearTimeout(timer);
      window.removeEventListener(openSupportEventName, handleOpenSupportRequest);
    };
  });

  $: dataPage = `${toSlug(pageForTracking || "/")}_page`;
</script>

<!-- Overlay global -->
<div class="fixed inset-0 z-[9999] pointer-events-none">
  <div
    class={`absolute right-4 pointer-events-auto md:right-6 ${variant === "support" ? "bottom-6" : "bottom-4 md:bottom-6"}`}
  >
    <div class="relative flex flex-col items-end gap-3">
      {#if isOpen}
        {#if selectedDepartment === null}
          <!-- Seletor -->
          <div
            class="w-[320px] rounded-3xl border border-slate-200/80 bg-white/90 p-4 shadow-2xl shadow-slate-900/15 backdrop-blur-md"
            aria-label="Selecione o setor para atendimento"
          >
            <div class="flex items-start justify-between gap-3">
              <div class="text-left">
                <div class="flex items-center gap-2">
                  <span
                    class="inline-flex h-2 w-2 rounded-full bg-emerald-400 {isBusinessHours ? 'animate-pulse' : ''}"
                  ></span>
                  <p class="text-[11px] font-semibold text-slate-700">Atendimento F10</p>
                </div>

                <h3 class="mt-2 text-sm font-semibold text-slate-900">Como podemos te ajudar?</h3>
                <p class="mt-1 text-xs text-slate-600">Escolha um assunto e seguimos com você.</p>
              </div>

              <button
                type="button"
                class="inline-flex h-5 min-w-5 pb-1 items-center justify-center rounded-full bg-slate-100/80 text-slate-500 hover:bg-slate-200 hover:text-slate-700 transition"
                on:click={toggleOpen}
                aria-label="Fechar atendimento"
              >
                <span class="text-base leading-none">×</span>
              </button>
            </div>

            <div class="mt-4 space-y-2.5">
              <button
                type="button"
                class="group w-full rounded-2xl border border-slate-200/80 bg-white px-4 py-3 text-left shadow-sm shadow-slate-900/5 hover:shadow-md hover:shadow-slate-900/10 hover:border-slate-300 transition"
                on:click={() => handleSelectDepartment("sales")}
                aria-label="Falar com Vendas"
              >
                <div class="flex items-center justify-between gap-3">
                  <div class="min-w-0">
                    <p class="text-sm font-semibold text-slate-900">Vendas</p>
                    <p class="mt-0.5 text-xs text-slate-600">Planos, implantação e demonstração</p>
                  </div>
                  <span class="inline-flex h-9 w-9 items-center justify-center rounded-full bg-[#EA6D0B]/10 text-[#EA6D0B] group-hover:bg-[#EA6D0B]/15 transition" aria-hidden="true">
                    <ArrowRight class="h-5 w-5" />
                  </span>
                </div>
              </button>

              <button
                type="button"
                class="group w-full rounded-2xl border border-slate-200/80 bg-white px-4 py-3 text-left shadow-sm shadow-slate-900/5 hover:shadow-md hover:shadow-slate-900/10 hover:border-slate-300 transition"
                on:click={() => handleSelectDepartment("support")}
                aria-label="Falar com Suporte"
              >
                <div class="flex items-center justify-between gap-3">
                  <div class="min-w-0">
                    <p class="text-sm font-semibold text-slate-900">Suporte</p>
                    <p class="mt-0.5 text-xs text-slate-600">Equipe especializada F10</p>
                  </div>
                  <span class="inline-flex h-9 w-9 items-center justify-center rounded-full bg-slate-100 text-slate-700 group-hover:bg-slate-200 transition" aria-hidden="true">
                    <ArrowRight class="h-5 w-5" />
                  </span>
                </div>
              </button>

              <button
                type="button"
                class="group w-full rounded-2xl border border-slate-200/80 bg-white px-4 py-3 text-left shadow-sm shadow-slate-900/5 hover:shadow-md hover:shadow-slate-900/10 hover:border-slate-300 transition"
                on:click={() => handleSelectDepartment("finance")}
                aria-label="Falar com Financeiro"
              >
                <div class="flex items-center justify-between gap-3">
                  <div class="min-w-0">
                    <p class="text-sm font-semibold text-slate-900">Financeiro</p>
                    <p class="mt-0.5 text-xs text-slate-600">Boletos, pagamentos e notas fiscais</p>
                  </div>
                  <span class="inline-flex h-9 w-9 items-center justify-center rounded-full bg-slate-100 text-slate-700 group-hover:bg-slate-200 transition" aria-hidden="true">
                    <ArrowRight class="h-5 w-5" />
                  </span>
                </div>
              </button>
            </div>

            <p class="mt-3 text-[10px] text-slate-400 text-center">
              Vendas abre formulário. Suporte abre o chat F10. Financeiro abre WhatsApp.
            </p>
          </div>
        {:else if selectedDepartment === "sales"}
          <!-- Vendas: formulário -->
          <div
            class="w-[320px] rounded-2xl border border-slate-200/90 bg-white/95 p-4 shadow-2xl shadow-slate-900/25 backdrop-blur-sm origin-bottom-right"
            aria-label="Formulário para atendimento pelo WhatsApp"
          >
            <div class="flex items-start justify-between gap-3">
              <div class="text-left">
                <p class="inline-flex items-center rounded-full bg-emerald-50 px-2.5 py-[3px] text-[11px] font-semibold text-emerald-700">
                  Atendimento F10 • Vendas
                </p>

                <h3 class="mt-2 text-sm font-semibold text-slate-900">Vamos acelerar seu atendimento 👇</h3>

                {#if isBusinessHours}
                  <p class="mt-1 text-xs text-slate-600">
                    Nossa equipe comercial está online agora. Preencha rapidinho e já continuamos a conversa pelo WhatsApp.
                  </p>
                {:else}
                  <p class="mt-1 text-xs text-slate-600">
                    Estamos fora do horário comercial, mas seu contato será registrado. Preencha seus dados e o time comercial vai falar com você no próximo horário útil.
                  </p>
                {/if}

                <button
                  type="button"
                  class="mt-2 text-[11px] font-semibold text-slate-600 hover:text-slate-900 underline underline-offset-4"
                  on:click={backToDepartmentPicker}
                >
                  Trocar assunto
                </button>
              </div>

              <button
                type="button"
                class="inline-flex h-5 min-w-5 pb-1 items-center justify-center rounded-full bg-slate-100/80 text-slate-500 hover:bg-slate-200 hover:text-slate-700 transition"
                on:click={toggleOpen}
                aria-label="Fechar formulário de WhatsApp"
              >
                <span class="text-base leading-none">×</span>
              </button>
            </div>

            <form class="mt-4 space-y-3" on:submit|preventDefault={handleSubmit}>
              <div class="text-left">
                <label for="floating-name" class="block text-xs font-medium text-slate-700">Nome</label>
                <input
                  id="floating-name"
                  type="text"
                  bind:value={name}
                  class="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-[#EA6D0B] focus:outline-none focus:ring-2 focus:ring-[#EA6D0B]/20"
                  placeholder="Como podemos te chamar?"
                />
              </div>

              <div class="text-left">
                <label for="floating-school" class="block text-xs font-medium text-slate-700">Nome da escola (opcional)</label>
                <input
                  id="floating-school"
                  type="text"
                  bind:value={schoolName}
                  class="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-[#EA6D0B] focus:outline-none focus:ring-2 focus:ring-[#EA6D0B]/20"
                  placeholder="Ex.: Escola F10"
                />
                <p class="mt-1 text-[11px] text-slate-500">
                  Ajuda nossa equipe a entender o contexto da sua escola logo no primeiro contato.
                </p>
              </div>

              <div class="text-left">
                <label for="floating-phone" class="block text-xs font-medium text-slate-700">WhatsApp</label>
                <input
                  id="floating-phone"
                  type="tel"
                  bind:value={phone}
                  on:input={handlePhoneInput}
                  inputmode="numeric"
                  maxlength="15"
                  class="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-[#EA6D0B] focus:outline-none focus:ring-2 focus:ring-[#EA6D0B]/20"
                  placeholder="(DDD) 99999-9999"
                />
                <p class="mt-1 text-[11px] text-slate-500">Usaremos este número para seguir a conversa pelo WhatsApp.</p>
              </div>

              {#if errorMessage}
                <p class="text-xs text-red-600">{errorMessage}</p>
              {/if}

              <button
                type="submit"
                class="flex w-full items-center justify-center rounded-full bg-[#25D366] px-4 py-2 text-sm font-semibold text-white shadow-md shadow-emerald-500/30 hover:bg-[#20bd59] disabled:cursor-not-allowed disabled:opacity-70 transition"
                disabled={isSubmitting}
              >
                {#if isSubmitting}Enviando...{:else}Continuar no WhatsApp{/if}
              </button>

              <button
                type="button"
                class="mx-auto block text-[11px] text-slate-500 hover:text-slate-700"
                on:click={toggleOpen}
              >
                Cancelar
              </button>

              <p class="mt-1 text-[10px] text-slate-400 text-center">
                Seus dados são registrados internamente e nossa equipe irá tratar sua solicitação 🧡.
              </p>
            </form>
          </div>
        {/if}
      {/if}

      <button
        type="button"
        data-track="1"
        data-event={variant === "support" ? "support_click" : "whatsapp_click"}
        data-page={dataPage}
        data-cta={variant === "support" ? "cta_support_floating_button" : "cta_whatsapp_floating_button"}
        class={`relative flex h-16 w-16 items-center justify-center rounded-full text-white shadow-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-white transition ${variant === "support" ? "bg-[#000A57] shadow-[#000A57]/30 hover:bg-[#111B71] focus-visible:ring-[#000A57]/60" : "bg-[#25D366] shadow-emerald-500/35 hover:bg-[#20bd59] focus-visible:ring-[#25D366]/70"}`}
        on:click={toggleOpen}
        aria-label={variant === "support" ? "Abrir suporte F10" : "Falar com a F10"}
        aria-expanded={isOpen || chatOpen}
      >
        {#if variant === "support"}
          <LifeBuoy size={30} strokeWidth={2.2} aria-hidden="true" />
        {:else}
          <img src={whatsappIconUrl} alt="WhatsApp" class="h-10 w-10" />
        {/if}
      </button>

      {#if showOnlineHint && !isOpen && !chatOpen}
        <div class="absolute right-20 bottom-3 max-w-[200px] rounded-2xl bg-white shadow-lg shadow-slate-900/20 border border-emerald-100 px-3 py-2 text-[11px] text-slate-800">
          <div class="flex items-center gap-2 whitespace-nowrap">
            <span class="h-2.5 min-w-2.5 rounded-full bg-emerald-400 animate-pulse"></span>
            <span>{variant === "support" ? "Suporte F10 online." : "Estamos online."}</span>
          </div>
        </div>
      {/if}
    </div>
  </div>
</div>

<SupportChatDialog isOpen={chatOpen} onClose={() => (chatOpen = false)} />
