<!-- src/routes/nota-fiscal/cadastro-de-escolas/steps/Step3.svelte -->
<script lang="ts">
  import { formDataStore, type FormErrors } from "../formStore";

  export let errors: FormErrors = {};
  export let certificateFile: File | null = null;

  let fileInput: HTMLInputElement;

  function triggerFileInput() {
    fileInput.click();
  }

  function onFileChange(e: Event) {
    const input = e.target as HTMLInputElement;
    certificateFile = input.files?.[0] ?? null;
  }
</script>

<div class="space-y-6">
  <div>
    <h2 class="text-[18px] font-semibold text-black/85">Certificado digital</h2>
    <p class="mt-1 text-[13px] text-black/60">
      Anexar Certificado Digital. Faça upload de 1 arquivo aceito. O tamanho
      máximo é de 2 MB.
    </p>
  </div>

  <div class="grid gap-4 sm:grid-cols-12">
    <div class="sm:col-span-7">
      <label for="" class="text-[12px] font-semibold text-black/70 block mb-2"
        >Anexar Certificado Digital</label
      >
      <div class="relative">
        <input
          bind:this={fileInput}
          type="file"
          class="hidden"
          accept=".pfx,.p12,.p7b,.p7s"
          on:change={onFileChange}
        />
        <div
          class={`h-11 w-full rounded-xl border flex items-center px-3 text-[13px] font-semibold bg-white cursor-pointer ${
            errors.certificateFile ? "border-red-300" : "border-black/15"
          }`}
          on:click={triggerFileInput}
          on:keydown={(e) => e.key === "Enter" && triggerFileInput()}
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
          <button
            type="button"
            class="ml-2 rounded-lg px-4 py-1.5 text-[12px] font-semibold text-white bg-[var(--primary)] hover:brightness-110 transition"
          >
            Selecionar
          </button>
        </div>
      </div>
      {#if errors.certificateFile}
        <p class="mt-1 text-[12px] text-red-600">{errors.certificateFile}</p>
      {/if}
    </div>

    <div class="sm:col-span-5">
      <label for="" class="text-[12px] font-semibold text-black/70 block mb-2"
        >Senha Certificado Digital</label
      >
      <input
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
</div>
