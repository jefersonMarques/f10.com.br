<script lang="ts">
  import { deserialize } from "$app/forms";
  import { goto, invalidateAll } from "$app/navigation";
  import { tick } from "svelte";
  import {
    Building2,
    CalendarDays,
    CheckCircle2,
    CircleAlert,
    FileText,
    GitMerge,
    Ellipsis,
    Headphones,
    History,
    MessageSquare,
    MonitorCog,
    Paperclip,
    ListChecks,
    Plus,
    Route,
    Send,
    Star,
    Trash2,
    UserRound,
    UsersRound,
    X,
  } from "lucide-svelte";
  import MentionTextarea from "$lib/components/operations/MentionTextarea.svelte";
  import SupportChatMarkdown from "$lib/components/support/SupportChatMarkdown.svelte";
  import MessageActionMenu from "$lib/components/support/MessageActionMenu.svelte";
  import UserAvatar from "$lib/components/application/UserAvatar.svelte";
  import MessageTaskPopover from "$lib/components/support/MessageTaskPopover.svelte";
  import TicketRichTextEditor from "$lib/components/operations/tickets/TicketRichTextEditor.svelte";
  import TicketRemotePanel from "$lib/components/operations/tickets/TicketRemotePanel.svelte";
  import TicketCustomerCard from "./TicketCustomerCard.svelte";
  import TicketRelationshipsInline from "./TicketRelationshipsInline.svelte";
  import TicketHistoryPanel from "./TicketHistoryPanel.svelte";
  import TicketMergeDialog from "./TicketMergeDialog.svelte";
  import TicketTaskPanel from "$lib/components/operations/TicketTaskPanel.svelte";
  import ServiceRequestDetailsCard from "$lib/components/serviceRequests/ServiceRequestDetailsCard.svelte";
  import {
    formatBytes,
    formatDateTime,
    labelClasses,
    priorityLabels,
  } from "./presentation";
  import type { TicketDetailsData, TicketMainPanel, TicketWorkflow } from "./types";
  import EmailMessageBody from "./EmailMessageBody.svelte";
  import LivePageSync from "$lib/components/application/LivePageSync.svelte";

  type TicketSurface = "page" | "split" | "modal";
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
  let mergeDialogOpen = false;
  let taskMessage: TicketDetailsData["details"]["messages"][number] | null = null;
  let ticketMenuOpen = false;
  let labelEditorOpen = false;
  let relationshipsPanel: TicketRelationshipsInline | null = null;
  let workflowSelectionKey = "";
  let workflowId = "";
  let stageId = "";
  export let activeMainPanel: TicketMainPanel = "conversation";
  let composerMode: ComposerMode = ticketData.canReply ? "reply" : "note";
  let composerExpanded = false;
  let composerForm: HTMLFormElement | null = null;
  let replyEditor: TicketRichTextEditor | null = null;
  let replyDraft = "";
  let allowedExternalImageMessages = new Set<string>();

  function showExternalImagesForMessage(messageId: string): void {
    allowedExternalImageMessages = new Set([...allowedExternalImageMessages, messageId]);
  }
  let noteDraft = "";
  let composerFileInput: HTMLInputElement | null = null;
  let composerFiles: File[] = [];
  let replyFiles: File[] = [];

  $: currentComposerFiles = composerMode === "reply" ? replyFiles : composerFiles;
  $: currentComposerDraft = composerMode === "reply" ? replyDraft : noteDraft;
  $: canSendComposer = !actionLoading
    && currentComposerFiles.length <= 4
    && currentComposerFiles.reduce((total, file) => total + file.size, 0) <= 12 * 1024 * 1024
    && currentComposerDraft.length <= 10000
    && (currentComposerDraft.trim().length > 0 || currentComposerFiles.length > 0);

  async function reactTicketMessage(
    messageId: string,
    code: "like" | "heart" | "check" | "eyes",
  ): Promise<void> {
    const response = await fetch("/api/app/messages/reactions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        sourceKind: "ticket",
        ticketId: ticketData.details.ticket.id,
        messageId,
        reaction: code,
      }),
    });
    if (!response.ok) {
      actionFeedback = { success: false, message: "Não foi possível registrar a reação." };
      return;
    }
    await refreshDetails();
  }

  async function focusComposer(): Promise<void> {
    await tick();
    composerForm?.querySelector<HTMLElement>('[contenteditable="true"], textarea[name="body"]')?.focus();
  }

  async function expandComposer(): Promise<void> {
    composerExpanded = true;
    await focusComposer();
  }

  function collapseComposerOnOutsidePointerDown(event: PointerEvent): void {
    if (!composerExpanded || actionLoading || !composerForm) return;
    if (event.composedPath().includes(composerForm)) return;

    composerExpanded = false;
  }

  async function selectComposerMode(mode: ComposerMode): Promise<void> {
    if (actionLoading || mode === composerMode) return;
    composerMode = mode;
    await tick();
    if (mode === "note") setComposerFiles(composerFiles);
    await focusComposer();
  }

  function openComposerAttachments(): void {
    if (composerMode === "reply") {
      replyEditor?.openFilePicker();
    } else {
      composerFileInput?.click();
    }
  }

  function setComposerFiles(files: File[]): void {
    const unique = new Map<string, File>();
    for (const file of files) unique.set([file.name, file.size, file.lastModified].join(":"), file);
    composerFiles = [...unique.values()];
    if (!composerFileInput) return;
    const transfer = new DataTransfer();
    for (const file of composerFiles) transfer.items.add(file);
    composerFileInput.files = transfer.files;
  }

  function pickComposerFiles(event: Event): void {
    const control = event.currentTarget as HTMLInputElement;
    setComposerFiles([...composerFiles, ...Array.from(control.files ?? [])]);
  }

  function pasteComposer(event: ClipboardEvent): void {
    if (composerMode !== "note") return;
    const pastedFiles = Array.from(event.clipboardData?.files ?? []);
    if (!pastedFiles.length) return;
    event.preventDefault();
    setComposerFiles([...composerFiles, ...pastedFiles]);
    const text = event.clipboardData?.getData("text/plain") ?? "";
    if (text) noteDraft += text;
  }

  $: isInfoPanel = surface !== "page" && ["service", "customer", "tasks"].includes(activeMainPanel);
  $: if (activeMainPanel === "collaboration") activeMainPanel = "service";

  function tabClass(panel: TicketMainPanel, currentPanel: TicketMainPanel): string {
    const base = "inline-flex h-full shrink-0 items-center gap-1.5 border-b-2 px-1 text-[12px] font-semibold transition-colors";
    return currentPanel === panel
      ? `${base} border-[var(--app-primary)] text-[var(--app-primary)]`
      : `${base} border-transparent text-[var(--app-text-muted)] hover:text-[var(--app-primary)]`;
  }

  function selectTab(panel: TicketMainPanel): void {
    activeMainPanel = panel;
  }


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

  function resizeReply(event: Event): void {
    const textarea = event.currentTarget as HTMLTextAreaElement;
    textarea.style.height = "auto";
    textarea.style.height = `${Math.min(textarea.scrollHeight, 144)}px`;
    textarea.style.overflowY = textarea.scrollHeight > 144 ? "auto" : "hidden";
  }

  function actionUrl(action: string): string {
    return `/app/tickets/${ticketData.details.ticket.id}?/${action}`;
  }

  function formatDate(value: string | null | undefined): string {
    if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return "Sem data";

    const [year, month, day] = value.split("-").map(Number);
    const date = new Date(year, month - 1, day);
    if (
      date.getFullYear() !== year ||
      date.getMonth() !== month - 1 ||
      date.getDate() !== day
    ) {
      return "Sem data";
    }

    return new Intl.DateTimeFormat("pt-BR", { dateStyle: "short" }).format(date);
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

  async function undoMergedTicket(linkId: string, ticketNumber: number): Promise<void> {
    if (!confirm(`Desfazer a mesclagem com o ticket #${ticketNumber}? O histórico será mantido.`)) return;
    const data = new FormData();
    data.set("linkId", linkId);
    await postAction("unmergeTicket", data);
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
    if (action === "note") {
      noteDraft = "";
      composerFiles = [];
      if (composerFileInput) composerFileInput.value = "";
    } else {
      replyDraft = "";
      replyFiles = [];
    }
    composerExpanded = false;
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

<svelte:window on:pointerdown={collapseComposerOnOutsidePointerDown}/>

<LivePageSync endpoint={`/app/tickets/${ticketData.details.ticket.id}/updates`} initialRevision={String(new Date(ticketData.details.ticket.updatedAt).getTime())} onRefresh={refreshDetails} />


<div class={surface === "page"
  ? "bg-[var(--app-bg)]"
  : "h-full min-h-0 overflow-y-auto bg-white lg:overflow-hidden"}>
  <section class={surface === "page"
    ? "overflow-hidden rounded-[24px] border border-[var(--app-border)] bg-white shadow-[0_12px_32px_rgba(1,13,40,0.05)]"
    : "flex min-h-full flex-col bg-white lg:h-full lg:min-h-0"}>
    <header class={surface === "split" ? "shrink-0 border-b border-[var(--app-border)] bg-white px-3 py-2" : "shrink-0 border-b border-[var(--app-border)] bg-white px-3 py-2 sm:px-4"}>
      <div class={surface === "split" ? "flex min-w-0 items-center gap-2.5" : "flex items-start gap-3"}>
        <span class="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[var(--app-info-bg)] text-[12px] font-bold text-[#000A57]">
          {initials(ticketData.customerOverview.requesterName ?? ticketData.customerOverview.clientName ?? "Cliente")}
        </span>

        <div class="min-w-0 flex-1">
          {#if surface === "split"}
            <div class="flex min-w-0 items-center gap-2">
              <span class="shrink-0 text-[11px] font-bold text-[#000A57]">#{ticketData.details.ticket.ticketNumber}</span>
              <h1 title={ticketData.details.ticket.subject} class="min-w-0 truncate text-[14px] font-semibold text-[#202637]">{ticketData.details.ticket.subject}</h1>
            </div>
            <div class="mt-0.5 flex min-w-0 items-center gap-1.5 text-[11px] text-[#838997]">
              <span class="shrink-0 font-semibold text-[#35509A]">{statusLabels[ticketData.details.ticket.status] ?? ticketData.details.ticket.status}</span>
              <span aria-hidden="true">·</span>
              <span class="shrink-0">{priorityLabels[ticketData.details.ticket.priority] ?? ticketData.details.ticket.priority}</span>
              <span aria-hidden="true">·</span>
              <span class="truncate">{ticketData.customerOverview.requesterName ?? ticketData.customerOverview.clientName ?? "Cliente pendente"}</span>
            </div>
          {:else}
            <div class="flex flex-wrap items-center gap-1.5">
              <span class="rounded-full bg-[var(--app-info-bg)] px-2 py-1 text-[10px] font-bold text-[#000A57]">#{ticketData.details.ticket.ticketNumber}</span>
              <span class="rounded-full bg-[var(--app-info-bg)] px-2 py-1 text-[10px] font-semibold text-[#35509A]">{statusLabels[ticketData.details.ticket.status] ?? ticketData.details.ticket.status}</span>
              <span class="rounded-full bg-[var(--app-surface-muted)] px-2 py-1 text-[10px] font-semibold text-[#666D7C]">{priorityLabels[ticketData.details.ticket.priority] ?? ticketData.details.ticket.priority}</span>
              <span class="inline-flex items-center gap-1 rounded-full bg-[var(--app-surface-muted)] px-2 py-1 text-[10px] font-semibold text-[#6D7382]"><CalendarDays size={11}/>{formatDate(ticketData.details.ticket.dueOn)}</span>
            </div>
            <h1 title={ticketData.details.ticket.subject} class="mt-1 line-clamp-1 text-[15px] font-semibold leading-5 text-[#202637]">{ticketData.details.ticket.subject}</h1>
            <p class="mt-0.5 truncate text-[11px] text-[#858B98]">
              {ticketData.customerOverview.requesterName ?? ticketData.customerOverview.clientName ?? "Cliente não identificado"} · {ticketData.details.ticket.queueName}
            </p>
          {/if}
        </div>

        <div class="flex shrink-0 items-center gap-2">
          {#if ticketData.mergeContext.canMerge}
            <details bind:open={ticketMenuOpen} class="relative">
              <summary class="flex h-9 w-9 cursor-pointer list-none items-center justify-center rounded-lg border border-[var(--app-border-control)] text-[var(--app-text)] hover:bg-[var(--app-surface-muted)]" aria-label="Mais opções do ticket" role="button">
                <Ellipsis size={19}/>
              </summary>
              <div class="absolute right-0 top-10 z-40 min-w-[190px] rounded-lg border border-[var(--app-border)] bg-[var(--app-surface)] p-1 shadow-xl">
                <button type="button" on:click={() => { ticketMenuOpen = false; mergeDialogOpen = true; }}
                  class="flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-left text-[12px] font-medium text-[var(--app-text)] hover:bg-[var(--app-surface-muted)]">
                  <GitMerge size={16}/>Mesclar tickets
                </button>
              </div>
            </details>
          {/if}
          {#if surface === "modal" && onClose}
            <button type="button" on:click={onClose} class="flex h-9 w-9 items-center justify-center rounded-xl border border-[var(--app-border)] text-[#69707E] hover:bg-[var(--app-surface-muted)]" aria-label="Fechar"><X size={16}/></button>
          {/if}
        </div>
      </div>
    </header>

    {#if ticketData.mergeContext.isSource}
      <div class="flex flex-wrap items-center gap-2 border-b border-[var(--app-border)] bg-[var(--app-info-bg)] px-4 py-2.5 text-[12px] text-[var(--app-info-text)]">
        <GitMerge size={16}/>
        <span>Ticket associado a outro atendimento.</span>
        {#if ticketData.mergeContext.rootAccessible}
          <a class="font-semibold underline" href={`/app/tickets/${ticketData.mergeContext.rootId}`}>Abrir ticket principal</a>
        {/if}
      </div>
    {/if}

    {#if ticketData.mergeContext.members.length > 1 && ticketData.mergeContext.rootId === ticketData.details.ticket.id}
      <section class="border-b border-[var(--app-border)] bg-[var(--app-surface-subtle)] px-4 py-3">
        <div class="flex items-center gap-2 text-[12px] font-semibold text-[var(--app-text)]">
          <GitMerge size={15}/>Tickets mesclados ({ticketData.mergeContext.members.length})
        </div>
        <div class="mt-2 flex flex-wrap gap-2">
          {#each ticketData.mergeContext.members.filter((member) => member.id !== ticketData.details.ticket.id) as member (member.id)}
            <span class="inline-flex max-w-full items-center gap-1.5 rounded-lg border border-[var(--app-border-control)] bg-[var(--app-surface)] px-2.5 py-1.5 text-[12px] text-[var(--app-text)]">
              <a href={`/app/tickets/${member.id}`} title={member.subject} class="font-semibold text-[var(--app-primary)] hover:underline">
                #{member.ticketNumber}
              </a>
              <span class="max-w-[150px] truncate text-[var(--app-text-muted)]">{member.serviceRequestType === "nfse" ? "NFS-e" : member.serviceRequestType === "cell_coin" ? "Cellcoin" : member.channel}</span>
              {#if ticketData.mergeContext.canUnmerge && member.linkId}
                <button type="button" on:click={() => void undoMergedTicket(member.linkId!, member.ticketNumber)}
                  aria-label={`Desfazer vínculo do ticket #${member.ticketNumber}`}
                  class="ml-1 flex h-6 w-6 items-center justify-center rounded text-[var(--app-text-muted)] hover:bg-[var(--app-surface-muted)]">
                  <X size={13}/>
                </button>
              {/if}
            </span>
          {/each}
        </div>
        <p class="mt-2 text-[11px] text-[var(--app-text-muted)]">Cada origem mantém seus canais, anexos, permissões, SLA e formulários. Responda ao remetente correto abrindo o ticket de origem.</p>
      </section>
    {/if}

    <nav class="relative z-20 flex h-11 shrink-0 items-center border-b border-[var(--app-border)] bg-white px-3 sm:px-4" aria-label="Seções do ticket">
      <div class="flex h-full min-w-0 flex-1 items-center gap-3 overflow-x-auto whitespace-nowrap sm:gap-5">
        <button type="button" class={tabClass("conversation", activeMainPanel)} aria-pressed={activeMainPanel === "conversation"} on:click={() => selectTab("conversation")}><MessageSquare size={14}/>Conversa</button>
        {#if surface !== "page"}
          <button type="button" class={tabClass("customer", activeMainPanel)} aria-pressed={activeMainPanel === "customer"} on:click={() => selectTab("customer")}><UserRound size={14}/>Cliente</button>
          {#if ticketData.canViewTasks}
            <button type="button" class={tabClass("tasks", activeMainPanel)} aria-pressed={activeMainPanel === "tasks"} on:click={() => selectTab("tasks")}><ListChecks size={14}/>Tarefas</button>
          {/if}
          <button type="button" class={tabClass("service", activeMainPanel)} aria-pressed={activeMainPanel === "service"} on:click={() => selectTab("service")}><Headphones size={14}/>Atendimento</button>
        {/if}
        <button type="button" class={tabClass("history", activeMainPanel)} aria-pressed={activeMainPanel === "history"}
          on:click={() => selectTab("history")}><History size={14}/>Histórico</button>
        {#if ticketData.canRequestRemote}
          <button type="button" class={tabClass("remote", activeMainPanel)} aria-pressed={activeMainPanel === "remote"} on:click={() => selectTab("remote")}><MonitorCog size={14}/>Acesso remoto</button>
        {/if}
        <button type="button" class={tabClass("attachments", activeMainPanel)} aria-pressed={activeMainPanel === "attachments"} on:click={() => selectTab("attachments")}><Paperclip size={14}/>Anexos {#if ticketData.attachments.length > 0}<span class="text-[11px] text-[var(--app-text-muted)]">{ticketData.attachments.length}</span>{/if}</button>
        {#if ticketData.serviceRequest}
          <button type="button" class={tabClass("request", activeMainPanel)} aria-pressed={activeMainPanel === "request"} on:click={() => selectTab("request")}><FileText size={14}/>Solicitação</button>
        {/if}
      </div>
    </nav>

    {#if visibleFeedback?.message}
      <div class={`mx-4 mt-3 flex shrink-0 items-start gap-2 rounded-xl px-3 py-2.5 text-[11px] font-medium sm:mx-5 ${visibleFeedback.success ? "bg-[var(--app-success-bg)] text-[#2F7045]" : "bg-[var(--app-danger-bg)] text-[#9B3C3C]"}`}>
        {#if visibleFeedback.success}<CheckCircle2 size={14} class="mt-0.5 shrink-0"/>{:else}<CircleAlert size={14} class="mt-0.5 shrink-0"/>{/if}
        <span>{visibleFeedback.message}</span>
      </div>
    {/if}

    <div class={surface === "page"
      ? activeMainPanel === "history" ? "grid grid-cols-1" : "grid xl:grid-cols-[minmax(0,1fr)_350px]"
      : "relative grid min-h-0 flex-1 grid-cols-1"}>
      <main class={surface === "page"
        ? "min-w-0 bg-white"
        : isInfoPanel ? "hidden" : "flex min-h-[500px] min-w-0 flex-col bg-white lg:min-h-0"}>
        {#if activeMainPanel === "conversation"}
          <section class={surface === "page" ? "flex min-h-[720px] flex-col" : "flex min-h-0 flex-1 flex-col"}>
            <div class={surface === "page"
              ? "min-w-0 flex-1 space-y-3 bg-[var(--app-surface-subtle)] px-3 py-4 sm:px-5"
              : "min-h-0 min-w-0 flex-1 space-y-3 overflow-y-auto bg-[var(--app-surface-subtle)] px-3 py-4 sm:px-5"}>
              {#each ticketData.details.messages as message}
                {#if message.sourceTicketNumber && message.sourceTicketNumber !== ticketData.details.ticket.ticketNumber}
                  <div class="flex justify-center">
                    <span class="rounded-full border border-[var(--app-border)] bg-[var(--app-surface)] px-2.5 py-1 text-[11px] text-[var(--app-text-muted)]">
                      Origem: #{message.sourceTicketNumber} · {message.channel ?? "Ticket"}
                    </span>
                  </div>
                {/if}
                {#if message.authorType === "system"}
                  <div class="flex min-w-0 justify-center py-1">
                    <article class="min-w-0 max-w-[95%] rounded-xl bg-[var(--app-surface-muted)] px-3.5 py-2.5 text-center sm:max-w-[84%]">
                      <div class="flex items-center justify-center gap-2 text-[10px] text-[#8B919E]">
                        <strong class="font-semibold text-[#69707F]">Sistema</strong>
                        <span>{formatDateTime(message.createdAt)}</span>
                      </div>
                      <p class="mt-1 whitespace-pre-wrap text-[12px] leading-5 text-[#606776]">{message.body}</p>
                    </article>
                  </div>
                {:else if message.visibility === "internal"}
                  <div class="flex min-w-0 justify-center py-1">
                    <article class="group relative w-fit min-w-0 max-w-[95%] rounded-2xl border border-[var(--app-warning-border)] bg-[var(--app-warning-bg)] px-3.5 py-3 sm:max-w-[84%] sm:px-4">
                      <div class="flex min-w-0 flex-wrap items-baseline gap-x-3 gap-y-1">
                        <UserAvatar userId={message.authorUserId ?? null} name={message.authorUserName ?? "Equipe F10"} hasAvatar={message.authorHasAvatar ?? false} size="xs"/>
                        <strong class="min-w-0 break-words text-[12px] font-semibold text-[var(--app-warning-text)]">{message.authorUserName ?? "Equipe F10"} · Nota interna</strong>
                        <span class="ml-auto shrink-0 whitespace-nowrap text-[11px] text-[var(--app-text-muted)]">{formatDateTime(message.createdAt)}</span>
                      </div>
                      <SupportChatMarkdown text={message.body} repairMultilineFormatting size="md" className="mt-2 text-[var(--app-warning-text)]"/>
                      {#if message.attachments?.length}
                        <div class="mt-3 min-w-0 space-y-2 border-t border-[var(--app-warning-border)] pt-3">
                          {#each message.attachments as attachment}
                            {#if attachment.contentType.startsWith("image/")}
                              <a href={attachment.href} target="_blank" rel="noopener noreferrer" class="block w-fit max-w-full">
                                <img src={attachment.href} alt={attachment.originalName} loading="lazy" class="max-h-[300px] max-w-full rounded-lg border border-[var(--app-warning-border)] object-contain"/>
                              </a>
                            {:else}
                              <a href={attachment.href} target="_blank" rel="noopener noreferrer" class="flex min-h-9 min-w-0 items-center gap-2 rounded-lg bg-[var(--app-surface)] px-3 text-[12px] font-semibold text-[var(--app-warning-text)]">
                                <Paperclip size={14} class="shrink-0"/>
                                <span class="min-w-0 flex-1 truncate">{attachment.originalName}</span>
                                <span class="text-[11px] font-normal">{formatBytes(attachment.sizeBytes)}</span>
                              </a>
                            {/if}
                          {/each}
                          <p class="text-[11px] text-[#8A4D13]">Visível apenas para a equipe F10.</p>
                        </div>
                      {/if}
                      <MessageActionMenu reactions={message.reactions ?? []} myReaction={message.myReaction ?? null}
                        onReact={(code) => reactTicketMessage(message.id, code)}
                        taskLinks={message.taskLinks ?? []}
                        canCreateTask={ticketData.canCreateTask && ticketData.taskProjects.length > 0}
                        onCreateTask={() => (taskMessage = message)}/>
                    </article>
                  </div>
                {:else}
                  <div class={`flex w-full min-w-0 ${message.authorType === "customer" ? "justify-start" : "justify-end"}`}>
                    <article class={`group relative w-fit min-w-0 max-w-[95%] rounded-2xl px-3.5 py-3 text-left sm:max-w-[84%] sm:px-4 ${message.authorType === "customer" ? "rounded-bl-md bg-[var(--app-surface-muted)]" : "rounded-br-md bg-[var(--app-info-bg)]"}`}>
                      <div class="flex min-w-0 flex-wrap items-baseline gap-x-3 gap-y-1">
                        <UserAvatar userId={message.authorUserId ?? null} name={message.authorUserName ?? message.customerName ?? "Atendimento F10"} hasAvatar={message.authorHasAvatar ?? false} size="xs"/>
                        <strong class="min-w-0 break-words text-[12px] font-semibold text-[var(--app-text)]">{message.authorUserName ?? message.customerName ?? "Atendimento F10"}</strong>
                        <span class="ml-auto shrink-0 whitespace-nowrap text-[11px] text-[var(--app-text-muted)]">{formatDateTime(message.createdAt)}</span>
                      </div>
                      {#if message.channel === "email"}
                        <EmailMessageBody text={message.body} hasInlineImages={Boolean(message.inlineImages?.length)} className="mt-2 min-w-0 text-[var(--app-text)]"/>
                      {:else}
                        <SupportChatMarkdown text={message.body} repairMultilineFormatting size="md" className="mt-2 text-[var(--app-text)]"/>
                      {/if}
                      {#if message.inlineImages?.length}
                        <div class="mt-3 min-w-0 space-y-2">
                          {#if message.inlineImages.some((image) => image.external) && !allowedExternalImageMessages.has(message.id)}
                            <button type="button" on:click={() => showExternalImagesForMessage(message.id)} class="inline-flex min-h-10 items-center gap-2 rounded-xl border border-[#DDE1EA] bg-white px-3 text-[12px] font-semibold text-[#000A57]">
                              <FileText size={15}/>Mostrar imagens externas ({message.inlineImages.filter((image) => image.external).length})
                            </button>
                          {/if}
                          {#each message.inlineImages.filter((image, index, images) => images.findIndex((candidate) => candidate.src === image.src) === index) as emailImage (emailImage.src)}
                            {#if !emailImage.external || allowedExternalImageMessages.has(message.id)}
                              <a href={emailImage.src} target="_blank" rel="noopener noreferrer" class="block">
                                <img src={emailImage.src} alt={emailImage.alt || "Imagem do e-mail"} loading="lazy" referrerpolicy="no-referrer" class="max-h-[320px] max-w-full rounded-xl border border-[#DDE1EA] bg-white object-contain"/>
                              </a>
                            {/if}
                          {/each}
                        </div>
                      {/if}
                      {#if message.attachments?.length}
                        <div class="mt-3 min-w-0 space-y-2 border-t border-[var(--app-border)] pt-3">
                          {#each message.attachments as file}
                            {#if file.contentType.startsWith("image/")}
                              <a href={file.href} target="_blank" rel="noopener noreferrer" class="block w-fit max-w-full">
                                <img src={file.href} alt={file.originalName} loading="lazy"
                                  class="max-h-[360px] max-w-full rounded-lg border border-[var(--app-border)] object-contain"/>
                              </a>
                            {:else}
                              <a href={file.href} target="_blank" rel="noopener noreferrer" class="flex min-h-9 min-w-0 items-center gap-2 rounded-lg bg-[var(--app-surface)] px-3 text-[12px] font-semibold text-[var(--app-primary)]">
                                <Paperclip size={15} class="shrink-0"/>
                                <span class="min-w-0 flex-1 truncate">{file.originalName}</span>
                                <span class="shrink-0 text-[11px] font-normal text-[var(--app-text-muted)]">{formatBytes(file.sizeBytes)}</span>
                              </a>
                            {/if}
                          {/each}
                        </div>
                      {/if}
                      <MessageActionMenu reactions={message.reactions ?? []} myReaction={message.myReaction ?? null}
                        onReact={(code) => reactTicketMessage(message.id, code)}
                        taskLinks={message.taskLinks ?? []}
                        canCreateTask={ticketData.canCreateTask && ticketData.taskProjects.length > 0}
                        onCreateTask={() => (taskMessage = message)}/>
                    </article>
                  </div>
                {/if}
              {:else}
                <div class="flex min-h-[260px] items-center justify-center text-[11px] text-[#9298A5]">Nenhuma mensagem registrada.</div>
              {/each}
            </div>

            {#if (ticketData.canReply || ticketData.canCommentInternal) && ticketData.details.ticket.status !== "closed"}
              <div class="shrink-0 border-t border-[var(--app-border)] bg-[var(--app-surface)] px-3 py-2 sm:px-5">
                {#if !composerExpanded}
                  <button type="button" on:click={() => void expandComposer()}
                    aria-label={composerMode === "reply" ? "Escrever uma resposta" : "Escrever uma nota interna"}
                    class="flex min-h-12 w-full items-center gap-3 rounded-xl border border-[var(--app-border-control)] bg-[var(--app-surface)] px-4 text-left text-[14px] text-[var(--app-text-muted)] transition-colors hover:border-[var(--app-primary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--app-primary)]">
                    <span class="min-w-0 flex-1 truncate">{composerMode === "reply" ? "Escreva uma resposta" : "Escreva uma nota interna"}</span>
                    <Send size={18} class="shrink-0 text-[var(--app-primary)]"/>
                  </button>
                {/if}
                <form bind:this={composerForm} method="POST" action={actionUrl(composerMode === "note" ? "note" : "reply")}
                    on:submit|preventDefault={submitComposer}
                    on:paste={pasteComposer}
                    class="w-full rounded-xl border border-[var(--app-border-control)] bg-[var(--app-surface)] p-3" class:hidden={!composerExpanded}>
                    {#if composerMode === "reply"}
                      <TicketRichTextEditor bind:this={replyEditor} bind:value={replyDraft} bind:files={replyFiles} submitting={Boolean(actionLoading)}/>
                    {:else}
                      <MentionTextarea users={ticketData.mentionUsers} name="body" bind:value={noteDraft}
                        rows={3} maxlength={10000} autoGrow suggestionsAbove required={composerFiles.length === 0}
                        placeholder="Escreva uma nota interna..."
                        className="block min-h-[100px] max-h-[240px] w-full resize-y rounded-lg bg-[var(--app-surface)] p-3 text-[14px] leading-6 text-[var(--app-text)] outline-none"/>
                      <input bind:this={composerFileInput} name="files" type="file" multiple
                        accept="image/png,image/jpeg,image/webp,.pdf,.docx,.xlsx,.zip,.txt,.csv"
                        class="sr-only" on:change={pickComposerFiles}/>
                      {#if composerFiles.length > 0}
                        <div class="mt-2 flex flex-wrap gap-2">
                          {#each composerFiles as file}
                            <span class="application-text-caption inline-flex items-center gap-1 rounded-lg bg-[var(--app-surface-muted)] px-2 py-1 text-[var(--app-text)]">
                              <Paperclip size={13}/>{file.name}
                              <button type="button" on:click={() => setComposerFiles(composerFiles.filter((item) => item !== file))}
                                aria-label={`Remover ${file.name}`}><X size={13}/></button>
                            </span>
                          {/each}
                        </div>
                      {/if}
                      {#if composerFiles.length > 4 || composerFiles.reduce((total, file) => total + file.size, 0) > 12 * 1024 * 1024}
                        <p role="alert" class="application-text-caption mt-2 text-[var(--app-danger-text)]">Máximo de 4 arquivos e 12 MB por mensagem.</p>
                      {/if}
                    {/if}
                    <div class="mt-2 flex flex-wrap items-center justify-between gap-2 border-t border-[var(--app-border-soft)] pt-2">
                      <div class="flex items-center gap-1 rounded-lg bg-[var(--app-surface-muted)] p-1">
                        {#if ticketData.canReply}
                          <button type="button" disabled={Boolean(actionLoading)}
                            on:click={() => void selectComposerMode("reply")} aria-pressed={composerMode === "reply"}
                            class={`application-text-caption rounded-md px-3 py-1.5 font-semibold ${composerMode === "reply" ? "bg-[var(--app-surface)] text-[var(--app-primary)] shadow-sm" : "text-[var(--app-text-muted)]"}`}>Responder</button>
                        {/if}
                        {#if ticketData.canCommentInternal}
                          <button type="button" disabled={Boolean(actionLoading)}
                            on:click={() => void selectComposerMode("note")} aria-pressed={composerMode === "note"}
                            class={`application-text-caption rounded-md px-3 py-1.5 font-semibold ${composerMode === "note" ? "bg-[var(--app-surface)] text-[var(--app-warning-text)] shadow-sm" : "text-[var(--app-text-muted)]"}`}>Nota</button>
                        {/if}
                      </div>
                      <div class="flex items-center gap-2">
                        <button type="button" disabled={Boolean(actionLoading)} on:click={openComposerAttachments}
                          aria-label={composerMode === "reply" ? "Anexar à resposta" : "Anexar à nota interna"}
                          title="Anexar arquivo ou imagem"
                          class="flex h-9 w-9 items-center justify-center rounded-lg text-[var(--app-text-muted)] hover:bg-[var(--app-surface-muted)] disabled:opacity-50"><Paperclip size={18}/></button>
                        <button type="submit" disabled={!canSendComposer}
                          class={`application-text-caption flex h-10 items-center gap-2 rounded-lg px-4 font-semibold text-white disabled:opacity-50 ${composerMode === "note" ? "bg-[var(--app-warning-text)]" : "bg-[var(--app-primary)]"}`}>
                          <Send size={16}/>{actionLoading ? "Enviando..." : "Enviar"}
                        </button>
                      </div>
                    </div>
                  </form>
              </div>
            {/if}
          </section>
        {:else if activeMainPanel === "request" && ticketData.serviceRequest}
          <div class="min-h-0 flex-1 overflow-y-auto bg-[var(--app-surface-subtle)] p-4 sm:p-5">
            <ServiceRequestDetailsCard
              serviceRequest={ticketData.serviceRequest}
              ticketId={ticketData.details.ticket.id}
              mode="support"
              canEdit={ticketData.canReply && ticketData.details.ticket.status !== "closed"}
              updateAction={actionUrl("updateServiceRequest")}
              onUpdated={refreshDetails}
            />
          </div>
        {:else if activeMainPanel === "history"}
          <section class="min-h-0 flex-1 overflow-y-auto bg-[var(--app-surface-subtle)]">
            <TicketHistoryPanel {ticketData}/>
          </section>
        {:else if activeMainPanel === "remote" && ticketData.canRequestRemote}
          <TicketRemotePanel ticketId={ticketData.details.ticket.id} onRefresh={refreshDetails} onSelectCustomer={() => selectTab("customer")}/>
        {:else if activeMainPanel === "attachments"}
          <section class="min-h-0 flex-1 overflow-y-auto bg-[var(--app-surface-subtle)] p-4 sm:p-5">
            <div class="w-full rounded-[20px] border border-[var(--app-border)] bg-white p-4 sm:p-5">
              <div class="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 class="flex items-center gap-2 text-[13px] font-semibold text-[#343A46]"><Paperclip size={15}/>Anexos</h2>
                  <p class="mt-0.5 text-[10.5px] text-[#8B919F]">{ticketData.attachments.length} arquivo(s)</p>
                </div>
                {#if ticketData.canReply && ticketData.attachmentsEnabled}
                  <form method="POST" action={actionUrl("uploadAttachment")} on:submit|preventDefault={(event) => void submitForm(event, "uploadAttachment", true)} class="flex flex-wrap items-center gap-3">
                    <input name="file" type="file" required accept="image/png,image/jpeg,image/webp,image/gif,application/pdf,text/plain,.docx,.xlsx,.zip,.csv" class="max-w-[260px] text-[12px] text-[#6C7381]"/>
                    <label class="inline-flex items-center gap-2 text-[12px] font-medium text-[#4B5362]" title="Cria uma resposta pública com o arquivo. Até 10 MB por arquivo; GIF é permitido somente em anexos internos.">
                      <input type="checkbox" name="sendToCustomer" class="h-4 w-4 rounded border-app-border-control"/>
                      Enviar também por e-mail
                    </label>
                    <button type="submit" class="h-9 rounded-xl bg-[var(--app-primary)] px-3 text-[12px] font-semibold text-white">Salvar anexo</button>
                  </form>
                {/if}
              </div>

              <div class="mt-4 space-y-2">
                {#each ticketData.attachments as attachment}
                  <article class="flex items-center gap-3 rounded-xl border border-[var(--app-border)] bg-[var(--app-surface-subtle)] p-3">
                    <a href={attachment.href} target="_blank" rel="noreferrer" class="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-white text-[#000A57]"><Paperclip size={16}/></a>
                    <div class="min-w-0 flex-1">
                      <a href={attachment.href} target="_blank" rel="noreferrer" class="block truncate text-[11.5px] font-semibold text-[#303746] hover:underline">{attachment.originalName}</a>
                      <p class="mt-0.5 text-[11px] text-[var(--app-text-muted)]">
                        {formatBytes(attachment.sizeBytes)} · {formatDateTime(attachment.createdAt)}
                        {#if attachment.sourceTicketNumber && attachment.sourceTicketNumber !== ticketData.details.ticket.ticketNumber}
                          · <a class="font-semibold text-[var(--app-primary)] hover:underline" href={`/app/tickets/${attachment.sourceTicketId}`}>#{attachment.sourceTicketNumber}</a>
                        {/if}
                      </p>
                    </div>
                    {#if ticketData.canReply && attachment.source !== "email" && attachment.sourceTicketId === ticketData.details.ticket.id}
                      <button type="button" on:click={() => void deleteAttachment(attachment.id)} class="flex h-8 w-8 items-center justify-center rounded-lg text-[#A33A3A] hover:bg-[var(--app-danger-bg)]" aria-label={`Remover ${attachment.originalName}`}><Trash2 size={14}/></button>
                    {/if}
                  </article>
                {:else}
                  <div class="rounded-xl border border-dashed border-[var(--app-border-control)] px-4 py-12 text-center text-[11px] text-[#9499A5]">Nenhum anexo neste ticket.</div>
                {/each}
              </div>
            </div>
          </section>
        {/if}
      </main>

      {#if (surface === "page" && activeMainPanel !== "history") || isInfoPanel}
      <aside
        aria-label={surface === "page" ? "Informações do ticket" : "Seção do ticket"}
        class={surface === "page"
          ? "space-y-3 border-t border-[var(--app-border)] bg-[var(--app-bg)] p-3 xl:border-l xl:border-t-0"
          : "min-h-0 w-full overflow-y-auto bg-white px-3 py-4 sm:px-6"}
      >
        {#if surface === "page" || activeMainPanel === "service"}
        <section class={surface === "page" ? "rounded-[18px] border border-[var(--app-border)] bg-[var(--app-surface)] p-4"  : "w-full p-2 sm:p-4"}>
          <h3 class="flex items-center gap-2 text-[13px] font-semibold text-[var(--app-text)]"><Route size={17} class="text-[var(--app-primary)]"/>Fluxo e andamento</h3>

          <div class="mt-3 border-t border-[var(--app-border-soft)] pt-3">
            <div class="flex items-center gap-2 application-text-caption font-semibold text-[var(--app-text-muted)]"><Route size={12}/>Área e coluna</div>
            <p class="mt-1 application-text-caption leading-4 text-[var(--app-text-muted)]">{ticketData.workflowContext?.areaName ? `${ticketData.workflowContext.areaName} · ${ticketData.workflowContext.areaStageName ?? "Sem etapa"}` : ticketData.workflowContext?.globalStageName ?? "Fluxo global"}</p>
            {#if ticketData.canReply && workflowId}
              <form method="POST" action={actionUrl("moveTicketLocation")} on:submit|preventDefault={(event) => void submitForm(event, "moveTicketLocation")} class="mt-2.5 grid gap-2 sm:grid-cols-2">
                <select name="workflowId" value={workflowId} on:change={changeWorkflow} class="h-10 w-full rounded-xl border border-[var(--app-border-control)] bg-[var(--app-surface)] px-2.5 application-text-caption">
                  {#if ticketData.workflowBoard.globalWorkflow}<option value={ticketData.workflowBoard.globalWorkflow.id}>Fluxo global</option>{/if}
                  {#each movableAreaWorkflows as workflow}<option value={workflow.id}>Área · {workflow.areaName}</option>{/each}
                </select>
                <div class="flex min-w-0 gap-2">
                  <select name="stageId" bind:value={stageId} required class="h-10 min-w-0 flex-1 rounded-xl border border-[var(--app-border-control)] bg-[var(--app-surface)] px-2.5 application-text-caption">
                    {#each stageOptions as stage}<option value={stage.id}>{stage.name}{stage.stageType === "area_gateway" ? ` · ${stage.linkedAreaName ?? "Área"}` : ""}</option>{/each}
                  </select>
                  <button type="submit" disabled={Boolean(actionLoading)} class="h-10 rounded-xl bg-[var(--app-primary)] px-3 application-text-caption font-semibold text-white disabled:opacity-50">Mover</button>
                </div>
              </form>
            {/if}
          </div>

          <div class={"mt-3 grid gap-3 border-t border-[var(--app-border-soft)] pt-3 sm:grid-cols-2"}>
            <label>
              <span class="mb-1 block application-text-caption font-medium text-[var(--app-text-muted)]">Status</span>
              <select name="status" value={ticketData.details.ticket.status} disabled={!ticketData.canReply || Boolean(actionLoading)} on:change={(event) => void updateField("status", "status", event)} class="h-10 w-full rounded-xl border border-[var(--app-border-control)] bg-[var(--app-surface)] px-2.5 application-text-caption disabled:bg-[var(--app-surface-muted)]">
                <option value="new">Novo</option><option value="open">Aberto</option><option value="in_progress">Em andamento</option><option value="waiting_customer">Aguardando cliente</option><option value="resolved">Resolvido</option><option value="closed">Fechado</option>
              </select>
            </label>

            <label>
              <span class="mb-1 block application-text-caption font-medium text-[var(--app-text-muted)]">Prioridade</span>
              <select name="priority" value={ticketData.details.ticket.priority} disabled={!ticketData.canReply || Boolean(actionLoading)} on:change={(event) => void updateField("priority", "priority", event)} class="h-10 w-full rounded-xl border border-[var(--app-border-control)] bg-[var(--app-surface)] px-2.5 application-text-caption disabled:bg-[var(--app-surface-muted)]">
                <option value="low">Baixa</option><option value="normal">Normal</option><option value="high">Alta</option><option value="urgent">Urgente</option>
              </select>
            </label>

            <label>
              <span class="mb-1 block application-text-caption font-medium text-[var(--app-text-muted)]">Conclusão planejada</span>
              <input name="dueOn" type="date" required value={ticketData.details.ticket.dueOn} disabled={!ticketData.canReply || Boolean(actionLoading)} on:change={(event) => void updateField("dueOn", "dueOn", event)} class="h-10 w-full rounded-xl border border-[var(--app-border-control)] bg-[var(--app-surface)] px-2.5 application-text-caption disabled:bg-[var(--app-surface-muted)]"/>
            </label>

            <label>
              <span class="mb-1 block application-text-caption font-medium text-[var(--app-text-muted)]">Responsável</span>
              {#if ticketData.details.ticket.assignedUserId}
                <div class="mb-2 flex items-center gap-2">
                  <UserAvatar userId={ticketData.details.ticket.assignedUserId}
                    name={ticketData.details.ticket.assignedUserName ?? "Operador"}
                    hasAvatar={ticketData.details.ticket.assignedUserHasAvatar ?? false}
                    size="xs"/>
                  <span class="truncate text-[12px] font-semibold text-[var(--app-text)]">
                    {ticketData.details.ticket.assignedUserName ?? "Operador"}
                  </span>
                </div>
              {/if}
              {#if ticketData.canAssign}
                <select name="assignedUserId" disabled={Boolean(actionLoading)} on:change={(event) => void updateField("assign", "assignedUserId", event)} class="h-10 w-full rounded-xl border border-[var(--app-border-control)] bg-[var(--app-surface)] px-2.5 application-text-caption">
                  {#each ticketData.agents as agent}<option value={agent.id} selected={agent.id === ticketData.details.ticket.assignedUserId}>{agent.name}</option>{/each}
                </select>
              {:else}
                <div class="rounded-xl bg-[var(--app-surface-subtle)] px-3 py-2.5 application-text-caption font-semibold text-[var(--app-text)]">{ticketData.details.ticket.assignedUserName ?? "Não atribuído"}</div>
              {/if}
            </label>
          </div>

        </section>
        {/if}

        {#if surface === "page" || activeMainPanel === "customer"}
          <TicketCustomerCard
            {ticketData}
            {surface}
            saving={Boolean(actionLoading)}
            onAction={postAction}
            onManageContracts={() => relationshipsPanel?.focusContracts()}
          />
          {#key ticketData.details.ticket.id}
            <div class="mt-3">
              <TicketRelationshipsInline
                bind:this={relationshipsPanel}
                ticketId={ticketData.details.ticket.id}
                onRefresh={refreshDetails}
              />
            </div>
          {/key}
        {/if}


        {#if surface === "page" || activeMainPanel === "service"}
        <details open={surface === "page"} class={surface === "page" ? "" : "mt-4 rounded-xl border border-[var(--app-border)] bg-[var(--app-surface)] px-3 py-3"}>
          <summary class="application-text-caption flex cursor-pointer items-center gap-2 font-semibold text-[var(--app-text)]">
            <UsersRound size={15}/>Colaboração e etiquetas
          </summary>
        <section class={surface === "page" ? "rounded-[18px] border border-[var(--app-border)] bg-[var(--app-surface)] p-4" : "w-full p-2 sm:p-4"}>
          <h3 class="sr-only">Seguidores e etiquetas</h3>

          <div class="mt-3">
            <span class="text-[10px] font-semibold text-[var(--app-text-muted)]">Seguidores</span>
            <div class="mt-2 flex flex-wrap gap-2">
              {#each ticketData.followers as follower}
                <span class="inline-flex items-center gap-1.5 rounded-full border border-[var(--app-border)] bg-[var(--app-surface-subtle)] py-1 pl-1 pr-2 application-text-caption font-semibold text-[var(--app-text)]">
                  <span class="flex h-6 w-6 items-center justify-center rounded-full bg-[var(--app-info-bg)] text-[9px] font-bold text-[#000A57]">{initials(follower.name)}</span>
                  {follower.name}
                  {#if ticketData.canManageFollowers}<button type="button" on:click={() => void removeFollower(follower.id)} aria-label={`Remover ${follower.name}`} class="text-[#9B3C3C]">×</button>{/if}
                </span>
              {:else}
                <span class="application-text-caption text-[var(--app-text-muted)]">Ninguém acompanhando.</span>
              {/each}
            </div>
            {#if ticketData.canManageFollowers}
              <select on:change={(event) => void addFollower(event)} class="mt-2.5 h-9 w-full rounded-xl border border-[var(--app-border-control)] bg-[var(--app-surface)] px-2.5 text-[11px]">
                <option value="">Adicionar seguidor...</option>
                {#each ticketData.followerCandidates.filter((candidate) => !ticketData.followers.some((follower) => follower.id === candidate.id)) as candidate}<option value={candidate.id}>{candidate.name}</option>{/each}
              </select>
            {/if}
          </div>

          <div class="mt-4 border-t border-[var(--app-border-soft)] pt-3">
            <span class="text-[10px] font-semibold text-[var(--app-text-muted)]">Etiquetas</span>
            <div class="mt-2 flex flex-wrap gap-1.5">
              {#each ticketData.selectedLabels as label}
                <span class={`inline-flex items-center gap-1 rounded px-2 py-1 application-text-caption font-semibold ${labelClasses[label.color] ?? labelClasses.gray}`}>
                  {label.name}
                  {#if ticketData.canReply}<button type="button" on:click={() => void removeLabel(label.id)} aria-label={`Remover etiqueta ${label.name}`}>×</button>{/if}
                </span>
              {:else}
                <span class="application-text-caption text-[var(--app-text-muted)]">Sem etiquetas.</span>
              {/each}
            </div>

            {#if ticketData.canReply}
              <div class="mt-3 flex flex-wrap gap-2">
                <select on:change={(event) => void addLabel(event)}
                  aria-label="Adicionar etiqueta existente"
                  class="application-text-caption h-10 min-w-0 flex-1 rounded-lg border border-[var(--app-border-control)] bg-[var(--app-surface)] px-3 text-[var(--app-text)]">
                  <option value="">Adicionar etiqueta existente...</option>
                  {#each ticketData.labels.filter((label) => !ticketData.selectedLabels.some((selected) => selected.id === label.id)) as label}
                    <option value={label.id}>{label.name}</option>
                  {/each}
                </select>
                <button type="button" on:click={() => (labelEditorOpen = !labelEditorOpen)}
                  class="application-text-caption inline-flex h-10 items-center gap-1.5 rounded-lg border border-[var(--app-border-control)] px-3 font-semibold text-[var(--app-primary)]"
                  aria-expanded={labelEditorOpen}>
                  <Plus size={16}/> Nova
                </button>
              </div>
              {#if labelEditorOpen}
                <form method="POST" action={actionUrl("createLabel")}
                  on:submit|preventDefault={(event) => void submitForm(event, "createLabel", true)}
                  class="mt-2 grid gap-2 sm:grid-cols-[minmax(0,1fr)_110px_auto]">
                  <input name="name" required minlength="2" maxlength="40" placeholder="Nome da etiqueta"
                    class="application-text-caption h-10 min-w-0 rounded-lg border border-[var(--app-border-control)] bg-[var(--app-surface)] px-3 text-[var(--app-text)]"/>
                  <select name="color" aria-label="Cor da etiqueta"
                    class="application-text-caption h-10 rounded-lg border border-[var(--app-border-control)] bg-[var(--app-surface)] px-2 text-[var(--app-text)]">
                    <option value="blue">Azul</option><option value="green">Verde</option>
                    <option value="yellow">Amarela</option><option value="orange">Laranja</option>
                    <option value="red">Vermelha</option><option value="purple">Roxa</option>
                    <option value="gray">Cinza</option>
                  </select>
                  <button type="submit" disabled={Boolean(actionLoading)}
                    class="application-text-caption h-10 rounded-lg bg-[var(--app-primary)] px-3 font-semibold text-white disabled:opacity-50">
                    Criar e adicionar
                  </button>
                </form>
              {/if}
            {/if}
          </div>
        </section>

        {#if ticketData.satisfaction}
          <section class={surface === "page" ? "rounded-[18px] border border-[var(--app-border)] bg-white p-4"  : "w-full mt-4 p-2 sm:p-4"}>
            <h3 class="text-[12px] font-semibold text-[#3D4452]">Satisfação</h3>
            {#if ticketData.satisfaction.answeredAt && ticketData.satisfaction.score}
              <div class="mt-3 flex items-center gap-1 text-[#EA6D0B]" aria-label={`${ticketData.satisfaction.score} de 5 estrelas`}>
                {#each [1, 2, 3, 4, 5] as value}<Star size={15} fill={value <= ticketData.satisfaction.score ? "currentColor" : "none"} class={value <= ticketData.satisfaction.score ? "text-[#EA6D0B]" : "text-[#C7CBD4]"}/>{/each}
              </div>
              {#if ticketData.satisfaction.comment}<p class="mt-2 whitespace-pre-wrap text-[11px] leading-5 text-[var(--app-text-muted)]">“{ticketData.satisfaction.comment}”</p>{/if}
            {:else}
              <p class="mt-2 text-[11px] text-[var(--app-text-muted)]">Aguardando avaliação do cliente.</p>
            {/if}
          </section>
        {/if}

        </details>
        {/if}

        {#if ticketData.canViewTasks && (surface === "page" || activeMainPanel === "tasks")}
          <div class={surface === "page" ? ""  : "w-full"}>
          <TicketTaskPanel
            ticketId={ticketData.details.ticket.id}
            ticketNumber={ticketData.details.ticket.ticketNumber}
            ticketSubject={ticketData.details.ticket.subject}
            tasks={ticketData.linkedTasks}
            projects={ticketData.taskProjects}
            canCreate={ticketData.canCreateTask && ticketData.details.ticket.status !== "closed"}
            onCreated={refreshDetails}
          />
          </div>
        {/if}

      </aside>
      {/if}
    </div>
  </section>
</div>

{#if ticketData.mergeContext.canMerge}
  <TicketMergeDialog bind:open={mergeDialogOpen} {ticketData} saving={Boolean(actionLoading)} onAction={postAction}/>
{/if}

{#if taskMessage}
  <MessageTaskPopover
    sourceKind="ticket"
    messageId={taskMessage.id}
    messageBody={taskMessage.body}
    ticketId={taskMessage.sourceTicketId ?? ticketData.details.ticket.id}
    projects={ticketData.taskProjects}
    onCreated={async () => { await refreshDetails(); }}
    onClose={() => (taskMessage = null)}
  />
{/if}
