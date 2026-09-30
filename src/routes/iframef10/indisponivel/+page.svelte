<script lang="ts">
  import { Clock3 } from "lucide-svelte";
</script>

<svelte:head><title>F10</title></svelte:head>

<div class="flex min-h-[calc(100dvh-62px)] items-center justify-center px-5 py-10">
  <div class="w-full max-w-[420px] rounded-[22px] border border-[#E2E5ED] bg-white p-6 text-center shadow-sm">
    <span class="mx-auto flex h-11 w-11 items-center justify-center rounded-xl bg-[#F3F4F7] text-[#000A57]"><Clock3 size={19}/></span>
    <h1 class="mt-4 text-[16px] font-semibold text-[#202637]">Recursos em preparação</h1>
    <p class="mt-2 text-[11px] leading-5 text-[#858B99]">Nenhuma opção está liberada neste momento.</p>
  </div>
</div>
