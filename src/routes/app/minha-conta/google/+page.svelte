<script lang="ts">
  import {
    CalendarDays,
    CheckCircle2,
    CircleAlert,
    ExternalLink,
    Link2,
    RefreshCw,
    Save,
    Share2,
    Trash2,
    Unplug,
  } from "lucide-svelte";
  import ApplicationContent from "$lib/components/application/ApplicationContent.svelte";
  import type { ActionData, PageData } from "./$types";

  export let data: PageData;
  export let form: ActionData;

  const importModeLabels: Record<string, string> = {
    hidden: "Não usar",
    view_only: "Somente mostrar na Agenda",
    task: "Importar como Tarefa",
  };

  function accessLabel(role: string): string {
    if (role === "owner") return "Proprietário";
    if (role === "writer") return "Pode editar";
    if (role === "reader") return "Somente leitura";
    if (role === "freeBusyReader") return "Livre/ocupado";
    return role;
  }

  function formatSyncDate(value: string | Date): string {
    return new Intl.DateTimeFormat("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(value));
  }

  function formatDueOn(value: string | null): string {
    if (!value) return "Sem data";
    const [year, month, day] = value.split("-");
    return year && month && day ? `${day}/${month}/${year}` : value;
  }

  function conflictValueClass(localValue: string | null, googleValue: string | null): string {
    return localValue === googleValue
      ? "border-[#E4E7EE] bg-[#FAFAFC]"
      : "border-[#E9CF9C] bg-[#FFF9EE]";
  }
</script>

<svelte:head><title>Google Calendar | F10 Operations</title></svelte:head>

<ApplicationContent width="standard">
  {#if form?.message}
    <div class={`mb-4 flex items-start gap-3 rounded-2xl border px-4 py-3 text-[11px] font-medium ${form.success ? "border-[#B9E6C9] bg-[#F1FBF4] text-[#176B35]" : "border-[#F0C8C8] bg-[#FFF5F5] text-[#9B2C2C]"}`}>
      {#if form.success}<CheckCircle2 size={17} class="mt-0.5 shrink-0"/>{:else}<CircleAlert size={17} class="mt-0.5 shrink-0"/>{/if}
      <span>{form.message}</span>
    </div>
  {/if}

  {#if data.sourceError}
    <div class="mb-4 flex items-start gap-3 rounded-2xl border border-[#F0D6BD] bg-[#FFF9F3] px-4 py-3 text-[11px] font-medium text-[#935018]">
      <CircleAlert size={17} class="mt-0.5 shrink-0"/>
      <span>{data.sourceError}</span>
    </div>
  {/if}

  <section class="rounded-[22px] border border-[#E2E5ED] bg-white p-5 sm:p-6">
    <div class="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
      <div class="flex items-start gap-3">
        <span class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#F1F8F3] text-[#2F7045]"><CalendarDays size={18}/></span>
        <div>
          <h2 class="text-[14px] font-semibold text-[#202637]">Google Calendar</h2>
          <p class="mt-1 text-[10px] leading-5 text-[#858B99]">Calendários pessoais e compartilhados, sincronização do Operations e importação controlada de eventos.</p>
          {#if data.connection.connected}
            <div class="mt-2 flex flex-wrap items-center gap-2">
              <span class="inline-flex items-center gap-1.5 rounded-full bg-[#F1FBF4] px-2.5 py-1 text-[9px] font-semibold text-[#176B35]"><span class="h-1.5 w-1.5 rounded-full bg-[#2F9E5B]"></span>{data.connection.googleEmail}</span>
              {#if data.syncState.lastSyncCompletedAt}
                <span class="text-[9px] text-[#8B909D]">Última sincronização global: {formatSyncDate(data.syncState.lastSyncCompletedAt)}</span>
              {/if}
            </div>
          {/if}
        </div>
      </div>

      {#if !data.connection.connected}
        <a href="/app/tasks/calendar/google/connect" class="application-text-caption inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-[#000A57] px-4 font-semibold text-white"><Link2 size={14}/>Conectar Google</a>
      {:else}
        <div class="flex flex-wrap gap-2">
          <a href="/app/tasks/calendar/google/connect" class="application-text-caption inline-flex h-9 items-center gap-2 rounded-xl border border-[#DDE1EA] px-3 font-semibold text-[#000A57]"><RefreshCw size={13}/>{data.connection.scopesReady ? "Reconectar" : "Liberar recursos"}</a>
          <form method="POST" action="?/disconnect" on:submit={(event) => { if (!confirm("Desconectar o Google Calendar desta conta?")) event.preventDefault(); }}>
            <button type="submit" class="application-text-caption inline-flex h-9 items-center gap-2 rounded-xl border border-[#E7D1D1] bg-[#FFF8F8] px-3 font-semibold text-[#9B3C3C]"><Unplug size={13}/>Desconectar</button>
          </form>
        </div>
      {/if}
    </div>

    {#if data.connection.connected && !data.connection.scopesReady}
      <div class="mt-5 rounded-xl border border-[#F0D6BD] bg-[#FFF9F3] px-4 py-3 text-[10px] leading-5 text-[#935018]">
        Esta conexão foi autorizada antes dos recursos de calendários compartilhados. Clique em <strong>Liberar recursos</strong> para autorizar listagem de agendas e compartilhamento. Eventos da agenda principal continuam compatíveis.
      </div>
    {/if}
  </section>

  {#if data.connection.connected && data.connection.scopesReady}
    <section class="mt-5 rounded-[22px] border border-[#E2E5ED] bg-white p-5 sm:p-6">
      <div class="flex items-start justify-between gap-4">
        <div>
          <h2 class="text-[14px] font-semibold text-[#202637]">F10 → Google</h2>
          <p class="mt-1 text-[10px] leading-5 text-[#858B99]">Escolha o calendário que receberá seus itens operacionais e o que deve permanecer sincronizado.</p>
        </div>
        {#if data.syncErrors > 0}<span class="rounded-full bg-[#FFF4E9] px-2.5 py-1 text-[9px] font-semibold text-[#A9510D]">{data.syncErrors} erro(s) de sync</span>{/if}
      </div>

      <form method="POST" action="?/preferences" class="mt-5 space-y-5">
        <label class="block max-w-xl">
          <span class="mb-1.5 block text-[10px] font-semibold text-[#555B6B]">Calendário de destino</span>
          <select name="targetCalendarId" required class="h-11 w-full rounded-xl border border-[#DDE1EA] bg-white px-3 text-[11px] outline-none focus:border-[#000A57]">
            {#each data.writableSources as source}
              <option value={source.calendarId} selected={source.calendarId === data.preferences.targetCalendarId}>{source.calendarName}{source.isPrimary ? " · principal" : ""}</option>
            {/each}
          </select>
          <span class="mt-1.5 block text-[9px] leading-4 text-[#9297A4]">Pode ser sua agenda principal ou uma agenda compartilhada em que você tenha permissão de edição.</span>
        </label>

        <div class="grid gap-3 md:grid-cols-2">
          <label class="flex cursor-pointer items-start gap-3 rounded-xl border border-[#E4E7EE] bg-[#FAFAFC] p-4">
            <input type="checkbox" name="syncTasksToGoogle" value="true" checked={data.preferences.syncTasksToGoogle} class="mt-0.5"/>
            <span><strong class="application-text-caption block font-semibold text-[#303747]">Tarefas atribuídas a mim</strong><span class="application-text-meta mt-1 block leading-4 text-[#858B99]">Cria e mantém eventos de Tarefas com prazo.</span></span>
          </label>
          <label class="flex cursor-pointer items-start gap-3 rounded-xl border border-[#E4E7EE] bg-[#FAFAFC] p-4">
            <input type="checkbox" name="syncTicketsToGoogle" value="true" checked={data.preferences.syncTicketsToGoogle} class="mt-0.5"/>
            <span><strong class="application-text-caption block font-semibold text-[#303747]">Tickets atribuídos a mim</strong><span class="application-text-meta mt-1 block leading-4 text-[#858B99]">Usa a conclusão planejada. Resolvidos permanecem com ✓ no título.</span></span>
          </label>
          <label class="flex cursor-pointer items-start gap-3 rounded-xl border border-[#E4E7EE] bg-[#FAFAFC] p-4">
            <input type="checkbox" name="syncSchedulingToGoogle" value="true" checked={data.preferences.syncSchedulingToGoogle} class="mt-0.5"/>
            <span><strong class="application-text-caption block font-semibold text-[#303747]">Agendamentos de call</strong><span class="application-text-meta mt-1 block leading-4 text-[#858B99]">Mantém reuniões confirmadas também no Google.</span></span>
          </label>
          <label class="flex cursor-pointer items-start gap-3 rounded-xl border border-[#D7E4EA] bg-[#F5FAFC] p-4">
            <input type="checkbox" name="syncGoogleChangesToF10" value="true" checked={data.preferences.syncGoogleChangesToF10} class="mt-0.5"/>
            <span><strong class="application-text-caption block font-semibold text-[#27637B]">Google → F10</strong><span class="application-text-meta mt-1 block leading-4 text-[#728995]">Atualiza Tarefas vinculadas e a data planejada de Tickets. Se os dois lados mudarem, a sincronização para e pede uma escolha.</span></span>
          </label>
        </div>

        <button type="submit" disabled={data.writableSources.length === 0} class="inline-flex h-10 items-center gap-2 rounded-xl bg-[#000A57] px-4 text-[10px] font-semibold text-white disabled:cursor-not-allowed disabled:opacity-40"><Save size={14}/>Salvar sincronização</button>
      </form>
    </section>

    {#if data.syncIssues.length > 0}
      <section class="mt-5 rounded-[22px] border border-[#E9CF9C] bg-[#FFF9EE] p-5 sm:p-6">
        <div class="flex items-start gap-3">
          <CircleAlert size={18} class="mt-0.5 shrink-0 text-[#A96510]"/>
          <div>
            <h2 class="text-[14px] font-semibold text-[#74420B]">Conflitos de sincronização</h2>
            <p class="mt-1 text-[10px] leading-5 text-[#936326]">O F10 e o Google foram alterados depois da última sincronização. Compare os campos abaixo antes de escolher qual versão deve prevalecer.</p>
          </div>
        </div>

        <div class="mt-4 space-y-3">
          {#each data.syncIssues as issue}
            <article class="rounded-2xl border border-[#EAD8B7] bg-white p-4">
              <div class="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div class="min-w-0">
                  <div class="flex items-center gap-2">
                    <span class="application-text-meta rounded-full bg-[#FFF2D9] px-2 py-1 font-semibold uppercase text-[#95601B]">{issue.kind === "task" ? "Tarefa" : "Ticket"}</span>
                    <a href={issue.kind === "task" ? `/app/tasks/${issue.id}` : `/app/tickets/${issue.id}`} class="application-text-caption truncate font-semibold text-[#303747] hover:underline">{issue.title}</a>
                  </div>
                  <span class="application-text-meta mt-1 block truncate text-[#9297A4]">Calendário: {issue.calendarId}</span>
                </div>
                <div class="flex shrink-0 flex-wrap gap-2">
                  <form method="POST" action={issue.kind === "task" ? "?/resolveTaskConflictF10" : "?/resolveTicketConflictF10"}>
                    <input type="hidden" name="entityId" value={issue.id}/>
                    <button type="submit" class="h-9 rounded-xl border border-[#DDE1EA] bg-white px-3 text-[9px] font-semibold text-[#000A57]">Manter F10</button>
                  </form>
                  <form method="POST" action={issue.kind === "task" ? "?/resolveTaskConflictGoogle" : "?/resolveTicketConflictGoogle"} on:submit={(event) => { if (!confirm("Usar a versão do Google e substituir os campos sincronizados no F10?")) event.preventDefault(); }}>
                    <input type="hidden" name="entityId" value={issue.id}/>
                    <button type="submit" disabled={!issue.google} class="h-9 rounded-xl bg-[#A96510] px-3 text-[9px] font-semibold text-white disabled:cursor-not-allowed disabled:opacity-40">Usar Google</button>
                  </form>
                </div>
              </div>

              {#if issue.google}
                {#if issue.kind === "task"}
                  <div class="mt-4 grid gap-3 lg:grid-cols-2">
                    <div class="rounded-xl border border-[#DDE1EA] bg-[#FAFAFC] p-3">
                      <strong class="application-text-caption font-semibold text-[#000A57]">F10</strong>
                      <dl class="mt-3 space-y-2">
                        <div class={`rounded-lg border p-2.5 ${conflictValueClass(issue.local.title, issue.google.title)}`}>
                          <dt class="application-text-meta font-semibold uppercase text-[#8A909D]">Título</dt>
                          <dd class="application-text-caption mt-1 break-words text-[#303747]">{issue.local.title || "Sem título"}</dd>
                        </div>
                        <div class={`rounded-lg border p-2.5 ${conflictValueClass(issue.local.dueOn, issue.google.dueOn)}`}>
                          <dt class="application-text-meta font-semibold uppercase text-[#8A909D]">Data planejada</dt>
                          <dd class="application-text-caption mt-1 text-[#303747]">{formatDueOn(issue.local.dueOn)}</dd>
                        </div>
                        <div class={`rounded-lg border p-2.5 ${conflictValueClass(issue.local.description, issue.google.description)}`}>
                          <dt class="application-text-meta font-semibold uppercase text-[#8A909D]">Descrição</dt>
                          <dd class="application-text-caption mt-1 max-h-28 overflow-auto whitespace-pre-wrap break-words text-[#303747]">{issue.local.description || "Sem descrição"}</dd>
                        </div>
                      </dl>
                    </div>

                    <div class="rounded-xl border border-[#DDE1EA] bg-[#FAFAFC] p-3">
                      <strong class="application-text-caption font-semibold text-[#A96510]">Google</strong>
                      <dl class="mt-3 space-y-2">
                        <div class={`rounded-lg border p-2.5 ${conflictValueClass(issue.local.title, issue.google.title)}`}>
                          <dt class="application-text-meta font-semibold uppercase text-[#8A909D]">Título</dt>
                          <dd class="application-text-caption mt-1 break-words text-[#303747]">{issue.google.title || "Sem título"}</dd>
                        </div>
                        <div class={`rounded-lg border p-2.5 ${conflictValueClass(issue.local.dueOn, issue.google.dueOn)}`}>
                          <dt class="application-text-meta font-semibold uppercase text-[#8A909D]">Data planejada</dt>
                          <dd class="application-text-caption mt-1 text-[#303747]">{formatDueOn(issue.google.dueOn)}</dd>
                        </div>
                        <div class={`rounded-lg border p-2.5 ${conflictValueClass(issue.local.description, issue.google.description)}`}>
                          <dt class="application-text-meta font-semibold uppercase text-[#8A909D]">Descrição</dt>
                          <dd class="application-text-caption mt-1 max-h-28 overflow-auto whitespace-pre-wrap break-words text-[#303747]">{issue.google.description || "Sem descrição"}</dd>
                        </div>
                      </dl>
                    </div>
                  </div>
                {:else}
                  <div class="mt-4 grid gap-3 sm:grid-cols-2">
                    <div class={`rounded-xl border p-3 ${conflictValueClass(issue.local.dueOn, issue.google.dueOn)}`}>
                      <strong class="application-text-caption font-semibold text-[#000A57]">F10</strong>
                      <span class="application-text-meta mt-2 block uppercase text-[#8A909D]">Conclusão planejada</span>
                      <span class="application-text-caption mt-1 block text-[#303747]">{formatDueOn(issue.local.dueOn)}</span>
                    </div>
                    <div class={`rounded-xl border p-3 ${conflictValueClass(issue.local.dueOn, issue.google.dueOn)}`}>
                      <strong class="application-text-caption font-semibold text-[#A96510]">Google</strong>
                      <span class="application-text-meta mt-2 block uppercase text-[#8A909D]">Conclusão planejada</span>
                      <span class="application-text-caption mt-1 block text-[#303747]">{formatDueOn(issue.google.dueOn)}</span>
                    </div>
                  </div>
                {/if}
              {:else}
                <div class="mt-4 rounded-xl border border-[#F0D6BD] bg-[#FFF9F3] px-3 py-2.5 text-[10px] leading-5 text-[#935018]">
                  O evento vinculado não está mais disponível no Google. A versão remota não pode ser aplicada; mantenha o F10 ou revise o evento no Google Calendar.
                </div>
              {/if}
            </article>
          {/each}
        </div>
      </section>
    {/if}

    <section class="mt-5 rounded-[22px] border border-[#E2E5ED] bg-white p-5 sm:p-6">
      <div class="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 class="text-[14px] font-semibold text-[#202637]">Calendários da conta</h2>
          <p class="mt-1 text-[10px] leading-5 text-[#858B99]">Defina quais agendas aparecem no F10 e quais podem originar Tarefas.</p>
        </div>
        <form method="POST" action="?/refresh"><button type="submit" class="application-text-caption inline-flex h-9 items-center gap-2 rounded-xl border border-[#DDE1EA] px-3 font-semibold text-[#555C6D]"><RefreshCw size={13}/>Atualizar agendas</button></form>
      </div>

      <div class="mt-5 space-y-3">
        {#each data.sources as source}
          <form method="POST" action="?/source" class="rounded-2xl border border-[#E5E8EF] p-4">
            <input type="hidden" name="calendarId" value={source.calendarId}/>
            <input type="hidden" name="importAssigneeId" value=""/>
            <div class="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div class="min-w-0">
                <div class="flex flex-wrap items-center gap-2">
                  <strong class="application-text-body truncate font-semibold text-[#303747]">{source.calendarName}</strong>
                  {#if source.isPrimary}<span class="application-text-meta rounded-full bg-[#EEF0FF] px-2 py-1 font-semibold text-[#000A57]">Principal</span>{/if}
                  <span class="application-text-meta rounded-full bg-[#F4F5F8] px-2 py-1 font-semibold text-[#737987]">{accessLabel(source.accessRole)}</span>
                </div>
                <span class="application-text-meta mt-1 block truncate text-[#9A9FAC]">{source.calendarId}</span>
              </div>

              <div class="grid min-w-0 flex-1 gap-3 sm:grid-cols-2 lg:max-w-[680px] lg:grid-cols-[170px_220px_1fr_auto]">
                <label class="flex h-10 items-center gap-2 rounded-xl border border-[#E5E7ED] px-3 text-[10px] font-semibold text-[#626978]">
                  <input type="checkbox" name="visibleInF10" value="true" checked={source.visibleInF10}/>
                  Mostrar na Agenda
                </label>
                <select name="importMode" class="h-10 rounded-xl border border-[#DDE1EA] bg-white px-3 text-[10px] font-semibold text-[#555C6D]">
                  {#each Object.entries(importModeLabels) as [value, label]}
                    <option value={value} selected={source.importMode === value} disabled={value === "task" && !data.canManageTaskImport}>{label}</option>
                  {/each}
                </select>
                <select name="importProjectId" class="h-10 min-w-0 rounded-xl border border-[#DDE1EA] bg-white px-3 text-[10px] text-[#555C6D]" disabled={!data.canManageTaskImport}>
                  <option value="">Projeto para importação</option>
                  {#each data.projects as project}<option value={project.id} selected={source.importProjectId === project.id}>{project.name}</option>{/each}
                </select>
                <button type="submit" class="h-10 rounded-xl border border-[#DDE1EA] px-3 text-[10px] font-semibold text-[#000A57]">Salvar</button>
              </div>
            </div>
            {#if source.importMode === "task"}<p class="application-text-meta mt-2 text-[#8B909D]">Novos eventos deste calendário são criados como Tarefas. Sem sincronização bidirecional, o Google permanece como fonte da Tarefa importada.</p>{/if}
          </form>
        {/each}
      </div>
    </section>

    <section class="mt-5 rounded-[22px] border border-[#E2E5ED] bg-white p-5 sm:p-6">
      <div class="flex items-start gap-3">
        <span class="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#F2F0FF] text-[#5C4BA2]"><Share2 size={16}/></span>
        <div><h2 class="text-[14px] font-semibold text-[#202637]">Compartilhar uma agenda</h2><p class="mt-1 text-[10px] leading-5 text-[#858B99]">O compartilhamento é gravado no próprio Google Calendar e aparece também fora do F10.</p></div>
      </div>

      <form method="POST" action="?/share" class="mt-5 grid gap-3 md:grid-cols-[1fr_1fr_160px_auto]">
        <select name="calendarId" required class="h-10 rounded-xl border border-[#DDE1EA] bg-white px-3 text-[10px]">
          <option value="">Calendário...</option>
          {#each data.sources.filter((source) => source.accessRole === "owner") as source}<option value={source.calendarId}>{source.calendarName}</option>{/each}
        </select>
        <input name="email" type="email" required maxlength="254" placeholder="pessoa@empresa.com" class="h-10 rounded-xl border border-[#DDE1EA] px-3 text-[10px]"/>
        <select name="role" class="h-10 rounded-xl border border-[#DDE1EA] bg-white px-3 text-[10px]"><option value="reader">Pode ver</option><option value="writer">Pode editar</option></select>
        <button type="submit" class="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-[#000A57] px-4 text-[10px] font-semibold text-white"><Share2 size={13}/>Compartilhar</button>
      </form>

      {#if data.shares.length > 0}
        <div class="mt-5 border-t border-[#EEF0F5] pt-4">
          <strong class="application-text-caption block font-semibold text-[#454C5C]">Compartilhamentos do calendário destino</strong>
          <div class="mt-3 divide-y divide-[#EEF0F5] rounded-xl border border-[#E6E8EE]">
            {#each data.shares as share}
              <div class="flex items-center justify-between gap-3 px-3 py-2.5">
                <div class="min-w-0"><span class="application-text-caption block truncate font-semibold text-[#555C6D]">{share.scopeValue}</span><span class="application-text-meta text-[#9297A4]">{share.role === "writer" ? "Pode editar" : share.role === "owner" ? "Proprietário" : "Pode ver"}</span></div>
                <form method="POST" action="?/revokeShare" on:submit={(event) => { if (!confirm("Remover este compartilhamento no Google Calendar?")) event.preventDefault(); }}>
                  <input type="hidden" name="calendarId" value={data.preferences.targetCalendarId}/><input type="hidden" name="aclEntryId" value={share.id}/>
                  <button type="submit" class="inline-flex h-8 items-center gap-1.5 rounded-lg px-2.5 text-[9px] font-semibold text-[#A52A2A] hover:bg-[#FFF2F2]"><Trash2 size={12}/>Remover</button>
                </form>
              </div>
            {/each}
          </div>
        </div>
      {/if}
    </section>

    <div class="mt-4 flex justify-end"><a href="/app/tasks/calendar" class="application-text-caption inline-flex items-center gap-1.5 font-semibold text-[#000A57] hover:underline">Abrir Agenda <ExternalLink size={12}/></a></div>
  {/if}
</ApplicationContent>