<script lang="ts">
  import IframeF10MarkdownTokens from "$lib/components/iframef10/IframeF10MarkdownTokens.svelte";

  type Token = {
    type: "text" | "strong" | "emphasis" | "link";
    value: string;
    href?: string;
  };

  type Line = {
    type: "blank" | "heading1" | "heading2" | "heading3" | "paragraph" | "bullet" | "ordered" | "quote";
    marker?: string;
    tokens: Token[];
  };

  export let text = "";

  function safeHref(value: string): string | null {
    const href = value.trim();
    if (href.startsWith("/")) return href;
    try {
      const url = new URL(href);
      return url.protocol === "http:" || url.protocol === "https:" ? url.toString() : null;
    } catch {
      return null;
    }
  }

  function inlineTokens(value: string): Token[] {
    const tokens: Token[] = [];
    const pattern = /(\[([^\]]+)\]\(([^)\s]+)\))|(\*\*([^*]+)\*\*)|(\*([^*]+)\*)/g;
    let cursor = 0;
    let match: RegExpExecArray | null;

    while ((match = pattern.exec(value)) !== null) {
      if (match.index > cursor) tokens.push({ type: "text", value: value.slice(cursor, match.index) });

      if (match[2] !== undefined && match[3] !== undefined) {
        const href = safeHref(match[3]);
        tokens.push(
          href
            ? { type: "link", value: match[2], href }
            : { type: "text", value: match[0] },
        );
      } else if (match[5] !== undefined) {
        tokens.push({ type: "strong", value: match[5] });
      } else if (match[7] !== undefined) {
        tokens.push({ type: "emphasis", value: match[7] });
      }

      cursor = match.index + match[0].length;
    }

    if (cursor < value.length) tokens.push({ type: "text", value: value.slice(cursor) });
    return tokens.length ? tokens : [{ type: "text", value }];
  }

  function parseLine(value: string): Line {
    const trimmed = value.trim();
    if (!trimmed) return { type: "blank", tokens: [] };

    const h3 = trimmed.match(/^###\s+(.+)$/);
    if (h3) return { type: "heading3", tokens: inlineTokens(h3[1] ?? "") };
    const h2 = trimmed.match(/^##\s+(.+)$/);
    if (h2) return { type: "heading2", tokens: inlineTokens(h2[1] ?? "") };
    const h1 = trimmed.match(/^#\s+(.+)$/);
    if (h1) return { type: "heading1", tokens: inlineTokens(h1[1] ?? "") };

    const bullet = trimmed.match(/^[-*]\s+(.+)$/);
    if (bullet) return { type: "bullet", marker: "•", tokens: inlineTokens(bullet[1] ?? "") };

    const ordered = trimmed.match(/^(\d+)[.)]\s+(.+)$/);
    if (ordered) {
      return {
        type: "ordered",
        marker: String(ordered[1]) + ".",
        tokens: inlineTokens(ordered[2] ?? ""),
      };
    }

    const quote = trimmed.match(/^>\s*(.+)$/);
    if (quote) return { type: "quote", tokens: inlineTokens(quote[1] ?? "") };

    return { type: "paragraph", tokens: inlineTokens(value) };
  }

  $: lines = text.replace(/\r/g, "").split("\n").map(parseLine);
</script>

<div class="space-y-2">
  {#each lines as line}
    {#if line.type === "blank"}
      <div class="h-1" aria-hidden="true"></div>
    {:else if line.type === "heading1"}
      <h2 class="pt-3 text-[20px] font-semibold tracking-[-0.02em] text-[#252C3D]"><IframeF10MarkdownTokens tokens={line.tokens}/></h2>
    {:else if line.type === "heading2"}
      <h3 class="pt-2 text-[17px] font-semibold text-[#303746]"><IframeF10MarkdownTokens tokens={line.tokens}/></h3>
    {:else if line.type === "heading3"}
      <h4 class="pt-1 text-[14px] font-semibold text-[#3D4452]"><IframeF10MarkdownTokens tokens={line.tokens}/></h4>
    {:else if line.type === "bullet" || line.type === "ordered"}
      <div class="flex items-start gap-2 text-[13px] leading-7 text-[#555D6C]">
        <span class="min-w-4 shrink-0 font-semibold text-[#000A57]">{line.marker}</span>
        <span><IframeF10MarkdownTokens tokens={line.tokens}/></span>
      </div>
    {:else if line.type === "quote"}
      <blockquote class="border-l-4 border-[#C9CFF3] bg-[#F8F9FF] px-4 py-3 text-[13px] leading-7 text-[#555D6C]"><IframeF10MarkdownTokens tokens={line.tokens}/></blockquote>
    {:else}
      <p class="text-[13px] leading-7 text-[#555D6C]"><IframeF10MarkdownTokens tokens={line.tokens}/></p>
    {/if}
  {/each}
</div>
