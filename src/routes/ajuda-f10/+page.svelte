<script lang="ts">
  import {
    ArrowRight,
    BookOpen,
    ChevronDown,
    LifeBuoy,
    Layers3,
    LoaderCircle,
    Search,
    Sparkles,
  } from "lucide-svelte";
  import HelpCategoryIcon from "$lib/components/help/HelpCategoryIcon.svelte";
  import HelpRichText from "$lib/components/help/HelpRichText.svelte";
  import SupportChatDialog from "$lib/components/onboarding/SupportChatDialog.svelte";
  import type { PageData } from "./$types";

  export let data: PageData;

  type HelpResolution = "answered" | "navigate" | "found_elsewhere" | "not_found";
  type HelpTarget = {
    contentId: string;
    slug: string;
    title: string;
    targetType: "article" | "featured_video" | "step" | "block";
    stepId: string | null;
    blockId: string | null;
    anchor: string | null;
  };
  type ConversationTurn = {
    question: string;
    answer: string;
  };

  let chatOpen = data.openChat;
  let question = data.search.query;
  let answer = "";
  let resolution: HelpResolution | null = null;
  let target: HelpTarget | null = null;
  let loading = false;
  let errorMessage = "";
  let conversation: ConversationTurn[] = [];

  function errorFor(code: string): string {
    if (code === "AUTH_REQUIRED") return "Para usar a pesquisa inteligente, entre na Área do Cliente e selecione sua unidade.";
    if (code === "RATE_LIMITED") return "O limite de perguntas foi atingido. Aguarde alguns minutos antes de tentar novamente.";
    if (code === "REQUEST_IN_PROGRESS") return "Já existe uma pergunta em processamento nesta sessão.";
    return "A pesquisa inteligente está temporariamente indisponível.";
  }

  function targetHref(helpTarget: HelpTarget): string {
    const anchor = helpTarget.anchor ? `#${encodeURIComponent(helpTarget.anchor)}` : "";
    return `/ajuda-f10/${encodeURIComponent(helpTarget.slug)}${anchor}`;
  }

  function conversationContext(): string {
    const context = conversation
      .slice(-4)
      .map((turn) => `Cliente: ${turn.question}\nAssistente: ${turn.answer}`)
      .join("\n");
    return context.length <= 5_500 ? context : context.slice(context.length - 5_500);
  }

  async function askHelp(): Promise<void> {
    const normalized = question.trim();
    if (!data.helpPublicAi.available || loading || normalized.length < 3) return;
    const context = conversationContext();
    loading = true;
    answer = "";
    target = null;
    resolution = null;
    errorMessage = "";
    try {
      const response = await fetch("/api/help/ask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question: normalized,
          scope: "global",
          conversationContext: context,
        }),
      });
      const payload = (await response.json()) as {
        error?: string;
        resolution?: HelpResolution;
        answer?: string;
        target?: HelpTarget | null;
      };
      if (!response.ok) {
        errorMessage = errorFor(payload.error ?? "");
        return;
      }
      answer = typeof payload.answer === "string" ? payload.answer.trim() : "";
      resolution = payload.resolution ?? "not_found";
      target = payload.target ?? null;
      if (answer) {
        conversation = [...conversation, { question: normalized, answer }].slice(-4);
        question = "";
      }
    } catch {
      errorMessage = errorFor("");
    } finally {
      loading = false;
    }
  }

</script>

<svelte:head>
  <title>Central de Ajuda | F10 Software</title>
  <meta name="description" content="Pergunte em linguagem natural e encontre orientações publicadas pela equipe F10." />
</svelte:head>

