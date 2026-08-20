<script lang="ts">
  import {
    BarChart3,
    CheckCircle2,
    Clock3,
    Headphones,
    ListTodo,
    MonitorCog,
    TrendingUp,
  } from "lucide-svelte";
  import ApplicationContent from "$lib/components/application/ApplicationContent.svelte";
  import type { PageData } from "./$types";

  export let data: PageData;

  let performance: PageData["performance"];
  let traffic: PageData["performance"]["traffic"];

  $: performance = data.performance;
  $: traffic = performance.traffic;

  function minutes(value: number | null): string {
    if (value === null) return "—";
    if (value < 60) return `${value.toLocaleString("pt-BR")} min`;
    const hours = value / 60;
    return `${hours.toLocaleString("pt-BR", { maximumFractionDigits: 1 })} h`;
  }

  function percent(value: number | null): string {
    return value === null ? "—" : `${value.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}%`;
  }

  function hourLabel(hour: number): string {
    return `${String(hour).padStart(2, "0")}h`;
  }

  function trafficIntensityClass(count: number, maxCount: number, available: boolean): string {
    if (!available) return "border-[#E4E6EB] bg-[#F2F3F5] text-[#A4A8B1]";
    if (count <= 0 || maxCount <= 0) return "border-[#DFEEE3] bg-[#F1F8F3] text-[#8FA596]";
    const ratio = count / maxCount;
    if (ratio >= 0.8) return "border-[#247C43] bg-[#2F8F50] text-white";
    if (ratio >= 0.6) return "border-[#45A463] bg-[#5AAF73] text-white";
    if (ratio >= 0.4) return "border-[#78BD8C] bg-[#8CC99D] text-[#174D29]";
    if (ratio >= 0.2) return "border-[#A9D8B5] bg-[#BCE1C5] text-[#245B35]";
    return "border-[#CDE6D3] bg-[#DCEEE0] text-[#3B7049]";
  }

  function trafficCellTitle(
    day: (typeof traffic.days)[number],
    cell: (typeof traffic.days)[number]["cells"][number],
  ): string {
    if (!cell.available) {
      return day.enabled
        ? `${day.label}: fora do expediente (${day.start}–${day.end})`
        : `${day.label}: sem atendimento configurado`;
    }
    return `${day.label}, ${hourLabel(cell.hour)}–${hourLabel(cell.hour + 1)}: ${cell.count} atendimento(s)`;
  }

  function peakWindowLabel(): string {
    if (!traffic.peakWindow) return "Sem amostra";
    return `${hourLabel(traffic.peakWindow.startHour)}–${hourLabel(traffic.peakWindow.endHour)}`;
  }
</script>

<svelte:head><title>Performance | F10 Operations</title></svelte:head>

