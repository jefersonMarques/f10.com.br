<script lang="ts">
  import {
    Clock3,
    Download,
    Eye,
    EyeOff,
    FileText,
    KeyRound,
    Pencil,
    ShieldCheck,
    X,
  } from "lucide-svelte";

  type FieldView = {
    key: string;
    label: string;
    value: string | number | boolean | null;
    displayValue: string;
    editable: boolean;
    inputKind: "text" | "number" | "boolean" | "textarea" | "readonly";
  };

  type SecretView = { key: string; label: string; present: boolean };
  type AttachmentView = {
    id: string;
    fieldKey: string;
    label: string;
    originalName: string;
    mimeType: string;
    sizeBytes: number;
    href: string;
  };
  type HistoryChangeView = {
    fieldKey: string;
    label: string;
    previousValue: string;
    nextValue: string;
    secretChanged: boolean;
  };
  type HistoryView = {
    version: number;
    source: "customer" | "user" | "system";
    actorName: string;
    createdAt: string;
    changes: HistoryChangeView[];
  };
  type ServiceRequestView = {
    id: string;
    ticketId: string;
    requestType: "nfse" | "cell_coin";
    label: string;
    version: number;
    createdAt: string;
    updatedAt: string;
    fields: FieldView[];
    secrets: SecretView[];
    attachments: AttachmentView[];
    history: HistoryView[];
  };

  export let serviceRequest: ServiceRequestView;
  export let ticketId: string;
  export let mode: "customer" | "support";
  export let canEdit = false;
  export let updateAction: string;

  let modalMode: "closed" | "view" | "edit" = "closed";
  let revealLoading = "";
  let revealError = "";
  let revealedSecrets: Record<string, string> = {};

  $: presentSecretCount = serviceRequest.secrets.filter((secret) => secret.present).length;

  function formatDate(value: string): string {
    return new Intl.DateTimeFormat("pt-BR", {
      dateStyle: "short",
      timeStyle: "short",
    }).format(new Date(value));
  }

  function formatBytes(value: number): string {
    if (value < 1024 * 1024) return `${Math.max(1, Math.round(value / 1024))} KB`;
    return `${(value / (1024 * 1024)).toFixed(1)} MB`;
  }

  function sourceLabel(source: HistoryView["source"]): string {
    if (source === "customer") return "Cliente";
    if (source === "user") return "Equipe F10";
    return "Sistema";
  }

  function openView(): void {
    modalMode = "view";
    revealError = "";
  }

  function openEdit(): void {
    if (!canEdit) return;
    modalMode = "edit";
    revealError = "";
  }

  function closeModal(): void {
    modalMode = "closed";
    revealedSecrets = {};
    revealError = "";
    revealLoading = "";
  }

  function hideSecret(fieldKey: string): void {
    const next = { ...revealedSecrets };
    delete next[fieldKey];
    revealedSecrets = next;
  }

  async function revealSecret(fieldKey: string): Promise<void> {
    if (mode !== "support") return;
    revealLoading = fieldKey;
    revealError = "";
    try {
      const response = await fetch(
        `/api/support/tickets/${ticketId}/service-request/secrets/${encodeURIComponent(fieldKey)}/reveal`,
        { method: "POST", credentials: "same-origin" },
      );
      const payload = await response.json() as { success?: boolean; value?: string };
      if (!response.ok || !payload.success || typeof payload.value !== "string") {
        throw new Error("REVEAL_FAILED");
      }
      revealedSecrets = { ...revealedSecrets, [fieldKey]: payload.value };
    } catch {
      revealError = "Não foi possível revelar esta credencial.";
    } finally {
      revealLoading = "";
    }
  }
</script>

