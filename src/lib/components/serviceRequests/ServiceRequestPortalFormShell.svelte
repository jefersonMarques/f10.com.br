<script lang="ts">
  import { Coins, FileText } from "lucide-svelte";
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

    <div class="border-t border-[#ECEEF3] bg-[#FAFBFC] p-5 sm:p-6">
      <ServiceRequestContextSelector
        surface="plain"
        {groups}
        bind:selectedGroupId
        bind:selectedUnitId
        bind:invalid={contextInvalid}
        {hint}
      />
    </div>

    <div class="border-t border-[#ECEEF3] p-5 sm:p-6">
      <div class="legacy-form">
        <slot />
      </div>
    </div>
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
