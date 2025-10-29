<script lang="ts">
  /**
   * Componente de ícones sociais
   * 
   * Props:
   * - links: lista de objetos { alt, src, href }
   * - size: tamanho opcional dos ícones (padrão: 44px)
   * 
   * Exemplo de uso:
   * <SocialLinks links={[
   *   { alt: 'Facebook', src: '/social_facebook.svg', href: 'https://facebook.com' },
   *   { alt: 'LinkedIn', src: '/social_linkedin.svg', href: 'https://linkedin.com' },
   * ]} />
   */
  export let links: { alt: string; src: string; href: string }[] = [];
  export let size: number = 44;
</script>

<div class="flex items-center gap-3">
  {#each links as s}
    <a
      href={s.href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={s.alt}
      class="grid place-items-center rounded-full
             bg-[rgba(126,130,162,0.12)] hover:bg-[rgba(126,130,162,0.18)]
             transition-colors"
      style="width: {size}px; height: {size}px;"
    >
      <img src={s.src} alt={s.alt} class="h-6 w-6" />
    </a>
  {/each}
</div>
