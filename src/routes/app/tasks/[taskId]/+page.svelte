<script lang="ts">
  import { onMount } from "svelte";
  import {
    ArrowLeft,
    CalendarCheck2,
    CalendarDays,
    CheckCircle2,
    CircleAlert,
    ExternalLink,
    Headphones,
    History,
    MessageSquare,
    Save,
    UserRound,
    Video,
  } from "lucide-svelte";
  import GoogleEventDetailsEditor from "$lib/components/operations/GoogleEventDetailsEditor.svelte";
  import MentionTextarea from "$lib/components/operations/MentionTextarea.svelte";
  import type { ActionData, PageData } from "./$types";

  export let data: PageData;
  export let form: ActionData;

  const priorityLabels: Record<string, string> = { low: "Baixa", normal: "Normal", high: "Alta", urgent: "Urgente" };
  const activityLabels: Record<string, string> = {
    "task.created": "criou a tarefa",
    "task.status.changed": "alterou o status",
    "task.completed": "concluiu a tarefa",
    "task.reopened": "reabriu a tarefa",
    "task.details.updated": "atualizou os detalhes",
    "task.assignee.changed": "alterou o responsável",
    "task.comment.added": "adicionou um comentário",
  };

  let taskDueOn = data.details.task.dueOn ?? "";
  let syncGoogle = Boolean(data.googleLink);
  let googleAllDay = data.googleLink?.allDay ?? false;
  let googleStartTime = data.googleLink?.startTime ?? "09:00";
  let googleEndTime = data.googleLink?.endTime ?? "10:00";
  let googleTimeZone = data.googleLink?.timeZone ?? "UTC";
  let googleMeet = data.googleLink?.googleMeetEnabled ?? false;

  const initialGoogleAttendees = (() => {
    const stored = data.googleLink?.attendees ?? [];
    const live = (data.googleEvent?.attendees ?? []).filter((attendee) => !attendee.self);
    const storedEmails = new Set(stored.map((attendee) => attendee.email.trim().toLowerCase()));

    return [
      ...stored.map((attendee) => {
        const current = live.find(
          (candidate) => candidate.email.trim().toLowerCase() === attendee.email.trim().toLowerCase(),
        );
        return {
          ...attendee,
          responseStatus: current?.responseStatus ?? "needsAction",
        };
      }),
      ...live
        .filter((attendee) => !storedEmails.has(attendee.email.trim().toLowerCase()))
        .map((attendee) => ({
          email: attendee.email,
          name: attendee.displayName,
          userId: null,
          optional: attendee.optional,
          responseStatus: attendee.responseStatus,
        })),
    ];
  })();

  onMount(() => {
    if (!data.googleLink) {
      googleTimeZone = Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
    }
  });

  function formatDateTime(value: string | Date): string {
    return new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" }).format(new Date(value));
  }
</script>

<svelte:head><title>{data.details.task.title} | Tarefas | F10 Operations</title></svelte:head>

