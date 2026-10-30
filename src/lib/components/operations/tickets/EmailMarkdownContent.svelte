<script lang="ts">
  import SupportChatMarkdown from "$lib/components/support/SupportChatMarkdown.svelte";
  import { normalizeEmailMarkdown } from "$lib/support/emailBodyText";

  export let text = "";
  export let className = "";
  export let size: "sm" | "md" = "md";

  $: formattedText = normalizeEmailMarkdown(text);
</script>

<SupportChatMarkdown text={formattedText} {className} {size} repairMultilineFormatting/>
