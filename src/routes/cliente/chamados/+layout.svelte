<script lang="ts">
  import { page } from "$app/stores";
  import { BookOpen, Building2, LogOut } from "lucide-svelte";
  import ApplicationHeader from "$lib/components/application/ApplicationHeader.svelte";
  import { resolveCustomerRouteMetadata } from "$lib/application/routeMetadata";
  import type { LayoutData } from "./$types";

  export let data: LayoutData;

  $: routeMetadata = resolveCustomerRouteMetadata($page.url.pathname);
  $: customerContext = data.customer.unitName
    ? `${data.customer.name} · ${data.customer.groupName ?? "Grupo"} · ${data.customer.unitName}`
    : `${data.customer.name} · ${data.customer.email}`;
</script>

<div class="min-h-screen bg-[#F7F8FB] text-[#10172A]">
  <ApplicationHeader
    title={routeMetadata.title}
    section={routeMetadata.section}
    description={customerContext}
  >
    <svelte:fragment slot="actions">
      <a href="/cliente/unidade?returnTo=/cliente/chamados" class="hidden min-h-10 items-center gap-2 rounded-xl border border-[#E0E3EA] px-3 text-[11px] font-semibold text-[#5E6575] hover:text-[#000A57] sm:inline-flex"><Building2 size={15} />Trocar unidade</a>
      <a href="/ajuda-f10" class="hidden min-h-10 items-center gap-2 rounded-xl border border-[#E0E3EA] px-3 text-[11px] font-semibold text-[#5E6575] hover:text-[#000A57] sm:inline-flex"><BookOpen size={15} />Ajuda</a>
      <form method="POST" action="/cliente/sair">
        <button type="submit" class="inline-flex min-h-10 items-center gap-2 rounded-xl bg-[#F1F3F7] px-3 text-[11px] font-semibold text-[#5E6575] hover:text-[#000A57]"><LogOut size={15} /><span class="hidden sm:inline">Sair</span></button>
      </form>
    </svelte:fragment>
  </ApplicationHeader>
  <slot />
</div>
