<script lang="ts">
  import { page } from "$app/stores";
  import { CircleHelp, LogOut, MessageCircleMore, Plus } from "lucide-svelte";
  import ApplicationHeader from "$lib/components/application/ApplicationHeader.svelte";
  import SupportChatDialog from "$lib/components/onboarding/SupportChatDialog.svelte";
  import { resolveCustomerRouteMetadata } from "$lib/application/routeMetadata";
  import type { LayoutData } from "./$types";

  export let data: LayoutData;

  let chatOpen = false;

  $: routeMetadata = resolveCustomerRouteMetadata($page.url.pathname);
  $: customerContext = data.customer.groupName
    ? `${data.customer.name} · ${data.customer.groupName}`
    : `${data.customer.name} · ${data.customer.email}`;
  $: customerSupport = {
    authenticated: true,
    name: data.customer.name,
    email: data.customer.email,
    groupName: data.customer.groupName,
    unitName: data.customer.unitName,
    requiresUnitSelection: data.customer.unitId === null,
    groups: data.customer.groups.map((group) => ({
      id: group.grupo_id,
      name: group.grupo,
      units: group.unidades.map((unit) => ({
        id: unit.unidade_id,
        name: unit.unidade,
      })),
    })),
  };
</script>

<div class="min-h-screen bg-[#F7F8FB] text-[#10172A]">
  <ApplicationHeader
    title={routeMetadata.title}
    section={routeMetadata.section}
    description={customerContext}
  >
    <svelte:fragment slot="actions">
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

  {#if !chatOpen}
    <button
      type="button"
      class="fixed bottom-5 right-5 z-[10010] inline-flex min-h-14 items-center gap-2.5 rounded-full bg-[#EA6D0B] px-4.5 text-[12px] font-semibold text-white shadow-[0_14px_36px_rgba(1,13,40,0.22)] transition hover:-translate-y-0.5 hover:bg-[#D96208] hover:shadow-[0_18px_42px_rgba(1,13,40,0.28)] sm:bottom-6 sm:right-6"
      aria-label="Abrir Assistente F10"
      on:click={() => (chatOpen = true)}
    >
      <span class="inline-flex h-8 w-8 items-center justify-center rounded-full bg-white/15">
        <MessageCircleMore size={17} aria-hidden="true" />
      </span>
      <span>Assistente F10</span>
    </button>
  {/if}
</div>

<SupportChatDialog
  isOpen={chatOpen}
  onClose={() => (chatOpen = false)}
  customerSupport={customerSupport}
/>
