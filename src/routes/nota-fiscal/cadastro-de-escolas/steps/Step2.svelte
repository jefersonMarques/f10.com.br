<!-- src/routes/nota-fiscal/cadastro-de-escolas/steps/Step2.svelte -->
<script lang="ts">
  import {
    formDataStore,
    taxationPlaceOptions,
    specialRegimeOptions,
    issRequirementOptions,
    yesNoOptions,
    cstIcmsOptions,
    cstIpiOptions,
    cstPisCofinsOptions,
    type FormErrors,
  } from "../formStore";

  export let errors: FormErrors = {};

  $: showServiceFields =
    $formDataStore.noteKind === "service" ||
    $formDataStore.noteKind === "service_and_commerce";

  $: showCommerceFields =
    $formDataStore.noteKind === "commerce" ||
    $formDataStore.noteKind === "service_and_commerce";
</script>

<div class="space-y-8">
  <div>
    <h2 class="text-[18px] font-semibold text-black/85">
      Acesso e dados específicos
    </h2>
    <p class="mt-1 text-[13px] text-black/60">
      Os campos obrigatórios variam conforme o tipo selecionado. Se escolher
      “Serviço e produto”, será necessário preencher os dois blocos.
    </p>
  </div>

  {#if showServiceFields}
    <!-- ==================== SERVIÇO (NFS-e) ==================== -->
    <div class="space-y-6">
      <div>
        <h3 class="text-[16px] font-semibold text-black/85">
          Acesso na prefeitura
        </h3>
        <p class="mt-1 text-[13px] text-black/60">
          Informações necessárias para integração com o sistema da prefeitura.
        </p>
      </div>

      <div class="grid gap-4 sm:grid-cols-12">
        <div class="sm:col-span-4">
          <label
            for="cityHallLogin"
            class="mb-2 block text-[12px] font-semibold text-black/70"
          >
            Login Prefeitura
          </label>
          <input
            id="cityHallLogin"
            class={`h-11 w-full rounded-xl border px-3 text-[14px] font-semibold outline-none ${
              errors.cityHallLogin ? "border-red-300" : "border-black/15"
            }`}
            bind:value={$formDataStore.cityHallLogin}
            placeholder="Usuário / CPF / CNPJ"
          />
          {#if errors.cityHallLogin}
            <p class="mt-1 text-[12px] text-red-600">{errors.cityHallLogin}</p>
          {/if}
        </div>

        <div class="sm:col-span-4">
          <label
            for="cityHallPassword"
            class="mb-2 block text-[12px] font-semibold text-black/70"
          >
            Senha
          </label>
          <input
            id="cityHallPassword"
            type="password"
            class={`h-11 w-full rounded-xl border px-3 text-[14px] font-semibold outline-none ${
              errors.cityHallPassword ? "border-red-300" : "border-black/15"
            }`}
            bind:value={$formDataStore.cityHallPassword}
            placeholder="Senha de acesso"
          />
          {#if errors.cityHallPassword}
            <p class="mt-1 text-[12px] text-red-600">
              {errors.cityHallPassword}
            </p>
          {/if}
        </div>

        <div class="sm:col-span-4">
          <label
            for="securityPhrase"
            class="mb-2 block text-[12px] font-semibold text-black/70"
          >
            Frase secreta de segurança
          </label>
          <input
            id="securityPhrase"
            class={`h-11 w-full rounded-xl border px-3 text-[14px] font-semibold outline-none ${
              errors.securityPhrase ? "border-red-300" : "border-black/15"
            }`}
            bind:value={$formDataStore.securityPhrase}
            placeholder="Frase de segurança"
          />
          {#if errors.securityPhrase}
            <p class="mt-1 text-[12px] text-red-600">{errors.securityPhrase}</p>
          {/if}
        </div>
      </div>
    </div>

    <div class="grid gap-4 sm:grid-cols-12">
      <div class="sm:col-span-6">
        <label
          for="serviceRpsBatchNumber"
          class="mb-2 block text-[12px] font-semibold text-black/70"
        >
          Numeração do lote de RPS
        </label>
        <input
          id="serviceRpsBatchNumber"
          class={`h-11 w-full rounded-xl border px-3 text-[14px] font-semibold outline-none ${
            errors.serviceRpsBatchNumber ? "border-red-300" : "border-black/15"
          }`}
          bind:value={$formDataStore.serviceRpsBatchNumber}
          placeholder="Ex: 1, 100, 20250001"
        />
        <p class="mt-1 text-[12px] text-black/45">
          Preencha caso já emita notas pelo site da prefeitura.
        </p>
        {#if errors.serviceRpsBatchNumber}
          <p class="mt-1 text-[12px] text-red-600">
            {errors.serviceRpsBatchNumber}
          </p>
        {/if}
      </div>
    </div>

    <div class="space-y-6">
      <div>
        <h3 class="text-[16px] font-semibold text-black/85">
          Dados fiscais do serviço
        </h3>
        <p class="mt-1 text-[13px] text-black/60">
          Configurações da NFS-e (serviços).
        </p>
      </div>

      <div class="grid gap-4 sm:grid-cols-12">
        <div class="sm:col-span-6">
          <label
            for="serviceListItem"
            class="mb-2 block text-[12px] font-semibold text-black/70"
          >
            Item Lista de Serviço
          </label>
          <input
            id="serviceListItem"
            class={`h-11 w-full rounded-xl border px-3 text-[14px] font-semibold outline-none ${
              errors.serviceListItem ? "border-red-300" : "border-black/15"
            }`}
            bind:value={$formDataStore.serviceListItem}
            placeholder="Ex: 7.02"
          />
          {#if errors.serviceListItem}
            <p class="mt-1 text-[12px] text-red-600">
              {errors.serviceListItem}
            </p>
          {/if}
        </div>

        <div class="sm:col-span-6">
          <label
            for="taxationCode"
            class="mb-2 block text-[12px] font-semibold text-black/70"
          >
            Código de Tributação
          </label>
          <input
            id="taxationCode"
            class={`h-11 w-full rounded-xl border px-3 text-[14px] font-semibold outline-none ${
              errors.taxationCode ? "border-red-300" : "border-black/15"
            }`}
            bind:value={$formDataStore.taxationCode}
            placeholder="Ex: 1234"
          />
          {#if errors.taxationCode}
            <p class="mt-1 text-[12px] text-red-600">{errors.taxationCode}</p>
          {/if}
        </div>

        <div class="sm:col-span-4">
          <label
            for="taxationPlace"
            class="mb-2 block text-[12px] font-semibold text-black/70"
          >
            Natureza da Operação
          </label>
          <select
            id="taxationPlace"
            class={`h-11 w-full rounded-xl border bg-white px-3 text-[13px] font-semibold ${
              errors.taxationPlace ? "border-red-300" : "border-black/15"
            }`}
            bind:value={$formDataStore.taxationPlace}
          >
            {#each taxationPlaceOptions as option}
              <option value={option.value}>{option.label}</option>
            {/each}
          </select>
          {#if errors.taxationPlace}
            <p class="mt-1 text-[12px] text-red-600">{errors.taxationPlace}</p>
          {/if}
        </div>

        <div class="sm:col-span-4">
          <label
            for="specialRegime"
            class="mb-2 block text-[12px] font-semibold text-black/70"
          >
            Regime Especial Tributação
          </label>
          <select
            id="specialRegime"
            class={`h-11 w-full rounded-xl border bg-white px-3 text-[13px] font-semibold ${
              errors.specialRegime ? "border-red-300" : "border-black/15"
            }`}
            bind:value={$formDataStore.specialRegime}
          >
            {#each specialRegimeOptions as option}
              <option value={option.value}>{option.label}</option>
            {/each}
          </select>
          {#if errors.specialRegime}
            <p class="mt-1 text-[12px] text-red-600">{errors.specialRegime}</p>
          {/if}
        </div>

        <div class="sm:col-span-4">
          <label
            for="issRequirement"
            class="mb-2 block text-[12px] font-semibold text-black/70"
          >
            Exigibilidade do ISS
          </label>
          <select
            id="issRequirement"
            class={`h-11 w-full rounded-xl border bg-white px-3 text-[13px] font-semibold ${
              errors.issRequirement ? "border-red-300" : "border-black/15"
            }`}
            bind:value={$formDataStore.issRequirement}
          >
            {#each issRequirementOptions as option}
              <option value={option.value}>{option.label}</option>
            {/each}
          </select>
          {#if errors.issRequirement}
            <p class="mt-1 text-[12px] text-red-600">{errors.issRequirement}</p>
          {/if}
        </div>

        <div class="sm:col-span-6">
          <label
            for="issWithholding"
            class="mb-2 block text-[12px] font-semibold text-black/70"
          >
            Retenção do ISS?
          </label>
          <select
            id="issWithholding"
            class={`h-11 w-full rounded-xl border bg-white px-3 text-[13px] font-semibold ${
              errors.issWithholding ? "border-red-300" : "border-black/15"
            }`}
            bind:value={$formDataStore.issWithholding}
          >
            {#each yesNoOptions as option}
              <option value={option.value}>{option.label}</option>
            {/each}
          </select>
          {#if errors.issWithholding}
            <p class="mt-1 text-[12px] text-red-600">{errors.issWithholding}</p>
          {/if}
        </div>

        <div class="sm:col-span-6">
          <label
            for="roundIss"
            class="mb-2 block text-[12px] font-semibold text-black/70"
          >
            Arredondar ISS?
          </label>
          <select
            id="roundIss"
            class="h-11 w-full rounded-xl border border-black/15 bg-white px-3 text-[13px] font-semibold"
            bind:value={$formDataStore.roundIss}
          >
            {#each yesNoOptions as option}
              <option value={option.value}>{option.label}</option>
            {/each}
          </select>
        </div>

        <div class="sm:col-span-3">
          <label
            for="aliquotPis"
            class="mb-2 block text-[12px] font-semibold text-black/70"
          >
            Alíquota PIS (%)
          </label>
          <input
            id="aliquotPis"
            class={`h-11 w-full rounded-xl border px-3 text-[14px] font-semibold outline-none ${
              errors.aliquotPis ? "border-red-300" : "border-black/15"
            }`}
            bind:value={$formDataStore.aliquotPis}
            placeholder="Ex: 0.65"
          />
          {#if errors.aliquotPis}
            <p class="mt-1 text-[12px] text-red-600">{errors.aliquotPis}</p>
          {/if}
        </div>

        <div class="sm:col-span-3">
          <label
            for="aliquotCofins"
            class="mb-2 block text-[12px] font-semibold text-black/70"
          >
            Alíquota COFINS (%)
          </label>
          <input
            id="aliquotCofins"
            class={`h-11 w-full rounded-xl border px-3 text-[14px] font-semibold outline-none ${
              errors.aliquotCofins ? "border-red-300" : "border-black/15"
            }`}
            bind:value={$formDataStore.aliquotCofins}
            placeholder="Ex: 3.00"
          />
          {#if errors.aliquotCofins}
            <p class="mt-1 text-[12px] text-red-600">{errors.aliquotCofins}</p>
          {/if}
        </div>

        <div class="sm:col-span-3">
          <label
            for="aliquotInss"
            class="mb-2 block text-[12px] font-semibold text-black/70"
          >
            Alíquota INSS (%)
          </label>
          <input
            id="aliquotInss"
            class={`h-11 w-full rounded-xl border px-3 text-[14px] font-semibold outline-none ${
              errors.aliquotInss ? "border-red-300" : "border-black/15"
            }`}
            bind:value={$formDataStore.aliquotInss}
            placeholder="Ex: 20.00"
          />
          {#if errors.aliquotInss}
            <p class="mt-1 text-[12px] text-red-600">{errors.aliquotInss}</p>
          {/if}
        </div>

        <div class="sm:col-span-3">
          <label
            for="aliquotIr"
            class="mb-2 block text-[12px] font-semibold text-black/70"
          >
            Alíquota IR (%)
          </label>
          <input
            id="aliquotIr"
            class={`h-11 w-full rounded-xl border px-3 text-[14px] font-semibold outline-none ${
              errors.aliquotIr ? "border-red-300" : "border-black/15"
            }`}
            bind:value={$formDataStore.aliquotIr}
            placeholder="Ex: 1.50"
          />
          {#if errors.aliquotIr}
            <p class="mt-1 text-[12px] text-red-600">{errors.aliquotIr}</p>
          {/if}
        </div>

        <div class="sm:col-span-3">
          <label
            for="aliquotCsll"
            class="mb-2 block text-[12px] font-semibold text-black/70"
          >
            Alíquota CSLL (%)
          </label>
          <input
            id="aliquotCsll"
            class={`h-11 w-full rounded-xl border px-3 text-[14px] font-semibold outline-none ${
              errors.aliquotCsll ? "border-red-300" : "border-black/15"
            }`}
            bind:value={$formDataStore.aliquotCsll}
            placeholder="Ex: 1.00"
          />
          {#if errors.aliquotCsll}
            <p class="mt-1 text-[12px] text-red-600">{errors.aliquotCsll}</p>
          {/if}
        </div>

        <div class="sm:col-span-3">
          <label
            for="aliquotIss"
            class="mb-2 block text-[12px] font-semibold text-black/70"
          >
            Alíquota ISS (%)
          </label>
          <input
            id="aliquotIss"
            class={`h-11 w-full rounded-xl border px-3 text-[14px] font-semibold outline-none ${
              errors.aliquotIss ? "border-red-300" : "border-black/15"
            }`}
            bind:value={$formDataStore.aliquotIss}
            placeholder="Ex: 2.00"
          />
          {#if errors.aliquotIss}
            <p class="mt-1 text-[12px] text-red-600">{errors.aliquotIss}</p>
          {/if}
        </div>

        <div class="sm:col-span-3">
          <label
            for="ibptPercent"
            class="mb-2 block text-[12px] font-semibold text-black/70"
          >
            Porcentagem IBPT
          </label>
          <input
            id="ibptPercent"
            class={`h-11 w-full rounded-xl border px-3 text-[14px] font-semibold outline-none ${
              errors.ibptPercent ? "border-red-300" : "border-black/15"
            }`}
            bind:value={$formDataStore.ibptPercent}
            placeholder="Opcional"
          />
          {#if errors.ibptPercent}
            <p class="mt-1 text-[12px] text-red-600">{errors.ibptPercent}</p>
          {/if}
        </div>

        <div class="sm:col-span-12">
          <label
            for="serviceDescription"
            class="mb-2 block text-[12px] font-semibold text-black/70"
          >
            Descrição dos Serviços Prestados na Nota Fiscal
          </label>
          <textarea
            id="serviceDescription"
            class={`min-h-[110px] w-full rounded-xl border px-3 py-3 text-[14px] font-semibold outline-none ${
              errors.serviceDescription ? "border-red-300" : "border-black/15"
            }`}
            bind:value={$formDataStore.serviceDescription}
            placeholder="Descreva detalhadamente os serviços prestados..."
          ></textarea>
          {#if errors.serviceDescription}
            <p class="mt-1 text-[12px] text-red-600">
              {errors.serviceDescription}
            </p>
          {/if}
        </div>
      </div>
    </div>
  {/if}

  {#if showCommerceFields}
    <!-- ==================== COMÉRCIO (NF-e) ==================== -->
    <div class="space-y-6">
      <div>
        <h3 class="text-[16px] font-semibold text-black/85">
          Dados iniciais da NF-e
        </h3>
        <p class="mt-1 text-[13px] text-black/60">
          Configurações da NF-e para produtos/comércio.
        </p>
      </div>

      <div class="grid gap-4 sm:grid-cols-12">
        <div class="sm:col-span-6">
          <label
            for="commerceLastInvoiceNumber"
            class="mb-2 block text-[12px] font-semibold text-black/70"
          >
            Número da última nota gerada
          </label>
          <input
            id="commerceLastInvoiceNumber"
            class={`h-11 w-full rounded-xl border px-3 text-[14px] font-semibold outline-none ${
              errors.commerceLastInvoiceNumber
                ? "border-red-300"
                : "border-black/15"
            }`}
            bind:value={$formDataStore.commerceLastInvoiceNumber}
            placeholder="Opcional"
          />
          <p class="mt-1 text-[12px] text-black/45">
            Preencha apenas se já tiver emitido notas anteriormente.
          </p>
          {#if errors.commerceLastInvoiceNumber}
            <p class="mt-1 text-[12px] text-red-600">
              {errors.commerceLastInvoiceNumber}
            </p>
          {/if}
        </div>

        <div class="sm:col-span-6">
          <label
            for="commerceOperationNature"
            class="mb-2 block text-[12px] font-semibold text-black/70"
          >
            Natureza da Operação
          </label>
          <input
            id="commerceOperationNature"
            class={`h-11 w-full rounded-xl border px-3 text-[14px] font-semibold outline-none ${
              errors.commerceOperationNature
                ? "border-red-300"
                : "border-black/15"
            }`}
            bind:value={$formDataStore.commerceOperationNature}
            placeholder="Ex: Venda de mercadorias"
          />
          {#if errors.commerceOperationNature}
            <p class="mt-1 text-[12px] text-red-600">
              {errors.commerceOperationNature}
            </p>
          {/if}
        </div>
      </div>

      <div>
        <h3 class="text-[16px] font-semibold text-black/85">
          Classificação fiscal
        </h3>
      </div>

      <div class="grid gap-4 sm:grid-cols-12">
        <div class="sm:col-span-4">
          <label
            for="commerceNcmCode"
            class="mb-2 block text-[12px] font-semibold text-black/70"
          >
            Código NCM
          </label>
          <input
            id="commerceNcmCode"
            class={`h-11 w-full rounded-xl border px-3 text-[14px] font-semibold outline-none ${
              errors.commerceNcmCode ? "border-red-300" : "border-black/15"
            }`}
            bind:value={$formDataStore.commerceNcmCode}
            placeholder="Ex: 12345678"
          />
          {#if errors.commerceNcmCode}
            <p class="mt-1 text-[12px] text-red-600">
              {errors.commerceNcmCode}
            </p>
          {/if}
        </div>

        <div class="sm:col-span-4">
          <label
            for="commerceCfopCode"
            class="mb-2 block text-[12px] font-semibold text-black/70"
          >
            Código CFOP
          </label>
          <input
            id="commerceCfopCode"
            class={`h-11 w-full rounded-xl border px-3 text-[14px] font-semibold outline-none ${
              errors.commerceCfopCode ? "border-red-300" : "border-black/15"
            }`}
            bind:value={$formDataStore.commerceCfopCode}
            placeholder="Ex: 5102"
          />
          {#if errors.commerceCfopCode}
            <p class="mt-1 text-[12px] text-red-600">
              {errors.commerceCfopCode}
            </p>
          {/if}
        </div>

        <div class="sm:col-span-4">
          <label
            for="commerceReturnCfop"
            class="mb-2 block text-[12px] font-semibold text-black/70"
          >
            CFOP para nota de devolução
          </label>
          <input
            id="commerceReturnCfop"
            class={`h-11 w-full rounded-xl border px-3 text-[14px] font-semibold outline-none ${
              errors.commerceReturnCfop ? "border-red-300" : "border-black/15"
            }`}
            bind:value={$formDataStore.commerceReturnCfop}
            placeholder="Ex: 1202"
          />
          {#if errors.commerceReturnCfop}
            <p class="mt-1 text-[12px] text-red-600">
              {errors.commerceReturnCfop}
            </p>
          {/if}
        </div>
      </div>

      <div>
        <h3 class="text-[16px] font-semibold text-black/85">ICMS</h3>
      </div>

      <div class="grid gap-4 sm:grid-cols-12">
        <div class="sm:col-span-6">
          <label
            for="commerceIcmsAliquot"
            class="mb-2 block text-[12px] font-semibold text-black/70"
          >
            Alíquota ICMS (%)
          </label>
          <input
            id="commerceIcmsAliquot"
            class={`h-11 w-full rounded-xl border px-3 text-[14px] font-semibold outline-none ${
              errors.commerceIcmsAliquot ? "border-red-300" : "border-black/15"
            }`}
            bind:value={$formDataStore.commerceIcmsAliquot}
            placeholder="Ex: 18.00"
          />
          {#if errors.commerceIcmsAliquot}
            <p class="mt-1 text-[12px] text-red-600">
              {errors.commerceIcmsAliquot}
            </p>
          {/if}
        </div>

        <div class="sm:col-span-6">
          <label
            for="commerceCstIcms"
            class="mb-2 block text-[12px] font-semibold text-black/70"
          >
            Código de Situação Tributária do ICMS (CST ICMS)
          </label>
          <select
            id="commerceCstIcms"
            class={`h-11 w-full rounded-xl border bg-white px-3 text-[13px] font-semibold ${
              errors.commerceCstIcms ? "border-red-300" : "border-black/15"
            }`}
            bind:value={$formDataStore.commerceCstIcms}
          >
            {#each cstIcmsOptions as option}
              <option value={option.value}>{option.label}</option>
            {/each}
          </select>
          {#if errors.commerceCstIcms}
            <p class="mt-1 text-[12px] text-red-600">
              {errors.commerceCstIcms}
            </p>
          {/if}
        </div>
      </div>

      <div>
        <h3 class="text-[16px] font-semibold text-black/85">
          IPI / PIS / COFINS
        </h3>
      </div>

      <div class="grid gap-4 sm:grid-cols-12">
        <div class="sm:col-span-3">
          <label
            for="commerceIpiAliquot"
            class="mb-2 block text-[12px] font-semibold text-black/70"
          >
            Alíquota IPI (%)
          </label>
          <input
            id="commerceIpiAliquot"
            class={`h-11 w-full rounded-xl border px-3 text-[14px] font-semibold outline-none ${
              errors.commerceIpiAliquot ? "border-red-300" : "border-black/15"
            }`}
            bind:value={$formDataStore.commerceIpiAliquot}
            placeholder="Ex: 5.00"
          />
          {#if errors.commerceIpiAliquot}
            <p class="mt-1 text-[12px] text-red-600">
              {errors.commerceIpiAliquot}
            </p>
          {/if}
        </div>

        <div class="sm:col-span-3">
          <label
            for="commerceCstIpi"
            class="mb-2 block text-[12px] font-semibold text-black/70"
          >
            Código da Situação Tributária do IPI (CST IPI)
          </label>
          <select
            id="commerceCstIpi"
            class={`h-11 w-full rounded-xl border bg-white px-3 text-[13px] font-semibold ${
              errors.commerceCstIpi ? "border-red-300" : "border-black/15"
            }`}
            bind:value={$formDataStore.commerceCstIpi}
          >
            {#each cstIpiOptions as option}
              <option value={option.value}>{option.label}</option>
            {/each}
          </select>
          {#if errors.commerceCstIpi}
            <p class="mt-1 text-[12px] text-red-600">{errors.commerceCstIpi}</p>
          {/if}
        </div>

        <div class="sm:col-span-3">
          <label
            for="commercePisAliquot"
            class="mb-2 block text-[12px] font-semibold text-black/70"
          >
            Alíquota PIS (%)
          </label>
          <input
            id="commercePisAliquot"
            class={`h-11 w-full rounded-xl border px-3 text-[14px] font-semibold outline-none ${
              errors.commercePisAliquot ? "border-red-300" : "border-black/15"
            }`}
            bind:value={$formDataStore.commercePisAliquot}
            placeholder="Ex: 1.65"
          />
          {#if errors.commercePisAliquot}
            <p class="mt-1 text-[12px] text-red-600">
              {errors.commercePisAliquot}
            </p>
          {/if}
        </div>

        <div class="sm:col-span-3">
          <label
            for="commerceCstPis"
            class="mb-2 block text-[12px] font-semibold text-black/70"
          >
            Código da Situação Tributária do PIS (CST PIS)
          </label>
          <select
            id="commerceCstPis"
            class={`h-11 w-full rounded-xl border bg-white px-3 text-[13px] font-semibold ${
              errors.commerceCstPis ? "border-red-300" : "border-black/15"
            }`}
            bind:value={$formDataStore.commerceCstPis}
          >
            {#each cstPisCofinsOptions as option}
              <option value={option.value}>{option.label}</option>
            {/each}
          </select>
          {#if errors.commerceCstPis}
            <p class="mt-1 text-[12px] text-red-600">{errors.commerceCstPis}</p>
          {/if}
        </div>

        <div class="sm:col-span-3">
          <label
            for="commerceCofinsAliquot"
            class="mb-2 block text-[12px] font-semibold text-black/70"
          >
            Alíquota COFINS (%)
          </label>
          <input
            id="commerceCofinsAliquot"
            class={`h-11 w-full rounded-xl border px-3 text-[14px] font-semibold outline-none ${
              errors.commerceCofinsAliquot
                ? "border-red-300"
                : "border-black/15"
            }`}
            bind:value={$formDataStore.commerceCofinsAliquot}
            placeholder="Ex: 7.60"
          />
          {#if errors.commerceCofinsAliquot}
            <p class="mt-1 text-[12px] text-red-600">
              {errors.commerceCofinsAliquot}
            </p>
          {/if}
        </div>

        <div class="sm:col-span-3">
          <label
            for="commerceCstCofins"
            class="mb-2 block text-[12px] font-semibold text-black/70"
          >
            Código da Situação Tributária do COFINS (CST COFINS)
          </label>
          <select
            id="commerceCstCofins"
            class={`h-11 w-full rounded-xl border bg-white px-3 text-[13px] font-semibold ${
              errors.commerceCstCofins ? "border-red-300" : "border-black/15"
            }`}
            bind:value={$formDataStore.commerceCstCofins}
          >
            {#each cstPisCofinsOptions as option}
              <option value={option.value}>{option.label}</option>
            {/each}
          </select>
          {#if errors.commerceCstCofins}
            <p class="mt-1 text-[12px] text-red-600">
              {errors.commerceCstCofins}
            </p>
          {/if}
        </div>
      </div>

      <div>
        <h3 class="text-[16px] font-semibold text-black/85">
          Descrição da nota
        </h3>
      </div>

      <div class="grid gap-4 sm:grid-cols-12">
        <div class="sm:col-span-8">
          <label
            for="commerceItemDescription"
            class="mb-2 block text-[12px] font-semibold text-black/70"
          >
            Descrição da Natureza de Operação das notas de comércio
          </label>
          <input
            id="commerceItemDescription"
            class={`h-11 w-full rounded-xl border px-3 text-[14px] font-semibold outline-none ${
              errors.commerceItemDescription
                ? "border-red-300"
                : "border-black/15"
            }`}
            bind:value={$formDataStore.commerceItemDescription}
            placeholder="Descreva a nota"
          />
          {#if errors.commerceItemDescription}
            <p class="mt-1 text-[12px] text-red-600">
              {errors.commerceItemDescription}
            </p>
          {/if}
        </div>

        <div class="sm:col-span-4">
          <label
            for="commerceGtin"
            class="mb-2 block text-[12px] font-semibold text-black/70"
          >
            Código GTIN
          </label>
          <input
            id="commerceGtin"
            class="h-11 w-full rounded-xl border border-black/15 px-3 text-[14px] font-semibold outline-none"
            bind:value={$formDataStore.commerceGtin}
            placeholder="Opcional"
          />
        </div>

        <div class="sm:col-span-12">
          <label
            for="commerceFiscalBenefitCode"
            class="mb-2 block text-[12px] font-semibold text-black/70"
          >
            Código de Benefício Fiscal
          </label>
          <input
            id="commerceFiscalBenefitCode"
            class="h-11 w-full rounded-xl border border-black/15 px-3 text-[14px] font-semibold outline-none"
            bind:value={$formDataStore.commerceFiscalBenefitCode}
            placeholder="Opcional"
          />
        </div>
      </div>
    </div>
  {/if}
</div>
