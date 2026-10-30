<script lang="ts">
  import SupportChatMarkdownTokens from "$lib/components/support/SupportChatMarkdownTokens.svelte";
  import { parseChatMarkdown } from "$lib/support/chatMarkdown";
  import { normalizeTicketMessageMarkdown } from "$lib/support/ticketMarkdown";

  export let text = "";
  export let isCustomer = false;
  export let className = "";
  export let size: "sm" | "md" = "sm";
  export let repairMultilineFormatting = false;

  $: blocks = parseChatMarkdown(repairMultilineFormatting ? normalizeTicketMessageMarkdown(text) : text);
</script>

<div class={`min-w-0 space-y-1 break-words ${size === "md" ? "text-[14px] leading-[1.65]" : "text-[12px] leading-[1.7]"} ${className}`}>
  {#each blocks as block}
    {#if block.kind === "space"}
      <div class="h-1" aria-hidden="true"></div>
    {:else if block.kind === "heading"}
      <div class={`font-semibold ${block.level === 1 ? "pt-1 text-[15px]" : block.level === 2 ? "text-[14px]" : "text-[13px]"}`}>
        <SupportChatMarkdownTokens tokens={block.tokens ?? []} {isCustomer}/>
      </div>
    {:else if block.kind === "bullet" || block.kind === "ordered"}
      <div class="flex items-start gap-2">
        <span class="min-w-4 shrink-0 font-semibold">{block.marker}</span>
        <div class="min-w-0 flex-1">
          <SupportChatMarkdownTokens tokens={block.tokens ?? []} {isCustomer}/>
        </div>
      </div>
    {:else if block.kind === "quote"}
      <blockquote class={`border-l-[3px] pl-3 italic ${isCustomer ? "border-white/50" : "border-[#C8D0F0]"}`}>
        <SupportChatMarkdownTokens tokens={block.tokens ?? []} {isCustomer}/>
      </blockquote>
    {:else if block.kind === "code"}
      <pre class={`max-w-full overflow-x-auto whitespace-pre-wrap break-words rounded-lg p-2 font-mono leading-5 ${size === "md" ? "text-[12px]" : "text-[11px]"} ${isCustomer ? "bg-white/10" : "bg-[#F1F3FA]"}`}><code>{block.code}</code></pre>
    {:else}
      <p><SupportChatMarkdownTokens tokens={block.tokens ?? []} {isCustomer}/></p>
    {/if}
  {/each}
</div>
