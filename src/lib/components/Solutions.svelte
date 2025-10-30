<script lang="ts">
  import { tick, onMount, onDestroy } from "svelte";
  import { browser } from "$app/environment";
  import SolutionCard from "$lib/components/SolutionCard.svelte";

  // ===== Tabs =====
  type TabId = "finance" | "pedagogy" | "sales" | "admin";
  type Tab = { id: TabId; label: string; el?: HTMLButtonElement | null };

  let tabs: Tab[] = [
    { id: "finance", label: "Financeiro" },
    { id: "pedagogy", label: "Pedagógico" },
    { id: "sales", label: "Comercial" },
    { id: "admin", label: "Administrativo" },
  ];
  let activeTab: TabId = "pedagogy";

  function handleTabKeydown(e: KeyboardEvent, idx: number) {
    if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;
    e.preventDefault();
    const dir = e.key === "ArrowRight" ? 1 : -1;
    const next = (idx + dir + tabs.length) % tabs.length;
    activeTab = tabs[next].id;
    tabs[next].el?.focus();
  }

  // ===== Dados =====
  type CardData = {
    image?: string;
    highlight: string;
    title: string;
    buttonText: string;
    href: string;
  };

  let isMeasuring = false;

  const content: Record<TabId, CardData[]> = {
    pedagogy: [
      {
        image: "/bg_smart_aluno.webp",
        highlight: "APP Smart Aluno",
        title: "Conteúdos de aula, avisos, financeiro, tudo em um só lugar",
        buttonText: "Conheça +",
        href: "/#smart-aluno",
      },
      {
        image: "/bg_meeting.webp",
        highlight: "Portal do Aluno",
        title: "Aulas ao vivo, matrícula online, assinatura de contrato e mais",
        buttonText: "Conheça +",
        href: "/#portal-aluno",
      },
      {
        image: "/bg_studant.webp",
        highlight: "Listagem de presença",
        title: "Faça chamada pelo app do professor ou tablet de forma rápida",
        buttonText: "Conheça +",
        href: "/#presenca",
      },
      {
        image: "",
        highlight: "Biblioteca Digital",
        title: "Materiais, provas e tarefas com trilhas por turma e curso",
        buttonText: "Conheça +",
        href: "/#biblioteca",
      },
    ],
    finance: [
      {
        image: "",
        highlight: "Cobrança",
        title: "Boletos e Pix automáticos com conciliação em tempo real",
        buttonText: "Conheça +",
        href: "/#cobranca",
      },
      {
        image: "",
        highlight: "Inadimplência",
        title: "Renegociação e régua de cobrança por WhatsApp",
        buttonText: "Conheça +",
        href: "/#inadimplencia",
      },
      {
        image: "",
        highlight: "Financeiro 360",
        title: "Fluxo de caixa, DRE e metas por unidade e curso",
        buttonText: "Conheça +",
        href: "/#financeiro-360",
      },
      {
        image: "",
        highlight: "Centro de Custos",
        title: "Lançamentos por projeto, turma e unidade com rateios",
        buttonText: "Conheça +",
        href: "/#centro-custos",
      },
    ],
    sales: [
      {
        image: "",
        highlight: "Matrícula online",
        title: "Landing page + assinatura eletrônica integradas ao CRM",
        buttonText: "Conheça +",
        href: "/#matricula",
      },
      {
        image: "",
        highlight: "CRM Comercial",
        title: "Pipeline por turma, metas e automações de WhatsApp",
        buttonText: "Conheça +",
        href: "/#crm",
      },
      {
        image: "",
        highlight: "Relatórios",
        title: "Dashboards de conversão por campanha, curso e vendedor",
        buttonText: "Conheça +",
        href: "/#relatorios",
      },
      {
        image: "",
        highlight: "Campanhas",
        title: "UTM tracking, metas por consultor e funis segmentados",
        buttonText: "Conheça +",
        href: "/#campanhas",
      },
    ],
    admin: [
      {
        image: "",
        highlight: "Usuários & Permissões",
        title: "Papéis granulares e auditoria por ação",
        buttonText: "Conheça +",
        href: "/#permissoes",
      },
      {
        image: "",
        highlight: "Multiunidades",
        title: "Gestão central com visão e regras por filial",
        buttonText: "Conheça +",
        href: "/#multiunidades",
      },
      {
        image: "",
        highlight: "Integrações",
        title: "Contábil, gateways e WhatsApp prontos para uso",
        buttonText: "Conheça +",
        href: "/#integracoes",
      },
      {
        image: "",
        highlight: "Templates & Fluxos",
        title: "Padronize processos com fluxos e modelos reutilizáveis",
        buttonText: "Conheça +",
        href: "/#fluxos",
      },
    ],
  };

  $: cards = content[activeTab] || [];

  // ===== Carrossel =====
  let viewportEl: HTMLDivElement | null = null;
  let trackEl: HTMLDivElement | null = null;

  $: looped = [...cards, ...cards, ...cards];

  const CARD_W = 460;
  let leadMarginPx = 130;
  let blockSpan = 0;
  let leadIdx = 0;

  // Estados
  let isDragging = false;
  let isSnapping = false;
  let applyLeadStyles = true;
  let raf = 0;
  let hovering = false;

  // Mobile: 1 por vez centralizado
  let isMobile = false;
  function updateIsMobile() {
    if (!browser) return;
    isMobile = window.matchMedia("(max-width: 767px)").matches;
  }

  function getLogicalLeft(i: number, kids: HTMLElement[]) {
    const el = kids[i] as HTMLElement;
    if (!el || !viewportEl) return 0;

    if (isMobile) {
      const w = el.offsetWidth || CARD_W;
      const centerOffset = (viewportEl.clientWidth - w) / 2;
      return el.offsetLeft - centerOffset;
    } else {
      const ml = applyLeadStyles && i === leadIdx ? leadMarginPx : 0;
      return el.offsetLeft - ml;
    }
  }

  async function measureAndCenter() {
    if (isMeasuring) return;
    isMeasuring = true;
    await tick();
    if (!trackEl || !viewportEl) {
      isMeasuring = false;
      return;
    }

    const kids = Array.from(trackEl.children) as HTMLElement[];
    const N = cards.length;
    if (kids.length < N * 3) {
      isMeasuring = false;
      return;
    }

    applyLeadStyles = true;
    leadIdx = N;
    const firstB = N,
      firstC = 2 * N;
    blockSpan = getLogicalLeft(firstC, kids) - getLogicalLeft(firstB, kids);
    jumpToIndex(leadIdx);
    isMeasuring = false;
  }

  function jumpToIndex(idx: number) {
    if (!viewportEl || !trackEl) return;
    const kids = Array.from(trackEl.children) as HTMLElement[];
    const targetLeft = getLogicalLeft(idx, kids);
    const prev = viewportEl.style.scrollBehavior;
    viewportEl.style.scrollBehavior = "auto";
    viewportEl.scrollLeft = Math.max(0, targetLeft);
    viewportEl.style.scrollBehavior = prev || "auto";
  }

  function normalizeToMiddle() {
    if (!browser || !viewportEl || !trackEl || !blockSpan) return;
    if (isDragging || isSnapping || hovering || raf !== 0) return;

    const kids = Array.from(trackEl.children) as HTMLElement[];
    const N = cards.length;

    const leftB = getLogicalLeft(N, kids);
    const leftC = getLogicalLeft(2 * N, kids);

    if (viewportEl.scrollLeft < leftB - CARD_W) {
      viewportEl.scrollLeft += blockSpan;
    } else if (viewportEl.scrollLeft > leftC + CARD_W) {
      viewportEl.scrollLeft -= blockSpan;
    }
  }

  function nearestIndexRaw() {
    if (!viewportEl || !trackEl) return 0;
    const kids = Array.from(trackEl.children) as HTMLElement[];
    const target = viewportEl.scrollLeft;
    let idx = 0,
      best = Infinity;

    for (let i = 0; i < kids.length; i++) {
      const el = kids[i] as HTMLElement;
      const logical = isMobile
        ? el.offsetLeft -
          (viewportEl.clientWidth - (el.offsetWidth || CARD_W)) / 2
        : el.offsetLeft; // sem margem
      const d = Math.abs(logical - target);
      if (d < best) {
        best = d;
        idx = i;
      }
    }
    return idx;
  }

  function startSnap() {
    if (!viewportEl || !trackEl) return;
    if (isSnapping) return; // evita múltiplos snaps
    isSnapping = true;
    applyLeadStyles = false;

    leadIdx = nearestIndexRaw();
    const kids = Array.from(trackEl.children) as HTMLElement[];
    const target = getLogicalLeft(leadIdx, kids);

    const prev = viewportEl.style.scrollBehavior;
    viewportEl.style.scrollBehavior = "smooth";
    viewportEl.scrollTo({ left: Math.max(0, target), behavior: "smooth" });

    let stableFrames = 0;
    let last = viewportEl.scrollLeft;

    function watch() {
      if (!viewportEl) return;
      const curr = viewportEl.scrollLeft;
      const diff = Math.abs(curr - last);
      last = curr;

      if (diff < 0.2) {
        stableFrames++;
        if (stableFrames >= 6) {
          // ~100ms parado
          viewportEl.style.scrollBehavior = prev || "auto";
          isSnapping = false;
          applyLeadStyles = true;
          normalizeToMiddle(); // só no fim real
          return;
        }
      } else {
        stableFrames = 0;
      }
      requestAnimationFrame(watch);
    }

    requestAnimationFrame(watch);
  }

  // ===== Interação =====
  let startX = 0,
    startScrollLeft = 0;
  let v = 0,
    lastX = 0,
    lastT = 0;

  function cancelMomentum() {
    if (raf) cancelAnimationFrame(raf);
    raf = 0;
    v = 0;
  }

  function onPointerDown(e: PointerEvent) {
    if (!viewportEl) return;
    cancelMomentum();

    isDragging = true;
    isSnapping = false;
    applyLeadStyles = false;
    viewportEl.style.scrollBehavior = "auto";

    viewportEl.setPointerCapture(e.pointerId);
    startX = e.clientX;
    startScrollLeft = viewportEl.scrollLeft;
    lastX = e.clientX;
    lastT = performance.now();
  }

  function onPointerMove(e: PointerEvent) {
    if (!isDragging || !viewportEl) return;

    viewportEl.scrollLeft = startScrollLeft + (startX - e.clientX);

    const now = performance.now();
    const dx = e.clientX - lastX;
    const dt = Math.max(1, now - lastT);
    const instV = -(dx / dt);
    const alpha = 0.2;
    v = v * (1 - alpha) + instV * alpha;
    lastX = e.clientX;
    lastT = now;
  }

  function onPointerUp(e: PointerEvent) {
    if (!viewportEl) return;
    isDragging = false;
    try {
      viewportEl.releasePointerCapture(e.pointerId);
    } catch {}

    // inércia
    const frictionBase = 0.97;
    const minV = 0.05;
    let prevT = performance.now();
    let hasSnapped = false;

    const step = (t: number) => {
      if (!viewportEl) return;
      const dt = Math.min(48, Math.max(1, t - prevT));
      prevT = t;

      viewportEl.scrollLeft += v * dt;
      v *= Math.pow(frictionBase, dt / 16.67);

      if (Math.abs(v) > minV) {
        raf = requestAnimationFrame(step);
      } else if (!hasSnapped) {
        // só 1 snap, sem repetição
        hasSnapped = true;
        raf = 0;
        requestAnimationFrame(() => {
          if (!isDragging && !hovering) startSnap();
        });
      }
    };

    raf = requestAnimationFrame(step);
  }

  function onScroll() {
    if (hovering || isDragging || isSnapping || raf !== 0) return;
    normalizeToMiddle();
  }

  function onMouseEnter() {
    hovering = true;
    cancelMomentum(); // cancela qualquer movimento residual
    isSnapping = false;
  }
  function onMouseLeave() {
    hovering = false;
    // apenas normalize se o usuário realmente soltou o scroll há um tempo
    setTimeout(() => {
      if (!hovering && !isDragging && !isSnapping && raf === 0) {
        normalizeToMiddle();
      }
    }, 400); // pequeno atraso evita “pulo” ao sair rápido
  }

  // medir apenas no client
  $: if (browser && cards) measureAndCenter();

  let ro: ResizeObserver | null = null;
  onMount(() => {
    if (!browser) return;
    updateIsMobile();
    window.addEventListener("resize", updateIsMobile);

    if (viewportEl) {
      ro = new ResizeObserver(() => measureAndCenter());
      ro.observe(viewportEl);
    }
  });
  onDestroy(() => {
    if (!browser) return;
    window.removeEventListener("resize", updateIsMobile);
    ro?.disconnect();
  });
