<script lang="ts">
    import { onMount, onDestroy } from "svelte";

    const videoUrl =
        "https://www.youtube.com/embed/lk4OLZjLFCM?rel=0&autoplay=1";

    const schools = [
        { alt: "CEBRAC", src: "/icon_cebrac.webp" },
        { alt: "Ana Hickmann", src: "/icon_ah.webp" },
        { alt: "SAGA", src: "/icon_saga.webp" },
        { alt: "Microcamp", src: "/icon_microcamp.webp" },
    ];

    let metricEl: HTMLElement | null = null;
    let count = 0;
    const target = 520;
    const duration = 1200;
    let raf = 0;
    let started = false;
    let observer: IntersectionObserver | null = null;

    function animateCount() {
        const start = performance.now();
        const step = (now: number) => {
            const t = Math.min(1, (now - start) / duration);
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
            { threshold: 0.35 },
        );
        observer.observe(metricEl);
    });

    onDestroy(() => {
        if (raf) cancelAnimationFrame(raf);
        observer?.disconnect();
    });

    let dialogEl: HTMLDialogElement | null = null;
    let playing = false;
    function openVideo() {
        playing = true;
        dialogEl?.showModal();
    }
    function closeVideo() {
        playing = false;
        dialogEl?.close();
    }
</script>

<section
    class="relative overflow-hidden bg-white/50"
    aria-label="Benefícios das soluções F10"
