<script lang="ts">
  import { goto } from "$app/navigation";
  import {
    CalendarClock,
    Check,
    Copy,
    ExternalLink,
    Link2,
    Plus,
    Settings2,
    Trash2,
  } from "lucide-svelte";
  import ApplicationContent from "$lib/components/application/ApplicationContent.svelte";
  import type { ActionData, PageData } from "./$types";

  export let data: PageData;
  export let form: ActionData;

  const weekdayOptions = [
    { value: 1, label: "Segunda" },
    { value: 2, label: "Terça" },
    { value: 3, label: "Quarta" },
    { value: 4, label: "Quinta" },
    { value: 5, label: "Sexta" },
    { value: 6, label: "Sábado" },
    { value: 0, label: "Domingo" },
  ];

  let windows = data.windows.map((window) => ({ ...window }));
  let publicEnabled = data.profile.publicEnabled;
  let publicTitle = data.profile.publicTitle;
  let publicDescription = data.profile.publicDescription;
  let addGoogleMeet = data.profile.addGoogleMeet;
  let exceptionMode: "blocked" | "custom" = "blocked";
  let copied = false;

  $: publicUrl = data.publicPath && typeof window !== "undefined"
    ? new URL(data.publicPath, window.location.origin).toString()
    : data.publicPath;
  $: upcomingBookings = data.bookings
    .filter((booking) => booking.status === "booked" && new Date(booking.startAt).getTime() >= Date.now())
    .sort((left, right) => new Date(left.startAt).getTime() - new Date(right.startAt).getTime());

  function addWindow(): void {
    windows = [
      ...windows,
      {
        id: crypto.randomUUID(),
        weekday: 1,
        startTime: "09:00",
        endTime: "12:00",
      },
    ];
  }

  function removeWindow(id: string): void {
    windows = windows.filter((window) => window.id !== id);
  }

  function changeHost(event: Event): void {
    const userId = (event.currentTarget as HTMLSelectElement).value;
    void goto(`/app/tasks/calendar/scheduling?user=${encodeURIComponent(userId)}`);
  }

  async function copyLink(): Promise<void> {
    if (!publicUrl || !data.profile.publicEnabled) return;
    await navigator.clipboard.writeText(publicUrl);
    copied = true;
    window.setTimeout(() => (copied = false), 1600);
  }

  function formatBooking(value: string | Date): string {
    return new Intl.DateTimeFormat("pt-BR", {
      timeZone: data.profile.timeZone,
      weekday: "short",
      day: "2-digit",
      month: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(value));
  }

  function formatExceptionDate(value: string): string {
    const [year, month, day] = value.split("-").map(Number);
    return new Intl.DateTimeFormat("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    }).format(new Date(year, month - 1, day));
  }
</script>

<svelte:head><title>Minha agenda | F10 Operations</title></svelte:head>

<ApplicationContent width="wide">
  <header class="mb-5 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
    <div>
      <span class="application-text-caption font-bold uppercase tracking-[0.08em] text-[#EA6D0B]">Agendamento</span>
      <h1 class="mt-1 text-[22px] font-semibold tracking-[-0.025em] text-[#202637]">Minha agenda</h1>
    </div>
    {#if data.canChooseHost}
      <select value={data.selectedUserId} on:change={changeHost} class="h-10 rounded-xl border border-[#DDE1EA] bg-white px-3 text-[11px] font-semibold text-[#555C6D]">
        {#each data.hosts as host}<option value={host.id}>{host.name}</option>{/each}
      </select>
    {/if}
  </header>

  {#if form?.message}
    <div class={`mb-4 rounded-xl border px-4 py-3 text-[11px] font-medium ${form.success ? "border-[#B9E6C9] bg-[#F1FBF4] text-[#176B35]" : "border-[#F0C8C8] bg-[#FFF5F5] text-[#9B2C2C]"}`}>{form.message}</div>
  {/if}

  <div class="grid gap-4 xl:grid-cols-[1.15fr_0.85fr]">
    <div class="space-y-4">
      <section class="rounded-[22px] border border-[#E1E4EB] bg-white p-5 shadow-[0_8px_30px_rgba(1,13,40,0.04)] sm:p-6">
        <div class="flex items-center justify-between gap-3">
          <div class="flex items-center gap-2"><Link2 size={16} class="text-[#000A57]"/><h2 class="text-[15px] font-semibold text-[#202637]">Link da agenda</h2></div>
          <span class={`rounded-full px-2.5 py-1 text-[9px] font-semibold ${data.profile.publicEnabled ? "bg-[#EEF8F1] text-[#2F7045]" : "bg-[#F2F3F6] text-[#777E8D]"}`}>{data.profile.publicEnabled ? "Ativa" : "Inativa"}</span>
        </div>
        <div class="mt-4 flex flex-col gap-3 sm:flex-row">
          <div class="min-w-0 flex-1 truncate rounded-xl border border-[#E1E4EA] bg-[#FAFAFC] px-3 py-3 text-[11px] font-medium text-[#555D6C]">{data.publicPath || "—"}</div>
          <button type="button" on:click={copyLink} disabled={!data.publicPath || !data.profile.publicEnabled} class="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-[#000A57] px-4 text-[11px] font-semibold text-white disabled:cursor-not-allowed disabled:opacity-35">{#if copied}<Check size={14}/>Copiado{:else}<Copy size={14}/>Copiar{/if}</button>
          {#if data.publicPath && data.profile.publicEnabled}<a href={data.publicPath} target="_blank" rel="noopener noreferrer" class="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-[#DDE1EA] px-4 text-[11px] font-semibold text-[#000A57]"><ExternalLink size={14}/>Abrir</a>{/if}
        </div>
      </section>

      <section class="rounded-[22px] border border-[#E1E4EB] bg-white p-5 shadow-[0_8px_30px_rgba(1,13,40,0.04)] sm:p-6">
        <div class="flex items-center gap-2"><Settings2 size={16} class="text-[#214A9A]"/><h2 class="text-[15px] font-semibold text-[#202637]">Disponibilidade</h2></div>

        <form method="POST" action="?/saveProfile" class="mt-5 space-y-5">
          <input type="hidden" name="userId" value={data.selectedUserId}/>
          <input type="hidden" name="publicEnabled" value={publicEnabled ? "true" : "false"}/>
          <input type="hidden" name="addGoogleMeet" value={addGoogleMeet ? "true" : "false"}/>

          <div class="grid gap-3 sm:grid-cols-2">
            <label class="sm:col-span-2"><span class="application-text-caption mb-1.5 block font-semibold text-[#565D6D]">Título</span><input name="publicTitle" bind:value={publicTitle} required maxlength="180" class="h-11 w-full rounded-xl border border-[#DDE1EA] px-3 text-[12px]"/></label>
            <label class="sm:col-span-2"><span class="application-text-caption mb-1.5 block font-semibold text-[#565D6D]">Descrição</span><input name="publicDescription" bind:value={publicDescription} maxlength="1000" class="h-11 w-full rounded-xl border border-[#DDE1EA] px-3 text-[12px]"/></label>
            <label><span class="application-text-caption mb-1.5 block font-semibold text-[#565D6D]">Duração</span><input name="defaultDurationMinutes" type="number" min="15" max="240" step="5" value={data.profile.defaultDurationMinutes} required class="h-11 w-full rounded-xl border border-[#DDE1EA] px-3 text-[11px]"/></label>
            <label><span class="application-text-caption mb-1.5 block font-semibold text-[#565D6D]">Intervalo dos horários</span><input name="slotStepMinutes" type="number" min="5" max="120" step="5" value={data.profile.slotStepMinutes} required class="h-11 w-full rounded-xl border border-[#DDE1EA] px-3 text-[11px]"/></label>
            <label><span class="application-text-caption mb-1.5 block font-semibold text-[#565D6D]">Antecedência mínima</span><input name="minimumNoticeMinutes" type="number" min="0" max="43200" step="5" value={data.profile.minimumNoticeMinutes} required class="h-11 w-full rounded-xl border border-[#DDE1EA] px-3 text-[11px]"/></label>
            <label><span class="application-text-caption mb-1.5 block font-semibold text-[#565D6D]">Horizonte em dias</span><input name="maxHorizonDays" type="number" min="1" max="90" value={data.profile.maxHorizonDays} required class="h-11 w-full rounded-xl border border-[#DDE1EA] px-3 text-[11px]"/></label>
            <label><span class="application-text-caption mb-1.5 block font-semibold text-[#565D6D]">Buffer antes</span><input name="bufferBeforeMinutes" type="number" min="0" max="240" step="5" value={data.profile.bufferBeforeMinutes} required class="h-11 w-full rounded-xl border border-[#DDE1EA] px-3 text-[11px]"/></label>
            <label><span class="application-text-caption mb-1.5 block font-semibold text-[#565D6D]">Buffer depois</span><input name="bufferAfterMinutes" type="number" min="0" max="240" step="5" value={data.profile.bufferAfterMinutes} required class="h-11 w-full rounded-xl border border-[#DDE1EA] px-3 text-[11px]"/></label>
            <label class="sm:col-span-2"><span class="application-text-caption mb-1.5 block font-semibold text-[#565D6D]">Fuso horário</span><input name="timeZone" value={data.profile.timeZone} required maxlength="100" class="h-11 w-full rounded-xl border border-[#DDE1EA] px-3 text-[11px]"/></label>
          </div>

          <div>
            <div class="mb-2 flex items-center justify-between"><h3 class="text-[12px] font-semibold text-[#343B4B]">Horários semanais</h3><button type="button" on:click={addWindow} class="inline-flex h-8 items-center gap-1 rounded-lg border border-[#DDE1EA] px-2.5 text-[9px] font-semibold text-[#000A57]"><Plus size={12}/>Adicionar</button></div>
            <div class="space-y-2">
              {#each windows as window (window.id)}
                <div class="grid grid-cols-[1fr_105px_105px_34px] gap-2">
                  <select name="windowWeekday" bind:value={window.weekday} class="h-10 min-w-0 rounded-lg border border-[#DDE1EA] bg-white px-2 text-[10px]">{#each weekdayOptions as weekday}<option value={weekday.value}>{weekday.label}</option>{/each}</select>
                  <input name="windowStart" type="time" bind:value={window.startTime} required class="h-10 rounded-lg border border-[#DDE1EA] px-2 text-[10px]"/>
                  <input name="windowEnd" type="time" bind:value={window.endTime} required class="h-10 rounded-lg border border-[#DDE1EA] px-2 text-[10px]"/>
                  <button type="button" on:click={() => removeWindow(window.id)} class="flex h-10 items-center justify-center rounded-lg border border-[#E3E5EA] text-[#8A5961]" aria-label="Remover horário"><Trash2 size={13}/></button>
                </div>
              {/each}
            </div>
          </div>

          <div class="flex flex-wrap gap-3">
            <label class="inline-flex items-center gap-2 text-[10px] font-semibold text-[#565D6D]"><input type="checkbox" bind:checked={publicEnabled}/>Agenda ativa</label>
            <label class="inline-flex items-center gap-2 text-[10px] font-semibold text-[#565D6D]"><input type="checkbox" bind:checked={addGoogleMeet}/>Google Meet</label>
          </div>

          {#if !data.googleConnected}<div class="rounded-xl border border-[#F0D6BD] bg-[#FFF9F3] px-3 py-2 text-[10px] font-medium text-[#935018]">Google Calendar desconectado.</div>{/if}

          <div class="flex justify-end"><button type="submit" class="h-11 rounded-xl bg-[#000A57] px-5 text-[11px] font-semibold text-white">Salvar agenda</button></div>
        </form>
      </section>

      <section class="rounded-[22px] border border-[#E1E4EB] bg-white p-5 sm:p-6">
        <h2 class="text-[15px] font-semibold text-[#202637]">Exceções</h2>
        <form method="POST" action="?/addException" class="mt-4 grid gap-2 sm:grid-cols-[150px_160px_1fr_1fr_auto]">
          <input type="hidden" name="userId" value={data.selectedUserId}/>
          <input type="date" name="exceptionDate" required class="h-10 rounded-lg border border-[#DDE1EA] px-2 text-[10px]"/>
          <select bind:value={exceptionMode} class="h-10 rounded-lg border border-[#DDE1EA] bg-white px-2 text-[10px]">
            <option value="blocked">Indisponível</option>
            <option value="custom">Horário especial</option>
          </select>
          <input type="hidden" name="available" value={exceptionMode === "custom" ? "true" : "false"}/>
          <input name="startTime" type="time" disabled={exceptionMode !== "custom"} required={exceptionMode === "custom"} class="h-10 rounded-lg border border-[#DDE1EA] px-2 text-[10px] disabled:bg-[#F5F6F8]"/>
          <input name="endTime" type="time" disabled={exceptionMode !== "custom"} required={exceptionMode === "custom"} class="h-10 rounded-lg border border-[#DDE1EA] px-2 text-[10px] disabled:bg-[#F5F6F8]"/>
          <button type="submit" class="h-10 rounded-lg border border-[#C9D0E0] px-3 text-[10px] font-semibold text-[#000A57]">Adicionar</button>
        </form>

        {#if data.exceptions.length > 0}
          <div class="mt-4 divide-y divide-[#EEF0F4]">
            {#each data.exceptions as exception}
              <div class="flex items-center justify-between gap-3 py-2.5 text-[10px]">
                <span class="font-semibold text-[#4D5565]">{formatExceptionDate(exception.exceptionDate)} · {exception.available ? `${exception.startTime}–${exception.endTime}` : "Indisponível"}</span>
                <form method="POST" action="?/deleteException"><input type="hidden" name="userId" value={data.selectedUserId}/><input type="hidden" name="exceptionId" value={exception.id}/><button type="submit" class="text-[#9B4752]"><Trash2 size={13}/></button></form>
              </div>
            {/each}
          </div>
        {/if}
      </section>
    </div>

    <div class="space-y-4">
      <section class="rounded-[22px] border border-[#E1E4EB] bg-white p-5 sm:p-6">
        <h2 class="text-[15px] font-semibold text-[#202637]">Calendários que bloqueiam</h2>
        <form method="POST" action="?/saveBlockingCalendars" class="mt-4">
          <input type="hidden" name="userId" value={data.selectedUserId}/>
          <div class="space-y-2">
            {#each data.sources as source}
              <label class="flex items-center justify-between gap-3 rounded-xl border border-[#E7E9EF] px-3 py-3 text-[10px] font-semibold text-[#555D6C]">
                <span class="truncate">{source.calendarName || source.calendarId}{source.isPrimary ? " · principal" : ""}</span>
                <input type="checkbox" name="calendarId" value={source.calendarId} checked={source.blocksScheduling}/>
              </label>
            {/each}
          </div>
          <div class="mt-4 flex justify-end"><button type="submit" class="h-10 rounded-xl border border-[#C9D0E0] px-4 text-[10px] font-semibold text-[#000A57]">Salvar</button></div>
        </form>
      </section>

      <section class="rounded-[22px] border border-[#E1E4EB] bg-white">
        <header class="border-b border-[#E8EAF0] px-5 py-4"><div class="flex items-center gap-2"><CalendarClock size={15} class="text-[#EA6D0B]"/><h2 class="text-[14px] font-semibold text-[#202637]">Próximos agendamentos</h2></div></header>
        {#if upcomingBookings.length === 0}
          <div class="px-5 py-10 text-center text-[10px] text-[#9298A5]">Nenhum agendamento.</div>
        {:else}
          <div class="divide-y divide-[#EEF0F4]">
            {#each upcomingBookings as booking}
              <article class="px-5 py-4">
                <div class="flex items-start justify-between gap-3"><div class="min-w-0"><h3 class="truncate text-[12px] font-semibold text-[#303747]">{booking.customerName}</h3><p class="mt-1 text-[10px] font-medium text-[#707787]">{formatBooking(booking.startAt)}</p></div>{#if booking.googleMeetUrl}<a href={booking.googleMeetUrl} target="_blank" rel="noopener noreferrer" class="text-[9px] font-semibold text-[#214A9A]">Meet</a>{/if}</div>
                {#if booking.notes}<p class="mt-2 line-clamp-2 text-[10px] leading-5 text-[#7A808E]">{booking.notes}</p>{/if}
              </article>
            {/each}
          </div>
        {/if}
      </section>
    </div>
  </div>
</ApplicationContent>
