<script lang="ts">
  import { enhance } from "$app/forms";
  import type { SubmitFunction } from "@sveltejs/kit";
  import {
    Archive,
    ArrowDown,
    ArrowUp,
    BarChart3,
    CheckCircle2,
    CircleAlert,
    Clock3,
    ExternalLink,
    Eye,
    Globe2,
    GraduationCap,
    Mail,
    Plus,
    Save,
    Send,
    Trash2,
    Users,
    Video,
  } from "lucide-svelte";
  import ApplicationBackLink from "$lib/components/application/ApplicationBackLink.svelte";
  import ApplicationContent from "$lib/components/application/ApplicationContent.svelte";
  import TrainingImageUploader from "$lib/components/operations/TrainingImageUploader.svelte";
  import HelpTrainingVideoUploader from "$lib/components/operations/HelpTrainingVideoUploader.svelte";
  import type { ActionData, PageData } from "./$types";

  export let data: PageData;
  export let form: ActionData;

  let openStepId = data.path.steps[0]?.id ?? "";

  $: if (form && "openStepId" in form && typeof form.openStepId === "string") {
    openStepId = form.openStepId;
  }

  const enhanceEditor: SubmitFunction = () => {
    return async ({ update, result }) => {
      if ((result.type === "success" || result.type === "failure") && result.data && "openStepId" in result.data && typeof result.data.openStepId === "string") {
        openStepId = result.data.openStepId;
      }
      await update({ reset: false, invalidateAll: true });
    };
  };

  function statusLabel(status: string, currentVersion: number): string {
    if (status === "published") return "Publicada";
    if (status === "archived") return "Arquivada";
    if (currentVersion > 0) return "Alterações não publicadas";
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

  function handleStepToggle(event: Event, stepId: string): void {
    const details = event.currentTarget as HTMLDetailsElement;
    if (details.open) openStepId = stepId;
    else if (openStepId === stepId) openStepId = "";
  }
</script>

<svelte:head><title>{data.path.title} | Trilhas F10</title></svelte:head>

<ApplicationContent width="wide">
  <div class="mb-4 flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
    <ApplicationBackLink href="/app/help/trilhas" label="Trilhas" />
    <div class="flex flex-wrap items-center gap-2">
      <span class={`application-text-caption rounded-full px-3 py-1.5 font-bold uppercase tracking-[0.08em] ${data.path.status === "published" ? "bg-[#EEF8F1] text-[#2F7045]" : data.path.status === "archived" ? "bg-[#F1F1F3] text-[#676D7D]" : "bg-[#EEF0FF] text-[#000A57]"}`}>{statusLabel(data.path.status, data.path.currentVersion)}</span>
      {#if data.path.currentVersion > 0}<span class="application-text-caption rounded-full bg-[#F3F4F7] px-3 py-1.5 font-semibold text-[#737989]">versão {data.path.currentVersion}</span>{/if}
      <span class="application-text-caption rounded-full bg-[#FFF4E9] px-3 py-1.5 font-semibold text-[#B85408]">{data.path.steps.length} microações · somente interno</span>
    </div>
  </div>

  <section class="mb-4 rounded-[22px] border border-[#E2E5ED] bg-white px-5 py-4 sm:px-6">
    <div class="flex flex-col justify-between gap-4 xl:flex-row xl:items-center">
      <div class="min-w-0">
        <h2 class="truncate text-[18px] font-semibold text-[#11182C]">{data.path.title}</h2>
        <p class="mt-1 truncate text-[11px] text-[#838897]">/{data.path.slug} · {data.path.audience || "público não informado"}</p>
      </div>
      <div class="flex flex-wrap gap-2">
        <a href={data.previewUrl} target="_blank" rel="noopener noreferrer" class="application-text-caption inline-flex min-h-10 items-center gap-2 rounded-xl border border-[#DDE1EA] bg-white px-3.5 font-semibold text-[#000A57]"><Eye size={14}/>Pré-visualizar</a>
        {#if data.publicUrl}<a href={data.publicUrl} target="_blank" rel="noopener noreferrer" class="application-text-caption inline-flex min-h-10 items-center gap-2 rounded-xl border border-[#B9E6C9] bg-[#F1FBF4] px-3.5 font-semibold text-[#2F7045]"><Globe2 size={14}/>Abrir link público</a>{/if}
        {#if data.canPublish && data.path.status !== "published"}
          <form method="POST" action="?/publish" use:enhance={enhanceEditor}><button type="submit" class="application-text-caption inline-flex min-h-10 items-center gap-2 rounded-xl bg-[#EA6D0B] px-4 font-semibold text-white"><GraduationCap size={15}/>Publicar nova versão</button></form>
        {/if}
        {#if data.canArchive}
          <form method="POST" action="?/archive" use:enhance={enhanceEditor} on:submit={(event) => { if (!confirm("Arquivar esta trilha? O link público e novos convites serão bloqueados; participantes já iniciados continuam na versão recebida.")) event.preventDefault(); }}><button type="submit" class="application-text-caption inline-flex min-h-10 items-center gap-2 rounded-xl border border-[#DDE1EA] bg-white px-3.5 font-semibold text-[#626979]"><Archive size={14}/>Arquivar</button></form>
        {/if}
        {#if data.canDelete}
          <form method="POST" action="?/deletePath" use:enhance on:submit={(event) => { if (!confirm("Excluir definitivamente esta trilha em rascunho? Esta ação não pode ser desfeita.")) event.preventDefault(); }}><button type="submit" class="application-text-caption inline-flex min-h-10 items-center gap-2 rounded-xl border border-[#F0C8C8] bg-white px-3.5 font-semibold text-[#9B2C2C]"><Trash2 size={14}/>Excluir rascunho</button></form>
        {/if}
      </div>
    </div>
  </section>

  {#if form?.message}
    <div class={`mb-4 flex items-start gap-3 rounded-2xl border px-4 py-3 text-[12px] font-medium ${form.success ? "border-[#B9E6C9] bg-[#F1FBF4] text-[#176B35]" : "border-[#F0C8C8] bg-[#FFF5F5] text-[#9B2C2C]"}`}>
      {#if form.success}<CheckCircle2 size={18}/>{:else}<CircleAlert size={18}/>{/if}<span>{form.message}</span>
    </div>
  {/if}

  <section class="grid gap-3 md:grid-cols-4">
    <div class="rounded-2xl border border-[#E2E5ED] bg-white p-5"><Mail size={18} class="text-[#000A57]"/><strong class="mt-3 block text-[24px] font-semibold">{data.insights.invited}</strong><span class="application-text-caption text-[#858A98]">convidados</span></div>
    <div class="rounded-2xl border border-[#E2E5ED] bg-white p-5"><Users size={18} class="text-[#000A57]"/><strong class="mt-3 block text-[24px] font-semibold">{data.insights.started}</strong><span class="application-text-caption text-[#858A98]">iniciaram</span></div>
    <div class="rounded-2xl border border-[#E2E5ED] bg-white p-5"><CheckCircle2 size={18} class="text-[#2F7045]"/><strong class="mt-3 block text-[24px] font-semibold">{data.insights.completed}</strong><span class="application-text-caption text-[#858A98]">concluíram</span></div>
    <div class="rounded-2xl border border-[#E2E5ED] bg-white p-5"><CircleAlert size={18} class="text-[#EA6D0B]"/><strong class="mt-3 block text-[24px] font-semibold">{data.insights.humanHelp}</strong><span class="application-text-caption text-[#858A98]">precisaram de ajuda humana</span></div>
  </section>

  <div class="mt-5 grid gap-6 xl:grid-cols-[minmax(0,1fr)_420px]">
    <div class="space-y-5">
      <form method="POST" action="?/updatePath" use:enhance={enhanceEditor} class="rounded-[22px] border border-[#E2E5ED] bg-white p-5 sm:p-6">
        <fieldset disabled={!data.canEdit} class="disabled:opacity-70">
          <div class="flex items-start justify-between gap-3"><div><h2 class="text-[16px] font-semibold text-[#11182C]">Configuração da trilha</h2><p class="mt-1 text-[11px] text-[#858A98]">Quantidade total e estimativas nunca são enviadas para a experiência do participante.</p></div><Save size={17} class="text-[#000A57]"/></div>
          <div class="mt-5 grid gap-4 lg:grid-cols-2">
            <label class="block lg:col-span-2"><span class="application-text-caption mb-1.5 block font-semibold text-[#555B6A]">Nome</span><input name="title" required maxlength="160" value={data.path.title} class="h-11 w-full rounded-xl border border-[#DDE1EA] px-3 text-[12px]"/></label>
            <label class="block"><span class="application-text-caption mb-1.5 block font-semibold text-[#555B6A]">Endereço</span><input name="slug" maxlength="100" value={data.path.slug} class="h-11 w-full rounded-xl border border-[#DDE1EA] px-3 text-[12px]"/></label>
            <label class="block"><span class="application-text-caption mb-1.5 block font-semibold text-[#555B6A]">Público</span><input name="audience" maxlength="160" value={data.path.audience} class="h-11 w-full rounded-xl border border-[#DDE1EA] px-3 text-[12px]"/></label>
            <label class="block lg:col-span-2"><span class="application-text-caption mb-1.5 block font-semibold text-[#555B6A]">Descrição interna</span><textarea name="description" rows="3" maxlength="1200" class="w-full rounded-xl border border-[#DDE1EA] px-3 py-2.5 text-[11px]">{data.path.description}</textarea><span class="application-text-meta mt-1 block text-[#8B909D]">Somente Operations. Este conteúdo não é enviado ao participante.</span></label>
            <label class="block lg:col-span-2"><span class="application-text-caption mb-1.5 block font-semibold text-[#555B6A]">Mensagem de entrada</span><textarea name="welcomeMessage" rows="3" maxlength="1200" class="w-full rounded-xl border border-[#DDE1EA] px-3 py-2.5 text-[11px]">{data.path.welcomeMessage}</textarea><span class="application-text-meta mt-1 block text-[#8B909D]">Evite informar quantidade de etapas ou duração.</span></label>
            <label class="block"><span class="application-text-caption mb-1.5 block font-semibold text-[#555B6A]">Acesso</span><select name="accessMode" value={data.path.accessMode} class="h-11 w-full rounded-xl border border-[#DDE1EA] bg-white px-3 text-[11px]"><option value="invite_only">Somente por convite</option><option value="public">Público por link</option></select><span class="application-text-meta mt-1 block text-[#8B909D]">O link público usa sempre a última versão publicada.</span></label>
            <label class="block"><span class="application-text-caption mb-1.5 block font-semibold text-[#555B6A]">Fila quando precisar de ajuda humana</span><select name="supportQueueId" value={data.path.supportQueueId ?? ""} class="h-11 w-full rounded-xl border border-[#DDE1EA] bg-white px-3 text-[11px]"><option value="">Fila padrão de suporte</option>{#each data.queues as queue}<option value={queue.id}>{queue.name} ({queue.code})</option>{/each}</select></label>
          </div>
          {#if data.canEdit}<div class="mt-5 flex justify-end"><button type="submit" class="application-text-caption inline-flex min-h-10 items-center gap-2 rounded-xl bg-[#000A57] px-4 font-semibold text-white"><Save size={14}/>Salvar configuração</button></div>{/if}
        </fieldset>
      </form>

      <section class="rounded-[22px] border border-[#E2E5ED] bg-white p-5 sm:p-6">
        <div class="flex flex-col justify-between gap-3 sm:flex-row sm:items-center"><div><h2 class="text-[16px] font-semibold text-[#11182C]">Microações</h2><p class="mt-1 text-[11px] text-[#858A98]">Use “Apresentação” quando basta mostrar algo e “Ação” quando precisa confirmar se a pessoa conseguiu executar.</p></div>{#if data.canEdit}<form method="POST" action="?/addStep" use:enhance={enhanceEditor}><button type="submit" class="application-text-caption inline-flex min-h-10 items-center gap-2 rounded-xl bg-[#000A57] px-4 font-semibold text-white"><Plus size={14}/>Adicionar microação</button></form>{/if}</div>

        <div class="mt-5 space-y-4">
          {#each data.path.steps as step, stepIndex (step.id)}
            <details class="overflow-hidden rounded-2xl border border-[#E3E6ED] bg-[#FAFAFC]" open={openStepId === step.id} on:toggle={(event) => handleStepToggle(event, step.id)}>
              <summary class="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-4 sm:px-5">
                <div class="flex min-w-0 items-center gap-3"><span class="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#000A57] text-[11px] font-bold text-white">{stepIndex + 1}</span><div class="min-w-0"><strong class="block truncate text-[12px] font-semibold text-[#2B3141]">{step.title}</strong><span class="application-text-meta mt-1 block text-[#8B909D]">{(step.interactionMode ?? "action") === "presentation" ? "Apresentação" : "Ação com confirmação"} · estimativa interna {step.estimatedSeconds}s</span></div></div>
                {#if data.canEdit}<div class="flex shrink-0 gap-1" on:click|stopPropagation><form method="POST" action="?/moveStep" use:enhance={enhanceEditor}><input type="hidden" name="stepId" value={step.id}/><input type="hidden" name="direction" value="up"/><button type="submit" disabled={stepIndex === 0} aria-label="Mover microação para cima" class="flex h-8 w-8 items-center justify-center rounded-lg border border-[#E1E4EB] bg-white text-[#6B7280] disabled:opacity-30"><ArrowUp size={13}/></button></form><form method="POST" action="?/moveStep" use:enhance={enhanceEditor}><input type="hidden" name="stepId" value={step.id}/><input type="hidden" name="direction" value="down"/><button type="submit" disabled={stepIndex === data.path.steps.length - 1} aria-label="Mover microação para baixo" class="flex h-8 w-8 items-center justify-center rounded-lg border border-[#E1E4EB] bg-white text-[#6B7280] disabled:opacity-30"><ArrowDown size={13}/></button></form></div>{/if}
              </summary>
              <div class="border-t border-[#E7E9EF] bg-white p-4 sm:p-5">
                <form method="POST" action="?/updateStep" use:enhance={enhanceEditor} class="space-y-4">
                  <input type="hidden" name="stepId" value={step.id}/>
                  <fieldset disabled={!data.canEdit} class="space-y-4 disabled:opacity-70">
                    <div class="grid gap-3 lg:grid-cols-[220px_1fr]"><label class="block"><span class="application-text-meta mb-1 block font-semibold text-[#616777]">Tipo</span><select name="interactionMode" value={step.interactionMode ?? "action"} class="h-10 w-full rounded-xl border border-[#DDE1EA] bg-white px-3 text-[11px]"><option value="presentation">Apresentação — só continuar</option><option value="action">Ação — conseguiu / não conseguiu</option></select></label><label class="block"><span class="application-text-meta mb-1 block font-semibold text-[#616777]">Título curto</span><input name="title" required maxlength="180" value={step.title} class="h-10 w-full rounded-xl border border-[#DDE1EA] px-3 text-[11px]"/></label></div>
                    <label class="block"><span class="application-text-meta mb-1 block font-semibold text-[#616777]">Conteúdo mostrado agora</span><textarea name="instruction" required rows="4" maxlength="6000" class="w-full rounded-xl border border-[#DDE1EA] px-3 py-2.5 text-[11px] leading-5">{step.instruction}</textarea></label>
                    {#if (step.interactionMode ?? "action") === "action"}<label class="block"><span class="application-text-meta mb-1 block font-semibold text-[#616777]">O que deve aparecer quando terminar</span><textarea name="expectedResult" required rows="2" maxlength="3000" class="w-full rounded-xl border border-[#DDE1EA] px-3 py-2.5 text-[11px]">{step.expectedResult}</textarea></label>{:else}<input type="hidden" name="expectedResult" value=""/><div class="rounded-xl bg-[#F7F8FB] px-3 py-3 text-[10px] leading-5 text-[#6F7585]">Neste tipo de passo o participante verá somente <strong>Continuar</strong>. Não haverá “Não consegui” nem cobrança de resultado.</div>{/if}
                    <div class="grid gap-3 lg:grid-cols-[1fr_160px]"><label class="block"><span class="application-text-meta mb-1 block font-semibold text-[#616777]">Mensagem após concluir</span><input name="successMessage" maxlength="500" value={step.successMessage} placeholder={(step.interactionMode ?? "action") === "presentation" ? "Certo. Vamos continuar." : "Perfeito. Você concluiu esta ação."} class="h-10 w-full rounded-xl border border-[#DDE1EA] px-3 text-[11px]"/></label><label class="block"><span class="application-text-meta mb-1 block font-semibold text-[#616777]">Segundos estimados</span><input name="estimatedSeconds" type="number" min="5" max="900" value={step.estimatedSeconds} class="h-10 w-full rounded-xl border border-[#DDE1EA] px-3 text-[11px]"/></label></div>
                    {#if data.canEdit}<div class="flex justify-end"><button type="submit" class="application-text-caption inline-flex min-h-9 items-center gap-2 rounded-xl border border-[#DDE1EA] bg-white px-3 font-semibold text-[#000A57]"><Save size={13}/>Salvar microação</button></div>{/if}
                  </fieldset>
                </form>

                <div class="mt-5 border-t border-[#EEF0F5] pt-5">
                  <h3 class="text-[11px] font-semibold text-[#303645]">Demonstração visual</h3>
                  <p class="application-text-meta mt-1 text-[#8B909D]">Adicione somente a mídia necessária para este pedaço do conteúdo.</p>
                  {#if step.media.length > 0}
                    <div class="mt-3 grid gap-3 sm:grid-cols-2">
                      {#each step.media as media}
                        <div class="rounded-xl border border-[#E2E5ED] bg-[#FAFAFC] p-3">
                          {#if media.mediaType === "image" && media.assetId}
                            <img src={`/api/app/help/assets/${media.assetId}`} alt={media.altText || media.assetName || "Imagem da microação"} class="max-h-48 w-full rounded-lg bg-white object-contain"/>
                            <p class="application-text-meta mt-2 truncate font-semibold text-[#606777]">{media.assetName || "Print da microação"}</p>
                          {:else if media.mediaType === "video" && media.assetId}
                            <video src={`/api/app/help/assets/${media.assetId}`} controls preload="metadata" class="aspect-video w-full rounded-lg bg-black" aria-label="Demonstração da microação"></video>
                            <p class="application-text-meta mt-2 truncate font-semibold text-[#606777]">{media.assetName || "Microvídeo"}</p>
                          {:else if media.mediaType === "video" && media.sourceUrl}
                            <div class="flex min-h-28 items-center justify-center rounded-lg bg-[#EEF0FF] text-[#000A57]"><Video size={26}/></div><a href={media.sourceUrl} target="_blank" rel="noopener noreferrer" class="application-text-meta mt-2 inline-flex items-center gap-1 font-semibold text-[#000A57]">Vídeo externo<ExternalLink size={11}/></a>
                          {/if}
                          {#if data.canEdit}<form method="POST" action="?/deleteMedia" use:enhance={enhanceEditor} class="mt-2"><input type="hidden" name="stepId" value={step.id}/><input type="hidden" name="mediaId" value={media.id}/><button type="submit" class="application-text-meta inline-flex items-center gap-1 font-semibold text-[#9B2C2C]"><Trash2 size={11}/>Remover</button></form>{/if}
                        </div>
                      {/each}
                    </div>
                  {/if}
                  {#if data.canEdit}<div class="mt-3 grid gap-3 lg:grid-cols-2"><TrainingImageUploader pathId={data.path.id} stepId={step.id}/><HelpTrainingVideoUploader pathId={data.path.id} stepId={step.id}/></div>{/if}
                </div>

                {#if (step.interactionMode ?? "action") === "action"}
                  <div class="mt-5 border-t border-[#EEF0F5] pt-5">
                    <div class="flex flex-col justify-between gap-2 sm:flex-row sm:items-center"><div><h3 class="text-[11px] font-semibold text-[#303645]">Quando a pessoa disser “Não consegui”</h3><p class="application-text-meta mt-1 text-[#8B909D]">O motivo coletado ajuda a recuperar a pessoa e mostra onde a trilha precisa melhorar.</p></div>{#if data.canEdit}<form method="POST" action="?/addReason" use:enhance={enhanceEditor}><input type="hidden" name="stepId" value={step.id}/><button type="submit" class="application-text-meta inline-flex min-h-8 items-center gap-1 rounded-lg border border-[#DDE1EA] bg-white px-2.5 font-semibold text-[#000A57]"><Plus size={11}/>Adicionar motivo</button></form>{/if}</div>
                    {#if step.failureReasons.length === 0}<div class="application-text-meta mt-3 rounded-xl bg-[#FFF7ED] px-3 py-3 text-[#9A4B08]">Adicione pelo menos um motivo antes de publicar.</div>{/if}
                    <div class="mt-3 space-y-2">
                      {#each step.failureReasons as reason, reasonIndex (reason.id)}
                        <div class="rounded-xl border border-[#E2E5ED] bg-[#FAFAFC] p-3">
                          <form method="POST" action="?/updateReason" use:enhance={enhanceEditor}><input type="hidden" name="stepId" value={step.id}/><input type="hidden" name="reasonId" value={reason.id}/><div class="grid gap-2 lg:grid-cols-[220px_1fr_auto]"><input name="label" required maxlength="180" value={reason.label} class="application-text-meta h-9 rounded-lg border border-[#DDE1EA] bg-white px-2"/><textarea name="recoveryMessage" rows="2" maxlength="4000" class="application-text-meta rounded-lg border border-[#DDE1EA] bg-white px-2 py-2 leading-4">{reason.recoveryMessage}</textarea>{#if data.canEdit}<button type="submit" class="application-text-meta h-9 rounded-lg border border-[#DDE1EA] bg-white px-3 font-semibold text-[#000A57]">Salvar</button>{/if}</div></form>
                          {#if data.canEdit}<div class="mt-2 flex gap-1"><form method="POST" action="?/moveReason" use:enhance={enhanceEditor}><input type="hidden" name="stepId" value={step.id}/><input type="hidden" name="reasonId" value={reason.id}/><input type="hidden" name="direction" value="up"/><button type="submit" disabled={reasonIndex === 0} class="application-text-meta inline-flex h-7 items-center gap-1 rounded-md border border-[#E1E4EB] bg-white px-2 text-[#6B7280] disabled:opacity-30"><ArrowUp size={10}/>Subir</button></form><form method="POST" action="?/moveReason" use:enhance={enhanceEditor}><input type="hidden" name="stepId" value={step.id}/><input type="hidden" name="reasonId" value={reason.id}/><input type="hidden" name="direction" value="down"/><button type="submit" disabled={reasonIndex === step.failureReasons.length - 1} class="application-text-meta inline-flex h-7 items-center gap-1 rounded-md border border-[#E1E4EB] bg-white px-2 text-[#6B7280] disabled:opacity-30"><ArrowDown size={10}/>Descer</button></form><form method="POST" action="?/deleteReason" use:enhance={enhanceEditor} on:submit={(event) => { if (!confirm("Remover este motivo?")) event.preventDefault(); }}><input type="hidden" name="stepId" value={step.id}/><input type="hidden" name="reasonId" value={reason.id}/><button type="submit" class="application-text-meta inline-flex h-7 items-center gap-1 rounded-md px-2 font-semibold text-[#9B2C2C]"><Trash2 size={10}/>Remover</button></form></div>{/if}
                        </div>
                      {/each}
                    </div>
                  </div>
                {/if}

                {#if data.canEdit && data.path.steps.length > 1}<form method="POST" action="?/deleteStep" use:enhance={enhanceEditor} class="mt-5 border-t border-[#EEF0F5] pt-4" on:submit={(event) => { if (!confirm("Remover esta microação do rascunho? Versões já publicadas permanecem imutáveis.")) event.preventDefault(); }}><input type="hidden" name="stepId" value={step.id}/><button type="submit" class="application-text-meta inline-flex items-center gap-2 font-semibold text-[#9B2C2C]"><Trash2 size={12}/>Remover microação</button></form>{/if}
              </div>
            </details>
          {/each}
        </div>
      </section>
    </div>

    <aside class="space-y-5">
      <section class="rounded-[22px] border border-[#E2E5ED] bg-white p-5">
        <div class="flex items-start gap-3"><span class="flex h-10 w-10 items-center justify-center rounded-xl bg-[#FFF0E4] text-[#EA6D0B]"><Send size={18}/></span><div><h2 class="text-[14px] font-semibold text-[#11182C]">Convidar participante</h2><p class="application-text-caption mt-1 leading-5 text-[#858A98]">O link é individual. A pessoa nunca recebe a quantidade total de passos.</p></div></div>
        {#if data.path.currentVersion < 1}<div class="application-text-meta mt-4 rounded-xl bg-[#FFF7ED] px-3 py-3 leading-4 text-[#9A4B08]">Publique a primeira versão antes de enviar convites.</div>{:else if data.canEdit}
          <form method="POST" action="?/invite" use:enhance={enhanceEditor} class="mt-4 space-y-3"><input name="name" required maxlength="160" placeholder="Nome do novo usuário" class="application-text-caption h-10 w-full rounded-xl border border-[#DDE1EA] px-3"/><input name="email" type="email" required placeholder="email@cliente.com.br" class="application-text-caption h-10 w-full rounded-xl border border-[#DDE1EA] px-3"/><input name="organizationName" maxlength="180" placeholder="Empresa / instituição" class="application-text-caption h-10 w-full rounded-xl border border-[#DDE1EA] px-3"/><button type="submit" class="application-text-caption inline-flex min-h-10 w-full items-center justify-center gap-2 rounded-xl bg-[#EA6D0B] px-3 font-semibold text-white"><Mail size={14}/>Enviar convite</button></form>
        {/if}
      </section>

      {#if data.path.accessMode === "public"}
        <section class="rounded-[22px] border border-[#CFE9D7] bg-[#F7FCF8] p-5"><div class="flex items-center gap-2"><Globe2 size={17} class="text-[#2F7045]"/><h2 class="text-[14px] font-semibold text-[#234F32]">Acesso público</h2></div>{#if data.publicUrl}<p class="application-text-caption mt-3 leading-5 text-[#52715D]">A última versão publicada está disponível sem convite. Alterações do rascunho só aparecem após uma nova publicação.</p><a href={data.publicUrl} target="_blank" rel="noopener noreferrer" class="application-text-caption mt-3 inline-flex items-center gap-1 font-semibold text-[#2F7045]">Abrir experiência<ExternalLink size={11}/></a>{:else}<p class="application-text-caption mt-3 leading-5 text-[#52715D]">Publique a primeira versão para ativar o endereço público.</p>{/if}</section>
      {/if}

      <section class="rounded-[22px] border border-[#E2E5ED] bg-white p-5">
        <div class="flex items-center gap-2"><BarChart3 size={17} class="text-[#000A57]"/><h2 class="text-[14px] font-semibold text-[#11182C]">Onde estão travando</h2></div>
        {#if data.insights.stepRanking.length === 0}<p class="application-text-caption mt-4 leading-5 text-[#8B909D]">Os dados aparecem conforme participantes usam a trilha.</p>{:else}<div class="mt-4 space-y-3">{#each data.insights.stepRanking.slice(0,5) as step}<div><div class="application-text-meta flex justify-between gap-3"><span class="font-semibold text-[#4E5565]">{step.title}</span><span class="text-[#8B909D]">{step.failures} falhas · {step.helpRequests} ajuda</span></div><div class="mt-1 h-1.5 rounded-full bg-[#EEF0F5]"><div class="h-1.5 rounded-full bg-[#EA6D0B]" style={`width:${Math.min(100, step.failures * 12 + step.helpRequests * 20)}%`}></div></div></div>{/each}</div>{/if}
        {#if data.insights.reasonRanking.length > 0}<div class="mt-5 border-t border-[#EEF0F5] pt-4"><p class="application-text-meta font-bold uppercase tracking-[0.08em] text-[#8B909D]">Motivos frequentes</p>{#each data.insights.reasonRanking.slice(0,4) as reason}<div class="application-text-meta mt-2 flex justify-between gap-3"><span class="text-[#5E6575]">{reason.label}</span><strong>{reason.occurrences}</strong></div>{/each}</div>{/if}
      </section>

      <section class="rounded-[22px] border border-[#E2E5ED] bg-white p-5">
        <div class="flex items-center gap-2"><Users size={17} class="text-[#000A57]"/><h2 class="text-[14px] font-semibold text-[#11182C]">Participantes por convite</h2></div>
        {#if data.participants.length === 0}<p class="application-text-caption mt-4 text-[#8B909D]">Nenhum convite enviado.</p>{:else}<div class="mt-4 space-y-3">{#each data.participants.slice(0,12) as participant}<div class="rounded-xl border border-[#EEF0F5] bg-[#FAFAFC] p-3"><div class="flex items-start justify-between gap-3"><div class="min-w-0"><strong class="application-text-caption block truncate text-[#343A49]">{participant.name}</strong><span class="application-text-meta mt-0.5 block truncate text-[#8B909D]">{participant.organizationName || participant.email}</span></div><span class={`application-text-meta shrink-0 rounded-full px-2 py-1 font-semibold ${participant.status === "completed" ? "bg-[#EEF8F1] text-[#2F7045]" : participant.status === "in_progress" ? "bg-[#EEF0FF] text-[#000A57]" : "bg-[#F1F2F5] text-[#6F7585]"}`}>{participantStatus(participant.status)}</span></div>{#if participant.startedAt}<div class="application-text-meta mt-2 flex items-center gap-1 text-[#8B909D]"><Clock3 size={10}/>{formatDate(participant.lastActivityAt)}</div>{/if}{#if participant.status === "in_progress" && participant.currentStepTitle}<p class="application-text-meta mt-2 leading-4 text-[#666D7C]">Atual: {participant.currentStepTitle}</p>{/if}{#if participant.supportTicketId}<p class="application-text-meta mt-2 font-semibold text-[#B85408]">Precisou de ajuda humana</p>{/if}</div>{/each}</div>{/if}
      </section>
    </aside>
  </div>
</ApplicationContent>
