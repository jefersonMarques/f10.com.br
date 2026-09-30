<script lang="ts">
  import { onMount, tick } from "svelte";
  import {
    Bold,
    Code2,
    Heading2,
    Italic,
    Link2,
    List,
    ListOrdered,
    Quote,
    Type,
  } from "lucide-svelte";

  export let name = "bodyMarkdown";
  export let value = "";
  export let rows = 10;
  export let placeholder = "";
  export let required = false;
  export let maxlength = 50_000;

  let visualEditor: HTMLDivElement;
  let markdownEditor: HTMLTextAreaElement;
  let mode: "visual" | "markdown" = "visual";
  let visualReady = false;

  function escapeHtml(input: string): string {
    return input
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function safeHref(input: string): string | null {
    const href = input.trim();
    if (href.startsWith("/")) return href;

    try {
      const url = new URL(href);
      return url.protocol === "http:" || url.protocol === "https:" ? url.toString() : null;
    } catch {
      return null;
    }
  }

  function inlineMarkdownToHtml(input: string): string {
    let output = escapeHtml(input);

    output = output.replace(
      /\[([^\]]+)\]\(([^)\s]+)\)/g,
      (_match, label: string, href: string) => {
        const safe = safeHref(href);
        return safe
          ? '<a href="' + escapeHtml(safe) + '">' + label + "</a>"
          : label;
      },
    );

    output = output.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
    output = output.replace(/\*([^*]+)\*/g, "<em>$1</em>");
    return output;
  }

  function markdownToHtml(markdown: string): string {
    const lines = markdown.replace(/\r/g, "").split("\n");
    const html: string[] = [];
    let listType: "ul" | "ol" | null = null;

    function closeList(): void {
      if (!listType) return;
      html.push("</" + listType + ">");
      listType = null;
    }

    for (const rawLine of lines) {
      const line = rawLine.trim();

      if (!line) {
        closeList();
        html.push("<p><br></p>");
        continue;
      }

      const heading = line.match(/^(#{1,3})\s+(.+)$/);
      if (heading) {
        closeList();
        const level = Math.min(heading[1]?.length ?? 2, 3);
        html.push("<h" + level + ">" + inlineMarkdownToHtml(heading[2] ?? "") + "</h" + level + ">");
        continue;
      }

      const bullet = line.match(/^[-*]\s+(.+)$/);
      if (bullet) {
        if (listType !== "ul") {
          closeList();
          listType = "ul";
          html.push("<ul>");
        }
        html.push("<li>" + inlineMarkdownToHtml(bullet[1] ?? "") + "</li>");
        continue;
      }

      const ordered = line.match(/^\d+[.)]\s+(.+)$/);
      if (ordered) {
        if (listType !== "ol") {
          closeList();
          listType = "ol";
          html.push("<ol>");
        }
        html.push("<li>" + inlineMarkdownToHtml(ordered[1] ?? "") + "</li>");
        continue;
      }

      const quote = line.match(/^>\s*(.+)$/);
      if (quote) {
        closeList();
        html.push("<blockquote>" + inlineMarkdownToHtml(quote[1] ?? "") + "</blockquote>");
        continue;
      }

      closeList();
      html.push("<p>" + inlineMarkdownToHtml(rawLine) + "</p>");
    }

    closeList();
    return html.join("");
  }

  function inlineNodeToMarkdown(node: Node): string {
    if (node.nodeType === Node.TEXT_NODE) return node.textContent ?? "";
    if (!(node instanceof HTMLElement)) return "";

    const tag = node.tagName.toLowerCase();
    const content = Array.from(node.childNodes).map(inlineNodeToMarkdown).join("");

    if (tag === "strong" || tag === "b") return "**" + content + "**";
    if (tag === "em" || tag === "i") return "*" + content + "*";
    if (tag === "a") {
      const href = safeHref(node.getAttribute("href") ?? "");
      return href ? "[" + content + "](" + href + ")" : content;
    }
    if (tag === "br") return "\n";
    return content;
  }

  function blockToMarkdown(node: Node, orderedIndex = 1): string {
    if (node.nodeType === Node.TEXT_NODE) return (node.textContent ?? "").trim();
    if (!(node instanceof HTMLElement)) return "";

    const tag = node.tagName.toLowerCase();

    if (tag === "ul") {
      return Array.from(node.children)
        .map((item) => "- " + inlineNodeToMarkdown(item).trim())
        .join("\n");
    }

    if (tag === "ol") {
      return Array.from(node.children)
        .map((item, index) => String(index + 1) + ". " + inlineNodeToMarkdown(item).trim())
        .join("\n");
    }

    if (tag === "li") {
      return String(orderedIndex) + ". " + inlineNodeToMarkdown(node).trim();
    }

    if (tag === "h1") return "# " + inlineNodeToMarkdown(node).trim();
    if (tag === "h2") return "## " + inlineNodeToMarkdown(node).trim();
    if (tag === "h3") return "### " + inlineNodeToMarkdown(node).trim();
    if (tag === "blockquote") return "> " + inlineNodeToMarkdown(node).trim();
    if (tag === "p" || tag === "div") return inlineNodeToMarkdown(node).trim();

    return inlineNodeToMarkdown(node).trim();
  }

  function visualToMarkdown(): string {
    if (!visualEditor) return value;

    return Array.from(visualEditor.childNodes)
      .map((node) => blockToMarkdown(node))
      .filter((line, index, items) => line || (index > 0 && items[index - 1]))
      .join("\n\n")
      .replace(/\n{3,}/g, "\n\n")
      .trim();
  }

  function syncFromVisual(): void {
    value = visualToMarkdown().slice(0, maxlength);
  }

  async function switchMode(nextMode: "visual" | "markdown"): Promise<void> {
    if (mode === nextMode) return;

    if (mode === "visual") {
      syncFromVisual();
    }

    mode = nextMode;
    await tick();

    if (nextMode === "visual" && visualEditor) {
      visualEditor.innerHTML = markdownToHtml(value);
      visualEditor.focus();
    } else {
      markdownEditor?.focus();
    }
  }

  function runCommand(command: string, commandValue?: string): void {
    visualEditor?.focus();
    document.execCommand(command, false, commandValue);
    syncFromVisual();
  }

  function formatBlock(tag: "p" | "h2" | "blockquote"): void {
    runCommand("formatBlock", tag);
  }

  function addLink(): void {
    visualEditor?.focus();
    const selection = window.getSelection();
    const selectedText = selection?.toString().trim() ?? "";
    const href = window.prompt("Cole o endereço do link:", "https://");
    if (!href) return;

    const safe = safeHref(href);
    if (!safe) {
      window.alert("Informe um link http:// ou https:// válido.");
      return;
    }

    if (selectedText) {
      document.execCommand("createLink", false, safe);
    } else {
      const label = window.prompt("Texto do link:", "Saiba mais");
      if (!label) return;
      document.execCommand(
        "insertHTML",
        false,
        '<a href="' + escapeHtml(safe) + '">' + escapeHtml(label) + "</a>",
      );
    }

    syncFromVisual();
  }

  function handleVisualPaste(event: ClipboardEvent): void {
    const text = event.clipboardData?.getData("text/plain");
    if (text === undefined) return;

    event.preventDefault();
    document.execCommand("insertText", false, text);
    syncFromVisual();
  }

  function handleMarkdownShortcut(event: KeyboardEvent): void {
    if (!(event.ctrlKey || event.metaKey)) return;
    const key = event.key.toLowerCase();
    const start = markdownEditor?.selectionStart ?? 0;
    const end = markdownEditor?.selectionEnd ?? 0;

    if (key === "b") {
      event.preventDefault();
      const selected = value.slice(start, end) || "negrito";
      value = value.slice(0, start) + "**" + selected + "**" + value.slice(end);
    } else if (key === "i") {
      event.preventDefault();
      const selected = value.slice(start, end) || "itálico";
      value = value.slice(0, start) + "*" + selected + "*" + value.slice(end);
    }
  }

  onMount(() => {
    if (visualEditor) {
      visualEditor.innerHTML = markdownToHtml(value);
      visualReady = true;
    }
  });

  $: if (mode === "visual" && visualEditor && visualReady && !visualEditor.matches(":focus")) {
    const markdown = visualToMarkdown();
    if (markdown !== value) visualEditor.innerHTML = markdownToHtml(value);
  }
</script>

<div class="overflow-hidden rounded-xl border border-app-border-control bg-app-surface">
  <input type="hidden" {name} {value}/>

  <div class="flex min-h-11 flex-wrap items-center justify-between gap-2 border-b border-app-border-soft bg-app-subtle px-2 py-1.5">
    <div class="flex flex-wrap items-center gap-1">
      <button type="button" on:click={() => runCommand("bold")} class="flex h-8 w-8 items-center justify-center rounded-lg text-app-text-muted hover:bg-app-surface hover:text-app-primary" title="Negrito" aria-label="Negrito"><Bold size={14}/></button>
      <button type="button" on:click={() => runCommand("italic")} class="flex h-8 w-8 items-center justify-center rounded-lg text-app-text-muted hover:bg-app-surface hover:text-app-primary" title="Itálico" aria-label="Itálico"><Italic size={14}/></button>
      <span class="mx-0.5 h-5 w-px bg-app-border"></span>
      <button type="button" on:click={() => formatBlock("p")} class="flex h-8 w-8 items-center justify-center rounded-lg text-app-text-muted hover:bg-app-surface hover:text-app-primary" title="Texto normal" aria-label="Texto normal"><Type size={15}/></button>
      <button type="button" on:click={() => formatBlock("h2")} class="flex h-8 w-8 items-center justify-center rounded-lg text-app-text-muted hover:bg-app-surface hover:text-app-primary" title="Título" aria-label="Título"><Heading2 size={15}/></button>
      <button type="button" on:click={addLink} class="flex h-8 w-8 items-center justify-center rounded-lg text-app-text-muted hover:bg-app-surface hover:text-app-primary" title="Link" aria-label="Link"><Link2 size={14}/></button>
      <span class="mx-0.5 h-5 w-px bg-app-border"></span>
      <button type="button" on:click={() => runCommand("insertUnorderedList")} class="flex h-8 w-8 items-center justify-center rounded-lg text-app-text-muted hover:bg-app-surface hover:text-app-primary" title="Lista" aria-label="Lista"><List size={15}/></button>
      <button type="button" on:click={() => runCommand("insertOrderedList")} class="flex h-8 w-8 items-center justify-center rounded-lg text-app-text-muted hover:bg-app-surface hover:text-app-primary" title="Lista numerada" aria-label="Lista numerada"><ListOrdered size={15}/></button>
      <button type="button" on:click={() => formatBlock("blockquote")} class="flex h-8 w-8 items-center justify-center rounded-lg text-app-text-muted hover:bg-app-surface hover:text-app-primary" title="Citação" aria-label="Citação"><Quote size={14}/></button>
    </div>

    <button
      type="button"
      on:click={() => switchMode(mode === "visual" ? "markdown" : "visual")}
      class="inline-flex h-8 items-center gap-1.5 rounded-lg border border-app-border-control bg-app-surface px-2.5 text-[10px] font-semibold text-app-text-muted hover:text-app-primary"
      title={mode === "visual" ? "Editar Markdown" : "Voltar ao editor visual"}
    >
      <Code2 size={12}/>{mode === "visual" ? "Markdown" : "Visual"}
    </button>
  </div>

  {#if mode === "visual"}
    <div
      bind:this={visualEditor}
      contenteditable="true"
      role="textbox"
      aria-multiline="true"
      tabindex="0"
      data-placeholder={placeholder}
      on:input={syncFromVisual}
      on:blur={syncFromVisual}
      on:paste={handleVisualPaste}
      class="visual-editor min-h-[260px] w-full bg-app-surface px-4 py-4 text-[13px] leading-7 text-app-text outline-none"
    ></div>
  {:else}
    <textarea
      bind:this={markdownEditor}
      bind:value
      {rows}
      {placeholder}
      {required}
      {maxlength}
      on:keydown={handleMarkdownShortcut}
      class="block w-full resize-y border-0 bg-app-surface px-3 py-3 font-mono text-[12px] leading-6 text-app-text outline-none"
    ></textarea>
  {/if}
</div>

<style>
  .visual-editor:empty::before {
    color: var(--app-text-soft);
    content: attr(data-placeholder);
    pointer-events: none;
  }

  .visual-editor :global(h1),
  .visual-editor :global(h2),
  .visual-editor :global(h3) {
    color: var(--app-text);
    font-weight: 650;
    line-height: 1.35;
    margin: 0.8rem 0 0.35rem;
  }

  .visual-editor :global(h1) { font-size: 1.35rem; }
  .visual-editor :global(h2) { font-size: 1.15rem; }
  .visual-editor :global(h3) { font-size: 1rem; }

  .visual-editor :global(p) {
    margin: 0.35rem 0;
  }

  .visual-editor :global(ul),
  .visual-editor :global(ol) {
    margin: 0.45rem 0;
    padding-left: 1.5rem;
  }

  .visual-editor :global(ul) { list-style: disc; }
  .visual-editor :global(ol) { list-style: decimal; }

  .visual-editor :global(blockquote) {
    background: var(--app-surface-subtle);
    border-left: 4px solid var(--app-info-border);
    margin: 0.6rem 0;
    padding: 0.65rem 0.9rem;
  }

  .visual-editor :global(a) {
    color: var(--app-primary);
    font-weight: 600;
    text-decoration: underline;
    text-underline-offset: 2px;
  }
</style>
