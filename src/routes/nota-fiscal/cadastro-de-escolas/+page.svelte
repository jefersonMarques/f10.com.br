<!-- src/routes/nota-fiscal/cadastro-de-escolas/+page.svelte -->
<script lang="ts">
  import { get } from "svelte/store";

  import Breadcrumb from "$lib/components/Breadcrumb.svelte";

  import { formDataStore, type FormErrors } from "./formStore";
  import Step1 from "./steps/Step1.svelte";
  import Step2 from "./steps/Step2.svelte";
  import Step3 from "./steps/Step3.svelte";
  import Step4 from "./steps/Step4.svelte";
  import Step5 from "./steps/Step5.svelte";
  import { Check } from "lucide-svelte";

  type WizardStep = 1 | 2 | 3 | 4 | 5;

  const stepTitles: Record<WizardStep, string> = {
    1: "CNPJ, endereço e confirmações",
    2: "Acesso e dados fiscais",
    3: "Certificado digital",
    4: "Explicação",
    5: "Envio e aceite",
  };

  let currentStep: WizardStep = 1;

  let errors: FormErrors = {};
  let isSubmitting = false;
  let isSuccess = false;
  let submitMessage = "";

  let certificateFile: File | null = null;
  let selfieFile: File | null = null;

  function onlyDigits(value: string): string {
    return value.replace(/\D+/g, "");
  }

  function normalizePercent(value: string): string {
    return value.replaceAll(" ", "").replaceAll("%", "").replaceAll(",", ".");
  }

  function isPercentValid(value: string, allowEmpty = true): boolean {
    const v = normalizePercent(value);
    if (!v) return allowEmpty;
    const n = Number(v);
    return Number.isFinite(n) && n >= 0 && n <= 100;
  }

  function isValidCPF(cpf: string): boolean {
    const cpfDigits = onlyDigits(cpf);
    if (cpfDigits.length !== 11) return false;
    if (/^(\d)\1{10}$/.test(cpfDigits)) return false;

    let sum = 0;
    for (let i = 0; i < 9; i++) {
      sum += Number(cpfDigits[i]) * (10 - i);
    }
    let resto = sum % 11;
    let dv1 = resto < 2 ? 0 : 11 - resto;
    if (Number(cpfDigits[9]) !== dv1) return false;

    sum = 0;
    for (let i = 0; i < 10; i++) {
      sum += Number(cpfDigits[i]) * (11 - i);
    }
    resto = sum % 11;
    let dv2 = resto < 2 ? 0 : 11 - resto;
    if (Number(cpfDigits[10]) !== dv2) return false;

    return true;
  }

  function validateStep(step: WizardStep): boolean {
    const data = get(formDataStore);
    const next: FormErrors = {};

    if (step === 1) {
      if (onlyDigits(data.cnpj).length !== 14) {
        next.cnpj = "CNPJ inválido.";
      }

      if (!data.legalName.trim()) {
        next.legalName = "Informe a Razão Social.";
      }

      if (!data.fantasyName.trim()) {
        next.fantasyName = "Informe o Nome Fantasia.";
      }

      if (!data.municipalRegistration.trim()) {
        next.municipalRegistration = "Informe a Inscrição Municipal.";
      }

      if (!data.phone?.trim()) {
        next.phone = "Telefone é obrigatório.";
      }

      if (!data.email?.trim()) {
        next.email = "E-mail é obrigatório.";
      }

      if (!data.website?.trim()) {
        next.website = "Site é obrigatório.";
      }

      if (data.hasStateRegistration === true) {
        if (!data.stateRegistration?.trim()) {
          next.stateRegistration = "Inscrição Estadual é obrigatória.";
        } else if (data.stateRegistration.trim().length < 2) {
          next.stateRegistration = "Inscrição Estadual inválida.";
        }
      }

      if (onlyDigits(data.cnaeMain).length !== 7) {
        next.cnaeMain = "CNAE inválido (7 dígitos).";
      }

      if (onlyDigits(data.cep).length !== 8) {
        next.cep = "CEP inválido.";
      }

      if (!data.street.trim()) {
        next.street = "Informe o logradouro.";
      }

      if (!data.number.trim()) {
        next.number = "Informe o número.";
      }

      if (!data.neighborhood.trim()) {
        next.neighborhood = "Informe o bairro.";
      }

      if (!data.city.trim()) {
        next.city = "Informe a cidade.";
      }

      if (!data.state.trim() || data.state.length !== 2) {
        next.state = "Informe a UF (2 letras).";
      }
    }

    if (step === 2) {
      const shouldValidateService =
        data.noteKind === "service" || data.noteKind === "service_and_commerce";

      const shouldValidateCommerce =
        data.noteKind === "commerce" ||
        data.noteKind === "service_and_commerce";

      if (shouldValidateService) {
        if (!data.cityHallLogin.trim()) {
          next.cityHallLogin = "Informe o login da prefeitura.";
        } else {
          const loginDigits = onlyDigits(data.cityHallLogin);
          if (loginDigits.length === 11 && !isValidCPF(loginDigits)) {
            next.cityHallLogin = "CPF inválido.";
          }
        }

        if (!data.cityHallPassword.trim()) {
          next.cityHallPassword = "Informe a senha da prefeitura.";
        }

        if (!data.serviceRpsBatchNumber.trim()) {
          next.serviceRpsBatchNumber = "Informe a numeração do lote de RPS.";
        }

        if (!data.serviceListItem.trim()) {
          next.serviceListItem = "Informe o Item da Lista de Serviço.";
        }

        if (!data.taxationCode.trim()) {
          next.taxationCode = "Informe o Código de Tributação.";
        }

        if (!data.taxationPlace.trim()) {
          next.taxationPlace = "Informe a Natureza da Operação.";
        }

        if (!data.specialRegime.trim()) {
          next.specialRegime = "Informe o Regime Especial de Tributação.";
        }

        if (!data.issRequirement.trim()) {
          next.issRequirement = "Informe a Exigibilidade do ISS.";
        }

        if (!data.issWithholding.trim()) {
          next.issWithholding = "Informe a Retenção do ISS.";
        }

        if (!isPercentValid(data.aliquotIss, true)) {
          next.aliquotIss = "Alíquota ISS inválida (0..100).";
        }

        if (data.ibptPercent && !isPercentValid(data.ibptPercent, true)) {
          next.ibptPercent = "IBPT inválido (0..100).";
        }

        if (!data.serviceDescription.trim()) {
          next.serviceDescription = "Descreva os serviços prestados.";
        }

        if (!isPercentValid(data.aliquotPis, true)) {
          next.aliquotPis = "Alíquota PIS inválida (0..100).";
        }

        if (!isPercentValid(data.aliquotCofins, true)) {
          next.aliquotCofins = "Alíquota COFINS inválida (0..100).";
        }

        if (!isPercentValid(data.aliquotInss, true)) {
          next.aliquotInss = "Alíquota INSS inválida (0..100).";
        }

        if (!isPercentValid(data.aliquotIr, true)) {
          next.aliquotIr = "Alíquota IR inválida (0..100).";
        }

        if (!isPercentValid(data.aliquotCsll, true)) {
          next.aliquotCsll = "Alíquota CSLL inválida (0..100).";
        }
      }

      if (shouldValidateCommerce) {
        if (!data.commerceNcmCode.trim()) {
          next.commerceNcmCode = "Informe o Código NCM.";
        }

        if (!data.commerceCfopCode.trim()) {
          next.commerceCfopCode = "Informe o Código CFOP.";
        }

        if (!data.commerceOperationNature.trim()) {
          next.commerceOperationNature = "Informe a Natureza da Operação.";
        }

        if (!isPercentValid(data.commerceIcmsAliquot, false)) {
          next.commerceIcmsAliquot = "Alíquota ICMS inválida (0..100).";
        }

        if (!data.commerceCstIcms.trim()) {
          next.commerceCstIcms = "Informe o CST ICMS.";
        }

        if (!isPercentValid(data.commerceIpiAliquot, false)) {
          next.commerceIpiAliquot = "Alíquota IPI inválida (0..100).";
        }

        if (!data.commerceCstIpi.trim()) {
          next.commerceCstIpi = "Informe o CST IPI.";
        }

        if (!isPercentValid(data.commercePisAliquot, false)) {
          next.commercePisAliquot = "Alíquota PIS inválida (0..100).";
        }

        if (!data.commerceCstPis.trim()) {
          next.commerceCstPis = "Informe o CST PIS.";
        }

        if (!isPercentValid(data.commerceCofinsAliquot, false)) {
          next.commerceCofinsAliquot = "Alíquota COFINS inválida (0..100).";
        }

        if (!data.commerceCstCofins.trim()) {
          next.commerceCstCofins = "Informe o CST COFINS.";
        }

        if (!data.commerceItemDescription.trim()) {
          next.commerceItemDescription = "Informe a descrição da nota.";
        }

        if (!data.commerceReturnCfop.trim()) {
          next.commerceReturnCfop = "Informe o CFOP para nota de devolução.";
        }
      }
    }

    if (step === 3) {
      if (!certificateFile)
        next.certificateFile = "Certificado digital é obrigatório.";
      if (!get(formDataStore).certificatePassword.trim())
        next.certificatePassword = "Informe a senha do certificado.";
    }

    if (step === 4) {
      if (!data.acceptedTerms)
        next.acceptedTerms = "Você deve aceitar os termos para continuar.";
    }

    if (step === 5) {
      if (!selfieFile)
        next.selfieFile = "A selfie é obrigatória para verificação.";
    }

    errors = next;
    return Object.keys(next).length === 0;
  }

  function nextStep() {
    if (!validateStep(currentStep)) return;
    currentStep = Math.min(5, currentStep + 1) as WizardStep;
    submitMessage = "";
  }

  function prevStep() {
    currentStep = Math.max(1, currentStep - 1) as WizardStep;
    submitMessage = "";
  }

  async function handleSubmit() {
    submitMessage = "";
    isSuccess = false;

    if (!validateStep(5)) {
      submitMessage = "Revise os campos destacados.";
      return;
    }

    const data = get(formDataStore);

    isSubmitting = true;
    try {
      const fd = new FormData();
      fd.append(
        "payload",
        JSON.stringify({
          ...data,
          submittedAt: new Date().toISOString(),
          cnpjDigits: onlyDigits(data.cnpj),
          cepDigits: onlyDigits(data.cep),

          hasServiceNote:
            data.noteKind === "service" ||
            data.noteKind === "service_and_commerce",

          hasCommerceNote:
            data.noteKind === "commerce" ||
            data.noteKind === "service_and_commerce",

          aliquotPis: normalizePercent(data.aliquotPis),
          aliquotCofins: normalizePercent(data.aliquotCofins),
          aliquotInss: normalizePercent(data.aliquotInss),
          aliquotIr: normalizePercent(data.aliquotIr),
          aliquotCsll: normalizePercent(data.aliquotCsll),
          aliquotIss: normalizePercent(data.aliquotIss),
          ibptPercent: normalizePercent(data.ibptPercent),

          commerceIcmsAliquot: normalizePercent(data.commerceIcmsAliquot),
          commerceIpiAliquot: normalizePercent(data.commerceIpiAliquot),
          commercePisAliquot: normalizePercent(data.commercePisAliquot),
          commerceCofinsAliquot: normalizePercent(data.commerceCofinsAliquot),
        }),
      );

      fd.append("certificate_file", certificateFile!);
      fd.append("selfie_file", selfieFile!);

      const res = await fetch("/api/nfse-homologacao/submit", {
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
      { label: "CADASTRO DE ESCOLAS" },
    ]}
  />

  <div class="container flex-1 flex flex-col justify-center">
    <header class="mb-6">
      <h1
        class="text-[16px] sm:text-[16px] leading-tight font-semibold text-black/80"
      >
        Registro para uso do serviço NFS-e / NF-e
      </h1>

      <div class="mt-4 flex items-center gap-2">
        <div
          class={`h-2 flex-1 rounded-full ${isSuccess || currentStep >= 1 ? "bg-[var(--primary)]" : "bg-black/10"}`}
        ></div>
        <div
          class={`h-2 flex-1 rounded-full ${isSuccess || currentStep >= 2 ? "bg-[var(--primary)]" : "bg-black/10"}`}
        ></div>
        <div
          class={`h-2 flex-1 rounded-full ${isSuccess || currentStep >= 3 ? "bg-[var(--primary)]" : "bg-black/10"}`}
        ></div>
        <div
          class={`h-2 flex-1 rounded-full ${isSuccess || currentStep >= 4 ? "bg-[var(--primary)]" : "bg-black/10"}`}
        ></div>
        <div
          class={`h-2 flex-1 rounded-full ${isSuccess || currentStep >= 5 ? "bg-[var(--primary)]" : "bg-black/10"}`}
        ></div>
      </div>

      <div class="mt-2 text-[13px] text-black/60">
        {#if isSuccess}Sucesso{:else}{stepTitles[currentStep]}{/if}
      </div>
    </header>

    <div
      class="rounded-[22px] bg-[var(--surface)] border border-[var(--outline)] shadow-sm p-5 sm:p-8 space-y-8"
    >
      {#if isSuccess}
        <div class="text-center">
          <div
            class="mx-auto w-14 h-14 rounded-2xl bg-emerald-50 border border-emerald-100 flex items-center justify-center relative overflow-hidden"
          >
            <span
              class="absolute inset-0 rounded-2xl border border-emerald-200/60 animate-ping"
              style="animation-duration: 1.25s;"
            ></span>
            <!-- Check (sem SVG externo) -->
            <span
              class="relative inline-flex items-center justify-center w-9 h-9 rounded-xl bg-emerald-100 border border-emerald-200 text-emerald-700 animate-[pop_420ms_ease-out]"
            >
              <Check />
            </span>
          </div>
          <h2 class="mt-4 text-[20px] font-semibold text-black/85">
            Enviado com sucesso
          </h2>
          <p class="mt-2 text-[13px] text-black/60">
            Recebemos os dados para homologação. Em breve retornamos.
          </p>
        </div>
      {:else}
        {#key currentStep}
          {#if currentStep === 1}
            <Step1 {errors} />
          {:else if currentStep === 2}
            <Step2 {errors} />
          {:else if currentStep === 3}
            <Step3 {errors} bind:certificateFile />
          {:else if currentStep === 4}
            <Step4 {errors} />
          {:else if currentStep === 5}
            <Step5 {errors} bind:selfieFile />
          {/if}
        {/key}

        <div
          class="pt-2 flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between"
        >
          <div class="text-[13px] text-black/65"></div>

          <div class="flex gap-3">
            {#if currentStep > 1}
              <button
                type="button"
                class="rounded-xl px-6 py-3 text-[13px] font-semibold border border-black/15 bg-white hover:bg-black/[0.03] disabled:opacity-60"
                on:click={prevStep}
                disabled={isSubmitting}
              >
                Voltar
              </button>
            {/if}

            {#if currentStep < 5}
              <button
                type="button"
                class="rounded-xl px-6 py-3 text-[13px] font-semibold text-white bg-[var(--primary)] hover:brightness-110 disabled:opacity-60"
                on:click={nextStep}
                disabled={isSubmitting}
              >
                Próximo
              </button>
            {:else}
              <button
                type="button"
                class="rounded-xl px-6 py-3 text-[13px] font-semibold text-white bg-[var(--primary)] hover:brightness-110 disabled:opacity-60"
                on:click={handleSubmit}
                disabled={isSubmitting}
              >
                {isSubmitting ? "Enviando..." : "Enviar"}
              </button>
            {/if}
          </div>
        </div>

        {#if submitMessage}
          <p class="mt-3 text-[13px] text-red-600">{submitMessage}</p>
        {/if}
      {/if}
    </div>
  </div>
</section>

<style>
  /* Intenção: animação rápida e elegante ao entrar no sucesso */
  @keyframes pop {
    0% {
      transform: scale(0.85);
      opacity: 0;
    }
    60% {
      transform: scale(1.08);
      opacity: 1;
    }
    100% {
      transform: scale(1);
      opacity: 1;
    }
  }
</style>
