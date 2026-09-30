<script lang="ts">
  import { ArrowRight, Megaphone } from "lucide-svelte";
  import type { PageData } from "./$types";
  export let data: PageData;

  function formatDate(value: string | Date): string {
    return new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "short", year: "numeric" }).format(new Date(value));
  }
</script>

<svelte:head><title>Atualizações F10</title></svelte:head>

<div class="px-4 py-5 sm:px-6 sm:py-7">
  <div class="mx-auto max-w-[980px]">
    <header class="rounded-[22px] border border-[#E2E5ED] bg-white p-5 sm:p-6">
      <div class="flex items-center gap-3"><span class="flex h-10 w-10 items-center justify-center rounded-xl bg-[#EEF0FF] text-[#000A57]"><Megaphone size={18}/></span><div><h1 class="text-[18px] font-semibold text-[#202637]">Atualizações F10</h1><p class="mt-0.5 text-[11px] text-[#858B99]">Novidades e melhorias publicadas pela equipe F10.</p></div></div>
    </header>

    {#if data.updates.length === 0}
      <div class="mt-4 rounded-[22px] border border-dashed border-[#D6DAE3] bg-white px-5 py-12 text-center text-[12px] text-[#8B919F]">Nenhuma atualização publicada.</div>
    {:else}
      <div class="mt-4 space-y-3">
        {#each data.updates as update}
          <a href={`/iframef10/novidades/${encodeURIComponent(update.slug)}`} class="group block rounded-[22px] border border-[#E2E5ED] bg-white p-5 transition hover:border-[#C9CFF3] hover:shadow-sm">
            <div class="flex items-start justify-between gap-4">
              <div class="min-w-0"><span class="text-[9px] font-bold uppercase tracking-[0.12em] text-[#EA6D0B]">{formatDate(update.publishedAt)}</span><h2 class="mt-1.5 text-[15px] font-semibold text-[#303746] group-hover:text-[#000A57]">{update.title}</h2>{#if update.summary}<p class="mt-2 line-clamp-3 text-[11px] leading-5 text-[#747B8B]">{update.summary}</p>{/if}<div class="mt-3 flex flex-wrap gap-1.5">{#each update.categories as category}<span class="rounded-full bg-[#F3F4F7] px-2 py-1 text-[9px] font-semibold text-[#777E8D]">{category.name}</span>{/each}</div></div>
              <ArrowRight size={16} class="mt-1 shrink-0 text-[#A0A5B0] transition group-hover:translate-x-0.5 group-hover:text-[#000A57]"/>
            </div>
          </a>
        {/each}
      </div>
    {/if}
  </div>
</div>
