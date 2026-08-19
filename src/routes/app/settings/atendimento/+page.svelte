<script lang="ts">
  import {
    Bot,
    Clock3,
    MessagesSquare,
    Plus,
    RotateCw,
    Save,
    Trash2,
    UserCheck,
    Users,
  } from "lucide-svelte";
  import ApplicationBackLink from "$lib/components/application/ApplicationBackLink.svelte";
  import ApplicationContent from "$lib/components/application/ApplicationContent.svelte";
  import type { ActionData, PageData } from "./$types";

  export let data: PageData;
  export let form: ActionData;

  const days = [
    ["monday", "Segunda-feira"],
    ["tuesday", "Terça-feira"],
    ["wednesday", "Quarta-feira"],
    ["thursday", "Quinta-feira"],
    ["friday", "Sexta-feira"],
    ["saturday", "Sábado"],
    ["sunday", "Domingo"],
  ] as const;

  let routingUserIds = data.routing.users
    .filter((user) => user.included)
    .map((user) => user.id);

  function toggleRoutingUser(userId: string, checked: boolean): void {
    routingUserIds = checked
      ? Array.from(new Set([...routingUserIds, userId]))
      : routingUserIds.filter((id) => id !== userId);
  }

  function addAllRoutingUsers(): void {
    routingUserIds = data.routing.users.map((user) => user.id);
  }

  function clearRoutingUsers(): void {
    routingUserIds = [];
  }

  function presenceLabel(status: string): string {
    if (status === "online") return "Online";
    if (status === "busy") return "Ocupado";
    if (status === "away") return "Ausente";
    return "Offline";
  }
</script>

<svelte:head><title>Atendimento | F10 Operations</title></svelte:head>

