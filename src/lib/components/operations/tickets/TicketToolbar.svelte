<script lang="ts">
  import {
    Columns3,
    List,
    PanelRight,
    Plus,
    Search,
    Settings2,
    SlidersHorizontal,
    X,
  } from "lucide-svelte";
  import type {
    TicketLabel,
    TicketScope,
    TicketView,
    TicketWorkflowBoard,
  } from "./types";

  export let scope: TicketScope;
  export let view: TicketView;
  export let search: string;
  export let status: string;
  export let priority: string;
  export let queueId: string;
  export let assigneeId: string;
  export let areaId: string;
  export let stageId: string;
  export let channel: string;
  export let sla: string;
  export let tagId: string;
  export let queues: Array<{ id: string; name: string }> = [];
  export let agents: Array<{ id: string; name: string; email: string }> = [];
  export let labels: TicketLabel[] = [];
  export let workflowBoard: TicketWorkflowBoard;
  export let canManageWorkflow = false;
  export let canCreate = false;
  export let onApply: () => void;
  export let onClear: () => void;
  export let onCreate: () => void;

  $: selectedAreaWorkflow = areaId
    ? workflowBoard.areaWorkflows.find((workflow) => workflow.areaId === areaId) ?? null
    : null;
  $: stageOptions = selectedAreaWorkflow?.stages ?? workflowBoard.globalWorkflow?.stages ?? [];
  $: activeFilterCount = [
    status,
    priority,
    queueId,
    assigneeId,
    areaId,
    stageId,
    channel,
    sla,
    tagId,
  ].filter(Boolean).length;

  function switchScope(next: TicketScope): void {
    scope = next;
    onApply();
  }

  function switchView(next: TicketView): void {
    view = next;
    onApply();
  }

  function changeArea(): void {
    stageId = "";
    onApply();
  }
</script>

