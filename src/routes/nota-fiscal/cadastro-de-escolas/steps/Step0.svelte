<!-- src/routes/nota-fiscal/cadastro-de-escolas/steps/Step0.svelte -->
<script lang="ts">
  import { formDataStore } from "../formStore";
  import { AlertTriangle, Bell, CheckCircle2, Loader2, MapPin } from "lucide-svelte";

  type CityCheckStatus = "idle" | "checking" | "available" | "unavailable" | "error";
  type CityCheckResult = {
    status: CityCheckStatus;
    city: string;
    state: string;
    ibgeCode: string;
    provider: string;
    message: string;
    checkedAt: string;
    raw?: Record<string, unknown> | null;
  };

  export let cityCheckResult: CityCheckResult | null = null;
  export let onApplyResult: (result: CityCheckResult) => void = () => {};
  export let onContinue: () => void = () => {};

  let city = $formDataStore.city || "";
  let state = $formDataStore.state || "";
  let schoolName = $formDataStore.fantasyName || "";
  let contactName = "";
  let contactEmail = $formDataStore.email || "";
  let contactWhatsapp = $formDataStore.phone || "";

  let errors: Record<string, string> = {};
  let message = "";
  let isChecking = false;
  let isNotifyFormOpen = false;
  let isSendingNotification = false;
  let notificationSent = false;

  function normalizeState(value: string): string {
    return value.replace(/[^a-zA-Z]/g, "").slice(0, 2).toUpperCase();
  }

  function validateCityFields(): boolean {
    const next: Record<string, string> = {};

    if (!city.trim()) next.city = "Informe a cidade.";
    if (normalizeState(state).length !== 2) next.state = "Informe a UF com 2 letras.";

    errors = next;
    return Object.keys(next).length === 0;
  }

  function validateNotificationFields(): boolean {
    const next: Record<string, string> = {};

    if (!contactName.trim()) next.contactName = "Informe o nome.";
    if (!contactEmail.trim()) next.contactEmail = "Informe o e-mail.";
    if (!contactWhatsapp.trim()) next.contactWhatsapp = "Informe o WhatsApp.";
    if (!schoolName.trim()) next.schoolName = "Informe o nome da escola.";

    errors = next;
    return Object.keys(next).length === 0;
  }

  async function checkCityAvailability() {
    message = "";
    notificationSent = false;
    isNotifyFormOpen = false;

    if (!validateCityFields()) return;

    isChecking = true;

    const checkingResult: CityCheckResult = {
      status: "checking",
      city: city.trim(),
      state: normalizeState(state),
      ibgeCode: "",
      provider: "",
      message: "Verificando disponibilidade da cidade...",
      checkedAt: new Date().toISOString(),
      raw: null,
    };

    onApplyResult(checkingResult);

    try {
      const params = new URLSearchParams({
        city: city.trim(),
        state: normalizeState(state),
      });

      const response = await fetch(`/api/nfse/nfse-city-check?${params.toString()}`);
      const data = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(data?.message || "Falha ao verificar cidade.");
      }

      const result: CityCheckResult = {
        status: data.available ? "available" : "unavailable",
        city: data.city || city.trim(),
        state: data.state || normalizeState(state),
        ibgeCode: data.ibgeCode || "",
        provider: data.provider || "",
        message: data.message || "Verificação concluída.",
        checkedAt: data.checkedAt || new Date().toISOString(),
        raw: data.raw || null,
      };

      city = result.city;
      state = result.state;
      onApplyResult(result);
    } catch (error) {
      const result: CityCheckResult = {
        status: "error",
        city: city.trim(),
        state: normalizeState(state),
        ibgeCode: "",
        provider: "",
        message:
          error instanceof Error
            ? error.message
            : "Não foi possível verificar a cidade agora.",
        checkedAt: new Date().toISOString(),
        raw: null,
      };

      message = result.message;
      onApplyResult(result);
    } finally {
      isChecking = false;
    }
  }

  function continueAnyway() {
    formDataStore.update((prev) => ({
      ...prev,
      city: city.trim() || prev.city,
      state: normalizeState(state) || prev.state,
      fantasyName: schoolName.trim() || prev.fantasyName,
      email: contactEmail.trim() || prev.email,
      phone: contactWhatsapp.trim() || prev.phone,
    }));

    onContinue();
  }

  async function requestAvailabilityNotification() {
    message = "";
    if (!validateNotificationFields()) return;

    isSendingNotification = true;

    try {
      const payload = {
        submissionKind: "nfse_city_availability_notification",
        submittedAt: new Date().toISOString(),
        city: city.trim(),
        state: normalizeState(state),
        ibgeCode: cityCheckResult?.ibgeCode || "",
        cityCheckStatus: cityCheckResult?.status || "unavailable",
        cityCheckMessage: cityCheckResult?.message || "Cidade ainda não disponível.",
        name: contactName.trim(),
        email: contactEmail.trim(),
        whatsapp: contactWhatsapp.trim(),
        schoolName: schoolName.trim(),
        emailFields: [
          { key: "submissionKind", label: "Tipo de solicitação", value: "Avisar quando cidade estiver disponível" },
          { key: "name", label: "Nome", value: contactName.trim() },
          { key: "email", label: "E-mail", value: contactEmail.trim() },
          { key: "whatsapp", label: "WhatsApp", value: contactWhatsapp.trim() },
          { key: "schoolName", label: "Nome da escola", value: schoolName.trim() },
          { key: "city", label: "Cidade", value: city.trim() },
          { key: "state", label: "UF", value: normalizeState(state) },
          { key: "ibgeCode", label: "Código IBGE", value: cityCheckResult?.ibgeCode || "" },
          { key: "cityCheckStatus", label: "Status da cidade", value: cityCheckResult?.status || "unavailable" },
          { key: "cityCheckMessage", label: "Mensagem da verificação", value: cityCheckResult?.message || "Cidade ainda não disponível." },
        ],
      };

      const formData = new FormData();
      formData.append("payload", JSON.stringify(payload));

      for (const field of payload.emailFields) {
        formData.append(`email_${field.key}`, field.value);
      }

      const response = await fetch("/api/nfse/nfse-homologacao/submit", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const body = await response.json().catch(() => null);
        throw new Error(body?.message || "Não foi possível enviar o aviso.");
      }

      notificationSent = true;
      formDataStore.update((prev) => ({
        ...prev,
        city: city.trim() || prev.city,
        state: normalizeState(state) || prev.state,
        fantasyName: schoolName.trim() || prev.fantasyName,
        email: contactEmail.trim() || prev.email,
        phone: contactWhatsapp.trim() || prev.phone,
      }));
    } catch (error) {
      message = error instanceof Error ? error.message : "Falha ao enviar solicitação.";
    } finally {
      isSendingNotification = false;
    }
  }

  $: state = normalizeState(state);
