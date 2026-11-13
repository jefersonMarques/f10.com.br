<script lang="ts">
  import { ArrowLeft, Mail, Phone, UserPlus, UserRound } from "lucide-svelte";
  import ApplicationContent from "$lib/components/application/ApplicationContent.svelte";
  import type { ActionData } from "./$types";
  export let form: ActionData;
</script>

<svelte:head><title>Nova pessoa | F10 Suporte</title></svelte:head>

<ApplicationContent width="wide">
  <a href="/app/customers?view=contacts" class="application-text-caption mb-4 inline-flex items-center gap-2 font-semibold text-app-primary">
    <ArrowLeft size={17}/> Pessoas e contatos
  </a>
  <section class="max-w-[650px] rounded-xl border border-app-border bg-app-surface p-5">
    <h1 class="mb-4 flex items-center gap-2 text-lg font-bold text-app-text">
      <UserPlus size={21}/> Nova pessoa
    </h1>
    {#if form?.message}<p role="alert" class="application-text-caption mb-3 text-app-danger-text">{form.message}</p>{/if}
    <form method="POST" class="grid gap-4 sm:grid-cols-2">
      <label class="sm:col-span-2">
        <span class="application-text-caption mb-1 flex items-center gap-1.5 font-semibold"><UserRound size={15}/> Nome *</span>
        <input name="name" maxlength="120" minlength="2" required
          class="application-text-caption h-11 w-full rounded-lg border border-app-border-control px-3"/>
      </label>
      <label class="sm:col-span-2">
        <span class="application-text-caption mb-1 flex items-center gap-1.5 font-semibold"><Mail size={15}/> E-mail *</span>
        <input name="email" type="email" required maxlength="254" autocomplete="email"
          class="application-text-caption h-11 w-full rounded-lg border border-app-border-control px-3"/>
      </label>
      <label>
        <span class="application-text-caption mb-1 flex items-center gap-1.5 font-semibold"><Phone size={15}/> Telefone</span>
        <input name="phone" maxlength="40" type="tel"
          class="application-text-caption h-11 w-full rounded-lg border border-app-border-control px-3"/>
      </label>
      <label>
        <span class="application-text-caption mb-1 flex items-center gap-1.5 font-semibold"><Phone size={15}/> WhatsApp</span>
        <input name="whatsapp" maxlength="40" type="tel"
          class="application-text-caption h-11 w-full rounded-lg border border-app-border-control px-3"/>
      </label>
      <button type="submit" class="application-text-caption h-11 rounded-lg bg-app-primary px-5 font-semibold text-white sm:col-span-2">
        Criar pessoa
      </button>
    </form>
  </section>
</ApplicationContent>