<script lang="ts">
  import { page } from "$app/stores";
  import { onMount, onDestroy, tick } from "svelte";
  import { showSolutionsPopUp } from "$lib/stores/solutionsPopup";
  import {
    LayoutGrid,
    Megaphone,
    Handshake,
    Smartphone,
    MonitorPlay,
    GraduationCap,
    Wallet,
    BarChart3,
    ArrowRight,
    ChevronDown,
  } from "lucide-svelte";

  // ===== Props =====
  export let title: string = "Soluções da F10";
  export let subtitle: string =
    "Escolha um módulo para ver detalhes, benefícios e resultados práticos.";

  // pt-BR: Tipando icon como any para evitar bug do TS/LSP (ts(-1)).
  type SolutionLink = {
    label: string;
    href: string;
    description?: string;
    icon: any;
  };

  const allSolutionsLink: SolutionLink = {
    label: "Todas as soluções",
    href: "/solucoes",
    description: "Visão geral do ecossistema completo da F10.",
    icon: LayoutGrid,
  };

  const solutionLinks: SolutionLink[] = [
    {
      label: "Marketing e Captação",
      href: "/solucoes/marketing",
      description: "Atraia leads, automatize campanhas e aumente matrículas.",
      icon: Megaphone,
    },
    {
      label: "Comercial / CRM",
      href: "/solucoes/comercial",
      description: "Funil, tarefas, follow-up e conversão com rastreio.",
      icon: Handshake,
    },
    {
      label: "App Smart Aluno",
      href: "/solucoes/aplicativo-smart-aluno",
      description: "Comunicação e engajamento com alunos e responsáveis.",
      icon: Smartphone,
    },
    {
      label: "AVA / Portal do Aluno",
      href: "/solucoes/ambiente-virtual-de-aprendizado-ava",
      description: "Conteúdo, atividades e rotina escolar em um só lugar.",
      icon: MonitorPlay,
    },
    {
      label: "Pedagógico e Secretaria",
      href: "/solucoes/pedagogico",
      description: "Matrículas, turmas, documentos e rotinas acadêmicas.",
      icon: GraduationCap,
    },
    {
      label: "Financeiro",
      href: "/solucoes/financeiro",
      description: "Cobrança, inadimplência, DRE e visão de caixa.",
      icon: Wallet,
    },
    {
      label: "Indicadores e BI",
      href: "/solucoes/indicadores-e-bi",
      description: "Dashboards e métricas para decisões rápidas e seguras.",
      icon: BarChart3,
    },
  ];

  $: pathname = $page.url.pathname;

  function isActive(href: string): boolean {
    return pathname === href || pathname.startsWith(`${href}/`);
  }

  function cardClasses(active: boolean): string {
    return [
      "group relative flex items-center justify-between gap-4 rounded-[14px]",
      "border px-4 py-4 transition hover:shadow-sm",
      active
        ? "border-[#000A57] bg-[#000A57]/[0.04]"
        : "border-[#E6E8F5] bg-white",
    ].join(" ");
  }

  function titleClasses(active: boolean): string {
    return `text-[14px] font-semibold ${
      active ? "text-[#EA6D0B]" : "text-[#010D28]"
    }`;
  }

  function closeModal() {
    showSolutionsPopUp.set(false);
  }

  // ===== Botão flutuante "rolar mais" (aparece só se tiver overflow e some no fim) =====
  let scrollEl: HTMLDivElement | null = null;
  let showScrollHint = false;

  function updateScrollHint() {
    if (!scrollEl) return;

    const { scrollTop, scrollHeight, clientHeight } = scrollEl;
    const hasOverflow = scrollHeight > clientHeight + 2;
    const atBottom = scrollTop + clientHeight >= scrollHeight - 6;

    showScrollHint = hasOverflow && !atBottom;
  }

  function scrollMore() {
    if (!scrollEl) return;
    const step = Math.max(260, Math.floor(scrollEl.clientHeight * 0.8));
    scrollEl.scrollBy({ top: step, behavior: "smooth" });
  }

  // pt-BR: garante cálculo inicial depois do render (importante quando abre o modal)
  onMount(() => {
    tick().then(() => {
      updateScrollHint();
    });

    const onResize = async () => {
      await tick();
      updateScrollHint();
    };

    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  });
</script>

