<script lang="ts">
  import { ArrowLeft, Bot, Clock3, RotateCw, Save, UserCheck, Users } from "lucide-svelte";
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

<div class="mx-auto max-w-[920px] px-5 py-7 sm:px-8 sm:py-9">
  <a href="/app/settings" class="inline-flex items-center gap-2 text-[10px] font-semibold text-[#6F7585] hover:text-[#000A57]"><ArrowLeft size={14}/>Configurações</a>

  <div class="mt-5 flex items-start gap-3">
    <span class="flex h-11 w-11 items-center justify-center rounded-xl bg-[#EEF0FF] text-[#000A57]"><Clock3 size={20}/></span>
    <div>
      <p class="text-[10px] font-bold uppercase tracking-[0.14em] text-[#EA6D0B]">Atendimento</p>
      <h1 class="mt-1 text-[30px] font-semibold tracking-[-0.035em] text-[#010D28]">Operação do suporte</h1>
      <p class="mt-2 max-w-[700px] text-[12px] leading-6 text-[#6F7585]">Define equipe, presença, distribuição do chat, limites da IA e horário de funcionamento.</p>
    </div>
  </div>

  {#if form?.message}
    <div class={`mt-6 rounded-2xl border px-4 py-3 text-[10px] font-medium ${form.success ? "border-[#B9E6C9] bg-[#F1FBF4] text-[#176B35]" : "border-[#F0C8C8] bg-[#FFF5F5] text-[#9B2C2C]"}`}>{form.message}</div>
  {/if}

  <section class="mt-7 rounded-[24px] border border-[#E2E5ED] bg-white p-5 sm:p-6">
    <div class="flex items-start gap-3">
      <span class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#F2F0FF] text-[#5C4BA2]"><Users size={18}/></span>
      <div><h2 class="text-[14px] font-semibold text-[#252C3D]">Equipe responsável</h2><p class="mt-1 text-[9px] leading-4 text-[#858B99]">Usada para escopo de equipe, organização da fila e relatórios de suporte.</p></div>
    </div>

    {#if data.queue.teams.length > 0}
      <form method="POST" action="?/saveTeam" class="mt-5 flex flex-col gap-3 sm:flex-row sm:items-end">
        <label class="block min-w-0 flex-1"><span class="mb-1.5 block text-[10px] font-semibold text-[#555B6B]">Equipe</span><select name="teamId" required class="h-11 w-full rounded-xl border border-[#DDE1EA] bg-white px-3 text-[11px] outline-none focus:border-[#000A57]">{#if !data.queue.teamId}<option value="" selected disabled>Selecione uma equipe</option>{/if}{#each data.queue.teams as team}<option value={team.id} selected={team.id === data.queue.teamId}>{team.name}</option>{/each}</select></label>
        <button type="submit" class="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[#000A57] px-4 text-[10px] font-semibold text-white"><Save size={14}/>Salvar equipe</button>
      </form>
    {:else}
      <p class="mt-5 rounded-xl border border-dashed border-[#D7DAE3] bg-[#FAFAFC] px-4 py-4 text-[10px] leading-5 text-[#7C8291]">Nenhuma equipe ativa foi cadastrada. Crie uma equipe em <a href="/app/team" class="font-semibold text-[#000A57] hover:underline">Equipe</a> antes de configurar a fila de suporte.</p>
    {/if}
  </section>

  <form method="POST" action="?/saveRouting" class="mt-5 rounded-[24px] border border-[#E2E5ED] bg-white p-5 sm:p-6">
    <div class="flex items-start gap-3">
      <span class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#EEF8F1] text-[#2F7045]"><RotateCw size={18}/></span>
      <div><h2 class="text-[14px] font-semibold text-[#252C3D]">Distribuição dos chats</h2><p class="mt-1 text-[9px] leading-4 text-[#858B99]">Na distribuição automática, novos handoffs da IA vão para o próximo atendente selecionado que esteja realmente Online.</p></div>
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
      <div><h3 class="text-[13px] font-semibold text-[#252C3D]">Limites do agente de IA</h3><p class="mt-1 text-[9px] leading-4 text-[#858B99]">A IA só usa conteúdo publicado na Base de Conhecimento. Os limites abaixo evitam conversas longas e gasto excessivo.</p></div>
    </div>
    <div class="mt-4 grid gap-4 sm:grid-cols-3">
      <label class="block"><span class="mb-1.5 block text-[9px] font-semibold text-[#555B6B]">Respostas por conversa</span><input name="aiMaxRunsPerConversation" type="number" min="1" max="20" value={data.routing.configuration.aiMaxRunsPerConversation} class="h-10 w-full rounded-xl border border-[#DDE1EA] px-3 text-[11px]"/></label>
      <label class="block"><span class="mb-1.5 block text-[9px] font-semibold text-[#555B6B]">Orçamento diário de tokens</span><input name="aiDailyTokenBudget" type="number" min="5000" max="5000000" step="1000" value={data.routing.configuration.aiDailyTokenBudget} class="h-10 w-full rounded-xl border border-[#DDE1EA] px-3 text-[11px]"/></label>
      <label class="block"><span class="mb-1.5 block text-[9px] font-semibold text-[#555B6B]">Máximo por resposta</span><input name="aiMaxOutputTokens" type="number" min="200" max="700" step="50" value={data.routing.configuration.aiMaxOutputTokens} class="h-10 w-full rounded-xl border border-[#DDE1EA] px-3 text-[11px]"/></label>
    </div>

    <button type="submit" class="mt-5 inline-flex min-h-10 items-center gap-2 rounded-xl bg-[#000A57] px-4 text-[10px] font-semibold text-white"><Save size={14}/>Salvar distribuição e IA</button>
  </form>

  <form method="POST" action="?/save" class="mt-5 rounded-[24px] border border-[#E2E5ED] bg-white p-5 sm:p-6">
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
</div>
