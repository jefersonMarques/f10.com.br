<script lang="ts">
    import { fade } from "svelte/transition";
    import { cubicOut } from "svelte/easing";
    import TestimonialCard from "$lib/components/TestimonialCard.svelte";

    type Testimonial = {
        quote: string;
        author: string;
        role: string;
        avatar?: string;
    };

    const items: Testimonial[] = [
        {
            quote: "A F10 mudou nosso jogo: menos planilhas, mais dados em tempo real. Gente feliz, auditoria em dia e matrícula voando.",
            author: "Beatriz Menezes",
            role: "Diretora Pedagógica — Rede Futuro",
            avatar:"/beatriz.webp"
        },
        {
            quote: "Integramos cobrança, CRM e aula ao vivo. Redução de custos e visibilidade que a diretoria sempre pediu.",
            author: "Carlos Santos",
            role: "COO — Grupo Educar",
            avatar:"/carlos.webp"
        },
        {
            quote: "Implementação rápida e equipe parceira. O app do aluno melhorou a comunicação com responsáveis em 3 semanas.",
            author: "Daniel Furlan",
            role: "Gestor — Colégio Horizonte",
            avatar:"/daniel.webp"
        },
        {
            quote: "Multiunidades virou simples. Painéis 360 e regras por filial deixaram a expansão mais segura.",
            author: "Fátima Veríssimo",
            role: "CFO — Rede Conecta",
            avatar:"/fatima.webp"
        },
    ];

    let idx = 0;
    const total = items.length;
    const pad2 = (n: number) => String(n).padStart(2, "0");

    function goNext() {
        idx = (idx + 1) % total;
    }
    function goPrev() {
        idx = (idx - 1 + total) % total;
    }

    function onKeydown(e: KeyboardEvent) {
        if (e.key === "ArrowRight") {
            e.preventDefault();
            goNext();
        }
        if (e.key === "ArrowLeft") {
            e.preventDefault();
            goPrev();
        }
    }

    // Swipe (mobile)
    let startX = 0,
        startY = 0,
        dragging = false;
    function onPointerDown(e: PointerEvent) {
        dragging = true;
        startX = e.clientX;
        startY = e.clientY;
    }
    function onPointerMove(e: PointerEvent) {
        if (!dragging) return;
        const dx = e.clientX - startX,
            dy = e.clientY - startY;
        if (Math.abs(dy) > Math.abs(dx)) return; // ignora scroll vertical
    }
    function onPointerUp(e: PointerEvent) {
        if (!dragging) return;
        const dx = e.clientX - startX;
        dragging = false;
        if (dx < -40) goNext();
        if (dx > 40) goPrev();
    }
</script>

<section
    class="relative py-16 md:py-24"
    aria-label="O que nossos clientes acham"
    on:keydown={onKeydown}
>
    <div class="container">
        <!-- Carrossel com altura fixa e sobreposição -->
        <div
            class="relative mt-10 min-h-[420px]"
            role="region"
            aria-roledescription="carousel"
            aria-label="Depoimentos"
            tabindex="0"
            on:pointerdown={onPointerDown}
            on:pointermove={onPointerMove}
            on:pointerup={onPointerUp}
            on:pointercancel={onPointerUp}
            on:pointerleave={onPointerUp}
            style="touch-action: pan-y;"
        >
            {#each items as item, i}
                <div
                    class="absolute inset-0 transition-opacity duration-400 ease-[cubic-bezier(0.65,0,0.35,1)]"
                    style={`opacity:${i === idx ? 1 : 0}; pointer-events:${i === idx ? "auto" : "none"}`}
                >
                    <TestimonialCard
                        title="O que nossos clientes acham"
                        quote={item.quote}
                        author={item.author}
                        role={item.role}
                        avatar={item.avatar}
                        index={idx + 1}
                        {total}
                        onPrev={goPrev}
                        onNext={goNext}
                    />
                </div>
            {/each}
        </div>
    </div>
</section>

<style>
    .container {
        max-width: 1200px;
        margin-left: auto;
        margin-right: auto;
        padding-left: 1.25rem;
        padding-right: 1.25rem;
    }
</style>