>
    <div class="container relative z-10 py-16 lg:py-24">
        <div class="grid grid-cols-1 gap-y-24 gap-x-10 md:grid-cols-12">
            <!-- Header: título à esquerda, texto à direita -->
            <h2
                class="md:col-span-6 text-[40px] leading-tight font-semibold tracking-tight text-[#0B1020]"
            >
                Benefícios das soluções F10<br />para sua escola
            </h2>

            <p
                class="md:col-span-6 max-w-[620px] text-[18px] leading-relaxed text-[#878C91]"
            >
                Na F10 Software, a tecnologia é parceira da educação. Nossos
                sistemas integram setores, reduzem custos, aumentam a
                produtividade e oferecem dados em tempo real, além de facilitar
                a comunicação entre escola, alunos e responsáveis.
            </p>

            <!-- Card Métrica -->
            <article
                bind:this={metricEl}
                class="
                md:col-span-6
                lg:col-span-4
                relative
                rounded-3xl
                p-8
                pb-24
                w-[auto]
                lg:w-[438px]
                h-[382px]
                bg-[#0B1020]
                text-white
                overflow-hidden
                shadow-[0_10px_40px_rgba(1,13,40,0.25)]"
                aria-label="Escolas transformadas"
            >
                <!-- booble invertido -->
                <div
                    class="absolute pointer-events-none select-none"
                    style="
                      /* TAMANHO E POSIÇÃO DA CAIXA (ajuste livre) */
                      width: 1288.32px;
                      height: 843.67px;
                      left: -265.53px;
                      top: 14.84px;
                      /* pode usar %/vw/vh aqui se quiser responsivo */"
                >
                    <!-- A imagem ocupa 100% da caixa e mantém COVER sem deformar -->
                    <img
                        src="/booble_bg.webp"
                        alt=""
                        aria-hidden="true"
                        class="absolute inset-0 w-full h-full object-cover opacity-30 transform-gpu origin-center"
                        style="/* ROTACIONE E ZOOME A IMAGEM (não a caixa) */ transform: rotate(-246.48deg) scale(1.24);"
                    />
                </div>

                <!-- brilho -->
                <div
                    class="pointer-events-none absolute -top-32 -left-24 w-[480px] h-[480px] rounded-full
              bg-[radial-gradient(closest-side,rgba(255,255,255,0.08),transparent)]"
                ></div>

                <!-- 520+ -->
                <div class="relative flex items-end gap-2">
                    <span
                        class="text-[84px] leading-none font-extrabold tracking-tight"
                        >{count}</span
                    >
                    <span
                        class="text-[84px] leading-none text-[#FF7A00] font-extrabold"
                        >+</span
                    >
                </div>

                <p class="relative mt-4 text-[18px] text-[#C9CED6]">
                    Escolas transformadas pela gestão eficiente da F10.
                </p>

                <!-- Fileira de ícones fixa no rodapé, sem esmagar o texto -->
                <div class="absolute left-6 bottom-6 flex items-center">
                    {#each schools as s, i}
                        <img
                            src={s.src}
                            alt={s.alt}
                            class="h-[80px] w-[80px] rounded-full object-cover ring-2 ring-white shadow-sm
               {i === 0 ? 'ml-0' : '-ml-6'}"
                            style="z-index:{10 + i}"
                            loading="lazy"
                        />
                    {/each}

                    <!-- círculo branco com texto laranja -->
                    <div
                        class="
                        h-[80px]
                        w-[80px]
                        -ml-6
                        rounded-full
                        bg-white
                        ring-2
                        ring-white
                        shadow-sm
                        grid
                        place-items-center"
                        style="z-index:99"
                        aria-label="+ 500 redes e escolas"
                        title="+ 500 redes e escolas"
                    >
                        <span
                            class="text-[13px] font-semibold leading-tight text-[#EA6D0B] text-center"
                        >
                            + 500<br />redes e<br />escolas
                        </span>
                    </div>
                </div>
            </article>

            <!-- Card Vídeo (direita, abaixo) -->
            <aside
                class="md:col-span-6 lg:col-span-8 relative rounded-3xl overflow-hidden
         shadow-[0_10px_40px_rgba(1,13,40,0.15)]"
                aria-label="Conheça a F10 em 1 minuto"
            >
                <img
                    src="/t_f10_1_minuto.webp"
                    alt="Conheça a F10 em 1 minuto"
                    class="w-full h-[320px] md:h-[360px] lg:h-[382px] object-cover"
                    loading="lazy"
                />
                <!-- overlay sólido #000A57AD -->
                <div class="absolute inset-0 bg-[#000A57AD]"></div>

                <!-- textos (esquerda, centralizado vertical) -->
                <div
                    class="absolute left-6 md:left-16 top-1/2 -translate-y-1/2
         text-white text-left pointer-events-none
         max-w-[60%] md:max-w-[55%]"
                >
                    <p
                        class="text-[36px] md:text-[44px] leading-tight font-bold"
                    >
                        Conheça<br />a F10 em<br />1 minuto
                    </p>
                </div>

                <!-- botão play com radar -->
                <button
                    type="button"
                    on:click={openVideo}
                    class="group absolute right-6 md:right-12 bottom-6 md:bottom-12
           inline-flex items-center justify-center
           w-[88px] h-[88px] md:w-[110px] md:h-[110px]
           rounded-full bg-[#EA6D0B]
           ring-[12px] ring-white hover:ring-white/60
           shadow-[0_8px_24px_rgba(1,13,40,0.35)]
           transition-[transform,filter,box-shadow] duration-200
           hover:-translate-y-[1px] active:translate-y-0 focus-visible:outline-none"
                    aria-label="Reproduzir vídeo sobre a F10"
                >
                    <!-- radar sutil (duas ondas com atraso) -->
                    <span
                        class="pointer-events-none absolute inset-0 rounded-full"
                    >
                        <span
                            class="absolute inset-0 rounded-full bg-[#EA6D0B] opacity-30
                   animate-ping [animation-duration:2.2s]"
                        ></span>
                        <span
                            class="absolute inset-0 rounded-full bg-[#EA6D0B] opacity-20
                   animate-ping [animation-duration:2.2s] [animation-delay:600ms]"
                        ></span>
                    </span>

                    <!-- ícone play -->
                    <svg
                        width="26"
                        height="27"
                        viewBox="0 0 26 27"
                        fill="none"
                        xmlns="http://www.w3.org/2000/svg"
                    >
                        <path
                            d="M23.4968 9.92471C24.1451 10.2694 24.6873 10.784 25.0654 11.4134C25.4436 12.0428 25.6433 12.7631 25.6433 13.4973C25.6433 14.2316 25.4436 14.9519 25.0654 15.5813C24.6873 16.2106 24.1451 16.7253 23.4968 17.07L6.20454 26.4733C3.42012 27.9877 0 26.0171 0 22.902V4.09403C0 0.976243 3.42012 -0.992959 6.20454 0.520047L23.4968 9.92471Z"
                            fill="#010D28"
                        />
                    </svg>
                </button>
            </aside>
        </div>
    </div>

    <!-- Modal do vídeo -->
    <dialog
        bind:this={dialogEl}
        class="backdrop:bg-black/60 rounded-2xl p-0 w-[96%] max-w-[960px]"
        on:close={closeVideo}
    >
        <div class="relative aspect-video w-full rounded-2xl overflow-hidden">
            {#if playing}
                <iframe
                    src={videoUrl}
                    title="Vídeo institucional F10"
                    class="absolute inset-0 w-full h-full"
                    loading="eager"
                    allow="autoplay; encrypted-media; picture-in-picture"
                    allowfullscreen
                ></iframe>
            {/if}
            <button
                type="button"
                on:click={closeVideo}
                class="absolute top-3 right-3 inline-flex items-center justify-center
               w-10 h-10 rounded-full bg-black/70 text-white text-xl leading-none"
                aria-label="Fechar vídeo">×</button
            >
        </div>
    </dialog>
</section>
