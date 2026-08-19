<script lang="ts">
  import {
    ArrowDown,
    ArrowLeft,
    ArrowUp,
    Boxes,
    CheckCircle2,
    CircleAlert,
    GitBranch,
    Layers3,
    Plus,
    Save,
    Trash2,
  } from "lucide-svelte";
  import type { ActionData, PageData } from "./$types";

  export let data: PageData;
  export let form: ActionData;

  const lifecycleLabels: Record<string, string> = {
    new: "Novo",
    open: "Aberto",
    in_progress: "Em andamento",
    waiting_customer: "Aguardando cliente",
    resolved: "Resolvido",
    closed: "Fechado",
  };

  const stageTypeLabels: Record<string, string> = {
    normal: "Etapa normal",
    area_gateway: "Gateway de área",
    terminal: "Etapa terminal",
  };

  let selectedWorkflowId = data.workflows.find((workflow) => workflow.kind === "global")?.id
    ?? data.workflows[0]?.id
    ?? "";

  $: selectedWorkflow = data.workflows.find((workflow) => workflow.id === selectedWorkflowId) ?? null;
  $: globalWorkflow = data.workflows.find((workflow) => workflow.kind === "global") ?? null;
  $: areaWorkflows = data.workflows.filter((workflow) => workflow.kind === "area");
  $: availableQueues = data.queues.filter(
    (queue) => !areaWorkflows.some((workflow) => workflow.queueId === queue.id),
  );
</script>

<svelte:head><title>Workflows de tickets | F10 Operations</title></svelte:head>

