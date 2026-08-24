<script lang="ts">
  import {
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
    LockKeyhole,
    Plus,
    Save,
    Search,
    Trash2,
    Video,
  } from "lucide-svelte";
  import ApplicationBackLink from "$lib/components/application/ApplicationBackLink.svelte";
  import ApplicationContent from "$lib/components/application/ApplicationContent.svelte";
  import HelpImageUploader from "$lib/components/operations/HelpImageUploader.svelte";
  import type { ActionData, PageData } from "./$types";

  export let data: PageData;
  export let form: ActionData;

  const blockLabels: Record<string, string> = {
    text: "Texto",
    image: "Imagem",
    notice: "Aviso",
    link: "Link",
    file: "Arquivo",
  };

  function assignedCategory(categoryId: string) {
    return data.content.categories.find((category) => category.id === categoryId);
  }

  $: allBlocks = data.content.steps.flatMap((step) => step.blocks);
  $: imageBlocks = allBlocks.filter((block) => block.blockType === "image");
  $: describedImageCount = imageBlocks.filter(
    (block) => Boolean(block.asset?.altText.trim() || block.asset?.assistantDescription.trim()),
  ).length;
  $: fileBlocks = allBlocks.filter((block) => block.blockType === "file");
  $: indexedFileCount = fileBlocks.filter(
    (block) => Boolean(block.asset?.extractedText.trim() || block.asset?.assistantSummary.trim()),
  ).length;
  $: stepsWithContent = data.content.steps.filter((step) => step.blocks.length > 0).length;
  $: imageOnlyStepsReady = data.content.steps.every((step) => {
    const images = step.blocks.filter((block) => block.blockType === "image");
    if (images.length === 0 || images.length !== step.blocks.length) return true;
    return images.every(
      (block) => Boolean(block.asset?.altText.trim() || block.asset?.assistantDescription.trim()),
    );
  });
  $: videoReady = !data.content.featuredVideo || Boolean(data.content.featuredVideo.subtitles.trim());
  $: publicationReady =
    data.content.categories.length > 0 &&
    data.content.categories.every((category) => category.active) &&
    data.content.steps.length > 0 &&
    stepsWithContent === data.content.steps.length &&
    imageOnlyStepsReady &&
    videoReady;
  $: knowledgeTopics = Array.from(
    new Set(
      [
        data.content.title,
        ...data.content.categories.map((category) => category.name),
        ...data.content.searchAliases,
        ...data.content.steps.map((step) => step.title),
      ]
        .map((item) => item.trim())
        .filter(Boolean),
    ),
  ).slice(0, 12);
</script>

<svelte:head><title>{data.content.title} | Base de Conhecimento | F10 Operations</title></svelte:head>

