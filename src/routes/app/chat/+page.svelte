<script lang="ts">
  import { onMount } from "svelte";
  import {
    Clock3,
    MessageCircleMore,
    Search,
    Sparkles,
    UserRound,
  } from "lucide-svelte";
  import type { PageData } from "./$types";

  export let data: PageData;

  type InboxScope = "mine" | "needs_human" | "waiting_customer" | "unassigned" | "active" | "resolved" | "all";

  let scope: InboxScope = "mine";
  let query = "";
  let searchElement: HTMLInputElement;

  const statusLabels: Record<string, string> = {
    new: "Aguardando",
    open: "Em atendimento",
    in_progress: "Em atendimento",
    waiting_customer: "Aguardando cliente",
    resolved: "Resolvido",
    closed: "Fechado",
  };

  const aiLabels: Record<string, string> = {
    active: "Atendimento F10",
    escalated: "Aguardando humano",
    human: "Atendimento humano",
    disabled: "Sem automação",
  };

  const priorityLabels: Record<string, string> = {
    low: "Baixa",
    normal: "Normal",
    high: "Alta",
    urgent: "Urgente",
  };

  const scopes: Array<{ value: InboxScope; label: string }> = [
    { value: "mine", label: "Meus atendimentos" },
    { value: "needs_human", label: "Aguardando atendente" },
    { value: "waiting_customer", label: "Aguardando cliente" },
    { value: "unassigned", label: "Não atribuídos" },
    { value: "active", label: "Em atendimento" },
    { value: "resolved", label: "Resolvidos" },
    { value: "all", label: "Todos" },
  ];

  function matchesScope(chat: PageData["chats"][number], value: InboxScope): boolean {
    if (value === "mine") return chat.assignedUserId === data.currentUserId && !["resolved", "closed"].includes(chat.status);
    if (value === "needs_human") return chat.aiState === "escalated" || (!chat.assignedUserId && ["new", "open", "in_progress"].includes(chat.status));
    if (value === "waiting_customer") return chat.status === "waiting_customer";
    if (value === "unassigned") return !chat.assignedUserId && !["resolved", "closed"].includes(chat.status);
    if (value === "active") return ["new", "open", "in_progress"].includes(chat.status);
    if (value === "resolved") return ["resolved", "closed"].includes(chat.status);
    return true;
  }

  function matchesQuery(chat: PageData["chats"][number], value: string): boolean {
    const normalized = value.trim().toLocaleLowerCase("pt-BR");
    if (!normalized) return true;
    const haystack = [
      chat.customerName,
      chat.customerEmail,
      chat.organizationName,
      chat.subject,
      chat.lastMessageBody,
      `#${chat.ticketNumber}`,
      String(chat.ticketNumber),
    ]
      .filter(Boolean)
      .join(" ")
      .toLocaleLowerCase("pt-BR");
    return haystack.includes(normalized);
  }

  function scopeCount(value: InboxScope): number {
    return data.chats.filter((chat) => matchesScope(chat, value)).length;
  }

  function formatRelative(value: string | Date): string {
    const date = new Date(value);
    const minutes = Math.max(0, Math.round((Date.now() - date.getTime()) / 60_000));
    if (minutes < 1) return "agora";
    if (minutes < 60) return `${minutes} min`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours} h`;
    const days = Math.floor(hours / 24);
    return `${days} d`;
  }

  function slaText(chat: PageData["chats"][number]): string {
    const dueAt = !chat.firstResponseAt ? chat.firstResponseDueAt : chat.resolutionDueAt;
    if (!dueAt || ["resolved", "closed"].includes(chat.status)) return "";
    const minutes = Math.round((new Date(dueAt).getTime() - Date.now()) / 60_000);
    if (minutes < 0) return `SLA vencido há ${Math.abs(minutes)} min`;
    if (minutes < 60) return `SLA em ${minutes} min`;
    return `SLA em ${Math.ceil(minutes / 60)} h`;
  }

  function priorityClass(priority: string): string {
    if (priority === "urgent") return "bg-[#FFF0F0] text-[#9B3030]";
    if (priority === "high") return "bg-[#FFF5E8] text-[#9A5D18]";
    if (priority === "low") return "bg-[#F3F4F7] text-[#777D8D]";
    return "bg-[#EEF0FF] text-[#000A57]";
  }

  $: filteredChats = data.chats.filter((chat) => matchesScope(chat, scope) && matchesQuery(chat, query));

  onMount(() => {
    const handleKeydown = (event: KeyboardEvent) => {
      if (event.key !== "/" || event.ctrlKey || event.metaKey || event.altKey) return;
      const target = event.target as HTMLElement | null;
      if (target?.tagName === "INPUT" || target?.tagName === "TEXTAREA" || target?.isContentEditable) return;
      event.preventDefault();
      searchElement?.focus();
    };
    window.addEventListener("keydown", handleKeydown);
    return () => window.removeEventListener("keydown", handleKeydown);
  });
</script>

<svelte:head>
  <title>Chat | F10 Operations</title>
</svelte:head>

<div class="mx-auto max-w-[1320px] px-5 py-7 sm:px-8 sm:py-9">
  <div class="flex flex-col justify-between gap-5 lg:flex-row lg:items-end">
    <div>
      <p class="text-[10px] font-bold uppercase tracking-[0.14em] text-[#EA6D0B]">Atendimento em tempo real</p>
      <h1 class="mt-2 text-[30px] font-semibold tracking-[-0.035em] text-[#010D28] sm:text-[38px]">Chat</h1>
      <p class="mt-2 max-w-[760px] text-[14px] leading-6 text-[#6F7585]">
        Priorize quem está esperando, assuma conversas e continue o atendimento sem sair do Operations.
      </p>
    </div>

    <div class="flex flex-wrap gap-2">
      <a href="/app/chat/preview" class="inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-xl border border-[#DDE1EA] bg-white px-5 text-[11px] font-semibold text-[#000A57] transition hover:bg-[#F8F9FF]">
        <MessageCircleMore size={16} aria-hidden="true" />
        Preview do cliente
      </a>
      <a href="/app/chat/lab" class="inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-xl bg-[#000A57] px-5 text-[11px] font-semibold text-white transition hover:bg-[#111B71]">
        <Sparkles size={16} aria-hidden="true" />
        Testar IA
      </a>
    </div>
  </div>

  <section class="mt-7 overflow-hidden rounded-[24px] border border-[#E2E5ED] bg-white">
    <header class="border-b border-[#EEF0F5] px-5 py-5 sm:px-6">
      <div class="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
        <div class="flex items-center gap-3">
          <span class="flex h-10 w-10 items-center justify-center rounded-xl bg-[#EEF0FF] text-[#000A57]">
            <MessageCircleMore size={19} aria-hidden="true" />
          </span>
          <div>
            <h2 class="text-[16px] font-semibold text-[#11182C]">Caixa de entrada</h2>
            <p class="mt-1 text-[11px] text-[#858A98]">{filteredChats.length} de {data.chats.length} conversas no seu escopo</p>
          </div>
        </div>

        <label class="relative block w-full xl:max-w-[360px]">
          <Search size={15} class="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[#979CAA]" aria-hidden="true" />
          <input bind:this={searchElement} bind:value={query} placeholder="Buscar cliente, empresa, e-mail ou #ticket" class="h-11 w-full rounded-xl border border-[#DDE1EA] bg-[#FAFAFC] pl-10 pr-4 text-[11px] text-[#303645] outline-none transition focus:border-[#000A57] focus:bg-white focus:ring-2 focus:ring-[#000A57]/10" />
          <span class="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 rounded-md border border-[#E0E3EA] bg-white px-1.5 py-0.5 text-[8px] text-[#999EAA]">/</span>
        </label>
      </div>

      <div class="mt-5 flex gap-2 overflow-x-auto pb-1">
        {#each scopes as item}
          <button type="button" on:click={() => scope = item.value} class={`inline-flex shrink-0 items-center gap-2 rounded-full border px-3 py-2 text-[10px] font-semibold transition ${scope === item.value ? "border-[#000A57] bg-[#000A57] text-white" : "border-[#E1E4EB] bg-white text-[#656C7D] hover:border-[#C6CAD5]"}`}>
            {item.label}
            <span class={`rounded-full px-1.5 py-0.5 text-[8px] ${scope === item.value ? "bg-white/15 text-white" : "bg-[#F2F3F6] text-[#858A98]"}`}>{scopeCount(item.value)}</span>
          </button>
        {/each}
      </div>
    </header>

    {#if filteredChats.length === 0}
      <div class="px-6 py-16 text-center">
        <MessageCircleMore size={34} class="mx-auto text-[#B6BBC7]" aria-hidden="true" />
        <p class="mt-4 text-[13px] font-semibold text-[#4B5160]">Nenhuma conversa neste filtro</p>
        <p class="mt-1 text-[11px] text-[#9297A5]">Altere o filtro ou a busca para visualizar outros atendimentos.</p>
      </div>
    {:else}
      <div class="divide-y divide-[#EEF0F5]">
        {#each filteredChats as chat}
          <a href={`/app/chat/${chat.sessionId}`} class={`block px-5 py-4 transition hover:bg-[#FAFAFC] sm:px-6 ${chat.aiState === "escalated" ? "bg-[#FFFCFC]" : ""}`}>
            <div class="flex flex-col justify-between gap-4 lg:flex-row lg:items-center">
              <div class="flex min-w-0 flex-1 items-start gap-3">
                <span class={`relative flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${chat.aiState === "escalated" ? "bg-[#FFF0F0] text-[#A14040]" : "bg-[#F3F4F7] text-[#6E7483]"}`}>
                  <UserRound size={17} aria-hidden="true" />
                  {#if chat.lastMessageAuthorType === "customer" && !["waiting_customer", "resolved", "closed"].includes(chat.status)}
                    <span class="absolute -right-1 -top-1 h-3 w-3 rounded-full border-2 border-white bg-[#EA6D0B]"></span>
                  {/if}
                </span>

                <div class="min-w-0 flex-1">
                  <div class="flex flex-wrap items-center gap-2">
                    <strong class="truncate text-[12px] font-semibold text-[#303645]">{chat.customerName ?? "Cliente"}</strong>
                    <span class="text-[9px] font-bold text-[#EA6D0B]">#{chat.ticketNumber}</span>
                    <span class="rounded-full bg-[#EEF0FF] px-2 py-1 text-[8px] font-bold text-[#000A57]">{statusLabels[chat.status]}</span>
                    <span class={`rounded-full px-2 py-1 text-[8px] font-bold ${priorityClass(chat.priority)}`}>{priorityLabels[chat.priority]}</span>
                    {#if chat.aiState === "escalated" || chat.aiState === "active"}
                      <span class={`rounded-full px-2 py-1 text-[8px] font-bold ${chat.aiState === "escalated" ? "bg-[#FFF0F0] text-[#9B3C3C]" : "bg-[#F0EEFF] text-[#5142A6]"}`}>{aiLabels[chat.aiState]}</span>
                    {/if}
                  </div>

                  <p class="mt-1 truncate text-[10px] text-[#858B99]">{chat.organizationName ?? chat.customerEmail ?? chat.subject}</p>
                  <p class={`mt-2 line-clamp-1 text-[11px] ${chat.lastMessageAuthorType === "customer" ? "font-medium text-[#454B5B]" : "text-[#777D8D]"}`}>
                    {chat.lastMessageAuthorType === "customer" ? "Cliente: " : chat.lastMessageAuthorType === "user" ? "Equipe: " : "Atendimento F10: "}{chat.lastMessageBody ?? chat.subject}
                  </p>
                </div>
              </div>

              <div class="flex shrink-0 items-center justify-between gap-4 lg:min-w-[250px] lg:justify-end lg:text-right">
                <div>
                  <p class={`text-[10px] font-semibold ${chat.assignedUserName ? "text-[#5D6372]" : "text-[#A05C3E]"}`}>{chat.assignedUserName ?? "Não atribuído"}</p>
                  {#if slaText(chat)}
                    <p class={`mt-1 text-[9px] font-medium ${slaText(chat).includes("vencido") ? "text-[#A13C3C]" : "text-[#8C6B35]"}`}>{slaText(chat)}</p>
                  {/if}
                </div>
                <div class="flex items-center gap-1.5 text-[9px] text-[#A0A4B0]">
                  <Clock3 size={12} aria-hidden="true" />
                  {formatRelative(chat.updatedAt)}
                </div>
              </div>
            </div>
          </a>
        {/each}
      </div>
    {/if}
  </section>
</div>
