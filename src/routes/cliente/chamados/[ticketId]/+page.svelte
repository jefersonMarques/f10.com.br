<script lang="ts">
  import { Clock3, Send } from "lucide-svelte";
  import ApplicationBackLink from "$lib/components/application/ApplicationBackLink.svelte";
  import ApplicationContent from "$lib/components/application/ApplicationContent.svelte";
  import type { ActionData, PageData } from "./$types";

  export let data: PageData;
  export let form: ActionData;

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
    return new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" }).format(new Date(value));
  }

  function dueLabel(): string {
    const ticket = data.details.ticket;
    if (ticket.status === "resolved" || ticket.status === "closed") return "Atendimento concluído";
    const due = ticket.firstResponseAt ? ticket.resolutionDueAt : ticket.firstResponseDueAt;
    if (!due) return "Prazo em acompanhamento";
    return new Date(due).getTime() < Date.now()
      ? `Prazo excedido desde ${formatDate(due)}`
      : `Prazo até ${formatDate(due)}`;
  }
</script>

<svelte:head><title>Chamado #{data.details.ticket.ticketNumber} | F10 Software</title></svelte:head>

<ApplicationContent width="narrow">
  <ApplicationBackLink href="/cliente/chamados" label="Meus chamados" className="mb-3" />

  <section class="rounded-[22px] border border-[#E1E4EC] bg-white p-5 shadow-[0_10px_32px_rgba(1,13,40,0.04)] sm:p-6">
    <div class="flex flex-wrap items-center gap-2">
      <span class="application-text-caption font-bold uppercase tracking-[0.1em] text-[#EA6D0B]">Chamado #{data.details.ticket.ticketNumber}</span>
      <span class="application-text-meta rounded-full bg-[#F1F3F7] px-2.5 py-1 font-semibold text-[#626A7B]">{statusLabels[data.details.ticket.status] ?? data.details.ticket.status}</span>
    </div>
    <h2 class="mt-3 text-[22px] font-semibold tracking-[-0.03em] text-[#010D28] sm:text-[26px]">{data.details.ticket.subject}</h2>
    <div class="application-text-meta mt-4 flex flex-wrap gap-x-5 gap-y-2 text-[#858C9C]">
      <span>Criado {formatDate(data.details.ticket.createdAt)}</span>
      <span>Atualizado {formatDate(data.details.ticket.updatedAt)}</span>
      <span class={`inline-flex items-center gap-1.5 font-semibold ${dueLabel().startsWith("Prazo excedido") ? "text-[#A44E3B]" : "text-[#5F687B]"}`}><Clock3 size={13} />{dueLabel()}</span>
    </div>
  </section>

  <section class="mt-4 overflow-hidden rounded-[22px] border border-[#E1E4EC] bg-white">
    <header class="border-b border-[#ECEEF3] px-5 py-4 sm:px-6"><h2 class="text-[14px] font-semibold text-[#303746]">Histórico público</h2><p class="application-text-meta mt-1 text-[#8B91A0]">Notas internas da equipe F10 nunca aparecem nesta área.</p></header>
    <div class="space-y-4 bg-[#F8F9FB] px-4 py-5 sm:px-6 sm:py-6">
      {#each data.details.messages as message}
        <div class={`flex ${message.authorType === "customer" ? "justify-end" : "justify-start"}`}>
          <div class={`max-w-[86%] rounded-2xl px-4 py-3 ${message.authorType === "customer" ? "bg-[#000A57] text-white" : "border border-[#E0E4EC] bg-white text-[#343B4C]"}`}>
            <p class="whitespace-pre-wrap text-[12px] leading-5">{message.body}</p>
            <span class={`application-text-meta mt-1.5 block ${message.authorType === "customer" ? "text-white/55" : "text-[#969CAA]"}`}>{message.authorType === "customer" ? "Você" : "Equipe F10"} · {formatDate(message.createdAt)}</span>
          </div>
        </div>
      {/each}
    </div>

    {#if data.details.ticket.status !== "closed"}
      <div class="border-t border-[#E6E8EF] px-5 py-5 sm:px-6">
        {#if form?.message}
          <div class={`application-text-caption mb-4 rounded-xl px-3 py-2 ${form.success ? "bg-[#F2FAF4] text-[#356347]" : "bg-[#FFF4F1] text-[#914D3D]"}`}>{form.message}</div>
        {/if}
        <form method="POST" action="?/reply">
          <label for="ticket-reply" class="application-text-caption font-semibold text-[#555D6E]">Responder ao suporte</label>
          <textarea id="ticket-reply" name="body" required maxlength="4000" rows="5" class="mt-2 w-full resize-y rounded-2xl border border-[#DDE1E9] px-4 py-3 text-[12px] leading-5 outline-none focus:border-[#000A57] focus:ring-4 focus:ring-[#000A57]/10">{form && "body" in form ? form.body ?? "" : ""}</textarea>
          <button type="submit" class="mt-3 inline-flex min-h-11 items-center gap-2 rounded-xl bg-[#000A57] px-5 text-[11px] font-semibold text-white"><Send size={15} />Enviar mensagem</button>
        </form>
      </div>
    {/if}
  </section>
</ApplicationContent>
