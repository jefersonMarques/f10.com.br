<script lang="ts">
  import { Clock3, Download, ExternalLink, FileText, Paperclip, Star, Tag, Trash2, UsersRound, X } from "lucide-svelte";
  import TicketTaskPanel from "$lib/components/operations/TicketTaskPanel.svelte";
  import { eventLabels, formatBytes, formatDateTime, labelClasses, priorityLabels } from "./presentation";
  import type { TicketCardData, TicketWorkflow, TicketWorkflowBoard } from "./types";

  export let card: TicketCardData;
  export let canReply = false;
  export let embedded = false;
  export let workflowBoard: TicketWorkflowBoard;
  export let cardWorkflowId: string;
  export let cardStageId: string;
  export let onClose: () => void;
  export let onMove: () => void | Promise<void>;
  export let onAddComment: (event: SubmitEvent) => void | Promise<void>;
  export let onAddLabel: (tagId: string) => void | Promise<void>;
  export let onRemoveLabel: (tagId: string) => void | Promise<void>;
  export let onCreateLabel: (event: SubmitEvent) => void | Promise<void>;
  export let onUploadAttachment: (event: SubmitEvent) => void | Promise<void>;
  export let onDeleteAttachment: (attachmentId: string) => void | Promise<void>;
  export let onAddFollower: (userId: string) => void | Promise<void>;
  export let onRemoveFollower: (userId: string) => void | Promise<void>;
  export let onRefresh: () => void | Promise<void>;

  $: cardWorkflow = cardWorkflowId === workflowBoard.globalWorkflow?.id
    ? workflowBoard.globalWorkflow
    : workflowBoard.areaWorkflows.find((workflow) => workflow.id === cardWorkflowId) ?? null;
  $: cardStages = cardWorkflow?.stages ?? [];
  $: movableAreaWorkflows = workflowBoard.areaWorkflows.filter((workflow) =>
    Boolean(
      workflow.areaId
      && workflowBoard.globalWorkflow?.stages.some(
        (stage) => stage.stageType === "area_gateway" && stage.linkedAreaId === workflow.areaId,
      )
    ),
  );

  function initials(name: string): string {
    return name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase() ?? "")
      .join("");
  }

  function deadlineText(value: string | Date | null): string {
    if (!value) return "Sem meta";
    const diff = new Date(value).getTime() - Date.now();
    const absMinutes = Math.max(1, Math.round(Math.abs(diff) / 60_000));
    if (diff < 0) {
      return absMinutes < 60
        ? `Vencido há ${absMinutes} min`
        : `Vencido há ${Math.floor(absMinutes / 60)}h`;
    }
    return absMinutes < 60
      ? `${absMinutes} min restantes`
      : `${Math.floor(absMinutes / 60)}h ${absMinutes % 60}min restantes`;
  }

  function deadlineClass(value: string | Date | null): string {
    if (!value) return "text-[#8B909D]";
    const diff = new Date(value).getTime() - Date.now();
    if (diff < 0) return "text-[#A33A3A]";
    if (diff <= 60 * 60_000) return "text-[#A9510D]";
    return "text-[#2F7045]";
  }

  function changeWorkflow(event: Event): void {
    const selectedWorkflowId = (event.currentTarget as HTMLSelectElement).value;
    cardWorkflowId = selectedWorkflowId;
    const selectedWorkflow: TicketWorkflow | null = selectedWorkflowId === workflowBoard.globalWorkflow?.id
      ? workflowBoard.globalWorkflow
      : workflowBoard.areaWorkflows.find((workflow) => workflow.id === selectedWorkflowId) ?? null;
    cardStageId = selectedWorkflow?.stages[0]?.id ?? "";
  }
</script>

