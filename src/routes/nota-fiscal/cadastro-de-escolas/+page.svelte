<!-- src/routes/nota-fiscal/cadastro-de-escolas/+page.svelte -->
<script lang="ts">
  import Breadcrumb from "$lib/components/Breadcrumb.svelte";
  import { ArrowLeft, ArrowRight, CheckCircle2, Loader2 } from "lucide-svelte";
  import { get } from "svelte/store";
  import { formDataStore, resetFormData, type FormErrors, type FormDataState } from "./formStore";
  import Step0 from "./steps/Step0.svelte";
  import Step1 from "./steps/Step1.svelte";
  import Step2 from "./steps/Step2.svelte";
  import Step3 from "./steps/Step3.svelte";
  import Step4 from "./steps/Step4.svelte";

  type WizardStep = 0 | 1 | 2 | 3 | 4;

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

  let currentStep: WizardStep = 0;
  let errors: FormErrors = {};
  let certificateFile: File | null = null;
  let submitMessage = "";
  let isSubmitting = false;
  let isSuccess = false;
  let cityCheckResult: CityCheckResult | null = null;

  const steps = [
    { label: "Cobertura", description: "Cidade" },
    { label: "Empresa", description: "CNPJ e endereço" },
    { label: "Tributação", description: "Regime e serviços" },
    { label: "Certificado", description: "Arquivo e senha" },
    { label: "Revisão", description: "Confirmação" },
  ];

  function applyCityCheckResult(result: CityCheckResult) {
    cityCheckResult = result;

    formDataStore.update((prev) => ({
      ...prev,
      city: result.city || prev.city,
      state: result.state || prev.state,
    }));
  }

  function formatYesNo(value: unknown): string {
    if (value === true || value === "yes") return "Sim";
    if (value === false || value === "no") return "Não";
    return "Não informado";
  }

  function isValidEmail(value: string): boolean {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
  }

  function onlyDigits(value: string): string {
    return (value ?? "").replace(/\D+/g, "");
  }

  function createSubmissionPayload() {
    const data = get(formDataStore);

    const emailFields = [
      { key: "cityCheckStatus", label: "Status da cidade", value: cityCheckResult?.status || "não verificado" },
      { key: "cityCheckMessage", label: "Mensagem da verificação", value: cityCheckResult?.message || "" },
      { key: "cityCheckProvider", label: "Provedor da verificação", value: cityCheckResult?.provider || "" },
      { key: "cityCheckIbgeCode", label: "Código IBGE", value: cityCheckResult?.ibgeCode || "" },
      { key: "noteKind", label: "Tipo de nota", value: data.noteKind },
      { key: "cnpj", label: "CNPJ", value: data.cnpj },
      { key: "legalName", label: "Razão Social", value: data.legalName },
      { key: "fantasyName", label: "Nome Fantasia", value: data.fantasyName },
      { key: "municipalRegistration", label: "Inscrição Municipal", value: data.municipalRegistration },
      { key: "hasStateRegistration", label: "Possui Inscrição Estadual", value: formatYesNo(data.hasStateRegistration) },
      { key: "stateRegistration", label: "Inscrição Estadual", value: data.stateRegistration },
      { key: "cnaeMain", label: "CNAE Principal", value: data.cnaeMain },
      { key: "phone", label: "Telefone", value: data.phone },
      { key: "email", label: "E-mail", value: data.email },
      { key: "website", label: "Site", value: data.website },
      { key: "cep", label: "CEP", value: data.cep },
      { key: "street", label: "Logradouro", value: data.street },
      { key: "number", label: "Número", value: data.number },
      { key: "complement", label: "Complemento", value: data.complement },
      { key: "neighborhood", label: "Bairro", value: data.neighborhood },
      { key: "city", label: "Cidade", value: data.city },
      { key: "state", label: "UF", value: data.state },
      { key: "isSimples", label: "Optante Simples Nacional", value: formatYesNo(data.isSimples) },
      { key: "supportsCulturalProjects", label: "Incentiva projetos culturais", value: formatYesNo(data.supportsCulturalProjects) },
      { key: "usesNationalNfseEnvironment", label: "Usa ambiente nacional NFS-e", value: formatYesNo(data.usesNationalNfseEnvironment) },
      { key: "taxRegime", label: "Regime Tributário", value: data.taxRegime },
      { key: "specialTaxRegime", label: "Regime Especial", value: data.specialTaxRegime },
      { key: "rpsSeries", label: "Série RPS", value: data.rpsSeries },
      { key: "lastRpsNumber", label: "Último número RPS", value: data.lastRpsNumber },
      { key: "serviceCode", label: "Código de Serviço", value: data.serviceCode },
      { key: "cityTaxCode", label: "Código Tributário Municipal", value: data.cityTaxCode },
      { key: "serviceDescription", label: "Descrição do Serviço", value: data.serviceDescription },
      { key: "serviceCnae", label: "CNAE do Serviço", value: data.serviceCnae },
      { key: "issRate", label: "Alíquota ISS", value: data.issRate },
      { key: "issWithheld", label: "ISS Retido", value: formatYesNo(data.issWithheld) },
      { key: "certificateType", label: "Tipo Certificado", value: data.certificateType },
      { key: "certificatePassword", label: "Senha Certificado", value: data.certificatePassword ? "Informada" : "Não informada" },
      { key: "certificateValidity", label: "Validade Certificado", value: data.certificateValidity },
      { key: "authorizedPersonName", label: "Responsável Autorizado", value: data.authorizedPersonName },
      { key: "authorizedPersonCpf", label: "CPF Responsável", value: data.authorizedPersonCpf },
      { key: "technicalContactName", label: "Contato Técnico", value: data.technicalContactName },
      { key: "technicalContactEmail", label: "E-mail Técnico", value: data.technicalContactEmail },
      { key: "technicalContactPhone", label: "Telefone Técnico", value: data.technicalContactPhone },
      { key: "observations", label: "Observações", value: data.observations },
    ];

    return {
      submittedAt: new Date().toISOString(),
      cityCheck: cityCheckResult,
      data,
      emailFields,
    };
  }

  function appendPayloadFields(fd: FormData, payload: ReturnType<typeof createSubmissionPayload>) {
    payload.emailFields.forEach((field) => {
      fd.append(`email_${field.key}`, String(field.value ?? ""));
    });
  }

  function validateStep(step: WizardStep): boolean {
    const data = get(formDataStore);
    const next: FormErrors = {};

    if (step === 0) {
      if (!data.city) next.city = "Informe a cidade.";
      if (!data.state) next.state = "Informe a UF.";
    }

    if (step === 1) {
      if (onlyDigits(data.cnpj).length !== 14) next.cnpj = "Informe um CNPJ válido.";
      if (!data.legalName.trim()) next.legalName = "Informe a razão social.";
      if (!data.fantasyName.trim()) next.fantasyName = "Informe o nome fantasia.";
      if (!data.municipalRegistration.trim()) next.municipalRegistration = "Informe a inscrição municipal.";
      if (data.hasStateRegistration === null) next.hasStateRegistration = "Informe se possui inscrição estadual.";
      if (data.hasStateRegistration === true && !data.stateRegistration.trim()) next.stateRegistration = "Informe a inscrição estadual.";
      if (!data.cnaeMain.trim()) next.cnaeMain = "Informe o CNAE.";
      if (!data.phone.trim()) next.phone = "Informe o telefone.";
      if (!data.email.trim() || !isValidEmail(data.email)) next.email = "Informe um e-mail válido.";
      if (onlyDigits(data.cep).length !== 8) next.cep = "Informe um CEP válido.";
      if (!data.street.trim()) next.street = "Informe o logradouro.";
      if (!data.number.trim()) next.number = "Informe o número.";
      if (!data.neighborhood.trim()) next.neighborhood = "Informe o bairro.";
      if (!data.city.trim()) next.city = "Informe a cidade.";
      if (!data.state.trim()) next.state = "Informe a UF.";
      if (data.isSimples === "unknown") next.isSimples = "Informe se é optante do Simples.";
      if (data.supportsCulturalProjects === "unknown") next.supportsCulturalProjects = "Informe esta opção.";
      if (data.usesNationalNfseEnvironment === "unknown") next.usesNationalNfseEnvironment = "Informe esta opção.";
    }

    if (step === 2) {
      if (!data.taxRegime.trim()) next.taxRegime = "Informe o regime tributário.";
      if (!data.specialTaxRegime.trim()) next.specialTaxRegime = "Informe o regime especial.";
      if (!data.rpsSeries.trim()) next.rpsSeries = "Informe a série RPS.";
      if (!data.lastRpsNumber.trim()) next.lastRpsNumber = "Informe o último número RPS.";
      if (!data.serviceCode.trim()) next.serviceCode = "Informe o código de serviço.";
      if (!data.cityTaxCode.trim()) next.cityTaxCode = "Informe o código tributário municipal.";
      if (!data.serviceDescription.trim()) next.serviceDescription = "Informe a descrição do serviço.";
      if (!data.serviceCnae.trim()) next.serviceCnae = "Informe o CNAE do serviço.";
      if (!data.issRate.trim()) next.issRate = "Informe a alíquota ISS.";
      if (data.issWithheld === "unknown") next.issWithheld = "Informe se há ISS retido.";
    }

    if (step === 3) {
      if (!data.certificateType.trim()) next.certificateType = "Informe o tipo de certificado.";
      if (!data.certificatePassword.trim()) next.certificatePassword = "Informe a senha do certificado.";
      if (!data.certificateValidity.trim()) next.certificateValidity = "Informe a validade.";
      if (!certificateFile) next.certificateFile = "Envie o arquivo do certificado.";
      if (!data.authorizedPersonName.trim()) next.authorizedPersonName = "Informe o responsável.";
      if (onlyDigits(data.authorizedPersonCpf).length !== 11) next.authorizedPersonCpf = "Informe um CPF válido.";
      if (!data.technicalContactName.trim()) next.technicalContactName = "Informe o contato técnico.";
      if (!data.technicalContactEmail.trim() || !isValidEmail(data.technicalContactEmail)) next.technicalContactEmail = "Informe um e-mail técnico válido.";
      if (!data.technicalContactPhone.trim()) next.technicalContactPhone = "Informe o telefone técnico.";
    }

    if (step === 4) {
      if (!data.acceptedTerms)
        next.acceptedTerms = "Você deve aceitar os termos para continuar.";
    }

    errors = next;
    return Object.keys(next).length === 0;
  }

  function nextStep() {
    if (!validateStep(currentStep)) return;
    currentStep = Math.min(4, currentStep + 1) as WizardStep;
    submitMessage = "";
  }

  function prevStep() {
    currentStep = Math.max(0, currentStep - 1) as WizardStep;
    submitMessage = "";
  }

  async function handleSubmit() {
    submitMessage = "";
    isSuccess = false;

    if (!validateStep(4)) {
      submitMessage = "Revise os campos destacados.";
      return;
    }

    isSubmitting = true;
    try {
      const fd = new FormData();
      const payload = createSubmissionPayload();

      fd.append("payload", JSON.stringify(payload));
      appendPayloadFields(fd, payload);
      fd.append("certificate_file", certificateFile!);

      const res = await fetch("/api/nfse/nfse-homologacao/submit", {
        method: "POST",
        body: fd,
      });

      if (!res.ok) {
        const body = await res.json().catch(() => null);
        submitMessage =
          body?.message ||
          "Não foi possível enviar. Verifique os dados e tente novamente.";
        return;
      }

      isSuccess = true;
    } catch {
      submitMessage = "Falha ao enviar. Tente novamente.";
    } finally {
      isSubmitting = false;
    }
  }
