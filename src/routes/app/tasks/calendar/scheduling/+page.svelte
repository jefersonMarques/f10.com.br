<script lang="ts">
  import { onMount } from "svelte";
  import {
    CalendarClock,
    Check,
    Clock3,
    Copy,
    Link2,
    Settings2,
    ShieldCheck,
    Video,
  } from "lucide-svelte";
  import type { ActionData, PageData } from "./$types";

  export let data: PageData;
  export let form: ActionData;

  const weekdayOptions = [
    { value: 1, label: "Seg" },
    { value: 2, label: "Ter" },
    { value: 3, label: "Qua" },
    { value: 4, label: "Qui" },
    { value: 5, label: "Sex" },
    { value: 6, label: "Sáb" },
    { value: 0, label: "Dom" },
  ];

  let invitationHostId = data.hosts.find((host) => host.id === data.currentUserId)?.id ?? data.hosts[0]?.id ?? "";
  let availabilityHostId = invitationHostId;
  let availabilityTimeZone = "America/Sao_Paulo";
  let availabilityWeekdays: number[] = [1, 2, 3, 4, 5];
  let availabilityStartTime = "08:00";
  let availabilityEndTime = "18:00";
  let slotStepMinutes = 30;
  let minimumNoticeMinutes = 120;
  let bufferBeforeMinutes = 0;
  let bufferAfterMinutes = 0;
  let maxHorizonDays = 30;
  let defaultDurationMinutes = 30;
  let durationMinutes = 30;
  let dateRangeStart = "";
  let dateRangeEnd = "";
  let copied = false;

  $: actionResult = form as (ActionData & { bookingPath?: string }) | undefined;
  $: bookingPath = actionResult?.bookingPath ?? "";
  $: selectedInvitationHost = data.hosts.find((host) => host.id === invitationHostId) ?? null;

  function localDateKey(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }

  function addDays(date: Date, days: number): Date {
    const next = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    next.setDate(next.getDate() + days);
    return next;
  }

  function applyAvailabilityProfile(hostId: string): void {
    const host = data.hosts.find((item) => item.id === hostId);
    if (!host) return;
    availabilityTimeZone = host.profile.timeZone;
    availabilityWeekdays = [...host.profile.weekdays];
    availabilityStartTime = host.profile.startTime;
    availabilityEndTime = host.profile.endTime;
    slotStepMinutes = host.profile.slotStepMinutes;
    minimumNoticeMinutes = host.profile.minimumNoticeMinutes;
    bufferBeforeMinutes = host.profile.bufferBeforeMinutes;
    bufferAfterMinutes = host.profile.bufferAfterMinutes;
    maxHorizonDays = host.profile.maxHorizonDays;
    defaultDurationMinutes = host.profile.defaultDurationMinutes;
    if (!durationMinutes) durationMinutes = host.profile.defaultDurationMinutes;
  }

  function handleAvailabilityHostChange(event: Event): void {
    availabilityHostId = (event.currentTarget as HTMLSelectElement).value;
    applyAvailabilityProfile(availabilityHostId);
  }

  function handleInvitationHostChange(event: Event): void {
    invitationHostId = (event.currentTarget as HTMLSelectElement).value;
    const host = data.hosts.find((item) => item.id === invitationHostId);
    if (host) durationMinutes = host.profile.defaultDurationMinutes;
  }

  async function copyGeneratedLink(): Promise<void> {
    if (!bookingPath) return;
    const absoluteUrl = new URL(bookingPath, window.location.origin).toString();
    await navigator.clipboard.writeText(absoluteUrl);
    copied = true;
    window.setTimeout(() => (copied = false), 1800);
  }

  function formatDateTime(value: string | Date | null, timeZone: string): string {
    if (!value) return "—";
    return new Intl.DateTimeFormat("pt-BR", {
      timeZone,
      dateStyle: "short",
      timeStyle: "short",
    }).format(new Date(value));
  }

  function statusLabel(status: string): string {
    const labels: Record<string, string> = {
      draft: "Rascunho",
      sent: "Gerado",
      opened: "Aberto pelo cliente",
      booking: "Confirmando",
      booked: "Agendado",
      expired: "Expirado",
      revoked: "Revogado",
      cancelled: "Cancelado",
    };
    return labels[status] ?? status;
  }

  function statusClass(status: string): string {
    if (status === "booked") return "border-[#B9E6C9] bg-[#F1FBF4] text-[#176B35]";
    if (status === "opened" || status === "sent") return "border-[#D7DCF2] bg-[#F5F6FF] text-[#000A57]";
    if (status === "booking") return "border-[#F0D6BD] bg-[#FFF9F3] text-[#935018]";
    return "border-[#E1E4EA] bg-[#F7F8FA] text-[#737988]";
  }

  onMount(() => {
    const today = new Date();
    if (!dateRangeStart) dateRangeStart = localDateKey(today);
    if (!dateRangeEnd) dateRangeEnd = localDateKey(addDays(today, 14));
    applyAvailabilityProfile(availabilityHostId);
    if (selectedInvitationHost) durationMinutes = selectedInvitationHost.profile.defaultDurationMinutes;
  });
