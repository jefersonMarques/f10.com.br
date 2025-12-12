<script lang="ts">
    import { createEventDispatcher, onMount } from "svelte";

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
            if (!portal.contains(modalEl)) {
                portal.appendChild(modalEl);
            }
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
    <div
        bind:this={modalEl}
        class="fixed inset-0 z-[9999] flex items-center justify-center"
    >
        <!-- Overlay -->
        <div
            class="absolute inset-0 bg-[#020618]/70 backdrop-blur-sm z-0"
            on:click={closeModal}
        ></div>

        <!-- Container do popup -->
        <div
            class="relative z-10 w-[92%] max-w-xl max-h-[90vh] rounded-[24px] overflow-hidden
                   bg-white shadow-[0_26px_80px_rgba(1,13,40,0.55)]
                   border border-slate-200/80 animate-fadeIn"
        >
            <!-- faixa superior / glow -->
            <div
                class="absolute inset-x-0 -top-20 h-40 bg-[radial-gradient(circle_at_top,_rgba(234,109,11,0.35),_transparent)]
                       pointer-events-none"
                aria-hidden="true"
            ></div>

            <!-- Botão fechar -->
            <button
                on:click={closeModal}
                class="absolute top-3 right-4 text-slate-400 hover:text-slate-600 text-2xl leading-none
                       transition-colors z-20"
                aria-label="Fechar modal"
            >
                ×
            </button>

            <!-- Conteúdo fixo -->
            <div
                class="relative px-6 pt-7 pb-9 md:px-9 md:pt-9 md:pb-10
                       flex flex-col items-center text-center gap-6 bg-white"
            >
                <!-- Tag + título + subtítulo -->
                <div class="space-y-3 max-w-lg">
                    <h2
                        class="text-[22px] md:text-[26px] font-semibold
                               leading-[1.25] tracking-[-0.02em] text-[#010D28]"
                    >
                        Como deseja continuar?
                    </h2>

                    <p
                        class="text-[14px] md:text-[15px] text-[#000A57]/80
                               leading-[1.8] max-w-xl mx-auto"
                    >
                        Se você já utiliza o F10 no desktop, faça o download da
                        versão atualizada. Se precisa de ajuda com financeiro,
                        matrícula ou suporte técnico, acesse diretamente nossa
                        central de atendimento.
                    </p>
                </div>

                <!-- Botões empilhados -->
                <div class="w-full max-w-sm flex flex-col gap-3 mt-1">
                    <!-- Botão principal -->
                    <a
                        href="https://www.f10.com.br/download/InstaladorF10.exe"
                        class="group w-full rounded-[999px] px-5 py-3.5
                               text-[14px] md:text-[15px] font-semibold
                               bg-[#EA6D0B] text-white
                               shadow-[0_18px_40px_rgba(234,109,11,0.45)]
                               hover:brightness-110 active:translate-y-[1px]
                               transition-all flex items-center justify-center gap-2"
                    >
                        <span>Fazer download do F10</span>
                        <span
                            class="inline-block translate-x-[1px] group-hover:translate-x-[4px] transition-transform"
                        >
                            →
                        </span>
                    </a>

                    <!-- Botão secundário -->
                    <a
                        href="https://ajuda.f10.com.br/kb"
                        class="w-full rounded-[999px] px-5 py-3.5
                               text-[14px] md:text-[15px] font-semibold
                               border border-[#CBD5F0] bg-white
                               text-[#000A57] hover:bg-[#F4F6FF]
                               active:translate-y-[1px]
                               transition-all flex items-center justify-center gap-2"
                    >
                        <span>Acessar a central de suporte</span>
                    </a>
                </div>

                <!-- Rodapé discreto -->
                <p
                    class="mt-1 text-[11px] text-[#6B7280] leading-relaxed max-w-sm"
                >
                    Download exclusivo para escolas e cursos que utilizam o F10
                    Software. Em caso de dúvida sobre instalação, acesse o
                    suporte.
                </p>
            </div>
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
