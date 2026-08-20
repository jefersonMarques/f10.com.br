<script lang="ts">
  import { page } from "$app/stores";
  import { onMount } from "svelte";
  import {
    BarChart3,
    BookOpen,
    Building2,
    CalendarDays,
    CheckSquare2,
    ChevronDown,
    ChevronRight,
    FileText,
    GraduationCap,
    Headphones,
    LayoutDashboard,
    LogOut,
    MessageCircleMore,
    MonitorCog,
    PanelLeftClose,
    PanelLeftOpen,
    Search,
    Settings,
    ShieldCheck,
    UserCircle,
    Users,
  } from "lucide-svelte";

  export let collapsed = false;
  export let permissions: Array<{ code: string; scope: string }> = [];
  export let notifications: {
    chatUnreadCount: number;
    ticketUnreadCount: number;
    taskUnreadCount: number;
  };
  export let user: { name: string; email: string };
  export let roles: string[] = [];

  type NavigationChild = {
    label: string;
    icon: typeof LayoutDashboard;
    href: string;
  };

  type NavigationItem = {
    label: string;
    icon: typeof LayoutDashboard;
    href?: string;
    permission?: string;
    permissionsAny?: string[];
    children?: NavigationChild[];
  };

  type NavigationSection = {
    label: string;
    items: NavigationItem[];
  };

  const SIDEBAR_STORAGE_KEY = "f10-operations-sidebar-collapsed";
  let openNavigationGroup: string | null = null;

  const navigationSections: NavigationSection[] = [
    {
      label: "Operação",
      items: [
        { label: "Visão geral", icon: LayoutDashboard, href: "/app" },
        { label: "Agenda", icon: CalendarDays, href: "/app/tasks/calendar", permissionsAny: ["tasks.view", "tickets.view"] },
        { label: "Tarefas", icon: CheckSquare2, href: "/app/tasks", permission: "tasks.view" },
      ],
    },
    {
      label: "Atendimento",
      items: [
        { label: "Tickets", icon: Headphones, href: "/app/tickets", permission: "tickets.view" },
        { label: "Clientes", icon: Building2, href: "/app/customers", permission: "customers.view" },
        { label: "Chat", icon: MessageCircleMore, href: "/app/chat", permission: "chat.view" },
        { label: "Acesso remoto", icon: MonitorCog, href: "/app/remote", permission: "remote.use" },
      ],
    },
    {
      label: "Conhecimento",
      items: [
        {
          label: "Base de Conhecimento",
          icon: BookOpen,
          permission: "help.view",
          children: [
            { label: "Conteúdos", icon: FileText, href: "/app/help/content" },
            { label: "Trilhas", icon: GraduationCap, href: "/app/help/trilhas" },
          ],
        },
        { label: "Pesquisa de Suporte", icon: Search, href: "/app/help/search", permission: "help.view" },
        { label: "Insights da Central", icon: BarChart3, href: "/app/help/insights", permission: "help.view" },
      ],
    },
    {
      label: "Gestão",
      items: [
        { label: "Performance", icon: BarChart3, href: "/app/performance", permission: "reports.view" },
        { label: "Equipe", icon: Users, href: "/app/team", permission: "users.view" },
        { label: "Configurações", icon: Settings, href: "/app/settings", permission: "system.settings.manage" },
      ],
    },
  ];

  $: permissionCodes = new Set(permissions.map((permission) => permission.code));
  $: pathname = $page.url.pathname;
  $: visibleNavigationSections = navigationSections
    .map((section) => ({
      ...section,
      items: section.items.filter(
        (item) =>
          (!item.permission || permissionCodes.has(item.permission))
          && (!item.permissionsAny || item.permissionsAny.some((permission) => permissionCodes.has(permission))),
      ),
    }))
    .filter((section) => section.items.length > 0);

  onMount(() => {
    collapsed = window.localStorage.getItem(SIDEBAR_STORAGE_KEY) === "1";
  });

  function toggleCollapsed(): void {
    collapsed = !collapsed;
    openNavigationGroup = null;
    window.localStorage.setItem(SIDEBAR_STORAGE_KEY, collapsed ? "1" : "0");
  }

  function isActiveNavigationItem(currentPathname: string, href?: string): boolean {
    if (!href) return false;
    if (href === "/app") return currentPathname === href;
    if (href === "/app/tasks" && currentPathname.startsWith("/app/tasks/calendar")) return false;
    return currentPathname === href || currentPathname.startsWith(`${href}/`);
  }

  function isActiveNavigationGroup(currentPathname: string, children: NavigationChild[]): boolean {
    return children.some((child) => isActiveNavigationItem(currentPathname, child.href));
  }

  function toggleNavigationGroup(label: string): void {
    if (collapsed) {
      collapsed = false;
      openNavigationGroup = label;
      window.localStorage.setItem(SIDEBAR_STORAGE_KEY, "0");
      return;
    }
    openNavigationGroup = openNavigationGroup === label ? null : label;
  }

  function navigationBadge(href?: string): number {
    if (href === "/app/chat") return notifications.chatUnreadCount;
    if (href === "/app/tickets") return notifications.ticketUnreadCount;
    if (href === "/app/tasks") return notifications.taskUnreadCount;
    return 0;
  }
