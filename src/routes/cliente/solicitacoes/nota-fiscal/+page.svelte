<script lang="ts">
  import LegacyServiceRequestSubmissionBridge from "$lib/components/serviceRequests/LegacyServiceRequestSubmissionBridge.svelte";
  import ServiceRequestPortalFormShell from "$lib/components/serviceRequests/ServiceRequestPortalFormShell.svelte";
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

<ServiceRequestPortalFormShell
  requestType="nfse"
  title="Implementação de Nota Fiscal"
  description="Configure os dados fiscais e documentos necessários para implantação de NFS-e / NF-e na unidade escolhida."
  groups={data.groups}
  bind:selectedGroupId
  bind:selectedUnitId
  bind:contextInvalid
>
  <LegacyNfseForm />
</ServiceRequestPortalFormShell>
