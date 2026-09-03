<script lang="ts">
  import { Coins, FileText, MapPin } from "lucide-svelte";
  import ApplicationBackLink from "$lib/components/application/ApplicationBackLink.svelte";
  import ApplicationContent from "$lib/components/application/ApplicationContent.svelte";
  import ServiceRequestContextSelector from "$lib/components/serviceRequests/ServiceRequestContextSelector.svelte";

  type UnitOption = {
    unidade_id: number;
    unidade: string;
  };

  type GroupOption = {
    grupo_id: number;
    grupo: string;
    unidades: UnitOption[];
  };

  export let requestType: "nfse" | "cell-coin";
  export let title: string;
  export let description: string;
  export let groups: GroupOption[] = [];
  export let selectedGroupId: number | null = null;
  export let selectedUnitId: number | null = null;
  export let contextInvalid = false;
  export let hint = "";

  let contextConfirmed = false;

  $: singleGroup = groups.length === 1 ? groups[0] ?? null : null;
  $: singleUnit = singleGroup?.unidades.length === 1 ? singleGroup.unidades[0] ?? null : null;

  $: if (singleGroup && singleUnit) {
    selectedGroupId = singleGroup.grupo_id;
    selectedUnitId = singleUnit.unidade_id;
    contextConfirmed = true;
    contextInvalid = false;
  }

  $: selectedGroup = groups.find((group) => group.grupo_id === selectedGroupId) ?? null;
  $: selectedUnit = selectedGroup?.unidades.find((unit) => unit.unidade_id === selectedUnitId) ?? null;
  $: contextReady = selectedGroup !== null && selectedUnit !== null;
  $: canChangeContext = !(singleGroup && singleUnit);

  function confirmContext(): void {
    if (!contextReady) {
      contextInvalid = true;
      return;
    }
    contextInvalid = false;
    contextConfirmed = true;
  }

  function changeContext(): void {
    if (!canChangeContext) return;
    contextConfirmed = false;
  }
</script>