</script>

<section class="mt-12 lg:mt-0 lg:p-12 bg-white/50">
  <div
    class="container px-0 mx-0 relative overflow-hidden lg:rounded-[28px] bg-[#010D28] text-white"
    style="--lead-margin: {leadMarginPx}px"
  >
    <div class="absolute inset-0 z-0 overflow-hidden">
      <!-- Imagem base com blur e brilho -->
      <img
        src="/booble_bg.webp"
        alt=""
        aria-hidden="true"
        class="pointer-events-none select-none absolute inset-0 w-full h-full
           object-cover opacity-[0.3] rotate-[-250deg] left-[280px] top-[400px] scale-[1.8] blur-[7px]"
      />

      <!-- Camada de ruído -->
      <div
        class="absolute inset-0 z-10 pointer-events-none mix-blend-overlay opacity-[0.08]"
        style="
      background-image: url('/noise.svg');
      background-repeat: repeat;
      background-size: 250px 250px;
    "
      ></div>
    </div>

    <div
      class="absolute -top-40 -left-40 w-[520px] h-[520px] rounded-full
                bg-[radial-gradient(closest-side,rgba(255,255,255,0.08),transparent_70%)] opacity-20"
    ></div>
    <div
      class="absolute -top-[15%] right-0 w-[70%] h-[65%] rotate-[-16deg]
                bg-[linear-gradient(90deg,rgba(255,255,255,0)_0%,rgba(255,255,255,0.10)_40%,rgba(255,255,255,0)_80%)]
                opacity-[0.18]"
    ></div>
    <div
      class="absolute inset-0 pointer-events-none
                bg-[radial-gradient(120%_100%_at_50%_0%,rgba(0,0,0,0)_0%,rgba(0,0,0,0.25)_80%)] opacity-40"
    ></div>

    <div class="relative z-10 py-12 md:py-16">
      <!-- Subtítulo -->
      <div
        class="flex items-center justify-center gap-4 pb-6 text-[#AEB3D9] text-[17px]"
      >
        <span class="inline-block h-px w-12 bg-[#AEB3D9]"></span>
        <span>Nossas Soluções</span>
        <span class="inline-block h-px w-12 bg-[#AEB3D9]"></span>
      </div>

      <!-- Título -->
      <h2
        class="mt-6 text-center px-4 text-[34px] md:text-[48px] leading-tight font-semibold tracking-tight"
      >
        Conheça nossas soluções prontas para melhorar<br
          class="hidden md:block"
        />
        toda a <span class="text-[#EA6D0B]">gestão</span> da sua escola
      </h2>

      <!-- Tabs 236x48 -->
      <div
        class="mt-8 flex flex-wrap items-center justify-center gap-3 md:gap-4"
      >
        {#each tabs as t, i}
          <button
            bind:this={t.el}
            type="button"
            class="w-[236px] h-[48px] rounded-full border text-[16px] tracking-wide transition
                   focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60
                   {activeTab === t.id
              ? 'bg-[#EA6D0B] border-transparent text-[#010D28] font-semibold'
              : 'bg-transparent border-white/30 text-white hover:border-white/60'}"
            on:click={() => (activeTab = t.id)}
            on:keydown={(e) => handleTabKeydown(e, i)}
            aria-pressed={activeTab === t.id}
          >
            {t.label}
          </button>
        {/each}
      </div>

      <!-- Carrossel -->
      <div class="mt-16 relative">
        <div
          class="pointer-events-none absolute inset-y-0 left-0 w-10 bg-gradient-to-r from-[#0B1020] to-transparent"
        ></div>
        <div
          class="pointer-events-none absolute inset-y-0 right-0 w-10 bg-gradient-to-l from-[#0B1020] to-transparent"
        ></div>

        <div
          bind:this={viewportEl}
          class="no-scrollbar overflow-x-auto cursor-grab select-none"
          class:is-dragging={isDragging}
          style="overscroll-behavior-x:contain; touch-action: pan-y; will-change: scroll-position;"
          role="region"
          aria-roledescription="carousel"
          aria-label={`Soluções ${activeTab}`}
          on:scroll={onScroll}
          on:pointerdown={onPointerDown}
          on:pointermove={onPointerMove}
          on:pointerup={onPointerUp}
          on:pointercancel={onPointerUp}
          on:pointerleave={onPointerUp}
          on:mouseenter={onMouseEnter}
          on:mouseleave={onMouseLeave}
        >
          <div bind:this={trackEl} class="flex gap-8 py-1">
            {#each looped as c, i}
              <div
                class="card-wrapper shrink-0"
                class:lead={!isMobile &&
                  !hovering &&
                  !isDragging &&
                  !isSnapping &&
                  raf === 0 &&
                  i === leadIdx}
              >
                <SolutionCard
                  className="w-[460px] h-[460px]"
                  height={460}
                  image={c.image}
                  highlight={c.highlight}
                  title={c.title}
                  buttonText={c.buttonText}
                  href={c.href}
                />
              </div>
            {/each}
          </div>
        </div>
      </div>
    </div>
  </div>
</section>

<style>
  .no-scrollbar {
    scrollbar-width: none;
    -ms-overflow-style: none;
  }
  .no-scrollbar::-webkit-scrollbar {
    display: none;
  }

  /* Classe aplicada via directive: class:is-dragging */
  :global(.is-dragging) {
    cursor: grabbing !important;
    user-select: none;
  }

  .card-wrapper {
    margin-left: 0;
    transition: margin-left 0.4s ease;
    will-change: margin-left;
  }
  .card-wrapper.lead {
    margin-left: var(--lead-margin, 130px);
  }

  @media (max-width: 767px) {
    .card-wrapper,
    .card-wrapper.lead {
      margin-left: 0 !important;
      transition: none;
    }
  }
</style>