<section class="rounded-[22px] border border-[#DDE2EC] bg-white p-5 shadow-[0_8px_28px_rgba(1,13,40,0.025)] sm:p-6">
  <div class="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
    <div class="min-w-0">
      <div class="flex items-center gap-2 text-[#000A57]">
        <FileText size={18} />
        <h2 class="text-[15px] font-semibold">Dados da solicitação · {serviceRequest.label}</h2>
      </div>
      <p class="application-text-meta mt-1 text-[#858C9C]">
        Versão {serviceRequest.version} · atualizado em {formatDate(serviceRequest.updatedAt)}
      </p>
    </div>
    <div class="flex shrink-0 flex-wrap gap-2">
      <button type="button" on:click={openView} class="application-text-caption inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-[#DDE2EC] bg-white px-3 font-semibold text-[#000A57] transition hover:bg-[#F8F9FF]">
        <Eye size={14} />Ver dados
      </button>
      {#if canEdit}
        <button type="button" on:click={openEdit} class="application-text-caption inline-flex min-h-10 items-center justify-center gap-2 rounded-xl bg-[#000A57] px-3 font-semibold text-white">
          <Pencil size={14} />Editar dados
        </button>
      {/if}
    </div>
  </div>

  <div class="mt-4 grid gap-2 sm:grid-cols-3">
    <div class="rounded-xl border border-[#ECEEF3] bg-[#FAFBFC] px-3 py-3">
      <span class="application-text-meta block text-[#9298A5]">Campos</span>
      <strong class="mt-1 block text-[12px] text-[#424A5B]">{serviceRequest.fields.length}</strong>
    </div>
    <div class="rounded-xl border border-[#ECEEF3] bg-[#FAFBFC] px-3 py-3">
      <span class="application-text-meta block text-[#9298A5]">Documentos</span>
      <strong class="mt-1 block text-[12px] text-[#424A5B]">{serviceRequest.attachments.length}</strong>
    </div>
    <div class="rounded-xl border border-[#ECEEF3] bg-[#FAFBFC] px-3 py-3">
      <span class="application-text-meta block text-[#9298A5]">Credenciais protegidas</span>
      <strong class="mt-1 block text-[12px] text-[#424A5B]">{presentSecretCount}</strong>
    </div>
  </div>
</section>

{#if modalMode !== "closed"}
  <div class="fixed inset-0 z-[10040] flex items-end justify-center bg-[#010D28]/45 p-0 sm:items-center sm:p-5" role="presentation" on:click|self={closeModal}>
    <section class="max-h-[92dvh] w-full overflow-y-auto rounded-t-[24px] bg-white shadow-2xl sm:max-w-[860px] sm:rounded-[24px]" role="dialog" aria-modal="true" aria-label={`Dados da solicitação de ${serviceRequest.label}`}>
      <header class="sticky top-0 z-10 flex items-start justify-between gap-4 border-b border-[#E8EAF0] bg-white px-5 py-4 sm:px-6">
        <div>
          <h2 class="text-[18px] font-semibold text-[#010D28]">{modalMode === "edit" ? "Editar" : "Dados da"} solicitação de {serviceRequest.label}</h2>
          <p class="application-text-meta mt-1 text-[#858C9C]">Versão {serviceRequest.version} · criada em {formatDate(serviceRequest.createdAt)}</p>
        </div>
        <button type="button" on:click={closeModal} aria-label="Fechar" class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-[#E1E4EC] text-[#6B7280] hover:bg-[#F7F8FA]"><X size={18} /></button>
      </header>

      {#if modalMode === "edit"}
        <form method="POST" action={updateAction} class="px-5 py-5 sm:px-6">
          <input type="hidden" name="expectedVersion" value={serviceRequest.version} />

          <div class="grid gap-4 sm:grid-cols-2">
            {#each serviceRequest.fields.filter((field) => field.editable) as field}
              <label class={field.inputKind === "textarea" ? "sm:col-span-2" : ""}>
                <span class="application-text-caption mb-1.5 block font-semibold text-[#555D6E]">{field.label}</span>
                {#if field.inputKind === "boolean"}
                  <select name={`field:${field.key}`} value={String(field.value)} class="application-text-caption h-11 w-full rounded-xl border border-[#DDE1EA] bg-white px-3 outline-none focus:border-[#000A57]">
                    <option value="true">Sim</option>
                    <option value="false">Não</option>
                  </select>
                {:else if field.inputKind === "number"}
                  <input name={`field:${field.key}`} type="number" step="any" value={field.value ?? ""} class="application-text-caption h-11 w-full rounded-xl border border-[#DDE1EA] px-3 outline-none focus:border-[#000A57]" />
                {:else if field.inputKind === "textarea"}
                  <textarea name={`field:${field.key}`} rows="4" maxlength="200000" class="application-text-caption w-full rounded-xl border border-[#DDE1EA] px-3 py-2.5 leading-5 outline-none focus:border-[#000A57]">{field.value ?? ""}</textarea>
                {:else}
                  <input name={`field:${field.key}`} type="text" maxlength="200000" value={field.value ?? ""} class="application-text-caption h-11 w-full rounded-xl border border-[#DDE1EA] px-3 outline-none focus:border-[#000A57]" />
                {/if}
              </label>
            {/each}
          </div>

          {#if serviceRequest.secrets.length > 0}
            <div class="mt-6 border-t border-[#ECEEF3] pt-5">
              <div class="flex items-center gap-2"><KeyRound size={15} class="text-[#9A541A]" /><h3 class="text-[13px] font-semibold text-[#454C5C]">Credenciais</h3></div>
              <p class="application-text-meta mt-1 text-[#8B91A0]">Deixe o campo vazio para manter a credencial atual. O valor anterior nunca é exibido no formulário.</p>
              <div class="mt-4 grid gap-4 sm:grid-cols-2">
                {#each serviceRequest.secrets as secret}
                  <label>
                    <span class="application-text-caption mb-1.5 block font-semibold text-[#555D6E]">{secret.label}</span>
                    <input name={`secret:${secret.key}`} type="password" autocomplete="new-password" maxlength="512" placeholder={secret.present ? "Informada · deixe em branco para manter" : "Não informada"} class="application-text-caption h-11 w-full rounded-xl border border-[#DDE1EA] px-3 outline-none focus:border-[#000A57]" />
                  </label>
                {/each}
              </div>
            </div>
          {/if}

          {#if mode === "customer"}
            <label class="mt-6 flex items-start gap-3 rounded-xl border border-[#F0D7BD] bg-[#FFF9F3] p-4">
              <input name="delayAcknowledged" value="true" type="checkbox" required class="mt-0.5 h-4 w-4 rounded border-[#C8A27A]" />
              <span class="application-text-caption leading-5 text-[#76512F]">Confirmo que alterações feitas após o envio podem exigir nova conferência da equipe F10 e impactar o prazo de conclusão.</span>
            </label>
          {/if}

          <div class="mt-6 flex flex-col-reverse gap-2 border-t border-[#ECEEF3] pt-5 sm:flex-row sm:justify-end">
            <button type="button" on:click={closeModal} class="application-text-caption min-h-11 rounded-xl border border-[#DDE1EA] px-4 font-semibold text-[#555D6E]">Cancelar</button>
            <button type="submit" class="application-text-caption min-h-11 rounded-xl bg-[#000A57] px-5 font-semibold text-white">Salvar alterações</button>
          </div>
        </form>
      {:else}
        <div class="space-y-6 px-5 py-5 sm:px-6">
          <section>
            <h3 class="text-[13px] font-semibold text-[#454C5C]">Dados informados</h3>
            <dl class="mt-3 grid gap-2 sm:grid-cols-2">
              {#each serviceRequest.fields as field}
                <div class="rounded-xl border border-[#ECEEF3] bg-[#FAFBFC] px-3 py-3">
                  <dt class="application-text-meta font-semibold text-[#8B91A0]">{field.label}</dt>
                  <dd class="mt-1 break-words text-[12px] leading-5 text-[#414958]">{field.displayValue}</dd>
                </div>
              {/each}
            </dl>
          </section>

          {#if serviceRequest.secrets.length > 0}
            <section class="border-t border-[#ECEEF3] pt-5">
              <div class="flex items-center gap-2"><ShieldCheck size={15} class="text-[#000A57]" /><h3 class="text-[13px] font-semibold text-[#454C5C]">Credenciais protegidas</h3></div>
              <div class="mt-3 space-y-2">
                {#each serviceRequest.secrets as secret}
                  <div class="rounded-xl border border-[#E3E6ED] bg-[#FAFBFC] px-3 py-3">
                    <div class="flex flex-wrap items-center justify-between gap-3">
                      <div class="min-w-0">
                        <span class="application-text-caption block font-semibold text-[#4E5565]">{secret.label}</span>
                        <span class="application-text-meta mt-1 block break-all font-mono text-[#737B8C]">{revealedSecrets[secret.key] ?? (secret.present ? "•••••••• · Informada" : "Não informada")}</span>
                      </div>
                      {#if mode === "support" && secret.present}
                        {#if revealedSecrets[secret.key]}
                          <button type="button" on:click={() => hideSecret(secret.key)} class="application-text-caption inline-flex min-h-9 items-center gap-1.5 rounded-lg border border-[#DDE1EA] bg-white px-3 font-semibold text-[#555D6E]"><EyeOff size={13} />Ocultar</button>
                        {:else}
                          <button type="button" disabled={revealLoading === secret.key} on:click={() => revealSecret(secret.key)} class="application-text-caption inline-flex min-h-9 items-center gap-1.5 rounded-lg border border-[#DDE1EA] bg-white px-3 font-semibold text-[#000A57] disabled:opacity-50"><Eye size={13} />{revealLoading === secret.key ? "Revelando..." : "Revelar"}</button>
                        {/if}
                      {/if}
                    </div>
                  </div>
                {/each}
              </div>
              {#if revealError}<p class="application-text-caption mt-2 text-[#9B2C2C]">{revealError}</p>{/if}
              {#if mode === "support"}<p class="application-text-meta mt-2 text-[#8B91A0]">Toda revelação é registrada no histórico de auditoria do ticket.</p>{/if}
            </section>
          {/if}

          <section class="border-t border-[#ECEEF3] pt-5">
            <h3 class="text-[13px] font-semibold text-[#454C5C]">Documentos</h3>
            {#if serviceRequest.attachments.length > 0}
              <div class="mt-3 space-y-2">
                {#each serviceRequest.attachments as attachment}
                  <a href={attachment.href} target="_blank" rel="noopener noreferrer" class="flex items-center gap-3 rounded-xl border border-[#E1E4EC] bg-[#FAFBFC] px-3 py-3 transition hover:border-[#C9CFE6] hover:bg-[#F7F8FF]">
                    <FileText size={16} class="shrink-0 text-[#000A57]" />
                    <div class="min-w-0 flex-1"><strong class="application-text-caption block truncate text-[#464D5C]">{attachment.label}</strong><span class="application-text-meta mt-0.5 block truncate text-[#8B91A0]">{attachment.originalName} · {formatBytes(attachment.sizeBytes)}</span></div>
                    <Download size={14} class="shrink-0 text-[#6D7484]" />
                  </a>
                {/each}
              </div>
            {:else}
              <p class="application-text-caption mt-2 text-[#8B91A0]">Nenhum documento vinculado.</p>
            {/if}
          </section>

          <section class="border-t border-[#ECEEF3] pt-5">
            <div class="flex items-center gap-2"><Clock3 size={15} class="text-[#000A57]" /><h3 class="text-[13px] font-semibold text-[#454C5C]">Histórico de alterações</h3></div>
            <div class="mt-3 space-y-3">
              {#each serviceRequest.history as entry}
                <article class="rounded-xl border border-[#E7E9EF] bg-[#FAFBFC] p-3">
                  <div class="flex flex-wrap items-center justify-between gap-2"><strong class="application-text-caption text-[#454C5C]">Versão {entry.version} · {entry.actorName}</strong><span class="application-text-meta text-[#9298A5]">{sourceLabel(entry.source)} · {formatDate(entry.createdAt)}</span></div>
                  {#if entry.version === 1}
                    <p class="application-text-caption mt-2 text-[#7B8291]">Solicitação criada.</p>
                  {:else if entry.changes.length > 0}
                    <div class="mt-3 space-y-2">
                      {#each entry.changes as change}
                        <div class="rounded-lg border border-[#ECEEF3] bg-white px-3 py-2">
                          <span class="application-text-meta font-semibold text-[#777E8E]">{change.label}</span>
                          {#if change.secretChanged}
                            <p class="application-text-caption mt-1 text-[#555D6E]">Credencial alterada. Os valores não são armazenados no histórico.</p>
                          {:else}
                            <div class="mt-1 grid gap-1 text-[11px] leading-4 text-[#626A7B] sm:grid-cols-2"><span><strong>Antes:</strong> {change.previousValue}</span><span><strong>Depois:</strong> {change.nextValue}</span></div>
                          {/if}
                        </div>
                      {/each}
                    </div>
                  {/if}
                </article>
              {/each}
            </div>
          </section>

          {#if canEdit}
            <div class="flex justify-end border-t border-[#ECEEF3] pt-5">
              <button type="button" on:click={openEdit} class="application-text-caption inline-flex min-h-11 items-center gap-2 rounded-xl bg-[#000A57] px-5 font-semibold text-white"><Pencil size={14} />Editar dados</button>
            </div>
          {/if}
        </div>
      {/if}
    </section>
  </div>
{/if}
