<script lang="ts">
  import { page } from "$app/stores";

  $: pathname = $page.url.pathname;
  $: showPortalNavigation = pathname.startsWith("/cliente/chamados") || pathname.startsWith("/cliente/solicitacoes");
  $: returnTo = encodeURIComponent(`${$page.url.pathname}${$page.url.search}`);
</script>

{#if showPortalNavigation}
  <div class="application-ui border-b border-[#E4E7EE] bg-white">
    <nav class="mx-auto flex min-h-14 max-w-[1240px] items-center justify-between gap-3 px-4 sm:px-6" aria-label="Área do Cliente">
      <div class="flex items-center gap-1 rounded-xl bg-[#F5F6F9] p-1">
        <a href="/cliente/chamados" class={`application-text-caption rounded-lg px-3 py-2 font-semibold transition ${pathname.startsWith("/cliente/chamados") ? "bg-[#000A57] text-white" : "text-[#606878] hover:text-[#000A57]"}`}>Chamados</a>
        <a href="/cliente/solicitacoes" class={`application-text-caption rounded-lg px-3 py-2 font-semibold transition ${pathname.startsWith("/cliente/solicitacoes") ? "bg-[#000A57] text-white" : "text-[#606878] hover:text-[#000A57]"}`}>Solicitações</a>
      </div>
      <a href={`/cliente/unidade?returnTo=${returnTo}`} class="application-text-caption rounded-xl border border-[#DDE1E9] bg-white px-3 py-2 font-semibold text-[#000A57]">Trocar unidade</a>
    </nav>
  </div>
{/if}

<div class="application-ui contents">
  <slot />
</div>
