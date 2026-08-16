<script lang="ts">
  import { BarChart3, CheckCircle2, Clock3, Headphones, ListTodo, MonitorCog } from "lucide-svelte";
  import type { PageData } from "./$types";

  export let data: PageData;

  const performance = data.performance;

  function minutes(value: number | null): string {
    if (value === null) return "—";
    if (value < 60) return `${value.toLocaleString("pt-BR")} min`;
    const hours = value / 60;
    return `${hours.toLocaleString("pt-BR", { maximumFractionDigits: 1 })} h`;
  }

  function percent(value: number | null): string {
    return value === null ? "—" : `${value.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}%`;
  }
</script>

<svelte:head><title>Performance | F10 Operations</title></svelte:head>

<div class="mx-auto max-w-[1480px] px-5 py-7 sm:px-8 sm:py-9">
  <div class="flex flex-col justify-between gap-5 lg:flex-row lg:items-end">
    <div>
      <p class="text-[10px] font-bold uppercase tracking-[0.14em] text-[#EA6D0B]">Relatórios</p>
      <h1 class="mt-2 text-[30px] font-semibold tracking-[-0.035em] text-[#010D28] sm:text-[38px]">Performance da equipe</h1>
      <p class="mt-2 max-w-[820px] text-[12px] leading-6 text-[#6F7585]">Métricas objetivas de atendimento humano, tarefas e suporte remoto. O tempo de resposta é calculado pela primeira mensagem humana, sem contar respostas da IA.</p>
    </div>
    <div class="flex rounded-xl border border-[#DDE1EA] bg-white p-1">
      {#each [7, 30, 90] as period}
        <a href={`/app/performance?period=${period}`} class={`rounded-lg px-3 py-2 text-[10px] font-semibold ${performance.periodDays === period ? "bg-[#000A57] text-white" : "text-[#6D7280] hover:bg-[#F6F7FA]"}`}>{period} dias</a>
      {/each}
    </div>
  </div>

  <div class="mt-7 grid gap-4 sm:grid-cols-2 xl:grid-cols-6">
    <article class="rounded-2xl border border-[#E2E5ED] bg-white p-4"><Headphones size={18} class="text-[#000A57]"/><span class="mt-4 block text-[9px] font-bold uppercase tracking-[0.08em] text-[#8C919F]">Tickets tratados</span><strong class="mt-1 block text-[24px] font-semibold text-[#11182C]">{performance.summary.handledTickets}</strong></article>
    <article class="rounded-2xl border border-[#E2E5ED] bg-white p-4"><CheckCircle2 size={18} class="text-[#2F7045]"/><span class="mt-4 block text-[9px] font-bold uppercase tracking-[0.08em] text-[#8C919F]">Resolvidos</span><strong class="mt-1 block text-[24px] font-semibold text-[#11182C]">{performance.summary.resolvedTickets}</strong></article>
    <article class="rounded-2xl border border-[#E2E5ED] bg-white p-4"><Clock3 size={18} class="text-[#EA6D0B]"/><span class="mt-4 block text-[9px] font-bold uppercase tracking-[0.08em] text-[#8C919F]">Mediana 1ª resposta</span><strong class="mt-1 block text-[20px] font-semibold text-[#11182C]">{minutes(performance.summary.medianFirstHumanResponseMinutes)}</strong></article>
    <article class="rounded-2xl border border-[#E2E5ED] bg-white p-4"><BarChart3 size={18} class="text-[#5C4BA2]"/><span class="mt-4 block text-[9px] font-bold uppercase tracking-[0.08em] text-[#8C919F]">P90 1ª resposta</span><strong class="mt-1 block text-[20px] font-semibold text-[#11182C]">{minutes(performance.summary.p90FirstHumanResponseMinutes)}</strong></article>
    <article class="rounded-2xl border border-[#E2E5ED] bg-white p-4"><ListTodo size={18} class="text-[#000A57]"/><span class="mt-4 block text-[9px] font-bold uppercase tracking-[0.08em] text-[#8C919F]">Tarefas concluídas</span><strong class="mt-1 block text-[24px] font-semibold text-[#11182C]">{performance.summary.tasksCompleted}</strong></article>
    <article class="rounded-2xl border border-[#E2E5ED] bg-white p-4"><MonitorCog size={18} class="text-[#000A57]"/><span class="mt-4 block text-[9px] font-bold uppercase tracking-[0.08em] text-[#8C919F]">Acessos remotos</span><strong class="mt-1 block text-[24px] font-semibold text-[#11182C]">{performance.summary.remoteStarted}</strong></article>
  </div>

  <section class="mt-6 overflow-hidden rounded-[24px] border border-[#E2E5ED] bg-white">
    <div class="border-b border-[#EEF0F5] px-5 py-4 sm:px-6">
      <h2 class="text-[15px] font-semibold text-[#202637]">Por usuário</h2>
      <p class="mt-1 text-[10px] leading-5 text-[#858B99]">Sem pontuação artificial: cada coluna representa uma atividade ou indicador mensurável.</p>
    </div>

    <div class="overflow-x-auto">
      <table class="min-w-[1180px] w-full border-collapse text-left">
        <thead class="bg-[#FAFAFC] text-[9px] font-bold uppercase tracking-[0.06em] text-[#858B99]"><tr><th class="px-5 py-3">Usuário</th><th class="px-3 py-3">Tickets</th><th class="px-3 py-3">Chats</th><th class="px-3 py-3">Respostas</th><th class="px-3 py-3">Resolvidos</th><th class="px-3 py-3">Mediana</th><th class="px-3 py-3">P90</th><th class="px-3 py-3">SLA 1ª resp.</th><th class="px-3 py-3">Tarefas</th><th class="px-3 py-3">No prazo</th><th class="px-3 py-3">Atrasadas</th><th class="px-3 py-3">Remoto</th></tr></thead>
        <tbody class="divide-y divide-[#EEF0F5]">
          {#each performance.users as user}
            <tr class="text-[10px] text-[#555C6C] hover:bg-[#FAFAFC]">
              <td class="px-5 py-4"><strong class="block text-[11px] text-[#303746]">{user.name}</strong><span class="mt-1 block text-[9px] text-[#9297A4]">{user.email}</span></td>
              <td class="px-3 py-4 font-semibold">{user.handledTickets}</td>
              <td class="px-3 py-4">{user.handledChats}</td>
              <td class="px-3 py-4">{user.publicReplies}<span class="ml-1 text-[8px] text-[#9BA0AC]">+ {user.internalNotes} notas</span></td>
              <td class="px-3 py-4">{user.resolvedTickets}</td>
              <td class="px-3 py-4">{minutes(user.medianFirstHumanResponseMinutes)}</td>
              <td class="px-3 py-4">{minutes(user.p90FirstHumanResponseMinutes)}</td>
              <td class="px-3 py-4">{percent(user.firstResponseSlaPercent)}<span class="ml-1 text-[8px] text-[#9BA0AC]">({user.firstResponseSamples})</span></td>
              <td class="px-3 py-4">{user.tasksCompleted}</td>
              <td class="px-3 py-4">{percent(user.tasksCompletedOnTimePercent)}</td>
              <td class={`px-3 py-4 font-semibold ${user.tasksOverdue > 0 ? "text-[#B5473A]" : "text-[#666D7C]"}`}>{user.tasksOverdue}</td>
              <td class="px-3 py-4">{user.remoteCompleted}/{user.remoteStarted}</td>
            </tr>
          {/each}
        </tbody>
      </table>
    </div>
  </section>

  <p class="mt-4 text-[9px] leading-5 text-[#9196A3]">“Resolvidos” usa o usuário que registrou a mudança para Resolvido/Fechado. “SLA 1ª resp.” considera apenas tickets que possuem prazo de primeira resposta e atribui o resultado ao autor da primeira resposta pública humana.</p>
</div>
