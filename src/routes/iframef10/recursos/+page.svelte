<script lang="ts">
  import { Boxes } from "lucide-svelte";
  import SolutionsLight from "$lib/components/SolutionsLight.svelte";
</script>

<svelte:head><title>Recursos F10</title></svelte:head>

<div class="px-4 pt-5 sm:px-6 sm:pt-7">
  <header class="mx-auto max-w-[1280px] rounded-[22px] border border-[#E2E5ED] bg-white p-5 sm:p-6">
    <div class="flex items-center gap-3">
      <span class="flex h-10 w-10 items-center justify-center rounded-xl bg-[#EEF0FF] text-[#000A57]"><Boxes size={18}/></span>
      <div><h1 class="text-[18px] font-semibold text-[#202637]">Recursos F10</h1><p class="mt-0.5 text-[11px] text-[#858B99]">Conheça os módulos e recursos disponíveis no ecossistema F10.</p></div>
    </div>
  </header>
</div>

<div class="mt-4 overflow-hidden">
  <SolutionsLight embedded={true}/>
</div>
