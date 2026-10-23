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
      <select name="areaId" value={data.selectedOnboardingAreaId} disabled={!data.canManageWorkflows || data.onboardingAreas.length === 0} class="application-text-caption mt-2 h-11 w-full rounded-xl border border-app-border-control bg-app-surface px-3 text-app-text disabled:opacity-60">
        <option value="">Não configurado</option>
        {#each data.onboardingAreas as area}
          <option value={area.areaId}>{area.areaName}</option>
        {/each}
      </select>
    </label>

    <div class="mt-4 grid gap-3 md:grid-cols-2">
      <label class="block">
        <span class="application-text-caption font-semibold text-app-text-muted">Etiqueta do onboarding</span>
        <select name="tagId" value={data.onboarding.tagId ?? ""} disabled={!data.canManageWorkflows} class="application-text-caption mt-2 h-11 w-full rounded-xl border border-app-border-control bg-app-surface px-3 text-app-text disabled:opacity-60">
          <option value="">Escolher etiqueta</option>
          {#each data.labels as label}
            <option value={label.id}>{label.name}</option>
          {/each}
        </select>
      </label>
      <label class="block">
        <span class="application-text-caption font-semibold text-app-text-muted">Ou criar nova etiqueta</span>
        <input type="text" name="newTagName" maxlength="40" minlength="2" placeholder="Ex.: Novo cliente" disabled={!data.canManageWorkflows} class="application-text-caption mt-2 h-11 w-full rounded-xl border border-app-border-control bg-app-surface px-3 text-app-text disabled:opacity-60"/>
      </label>
    </div>
    <p class="application-text-meta mt-2 text-app-text-soft">A etiqueta será aplicada automaticamente aos novos tickets do onboarding. Ao preencher um novo nome, ele tem prioridade sobre a seleção.</p>

    {#if data.onboardingAreas.length === 0}
      <p class="mt-3 rounded-xl bg-app-warning-bg px-3 py-3 text-[12px] leading-5 text-app-warning-text">
        Nenhum processo ativo com etapas foi encontrado.
        <a href="/app/tickets/workflows" class="font-semibold underline">Criar ou revisar os fluxos</a>
      </p>
    {:else if !data.canManageWorkflows}
      <p class="mt-3 rounded-xl bg-app-warning-bg px-3 py-3 text-[12px] leading-5 text-app-warning-text">Seu perfil não permite administrar os fluxos de tickets.</p>
    {:else}
      <p class="application-text-meta mt-2 text-app-text-soft">Ao salvar, a entrada será vinculada automaticamente ao fluxo global.</p>
    {/if}

    <div class="mt-5 flex justify-end border-t border-app-border-soft pt-4">
      <button type="submit" disabled={!data.canManageWorkflows || data.onboardingAreas.length === 0} class="application-text-caption inline-flex min-h-10 items-center gap-2 rounded-xl bg-app-primary px-4 font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"><Save size={14}/>Salvar onboarding</button>
    </div>
  </form>

  {#if data.canConfigureOperatorEmails}
    <form method="POST" action="?/saveOperatorEmails" class="mb-5 rounded-[22px] border border-app-border bg-app-surface p-5 sm:p-6">
      <div class="flex items-start gap-3">
        <span class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-app-info-bg text-app-primary"><Mail size={18}/></span>
        <div>
          <h2 class="text-[14px] font-semibold text-app-text">E-mail ao abrir novos tickets</h2>
          <p class="application-text-meta mt-1 text-app-text-soft">Selecione os operadores que devem receber avisos de novos tickets.</p>
        </div>
      </div>

      <label class="mt-4 flex items-center gap-3 rounded-xl border border-app-border-control bg-app-subtle px-4 py-3">
        <input type="checkbox" name="operatorEmailEnabled" checked={data.operatorSettings.enabled} class="h-4 w-4 rounded border-app-border-control"/>
        <span class="application-text-caption font-semibold text-app-text">Ativar avisos por e-mail</span>
      </label>

      <label class="mt-2 flex items-center gap-3 rounded-xl border border-app-border-control bg-app-subtle px-4 py-3">
        <input type="checkbox" name="customerAttachmentEmails" checked={data.operatorSettings.customerAttachments} class="h-4 w-4 rounded border-app-border-control"/>
        <span class="application-text-caption font-semibold text-app-text">Avisar novos anexos enviados pelo cliente</span>
      </label>

      <div class="mt-4">
        <UserMultiSelectCard
          title="Operadores"
          description="Pessoas autorizadas a responder tickets"
          name="operatorRecipientUserId"
          users={data.operatorUsers}
          selectedUserIds={data.operatorSettings.recipientUserIds}
        />
      </div>

      <div class="mt-4 flex justify-end border-t border-app-border-soft pt-4">
        <button type="submit" class="application-text-caption inline-flex min-h-10 items-center gap-2 rounded-xl bg-app-primary px-4 font-semibold text-white"><Save size={14}/>Salvar avisos de novos tickets</button>
      </div>
    </form>
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
