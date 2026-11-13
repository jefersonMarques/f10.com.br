<script lang="ts">
  import { onMount } from "svelte";
  import {
    BadgeCheck, BriefcaseBusiness, Building2, CalendarDays, CreditCard,
    ExternalLink, FileText, Hash, Loader2, Mail, MapPin, Phone,
    Smartphone, Tag, UserRound, Users, X,
  } from "lucide-svelte";

  export let contractId: string;
  export let onClose: () => void;

  type Details = {
    unitId: number;
    contractId: string;
    contractNumber: string | null;
    personId: string | null;
    holderId: string | null;
    apiStatus: string | null;
    apiStatusCode: number | null;
    accountName: string | null;
    personName: string | null;
    holderName: string | null;
    nickname: string | null;
    legalName: string | null;
    email: string | null;
    phone: string | null;
    mobile: string | null;
    holderEmail: string | null;
    holderPhone: string | null;
    holderMobile: string | null;
    groupName: string | null;
    plan: string | null;
    city: string | null;
    accountExecutive: string | null;
    sheetStatus: string | null;
    cancellationReason: string | null;
    billingUrl: string | null;
    enrollmentDate: string | null;
    completionDate: string | null;
    cancellationDate: string | null;
    courseId: string | null;
    sourceId: string | null;
    sellerId: string | null;
    telemarketingId: string | null;
    firstSeenAt: string | null;
    lastSeenAt: string | null;
    sheetUnitId: string | null;
    customerContactId: string | null;
  };

  type Field = {
    label: string;
    value: string | number | null | undefined;
    icon: typeof FileText;
    link?: string | null;
  };

  let details: Details | null = null;
  let loading = true;
  let loadError = "";

  function display(value: string | number | null | undefined): string {
    return value === null || value === undefined || String(value).trim() === ""
      ? "Não informado" : String(value);
  }

  function dateValue(value: string | null): string | null {
    if (!value) return null;
    const iso = value.match(/^\d{4}-\d{2}-\d{2}/)?.[0];
    if (iso) return iso.split("-").reverse().join("/");
    return value;
  }

  function safeLink(value: string | null): string | null {
    if (!value) return null;
    try {
      const parsed = new URL(value);
      return parsed.protocol === "https:" ? parsed.href : null;
    } catch {
      return null;
    }
  }

  async function loadDetails(): Promise<void> {
    try {
      const response = await fetch(
        "/api/app/customers/contracts/" + encodeURIComponent(contractId),
        { cache: "no-store" },
      );
      if (!response.ok) throw new Error("CONTRACT_DETAILS_UNAVAILABLE");
      const payload = await response.json() as { contract: Details };
      details = payload.contract;
    } catch {
      loadError = "Não foi possível carregar os dados deste contrato.";
    } finally {
      loading = false;
    }
  }

  onMount(() => {
    void loadDetails();
  });

  $: customerFields = details ? [
    { label: "Cliente / empresa", value: details.accountName, icon: Building2 },
    { label: "Pessoa vinculada", value: details.personName, icon: UserRound },
    { label: "Titular", value: details.holderName, icon: Users },
    { label: "Razão social", value: details.legalName, icon: Building2 },
    { label: "E-mail", value: details.email, icon: Mail, link: details.email ? "mailto:" + details.email : null },
    { label: "Telefone", value: details.phone, icon: Phone, link: details.phone ? "tel:" + details.phone : null },
    { label: "Celular / WhatsApp", value: details.mobile, icon: Smartphone },
    { label: "E-mail do titular", value: details.holderEmail, icon: Mail, link: details.holderEmail ? "mailto:" + details.holderEmail : null },
    { label: "Telefone do titular", value: details.holderPhone, icon: Phone },
    { label: "Celular do titular", value: details.holderMobile, icon: Smartphone },
  ] satisfies Field[] : [];

  $: commercialFields = details ? [
    { label: "Contrato comercial", value: details.contractNumber, icon: FileText },
    { label: "Situação na API", value: details.apiStatus ?? details.apiStatusCode, icon: BadgeCheck },
    { label: "Situação na planilha", value: details.sheetStatus, icon: BadgeCheck },
    { label: "Apelido comercial", value: details.nickname, icon: Tag },
    { label: "Franquia / grupo", value: details.groupName, icon: Users },
    { label: "Plano contratado", value: details.plan, icon: CreditCard },
    { label: "Cidade", value: details.city, icon: MapPin },
    { label: "Executivo de contas", value: details.accountExecutive, icon: BriefcaseBusiness },
    { label: "Motivo do cancelamento", value: details.cancellationReason, icon: FileText },
  ] satisfies Field[] : [];

  $: historyFields = details ? [
    { label: "Matrícula", value: dateValue(details.enrollmentDate), icon: CalendarDays },
    { label: "Conclusão", value: dateValue(details.completionDate), icon: CalendarDays },
    { label: "Cancelamento", value: dateValue(details.cancellationDate), icon: CalendarDays },
    { label: "Primeira importação", value: dateValue(details.firstSeenAt), icon: CalendarDays },
    { label: "Última atualização", value: dateValue(details.lastSeenAt), icon: CalendarDays },
  ] satisfies Field[] : [];

  $: identifierFields = details ? [
    { label: "ID do contrato", value: details.contractId, icon: Hash },
    { label: "Unidade da API", value: details.unitId, icon: Hash },
    { label: "ID da pessoa", value: details.personId, icon: UserRound },
    { label: "ID do titular", value: details.holderId, icon: Users },
    { label: "ID do curso", value: details.courseId, icon: Hash },
    { label: "ID da origem", value: details.sourceId, icon: Hash },
    { label: "ID do vendedor", value: details.sellerId, icon: Hash },
    { label: "ID do telemarketing", value: details.telemarketingId, icon: Hash },
  ] satisfies Field[] : [];

  const sections: Array<{ title: string; name: "customer" | "commercial" | "history" | "ids" }> = [
    { title: "Cliente e responsáveis", name: "customer" },
    { title: "Dados comerciais", name: "commercial" },
    { title: "Datas", name: "history" },
    { title: "Identificadores F10", name: "ids" },
  ];
