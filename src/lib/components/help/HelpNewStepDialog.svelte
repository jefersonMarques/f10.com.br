<script lang="ts">
  import { enhance } from "$app/forms";
  import type { SubmitFunction } from "@sveltejs/kit";
  import { X } from "lucide-svelte";

  export let onClose: () => void;
  export let submitEditorModal: SubmitFunction;
  export let errorMessage: string | null = null;
</script>

<div class="fixed inset-0 z-[148] flex items-center justify-center bg-[#050A1A]/60 px-4 py-6" role="presentation">
    <section role="dialog" aria-modal="true" aria-labelledby="create-help-step-title" class="max-h-[90vh] w-full max-w-[620px] overflow-y-auto rounded-2xl bg-white p-5 shadow-2xl sm:p-6">
      <div class="mb-5 flex items-center justify-between">
        <h2 id="create-help-step-title" class="text-[18px] font-semibold">Nova etapa</h2>
        <button type="button" aria-label="Fechar" on:click={onClose} class="rounded-lg p-2 text-[#6E7584] hover:bg-[#F3F4F7]"><X size={18}/></button>
      </div>
      <form method="POST" action="?/addStep" use:enhance={submitEditorModal} class="space-y-4">
        <label class="block text-[13px] font-semibold text-[#303746]">O que o usuário fará nesta etapa?
          <input name="title" required minlength="2" maxlength="180" placeholder="Ex.: Acessar o menu Cadastros" class="mt-1.5 h-11 w-full rounded-xl border border-[#DDE1EA] px-3 text-[14px]"/>
        </label>
        <label class="block text-[13px] font-semibold text-[#303746]">Descrição (opcional)
          <textarea name="description" maxlength="2000" rows="3" placeholder="Orientação inicial da etapa" class="mt-1.5 w-full rounded-xl border border-[#DDE1EA] p-3 text-[14px]"></textarea>
        </label>
        <label class="block text-[13px] font-semibold text-[#303746]">Instrução para o cliente (opcional)
          <textarea name="initialText" maxlength="50000" rows="6" placeholder="Escreva aqui o que o cliente precisa fazer..." class="mt-1.5 w-full rounded-xl border border-[#DDE1EA] p-3 text-[14px] leading-6"></textarea>
        </label>
        <details class="rounded-xl border border-[#E2E5ED] p-3">
          <summary class="cursor-pointer text-[13px] font-semibold text-[#000A57]">Instruções adicionais para a IA</summary>
          <textarea name="assistantKnowledge" maxlength="20000" rows="4" aria-label="Instruções adicionais para a IA" class="mt-3 w-full rounded-xl border border-[#DDE1EA] p-3 text-[14px]"></textarea>
        </details>
        {#if errorMessage}<p role="alert" class="text-[13px] font-medium text-[#9B2C2C]">{form.message}</p>{/if}
        <div class="flex justify-end gap-2">
          <button type="button" on:click={onClose} class="min-h-10 rounded-xl border border-[#DDE1EA] px-4 text-[13px] font-semibold">Cancelar</button>
          <button type="submit" class="min-h-10 rounded-xl bg-[#000A57] px-5 text-[13px] font-semibold text-white">Criar etapa</button>
        </div>
      </form>
    </section>
  </div>
