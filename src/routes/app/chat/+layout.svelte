<script lang="ts">
  import { page } from "$app/stores";

  $: workspaceKey = $page.params.sessionId ?? "chat-inbox";
</script>

{#key workspaceKey}
  <slot />
{/key}
