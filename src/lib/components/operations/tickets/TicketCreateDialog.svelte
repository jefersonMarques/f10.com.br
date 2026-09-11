<script lang="ts">
  import { X } from "lucide-svelte";
  import TicketCustomerPicker from "$lib/components/operations/TicketCustomerPicker.svelte";
  import type { TicketQueue } from "./types";

  export let queues: TicketQueue[] = [];
  export let canSearchCustomers = false;
  export let onClose: () => void;
</script>

<div class="fixed inset-0 z-[100] flex items-center justify-center bg-[#010D28]/35 p-4" role="presentation">
  <button type="button" class="absolute inset-0 cursor-default" aria-label="Fechar novo ticket" on:click={onClose}></button>
  <div class="relative z-10 max-h-[92vh] w-full max-w-[760px] overflow-y-auto rounded-[22px] bg-white p-5" role="dialog" aria-modal="true" aria-label="Novo ticket">
    <form method="POST" action="?/create" class="grid gap-3 sm:grid-cols-2">
      <div class="flex items-center justify-between sm:col-span-2"><h2 class="text-[16px] font-semibold">Novo ticket</h2><button type="button" on:click={onClose}><X size={16}/></button></div>
      <input name="subject" required maxlength="180" placeholder="Assunto" class="application-text-caption h-10 rounded-xl border border-[#DDE1EA] px-3 sm:col-span-2"/>
      <TicketCustomerPicker enabled={canSearchCustomers}/>
      <label><span class="application-text-meta mb-1.5 block font-bold uppercase tracking-[0.07em] text-[#858B99]">Conclusão planejada</span><input name="dueOn" type="date" required class="application-text-caption h-10 w-full rounded-xl border border-[#DDE1EA] bg-white px-3"/></label>
      <select name="queueId" required class="application-text-meta h-10 self-end rounded-xl border border-[#DDE1EA] px-2">{#each queues as queue}<option value={queue.id}>{queue.name}</option>{/each}</select>
      <select name="priority" class="application-text-meta h-10 rounded-xl border border-[#DDE1EA] px-2"><option value="normal">Normal</option><option value="low">Baixa</option><option value="high">Alta</option><option value="urgent">Urgente</option></select>
      <textarea name="message" required maxlength="10000" rows="5" placeholder="Descrição do atendimento" class="application-text-caption rounded-xl border border-[#DDE1EA] p-3 sm:col-span-2"></textarea>
      <button class="application-text-meta h-10 rounded-xl bg-[#000A57] font-semibold text-white sm:col-span-2">Criar ticket</button>
    </form>
  </div>
</div>
