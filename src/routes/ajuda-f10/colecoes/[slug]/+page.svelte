<script lang="ts">
  import { ArrowLeft, ArrowRight, BookOpen, Layers3 } from "lucide-svelte";
  import type { PageData } from "./$types";

  export let data: PageData;
</script>

<svelte:head>
  <title>{data.collection.title} | Ajuda F10</title>
  <meta name="description" content={data.collection.description || `Conteúdos sobre ${data.collection.title} na Central de Ajuda F10.`} />
</svelte:head>

<main class="min-h-screen bg-[#F7F8FB] text-[#10172A]">
  <div class="mx-auto max-w-[900px] px-5 py-8 sm:px-8 sm:py-12">
    <a href="/ajuda-f10" class="inline-flex min-h-10 items-center gap-2 rounded-xl px-2 text-[12px] font-semibold text-[#606777] transition hover:bg-white hover:text-[#000A57]"><ArrowLeft size={17}/>Central de Ajuda</a>

    <header class="mt-6 rounded-[28px] border border-[#E3E6EE] bg-white px-6 py-7 shadow-[0_14px_44px_rgba(1,13,40,0.05)] sm:px-9 sm:py-9">
      <span class="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-[#EEF0FF] text-[#000A57]"><Layers3 size={20}/></span>
      <p class="mt-4 text-[10px] font-bold uppercase tracking-[0.14em] text-[#EA6D0B]">Coleção</p>
      <h1 class="mt-2 text-[30px] font-semibold tracking-[-0.04em] text-[#010D28] sm:text-[42px]">{data.collection.title}</h1>
      {#if data.collection.description}<p class="mt-3 max-w-[720px] text-[13px] leading-6 text-[#6C7383]">{data.collection.description}</p>{/if}
      <span class="mt-5 inline-flex rounded-full bg-[#F4F5F8] px-3 py-1.5 text-[9px] font-semibold text-[#777E8E]">{data.collection.items.length} {data.collection.items.length === 1 ? "conteúdo" : "conteúdos"}</span>
    </header>

    <section class="mt-6 overflow-hidden rounded-[24px] border border-[#E3E6EE] bg-white shadow-[0_10px_30px_rgba(1,13,40,0.035)]">
      <div class="divide-y divide-[#EEF0F5]">
        {#each data.collection.items as item, index}
          <a href={`/ajuda-f10/${encodeURIComponent(item.slug)}?colecao=${encodeURIComponent(data.collection.slug)}`} class="group flex items-center gap-4 px-5 py-4 transition hover:bg-[#FAFAFC] sm:px-6">
            <span class="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#F3F5FF] text-[11px] font-bold text-[#000A57]">{index + 1}</span>
            <div class="min-w-0 flex-1">
              <h2 class="text-[12px] font-semibold leading-5 text-[#303746] transition group-hover:text-[#000A57]">{item.title}</h2>
            </div>
            <ArrowRight size={15} class="shrink-0 text-[#9AA0AE] transition group-hover:translate-x-0.5 group-hover:text-[#000A57]"/>
          </a>
        {/each}
      </div>
    </section>

    <div class="mt-5 flex items-center gap-2 text-[10px] text-[#8A909F]"><BookOpen size={13}/>Os conteúdos são os mesmos artigos publicados na Base de Conhecimento.</div>
  </div>
</main>
