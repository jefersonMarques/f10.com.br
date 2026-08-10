<!-- src/routes/nota-fiscal/cadastro-de-escolas/steps/Step3.svelte -->
<script lang="ts">
  import { formDataStore, type FormErrors } from "../formStore";
  import { invoiceXmlFileStore } from "../xmlPrefill";

  export let errors: FormErrors = {};
  export let certificateFile: File | null = null;
  export let invoiceXmlFile: File | null = null;

  let certificateFileInput: HTMLInputElement;

  $: if ($invoiceXmlFileStore !== invoiceXmlFile) {
    invoiceXmlFile = $invoiceXmlFileStore;
  }

  function triggerCertificateFileInput() {
    certificateFileInput.click();
  }

  function onCertificateFileChange(e: Event) {
    const input = e.target as HTMLInputElement;
    certificateFile = input.files?.[0] ?? null;
  }
</script>

<div class="space-y-6">
  <div>
    <h2 class="text-[18px] font-semibold text-black/85">Certificado digital</h2>
    <p class="mt-1 text-[13px] text-black/60">
      Anexe o certificado digital e informe a senha. O tamanho máximo do arquivo
      é de 2 MB.
    </p>
  </div>

  <div class="grid gap-4 sm:grid-cols-12">
    <div class="sm:col-span-7">
      <label
        for="certificateFile"
        class="mb-2 block text-[12px] font-semibold text-black/70"
      >
        Anexar Certificado Digital
      </label>
      <div class="relative">
        <input
          id="certificateFile"
          bind:this={certificateFileInput}
          type="file"
          class="hidden"
          accept=".pfx,.p12,.p7b,.p7s,.cert"
          on:change={onCertificateFileChange}
        />
        <div
          class={`h-11 w-full rounded-xl border flex items-center px-3 text-[13px] font-semibold bg-white cursor-pointer ${
            errors.certificateFile ? "border-red-300" : "border-black/15"
          }`}
          on:click={triggerCertificateFileInput}
          on:keydown={(e) => e.key === "Enter" && triggerCertificateFileInput()}
          role="button"
          tabindex="0"
          aria-label="Selecionar arquivo de certificado digital"
        >
          <span class="text-black/70 flex-1 truncate">
            {certificateFile
              ? certificateFile.name
              : "Nenhum arquivo selecionado"}
          </span>
          {#if certificateFile}
            <span class="ml-2 text-emerald-500">✓</span>
          {/if}
          <span
            class="ml-2 rounded-lg px-4 py-1.5 text-[12px] font-semibold text-white bg-[var(--primary)]"
          >
            Selecionar
          </span>
        </div>
      </div>
      {#if errors.certificateFile}
        <p class="mt-1 text-[12px] text-red-600">{errors.certificateFile}</p>
      {/if}
    </div>

    <div class="sm:col-span-5">
      <label
        for="certificatePassword"
        class="mb-2 block text-[12px] font-semibold text-black/70"
      >
        Senha Certificado Digital
      </label>
      <input
        id="certificatePassword"
        type="password"
        class={`h-11 w-full rounded-xl border px-3 text-[13px] font-semibold outline-none ${
          errors.certificatePassword ? "border-red-300" : "border-black/15"
        }`}
        bind:value={$formDataStore.certificatePassword}
        placeholder="Senha"
      />
      {#if errors.certificatePassword}
        <p class="mt-1 text-[12px] text-red-600">
          {errors.certificatePassword}
        </p>
      {/if}
    </div>
  </div>

  {#if invoiceXmlFile}
    <div class="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-[12px] text-emerald-800">
      <div class="font-semibold">XML já recebido no início do cadastro</div>
      <div class="mt-1 truncate text-emerald-700/80">{invoiceXmlFile.name}</div>
      <div class="mt-1 text-emerald-700/70">
        Ele será enviado ao servidor e anexado ao e-mail de homologação junto com o certificado.
      </div>
    </div>
  {/if}
</div>