</script>

<aside class="border-b border-[#E2E5ED] bg-white transition-[width] duration-200 lg:sticky lg:top-0 lg:h-[100dvh] lg:min-h-[100dvh] lg:border-b-0 lg:border-r">
  <div class="flex h-full flex-col">
    <div class={`flex h-[68px] items-center border-b border-[#EEF0F5] px-4 transition-all lg:px-3 ${collapsed ? "lg:justify-center lg:gap-1" : "justify-between lg:px-5"}`}>
      <a href="/app" class={`flex min-w-0 items-center ${collapsed ? "lg:justify-center" : "gap-3"}`} title={collapsed ? "F10 Operations" : ""}>
        <span class="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#000A57] text-sm font-bold text-white">F10</span>
        <span class={collapsed ? "lg:hidden" : ""}>
          <strong class="block text-[14px] font-semibold leading-4">Operations</strong>
          <small class="mt-0.5 block text-[11px] font-medium text-[#8A8F9D]">Área interna</small>
        </span>
      </a>

      <button
        type="button"
        class="hidden h-8 w-8 shrink-0 items-center justify-center rounded-lg text-[#7B8190] transition hover:bg-[#F3F4F7] hover:text-[#000A57] lg:flex"
        aria-label={collapsed ? "Expandir menu lateral" : "Recolher menu lateral"}
        aria-pressed={collapsed}
        title={collapsed ? "Expandir menu" : "Recolher menu"}
        on:click={toggleCollapsed}
      >
        {#if collapsed}<PanelLeftOpen size={16}/>{:else}<PanelLeftClose size={16}/>{/if}
      </button>
      <ShieldCheck class="text-[#EA6D0B] lg:hidden" size={20} aria-hidden="true" />
    </div>

    <nav class={`hidden flex-1 overflow-y-auto py-4 lg:block ${collapsed ? "px-2" : "px-3"}`} aria-label="Navegação principal">
      {#each visibleNavigationSections as section, sectionIndex}
        <section class={sectionIndex > 0 ? "mt-4" : ""} aria-label={section.label}>
          {#if collapsed}
            {#if sectionIndex > 0}<div class="mx-2 mb-3 border-t border-[#EEF0F5]"></div>{/if}
          {:else}
            <p class="application-text-meta px-3 pb-2 font-bold uppercase tracking-[0.14em] text-[#9A9FAD]">{section.label}</p>
          {/if}

          <div class="space-y-1">
            {#each section.items as item}
              {#if item.children}
                {@const groupActive = isActiveNavigationGroup(pathname, item.children)}
                {@const groupOpen = openNavigationGroup === item.label}
                <div class="relative py-0.5">
                  <button
                    type="button"
                    class={`relative flex min-h-10 w-full items-center rounded-xl text-[13px] font-semibold transition ${collapsed ? "justify-center px-2" : "gap-3 px-3 text-left"} ${groupActive ? "bg-[#F8F9FF] text-[#000A57]" : "text-[#676D7D] hover:bg-[#F7F8FB] hover:text-[#000A57]"}`}
                    aria-expanded={groupOpen || (!collapsed && groupActive)}
                    aria-label={collapsed ? item.label : undefined}
                    title={collapsed ? item.label : ""}
                    on:click={() => toggleNavigationGroup(item.label)}
                  >
                    <svelte:component this={item.icon} size={18} aria-hidden="true" />
                    {#if !collapsed}
                      <span class="flex-1">{item.label}</span>
                      <ChevronDown size={15} class={`transition-transform duration-150 ${groupOpen || groupActive ? "rotate-180" : ""}`} aria-hidden="true" />
                    {/if}
                  </button>

                  {#if !collapsed && (groupOpen || groupActive)}
                    <div class="ml-[22px] mt-1 space-y-1 border-l border-[#E4E7EE] pl-3">
                      {#each item.children as child}
                        <a href={child.href} class={`flex min-h-9 items-center gap-2.5 rounded-lg px-3 text-[11px] font-semibold transition ${isActiveNavigationItem(pathname, child.href) ? "bg-[#EEF0FF] text-[#000A57]" : "text-[#747A89] hover:bg-[#F7F8FB] hover:text-[#000A57]"}`}>
                          <svelte:component this={child.icon} size={15} aria-hidden="true" />
                          <span>{child.label}</span>
                        </a>
                      {/each}
                    </div>
                  {/if}
                </div>
              {:else if item.href}
                {@const badge = navigationBadge(item.href)}
                <a
                  href={item.href}
                  class={`relative flex min-h-10 items-center rounded-xl text-[13px] font-semibold transition ${collapsed ? "justify-center px-2" : "gap-3 px-3"} ${isActiveNavigationItem(pathname, item.href) ? "bg-[#EEF0FF] text-[#000A57]" : "text-[#676D7D] hover:bg-[#F7F8FB] hover:text-[#000A57]"}`}
                  aria-label={collapsed ? item.label : undefined}
                  title={collapsed ? item.label : ""}
                >
                  <svelte:component this={item.icon} size={18} aria-hidden="true" />
                  {#if !collapsed}<span class="flex-1">{item.label}</span>{/if}
                  {#if badge > 0}
                    <span class={`application-text-meta inline-flex items-center justify-center rounded-full bg-[#D92D20] font-bold text-white ${collapsed ? "absolute right-0 top-0 h-4 min-w-4 px-1 text-[8px]" : "min-w-5 px-1.5 py-0.5"}`}>{Math.min(badge, 99)}</span>
                  {:else if !collapsed}
                    <ChevronRight size={15} aria-hidden="true" />
                  {/if}
                </a>
              {/if}
            {/each}
          </div>
        </section>
      {/each}
    </nav>

    <div class={`hidden border-t border-[#EEF0F5] lg:block ${collapsed ? "p-2" : "p-3"}`}>
      {#if collapsed}
        <a href="/app/minha-conta" class="flex h-10 items-center justify-center rounded-xl text-[#000A57] transition hover:bg-[#EEF0FF]" aria-label="Minha conta" title={user.name}>
          <UserCircle size={21}/>
        </a>
        <form method="POST" action="/app/logout" class="mt-1">
          <button type="submit" class="flex h-10 w-full items-center justify-center rounded-xl text-[#6D7280] transition hover:bg-[#FFF0F0] hover:text-[#A52A2A]" aria-label="Sair" title="Sair"><LogOut size={18}/></button>
        </form>
      {:else}
        <a href="/app/minha-conta" class="block rounded-2xl bg-[#F7F8FB] p-3 transition hover:bg-[#EEF0FF]">
          <div class="flex items-start gap-3">
            <span class="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white text-[#000A57] shadow-sm"><UserCircle size={20}/></span>
            <span class="min-w-0 flex-1">
              <span class="block truncate text-[13px] font-semibold text-[#202637]">{user.name}</span>
              <span class="mt-1 block truncate text-[11px] text-[#777D8D]">{user.email}</span>
            </span>
          </div>
          <div class="mt-3 flex flex-wrap gap-1.5">{#each roles as role}<span class="application-text-meta rounded-full bg-white px-2 py-1 font-bold tracking-[0.04em] text-[#000A57] shadow-sm">{role}</span>{/each}</div>
        </a>
        <form method="POST" action="/app/logout" class="mt-2"><button type="submit" class="flex h-10 w-full items-center gap-2 rounded-xl px-3 text-left text-[12px] font-semibold text-[#6D7280] transition hover:bg-[#FFF0F0] hover:text-[#A52A2A]"><LogOut size={17} aria-hidden="true"/>Sair</button></form>
      {/if}
    </div>
  </div>
</aside>
