<script lang="ts">
  import { goto } from "$app/navigation";
  import { page } from "$app/stores";
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

  type ChatMessage = {
    id: number;
    role: "user" | "assistant";
    text: string;
    resolution?: HelpResolution | null;
    target?: HelpTarget | null;
    error?: boolean;
  };

  const starterQuestions = [
    "Resuma este procedimento",
    "O que é obrigatório aqui?",
    "Quais pontos exigem atenção?",
  ];

  let minimized = false;
  let question = "";
  let loading = false;
  let messages: ChatMessage[] = [];
  let viewport: HTMLDivElement | null = null;
  let messageSequence = 0;
  let lastArticleSlug = "";

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
  $: if (articleSlug && articleSlug !== lastArticleSlug) {
    lastArticleSlug = articleSlug;
    messages = [];
    question = "";
    loading = false;
    minimized = false;
  }

  function targetElement(helpTarget: HelpTarget): HTMLElement | null {
    if (typeof document === "undefined") return null;
    if (helpTarget.anchor) return document.getElementById(helpTarget.anchor);
    return document.querySelector<HTMLElement>("[data-help-content-slug] header");
  }

  async function scrollConversation(): Promise<void> {
    await tick();
    if (!viewport) return;
    viewport.scrollTo({ top: viewport.scrollHeight, behavior: "smooth" });
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

  function conversationContext(): string {
    const context = messages
      .filter((message) => !message.error)
      .slice(-8)
      .map((message) => `${message.role === "user" ? "Cliente" : "Assistente"}: ${message.text}`)
      .join("\n");
    return context.length <= 5_500 ? context : context.slice(context.length - 5_500);
  }

  function addMessage(message: Omit<ChatMessage, "id">): void {
    messageSequence += 1;
    messages = [...messages, { ...message, id: messageSequence }];
    void scrollConversation();
  }

  async function submitQuestion(value?: string): Promise<void> {
    const normalized = (value ?? question).trim();
    if (!available || loading || normalized.length < 3 || !articleSlug) return;

    const context = conversationContext();
    question = "";
    addMessage({ role: "user", text: normalized });
    loading = true;

    try {
      const response = await fetch("/api/help/ask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question: normalized,
          scope: "article",
          articleSlug,
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
        addMessage({ role: "assistant", text: errorFor(payload.error ?? ""), error: true });
        return;
      }

      const answer = typeof payload.answer === "string" && payload.answer.trim()
        ? payload.answer.trim()
        : "Não encontrei uma orientação publicada que responda isso com segurança.";
      const resolution = payload.resolution ?? "not_found";
      const target = payload.target ?? null;
      addMessage({ role: "assistant", text: answer, resolution, target });

      if (resolution === "answered" && target?.slug === articleSlug) {
        await revealTarget(target);
      }
    } catch {
      addMessage({ role: "assistant", text: errorFor(""), error: true });
    } finally {
      loading = false;
      await scrollConversation();
    }
  }

  function handleQuestionKeydown(event: KeyboardEvent): void {
    if (event.key !== "Enter" || event.shiftKey) return;
    event.preventDefault();
    void submitQuestion();
  }
</script>

{#if enabled && articleSlug}
  {#if minimized}
    <button
      type="button"
      class="fixed bottom-4 left-1/2 z-40 inline-flex min-h-12 -translate-x-1/2 items-center gap-2 rounded-full border border-[#D9DDE8] bg-white px-5 text-[11px] font-semibold text-[#000A57] shadow-[0_18px_50px_rgba(1,13,40,0.18)] transition hover:-translate-y-0.5 sm:bottom-6"
      on:click={() => (minimized = false)}
      aria-label="Abrir assistente deste artigo"
    >
      <Sparkles size={16} class="text-[#EA6D0B]" />
      Conversar sobre este artigo
    </button>
  {:else}
    <aside class="fixed bottom-3 left-1/2 z-40 w-[calc(100vw-20px)] max-w-[760px] -translate-x-1/2 overflow-hidden rounded-[26px] border border-[#D9DDE8] bg-white shadow-[0_24px_80px_rgba(1,13,40,0.20)] sm:bottom-6">
      <header class="flex items-center justify-between gap-3 border-b border-[#E7EAF1] bg-[#010D28] px-4 py-3 text-white sm:px-5">
        <div class="flex min-w-0 items-center gap-3">
          <span class="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/10 text-[#FF9A4B]"><Sparkles size={17} /></span>
          <div class="min-w-0">
            <strong class="block truncate text-[12px] font-semibold">Assistente F10</strong>
            <span class="mt-0.5 block text-[9px] text-white/55">Conversa contextual sobre este artigo</span>
          </div>
        </div>
        <button type="button" class="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-white/65 transition hover:bg-white/10 hover:text-white" on:click={() => (minimized = true)} aria-label="Minimizar assistente"><X size={15}/></button>
      </header>

      <div bind:this={viewport} class="max-h-[46vh] min-h-[150px] overflow-y-auto bg-[#F7F8FB] px-3 py-4 sm:px-5">
        {#if !available}
          <div class="mx-auto max-w-[620px] rounded-2xl border border-[#F1D7BD] bg-[#FFF9F3] px-4 py-3 text-[11px] leading-5 text-[#7A3B08]">
            Assistente temporariamente indisponível.
            {#if requiresAuthentication}<a href="/cliente" class="mt-2 block font-semibold text-[#000A57] hover:underline">Entrar na Área do Cliente</a>{/if}
          </div>
        {:else if messages.length === 0}
          <div class="mx-auto max-w-[620px]">
            <div class="flex items-start gap-3">
              <span class="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#EEF0FF] text-[#000A57]"><MessageCircleQuestion size={15}/></span>
              <div class="max-w-[540px] rounded-2xl rounded-tl-md bg-white px-4 py-3 shadow-[0_4px_18px_rgba(1,13,40,0.05)]">
                <p class="text-[12px] leading-6 text-[#424A5D]">Posso esclarecer este procedimento e continuar a conversa usando somente o conteúdo publicado deste artigo. Pergunte de forma natural, inclusive em sequência.</p>
              </div>
            </div>
            <div class="ml-11 mt-3 flex flex-wrap gap-2">
              {#each starterQuestions as starter}
                <button type="button" on:click={() => submitQuestion(starter)} class="rounded-full border border-[#D8DDF4] bg-white px-3 py-2 text-[9px] font-semibold text-[#000A57] transition hover:border-[#AEB8EF] hover:bg-[#F8F9FF]">{starter}</button>
              {/each}
            </div>
          </div>
        {/if}

        {#if messages.length > 0}
          <div class="mx-auto max-w-[660px] space-y-3">
            {#each messages as message (message.id)}
              {#if message.role === "user"}
                <div class="flex justify-end">
                  <div class="max-w-[86%] rounded-2xl rounded-br-md bg-[#000A57] px-4 py-3 text-white">
                    <p class="whitespace-pre-wrap text-[12px] leading-5">{message.text}</p>
                  </div>
                </div>
              {:else}
                <div class="flex items-start gap-2.5">
                  <span class={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${message.error ? "bg-[#FFF0E8] text-[#A9510D]" : "bg-[#EEF0FF] text-[#000A57]"}`}><Sparkles size={14}/></span>
                  <div class={`max-w-[86%] rounded-2xl rounded-tl-md border px-4 py-3 ${message.error ? "border-[#F1D7BD] bg-[#FFF9F3]" : "border-[#E7EAF1] bg-white"}`}>
                    <p class={`whitespace-pre-wrap text-[12px] leading-6 ${message.error ? "text-[#7A3B08]" : "text-[#424A5D]"}`}>{message.text}</p>
                    {#if message.target && message.resolution === "answered"}
                      <button type="button" class="mt-3 inline-flex min-h-9 items-center gap-2 rounded-xl bg-[#EEF0FF] px-3 text-[10px] font-semibold text-[#000A57]" on:click={() => message.target && openTarget(message.target)}>Mostrar no artigo<ArrowUpRight size={13}/></button>
                    {:else if message.target && message.resolution === "found_elsewhere"}
                      <button type="button" class="mt-3 inline-flex min-h-9 items-center gap-2 rounded-xl bg-[#EEF0FF] px-3 text-[10px] font-semibold text-[#000A57]" on:click={() => message.target && openTarget(message.target)}>Abrir {message.target.title}<ArrowUpRight size={13}/></button>
                    {/if}
                    {#if message.error && requiresAuthentication}<a href="/cliente" class="mt-2 block text-[10px] font-semibold text-[#000A57] hover:underline">Entrar na Área do Cliente</a>{/if}
                  </div>
                </div>
              {/if}
            {/each}

            {#if loading}
              <div class="flex items-start gap-2.5">
                <span class="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#EEF0FF] text-[#000A57]"><Sparkles size={14}/></span>
                <div class="inline-flex min-h-11 items-center gap-2 rounded-2xl rounded-tl-md border border-[#E7EAF1] bg-white px-4 py-3 text-[10px] font-medium text-[#7A8190]"><LoaderCircle size={14} class="animate-spin"/>Consultando este artigo...</div>
              </div>
            {/if}
          </div>
        {/if}
      </div>

      <form class="border-t border-[#E7EAF1] bg-white p-3 sm:px-4 sm:py-3.5" on:submit|preventDefault={() => submitQuestion()}>
        <label class="sr-only" for="help-public-ai-question">Pergunte sobre este artigo</label>
        <div class="mx-auto flex max-w-[680px] items-end gap-2 rounded-2xl border border-[#DDE1EA] bg-[#FAFBFD] p-2 focus-within:border-[#000A57] focus-within:ring-4 focus-within:ring-[#000A57]/8">
          <textarea
            id="help-public-ai-question"
            bind:value={question}
            maxlength="600"
            rows="1"
            placeholder="Pergunte sobre este artigo ou continue a conversa..."
            class="max-h-28 min-h-[42px] flex-1 resize-none bg-transparent px-2 py-2.5 text-[12px] leading-5 text-[#252C3D] outline-none placeholder:text-[#969CAA]"
            disabled={!available || loading}
            on:keydown={handleQuestionKeydown}
          ></textarea>
          <button type="submit" disabled={!available || loading || question.trim().length < 3} class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#EA6D0B] text-white transition hover:bg-[#D96208] disabled:cursor-not-allowed disabled:opacity-45" aria-label="Enviar pergunta">
            {#if loading}<LoaderCircle size={17} class="animate-spin"/>{:else}<Send size={16}/>{/if}
          </button>
        </div>
        <div class="mx-auto mt-2 flex max-w-[680px] items-center justify-between gap-3 px-1">
          <span class="inline-flex items-center gap-1.5 text-[8px] font-medium text-[#8B91A0]"><ShieldCheck size={11}/>Respostas limitadas ao artigo; histórico usado apenas para contexto</span>
          <span class="text-[8px] text-[#A0A5B1]">Enter envia · Shift+Enter quebra linha</span>
        </div>
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
