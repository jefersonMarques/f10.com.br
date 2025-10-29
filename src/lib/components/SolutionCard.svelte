<script lang="ts">
  /** Card de solução reutilizável (460x460 por padrão)
   * Props:
   * - image: string (URL da imagem de fundo)
   * - highlight: string (texto destaque no topo – ex.: “APP Smart Aluno”)
   * - title: string (título/descrição do card)
   * - buttonText: string (texto do botão)
   * - href: string (link do botão)
   * - width/height: number (opcionais; default 460x460)
   * - className: string (classes extras opcionais no <article>)
   */
  export let image = "";
  export let highlight = "";
  export let title = "";
  export let buttonText = "";
  export let href = "#";
  export let width: number = 460;
  export let height: number = 460;
  export let className = "";
</script>

<article
  class={`snap-center shrink-0 w-[460px] h-[460px]
                     relative overflow-hidden rounded-[28px]
                     border border-[10px] border-[rgba(255,255,255,0.22)]   /* branco transparente */
                     shadow-[0_12px_40px_rgba(1,13,40,0.25)] ${className}`}
  style={`width:${width}px; height:${height}px;`}
  aria-label={title}
>
  <!-- Borda interna -->
  <div
    class="absolute inset-0 rounded-[28px] ring-1 ring-inset ring-white/10 pointer-events-none"
  ></div>

  {#if image}
    <img
      src={image}
      alt=""
      width="460"
      height="460"
      class="absolute inset-0 w-full h-full object-cover will-change-transform"
      loading="lazy"
      decoding="async"
    />
  {/if}

  <!-- Vignette -->
  <div
    class="absolute inset-0 bg-[linear-gradient(180deg,rgba(1,13,40,0.30)_0%,#000A57)]"
  ></div>

  <!-- Conteúdo -->
  <div class="relative z-10 p-6 md:p-7 lg:p-8 flex flex-col h-full text-white">
    <!-- Destaque -->
    {#if highlight}
      <div class="flex items-center gap-3 text-sm text-white/90">
        <span class="inline-block h-[2px] w-12 bg-white/50"></span>
        <span class="font-medium text-[17px]">{highlight}</span>
      </div>
    {/if}

    <div class="flex flex-col mt-auto">
      <!-- Título -->
      {#if title}
        <h3 class="text-[20px] leading-snug md:text-[24px] font-semibold mb-5">
          {title}
        </h3>
      {/if}

      <!-- CTA -->
      {#if buttonText}
        <div class="mt-auto pt-6">
          <a
            {href}
            class="inline-flex items-center justify-center px-5 rounded-full
                 text-[14px] font-semibold w-[146px] h-[50px]
                 border border-[#EA6D0B]/60 text-white
                 hover:border-[#EA6D0B] hover:bg-[#EA6D0B]/10
                 transition"
          >
            {buttonText}
          </a>
        </div>
      {/if}
    </div>
  </div>

  <!-- Hover glow -->
  <div
    class="pointer-events-none absolute inset-0 opacity-0 hover:opacity-100 transition
              bg-[radial-gradient(120%_80%_at_80%_20%,rgba(234,109,11,0.18)_0%,transparent_60%)]"
  ></div>
</article>
