<script lang="ts">
  import { onMount } from "svelte";
  import {
    CalendarDays, Clock3, Filter, RefreshCw, Search, Users,
  } from "lucide-svelte";
  import type { PageData } from "../../../routes/app/performance/$types";

  export let initialData: PageData["presence"];

  let presence = initialData;
  let search = "";
  let teamFilter = "all";
  let statusFilter = "all";
  let sortBy = "name";
  let hoveredSegment: string | null = null;
  let missingAvatars: string[] = [];
  let loading = false;
  let errorMessage = "";
  let latestRequest = 0;

  $: if (initialData) presence = initialData;
  $: timeFormatter = new Intl.DateTimeFormat("pt-BR", {
    timeZone: presence.timezone,
    hour: "2-digit",
    minute: "2-digit",
  });
  $: dateFormatter = new Intl.DateTimeFormat("pt-BR", {
    timeZone: presence.timezone,
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
  $: visibleUsers = presence.users
    .filter((user) => {
      const term = search.trim().toLocaleLowerCase("pt-BR");
      return (!term || user.name.toLocaleLowerCase("pt-BR").includes(term)
          || user.email.toLocaleLowerCase("pt-BR").includes(term))
        && (teamFilter === "all" || user.teamIds.includes(teamFilter))
        && (statusFilter === "all" || user.currentStatus === statusFilter);
    })
    .sort((first, second) => {
      if (sortBy === "online") return second.onlineMinutes - first.onlineMinutes;
      if (sortBy === "recent") {
        return new Date(second.lastOnlineAt ?? 0).getTime()
          - new Date(first.lastOnlineAt ?? 0).getTime();
      }
      return first.name.localeCompare(second.name, "pt-BR");
    });

  function handleAvatarError(userId: string): void {
    missingAvatars = [...missingAvatars, userId];
  }

  function initials(name: string): string {
    return name.trim().split(/\s+/).slice(0, 2)
      .map((part) => part[0] ?? "").join("").toUpperCase();
  }

  function statusLabel(value: string): string {
    if (value === "online") return "Online";
    if (value === "busy") return "Ocupado";
    if (value === "away") return "Ausente";
    if (value === "future") return "Horário futuro";
    if (value === "untracked") return "Sem registro histórico";
    return "Offline";
  }

  function duration(minutes: number): string {
    const hours = Math.floor(minutes / 60);
    const remaining = minutes % 60;
    return hours ? `${hours}h ${String(remaining).padStart(2, "0")}min` : `${remaining}min`;
  }

  function clock(value: string): string {
    return timeFormatter.format(new Date(value));
  }

  function dateTime(value: string | Date | null): string {
    return value ? dateFormatter.format(new Date(value)) : "Não registrado";
  }

  async function refresh(date: string): Promise<void> {
    const requestId = ++latestRequest;
    loading = true;
    errorMessage = "";
    try {
      const response = await fetch(
        `/api/app/performance/presence?date=${encodeURIComponent(date)}`,
        { cache: "no-store" },
      );
      if (!response.ok) throw new Error("PRESENCE_FETCH_FAILED");
      const result = await response.json() as typeof presence;
      if (requestId === latestRequest) presence = result;
    } catch {
      if (requestId === latestRequest) errorMessage = "Não foi possível atualizar a presença.";
    } finally {
      if (requestId === latestRequest) loading = false;
    }
  }

  onMount(() => {
    const timer = setInterval(() => {
      if (!document.hidden) void refresh(presence.date);
    }, 60_000);
    return () => clearInterval(timer);
  });
</script>

<section class="space-y-4">
  <div class="rounded-xl border border-app-border bg-app-surface p-4 sm:p-5">
    <div class="flex flex-wrap items-start justify-between gap-3">
      <div>
        <h2 class="application-text-section flex items-center gap-2 font-semibold text-app-text">
          <Users size={19} class="text-app-primary"/> Presença da equipe
        </h2>
        <p class="application-text-caption mt-1 text-app-text-soft">
          Disponibilidade registrada durante o horário de atendimento.
        </p>
      </div>
      <div class="flex items-center gap-2">
        <label class="flex min-h-10 items-center gap-2 rounded-lg border border-app-border-control px-3">
          <CalendarDays size={16} class="text-app-text-soft"/>
          <input type="date" aria-label="Data de presença" value={presence.date}
            max={presence.today} on:change={(event) => void refresh(event.currentTarget.value)}
            class="application-text-caption bg-transparent text-app-text"/>
        </label>
        <button type="button" disabled={loading} on:click={() => void refresh(presence.date)}
          aria-label="Atualizar presença" title="Atualizar presença"
          class="flex h-10 w-10 items-center justify-center rounded-lg border border-app-border-control text-app-text disabled:opacity-50">
          <RefreshCw size={17} class={loading ? "animate-spin" : ""}/>
        </button>
      </div>
    </div>
    <div class="mt-4 flex flex-wrap gap-2 border-t border-app-border pt-4">
      <label class="flex min-h-10 min-w-[160px] flex-1 items-center gap-2 rounded-lg border border-app-border-control px-3">
        <Search size={16} class="shrink-0 text-app-text-soft"/>
        <input bind:value={search} aria-label="Pesquisar atendente" placeholder="Buscar atendente"
          class="application-text-caption min-w-0 flex-1 bg-transparent text-app-text outline-none"/>
      </label>
      <Filter size={18} class="self-center text-app-text-soft"/>
      <select bind:value={teamFilter} aria-label="Filtrar equipe"
        class="application-text-caption min-h-10 rounded-lg border border-app-border-control bg-app-surface px-2 text-app-text">
        <option value="all">Todas as equipes</option>
        {#each presence.teams as team (team.id)}
          <option value={team.id}>{team.name}</option>
        {/each}
      </select>
      <select bind:value={statusFilter} aria-label="Filtrar status"
        class="application-text-caption min-h-10 rounded-lg border border-app-border-control bg-app-surface px-2 text-app-text">
        <option value="all">Todos os status</option>
        <option value="online">Online</option>
        <option value="busy">Ocupado</option>
        <option value="away">Ausente</option>
        <option value="offline">Offline</option>
      </select>
      <select bind:value={sortBy} aria-label="Ordenar atendentes"
        class="application-text-caption min-h-10 rounded-lg border border-app-border-control bg-app-surface px-2 text-app-text">
        <option value="name">Nome A–Z</option>
        <option value="online">Maior tempo online</option>
        <option value="recent">Último online</option>
      </select>
    </div>
    <div class="application-text-meta mt-3 flex flex-wrap items-center gap-4 text-app-text-soft">
      <span><span class="mr-1 inline-block h-2.5 w-3 rounded-sm bg-[#32965A]"></span>Online</span>
      <span><span class="mr-1 inline-block h-2.5 w-3 rounded-sm bg-[#D99424]"></span>Ocupado</span>
      <span><span class="mr-1 inline-block h-2.5 w-3 rounded-sm bg-[#C8CED8]"></span>Offline / ausente</span>
      <span><Clock3 size={13} class="inline"/> {presence.schedule.enabled ? `${presence.schedule.start}–${presence.schedule.end}` : "Sem expediente"} · {presence.timezone}</span>
    </div>
    {#if !presence.hoursConfigured}
      <p class="application-text-meta mt-2 text-app-warning-text">Horário ainda não confirmado nas configurações; usando o padrão disponível.</p>
    {/if}
    {#if errorMessage}
      <p role="alert" class="application-text-caption mt-3 text-app-danger-text">{errorMessage}</p>
    {/if}
  </div>

  <div class="rounded-xl border border-app-border bg-app-surface">
    <div class="hidden gap-3 border-b border-app-border bg-app-subtle px-4 py-3 lg:grid lg:grid-cols-[minmax(160px,1.4fr)_100px_112px_105px_minmax(240px,2fr)_60px]">
      {#each ["Atendente", "Status", "Último online", "Online no dia", "Linha do tempo", "Presença"] as label}
        <strong class="application-text-meta text-app-text-soft">{label}</strong>
      {/each}
    </div>
    <div class="divide-y divide-app-border">
      {#each visibleUsers as user (user.id)}
        <article class="grid gap-3 px-4 py-4 lg:grid-cols-[minmax(160px,1.4fr)_100px_112px_105px_minmax(240px,2fr)_60px] lg:items-center">
          <div class="flex min-w-0 items-center gap-2.5">
            <span class="relative flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-app-info-bg application-text-caption font-semibold text-app-primary">
              {initials(user.name)}
              {#if user.hasAvatar && !missingAvatars.includes(user.id)}
                <img src={`/api/app/performance/avatar/${user.id}`} alt={`Foto de ${user.name}`}
                  class="absolute inset-0 h-full w-full object-cover"
                  on:error={() => handleAvatarError(user.id)}/>
              {/if}
            </span>
            <span class="min-w-0">
              <strong class="application-text-caption block truncate text-app-text">{user.name}</strong>
              <span class="application-text-meta block truncate text-app-text-soft">{user.email}</span>
            </span>
          </div>
          <div>
            <span class:online-state={user.currentStatus === "online"}
              class:busy-state={user.currentStatus === "busy"}
              class="application-text-meta inline-flex min-h-7 items-center rounded-full bg-app-subtle px-2.5 font-semibold text-app-text-soft">
              {statusLabel(user.currentStatus)}
            </span>
          </div>
          <div class="application-text-caption text-app-text-soft">
            {dateTime(user.lastOnlineAt)}
          </div>
          <strong class="application-text-caption text-app-text">{duration(user.onlineMinutes)}</strong>
          <div class="min-w-0">
            {#if presence.schedule.enabled}
              <div class="relative h-3 overflow-visible rounded-full bg-[#D5DAE2]">
                {#each user.segments as segment,index}
                  <button type="button" aria-label={`${statusLabel(segment.status)}: ${clock(segment.startedAt)} às ${clock(segment.endedAt)}`}
                    title={`${statusLabel(segment.status)} · ${duration(segment.minutes)}`}
                    class:online-line={segment.status === "online"}
                    class:busy-line={segment.status === "busy"}
                    class:away-line={segment.status === "away"}
                    class:future-line={segment.status === "future"}
                    class:untracked-line={segment.status === "untracked"}
                    class="absolute top-0 h-full min-w-[2px] rounded-[2px]"
                    style={`left: ${segment.leftPercent}%; width: ${segment.widthPercent}%;`}
                    on:mouseenter={() => (hoveredSegment = `${user.id}-${index}`)}
                    on:mouseleave={() => (hoveredSegment = null)}
                    on:focus={() => (hoveredSegment = `${user.id}-${index}`)}
                    on:blur={() => (hoveredSegment = null)}
                    on:click={() => (hoveredSegment = `${user.id}-${index}`)}>
                  </button>
                  {#if hoveredSegment === `${user.id}-${index}`}
                    <div role="tooltip" class="pointer-events-none absolute bottom-6 z-30 min-w-[190px] rounded-lg border border-app-border bg-app-surface p-3 text-left shadow-lg"
                      style={`left: ${Math.max(0, Math.min(segment.leftPercent, 52))}%;`}>
                      <strong class="application-text-caption block text-app-text">{statusLabel(segment.status)}</strong>
                      <span class="application-text-caption mt-1 block text-app-text-soft">
                        {clock(segment.startedAt)}–{clock(segment.endedAt)}
                      </span>
                      <span class="application-text-meta mt-1 block text-app-text-soft">Duração: {duration(segment.minutes)}</span>
                    </div>
                  {/if}
                {/each}
              </div>
              <div class="application-text-meta mt-1 flex justify-between text-app-text-soft">
                <span>{presence.schedule.start}</span><span>{presence.schedule.end}</span>
              </div>
            {:else}
              <span class="application-text-meta text-app-text-soft">Sem expediente configurado para o dia</span>
            {/if}
          </div>
          <strong class="application-text-caption text-app-text">
            {user.onlinePercent === null ? "—" : `${user.onlinePercent.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}%`}
          </strong>
        </article>
      {:else}
        <div class="p-8 text-center">
          <Users size={25} class="mx-auto mb-2 text-app-text-soft"/>
          <p class="application-text-caption text-app-text-soft">Nenhum atendente encontrado.</p>
        </div>
      {/each}
    </div>
  </div>
  <p class="application-text-caption text-app-text-soft">
    O percentual considera apenas o expediente já transcorrido. Online e ocupado contam como presença conectada; ausência e offline não contam.
    Os registros começam após a implantação do histórico, sem reconstrução retroativa.
  </p>
</section>

<style>
  .online-state { background: var(--app-success-bg); color: var(--app-success-text); }
  .busy-state { background: var(--app-warning-bg); color: var(--app-warning-text); }
  .online-line { background: #32965a; }
  .busy-line { background: #d99424; }
  .away-line { background: #b8bec9; }
  .future-line { background: #e7ebf0; }
  .untracked-line { background: repeating-linear-gradient(45deg, #aeb6c2 0, #aeb6c2 2px, #e7ebf0 2px, #e7ebf0 5px); }
</style>