</script>

<svelte:window on:keydown={(event) => {
  if (event.key === "Escape") onClose();
}}/>

<div class="fixed inset-0 z-[120] flex items-center justify-center p-3 sm:p-6" role="presentation">
  <button type="button" class="absolute inset-0 bg-[#010D28]/55" aria-label="Fechar detalhes do contrato" on:click={onClose}></button>
  <div class="relative z-10 flex max-h-[92vh] w-full max-w-[790px] flex-col overflow-hidden rounded-[22px] border border-app-border bg-app-surface shadow-2xl"
    role="dialog" aria-modal="true" aria-label="Detalhes do contrato">
    <header class="flex shrink-0 items-start justify-between gap-3 border-b border-app-border p-4 sm:p-5">
      <div class="min-w-0">
        <span class="application-text-meta font-semibold text-app-text-muted">Contrato F10 #{contractId}</span>
        <h2 class="mt-1 break-words text-lg font-bold text-app-text">
          {details?.accountName || details?.personName || "Detalhes do cliente"}
        </h2>
        {#if details?.accountName && details?.personName && details.accountName !== details.personName}
          <p class="application-text-caption mt-1 flex items-center gap-2 text-app-text-muted">
            <UserRound size={15}/> {details.personName}
          </p>
        {/if}
      </div>
      <button type="button" on:click={onClose} aria-label="Fechar" class="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-app-border-control text-app-text">
        <X size={18}/>
      </button>
    </header>

    <div class="overflow-y-auto p-4 sm:p-5">
      {#if loading}
        <div role="status" class="flex items-center justify-center gap-3 py-16 text-app-text-muted">
          <Loader2 size={20} class="animate-spin"/> Carregando informações...
        </div>
      {:else if loadError}
        <p role="alert" class="application-text-caption py-12 text-center text-app-danger-text">{loadError}</p>
      {:else if details}
        <div class="mb-4 flex flex-wrap items-center gap-2">
          <span class="application-text-meta rounded-full bg-app-info-bg px-3 py-1 font-semibold text-app-text">API F10</span>
          {#if details.sheetUnitId}
            <span class="application-text-meta rounded-full bg-app-success-bg px-3 py-1 font-semibold text-app-success-text">Planilha vinculada</span>
          {:else}
            <span class="application-text-meta rounded-full bg-app-subtle px-3 py-1 text-app-text-muted">Sem complemento</span>
          {/if}
          <span class="application-text-meta rounded-full border border-app-border px-3 py-1 text-app-text-muted">
            {display(details.apiStatus ?? details.apiStatusCode)}
          </span>
        </div>

        {#each sections as section}
          {@const fields = section.name === "customer" ? customerFields :
            section.name === "commercial" ? commercialFields :
            section.name === "history" ? historyFields : identifierFields}
          <section class="mb-4 rounded-xl border border-app-border p-3 sm:p-4">
            <h3 class="application-text-caption mb-3 font-bold text-app-text">{section.title}</h3>
            <div class="grid gap-x-5 gap-y-3 sm:grid-cols-2">
              {#each fields as field}
                <div class="flex min-w-0 items-start gap-2">
                  <svelte:component this={field.icon} size={16} class="mt-0.5 shrink-0 text-app-primary"/>
                  <div class="min-w-0">
                    <div class="application-text-meta font-semibold text-app-text-muted">{field.label}</div>
                    {#if field.link}
                      <a href={field.link} class="application-text-caption break-all font-medium text-app-primary hover:underline">{display(field.value)}</a>
                    {:else}
                      <div class:italic={!field.value} class="application-text-caption break-words text-app-text">{display(field.value)}</div>
                    {/if}
                  </div>
                </div>
              {/each}
            </div>
          </section>
        {/each}

        <div class="flex flex-wrap gap-2">
          {#if details.customerContactId}
            <a href={"/app/customers/" + details.customerContactId}
              class="application-text-caption inline-flex items-center gap-2 rounded-lg border border-app-border-control px-3 py-2 font-semibold text-app-text">
              <UserRound size={16}/> Abrir contato
            </a>
          {/if}
          {#if safeLink(details.billingUrl)}
            <a href={safeLink(details.billingUrl) ?? undefined} target="_blank" rel="noopener noreferrer"
              class="application-text-caption inline-flex items-center gap-2 rounded-lg border border-app-border-control px-3 py-2 font-semibold text-app-text">
              <CreditCard size={16}/> Financeiro <ExternalLink size={14}/>
            </a>
          {/if}
        </div>
      {/if}
    </div>
  </div>
</div>
