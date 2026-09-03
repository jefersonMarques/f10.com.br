<script lang="ts">
  import LegacyServiceRequestSubmissionBridge from "$lib/components/serviceRequests/LegacyServiceRequestSubmissionBridge.svelte";
  import ServiceRequestContextSelector from "$lib/components/serviceRequests/ServiceRequestContextSelector.svelte";
  import LegacyNfseForm from "../../../nota-fiscal/cadastro-de-escolas/+page.svelte";
  import type { PageData } from "./$types";

  export let data: PageData;

  let selectedGroupId: number | null = null;
  let selectedUnitId: number | null = null;
  let contextInvalid = false;
</script>

<svelte:head>
  <title>Solicitação de Nota Fiscal | Área do Cliente F10</title>
  <meta name="robots" content="noindex,nofollow" />
</svelte:head>

<LegacyServiceRequestSubmissionBridge
  endpoint="/api/nfse/nfse-homologacao/submit"
  {selectedGroupId}
  {selectedUnitId}
  on:contextrequired={() => contextInvalid = true}
/>

<div class="mx-auto mt-6 max-w-[1180px] px-4 sm:px-6">
  <ServiceRequestContextSelector
    groups={data.groups}
    bind:selectedGroupId
    bind:selectedUnitId
    bind:invalid={contextInvalid}
    hint="Certificado digital e XML: até 5 MB por arquivo. Os arquivos são armazenados no bucket privado da solicitação."
  />
</div>

<div class="service-request-embedded-form">
  <LegacyNfseForm />
</div>

<style>
  .service-request-embedded-form :global(nav[itemtype="https://schema.org/BreadcrumbList"]) {
    display: none;
  }
</style>
