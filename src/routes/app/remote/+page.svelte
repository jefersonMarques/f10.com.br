<script lang="ts">
  import { Clock3, MonitorCog, Plus, ShieldCheck, UserRound } from "lucide-svelte";
  import type { ActionData, PageData } from "./$types";
  export let data: PageData;
  export let form: ActionData;

  const statusLabels: Record<string, string> = {
    requested: "Aguardando autorização",
    authorized: "Autorizado",
    denied: "Recusado",
    active: "Em andamento",
    ended: "Encerrado",
    failed: "Falhou",
    cancelled: "Cancelado",
    expired: "Expirado",
  };

  function formatDate(value: string | Date): string {
    return new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" }).format(new Date(value));
  }
</script>

<svelte:head><title>Acesso remoto | F10 Operations</title></svelte:head>

<div class="mx-auto max-w-[1380px] px-5 py-7 sm:px-8 sm:py-9">
  <div class="flex flex-col justify-between gap-5 lg:flex-row lg:items-end">
    <div><p class="text-[10px] font-bold uppercase tracking-[0.14em] text-[#EA6D0B]">Suporte assistido</p><h1 class="mt-2 text-[30px] font-semibold tracking-[-0.035em] text-[#010D28] sm:text-[38px]">Acesso remoto</h1><p class="mt-2 max-w-[760px] text-[14px] leading-6 text-[#6F7585]">Solicitações autorizadas pelo cliente e vinculadas ao atendimento. O controle do computador é realizado pelo MeshCentral.</p></div>
    <div class="rounded-2xl border border-[#E2E5ED] bg-white px-4 py-3 text-right"><span class="text-[8px] font-bold uppercase text-[#959AA8]">Provider</span><strong class="mt-1 block text-[11px]">{data.provider.provider}</strong><span class={`mt-1 inline-flex rounded-full px-2 py-1 text-[8px] font-bold ${data.provider.configured ? "bg-[#EEF8F1] text-[#2F7045]" : "bg-[#FFF0F0] text-[#9B3C3C]"}`}>{data.provider.configured ? "Configurado" : "Pendente"}</span></div>
  </div>

  {#if form?.message}<div class={`mt-5 rounded-xl px-4 py-3 text-[10px] font-medium ${form.success ? "bg-[#EEF8F1] text-[#2F7045]" : "bg-[#FFF0F0] text-[#9B3C3C]"}`}>{form.message}</div>{/if}

  <section class="mt-7 grid gap-3 md:grid-cols-3">
    <div class="rounded-2xl border border-[#E2E5ED] bg-white p-5"><MonitorCog size={19} class="text-[#000A57]"/><strong class="mt-3 block text-[24px]">{data.sessions.filter((item) => item.status === "active").length}</strong><span class="text-[10px] text-[#858B99]">sessões ativas</span></div>
    <div class="rounded-2xl border border-[#E2E5ED] bg-white p-5"><Clock3 size={19} class="text-[#EA6D0B]"/><strong class="mt-3 block text-[24px]">{data.sessions.filter((item) => item.status === "requested").length}</strong><span class="text-[10px] text-[#858B99]">aguardando autorização</span></div>
    <div class="rounded-2xl border border-[#E2E5ED] bg-white p-5"><ShieldCheck size={19} class="text-[#2F7045]"/><strong class="mt-3 block text-[24px]">{data.devices.filter((item) => item.active).length}</strong><span class="text-[10px] text-[#858B99]">dispositivos vinculados</span></div>
  </section>

  <div class="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1fr)_380px]">
    <section class="overflow-hidden rounded-[24px] border border-[#E2E5ED] bg-white">
      <header class="border-b border-[#EEF0F5] px-5 py-4"><h2 class="text-[14px] font-semibold">Sessões</h2><p class="mt-1 text-[9px] text-[#9297A5]">Histórico conforme seu escopo de permissão.</p></header>
      {#if data.sessions.length === 0}<div class="py-16 text-center text-[10px] text-[#9297A5]">Nenhuma sessão remota registrada.</div>{:else}<div class="divide-y divide-[#EEF0F5]">{#each data.sessions as item}<a href={`/app/remote/${item.id}`} class="block px-5 py-4 hover:bg-[#FAFAFC]"><div class="flex flex-col justify-between gap-3 sm:flex-row sm:items-center"><div class="min-w-0"><div class="flex flex-wrap items-center gap-2"><strong class="text-[11px] text-[#303645]">{item.deviceName || "Dispositivo"}</strong><span class={`rounded-full px-2 py-1 text-[8px] font-bold ${item.status === "active" ? "bg-[#EEF8F1] text-[#2F7045]" : item.status === "requested" ? "bg-[#FFF4E9] text-[#A9510D]" : "bg-[#F2F3F7] text-[#707687]"}`}>{statusLabels[item.status] ?? item.status}</span></div><p class="mt-1 text-[9px] text-[#9297A5]">{item.customerName || "Cliente"}{item.ticketId ? ` · ticket vinculado` : ""}</p></div><div class="shrink-0 text-[9px] text-[#9297A5] sm:text-right">{formatDate(item.requestedAt)}{#if item.requestedByName}<span class="mt-1 block">{item.requestedByName}</span>{/if}</div></div></a>{/each}</div>{/if}
    </section>

    <div class="space-y-5">
      {#if data.canManage}
        <section class="rounded-[24px] border border-[#E2E5ED] bg-white p-5">
          <div class="flex items-center gap-3"><span class="flex h-9 w-9 items-center justify-center rounded-xl bg-[#EEF0FF] text-[#000A57]"><Plus size={16}/></span><div><h2 class="text-[13px] font-semibold">Vincular dispositivo</h2><p class="mt-1 text-[9px] text-[#9297A5]">Cadastre o ID do dispositivo já existente no MeshCentral.</p></div></div>
          <form method="POST" action="?/registerDevice" class="mt-5 space-y-3">
            <label class="block"><span class="mb-1 block text-[9px] font-semibold">Nome do computador</span><input name="name" required maxlength="160" placeholder="Secretaria-PC" class="h-10 w-full rounded-xl border border-[#DDE1EA] px-3 text-[10px]" /></label>
            <label class="block"><span class="mb-1 block text-[9px] font-semibold">ID no MeshCentral</span><input name="providerDeviceId" required maxlength="500" class="h-10 w-full rounded-xl border border-[#DDE1EA] px-3 text-[10px]" /></label>
            <label class="block"><span class="mb-1 block text-[9px] font-semibold">E-mail do cliente no F10</span><input name="customerEmail" type="email" maxlength="254" placeholder="cliente@escola.com.br" class="h-10 w-full rounded-xl border border-[#DDE1EA] px-3 text-[10px]" /></label>
            <button type="submit" class="inline-flex min-h-10 w-full items-center justify-center gap-2 rounded-xl bg-[#000A57] text-[10px] font-semibold text-white"><Plus size={14}/>Registrar dispositivo</button>
          </form>
        </section>
      {/if}

      <section class="rounded-[24px] border border-[#E2E5ED] bg-white p-5"><h2 class="text-[13px] font-semibold">Dispositivos</h2>{#if data.devices.length === 0}<p class="mt-4 text-[9px] text-[#9297A5]">Nenhum dispositivo cadastrado.</p>{:else}<div class="mt-4 space-y-2">{#each data.devices.slice(0, 12) as device}<div class="flex items-center gap-3 rounded-xl bg-[#F7F8FB] px-3 py-3"><UserRound size={14} class="text-[#777D8D]"/><div class="min-w-0"><strong class="block truncate text-[9px]">{device.name}</strong><span class="block truncate text-[8px] text-[#9297A5]">{device.organizationName || device.customerName || device.customerEmail || "Sem cliente vinculado"}</span></div></div>{/each}</div>{/if}</section>
    </div>
  </div>
</div>
