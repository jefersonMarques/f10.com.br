<script lang="ts">
  import { ArrowLeft, Building2, MapPin, ShieldCheck } from "lucide-svelte";
  import type { ActionData, PageData } from "./$types";

  export let data: PageData;
  export let form: ActionData;
</script>

<svelte:head>
  <title>Selecione a unidade | Área do Cliente F10</title>
  <meta name="description" content="Escolha o grupo e a unidade F10 que serão usados como contexto do atendimento." />
</svelte:head>

<main class="min-h-screen bg-[#F7F8FB] px-5 py-8 text-[#10172A] sm:py-14">
  <div class="mx-auto max-w-[760px]">
    <a href="/cliente/chamados" class="inline-flex min-h-10 items-center gap-2 rounded-xl px-2 text-[11px] font-semibold text-[#5F6676] hover:bg-white hover:text-[#000A57]"><ArrowLeft size={16} />Área do Cliente</a>

    <section class="mt-5 overflow-hidden rounded-[28px] border border-[#E1E4EC] bg-white shadow-[0_18px_55px_rgba(1,13,40,0.07)]">
      <header class="bg-[#010D28] px-6 py-7 text-white sm:px-8">
        <span class="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-white/10 text-[#FF9A4B]"><ShieldCheck size={21} /></span>
        <p class="mt-5 text-[10px] font-bold uppercase tracking-[0.14em] text-[#FF9A4B]">Contexto do atendimento</p>
        <h1 class="mt-2 text-[28px] font-semibold tracking-[-0.04em] sm:text-[34px]">Em qual unidade você precisa de ajuda?</h1>
        <p class="mt-3 text-[12px] leading-6 text-white/65">Mostramos somente os grupos e unidades liberados para {data.customer.email}. A unidade escolhida fica vinculada aos novos atendimentos.</p>
      </header>

      <div class="px-6 py-7 sm:px-8">
        {#if form?.message}
          <div class="mb-5 rounded-2xl border border-[#F0D0C8] bg-[#FFF7F4] px-4 py-3 text-[11px] leading-5 text-[#8A493A]">{form.message}</div>
        {/if}

        {#if data.customer.groups.length === 0 || data.customer.groups.every((group) => group.unidades.length === 0)}
          <div class="rounded-2xl border border-dashed border-[#D4D9E3] bg-[#FAFAFC] px-5 py-8 text-center">
            <Building2 size={28} class="mx-auto text-[#8C93A2]" />
            <h2 class="mt-3 text-[15px] font-semibold text-[#303746]">Nenhuma unidade disponível</h2>
            <p class="mx-auto mt-2 max-w-[500px] text-[10px] leading-5 text-[#818898]">Sua autenticação F10 foi aceita, mas a conta não retornou unidades disponíveis para atendimento.</p>
          </div>
        {:else}
          <div class="space-y-5">
            {#each data.customer.groups as group}
              {#if group.unidades.length > 0}
                <section>
                  <div class="mb-2 flex items-center gap-2"><Building2 size={15} class="text-[#EA6D0B]"/><h2 class="text-[12px] font-semibold text-[#303746]">{group.grupo}</h2></div>
                  <div class="grid gap-2 sm:grid-cols-2">
                    {#each group.unidades as unit}
                      <form method="POST" action="?/selectUnit">
                        <input type="hidden" name="groupId" value={group.grupo_id}/>
                        <input type="hidden" name="unitId" value={unit.unidade_id}/>
                        <input type="hidden" name="returnTo" value={form && "returnTo" in form ? form.returnTo ?? data.returnTo : data.returnTo}/>
                        <button type="submit" class={`flex min-h-[88px] w-full items-center gap-3 rounded-2xl border p-4 text-left transition hover:border-[#AEB7D4] hover:bg-[#FBFBFE] ${data.customer.selectedUnitId === unit.unidade_id && data.customer.selectedGroupId === group.grupo_id ? "border-[#AEB7D4] bg-[#F7F8FF]" : "border-[#E1E4EC] bg-white"}`}>
                          <span class="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#EEF0FF] text-[#000A57]"><MapPin size={17}/></span>
                          <span class="min-w-0"><strong class="block truncate text-[12px] font-semibold text-[#202737]">{unit.unidade}</strong><span class="mt-1 block text-[8px] text-[#969CA9]">Unidade #{unit.unidade_id}</span></span>
                        </button>
                      </form>
                    {/each}
                  </div>
                </section>
              {/if}
            {/each}
          </div>
        {/if}
      </div>
    </section>
  </div>
</main>
