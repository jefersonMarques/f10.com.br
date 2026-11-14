<script lang="ts">
  import { navigating, page } from "$app/stores";
  import { onDestroy, onMount } from "svelte";
  import {
    Bell,
    Building2,
    ChevronDown,
    LoaderCircle,
    LogOut,
    UserCircle,
  } from "lucide-svelte";
  import ApplicationHeader from "$lib/components/application/ApplicationHeader.svelte";
  import ApplicationSidebar from "$lib/components/application/ApplicationSidebar.svelte";
  import ActiveChatDock from "$lib/components/operations/ActiveChatDock.svelte";
  import GoogleCalendarSyncPulse from "$lib/components/operations/GoogleCalendarSyncPulse.svelte";
  import HelpVideoProcessingPulse from "$lib/components/operations/HelpVideoProcessingPulse.svelte";
  import NotificationAlertStack from "$lib/components/operations/NotificationAlertStack.svelte";
  import DevicePushSettings from "$lib/components/operations/DevicePushSettings.svelte";
  import { resolveOperationsRouteMetadata } from "$lib/application/routeMetadata";
  import type { LayoutData } from "./$types";

  export let data: LayoutData;

  let sidebarCollapsed = true;
  let notificationOpen = false;
  let presenceOpen = false;
  let profileOpen = false;
  let presenceMenu: HTMLDivElement;
  let notificationMenu: HTMLDivElement;
  let profileMenu: HTMLDivElement;

  function closeMenusOnOutside(event: PointerEvent): void {
    const target = event.target as Node;
    if (presenceOpen && !presenceMenu?.contains(target)) presenceOpen = false;
    if (notificationOpen && !notificationMenu?.contains(target)) {
      notificationOpen = false;
    }
    if (profileOpen && !profileMenu?.contains(target)) profileOpen = false;
  }

  function closeMenusOnEscape(event: KeyboardEvent): void {
    if (event.key !== "Escape") return;
    presenceOpen = false;
    notificationOpen = false;
    profileOpen = false;
  }

  function closeMenusOnPageScroll(event: Event): void {
    const target = event.target;
    if (target instanceof Node &&
        (presenceMenu?.contains(target) || notificationMenu?.contains(target) ||
          profileMenu?.contains(target))) return;
    presenceOpen = false;
    notificationOpen = false;
    profileOpen = false;
  }
  let notificationTimer: ReturnType<typeof setInterval> | null = null;
  let notificationStream: EventSource | null = null;
  let notificationRefreshInFlight = false;
  let presenceTimer: ReturnType<typeof setInterval> | null = null;
  let notifications = data.notifications;
  let presence = data.presence;
  let lastHeartbeatAt = 0;
  const permissionCodes = new Set(data.permissions.map((permission) => permission.code));
  const canRespondToChat = permissionCodes.has("chat.respond");
  const canTrackPresence = canRespondToChat || permissionCodes.has("tickets.reply");
  const canViewCustomers = permissionCodes.has("customers.view");
  const canTrackHelpVideoProcessing =
    permissionCodes.has("help.view") || permissionCodes.has("help.edit");
  const canUseGoogleCalendar = [
    "tasks.view",
    "tickets.view",
    "scheduling.view",
    "scheduling.create",
    "integrations.view",
  ].some((permissionCode) => permissionCodes.has(permissionCode));

  $: notifications = data.notifications;
  $: pathname = $page.url.pathname;
  $: compactMovideskPreview = /^\/app\/help\/content\/[0-9a-f-]+\/preview$/.test(pathname)
    && $page.url.searchParams.get("movideskReview") === "1";
  $: calendarNavigationLoading = Boolean(
    $navigating?.to?.url.pathname.startsWith("/app/tasks/calendar"),
  );
  $: routeMetadata = resolveOperationsRouteMetadata(pathname);
  $: customerProfileId = canViewCustomers ? resolvePageCustomerId($page.data) : null;

  function resolvePageCustomerId(pageData: unknown): string | null {
    if (!pageData || typeof pageData !== "object") return null;
    const record = pageData as Record<string, unknown>;

    const details = record.details;
    if (details && typeof details === "object") {
      const ticket = (details as Record<string, unknown>).ticket;
      if (ticket && typeof ticket === "object") {
        const customerContactId = (ticket as Record<string, unknown>).customerContactId;
        if (typeof customerContactId === "string" && customerContactId) return customerContactId;
      }
    }

    const initial = record.initial;
    if (initial && typeof initial === "object") {
      const chat = (initial as Record<string, unknown>).chat;
      if (chat && typeof chat === "object") {
        const customerContactId = (chat as Record<string, unknown>).customerContactId;
        if (typeof customerContactId === "string" && customerContactId) return customerContactId;
      }
    }

    return null;
  }

  function formatNotificationDate(value: string | Date): string {
    return new Intl.DateTimeFormat("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(value));
  }

  function presenceLabel(status?: string): string {
    if (status === "online") return "Online";
    if (status === "busy") return "Ocupado";
    if (status === "away") return "Ausente";
    return "Offline";
  }

  function presenceDotClass(status?: string): string {
    if (status === "online") return "bg-[#2F9E5B]";
    if (status === "busy") return "bg-[#E59A2F]";
    if (status === "away") return "bg-[#A6ABB7]";
    return "bg-[#C7CBD4]";
  }

  async function refreshNotifications(): Promise<void> {
    if (notificationRefreshInFlight || document.hidden) return;
    notificationRefreshInFlight = true;
    try {
      const response = await fetch("/app/notifications/summary", {
        cache: "no-store",
        headers: { "Accept": "application/json" },
      });
      if (response.ok) notifications = await response.json() as typeof notifications;
    } catch {
      // Falhas temporárias não interrompem a navegação.
    } finally {
      notificationRefreshInFlight = false;
    }
  }

  async function refreshPresence(): Promise<void> {
    if (!canTrackPresence) return;
    try {
      const response = await fetch("/api/app/presence", { cache: "no-store" });
      if (response.ok) presence = await response.json() as typeof presence;
    } catch {
      // Presença é auxiliar e não deve interromper o painel.
    }
  }

  async function setPresenceStatus(status: "online" | "busy" | "offline"): Promise<void> {
    try {
      const response = await fetch("/api/app/presence", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "status", status }),
      });
      if (response.ok) {
        presence = await response.json() as typeof presence;
        presenceOpen = false;
        lastHeartbeatAt = Date.now();
      }
    } catch {
      // Mantém o último estado conhecido para nova tentativa explícita.
    }
  }

  async function heartbeatPresence(): Promise<void> {
    if (!canTrackPresence || !presence || presence.manualStatus === "offline") return;
    const now = Date.now();
    if (now - lastHeartbeatAt < 60_000) return;
    lastHeartbeatAt = now;
    try {
      const response = await fetch("/api/app/presence", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "heartbeat" }),
      });
      if (response.ok) presence = await response.json() as typeof presence;
    } catch {
      // A próxima interação real tenta novamente.
    }
  }

  onMount(() => {
    const syncNotifications = () => {
      if (!document.hidden) void refreshNotifications();
    };
    notificationTimer = setInterval(syncNotifications, 8_000);
    // Server events update badge and toast as soon as changes are persisted.
    // Polling remains a fallback if a reverse proxy buffers or blocks the stream.
    if (typeof EventSource !== "undefined") {
      notificationStream = new EventSource("/app/notifications/events");
      notificationStream.onmessage = (event) => {
        try {
          const next = JSON.parse(event.data);
          if (typeof next?.unreadCount === "number" && Array.isArray(next.recent)) {
            notifications = next as typeof notifications;
          }
        } catch { /* Ignore malformed stream messages. */ }
      };
    }
    document.addEventListener("visibilitychange", syncNotifications);
    window.addEventListener("focus", syncNotifications);
    window.addEventListener("pageshow", syncNotifications);
    window.addEventListener("f10:notifications:changed", syncNotifications);
    syncNotifications();

    if (canTrackPresence) {
      presenceTimer = setInterval(() => void refreshPresence(), 60_000);
      const handleActivity = () => void heartbeatPresence();
      window.addEventListener("pointerdown", handleActivity, { passive: true });
      window.addEventListener("keydown", handleActivity, { passive: true });
      window.addEventListener("touchstart", handleActivity, { passive: true });
      return () => {
        document.removeEventListener("visibilitychange", syncNotifications);
        window.removeEventListener("focus", syncNotifications);
        window.removeEventListener("pageshow", syncNotifications);
        window.removeEventListener("f10:notifications:changed", syncNotifications);
        window.removeEventListener("pointerdown", handleActivity);
        window.removeEventListener("keydown", handleActivity);
        window.removeEventListener("touchstart", handleActivity);
      };
    }
    return () => {
      document.removeEventListener("visibilitychange", syncNotifications);
      window.removeEventListener("focus", syncNotifications);
      window.removeEventListener("pageshow", syncNotifications);
      window.removeEventListener("f10:notifications:changed", syncNotifications);
    };
  });

  onDestroy(() => {
    notificationStream?.close();
    notificationStream = null;
    if (notificationTimer) clearInterval(notificationTimer);
    if (presenceTimer) clearInterval(presenceTimer);
  });
