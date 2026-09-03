<script lang="ts">
  import LegacyServiceRequestSubmissionBridge from "$lib/components/serviceRequests/LegacyServiceRequestSubmissionBridge.svelte";
  import ServiceRequestPortalFormShell from "$lib/components/serviceRequests/ServiceRequestPortalFormShell.svelte";
  import LegacyCellCoinForm from "../../../celcoin/cadastro-de-escolas/+page.svelte";
  import type { PageData } from "./$types";

  export let data: PageData;

  let selectedGroupId: number | null = null;
  let selectedUnitId: number | null = null;
  let contextInvalid = false;
</script>

<svelte:head>
  <title>Solicitação CELL COIN | Área do Cliente F10</title>
  <meta name="robots" content="noindex,nofollow" />
</svelte:head>

<LegacyServiceRequestSubmissionBridge
  endpoint="/api/registration/submit"
  {selectedGroupId}
  {selectedUnitId}
  on:contextrequired={() => contextInvalid = true}
/>

<ServiceRequestPortalFormShell
  requestType="cell-coin"
  title="Implementação CELL COIN"
  description="Informe os dados cadastrais, documentos e aceite necessários para ativar o serviço na unidade escolhida."
  groups={data.groups}
  bind:selectedGroupId
  bind:selectedUnitId
  bind:contextInvalid
>
  <LegacyCellCoinForm />
</ServiceRequestPortalFormShell>