<ApplicationContent width="wide">
  <div class="flex justify-end">
    <div class="flex rounded-xl border border-[#DDE1EA] bg-white p-1">
      {#each [7, 30, 90] as period}
        <a href={`/app/performance?period=${period}`} class={`application-text-caption rounded-lg px-3 py-2 font-semibold ${performance.periodDays === period ? "bg-[#000A57] text-white" : "text-[#6D7280] hover:bg-[#F6F7FA]"}`}>{period} dias</a>
      {/each}
    </div>
  </div>

  <div class="mt-3 grid gap-4 sm:grid-cols-2 xl:grid-cols-6">
    <article class="rounded-2xl border border-[#E2E5ED] bg-white p-4"><Headphones size={18} class="text-[#000A57]"/><span class="application-text-meta mt-4 block font-bold uppercase tracking-[0.08em] text-[#8C919F]">Tickets tratados</span><strong class="mt-1 block text-[24px] font-semibold text-[#11182C]">{performance.summary.handledTickets}</strong></article>
    <article class="rounded-2xl border border-[#E2E5ED] bg-white p-4"><CheckCircle2 size={18} class="text-[#2F7045]"/><span class="application-text-meta mt-4 block font-bold uppercase tracking-[0.08em] text-[#8C919F]">Resolvidos</span><strong class="mt-1 block text-[24px] font-semibold text-[#11182C]">{performance.summary.resolvedTickets}</strong></article>
    <article class="rounded-2xl border border-[#E2E5ED] bg-white p-4"><Clock3 size={18} class="text-[#EA6D0B]"/><span class="application-text-meta mt-4 block font-bold uppercase tracking-[0.08em] text-[#8C919F]">Mediana 1ª resposta</span><strong class="mt-1 block text-[20px] font-semibold text-[#11182C]">{minutes(performance.summary.medianFirstHumanResponseMinutes)}</strong></article>
    <article class="rounded-2xl border border-[#E2E5ED] bg-white p-4"><BarChart3 size={18} class="text-[#5C4BA2]"/><span class="application-text-meta mt-4 block font-bold uppercase tracking-[0.08em] text-[#8C919F]">P90 1ª resposta</span><strong class="mt-1 block text-[20px] font-semibold text-[#11182C]">{minutes(performance.summary.p90FirstHumanResponseMinutes)}</strong></article>
    <article class="rounded-2xl border border-[#E2E5ED] bg-white p-4"><ListTodo size={18} class="text-[#000A57]"/><span class="application-text-meta mt-4 block font-bold uppercase tracking-[0.08em] text-[#8C919F]">Tarefas concluídas</span><strong class="mt-1 block text-[24px] font-semibold text-[#11182C]">{performance.summary.tasksCompleted}</strong></article>
    <article class="rounded-2xl border border-[#E2E5ED] bg-white p-4"><MonitorCog size={18} class="text-[#000A57]"/><span class="application-text-meta mt-4 block font-bold uppercase tracking-[0.08em] text-[#8C919F]">Acessos remotos</span><strong class="mt-1 block text-[24px] font-semibold text-[#11182C]">{performance.summary.remoteStarted}</strong></article>
  </div>

  <section class="mt-5 overflow-hidden rounded-[22px] border border-[#DCE7DF] bg-white">
    <div class="flex flex-col justify-between gap-4 border-b border-[#E8F0EA] px-5 py-5 sm:px-6 lg:flex-row lg:items-start">
      <div class="flex items-start gap-3">
        <span class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#EAF6ED] text-[#287444]"><TrendingUp size={18} /></span>
        <div>
          <h2 class="text-[15px] font-semibold text-[#202637]">Picos de atendimento</h2>
          <p class="application-text-caption mt-1 max-w-[760px] leading-5 text-[#788080]">Volume de novos tickets pelo dia e hora em que o cliente procurou a F10. A intensidade considera somente entradas dentro do horário de atendimento.</p>
        </div>
      </div>
      <div class="shrink-0 text-left lg:text-right">
        <span class="application-text-meta block font-bold uppercase tracking-[0.08em] text-[#8B9290]">Período analisado</span>
        <strong class="mt-1 block text-[12px] text-[#315E40]">Últimos {performance.periodDays} dias · {traffic.timezone}</strong>
      </div>
    </div>

    <div class="grid gap-3 border-b border-[#E8F0EA] bg-[#FBFDFC] px-5 py-4 sm:grid-cols-3 sm:px-6">
      <article class="rounded-2xl border border-[#DDE9E0] bg-white px-4 py-3">
        <span class="application-text-meta font-bold uppercase tracking-[0.08em] text-[#8B9290]">Maior pico</span>
        <strong class="mt-1.5 block text-[13px] text-[#245E39]">{traffic.peakCell ? `${traffic.peakCell.dayLabel} · ${hourLabel(traffic.peakCell.hour)}–${hourLabel(traffic.peakCell.hour + 1)}` : "Sem amostra"}</strong>
        <span class="application-text-meta mt-1 block text-[#87908A]">{traffic.peakCell ? `${traffic.peakCell.count} atendimento(s)` : "Ainda não há entradas suficientes"}</span>
      </article>
      <article class="rounded-2xl border border-[#DDE9E0] bg-white px-4 py-3">
        <span class="application-text-meta font-bold uppercase tracking-[0.08em] text-[#8B9290]">Dia mais movimentado</span>
        <strong class="mt-1.5 block text-[13px] text-[#245E39]">{traffic.peakDay?.dayLabel ?? "Sem amostra"}</strong>
        <span class="application-text-meta mt-1 block text-[#87908A]">{traffic.peakDay ? `${traffic.peakDay.count} atendimento(s) no expediente` : "Ainda não há entradas suficientes"}</span>
      </article>
      <article class="rounded-2xl border border-[#DDE9E0] bg-white px-4 py-3">
        <span class="application-text-meta font-bold uppercase tracking-[0.08em] text-[#8B9290]">Faixa mais movimentada</span>
        <strong class="mt-1.5 block text-[13px] text-[#245E39]">{peakWindowLabel()}</strong>
        <span class="application-text-meta mt-1 block text-[#87908A]">{traffic.peakWindow ? `${traffic.peakWindow.count} entradas · ${percent(traffic.peakWindow.percent)} do expediente` : "Ainda não há entradas suficientes"}</span>
      </article>
    </div>

    <div class="px-4 py-5 sm:px-6">
      <div class="overflow-x-auto pb-2">
        <div class="min-w-[760px]">
          <div class="grid items-end gap-2" style={`grid-template-columns: 118px repeat(${traffic.hours.length}, minmax(50px, 1fr));`}>
            <div class="application-text-meta pb-2 font-bold uppercase tracking-[0.08em] text-[#969D99]">Dia / hora</div>
            {#each traffic.hours as hour}
              <div class="application-text-meta pb-2 text-center font-semibold text-[#778079]">{hourLabel(hour)}</div>
            {/each}

            {#each traffic.days as day}
              <div class="flex min-h-9 flex-col justify-center pr-2">
                <strong class={`application-text-caption ${day.enabled ? "text-[#414A44]" : "text-[#A0A5A2]"}`}>{day.label}</strong>
                <span class="application-text-meta mt-0.5 text-[#9AA19D]">{day.enabled ? `${day.start}–${day.end}` : "sem expediente"}</span>
              </div>
              {#each day.cells as cell}
                <div
                  class={`application-text-meta flex h-9 items-center justify-center rounded-lg border font-bold transition ${trafficIntensityClass(cell.count, traffic.maxCellCount, cell.available)}`}
                  title={trafficCellTitle(day, cell)}
                  aria-label={trafficCellTitle(day, cell)}
                >
                  {#if cell.available}{cell.count}{:else}—{/if}
                </div>
              {/each}
            {/each}
          </div>
        </div>
      </div>

      <div class="mt-4 flex flex-col justify-between gap-3 border-t border-[#EEF3EF] pt-4 sm:flex-row sm:items-center">
        <div class="application-text-meta flex flex-wrap items-center gap-2 text-[#7E8781]">
          <span>Menor movimento</span>
          <span class="h-4 w-7 rounded border border-[#DFEEE3] bg-[#F1F8F3]"></span>
          <span class="h-4 w-7 rounded border border-[#CDE6D3] bg-[#DCEEE0]"></span>
          <span class="h-4 w-7 rounded border border-[#A9D8B5] bg-[#BCE1C5]"></span>
          <span class="h-4 w-7 rounded border border-[#78BD8C] bg-[#8CC99D]"></span>
          <span class="h-4 w-7 rounded border border-[#45A463] bg-[#5AAF73]"></span>
          <span class="h-4 w-7 rounded border border-[#247C43] bg-[#2F8F50]"></span>
          <span>Maior movimento</span>
        </div>
        <div class="application-text-meta text-[#727B75]">
          <strong class="font-semibold text-[#425048]">{traffic.outsideBusinessHours}</strong> atendimento(s) iniciado(s) fora do expediente no período
        </div>
      </div>

      {#if !traffic.hoursConfigured}
        <p class="application-text-meta mt-3 rounded-xl bg-[#FFF8EC] px-3 py-2 leading-4 text-[#8A642B]">O horário de atendimento ainda não está marcado como configurado. Este mapa usa a grade padrão disponível nas configurações atuais.</p>
      {/if}
      <p class="application-text-meta mt-3 leading-4 text-[#9AA09C]">A classificação usa a timezone e o horário de atendimento configurados atualmente, aplicados ao histórico selecionado. Se o expediente foi alterado durante o período, os dados anteriores também são classificados pela configuração atual.</p>
    </div>
  </section>

  <section class="mt-5 overflow-hidden rounded-[22px] border border-[#E2E5ED] bg-white">
    <div class="border-b border-[#EEF0F5] px-5 py-4 sm:px-6">
      <h2 class="text-[15px] font-semibold text-[#202637]">Por usuário</h2>
      <p class="application-text-caption mt-1 leading-5 text-[#858B99]">Sem pontuação artificial: cada coluna representa uma atividade ou indicador mensurável.</p>
    </div>

    <div class="overflow-x-auto">
      <table class="min-w-[1180px] w-full border-collapse text-left">
        <thead class="application-text-meta bg-[#FAFAFC] font-bold uppercase tracking-[0.06em] text-[#858B99]"><tr><th class="px-5 py-3">Usuário</th><th class="px-3 py-3">Tickets</th><th class="px-3 py-3">Chats</th><th class="px-3 py-3">Respostas</th><th class="px-3 py-3">Resolvidos</th><th class="px-3 py-3">Mediana</th><th class="px-3 py-3">P90</th><th class="px-3 py-3">SLA 1ª resp.</th><th class="px-3 py-3">Tarefas</th><th class="px-3 py-3">No prazo</th><th class="px-3 py-3">Atrasadas</th><th class="px-3 py-3">Remoto</th></tr></thead>
        <tbody class="divide-y divide-[#EEF0F5]">
          {#each performance.users as user}
            <tr class="application-text-caption text-[#555C6C] hover:bg-[#FAFAFC]">
              <td class="px-5 py-4"><strong class="block text-[11px] text-[#303746]">{user.name}</strong><span class="application-text-meta mt-1 block text-[#9297A4]">{user.email}</span></td>
              <td class="px-3 py-4 font-semibold">{user.handledTickets}</td>
              <td class="px-3 py-4">{user.handledChats}</td>
              <td class="px-3 py-4">{user.publicReplies}<span class="application-text-meta ml-1 text-[#9BA0AC]">+ {user.internalNotes} notas</span></td>
              <td class="px-3 py-4">{user.resolvedTickets}</td>
              <td class="px-3 py-4">{minutes(user.medianFirstHumanResponseMinutes)}</td>
              <td class="px-3 py-4">{minutes(user.p90FirstHumanResponseMinutes)}</td>
              <td class="px-3 py-4">{percent(user.firstResponseSlaPercent)}<span class="application-text-meta ml-1 text-[#9BA0AC]">({user.firstResponseSamples})</span></td>
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

  <p class="application-text-meta mt-4 leading-5 text-[#9196A3]">“Resolvidos” usa o usuário que registrou a mudança para Resolvido/Fechado. “SLA 1ª resp.” considera apenas tickets que possuem prazo de primeira resposta e atribui o resultado ao autor da primeira resposta pública humana.</p>
</ApplicationContent>