<ApplicationContent width="narrow" density="normal" className="pb-10">
  <ApplicationBackLink href="/cliente/solicitacoes" label="Solicitações" className="mb-3" />

  <section class="overflow-hidden rounded-[24px] border border-[#E1E4EC] bg-white shadow-[0_10px_32px_rgba(1,13,40,0.04)]">
    <header class="p-5 sm:p-6">
      <div class="flex items-start gap-3">
        <div class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#F1F3FF] text-[#000A57]">
          {#if requestType === "nfse"}
            <FileText size={19} />
          {:else}
            <Coins size={19} />
          {/if}
        </div>
        <div class="min-w-0">
          <p class="application-text-caption font-bold uppercase tracking-[0.1em] text-[#EA6D0B]">Implementações F10</p>
          <h1 class="mt-1 text-[22px] font-semibold tracking-[-0.03em] text-[#202737]">{title}</h1>
          <p class="application-text-meta mt-1 max-w-[760px] leading-5 text-[#858C9C]">{description}</p>
        </div>
      </div>
    </header>

    {#if !contextConfirmed}
      <div class="border-t border-[#ECEEF3] bg-[#FAFBFC] p-5 sm:p-6">
        <ServiceRequestContextSelector
          surface="plain"
          {groups}
          bind:selectedGroupId
          bind:selectedUnitId
          bind:invalid={contextInvalid}
        />

        <div class="mt-5 flex justify-end border-t border-[#E8EBF1] pt-4">
          <button
            type="button"
            class="inline-flex min-h-11 items-center justify-center rounded-xl bg-[#000A57] px-5 text-[11px] font-semibold text-white transition hover:bg-[#111B71] disabled:cursor-not-allowed disabled:opacity-50"
            disabled={!contextReady}
            on:click={confirmContext}
          >
            Continuar
          </button>
        </div>
      </div>
    {:else}
      <div class="flex flex-wrap items-center justify-between gap-3 border-t border-[#ECEEF3] bg-[#FAFBFC] px-5 py-3 sm:px-6">
        <div class="flex min-w-0 items-center gap-2 text-[#626A7A]">
          <MapPin size={14} class="shrink-0 text-[#000A57]" />
          <span class="application-text-caption truncate">
            <strong class="font-semibold text-[#343C4C]">{selectedGroup?.grupo}</strong>
            <span class="mx-1.5 text-[#B0B5BF]">·</span>
            {selectedUnit?.unidade}
          </span>
        </div>
        {#if canChangeContext}
          <button
            type="button"
            class="application-text-caption rounded-lg px-2.5 py-1.5 font-semibold text-[#000A57] transition hover:bg-[#EEF0FF]"
            on:click={changeContext}
          >
            Alterar
          </button>
        {/if}
      </div>

      <div class="border-t border-[#ECEEF3] p-5 sm:p-6">
        <div class="legacy-form">
          <slot />
        </div>
      </div>
    {/if}
  </section>
</ApplicationContent>

<style>
  .legacy-form :global(section.min-h-screen) {
    min-height: 0 !important;
    padding-bottom: 0 !important;
    background: transparent !important;
    display: block !important;
  }

  .legacy-form :global(section.min-h-screen > nav[itemtype="https://schema.org/BreadcrumbList"]) {
    display: none !important;
  }

  .legacy-form :global(section.min-h-screen > .container) {
    width: 100% !important;
    max-width: none !important;
    min-height: 0 !important;
    margin: 0 !important;
    padding: 0 !important;
    display: block !important;
  }

  .legacy-form :global(section.min-h-screen > .container > header) {
    margin: 0 0 1.25rem !important;
  }

  .legacy-form :global(section.min-h-screen > .container > header > h1) {
    display: none !important;
  }

  .legacy-form :global(section.min-h-screen > .container > header > div.mt-4 > div) {
    height: 0.3rem !important;
  }

  .legacy-form :global(section.min-h-screen > .container > header > div.mt-2) {
    font-size: 11px !important;
    line-height: 1.25rem !important;
    color: #747C8D !important;
  }

  .legacy-form :global(section.min-h-screen > .container > header + div) {
    padding: 0 !important;
    border: 0 !important;
    background: transparent !important;
    box-shadow: none !important;
  }

  .legacy-form :global(input:not([type="checkbox"]):not([type="radio"]):not([type="file"]):not([type="hidden"]):not([class*="border-red"])),
  .legacy-form :global(select:not([class*="border-red"])),
  .legacy-form :global(textarea:not([class*="border-red"])) {
    border-color: #DDE1E9 !important;
  }

  .legacy-form :global(input:not([type="checkbox"]):not([type="radio"]):not([type="file"]):not([type="hidden"])),
  .legacy-form :global(select),
  .legacy-form :global(textarea) {
    font-size: 12px !important;
    color: #202737 !important;
  }

  .legacy-form :global(input:not([type="checkbox"]):not([type="radio"]):not([type="file"]):not([type="hidden"]):focus),
  .legacy-form :global(select:focus),
  .legacy-form :global(textarea:focus) {
    border-color: #000A57 !important;
    outline: none !important;
    box-shadow: 0 0 0 4px rgba(0, 10, 87, 0.08) !important;
  }

  .legacy-form :global(button[class*="bg-[var(--primary)]"]),
  .legacy-form :global(a[class*="bg-[var(--primary)]"]) {
    background: #000A57 !important;
    color: #FFFFFF !important;
    filter: none !important;
  }

  .legacy-form :global(button[class*="bg-[var(--primary)]"]:hover),
  .legacy-form :global(a[class*="bg-[var(--primary)]"]:hover) {
    background: #111B71 !important;
    filter: none !important;
  }

  .legacy-form :global([class*="border-black/10"]) {
    border-color: #E1E4EC !important;
  }

  .legacy-form :global([class*="border-black/15"]) {
    border-color: #DDE1E9 !important;
  }

  @media (max-width: 639px) {
    .legacy-form :global(section.min-h-screen > .container > header) {
      margin-bottom: 1rem !important;
    }
  }
</style>
