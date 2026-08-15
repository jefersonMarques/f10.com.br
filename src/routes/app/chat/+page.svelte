<script lang="ts">
  import { MessageCircleMore, UserRound } from "lucide-svelte";
  import type { PageData } from "./$types";

  export let data: PageData;

  const statusLabels: Record<string, string> = {
    new: "Aguardando",
    open: "Em atendimento",
    in_progress: "Em atendimento",
    waiting_customer: "Aguardando cliente",
    resolved: "Resolvido",
    closed: "Fechado",
  };

  function formatDateTime(value: string | Date): string {
    return new Intl.DateTimeFormat("pt-BR", {
      dateStyle: "short",
      timeStyle: "short",
    }).format(new Date(value));
  }
</script>

<svelte:head>
  <title>Chat | F10 Operations</title>
</svelte:head>

<div class="mx-auto max-w-[1260px] px-5 py-7 sm:px-8 sm:py-9">
  <div>
    <p class="text-[10px] font-bold uppercase tracking-[0.14em] text-[#EA6D0B]">Atendimento em tempo real</p>
    <h1 class="mt-2 text-[30px] font-semibold tracking-[-0.035em] text-[#010D28] sm:text-[38px]">Chat</h1>
    <p class="mt-2 max-w-[760px] text-[14px] leading-6 text-[#6F7585]">
      Conversas iniciadas pelo novo widget nativo aparecem aqui e permanecem vinculadas ao ticket correspondente.
    </p>
  </div>

  <section class="mt-7 overflow-hidden rounded-[24px] border border-[#E2E5ED] bg-white">
    <header class="flex items-center gap-3 border-b border-[#EEF0F5] px-5 py-4 sm:px-6">
      <span class="flex h-10 w-10 items-center justify-center rounded-xl bg-[#EEF0FF] text-[#000A57]">
        <MessageCircleMore size={19} aria-hidden="true" />
      </span>
      <div>
        <h2 class="text-[16px] font-semibold text-[#11182C]">Conversas</h2>
        <p class="mt-1 text-[11px] text-[#858A98]">{data.chats.length} conversas no seu escopo</p>
      </div>
    </header>

    {#if data.chats.length === 0}
      <div class="px-6 py-16 text-center">
        <MessageCircleMore size={34} class="mx-auto text-[#B6BBC7]" aria-hidden="true" />
        <p class="mt-4 text-[13px] font-semibold text-[#4B5160]">Nenhuma conversa disponível</p>
        <p class="mt-1 text-[11px] text-[#9297A5]">O Movidesk continua ativo enquanto o novo widget é validado.</p>
      </div>
    {:else}
      <div class="divide-y divide-[#EEF0F5]">
        {#each data.chats as chat}
          <a href={`/app/chat/${chat.sessionId}`} class="block px-5 py-4 transition hover:bg-[#FAFAFC] sm:px-6">
            <div class="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
              <div class="flex min-w-0 items-start gap-3">
                <span class="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#F3F4F7] text-[#6E7483]">
                  <UserRound size={16} aria-hidden="true" />
                </span>
                <div class="min-w-0">
                  <div class="flex flex-wrap items-center gap-2">
                    <strong class="truncate text-[12px] font-semibold text-[#303645]">{chat.customerName ?? "Cliente"}</strong>
                    <span class="rounded-full bg-[#EEF0FF] px-2 py-1 text-[8px] font-bold text-[#000A57]">{statusLabels[chat.status]}</span>
                    <span class="text-[9px] font-bold text-[#EA6D0B]">#{chat.ticketNumber}</span>
                  </div>
                  <p class="mt-1 truncate text-[10px] text-[#858B99]">{chat.organizationName ?? chat.subject}</p>
                </div>
              </div>
              <div class="shrink-0 text-left sm:text-right">
                <p class="text-[10px] font-medium text-[#5D6372]">{chat.assignedUserName ?? "Não atribuído"}</p>
                <p class="mt-1 text-[9px] text-[#A0A4B0]">Atualizado {formatDateTime(chat.updatedAt)}</p>
              </div>
            </div>
          </a>
        {/each}
      </div>
    {/if}
  </section>
</div>
