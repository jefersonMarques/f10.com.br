<script lang="ts">
  import { ArrowUpRight } from "lucide-svelte";

  type InlineToken = {
    type: "text" | "strong" | "emphasis" | "code" | "link";
    value: string;
    href?: string;
  };

  type RichLine = {
    type: "blank" | "paragraph" | "bullet" | "ordered";
    marker: string;
    tokens: InlineToken[];
  };

  export let text = "";
  export let className = "";

  function helpHref(value: string): string {
    return value.replace(/^https?:\/\/(?:www\.)?f10\.com\.br/i, "");
  }

  function inlineTokens(value: string): InlineToken[] {
    const tokens: InlineToken[] = [];
    const pattern = /(\[([^\]]+)\]\(((?:https?:\/\/(?:www\.)?f10\.com\.br)?\/ajuda-f10(?:\/[^)\s]*)?)\))|((?:https?:\/\/(?:www\.)?f10\.com\.br)?\/ajuda-f10(?:\/[^\s)\],;!?]*)?(?:#[^\s)\],;!?]*)?)|(\*\*([^*]+)\*\*)|(\*([^*]+)\*)|(`([^`]+)`)/gi;
    let cursor = 0;
    let match: RegExpExecArray | null;

    while ((match = pattern.exec(value)) !== null) {
      if (match.index > cursor) {
        tokens.push({ type: "text", value: value.slice(cursor, match.index) });
      }
      if (match[2] !== undefined && match[3] !== undefined) {
        tokens.push({ type: "link", value: "Ver artigo", href: helpHref(match[3]) });
      } else if (match[4] !== undefined) {
        tokens.push({ type: "link", value: "Ver artigo", href: helpHref(match[4]) });
      } else if (match[6] !== undefined) tokens.push({ type: "strong", value: match[6] });
      else if (match[8] !== undefined) tokens.push({ type: "emphasis", value: match[8] });
      else if (match[10] !== undefined) tokens.push({ type: "code", value: match[10] });
      cursor = match.index + match[0].length;
    }

    if (cursor < value.length) tokens.push({ type: "text", value: value.slice(cursor) });
    return tokens.length > 0 ? tokens : [{ type: "text", value }];
  }

  function parseLine(value: string): RichLine {
    const trimmed = value.trim();
    if (!trimmed) return { type: "blank", marker: "", tokens: [] };

    const rawHelpReference = trimmed.match(
      /^(?:(?:trecho de )?referência|referencia|fonte)?\s*:?\s*((?:https?:\/\/(?:www\.)?f10\.com\.br)?\/ajuda-f10(?:\/\S*)?)$/i,
    );
    if (rawHelpReference?.[1]) {
      return {
        type: "paragraph",
        marker: "",
        tokens: [{ type: "link", value: "Ver artigo", href: helpHref(rawHelpReference[1]) }],
      };
    }

    const bullet = trimmed.match(/^[-•]\s+(.+)$/);
    if (bullet) return { type: "bullet", marker: "•", tokens: inlineTokens(bullet[1] ?? "") };

    const ordered = trimmed.match(/^(\d+)[.)]\s+(.+)$/);
    if (ordered) {
      return {
        type: "ordered",
        marker: `${ordered[1]}.`,
        tokens: inlineTokens(ordered[2] ?? ""),
      };
    }

    return { type: "paragraph", marker: "", tokens: inlineTokens(value) };
  }

  $: lines = text.replace(/\r/g, "").split("\n").map(parseLine);
</script>

<div class={className}>
  {#each lines as line}
    {#if line.type === "blank"}
      <div class="h-2" aria-hidden="true"></div>
    {:else if line.type === "bullet" || line.type === "ordered"}
      <div class="flex items-start gap-2">
        <span class="mt-[1px] min-w-4 shrink-0 font-semibold">{line.marker}</span>
        <span class="min-w-0">
          {#each line.tokens as token}
            {#if token.type === "strong"}<strong class="font-semibold text-current">{token.value}</strong>{:else if token.type === "emphasis"}<em>{token.value}</em>{:else if token.type === "code"}<code class="rounded-md border border-[#D8DDF4] bg-[#F2F3FF] px-1.5 py-0.5 font-sans text-[0.9em] font-semibold text-[#000A57]">{token.value}</code>{:else if token.type === "link"}<a href={token.href} class="mx-1 inline-flex items-center gap-1.5 rounded-lg bg-[#000A57] px-3 py-1.5 text-[0.92em] font-semibold text-white no-underline transition hover:bg-[#101C73]">Ver artigo<ArrowUpRight size={13}/></a>{:else}{token.value}{/if}
          {/each}
        </span>
      </div>
    {:else}
      <p>
        {#each line.tokens as token}
          {#if token.type === "strong"}<strong class="font-semibold text-current">{token.value}</strong>{:else if token.type === "emphasis"}<em>{token.value}</em>{:else if token.type === "code"}<code class="rounded-md border border-[#D8DDF4] bg-[#F2F3FF] px-1.5 py-0.5 font-sans text-[0.9em] font-semibold text-[#000A57]">{token.value}</code>{:else if token.type === "link"}<a href={token.href} class="mx-1 inline-flex items-center gap-1.5 rounded-lg bg-[#000A57] px-3 py-1.5 text-[0.92em] font-semibold text-white no-underline transition hover:bg-[#101C73]">Ver artigo<ArrowUpRight size={13}/></a>{:else}{token.value}{/if}
        {/each}
      </p>
    {/if}
  {/each}
</div>
