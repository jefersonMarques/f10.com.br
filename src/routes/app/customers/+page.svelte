<script lang="ts">
  import { Building2, Mail, MessageCircleMore, Phone, Search } from "lucide-svelte";
  import ApplicationContent from "$lib/components/application/ApplicationContent.svelte";
  import type { PageData } from "./$types";

  export let data: PageData;

  const ticketStatusLabels: Record<string, string> = {
    new: "Novo",
    open: "Aberto",
    in_progress: "Em andamento",
    waiting_customer: "Aguardando cliente",
    resolved: "Resolvido",
    closed: "Fechado",
  };

  function formatDate(value: string | Date | null): string {
    if (!value) return "Sem interação";
    return new Intl.DateTimeFormat("pt-BR", {
      dateStyle: "short",
      timeStyle: "short",
    }).format(new Date(value));
  }

  function whatsappHref(value: string | null): string | null {
    if (!value) return null;
    const digits = value.replace(/\D/g, "");
    return digits.length >= 10 ? `https://wa.me/${digits}` : null;
  }

  function pageHref(page: number): string {
    const params = new URLSearchParams();
    if (data.query) params.set("q", data.query);
    if (page > 1) params.set("page", String(page));
    const query = params.toString();
    return query ? `/app/customers?${query}` : "/app/customers";
  }
</script>

<svelte:head><title>Clientes | F10 Operations</title></svelte:head>

