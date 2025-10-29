<script lang="ts">
  import { onMount } from "svelte";

  // ===== CONFIGURAÇÕES ===========================
  const heroQuery: number | string | null = "destaque"; // pode ser ID, palavra ou null
  const cardsQuery: number | string | null = null;       // pode ser ID, palavra ou null
  const cardsLimit = 3;
  const colors = ["#45A7DE", "#EA6D0B", "#6A26F1"];

  // Novas variáveis de controle:
  const heroExcerptWords = 35;  // número de palavras do texto principal
  const cardExcerptWords = 18;  // número de palavras dos cards
  // ===============================================

  type Post = {
    id: number;
    title: string;
    excerpt: string;
    date: string;
    slug: string;
    color: string;
  };

  let hero: Post | null = null;
  let posts: Post[] = [];
  let loading = true;
  let error: string | null = null;

  function buildUrl(base: string, query: number | string | null, limit = 3) {
    if (query === null) return `${base}?_embed&per_page=${limit}`;
    if (typeof query === "number") return `${base}?include[]=${query}`;
    return `${base}?search=${encodeURIComponent(query)}&_embed&per_page=${limit}`;
  }

  function cleanExcerpt(html: string): string {
    return html
      .replace(/<[^>]+>/g, "")
      .replace(/&#[0-9]+;/g, "")
      .replace(/&[a-z]+;/gi, "")
      .replace(/\s+/g, " ")
      .trim();
  }

  // Limita o texto a X palavras
  function limitWords(text: string, maxWords: number): string {
    const words = text.split(" ");
    return words.length <= maxWords ? text : words.slice(0, maxWords).join(" ") + "…";
  }

  onMount(async () => {
    try {
      const baseUrl = "https://blog.f10.com.br/wp-json/wp/v2/posts";

      // HERO
      const heroRes = await fetch(buildUrl(baseUrl, heroQuery, 1));
      const heroData = await heroRes.json();
      if (heroData.length > 0) {
        const item = heroData[0];
        hero = {
          id: item.id,
          title: item.title.rendered,
          excerpt: limitWords(cleanExcerpt(item.excerpt.rendered), heroExcerptWords),
          date: new Date(item.date).toLocaleDateString("pt-BR"),
          slug: item.slug,
          color: "#EA6D0B",
        };
      }

      // CARDS
      const cardsRes = await fetch(buildUrl(baseUrl, cardsQuery, cardsLimit));
      const cardsData = await cardsRes.json();
      posts = cardsData.map((item: any, i: number) => ({
        id: item.id,
        title: item.title.rendered,
        excerpt: limitWords(cleanExcerpt(item.excerpt.rendered), cardExcerptWords),
        date: new Date(item.date).toLocaleDateString("pt-BR"),
        slug: item.slug,
        color: colors[i % colors.length],
      }));
    } catch (err: any) {
      error = err.message;
    } finally {
      loading = false;
    }
  });
</script>

<!-- ============================================================ -->
<section
  class="relative flex flex-col items-start px-20 py-16 bg-white/20 isolate overflow-hidden"
  style="font-family: 'Plus Jakarta Sans', sans-serif;"
>
  <!-- Fundo sutil -->
  <div
    class="absolute inset-0 pointer-events-none opacity-[0.08]"
  ></div>

  <div class="relative z-10 w-full max-w-[1280px] mx-auto flex flex-col">
    {#if hero}
      <!-- Topo: Blog F10 isolado -->
      <div class="flex items-center gap-3 border border-white/10 mb-2">
        <div class="w-[54px] h-[1px] bg-[#AEB3D9]"></div>
        <span class="text-[#AEB3D9] font-semibold text-[17px] tracking-[-0.03em]"
          >Blog F10</span
        >
      </div>

      <!-- Hero alinhado horizontalmente -->
      <div class="flex flex-row items-start justify-between gap-[73px] mb-12">
        <div class="max-w-[684px]">
          <h2
            class="text-[#EA6D0B] text-[48px] font-semibold leading-[130%] tracking-[-0.03em]"
          >
            {@html hero.title}
          </h2>
        </div>

        <div class="max-w-[557px] flex flex-col justify-start gap-12">
          <p class="text-[#878C91] text-[16px] font-medium leading-[180%]">
            {hero.excerpt}
          </p>
          <a
            href={`https://blog.f10.com.br/${hero.slug}`}
            target="_blank"
            class="flex items-center justify-center w-[156px] h-[56px] border border-[#010D28] rounded-full text-[#010D28] text-[16px] font-bold leading-[140%] tracking-[-0.02em] hover:bg-[#010D28] hover:text-white transition"
            aria-label={`Ler post: ${hero.title}`}
          >
            Leia mais
          </a>
        </div>
      </div>
    {/if}

    <!-- Lista de cards -->
    {#if loading}
      <p class="text-[#878C91] text-center w-full">Carregando posts...</p>
    {:else if error}
      <p class="text-red-500 text-center w-full">{error}</p>
    {:else}
      <div class="flex flex-row gap-6 w-full flex-wrap">
        {#each posts as post, i}
          <article
            class="flex flex-col justify-between bg-[#F3F3F3] rounded-[20px] p-8 w-[410px] min-h-[360px]"
          >
            <div class="flex flex-col gap-6">
              <div class="flex items-center justify-between">
                <div
                  class="w-[14px] h-[14px] rounded-full"
                  style="background:{post.color}"
                ></div>
                <span class="text-[#878C91] text-[14px] leading-[160%] font-medium">
                  {post.date}
                </span>
              </div>

              <h3
                class="text-[#010D28] text-[26px] font-semibold leading-[150%] tracking-[-0.03em]"
              >
                {@html post.title}
              </h3>
            </div>

            <div class="flex justify-between items-center gap-10 mt-6">
              <p
                class="text-[#878C91] text-[14px] leading-[160%] font-medium w-[220px]"
              >
                {post.excerpt}
              </p>
              <a
                href={`https://blog.f10.com.br/${post.slug}`}
                target="_blank"
                aria-label={`Ler post: ${post.title}`}
                class={`flex justify-center items-center w-[88px] h-[56px] rounded-[70px] border transition ${
                  i === 0
                    ? "bg-[#010D28] border-[#010D28] hover:bg-[#EA6D0B] hover:border-[#EA6D0B]"
                    : "border-[#010D28] text-[#010D28] hover:bg-[#EA6D0B] hover:border-[#EA6D0B] hover:text-white"
                }`}
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke-width="2"
                  stroke={i === 0 ? "#F3F3F3" : "#010D28"}
                  class="w-6 h-6"
                  aria-hidden="true"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    d="M9 5l7 7-7 7"
                  />
                </svg>
              </a>
            </div>
          </article>
        {/each}
      </div>
    {/if}
  </div>
</section>
<style></style>