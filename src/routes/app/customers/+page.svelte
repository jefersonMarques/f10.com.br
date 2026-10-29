<script lang="ts">
  import { ArrowRight, Building2, FileSpreadsheet, Mail, MessageCircleMore, Phone, Search, Users, Link2 } from "lucide-svelte";
  import ApplicationContent from "$lib/components/application/ApplicationContent.svelte";
  import type { PageData } from "./$types";

  export let data: PageData;

  const ticketStatusLabels: Record<string, string> = {
    new: "Novo", open: "Aberto", in_progress: "Em andamento",
    waiting_customer: "Aguardando cliente", resolved: "Resolvido", closed: "Fechado",
  };

  function formatDate(value: string | Date | null): string {
    if (!value) return "Sem interação";
    return new Intl.DateTimeFormat("pt-BR", {
      dateStyle: "short", timeStyle: "short",
    }).format(new Date(value));
  }

  function whatsappHref(value: string | null): string | null {
    if (!value) return null;
    const digits = value.replace(/\D/g, "");
    return digits.length >= 10 ? `https://wa.me/${digits}` : null;
  }

  function pageHref(page: number, view = data.view): string {
    const params = new URLSearchParams();
    params.set("view", view);
    if (data.query) params.set("q", data.query);
    if (view === "units") {
      if (data.groupId) params.set("grupo", data.groupId);
      if (data.status) params.set("situacao", data.status);
    }
    if (page > 1) params.set("page", String(page));
    return `/app/customers?${params.toString()}`;
  }
</script>

<svelte:head><title>Clientes | F10 Operations</title></svelte:head>

