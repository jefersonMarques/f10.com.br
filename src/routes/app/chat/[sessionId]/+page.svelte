<script lang="ts">
  import { onMount, tick } from "svelte";
  import {
    ArrowLeft,
    CircleAlert,
    ExternalLink,
    MessageCircleMore,
    Send,
    TicketCheck,
    UserRound,
  } from "lucide-svelte";
  import type { PageData } from "./$types";

  export let data: PageData;

  type ChatMessage = PageData["initial"]["messages"][number];

  let messages: ChatMessage[] = data.initial.messages;
  let messageBody = "";
  let sending = false;
  let errorMessage = "";
  let messagesElement: HTMLDivElement;

  function formatTime(value: string | Date): string {
    return new Intl.DateTimeFormat("pt-BR", {
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(value));
  }

  async function scrollToLatest(): Promise<void> {
    await tick();
    messagesElement?.scrollTo({
      top: messagesElement.scrollHeight,
      behavior: "smooth",
    });
  }

  async function refreshMessages(): Promise<void> {
    if (document.visibilityState !== "visible") return;

    try {
      const response = await fetch(
        `/api/app/chat/${data.initial.chat.sessionId}/messages`,
        { headers: { Accept: "application/json" } },
      );

      if (!response.ok) return;

      const payload = (await response.json()) as { messages?: ChatMessage[] };
      const nextMessages = payload.messages ?? [];
      const changed =
        nextMessages.length !== messages.length ||
        nextMessages.at(-1)?.id !== messages.at(-1)?.id;

      if (changed) {
        messages = nextMessages;
        await scrollToLatest();
      }
    } catch {
      // Falhas transitórias de polling não interrompem a conversa.
    }
  }

  async function sendMessage(): Promise<void> {
    const body = messageBody.trim();
    if (!body || sending) return;

    sending = true;
    errorMessage = "";

    try {
      const response = await fetch(
        `/api/app/chat/${data.initial.chat.sessionId}/messages`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ body }),
        },
      );

      if (!response.ok) {
        errorMessage = "Não foi possível enviar a mensagem.";
        return;
      }

      messageBody = "";
      await refreshMessages();
    } catch {
      errorMessage = "Não foi possível enviar a mensagem.";
    } finally {
      sending = false;
    }
  }

  onMount(() => {
    void scrollToLatest();
    const intervalId = window.setInterval(() => void refreshMessages(), 3000);

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") void refreshMessages();
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      window.clearInterval(intervalId);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  });
</script>

<svelte:head>
  <title>Chat #{data.initial.chat.ticketNumber} | F10 Operations</title>
</svelte:head>

