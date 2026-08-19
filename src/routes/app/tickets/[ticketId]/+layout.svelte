<script lang="ts">
  import { Boxes, GitBranch } from "lucide-svelte";
  import type { LayoutData } from "./$types";

  export let data: LayoutData;
</script>

{#if data.workflowContext}
  <div class="mx-auto mt-5 max-w-[1320px] px-5 sm:px-8">
    <div class="flex flex-wrap items-center gap-2 rounded-2xl border border-[#DDE2EC] bg-white px-4 py-3 text-[10px] text-[#626979] shadow-[0_4px_18px_rgba(1,13,40,0.03)]">
      <span class="inline-flex items-center gap-1.5 font-semibold text-[#000A57]"><GitBranch size={13}/>Global · {data.workflowContext.globalStageName}</span>
      {#if data.workflowContext.areaName && data.workflowContext.areaStageName}
        <span class="text-[#B2B7C1]">/</span>
        <span class="inline-flex items-center gap-1.5 font-semibold text-[#A35714]"><Boxes size={13}/>{data.workflowContext.areaName} · {data.workflowContext.areaStageName}</span>
      {/if}
      <span class="ml-auto text-[8px] font-medium uppercase tracking-[0.06em] text-[#9A9FAC]">Etapa operacional controlada pelo workflow</span>
    </div>
  </div>
{/if}

<slot />

<style>
  :global(form[action="?/status"]) {
    display: none !important;
  }
</style>
