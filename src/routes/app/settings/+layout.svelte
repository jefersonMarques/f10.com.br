<script lang="ts">
  import { page } from "$app/stores";
  import {
    Bot, Headset, Monitor, Plug, Search, Settings2, Ticket, Users,
    Workflow,
  } from "lucide-svelte";

  let search = "";

  const sections = [
    { title: "Geral", href: "/app/settings", icon: Settings2 },
    { title: "Atendimento", href: "/app/settings/atendimento", icon: Headset },
    { title: "Tickets", href: "/app/settings/tickets", icon: Ticket },
    { title: "Inteligência Artificial", href: "/app/settings/ai", icon: Bot },
    { title: "Integrações", href: "/app/settings/integracoes", icon: Plug },
    { title: "Automações", href: "/app/settings/help-video", icon: Workflow },
    { title: "Equipe e acessos", href: "/app/team", icon: Users },
  ];

  $: visibleSections = sections.filter((item) =>
    item.title.toLocaleLowerCase("pt-BR").includes(search.trim().toLocaleLowerCase("pt-BR")),
  );

  function isActive(href: string): boolean {
    return href === "/app/settings"
      ? $page.url.pathname === href
      : $page.url.pathname === href || $page.url.pathname.startsWith(href + "/");
  }
</script>

<div class="application-content application-content--wide !py-4 lg:!py-6">
  <div class="grid items-start gap-4 lg:grid-cols-[230px_minmax(0,1fr)]">
    <aside class="rounded-2xl border border-app-border bg-app-surface p-3 lg:sticky lg:top-20">
      <label class="flex min-h-10 items-center gap-2 rounded-lg border border-app-border-control px-3">
        <Search size={16} class="shrink-0 text-app-text-soft"/>
        <input bind:value={search} aria-label="Buscar seção de configurações"
          placeholder="Buscar configuração"
          class="application-text-caption min-w-0 flex-1 bg-transparent text-app-text outline-none"/>
      </label>
      <nav class="mt-3 flex gap-1 overflow-x-auto lg:flex-col" aria-label="Seções de configurações">
        {#each visibleSections as item (item.href)}
          <a href={item.href}
            aria-current={isActive(item.href) ? "page" : undefined}
            class:active={isActive(item.href)}
            class="application-text-caption flex min-h-10 shrink-0 items-center gap-2 rounded-lg px-3 font-semibold text-app-text-soft transition hover:bg-app-subtle hover:text-app-text lg:w-full">
            <svelte:component this={item.icon} size={17} aria-hidden="true"/>
            {item.title}
          </a>
        {:else}
          <span class="application-text-caption px-3 py-2 text-app-text-soft">Nenhuma seção encontrada.</span>
        {/each}
      </nav>
    </aside>

    <main class="min-w-0">
      <slot/>
    </main>
  </div>
</div>

<style>
  .active {
    background: var(--app-primary);
    color: white;
  }
</style>
