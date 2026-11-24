<script lang="ts">
  import { browser } from "$app/environment";
  import { Clock3, LoaderCircle, Paperclip, Ticket, X } from "lucide-svelte";

  export let sessionId: string;
  export let token: string;
  export let waitingSinceMs: number | null = null;
  export let available = false;
  export let outsideSupportHours = false;
  export let unitName: string | null = null;
  export let groupName: string | null = null;
  export let suggestedDescription = "";
  export let submitting = false;
  export let opened = false;
  export let ready = true;
  export let assistantTranscript = "";
  export let onOpen: () => void = () => undefined;
  export let onCancel: () => void = () => undefined;
  export let onAuthRequired: () => void | Promise<void> = () => undefined;
  export let onActiveChat: () => void | Promise<void> = () => undefined;
  export let onConverted: (ticket: { ticketId: string; ticketNumber: number }) => void | Promise<void>;

  const MAX_FILES = 4;
  const MAX_FILE_BYTES = 10 * 1024 * 1024;
  const MAX_TOTAL_BYTES = 32 * 1024 * 1024;
  let initializedDraft = false;
  let requestId = "";
  let dismissedKey = "";
  let subject = "";
  let description = "";
  let files: File[] = [];
  let errorMessage = "";
  let fileInput: HTMLInputElement;

  $: cycleKey = outsideSupportHours ? `f10:chat-wait:${sessionId}:outside-hours` : waitingSinceMs === null ? "" : `f10:chat-wait:${sessionId}:${waitingSinceMs}`;
  $: dismissed = Boolean(cycleKey) && dismissedKey === cycleKey;
  $: if (browser && cycleKey) readDismissal(cycleKey);
  $: if (opened && ready && !initializedDraft) initializeDraft(suggestedDescription);

  function readDismissal(key: string): void {
    try {
      if (window.sessionStorage.getItem(key) === "1") dismissedKey = key;
    } catch {
      // A escolha também permanece em memória.
    }
  }

  function dismissOffer(): void {
    dismissedKey = cycleKey;
    opened = false;
    onCancel();
    if (browser && cycleKey) {
      try { window.sessionStorage.setItem(cycleKey, "1"); } catch {}
    }
  }

  function initializeDraft(suggestion: string): void {
    initializedDraft = true;
    if (!description && suggestion.trim() && !/^Solicito atendimento/i.test(suggestion)) {
      description = suggestion.trim().slice(0, 10000);
      if (!subject) subject = description.split("\n")[0].slice(0, 180);
    }
  }

  function openForm(): void {
    errorMessage = "";
    opened = true;
    onOpen();
  }

  function closeForm(): void {
    if (submitting) return;
    opened = false;
    onCancel();
  }

  function addFiles(event: Event): void {
    const target = event.currentTarget as HTMLInputElement;
    const selected = Array.from(target.files ?? []);
    target.value = "";
    const next = [...files, ...selected];
    if (next.length > MAX_FILES || next.some((file) => file.size > MAX_FILE_BYTES)
      || next.reduce((sum, file) => sum + file.size, 0) > MAX_TOTAL_BYTES) {
      errorMessage = "Máximo de 4 arquivos, 10 MB cada e 32 MB no total.";
      return;
    }
    files = next;
    errorMessage = "";
  }

  async function submit(): Promise<void> {
    if (!ready || submitting || subject.trim().length < 3 || !description.trim()) return;
    submitting = true;
    errorMessage = "";
    const form = new FormData();
    form.set("subject", subject.trim());
    form.set("description", description.trim());
    for (const file of files) form.append("files", file);

    try {
      if (!sessionId) {
        requestId ||= crypto.randomUUID();
        form.set("requestId", requestId);
        form.set("assistantTranscript", assistantTranscript.slice(0, 8000));
      }
      const endpoint = sessionId
        ? `/api/support/chat/${encodeURIComponent(sessionId)}/ticket`
        : "/api/support/chat/ticket";
      const response = await fetch(endpoint, {
        method: "POST",
        headers: sessionId ? { Authorization: `Bearer ${token}` } : {},
        body: form,
      });
      const result = await response.json() as { ticketId?: string; ticketNumber?: number; error?: string };
      if (response.status === 401 || (sessionId && response.status === 403)) {
        submitting = false;
        await onAuthRequired();
        return;
      }
      if (response.status === 409 && (result.error === "ACTIVE_CHAT_EXISTS" || result.error === "CUSTOMER_CONTEXT_REQUIRED")) {
        submitting = false;
        await onActiveChat();
        return;
      }
      if (!response.ok || !result.ticketId || typeof result.ticketNumber !== "number") {
        errorMessage = response.status === 401 || response.status === 403
          ? "Sua sessão expirou. Entre novamente para continuar."
          : response.status === 409
            ? "O atendimento foi alterado. Atualize a conversa antes de tentar novamente."
            : response.status === 400 || response.status === 413
              ? "Confira o título, a descrição e os anexos."
              : "Não foi possível abrir o chamado. Tente novamente; sua conversa não será encerrada.";
        return;
      }
      await onConverted({ ticketId: result.ticketId, ticketNumber: result.ticketNumber });
    } catch {
      errorMessage = "Não foi possível confirmar a abertura. Tente novamente.";
    } finally {
      submitting = false;
    }
  }
