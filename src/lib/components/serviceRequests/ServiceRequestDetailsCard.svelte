<script lang="ts">
  import { invalidateAll } from "$app/navigation";
  import {
    Clock3,
    Download,
    Eye,
    EyeOff,
    FileText,
    KeyRound,
    Paperclip,
    Pencil,
    ShieldCheck,
    Upload,
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
  type AttachmentSlot = {
    fieldKey: string;
    label: string;
    accept: string;
    maxFiles: number;
    hint: string;
  };

  const ATTACHMENT_SLOTS: Record<ServiceRequestView["requestType"], AttachmentSlot[]> = {
    nfse: [
      {
        fieldKey: "certificate_file",
        label: "Certificado digital",
        accept: ".cert,.cer,.pem,.pfx,.p12,.p7b,.p7c,.p7s",
        maxFiles: 1,
        hint: "Certificado digital · até 5 MB.",
      },
      {
        fieldKey: "invoice_xml_file",
        label: "XML recente de nota fiscal",
        accept: ".xml,application/xml,text/xml",
        maxFiles: 1,
        hint: "XML válido · até 5 MB.",
      },
    ],
    cell_coin: [
      {
        fieldKey: "doc_rg_cnh",
        label: "RG ou CNH",
        accept: "application/pdf,image/png,image/jpeg,image/webp",
        maxFiles: 6,
        hint: "PDF ou imagem · até 10 MB por arquivo.",
      },
      {
        fieldKey: "doc_cnpj",
        label: "Documento do CNPJ",
        accept: "application/pdf,image/png,image/jpeg,image/webp",
        maxFiles: 6,
        hint: "PDF ou imagem · até 10 MB por arquivo.",
      },
      {
        fieldKey: "doc_contrato",
        label: "Contrato Social",
        accept: "application/pdf,image/png,image/jpeg,image/webp",
        maxFiles: 6,
        hint: "PDF ou imagem · até 10 MB por arquivo.",
      },
      {
        fieldKey: "doc_selfie",
        label: "Selfie com documento",
        accept: "image/png,image/jpeg,image/webp",
        maxFiles: 1,
        hint: "Imagem · até 5 MB.",
      },
    ],
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
  let attachmentLoading = "";
  let attachmentMessage = "";
  let attachmentError = "";

  $: presentSecretCount = serviceRequest.secrets.filter((secret) => secret.present).length;
  $: attachmentSlots = ATTACHMENT_SLOTS[serviceRequest.requestType];

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

  function attachmentsFor(fieldKey: string): AttachmentView[] {
    return serviceRequest.attachments.filter((attachment) => attachment.fieldKey === fieldKey);
  }

  function openView(): void {
    modalMode = "view";
    revealError = "";
    attachmentError = "";
    attachmentMessage = "";
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
    attachmentError = "";
    attachmentMessage = "";
    attachmentLoading = "";
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

  function attachmentErrorMessage(code: string): string {
    if (code === "SERVICE_REQUEST_VERSION_CONFLICT") {
      return "A solicitação foi alterada em outra sessão. Atualize a página antes de substituir o documento.";
    }
    if (code === "SERVICE_REQUEST_DELAY_ACK_REQUIRED") {
      return "Confirme o aviso sobre possível impacto no prazo.";
    }
    if (code === "SERVICE_REQUEST_TICKET_CLOSED") {
      return "Este chamado está fechado e não aceita alterações.";
    }
    if (code.includes("TOO_LARGE")) return "Um ou mais arquivos excedem o limite permitido.";
    if (code.includes("TYPE_INVALID")) return "O formato do arquivo não é aceito para este documento.";
    if (code.includes("TOO_MANY")) return "A quantidade de arquivos excede o limite deste documento.";
    return "Não foi possível substituir o documento. Revise os arquivos e tente novamente.";
  }

  async function replaceAttachment(event: SubmitEvent, fieldKey: string): Promise<void> {
    if (!canEdit || attachmentLoading) return;
    const form = event.currentTarget as HTMLFormElement;
    attachmentLoading = fieldKey;
    attachmentError = "";
    attachmentMessage = "";
    try {
      const endpoint = mode === "customer"
        ? `/api/customer/tickets/${ticketId}/service-request/attachments`
        : `/api/support/tickets/${ticketId}/service-request/attachments`;
      const response = await fetch(endpoint, {
        method: "POST",
        body: new FormData(form),
        credentials: "same-origin",
      });
      const payload = await response.json().catch(() => null) as { success?: boolean; error?: string } | null;
      if (!response.ok || !payload?.success) {
        throw new Error(payload?.error || "SERVICE_REQUEST_ATTACHMENT_UPDATE_FAILED");
      }
      attachmentMessage = "Documento atualizado e registrado no histórico.";
      form.reset();
      await invalidateAll();
    } catch (cause) {
      attachmentError = attachmentErrorMessage(
        cause instanceof Error ? cause.message : "SERVICE_REQUEST_ATTACHMENT_UPDATE_FAILED",
      );
    } finally {
      attachmentLoading = "";
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
      <p class="application-text-meta mt-1 text-[#858C9C]">Versão {serviceRequest.version} · atualizado em {formatDate(serviceRequest.updatedAt)}</p>
    </div>
    <div class="flex shrink-0 flex-wrap gap-2">
      <button type="button" on:click={openView} class="application-text-caption inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-[#DDE2EC] bg-white px-3 font-semibold text-[#000A57] transition hover:bg-[#F8F9FF]"><Eye size={14} />Ver dados</button>
      {#if canEdit}<button type="button" on:click={openEdit} class="application-text-caption inline-flex min-h-10 items-center justify-center gap-2 rounded-xl bg-[#000A57] px-3 font-semibold text-white"><Pencil size={14} />Editar dados</button>{/if}
    </div>
  </div>

  <div class="mt-4 grid gap-2 sm:grid-cols-3">
    <div class="rounded-xl border border-[#ECEEF3] bg-[#FAFBFC] px-3 py-3"><span class="application-text-meta block text-[#9298A5]">Campos</span><strong class="mt-1 block text-[12px] text-[#424A5B]">{serviceRequest.fields.length}</strong></div>
    <div class="rounded-xl border border-[#ECEEF3] bg-[#FAFBFC] px-3 py-3"><span class="application-text-meta block text-[#9298A5]">Documentos</span><strong class="mt-1 block text-[12px] text-[#424A5B]">{serviceRequest.attachments.length}</strong></div>
    <div class="rounded-xl border border-[#ECEEF3] bg-[#FAFBFC] px-3 py-3"><span class="application-text-meta block text-[#9298A5]">Credenciais protegidas</span><strong class="mt-1 block text-[12px] text-[#424A5B]">{presentSecretCount}</strong></div>
  </div>
</section>

{#if modalMode !== "closed"}
  <div class="fixed inset-0 z-[10040] flex items-end justify-center bg-[#010D28]/45 p-0 sm:items-center sm:p-5" role="presentation" on:click|self={closeModal}>
    <section class="max-h-[92dvh] w-full overflow-y-auto rounded-t-[24px] bg-white shadow-2xl sm:max-w-[860px] sm:rounded-[24px]" role="dialog" aria-modal="true" aria-label={`Dados da solicitação de ${serviceRequest.label}`}>
      <header class="sticky top-0 z-10 flex items-start justify-between gap-4 border-b border-[#E8EAF0] bg-white px-5 py-4 sm:px-6">
        <div><h2 class="text-[18px] font-semibold text-[#010D28]">{modalMode === "edit" ? "Editar" : "Dados da"} solicitação de {serviceRequest.label}</h2><p class="application-text-meta mt-1 text-[#858C9C]">Versão {serviceRequest.version} · criada em {formatDate(serviceRequest.createdAt)}</p></div>
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
                  <select name={`field:${field.key}`} value={String(field.value)} class="application-text-caption h-11 w-full rounded-xl border border-[#DDE1EA] bg-white px-3 outline-none focus:border-[#000A57]"><option value="true">Sim</option><option value="false">Não</option></select>
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
                  <label><span class="application-text-caption mb-1.5 block font-semibold text-[#555D6E]">{secret.label}</span><input name={`secret:${secret.key}`} type="password" autocomplete="new-password" maxlength="512" placeholder={secret.present ? "Informada · deixe em branco para manter" : "Não informada"} class="application-text-caption h-11 w-full rounded-xl border border-[#DDE1EA] px-3 outline-none focus:border-[#000A57]" /></label>
                {/each}
              </div>
            </div>
          {/if}

          {#if mode === "customer"}
            <label class="mt-6 flex items-start gap-3 rounded-xl border border-[#F0D7BD] bg-[#FFF9F3] p-4"><input name="delayAcknowledged" value="true" type="checkbox" required class="mt-0.5 h-4 w-4 rounded border-[#C8A27A]" /><span class="application-text-caption leading-5 text-[#76512F]">Confirmo que a alteração pode exigir nova conferência e atrasar a implantação. Se houver dúvida, vou acionar o suporte pelo próprio chamado antes de enviar.</span></label>
          {/if}

          <div class="mt-6 flex flex-col-reverse gap-2 border-t border-[#ECEEF3] pt-5 sm:flex-row sm:justify-end"><button type="button" on:click={closeModal} class="application-text-caption min-h-11 rounded-xl border border-[#DDE1EA] px-4 font-semibold text-[#555D6E]">Cancelar</button><button type="submit" class="application-text-caption min-h-11 rounded-xl bg-[#000A57] px-5 font-semibold text-white">Salvar alterações</button></div>
        </form>
      {:else}
        <div class="space-y-6 px-5 py-5 sm:px-6">
          <section>
            <h3 class="text-[13px] font-semibold text-[#454C5C]">Dados informados</h3>
            <dl class="mt-3 grid gap-2 sm:grid-cols-2">{#each serviceRequest.fields as field}<div class="rounded-xl border border-[#ECEEF3] bg-[#FAFBFC] px-3 py-3"><dt class="application-text-meta font-semibold text-[#8B91A0]">{field.label}</dt><dd class="mt-1 break-words text-[12px] leading-5 text-[#414958]">{field.displayValue}</dd></div>{/each}</dl>
          </section>

          {#if serviceRequest.secrets.length > 0}
            <section class="border-t border-[#ECEEF3] pt-5">
              <div class="flex items-center gap-2"><ShieldCheck size={15} class="text-[#000A57]" /><h3 class="text-[13px] font-semibold text-[#454C5C]">Credenciais protegidas</h3></div>
              <div class="mt-3 space-y-2">
                {#each serviceRequest.secrets as secret}
                  <div class="rounded-xl border border-[#E3E6ED] bg-[#FAFBFC] px-3 py-3"><div class="flex flex-wrap items-center justify-between gap-3"><div class="min-w-0"><span class="application-text-caption block font-semibold text-[#4E5565]">{secret.label}</span><span class="application-text-meta mt-1 block break-all font-mono text-[#737B8C]">{revealedSecrets[secret.key] ?? (secret.present ? "•••••••• · Informada" : "Não informada")}</span></div>{#if mode === "support" && secret.present}{#if revealedSecrets[secret.key]}<button type="button" on:click={() => hideSecret(secret.key)} class="application-text-caption inline-flex min-h-9 items-center gap-1.5 rounded-lg border border-[#DDE1EA] bg-white px-3 font-semibold text-[#555D6E]"><EyeOff size={13} />Ocultar</button>{:else}<button type="button" disabled={revealLoading === secret.key} on:click={() => revealSecret(secret.key)} class="application-text-caption inline-flex min-h-9 items-center gap-1.5 rounded-lg border border-[#DDE1EA] bg-white px-3 font-semibold text-[#000A57] disabled:opacity-50"><Eye size={13} />{revealLoading === secret.key ? "Revelando..." : "Revelar"}</button>{/if}{/if}</div></div>
                {/each}
              </div>
              {#if revealError}<p class="application-text-caption mt-2 text-[#A04435]">{revealError}</p>{/if}
            </section>
          {/if}

          <section class="border-t border-[#ECEEF3] pt-5">
            <div class="flex items-center gap-2"><Paperclip size={15} class="text-[#000A57]" /><h3 class="text-[13px] font-semibold text-[#454C5C]">Documentos</h3></div>
            {#if attachmentMessage}<p class="application-text-caption mt-3 rounded-xl bg-[#F1FBF4] px-3 py-2 text-[#356347]">{attachmentMessage}</p>{/if}
            {#if attachmentError}<p class="application-text-caption mt-3 rounded-xl bg-[#FFF5F5] px-3 py-2 text-[#9B2C2C]">{attachmentError}</p>{/if}
            <div class="mt-3 space-y-3">
              {#each attachmentSlots as slot}
                <article class="rounded-xl border border-[#E3E6ED] bg-[#FAFBFC] p-3">
                  <div class="flex flex-wrap items-start justify-between gap-2"><div><strong class="application-text-caption text-[#4E5565]">{slot.label}</strong><p class="application-text-meta mt-0.5 text-[#8B91A0]">{slot.hint}</p></div><span class="application-text-meta rounded-full bg-white px-2 py-1 font-semibold text-[#7A8190]">{attachmentsFor(slot.fieldKey).length} arquivo(s)</span></div>
                  {#if attachmentsFor(slot.fieldKey).length > 0}
                    <div class="mt-2 space-y-1.5">{#each attachmentsFor(slot.fieldKey) as attachment}<a href={attachment.href} target="_blank" rel="noopener noreferrer" class="application-text-caption flex items-center gap-2 rounded-lg border border-[#E4E7ED] bg-white px-3 py-2 font-semibold text-[#4E5565]"><Download size={13} class="shrink-0" /><span class="min-w-0 flex-1 truncate">{attachment.originalName}</span><span class="application-text-meta shrink-0 font-normal text-[#9499A5]">{formatBytes(attachment.sizeBytes)}</span></a>{/each}</div>
                  {:else}<p class="application-text-caption mt-2 text-[#9298A5]">Nenhum arquivo enviado.</p>{/if}

                  {#if canEdit}
                    <form class="mt-3 border-t border-[#E8EAF0] pt-3" enctype="multipart/form-data" on:submit|preventDefault={(event) => replaceAttachment(event, slot.fieldKey)}>
                      <input type="hidden" name="expectedVersion" value={serviceRequest.version} />
                      <input type="hidden" name="fieldKey" value={slot.fieldKey} />
                      <input name="files" type="file" required multiple={slot.maxFiles > 1} accept={slot.accept} class="application-text-caption block w-full rounded-lg border border-[#DDE1EA] bg-white px-2 py-2 text-[#555D6E] file:mr-2 file:rounded-md file:border-0 file:bg-[#EEF0FF] file:px-2 file:py-1 file:text-[10px] file:font-semibold file:text-[#000A57]" />
                      {#if mode === "customer"}<label class="mt-2 flex items-start gap-2 rounded-lg bg-[#FFF7EF] px-3 py-2"><input name="delayAcknowledged" value="true" type="checkbox" required class="mt-0.5" /><span class="application-text-meta leading-4 text-[#76512F]">Confirmo que substituir documentos pode exigir nova conferência e atrasar a implantação. Em caso de dúvida, posso falar com o suporte neste chamado.</span></label>{/if}
                      <button type="submit" disabled={Boolean(attachmentLoading)} class="application-text-caption mt-2 inline-flex min-h-9 items-center gap-1.5 rounded-lg bg-[#000A57] px-3 font-semibold text-white disabled:opacity-50"><Upload size={13} />{attachmentLoading === slot.fieldKey ? "Enviando..." : attachmentsFor(slot.fieldKey).length > 0 ? "Substituir documento" : "Enviar documento"}</button>
                    </form>
                  {/if}
                </article>
              {/each}
            </div>
          </section>

          <section class="border-t border-[#ECEEF3] pt-5">
            <div class="flex items-center gap-2"><Clock3 size={15} class="text-[#000A57]" /><h3 class="text-[13px] font-semibold text-[#454C5C]">Histórico de alterações</h3></div>
            <div class="mt-3 space-y-3">
              {#each serviceRequest.history as entry}
                <article class="rounded-xl border border-[#E5E8EE] bg-[#FAFBFC] p-3"><div class="flex flex-wrap items-center justify-between gap-2"><strong class="application-text-caption text-[#4B5262]">Versão {entry.version} · {sourceLabel(entry.source)}</strong><span class="application-text-meta text-[#9298A5]">{entry.actorName} · {formatDate(entry.createdAt)}</span></div>{#if entry.changes.length > 0}<div class="mt-2 space-y-2">{#each entry.changes as change}<div class="rounded-lg bg-white px-3 py-2"><span class="application-text-meta block font-semibold text-[#6A7180]">{change.label}</span>{#if change.secretChanged}<span class="application-text-caption mt-1 block text-[#8B5A2B]">Credencial alterada · valor protegido</span>{:else}<div class="application-text-caption mt-1 grid gap-1 text-[#555D6E] sm:grid-cols-2"><span class="whitespace-pre-wrap"><strong>Anterior:</strong> {change.previousValue}</span><span class="whitespace-pre-wrap"><strong>Novo:</strong> {change.nextValue}</span></div>{/if}</div>{/each}</div>{:else}<p class="application-text-meta mt-2 text-[#9298A5]">Registro inicial da solicitação.</p>{/if}</article>
              {/each}
            </div>
          </section>

          {#if canEdit}<div class="flex justify-end border-t border-[#ECEEF3] pt-5"><button type="button" on:click={openEdit} class="application-text-caption inline-flex min-h-11 items-center gap-2 rounded-xl bg-[#000A57] px-5 font-semibold text-white"><Pencil size={14} />Editar dados</button></div>{/if}
        </div>
      {/if}
    </section>
  </div>
{/if}
