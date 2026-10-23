<script lang="ts">
  type InlineToken = {
    kind: "text" | "strong" | "emphasis" | "code" | "link";
    text: string;
    href?: string;
  };
  type Line = {
    kind: "blank" | "paragraph" | "bullet" | "number" | "quote" | "heading";
    marker?: string;
    tokens: InlineToken[];
  };

  export let text = "";
  export let className = "";

  // O Markdown recebido nunca é injetado como HTML: Svelte escapa o texto.
  // Só usamos links HTTP(S) validados e não carregamos imagens remotas daqui.
  function safeHref(value: string): string | null {
    if (value.length > 2048) return null;
    try {
      const url = new URL(value);
      return (url.protocol === "https:" || url.protocol === "http:") && !url.username && !url.password
        ? url.toString()
        : null;
    } catch {
      return null;
    }
  }

  function unescapeMarkdown(value: string): string {
    // A Brevo pode retornar escapes literais, como "\- INPRO" ou "\.".
    return value.replace(/\\([\\\x60*_{}\[\]()#+\-.!>~])/g, "$1");
  }

  function parseInline(value: string): InlineToken[] {
    // A Brevo pode escapar os marcadores de ênfase mais de uma vez.
    // Remove os escapes antes de interpretar a formatação.
    value = value.replace(/\\([*_])/g, "$1");
    const tokens: InlineToken[] = [];
    const pattern = /(!?\[([^\]\n]{1,240})\]\(([^)\s]+)\))|(?<!\\)\*\*([^*\n]+)\*\*|(?<!\\)__([^_\n]+)__|(?<!\\)\*([^*\n]+)\*|(?<!\\)_([^_\n]+)_|(?<!\\)\x60([^\x60\n]+)\x60|(https?:\/\/[^\s<>"\x27]+)/g;
    let cursor = 0;
    for (const match of value.matchAll(pattern)) {
      const index = match.index;
      if (index > cursor) {
        tokens.push({ kind: "text", text: unescapeMarkdown(value.slice(cursor, index)) });
      }
      const [raw, , label, link, boldA, boldB, italicA, italicB, code, plainUrl] = match;
      if (link !== undefined) {
        const isImage = raw.startsWith("!");
        const href = !isImage ? safeHref(unescapeMarkdown(link)) : null;
        tokens.push(href
          ? { kind: "link", text: unescapeMarkdown(label), href }
          : { kind: "text", text: isImage ? unescapeMarkdown(label) : unescapeMarkdown(raw) });
      } else if (boldA !== undefined || boldB !== undefined) {
        tokens.push({ kind: "strong", text: unescapeMarkdown(boldA ?? boldB) });
      } else if (italicA !== undefined || italicB !== undefined) {
        tokens.push({ kind: "emphasis", text: unescapeMarkdown(italicA ?? italicB) });
      } else if (code !== undefined) {
        tokens.push({ kind: "code", text: code });
      } else if (plainUrl !== undefined) {
        const url = plainUrl.replace(/[.,;:!?]+$/g, "").replace(/\)+$/g, "");
        const href = safeHref(url);
        tokens.push(href ? { kind: "link", text: url, href } : { kind: "text", text: raw });
        if (url.length < raw.length) tokens.push({ kind: "text", text: raw.slice(url.length) });
      }
      cursor = index + raw.length;
    }
    if (cursor < value.length) tokens.push({ kind: "text", text: unescapeMarkdown(value.slice(cursor)) });
    return tokens.length ? tokens : [{ kind: "text", text: unescapeMarkdown(value) }];
  }

  function parseLine(value: string): Line {
    const line = value.trim();
    if (!line) return { kind: "blank", tokens: [] };

    const bullet = /^(?:\\)?[-*•]\s+(.+)$/.exec(line);
    if (bullet) return { kind: "bullet", marker: "•", tokens: parseInline(bullet[1]) };

    const number = /^(\d{1,3})[.)]\s+(.+)$/.exec(line);
    if (number) return { kind: "number", marker: number[1] + ".", tokens: parseInline(number[2]) };

    const quote = /^>\s+(.+)$/.exec(line);
    if (quote) return { kind: "quote", tokens: parseInline(quote[1]) };

    const heading = /^#{1,4}\s+(.+)$/.exec(line);
    if (heading) return { kind: "heading", tokens: parseInline(heading[1]) };

    return { kind: "paragraph", tokens: parseInline(value) };
  }

  $: lines = text.replace(/\r\n?/g, "\n").split("\n").map(parseLine);
</script>

<div class={className}>
  {#each lines as line}
    {#if line.kind === "blank"}
      <div class="h-2" aria-hidden="true"></div>
    {:else}
      <div class:font-semibold={line.kind === "heading"}
        class:border-l-2={line.kind === "quote"}
        class:pl-3={line.kind === "quote"}
        class:flex={line.kind === "bullet" || line.kind === "number"}
        class:gap-2={line.kind === "bullet" || line.kind === "number"}
        class="min-w-0 break-words">
        {#if line.marker}
          <span class="w-5 shrink-0 font-semibold">{line.marker}</span>
        {/if}
        <span class="min-w-0">
          {#each line.tokens as token}
            {#if token.kind === "strong"}<strong class="font-semibold">{token.text}</strong>{:else if token.kind === "emphasis"}<em>{token.text}</em>{:else if token.kind === "code"}<code class="rounded bg-black/5 px-1 py-0.5 text-[0.92em]">{token.text}</code>{:else if token.kind === "link"}<a href={token.href} target="_blank" rel="noopener noreferrer" class="font-semibold underline underline-offset-2">{token.text}</a>{:else}{token.text}{/if}
          {/each}
        </span>
      </div>
    {/if}
  {/each}
</div>
