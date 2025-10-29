<script lang="ts">
  import { page } from "$app/stores";
  import { onMount, onDestroy } from "svelte";
  import SocialLinks from "$lib/components/SocialLinks.svelte";

  let isMenuOpen = false;
  let isScrolled = false;

  const socialLinks = [
    { alt: "Facebook", src: "/social_facebook.svg", href: "https://facebook.com" },
    { alt: "LinkedIn", src: "/social_linkedin.svg", href: "https://linkedin.com" },
    { alt: "YouTube", src: "/social_youtube.svg", href: "https://youtube.com" },
    { alt: "Instagram", src: "/social_instagram.svg", href: "https://instagram.com" },
  ];

  const navLinks = [
    { label: "Sobre a F10", href: "/sobre" },
    { label: "Inovação", href: "/inovacao" },
    { label: "Soluções", href: "/solucoes" },
    { label: "Contato", href: "/contato" },
  ];

  $: pathname = $page.url.pathname;

  // === Função que detecta o link ativo ===
  const isActive = (href: string) => {
    const current = pathname;

    // âncoras internas da home (/#)
    if (href.startsWith("/#")) {
      const anchor = href.split("#")[1];
      return current === "/" && typeof window !== "undefined" && window.location.hash === `#${anchor}`;
    }

    // páginas normais ou subrotas
    return current === href || current.startsWith(`${href}/`);
  };

  // === Scroll: aplica sombra ao header ===
  let handleScroll: () => void;
  onMount(() => {
    handleScroll = () => {
      if (typeof window !== "undefined") isScrolled = window.scrollY > 8;
    };
    handleScroll?.();
    if (typeof window !== "undefined") {
      window.addEventListener("scroll", handleScroll, { passive: true });
    }
  });

  onDestroy(() => {
    if (typeof window !== "undefined" && handleScroll) {
      window.removeEventListener("scroll", handleScroll);
    }
  });

  const closeMenu = () => (isMenuOpen = false);
</script>

<!-- HEADER -->
<header
  class="fixed left-0 right-0 z-40 transition-all duration-200
         bg-white/[0.38] backdrop-blur-[2px] supports-[backdrop-filter]:bg-white/[0.38]
         border-b border-slate-200"
  class:shadow-sm={isScrolled}
>
  <div class="container flex items-center py-[30px] h-[120px]">
    <!-- LOGO + MENU -->
    <div class="flex items-center gap-14">
      <a href="/" class="relative flex h-[60px] items-center" aria-label="F10 Software — Início">
        <img src="/logo_f10.svg" alt="F10 Software" class="max-h-full w-auto" />
      </a>

      <nav class="hidden lg:block">
        <ul class="flex items-center gap-[33px]">
          {#each navLinks as link}
            <li>
              <a
                href={link.href}
                class="text-[14px] leading-[18px] font-semibold tracking-normal transition-colors duration-200"
                class:text-[#EA6D0B]={isActive(link.href)}
                class:text-[#010D28]={!isActive(link.href)}
                aria-current={isActive(link.href) ? "page" : undefined}
              >
                {link.label}
              </a>
            </li>
          {/each}
        </ul>
      </nav>
    </div>

    <!-- REDES + CTAs -->
    <div class="ms-auto hidden lg:flex items-center">
      <div class="flex items-center gap-3">
        <SocialLinks links={socialLinks} />
      </div>

      <div class="ml-6 flex h-[48px] items-center gap-[9px]">
        <a
          href="https://ajuda.f10.com.br/kb"
          class="inline-flex h-[48px] items-center justify-center gap-4
                 rounded-[50px] border border-text
                 px-8 py-[13px]
                 text-[16px] font-semibold leading-[22px] tracking-[-0.02em]
                 text-text hover:bg-text hover:text-white transition-colors"
        >
          Já sou cliente
        </a>

        <a
          href="/contato"
          class="inline-flex h-[48px] items-center justify-center gap-2
                 rounded-[50px] bg-primary
                 px-6 py-[13px]
                 text-[16px] font-semibold leading-[22px] tracking-[-0.02em]
                 text-white hover:brightness-95 active:brightness-90 transition"
        >
          Quero uma demonstração
        </a>
      </div>
    </div>

    <!-- BOTÃO MOBILE -->
    <button
      class="ms-auto inline-flex items-center gap-2 rounded-md p-2 lg:hidden hover:bg-slate-100"
      aria-label="Abrir menu"
      on:click={() => (isMenuOpen = !isMenuOpen)}
    >
      <svg class="h-6 w-6" viewBox="0 0 24 24" fill="none">
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
                class:text-[#EA6D0B]={isActive(link.href)}
                on:click={closeMenu}
              >
                {link.label}
              </a>
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
              >Já sou cliente</a
            >

            <a
              href="/contato"
              class="flex-1 inline-flex h-[48px] items-center justify-center gap-2
                     rounded-[50px] bg-primary
                     px-6 py-[13px]
                     text-[16px] font-semibold leading-[22px] tracking-[-0.02em]
                     text-white hover:brightness-95 active:brightness-90 transition"
              on:click={closeMenu}
              >Demonstração</a
            >
          </li>
        </ul>
      </nav>
    </div>
  {/if}
</header>

<!-- Espaçador para compensar header fixo -->
<div class="h-[120px]"></div>
