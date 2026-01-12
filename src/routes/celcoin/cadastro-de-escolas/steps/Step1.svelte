<script lang="ts">
  import type {
    SchoolRegistrationFormData,
    SchoolRegistrationFormErrors,
  } from "$lib/types/celcoinSchoolRegistration";

  export let formData: SchoolRegistrationFormData;
  export let errors: SchoolRegistrationFormErrors;

  export let isCnpjLoading: boolean;
  export let isCepLoading: boolean;
  export let cnaeMainDescription: string;

  export let setField: <K extends keyof SchoolRegistrationFormData>(
    key: K,
    value: string,
    options?: { isAuto?: boolean; source?: "cnpj" | "cep" },
  ) => void;

  export let scheduleCnpjLookup: () => void;
  export let lookupCnpjSilently: (cnpjDigits: string) => Promise<void>;

  export let scheduleCepLookup: () => void;
  export let lookupCepSilently: (cepDigits: string) => Promise<void>;

  export let onlyDigits: (value: string) => string;
  export let isCnpjValid: (value: string) => boolean;

  export let formatCnpj: (value: string) => string;
  export let formatCnae: (value: string) => string;
  export let formatBrPhone: (value: string) => string;
  export let formatCep: (value: string) => string;
  export let formatAddressNumber: (value: string) => string;
</script>

