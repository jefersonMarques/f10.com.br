<script lang="ts">
  import { page } from "$app/stores";
  import { Clock3, Settings, Video } from "lucide-svelte";
</script>

<nav class="border-b border-[#E6E8EF] bg-white/90 px-5 py-3 backdrop-blur sm:px-8" aria-label="Seções de configurações">
  <div class="mx-auto flex max-w-[1260px] flex-wrap gap-2">
    <a
      href="/app/settings"
      class={`application-text-meta inline-flex min-h-9 items-center gap-2 rounded-lg px-3 font-semibold transition ${$page.url.pathname === "/app/settings" ? "bg-[#000A57] text-white" : "border border-[#DDE1EA] text-[#555B6B] hover:text-[#000A57]"}`}
    ><Settings size={13}/>Geral e integrações</a>
    <a
      href="/app/settings/help-video"
      class={`application-text-meta inline-flex min-h-9 items-center gap-2 rounded-lg px-3 font-semibold transition ${$page.url.pathname.startsWith("/app/settings/help-video") ? "bg-[#000A57] text-white" : "border border-[#DDE1EA] text-[#555B6B] hover:text-[#000A57]"}`}
    ><Video size={13}/>Automação de vídeos</a>
    <a
      href="/app/settings/atendimento"
      class={`application-text-meta inline-flex min-h-9 items-center gap-2 rounded-lg px-3 font-semibold transition ${$page.url.pathname.startsWith("/app/settings/atendimento") ? "bg-[#000A57] text-white" : "border border-[#DDE1EA] text-[#555B6B] hover:text-[#000A57]"}`}
    ><Clock3 size={13}/>Horário de atendimento</a>
  </div>
</nav>

<slot />
