<script lang="ts">
  import { createEventDispatcher } from "svelte";
  import {
    ArrowDown,
    ArrowUp,
    Bold,
    Check,
    Code2,
    Italic,
    List,
    LoaderCircle,
    Pencil,
    Trash2,
    X,
  } from "lucide-svelte";
  import HelpRichText from "$lib/components/help/HelpRichText.svelte";

  type EditableBlock = {
    id: string;
    blockType: "text" | "notice" | "link" | "image" | "file";
    textContent: string;
    noticeVariant: string | null;
    linkUrl: string | null;
    linkLabel: string | null;
    asset?: {
      storageKey: string | null;
      sourceUrl: string | null;
      altText: string;
      assistantDescription: string;
      extractedText: string;
    } | null;
  };

  type ReviewResponse = {
    success?: boolean;
    message?: string;
    content?: unknown;
  };

  export let contentId: string;
  export let block: EditableBlock;
  export let blockIndex: number;
  export let blockCount: number;
  export let canEdit = false;
  export let canStartEdit: () => boolean = () => true;

  const dispatch = createEventDispatcher<{
    updated: { content: unknown };
    editing: { active: boolean };
  }>();

  let editing = false;
  let busy: "save" | "delete" | "move" | null = null;
  let error = "";
  let textarea: HTMLTextAreaElement | null = null;
  let draftText = block.textContent;
  let draftVariant = block.noticeVariant ?? "info";
  let draftLinkLabel = block.linkLabel ?? "";
  let draftLinkUrl = block.linkUrl ?? "";
  let draftSourceUrl = block.asset?.sourceUrl ?? "";
  let draftAltText = block.asset?.altText ?? "";
  let draftAssistantDescription = block.asset?.assistantDescription ?? "";
  let draftExtractedText = block.asset?.extractedText ?? "";

  function resetDraft(): void {
    draftText = block.textContent;
    draftVariant = block.noticeVariant ?? "info";
    draftLinkLabel = block.linkLabel ?? "";
    draftLinkUrl = block.linkUrl ?? "";
    draftSourceUrl = block.asset?.sourceUrl ?? "";
    draftAltText = block.asset?.altText ?? "";
    draftAssistantDescription = block.asset?.assistantDescription ?? "";
    draftExtractedText = block.asset?.extractedText ?? "";
  }

  function beginEdit(): void {
    if (editing || busy || !canEdit || !canStartEdit()) return;
    resetDraft();
    error = "";
    editing = true;
    dispatch("editing", { active: true });
    queueMicrotask(() => textarea?.focus());
  }

  function cancelEdit(): void {
    if (busy) return;
    editing = false;
    error = "";
    resetDraft();
    dispatch("editing", { active: false });
  }

  function wrapSelection(prefix: string, suffix = prefix): void {
    if (!textarea) return;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    draftText =
      draftText.slice(0, start) +
      prefix +
      draftText.slice(start, end) +
      suffix +
      draftText.slice(end);
    queueMicrotask(() => {
      textarea?.focus();
      textarea?.setSelectionRange(start + prefix.length, end + prefix.length);
    });
  }

  function prefixLines(): void {
    if (!textarea) return;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const lineStart = draftText.lastIndexOf("\n", start - 1) + 1;
    const lineEnd = end > start ? end : draftText.length;
    const selected = draftText.slice(lineStart, lineEnd);
    const replacement = selected.split("\n").map((line) => "- " + line).join("\n");
    draftText = draftText.slice(0, lineStart) + replacement + draftText.slice(lineEnd);
    queueMicrotask(() => textarea?.focus());
  }

  function validHttpUrl(value: string): boolean {
    try {
      const url = new URL(value);
      return url.protocol === "http:" || url.protocol === "https:";
    } catch {
      return false;
    }
  }

  async function requestUpdate(
    operation: "update_block" | "delete_block" | "move_block",
    changes: Record<string, unknown> = {},
  ): Promise<boolean> {
    if (busy) return false;
    busy = operation === "update_block" ? "save" : operation === "delete_block" ? "delete" : "move";
    error = "";

    try {
      const response = await fetch(
        "/api/app/help/content/" + encodeURIComponent(contentId) + "/review",
        {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ operation, targetId: block.id, ...changes }),
        },
      );
      const payload = await response.json().catch(() => ({})) as ReviewResponse;
      if (!response.ok || !payload.success || !payload.content) {
        error = payload.message || "Não foi possível atualizar este bloco.";
        return false;
      }

      if (editing) {
        editing = false;
        dispatch("editing", { active: false });
      }
      dispatch("updated", { content: payload.content });
      return true;
    } catch {
      error = "A conexão foi interrompida. Tente novamente.";
      return false;
    } finally {
      busy = null;
    }
  }

  async function saveChanges(): Promise<void> {
    if (!editing || !canEdit || busy) return;

    if (block.blockType === "text" || block.blockType === "notice") {
      await requestUpdate("update_block", {
        textContent: draftText,
        ...(block.blockType === "notice" ? { noticeVariant: draftVariant } : {}),
      });
      return;
    }
    if (block.blockType === "link") {
      await requestUpdate("update_block", {
        linkLabel: draftLinkLabel,
        linkUrl: draftLinkUrl,
      });
      return;
    }
    await requestUpdate("update_block", {
      sourceUrl: block.asset?.storageKey ? (block.asset.sourceUrl ?? "") : draftSourceUrl,
      altText: draftAltText,
      assistantDescription: draftAssistantDescription,
      extractedText: draftExtractedText,
      ...(block.blockType === "file" ? { linkLabel: draftLinkLabel } : {}),
    });
  }

  async function removeBlock(): Promise<void> {
    if (editing || busy || !canEdit || !canStartEdit()) return;
    if (!window.confirm("Excluir este bloco do conteúdo?")) return;
    await requestUpdate("delete_block");
  }

  async function moveBlock(direction: "up" | "down"): Promise<void> {
    if (editing || busy || !canEdit || !canStartEdit()) return;
    await requestUpdate("move_block", { direction });
  }
