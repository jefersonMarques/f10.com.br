<script lang="ts">
  import { ExternalLink, FileText, Paperclip, Tag, Trash2, X } from "lucide-svelte";
  import TicketTaskPanel from "$lib/components/operations/TicketTaskPanel.svelte";
  import { eventLabels, formatBytes, formatDateTime, labelClasses, priorityLabels } from "./presentation";
  import type { TicketCardData, TicketWorkflow, TicketWorkflowBoard } from "./types";

  export let card: TicketCardData;
  export let canReply = false;
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

  function changeWorkflow(event: Event): void {
    const selectedWorkflowId = (event.currentTarget as HTMLSelectElement).value;
    cardWorkflowId = selectedWorkflowId;
    const selectedWorkflow: TicketWorkflow | null = selectedWorkflowId === workflowBoard.globalWorkflow?.id
      ? workflowBoard.globalWorkflow
      : workflowBoard.areaWorkflows.find((workflow) => workflow.id === selectedWorkflowId) ?? null;
    cardStageId = selectedWorkflow?.stages[0]?.id ?? "";
  }
</script>

<div class="fixed inset-0 z-[120] overflow-y-auto bg-[#010D28]/45 p-3 sm:p-6" role="presentation">
  <button type="button" class="fixed inset-0 cursor-default" aria-label={`Fechar ticket ${card.details.ticket.ticketNumber}`} on:click={onClose}></button>
  <div class="relative z-10 mx-auto grid min-h-[680px] w-full max-w-[1120px] overflow-hidden rounded-[20px] border border-[#D8DCE5] bg-[#F7F8FA] shadow-[0_30px_100px_rgba(1,13,40,0.35)] lg:grid-cols-[minmax(0,1.65fr)_minmax(330px,0.85fr)]" role="dialog" aria-modal="true" aria-label={`Ticket ${card.details.ticket.ticketNumber}`}>
    <div class="min-w-0 bg-white">
      <header class="flex items-start gap-3 border-b border-[#E5E7EC] px-5 py-5 sm:px-7">
        <FileText size={20} class="mt-1 shrink-0 text-[#5E6574]"/>
        <div class="min-w-0 flex-1">
          <div class="flex flex-wrap items-center gap-2"><span class="application-text-meta font-bold text-[#EA6D0B]">#{card.details.ticket.ticketNumber}</span><span class="application-text-meta text-[#7C8290]">{priorityLabels[card.details.ticket.priority]}</span></div>
          <h2 class="mt-1 text-[23px] font-semibold leading-8 text-[#2B303A]">{card.details.ticket.subject}</h2>
          <p class="application-text-meta mt-1 text-[#858B99]">{card.workflowContext?.areaName ? `${card.workflowContext.areaName} · ${card.workflowContext.areaStageName ?? card.workflowContext.globalStageName}` : card.workflowContext?.globalStageName ?? "Fluxo global"}</p>
        </div>
        <button type="button" on:click={onClose} class="flex h-9 w-9 items-center justify-center rounded-lg text-[#6F7685] hover:bg-[#F0F1F4]"><X size={18}/></button>
      </header>

      <div class="space-y-7 px-5 py-6 sm:px-7">
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
          {#if canReply}
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

    <aside class="border-l border-[#E0E3E8] bg-[#F5F6F8] p-5 sm:p-6">
      <div class="space-y-5">
        <section class="rounded-xl border border-[#DDE1E7] bg-white p-4">
          <h3 class="application-text-caption font-semibold text-[#3D4452]">Área e coluna</h3>
          <p class="application-text-meta mt-1 leading-4 text-[#858B99]">Enquanto estiver em uma área, o ticket precisa alcançar uma coluna terminal antes de voltar ao fluxo global ou seguir para outra área.</p>
          <select value={cardWorkflowId} on:change={changeWorkflow} disabled={!canReply} class="application-text-meta mt-3 h-10 w-full rounded-lg border border-[#D9DDE4] bg-white px-2"><option value={workflowBoard.globalWorkflow?.id ?? ""}>Fluxo global</option>{#each movableAreaWorkflows as workflow}<option value={workflow.id}>Área · {workflow.areaName}</option>{/each}</select>
          <select bind:value={cardStageId} disabled={!canReply} class="application-text-meta mt-2 h-10 w-full rounded-lg border border-[#D9DDE4] bg-white px-2">{#each cardStages as stage}<option value={stage.id}>{stage.name}{stage.stageType === "area_gateway" ? ` · ${stage.linkedAreaName}` : ""}</option>{/each}</select>
          {#if canReply}<button type="button" on:click={() => void onMove()} class="application-text-meta mt-2 h-9 w-full rounded-lg bg-[#000A57] font-semibold text-white">Mover ticket</button>{/if}
        </section>

        <section class="rounded-xl border border-[#DDE1E7] bg-white p-4">
          <h3 class="application-text-caption flex items-center gap-2 font-semibold text-[#3D4452]"><Tag size={13}/>Etiquetas</h3>
          {#if canReply}
            <select on:change={(event) => { const id = (event.currentTarget as HTMLSelectElement).value; if (id) void onAddLabel(id); event.currentTarget.value = ""; }} class="application-text-meta mt-3 h-10 w-full rounded-lg border border-[#D9DDE4] bg-white px-2"><option value="">Adicionar etiqueta...</option>{#each card.labels.filter((label) => !card.selectedLabels.some((selected) => selected.id === label.id)) as label}<option value={label.id}>{label.name}</option>{/each}</select>
            <form on:submit={onCreateLabel} class="mt-3 grid grid-cols-[1fr_100px] gap-2"><input name="name" required minlength="2" maxlength="40" placeholder="Nova etiqueta" class="application-text-meta h-9 rounded-lg border border-[#D9DDE4] px-2"/><select name="color" class="application-text-meta h-9 rounded-lg border border-[#D9DDE4] bg-white px-2"><option value="blue">Azul</option><option value="green">Verde</option><option value="yellow">Amarela</option><option value="orange">Laranja</option><option value="red">Vermelha</option><option value="purple">Roxa</option><option value="gray">Cinza</option></select><button class="application-text-meta col-span-2 h-8 rounded-lg border border-[#D9DDE4] font-semibold text-[#4E5565]">Criar e adicionar</button></form>
          {/if}
        </section>

        <section class="rounded-xl border border-[#DDE1E7] bg-white p-4">
          <h3 class="application-text-caption flex items-center gap-2 font-semibold text-[#3D4452]"><Paperclip size={13}/>Adicionar anexo</h3>
          {#if canReply && card.attachmentsEnabled}
            <form on:submit={onUploadAttachment} class="mt-3"><input name="file" type="file" required accept="image/png,image/jpeg,image/webp,image/gif,application/pdf,text/plain,.docx,.xlsx,.zip" class="application-text-meta block w-full text-[#6C7381]"/><button class="application-text-meta mt-3 h-9 w-full rounded-lg border border-[#D9DDE4] bg-white font-semibold text-[#4E5565]">Enviar arquivo</button></form>
          {:else if !card.attachmentsEnabled}
            <p class="application-text-meta mt-2 leading-4 text-[#8A5A2A]">Configure o storage S3 para habilitar anexos.</p>
          {/if}
        </section>

        <TicketTaskPanel ticketId={card.details.ticket.id} ticketNumber={card.details.ticket.ticketNumber} ticketSubject={card.details.ticket.subject} tasks={card.linkedTasks} projects={card.taskProjects} canCreate={card.canCreateTask} onCreated={onRefresh}/>

        <section class="application-text-meta rounded-xl border border-[#DDE1E7] bg-white p-4 leading-5 text-[#6D7482]"><p><strong>Cliente:</strong> {#if card.details.ticket.customerContactId}<a href={`/app/customers/${card.details.ticket.customerContactId}`} class="font-semibold text-[#000A57] hover:underline">{card.details.ticket.customerName ?? "Não identificado"}</a>{:else}{card.details.ticket.customerName ?? "Não identificado"}{/if}</p><p><strong>Fila técnica:</strong> {card.details.ticket.queueName}</p><p><strong>Responsável:</strong> {card.details.ticket.assignedUserName ?? "Sem responsável"}</p></section>
        <a href={`/app/tickets/${card.details.ticket.id}`} class="application-text-meta flex h-10 items-center justify-center gap-2 rounded-lg border border-[#CCD1DA] bg-white font-semibold text-[#000A57]"><ExternalLink size={12}/>Abrir página completa</a>
      </div>
    </aside>
  </div>
</div>
