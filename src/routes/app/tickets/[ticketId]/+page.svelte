<script lang="ts">
  import {
    Building2,
    CalendarDays,
    CheckCircle2,
    CircleAlert,
    Headphones,
    ListTodo,
    MessageSquare,
    MonitorCog,
    Plus,
    ShieldCheck,
    UserRound,
  } from "lucide-svelte";
  import ApplicationBackLink from "$lib/components/application/ApplicationBackLink.svelte";
  import ApplicationContent from "$lib/components/application/ApplicationContent.svelte";
  import MentionTextarea from "$lib/components/operations/MentionTextarea.svelte";
  import ServiceRequestDetailsCard from "$lib/components/serviceRequests/ServiceRequestDetailsCard.svelte";
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
    "ticket.due_date.changed": "alterou a conclusão planejada",
    "ticket.assignee.changed": "alterou o responsável",
    "ticket.task.linked": "vinculou uma tarefa",
    "service_request.created": "criou a solicitação estruturada",
    "service_request.updated": "alterou os dados da solicitação",
    "service_request.secret.revealed": "revelou uma credencial protegida",
    "chat.claimed": "assumiu o atendimento",
    "chat.assigned": "atribuiu o atendimento",
    "chat.auto_assigned": "recebeu o atendimento pela distribuição automática",
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

  function formatDate(value: string): string {
    const [year, month, day] = value.split("-").map(Number);
    return new Intl.DateTimeFormat("pt-BR", { dateStyle: "short" }).format(new Date(year, month - 1, day));
  }
</script>

<svelte:head><title>Ticket #{data.details.ticket.ticketNumber} | F10 Operations</title></svelte:head>

