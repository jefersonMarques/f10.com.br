<script lang="ts">
  import {
    Archive,
    ArrowLeft,
    BarChart3,
    CheckCircle2,
    CircleAlert,
    Clock3,
    ExternalLink,
    GraduationCap,
    Image as ImageIcon,
    Mail,
    Plus,
    Save,
    Send,
    Trash2,
    Users,
    Video,
  } from "lucide-svelte";
  import type { ActionData, PageData } from "./$types";

  export let data: PageData;
  export let form: ActionData;

  function statusLabel(status: string): string {
    if (status === "published") return "Publicada";
    if (status === "archived") return "Arquivada";
    return "Rascunho";
  }

  function participantStatus(status: string): string {
    if (status === "completed") return "Concluído";
    if (status === "in_progress") return "Em andamento";
    if (status === "opened") return "Abriu convite";
    return "Convidado";
  }

  function formatDate(value: string | Date | null): string {
    if (!value) return "—";
    return new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" }).format(new Date(value));
  }
</script>

<svelte:head><title>{data.path.title} | Trilhas F10</title></svelte:head>

<div class="mx-auto max-w-[1480px] px-5 py-7 sm:px-8 sm:py-9">
  <a href="/app/help/trilhas" class="inline-flex min-h-10 items-center gap-2 rounded-xl px-2 text-[12px] font-semibold text-[#5F6575] transition hover:bg-white hover:text-[#000A57]"><ArrowLeft size={17}/>Voltar para Trilhas</a>

  <div class="mt-5 flex flex-col justify-between gap-5 lg:flex-row lg:items-end">
    <div class="min-w-0">
      <div class="flex flex-wrap items-center gap-2">
        <span class={`rounded-full px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.08em] ${data.path.status === "published" ? "bg-[#EEF8F1] text-[#2F7045]" : data.path.status === "archived" ? "bg-[#F1F1F3] text-[#676D7D]" : "bg-[#EEF0FF] text-[#000A57]"}`}>{statusLabel(data.path.status)}</span>
        {#if data.path.currentVersion > 0}<span class="rounded-full bg-[#F3F4F7] px-3 py-1.5 text-[10px] font-semibold text-[#737989]">versão {data.path.currentVersion}</span>{/if}
        <span class="rounded-full bg-[#FFF4E9] px-3 py-1.5 text-[10px] font-semibold text-[#B85408]">{data.path.steps.length} microações · somente interno</span>
      </div>
      <h1 class="mt-3 text-[30px] font-semibold tracking-[-0.035em] text-[#010D28] sm:text-[38px]">{data.path.title}</h1>
      <p class="mt-2 text-[12px] text-[#838897]">/{data.path.slug} · {data.path.audience || "público não informado"}</p>
    </div>
    <div class="flex flex-wrap gap-2">
      {#if data.canPublish && data.path.status !== "published"}
        <form method="POST" action="?/publish"><button type="submit" class="inline-flex min-h-11 items-center gap-2 rounded-xl bg-[#EA6D0B] px-5 text-[11px] font-semibold text-white"><GraduationCap size={16}/>Publicar nova versão</button></form>
      {/if}
      {#if data.canPublish && data.path.currentVersion > 0 && data.path.status !== "archived"}
        <form method="POST" action="?/archive" on:submit={(event) => { if (!confirm("Arquivar esta trilha? Novos convites serão bloqueados, mas participantes já iniciados continuam na versão recebida.")) event.preventDefault(); }}><button type="submit" class="inline-flex min-h-11 items-center gap-2 rounded-xl border border-[#DDE1EA] bg-white px-4 text-[11px] font-semibold text-[#626979]"><Archive size={15}/>Arquivar</button></form>
      {/if}
    </div>
  </div>

  {#if form?.message}
    <div class={`mt-6 flex items-start gap-3 rounded-2xl border px-4 py-3 text-[12px] font-medium ${form.success ? "border-[#B9E6C9] bg-[#F1FBF4] text-[#176B35]" : "border-[#F0C8C8] bg-[#FFF5F5] text-[#9B2C2C]"}`}>
      {#if form.success}<CheckCircle2 size={18}/>{:else}<CircleAlert size={18}/>{/if}<span>{form.message}</span>
    </div>
  {/if}

  <section class="mt-7 grid gap-3 md:grid-cols-4">
    <div class="rounded-2xl border border-[#E2E5ED] bg-white p-5"><Mail size={18} class="text-[#000A57]"/><strong class="mt-3 block text-[24px] font-semibold">{data.insights.invited}</strong><span class="text-[10px] text-[#858A98]">convidados</span></div>
    <div class="rounded-2xl border border-[#E2E5ED] bg-white p-5"><Users size={18} class="text-[#000A57]"/><strong class="mt-3 block text-[24px] font-semibold">{data.insights.started}</strong><span class="text-[10px] text-[#858A98]">iniciaram</span></div>
    <div class="rounded-2xl border border-[#E2E5ED] bg-white p-5"><CheckCircle2 size={18} class="text-[#2F7045]"/><strong class="mt-3 block text-[24px] font-semibold">{data.insights.completed}</strong><span class="text-[10px] text-[#858A98]">concluíram</span></div>
    <div class="rounded-2xl border border-[#E2E5ED] bg-white p-5"><CircleAlert size={18} class="text-[#EA6D0B]"/><strong class="mt-3 block text-[24px] font-semibold">{data.insights.humanHelp}</strong><span class="text-[10px] text-[#858A98]">precisaram de ajuda humana</span></div>
  </section>

  <div class="mt-7 grid gap-6 xl:grid-cols-[minmax(0,1fr)_420px]">
    <div class="space-y-6">
      <form method="POST" action="?/updatePath" class="rounded-[24px] border border-[#E2E5ED] bg-white p-5 sm:p-6">
        <fieldset disabled={!data.canEdit} class="disabled:opacity-70">
          <div class="flex items-start justify-between gap-3"><div><h2 class="text-[16px] font-semibold text-[#11182C]">Configuração da trilha</h2><p class="mt-1 text-[11px] text-[#858A98]">Essas informações administram a trilha. Não revele quantidade total ou duração ao participante.</p></div><Save size={17} class="text-[#000A57]"/></div>
          <div class="mt-5 grid gap-4 lg:grid-cols-2">
            <label class="block lg:col-span-2"><span class="mb-1.5 block text-[10px] font-semibold text-[#555B6A]">Nome</span><input name="title" required maxlength="160" value={data.path.title} class="h-11 w-full rounded-xl border border-[#DDE1EA] px-3 text-[12px]"/></label>
            <label class="block"><span class="mb-1.5 block text-[10px] font-semibold text-[#555B6A]">Endereço</span><input name="slug" maxlength="100" value={data.path.slug} class="h-11 w-full rounded-xl border border-[#DDE1EA] px-3 text-[12px]"/></label>
            <label class="block"><span class="mb-1.5 block text-[10px] font-semibold text-[#555B6A]">Público</span><input name="audience" maxlength="160" value={data.path.audience} class="h-11 w-full rounded-xl border border-[#DDE1EA] px-3 text-[12px]"/></label>
            <label class="block lg:col-span-2"><span class="mb-1.5 block text-[10px] font-semibold text-[#555B6A]">Descrição interna</span><textarea name="description" rows="3" maxlength="1200" class="w-full rounded-xl border border-[#DDE1EA] px-3 py-2.5 text-[11px]">{data.path.description}</textarea></label>
            <label class="block lg:col-span-2"><span class="mb-1.5 block text-[10px] font-semibold text-[#555B6A]">Mensagem de entrada</span><textarea name="welcomeMessage" rows="3" maxlength="1200" class="w-full rounded-xl border border-[#DDE1EA] px-3 py-2.5 text-[11px]">{data.path.welcomeMessage}</textarea><span class="mt-1 block text-[9px] text-[#8B909D]">Evite “12 etapas”, “40 minutos” ou qualquer indicação de volume total.</span></label>
            <label class="block lg:col-span-2"><span class="mb-1.5 block text-[10px] font-semibold text-[#555B6A]">Fila quando precisar de ajuda humana</span><select name="supportQueueId" value={data.path.supportQueueId ?? ""} class="h-11 w-full rounded-xl border border-[#DDE1EA] bg-white px-3 text-[11px]"><option value="">Fila padrão de suporte</option>{#each data.queues as queue}<option value={queue.id}>{queue.name} ({queue.code})</option>{/each}</select></label>
          </div>
          {#if data.canEdit}<div class="mt-5 flex justify-end"><button type="submit" class="inline-flex min-h-10 items-center gap-2 rounded-xl bg-[#000A57] px-4 text-[10px] font-semibold text-white"><Save size={14}/>Salvar configuração</button></div>{/if}
        </fieldset>
      </form>

      <section class="rounded-[24px] border border-[#E2E5ED] bg-white p-5 sm:p-6">
        <div class="flex flex-col justify-between gap-3 sm:flex-row sm:items-center"><div><h2 class="text-[16px] font-semibold text-[#11182C]">Microações</h2><p class="mt-1 text-[11px] text-[#858A98]">Uma ação observável por vez. Vídeos idealmente entre 20 e 45 segundos; acima de 60 segundos, considere quebrar a ação.</p></div>{#if data.canEdit}<form method="POST" action="?/addStep"><button type="submit" class="inline-flex min-h-10 items-center gap-2 rounded-xl bg-[#000A57] px-4 text-[10px] font-semibold text-white"><Plus size={14}/>Adicionar microação</button></form>{/if}</div>

        <div class="mt-5 space-y-4">
          {#each data.path.steps as step, stepIndex}
            <details class="overflow-hidden rounded-2xl border border-[#E3E6ED] bg-[#FAFAFC]" open={stepIndex === 0}>
              <summary class="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-4 sm:px-5"><div class="flex min-w-0 items-center gap-3"><span class="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#000A57] text-[11px] font-bold text-white">{stepIndex + 1}</span><div class="min-w-0"><strong class="block truncate text-[12px] font-semibold text-[#2B3141]">{step.title}</strong><span class="mt-1 block text-[9px] text-[#8B909D]">Estimativa interna: {step.estimatedSeconds}s · não aparece para o participante</span></div></div></summary>
              <div class="border-t border-[#E7E9EF] bg-white p-4 sm:p-5">
                <form method="POST" action="?/updateStep" class="space-y-4">
                  <input type="hidden" name="stepId" value={step.id}/>
                  <fieldset disabled={!data.canEdit} class="space-y-4 disabled:opacity-70">
                    <label class="block"><span class="mb-1 block text-[9px] font-semibold text-[#616777]">Ação curta</span><input name="title" required maxlength="180" value={step.title} class="h-10 w-full rounded-xl border border-[#DDE1EA] px-3 text-[11px]"/></label>
                    <label class="block"><span class="mb-1 block text-[9px] font-semibold text-[#616777]">O que fazer agora</span><textarea name="instruction" required rows="4" maxlength="6000" class="w-full rounded-xl border border-[#DDE1EA] px-3 py-2.5 text-[11px] leading-5">{step.instruction}</textarea></label>
                    <label class="block"><span class="mb-1 block text-[9px] font-semibold text-[#616777]">O que deve aparecer quando terminar</span><textarea name="expectedResult" required rows="2" maxlength="3000" class="w-full rounded-xl border border-[#DDE1EA] px-3 py-2.5 text-[11px]">{step.expectedResult}</textarea></label>
                    <div class="grid gap-3 lg:grid-cols-[1fr_160px]"><label class="block"><span class="mb-1 block text-[9px] font-semibold text-[#616777]">Mensagem de microvitória</span><input name="successMessage" maxlength="500" value={step.successMessage} class="h-10 w-full rounded-xl border border-[#DDE1EA] px-3 text-[11px]"/></label><label class="block"><span class="mb-1 block text-[9px] font-semibold text-[#616777]">Segundos estimados</span><input name="estimatedSeconds" type="number" min="5" max="900" value={step.estimatedSeconds} class="h-10 w-full rounded-xl border border-[#DDE1EA] px-3 text-[11px]"/></label></div>
                    {#if data.canEdit}<div class="flex justify-end"><button type="submit" class="inline-flex min-h-9 items-center gap-2 rounded-xl border border-[#DDE1EA] bg-white px-3 text-[10px] font-semibold text-[#000A57]"><Save size={13}/>Salvar microação</button></div>{/if}
                  </fieldset>
                </form>

                <div class="mt-5 border-t border-[#EEF0F5] pt-5">
                  <h3 class="text-[11px] font-semibold text-[#303645]">Demonstração visual</h3>
                  {#if step.media.length > 0}
                    <div class="mt-3 grid gap-3 sm:grid-cols-2">
                      {#each step.media as media}
                        <div class="rounded-xl border border-[#E2E5ED] bg-[#FAFAFC] p-3">
                          {#if media.mediaType === "image" && media.assetId}
                            <img src={`/api/app/help/assets/${media.assetId}`} alt={media.altText || media.assetName || "Imagem da microação"} class="max-h-48 w-full rounded-lg bg-white object-contain"/>
                            <p class="mt-2 truncate text-[9px] font-semibold text-[#606777]">{media.assetName || "Imagem da Biblioteca"}</p>
                          {:else if media.mediaType === "video"}
                            <div class="flex min-h-28 items-center justify-center rounded-lg bg-[#EEF0FF] text-[#000A57]"><Video size={26}/></div><a href={media.sourceUrl ?? "#"} target="_blank" rel="noopener noreferrer" class="mt-2 inline-flex items-center gap-1 text-[9px] font-semibold text-[#000A57]">Abrir demonstração<ExternalLink size={11}/></a>
                          {/if}
                          {#if data.canEdit}<form method="POST" action="?/deleteMedia" class="mt-2"><input type="hidden" name="stepId" value={step.id}/><input type="hidden" name="mediaId" value={media.id}/><button type="submit" class="inline-flex items-center gap-1 text-[9px] font-semibold text-[#9B2C2C]"><Trash2 size={11}/>Remover</button></form>{/if}
                        </div>
                      {/each}
                    </div>
                  {/if}
                  {#if data.canEdit}
                    <div class="mt-3 grid gap-3 lg:grid-cols-2">
                      <form method="POST" action="?/addImage" class="rounded-xl border border-[#DDE1EA] p-3"><input type="hidden" name="stepId" value={step.id}/><span class="flex items-center gap-2 text-[9px] font-semibold text-[#000A57]"><ImageIcon size={13}/>Adicionar print da Biblioteca</span><select name="assetId" required class="mt-2 h-9 w-full rounded-lg border border-[#DDE1EA] bg-white px-2 text-[9px]"><option value="">Selecione uma imagem</option>{#each data.imageAssets as asset}<option value={asset.id}>{asset.originalName || asset.id}</option>{/each}</select><input name="altText" maxlength="500" placeholder="Descrição opcional" class="mt-2 h-9 w-full rounded-lg border border-[#DDE1EA] px-2 text-[9px]"/><button type="submit" class="mt-2 min-h-8 w-full rounded-lg bg-[#000A57] text-[9px] font-semibold text-white">Adicionar imagem</button></form>
                      <form method="POST" action="?/addVideo" class="rounded-xl border border-[#DDE1EA] p-3"><input type="hidden" name="stepId" value={step.id}/><span class="flex items-center gap-2 text-[9px] font-semibold text-[#000A57]"><Video size={13}/>Demonstração rápida</span><input name="sourceUrl" required placeholder="URL do YouTube" class="mt-2 h-9 w-full rounded-lg border border-[#DDE1EA] px-2 text-[9px]"/><p class="mt-1 text-[8px] leading-4 text-[#8B909D]">Ideal 20–45s. Se passar de ~60s, considere dividir a microação.</p><button type="submit" class="mt-2 min-h-8 w-full rounded-lg bg-[#000A57] text-[9px] font-semibold text-white">Salvar vídeo</button></form>
                    </div>
                  {/if}
                </div>

                <div class="mt-5 border-t border-[#EEF0F5] pt-5">
                  <h3 class="text-[11px] font-semibold text-[#303645]">Quando a pessoa disser “Não consegui”</h3>
                  <p class="mt-1 text-[9px] text-[#8B909D]">Cada motivo deve tentar recuperar o usuário antes de envolver atendimento humano.</p>
                  <div class="mt-3 space-y-2">
                    {#each step.failureReasons as reason}
                      <form method="POST" action="?/updateReason" class="rounded-xl border border-[#E2E5ED] bg-[#FAFAFC] p-3"><input type="hidden" name="stepId" value={step.id}/><input type="hidden" name="reasonId" value={reason.id}/><div class="grid gap-2 lg:grid-cols-[240px_1fr_auto]"><input name="label" required maxlength="180" value={reason.label} class="h-9 rounded-lg border border-[#DDE1EA] bg-white px-2 text-[9px]"/><textarea name="recoveryMessage" rows="2" maxlength="4000" class="rounded-lg border border-[#DDE1EA] bg-white px-2 py-2 text-[9px] leading-4">{reason.recoveryMessage}</textarea>{#if data.canEdit}<button type="submit" class="h-9 rounded-lg border border-[#DDE1EA] bg-white px-3 text-[9px] font-semibold text-[#000A57]">Salvar</button>{/if}</div></form>
                    {/each}
                  </div>
                </div>

                {#if data.canEdit && data.path.steps.length > 1}<form method="POST" action="?/deleteStep" class="mt-5 border-t border-[#EEF0F5] pt-4" on:submit={(event) => { if (!confirm("Remover esta microação do rascunho? Versões já publicadas permanecem imutáveis.")) event.preventDefault(); }}><input type="hidden" name="stepId" value={step.id}/><button type="submit" class="inline-flex items-center gap-2 text-[9px] font-semibold text-[#9B2C2C]"><Trash2 size={12}/>Remover microação</button></form>{/if}
              </div>
            </details>
          {/each}
        </div>
      </section>
    </div>

    <aside class="space-y-6">
      <section class="rounded-[24px] border border-[#E2E5ED] bg-white p-5">
        <div class="flex items-start gap-3"><span class="flex h-10 w-10 items-center justify-center rounded-xl bg-[#FFF0E4] text-[#EA6D0B]"><Send size={18}/></span><div><h2 class="text-[14px] font-semibold text-[#11182C]">Convidar participante</h2><p class="mt-1 text-[10px] leading-5 text-[#858A98]">O e-mail recebe “Pronto para começar?”. O link é individual e de uso único.</p></div></div>
        {#if data.path.currentVersion < 1}<div class="mt-4 rounded-xl bg-[#FFF7ED] px-3 py-3 text-[9px] leading-4 text-[#9A4B08]">Publique a primeira versão antes de enviar convites.</div>{:else if data.canEdit}
          <form method="POST" action="?/invite" class="mt-4 space-y-3"><input name="name" required maxlength="160" placeholder="Nome do novo usuário" class="h-10 w-full rounded-xl border border-[#DDE1EA] px-3 text-[10px]"/><input name="email" type="email" required placeholder="email@cliente.com.br" class="h-10 w-full rounded-xl border border-[#DDE1EA] px-3 text-[10px]"/><input name="organizationName" maxlength="180" placeholder="Empresa / instituição" class="h-10 w-full rounded-xl border border-[#DDE1EA] px-3 text-[10px]"/><button type="submit" class="inline-flex min-h-10 w-full items-center justify-center gap-2 rounded-xl bg-[#EA6D0B] px-3 text-[10px] font-semibold text-white"><Mail size={14}/>Enviar convite</button></form>
        {/if}
      </section>

      <section class="rounded-[24px] border border-[#E2E5ED] bg-white p-5">
        <div class="flex items-center gap-2"><BarChart3 size={17} class="text-[#000A57]"/><h2 class="text-[14px] font-semibold text-[#11182C]">Onde estão travando</h2></div>
        {#if data.insights.stepRanking.length === 0}<p class="mt-4 text-[10px] leading-5 text-[#8B909D]">Os dados aparecem conforme participantes usam a trilha.</p>{:else}<div class="mt-4 space-y-3">{#each data.insights.stepRanking.slice(0,5) as step}<div><div class="flex justify-between gap-3 text-[9px]"><span class="font-semibold text-[#4E5565]">{step.title}</span><span class="text-[#8B909D]">{step.failures} falhas · {step.helpRequests} ajuda</span></div><div class="mt-1 h-1.5 rounded-full bg-[#EEF0F5]"><div class="h-1.5 rounded-full bg-[#EA6D0B]" style={`width:${Math.min(100, step.failures * 12 + step.helpRequests * 20)}%`}></div></div></div>{/each}</div>{/if}
        {#if data.insights.reasonRanking.length > 0}<div class="mt-5 border-t border-[#EEF0F5] pt-4"><p class="text-[9px] font-bold uppercase tracking-[0.08em] text-[#8B909D]">Motivos frequentes</p>{#each data.insights.reasonRanking.slice(0,4) as reason}<div class="mt-2 flex justify-between gap-3 text-[9px]"><span class="text-[#5E6575]">{reason.label}</span><strong>{reason.occurrences}</strong></div>{/each}</div>{/if}
      </section>

      <section class="rounded-[24px] border border-[#E2E5ED] bg-white p-5">
        <div class="flex items-center gap-2"><Users size={17} class="text-[#000A57]"/><h2 class="text-[14px] font-semibold text-[#11182C]">Participantes</h2></div>
        {#if data.participants.length === 0}<p class="mt-4 text-[10px] text-[#8B909D]">Nenhum convite enviado.</p>{:else}<div class="mt-4 space-y-3">{#each data.participants.slice(0,12) as participant}<div class="rounded-xl border border-[#EEF0F5] bg-[#FAFAFC] p-3"><div class="flex items-start justify-between gap-3"><div class="min-w-0"><strong class="block truncate text-[10px] text-[#343A49]">{participant.name}</strong><span class="mt-0.5 block truncate text-[8px] text-[#8B909D]">{participant.organizationName || participant.email}</span></div><span class={`shrink-0 rounded-full px-2 py-1 text-[8px] font-semibold ${participant.status === "completed" ? "bg-[#EEF8F1] text-[#2F7045]" : participant.status === "in_progress" ? "bg-[#EEF0FF] text-[#000A57]" : "bg-[#F1F2F5] text-[#6F7585]"}`}>{participantStatus(participant.status)}</span></div>{#if participant.startedAt}<div class="mt-2 flex items-center gap-1 text-[8px] text-[#8B909D]"><Clock3 size={10}/>{formatDate(participant.lastActivityAt)}</div>{/if}{#if participant.status === "in_progress" && participant.currentStepTitle}<p class="mt-2 text-[8px] leading-4 text-[#666D7C]">Atual: {participant.currentStepTitle}</p>{/if}{#if participant.supportTicketId}<p class="mt-2 text-[8px] font-semibold text-[#B85408]">Precisou de ajuda humana</p>{/if}</div>{/each}</div>{/if}
      </section>
    </aside>
  </div>
</div>
