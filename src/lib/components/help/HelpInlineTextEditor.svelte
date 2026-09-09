<script lang="ts">
  import {
    Bold,
    Check,
    Code2,
    Italic,
    List,
    ListOrdered,
    Pencil,
    X,
  } from "lucide-svelte";
  import { createEventDispatcher } from "svelte";
  import HelpRichText from "$lib/components/help/HelpRichText.svelte";

  export let contentId: string;
  export let operation:
    | "summary"
    | "quick_guide"
    | "step_title"
    | "step_description"
    | "block_text";
  export let targetId = "";
  export let text = "";
  export let canEdit = false;
  export let mode: "plain" | "rich" = "rich";
  export let className = "";
  export let rows = 4;
  export let placeholder = "";

  const dispatch = createEventDispatcher<{
    saved: { content: unknown; text: string };
    editing: { active: boolean };
  }>();

  let editing = false;
  let draft = text;
  let saving = false;
  let message = "";
  let textarea: HTMLTextAreaElement | null = null;
  let appliedText = text;

  $: if (!editing && text !== appliedText) {
    appliedText = text;
    draft = text;
  }

  function startEdit(): void {
    if (!canEdit) return;
    draft = text;
    message = "";
    editing = true;
    dispatch("editing", { active: true });
    queueMicrotask(() => textarea?.focus());
  }

  function cancelEdit(): void {
    draft = text;
    message = "";
    editing = false;
    dispatch("editing", { active: false });
  }

  function wrapSelection(prefix: string, suffix = prefix): void {
    if (!textarea) return;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selected = draft.slice(start, end);
    draft = draft.slice(0, start) + prefix + selected + suffix + draft.slice(end);
    queueMicrotask(() => {
      if (!textarea) return;
      textarea.focus();
      textarea.setSelectionRange(start + prefix.length, end + prefix.length);
    });
  }

  function prefixLines(prefix: string): void {
    if (!textarea) return;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const before = draft.slice(0, start);
    const selected = draft.slice(start, end) || draft.slice(start);
    const lineStart = before.lastIndexOf("\n") + 1;
    const selectedEnd = end > start ? end : draft.length;
    const segment = draft.slice(lineStart, selectedEnd);
    const lines = segment.split("\n");
    const transformed = lines
      .map((line, index) => prefix === "1. " ? `${index + 1}. ${line}` : `${prefix}${line}`)
      .join("\n");
    draft = draft.slice(0, lineStart) + transformed + draft.slice(selectedEnd);
    queueMicrotask(() => textarea?.focus());
  }

  async function save(): Promise<void> {
    if (saving || !canEdit) return;
    saving = true;
    message = "";
    try {
      const response = await fetch(`/api/app/help/content/${contentId}/review`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          operation,
          targetId,
          text: draft,
        }),
      });
      const payload = await response.json().catch(() => ({})) as {
        success?: boolean;
        message?: string;
        content?: unknown;
      };
      if (!response.ok || !payload.success) {
        message = payload.message || "Não foi possível salvar.";
        return;
      }
      appliedText = draft.trim();
      text = appliedText;
      editing = false;
      dispatch("editing", { active: false });
      dispatch("saved", { content: payload.content, text: appliedText });
    } catch {
      message = "Não foi possível salvar.";
    } finally {
      saving = false;
    }
  }
</script>

{#if editing}
  <div class="rounded-xl border border-[#C9CFF0] bg-white p-3 shadow-sm">
    <div class="mb-2 flex flex-wrap items-center gap-1">
      <button type="button" on:click={() => wrapSelection("**")} class="flex h-8 w-8 items-center justify-center rounded-lg text-[#4E5668] hover:bg-[#F2F4FA]" aria-label="Negrito" title="Negrito"><Bold size={14}/></button>
      <button type="button" on:click={() => wrapSelection("*")} class="flex h-8 w-8 items-center justify-center rounded-lg text-[#4E5668] hover:bg-[#F2F4FA]" aria-label="Itálico" title="Itálico"><Italic size={14}/></button>
      <button type="button" on:click={() => wrapSelection("`")} class="flex h-8 w-8 items-center justify-center rounded-lg text-[#4E5668] hover:bg-[#F2F4FA]" aria-label="Código" title="Código"><Code2 size={14}/></button>
      <span class="mx-1 h-5 w-px bg-[#E2E5ED]"></span>
      <button type="button" on:click={() => prefixLines("- ")} class="flex h-8 w-8 items-center justify-center rounded-lg text-[#4E5668] hover:bg-[#F2F4FA]" aria-label="Lista" title="Lista"><List size={14}/></button>
      <button type="button" on:click={() => prefixLines("1. ")} class="flex h-8 w-8 items-center justify-center rounded-lg text-[#4E5668] hover:bg-[#F2F4FA]" aria-label="Lista numerada" title="Lista numerada"><ListOrdered size={14}/></button>
    </div>
    <textarea bind:this={textarea} bind:value={draft} {rows} {placeholder} maxlength={operation === "summary" ? 320 : operation === "quick_guide" ? 12000 : operation === "step_description" ? 2000 : operation === "step_title" ? 180 : 50000} class="w-full resize-y rounded-xl border border-[#DDE1EA] bg-[#FAFAFC] px-3 py-2.5 text-[12px] leading-6 outline-none focus:border-[#000A57]"></textarea>
    {#if message}<p class="mt-2 text-[9px] font-medium text-[#9B2C2C]">{message}</p>{/if}
    <div class="mt-2 flex justify-end gap-1.5">
      <button type="button" on:click={cancelEdit} disabled={saving} class="flex h-9 w-9 items-center justify-center rounded-lg border border-[#DDE1EA] text-[#6D7483]" aria-label="Cancelar" title="Cancelar"><X size={14}/></button>
      <button type="button" on:click={save} disabled={saving || !draft.trim()} class="flex h-9 w-9 items-center justify-center rounded-lg bg-[#000A57] text-white disabled:opacity-40" aria-label="Salvar" title="Salvar"><Check size={15}/></button>
    </div>
  </div>
{:else}
  <div class="group/editor relative">
    {#if mode === "rich"}
      <HelpRichText {text} {className}/>
    {:else}
      <div class={className}>{text}</div>
    {/if}
    {#if canEdit}
      <button type="button" on:click={startEdit} class="absolute right-0 top-0 flex h-8 w-8 translate-x-1 -translate-y-1 items-center justify-center rounded-lg border border-[#DDE1EA] bg-white text-[#707787] opacity-100 shadow-sm transition hover:text-[#000A57] sm:opacity-0 sm:group-hover/editor:opacity-100" aria-label="Editar" title="Editar"><Pencil size={13}/></button>
    {/if}
  </div>
{/if}
