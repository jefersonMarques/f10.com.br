<script lang="ts">
  import TestimonialCard from "$lib/components/TestimonialCard.svelte";
  import TestimonialPopup from "$lib/components/popup/TestimonialPopup.svelte";
  import TestimonialPopupContent from "$lib/components/TestimonialPopupContent.svelte";
  import cristianoAvatarUrl from "$lib/assets/home/cristiano-ebp-avatar-160.webp?url&no-inline";
  import elisonAvatarUrl from "$lib/assets/home/elison-zion-avatar-160.webp?url&no-inline";
  import raquelAvatarUrl from "$lib/assets/home/raquel-epic-avatar-160.webp?url&no-inline";
  import silviaAvatarUrl from "$lib/assets/home/silvia-eah-avatar-160.webp?url&no-inline";
  import talitaAvatarUrl from "$lib/assets/home/talita-zion-avatar-160.webp?url&no-inline";

  import { showTestimonialPopup, testimonialPopupData } from "$lib/stores/testimonialPopup";
  import type { VideoOrientation } from "$lib/stores/testimonialPopup";

  type Testimonial = {
    quote: string;
    fullText: string;
    author: string;
    role: string;
    avatar?: string;

    // vídeo no servidor
    videoSrc?: string;
    videoType?: string;
    poster?: string;
    videoOrientation?: VideoOrientation; // "portrait" | "landscape"
  };

  const items: Testimonial[] = [
    {
      quote:
        "Quero compartilhar minha experiência: o sistema é uma ferramenta muito útil no dia a dia. Ele é intuitivo e rápido, facilita bastante os processos internos e melhora nossa tomada de decisão. Também quero falar...",
      fullText: "",
      author: "Silvia Bernardo",
      role: "Diretora Pedagógica - Franqueadora Escolas Ana Hickmann",
      avatar: silviaAvatarUrl,
      videoSrc: "/depoimento_silvia_eah.mp4",
      videoType: "video/mp4",
      poster: "",
      videoOrientation: "portrait"
    },
    {
      quote:
        "Utilizo o F10 há mais de 11 anos. O F10 é um sistema prático, de fácil manuseio e com bons indicadores. Mesmo para quem está começando, é muito simples de usar: um sistema direto, fácil e eficiente.",
      fullText: "",
      author: "Cristiano",
      role: "Sócio Diretor — EBP (MG)",
      avatar: cristianoAvatarUrl,
      videoSrc: "/depoimento_cristiano_ebp.mp4",
      videoType: "video/mp4",
      poster: "",
      videoOrientation: "portrait"
    },
    {
      quote:
        "Gostaria de expressar minha sincera gratidão ao F10 pela facilidade em organizar as finanças da escola. A agilidade do sistema é incrível! O suporte do Jesse é nota 10, sempre...",
      fullText: "Gostaria de expressar minha sincera gratidão ao F10 pela facilidade em organizar as finanças da escola. A agilidade do sistema é incrível! O suporte do Jesse é nota 10, sempre prestativo e atencioso, nunca me deixou esperando. Todas as questões são resolvidas rapidamente. A equipe F10 realmente é 10, e esperamos continuar essa parceria em 2026. Parabéns pelo excelente serviço prestado!✨👏",
      author: "Raquel Kelly",
      role: "Supervisora comercial — Epic School (SC)",
      avatar: raquelAvatarUrl,
      videoSrc: "",
      videoType: "",
      poster: "",
      videoOrientation: "landscape"
    },
    {
      quote:
        "Sou suspeito para falar. Utilizo o F10 nas empresas em que trabalho desde 2008 e posso afirmar que acompanhei de perto toda a evolução da plataforma ao longo desses anos. O crescimento foi constante...",
      fullText: "Sou suspeito para falar. Utilizo o F10 nas empresas em que trabalho desde 2008 e posso afirmar que acompanhei de perto toda a evolução da plataforma ao longo desses anos. O crescimento foi constante, sempre alinhado às necessidades do mercado, trazendo soluções cada vez mais eficientes para a gestão do dia a dia. Outro grande diferencial sempre foi o suporte. A equipe é extremamente solícita, ágil e disposta a resolver qualquer situação com profissionalismo. Além disso, ao longo do tempo, o F10 também desenvolveu soluções exclusivas para nossa empresa, o que demonstra um cuidado real com as necessidades do cliente. Sem dúvida, é uma parceria sólida, construída com confiança, inovação e resultados.",
      author: "Elison Arruda",
      role: "Diretor de TI — Zion Escola de Entretenimento",
      avatar: elisonAvatarUrl,
      videoSrc: "",
      videoType: "",
      poster: "",
      videoOrientation: "landscape"
    },
    {
      quote:
        "Sistema muito completo, tanto na parte de funcionários, cobranças certificado, etc, muito completo, o suporte é incrível, sempre estão prontos para ajudar no que for preciso, nota 10",
      fullText: "",
      author: "Talita",
      role: "Escolas profissionalizante Ana Hickmann",
      avatar: talitaAvatarUrl,
      videoSrc: "/depoimento_talita_eah.mp4",
      videoType: "video/mp4",
      poster: "",
      videoOrientation: "portrait"
    },
  ];

  let idx = 0;
  const total = items.length;
  $: activeItem = items[idx];

  function goNext() {
    idx = (idx + 1) % total;
  }

  function goPrev() {
    idx = (idx - 1 + total) % total;
  }

  function openDetails(item: Testimonial) {
    testimonialPopupData.set({
      title: "Depoimento completo",
      fullText: item.fullText,
      author: item.author,
      role: item.role,
      avatar: item.avatar,
      videoSrc: item.videoSrc,
      videoType: item.videoType,
      poster: item.poster,
      videoOrientation: item.videoOrientation ?? "landscape"
    });

    showTestimonialPopup.set(true);
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
  let startX = 0;
  let startY = 0;
  let dragging = false;

  function onPointerDown(e: PointerEvent) {
    dragging = true;
    startX = e.clientX;
    startY = e.clientY;
  }

  function onPointerMove(e: PointerEvent) {
    if (!dragging) return;
    const dx = e.clientX - startX;
    const dy = e.clientY - startY;
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

<!-- Modal (uma vez na seção) -->
<TestimonialPopup size="lg">
  <TestimonialPopupContent />
</TestimonialPopup>

<!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
<section class="deferred-section relative py-16 md:py-24" aria-label="O que nossos clientes acham" on:keydown={onKeydown}>
  <div class="container">
    <!-- Carrossel com altura fixa e sobreposição -->
    <!-- svelte-ignore a11y_no_noninteractive_tabindex -->
    <div
      class="relative mt-10 min-h-[580px]"
      role="region"
      aria-roledescription="carousel"
      aria-label="Depoimentos"
      aria-live="polite"
      tabindex="0"
      on:pointerdown={onPointerDown}
      on:pointermove={onPointerMove}
      on:pointerup={onPointerUp}
      on:pointercancel={onPointerUp}
      on:pointerleave={onPointerUp}
      style="touch-action: pan-y;"
    >
      {#key idx}
        <div class="testimonial-slide absolute inset-0">
          <TestimonialCard
            title="O que nossos clientes acham"
            quote={activeItem.quote}
            author={activeItem.author}
            role={activeItem.role}
            avatar={activeItem.avatar}
            index={idx + 1}
            {total}
            onPrev={goPrev}
            onNext={goNext}
            onOpenDetails={() => openDetails(activeItem)}
            hasVideo={!!activeItem.videoSrc}
          />
        </div>
      {/key}
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

  .testimonial-slide {
    animation: testimonial-slide-in 400ms cubic-bezier(0.65, 0, 0.35, 1);
  }

  @keyframes testimonial-slide-in {
    from {
      opacity: 0;
    }
    to {
      opacity: 1;
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .testimonial-slide {
      animation: none;
    }
  }
</style>
