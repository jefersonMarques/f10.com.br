<script lang="ts">
  import { Mail, Save } from "lucide-svelte";
  import ApplicationBackLink from "$lib/components/application/ApplicationBackLink.svelte";
  import ApplicationContent from "$lib/components/application/ApplicationContent.svelte";
  import type { ActionData, PageData } from "./$types";

  export let data: PageData;
  export let form: ActionData;
</script>

<svelte:head><title>Formulários | F10 Operations</title></svelte:head>

<ApplicationContent width="narrow">
  <ApplicationBackLink href="/app/settings" label="Configurações" className="mb-3" />

  {#if form?.message}
    <div class={"application-text-caption mb-4 rounded-2xl border px-4 py-3 font-medium " + (form.success ? "border-app-success-border bg-app-success-bg text-app-success-text" : "border-app-danger-border bg-app-danger-bg text-app-danger-text")}>{form.message}</div>
  {/if}

  <section class="rounded-[22px] border border-app-border bg-app-surface p-5 sm:p-6">
    <div class="flex items-start gap-3">
      <span class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-app-info-bg text-app-info-text"><Mail size={18}/></span>
      <div>
        <h2 class="text-[14px] font-semibold text-app-text">Avisos dos formulários</h2>
        <p class="application-text-meta mt-1 text-app-text-soft">Escolha quem recebe o e-mail quando um novo ticket é criado.</p>
      </div>
    </div>

    <form method="POST" action="?/save" class="mt-5 space-y-4">
      <label class="block">
        <span class="application-text-caption mb-1.5 block font-semibold text-app-text-muted">Nota Fiscal</span>
        <select name="nfseRecipientUserId" class="h-11 w-full rounded-xl border border-app-border-control bg-app-surface px-3 text-[13px]">
          <option value="" selected={!data.nfse.recipientUserId}>Não enviar e-mail</option>
          {#each data.nfse.users as user}
            <option value={user.id} selected={user.id === data.nfse.recipientUserId}>{user.name} · {user.email}</option>
          {/each}
        </select>
        {#if data.nfse.users.length === 0}<span class="application-text-meta mt-1 block text-app-warning-text">Equipe sem pessoas ativas.</span>{/if}
      </label>

      <label class="block">
        <span class="application-text-caption mb-1.5 block font-semibold text-app-text-muted">Cellcoin</span>
        <select name="cellCoinRecipientUserId" class="h-11 w-full rounded-xl border border-app-border-control bg-app-surface px-3 text-[13px]">
          <option value="" selected={!data.cellCoin.recipientUserId}>Não enviar e-mail</option>
          {#each data.cellCoin.users as user}
            <option value={user.id} selected={user.id === data.cellCoin.recipientUserId}>{user.name} · {user.email}</option>
          {/each}
        </select>
        {#if data.cellCoin.users.length === 0}<span class="application-text-meta mt-1 block text-app-warning-text">Equipe sem pessoas ativas.</span>{/if}
      </label>

      <button type="submit" class="application-text-caption inline-flex min-h-10 items-center gap-2 rounded-xl bg-app-primary px-4 font-semibold text-white"><Save size={14}/>Salvar</button>
    </form>
  </section>
</ApplicationContent>
