<script lang="ts">
  import { browser } from "$app/environment";
  import { onDestroy } from "svelte";
  import { CircleAlert, Clock3, Plus, UserRound, X } from "lucide-svelte";

  type UserOption = { id: string; name: string; email: string };
  type AttendeeDraft = {
    email: string;
    name?: string;
    userId?: string | null;
    optional?: boolean;
    responseStatus?: string;
  };
  type AvailabilityResult = {
    userId: string;
    name: string;
    email: string;
    coverage: "google" | "f10-only";
    conflicts: Array<{
      start: string;
      end: string;
      allDay: boolean;
      source: "google" | "f10";
    }>;
  };

  export let users: UserOption[] = [];
  export let organizerUserId = "";
  export let organizerEmail = "";
  export let initialAttendees: AttendeeDraft[] = [];
  export let date = "";
  export let startTime = "";
  export let endTime = "";
  export let timeZone = "UTC";
  export let allDay = false;
  export let excludeGoogleEventId: string | null = null;
  export let inputName = "attendeesJson";

  let initialized = false;
  let attendees: AttendeeDraft[] = [];
  let userSearch = "";
  let externalEmail = "";
  let externalError = "";
  let availabilityResults: AvailabilityResult[] = [];
  let availabilityLoading = false;
  let availabilityError = "";
  let availabilityTimer: ReturnType<typeof setTimeout> | null = null;
  let availabilityRequest = 0;

  $: if (!initialized) {
    attendees = initialAttendees
      .filter((attendee) => attendee.email)
      .map((attendee) => {
        const email = attendee.email.trim().toLowerCase();
        const internal = users.find((user) => user.email.trim().toLowerCase() === email);
        return {
          email,
          name: attendee.name?.trim() || internal?.name || "",
          userId: attendee.userId || internal?.id || null,
          optional: Boolean(attendee.optional),
          responseStatus: attendee.responseStatus || "needsAction",
        };
      })
      .filter((attendee, index, values) => values.findIndex((item) => item.email === attendee.email) === index);
    initialized = true;
  }

  $: filteredUsers = users
    .filter((user) => user.id !== organizerUserId)
    .filter((user) => user.email.trim().toLowerCase() !== organizerEmail.trim().toLowerCase())
    .filter((user) => {
      const term = userSearch.trim().toLowerCase();
      return !term || user.name.toLowerCase().includes(term) || user.email.toLowerCase().includes(term);
    });
  $: externalAttendees = attendees.filter((attendee) => !attendee.userId);
  $: internalUserIds = attendees
    .map((attendee) => attendee.userId)
    .filter((userId): userId is string => Boolean(userId));
  $: serializedAttendees = JSON.stringify(
    attendees.map((attendee) => ({
      email: attendee.email,
      name: attendee.name ?? "",
      userId: attendee.userId ?? null,
      optional: Boolean(attendee.optional),
    })),
  );
  $: availabilityKey = JSON.stringify({
    userIds: internalUserIds,
    date,
    startTime,
    endTime,
    timeZone,
    allDay,
    excludeGoogleEventId,
  });
  $: if (browser) queueAvailabilityCheck(availabilityKey);

  function isSelected(userId: string): boolean {
    return attendees.some((attendee) => attendee.userId === userId);
  }

  function findAttendee(userId: string): AttendeeDraft | undefined {
    return attendees.find((attendee) => attendee.userId === userId);
  }

  function toggleInternal(user: UserOption, selected: boolean): void {
    if (selected) {
      if (isSelected(user.id)) return;
      attendees = [
        ...attendees,
        {
          email: user.email.trim().toLowerCase(),
          name: user.name,
          userId: user.id,
          optional: false,
          responseStatus: "needsAction",
        },
      ];
      return;
    }
    attendees = attendees.filter((attendee) => attendee.userId !== user.id);
  }

  function setOptional(email: string, optional: boolean): void {
    attendees = attendees.map((attendee) =>
      attendee.email === email ? { ...attendee, optional } : attendee,
    );
  }

  function removeAttendee(email: string): void {
    attendees = attendees.filter((attendee) => attendee.email !== email);
  }

  function addExternal(): void {
    const email = externalEmail.trim().toLowerCase();
    externalError = "";
    if (!email || email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      externalError = "Informe um e-mail válido.";
      return;
    }
    if (email === organizerEmail.trim().toLowerCase()) {
      externalError = "O organizador já participa do evento.";
      return;
    }
    if (attendees.some((attendee) => attendee.email === email)) {
      externalError = "Este participante já foi adicionado.";
      return;
    }
    const internal = users.find((user) => user.email.trim().toLowerCase() === email);
    attendees = [
      ...attendees,
      {
        email,
        name: internal?.name ?? "",
        userId: internal?.id ?? null,
        optional: false,
        responseStatus: "needsAction",
      },
    ];
    externalEmail = "";
  }

  function responseLabel(status: string | undefined): string {
    if (status === "accepted") return "Aceitou";
    if (status === "declined") return "Recusou";
    if (status === "tentative") return "Talvez";
    return "Aguardando";
  }

  function queueAvailabilityCheck(key: string): void {
    void key;
    if (availabilityTimer) clearTimeout(availabilityTimer);
    if (allDay || internalUserIds.length === 0 || !date || !startTime || !endTime || startTime >= endTime) {
      availabilityResults = [];
      availabilityError = "";
      availabilityLoading = false;
      return;
    }
    availabilityTimer = setTimeout(() => void checkAvailability(), 350);
  }

  async function checkAvailability(): Promise<void> {
    const requestId = ++availabilityRequest;
    availabilityLoading = true;
    availabilityError = "";
    try {
      const response = await fetch("/app/tasks/calendar/availability", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userIds: internalUserIds,
          date,
          startTime,
          endTime,
          timeZone,
          excludeGoogleEventId,
        }),
      });
      const payload = await response.json().catch(() => ({})) as {
        results?: AvailabilityResult[];
        message?: string;
      };
      if (requestId !== availabilityRequest) return;
      if (!response.ok) {
        availabilityError = payload.message || "Não foi possível verificar a disponibilidade.";
        availabilityResults = [];
        return;
      }
      availabilityResults = payload.results ?? [];
    } catch {
      if (requestId === availabilityRequest) {
        availabilityError = "Não foi possível verificar a disponibilidade.";
        availabilityResults = [];
      }
    } finally {
      if (requestId === availabilityRequest) availabilityLoading = false;
    }
  }

  function availabilityFor(userId: string): AvailabilityResult | undefined {
    return availabilityResults.find((result) => result.userId === userId);
  }

  function conflictLabel(result: AvailabilityResult): string {
    const conflict = result.conflicts[0];
    if (!conflict) return result.coverage === "google" ? "Disponível" : "Sem conflito no F10";
    if (conflict.allDay) return "Conflito de dia inteiro";
    const formatter = new Intl.DateTimeFormat("pt-BR", {
      timeZone,
      hour: "2-digit",
      minute: "2-digit",
    });
    return `Conflito ${formatter.format(new Date(conflict.start))}–${formatter.format(new Date(conflict.end))}`;
  }

  onDestroy(() => {
    if (availabilityTimer) clearTimeout(availabilityTimer);
    availabilityRequest += 1;
  });
