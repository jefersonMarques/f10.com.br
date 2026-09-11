<script lang="ts">
  import { Columns3, List, Plus, Search, Settings2 } from "lucide-svelte";
  import type { TicketScope, TicketView } from "./types";

  export let scope: TicketScope;
  export let view: TicketView;
  export let search: string;
  export let canManageWorkflow = false;
  export let canCreate = false;
  export let onCreate: () => void;
</script>

<div class="flex flex-col gap-3 border-b border-[#EEF0F5] p-4 lg:flex-row lg:items-center lg:justify-between">
  <div class="flex rounded-xl bg-[#F3F4F7] p-1">
    <button type="button" on:click={() => (scope = "mine")} class={`application-text-meta h-8 rounded-lg px-3 font-semibold ${scope === "mine" ? "bg-white text-[#000A57] shadow-sm" : "text-[#737989]"}`}>Minha fila</button>
    <button type="button" on:click={() => (scope = "unassigned")} class={`application-text-meta h-8 rounded-lg px-3 font-semibold ${scope === "unassigned" ? "bg-white text-[#000A57] shadow-sm" : "text-[#737989]"}`}>Sem responsável</button>
    <button type="button" on:click={() => (scope = "all")} class={`application-text-meta h-8 rounded-lg px-3 font-semibold ${scope === "all" ? "bg-white text-[#000A57] shadow-sm" : "text-[#737989]"}`}>Todos</button>
  </div>

  <div class="flex flex-wrap items-center gap-2">
    <label class="relative min-w-[240px] flex-1 lg:min-w-[280px]">
      <Search size={14} class="absolute left-3 top-1/2 -translate-y-1/2 text-[#9499A5]"/>
      <input bind:value={search} placeholder="Buscar ticket, cliente ou área" class="application-text-caption h-10 w-full rounded-xl border border-[#DDE1EA] bg-[#FAFAFC] pl-9 pr-3"/>
    </label>

    <div class="flex rounded-xl bg-[#F3F4F7] p-1">
      <button type="button" on:click={() => (view = "board")} class={`application-text-meta flex h-8 items-center gap-1 rounded-lg px-2 ${view === "board" ? "bg-white text-[#000A57]" : "text-[#737989]"}`}><Columns3 size={13}/>Quadro</button>
      <button type="button" on:click={() => (view = "list")} class={`application-text-meta flex h-8 items-center gap-1 rounded-lg px-2 ${view === "list" ? "bg-white text-[#000A57]" : "text-[#737989]"}`}><List size={13}/>Lista</button>
    </div>

    {#if canManageWorkflow}
      <a href="/app/tickets/workflows" class="application-text-caption inline-flex h-10 items-center gap-2 rounded-xl border border-[#DDE1EA] bg-white px-3 font-semibold text-[#000A57]"><Settings2 size={14}/>Configurar</a>
    {/if}

    {#if canCreate}
      <button type="button" on:click={onCreate} class="application-text-caption inline-flex h-10 items-center gap-2 rounded-xl bg-[#000A57] px-4 font-semibold text-white"><Plus size={14}/>Novo ticket</button>
    {/if}
  </div>
</div>
