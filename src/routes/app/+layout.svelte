<script lang="ts">
  import { page } from "$app/stores";
  import { onDestroy, onMount } from "svelte";
  import {
    BarChart3,
    Bell,
    BookOpen,
    CheckSquare2,
    ChevronDown,
    ChevronRight,
    Headphones,
    LayoutDashboard,
    LogOut,
    MessageCircleMore,
    MonitorCog,
    Search,
    Settings,
    ShieldCheck,
    UserCircle,
    Users,
  } from "lucide-svelte";
  import type { LayoutData } from "./$types";

  export let data: LayoutData;

  let notificationOpen = false;
  let presenceOpen = false;
  let notificationTimer: ReturnType<typeof setInterval> | null = null;
  let presenceTimer: ReturnType<typeof setInterval> | null = null;
  let notifications = data.notifications;
  let presence = data.presence;
  let lastHeartbeatAt = 0;
  const permissionCodes = new Set(data.permissions.map((permission) => permission.code));
  const canRespondToChat = permissionCodes.has("chat.respond");

  const navigationItems = [
    { label: "Visão geral", icon: LayoutDashboard, enabled: true, href: "/app" },
    { label: "Base de Conhecimento", icon: BookOpen, enabled: true, href: "/app/help/content", permission: "help.view" },
    { label: "Pesquisa de Suporte", icon: Search, enabled: true, href: "/app/help/search", permission: "help.view" },
    { label: "Insights da Central", icon: BarChart3, enabled: true, href: "/app/help/insights", permission: "help.view" },
    { label: "Tarefas", icon: CheckSquare2, enabled: true, href: "/app/tasks", permission: "tasks.view" },
    { label: "Tickets", icon: Headphones, enabled: true, href: "/app/tickets", permission: "tickets.view" },
    { label: "Chat", icon: MessageCircleMore, enabled: true, href: "/app/chat", permission: "chat.view" },
    { label: "Acesso remoto", icon: MonitorCog, enabled: true, href: "/app/remote", permission: "remote.use" },
    { label: "Performance", icon: BarChart3, enabled: true, href: "/app/performance", permission: "reports.view" },
    { label: "Equipe", icon: Users, enabled: true, href: "/app/team", permission: "users.view" },
    { label: "Configurações", icon: Settings, enabled: true, href: "/app/settings", permission: "system.settings.manage" },
  ];

  $: notifications = data.notifications;
  $: visibleNavigationItems = navigationItems.filter(
    (item) => !item.permission || permissionCodes.has(item.permission),
  );
  $: pathname = $page.url.pathname;

  function isActiveNavigationItem(href?: string): boolean {
    if (!href) return false;
    if (href === "/app") return pathname === href;
    return pathname === href || pathname.startsWith(`${href}/`);
  }

  function navigationBadge(href?: string): number {
    if (href === "/app/tickets") return notifications.ticketUnreadCount;
    if (href === "/app/tasks") return notifications.taskUnreadCount;
    return 0;
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
    notificationTimer = setInterval(() => void refreshNotifications(), 20_000);
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

<div class="operations-shell min-h-[100dvh] bg-[#F5F6FA] text-[#010D28] lg:grid lg:grid-cols-[270px_minmax(0,1fr)]">
  <aside class="border-b border-[#E2E5ED] bg-white lg:min-h-[100dvh] lg:border-b-0 lg:border-r">
    <div class="flex h-full flex-col">
      <div class="flex h-[78px] items-center justify-between border-b border-[#EEF0F5] px-5 lg:px-6">
        <a href="/app" class="flex items-center gap-3">
          <span class="flex h-10 w-10 items-center justify-center rounded-xl bg-[#000A57] text-sm font-bold text-white">F10</span>
          <span><strong class="block text-[14px] font-semibold leading-4">Operations</strong><small class="mt-1 block text-[11px] font-medium text-[#8A8F9D]">Área interna</small></span>
        </a>
        <ShieldCheck class="text-[#EA6D0B] lg:hidden" size={21} aria-hidden="true" />
      </div>

      <nav class="hidden flex-1 px-3 py-5 lg:block" aria-label="Navegação principal">
        <p class="px-3 pb-2 text-[10px] font-bold uppercase tracking-[0.14em] text-[#9A9FAD]">Operação</p>
        <div class="space-y-1">
          {#each visibleNavigationItems as item}
            {#if item.enabled && item.href}
              <a href={item.href} class={`flex min-h-11 items-center gap-3 rounded-xl px-3 text-[13px] font-semibold transition ${isActiveNavigationItem(item.href) ? "bg-[#EEF0FF] text-[#000A57]" : "text-[#676D7D] hover:bg-[#F7F8FB] hover:text-[#000A57]"}`}>
                <svelte:component this={item.icon} size={19} aria-hidden="true" />
                <span class="flex-1">{item.label}</span>
                {#if navigationBadge(item.href) > 0}
                  <span class="inline-flex min-w-5 items-center justify-center rounded-full bg-[#D92D20] px-1.5 py-0.5 text-[9px] font-bold text-white">{Math.min(navigationBadge(item.href), 99)}</span>
                {:else}
                  <ChevronRight size={15} aria-hidden="true" />
                {/if}
              </a>
            {:else}
              <div class="flex min-h-11 items-center gap-3 rounded-xl px-3 text-[13px] font-medium text-[#707687]"><svelte:component this={item.icon} size={19} aria-hidden="true" /><span class="flex-1">{item.label}</span><span class="rounded-full bg-[#F0F1F5] px-2 py-1 text-[9px] font-bold uppercase tracking-[0.08em] text-[#8A8F9D]">Em breve</span></div>
            {/if}
          {/each}
        </div>
      </nav>

      <div class="hidden border-t border-[#EEF0F5] p-4 lg:block">
        <a href="/app/minha-conta" class="block rounded-2xl bg-[#F7F8FB] p-3 transition hover:bg-[#EEF0FF]">
          <div class="flex items-start gap-3">
            <span class="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white text-[#000A57] shadow-sm"><UserCircle size={20} /></span>
            <span class="min-w-0 flex-1">
              <span class="block truncate text-[13px] font-semibold text-[#202637]">{data.user.name}</span>
              <span class="mt-1 block truncate text-[11px] text-[#777D8D]">{data.user.email}</span>
            </span>
          </div>
          <div class="mt-3 flex flex-wrap gap-1.5">{#each data.roles as role}<span class="rounded-full bg-white px-2 py-1 text-[9px] font-bold tracking-[0.04em] text-[#000A57] shadow-sm">{role}</span>{/each}</div>
        </a>
        <form method="POST" action="/app/logout" class="mt-2"><button type="submit" class="flex h-10 w-full items-center gap-2 rounded-xl px-3 text-left text-[12px] font-semibold text-[#6D7280] transition hover:bg-[#FFF0F0] hover:text-[#A52A2A]"><LogOut size={17} aria-hidden="true" />Sair</button></form>
      </div>
    </div>
  </aside>

  <main class="min-w-0">
    <header class="relative flex h-[78px] items-center justify-between border-b border-[#E2E5ED] bg-white px-5 sm:px-8">
      <div><p class="text-[10px] font-bold uppercase tracking-[0.14em] text-[#EA6D0B]">F10 Operations</p><p class="mt-1 text-[14px] font-semibold text-[#33394A]">Ambiente operacional interno</p></div>
      <div class="flex items-center gap-2 sm:gap-3">
        {#if canRespondToChat && presence}
          <div class="relative hidden sm:block">
            <button type="button" on:click={() => (presenceOpen = !presenceOpen)} class="flex h-10 items-center gap-2 rounded-xl bg-[#F5F6FA] px-3 text-[10px] font-semibold text-[#555C6D] transition hover:bg-[#EEF0FF]" aria-expanded={presenceOpen}>
              <span class={`h-2.5 w-2.5 rounded-full ${presenceDotClass(presence.effectiveStatus)}`}></span>
              {presenceLabel(presence.effectiveStatus)}
              <ChevronDown size={13}/>
            </button>
            {#if presenceOpen}
              <div class="absolute right-0 top-12 z-50 w-44 overflow-hidden rounded-xl border border-[#E1E4EC] bg-white p-1.5 shadow-xl">
                <button type="button" on:click={() => void setPresenceStatus("online")} class="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-[10px] font-semibold text-[#434A5A] hover:bg-[#F6F7FB]"><span class="h-2.5 w-2.5 rounded-full bg-[#2F9E5B]"></span>Online</button>
                <button type="button" on:click={() => void setPresenceStatus("busy")} class="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-[10px] font-semibold text-[#434A5A] hover:bg-[#F6F7FB]"><span class="h-2.5 w-2.5 rounded-full bg-[#E59A2F]"></span>Ocupado</button>
                <button type="button" on:click={() => void setPresenceStatus("offline")} class="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-[10px] font-semibold text-[#434A5A] hover:bg-[#F6F7FB]"><span class="h-2.5 w-2.5 rounded-full bg-[#C7CBD4]"></span>Offline</button>
                {#if presence.effectiveStatus === "away"}<p class="mt-1 border-t border-[#EEF0F5] px-3 pt-2 text-[9px] leading-4 text-[#8A909E]">Ausente por inatividade. Uma nova interação no painel restaura seu estado.</p>{/if}
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
              <span class="absolute -right-1 -top-1 inline-flex min-w-5 items-center justify-center rounded-full border-2 border-white bg-[#D92D20] px-1 text-[8px] font-bold leading-4 text-white">{Math.min(notifications.unreadCount, 99)}</span>
            {/if}
          </button>

          {#if notificationOpen}
            <div class="absolute right-0 top-12 z-50 w-[min(360px,calc(100vw-2rem))] overflow-hidden rounded-2xl border border-[#E1E4EC] bg-white shadow-2xl shadow-slate-900/15">
              <div class="flex items-center justify-between border-b border-[#EEF0F5] px-4 py-3">
                <div><strong class="block text-[12px] text-[#202637]">Notificações</strong><span class="text-[9px] text-[#8B909E]">{notifications.unreadCount} não lida(s)</span></div>
                {#if notifications.unreadCount > 0}
                  <form method="POST" action="/app/notifications/read-all"><button type="submit" class="text-[9px] font-semibold text-[#000A57] hover:underline">Marcar todas como lidas</button></form>
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
                          <strong class="block text-[10px] font-semibold leading-4 text-[#313747]">{notification.title}</strong>
                          {#if notification.body}<span class="mt-1 line-clamp-2 block text-[9px] leading-4 text-[#747A89]">{notification.body}</span>{/if}
                          <span class="mt-1.5 block text-[8px] text-[#9A9EAA]">{formatNotificationDate(notification.createdAt)}</span>
                        </span>
                      </div>
                    </a>
                  {/each}
                </div>
              {:else}
                <p class="px-5 py-8 text-center text-[10px] text-[#8B909E]">Nenhuma notificação por enquanto.</p>
              {/if}
            </div>
          {/if}
        </div>

        <a href="/app/minha-conta" class="hidden min-w-0 items-center gap-2 rounded-xl px-2 py-1.5 transition hover:bg-[#F7F8FB] sm:flex lg:hidden">
          <UserCircle size={20} class="shrink-0 text-[#000A57]" />
          <span class="hidden min-w-0 text-right md:block"><strong class="block max-w-40 truncate text-[12px]">{data.user.name}</strong><small class="block max-w-40 truncate text-[10px] text-[#858A98]">{data.user.email}</small></span>
        </a>
        <form method="POST" action="/app/logout" class="lg:hidden"><button type="submit" class="flex h-10 w-10 items-center justify-center rounded-xl bg-[#F5F6FA] text-[#6D7280]" aria-label="Sair"><LogOut size={18} aria-hidden="true" /></button></form>
      </div>
    </header>
    <slot />
  </main>
</div>
