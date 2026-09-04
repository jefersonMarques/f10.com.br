<script lang="ts">
  import { tick } from "svelte";
  import {
    LoaderCircle,
    MessageCircleQuestion,
    Send,
    Sparkles,
    X,
  } from "lucide-svelte";

  export let mode: "preview" | "invite" | "public";
  export let sourceContentSlug: string;

  type ChatMessage = {
    id: number;
    role: "user" | "assistant";
    text: string;
    error?: boolean;
  };

  let open = false;
  let question = "";
  let loading = false;
  let messages: ChatMessage[] = [];
  let sequence = 0;
  let viewport: HTMLDivElement | null = null;

  function context(): string {
    return messages
      .slice(-8)
      .filter((message) => !message.error)
      .map((message) => `${message.role === "user" ? "Cliente" : "Tutor"}: ${message.text}`)
      .join("\n")
      .slice(-5000);
  }

  async function scrollToEnd(): Promise<void> {
    await tick();
    viewport?.scrollTo({ top: viewport.scrollHeight, behavior: "smooth" });
  }

  function addMessage(message: Omit<ChatMessage, "id">): void {
    sequence += 1;
    messages = [...messages, { ...message, id: sequence }];
    void scrollToEnd();
  }

  function errorMessage(code: string): string {
    if (code === "RATE_LIMITED") return "O limite de perguntas foi atingido. Aguarde alguns minutos.";
    if (code === "TRAINING_SESSION_REQUIRED" || code === "AUTH_REQUIRED") {
      return "A sessão da trilha expirou. Abra a trilha novamente para continuar.";
    }
    return "O tutor não está disponível agora.";
  }

  async function submit(value?: string): Promise<void> {
    const normalized = (value ?? question).trim();
    if (loading || normalized.length < 3) return;

    const conversationContext = context();
    question = "";
    addMessage({ role: "user", text: normalized });
    loading = true;

    try {
      const response = await fetch(mode === "preview" ? "/api/help/ask" : "/api/training/tutor", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          mode === "preview"
            ? {
                question: normalized,
                scope: "article",
                articleSlug: sourceContentSlug,
                conversationContext,
              }
            : {
                question: normalized,
                conversationContext,
              },
        ),
      });
      const payload = await response.json() as { answer?: string; error?: string };
      if (!response.ok || !payload.answer) {
        addMessage({
          role: "assistant",
          text: errorMessage(payload.error ?? ""),
          error: true,
        });
        return;
      }
      addMessage({ role: "assistant", text: payload.answer });
    } catch {
      addMessage({ role: "assistant", text: errorMessage(""), error: true });
    } finally {
      loading = false;
      await scrollToEnd();
    }
  }

  function handleKeydown(event: KeyboardEvent): void {
    if (event.key !== "Enter" || event.shiftKey) return;
    event.preventDefault();
    void submit();
  }
</script>

<div class="fixed bottom-5 left-5 z-[125] sm:bottom-6 sm:left-6">
  {#if !open}
    <button
      type="button"
      on:click={() => (open = true)}
      class="flex h-14 w-14 items-center justify-center rounded-full bg-[#000A57] text-white shadow-[0_18px_44px_rgba(0,10,87,0.30)] transition hover:-translate-y-0.5"
      aria-label="Abrir tutor da trilha"
      title="Tutor da trilha"
    >
      <MessageCircleQuestion size={22}/>
    </button>
  {:else}
    <aside class="w-[min(390px,calc(100vw-32px))] overflow-hidden rounded-[24px] border border-[#D9DDE8] bg-white shadow-[0_24px_80px_rgba(1,13,40,0.24)]">
      <header class="flex items-center justify-between gap-3 bg-[#010D28] px-4 py-3 text-white">
        <div class="flex min-w-0 items-center gap-3">
          <span class="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/10 text-[#FF9A4B]"><Sparkles size={17}/></span>
          <div>
            <strong class="block text-[11px] font-semibold">Tutor da trilha</strong>
            <span class="mt-0.5 block text-[8px] text-white/55">Responde usando o conteúdo publicado</span>
          </div>
        </div>
        <button type="button" on:click={() => (open = false)} class="flex h-8 w-8 items-center justify-center rounded-lg text-white/65 transition hover:bg-white/10 hover:text-white" aria-label="Fechar tutor"><X size={15}/></button>
      </header>

      <div bind:this={viewport} class="max-h-[42vh] min-h-[170px] overflow-y-auto bg-[#F7F8FB] px-3 py-4">
        {#if messages.length === 0}
          <div class="flex items-start gap-2.5">
            <span class="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#EEF0FF] text-[#000A57]"><MessageCircleQuestion size={14}/></span>
            <div class="rounded-2xl rounded-tl-md bg-white px-4 py-3 shadow-[0_4px_18px_rgba(1,13,40,0.05)]">
              <p class="text-[11px] leading-5 text-[#424A5D]">Se algo não estiver claro nesta etapa, pergunte aqui. O tutor usa apenas o conteúdo publicado da trilha.</p>
            </div>
          </div>
        {:else}
          <div class="space-y-3">
            {#each messages as message (message.id)}
              {#if message.role === "user"}
                <div class="flex justify-end">
                  <div class="max-w-[86%] rounded-2xl rounded-br-md bg-[#000A57] px-4 py-3 text-white">
                    <p class="whitespace-pre-wrap text-[11px] leading-5">{message.text}</p>
                  </div>
                </div>
              {:else}
                <div class="flex items-start gap-2.5">
                  <span class={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${message.error ? "bg-[#FFF0E8] text-[#A9510D]" : "bg-[#EEF0FF] text-[#000A57]"}`}><Sparkles size={14}/></span>
                  <div class={`max-w-[86%] rounded-2xl rounded-tl-md border px-4 py-3 ${message.error ? "border-[#F1D7BD] bg-[#FFF9F3]" : "border-[#E7EAF1] bg-white"}`}>
                    <p class={`whitespace-pre-wrap text-[11px] leading-5 ${message.error ? "text-[#7A3B08]" : "text-[#424A5D]"}`}>{message.text}</p>
                  </div>
                </div>
              {/if}
            {/each}
            {#if loading}
              <div class="inline-flex min-h-10 items-center gap-2 rounded-2xl bg-white px-4 py-3 text-[9px] text-[#7A8190]"><LoaderCircle size={13} class="animate-spin"/>Consultando...</div>
            {/if}
          </div>
        {/if}
      </div>

      <form on:submit|preventDefault={() => void submit()} class="border-t border-[#E7EAF1] bg-white p-3">
        <div class="flex items-end gap-2 rounded-2xl border border-[#DDE1EA] bg-[#FAFBFD] p-2 focus-within:border-[#000A57]">
          <textarea
            bind:value={question}
            rows="1"
            maxlength="600"
            placeholder="Pergunte sobre esta etapa..."
            class="max-h-24 min-h-[40px] flex-1 resize-none bg-transparent px-2 py-2 text-[11px] leading-5 outline-none"
            on:keydown={handleKeydown}
            disabled={loading}
          ></textarea>
          <button type="submit" disabled={loading || question.trim().length < 3} class="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#EA6D0B] text-white disabled:opacity-45" aria-label="Enviar pergunta">
            {#if loading}<LoaderCircle size={15} class="animate-spin"/>{:else}<Send size={14}/>{/if}
          </button>
        </div>
      </form>
    </aside>
  {/if}
</div>
