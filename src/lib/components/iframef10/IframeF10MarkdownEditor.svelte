<script lang="ts">
  import { tick } from "svelte";
  import {
    Bold,
    Eye,
    Heading2,
    Italic,
    Link2,
    List,
    ListOrdered,
    PenLine,
    Quote,
  } from "lucide-svelte";
  import IframeF10Markdown from "$lib/components/iframef10/IframeF10Markdown.svelte";

  export let name = "bodyMarkdown";
  export let value = "";
  export let rows = 10;
  export let placeholder = "";
  export let required = false;
  export let maxlength = 50_000;

  let textarea: HTMLTextAreaElement;
  let mode: "edit" | "preview" = "edit";

  async function focusSelection(start: number, end: number): Promise<void> {
    mode = "edit";
    await tick();
    textarea?.focus();
    textarea?.setSelectionRange(start, end);
  }

  async function wrapSelection(
    before: string,
    after: string,
    fallback: string,
  ): Promise<void> {
    if (!textarea) return;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selected = value.slice(start, end) || fallback;
    const replacement = before + selected + after;

    value = value.slice(0, start) + replacement + value.slice(end);
    await focusSelection(start + before.length, start + before.length + selected.length);
  }

  async function prefixLines(prefix: string): Promise<void> {
    if (!textarea) return;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const lineStart = value.lastIndexOf("\n", Math.max(start - 1, 0)) + 1;
    const nextBreak = value.indexOf("\n", end);
    const lineEnd = nextBreak === -1 ? value.length : nextBreak;
    const selected = value.slice(lineStart, lineEnd) || "texto";
    const replacement = selected
      .split("\n")
      .map((line) => prefix + line)
      .join("\n");

    value = value.slice(0, lineStart) + replacement + value.slice(lineEnd);
    await focusSelection(lineStart, lineStart + replacement.length);
  }

  async function addOrderedList(): Promise<void> {
    if (!textarea) return;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const lineStart = value.lastIndexOf("\n", Math.max(start - 1, 0)) + 1;
    const nextBreak = value.indexOf("\n", end);
    const lineEnd = nextBreak === -1 ? value.length : nextBreak;
    const selected = value.slice(lineStart, lineEnd) || "texto";
    const replacement = selected
      .split("\n")
      .map((line, index) => String(index + 1) + ". " + line)
      .join("\n");

    value = value.slice(0, lineStart) + replacement + value.slice(lineEnd);
    await focusSelection(lineStart, lineStart + replacement.length);
  }

  async function addLink(): Promise<void> {
    if (!textarea) return;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selected = value.slice(start, end) || "texto do link";
    const suffix = "](https://)";
    value = value.slice(0, start) + "[" + selected + suffix + value.slice(end);

    const urlStart = start + selected.length + 3;
    await focusSelection(urlStart, urlStart + 8);
  }

  function handleShortcut(event: KeyboardEvent): void {
    if (!(event.ctrlKey || event.metaKey)) return;
    const key = event.key.toLowerCase();

    if (key === "b") {
      event.preventDefault();
      void wrapSelection("**", "**", "negrito");
    } else if (key === "i") {
      event.preventDefault();
      void wrapSelection("*", "*", "itálico");
    } else if (key === "k") {
      event.preventDefault();
      void addLink();
    }
  }
</script>

<div class="overflow-hidden rounded-xl border border-app-border-control bg-app-surface">
  <input type="hidden" {name} {value}/>

  <div class="flex min-h-11 flex-wrap items-center justify-between gap-2 border-b border-app-border-soft bg-app-subtle px-2 py-1.5">
    <div class="flex flex-wrap items-center gap-1">
      <button type="button" on:click={() => wrapSelection("**", "**", "negrito")} class="flex h-8 w-8 items-center justify-center rounded-lg text-app-text-muted hover:bg-app-surface hover:text-app-primary" title="Negrito (Ctrl+B)" aria-label="Negrito"><Bold size={14}/></button>
      <button type="button" on:click={() => wrapSelection("*", "*", "itálico")} class="flex h-8 w-8 items-center justify-center rounded-lg text-app-text-muted hover:bg-app-surface hover:text-app-primary" title="Itálico (Ctrl+I)" aria-label="Itálico"><Italic size={14}/></button>
      <span class="mx-0.5 h-5 w-px bg-app-border"></span>
      <button type="button" on:click={() => prefixLines("## ")} class="flex h-8 w-8 items-center justify-center rounded-lg text-app-text-muted hover:bg-app-surface hover:text-app-primary" title="Título" aria-label="Título"><Heading2 size={15}/></button>
      <button type="button" on:click={addLink} class="flex h-8 w-8 items-center justify-center rounded-lg text-app-text-muted hover:bg-app-surface hover:text-app-primary" title="Link (Ctrl+K)" aria-label="Link"><Link2 size={14}/></button>
      <span class="mx-0.5 h-5 w-px bg-app-border"></span>
      <button type="button" on:click={() => prefixLines("- ")} class="flex h-8 w-8 items-center justify-center rounded-lg text-app-text-muted hover:bg-app-surface hover:text-app-primary" title="Lista" aria-label="Lista"><List size={15}/></button>
      <button type="button" on:click={addOrderedList} class="flex h-8 w-8 items-center justify-center rounded-lg text-app-text-muted hover:bg-app-surface hover:text-app-primary" title="Lista numerada" aria-label="Lista numerada"><ListOrdered size={15}/></button>
      <button type="button" on:click={() => prefixLines("> ")} class="flex h-8 w-8 items-center justify-center rounded-lg text-app-text-muted hover:bg-app-surface hover:text-app-primary" title="Citação" aria-label="Citação"><Quote size={14}/></button>
    </div>

    <div class="flex rounded-lg bg-app-muted p-1">
      <button type="button" on:click={() => (mode = "edit")} class={"inline-flex h-7 items-center gap-1.5 rounded-md px-2.5 text-[10px] font-semibold transition " + (mode === "edit" ? "bg-app-surface text-app-primary shadow-sm" : "text-app-text-soft")}><PenLine size={12}/>Editar</button>
      <button type="button" on:click={() => (mode = "preview")} class={"inline-flex h-7 items-center gap-1.5 rounded-md px-2.5 text-[10px] font-semibold transition " + (mode === "preview" ? "bg-app-surface text-app-primary shadow-sm" : "text-app-text-soft")}><Eye size={12}/>Visualizar</button>
    </div>
  </div>

  {#if mode === "edit"}
    <textarea
      bind:this={textarea}
      bind:value
      {rows}
      {placeholder}
      {required}
      {maxlength}
      on:keydown={handleShortcut}
      class="block w-full resize-y border-0 bg-app-surface px-3 py-3 font-mono text-[12px] leading-6 text-app-text outline-none"
    ></textarea>
  {:else}
    <div class="min-h-[240px] bg-white px-5 py-4">
      {#if value.trim()}
        <IframeF10Markdown text={value}/>
      {:else}
        <p class="py-10 text-center text-[11px] text-[#9298A5]">A visualização aparece aqui.</p>
      {/if}
    </div>
  {/if}
</div>
