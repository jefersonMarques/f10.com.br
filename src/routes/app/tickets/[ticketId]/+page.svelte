<script lang="ts">
  import {
    ArrowLeft,
    Building2,
    CheckCircle2,
    CircleAlert,
    Headphones,
    MessageSquare,
    MonitorCog,
    ShieldCheck,
    UserRound,
  } from "lucide-svelte";
  import type { ActionData, PageData } from "./$types";

  export let data: PageData;
  export let form: ActionData;

  const statusLabels: Record<string, string> = {
    new: "Novo",
    open: "Aberto",
    in_progress: "Em andamento",
    waiting_customer: "Aguardando cliente",
    resolved: "Resolvido",
    closed: "Fechado",
  };

  const priorityLabels: Record<string, string> = {
    low: "Baixa",
    normal: "Normal",
    high: "Alta",
    urgent: "Urgente",
  };

  const eventLabels: Record<string, string> = {
    "ticket.created": "criou o ticket",
    "ticket.replied": "registrou uma resposta",
    "ticket.note.added": "adicionou uma nota interna",
    "ticket.status.changed": "alterou o status",
    "ticket.priority.changed": "alterou a prioridade",
    "ticket.assignee.changed": "alterou o responsável",
    "remote.enrollment.requested": "enviou o instalador de suporte remoto",
    "remote.device.enrolled": "vinculou um computador ao suporte remoto",
    "remote.requested": "solicitou acesso remoto",
    "remote.authorized": "teve o acesso remoto autorizado",
    "remote.denied": "teve o acesso remoto recusado",
    "remote.started": "iniciou o acesso remoto",
    "remote.ended": "encerrou o acesso remoto",
  };

  function formatDateTime(value: string | Date): string {
    return new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" }).format(new Date(value));
  }
</script>

<svelte:head><title>Ticket #{data.details.ticket.ticketNumber} | F10 Operations</title></svelte:head>

