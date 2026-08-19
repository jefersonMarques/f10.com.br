<script lang="ts">
  import { onMount } from "svelte";
  import {
    Bot,
    CircleAlert,
    Download,
    MessageCircleMore,
    RefreshCw,
    Send,
    ShieldCheck,
    UserRound,
  } from "lucide-svelte";
  import ApplicationBackLink from "$lib/components/application/ApplicationBackLink.svelte";
  import ApplicationContent from "$lib/components/application/ApplicationContent.svelte";
  import type { PageData } from "./$types";

  export let data: PageData;

  type PreviewSession = {
    sessionId: string;
    token: string;
    ticketNumber: number;
    aiState: "active" | "escalated" | "human" | "disabled";
  };

  type PreviewMessage = {
    id: string;
    authorType: "customer" | "user" | "system";
    body: string;
    createdAt: string;
  };

  const STORAGE_KEY = "f10_native_chat_preview";
  const REMOTE_INSTALL_PATTERN = /\/suporte-remoto\/instalar\/[A-Za-z0-9_-]{40,120}/;
  const REMOTE_INSTALL_URL_PATTERN = /https?:\/\/[^\s]+\/suporte-remoto\/instalar\/[A-Za-z0-9_-]{40,120}/;

  let name = "Cliente de teste";
  let email = "cliente.teste@example.com";
  let phone = "";
  let firstMessage = "";
  let messageBody = "";
  let session: PreviewSession | null = null;
  let messages: PreviewMessage[] = [];
  let loading = false;
  let errorMessage = "";
  let pollTimer: number | null = null;

  const aiLabels: Record<string, string> = {
    active: "IA atendendo",
    escalated: "Escalado para humano",
    human: "Atendimento humano",
    disabled: "IA desativada",
  };

  function saveSession(value: PreviewSession | null = session): void {
    if (!value) {
      sessionStorage.removeItem(STORAGE_KEY);
      return;
    }
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(value));
  }

  function formatTime(value: string): string {
    return new Intl.DateTimeFormat("pt-BR", {
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(value));
  }

  function remoteInstallPath(body: string): string {
    return body.match(REMOTE_INSTALL_PATTERN)?.[0] ?? "";
  }

  function visibleMessageBody(body: string): string {
    const cleaned = body
      .replace(REMOTE_INSTALL_URL_PATTERN, "")
      .replace(/\s+:/g, ":")
      .trim();
    return cleaned || "A equipe F10 enviou o instalador de suporte remoto.";
  }

  async function loadMessages(): Promise<void> {
    const activeSession = session;
    if (!activeSession) return;

    try {
      const response = await fetch(
        `/api/support/chat/${activeSession.sessionId}/messages`,
        {
          headers: {
            Authorization: `Bearer ${activeSession.token}`,
            Accept: "application/json",
          },
        },
      );

      if (!response.ok) return;

      const payload = (await response.json()) as {
        messages?: PreviewMessage[];
        aiState?: PreviewSession["aiState"];
      };
      messages = payload.messages ?? [];
      if (payload.aiState) {
        const nextSession = { ...activeSession, aiState: payload.aiState };
        session = nextSession;
        saveSession(nextSession);
      }
    } catch {
      // Falhas transitórias de polling não interrompem o preview.
    }
  }

  async function startChat(): Promise<void> {
    const message = firstMessage.trim();
    if (!name.trim() || !message || loading) return;

    loading = true;
    errorMessage = "";

    try {
      const response = await fetch("/api/support/chat/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim(),
          phone: phone.trim(),
          message,
          contextUrl: window.location.href,
          pageTitle: "Preview interno do chat nativo",
          helpContext: "operations-preview",
        }),
      });

      const payload = (await response.json()) as Record<string, unknown>;
      if (!response.ok) {
        errorMessage = `Não foi possível iniciar o chat (${String(payload.error ?? response.status)}).`;
        return;
      }

      const nextSession: PreviewSession = {
        sessionId: String(payload.sessionId),
        token: String(payload.token),
        ticketNumber: Number(payload.ticketNumber),
        aiState:
          (payload.aiState as PreviewSession["aiState"] | undefined) ??
          "disabled",
      };
      session = nextSession;
      saveSession(nextSession);
      firstMessage = "";
      await loadMessages();
    } catch {
      errorMessage = "Não foi possível iniciar o chat de teste.";
    } finally {
      loading = false;
    }
  }

  async function sendMessage(): Promise<void> {
    const activeSession = session;
    const body = messageBody.trim();
    if (!activeSession || !body || loading) return;

    loading = true;
    errorMessage = "";

    try {
      const response = await fetch(
        `/api/support/chat/${activeSession.sessionId}/messages`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${activeSession.token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ body }),
        },
      );

      const payload = (await response.json()) as Record<string, unknown>;
      if (!response.ok) {
        errorMessage = `Não foi possível enviar a mensagem (${String(payload.error ?? response.status)}).`;
        return;
      }

      if (typeof payload.aiState === "string") {
        const nextSession: PreviewSession = {
          ...activeSession,
          aiState: payload.aiState as PreviewSession["aiState"],
        };
        session = nextSession;
        saveSession(nextSession);
      }
      messageBody = "";
      await loadMessages();
    } catch {
      errorMessage = "Não foi possível enviar a mensagem.";
    } finally {
      loading = false;
    }
  }

  function resetPreview(): void {
    session = null;
    messages = [];
    messageBody = "";
    errorMessage = "";
    saveSession(null);
  }

  onMount(() => {
    const saved = sessionStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        session = JSON.parse(saved) as PreviewSession;
        void loadMessages();
      } catch {
        sessionStorage.removeItem(STORAGE_KEY);
      }
    }

    pollTimer = window.setInterval(() => void loadMessages(), 3000);
    return () => {
      if (pollTimer !== null) window.clearInterval(pollTimer);
    };
  });
