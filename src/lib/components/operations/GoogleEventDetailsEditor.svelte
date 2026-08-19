<script lang="ts">
  import { Bell, MapPin } from "lucide-svelte";
  import EventParticipantsEditor from "$lib/components/operations/EventParticipantsEditor.svelte";

  type UserOption = { id: string; name: string; email: string };
  type AttendeeDraft = {
    email: string;
    name?: string;
    userId?: string | null;
    optional?: boolean;
    responseStatus?: string;
  };

  export let users: UserOption[] = [];
  export let organizerUserId = "";
  export let organizerEmail = "";
  export let date = "";
  export let startTime = "";
  export let endTime = "";
  export let timeZone = "UTC";
  export let allDay = false;
  export let initialLocation = "";
  export let initialReminderMinutes: number | null = null;
  export let initialAttendees: AttendeeDraft[] = [];
  export let excludeGoogleEventId: string | null = null;
  export let excludeGoogleIcalUid: string | null = null;

  let location = initialLocation;
  let reminderValue = initialReminderMinutes === null ? "" : String(initialReminderMinutes);
</script>

<div class="grid gap-3 sm:grid-cols-2">
  <label class="block sm:col-span-2">
    <span class="application-text-meta mb-1.5 inline-flex items-center gap-1 font-semibold text-[#626979]"><MapPin size={12}/>Local <span class="font-normal text-[#9A9FAC]">(opcional)</span></span>
    <input name="location" maxlength="500" bind:value={location} placeholder="Ex.: Sala de reunião ou endereço" class="application-text-caption h-10 w-full rounded-lg border border-[#DDE1EA] px-2.5 outline-none focus:border-[#000A57]"/>
  </label>
  <label class="block sm:col-span-2">
    <span class="application-text-meta mb-1.5 inline-flex items-center gap-1 font-semibold text-[#626979]"><Bell size={12}/>Lembrete</span>
    <select name="reminderMinutes" bind:value={reminderValue} class="application-text-caption h-10 w-full rounded-lg border border-[#DDE1EA] bg-white px-2.5 outline-none focus:border-[#000A57]">
      <option value="">Padrão da agenda Google</option>
      <option value="0">Sem lembrete</option>
      <option value="10">10 minutos antes</option>
      <option value="30">30 minutos antes</option>
      <option value="60">1 hora antes</option>
      <option value="1440">1 dia antes</option>
    </select>
  </label>
</div>

<EventParticipantsEditor
  {users}
  {organizerUserId}
  {organizerEmail}
  {date}
  {startTime}
  {endTime}
  {timeZone}
  {allDay}
  {initialAttendees}
  {excludeGoogleEventId}
  {excludeGoogleIcalUid}
/>
