<script lang="ts">
  import {
    Building2,
    ExternalLink,
    Mail,
    MessageCircleMore,
    Phone,
    Users,
  } from "lucide-svelte";
  import ApplicationBackLink from "$lib/components/application/ApplicationBackLink.svelte";
  import ApplicationContent from "$lib/components/application/ApplicationContent.svelte";
  import type { ActionData, PageData } from "./$types";

  export let data: PageData;
  export let form: ActionData;

  const ticketStatusLabels: Record<string, string> = {
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

  $: openTickets = data.tickets.filter((ticket) => !["resolved", "closed"].includes(ticket.status));
  $: activeChats = data.chats.filter((chat) => !chat.closedAt && chat.status !== "closed");
  $: pendingTasks = data.tasks.filter((task) => !task.statusClosed);
  $: customerWhatsappHref = whatsappHref(data.customer.whatsapp);

  function formatDate(value: string | Date | null): string {
    if (!value) return "—";
    return new Intl.DateTimeFormat("pt-BR", {
      dateStyle: "short",
      timeStyle: "short",
    }).format(new Date(value));
  }

  function whatsappHref(value: string | null): string | null {
    if (!value) return null;
    const digits = value.replace(/\D/g, "");
    return digits.length >= 10 ? `https://wa.me/${digits}` : null;
  }
</script>

<svelte:head><title>{data.customer.name} | Clientes | F10 Operations</title></svelte:head>

<ApplicationContent width="wide">
  <ApplicationBackLink href="/app/customers" label="Clientes" className="mb-3" />

  {#if form?.message}
    <div class={`application-text-caption mb-3 rounded-xl border px-4 py-3 font-medium ${form.success ? "border-[#B9E6C9] bg-[#F1FBF4] text-[#176B35]" : "border-[#F0C8C8] bg-[#FFF5F5] text-[#9B2C2C]"}`}>{form.message}</div>
  {/if}

  <section class="rounded-[22px] border border-[#E2E5ED] bg-white p-5 sm:p-6">
    <div class="flex flex-col justify-between gap-4 lg:flex-row lg:items-start">
      <div class="min-w-0">
        <div class="flex flex-wrap items-center gap-2">
          <span class={`application-text-meta rounded-full px-2.5 py-1 font-bold ${data.customer.active ? "bg-[#EEF8F1] text-[#2F7045]" : "bg-[#F1F2F5] text-[#777D8C]"}`}>{data.customer.active ? "Ativo" : "Inativo"}</span>
          {#if data.customer.organizationName}<span class="application-text-meta rounded-full bg-[#EEF0FF] px-2.5 py-1 font-bold text-[#000A57]">{data.customer.organizationName}</span>{/if}
        </div>
        <h2 class="mt-2 text-[24px] font-semibold tracking-[-0.025em] text-[#202637]">{data.customer.name}</h2>
        <div class="application-text-caption mt-2 flex flex-wrap gap-x-4 gap-y-2 text-[#687080]">
          {#if data.customer.email}<a href={`mailto:${data.customer.email}`} class="inline-flex items-center gap-1.5 hover:text-[#000A57]"><Mail size={13}/>{data.customer.email}</a>{/if}
          {#if data.customer.phone}<a href={`tel:${data.customer.phone}`} class="inline-flex items-center gap-1.5 hover:text-[#000A57]"><Phone size={13}/>{data.customer.phone}</a>{/if}
          {#if customerWhatsappHref}<a href={customerWhatsappHref} target="_blank" rel="noreferrer" class="inline-flex items-center gap-1.5 font-semibold text-[#2F7045]"><MessageCircleMore size={13}/>WhatsApp {data.customer.whatsapp}</a>{:else if data.customer.whatsapp}<span class="inline-flex items-center gap-1.5"><MessageCircleMore size={13}/>{data.customer.whatsapp}</span>{/if}
        </div>
      </div>
      <div class="application-text-meta text-[#9297A5] lg:text-right"><span class="block">Cadastro atualizado</span><strong class="mt-1 block text-[#555C6D]">{formatDate(data.customer.updatedAt)}</strong></div>
    </div>

    <div class="mt-5 grid gap-2 sm:grid-cols-3">
      <div class="rounded-xl bg-[#FFF7EF] p-3"><span class="application-text-meta font-semibold text-[#A66A35]">Tickets abertos</span><strong class="mt-1 block text-[20px] text-[#A9510D]">{openTickets.length}</strong></div>
      <div class="rounded-xl bg-[#FFF3F3] p-3"><span class="application-text-meta font-semibold text-[#A56A6A]">Chats ativos</span><strong class="mt-1 block text-[20px] text-[#9B3C3C]">{activeChats.length}</strong></div>
      <div class="rounded-xl bg-[#F3F4FF] p-3"><span class="application-text-meta font-semibold text-[#676F9A]">Tarefas pendentes</span><strong class="mt-1 block text-[20px] text-[#000A57]">{pendingTasks.length}</strong></div>
    </div>
  </section>

  <div class="mt-4 grid gap-4 xl:grid-cols-[minmax(0,1.55fr)_minmax(330px,0.75fr)]">
    <div class="space-y-4">
      <section class="overflow-hidden rounded-[22px] border border-[#E2E5ED] bg-white">
        <header class="flex items-center justify-between border-b border-[#EEF0F5] px-5 py-4"><div><h3 class="text-[14px] font-semibold text-[#303746]">Tickets</h3><p class="application-text-meta mt-1 text-[#9297A5]">Histórico operacional dentro do seu escopo.</p></div><span class="application-text-meta rounded-full bg-[#F3F4F7] px-2 py-1 font-bold text-[#687080]">{data.tickets.length}</span></header>
        {#if data.tickets.length === 0}
          <p class="application-text-caption px-5 py-10 text-center text-[#9297A5]">Nenhum ticket acessível deste cliente.</p>
        {:else}
          <div class="divide-y divide-[#EEF0F5]">
            {#each data.tickets as ticket}
              <a href={`/app/tickets/${ticket.id}`} class="grid gap-2 px-5 py-3.5 transition hover:bg-[#FAFAFC] sm:grid-cols-[86px_minmax(0,1fr)_150px_140px] sm:items-center">
                <span class="application-text-meta font-bold text-[#EA6D0B]">#{ticket.ticketNumber}</span>
                <div class="min-w-0"><strong class="application-text-caption block truncate text-[#3D4454]">{ticket.subject}</strong><span class="application-text-meta mt-1 block truncate text-[#9297A5]">{ticket.queueName} · {ticket.assignedUserName ?? "Sem responsável"}</span></div>
                <span class="application-text-meta font-semibold text-[#687080]">{ticketStatusLabels[ticket.status] ?? ticket.status}</span>
                <span class="application-text-meta text-[#9297A5]">{formatDate(ticket.updatedAt)}</span>
              </a>
            {/each}
          </div>
        {/if}
      </section>

      <section class="overflow-hidden rounded-[22px] border border-[#E2E5ED] bg-white">
        <header class="flex items-center justify-between border-b border-[#EEF0F5] px-5 py-4"><div><h3 class="text-[14px] font-semibold text-[#303746]">Chats</h3><p class="application-text-meta mt-1 text-[#9297A5]">Conversas originadas no atendimento web.</p></div><span class="application-text-meta rounded-full bg-[#F3F4F7] px-2 py-1 font-bold text-[#687080]">{activeChats.length} ativo(s)</span></header>
        {#if data.chats.length === 0}
          <p class="application-text-caption px-5 py-8 text-center text-[#9297A5]">Nenhuma conversa registrada.</p>
        {:else}
          <div class="divide-y divide-[#EEF0F5]">
            {#each data.chats.slice(0, 12) as chat}
              <a href={`/app/chat/${chat.sessionId}`} class="flex items-center justify-between gap-3 px-5 py-3.5 transition hover:bg-[#FAFAFC]">
                <div class="min-w-0"><div class="flex items-center gap-2"><span class={`h-2 w-2 rounded-full ${!chat.closedAt && chat.status !== "closed" ? "bg-[#35A65A]" : "bg-[#B8BDC8]"}`}></span><strong class="application-text-caption truncate text-[#3D4454]">#{chat.ticketNumber} · {chat.subject}</strong></div><span class="application-text-meta mt-1 block text-[#9297A5]">{chat.aiState === "human" ? "Atendimento humano" : `IA: ${chat.aiState}`} · {formatDate(chat.lastSeenAt)}</span></div>
                <ExternalLink size={13} class="shrink-0 text-[#8B909D]"/>
              </a>
            {/each}
          </div>
        {/if}
      </section>

      <section class="overflow-hidden rounded-[22px] border border-[#E2E5ED] bg-white">
        <header class="flex items-center justify-between border-b border-[#EEF0F5] px-5 py-4"><div><h3 class="text-[14px] font-semibold text-[#303746]">Tarefas originadas em tickets</h3><p class="application-text-meta mt-1 text-[#9297A5]">Ações internas que continuaram fora do atendimento.</p></div><span class="application-text-meta rounded-full bg-[#F3F4F7] px-2 py-1 font-bold text-[#687080]">{data.tasks.length}</span></header>
        {#if data.tasks.length === 0}
          <p class="application-text-caption px-5 py-8 text-center text-[#9297A5]">Nenhuma tarefa vinculada.</p>
        {:else}
          <div class="divide-y divide-[#EEF0F5]">
            {#each data.tasks as task}
              <a href={`/app/tasks/${task.id}`} class="flex items-center justify-between gap-3 px-5 py-3.5 transition hover:bg-[#FAFAFC]">
                <div class="min-w-0"><strong class="application-text-caption block truncate text-[#3D4454]">{task.title}</strong><span class="application-text-meta mt-1 block text-[#9297A5]">{task.projectName} · Ticket #{task.ticketNumber} · {priorityLabels[task.priority] ?? task.priority}</span></div>
                <span class={`application-text-meta shrink-0 rounded-full px-2 py-1 font-bold ${task.statusClosed ? "bg-[#EEF8F1] text-[#2F7045]" : "bg-[#EEF0FF] text-[#000A57]"}`}>{task.statusName}</span>
              </a>
            {/each}
          </div>
        {/if}
      </section>
    </div>

    <aside class="space-y-4">
      <section class="rounded-[22px] border border-[#E2E5ED] bg-white p-5">
        <h3 class="flex items-center gap-2 text-[13px] font-semibold text-[#303746]"><Building2 size={15}/>Escola / organização</h3>
        <div class="application-text-caption mt-3 space-y-2 text-[#687080]"><p><strong class="text-[#3D4454]">Nome:</strong> {data.customer.organizationName ?? "Não vinculada"}</p><p><strong class="text-[#3D4454]">Documento:</strong> {data.customer.organizationDocument ?? "Não informado"}</p></div>
      </section>

      <section class="rounded-[22px] border border-[#E2E5ED] bg-white p-5">
        <div class="flex items-center justify-between"><h3 class="flex items-center gap-2 text-[13px] font-semibold text-[#303746]"><Building2 size={15}/>Unidades F10</h3><span class="application-text-meta text-[#9297A5]">{data.units.length}</span></div>
        {#if data.units.length === 0}<p class="application-text-meta mt-3 leading-4 text-[#9297A5]">Nenhuma unidade foi identificada nos atendimentos acessíveis.</p>{:else}<div class="mt-3 space-y-2">{#each data.units as unit}<div class="rounded-xl bg-[#F7F8FB] p-3"><strong class="application-text-caption block text-[#3D4454]">{unit.unitName}</strong><span class="application-text-meta mt-1 block text-[#9297A5]">{unit.groupName}</span></div>{/each}</div>{/if}
      </section>

      <section class="rounded-[22px] border border-[#E2E5ED] bg-white p-5">
        <div class="flex items-center justify-between"><h3 class="flex items-center gap-2 text-[13px] font-semibold text-[#303746]"><Users size={15}/>Contatos</h3><span class="application-text-meta text-[#9297A5]">{data.relatedContacts.length}</span></div>
        <div class="mt-3 space-y-2">
          {#each data.relatedContacts as contact}
            <div class={`rounded-xl border p-3 ${contact.id === data.customer.id ? "border-[#D8DDF4] bg-[#F8F9FF]" : "border-[#EEF0F5] bg-[#FAFAFC]"}`}>
              <div class="flex items-center justify-between gap-2"><strong class="application-text-caption text-[#3D4454]">{contact.name}</strong>{#if contact.id === data.customer.id}<span class="application-text-meta font-bold text-[#000A57]">Atual</span>{/if}</div>
              <div class="application-text-meta mt-1 space-y-0.5 text-[#858B99]">{#if contact.email}<span class="block truncate">{contact.email}</span>{/if}{#if contact.phone}<span class="block">{contact.phone}</span>{/if}{#if contact.whatsapp}<span class="block">WhatsApp {contact.whatsapp}</span>{/if}</div>
            </div>
          {:else}
            <p class="application-text-meta text-[#9297A5]">Vincule uma organização para agrupar contatos.</p>
          {/each}
        </div>
      </section>

      {#if data.canManage}
        <details class="rounded-[22px] border border-[#E2E5ED] bg-white p-5">
          <summary class="application-text-caption cursor-pointer list-none font-semibold text-[#000A57]">Editar cadastro</summary>
          <form method="POST" action="?/update" class="mt-4 space-y-3">
            <label class="block"><span class="application-text-meta mb-1 block font-semibold text-[#687080]">Nome</span><input name="name" required minlength="2" maxlength="120" value={data.customer.name} class="application-text-caption h-10 w-full rounded-xl border border-[#DDE1EA] px-3"/></label>
            <label class="block"><span class="application-text-meta mb-1 block font-semibold text-[#687080]">E-mail</span><input name="email" type="email" maxlength="254" value={data.customer.email ?? ""} class="application-text-caption h-10 w-full rounded-xl border border-[#DDE1EA] px-3"/></label>
            <div class="grid grid-cols-2 gap-2"><label><span class="application-text-meta mb-1 block font-semibold text-[#687080]">Telefone</span><input name="phone" maxlength="40" value={data.customer.phone ?? ""} class="application-text-caption h-10 w-full rounded-xl border border-[#DDE1EA] px-3"/></label><label><span class="application-text-meta mb-1 block font-semibold text-[#687080]">WhatsApp</span><input name="whatsapp" maxlength="40" value={data.customer.whatsapp ?? ""} class="application-text-caption h-10 w-full rounded-xl border border-[#DDE1EA] px-3"/></label></div>
            <label class="block"><span class="application-text-meta mb-1 block font-semibold text-[#687080]">Escola / organização</span><input name="organizationName" maxlength="160" value={data.customer.organizationName ?? ""} class="application-text-caption h-10 w-full rounded-xl border border-[#DDE1EA] px-3"/></label>
            <label class="block"><span class="application-text-meta mb-1 block font-semibold text-[#687080]">Documento</span><input name="organizationDocument" maxlength="80" value={data.customer.organizationDocument ?? ""} class="application-text-caption h-10 w-full rounded-xl border border-[#DDE1EA] px-3"/></label>
            <label class="application-text-caption flex items-center gap-2 font-semibold text-[#555C6D]"><input name="active" type="checkbox" checked={data.customer.active}/>Cliente ativo</label>
            <button type="submit" class="application-text-caption h-10 w-full rounded-xl bg-[#000A57] font-semibold text-white">Salvar cadastro</button>
          </form>
        </details>

        {#if data.customer.organizationId}
          <details class="rounded-[22px] border border-[#E2E5ED] bg-white p-5">
            <summary class="application-text-caption cursor-pointer list-none font-semibold text-[#000A57]">+ Adicionar contato</summary>
            <form method="POST" action="?/createContact" class="mt-4 space-y-3">
              <input name="name" required minlength="2" maxlength="120" placeholder="Nome do contato" class="application-text-caption h-10 w-full rounded-xl border border-[#DDE1EA] px-3"/>
              <input name="email" type="email" maxlength="254" placeholder="E-mail" class="application-text-caption h-10 w-full rounded-xl border border-[#DDE1EA] px-3"/>
              <div class="grid grid-cols-2 gap-2"><input name="phone" maxlength="40" placeholder="Telefone" class="application-text-caption h-10 w-full rounded-xl border border-[#DDE1EA] px-3"/><input name="whatsapp" maxlength="40" placeholder="WhatsApp" class="application-text-caption h-10 w-full rounded-xl border border-[#DDE1EA] px-3"/></div>
              <button type="submit" class="application-text-caption h-10 w-full rounded-xl border border-[#DDE1EA] bg-white font-semibold text-[#000A57]">Adicionar contato</button>
            </form>
          </details>
        {/if}
      {/if}

      {#if data.activity.length > 0}
        <section class="rounded-[22px] border border-[#E2E5ED] bg-white p-5">
          <h3 class="text-[13px] font-semibold text-[#303746]">Atividade do portal</h3>
          <div class="mt-3 space-y-2">{#each data.activity.slice(0, 8) as event}<div class="application-text-meta border-l-2 border-[#E4E7EE] pl-3 text-[#687080]"><strong class="block text-[#4E5565]">{event.eventType}</strong><span class="mt-0.5 block text-[#9297A5]">{formatDate(event.createdAt)}</span></div>{/each}</div>
        </section>
      {/if}
    </aside>
  </div>
</ApplicationContent>
