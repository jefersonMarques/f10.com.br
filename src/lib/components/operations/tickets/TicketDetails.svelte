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
    MessageSquare,
    MonitorCog,
    Paperclip,
    Route,
    Send,
    ShieldCheck,
    Star,
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
  type MainPanel = "conversation" | "request" | "attachments";
  type ComposerMode = "reply" | "note";
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
  let activeMainPanel: MainPanel = "conversation";
  let composerMode: ComposerMode = ticketData.canReply ? "reply" : "note";
  let replyDraft = "";
  let noteDraft = "";

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
  $: if (activeMainPanel === "request" && !ticketData.serviceRequest) {
    activeMainPanel = "conversation";
  }
  $: if (!ticketData.canReply && ticketData.canCommentInternal && composerMode !== "note") {
    composerMode = "note";
  }
  $: if (!ticketData.canCommentInternal && ticketData.canReply && composerMode !== "reply") {
    composerMode = "reply";
  }

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

  async function submitComposer(event: SubmitEvent): Promise<void> {
    const form = event.currentTarget as HTMLFormElement;
    const action = composerMode === "note" ? "note" : "reply";
    const saved = await postAction(action, new FormData(form));
    if (!saved) return;

    if (composerMode === "note") noteDraft = "";
    else replyDraft = "";
  }

  async function updateField(
    action: string,
    field: string,
    event: Event,
  ): Promise<void> {
    const control = event.currentTarget as HTMLInputElement | HTMLSelectElement;
    const body = new FormData();
    body.set(field, control.value);
    await postAction(action, body);
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

<div class={surface === "page"
  ? "bg-[#F5F6FA]"
  : "h-full min-h-0 overflow-y-auto bg-white xl:overflow-hidden"}>
  <section class={surface === "page"
    ? "overflow-hidden rounded-[24px] border border-[#E2E5ED] bg-white shadow-[0_12px_32px_rgba(1,13,40,0.05)]"
    : "flex min-h-full flex-col bg-white xl:h-full xl:min-h-0"}>
    <header class="shrink-0 border-b border-[#E9EBF1] bg-white px-4 py-3.5 sm:px-5">
      <div class="flex items-start gap-3">
        <span class="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#EEF0FF] text-[11px] font-bold text-[#000A57]">
          {initials(ticketData.details.ticket.customerName ?? "Cliente")}
        </span>

        <div class="min-w-0 flex-1">
          <div class="flex flex-wrap items-center gap-1.5">
            <span class="rounded-full bg-[#EEF0FF] px-2 py-1 text-[10px] font-bold text-[#000A57]">#{ticketData.details.ticket.ticketNumber}</span>
            <span class="rounded-full bg-[#F1F5FF] px-2 py-1 text-[10px] font-semibold text-[#35509A]">{statusLabels[ticketData.details.ticket.status] ?? ticketData.details.ticket.status}</span>
            <span class="rounded-full bg-[#F2F3F6] px-2 py-1 text-[10px] font-semibold text-[#666D7C]">{priorityLabels[ticketData.details.ticket.priority] ?? ticketData.details.ticket.priority}</span>
            <span class="inline-flex items-center gap-1 rounded-full bg-[#F7F7F9] px-2 py-1 text-[10px] font-semibold text-[#6D7382]"><CalendarDays size={11}/>{formatDate(ticketData.details.ticket.dueOn)}</span>
          </div>
          <h1 class="mt-1.5 line-clamp-2 text-[16px] font-semibold leading-6 text-[#202637]">{ticketData.details.ticket.subject}</h1>
          <p class="mt-0.5 truncate text-[11px] text-[#858B98]">
            {ticketData.details.ticket.customerName ?? "Cliente não identificado"} · {ticketData.details.ticket.queueName}
          </p>
        </div>

        <div class="flex shrink-0 items-center gap-2">
          <a
            href={`/app/tickets/${ticketData.details.ticket.id}/remote`}
            class="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-[#E0E3EA] bg-white text-[#69707E] transition hover:bg-[#F6F7F9] hover:text-[#000A57]"
            aria-label="Acesso remoto"
            title="Acesso remoto"
          ><MonitorCog size={15}/></a>
          {#if surface === "modal" && onClose}
            <button type="button" on:click={onClose} class="flex h-9 w-9 items-center justify-center rounded-xl border border-[#E0E3EA] text-[#69707E] hover:bg-[#F6F7F9]" aria-label="Fechar"><X size={16}/></button>
          {/if}
        </div>
      </div>
    </header>

    <nav class="flex shrink-0 items-center gap-1 border-b border-[#E9EBF1] bg-white px-4 py-1.5 sm:px-5" aria-label="Conteúdo do ticket">
      <button
        type="button"
        on:click={() => (activeMainPanel = "conversation")}
        class={`inline-flex h-9 items-center gap-2 rounded-lg px-3 text-[11px] font-semibold transition ${activeMainPanel === "conversation" ? "bg-[#EEF0FF] text-[#000A57]" : "text-[#6F7685] hover:bg-[#F5F6F8]"}`}
      ><MessageSquare size={14}/>Conversa</button>

      {#if ticketData.serviceRequest}
        <button
          type="button"
          on:click={() => (activeMainPanel = "request")}
          class={`inline-flex h-9 items-center gap-2 rounded-lg px-3 text-[11px] font-semibold transition ${activeMainPanel === "request" ? "bg-[#EEF0FF] text-[#000A57]" : "text-[#6F7685] hover:bg-[#F5F6F8]"}`}
        ><FileText size={14}/>Solicitação</button>
      {/if}

      <button
        type="button"
        on:click={() => (activeMainPanel = "attachments")}
        class={`inline-flex h-9 items-center gap-2 rounded-lg px-3 text-[11px] font-semibold transition ${activeMainPanel === "attachments" ? "bg-[#EEF0FF] text-[#000A57]" : "text-[#6F7685] hover:bg-[#F5F6F8]"}`}
      ><Paperclip size={14}/>Anexos {#if ticketData.attachments.length > 0}<span class="rounded-full bg-white px-1.5 py-0.5 text-[9px]">{ticketData.attachments.length}</span>{/if}</button>
    </nav>

    {#if visibleFeedback?.message}
      <div class={`mx-4 mt-3 flex shrink-0 items-start gap-2 rounded-xl px-3 py-2.5 text-[11px] font-medium sm:mx-5 ${visibleFeedback.success ? "bg-[#EEF8F1] text-[#2F7045]" : "bg-[#FFF0F0] text-[#9B3C3C]"}`}>
        {#if visibleFeedback.success}<CheckCircle2 size={14} class="mt-0.5 shrink-0"/>{:else}<CircleAlert size={14} class="mt-0.5 shrink-0"/>{/if}
        <span>{visibleFeedback.message}</span>
      </div>
    {/if}

    <div class={surface === "page"
      ? "grid xl:grid-cols-[minmax(0,1fr)_350px]"
      : "grid min-h-0 flex-1 xl:grid-cols-[minmax(0,1fr)_350px]"}>
      <main class={surface === "page"
        ? "min-w-0 bg-white"
        : "flex min-h-[680px] min-w-0 flex-col bg-white xl:min-h-0"}>
        {#if activeMainPanel === "conversation"}
          <section class={surface === "page" ? "flex min-h-[720px] flex-col" : "flex min-h-0 flex-1 flex-col"}>
            <div class={surface === "page"
              ? "flex-1 space-y-3 bg-[#FBFBFC] px-4 py-5 sm:px-6"
              : "min-h-0 flex-1 space-y-3 overflow-y-auto bg-[#FBFBFC] px-4 py-5 sm:px-6"}>
              {#each ticketData.details.messages as message}
                {#if message.authorType === "system"}
                  <div class="flex justify-center py-1">
                    <article class="max-w-[88%] rounded-xl bg-[#F0F1F4] px-3.5 py-2.5 text-center">
                      <div class="flex items-center justify-center gap-2 text-[10px] text-[#8B919E]">
                        <strong class="font-semibold text-[#69707F]">Sistema</strong>
                        <span>{formatDateTime(message.createdAt)}</span>
                      </div>
                      <p class="mt-1 whitespace-pre-wrap text-[11.5px] leading-5 text-[#606776]">{message.body}</p>
                    </article>
                  </div>
                {:else if message.visibility === "internal"}
                  <div class="flex justify-center py-1">
                    <article class="w-full max-w-[88%] rounded-2xl border border-[#EBCFAE] bg-[#FFF8EF] px-4 py-3">
                      <div class="flex flex-wrap items-center justify-between gap-2">
                        <strong class="text-[11px] font-semibold text-[#7B4A1F]">{message.authorUserName ?? "Equipe F10"} · Nota interna</strong>
                        <span class="text-[10px] text-[#A17D5C]">{formatDateTime(message.createdAt)}</span>
                      </div>
                      <p class="mt-1.5 whitespace-pre-wrap text-[13px] leading-6 text-[#684A31]">{message.body}</p>
                    </article>
                  </div>
                {:else}
                  <div class={`flex ${message.authorType === "customer" ? "justify-start" : "justify-end"}`}>
                    <article class={`max-w-[82%] rounded-2xl px-4 py-3 ${message.authorType === "customer" ? "rounded-bl-md bg-[#ECECEF]" : "rounded-br-md bg-[#E6F0FF]"}`}>
                      <div class="flex flex-wrap items-center justify-between gap-x-5 gap-y-1">
                        <strong class="text-[11px] font-semibold text-[#4A5160]">{message.authorUserName ?? message.customerName ?? "Atendimento F10"}</strong>
                        <span class="text-[10px] text-[#858C99]">{formatDateTime(message.createdAt)}</span>
                      </div>
                      <p class="mt-1.5 whitespace-pre-wrap text-[13px] leading-6 text-[#343A47]">{message.body}</p>
                    </article>
                  </div>
                {/if}
              {:else}
                <div class="flex min-h-[260px] items-center justify-center text-[11px] text-[#9298A5]">Nenhuma mensagem registrada.</div>
              {/each}
            </div>

            {#if (ticketData.canReply || ticketData.canCommentInternal) && ticketData.details.ticket.status !== "closed"}
              <div class="shrink-0 border-t border-[var(--app-border)] bg-[var(--app-surface)] p-3 sm:p-4">
                <form
                  method="POST"
                  action={actionUrl(composerMode === "note" ? "note" : "reply")}
                  on:submit|preventDefault={submitComposer}
                  class={`overflow-visible rounded-2xl border bg-white shadow-[0_8px_24px_rgba(1,13,40,0.04)] ${composerMode === "note" ? "border-[#E7C7A5]" : "border-[#D9DDE7]"}`}
                >
                  <div class="flex items-center justify-between gap-3 border-b border-[#ECEEF2] px-3 py-2">
                    <div class="flex rounded-lg bg-[#F2F3F6] p-0.5">
                      {#if ticketData.canReply}
                        <button type="button" on:click={() => (composerMode = "reply")} class={`h-8 rounded-md px-3 text-[11px] font-semibold ${composerMode === "reply" ? "bg-white text-[#000A57] shadow-sm" : "text-[#6F7685]"}`}>Responder</button>
                      {/if}
                      {#if ticketData.canCommentInternal}
                        <button type="button" on:click={() => (composerMode = "note")} class={`h-8 rounded-md px-3 text-[11px] font-semibold ${composerMode === "note" ? "bg-white text-[#8A4D13] shadow-sm" : "text-[#6F7685]"}`}>Nota interna</button>
                      {/if}
                    </div>
                    <span class="hidden text-[10.5px] font-medium text-[#9298A5] sm:inline">{composerMode === "note" ? "Visível somente para a equipe" : "Visível para o cliente"}</span>
                  </div>

                  <div class="px-3 py-2.5">
                    {#if composerMode === "reply"}
                      <textarea
                        name="body"
                        bind:value={replyDraft}
                        required
                        maxlength="10000"
                        rows="4"
                        placeholder="Escreva uma resposta..."
                        class="min-h-[112px] w-full resize-none border-0 bg-transparent px-1 py-1 text-[13px] leading-6 text-[#343A47] outline-none placeholder:text-[#A0A5B0]"
                      ></textarea>
                    {:else}
                      <MentionTextarea
                        users={ticketData.mentionUsers}
                        name="body"
                        bind:value={noteDraft}
                        rows={4}
                        maxlength={10000}
                        placeholder="Escreva uma nota interna..."
                        className="min-h-[112px] w-full resize-none border-0 bg-transparent px-1 py-1 text-[13px] leading-6 text-[#4E4339] outline-none placeholder:text-[#AAA098]"
                      />
                    {/if}
                  </div>

                  <div class="flex items-center justify-between border-t border-[#ECEEF2] px-3 py-2.5">
                    <button type="button" on:click={() => (activeMainPanel = "attachments")} class="flex h-9 w-9 items-center justify-center rounded-lg text-[#777E8D] hover:bg-[#F3F4F6] hover:text-[#000A57]" aria-label="Abrir anexos" title="Anexos"><Paperclip size={16}/></button>
                    <button type="submit" disabled={Boolean(actionLoading)} class={`inline-flex h-9 items-center gap-2 rounded-xl px-4 text-[11px] font-semibold text-white disabled:opacity-50 ${composerMode === "note" ? "bg-[#9A5A1B]" : "bg-[#000A57]"}`}>
                      <Send size={14}/>{actionLoading ? "Enviando..." : composerMode === "note" ? "Adicionar nota" : "Enviar"}
                    </button>
                  </div>
                </form>
              </div>
            {/if}
          </section>
        {:else if activeMainPanel === "request" && ticketData.serviceRequest}
          <div class="min-h-0 flex-1 overflow-y-auto bg-[#F8F9FB] p-4 sm:p-5">
            <ServiceRequestDetailsCard
              serviceRequest={ticketData.serviceRequest}
              ticketId={ticketData.details.ticket.id}
              mode="support"
              canEdit={ticketData.canReply && ticketData.details.ticket.status !== "closed"}
              updateAction={actionUrl("updateServiceRequest")}
              onUpdated={refreshDetails}
            />
          </div>
        {:else}
          <section class="min-h-0 flex-1 overflow-y-auto bg-[#F8F9FB] p-4 sm:p-5">
            <div class="mx-auto max-w-[900px] rounded-[20px] border border-[#E2E5ED] bg-white p-4 sm:p-5">
              <div class="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 class="flex items-center gap-2 text-[13px] font-semibold text-[#343A46]"><Paperclip size={15}/>Anexos</h2>
                  <p class="mt-0.5 text-[10.5px] text-[#8B919F]">{ticketData.attachments.length} arquivo(s)</p>
                </div>
                {#if ticketData.canReply && ticketData.attachmentsEnabled}
                  <form method="POST" action={actionUrl("uploadAttachment")} on:submit|preventDefault={(event) => void submitForm(event, "uploadAttachment", true)} class="flex items-center gap-2">
                    <input name="file" type="file" required accept="image/png,image/jpeg,image/webp,image/gif,application/pdf,text/plain,.docx,.xlsx,.zip" class="max-w-[260px] text-[11px] text-[#6C7381]"/>
                    <button type="submit" class="h-9 rounded-xl bg-[#000A57] px-3 text-[11px] font-semibold text-white">Enviar</button>
                  </form>
                {/if}
              </div>

              <div class="mt-4 space-y-2">
                {#each ticketData.attachments as attachment}
                  <article class="flex items-center gap-3 rounded-xl border border-[#E1E4E9] bg-[#FAFAFC] p-3">
                    <a href={attachment.href} target="_blank" rel="noreferrer" class="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-white text-[#000A57]"><Paperclip size={16}/></a>
                    <div class="min-w-0 flex-1">
                      <a href={attachment.href} target="_blank" rel="noreferrer" class="block truncate text-[11.5px] font-semibold text-[#303746] hover:underline">{attachment.originalName}</a>
                      <p class="mt-0.5 text-[10px] text-[#8B909D]">{formatBytes(attachment.sizeBytes)} · {formatDateTime(attachment.createdAt)}</p>
                    </div>
                    {#if ticketData.canReply}
                      <button type="button" on:click={() => void deleteAttachment(attachment.id)} class="flex h-8 w-8 items-center justify-center rounded-lg text-[#A33A3A] hover:bg-[#FFF0F0]" aria-label={`Remover ${attachment.originalName}`}><Trash2 size={14}/></button>
                    {/if}
                  </article>
                {:else}
                  <div class="rounded-xl border border-dashed border-[#D6DAE3] px-4 py-12 text-center text-[11px] text-[#9499A5]">Nenhum anexo neste ticket.</div>
                {/each}
              </div>
            </div>
          </section>
        {/if}
      </main>

      <aside class={surface === "page"
        ? "space-y-3 border-t border-[#E0E3E8] bg-[#F5F6FA] p-3 xl:border-l xl:border-t-0"
        : "space-y-3 border-t border-[#E0E3E8] bg-[#F5F6FA] p-3 xl:min-h-0 xl:overflow-y-auto xl:border-l xl:border-t-0"}>
        <section class="rounded-[18px] border border-[#E2E5ED] bg-white p-4">
          <h3 class="flex items-center gap-2 text-[12px] font-semibold text-[#3D4452]"><Headphones size={14}/>Atendimento</h3>

          <div class="mt-3 border-t border-[#EEF0F5] pt-3">
            <div class="flex items-center gap-2 text-[10.5px] font-semibold text-[#626978]"><Route size={12}/>Área e coluna</div>
            <p class="mt-1 text-[10.5px] leading-4 text-[#858B99]">{ticketData.workflowContext?.areaName ? `${ticketData.workflowContext.areaName} · ${ticketData.workflowContext.areaStageName ?? "Sem etapa"}` : ticketData.workflowContext?.globalStageName ?? "Fluxo global"}</p>
            {#if ticketData.canReply && workflowId}
              <form method="POST" action={actionUrl("moveTicketLocation")} on:submit|preventDefault={(event) => void submitForm(event, "moveTicketLocation")} class="mt-2.5">
                <select name="workflowId" value={workflowId} on:change={changeWorkflow} class="h-9 w-full rounded-xl border border-[#D9DDE4] bg-white px-2.5 text-[11px]">
                  {#if ticketData.workflowBoard.globalWorkflow}<option value={ticketData.workflowBoard.globalWorkflow.id}>Fluxo global</option>{/if}
                  {#each movableAreaWorkflows as workflow}<option value={workflow.id}>Área · {workflow.areaName}</option>{/each}
                </select>
                <div class="mt-2 flex gap-2">
                  <select name="stageId" bind:value={stageId} required class="h-9 min-w-0 flex-1 rounded-xl border border-[#D9DDE4] bg-white px-2.5 text-[11px]">
                    {#each stageOptions as stage}<option value={stage.id}>{stage.name}{stage.stageType === "area_gateway" ? ` · ${stage.linkedAreaName ?? "Área"}` : ""}</option>{/each}
                  </select>
                  <button type="submit" disabled={Boolean(actionLoading)} class="h-9 rounded-xl bg-[#000A57] px-3 text-[10.5px] font-semibold text-white disabled:opacity-50">Mover</button>
                </div>
              </form>
            {/if}
          </div>

          <div class="mt-3 grid gap-3 border-t border-[#EEF0F5] pt-3">
            <label>
              <span class="mb-1 block text-[10.5px] font-medium text-[#777E8D]">Status</span>
              <select name="status" value={ticketData.details.ticket.status} disabled={!ticketData.canReply || Boolean(actionLoading)} on:change={(event) => void updateField("status", "status", event)} class="h-9 w-full rounded-xl border border-[#DDE1EA] bg-white px-2.5 text-[11px] disabled:bg-[#F5F6F8]">
                <option value="new">Novo</option><option value="open">Aberto</option><option value="in_progress">Em andamento</option><option value="waiting_customer">Aguardando cliente</option><option value="resolved">Resolvido</option><option value="closed">Fechado</option>
              </select>
            </label>

            <label>
              <span class="mb-1 block text-[10.5px] font-medium text-[#777E8D]">Prioridade</span>
              <select name="priority" value={ticketData.details.ticket.priority} disabled={!ticketData.canReply || Boolean(actionLoading)} on:change={(event) => void updateField("priority", "priority", event)} class="h-9 w-full rounded-xl border border-[#DDE1EA] bg-white px-2.5 text-[11px] disabled:bg-[#F5F6F8]">
                <option value="low">Baixa</option><option value="normal">Normal</option><option value="high">Alta</option><option value="urgent">Urgente</option>
              </select>
            </label>

            <label>
              <span class="mb-1 block text-[10.5px] font-medium text-[#777E8D]">Conclusão planejada</span>
              <input name="dueOn" type="date" required value={ticketData.details.ticket.dueOn} disabled={!ticketData.canReply || Boolean(actionLoading)} on:change={(event) => void updateField("dueOn", "dueOn", event)} class="h-9 w-full rounded-xl border border-[#DDE1EA] bg-white px-2.5 text-[11px] disabled:bg-[#F5F6F8]"/>
            </label>

            <label>
              <span class="mb-1 block text-[10.5px] font-medium text-[#777E8D]">Responsável</span>
              {#if ticketData.canAssign}
                <select name="assignedUserId" disabled={Boolean(actionLoading)} on:change={(event) => void updateField("assign", "assignedUserId", event)} class="h-9 w-full rounded-xl border border-[#DDE1EA] bg-white px-2.5 text-[11px]">
                  {#each ticketData.agents as agent}<option value={agent.id} selected={agent.id === ticketData.details.ticket.assignedUserId}>{agent.name}</option>{/each}
                </select>
              {:else}
                <div class="rounded-xl bg-[#F7F8FA] px-3 py-2.5 text-[11px] font-semibold text-[#4E5565]">{ticketData.details.ticket.assignedUserName ?? "Não atribuído"}</div>
              {/if}
            </label>
          </div>

          <div class="mt-3 border-t border-[#EEF0F5] pt-3">
            <div class="mb-2 flex items-center gap-2 text-[10.5px] font-semibold text-[#626978]"><Clock3 size={12}/>SLA</div>
            <div class="space-y-2">
              <div class="flex items-center justify-between gap-3"><span class="text-[10.5px] text-[#777E8D]">1ª resposta</span>{#if ticketData.details.ticket.firstResponseAt}<span class="text-[10.5px] font-semibold text-[#2F7045]">Respondido</span>{:else}<span class={`text-[10.5px] font-semibold ${deadlineClass(ticketData.details.ticket.firstResponseDueAt)}`}>{deadlineText(ticketData.details.ticket.firstResponseDueAt)}</span>{/if}</div>
              {#if ticketData.details.ticket.firstResponseAt && ticketData.details.ticket.nextResponseDueAt}<div class="flex items-center justify-between gap-3"><span class="text-[10.5px] text-[#777E8D]">Próxima resposta</span><span class={`text-[10.5px] font-semibold ${deadlineClass(ticketData.details.ticket.nextResponseDueAt)}`}>{deadlineText(ticketData.details.ticket.nextResponseDueAt)}</span></div>{/if}
              <div class="flex items-center justify-between gap-3"><span class="text-[10.5px] text-[#777E8D]">Resolução</span>{#if ticketData.details.ticket.resolvedAt}<span class="text-[10.5px] font-semibold text-[#2F7045]">Concluído</span>{:else}<span class={`text-[10.5px] font-semibold ${deadlineClass(ticketData.details.ticket.resolutionDueAt)}`}>{deadlineText(ticketData.details.ticket.resolutionDueAt)}</span>{/if}</div>
            </div>
          </div>
        </section>

        <section class="rounded-[18px] border border-[#E2E5ED] bg-white p-4">
          <h3 class="flex items-center gap-2 text-[12px] font-semibold text-[#3D4452]"><UserRound size={14}/>Cliente F10</h3>
          {#if ticketData.details.ticket.customerContactId}
            <dl class="mt-3 space-y-2.5 text-[11px]">
              <div><dt class="text-[10px] text-[#969CAA]">Nome</dt><dd class="mt-0.5 font-semibold text-[#414857]">{ticketData.details.ticket.customerName ?? "Não informado"}</dd></div>
              <div><dt class="text-[10px] text-[#969CAA]">E-mail</dt><dd class="mt-0.5 break-all text-[#555D6C]">{ticketData.details.ticket.customerEmail ?? "Não informado"}</dd></div>
              <div><dt class="text-[10px] text-[#969CAA]">Telefone</dt><dd class="mt-0.5 text-[#555D6C]">{ticketData.details.ticket.customerPhone ?? "Não informado"}</dd></div>
            </dl>
          {:else}
            <p class="mt-2 text-[11px] leading-5 text-[#8B919F]">Ticket sem cliente vinculado.</p>
            {#if ticketData.canLinkCustomer}
              <form method="POST" action={actionUrl("linkCustomer")} on:submit|preventDefault={(event) => void submitForm(event, "linkCustomer")} class="mt-3 grid gap-2">
                <TicketCustomerPicker enabled={true}/>
                <button type="submit" class="h-9 rounded-xl bg-[#000A57] px-3 text-[11px] font-semibold text-white">Vincular cliente</button>
              </form>
            {/if}
          {/if}

          {#if ticketData.customerContext}
            <div class="mt-4 border-t border-[#EEF0F5] pt-3">
              <div class="flex items-center gap-2"><Building2 size={13} class="text-[#000A57]"/><span class="text-[10px] font-bold uppercase tracking-[0.06em] text-[#858C9B]">Contexto F10</span></div>
              <dl class="mt-2.5 space-y-2 text-[11px]">
                <div><dt class="text-[10px] text-[#969CAA]">Escola / unidade</dt><dd class="font-semibold text-[#414857]">{ticketData.customerContext.unitName ?? "Não informada"}</dd></div>
                <div><dt class="text-[10px] text-[#969CAA]">Grupo</dt><dd class="text-[#555D6C]">{ticketData.customerContext.groupName ?? "Não informado"}</dd></div>
                <div><dt class="text-[10px] text-[#969CAA]">Usuário F10</dt><dd class="truncate font-mono text-[10px] text-[#5C6372]">{ticketData.customerContext.legacyUserId ?? "Ainda não autenticado"}</dd></div>
              </dl>
            </div>
          {:else if ticketData.details.ticket.organizationName}
            <p class="mt-3 border-t border-[#EEF0F5] pt-3 text-[11px] text-[#646B7A]">{ticketData.details.ticket.organizationName}</p>
          {/if}
        </section>

        <section class="rounded-[18px] border border-[#E2E5ED] bg-white p-4">
          <h3 class="flex items-center gap-2 text-[12px] font-semibold text-[#3D4452]"><UsersRound size={14}/>Colaboração</h3>

          <div class="mt-3">
            <span class="text-[10px] font-semibold text-[#858B99]">Seguidores</span>
            <div class="mt-2 flex flex-wrap gap-2">
              {#each ticketData.followers as follower}
                <span class="inline-flex items-center gap-1.5 rounded-full border border-[#E1E4EA] bg-[#FAFAFC] py-1 pl-1 pr-2 text-[10.5px] font-semibold text-[#555D6C]">
                  <span class="flex h-6 w-6 items-center justify-center rounded-full bg-[#EEF0FF] text-[9px] font-bold text-[#000A57]">{initials(follower.name)}</span>
                  {follower.name}
                  {#if ticketData.canManageFollowers}<button type="button" on:click={() => void removeFollower(follower.id)} aria-label={`Remover ${follower.name}`} class="text-[#9B3C3C]">×</button>{/if}
                </span>
              {:else}
                <span class="text-[10.5px] text-[#9297A4]">Ninguém acompanhando.</span>
              {/each}
            </div>
            {#if ticketData.canManageFollowers}
              <select on:change={(event) => void addFollower(event)} class="mt-2.5 h-9 w-full rounded-xl border border-[#D9DDE4] bg-white px-2.5 text-[11px]">
                <option value="">Adicionar seguidor...</option>
                {#each ticketData.followerCandidates.filter((candidate) => !ticketData.followers.some((follower) => follower.id === candidate.id)) as candidate}<option value={candidate.id}>{candidate.name}</option>{/each}
              </select>
            {/if}
          </div>

          <div class="mt-4 border-t border-[#EEF0F5] pt-3">
            <span class="text-[10px] font-semibold text-[#858B99]">Etiquetas</span>
            <div class="mt-2 flex flex-wrap gap-1.5">
              {#each ticketData.selectedLabels as label}
                <span class={`inline-flex items-center gap-1 rounded px-2 py-1 text-[10.5px] font-semibold ${labelClasses[label.color] ?? labelClasses.gray}`}>
                  {label.name}
                  {#if ticketData.canReply}<button type="button" on:click={() => void removeLabel(label.id)} aria-label={`Remover etiqueta ${label.name}`}>×</button>{/if}
                </span>
              {:else}
                <span class="text-[10.5px] text-[#9297A4]">Sem etiquetas.</span>
              {/each}
            </div>

            {#if ticketData.canReply}
              <select on:change={(event) => void addLabel(event)} class="mt-2.5 h-9 w-full rounded-xl border border-[#D9DDE4] bg-white px-2.5 text-[11px]">
                <option value="">Adicionar etiqueta...</option>
                {#each ticketData.labels.filter((label) => !ticketData.selectedLabels.some((selected) => selected.id === label.id)) as label}<option value={label.id}>{label.name}</option>{/each}
              </select>
              <details class="mt-2">
                <summary class="cursor-pointer list-none text-[10.5px] font-semibold text-[#000A57]">+ Criar etiqueta</summary>
                <form method="POST" action={actionUrl("createLabel")} on:submit|preventDefault={(event) => void submitForm(event, "createLabel", true)} class="mt-2 grid grid-cols-[1fr_96px] gap-2">
                  <input name="name" required minlength="2" maxlength="40" placeholder="Nome" class="h-9 rounded-xl border border-[#D9DDE4] px-2.5 text-[11px]"/>
                  <select name="color" class="h-9 rounded-xl border border-[#D9DDE4] bg-white px-2 text-[10.5px]"><option value="blue">Azul</option><option value="green">Verde</option><option value="yellow">Amarela</option><option value="orange">Laranja</option><option value="red">Vermelha</option><option value="purple">Roxa</option><option value="gray">Cinza</option></select>
                  <button type="submit" class="col-span-2 h-9 rounded-xl border border-[#D9DDE4] text-[10.5px] font-semibold text-[#4E5565]">Criar e adicionar</button>
                </form>
              </details>
            {/if}
          </div>
        </section>

        {#if ticketData.satisfaction}
          <section class="rounded-[18px] border border-[#E2E5ED] bg-white p-4">
            <h3 class="text-[12px] font-semibold text-[#3D4452]">Satisfação</h3>
            {#if ticketData.satisfaction.answeredAt && ticketData.satisfaction.score}
              <div class="mt-3 flex items-center gap-1 text-[#EA6D0B]" aria-label={`${ticketData.satisfaction.score} de 5 estrelas`}>
                {#each [1, 2, 3, 4, 5] as value}<Star size={15} fill={value <= ticketData.satisfaction.score ? "currentColor" : "none"} class={value <= ticketData.satisfaction.score ? "text-[#EA6D0B]" : "text-[#C7CBD4]"}/>{/each}
              </div>
              {#if ticketData.satisfaction.comment}<p class="mt-2 whitespace-pre-wrap text-[11px] leading-5 text-[#6D7482]">“{ticketData.satisfaction.comment}”</p>{/if}
            {:else}
              <p class="mt-2 text-[11px] text-[#9297A4]">Aguardando avaliação do cliente.</p>
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

        <details class="rounded-[18px] border border-[#E2E5ED] bg-white p-4">
          <summary class="flex cursor-pointer list-none items-center justify-between gap-3">
            <span class="flex items-center gap-2 text-[12px] font-semibold text-[#3D4452]"><ShieldCheck size={14}/>Histórico</span>
            <span class="rounded-full bg-[#F2F3F6] px-2 py-1 text-[10px] font-semibold text-[#777E8D]">{ticketData.details.events.length}</span>
          </summary>
          <div class="mt-3 space-y-3 border-t border-[#EEF0F5] pt-3">
            {#each ticketData.details.events as event}
              <div class="border-l-2 border-[var(--app-border)] pl-3">
                <p class="text-[10.5px] leading-5 text-[#626877]"><strong class="font-semibold text-[#3E4453]">{event.actorName ?? "Sistema"}</strong> {eventLabels[event.eventType] ?? event.eventType}</p>
                <span class="mt-0.5 block text-[9.5px] text-[#9B9FAC]">{formatDateTime(event.createdAt)}</span>
              </div>
            {/each}
          </div>
        </details>
      </aside>
    </div>
  </section>
</div>
