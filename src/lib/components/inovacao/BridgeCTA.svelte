<!-- src/lib/components/inovacao/BridgeCTA.svelte -->
<script lang="ts">
  export let title = "Ver soluções relacionadas";
  export let description = "Implemente esta estratégia com os módulos do F10 Software.";
  import type { Link } from "$lib/types/Inovation";
  export let links: Link[] = [];
</script>

<section class="w-full">
  <div class="rounded-[24px] bg-white ring-1 ring-black/5 p-6 md:p-8 flex flex-col md:flex-row md:items-center md:justify-between gap-6">
    <div>
      <h2 class="text-[22px] md:text-[26px] font-semibold text-[#000A57]">{title}</h2>
      <p class="mt-2 text-[15px] text-[#000A57]/80">{description}</p>
    </div>
    <div class="flex flex-wrap gap-2">
      <a href="/solucoes" class="inline-flex items-center rounded-full bg-[#EA6D0B] text-white px-5 py-2.5 text-[14px] font-semibold hover:brightness-110 focus:outline-none focus:ring-2 focus:ring-[#EA6D0B]/40">
        Ver HUB de Soluções
      </a>
      {#each links as l}
        <a href={l.href} class="inline-flex items-center rounded-full border border-[#EA6D0B] text-[#000A57] px-4 py-2 text-[14px] font-semibold hover:bg-[#EA6D0B]/10 focus:outline-none focus:ring-2 focus:ring-[#EA6D0B]/40">
          {l.label}
        </a>
      {/each}
    </div>
  </div>
</section>
