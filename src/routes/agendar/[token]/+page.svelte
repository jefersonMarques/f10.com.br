<script lang="ts">
  import { CalendarCheck2, Clock3, ShieldCheck, Video } from "lucide-svelte";
  import type { ActionData, PageData } from "./$types";

  export let data: PageData;
  export let form: ActionData;

  type Slot = PageData["slots"][number];

  $: dates = Array.from(new Set(data.slots.map((slot) => slot.date)));
  $: showGoogleMeet = data.invitation.status === "booked"
    ? Boolean(data.invitation.googleMeetUrl)
    : data.invitation.addGoogleMeet;

  function slotsForDate(date: string): Slot[] {
    return data.slots.filter((slot) => slot.date === date);
  }

  function formatDate(date: string): string {
    const [year, month, day] = date.split("-").map(Number);
    return new Intl.DateTimeFormat("pt-BR", {
      weekday: "long",
      day: "2-digit",
      month: "long",
      year: "numeric",
      timeZone: "UTC",
    }).format(new Date(Date.UTC(year, month - 1, day, 12, 0, 0)));
  }

  function formatBookedDate(value: string | null): string {
    if (!value) return "";
    return new Intl.DateTimeFormat("pt-BR", {
      timeZone: data.invitation.timeZone,
      weekday: "long",
      day: "2-digit",
      month: "long",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(value));
  }
</script>

<svelte:head>
  <title>{data.invitation.title} | Agendamento F10</title>
  <meta name="robots" content="noindex,nofollow,noarchive"/>
  <meta name="referrer" content="no-referrer"/>
</svelte:head>

<div class="min-h-screen bg-[#F5F6F8] px-4 py-8 sm:py-12">
  <main class="mx-auto w-full max-w-[760px]">
    <header class="rounded-[26px] border border-[#E0E3EA] bg-white p-6 shadow-[0_18px_60px_rgba(1,13,40,0.08)] sm:p-8">
      <div class="flex items-center justify-between gap-4">
        <span class="text-[12px] font-bold uppercase tracking-[0.14em] text-[#EA6D0B]">F10 Software</span>
        <span class="inline-flex items-center gap-2 rounded-full border border-[#E1E5EC] bg-[#FAFAFC] px-3 py-1.5 text-[9px] font-semibold text-[#69707E]"><ShieldCheck size={13}/>Link protegido</span>
      </div>
      <h1 class="mt-6 text-[28px] font-semibold tracking-[-0.035em] text-[#010D28] sm:text-[36px]">{data.invitation.title}</h1>
      {#if data.invitation.status === "booked"}
        <p class="mt-2 text-[13px] leading-6 text-[#6F7585]">Confira os dados atuais do seu compromisso com <strong class="font-semibold text-[#343B4A]">{data.invitation.hostName}</strong>.</p>
      {:else if data.invitation.status === "booking"}
        <p class="mt-2 text-[13px] leading-6 text-[#6F7585]">Seu horário com <strong class="font-semibold text-[#343B4A]">{data.invitation.hostName}</strong> está sendo confirmado.</p>
      {:else}
        <p class="mt-2 text-[13px] leading-6 text-[#6F7585]">Escolha um horário disponível com <strong class="font-semibold text-[#343B4A]">{data.invitation.hostName}</strong>.</p>
      {/if}
      <div class="mt-5 flex flex-wrap gap-2 text-[9px] font-medium text-[#626978]"><span class="inline-flex items-center gap-1.5 rounded-lg bg-[#F3F4F7] px-3 py-2"><Clock3 size={13}/>{data.invitation.durationMinutes} min</span><span class="rounded-lg bg-[#F3F4F7] px-3 py-2">Fuso: {data.invitation.timeZone}</span>{#if showGoogleMeet}<span class="inline-flex items-center gap-1.5 rounded-lg bg-[#EEF3FF] px-3 py-2 text-[#214A9A]"><Video size={13}/>Google Meet</span>{/if}</div>
    </header>

    {#if form?.message}
      <div class={`mt-4 rounded-xl border px-4 py-3 text-[11px] font-medium ${form.success ? "border-[#B9E6C9] bg-[#F1FBF4] text-[#176B35]" : "border-[#F0C8C8] bg-[#FFF5F5] text-[#9B2C2C]"}`}>{form.message}</div>
    {/if}

    {#if data.invitation.status === "booked"}
      <section class="mt-5 rounded-[26px] border border-[#B9E6C9] bg-white p-6 text-center shadow-[0_12px_40px_rgba(1,13,40,0.05)] sm:p-8">
        <div class="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-[#EDF9F1] text-[#176B35]"><CalendarCheck2 size={28}/></div>
        <h2 class="mt-4 text-[20px] font-semibold text-[#202637]">Agendamento confirmado</h2>
        <p class="mt-2 capitalize text-[13px] leading-6 text-[#5F6776]">{formatBookedDate(data.invitation.selectedStartAt)}</p>
        <p class="mt-2 text-[10px] leading-5 text-[#858B98]">Este é o horário atual registrado na Agenda F10.</p>
        {#if data.invitation.googleMeetUrl}<a href={data.invitation.googleMeetUrl} target="_blank" rel="noopener noreferrer" class="mt-5 inline-flex h-11 items-center gap-2 rounded-xl bg-[#214A9A] px-5 text-[11px] font-semibold text-white"><Video size={15}/>Abrir Google Meet</a>{/if}
      </section>
    {:else if data.invitation.status === "booking"}
      <section class="mt-5 rounded-[24px] border border-[#F0D6BD] bg-[#FFF9F3] p-6 text-center"><h2 class="text-[16px] font-semibold text-[#704019]">Confirmação em andamento</h2><p class="mt-2 text-[10px] leading-5 text-[#8A6648]">O horário está sendo confirmado na Agenda F10. Atualize esta página em alguns instantes.</p></section>
    {:else}
      <section class="mt-5 rounded-[26px] border border-[#E0E3EA] bg-white p-5 shadow-[0_12px_40px_rgba(1,13,40,0.05)] sm:p-7">
        <div class="flex items-end justify-between gap-4"><div><span class="text-[10px] font-bold uppercase tracking-[0.08em] text-[#5C6475]">Horários livres</span><h2 class="mt-1 text-[18px] font-semibold text-[#202637]">Selecione data e hora</h2></div><span class="text-right text-[9px] leading-4 text-[#8B909D]">Disponibilidade consultada<br/>na Agenda F10</span></div>

        {#if data.availabilityUnavailable}
          <div class="mt-5 rounded-xl border border-[#F0D6BD] bg-[#FFF9F3] px-4 py-4 text-[10px] leading-5 text-[#935018]">Não foi possível consultar a disponibilidade completa agora. Tente novamente em alguns instantes.</div>
        {:else if dates.length === 0}
          <div class="mt-5 rounded-xl border border-[#E4E6EC] bg-[#FAFAFC] px-4 py-8 text-center text-[10px] leading-5 text-[#858B99]">Não há horários livres dentro desta janela. Entre em contato com a F10 para receber outra opção de agendamento.</div>
        {:else}
          <div class="mt-5 space-y-5">
            {#each dates as date}
              <section>
                <h3 class="capitalize text-[11px] font-semibold text-[#404756]">{formatDate(date)}</h3>
                <div class="mt-2 grid grid-cols-3 gap-2 sm:grid-cols-5">
                  {#each slotsForDate(date) as slot}
                    <form method="POST" action="?/book">
                      <input type="hidden" name="startAt" value={slot.startAt}/>
                      <button type="submit" class="h-10 w-full rounded-xl border border-[#D8DCE6] bg-white text-[11px] font-semibold text-[#000A57] transition hover:border-[#000A57] hover:bg-[#F7F8FF] focus:outline-none focus:ring-2 focus:ring-[#000A57]/15">{slot.time}</button>
                    </form>
                  {/each}
                </div>
              </section>
            {/each}
          </div>
        {/if}
      </section>
    {/if}

    <p class="mt-5 text-center text-[9px] leading-5 text-[#969BA7]">Este link mostra somente horários livres. Títulos, participantes e detalhes de outros eventos nunca são exibidos.</p>
  </main>
</div>
