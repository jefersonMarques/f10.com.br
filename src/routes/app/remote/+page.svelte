<script lang="ts">
  import { Clock3, MonitorCog, ShieldCheck, UserRound } from "lucide-svelte";
  import type { PageData } from "./$types";

  export let data: PageData;

  const statusLabels: Record<string, string> = {
    requested: "Aguardando autorização",
    authorized: "Pronto para iniciar",
    denied: "Recusado",
    active: "Em andamento",
    ended: "Encerrado",
    failed: "Falhou",
    cancelled: "Cancelado",
    expired: "Expirado",
  };

  function formatDate(value: string | Date | null): string {
    if (!value) return "—";
    return new Intl.DateTimeFormat("pt-BR", {
      dateStyle: "short",
      timeStyle: "short",
    }).format(new Date(value));
  }
</script>

<svelte:head><title>Acesso remoto | F10 Operations</title></svelte:head>

<div class="mx-auto max-w-[1380px] px-5 py-7 sm:px-8 sm:py-9">
  <div class="flex flex-col justify-between gap-5 lg:flex-row lg:items-end">
    <div>
      <p class="text-[10px] font-bold uppercase tracking-[0.14em] text-[#EA6D0B]">Suporte assistido</p>
      <h1 class="mt-2 text-[30px] font-semibold tracking-[-0.035em] text-[#010D28] sm:text-[38px]">Acesso remoto</h1>
      <p class="mt-2 max-w-[780px] text-[14px] leading-6 text-[#6F7585]">O cliente instala o componente de suporte apenas na primeira vez. Depois, o computador é reconhecido automaticamente e pode ser chamado novamente pelo ticket ou chat, sempre com confirmação local.</p>
    </div>

    <div class="flex flex-wrap gap-2">
      <span class={`rounded-full px-3 py-2 text-[8px] font-bold ${data.provider.configured ? "bg-[#EEF8F1] text-[#2F7045]" : "bg-[#FFF0F0] text-[#9B3C3C]"}`}>
        {data.provider.configured ? "MeshCentral configurado" : "Provider pendente"}
      </span>
      <span class={`rounded-full px-3 py-2 text-[8px] font-bold ${data.control.configured ? "bg-[#EEF8F1] text-[#2F7045]" : "bg-[#FFF0F0] text-[#9B3C3C]"}`}>
        {data.control.configured ? "Enrollment automático" : "Controle pendente"}
      </span>
    </div>
  </div>

  <section class="mt-7 grid gap-3 md:grid-cols-3">
    <div class="rounded-2xl border border-[#E2E5ED] bg-white p-5">
      <MonitorCog size={19} class="text-[#000A57]"/>
      <strong class="mt-3 block text-[24px]">{data.sessions.filter((item) => item.status === "active").length}</strong>
      <span class="text-[10px] text-[#858B99]">sessões ativas</span>
    </div>
    <div class="rounded-2xl border border-[#E2E5ED] bg-white p-5">
      <Clock3 size={19} class="text-[#EA6D0B]"/>
      <strong class="mt-3 block text-[24px]">{data.sessions.filter((item) => item.status === "authorized" || item.status === "requested").length}</strong>
      <span class="text-[10px] text-[#858B99]">solicitações em andamento</span>
    </div>
    <div class="rounded-2xl border border-[#E2E5ED] bg-white p-5">
      <ShieldCheck size={19} class="text-[#2F7045]"/>
      <strong class="mt-3 block text-[24px]">{data.devices.filter((item) => item.online).length}</strong>
      <span class="text-[10px] text-[#858B99]">computadores online</span>
    </div>
  </section>

  <div class="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1fr)_390px]">
    <section class="overflow-hidden rounded-[24px] border border-[#E2E5ED] bg-white">
      <header class="border-b border-[#EEF0F5] px-5 py-4">
        <h2 class="text-[14px] font-semibold">Sessões</h2>
        <p class="mt-1 text-[9px] text-[#9297A5]">Histórico de acesso remoto conforme seu escopo.</p>
      </header>
      {#if data.sessions.length === 0}
        <div class="py-16 text-center text-[10px] text-[#9297A5]">Nenhuma sessão remota registrada.</div>
      {:else}
        <div class="divide-y divide-[#EEF0F5]">
          {#each data.sessions as item}
            <a href={`/app/remote/${item.id}`} class="block px-5 py-4 hover:bg-[#FAFAFC]">
              <div class="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
                <div class="min-w-0">
                  <div class="flex flex-wrap items-center gap-2">
                    <strong class="text-[11px] text-[#303645]">{item.deviceName || "Dispositivo"}</strong>
                    <span class={`rounded-full px-2 py-1 text-[8px] font-bold ${item.status === "active" ? "bg-[#EEF8F1] text-[#2F7045]" : item.status === "authorized" || item.status === "requested" ? "bg-[#FFF4E9] text-[#A9510D]" : "bg-[#F2F3F7] text-[#707687]"}`}>{statusLabels[item.status] ?? item.status}</span>
                  </div>
                  <p class="mt-1 text-[9px] text-[#9297A5]">{item.customerName || "Cliente"}{item.ticketId ? " · ticket vinculado" : ""}</p>
                </div>
                <div class="shrink-0 text-[9px] text-[#9297A5] sm:text-right">
                  {formatDate(item.requestedAt)}
                  {#if item.requestedByName}<span class="mt-1 block">{item.requestedByName}</span>{/if}
                </div>
              </div>
            </a>
          {/each}
        </div>
      {/if}
    </section>

    <div class="space-y-5">
      <section class="rounded-[24px] border border-[#E2E5ED] bg-white p-5">
        <div class="flex items-start gap-3">
          <ShieldCheck size={18} class="mt-0.5 shrink-0 text-[#000A57]"/>
          <div>
            <h2 class="text-[13px] font-semibold">Como os computadores entram aqui</h2>
            <p class="mt-2 text-[9px] leading-5 text-[#7B8190]">Não é mais necessário cadastrar Node ID manualmente. No ticket, escolha <strong>Enviar instalador de Suporte Remoto F10</strong>. O agente baixado já pertence ao grupo daquele cliente e o Operations faz o vínculo quando o computador aparece no MeshCentral.</p>
          </div>
        </div>
      </section>

      {#if data.canManage}
        <section class="rounded-[24px] border border-[#E2E5ED] bg-white p-5">
          <div class="flex items-center justify-between gap-3">
            <div>
              <h2 class="text-[13px] font-semibold">Computadores conhecidos</h2>
              <p class="mt-1 text-[9px] text-[#9297A5]">Visão administrativa dos dispositivos já associados.</p>
            </div>
            <span class="rounded-full bg-[#F3F4F7] px-2 py-1 text-[8px] font-bold text-[#777D8D]">{data.devices.length}</span>
          </div>

          {#if data.devices.length === 0}
            <p class="mt-4 text-[9px] text-[#9297A5]">Nenhum computador reconhecido ainda.</p>
          {:else}
            <div class="mt-4 space-y-2">
              {#each data.devices.slice(0, 20) as device}
                <div class="flex items-center gap-3 rounded-xl bg-[#F7F8FB] px-3 py-3">
                  <span class={`h-2 w-2 shrink-0 rounded-full ${device.online ? "bg-[#3A9A5D]" : "bg-[#B8BDC8]"}`}></span>
                  <UserRound size={14} class="shrink-0 text-[#777D8D]"/>
                  <div class="min-w-0 flex-1">
                    <div class="flex items-center gap-2">
                      <strong class="truncate text-[9px]">{device.name}</strong>
                      <span class="text-[8px] text-[#9297A5]">{device.online ? "Online" : "Offline"}</span>
                    </div>
                    <span class="block truncate text-[8px] text-[#9297A5]">{device.organizationName || device.customerName || device.customerEmail || "Cliente não identificado"}</span>
                    <span class="mt-0.5 block text-[7px] text-[#A2A7B2]">Última conexão: {formatDate(device.lastOnlineAt ?? device.lastSeenAt)}</span>
                  </div>
                </div>
              {/each}
            </div>
          {/if}
        </section>
      {/if}
    </div>
  </div>
</div>
