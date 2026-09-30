<script lang="ts">
  import { ArrowRight, Megaphone, Pin } from "lucide-svelte";
  import type { PageData } from "./$types";

  export let data: PageData;

  function formatDate(value: string | Date): string {
    return new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "short", year: "numeric" }).format(new Date(value));
  }

  function excerpt(markdown: string): string {
    return markdown
      .replace(/^#{1,3}\s+/gm, "")
      .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
      .replace(/[*_>#-]/g, " ")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 220);
  }
</script>

<svelte:head><title>Atualizações F10</title></svelte:head>

<div class="px-4 py-5 sm:px-6 sm:py-7">
  <div class="mx-auto max-w-[1080px]">
    <header class="rounded-[22px] border border-[#E2E5ED] bg-white p-5 sm:p-6">
      <div class="flex items-center gap-3">
        <span class="flex h-10 w-10 items-center justify-center rounded-xl bg-[#EEF0FF] text-[#000A57]"><Megaphone size={18}/></span>
        <div><h1 class="text-[18px] font-semibold text-[#202637]">Atualizações F10</h1><p class="mt-0.5 text-[11px] text-[#858B99]">Novidades, melhorias e destaques do F10.</p></div>
      </div>
    </header>

    {#if data.updates.length === 0}
      <div class="mt-4 rounded-[22px] border border-dashed border-[#D6DAE3] bg-white px-5 py-12 text-center text-[12px] text-[#8B919F]">Nenhuma novidade publicada.</div>
    {:else}
      <div class="mt-4 grid gap-4 md:grid-cols-2">
        {#each data.updates as update}
          <a href={"/iframef10/novidades/" + encodeURIComponent(update.slug)} class="group overflow-hidden rounded-[22px] border border-[#E2E5ED] bg-white transition hover:border-[#C9CFF3] hover:shadow-sm">
            {#if update.coverStorageKey}
              <img src={"/api/iframef10/updates/" + update.id + "/cover?v=" + new Date(update.updatedAt).getTime()} alt="" class="aspect-[16/8] w-full object-cover"/>
            {/if}
            <div class="p-5">
              <div class="flex items-center justify-between gap-3">
                <span class="text-[9px] font-bold uppercase tracking-[0.12em] text-[#8B919F]">{formatDate(update.createdAt)}</span>
                {#if update.pinned}<span class="inline-flex items-center gap-1 rounded-full bg-[#EEF0FF] px-2 py-1 text-[9px] font-bold text-[#000A57]"><Pin size={10}/>Fixado</span>{/if}
              </div>
              <h2 class="mt-2 text-[16px] font-semibold leading-6 text-[#303746] group-hover:text-[#000A57]">{update.title}</h2>
              <p class="mt-2 line-clamp-3 text-[11px] leading-5 text-[#747B8B]">{excerpt(update.bodyMarkdown)}</p>
              <span class="mt-4 inline-flex items-center gap-2 text-[10px] font-semibold text-[#000A57]">Ver novidade<ArrowRight size={13}/></span>
            </div>
          </a>
        {/each}
      </div>
    {/if}
  </div>
</div>
