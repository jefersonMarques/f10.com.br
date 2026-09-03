<script lang="ts">
  import { Building2, School, ShieldCheck } from "lucide-svelte";

  type UnitOption = {
    unidade_id: number;
    unidade: string;
  };

  type GroupOption = {
    grupo_id: number;
    grupo: string;
    unidades: UnitOption[];
  };

  export let groups: GroupOption[] = [];
  export let selectedGroupId: number | null = null;
  export let selectedUnitId: number | null = null;
  export let hint = "";

  $: if (selectedGroupId === null && groups.length === 1) {
    selectedGroupId = groups[0]?.grupo_id ?? null;
  }

  $: selectedGroup = groups.find((group) => group.grupo_id === selectedGroupId) ?? null;
  $: units = selectedGroup?.unidades ?? [];

  $: if (selectedUnitId === null && units.length === 1) {
    selectedUnitId = units[0]?.unidade_id ?? null;
  }

  function handleGroupChange(event: Event) {
    const value = (event.currentTarget as HTMLSelectElement).value;
    selectedGroupId = value ? Number(value) : null;
    selectedUnitId = null;
  }

  function handleUnitChange(event: Event) {
    const value = (event.currentTarget as HTMLSelectElement).value;
    selectedUnitId = value ? Number(value) : null;
  }
</script>

<section class="rounded-2xl border border-[#E1E4EC] bg-white px-4 py-4 shadow-[0_8px_24px_rgba(1,13,40,0.035)] sm:px-5">
  <div class="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
    <div class="min-w-0">
      <p class="application-text-caption font-bold uppercase tracking-[0.08em] text-[#EA6D0B]">Contexto da implementação</p>
      <h2 class="mt-1 text-[16px] font-semibold text-[#202737]">Escolha o grupo e a unidade</h2>
      <p class="mt-1 text-[11px] leading-5 text-[#747C8D]">A solicitação e o chamado serão vinculados à unidade escolhida abaixo.</p>
    </div>

    <div class="grid w-full gap-3 sm:grid-cols-2 lg:max-w-[650px]">
      <label class="block">
        <span class="application-text-meta mb-1.5 flex items-center gap-1.5 font-semibold text-[#596173]"><Building2 size={14} /> Grupo</span>
        <select
          class="w-full rounded-xl border border-[#DDE1E9] bg-white px-3 py-2.5 text-[12px] text-[#202737] outline-none transition focus:border-[#000A57] focus:ring-2 focus:ring-[#000A57]/10"
          value={selectedGroupId ?? ""}
          on:change={handleGroupChange}
          aria-label="Grupo da implementação"
        >
          <option value="">Selecione o grupo</option>
          {#each groups as group (group.grupo_id)}
            <option value={group.grupo_id}>{group.grupo}</option>
          {/each}
        </select>
      </label>

      <label class="block">
        <span class="application-text-meta mb-1.5 flex items-center gap-1.5 font-semibold text-[#596173]"><School size={14} /> Unidade</span>
        <select
          class="w-full rounded-xl border border-[#DDE1E9] bg-white px-3 py-2.5 text-[12px] text-[#202737] outline-none transition focus:border-[#000A57] focus:ring-2 focus:ring-[#000A57]/10 disabled:cursor-not-allowed disabled:bg-[#F5F6F8] disabled:text-[#9AA0AC]"
          value={selectedUnitId ?? ""}
          on:change={handleUnitChange}
          disabled={selectedGroupId === null}
          aria-label="Unidade da implementação"
        >
          <option value="">Selecione a unidade</option>
          {#each units as unit (unit.unidade_id)}
            <option value={unit.unidade_id}>{unit.unidade}</option>
          {/each}
        </select>
      </label>
    </div>
  </div>

  {#if hint}
    <div class="application-text-meta mt-3 flex items-start gap-2 border-t border-[#EEF0F4] pt-3 leading-5 text-[#6A7280]">
      <ShieldCheck size={13} class="mt-0.5 shrink-0 text-[#4F6658]" />
      <span>{hint}</span>
    </div>
  {/if}
</section>
