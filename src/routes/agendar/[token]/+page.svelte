<script lang="ts">
  import { CalendarCheck2, Clock3, Video } from "lucide-svelte";
  import type { ActionData, PageData } from "./$types";

  export let data: PageData;
  export let form: ActionData;

  type Slot = PageData["slots"][number];
  type BookingResult = {
    hostName: string;
    title: string;
    timeZone: string;
    startAt: string;
    endAt: string;
    googleMeetUrl: string | null;
  };

  let selectedStartAt = "";
  let notes = "";
  let bookingSubmitting = false;
  let bookingError = "";
  let bookingResult: BookingResult | null = null;

  $: dates = Array.from(new Set(data.slots.map((slot) => slot.date)));
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

<div class="min-h-screen bg-[#F5F6F8] px-4 py-8 sm:py-12">
  <main class="mx-auto w-full max-w-[760px]">
    {#if data.mode === "personal"}
      <header class="rounded-[26px] border border-[#E0E3EA] bg-white p-6 shadow-[0_18px_60px_rgba(1,13,40,0.08)] sm:p-8">
        <span class="text-[11px] font-bold uppercase tracking-[0.12em] text-[#EA6D0B]">F10 Software</span>
        <h1 class="mt-4 text-[28px] font-semibold tracking-[-0.035em] text-[#010D28] sm:text-[36px]">{data.schedule.title}</h1>
        <p class="mt-2 text-[13px] leading-6 text-[#6F7585]">Com <strong class="font-semibold text-[#343B4A]">{data.schedule.hostName}</strong></p>
        {#if data.schedule.description}<p class="mt-3 text-[12px] leading-6 text-[#737A89]">{data.schedule.description}</p>{/if}
        <div class="mt-5 flex flex-wrap gap-2 text-[9px] font-medium text-[#626978]">
          <span class="inline-flex items-center gap-1.5 rounded-lg bg-[#F3F4F7] px-3 py-2"><Clock3 size={13}/>{data.schedule.durationMinutes} min</span>
          {#if data.schedule.addGoogleMeet}<span class="inline-flex items-center gap-1.5 rounded-lg bg-[#EEF3FF] px-3 py-2 text-[#214A9A]"><Video size={13}/>Google Meet</span>{/if}
        </div>
      </header>

      {#if bookingResult}
        <section class="mt-5 rounded-[26px] border border-[#B9E6C9] bg-white p-7 text-center shadow-[0_12px_40px_rgba(1,13,40,0.05)]">
          <div class="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-[#EDF9F1] text-[#176B35]"><CalendarCheck2 size={28}/></div>
          <h2 class="mt-4 text-[20px] font-semibold text-[#202637]">Agendamento confirmado</h2>
          <p class="mt-2 capitalize text-[13px] leading-6 text-[#5F6776]">{formatDateTime(bookingResult.startAt, bookingResult.timeZone)}</p>
          {#if bookingResult.googleMeetUrl}<a href={bookingResult.googleMeetUrl} target="_blank" rel="noopener noreferrer" class="mt-5 inline-flex h-11 items-center gap-2 rounded-xl bg-[#214A9A] px-5 text-[11px] font-semibold text-white"><Video size={15}/>Abrir Google Meet</a>{/if}
        </section>
      {:else}
        <section class="mt-5 rounded-[26px] border border-[#E0E3EA] bg-white p-5 shadow-[0_12px_40px_rgba(1,13,40,0.05)] sm:p-7">
          <h2 class="text-[18px] font-semibold text-[#202637]">Escolha data e hora</h2>

          {#if data.availabilityUnavailable}
            <div class="mt-5 rounded-xl border border-[#F0D6BD] bg-[#FFF9F3] px-4 py-4 text-[10px] text-[#935018]">Agenda indisponível no momento.</div>
          {:else if dates.length === 0}
            <div class="mt-5 rounded-xl border border-[#E4E6EC] bg-[#FAFAFC] px-4 py-8 text-center text-[10px] text-[#858B99]">Nenhum horário disponível.</div>
          {:else}
            {#if bookingError}<p class="mt-4 text-[10px] font-medium text-[#9B2C2C]">{bookingError}</p>{/if}
          <div class="mt-5 space-y-5">
              {#each dates as date}
                <section>
                  <h3 class="capitalize text-[11px] font-semibold text-[#404756]">{formatDate(date)}</h3>
                  <div class="mt-2 grid grid-cols-3 gap-2 sm:grid-cols-5">
                    {#each slotsForDate(date) as slot}
                      <button
                        type="button"
                        on:click={() => (selectedStartAt = slot.startAt)}
                        class={`h-10 rounded-xl border text-[11px] font-semibold transition ${selectedStartAt === slot.startAt ? "border-[#000A57] bg-[#000A57] text-white" : "border-[#D8DCE6] bg-white text-[#000A57] hover:border-[#000A57]"}`}
                      >{slot.time}</button>
                    {/each}
                  </div>
                </section>
              {/each}
            </div>
          {/if}

          {#if selectedSlot}
            <div class="mt-6 border-t border-[#ECEEF3] pt-5">
              <h3 class="text-[13px] font-semibold text-[#303747]">Observação</h3>
              <textarea bind:value={notes} maxlength="2000" rows="4" class="mt-2 w-full resize-none rounded-xl border border-[#DDE1EA] px-3 py-3 text-[12px] outline-none focus:border-[#000A57]" placeholder="Assunto da conversa"></textarea>
              {#if bookingError}<p class="mt-2 text-[10px] font-medium text-[#9B2C2C]">{bookingError}</p>{/if}
              <button type="button" disabled={bookingSubmitting} on:click={confirmPersonalBooking} class="mt-4 inline-flex h-11 w-full items-center justify-center rounded-xl bg-[#000A57] px-5 text-[11px] font-semibold text-white disabled:opacity-50">
                {bookingSubmitting ? "Confirmando..." : "Confirmar agendamento"}
              </button>
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

      {#if form?.message}
        <div class={`mt-4 rounded-xl border px-4 py-3 text-[11px] font-medium ${form.success ? "border-[#B9E6C9] bg-[#F1FBF4] text-[#176B35]" : "border-[#F0C8C8] bg-[#FFF5F5] text-[#9B2C2C]"}`}>{form.message}</div>
      {/if}

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