<ApplicationContent width="wide">
  <div class="mb-4 flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
    <ApplicationBackLink href="/app/help/content" label="Base de Conhecimento" />
    <div class="flex flex-wrap items-center gap-2">
      <span class={`application-text-caption rounded-full px-3 py-1.5 font-bold uppercase tracking-[0.08em] ${data.content.status === "published" ? "bg-[#EEF8F1] text-[#2F7045]" : data.content.status === "archived" ? "bg-[#F1F1F3] text-[#676D7D]" : "bg-[#EEF0FF] text-[#000A57]"}`}>
        {data.content.status === "published" ? "Publicado" : data.content.status === "archived" ? "Arquivado" : "Rascunho"}
      </span>
      <span class="application-text-caption rounded-full bg-[#F3F4F7] px-3 py-1.5 font-semibold text-[#737989]">{data.content.steps.length} {data.content.steps.length === 1 ? "passo" : "passos"}</span>
    </div>
  </div>

  <section class="mb-4 rounded-[22px] border border-[#E2E5ED] bg-white px-5 py-4 sm:px-6">
    <div class="flex flex-col justify-between gap-4 xl:flex-row xl:items-center">
      <div class="min-w-0"><h2 class="truncate text-[18px] font-semibold text-[#11182C]">{data.content.title}</h2><p class="mt-1 truncate text-[11px] text-[#838897]">/{data.content.slug}</p></div>
      <div class="flex flex-wrap gap-2">
        <a href={`/app/help/content/${data.content.id}/preview`} class="application-text-caption inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-[#DDE1EA] bg-white px-3.5 font-semibold text-[#000A57]">Preview<ExternalLink size={12}/></a>
        <a href="/app/help/categories" class="application-text-caption inline-flex min-h-10 items-center justify-center rounded-xl border border-[#DDE1EA] bg-white px-3.5 font-semibold text-[#000A57]">Categorias</a>
        <a href="/app/help/assets" class="application-text-caption inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-[#DDE1EA] bg-white px-3.5 font-semibold text-[#000A57]"><HardDrive size={14}/>Biblioteca</a>
        {#if data.canPublish && data.content.status !== "published"}
          <form method="POST" action="?/publish"><button type="submit" class="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl bg-[#EA6D0B] px-4 text-[11px] font-semibold text-white"><CloudUpload size={15}/>Publicar conteúdo</button></form>
        {/if}
      </div>
    </div>
  </section>

  {#if form?.message}
    <div class={`mb-4 flex items-start gap-3 rounded-2xl border px-4 py-3 text-[12px] font-medium ${form.success ? "border-[#B9E6C9] bg-[#F1FBF4] text-[#176B35]" : "border-[#F0C8C8] bg-[#FFF5F5] text-[#9B2C2C]"}`}>
      {#if form.success}<CheckCircle2 size={18}/>{:else}<CircleAlert size={18}/>{/if}<span>{form.message}</span>
    </div>
  {/if}

  {#if data.content.status === "archived"}
    <section class="mb-4 rounded-2xl border border-[#DDE1EA] bg-[#F7F8FA] px-5 py-4"><p class="text-[12px] font-semibold text-[#505666]">Este conteúdo está arquivado e permanece somente para consulta interna.</p></section>
  {:else if data.content.hasPublishedVersion && data.content.status !== "published"}
    <section class="mb-4 rounded-2xl border border-[#F1D7BD] bg-[#FFF9F3] px-5 py-4"><p class="text-[12px] font-semibold text-[#7A3B08]">A versão publicada anterior continua atendendo clientes até a próxima publicação.</p></section>
  {/if}

  <form method="POST" action="?/updateContent" class="rounded-[22px] border border-[#E2E5ED] bg-white p-5 sm:p-6">
    <fieldset disabled={!data.canEdit} class="disabled:opacity-70">
      <div class="flex items-start justify-between gap-4"><div><h2 class="text-[16px] font-semibold text-[#11182C]">Informações gerais</h2><p class="mt-1 text-[11px] text-[#858A98]">O conteúdo público é a principal fonte do assistente. Preencha conhecimento adicional somente quando necessário.</p></div><Save size={18} class="text-[#000A57]"/></div>

      <div class="mt-6 grid gap-5 lg:grid-cols-2">
        <label class="block lg:col-span-2"><span class="mb-1.5 block text-[11px] font-semibold text-[#4A5060]">Título</span><input name="title" required maxlength="160" value={data.content.title} class="h-12 w-full rounded-xl border border-[#DDE1EA] px-4 text-[14px] font-medium" /></label>
        <label class="block lg:col-span-2"><span class="mb-1.5 block text-[11px] font-semibold text-[#4A5060]">Endereço</span><input name="slug" maxlength="120" value={data.content.slug} class="h-11 w-full rounded-xl border border-[#DDE1EA] px-3 text-[12px]" /></label>
        <label class="block lg:col-span-2"><span class="mb-1.5 block text-[11px] font-semibold text-[#4A5060]">Resumo público</span><textarea name="summary" maxlength="320" rows="3" class="w-full resize-y rounded-xl border border-[#DDE1EA] px-3 py-2.5 text-[12px] leading-5">{data.content.summary}</textarea></label>

        <section class="rounded-2xl border border-[#E2E5ED] bg-[#FAFAFC] p-4 lg:col-span-2">
          <div><h3 class="text-[12px] font-semibold text-[#303645]">Categorias *</h3><p class="mt-1 text-[10px] leading-5 text-[#858A98]">Selecione uma ou mais. O link específico substitui o link operacional padrão da categoria somente para este artigo.</p></div>
          <div class="mt-4 grid gap-3 lg:grid-cols-2">
            {#each data.categories as category}
              <div class={`rounded-xl border p-3 ${assignedCategory(category.id) ? "border-[#BFC7F4] bg-white" : "border-[#E2E5ED] bg-white"}`}>
                <label class="flex items-center gap-2 text-[11px] font-semibold text-[#333A4A]"><input type="checkbox" name="categoryId" value={category.id} checked={Boolean(assignedCategory(category.id))} disabled={!category.active && !assignedCategory(category.id)} class="h-4 w-4" />{category.icon ? `${category.icon} ` : ""}{category.name}{#if !category.active}<span class="text-[9px] text-[#9B2C2C]">inativa</span>{/if}</label>
                <input name={`categoryDestination:${category.id}`} maxlength="1000" value={assignedCategory(category.id)?.destinationUrl ?? ""} placeholder={category.destinationUrl || "Link específico opcional"} class="mt-2 h-9 w-full rounded-lg border border-[#DDE1EA] px-3 text-[10px]" />
                {#if category.destinationUrl}<p class="mt-1 text-[9px] text-[#9297A5]">Padrão: {category.destinationUrl}</p>{/if}
              </div>
            {/each}
          </div>
        </section>

        <label class="block rounded-2xl border border-[#DDE1EA] bg-white p-4 lg:col-span-2"><span class="flex items-center gap-2 text-[11px] font-semibold text-[#303645]"><Search size={15}/>Termos relacionados / sinônimos</span><span class="mt-1 block text-[10px] leading-5 text-[#858A98]">Usados somente para localizar o artigo. Um termo por linha, vírgula ou ponto e vírgula.</span><textarea name="searchAliases" maxlength="8000" rows="4" class="mt-3 w-full resize-y rounded-xl border border-[#DDE1EA] px-3 py-2.5 text-[11px] leading-5">{data.content.searchAliases.join("\n")}</textarea></label>

        <label class="block rounded-2xl border border-[#D8DDF4] bg-[#F8F9FF] p-4 lg:col-span-2"><span class="flex items-center gap-2 text-[11px] font-semibold text-[#000A57]"><BrainCircuit size={16}/>Conhecimento adicional do assistente</span><span class="mt-1 block text-[10px] leading-5 text-[#777D8D]">Somente informações seguras para serem respondidas ao cliente e que não precisam aparecer no artigo.</span><textarea name="assistantKnowledge" maxlength="40000" rows="5" class="mt-3 w-full resize-y rounded-xl border border-[#D8DDF4] bg-white px-3 py-2.5 text-[11px] leading-5">{data.content.assistantKnowledge}</textarea></label>

        <label class="block rounded-2xl border border-[#F0D7C4] bg-[#FFF9F4] p-4 lg:col-span-2"><span class="flex items-center gap-2 text-[11px] font-semibold text-[#7A3B08]"><LockKeyhole size={15}/>Notas internas do suporte</span><span class="mt-1 block text-[10px] leading-5 text-[#91603A]">Uso interno. Este conteúdo não é incluído na publicação nem no contexto da IA pública.</span><textarea name="internalSupportNotes" maxlength="40000" rows="4" class="mt-3 w-full resize-y rounded-xl border border-[#F0D7C4] bg-white px-3 py-2.5 text-[11px] leading-5">{data.content.internalSupportNotes}</textarea></label>
      </div>
      {#if data.canEdit}<div class="mt-5 flex justify-end"><button type="submit" class="inline-flex min-h-10 items-center gap-2 rounded-xl bg-[#000A57] px-4 text-[11px] font-semibold text-white"><Save size={15}/>Salvar informações gerais</button></div>{/if}
    </fieldset>
  </form>

  <section class="mt-5 rounded-[22px] border border-[#E2E5ED] bg-white p-5 sm:p-6">
    <div class="flex items-start gap-3"><span class="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#FFF3E9] text-[#EA6D0B]"><Video size={20}/></span><div><h2 class="text-[16px] font-semibold text-[#11182C]">Vídeo principal</h2><p class="mt-1 max-w-[760px] text-[11px] leading-5 text-[#858A98]">Opcional. Quando existir, subtitles são obrigatórios e formam a fonte textual do vídeo para pesquisa e respostas.</p></div></div>

    <form method="POST" action="?/updateFeaturedVideo" class="mt-5">
      <fieldset disabled={!data.canEdit} class="grid gap-4 disabled:opacity-70 lg:grid-cols-2">
        <label class="block lg:col-span-2"><span class="application-text-caption mb-1.5 block font-semibold text-[#555B6A]">URL do vídeo</span><input name="sourceUrl" required value={data.content.featuredVideo?.sourceUrl ?? ""} placeholder="https://www.youtube.com/watch?v=..." class="h-11 w-full rounded-xl border border-[#DDE1EA] px-3 text-[12px]" /></label>
        <label class="block lg:col-span-2"><span class="application-text-caption mb-1.5 block font-semibold text-[#555B6A]">Descrição pública</span><input name="altText" maxlength="500" value={data.content.featuredVideo?.altText ?? ""} placeholder="Ex.: Demonstração completa do cadastro" class="h-11 w-full rounded-xl border border-[#DDE1EA] px-3 text-[12px]" /></label>
        <label class="block rounded-2xl border border-[#D8DDF4] bg-[#F8F9FF] p-4 lg:col-span-2"><span class="application-text-caption font-semibold text-[#000A57]">Subtitles *</span><span class="mt-1 block text-[10px] leading-5 text-[#777D8D]">Cole o conteúdo de SRT, VTT ou texto equivalente. É a fonte factual do vídeo.</span><textarea name="subtitles" required maxlength="200000" rows="10" class="mt-3 w-full resize-y rounded-xl border border-[#D8DDF4] bg-white px-3 py-2.5 text-[11px] leading-5">{data.content.featuredVideo?.subtitles ?? ""}</textarea></label>
        <label class="block rounded-2xl border border-[#D8DDF4] bg-[#F8F9FF] p-4 lg:col-span-2"><span class="application-text-caption font-semibold text-[#000A57]">Resumo operacional opcional</span><span class="mt-1 block text-[10px] leading-5 text-[#777D8D]">Resumo curto do que o vídeo demonstra; serve como apoio ao retrieval.</span><textarea name="assistantSummary" maxlength="20000" rows="5" class="mt-3 w-full resize-y rounded-xl border border-[#D8DDF4] bg-white px-3 py-2.5 text-[11px] leading-5">{data.content.featuredVideo?.assistantSummary ?? ""}</textarea></label>
        {#if data.canEdit}<div class="flex justify-end lg:col-span-2"><button type="submit" class="inline-flex min-h-10 items-center gap-2 rounded-xl bg-[#000A57] px-4 text-[11px] font-semibold text-white"><Save size={15}/>{data.content.featuredVideo ? "Salvar vídeo" : "Adicionar vídeo"}</button></div>{/if}
      </fieldset>
    </form>
    {#if data.canEdit && data.content.featuredVideo}<form method="POST" action="?/deleteFeaturedVideo" class="mt-3 flex justify-end" on:submit={(event) => { if (!confirm("Remover o vídeo principal?")) event.preventDefault(); }}><button type="submit" class="application-text-caption inline-flex min-h-9 items-center gap-2 rounded-xl border border-[#F0C8C8] bg-white px-3 font-semibold text-[#9B2C2C]"><Trash2 size={14}/>Remover vídeo</button></form>{/if}
  </section>

  <div class="mt-5 space-y-5">
    {#each data.content.steps as step, stepIndex}
      <article class="overflow-hidden rounded-[22px] border border-[#DDE1EA] bg-white">
        <header class="flex flex-col gap-4 border-b border-[#EEF0F5] bg-[#FAFAFC] px-5 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-6"><div class="flex items-center gap-4"><span class="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#000A57] text-[13px] font-bold text-white">{stepIndex + 1}</span><div><p class="application-text-meta font-bold uppercase tracking-[0.12em] text-[#EA6D0B]">Passo {stepIndex + 1}</p><h2 class="mt-1 text-[16px] font-semibold text-[#222839]">{step.title}</h2></div></div>{#if data.canEdit && data.content.steps.length > 1}<form method="POST" action="?/deleteStep"><input type="hidden" name="stepId" value={step.id}/><button type="submit" class="application-text-caption inline-flex min-h-9 items-center gap-2 rounded-xl px-3 font-semibold text-[#9B2C2C]"><Trash2 size={14}/>Remover passo</button></form>{/if}</header>

        <div class="p-5 sm:p-6">
          <form method="POST" action="?/updateStep" class="grid gap-4 lg:grid-cols-2">
            <input type="hidden" name="stepId" value={step.id}/>
            <fieldset disabled={!data.canEdit} class="contents disabled:opacity-70">
              <label class="block"><span class="application-text-caption mb-1.5 block font-semibold text-[#555B6A]">Título do passo</span><input name="title" required maxlength="180" value={step.title} class="h-11 w-full rounded-xl border border-[#DDE1EA] px-3 text-[12px]" /></label>
              <label class="block"><span class="application-text-caption mb-1.5 block font-semibold text-[#555B6A]">Descrição pública</span><input name="description" maxlength="2000" value={step.description} class="h-11 w-full rounded-xl border border-[#DDE1EA] px-3 text-[12px]" /></label>
              <label class="block rounded-2xl border border-[#D8DDF4] bg-[#F8F9FF] p-4 lg:col-span-2"><span class="application-text-caption flex items-center gap-2 font-semibold text-[#000A57]"><BrainCircuit size={14}/>Conhecimento adicional do assistente</span><span class="mt-1 block text-[10px] text-[#777D8D]">Deixe vazio se o conteúdo público do passo já for suficiente.</span><textarea name="assistantKnowledge" maxlength="20000" rows="4" class="mt-3 w-full resize-y rounded-xl border border-[#D8DDF4] bg-white px-3 py-2.5 text-[11px] leading-5">{step.assistantKnowledge}</textarea></label>
              {#if data.canEdit}<div class="flex justify-end lg:col-span-2"><button type="submit" class="application-text-caption inline-flex min-h-9 items-center gap-2 rounded-xl border border-[#DDE1EA] bg-white px-4 font-semibold text-[#000A57]"><Save size={14}/>Salvar passo</button></div>{/if}
            </fieldset>
          </form>

          <section class="mt-7 border-t border-[#EEF0F5] pt-6">
            <div><h3 class="text-[13px] font-semibold text-[#303645]">Conteúdo visível deste passo</h3><p class="application-text-caption mt-1 text-[#9297A5]">Texto público já é conhecimento do assistente; não repita a mesma informação em campos adicionais.</p></div>

            {#if step.blocks.length === 0}
              <div class="mt-4 rounded-2xl border border-dashed border-[#D6DAE3] bg-[#FAFAFC] px-5 py-8 text-center"><p class="text-[11px] font-semibold text-[#5F6574]">Este passo ainda está vazio.</p></div>
            {:else}
              <div class="mt-4 space-y-4">
                {#each step.blocks as block, blockIndex}
                  <div class="rounded-2xl border border-[#E3E6ED] bg-[#FAFAFC] p-4 sm:p-5">
                    <div class="flex items-center justify-between gap-3"><span class="application-text-meta inline-flex items-center gap-2 font-bold uppercase tracking-[0.08em] text-[#737989]">{#if block.blockType === "text" || block.blockType === "file"}<FileText size={14}/>{:else if block.blockType === "image"}<ImageIcon size={14}/>{:else if block.blockType === "link"}<Link2 size={14}/>{:else}<Info size={14}/>{/if}{blockLabels[block.blockType] ?? block.blockType} {blockIndex + 1}</span>{#if data.canEdit}<form method="POST" action="?/deleteBlock"><input type="hidden" name="blockId" value={block.id}/><button type="submit" class="flex h-8 w-8 items-center justify-center rounded-lg text-[#969BA7] hover:text-[#A52A2A]" aria-label="Remover bloco"><Trash2 size={14}/></button></form>{/if}</div>

                    {#if block.blockType === "text" || block.blockType === "notice"}
                      <form method="POST" action="?/updateBlock" class="mt-4 space-y-3"><input type="hidden" name="blockId" value={block.id}/><input type="hidden" name="blockType" value={block.blockType}/><textarea name="textContent" required maxlength="50000" rows="5" class="w-full resize-y rounded-xl border border-[#DDE1EA] bg-white px-3 py-2.5 text-[12px] leading-6">{block.textContent}</textarea>{#if block.blockType === "notice"}<select name="noticeVariant" value={block.noticeVariant ?? "info"} class="h-10 rounded-xl border border-[#DDE1EA] bg-white px-3 text-[11px]"><option value="info">Informação</option><option value="warning">Atenção</option><option value="success">Sucesso</option><option value="danger">Perigo</option></select>{/if}{#if data.canEdit}<div class="flex justify-end"><button type="submit" class="application-text-caption min-h-9 rounded-xl bg-white px-3 font-semibold text-[#000A57] ring-1 ring-[#DDE1EA]">Salvar bloco</button></div>{/if}</form>
                    {:else if block.blockType === "image" && block.asset}
                      {#if block.asset.storageKey}<img src={`/api/app/help/assets/${block.asset.id}`} alt={block.asset.altText || "Imagem"} class="mt-4 max-h-[380px] w-auto rounded-xl border border-[#E2E5ED] bg-white object-contain" />{:else if block.asset.sourceUrl}<img src={block.asset.sourceUrl} alt={block.asset.altText || "Imagem"} class="mt-4 max-h-[380px] w-auto rounded-xl border border-[#E2E5ED] bg-white object-contain" />{/if}
                      <div class="mt-3 rounded-xl bg-white px-3 py-2 text-[10px] leading-5 text-[#6F7584]"><strong>Texto alternativo:</strong> {block.asset.altText || "não informado"}<br/><strong>Descrição para o assistente:</strong> {block.asset.assistantDescription || "não necessária / não informada"}</div>
                    {:else if block.blockType === "link"}
                      <form method="POST" action="?/updateBlock" class="mt-4 grid gap-3 lg:grid-cols-2"><input type="hidden" name="blockId" value={block.id}/><input type="hidden" name="blockType" value="link"/><input name="linkLabel" required maxlength="240" value={block.linkLabel ?? ""} class="h-10 rounded-xl border border-[#DDE1EA] bg-white px-3 text-[11px]"/><input name="linkUrl" required value={block.linkUrl ?? ""} class="h-10 rounded-xl border border-[#DDE1EA] bg-white px-3 text-[11px]"/>{#if data.canEdit}<div class="flex justify-end lg:col-span-2"><button type="submit" class="application-text-caption min-h-9 rounded-xl bg-white px-3 font-semibold text-[#000A57] ring-1 ring-[#DDE1EA]">Salvar link</button></div>{/if}</form>
                    {:else if block.blockType === "file" && block.asset}
                      <div class="mt-4 rounded-xl border border-[#DDE1EA] bg-white p-3"><strong class="text-[11px] text-[#303645]">{block.linkLabel || block.asset.originalName || "Arquivo"}</strong>{#if block.asset.extractedText}<p class="mt-2 line-clamp-4 whitespace-pre-wrap text-[10px] leading-5 text-[#777D8D]">{block.asset.extractedText}</p>{/if}</div>
                    {/if}
                  </div>
                {/each}
              </div>
            {/if}

            {#if data.canEdit}
              <div class="mt-5 grid gap-3 lg:grid-cols-2">
                <details class="rounded-2xl border border-[#DDE1EA] bg-white p-4"><summary class="application-text-caption flex cursor-pointer list-none items-center gap-2 font-semibold text-[#000A57]"><FileText size={15}/>Adicionar texto</summary><form method="POST" action="?/addBlock" class="mt-4 space-y-3"><input type="hidden" name="stepId" value={step.id}/><input type="hidden" name="blockType" value="text"/><textarea name="textContent" required maxlength="50000" rows="5" placeholder="Explique o que o usuário deve fazer." class="w-full resize-y rounded-xl border border-[#DDE1EA] px-3 py-2 text-[11px] leading-5"></textarea><button type="submit" class="application-text-caption min-h-9 w-full rounded-xl bg-[#000A57] px-3 font-semibold text-white">Adicionar texto</button></form></details>
                <HelpImageUploader contentId={data.content.id} stepId={step.id}/>
                <details class="rounded-2xl border border-[#DDE1EA] bg-white p-4"><summary class="application-text-caption cursor-pointer font-semibold text-[#000A57]">Adicionar aviso</summary><form method="POST" action="?/addBlock" class="mt-4 space-y-3"><input type="hidden" name="stepId" value={step.id}/><input type="hidden" name="blockType" value="notice"/><textarea name="textContent" required rows="3" maxlength="50000" class="w-full rounded-xl border border-[#DDE1EA] px-3 py-2 text-[11px]"></textarea><select name="noticeVariant" class="h-10 w-full rounded-xl border border-[#DDE1EA] px-3 text-[11px]"><option value="info">Informação</option><option value="warning">Atenção</option><option value="success">Sucesso</option><option value="danger">Perigo</option></select><button type="submit" class="application-text-caption min-h-9 w-full rounded-xl bg-[#000A57] px-3 font-semibold text-white">Adicionar aviso</button></form></details>
                <details class="rounded-2xl border border-[#DDE1EA] bg-white p-4"><summary class="application-text-caption cursor-pointer font-semibold text-[#000A57]">Adicionar link</summary><form method="POST" action="?/addBlock" class="mt-4 space-y-3"><input type="hidden" name="stepId" value={step.id}/><input type="hidden" name="blockType" value="link"/><input name="linkLabel" required maxlength="240" placeholder="Texto do link" class="h-10 w-full rounded-xl border border-[#DDE1EA] px-3 text-[11px]"/><input name="linkUrl" required placeholder="https://..." class="h-10 w-full rounded-xl border border-[#DDE1EA] px-3 text-[11px]"/><button type="submit" class="application-text-caption min-h-9 w-full rounded-xl bg-[#000A57] px-3 font-semibold text-white">Adicionar link</button></form></details>
              </div>
            {/if}
          </section>
        </div>
      </article>
    {/each}
  </div>

  {#if data.canEdit}<form method="POST" action="?/addStep" class="mt-5"><button type="submit" class="flex min-h-14 w-full items-center justify-center gap-2 rounded-[20px] border border-dashed border-[#BCC2CF] bg-white text-[12px] font-semibold text-[#000A57]"><Plus size={18}/>Adicionar próximo passo</button></form>{/if}

  <section class="mt-5 rounded-[22px] border border-[#D8DDF4] bg-[#F8F9FF] p-5 sm:p-6">
    <div class="flex items-start gap-3">
      <BrainCircuit size={20} class="mt-0.5 shrink-0 text-[#000A57]"/>
      <div class="min-w-0 flex-1">
        <div class="flex flex-wrap items-center justify-between gap-3">
          <div><h2 class="text-[13px] font-semibold text-[#000A57]">Cobertura do conhecimento</h2><p class="mt-1 text-[10px] leading-5 text-[#777D8D]">Verificação determinística do que ficará disponível para pesquisa e respostas depois da publicação.</p></div>
          <span class={`rounded-full px-3 py-1.5 text-[9px] font-bold ${publicationReady ? "bg-[#E7F6EC] text-[#2F7045]" : "bg-[#FFF1E7] text-[#A9510D]"}`}>{publicationReady ? "Estrutura pronta" : "Revisão necessária"}</span>
        </div>

        <div class="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          <div class="rounded-xl border border-[#DDE1EA] bg-white p-3"><div class="flex items-center gap-2">{#if data.content.categories.length > 0 && data.content.categories.every((category) => category.active)}<CheckCircle2 size={15} class="text-[#2F7045]"/>{:else}<CircleAlert size={15} class="text-[#A9510D]"/>{/if}<strong class="text-[10px] text-[#303645]">Categorias</strong></div><p class="mt-2 text-[9px] leading-4 text-[#818795]">{data.content.categories.length} associada{data.content.categories.length === 1 ? "" : "s"}. Pelo menos uma categoria ativa é obrigatória.</p></div>
          <div class="rounded-xl border border-[#DDE1EA] bg-white p-3"><div class="flex items-center gap-2">{#if stepsWithContent === data.content.steps.length && data.content.steps.length > 0}<CheckCircle2 size={15} class="text-[#2F7045]"/>{:else}<CircleAlert size={15} class="text-[#A9510D]"/>{/if}<strong class="text-[10px] text-[#303645]">Passos públicos</strong></div><p class="mt-2 text-[9px] leading-4 text-[#818795]">{stepsWithContent}/{data.content.steps.length} com conteúdo público estruturado.</p></div>
          <div class="rounded-xl border border-[#DDE1EA] bg-white p-3"><div class="flex items-center gap-2">{#if imageOnlyStepsReady}<CheckCircle2 size={15} class="text-[#2F7045]"/>{:else}<CircleAlert size={15} class="text-[#A9510D]"/>{/if}<strong class="text-[10px] text-[#303645]">Imagens compreensíveis</strong></div><p class="mt-2 text-[9px] leading-4 text-[#818795]">{describedImageCount}/{imageBlocks.length} imagens possuem texto alternativo ou descrição adicional.</p></div>
          <div class="rounded-xl border border-[#DDE1EA] bg-white p-3"><div class="flex items-center gap-2">{#if videoReady}<CheckCircle2 size={15} class="text-[#2F7045]"/>{:else}<CircleAlert size={15} class="text-[#A9510D]"/>{/if}<strong class="text-[10px] text-[#303645]">Vídeo e subtitles</strong></div><p class="mt-2 text-[9px] leading-4 text-[#818795]">{data.content.featuredVideo ? (videoReady ? "Vídeo com fonte textual disponível." : "Vídeo sem subtitles.") : "Sem vídeo principal."}</p></div>
          <div class="rounded-xl border border-[#DDE1EA] bg-white p-3"><div class="flex items-center gap-2">{#if fileBlocks.length === 0 || indexedFileCount === fileBlocks.length}<CheckCircle2 size={15} class="text-[#2F7045]"/>{:else}<Info size={15} class="text-[#76510A]"/>{/if}<strong class="text-[10px] text-[#303645]">Arquivos indexáveis</strong></div><p class="mt-2 text-[9px] leading-4 text-[#818795]">{indexedFileCount}/{fileBlocks.length} possuem texto extraído ou resumo. Não bloqueia publicação.</p></div>
          <div class="rounded-xl border border-[#DDE1EA] bg-white p-3"><div class="flex items-center gap-2">{#if data.content.searchAliases.length > 0}<CheckCircle2 size={15} class="text-[#2F7045]"/>{:else}<Info size={15} class="text-[#76510A]"/>{/if}<strong class="text-[10px] text-[#303645]">Termos relacionados</strong></div><p class="mt-2 text-[9px] leading-4 text-[#818795]">{data.content.searchAliases.length} alias{data.content.searchAliases.length === 1 ? "" : "es"} para melhorar retrieval lexical. Opcional.</p></div>
        </div>

        {#if knowledgeTopics.length > 0}
          <div class="mt-5 border-t border-[#DDE1EA] pt-4">
            <strong class="text-[10px] font-semibold text-[#303645]">O motor conseguirá localizar este artigo por</strong>
            <div class="mt-2 flex flex-wrap gap-2">
              {#each knowledgeTopics as topic}
                <span class="rounded-full border border-[#D8DDF4] bg-white px-2.5 py-1 text-[9px] font-medium text-[#4F5870]">{topic}</span>
              {/each}
            </div>
          </div>
        {/if}

        <p class="mt-4 text-[9px] leading-5 text-[#858B99]">A publicação gera o snapshot consumido pelo mesmo Help Knowledge Core na Central, no chat e no assistente contextual do artigo. Nenhuma chamada de IA é feita para calcular esta cobertura.</p>
      </div>
    </div>
  </section>
</ApplicationContent>
