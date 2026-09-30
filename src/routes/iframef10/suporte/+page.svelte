<script lang="ts">
  import { BookOpen, Search } from "lucide-svelte";
  import HelpCategoryIcon from "$lib/components/help/HelpCategoryIcon.svelte";
  import type { PageData } from "./$types";

  export let data: PageData;
  let query = "";

  function matches(article: PageData["categories"][number]["articles"][number]): boolean {
    const term = query.trim().toLocaleLowerCase("pt-BR");
    if (!term) return true;
    return [article.title, article.summary, ...article.categories.map((category) => category.name)]
      .join(" ")
      .toLocaleLowerCase("pt-BR")
      .includes(term);
  }

  $: categories = data.categories
    .map((category) => ({ ...category, articles: category.articles.filter(matches) }))
    .filter((category) => category.articles.length > 0);
</script>

<svelte:head><title>Suporte F10</title></svelte:head>

<div class="px-4 py-5 sm:px-6 sm:py-7">
  <div class="mx-auto max-w-[1080px]">
    <section class="rounded-[22px] border border-[#E2E5ED] bg-white p-5 sm:p-6">
      <div class="flex items-center gap-3">
        <span class="flex h-10 w-10 items-center justify-center rounded-xl bg-[#EEF0FF] text-[#000A57]"><BookOpen size={18}/></span>
        <div><h1 class="text-[18px] font-semibold text-[#202637]">Suporte F10</h1><p class="mt-0.5 text-[11px] text-[#858B99]">{data.articleCount} artigo(s) publicados</p></div>
      </div>

      <label class="relative mt-5 block">
        <Search size={16} class="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[#9298A5]"/>
        <input bind:value={query} placeholder="Buscar artigo, recurso ou assunto..." class="h-11 w-full rounded-xl border border-[#DDE1EA] bg-[#F8F9FB] pl-10 pr-3 text-[12px] outline-none focus:border-[#000A57] focus:bg-white"/>
      </label>
    </section>

    {#if categories.length === 0}
      <div class="mt-4 rounded-[22px] border border-dashed border-[#D6DAE3] bg-white px-5 py-12 text-center text-[12px] text-[#8B919F]">Nenhum conteúdo encontrado.</div>
    {:else}
      <div class="mt-4 grid gap-3 lg:grid-cols-2">
        {#each categories as category}
          <section class="rounded-[22px] border border-[#E2E5ED] bg-white p-4 sm:p-5">
            <div class="flex items-start gap-3">
              <span class="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#F3F4F7] text-[#000A57]"><HelpCategoryIcon name={category.icon} size={17}/></span>
              <div class="min-w-0"><h2 class="text-[13px] font-semibold text-[#303746]">{category.name}</h2>{#if category.description}<p class="mt-1 text-[10px] leading-5 text-[#858B99]">{category.description}</p>{/if}</div>
            </div>
            <div class="mt-4 space-y-1.5">
              {#each category.articles as article}
                <a href={`/iframef10/suporte/${encodeURIComponent(article.slug)}`} class="block rounded-xl border border-transparent px-3 py-2.5 transition hover:border-[#E2E5ED] hover:bg-[#FAFAFC]">
                  <strong class="block text-[11.5px] font-semibold text-[#3A4150]">{article.title}</strong>
                  {#if article.summary}<span class="mt-0.5 line-clamp-2 block text-[10px] leading-4 text-[#858B99]">{article.summary}</span>{/if}
                </a>
              {/each}
            </div>
          </section>
        {/each}
      </div>
    {/if}
  </div>
</div>
