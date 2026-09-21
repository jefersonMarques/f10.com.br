<script lang="ts">
  import {
    CheckCircle2,
    CircleAlert,
    Download,
    MonitorCog,
    RefreshCw,
    ShieldCheck,
  } from "lucide-svelte";
  import ApplicationBackLink from "$lib/components/application/ApplicationBackLink.svelte";
  import ApplicationContent from "$lib/components/application/ApplicationContent.svelte";
  import type { ActionData, PageData } from "./$types";

  export let data: PageData;
  export let form: ActionData;

  function formatDateTime(value: string | Date | null): string {
    if (!value) return "Ainda não conectado";
    return new Intl.DateTimeFormat("pt-BR", {
      dateStyle: "short",
      timeStyle: "short",
    }).format(new Date(value));
  }
</script>

<svelte:head><title>Acesso remoto | F10 Operations</title></svelte:head>

<ApplicationContent width="narrow">
  <ApplicationBackLink href={`/app/tickets/${data.ticket.id}`} label="Ticket" className="mb-3" />

  <header class="rounded-[24px] border border-[#E2E5ED] bg-white p-6">
    <div class="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
      <div class="flex items-center gap-3">
        <span class="flex h-11 w-11 items-center justify-center rounded-xl bg-[#EEF0FF] text-[#000A57]"><MonitorCog size={20}/></span>
        <div>
          <p class="application-text-meta font-bold uppercase tracking-[0.1em] text-[#EA6D0B]">Ticket #{data.ticket.ticketNumber}</p>
          <h2 class="mt-1 text-[20px] font-semibold">Acesso remoto</h2>
        </div>
      </div>
      <div class="flex flex-wrap gap-2">
        <span class={`application-text-meta rounded-full px-2.5 py-1.5 font-bold ${data.provider.configured ? "bg-[#EEF8F1] text-[#2F7045]" : "bg-[#FFF0F0] text-[#9B3C3C]"}`}>
          {data.provider.configured ? "MeshCentral online" : "Provider pendente"}
        </span>
        <span class={`application-text-meta rounded-full px-2.5 py-1.5 font-bold ${data.control.configured ? "bg-[#EEF8F1] text-[#2F7045]" : "bg-[#FFF0F0] text-[#9B3C3C]"}`}>
          {data.control.configured ? "Integração automática" : "Controle pendente"}
        </span>
      </div>
    </div>
    <p class="mt-4 max-w-[760px] text-[11px] leading-6 text-[#707788]">
      Na primeira vez, o cliente instala o Suporte Remoto F10 pelo link enviado na conversa. Depois, este computador fica reconhecido para os próximos atendimentos. O acesso continua dependendo da confirmação exibida no próprio computador.
    </p>
  </header>

  {#if form?.message}
    <div class={`application-text-caption mt-5 flex items-center gap-2 rounded-xl px-4 py-3 ${form.success ? "bg-[#EEF8F1] text-[#2F7045]" : "bg-[#FFF0F0] text-[#9B3C3C]"}`}>
      {#if form.success}<CheckCircle2 size={15}/>{:else}<CircleAlert size={15}/>{/if}
      {form.message}
    </div>
  {/if}

  {#if data.syncError}
    <div class="application-text-caption mt-5 flex items-center gap-2 rounded-xl bg-[#FFF7EA] px-4 py-3 text-[#8B5A12]">
      <CircleAlert size={15}/>
      {data.syncError}
    </div>
  {/if}

  {#if !data.canUseRemote}
    <div class="application-text-caption mt-5 flex items-start gap-2 rounded-xl bg-[#FFF7EA] px-4 py-3 leading-5 text-[#8B5A12]">
      <ShieldCheck size={15} class="mt-0.5 shrink-0"/>
      Você pode enviar o instalador ao cliente, mas não possui a permissão <strong>remote.use</strong> para abrir o desktop remoto.
    </div>
  {/if}

  <section class="mt-5 rounded-[24px] border border-[#E2E5ED] bg-white p-6">
    <div class="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
      <div>
        <h2 class="text-[13px] font-semibold">Computadores conhecidos</h2>
        <p class="application-text-meta mt-1 text-[#9297A5]">A lista é sincronizada automaticamente com o grupo deste cliente no MeshCentral.</p>
      </div>
      <form method="POST" action="?/sync">
        <button type="submit" disabled={!data.control.configured} class="application-text-meta inline-flex min-h-9 items-center gap-2 rounded-xl border border-[#DDE1EA] bg-white px-3 font-semibold text-[#000A57] disabled:cursor-not-allowed disabled:opacity-50">
          <RefreshCw size={13}/>
          Verificar agora
        </button>
      </form>
    </div>

    {#if data.devices.length === 0}
      <div class="mt-5 rounded-2xl border border-dashed border-[#D5D9E2] bg-[#FAFAFC] px-5 py-8 text-center">
        <MonitorCog size={30} class="mx-auto text-[#A8AEBB]"/>
        <p class="mt-4 text-[11px] font-semibold text-[#555C6D]">Este cliente ainda não possui um computador de suporte vinculado.</p>
        <p class="application-text-meta mx-auto mt-2 max-w-[520px] leading-5 text-[#8A909E]">Envie o instalador pelo próprio atendimento. Depois que o cliente instalar, o computador será identificado automaticamente.</p>
      </div>
    {:else}
      <div class="mt-5 space-y-3">
        {#each data.devices as device}
          <article class="flex flex-col justify-between gap-4 rounded-2xl border border-[#E1E4EC] px-4 py-4 sm:flex-row sm:items-center">
            <div class="flex min-w-0 items-center gap-3">
              <span class={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${device.online ? "bg-[#EEF8F1] text-[#2F7045]" : "bg-[#F3F4F7] text-[#858B99]"}`}><MonitorCog size={17}/></span>
              <div class="min-w-0">
                <div class="flex flex-wrap items-center gap-2">
                  <strong class="truncate text-[11px] text-[#303645]">{device.name}</strong>
                  <span class={`application-text-meta rounded-full px-2 py-1 font-bold ${device.online ? "bg-[#E8F7EE] text-[#27633B]" : "bg-[#F1F2F5] text-[#777D8D]"}`}>{device.online ? "Online" : "Offline"}</span>
                </div>
                <p class="application-text-meta mt-1 text-[#9297A5]">Última conexão: {formatDateTime(device.lastOnlineAt ?? device.lastSeenAt)}</p>
              </div>
            </div>
            <form method="POST" action="?/start">
              <input type="hidden" name="deviceId" value={device.id}/>
              <button type="submit" disabled={!data.canUseRemote || !device.online || !data.provider.configured} class="application-text-meta inline-flex min-h-10 items-center justify-center gap-2 rounded-xl bg-[#000A57] px-4 font-semibold text-white disabled:cursor-not-allowed disabled:bg-[#C7CAD3]">
                <MonitorCog size={14}/>
                Iniciar acesso remoto
              </button>
            </form>
          </article>
        {/each}
      </div>
    {/if}

    <div class="mt-6 border-t border-[#EEF0F5] pt-5">
      <div class="flex items-start gap-3 rounded-2xl border border-[#D8DEF2] bg-[#F8F9FF] px-4 py-3">
        <ShieldCheck size={16} class="mt-0.5 shrink-0 text-[#000A57]"/>
        <p class="application-text-meta leading-5 text-[#626A7E]">O agente pode permanecer instalado para próximos atendimentos, mas isso não libera acesso silencioso. O MeshCentral deve solicitar a confirmação local do usuário antes do desktop remoto.</p>
      </div>

      <form method="POST" action="?/enroll" class="mt-4">
        <button type="submit" disabled={!data.control.configured} class="application-text-caption inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-[#D9DDE7] bg-white px-4 font-semibold text-[#000A57] transition hover:bg-[#F8F9FF] disabled:cursor-not-allowed disabled:opacity-50">
          <Download size={15}/>
          {data.devices.length === 0 ? "Enviar instalador de Suporte Remoto F10" : "Adicionar outro computador"}
        </button>
      </form>
    </div>
  </section>
</ApplicationContent>
