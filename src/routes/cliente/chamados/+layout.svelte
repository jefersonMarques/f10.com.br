<script lang="ts">
  import { page } from "$app/stores";
  import { CircleHelp, LogOut, MessageCircleMore, Plus } from "lucide-svelte";
  import ApplicationHeader from "$lib/components/application/ApplicationHeader.svelte";
  import { resolveCustomerRouteMetadata } from "$lib/application/routeMetadata";
  import type { LayoutData } from "./$types";

  export let data: LayoutData;

  $: routeMetadata = resolveCustomerRouteMetadata($page.url.pathname);
  $: customerContext = data.customer.groupName
    ? `${data.customer.name} · ${data.customer.groupName}`
    : `${data.customer.name} · ${data.customer.email}`;
</script>

<div class="min-h-screen bg-[#F7F8FB] text-[#10172A]">
  <ApplicationHeader
    title={routeMetadata.title}
    section={routeMetadata.section}
    description={customerContext}
  >
    <svelte:fragment slot="actions">
      <a href="/ajuda-f10?chat=1" aria-label="Assistente F10" class="inline-flex min-h-10 min-w-10 items-center justify-center gap-2 rounded-xl border border-[#E0E3EA] bg-white px-2.5 text-[11px] font-semibold text-[#5E6575] transition hover:border-[#C8CEDB] hover:text-[#000A57] lg:px-3">
        <MessageCircleMore size={15} />
        <span class="hidden lg:inline">Assistente F10</span>
      </a>
      <a href="/ajuda-f10" aria-label="Central de ajuda" class="inline-flex min-h-10 min-w-10 items-center justify-center gap-2 rounded-xl border border-[#E0E3EA] bg-white px-2.5 text-[11px] font-semibold text-[#5E6575] transition hover:border-[#C8CEDB] hover:text-[#000A57] lg:px-3">
        <CircleHelp size={15} />
        <span class="hidden xl:inline">Central de ajuda</span>
      </a>
      <a href="/cliente/chamados/novo" aria-label="Novo chamado" class="inline-flex min-h-10 min-w-10 items-center justify-center gap-2 rounded-xl bg-[#000A57] px-2.5 text-[11px] font-semibold text-white transition hover:bg-[#111B71] sm:px-3.5">
        <Plus size={15} />
        <span class="hidden sm:inline">Novo chamado</span>
      </a>
      <form method="POST" action="/cliente/sair">
        <button type="submit" aria-label="Sair" class="inline-flex min-h-10 min-w-10 items-center justify-center gap-2 rounded-xl bg-[#F1F3F7] px-2.5 text-[11px] font-semibold text-[#5E6575] transition hover:bg-[#E9ECF2] hover:text-[#000A57] sm:px-3">
          <LogOut size={15} />
          <span class="hidden sm:inline">Sair</span>
        </button>
      </form>
    </svelte:fragment>
  </ApplicationHeader>
  <slot />
</div>
