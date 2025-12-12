<script lang="ts">
  import { page } from "$app/stores";
  import { onMount, onDestroy } from "svelte";
  import SocialLinks from "$lib/components/SocialLinks.svelte";
  import {
    ChevronDown,
    LayoutGrid,
    Megaphone,
    GraduationCap,
    Wallet,
    Handshake,
    MonitorPlay,
    Smartphone,
    BarChart3,
  } from "lucide-svelte";
  import { contactModalConfig } from "$lib/stores/contactModals";
  import { showForm } from "$lib/stores/formPopup";
  import PopupCustomer from "./popup/PopupCustomer.svelte";

  // ===== Estado do menu =====
  let isMenuOpen = false;
  let openDropdown: string | null = null; // para Soluções (ou outros no futuro)

  $: pathname = $page.url.pathname;

  // ===== Tipos =====
  type IconComponent = typeof LayoutGrid;

  type NavChild = {
    label: string;
    href: string;
    icon: IconComponent;
  };

  type NavLink = {
    label: string;
    href: string;
    children?: NavChild[];
  };

  // ===== Redes sociais =====
  const socialLinks = [
    {
      alt: "Facebook",
      src: "/social_facebook.svg",
      href: "https://www.facebook.com/F10Software",
    },
    {
      alt: "LinkedIn",
      src: "/social_linkedin.svg",
      href: "linkedin.com/company/f10software/",
    },
    {
      alt: "YouTube",
      src: "/social_youtube.svg",
      href: "https://www.youtube.com/@f10software76",
    },
    {
      alt: "Instagram",
      src: "/social_instagram.svg",
      href: "https://www.instagram.com/f10software/",
    },
  ];

  // ===== Sub-itens de Soluções (com ícones) =====
  const solutionsLinks: NavChild[] = [
    {
      label: "Todas as soluções",
      href: "/solucoes",
      icon: LayoutGrid,
    },
    {
      label: "Marketing e Captação",
      href: "/solucoes/marketing",
      icon: Megaphone,
    },
    {
      label: "Comercial / CRM",
      href: "/solucoes/comercial",
      icon: Handshake,
    },
    {
      label: "App Smart Aluno",
      href: "/solucoes/aplicativo-smart-aluno",
      icon: Smartphone,
    },
    {
      label: "AVA / Portal do Aluno",
      href: "/solucoes/ambiente-virtual-de-aprendizado-ava",
      icon: MonitorPlay,
    },

    {
      label: "Pedagógico e Secretaria",
      href: "/solucoes/pedagogico",
      icon: GraduationCap,
    },
    {
      label: "Financeiro",
      href: "/solucoes/financeiro",
      icon: Wallet,
    },
    {
      label: "Indicadores e BI",
      href: "/solucoes/indicadores-e-bi",
      icon: BarChart3,
    },
  ];

  // ===== Navegação principal =====
  const navLinks: NavLink[] = [
    { label: "Sobre a F10", href: "/sobre" },
    { label: "Inovação", href: "/inovacao-na-escola" },
    { label: "Soluções", href: "/solucoes", children: solutionsLinks },
    { label: "Contato", href: "/contato" },
    { label: "Preço", href: "/preco" },
  ];

  const isActive = (href: string) => {
    const current = pathname;
    if (href.startsWith("/#")) {
      const anchor = href.split("#")[1];
      return (
        current === "/" &&
        typeof window !== "undefined" &&
        window.location.hash === `#${anchor}`
      );
    }
    return current === href || current.startsWith(`${href}/`);
  };

  const isParentActive = (link: NavLink) => {
    if (isActive(link.href)) return true;
    if (!link.children) return false;
    return link.children.some((child) => isActive(child.href));
  };

  const dropdownId = (link: NavLink) => link.href;

  const toggleDropdown = (link: NavLink) => {
    const id = dropdownId(link);
    openDropdown = openDropdown === id ? null : id;
  };

  // ===== Delay para fechar dropdown (hover intent) =====
  let dropdownCloseTimeout: ReturnType<typeof setTimeout> | null = null;

  const scheduleCloseDropdown = (id: string) => {
    // só agenda se o que está aberto for esse id
    dropdownCloseTimeout = setTimeout(() => {
      if (openDropdown === id) {
        openDropdown = null;
      }
    }, 150); // ~150ms de folga pro mouse atravessar
  };

  const cancelCloseDropdown = () => {
    if (dropdownCloseTimeout) {
      clearTimeout(dropdownCloseTimeout);
      dropdownCloseTimeout = null;
    }
  };

  // Fecha dropdown ao clicar fora
  const handleDocumentClick = () => {
    openDropdown = null;
  };

  // ===== Hide-on-scroll com sticky =====
  let isScrolled = false;
  let isHeaderHidden = false;
  let isAtTop = true;
  let lastScrollY = 0;
  let ticking = false;
  const HIDE_OFFSET = 48;
  let showCustomer = false;

  function updateHeaderOnScroll() {
    if (typeof window === "undefined") return;

    const rawY = window.scrollY;
    const y = rawY < 0 ? 0 : rawY;
    const dy = y - lastScrollY;

    isScrolled = y > 8;
    isAtTop = y <= 0;

    // se o menu mobile está aberto, não esconder o header
    if (isMenuOpen) {
      isHeaderHidden = false;
      lastScrollY = y;
      return;
    }

    if (dy > 0 && y > HIDE_OFFSET) {
      isHeaderHidden = true;
    } else if (dy < 0) {
      isHeaderHidden = false;
    }

    lastScrollY = y;
  }

  let handleScroll: () => void;

  onMount(() => {
    if (typeof window !== "undefined") {
      lastScrollY = window.scrollY || 0;
      isScrolled = lastScrollY > 8;
      isAtTop = (window.scrollY || 0) <= 0;

      handleScroll = () => {
        if (!ticking) {
          ticking = true;
          requestAnimationFrame(() => {
            updateHeaderOnScroll();
            ticking = false;
          });
        }
      };

      window.addEventListener("scroll", handleScroll, { passive: true });
      window.addEventListener("click", handleDocumentClick);
    }
  });

  onDestroy(() => {
    if (typeof window !== "undefined") {
      if (handleScroll) {
        window.removeEventListener("scroll", handleScroll);
      }
      window.removeEventListener("click", handleDocumentClick);
    }
  });

  const closeMenu = () => {
    isMenuOpen = false;
    openDropdown = null;
  };

  // ===== Classes calculadas para o <header> =====
  const baseHeader =
    "sticky top-0 z-40 transition-[transform,background-color,backdrop-filter] duration-200 will-change-transform border-b border-slate-200";

  $: bgHeader = isAtTop ? "bg-white/50 backdrop-blur-md" : "bg-white";

  $: translateClass = isHeaderHidden ? "-translate-y-full" : "";
  $: shadowClass = isScrolled ? "shadow-sm" : "";
  $: headerClass = `${baseHeader} ${bgHeader} ${translateClass} ${shadowClass}`;

  function openPlansDemoModal() {
    contactModalConfig.set({
      defaultMessage: "Quero agendar uma demonstração",
      product: "F10 – Planos e Implantação",
      subSource: "Modal de contato – Menu",
      leadDescription: "Contato iniciado pelo formulário do menu.",
    });

    showForm.set(true); // abre o Popup global
  }

  function openHeaderModal() {
    contactModalConfig.set({
      defaultMessage: "Quero agendar uma demonstração",
      product: "F10 – Software",
      subSource: "Modal Header Mobile",
      leadDescription: "Contato iniciado pelo formulário do menu. Mobile",
    });

    showForm.set(true);
  }
