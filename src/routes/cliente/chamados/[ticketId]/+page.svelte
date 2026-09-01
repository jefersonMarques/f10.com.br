<script lang="ts">
  import {
    Activity,
    CalendarDays,
    CircleAlert,
    Clock3,
    Download,
    Eye,
    Flag,
    Globe2,
    MessageSquare,
    Paperclip,
    School,
    Send,
    Users,
  } from "lucide-svelte";
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

  function statusClass(status: string): string {
    if (status === "waiting_customer") return "bg-[#FFF4E8] text-[#9A541A]";
    if (status === "resolved" || status === "closed") return "bg-[#EEF7F1] text-[#3F7257]";
    if (status === "in_progress") return "bg-[#EEF0FF] text-[#303C91]";
    if (status === "new") return "bg-[#FFF2E7] text-[#A9500C]";
    return "bg-[#F1F3F7] text-[#626A7B]";
  }

  function priorityClass(priority: string): string {
    if (priority === "urgent") return "bg-[#FFF0ED] text-[#A04435]";
    if (priority === "high") return "bg-[#FFF4E8] text-[#9A541A]";
    return "bg-[#F4F5F8] text-[#6A7180]";
  }
</script>

<svelte:head><title>Chamado #{data.details.ticket.ticketNumber} | F10 Software</title></svelte:head>

