<script lang="ts">
  import { deserialize } from "$app/forms";
  import { goto, invalidateAll } from "$app/navigation";
  import {
    Building2,
    CalendarDays,
    CheckCircle2,
    CircleAlert,
    Clock3,
    FileText,
    Headphones,
    MonitorCog,
    Paperclip,
    Route,
    ShieldCheck,
    Star,
    Tag,
    Trash2,
    UserRound,
    UsersRound,
    X,
  } from "lucide-svelte";
  import MentionTextarea from "$lib/components/operations/MentionTextarea.svelte";
  import TicketCustomerPicker from "$lib/components/operations/TicketCustomerPicker.svelte";
  import TicketTaskPanel from "$lib/components/operations/TicketTaskPanel.svelte";
  import ServiceRequestDetailsCard from "$lib/components/serviceRequests/ServiceRequestDetailsCard.svelte";
  import {
    eventLabels,
    formatBytes,
    formatDateTime,
    labelClasses,
    priorityLabels,
  } from "./presentation";
  import type { TicketDetailsData, TicketWorkflow } from "./types";

  type TicketSurface = "page" | "split" | "modal";
  type ActionFeedback = { success?: boolean; message?: string } | null | undefined;

  export let ticketData: TicketDetailsData;
  export let surface: TicketSurface = "page";
  export let feedback: ActionFeedback = null;
  export let onClose: (() => void) | null = null;
  export let onRefresh: () => void | Promise<void> = () => undefined;

  const statusLabels: Record<string, string> = {
    new: "Novo",
    open: "Aberto",
    in_progress: "Em andamento",
    waiting_customer: "Aguardando cliente",
    resolved: "Resolvido",
    closed: "Fechado",
  };

  let actionFeedback: ActionFeedback = null;
  let actionLoading = "";
  let workflowSelectionKey = "";
  let workflowId = "";
  let stageId = "";

  $: workflowStateKey = [
    ticketData.details.ticket.id,
    ticketData.workflowContext?.globalStageId ?? "",
    ticketData.workflowContext?.areaWorkflowId ?? "",
    ticketData.workflowContext?.areaStageId ?? "",
  ].join(":");

  $: if (workflowSelectionKey !== workflowStateKey) {
    workflowSelectionKey = workflowStateKey;
    initializeWorkflowSelection();
  }

  $: selectedWorkflow = workflowId === ticketData.workflowBoard.globalWorkflow?.id
    ? ticketData.workflowBoard.globalWorkflow
    : ticketData.workflowBoard.areaWorkflows.find((workflow) => workflow.id === workflowId) ?? null;
  $: stageOptions = selectedWorkflow?.stages ?? [];
  $: movableAreaWorkflows = ticketData.workflowBoard.areaWorkflows.filter((workflow) =>
    Boolean(
      workflow.areaId
      && ticketData.workflowBoard.globalWorkflow?.stages.some(
        (stage) => stage.stageType === "area_gateway" && stage.linkedAreaId === workflow.areaId,
      )
    ),
  );
  $: visibleFeedback = actionFeedback ?? feedback;

  function initializeWorkflowSelection(): void {
    if (
      ticketData.workflowContext?.areaWorkflowId
      && ticketData.workflowBoard.areaWorkflows.some(
        (workflow) => workflow.id === ticketData.workflowContext?.areaWorkflowId,
      )
    ) {
      workflowId = ticketData.workflowContext.areaWorkflowId;
      stageId = ticketData.workflowContext.areaStageId ?? "";
      return;
    }

    workflowId = ticketData.workflowBoard.globalWorkflow?.id ?? "";
    stageId = ticketData.workflowContext?.globalStageId ?? "";
  }

  function actionUrl(action: string): string {
    return `/app/tickets/${ticketData.details.ticket.id}?/${action}`;
  }

  function formatDate(value: string): string {
    const [year, month, day] = value.split("-").map(Number);
    return new Intl.DateTimeFormat("pt-BR", { dateStyle: "short" }).format(
      new Date(year, month - 1, day),
    );
  }

  function deadlineText(value: string | Date | null): string {
    if (!value) return "Sem meta";
    const diff = new Date(value).getTime() - Date.now();
    const minutes = Math.max(1, Math.round(Math.abs(diff) / 60_000));
    if (diff < 0) {
      return minutes < 60 ? `Vencido há ${minutes} min` : `Vencido há ${Math.floor(minutes / 60)}h`;
    }
    return minutes < 60
      ? `${minutes} min restantes`
      : `${Math.floor(minutes / 60)}h ${minutes % 60}min restantes`;
  }

  function deadlineClass(value: string | Date | null): string {
    if (!value) return "text-[#8B909D]";
    const diff = new Date(value).getTime() - Date.now();
    if (diff < 0) return "text-[#A33A3A]";
    if (diff <= 60 * 60_000) return "text-[#A9510D]";
    return "text-[#2F7045]";
  }

  function initials(name: string): string {
    return name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase() ?? "")
      .join("");
  }

  async function refreshDetails(): Promise<void> {
    await invalidateAll();
    await onRefresh();
  }

  async function postAction(action: string, body: FormData): Promise<boolean> {
    if (actionLoading) return false;
    actionLoading = action;
    actionFeedback = null;

    try {
      const response = await fetch(actionUrl(action), {
        method: "POST",
        body,
        headers: {
          "x-sveltekit-action": "true",
        },
      });
      const result = deserialize(await response.text());

      if (result.type === "redirect") {
        await goto(result.location);
        return true;
      }

      if (result.type === "success") {
        const payload = result.data as ActionFeedback;
        actionFeedback = {
          success: payload?.success ?? true,
          message: payload?.message ?? "Alteração salva.",
        };
        await refreshDetails();
        return true;
      }

      if (result.type === "failure") {
        const payload = result.data as ActionFeedback;
        actionFeedback = {
          success: false,
          message: payload?.message ?? "Não foi possível concluir a operação.",
        };
        return false;
      }

      actionFeedback = {
        success: false,
        message: "Não foi possível concluir a operação.",
      };
      return false;
    } catch {
      actionFeedback = {
        success: false,
        message: "Não foi possível concluir a operação.",
      };
      return false;
    } finally {
      actionLoading = "";
    }
  }

  async function submitForm(
    event: SubmitEvent,
    action: string,
    resetOnSuccess = false,
  ): Promise<void> {
    const form = event.currentTarget as HTMLFormElement;
    const saved = await postAction(action, new FormData(form));
    if (saved && resetOnSuccess) form.reset();
  }

  async function addLabel(event: Event): Promise<void> {
    const select = event.currentTarget as HTMLSelectElement;
    if (!select.value) return;
    const body = new FormData();
    body.set("tagId", select.value);
    if (await postAction("addLabel", body)) select.value = "";
  }

  async function removeLabel(tagId: string): Promise<void> {
    const body = new FormData();
    body.set("tagId", tagId);
    await postAction("removeLabel", body);
  }

  async function addFollower(event: Event): Promise<void> {
    const select = event.currentTarget as HTMLSelectElement;
    if (!select.value) return;
    const body = new FormData();
    body.set("userId", select.value);
    if (await postAction("addFollower", body)) select.value = "";
  }

  async function removeFollower(userId: string): Promise<void> {
    const body = new FormData();
    body.set("userId", userId);
    await postAction("removeFollower", body);
  }

  async function deleteAttachment(attachmentId: string): Promise<void> {
    if (!confirm("Remover este anexo?")) return;
    const body = new FormData();
    body.set("attachmentId", attachmentId);
    await postAction("deleteAttachment", body);
  }

  function changeWorkflow(event: Event): void {
    workflowId = (event.currentTarget as HTMLSelectElement).value;
    const workflow: TicketWorkflow | null = workflowId === ticketData.workflowBoard.globalWorkflow?.id
      ? ticketData.workflowBoard.globalWorkflow
      : ticketData.workflowBoard.areaWorkflows.find((item) => item.id === workflowId) ?? null;
    stageId = workflow?.stages[0]?.id ?? "";
  }
