<!-- src/routes/nota-fiscal/cadastro-de-escolas/steps/Step1.svelte -->
<script lang="ts">
  import {
    formDataStore,
    noteKindOptions,
    yesNoOptions,
    type FormErrors,
  } from "../formStore";
  import type { NoteKind, YesNo } from "../formStore";

  export let errors: FormErrors = {};

  let isLoadingCnpj = false;
  let isLoadingCep = false;

  // UI-only masks (store fica clean: só dígitos)
  let cnpjDisplay = "";
  let cepDisplay = "";

  const primaryNoteKindOptions = noteKindOptions.slice(0, 2);
  const primaryYesNoOptions = yesNoOptions.slice(0, 2);
  const stateRegistrationOptions = [
    { label: "Sim", value: true },
    { label: "Não", value: false },
  ] as const;

  const cnpjLookupUrl = (cnpjDigits: string) =>
    `/api/cnpj/${encodeURIComponent(cnpjDigits)}`;
  const cepLookupUrl = (cepDigits: string) =>
    `/api/viacep?cep=${encodeURIComponent(cepDigits)}`;

  function onlyDigits(value: string): string {
    return (value ?? "").replace(/\D+/g, "");
  }

  function formatCnpj(value: string): string {
    const v = onlyDigits(value).slice(0, 14);
    const p1 = v.slice(0, 2);
    const p2 = v.slice(2, 5);
    const p3 = v.slice(5, 8);
    const p4 = v.slice(8, 12);
    const p5 = v.slice(12, 14);

    let out = p1;
    if (p2) out += "." + p2;
    if (p3) out += "." + p3;
    if (p4) out += "/" + p4;
    if (p5) out += "-" + p5;

    return out;
  }

  function formatCep(value: string): string {
    const v = onlyDigits(value).slice(0, 8);
    const p1 = v.slice(0, 5);
    const p2 = v.slice(5, 8);
    return p2 ? `${p1}-${p2}` : p1;
  }

  function isValidCnpj(cnpjDigits: string): boolean {
    const cnpj = onlyDigits(cnpjDigits);
    if (cnpj.length !== 14) return false;
    if (/^(\d)\1{13}$/.test(cnpj)) return false;

    const calcDv = (base: string, weights: number[]) => {
      let sum = 0;
      for (let i = 0; i < weights.length; i++) {
        sum += Number(base[i]) * weights[i];
      }
      const mod = sum % 11;
      return mod < 2 ? 0 : 11 - mod;
    };

    const base12 = cnpj.slice(0, 12);
    const dv1 = calcDv(base12, [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]);
    const base13 = base12 + String(dv1);
    const dv2 = calcDv(base13, [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]);

    return cnpj === base12 + String(dv1) + String(dv2);
  }

  function isValidCep(cepDigits: string): boolean {
    const cep = onlyDigits(cepDigits);
    if (cep.length !== 8) return false;
    if (cep === "00000000") return false;
    return true;
  }

  async function fillByCep(cepDigits: string) {
    const cep = onlyDigits(cepDigits).slice(0, 8);
    if (!isValidCep(cep)) return;

    isLoadingCep = true;
    try {
      const res = await fetch(cepLookupUrl(cep));
      if (!res.ok) return;

      const json = await res.json();
      if (json?.erro) return;

      const street = (json.logradouro as string) || "";
      const neighborhood = (json.bairro as string) || "";
      const city = (json.localidade as string) || "";
      const state = (json.uf as string) || "";

      const current = $formDataStore;
      const number = (current.number ?? "").trim();
      const complement = (current.complement ?? "").trim();

      formDataStore.update((prev) => ({
        ...prev,
        cep,
        street: street || prev.street,
        neighborhood: neighborhood || prev.neighborhood,
        city: city || prev.city,
        state: state || prev.state,
        number,
        complement,
      }));

      cepDisplay = formatCep(cep);
    } finally {
      isLoadingCep = false;
    }
  }

  async function lookupCnpj() {
    const data = $formDataStore;
    const cnpjDigits = onlyDigits(data.cnpj).slice(0, 14);

    if (cnpjDigits.length !== 14) return;
    if (!isValidCnpj(cnpjDigits)) return;

    isLoadingCnpj = true;
    try {
      const res = await fetch(cnpjLookupUrl(cnpjDigits));
      if (!res.ok) return;

      const json = await res.json();
      const estab = json?.estabelecimento ?? null;

      const legalName = json?.razao_social || json?.nome || data.legalName;
      const fantasyName =
        estab?.nome_fantasia ||
        json?.nome_fantasia ||
        json?.fantasia ||
        data.fantasyName;
      const cnaeMain =
        estab?.atividade_principal?.id ||
        json?.cnae_fiscal ||
        json?.cnae_fiscal_principal ||
        data.cnaeMain;

      const cepFromCnpj =
        onlyDigits(estab?.cep || json?.cep || "").slice(0, 8) ||
        onlyDigits(data.cep).slice(0, 8);

      const street =
        [
          String(estab?.tipo_logradouro ?? "").trim(),
          String(estab?.logradouro ?? "").trim(),
        ]
          .filter(Boolean)
          .join(" ")
          .trim() || "";

      const number = (estab?.numero || "").trim();
      const complement = (estab?.complemento || "").trim();
      const neighborhood = (estab?.bairro || "").trim();
      const city = (estab?.cidade?.nome || estab?.municipio || "").trim();
      const state = (estab?.estado?.sigla || estab?.uf || "")
        .trim()
        .toUpperCase();

      const phone =
        [
          String(estab?.ddd1 ?? "").trim(),
          String(estab?.telefone1 ?? "").trim(),
        ]
          .filter(Boolean)
          .join(" ")
          .trim() || String(json?.telefone || "").trim();

      const email = String(estab?.email || json?.email || "").trim();
      const website = String(estab?.site || json?.site || "").trim();

      formDataStore.update((prev) => ({
        ...prev,
        cnpj: cnpjDigits,
        legalName: legalName ?? prev.legalName,
        fantasyName: fantasyName ?? prev.fantasyName,
        cnaeMain: (cnaeMain ?? prev.cnaeMain)?.toString(),
        cep: cepFromCnpj ? cepFromCnpj : prev.cep,
        street: street || prev.street,
        number: number || prev.number,
        complement: complement || prev.complement,
        neighborhood: neighborhood || prev.neighborhood,
        city: city || prev.city,
        state: state || prev.state,
        phone: phone || prev.phone,
        email: email || prev.email,
        website: website || prev.website,
      }));

      cnpjDisplay = formatCnpj(cnpjDigits);
      if (cepFromCnpj) {
        cepDisplay = formatCep(cepFromCnpj);
      }
    } finally {
      isLoadingCnpj = false;
    }
  }

  async function lookupCep() {
    const cepDigits = onlyDigits($formDataStore.cep).slice(0, 8);
    if (!isValidCep(cepDigits)) return;
    await fillByCep(cepDigits);
  }

  function setNoteKind(value: NoteKind) {
    formDataStore.update((prev) => ({ ...prev, noteKind: value }));
  }

  function setYesNoField<
    K extends
      | "isSimples"
      | "supportsCulturalProjects"
      | "usesNationalNfseEnvironment",
  >(key: K, value: YesNo) {
    formDataStore.update((prev) => ({ ...prev, [key]: value }));
  }

  function setHasStateRegistration(value: boolean) {
    formDataStore.update((prev) => ({
      ...prev,
      hasStateRegistration: value,
      stateRegistration: value ? prev.stateRegistration : "",
    }));
  }