<ApplicationContent width="standard" className="pb-10">
  <ApplicationBackLink href="/cliente/chamados" label="Meus chamados" className="mb-4" />

  <section class="rounded-[22px] border border-[#E1E4EC] bg-white p-5 shadow-[0_10px_32px_rgba(1,13,40,0.04)] sm:p-6">
    <div class="flex items-start gap-4 sm:gap-5">
      <div class="hidden h-[68px] w-[68px] shrink-0 items-center justify-center rounded-2xl bg-[#FFF0E4] text-[#EA6D0B] sm:flex"><CircleAlert size={31} strokeWidth={1.8} /></div>
      <div class="min-w-0 flex-1">
        <div class="flex flex-wrap items-center gap-2">
          <span class="application-text-caption font-bold uppercase tracking-[0.1em] text-[#EA6D0B]">Chamado #{data.details.ticket.ticketNumber}</span>
          <span class={`application-text-meta rounded-full px-2.5 py-1 font-semibold ${statusClass(data.details.ticket.status)}`}>{statusLabels[data.details.ticket.status] ?? data.details.ticket.status}</span>
          <span class={`application-text-meta rounded-full px-2.5 py-1 font-semibold ${priorityClass(data.details.ticket.priority)}`}>Prioridade {priorityLabels[data.details.ticket.priority] ?? data.details.ticket.priority}</span>
        </div>
        <h1 class="mt-3 text-[24px] font-semibold tracking-[-0.035em] text-[#010D28] sm:text-[28px]">{data.details.ticket.subject}</h1>
      </div>
    </div>

    <dl class="mt-5 grid overflow-hidden rounded-2xl border border-[#E7E9EF] bg-[#FAFBFC] sm:grid-cols-2 lg:grid-cols-4">
      <div class="border-b border-[#E7E9EF] p-4 sm:border-r lg:border-b-0">
        <dt class="application-text-meta inline-flex items-center gap-1.5 font-medium text-[#9298A5]"><Users size={13} />Grupo</dt>
        <dd class="mt-1 text-[12px] font-semibold text-[#424A5B]">{data.details.context.groupName}</dd>
      </div>
      <div class="border-b border-[#E7E9EF] p-4 lg:border-b-0 lg:border-r">
        <dt class="application-text-meta inline-flex items-center gap-1.5 font-medium text-[#9298A5]"><School size={13} />Escola</dt>
        <dd class="mt-1 text-[12px] font-semibold text-[#424A5B]">{data.details.context.unitName}</dd>
      </div>
      <div class="border-b border-[#E7E9EF] p-4 sm:border-r sm:border-b-0">
        <dt class="application-text-meta inline-flex items-center gap-1.5 font-medium text-[#9298A5]">
          {#if data.details.ticket.channel === "web_chat"}<MessageSquare size={13} />{:else}<Globe2 size={13} />{/if}
          Origem
        </dt>
        <dd class="mt-1 text-[12px] font-semibold text-[#424A5B]">{channelLabels[data.details.ticket.channel] ?? data.details.ticket.channel}</dd>
      </div>
      <div class="p-4">
        <dt class="application-text-meta inline-flex items-center gap-1.5 font-medium text-[#9298A5]"><CalendarDays size={13} />Aberto em</dt>
        <dd class="mt-1 text-[12px] font-semibold text-[#424A5B]">{formatDate(data.details.ticket.createdAt)}</dd>
      </div>
    </dl>

    <div class="application-text-meta mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 text-[#858C9C]">
      <span class="inline-flex items-center gap-1.5"><Clock3 size={13} />Atualizado {formatDate(data.details.ticket.updatedAt)}</span>
      <span class={`inline-flex items-center gap-1.5 font-semibold ${dueLabel().startsWith("Prazo excedido") ? "text-[#A44E3B]" : "text-[#5F687B]"}`}><Activity size={13} />{dueLabel()}</span>
    </div>
  </section>

  <section class="mt-4 overflow-hidden rounded-[22px] border border-[#E1E4EC] bg-white shadow-[0_8px_28px_rgba(1,13,40,0.025)]">
    <header class="border-b border-[#ECEEF3] px-5 py-4 sm:px-6">
      <div class="flex items-center gap-2">
        <MessageSquare size={16} class="text-[#000A57]" />
        <h2 class="text-[15px] font-semibold text-[#303746]">Histórico do atendimento</h2>
      </div>
      <p class="application-text-meta mt-1 max-w-[760px] text-[#8B91A0]">Aqui aparecem suas mensagens, respostas e sinais de andamento. Detalhes do processo interno da equipe permanecem privados.</p>
    </header>

    <div class="relative bg-[#FBFCFD] px-4 py-6 sm:px-6 sm:py-7">
      <div class="absolute bottom-8 left-1/2 top-8 hidden w-px -translate-x-1/2 bg-[#E3E6ED] md:block"></div>

      <div class="relative space-y-5">
        {#each timelineEntries as entry}
          {#if entry.kind === "message"}
            <div class={`relative z-10 flex ${entry.message.authorType === "customer" ? "justify-end" : "justify-start"}`}>
              <div class={`flex w-full items-end gap-2 md:w-[48%] ${entry.message.authorType === "customer" ? "justify-end" : "justify-start"}`}>
                {#if entry.message.authorType !== "customer"}
                  <div class="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-[#DDE2EC] bg-white text-[10px] font-bold text-[#000A57] shadow-sm">F10</div>
                {/if}

                <div class={`max-w-[88%] rounded-2xl px-4 py-3 shadow-[0_5px_16px_rgba(1,13,40,0.045)] ${entry.message.authorType === "customer" ? "bg-[#000A57] text-white" : "border border-[#E0E4EC] bg-white text-[#343B4C]"}`}>
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
                  <span class={`application-text-meta mt-2 block ${entry.message.authorType === "customer" ? "text-white/60" : "text-[#969CAA]"}`}>{entry.message.authorType === "customer" ? "Você" : "Equipe F10"} · {formatDate(entry.message.createdAt)}</span>
                </div>

                {#if entry.message.authorType === "customer"}
                  <div class="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#EAF0FF] text-[10px] font-bold text-[#000A57]">VC</div>
                {/if}
              </div>
            </div>
          {:else}
            <div class="relative z-10 flex justify-center py-0.5">
              <span class="application-text-meta inline-flex max-w-[94%] items-center gap-2 rounded-full border border-[#DDE2EA] bg-white px-3.5 py-2 text-center font-semibold text-[#687081] shadow-[0_3px_12px_rgba(1,13,40,0.025)]">
                <span class="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#F0F2FF] text-[#5262D9]">
                  {#if entry.event.eventType === "ticket.agent.first_viewed"}
                    <Eye size={12} />
                  {:else if entry.event.eventType === "portal.ticket.created" || entry.event.eventType === "ticket.created"}
                    <Flag size={12} />
                  {:else}
                    <Activity size={12} />
                  {/if}
                </span>
                {eventLabel(entry.event)}
                <span class="font-normal text-[#9A9FAC]">· {formatDate(entry.event.createdAt)}</span>
              </span>
            </div>
          {/if}
        {/each}

        <div class="relative z-10 flex justify-center pt-1">
          <div class="application-text-meta inline-flex items-center gap-2 rounded-xl border border-dashed border-[#D8DDE7] bg-[#F8F9FB] px-4 py-2 text-center text-[#9A9FAC]"><Activity size={12} />Novas atualizações aparecerão aqui</div>
        </div>
      </div>
    </div>

    {#if data.details.ticket.status !== "closed"}
      <div class="border-t border-[#E6E8EF] bg-white px-5 py-5 sm:px-6 sm:py-6">
        {#if form?.message}
          <div class={`application-text-caption mb-4 rounded-xl px-3 py-2 ${form.success ? "bg-[#F2FAF4] text-[#356347]" : "bg-[#FFF4F1] text-[#914D3D]"}`}>{form.message}</div>
        {/if}

        <form method="POST" action="?/reply" enctype="multipart/form-data">
          <label for="ticket-reply" class="text-[12px] font-semibold text-[#454D5E]">Responder ao suporte</label>
          <textarea id="ticket-reply" name="body" maxlength="4000" rows="5" placeholder="Escreva sua mensagem..." class="mt-2 w-full resize-y rounded-2xl border border-[#DDE1E9] bg-white px-4 py-3 text-[12px] leading-5 outline-none transition focus:border-[#000A57] focus:ring-4 focus:ring-[#000A57]/10">{form && "body" in form ? form.body ?? "" : ""}</textarea>

          <label for="ticket-files" class="mt-3 flex cursor-pointer items-center gap-3 rounded-2xl border border-dashed border-[#CDD4E1] bg-[#FAFBFC] px-4 py-4 transition hover:border-[#AEB8CA] hover:bg-[#F7F9FC]">
            <span class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#EEF0FF] text-[#000A57]"><Paperclip size={17} /></span>
            <span class="min-w-0">
              <span class="block text-[11px] font-semibold text-[#4F5768]">Adicionar imagens ou PDF</span>
              <span class="application-text-meta mt-0.5 block text-[#969CAA]">Clique para selecionar até 4 arquivos de no máximo 10 MB cada.</span>
            </span>
          </label>
          <input id="ticket-files" type="file" name="files" multiple accept="image/png,image/jpeg,image/webp,application/pdf" class="sr-only" />

          <div class="mt-3 flex justify-end">
            <button type="submit" class="inline-flex min-h-11 items-center gap-2 rounded-xl bg-[#000A57] px-5 text-[11px] font-semibold text-white transition hover:bg-[#111B71]"><Send size={15} />Enviar resposta</button>
          </div>
        </form>
      </div>
    {:else}
      <div class="border-t border-[#E6E8EF] bg-[#FAFBFC] px-5 py-4 text-center sm:px-6">
        <p class="application-text-meta text-[#7F8796]">Este chamado foi fechado e não aceita novas respostas.</p>
      </div>
    {/if}
  </section>
</ApplicationContent>
