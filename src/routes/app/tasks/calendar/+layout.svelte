<script lang="ts">
  import { page } from "$app/stores";
  import { CalendarDays, Link2 } from "lucide-svelte";
  import type { LayoutData } from "./$types";

  export let data: LayoutData;

  $: canSchedule = data.permissions.some((permission) => permission.code === "scheduling.view");
  $: pathname = $page.url.pathname;
</script>

<div class="border-b border-[#E6E9F0] bg-white/90 px-5 py-2.5 backdrop-blur sm:px-8">
  <nav class="mx-auto flex max-w-[1560px] flex-wrap items-center gap-2" aria-label="Navegação do calendário">
    <a
      href="/app/tasks/calendar"
      class={`inline-flex h-9 items-center gap-2 rounded-lg px-3 text-[10px] font-semibold transition ${pathname === "/app/tasks/calendar" ? "bg-[#000A57] text-white" : "text-[#626979] hover:bg-[#F4F5F8]"}`}
    >
      <CalendarDays size={14}/>
      Calendário
    </a>
    {#if canSchedule}
      <a
        href="/app/tasks/calendar/scheduling"
        class={`inline-flex h-9 items-center gap-2 rounded-lg px-3 text-[10px] font-semibold transition ${pathname.startsWith("/app/tasks/calendar/scheduling") ? "bg-[#000A57] text-white" : "text-[#626979] hover:bg-[#F4F5F8]"}`}
      >
        <Link2 size={14}/>
        Links de agendamento
      </a>
    {/if}
  </nav>
</div>

<slot/>
