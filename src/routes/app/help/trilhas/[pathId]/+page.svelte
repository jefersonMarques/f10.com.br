<script lang="ts">
  import { enhance } from "$app/forms";
  import type { SubmitFunction } from "@sveltejs/kit";
  import { ArrowDown, ArrowUp, BookOpen, Clock3, ExternalLink, Eye, LoaderCircle, Mail, RefreshCw, Save, Sparkles, Trash2 } from "lucide-svelte";
  import ApplicationBackLink from "$lib/components/application/ApplicationBackLink.svelte";
  import ApplicationContent from "$lib/components/application/ApplicationContent.svelte";
  import type { ActionData, PageData } from "./$types";

  export let data: PageData;
  export let form: ActionData;

  let openStepId = form && "openStepId" in form && typeof form.openStepId === "string" ? form.openStepId : "";
  let regenerating = false;

  const enhanceEditor: SubmitFunction = () => {
    return async ({ update }) => {
      await update({ reset: false });
    };
  };

  const enhanceRegenerate: SubmitFunction = () => {
    regenerating = true;
    return async ({ update }) => {
      try {
        await update({ reset: false });
      } finally {
        regenerating = false;
      }
    };
  };

  function sourceStepTitle(stepId: string | null): string {
    return data.path.sourcePublicationSnapshot.steps.find((step) => step.id === stepId)?.title ?? "Passo do conteúdo";
  }

  function formatSeconds(value: number): string {
    const seconds = Math.max(0, Math.round(value));
    const minutes = Math.floor(seconds / 60);
    return `${minutes}:${String(seconds % 60).padStart(2, "0")}`;
  }
</script>

<svelte:head><title>{data.path.title} | Trilhas</title></svelte:head>

