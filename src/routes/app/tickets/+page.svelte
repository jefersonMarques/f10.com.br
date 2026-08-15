<script lang="ts">
  import {
    CircleAlert,
    Headphones,
    Plus,
    UserRound,
  } from "lucide-svelte";
  import type { ActionData, PageData } from "./$types";

  export let data: PageData;
  export let form: ActionData;

  const statusLabels: Record<string, string> = {
    new: "Novo",
    open: "Aberto",
    in_progress: "Em andamento",
    waiting_customer: "Aguardando cliente",
    resolved: "Resolvido",
    closed: "Fechado",
  };

  const priorityLabels: Record<string, string> = {
    low: "Baixa",
    normal: "Normal",
    high: "Alta",
    urgent: "Urgente",
  };

  const priorityClasses: Record<string, string> = {
    low: "bg-[#F1F4F8] text-[#667085]",
    normal: "bg-[#EEF0FF] text-[#000A57]",
    high: "bg-[#FFF4E9] text-[#A9510D]",
    urgent: "bg-[#FFF0F0] text-[#A52A2A]",
  };

  function formatDateTime(value: string | Date): string {
    return new Intl.DateTimeFormat("pt-BR", {
      dateStyle: "short",
      timeStyle: "short",
    }).format(new Date(value));
  }
</script>

<svelte:head>
  <title>Tickets | F10 Operations</title>
</svelte:head>

