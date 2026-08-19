<script lang="ts">
  import { ArrowRight, Clock3, Inbox } from "lucide-svelte";
  import ApplicationContent from "$lib/components/application/ApplicationContent.svelte";
  import type { PageData } from "./$types";

  export let data: PageData;

  const statusLabels: Record<string, string> = {
    new: "Aguardando atendimento",
    open: "Aberto",
    in_progress: "Em atendimento",
    waiting_customer: "Aguardando você",
    resolved: "Resolvido",
    closed: "Fechado",
  };

  function formatDate(value: Date | string | null): string {
    if (!value) return "";
    const date = new Date(value);
    return new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" }).format(date);
  }

  function slaLabel(ticket: PageData["tickets"][number]): string {
    if (ticket.status === "resolved" || ticket.status === "closed") return "Atendimento concluído";
    const due = ticket.firstResponseAt ? ticket.resolutionDueAt : ticket.firstResponseDueAt;
    if (!due) return "Prazo em acompanhamento";
    const difference = new Date(due).getTime() - Date.now();
    if (difference < 0) return "Prazo excedido";
    const hours = Math.max(1, Math.ceil(difference / 3_600_000));
    return hours < 24 ? `Prazo: ${hours}h restantes` : `Prazo: ${Math.ceil(hours / 24)}d restantes`;
  }
</script>

<svelte:head><title>Meus chamados | F10 Software</title></svelte:head>

<ApplicationContent width="narrow">
  <div class="mb-3 flex justify-end">
    <a href="/ajuda-f10" class="text-[11px] font-semibold text-[#000A57] hover:underline">Consultar Central de Ajuda</a>
  </div>

  {#if data.tickets.length === 0}
    <section class="rounded-[22px] border border-dashed border-[#CBD1DE] bg-white px-6 py-12 text-center">
      <Inbox size={30} class="mx-auto text-[#9BA1AE]" />
      <h2 class="mt-4 text-[17px] font-semibold text-[#303746]">Nenhum chamado encontrado</h2>
      <p class="mx-auto mt-2 max-w-[520px] text-[11px] leading-5 text-[#777E8D]">Quando você iniciar um atendimento com este e-mail, o chamado aparecerá aqui.</p>
      <a href="/ajuda-f10" class="mt-5 inline-flex min-h-11 items-center justify-center rounded-xl bg-[#000A57] px-5 text-[11px] font-semibold text-white">Ir para a Central de Ajuda</a>
    </section>
  {:else}
    <div class="space-y-3">
      {#each data.tickets as ticket}
        <a href={`/cliente/chamados/${ticket.id}`} class="group block rounded-[22px] border border-[#E1E4EC] bg-white p-5 shadow-[0_8px_28px_rgba(1,13,40,0.035)] transition hover:border-[#C8CEDB] hover:shadow-[0_12px_32px_rgba(1,13,40,0.07)]">
          <div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div class="min-w-0">
              <div class="flex flex-wrap items-center gap-2">
                <span class="text-[9px] font-bold uppercase tracking-[0.08em] text-[#EA6D0B]">Chamado #{ticket.ticketNumber}</span>
                <span class="rounded-full bg-[#F1F3F7] px-2.5 py-1 text-[9px] font-semibold text-[#626A7B]">{statusLabels[ticket.status] ?? ticket.status}</span>
              </div>
              <h2 class="mt-2 truncate text-[15px] font-semibold text-[#252C3D] group-hover:text-[#000A57]">{ticket.subject}</h2>
              <p class="mt-1.5 text-[9px] text-[#9298A5]">Atualizado {formatDate(ticket.updatedAt)}</p>
            </div>
            <div class="flex shrink-0 items-center justify-between gap-4 sm:justify-end">
              <span class={`inline-flex items-center gap-1.5 text-[9px] font-semibold ${slaLabel(ticket) === "Prazo excedido" ? "text-[#A44E3B]" : "text-[#687083]"}`}><Clock3 size={13} />{slaLabel(ticket)}</span>
              <ArrowRight size={17} class="text-[#000A57]" />
            </div>
          </div>
        </a>
      {/each}
    </div>
  {/if}
</ApplicationContent>
