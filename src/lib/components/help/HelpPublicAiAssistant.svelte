<script lang="ts">
  import { page } from "$app/stores";
  import { goto } from "$app/navigation";
  import { tick } from "svelte";
  import {
    ArrowUpRight,
    LoaderCircle,
    MessageCircleQuestion,
    Send,
    ShieldCheck,
    Sparkles,
    X,
  } from "lucide-svelte";

  export let enabled = false;
  export let available = false;
  export let requiresAuthentication = false;

  type HelpTarget = {
    contentId: string;
    slug: string;
    title: string;
    targetType: "article" | "featured_video" | "step" | "block";
    stepId: string | null;
    blockId: string | null;
    anchor: string | null;
  };

  type HelpResolution = "answered" | "navigate" | "found_elsewhere" | "not_found";

  let minimized = false;
  let question = "";
  let answer = "";
  let loading = false;
  let resolution: HelpResolution | null = null;
  let target: HelpTarget | null = null;
  let errorMessage = "";

  function slugFromPath(pathname: string): string | null {
    const match = pathname.match(/^\/ajuda-f10\/([^/]+)\/?$/);
    if (!match?.[1]) return null;
    try {
      return decodeURIComponent(match[1]);
    } catch {
      return match[1];
    }
  }

  $: articleSlug = slugFromPath($page.url.pathname);

  function targetElement(helpTarget: HelpTarget): HTMLElement | null {
    if (typeof document === "undefined") return null;
    if (helpTarget.anchor) return document.getElementById(helpTarget.anchor);
    return document.querySelector<HTMLElement>("[data-help-content-slug] header");
  }

  async function revealTarget(helpTarget: HelpTarget): Promise<void> {
    await tick();
    window.setTimeout(() => {
      const element = targetElement(helpTarget);
      if (!element) return;
      element.scrollIntoView({ behavior: "smooth", block: "center" });
      element.classList.add("help-ai-target-highlight");
      window.setTimeout(() => element.classList.remove("help-ai-target-highlight"), 4_500);
    }, 120);
  }

  async function openTarget(helpTarget: HelpTarget): Promise<void> {
    if (helpTarget.slug === articleSlug) {
      await revealTarget(helpTarget);
      return;
    }
    await goto(`/ajuda-f10/${encodeURIComponent(helpTarget.slug)}`);
  }

  function errorFor(code: string): string {
    if (code === "AUTH_REQUIRED") {
      return "Para usar o assistente, entre na Área do Cliente e selecione sua unidade.";
    }
    if (code === "RATE_LIMITED") {
      return "O limite de perguntas foi atingido. Aguarde alguns minutos antes de tentar novamente.";
    }
    if (code === "REQUEST_IN_PROGRESS") {
      return "Já existe uma pergunta em processamento nesta sessão.";
    }
    if (code === "ARTICLE_NOT_FOUND") {
      return "Este conteúdo não está disponível para o assistente.";
    }
    return "O assistente está temporariamente indisponível.";
  }

  async function submitQuestion(): Promise<void> {
    const normalized = question.trim();
    if (!available || loading || normalized.length < 3 || !articleSlug) return;

    loading = true;
    errorMessage = "";
    answer = "";
    target = null;
    resolution = null;

    try {
      const response = await fetch("/api/help/ask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question: normalized,
          scope: "article",
          articleSlug,
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

      answer = typeof payload.answer === "string" ? payload.answer : "";
      resolution = payload.resolution ?? "not_found";
      target = payload.target ?? null;

      if (resolution === "answered" && target?.slug === articleSlug) {
        await revealTarget(target);
      }
    } catch {
      errorMessage = errorFor("");
    } finally {
      loading = false;
    }
  }
</script>

{#if enabled && articleSlug}
  {#if minimized}
    <button
      type="button"
      class="fixed bottom-4 right-4 z-40 inline-flex min-h-12 items-center gap-2 rounded-full border border-[#D9DDE8] bg-white px-4 text-[11px] font-semibold text-[#000A57] shadow-[0_18px_50px_rgba(1,13,40,0.18)] transition hover:-translate-y-0.5 sm:bottom-6 sm:right-6"
      on:click={() => (minimized = false)}
      aria-label="Abrir assistente deste artigo"
    >
      <Sparkles size={16} class="text-[#EA6D0B]" />
      Pergunte sobre este artigo
    </button>
  {:else}
    <aside class="fixed bottom-3 right-3 z-40 w-[calc(100vw-24px)] max-w-[420px] overflow-hidden rounded-[24px] border border-[#D9DDE8] bg-white shadow-[0_22px_70px_rgba(1,13,40,0.22)] sm:bottom-6 sm:right-6 sm:w-[420px]">
      <header class="flex items-center justify-between gap-3 border-b border-[#ECEEF3] bg-[#010D28] px-4 py-3 text-white">
        <div class="flex min-w-0 items-center gap-3">
          <span class="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/10 text-[#FF9A4B]"><Sparkles size={17} /></span>
          <div class="min-w-0">
            <strong class="block truncate text-[12px] font-semibold">Assistente deste conteúdo</strong>
            <span class="mt-0.5 block text-[9px] text-white/55">Responde somente sobre o artigo atual</span>
          </div>
        </div>
        <button type="button" class="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-white/65 transition hover:bg-white/10 hover:text-white" on:click={() => (minimized = true)} aria-label="Minimizar assistente"><X size={15}/></button>
      </header>

      <div class="max-h-[52vh] overflow-y-auto px-4 py-4">
        {#if !available}
          <div class="rounded-2xl border border-[#F1D7BD] bg-[#FFF9F3] px-4 py-3 text-[11px] leading-5 text-[#7A3B08]">Assistente temporariamente indisponível.</div>
        {/if}

        {#if answer}
          <div class="rounded-2xl bg-[#F7F8FB] px-4 py-3">
            <div class="flex items-start gap-2.5"><MessageCircleQuestion size={16} class="mt-0.5 shrink-0 text-[#000A57]"/><p class="text-[12px] leading-6 text-[#424A5D]">{answer}</p></div>
            {#if target && resolution === "answered"}
              <button type="button" class="mt-3 inline-flex min-h-9 items-center gap-2 rounded-xl bg-[#EEF0FF] px-3 text-[10px] font-semibold text-[#000A57]" on:click={() => target && openTarget(target)}>Mostrar no conteúdo<ArrowUpRight size={13}/></button>
            {:else if target && resolution === "found_elsewhere"}
              <button type="button" class="mt-3 inline-flex min-h-9 items-center gap-2 rounded-xl bg-[#EEF0FF] px-3 text-[10px] font-semibold text-[#000A57]" on:click={() => target && openTarget(target)}>Abrir {target.title}<ArrowUpRight size={13}/></button>
            {/if}
          </div>
        {/if}

        {#if errorMessage}
          <div class="rounded-2xl border border-[#F1D7BD] bg-[#FFF9F3] px-4 py-3 text-[11px] leading-5 text-[#7A3B08]">
            {errorMessage}
            {#if requiresAuthentication}<a href="/cliente" class="mt-2 block font-semibold text-[#000A57] hover:underline">Entrar na Área do Cliente</a>{/if}
          </div>
        {/if}
      </div>

      <form class="border-t border-[#ECEEF3] bg-white p-3" on:submit|preventDefault={submitQuestion}>
        <label class="sr-only" for="help-public-ai-question">Pergunte sobre este artigo</label>
        <div class="flex items-end gap-2 rounded-2xl border border-[#DDE1EA] bg-[#FAFBFD] p-2 focus-within:border-[#000A57] focus-within:ring-4 focus-within:ring-[#000A57]/8">
          <textarea
            id="help-public-ai-question"
            bind:value={question}
            maxlength="600"
            rows="2"
            placeholder="Pergunte sobre este procedimento..."
            class="max-h-28 min-h-[42px] flex-1 resize-none bg-transparent px-2 py-2 text-[12px] leading-5 text-[#252C3D] outline-none placeholder:text-[#969CAA]"
            disabled={!available || loading}
          ></textarea>
          <button type="submit" disabled={!available || loading || question.trim().length < 3} class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#EA6D0B] text-white transition hover:bg-[#D96208] disabled:cursor-not-allowed disabled:opacity-45" aria-label="Enviar pergunta">
            {#if loading}<LoaderCircle size={17} class="animate-spin"/>{:else}<Send size={16}/>{/if}
          </button>
        </div>
        <div class="mt-2 flex items-center justify-between gap-3 px-1"><span class="inline-flex items-center gap-1.5 text-[8px] font-medium text-[#8B91A0]"><ShieldCheck size={11}/>Escopo restrito ao artigo</span><span class="text-[8px] text-[#A0A5B1]">{question.length}/600</span></div>
      </form>
    </aside>
  {/if}
{/if}

<style>
  :global(.help-ai-target-highlight) {
    animation: help-ai-target-pulse 1.2s ease-out 2;
    outline: 3px solid rgba(234, 109, 11, 0.7);
    outline-offset: 4px;
    border-radius: 18px;
  }

  @keyframes help-ai-target-pulse {
    0%, 100% { box-shadow: 0 0 0 0 rgba(234, 109, 11, 0); }
    45% { box-shadow: 0 0 0 10px rgba(234, 109, 11, 0.16); }
  }

  @media (prefers-reduced-motion: reduce) {
    :global(.help-ai-target-highlight) { animation: none; }
  }
</style>
