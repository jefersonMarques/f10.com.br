<script lang="ts">
  import { page } from "$app/stores";

  // Botões para redirecionar o usuário
  const shortcuts = [
    {
      label: "Voltar para a página inicial",
      href: "/"
    },
    {
      label: "Ver todas as soluções",
      href: "/solucoes"
    },
    {
      label: "Planos e preços",
      href: "/preco"
    },
    {
      label: "Falar com nossa equipe",
      href: "/contato"
    }
  ];
</script>

<svelte:head>
  <title>{$page.status === 404 ? "Página não encontrada | F10" : "Erro | F10"}</title>
  <meta
    name="description"
    content={$page.status === 404
      ? "A página que você tentou acessar não foi encontrada. Veja outras áreas do F10 que podem ajudar o seu colégio."
      : "Aconteceu um erro inesperado. Estamos aqui para ajudar você a voltar para o caminho certo."}
  />
</svelte:head>

<section class="min-h-screen flex items-center justify-center bg-slate-50 px-4">
  <div
    class="w-full max-w-3xl mx-auto text-center flex flex-col items-center gap-8 py-12"
  >
    <!-- Imagem centralizada -->
    <div class="w-full max-w-sm">
      <img
        src="/error_404.webp"
        alt="Ilustração de página não encontrada"
        class="w-full h-auto mx-auto"
        loading="lazy"
      />
    </div>

    <!-- Conteúdo de texto -->
    <div class="space-y-3">
      {#if $page.status === 404}
        <p class="text-xl font-semibold tracking-[0.2em] uppercase text-sky-500">
          erro 404
        </p>
        <h1
          class="text-3xl md:text-4xl font-semibold tracking-tight text-slate-900"
        >
          Essa página não existe mais (ou nunca existiu).
        </h1>
        <p class="mt-2 text-base md:text-lg text-slate-600 max-w-xl mx-auto">
          Talvez o link esteja desatualizado, ou houve um erro de digitação.
          Mas está tudo bem: separamos alguns caminhos rápidos para você
          continuar navegando pelo F10.
        </p>
      {:else}
        <p class="text-sm font-semibold tracking-[0.2em] uppercase text-amber-500">
          algo saiu do previsto
        </p>
        <h1
          class="text-3xl md:text-4xl font-semibold tracking-tight text-slate-900"
        >
          Encontramos um erro ao carregar esta página.
        </h1>
        <p class="mt-2 text-base md:text-lg text-slate-600 max-w-xl mx-auto">
          Isso pode ser temporário. Você pode tentar novamente em alguns
          instantes ou seguir por um dos caminhos abaixo.
        </p>
      {/if}
    </div>

    <!-- Botões de navegação -->
    <div
      class="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full max-w-xl mt-4"
    >
      {#each shortcuts as shortcut}
        <a
          href={shortcut.href}
          class="inline-flex items-center justify-center rounded-lg border border-sky-100 bg-white
                 px-4 py-3 text-sm font-medium text-slate-800 shadow-sm
                 hover:border-sky-300 hover:bg-sky-50 transition-colors"
        >
          {shortcut.label}
        </a>
      {/each}
    </div>

    <!-- Informação técnica (opcional, mas útil) -->
    <p class="mt-6 text-xs text-slate-400">
      Código do status: {$page.status} · Mensagem: {$page.error?.message ?? "Erro inesperado"}
    </p>
  </div>
</section>