<main class="min-h-screen bg-[#F7F8FB] text-[#10172A]">
  <section class="border-b border-[#E4E7EE] bg-[#010D28] text-white">
    <div class="mx-auto max-w-[980px] px-5 py-14 sm:px-8 sm:py-20">
      <div class="mx-auto max-w-[820px] text-center">
        <div class="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.15em] text-white/70"><Sparkles size={14}/>Central de Ajuda F10</div>
        <h1 class="mt-5 text-[34px] font-semibold tracking-[-0.045em] sm:text-[50px]">O que você precisa fazer no F10?</h1>
        <p class="mx-auto mt-4 max-w-[680px] text-[14px] leading-7 text-white/68 sm:text-[15px]">Pesquise pelo título, assunto ou procedimento. Encontre orientações mesmo quando a IA estiver indisponível.</p>
      </div>

      <form method="GET" action="/ajuda-f10" role="search" class="mx-auto mt-8 max-w-[820px]">
        <div class="flex items-center gap-2 rounded-[22px] border border-white/15 bg-white p-2 shadow-[0_18px_60px_rgba(0,0,0,0.16)] focus-within:border-[#EA6D0B] focus-within:ring-4 focus-within:ring-[#EA6D0B]/15">
          <Search size={19} class="ml-2 shrink-0 text-[#7E8698]" aria-hidden="true" />
          <input
            type="search"
            name="q"
            bind:value={question}
            minlength="2"
            maxlength="500"
            aria-label="Pesquisar artigos da Central de Ajuda"
            placeholder="Ex.: Como cadastrar um funcionário?"
            class="h-12 min-w-0 flex-1 bg-transparent px-1 text-[14px] text-[#10172A] outline-none placeholder:text-[#8B91A0]"
          />
          <button type="submit" disabled={question.trim().length < 2} class="inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-2xl bg-[#EA6D0B] px-4 text-[13px] font-semibold text-white transition hover:bg-[#D96208] disabled:cursor-not-allowed disabled:opacity-45">
            <Search size={17}/>Buscar
          </button>
        </div>
        <div class="mt-3 flex flex-wrap items-center justify-center gap-3">
          <span class="text-[12px] text-white/70">Busca por texto · não utiliza créditos de IA</span>
          {#if data.helpPublicAi.available}
            <button type="button" disabled={loading || question.trim().length < 3} on:click={() => void askHelp()} class="inline-flex items-center gap-1.5 rounded-full border border-white/20 px-3 py-2 text-[12px] font-semibold text-white transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-45">
              {#if loading}<LoaderCircle size={15} class="animate-spin"/>{:else}<Sparkles size={15}/>{/if}
              Perguntar à IA
            </button>
          {/if}
        </div>
      </form>
    </div>
  </section>

  <div class="mx-auto max-w-[980px] px-5 py-8 sm:px-8 sm:py-12">
    {#if answer || errorMessage}
      <section class="mx-auto max-w-[820px] rounded-[26px] border border-[#E0E4EC] bg-white p-5 shadow-[0_14px_40px_rgba(1,13,40,0.05)] sm:p-7">
        {#if errorMessage}
          <p class="rounded-2xl border border-[#F1D7BD] bg-[#FFF9F3] px-4 py-3 text-[11px] leading-5 text-[#7A3B08]">{errorMessage}</p>
        {:else}
          <div class="flex items-start gap-3">
            <span class="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#EEF0FF] text-[#000A57]"><Sparkles size={16}/></span>
            <div class="min-w-0 flex-1">
              <HelpRichText text={answer} className="space-y-1.5 text-[13px] leading-6 text-[#343C4E]" />
              {#if target}
                <div class="mt-5 border-t border-[#EEF0F5] pt-4">
                  <p class="text-[9px] font-bold uppercase tracking-[0.12em] text-[#949AA8]">Conteúdo relacionado</p>
                  <a href={targetHref(target)} class="mt-2 inline-flex items-center gap-2 text-[12px] font-semibold text-[#000A57] hover:underline">{target.title}<ArrowRight size={14}/></a>
                  {#if resolution === "answered"}<p class="mt-1 text-[10px] text-[#858B99]">Ver ponto da explicação</p>{/if}
                </div>
              {/if}
            </div>
          </div>
        {/if}
      </section>
    {/if}

    {#if data.search.query.length >= 2}
      <section class="mx-auto mt-8 max-w-[820px]" aria-label="Resultados da busca">
        <div class="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 class="text-[22px] font-semibold text-[#010D28]">Resultados para “{data.search.query}”</h2>
            {#if !data.search.error}<p class="mt-1 text-[12px] text-[#737A8B]">{data.search.results.length} {data.search.results.length === 1 ? "artigo encontrado" : "artigos encontrados"}</p>{/if}
          </div>
          <a href="/ajuda-f10" class="text-[12px] font-semibold text-[#000A57] hover:underline">Ver todos os artigos</a>
        </div>
        {#if data.search.error}
          <div class="rounded-2xl border border-[#F1D7BD] bg-[#FFF9F3] px-5 py-4 text-[13px] text-[#7A3B08]">
            A busca está temporariamente indisponível. Você ainda pode navegar pelas categorias.
          </div>
        {:else if data.search.results.length === 0}
          <div class="rounded-2xl border border-[#E2E5EC] bg-white px-5 py-8 text-center">
            <p class="text-[14px] font-semibold text-[#303746]">Nenhum artigo encontrado</p>
            <p class="mt-2 text-[12px] text-[#737A8B]">Tente outros termos, como o nome da função ou do procedimento.</p>
          </div>
        {:else}
          <div class="space-y-2">
            {#each data.search.results as result (result.contentId)}
              <a href={`/ajuda-f10/${encodeURIComponent(result.slug)}`} class="group flex items-start gap-3 rounded-2xl border border-[#E2E5EC] bg-white p-4 transition hover:border-[#BAC1D2] hover:shadow-sm sm:p-5">
                <span class="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#EEF0FF] text-[#000A57]"><BookOpen size={18}/></span>
                <span class="min-w-0 flex-1">
                  <strong class="block text-[14px] font-semibold leading-5 text-[#303746] group-hover:text-[#000A57]">{result.title}</strong>
                  {#if result.categoryText}<span class="mt-1 block line-clamp-1 text-[11px] text-[#797F8E]">{result.categoryText}</span>{/if}
                  {#if result.summary}<span class="mt-2 block line-clamp-2 text-[12px] leading-5 text-[#6B7282]">{result.summary}</span>{/if}
                </span>
                <ArrowRight size={17} class="mt-2 shrink-0 text-[#8C94A6] group-hover:text-[#000A57]"/>
              </a>
            {/each}
          </div>
        {/if}
      </section>
    {:else}
    {#if data.collections.length > 0}
      <section class="mt-10">
        <div><p class="text-[10px] font-bold uppercase tracking-[0.14em] text-[#EA6D0B]">Seleções F10</p><h2 class="mt-1 text-[24px] font-semibold tracking-[-0.035em] text-[#010D28]">Coleções</h2></div>
        <div class="mt-6 grid gap-3 sm:grid-cols-2">
          {#each data.collections as collection}
            <a href={`/ajuda-f10/colecoes/${encodeURIComponent(collection.slug)}`} class="group rounded-[22px] border border-[#E2E5EC] bg-white p-5 shadow-[0_8px_24px_rgba(1,13,40,0.025)] transition hover:border-[#C8CEDA] hover:shadow-[0_12px_32px_rgba(1,13,40,0.05)]">
              <div class="flex items-start gap-3">
                <span class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#EEF0FF] text-[#000A57]"><Layers3 size={18}/></span>
                <div class="min-w-0 flex-1">
                  <h3 class="text-[13px] font-semibold text-[#303746] group-hover:text-[#000A57]">{collection.title}</h3>
                  {#if collection.description}<p class="mt-1 line-clamp-2 text-[10px] leading-5 text-[#7D8493]">{collection.description}</p>{/if}
                  <div class="mt-3 flex items-center justify-between gap-3"><span class="text-[9px] font-semibold text-[#959BA8]">{collection.items.length} {collection.items.length === 1 ? "conteúdo" : "conteúdos"}</span><ArrowRight size={14} class="text-[#9AA0AE] transition group-hover:translate-x-0.5 group-hover:text-[#000A57]"/></div>
                </div>
              </div>
            </a>
          {/each}
        </div>
      </section>
    {/if}

    <section class="mt-10">
      <div class="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between"><div><p class="text-[10px] font-bold uppercase tracking-[0.14em] text-[#EA6D0B]">Explorar conteúdos</p><h2 class="mt-1 text-[24px] font-semibold tracking-[-0.035em] text-[#010D28]">Por categoria</h2></div><span class="text-[10px] text-[#8A909F]">{data.articleCount} {data.articleCount === 1 ? "artigo publicado" : "artigos publicados"}</span></div>

      {#if data.categories.length > 0}
        <div class="mt-6 space-y-3">
          {#each data.categories as category}
            <details class="group rounded-[22px] border border-[#E2E5EC] bg-white shadow-[0_8px_24px_rgba(1,13,40,0.025)]">
              <summary class="flex cursor-pointer list-none items-center justify-between gap-4 px-5 py-4 sm:px-6">
                <div class="flex min-w-0 items-center gap-3">
                  <span class="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#F7F8FB] text-[#000A57]"><HelpCategoryIcon name={category.icon} size={18}/></span>
                  <div class="min-w-0"><strong class="block truncate text-[13px] font-semibold text-[#303746]">{category.name}</strong>{#if category.description}<span class="mt-0.5 block truncate text-[10px] text-[#858B99]">{category.description}</span>{/if}<a href={`/ajuda-f10/categorias/${encodeURIComponent(category.slug)}`} on:click|stopPropagation class="mt-1 inline-flex items-center gap-1 text-[9px] font-semibold text-[#000A57] hover:underline">Abrir categoria<ArrowRight size={11}/></a></div>
                </div>
                <div class="flex items-center gap-3"><span class="rounded-full bg-[#ECEEF3] px-2 py-1 text-[9px] font-semibold text-[#737A8B]">{category.articles.length}</span><ChevronDown size={15} class="text-[#818797] transition group-open:rotate-180"/></div>
              </summary>
              <div class="grid gap-2 border-t border-[#EEF0F5] p-3 md:grid-cols-2 sm:p-4">
                {#each category.articles as article}
                  <a href={`/ajuda-f10/${encodeURIComponent(article.slug)}`} class="group/article rounded-2xl border border-[#ECEEF3] bg-[#FAFAFC] p-4 transition hover:border-[#CCD1DD] hover:bg-white"><div class="flex items-start gap-3"><BookOpen size={15} class="mt-0.5 shrink-0 text-[#EA6D0B]"/><div class="min-w-0"><h3 class="text-[12px] font-semibold leading-5 text-[#303746] group-hover/article:text-[#000A57]">{article.title}</h3>{#if article.summary}<p class="mt-1 line-clamp-2 text-[10px] leading-5 text-[#7D8493]">{article.summary}</p>{/if}<span class="mt-2 inline-block text-[9px] font-semibold text-[#959BA8]">{article.stepCount} {article.stepCount === 1 ? "passo" : "passos"}</span></div></div></a>
                {/each}
              </div>
            </details>
          {/each}
        </div>
      {:else}
        <div class="mt-6 rounded-[24px] border border-dashed border-[#CDD2DE] bg-white px-6 py-10 text-center"><BookOpen size={28} class="mx-auto text-[#9097A6]"/><h3 class="mt-4 text-[16px] font-semibold text-[#252C3D]">Nenhum conteúdo publicado</h3></div>
      {/if}
    </section>

    {/if}

    <section class="mt-10 flex flex-col gap-5 rounded-[28px] border border-[#D9DDE7] bg-[#010D28] px-6 py-7 text-white sm:flex-row sm:items-center sm:justify-between sm:px-8">
      <div class="flex items-start gap-4"><span class="inline-flex h-11 min-w-11 items-center justify-center rounded-2xl bg-white/10 text-[#FF9A4B]"><LifeBuoy size={21}/></span><div><h2 class="text-[18px] font-semibold">Ainda precisa de ajuda?</h2><p class="mt-1.5 max-w-[620px] text-[11px] leading-5 text-white/65">Converse com o atendimento F10. O chat também consulta esta mesma Base de Conhecimento antes de oferecer atendimento humano.</p></div></div>
      <button type="button" class="inline-flex min-h-11 shrink-0 items-center justify-center rounded-full bg-[#EA6D0B] px-5 text-[11px] font-semibold text-white transition hover:bg-[#D96208]" on:click={() => (chatOpen = true)}>Abrir atendimento</button>
    </section>
  </div>
</main>

<SupportChatDialog isOpen={chatOpen} onClose={() => (chatOpen = false)} customerSupport={data.customerSupport}/>
