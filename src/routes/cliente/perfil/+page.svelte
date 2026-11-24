<script lang="ts">
  import { UserRound } from "lucide-svelte";
  import CustomerProfileForm from "$lib/components/customerPortal/CustomerProfileForm.svelte";
  import type { PageData } from "./$types";
  export let data: PageData;
</script>

<svelte:head><title>Meu perfil | Helpdesk F10</title></svelte:head>
<main class="mx-auto max-w-[520px] px-4 py-10">
  <section class="rounded-2xl border border-[#E2E5ED] bg-white p-6 shadow-sm">
    <div class="mb-5 flex items-center gap-3">
      <span class="flex h-12 w-12 items-center justify-center rounded-xl bg-[#EEF0FF] text-[#000A57]"><UserRound size={24}/></span>
      <div><h1 class="text-lg font-semibold text-[#18233D]">Meu perfil</h1><p class="text-[13px] text-[#697184]">{data.customer.email}</p></div>
    </div>
    <CustomerProfileForm initialName={data.requiresNameConfirmation ? "" : data.customer.name} onSaved={() => { window.location.assign(data.returnTo); }} />
  </section>
</main>