<div class="mx-auto flex h-[calc(100dvh-78px)] max-w-[1380px] flex-col px-5 py-5 sm:px-8">
  <div class="flex shrink-0 flex-col justify-between gap-4 pb-5 lg:flex-row lg:items-center">
    <div class="flex min-w-0 items-center gap-3">
      <a
        href="/app/chat"
        class="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-[#606676] shadow-sm transition hover:text-[#000A57]"
        aria-label="Voltar para conversas"
      >
        <ArrowLeft size={18} aria-hidden="true" />
      </a>
      <span class="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#EEF0FF] text-[#000A57]">
        <UserRound size={20} aria-hidden="true" />
      </span>
      <div class="min-w-0">
        <div class="flex flex-wrap items-center gap-2">
          <h1 class="truncate text-[16px] font-semibold text-[#222838]">{data.initial.chat.customerName ?? "Cliente"}</h1>
          <span class="text-[9px] font-bold text-[#EA6D0B]">#{data.initial.chat.ticketNumber}</span>
        </div>
        <p class="mt-1 truncate text-[10px] text-[#898E9B]">
          {data.initial.chat.organizationName ?? data.initial.chat.customerEmail ?? "Chat do site"}
        </p>
      </div>
    </div>

    <div class="flex flex-wrap gap-2">
      {#if data.initial.chat.contextUrl}
        <a
          href={data.initial.chat.contextUrl}
          target="_blank"
          rel="noopener noreferrer"
          class="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-[#DDE1EA] bg-white px-3 text-[10px] font-semibold text-[#666C7B]"
        >
          Página de origem
          <ExternalLink size={13} aria-hidden="true" />
        </a>
      {/if}
      <a
        href={`/app/tickets/${data.initial.chat.ticketId}`}
        class="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl bg-[#000A57] px-3 text-[10px] font-semibold text-white"
      >
        Abrir ticket
        <TicketCheck size={14} aria-hidden="true" />
      </a>
    </div>
  </div>

  <section class="flex min-h-0 flex-1 flex-col overflow-hidden rounded-[24px] border border-[#E2E5ED] bg-white shadow-[0_14px_40px_rgba(1,13,40,0.05)]">
    <header class="flex shrink-0 items-center justify-between border-b border-[#EEF0F5] px-5 py-3.5">
      <div class="flex items-center gap-2">
        <MessageCircleMore size={16} class="text-[#000A57]" aria-hidden="true" />
        <span class="text-[11px] font-semibold text-[#444A59]">Conversa em tempo real</span>
      </div>
      <span class="text-[9px] text-[#989DAA]">
        {data.initial.chat.assignedUserName ? `Atendendo: ${data.initial.chat.assignedUserName}` : "Aguardando atendente"}
      </span>
    </header>

    <div bind:this={messagesElement} class="min-h-0 flex-1 overflow-y-auto bg-[#F8F9FB] px-4 py-5 sm:px-6">
      <div class="mx-auto max-w-[840px] space-y-3">
        {#each messages as message}
          <div class={`flex ${message.authorType === "customer" ? "justify-start" : "justify-end"}`}>
            <article
              class={`max-w-[82%] rounded-2xl px-4 py-3 shadow-sm ${
                message.authorType === "customer"
                  ? "rounded-bl-md border border-[#E0E3EA] bg-white text-[#565C6B]"
                  : "rounded-br-md bg-[#000A57] text-white"
              }`}
            >
              <p class="whitespace-pre-wrap text-[12px] leading-5">{message.body}</p>
              <div class={`mt-2 flex items-center gap-2 text-[8px] ${message.authorType === "customer" ? "text-[#9A9FAC]" : "text-white/60"}`}>
                <span>{message.authorType === "customer" ? data.initial.chat.customerName ?? "Cliente" : message.authorUserName ?? "F10"}</span>
                <span>·</span>
                <span>{formatTime(message.createdAt)}</span>
              </div>
            </article>
          </div>
        {/each}
      </div>
    </div>

    {#if data.canRespond && data.initial.chat.status !== "closed"}
      <footer class="shrink-0 border-t border-[#E6E8EE] bg-white p-4 sm:p-5">
        <div class="mx-auto max-w-[840px]">
          {#if errorMessage}
            <div class="mb-3 flex items-center gap-2 rounded-xl bg-[#FFF3F3] px-3 py-2 text-[10px] font-medium text-[#A13C3C]">
              <CircleAlert size={14} aria-hidden="true" />
              {errorMessage}
            </div>
          {/if}

          <form
            on:submit|preventDefault={() => void sendMessage()}
            class="flex items-end gap-3"
          >
            <label class="min-w-0 flex-1">
              <span class="sr-only">Mensagem</span>
              <textarea
                bind:value={messageBody}
                maxlength="4000"
                rows="2"
                placeholder="Escreva uma mensagem..."
                class="max-h-32 min-h-[52px] w-full resize-none rounded-2xl border border-[#DDE1EA] px-4 py-3 text-[12px] leading-5 outline-none focus:border-[#000A57] focus:ring-2 focus:ring-[#000A57]/10"
              ></textarea>
            </label>
            <button
              type="submit"
              disabled={sending || !messageBody.trim()}
              class="inline-flex h-[52px] w-[52px] shrink-0 items-center justify-center rounded-2xl bg-[#000A57] text-white transition hover:bg-[#111B71] disabled:bg-[#D6D9E2]"
              aria-label="Enviar mensagem"
            >
              <Send size={18} aria-hidden="true" />
            </button>
          </form>
        </div>
      </footer>
    {/if}
  </section>
</div>
