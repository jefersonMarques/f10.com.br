<script lang="ts">
  import { page } from "$app/stores";
  import { CalendarDays, CheckSquare2 } from "lucide-svelte";

  $: pathname = $page.url.pathname;
  $: isAgenda = pathname.startsWith("/app/tasks/calendar");
</script>

{#if !isAgenda}
  <div class="border-b border-[#E4E7EE] bg-white px-5 sm:px-8">
    <nav class="mx-auto flex max-w-[1560px] items-center gap-1 py-2" aria-label="Área de tarefas">
      <a href="/app/tasks" class={`inline-flex h-9 items-center gap-2 rounded-lg px-3 text-[11px] font-semibold transition ${pathname === "/app/tasks" || pathname.startsWith("/app/tasks/projects/") ? "bg-[#EEF0FF] text-[#000A57]" : "text-[#6E7483] hover:bg-[#F6F7FA] hover:text-[#000A57]"}`}>
        <CheckSquare2 size={15}/>
        Tarefas
      </a>
      <a href="/app/tasks/calendar" class={`inline-flex h-9 items-center gap-2 rounded-lg px-3 text-[11px] font-semibold transition ${pathname.startsWith("/app/tasks/calendar") ? "bg-[#EEF0FF] text-[#000A57]" : "text-[#6E7483] hover:bg-[#F6F7FA] hover:text-[#000A57]"}`}>
        <CalendarDays size={15}/>
        Calendário
      </a>
    </nav>
  </div>
{/if}

<slot />