</script>

<div class="space-y-6">
  <div class="flex items-start justify-between gap-4">
    <div>
      <h2 class="text-[18px] font-semibold text-black/85">
        Verifique se a cidade já está disponível para NFS-e
      </h2>
      <p class="mt-1 text-[13px] text-black/60 max-w-[80ch]">
        Esta etapa consulta a cobertura da ACBr antes do preenchimento completo. Se a cidade ainda não estiver disponível, o cadastro ainda poderá ser enviado.
      </p>
    </div>

    <div class="hidden sm:flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-orange-50 border border-orange-100 text-[var(--primary)]">
      <MapPin size={20} />
    </div>
  </div>

  <div class="grid gap-4 sm:grid-cols-12">
    <div class="sm:col-span-8">
      <label for="cityCheckCity" class="mb-2 block text-[12px] font-semibold text-black/70">
        Cidade
      </label>
      <input
        id="cityCheckCity"
        class={`h-11 w-full rounded-xl border px-3 text-[14px] font-semibold outline-none ${
          errors.city ? "border-red-300" : "border-black/15"
        }`}
        bind:value={city}
        placeholder="Ex: Curitiba"
      />
      {#if errors.city}
        <p class="mt-1 text-[12px] text-red-600">{errors.city}</p>
      {/if}
    </div>

    <div class="sm:col-span-4">
      <label for="cityCheckState" class="mb-2 block text-[12px] font-semibold text-black/70">
        UF
      </label>
      <input
        id="cityCheckState"
        class={`h-11 w-full rounded-xl border px-3 text-[14px] font-semibold uppercase outline-none ${
          errors.state ? "border-red-300" : "border-black/15"
        }`}
        bind:value={state}
        placeholder="PR"
        maxlength="2"
      />
      {#if errors.state}
        <p class="mt-1 text-[12px] text-red-600">{errors.state}</p>
      {/if}
    </div>
  </div>

  <div class="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between rounded-2xl border border-black/10 bg-black/[0.02] p-4">
    <p class="text-[13px] text-black/60">
      A consulta usa o código IBGE da cidade e valida a disponibilidade nos endpoints de NFS-e.
    </p>

    <button
      type="button"
      class="inline-flex items-center justify-center gap-2 rounded-xl px-6 py-3 text-[13px] font-semibold text-white bg-[var(--primary)] hover:brightness-110 disabled:opacity-60"
      on:click={checkCityAvailability}
      disabled={isChecking}
    >
      {#if isChecking}
        <Loader2 size={16} class="animate-spin" />
        Verificando...
      {:else}
        Verificar cidade
      {/if}
    </button>
  </div>

  {#if cityCheckResult?.status === "available"}
    <div class="rounded-2xl border border-emerald-200 bg-emerald-50 p-5">
      <div class="flex gap-3">
        <CheckCircle2 class="mt-0.5 shrink-0 text-emerald-700" size={20} />
        <div>
          <h3 class="text-[15px] font-semibold text-emerald-900">Cidade disponível</h3>
          <p class="mt-1 text-[13px] text-emerald-800/80">
            {cityCheckResult.message || "A cidade existe na cobertura de NFS-e. O cadastro pode seguir normalmente."}
          </p>
          {#if cityCheckResult.ibgeCode || cityCheckResult.provider}
            <p class="mt-2 text-[12px] text-emerald-800/70">
              {#if cityCheckResult.ibgeCode}IBGE: {cityCheckResult.ibgeCode}{/if}
              {#if cityCheckResult.provider} · Provedor: {cityCheckResult.provider}{/if}
            </p>
          {/if}

          <button
            type="button"
            class="mt-4 rounded-xl px-6 py-3 text-[13px] font-semibold text-white bg-emerald-700 hover:brightness-110"
            on:click={continueAnyway}
          >
            Continuar preenchimento
          </button>
        </div>
      </div>
    </div>
  {:else if cityCheckResult?.status === "unavailable"}
    <div class="rounded-2xl border border-amber-200 bg-amber-50 p-5">
      <div class="flex gap-3">
        <AlertTriangle class="mt-0.5 shrink-0 text-amber-700" size={20} />
        <div class="w-full">
          <h3 class="text-[15px] font-semibold text-amber-950">Cidade ainda não disponível</h3>
          <p class="mt-1 text-[13px] text-amber-900/80">
            {cityCheckResult.message || "Ainda não encontramos esta cidade na cobertura de NFS-e. Mesmo assim, o formulário pode ser enviado para análise da equipe F10."}
          </p>

          <div class="mt-4 flex flex-col sm:flex-row gap-3">
            <button
              type="button"
              class="rounded-xl px-6 py-3 text-[13px] font-semibold text-white bg-[var(--primary)] hover:brightness-110"
              on:click={continueAnyway}
            >
              Enviar assim mesmo
            </button>
            <button
              type="button"
              class="inline-flex items-center justify-center gap-2 rounded-xl px-6 py-3 text-[13px] font-semibold border border-amber-300 bg-white text-amber-950 hover:bg-amber-100/60"
              on:click={() => (isNotifyFormOpen = true)}
            >
              <Bell size={16} />
              Me avise quando disponível
            </button>
          </div>
        </div>
      </div>
    </div>
  {:else if cityCheckResult?.status === "error"}
    <div class="rounded-2xl border border-red-200 bg-red-50 p-5">
      <div class="flex gap-3">
        <AlertTriangle class="mt-0.5 shrink-0 text-red-700" size={20} />
        <div>
          <h3 class="text-[15px] font-semibold text-red-950">Não foi possível verificar agora</h3>
          <p class="mt-1 text-[13px] text-red-900/80">
            {cityCheckResult.message}
          </p>
          <button
            type="button"
            class="mt-4 rounded-xl px-6 py-3 text-[13px] font-semibold text-white bg-[var(--primary)] hover:brightness-110"
            on:click={continueAnyway}
          >
            Enviar assim mesmo
          </button>
        </div>
      </div>
    </div>
  {/if}

  {#if isNotifyFormOpen}
    <div class="rounded-2xl border border-black/10 bg-white p-5 space-y-4">
      <div>
        <h3 class="text-[16px] font-semibold text-black/85">Dados para aviso de disponibilidade</h3>
        <p class="mt-1 text-[13px] text-black/60">
          Esses dados serão enviados para a equipe F10 acompanhar a cidade solicitada.
        </p>
      </div>

      <div class="grid gap-4 sm:grid-cols-12">
        <div class="sm:col-span-6">
          <label for="contactName" class="mb-2 block text-[12px] font-semibold text-black/70">Nome</label>
          <input id="contactName" class={`h-11 w-full rounded-xl border px-3 text-[14px] font-semibold outline-none ${errors.contactName ? "border-red-300" : "border-black/15"}`} bind:value={contactName} />
          {#if errors.contactName}<p class="mt-1 text-[12px] text-red-600">{errors.contactName}</p>{/if}
        </div>

        <div class="sm:col-span-6">
          <label for="schoolName" class="mb-2 block text-[12px] font-semibold text-black/70">Nome da escola</label>
          <input id="schoolName" class={`h-11 w-full rounded-xl border px-3 text-[14px] font-semibold outline-none ${errors.schoolName ? "border-red-300" : "border-black/15"}`} bind:value={schoolName} />
          {#if errors.schoolName}<p class="mt-1 text-[12px] text-red-600">{errors.schoolName}</p>{/if}
        </div>

        <div class="sm:col-span-6">
          <label for="contactEmail" class="mb-2 block text-[12px] font-semibold text-black/70">E-mail</label>
          <input id="contactEmail" type="email" class={`h-11 w-full rounded-xl border px-3 text-[14px] font-semibold outline-none ${errors.contactEmail ? "border-red-300" : "border-black/15"}`} bind:value={contactEmail} />
          {#if errors.contactEmail}<p class="mt-1 text-[12px] text-red-600">{errors.contactEmail}</p>{/if}
        </div>

        <div class="sm:col-span-6">
          <label for="contactWhatsapp" class="mb-2 block text-[12px] font-semibold text-black/70">WhatsApp</label>
          <input id="contactWhatsapp" class={`h-11 w-full rounded-xl border px-3 text-[14px] font-semibold outline-none ${errors.contactWhatsapp ? "border-red-300" : "border-black/15"}`} bind:value={contactWhatsapp} inputmode="tel" />
          {#if errors.contactWhatsapp}<p class="mt-1 text-[12px] text-red-600">{errors.contactWhatsapp}</p>{/if}
        </div>
      </div>

      <div class="flex flex-col sm:flex-row gap-3 sm:items-center">
        <button
          type="button"
          class="rounded-xl px-6 py-3 text-[13px] font-semibold text-white bg-[var(--primary)] hover:brightness-110 disabled:opacity-60"
          on:click={requestAvailabilityNotification}
          disabled={isSendingNotification}
        >
          {isSendingNotification ? "Enviando..." : "Enviar aviso para equipe F10"}
        </button>

        {#if notificationSent}
          <button
            type="button"
            class="rounded-xl px-6 py-3 text-[13px] font-semibold border border-black/15 bg-white hover:bg-black/[0.03]"
            on:click={continueAnyway}
          >
            Continuar preenchendo mesmo assim
          </button>
        {/if}
      </div>

      {#if notificationSent}
        <p class="text-[13px] text-emerald-700">Solicitação enviada para a equipe F10.</p>
      {/if}
    </div>
  {/if}

  {#if message}
    <p class="text-[13px] text-red-600">{message}</p>
  {/if}
</div>