</script>

<svelte:head><title>Links de agendamento | F10 Operations</title></svelte:head>

<div class="mx-auto max-w-[1560px] px-5 py-7 sm:px-8 sm:py-9">
  <header class="flex flex-col justify-between gap-5 xl:flex-row xl:items-end">
    <div>
      <p class="text-[11px] font-bold uppercase tracking-[0.14em] text-[#EA6D0B]">Calendário</p>
      <h1 class="mt-2 text-[30px] font-semibold tracking-[-0.035em] text-[#010D28] sm:text-[38px]">Links de agendamento</h1>
      <p class="mt-2 max-w-[820px] text-[14px] leading-6 text-[#6F7585]">O cliente escolhe um horário dentro da disponibilidade real do responsável. O evento é confirmado na agenda Google do host.</p>
    </div>
    <div class="inline-flex items-center gap-2 rounded-xl border border-[#DDE3F1] bg-[#F8FAFF] px-4 py-3 text-[10px] font-medium text-[#526077]">
      <ShieldCheck size={16} class="text-[#214A9A]"/>
      Token bruto só aparece no link gerado; a base guarda apenas o hash.
    </div>
  </header>

  {#if form?.message}
    <div class={`mt-5 rounded-xl border px-4 py-3 text-[11px] font-medium ${form.success ? "border-[#B9E6C9] bg-[#F1FBF4] text-[#176B35]" : "border-[#F0C8C8] bg-[#FFF5F5] text-[#9B2C2C]"}`}>{form.message}</div>
  {/if}

  {#if bookingPath}
    <section class="mt-5 rounded-[20px] border border-[#B9E6C9] bg-[#F5FCF7] p-5">
      <div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div class="min-w-0">
          <span class="inline-flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.08em] text-[#176B35]"><Link2 size={14}/>Link pronto</span>
          <p class="mt-2 break-all text-[11px] font-medium text-[#31583E]">{bookingPath}</p>
          <p class="mt-1 text-[9px] text-[#6D8374]">Este é o único momento em que o token bruto é retornado pelo servidor.</p>
        </div>
        <button type="button" on:click={copyGeneratedLink} class="inline-flex h-11 shrink-0 items-center justify-center gap-2 rounded-xl bg-[#176B35] px-4 text-[11px] font-semibold text-white">
          {#if copied}<Check size={15}/>Copiado{:else}<Copy size={15}/>Copiar link{/if}
        </button>
      </div>
    </section>
  {/if}

  <div class="mt-7 grid gap-6 2xl:grid-cols-[1.08fr_0.92fr]">
    <div class="space-y-6">
      {#if data.canCreate}
        <section class="rounded-[24px] border border-[#E1E4EB] bg-white p-5 shadow-[0_8px_30px_rgba(1,13,40,0.04)] sm:p-6">
          <div class="flex items-start justify-between gap-4">
            <div><span class="inline-flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.08em] text-[#EA6D0B]"><CalendarClock size={15}/>Novo convite</span><h2 class="mt-2 text-[18px] font-semibold text-[#202637]">Criar link de agendamento</h2></div>
          </div>

          <form method="POST" action="?/createInvitation" class="mt-5 grid gap-4 sm:grid-cols-2">
            <label class="block sm:col-span-2"><span class="mb-1.5 block text-[10px] font-semibold text-[#565D6D]">Cliente</span><select name="customerContactId" required class="h-11 w-full rounded-xl border border-[#DDE1EA] bg-white px-3 text-[11px] outline-none focus:border-[#000A57]"><option value="">Selecione...</option>{#each data.customers as customer}<option value={customer.id}>{customer.name}{customer.organizationName ? ` · ${customer.organizationName}` : ""} · {customer.email}</option>{/each}</select></label>
            <label class="block sm:col-span-2"><span class="mb-1.5 block text-[10px] font-semibold text-[#565D6D]">Título</span><input name="title" required minlength="3" maxlength="180" placeholder="Ex.: Reunião de implantação" class="h-11 w-full rounded-xl border border-[#DDE1EA] px-3 text-[12px] outline-none focus:border-[#000A57]"/></label>
            <label class="block"><span class="mb-1.5 block text-[10px] font-semibold text-[#565D6D]">Responsável</span><select name="hostUserId" bind:value={invitationHostId} on:change={handleInvitationHostChange} required class="h-11 w-full rounded-xl border border-[#DDE1EA] bg-white px-3 text-[11px] outline-none focus:border-[#000A57]">{#each data.hosts as host}<option value={host.id} disabled={!host.googleConnected}>{host.name}{host.googleConnected ? "" : " · Google desconectado"}</option>{/each}</select></label>
            <label class="block"><span class="mb-1.5 block text-[10px] font-semibold text-[#565D6D]">Duração</span><select name="durationMinutes" bind:value={durationMinutes} class="h-11 w-full rounded-xl border border-[#DDE1EA] bg-white px-3 text-[11px]"><option value={15}>15 min</option><option value={30}>30 min</option><option value={45}>45 min</option><option value={60}>60 min</option><option value={90}>90 min</option><option value={120}>120 min</option></select></label>
            <label class="block"><span class="mb-1.5 block text-[10px] font-semibold text-[#565D6D]">Primeiro dia</span><input name="dateRangeStart" type="date" bind:value={dateRangeStart} required class="h-11 w-full rounded-xl border border-[#DDE1EA] px-3 text-[11px]"/></label>
            <label class="block"><span class="mb-1.5 block text-[10px] font-semibold text-[#565D6D]">Último dia</span><input name="dateRangeEnd" type="date" bind:value={dateRangeEnd} required class="h-11 w-full rounded-xl border border-[#DDE1EA] px-3 text-[11px]"/></label>
            <label class="flex cursor-pointer items-start gap-3 rounded-xl border border-[#DDE3F1] bg-[#F8FAFF] px-3 py-3 sm:col-span-2"><input type="checkbox" name="addGoogleMeet" value="true" class="mt-0.5"/><span><strong class="inline-flex items-center gap-1.5 text-[10px] font-semibold text-[#214A9A]"><Video size={14}/>Gerar Google Meet</strong><span class="mt-0.5 block text-[8px] leading-4 text-[#7D8797]">O cliente será incluído como participante externo e receberá o convite pelo Google ao confirmar.</span></span></label>
            {#if selectedInvitationHost && !selectedInvitationHost.googleConnected}<div class="rounded-xl border border-[#F0D6BD] bg-[#FFF9F3] px-3 py-2 text-[9px] text-[#935018] sm:col-span-2">Este responsável precisa conectar o Google Calendar antes de receber agendamentos.</div>{/if}
            <div class="flex items-center justify-end sm:col-span-2"><button type="submit" disabled={!selectedInvitationHost?.googleConnected} class="inline-flex h-11 items-center gap-2 rounded-xl bg-[#000A57] px-5 text-[11px] font-semibold text-white disabled:cursor-not-allowed disabled:opacity-40"><Link2 size={15}/>Gerar link</button></div>
          </form>
        </section>
      {:else}
        <section class="rounded-[20px] border border-[#E1E4EA] bg-[#FAFAFC] p-5 text-[11px] text-[#666D7C]">Sua permissão permite visualizar agendamentos, mas não criar novos links ou acessar clientes.</section>
      {/if}

      {#if data.canConfigure}
        <section class="rounded-[24px] border border-[#E1E4EB] bg-white p-5 shadow-[0_8px_30px_rgba(1,13,40,0.04)] sm:p-6">
          <span class="inline-flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.08em] text-[#214A9A]"><Settings2 size={15}/>Disponibilidade de trabalho</span>
          <h2 class="mt-2 text-[18px] font-semibold text-[#202637]">Quando o cliente pode agendar</h2>
          <p class="mt-1 text-[10px] leading-5 text-[#7A808E]">Horário de trabalho é aplicado antes dos conflitos do Google. Perfil padrão: segunda a sexta, 08:00–18:00, 2h de antecedência e slots de 30 min.</p>

          <form method="POST" action="?/saveAvailability" class="mt-5 grid gap-4 sm:grid-cols-2">
            <label class="block sm:col-span-2"><span class="mb-1.5 block text-[10px] font-semibold text-[#565D6D]">Responsável</span><select name="hostUserId" bind:value={availabilityHostId} on:change={handleAvailabilityHostChange} required class="h-11 w-full rounded-xl border border-[#DDE1EA] bg-white px-3 text-[11px]">{#each data.hosts as host}<option value={host.id}>{host.name} · {host.profile.source === "user" ? "perfil próprio" : "padrão F10"}</option>{/each}</select></label>
            <label class="block sm:col-span-2"><span class="mb-1.5 block text-[10px] font-semibold text-[#565D6D]">Fuso horário IANA</span><input name="timeZone" bind:value={availabilityTimeZone} required maxlength="100" class="h-11 w-full rounded-xl border border-[#DDE1EA] px-3 text-[11px]"/></label>
            <fieldset class="sm:col-span-2"><legend class="mb-2 text-[10px] font-semibold text-[#565D6D]">Dias de atendimento</legend><div class="flex flex-wrap gap-2">{#each weekdayOptions as weekday}<label class="inline-flex h-9 cursor-pointer items-center gap-2 rounded-lg border border-[#E0E3EA] px-3 text-[9px] font-semibold text-[#626979]"><input type="checkbox" name="weekday" value={weekday.value} bind:group={availabilityWeekdays}/>{weekday.label}</label>{/each}</div></fieldset>
            <label class="block"><span class="mb-1.5 block text-[10px] font-semibold text-[#565D6D]">Início</span><input name="startTime" type="time" bind:value={availabilityStartTime} required class="h-11 w-full rounded-xl border border-[#DDE1EA] px-3 text-[11px]"/></label>
            <label class="block"><span class="mb-1.5 block text-[10px] font-semibold text-[#565D6D]">Fim</span><input name="endTime" type="time" bind:value={availabilityEndTime} required class="h-11 w-full rounded-xl border border-[#DDE1EA] px-3 text-[11px]"/></label>
            <label class="block"><span class="mb-1.5 block text-[10px] font-semibold text-[#565D6D]">Passo dos slots (min)</span><input name="slotStepMinutes" type="number" min="5" max="120" step="5" bind:value={slotStepMinutes} required class="h-11 w-full rounded-xl border border-[#DDE1EA] px-3 text-[11px]"/></label>
            <label class="block"><span class="mb-1.5 block text-[10px] font-semibold text-[#565D6D]">Antecedência mínima (min)</span><input name="minimumNoticeMinutes" type="number" min="0" max="43200" step="5" bind:value={minimumNoticeMinutes} required class="h-11 w-full rounded-xl border border-[#DDE1EA] px-3 text-[11px]"/></label>
            <label class="block"><span class="mb-1.5 block text-[10px] font-semibold text-[#565D6D]">Buffer antes (min)</span><input name="bufferBeforeMinutes" type="number" min="0" max="240" step="5" bind:value={bufferBeforeMinutes} required class="h-11 w-full rounded-xl border border-[#DDE1EA] px-3 text-[11px]"/></label>
            <label class="block"><span class="mb-1.5 block text-[10px] font-semibold text-[#565D6D]">Buffer depois (min)</span><input name="bufferAfterMinutes" type="number" min="0" max="240" step="5" bind:value={bufferAfterMinutes} required class="h-11 w-full rounded-xl border border-[#DDE1EA] px-3 text-[11px]"/></label>
            <label class="block"><span class="mb-1.5 block text-[10px] font-semibold text-[#565D6D]">Horizonte máximo (dias)</span><input name="maxHorizonDays" type="number" min="1" max="90" bind:value={maxHorizonDays} required class="h-11 w-full rounded-xl border border-[#DDE1EA] px-3 text-[11px]"/></label>
            <label class="block"><span class="mb-1.5 block text-[10px] font-semibold text-[#565D6D]">Duração padrão (min)</span><input name="defaultDurationMinutes" type="number" min="15" max="240" step="5" bind:value={defaultDurationMinutes} required class="h-11 w-full rounded-xl border border-[#DDE1EA] px-3 text-[11px]"/></label>
            <div class="flex items-center justify-end sm:col-span-2"><button type="submit" class="inline-flex h-11 items-center gap-2 rounded-xl border border-[#C9D0E0] bg-white px-5 text-[11px] font-semibold text-[#000A57]"><Settings2 size={15}/>Salvar disponibilidade</button></div>
          </form>
        </section>
      {/if}
    </div>

    <section class="h-fit rounded-[24px] border border-[#E1E4EB] bg-white shadow-[0_8px_30px_rgba(1,13,40,0.04)]">
      <header class="border-b border-[#E8EAF0] px-5 py-4"><span class="inline-flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.08em] text-[#5C6475]"><Clock3 size={14}/>Convites recentes</span><p class="mt-1 text-[9px] text-[#8A909E]">O token não é recuperável daqui; somente o estado e o agendamento confirmado ficam persistidos.</p></header>
      {#if data.invitations.length === 0}
        <div class="px-5 py-12 text-center text-[10px] text-[#969BA7]">Nenhum convite de agendamento no seu escopo.</div>
      {:else}
        <div class="divide-y divide-[#EEF0F4]">
          {#each data.invitations as invitation}
            <article class="p-5">
              <div class="flex items-start justify-between gap-3"><div class="min-w-0"><h3 class="truncate text-[13px] font-semibold text-[#202637]">{invitation.title}</h3><p class="mt-1 truncate text-[9px] text-[#7A808E]">{invitation.customerName} · {invitation.hostName}</p></div><span class={`shrink-0 rounded-full border px-2.5 py-1 text-[8px] font-bold ${statusClass(invitation.status)}`}>{statusLabel(invitation.status)}</span></div>
              <div class="mt-3 grid grid-cols-2 gap-2 text-[9px] text-[#6C7382]"><span>{invitation.durationMinutes} min · {invitation.timeZone}</span><span class="text-right">{invitation.dateRangeStart.split("-").reverse().join("/")} – {invitation.dateRangeEnd.split("-").reverse().join("/")}</span></div>
              {#if invitation.status === "booked"}
                <div class="mt-3 rounded-lg border border-[#D9EADD] bg-[#F7FBF8] px-3 py-2 text-[9px] text-[#31583E]"><strong>Confirmado:</strong> {formatDateTime(invitation.selectedStartAt, invitation.timeZone)}{#if invitation.googleMeetUrl} · <a href={invitation.googleMeetUrl} target="_blank" rel="noopener noreferrer" class="font-semibold underline">Google Meet</a>{/if}</div>
              {/if}
              {#if data.canChangeInvitations && ["draft", "sent", "opened"].includes(invitation.status)}
                <form method="POST" action="?/revokeInvitation" class="mt-3 flex justify-end"><input type="hidden" name="invitationId" value={invitation.id}/><button type="submit" class="h-8 rounded-lg border border-[#E1E4EA] px-3 text-[9px] font-semibold text-[#7B4650]">Revogar link</button></form>
              {/if}
            </article>
          {/each}
        </div>
      {/if}
    </section>
  </div>
</div>
