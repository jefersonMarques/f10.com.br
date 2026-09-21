<script lang="ts">
  import { page } from "$app/stores";
  import CustomerPortalNavigation from "$lib/components/customerPortal/CustomerPortalNavigation.svelte";

  $: pathname = $page.url.pathname;
  $: showPortalNavigation = pathname.startsWith("/cliente/chamados") || pathname.startsWith("/cliente/solicitacoes");
</script>

{#if showPortalNavigation}
  <CustomerPortalNavigation />
{/if}

<div
  class="application-ui contents"
  style="--application-content-wide: 1440px; --application-content-standard: 1440px; --application-content-narrow: 1440px;"
>
  <slot />
</div>
