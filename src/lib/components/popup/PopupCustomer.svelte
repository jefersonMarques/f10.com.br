<script lang="ts">
    import { createEventDispatcher, onMount } from "svelte";
    import { ArrowRight, Coins, FileText, Sparkles } from "lucide-svelte";

    // Única prop: controla se o popup está visível
    export let open = false;

    const dispatch = createEventDispatcher();

    let portal: HTMLElement | null = null;
    let modalEl: HTMLElement | null = null;
    let mounted = false;

    onMount(() => {
        portal = document.getElementById("modal-root");
        mounted = true;
    });

    // Controla scroll da página e portal
    $: {
        if (mounted && portal && modalEl && open) {
            if (!portal.contains(modalEl)) portal.appendChild(modalEl);
            document.body.style.overflow = "hidden";
        } else if (mounted) {
            document.body.style.overflow = "";
        }
    }

    function closeModal() {
        open = false; // permite bind:open
        dispatch("close");
    }
</script>

{#if mounted && portal && open}
    <div bind:this={modalEl} class="fixed inset-0 z-[9999] flex items-center justify-center">
        <button
            type="button"
            class="absolute inset-0 bg-[#020618]/70 backdrop-blur-sm z-0"
            on:click={closeModal}
            aria-label="Fechar modal"
        ></button>

        <div
            class="relative z-10 w-[92%] max-w-xl max-h-[90vh]
                   rounded-[24px] overflow-hidden bg-white
                   shadow-[0_26px_80px_rgba(1,13,40,0.55)]
                   border border-slate-200/80 animate-fadeIn"
        >
            <div
                class="absolute inset-x-0 -top-20 h-40
                       bg-[radial-gradient(circle_at_top,_rgba(234,109,11,0.18),_transparent)]
                       pointer-events-none"
                aria-hidden="true"
            ></div>

            <button
                on:click={closeModal}
                class="absolute top-3 right-4 text-slate-400 hover:text-slate-600
                       text-2xl leading-none transition-colors z-20"
                aria-label="Fechar modal"
            >
                ×
            </button>

            <div class="relative px-6 pt-8 pb-8 md:px-9 md:pt-9 md:pb-9 bg-white">
                <div class="text-center space-y-3">
                    <h2 class="text-[22px] md:text-[26px] font-semibold tracking-[-0.02em] text-[#010D28]">
                        Como deseja continuar?
                    </h2>

                    <p class="text-[14px] md:text-[15px] leading-[1.8] text-[#000A57]/75 max-w-[520px] mx-auto">
                        Acesse os principais recursos para clientes F10 ou conheça novas integrações.
                    </p>
                </div>

                <div class="mt-7 flex flex-col items-center gap-3">
                    <a
                        href="/download"
                        on:click={closeModal}
                        class="group relative w-full max-w-sm h-[50px]
                               rounded-[999px] bg-[#EA6D0B] text-white font-semibold
                               shadow-[0_16px_40px_rgba(234,109,11,0.32)]
                               hover:brightness-110 active:translate-y-[1px]
                               transition-all focus:outline-none focus:ring-2 focus:ring-[#EA6D0B]/35"
                        aria-label="Fazer download do F10"
                    >
                        <span class="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
                            Fazer download do F10
                        </span>

                        <span class="absolute right-5 top-1/2 -translate-y-1/2">
                            <ArrowRight
                                size={18}
                                class="translate-x-[0px] group-hover:translate-x-[4px] transition-transform"
                            />
                        </span>
                    </a>

                    <a
                        href="https://ajuda.f10.com.br/kb"
                        class="group relative w-full max-w-sm h-[50px]
                               rounded-[999px] bg-white text-[#000A57] font-semibold
                               border border-[#CBD5F0] shadow-sm
                               hover:bg-[#F4F6FF] active:translate-y-[1px]
                               transition-all focus:outline-none focus:ring-2 focus:ring-[#EA6D0B]/25"
                        aria-label="Acessar a central de ajuda"
                    >
                        <span class="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
                            Acessar a central de ajuda
                        </span>

                        <span class="absolute right-5 top-1/2 -translate-y-1/2 text-[#EA6D0B]">
                            <ArrowRight size={18} />
                        </span>
                    </a>

                    <a
                        href="/nota-fiscal"
                        on:click={closeModal}
                        class="group relative w-full max-w-sm h-[50px]
                               rounded-[999px] bg-white text-[#000A57] font-semibold
                               border border-[#CBD5F0] shadow-sm
                               hover:bg-[#F4F6FF] active:translate-y-[1px]
                               transition-all focus:outline-none focus:ring-2 focus:ring-[#EA6D0B]/25"
                        aria-label="Acessar Nota Fiscal para clientes"
                    >
                        <span class="absolute left-5 top-1/2 -translate-y-1/2 text-[#EA6D0B]">
                            <FileText size={18} />
                        </span>
                        <span class="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
                            Nota Fiscal
                        </span>
                        <span class="absolute right-5 top-1/2 -translate-y-1/2 text-[#EA6D0B]">
                            <ArrowRight size={18} />
                        </span>
                    </a>
                </div>

                <div class="mt-7 flex items-center justify-center gap-4">
                    <span class="h-px w-[120px] bg-slate-200"></span>
                    <span class="text-[11px] font-semibold text-slate-400 tracking-widest">
                        CONHEÇA
                    </span>
                    <span class="h-px w-[120px] bg-slate-200"></span>
                </div>

                <div class="mt-6 flex justify-center">
                    <div
                        class="w-full max-w-sm rounded-[22px]
                               border border-[#EA6D0B]/25 bg-[#F3F4FD]
                               px-5 py-5 shadow-[0_10px_26px_rgba(1,13,40,0.06)]"
                    >
                        <div class="flex items-start gap-3">
                            <div
                                class="mt-0.5 flex h-10 w-10 items-center justify-center rounded-full
                                       bg-white ring-1 ring-black/5"
                                aria-hidden="true"
                            >
                                <Coins size={18} class="text-[#EA6D0B]" />
                            </div>

                            <div class="flex-1">
                                <div class="flex flex-wrap items-center gap-2">
                                    <p class="text-[#010D28] font-semibold text-[15px] leading-snug">
                                        Quer cobrar com Pix no F10?
                                    </p>

                                    <span
                                        class="inline-flex items-center gap-1 rounded-full
                                               bg-white text-[#EA6D0B] px-2.5 py-1
                                               text-[10px] font-bold ring-1 ring-[#EA6D0B]/20"
                                    >
                                        <Sparkles size={12} />
                                        NOVO
                                    </span>
                                </div>

                                <p class="mt-2 text-[#7E82A2] text-[13px] leading-relaxed">
                                    Conheça a Celcoin e veja como ativar a integração para simplificar a conciliação e acelerar recebimentos.
                                </p>

                                <a
                                    href="/celcoin"
                                    on:click={closeModal}
                                    class="mt-4 inline-flex items-center gap-2
                                           rounded-[999px] bg-[#000A57]
                                           px-5 py-2.5 text-white font-semibold text-[14px]
                                           shadow-[0_14px_30px_rgba(0,10,87,0.18)]
                                           hover:brightness-110 active:translate-y-[1px]
                                           transition-all"
                                    aria-label="Conhecer a página Celcoin"
                                >
                                    <span>Conhecer Celcoin</span>
                                    <ArrowRight size={18} class="text-[#EA6D0B]" />
                                </a>
                            </div>
                        </div>
                    </div>
                </div>

                <p class="mt-7 text-center text-[11px] text-[#6B7280] leading-relaxed max-w-sm mx-auto">
                    Download exclusivo para escolas e cursos que utilizam o F10 Software.
                    Em caso de dúvida sobre instalação, acesse a central de ajuda.
                </p>
            </div>

            <div class="pointer-events-none absolute inset-0 rounded-[24px] ring-1 ring-inset ring-white/10"></div>
        </div>
    </div>
{/if}

<style>
    @keyframes fadeIn {
        from {
            opacity: 0;
            transform: translateY(8px) scale(0.98);
        }
        to {
            opacity: 1;
            transform: translateY(0) scale(1);
        }
    }

    .animate-fadeIn {
        animation: fadeIn 0.22s ease-out;
    }
</style>
