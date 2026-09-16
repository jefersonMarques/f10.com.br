<script lang="ts">
  import { Mail, Save, Ticket } from "lucide-svelte";
  import ApplicationBackLink from "$lib/components/application/ApplicationBackLink.svelte";
  import ApplicationContent from "$lib/components/application/ApplicationContent.svelte";
  import UserMultiSelectCard from "$lib/components/settings/UserMultiSelectCard.svelte";
  import type { ActionData, PageData } from "./$types";

  export let data: PageData;
  export let form: ActionData;
</script>

<svelte:head><title>Tickets | F10 Operations</title></svelte:head>

<ApplicationContent width="narrow">
  <ApplicationBackLink href="/app/settings" label="Configurações" className="mb-3" />

  {#if form?.message}
    <div class={"application-text-caption mb-4 rounded-2xl border px-4 py-3 font-medium " + (form.success ? "border-app-success-border bg-app-success-bg text-app-success-text" : "border-app-danger-border bg-app-danger-bg text-app-danger-text")}>{form.message}</div>
  {/if}

  <form method="POST" action="?/saveNotifications" class="rounded-[22px] border border-app-border bg-app-surface p-5 sm:p-6">
    <div class="flex items-start gap-3">
      <span class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-app-warning-bg text-app-accent"><Ticket size={18}/></span>
      <div>
        <h2 class="text-[14px] font-semibold text-app-text">Notificações de tickets</h2>
        <p class="application-text-meta mt-1 text-app-text-soft">Escolha quem recebe e-mail quando um formulário cria um novo ticket.</p>
      </div>
    </div>

    <div class="mt-5 grid gap-4 lg:grid-cols-2">
      <UserMultiSelectCard
        title="Nota Fiscal"
        description="Aviso de novo ticket"
        name="nfseRecipientUserId"
        users={data.nfse.users}
        selectedUserIds={data.nfse.recipientUserIds}
      />
      <UserMultiSelectCard
        title="Cellcoin"
        description="Aviso de novo ticket"
        name="cellCoinRecipientUserId"
        users={data.cellCoin.users}
        selectedUserIds={data.cellCoin.recipientUserIds}
      />
    </div>

    <div class="mt-5 flex items-center justify-between gap-3 border-t border-app-border-soft pt-4">
      <div class="application-text-meta flex items-center gap-2 text-app-text-soft"><Mail size={13}/>O mesmo ticket pode avisar várias pessoas.</div>
      <button type="submit" class="application-text-caption inline-flex min-h-10 items-center gap-2 rounded-xl bg-app-primary px-4 font-semibold text-white"><Save size={14}/>Salvar notificações</button>
    </div>
  </form>
</ApplicationContent>
