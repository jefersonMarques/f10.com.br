<script lang="ts">
  import { page } from "$app/stores";
  import { CircleHelp, Download, LogOut, Plus, Ticket } from "lucide-svelte";

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

<header class="application-ui border-b border-white/15 bg-[#010D28] text-white">
  <div class="mx-auto flex min-h-[72px] max-w-[1440px] items-center justify-between gap-2 px-3 sm:px-6">
    <div class="flex min-w-0 items-center gap-3">
      <a href="/cliente/chamados" class="block shrink-0" aria-label="Helpdesk F10 — início">
        <img src="/branding/f10-helpdesk.webp" alt="Helpdesk F10"
          class="h-auto w-[104px] object-contain sm:w-[140px]" width="140" height="57"/>
      </a>
      <div class="hidden min-w-0 border-l border-white/15 pl-3 md:block">
        <strong class="block truncate text-[13px] font-semibold">Helpdesk F10</strong>
        {#if customer}
          <p class="mt-0.5 max-w-[260px] truncate text-[11px] text-white/65">
            {customer.name} · {customer.groupName || customer.email}
          </p>
        {/if}
      </div>
    </div>

    <nav class="flex shrink-0 items-center gap-0.5 sm:gap-1.5" aria-label="Navegação do Helpdesk">
      <a href="/cliente/chamados"
        aria-current={pathname.startsWith("/cliente/chamados") ? "page" : undefined}
        aria-label="Chamados" title="Chamados"
        class={`inline-flex h-10 items-center justify-center gap-1.5 rounded-lg px-2 text-[12px] font-semibold transition sm:px-3 ${pathname.startsWith("/cliente/chamados") ? "bg-white/15 text-white" : "text-white/80 hover:bg-white/10 hover:text-white"}`}>
        <Ticket size={17}/><span class="hidden sm:inline">Chamados</span>
      </a>
      <a href="/ajuda-f10" aria-label="Central de ajuda" title="Central de ajuda"
        class="inline-flex h-10 items-center justify-center gap-1.5 rounded-lg px-2 text-[12px] font-semibold text-white/80 transition hover:bg-white/10 hover:text-white sm:px-3">
        <CircleHelp size={17}/><span class="hidden lg:inline">Ajuda</span>
      </a>
      <a href="/download" aria-label="Download do F10" title="Download do F10"
        class="inline-flex h-10 items-center justify-center gap-1.5 rounded-lg px-2 text-[12px] font-semibold text-white/80 transition hover:bg-white/10 hover:text-white sm:px-3">
        <Download size={17}/><span class="hidden lg:inline">Download do F10</span>
      </a>
      {#if canCreateTicket}
        <a href="/cliente/chamados/novo"
          class="inline-flex h-10 items-center justify-center gap-1 rounded-lg bg-[#EA6D0B] px-2.5 text-[12px] font-semibold text-white transition hover:bg-[#D96208] sm:px-3"
          aria-label="Novo chamado" title="Novo chamado">
          <Plus size={17}/><span class="hidden lg:inline">Novo chamado</span>
        </a>
      {/if}
      <form method="POST" action="/cliente/sair">
        <button type="submit"
          class="flex h-10 w-9 items-center justify-center rounded-lg text-white/75 transition hover:bg-white/10 hover:text-white"
          aria-label="Sair" title="Sair"><LogOut size={17}/></button>
      </form>
    </nav>
  </div>
</header>
