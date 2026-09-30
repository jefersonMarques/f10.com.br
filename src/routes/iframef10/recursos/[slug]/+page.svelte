<script lang="ts">
  import { page } from "$app/stores";
  import AmbienteVirtualPage from "../../../solucoes/ambiente-virtual-de-aprendizado-ava/+page.svelte";
  import SmartAlunoPage from "../../../solucoes/aplicativo-smart-aluno/+page.svelte";
  import CrmEscolarPage from "../../../solucoes/crm-escolar/+page.svelte";
  import FinanceiroPage from "../../../solucoes/financeiro/+page.svelte";
  import IndicadoresPage from "../../../solucoes/indicadores-e-bi/+page.svelte";
  import MarketingPage from "../../../solucoes/marketing-captacao-de-alunos/+page.svelte";
  import NotaFiscalPage from "../../../solucoes/nota-fiscal/+page.svelte";
  import PedagogicoPage from "../../../solucoes/pedagogico/+page.svelte";
  import VendasPage from "../../../solucoes/vendas/+page.svelte";
  import WhatsappPage from "../../../solucoes/whatsapp/+page.svelte";

  const pages = {
    "ambiente-virtual-de-aprendizado-ava": AmbienteVirtualPage,
    "aplicativo-smart-aluno": SmartAlunoPage,
    "crm-escolar": CrmEscolarPage,
    financeiro: FinanceiroPage,
    "indicadores-e-bi": IndicadoresPage,
    "marketing-captacao-de-alunos": MarketingPage,
    "nota-fiscal": NotaFiscalPage,
    pedagogico: PedagogicoPage,
    vendas: VendasPage,
    whatsapp: WhatsappPage,
  } as const;

  $: slug = $page.params.slug ?? "";
  $: ResourcePage = pages[slug as keyof typeof pages] ?? null;
</script>

<svelte:head><title>Recursos F10</title></svelte:head>

{#if ResourcePage}
  <div class="iframef10-resource-detail overflow-x-hidden">
    <svelte:component this={ResourcePage}/>
  </div>
{:else}
  <div class="flex min-h-[calc(100dvh-62px)] items-center justify-center px-5 py-10">
    <div class="w-full max-w-[420px] rounded-[22px] border border-[#E2E5ED] bg-white p-6 text-center">
      <h1 class="text-[16px] font-semibold text-[#202637]">Recurso não encontrado</h1>
      <a href="/iframef10/recursos" class="mt-4 inline-flex h-10 items-center rounded-xl bg-[#000A57] px-4 text-[11px] font-semibold text-white">Voltar aos recursos</a>
    </div>
  </div>
{/if}

<style>
  :global(.iframef10-resource-detail nav[aria-label="Breadcrumb"]) {
    display: none;
  }
</style>