<div class="mx-auto max-w-[1480px] px-5 py-7 sm:px-8 sm:py-9">
  <div>
    <p class="text-[10px] font-bold uppercase tracking-[0.14em] text-[#EA6D0B]">Atendimento</p>
    <h1 class="mt-2 text-[30px] font-semibold tracking-[-0.035em] text-[#010D28] sm:text-[38px]">Tickets</h1>
    <p class="mt-2 max-w-[760px] text-[14px] leading-6 text-[#6F7585]">
      Acompanhe atendimentos, responsáveis, histórico e resolução em uma única fila.
    </p>
  </div>

  {#if form?.message}
    <div class="mt-6 flex items-start gap-3 rounded-2xl border border-[#F0C8C8] bg-[#FFF5F5] px-4 py-3 text-[12px] font-medium text-[#9B2C2C]">
      <CircleAlert size={18} class="mt-0.5 shrink-0" aria-hidden="true" />
      <span>{form.message}</span>
    </div>
  {/if}

  <div class="mt-7 grid gap-6 xl:grid-cols-[minmax(0,1fr)_390px]">
    <section class="overflow-hidden rounded-[24px] border border-[#E2E5ED] bg-white">
      <header class="flex items-center justify-between gap-4 border-b border-[#EEF0F5] px-5 py-4 sm:px-6">
        <div class="flex items-center gap-3">
          <span class="flex h-10 w-10 items-center justify-center rounded-xl bg-[#EEF0FF] text-[#000A57]">
            <Headphones size={19} aria-hidden="true" />
          </span>
          <div>
            <h2 class="text-[16px] font-semibold text-[#11182C]">Caixa de atendimento</h2>
            <p class="mt-1 text-[11px] text-[#858A98]">{data.tickets.length} tickets no seu escopo</p>
          </div>
        </div>
      </header>

      {#if data.tickets.length === 0}
        <div class="px-6 py-14 text-center">
          <Headphones size={32} class="mx-auto text-[#B5BAC7]" aria-hidden="true" />
          <p class="mt-4 text-[13px] font-semibold text-[#4B5160]">Nenhum ticket disponível</p>
          <p class="mt-1 text-[11px] text-[#9297A5]">Novos atendimentos aparecerão aqui conforme seu escopo.</p>
        </div>
      {:else}
        <div class="divide-y divide-[#EEF0F5]">
          {#each data.tickets as ticket}
            <a href={`/app/tickets/${ticket.id}`} class="block px-5 py-4 transition hover:bg-[#FAFAFC] sm:px-6">
              <div class="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
                <div class="min-w-0">
                  <div class="flex flex-wrap items-center gap-2">
                    <span class="text-[10px] font-bold text-[#EA6D0B]">#{ticket.ticketNumber}</span>
                    <span class="rounded-full bg-[#F2F3F7] px-2 py-1 text-[9px] font-bold text-[#707687]">{statusLabels[ticket.status]}</span>
                    <span class={`rounded-full px-2 py-1 text-[9px] font-bold ${priorityClasses[ticket.priority]}`}>{priorityLabels[ticket.priority]}</span>
                  </div>
                  <h3 class="mt-2 truncate text-[13px] font-semibold text-[#252B3B]">{ticket.subject}</h3>
                  <p class="mt-1 truncate text-[10px] text-[#858B99]">
                    {ticket.organizationName ? `${ticket.organizationName} · ` : ""}{ticket.customerName ?? "Cliente não identificado"}
                  </p>
                </div>
                <div class="shrink-0 text-left sm:text-right">
                  <p class="text-[10px] font-medium text-[#636978]">{ticket.assignedUserName ?? "Sem responsável"}</p>
                  <p class="mt-1 text-[9px] text-[#9A9FAC]">{ticket.queueName} · {formatDateTime(ticket.updatedAt)}</p>
                </div>
              </div>
            </a>
          {/each}
        </div>
      {/if}
    </section>

    {#if data.canCreate}
      <section class="h-fit rounded-[24px] border border-[#E2E5ED] bg-white p-5 sm:p-6">
        <div class="flex items-start gap-3">
          <span class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#FFF0E4] text-[#EA6D0B]">
            <Plus size={19} aria-hidden="true" />
          </span>
          <div>
            <h2 class="text-[16px] font-semibold text-[#11182C]">Novo ticket</h2>
            <p class="mt-1 text-[11px] leading-5 text-[#858A98]">Registre um atendimento iniciado por telefone, WhatsApp ou outro canal manual.</p>
          </div>
        </div>

        <form method="POST" action="?/create" class="mt-6 space-y-4">
          <label class="block">
            <span class="mb-1.5 block text-[11px] font-semibold text-[#4A5060]">Assunto</span>
            <input name="subject" required maxlength="180" class="h-11 w-full rounded-xl border border-[#DDE1EA] px-3 text-[12px] outline-none focus:border-[#000A57]" />
          </label>

          <label class="block">
            <span class="mb-1.5 block text-[11px] font-semibold text-[#4A5060]">Cliente</span>
            <div class="relative">
              <UserRound size={15} class="absolute left-3 top-3.5 text-[#9AA0AC]" aria-hidden="true" />
              <input name="customerName" required maxlength="120" class="h-11 w-full rounded-xl border border-[#DDE1EA] pl-9 pr-3 text-[12px] outline-none focus:border-[#000A57]" />
            </div>
          </label>

          <label class="block">
            <span class="mb-1.5 block text-[11px] font-semibold text-[#4A5060]">Escola / empresa</span>
            <input name="organizationName" maxlength="160" class="h-11 w-full rounded-xl border border-[#DDE1EA] px-3 text-[12px] outline-none focus:border-[#000A57]" />
          </label>

          <div class="grid gap-3 sm:grid-cols-2 xl:grid-cols-1 2xl:grid-cols-2">
            <label class="block">
              <span class="mb-1.5 block text-[11px] font-semibold text-[#4A5060]">E-mail</span>
              <input name="customerEmail" type="email" maxlength="254" class="h-11 w-full rounded-xl border border-[#DDE1EA] px-3 text-[11px] outline-none" />
            </label>
            <label class="block">
              <span class="mb-1.5 block text-[11px] font-semibold text-[#4A5060]">Telefone</span>
              <input name="customerPhone" maxlength="40" class="h-11 w-full rounded-xl border border-[#DDE1EA] px-3 text-[11px] outline-none" />
            </label>
          </div>

          <div class="grid gap-3 sm:grid-cols-2 xl:grid-cols-1 2xl:grid-cols-2">
            <label class="block">
              <span class="mb-1.5 block text-[11px] font-semibold text-[#4A5060]">Fila</span>
              <select name="queueId" required class="h-11 w-full rounded-xl border border-[#DDE1EA] bg-white px-3 text-[11px] outline-none">
                {#each data.queues as queue}<option value={queue.id}>{queue.name}</option>{/each}
              </select>
            </label>
            <label class="block">
              <span class="mb-1.5 block text-[11px] font-semibold text-[#4A5060]">Prioridade</span>
              <select name="priority" class="h-11 w-full rounded-xl border border-[#DDE1EA] bg-white px-3 text-[11px] outline-none">
                <option value="normal">Normal</option><option value="low">Baixa</option><option value="high">Alta</option><option value="urgent">Urgente</option>
              </select>
            </label>
          </div>

          <label class="block">
            <span class="mb-1.5 block text-[11px] font-semibold text-[#4A5060]">Descrição do atendimento</span>
            <textarea name="message" required maxlength="10000" rows="5" class="w-full resize-y rounded-xl border border-[#DDE1EA] px-3 py-2.5 text-[12px] leading-5 outline-none focus:border-[#000A57]"></textarea>
          </label>

          <button type="submit" class="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-[#000A57] px-4 text-[12px] font-semibold text-white">
            <Plus size={17} aria-hidden="true" />Criar ticket
          </button>
        </form>
      </section>
    {/if}
  </div>
</div>
