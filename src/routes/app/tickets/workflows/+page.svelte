<script lang="ts">
  import {
    ArrowDown,
    ArrowUp,
    Boxes,
    CheckCircle2,
    CircleAlert,
    GitBranch,
    Palette,
    Plus,
    Save,
    Trash2,
    Users,
  } from "lucide-svelte";
  import ApplicationBackLink from "$lib/components/application/ApplicationBackLink.svelte";
  import ApplicationContent from "$lib/components/application/ApplicationContent.svelte";
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

  const colorLabels: Record<string, string> = {
    gray: "Cinza",
    blue: "Azul",
    green: "Verde",
    yellow: "Amarela",
    orange: "Laranja",
    red: "Vermelha",
    purple: "Roxa",
    sky: "Azul claro",
    lime: "Lima",
    pink: "Rosa",
  };

  const colorClasses: Record<string, string> = {
    gray: "border-[#E3E6ED] bg-[#FAFAFC]",
    blue: "border-[#C9D4F6] bg-[#F3F6FF]",
    green: "border-[#C8E3D0] bg-[#F3FAF5]",
    yellow: "border-[#E8DDA9] bg-[#FFFBEB]",
    orange: "border-[#F0C89F] bg-[#FFF8F1]",
    red: "border-[#EBC4C4] bg-[#FFF5F5]",
    purple: "border-[#D9C9EC] bg-[#F9F5FF]",
    sky: "border-[#C8E1EB] bg-[#F2FAFD]",
    lime: "border-[#D8E6B7] bg-[#F8FCEB]",
    pink: "border-[#E8C9D8] bg-[#FFF5FA]",
  };

  let selectedWorkflowId = data.workflows.find((workflow) => workflow.kind === "global")?.id
    ?? data.workflows[0]?.id
    ?? "";

  $: selectedWorkflow = data.workflows.find((workflow) => workflow.id === selectedWorkflowId) ?? null;
  $: globalWorkflow = data.workflows.find((workflow) => workflow.kind === "global") ?? null;
  $: areaWorkflows = data.workflows.filter((workflow) => workflow.kind === "area");
  $: selectedArea = selectedWorkflow?.areaId
    ? data.areas.find((area) => area.id === selectedWorkflow?.areaId) ?? null
    : null;

  function stageClass(stage: { stageType: string; color?: string }): string {
    if (selectedWorkflow?.kind === "area") {
      return colorClasses[stage.color ?? "gray"] ?? colorClasses.gray;
    }
    if (stage.stageType === "area_gateway") return "border-[#F0C89F] bg-[#FFF9F3]";
    if (stage.stageType === "terminal") return "border-[#CDE5D4] bg-[#F7FBF8]";
    return "border-[#E3E6ED] bg-[#FAFAFC]";
  }
</script>

<svelte:head><title>Workflows de tickets | F10 Operations</title></svelte:head>

