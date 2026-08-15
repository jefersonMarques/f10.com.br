<script lang="ts">
  import { ArrowLeft, ExternalLink, MonitorCog, ShieldCheck, Square } from "lucide-svelte";
  import type { ActionData, PageData } from "./$types";
  export let data: PageData;
  export let form: ActionData;

  const labels: Record<string, string> = {
    requested: "Aguardando autorização", authorized: "Autorizado", denied: "Recusado",
    active: "Em andamento", ended: "Encerrado", failed: "Falhou", cancelled: "Cancelado", expired: "Expirado",
  };
  function date(value: string | Date | null): string { return value ? new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" }).format(new Date(value)) : "—"; }
</script>

<svelte:head><title>Sessão remota | F10 Operations</title></svelte:head>

<div class="mx-auto max-w-[960px] px-5 py-7 sm:px-8 sm:py-9">
  <a href="/app/remote" class="inline-flex min-h-10 items-center gap-2 rounded-xl px-2 text-[11px] font-semibold text-[#5F6575]"><ArrowLeft size={16}/>Voltar</a>
  <header class="mt-5 rounded-[24px] border border-[#E2E5ED] bg-white p-6">
    <div class="flex flex-col justify-between gap-4 sm:flex-row sm:items-center"><div class="flex items-center gap-3"><span class="flex h-11 w-11 items-center justify-center rounded-xl bg-[#EEF0FF] text-[#000A57]"><MonitorCog size={20}/></span><div><p class="text-[9px] font-bold uppercase tracking-[0.1em] text-[#EA6D0B]">Acesso remoto</p><h1 class="mt-1 text-[20px] font-semibold text-[#222839]">{data.session.deviceName || "Dispositivo"}</h1></div></div><span class={`rounded-full px-3 py-1.5 text-[9px] font-bold ${data.session.status === "active" ? "bg-[#EEF8F1] text-[#2F7045]" : data.session.status === "authorized" ? "bg-[#EEF0FF] text-[#000A57]" : "bg-[#F3F4F7] text-[#707687]"}`}>{labels[data.session.status] ?? data.session.status}</span></div>
  </header>

  {#if form?.message}<div class={`mt-4 rounded-xl px-4 py-3 text-[10px] ${form.success ? "bg-[#EEF8F1] text-[#2F7045]" : "bg-[#FFF0F0] text-[#9B3C3C]"}`}>{form.message}</div>{/if}

  <section class="mt-5 rounded-[24px] border border-[#E2E5ED] bg-white p-6">
    <div class="grid gap-4 sm:grid-cols-2 text-[10px]"><div><span class="text-[#9297A5]">Cliente</span><strong class="mt-1 block">{data.session.customerName || "—"}</strong></div><div><span class="text-[#9297A5]">Solicitado por</span><strong class="mt-1 block">{data.session.requestedByName || "—"}</strong></div><div><span class="text-[#9297A5]">Solicitado</span><strong class="mt-1 block">{date(data.session.requestedAt)}</strong></div><div><span class="text-[#9297A5]">Consentimento expira</span><strong class="mt-1 block">{date(data.session.consentExpiresAt)}</strong></div><div><span class="text-[#9297A5]">Autorizado</span><strong class="mt-1 block">{date(data.session.authorizedAt)}</strong></div><div><span class="text-[#9297A5]">Iniciado</span><strong class="mt-1 block">{date(data.session.startedAt)}</strong></div></div>

    <div class="mt-6 flex flex-wrap gap-3 border-t border-[#EEF0F5] pt-5">
      {#if data.session.status === "authorized"}
        <a href={`/app/remote/${data.session.id}/launch`} target="_blank" rel="noopener noreferrer" class="inline-flex min-h-11 items-center gap-2 rounded-xl bg-[#000A57] px-5 text-[10px] font-semibold text-white"><ShieldCheck size={15}/>Iniciar acesso no MeshCentral<ExternalLink size={12}/></a>
      {/if}
      {#if data.session.status === "active" || data.session.status === "authorized"}
        <form method="POST" action="?/end"><button type="submit" class="inline-flex min-h-11 items-center gap-2 rounded-xl border border-[#E0BFC0] px-5 text-[10px] font-semibold text-[#8C3939]"><Square size={13}/>Encerrar sessão</button></form>
      {/if}
      {#if data.session.ticketId}<a href={`/app/tickets/${data.session.ticketId}`} class="inline-flex min-h-11 items-center rounded-xl border border-[#DDE1EA] px-4 text-[10px] font-semibold text-[#626979]">Abrir ticket</a>{/if}
    </div>
  </section>

  <p class="mt-4 text-[9px] leading-5 text-[#9297A5]">“Iniciar” registra o começo da sessão no F10 e abre o dispositivo configurado no MeshCentral. Encerrar registra o fim lógico do atendimento para auditoria.</p>
</div>