<div>
  <h2 class="text-[18px] font-semibold text-[var(--primary)]">
    Dados da unidade
  </h2>

  <div class="mt-6 space-y-5">
    <div>
      <label for="cnpj" class="block text-[13px] font-medium text-black/70">
        CNPJ
      </label>

      <div class="mt-2 relative">
        <input
          id="cnpj"
          class={`w-full rounded-xl border px-4 py-3 text-[15px] outline-none ${
            errors.cnpj
              ? "border-red-400"
              : "border-black/15 focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/20"
          }`}
          value={formData.cnpj}
          inputmode="numeric"
          type="tel"
          pattern="\d*"
          maxlength="18"
          autocomplete="off"
          placeholder="00.000.000/0000-00"
          on:input={(e) => {
            const masked = formatCnpj((e.currentTarget as HTMLInputElement).value);
            setField("cnpj", masked);
            scheduleCnpjLookup();
          }}
          on:blur={() => {
            const digits = onlyDigits(formData.cnpj);
            if (digits.length === 14 && isCnpjValid(digits)) void lookupCnpjSilently(digits);
          }}
        />

        {#if isCnpjLoading}
          <div class="absolute right-3 top-1/2 -translate-y-1/2">
            <span class="inline-block h-4 w-4 rounded-full border-2 border-black/10 border-t-[var(--primary)] animate-spin"></span>
          </div>
        {/if}
      </div>

      {#if errors.cnpj}
        <p class="mt-2 text-[12px] text-red-600">{errors.cnpj}</p>
      {/if}
    </div>

    <div class="grid grid-cols-1 md:grid-cols-2 gap-5">
      <div>
        <label for="unitLegalName" class="block text-[13px] font-medium text-black/70">
          Razão Social
        </label>
        <input
          id="unitLegalName"
          class={`mt-2 w-full rounded-xl border px-4 py-3 text-[15px] outline-none ${
            errors.unitLegalName
              ? "border-red-400"
              : "border-black/15 focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/20"
          }`}
          value={formData.unitLegalName}
          placeholder="Ex: Escola Exemplo LTDA"
          autocomplete="organization"
          on:input={(e) => setField("unitLegalName", (e.currentTarget as HTMLInputElement).value)}
        />
        {#if errors.unitLegalName}
          <p class="mt-2 text-[12px] text-red-600">{errors.unitLegalName}</p>
        {/if}
      </div>

      <div>
        <label for="unitFantasyName" class="block text-[13px] font-medium text-black/70">
          Nome Fantasia
        </label>
        <input
          id="unitFantasyName"
          class={`mt-2 w-full rounded-xl border px-4 py-3 text-[15px] outline-none ${
            errors.unitFantasyName
              ? "border-red-400"
              : "border-black/15 focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/20"
          }`}
          value={formData.unitFantasyName}
          placeholder="Ex: Escola Exemplo"
          autocomplete="organization"
          on:input={(e) => setField("unitFantasyName", (e.currentTarget as HTMLInputElement).value)}
        />
        {#if errors.unitFantasyName}
          <p class="mt-2 text-[12px] text-red-600">{errors.unitFantasyName}</p>
        {/if}
      </div>
    </div>

    <div class="grid grid-cols-1 md:grid-cols-2 gap-5">
      <div>
        <label for="cnaeMain" class="block text-[13px] font-medium text-black/70">
          CNAE principal
        </label>
        <input
          id="cnaeMain"
          class={`mt-2 w-full rounded-xl border px-4 py-3 text-[15px] outline-none ${
            errors.cnaeMain
              ? "border-red-400"
              : "border-black/15 focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/20"
          }`}
          value={formData.cnaeMain}
          inputmode="numeric"
          type="tel"
          pattern="\d*"
          maxlength="7"
          autocomplete="off"
          placeholder="0000000"
          on:input={(e) => {
            const v = formatCnae((e.currentTarget as HTMLInputElement).value);
            setField("cnaeMain", v);
          }}
        />
        {#if cnaeMainDescription}
          <p class="mt-2 text-[12px] text-black/55">{cnaeMainDescription}</p>
        {/if}
        {#if errors.cnaeMain}
          <p class="mt-2 text-[12px] text-red-600">{errors.cnaeMain}</p>
        {/if}
      </div>

      <div>
        <label for="unitPhone" class="block text-[13px] font-medium text-black/70">
          Telefone Comercial
        </label>
        <input
          id="unitPhone"
          class={`mt-2 w-full rounded-xl border px-4 py-3 text-[15px] outline-none ${
            errors.unitPhone
              ? "border-red-400"
              : "border-black/15 focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/20"
          }`}
          value={formData.unitPhone}
          inputmode="tel"
          type="tel"
          maxlength="15"
          autocomplete="tel"
          placeholder="(00) 00000-0000"
          on:input={(e) =>
            setField("unitPhone", formatBrPhone((e.currentTarget as HTMLInputElement).value))}
        />
        {#if errors.unitPhone}
          <p class="mt-2 text-[12px] text-red-600">{errors.unitPhone}</p>
        {/if}
      </div>
    </div>

    <div class="rounded-2xl bg-[var(--page-bg)] border border-black/5 p-4">
      <div class="grid grid-cols-1 md:grid-cols-[1fr_auto] gap-3 items-end">
        <div>
          <label for="cep" class="block text-[13px] font-medium text-black/70">
            CEP
          </label>
          <div class="mt-2 relative">
            <input
              id="cep"
              class={`w-full rounded-xl border px-4 py-3 text-[15px] outline-none ${
                errors.cep
                  ? "border-red-400"
                  : "border-black/15 focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/20"
              }`}
              value={formData.cep}
              inputmode="numeric"
              type="tel"
              pattern="\d*"
              maxlength="9"
              autocomplete="postal-code"
              placeholder="00000-000"
              on:input={(e) => {
                setField("cep", formatCep((e.currentTarget as HTMLInputElement).value));
                scheduleCepLookup();
              }}
              on:blur={() => {
                const d = onlyDigits(formData.cep);
                if (d.length === 8) void lookupCepSilently(d);
              }}
            />

            {#if isCepLoading}
              <div class="absolute right-3 top-1/2 -translate-y-1/2">
                <span class="inline-block h-4 w-4 rounded-full border-2 border-black/10 border-t-[var(--primary)] animate-spin"></span>
              </div>
            {/if}
          </div>
          {#if errors.cep}
            <p class="mt-2 text-[12px] text-red-600">{errors.cep}</p>
          {/if}
        </div>

        <div class="hidden md:block text-[12px] text-black/0">.</div>
      </div>

      <div class="mt-4 grid grid-cols-1 md:grid-cols-2 gap-5">
        <div>
          <label for="street" class="block text-[13px] font-medium text-black/70">
            Logradouro
          </label>
          <input
            id="street"
            class={`mt-2 w-full rounded-xl border px-4 py-3 text-[15px] outline-none ${
              errors.street
                ? "border-red-400"
                : "border-black/15 focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/20"
            }`}
            value={formData.street}
            placeholder="Ex: Rua das Flores"
            autocomplete="street-address"
            on:input={(e) => setField("street", (e.currentTarget as HTMLInputElement).value)}
          />
          {#if errors.street}
            <p class="mt-2 text-[12px] text-red-600">{errors.street}</p>
          {/if}
        </div>

        <div class="grid grid-cols-2 gap-5">
          <div>
            <label for="number" class="block text-[13px] font-medium text-black/70">
              Número
            </label>
            <input
              id="number"
              class={`mt-2 w-full rounded-xl border px-4 py-3 text-[15px] outline-none ${
                errors.number
                  ? "border-red-400"
                  : "border-black/15 focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/20"
              }`}
              value={formData.number}
              inputmode="numeric"
              type="tel"
              pattern="\d*"
              maxlength="10"
              autocomplete="off"
              placeholder="123"
              on:input={(e) =>
                setField("number", formatAddressNumber((e.currentTarget as HTMLInputElement).value))}
            />
            {#if errors.number}
              <p class="mt-2 text-[12px] text-red-600">{errors.number}</p>
            {/if}
          </div>

          <div>
            <label for="state" class="block text-[13px] font-medium text-black/70">
              UF
            </label>
            <input
              id="state"
              class={`mt-2 w-full rounded-xl border px-4 py-3 text-[15px] outline-none uppercase ${
                errors.state
                  ? "border-red-400"
                  : "border-black/15 focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/20"
              }`}
              value={formData.state}
              maxlength="2"
              autocomplete="address-level1"
              placeholder="PR"
              on:input={(e) =>
                setField(
                  "state",
                  (e.currentTarget as HTMLInputElement).value.toUpperCase().slice(0, 2),
                )}
            />
            {#if errors.state}
              <p class="mt-2 text-[12px] text-red-600">{errors.state}</p>
            {/if}
          </div>
        </div>
      </div>

      <div class="mt-4 grid grid-cols-1 md:grid-cols-2 gap-5">
        <div>
          <label for="neighborhood" class="block text-[13px] font-medium text-black/70">
            Bairro
          </label>
          <input
            id="neighborhood"
            class={`mt-2 w-full rounded-xl border px-4 py-3 text-[15px] outline-none ${
              errors.neighborhood
                ? "border-red-400"
                : "border-black/15 focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/20"
            }`}
            value={formData.neighborhood}
            placeholder="Ex: Centro"
            autocomplete="address-level3"
            on:input={(e) => setField("neighborhood", (e.currentTarget as HTMLInputElement).value)}
          />
          {#if errors.neighborhood}
            <p class="mt-2 text-[12px] text-red-600">{errors.neighborhood}</p>
          {/if}
        </div>

        <div>
          <label for="city" class="block text-[13px] font-medium text-black/70">
            Cidade
          </label>
          <input
            id="city"
            class={`mt-2 w-full rounded-xl border px-4 py-3 text-[15px] outline-none ${
              errors.city
                ? "border-red-400"
                : "border-black/15 focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/20"
            }`}
            value={formData.city}
            placeholder="Ex: Curitiba"
            autocomplete="address-level2"
            on:input={(e) => setField("city", (e.currentTarget as HTMLInputElement).value)}
          />
          {#if errors.city}
            <p class="mt-2 text-[12px] text-red-600">{errors.city}</p>
          {/if}
        </div>
      </div>

      <div class="mt-4">
        <label for="complement" class="block text-[13px] font-medium text-black/70">
          Complemento
        </label>
        <input
          id="complement"
          class="mt-2 w-full rounded-xl border border-black/15 px-4 py-3 text-[15px] outline-none focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/20"
          value={formData.complement}
          placeholder="Ex: Apto 12, Bloco B (opcional)"
          autocomplete="address-line2"
          on:input={(e) => setField("complement", (e.currentTarget as HTMLInputElement).value)}
        />
      </div>
    </div>
  </div>
</div>
