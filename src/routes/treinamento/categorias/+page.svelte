<script lang="ts">
  import { ArrowRight, BookOpenCheck } from "lucide-svelte";
  import HelpCategoryIcon from "$lib/components/help/HelpCategoryIcon.svelte";
  import type { PageData } from "./$types";

  export let data: PageData;
</script>

<svelte:head><title>Guias por área | F10</title></svelte:head>

<main class="min-h-[100dvh] bg-[#F6F7FA] px-4 py-10 text-[#061333] sm:px-6 sm:py-14">
  <div class="mx-auto max-w-[980px]">
    <header class="text-center">
      <span class="text-[32px] font-black tracking-[-0.08em] text-[#F36B00]">F10</span>
      <p class="mt-5 text-[10px] font-bold uppercase tracking-[0.16em] text-[#F36B00]">Guias passo a passo</p>
      <h1 class="mt-2 text-[30px] font-semibold tracking-[-0.04em] sm:text-[42px]">O que você precisa aprender?</h1>
      <p class="mx-auto mt-3 max-w-[620px] text-[13px] leading-6 text-[#687186]">Escolha a área. Dentro dela você verá somente os guias disponíveis para executar uma tarefa por vez.</p>
    </header>

    {#if data.categories.length === 0}
      <section class="mt-10 rounded-[24px] border border-[#E1E4EB] bg-white px-6 py-12 text-center"><BookOpenCheck size={34} class="mx-auto text-[#B8BDC8]"/><p class="mt-4 text-[13px] font-semibold text-[#4D5566]">Nenhum guia público disponível agora.</p></section>
    {:else}
      <section class="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {#each data.categories as category}
          <a href={`/treinamento/categoria/${encodeURIComponent(category.slug)}`} class="group flex min-h-[190px] flex-col rounded-[24px] border border-[#E1E4EB] bg-white p-6 shadow-[0_16px_42px_rgba(12,23,52,0.05)] transition hover:-translate-y-1 hover:shadow-[0_20px_50px_rgba(12,23,52,0.09)]">
            <span class="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#F7F8FB] text-[#000A57]"><HelpCategoryIcon name={category.icon} size={25}/></span>
            <h2 class="mt-5 text-[18px] font-semibold tracking-[-0.025em]">{category.name}</h2>
            {#if category.description}<p class="mt-2 line-clamp-2 text-[11px] leading-5 text-[#737C8F]">{category.description}</p>{/if}
            <div class="mt-auto flex items-center justify-between pt-5 text-[10px] font-semibold text-[#000A57]"><span>{Number(category.trainingCount)} {Number(category.trainingCount) === 1 ? "trilha" : "trilhas"}</span><ArrowRight size={15} class="transition group-hover:translate-x-1"/></div>
          </a>
        {/each}
      </section>
    {/if}
  </div>
</main>
