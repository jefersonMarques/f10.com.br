<script lang="ts">
  type InlineToken = {
    type: "text" | "strong" | "emphasis" | "code";
    value: string;
  };

  type RichLine = {
    type: "blank" | "paragraph" | "bullet" | "ordered";
    marker: string;
    tokens: InlineToken[];
  };

  export let text = "";
  export let className = "";

  function inlineTokens(value: string): InlineToken[] {
    const tokens: InlineToken[] = [];
    const pattern = /(\*\*([^*]+)\*\*)|(\*([^*]+)\*)|(`([^`]+)`)/g;
    let cursor = 0;
    let match: RegExpExecArray | null;

    while ((match = pattern.exec(value)) !== null) {
      if (match.index > cursor) {
        tokens.push({ type: "text", value: value.slice(cursor, match.index) });
      }
      if (match[2] !== undefined) tokens.push({ type: "strong", value: match[2] });
      else if (match[4] !== undefined) tokens.push({ type: "emphasis", value: match[4] });
      else if (match[6] !== undefined) tokens.push({ type: "code", value: match[6] });
      cursor = match.index + match[0].length;
    }

    if (cursor < value.length) tokens.push({ type: "text", value: value.slice(cursor) });
    return tokens.length > 0 ? tokens : [{ type: "text", value }];
  }

  function parseLine(value: string): RichLine {
    const trimmed = value.trim();
    if (!trimmed) return { type: "blank", marker: "", tokens: [] };

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
            {#if token.type === "strong"}<strong class="font-semibold text-current">{token.value}</strong>{:else if token.type === "emphasis"}<em>{token.value}</em>{:else if token.type === "code"}<code class="rounded bg-black/5 px-1 py-0.5 font-mono text-[0.9em]">{token.value}</code>{:else}{token.value}{/if}
          {/each}
        </span>
      </div>
    {:else}
      <p>
        {#each line.tokens as token}
          {#if token.type === "strong"}<strong class="font-semibold text-current">{token.value}</strong>{:else if token.type === "emphasis"}<em>{token.value}</em>{:else if token.type === "code"}<code class="rounded bg-black/5 px-1 py-0.5 font-mono text-[0.9em]">{token.value}</code>{:else}{token.value}{/if}
        {/each}
      </p>
    {/if}
  {/each}
</div>
