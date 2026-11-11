<script lang="ts">
  import { Building2, ExternalLink, Mail, UserRound } from "lucide-svelte";
  import ApplicationBackLink from "$lib/components/application/ApplicationBackLink.svelte";
  import ApplicationContent from "$lib/components/application/ApplicationContent.svelte";
  import type { PageData } from "./$types";

  export let data: PageData;
</script>

<svelte:head><title>{data.unit.name} | Clientes | F10 Operations</title></svelte:head>

<ApplicationContent width="wide">
  <ApplicationBackLink href="/app/customers?view=units" label="Clientes" className="mb-4"/>
  <section class="rounded-2xl border border-[var(--app-border)] bg-[var(--app-surface)] p-5">
    <div class="flex items-center gap-3">
      <Building2 size={22} class="text-[var(--app-primary)]"/>
      <div class="min-w-0">
        <h1 class="text-[20px] font-semibold text-[var(--app-text)]">{data.unit.name}</h1>
        <p class="text-[13px] text-[var(--app-text-muted)]">{data.unit.groupName} · {data.unit.organizationName}</p>
      </div>
    </div>
    <dl class="mt-5 grid gap-4 sm:grid-cols-2">
      <div><dt class="text-[12px] text-[var(--app-text-muted)]">Contrato</dt><dd class="text-[15px] font-semibold text-[var(--app-text)]">{data.unit.contractNumber}</dd></div>
      <div><dt class="text-[12px] text-[var(--app-text-muted)]">Situação</dt><dd class="text-[15px] font-semibold text-[var(--app-text)]">{data.unit.status}</dd></div>
      <div><dt class="text-[12px] text-[var(--app-text-muted)]">Plano</dt><dd class="text-[14px] text-[var(--app-text)]">{data.unit.plan ?? "Não informado"}</dd></div>
      <div><dt class="text-[12px] text-[var(--app-text-muted)]">Cidade</dt><dd class="text-[14px] text-[var(--app-text)]">{data.unit.city ?? "Não informada"}</dd></div>
      <div>
        <dt class="text-[12px] text-[var(--app-text-muted)]">E-mail comercial</dt>
        <dd class="text-[14px] text-[var(--app-text)]">
          {#if data.unit.generalEmail}
            <a class="inline-flex items-center gap-2 break-all text-[var(--app-primary)] hover:underline" href={`mailto:${data.unit.generalEmail}`}><Mail size={15}/>{data.unit.generalEmail}</a>
          {:else}Não informado{/if}
        </dd>
      </div>
      <div>
        <dt class="text-[12px] text-[var(--app-text-muted)]">Contato principal</dt>
        <dd class="text-[14px] text-[var(--app-text)]">
          {#if data.unit.generalContactId}
            <a class="inline-flex items-center gap-1.5 text-[var(--app-primary)] hover:underline" href={`/app/customers/${data.unit.generalContactId}`}><UserRound size={15}/>Abrir perfil <ExternalLink size={12}/></a>
          {:else}Não vinculado{/if}
        </dd>
      </div>
      {#if data.unit.holderName || data.unit.holderEmail}
        <div><dt class="text-[12px] text-[var(--app-text-muted)]">Titular</dt><dd class="text-[14px] text-[var(--app-text)]">{data.unit.holderName ?? "Não informado"}</dd></div>
        <div><dt class="text-[12px] text-[var(--app-text-muted)]">E-mail do titular</dt><dd class="break-all text-[14px] text-[var(--app-text)]">{data.unit.holderEmail ?? "Não informado"}</dd></div>
      {/if}
    </dl>
  </section>
</ApplicationContent>
