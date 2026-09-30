<script lang="ts">
  import { ArrowLeft, Pin } from "lucide-svelte";
  import IframeF10Markdown from "$lib/components/iframef10/IframeF10Markdown.svelte";
  import type { PageData } from "./$types";

  export let data: PageData;

  function formatDate(value: string | Date): string {
    return new Intl.DateTimeFormat("pt-BR", { dateStyle: "long" }).format(new Date(value));
  }
</script>

<svelte:head><title>{data.update.title} | Atualizações F10</title></svelte:head>

<div class="px-4 py-5 sm:px-6 sm:py-7">
  <article class="mx-auto max-w-[1080px]">
    <a href="/iframef10/novidades" class="inline-flex h-9 items-center gap-2 rounded-xl px-2 text-[11px] font-semibold text-[#666D7D] hover:bg-white hover:text-[#000A57]"><ArrowLeft size={15}/>Voltar</a>

    <section class="mt-3 overflow-hidden rounded-[24px] border border-[#E2E5ED] bg-white">
      {#if data.update.coverStorageKey}
        <img src={"/api/iframef10/updates/" + data.update.id + "/cover?v=" + new Date(data.update.updatedAt).getTime()} alt="" class="max-h-[420px] w-full object-cover"/>
      {/if}
      <div class="p-5 sm:p-7">
        <div class="flex flex-wrap items-center gap-2">
          <span class="text-[9px] font-bold uppercase tracking-[0.12em] text-[#EA6D0B]">{formatDate(data.update.createdAt)}</span>
          {#if data.update.pinned}<span class="inline-flex items-center gap-1 rounded-full bg-[#EEF0FF] px-2 py-1 text-[9px] font-bold text-[#000A57]"><Pin size={10}/>Fixado</span>{/if}
        </div>
        <h1 class="mt-2 text-[24px] font-semibold tracking-[-0.03em] text-[#202637] sm:text-[32px]">{data.update.title}</h1>
        <div class="mt-6 border-t border-[#EEF0F5] pt-6">
          <IframeF10Markdown text={data.update.bodyMarkdown}/>
        </div>
      </div>
    </section>
  </article>
</div>
