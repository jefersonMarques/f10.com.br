<!-- src/routes/nota-fiscal/cadastro-de-escolas/steps/Step3.svelte -->
<script lang="ts">
  import { formDataStore, type FormErrors } from "../formStore";

  export let errors: FormErrors & { invoiceXmlFile?: string } = {};
  export let certificateFile: File | null = null;
  export let invoiceXmlFile: File | null = null;

  let certificateFileInput: HTMLInputElement;
  let invoiceXmlFileInput: HTMLInputElement;

  function triggerCertificateFileInput() {
    certificateFileInput.click();
  }

  function triggerInvoiceXmlFileInput() {
    invoiceXmlFileInput.click();
  }

  function onCertificateFileChange(e: Event) {
    const input = e.target as HTMLInputElement;
    certificateFile = input.files?.[0] ?? null;
  }

  function onInvoiceXmlFileChange(e: Event) {
    const input = e.target as HTMLInputElement;
    invoiceXmlFile = input.files?.[0] ?? null;
  }
</script>

<div class="space-y-6">
  <div>
    <h2 class="text-[18px] font-semibold text-black/85">
      Certificado digital e XML recente
    </h2>
    <p class="mt-1 text-[13px] text-black/60">
      Anexe o certificado digital. Se tiver um XML recente de uma nota fiscal já
      emitida diretamente no site da prefeitura ou no Portal Nacional, você também
      pode enviá-lo para facilitar a homologação. O XML é opcional. O tamanho
      máximo é de 2 MB por arquivo.
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

  <div class="rounded-2xl border border-black/10 bg-black/[0.02] p-4 sm:p-5">
    <div class="grid gap-4 sm:grid-cols-12 sm:items-end">
      <div class="sm:col-span-7">
        <label
          for="invoiceXmlFile"
          class="mb-2 block text-[12px] font-semibold text-black/70"
        >
          XML recente de uma nota fiscal emitida
          <span class="font-normal text-black/45">(opcional)</span>
        </label>
        <div class="relative">
          <input
            id="invoiceXmlFile"
            bind:this={invoiceXmlFileInput}
            type="file"
            class="hidden"
            accept=".xml,application/xml,text/xml"
            on:change={onInvoiceXmlFileChange}
          />
          <div
            class={`h-11 w-full rounded-xl border flex items-center px-3 text-[13px] font-semibold bg-white cursor-pointer ${
              errors.invoiceXmlFile ? "border-red-300" : "border-black/15"
            }`}
            on:click={triggerInvoiceXmlFileInput}
            on:keydown={(e) => e.key === "Enter" && triggerInvoiceXmlFileInput()}
            role="button"
            tabindex="0"
            aria-label="Selecionar XML recente de nota fiscal emitida"
          >
            <span class="text-black/70 flex-1 truncate">
              {invoiceXmlFile
                ? invoiceXmlFile.name
                : "Nenhum XML selecionado"}
            </span>
            {#if invoiceXmlFile}
              <span class="ml-2 text-emerald-500">✓</span>
            {/if}
            <span
              class="ml-2 rounded-lg px-4 py-1.5 text-[12px] font-semibold text-white bg-[var(--primary)]"
            >
              Selecionar
            </span>
          </div>
        </div>
        {#if errors.invoiceXmlFile}
          <p class="mt-1 text-[12px] text-red-600">{errors.invoiceXmlFile}</p>
        {/if}
      </div>

      <div class="sm:col-span-5">
        <p class="text-[12px] leading-relaxed text-black/55">
          Se enviar, use o XML original baixado diretamente da prefeitura ou do
          Portal Nacional (gov.br). Não envie PDF, DANFSe ou arquivo convertido.
        </p>
      </div>
    </div>
  </div>
</div>
