<script lang="ts">
  import { page } from "$app/stores";
  import { onDestroy, onMount } from "svelte";
  import {
    Bell,
    Building2,
    ChevronDown,
    LogOut,
    UserCircle,
  } from "lucide-svelte";
  import ApplicationHeader from "$lib/components/application/ApplicationHeader.svelte";
  import ApplicationSidebar from "$lib/components/application/ApplicationSidebar.svelte";
  import ActiveChatDock from "$lib/components/operations/ActiveChatDock.svelte";
  import GoogleCalendarSyncPulse from "$lib/components/operations/GoogleCalendarSyncPulse.svelte";
  import NotificationAlertStack from "$lib/components/operations/NotificationAlertStack.svelte";
  import { resolveOperationsRouteMetadata } from "$lib/application/routeMetadata";
  import type { LayoutData } from "./$types";

  export let data: LayoutData;

  let sidebarCollapsed = false;
  let notificationOpen = false;
  let presenceOpen = false;
  let profileOpen = false;
  let notificationTimer: ReturnType<typeof setInterval> | null = null;
  let presenceTimer: ReturnType<typeof setInterval> | null = null;
  let notifications = data.notifications;
  let presence = data.presence;
  let lastHeartbeatAt = 0;
  const permissionCodes = new Set(data.permissions.map((permission) => permission.code));
  const canRespondToChat = permissionCodes.has("chat.respond");
  const canViewCustomers = permissionCodes.has("customers.view");
  const canUseGoogleCalendar = [
    "tasks.view",
    "tickets.view",
    "scheduling.view",
    "scheduling.create",
    "integrations.view",
  ].some((permissionCode) => permissionCodes.has(permissionCode));

  $: notifications = data.notifications;
  $: pathname = $page.url.pathname;
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
    try {
      const response = await fetch("/app/notifications/summary", { cache: "no-store" });
      if (response.ok) notifications = await response.json() as typeof notifications;
    } catch {
      // A próxima consulta tenta novamente sem interromper o painel.
    }
  }

  async function refreshPresence(): Promise<void> {
    if (!canRespondToChat) return;
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
    if (!canRespondToChat || !presence || presence.manualStatus === "offline") return;
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
    notificationTimer = setInterval(() => void refreshNotifications(), 8_000);
    if (canRespondToChat) {
      presenceTimer = setInterval(() => void refreshPresence(), 60_000);
      const handleActivity = () => void heartbeatPresence();
      window.addEventListener("pointerdown", handleActivity, { passive: true });
      window.addEventListener("keydown", handleActivity, { passive: true });
      window.addEventListener("touchstart", handleActivity, { passive: true });
      return () => {
        window.removeEventListener("pointerdown", handleActivity);
        window.removeEventListener("keydown", handleActivity);
        window.removeEventListener("touchstart", handleActivity);
      };
    }
  });

  onDestroy(() => {
    if (notificationTimer) clearInterval(notificationTimer);
    if (presenceTimer) clearInterval(presenceTimer);
  });
</script>

<svelte:head>
  <meta name="robots" content="noindex,nofollow,noarchive" />
  <meta name="googlebot" content="noindex,nofollow,noarchive" />
</svelte:head>

