<script lang="ts">
  import { onMount, tick } from "svelte";
  import {
    ArrowLeft,
    Bot,
    CircleAlert,
    Download,
    ExternalLink,
    MessageCircleMore,
    MonitorCog,
    Send,
    TicketCheck,
    UserRound,
  } from "lucide-svelte";
  import type { ActionData, PageData } from "./$types";

  export let data: PageData;
  export let form: ActionData;

  type ChatMessage = PageData["initial"]["messages"][number];
  type ChatDetails = PageData["initial"]["chat"];

  let messages: ChatMessage[] = data.initial.messages;
  let chat: ChatDetails = data.initial.chat;
  let messageBody = "";
  let sending = false;
  let errorMessage = "";
  let messagesElement: HTMLDivElement;

  $: onlineRemoteDevices = data.remoteDevices.filter((device) => device.online);

  const aiLabels: Record<string, string> = {
    active: "IA atendendo",
    escalated: "Aguardando humano",
    human: "Atendimento humano",
    disabled: "IA desativada",
  };

  function formatTime(value: string | Date): string {
    return new Intl.DateTimeFormat("pt-BR", { hour: "2-digit", minute: "2-digit" }).format(new Date(value));
  }

  function messageAuthor(message: ChatMessage): string {
    if (message.authorType === "customer") return chat.customerName ?? "Cliente";
    if (message.authorType === "system") return "Agente IA";
    return message.authorUserName ?? "F10";
  }

  async function scrollToLatest(): Promise<void> {
    await tick();
    messagesElement?.scrollTo({ top: messagesElement.scrollHeight, behavior: "smooth" });
  }

  async function refreshMessages(): Promise<void> {
    if (document.visibilityState !== "visible") return;
    try {
      const response = await fetch(`/api/app/chat/${chat.sessionId}/messages`, { headers: { Accept: "application/json" } });
      if (!response.ok) return;
      const payload = (await response.json()) as { messages?: ChatMessage[]; chat?: ChatDetails };
      const nextMessages = payload.messages ?? [];
      const changed = nextMessages.length !== messages.length || nextMessages.at(-1)?.id !== messages.at(-1)?.id;
      if (payload.chat) chat = payload.chat;
      if (changed) { messages = nextMessages; await scrollToLatest(); }
    } catch {
      // Falhas transitórias de polling não interrompem a conversa.
    }
  }

  async function sendMessage(): Promise<void> {
    const body = messageBody.trim();
    if (!body || sending) return;
    sending = true; errorMessage = "";
    try {
      const response = await fetch(`/api/app/chat/${chat.sessionId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body }),
      });
      if (!response.ok) { errorMessage = "Não foi possível enviar a mensagem."; return; }
      messageBody = ""; await refreshMessages();
    } catch { errorMessage = "Não foi possível enviar a mensagem."; }
    finally { sending = false; }
  }

  onMount(() => {
    void scrollToLatest();
    const intervalId = window.setInterval(() => void refreshMessages(), 3000);
    const handleVisibilityChange = () => { if (document.visibilityState === "visible") void refreshMessages(); };
    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => { window.clearInterval(intervalId); document.removeEventListener("visibilitychange", handleVisibilityChange); };
  });
</script>

<svelte:head><title>Chat #{chat.ticketNumber} | F10 Operations</title></svelte:head>

<div class="mx-auto flex h-[calc(100dvh-78px)] max-w-[1380px] flex-col px-5 py-5 sm:px-8">
  <div class="flex shrink-0 flex-col justify-between gap-4 pb-5 lg:flex-row lg:items-center">
    <div class="flex min-w-0 items-center gap-3">
      <a href="/app/chat" class="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-[#606676] shadow-sm transition hover:text-[#000A57]" aria-label="Voltar para conversas"><ArrowLeft size={18}/></a>
      <span class="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#EEF0FF] text-[#000A57]"><UserRound size={20}/></span>
      <div class="min-w-0"><div class="flex flex-wrap items-center gap-2"><h1 class="truncate text-[16px] font-semibold text-[#222838]">{chat.customerName ?? "Cliente"}</h1><span class="text-[9px] font-bold text-[#EA6D0B]">#{chat.ticketNumber}</span><span class={`rounded-full px-2 py-1 text-[8px] font-bold ${chat.aiState === "active" ? "bg-[#F0EEFF] text-[#5142A6]" : chat.aiState === "escalated" ? "bg-[#FFF0F0] text-[#9B3C3C]" : "bg-[#F3F4F7] text-[#777D8D]"}`}>{aiLabels[chat.aiState]}</span></div><p class="mt-1 truncate text-[10px] text-[#898E9B]">{chat.organizationName ?? chat.customerEmail ?? "Chat do site"}</p>{#if chat.aiHandoffReason}<p class="mt-1 line-clamp-1 text-[9px] text-[#9A6464]">{chat.aiHandoffReason}</p>{/if}</div>
    </div>

    <div class="flex flex-wrap gap-2">
      {#if chat.contextUrl}<a href={chat.contextUrl} target="_blank" rel="noopener noreferrer" class="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-[#DDE1EA] bg-white px-3 text-[10px] font-semibold text-[#666C7B]">Página de origem<ExternalLink size={13}/></a>{/if}

      {#if data.remoteReady}
        {#if onlineRemoteDevices.length === 1 && data.canUseRemote}
          <form method="POST" action="?/startRemote">
            <input type="hidden" name="deviceId" value={onlineRemoteDevices[0].id}/>
            <button type="submit" class="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-[#DDE1EA] bg-white px-3 text-[10px] font-semibold text-[#000A57]"><MonitorCog size={14}/>Iniciar acesso remoto</button>
          </form>
        {:else if onlineRemoteDevices.length > 0 && data.canRequestRemote}
          <a href={`/app/tickets/${chat.ticketId}/remote`} class="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-[#DDE1EA] bg-white px-3 text-[10px] font-semibold text-[#000A57]"><MonitorCog size={14}/>Escolher computador</a>
        {:else if onlineRemoteDevices.length === 0 && data.canRequestRemote}
          <form method="POST" action="?/enrollRemote">
            <button type="submit" class="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-[#DDE1EA] bg-white px-3 text-[10px] font-semibold text-[#000A57]"><Download size={14}/>Instalar suporte remoto</button>
          </form>
        {/if}
      {:else if data.canRequestRemote}
        <a href={`/app/tickets/${chat.ticketId}/remote`} class="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-[#DDE1EA] bg-white px-3 text-[10px] font-semibold text-[#777D8D]"><MonitorCog size={14}/>Acesso remoto</a>
      {/if}

      <a href={`/app/tickets/${chat.ticketId}`} class="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl bg-[#000A57] px-3 text-[10px] font-semibold text-white">Abrir ticket<TicketCheck size={14}/></a>
    </div>
  </div>

  {#if form?.message}
    <div class={`mb-4 flex shrink-0 items-center gap-2 rounded-xl px-4 py-3 text-[10px] font-medium ${form.success ? "bg-[#EEF8F1] text-[#2F7045]" : "bg-[#FFF0F0] text-[#9B3C3C]"}`}>
      {#if !form.success}<CircleAlert size={14}/>{/if}
      {form.message}
    </div>
  {/if}

  <section class="flex min-h-0 flex-1 flex-col overflow-hidden rounded-[24px] border border-[#E2E5ED] bg-white shadow-[0_14px_40px_rgba(1,13,40,0.05)]">
    <header class="flex shrink-0 items-center justify-between border-b border-[#EEF0F5] px-5 py-3.5"><div class="flex items-center gap-2"><MessageCircleMore size={16} class="text-[#000A57]"/><span class="text-[11px] font-semibold text-[#444A59]">Conversa em tempo real</span></div><span class="text-[9px] text-[#989DAA]">{chat.assignedUserName ? `Atendendo: ${chat.assignedUserName}` : chat.aiState === "active" ? "Agente IA atendendo" : "Aguardando atendente"}</span></header>

    <div bind:this={messagesElement} class="min-h-0 flex-1 overflow-y-auto bg-[#F8F9FB] px-4 py-5 sm:px-6"><div class="mx-auto max-w-[840px] space-y-3">{#each messages as message}<div class={`flex ${message.authorType === "customer" ? "justify-start" : "justify-end"}`}><article class={`max-w-[82%] rounded-2xl px-4 py-3 shadow-sm ${message.authorType === "customer" ? "rounded-bl-md border border-[#E0E3EA] bg-white text-[#565C6B]" : message.authorType === "system" ? "rounded-br-md border border-[#D9D4F5] bg-[#F2F0FF] text-[#403878]" : "rounded-br-md bg-[#000A57] text-white"}`}>{#if message.authorType === "system"}<div class="mb-2 flex items-center gap-1.5 text-[8px] font-bold uppercase tracking-[0.08em] text-[#6255A8]"><Bot size={12}/>Agente IA</div>{/if}<p class="whitespace-pre-wrap text-[12px] leading-5">{message.body}</p><div class={`mt-2 flex items-center gap-2 text-[8px] ${message.authorType === "customer" ? "text-[#9A9FAC]" : message.authorType === "system" ? "text-[#8178B5]" : "text-white/60"}`}><span>{messageAuthor(message)}</span><span>·</span><span>{formatTime(message.createdAt)}</span></div></article></div>{/each}</div></div>

    {#if data.canRespond && chat.status !== "closed"}
      <footer class="shrink-0 border-t border-[#E6E8EE] bg-white p-4 sm:p-5"><div class="mx-auto max-w-[840px]">{#if chat.aiState === "active"}<div class="mb-3 flex items-center gap-2 rounded-xl bg-[#F4F2FF] px-3 py-2 text-[9px] font-medium text-[#6255A8]"><Bot size={14}/>Ao enviar uma resposta, você assume a conversa e o agente de IA é interrompido.</div>{/if}{#if errorMessage}<div class="mb-3 flex items-center gap-2 rounded-xl bg-[#FFF3F3] px-3 py-2 text-[10px] font-medium text-[#A13C3C]"><CircleAlert size={14}/>{errorMessage}</div>{/if}<form on:submit|preventDefault={() => void sendMessage()} class="flex items-end gap-3"><label class="min-w-0 flex-1"><span class="sr-only">Mensagem</span><textarea bind:value={messageBody} maxlength="4000" rows="2" placeholder="Escreva uma mensagem..." class="max-h-32 min-h-[52px] w-full resize-none rounded-2xl border border-[#DDE1EA] px-4 py-3 text-[12px] leading-5 outline-none focus:border-[#000A57] focus:ring-2 focus:ring-[#000A57]/10"></textarea></label><button type="submit" disabled={sending || !messageBody.trim()} class="inline-flex h-[52px] w-[52px] shrink-0 items-center justify-center rounded-2xl bg-[#000A57] text-white transition hover:bg-[#111B71] disabled:bg-[#D6D9E2]" aria-label="Enviar mensagem"><Send size={18}/></button></form></div></footer>
    {/if}
  </section>
</div>
