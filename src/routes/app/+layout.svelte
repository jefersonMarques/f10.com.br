<script lang="ts">
  import { page } from "$app/stores";
  import {
    BookOpen,
    CheckSquare2,
    ChevronRight,
    GitBranch,
    Headphones,
    LayoutDashboard,
    LogOut,
    MessageCircleMore,
    MonitorCog,
    Settings,
    ShieldCheck,
    Users,
  } from "lucide-svelte";
  import type { LayoutData } from "./$types";

  export let data: LayoutData;

  const permissionCodes = new Set(data.permissions.map((permission) => permission.code));

  const navigationItems = [
    { label: "Visão geral", icon: LayoutDashboard, enabled: true, href: "/app" },
    { label: "Central de Ajuda", icon: BookOpen, enabled: true, href: "/app/help", permission: "help.view" },
    { label: "Fluxos de ajuda", icon: GitBranch, enabled: true, href: "/app/help/flows", permission: "help.view" },
    { label: "Tarefas", icon: CheckSquare2, enabled: false, permission: "tasks.view" },
    { label: "Tickets", icon: Headphones, enabled: false, permission: "tickets.view" },
    { label: "Chat", icon: MessageCircleMore, enabled: false, permission: "chat.view" },
    { label: "Acesso remoto", icon: MonitorCog, enabled: false, permission: "remote.use" },
    { label: "Equipe", icon: Users, enabled: false, permission: "users.view" },
    { label: "Configurações", icon: Settings, enabled: false, permission: "system.settings.manage" },
  ];

  $: visibleNavigationItems = navigationItems.filter(
    (item) => !item.permission || permissionCodes.has(item.permission),
  );
  $: pathname = $page.url.pathname;

  function isActiveNavigationItem(href?: string): boolean {
    if (!href) return false;
    if (href === "/app") return pathname === href;
    return pathname === href || pathname.startsWith(`${href}/`);
  }
</script>

<svelte:head>
  <meta name="robots" content="noindex,nofollow,noarchive" />
  <meta name="googlebot" content="noindex,nofollow,noarchive" />
</svelte:head>

<div class="min-h-[100dvh] bg-[#F5F6FA] text-[#010D28] lg:grid lg:grid-cols-[270px_minmax(0,1fr)]">
  <aside class="border-b border-[#E2E5ED] bg-white lg:min-h-[100dvh] lg:border-b-0 lg:border-r">
    <div class="flex h-full flex-col">
      <div class="flex h-[78px] items-center justify-between border-b border-[#EEF0F5] px-5 lg:px-6">
        <a href="/app" class="flex items-center gap-3">
          <span class="flex h-10 w-10 items-center justify-center rounded-xl bg-[#000A57] text-sm font-bold text-white">F10</span>
          <span>
            <strong class="block text-[14px] font-semibold leading-4">Operations</strong>
            <small class="mt-1 block text-[11px] font-medium text-[#8A8F9D]">Área interna</small>
          </span>
        </a>

        <ShieldCheck class="text-[#EA6D0B] lg:hidden" size={21} aria-hidden="true" />
      </div>

      <nav class="hidden flex-1 px-3 py-5 lg:block" aria-label="Navegação principal">
        <p class="px-3 pb-2 text-[10px] font-bold uppercase tracking-[0.14em] text-[#9A9FAD]">Operação</p>

        <div class="space-y-1">
          {#each visibleNavigationItems as item}
            {#if item.enabled && item.href}
              <a
                href={item.href}
                class={`flex min-h-11 items-center gap-3 rounded-xl px-3 text-[13px] font-semibold transition ${
                  isActiveNavigationItem(item.href)
                    ? "bg-[#EEF0FF] text-[#000A57]"
                    : "text-[#676D7D] hover:bg-[#F7F8FB] hover:text-[#000A57]"
                }`}
              >
                <svelte:component this={item.icon} size={19} aria-hidden="true" />
                <span class="flex-1">{item.label}</span>
                <ChevronRight size={15} aria-hidden="true" />
              </a>
            {:else}
              <div class="flex min-h-11 items-center gap-3 rounded-xl px-3 text-[13px] font-medium text-[#707687]">
                <svelte:component this={item.icon} size={19} aria-hidden="true" />
                <span class="flex-1">{item.label}</span>
                <span class="rounded-full bg-[#F0F1F5] px-2 py-1 text-[9px] font-bold uppercase tracking-[0.08em] text-[#8A8F9D]">Em breve</span>
              </div>
            {/if}
          {/each}
        </div>
      </nav>

      <div class="hidden border-t border-[#EEF0F5] p-4 lg:block">
        <div class="rounded-2xl bg-[#F7F8FB] p-3">
          <p class="truncate text-[13px] font-semibold text-[#202637]">{data.user.name}</p>
          <p class="mt-1 truncate text-[11px] text-[#777D8D]">{data.user.email}</p>
          <div class="mt-3 flex flex-wrap gap-1.5">
            {#each data.roles as role}
              <span class="rounded-full bg-white px-2 py-1 text-[9px] font-bold tracking-[0.04em] text-[#000A57] shadow-sm">{role}</span>
            {/each}
          </div>
        </div>

        <form method="POST" action="/app/logout" class="mt-2">
          <button type="submit" class="flex h-10 w-full items-center gap-2 rounded-xl px-3 text-left text-[12px] font-semibold text-[#6D7280] transition hover:bg-[#FFF0F0] hover:text-[#A52A2A]">
            <LogOut size={17} aria-hidden="true" />
            Sair
          </button>
        </form>
      </div>
    </div>
  </aside>

  <main class="min-w-0">
    <header class="flex h-[78px] items-center justify-between border-b border-[#E2E5ED] bg-white px-5 sm:px-8">
      <div>
        <p class="text-[10px] font-bold uppercase tracking-[0.14em] text-[#EA6D0B]">F10 Operations</p>
        <p class="mt-1 text-[14px] font-semibold text-[#33394A]">Ambiente operacional interno</p>
      </div>

      <div class="flex items-center gap-3 lg:hidden">
        <span class="hidden text-right sm:block">
          <strong class="block max-w-40 truncate text-[12px]">{data.user.name}</strong>
          <small class="block max-w-40 truncate text-[10px] text-[#858A98]">{data.user.email}</small>
        </span>
        <form method="POST" action="/app/logout">
          <button type="submit" class="flex h-10 w-10 items-center justify-center rounded-xl bg-[#F5F6FA] text-[#6D7280]" aria-label="Sair">
            <LogOut size={18} aria-hidden="true" />
          </button>
        </form>
      </div>
    </header>

    <slot />
  </main>
</div>
