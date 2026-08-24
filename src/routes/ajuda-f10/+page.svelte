<script lang="ts">
  import {
    ArrowRight,
    BookOpen,
    ChevronDown,
    LifeBuoy,
    LoaderCircle,
    Search,
    Send,
    Sparkles,
  } from "lucide-svelte";
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

  let chatOpen = data.openChat;
  let question = "";
  let answer = "";
  let resolution: HelpResolution | null = null;
  let target: HelpTarget | null = null;
  let loading = false;
  let errorMessage = "";

  function errorFor(code: string): string {
    if (code === "AUTH_REQUIRED") {
      return "Para usar a pesquisa inteligente, entre na Área do Cliente e selecione sua unidade.";
    }
    if (code === "RATE_LIMITED") {
      return "O limite de perguntas foi atingido. Aguarde alguns minutos antes de tentar novamente.";
    }
    if (code === "REQUEST_IN_PROGRESS") {
      return "Já existe uma pergunta em processamento nesta sessão.";
    }
    return "A pesquisa inteligente está temporariamente indisponível.";
  }

  function targetHref(helpTarget: HelpTarget): string {
    const anchor = helpTarget.anchor ? `#${encodeURIComponent(helpTarget.anchor)}` : "";
    return `/ajuda-f10/${encodeURIComponent(helpTarget.slug)}${anchor}`;
  }

  async function askHelp(): Promise<void> {
    const normalized = question.trim();
    if (!data.helpPublicAi.available || loading || normalized.length < 3) return;

    loading = true;
    answer = "";
    target = null;
    resolution = null;
    errorMessage = "";

    try {
      const response = await fetch("/api/help/ask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: normalized, scope: "global" }),
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
      answer = typeof payload.answer === "string" ? payload.answer : "";
      resolution = payload.resolution ?? "not_found";
      target = payload.target ?? null;
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
        <p class="mx-auto mt-4 max-w-[680px] text-[14px] leading-7 text-white/68 sm:text-[15px]">Descreva sua dúvida como você falaria com o suporte. A Central procura o conteúdo publicado e resume o procedimento para você.</p>
      </div>

      <form class="mx-auto mt-8 max-w-[820px]" on:submit|preventDefault={askHelp}>
        <div class="flex items-end gap-2 rounded-[22px] border border-white/15 bg-white p-2 shadow-[0_18px_60px_rgba(0,0,0,0.16)] focus-within:border-[#EA6D0B] focus-within:ring-4 focus-within:ring-[#EA6D0B]/15">
          <Search size={19} class="mb-3 ml-2 shrink-0 text-[#7E8698]"/>
          <textarea
            bind:value={question}
            rows="2"
            maxlength="600"
            disabled={!data.helpPublicAi.available || loading}
            placeholder={data.helpPublicAi.available ? "Ex.: Como cadastrar um funcionário?" : "Pesquisa inteligente temporariamente indisponível"}
            class="max-h-28 min-h-[48px] flex-1 resize-none bg-transparent px-1 py-3 text-[13px] leading-5 text-[#10172A] outline-none placeholder:text-[#8B91A0] disabled:cursor-not-allowed"
          ></textarea>
          <button type="submit" disabled={!data.helpPublicAi.available || loading || question.trim().length < 3} class="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#EA6D0B] text-white transition hover:bg-[#D96208] disabled:cursor-not-allowed disabled:opacity-45" aria-label="Perguntar">
            {#if loading}<LoaderCircle size={18} class="animate-spin"/>{:else}<Send size={17}/>{/if}
          </button>
        </div>
      </form>

      {#if data.helpPublicAi.enabled && !data.helpPublicAi.available}
        <p class="mx-auto mt-3 max-w-[820px] text-center text-[10px] text-white/55">Assistente temporariamente indisponível. Os conteúdos continuam disponíveis abaixo.</p>
      {/if}
    </div>
  </section>

  <div class="mx-auto max-w-[980px] px-5 py-8 sm:px-8 sm:py-12">
    {#if answer || errorMessage}
      <section class="mx-auto max-w-[820px] rounded-[26px] border border-[#E0E4EC] bg-white p-5 shadow-[0_14px_40px_rgba(1,13,40,0.05)] sm:p-7">
        {#if errorMessage}
          <p class="rounded-2xl border border-[#F1D7BD] bg-[#FFF9F3] px-4 py-3 text-[11px] leading-5 text-[#7A3B08]">{errorMessage}</p>
        {:else}
          <div class="flex items-start gap-3"><span class="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#EEF0FF] text-[#000A57]"><Sparkles size={16}/></span><div class="min-w-0 flex-1"><p class="whitespace-pre-line text-[13px] leading-6 text-[#343C4E]">{answer}</p>{#if target}<div class="mt-5 border-t border-[#EEF0F5] pt-4"><p class="text-[9px] font-bold uppercase tracking-[0.12em] text-[#949AA8]">Conteúdo relacionado</p><a href={targetHref(target)} class="mt-2 inline-flex items-center gap-2 text-[12px] font-semibold text-[#000A57] hover:underline">{target.title}<ArrowRight size={14}/></a>{#if resolution === "answered"}<p class="mt-1 text-[10px] text-[#858B99]">Ver passo a passo completo</p>{/if}</div>{/if}</div></div>
        {/if}
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
                  <span class="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#F7F8FB] text-[18px]">{category.icon || "📘"}</span>
                  <div class="min-w-0">
                    <strong class="block truncate text-[13px] font-semibold text-[#303746]">{category.name}</strong>
                    {#if category.description}<span class="mt-0.5 block truncate text-[10px] text-[#858B99]">{category.description}</span>{/if}
                    <a href={`/ajuda-f10/categorias/${encodeURIComponent(category.slug)}`} on:click|stopPropagation class="mt-1 inline-flex items-center gap-1 text-[9px] font-semibold text-[#000A57] hover:underline">Abrir categoria<ArrowRight size={11}/></a>
                  </div>
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

    <section class="mt-10 flex flex-col gap-5 rounded-[28px] border border-[#D9DDE7] bg-[#010D28] px-6 py-7 text-white sm:flex-row sm:items-center sm:justify-between sm:px-8">
      <div class="flex items-start gap-4"><span class="inline-flex h-11 min-w-11 items-center justify-center rounded-2xl bg-white/10 text-[#FF9A4B]"><LifeBuoy size={21}/></span><div><h2 class="text-[18px] font-semibold">Ainda precisa de ajuda?</h2><p class="mt-1.5 max-w-[620px] text-[11px] leading-5 text-white/65">Converse com o atendimento F10. O chat também consulta esta mesma Base de Conhecimento antes de oferecer atendimento humano.</p></div></div>
      <button type="button" class="inline-flex min-h-11 shrink-0 items-center justify-center rounded-full bg-[#EA6D0B] px-5 text-[11px] font-semibold text-white transition hover:bg-[#D96208]" on:click={() => (chatOpen = true)}>Abrir atendimento</button>
    </section>
  </div>
</main>

<SupportChatDialog isOpen={chatOpen} onClose={() => (chatOpen = false)} customerSupport={data.customerSupport}/>
