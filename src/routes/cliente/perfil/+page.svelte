<script lang="ts">
  import { ArrowLeft } from "lucide-svelte";
  import CustomerProfileForm from "$lib/components/customerPortal/CustomerProfileForm.svelte";
  import type { PageData } from "./$types";
  export let data: PageData;
</script>

<svelte:head><title>Meu perfil | Helpdesk F10</title></svelte:head>
<main class="mx-auto max-w-[600px] px-4 py-6 sm:py-10">
  <section class="rounded-2xl border border-[#E2E5ED] bg-white p-6 shadow-sm">
    <div class="mb-5 flex items-center justify-between gap-3">
      <h1 class="text-[20px] font-semibold text-[#18233D]">Meu perfil</h1>
      <a href={data.returnTo} class="inline-flex min-h-9 items-center gap-1.5 text-[13px] font-medium text-[#000A57]"><ArrowLeft size={16}/> Voltar</a>
    </div>
    <CustomerProfileForm
      fullProfile
      initialName={data.requiresNameConfirmation ? "" : data.customer.name}
      loginEmail={data.customer.email}
      initialContactEmail={data.profile.contactEmail}
      initialContactPhone={data.profile.contactPhone}
      initialHasAvatar={data.profile.hasAvatar}
      onSaved={() => { if (data.requiresNameConfirmation) window.location.assign(data.returnTo); }}
    />
  </section>
</main>