</script>

<div class="group/block rounded-xl border border-transparent p-1 transition hover:border-[#E2E5ED]">
  {#if !editing || block.blockType === "image" || block.blockType === "file"}
    <slot />
  {/if}

  {#if editing}
    <form on:submit|preventDefault={saveChanges} class="mt-2 space-y-3 rounded-xl border border-[#C9CFF0] bg-[#FAFBFF] p-4">
      {#if block.blockType === "text" || block.blockType === "notice"}
        <div class="flex flex-wrap items-center gap-1">
          <button type="button" on:click={() => wrapSelection("**")} class="rounded-lg p-2 text-[#4E5668] hover:bg-white" aria-label="Negrito" title="Negrito"><Bold size={15}/></button>
          <button type="button" on:click={() => wrapSelection("*")} class="rounded-lg p-2 text-[#4E5668] hover:bg-white" aria-label="Itálico" title="Itálico"><Italic size={15}/></button>
          <button type="button" on:click={() => wrapSelection("\x60")} class="rounded-lg p-2 text-[#4E5668] hover:bg-white" aria-label="Código" title="Código"><Code2 size={15}/></button>
          <button type="button" on:click={prefixLines} class="rounded-lg p-2 text-[#4E5668] hover:bg-white" aria-label="Lista" title="Lista"><List size={15}/></button>
        </div>
        <textarea
          bind:this={textarea}
          bind:value={draftText}
          required
          maxlength="50000"
          rows={block.blockType === "text" ? 6 : 4}
          class="w-full resize-y rounded-xl border border-[#DDE1EA] bg-white px-3 py-2.5 text-[13px] leading-6 outline-none focus:border-[#000A57]"
          aria-label="Conteúdo do bloco"
        ></textarea>
        {#if block.blockType === "notice"}
          <label class="block text-[12px] font-semibold text-[#4E5668]">Tipo de aviso
            <select bind:value={draftVariant} class="mt-1 w-full rounded-lg border border-[#DDE1EA] bg-white px-3 py-2 text-[13px]">
              <option value="info">Informação</option>
              <option value="warning">Atenção</option>
              <option value="success">Sucesso</option>
              <option value="danger">Importante</option>
            </select>
          </label>
        {/if}
        <div class="rounded-lg border border-[#DDE1EA] bg-white p-3">
          <HelpRichText text={draftText} className="text-[13px] leading-6 text-[#505767]"/>
        </div>
      {:else if block.blockType === "link"}
        <label class="block text-[12px] font-semibold text-[#4E5668]">Texto do link
          <input bind:value={draftLinkLabel} required maxlength="240" class="mt-1 w-full rounded-lg border border-[#DDE1EA] bg-white px-3 py-2 text-[13px]"/>
        </label>
        <label class="block text-[12px] font-semibold text-[#4E5668]">Endereço
          <input bind:value={draftLinkUrl} required type="url" maxlength="2000" class="mt-1 w-full rounded-lg border border-[#DDE1EA] bg-white px-3 py-2 text-[13px]"/>
        </label>
        {#if validHttpUrl(draftLinkUrl)}
          <a href={draftLinkUrl} target="_blank" rel="noopener noreferrer" class="inline-flex items-center gap-2 rounded-lg bg-white px-3 py-2 text-[13px] font-semibold text-[#000A57]">{draftLinkLabel || "Abrir link"}</a>
        {/if}
      {:else}
        {#if !block.asset?.storageKey}
          <label class="block text-[12px] font-semibold text-[#4E5668]">URL do arquivo ou imagem
            <input bind:value={draftSourceUrl} type="url" maxlength="2000" class="mt-1 w-full rounded-lg border border-[#DDE1EA] bg-white px-3 py-2 text-[13px]"/>
          </label>
          {#if block.blockType === "image" && validHttpUrl(draftSourceUrl) && draftSourceUrl !== block.asset?.sourceUrl}
            <img src={draftSourceUrl} alt={draftAltText || "Prévia da imagem"} class="max-h-[320px] max-w-full rounded-lg object-contain"/>
          {/if}
        {/if}
        {#if block.blockType === "file"}
          <label class="block text-[12px] font-semibold text-[#4E5668]">Nome do arquivo
            <input bind:value={draftLinkLabel} maxlength="240" class="mt-1 w-full rounded-lg border border-[#DDE1EA] bg-white px-3 py-2 text-[13px]"/>
          </label>
        {/if}
        <label class="block text-[12px] font-semibold text-[#4E5668]">Texto alternativo
          <input bind:value={draftAltText} maxlength="500" class="mt-1 w-full rounded-lg border border-[#DDE1EA] bg-white px-3 py-2 text-[13px]"/>
        </label>
        <label class="block text-[12px] font-semibold text-[#4E5668]">Descrição para IA
          <textarea bind:value={draftAssistantDescription} maxlength="20000" rows="3" class="mt-1 w-full rounded-lg border border-[#DDE1EA] bg-white px-3 py-2 text-[13px]"></textarea>
        </label>
        <label class="block text-[12px] font-semibold text-[#4E5668]">Texto extraído
          <textarea bind:value={draftExtractedText} maxlength="200000" rows="3" class="mt-1 w-full rounded-lg border border-[#DDE1EA] bg-white px-3 py-2 text-[13px]"></textarea>
        </label>
      {/if}

      {#if error}
        <p role="alert" class="text-[12px] font-medium text-[#9B2C2C]">{error}</p>
      {/if}
      <div class="flex justify-end gap-2">
        <button type="button" on:click={cancelEdit} disabled={Boolean(busy)} class="inline-flex min-h-9 items-center gap-1.5 rounded-lg border border-[#DDE1EA] bg-white px-3 text-[12px] font-semibold text-[#626979]"><X size={14}/>Cancelar</button>
        <button type="submit" disabled={Boolean(busy)} class="inline-flex min-h-9 items-center gap-1.5 rounded-lg bg-[#000A57] px-3 text-[12px] font-semibold text-white disabled:opacity-50">
          {#if busy === "save"}<LoaderCircle size={14} class="animate-spin"/>{:else}<Check size={14}/>{/if}Salvar bloco
        </button>
      </div>
    </form>
  {/if}

  {#if canEdit && !editing}
    <div class="mt-2 flex items-center justify-end gap-1.5 border-b border-[#EEF0F5] pb-2">
      {#if error}
        <span role="alert" class="mr-auto text-[12px] font-medium text-[#9B2C2C]">{error}</span>
      {/if}
      <button type="button" on:click={beginEdit} disabled={Boolean(busy)} class="inline-flex h-9 items-center gap-1.5 rounded-lg border border-[#DDE1EA] bg-white px-3 text-[12px] font-semibold text-[#000A57] disabled:opacity-50" aria-label="Editar bloco" title="Editar bloco"><Pencil size={14}/>Editar</button>
      <button type="button" on:click={() => moveBlock("up")} disabled={Boolean(busy) || blockIndex === 0} class="flex h-9 w-9 items-center justify-center rounded-lg border border-[#DDE1EA] text-[#606777] disabled:opacity-35" aria-label="Mover bloco para cima" title="Mover para cima"><ArrowUp size={14}/></button>
      <button type="button" on:click={() => moveBlock("down")} disabled={Boolean(busy) || blockIndex >= blockCount - 1} class="flex h-9 w-9 items-center justify-center rounded-lg border border-[#DDE1EA] text-[#606777] disabled:opacity-35" aria-label="Mover bloco para baixo" title="Mover para baixo"><ArrowDown size={14}/></button>
      <button type="button" on:click={removeBlock} disabled={Boolean(busy)} class="flex h-9 w-9 items-center justify-center rounded-lg border border-[#F0C8C8] bg-white text-[#9B2C2C] disabled:opacity-50" aria-label="Excluir bloco" title="Excluir bloco"><Trash2 size={14}/></button>
    </div>
  {/if}
</div>