<ApplicationContent width="narrow">
  <ApplicationBackLink href="/app/settings" label="Configurações" className="mb-3" />

  {#if form?.message}
    <div class={`mb-3 rounded-2xl border px-4 py-3 text-[10px] font-medium ${form.success ? "border-[#B9E6C9] bg-[#F1FBF4] text-[#176B35]" : "border-[#F0C8C8] bg-[#FFF5F5] text-[#9B2C2C]"}`}>{form.message}</div>
  {/if}

  <section class="rounded-[22px] border border-[#E2E5ED] bg-white p-5 sm:p-6">
    <div class="flex items-start gap-3">
      <span class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#F2F0FF] text-[#5C4BA2]"><Users size={18}/></span>
      <div><h2 class="text-[14px] font-semibold text-[#252C3D]">Equipe responsável pelo suporte</h2><p class="mt-1 text-[9px] leading-4 text-[#858B99]">Equipe da fila principal. As demais filas podem usar equipes diferentes, configuradas na entrada do chat.</p></div>
    </div>

    {#if data.queue.teams.length > 0}
      <form method="POST" action="?/saveTeam" class="mt-5 flex flex-col gap-3 sm:flex-row sm:items-end">
        <label class="block min-w-0 flex-1"><span class="mb-1.5 block text-[10px] font-semibold text-[#555B6B]">Equipe</span><select name="teamId" required class="h-11 w-full rounded-xl border border-[#DDE1EA] bg-white px-3 text-[11px] outline-none focus:border-[#000A57]">{#if !data.queue.teamId}<option value="" selected disabled>Selecione uma equipe</option>{/if}{#each data.queue.teams as team}<option value={team.id} selected={team.id === data.queue.teamId}>{team.name}</option>{/each}</select></label>
        <button type="submit" class="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[#000A57] px-4 text-[10px] font-semibold text-white"><Save size={14}/>Salvar equipe</button>
      </form>
    {:else}
      <p class="mt-5 rounded-xl border border-dashed border-[#D7DAE3] bg-[#FAFAFC] px-4 py-4 text-[10px] leading-5 text-[#7C8291]">Nenhuma equipe ativa foi cadastrada. Crie uma equipe em <a href="/app/team" class="font-semibold text-[#000A57] hover:underline">Equipe</a> antes de configurar as filas.</p>
    {/if}
  </section>

  <section class="mt-4 rounded-[22px] border border-[#E2E5ED] bg-white p-5 sm:p-6">
    <div class="flex items-start gap-3">
      <span class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#FFF2E8] text-[#C85C08]"><MessagesSquare size={18}/></span>
      <div>
        <h2 class="text-[14px] font-semibold text-[#252C3D]">Entrada do chat</h2>
        <p class="mt-1 max-w-[760px] text-[9px] leading-4 text-[#858B99]">As opções aparecem antes do formulário do cliente. Cada opção direciona para uma fila; a fila define a equipe e, no modo automático, somente integrantes elegíveis e Online entram no round-robin.</p>
      </div>
    </div>

    <div class="mt-5 space-y-3">
      {#each data.chatEntry.options as option}
        <div class="rounded-2xl border border-[#E5E7ED] bg-[#FAFAFC] p-4">
          <form method="POST" action="?/updateEntryOption" class="grid gap-3 lg:grid-cols-[1.2fr_1.4fr_1fr_170px_80px] lg:items-end">
            <input type="hidden" name="optionId" value={option.id}/>
            <label class="block"><span class="mb-1 block text-[9px] font-semibold text-[#5A6170]">Opção</span><input name="label" required minlength="2" maxlength="80" value={option.label} class="h-10 w-full rounded-xl border border-[#DDE1EA] bg-white px-3 text-[10px]"/></label>
            <label class="block"><span class="mb-1 block text-[9px] font-semibold text-[#5A6170]">Descrição</span><input name="description" maxlength="180" value={option.description} class="h-10 w-full rounded-xl border border-[#DDE1EA] bg-white px-3 text-[10px]"/></label>
            <label class="block"><span class="mb-1 block text-[9px] font-semibold text-[#5A6170]">Fila</span><select name="queueId" required class="h-10 w-full rounded-xl border border-[#DDE1EA] bg-white px-2 text-[10px]">{#each data.chatEntry.queues as queue}<option value={queue.id} selected={queue.id === option.queueId} disabled={!queue.active}>{queue.name}{queue.teamName ? ` · ${queue.teamName}` : ""}{queue.active ? "" : " · inativa"}</option>{/each}</select></label>
            <label class="block"><span class="mb-1 block text-[9px] font-semibold text-[#5A6170]">Atendimento inicial</span><select name="initialHandling" class="h-10 w-full rounded-xl border border-[#DDE1EA] bg-white px-2 text-[10px]"><option value="ai" selected={option.initialHandling === "ai"}>Automação + humano</option><option value="human" selected={option.initialHandling === "human"}>Humano</option></select></label>
            <label class="block"><span class="mb-1 block text-[9px] font-semibold text-[#5A6170]">Ordem</span><input name="sortOrder" type="number" min="0" max="10000" value={option.sortOrder} class="h-10 w-full rounded-xl border border-[#DDE1EA] bg-white px-2 text-[10px]"/></label>
            <div class="flex flex-wrap items-center gap-3 lg:col-span-5">
              <label class="flex items-center gap-2 text-[9px] font-semibold text-[#626978]"><input name="active" type="checkbox" checked={option.active} class="h-4 w-4 rounded border-[#C9CEDA]"/>Exibir no chat</label>
              <button type="submit" class="inline-flex min-h-9 items-center gap-2 rounded-xl bg-[#000A57] px-3 text-[9px] font-semibold text-white"><Save size={13}/>Salvar</button>
            </div>
          </form>
          <form method="POST" action="?/deleteEntryOption" class="mt-2 flex justify-end">
            <input type="hidden" name="optionId" value={option.id}/>
            <button type="submit" class="inline-flex min-h-8 items-center gap-1.5 rounded-lg px-2 text-[8px] font-semibold text-[#9B3C3C] hover:bg-[#FFF0F0]"><Trash2 size={12}/>Remover opção</button>
          </form>
        </div>
      {/each}
    </div>

    <details class="mt-4 rounded-2xl border border-dashed border-[#D7DAE3] bg-[#FAFBFC] p-4" open={data.chatEntry.options.length === 0}>
      <summary class="cursor-pointer list-none text-[10px] font-semibold text-[#000A57]">+ Adicionar opção de entrada</summary>
      <form method="POST" action="?/createEntryOption" class="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <label class="block"><span class="mb-1 block text-[9px] font-semibold text-[#5A6170]">Nome</span><input name="label" required minlength="2" maxlength="80" placeholder="Ex.: Financeiro e cobrança" class="h-10 w-full rounded-xl border border-[#DDE1EA] bg-white px-3 text-[10px]"/></label>
        <label class="block sm:col-span-2"><span class="mb-1 block text-[9px] font-semibold text-[#5A6170]">Descrição</span><input name="description" maxlength="180" placeholder="Ex.: Boletos, pagamentos e contratos" class="h-10 w-full rounded-xl border border-[#DDE1EA] bg-white px-3 text-[10px]"/></label>
        <label class="block"><span class="mb-1 block text-[9px] font-semibold text-[#5A6170]">Fila</span><select name="queueId" required class="h-10 w-full rounded-xl border border-[#DDE1EA] bg-white px-2 text-[10px]"><option value="" disabled selected>Selecione...</option>{#each data.chatEntry.queues.filter((queue) => queue.active) as queue}<option value={queue.id}>{queue.name}{queue.teamName ? ` · ${queue.teamName}` : ""}</option>{/each}</select></label>
        <label class="block"><span class="mb-1 block text-[9px] font-semibold text-[#5A6170]">Atendimento inicial</span><select name="initialHandling" class="h-10 w-full rounded-xl border border-[#DDE1EA] bg-white px-2 text-[10px]"><option value="ai">Automação + humano</option><option value="human">Humano</option></select></label>
        <label class="block"><span class="mb-1 block text-[9px] font-semibold text-[#5A6170]">Ordem</span><input name="sortOrder" type="number" min="0" max="10000" value="10" class="h-10 w-full rounded-xl border border-[#DDE1EA] bg-white px-2 text-[10px]"/></label>
        <label class="flex items-center gap-2 text-[9px] font-semibold text-[#626978]"><input name="active" type="checkbox" checked class="h-4 w-4 rounded border-[#C9CEDA]"/>Exibir no chat</label>
        <div class="sm:col-span-2 lg:col-span-3"><button type="submit" class="inline-flex min-h-10 items-center gap-2 rounded-xl bg-[#000A57] px-4 text-[9px] font-semibold text-white"><Plus size={13}/>Criar opção</button></div>
      </form>
    </details>

    <div class="mt-6 border-t border-[#EEF0F5] pt-5">
      <div class="flex flex-wrap items-start justify-between gap-3">
        <div><h3 class="text-[12px] font-semibold text-[#3D4454]">Filas de atendimento</h3><p class="mt-1 text-[9px] leading-4 text-[#8A909E]">A fila agrupa o assunto e aponta para a equipe responsável.</p></div>
        <span class="rounded-full bg-[#F3F4F7] px-2.5 py-1 text-[8px] font-bold text-[#707685]">{data.chatEntry.queues.length} filas</span>
      </div>
      <div class="mt-3 grid gap-2 sm:grid-cols-2">
        {#each data.chatEntry.queues as queue}
          <div class="rounded-xl border border-[#E7E9EF] px-3 py-3"><div class="flex items-center justify-between gap-3"><strong class="text-[10px] text-[#414858]">{queue.name}</strong><span class={`rounded-full px-2 py-1 text-[7px] font-bold ${queue.active ? "bg-[#EEF8F1] text-[#2F7045]" : "bg-[#F1F2F5] text-[#777D8C]"}`}>{queue.active ? "Ativa" : "Inativa"}</span></div><p class="mt-1 text-[8px] text-[#9297A4]">Equipe: {queue.teamName ?? "sem equipe"}</p></div>
        {/each}
      </div>

      {#if data.chatEntry.teams.length > 0}
        <form method="POST" action="?/createQueue" class="mt-4 grid gap-3 rounded-xl bg-[#F8F9FC] p-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
          <label class="block"><span class="mb-1 block text-[9px] font-semibold text-[#5A6170]">Nova fila</span><input name="name" required minlength="2" maxlength="80" placeholder="Ex.: Financeiro" class="h-10 w-full rounded-xl border border-[#DDE1EA] bg-white px-3 text-[10px]"/></label>
          <label class="block"><span class="mb-1 block text-[9px] font-semibold text-[#5A6170]">Equipe responsável</span><select name="teamId" required class="h-10 w-full rounded-xl border border-[#DDE1EA] bg-white px-2 text-[10px]"><option value="" disabled selected>Selecione...</option>{#each data.chatEntry.teams as team}<option value={team.id}>{team.name}</option>{/each}</select></label>
          <button type="submit" class="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-[#DDE1EA] bg-white px-4 text-[9px] font-semibold text-[#000A57]"><Plus size={13}/>Criar fila</button>
        </form>
      {/if}
    </div>
  </section>

  <form method="POST" action="?/saveRouting" class="mt-4 rounded-[22px] border border-[#E2E5ED] bg-white p-5 sm:p-6">
    <div class="flex items-start gap-3">
      <span class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#EEF8F1] text-[#2F7045]"><RotateCw size={18}/></span>
      <div><h2 class="text-[14px] font-semibold text-[#252C3D]">Distribuição dos chats</h2><p class="mt-1 text-[9px] leading-4 text-[#858B99]">No automático, o handoff respeita a equipe da fila e vai para o próximo participante realmente Online.</p></div>
    </div>

    <div class="mt-5 grid gap-4 sm:grid-cols-2">
      <label class="block"><span class="mb-1.5 block text-[10px] font-semibold text-[#555B6B]">Modo de atribuição</span><select name="assignmentMode" class="h-11 w-full rounded-xl border border-[#DDE1EA] bg-white px-3 text-[11px]"><option value="manual" selected={data.routing.configuration.assignmentMode === "manual"}>Manual</option><option value="round_robin" selected={data.routing.configuration.assignmentMode === "round_robin"}>Automática rotacionada</option></select></label>
      <div class="rounded-xl bg-[#F8F9FC] px-4 py-3 text-[9px] leading-4 text-[#777D8D]"><strong class="block text-[10px] text-[#414858]">Regra de presença</strong>Ocupado, Ausente e Offline não recebem novas conversas. Após 10 minutos sem interação real no painel, Online vira Ausente automaticamente.</div>
    </div>

    <div class="mt-5 overflow-hidden rounded-2xl border border-[#E2E5ED]">
      <div class="flex flex-wrap items-center justify-between gap-2 border-b border-[#EEF0F5] bg-[#FAFAFC] px-4 py-3">
        <div><strong class="block text-[10px] text-[#3F4656]">Atendentes participantes</strong><span class="text-[9px] text-[#8A909E]">Somente usuários ativos com permissão para responder chat aparecem aqui.</span></div>
        <div class="flex gap-2"><button type="button" on:click={addAllRoutingUsers} class="rounded-lg border border-[#DDE1EA] bg-white px-3 py-1.5 text-[9px] font-semibold text-[#000A57]">Adicionar todos</button><button type="button" on:click={clearRoutingUsers} class="rounded-lg px-3 py-1.5 text-[9px] font-semibold text-[#777D8D]">Limpar</button></div>
      </div>
      {#if data.routing.users.length > 0}
        <div class="divide-y divide-[#EEF0F5]">
          {#each data.routing.users as user}
            <label class="flex items-center gap-3 px-4 py-3 transition hover:bg-[#FAFAFC]">
              <input name="routingUserId" type="checkbox" value={user.id} checked={routingUserIds.includes(user.id)} on:change={(event) => toggleRoutingUser(user.id, event.currentTarget.checked)} class="h-4 w-4 rounded border-[#C9CEDA]"/>
              <span class="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#EEF0FF] text-[#000A57]"><UserCheck size={15}/></span>
              <span class="min-w-0 flex-1"><strong class="block truncate text-[10px] text-[#353C4C]">{user.name}</strong><span class="block truncate text-[9px] text-[#9297A4]">{user.email}</span></span>
              <span class={`rounded-full px-2 py-1 text-[8px] font-bold ${user.presence.effectiveStatus === "online" ? "bg-[#EEF8F1] text-[#2F7045]" : user.presence.effectiveStatus === "busy" ? "bg-[#FFF4E9] text-[#A9510D]" : "bg-[#F1F2F5] text-[#777D8C]"}`}>{presenceLabel(user.presence.effectiveStatus)}</span>
            </label>
          {/each}
        </div>
      {:else}
        <p class="px-4 py-6 text-center text-[10px] text-[#858B99]">Nenhum usuário elegível para atendimento por chat.</p>
      {/if}
    </div>

    <div class="mt-6 flex items-start gap-3 border-t border-[#EEF0F5] pt-5">
      <span class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#F2F0FF] text-[#5C4BA2]"><Bot size={18}/></span>
      <div><h3 class="text-[13px] font-semibold text-[#252C3D]">Limites do agente de IA</h3><p class="mt-1 text-[9px] leading-4 text-[#858B99]">A IA só usa conteúdo publicado na Base de Conhecimento. Os limites evitam conversas longas e gasto excessivo.</p></div>
    </div>
    <div class="mt-4 grid gap-4 sm:grid-cols-3">
      <label class="block"><span class="mb-1.5 block text-[9px] font-semibold text-[#555B6B]">Respostas por conversa</span><input name="aiMaxRunsPerConversation" type="number" min="1" max="20" value={data.routing.configuration.aiMaxRunsPerConversation} class="h-10 w-full rounded-xl border border-[#DDE1EA] px-3 text-[11px]"/></label>
      <label class="block"><span class="mb-1.5 block text-[9px] font-semibold text-[#555B6B]">Orçamento diário de tokens</span><input name="aiDailyTokenBudget" type="number" min="5000" max="5000000" step="1000" value={data.routing.configuration.aiDailyTokenBudget} class="h-10 w-full rounded-xl border border-[#DDE1EA] px-3 text-[11px]"/></label>
      <label class="block"><span class="mb-1.5 block text-[9px] font-semibold text-[#555B6B]">Máximo por resposta</span><input name="aiMaxOutputTokens" type="number" min="200" max="700" step="50" value={data.routing.configuration.aiMaxOutputTokens} class="h-10 w-full rounded-xl border border-[#DDE1EA] px-3 text-[11px]"/></label>
    </div>

    <button type="submit" class="mt-5 inline-flex min-h-10 items-center gap-2 rounded-xl bg-[#000A57] px-4 text-[10px] font-semibold text-white"><Save size={14}/>Salvar distribuição e IA</button>
  </form>

  <form method="POST" action="?/save" class="mt-4 rounded-[22px] border border-[#E2E5ED] bg-white p-5 sm:p-6">
    <div class="flex items-start gap-3"><span class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#EEF0FF] text-[#000A57]"><Clock3 size={18}/></span><div><h2 class="text-[14px] font-semibold text-[#252C3D]">Horário de funcionamento</h2><p class="mt-1 text-[9px] text-[#858B99]">Controla o estado aberto/fechado exibido no chat e a mensagem de handoff da IA.</p></div></div>

    <label class="mt-5 flex items-start gap-3 rounded-2xl border border-[#DDE1EA] bg-[#F8F9FC] px-4 py-3">
      <input name="configured" type="checkbox" checked={data.settings.configured} class="mt-1 h-4 w-4 rounded border-[#C9CEDA]" />
      <span><strong class="block text-[11px] text-[#303746]">Publicar disponibilidade no chat</strong><span class="mt-1 block text-[9px] leading-4 text-[#858B99]">Quando desativado, o chat não afirma que a equipe está aberta ou fechada.</span></span>
    </label>

    <div class="mt-5 divide-y divide-[#EEF0F5] rounded-2xl border border-[#E2E5ED]">
      {#each days as [key, label]}
        <div class="grid gap-3 px-4 py-4 sm:grid-cols-[180px_1fr_1fr] sm:items-center">
          <label class="flex items-center gap-2 text-[10px] font-semibold text-[#454C5C]">
            <input name={`${key}Enabled`} type="checkbox" checked={data.settings.days[key].enabled} class="h-4 w-4 rounded border-[#C9CEDA]" />
            {label}
          </label>
          <label class="block"><span class="mb-1 block text-[8px] font-semibold uppercase tracking-[0.08em] text-[#969CAA]">Início</span><input name={`${key}Start`} type="time" value={data.settings.days[key].start} class="h-10 w-full rounded-xl border border-[#DDE1EA] px-3 text-[11px]" /></label>
          <label class="block"><span class="mb-1 block text-[8px] font-semibold uppercase tracking-[0.08em] text-[#969CAA]">Fim</span><input name={`${key}End`} type="time" value={data.settings.days[key].end} class="h-10 w-full rounded-xl border border-[#DDE1EA] px-3 text-[11px]" /></label>
        </div>
      {/each}
    </div>

    <p class="mt-4 text-[9px] leading-5 text-[#858B99]">Cada dia possui uma única faixa contínua nesta versão. Feriados e exceções podem ser adicionados depois sem alterar o modelo principal.</p>

    <button type="submit" class="mt-5 inline-flex min-h-10 items-center gap-2 rounded-xl bg-[#000A57] px-4 text-[10px] font-semibold text-white"><Save size={14}/>Salvar horário</button>
  </form>
</ApplicationContent>
