<script lang="ts">
  import { page } from "$app/stores";

  $: pathname = $page.url.pathname;
  $: showPortalNavigation = pathname.startsWith("/cliente/chamados") || pathname.startsWith("/cliente/solicitacoes");
</script>

{#if showPortalNavigation}
  <div class="application-ui border-b border-[#E4E7EE] bg-white">
    <nav class="mx-auto flex min-h-14 max-w-[1440px] items-center px-4 sm:px-6" aria-label="Área do Cliente">
      <div class="flex items-center gap-1 rounded-xl bg-[#F5F6F9] p-1">
        <a href="/cliente/chamados" class={`application-text-caption rounded-lg px-3 py-2 font-semibold transition ${pathname.startsWith("/cliente/chamados") ? "bg-[#000A57] text-white" : "text-[#606878] hover:text-[#000A57]"}`}>Chamados</a>
        <a href="/cliente/solicitacoes" class={`application-text-caption rounded-lg px-3 py-2 font-semibold transition ${pathname.startsWith("/cliente/solicitacoes") ? "bg-[#000A57] text-white" : "text-[#606878] hover:text-[#000A57]"}`}>Solicitações</a>
      </div>
    </nav>
  </div>
{/if}

<div
  class="application-ui contents"
  style="--application-content-wide: 1440px; --application-content-standard: 1440px; --application-content-narrow: 1440px;"
>
  <slot />
</div>