<div class="mx-auto max-w-[1320px] px-5 py-7 sm:px-8 sm:py-9">
  <a href="/app/tickets" class="inline-flex min-h-10 items-center gap-2 rounded-xl px-2 text-[12px] font-semibold text-[#5F6575] transition hover:bg-white hover:text-[#000A57]"><ArrowLeft size={17}/>Voltar para tickets</a>

  <div class="mt-5 flex flex-col justify-between gap-5 lg:flex-row lg:items-end">
    <div class="min-w-0">
      <div class="flex flex-wrap items-center gap-2"><span class="text-[11px] font-bold text-[#EA6D0B]">#{data.details.ticket.ticketNumber}</span><span class="rounded-full bg-[#EEF0FF] px-3 py-1.5 text-[10px] font-bold text-[#000A57]">{statusLabels[data.details.ticket.status]}</span><span class="rounded-full bg-[#F3F4F7] px-3 py-1.5 text-[10px] font-semibold text-[#737989]">{priorityLabels[data.details.ticket.priority]}</span></div>
      <h1 class="mt-3 text-[30px] font-semibold tracking-[-0.035em] text-[#010D28] sm:text-[38px]">{data.details.ticket.subject}</h1>
      <p class="mt-2 text-[11px] text-[#808695]">{data.details.ticket.queueName} · aberto em {formatDateTime(data.details.ticket.createdAt)}</p>
    </div>
    <a href={`/app/tickets/${data.details.ticket.id}/remote`} class="inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-xl border border-[#DDE1EA] bg-white px-4 text-[10px] font-semibold text-[#000A57] transition hover:bg-[#F8F9FF]"><MonitorCog size={16}/>Acesso remoto</a>
  </div>

  {#if form?.message}<div class={`mt-6 flex items-start gap-3 rounded-2xl border px-4 py-3 text-[12px] font-medium ${form.success ? "border-[#B9E6C9] bg-[#F1FBF4] text-[#176B35]" : "border-[#F0C8C8] bg-[#FFF5F5] text-[#9B2C2C]"}`}>{#if form.success}<CheckCircle2 size={18} class="mt-0.5 shrink-0"/>{:else}<CircleAlert size={18} class="mt-0.5 shrink-0"/>{/if}<span>{form.message}</span></div>{/if}

  <div class="mt-7 grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
    <div class="space-y-6">
      <section class="rounded-[24px] border border-[#E2E5ED] bg-white p-5 sm:p-7">
        <div class="flex items-start gap-3"><span class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#EEF0FF] text-[#000A57]"><MessageSquare size={19}/></span><div><h2 class="text-[16px] font-semibold text-[#11182C]">Conversa</h2><p class="mt-1 text-[11px] text-[#858A98]">Respostas públicas e notas internas ficam no mesmo histórico.</p></div></div>
        <div class="mt-6 space-y-4">{#each data.details.messages as message}<article class={`rounded-2xl border px-4 py-4 ${message.visibility === "internal" ? "border-[#F1D7BD] bg-[#FFF9F3]" : message.authorType === "customer" ? "border-[#E3E6ED] bg-[#FAFAFC]" : "border-[#D8DDF4] bg-[#F6F7FF]"}`}><div class="flex flex-wrap items-center justify-between gap-2"><div class="flex items-center gap-2"><strong class="text-[11px] font-semibold text-[#3B4150]">{message.authorUserName ?? message.customerName ?? (message.authorType === "system" ? "Sistema" : "Atendimento F10")}</strong>{#if message.visibility === "internal"}<span class="rounded-full bg-[#FFE5C9] px-2 py-1 text-[8px] font-bold uppercase tracking-[0.06em] text-[#91500F]">Nota interna</span>{/if}</div><span class="text-[9px] text-[#999EAA]">{formatDateTime(message.createdAt)}</span></div><p class="mt-2 whitespace-pre-wrap text-[12px] leading-6 text-[#5D6372]">{message.body}</p></article>{/each}</div>

        {#if data.canReply && data.details.ticket.status !== "closed"}
          <div class="mt-6 grid gap-4 lg:grid-cols-2">
            <form method="POST" action="?/reply" class="rounded-2xl border border-[#D9DDF0] bg-[#F8F9FF] p-4"><label class="block"><span class="mb-2 block text-[11px] font-semibold text-[#000A57]">Resposta ao cliente</span><textarea name="body" required maxlength="10000" rows="5" class="w-full resize-y rounded-xl border border-[#DDE1EA] bg-white px-3 py-3 text-[12px] leading-5 outline-none focus:border-[#000A57]"></textarea></label><button type="submit" class="mt-3 min-h-10 w-full rounded-xl bg-[#000A57] px-4 text-[11px] font-semibold text-white">Registrar resposta</button></form>
            <form method="POST" action="?/note" class="rounded-2xl border border-[#F1D7BD] bg-[#FFF9F3] p-4"><label class="block"><span class="mb-2 block text-[11px] font-semibold text-[#8B4D12]">Nota interna</span><textarea name="body" required maxlength="10000" rows="5" class="w-full resize-y rounded-xl border border-[#E9D6C1] bg-white px-3 py-3 text-[12px] leading-5 outline-none focus:border-[#C46C17]"></textarea></label><button type="submit" class="mt-3 min-h-10 w-full rounded-xl bg-[#9A5513] px-4 text-[11px] font-semibold text-white">Adicionar nota interna</button></form>
          </div>
        {/if}
      </section>
    </div>

    <aside class="space-y-5">
      <section class="rounded-[24px] border border-[#E2E5ED] bg-white p-5">
        <div class="flex items-center gap-3"><Headphones size={18} class="text-[#000A57]"/><h2 class="text-[14px] font-semibold text-[#11182C]">Atendimento</h2></div>
        {#if data.canReply}
          <form method="POST" action="?/status" class="mt-5"><label class="block"><span class="mb-1.5 block text-[10px] font-semibold text-[#555B6A]">Status</span><div class="flex gap-2"><select name="status" value={data.details.ticket.status} class="h-10 min-w-0 flex-1 rounded-xl border border-[#DDE1EA] bg-white px-2 text-[10px]"><option value="new">Novo</option><option value="open">Aberto</option><option value="in_progress">Em andamento</option><option value="waiting_customer">Aguardando cliente</option><option value="resolved">Resolvido</option><option value="closed">Fechado</option></select><button type="submit" class="h-10 rounded-xl bg-[#000A57] px-3 text-[10px] font-semibold text-white">Salvar</button></div></label></form>
          <form method="POST" action="?/priority" class="mt-4"><label class="block"><span class="mb-1.5 block text-[10px] font-semibold text-[#555B6A]">Prioridade</span><div class="flex gap-2"><select name="priority" value={data.details.ticket.priority} class="h-10 min-w-0 flex-1 rounded-xl border border-[#DDE1EA] bg-white px-2 text-[10px]"><option value="low">Baixa</option><option value="normal">Normal</option><option value="high">Alta</option><option value="urgent">Urgente</option></select><button type="submit" class="h-10 rounded-xl bg-[#000A57] px-3 text-[10px] font-semibold text-white">Salvar</button></div></label></form>
        {/if}
        <div class="mt-5 border-t border-[#EEF0F5] pt-4"><span class="text-[10px] font-semibold text-[#555B6A]">Responsável</span><p class="mt-2 text-[11px] font-medium text-[#333948]">{data.details.ticket.assignedUserName ?? "Sem responsável"}</p>{#if data.canAssign}<form method="POST" action="?/assign" class="mt-3 flex gap-2"><select name="assignedUserId" required class="h-10 min-w-0 flex-1 rounded-xl border border-[#DDE1EA] bg-white px-2 text-[10px]">{#each data.agents as agent}<option value={agent.id} selected={agent.id === data.details.ticket.assignedUserId}>{agent.name}</option>{/each}</select><button type="submit" class="h-10 rounded-xl bg-[#000A57] px-3 text-[10px] font-semibold text-white">Atribuir</button></form>{/if}</div>
      </section>

      <section class="rounded-[24px] border border-[#D8DEF2] bg-[#F8F9FF] p-5"><div class="flex items-center gap-3"><MonitorCog size={18} class="text-[#000A57]"/><h2 class="text-[14px] font-semibold">Suporte remoto</h2></div><p class="mt-3 text-[10px] leading-5 text-[#697187]">Use um computador já reconhecido ou envie o instalador de suporte ao cliente na primeira vez.</p><a href={`/app/tickets/${data.details.ticket.id}/remote`} class="mt-4 inline-flex min-h-10 w-full items-center justify-center rounded-xl bg-[#000A57] text-[10px] font-semibold text-white">Abrir acesso remoto</a></section>

      <section class="rounded-[24px] border border-[#E2E5ED] bg-white p-5"><div class="flex items-center gap-3"><UserRound size={18} class="text-[#EA6D0B]"/><h2 class="text-[14px] font-semibold text-[#11182C]">Cliente</h2></div><dl class="mt-4 space-y-3 text-[10px]"><div><dt class="text-[#8D929F]">Nome</dt><dd class="mt-1 font-medium text-[#4E5463]">{data.details.ticket.customerName ?? "Não informado"}</dd></div><div><dt class="text-[#8D929F]">E-mail</dt><dd class="mt-1 break-all font-medium text-[#4E5463]">{data.details.ticket.customerEmail ?? "Não informado"}</dd></div><div><dt class="text-[#8D929F]">Telefone</dt><dd class="mt-1 font-medium text-[#4E5463]">{data.details.ticket.customerPhone ?? "Não informado"}</dd></div></dl></section>

      {#if data.details.ticket.organizationName}<section class="rounded-[24px] border border-[#E2E5ED] bg-white p-5"><div class="flex items-center gap-3"><Building2 size={18} class="text-[#000A57]"/><h2 class="text-[14px] font-semibold text-[#11182C]">Organização</h2></div><p class="mt-4 text-[11px] font-medium text-[#4E5463]">{data.details.ticket.organizationName}</p></section>{/if}

      <section class="rounded-[24px] border border-[#E2E5ED] bg-white p-5"><div class="flex items-center gap-3"><ShieldCheck size={18} class="text-[#000A57]"/><h2 class="text-[14px] font-semibold text-[#11182C]">Histórico</h2></div><div class="mt-4 space-y-4">{#each data.details.events as event}<div class="border-l-2 border-[#E5E7ED] pl-3"><p class="text-[10px] leading-4 text-[#626877]"><strong class="font-semibold text-[#3E4453]">{event.actorName ?? "Sistema"}</strong> {eventLabels[event.eventType] ?? event.eventType}</p><span class="mt-1 block text-[8px] text-[#9B9FAC]">{formatDateTime(event.createdAt)}</span></div>{/each}</div></section>
    </aside>
  </div>
</div>
