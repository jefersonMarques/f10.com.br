<script lang="ts">
    import IconArrowLine from "$lib/icons/IconArrowLine.svelte";
    import type { FaqItem } from "$lib/types/faqItem";

    export let items: FaqItem[] = [];

    let open = new Set<number>();
    const toggle = (i: number) => {
        const next = new Set(open);
        next.has(i) ? next.delete(i) : next.add(i);
        open = next;
    };
</script>

<div class="w-full">
    <div class="grid gap-4 md:gap-5">
        {#each items as item, i}
            <article
                class="rounded-[20px] md:rounded-[24px] bg-white ring-1 ring-black/5 shadow-[0_8px_30px_rgba(1,13,40,0.08)] overflow-hidden"
            >
                <button
                    class="group w-full flex items-center justify-between gap-6 px-5 md:px-7 py-5 md:py-6 text-left"
                    aria-expanded={open.has(i)}
                    on:click={() => toggle(i)}
                >
                    <h3
                        class="text-[#000A57] text-[17px] md:text-[18px] font-semibold leading-snug"
                    >
                        {item.question}
                    </h3>
                    <span
                        class="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-[#EA6D0B]/60"
                    >
                        <IconArrowLine size={18} color={"#ea6d0b"} />
                    </span>
                </button>

                {#if open.has(i)}
                    <div class="px-5 md:px-7 pb-6 md:pb-7">
                        <p
                            class="text-[#000A57]/80 text-[15px] md:text-[16px] leading-relaxed"
                        >
                            {@html item.answer}
                        </p>
                    </div>
                {/if}
            </article>
        {/each}
    </div>
</div>

<style>
    /* Rotaciona o ícone quando aria-expanded=true (suporte à utility) */
    .group[aria-expanded="true"] .group-aria-expanded\:rotate-90 {
        transform: rotate(90deg);
    }
</style>
