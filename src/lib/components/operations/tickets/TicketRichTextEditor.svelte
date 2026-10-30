<script lang="ts">
  import { onDestroy, onMount, tick } from "svelte";
  import { tokenizeChatMarkdown } from "$lib/support/chatMarkdown";
  import { Bold, Code, Italic, Paperclip, Send, X } from "lucide-svelte";

  export let value = "";
  export let files: File[] = [];
  export let submitting = false;
  export let disabled = false;

  let editor: HTMLDivElement;
  let fileInput: HTMLInputElement;
  let lastValue = "";
  const imageUrls = new Map<string, string>();

  function fileKey(file: File): string {
    return [file.name, file.size, file.lastModified].join(":");
  }

  function serialize(node: Node): string {
    if (node.nodeType === Node.TEXT_NODE) {
      return (node.textContent ?? "").replace(/\u200b/g, "");
    }
    if (node.nodeType !== Node.ELEMENT_NODE) return "";
    const element = node as HTMLElement;
    const tag = element.tagName.toLowerCase();
    if (tag === "img") return "";
    if (tag === "br") return "\n";
    const content = Array.from(element.childNodes).map(serialize).join("");
    if (tag === "strong" || tag === "b") return content.trim() ? "**" + content + "**" : content;
    if (tag === "em" || tag === "i") return content.trim() ? "*" + content + "*" : content;
    if (tag === "code") return content.trim() ? "\x60" + content.replace(/\x60/g, "") + "\x60" : content;
    if (tag === "div" || tag === "p") return content + "\n";
    return content;
  }

  function syncValue(): void {
    if (!editor) return;
    const presentImageKeys = new Set(Array.from(
      editor.querySelectorAll<HTMLImageElement>("img[data-ticket-file-key]"),
    ).map((image) => image.dataset.ticketFileKey ?? ""));
    let imagesRemoved = false;
    for (const [key, url] of imageUrls) {
      if (presentImageKeys.has(key)) continue;
      URL.revokeObjectURL(url);
      imageUrls.delete(key);
      files = files.filter((file) => fileKey(file) !== key);
      imagesRemoved = true;
    }
    if (imagesRemoved) syncFileInput();
    value = Array.from(editor.childNodes).map(serialize).join("")
      .replace(/\u00a0/g, " ")
      .replace(/\n{3,}/g, "\n\n")
      .trimEnd();
    lastValue = value;
  }

  function applyMarkdownShortcut(): void {
    const selection = window.getSelection();
    if (!selection?.rangeCount) return;
    const range = selection.getRangeAt(0);
    if (!range.collapsed || range.startContainer.nodeType !== Node.TEXT_NODE) return;
    const node = range.startContainer as Text;
    if (!editor.contains(node) || node.parentElement?.closest("strong, b, em, i, code")) return;
    const before = node.data.slice(0, range.startOffset);
    const match = before.match(/(?:^|\s)(\*\*([^*\n]+)\*\*|\*([^*\n]+)\*|`([^`\n]+)`)$/);
    if (!match) return;
    const tag = match[2] !== undefined ? "strong" : match[3] !== undefined ? "em" : "code";
    const text = match[2] ?? match[3] ?? match[4] ?? "";
    const formatted = document.createElement(tag);
    formatted.textContent = text;
    const segment = document.createRange();
    segment.setStart(node, range.startOffset - match[1].length);
    segment.setEnd(node, range.startOffset);
    segment.deleteContents();
    segment.insertNode(formatted);
    const caret = document.createRange();
    caret.setStartAfter(formatted);
    caret.collapse(true);
    selection.removeAllRanges();
    selection.addRange(caret);
  }

  function updateEditor(): void {
    applyMarkdownShortcut();
    syncValue();
  }

  function focusEditor(): void {
    editor?.focus();
  }

  function formatText(format: "bold" | "italic" | "code"): void {
    focusEditor();
    if (format !== "code") {
      document.execCommand(format, false);
    } else {
      const selection = window.getSelection();
      if (!selection?.rangeCount) return;
      const range = selection.getRangeAt(0);
      if (!editor.contains(range.commonAncestorContainer)) return;
      const code = document.createElement("code");
      code.className = "rounded bg-[var(--app-surface-muted)] px-1 font-mono";
      if (range.collapsed) {
        code.textContent = "\u200b";
        range.insertNode(code);
      } else {
        code.append(range.extractContents());
        range.insertNode(code);
      }
      range.selectNodeContents(code);
      range.collapse(false);
      selection.removeAllRanges();
      selection.addRange(range);
    }
    syncValue();
  }

  function formatShortcut(event: KeyboardEvent): void {
    if (!(event.ctrlKey || event.metaKey)) return;
    const key = event.key.toLowerCase();
    if (key !== "b" && key !== "i") return;
    event.preventDefault();
    formatText(key === "b" ? "bold" : "italic");
  }

  function insertPlainText(text: string): void {
    if (!text) return;
    focusEditor();
    document.execCommand("insertText", false, text);
  }

  function insertImage(file: File): void {
    const key = fileKey(file);
    if (!file.type.startsWith("image/") || imageUrls.has(key)) return;
    const url = URL.createObjectURL(file);
    imageUrls.set(key, url);
    const img = document.createElement("img");
    img.src = url;
    img.alt = file.name;
    img.dataset.ticketFileKey = key;
    img.contentEditable = "false";
    img.className = "my-2 max-h-52 max-w-full rounded-lg border border-[var(--app-border)] object-contain";
    focusEditor();
    const selection = window.getSelection();
    const range = selection?.rangeCount ? selection.getRangeAt(0) : null;
    if (range && editor.contains(range.commonAncestorContainer)) {
      range.deleteContents();
      range.insertNode(img);
      range.setStartAfter(img);
      range.collapse(true);
      selection?.removeAllRanges();
      selection?.addRange(range);
    } else {
      editor.append(img);
    }
  }

  function appendFiles(selected: File[]): void {
    if (!selected.length) return;
    const existing = new Map(files.map((file) => [fileKey(file), file]));
    for (const file of selected) existing.set(fileKey(file), file);
    files = Array.from(existing.values());
    for (const file of selected) insertImage(file);
    syncFileInput();
    syncValue();
  }

  function syncFileInput(): void {
    if (!fileInput) return;
    const transfer = new DataTransfer();
    for (const file of files) transfer.items.add(file);
    fileInput.files = transfer.files;
  }

  function handleFileSelection(event: Event): void {
    appendFiles(Array.from((event.currentTarget as HTMLInputElement).files ?? []));
  }

  function removeFile(file: File): void {
    const key = fileKey(file);
    files = files.filter((item) => fileKey(item) !== key);
    editor?.querySelectorAll<HTMLImageElement>("img[data-ticket-file-key]").forEach((image) => {
      if (image.dataset.ticketFileKey === key) image.remove();
    });
    const url = imageUrls.get(key);
    if (url) URL.revokeObjectURL(url);
    imageUrls.delete(key);
    syncFileInput();
    syncValue();
  }

  function pasteContent(event: ClipboardEvent): void {
    const pastedFiles = Array.from(event.clipboardData?.files ?? []);
    const text = event.clipboardData?.getData("text/plain") ?? "";
    event.preventDefault();
    insertPlainText(text);
    appendFiles(pastedFiles);
    syncValue();
  }

  function dropContent(event: DragEvent): void {
    event.preventDefault();
    const droppedFiles = Array.from(event.dataTransfer?.files ?? []);
    if (droppedFiles.length) appendFiles(droppedFiles);
    else insertPlainText(event.dataTransfer?.getData("text/plain") ?? "");
    syncValue();
  }

  $: if (editor && value === "" && lastValue !== "") {
    editor.replaceChildren();
    lastValue = "";
  }

  $: if (editor && files.length === 0 && imageUrls.size > 0) {
    for (const url of imageUrls.values()) URL.revokeObjectURL(url);
    imageUrls.clear();
    editor.querySelectorAll("img[data-ticket-file-key]").forEach((image) => image.remove());
    void tick().then(syncFileInput);
  }

  onMount(() => {
    if (value.trim()) {
      for (const line of value.split("\n")) {
        const paragraph = document.createElement("div");
        for (const token of tokenizeChatMarkdown(line)) {
          let tag: "strong" | "em" | "code" | null = null;
          if (token.kind === "strong") tag = "strong";
          if (token.kind === "emphasis") tag = "em";
          if (token.kind === "code") tag = "code";
          if (tag) {
            const formatted = document.createElement(tag);
            formatted.textContent = token.text;
            paragraph.append(formatted);
          } else {
            paragraph.append(document.createTextNode(token.text));
          }
        }
        editor.append(paragraph);
      }
      lastValue = value;
    }
    for (const file of files) {
      if (file.type.startsWith("image/")) insertImage(file);
    }
    syncFileInput();
  });

  onDestroy(() => {
    for (const url of imageUrls.values()) URL.revokeObjectURL(url);
    imageUrls.clear();
  });
</script>

<div class="w-full min-w-0" aria-label="Editor visual da resposta">
  <div class="flex items-center gap-1 border-b border-[var(--app-border-soft)] pb-2">
    <button type="button" on:mousedown|preventDefault on:click={() => formatText("bold")} title="Negrito (Ctrl+B)" aria-label="Negrito"
      class="flex h-9 w-9 items-center justify-center rounded-lg text-[var(--app-text-muted)] hover:bg-[var(--app-surface-muted)]"><Bold size={16}/></button>
    <button type="button" on:mousedown|preventDefault on:click={() => formatText("italic")} title="Itálico (Ctrl+I)" aria-label="Itálico"
      class="flex h-9 w-9 items-center justify-center rounded-lg text-[var(--app-text-muted)] hover:bg-[var(--app-surface-muted)]"><Italic size={16}/></button>
    <button type="button" on:mousedown|preventDefault on:click={() => formatText("code")} title="Código" aria-label="Código"
      class="flex h-9 w-9 items-center justify-center rounded-lg text-[var(--app-text-muted)] hover:bg-[var(--app-surface-muted)]"><Code size={16}/></button>
  </div>

  <div bind:this={editor} contenteditable={!disabled && !submitting}
    role="textbox" aria-label="Mensagem formatada" aria-multiline="true" data-placeholder="Escreva uma resposta..."
    on:input={updateEditor} on:keydown={formatShortcut} on:paste={pasteContent}
    on:drop={dropContent} on:dragover|preventDefault={() => undefined}
    class="ticket-rich-editor mt-2 min-h-[105px] max-h-[320px] w-full overflow-y-auto break-words rounded-lg px-2 py-2 text-[14px] leading-6 text-[var(--app-text)] outline-none focus:ring-1 focus:ring-[var(--app-primary)]"
  ></div>
  <input name="body" type="hidden" value={value}/>
  <div class="mt-2 flex flex-wrap gap-2">
    {#each files as file (fileKey(file))}
      <span class="application-text-caption inline-flex max-w-[240px] items-center gap-1.5 rounded-lg bg-[var(--app-surface-muted)] px-2.5 py-1.5 text-[var(--app-text)]">
        <Paperclip size={13}/><span class="truncate">{file.name}</span>
        <button type="button" on:click={() => removeFile(file)} aria-label={`Remover ${file.name}`} class="rounded p-0.5 hover:bg-[var(--app-border)]"><X size={13}/></button>
      </span>
    {/each}
  </div>
  <div class="mt-2 flex items-center justify-end gap-2 border-t border-[var(--app-border-soft)] pt-2">
    <input bind:this={fileInput} name="files" type="file" multiple accept="image/png,image/jpeg,image/webp,.pdf,.docx,.xlsx,.zip,.txt,.csv"
      class="sr-only" on:change={handleFileSelection}/>
    <button type="button" on:click={() => fileInput?.click()} title="Anexar arquivo ou imagem" aria-label="Anexar arquivo ou imagem"
      class="flex h-9 w-9 items-center justify-center rounded-lg text-[var(--app-text-muted)] hover:bg-[var(--app-surface-muted)] hover:text-[var(--app-primary)]"><Paperclip size={18}/></button>
    <button type="submit" disabled={disabled || submitting || files.length > 4 || files.reduce((total, file) => total + file.size, 0) > 12 * 1024 * 1024 || (value.trim().length === 0 && files.length === 0) || value.length > 10000}
      class="application-text-caption flex h-10 items-center gap-2 rounded-lg bg-[var(--app-primary)] px-4 font-semibold text-white disabled:opacity-50">
      <Send size={16}/>{submitting ? "Enviando..." : "Enviar"}
    </button>
  </div>
  {#if files.length > 4 || files.reduce((total, file) => total + file.size, 0) > 12 * 1024 * 1024}
    <p role="alert" class="application-text-caption mt-2 text-[var(--app-danger-text)]">Máximo de 4 arquivos e 12 MB por mensagem.</p>
  {/if}
</div>

<style>
  .ticket-rich-editor:empty::before {
    content: attr(data-placeholder);
    color: var(--app-text-muted);
    pointer-events: none;
  }
  .ticket-rich-editor :global(strong),
  .ticket-rich-editor :global(b) { font-weight: 700; }
  .ticket-rich-editor :global(em),
  .ticket-rich-editor :global(i) { font-style: italic; }
  .ticket-rich-editor :global(code) {
    border-radius: 4px;
    background: var(--app-surface-muted);
    padding: 0 4px;
    font-family: monospace;
  }
  .ticket-rich-editor :global(img) {
    display: block;
    max-width: 100%;
    max-height: 240px;
    margin: 8px 0;
    border-radius: 8px;
    object-fit: contain;
  }
</style>