</script>

<section
  class="min-h-screen pb-12 bg-white/50 flex flex-1 flex-col"
  style="--primary:#ea6d0b; --page-bg:#FFF7EF; --surface:#FFFFFF; --muted:#000000a6; --outline:#0000001a;"
>
  <Breadcrumb
    baseUrl="https://f10.com.br"
    items={[
      { label: "HOME", href: "/" },
      { label: "NOTA FISCAL", href: "/nota-fiscal" },
      { label: "CADASTRO" },
    ]}
  />

  <div class="container flex-1 pt-6">
    <div class="mx-auto max-w-6xl">
      <div class="mb-6">
        <h1 class="text-[28px] md:text-[36px] font-semibold tracking-[-0.03em] text-[#010D28]">
          Cadastro para habilitar Nota Fiscal
        </h1>
        <p class="mt-2 max-w-3xl text-[15px] leading-relaxed text-[#000A57]/70">
          Preencha os dados para que a equipe F10 avalie o cenário fiscal da sua escola e configure o melhor fluxo de emissão possível.
        </p>
      </div>

      <div class="rounded-[28px] bg-white shadow-[0_24px_80px_rgba(1,13,40,0.08)] ring-1 ring-black/5 overflow-hidden">
        <div class="grid border-b border-black/5 bg-[#F8FAFF] p-4 md:grid-cols-5">
          {#each steps as item, index}
            <div class="flex items-center gap-3 p-2">
              <div
                class={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[13px] font-bold ${
                  currentStep === index
                    ? "bg-[var(--primary)] text-white"
                    : currentStep > index
                      ? "bg-emerald-100 text-emerald-700"
                      : "bg-white text-[#000A57]/50 ring-1 ring-black/10"
                }`}
              >
                {#if currentStep > index}
                  <CheckCircle2 size={16} />
                {:else}
                  {index + 1}
                {/if}
              </div>
              <div class="min-w-0">
                <p class="text-[13px] font-semibold text-[#010D28]">{item.label}</p>
                <p class="truncate text-[12px] text-[#7E82A2]">{item.description}</p>
              </div>
            </div>
          {/each}
        </div>

        <div class="p-5 md:p-8">
          {#if currentStep === 0}
            <Step0
              {cityCheckResult}
              onApplyResult={applyCityCheckResult}
              onContinue={nextStep}
            />
          {:else if currentStep === 1}
            <Step1 {errors} />
          {:else if currentStep === 2}
            <Step2 {errors} />
          {:else if currentStep === 3}
            <Step3 {errors} bind:certificateFile />
          {:else if currentStep === 4}
            <Step4 {errors} {certificateFile} {cityCheckResult} />
          {/if}
        </div>

        {#if currentStep > 0}
          <div class="flex flex-col gap-3 border-t border-black/5 bg-[#F8FAFF] p-5 sm:flex-row sm:items-center sm:justify-between">
            <button
              type="button"
              class="inline-flex items-center justify-center gap-2 rounded-xl border border-black/10 bg-white px-5 py-3 text-[13px] font-semibold text-[#010D28] hover:bg-black/[0.03]"
              on:click={prevStep}
              disabled={isSubmitting}
            >
              <ArrowLeft size={16} />
              Voltar
            </button>

            <div class="flex flex-col gap-3 sm:flex-row sm:items-center">
              <button
                type="button"
                class="inline-flex items-center justify-center rounded-xl border border-black/10 bg-white px-5 py-3 text-[13px] font-semibold text-[#010D28] hover:bg-black/[0.03]"
                on:click={resetFormData}
                disabled={isSubmitting}
              >
                Limpar formulário
              </button>

              {#if currentStep < 4}
                <button
                  type="button"
                  class="inline-flex items-center justify-center gap-2 rounded-xl bg-[var(--primary)] px-6 py-3 text-[13px] font-semibold text-white hover:brightness-110"
                  on:click={nextStep}
                  disabled={isSubmitting}
                >
                  Continuar
                  <ArrowRight size={16} />
                </button>
              {:else}
                <button
                  type="button"
                  class="inline-flex items-center justify-center gap-2 rounded-xl bg-[var(--primary)] px-6 py-3 text-[13px] font-semibold text-white hover:brightness-110 disabled:opacity-70"
                  on:click={handleSubmit}
                  disabled={isSubmitting}
                >
                  {#if isSubmitting}
                    <Loader2 size={16} class="animate-spin" />
                    Enviando...
                  {:else}
                    Enviar solicitação
                    <ArrowRight size={16} />
                  {/if}
                </button>
              {/if}
            </div>
          </div>
        {/if}

        {#if submitMessage}
          <div class="border-t border-black/5 bg-rose-50 px-5 py-4 text-[13px] font-semibold text-rose-700">
            {submitMessage}
          </div>
        {/if}

        {#if isSuccess}
          <div class="border-t border-black/5 bg-emerald-50 px-5 py-5 text-emerald-800">
            <p class="font-semibold">Solicitação enviada com sucesso.</p>
            <p class="mt-1 text-[13px]">A equipe F10 recebeu os dados e dará sequência à análise.</p>
          </div>
        {/if}
      </div>
    </div>
  </div>
</section>
