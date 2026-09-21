<script lang="ts">
  import { CircleAlert } from "lucide-svelte";
</script>

<div class="mx-auto max-w-[1500px] px-5 pt-6 sm:px-8">
  <div class="flex items-start gap-3 rounded-2xl border border-[#F0D3A9] bg-[#FFF9F1] px-4 py-3 text-[#79501F]">
    <CircleAlert size={17} class="mt-0.5 shrink-0" />
    <div>
      <strong class="block text-[11px] font-semibold">É obrigatório uma etapa de conclusão.</strong>
      <p class="application-text-meta mt-1 leading-4">
        Nos workflows de área, se não existir uma coluna Terminal, o F10 criará automaticamente a etapa “Concluído”.
      </p>
    </div>
  </div>
</div>

<slot />
