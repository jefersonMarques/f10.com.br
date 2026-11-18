<script lang="ts">
  import { X } from "lucide-svelte";
  import { enhance } from "$app/forms";
  import TicketCustomerPicker from "$lib/components/operations/TicketCustomerPicker.svelte";
  import type { TicketEntryPoint, TicketQueue } from "./types";

  export let queues: TicketQueue[] = [];
  export let entryPoints: TicketEntryPoint[] = [];
  export let canSearchCustomers = false;
  export let canSearchF10Contracts = false;
  export let canManageCustomers = false;
  export let errorMessage = "";
  export let onClose: () => void;

  let clientError = "";
  let submitting = false;
</script>

<div class="fixed inset-0 z-[100] flex items-center justify-center bg-[#010D28]/35 p-4" role="presentation">
  <button type="button" class="absolute inset-0 cursor-default" aria-label="Fechar novo ticket" on:click={onClose}></button>
  <div class="relative z-10 max-h-[92vh] w-full max-w-[760px] overflow-y-auto rounded-[22px] bg-white p-5" role="dialog" aria-modal="true" aria-label="Novo ticket">
    <form method="POST" action="?/create" use:enhance={({ formData, cancel }) => {
      if (formData.getAll("contractIds").length === 0) {
        clientError = "Selecione uma escola/contrato. Se não houver opções, use Gerenciar vínculos na seção Escola / contrato.";
        cancel();
        return;
      }

      clientError = "";
      submitting = true;
      return async ({ update }) => {
        try {
          await update({ reset: false });
        } finally {
          submitting = false;
        }
      };
    }} class="grid gap-3 sm:grid-cols-2">
      <div class="flex items-center justify-between sm:col-span-2"><h2 class="text-[16px] font-semibold">Novo ticket</h2><button type="button" on:click={onClose}><X size={16}/></button></div>
      {#if clientError || errorMessage}
        <div role="alert" class="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-[13px] text-red-800 sm:col-span-2">
          {clientError || errorMessage}
        </div>
      {/if}
      <label class="sm:col-span-2 space-y-1"><span class="application-text-caption font-semibold text-app-text">Título *</span><input name="subject" required maxlength="180" placeholder="Título do atendimento" class="application-text-caption h-10 w-full rounded-xl border border-[#DDE1EA] px-3"/></label>
      <TicketCustomerPicker enabled={canSearchCustomers} {canSearchF10Contracts} {canManageCustomers}/>
      {#if entryPoints.length > 0}
        <label class="sm:col-span-2">
          <span class="application-text-meta mb-1.5 block font-bold uppercase tracking-[0.07em] text-app-text-soft">Processo inicial</span>
          <select name="startStageId" class="application-text-caption h-10 w-full rounded-xl border border-app-border-control bg-app-surface px-3 text-app-text">
            <option value="">Fluxo padrão</option>
            {#each entryPoints as entryPoint}
              <option value={entryPoint.stageId}>{entryPoint.name}</option>
            {/each}
          </select>
        </label>
      {:else}
        <input type="hidden" name="startStageId" value=""/>
      {/if}
      <label><span class="application-text-meta mb-1.5 block font-bold uppercase tracking-[0.07em] text-[#858B99]">Conclusão planejada</span><input name="dueOn" type="date" required class="application-text-caption h-10 w-full rounded-xl border border-[#DDE1EA] bg-white px-3"/></label>
      <select name="queueId" required class="application-text-meta h-10 self-end rounded-xl border border-[#DDE1EA] px-2">{#each queues as queue}<option value={queue.id}>{queue.name}</option>{/each}</select>
      <label>
        <span class="application-text-meta mb-1.5 block font-bold uppercase tracking-[0.07em] text-[#858B99]">Canal</span>
        <select name="channel" class="application-text-caption h-10 w-full rounded-xl border border-[#DDE1EA] bg-white px-3">
          <option value="manual">Manual</option>
          <option value="email">E-mail</option>
        </select>
      </label>
      <label>
        <span class="application-text-meta mb-1.5 block font-bold uppercase tracking-[0.07em] text-[#858B99]">Prioridade</span>
        <select name="priority" class="application-text-caption h-10 w-full rounded-xl border border-[#DDE1EA] bg-white px-3"><option value="normal">Normal</option><option value="low">Baixa</option><option value="high">Alta</option><option value="urgent">Urgente</option></select>
      </label>
      <textarea name="message" required maxlength="10000" rows="5" placeholder="Descrição do atendimento" class="application-text-caption rounded-xl border border-[#DDE1EA] p-3 sm:col-span-2"></textarea>
      <button disabled={submitting} class="application-text-meta h-10 rounded-xl bg-[#000A57] font-semibold text-white disabled:opacity-50 sm:col-span-2">
        {submitting ? "Criando ticket..." : "Criar ticket"}
      </button>
    </form>
  </div>
</div>
