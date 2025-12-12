<script lang="ts">
    type KpiItem = {
        value: string;
        label: string;
    };

    export let title: string;
    export let items: KpiItem[] = [];
    export let footnote: string = "";
</script>

<!-- Card principal (690px, fundo noise + blur) -->
<div
    class="relative mx-auto flex max-w-[690px] flex-col items-center
         rounded-[24px] overflow-hidden"
    style="background-image: url('/noise.svg'); background-repeat: repeat; background-size: auto;"
>
    <!-- Camada “vidro” -->
    <div
        class="relative flex w-full flex-col items-stretch
           px-6 md:px-10 lg:px-12
           pt-12 md:pt-14 pb-12
           gap-10
           bg-white/80 backdrop-blur-2xl"
    >
        <!-- Título -->
        <header class="text-left">
            <h3
                class="text-[22px] md:text-[26px] lg:text-[28px]
               font-semibold leading-[1.4] text-[#000A57]"
            >
                {title}
            </h3>
        </header>

        <!-- Blocos de KPI -->
        <div class="flex flex-col gap-6">
            {#each items as item}
                <div
                    class="flex flex-row items-start gap-8
                 rounded-[16px] bg-white
                 px-6 md:px-8 py-6
                 shadow-[0_10px_35px_rgba(15,23,42,0.08)]"
                >
                    <div
                        class="flex-shrink-0 text-[#EA6D0B] font-semibold
                   text-[40px] md:text-[52px] lg:text-[60px]
                   leading-[1]"
                    >
                        {item.value}
                    </div>

                    <p
                        class="flex-1 text-[15px] md:text-[17px]
                   leading-[1.4] text-[#000A57]/85"
                    >
                        {item.label}
                    </p>
                </div>
            {/each}
        </div>

        <!-- Linha + nota de rodapé -->
        {#if footnote}
            <div class="mt-2 flex flex-col gap-4">
                <div class="h-px w-full border-t border-[#000A57]/20"></div>
                <p
                    class="text-[13px] md:text-[14px]
                 leading-[1.4] text-[#000A57]/80"
                >
                    {footnote}
                </p>
            </div>
        {/if}
    </div>
</div>
