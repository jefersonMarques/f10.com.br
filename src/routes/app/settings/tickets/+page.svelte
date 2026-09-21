<script lang="ts">
  import { GitBranch, Mail, Save, Ticket } from "lucide-svelte";
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

  <form method="POST" action="?/saveOnboarding" class="mb-5 rounded-[22px] border border-app-border bg-app-surface p-5 sm:p-6">
    <div class="flex items-start gap-3">
      <span class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-app-info-bg text-app-info-text"><GitBranch size={18}/></span>
      <div>
        <h2 class="text-[14px] font-semibold text-app-text">Onboarding de novos clientes</h2>
        <p class="application-text-meta mt-1 text-app-text-soft">Escolha o processo que recebe os tickets iniciados em <strong>/boas-vindas</strong>.</p>
      </div>
    </div>

    <label class="mt-5 block">
      <span class="application-text-caption font-semibold text-app-text-muted">Processo inicial</span>
      <select name="startStageId" value={data.onboarding.startStageId ?? ""} class="application-text-caption mt-2 h-11 w-full rounded-xl border border-app-border-control bg-app-surface px-3 text-app-text">
        <option value="">Não configurado</option>
        {#each data.entryPoints as entryPoint}
          <option value={entryPoint.stageId}>{entryPoint.areaName}</option>
        {/each}
      </select>
    </label>

    {#if data.entryPoints.length === 0}
      <p class="application-text-meta mt-3 rounded-xl bg-app-warning-bg px-3 py-2 text-app-warning-text">Marque uma área do workflow como entrada de novos tickets antes de configurar o onboarding.</p>
    {/if}

    <div class="mt-5 flex justify-end border-t border-app-border-soft pt-4">
      <button type="submit" class="application-text-caption inline-flex min-h-10 items-center gap-2 rounded-xl bg-app-primary px-4 font-semibold text-white"><Save size={14}/>Salvar processo</button>
    </div>
  </form>

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
