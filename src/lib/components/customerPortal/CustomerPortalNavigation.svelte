<script lang="ts">
  import { page } from "$app/stores";
  import { CircleHelp, LogOut, Plus } from "lucide-svelte";

  $: pathname = $page.url.pathname;
  $: customer = ($page.data as {
    customer?: {
      name: string;
      email: string;
      groupName: string | null;
      authProvider: "f10" | "portal";
    };
  }).customer;
  $: canCreateTicket = pathname.startsWith("/cliente/solicitacoes")
    || (pathname.startsWith("/cliente/chamados") && customer?.authProvider === "f10");
</script>

<header class="application-ui border-b border-[#E4E7EE] bg-white">
  <div class="mx-auto flex min-h-16 max-w-[1440px] items-center justify-between gap-3 px-4 sm:px-6">
    <div class="min-w-0">
      <a href="/cliente/chamados" class="block truncate text-[14px] font-semibold text-[#010D28]">Área do Cliente F10</a>
      {#if customer}
        <p class="mt-0.5 hidden truncate text-[11px] text-[#747B8A] sm:block">
          {customer.name} · {customer.groupName || customer.email}
        </p>
      {/if}
    </div>

    <nav class="flex shrink-0 items-center gap-1 sm:gap-2" aria-label="Área do Cliente">
      <a href="/cliente/chamados" aria-current={pathname.startsWith("/cliente/chamados") ? "page" : undefined} class={`rounded-lg px-2.5 py-2 text-[12px] font-semibold transition sm:px-3 ${pathname.startsWith("/cliente/chamados") ? "bg-[#000A57] text-white" : "text-[#606878] hover:bg-[#F5F6F9] hover:text-[#000A57]"}`}>Chamados</a>
      <a href="/ajuda-f10" class="flex h-9 w-9 items-center justify-center rounded-lg text-[#606878] transition hover:bg-[#F5F6F9] hover:text-[#000A57]" aria-label="Central de ajuda" title="Central de ajuda"><CircleHelp size={18}/></a>
      {#if canCreateTicket}
        <a href="/cliente/chamados/novo" class="flex h-9 items-center justify-center gap-1.5 rounded-lg bg-[#000A57] px-2.5 text-[12px] font-semibold text-white transition hover:bg-[#141F77] sm:px-3" aria-label="Novo chamado" title="Novo chamado"><Plus size={17}/><span class="hidden lg:inline">Novo chamado</span></a>
      {/if}
      <form method="POST" action="/cliente/sair">
        <button type="submit" class="flex h-9 w-9 items-center justify-center rounded-lg text-[#747B8A] transition hover:bg-[#F5F6F9] hover:text-[#000A57]" aria-label="Sair" title="Sair"><LogOut size={17}/></button>
      </form>
    </nav>
  </div>
</header>
