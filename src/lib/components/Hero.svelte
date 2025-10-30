<script lang="ts">
    import IconArrowRight from "$lib/icons/IconArrowRight.svelte";
    import { onMount, onDestroy } from "svelte";
    import { showForm } from "$lib/stores/formPopup";
    import SchoolForm from "$lib/components/forms/SchoolForm.svelte";
    import FormPopup from "./popup/Popup.svelte";

    // Parceiros (esquerda)
    const partners = [
        { alt: "afterpay", src: "/logo_afterpay.svg" },
        { alt: "basecamp", src: "/logo_basecamp.svg" },
        { alt: "maze", src: "/logo_maze.svg" },
    ];

    // ----- contador animado (0 -> 230) quando o card aparece -----
    let metricEl: HTMLElement | null = null;
    let count = 0;
    const target = 230;
    const duration = 1200; // ms
    let raf = 0;
    let observer: IntersectionObserver | null = null;
    let started = false;

    function animateCount() {
        const start = performance.now();
        const step = (now: number) => {
            const t = Math.min(1, (now - start) / duration);
            // easeOutCubic
            const eased = 1 - Math.pow(1 - t, 3);
            count = Math.round(eased * target);
            if (t < 1) raf = requestAnimationFrame(step);
        };
        raf = requestAnimationFrame(step);
    }

    onMount(() => {
        if (!metricEl || started) return;
        observer = new IntersectionObserver(
            (entries) => {
                if (entries.some((e) => e.isIntersecting)) {
                    started = true;
                    animateCount();
                    observer?.disconnect();
                }
            },
            { threshold: 0.25 },
        );
        observer.observe(metricEl);
    });

    onDestroy(() => {
        if (raf) cancelAnimationFrame(raf);
        observer?.disconnect();
    });
</script>

<section
    class="relative overflow-hidden border-b border-slate-200"
    aria-label="Seção principal — F10 Software"
>
    <div
        class="container relative z-10 grid grid-cols-1 gap-12 py-16 md:grid-cols-12 md:gap-8 lg:py-24"
    >
        <!-- ===================== COLUNA ESQUERDA ===================== -->
        <div class="md:col-span-6">
            <h1 class="h1-display text-dark">
                Gestão escolar<br />completa
            </h1>

            <p class="mt-8 max-w-[620px] text-soft">
                Transforme a gestão da sua escola com tecnologia educacional de
                ponta, com soluções completas para escolas livres e redes de
                franquias educacionais brasileiras.
            </p>

            <div
                class="mt-12 flex flex-col md:flex-row items-center md:items-center gap-4 md:gap-8
         justify-center md:justify-start text-center md:text-left w-full"
            >
                <a
                    href="Javascript:;"
                    on:click={() => showForm.set(true)}
                    class="inline-flex h-[52px] items-center justify-center rounded-full bg-primary
           px-8 text-[16px] font-semibold leading-[22px] tracking-[-0.02em] text-white
           hover:brightness-95 active:brightness-90 transition w-full md:w-auto"
                >
                    Quero uma demonstração
                    <IconArrowRight size={24} classType="ml-4" />
                </a>

                <a
                    href="/#solucoes"
                    class="text-[16px] font-semibold text-text underline decoration-2 underline-offset-[6px]
           hover:text-primary w-full md:w-auto md:pl-4"
                >
                    Nossas Soluções
                </a>
            </div>

            <div class="mt-14">
                <!-- Wrapper principal -->
                <div
                    class="flex flex-col md:flex-row items-center md:items-center w-full gap-4 md:gap-6"
                >
                    <!-- Título -->
                    <p
                        class="text-xs font-bold tracking-wider text-slate-900
         text-center md:text-left w-full md:w-auto md:whitespace-nowrap"
                    >
                        Nossos parceiros
                    </p>

                    <!-- Logos -->
                    <div
                        class="flex justify-center md:justify-start flex-wrap md:flex-nowrap
             gap-6 md:gap-10 mt-3 md:mt-0 w-full overflow-x-auto md:overflow-visible ml-auto"
                    >
                        {#each partners as p}
                            <img
                                src={p.src}
                                alt={p.alt}
                                class="h-8 w-auto flex-none inline-block lg:ml-auto"
                                loading="lazy"
                            />
                        {/each}
                    </div>
                </div>
            </div>
        </div>

        <!-- ===================== COLUNA DIREITA (PROTO) ===================== -->
        <div class="relative md:col-span-6">
            <!-- meia-pizza AO FUNDO, alinhada à esquerda -->
            <img
                src="/tail_pizza.svg"
                alt=""
                class="pointer-events-none absolute left-8 hidden md:block
           w-[300px] lg:w-[300px] z-0"
                loading="lazy"
                aria-hidden="true"
            />

            <!-- badge (MAIOR e MAIS À ESQUERDA). Usa o próprio SVG, sem bg extra -->
            <img
                src="/icon_growt_hero.svg"
                alt="Tendência de crescimento"
                class="absolute left-[25%] top-[-50px] hidden md:block
           w-24 lg:w-[180px] z-[2]"
                loading="eager"
            />

            <!-- monitor/devices SEM card branco atrás -->
            <img
                src="/hero_image.webp"
                alt="Painéis F10 — telas do sistema"
                class="relative z-[1] lg:w-[725px] mt-24 rounded-xl object-cover"
                fetchpriority="high"
            />

            <!-- CARD 230% SEM SOMBRA e NA FRENTE DE TUDO -->
            <aside
                bind:this={metricEl}
                class="absolute right-0 top-[-20px] hidden md:block
         lg:w-[259px] lg:h-[281px] rounded-[20px] bg-[#F0F0F0] p-6
           shadow-sm ring-0 z-[50]"
                aria-label="Métrica de produtividade"
            >
                <div class="flex items-baseline gap-2">
                    <span
                        class="text-[72px] leading-none font-bold text-primary"
                        >{count}%</span
                    >
                </div>
                <p class="mt-3 text-[16px] text-[#5C5D5F]">
                    Mais produtividade para seu time
                </p>

                <div class="mt-20 h-2 w-full bg-[#D9D9D9]">
                    <div class="h-2 w-[72%] bg-[#010D28]"></div>
                </div>
            </aside>
        </div>
    </div>
</section>
<FormPopup>
    <SchoolForm />
</FormPopup>
