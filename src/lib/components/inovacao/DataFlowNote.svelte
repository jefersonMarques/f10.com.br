<!-- src/lib/components/inovacao/DataFlowNote.svelte -->
<script lang="ts">
  export let title = "Arquitetura de dados na prática";
  export let bullets: string[] = [];
  export let footnote: string | null = null;
</script>

<section class="w-full">
  <div class="rounded-[24px] bg-[#0A1533] text-white ring-1 ring-white/5 p-6 md:p-8">
    <h2 class="text-[22px] md:text-[26px] font-semibold">{title}</h2>
    <ul class="mt-4 space-y-3 text-white/85 text-[15px] leading-relaxed">
      {#each bullets as b}
        <li class="flex gap-3 items-start">
          <span class="mt-[6px] inline-block h-1.5 w-1.5 rounded-full bg-[#EA6D0B]"></span>
          <span>{@html b}</span>
        </li>
      {/each}
    </ul>
    {#if footnote}
      <p class="mt-4 text-white/70 text-[13px]">{footnote}</p>
    {/if}
  </div>
</section>
