<script lang="ts">
  import type {
    SchoolRegistrationFormData,
    SchoolRegistrationFormErrors,
  } from "$lib/types/celcoinSchoolRegistration";

  export let formData: SchoolRegistrationFormData;
  export let errors: SchoolRegistrationFormErrors;

  export let setField: <K extends keyof SchoolRegistrationFormData>(
    key: K,
    value: string,
    options?: { isAuto?: boolean; source?: "cnpj" | "cep" },
  ) => void;

  export let formatCpf: (value: string) => string;
  export let formatRg: (value: string) => string;
  export let formatBrPhone: (value: string) => string;
</script>

<div>
  <h2 class="text-[18px] font-semibold text-[var(--primary)]">
    Dados do responsável
  </h2>

  <div class="mt-6 grid grid-cols-1 md:grid-cols-2 gap-5">
    <div>
      <label for="managerName" class="block text-[13px] font-medium text-black/70">
        Responsável
      </label>
      <input
        id="managerName"
        class={`mt-2 w-full rounded-xl border px-4 py-3 text-[15px] outline-none ${
          errors.managerName
            ? "border-red-400"
            : "border-black/15 focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/20"
        }`}
        value={formData.managerName}
        placeholder="Ex: Maria da Silva"
        autocomplete="name"
        on:input={(e) => setField("managerName", (e.currentTarget as HTMLInputElement).value)}
      />
      {#if errors.managerName}
        <p class="mt-2 text-[12px] text-red-600">{errors.managerName}</p>
      {/if}
    </div>

    <div>
      <label for="managerCpf" class="block text-[13px] font-medium text-black/70">
        CPF
      </label>
      <input
        id="managerCpf"
        class={`mt-2 w-full rounded-xl border px-4 py-3 text-[15px] outline-none ${
          errors.managerCpf
            ? "border-red-400"
            : "border-black/15 focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/20"
        }`}
        value={formData.managerCpf}
        inputmode="numeric"
        type="tel"
        pattern="\d*"
        maxlength="14"
        autocomplete="off"
        placeholder="000.000.000-00"
        on:input={(e) => setField("managerCpf", formatCpf((e.currentTarget as HTMLInputElement).value))}
      />
      {#if errors.managerCpf}
        <p class="mt-2 text-[12px] text-red-600">{errors.managerCpf}</p>
      {/if}
    </div>

    <div>
      <label for="managerRg" class="block text-[13px] font-medium text-black/70">
        RG
      </label>
      <input
        id="managerRg"
        class={`mt-2 w-full rounded-xl border px-4 py-3 text-[15px] outline-none ${
          errors.managerRg
            ? "border-red-400"
            : "border-black/15 focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/20"
        }`}
        value={formData.managerRg}
        inputmode="numeric"
        type="tel"
        pattern="\d*"
        maxlength="14"
        autocomplete="off"
        placeholder="000000000"
        on:input={(e) => setField("managerRg", formatRg((e.currentTarget as HTMLInputElement).value))}
      />
      {#if errors.managerRg}
        <p class="mt-2 text-[12px] text-red-600">{errors.managerRg}</p>
      {/if}
    </div>

    <div>
      <label for="managerWhatsapp" class="block text-[13px] font-medium text-black/70">
        Tel WhatsApp
      </label>
      <input
        id="managerWhatsapp"
        class={`mt-2 w-full rounded-xl border px-4 py-3 text-[15px] outline-none ${
          errors.managerWhatsapp
            ? "border-red-400"
            : "border-black/15 focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/20"
        }`}
        value={formData.managerWhatsapp}
        inputmode="tel"
        type="tel"
        maxlength="15"
        autocomplete="tel"
        placeholder="(00) 00000-0000"
        on:input={(e) =>
          setField("managerWhatsapp", formatBrPhone((e.currentTarget as HTMLInputElement).value))}
      />
      {#if errors.managerWhatsapp}
        <p class="mt-2 text-[12px] text-red-600">{errors.managerWhatsapp}</p>
      {/if}
    </div>

    <div class="md:col-span-2">
      <label for="managerEmail" class="block text-[13px] font-medium text-black/70">
        E-mail
      </label>
      <input
        id="managerEmail"
        type="email"
        class={`mt-2 w-full rounded-xl border px-4 py-3 text-[15px] outline-none ${
          errors.managerEmail
            ? "border-red-400"
            : "border-black/15 focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/20"
        }`}
        value={formData.managerEmail}
        inputmode="email"
        autocomplete="email"
        placeholder="nome@exemplo.com"
        on:input={(e) => setField("managerEmail", (e.currentTarget as HTMLInputElement).value)}
      />
      {#if errors.managerEmail}
        <p class="mt-2 text-[12px] text-red-600">{errors.managerEmail}</p>
      {/if}
    </div>
  </div>

  <div class="mt-10">
    <h3 class="text-[16px] font-semibold text-[var(--primary)]">
      Dados de divulgação
    </h3>

    <div class="mt-4 grid grid-cols-1 md:grid-cols-3 gap-5">
      <div>
        <label for="marketingSite" class="block text-[13px] font-medium text-black/70">
          Site
        </label>
        <input
          id="marketingSite"
          class={`mt-2 w-full rounded-xl border px-4 py-3 text-[15px] outline-none ${
            errors.marketingSite
              ? "border-red-400"
              : "border-black/15 focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/20"
          }`}
          value={formData.marketingSite}
          placeholder="ex: escola.com.br"
          autocomplete="url"
          on:input={(e) => setField("marketingSite", (e.currentTarget as HTMLInputElement).value)}
        />
        {#if errors.marketingSite}
          <p class="mt-2 text-[12px] text-red-600">{errors.marketingSite}</p>
        {/if}
      </div>

      <div>
        <label for="marketingInstagram" class="block text-[13px] font-medium text-black/70">
          Instagram
        </label>
        <input
          id="marketingInstagram"
          class={`mt-2 w-full rounded-xl border px-4 py-3 text-[15px] outline-none ${
            errors.marketingInstagram
              ? "border-red-400"
              : "border-black/15 focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/20"
          }`}
          value={formData.marketingInstagram}
          placeholder="@suaescola ou instagram.com/suaescola"
          autocomplete="off"
          on:input={(e) => setField("marketingInstagram", (e.currentTarget as HTMLInputElement).value)}
        />
        {#if errors.marketingInstagram}
          <p class="mt-2 text-[12px] text-red-600">{errors.marketingInstagram}</p>
        {/if}
      </div>

      <div>
        <label for="marketingFacebook" class="block text-[13px] font-medium text-black/70">
          Facebook
        </label>
        <input
          id="marketingFacebook"
          class={`mt-2 w-full rounded-xl border px-4 py-3 text-[15px] outline-none ${
            errors.marketingFacebook
              ? "border-red-400"
              : "border-black/15 focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/20"
          }`}
          value={formData.marketingFacebook}
          placeholder="facebook.com/suaescola"
          autocomplete="off"
          on:input={(e) => setField("marketingFacebook", (e.currentTarget as HTMLInputElement).value)}
        />
        {#if errors.marketingFacebook}
          <p class="mt-2 text-[12px] text-red-600">{errors.marketingFacebook}</p>
        {/if}
      </div>
    </div>
  </div>
</div>
