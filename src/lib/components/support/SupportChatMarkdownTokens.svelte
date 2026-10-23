<script lang="ts">
  import type { ChatMarkdownToken } from "$lib/support/chatMarkdown";

  export let tokens: ChatMarkdownToken[] = [];
  export let isCustomer = false;
</script>

{#each tokens as token}
  {#if token.kind === "strong"}
    <strong class="font-semibold">{token.text}</strong>
  {:else if token.kind === "emphasis"}
    <em>{token.text}</em>
  {:else if token.kind === "strikethrough"}
    <s>{token.text}</s>
  {:else if token.kind === "code"}
    <code class={`break-words rounded px-1 py-0.5 font-mono text-[0.94em] ${isCustomer ? "bg-white/15 text-white" : "bg-[#EDF0FA] text-[#16235B]"}`}>{token.text}</code>
  {:else if token.kind === "link"}
    <a
      href={token.href}
      target={token.href?.startsWith("/") ? undefined : "_blank"}
      rel={token.href?.startsWith("/") ? undefined : "noopener noreferrer"}
      class={`break-all font-semibold underline underline-offset-2 ${isCustomer ? "text-white decoration-white/70" : "text-[#000A72] decoration-[#ADB7E7]"}`}
    >{token.text}</a>
  {:else}
    {token.text}
  {/if}
{/each}
