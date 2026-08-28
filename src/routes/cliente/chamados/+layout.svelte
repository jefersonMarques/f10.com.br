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
      <a href="/ajuda-f10?chat=1" class="hidden min-h-10 items-center gap-2 rounded-xl border border-[#E0E3EA] bg-white px-3 text-[11px] font-semibold text-[#5E6575] transition hover:border-[#C8CEDB] hover:text-[#000A57] sm:inline-flex">
        <MessageCircleMore size={15} />
        Assistente F10
      </a>
      <a href="/ajuda-f10" class="hidden min-h-10 items-center gap-2 rounded-xl border border-[#E0E3EA] bg-white px-3 text-[11px] font-semibold text-[#5E6575] transition hover:border-[#C8CEDB] hover:text-[#000A57] md:inline-flex">
        <CircleHelp size={15} />
        Central de ajuda
      </a>
      <a href="/cliente/chamados/novo" class="inline-flex min-h-10 items-center gap-2 rounded-xl bg-[#000A57] px-3.5 text-[11px] font-semibold text-white transition hover:bg-[#111B71]">
        <Plus size={15} />
        <span class="hidden sm:inline">Novo chamado</span>
      </a>
      <form method="POST" action="/cliente/sair">
        <button type="submit" class="inline-flex min-h-10 items-center gap-2 rounded-xl bg-[#F1F3F7] px-3 text-[11px] font-semibold text-[#5E6575] transition hover:bg-[#E9ECF2] hover:text-[#000A57]">
          <LogOut size={15} />
          <span class="hidden sm:inline">Sair</span>
        </button>
      </form>
    </svelte:fragment>
  </ApplicationHeader>
  <slot />
</div>