</script>

{#if opened && ready}
  <section class="mt-4 rounded-2xl border border-[#DDE2EB] bg-white p-4 shadow-sm" aria-label="Abrir chamado">
    <div class="flex items-center gap-2 text-[#000A57]">
      <Ticket size={20}/>
      <h3 class="flex-1 text-[15px] font-semibold">Abrir chamado</h3>
      <button type="button" disabled={submitting} on:click={closeForm} class="rounded-lg p-2 hover:bg-[#F3F4F7]" aria-label="Voltar ao chat"><X size={17}/></button>
    </div>
    {#if unitName || groupName}
      <p class="mt-1 text-[12px] text-[#687184]">{[groupName, unitName].filter(Boolean).join(" · ")}</p>
    {/if}
    <form on:submit|preventDefault={submit} class="mt-4 space-y-3">
      <label class="block text-[13px] font-semibold text-[#384152]">Título
        <input bind:value={subject} required minlength="3" maxlength="180" disabled={submitting} placeholder="Resuma o problema" class="mt-1 h-11 w-full rounded-xl border border-[#DDE2EB] px-3 text-[14px] font-normal"/>
      </label>
      <label class="block text-[13px] font-semibold text-[#384152]">Descrição
        <textarea bind:value={description} required maxlength="10000" rows="4" disabled={submitting} placeholder="Descreva o que está acontecendo..." class="mt-1 w-full rounded-xl border border-[#DDE2EB] px-3 py-2 text-[14px] font-normal leading-6"></textarea>
      </label>
      <input bind:this={fileInput} type="file" multiple accept="image/png,image/jpeg,image/webp,application/pdf" class="hidden" on:change={addFiles}/>
      <button type="button" disabled={submitting} on:click={() => fileInput.click()} class="inline-flex min-h-10 items-center gap-2 rounded-xl border border-[#DDE2EB] px-3 text-[13px] font-medium text-[#000A57]"><Paperclip size={16}/> Anexar arquivos</button>
      {#each files as file, index}
        <div class="flex items-center gap-2 rounded-lg bg-[#F4F5F8] px-3 py-2 text-[12px]">
          <span class="min-w-0 flex-1 truncate">{file.name}</span>
          <button type="button" disabled={submitting} on:click={() => (files = files.filter((_, position) => position !== index))} aria-label={`Remover ${file.name}`} class="shrink-0 p-1"><X size={15}/></button>
        </div>
      {/each}
      <p class="text-[12px] leading-5 text-[#687184]">O histórico do chat será preservado no chamado.</p>
      {#if errorMessage}<p role="alert" class="rounded-lg bg-[#FFF0EF] px-3 py-2 text-[13px] text-[#9A3C32]">{errorMessage}</p>{/if}
      <button type="submit" disabled={submitting || subject.trim().length < 3 || !description.trim()} class="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-[#000A57] text-[14px] font-semibold text-white disabled:opacity-50">
        {#if submitting}<LoaderCircle size={16} class="animate-spin"/> Enviando...{:else}Enviar chamado{/if}
      </button>
    </form>
  </section>
{:else if available && ready && !opened}
  {#if dismissed}
    <button type="button" on:click={openForm} class="mt-3 inline-flex items-center gap-1.5 rounded-xl border border-[#DDE2EB] bg-white px-3 py-2 text-[13px] font-medium text-[#000A57]"><Ticket size={15}/> Abrir chamado</button>
  {:else}
    <section class="mt-4 space-y-3 rounded-2xl border border-[#DDE2EB] bg-white p-4 shadow-sm" aria-label="Aguardando atendimento">
      <div class="flex items-center gap-2 text-[13px] font-semibold text-[#000A57]"><Clock3 size={18}/> {outsideSupportHours ? "Fora do horário de atendimento" : "Aguardando atendimento"}</div>
      <p class="text-[14px] leading-6 text-[#384152]">{outsideSupportHours ? "Você pode abrir um chamado agora. Nossa equipe dará continuidade no próximo período de atendimento." : "Você está na fila de atendimento. Não queremos que fique esperando! Se preferir, pode abrir um chamado aqui mesmo e acompanhar a resposta da nossa equipe."}</p>
      <button type="button" on:click={openForm} class="flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-[#000A57] text-[14px] font-semibold text-white"><Ticket size={17}/> Abrir chamado</button>
      <button type="button" on:click={dismissOffer} class="flex min-h-11 w-full items-center justify-center rounded-xl border border-[#DDE2EB] text-[14px] font-semibold text-[#000A57]">{outsideSupportHours ? "Continuar no chat" : "Aguardar na fila"}</button>
    </section>
  {/if}
{/if}
