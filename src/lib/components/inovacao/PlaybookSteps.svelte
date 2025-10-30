<!-- src/lib/components/inovacao/PlaybookSteps.svelte -->
<script lang="ts">
    import type { Step } from "$lib/types/Inovation";
    export let steps: Step[] = [];
    export let title = "Como funciona — quatro passos simples";
</script>

<section class="w-full">
    <h2
        class="text-[26px] md:text-[32px] font-semibold leading-tight text-[#000A57]"
    >
        {title}
    </h2>
    <ol class="mt-8 grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        {#each steps as s, i}
            <li
                class="rounded-[20px] bg-white ring-1 ring-black/5 p-6 shadow-[0_8px_30px_rgba(1,13,40,0.06)]"
            >
                <div
                    class="mb-3 inline-flex h-9 w-9 items-center justify-center rounded-full bg-[#EA6D0B] text-white font-bold"
                >
                    {i + 1}
                </div>
                <h3 class="text-[#000A57] text-[17px] font-semibold">
                    {s.title}
                </h3>
                <p class="mt-2 text-[#000A57]/80 text-[15px] leading-relaxed">
                    {s.text}
                </p>
                {#if s.tip}
                    <p class="mt-3 text-[13px] text-[#000A57]/70">
                        <strong>Dica:</strong>
                        {s.tip}
                    </p>
                {/if}
            </li>
        {/each}
    </ol>
</section>
