<script lang="ts">
  import HelpPublicAiAssistant from "$lib/components/help/HelpPublicAiAssistant.svelte";
  import type { LayoutData } from "./$types";

  export let data: LayoutData;
</script>

<slot />

<HelpPublicAiAssistant
  enabled={data.helpPublicAi.enabled}
  requiresAuthentication={data.helpPublicAi.requiresAuthentication}
/>
