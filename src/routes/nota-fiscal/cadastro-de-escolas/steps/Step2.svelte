<!-- src/routes/nota-fiscal/cadastro-de-escolas/steps/Step2.svelte -->
<script lang="ts">
  import {
    formDataStore,
    taxationPlaceOptions,
    specialRegimeOptions,
    issRequirementOptions,
    yesNoOptions,
    cstIcmsOptions,
    csosnOptions,
    cstIpiOptions,
    cstPisCofinsOptions,
    type FormErrors,
  } from "../formStore";

  export let errors: FormErrors = {};
</script>

<div class="space-y-8">
  <div>
    <h2 class="text-[18px] font-semibold text-black/85">Acesso e dados específicos</h2>
    <p class="mt-1 text-[13px] text-black/60">
      Campos obrigatórios variam conforme o tipo de nota (NFS-e ou NF-e).
    </p>
  </div>

  {#if $formDataStore.noteKind === "service"}
    <!-- ==================== SERVIÇO (NFS-e) ==================== -->
    <div class="space-y-6">
      <div>
        <h3 class="text-[16px] font-semibold text-black/85">Acesso na prefeitura</h3>
        <p class="mt-1 text-[13px] text-black/60">
          Informações necessárias para integração com o sistema da prefeitura.
        </p>
      </div>

      <div class="grid gap-4 sm:grid-cols-12">
        <div class="sm:col-span-4">
          <label for="" class="text-[12px] font-semibold text-black/70 block mb-2">Login Prefeitura</label>
          <input
            class={`h-11 w-full rounded-xl border px-3 text-[14px] font-semibold outline-none ${errors.cityHallLogin ? "border-red-300" : "border-black/15"}`}
            bind:value={$formDataStore.cityHallLogin}
            placeholder="Usuário / CPF / CNPJ"
          />
          {#if errors.cityHallLogin}
            <p class="mt-1 text-[12px] text-red-600">{errors.cityHallLogin}</p>
          {/if}
        </div>

        <div class="sm:col-span-4">
          <label for="" class="text-[12px] font-semibold text-black/70 block mb-2">Senha</label>
          <input
            type="password"
            class={`h-11 w-full rounded-xl border px-3 text-[14px] font-semibold outline-none ${errors.cityHallPassword ? "border-red-300" : "border-black/15"}`}
            bind:value={$formDataStore.cityHallPassword}
            placeholder="Senha de acesso"
          />
          {#if errors.cityHallPassword}
            <p class="mt-1 text-[12px] text-red-600">{errors.cityHallPassword}</p>
          {/if}
        </div>

        <div class="sm:col-span-4">
          <label for="" class="text-[12px] font-semibold text-black/70 block mb-2">Frase secreta de segurança</label>
          <input
            class={`h-11 w-full rounded-xl border px-3 text-[14px] font-semibold outline-none ${errors.securityPhrase ? "border-red-300" : "border-black/15"}`}
            bind:value={$formDataStore.securityPhrase}
            placeholder="Frase de segurança"
          />
          {#if errors.securityPhrase}
            <p class="mt-1 text-[12px] text-red-600">{errors.securityPhrase}</p>
          {/if}
        </div>
      </div>
    </div>

    <div class="space-y-6">
      <div>
        <h3 class="text-[16px] font-semibold text-black/85">Dados fiscais do serviço</h3>
        <p class="mt-1 text-[13px] text-black/60">
          Configurações da NFS-e (serviços).
        </p>
      </div>

      <div class="grid gap-4 sm:grid-cols-12">
        <div class="sm:col-span-6">
          <label for="" class="text-[12px] font-semibold text-black/70 block mb-2">Item Lista de Serviço</label>
          <input
            class={`h-11 w-full rounded-xl border px-3 text-[14px] font-semibold outline-none ${errors.serviceListItem ? "border-red-300" : "border-black/15"}`}
            bind:value={$formDataStore.serviceListItem}
            placeholder="Ex: 7.02"
          />
          {#if errors.serviceListItem}
            <p class="mt-1 text-[12px] text-red-600">{errors.serviceListItem}</p>
          {/if}
        </div>

        <div class="sm:col-span-6">
          <label for="" class="text-[12px] font-semibold text-black/70 block mb-2">Código de Tributação</label>
          <input
            class={`h-11 w-full rounded-xl border px-3 text-[14px] font-semibold outline-none ${errors.taxationCode ? "border-red-300" : "border-black/15"}`}
            bind:value={$formDataStore.taxationCode}
            placeholder="Ex: 1234"
          />
          {#if errors.taxationCode}
            <p class="mt-1 text-[12px] text-red-600">{errors.taxationCode}</p>
          {/if}
        </div>

        <div class="sm:col-span-4">
          <label for="" class="text-[12px] font-semibold text-black/70 block mb-2">Natureza da Operação</label>
          <select
            class="h-11 w-full rounded-xl border border-black/15 bg-white px-3 text-[13px] font-semibold"
            bind:value={$formDataStore.taxationPlace}
          >
            {#each taxationPlaceOptions as o}
              <option value={o.value}>{o.label}</option>
            {/each}
          </select>
        </div>

        <div class="sm:col-span-4">
          <label for="" class="text-[12px] font-semibold text-black/70 block mb-2">Regime Especial Tributação</label>
          <select
            class="h-11 w-full rounded-xl border border-black/15 bg-white px-3 text-[13px] font-semibold"
            bind:value={$formDataStore.specialRegime}
          >
            {#each specialRegimeOptions as o}
              <option value={o.value}>{o.label}</option>
            {/each}
          </select>
        </div>

        <div class="sm:col-span-4">
          <label for="" class="text-[12px] font-semibold text-black/70 block mb-2">Exigibilidade do ISS</label>
          <select
            class="h-11 w-full rounded-xl border border-black/15 bg-white px-3 text-[13px] font-semibold"
            bind:value={$formDataStore.issRequirement}
          >
            {#each issRequirementOptions as o}
              <option value={o.value}>{o.label}</option>
            {/each}
          </select>
        </div>

        <div class="sm:col-span-6">
          <label for="" class="text-[12px] font-semibold text-black/70 block mb-2">Retenção do ISS?</label>
          <select
            class="h-11 w-full rounded-xl border border-black/15 bg-white px-3 text-[13px] font-semibold"
            bind:value={$formDataStore.issWithholding}
          >
            {#each yesNoOptions as o}
              <option value={o.value}>{o.label}</option>
            {/each}
          </select>
        </div>

        <div class="sm:col-span-6">
          <label for="" class="text-[12px] font-semibold text-black/70 block mb-2">Arredondar ISS?</label>
          <select
            class="h-11 w-full rounded-xl border border-black/15 bg-white px-3 text-[13px] font-semibold"
            bind:value={$formDataStore.roundIss}
          >
            {#each yesNoOptions as o}
              <option value={o.value}>{o.label}</option>
            {/each}
          </select>
        </div>

        <div class="sm:col-span-3">
          <label for="" class="text-[12px] font-semibold text-black/70 block mb-2">Alíquota PIS (%)</label>
          <input
            class={`h-11 w-full rounded-xl border px-3 text-[14px] font-semibold outline-none ${errors.aliquotPis ? "border-red-300" : "border-black/15"}`}
            bind:value={$formDataStore.aliquotPis}
            placeholder="Ex: 0.65"
          />
          {#if errors.aliquotPis}
            <p class="mt-1 text-[12px] text-red-600">{errors.aliquotPis}</p>
          {/if}
        </div>

        <div class="sm:col-span-3">
          <label for="" class="text-[12px] font-semibold text-black/70 block mb-2">Alíquota COFINS (%)</label>
          <input
            class={`h-11 w-full rounded-xl border px-3 text-[14px] font-semibold outline-none ${errors.aliquotCofins ? "border-red-300" : "border-black/15"}`}
            bind:value={$formDataStore.aliquotCofins}
            placeholder="Ex: 3.00"
          />
          {#if errors.aliquotCofins}
            <p class="mt-1 text-[12px] text-red-600">{errors.aliquotCofins}</p>
          {/if}
        </div>

        <div class="sm:col-span-3">
          <label for="" class="text-[12px] font-semibold text-black/70 block mb-2">Alíquota INSS (%)</label>
          <input
            class={`h-11 w-full rounded-xl border px-3 text-[14px] font-semibold outline-none ${errors.aliquotInss ? "border-red-300" : "border-black/15"}`}
            bind:value={$formDataStore.aliquotInss}
            placeholder="Ex: 20.00"
          />
          {#if errors.aliquotInss}
            <p class="mt-1 text-[12px] text-red-600">{errors.aliquotInss}</p>
          {/if}
        </div>

        <div class="sm:col-span-3">
          <label for="" class="text-[12px] font-semibold text-black/70 block mb-2">Alíquota IR (%)</label>
          <input
            class={`h-11 w-full rounded-xl border px-3 text-[14px] font-semibold outline-none ${errors.aliquotIr ? "border-red-300" : "border-black/15"}`}
            bind:value={$formDataStore.aliquotIr}
            placeholder="Ex: 1.50"
          />
          {#if errors.aliquotIr}
            <p class="mt-1 text-[12px] text-red-600">{errors.aliquotIr}</p>
          {/if}
        </div>

        <div class="sm:col-span-3">
          <label for="" class="text-[12px] font-semibold text-black/70 block mb-2">Alíquota CSLL (%)</label>
          <input
            class={`h-11 w-full rounded-xl border px-3 text-[14px] font-semibold outline-none ${errors.aliquotCsll ? "border-red-300" : "border-black/15"}`}
            bind:value={$formDataStore.aliquotCsll}
            placeholder="Ex: 1.00"
          />
          {#if errors.aliquotCsll}
            <p class="mt-1 text-[12px] text-red-600">{errors.aliquotCsll}</p>
          {/if}
        </div>

        <div class="sm:col-span-3">
          <label for="" class="text-[12px] font-semibold text-black/70 block mb-2">Alíquota ISS (%)</label>
          <input
            class={`h-11 w-full rounded-xl border px-3 text-[14px] font-semibold outline-none ${errors.aliquotIss ? "border-red-300" : "border-black/15"}`}
            bind:value={$formDataStore.aliquotIss}
            placeholder="Ex: 2.00"
          />
          {#if errors.aliquotIss}
            <p class="mt-1 text-[12px] text-red-600">{errors.aliquotIss}</p>
          {/if}
        </div>

        <div class="sm:col-span-3">
          <label for="" class="text-[12px] font-semibold text-black/70 block mb-2">Porcentagem IBPT</label>
          <input
            class={`h-11 w-full rounded-xl border px-3 text-[14px] font-semibold outline-none ${errors.ibptPercent ? "border-red-300" : "border-black/15"}`}
            bind:value={$formDataStore.ibptPercent}
            placeholder="Opcional"
          />
          {#if errors.ibptPercent}
            <p class="mt-1 text-[12px] text-red-600">{errors.ibptPercent}</p>
          {/if}
        </div>

        <div class="sm:col-span-12">
          <label for="" class="text-[12px] font-semibold text-black/70 block mb-2">Descrição dos Serviços Prestados na Nota Fiscal</label>
          <textarea
            class={`min-h-[110px] w-full rounded-xl border px-3 py-3 text-[14px] font-semibold outline-none ${errors.serviceDescription ? "border-red-300" : "border-black/15"}`}
            bind:value={$formDataStore.serviceDescription}
            placeholder="Descreva detalhadamente os serviços prestados..."
          ></textarea>
          {#if errors.serviceDescription}
            <p class="mt-1 text-[12px] text-red-600">{errors.serviceDescription}</p>
          {/if}
        </div>
      </div>
    </div>
  {:else}
    <!-- ==================== COMÉRCIO (NF-e) ==================== -->
    <div class="space-y-6">
      <div>
        <h3 class="text-[16px] font-semibold text-black/85">Lote e numeração</h3>
        <p class="mt-1 text-[13px] text-black/60">
          Configurações da NF-e (comércio/produtos).
        </p>
      </div>

      <div class="grid gap-4 sm:grid-cols-12">
        <div class="sm:col-span-4">
          <label for="" class="text-[12px] font-semibold text-black/70 block mb-2">Número do Lote</label>
          <input
            class={`h-11 w-full rounded-xl border px-3 text-[14px] font-semibold outline-none ${errors.commerceBatchNumber ? "border-red-300" : "border-black/15"}`}
            bind:value={$formDataStore.commerceBatchNumber}
            placeholder="Ex: 12345"
          />
          {#if errors.commerceBatchNumber}
            <p class="mt-1 text-[12px] text-red-600">{errors.commerceBatchNumber}</p>
          {/if}
        </div>

        <div class="sm:col-span-4">
          <label for="" class="text-[12px] font-semibold text-black/70 block mb-2">Numeração</label>
          <input
            class={`h-11 w-full rounded-xl border px-3 text-[14px] font-semibold outline-none ${errors.commerceNumbering ? "border-red-300" : "border-black/15"}`}
            bind:value={$formDataStore.commerceNumbering}
            placeholder="Ex: 0001"
          />
          {#if errors.commerceNumbering}
            <p class="mt-1 text-[12px] text-red-600">{errors.commerceNumbering}</p>
          {/if}
        </div>

        <div class="sm:col-span-4">
          <label for="" class="text-[12px] font-semibold text-black/70 block mb-2">Série</label>
          <input
            class={`h-11 w-full rounded-xl border px-3 text-[14px] font-semibold outline-none ${errors.commerceSeries ? "border-red-300" : "border-black/15"}`}
            bind:value={$formDataStore.commerceSeries}
            placeholder="Ex: 1"
          />
          {#if errors.commerceSeries}
            <p class="mt-1 text-[12px] text-red-600">{errors.commerceSeries}</p>
          {/if}
        </div>
      </div>

      <div>
        <h3 class="text-[16px] font-semibold text-black/85">Classificação fiscal</h3>
      </div>

      <div class="grid gap-4 sm:grid-cols-12">
        <div class="sm:col-span-4">
          <label for="" class="text-[12px] font-semibold text-black/70 block mb-2">Código NCM</label>
          <input
            class={`h-11 w-full rounded-xl border px-3 text-[14px] font-semibold outline-none ${errors.commerceNcmCode ? "border-red-300" : "border-black/15"}`}
            bind:value={$formDataStore.commerceNcmCode}
            placeholder="Ex: 12345678"
          />
          {#if errors.commerceNcmCode}
            <p class="mt-1 text-[12px] text-red-600">{errors.commerceNcmCode}</p>
          {/if}
        </div>

        <div class="sm:col-span-4">
          <label for="" class="text-[12px] font-semibold text-black/70 block mb-2">Código CFOP</label>
          <input
            class={`h-11 w-full rounded-xl border px-3 text-[14px] font-semibold outline-none ${errors.commerceCfopCode ? "border-red-300" : "border-black/15"}`}
            bind:value={$formDataStore.commerceCfopCode}
            placeholder="Ex: 5102"
          />
          {#if errors.commerceCfopCode}
            <p class="mt-1 text-[12px] text-red-600">{errors.commerceCfopCode}</p>
          {/if}
        </div>

        <div class="sm:col-span-4">
          <label for="" class="text-[12px] font-semibold text-black/70 block mb-2">Natureza da Operação</label>
          <input
            class={`h-11 w-full rounded-xl border px-3 text-[14px] font-semibold outline-none ${errors.commerceOperationNature ? "border-red-300" : "border-black/15"}`}
            bind:value={$formDataStore.commerceOperationNature}
            placeholder="Ex: Venda de mercadorias"
          />
          {#if errors.commerceOperationNature}
            <p class="mt-1 text-[12px] text-red-600">{errors.commerceOperationNature}</p>
          {/if}
        </div>
      </div>

      <div>
        <h3 class="text-[16px] font-semibold text-black/85">ICMS</h3>
      </div>

      <div class="grid gap-4 sm:grid-cols-12">
        <div class="sm:col-span-4">
          <label for="" class="text-[12px] font-semibold text-black/70 block mb-2">Alíquota ICMS (%)</label>
          <input
            class={`h-11 w-full rounded-xl border px-3 text-[14px] font-semibold outline-none ${errors.commerceIcmsAliquot ? "border-red-300" : "border-black/15"}`}
            bind:value={$formDataStore.commerceIcmsAliquot}
            placeholder="Ex: 18.00"
          />
          {#if errors.commerceIcmsAliquot}
            <p class="mt-1 text-[12px] text-red-600">{errors.commerceIcmsAliquot}</p>
          {/if}
        </div>

        <div class="sm:col-span-4">
          <label for="" class="text-[12px] font-semibold text-black/70 block mb-2">Código de Situação Tributária do ICMS (CST ICMS)</label>
          <select
            class="h-11 w-full rounded-xl border border-black/15 bg-white px-3 text-[13px] font-semibold"
            bind:value={$formDataStore.commerceCstIcms}
          >
            {#each cstIcmsOptions as o}
              <option value={o.value}>{o.label}</option>
            {/each}
          </select>
          {#if errors.commerceCstIcms}
            <p class="mt-1 text-[12px] text-red-600">{errors.commerceCstIcms}</p>
          {/if}
        </div>

        <div class="sm:col-span-4">
          <label for="" class="text-[12px] font-semibold text-black/70 block mb-2">Código de Situação da Operação no Simples Nacional (CSOSN)</label>
          <select
            class="h-11 w-full rounded-xl border border-black/15 bg-white px-3 text-[13px] font-semibold"
            bind:value={$formDataStore.commerceCsosn}
          >
            {#each csosnOptions as o}
              <option value={o.value}>{o.label}</option>
            {/each}
          </select>
          {#if errors.commerceCsosn}
            <p class="mt-1 text-[12px] text-red-600">{errors.commerceCsosn}</p>
          {/if}
        </div>
      </div>

      <div>
        <h3 class="text-[16px] font-semibold text-black/85">IPI / PIS / COFINS</h3>
      </div>

      <div class="grid gap-4 sm:grid-cols-12">
        <div class="sm:col-span-3">
          <label for="" class="text-[12px] font-semibold text-black/70 block mb-2">Alíquota IPI (%)</label>
          <input
            class={`h-11 w-full rounded-xl border px-3 text-[14px] font-semibold outline-none ${errors.commerceIpiAliquot ? "border-red-300" : "border-black/15"}`}
            bind:value={$formDataStore.commerceIpiAliquot}
            placeholder="Opcional"
          />
          {#if errors.commerceIpiAliquot}
            <p class="mt-1 text-[12px] text-red-600">{errors.commerceIpiAliquot}</p>
          {/if}
        </div>

        <div class="sm:col-span-3">
          <label for="" class="text-[12px] font-semibold text-black/70 block mb-2">Código da Situação tributária do IPI (CST IPI)</label>
          <select
            class="h-11 w-full rounded-xl border border-black/15 bg-white px-3 text-[13px] font-semibold"
            bind:value={$formDataStore.commerceCstIpi}
          >
            {#each cstIpiOptions as o}
              <option value={o.value}>{o.label}</option>
            {/each}
          </select>
          {#if errors.commerceCstIpi}
            <p class="mt-1 text-[12px] text-red-600">{errors.commerceCstIpi}</p>
          {/if}
        </div>

        <div class="sm:col-span-3">
          <label for="" class="text-[12px] font-semibold text-black/70 block mb-2">Alíquota PIS (%)</label>
          <input
            class={`h-11 w-full rounded-xl border px-3 text-[14px] font-semibold outline-none ${errors.commercePisAliquot ? "border-red-300" : "border-black/15"}`}
            bind:value={$formDataStore.commercePisAliquot}
            placeholder="Opcional"
          />
          {#if errors.commercePisAliquot}
            <p class="mt-1 text-[12px] text-red-600">{errors.commercePisAliquot}</p>
          {/if}
        </div>

        <div class="sm:col-span-3">
          <label for="" class="text-[12px] font-semibold text-black/70 block mb-2">Código da situação tributária do PIS (CST PIS)</label>
          <select
            class="h-11 w-full rounded-xl border border-black/15 bg-white px-3 text-[13px] font-semibold"
            bind:value={$formDataStore.commerceCstPis}
          >
            {#each cstPisCofinsOptions as o}
              <option value={o.value}>{o.label}</option>
            {/each}
          </select>
          {#if errors.commerceCstPis}
            <p class="mt-1 text-[12px] text-red-600">{errors.commerceCstPis}</p>
          {/if}
        </div>

        <div class="sm:col-span-3">
          <label for="" class="text-[12px] font-semibold text-black/70 block mb-2">Alíquota COFINS (%)</label>
          <input
            class={`h-11 w-full rounded-xl border px-3 text-[14px] font-semibold outline-none ${errors.commerceCofinsAliquot ? "border-red-300" : "border-black/15"}`}
            bind:value={$formDataStore.commerceCofinsAliquot}
            placeholder="Opcional"
          />
          {#if errors.commerceCofinsAliquot}
            <p class="mt-1 text-[12px] text-red-600">{errors.commerceCofinsAliquot}</p>
          {/if}
        </div>

        <div class="sm:col-span-3">
          <label for="" class="text-[12px] font-semibold text-black/70 block mb-2">Código da situação tributária do COFINS (CST COFINS)</label>
          <select
            class="h-11 w-full rounded-xl border border-black/15 bg-white px-3 text-[13px] font-semibold"
            bind:value={$formDataStore.commerceCstCofins}
          >
            {#each cstPisCofinsOptions as o}
              <option value={o.value}>{o.label}</option>
            {/each}
          </select>
          {#if errors.commerceCstCofins}
            <p class="mt-1 text-[12px] text-red-600">{errors.commerceCstCofins}</p>
          {/if}
        </div>
      </div>

      <div>
        <h3 class="text-[16px] font-semibold text-black/85">Descrição do item</h3>
      </div>

      <div class="grid gap-4 sm:grid-cols-12">
        <div class="sm:col-span-8">
          <label for="" class="text-[12px] font-semibold text-black/70 block mb-2">Descrição do Item de Produto</label>
          <input
            class={`h-11 w-full rounded-xl border px-3 text-[14px] font-semibold outline-none ${errors.commerceItemDescription ? "border-red-300" : "border-black/15"}`}
            bind:value={$formDataStore.commerceItemDescription}
            placeholder="Descreva o item de produto"
          />
          {#if errors.commerceItemDescription}
            <p class="mt-1 text-[12px] text-red-600">{errors.commerceItemDescription}</p>
          {/if}
        </div>

        <div class="sm:col-span-4">
          <label for="" class="text-[12px] font-semibold text-black/70 block mb-2">Código GTIN (EAN) padrão</label>
          <input
            class="h-11 w-full rounded-xl border border-black/15 px-3 text-[14px] font-semibold outline-none"
            bind:value={$formDataStore.commerceGtin}
            placeholder="Opcional"
          />
        </div>

        <div class="sm:col-span-12">
          <label for="" class="text-[12px] font-semibold text-black/70 block mb-2">Código de Benefício Fiscal</label>
          <input
            class="h-11 w-full rounded-xl border border-black/15 px-3 text-[14px] font-semibold outline-none"
            bind:value={$formDataStore.commerceFiscalBenefitCode}
            placeholder="Opcional"
          />
        </div>
      </div>
    </div>
  {/if}
</div>