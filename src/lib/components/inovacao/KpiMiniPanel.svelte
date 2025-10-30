<!-- src/lib/components/inovacao/KpiMiniPanel.svelte -->
<script lang="ts">
    import type { Kpi } from "$lib/types/Inovation";
    export let items: Kpi[] = [];
    export let footnote =
        "*Estimativas baseadas em cases; variam por curso, região e operação.";
</script>

<section class="w-full">
    <div class="grid gap-4 md:gap-6 lg:gap-8 md:grid-cols-3">
        {#each items as k}
            <article
                class="rounded-[24px] bg-[#F3F4FD] px-8 py-10 md:px-12 md:py-14 text-center"
            >
                <p
                    class="text-[48px] md:text-[60px] leading-[1.26] text-[#EA6D0B]"
                >
                    {k.value}
                </p>
                <p
                    class="mx-auto mt-3 max-w-[260px] text-[15px] md:text-[17px] leading-[1.33] text-[#000A57]/80"
                >
                    {k.label}
                </p>
            </article>
        {/each}
    </div>
    {#if footnote}
        <p class="mt-4 text-[12px] text-[#000A57]/50">{footnote}</p>
    {/if}
</section>
