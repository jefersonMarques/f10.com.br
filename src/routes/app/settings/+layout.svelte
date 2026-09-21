<script lang="ts">
  import { page } from "$app/stores";
  import { Bot, Clock3, HardDrive, Settings, Video } from "lucide-svelte";

  const baseClass = "application-text-meta inline-flex min-h-9 items-center gap-2 rounded-lg px-3 font-semibold transition";
  const activeClass = "bg-[#000A57] text-white";
  const inactiveClass = "border border-[#DDE1EA] text-[#555B6B] hover:text-[#000A57]";
</script>

<nav class="border-b border-[#E6E8EF] bg-white/90 py-3 backdrop-blur" aria-label="Seções de configurações">
  <div class="application-content application-content--standard !py-0">
    <div class="flex flex-wrap gap-2">
    <a href="/app/settings" class={baseClass + " " + ($page.url.pathname === "/app/settings" ? activeClass : inactiveClass)}><Settings size={13}/>Geral</a>
    <a href="/app/settings/atendimento" class={baseClass + " " + ($page.url.pathname.startsWith("/app/settings/atendimento") ? activeClass : inactiveClass)}><Clock3 size={13}/>Atendimento</a>
    <a href="/app/settings/ai" class={baseClass + " " + ($page.url.pathname.startsWith("/app/settings/ai") ? activeClass : inactiveClass)}><Bot size={13}/>Inteligência Artificial</a>
    <a href="/app/settings/integracoes" class={baseClass + " " + ($page.url.pathname.startsWith("/app/settings/integracoes") ? activeClass : inactiveClass)}><HardDrive size={13}/>Integrações</a>
      <a href="/app/settings/help-video" class={baseClass + " " + ($page.url.pathname.startsWith("/app/settings/help-video") ? activeClass : inactiveClass)}><Video size={13}/>Automações</a>
    </div>
  </div>
</nav>

<slot />