<div class={`application-ui operations-shell min-h-[100dvh] bg-[#F5F6FA] text-[#010D28] transition-[grid-template-columns] duration-200 lg:grid ${sidebarCollapsed ? "lg:grid-cols-[76px_minmax(0,1fr)]" : "lg:grid-cols-[256px_minmax(0,1fr)]"}`}>
  <ApplicationSidebar
    bind:collapsed={sidebarCollapsed}
    permissions={data.permissions}
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

        {#if canRespondToChat && presence}
          <div class="relative hidden sm:block">
            <button type="button" on:click={() => (presenceOpen = !presenceOpen)} class="application-text-caption flex h-10 items-center gap-2 rounded-xl bg-[#F5F6FA] px-3 font-semibold text-[#555C6D] transition hover:bg-[#EEF0FF]" aria-expanded={presenceOpen}>
              <span class={`h-2.5 w-2.5 rounded-full ${presenceDotClass(presence.effectiveStatus)}`}></span>
              {presenceLabel(presence.effectiveStatus)}
              <ChevronDown size={13}/>
            </button>
            {#if presenceOpen}
              <div class="absolute right-0 top-12 z-50 w-44 overflow-hidden rounded-xl border border-[#E1E4EC] bg-white p-1.5 shadow-xl">
                <button type="button" on:click={() => void setPresenceStatus("online")} class="application-text-caption flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left font-semibold text-[#434A5A] hover:bg-[#F6F7FB]"><span class="h-2.5 w-2.5 rounded-full bg-[#2F9E5B]"></span>Online</button>
                <button type="button" on:click={() => void setPresenceStatus("busy")} class="application-text-caption flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left font-semibold text-[#434A5A] hover:bg-[#F6F7FB]"><span class="h-2.5 w-2.5 rounded-full bg-[#E59A2F]"></span>Ocupado</button>
                <button type="button" on:click={() => void setPresenceStatus("offline")} class="application-text-caption flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left font-semibold text-[#434A5A] hover:bg-[#F6F7FB]"><span class="h-2.5 w-2.5 rounded-full bg-[#C7CBD4]"></span>Offline</button>
                {#if presence.effectiveStatus === "away"}<p class="application-text-meta mt-1 border-t border-[#EEF0F5] px-3 pt-2 leading-4 text-[#8A909E]">Ausente por inatividade. Uma nova interação no painel restaura seu estado.</p>{/if}
              </div>
            {/if}
          </div>
        {/if}

        <div class="relative">
          <button
            type="button"
            class="relative flex h-10 w-10 items-center justify-center rounded-xl bg-[#F5F6FA] text-[#555C6D] transition hover:bg-[#EEF0FF] hover:text-[#000A57]"
            aria-label="Notificações"
            aria-expanded={notificationOpen}
            on:click={() => (notificationOpen = !notificationOpen)}
          >
            <Bell size={18} aria-hidden="true" />
            {#if notifications.unreadCount > 0}
              <span class="application-text-meta absolute -right-1 -top-1 inline-flex min-w-5 items-center justify-center rounded-full border-2 border-white bg-[#D92D20] px-1 font-bold leading-4 text-white">{Math.min(notifications.unreadCount, 99)}</span>
            {/if}
          </button>

          {#if notificationOpen}
            <div class="absolute right-0 top-12 z-50 w-[min(360px,calc(100vw-2rem))] overflow-hidden rounded-2xl border border-[#E1E4EC] bg-white shadow-2xl shadow-slate-900/15">
              <div class="flex items-center justify-between border-b border-[#EEF0F5] px-4 py-3">
                <div><strong class="block text-[12px] text-[#202637]">Notificações</strong><span class="application-text-meta text-[#8B909E]">{notifications.unreadCount} não lida(s)</span></div>
                {#if notifications.unreadCount > 0}
                  <form method="POST" action="/app/notifications/read-all"><button type="submit" class="application-text-meta font-semibold text-[#000A57] hover:underline">Marcar todas como lidas</button></form>
                {/if}
              </div>

              {#if notifications.recent.length > 0}
                <div class="max-h-[420px] overflow-y-auto p-1.5">
                  {#each notifications.recent as notification}
                    <a
                      href={`/app/notifications/open/${notification.id}`}
                      class={`block rounded-xl px-3 py-3 transition hover:bg-[#F6F7FB] ${notification.readAt ? "opacity-65" : "bg-[#F8F9FF]"}`}
                    >
                      <div class="flex items-start gap-2.5">
                        <span class={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${notification.readAt ? "bg-[#D5D8E0]" : "bg-[#D92D20]"}`}></span>
                        <span class="min-w-0 flex-1">
                          <strong class="application-text-caption block font-semibold leading-4 text-[#313747]">{notification.title}</strong>
                          {#if notification.body}<span class="application-text-meta mt-1 line-clamp-2 block leading-4 text-[#747A89]">{notification.body}</span>{/if}
                          <span class="application-text-meta mt-1.5 block text-[#9A9EAA]">{formatNotificationDate(notification.createdAt)}</span>
                        </span>
                      </div>
                    </a>
                  {/each}
                </div>
              {:else}
                <p class="application-text-caption px-5 py-8 text-center text-[#8B909E]">Nenhuma notificação por enquanto.</p>
              {/if}
            </div>
          {/if}
        </div>

        <div class="relative">
          <button
            type="button"
            class="flex h-10 min-w-10 items-center gap-2 rounded-xl bg-[#F5F6FA] px-2.5 text-[#555C6D] transition hover:bg-[#EEF0FF] hover:text-[#000A57]"
            aria-label="Menu do perfil"
            aria-expanded={profileOpen}
            on:click={() => (profileOpen = !profileOpen)}
          >
            <UserCircle size={20} class="shrink-0 text-[#000A57]" />
            <span class="hidden max-w-36 truncate text-[11px] font-semibold md:block">{data.user.name}</span>
            <ChevronDown size={13} class="hidden shrink-0 sm:block" />
          </button>

          {#if profileOpen}
            <div class="absolute right-0 top-12 z-50 w-[min(280px,calc(100vw-2rem))] overflow-hidden rounded-2xl border border-[#E1E4EC] bg-white p-2 shadow-2xl shadow-slate-900/15">
              <div class="rounded-xl bg-[#F7F8FB] px-3 py-3">
                <div class="flex items-start gap-3">
                  <span class="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white text-[#000A57] shadow-sm"><UserCircle size={20}/></span>
                  <span class="min-w-0 flex-1">
                    <strong class="block truncate text-[12px] text-[#202637]">{data.user.name}</strong>
                    <span class="application-text-meta mt-1 block truncate text-[#777D8D]">{data.user.email}</span>
                  </span>
                </div>
                {#if data.roles.length > 0}
                  <div class="mt-3 flex flex-wrap gap-1.5">
                    {#each data.roles as role}
                      <span class="application-text-meta rounded-full bg-white px-2 py-1 font-bold tracking-[0.04em] text-[#000A57] shadow-sm">{role}</span>
                    {/each}
                  </div>
                {/if}
              </div>

              <a
                href="/app/minha-conta"
                on:click={() => (profileOpen = false)}
                class="application-text-caption mt-1 flex min-h-10 items-center gap-2 rounded-xl px-3 font-semibold text-[#434A5A] transition hover:bg-[#F6F7FB]"
              >
                <UserCircle size={17} aria-hidden="true"/>
                Minha conta
              </a>

              <form method="POST" action="/app/logout" class="mt-1 border-t border-[#EEF0F5] pt-1">
                <button type="submit" class="application-text-caption flex min-h-10 w-full items-center gap-2 rounded-xl px-3 text-left font-semibold text-[#6D7280] transition hover:bg-[#FFF0F0] hover:text-[#A52A2A]">
                  <LogOut size={17} aria-hidden="true"/>
                  Sair
                </button>
              </form>
            </div>
          {/if}
        </div>
      </svelte:fragment>
    </ApplicationHeader>
    <slot />
    <NotificationAlertStack notifications={notifications.recent} />
    <ActiveChatDock enabled={canRespondToChat} />
    <GoogleCalendarSyncPulse enabled={canUseGoogleCalendar} />
  </main>
</div>
