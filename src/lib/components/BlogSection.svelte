<script lang="ts">
  type Post = {
    id: number;
    title: string;
    excerpt: string;
    date: string;
    slug: string;
    color: string;
  };

  export let hero: Post | null = null;
  export let posts: Post[] = [];
  export let error: string | null = null;

  function toSlug(value: string): string {
    return (value ?? "")
      .toString()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .trim()
      .replace(/&/g, " e ")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");
  }
</script>

<section
  class="deferred-section relative flex flex-col items-start px-6 sm:px-10 md:px-20 py-12 md:py-16 bg-white/10 isolate overflow-hidden text-center md:text-left"
  style="font-family: 'Plus Jakarta Sans', sans-serif;"
  aria-labelledby="blog-f10-title"
>
  <div class="absolute inset-0 pointer-events-none opacity-[0.08]"></div>

  <div class="relative z-10 w-full max-w-[1280px] mx-auto flex flex-col">
    <div
      class="flex items-center justify-center md:justify-start gap-3 mb-4 md:mb-2"
    >
      <div class="w-[40px] md:w-[54px] h-[1px] bg-[#AEB3D9]"></div>
      <span
        id="blog-f10-title"
        class="text-[#5F6475] font-semibold text-[15px] md:text-[17px] tracking-[-0.03em]"
      >
        Blog F10
      </span>
      <div class="block md:hidden w-[40px] h-[1px] bg-[#AEB3D9]"></div>
    </div>

    {#if hero}
      <div
        class="flex flex-col md:flex-row items-center md:items-start justify-center md:justify-between gap-8 md:gap-[73px] mb-10 md:mb-12"
      >
        <div class="max-w-[684px]">
          <h2
            class="text-[#EA6D0B] text-[28px] sm:text-[32px] md:text-[48px] font-semibold leading-[135%] tracking-[-0.03em]"
          >
            {@html hero.title}
          </h2>
        </div>

        <div class="max-w-[557px] flex flex-col justify-start gap-8 md:gap-12">
          <p
            class="text-[#5F6475] text-[15px] md:text-[16px] font-medium leading-[180%]"
          >
            {hero.excerpt}
          </p>

          <a
            data-track="1"
            data-event="blog_click"
            data-page="main_page"
            data-cta="link_ler_mais"
            href={`https://blog.f10.com.br/${hero.slug}`}
            target="_blank"
            rel="noopener noreferrer"
            class="flex items-center justify-center mx-auto md:mx-0 w-[140px] md:w-[156px] h-[48px] md:h-[56px] border border-[#010D28] rounded-full text-[#010D28] text-[15px] md:text-[16px] font-bold leading-[140%] tracking-[-0.02em] hover:bg-[#010D28] hover:text-white transition"
            aria-label={`Ler post: ${hero.title}`}
          >
            Leia mais
          </a>
        </div>
      </div>
    {/if}

    {#if posts.length > 0}
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 w-full">
        {#each posts as post, index}
          <article
            class="flex flex-col justify-between bg-[#F3F3F3] rounded-[20px] p-6 md:p-8 min-h-[320px] md:min-h-[360px]"
          >
            <div class="flex flex-col gap-4 md:gap-6">
              <div class="flex items-center justify-between">
                <div
                  class="w-[12px] h-[12px] md:w-[14px] md:h-[14px] rounded-full"
                  style={`background:${post.color}`}
                ></div>
                <time
                  class="text-[#5F6475] text-[13px] md:text-[14px] leading-[160%] font-medium"
                >
                  {post.date}
                </time>
              </div>

              <h3
                class="text-[#010D28] text-[20px] md:text-[26px] font-semibold leading-[150%] tracking-[-0.03em]"
              >
                {@html post.title}
              </h3>
            </div>

            <div
              class="flex flex-col md:flex-row justify-between items-center gap-4 md:gap-10 mt-4 md:mt-6"
            >
              <p
                class="text-[#5F6475] text-[14px] leading-[160%] font-medium w-full md:w-[220px] text-center md:text-left"
              >
                {post.excerpt}
              </p>

              <a
                data-track="1"
                data-event="blog_click"
                data-page="main_page"
                data-cta={`post-${toSlug(post.slug)}`}
                href={`https://blog.f10.com.br/${post.slug}`}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={`Ler post: ${post.title}`}
                class={`flex justify-center items-center w-[64px] md:w-[88px] h-[44px] md:h-[56px] rounded-[70px] border transition ${
                  index === 0
                    ? "bg-[#010D28] border-[#010D28] hover:bg-[#EA6D0B] hover:border-[#EA6D0B]"
                    : "border-[#010D28] text-[#010D28] hover:bg-[#EA6D0B] hover:border-[#EA6D0B] hover:text-white"
                }`}
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke-width="2"
                  stroke={index === 0 ? "#F3F3F3" : "#010D28"}
                  class="w-5 h-5 md:w-6 md:h-6"
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
    {:else if error}
      <p class="text-[#5F6475] text-center w-full py-8">{error}</p>
    {/if}
  </div>
</section>