<div class={embedded ? "relative h-full min-h-0 w-full" : "fixed inset-0 z-[120] overflow-y-auto bg-[#010D28]/45 p-3 sm:p-6"} role="presentation">
  {#if !embedded}
    <button type="button" class="fixed inset-0 cursor-default" aria-label={`Fechar ticket ${card.details.ticket.ticketNumber}`} on:click={onClose}></button>
  {/if}
  <div class={embedded
    ? "relative grid h-full min-h-0 w-full overflow-hidden bg-[#F7F8FA] xl:grid-cols-[minmax(0,1.55fr)_minmax(300px,0.8fr)]"
    : "relative z-10 mx-auto grid min-h-[680px] w-full max-w-[1120px] overflow-hidden rounded-[20px] border border-[#D8DCE5] bg-[#F7F8FA] shadow-[0_30px_100px_rgba(1,13,40,0.35)] lg:grid-cols-[minmax(0,1.65fr)_minmax(330px,0.85fr)]"}
    role={embedded ? "region" : "dialog"}
    aria-modal={embedded ? undefined : "true"}
    aria-label={`Ticket ${card.details.ticket.ticketNumber}`}>
    <div class={embedded ? "relative flex min-h-0 min-w-0 flex-col bg-white" : "min-w-0 bg-white"}>
      {#if embedded}<span class="absolute inset-x-0 top-0 z-10 h-1 bg-[#EA6D0B]"></span>{/if}
      <header class={embedded ? "flex shrink-0 items-start gap-3 border-b border-[#E9EBF1] bg-white px-4 pb-3 pt-4 sm:px-5" : "flex items-start gap-3 border-b border-[#E5E7EC] px-5 py-5 sm:px-7"}>
        <span class={embedded ? "flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#EEF0FF] text-[#000A57]" : "mt-1 shrink-0 text-[#5E6574]"}>
          <FileText size={embedded ? 19 : 20}/>
        </span>
        <div class="min-w-0 flex-1">
          <div class="flex flex-wrap items-center gap-2">
            <span class={embedded ? "rounded-full bg-[#FFF0E4] px-2 py-1 text-[9px] font-bold text-[#B95B12]" : "application-text-meta font-bold text-[#EA6D0B]"}>#{card.details.ticket.ticketNumber}</span>
            <span class={embedded ? "rounded-full bg-[#F2F3F6] px-2 py-1 text-[9px] font-semibold text-[#666D7C]" : "application-text-meta text-[#7C8290]"}>{priorityLabels[card.details.ticket.priority]}</span>
          </div>
          <h2 class={embedded ? "mt-1.5 line-clamp-2 text-[14px] font-semibold leading-5 text-[#202637]" : "mt-1 text-[23px] font-semibold leading-8 text-[#2B303A]"}>{card.details.ticket.subject}</h2>
          <p class="application-text-meta mt-1 text-[#858B99]">{card.workflowContext?.areaName ? `${card.workflowContext.areaName} · ${card.workflowContext.areaStageName ?? card.workflowContext.globalStageName}` : card.workflowContext?.globalStageName ?? "Fluxo global"}</p>
        </div>
        <div class="flex shrink-0 items-center gap-2">
          {#if card.serviceRequest}
            <a href={`/app/tickets/${card.details.ticket.id}/export`} class="application-text-caption inline-flex h-9 items-center gap-2 rounded-lg border border-[#CCD1DA] bg-white px-3 font-semibold text-[#000A57]" title={`Baixar dados de ${card.serviceRequest.label}`}><Download size={14}/><span class="hidden sm:inline">Baixar dados</span></a>
          {/if}
          {#if embedded}
            <a href={`/app/tickets/${card.details.ticket.id}`} class="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-[#E0E3EA] bg-white text-[#69707E] transition hover:bg-[#F6F7F9] hover:text-[#000A57]" aria-label="Abrir página completa do ticket"><ExternalLink size={14}/></a>
          {/if}
          <button type="button" on:click={onClose} class="flex h-9 w-9 items-center justify-center rounded-lg text-[#6F7685] hover:bg-[#F0F1F4]"><X size={18}/></button>
        </div>
      </header>

      <div class={embedded ? "min-h-0 flex-1 space-y-7 overflow-y-auto px-5 py-5 sm:px-6" : "space-y-7 px-5 py-6 sm:px-7"}>
        <section>
          <div class="flex flex-wrap items-center gap-2">
            {#each card.selectedLabels as label}
              <button type="button" on:click={() => canReply && void onRemoveLabel(label.id)} class={`application-text-meta rounded px-2.5 py-1.5 font-semibold ${labelClasses[label.color] ?? labelClasses.gray}`}>{label.name}{#if canReply}<span class="ml-1">×</span>{/if}</button>
            {/each}
          </div>
        </section>

        <section>
          <h3 class="text-[13px] font-semibold text-[#343A46]">Descrição</h3>
          <div class="mt-3 whitespace-pre-wrap rounded-xl border border-[#E4E6EB] bg-[#FAFAFC] p-4 text-[11px] leading-6 text-[#555D6C]">{card.details.messages[0]?.body ?? "Sem descrição registrada."}</div>
        </section>

        <section>
          <div class="flex items-center justify-between"><h3 class="flex items-center gap-2 text-[13px] font-semibold text-[#343A46]"><Paperclip size={15}/>Anexos</h3><span class="application-text-meta text-[#8B909D]">{card.attachments.length}</span></div>
          <div class="mt-3 space-y-3">
            {#each card.attachments as attachment}
              <article class="flex gap-3 rounded-xl border border-[#E1E4E9] bg-[#FAFAFC] p-3">
                {#if attachment.contentType.startsWith("image/")}
                  <a href={attachment.href} target="_blank" rel="noreferrer" class="h-20 w-28 shrink-0 overflow-hidden rounded-lg border border-[#E2E5EA] bg-white"><img src={attachment.href} alt={attachment.originalName} class="h-full w-full object-cover"/></a>
                {:else}
                  <a href={attachment.href} target="_blank" rel="noreferrer" class="flex h-20 w-28 shrink-0 items-center justify-center rounded-lg border border-[#E2E5EA] bg-white text-[#7A8190]"><Paperclip size={22}/></a>
                {/if}
                <div class="min-w-0 flex-1">
                  <a href={attachment.href} target="_blank" rel="noreferrer" class="application-text-caption truncate font-semibold text-[#303746] hover:underline">{attachment.originalName}</a>
                  <p class="application-text-meta mt-1 text-[#8B909D]">{formatBytes(attachment.sizeBytes)} · {formatDateTime(attachment.createdAt)}</p>
                  {#if canReply}<button type="button" on:click={() => void onDeleteAttachment(attachment.id)} class="application-text-meta mt-3 inline-flex items-center gap-1 font-semibold text-[#A33A3A]"><Trash2 size={11}/>Remover</button>{/if}
                </div>
              </article>
            {:else}
              <div class="application-text-meta rounded-xl border border-dashed border-[#D6DAE3] px-4 py-7 text-center text-[#9499A5]">Nenhum anexo neste ticket.</div>
            {/each}
          </div>
        </section>

        <section>
          <h3 class="text-[13px] font-semibold text-[#343A46]">Comentários e atividade</h3>
          {#if card.canCommentInternal}
            <form on:submit={onAddComment} class="mt-3 flex gap-2"><textarea name="body" required maxlength="10000" rows="2" placeholder="Escrever um comentário interno..." class="application-text-meta min-h-[54px] flex-1 resize-y rounded-xl border border-[#DCE0E6] bg-white px-3 py-2 leading-4 outline-none focus:border-[#000A57]"></textarea><button class="application-text-meta self-end rounded-lg bg-[#000A57] px-3 py-2 font-semibold text-white">Comentar</button></form>
          {/if}
          <div class="mt-3 space-y-3">
            {#each card.details.messages.slice().reverse().slice(0, 12) as message}
              <article class="rounded-xl border border-[#E5E7EC] bg-white p-3"><div class="flex justify-between gap-3"><strong class="application-text-meta text-[#3E4553]">{message.authorUserName ?? message.customerName ?? "Sistema"}</strong><span class="application-text-meta text-[#989DA8]">{formatDateTime(message.createdAt)}</span></div><p class="application-text-meta mt-1.5 whitespace-pre-wrap leading-5 text-[#626978]">{message.body}</p></article>
            {/each}
            {#each card.details.events.slice(0, 10) as event}
              <div class="application-text-meta flex items-center justify-between gap-3 px-1 text-[#858B99]"><span><strong class="font-semibold text-[#606776]">{event.actorName ?? "Sistema"}</strong> {eventLabels[event.eventType] ?? event.eventType}</span><span class="shrink-0">{formatDateTime(event.createdAt)}</span></div>
            {/each}
          </div>
        </section>
      </div>
    </div>

    <aside class={embedded ? "hidden min-h-0 overflow-y-auto border-l border-[#E0E3E8] bg-[#F5F6FA] p-3 xl:block" : "border-l border-[#E0E3E8] bg-[#F5F6F8] p-5 sm:p-6"}>
      <div class={embedded ? "space-y-3" : "space-y-5"}>
        <section class="rounded-[20px] border border-[#E2E5ED] bg-white p-4 shadow-[0_10px_28px_rgba(1,13,40,0.04)]">
          <h3 class="application-text-caption font-semibold text-[#3D4452]">Área e coluna</h3>
          <p class="application-text-meta mt-1 leading-4 text-[#858B99]">Enquanto estiver em uma área, o ticket precisa alcançar uma coluna terminal antes de voltar ao fluxo global ou seguir para outra área.</p>
          <select value={cardWorkflowId} on:change={changeWorkflow} disabled={!canReply} class="application-text-meta mt-3 h-10 w-full rounded-lg border border-[#D9DDE4] bg-white px-2"><option value={workflowBoard.globalWorkflow?.id ?? ""}>Fluxo global</option>{#each movableAreaWorkflows as workflow}<option value={workflow.id}>Área · {workflow.areaName}</option>{/each}</select>
          <select bind:value={cardStageId} disabled={!canReply} class="application-text-meta mt-2 h-10 w-full rounded-lg border border-[#D9DDE4] bg-white px-2">{#each cardStages as stage}<option value={stage.id}>{stage.name}{stage.stageType === "area_gateway" ? ` · ${stage.linkedAreaName}` : ""}</option>{/each}</select>
          {#if canReply}<button type="button" on:click={() => void onMove()} class="application-text-meta mt-2 h-9 w-full rounded-lg bg-[#000A57] font-semibold text-white">Mover ticket</button>{/if}
        </section>

        <section class="rounded-[20px] border border-[#E2E5ED] bg-white p-4 shadow-[0_10px_28px_rgba(1,13,40,0.04)]">
          <h3 class="application-text-caption flex items-center gap-2 font-semibold text-[#3D4452]"><Clock3 size={13}/>SLA</h3>
          <div class="mt-3 space-y-2">
            <div class="flex items-center justify-between gap-3">
              <span class="application-text-meta text-[#777E8D]">1ª resposta</span>
              {#if card.details.ticket.firstResponseAt}
                <span class="application-text-meta font-semibold text-[#2F7045]">Respondido</span>
              {:else}
                <span class={`application-text-meta font-semibold ${deadlineClass(card.details.ticket.firstResponseDueAt)}`}>{deadlineText(card.details.ticket.firstResponseDueAt)}</span>
              {/if}
            </div>
            {#if card.details.ticket.firstResponseAt && card.details.ticket.nextResponseDueAt}
              <div class="flex items-center justify-between gap-3">
                <span class="application-text-meta text-[#777E8D]">Próxima resposta</span>
                <span class={`application-text-meta font-semibold ${deadlineClass(card.details.ticket.nextResponseDueAt)}`}>{deadlineText(card.details.ticket.nextResponseDueAt)}</span>
              </div>
            {/if}
            <div class="flex items-center justify-between gap-3">
              <span class="application-text-meta text-[#777E8D]">Resolução</span>
              {#if card.details.ticket.resolvedAt}
                <span class="application-text-meta font-semibold text-[#2F7045]">Concluído</span>
              {:else}
                <span class={`application-text-meta font-semibold ${deadlineClass(card.details.ticket.resolutionDueAt)}`}>{deadlineText(card.details.ticket.resolutionDueAt)}</span>
              {/if}
            </div>
          </div>
        </section>

        <section class="rounded-[20px] border border-[#E2E5ED] bg-white p-4 shadow-[0_10px_28px_rgba(1,13,40,0.04)]">
          <h3 class="application-text-caption flex items-center gap-2 font-semibold text-[#3D4452]"><UsersRound size={13}/>Seguidores</h3>
          <div class="mt-3 flex flex-wrap gap-2">
            {#each card.followers as follower}
              <span class="application-text-meta inline-flex items-center gap-1.5 rounded-full border border-[#E1E4EA] bg-[#FAFAFC] py-1 pl-1 pr-2 font-semibold text-[#555D6C]">
                <span class="flex h-6 w-6 items-center justify-center rounded-full bg-[#EEF0FF] text-[9px] font-bold text-[#000A57]">{initials(follower.name)}</span>
                {follower.name}
                {#if card.canManageFollowers}
                  <button type="button" title="Remover seguidor" aria-label={`Remover ${follower.name}`} on:click={() => void onRemoveFollower(follower.id)} class="ml-0.5 text-[#9B3C3C]">×</button>
                {/if}
              </span>
            {:else}
              <span class="application-text-meta text-[#9297A4]">Ninguém acompanhando.</span>
            {/each}
          </div>
          {#if card.canManageFollowers}
            <select
              class="application-text-meta mt-3 h-9 w-full rounded-lg border border-[#D9DDE4] bg-white px-2"
              on:change={(event) => {
                const userId = event.currentTarget.value;
                if (userId) void onAddFollower(userId);
                event.currentTarget.value = "";
              }}
            >
              <option value="">Adicionar seguidor...</option>
              {#each card.followerCandidates.filter((candidate) => !card.followers.some((follower) => follower.id === candidate.id)) as candidate}
                <option value={candidate.id}>{candidate.name}</option>
              {/each}
            </select>
          {/if}
        </section>

        <section class="rounded-[20px] border border-[#E2E5ED] bg-white p-4 shadow-[0_10px_28px_rgba(1,13,40,0.04)]">
          <h3 class="application-text-caption flex items-center gap-2 font-semibold text-[#3D4452]"><Tag size={13}/>Etiquetas</h3>
          {#if canReply}
            <select on:change={(event) => { const id = (event.currentTarget as HTMLSelectElement).value; if (id) void onAddLabel(id); event.currentTarget.value = ""; }} class="application-text-meta mt-3 h-10 w-full rounded-lg border border-[#D9DDE4] bg-white px-2"><option value="">Adicionar etiqueta...</option>{#each card.labels.filter((label) => !card.selectedLabels.some((selected) => selected.id === label.id)) as label}<option value={label.id}>{label.name}</option>{/each}</select>
            <form on:submit={onCreateLabel} class="mt-3 grid grid-cols-[1fr_100px] gap-2"><input name="name" required minlength="2" maxlength="40" placeholder="Nova etiqueta" class="application-text-meta h-9 rounded-lg border border-[#D9DDE4] px-2"/><select name="color" class="application-text-meta h-9 rounded-lg border border-[#D9DDE4] bg-white px-2"><option value="blue">Azul</option><option value="green">Verde</option><option value="yellow">Amarela</option><option value="orange">Laranja</option><option value="red">Vermelha</option><option value="purple">Roxa</option><option value="gray">Cinza</option></select><button class="application-text-meta col-span-2 h-8 rounded-lg border border-[#D9DDE4] font-semibold text-[#4E5565]">Criar e adicionar</button></form>
          {/if}
        </section>

        <section class="rounded-[20px] border border-[#E2E5ED] bg-white p-4 shadow-[0_10px_28px_rgba(1,13,40,0.04)]">
          <h3 class="application-text-caption flex items-center gap-2 font-semibold text-[#3D4452]"><Paperclip size={13}/>Adicionar anexo</h3>
          {#if canReply && card.attachmentsEnabled}
            <form on:submit={onUploadAttachment} class="mt-3"><input name="file" type="file" required accept="image/png,image/jpeg,image/webp,image/gif,application/pdf,text/plain,.docx,.xlsx,.zip" class="application-text-meta block w-full text-[#6C7381]"/><button class="application-text-meta mt-3 h-9 w-full rounded-lg border border-[#D9DDE4] bg-white font-semibold text-[#4E5565]">Enviar arquivo</button></form>
          {:else if !card.attachmentsEnabled}
            <p class="application-text-meta mt-2 leading-4 text-[#8A5A2A]">Configure o storage S3 para habilitar anexos.</p>
          {/if}
        </section>

        {#if card.satisfaction}
          <section class="rounded-xl border border-app-border bg-app-surface p-4">
            <h3 class="application-text-caption font-semibold text-app-text">Satisfação</h3>
            {#if card.satisfaction.answeredAt && card.satisfaction.score}
              <div class="mt-3 flex items-center gap-1 text-app-accent" aria-label={`${card.satisfaction.score} de 5 estrelas`}>
                {#each [1, 2, 3, 4, 5] as value}
                  <Star size={16} fill={value <= card.satisfaction.score ? "currentColor" : "none"} class={value <= card.satisfaction.score ? "text-app-accent" : "text-app-text-soft"}/>
                {/each}
              </div>
              {#if card.satisfaction.comment}
                <p class="application-text-meta mt-3 whitespace-pre-wrap leading-5 text-app-text-muted">“{card.satisfaction.comment}”</p>
              {/if}
            {:else}
              <p class="application-text-meta mt-2 text-app-text-soft">Avaliação enviada ao cliente e aguardando resposta.</p>
            {/if}
          </section>
        {/if}

        <TicketTaskPanel ticketId={card.details.ticket.id} ticketNumber={card.details.ticket.ticketNumber} ticketSubject={card.details.ticket.subject} tasks={card.linkedTasks} projects={card.taskProjects} canCreate={card.canCreateTask} onCreated={onRefresh}/>

        <section class="application-text-meta rounded-[20px] border border-[#E2E5ED] bg-white p-4 leading-5 text-[#6D7482] shadow-[0_10px_28px_rgba(1,13,40,0.04)]"><p><strong>Cliente:</strong> {#if card.details.ticket.customerContactId}<a href={`/app/customers/${card.details.ticket.customerContactId}`} class="font-semibold text-[#000A57] hover:underline">{card.details.ticket.customerName ?? "Não identificado"}</a>{:else}{card.details.ticket.customerName ?? "Não identificado"}{/if}</p><p><strong>Fila técnica:</strong> {card.details.ticket.queueName}</p><p><strong>Responsável:</strong> {card.details.ticket.assignedUserName ?? "Sem responsável"}</p></section>
        <a href={`/app/tickets/${card.details.ticket.id}`} class="application-text-meta flex h-10 items-center justify-center gap-2 rounded-lg border border-[#CCD1DA] bg-white font-semibold text-[#000A57]"><ExternalLink size={12}/>Abrir página completa</a>
      </div>
    </aside>
  </div>
</div>
