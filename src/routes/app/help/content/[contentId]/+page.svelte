<script lang="ts">
  import {
    Archive,
    ArrowLeft,
    BrainCircuit,
    CheckCircle2,
    CircleAlert,
    CloudUpload,
    ExternalLink,
    FileText,
    HardDrive,
    Image as ImageIcon,
    Info,
    Link2,
    Plus,
    Save,
    Trash2,
    Video,
  } from "lucide-svelte";
  import HelpImageUploader from "$lib/components/operations/HelpImageUploader.svelte";
  import type { ActionData, PageData } from "./$types";

  export let data: PageData;
  export let form: ActionData;

  const blockLabels: Record<string, string> = {
    text: "Texto",
    image: "Imagem",
    video: "Vídeo",
    notice: "Aviso",
    link: "Link",
    file: "Arquivo",
  };
</script>

<svelte:head>
  <title>{data.content.title} | Base de Conhecimento | F10 Operations</title>
</svelte:head>

<div class="mx-auto max-w-[1320px] px-5 py-7 sm:px-8 sm:py-9">
  <a href="/app/help/content" class="inline-flex min-h-10 items-center gap-2 rounded-xl px-2 text-[12px] font-semibold text-[#5F6575] transition hover:bg-white hover:text-[#000A57]">
    <ArrowLeft size={17} aria-hidden="true" />
    Voltar para Base de Conhecimento
  </a>

  <div class="mt-5 flex flex-col justify-between gap-5 lg:flex-row lg:items-end">
    <div class="min-w-0">
      <div class="flex flex-wrap items-center gap-2">
        <span class={`rounded-full px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.08em] ${data.content.status === "published" ? "bg-[#EEF8F1] text-[#2F7045]" : data.content.status === "archived" ? "bg-[#F1F1F3] text-[#676D7D]" : "bg-[#EEF0FF] text-[#000A57]"}`}>
          {data.content.status === "published" ? "Publicado" : data.content.status === "archived" ? "Arquivado" : "Rascunho"}
        </span>
        <span class="rounded-full bg-[#F3F4F7] px-3 py-1.5 text-[10px] font-semibold text-[#737989]">
          {data.content.steps.length} {data.content.steps.length === 1 ? "passo" : "passos"}
        </span>
        {#if data.content.hasPublishedVersion && data.content.status !== "published" && data.content.status !== "archived"}
          <span class="rounded-full bg-[#FFF4E9] px-3 py-1.5 text-[10px] font-bold text-[#B85408]">Há alterações não publicadas</span>
        {/if}
      </div>
      <h1 class="mt-3 text-[30px] font-semibold tracking-[-0.035em] text-[#010D28] sm:text-[38px]">{data.content.title}</h1>
      <p class="mt-2 text-[12px] text-[#838897]">/{data.content.slug}</p>
    </div>

    <div class="flex flex-wrap gap-2">
      <a href={`/app/help/content/${data.content.id}/preview`} class="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-[#DDE1EA] bg-white px-4 text-[11px] font-semibold text-[#000A57]">Preview<ExternalLink size={13}/></a>
      <a href="/app/help/assets" class="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-[#DDE1EA] bg-white px-4 text-[11px] font-semibold text-[#000A57]"><HardDrive size={15}/>Biblioteca</a>
      {#if data.canEdit && !data.content.publishedAt}
        <form method="POST" action="/app/help/content?/discard" on:submit={(event) => { if (!confirm("Descartar este conteúdo definitivamente? Esta ação remove o rascunho e não pode ser desfeita.")) event.preventDefault(); }}>
          <input type="hidden" name="contentId" value={data.content.id}/>
          <button type="submit" class="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-[#F0C8C8] bg-white px-4 text-[11px] font-semibold text-[#9B2C2C] transition hover:bg-[#FFF5F5]"><Trash2 size={15}/>Descartar</button>
        </form>
      {:else if data.canPublish && data.content.publishedAt}
        <form method="POST" action="/app/help/content?/archive" on:submit={(event) => { if (!confirm("Arquivar este conteúdo? Ele deixará de aparecer na Central pública e deixará de ser usado pela IA. O histórico será mantido.")) event.preventDefault(); }}>
          <input type="hidden" name="contentId" value={data.content.id}/>
          <button type="submit" class="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-[#DDE1EA] bg-white px-4 text-[11px] font-semibold text-[#626979] transition hover:bg-[#F5F6F8]"><Archive size={15}/>Arquivar</button>
        </form>
      {/if}
      {#if data.canPublish && data.content.status !== "published"}
        <form method="POST" action="?/publish">
          <button type="submit" class="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[#EA6D0B] px-5 text-[12px] font-semibold text-white shadow-[0_12px_28px_rgba(234,109,11,0.2)] transition hover:brightness-105"><CloudUpload size={17} aria-hidden="true" />Publicar conteúdo</button>
        </form>
      {/if}
    </div>
  </div>

  {#if form?.message}
    <div class={`mt-6 flex items-start gap-3 rounded-2xl border px-4 py-3 text-[12px] font-medium ${form.success ? "border-[#B9E6C9] bg-[#F1FBF4] text-[#176B35]" : "border-[#F0C8C8] bg-[#FFF5F5] text-[#9B2C2C]"}`}>
      {#if form.success}<CheckCircle2 size={18} class="mt-0.5 shrink-0" aria-hidden="true" />{:else}<CircleAlert size={18} class="mt-0.5 shrink-0" aria-hidden="true" />{/if}
      <span>{form.message}</span>
    </div>
  {/if}

  {#if data.content.status === "archived"}
    <section class="mt-6 rounded-2xl border border-[#DDE1EA] bg-[#F7F8FA] px-5 py-4">
      <p class="text-[12px] font-semibold text-[#505666]">Este conteúdo está arquivado e permanece somente para consulta interna.</p>
      <p class="mt-1 text-[11px] leading-5 text-[#777D8D]">Ele não aparece na Central pública e não participa da base usada pelo atendimento com IA.</p>
    </section>
  {:else if data.content.hasPublishedVersion && data.content.status !== "published"}
    <section class="mt-6 rounded-2xl border border-[#F1D7BD] bg-[#FFF9F3] px-5 py-4">
      <p class="text-[12px] font-semibold text-[#7A3B08]">A versão publicada anterior continua sendo a versão segura para pesquisa e IA.</p>
      <p class="mt-1 text-[11px] leading-5 text-[#91603A]">As alterações abaixo só entram na base publicada depois de clicar em “Publicar conteúdo”.</p>
    </section>
  {/if}

  <form method="POST" action="?/updateContent" class="mt-7 rounded-[24px] border border-[#E2E5ED] bg-white p-5 sm:p-7">
    <fieldset disabled={!data.canEdit} class="disabled:opacity-70">
      <div class="flex items-start justify-between gap-4"><div><h2 class="text-[16px] font-semibold text-[#11182C]">Informações gerais</h2><p class="mt-1 text-[11px] text-[#858A98]">Esses dados identificam o procedimento e dão contexto geral ao agente.</p></div><Save size={18} class="text-[#000A57]" aria-hidden="true" /></div>
      <div class="mt-6 grid gap-5 lg:grid-cols-2">
        <label class="block lg:col-span-2"><span class="mb-1.5 block text-[11px] font-semibold text-[#4A5060]">Título</span><input name="title" required maxlength="160" value={data.content.title} class="h-12 w-full rounded-xl border border-[#DDE1EA] px-4 text-[14px] font-medium outline-none focus:border-[#000A57]" /></label>
        <label class="block"><span class="mb-1.5 block text-[11px] font-semibold text-[#4A5060]">Endereço</span><input name="slug" maxlength="120" value={data.content.slug} class="h-11 w-full rounded-xl border border-[#DDE1EA] px-3 text-[12px] outline-none focus:border-[#000A57]" /></label>
        <label class="block"><span class="mb-1.5 block text-[11px] font-semibold text-[#4A5060]">Categoria</span><input name="category" maxlength="120" value={data.content.category} placeholder="Ex.: Acadêmico" class="h-11 w-full rounded-xl border border-[#DDE1EA] px-3 text-[12px] outline-none focus:border-[#000A57]" /></label>
        <label class="block lg:col-span-2"><span class="mb-1.5 block text-[11px] font-semibold text-[#4A5060]">Resumo público</span><textarea name="summary" maxlength="320" rows="3" class="w-full resize-y rounded-xl border border-[#DDE1EA] px-3 py-2.5 text-[12px] leading-5 outline-none focus:border-[#000A57]">{data.content.summary}</textarea></label>
        <label class="block rounded-2xl border border-[#D8DDF4] bg-[#F8F9FF] p-4 lg:col-span-2"><span class="flex items-center gap-2 text-[11px] font-semibold text-[#000A57]"><BrainCircuit size={16} aria-hidden="true" /> Biblioteca exclusiva da IA — contexto geral</span><span class="mt-1 block text-[10px] leading-5 text-[#777D8D]">Regras, exceções, permissões necessárias, erros comuns e detalhes que ajudam o suporte, mas não precisam aparecer na página pública.</span><textarea name="aiGeneralKnowledge" maxlength="20000" rows="6" class="mt-3 w-full resize-y rounded-xl border border-[#D8DDF4] bg-white px-3 py-2.5 text-[11px] leading-5 outline-none focus:border-[#000A57]">{data.content.aiGeneralKnowledge}</textarea></label>
      </div>
      {#if data.canEdit}<div class="mt-5 flex justify-end"><button type="submit" class="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl bg-[#000A57] px-4 text-[11px] font-semibold text-white"><Save size={15} aria-hidden="true" />Salvar informações gerais</button></div>{/if}
    </fieldset>
  </form>

  <div class="mt-7 space-y-6">
    {#each data.content.steps as step, stepIndex}
      <article class="overflow-hidden rounded-[26px] border border-[#DDE1EA] bg-white shadow-[0_8px_30px_rgba(1,13,40,0.04)]">
        <header class="flex flex-col gap-4 border-b border-[#EEF0F5] bg-[#FAFAFC] px-5 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-7">
          <div class="flex items-center gap-4"><span class="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#000A57] text-[13px] font-bold text-white">{stepIndex + 1}</span><div><p class="text-[9px] font-bold uppercase tracking-[0.12em] text-[#EA6D0B]">Passo {stepIndex + 1}</p><h2 class="mt-1 text-[16px] font-semibold text-[#222839]">{step.title}</h2></div></div>
          {#if data.canEdit && data.content.steps.length > 1}<form method="POST" action="?/deleteStep"><input type="hidden" name="stepId" value={step.id} /><button type="submit" class="inline-flex min-h-9 items-center gap-2 rounded-xl px-3 text-[10px] font-semibold text-[#9B2C2C] transition hover:bg-[#FFF0F0]"><Trash2 size={14} aria-hidden="true" />Remover passo</button></form>{/if}
        </header>

        <div class="p-5 sm:p-7">
          <form method="POST" action="?/updateStep" class="grid gap-4 lg:grid-cols-2">
            <input type="hidden" name="stepId" value={step.id} />
            <fieldset disabled={!data.canEdit} class="contents disabled:opacity-70">
              <label class="block"><span class="mb-1.5 block text-[10px] font-semibold text-[#555B6A]">Título do passo</span><input name="title" required maxlength="180" value={step.title} class="h-11 w-full rounded-xl border border-[#DDE1EA] px-3 text-[12px] outline-none focus:border-[#000A57]" /></label>
              <label class="block"><span class="mb-1.5 block text-[10px] font-semibold text-[#555B6A]">Descrição pública opcional</span><input name="description" maxlength="2000" value={step.description} class="h-11 w-full rounded-xl border border-[#DDE1EA] px-3 text-[12px] outline-none focus:border-[#000A57]" /></label>
              <label class="block rounded-2xl border border-[#D8DDF4] bg-[#F8F9FF] p-4 lg:col-span-2"><span class="flex items-center gap-2 text-[10px] font-semibold text-[#000A57]"><BrainCircuit size={14} aria-hidden="true" /> Conhecimento da IA para este passo</span><textarea name="aiKnowledge" maxlength="20000" rows="4" class="mt-3 w-full resize-y rounded-xl border border-[#D8DDF4] bg-white px-3 py-2.5 text-[11px] leading-5 outline-none focus:border-[#000A57]">{step.aiKnowledge}</textarea></label>
              {#if data.canEdit}<div class="flex justify-end lg:col-span-2"><button type="submit" class="inline-flex min-h-9 items-center gap-2 rounded-xl border border-[#DDE1EA] bg-white px-4 text-[10px] font-semibold text-[#000A57]"><Save size={14} aria-hidden="true" />Salvar passo</button></div>{/if}
            </fieldset>
          </form>

          <section class="mt-7 border-t border-[#EEF0F5] pt-6">
            <div class="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
              <div><h3 class="text-[13px] font-semibold text-[#303645]">Conteúdo visível deste passo</h3><p class="mt-1 text-[10px] text-[#9297A5]">Texto, imagem, vídeo e arquivos ficam separados para melhorar leitura, busca e suporte.</p></div>
              <div class="flex items-center gap-2"><span class="rounded-full bg-[#F4F5F8] px-2.5 py-1 text-[9px] font-semibold text-[#747A8A]">{step.blocks.length} blocos</span>{#if data.canEdit}<a href="/app/help/assets" class="inline-flex min-h-8 items-center gap-1.5 rounded-lg border border-[#DDE1EA] bg-white px-2.5 text-[9px] font-semibold text-[#000A57]"><HardDrive size={12}/>Usar biblioteca</a>{/if}</div>
            </div>

            {#if step.blocks.length === 0}
              <div class="mt-4 rounded-2xl border border-dashed border-[#D6DAE3] bg-[#FAFAFC] px-5 py-8 text-center"><p class="text-[11px] font-semibold text-[#5F6574]">Este passo ainda está vazio.</p><p class="mt-1 text-[10px] text-[#9499A6]">Adicione texto, imagem, vídeo ou arquivo antes de publicar.</p></div>
            {:else}
              <div class="mt-4 space-y-4">
                {#each step.blocks as block, blockIndex}
                  <div class="rounded-2xl border border-[#E3E6ED] bg-[#FAFAFC] p-4 sm:p-5">
                    <div class="flex items-center justify-between gap-3">
                      <span class="inline-flex items-center gap-2 text-[9px] font-bold uppercase tracking-[0.08em] text-[#737989]">
                        {#if block.blockType === "text" || block.blockType === "file"}<FileText size={14} aria-hidden="true" />{:else if block.blockType === "image"}<ImageIcon size={14} aria-hidden="true" />{:else if block.blockType === "video"}<Video size={14} aria-hidden="true" />{:else if block.blockType === "link"}<Link2 size={14} aria-hidden="true" />{:else}<Info size={14} aria-hidden="true" />{/if}
                        {blockLabels[block.blockType] ?? block.blockType} {blockIndex + 1}
                      </span>
                      {#if data.canEdit}<form method="POST" action="?/deleteBlock"><input type="hidden" name="blockId" value={block.id} /><button type="submit" class="flex h-8 w-8 items-center justify-center rounded-lg text-[#969BA7] transition hover:bg-[#FFF0F0] hover:text-[#A52A2A]" aria-label="Remover bloco"><Trash2 size={14} aria-hidden="true" /></button></form>{/if}
                    </div>

                    <form method="POST" action="?/updateBlock" class="mt-4 space-y-3">
                      <input type="hidden" name="blockId" value={block.id} /><input type="hidden" name="blockType" value={block.blockType} />
                      {#if block.blockType === "text" || block.blockType === "notice"}
                        <textarea name="textContent" required maxlength="50000" rows="5" class="w-full resize-y rounded-xl border border-[#DDE1EA] bg-white px-3 py-2.5 text-[12px] leading-6 outline-none focus:border-[#000A57]">{block.textContent}</textarea>
                        {#if block.blockType === "notice"}<select name="noticeVariant" value={block.noticeVariant ?? "info"} class="h-10 rounded-xl border border-[#DDE1EA] bg-white px-3 text-[11px]"><option value="info">Informação</option><option value="warning">Atenção</option><option value="success">Sucesso</option></select>{/if}
                      {:else if block.blockType === "image" && block.asset?.storageKey}
                        <img src={`/api/app/help/assets/${block.asset.id}`} alt={block.asset.altText || "Imagem da biblioteca"} class="max-h-[380px] w-auto rounded-xl border border-[#E2E5ED] bg-white object-contain" />
                        <p class="text-[9px] text-[#7D8392]">Imagem gerenciada pela Biblioteca. Para reutilizar ou substituir, use a Biblioteca de arquivos.</p>
                      {:else if block.blockType === "image" || block.blockType === "video"}
                        {#if block.blockType === "image" && block.asset?.sourceUrl}<img src={block.asset.sourceUrl} alt={block.asset.altText || "Prévia da imagem"} class="max-h-[320px] w-auto rounded-xl border border-[#E2E5ED] bg-white object-contain" />{/if}
                        <label class="block"><span class="mb-1 block text-[9px] font-semibold text-[#616777]">URL da {block.blockType === "image" ? "imagem" : "mídia/vídeo"}</span><input name="sourceUrl" required value={block.asset?.sourceUrl ?? ""} class="h-10 w-full rounded-xl border border-[#DDE1EA] bg-white px-3 text-[11px]" /></label>
                        <label class="block"><span class="mb-1 block text-[9px] font-semibold text-[#616777]">Texto alternativo</span><input name="altText" maxlength="500" value={block.asset?.altText ?? ""} class="h-10 w-full rounded-xl border border-[#DDE1EA] bg-white px-3 text-[11px]" /></label>
                        <div class="grid gap-3 lg:grid-cols-2"><label class="block rounded-xl border border-[#D8DDF4] bg-[#F8F9FF] p-3"><span class="text-[9px] font-semibold text-[#000A57]">Transcrição / conteúdo da mídia para IA</span><textarea name="transcript" maxlength="100000" rows="4" class="mt-2 w-full resize-y rounded-lg border border-[#D8DDF4] bg-white px-3 py-2 text-[10px] leading-5">{block.asset?.transcript ?? ""}</textarea></label><label class="block rounded-xl border border-[#D8DDF4] bg-[#F8F9FF] p-3"><span class="text-[9px] font-semibold text-[#000A57]">Resumo adicional para IA</span><textarea name="aiSummary" maxlength="20000" rows="4" class="mt-2 w-full resize-y rounded-lg border border-[#D8DDF4] bg-white px-3 py-2 text-[10px] leading-5">{block.asset?.aiSummary ?? ""}</textarea></label></div>
                      {:else if block.blockType === "file" && block.asset}
                        <a href={`/api/app/help/assets/${block.asset.id}`} target="_blank" rel="noopener noreferrer" class="flex items-center justify-between gap-3 rounded-xl border border-[#DDE1EA] bg-white px-4 py-3 text-[10px] font-semibold text-[#000A57]"><span>{block.linkLabel || "Baixar arquivo"}</span><ExternalLink size={13}/></a>
                        <p class="text-[9px] text-[#7D8392]">Arquivo gerenciado pela Biblioteca. Remova este bloco para desvinculá-lo do passo; o arquivo original permanece disponível para reutilização.</p>
                      {:else if block.blockType === "link"}
                        <div class="grid gap-3 lg:grid-cols-2"><label><span class="mb-1 block text-[9px] font-semibold text-[#616777]">Texto do link</span><input name="linkLabel" required maxlength="240" value={block.linkLabel ?? ""} class="h-10 w-full rounded-xl border border-[#DDE1EA] bg-white px-3 text-[11px]" /></label><label><span class="mb-1 block text-[9px] font-semibold text-[#616777]">URL</span><input name="linkUrl" required value={block.linkUrl ?? ""} class="h-10 w-full rounded-xl border border-[#DDE1EA] bg-white px-3 text-[11px]" /></label></div>
                      {/if}

                      {#if data.canEdit && block.blockType !== "file" && !(block.blockType === "image" && block.asset?.storageKey)}<div class="flex justify-end"><button type="submit" class="inline-flex min-h-9 items-center gap-2 rounded-xl bg-white px-3 text-[10px] font-semibold text-[#000A57] shadow-sm ring-1 ring-[#DDE1EA]"><Save size={13} aria-hidden="true" />Salvar bloco</button></div>{/if}
                    </form>
                  </div>
                {/each}
              </div>
            {/if}

            {#if data.canEdit}
              <div class="mt-5 grid gap-3 lg:grid-cols-3">
                <details class="rounded-2xl border border-[#DDE1EA] bg-white p-4"><summary class="flex cursor-pointer list-none items-center gap-2 text-[10px] font-semibold text-[#000A57]"><FileText size={15} aria-hidden="true" />Adicionar texto</summary><form method="POST" action="?/addBlock" class="mt-4 space-y-3"><input type="hidden" name="stepId" value={step.id} /><input type="hidden" name="blockType" value="text" /><textarea name="textContent" required maxlength="50000" rows="5" placeholder="Explique o que o usuário deve fazer neste ponto." class="w-full resize-y rounded-xl border border-[#DDE1EA] px-3 py-2 text-[11px] leading-5"></textarea><button type="submit" class="min-h-9 w-full rounded-xl bg-[#000A57] px-3 text-[10px] font-semibold text-white">Adicionar texto</button></form></details>
                <HelpImageUploader contentId={data.content.id} stepId={step.id} />
                <details class="rounded-2xl border border-[#DDE1EA] bg-white p-4"><summary class="flex cursor-pointer list-none items-center gap-2 text-[10px] font-semibold text-[#000A57]"><Video size={15} aria-hidden="true" />Adicionar vídeo do YouTube</summary><form method="POST" action="?/addBlock" class="mt-4 space-y-3"><input type="hidden" name="stepId" value={step.id} /><input type="hidden" name="blockType" value="video" /><input name="sourceUrl" required placeholder="https://www.youtube.com/watch?v=..." class="h-10 w-full rounded-xl border border-[#DDE1EA] px-3 text-[10px]" /><input name="altText" maxlength="500" placeholder="Descrição do vídeo" class="h-10 w-full rounded-xl border border-[#DDE1EA] px-3 text-[10px]" /><textarea name="transcript" maxlength="100000" rows="4" placeholder="Transcrição ou conteúdo do vídeo para a IA" class="w-full rounded-xl border border-[#D8DDF4] bg-[#F8F9FF] px-3 py-2 text-[10px]"></textarea><textarea name="aiSummary" maxlength="20000" rows="3" placeholder="Resumo adicional para IA" class="w-full rounded-xl border border-[#D8DDF4] bg-[#F8F9FF] px-3 py-2 text-[10px]"></textarea><button type="submit" class="min-h-9 w-full rounded-xl bg-[#000A57] px-3 text-[10px] font-semibold text-white">Adicionar vídeo</button></form></details>
              </div>
            {/if}
          </section>
        </div>
      </article>
    {/each}
  </div>

  {#if data.canEdit}<form method="POST" action="?/addStep" class="mt-6"><button type="submit" class="flex min-h-14 w-full items-center justify-center gap-2 rounded-[20px] border border-dashed border-[#BCC2CF] bg-white text-[12px] font-semibold text-[#000A57] transition hover:border-[#000A57] hover:bg-[#F8F9FF]"><Plus size={18} aria-hidden="true" />Adicionar próximo passo</button></form>{/if}

  <section class="mt-7 rounded-[24px] border border-[#D8DDF4] bg-[#F8F9FF] p-5 sm:p-6"><div class="flex items-start gap-3"><BrainCircuit size={20} class="mt-0.5 shrink-0 text-[#000A57]" aria-hidden="true" /><div><h2 class="text-[13px] font-semibold text-[#000A57]">Uma única base para cliente, pesquisa e suporte</h2><p class="mt-2 max-w-[900px] text-[11px] leading-6 text-[#646B7D]">Quando publicado, o snapshot guarda separadamente a apresentação pública e o conhecimento privado da IA. Assim o agente pode usar transcrições, exceções e instruções internas sem expor essas informações diretamente na Central pública.</p></div></div></section>
</div>