<ApplicationContent width="wide">
  <div class="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
    <div>
      <ApplicationBackLink href="/app/help/trilhas" label="Trilhas" />
      <h1 class="mt-3 text-[20px] font-semibold text-[#11182C]">{data.path.title}</h1>
      <p class="mt-1 text-[12px] text-[#858A98]">Fonte: {data.path.sourcePublicationSnapshot.title}</p>
    </div>
    <div class="flex flex-wrap gap-2">
      <a href={data.previewUrl} target="_blank" rel="noopener noreferrer" class="inline-flex min-h-9 items-center gap-2 rounded-lg border border-[#DDE1EA] bg-white px-3 text-[14px] font-semibold text-[#000A57]"><Eye size={13}/>Prévia</a>
      <a href={`/ajuda-f10/${data.path.sourcePublicationSnapshot.slug}`} target="_blank" rel="noopener noreferrer" class="inline-flex min-h-9 items-center gap-2 rounded-lg border border-[#DDE1EA] bg-white px-3 text-[14px] font-semibold text-[#5F6676]"><BookOpen size={13}/>Conteúdo completo<ExternalLink size={11}/></a>
      {#if data.publicUrl}<a href={data.publicUrl} target="_blank" rel="noopener noreferrer" class="inline-flex min-h-9 items-center gap-2 rounded-lg bg-[#000A57] px-3 text-[14px] font-semibold text-white">Abrir trilha<ExternalLink size={11}/></a>{/if}
    </div>
  </div>

  {#if form?.message}
    <div class="mb-4 rounded-xl border border-[#D8DDF4] bg-[#F8F9FF] px-4 py-3 text-[12px] font-medium text-[#000A57]">{form.message}</div>
  {/if}

  <div class="grid gap-5 xl:grid-cols-[minmax(0,1fr)_330px]">
    <div class="space-y-5">
      <section class="rounded-[22px] border border-[#E2E5ED] bg-white p-5 sm:p-6">
        <div class="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div class="flex items-start gap-3">
            <span class="flex h-10 w-10 items-center justify-center rounded-xl bg-[#FFF3E9] text-[#EA6D0B]"><Sparkles size={18}/></span>
            <div>
              <h2 class="text-[14px] font-semibold text-[#11182C]">Conteúdo de origem</h2>
              <p class="mt-1 text-[12px] leading-5 text-[#777E8D]">{data.path.sourcePublicationSnapshot.title}</p>
              <p class="mt-1 text-[14px] text-[#959AA6]">Publicação usada na geração: {new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" }).format(new Date(data.path.sourcePublishedAt))}</p>
            </div>
          </div>
          {#if data.canEdit}
            <form method="POST" action="?/regenerate" use:enhance={enhanceRegenerate}>
              <button type="submit" disabled={regenerating} class="inline-flex min-h-9 items-center gap-2 rounded-lg bg-[#EA6D0B] px-3 text-[14px] font-semibold text-white disabled:opacity-60">{#if regenerating}<LoaderCircle size={12} class="animate-spin"/>{:else}<RefreshCw size={12}/>{/if}{data.sourceUpdateAvailable ? "Usar publicação mais recente" : "Regenerar orientações com IA"}</button>
            </form>
          {:else if data.sourceUpdateAvailable}
            <span class="rounded-full bg-[#FFF3E9] px-2.5 py-1 text-[12px] font-semibold text-[#A9510D]">Há atualização do conteúdo</span>
          {:else}
            <span class="rounded-full bg-[#EEF8F1] px-2.5 py-1 text-[12px] font-semibold text-[#2F7045]">Fonte sincronizada</span>
          {/if}
        </div>
      </section>

      <section class="rounded-[22px] border border-[#E2E5ED] bg-white p-5 sm:p-6">
        <h2 class="text-[14px] font-semibold text-[#11182C]">Configuração</h2>
        <form method="POST" action="?/updatePath" use:enhance={enhanceEditor} class="mt-4">
          <fieldset disabled={!data.canEdit} class="grid gap-3 lg:grid-cols-2 disabled:opacity-70">
            <label><span class="mb-1 block text-[14px] font-semibold text-[#5B6170]">Nome</span><input name="title" maxlength="160" value={data.path.title} class="h-10 w-full rounded-xl border border-[#DDE1EA] px-3 text-[12px]"/></label>
            <label><span class="mb-1 block text-[14px] font-semibold text-[#5B6170]">Endereço</span><input name="slug" maxlength="100" value={data.path.slug} class="h-10 w-full rounded-xl border border-[#DDE1EA] px-3 text-[12px]"/></label>
            <label><span class="mb-1 block text-[14px] font-semibold text-[#5B6170]">Público</span><input name="audience" maxlength="160" value={data.path.audience} class="h-10 w-full rounded-xl border border-[#DDE1EA] px-3 text-[12px]"/></label>
            <label><span class="mb-1 block text-[14px] font-semibold text-[#5B6170]">Acesso</span><select name="accessMode" value={data.path.accessMode} class="h-10 w-full rounded-xl border border-[#DDE1EA] bg-white px-3 text-[12px]"><option value="invite_only">Somente por convite</option><option value="public">Público por link</option></select></label>
            <label class="lg:col-span-2"><span class="mb-1 block text-[14px] font-semibold text-[#5B6170]">Descrição interna</span><textarea name="description" rows="2" maxlength="1200" class="w-full rounded-xl border border-[#DDE1EA] px-3 py-2 text-[12px]">{data.path.description}</textarea></label>
            <label class="lg:col-span-2"><span class="mb-1 block text-[14px] font-semibold text-[#5B6170]">Mensagem de entrada</span><textarea name="welcomeMessage" rows="2" maxlength="1200" class="w-full rounded-xl border border-[#DDE1EA] px-3 py-2 text-[12px]">{data.path.welcomeMessage}</textarea></label>
          </fieldset>
          {#if data.canEdit}<div class="mt-4 flex justify-end"><button type="submit" class="inline-flex min-h-9 items-center gap-2 rounded-lg bg-[#000A57] px-3 text-[14px] font-semibold text-white"><Save size={12}/>Salvar</button></div>{/if}
        </form>
      </section>

      <section class="rounded-[22px] border border-[#E2E5ED] bg-white p-5 sm:p-6">
        <div>
          <h2 class="text-[14px] font-semibold text-[#11182C]">Orientações geradas</h2>
          <p class="mt-1 text-[12px] leading-5 text-[#858A98]">A trilha referencia o mesmo vídeo, imagens e marcações do conteúdo. Ajuste texto, ordem ou a faixa de reprodução sem criar novos arquivos.</p>
        </div>

        <div class="mt-4 space-y-3">
          {#each data.path.steps as step, index (step.id)}
            <details open={openStepId === step.id} class="overflow-hidden rounded-2xl border border-[#E3E6ED] bg-[#FAFAFC]">
              <summary class="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-4">
                <div class="flex min-w-0 items-center gap-3">
                  <span class="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#000A57] text-[12px] font-bold text-white">{index + 1}</span>
                  <div class="min-w-0">
                    <strong class="block truncate text-[14px] text-[#2B3141]">{step.title}</strong>
                    <span class="mt-1 block truncate text-[12px] text-[#8B909D]">{sourceStepTitle(step.sourceContentStepId)}{#if step.media.some((media) => media.mediaType === "video")} · vídeo {formatSeconds(step.videoStartSeconds)} → {step.videoEndSeconds > step.videoStartSeconds ? formatSeconds(step.videoEndSeconds) : "fim livre"}{/if}</span>
                  </div>
                </div>
                {#if data.canEdit}
                  <div class="flex gap-1">
                    <form method="POST" action="?/moveStep" use:enhance={enhanceEditor}><input type="hidden" name="stepId" value={step.id}/><input type="hidden" name="direction" value="up"/><button type="submit" disabled={index===0} class="flex h-8 w-8 items-center justify-center rounded-lg border border-[#DDE1EA] bg-white disabled:opacity-30" aria-label="Mover para cima"><ArrowUp size={12}/></button></form>
                    <form method="POST" action="?/moveStep" use:enhance={enhanceEditor}><input type="hidden" name="stepId" value={step.id}/><input type="hidden" name="direction" value="down"/><button type="submit" disabled={index===data.path.steps.length-1} class="flex h-8 w-8 items-center justify-center rounded-lg border border-[#DDE1EA] bg-white disabled:opacity-30" aria-label="Mover para baixo"><ArrowDown size={12}/></button></form>
                  </div>
                {/if}
              </summary>
              <div class="border-t border-[#E7E9EF] bg-white p-4">
                <form method="POST" action="?/updateStep" use:enhance={enhanceEditor} class="space-y-3">
                  <input type="hidden" name="stepId" value={step.id}/>
                  <fieldset disabled={!data.canEdit} class="space-y-3 disabled:opacity-70">
                    <div class="grid gap-3 sm:grid-cols-3">
                      <label><span class="mb-1 block text-[12px] font-semibold text-[#616777]">Tipo</span><select name="interactionMode" value={step.interactionMode} class="h-9 w-full rounded-lg border border-[#DDE1EA] bg-white px-2 text-[14px]"><option value="action">Ação</option><option value="presentation">Apresentação</option></select></label>
                      <label><span class="mb-1 block text-[12px] font-semibold text-[#616777]">Início do trecho (s)</span><input name="videoStartSeconds" type="number" min="0" max="86400" value={step.videoStartSeconds} class="h-9 w-full rounded-lg border border-[#DDE1EA] px-2 text-[14px]"/></label>
                      <label><span class="mb-1 block text-[12px] font-semibold text-[#616777]">Fim do trecho (s)</span><input name="videoEndSeconds" type="number" min="0" max="86400" value={step.videoEndSeconds} class="h-9 w-full rounded-lg border border-[#DDE1EA] px-2 text-[14px]"/></label>
                    </div>
                    <label><span class="mb-1 block text-[12px] font-semibold text-[#616777]">Título</span><input name="title" maxlength="180" value={step.title} class="h-9 w-full rounded-lg border border-[#DDE1EA] px-2 text-[14px]"/></label>
                    <label><span class="mb-1 block text-[12px] font-semibold text-[#616777]">Instrução</span><textarea name="instruction" rows="3" maxlength="3000" class="w-full rounded-lg border border-[#DDE1EA] px-2 py-2 text-[14px] leading-5">{step.instruction}</textarea></label>
                    <div class="grid gap-3 sm:grid-cols-2">
                      <label><span class="mb-1 block text-[12px] font-semibold text-[#616777]">Pergunta de confirmação</span><input name="question" maxlength="300" value={step.question} class="h-9 w-full rounded-lg border border-[#DDE1EA] px-2 text-[14px]"/></label>
                      <label><span class="mb-1 block text-[12px] font-semibold text-[#616777]">Botão principal</span><input name="primaryActionLabel" maxlength="80" value={step.primaryActionLabel} class="h-9 w-full rounded-lg border border-[#DDE1EA] px-2 text-[14px]"/></label>
                    </div>
                    <label><span class="mb-1 block text-[12px] font-semibold text-[#616777]">Resultado esperado</span><textarea name="expectedResult" rows="2" maxlength="1500" class="w-full rounded-lg border border-[#DDE1EA] px-2 py-2 text-[14px]">{step.expectedResult}</textarea></label>
                    <div class="grid gap-3 sm:grid-cols-[1fr_140px]">
                      <label><span class="mb-1 block text-[12px] font-semibold text-[#616777]">Mensagem após concluir</span><input name="successMessage" maxlength="500" value={step.successMessage} class="h-9 w-full rounded-lg border border-[#DDE1EA] px-2 text-[14px]"/></label>
                      <label><span class="mb-1 block text-[12px] font-semibold text-[#616777]">Estimativa (s)</span><input name="estimatedSeconds" type="number" min="5" max="900" value={step.estimatedSeconds} class="h-9 w-full rounded-lg border border-[#DDE1EA] px-2 text-[14px]"/></label>
                    </div>
                  </fieldset>
                  {#if data.canEdit}<div class="flex justify-end"><button type="submit" class="inline-flex min-h-8 items-center gap-1 rounded-lg border border-[#DDE1EA] px-3 text-[12px] font-semibold text-[#000A57]"><Save size={11}/>Salvar orientação</button></div>{/if}
                </form>
                {#if data.canEdit && data.path.steps.length > 1}
                  <form method="POST" action="?/deleteStep" use:enhance={enhanceEditor} class="mt-3 border-t border-[#EEF0F5] pt-3" on:submit={(event)=>{if(!confirm("Remover esta orientação?")) event.preventDefault();}}>
                    <input type="hidden" name="stepId" value={step.id}/>
                    <button type="submit" class="inline-flex min-h-8 items-center gap-1 text-[12px] font-semibold text-[#9B2C2C]"><Trash2 size={11}/>Remover orientação</button>
                  </form>
                {/if}
              </div>
            </details>
          {/each}
        </div>
      </section>
    </div>

    <aside class="space-y-4">
      <section class="rounded-[22px] border border-[#E2E5ED] bg-white p-5">
        <h2 class="text-[14px] font-semibold text-[#11182C]">Publicação</h2>
        <div class="mt-3 space-y-2 text-[14px] text-[#747B8A]">
          <div class="flex justify-between gap-3"><span>Status</span><strong class="text-[#303645]">{data.path.status}</strong></div>
          <div class="flex justify-between gap-3"><span>Versão</span><strong class="text-[#303645]">{data.path.currentVersion}</strong></div>
          <div class="flex justify-between gap-3"><span>Orientações</span><strong class="text-[#303645]">{data.path.steps.length}</strong></div>
        </div>
        {#if data.canPublish}<form method="POST" action="?/publish" use:enhance={enhanceEditor} class="mt-4"><button type="submit" class="inline-flex min-h-10 w-full items-center justify-center gap-2 rounded-xl bg-[#000A57] px-3 text-[14px] font-semibold text-white"><Sparkles size={12}/>Publicar nova versão</button></form>{/if}
      </section>

      <section class="rounded-[22px] border border-[#E2E5ED] bg-white p-5">
        <h2 class="text-[14px] font-semibold text-[#11182C]">Convidar participante</h2>
        {#if data.path.currentVersion < 1}
          <p class="mt-3 text-[14px] leading-4 text-[#8B909D]">Publique a primeira versão antes de enviar convites.</p>
        {:else if data.canEdit}
          <form method="POST" action="?/invite" use:enhance={enhanceEditor} class="mt-3 space-y-2">
            <input name="name" required maxlength="160" placeholder="Nome" class="h-9 w-full rounded-lg border border-[#DDE1EA] px-3 text-[14px]"/>
            <input name="email" type="email" required placeholder="email@cliente.com.br" class="h-9 w-full rounded-lg border border-[#DDE1EA] px-3 text-[14px]"/>
            <input name="organizationName" maxlength="180" placeholder="Empresa" class="h-9 w-full rounded-lg border border-[#DDE1EA] px-3 text-[14px]"/>
            <button type="submit" class="inline-flex min-h-9 w-full items-center justify-center gap-2 rounded-lg bg-[#EA6D0B] text-[14px] font-semibold text-white"><Mail size={12}/>Enviar convite</button>
          </form>
        {/if}
      </section>

      <section class="rounded-[22px] border border-[#E2E5ED] bg-white p-5">
        <h2 class="text-[14px] font-semibold text-[#11182C]">Uso</h2>
        <div class="mt-3 grid grid-cols-2 gap-2">
          <div class="rounded-xl bg-[#F7F8FB] p-3"><strong class="block text-[16px] text-[#11182C]">{data.participants.length}</strong><span class="text-[12px] text-[#8B909D]">convites</span></div>
          <div class="rounded-xl bg-[#F7F8FB] p-3"><strong class="block text-[16px] text-[#2F7045]">{data.participants.filter((item)=>item.status==="completed").length}</strong><span class="text-[12px] text-[#8B909D]">concluídos</span></div>
        </div>
        {#if data.participants.length > 0}
          <div class="mt-3 space-y-2">
            {#each data.participants.slice(0,8) as participant}
              <div class="rounded-xl border border-[#EEF0F5] px-3 py-2"><strong class="block truncate text-[14px] text-[#434A5A]">{participant.name}</strong><span class="mt-0.5 block text-[12px] text-[#8B909D]">{participant.status}</span></div>
            {/each}
          </div>
        {/if}
      </section>

      {#if data.canArchive}<form method="POST" action="?/archive" use:enhance={enhanceEditor} on:submit={(event)=>{if(!confirm("Arquivar esta trilha?")) event.preventDefault();}}><button type="submit" class="w-full text-[12px] font-semibold text-[#8A5A22]">Arquivar trilha</button></form>{/if}
      {#if data.canDelete}<form method="POST" action="?/deletePath" on:submit={(event)=>{if(!confirm("Excluir este rascunho?")) event.preventDefault();}}><button type="submit" class="w-full text-[12px] font-semibold text-[#9B2C2C]">Excluir rascunho</button></form>{/if}
    </aside>
  </div>
</ApplicationContent>
