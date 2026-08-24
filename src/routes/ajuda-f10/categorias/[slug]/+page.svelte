<script lang="ts">
  import {
    ArrowLeft,
    ArrowRight,
    BookOpen,
    LifeBuoy,
    LoaderCircle,
    Search,
    Send,
    Sparkles,
  } from "lucide-svelte";
  import HelpCategoryIcon from "$lib/components/help/HelpCategoryIcon.svelte";
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

  function targetHref(helpTarget: HelpTarget): string {
    const anchor = helpTarget.anchor ? `#${encodeURIComponent(helpTarget.anchor)}` : "";
    return `/ajuda-f10/${encodeURIComponent(helpTarget.slug)}${anchor}`;
  }

  function errorFor(code: string): string {
    if (code === "AUTH_REQUIRED") return "Para usar a pesquisa inteligente, entre na Área do Cliente e selecione sua unidade.";
    if (code === "RATE_LIMITED") return "O limite de perguntas foi atingido. Aguarde alguns minutos antes de tentar novamente.";
    if (code === "REQUEST_IN_PROGRESS") return "Já existe uma pergunta em processamento nesta sessão.";
    return "A pesquisa inteligente está temporariamente indisponível.";
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
        body: JSON.stringify({ question: normalized, scope: "global", categoryId: data.category.id }),
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
  <title>{data.category.name} | Central de Ajuda F10</title>
  <meta name="description" content={data.category.description || `Conteúdos de ajuda F10 sobre ${data.category.name}.`} />
</svelte:head>

<main class="min-h-screen bg-[#F7F8FB] text-[#10172A]">
  <section class="border-b border-[#E4E7EE] bg-[#010D28] text-white">
    <div class="mx-auto max-w-[980px] px-5 py-10 sm:px-8 sm:py-14">
      <a href="/ajuda-f10" class="inline-flex items-center gap-2 text-[11px] font-semibold text-white/65 hover:text-white"><ArrowLeft size={15}/>Central de Ajuda</a>

      <div class="mt-7 flex items-start gap-4">
        <span class="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white/10 text-[#FF9A4B]"><HelpCategoryIcon name={data.category.icon} size={24}/></span>
        <div><p class="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#FF9A4B]">Categoria</p><h1 class="mt-1 text-[30px] font-semibold tracking-[-0.04em] sm:text-[42px]">{data.category.name}</h1>{#if data.category.description}<p class="mt-3 max-w-[700px] text-[13px] leading-6 text-white/65">{data.category.description}</p>{/if}</div>
      </div>

      <form class="mt-8 max-w-[820px]" on:submit|preventDefault={askHelp}>
        <div class="flex items-end gap-2 rounded-[22px] border border-white/15 bg-white p-2 shadow-[0_18px_60px_rgba(0,0,0,0.16)] focus-within:border-[#EA6D0B] focus-within:ring-4 focus-within:ring-[#EA6D0B]/15">
          <Search size={19} class="mb-3 ml-2 shrink-0 text-[#7E8698]"/>
          <textarea bind:value={question} rows="2" maxlength="600" disabled={!data.helpPublicAi.available || loading} placeholder={data.helpPublicAi.available ? `Pergunte sobre ${data.category.name}` : "Pesquisa inteligente temporariamente indisponível"} class="max-h-28 min-h-[48px] flex-1 resize-none bg-transparent px-1 py-3 text-[13px] leading-5 text-[#10172A] outline-none placeholder:text-[#8B91A0] disabled:cursor-not-allowed"></textarea>
          <button type="submit" disabled={!data.helpPublicAi.available || loading || question.trim().length < 3} class="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#EA6D0B] text-white transition hover:bg-[#D96208] disabled:cursor-not-allowed disabled:opacity-45" aria-label="Perguntar nesta categoria">{#if loading}<LoaderCircle size={18} class="animate-spin"/>{:else}<Send size={17}/>{/if}</button>
        </div>
      </form>
    </div>
  </section>

  <div class="mx-auto max-w-[980px] px-5 py-8 sm:px-8 sm:py-12">
    {#if answer || errorMessage}
      <section class="max-w-[820px] rounded-[26px] border border-[#E0E4EC] bg-white p-5 shadow-[0_14px_40px_rgba(1,13,40,0.05)] sm:p-7">
        {#if errorMessage}
          <p class="rounded-2xl border border-[#F1D7BD] bg-[#FFF9F3] px-4 py-3 text-[11px] leading-5 text-[#7A3B08]">{errorMessage}</p>
        {:else}
          <div class="flex items-start gap-3"><span class="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#EEF0FF] text-[#000A57]"><Sparkles size={16}/></span><div class="min-w-0 flex-1"><p class="whitespace-pre-line text-[13px] leading-6 text-[#343C4E]">{answer}</p>{#if target}<div class="mt-5 border-t border-[#EEF0F5] pt-4"><p class="text-[9px] font-bold uppercase tracking-[0.12em] text-[#949AA8]">Conteúdo relacionado</p><a href={targetHref(target)} class="mt-2 inline-flex items-center gap-2 text-[12px] font-semibold text-[#000A57] hover:underline">{target.title}<ArrowRight size={14}/></a>{#if resolution === "answered"}<p class="mt-1 text-[10px] text-[#858B99]">Ver passo a passo completo</p>{/if}</div>{/if}</div></div>
        {/if}
      </section>
    {/if}

    <section class="mt-10">
      <div class="flex items-end justify-between gap-3"><div><p class="text-[10px] font-bold uppercase tracking-[0.14em] text-[#EA6D0B]">Conteúdos publicados</p><h2 class="mt-1 text-[24px] font-semibold tracking-[-0.035em] text-[#010D28]">{data.category.name}</h2></div><span class="text-[10px] text-[#8A909F]">{data.articles.length} {data.articles.length === 1 ? "artigo" : "artigos"}</span></div>
      <div class="mt-6 grid gap-3 md:grid-cols-2">
        {#each data.articles as article}
          <a href={`/ajuda-f10/${encodeURIComponent(article.slug)}`} class="group rounded-[22px] border border-[#E2E5EC] bg-white p-5 shadow-[0_8px_24px_rgba(1,13,40,0.025)] transition hover:-translate-y-0.5 hover:border-[#CCD1DD]"><div class="flex items-start gap-3"><BookOpen size={17} class="mt-0.5 shrink-0 text-[#EA6D0B]"/><div class="min-w-0"><h3 class="text-[13px] font-semibold leading-5 text-[#303746] group-hover:text-[#000A57]">{article.title}</h3>{#if article.summary}<p class="mt-2 line-clamp-3 text-[10px] leading-5 text-[#7D8493]">{article.summary}</p>{/if}<span class="mt-3 inline-flex items-center gap-1.5 text-[9px] font-semibold text-[#959BA8]">{article.stepCount} {article.stepCount === 1 ? "passo" : "passos"}<ArrowRight size={12}/></span></div></div></a>
        {/each}
      </div>
    </section>

    <section class="mt-10 flex flex-col gap-5 rounded-[28px] border border-[#D9DDE7] bg-[#010D28] px-6 py-7 text-white sm:flex-row sm:items-center sm:justify-between sm:px-8">
      <div class="flex items-start gap-4"><span class="inline-flex h-11 min-w-11 items-center justify-center rounded-2xl bg-white/10 text-[#FF9A4B]"><LifeBuoy size={21}/></span><div><h2 class="text-[18px] font-semibold">Ainda precisa de ajuda?</h2><p class="mt-1.5 max-w-[620px] text-[11px] leading-5 text-white/65">O atendimento F10 consulta esta mesma Base de Conhecimento e você pode pedir uma pessoa quando quiser.</p></div></div>
      <button type="button" class="inline-flex min-h-11 shrink-0 items-center justify-center rounded-full bg-[#EA6D0B] px-5 text-[11px] font-semibold text-white transition hover:bg-[#D96208]" on:click={() => (chatOpen = true)}>Abrir atendimento</button>
    </section>
  </div>
</main>

<SupportChatDialog isOpen={chatOpen} onClose={() => (chatOpen = false)} customerSupport={data.customerSupport}/>