</script>

<input type="hidden" name={inputName} value={serializedAttendees}/>

<div class="rounded-xl border border-[#E2E5ED] bg-white p-3">
  <div class="flex items-start gap-2">
    <UserRound size={15} class="mt-0.5 shrink-0 text-[#000A57]"/>
    <div>
      <strong class="block text-[10px] font-semibold text-[#303747]">Participantes</strong>
      <span class="mt-0.5 block text-[8px] leading-4 text-[#858B98]">Equipe F10 por seleção; pessoas externas pelo e-mail. O Google enviará os convites.</span>
    </div>
  </div>

  {#if users.length > 1}
    <div class="mt-3 rounded-lg border border-[#E6E8EE] bg-[#FAFAFC] p-2.5">
      <label class="block"><span class="mb-1 block text-[8px] font-semibold text-[#707786]">Equipe F10</span><input type="search" bind:value={userSearch} placeholder="Buscar nome ou e-mail" class="h-9 w-full rounded-lg border border-[#DDE1EA] bg-white px-2.5 text-[10px] outline-none focus:border-[#000A57]"/></label>
      <div class="mt-2 max-h-36 space-y-1 overflow-y-auto pr-1">
        {#each filteredUsers as user}
          {@const selected = isSelected(user.id)}
          {@const attendee = findAttendee(user.id)}
          {@const availability = availabilityFor(user.id)}
          <div class="flex items-center justify-between gap-2 rounded-lg bg-white px-2.5 py-2">
            <label class="flex min-w-0 flex-1 cursor-pointer items-center gap-2"><input type="checkbox" checked={selected} on:change={(event) => toggleInternal(user, (event.currentTarget as HTMLInputElement).checked)}/><span class="min-w-0"><strong class="block truncate text-[9px] font-semibold text-[#424957]">{user.name}</strong><span class="block truncate text-[8px] text-[#9297A4]">{user.email}</span></span></label>
            {#if selected}
              <div class="flex shrink-0 items-center gap-2">
                {#if !allDay}
                  <span class={`text-[8px] font-semibold ${availability?.conflicts.length ? "text-[#A9510D]" : availability ? "text-[#2F7045]" : "text-[#8D93A0]"}`}>{availabilityLoading && !availability ? "Verificando..." : availability ? conflictLabel(availability) : ""}</span>
                {/if}
                <label class="flex items-center gap-1 text-[8px] text-[#7D8391]"><input type="checkbox" checked={Boolean(attendee?.optional)} on:change={(event) => setOptional(user.email.trim().toLowerCase(), (event.currentTarget as HTMLInputElement).checked)}/>Opcional</label>
              </div>
            {/if}
          </div>
        {/each}
      </div>
    </div>
  {/if}

  <div class="mt-3">
    <span class="mb-1 block text-[8px] font-semibold text-[#707786]">Participantes externos</span>
    <div class="flex gap-2"><input type="email" bind:value={externalEmail} on:keydown={(event) => { if (event.key === "Enter") { event.preventDefault(); addExternal(); } }} placeholder="cliente@empresa.com" class="h-9 min-w-0 flex-1 rounded-lg border border-[#DDE1EA] px-2.5 text-[10px] outline-none focus:border-[#000A57]"/><button type="button" on:click={addExternal} class="inline-flex h-9 items-center gap-1 rounded-lg border border-[#D6DAE3] bg-[#FAFAFC] px-3 text-[9px] font-semibold text-[#000A57]"><Plus size={12}/>Adicionar</button></div>
    {#if externalError}<p class="mt-1 text-[8px] font-medium text-[#A52A2A]">{externalError}</p>{/if}
    {#if externalAttendees.length > 0}
      <div class="mt-2 space-y-1.5">
        {#each externalAttendees as attendee}
          <div class="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-[#E7E9EF] bg-[#FAFAFC] px-2.5 py-2">
            <div class="min-w-0"><span class="block truncate text-[9px] font-medium text-[#4A5060]">{attendee.email}</span>{#if attendee.responseStatus}<span class="text-[7px] text-[#959AA6]">{responseLabel(attendee.responseStatus)}</span>{/if}</div>
            <div class="flex items-center gap-2"><label class="flex items-center gap-1 text-[8px] text-[#7D8391]"><input type="checkbox" checked={Boolean(attendee.optional)} on:change={(event) => setOptional(attendee.email, (event.currentTarget as HTMLInputElement).checked)}/>Opcional</label><button type="button" on:click={() => removeAttendee(attendee.email)} class="flex h-7 w-7 items-center justify-center rounded-md text-[#8C919E] hover:bg-white" aria-label="Remover participante"><X size={12}/></button></div>
          </div>
        {/each}
      </div>
    {/if}
  </div>

  {#if !allDay && internalUserIds.length > 0}
    <div class="mt-3 border-t border-[#ECEEF3] pt-2">
      {#if availabilityLoading}<p class="inline-flex items-center gap-1.5 text-[8px] text-[#7D8391]"><Clock3 size={11}/>Verificando disponibilidade da equipe...</p>{/if}
      {#if availabilityError}<p class="inline-flex items-center gap-1.5 text-[8px] font-medium text-[#A9510D]"><CircleAlert size={11}/>{availabilityError}</p>{/if}
      {#if availabilityResults.some((result) => result.conflicts.length > 0)}<p class="mt-1 inline-flex items-center gap-1.5 text-[8px] font-semibold text-[#A9510D]"><CircleAlert size={11}/>Há conflito de horário. O F10 avisa, mas não bloqueia a criação.</p>{/if}
      {#if availabilityResults.some((result) => result.coverage === "f10-only")}<p class="mt-1 text-[7px] leading-3 text-[#9297A4]">Para usuários sem agenda Google disponível, a checagem considera somente compromissos temporizados conhecidos pelo F10.</p>{/if}
    </div>
  {:else if allDay && internalUserIds.length > 0}
    <p class="mt-3 border-t border-[#ECEEF3] pt-2 text-[7px] text-[#9297A4]">Disponibilidade automática é verificada apenas para eventos com horário.</p>
  {/if}
</div>
