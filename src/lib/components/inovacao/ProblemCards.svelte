<!-- src/lib/components/inovacao/ProblemCards.svelte -->
<script lang="ts">
    import type { Problem } from "$lib/types/Inovation";
    export let items: Problem[] = [];
</script>

<section class="w-full">
    <div class="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {#each items as p}
            <article
                class="rounded-[20px] bg-white ring-1 ring-black/5 p-6 shadow-[0_8px_30px_rgba(1,13,40,0.06)]"
            >
                {#if p.icon}
                    <div
                        class="mb-4 inline-flex h-10 w-10 items-center justify-center rounded-full bg-[#EA6D0B]/10 ring-1 ring-[#EA6D0B]/20"
                    >
                        <svelte:component this={p.icon} />
                    </div>
                {/if}
                <h3
                    class="text-[#000A57] text-[17px] font-semibold leading-snug"
                >
                    {p.title}
                </h3>
                <p class="mt-2 text-[#000A57]/80 text-[15px] leading-relaxed">
                    {p.text}
                </p>
            </article>
        {/each}
    </div>
</section>