</script>

<!-- HEADER (sticky) -->
<!-- svelte-ignore a11y_click_events_have_key_events -->
<!-- svelte-ignore a11y_no_static_element_interactions -->
<header class={headerClass} on:click|stopPropagation>
  <div class="container flex items-center py-[30px]">
    <!-- LOGO + MENU -->
    <div class="flex items-center gap-14">
      <a
        href="/"
        class="relative flex h-[50px] lg:h-[60px] items-center"
        aria-label="F10 Software — Início"
      >
        <img src="/logo_f10.svg" alt="F10 Software" class="max-h-full w-auto" />
      </a>

      <!-- NAV DESKTOP -->
      <nav class="hidden lg:block">
        <ul class="flex items-center gap-[33px]">
          {#each navLinks as link}
            <li
              class="relative"
              on:mouseenter={() => {
                cancelCloseDropdown();
                if (link.children) openDropdown = dropdownId(link);
              }}
              on:mouseleave={() => {
                if (link.children) scheduleCloseDropdown(dropdownId(link));
              }}
            >
              {#if link.children}
                <!-- Trigger com ícone de seta -->
                <button
                  type="button"
                  class="inline-flex items-center gap-1 text-[14px] leading-[18px]
                         font-semibold tracking-normal transition-colors duration-200"
                  class:text-[#EA6D0B]={isParentActive(link)}
                  class:text-[#010D28]={!isParentActive(link)}
                  aria-expanded={openDropdown === dropdownId(link)}
                  aria-haspopup="true"
                  on:click={(e) => {
                    // clique ainda funciona (teclado / acessibilidade),
                    // mas hover é o principal
                    e.stopPropagation();
                    cancelCloseDropdown();
                    toggleDropdown(link);
                  }}
                >
                  <span>{link.label}</span>
                  <ChevronDown
                    class={`h-4 w-4 transition-transform ${
                      openDropdown === dropdownId(link) ? "rotate-180" : ""
                    }`}
                  />
                </button>

                {#if openDropdown === dropdownId(link)}
                  <!-- Dropdown de Soluções (hover + clique, com delay pra fechar) -->
                  <div
                    class="absolute left-1/2 top-full z-50 mt-3 w-[320px]
                           -translate-x-1/2 rounded-2xl bg-white shadow-xl
                           ring-1 ring-slate-200/80"
                    on:mouseenter={cancelCloseDropdown}
                    on:mouseleave={() =>
                      scheduleCloseDropdown(dropdownId(link))}
                    on:click|stopPropagation
                  >
                    <ul class="py-2">
                      {#each link.children as child}
                        <li>
                          <a
                            href={child.href}
                            class="flex items-center gap-2 px-4 py-2.5 text-[14px] leading-[1.4]
                                   text-slate-700 hover:bg-slate-50 hover:text-[#EA6D0B]"
                            class:text-[#EA6D0B]={isActive(child.href)}
                            on:click={() => (openDropdown = null)}
                          >
                            <span
                              class="flex h-7 w-7 items-center justify-center rounded-full
                                     bg-slate-100 text-slate-700"
                            >
                              <svelte:component this={child.icon} size={16} />
                            </span>
                            <span>{child.label}</span>
                          </a>
                        </li>
                      {/each}
                    </ul>
                  </div>
                {/if}
              {:else}
                <!-- Link simples sem submenu -->
                <a
                  href={link.href}
                  class="text-[14px] leading-[18px] font-semibold tracking-normal transition-colors duration-200"
                  class:text-[#EA6D0B]={isActive(link.href)}
                  class:text-[#010D28]={!isActive(link.href)}
                  aria-current={isActive(link.href) ? "page" : undefined}
                >
                  {link.label}
                </a>
              {/if}
            </li>
          {/each}
        </ul>
      </nav>
    </div>

    <!-- REDES + CTAs DESKTOP -->
    <div class="ms-auto hidden lg:flex items-center">
      <div class="flex items-center gap-3">
        <SocialLinks links={socialLinks} />
      </div>

      <div class="ml-6 flex h-[48px] items-center gap-[9px]">
        <!--href="https://ajuda.f10.com.br/kb"-->
        <button
          on:click={() => (showCustomer = true)}
          class="inline-flex h-[48px] items-center justify-center gap-4
                 rounded-[50px] border border-text
                 px-8 py-[13px]
                 text-[16px] font-semibold leading-[22px] tracking-[-0.02em]
                 text-text hover:bg-text hover:text-white transition-colors"
        >
          Já sou cliente
        </button>

        <!-- svelte-ignore a11y_missing_attribute -->
        <button
          type="button"
          on:click={openPlansDemoModal}
          class="inline-flex h-[48px] items-center justify-center gap-2
                 rounded-[50px] bg-primary
                 px-6 py-[13px]
                 text-[16px] font-semibold leading-[22px] tracking-[-0.02em]
                 text-white hover:brightness-95 active:brightness-90 transition"
        >
          Quero uma demonstração
        </button>
      </div>
    </div>

    <!-- BOTÃO MOBILE -->
    <button
      class="ms-auto inline-flex items-center gap-2 rounded-md p-2 lg:hidden hover:bg-slate-100"
      aria-label="Abrir menu"
      on:click={() => {
        isMenuOpen = !isMenuOpen;
        if (!isMenuOpen) openDropdown = null;
      }}
    >
      <svg class="h-6 w-6" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path
          d="M4 6h16M4 12h16M4 18h16"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
        />
      </svg>
    </button>
  </div>

  <!-- DRAWER MOBILE -->
  {#if isMenuOpen}
    <div class="border-t border-slate-200 bg-white lg:hidden">
      <nav class="container py-3">
        <ul class="flex flex-col gap-2">
          {#each navLinks as link}
            <li>
              <a
                href={link.href}
                class="block rounded-md px-3 py-2 text-[14px] font-semibold leading-[18px] hover:bg-slate-100"
                class:text-[#EA6D0B]={isParentActive(link)}
                on:click={closeMenu}
              >
                {link.label}
              </a>

              {#if link.children}
                <!-- Sub-itens de Soluções no mobile -->
                <ul class="mt-1 mb-1 pl-4 border-l border-slate-200 space-y-1">
                  {#each link.children as child}
                    <li>
                      <a
                        href={child.href}
                        class="flex items-center gap-2 rounded-md px-3 py-1.5 text-[13px] text-slate-700 hover:bg-slate-100"
                        class:text-[#EA6D0B]={isActive(child.href)}
                        on:click={closeMenu}
                      >
                        <span
                          class="flex h-6 w-6 items-center justify-center rounded-full
                                 bg-slate-100 text-slate-700"
                        >
                          <svelte:component this={child.icon} size={14} />
                        </span>
                        <span>{child.label}</span>
                      </a>
                    </li>
                  {/each}
                </ul>
              {/if}
            </li>
          {/each}

          <li class="mt-2 flex items-center gap-2">
            <a
              href="https://ajuda.f10.com.br/kb"
              class="flex-1 inline-flex h-[48px] items-center justify-center gap-4
                     rounded-[50px] border border-text
                     px-2 py-[13px]
                     text-[16px] font-semibold leading-[22px] tracking-[-0.02em]
                     text-text hover:bg-text hover:text-white transition-colors"
              on:click={closeMenu}
            >
              Já sou cliente
            </a>

            <button
              on:click={openHeaderModal}
              type="button"
              class="flex-1 inline-flex h-[48px] items-center justify-center gap-2
                     rounded-[50px] bg-primary
                     px-6 py-[13px]
                     text-[16px] font-semibold leading-[22px] tracking-[-0.02em]
                     text-white hover:brightness-95 active:brightness-90 transition"
              on:click={closeMenu}
            >
              Demonstração
            </button>
          </li>
        </ul>
      </nav>
    </div>
  {/if}

  <PopupCustomer bind:open={showCustomer} />
</header>
