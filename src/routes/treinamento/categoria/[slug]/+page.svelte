<script lang="ts">
  import { ArrowLeft, ArrowRight, GraduationCap } from "lucide-svelte";
  import HelpCategoryIcon from "$lib/components/help/HelpCategoryIcon.svelte";
  import type { PageData } from "./$types";

  export let data: PageData;
</script>

<svelte:head><title>{data.category.name} | Guias F10</title></svelte:head>

<main class="min-h-[100dvh] bg-[#F6F7FA] px-4 py-8 text-[#061333] sm:px-6 sm:py-12">
  <div class="mx-auto max-w-[900px]">
    <a href="/treinamento/categorias" class="inline-flex min-h-10 items-center gap-2 rounded-full px-2 text-[11px] font-semibold text-[#667086]"><ArrowLeft size={15}/>Todas as áreas</a>

    <header class="mt-6 rounded-[28px] border border-[#E1E4EB] bg-white p-7 shadow-[0_18px_48px_rgba(12,23,52,0.05)] sm:p-9">
      <span class="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#F7F8FB] text-[#000A57]"><HelpCategoryIcon name={data.category.icon} size={28}/></span>
      <h1 class="mt-4 text-[30px] font-semibold tracking-[-0.04em] sm:text-[40px]">{data.category.name}</h1>
      {#if data.category.description}<p class="mt-3 max-w-[680px] text-[13px] leading-6 text-[#6C7589]">{data.category.description}</p>{/if}
    </header>

    <section class="mt-8">
      <div class="flex items-center gap-2"><GraduationCap size={18} class="text-[#F36B00]"/><h2 class="text-[16px] font-semibold">Trilhas</h2></div>
      <p class="mt-1 text-[11px] text-[#858D9D]">Escolha uma tarefa e siga uma orientação de cada vez.</p>

      {#if data.category.trainings.length === 0}
        <div class="mt-4 rounded-[22px] border border-[#E1E4EB] bg-white px-5 py-10 text-center text-[12px] text-[#7B8393]">Nenhuma trilha pública disponível nesta área.</div>
      {:else}
        <div class="mt-4 grid gap-3 sm:grid-cols-2">
          {#each data.category.trainings as training}
            <a href={`/treinamento/trilha/${encodeURIComponent(training.slug)}`} class="group flex min-h-[145px] flex-col rounded-[22px] border border-[#E1E4EB] bg-white p-5 transition hover:-translate-y-0.5 hover:shadow-[0_16px_38px_rgba(12,23,52,0.08)]">
              <h3 class="text-[15px] font-semibold tracking-[-0.02em] text-[#11182C]">{training.title}</h3>
              {#if training.audience}<p class="mt-2 text-[10px] leading-5 text-[#7A8292]">Para {training.audience}</p>{/if}
              <span class="mt-auto flex items-center justify-between pt-5 text-[10px] font-bold text-[#B94E00]">Começar guia<ArrowRight size={14} class="transition group-hover:translate-x-1"/></span>
            </a>
          {/each}
        </div>
      {/if}
    </section>
  </div>
</main>
