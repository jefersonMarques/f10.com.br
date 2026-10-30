<script lang="ts">
  import EmailMarkdownContent from "./EmailMarkdownContent.svelte";
  import { splitEmailConversation } from "$lib/support/emailBodyText";

  export let text = "";
  export let className = "";
  export let hasInlineImages = false;

  $: conversation = splitEmailConversation(text);
  $: main = hasInlineImages
    ? conversation.main.replace(/^\s*\[image:\s*[^\]\n]+\]\s*$/gim, "").trim()
    : conversation.main;
</script>

<div class={`min-w-0 max-w-full ${className}`}>
  <EmailMarkdownContent text={main}/>
  {#if conversation.quoted}
    <details class="mt-3 min-w-0 max-w-full rounded-xl border border-[var(--app-border)] bg-[var(--app-surface)] px-3 py-2.5">
      <summary class="cursor-pointer text-[12px] font-semibold text-[#515C74]">Ver histórico completo do e-mail</summary>
      <div class="mt-3 max-h-[400px] min-w-0 overflow-auto border-t border-[var(--app-border)] pt-3">
        <EmailMarkdownContent text={conversation.quoted} size="sm"/>
      </div>
    </details>
  {/if}
</div>