</script>

<svelte:head>
  <meta name="robots" content="noindex,nofollow,noarchive" />
  <meta name="googlebot" content="noindex,nofollow,noarchive" />
</svelte:head>

<svelte:window on:pointerdown={closeMenusOnOutside}
  on:keydown={closeMenusOnEscape} on:scroll|capture={closeMenusOnPageScroll}/>

{#if compactMovideskPreview}
  <div class="application-ui min-h-screen bg-[#F5F6FA] py-4"><slot /></div>
{:else}
<div class={`application-ui operations-shell min-h-[100dvh] bg-[#F5F6FA] text-[#010D28] transition-[grid-template-columns] duration-200 lg:grid ${sidebarCollapsed ? "lg:grid-cols-[76px_minmax(0,1fr)]" : "lg:grid-cols-[256px_minmax(0,1fr)]"}`}>
  <ApplicationSidebar
    bind:collapsed={sidebarCollapsed}
    permissions={data.permissions}
    roles={data.roles}
    {notifications}
  />

  <main class="min-w-0">
    <ApplicationHeader
      title={routeMetadata.title}
      section={routeMetadata.section}
      description={routeMetadata.description}
    >
      <svelte:fragment slot="actions">
        {#if customerProfileId}
          <a href={`/app/customers/${customerProfileId}`} class="application-text-caption inline-flex h-10 items-center gap-2 rounded-xl border border-[#DDE1EA] bg-white px-2.5 font-semibold text-[#000A57] transition hover:bg-[#F8F9FF] sm:px-3" aria-label="Abrir ficha do cliente">
            <Building2 size={15} aria-hidden="true" />
            <span class="hidden md:inline">Cliente</span>
          </a>
        {/if}

        <HelpVideoProcessingPulse enabled={canTrackHelpVideoProcessing} />

        {#if canTrackPresence && presence}
          <div bind:this={presenceMenu} class="relative hidden sm:block">
            <button type="button" on:click={() => { presenceOpen = !presenceOpen; profileOpen = false; notificationOpen = false; }} class="application-text-caption flex h-10 items-center gap-2 rounded-xl bg-[var(--app-surface-muted)] px-3 font-semibold text-[var(--app-text)] transition hover:bg-[var(--app-surface-muted)]" aria-expanded={presenceOpen}>
              <span class={`h-2.5 w-2.5 rounded-full ${presenceDotClass(presence.effectiveStatus)}`}></span>
              {presenceLabel(presence.effectiveStatus)}
              <ChevronDown size={13}/>
            </button>
            {#if presenceOpen}
              <div class="absolute right-0 top-12 z-50 max-h-[calc(100dvh-90px)] w-44 overflow-y-auto rounded-xl border border-[var(--app-border)] bg-[var(--app-surface)] p-1.5 text-[var(--app-text)] shadow-xl">
                <button type="button" on:click={() => void setPresenceStatus("online")} class="application-text-caption flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left font-semibold text-[var(--app-text)] hover:bg-[var(--app-surface-muted)]"><span class="h-2.5 w-2.5 rounded-full bg-[#2F9E5B]"></span>Online</button>
                <button type="button" on:click={() => void setPresenceStatus("busy")} class="application-text-caption flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left font-semibold text-[var(--app-text)] hover:bg-[var(--app-surface-muted)]"><span class="h-2.5 w-2.5 rounded-full bg-[#E59A2F]"></span>Ocupado</button>
                <button type="button" on:click={() => void setPresenceStatus("offline")} class="application-text-caption flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left font-semibold text-[var(--app-text)] hover:bg-[var(--app-surface-muted)]"><span class="h-2.5 w-2.5 rounded-full bg-[#C7CBD4]"></span>Offline</button>
                {#if presence.effectiveStatus === "away"}<p class="application-text-meta mt-1 border-t border-[var(--app-border-soft)] px-3 pt-2 leading-4 text-[var(--app-text-muted)]">Ausente por inatividade. Uma nova interação no painel restaura seu estado.</p>{/if}
              </div>
            {/if}
          </div>
        {/if}

        <div bind:this={notificationMenu} class="relative">
          <button
            type="button"
            class="relative flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--app-surface-muted)] text-[var(--app-text)] transition hover:bg-[var(--app-surface-muted)] hover:text-[#000A57]"
            aria-label="Notificações"
            aria-expanded={notificationOpen}
            on:click={() => { notificationOpen = !notificationOpen; profileOpen = false; presenceOpen = false; }}
          >
            <Bell size={18} aria-hidden="true" />
            {#if notifications.unreadCount > 0}
              <span class="application-text-meta absolute -right-1 -top-1 inline-flex min-w-5 items-center justify-center rounded-full border-2 border-white bg-[#D92D20] px-1 font-bold leading-4 text-white">{Math.min(notifications.unreadCount, 99)}</span>
            {/if}
          </button>

          {#if notificationOpen}
            <div class="absolute right-0 top-12 z-50 max-h-[calc(100dvh-90px)] w-[min(360px,calc(100vw-2rem))] overflow-y-auto overscroll-contain rounded-xl border border-[var(--app-border)] bg-[var(--app-surface)] text-[var(--app-text)] shadow-2xl shadow-slate-900/15">
              <div class="flex items-center justify-between border-b border-[var(--app-border-soft)] px-4 py-3">
                <div><strong class="block text-[12px] text-[var(--app-text)]">Notificações</strong><span class="application-text-meta text-[var(--app-text-muted)]">{notifications.unreadCount} não lida(s)</span></div>
                {#if notifications.unreadCount > 0}
                  <form method="POST" action="/app/notifications/read-all"><button type="submit" class="application-text-meta font-semibold text-[#000A57] hover:underline">Marcar todas como lidas</button></form>
                {/if}
              </div>

              <DevicePushSettings />
              {#if notifications.recent.length > 0}
                <div class="max-h-[420px] overflow-y-auto p-1.5">
                  {#each notifications.recent as notification}
                    <a
                      href={`/app/notifications/open/${notification.id}`}
                      class={`block rounded-xl px-3 py-3 transition hover:bg-[var(--app-surface-muted)] ${notification.readAt ? "opacity-65" : "bg-[var(--app-surface-subtle)]"}`}
                    >
                      <div class="flex items-start gap-2.5">
                        <span class={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${notification.readAt ? "bg-[#D5D8E0]" : "bg-[#D92D20]"}`}></span>
                        <span class="min-w-0 flex-1">
                          <strong class="application-text-caption block font-semibold leading-4 text-[var(--app-text)]">{notification.title}</strong>
                          {#if notification.body}<span class="application-text-meta mt-1 line-clamp-2 block leading-4 text-[var(--app-text-muted)]">{notification.body}</span>{/if}
                          <span class="application-text-meta mt-1.5 block text-[var(--app-text-muted)]">{formatNotificationDate(notification.createdAt)}</span>
                        </span>
                      </div>
                    </a>
                  {/each}
                </div>
              {:else}
                <p class="application-text-caption px-5 py-8 text-center text-[var(--app-text-muted)]">Nenhuma notificação por enquanto.</p>
              {/if}
            </div>
          {/if}
        </div>

        <div bind:this={profileMenu} class="relative">
          <button
            type="button"
            class="flex h-10 items-center gap-1.5 rounded-xl bg-[var(--app-surface-muted)] px-1.5 text-[var(--app-text)] transition hover:bg-[var(--app-surface-muted)] hover:text-[#000A57]"
            aria-label="Menu do perfil"
            aria-expanded={profileOpen}
            on:click={() => { profileOpen = !profileOpen; notificationOpen = false; presenceOpen = false; }}
          >
            <span class="flex h-7 w-7 shrink-0 items-center justify-center overflow-hidden rounded-full bg-[var(--app-surface)] text-[#000A57] ring-1 ring-[var(--app-border)]">
              {#if data.user.hasAvatar}
                <img src="/app/minha-conta/avatar" alt="" class="h-full w-full object-cover" />
              {:else}
                <UserCircle size={19} aria-hidden="true" />
              {/if}
            </span>
            <ChevronDown size={13} class="shrink-0" />
          </button>

          {#if profileOpen}
            <div class="absolute right-0 top-12 z-50 max-h-[calc(100dvh-90px)] w-[min(260px,calc(100vw-2rem))] overflow-y-auto rounded-xl border border-[var(--app-border)] bg-[var(--app-surface)] text-[var(--app-text)] shadow-2xl shadow-slate-900/15">
              <a
                href="/app/minha-conta"
                on:click={() => (profileOpen = false)}
                class="flex items-center gap-3 px-4 py-4 transition hover:bg-[var(--app-surface-muted)]"
              >
                <span class="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-[var(--app-surface-muted)] text-[#000A57] ring-1 ring-[var(--app-border)]">
                  {#if data.user.hasAvatar}
                    <img src="/app/minha-conta/avatar" alt="Avatar de {data.user.name}" class="h-full w-full object-cover" />
                  {:else}
                    <UserCircle size={22} aria-hidden="true" />
                  {/if}
                </span>
                <span class="min-w-0 flex-1">
                  <strong class="block truncate text-[12px] font-semibold text-[var(--app-text)]">{data.user.name}</strong>
                  <span class="application-text-meta mt-0.5 block truncate text-[var(--app-text-muted)]">{data.user.email}</span>
                </span>
              </a>

              <form method="POST" action="/app/logout" class="border-t border-[var(--app-border-soft)] p-1.5">
                <button type="submit" class="application-text-caption flex min-h-10 w-full items-center gap-2 rounded-xl px-3 text-left font-semibold text-[var(--app-text)] transition hover:bg-[#FFF0F0] hover:text-[#A52A2A]">
                  <LogOut size={17} aria-hidden="true"/>
                  Sair
                </button>
              </form>
            </div>
          {/if}
        </div>
      </svelte:fragment>
    </ApplicationHeader>

    {#if calendarNavigationLoading}
      <div class="fixed right-4 top-[82px] z-[190] flex max-w-[320px] items-center gap-3 rounded-2xl border border-[#DDE1EA] bg-white px-4 py-3 shadow-xl shadow-slate-900/10" role="status" aria-live="polite">
        <LoaderCircle size={18} class="shrink-0 animate-spin text-[#000A57]" aria-hidden="true"/>
        <span class="min-w-0">
          <strong class="block text-[11px] font-semibold text-[#303746]">Carregando agenda...</strong>
          <span class="application-text-meta mt-0.5 block text-[#858B99]">Buscando compromissos e sincronizações.</span>
        </span>
      </div>
    {/if}

    <slot />
    <NotificationAlertStack notifications={notifications.recent} />
    <ActiveChatDock enabled={canRespondToChat} />
    <GoogleCalendarSyncPulse enabled={canUseGoogleCalendar} />
  </main>
</div>
{/if}