<div class="mx-auto max-w-[1500px] px-5 py-7 sm:px-8 sm:py-9">
  <a href="/app/tickets" class="inline-flex min-h-10 items-center gap-2 rounded-xl px-2 text-[11px] font-semibold text-[#5F6575] transition hover:bg-white hover:text-[#000A57]"><ArrowLeft size={16}/>Voltar para tickets</a>

  <div class="mt-5 flex flex-col justify-between gap-5 xl:flex-row xl:items-end">
    <div>
      <p class="text-[11px] font-bold uppercase tracking-[0.14em] text-[#EA6D0B]">Processos</p>
      <h1 class="mt-2 text-[30px] font-semibold tracking-[-0.035em] text-[#010D28] sm:text-[38px]">Workflows de tickets</h1>
      <p class="mt-2 max-w-[850px] text-[13px] leading-6 text-[#6F7585]">O fluxo global mostra onde o ticket está na empresa. Um gateway encaminha o ticket para uma área, onde ele passa a seguir o processo interno daquela equipe.</p>
    </div>
  </div>

  {#if form?.message}
    <div class={`mt-6 flex items-start gap-3 rounded-2xl border px-4 py-3 text-[11px] font-medium ${form.success ? "border-[#B9E6C9] bg-[#F1FBF4] text-[#176B35]" : "border-[#F0C8C8] bg-[#FFF5F5] text-[#9B2C2C]"}`}>
      {#if form.success}<CheckCircle2 size={17}/>{:else}<CircleAlert size={17}/>{/if}<span>{form.message}</span>
    </div>
  {/if}

  <div class="mt-7 grid gap-6 xl:grid-cols-[330px_minmax(0,1fr)]">
    <aside class="space-y-5">
      <section class="rounded-[22px] border border-[#E2E5ED] bg-white p-4">
        <div class="flex items-center gap-2"><GitBranch size={17} class="text-[#000A57]"/><h2 class="text-[13px] font-semibold text-[#202637]">Fluxo global</h2></div>
        {#if globalWorkflow}
          <button type="button" on:click={() => (selectedWorkflowId = globalWorkflow.id)} class={`mt-3 w-full rounded-xl border px-3 py-3 text-left transition ${selectedWorkflowId === globalWorkflow.id ? "border-[#000A57] bg-[#F3F4FF]" : "border-[#E4E6EC] hover:bg-[#FAFAFC]"}`}>
            <strong class="block text-[11px] font-semibold text-[#303646]">{globalWorkflow.name}</strong>
            <span class="mt-1 block text-[9px] text-[#8A909E]">{globalWorkflow.stages.length} coluna(s) · visão macro</span>
          </button>
        {:else}
          <p class="mt-3 text-[10px] text-[#8A909E]">Fluxo global não encontrado. Execute a migration 0035.</p>
        {/if}
      </section>

      <section class="rounded-[22px] border border-[#E2E5ED] bg-white p-4">
        <div class="flex items-center gap-2"><Boxes size={17} class="text-[#EA6D0B]"/><h2 class="text-[13px] font-semibold text-[#202637]">Workflows de área</h2></div>
        <div class="mt-3 space-y-2">
          {#each areaWorkflows as workflow}
            <button type="button" on:click={() => (selectedWorkflowId = workflow.id)} class={`w-full rounded-xl border px-3 py-3 text-left transition ${selectedWorkflowId === workflow.id ? "border-[#EA6D0B] bg-[#FFF8F2]" : "border-[#E4E6EC] hover:bg-[#FAFAFC]"}`}>
              <strong class="block text-[11px] font-semibold text-[#303646]">{workflow.queueName}</strong>
              <span class="mt-1 block truncate text-[9px] text-[#8A909E]">{workflow.name} · {workflow.stages.length} coluna(s)</span>
            </button>
          {:else}
            <p class="rounded-xl border border-dashed border-[#DDE1EA] px-3 py-4 text-[10px] leading-5 text-[#8A909E]">Nenhuma área possui processo próprio ainda.</p>
          {/each}
        </div>

        {#if availableQueues.length > 0}
          <form method="POST" action="?/createAreaWorkflow" class="mt-4 space-y-2 border-t border-[#EEF0F5] pt-4">
            <span class="text-[9px] font-bold uppercase tracking-[0.08em] text-[#7D8392]">Novo workflow de área</span>
            <select name="queueId" required class="h-10 w-full rounded-xl border border-[#DDE1EA] bg-white px-3 text-[10px]">
              {#each availableQueues as queue}<option value={queue.id}>{queue.name}</option>{/each}
            </select>
            <input name="name" required minlength="2" maxlength="80" placeholder="Ex.: Processo Financeiro" class="h-10 w-full rounded-xl border border-[#DDE1EA] px-3 text-[10px]"/>
            <button type="submit" class="inline-flex h-10 w-full items-center justify-center gap-2 rounded-xl bg-[#000A57] px-3 text-[10px] font-semibold text-white"><Plus size={14}/>Criar workflow</button>
          </form>
        {/if}
      </section>
    </aside>

    <main>
      {#if selectedWorkflow}
        <section class="rounded-[24px] border border-[#E2E5ED] bg-white">
          <header class="border-b border-[#EEF0F5] px-5 py-5 sm:px-6">
            <div class="flex flex-col justify-between gap-4 lg:flex-row lg:items-start">
              <div>
                <div class="flex flex-wrap items-center gap-2">
                  <span class={`rounded-full px-2.5 py-1 text-[8px] font-bold uppercase tracking-[0.07em] ${selectedWorkflow.kind === "global" ? "bg-[#EEF0FF] text-[#000A57]" : "bg-[#FFF1E4] text-[#A9510D]"}`}>{selectedWorkflow.kind === "global" ? "Global" : "Área"}</span>
                  {#if selectedWorkflow.queueName}<span class="text-[10px] font-semibold text-[#777D8C]">{selectedWorkflow.queueName}</span>{/if}
                </div>
                <h2 class="mt-2 text-[20px] font-semibold text-[#202637]">{selectedWorkflow.name}</h2>
                <p class="mt-1 text-[10px] leading-5 text-[#858B99]">{selectedWorkflow.kind === "global" ? "As colunas daqui representam o caminho macro do ticket entre áreas e estados gerais." : "Somente quem trabalha nesta área precisa acompanhar as etapas internas deste processo."}</p>
              </div>
              <form method="POST" action="?/renameWorkflow" class="flex w-full max-w-[430px] gap-2">
                <input type="hidden" name="workflowId" value={selectedWorkflow.id}/>
                <input name="name" value={selectedWorkflow.name} required minlength="2" maxlength="80" class="h-10 min-w-0 flex-1 rounded-xl border border-[#DDE1EA] px-3 text-[10px]"/>
                <button type="submit" class="inline-flex h-10 items-center gap-2 rounded-xl border border-[#CDD2DE] px-3 text-[10px] font-semibold text-[#4D5464]"><Save size={13}/>Salvar</button>
              </form>
            </div>
          </header>

          <div class="p-5 sm:p-6">
            <div class="space-y-3">
              {#each selectedWorkflow.stages as stage, index}
                <article class={`rounded-2xl border p-4 ${stage.stageType === "area_gateway" ? "border-[#F0C89F] bg-[#FFF9F3]" : stage.stageType === "terminal" ? "border-[#CDE5D4] bg-[#F7FBF8]" : "border-[#E3E6ED] bg-[#FAFAFC]"}`}>
                  <form method="POST" action="?/updateStage" class="grid gap-3 xl:grid-cols-[minmax(180px,1.2fr)_180px_180px_minmax(180px,1fr)_auto] xl:items-end">
                    <input type="hidden" name="stageId" value={stage.id}/>
                    <label><span class="mb-1 block text-[8px] font-bold uppercase tracking-[0.07em] text-[#838998]">Coluna</span><input name="name" value={stage.name} required minlength="2" maxlength="80" class="h-10 w-full rounded-xl border border-[#DDE1EA] bg-white px-3 text-[10px]"/></label>
                    <label><span class="mb-1 block text-[8px] font-bold uppercase tracking-[0.07em] text-[#838998]">Tipo</span><select name="stageType" value={stage.stageType} class="h-10 w-full rounded-xl border border-[#DDE1EA] bg-white px-2 text-[9px]"><option value="normal">Etapa normal</option>{#if selectedWorkflow.kind === "global"}<option value="area_gateway">Gateway de área</option>{/if}<option value="terminal">Etapa terminal</option></select></label>
                    <label><span class="mb-1 block text-[8px] font-bold uppercase tracking-[0.07em] text-[#838998]">Lifecycle técnico</span><select name="lifecycleStatus" value={stage.lifecycleStatus} class="h-10 w-full rounded-xl border border-[#DDE1EA] bg-white px-2 text-[9px]">{#if selectedWorkflow.kind === "area"}<option value="open">Aberto</option><option value="in_progress">Em andamento</option><option value="waiting_customer">Aguardando cliente</option>{:else}{#each Object.entries(lifecycleLabels) as [value, label]}<option value={value}>{label}</option>{/each}{/if}</select></label>
                    {#if selectedWorkflow.kind === "global"}<label><span class="mb-1 block text-[8px] font-bold uppercase tracking-[0.07em] text-[#838998]">Área vinculada</span><select name="linkedQueueId" value={stage.linkedQueueId ?? ""} class="h-10 w-full rounded-xl border border-[#DDE1EA] bg-white px-2 text-[9px]"><option value="">Manter área atual</option>{#each data.queues as queue}<option value={queue.id}>{queue.name}</option>{/each}</select></label>{:else}<input type="hidden" name="linkedQueueId" value=""/><div><span class="mb-1 block text-[8px] font-bold uppercase tracking-[0.07em] text-[#838998]">Área</span><div class="flex h-10 items-center rounded-xl border border-[#E4E6EC] bg-white px-3 text-[9px] font-semibold text-[#666D7C]">{selectedWorkflow.queueName}</div></div>{/if}
                    <button type="submit" class="inline-flex h-10 items-center justify-center gap-1.5 rounded-xl bg-[#000A57] px-3 text-[9px] font-semibold text-white"><Save size={12}/>Salvar</button>
                  </form>

                  <div class="mt-3 flex flex-wrap items-center justify-between gap-3 border-t border-black/5 pt-3">
                    <div class="flex flex-wrap items-center gap-2 text-[8px] text-[#7D8392]">
                      <span class="rounded-full bg-white px-2 py-1 font-semibold shadow-sm">{index + 1}ª</span>
                      <span class="rounded-full bg-white px-2 py-1 font-semibold shadow-sm">{stageTypeLabels[stage.stageType]}</span>
                      <span class="rounded-full bg-white px-2 py-1 font-semibold shadow-sm">Lifecycle: {lifecycleLabels[stage.lifecycleStatus]}</span>
                      {#if stage.linkedQueueName}<span class="rounded-full bg-white px-2 py-1 font-semibold shadow-sm">Área: {stage.linkedQueueName}</span>{/if}
                      {#if stage.isInitial}<span class="rounded-full bg-[#000A57] px-2 py-1 font-bold text-white">Inicial</span>{/if}
                    </div>
                    <div class="flex items-center gap-1.5">
                      <form method="POST" action="?/reorderStage"><input type="hidden" name="stageId" value={stage.id}/><input type="hidden" name="direction" value="up"/><button type="submit" disabled={index === 0} class="flex h-8 w-8 items-center justify-center rounded-lg border border-[#DDE1EA] bg-white text-[#686F7F] disabled:opacity-30" aria-label="Mover coluna para a esquerda"><ArrowUp size={13}/></button></form>
                      <form method="POST" action="?/reorderStage"><input type="hidden" name="stageId" value={stage.id}/><input type="hidden" name="direction" value="down"/><button type="submit" disabled={index === selectedWorkflow.stages.length - 1} class="flex h-8 w-8 items-center justify-center rounded-lg border border-[#DDE1EA] bg-white text-[#686F7F] disabled:opacity-30" aria-label="Mover coluna para a direita"><ArrowDown size={13}/></button></form>
                      {#if !stage.isInitial}<form method="POST" action="?/setInitial"><input type="hidden" name="stageId" value={stage.id}/><button type="submit" class="h-8 rounded-lg border border-[#DDE1EA] bg-white px-2.5 text-[8px] font-semibold text-[#555D6D]">Tornar inicial</button></form>{/if}
                      <form method="POST" action="?/archiveStage" on:submit={(event) => { if (!confirm(`Arquivar a coluna “${stage.name}”?`)) event.preventDefault(); }}><input type="hidden" name="stageId" value={stage.id}/><button type="submit" class="flex h-8 w-8 items-center justify-center rounded-lg border border-[#F0D0D0] bg-white text-[#A33A3A]" aria-label="Arquivar coluna"><Trash2 size={12}/></button></form>
                    </div>
                  </div>
                </article>
              {:else}
                <div class="rounded-2xl border border-dashed border-[#D8DCE5] px-5 py-10 text-center"><Layers3 size={28} class="mx-auto text-[#A9AEB9]"/><p class="mt-3 text-[11px] font-semibold text-[#5B6271]">Este workflow ainda não possui colunas</p><p class="mt-1 text-[9px] text-[#8D929E]">A primeira coluna criada será automaticamente marcada como inicial.</p></div>
              {/each}
            </div>

            <form method="POST" action="?/addStage" class="mt-5 rounded-2xl border border-dashed border-[#C9CED9] bg-[#F9FAFC] p-4">
              <input type="hidden" name="workflowId" value={selectedWorkflow.id}/>
              <div class="flex items-center gap-2"><Plus size={15} class="text-[#000A57]"/><strong class="text-[11px] font-semibold text-[#303746]">Adicionar coluna</strong></div>
              <div class="mt-3 grid gap-3 lg:grid-cols-4">
                <label><span class="mb-1 block text-[8px] font-semibold text-[#777D8C]">Nome</span><input name="name" required minlength="2" maxlength="80" placeholder="Ex.: Em validação" class="h-10 w-full rounded-xl border border-[#DDE1EA] bg-white px-3 text-[10px]"/></label>
                <label><span class="mb-1 block text-[8px] font-semibold text-[#777D8C]">Tipo</span><select name="stageType" class="h-10 w-full rounded-xl border border-[#DDE1EA] bg-white px-2 text-[9px]"><option value="normal">Etapa normal</option>{#if selectedWorkflow.kind === "global"}<option value="area_gateway">Gateway de área</option>{/if}<option value="terminal">Etapa terminal</option></select></label>
                <label><span class="mb-1 block text-[8px] font-semibold text-[#777D8C]">Lifecycle técnico</span><select name="lifecycleStatus" class="h-10 w-full rounded-xl border border-[#DDE1EA] bg-white px-2 text-[9px]">{#if selectedWorkflow.kind === "area"}<option value="open">Aberto</option><option value="in_progress">Em andamento</option><option value="waiting_customer">Aguardando cliente</option>{:else}<option value="open">Aberto</option><option value="new">Novo</option><option value="in_progress">Em andamento</option><option value="waiting_customer">Aguardando cliente</option><option value="resolved">Resolvido</option><option value="closed">Fechado</option>{/if}</select></label>
                {#if selectedWorkflow.kind === "global"}<label><span class="mb-1 block text-[8px] font-semibold text-[#777D8C]">Área vinculada</span><select name="linkedQueueId" class="h-10 w-full rounded-xl border border-[#DDE1EA] bg-white px-2 text-[9px]"><option value="">Manter área atual</option>{#each data.queues as queue}<option value={queue.id}>{queue.name}</option>{/each}</select></label>{:else}<input type="hidden" name="linkedQueueId" value=""/><div><span class="mb-1 block text-[8px] font-bold uppercase tracking-[0.07em] text-[#777D8C]">Área</span><div class="flex h-10 items-center rounded-xl border border-[#E4E6EC] bg-white px-3 text-[9px] font-semibold text-[#666D7C]">{selectedWorkflow.queueName}</div></div>{/if}
              </div>
              <div class="mt-3 flex justify-end"><button type="submit" class="inline-flex h-10 items-center gap-2 rounded-xl bg-[#000A57] px-4 text-[10px] font-semibold text-white"><Plus size={13}/>Adicionar coluna</button></div>
            </form>
          </div>
        </section>
      {:else}
        <section class="rounded-[24px] border border-[#E2E5ED] bg-white px-6 py-16 text-center"><GitBranch size={34} class="mx-auto text-[#B2B7C2]"/><p class="mt-4 text-[12px] font-semibold text-[#4C5362]">Nenhum workflow selecionado</p></section>
      {/if}
    </main>
  </div>
</div>