<ApplicationContent width="standard">
  <ApplicationBackLink href="/app/tickets" label="Tickets" className="mb-3" />

  <div class="flex flex-col justify-between gap-5 lg:flex-row lg:items-end">
    <div class="min-w-0">
      <div class="flex flex-wrap items-center gap-2"><span class="text-[11px] font-bold text-[#EA6D0B]">#{data.details.ticket.ticketNumber}</span><span class="application-text-caption rounded-full bg-[#EEF0FF] px-3 py-1.5 font-bold text-[#000A57]">{statusLabels[data.details.ticket.status]}</span><span class="application-text-caption rounded-full bg-[#F3F4F7] px-3 py-1.5 font-semibold text-[#737989]">{priorityLabels[data.details.ticket.priority]}</span><span class="application-text-caption inline-flex items-center gap-1.5 rounded-full bg-[#FFF6EC] px-3 py-1.5 font-semibold text-[#9B530F]"><CalendarDays size={12}/>{formatDate(data.details.ticket.dueOn)}</span></div>
      <h2 class="mt-3 text-[30px] font-semibold tracking-[-0.035em] text-[#010D28] sm:text-[38px]">{data.details.ticket.subject}</h2>
      <p class="mt-2 text-[11px] text-[#808695]">{data.details.ticket.queueName} · aberto em {formatDateTime(data.details.ticket.createdAt)}</p>
    </div>
    <a href={`/app/tickets/${data.details.ticket.id}/remote`} class="application-text-caption inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-xl border border-[#DDE1EA] bg-white px-4 font-semibold text-[#000A57] transition hover:bg-[#F8F9FF]"><MonitorCog size={16}/>Acesso remoto</a>
  </div>

  {#if form?.message}<div class={`mt-6 flex items-start gap-3 rounded-2xl border px-4 py-3 text-[12px] font-medium ${form.success ? "border-[#B9E6C9] bg-[#F1FBF4] text-[#176B35]" : "border-[#F0C8C8] bg-[#FFF5F5] text-[#9B2C2C]"}`}>{#if form.success}<CheckCircle2 size={18} class="mt-0.5 shrink-0"/>{:else}<CircleAlert size={18} class="mt-0.5 shrink-0"/>{/if}<span>{form.message}</span></div>{/if}

  <div class="mt-7 grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
    <div class="space-y-6">
      {#if data.serviceRequest}
        <ServiceRequestDetailsCard
          serviceRequest={data.serviceRequest}
          ticketId={data.details.ticket.id}
          mode="support"
          canEdit={data.canReply && data.details.ticket.status !== "closed"}
          updateAction="?/updateServiceRequest"
        />
      {/if}

      <section class="rounded-[24px] border border-[#E2E5ED] bg-white p-5 sm:p-7">
        <div class="flex items-start gap-3"><span class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#EEF0FF] text-[#000A57]"><MessageSquare size={19}/></span><div><h2 class="text-[16px] font-semibold text-[#11182C]">Conversa</h2><p class="mt-1 text-[11px] text-[#858A98]">Respostas públicas e notas internas ficam no mesmo histórico.</p></div></div>
        <div class="mt-6 space-y-4">{#each data.details.messages as message}<article class={`rounded-2xl border px-4 py-4 ${message.visibility === "internal" ? "border-[#F1D7BD] bg-[#FFF9F3]" : message.authorType === "customer" ? "border-[#E3E6ED] bg-[#FAFAFC]" : "border-[#D8DDF4] bg-[#F6F7FF]"}`}><div class="flex flex-wrap items-center justify-between gap-2"><div class="flex items-center gap-2"><strong class="text-[11px] font-semibold text-[#3B4150]">{message.authorUserName ?? message.customerName ?? (message.authorType === "system" ? "Sistema" : "Atendimento F10")}</strong>{#if message.visibility === "internal"}<span class="application-text-meta rounded-full bg-[#FFE5C9] px-2 py-1 font-bold uppercase tracking-[0.06em] text-[#91500F]">Nota interna</span>{/if}</div><span class="application-text-meta text-[#999EAA]">{formatDateTime(message.createdAt)}</span></div><p class="mt-2 whitespace-pre-wrap text-[12px] leading-6 text-[#5D6372]">{message.body}</p></article>{/each}</div>

        {#if data.canReply && data.details.ticket.status !== "closed"}
          <div class="mt-6 grid gap-4 lg:grid-cols-2">
            <form method="POST" action="?/reply" class="rounded-2xl border border-[#D9DDF0] bg-[#F8F9FF] p-4"><label class="block"><span class="mb-2 block text-[11px] font-semibold text-[#000A57]">Resposta ao cliente</span><textarea name="body" required maxlength="10000" rows="5" class="w-full resize-y rounded-xl border border-[#DDE1EA] bg-white px-3 py-3 text-[12px] leading-5 outline-none focus:border-[#000A57]"></textarea></label><button type="submit" class="mt-3 min-h-10 w-full rounded-xl bg-[#000A57] px-4 text-[11px] font-semibold text-white">Registrar resposta</button></form>
            <form method="POST" action="?/note" class="rounded-2xl border border-[#F1D7BD] bg-[#FFF9F3] p-4">
              <span class="mb-2 block text-[11px] font-semibold text-[#8B4D12]">Nota interna</span>
              <MentionTextarea users={data.mentionUsers} name="body" rows={5} maxlength={10000} placeholder="Ex.: @jeferson pode ver esse caso aqui?" className="w-full resize-y rounded-xl border border-[#E9D6C1] bg-white px-3 py-3 text-[12px] leading-5 outline-none focus:border-[#C46C17]" />
              <p class="application-text-meta mt-2 leading-4 text-[#9A744F]">Digite <strong>@</strong> e selecione um usuário para gerar uma notificação interna. O cliente nunca vê esta nota.</p>
              <button type="submit" class="mt-3 min-h-10 w-full rounded-xl bg-[#9A5513] px-4 text-[11px] font-semibold text-white">Adicionar nota interna</button>
            </form>
          </div>
        {/if}
      </section>
    </div>

    <aside class="space-y-5">
      <section class="rounded-[24px] border border-[#E2E5ED] bg-white p-5">
        <div class="flex items-center gap-3"><Headphones size={18} class="text-[#000A57]"/><h2 class="text-[14px] font-semibold text-[#11182C]">Atendimento</h2></div>
        {#if data.canReply}
          <form method="POST" action="?/status" class="mt-5"><label class="block"><span class="application-text-caption mb-1.5 block font-semibold text-[#555B6A]">Status</span><div class="flex gap-2"><select name="status" value={data.details.ticket.status} class="application-text-caption h-10 min-w-0 flex-1 rounded-xl border border-[#DDE1EA] bg-white px-2"><option value="new">Novo</option><option value="open">Aberto</option><option value="in_progress">Em andamento</option><option value="waiting_customer">Aguardando cliente</option><option value="resolved">Resolvido</option><option value="closed">Fechado</option></select><button type="submit" class="application-text-caption h-10 rounded-xl bg-[#000A57] px-3 font-semibold text-white">Salvar</button></div></label></form>
          <form method="POST" action="?/priority" class="mt-4"><label class="block"><span class="application-text-caption mb-1.5 block font-semibold text-[#555B6A]">Prioridade</span><div class="flex gap-2"><select name="priority" value={data.details.ticket.priority} class="application-text-caption h-10 min-w-0 flex-1 rounded-xl border border-[#DDE1EA] bg-white px-2"><option value="low">Baixa</option><option value="normal">Normal</option><option value="high">Alta</option><option value="urgent">Urgente</option></select><button type="submit" class="application-text-caption h-10 rounded-xl bg-[#000A57] px-3 font-semibold text-white">Salvar</button></div></label></form>
          <form method="POST" action="?/dueOn" class="mt-4"><label class="block"><span class="application-text-caption mb-1.5 block font-semibold text-[#555B6A]">Conclusão planejada</span><div class="flex gap-2"><input name="dueOn" type="date" required value={data.details.ticket.dueOn} class="application-text-caption h-10 min-w-0 flex-1 rounded-xl border border-[#DDE1EA] bg-white px-2"/><button type="submit" class="application-text-caption h-10 rounded-xl bg-[#000A57] px-3 font-semibold text-white">Salvar</button></div></label><p class="application-text-meta mt-1.5 leading-4 text-[#8A909E]">Data operacional exibida na Agenda. O prazo de SLA permanece separado.</p></form>
        {:else}
          <div class="mt-5 rounded-xl border border-[#E7E9EF] bg-[#FAFAFC] px-3 py-3"><span class="application-text-meta block font-semibold uppercase tracking-[0.07em] text-[#9297A4]">Conclusão planejada</span><strong class="application-text-caption mt-1 inline-flex items-center gap-1.5 text-[#3F4656]"><CalendarDays size={13}/>{formatDate(data.details.ticket.dueOn)}</strong></div>
        {/if}
        <div class="mt-5 border-t border-[#EEF0F5] pt-4"><span class="application-text-caption font-semibold text-[#555B6A]">Responsável</span><p class="mt-2 text-[11px] font-medium text-[#333948]">{data.details.ticket.assignedUserName ?? "Sem responsável"}</p>{#if data.canAssign}<form method="POST" action="?/assign" class="mt-3 flex gap-2"><select name="assignedUserId" required class="application-text-caption h-10 min-w-0 flex-1 rounded-xl border border-[#DDE1EA] bg-white px-2">{#each data.agents as agent}<option value={agent.id} selected={agent.id === data.details.ticket.assignedUserId}>{agent.name}</option>{/each}</select><button type="submit" class="application-text-caption h-10 rounded-xl bg-[#000A57] px-3 font-semibold text-white">Atribuir</button></form>{/if}</div>
      </section>

      {#if data.canViewTasks}
        <section class="rounded-[24px] border border-[#E2E5ED] bg-white p-5">
          <div class="flex items-center justify-between gap-3"><div class="flex items-center gap-3"><ListTodo size={18} class="text-[#000A57]"/><h2 class="text-[14px] font-semibold text-[#11182C]">Tarefas do ticket</h2></div><span class="application-text-meta rounded-full bg-[#F3F4F7] px-2 py-1 font-bold text-[#676D7D]">{data.linkedTasks.length}</span></div>
          {#if data.linkedTasks.length > 0}
            <div class="mt-4 space-y-2">{#each data.linkedTasks as task}<a href={`/app/tasks/${task.id}`} class="block rounded-xl border border-[#E7E9EF] bg-[#FAFAFC] px-3 py-3 transition hover:border-[#C9CFE6] hover:bg-[#F7F8FF]"><div class="flex items-start justify-between gap-3"><strong class="application-text-caption leading-4 text-[#3D4454]">{task.title}</strong><span class={`application-text-meta shrink-0 rounded-full px-2 py-1 font-bold ${task.statusClosed ? "bg-[#EEF8F1] text-[#2F7045]" : "bg-[#EEF0FF] text-[#000A57]"}`}>{task.statusName}</span></div><p class="application-text-meta mt-1 text-[#8A909E]">{task.projectName}{task.dueOn ? ` · prazo ${task.dueOn}` : ""}</p></a>{/each}</div>
          {:else}
            <p class="application-text-caption mt-4 leading-5 text-[#858B99]">Nenhuma tarefa vinculada. Use tarefas quando o atendimento gerar uma ação que precisa continuar fora da conversa.</p>
          {/if}

          {#if data.canCreateTask && data.taskProjects.length > 0 && data.details.ticket.status !== "closed"}
            <form method="POST" action="?/createTask" class="mt-4 border-t border-[#EEF0F5] pt-4">
              <div class="application-text-caption flex items-center gap-2 font-semibold text-[#3F4656]"><Plus size={14}/>Criar tarefa deste ticket</div>
              <label class="mt-3 block"><span class="application-text-meta mb-1 block font-semibold text-[#777D8D]">Projeto</span><select name="projectId" required class="application-text-caption h-10 w-full rounded-xl border border-[#DDE1EA] bg-white px-3">{#each data.taskProjects as project}<option value={project.id}>{project.name}</option>{/each}</select></label>
              <label class="mt-3 block"><span class="application-text-meta mb-1 block font-semibold text-[#777D8D]">Título</span><input name="title" required maxlength="240" value={`Ticket #${data.details.ticket.ticketNumber} · ${data.details.ticket.subject}`} class="application-text-caption h-10 w-full rounded-xl border border-[#DDE1EA] px-3"/></label>
              <label class="mt-3 block"><span class="application-text-meta mb-1 block font-semibold text-[#777D8D]">Descrição</span><textarea name="description" rows="3" maxlength="10000" placeholder="O que precisa ser feito?" class="application-text-caption w-full rounded-xl border border-[#DDE1EA] px-3 py-2"></textarea></label>
              <div class="mt-3 grid grid-cols-2 gap-2"><label><span class="application-text-meta mb-1 block font-semibold text-[#777D8D]">Prioridade</span><select name="priority" class="application-text-caption h-10 w-full rounded-xl border border-[#DDE1EA] bg-white px-2"><option value="low" selected={data.details.ticket.priority === "low"}>Baixa</option><option value="normal" selected={data.details.ticket.priority === "normal"}>Normal</option><option value="high" selected={data.details.ticket.priority === "high"}>Alta</option><option value="urgent" selected={data.details.ticket.priority === "urgent"}>Urgente</option></select></label><label><span class="application-text-meta mb-1 block font-semibold text-[#777D8D]">Prazo</span><input name="dueOn" type="date" class="application-text-caption h-10 w-full rounded-xl border border-[#DDE1EA] px-2"/></label></div>
              <button type="submit" class="application-text-caption mt-3 min-h-10 w-full rounded-xl bg-[#000A57] px-3 font-semibold text-white">Criar e vincular tarefa</button>
            </form>
          {/if}
        </section>
      {/if}

      <section class="rounded-[24px] border border-[#D8DEF2] bg-[#F8F9FF] p-5"><div class="flex items-center gap-3"><MonitorCog size={18} class="text-[#000A57]"/><h2 class="text-[14px] font-semibold">Suporte remoto</h2></div><p class="application-text-caption mt-3 leading-5 text-[#697187]">Use um computador já reconhecido ou envie o instalador de suporte ao cliente na primeira vez.</p><a href={`/app/tickets/${data.details.ticket.id}/remote`} class="application-text-caption mt-4 inline-flex min-h-10 w-full items-center justify-center rounded-xl bg-[#000A57] font-semibold text-white">Abrir acesso remoto</a></section>

      <section class="rounded-[24px] border border-[#E2E5ED] bg-white p-5"><div class="flex items-center gap-3"><UserRound size={18} class="text-[#EA6D0B]"/><h2 class="text-[14px] font-semibold text-[#11182C]">Cliente</h2></div><dl class="application-text-caption mt-4 space-y-3"><div><dt class="text-[#8D929F]">Nome</dt><dd class="mt-1 font-medium text-[#4E5463]">{data.details.ticket.customerName ?? "Não informado"}</dd></div><div><dt class="text-[#8D929F]">E-mail</dt><dd class="mt-1 break-all font-medium text-[#4E5463]">{data.details.ticket.customerEmail ?? "Não informado"}</dd></div><div><dt class="text-[#8D929F]">Telefone</dt><dd class="mt-1 font-medium text-[#4E5463]">{data.details.ticket.customerPhone ?? "Não informado"}</dd></div></dl></section>

      {#if data.customerContext}
        <section class="rounded-[24px] border border-[#D8DEF2] bg-[#F8F9FF] p-5">
          <div class="flex items-center gap-3"><Building2 size={18} class="text-[#000A57]"/><div><h2 class="text-[14px] font-semibold text-[#11182C]">Contexto F10 autenticado</h2><p class="application-text-meta mt-0.5 text-[#808695]">Escola e unidade vinculadas no início do atendimento.</p></div></div>
          <dl class="application-text-caption mt-4 space-y-3">
            <div><dt class="text-[#8D929F]">Escola / unidade</dt><dd class="mt-1 font-semibold text-[#3F4656]">{data.customerContext.unitName}</dd></div>
            <div><dt class="text-[#8D929F]">Grupo</dt><dd class="mt-1 font-medium text-[#4E5463]">{data.customerContext.groupName}</dd></div>
            <div><dt class="text-[#8D929F]">Usuário F10</dt><dd class="application-text-meta mt-1 font-mono font-medium text-[#5D6372]">{data.customerContext.legacyUserId}</dd></div>
          </dl>
        </section>
      {:else if data.details.ticket.organizationName}
        <section class="rounded-[24px] border border-[#E2E5ED] bg-white p-5"><div class="flex items-center gap-3"><Building2 size={18} class="text-[#000A57]"/><h2 class="text-[14px] font-semibold text-[#11182C]">Organização</h2></div><p class="mt-4 text-[11px] font-medium text-[#4E5463]">{data.details.ticket.organizationName}</p></section>
      {/if}

      <section class="rounded-[24px] border border-[#E2E5ED] bg-white p-5"><div class="flex items-center gap-3"><ShieldCheck size={18} class="text-[#000A57]"/><h2 class="text-[14px] font-semibold text-[#11182C]">Histórico</h2></div><div class="mt-4 space-y-4">{#each data.details.events as event}<div class="border-l-2 border-[#E5E7ED] pl-3"><p class="application-text-caption leading-4 text-[#626877]"><strong class="font-semibold text-[#3E4453]">{event.actorName ?? "Sistema"}</strong> {eventLabels[event.eventType] ?? event.eventType}</p><span class="application-text-meta mt-1 block text-[#9B9FAC]">{formatDateTime(event.createdAt)}</span></div>{/each}</div></section>
    </aside>
  </div>
</ApplicationContent>