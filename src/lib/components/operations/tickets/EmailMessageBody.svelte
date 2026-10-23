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

<div class={className}>
  <EmailMarkdownContent text={main}/>
  {#if conversation.quoted}
    <details class="mt-3 rounded-xl border border-[#DDE1EA] bg-white/70 px-3 py-2.5">
      <summary class="cursor-pointer text-[12px] font-semibold text-[#515C74]">Ver histórico completo do e-mail</summary>
      <div class="mt-3 max-h-[400px] overflow-auto border-t border-[#E7EAF0] pt-3 text-[12px] leading-[1.65]">
        <EmailMarkdownContent text={conversation.quoted}/>
      </div>
    </details>
  {/if}
</div>
