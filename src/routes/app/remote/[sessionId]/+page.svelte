<script lang="ts">
  import { ArrowLeft, Maximize2, MonitorCog, Play, RotateCcw, Square } from "lucide-svelte";
  import type { ActionData, PageData } from "./$types";

  export let data: PageData;
  export let form: ActionData;

  let desktopContainer: HTMLDivElement | null = null;

  const labels: Record<string, string> = {
    requested: "Aguardando autorização",
    authorized: "Autorizado",
    denied: "Recusado",
    active: "Em andamento",
    ended: "Encerrado",
    failed: "Falhou",
    cancelled: "Cancelado",
    expired: "Expirado",
  };

  function date(value: string | Date | null): string {
    return value
      ? new Intl.DateTimeFormat("pt-BR", {
          dateStyle: "short",
          timeStyle: "short",
        }).format(new Date(value))
      : "—";
  }

  function openFullscreen(): void {
    if (desktopContainer?.requestFullscreen) void desktopContainer.requestFullscreen();
  }
</script>

<svelte:head><title>Sessão remota | F10 Operations</title></svelte:head>

<div class="mx-auto max-w-[1380px] px-5 py-7 sm:px-8 sm:py-9">
  <a href="/app/remote" class="inline-flex min-h-10 items-center gap-2 rounded-xl px-2 text-[11px] font-semibold text-[#5F6575]"><ArrowLeft size={16}/>Voltar</a>

  <header class="mt-5 rounded-[24px] border border-[#E2E5ED] bg-white p-6">
    <div class="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
      <div class="flex items-center gap-3">
        <span class="flex h-11 w-11 items-center justify-center rounded-xl bg-[#EEF0FF] text-[#000A57]"><MonitorCog size={20}/></span>
        <div>
          <p class="text-[9px] font-bold uppercase tracking-[0.1em] text-[#EA6D0B]">Acesso remoto</p>
          <h1 class="mt-1 text-[20px] font-semibold text-[#222839]">{data.session.deviceName || "Dispositivo"}</h1>
        </div>
      </div>
      <span class={`rounded-full px-3 py-1.5 text-[9px] font-bold ${data.session.status === "active" ? "bg-[#EEF8F1] text-[#2F7045]" : data.session.status === "authorized" ? "bg-[#EEF0FF] text-[#000A57]" : "bg-[#F3F4F7] text-[#707687]"}`}>{labels[data.session.status] ?? data.session.status}</span>
    </div>
  </header>

  {#if form?.message}
    <div class={`mt-4 rounded-xl px-4 py-3 text-[10px] ${form.success ? "bg-[#EEF8F1] text-[#2F7045]" : "bg-[#FFF0F0] text-[#9B3C3C]"}`}>{form.message}</div>
  {/if}

  <section class="mt-5 rounded-[24px] border border-[#E2E5ED] bg-white p-6">
    <div class="grid gap-4 text-[10px] sm:grid-cols-2 lg:grid-cols-3">
      <div><span class="text-[#9297A5]">Cliente</span><strong class="mt-1 block">{data.session.customerName || "—"}</strong></div>
      <div><span class="text-[#9297A5]">Solicitado por</span><strong class="mt-1 block">{data.session.requestedByName || "—"}</strong></div>
      <div><span class="text-[#9297A5]">Solicitado</span><strong class="mt-1 block">{date(data.session.requestedAt)}</strong></div>
      <div><span class="text-[#9297A5]">Consentimento expira</span><strong class="mt-1 block">{date(data.session.consentExpiresAt)}</strong></div>
      <div><span class="text-[#9297A5]">Autorizado</span><strong class="mt-1 block">{date(data.session.authorizedAt)}</strong></div>
      <div><span class="text-[#9297A5]">Iniciado</span><strong class="mt-1 block">{date(data.session.startedAt)}</strong></div>
    </div>

    <div class="mt-6 flex flex-wrap gap-3 border-t border-[#EEF0F5] pt-5">
      {#if data.session.status === "authorized" || data.session.status === "active"}
        <form method="POST" action="?/start">
          <button type="submit" class="inline-flex min-h-11 items-center gap-2 rounded-xl bg-[#000A57] px-5 text-[10px] font-semibold text-white">
            {#if data.session.status === "active"}<RotateCcw size={15}/>Reconectar desktop{:else}<Play size={15}/>Iniciar acesso remoto{/if}
          </button>
        </form>
        <form method="POST" action="?/end">
          <button type="submit" class="inline-flex min-h-11 items-center gap-2 rounded-xl border border-[#E0BFC0] px-5 text-[10px] font-semibold text-[#8C3939]"><Square size={13}/>Encerrar sessão</button>
        </form>
      {/if}
      {#if data.session.ticketId}
        <a href={`/app/tickets/${data.session.ticketId}`} class="inline-flex min-h-11 items-center rounded-xl border border-[#DDE1EA] px-4 text-[10px] font-semibold text-[#626979]">Abrir ticket</a>
      {/if}
    </div>
  </section>

  {#if form?.desktopUrl}
    <section class="mt-5 overflow-hidden rounded-[24px] border border-[#DDE1EA] bg-[#11131A] shadow-sm">
      <header class="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 px-4 py-3 text-white">
        <div>
          <strong class="text-[11px]">Desktop remoto</strong>
          <span class="ml-2 text-[9px] text-white/60">expira {date(form.desktopExpiresAt ?? null)}</span>
        </div>
        <button type="button" on:click={openFullscreen} class="inline-flex min-h-9 items-center gap-2 rounded-lg border border-white/15 px-3 text-[9px] font-semibold"><Maximize2 size={13}/>Tela cheia</button>
      </header>
      <div bind:this={desktopContainer} class="h-[72vh] min-h-[520px] bg-black">
        <iframe
          src={form.desktopUrl}
          title={`Desktop remoto - ${data.session.deviceName || "Dispositivo"}`}
          class="h-full w-full border-0"
          allow="clipboard-read; clipboard-write; fullscreen"
          allowfullscreen
        ></iframe>
      </div>
    </section>
  {:else if data.session.status === "active"}
    <section class="mt-5 rounded-[24px] border border-[#DDE1EA] bg-[#F8F9FC] px-5 py-8 text-center">
      <MonitorCog size={24} class="mx-auto text-[#000A57]"/>
      <h2 class="mt-3 text-[13px] font-semibold text-[#303645]">Sessão ativa</h2>
      <p class="mx-auto mt-2 max-w-[560px] text-[9px] leading-5 text-[#7B8190]">O link de desktop não é persistido no banco. Use <strong>Reconectar desktop</strong> para revogar o compartilhamento anterior e gerar um novo acesso temporário.</p>
    </section>
  {/if}

  <p class="mt-4 text-[9px] leading-5 text-[#9297A5]">O atendente permanece no F10 Operations. Cada início ou reconexão cria um compartilhamento temporário apenas de Desktop no MeshCentral e o Windows continua exigindo confirmação local do cliente.</p>
</div>