<!-- pt-BR: Card com altura limitada para permitir scroll interno -->
<div
  class="rounded-[16px] bg-white
         max-h-[min(78svh,720px)] md:max-h-[min(70svh,780px)]
         flex flex-col"
>
  <div class="p-6 md:p-7 lg:p-8 flex flex-col min-h-0">
    <!-- Header fixo (não rola) -->
    <div class="shrink-0">
      <h3 class="text-[22px] md:text-[24px] font-semibold text-[#000A57]">
        {title}
      </h3>
      <p class="mt-1 text-[13px] md:text-[14px] text-[#7E82A2]">
        {subtitle}
      </p>
    </div>

    <!-- pt-BR: Área rolável (mantida igual a sua) -->
    <div
      bind:this={scrollEl}
      on:scroll={updateScrollHint}
      class="mt-6 min-h-0 flex-1 overflow-y-auto overscroll-contain pr-1 touch-pan-y
             [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden
             [-webkit-overflow-scrolling:touch]"
    >
      <div class="grid grid-cols-1 md:grid-cols-2 gap-3 pb-14">
        <!-- Todas as soluções -->
        <a
          href={allSolutionsLink.href}
          on:click={closeModal}
          class={cardClasses(isActive(allSolutionsLink.href))}
          aria-current={isActive(allSolutionsLink.href) ? "page" : undefined}
        >
          <div class="flex items-center gap-3 min-w-0">
            <span
              class="flex h-10 w-10 shrink-0 items-center justify-center rounded-full
                     bg-slate-100 text-[#010D28] group-hover:bg-slate-200 transition"
            >
              <svelte:component this={allSolutionsLink.icon} size={18} />
            </span>

            <div class="min-w-0">
              <div class={titleClasses(isActive(allSolutionsLink.href))}>
                {allSolutionsLink.label}
              </div>

              {#if allSolutionsLink.description}
                <div class="mt-0.5 text-[12px] text-[#7E82A2] line-clamp-2">
                  {allSolutionsLink.description}
                </div>
              {/if}
            </div>
          </div>

          <ArrowRight
            class="h-4 w-4 shrink-0 text-[#010D28]/50 group-hover:text-[#010D28] transition"
          />
        </a>

        {#each solutionLinks as item (item.href)}
          <a
            href={item.href}
            on:click={closeModal}
            class={cardClasses(isActive(item.href))}
            aria-current={isActive(item.href) ? "page" : undefined}
          >
            <div class="flex items-center gap-3 min-w-0">
              <span
                class="flex h-10 w-10 shrink-0 items-center justify-center rounded-full
                       bg-slate-100 text-[#010D28] group-hover:bg-slate-200 transition"
              >
                <svelte:component this={item.icon} size={18} />
              </span>

              <div class="min-w-0">
                <div class={titleClasses(isActive(item.href))}>
                  {item.label}
                </div>

                {#if item.description}
                  <div class="mt-0.5 text-[12px] text-[#7E82A2] line-clamp-2">
                    {item.description}
                  </div>
                {/if}
              </div>
            </div>

            <ArrowRight
              class="h-4 w-4 shrink-0 text-[#010D28]/50 group-hover:text-[#010D28] transition"
            />
          </a>
        {/each}
      </div>

      <!-- Fade no fundo + botão flutuante (sticky dentro do scroll) -->
      {#if showScrollHint}
        <div class="sticky bottom-0 left-0 right-0 pointer-events-none">
          <div class="h-16 bg-gradient-to-t from-white to-white/0"></div>

          <div class="absolute inset-x-0 bottom-3 flex justify-center">
            <button
              type="button"
              class="pointer-events-auto inline-flex items-center gap-2 rounded-full
                     border border-slate-200 bg-[#0B1020] text-white px-3 py-1.5 shadow-sm
                     hover:bg-white transition"
              on:click={scrollMore}
              aria-label="Rolar para ver mais soluções"
            >
              <span class="text-[12px] text-white/70">Role para ver mais</span>
              <ChevronDown class="h-4 w-4 text-white animate-bounce" />
            </button>
          </div>
        </div>
      {/if}
    </div>

    <!-- Rodapé fixo (não rola) -->
    <div class="mt-4 shrink-0 text-[12px] text-[#7E82A2]">
      Dica: comece por
      <span class="font-semibold text-[#010D28]">Marketing</span>
      e <span class="font-semibold text-[#010D28]">Comercial</span> para acelerar matrículas.
    </div>
  </div>
</div>