<ApplicationContent width="wide">
  <section class="overflow-hidden rounded-[22px] border border-[#E2E5ED] bg-white">
    <div class="flex flex-col gap-3 border-b border-[#EEF0F5] p-4 sm:flex-row sm:items-center sm:justify-between">
      <form method="GET" class="flex min-w-0 flex-1 gap-2 sm:max-w-[620px]">
        <label class="relative min-w-0 flex-1">
          <Search size={15} class="absolute left-3 top-1/2 -translate-y-1/2 text-[#9499A5]"/>
          <input name="q" value={data.query} placeholder="Buscar cliente, escola, e-mail, telefone ou WhatsApp" class="application-text-caption h-10 w-full rounded-xl border border-[#DDE1EA] bg-[#FAFAFC] pl-9 pr-3 outline-none focus:border-[#000A57]"/>
        </label>
        <button type="submit" class="application-text-caption h-10 rounded-xl bg-[#000A57] px-4 font-semibold text-white">Buscar</button>
      </form>
      <div class="application-text-caption flex items-center gap-2 text-[#777D8D]"><Building2 size={15}/><strong class="text-[#303746]">{data.total}</strong> cliente(s)</div>
    </div>

    {#if data.rows.length === 0}
      <div class="application-text-caption px-5 py-16 text-center text-[#858B99]">Nenhum cliente encontrado para este filtro.</div>
    {:else}
      <div class="overflow-x-auto">
        <table class="w-full min-w-[1080px] text-left">
          <thead class="application-text-meta bg-[#FAFAFC] uppercase tracking-[0.08em] text-[#9297A5]">
            <tr>
              <th class="px-5 py-3 font-semibold">Cliente</th>
              <th class="px-4 py-3 font-semibold">Contato</th>
              <th class="px-4 py-3 font-semibold">Unidade</th>
              <th class="px-4 py-3 font-semibold">Atendimento</th>
              <th class="px-4 py-3 font-semibold">Último ticket</th>
              <th class="px-5 py-3 font-semibold">Última interação</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-[#EEF0F5]">
            {#each data.rows as customer}
              {@const whatsapp = whatsappHref(customer.whatsapp)}
              <tr class="transition hover:bg-[#FAFAFC]">
                <td class="px-5 py-4 align-top">
                  <a href={`/app/customers/${customer.id}`} class="block min-w-0">
                    <div class="flex items-center gap-2">
                      <span class={`h-2 w-2 shrink-0 rounded-full ${customer.active ? "bg-[#35A65A]" : "bg-[#B8BDC8]"}`}></span>
                      <strong class="application-text-caption truncate text-[#303746] hover:underline">{customer.name}</strong>
                    </div>
                    <span class="application-text-meta mt-1 block truncate text-[#858B99]">{customer.organizationName ?? "Sem escola / organização vinculada"}</span>
                  </a>
                </td>
                <td class="px-4 py-4 align-top">
                  <div class="application-text-meta space-y-1 text-[#687080]">
                    {#if customer.email}<a href={`mailto:${customer.email}`} class="flex items-center gap-1.5 hover:text-[#000A57]"><Mail size={11}/><span class="max-w-[220px] truncate">{customer.email}</span></a>{/if}
                    {#if customer.phone}<a href={`tel:${customer.phone}`} class="flex items-center gap-1.5 hover:text-[#000A57]"><Phone size={11}/>{customer.phone}</a>{/if}
                    {#if whatsapp}<a href={whatsapp} target="_blank" rel="noreferrer" class="flex items-center gap-1.5 font-semibold text-[#2F7045]"><MessageCircleMore size={11}/>WhatsApp {customer.whatsapp}</a>{:else if customer.whatsapp}<span class="flex items-center gap-1.5"><MessageCircleMore size={11}/>{customer.whatsapp}</span>{/if}
                    {#if !customer.email && !customer.phone && !customer.whatsapp}<span class="text-[#A0A5B0]">Sem canais cadastrados</span>{/if}
                  </div>
                </td>
                <td class="px-4 py-4 align-top">
                  <strong class="application-text-meta block text-[#4E5565]">{customer.latestUnitName ?? "Sem unidade identificada"}</strong>
                  {#if customer.latestGroupName}<span class="application-text-meta mt-1 block text-[#9297A5]">{customer.latestGroupName}</span>{/if}
                </td>
                <td class="px-4 py-4 align-top">
                  <div class="flex flex-wrap gap-1.5">
                    <span class={`application-text-meta rounded-full px-2 py-1 font-bold ${Number(customer.openTicketCount) > 0 ? "bg-[#FFF0E5] text-[#A9510D]" : "bg-[#EEF8F1] text-[#2F7045]"}`}>{Number(customer.openTicketCount)} aberto(s)</span>
                    {#if Number(customer.assignedTicketCount) > 0}<span class="application-text-meta rounded-full bg-[#EEF0FF] px-2 py-1 font-bold text-[#000A57]">{Number(customer.assignedTicketCount)} atribuído(s)</span>{/if}
                    {#if Number(customer.activeChatCount) > 0}<span class="application-text-meta rounded-full bg-[#FFF0F0] px-2 py-1 font-bold text-[#9B3C3C]">{Number(customer.activeChatCount)} chat(s)</span>{/if}
                  </div>
                </td>
                <td class="px-4 py-4 align-top">
                  {#if customer.latestTicketNumber}
                    <span class="application-text-meta block font-bold text-[#EA6D0B]">#{customer.latestTicketNumber}</span>
                    <span class="application-text-meta mt-1 block text-[#687080]">{ticketStatusLabels[customer.latestTicketStatus ?? ""] ?? customer.latestTicketStatus}</span>
                  {:else}
                    <span class="application-text-meta text-[#A0A5B0]">Sem tickets</span>
                  {/if}
                </td>
                <td class="application-text-meta px-5 py-4 align-top text-[#687080]">{formatDate(customer.lastInteractionAt ?? customer.updatedAt)}</td>
              </tr>
            {/each}
          </tbody>
        </table>
      </div>

      {#if data.pageCount > 1}
        <div class="flex items-center justify-between border-t border-[#EEF0F5] px-5 py-3">
          <span class="application-text-meta text-[#858B99]">Página {data.page} de {data.pageCount}</span>
          <div class="flex gap-2">
            {#if data.page > 1}<a href={pageHref(data.page - 1)} class="application-text-caption inline-flex h-9 items-center rounded-lg border border-[#DDE1EA] px-3 font-semibold text-[#4E5565]">Anterior</a>{/if}
            {#if data.page < data.pageCount}<a href={pageHref(data.page + 1)} class="application-text-caption inline-flex h-9 items-center rounded-lg bg-[#000A57] px-3 font-semibold text-white">Próxima</a>{/if}
          </div>
        </div>
      {/if}
    {/if}
  </section>
</ApplicationContent>