</script>

<svelte:head>
  <title>Preview do Chat | F10 Operations</title>
</svelte:head>

<ApplicationContent width="narrow">
  <div class="mb-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
    <ApplicationBackLink href="/app/chat" label="Chat" />
    <div class="rounded-xl border border-[#E2E5ED] bg-white px-4 py-2.5 sm:text-right">
      <span class="text-[9px] font-bold uppercase tracking-[0.08em] text-[#959AA8]">Agente no chat</span>
      <span class={`ml-2 inline-flex rounded-full px-2.5 py-1 text-[8px] font-bold ${data.aiEnabled ? "bg-[#EEF8F1] text-[#2F7045]" : "bg-[#FFF4E9] text-[#A9510D]"}`}>{data.aiEnabled ? "Habilitado" : "Desabilitado"}</span>
    </div>
  </div>

  {#if !data.aiEnabled}
    <div class="mb-3 flex items-start gap-3 rounded-2xl border border-[#F0D3B8] bg-[#FFF9F3] px-4 py-3 text-[10px] leading-5 text-[#81512A]"><CircleAlert size={16} class="mt-0.5 shrink-0" aria-hidden="true" /><span>Para homologar o agente dentro do chat, use <strong>SUPPORT_AI_CHAT_ENABLED=true</strong>. Com o flag desligado, o preview continua testando o chat humano normalmente.</span></div>
  {/if}

  {#if errorMessage}
    <div class="mb-3 flex items-center gap-2 rounded-xl bg-[#FFF3F3] px-4 py-3 text-[10px] font-medium text-[#A13C3C]"><CircleAlert size={15} aria-hidden="true" />{errorMessage}</div>
  {/if}

  {#if !session}
    <section class="rounded-[22px] border border-[#E2E5ED] bg-white p-5 shadow-[0_10px_32px_rgba(1,13,40,0.04)] sm:p-6">
      <div class="flex items-start gap-3"><span class="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#EEF0FF] text-[#000A57]"><UserRound size={20} aria-hidden="true" /></span><div><h2 class="text-[15px] font-semibold text-[#202637]">Iniciar como cliente</h2><p class="mt-1 text-[10px] text-[#858B99]">Use uma dúvida que exista na Base publicada e depois uma que não exista para testar os dois caminhos.</p></div></div>

      <form on:submit|preventDefault={() => void startChat()} class="mt-6 grid gap-4 sm:grid-cols-2">
        <label class="block"><span class="mb-1.5 block text-[10px] font-semibold text-[#4A5060]">Nome</span><input bind:value={name} required maxlength="120" class="h-11 w-full rounded-xl border border-[#DDE1EA] px-3 text-[12px] outline-none focus:border-[#000A57]" /></label>
        <label class="block"><span class="mb-1.5 block text-[10px] font-semibold text-[#4A5060]">E-mail</span><input bind:value={email} type="email" maxlength="254" class="h-11 w-full rounded-xl border border-[#DDE1EA] px-3 text-[12px] outline-none focus:border-[#000A57]" /></label>
        <label class="block sm:col-span-2"><span class="mb-1.5 block text-[10px] font-semibold text-[#4A5060]">Telefone opcional</span><input bind:value={phone} maxlength="40" class="h-11 w-full rounded-xl border border-[#DDE1EA] px-3 text-[12px] outline-none focus:border-[#000A57]" /></label>
        <label class="block sm:col-span-2"><span class="mb-1.5 block text-[10px] font-semibold text-[#4A5060]">Primeira dúvida</span><textarea bind:value={firstMessage} required maxlength="4000" rows="4" placeholder="Ex.: Meu aluno está na turma errada. Como faço para trocar?" class="w-full resize-y rounded-xl border border-[#DDE1EA] px-3 py-3 text-[12px] leading-5 outline-none focus:border-[#000A57]"></textarea></label>
        <button type="submit" disabled={loading} class="sm:col-span-2 inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[#000A57] px-5 text-[12px] font-semibold text-white disabled:bg-[#C6CAD6]"><MessageCircleMore size={17} aria-hidden="true" />{loading ? "Iniciando..." : "Iniciar conversa"}</button>
      </form>
    </section>
  {:else}
    <section class="overflow-hidden rounded-[22px] border border-[#E2E5ED] bg-white shadow-[0_12px_36px_rgba(1,13,40,0.05)]">
      <header class="flex flex-col justify-between gap-3 border-b border-[#EEF0F5] px-5 py-4 sm:flex-row sm:items-center sm:px-6">
        <div><div class="flex flex-wrap items-center gap-2"><h2 class="text-[14px] font-semibold text-[#222839]">Ticket #{session.ticketNumber}</h2><span class={`rounded-full px-2 py-1 text-[8px] font-bold ${session.aiState === "active" ? "bg-[#F0EEFF] text-[#5142A6]" : session.aiState === "escalated" ? "bg-[#FFF0F0] text-[#9B3C3C]" : "bg-[#F3F4F7] text-[#777D8D]"}`}>{aiLabels[session.aiState]}</span></div><p class="mt-1 text-[9px] text-[#989DAA]">Sessão {session.sessionId.slice(0, 8)}</p></div>
        <div class="flex gap-2"><button type="button" on:click={() => void loadMessages()} class="inline-flex min-h-9 items-center gap-2 rounded-lg border border-[#DDE1EA] px-3 text-[9px] font-semibold text-[#626979]"><RefreshCw size={13} aria-hidden="true" />Atualizar</button><button type="button" on:click={resetPreview} class="inline-flex min-h-9 items-center rounded-lg bg-[#F3F4F7] px-3 text-[9px] font-semibold text-[#626979]">Nova conversa</button></div>
      </header>

      <div class="min-h-[360px] bg-[#F8F9FB] px-4 py-5 sm:px-6">
        <div class="mx-auto max-w-[760px] space-y-3">
          {#if messages.length === 0}
            <div class="py-16 text-center text-[10px] text-[#9297A5]">Aguardando mensagens.</div>
          {:else}
            {#each messages as message}
              <div class={`flex ${message.authorType === "customer" ? "justify-end" : "justify-start"}`}>
                <article class={`max-w-[84%] rounded-2xl px-4 py-3 ${message.authorType === "customer" ? "rounded-br-md bg-[#000A57] text-white" : message.authorType === "system" ? "rounded-bl-md border border-[#D9D4F5] bg-[#F2F0FF] text-[#403878]" : "rounded-bl-md border border-[#E0E3EA] bg-white text-[#565C6B]"}`}>
                  {#if message.authorType === "system"}<div class="mb-2 flex items-center gap-1.5 text-[8px] font-bold uppercase tracking-[0.08em] text-[#6255A8]"><Bot size={12} aria-hidden="true" />Agente IA</div>{/if}
                  {#if message.authorType === "user"}<div class="mb-2 flex items-center gap-1.5 text-[8px] font-bold uppercase tracking-[0.08em] text-[#606676]"><ShieldCheck size={12} aria-hidden="true" />Equipe F10</div>{/if}
                  <p class="whitespace-pre-wrap text-[12px] leading-5">{visibleMessageBody(message.body)}</p>
                  {#if remoteInstallPath(message.body)}
                    <a href={remoteInstallPath(message.body)} target="_blank" rel="noopener noreferrer" class="mt-3 inline-flex min-h-10 w-full items-center justify-center gap-2 rounded-xl bg-[#000A57] px-4 text-[10px] font-semibold text-white">
                      <Download size={15} aria-hidden="true" />
                      Baixar Suporte Remoto F10
                    </a>
                  {/if}
                  <p class={`mt-2 text-[8px] ${message.authorType === "customer" ? "text-white/60" : "text-[#999EAA]"}`}>{formatTime(message.createdAt)}</p>
                </article>
              </div>
            {/each}
          {/if}
        </div>
      </div>

      <footer class="border-t border-[#E6E8EE] p-4 sm:p-5">
        <form on:submit|preventDefault={() => void sendMessage()} class="mx-auto flex max-w-[760px] items-end gap-3">
          <textarea bind:value={messageBody} required maxlength="4000" rows="2" placeholder="Continue a conversa como cliente..." class="max-h-32 min-h-[52px] flex-1 resize-none rounded-2xl border border-[#DDE1EA] px-4 py-3 text-[12px] leading-5 outline-none focus:border-[#000A57]"></textarea>
          <button type="submit" disabled={loading || !messageBody.trim()} class="inline-flex h-[52px] w-[52px] shrink-0 items-center justify-center rounded-2xl bg-[#000A57] text-white disabled:bg-[#D6D9E2]" aria-label="Enviar"><Send size={18} aria-hidden="true" /></button>
        </form>
      </footer>
    </section>
  {/if}
</ApplicationContent>
