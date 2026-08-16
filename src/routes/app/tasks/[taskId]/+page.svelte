<script lang="ts">
  import {
    ArrowLeft,
    CalendarDays,
    CheckCircle2,
    CircleAlert,
    Headphones,
    History,
    MessageSquare,
    Save,
    UserRound,
  } from "lucide-svelte";
  import MentionTextarea from "$lib/components/operations/MentionTextarea.svelte";
  import type { ActionData, PageData } from "./$types";

  export let data: PageData;
  export let form: ActionData;

  const priorityLabels: Record<string, string> = { low: "Baixa", normal: "Normal", high: "Alta", urgent: "Urgente" };
  const activityLabels: Record<string, string> = {
    "task.created": "criou a tarefa",
    "task.status.changed": "alterou o status",
    "task.details.updated": "atualizou os detalhes",
    "task.assignee.changed": "alterou o responsável",
    "task.comment.added": "adicionou um comentário",
  };

  function formatDateTime(value: string | Date): string {
    return new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" }).format(new Date(value));
  }
</script>

<svelte:head><title>{data.details.task.title} | Tarefas | F10 Operations</title></svelte:head>

<div class="mx-auto max-w-[1280px] px-5 py-7 sm:px-8 sm:py-9">
  <a href={`/app/tasks?project=${data.details.task.projectId}`} class="inline-flex min-h-10 items-center gap-2 rounded-xl px-2 text-[12px] font-semibold text-[#5F6575] transition hover:bg-white hover:text-[#000A57]"><ArrowLeft size={17}/>Voltar para {data.details.task.projectName}</a>

  <div class="mt-5"><div class="flex flex-wrap items-center gap-2"><span class="rounded-full bg-[#EEF0FF] px-3 py-1.5 text-[10px] font-bold text-[#000A57]">{data.details.task.statusName}</span><span class="rounded-full bg-[#F3F4F7] px-3 py-1.5 text-[10px] font-semibold text-[#737989]">{priorityLabels[data.details.task.priority]}</span></div><h1 class="mt-3 text-[30px] font-semibold tracking-[-0.035em] text-[#010D28] sm:text-[38px]">{data.details.task.title}</h1><p class="mt-2 text-[12px] text-[#7C8291]">Projeto: {data.details.task.projectName}</p></div>

  {#if form?.message}<div class={`mt-6 flex items-start gap-3 rounded-2xl border px-4 py-3 text-[12px] font-medium ${form.success ? "border-[#B9E6C9] bg-[#F1FBF4] text-[#176B35]" : "border-[#F0C8C8] bg-[#FFF5F5] text-[#9B2C2C]"}`}>{#if form.success}<CheckCircle2 size={18} class="mt-0.5 shrink-0"/>{:else}<CircleAlert size={18} class="mt-0.5 shrink-0"/>{/if}<span>{form.message}</span></div>{/if}

  <div class="mt-7 grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
    <div class="space-y-6">
      <section class="rounded-[24px] border border-[#E2E5ED] bg-white p-5 sm:p-7">
        <div><h2 class="text-[16px] font-semibold text-[#11182C]">Detalhes</h2><p class="mt-1 text-[11px] text-[#858A98]">Descrição, prioridade e prazo da tarefa.</p></div>
        <form method="POST" action="?/update" class="mt-6 grid gap-5 sm:grid-cols-2">
          <fieldset disabled={!data.canUpdate} class="contents disabled:opacity-70">
            <label class="block sm:col-span-2"><span class="mb-1.5 block text-[11px] font-semibold text-[#4A5060]">Título</span><input name="title" required maxlength="180" value={data.details.task.title} class="h-12 w-full rounded-xl border border-[#DDE1EA] px-4 text-[14px] font-medium text-[#11182C] outline-none focus:border-[#000A57]"/></label>
            <label class="block sm:col-span-2"><span class="mb-1.5 block text-[11px] font-semibold text-[#4A5060]">Descrição</span><textarea name="description" maxlength="5000" rows="8" value={data.details.task.description} class="w-full resize-y rounded-xl border border-[#DDE1EA] px-4 py-3 text-[13px] leading-6 outline-none focus:border-[#000A57]"></textarea></label>
            <label class="block"><span class="mb-1.5 block text-[11px] font-semibold text-[#4A5060]">Prioridade</span><select name="priority" value={data.details.task.priority} class="h-11 w-full rounded-xl border border-[#DDE1EA] bg-white px-3 text-[12px]"><option value="low">Baixa</option><option value="normal">Normal</option><option value="high">Alta</option><option value="urgent">Urgente</option></select></label>
            <label class="block"><span class="mb-1.5 block text-[11px] font-semibold text-[#4A5060]">Prazo</span><input name="dueOn" type="date" value={data.details.task.dueOn ?? ""} class="h-11 w-full rounded-xl border border-[#DDE1EA] px-3 text-[12px]"/></label>
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

      <section class="rounded-[24px] border border-[#E2E5ED] bg-white p-5"><div class="flex items-center gap-3"><CalendarDays size={18} class="text-[#EA6D0B]"/><h2 class="text-[14px] font-semibold text-[#11182C]">Datas</h2></div><dl class="mt-4 space-y-3 text-[10px]"><div class="flex justify-between gap-3"><dt class="text-[#8C919E]">Criada</dt><dd class="text-right font-medium text-[#555B69]">{formatDateTime(data.details.task.createdAt)}</dd></div><div class="flex justify-between gap-3"><dt class="text-[#8C919E]">Atualizada</dt><dd class="text-right font-medium text-[#555B69]">{formatDateTime(data.details.task.updatedAt)}</dd></div><div class="flex justify-between gap-3"><dt class="text-[#8C919E]">Prazo</dt><dd class="text-right font-medium text-[#555B69]">{data.details.task.dueOn ? data.details.task.dueOn.split("-").reverse().join("/") : "Sem prazo"}</dd></div></dl></section>

      <section class="rounded-[24px] border border-[#E2E5ED] bg-white p-5"><div class="flex items-center gap-3"><History size={18} class="text-[#000A57]"/><h2 class="text-[14px] font-semibold text-[#11182C]">Histórico</h2></div><div class="mt-4 space-y-4">{#each data.details.activities as activity}<div class="border-l-2 border-[#E5E7ED] pl-3"><p class="text-[10px] leading-4 text-[#626877]"><strong class="font-semibold text-[#3E4453]">{activity.actorName ?? "Sistema"}</strong> {activityLabels[activity.action] ?? activity.action}</p><span class="mt-1 block text-[8px] text-[#9B9FAC]">{formatDateTime(activity.createdAt)}</span></div>{/each}</div></section>
    </aside>
  </div>
</div>
