<script lang="ts">
  import LegacyServiceRequestSubmissionBridge from "$lib/components/serviceRequests/LegacyServiceRequestSubmissionBridge.svelte";
  import ServiceRequestContextSelector from "$lib/components/serviceRequests/ServiceRequestContextSelector.svelte";
  import LegacyCellCoinForm from "../../../celcoin/cadastro-de-escolas/+page.svelte";
  import type { PageData } from "./$types";

  export let data: PageData;

  let selectedGroupId: number | null = null;
  let selectedUnitId: number | null = null;
</script>

<svelte:head>
  <title>Solicitação CELL COIN | Área do Cliente F10</title>
  <meta name="robots" content="noindex,nofollow" />
</svelte:head>

<LegacyServiceRequestSubmissionBridge
  endpoint="/api/registration/submit"
  {selectedGroupId}
  {selectedUnitId}
/>

<div class="mx-auto mt-6 max-w-[1180px] px-4 sm:px-6">
  <ServiceRequestContextSelector
    groups={data.groups}
    bind:selectedGroupId
    bind:selectedUnitId
    hint="Documentos: até 10 MB por arquivo, selfie até 5 MB e 50 MB no total. Os arquivos são armazenados no bucket privado da solicitação."
  />
</div>

<div class="service-request-embedded-form">
  <LegacyCellCoinForm />
</div>

<style>
  .service-request-embedded-form :global(nav[itemtype="https://schema.org/BreadcrumbList"]) {
    display: none;
  }
</style>