<div class="mx-auto max-w-[1280px] px-5 py-7 sm:px-8 sm:py-9">
  <a href={`/app/tasks?project=${data.details.task.projectId}`} class="inline-flex min-h-10 items-center gap-2 rounded-xl px-2 text-[12px] font-semibold text-[#5F6575] transition hover:bg-white hover:text-[#000A57]"><ArrowLeft size={17}/>Voltar para {data.details.task.projectName}</a>

  <div class="mt-5 flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
    <div><div class="flex flex-wrap items-center gap-2"><span class="rounded-full bg-[#EEF0FF] px-3 py-1.5 text-[10px] font-bold text-[#000A57]">{data.details.task.statusName}</span><span class="rounded-full bg-[#F3F4F7] px-3 py-1.5 text-[10px] font-semibold text-[#737989]">{priorityLabels[data.details.task.priority]}</span>{#if data.googleLink}<span class="inline-flex items-center gap-1 rounded-full bg-[#EEF7F1] px-3 py-1.5 text-[10px] font-semibold text-[#2F7045]"><CalendarCheck2 size={12}/>Google Calendar</span>{/if}{#if data.googleLink?.googleMeetEnabled}<span class="inline-flex items-center gap-1 rounded-full bg-[#EEF3FF] px-3 py-1.5 text-[10px] font-semibold text-[#214A9A]"><Video size={12}/>Google Meet</span>{/if}</div><h1 class={`mt-3 text-[30px] font-semibold tracking-[-0.035em] sm:text-[38px] ${data.details.task.statusClosed ? "text-[#7E8492] line-through" : "text-[#010D28]"}`}>{data.details.task.title}</h1><p class="mt-2 text-[12px] text-[#7C8291]">Projeto: {data.details.task.projectName}</p></div>
    {#if data.canUpdate}
      <form method="POST" action="?/toggleComplete">
        <input type="hidden" name="completed" value={data.details.task.statusClosed ? "false" : "true"}/>
        <button type="submit" class={`inline-flex min-h-11 items-center justify-center gap-2 rounded-xl px-5 text-[12px] font-semibold ${data.details.task.statusClosed ? "border border-[#DDE1EA] bg-white text-[#000A57]" : "bg-[#2F7045] text-white"}`}><CheckCircle2 size={17}/>{data.details.task.statusClosed ? "Reabrir tarefa" : "Concluir tarefa"}</button>
      </form>
    {/if}
  </div>

  {#if form?.message}<div class={`mt-6 flex items-start gap-3 rounded-2xl border px-4 py-3 text-[12px] font-medium ${form.syncWarning ? "border-[#F0D2A9] bg-[#FFF9EF] text-[#8A4B0F]" : form.success ? "border-[#B9E6C9] bg-[#F1FBF4] text-[#176B35]" : "border-[#F0C8C8] bg-[#FFF5F5] text-[#9B2C2C]"}`}>{#if form.success && !form.syncWarning}<CheckCircle2 size={18} class="mt-0.5 shrink-0"/>{:else}<CircleAlert size={18} class="mt-0.5 shrink-0"/>{/if}<span>{form.message}</span></div>{/if}

  <div class="mt-7 grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
    <div class="space-y-6">
      <section class="rounded-[24px] border border-[#E2E5ED] bg-white p-5 sm:p-7">
        <div><h2 class="text-[16px] font-semibold text-[#11182C]">Detalhes</h2><p class="mt-1 text-[11px] text-[#858A98]">Descrição, prioridade, prazo e sincronização da tarefa.</p></div>
        <form method="POST" action="?/update" class="mt-6 grid gap-5 sm:grid-cols-2">
          <fieldset disabled={!data.canUpdate} class="contents disabled:opacity-70">
            <label class="block sm:col-span-2"><span class="mb-1.5 block text-[11px] font-semibold text-[#4A5060]">Título</span><input name="title" required maxlength="180" value={data.details.task.title} class="h-12 w-full rounded-xl border border-[#DDE1EA] px-4 text-[14px] font-medium text-[#11182C] outline-none focus:border-[#000A57]"/></label>
            <label class="block sm:col-span-2"><span class="mb-1.5 block text-[11px] font-semibold text-[#4A5060]">Descrição</span><textarea name="description" maxlength="5000" rows="8" value={data.details.task.description} class="w-full resize-y rounded-xl border border-[#DDE1EA] px-4 py-3 text-[13px] leading-6 outline-none focus:border-[#000A57]"></textarea></label>
            <label class="block"><span class="mb-1.5 block text-[11px] font-semibold text-[#4A5060]">Prioridade</span><select name="priority" value={data.details.task.priority} class="h-11 w-full rounded-xl border border-[#DDE1EA] bg-white px-3 text-[12px]"><option value="low">Baixa</option><option value="normal">Normal</option><option value="high">Alta</option><option value="urgent">Urgente</option></select></label>
            <label class="block"><span class="mb-1.5 block text-[11px] font-semibold text-[#4A5060]">Prazo</span><input name="dueOn" type="date" bind:value={taskDueOn} class="h-11 w-full rounded-xl border border-[#DDE1EA] px-3 text-[12px]"/></label>

            {#if data.googleCalendar.connected}
              <div class="sm:col-span-2 rounded-2xl border border-[#DDE7E1] bg-[#F8FBF9] p-4">
                <input type="hidden" name="googleSyncManaged" value="true"/>
                <input type="hidden" name="googleTimeZone" value={googleTimeZone}/>
                <div class="flex flex-wrap items-start justify-between gap-3">
                  <label class="flex cursor-pointer items-start gap-3"><input type="checkbox" name="syncGoogle" value="true" bind:checked={syncGoogle} class="mt-1"/><span><strong class="block text-[11px] font-semibold text-[#2E3B33]">Sincronizar com Google Calendar</strong><span class="mt-1 block text-[9px] leading-4 text-[#78827B]">Usa sua conta {data.googleCalendar.googleEmail}. Alterações no F10 atualizam o mesmo evento e os convidados.</span></span></label>
                  {#if data.googleLink?.googleHtmlLink}<a href={data.googleLink.googleHtmlLink} target="_blank" rel="noreferrer" class="inline-flex items-center gap-1 text-[9px] font-semibold text-[#000A57]">Abrir evento <ExternalLink size={12}/></a>{/if}
                </div>
                {#if syncGoogle}
                  <div class="mt-4 space-y-3 rounded-xl border border-[#E1E8E3] bg-white p-3">
                    <label class="flex items-center gap-2 text-[10px] font-medium text-[#535E57]"><input type="checkbox" name="googleAllDay" value="true" bind:checked={googleAllDay}/>Evento de dia inteiro</label>
                    {#if !googleAllDay}
                      <div class="grid grid-cols-2 gap-3"><label><span class="mb-1 block text-[9px] font-semibold text-[#6E776F]">Início</span><input type="time" name="googleStartTime" bind:value={googleStartTime} required class="h-10 w-full rounded-lg border border-[#DDE1EA] px-2 text-[11px]"/></label><label><span class="mb-1 block text-[9px] font-semibold text-[#6E776F]">Fim</span><input type="time" name="googleEndTime" bind:value={googleEndTime} required class="h-10 w-full rounded-lg border border-[#DDE1EA] px-2 text-[11px]"/></label></div>
                    {:else}
                      <input type="hidden" name="googleStartTime" value=""/><input type="hidden" name="googleEndTime" value=""/>
                    {/if}

                    {#if data.googleLink?.googleMeetEnabled}
                      <input type="hidden" name="googleMeet" value="true"/>
                      <div class="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-[#D8E2F6] bg-[#F5F8FF] px-3 py-3">
                        <span class="inline-flex items-center gap-2 text-[9px] font-semibold text-[#214A9A]"><Video size={14}/>Google Meet ativo</span>
                        {#if data.googleLink.googleMeetUrl}<a href={data.googleLink.googleMeetUrl} target="_blank" rel="noreferrer" class="inline-flex min-h-8 items-center gap-1 rounded-lg bg-[#214A9A] px-3 text-[9px] font-semibold text-white">Entrar na reunião <ExternalLink size={11}/></a>{:else}<span class="text-[8px] text-[#77839A]">O Google ainda está finalizando o link da reunião.</span>{/if}
                      </div>
                    {:else}
                      <label class="flex cursor-pointer items-start gap-2 rounded-xl border border-[#DFE5F1] bg-[#FAFBFE] px-3 py-3"><input type="checkbox" name="googleMeet" value="true" bind:checked={googleMeet} class="mt-0.5"/><span><strong class="block text-[9px] font-semibold text-[#35445F]">Gerar Google Meet</strong><span class="mt-0.5 block text-[8px] leading-4 text-[#7D8797]">Cria um link exclusivo de reunião dentro deste evento.</span></span></label>
                    {/if}

                    <GoogleEventDetailsEditor
                      users={data.calendarUsers}
                      organizerUserId={data.organizerUserId}
                      organizerEmail={data.googleCalendar.googleEmail}
                      date={taskDueOn}
                      startTime={googleStartTime}
                      endTime={googleEndTime}
                      timeZone={googleTimeZone}
                      allDay={googleAllDay}
                      initialLocation={data.googleLink?.location ?? ""}
                      initialReminderMinutes={data.googleLink?.reminderMinutes ?? null}
                      initialAttendees={initialGoogleAttendees}
                      excludeGoogleEventId={data.googleLink?.googleEventId ?? null}
                    />

                    <p class="text-[8px] text-[#929A94]">Fuso: {googleTimeZone}. Desmarcar a sincronização remove do Google o evento criado pelo F10.</p>
                    {#if data.googleLink?.lastSyncError}<p class="rounded-lg bg-[#FFF4E9] px-2 py-2 text-[8px] font-medium text-[#A9510D]">A última sincronização apresentou erro. Salve novamente para tentar atualizar o evento.</p>{/if}
                  </div>
                {/if}
              </div>
            {:else}
              <div class="sm:col-span-2 rounded-2xl border border-[#E3E6ED] bg-[#FAFAFC] p-4"><div class="flex items-center gap-2"><CalendarCheck2 size={16} class="text-[#000A57]"/><strong class="text-[11px] text-[#3D4453]">Google Calendar</strong></div><p class="mt-1 text-[9px] leading-4 text-[#858B98]">Conecte sua conta para adicionar esta tarefa à sua agenda.</p><a href="/app/tasks/calendar/google/connect" class="mt-3 inline-flex min-h-9 items-center rounded-lg border border-[#D3D8E3] bg-white px-3 text-[9px] font-semibold text-[#000A57]">Conectar Google Calendar</a></div>
            {/if}

            {#if data.canUpdate}<button type="submit" class="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[#000A57] px-5 text-[12px] font-semibold text-white sm:col-span-2"><Save size={17}/>Salvar alterações</button>{/if}
          </fieldset>
        </form>
      </section>

      <section class="rounded-[24px] border border-[#E2E5ED] bg-white p-5 sm:p-7">
        <div class="flex items-start gap-3"><span class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#EEF0FF] text-[#000A57]"><MessageSquare size={19}/></span><div><h2 class="text-[16px] font-semibold text-[#11182C]">Comentários</h2><p class="mt-1 text-[11px] text-[#858A98]">Registre contexto, decisões e andamento. Use @ para chamar alguém do projeto.</p></div></div>
        {#if data.details.comments.length > 0}<div class="mt-6 space-y-3">{#each data.details.comments as comment}<article class="rounded-2xl border border-[#E5E7ED] bg-[#FAFAFC] px-4 py-4"><div class="flex flex-wrap items-center justify-between gap-2"><strong class="text-[11px] font-semibold text-[#3B4150]">{comment.authorName ?? "Usuário removido"}</strong><span class="text-[9px] text-[#999EAA]">{formatDateTime(comment.createdAt)}</span></div><p class="mt-2 whitespace-pre-wrap text-[11px] leading-5 text-[#646A79]">{comment.body}</p></article>{/each}</div>{:else}<p class="mt-6 rounded-2xl border border-dashed border-[#D6DAE3] bg-[#FAFAFC] px-4 py-8 text-center text-[10px] text-[#9398A5]">Nenhum comentário ainda.</p>{/if}
        {#if data.canUpdate}<form method="POST" action="?/comment" class="mt-5"><MentionTextarea users={data.details.projectMembers} name="body" rows={4} maxlength={5000} placeholder="Adicionar comentário... use @ para mencionar" className="w-full resize-y rounded-xl border border-[#DDE1EA] px-3 py-3 text-[12px] leading-5 outline-none focus:border-[#000A57]"/><button type="submit" class="mt-3 inline-flex min-h-10 items-center justify-center rounded-xl bg-[#000A57] px-4 text-[11px] font-semibold text-white">Comentar</button></form>{/if}
      </section>
    </div>

    <aside class="space-y-6">
      {#if data.ticketOrigins.length > 0}
        <section class="rounded-[24px] border border-[#D8DEF2] bg-[#F8F9FF] p-5">
          <div class="flex items-center gap-3"><Headphones size={18} class="text-[#000A57]"/><h2 class="text-[14px] font-semibold text-[#11182C]">Origem no suporte</h2></div>
          <p class="mt-2 text-[9px] leading-4 text-[#7D8494]">Esta tarefa nasceu de um atendimento. O chat usa o mesmo ticket, por isso o vínculo fica centralizado aqui.</p>
          <div class="mt-4 space-y-2">{#each data.ticketOrigins as ticket}<a href={`/app/tickets/${ticket.id}`} class="block rounded-xl border border-[#DDE2F2] bg-white px-3 py-3 transition hover:border-[#B8C1E5]"><strong class="block text-[10px] text-[#000A57]">Ticket #{ticket.ticketNumber}</strong><span class="mt-1 line-clamp-2 block text-[9px] leading-4 text-[#72798A]">{ticket.subject}</span></a>{/each}</div>
        </section>
      {/if}

      <section class="rounded-[24px] border border-[#E2E5ED] bg-white p-5"><div class="flex items-center gap-3"><UserRound size={18} class="text-[#000A57]"/><h2 class="text-[14px] font-semibold text-[#11182C]">Responsável</h2></div><div class="mt-4 flex flex-wrap gap-2">{#each data.details.assignees as assignee}<span class="rounded-xl bg-[#EEF0FF] px-3 py-2 text-[10px] font-semibold text-[#000A57]">{assignee.name}</span>{/each}</div>{#if data.canAssign}<form method="POST" action="?/assign" class="mt-4 flex gap-2"><select name="assigneeId" required class="h-10 min-w-0 flex-1 rounded-xl border border-[#DDE1EA] bg-white px-2 text-[10px]">{#each data.details.projectMembers as member}<option value={member.id} selected={data.details.assignees[0]?.userId === member.id}>{member.name}</option>{/each}</select><button type="submit" class="h-10 rounded-xl bg-[#000A57] px-3 text-[10px] font-semibold text-white">Salvar</button></form>{/if}</section>

      <section class="rounded-[24px] border border-[#E2E5ED] bg-white p-5"><div class="flex items-center gap-3"><CalendarDays size={18} class="text-[#EA6D0B]"/><h2 class="text-[14px] font-semibold text-[#11182C]">Datas</h2></div><dl class="mt-4 space-y-3 text-[10px]"><div class="flex justify-between gap-3"><dt class="text-[#8C919E]">Criada</dt><dd class="text-right font-medium text-[#555B69]">{formatDateTime(data.details.task.createdAt)}</dd></div><div class="flex justify-between gap-3"><dt class="text-[#8C919E]">Atualizada</dt><dd class="text-right font-medium text-[#555B69]">{formatDateTime(data.details.task.updatedAt)}</dd></div><div class="flex justify-between gap-3"><dt class="text-[#8C919E]">Prazo</dt><dd class="text-right font-medium text-[#555B69]">{data.details.task.dueOn ? data.details.task.dueOn.split("-").reverse().join("/") : "Sem prazo"}</dd></div>{#if data.details.task.completedAt}<div class="flex justify-between gap-3"><dt class="text-[#8C919E]">Concluída</dt><dd class="text-right font-medium text-[#2F7045]">{formatDateTime(data.details.task.completedAt)}</dd></div>{/if}</dl></section>

      <section class="rounded-[24px] border border-[#E2E5ED] bg-white p-5"><div class="flex items-center gap-3"><History size={18} class="text-[#000A57]"/><h2 class="text-[14px] font-semibold text-[#11182C]">Histórico</h2></div><div class="mt-4 space-y-4">{#each data.details.activities as activity}<div class="border-l-2 border-[#E5E7ED] pl-3"><p class="text-[10px] leading-4 text-[#626877]"><strong class="font-semibold text-[#3E4453]">{activity.actorName ?? "Sistema"}</strong> {activityLabels[activity.action] ?? activity.action}</p><span class="mt-1 block text-[8px] text-[#9B9FAC]">{formatDateTime(activity.createdAt)}</span></div>{/each}</div></section>
    </aside>
  </div>
</div>
