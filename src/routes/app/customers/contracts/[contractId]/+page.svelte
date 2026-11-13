<script lang="ts">
  import {
    ArrowLeft, BadgeCheck, Building2, CalendarDays, FileText, Hash,
    Mail, MapPin, Phone, RefreshCw, Ticket, UserRound, Users,
  } from "lucide-svelte";
  import ApplicationContent from "$lib/components/application/ApplicationContent.svelte";
  import type { ActionData, PageData } from "./$types";

  export let data: PageData;
  export let form: ActionData;

  const detailSections = [
    {
      title: "Responsável e pessoa vinculada",
      fields: [
        { label: "Titular / responsável", key: "holderName", icon: Users },
        { label: "CPF / CNPJ", key: "holderDocument", icon: FileText },
        { label: "Pessoa vinculada", key: "personName", icon: UserRound },
        { label: "Razão social", key: "legalName", icon: Building2 },
        { label: "E-mail do titular", key: "holderEmail", icon: Mail },
        { label: "Telefone do titular", key: "holderPhone", icon: Phone },
        { label: "Celular do titular", key: "holderMobile", icon: Phone },
        { label: "E-mail de contato", key: "email", icon: Mail },
        { label: "Telefone de contato", key: "phone", icon: Phone },
        { label: "Celular de contato", key: "mobile", icon: Phone },
      ],
    },
    {
      title: "Dados comerciais",
      fields: [
        { label: "Número comercial", key: "contractNumber", icon: FileText },
        { label: "Situação na API", key: "apiStatus", icon: BadgeCheck },
        { label: "Plano", key: "plan", icon: FileText },
        { label: "Apelido", key: "nickname", icon: Building2 },
        { label: "Matrícula", key: "enrollmentDate", icon: CalendarDays },
        { label: "Cancelamento", key: "cancellationDate", icon: CalendarDays },
      ],
    },
    {
      title: "Endereço do titular",
      fields: [
        { label: "Logradouro", key: "holderStreet", icon: MapPin },
        { label: "Complemento", key: "holderAddressComplement", icon: MapPin },
        { label: "Bairro", key: "holderNeighborhood", icon: MapPin },
        { label: "Cidade", key: "holderCity", icon: MapPin },
        { label: "Estado", key: "holderState", icon: MapPin },
        { label: "CEP", key: "holderPostalCode", icon: MapPin },
      ],
    },
    {
      title: "Identificadores F10",
      fields: [
        { label: "ID do contrato", key: "contractId", icon: Hash },
        { label: "ID do titular", key: "holderId", icon: Hash },
        { label: "ID da pessoa", key: "personId", icon: Hash },
        { label: "ID da unidade da API", key: "unitId", icon: Hash },
      ],
    },
  ];

  function display(key: string): string {
    const value = data.details[key];
    if (value === null || value === undefined || String(value).trim() === "") {
      return "Não informado";
    }
    const text = String(value);
    if (/Date$/.test(key) && /^\d{4}-\d{2}-\d{2}/.test(text)) {
      return text.slice(0, 10).split("-").reverse().join("/");
    }
    return text;
  }
</script>

<svelte:head>
  <title>{display("holderName")} | Contrato F10</title>
</svelte:head>

<ApplicationContent width="wide">
  <a href="/app/customers?view=units" class="application-text-caption mb-4 inline-flex items-center gap-2 font-semibold text-app-primary">
    <ArrowLeft size={17}/> Contratos
  </a>

  <header class="mb-5 flex flex-wrap items-start justify-between gap-3">
    <div class="min-w-0">
      <p class="application-text-meta font-semibold text-app-text-muted">Contrato {display("contractNumber")} · F10 #{display("contractId")}</p>
      <h1 class="mt-1 break-words text-xl font-bold text-app-text">
        {data.details.accountName || data.details.holderName || "Contrato sem titular informado"}
      </h1>
      <p class="application-text-caption mt-1 text-app-text-muted">
        <UserRound size={15} class="mr-1 inline"/> Pessoa vinculada: {display("personName")}
      </p>
    </div>
    {#if data.canManage && data.details.holderId}
      <form method="POST" action="?/refreshHolder">
        <button class="application-text-caption inline-flex h-10 items-center gap-2 rounded-xl border border-app-border-control px-4 font-semibold text-app-text">
          <RefreshCw size={17}/> Atualizar titular
        </button>
      </form>
    {/if}
  </header>

  {#if form?.message}
    <p role="status" class="application-text-caption mb-4 rounded-lg border border-app-border p-3 text-app-text">{form.message}</p>
  {/if}

  <div class="mb-5 grid gap-3 sm:grid-cols-2">
    <div class="rounded-xl border border-app-border bg-app-surface p-4">
      <div class="flex items-center gap-2 text-app-text-muted">
        <Ticket size={17}/>
        <span class="application-text-caption">Tickets em aberto</span>
      </div>
      <strong class="mt-2 block text-2xl text-app-text">{data.ticketCounts.open}</strong>
    </div>
    <div class="rounded-xl border border-app-border bg-app-surface p-4">
      <div class="flex items-center gap-2 text-app-text-muted">
        <FileText size={17}/>
        <span class="application-text-caption">Tickets totais</span>
      </div>
      <strong class="mt-2 block text-2xl text-app-text">{data.ticketCounts.total}</strong>
    </div>
  </div>

  <div class="grid gap-4 lg:grid-cols-2">
    {#each detailSections as section}
      <section class="rounded-xl border border-app-border bg-app-surface p-4">
        <h2 class="mb-4 text-base font-bold text-app-text">{section.title}</h2>
        <div class="grid gap-4 sm:grid-cols-2">
          {#each section.fields as field}
            <div class="flex min-w-0 items-start gap-2">
              <svelte:component this={field.icon} size={16} class="mt-0.5 shrink-0 text-app-primary"/>
              <div class="min-w-0">
                <p class="application-text-meta font-semibold text-app-text-muted">{field.label}</p>
                <p class="application-text-caption break-words text-app-text">{display(field.key)}</p>
              </div>
            </div>
          {/each}
        </div>
      </section>
    {/each}
  </div>

  <section class="mt-4 rounded-xl border border-app-border bg-app-surface">
    <header class="flex items-center gap-2 border-b border-app-border p-4">
      <Ticket size={18} class="text-app-primary"/>
      <h2 class="text-base font-bold text-app-text">Tickets deste contrato</h2>
    </header>
    {#if data.recentTickets.length === 0}
      <p class="application-text-caption p-5 text-app-text-muted">Nenhum ticket vinculado a este contrato.</p>
    {:else}
      <div class="divide-y divide-app-border-soft">
        {#each data.recentTickets as ticket}
          <a href={"/app/tickets/" + String(ticket.id)}
            class="flex items-center justify-between gap-3 px-4 py-3 hover:bg-app-subtle">
            <span class="min-w-0">
              <strong class="application-text-caption block truncate text-app-text">
                #{String(ticket.ticketNumber)} · {String(ticket.subject)}
              </strong>
              <span class="application-text-meta text-app-text-muted">{String(ticket.status)}</span>
            </span>
            <FileText size={16} class="shrink-0 text-app-primary"/>
          </a>
        {/each}
      </div>
    {/if}
  </section>
</ApplicationContent>