</script>

<div class={surface === "split" ? "h-full min-h-0 overflow-y-auto bg-[#F7F8FA]" : "bg-[#F5F6FA]"}>
  <section class={surface === "split"
    ? "relative min-h-full overflow-hidden bg-white"
    : "relative overflow-hidden rounded-[24px] border border-[#E2E5ED] bg-white shadow-[0_12px_32px_rgba(1,13,40,0.05)]"}>
    <span class="absolute inset-x-0 top-0 z-30 h-1 bg-[#EA6D0B]"></span>

    <header class="sticky top-0 z-20 flex items-start gap-3 border-b border-[#E9EBF1] bg-white px-4 pb-3 pt-4 sm:px-5">
      <span class="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#EEF0FF] text-[#000A57]">
        <FileText size={19}/>
      </span>

      <div class="min-w-0 flex-1">
        <div class="flex flex-wrap items-center gap-2">
          <span class="rounded-full bg-[#FFF0E4] px-2 py-1 text-[9px] font-bold text-[#B95B12]">#{ticketData.details.ticket.ticketNumber}</span>
          <span class="rounded-full bg-[#EEF0FF] px-2 py-1 text-[9px] font-semibold text-[#000A57]">{statusLabels[ticketData.details.ticket.status] ?? ticketData.details.ticket.status}</span>
          <span class="rounded-full bg-[#F2F3F6] px-2 py-1 text-[9px] font-semibold text-[#666D7C]">{priorityLabels[ticketData.details.ticket.priority] ?? ticketData.details.ticket.priority}</span>
          <span class="inline-flex items-center gap-1 rounded-full bg-[#FFF6EC] px-2 py-1 text-[9px] font-semibold text-[#9B530F]"><CalendarDays size={10}/>{formatDate(ticketData.details.ticket.dueOn)}</span>
        </div>
        <h1 class="mt-1.5 line-clamp-2 text-[17px] font-semibold leading-6 text-[#202637]">{ticketData.details.ticket.subject}</h1>
        <p class="mt-1 truncate text-[10px] text-[#858B98]">
          {ticketData.details.ticket.queueName} · {ticketData.workflowContext?.areaName
            ? `${ticketData.workflowContext.areaName} · ${ticketData.workflowContext.areaStageName ?? ticketData.workflowContext.globalStageName}`
            : ticketData.workflowContext?.globalStageName ?? "Fluxo global"}
        </p>
      </div>

      <div class="flex shrink-0 items-center gap-2">
        <a
          href={`/app/tickets/${ticketData.details.ticket.id}/remote`}
          class="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-[#E0E3EA] bg-white text-[#69707E] transition hover:bg-[#F6F7F9] hover:text-[#000A57]"
          aria-label="Acesso remoto"
          title="Acesso remoto"
        ><MonitorCog size={14}/></a>
        {#if surface === "modal" && onClose}
          <button type="button" on:click={onClose} class="flex h-9 w-9 items-center justify-center rounded-xl border border-[#E0E3EA] text-[#69707E] hover:bg-[#F6F7F9]" aria-label="Fechar"><X size={16}/></button>
        {/if}
      </div>
    </header>

    {#if visibleFeedback?.message}
      <div class={`mx-4 mt-4 flex items-start gap-2 rounded-xl px-3 py-2.5 text-[10px] font-medium sm:mx-5 ${visibleFeedback.success ? "bg-[#EEF8F1] text-[#2F7045]" : "bg-[#FFF0F0] text-[#9B3C3C]"}`}>
        {#if visibleFeedback.success}<CheckCircle2 size={13} class="mt-0.5 shrink-0"/>{:else}<CircleAlert size={13} class="mt-0.5 shrink-0"/>{/if}
        <span>{visibleFeedback.message}</span>
      </div>
    {/if}

    <div class="grid xl:grid-cols-[minmax(0,1.5fr)_minmax(310px,0.72fr)]">
      <main class="min-w-0 space-y-5 bg-white p-4 sm:p-5">
        {#if ticketData.selectedLabels.length > 0}
          <div class="flex flex-wrap gap-1.5">
            {#each ticketData.selectedLabels as label}
              <span class={`application-text-meta inline-flex items-center gap-1 rounded px-2 py-1 font-semibold ${labelClasses[label.color] ?? labelClasses.gray}`}>
                {label.name}
                {#if ticketData.canReply}
                  <button type="button" on:click={() => void removeLabel(label.id)} aria-label={`Remover etiqueta ${label.name}`} class="font-bold">×</button>
                {/if}
              </span>
            {/each}
          </div>
        {/if}

        {#if ticketData.serviceRequest}
          <ServiceRequestDetailsCard
            serviceRequest={ticketData.serviceRequest}
            ticketId={ticketData.details.ticket.id}
            mode="support"
            canEdit={ticketData.canReply && ticketData.details.ticket.status !== "closed"}
            updateAction={actionUrl("updateServiceRequest")}
            onUpdated={refreshDetails}
          />
        {/if}

        <section class="rounded-[20px] border border-[#E2E5ED] bg-white p-4 sm:p-5">
          <div class="flex items-center gap-3">
            <span class="flex h-9 w-9 items-center justify-center rounded-xl bg-[#EEF0FF] text-[#000A57]"><MessageSquare size={16}/></span>
            <div>
              <h2 class="text-[13px] font-semibold text-[#303645]">Conversa</h2>
              <p class="mt-0.5 text-[9.5px] text-[#8B919F]">Respostas ao cliente e notas internas.</p>
            </div>
          </div>

          <div class="mt-4 space-y-3">
            {#each ticketData.details.messages as message}
              <article class={`rounded-2xl border px-4 py-3 ${message.visibility === "internal" ? "border-[#F1D7BD] bg-[#FFF9F3]" : message.authorType === "customer" ? "border-[#E3E6ED] bg-[#FAFAFC]" : "border-[#D8DDF4] bg-[#F6F7FF]"}`}>
                <div class="flex flex-wrap items-center justify-between gap-2">
                  <div class="flex items-center gap-2">
                    <strong class="text-[10.5px] font-semibold text-[#3B4150]">{message.authorUserName ?? message.customerName ?? (message.authorType === "system" ? "Sistema" : "Atendimento F10")}</strong>
                    {#if message.visibility === "internal"}<span class="rounded-full bg-[#FFE5C9] px-2 py-1 text-[8px] font-bold uppercase tracking-[0.06em] text-[#91500F]">Nota interna</span>{/if}
                  </div>
                  <span class="text-[9px] text-[#999EAA]">{formatDateTime(message.createdAt)}</span>
                </div>
                <p class="mt-2 whitespace-pre-wrap text-[11.5px] leading-5 text-[#5D6372]">{message.body}</p>
              </article>
            {:else}
              <div class="rounded-xl border border-dashed border-[#DDE1EA] px-4 py-8 text-center text-[10px] text-[#9298A5]">Nenhuma mensagem registrada.</div>
            {/each}
          </div>

          {#if (ticketData.canReply || ticketData.canCommentInternal) && ticketData.details.ticket.status !== "closed"}
            <div class="mt-5 grid gap-3 lg:grid-cols-2">
              {#if ticketData.canReply}
                <form on:submit|preventDefault={(event) => void submitForm(event, "reply", true)} class="rounded-2xl border border-[#D9DDF0] bg-[#F8F9FF] p-3">
                  <label class="block">
                    <span class="mb-1.5 block text-[10px] font-semibold text-[#000A57]">Resposta ao cliente</span>
                    <textarea name="body" required maxlength="10000" rows="4" placeholder="Escreva a resposta..." class="w-full resize-y rounded-xl border border-[#DDE1EA] bg-white px-3 py-2.5 text-[11px] leading-5 outline-none focus:border-[#000A57]"></textarea>
                  </label>
                  <button type="submit" disabled={Boolean(actionLoading)} class="mt-2.5 min-h-9 w-full rounded-xl bg-[#000A57] px-3 text-[10px] font-semibold text-white disabled:opacity-50">Responder</button>
                </form>
              {/if}

              {#if ticketData.canCommentInternal}
                <form on:submit|preventDefault={(event) => void submitForm(event, "note", true)} class="rounded-2xl border border-[#F1D7BD] bg-[#FFF9F3] p-3">
                  <span class="mb-1.5 block text-[10px] font-semibold text-[#8B4D12]">Nota interna</span>
                  <MentionTextarea users={ticketData.mentionUsers} name="body" rows={4} maxlength={10000} placeholder="Use @ para mencionar alguém..." className="w-full resize-y rounded-xl border border-[#E9D6C1] bg-white px-3 py-2.5 text-[11px] leading-5 outline-none focus:border-[#C46C17]" />
                  <button type="submit" disabled={Boolean(actionLoading)} class="mt-2.5 min-h-9 w-full rounded-xl bg-[#9A5513] px-3 text-[10px] font-semibold text-white disabled:opacity-50">Adicionar nota</button>
                </form>
              {/if}
            </div>
          {/if}
        </section>

        <section class="rounded-[20px] border border-[#E2E5ED] bg-white p-4 sm:p-5">
          <div class="flex items-center justify-between gap-3">
            <h2 class="flex items-center gap-2 text-[12px] font-semibold text-[#343A46]"><Paperclip size={14}/>Anexos</h2>
            <span class="rounded-full bg-[#F2F3F6] px-2 py-1 text-[9px] font-semibold text-[#6D7382]">{ticketData.attachments.length}</span>
          </div>
          <div class="mt-3 space-y-2">
            {#each ticketData.attachments as attachment}
              <article class="flex items-center gap-3 rounded-xl border border-[#E1E4E9] bg-[#FAFAFC] p-3">
                <a href={attachment.href} target="_blank" rel="noreferrer" class="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-white text-[#000A57]"><Paperclip size={16}/></a>
                <div class="min-w-0 flex-1">
                  <a href={attachment.href} target="_blank" rel="noreferrer" class="block truncate text-[10.5px] font-semibold text-[#303746] hover:underline">{attachment.originalName}</a>
                  <p class="mt-0.5 text-[9px] text-[#8B909D]">{formatBytes(attachment.sizeBytes)} · {formatDateTime(attachment.createdAt)}</p>
                </div>
                {#if ticketData.canReply}
                  <button type="button" on:click={() => void deleteAttachment(attachment.id)} class="flex h-8 w-8 items-center justify-center rounded-lg text-[#A33A3A] hover:bg-[#FFF0F0]" aria-label={`Remover ${attachment.originalName}`}><Trash2 size={13}/></button>
                {/if}
              </article>
            {:else}
              <div class="rounded-xl border border-dashed border-[#D6DAE3] px-4 py-7 text-center text-[10px] text-[#9499A5]">Nenhum anexo neste ticket.</div>
            {/each}
          </div>
        </section>
      </main>

      <aside class="space-y-3 border-t border-[#E0E3E8] bg-[#F5F6FA] p-3 xl:border-l xl:border-t-0">
        <section class="rounded-[20px] border border-[#E2E5ED] bg-white p-4 shadow-[0_10px_28px_rgba(1,13,40,0.04)]">
          <h3 class="flex items-center gap-2 text-[11px] font-semibold text-[#3D4452]"><Route size={13}/>Área e coluna</h3>
          <p class="mt-1 text-[9px] leading-4 text-[#858B99]">{ticketData.workflowContext?.areaName ? `${ticketData.workflowContext.areaName} · ${ticketData.workflowContext.areaStageName ?? "Sem etapa"}` : ticketData.workflowContext?.globalStageName ?? "Fluxo global"}</p>
          {#if ticketData.canReply && workflowId}
            <form on:submit|preventDefault={(event) => void submitForm(event, "moveTicketLocation")} class="mt-3">
              <select name="workflowId" value={workflowId} on:change={changeWorkflow} class="h-9 w-full rounded-xl border border-[#D9DDE4] bg-white px-2 text-[10px]">
                {#if ticketData.workflowBoard.globalWorkflow}<option value={ticketData.workflowBoard.globalWorkflow.id}>Fluxo global</option>{/if}
                {#each movableAreaWorkflows as workflow}<option value={workflow.id}>Área · {workflow.areaName}</option>{/each}
              </select>
              <select name="stageId" bind:value={stageId} required class="mt-2 h-9 w-full rounded-xl border border-[#D9DDE4] bg-white px-2 text-[10px]">
                {#each stageOptions as stage}<option value={stage.id}>{stage.name}{stage.stageType === "area_gateway" ? ` · ${stage.linkedAreaName ?? "Área"}` : ""}</option>{/each}
              </select>
              <button type="submit" disabled={Boolean(actionLoading)} class="mt-2 h-9 w-full rounded-xl bg-[#000A57] text-[9.5px] font-semibold text-white disabled:opacity-50">Mover ticket</button>
            </form>
          {/if}
        </section>

        <section class="rounded-[20px] border border-[#E2E5ED] bg-white p-4 shadow-[0_10px_28px_rgba(1,13,40,0.04)]">
          <h3 class="flex items-center gap-2 text-[11px] font-semibold text-[#3D4452]"><Headphones size={13}/>Atendimento</h3>
          {#if ticketData.canReply}
            <form on:submit|preventDefault={(event) => void submitForm(event, "status")} class="mt-3">
              <label class="text-[9px] font-semibold text-[#666D7C]">Status</label>
              <div class="mt-1 flex gap-2">
                <select name="status" value={ticketData.details.ticket.status} class="h-9 min-w-0 flex-1 rounded-xl border border-[#DDE1EA] bg-white px-2 text-[10px]">
                  <option value="new">Novo</option><option value="open">Aberto</option><option value="in_progress">Em andamento</option><option value="waiting_customer">Aguardando cliente</option><option value="resolved">Resolvido</option><option value="closed">Fechado</option>
                </select>
                <button type="submit" class="h-9 rounded-xl bg-[#000A57] px-3 text-[9px] font-semibold text-white">Salvar</button>
              </div>
            </form>

            <form on:submit|preventDefault={(event) => void submitForm(event, "priority")} class="mt-3">
              <label class="text-[9px] font-semibold text-[#666D7C]">Prioridade</label>
              <div class="mt-1 flex gap-2">
                <select name="priority" value={ticketData.details.ticket.priority} class="h-9 min-w-0 flex-1 rounded-xl border border-[#DDE1EA] bg-white px-2 text-[10px]"><option value="low">Baixa</option><option value="normal">Normal</option><option value="high">Alta</option><option value="urgent">Urgente</option></select>
                <button type="submit" class="h-9 rounded-xl bg-[#000A57] px-3 text-[9px] font-semibold text-white">Salvar</button>
              </div>
            </form>

            <form on:submit|preventDefault={(event) => void submitForm(event, "dueOn")} class="mt-3">
              <label class="text-[9px] font-semibold text-[#666D7C]">Conclusão planejada</label>
              <div class="mt-1 flex gap-2">
                <input name="dueOn" type="date" required value={ticketData.details.ticket.dueOn} class="h-9 min-w-0 flex-1 rounded-xl border border-[#DDE1EA] bg-white px-2 text-[10px]"/>
                <button type="submit" class="h-9 rounded-xl bg-[#000A57] px-3 text-[9px] font-semibold text-white">Salvar</button>
              </div>
            </form>
          {:else}
            <div class="mt-3 rounded-xl bg-[#F7F8FA] px-3 py-2.5"><span class="text-[9px] text-[#969CAA]">Conclusão planejada</span><strong class="mt-1 block text-[10px] text-[#454B5B]">{formatDate(ticketData.details.ticket.dueOn)}</strong></div>
          {/if}

          <div class="mt-4 border-t border-[#EEF0F5] pt-3">
            <span class="text-[9px] text-[#8D93A0]">Responsável</span>
            <p class="mt-1 text-[10.5px] font-semibold text-[#414857]">{ticketData.details.ticket.assignedUserName ?? "Não atribuído"}</p>
            {#if ticketData.canAssign}
              <form on:submit|preventDefault={(event) => void submitForm(event, "assign")} class="mt-2.5 flex gap-2">
                <select name="assignedUserId" required class="h-9 min-w-0 flex-1 rounded-xl border border-[#DDE1EA] bg-white px-2.5 text-[10px]">
                  {#each ticketData.agents as agent}<option value={agent.id} selected={agent.id === ticketData.details.ticket.assignedUserId}>{agent.name}</option>{/each}
                </select>
                <button type="submit" class="h-9 rounded-xl bg-[#000A57] px-3 text-[9px] font-semibold text-white">Atribuir</button>
              </form>
            {/if}
          </div>
        </section>

        <section class="rounded-[20px] border border-[#E2E5ED] bg-white p-4 shadow-[0_10px_28px_rgba(1,13,40,0.04)]">
          <h3 class="flex items-center gap-2 text-[11px] font-semibold text-[#3D4452]"><Clock3 size={13}/>SLA</h3>
          <div class="mt-3 space-y-2">
            <div class="flex items-center justify-between gap-3"><span class="text-[9.5px] text-[#777E8D]">1ª resposta</span>{#if ticketData.details.ticket.firstResponseAt}<span class="text-[9.5px] font-semibold text-[#2F7045]">Respondido</span>{:else}<span class={`text-[9.5px] font-semibold ${deadlineClass(ticketData.details.ticket.firstResponseDueAt)}`}>{deadlineText(ticketData.details.ticket.firstResponseDueAt)}</span>{/if}</div>
            {#if ticketData.details.ticket.firstResponseAt && ticketData.details.ticket.nextResponseDueAt}<div class="flex items-center justify-between gap-3"><span class="text-[9.5px] text-[#777E8D]">Próxima resposta</span><span class={`text-[9.5px] font-semibold ${deadlineClass(ticketData.details.ticket.nextResponseDueAt)}`}>{deadlineText(ticketData.details.ticket.nextResponseDueAt)}</span></div>{/if}
            <div class="flex items-center justify-between gap-3"><span class="text-[9.5px] text-[#777E8D]">Resolução</span>{#if ticketData.details.ticket.resolvedAt}<span class="text-[9.5px] font-semibold text-[#2F7045]">Concluído</span>{:else}<span class={`text-[9.5px] font-semibold ${deadlineClass(ticketData.details.ticket.resolutionDueAt)}`}>{deadlineText(ticketData.details.ticket.resolutionDueAt)}</span>{/if}</div>
          </div>
        </section>

        <section class="rounded-[20px] border border-[#E2E5ED] bg-white p-4 shadow-[0_10px_28px_rgba(1,13,40,0.04)]">
          <h3 class="flex items-center gap-2 text-[11px] font-semibold text-[#3D4452]"><UserRound size={13}/>Cliente F10</h3>
          {#if ticketData.details.ticket.customerContactId}
            <dl class="mt-3 space-y-2.5 text-[9.5px]">
              <div><dt class="text-[#969CAA]">Nome</dt><dd class="mt-0.5 font-semibold text-[#414857]">{ticketData.details.ticket.customerName ?? "Não informado"}</dd></div>
              <div><dt class="text-[#969CAA]">E-mail</dt><dd class="mt-0.5 break-all text-[#555D6C]">{ticketData.details.ticket.customerEmail ?? "Não informado"}</dd></div>
              <div><dt class="text-[#969CAA]">Telefone</dt><dd class="mt-0.5 text-[#555D6C]">{ticketData.details.ticket.customerPhone ?? "Não informado"}</dd></div>
            </dl>
          {:else}
            <p class="mt-2 text-[9.5px] leading-4 text-[#8B919F]">Ticket sem cliente vinculado.</p>
            {#if ticketData.canLinkCustomer}
              <form on:submit|preventDefault={(event) => void submitForm(event, "linkCustomer")} class="mt-3 grid gap-2">
                <TicketCustomerPicker enabled={true}/>
                <button type="submit" class="h-9 rounded-xl bg-[#000A57] px-3 text-[9.5px] font-semibold text-white">Vincular cliente</button>
              </form>
            {/if}
          {/if}

          {#if ticketData.customerContext}
            <div class="mt-4 border-t border-[#EEF0F5] pt-3">
              <div class="flex items-center gap-2"><Building2 size={12} class="text-[#000A57]"/><span class="text-[9px] font-bold uppercase tracking-[0.07em] text-[#858C9B]">Contexto F10</span></div>
              <dl class="mt-2.5 space-y-2 text-[9.5px]">
                <div><dt class="text-[#969CAA]">Escola / unidade</dt><dd class="font-semibold text-[#414857]">{ticketData.customerContext.unitName ?? "Não informada"}</dd></div>
                <div><dt class="text-[#969CAA]">Grupo</dt><dd class="text-[#555D6C]">{ticketData.customerContext.groupName ?? "Não informado"}</dd></div>
                <div><dt class="text-[#969CAA]">Usuário F10</dt><dd class="truncate font-mono text-[9px] text-[#5C6372]">{ticketData.customerContext.legacyUserId ?? "Ainda não autenticado"}</dd></div>
              </dl>
            </div>
          {:else if ticketData.details.ticket.organizationName}
            <p class="mt-3 border-t border-[#EEF0F5] pt-3 text-[9.5px] text-[#646B7A]">{ticketData.details.ticket.organizationName}</p>
          {/if}
        </section>

        <section class="rounded-[20px] border border-[#E2E5ED] bg-white p-4 shadow-[0_10px_28px_rgba(1,13,40,0.04)]">
          <h3 class="flex items-center gap-2 text-[11px] font-semibold text-[#3D4452]"><UsersRound size={13}/>Seguidores</h3>
          <div class="mt-3 flex flex-wrap gap-2">
            {#each ticketData.followers as follower}
              <span class="inline-flex items-center gap-1.5 rounded-full border border-[#E1E4EA] bg-[#FAFAFC] py-1 pl-1 pr-2 text-[9px] font-semibold text-[#555D6C]">
                <span class="flex h-6 w-6 items-center justify-center rounded-full bg-[#EEF0FF] text-[8px] font-bold text-[#000A57]">{initials(follower.name)}</span>
                {follower.name}
                {#if ticketData.canManageFollowers}<button type="button" on:click={() => void removeFollower(follower.id)} aria-label={`Remover ${follower.name}`} class="text-[#9B3C3C]">×</button>{/if}
              </span>
            {:else}
              <span class="text-[9.5px] text-[#9297A4]">Ninguém acompanhando.</span>
            {/each}
          </div>
          {#if ticketData.canManageFollowers}
            <select on:change={(event) => void addFollower(event)} class="mt-3 h-9 w-full rounded-xl border border-[#D9DDE4] bg-white px-2 text-[9.5px]">
              <option value="">Adicionar seguidor...</option>
              {#each ticketData.followerCandidates.filter((candidate) => !ticketData.followers.some((follower) => follower.id === candidate.id)) as candidate}<option value={candidate.id}>{candidate.name}</option>{/each}
            </select>
          {/if}
        </section>

        <section class="rounded-[20px] border border-[#E2E5ED] bg-white p-4 shadow-[0_10px_28px_rgba(1,13,40,0.04)]">
          <h3 class="flex items-center gap-2 text-[11px] font-semibold text-[#3D4452]"><Tag size={13}/>Etiquetas</h3>
          {#if ticketData.canReply}
            <select on:change={(event) => void addLabel(event)} class="mt-3 h-9 w-full rounded-xl border border-[#D9DDE4] bg-white px-2 text-[9.5px]">
              <option value="">Adicionar etiqueta...</option>
              {#each ticketData.labels.filter((label) => !ticketData.selectedLabels.some((selected) => selected.id === label.id)) as label}<option value={label.id}>{label.name}</option>{/each}
            </select>
            <form on:submit|preventDefault={(event) => void submitForm(event, "createLabel", true)} class="mt-2 grid grid-cols-[1fr_92px] gap-2">
              <input name="name" required minlength="2" maxlength="40" placeholder="Nova etiqueta" class="h-9 rounded-xl border border-[#D9DDE4] px-2 text-[9.5px]"/>
              <select name="color" class="h-9 rounded-xl border border-[#D9DDE4] bg-white px-2 text-[9px]"><option value="blue">Azul</option><option value="green">Verde</option><option value="yellow">Amarela</option><option value="orange">Laranja</option><option value="red">Vermelha</option><option value="purple">Roxa</option><option value="gray">Cinza</option></select>
              <button type="submit" class="col-span-2 h-8 rounded-lg border border-[#D9DDE4] text-[9px] font-semibold text-[#4E5565]">Criar e adicionar</button>
            </form>
          {/if}
        </section>

        <section class="rounded-[20px] border border-[#E2E5ED] bg-white p-4 shadow-[0_10px_28px_rgba(1,13,40,0.04)]">
          <h3 class="flex items-center gap-2 text-[11px] font-semibold text-[#3D4452]"><Paperclip size={13}/>Adicionar anexo</h3>
          {#if ticketData.canReply && ticketData.attachmentsEnabled}
            <form on:submit|preventDefault={(event) => void submitForm(event, "uploadAttachment", true)} class="mt-3">
              <input name="file" type="file" required accept="image/png,image/jpeg,image/webp,image/gif,application/pdf,text/plain,.docx,.xlsx,.zip" class="block w-full text-[9px] text-[#6C7381]"/>
              <button type="submit" class="mt-3 h-9 w-full rounded-xl border border-[#D9DDE4] bg-white text-[9.5px] font-semibold text-[#4E5565]">Enviar arquivo</button>
            </form>
          {:else if !ticketData.attachmentsEnabled}
            <p class="mt-2 text-[9px] leading-4 text-[#8A5A2A]">Anexos indisponíveis até configurar o storage.</p>
          {/if}
        </section>

        {#if ticketData.satisfaction}
          <section class="rounded-[20px] border border-[#E2E5ED] bg-white p-4 shadow-[0_10px_28px_rgba(1,13,40,0.04)]">
            <h3 class="text-[11px] font-semibold text-[#3D4452]">Satisfação</h3>
            {#if ticketData.satisfaction.answeredAt && ticketData.satisfaction.score}
              <div class="mt-3 flex items-center gap-1 text-[#EA6D0B]" aria-label={`${ticketData.satisfaction.score} de 5 estrelas`}>
                {#each [1, 2, 3, 4, 5] as value}<Star size={15} fill={value <= ticketData.satisfaction.score ? "currentColor" : "none"} class={value <= ticketData.satisfaction.score ? "text-[#EA6D0B]" : "text-[#C7CBD4]"}/>{/each}
              </div>
              {#if ticketData.satisfaction.comment}<p class="mt-2 whitespace-pre-wrap text-[9.5px] leading-4 text-[#6D7482]">“{ticketData.satisfaction.comment}”</p>{/if}
            {:else}
              <p class="mt-2 text-[9.5px] text-[#9297A4]">Aguardando avaliação do cliente.</p>
            {/if}
          </section>
        {/if}

        {#if ticketData.canViewTasks}
          <TicketTaskPanel
            ticketId={ticketData.details.ticket.id}
            ticketNumber={ticketData.details.ticket.ticketNumber}
            ticketSubject={ticketData.details.ticket.subject}
            tasks={ticketData.linkedTasks}
            projects={ticketData.taskProjects}
            canCreate={ticketData.canCreateTask && ticketData.details.ticket.status !== "closed"}
            onCreated={refreshDetails}
          />
        {/if}

        <section class="rounded-[20px] border border-[#DCE1F2] bg-[#F8F9FF] p-4 shadow-[0_10px_28px_rgba(1,13,40,0.035)]">
          <div class="flex items-center gap-2 text-[#000A57]"><MonitorCog size={13}/><h3 class="text-[11px] font-semibold">Suporte remoto</h3></div>
          <a href={`/app/tickets/${ticketData.details.ticket.id}/remote`} class="mt-3 inline-flex h-9 w-full items-center justify-center rounded-xl bg-[#000A57] text-[9.5px] font-semibold text-white">Gerenciar computadores</a>
        </section>

        <section class="rounded-[20px] border border-[#E2E5ED] bg-white p-4 shadow-[0_10px_28px_rgba(1,13,40,0.04)]">
          <div class="flex items-center gap-2"><ShieldCheck size={13} class="text-[#000A57]"/><h3 class="text-[11px] font-semibold text-[#3D4452]">Histórico</h3></div>
          <div class="mt-3 space-y-3">
            {#each ticketData.details.events as event}
              <div class="border-l-2 border-[#E5E7ED] pl-3">
                <p class="text-[9.5px] leading-4 text-[#626877]"><strong class="font-semibold text-[#3E4453]">{event.actorName ?? "Sistema"}</strong> {eventLabels[event.eventType] ?? event.eventType}</p>
                <span class="mt-0.5 block text-[8.5px] text-[#9B9FAC]">{formatDateTime(event.createdAt)}</span>
              </div>
            {/each}
          </div>
        </section>
      </aside>
    </div>
  </section>
</div>
