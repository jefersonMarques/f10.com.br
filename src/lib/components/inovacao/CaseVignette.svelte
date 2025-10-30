<!-- src/lib/components/inovacao/CaseVignette.svelte -->
<script lang="ts">
    import type { VCase } from "$lib/types/Inovation";
    export let items: VCase[] = [];
</script>

<section class="w-full">
    <div class="grid gap-6 md:grid-cols-2">
        {#each items as c}
            <article
                class="rounded-[20px] bg-white ring-1 ring-black/5 p-6 shadow-[0_8px_30px_rgba(1,13,40,0.06)]"
            >
                <h3 class="text-[#000A57] text-[17px] font-semibold">
                    {c.title}
                </h3>
                <ul
                    class="mt-3 space-y-2 text-[15px] text-[#000A57]/85 leading-relaxed"
                >
                    <li><strong>Situação:</strong> {c.situation}</li>
                    <li><strong>Ação:</strong> {c.action}</li>
                    <li><strong>Resultado:</strong> {c.result}</li>
                </ul>
            </article>
        {/each}
    </div>
</section>
