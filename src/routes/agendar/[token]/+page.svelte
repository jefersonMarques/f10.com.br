<script lang="ts">
  import {
    CalendarCheck2,
    CalendarDays,
    ChevronLeft,
    ChevronRight,
    Clock3,
    Video,
  } from "lucide-svelte";
  import CustomerPortalNavigation from "$lib/components/customerPortal/CustomerPortalNavigation.svelte";
  import type { PageData } from "./$types";

  export let data: PageData;

  type Slot = PageData["slots"][number];
  type BookingResult = {
    hostName: string;
    title: string;
    timeZone: string;
    startAt: string;
    endAt: string;
    googleMeetUrl: string | null;
    calendarFilePath?: string;
    confirmationEmailSent?: boolean;
  };

  const DATES_PER_PAGE = 7;

  let selectedDate = "";
  let selectedStartAt = "";
  let notes = "";
  let datePageIndex = 0;
  let bookingSubmitting = false;
  let bookingError = "";
  let bookingResult: BookingResult | null = null;

  $: dates = Array.from(new Set(data.slots.map((slot) => slot.date)));
  $: if (dates.length > 0 && !dates.includes(selectedDate)) selectedDate = dates[0] ?? "";
  $: datePageCount = Math.max(1, Math.ceil(dates.length / DATES_PER_PAGE));
  $: visibleDates = dates.slice(
    datePageIndex * DATES_PER_PAGE,
    datePageIndex * DATES_PER_PAGE + DATES_PER_PAGE,
  );
  $: selectedSlot = data.slots.find((slot) => slot.startAt === selectedStartAt) ?? null;
  $: timeZone = data.mode === "personal" ? data.schedule.timeZone : data.invitation.timeZone;

  function slotsForDate(date: string): Slot[] {
    return data.slots.filter((slot) => slot.date === date);
  }

  function formatDate(date: string): string {
    const [year, month, day] = date.split("-").map(Number);
    return new Intl.DateTimeFormat("pt-BR", {
      weekday: "long",
      day: "2-digit",
      month: "long",
      timeZone: "UTC",
    }).format(new Date(Date.UTC(year, month - 1, day, 12, 0, 0)));
  }

  function formatWeekday(date: string): string {
    const [year, month, day] = date.split("-").map(Number);
    return new Intl.DateTimeFormat("pt-BR", {
      weekday: "short",
      timeZone: "UTC",
    }).format(new Date(Date.UTC(year, month - 1, day, 12, 0, 0))).replace(".", "");
  }

  function formatDay(date: string): string {
    return date.slice(8, 10);
  }

  function formatMonth(date: string): string {
    const [year, month, day] = date.split("-").map(Number);
    return new Intl.DateTimeFormat("pt-BR", {
      month: "short",
      timeZone: "UTC",
    }).format(new Date(Date.UTC(year, month - 1, day, 12, 0, 0))).replace(".", "");
  }

  function formatMonthTitle(date: string): string {
    if (!date) return "Horários";
    const [year, month, day] = date.split("-").map(Number);
    return new Intl.DateTimeFormat("pt-BR", {
      month: "long",
      year: "numeric",
      timeZone: "UTC",
    }).format(new Date(Date.UTC(year, month - 1, day, 12, 0, 0)));
  }

  function formatDateTime(value: string | null, zone = timeZone): string {
    if (!value) return "";
    return new Intl.DateTimeFormat("pt-BR", {
      timeZone: zone,
      weekday: "long",
      day: "2-digit",
      month: "long",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(value));
  }

  function selectDate(date: string): void {
    selectedDate = date;
    selectedStartAt = "";
    bookingError = "";
  }

  function changeDatePage(direction: -1 | 1): void {
    const nextPage = Math.min(
      Math.max(datePageIndex + direction, 0),
      datePageCount - 1,
    );
    if (nextPage === datePageIndex) return;
    datePageIndex = nextPage;
    const firstDate = dates[nextPage * DATES_PER_PAGE] ?? "";
    if (firstDate) selectDate(firstDate);
  }

  async function confirmPersonalBooking(): Promise<void> {
    if (data.mode !== "personal" || !selectedStartAt || bookingSubmitting) return;
    bookingSubmitting = true;
    bookingError = "";
    try {
      const response = await fetch(`${window.location.pathname}/book`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ startAt: selectedStartAt, notes }),
      });
      const payload = await response.json() as {
        success: boolean;
        message?: string;
        booking?: BookingResult;
      };
      if (!response.ok || !payload.success || !payload.booking) {
        bookingError = payload.message || "Não foi possível confirmar o agendamento.";
        return;
      }
      bookingResult = payload.booking;
    } catch {
      bookingError = "Não foi possível confirmar o agendamento.";
    } finally {
      bookingSubmitting = false;
    }
  }

  async function confirmLegacyBooking(startAt: string): Promise<void> {
    if (bookingSubmitting) return;
    bookingSubmitting = true;
    bookingError = "";
    try {
      const response = await fetch(`${window.location.pathname}/book`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ startAt }),
      });
      const payload = await response.json() as {
        success: boolean;
        message?: string;
        booking?: BookingResult;
      };
      if (!response.ok || !payload.success || !payload.booking) {
        bookingError = payload.message || "Não foi possível confirmar o agendamento.";
        return;
      }
      bookingResult = payload.booking;
    } catch {
      bookingError = "Não foi possível confirmar o agendamento.";
    } finally {
      bookingSubmitting = false;
    }
  }
