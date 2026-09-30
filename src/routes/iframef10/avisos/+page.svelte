<script lang="ts">
  import { BellRing, CheckCircle2, CircleAlert, TriangleAlert } from "lucide-svelte";
  import type { PageData } from "./$types";
  export let data: PageData;

  function icon(severity: string) {
    return severity === "critical" ? TriangleAlert : severity === "warning" ? CircleAlert : CheckCircle2;
  }

  function label(severity: string): string {
    return severity === "critical" ? "Crítico" : severity === "warning" ? "Atenção" : "Informação";
  }
</script>

<svelte:head><title>Avisos F10</title></svelte:head>

<div class="px-4 py-5 sm:px-6 sm:py-7">
  <div class="mx-auto max-w-[1080px]">
    <header class="rounded-[22px] border border-[#E2E5ED] bg-white p-5 sm:p-6">
      <div class="flex items-center gap-3"><span class="flex h-10 w-10 items-center justify-center rounded-xl bg-[#FFF4E8] text-[#9B530F]"><BellRing size={18}/></span><div><h1 class="text-[18px] font-semibold text-[#202637]">Avisos F10</h1><p class="mt-0.5 text-[11px] text-[#858B99]">Comunicados ativos para quem está usando o F10.</p></div></div>
    </header>

    {#if data.notices.length === 0}
      <div class="mt-4 rounded-[22px] border border-dashed border-[#D6DAE3] bg-white px-5 py-12 text-center text-[12px] text-[#8B919F]">Nenhum aviso ativo.</div>
    {:else}
      <div class="mt-4 space-y-3">
        {#each data.notices as notice}
          {@const NoticeIcon = icon(notice.severity)}
          <article class={`rounded-[22px] border bg-white p-5 ${notice.severity === "critical" ? "border-[#EFC6C6]" : notice.severity === "warning" ? "border-[#F0C89F]" : "border-[#D8DDF4]"}`}>
            <div class="flex items-start gap-3"><span class={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${notice.severity === "critical" ? "bg-[#FFF0F0] text-[#9B2C2C]" : notice.severity === "warning" ? "bg-[#FFF4E8] text-[#9B530F]" : "bg-[#EEF0FF] text-[#000A57]"}`}><svelte:component this={NoticeIcon} size={16}/></span><div><span class="text-[9px] font-bold uppercase tracking-[0.12em] text-[#8B919F]">{label(notice.severity)}</span><h2 class="mt-1 text-[14px] font-semibold text-[#303746]">{notice.title}</h2><p class="mt-2 whitespace-pre-wrap text-[11px] leading-5 text-[#676D7D]">{notice.message}</p></div></div>
          </article>
        {/each}
      </div>
    {/if}
  </div>
</div>
