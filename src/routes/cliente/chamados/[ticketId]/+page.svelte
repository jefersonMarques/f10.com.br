<script lang="ts">
  import { Clock3, Download, MessageSquare, Paperclip, Send } from "lucide-svelte";
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

  const priorityLabels: Record<string, string> = {
    low: "Baixa",
    normal: "Normal",
    high: "Alta",
    urgent: "Urgente",
  };

  const channelLabels: Record<string, string> = {
    portal: "Portal",
    web_chat: "Chat",
    email: "E-mail",
    whatsapp: "WhatsApp",
    manual: "Suporte",
  };

  type TimelineEntry =
    | { kind: "message"; date: Date; message: PageData["details"]["messages"][number] }
    | { kind: "event"; date: Date; event: PageData["details"]["events"][number] };

  $: timelineEntries = [
    ...data.details.messages.map((message): TimelineEntry => ({
      kind: "message",
      date: new Date(message.createdAt),
      message,
    })),
    ...data.details.events
      .filter((event) => !["portal.customer.message", "ticket.replied"].includes(event.eventType))
      .map((event): TimelineEntry => ({
        kind: "event",
        date: new Date(event.createdAt),
        event,
      })),
  ].sort((left, right) => left.date.getTime() - right.date.getTime());

  function formatDate(value: Date | string | null): string {
    if (!value) return "";
    return new Intl.DateTimeFormat("pt-BR", {
      dateStyle: "short",
      timeStyle: "short",
    }).format(new Date(value));
  }

  function formatBytes(value: number): string {
    if (value < 1024 * 1024) return `${Math.max(1, Math.round(value / 1024))} KB`;
    return `${(value / (1024 * 1024)).toFixed(1)} MB`;
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

  function eventLabel(event: PageData["details"]["events"][number]): string {
    if (event.eventType === "portal.ticket.created" || event.eventType === "ticket.created") {
      return "Chamado aberto";
    }
    if (event.eventType === "ticket.agent.first_viewed") {
      return "Equipe visualizou seu chamado";
    }
    if (event.eventType === "ticket.internal.movement") {
      return "Movimentação interna";
    }
    if (event.eventType === "chat.started") return "Atendimento iniciado pelo chat";
    if (event.eventType === "chat.closed") return "Atendimento de chat encerrado";
    if (event.eventType === "chat.ai.escalated") return "Conversa encaminhada para a equipe F10";
    if (event.eventType === "ticket.status.changed") {
      const status = typeof event.metadata?.status === "string" ? event.metadata.status : "";
      return `Status alterado para ${statusLabels[status] ?? status}`;
    }
    return "Atualização do chamado";
  }
</script>

<svelte:head><title>Chamado #{data.details.ticket.ticketNumber} | F10 Software</title></svelte:head>

<ApplicationContent width="narrow">
  <ApplicationBackLink href="/cliente/chamados" label="Meus chamados" className="mb-3" />

  <section class="rounded-[22px] border border-[#E1E4EC] bg-white p-5 shadow-[0_10px_32px_rgba(1,13,40,0.04)] sm:p-6">
    <div class="flex flex-wrap items-center gap-2">
      <span class="application-text-caption font-bold uppercase tracking-[0.1em] text-[#EA6D0B]">Chamado #{data.details.ticket.ticketNumber}</span>
      <span class="application-text-meta rounded-full bg-[#F1F3F7] px-2.5 py-1 font-semibold text-[#626A7B]">{statusLabels[data.details.ticket.status] ?? data.details.ticket.status}</span>
      <span class="application-text-meta rounded-full bg-[#F6F7F9] px-2.5 py-1 font-semibold text-[#6A7180]">Prioridade {priorityLabels[data.details.ticket.priority] ?? data.details.ticket.priority}</span>
    </div>
    <h1 class="mt-3 text-[22px] font-semibold tracking-[-0.03em] text-[#010D28] sm:text-[26px]">{data.details.ticket.subject}</h1>

    <dl class="mt-5 grid gap-3 rounded-2xl bg-[#F8F9FB] p-4 sm:grid-cols-2">
      <div><dt class="application-text-meta text-[#9298A5]">Grupo</dt><dd class="mt-0.5 text-[12px] font-semibold text-[#424A5B]">{data.details.context.groupName}</dd></div>
      <div><dt class="application-text-meta text-[#9298A5]">Escola</dt><dd class="mt-0.5 text-[12px] font-semibold text-[#424A5B]">{data.details.context.unitName}</dd></div>
      <div><dt class="application-text-meta text-[#9298A5]">Origem</dt><dd class="mt-0.5 text-[12px] font-semibold text-[#424A5B]">{channelLabels[data.details.ticket.channel] ?? data.details.ticket.channel}</dd></div>
      <div><dt class="application-text-meta text-[#9298A5]">Aberto em</dt><dd class="mt-0.5 text-[12px] font-semibold text-[#424A5B]">{formatDate(data.details.ticket.createdAt)}</dd></div>
    </dl>

    <div class="application-text-meta mt-4 flex flex-wrap gap-x-5 gap-y-2 text-[#858C9C]">
      <span>Atualizado {formatDate(data.details.ticket.updatedAt)}</span>
      <span class={`inline-flex items-center gap-1.5 font-semibold ${dueLabel().startsWith("Prazo excedido") ? "text-[#A44E3B]" : "text-[#5F687B]"}`}><Clock3 size={13} />{dueLabel()}</span>
    </div>
  </section>

  <section class="mt-4 overflow-hidden rounded-[22px] border border-[#E1E4EC] bg-white">
    <header class="border-b border-[#ECEEF3] px-5 py-4 sm:px-6">
      <div class="flex items-center gap-2"><MessageSquare size={16} class="text-[#000A57]" /><h2 class="text-[14px] font-semibold text-[#303746]">Histórico do atendimento</h2></div>
      <p class="application-text-meta mt-1 text-[#8B91A0]">Aqui aparecem suas mensagens, respostas e sinais de andamento. Detalhes do processo interno da equipe permanecem privados.</p>
    </header>

    <div class="space-y-4 bg-[#F8F9FB] px-4 py-5 sm:px-6 sm:py-6">
      {#each timelineEntries as entry}
        {#if entry.kind === "message"}
          <div class={`flex ${entry.message.authorType === "customer" ? "justify-end" : "justify-start"}`}>
            <div class={`max-w-[88%] rounded-2xl px-4 py-3 ${entry.message.authorType === "customer" ? "bg-[#000A57] text-white" : "border border-[#E0E4EC] bg-white text-[#343B4C]"}`}>
              {#if entry.message.body}<p class="whitespace-pre-wrap text-[12px] leading-5">{entry.message.body}</p>{/if}
              {#if entry.message.attachments.length > 0}
                <div class={`space-y-2 ${entry.message.body ? "mt-3" : ""}`}>
                  {#each entry.message.attachments as attachment}
                    <a href={attachment.href} target="_blank" rel="noopener noreferrer" class={`flex items-center gap-2 rounded-xl border px-3 py-2 text-[11px] font-semibold ${entry.message.authorType === "customer" ? "border-white/20 bg-white/10 text-white" : "border-[#E1E4EC] bg-[#F8F9FB] text-[#4F5768]"}`}>
                      <Paperclip size={14} />
                      <span class="min-w-0 flex-1 truncate">{attachment.originalName}</span>
                      <span class="shrink-0 opacity-60">{formatBytes(attachment.sizeBytes)}</span>
                      <Download size={13} class="shrink-0" />
                    </a>
                  {/each}
                </div>
              {/if}
              <span class={`application-text-meta mt-2 block ${entry.message.authorType === "customer" ? "text-white/55" : "text-[#969CAA]"}`}>{entry.message.authorType === "customer" ? "Você" : "Equipe F10"} · {formatDate(entry.message.createdAt)}</span>
            </div>
          </div>
        {:else}
          <div class="flex items-center gap-3 py-1">
            <div class="h-px flex-1 bg-[#E0E3EA]"></div>
            <span class="application-text-meta rounded-full border border-[#E0E3EA] bg-white px-3 py-1.5 text-center font-semibold text-[#747B8A]">{eventLabel(entry.event)} · {formatDate(entry.event.createdAt)}</span>
            <div class="h-px flex-1 bg-[#E0E3EA]"></div>
          </div>
        {/if}
      {/each}
    </div>

    {#if data.details.ticket.status !== "closed"}
      <div class="border-t border-[#E6E8EF] px-5 py-5 sm:px-6">
        {#if form?.message}
          <div class={`application-text-caption mb-4 rounded-xl px-3 py-2 ${form.success ? "bg-[#F2FAF4] text-[#356347]" : "bg-[#FFF4F1] text-[#914D3D]"}`}>{form.message}</div>
        {/if}
        <form method="POST" action="?/reply" enctype="multipart/form-data">
          <label for="ticket-reply" class="application-text-caption font-semibold text-[#555D6E]">Responder ao suporte</label>
          <textarea id="ticket-reply" name="body" maxlength="4000" rows="5" placeholder="Escreva sua mensagem..." class="mt-2 w-full resize-y rounded-2xl border border-[#DDE1E9] px-4 py-3 text-[12px] leading-5 outline-none focus:border-[#000A57] focus:ring-4 focus:ring-[#000A57]/10">{form && "body" in form ? form.body ?? "" : ""}</textarea>
          <div class="mt-3 rounded-xl border border-dashed border-[#D7DBE4] bg-[#FAFBFC] p-3">
            <label class="flex items-center gap-2 text-[11px] font-semibold text-[#5C6475]"><Paperclip size={14} />Adicionar imagens ou PDF</label>
            <input type="file" name="files" multiple accept="image/png,image/jpeg,image/webp,application/pdf" class="application-text-control mt-2 block w-full text-[#687081]" />
            <p class="application-text-meta mt-1 text-[#969CAA]">Até 4 arquivos, 10 MB por arquivo.</p>
          </div>
          <button type="submit" class="mt-3 inline-flex min-h-11 items-center gap-2 rounded-xl bg-[#000A57] px-5 text-[11px] font-semibold text-white"><Send size={15} />Enviar resposta</button>
        </form>
      </div>
    {/if}
  </section>
</ApplicationContent>
