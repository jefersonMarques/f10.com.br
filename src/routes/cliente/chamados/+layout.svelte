<script lang="ts">
  import { BookOpen, LogOut } from "lucide-svelte";
  import type { LayoutData } from "./$types";

  export let data: LayoutData;
</script>

<div class="min-h-screen bg-[#F7F8FB] text-[#10172A]">
  <header class="border-b border-[#E2E5EC] bg-white">
    <div class="mx-auto flex max-w-[1120px] items-center justify-between gap-4 px-5 py-4 sm:px-8">
      <div>
        <a href="/cliente/chamados" class="text-[16px] font-semibold tracking-[-0.02em] text-[#010D28]">Área do Cliente F10</a>
        <p class="mt-0.5 text-[9px] text-[#8A91A0]">{data.customer.name} · {data.customer.email}</p>
      </div>
      <div class="flex items-center gap-2">
        <a href="/ajuda-f10" class="inline-flex min-h-10 items-center gap-2 rounded-xl border border-[#E0E3EA] px-3 text-[10px] font-semibold text-[#5E6575] hover:text-[#000A57]"><BookOpen size={15} />Ajuda</a>
        <form method="POST" action="/cliente/sair">
          <button type="submit" class="inline-flex min-h-10 items-center gap-2 rounded-xl bg-[#F1F3F7] px-3 text-[10px] font-semibold text-[#5E6575] hover:text-[#000A57]"><LogOut size={15} />Sair</button>
        </form>
      </div>
    </div>
  </header>
  <slot />
</div>
