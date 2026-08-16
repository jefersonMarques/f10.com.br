<script lang="ts">
  import { ArrowLeft, Clock3, Save } from "lucide-svelte";
  import type { ActionData, PageData } from "./$types";

  export let data: PageData;
  export let form: ActionData;

  const days = [
    ["monday", "Segunda-feira"],
    ["tuesday", "Terça-feira"],
    ["wednesday", "Quarta-feira"],
    ["thursday", "Quinta-feira"],
    ["friday", "Sexta-feira"],
    ["saturday", "Sábado"],
    ["sunday", "Domingo"],
  ] as const;
</script>

<svelte:head><title>Horário de atendimento | F10 Operations</title></svelte:head>

<div class="mx-auto max-w-[920px] px-5 py-7 sm:px-8 sm:py-9">
  <a href="/app/settings" class="inline-flex items-center gap-2 text-[10px] font-semibold text-[#6F7585] hover:text-[#000A57]"><ArrowLeft size={14}/>Configurações</a>

  <div class="mt-5 flex items-start gap-3">
    <span class="flex h-11 w-11 items-center justify-center rounded-xl bg-[#EEF0FF] text-[#000A57]"><Clock3 size={20}/></span>
    <div>
      <p class="text-[10px] font-bold uppercase tracking-[0.14em] text-[#EA6D0B]">Atendimento</p>
      <h1 class="mt-1 text-[30px] font-semibold tracking-[-0.035em] text-[#010D28]">Horário de funcionamento</h1>
      <p class="mt-2 max-w-[700px] text-[12px] leading-6 text-[#6F7585]">Define o que o cliente verá no chat. O fuso horário continua sendo configurado em Configurações Gerais.</p>
    </div>
  </div>

  {#if form?.message}
    <div class={`mt-6 rounded-2xl border px-4 py-3 text-[10px] font-medium ${form.success ? "border-[#B9E6C9] bg-[#F1FBF4] text-[#176B35]" : "border-[#F0C8C8] bg-[#FFF5F5] text-[#9B2C2C]"}`}>{form.message}</div>
  {/if}

  <form method="POST" action="?/save" class="mt-7 rounded-[24px] border border-[#E2E5ED] bg-white p-5 sm:p-6">
    <label class="flex items-start gap-3 rounded-2xl border border-[#DDE1EA] bg-[#F8F9FC] px-4 py-3">
      <input name="configured" type="checkbox" checked={data.settings.configured} class="mt-1 h-4 w-4 rounded border-[#C9CEDA]" />
      <span><strong class="block text-[11px] text-[#303746]">Publicar disponibilidade no chat</strong><span class="mt-1 block text-[9px] leading-4 text-[#858B99]">Quando desativado, o chat não afirma que a equipe está aberta ou fechada.</span></span>
    </label>

    <div class="mt-5 divide-y divide-[#EEF0F5] rounded-2xl border border-[#E2E5ED]">
      {#each days as [key, label]}
        <div class="grid gap-3 px-4 py-4 sm:grid-cols-[180px_1fr_1fr] sm:items-center">
          <label class="flex items-center gap-2 text-[10px] font-semibold text-[#454C5C]">
            <input name={`${key}Enabled`} type="checkbox" checked={data.settings.days[key].enabled} class="h-4 w-4 rounded border-[#C9CEDA]" />
            {label}
          </label>
          <label class="block"><span class="mb-1 block text-[8px] font-semibold uppercase tracking-[0.08em] text-[#969CAA]">Início</span><input name={`${key}Start`} type="time" value={data.settings.days[key].start} class="h-10 w-full rounded-xl border border-[#DDE1EA] px-3 text-[11px]" /></label>
          <label class="block"><span class="mb-1 block text-[8px] font-semibold uppercase tracking-[0.08em] text-[#969CAA]">Fim</span><input name={`${key}End`} type="time" value={data.settings.days[key].end} class="h-10 w-full rounded-xl border border-[#DDE1EA] px-3 text-[11px]" /></label>
        </div>
      {/each}
    </div>

    <p class="mt-4 text-[9px] leading-5 text-[#858B99]">Nesta primeira versão cada dia possui uma única faixa contínua. Feriados e exceções podem ser adicionados depois sem alterar o modelo principal.</p>

    <button type="submit" class="mt-5 inline-flex min-h-10 items-center gap-2 rounded-xl bg-[#000A57] px-4 text-[10px] font-semibold text-white"><Save size={14}/>Salvar horário</button>
  </form>
</div>