<ApplicationContent width="full">
  <ApplicationBackLink href="/app/tickets" label="Tickets" className="mb-3" />

  {#if form?.message}
    <div class={`mb-3 flex items-start gap-3 rounded-2xl border px-4 py-3 text-[11px] font-medium ${form.success ? "border-[#B9E6C9] bg-[#F1FBF4] text-[#176B35]" : "border-[#F0C8C8] bg-[#FFF5F5] text-[#9B2C2C]"}`}>
      {#if form.success}<CheckCircle2 size={17}/>{:else}<CircleAlert size={17}/>{/if}<span>{form.message}</span>
    </div>
  {/if}

  <div class="grid gap-5 xl:grid-cols-[320px_minmax(0,1fr)]">
    <aside class="space-y-5">
      <section class="rounded-[22px] border border-[#E2E5ED] bg-white p-4">
        <div class="flex items-center gap-2"><GitBranch size={17} class="text-[#000A57]"/><h2 class="text-[13px] font-semibold text-[#202637]">Fluxo global</h2></div>
        {#if globalWorkflow}
          <button type="button" on:click={() => (selectedWorkflowId = globalWorkflow.id)} class={`mt-3 w-full rounded-xl border px-3 py-3 text-left ${selectedWorkflowId === globalWorkflow.id ? "border-[#000A57] bg-[#F3F4FF]" : "border-[#E4E6EC] hover:bg-[#FAFAFC]"}`}>
            <strong class="block text-[11px] text-[#303646]">{globalWorkflow.name}</strong>
            <span class="application-text-meta mt-1 block text-[#8A909E]">{globalWorkflow.stages.length} coluna(s) · visão geral</span>
          </button>
        {/if}
      </section>

      <section class="rounded-[22px] border border-[#E2E5ED] bg-white p-4">
        <div class="flex items-center gap-2"><Boxes size={17} class="text-[#EA6D0B]"/><h2 class="text-[13px] font-semibold text-[#202637]">Áreas</h2></div>
        <div class="mt-3 space-y-2">
          {#each areaWorkflows as workflow}
            <button type="button" on:click={() => (selectedWorkflowId = workflow.id)} class={`w-full rounded-xl border px-3 py-3 text-left ${selectedWorkflowId === workflow.id ? "border-[#EA6D0B] bg-[#FFF8F2]" : "border-[#E4E6EC] hover:bg-[#FAFAFC]"}`}>
              <strong class="block text-[11px] text-[#303646]">{workflow.areaName}</strong>
              <span class="application-text-meta mt-1 block text-[#8A909E]">{workflow.stages.length} coluna(s){workflow.areaTeamName ? ` · ${workflow.areaTeamName}` : " · sem equipe restrita"}</span>
            </button>
          {/each}
        </div>

        <form method="POST" action="?/createArea" class="mt-4 space-y-2 border-t border-[#EEF0F5] pt-4">
          <span class="application-text-meta font-bold uppercase tracking-[0.08em] text-[#7D8392]">Criar nova área</span>
          <input name="name" required minlength="2" maxlength="80" placeholder="Ex.: Financeiro" class="application-text-caption h-10 w-full rounded-xl border border-[#DDE1EA] px-3"/>
          <select name="teamId" class="application-text-caption h-10 w-full rounded-xl border border-[#DDE1EA] bg-white px-3">
            <option value="">Sem equipe restrita</option>
            {#each data.teams as team}<option value={team.id}>{team.name}</option>{/each}
          </select>
          <button type="submit" class="application-text-caption inline-flex h-10 w-full items-center justify-center gap-2 rounded-xl bg-[#000A57] px-3 font-semibold text-white"><Plus size={14}/>Criar área</button>
        </form>
      </section>
    </aside>

    <main>
      {#if selectedWorkflow}
        <section class="rounded-[22px] border border-[#E2E5ED] bg-white">
          <header class="border-b border-[#EEF0F5] px-5 py-5 sm:px-6">
            <span class={`application-text-meta rounded-full px-2.5 py-1 font-bold uppercase tracking-[0.07em] ${selectedWorkflow.kind === "global" ? "bg-[#EEF0FF] text-[#000A57]" : "bg-[#FFF1E4] text-[#A9510D]"}`}>{selectedWorkflow.kind === "global" ? "Global" : "Área"}</span>
            <h2 class="mt-2 text-[20px] font-semibold text-[#202637]">{selectedWorkflow.kind === "global" ? selectedWorkflow.name : selectedWorkflow.areaName}</h2>
            <p class="application-text-caption mt-1 leading-5 text-[#858B99]">{selectedWorkflow.kind === "global" ? "Adicione etapas comuns ou use Área para colocar um processo interno diretamente no Kanban global." : "O ticket só pode sair desta área depois de atingir uma coluna terminal. As cores abaixo aparecem no Kanban interno."}</p>

            {#if selectedWorkflow.kind === "global"}
              <form method="POST" action="?/renameWorkflow" class="mt-4 flex max-w-[520px] gap-2">
                <input type="hidden" name="workflowId" value={selectedWorkflow.id}/>
                <input name="name" value={selectedWorkflow.name} required minlength="2" maxlength="80" class="application-text-caption h-10 min-w-0 flex-1 rounded-xl border border-[#DDE1EA] px-3"/>
                <button type="submit" class="application-text-caption inline-flex h-10 items-center gap-2 rounded-xl border border-[#CDD2DE] px-3 font-semibold text-[#4D5464]"><Save size={13}/>Salvar nome</button>
              </form>
            {:else if selectedArea}
              <form method="POST" action="?/updateArea" class="mt-4 grid max-w-[720px] gap-2 sm:grid-cols-[1fr_1fr_auto]">
                <input type="hidden" name="areaId" value={selectedArea.id}/>
                <input name="name" value={selectedArea.name} required minlength="2" maxlength="80" class="application-text-caption h-10 rounded-xl border border-[#DDE1EA] px-3"/>
                <select name="teamId" value={selectedArea.teamId ?? ""} class="application-text-caption h-10 rounded-xl border border-[#DDE1EA] bg-white px-3">
                  <option value="">Sem equipe restrita</option>
                  {#each data.teams as team}<option value={team.id}>{team.name}</option>{/each}
                </select>
                <button type="submit" class="application-text-caption inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-[#CDD2DE] px-3 font-semibold text-[#4D5464]"><Users size={13}/>Salvar área</button>
              </form>
            {/if}
          </header>

          <div class="p-5 sm:p-6">
            <div class="space-y-3">
              {#each selectedWorkflow.stages as stage, index}
                <article class={`rounded-2xl border p-4 ${stageClass(stage)}`}>
                  <form method="POST" action="?/updateStage" class={`grid gap-3 xl:items-end ${selectedWorkflow.kind === "area" ? "xl:grid-cols-[minmax(170px,1.2fr)_150px_170px_160px_auto]" : "xl:grid-cols-[minmax(170px,1.2fr)_170px_170px_minmax(170px,1fr)_auto]"}`}>
                    <input type="hidden" name="stageId" value={stage.id}/>
                    <label><span class="application-text-meta mb-1 block font-bold uppercase tracking-[0.07em] text-[#838998]">Coluna</span><input name="name" value={stage.name} required minlength="2" maxlength="80" class="application-text-caption h-10 w-full rounded-xl border border-[#DDE1EA] bg-white px-3"/></label>
                    <label><span class="application-text-meta mb-1 block font-bold uppercase tracking-[0.07em] text-[#838998]">Tipo</span><select name="stageType" value={stage.stageType} class="application-text-meta h-10 w-full rounded-xl border border-[#DDE1EA] bg-white px-2"><option value="normal">Etapa</option>{#if selectedWorkflow.kind === "global"}<option value="area_gateway">Área</option>{/if}<option value="terminal">Terminal</option></select></label>
                    <label><span class="application-text-meta mb-1 block font-bold uppercase tracking-[0.07em] text-[#838998]">Lifecycle técnico</span><select name="lifecycleStatus" value={stage.lifecycleStatus} class="application-text-meta h-10 w-full rounded-xl border border-[#DDE1EA] bg-white px-2">{#if selectedWorkflow.kind === "area"}<option value="open">Aberto</option><option value="in_progress">Em andamento</option><option value="waiting_customer">Aguardando cliente</option>{:else}{#each Object.entries(lifecycleLabels) as [value, label]}<option value={value}>{label}</option>{/each}{/if}</select></label>

                    {#if selectedWorkflow.kind === "global"}
                      <input type="hidden" name="color" value=""/>
                      <label><span class="application-text-meta mb-1 block font-bold uppercase tracking-[0.07em] text-[#838998]">Workflow de área</span><select name="linkedAreaId" value={stage.linkedAreaId ?? ""} class="application-text-meta h-10 w-full rounded-xl border border-[#DDE1EA] bg-white px-2"><option value="">Nenhuma</option>{#each data.areas as area}<option value={area.id}>{area.name}</option>{/each}</select></label>
                    {:else}
                      <input type="hidden" name="linkedAreaId" value=""/>
                      <label><span class="application-text-meta mb-1 flex items-center gap-1 font-bold uppercase tracking-[0.07em] text-[#838998]"><Palette size={10}/>Cor</span><select name="color" value={stage.color ?? "gray"} class="application-text-meta h-10 w-full rounded-xl border border-[#DDE1EA] bg-white px-2">{#each Object.entries(colorLabels) as [value, label]}<option value={value}>{label}</option>{/each}</select></label>
                    {/if}
                    <button type="submit" class="application-text-meta inline-flex h-10 items-center justify-center gap-1.5 rounded-xl bg-[#000A57] px-3 font-semibold text-white"><Save size={12}/>Salvar</button>
                  </form>

                  <div class="mt-3 flex flex-wrap items-center justify-between gap-3 border-t border-black/5 pt-3">
                    <div class="application-text-meta flex flex-wrap gap-2 text-[#7D8392]">
                      <span class="rounded-full bg-white px-2 py-1 shadow-sm">{index + 1}ª</span>
                      {#if stage.stageType === "area_gateway"}<span class="rounded-full bg-[#FFE8D0] px-2 py-1 font-bold text-[#9C5618]">Área · {stage.linkedAreaName}</span>{/if}
                      {#if selectedWorkflow.kind === "area"}<span class="rounded-full bg-white px-2 py-1 font-semibold shadow-sm">Cor · {colorLabels[stage.color ?? "gray"]}</span>{/if}
                      {#if stage.stageType === "terminal"}<span class="rounded-full bg-[#E2F3E7] px-2 py-1 font-bold text-[#2C7041]">Conclui a área</span>{/if}
                      {#if stage.isInitial}<span class="rounded-full bg-[#000A57] px-2 py-1 font-bold text-white">Inicial</span>{/if}
                    </div>
                    <div class="flex items-center gap-1.5">
                      <form method="POST" action="?/reorderStage"><input type="hidden" name="stageId" value={stage.id}/><input type="hidden" name="direction" value="up"/><button type="submit" disabled={index === 0} class="flex h-8 w-8 items-center justify-center rounded-lg border border-[#DDE1EA] bg-white disabled:opacity-30"><ArrowUp size={13}/></button></form>
                      <form method="POST" action="?/reorderStage"><input type="hidden" name="stageId" value={stage.id}/><input type="hidden" name="direction" value="down"/><button type="submit" disabled={index === selectedWorkflow.stages.length - 1} class="flex h-8 w-8 items-center justify-center rounded-lg border border-[#DDE1EA] bg-white disabled:opacity-30"><ArrowDown size={13}/></button></form>
                      {#if !stage.isInitial}<form method="POST" action="?/setInitial"><input type="hidden" name="stageId" value={stage.id}/><button type="submit" class="application-text-meta h-8 rounded-lg border border-[#DDE1EA] bg-white px-2.5 font-semibold">Tornar inicial</button></form>{/if}
                      <form method="POST" action="?/archiveStage" on:submit={(event) => { if (!confirm(`Arquivar “${stage.name}”?`)) event.preventDefault(); }}><input type="hidden" name="stageId" value={stage.id}/><button type="submit" class="flex h-8 w-8 items-center justify-center rounded-lg border border-[#F0D0D0] bg-white text-[#A33A3A]"><Trash2 size={12}/></button></form>
                    </div>
                  </div>
                </article>
              {/each}
            </div>

            <form method="POST" action="?/addStage" class="mt-5 rounded-2xl border border-dashed border-[#C9CED9] bg-[#F9FAFC] p-4">
              <input type="hidden" name="workflowId" value={selectedWorkflow.id}/>
              <div class="flex items-center gap-2"><Plus size={15} class="text-[#000A57]"/><strong class="text-[11px] text-[#303746]">Adicionar coluna</strong></div>
              <div class={`mt-3 grid gap-3 ${selectedWorkflow.kind === "area" ? "lg:grid-cols-4" : "lg:grid-cols-4"}`}>
                <input name="name" required minlength="2" maxlength="80" placeholder="Nome da coluna" class="application-text-caption h-10 rounded-xl border border-[#DDE1EA] bg-white px-3"/>
                <select name="stageType" class="application-text-meta h-10 rounded-xl border border-[#DDE1EA] bg-white px-2"><option value="normal">Etapa</option>{#if selectedWorkflow.kind === "global"}<option value="area_gateway">Área</option>{/if}<option value="terminal">Terminal</option></select>
                <select name="lifecycleStatus" class="application-text-meta h-10 rounded-xl border border-[#DDE1EA] bg-white px-2">{#if selectedWorkflow.kind === "area"}<option value="open">Aberto</option><option value="in_progress">Em andamento</option><option value="waiting_customer">Aguardando cliente</option>{:else}<option value="open">Aberto</option><option value="new">Novo</option><option value="in_progress">Em andamento</option><option value="waiting_customer">Aguardando cliente</option><option value="resolved">Resolvido</option><option value="closed">Fechado</option>{/if}</select>
                {#if selectedWorkflow.kind === "global"}
                  <input type="hidden" name="color" value=""/>
                  <select name="linkedAreaId" class="application-text-meta h-10 rounded-xl border border-[#DDE1EA] bg-white px-2"><option value="">Área (se o tipo for Área)</option>{#each data.areas as area}<option value={area.id}>{area.name}</option>{/each}</select>
                {:else}
                  <input type="hidden" name="linkedAreaId" value=""/>
                  <select name="color" class="application-text-meta h-10 rounded-xl border border-[#DDE1EA] bg-white px-2">{#each Object.entries(colorLabels) as [value, label]}<option value={value}>{label}</option>{/each}</select>
                {/if}
              </div>
              <div class="mt-3 flex justify-end"><button type="submit" class="application-text-caption inline-flex h-10 items-center gap-2 rounded-xl bg-[#000A57] px-4 font-semibold text-white"><Plus size={13}/>Adicionar coluna</button></div>
            </form>

            {#if selectedArea}
              <form method="POST" action="?/archiveArea" class="mt-6 border-t border-[#EEF0F5] pt-5" on:submit={(event) => { if (!confirm(`Arquivar a área “${selectedArea.name}”?`)) event.preventDefault(); }}>
                <input type="hidden" name="areaId" value={selectedArea.id}/>
                <button type="submit" class="application-text-meta inline-flex h-9 items-center gap-2 rounded-xl border border-[#F0D0D0] px-3 font-semibold text-[#A33A3A]"><Trash2 size={12}/>Arquivar área</button>
              </form>
            {/if}
          </div>
        </section>
      {/if}
    </main>
  </div>
</ApplicationContent>