<script lang="ts">
  import { ArrowLeft, CheckCircle2, MonitorCog, ShieldCheck } from "lucide-svelte";
  import type { ActionData, PageData } from "./$types";
  export let data: PageData;
  export let form: ActionData;
</script>

<svelte:head><title>Solicitar acesso remoto | F10 Operations</title></svelte:head>

<div class="mx-auto max-w-[820px] px-5 py-7 sm:px-8 sm:py-9">
  <a href={`/app/tickets/${data.ticket.id}`} class="inline-flex min-h-10 items-center gap-2 rounded-xl px-2 text-[11px] font-semibold text-[#5F6575]"><ArrowLeft size={16}/>Voltar ao ticket</a>
  <header class="mt-5 rounded-[24px] border border-[#E2E5ED] bg-white p-6"><div class="flex items-center gap-3"><span class="flex h-11 w-11 items-center justify-center rounded-xl bg-[#EEF0FF] text-[#000A57]"><MonitorCog size={20}/></span><div><p class="text-[9px] font-bold uppercase tracking-[0.1em] text-[#EA6D0B]">Ticket #{data.ticket.ticketNumber}</p><h1 class="mt-1 text-[20px] font-semibold">Solicitar acesso remoto</h1></div></div><p class="mt-4 text-[11px] leading-6 text-[#707788]">O cliente receberá uma mensagem no ticket com um link de autorização. O MeshCentral só poderá ser aberto depois da confirmação.</p></header>

  {#if form?.message}<div class={`mt-5 flex items-center gap-2 rounded-xl px-4 py-3 text-[10px] ${form.success ? "bg-[#EEF8F1] text-[#2F7045]" : "bg-[#FFF0F0] text-[#9B3C3C]"}`}>{#if form.success}<CheckCircle2 size={15}/>{/if}{form.message}</div>{/if}

  <section class="mt-5 rounded-[24px] border border-[#E2E5ED] bg-white p-6">
    <div class="flex items-center justify-between gap-3"><div><h2 class="text-[13px] font-semibold">Computador</h2><p class="mt-1 text-[9px] text-[#9297A5]">Somente dispositivos vinculados a este cliente ou organização aparecem aqui.</p></div><span class={`rounded-full px-2 py-1 text-[8px] font-bold ${data.provider.configured ? "bg-[#EEF8F1] text-[#2F7045]" : "bg-[#FFF0F0] text-[#9B3C3C]"}`}>{data.provider.configured ? "MeshCentral pronto" : "MeshCentral pendente"}</span></div>

    {#if data.devices.length === 0}
      <div class="mt-5 rounded-2xl bg-[#F7F8FB] px-4 py-5 text-center"><p class="text-[10px] text-[#777E8E]">Nenhum dispositivo remoto está vinculado a este cliente.</p><a href="/app/remote" class="mt-3 inline-flex min-h-9 items-center rounded-lg border border-[#DDE1EA] bg-white px-3 text-[9px] font-semibold text-[#000A57]">Gerenciar dispositivos</a></div>
    {:else}
      <form method="POST" action="?/request" class="mt-5">
        <div class="space-y-2">{#each data.devices as device}<label class="flex cursor-pointer items-center gap-3 rounded-2xl border border-[#E1E4EC] px-4 py-3 hover:bg-[#FAFAFC]"><input type="radio" name="deviceId" value={device.id} required class="h-4 w-4"/><span class="flex h-9 w-9 items-center justify-center rounded-xl bg-[#EEF0FF] text-[#000A57]"><MonitorCog size={16}/></span><span><strong class="block text-[10px]">{device.name}</strong><small class="mt-1 block text-[8px] text-[#9297A5]">ID MeshCentral: {device.providerDeviceId}</small></span></label>{/each}</div>
        <div class="mt-5 flex items-start gap-3 rounded-2xl border border-[#D8DEF2] bg-[#F8F9FF] px-4 py-3"><ShieldCheck size={16} class="mt-0.5 shrink-0 text-[#000A57]"/><p class="text-[9px] leading-5 text-[#626A7E]">A solicitação não inicia acesso. Ela apenas cria um pedido temporário que o cliente precisa autorizar explicitamente.</p></div>
        <button type="submit" class="mt-4 min-h-11 w-full rounded-xl bg-[#000A57] text-[10px] font-semibold text-white">Enviar solicitação de acesso</button>
      </form>
    {/if}
  </section>
</div>