</script>

<div class="space-y-6">
  <div class="flex items-start justify-between gap-4">
    <div>
      <h2 class="text-[18px] font-semibold text-black/85">
        Dados do CNPJ e endereço
      </h2>
      <p class="mt-1 text-[13px] text-black/60">
        Informe o CNPJ e o CEP para preenchimento automático.
      </p>
    </div>
  </div>

  <div class="col-span-12">
    <label
      for=""
      class="mb-2 block text-[12px] font-semibold text-black/70"
    >
      Tipo
    </label>

    <div class="inline-flex rounded-xl border border-black/15 bg-white p-1">
      {#each primaryNoteKindOptions as option}
        <button
          type="button"
          class={`h-9 rounded-lg px-3 text-[13px] font-semibold transition ${
            $formDataStore.noteKind === option.value
              ? "bg-[var(--primary)] text-white"
              : "bg-transparent text-black/70 hover:bg-[var(--primary)]/5"
          }`}
          aria-pressed={$formDataStore.noteKind === option.value}
          on:click={() => setNoteKind(option.value)}
        >
          {option.label}
        </button>
      {/each}
    </div>

    {#if noteKindOptions.length > 2}
      <div class="mt-2">
        <select
          class="h-10 w-full rounded-xl border border-black/15 bg-white px-3 text-[13px] font-semibold text-black/80"
          value={$formDataStore.noteKind}
          on:change={(e) =>
            setNoteKind((e.target as HTMLSelectElement).value as NoteKind)}
        >
          {#each noteKindOptions as option}
            <option value={option.value}>{option.label}</option>
          {/each}
        </select>
      </div>
    {/if}
  </div>

  <div class="grid gap-4 sm:grid-cols-12">
    <div class="sm:col-span-4">
      <label for="" class="mb-2 block text-[12px] font-semibold text-black/70">
        CNPJ
      </label>

      <div class="relative">
        <input
          class={`h-11 w-full rounded-xl border px-3 text-[14px] font-semibold outline-none ${
            errors.cnpj ? "border-red-300" : "border-black/15"
          }`}
          placeholder="00.000.000/0000-00"
          value={cnpjDisplay || formatCnpj($formDataStore.cnpj)}
          on:input={(e) => {
            const target = e.target as HTMLInputElement;
            const digits = onlyDigits(target.value).slice(0, 14);
            cnpjDisplay = formatCnpj(digits);
            formDataStore.update((prev) => ({ ...prev, cnpj: digits }));
          }}
          on:blur={() => {
            const digits = onlyDigits($formDataStore.cnpj).slice(0, 14);
            cnpjDisplay = formatCnpj(digits);
            if (digits.length === 14 && isValidCnpj(digits)) {
              lookupCnpj();
            }
          }}
          inputmode="numeric"
        />

        {#if isLoadingCnpj}
          <div
            class="absolute right-3 top-1/2 -translate-y-1/2 text-[12px] text-black/50"
          >
            Buscando...
          </div>
        {/if}
      </div>

      {#if errors.cnpj}
        <p class="mt-1 text-[12px] text-red-600">{errors.cnpj}</p>
      {/if}
    </div>

    <div class="sm:col-span-4">
      <label for="" class="mb-2 block text-[12px] font-semibold text-black/70">
        Inscrição Municipal
      </label>
      <input
        class={`h-11 w-full rounded-xl border px-3 text-[14px] font-semibold outline-none ${
          errors.municipalRegistration ? "border-red-300" : "border-black/15"
        }`}
        bind:value={$formDataStore.municipalRegistration}
        placeholder="Ex: 123456"
      />
      {#if errors.municipalRegistration}
        <p class="mt-1 text-[12px] text-red-600">
          {errors.municipalRegistration}
        </p>
      {/if}
    </div>

    <div class="sm:col-span-4">
      <label for="" class="mb-2 block text-[12px] font-semibold text-black/70">
        Possui inscrição estadual?
      </label>

      <div
        class={`inline-flex w-full rounded-xl border bg-white p-1 ${
          errors.hasStateRegistration ? "border-red-300" : "border-black/15"
        }`}
      >
        {#each stateRegistrationOptions as option}
          <button
            type="button"
            class={`h-9 flex-1 rounded-lg px-3 text-[13px] font-semibold transition ${
              $formDataStore.hasStateRegistration === option.value
                ? "bg-[var(--primary)] text-white"
                : "bg-transparent text-black/70 hover:bg-[var(--primary)]/5"
            }`}
            aria-pressed={$formDataStore.hasStateRegistration === option.value}
            on:click={() => setHasStateRegistration(option.value)}
          >
            {option.label}
          </button>
        {/each}
      </div>

      {#if errors.hasStateRegistration}
        <p class="mt-1 text-[12px] text-red-600">
          {errors.hasStateRegistration}
        </p>
      {/if}
    </div>
  </div>

  {#if $formDataStore.hasStateRegistration === true}
    <div class="grid gap-4 sm:grid-cols-12">
      <div class="sm:col-span-4">
        <label
          for=""
          class="mb-2 block text-[12px] font-semibold text-black/70"
        >
          Inscrição Estadual
        </label>
        <input
          class={`h-11 w-full rounded-xl border px-3 text-[14px] font-semibold outline-none ${
            errors.stateRegistration ? "border-red-300" : "border-black/15"
          }`}
          bind:value={$formDataStore.stateRegistration}
          placeholder="Informe a inscrição estadual"
        />
        {#if errors.stateRegistration}
          <p class="mt-1 text-[12px] text-red-600">
            {errors.stateRegistration}
          </p>
        {/if}
      </div>
    </div>
  {/if}

  <div class="grid gap-4 sm:grid-cols-12">
    <div class="sm:col-span-6">
      <label for="" class="mb-2 block text-[12px] font-semibold text-black/70">
        Razão Social
      </label>
      <input
        class={`h-11 w-full rounded-xl border px-3 text-[14px] font-semibold outline-none ${
          errors.legalName ? "border-red-300" : "border-black/15"
        }`}
        bind:value={$formDataStore.legalName}
        placeholder="Razão Social"
      />
      {#if errors.legalName}
        <p class="mt-1 text-[12px] text-red-600">{errors.legalName}</p>
      {/if}
    </div>

    <div class="sm:col-span-4">
      <label for="" class="mb-2 block text-[12px] font-semibold text-black/70">
        Nome Fantasia
      </label>
      <input
        class={`h-11 w-full rounded-xl border px-3 text-[14px] font-semibold outline-none ${
          errors.fantasyName ? "border-red-300" : "border-black/15"
        }`}
        bind:value={$formDataStore.fantasyName}
        placeholder="Nome Fantasia"
      />
      {#if errors.fantasyName}
        <p class="mt-1 text-[12px] text-red-600">{errors.fantasyName}</p>
      {/if}
    </div>

    <div class="sm:col-span-2">
      <label for="" class="mb-2 block text-[12px] font-semibold text-black/70">
        CNAE
      </label>
      <input
        class={`h-11 w-full rounded-xl border px-3 text-[14px] font-semibold outline-none ${
          errors.cnaeMain ? "border-red-300" : "border-black/15"
        }`}
        bind:value={$formDataStore.cnaeMain}
        placeholder="0000000"
        inputmode="numeric"
      />
      {#if errors.cnaeMain}
        <p class="mt-1 text-[12px] text-red-600">{errors.cnaeMain}</p>
      {/if}
    </div>
  </div>

  <div class="grid gap-4 sm:grid-cols-12">
    <div class="sm:col-span-4">
      <label for="" class="mb-2 block text-[12px] font-semibold text-black/70">
        Telefone
      </label>
      <input
        class={`h-11 w-full rounded-xl border px-3 text-[14px] font-semibold outline-none ${
          errors.phone ? "border-red-300" : "border-black/15"
        }`}
        bind:value={$formDataStore.phone}
        placeholder="(41) 99999-9999"
        inputmode="tel"
      />
      {#if errors.phone}
        <p class="mt-1 text-[12px] text-red-600">{errors.phone}</p>
      {/if}
    </div>

    <div class="sm:col-span-4">
      <label for="" class="mb-2 block text-[12px] font-semibold text-black/70">
        E-mail
      </label>
      <input
        class={`h-11 w-full rounded-xl border px-3 text-[14px] font-semibold outline-none ${
          errors.email ? "border-red-300" : "border-black/15"
        }`}
        bind:value={$formDataStore.email}
        placeholder="financeiro@escola.com.br"
        type="email"
        inputmode="email"
      />
      {#if errors.email}
        <p class="mt-1 text-[12px] text-red-600">{errors.email}</p>
      {/if}
    </div>

    <div class="sm:col-span-4">
      <label for="" class="mb-2 block text-[12px] font-semibold text-black/70">
        Site
      </label>
      <input
        class={`h-11 w-full rounded-xl border px-3 text-[14px] font-semibold outline-none ${
          errors.website ? "border-red-300" : "border-black/15"
        }`}
        bind:value={$formDataStore.website}
        placeholder="https://www.escola.com.br"
        type="url"
        inputmode="url"
      />
      {#if errors.website}
        <p class="mt-1 text-[12px] text-red-600">{errors.website}</p>
      {/if}
    </div>
  </div>

  <div class="grid gap-4 sm:grid-cols-12">
    <div class="sm:col-span-3">
      <label for="" class="mb-2 block text-[12px] font-semibold text-black/70">
        CEP
      </label>

      <div class="relative">
        <input
          class={`h-11 w-full rounded-xl border px-3 text-[14px] font-semibold outline-none ${
            errors.cep ? "border-red-300" : "border-black/15"
          }`}
          placeholder="00000-000"
          value={cepDisplay || formatCep($formDataStore.cep)}
          on:input={(e) => {
            const target = e.target as HTMLInputElement;
            const digits = onlyDigits(target.value).slice(0, 8);
            cepDisplay = formatCep(digits);
            formDataStore.update((prev) => ({ ...prev, cep: digits }));
          }}
          on:blur={() => {
            const digits = onlyDigits($formDataStore.cep).slice(0, 8);
            cepDisplay = formatCep(digits);
            if (isValidCep(digits)) {
              lookupCep();
            }
          }}
          inputmode="numeric"
        />

        {#if isLoadingCep}
          <div
            class="absolute right-3 top-1/2 -translate-y-1/2 text-[12px] text-black/50"
          >
            Buscando...
          </div>
        {/if}
      </div>

      {#if errors.cep}
        <p class="mt-1 text-[12px] text-red-600">{errors.cep}</p>
      {/if}
    </div>

    <div class="sm:col-span-6">
      <label for="" class="mb-2 block text-[12px] font-semibold text-black/70">
        Logradouro
      </label>
      <input
        class={`h-11 w-full rounded-xl border px-3 text-[14px] font-semibold outline-none ${
          errors.street ? "border-red-300" : "border-black/15"
        }`}
        bind:value={$formDataStore.street}
        placeholder="Rua, Avenida, etc."
      />
      {#if errors.street}
        <p class="mt-1 text-[12px] text-red-600">{errors.street}</p>
      {/if}
    </div>

    <div class="sm:col-span-3">
      <label for="" class="mb-2 block text-[12px] font-semibold text-black/70">
        Número
      </label>
      <input
        class={`h-11 w-full rounded-xl border px-3 text-[14px] font-semibold outline-none ${
          errors.number ? "border-red-300" : "border-black/15"
        }`}
        bind:value={$formDataStore.number}
        placeholder="123 ou s/n"
      />
      {#if errors.number}
        <p class="mt-1 text-[12px] text-red-600">{errors.number}</p>
      {/if}
    </div>
  </div>

  <div class="grid gap-4 sm:grid-cols-12">
    <div class="sm:col-span-6">
      <label for="" class="mb-2 block text-[12px] font-semibold text-black/70">
        Complemento
      </label>
      <input
        class={`h-11 w-full rounded-xl border px-3 text-[14px] font-semibold outline-none ${
          errors.complement ? "border-red-300" : "border-black/15"
        }`}
        bind:value={$formDataStore.complement}
        placeholder="Apto, sala, etc. (opcional)"
      />
      {#if errors.complement}
        <p class="mt-1 text-[12px] text-red-600">{errors.complement}</p>
      {/if}
    </div>

    <div class="sm:col-span-6">
      <label for="" class="mb-2 block text-[12px] font-semibold text-black/70">
        Bairro
      </label>
      <input
        class={`h-11 w-full rounded-xl border px-3 text-[14px] font-semibold outline-none ${
          errors.neighborhood ? "border-red-300" : "border-black/15"
        }`}
        bind:value={$formDataStore.neighborhood}
        placeholder="Bairro"
      />
      {#if errors.neighborhood}
        <p class="mt-1 text-[12px] text-red-600">{errors.neighborhood}</p>
      {/if}
    </div>
  </div>

  <div class="grid gap-4 sm:grid-cols-12">
    <div class="sm:col-span-8">
      <label for="" class="mb-2 block text-[12px] font-semibold text-black/70">
        Cidade
      </label>
      <input
        class={`h-11 w-full rounded-xl border px-3 text-[14px] font-semibold outline-none ${
          errors.city ? "border-red-300" : "border-black/15"
        }`}
        bind:value={$formDataStore.city}
        placeholder="Cidade"
      />
      {#if errors.city}
        <p class="mt-1 text-[12px] text-red-600">{errors.city}</p>
      {/if}
    </div>

    <div class="sm:col-span-4">
      <label for="" class="mb-2 block text-[12px] font-semibold text-black/70">
        UF
      </label>
      <input
        class={`h-11 w-full rounded-xl border px-3 text-[14px] font-semibold uppercase outline-none ${
          errors.state ? "border-red-300" : "border-black/15"
        }`}
        bind:value={$formDataStore.state}
        placeholder="PR"
        maxlength="2"
        on:input={(e) => {
          const target = e.target as HTMLInputElement;
          target.value = target.value.toUpperCase();
        }}
      />
      {#if errors.state}
        <p class="mt-1 text-[12px] text-red-600">{errors.state}</p>
      {/if}
    </div>
  </div>

  <div class="pt-2">
    <h3 class="text-[16px] font-semibold text-black/85">Confirmações</h3>
    <p class="mt-1 text-[13px] text-black/60">
      Responda para configurar o fluxo de homologação.
    </p>
  </div>

  <div class="grid gap-4 sm:grid-cols-12">
    <div class="sm:col-span-4">
      <label for="" class="mb-2 block text-[12px] font-semibold text-black/70">
        Optante do Simples Nacional?
      </label>

      <div
        class="inline-flex w-full rounded-xl border border-black/15 bg-white p-1"
      >
        {#each primaryYesNoOptions as option}
          <button
            type="button"
            class={`h-9 flex-1 rounded-lg px-3 text-[13px] font-semibold transition ${
              $formDataStore.isSimples === option.value
                ? "bg-[var(--primary)] text-white"
                : "bg-transparent text-black/70 hover:bg-[var(--primary)]/5"
            }`}
            aria-pressed={$formDataStore.isSimples === option.value}
            on:click={() => setYesNoField("isSimples", option.value)}
          >
            {option.label}
          </button>
        {/each}
      </div>

      {#if errors.isSimples}
        <p class="mt-1 text-[12px] text-red-600">{errors.isSimples}</p>
      {/if}
    </div>

    <div class="sm:col-span-4">
      <label for="" class="mb-2 block text-[12px] font-semibold text-black/70">
        Sua escola incentiva projetos culturais através de renúncia fiscal?
      </label>

      <div
        class="inline-flex w-full rounded-xl border border-black/15 bg-white p-1"
      >
        {#each primaryYesNoOptions as option}
          <button
            type="button"
            class={`h-9 flex-1 rounded-lg px-3 text-[13px] font-semibold transition ${
              $formDataStore.supportsCulturalProjects === option.value
                ? "bg-[var(--primary)] text-white"
                : "bg-transparent text-black/70 hover:bg-[var(--primary)]/5"
            }`}
            aria-pressed={$formDataStore.supportsCulturalProjects ===
              option.value}
            on:click={() =>
              setYesNoField("supportsCulturalProjects", option.value)}
          >
            {option.label}
          </button>
        {/each}
      </div>

      {#if errors.supportsCulturalProjects}
        <p class="mt-1 text-[12px] text-red-600">
          {errors.supportsCulturalProjects}
        </p>
      {/if}
    </div>

    <div class="sm:col-span-4">
      <label for="" class="mb-2 block text-[12px] font-semibold text-black/70">
        Sua escola emite NFS-e pelo ambiente nacional da NF-e?
      </label>

      <div
        class="inline-flex w-full rounded-xl border border-black/15 bg-white p-1"
      >
        {#each primaryYesNoOptions as option}
          <button
            type="button"
            class={`h-9 flex-1 rounded-lg px-3 text-[13px] font-semibold transition ${
              $formDataStore.usesNationalNfseEnvironment === option.value
                ? "bg-[var(--primary)] text-white"
                : "bg-transparent text-black/70 hover:bg-[var(--primary)]/5"
            }`}
            aria-pressed={$formDataStore.usesNationalNfseEnvironment ===
              option.value}
            on:click={() =>
              setYesNoField("usesNationalNfseEnvironment", option.value)}
          >
            {option.label}
          </button>
        {/each}
      </div>

      {#if errors.usesNationalNfseEnvironment}
        <p class="mt-1 text-[12px] text-red-600">
          {errors.usesNationalNfseEnvironment}
        </p>
      {/if}
    </div>
  </div>
</div>
