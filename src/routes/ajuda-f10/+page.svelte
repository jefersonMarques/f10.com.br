<script lang="ts">
  import { ArrowRight, BookOpen, LifeBuoy, Search, Sparkles } from "lucide-svelte";
  import SupportChatDialog from "$lib/components/onboarding/SupportChatDialog.svelte";
  import type { PageData } from "./$types";

  export let data: PageData;

  let chatOpen = data.openChat && data.customerSupport.authenticated;
  const supportLoginUrl = "/cliente?returnTo=%2Fajuda-f10%3Fchat%3D1";
</script>

<svelte:head>
  <title>Central de Ajuda | F10 Software</title>
  <meta
    name="description"
    content="Pesquise tutoriais e orientações publicados pela equipe F10 e, se precisar, fale com o suporte."
  />
</svelte:head>

<main class="min-h-screen bg-[#F7F8FB] text-[#10172A]">
  <section class="border-b border-[#E4E7EE] bg-[#010D28] text-white">
    <div class="mx-auto max-w-[1120px] px-5 py-12 sm:px-8 sm:py-16">
      <div class="max-w-[790px]">
        <div class="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.15em] text-white/70">
          <Sparkles size={14} aria-hidden="true" />
          Central de Ajuda F10
        </div>
        <h1 class="mt-5 text-[34px] font-semibold tracking-[-0.045em] sm:text-[50px]">
          Como podemos ajudar?
        </h1>
        <p class="mt-4 max-w-[680px] text-[14px] leading-7 text-white/68 sm:text-[15px]">
          Encontre os conteúdos que a equipe F10 publicou para clientes. A pesquisa considera títulos,
          categorias e o conteúdo dos passos.
        </p>
      </div>

      <form method="GET" action="/ajuda-f10" class="mt-8 flex max-w-[820px] gap-2">
        <label class="sr-only" for="help-search">Pesquisar na Central de Ajuda</label>
        <div class="relative min-w-0 flex-1">
          <Search class="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[#7E8698]" size={19} aria-hidden="true" />
          <input
            id="help-search"
            name="q"
            value={data.query}
            maxlength="160"
            placeholder="Ex.: emitir nota, configurar certificado, financeiro..."
            class="h-14 w-full rounded-2xl border border-white/15 bg-white pl-12 pr-4 text-[13px] text-[#10172A] outline-none transition placeholder:text-[#8B91A0] focus:border-[#EA6D0B] focus:ring-4 focus:ring-[#EA6D0B]/15"
          />
        </div>
        <button
          type="submit"
          class="inline-flex h-14 shrink-0 items-center justify-center rounded-2xl bg-[#EA6D0B] px-5 text-[12px] font-semibold text-white transition hover:bg-[#D96208] focus:outline-none focus:ring-4 focus:ring-[#EA6D0B]/25"
        >
          Pesquisar
        </button>
      </form>
    </div>
  </section>

  <div class="mx-auto max-w-[1120px] px-5 py-8 sm:px-8 sm:py-12">
    <div class="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <p class="text-[10px] font-bold uppercase tracking-[0.14em] text-[#EA6D0B]">
          {data.query ? "Resultado da pesquisa" : "Conteúdo publicado"}
        </p>
        <h2 class="mt-1 text-[24px] font-semibold tracking-[-0.035em] text-[#010D28] sm:text-[30px]">
          {#if data.query}
            {data.articleCount} {data.articleCount === 1 ? "resultado" : "resultados"} para “{data.query}”
          {:else}
            Consulte por categoria
          {/if}
        </h2>
      </div>
      {#if data.query}
        <a href="/ajuda-f10" class="text-[11px] font-semibold text-[#000A57] hover:underline">Limpar pesquisa</a>
      {/if}
    </div>

    {#if data.categories.length > 0}
      <div class="mt-7 space-y-8">
        {#each data.categories as category}
          <section aria-labelledby={`category-${category.name.replace(/[^a-zA-Z0-9]+/g, "-")}`}>
            <div class="mb-3 flex items-center gap-2">
              <BookOpen size={17} class="text-[#EA6D0B]" aria-hidden="true" />
              <h3 id={`category-${category.name.replace(/[^a-zA-Z0-9]+/g, "-")}`} class="text-[15px] font-semibold text-[#303746]">
                {category.name}
              </h3>
              <span class="rounded-full bg-[#ECEEF3] px-2 py-1 text-[9px] font-semibold text-[#737A8B]">{category.articles.length}</span>
            </div>

            <div class="grid gap-3 md:grid-cols-2">
              {#each category.articles as article}
                <a
                  href={`/ajuda-f10/${encodeURIComponent(article.slug)}`}
                  class="group flex min-h-[142px] flex-col justify-between rounded-[22px] border border-[#E2E5EC] bg-white p-5 shadow-[0_10px_30px_rgba(1,13,40,0.035)] transition hover:-translate-y-0.5 hover:border-[#CAD0DE] hover:shadow-[0_14px_34px_rgba(1,13,40,0.07)] focus:outline-none focus:ring-4 focus:ring-[#000A57]/10"
                >
                  <div>
                    <h4 class="text-[15px] font-semibold leading-6 text-[#202737] group-hover:text-[#000A57]">{article.title}</h4>
                    {#if article.summary}
                      <p class="mt-2 line-clamp-2 text-[11px] leading-5 text-[#777E8D]">{article.summary}</p>
                    {/if}
                  </div>
                  <div class="mt-4 flex items-center justify-between gap-3">
                    <span class="text-[9px] font-semibold text-[#9298A5]">{article.stepCount} {article.stepCount === 1 ? "passo" : "passos"}</span>
                    <span class="inline-flex items-center gap-1.5 text-[10px] font-semibold text-[#000A57]">Abrir conteúdo <ArrowRight size={14} aria-hidden="true" /></span>
                  </div>
                </a>
              {/each}
            </div>
          </section>
        {/each}
      </div>
    {:else}
      <section class="mt-7 rounded-[24px] border border-dashed border-[#CDD2DE] bg-white px-6 py-10 text-center">
        <Search size={28} class="mx-auto text-[#9097A6]" aria-hidden="true" />
        <h3 class="mt-4 text-[17px] font-semibold text-[#252C3D]">Nenhum conteúdo publicado encontrado</h3>
        <p class="mx-auto mt-2 max-w-[560px] text-[11px] leading-5 text-[#777E8D]">
          {#if data.query}
            Tente pesquisar com outras palavras ou fale com o suporte F10.
          {:else}
            Assim que a equipe publicar conteúdos no Operations, eles aparecerão aqui automaticamente.
          {/if}
        </p>
      </section>
    {/if}

    <section class="mt-10 flex flex-col gap-5 rounded-[28px] border border-[#D9DDE7] bg-[#010D28] px-6 py-7 text-white sm:flex-row sm:items-center sm:justify-between sm:px-8">
      <div class="flex items-start gap-4">
        <span class="inline-flex h-11 min-w-11 items-center justify-center rounded-2xl bg-white/10 text-[#FF9A4B]"><LifeBuoy size={21} aria-hidden="true" /></span>
        <div>
          <h2 class="text-[18px] font-semibold">Não encontrou o que precisava?</h2>
          {#if data.customerSupport.authenticated}
            <p class="mt-1.5 max-w-[620px] text-[11px] leading-5 text-white/65">Inicie um atendimento identificado como {data.customerSupport.unitName || "sua unidade"}. A conversa vira um chamado e fica vinculada ao seu contexto F10.</p>
          {:else}
            <p class="mt-1.5 max-w-[620px] text-[11px] leading-5 text-white/65">Para proteger seus chamados e identificar corretamente sua unidade, entre com a mesma conta usada no sistema F10 antes de iniciar o atendimento.</p>
          {/if}
        </div>
      </div>
      {#if data.customerSupport.authenticated}
        <button
          type="button"
          class="inline-flex min-h-11 shrink-0 items-center justify-center rounded-full bg-[#EA6D0B] px-5 text-[11px] font-semibold text-white transition hover:bg-[#D96208] focus:outline-none focus:ring-4 focus:ring-white/15"
          on:click={() => (chatOpen = true)}
        >
          Falar com o suporte
        </button>
      {:else}
        <a
          href={supportLoginUrl}
          class="inline-flex min-h-11 shrink-0 items-center justify-center rounded-full bg-[#EA6D0B] px-5 text-[11px] font-semibold text-white transition hover:bg-[#D96208] focus:outline-none focus:ring-4 focus:ring-white/15"
        >
          Entrar para falar com suporte
        </a>
      {/if}
    </section>
  </div>
</main>

{#if data.customerSupport.authenticated}
  <SupportChatDialog
    isOpen={chatOpen}
    onClose={() => (chatOpen = false)}
    customerSupport={data.customerSupport}
  />
{/if}