</script>

<svelte:head>
  <title>{data.mode === "personal" ? data.schedule.title : data.invitation.title} | Agendamento F10</title>
  <meta name="robots" content="noindex,nofollow,noarchive"/>
  <meta name="referrer" content="no-referrer"/>
</svelte:head>

{#if data.mode === "personal"}
  <CustomerPortalNavigation />
{/if}

<div class="min-h-[calc(100dvh-56px)] bg-[#F5F6F8] px-4 py-6 sm:py-8">
  <main class="mx-auto w-full max-w-[900px]">
    {#if data.mode === "personal"}
      <header class="rounded-[24px] border border-[#E0E3EA] bg-white p-5 shadow-[0_12px_40px_rgba(1,13,40,0.06)] sm:p-6">
        <div class="flex flex-wrap items-start justify-between gap-4">
          <div>
            <span class="text-[10px] font-bold uppercase tracking-[0.12em] text-[#EA6D0B]">Agendamento</span>
            <h1 class="mt-2 text-[24px] font-semibold tracking-[-0.035em] text-[#010D28] sm:text-[30px]">{data.schedule.title}</h1>
            <p class="mt-1 text-[12px] text-[#6F7585]">Com <strong class="font-semibold text-[#343B4A]">{data.schedule.hostName}</strong></p>
          </div>
          <div class="flex flex-wrap gap-2 text-[10px] font-medium text-[#626978]">
            <span class="inline-flex items-center gap-1.5 rounded-lg bg-[#F3F4F7] px-3 py-2"><Clock3 size={13}/>{data.schedule.durationMinutes} min</span>
            {#if data.schedule.addGoogleMeet}<span class="inline-flex items-center gap-1.5 rounded-lg bg-[#EEF3FF] px-3 py-2 text-[#214A9A]"><Video size={13}/>Google Meet</span>{/if}
          </div>
        </div>
        {#if data.schedule.description}<p class="mt-3 max-w-[700px] text-[11px] leading-5 text-[#737A89]">{data.schedule.description}</p>{/if}
      </header>

      {#if bookingResult}
        <section class="mt-4 rounded-[24px] border border-[#B9E6C9] bg-white p-6 text-center shadow-[0_12px_40px_rgba(1,13,40,0.05)]">
          <div class="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-[#EDF9F1] text-[#176B35]"><CalendarCheck2 size={24}/></div>
          <h2 class="mt-3 text-[19px] font-semibold text-[#202637]">Agendamento confirmado</h2>
          <p class="mt-2 capitalize text-[12px] leading-6 text-[#5F6776]">{formatDateTime(bookingResult.startAt, bookingResult.timeZone)}</p>
          {#if bookingResult.confirmationEmailSent}
            <p class="mt-1 text-[10px] text-[#6F7786]">Confirmação enviada para {data.customer.email}.</p>
          {:else}
            <p class="mt-2 text-[10px] font-medium text-[#9A541A]">O agendamento foi salvo, mas o e-mail de confirmação não pôde ser enviado.</p>
          {/if}
          <div class="mt-5 flex flex-wrap justify-center gap-2">
            {#if bookingResult.googleMeetUrl}<a href={bookingResult.googleMeetUrl} target="_blank" rel="noopener noreferrer" class="inline-flex h-11 items-center gap-2 rounded-xl bg-[#214A9A] px-5 text-[11px] font-semibold text-white"><Video size={15}/>Abrir Google Meet</a>{/if}
            {#if bookingResult.calendarFilePath}<a href={bookingResult.calendarFilePath} class="inline-flex h-11 items-center gap-2 rounded-xl border border-[#D7DCE7] bg-white px-5 text-[11px] font-semibold text-[#000A57]"><CalendarDays size={15}/>Adicionar à agenda</a>{/if}
          </div>
        </section>
      {:else}
        <section class="mt-4 rounded-[24px] border border-[#E0E3EA] bg-white p-5 shadow-[0_12px_40px_rgba(1,13,40,0.05)] sm:p-6">
          <h2 class="text-[17px] font-semibold text-[#202637]">Escolha data e hora</h2>

          {#if data.availabilityUnavailable}
            <div class="mt-4 rounded-xl border border-[#F0D6BD] bg-[#FFF9F3] px-4 py-4 text-[10px] text-[#935018]">Agenda indisponível no momento.</div>
          {:else if dates.length === 0}
            <div class="mt-4 rounded-xl border border-[#E4E6EC] bg-[#FAFAFC] px-4 py-8 text-center text-[10px] text-[#858B99]">Nenhum horário disponível.</div>
          {:else}
            <div class="mt-5 grid gap-5 lg:grid-cols-[1fr_310px]">
              <div>
                <div class="flex items-center justify-between gap-3">
                  <button type="button" on:click={() => changeDatePage(-1)} disabled={datePageIndex === 0} class="flex h-9 w-9 items-center justify-center rounded-lg border border-[#E0E3EA] text-[#555D6D] disabled:opacity-30" aria-label="Datas anteriores"><ChevronLeft size={16}/></button>
                  <strong class="capitalize text-[12px] font-semibold text-[#404756]">{formatMonthTitle(visibleDates[0] ?? selectedDate)}</strong>
                  <button type="button" on:click={() => changeDatePage(1)} disabled={datePageIndex >= datePageCount - 1} class="flex h-9 w-9 items-center justify-center rounded-lg border border-[#E0E3EA] text-[#555D6D] disabled:opacity-30" aria-label="Próximas datas"><ChevronRight size={16}/></button>
                </div>

                <div class="mt-3 grid grid-cols-4 gap-2 sm:grid-cols-7">
                  {#each visibleDates as date}
                    <button type="button" on:click={() => selectDate(date)} class={`min-h-[68px] rounded-xl border px-2 py-2 text-center transition ${selectedDate === date ? "border-[#000A57] bg-[#000A57] text-white" : "border-[#E0E3EA] bg-white text-[#555D6D] hover:border-[#9EA6BC]"}`}>
                      <span class="block text-[9px] font-semibold capitalize opacity-75">{formatWeekday(date)}</span>
                      <strong class="mt-1 block text-[17px] leading-none">{formatDay(date)}</strong>
                      <span class="mt-1 block text-[9px] capitalize opacity-75">{formatMonth(date)}</span>
                    </button>
                  {/each}
                </div>

                <div class="mt-5">
                  <h3 class="capitalize text-[11px] font-semibold text-[#4A5262]">{formatDate(selectedDate)}</h3>
                  <div class="mt-2 grid grid-cols-3 gap-2 sm:grid-cols-4">
                    {#each slotsForDate(selectedDate) as slot}
                      <button
                        type="button"
                        on:click={() => (selectedStartAt = slot.startAt)}
                        class={`h-10 rounded-xl border text-[11px] font-semibold transition ${selectedStartAt === slot.startAt ? "border-[#000A57] bg-[#000A57] text-white" : "border-[#D8DCE6] bg-white text-[#000A57] hover:border-[#000A57]"}`}
                      >{slot.time}</button>
                    {/each}
                  </div>
                </div>
              </div>

              <aside class="rounded-2xl border border-[#E7E9EF] bg-[#FAFAFC] p-4 lg:sticky lg:top-4 lg:self-start">
                {#if selectedSlot}
                  <strong class="text-[12px] font-semibold text-[#303747]">Confirmar horário</strong>
                  <p class="mt-2 capitalize text-[11px] leading-5 text-[#656D7C]">{formatDateTime(selectedSlot.startAt)}</p>
                  <textarea bind:value={notes} maxlength="2000" rows="3" class="mt-4 w-full resize-none rounded-xl border border-[#DDE1EA] bg-white px-3 py-3 text-[11px] outline-none focus:border-[#000A57]" placeholder="Assunto da conversa"></textarea>
                  {#if bookingError}<p class="mt-2 text-[10px] font-medium text-[#9B2C2C]">{bookingError}</p>{/if}
                  <button type="button" disabled={bookingSubmitting} on:click={confirmPersonalBooking} class="mt-3 inline-flex h-11 w-full items-center justify-center rounded-xl bg-[#000A57] px-5 text-[11px] font-semibold text-white disabled:opacity-50">
                    {bookingSubmitting ? "Confirmando..." : "Confirmar"}
                  </button>
                {:else}
                  <div class="flex min-h-[150px] flex-col items-center justify-center text-center">
                    <Clock3 size={22} class="text-[#A0A6B2]"/>
                    <p class="mt-3 text-[11px] font-semibold text-[#626978]">Selecione um horário</p>
                  </div>
                {/if}
              </aside>
            </div>
          {/if}
        </section>
      {/if}
    {:else}
      <header class="rounded-[26px] border border-[#E0E3EA] bg-white p-6 shadow-[0_18px_60px_rgba(1,13,40,0.08)] sm:p-8">
        <span class="text-[11px] font-bold uppercase tracking-[0.12em] text-[#EA6D0B]">F10 Software</span>
        <h1 class="mt-4 text-[28px] font-semibold tracking-[-0.035em] text-[#010D28] sm:text-[36px]">{data.invitation.title}</h1>
        <p class="mt-2 text-[13px] leading-6 text-[#6F7585]">Com <strong class="font-semibold text-[#343B4A]">{data.invitation.hostName}</strong></p>
      </header>

      {#if bookingResult || data.invitation.status === "booked"}
        <section class="mt-5 rounded-[26px] border border-[#B9E6C9] bg-white p-7 text-center">
          <CalendarCheck2 size={28} class="mx-auto text-[#176B35]"/>
          <h2 class="mt-4 text-[20px] font-semibold text-[#202637]">Agendamento confirmado</h2>
          <p class="mt-2 capitalize text-[13px] text-[#5F6776]">{formatDateTime(bookingResult?.startAt ?? data.invitation.selectedStartAt, bookingResult?.timeZone ?? data.invitation.timeZone)}</p>
          {#if bookingResult?.googleMeetUrl ?? data.invitation.googleMeetUrl}<a href={bookingResult?.googleMeetUrl ?? data.invitation.googleMeetUrl ?? "#"} target="_blank" rel="noopener noreferrer" class="mt-5 inline-flex h-11 items-center gap-2 rounded-xl bg-[#214A9A] px-5 text-[11px] font-semibold text-white"><Video size={15}/>Abrir Google Meet</a>{/if}
        </section>
      {:else}
        <section class="mt-5 rounded-[26px] border border-[#E0E3EA] bg-white p-5 sm:p-7">
          <h2 class="text-[18px] font-semibold text-[#202637]">Escolha data e hora</h2>
          {#if bookingError}<p class="mt-4 text-[10px] font-medium text-[#9B2C2C]">{bookingError}</p>{/if}
          <div class="mt-5 space-y-5">
            {#each dates as date}
              <section>
                <h3 class="capitalize text-[11px] font-semibold text-[#404756]">{formatDate(date)}</h3>
                <div class="mt-2 grid grid-cols-3 gap-2 sm:grid-cols-5">
                  {#each slotsForDate(date) as slot}
                    <button type="button" disabled={bookingSubmitting} on:click={() => confirmLegacyBooking(slot.startAt)} class="h-10 w-full rounded-xl border border-[#D8DCE6] bg-white text-[11px] font-semibold text-[#000A57] hover:border-[#000A57] disabled:opacity-50">{slot.time}</button>
                  {/each}
                </div>
              </section>
            {/each}
          </div>
        </section>
      {/if}
    {/if}
  </main>
</div>
