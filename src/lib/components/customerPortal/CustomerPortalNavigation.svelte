<script lang="ts">
  import { page } from "$app/stores";
  import { LogOut } from "lucide-svelte";

  $: pathname = $page.url.pathname;
</script>

<header class="application-ui border-b border-[#E4E7EE] bg-white">
  <div class="mx-auto flex min-h-14 max-w-[1440px] items-center justify-between gap-3 px-4 sm:px-6">
    <a href="/cliente/chamados" class="text-[13px] font-semibold text-[#010D28]">Área do Cliente F10</a>

    <nav class="flex items-center gap-1" aria-label="Área do Cliente">
      <a href="/cliente/chamados" class={`rounded-lg px-3 py-2 text-[11px] font-semibold transition ${pathname.startsWith("/cliente/chamados") ? "bg-[#000A57] text-white" : "text-[#606878] hover:bg-[#F5F6F9] hover:text-[#000A57]"}`}>Chamados</a>
      <a href="/cliente/solicitacoes" class={`rounded-lg px-3 py-2 text-[11px] font-semibold transition ${pathname.startsWith("/cliente/solicitacoes") ? "bg-[#000A57] text-white" : "text-[#606878] hover:bg-[#F5F6F9] hover:text-[#000A57]"}`}>Solicitações</a>
      <form method="POST" action="/cliente/sair" class="ml-1">
        <button type="submit" class="flex h-9 w-9 items-center justify-center rounded-lg text-[#747B8A] transition hover:bg-[#F5F6F9] hover:text-[#000A57]" aria-label="Sair" title="Sair"><LogOut size={15}/></button>
      </form>
    </nav>
  </div>
</header>