<div class="border-b border-[#EEF0F5] bg-white">
  <div class="flex flex-col gap-3 p-4 xl:flex-row xl:items-center xl:justify-between">
    <div class="flex min-w-0 flex-wrap items-center gap-2">
      <div class="flex rounded-xl bg-[#F3F4F7] p-1">
        <button type="button" on:click={() => switchScope("mine")} class={`application-text-meta h-8 rounded-lg px-3 font-semibold ${scope === "mine" ? "bg-white text-[#000A57] shadow-sm" : "text-[#737989]"}`}>Minha fila</button>
        <button type="button" on:click={() => switchScope("unassigned")} class={`application-text-meta h-8 rounded-lg px-3 font-semibold ${scope === "unassigned" ? "bg-white text-[#000A57] shadow-sm" : "text-[#737989]"}`}>Sem responsável</button>
        <button type="button" on:click={() => switchScope("all")} class={`application-text-meta h-8 rounded-lg px-3 font-semibold ${scope === "all" ? "bg-white text-[#000A57] shadow-sm" : "text-[#737989]"}`}>Todos</button>
      </div>

      <form on:submit|preventDefault={onApply} class="relative min-w-[220px] flex-1 xl:min-w-[300px]">
        <Search size={14} class="absolute left-3 top-1/2 -translate-y-1/2 text-[#9499A5]"/>
        <input bind:value={search} placeholder="Buscar ticket, cliente, empresa ou fila" class="application-text-caption h-10 w-full rounded-xl border border-[#DDE1EA] bg-[#FAFAFC] pl-9 pr-3"/>
      </form>

      <details class="relative">
        <summary class={`application-text-caption flex h-10 cursor-pointer list-none items-center gap-2 rounded-xl border px-3 font-semibold ${activeFilterCount > 0 ? "border-[#AEB7E8] bg-[#F3F5FF] text-[#000A57]" : "border-[#DDE1EA] bg-white text-[#525A69]"}`}>
          <SlidersHorizontal size={14}/>
          Filtros
          {#if activeFilterCount > 0}<span class="rounded-full bg-[#000A57] px-1.5 py-0.5 text-[9px] text-white">{activeFilterCount}</span>{/if}
        </summary>

        <div class="absolute left-0 top-12 z-50 w-[min(640px,calc(100vw-32px))] rounded-2xl border border-[#DDE1EA] bg-white p-4 shadow-[0_18px_50px_rgba(1,13,40,0.16)]">
          <div class="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <label>
              <span class="application-text-meta mb-1 block font-semibold text-[#687080]">Status</span>
              <select bind:value={status} on:change={onApply} class="application-text-caption h-10 w-full rounded-xl border border-[#DDE1EA] bg-white px-2">
                <option value="">Todos</option>
                <option value="new">Novo</option>
                <option value="open">Aberto</option>
                <option value="in_progress">Em andamento</option>
                <option value="waiting_customer">Aguardando cliente</option>
                <option value="resolved">Resolvido</option>
                <option value="closed">Fechado</option>
              </select>
            </label>

            <label>
              <span class="application-text-meta mb-1 block font-semibold text-[#687080]">Prioridade</span>
              <select bind:value={priority} on:change={onApply} class="application-text-caption h-10 w-full rounded-xl border border-[#DDE1EA] bg-white px-2">
                <option value="">Todas</option>
                <option value="urgent">Urgente</option>
                <option value="high">Alta</option>
                <option value="normal">Normal</option>
                <option value="low">Baixa</option>
              </select>
            </label>

            <label>
              <span class="application-text-meta mb-1 block font-semibold text-[#687080]">SLA</span>
              <select bind:value={sla} on:change={onApply} class="application-text-caption h-10 w-full rounded-xl border border-[#DDE1EA] bg-white px-2">
                <option value="">Todos</option>
                <option value="overdue">Vencido</option>
                <option value="risk">Vence em até 1h</option>
                <option value="first_response">Aguardando 1ª resposta</option>
              </select>
            </label>

            <label>
              <span class="application-text-meta mb-1 block font-semibold text-[#687080]">Processo</span>
              <select bind:value={areaId} on:change={changeArea} class="application-text-caption h-10 w-full rounded-xl border border-[#DDE1EA] bg-white px-2">
                <option value="">Todos</option>
                {#each workflowBoard.areaWorkflows as workflow}
                  <option value={workflow.areaId ?? ""}>{workflow.areaName ?? "Processo"}</option>
                {/each}
              </select>
            </label>

            <label>
              <span class="application-text-meta mb-1 block font-semibold text-[#687080]">Etapa</span>
              <select bind:value={stageId} on:change={onApply} class="application-text-caption h-10 w-full rounded-xl border border-[#DDE1EA] bg-white px-2">
                <option value="">Todas</option>
                {#each stageOptions as stage}<option value={stage.id}>{stage.name}</option>{/each}
              </select>
            </label>

            <label>
              <span class="application-text-meta mb-1 block font-semibold text-[#687080]">Responsável</span>
              <select bind:value={assigneeId} on:change={onApply} class="application-text-caption h-10 w-full rounded-xl border border-[#DDE1EA] bg-white px-2">
                <option value="">Todos</option>
                <option value="unassigned">Sem responsável</option>
                {#each agents as agent}<option value={agent.id}>{agent.name}</option>{/each}
              </select>
            </label>

            <label>
              <span class="application-text-meta mb-1 block font-semibold text-[#687080]">Fila</span>
              <select bind:value={queueId} on:change={onApply} class="application-text-caption h-10 w-full rounded-xl border border-[#DDE1EA] bg-white px-2">
                <option value="">Todas</option>
                {#each queues as queue}<option value={queue.id}>{queue.name}</option>{/each}
              </select>
            </label>

            <label>
              <span class="application-text-meta mb-1 block font-semibold text-[#687080]">Canal</span>
              <select bind:value={channel} on:change={onApply} class="application-text-caption h-10 w-full rounded-xl border border-[#DDE1EA] bg-white px-2">
                <option value="">Todos</option>
                <option value="manual">Manual</option>
                <option value="portal">Portal</option>
                <option value="email">E-mail</option>
                <option value="web_chat">Chat</option>
                <option value="whatsapp">WhatsApp</option>
              </select>
            </label>

            <label>
              <span class="application-text-meta mb-1 block font-semibold text-[#687080]">Etiqueta</span>
              <select bind:value={tagId} on:change={onApply} class="application-text-caption h-10 w-full rounded-xl border border-[#DDE1EA] bg-white px-2">
                <option value="">Todas</option>
                {#each labels as label}<option value={label.id}>{label.name}</option>{/each}
              </select>
            </label>
          </div>

          {#if activeFilterCount > 0}
            <div class="mt-4 flex justify-end border-t border-[#EEF0F5] pt-3">
              <button type="button" on:click={onClear} class="application-text-meta inline-flex h-9 items-center gap-1.5 rounded-lg px-3 font-semibold text-[#777E8D] hover:bg-[#F5F6F8]"><X size={12}/>Limpar filtros</button>
            </div>
          {/if}
        </div>
      </details>
    </div>

    <div class="flex flex-wrap items-center gap-2">
      <div class="flex rounded-xl bg-[#F3F4F7] p-1">
        <button type="button" title="Lista" aria-label="Lista" on:click={() => switchView("list")} class={`flex h-8 items-center gap-1 rounded-lg px-2.5 ${view === "list" ? "bg-white text-[#000A57] shadow-sm" : "text-[#737989]"}`}><List size={14}/><span class="application-text-meta font-semibold">Lista</span></button>
        <button type="button" title="Visão dividida" aria-label="Visão dividida" on:click={() => switchView("split")} class={`flex h-8 items-center gap-1 rounded-lg px-2.5 ${view === "split" ? "bg-white text-[#000A57] shadow-sm" : "text-[#737989]"}`}><PanelRight size={14}/><span class="application-text-meta hidden font-semibold sm:inline">Dividida</span></button>
        <button type="button" title="Kanban" aria-label="Kanban" on:click={() => switchView("board")} class={`flex h-8 items-center gap-1 rounded-lg px-2.5 ${view === "board" ? "bg-white text-[#000A57] shadow-sm" : "text-[#737989]"}`}><Columns3 size={14}/><span class="application-text-meta font-semibold">Kanban</span></button>
      </div>

      {#if canManageWorkflow}
        <a href="/app/tickets/workflows" title="Configurar workflows" aria-label="Configurar workflows" class="flex h-10 w-10 items-center justify-center rounded-xl border border-[#DDE1EA] bg-white text-[#000A57]"><Settings2 size={15}/></a>
      {/if}

      {#if canCreate}
        <button type="button" on:click={onCreate} class="application-text-caption inline-flex h-10 items-center gap-2 rounded-xl bg-[#000A57] px-4 font-semibold text-white"><Plus size={14}/>Novo ticket</button>
      {/if}
    </div>
  </div>
</div>
