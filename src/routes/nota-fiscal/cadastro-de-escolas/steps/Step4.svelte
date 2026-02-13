<!-- src/routes/nota-fiscal/cadastro-de-escolas/steps/Step4.svelte -->
<script lang="ts">
  import { FileText } from "lucide-svelte";
  import { formDataStore, type FormErrors } from "../formStore";
  import { getF10TermsText } from "$lib/legal/f10TermsNf";

  export let errors: FormErrors = {};

  const fullAddress = [
    $formDataStore.street,
    $formDataStore.number,
    $formDataStore.complement,
  ]
    .filter(Boolean)
    .join(", ")
    .trim();

  const terms = getF10TermsText({
    clientLegalName: $formDataStore.legalName,
    clientCnpj: $formDataStore.cnpj,
    clientAddress: fullAddress,
    clientNeighborhood: $formDataStore.neighborhood,
    clientCity: $formDataStore.city,
    clientState: $formDataStore.state,
  });
</script>

<div class="space-y-6">
  <section class="rounded-2xl border border-black/10 bg-white/70 p-5 sm:p-6 space-y-4">
    <div class="space-y-1">
      <h2 class="text-[18px] font-semibold text-black/85 flex items-center gap-2">
        <FileText size={18} class="text-black/70" />
        Contrato
      </h2>
      <p class="text-[13px] text-black/60 max-w-[90ch]">
        Leia o contrato abaixo e marque o aceite para liberar o botão “Próximo”.
      </p>
    </div>

    <!-- Frame rolável (sem modal) -->
    <div class="rounded-2xl border border-black/10 bg-white overflow-hidden">
      <div class="max-h-[520px] overflow-auto px-5 sm:px-6 py-5">
        <div class="prose prose-sm max-w-none">
          {@html terms.text}
        </div>
      </div>

      <!-- Aceite -->
      <div class="border-t border-black/10 px-5 sm:px-6 py-4 space-y-2 bg-white">
        <div class="flex items-start gap-3">
          <input
            type="checkbox"
            id="acceptedTerms"
            bind:checked={$formDataStore.acceptedTerms}
            class="mt-1 rounded border-black/15"
          />
          <label for="acceptedTerms" class="text-[13px] text-black/80 leading-snug">
            Li e aceito os termos do contrato.
          </label>
        </div>

        {#if errors.acceptedTerms}
          <p class="text-[12px] text-red-600">{errors.acceptedTerms}</p>
        {/if}
      </div>
    </div>
  </section>
</div>