<ApplicationContent width="wide">
  <header class="mb-4 flex flex-wrap items-center justify-between gap-3">
    <div>
      <h1 class="text-xl font-bold text-app-text">Clientes F10</h1>
      {#if data.importedUnits && !data.importedUnits.unavailable}
        <p class="application-text-caption mt-1 text-app-text-muted">
          {Number(data.importedUnits.summary.total)} unidades ·
          {Number(data.importedUnits.summary.groups)} franquias/redes ·
          {Number(data.importedUnits.summary.active)} ativas
        </p>
      {/if}
    </div>
    {#if data.canImport}
      <div class="flex flex-wrap gap-2">
        <a href="/app/customers/access" class="application-text-caption inline-flex h-10 items-center gap-2 rounded-xl border border-app-border-control px-4 font-semibold text-app-text">
          <Link2 size={16}/> Atribuir pessoas
        </a>
      <a href="/app/customers/sync" class="application-text-caption inline-flex h-10 items-center gap-2 rounded-xl bg-app-primary px-4 font-semibold text-white">
        <FileSpreadsheet size={17}/> Importar / atualizar
      </a>
      </div>
    {/if}
  </header>

  {#if data.importedUnits?.unavailable}
    <div role="alert" class="application-text-caption mb-4 rounded-xl border border-app-border bg-app-surface p-3 text-app-warning-text">
      A listagem de unidades está em modo simplificado. Os cadastros continuam preservados; filtros e totalizadores podem estar temporariamente indisponíveis.
    </div>
  {/if}

  {#if data.canViewImportedUnits}
    <nav aria-label="Visualizações de clientes" class="mb-4 flex flex-wrap gap-2 border-b border-app-border pb-3">
      <a href={pageHref(1, "units")} aria-current={data.view === "units" ? "page" : undefined}
        class={data.view === "units"
          ? "application-text-caption inline-flex h-10 items-center gap-2 rounded-lg bg-app-primary px-4 font-semibold text-white"
          : "application-text-caption inline-flex h-10 items-center gap-2 rounded-lg border border-app-border-control px-4 font-semibold text-app-text"}>
        <Building2 size={17}/> Unidades
      </a>
      <a href={pageHref(1, "contacts")} aria-current={data.view === "contacts" ? "page" : undefined}
        class={data.view === "contacts"
          ? "application-text-caption inline-flex h-10 items-center gap-2 rounded-lg bg-app-primary px-4 font-semibold text-white"
          : "application-text-caption inline-flex h-10 items-center gap-2 rounded-lg border border-app-border-control px-4 font-semibold text-app-text"}>
        <Users size={17}/> Pessoas e contatos
      </a>
    </nav>
  {/if}

  {#if data.view === "contacts" && data.directoryUnavailable}
    <div role="alert" class="application-text-caption mb-4 rounded-xl border border-app-border bg-app-surface p-3 text-app-warning-text">
      Não foi possível carregar os contatos. Os cadastros permanecem preservados. Tente novamente ou acesse a aba Unidades.
    </div>
  {/if}

  <section class="overflow-hidden rounded-[20px] border border-app-border bg-app-surface">
    <div class="border-b border-app-border-soft p-4">
      <form method="GET" action="/app/customers" class="flex flex-wrap items-end gap-2">
        <input type="hidden" name="view" value={data.view}/>
        <label class="min-w-[200px] flex-1">
          <span class="application-text-meta mb-1 block font-semibold text-app-text-muted">Buscar</span>
          <span class="relative block">
            <Search size={17} class="absolute left-3 top-1/2 -translate-y-1/2 text-app-text-muted"/>
            <input name="q" value={data.query}
              placeholder={data.view === "units" ? "Apelido, cliente, franquia ou nº contrato" : "Nome, e-mail ou telefone"}
              class="application-text-caption h-10 w-full rounded-xl border border-app-border-control bg-app-subtle pl-10 pr-3 text-app-text outline-none focus:border-app-primary"/>
          </span>
        </label>
        {#if data.view === "units" && data.importedUnits && !data.importedUnits.unavailable}
          <label class="min-w-[155px] flex-1 sm:flex-none">
            <span class="application-text-meta mb-1 block font-semibold text-app-text-muted">Franquia / rede</span>
            <select name="grupo" class="application-text-caption h-10 w-full rounded-xl border border-app-border-control bg-app-subtle px-3 text-app-text sm:max-w-[225px]">
              <option value="">Todas</option>
              {#each data.importedUnits.groups as group}
                <option value={String(group.id)} selected={data.groupId === String(group.id)}>{String(group.name)} ({Number(group.units)})</option>
              {/each}
            </select>
          </label>
          <label class="min-w-[145px] flex-1 sm:flex-none">
            <span class="application-text-meta mb-1 block font-semibold text-app-text-muted">Situação</span>
            <select name="situacao" class="application-text-caption h-10 w-full rounded-xl border border-app-border-control bg-app-subtle px-3 text-app-text">
              <option value="">Todas</option>
              {#each data.importedUnits.statuses as status}
                <option value={String(status.value)} selected={data.status === String(status.value)}>{String(status.value)} ({Number(status.total)})</option>
              {/each}
            </select>
          </label>
        {/if}
        <button type="submit" class="application-text-caption h-10 rounded-xl bg-app-primary px-5 font-semibold text-white">Filtrar</button>
      </form>
    </div>

    {#if data.view === "units" && data.importedUnits}
      <div class="flex items-center justify-between border-b border-app-border-soft px-4 py-3">
        <strong class="application-text-caption text-app-text">{data.importedUnits.unavailable ? "Listagem simplificada" : data.importedUnits.totalMatched + " unidades"}</strong>
        <span class="application-text-meta text-app-text-muted">Dados comerciais da planilha</span>
      </div>
      {#if data.importedUnits.rows.length === 0}
        <p class="application-text-caption px-4 py-12 text-center text-app-text-muted">Nenhuma unidade encontrada.</p>
      {:else}
        <div class="overflow-x-auto">
          <table class="w-full min-w-[780px] text-left">
            <thead class="application-text-meta bg-app-subtle text-app-text-muted">
              <tr>
                <th class="px-4 py-3 font-semibold">Unidade / contrato</th>
                <th class="px-4 py-3 font-semibold">Franquia</th>
                <th class="px-4 py-3 font-semibold">Cliente</th>
                <th class="px-4 py-3 font-semibold">Situação</th>
                <th class="px-4 py-3 font-semibold">Plano</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-app-border-soft">
              {#each data.importedUnits.rows as unit}
                <tr class="hover:bg-app-subtle">
                  <td class="application-text-caption px-4 py-3 align-top">
                    <strong class="block text-app-text">{String(unit.apelido)}</strong>
                    <span class="application-text-meta mt-1 block text-app-text-muted">Contrato nº {String(unit.numero_contrato)}</span>
                  </td>
                  <td class="application-text-caption px-4 py-3 align-top text-app-text-muted">{String(unit.group_name ?? "Sem grupo")}</td>
                  <td class="application-text-caption px-4 py-3 align-top">
                    {#if unit.customer_contact_id}
                      <a href={`/app/customers/${String(unit.customer_contact_id)}`} class="inline-flex items-center gap-1 font-semibold text-app-primary hover:underline">
                        {String(unit.client_name)} <ArrowRight size={14}/>
                      </a>
                    {:else}
                      <span class="text-app-text">{String(unit.client_name)}</span>
                    {/if}
                    {#if unit.f10_person_id}
                      <span class="application-text-meta mt-1 block text-app-text-muted">Pessoa F10 #{String(unit.f10_person_id)}</span>
                    {/if}
                  </td>
                  <td class="application-text-caption px-4 py-3 align-top">
                    <span class={String(unit.commercial_status) === "Ativo"
                      ? "application-text-meta inline-flex rounded-full bg-app-success-bg px-2.5 py-1 font-semibold text-app-success-text"
                      : "application-text-meta inline-flex rounded-full bg-app-subtle px-2.5 py-1 text-app-text-muted"}>
                      {String(unit.commercial_status)}
                    </span>
                  </td>
                  <td class="application-text-caption px-4 py-3 align-top text-app-text-muted">{String(unit.contracted_plan ?? "—")}</td>
                </tr>
              {/each}
            </tbody>
          </table>
        </div>
      {/if}
      {#if data.importedUnits.pageCount > 1}
        <div class="flex items-center justify-between gap-3 border-t border-app-border-soft px-4 py-3">
          <span class="application-text-caption text-app-text-muted">Página {data.importedUnits.page} de {data.importedUnits.pageCount}</span>
          <div class="flex gap-2">
            {#if data.importedUnits.page > 1}
              <a href={pageHref(data.importedUnits.page - 1)} class="application-text-caption rounded-lg border border-app-border-control px-3 py-2 font-semibold text-app-text">Anterior</a>
            {/if}
            {#if data.importedUnits.page < data.importedUnits.pageCount}
              <a href={pageHref(data.importedUnits.page + 1)} class="application-text-caption rounded-lg bg-app-primary px-3 py-2 font-semibold text-white">Próxima</a>
            {/if}
          </div>
        </div>
      {/if}
    {:else}
      <div class="flex items-center justify-between border-b border-app-border-soft px-4 py-3">
        <strong class="application-text-caption text-app-text">{data.directoryUnavailable ? "Contatos temporariamente indisponíveis" : data.total + " pessoas/contatos"}</strong>
        <span class="application-text-meta text-app-text-muted">Cadastro de atendimento</span>
      </div>
      {#if data.rows.length === 0}
        <p class="application-text-caption px-4 py-12 text-center text-app-text-muted">{data.directoryUnavailable ? "A consulta não pôde ser concluída." : "Nenhuma pessoa encontrada."}</p>
      {:else}
        <div class="overflow-x-auto">
          <table class="w-full min-w-[840px] text-left">
            <thead class="application-text-meta bg-app-subtle text-app-text-muted">
              <tr>
                <th class="px-4 py-3 font-semibold">Pessoa / contato</th>
                <th class="px-4 py-3 font-semibold">Canais</th>
                <th class="px-4 py-3 font-semibold">Atendimento</th>
                <th class="px-4 py-3 font-semibold">Último ticket</th>
                <th class="px-4 py-3 font-semibold">Interação</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-app-border-soft">
              {#each data.rows as customer}
                {@const whatsapp = whatsappHref(customer.whatsapp)}
                <tr class="hover:bg-app-subtle">
                  <td class="px-4 py-3 align-top">
                    <a href={`/app/customers/${customer.id}`} class="application-text-caption font-semibold text-app-primary hover:underline">{customer.name}</a>
                    <div class="application-text-meta mt-1 text-app-text-muted">{customer.organizationName ?? "Sem organização"}</div>
                  </td>
                  <td class="application-text-meta px-4 py-3 align-top">
                    {#if customer.email}<a href={`mailto:${customer.email}`} class="mb-1 flex items-center gap-1.5 text-app-text hover:text-app-primary"><Mail size={13}/>{customer.email}</a>{/if}
                    {#if customer.phone}<a href={`tel:${customer.phone}`} class="mb-1 flex items-center gap-1.5 text-app-text hover:text-app-primary"><Phone size={13}/>{customer.phone}</a>{/if}
                    {#if whatsapp}<a href={whatsapp} target="_blank" rel="noreferrer" class="flex items-center gap-1.5 text-app-success-text"><MessageCircleMore size={13}/>{customer.whatsapp}</a>{/if}
                    {#if !customer.email && !customer.phone && !customer.whatsapp}<span class="text-app-text-muted">Sem canais</span>{/if}
                  </td>
                  <td class="application-text-caption px-4 py-3 align-top">
                    <span class={Number(customer.openTicketCount) > 0 ? "font-semibold text-app-warning-text" : "text-app-text-muted"}>
                      {Number(customer.openTicketCount)} aberto(s)
                    </span>
                  </td>
                  <td class="application-text-caption px-4 py-3 align-top text-app-text-muted">
                    {#if customer.latestTicketNumber}#{customer.latestTicketNumber} · {ticketStatusLabels[customer.latestTicketStatus ?? ""] ?? customer.latestTicketStatus}{:else}Sem tickets{/if}
                  </td>
                  <td class="application-text-meta px-4 py-3 align-top text-app-text-muted">{formatDate(customer.lastInteractionAt ?? customer.updatedAt)}</td>
                </tr>
              {/each}
            </tbody>
          </table>
        </div>
      {/if}
      {#if data.pageCount > 1}
        <div class="flex items-center justify-between gap-3 border-t border-app-border-soft px-4 py-3">
          <span class="application-text-caption text-app-text-muted">Página {data.page} de {data.pageCount}</span>
          <div class="flex gap-2">
            {#if data.page > 1}<a href={pageHref(data.page - 1)} class="application-text-caption rounded-lg border border-app-border-control px-3 py-2 font-semibold text-app-text">Anterior</a>{/if}
            {#if data.page < data.pageCount}<a href={pageHref(data.page + 1)} class="application-text-caption rounded-lg bg-app-primary px-3 py-2 font-semibold text-white">Próxima</a>{/if}
          </div>
        </div>
      {/if}
    {/if}
  </section>
</ApplicationContent>
